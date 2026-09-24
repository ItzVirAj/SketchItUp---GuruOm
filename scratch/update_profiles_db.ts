import 'dotenv/config';
import { getDbClient } from '../backend/src/config/database';
import { auditService } from '../backend/src/modules/audit/audit.service';

async function main() {
  const db = getDbClient();

  console.log('Fetching current profiles...');
  const { data: profiles, error: pErr } = await db.from('profiles').select('*');
  console.log('Current profiles:', profiles);

  // 1. Update Founder & CEO profile
  // Check for record with email 'user@guruom.in' or 'owner@guruom.in'
  const userRecord = profiles?.find((p: any) => p.email === 'user@guruom.in');
  const existingOwnerRecord = profiles?.find((p: any) => p.email === 'owner@guruom.in');

  if (userRecord && existingOwnerRecord) {
    // If existingOwnerRecord was a placeholder with 'owner@guruom.in', repurpose it for Pramod Parshi
    console.log('Repurposing existingOwnerRecord for Pramod Parshi...');
    const { error: err1 } = await db.from('profiles').update({
      full_name: 'Pramod Parshi',
      email: 'pramod@guruom.in',
      role: 'SUPER ADMIN',
      department: 'Plant Operations Admin',
      updated_at: new Date().toISOString()
    }).eq('id', existingOwnerRecord.id);
    console.log('Update existingOwnerRecord result:', err1);

    // Now update userRecord (was user@guruom.in) to owner@guruom.in / Sachin Gharbude
    console.log('Updating userRecord to Sachin Gharbude / owner@guruom.in...');
    const { error: err2 } = await db.from('profiles').update({
      full_name: 'Sachin Gharbude',
      email: 'owner@guruom.in',
      role: 'SUPER ADMIN',
      department: 'Executive Management',
      updated_at: new Date().toISOString()
    }).eq('id', userRecord.id);
    console.log('Update userRecord result:', err2);
  } else if (userRecord) {
    console.log('Updating userRecord to Sachin Gharbude / owner@guruom.in...');
    const { error: err } = await db.from('profiles').update({
      full_name: 'Sachin Gharbude',
      email: 'owner@guruom.in',
      role: 'SUPER ADMIN',
      department: 'Executive Management',
      updated_at: new Date().toISOString()
    }).eq('id', userRecord.id);
    console.log('Update userRecord result:', err);

    // Create Pramod Parshi profile
    console.log('Inserting Pramod Parshi profile...');
    const { error: insErr } = await db.from('profiles').insert({
      full_name: 'Pramod Parshi',
      email: 'pramod@guruom.in',
      role: 'SUPER ADMIN',
      department: 'Plant Operations Admin',
      status: 'ACTIVE'
    });
    console.log('Insert Pramod profile result:', insErr);
  }

  // Also check if 'users' table exists and update if so
  try {
    const { data: users } = await db.from('users').select('*');
    if (users && users.length > 0) {
      await db.from('users').update({ full_name: 'Sachin Gharbude', email: 'owner@guruom.in' }).eq('email', 'user@guruom.in');
      await db.from('users').upsert({ full_name: 'Pramod Parshi', email: 'pramod@guruom.in', role: 'SUPER ADMIN', department: 'Plant Operations Admin', status: 'ACTIVE' });
    }
  } catch (_) {}

  // Record audit logs
  await auditService.recordAuditLog({
    actorEmail: 'owner@guruom.in',
    actorRole: 'Owner',
    action: 'USER_MASTER_UPDATE',
    entityType: 'users',
    entityId: userRecord?.id || 'usr-1',
    details: 'Founder & CEO identity updated: [Name: Pramod Parshi (Founder & CEO) → Sachin Gharbude, Email: user@guruom.in → owner@guruom.in, Role: SUPER ADMIN]'
  });

  await auditService.recordAuditLog({
    actorEmail: 'owner@guruom.in',
    actorRole: 'Owner',
    action: 'USER_MASTER_PROVISION',
    entityType: 'users',
    entityId: existingOwnerRecord?.id || 'usr-8',
    details: 'Plant Operations Admin provisioned: [Name: Pramod Parshi, Email: pramod@guruom.in, Role: Plant Operations Admin / SUPER ADMIN, Reporting Manager: Sachin Gharbude]'
  });

  console.log('Profiles update completed. Fetching updated profiles...');
  const { data: updatedProfiles } = await db.from('profiles').select('*');
  console.table(updatedProfiles);
}

main().catch(console.error);
