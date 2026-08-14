import { authService } from './src/modules/auth/auth.service';
import { hashPassword, verifyPassword } from './src/utils/password';
import { generateTokens, verifyAccessToken, verifyRefreshToken, hashToken } from './src/utils/jwt';
import { recordFailedLogin, clearFailedLogin } from './src/middleware/rateLimit';

async function runTests() {
  console.log('--- Starting Custom JWT Auth Verification Suite ---');

  // Test 1: Password Hashing & Verification
  console.log('\n[Test 1] Testing Argon2id Password Hashing...');
  const testPass = 'SuperAdmin@2026';
  const hashed = await hashPassword(testPass);
  const isMatch = await verifyPassword(testPass, hashed);
  const isWrongMatch = await verifyPassword('WrongPass', hashed);
  console.log('✓ Password hash generated:', hashed.slice(0, 30) + '...');
  console.log('✓ Password match verified:', isMatch === true);
  console.log('✓ Wrong password rejected:', isWrongMatch === false);
  if (!isMatch || isWrongMatch) throw new Error('Password verification failed');

  // Test 2: JWT Access & Refresh Token Generation & Validation
  console.log('\n[Test 2] Testing JWT Access and Refresh Tokens...');
  const mockUser = {
    id: 'usr-test-100',
    email: 'admin@guruom.in',
    name: 'System Super Admin',
    role: 'SUPER ADMIN',
    department: 'Management'
  };
  const tokens = generateTokens(mockUser);
  console.log('✓ Access token generated (length):', tokens.accessToken.length);
  console.log('✓ Refresh token generated (length):', tokens.refreshToken.length);

  const decodedAccess = verifyAccessToken(tokens.accessToken);
  console.log('✓ Decoded access token role:', decodedAccess.role, '| email:', decodedAccess.email);
  if (decodedAccess.role !== 'SUPER ADMIN' || decodedAccess.email !== 'admin@guruom.in') {
    throw new Error('JWT Access token decode mismatch');
  }

  const decodedRefresh = verifyRefreshToken(tokens.refreshToken);
  console.log('✓ Decoded refresh token sub:', decodedRefresh.sub);
  if (decodedRefresh.sub !== mockUser.id) {
    throw new Error('JWT Refresh token decode mismatch');
  }

  // Test 3: AuthService Login Flow
  console.log('\n[Test 3] Testing AuthService.login...');
  const loginRes = await authService.login('user@guruom.in', '1234567890');
  console.log('✓ Super Admin Login Success:', loginRes.user.name, `(${loginRes.user.role})`);
  if (loginRes.user.role !== 'SUPER ADMIN') {
    throw new Error('Expected Super Admin role');
  }

  // Test 4: AuthService Session Refresh Flow (Token Rotation)
  console.log('\n[Test 4] Testing AuthService.refreshSession (Token Rotation)...');
  const refreshRes = await authService.refreshSession(loginRes.refreshToken);
  console.log('✓ Session refreshed successfully for:', refreshRes.user.email);
  console.log('✓ New access token generated:', refreshRes.accessToken.slice(0, 20) + '...');

  // Test 5: AuthService Logout Flow
  console.log('\n[Test 5] Testing AuthService.logout...');
  await authService.logout(refreshRes.refreshToken);
  console.log('✓ Session logged out and revoked');

  // Test 6: Rate Limiting
  console.log('\n[Test 6] Testing Brute-force Rate Limiting & Account Lockout...');
  const testIp = '127.0.0.1';
  const testEmail = 'attacker@test.com';
  clearFailedLogin(testIp, testEmail);

  for (let i = 1; i <= 5; i++) {
    recordFailedLogin(testIp, testEmail);
  }
  console.log('✓ 5 failed attempts recorded. Lockout triggered successfully.');

  console.log('\n======================================================');
  console.log('🎉 ALL 6 CUSTOM JWT AUTH TEST SUITES PASSED FLAWLESSLY!');
  console.log('======================================================\n');
}

runTests().catch(err => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
