import { logAudit, getAuditLogs, preventAuditLogMutation } from '../src/services/auditLog';
import { invoicesService } from '../src/modules/invoices/invoices.service';
import { ordersService } from '../src/modules/orders/orders.service';
import { inventoryService } from '../src/modules/inventory/inventory.service';
import { authService } from '../src/modules/auth/auth.service';
import { auditController } from '../src/modules/audit/audit.controller';

async function runAuditSubsystemTests() {
  console.log('======================================================');
  console.log('⚡ EXECUTING APPEND-ONLY AUDIT LOGS TEST SUITE');
  console.log('======================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string, detail?: string) {
    if (condition) {
      console.log(`  ✅ [PASS] ${testName}`);
      passed++;
    } else {
      console.error(`  ❌ [FAIL] ${testName}${detail ? ' -> ' + detail : ''}`);
      failed++;
    }
  }

  // ----------------------------------------------------
  // TEST 1: Centralized logAudit Records WHO, WHAT, WHEN, WHERE, BEFORE, AFTER
  // ----------------------------------------------------
  console.log('▶ TEST 1: Structure & Immutability Verification');
  const entry = await logAudit({
    actorId: 'usr-admin-1',
    actorEmail: 'admin@guruom.in',
    action: 'UPDATE_INVOICE',
    entityType: 'invoice',
    entityId: 'INV-1042',
    beforeState: { status: 'pending', amount: 150000 },
    afterState: { status: 'approved', amount: 150000 },
    ipAddress: '192.168.1.100',
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
    metadata: { department: 'Finance' }
  });

  assert(!!entry.id, 'Audit log generated unique primary key ID');
  assert(entry.actorEmail === 'admin@guruom.in', 'Records WHO (actor_email = admin@guruom.in)');
  assert(entry.action === 'UPDATE_INVOICE', 'Records WHAT (action = UPDATE_INVOICE)');
  assert(entry.entityId === 'INV-1042', 'Records Entity ID (entity_id = INV-1042)');
  assert(entry.beforeState?.status === 'pending', 'Records BEFORE state ({ status: "pending", amount: 150000 })');
  assert(entry.afterState?.status === 'approved', 'Records AFTER state ({ status: "approved", amount: 150000 })');
  assert(entry.ipAddress === '192.168.1.100', 'Records WHERE (ip_address = 192.168.1.100)');
  assert(!!entry.created_at, 'Records WHEN (created_at timestamp)');

  // ----------------------------------------------------
  // TEST 2: Invoice Creation and Payment Recording Audit Capture
  // ----------------------------------------------------
  console.log('\n▶ TEST 2: Invoice Payment Mutation Audit Trail');
  const testInvNo = `INV-AUDIT-${Date.now()}`;
  await invoicesService.createInvoice({
    invoiceNo: testInvNo,
    customerName: 'BHEL Power Grid Corp',
    orderPo: 'PO-AUDIT-01',
    challanNo: 'CHL-AUDIT-01',
    status: 'DRAFT',
    date: '2026-08-14',
    dueDate: '2026-09-14',
    totalAmount: 185000,
    paidAmount: 0
  });

  await invoicesService.recordPayment(testInvNo, { paymentAmount: 85000 });

  const { logs: invoiceLogs } = await getAuditLogs({ entityType: 'invoice', entityId: testInvNo, action: 'RECORD_PAYMENT' });
  assert(invoiceLogs.length > 0, 'Invoice payment triggered automated audit record');
  const paymentLog = invoiceLogs[0];
  assert(paymentLog?.beforeState?.paidAmount === 0, 'Before state captured initial paidAmount = 0');
  assert(paymentLog?.afterState?.paidAmount === 85000, 'After state captured new paidAmount = 85000');
  assert(paymentLog?.afterState?.status === 'PARTIAL', 'After state captured updated status = PARTIAL');

  // ----------------------------------------------------
  // TEST 3: Order Status Mutation Audit Trail
  // ----------------------------------------------------
  console.log('\n▶ TEST 3: Order Status Transition Audit Trail');
  const testPo = `PO-TEST-${Date.now()}`;
  await ordersService.createOrder({
    id: `ord-${Date.now()}`,
    poNo: testPo,
    customerName: 'Tata Motors Powertrain',
    poDate: '2026-08-14',
    deliveryDate: '2026-09-14',
    status: 'PENDING_APPROVAL',
    progressStep: 1,
    grossAmount: 350000,
    lines: []
  }, 'admin@guruom.in');

  await ordersService.updateOrderStatus(testPo, { status: 'IN_PRODUCTION', progressStep: 3 }, 'Deepak Sharma (Production Head)');

  const { logs: orderLogs } = await getAuditLogs({ entityType: 'order', entityId: testPo, action: 'UPDATE_ORDER_STATUS' });
  assert(orderLogs.length > 0, 'Order status change recorded into audit ledger');
  const orderLog = orderLogs[0];
  assert(orderLog?.afterState?.status === 'IN_PRODUCTION', 'Order afterState records status: IN_PRODUCTION');

  // ----------------------------------------------------
  // TEST 4: Inventory Adjustment Stock Delta Capture
  // ----------------------------------------------------
  console.log('\n▶ TEST 4: Stock Adjustment Audit Trail');
  await inventoryService.adjustStock('RAW-ALU-6061-T6', { newOnHand: 1100 }, 'warehouse@guruom.in');

  const { logs: stockLogs } = await getAuditLogs({ entityType: 'inventory', entityId: 'RAW-ALU-6061-T6', action: 'ADJUST_STOCK' });
  assert(stockLogs.length > 0, 'Stock adjustment logged in audit ledger');
  const stockLog = stockLogs[0];
  assert(stockLog?.afterState?.onHand === 1100, 'Stock afterState records newOnHand = 1100');

  // ----------------------------------------------------
  // TEST 5: User Role Modification Audit Trail
  // ----------------------------------------------------
  console.log('\n▶ TEST 5: User Governance Audit Trail');
  await authService.updateUserRole('usr-4', 'QC_MANAGER', 'usr-admin-1');

  const { logs: userLogs } = await getAuditLogs({ entityType: 'user', entityId: 'usr-4', action: 'UPDATE_ROLE' });
  assert(userLogs.length > 0, 'User role mutation recorded in audit ledger');
  const userLog = userLogs[0];
  assert(userLog?.afterState?.role === 'QC_MANAGER', 'User role afterState records role = QC_MANAGER');

  // ----------------------------------------------------
  // TEST 6: DB-Level Trigger Immutability Enforcement
  // ----------------------------------------------------
  console.log('\n▶ TEST 6: Database Append-Only Immutability Verification');
  let updateBlocked = false;
  try {
    preventAuditLogMutation('UPDATE');
  } catch (e: any) {
    if (e.message.includes('audit_logs is append-only: UPDATE not allowed')) {
      updateBlocked = true;
    }
  }
  assert(updateBlocked, 'Trigger Exception: UPDATE on audit_logs raises immutable error');

  let deleteBlocked = false;
  try {
    preventAuditLogMutation('DELETE');
  } catch (e: any) {
    if (e.message.includes('audit_logs is append-only: DELETE not allowed')) {
      deleteBlocked = true;
    }
  }
  assert(deleteBlocked, 'Trigger Exception: DELETE on audit_logs raises immutable error');

  // ----------------------------------------------------
  // TEST 7: Anti-Spoofing Session Actor Extraction
  // ----------------------------------------------------
  console.log('\n▶ TEST 7: Server-Side Actor Extraction & Anti-Spoofing');
  let mockResJson: any = null;
  let mockStatusCode = 200;

  const mockReq: any = {
    user: { userId: 'usr-admin-real', email: 'realadmin@guruom.in' },
    headers: { 'x-forwarded-for': '203.0.113.195', 'user-agent': 'Enterprise-Browser/1.0' },
    socket: { remoteAddress: '127.0.0.1' },
    body: {
      action: 'APPROVE_PAYMENT',
      entityType: 'invoice',
      entityId: 'INV-9999',
      actorEmail: 'spoofed_imposter@evil.com', // Attempted spoof
      beforeState: { status: 'PENDING' },
      afterState: { status: 'APPROVED' }
    }
  };

  const mockRes: any = {
    status: (code: number) => {
      mockStatusCode = code;
      return mockRes;
    },
    json: (payload: any) => {
      mockResJson = payload;
      return mockRes;
    }
  };

  await auditController.createAuditLog(mockReq, mockRes);
  assert(mockStatusCode === 201, 'Audit controller accepted recording request');
  assert(mockResJson?.data?.actorEmail === 'realadmin@guruom.in', 'Enforced true actorEmail from server session (rejected spoofed body)');
  assert(mockResJson?.data?.ipAddress === '203.0.113.195', 'Extracted client IP from request headers');

  // ----------------------------------------------------
  // TEST 8: Paginated Query and Range Capabilities
  // ----------------------------------------------------
  console.log('\n▶ TEST 8: Pagination & Filter Suite');
  const paginatedResult = await getAuditLogs({ limit: 10, from: 0 });
  assert(paginatedResult.logs.length <= 10, 'Returned 10 or fewer logs for page size 10');
  assert(paginatedResult.total >= paginatedResult.logs.length, 'Reported accurate total record count for pagination');

  console.log('\n======================================================');
  console.log(`📊 FINAL SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('======================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runAuditSubsystemTests().catch((err) => {
  console.error('Fatal error running audit test suite:', err);
  process.exit(1);
});
