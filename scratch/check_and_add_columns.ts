import 'dotenv/config';
import { getDbClient } from '../backend/src/config/database';

async function main() {
  const db = getDbClient();
  
  // Try inserting an order with is_test_data to see if the column is accepted
  const testId = `test-probe-${Date.now()}`;
  const { error: insertErr } = await db.from('customer_orders').insert({
    id: testId,
    po_no: `__PROBE__${Date.now()}`,
    customer_name: 'Test Probe',
    status: 'PO_RECEIVED',
    total_amount: 1000,
    is_test_data: true
  });

  if (insertErr) {
    console.log('is_test_data column test insert result:', insertErr.message);
  } else {
    console.log('✓ is_test_data column exists and accepts boolean!');
    // Delete the probe
    await db.from('customer_orders').delete().eq('id', testId);
  }

  process.exit(0);
}

main();
