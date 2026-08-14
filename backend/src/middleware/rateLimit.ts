import { Request, Response, NextFunction } from 'express';

interface AttemptRecord {
  count: number;
  lockoutUntil: number | null;
  lastAttempt: number;
}

const loginAttemptsByIp = new Map<string, AttemptRecord>();
const loginAttemptsByEmail = new Map<string, AttemptRecord>();

const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 minutes
const ATTEMPT_WINDOW_MS = 10 * 60 * 1000; // 10 minutes

/**
 * Rate limiting middleware on the login route for brute-force protection.
 */
export function loginRateLimiter(req: Request, res: Response, next: NextFunction) {
  const ip = req.ip || req.socket.remoteAddress || 'unknown-ip';
  const email = (req.body?.email || '').trim().toLowerCase();
  const now = Date.now();

  // Check IP Lockout
  const ipRecord = loginAttemptsByIp.get(ip);
  if (ipRecord && ipRecord.lockoutUntil && now < ipRecord.lockoutUntil) {
    const remainingSeconds = Math.ceil((ipRecord.lockoutUntil - now) / 1000);
    return res.status(429).json({
      error: 'TooManyRequests',
      message: `Too many failed login attempts from this IP. Account locked for ${remainingSeconds} more seconds.`
    });
  }

  // Check Email Lockout
  if (email) {
    const emailRecord = loginAttemptsByEmail.get(email);
    if (emailRecord && emailRecord.lockoutUntil && now < emailRecord.lockoutUntil) {
      const remainingSeconds = Math.ceil((emailRecord.lockoutUntil - now) / 1000);
      return res.status(429).json({
        error: 'AccountLocked',
        message: `Account is temporarily locked due to excessive failed attempts. Try again in ${remainingSeconds} seconds.`
      });
    }
  }

  return next();
}

/**
 * Records a failed login attempt for the given IP and email.
 */
export function recordFailedLogin(ip: string, email: string) {
  const now = Date.now();

  // Record IP attempt
  const ipRecord = loginAttemptsByIp.get(ip) || { count: 0, lockoutUntil: null, lastAttempt: now };
  if (now - ipRecord.lastAttempt > ATTEMPT_WINDOW_MS) {
    ipRecord.count = 1;
  } else {
    ipRecord.count += 1;
  }
  ipRecord.lastAttempt = now;
  if (ipRecord.count >= MAX_FAILED_ATTEMPTS) {
    ipRecord.lockoutUntil = now + LOCKOUT_DURATION_MS;
  }
  loginAttemptsByIp.set(ip, ipRecord);

  // Record Email attempt
  if (email) {
    const cleanEmail = email.trim().toLowerCase();
    const emailRecord = loginAttemptsByEmail.get(cleanEmail) || { count: 0, lockoutUntil: null, lastAttempt: now };
    if (now - emailRecord.lastAttempt > ATTEMPT_WINDOW_MS) {
      emailRecord.count = 1;
    } else {
      emailRecord.count += 1;
    }
    emailRecord.lastAttempt = now;
    if (emailRecord.count >= MAX_FAILED_ATTEMPTS) {
      emailRecord.lockoutUntil = now + LOCKOUT_DURATION_MS;
    }
    loginAttemptsByEmail.set(cleanEmail, emailRecord);
  }
}

/**
 * Resets failed login counters on successful authentication.
 */
export function clearFailedLogin(ip: string, email: string) {
  loginAttemptsByIp.delete(ip);
  if (email) {
    loginAttemptsByEmail.delete(email.trim().toLowerCase());
  }
}
