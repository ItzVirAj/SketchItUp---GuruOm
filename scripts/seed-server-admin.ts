// ============================================================================
// Script: scripts/seed-server-admin.ts
// Description: Provision ServerAdmin account serveradmin@guruom.in directly into database.
// ============================================================================

import crypto from 'crypto';
import { getDbClient } from '../backend/src/config/database';
import { hashPassword } from '../backend/src/utils/password';

async function seed() {
  const email = 'serveradmin@guruom.in';
  const rawPassword = 'Pass@123';
  const fullName = 'Platform Maker (Server Admin)';
  const role = 'ServerAdmin';
  const department = 'Platform Engineering / Core DevOps';

  console.log(`\n⏳ Hashing password and connecting to database for ${email}...`);
  const passwordHash = await hashPassword(rawPassword);
  const db = getDbClient();

  // 1. Check if user exists
  const { data: existingUser } = await db
    .from('users')
    .select('id, email, role')
    .eq('email', email.toLowerCase())
    .maybeSingle();

  let targetUserId = existingUser?.id;

  if (existingUser) {
    console.log(`Found existing user ${existingUser.id} (${existingUser.role}). Updating to ServerAdmin...`);
    // Invalidate sessions
    await db.from('sessions').delete().eq('user_id', existingUser.id);

    const { error: updateErr } = await db
      .from('users')
      .update({
        role: 'ServerAdmin',
        password_hash: passwordHash,
        full_name: fullName,
        status: 'ACTIVE',
        failed_login_attempts: 0,
        lockout_until: null,
        updated_at: new Date().toISOString()
      })
      .eq('id', existingUser.id);

    if (updateErr) {
      console.error('❌ Update failed:', updateErr.message);
      process.exit(1);
    }
  } else {
    targetUserId = crypto.randomUUID();
    console.log(`Creating new ServerAdmin user with ID: ${targetUserId}...`);

    const { error: insertErr } = await db
      .from('users')
      .insert({
        id: targetUserId,
        email: email.toLowerCase(),
        full_name: fullName,
        password_hash: passwordHash,
        role: 'ServerAdmin',
        department: department,
        status: 'ACTIVE',
        is_temporary_password: false,
        failed_login_attempts: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });

    if (insertErr) {
      console.error('❌ Insert failed:', insertErr.message);
      process.exit(1);
    }
  }

  // 2. Record in admin_audit_log
  try {
    await db.from('admin_audit_log').insert({
      actor_id: targetUserId,
      actor_email: 'CLI_SEED',
      actor_role: 'ServerAdmin (CLI)',
      action: 'SERVER_ADMIN_SEEDED_CLI',
      target_user_id: targetUserId,
      target_user_email: email,
      before_state: existingUser ? { role: existingUser.role } : null,
      after_state: { role: 'ServerAdmin', status: 'ACTIVE' },
      ip: '127.0.0.1 (CLI)',
      user_agent: 'Node/CLI Seed Script',
      created_at: new Date().toISOString()
    });
  } catch (auditErr: any) {
    console.warn('⚠️ Warning on audit log write:', auditErr.message);
  }

  console.log('\n================================================================');
  console.log('   🎉 ServerAdmin Account Successfully Provisioned!             ');
  console.log('================================================================');
  console.log(` • Email:    ${email}`);
  console.log(` • Role:     ServerAdmin (Tier 0 — Maker Access)`);
  console.log(` • Password: ${rawPassword}`);
  console.log(` • Status:   ACTIVE`);
  console.log('================================================================\n');
}

seed().catch((err) => {
  console.error('❌ Error executing seed script:', err);
  process.exit(1);
});
