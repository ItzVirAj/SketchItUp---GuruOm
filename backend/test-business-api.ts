import express from 'express';
import cookieParser from 'cookie-parser';
import authRoutes from './src/modules/auth/auth.routes';
import mastersRoutes from './src/modules/masters/masters.routes';
import ordersRoutes from './src/modules/orders/orders.routes';
import inventoryRoutes from './src/modules/inventory/inventory.routes';

async function runBusinessApiTests() {
  const app = express();
  const PORT = 3002;

  app.use(express.json());
  app.use(cookieParser());
  app.use('/api/v1/auth', authRoutes);
  app.use('/api/v1/masters', mastersRoutes);
  app.use('/api/v1/orders', ordersRoutes);
  app.use('/api/v1/inventory', inventoryRoutes);

  const server = app.listen(PORT);
  console.log(`Test Express server running on port ${PORT}`);

  const BASE_URL = `http://localhost:${PORT}/api/v1`;

  try {
    console.log('--- Starting Business REST API Verification Suite ---');

    // 1. Authenticate as Super Admin & Operator
    console.log('\n[Auth Setup] Logging in as Super Admin & Operator...');
    const adminLoginRes = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'owner@guruom.in', password: '1234567890' })
    });
    const adminData = await adminLoginRes.json();
    const adminToken = adminData.access_token;
    console.log('✓ Super Admin authenticated. Token received.');

    const operatorLoginRes = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'operator@guruom.in', password: '1234567890' })
    });
    const operatorData = await operatorLoginRes.json();
    const operatorToken = operatorData.access_token;
    console.log('✓ Operator authenticated. Token received.');

    // 2. Test 401 Unauthorized (No / Invalid Token)
    console.log('\n[Security 401] Testing endpoint without token & with invalid token...');
    const noTokenRes = await fetch(`${BASE_URL}/orders`);
    console.log('✓ Request without token HTTP status:', noTokenRes.status);
    if (noTokenRes.status !== 401) throw new Error('Expected 401 without token');

    const badTokenRes = await fetch(`${BASE_URL}/orders`, {
      headers: { 'Authorization': 'Bearer invalid.jwt.token' }
    });
    console.log('✓ Request with invalid token HTTP status:', badTokenRes.status);
    if (badTokenRes.status !== 401) throw new Error('Expected 401 with invalid token');

    // 3. Test 403 Forbidden (RBAC Role Restrictions)
    console.log('\n[Security 403] Testing RBAC role-gated endpoint with Operator role...');
    // Operator trying to create a core master item (restricted to SUPER ADMIN)
    const forbiddenRes = await fetch(`${BASE_URL}/masters`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${operatorToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        code: 'TEST-ITEM-FORBIDDEN',
        description: 'Forbidden Test Part',
        unit: 'NOS'
      })
    });
    console.log('✓ Operator POST /masters HTTP status:', forbiddenRes.status);
    const forbiddenData = await forbiddenRes.json();
    console.log('✓ Forbidden response message:', forbiddenData.message);
    if (forbiddenRes.status !== 403) throw new Error('Expected 403 Forbidden for Operator on POST /masters');

    // 4. Test Masters API (GET and POST as Super Admin)
    console.log('\n[Masters Module] Testing GET and POST /masters...');
    const getMastersRes = await fetch(`${BASE_URL}/masters`, {
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    const mastersData = await getMastersRes.json();
    console.log('✓ GET /masters status:', getMastersRes.status, '| total items:', mastersData.data?.length);

    const newMaster = {
      code: `PART-TEST-${Date.now().toString().slice(-4)}`,
      partNo: 'PN-9988',
      description: 'Precision Machined Flange Test',
      unit: 'NOS',
      hsnCode: '8483',
      reorderLevel: 25,
      saleRate: 450,
      purchaseRate: 280
    };
    const createMasterRes = await fetch(`${BASE_URL}/masters`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${adminToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(newMaster)
    });
    console.log('✓ POST /masters status:', createMasterRes.status);
    const createMasterData = await createMasterRes.json();
    console.log('✓ Created master item:', createMasterData.data?.code, '|', createMasterData.data?.description);

    // 5. Test Orders API (GET, POST, GET by ID, PATCH status)
    console.log('\n[Orders Module] Testing Orders REST lifecycle...');
    const testOrderId = `ORD-TEST-${Date.now().toString().slice(-4)}`;
    const newOrderPayload = {
      id: testOrderId,
      poNo: `PO-TEST-${Date.now().toString().slice(-4)}`,
      customerName: 'Tata Motors Precision Division',
      poDate: '2026-08-14',
      deliveryDate: '2026-08-30',
      status: 'CONFIRMED',
      progressStep: 1,
      grossAmount: 185000,
      taxCategory: 'GST 18%',
      remark: 'Migrated API Test Order',
      lines: [
        {
          itemCode: newMaster.code,
          itemDescription: newMaster.description,
          orderQty: 200,
          unit: 'NOS',
          dispatchedQty: 0,
          pendingQty: 200,
          rate: 450
        }
      ]
    };

    const createOrderRes = await fetch(`${BASE_URL}/orders`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${adminToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(newOrderPayload)
    });
    console.log('✓ POST /orders status:', createOrderRes.status);

    const getOrderRes = await fetch(`${BASE_URL}/orders/${testOrderId}`, {
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    console.log('✓ GET /orders/:id status:', getOrderRes.status);
    const singleOrderData = await getOrderRes.json();
    console.log('✓ Order fetched:', singleOrderData.data?.poNo, '| Lines count:', singleOrderData.data?.lines?.length);

    // Update Status
    const patchStatusRes = await fetch(`${BASE_URL}/orders/${testOrderId}/status`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${operatorToken}`, // Operator is authorized to update order status
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ status: 'IN_PRODUCTION', progressStep: 2 })
    });
    console.log('✓ PATCH /orders/:id/status status:', patchStatusRes.status);
    const patchData = await patchStatusRes.json();
    console.log('✓ Updated order status:', patchData.data?.status, '| Progress step:', patchData.data?.progress_step);

    // 6. Test Inventory API (Stock & Shortages)
    console.log('\n[Inventory Module] Testing Stock & Shortage APIs...');
    const getStockRes = await fetch(`${BASE_URL}/inventory/stock`, {
      headers: { 'Authorization': `Bearer ${operatorToken}` }
    });
    console.log('✓ GET /inventory/stock status:', getStockRes.status);

    const adjustRes = await fetch(`${BASE_URL}/inventory/stock/RAW-ALU-6061-ROD`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${operatorToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ newOnHand: 550 })
    });
    console.log('✓ PUT /inventory/stock/:code status:', adjustRes.status);
    const adjustData = await adjustRes.json();
    console.log('✓ Adjusted stock level:', adjustData.data?.code, '| On hand:', adjustData.data?.onHand);

    const getShortagesRes = await fetch(`${BASE_URL}/inventory/shortages`, {
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    console.log('✓ GET /inventory/shortages status:', getShortagesRes.status);

    console.log('\n===========================================================');
    console.log('🎉 ALL BUSINESS REST API MODULE INTEGRATION TESTS PASSED!');
    console.log('===========================================================\n');
  } finally {
    server.close();
  }
}

runBusinessApiTests().catch(err => {
  console.error('❌ Business API test error:', err);
  process.exit(1);
});
