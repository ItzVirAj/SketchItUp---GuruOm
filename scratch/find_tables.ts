import 'dotenv/config';
import { getDbClient } from '../backend/src/config/database';

async function main() {
  const db = getDbClient();
  const testTables = ['customer_orders', 'job_cards', 'stock_items', 'auth_users', 'users', 'system_users', 'user_masters', 'profiles', 'master_users', 'customers', 'vendors', 'machines', 'boms', 'route_cards', 'audit_logs'];
  for (const t of testTables) {
    const { count, error } = await db.from(t).select('*', { count: 'exact', head: true });
    console.log(`Table ${t}:`, error ? `ERROR: ${error.message}` : `EXISTS, count: ${count}`);
  }
}

main().catch(console.error);
