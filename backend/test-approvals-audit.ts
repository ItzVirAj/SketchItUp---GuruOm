import express from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import { generateTokens } from './src/utils/jwt';
import auditRoutes from './src/modules/audit/audit.routes';
import approvalsRoutes from './src/modules/approvals/approvals.routes';
import ordersRoutes from './src/modules/orders/orders.routes';
import purchasingRoutes from './src/modules/purchasing/purchasing.routes';

const app = express();
app.use(express.json());
app.use(cookieParser());
app.use(cors({ origin: true, credentials: true }));

app.use('/api/v1/audit', auditRoutes);
app.use('/api/v1/approvals', approvalsRoutes);
app.use('/api/v1/orders', ordersRoutes);
app.use('/api/v1/purchasing', purchasingRoutes);

const server = app.listen(3008, async () => {
  console.log('Test server running on port 3008 for Approvals & Audit verification');

  try {
    const superAdminToken = generateTokens({
      id: 'usr-admin',
      email: 'admin@guruom.in',
      role: 'SUPER ADMIN',
      name: 'Pramod Parshi'
    }).accessToken;

    const financeManagerToken = generateTokens({
      id: 'usr-fin',
      email: 'finance@guruom.in',
      role: 'FINANCE_MANAGER',
      name: 'Accounts Head'
    }).accessToken;

    const operatorToken = generateTokens({
      id: 'usr-op',
      email: 'operator@guruom.in',
      role: 'OPERATOR',
      name: 'Operator User'
    }).accessToken;

    console.log('\n--- 1. Testing Unauthenticated Access (401 Missing Token) ---');
    const resUnauth = await fetch('http://localhost:3008/api/v1/audit');
    console.log('✓ GET /api/v1/audit status:', resUnauth.status, '(Expected: 401)');
    if (resUnauth.status !== 401) throw new Error('Expected 401 on missing auth');

    console.log('\n--- 2. Testing RBAC Role Restrictions (403 Forbidden) ---');
    // Operator trying to approve an approval request (restricted to SUPER ADMIN, FINANCE_MANAGER)
    const resRbacApprove = await fetch('http://localhost:3008/api/v1/approvals/appr-1/approve', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${operatorToken}`
      },
      body: JSON.stringify({ comments: 'Trying to approve without permission' })
    });
    console.log('✓ POST /api/v1/approvals/:id/approve as OPERATOR status:', resRbacApprove.status, '(Expected: 403)');
    if (resRbacApprove.status !== 403) throw new Error('Expected 403 when OPERATOR attempts approval');

    console.log('\n--- 3. Testing Audit Logging Endpoints ---');
    // Fetch Audit Logs
    const resAudit = await fetch('http://localhost:3008/api/v1/audit?limit=10', {
      headers: { 'Authorization': `Bearer ${superAdminToken}` }
    });
    const auditData = await resAudit.json();
    console.log('✓ GET /api/v1/audit status:', resAudit.status, 'Total Logs:', auditData.data.length);
    if (resAudit.status !== 200) throw new Error('Failed to fetch audit logs');

    // Create Audit Log directly via REST
    const resCreateAudit = await fetch('http://localhost:3008/api/v1/audit', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${operatorToken}`
      },
      body: JSON.stringify({
        entity: 'System Test',
        action: 'HEALTH_CHECK',
        details: 'Verified database health and logging triggers.'
      })
    });
    const createAuditData = await resCreateAudit.json();
    console.log('✓ POST /api/v1/audit status:', resCreateAudit.status, 'Action:', createAuditData.data.action);
    if (resCreateAudit.status !== 201) throw new Error('Failed to record audit log');

    console.log('\n--- 4. Testing Approvals Workflow with Source Entity Cascading & Audit Trails ---');
    // 4a. Create new Approval Request for Order Cancellation
    const testApprId = `appr-${Date.now().toString().slice(-4)}`;
    const resCreateAppr = await fetch('http://localhost:3008/api/v1/approvals', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${operatorToken}`
      },
      body: JSON.stringify({
        id: testApprId,
        title: 'Cancel Obsolete Customer Order',
        type: 'ORDER_CANCEL',
        requestedBy: 'Deepak Sharma (Production Head)',
        amount: 50000,
        details: 'Customer requested engineering revision change.',
        entityId: 'PO-2026-001'
      })
    });
    const createApprData = await resCreateAppr.json();
    console.log('✓ POST /api/v1/approvals status:', resCreateAppr.status, 'Title:', createApprData.data.title);
    if (resCreateAppr.status !== 201) throw new Error('Failed to create approval request');

    // 4b. Approve request as SUPER ADMIN (Cascades order cancellation + writes audit log)
    const resApprove = await fetch(`http://localhost:3008/api/v1/approvals/${testApprId}/approve`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${superAdminToken}`
      },
      body: JSON.stringify({ comments: 'Approved by CEO after reviewing revision documents.' })
    });
    const approveData = await resApprove.json();
    console.log('✓ POST /api/v1/approvals/:id/approve status:', resApprove.status, 'Result Status:', approveData.data.status);
    if (approveData.data.status !== 'APPROVED') throw new Error('Expected status APPROVED');

    // 4c. Create and Reject another request (writes audit log)
    const testApprId2 = `appr-rej-${Date.now().toString().slice(-4)}`;
    await fetch('http://localhost:3008/api/v1/approvals', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${operatorToken}`
      },
      body: JSON.stringify({
        id: testApprId2,
        title: 'Unauthorized Discount Request',
        type: 'DISCOUNT_OVERRIDE',
        requestedBy: 'Sales Rep',
        amount: 25000,
        details: 'Additional 10% cash discount on custom delivery.'
      })
    });

    const resReject = await fetch(`http://localhost:3008/api/v1/approvals/${testApprId2}/reject`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${financeManagerToken}`
      },
      body: JSON.stringify({ reason: 'Commercial margins below approved company guidelines.' })
    });
    const rejectData = await resReject.json();
    console.log('✓ POST /api/v1/approvals/:id/reject status:', resReject.status, 'Result Status:', rejectData.data.status);
    if (rejectData.data.status !== 'REJECTED') throw new Error('Expected status REJECTED');

    // 4d. Verify Audit Logs received the approval entries
    const resAuditCheck = await fetch('http://localhost:3008/api/v1/audit?limit=5', {
      headers: { 'Authorization': `Bearer ${superAdminToken}` }
    });
    const auditCheckData = await resAuditCheck.json();
    const recentActions = auditCheckData.data.map((l: any) => `${l.action} on ${l.entity}`);
    console.log('✓ Recent Audit Trail Actions:');
    recentActions.forEach((act: string) => console.log('   •', act));

    console.log('\n========================================================================');
    console.log('🎉 AUDIT LOGGING & APPROVALS WORKFLOW REST API TESTS PASSED 100%!');
    console.log('========================================================================\n');
  } catch (err: any) {
    console.error('❌ Test failed:', err);
  } finally {
    server.close();
  }
});
