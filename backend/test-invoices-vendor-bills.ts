import express from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import { generateTokens } from './src/utils/jwt';
import invoicesRoutes from './src/modules/invoices/invoices.routes';
import vendorBillsRoutes from './src/modules/vendor-bills/vendor-bills.routes';

const app = express();
app.use(express.json());
app.use(cookieParser());
app.use(cors({ origin: true, credentials: true }));

app.use('/api/v1/invoices', invoicesRoutes);
app.use('/api/v1/vendor-bills', vendorBillsRoutes);

const server = app.listen(3007, async () => {
  console.log('Test server running on port 3007 for Invoices & Vendor Bills verification');

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
    const resUnauth = await fetch('http://localhost:3007/api/v1/invoices');
    console.log('✓ GET /api/v1/invoices status:', resUnauth.status, '(Expected: 401)');
    if (resUnauth.status !== 401) throw new Error('Expected 401 on missing auth');

    console.log('\n--- 2. Testing RBAC Role Restrictions (403 Forbidden) ---');
    // Operator trying to create customer invoice (restricted to SUPER ADMIN, FINANCE_MANAGER)
    const resRbacInvoice = await fetch('http://localhost:3007/api/v1/invoices', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${operatorToken}`
      },
      body: JSON.stringify({
        invoiceNo: 'INV/RBAC-TEST/26-27',
        customerName: 'Test Customer',
        orderPo: 'PO-2026-001',
        challanNo: 'CHL/0001/26-27',
        date: '2026-08-14',
        dueDate: '2026-09-14',
        totalAmount: 50000
      })
    });
    console.log('✓ POST /api/v1/invoices as OPERATOR status:', resRbacInvoice.status, '(Expected: 403)');
    if (resRbacInvoice.status !== 403) throw new Error('Expected 403 when OPERATOR attempts invoice creation');

    console.log('\n--- 3. Testing Customer Invoice Creation & Payment Lifecycle ---');
    // Fetch Invoices
    const resListInv = await fetch('http://localhost:3007/api/v1/invoices', {
      headers: { 'Authorization': `Bearer ${financeManagerToken}` }
    });
    const invList = await resListInv.json();
    console.log('✓ GET /api/v1/invoices status:', resListInv.status, 'Total Invoices:', invList.data.length);

    // Create new Tax Invoice
    const testInvNo = `INV/TEST-${Date.now().toString().slice(-4)}/26-27`;
    const resCreateInv = await fetch('http://localhost:3007/api/v1/invoices', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${financeManagerToken}`
      },
      body: JSON.stringify({
        invoiceNo: testInvNo,
        customerName: 'Bharat Forge Ltd',
        orderPo: 'PO-2026-001',
        challanNo: 'CHL/0001/26-27',
        status: 'DRAFT',
        date: '2026-08-14',
        dueDate: '2026-09-14',
        taxRate: 18,
        totalAmount: 100000.50,
        paidAmount: 0.00
      })
    });
    const createInvData = await resCreateInv.json();
    console.log('✓ POST /api/v1/invoices status:', resCreateInv.status, 'Created Invoice:', createInvData.data.invoiceNo, 'Total Amount: ₹' + createInvData.data.totalAmount);
    if (resCreateInv.status !== 201) throw new Error('Failed to create customer invoice');

    // Partial Payment: Pay 40,000
    const resPartialPay = await fetch(`http://localhost:3007/api/v1/invoices/${encodeURIComponent(testInvNo)}/pay`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${financeManagerToken}`
      },
      body: JSON.stringify({
        paymentAmount: 40000.00,
        paymentMode: 'NEFT_RTGS',
        referenceNo: 'UTR-HDFC-991283'
      })
    });
    const partialPayData = await resPartialPay.json();
    console.log('✓ POST /api/v1/invoices/:no/pay (Partial) status:', resPartialPay.status, 'New Status:', partialPayData.data.status, 'Balance: ₹' + partialPayData.data.balanceAmount);
    if (partialPayData.data.status !== 'PARTIAL') throw new Error('Expected status PARTIAL');

    // Full Payment: Pay remaining balance
    const resFullPay = await fetch(`http://localhost:3007/api/v1/invoices/${encodeURIComponent(testInvNo)}/pay`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${superAdminToken}`
      },
      body: JSON.stringify({}) // Default pays remaining balance
    });
    const fullPayData = await resFullPay.json();
    console.log('✓ POST /api/v1/invoices/:no/pay (Full) status:', resFullPay.status, 'New Status:', fullPayData.data.status, 'Balance: ₹' + fullPayData.data.balanceAmount);
    if (fullPayData.data.status !== 'PAID') throw new Error('Expected status PAID');

    console.log('\n--- 4. Testing Vendor Bills & Payables Lifecycle ---');
    // Fetch Vendor Bills
    const resListBills = await fetch('http://localhost:3007/api/v1/vendor-bills', {
      headers: { 'Authorization': `Bearer ${financeManagerToken}` }
    });
    const billsList = await resListBills.json();
    console.log('✓ GET /api/v1/vendor-bills status:', resListBills.status, 'Total Bills:', billsList.data.length);

    // Create new Vendor Bill
    const testBillNo = `BILL-TEST-${Date.now().toString().slice(-4)}`;
    const resCreateBill = await fetch('http://localhost:3007/api/v1/vendor-bills', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${financeManagerToken}`
      },
      body: JSON.stringify({
        billNo: testBillNo,
        vendorName: 'Tata Steel Tubes Division',
        poNo: 'PO-RM-2026-009',
        status: 'OPEN',
        date: '2026-08-14',
        dueDate: '2026-09-14',
        amount: 85000.75,
        paidAmount: 0.00
      })
    });
    const createBillData = await resCreateBill.json();
    console.log('✓ POST /api/v1/vendor-bills status:', resCreateBill.status, 'Created Bill:', createBillData.data.billNo, 'Amount: ₹' + createBillData.data.amount);
    if (resCreateBill.status !== 201) throw new Error('Failed to create vendor bill');

    // Partial Disbursement (Pay 35,000)
    const resPartialDisb = await fetch(`http://localhost:3007/api/v1/vendor-bills/${encodeURIComponent(testBillNo)}/disburse`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${financeManagerToken}`
      },
      body: JSON.stringify({ paymentAmount: 35000.00 })
    });
    const partialDisbData = await resPartialDisb.json();
    console.log('✓ POST /api/v1/vendor-bills/:no/disburse (Partial) status:', resPartialDisb.status, 'Status:', partialDisbData.data.status, 'Balance: ₹' + partialDisbData.data.balanceAmount);
    if (partialDisbData.data.status !== 'PARTIAL') throw new Error('Expected status PARTIAL');

    // Full Disbursement
    const resFullDisb = await fetch(`http://localhost:3007/api/v1/vendor-bills/${encodeURIComponent(testBillNo)}/disburse`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${superAdminToken}`
      },
      body: JSON.stringify({})
    });
    const fullDisbData = await resFullDisb.json();
    console.log('✓ POST /api/v1/vendor-bills/:no/disburse (Full) status:', resFullDisb.status, 'Status:', fullDisbData.data.status, 'Balance: ₹' + fullDisbData.data.balanceAmount);
    if (fullDisbData.data.status !== 'PAID') throw new Error('Expected status PAID');

    console.log('\n========================================================================');
    console.log('🎉 INVOICES & VENDOR BILLS REST API INTEGRATION TESTS PASSED 100%!');
    console.log('========================================================================\n');
  } catch (err: any) {
    console.error('❌ Test failed:', err);
  } finally {
    server.close();
  }
});
