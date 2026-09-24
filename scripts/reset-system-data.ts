#!/usr/bin/env npx tsx
// ============================================================================
// Script: scripts/reset-system-data.ts
// Description: Complete operational data reset for GuruOmOS.
//              Wipes all transactional, production, inventory, order, master,
//              and user data — returning the database to a clean demo/test state.
//
// PRESERVED:
//   • company_profile   — All rows
//   • users             — owner@guruom.in  (Owner)
//   • users             — serveradmin@guruom.in  (ServerAdmin)
//   • roles / permissions / role_permission_grants — System seed data
//   • master_code_counters / job_number_counters   — Sequence state
//   • admin_audit_log   — Append-only; a RESET event is appended
//
// DELETED (in safe dependency order):
//   Transactional leaf tables → parent tables → master tables → user accounts
//
// USAGE:
//   npx tsx scripts/reset-system-data.ts
//
// SECURITY:
//   • Requires interactive double-confirmation before executing.
//   • Will NOT run if the confirmation phrase is wrong.
//   • After reset, both preserved accounts are restored to Pass@123.
// ============================================================================

import readline from 'readline';
import crypto from 'crypto';
import { getDbClient } from '../backend/src/config/database';
import { hashPassword } from '../backend/src/utils/password';

// ─── Constants ───────────────────────────────────────────────────────────────

const PRESERVED_EMAILS = ['owner@guruom.in', 'serveradmin@guruom.in'];
const RESET_PASSWORD = 'Pass@123';
const CONFIRMATION_PHRASE = 'RESET SYSTEM DATA';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeRl(): readline.Interface {
  return readline.createInterface({ input: process.stdin, output: process.stdout });
}

function prompt(question: string): Promise<string> {
  const iface = makeRl();
  return new Promise((resolve) => {
    iface.question(question, (answer) => {
      iface.close();
      resolve(answer.trim());
    });
  });
}

function logOk(msg: string)   { console.log(`\x1b[32m${msg}\x1b[0m`); }
function logWarn(msg: string) { console.warn(`\x1b[33m${msg}\x1b[0m`); }
function logErr(msg: string)  { console.error(`\x1b[31m${msg}\x1b[0m`); }

async function clearTable(
  db: any,
  table: string,
  label?: string
): Promise<void> {
  const name = label ?? table;
  // neq against a nil UUID forces a full-table scan while still being a
  // valid PostgREST filter (avoids the "no filter provided" restriction).
  const { error } = await db
    .from(table)
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000');

  if (error) {
    logWarn(`  ⚠️  ${name}: ${error.message} (skipped)`);
  } else {
    logOk(`  ✓  ${name}`);
  }
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log('');
  console.log('╔══════════════════════════════════════════════════════════════════╗');
  console.log('║           GuruOmOS — SYSTEM DATA RESET UTILITY                  ║');
  console.log('╠══════════════════════════════════════════════════════════════════╣');
  console.log('║  Permanently deletes ALL operational/transactional data.        ║');
  console.log('║                                                                 ║');
  console.log('║  PRESERVED:                                                     ║');
  console.log('║    ✅ company_profile                                           ║');
  console.log('║    ✅ owner@guruom.in         (restored → Pass@123)            ║');
  console.log('║    ✅ serveradmin@guruom.in   (restored → Pass@123)            ║');
  console.log('║                                                                 ║');
  console.log('║  DELETED:                                                       ║');
  console.log('║    ❌ Orders, Job Cards, BOMs, Route Cards                      ║');
  console.log('║    ❌ Inventory / Stock / Movements / Reservations              ║');
  console.log('║    ❌ Masters (Items, Customers, Vendors, Machines)             ║');
  console.log('║    ❌ QC / PDI / Invoices / Challans / GRNs                    ║');
  console.log('║    ❌ All other users and sessions                              ║');
  console.log('╚══════════════════════════════════════════════════════════════════╝');
  console.log('');

  logWarn('⚠️  THIS ACTION IS IRREVERSIBLE. THERE IS NO UNDO.');
  console.log('');

  const answer1 = await prompt(
    `Type exactly "${CONFIRMATION_PHRASE}" to confirm (case-sensitive): `
  );
  if (answer1 !== CONFIRMATION_PHRASE) {
    logErr('❌ Confirmation phrase mismatch. Aborted.');
    process.exit(0);
  }

  const answer2 = await prompt(
    '🔴 FINAL WARNING: All data will be permanently erased. Type YES to proceed: '
  );
  if (answer2.toUpperCase() !== 'YES') {
    logErr('❌ Aborted by user.');
    process.exit(0);
  }

  console.log('');
  console.log('⏳ Connecting to database...');
  const db = getDbClient();

  // Verify connectivity
  const { error: pingErr } = await db.from('company_profile').select('id').limit(1);
  if (pingErr) {
    logErr(`❌ Database connection failed: ${pingErr.message}`);
    process.exit(1);
  }
  logOk('✓ Connected.');
  console.log('');

  // ─── Phase 1: Transactional leaf tables ────────────────────────────────────
  console.log('── Phase 1: Transactional leaf tables ─────────────────────────────');
  await clearTable(db, 'production_logs');
  await clearTable(db, 'job_card_operations');
  await clearTable(db, 'outwork_sendouts');
  await clearTable(db, 'shortage_items');
  await clearTable(db, 'qc_inspections');
  await clearTable(db, 'pdi_inspections');
  await clearTable(db, 'ncrs');
  await clearTable(db, 'vendor_returns');
  await clearTable(db, 'vendor_scorecards');
  await clearTable(db, 'vendor_bill_three_way_matches');
  console.log('');

  // ─── Phase 2: Invoicing / billing / challans ───────────────────────────────
  console.log('── Phase 2: Invoicing, billing, challans ───────────────────────────');
  await clearTable(db, 'customer_invoice_items');
  await clearTable(db, 'customer_invoices');
  await clearTable(db, 'vendor_bills');
  await clearTable(db, 'dispatch_challans');
  console.log('');

  // ─── Phase 3: Inventory movements and reservations ─────────────────────────
  console.log('── Phase 3: Inventory movements and reservations ───────────────────');
  await clearTable(db, 'inventory_movements');
  await clearTable(db, 'order_material_reservations');
  await clearTable(db, 'stock_items');
  console.log('');

  // ─── Phase 4: Job cards ────────────────────────────────────────────────────
  console.log('── Phase 4: Job cards ──────────────────────────────────────────────');
  await clearTable(db, 'job_cards');
  console.log('');

  // ─── Phase 5: Orders ───────────────────────────────────────────────────────
  console.log('── Phase 5: Orders ─────────────────────────────────────────────────');
  await clearTable(db, 'order_line_items');
  await clearTable(db, 'customer_orders');
  await clearTable(db, 'pending_approvals');
  await clearTable(db, 'purchase_requisitions');
  await clearTable(db, 'subcontract_orders');
  console.log('');

  // ─── Phase 6: Purchasing and GRNs ──────────────────────────────────────────
  console.log('── Phase 6: Purchase orders and GRNs ───────────────────────────────');
  await clearTable(db, 'grn_items');
  await clearTable(db, 'goods_receipt_notes');
  await clearTable(db, 'purchase_order_items');
  await clearTable(db, 'purchase_orders');
  console.log('');

  // ─── Phase 7: BOMs and route card templates ────────────────────────────────
  // BOM deletion is guarded by trigger — orders/job cards must already be gone.
  console.log('── Phase 7: BOMs and route card templates ──────────────────────────');
  await clearTable(db, 'bom_items');
  await clearTable(db, 'bill_of_materials');
  await clearTable(db, 'route_card_templates');
  console.log('');

  // ─── Phase 8: Master data ──────────────────────────────────────────────────
  console.log('── Phase 8: Master data ────────────────────────────────────────────');
  await clearTable(db, 'finished_goods');
  await clearTable(db, 'masters', 'masters (items/components)');
  await clearTable(db, 'customer_masters');
  await clearTable(db, 'vendor_masters');
  await clearTable(db, 'machine_masters');
  await clearTable(db, 'employee_certifications');
  console.log('');

  // ─── Phase 9: Notifications and attachments ────────────────────────────────
  console.log('── Phase 9: Notifications and attachments ──────────────────────────');
  await clearTable(db, 'notification_recipients');
  await clearTable(db, 'notification_logs');
  await clearTable(db, 'notifications');
  await clearTable(db, 'attachments');
  console.log('');

  // ─── Phase 10: Sessions and security events ────────────────────────────────
  console.log('── Phase 10: Sessions and security events ──────────────────────────');
  await clearTable(db, 'sessions');
  await clearTable(db, 'security_events');
  console.log('');

  // ─── Phase 11: Users (preserve admin accounts) ─────────────────────────────
  console.log('── Phase 11: Users (preserving admin accounts) ─────────────────────');

  // Remove all user_permission_overrides (FK to users)
  await clearTable(db, 'user_permission_overrides');

  // Delete all non-preserved users
  const { error: usersErr } = await db
    .from('users')
    .delete()
    .not('email', 'in', `(${PRESERVED_EMAILS.map((e) => `"${e}"`).join(',')})`);

  if (usersErr) {
    logWarn(`  ⚠️  users (non-admin): ${usersErr.message}`);
  } else {
    logOk('  ✓  users (non-admin deleted)');
  }

  // Attempt to delete non-preserved profiles via subquery (best-effort)
  const { error: profilesErr } = await db
    .from('profiles')
    .delete()
    .not('id', 'in', `(select id from users where email = any(array[${PRESERVED_EMAILS.map((e) => `'${e}'`).join(',')}]))`);

  if (profilesErr) {
    logWarn(`  ⚠️  profiles: ${profilesErr.message} (skipped)`);
  } else {
    logOk('  ✓  profiles (non-admin deleted)');
  }
  console.log('');

  // ─── Phase 12: Restore preserved accounts ──────────────────────────────────
  console.log('── Phase 12: Restore preserved admin accounts ──────────────────────');
  const passwordHash = await hashPassword(RESET_PASSWORD);
  const now = new Date().toISOString();

  const adminAccounts = [
    { email: 'owner@guruom.in',       fullName: 'Company Owner',               role: 'Owner' },
    { email: 'serveradmin@guruom.in', fullName: 'Platform Maker (Server Admin)', role: 'ServerAdmin' },
  ];

  for (const account of adminAccounts) {
    const { data: existing } = await db
      .from('users')
      .select('id')
      .eq('email', account.email)
      .maybeSingle();

    if (existing) {
      const { error: upErr } = await db
        .from('users')
        .update({
          password_hash: passwordHash,
          status: 'ACTIVE',
          failed_login_attempts: 0,
          lockout_until: null,
          is_temporary_password: false,
          updated_at: now,
        })
        .eq('email', account.email);

      if (upErr) {
        logErr(`  ❌ Failed to reset ${account.email}: ${upErr.message}`);
      } else {
        logOk(`  ✓  ${account.email} — password reset to Pass@123 (ACTIVE)`);
      }
    } else {
      // Account was deleted — recreate it
      const { error: insErr } = await db.from('users').insert({
        id: crypto.randomUUID(),
        email: account.email,
        full_name: account.fullName,
        password_hash: passwordHash,
        role: account.role,
        status: 'ACTIVE',
        is_temporary_password: false,
        failed_login_attempts: 0,
        created_at: now,
        updated_at: now,
      });

      if (insErr) {
        logErr(`  ❌ Failed to recreate ${account.email}: ${insErr.message}`);
      } else {
        logOk(`  ✓  ${account.email} — recreated with Pass@123 (ACTIVE)`);
      }
    }
  }
  console.log('');

  // ─── Audit log entry ───────────────────────────────────────────────────────
  try {
    const { data: sa } = await db
      .from('users')
      .select('id')
      .eq('email', 'serveradmin@guruom.in')
      .maybeSingle();

    await db.from('admin_audit_log').insert({
      actor_id: sa?.id ?? crypto.randomUUID(),
      actor_email: 'CLI_RESET_SCRIPT',
      actor_role: 'ServerAdmin (CLI)',
      action: 'SYSTEM_DATA_RESET',
      target_user_id: null,
      target_user_email: null,
      before_state: null,
      after_state: { result: 'All operational data wiped. Admin accounts restored.' },
      ip: '127.0.0.1 (CLI)',
      user_agent: 'Node.js/reset-system-data.ts',
      created_at: now,
    });
  } catch (_: any) {
    logWarn('⚠️  Audit log entry skipped (non-critical).');
  }

  // ─── Summary ───────────────────────────────────────────────────────────────
  console.log('');
  console.log('╔══════════════════════════════════════════════════════════════════╗');
  console.log('║              ✅ SYSTEM DATA RESET COMPLETE                      ║');
  console.log('╠══════════════════════════════════════════════════════════════════╣');
  console.log('║  Preserved:                                                     ║');
  console.log('║    • company_profile                                            ║');
  console.log('║    • owner@guruom.in          →  Pass@123  (ACTIVE)            ║');
  console.log('║    • serveradmin@guruom.in    →  Pass@123  (ACTIVE)            ║');
  console.log('║                                                                 ║');
  console.log('║  The database is now in a clean state for fresh testing/demo.  ║');
  console.log('╚══════════════════════════════════════════════════════════════════╝');
  console.log('');
}

main().catch((error: any) => {
  console.error(`\x1b[31m\n❌ Unhandled error in reset script: ${error?.message ?? error}\x1b[0m`);
  process.exit(1);
});
