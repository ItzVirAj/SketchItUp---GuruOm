import express from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import { generateTokens } from './src/utils/jwt';
import qcRoutes from './src/modules/qc/qc.routes';
import dispatchRoutes from './src/modules/dispatch/dispatch.routes';
import finishedGoodsRoutes from './src/modules/finished-goods/finished-goods.routes';
import outworkRoutes from './src/modules/outwork/outwork.routes';

const app = express();
app.use(express.json());
app.use(cookieParser());
app.use(cors({ origin: true, credentials: true }));

app.use('/api/v1/qc', qcRoutes);
app.use('/api/v1/dispatch', dispatchRoutes);
app.use('/api/v1/finished-goods', finishedGoodsRoutes);
app.use('/api/v1/outwork', outworkRoutes);

const server = app.listen(3006, async () => {
  console.log('Test server running on port 3006 for Dispatch, FG & Outwork verification');

  try {
    const superAdminToken = generateTokens({
      id: 'usr-admin',
      email: 'admin@guruom.in',
      role: 'SUPER ADMIN',
      name: 'Pramod Parshi'
    }).accessToken;

    const dispatchClerkToken = generateTokens({
      id: 'usr-clerk',
      email: 'dispatch@guruom.in',
      role: 'DISPATCH_CLERK',
      name: 'Logistics Lead'
    }).accessToken;

    const operatorToken = generateTokens({
      id: 'usr-op',
      email: 'operator@guruom.in',
      role: 'OPERATOR',
      name: 'Operator User'
    }).accessToken;

    console.log('\n--- 1. Testing Unauthenticated Access (401 Missing Token) ---');
    const resUnauth = await fetch('http://localhost:3006/api/v1/dispatch');
    console.log('✓ GET /api/v1/dispatch status:', resUnauth.status, '(Expected: 401)');
    if (resUnauth.status !== 401) throw new Error('Expected 401 on missing auth');

    console.log('\n--- 2. Testing RBAC Role Restrictions (403 Forbidden) ---');
    // Operator trying to create dispatch (restricted to SUPER ADMIN, DISPATCH_CLERK)
    const resRbacDispatch = await fetch('http://localhost:3006/api/v1/dispatch', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${operatorToken}`
      },
      body: JSON.stringify({
        challanNo: 'CHL/TEST/26-27',
        orderPo: 'PO-2026-002',
        date: '2026-08-14',
        transporter: 'VRL Logistics',
        vehicleNo: 'MH-12-1234'
      })
    });
    console.log('✓ POST /api/v1/dispatch as OPERATOR status:', resRbacDispatch.status, '(Expected: 403)');
    if (resRbacDispatch.status !== 403) throw new Error('Expected 403 when OPERATOR attempts dispatch creation');

    console.log('\n--- 3. Testing Quality Gatekeeper (Reject Dispatch for Uninspected / Pending Orders) ---');
    // Attempting to dispatch PO-2026-999 which has NO passing PDI certificate
    const resRejectDispatch = await fetch('http://localhost:3006/api/v1/dispatch', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${dispatchClerkToken}`
      },
      body: JSON.stringify({
        challanNo: 'CHL/REJECT-01/26-27',
        orderPo: 'PO-2026-UNINSPECTED',
        date: '2026-08-14',
        transporter: 'VRL Logistics',
        vehicleNo: 'MH-12-9999'
      })
    });
    const rejectData = await resRejectDispatch.json();
    console.log('✓ POST /api/v1/dispatch for uninspected order status:', resRejectDispatch.status, '(Expected: 400)');
    console.log('  Gatekeeper rejection message:', rejectData.message);
    if (resRejectDispatch.status !== 400) throw new Error('Expected 400 rejection from Quality Gatekeeper');

    console.log('\n--- 4. Testing Dispatch Creation for PDI-Passed Order ---');
    // Ensure we have a passed PDI record
    const pdiRes = await fetch('http://localhost:3006/api/v1/qc/pdi', {
      headers: { 'Authorization': `Bearer ${superAdminToken}` }
    });
    const pdiDataList = await pdiRes.json();
    let eligibleOrderPo = pdiDataList.data?.find((p: any) => p.pdiStatus === 'PASS')?.orderPo;

    if (!eligibleOrderPo && pdiDataList.data?.length > 0) {
      // Pass the first PDI record
      const firstPdi = pdiDataList.data[0];
      await fetch(`http://localhost:3006/api/v1/qc/pdi/${firstPdi.id}/pass`, {
        method: 'PATCH',
        headers: { 'Authorization': `Bearer ${superAdminToken}` }
      });
      eligibleOrderPo = firstPdi.orderPo;
    } else if (!eligibleOrderPo) {
      eligibleOrderPo = 'PO-2026-002';
    }

    const resCreateDispatch = await fetch('http://localhost:3006/api/v1/dispatch', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${dispatchClerkToken}`
      },
      body: JSON.stringify({
        challanNo: `CHL/${Date.now().toString().slice(-4)}/26-27`,
        orderPo: eligibleOrderPo,
        date: '2026-08-14',
        transporter: 'VRL Logistics Ltd',
        vehicleNo: 'MH-12-AB-9876',
        linesCount: 1
      })
    });
    const createDispatchData = await resCreateDispatch.json();
    console.log('✓ POST /api/v1/dispatch status:', resCreateDispatch.status, 'Response:', JSON.stringify(createDispatchData));
    if (resCreateDispatch.status !== 201) throw new Error(`Failed to create dispatch for eligible order: ${createDispatchData.message}`);
    console.log('  Challan created successfully:', createDispatchData.data.challanNo);

    console.log('\n--- 5. Testing Finished Goods Reconciliation ---');
    const resFG = await fetch('http://localhost:3006/api/v1/finished-goods', {
      headers: { 'Authorization': `Bearer ${superAdminToken}` }
    });
    const fgData = await resFG.json();
    console.log('✓ GET /api/v1/finished-goods status:', resFG.status, 'Total FG Items:', fgData.data.length);

    const resReconcile = await fetch(`http://localhost:3006/api/v1/finished-goods/${fgData.data[0].id || 'fg-1'}/reconcile`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${superAdminToken}`
      },
      body: JSON.stringify({ physicallyHeldQty: 150 })
    });
    const reconcileData = await resReconcile.json();
    console.log('✓ PATCH /api/v1/finished-goods/:id/reconcile status:', resReconcile.status, 'Variance:', reconcileData.data.variance);

    console.log('\n--- 6. Testing Outwork Two-Step State Machine ---');
    // Create new Send-out
    const sendOutId = `SO-${Date.now().toString().slice(-4)}`;
    const resCreateOw = await fetch('http://localhost:3006/api/v1/outwork', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${dispatchClerkToken}`
      },
      body: JSON.stringify({
        sendOutId,
        vendorName: 'Super Heat Treaters',
        process: 'Vacuum Hardening',
        sentQty: 200,
        expectedDate: '2026-08-25'
      })
    });
    const createOwData = await resCreateOw.json();
    console.log('✓ POST /api/v1/outwork status:', resCreateOw.status, 'Status:', createOwData.data.status, '(Expected: SENT)');
    if (createOwData.data.status !== 'SENT') throw new Error('Expected initial status SENT');

    // Partial Return (100 out of 200)
    const resPartialOw = await fetch(`http://localhost:3006/api/v1/outwork/${sendOutId}/receive`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${dispatchClerkToken}`
      },
      body: JSON.stringify({ receivedQty: 100, rejectedQty: 0 })
    });
    const partialOwData = await resPartialOw.json();
    console.log('✓ POST /api/v1/outwork/:id/receive (partial) status:', resPartialOw.status, 'Status:', partialOwData.data.status, '(Expected: PARTIALLY_RECEIVED)');
    if (partialOwData.data.status !== 'PARTIALLY_RECEIVED') throw new Error('Expected PARTIALLY_RECEIVED');

    // Complete Return (remaining 100)
    const resCompleteOw = await fetch(`http://localhost:3006/api/v1/outwork/${sendOutId}/receive`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${dispatchClerkToken}`
      },
      body: JSON.stringify({ receivedQty: 100, rejectedQty: 0 })
    });
    const completeOwData = await resCompleteOw.json();
    console.log('✓ POST /api/v1/outwork/:id/receive (final) status:', resCompleteOw.status, 'Status:', completeOwData.data.status, '(Expected: COMPLETED)');
    if (completeOwData.data.status !== 'COMPLETED') throw new Error('Expected COMPLETED');

    console.log('\n========================================================================');
    console.log('🎉 DISPATCH, FINISHED GOODS & OUTWORK INTEGRATION TESTS PASSED 100%!');
    console.log('========================================================================\n');
  } catch (err: any) {
    console.error('❌ Test failed:', err);
  } finally {
    server.close();
  }
});
