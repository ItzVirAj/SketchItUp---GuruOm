import { authService } from '../src/modules/auth/auth.service';
import { RiskEngineService } from '../src/modules/auth/risk.service';
import { GeoLocationService } from '../src/utils/geolocation';
import { parseUserAgent } from '../src/utils/deviceParser';
import { verifyAccessToken } from '../src/utils/jwt';

async function runSecurityTests() {
  console.log('====================================================');
  console.log('🔒 EXECUTING OWNER OS SECURITY & SESSIONS TEST SUITE');
  console.log('====================================================\n');

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
  // TEST 1: Device Parser & Geolocation IP Extraction
  // ----------------------------------------------------
  console.log('▶ TEST 1: User-Agent Parser & Geolocation Isolation');
  const chromeDesktop = parseUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36');
  assert(chromeDesktop.browser === 'Chrome' && chromeDesktop.os === 'Windows' && chromeDesktop.deviceType === 'desktop', 'Parses Windows Desktop Chrome');

  const iphoneSafari = parseUserAgent('Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1');
  assert(iphoneSafari.deviceType === 'mobile' && iphoneSafari.browser === 'Safari' && iphoneSafari.os === 'iOS', 'Parses iPhone Safari Mobile');

  const maskedIp = GeoLocationService.maskIp('103.24.120.45');
  assert(maskedIp === '103.24.xxx.xxx', 'IP Address Privacy Masking conforms to GDPR/Data specs');

  // ----------------------------------------------------
  // TEST 2: User Login & Session Creation with Token Family
  // ----------------------------------------------------
  console.log('\n▶ TEST 2: Login Flow & Token Family Initialization');
  const testEmail = 'owner@guruom.in';
  const testPassword = '1234567890';
  const testIp = '103.24.120.45';
  const testUa = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124.0.0.0';

  const loginResult = await authService.login(testEmail, testPassword, testIp, testUa);
  assert(!!loginResult.accessToken && !!loginResult.refreshToken, 'Generates access and refresh token pair');

  const decodedAccess: any = verifyAccessToken(loginResult.accessToken);
  assert(decodedAccess.email === testEmail, 'Access token contains user email');

  const sessions = await authService.getActiveSessions(loginResult.user.id, loginResult.refreshToken);
  assert(sessions.length >= 1, 'Active session recorded for user');
  const currentSession = sessions.find(s => s.isCurrent);
  assert(!!currentSession && currentSession.isCurrent === true, 'Current session identified and flagged isCurrent=true');

  // ----------------------------------------------------
  // TEST 3: Refresh Token Rotation within Family
  // ----------------------------------------------------
  console.log('\n▶ TEST 3: Refresh Token Single-Use Rotation');
  const oldRefreshToken = loginResult.refreshToken;
  const refreshResult1 = await authService.refreshSession(oldRefreshToken, testIp, testUa);

  assert(!!refreshResult1.accessToken && !!refreshResult1.refreshToken, 'Rotates token and issues new token pair');
  assert(refreshResult1.refreshToken !== oldRefreshToken, 'New refresh token differs from old refresh token');

  const refreshResult2 = await authService.refreshSession(refreshResult1.refreshToken, testIp, testUa);
  assert(!!refreshResult2.accessToken, 'Successive rotation with latest token succeeds');

  // ----------------------------------------------------
  // TEST 4: Refresh Token Reuse Detection (Theft Attack Simulation)
  // ----------------------------------------------------
  console.log('\n▶ TEST 4: Refresh Token Reuse Detection (Family Revocation)');
  let reuseDetected = false;
  try {
    // Attempt to use the compromised/already-rotated oldRefreshToken
    await authService.refreshSession(oldRefreshToken, testIp, testUa);
  } catch (err: any) {
    reuseDetected = true;
  }
  assert(reuseDetected, 'Reusing an already-rotated token throws Unauthorized / Revocation error');

  // Verify that the whole family is now invalidated!
  let familyCompromised = false;
  try {
    await authService.refreshSession(refreshResult2.refreshToken, testIp, testUa);
  } catch (err: any) {
    familyCompromised = true;
  }
  assert(familyCompromised, 'Entire token family is revoked following reuse attack');

  // ----------------------------------------------------
  // TEST 5: Impossible Physical Travel & Risk Engine
  // ----------------------------------------------------
  console.log('\n▶ TEST 5: Impossible Travel & Anomaly Risk Engine');
  const user = await authService.login(testEmail, testPassword, '103.24.120.45', testUa); // Mumbai
  
  // Simulate login 5 minutes later from Frankfurt, Germany IP
  const frankfurtLogin = await authService.login(
    testEmail, 
    testPassword, 
    '185.220.101.5', // Germany
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15'
  );

  assert(frankfurtLogin.riskInfo.riskLevel === 'HIGH' || frankfurtLogin.riskInfo.riskLevel === 'CRITICAL', 'Impossible physical travel triggers HIGH or CRITICAL risk level');
  assert(frankfurtLogin.riskInfo.flaggedReasons.includes('IMPOSSIBLE_PHYSICAL_TRAVEL'), 'Flags IMPOSSIBLE_PHYSICAL_TRAVEL anomaly reason');

  // ----------------------------------------------------
  // TEST 6: Session Revocation & Revoke-Others
  // ----------------------------------------------------
  console.log('\n▶ TEST 6: Active Session Revocation API');
  // Log in from Device 1 (Desktop)
  const dev1 = await authService.login(testEmail, testPassword, '103.24.120.45', 'Mozilla/5.0 (Windows NT 10.0)');
  // Log in from Device 2 (iPhone)
  const dev2 = await authService.login(testEmail, testPassword, '103.24.120.46', 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4)');
  // Log in from Device 3 (MacBook)
  const dev3 = await authService.login(testEmail, testPassword, '103.24.120.47', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)');

  const initialActive = await authService.getActiveSessions(dev3.user.id, dev3.refreshToken);
  assert(initialActive.length >= 3, 'Multiple active sessions tracked concurrently');

  // Revoke all other sessions from Device 3
  const revokeResult = await authService.revokeOtherSessions(dev3.user.id, dev3.refreshToken);
  assert(revokeResult.revokedCount >= 2, 'Revoke-others successfully invalidates all other devices');

  const afterRevokeOthers = await authService.getActiveSessions(dev3.user.id, dev3.refreshToken);
  assert(afterRevokeOthers.length === 1 && afterRevokeOthers[0].isCurrent, 'Only current session remains active after revoke-others');

  // ----------------------------------------------------
  // TEST 7: Security Audit Events Querying
  // ----------------------------------------------------
  console.log('\n▶ TEST 7: Security Audit Trail & Event Retrieval');
  const events = await authService.getUserSecurityEvents(dev3.user.id);
  assert(events.length > 0, 'Security events stored and queryable for authenticated user');
  const hasReuseOrSuspicious = events.some(e => e.event_type === 'REFRESH_TOKEN_REUSE' || e.event_type === 'SUSPICIOUS_LOGIN');
  assert(hasReuseOrSuspicious, 'Security events capture anomalous logins and token reuse incidents');

  console.log('\n====================================================');
  console.log(`📊 SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('====================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runSecurityTests().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
