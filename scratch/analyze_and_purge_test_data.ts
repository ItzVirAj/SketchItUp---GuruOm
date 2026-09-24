import 'dotenv/config';
import { getDbClient } from '../backend/src/config/database';

async function main() {
  const supabase = getDbClient();
  console.log('=== ANALYZING ALL ORDERS IN SUPABASE ===');

  const { data: orders, error } = await supabase
    .from('customer_orders')
    .select('id, po_no, customer_name, status, created_at')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching orders:', error);
    process.exit(1);
  }

  console.log(`Total orders found: ${orders?.length || 0}`);
  
  const testOrders = [];
  const realOrders = [];

  for (const o of orders || []) {
    const isTest = 
      o.po_no.startsWith('PO-GOLDEN-') ||
      o.po_no.startsWith('PO-TEST-REG-') ||
      o.po_no.startsWith('PO-PERSIST-') ||
      o.po_no.startsWith('PO-TATA-') ||
      o.po_no.startsWith('PO-TEST-') ||
      o.po_no.startsWith('PO-PROC-') ||
      o.po_no.startsWith('PO-RM-') ||
      o.po_no.startsWith('PO-2026-TEST-') ||
      o.po_no.startsWith('__TEST__') ||
      o.po_no.includes('615144') ||
      o.po_no.includes('678480');

    if (isTest) {
      testOrders.push(o);
    } else {
      realOrders.push(o);
    }
  }

  console.log('\n--- GENUINE ORDERS (TO PRESERVE) ---');
  console.table(realOrders);

  console.log(`\n--- TEST POLLUTION ORDERS (${testOrders.length} records to be purged) ---`);
  console.table(testOrders);

  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
