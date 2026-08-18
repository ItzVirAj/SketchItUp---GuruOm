import 'dotenv/config';
import { supabase } from '../backend/src/config/supabase';

async function main() {
  const { data: users, error: uErr } = await supabase.from('users').select('*');
  console.log('Users in `users` table:', users, uErr);

  const { data: authUsers, error: aErr } = await supabase.from('auth_users').select('*');
  console.log('Users in `auth_users` table:', authUsers, aErr);
}

main().catch(console.error);
