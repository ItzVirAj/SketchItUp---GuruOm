import 'dotenv/config';
import { getDbClient } from '../backend/src/config/database';

async function main() {
  const db = getDbClient();
  const { data: users, error } = await db.from('users').select('*');
  console.log('Error:', error);
  console.log('Users in DB (count:', users?.length, '):');
  console.table(users);
}

main().catch(console.error);
