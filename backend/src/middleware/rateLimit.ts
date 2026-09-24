import { Request, Response, NextFunction } from 'express';
import { RateLimiterRedis, RateLimiterMemory, RateLimiterRes } from 'rate-limiter-flexible';
import { getRedisClient, isRedisConnected } from '../lib/redis';
import { ENV } from '../config/env';
import { GeoLocationService } from '../utils/geolocation';
import { authService } from '../modules/auth/auth.service';

/**
 * Creates a dual-layer RateLimiter (Redis primary with Memory insurance fallback).
 */
function createRateLimiter(keyPrefix: string, points: number, duration: number) {
  const redis = getRedisClient();

  const memoryLimiter = new RateLimiterMemory({
    keyPrefix: `mem_${keyPrefix}`,
    points,
    duration
  });

  const redisLimiter = new RateLimiterRedis({
    storeClient: redis,
    keyPrefix: `rl_${keyPrefix}`,
    points,
    duration,
    insuranceLimiter: memoryLimiter,
    rejectIfRedisNotReady: true
  });

  return { redisLimiter, memoryLimiter };
}

// 1. Login Limiters: Per (IP + Email) & Global Per IP
const loginIpEmailLimiters = createRateLimiter(
  'login_combo',
  ENV.RATE_LIMIT_LOGIN_MAX,
  ENV.RATE_LIMIT_LOGIN_WINDOW_SEC
);

const loginIpGlobalLimiters = createRateLimiter(
  'login_ip',
  ENV.RATE_LIMIT_LOGIN_IP_MAX,
  ENV.RATE_LIMIT_LOGIN_WINDOW_SEC
);

// 2. Token Refresh Limiter
const refreshLimiters = createRateLimiter(
  'refresh',
  ENV.RATE_LIMIT_REFRESH_MAX,
  ENV.RATE_LIMIT_REFRESH_WINDOW_SEC
);

// 3. Password Change Limiter
const passwordChangeLimiters = createRateLimiter(
  'pwd_change',
  ENV.RATE_LIMIT_PASSWORD_CHANGE_MAX,
  ENV.RATE_LIMIT_PASSWORD_CHANGE_WINDOW_SEC
);

// 4. Session Revocation Limiter
const sessionRevokeLimiters = createRateLimiter(
  'session_revoke',
  ENV.RATE_LIMIT_SESSION_REVOKE_MAX,
  ENV.RATE_LIMIT_SESSION_REVOKE_WINDOW_SEC
);

/**
 * Helper to log security alert when a rate limit threshold is crossed.
 */
async function logRateLimitViolation(
  req: Request,
  action: string,
  key: string,
  resInfo?: RateLimiterRes
) {
  const ip = GeoLocationService.extractClientIp(req);
  const userAgent = req.headers['user-agent'];
  const userId = req.user?.id || '00000000-0000-0000-0000-000000000000';

  try {
    if (authService && typeof authService.logSecurityEvent === 'function') {
      await authService.logSecurityEvent({
        user_id: userId,
        event_type: 'RATE_LIMIT_EXCEEDED',
        severity: 'HIGH',
        ip_address: ip,
        user_agent: userAgent,
        risk_score: 50,
        risk_level: 'HIGH',
        flagged_reasons: ['RATE_LIMIT_EXCEEDED', `BURST_${action.toUpperCase()}`],
        metadata: {
          action,
          key: key.replace(/:.*@/, ':***@'), // sanitize email in logs
          consumedPoints: resInfo?.consumedPoints,
          msBeforeNext: resInfo?.msBeforeNext
        }
      });
    }
  } catch (err) {
    // Non-blocking logging failure
  }
}

/**
 * Standard 429 response generator with generic message and headers.
 */
function sendTooManyRequests(res: Response, resInfo?: RateLimiterRes) {
  const retrySec = resInfo ? Math.ceil(resInfo.msBeforeNext / 1000) : 60;
  
  res.set({
    'Retry-After': String(retrySec),
    'X-RateLimit-Remaining': '0',
    'X-RateLimit-Reset': String(Math.ceil((Date.now() + (resInfo?.msBeforeNext || 60000)) / 1000))
  });

  return res.status(429).json({
    error: 'TooManyRequests',
    message: 'Too many requests. Please try again later.',
    retryAfter: retrySec
  });
}

/**
 * Middleware: Rate limit on login route (IP + Email & Global IP).
 */
export async function loginRateLimiter(req: Request, res: Response, next: NextFunction) {
  const ip = GeoLocationService.extractClientIp(req);
  const email = (req.body?.email || '').trim().toLowerCase();

  // Fail-Closed check if strictly configured and Redis is offline
  if (ENV.REDIS_FAIL_CLOSED && !isRedisConnected()) {
    return res.status(503).json({
      error: 'ServiceUnavailable',
      message: 'Rate limiting validation service is temporarily unavailable.'
    });
  }

  try {
    // Check global IP limit
    const ipKey = `ip_${ip}`;
    await loginIpGlobalLimiters.redisLimiter.consume(ipKey);

    // Check specific IP + Email combo limit
    if (email) {
      const comboKey = `${ip}_${email}`;
      await loginIpEmailLimiters.redisLimiter.consume(comboKey);
    }

    return next();
  } catch (err: any) {
    if (err instanceof RateLimiterRes) {
      await logRateLimitViolation(req, 'LOGIN_ATTEMPT', `${ip}:${email}`, err);
      return sendTooManyRequests(res, err);
    }

    // If fail-closed is set and error occurred
    if (ENV.REDIS_FAIL_CLOSED) {
      return res.status(503).json({
        error: 'ServiceUnavailable',
        message: 'Rate limiting validation service is temporarily unavailable.'
      });
    }

    // Default fallback: allow request if unexpected non-rate-limit exception
    return next();
  }
}

/**
 * Middleware: Rate limit on token refresh route.
 */
export async function refreshRateLimiter(req: Request, res: Response, next: NextFunction) {
  const ip = GeoLocationService.extractClientIp(req);

  try {
    const resInfo = await refreshLimiters.redisLimiter.consume(ip);
    res.set({
      'X-RateLimit-Limit': String(ENV.RATE_LIMIT_REFRESH_MAX),
      'X-RateLimit-Remaining': String(resInfo.remainingPoints)
    });
    return next();
  } catch (err: any) {
    if (err instanceof RateLimiterRes) {
      await logRateLimitViolation(req, 'TOKEN_REFRESH', ip, err);
      return sendTooManyRequests(res, err);
    }
    return next();
  }
}

/**
 * Middleware: Rate limit on password change route.
 */
export async function passwordChangeRateLimiter(req: Request, res: Response, next: NextFunction) {
  const ip = GeoLocationService.extractClientIp(req);
  const userId = req.user?.id || ip;

  try {
    const resInfo = await passwordChangeLimiters.redisLimiter.consume(userId);
    res.set({
      'X-RateLimit-Limit': String(ENV.RATE_LIMIT_PASSWORD_CHANGE_MAX),
      'X-RateLimit-Remaining': String(resInfo.remainingPoints)
    });
    return next();
  } catch (err: any) {
    if (err instanceof RateLimiterRes) {
      await logRateLimitViolation(req, 'PASSWORD_CHANGE', userId, err);
      return sendTooManyRequests(res, err);
    }
    return next();
  }
}

/**
 * Middleware: Rate limit on session revocation endpoints.
 */
export async function sessionRevokeRateLimiter(req: Request, res: Response, next: NextFunction) {
  const ip = GeoLocationService.extractClientIp(req);
  const userId = req.user?.id || ip;

  try {
    const resInfo = await sessionRevokeLimiters.redisLimiter.consume(userId);
    res.set({
      'X-RateLimit-Limit': String(ENV.RATE_LIMIT_SESSION_REVOKE_MAX),
      'X-RateLimit-Remaining': String(resInfo.remainingPoints)
    });
    return next();
  } catch (err: any) {
    if (err instanceof RateLimiterRes) {
      await logRateLimitViolation(req, 'SESSION_REVOKE', userId, err);
      return sendTooManyRequests(res, err);
    }
    return next();
  }
}

/**
 * Backward compatibility: Records a failed login attempt.
 */
export async function recordFailedLogin(ip: string, email: string) {
  try {
    if (email) {
      const comboKey = `${ip}_${email.trim().toLowerCase()}`;
      await loginIpEmailLimiters.redisLimiter.penalty(comboKey, 1);
    }
  } catch (_) {}
}

/**
 * Backward compatibility: Clears failed login counter on success.
 */
export async function clearFailedLogin(ip: string, email: string) {
  try {
    if (email) {
      const comboKey = `${ip}_${email.trim().toLowerCase()}`;
      await loginIpEmailLimiters.redisLimiter.delete(comboKey);
    }
  } catch (_) {}
}

// Export raw limiter objects for granular unit testing
export const rateLimiters = {
  loginIpEmailLimiters,
  loginIpGlobalLimiters,
  refreshLimiters,
  passwordChangeLimiters,
  sessionRevokeLimiters
};
