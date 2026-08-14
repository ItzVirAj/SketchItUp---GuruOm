import express from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import { generateTokens } from './src/utils/jwt';

import authRoutes from './src/modules/auth/auth.routes';
import auditRoutes from './src/modules/audit/audit.routes';
import notificationsRoutes from './src/modules/notifications/notifications.routes';

const app = express();
app.use(express.json());
app.use(cookieParser());
app.use(cors({ origin: true, credentials: true }));

app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/audit', auditRoutes);
app.use('/api/v1/notifications', notificationsRoutes);

const server = app.listen(3015, async () => {
  console.log('Test server running on port 3015 for User Governance verification');

  try {
    const adminToken = generateTokens({
      id: 'usr-admin',
      email: 'admin@guruom.in',
      role: 'SUPER ADMIN',
      name: 'System Admin'
    }).accessToken;

    const authHeaders = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${adminToken}`
    };

    console.log('\n--- 1. Testing GET /api/v1/auth/users ---');
    const resGetUsers = await fetch('http://localhost:3015/api/v1/auth/users', {
      method: 'GET',
      headers: authHeaders
    });
    const usersData = await resGetUsers.json();
    console.log('✓ GET /auth/users status:', resGetUsers.status, '| Count:', usersData.data.length);
    if (resGetUsers.status !== 200) throw new Error('GET users failed');

    console.log('\n--- 2. Testing User Provisioning (POST /api/v1/auth/users) ---');
    const testUserEmail = `qa.operator.${Date.now()}@guruom.in`;
    const resCreateUser = await fetch('http://localhost:3015/api/v1/auth/users', {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        name: 'Ramesh Patel',
        email: testUserEmail,
        role: 'OPERATOR',
        department: 'Shop Floor Milling',
        phone: '+91 98250 99887'
      })
    });
    const createdUserData = await resCreateUser.json();
    console.log('✓ POST /auth/users status:', resCreateUser.status, '| Created User ID:', createdUserData.user?.id);
    if (resCreateUser.status !== 201) throw new Error('User creation failed');
    const createdUserId = createdUserData.user.id;

    console.log('\n--- 3. Testing Edit Role (PATCH /api/v1/auth/users/:id/role) ---');
    const resUpdateRole = await fetch(`http://localhost:3015/api/v1/auth/users/${createdUserId}/role`, {
      method: 'PATCH',
      headers: authHeaders,
      body: JSON.stringify({ role: 'QC_MANAGER' })
    });
    console.log('✓ PATCH /auth/users/:id/role status:', resUpdateRole.status);
    if (resUpdateRole.status !== 200) throw new Error('Role update failed');

    console.log('\n--- 4. Testing Revoke User Access (PATCH /api/v1/auth/users/:id/status) ---');
    const resRevoke = await fetch(`http://localhost:3015/api/v1/auth/users/${createdUserId}/status`, {
      method: 'PATCH',
      headers: authHeaders,
      body: JSON.stringify({ status: 'REVOKED' })
    });
    console.log('✓ PATCH /auth/users/:id/status (REVOKED) status:', resRevoke.status);
    if (resRevoke.status !== 200) throw new Error('Revoke user failed');

    console.log('\n--- 5. Testing Restore User Access (PATCH /api/v1/auth/users/:id/status) ---');
    const resRestore = await fetch(`http://localhost:3015/api/v1/auth/users/${createdUserId}/status`, {
      method: 'PATCH',
      headers: authHeaders,
      body: JSON.stringify({ status: 'ACTIVE' })
    });
    console.log('✓ PATCH /auth/users/:id/status (ACTIVE) status:', resRestore.status);
    if (resRestore.status !== 200) throw new Error('Restore user failed');

    console.log('\n--- 6. Testing Delete User Permanently (DELETE /api/v1/auth/users/:id) ---');
    const resDelete = await fetch(`http://localhost:3015/api/v1/auth/users/${createdUserId}`, {
      method: 'DELETE',
      headers: authHeaders
    });
    console.log('✓ DELETE /auth/users/:id status:', resDelete.status);
    if (resDelete.status !== 200) throw new Error('Delete user failed');

    console.log('\n--- 7. Verifying Audit Logs Created for Actions ---');
    const resAudit = await fetch('http://localhost:3015/api/v1/audit', {
      method: 'GET',
      headers: authHeaders
    });
    const auditData = await resAudit.json();
    const userAuditEntries = auditData.data.filter((a: any) => a.entity === 'users');
    console.log('✓ Audit logs entries for user governance:', userAuditEntries.length);

    console.log('\n========================================================================');
    console.log('🎉 ALL USER GOVERNANCE ENDPOINTS (ADD, EDIT ROLE, REVOKE, RESTORE, DELETE) PASSED!');
    console.log('========================================================================\n');
  } catch (err: any) {
    console.error('❌ Test failed:', err);
  } finally {
    server.close();
  }
});
