import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { ENV } from '../config/env';

export interface JwtUserPayload {
  id: string;
  email: string;
  name: string;
  role: string;
  department?: string;
  orgId?: string;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresAt: Date;
}

/**
 * Generates short-lived Access Token (15 min) and rotating Refresh Token (7 days).
 */
export function generateTokens(user: JwtUserPayload): TokenPair {
  const tokenId = crypto.randomUUID();

  const accessToken = jwt.sign(
    {
      sub: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      department: user.department,
      orgId: user.orgId || '00000000-0000-0000-0000-000000000001'
    },
    ENV.JWT_ACCESS_SECRET,
    {
      expiresIn: ENV.ACCESS_TOKEN_EXPIRES_IN as any
    }
  );

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + ENV.REFRESH_TOKEN_EXPIRES_IN_DAYS);

  const refreshToken = jwt.sign(
    {
      sub: user.id,
      email: user.email,
      jti: tokenId
    },
    ENV.JWT_REFRESH_SECRET,
    {
      expiresIn: `${ENV.REFRESH_TOKEN_EXPIRES_IN_DAYS}d` as any
    }
  );

  return {
    accessToken,
    refreshToken,
    expiresAt
  };
}

/**
 * Verifies and decodes an Access Token.
 */
export function verifyAccessToken(token: string): JwtUserPayload {
  const decoded = jwt.verify(token, ENV.JWT_ACCESS_SECRET) as any;
  return {
    id: decoded.sub || decoded.id,
    email: decoded.email,
    name: decoded.name,
    role: decoded.role,
    department: decoded.department,
    orgId: decoded.orgId
  };
}

/**
 * Verifies and decodes a Refresh Token.
 */
export function verifyRefreshToken(token: string): { sub: string; email: string; jti: string } {
  return jwt.verify(token, ENV.JWT_REFRESH_SECRET) as { sub: string; email: string; jti: string };
}

/**
 * Computes a SHA-256 hash of the refresh token for secure database storage.
 */
export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}
