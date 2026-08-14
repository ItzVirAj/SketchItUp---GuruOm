import { 
  loginRateLimiter, 
  refreshRateLimiter, 
  passwordChangeRateLimiter, 
  sessionRevokeRateLimiter, 
  recordFailedLogin, 
  clearFailedLogin,
  rateLimiters
} from '../src/middleware/rateLimit';
import { getRedisClient, closeRedis } from '../src/lib/redis';
import { authService } from '../src/modules/auth/auth.service';
import { ENV } from '../src/config/env';

// Mock Express Request & Response Builder
function createMockContext(ip: string, email?: string, user?: any) {
  const req: any = {
    ip,
    headers: {
      'user-agent': 'Jest-RateLimit-Tester/1.0',
      'x-forwarded-for': ip
    },
    body: { email },
    user
  };

  const res: any = {
    statusCode: 200,
    headers: {} as Record<string, string>,
    body: null as any,
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    set(headers: Record<string, string>) {
      Object.assign(this.headers, headers);
      return this;
    },
    json(data: any) {
      this.body = data;
      return this;
    }
  };

  let nextCalled = false;
  const next = () => {
    nextCalled = true;
  };

  return { req, res, next, wasNextCalled: () => nextCalled };
}

async function runRateLimitTests() {
  console.log('======================================================');
  console.log('⚡ EXECUTING REDIS FAST-LAYER & RATE LIMIT TEST SUITE');
  console.log('======================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string, detail?: string) {
    if (condition) {
      console.log(`  ✅ [PASS] ${testName}`);
      passed++;
    } else {
      console.error(`  ❌ [FAIL] ${testName}${detail ? ' -> ' + detail : ''}`);
      failed++;
    }
  }

  // ----------------------------------------------------
  // TEST 1: Redis Singleton Client Initialization
  // ----------------------------------------------------
  console.log('▶ TEST 1: Redis Client & Connection Management');
  const redis = getRedisClient();
  assert(!!redis, 'Shared singleton Redis client initialized');
  assert(typeof redis.on === 'function', 'Redis client exposes standard ioredis event emitter');

  // ----------------------------------------------------
  // TEST 2: Under-Limit Requests Pass Through
  // ----------------------------------------------------
  console.log('\n▶ TEST 2: Under-Limit Requests Succeed');
  const testIp1 = '198.51.100.10';
  const testEmail1 = 'operator1@guruom.in';

  let allUnderLimitPassed = true;
  for (let i = 0; i < ENV.RATE_LIMIT_LOGIN_MAX; i++) {
    const ctx = createMockContext(testIp1, testEmail1);
    await loginRateLimiter(ctx.req, ctx.res, ctx.next);
    if (!ctx.wasNextCalled()) {
      allUnderLimitPassed = false;
      break;
    }
  }
  assert(allUnderLimitPassed, `First ${ENV.RATE_LIMIT_LOGIN_MAX} login attempts succeed (next() called)`);

  // ----------------------------------------------------
  // TEST 3: Over-Limit Request Returns 429 & Generic Message
  // ----------------------------------------------------
  console.log('\n▶ TEST 3: Over-Limit Request Returns 429 Too Many Requests');
  const overLimitCtx = createMockContext(testIp1, testEmail1);
  await loginRateLimiter(overLimitCtx.req, overLimitCtx.res, overLimitCtx.next);

  assert(!overLimitCtx.wasNextCalled(), 'Over-limit request does not proceed to route handler');
  assert(overLimitCtx.res.statusCode === 429, 'Returns HTTP 429 Too Many Requests status code');
  assert(overLimitCtx.res.body?.error === 'TooManyRequests', 'Returns standard TooManyRequests error code');
  assert(
    overLimitCtx.res.body?.message === 'Too many requests. Please try again later.',
    'Returns generic user message without leaking rate-limit thresholds or IP/email targets'
  );
  assert(
    overLimitCtx.res.headers['Retry-After'] !== undefined,
    'Includes standard Retry-After response header'
  );

  // ----------------------------------------------------
  // TEST 4: IP Isolation (Different IPs Have Separate Buckets)
  // ----------------------------------------------------
  console.log('\n▶ TEST 4: IP Isolation Across Buckets');
  const testIp2 = '198.51.100.20'; // Different IP
  const ip2Ctx = createMockContext(testIp2, testEmail1); // Same email, different IP
  await loginRateLimiter(ip2Ctx.req, ip2Ctx.res, ip2Ctx.next);

  assert(ip2Ctx.wasNextCalled() && ip2Ctx.res.statusCode === 200, 'Different IP is NOT blocked by IP1 rate limit');

  // ----------------------------------------------------
  // TEST 5: Email Isolation Under Same IP
  // ----------------------------------------------------
  console.log('\n▶ TEST 5: Email Combo Isolation from Same IP');
  const testEmail2 = 'admin2@guruom.in'; // Different email from testIp2
  const email2Ctx = createMockContext(testIp2, testEmail2);
  await loginRateLimiter(email2Ctx.req, email2Ctx.res, email2Ctx.next);

  assert(email2Ctx.wasNextCalled() && email2Ctx.res.statusCode === 200, 'Different email on same IP has its own combo points');

  // ----------------------------------------------------
  // TEST 6: Clear Failed Login Resets Rate Limit
  // ----------------------------------------------------
  console.log('\n▶ TEST 6: Resetting Counters on Successful Authentication');
  await clearFailedLogin(testIp1, testEmail1);

  // After clearing, a new request from IP1 + Email1 should succeed
  const clearedCtx = createMockContext(testIp1, testEmail1);
  await loginRateLimiter(clearedCtx.req, clearedCtx.res, clearedCtx.next);
  assert(clearedCtx.wasNextCalled(), 'Clearing login attempt allows immediate subsequent authentication');

  // ----------------------------------------------------
  // TEST 7: Password Change & Token Refresh Limiters
  // ----------------------------------------------------
  console.log('\n▶ TEST 7: Password Change & Refresh Limiters');
  const testUser = { id: 'usr-rate-limit-test', email: 'test@guruom.in' };
  
  // Refresh Limiter
  const refreshCtx = createMockContext('198.51.100.30');
  await refreshRateLimiter(refreshCtx.req, refreshCtx.res, refreshCtx.next);
  assert(refreshCtx.wasNextCalled(), 'Token refresh rate limiter allows normal consumption');
  assert(!!refreshCtx.res.headers['X-RateLimit-Limit'], 'Includes X-RateLimit-Limit header');

  // Password Change Limiter (consume up to max)
  let pwdChangePassed = true;
  for (let i = 0; i < ENV.RATE_LIMIT_PASSWORD_CHANGE_MAX; i++) {
    const ctx = createMockContext('198.51.100.40', undefined, testUser);
    await passwordChangeRateLimiter(ctx.req, ctx.res, ctx.next);
    if (!ctx.wasNextCalled()) {
      pwdChangePassed = false;
      break;
    }
  }
  assert(pwdChangePassed, `Password change limiter permits ${ENV.RATE_LIMIT_PASSWORD_CHANGE_MAX} requests`);

  // Exceeding password change
  const exceedPwdCtx = createMockContext('198.51.100.40', undefined, testUser);
  await passwordChangeRateLimiter(exceedPwdCtx.req, exceedPwdCtx.res, exceedPwdCtx.next);
  assert(exceedPwdCtx.res.statusCode === 429, 'Exceeding password change limit returns 429');

  // ----------------------------------------------------
  // TEST 8: Security Event Logging on Rate Limit Violation
  // ----------------------------------------------------
  console.log('\n▶ TEST 8: Rate Limit Violation Logs Security Audit Event');
  const auditEvents = await authService.getUserSecurityEvents(testUser.id);
  const rateLimitEvent = auditEvents.find(e => e.event_type === 'RATE_LIMIT_EXCEEDED');
  assert(!!rateLimitEvent, 'Rate limit violation is logged as a security audit event in security_events');

  console.log('\n======================================================');
  console.log(`📊 RATE LIMIT SUITE SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('======================================================');

  await closeRedis();

  if (failed > 0) {
    process.exit(1);
  }
}

runRateLimitTests().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
