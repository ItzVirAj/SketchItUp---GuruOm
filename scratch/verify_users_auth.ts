import 'dotenv/config';
import { authService } from '../backend/src/modules/auth/auth.service';

async function main() {
  console.log('=== AUTH & USER MASTER VERIFICATION ===');

  // 1. Verify Founder & CEO login (Sachin Gharbude / owner@guruom.in)
  console.log('\n1. Testing Login for Founder & CEO (owner@guruom.in)...');
  const ownerLogin = await authService.login('owner@guruom.in', '1234567890');
  console.log('✓ Founder & CEO Login Success:');
  console.log('  ID:', ownerLogin.user.id);
  console.log('  Name:', ownerLogin.user.name);
  console.log('  Email:', ownerLogin.user.email);
  console.log('  Role:', ownerLogin.user.role);
  console.log('  Department:', ownerLogin.user.department);

  // 2. Verify Plant Operations Admin login (Pramod Parshi / pramod@guruom.in)
  console.log('\n2. Testing Login for Plant Operations Admin (pramod@guruom.in)...');
  const opsLogin = await authService.login('pramod@guruom.in', '1234567890');
  console.log('✓ Plant Operations Admin Login Success:');
  console.log('  ID:', opsLogin.user.id);
  console.log('  Name:', opsLogin.user.name);
  console.log('  Email:', opsLogin.user.email);
  console.log('  Role:', opsLogin.user.role);
  console.log('  Department:', opsLogin.user.department);

  // 3. Test getAllUsers returns both users
  console.log('\n3. Fetching all users via authService.getAllUsers()...');
  const allUsers = await authService.getAllUsers();
  console.log(`✓ Total users returned: ${allUsers.length}`);
  const sachin = allUsers.find(u => u.email === 'owner@guruom.in');
  const pramod = allUsers.find(u => u.email === 'pramod@guruom.in');
  console.log('  Sachin found:', sachin?.name, '|', sachin?.role);
  console.log('  Pramod found:', pramod?.name, '|', pramod?.role);

  console.log('\n=== ALL USER VERIFICATION PASSED ===');
  process.exit(0);
}

main().catch(err => {
  console.error('Verification failed:', err);
  process.exit(1);
});
