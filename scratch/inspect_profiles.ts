import 'dotenv/config';
import { getDbClient } from '../backend/src/config/database';

async function main() {
  const db = getDbClient();
  const { data: profiles, error } = await db.from('profiles').select('*');
  console.log('Profiles error:', error);
  console.table(profiles);
}

main().catch(console.error);
