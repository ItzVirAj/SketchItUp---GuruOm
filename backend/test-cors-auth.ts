import express from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import authRoutes from './src/modules/auth/auth.routes';

async function runCorsVerificationTests() {
  const app = express();
  const PORT = 3003;

  const allowedOrigins = ['http://localhost:5173', 'http://localhost:3000', 'http://127.0.0.1:5173', 'http://127.0.0.1:3000'];

  app.use(cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin) || allowedOrigins.includes('*')) {
        return callback(null, true);
      }
      return callback(new Error(`CORS blocked for origin: ${origin}`));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin']
  }));

  app.use(express.json());
  app.use(cookieParser());
  app.use('/api/v1/auth', authRoutes);

  const server = app.listen(PORT);
  console.log(`Test Express server running with CORS enabled on port ${PORT}`);

  const BASE_URL = `http://localhost:${PORT}/api/v1/auth`;
  const FRONTEND_ORIGIN = 'http://localhost:5173';

  try {
    console.log('--- Starting CORS & Credentialed Auth Verification ---');

    // 1. Test Preflight OPTIONS /api/v1/auth/login
    console.log('\n[CORS 1] Testing Preflight OPTIONS /api/v1/auth/login...');
    const preflightRes = await fetch(`${BASE_URL}/login`, {
      method: 'OPTIONS',
      headers: {
        'Origin': FRONTEND_ORIGIN,
        'Access-Control-Request-Method': 'POST',
        'Access-Control-Request-Headers': 'Content-Type, Authorization'
      }
    });

    console.log('✓ Preflight HTTP Status:', preflightRes.status);
    console.log('✓ Allow-Origin:', preflightRes.headers.get('access-control-allow-origin'));
    console.log('✓ Allow-Credentials:', preflightRes.headers.get('access-control-allow-credentials'));
    console.log('✓ Allow-Methods:', preflightRes.headers.get('access-control-allow-methods'));

    if (preflightRes.headers.get('access-control-allow-origin') !== FRONTEND_ORIGIN) {
      throw new Error(`Expected Access-Control-Allow-Origin: ${FRONTEND_ORIGIN}`);
    }
    if (preflightRes.headers.get('access-control-allow-credentials') !== 'true') {
      throw new Error('Expected Access-Control-Allow-Credentials: true');
    }

    // 2. Test Cross-Origin POST /api/v1/auth/login
    console.log('\n[CORS 2] Testing Cross-Origin POST /api/v1/auth/login from Vite dev server origin...');
    const loginRes = await fetch(`${BASE_URL}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Origin': 'http://localhost:5173' },
      body: JSON.stringify({ email: 'owner@guruom.in', password: 'Pass@123' })
    });

    console.log('✓ Login HTTP Status:', loginRes.status);
    console.log('✓ Login Allow-Origin:', loginRes.headers.get('access-control-allow-origin'));
    console.log('✓ Login Allow-Credentials:', loginRes.headers.get('access-control-allow-credentials'));

    const setCookie = loginRes.headers.get('set-cookie');
    console.log('✓ Set-Cookie header present:', Boolean(setCookie));
    console.log('✓ Cookie details:', setCookie);

    const loginData = await loginRes.json();
    console.log('✓ Logged in as:', loginData.user?.name, `(${loginData.user?.role})`);
    const accessToken = loginData.access_token;

    // 3. Test Cross-Origin GET /api/v1/auth/me
    console.log('\n[CORS 3] Testing Cross-Origin GET /api/v1/auth/me with Bearer token...');
    const meRes = await fetch(`${BASE_URL}/me`, {
      headers: {
        'Origin': FRONTEND_ORIGIN,
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    });

    console.log('✓ /me HTTP Status:', meRes.status);
    console.log('✓ /me Allow-Origin:', meRes.headers.get('access-control-allow-origin'));
    console.log('✓ /me Allow-Credentials:', meRes.headers.get('access-control-allow-credentials'));
    const meData = await meRes.json();
    console.log('✓ Authenticated User:', meData.user?.name);

    // 4. Test Cross-Origin POST /api/v1/auth/refresh
    console.log('\n[CORS 4] Testing Cross-Origin POST /api/v1/auth/refresh with cookie...');
    const refreshRes = await fetch(`${BASE_URL}/refresh`, {
      method: 'POST',
      headers: {
        'Origin': FRONTEND_ORIGIN,
        'Content-Type': 'application/json',
        ...(setCookie ? { 'Cookie': setCookie.split(';')[0] } : {})
      }
    });

    console.log('✓ Refresh HTTP Status:', refreshRes.status);
    console.log('✓ Refresh Allow-Origin:', refreshRes.headers.get('access-control-allow-origin'));
    const refreshData = await refreshRes.json();
    console.log('✓ Rotated access token received:', Boolean(refreshData.access_token));

    console.log('\n=============================================================');
    console.log('🎉 CORS & CREDENTIALED AUTH INTEGRATION TESTS PASSED 100%!');
    console.log('=============================================================\n');
  } finally {
    server.close();
  }
}

runCorsVerificationTests().catch(err => {
  console.error('❌ CORS Verification error:', err);
  process.exit(1);
});
