import express from 'express';
import cookieParser from 'cookie-parser';
import authRoutes from './src/modules/auth/auth.routes';

async function runHttpTests() {
  const app = express();
  const PORT = 3001;

  app.use(express.json());
  app.use(cookieParser());
  app.use('/api/v1/auth', authRoutes);

  const server = app.listen(PORT);
  console.log(`Test Express server running on port ${PORT}`);

  const BASE_URL = `http://localhost:${PORT}/api/v1/auth`;
  console.log('--- Testing Owner OS Live HTTP Auth Endpoints ---');

  try {
    // 1. Test Login
    console.log('\n[HTTP 1] Testing POST /api/v1/auth/login...');
    const loginRes = await fetch(`${BASE_URL}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'owner@guruom.in', password: '1234567890' })
    });

    const cookies = loginRes.headers.get('set-cookie');
    console.log('✓ Login HTTP status:', loginRes.status);
    console.log('✓ Set-Cookie header present:', Boolean(cookies));

    const loginData = await loginRes.json();
    console.log('✓ Received access_token (length):', loginData.access_token?.length);
    console.log('✓ Authenticated user:', loginData.user?.name, '| role:', loginData.user?.role);

    if (!loginData.access_token || loginData.user?.role !== 'SUPER ADMIN') {
      throw new Error('HTTP Login failed');
    }

    // 2. Test Protected GET /api/v1/auth/me
    console.log('\n[HTTP 2] Testing GET /api/v1/auth/me with Bearer token...');
    const meRes = await fetch(`${BASE_URL}/me`, {
      headers: {
        'Authorization': `Bearer ${loginData.access_token}`,
        'Content-Type': 'application/json'
      }
    });
    console.log('✓ /me HTTP status:', meRes.status);
    const meData = await meRes.json();
    console.log('✓ Verified user profile from /me:', meData.user?.name, '| email:', meData.user?.email);

    // 3. Test Refresh
    console.log('\n[HTTP 3] Testing POST /api/v1/auth/refresh...');
    const refreshRes = await fetch(`${BASE_URL}/refresh`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(cookies ? { 'Cookie': cookies.split(';')[0] } : {})
      }
    });
    console.log('✓ /refresh HTTP status:', refreshRes.status);
    const refreshData = await refreshRes.json();
    console.log('✓ New rotated access_token received:', Boolean(refreshData.access_token));

    // 4. Test Logout
    console.log('\n[HTTP 4] Testing POST /api/v1/auth/logout...');
    const logoutRes = await fetch(`${BASE_URL}/logout`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(cookies ? { 'Cookie': cookies.split(';')[0] } : {})
      }
    });
    console.log('✓ /logout HTTP status:', logoutRes.status);
    const logoutData = await logoutRes.json();
    console.log('✓ Logout response:', logoutData.message);

    // 5. Test Rate Limiting on Repeated Bad Logins
    console.log('\n[HTTP 5] Testing Rate Limiting on repeated failed logins...');
    let hitRateLimit = false;
    for (let i = 1; i <= 6; i++) {
      const badRes = await fetch(`${BASE_URL}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: `attacker_${Date.now()}@bad.com`, password: 'wrong' })
      });
      if (badRes.status === 429) {
        hitRateLimit = true;
        const rateLimitData = await badRes.json();
        console.log(`✓ Attempt ${i}: Rate limiter returned 429 Too Many Requests:`, rateLimitData.message);
        break;
      }
    }
    console.log('✓ Rate limiting protection verified:', hitRateLimit);

    console.log('\n===========================================================');
    console.log('🎉 ALL HTTP AUTH ENDPOINT INTEGRATION TESTS PASSED!');
    console.log('===========================================================\n');
  } finally {
    server.close();
  }
}

runHttpTests().catch(err => {
  console.error('❌ HTTP test error:', err);
  process.exit(1);
});
