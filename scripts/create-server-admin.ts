#!/usr/bin/env npx tsx
// ============================================================================
// Script: scripts/create-server-admin.ts
// Description: Standalone, one-off CLI provisioning script for the top-tier
//              ServerAdmin (Platform Maker / Developer Team) account.
//
// Security Constraints:
// 1. MUST NOT be wired into any Express router or HTTP controller.
// 2. Direct database connection via SUPABASE_SERVICE_ROLE_KEY.
// 3. Generates a 32-character high-entropy temporary password.
// 4. Sets is_temporary_password = true (forces immediate password reset on 1st login).
// 5. Automatically writes to public.admin_audit_log (append-only).
// ============================================================================

import readline from 'readline';
import crypto from 'crypto';
import { getDbClient } from '../backend/src/config/database';
import { hashPassword } from '../backend/src/utils/password';

function createInterface() {
  return readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
}

function prompt(query: string): Promise<string> {
  const rl = createInterface();
  return new Promise((resolve) => {
    rl.question(query, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

function generateSecureTempPassword(length = 24): string {
  // Generates a base64url high-entropy random password with guaranteed mixed charset
  const randomBytes = crypto.randomBytes(length);
  const base = randomBytes.toString('base64url');
  return `SrvAdm!${base.slice(0, length)}#9`;
}

async function main() {
  console.log('================================================================');
  console.log('       GuruOm OS — Top-Tier ServerAdmin CLI Provisioner         ');
  console.log('   (Platform Maker & Developer Team Master Account Setup)      ');
  console.log('================================================================\n');

  console.log('⚠️  SECURITY NOTICE:');
  console.log(' • The ServerAdmin role is supreme tier (Tier 0).');
  console.log(' • This role is strictly barred from all UI & API creation paths.');
  console.log(' • This account can only be provisioned via direct CLI execution.\n');

  const email = await prompt('Enter ServerAdmin Email Address (e.g. dev-ops@guruom.in): ');
  if (!email || !email.includes('@') || !email.includes('.')) {
    console.error('❌ Error: A valid email address is required.');
    process.exit(1);
  }

  const fullName = await prompt('Enter Developer / Maker Full Name (e.g. Lead Platform Engineer): ') || 'Platform Maker (ServerAdmin)';
  const phone = await prompt('Enter Contact Phone (optional): ') || null;
  const department = 'Platform Engineering / Core DevOps';

  // Generate strong one-time temporary password
  const tempPassword = generateSecureTempPassword(24);
  const passwordHash = await hashPassword(tempPassword);

  console.log('\n⏳ Connecting to Supabase Database...');
  const db = getDbClient();

  // 1. Verify roles table has ServerAdmin seeded
  const { data: roleRow, error: roleErr } = await db
    .from('roles')
    .select('id, name, tier')
    .eq('name', 'ServerAdmin')
    .single();

  if (roleErr || !roleRow) {
    console.error('❌ Error: ServerAdmin role is not registered in the database.');
    console.error('Please ensure migration 025_server_admin_and_granular_rbac.sql has been executed.');
    process.exit(1);
  }

  // 2. Check if user already exists
  const { data: existingUser } = await db
    .from('users')
    .select('id, email, role')
    .eq('email', email.toLowerCase())
    .maybeSingle();

  let targetUserId: string;
  let beforeState: any = null;

  if (existingUser) {
    console.log(`\n⚠️ User with email "${email}" already exists with role "${existingUser.role}".`);
    const confirm = await prompt('Do you want to elevate this existing account to ServerAdmin? (yes/no): ');
    if (confirm.toLowerCase() !== 'yes') {
      console.log('Aborted by user.');
      process.exit(0);
    }

    beforeState = { role: existingUser.role, status: 'ACTIVE' };
    targetUserId = existingUser.id;

    // Invalidate all existing sessions
    await db.from('sessions').delete().eq('user_id', targetUserId);

    const { error: updateErr } = await db
      .from('users')
      .update({
        role: 'ServerAdmin',
        password_hash: passwordHash,
        is_temporary_password: true,
        status: 'ACTIVE',
        failed_login_attempts: 0,
        lockout_until: null,
        updated_at: new Date().toISOString()
      })
      .eq('id', targetUserId);

    if (updateErr) {
      console.error('❌ Failed to elevate user to ServerAdmin:', updateErr.message);
      process.exit(1);
    }
  } else {
    // 3. Insert new ServerAdmin User
    const newUserId = crypto.randomUUID();
    targetUserId = newUserId;

    const { error: insertErr } = await db
      .from('users')
      .insert({
        id: newUserId,
        email: email.toLowerCase(),
        full_name: fullName,
        password_hash: passwordHash,
        role: 'ServerAdmin',
        department: department,
        phone: phone,
        status: 'ACTIVE',
        is_temporary_password: true,
        failed_login_attempts: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });

    if (insertErr) {
      console.error('❌ Failed to insert ServerAdmin record:', insertErr.message);
      process.exit(1);
    }
  }

  // 4. Record entry in immutable admin_audit_log
  try {
    await db.from('admin_audit_log').insert({
      actor_id: targetUserId,
      actor_email: 'CLI_DIRECT_DATABASE',
      actor_role: 'ServerAdmin (CLI Bootstrap)',
      action: 'SERVER_ADMIN_SEEDED_CLI',
      target_user_id: targetUserId,
      target_user_email: email.toLowerCase(),
      before_state: beforeState,
      after_state: {
        role: 'ServerAdmin',
        is_temporary_password: true,
        status: 'ACTIVE'
      },
      ip: '127.0.0.1 (CLI)',
      user_agent: 'Node.js/CLI Provisioner Script',
      created_at: new Date().toISOString()
    });
  } catch (auditErr: any) {
    console.warn('⚠️ Warning: Admin audit log trigger failed:', auditErr.message);
  }

  console.log('\n================================================================');
  console.log('   🎉 SUCCESS! ServerAdmin Account Provisioned Successfully     ');
  console.log('================================================================\n');
  console.log(` • User ID:           ${targetUserId}`);
  console.log(` • Full Name:         ${fullName}`);
  console.log(` • Email / Login:     ${email.toLowerCase()}`);
  console.log(` • Role:              ServerAdmin (Tier 0 — Maker Access)`);
  console.log(` • One-Time Password: ${tempPassword}`);
  console.log(` • Password Status:   TEMPORARY (Must change on first login)`);
  console.log('\n⚠️ IMPORTANT: Securely share this temporary password with the platform engineer.');
  console.log('It will NEVER be printed or displayed again.\n');
}

main().catch((err) => {
  console.error('❌ Unhandled Exception in ServerAdmin provisioner:', err);
  process.exit(1);
});
