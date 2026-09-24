import 'dotenv/config';
import { getDbClient } from '../backend/src/config/database';

async function cleanup() {
  const db = getDbClient();
  console.log('=== STARTING TEST DATA PURGE ===\n');

  // 1. Fetch all test orders
  const { data: allOrders } = await db.from('customer_orders').select('id, po_no');
  
  const testOrderPatterns = [
    'PO-GOLDEN-',
    'PO-TEST-REG-',
    'PO-PERSIST-',
    'PO-TATA-',
    'PO-TEST-',
    'PO-PROC-',
    'PO-2026-TEST-',
    '__TEST__'
  ];

  const testOrders = (allOrders || []).filter(o => {
    return testOrderPatterns.some(pat => o.po_no.startsWith(pat)) ||
           o.po_no.includes('615144') ||
           o.po_no.includes('678480');
  });

  const testOrderIds = testOrders.map(o => o.id);
  const testPoNos = testOrders.map(o => o.po_no);

  console.log(`Identified ${testOrders.length} test orders to purge:`);
  console.log(testPoNos);

  if (testOrderIds.length > 0) {
    // 2. Cascade delete from downstream tables

    // Material Reservations
    for (const po of testPoNos) {
      await db.from('material_reservations').delete().eq('order_po', po);
    }
    for (const id of testOrderIds) {
      await db.from('material_reservations').delete().eq('order_id', id);
    }
    console.log('✓ Cleaned material_reservations');

    // Production Logs
    for (const po of testPoNos) {
      await db.from('production_logs').delete().eq('order_po', po);
    }
    console.log('✓ Cleaned production_logs');

    // QC Inspections
    for (const po of testPoNos) {
      await db.from('qc_inspections').delete().eq('order_po', po);
    }
    console.log('✓ Cleaned qc_inspections');

    // PDI Inspections
    for (const po of testPoNos) {
      await db.from('pdi_inspections').delete().eq('order_po', po);
    }
    console.log('✓ Cleaned pdi_inspections');

    // Job Cards
    for (const po of testPoNos) {
      await db.from('job_cards').delete().eq('order_po', po);
    }
    await db.from('job_cards').delete().ilike('job_no', 'JC/6%');
    console.log('✓ Cleaned job_cards');

    // Finished Goods
    for (const po of testPoNos) {
      await db.from('finished_goods').delete().eq('order_po', po);
    }
    console.log('✓ Cleaned finished_goods');

    // Dispatch Challans
    for (const po of testPoNos) {
      await db.from('dispatch_challans').delete().eq('order_po', po);
    }
    await db.from('dispatch_challans').delete().ilike('challan_no', 'CHL/6%');
    console.log('✓ Cleaned dispatch_challans');

    // Customer Invoices
    for (const po of testPoNos) {
      await db.from('customer_invoices').delete().eq('order_po', po);
    }
    await db.from('customer_invoices').delete().ilike('invoice_no', 'INV-6%');
    console.log('✓ Cleaned customer_invoices');

    // Order Line Items
    for (const id of testOrderIds) {
      await db.from('order_line_items').delete().eq('order_id', id);
    }
    console.log('✓ Cleaned order_line_items');

    // Customer Orders
    for (const id of testOrderIds) {
      await db.from('customer_orders').delete().eq('id', id);
    }
    for (const po of testPoNos) {
      await db.from('customer_orders').delete().eq('po_no', po);
    }
    console.log('✓ Cleaned customer_orders');
  }

  // 3. Clean test purchasing & inventory master data
  await db.from('purchase_orders').delete().ilike('po_no', 'PO-PUR-6%');
  await db.from('goods_receipt_notes').delete().ilike('grn_no', 'GRN-6%');
  await db.from('boms').delete().ilike('bom_code', 'BOM-6%');
  await db.from('stock_items').delete().ilike('item_code', '%615144%');
  await db.from('stock_items').delete().ilike('item_code', '%678480%');
  await db.from('inventory_movements').delete().ilike('item_code', '%615144%');
  await db.from('inventory_movements').delete().ilike('item_code', '%678480%');
  await db.from('customers').delete().ilike('name', 'Tata Motors Power Systems - 6%');
  await db.from('customers').delete().ilike('name', 'Persistence Test Customer%');

  console.log('✓ Cleaned test BOMs, purchasing, GRNs, and customers');

  // 4. Verify remaining orders
  const { data: remainingOrders } = await db
    .from('customer_orders')
    .select('id, po_no, customer_name, status, created_at')
    .order('created_at', { ascending: false });

  console.log('\n=== REMAINING LIVE ORDERS IN DATABASE ===');
  console.table(remainingOrders);
  console.log(`Total live orders: ${remainingOrders?.length || 0}`);

  process.exit(0);
}

cleanup().catch(err => {
  console.error('Cleanup failed:', err);
  process.exit(1);
});
