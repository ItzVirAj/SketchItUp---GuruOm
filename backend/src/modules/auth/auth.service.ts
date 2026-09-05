import crypto from 'crypto';
import { getDbClient } from '../../config/database';
import { hashPassword, verifyPassword } from '../../utils/password';
import { generateTokens, hashToken, verifyRefreshToken, JwtUserPayload } from '../../utils/jwt';
import { parseUserAgent, ParsedDeviceInfo } from '../../utils/deviceParser';
import { GeoLocationService, GeoLocationResult } from '../../utils/geolocation';
import { RiskService, RiskEvaluationResult, PriorSessionData } from './risk.service';
import { notificationsService } from '../notifications/notifications.service';
import { logAudit } from '../../services/auditLog';
import { permissionService } from '../../services/permission.service';
import { normalizeRole } from '../../../../src/utils/rbacMatrix';
import { auditService } from '../audit/audit.service';

export interface UserRecord {
  id: string;
  email: string;
  password_hash: string;
  full_name: string;
  role: string;
  department?: string;
  phone?: string;
  status: string;
  org_id?: string;
  is_temporary_password?: boolean;
  failed_login_attempts?: number;
  lockout_until?: string;
  last_login_at?: string;
  created_at?: string;
}

export interface SessionRecord {
  id: string;
  user_id: string;
  token_family_id: string;
  refresh_token_hash: string;
  device_type: 'desktop' | 'mobile' | 'tablet' | 'unknown';
  device_name: string;
  browser: string;
  browser_version: string;
  os: string;
  os_version: string;
  ip_address: string;
  country: string;
  region: string;
  city: string;
  latitude: number | null;
  longitude: number | null;
  risk_score: number;
  risk_level: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  last_used_at: string;
  expires_at: string;
  revoked_at?: string | null;
  revoked_reason?: string | null;
  created_at: string;
}

export interface SecurityEventRecord {
  id: string;
  user_id: string;
  session_id?: string | null;
  event_type: string;
  severity: 'INFO' | 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  ip_address?: string | null;
  user_agent?: string | null;
  device_name?: string | null;
  device_type?: string | null;
  browser?: string | null;
  os?: string | null;
  country?: string | null;
  region?: string | null;
  city?: string | null;
  risk_score: number;
  risk_level: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  flagged_reasons: string[];
  metadata: any;
  created_at: string;
}

export interface ActiveSessionItem {
  id: string;
  userId: string;
  device: string;
  deviceType: 'desktop' | 'mobile' | 'tablet' | 'unknown';
  browser: string;
  os: string;
  location: string;
  ip: string;
  createdAt: string;
  lastActiveAt: string;
  isCurrent: boolean;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  riskScore: number;
  flaggedReasons?: string[];
}

export interface PasswordResetToken {
  token_hash: string;
  user_id: string;
  email: string;
  expires_at: number;
  used_at?: string | null;
  created_at: string;
}

const IN_MEMORY_RESET_TOKENS: PasswordResetToken[] = [];

// In-Memory Seed Directory for instant offline support and zero-latency access
const SEED_USERS: UserRecord[] = [];

// Resilient memory cache for sessions and security events
const IN_MEMORY_SESSIONS: SessionRecord[] = [];
const IN_MEMORY_SECURITY_EVENTS: SecurityEventRecord[] = [];

export class AuthService {
  private db = getDbClient();

  private async buildClientUser(user: UserRecord) {
    const effectivePermissions = await permissionService.getEffectiveUserPermissions(user.id, user.role);

    return {
      id: user.id,
      name: user.full_name,
      email: user.email,
      role: user.role,
      department: user.department,
      phone: user.phone,
      status: user.status,
      isTemporaryPassword: user.is_temporary_password || false,
      effectivePermissions: [...effectivePermissions],
      lastLogin: user.last_login_at || new Date().toLocaleString('en-IN', { hour12: true })
    };
  }

  /**
   * Finds a user record in Supabase DB with fallback to local seed data.
   */
  private async findUserByEmail(email: string): Promise<UserRecord | null> {
    const cleanEmail = email.trim().toLowerCase();

    // 1. Try users table in Supabase DB (primary authoritative user table with password_hash)
    try {
      const { data, error } = await this.db
        .from('users')
        .select('*')
        .eq('email', cleanEmail)
        .maybeSingle();

      if (data && !error) {
        return data as UserRecord;
      }
    } catch (err) {
      console.warn('Database user lookup fallback:', err);
    }

    // 2. Try profiles table in Supabase DB (legacy fallback)
    try {
      const { data, error } = await this.db
        .from('profiles')
        .select('*')
        .eq('email', cleanEmail)
        .maybeSingle();

      if (data && !error) {
        return {
          id: data.id,
          email: data.email,
          password_hash: data.password_hash || '',
          full_name: data.full_name,
          role: data.role,
          department: data.department,
          phone: data.phone,
          status: data.status,
          is_temporary_password: false
        } as UserRecord;
      }
    } catch (err) {
      console.warn('Database profiles lookup fallback:', err);
    }

    return null;
  }

  /**
   * Finds a user record by ID.
   */
  private async findUserById(id: string): Promise<UserRecord | null> {
    // 1. Try users table (primary authoritative user table)
    try {
      const { data, error } = await this.db
        .from('users')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (data && !error) {
        return data as UserRecord;
      }
    } catch (err) {
      console.warn('Database user findUserById fallback:', err);
    }

    // 2. Try profiles table
    try {
      const { data, error } = await this.db
        .from('profiles')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (data && !error) {
        return {
          id: data.id,
          email: data.email,
          password_hash: data.password_hash || '',
          full_name: data.full_name,
          role: data.role,
          department: data.department,
          phone: data.phone,
          status: data.status,
          is_temporary_password: false
        } as UserRecord;
      }
    } catch (err) {
      console.warn('Database profiles findUserById fallback:', err);
    }

    return null;
  }

  async logSecurityEvent(event: Omit<SecurityEventRecord, 'id' | 'created_at'>): Promise<SecurityEventRecord> {
    const newEvent: SecurityEventRecord = {
      id: crypto.randomUUID(),
      ...event,
      created_at: new Date().toISOString()
    };

    IN_MEMORY_SECURITY_EVENTS.unshift(newEvent);
    if (IN_MEMORY_SECURITY_EVENTS.length > 500) {
      IN_MEMORY_SECURITY_EVENTS.pop();
    }

    try {
      await this.db.from('security_events').insert({
        id: newEvent.id,
        user_id: newEvent.user_id,
        session_id: newEvent.session_id,
        event_type: newEvent.event_type,
        severity: newEvent.severity,
        ip_address: newEvent.ip_address,
        user_agent: newEvent.user_agent,
        device_name: newEvent.device_name,
        device_type: newEvent.device_type,
        browser: newEvent.browser,
        os: newEvent.os,
        country: newEvent.country,
        region: newEvent.region,
        city: newEvent.city,
        risk_score: newEvent.risk_score,
        risk_level: newEvent.risk_level,
        flagged_reasons: newEvent.flagged_reasons,
        metadata: newEvent.metadata,
        created_at: newEvent.created_at
      });
    } catch (e) {
      console.warn('Database logSecurityEvent fallback:', e);
    }

    // Broadcast critical or high security events
    if (newEvent.severity === 'HIGH' || newEvent.severity === 'CRITICAL') {
      notificationsService.broadcastEvent('security_alert', {
        id: newEvent.id,
        userId: newEvent.user_id,
        type: newEvent.event_type,
        severity: newEvent.severity,
        deviceName: newEvent.device_name,
        location: `${newEvent.city || 'Unknown'}, ${newEvent.country || ''}`,
        reasons: newEvent.flagged_reasons,
        createdAt: newEvent.created_at
      });
    }

    return newEvent;
  }

  /**
   * Retrieves prior sessions for a user to evaluate risk heuristics.
   */
  private async getPriorSessionsForUser(userId: string): Promise<PriorSessionData[]> {
    try {
      const { data, error } = await this.db
        .from('sessions')
        .select('id, ip_address, device_name, browser, os, country, city, latitude, longitude, created_at, last_used_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(20);

      if (data && !error && data.length > 0) {
        return data as PriorSessionData[];
      }
    } catch (err) {
      console.warn('Database getPriorSessions fallback:', err);
    }

    return IN_MEMORY_SESSIONS
      .filter(s => s.user_id === userId)
      .map(s => ({
        id: s.id,
        ip_address: s.ip_address,
        device_name: s.device_name,
        browser: s.browser,
        os: s.os,
        country: s.country,
        city: s.city,
        latitude: s.latitude,
        longitude: s.longitude,
        created_at: s.created_at,
        last_used_at: s.last_used_at
      }));
  }

  /**
   * Authenticates user, evaluates risk, generates tokens with family ID, and creates a session record.
   */
  async login(email: string, password?: string, ipAddress?: string, userAgent?: string, reqHeaders?: Record<string, any>) {
    if (!password) {
      throw new Error('Password is required.');
    }
    const cleanEmail = email.trim().toLowerCase();
    const user = await this.findUserByEmail(cleanEmail);
    const clientIp = ipAddress || '127.0.0.1';
    const parsedDevice = parseUserAgent(userAgent);
    const geo = GeoLocationService.lookupLocation(clientIp, reqHeaders);

    if (!user) {
      // Record failed login event without revealing account existence
      await this.logSecurityEvent({
        user_id: '00000000-0000-0000-0000-000000000000',
        event_type: 'LOGIN_FAILED',
        severity: 'LOW',
        ip_address: clientIp,
        user_agent: userAgent,
        device_name: parsedDevice.deviceName,
        device_type: parsedDevice.deviceType,
        browser: parsedDevice.browser,
        os: parsedDevice.os,
        country: geo.country,
        region: geo.region,
        city: geo.city,
        risk_score: 10,
        risk_level: 'LOW',
        flagged_reasons: ['INVALID_CREDENTIALS'],
        metadata: { attemptedEmail: cleanEmail }
      });
      throw new Error('Invalid email or password credentials.');
    }

    if (user.status === 'REVOKED' || user.status === 'SUSPENDED') {
      await this.logSecurityEvent({
        user_id: user.id,
        event_type: 'LOGIN_FAILED',
        severity: 'MEDIUM',
        ip_address: clientIp,
        user_agent: userAgent,
        device_name: parsedDevice.deviceName,
        device_type: parsedDevice.deviceType,
        browser: parsedDevice.browser,
        os: parsedDevice.os,
        country: geo.country,
        region: geo.region,
        city: geo.city,
        risk_score: 30,
        risk_level: 'MEDIUM',
        flagged_reasons: ['ACCOUNT_SUSPENDED'],
        metadata: { status: user.status }
      });
      throw new Error(`Account "${user.full_name}" is revoked or suspended. Contact Super Admin.`);
    }

    const isValidPassword = await verifyPassword(password, user.password_hash);
    if (!isValidPassword) {
      const failedCount = (user.failed_login_attempts || 0) + 1;
      try {
        await this.db.from('users').update({ failed_login_attempts: failedCount }).eq('id', user.id);
      } catch (_) {}

      await this.logSecurityEvent({
        user_id: user.id,
        event_type: 'LOGIN_FAILED',
        severity: failedCount >= 3 ? 'HIGH' : 'LOW',
        ip_address: clientIp,
        user_agent: userAgent,
        device_name: parsedDevice.deviceName,
        device_type: parsedDevice.deviceType,
        browser: parsedDevice.browser,
        os: parsedDevice.os,
        country: geo.country,
        region: geo.region,
        city: geo.city,
        risk_score: failedCount >= 3 ? 40 : 15,
        risk_level: failedCount >= 3 ? 'HIGH' : 'LOW',
        flagged_reasons: ['INVALID_PASSWORD'],
        metadata: { failedAttempts: failedCount }
      });
      throw new Error('Invalid email or password credentials.');
    }

    // 1. Evaluate Suspicious Login Risk
    const priorSessions = await this.getPriorSessionsForUser(user.id);
    const riskResult = RiskService.evaluateLoginRisk(
      parsedDevice,
      geo,
      clientIp,
      priorSessions,
      user.failed_login_attempts || 0
    );

    // 2. Generate Tokens with new Token Family
    const jwtPayload: JwtUserPayload = {
      id: user.id,
      email: user.email,
      name: user.full_name,
      role: user.role,
      department: user.department,
      orgId: user.org_id
    };

    const tokenFamilyId = crypto.randomUUID();
    const { accessToken, refreshToken, expiresAt } = generateTokens(jwtPayload, tokenFamilyId);
    const tokenHash = hashToken(refreshToken);
    const sessionId = crypto.randomUUID();

    const newSessionRecord: SessionRecord = {
      id: sessionId,
      user_id: user.id,
      token_family_id: tokenFamilyId,
      refresh_token_hash: tokenHash,
      device_type: parsedDevice.deviceType,
      device_name: parsedDevice.deviceName,
      browser: parsedDevice.browser,
      browser_version: parsedDevice.browserVersion,
      os: parsedDevice.os,
      os_version: parsedDevice.osVersion,
      ip_address: clientIp,
      country: geo.country,
      region: geo.region,
      city: geo.city,
      latitude: geo.latitude,
      longitude: geo.longitude,
      risk_score: riskResult.riskScore,
      risk_level: riskResult.riskLevel,
      last_used_at: new Date().toISOString(),
      expires_at: expiresAt.toISOString(),
      revoked_at: null,
      created_at: new Date().toISOString()
    };

    // Store in memory
    IN_MEMORY_SESSIONS.unshift(newSessionRecord);

    // Store in Supabase DB
    try {
      await this.db.from('sessions').insert({
        id: newSessionRecord.id,
        user_id: newSessionRecord.user_id,
        token_family_id: newSessionRecord.token_family_id,
        refresh_token_hash: newSessionRecord.refresh_token_hash,
        device_type: newSessionRecord.device_type,
        device_name: newSessionRecord.device_name,
        browser: newSessionRecord.browser,
        browser_version: newSessionRecord.browser_version,
        os: newSessionRecord.os,
        os_version: newSessionRecord.os_version,
        ip_address: newSessionRecord.ip_address,
        country: newSessionRecord.country,
        region: newSessionRecord.region,
        city: newSessionRecord.city,
        latitude: newSessionRecord.latitude,
        longitude: newSessionRecord.longitude,
        risk_score: newSessionRecord.risk_score,
        risk_level: newSessionRecord.risk_level,
        last_used_at: newSessionRecord.last_used_at,
        expires_at: newSessionRecord.expires_at,
        created_at: newSessionRecord.created_at
      });

      await this.db.from('users').update({
        last_login_at: new Date().toISOString(),
        failed_login_attempts: 0,
        lockout_until: null
      }).eq('id', user.id);
    } catch (e) {
      console.warn('Database session record fallback:', e);
    }

    // 3. Log Login Security Event
    const isSuspicious = riskResult.riskLevel === 'HIGH' || riskResult.riskLevel === 'CRITICAL';
    await this.logSecurityEvent({
      user_id: user.id,
      session_id: sessionId,
      event_type: isSuspicious ? 'SUSPICIOUS_LOGIN' : 'LOGIN_SUCCESS',
      severity: isSuspicious ? (riskResult.riskLevel === 'CRITICAL' ? 'CRITICAL' : 'HIGH') : (riskResult.riskLevel === 'MEDIUM' ? 'MEDIUM' : 'INFO'),
      ip_address: clientIp,
      user_agent: userAgent,
      device_name: parsedDevice.deviceName,
      device_type: parsedDevice.deviceType,
      browser: parsedDevice.browser,
      os: parsedDevice.os,
      country: geo.country,
      region: geo.region,
      city: geo.city,
      risk_score: riskResult.riskScore,
      risk_level: riskResult.riskLevel,
      flagged_reasons: riskResult.flaggedReasons,
      metadata: {
        isNewDevice: riskResult.isNewDevice,
        isNewCountry: riskResult.isNewCountry,
        isImpossibleTravel: riskResult.isImpossibleTravel,
        travelDetails: riskResult.travelDetails
      }
    });

    return {
      accessToken,
      refreshToken,
      expiresAt,
      sessionId,
      riskInfo: {
        score: riskResult.riskScore,
        riskScore: riskResult.riskScore,
        level: riskResult.riskLevel,
        riskLevel: riskResult.riskLevel,
        flaggedReasons: riskResult.flaggedReasons,
        isSuspicious
      },
      user: {
        id: user.id,
        name: user.full_name,
        email: user.email,
        role: user.role,
        department: user.department,
        phone: user.phone,
        status: user.status,
        lastLogin: new Date().toLocaleString('en-IN', { hour12: true })
      }
    };
  }

  /**
   * Validates rotating refresh token, detects reuse, and issues a new token pair in the same token family.
   */
  async refreshSession(refreshToken: string, ipAddress?: string, userAgent?: string, reqHeaders?: Record<string, any>) {
    if (!refreshToken) {
      throw new Error('Refresh token is required.');
    }

    let decoded: { sub: string; email: string; jti: string; fid?: string };
    try {
      decoded = verifyRefreshToken(refreshToken);
    } catch (e) {
      throw new Error('Invalid or expired refresh token.');
    }

    const oldTokenHash = hashToken(refreshToken);
    const clientIp = ipAddress || '127.0.0.1';
    const parsedDevice = parseUserAgent(userAgent);
    const geo = GeoLocationService.lookupLocation(clientIp, reqHeaders);

    // 1. Locate session by token hash
    let sessionData: SessionRecord | null = null;

    try {
      const { data, error } = await this.db
        .from('sessions')
        .select('*')
        .eq('refresh_token_hash', oldTokenHash)
        .maybeSingle();

      if (data && !error) {
        sessionData = data as SessionRecord;
      }
    } catch (err) {
      console.warn('Database session query fallback:', err);
    }

    if (!sessionData) {
      sessionData = IN_MEMORY_SESSIONS.find(s => s.refresh_token_hash === oldTokenHash) || null;
    }

    // 2. Refresh Token Reuse Detection
    // If a session exists with this token hash AND it has ALREADY been revoked:
    // Compromise detected -> Immediately invalidate entire token family!
    if (sessionData && sessionData.revoked_at != null) {
      const compromisedFamilyId = sessionData.token_family_id || decoded.fid;

      if (compromisedFamilyId) {
        // Revoke all sessions in the family in DB
        try {
          await this.db
            .from('sessions')
            .update({
              revoked_at: new Date().toISOString(),
              revoked_reason: 'TOKEN_REUSE_DETECTED'
            })
            .eq('token_family_id', compromisedFamilyId);
        } catch (e) {
          console.warn('Database token family revocation fallback:', e);
        }

        // Revoke all in memory
        IN_MEMORY_SESSIONS.forEach(s => {
          if (s.token_family_id === compromisedFamilyId) {
            s.revoked_at = new Date().toISOString();
            s.revoked_reason = 'TOKEN_REUSE_DETECTED';
          }
        });
      }

      // Log CRITICAL security alert
      await this.logSecurityEvent({
        user_id: sessionData.user_id || decoded.sub,
        session_id: sessionData.id,
        event_type: 'REFRESH_TOKEN_REUSE',
        severity: 'CRITICAL',
        ip_address: clientIp,
        user_agent: userAgent,
        device_name: parsedDevice.deviceName,
        device_type: parsedDevice.deviceType,
        browser: parsedDevice.browser,
        os: parsedDevice.os,
        country: geo.country,
        region: geo.region,
        city: geo.city,
        risk_score: 100,
        risk_level: 'CRITICAL',
        flagged_reasons: ['TOKEN_REUSE_COMPROMISE_DETECTED'],
        metadata: {
          compromisedFamilyId,
          originalRevokedReason: sessionData.revoked_reason,
          reusedAt: new Date().toISOString()
        }
      });

      throw new Error('Security Alert: Refresh token reuse detected. All sessions in this family have been terminated. Please log in again.');
    }

    // 3. If session not found at all, reject
    if (!sessionData) {
      throw new Error('Session expired or invalidated. Please log in again.');
    }

    // 4. Check if session has expired
    if (new Date(sessionData.expires_at).getTime() < Date.now()) {
      throw new Error('Session has expired. Please log in again.');
    }

    // 5. Rotate Token: Revoke the old token
    const tokenFamilyId = sessionData.token_family_id || decoded.fid || crypto.randomUUID();
    const nowIso = new Date().toISOString();

    sessionData.revoked_at = nowIso;
    sessionData.revoked_reason = 'ROTATED';
    sessionData.last_used_at = nowIso;

    try {
      await this.db.from('sessions').update({
        revoked_at: nowIso,
        revoked_reason: 'ROTATED',
        last_used_at: nowIso
      }).eq('id', sessionData.id);
    } catch (e) {
      console.warn('Database update session rotation fallback:', e);
    }

    // 6. Verify User is still active
    const user = await this.findUserById(decoded.sub);
    if (!user || user.status === 'REVOKED' || user.status === 'SUSPENDED') {
      throw new Error('User account no longer active or revoked.');
    }

    // 7. Issue new token pair in the SAME token family
    const jwtPayload: JwtUserPayload = {
      id: user.id,
      email: user.email,
      name: user.full_name,
      role: user.role,
      department: user.department,
      orgId: user.org_id
    };

    const { accessToken, refreshToken: newRefreshToken, expiresAt } = generateTokens(jwtPayload, tokenFamilyId);
    const newTokenHash = hashToken(newRefreshToken);
    const newSessionId = crypto.randomUUID();

    const rotatedSessionRecord: SessionRecord = {
      id: newSessionId,
      user_id: user.id,
      token_family_id: tokenFamilyId,
      refresh_token_hash: newTokenHash,
      device_type: parsedDevice.deviceType || sessionData.device_type,
      device_name: parsedDevice.deviceName || sessionData.device_name,
      browser: parsedDevice.browser || sessionData.browser,
      browser_version: parsedDevice.browserVersion || sessionData.browser_version,
      os: parsedDevice.os || sessionData.os,
      os_version: parsedDevice.osVersion || sessionData.os_version,
      ip_address: clientIp || sessionData.ip_address,
      country: geo.country || sessionData.country,
      region: geo.region || sessionData.region,
      city: geo.city || sessionData.city,
      latitude: geo.latitude ?? sessionData.latitude,
      longitude: geo.longitude ?? sessionData.longitude,
      risk_score: sessionData.risk_score,
      risk_level: sessionData.risk_level,
      last_used_at: nowIso,
      expires_at: expiresAt.toISOString(),
      revoked_at: null,
      created_at: nowIso
    };

    IN_MEMORY_SESSIONS.unshift(rotatedSessionRecord);

    try {
      await this.db.from('sessions').insert({
        id: rotatedSessionRecord.id,
        user_id: rotatedSessionRecord.user_id,
        token_family_id: rotatedSessionRecord.token_family_id,
        refresh_token_hash: rotatedSessionRecord.refresh_token_hash,
        device_type: rotatedSessionRecord.device_type,
        device_name: rotatedSessionRecord.device_name,
        browser: rotatedSessionRecord.browser,
        browser_version: rotatedSessionRecord.browser_version,
        os: rotatedSessionRecord.os,
        os_version: rotatedSessionRecord.os_version,
        ip_address: rotatedSessionRecord.ip_address,
        country: rotatedSessionRecord.country,
        region: rotatedSessionRecord.region,
        city: rotatedSessionRecord.city,
        latitude: rotatedSessionRecord.latitude,
        longitude: rotatedSessionRecord.longitude,
        risk_score: rotatedSessionRecord.risk_score,
        risk_level: rotatedSessionRecord.risk_level,
        last_used_at: rotatedSessionRecord.last_used_at,
        expires_at: rotatedSessionRecord.expires_at,
        created_at: rotatedSessionRecord.created_at
      });
    } catch (e) {
      console.warn('Database insert rotated session fallback:', e);
    }

    return {
      accessToken,
      refreshToken: newRefreshToken,
      expiresAt,
      sessionId: newSessionId,
      user: {
        id: user.id,
        name: user.full_name,
        email: user.email,
        role: user.role,
        department: user.department,
        phone: user.phone,
        status: user.status,
        lastLogin: user.last_login_at || new Date().toLocaleString('en-IN', { hour12: true })
      }
    };
  }

  /**
   * Logs out a session by revoking the specific refresh token hash.
   */
  async logout(refreshToken?: string) {
    if (!refreshToken) return;
    const tokenHash = hashToken(refreshToken);
    const nowIso = new Date().toISOString();

    const memSession = IN_MEMORY_SESSIONS.find(s => s.refresh_token_hash === tokenHash);
    if (memSession) {
      memSession.revoked_at = nowIso;
      memSession.revoked_reason = 'USER_LOGOUT';

      await this.logSecurityEvent({
        user_id: memSession.user_id,
        session_id: memSession.id,
        event_type: 'LOGOUT',
        severity: 'INFO',
        device_name: memSession.device_name,
        ip_address: memSession.ip_address,
        country: memSession.country,
        city: memSession.city,
        risk_score: 0,
        risk_level: 'LOW',
        flagged_reasons: [],
        metadata: { loggedOutAt: nowIso }
      });
    }

    try {
      await this.db.from('sessions').update({
        revoked_at: nowIso,
        revoked_reason: 'USER_LOGOUT'
      }).eq('refresh_token_hash', tokenHash);
    } catch (e) {
      console.warn('Database logout session update fallback:', e);
    }
  }

  /**
   * Retrieves all currently active sessions for an authenticated user.
   */
  async getActiveSessions(userId: string, currentRefreshToken?: string): Promise<ActiveSessionItem[]> {
    const currentTokenHash = currentRefreshToken ? hashToken(currentRefreshToken) : null;
    let sessions: SessionRecord[] = [];

    try {
      const { data, error } = await this.db
        .from('sessions')
        .select('*')
        .eq('user_id', userId)
        .is('revoked_at', null)
        .gt('expires_at', new Date().toISOString())
        .order('last_used_at', { ascending: false });

      if (data && !error) {
        sessions = data as SessionRecord[];
      }
    } catch (err) {
      console.warn('Database getActiveSessions fallback:', err);
    }

    if (sessions.length === 0) {
      const now = Date.now();
      sessions = IN_MEMORY_SESSIONS.filter(
        s => s.user_id === userId && s.revoked_at == null && new Date(s.expires_at).getTime() > now
      );
    }

    // Deduplicate by token_family_id so that rapid rotations show 1 card per device family
    const familyMap = new Map<string, SessionRecord>();
    for (const s of sessions) {
      const key = s.token_family_id || s.id;
      if (!familyMap.has(key)) {
        familyMap.set(key, s);
      }
    }

    const uniqueSessions = Array.from(familyMap.values());

    return uniqueSessions.map(s => {
      const isCurrent = Boolean(
        currentTokenHash &&
        (s.refresh_token_hash === currentTokenHash ||
         IN_MEMORY_SESSIONS.some(m => m.token_family_id === s.token_family_id && m.refresh_token_hash === currentTokenHash))
      );

      return {
        id: s.id,
        userId: s.user_id,
        device: s.device_name || 'Chrome — Windows',
        deviceType: s.device_type || 'desktop',
        browser: s.browser || 'Chrome',
        os: s.os || 'Windows',
        location: `${s.city || 'Mumbai'}, ${s.country || 'India'}`,
        ip: GeoLocationService.maskIp(s.ip_address),
        createdAt: s.created_at,
        lastActiveAt: s.last_used_at || s.created_at,
        isCurrent,
        riskLevel: s.risk_level || 'LOW',
        riskScore: s.risk_score || 0
      };
    });
  }

  /**
   * Revokes an individual session belonging to the authenticated user.
   */
  async revokeSession(sessionId: string, userId: string): Promise<{ success: boolean; message: string }> {
    const nowIso = new Date().toISOString();

    // Verify ownership and find session
    let targetSession: SessionRecord | null = null;
    try {
      const { data } = await this.db
        .from('sessions')
        .select('*')
        .eq('id', sessionId)
        .eq('user_id', userId)
        .maybeSingle();

      if (data) targetSession = data as SessionRecord;
    } catch (_) {}

    if (!targetSession) {
      targetSession = IN_MEMORY_SESSIONS.find(s => s.id === sessionId && s.user_id === userId) || null;
    }

    if (!targetSession) {
      throw new Error('Session not found or not authorized to revoke.');
    }

    // Revoke the session and its entire family
    const familyId = targetSession.token_family_id;

    try {
      if (familyId) {
        await this.db.from('sessions').update({
          revoked_at: nowIso,
          revoked_reason: 'USER_REVOKED'
        }).eq('token_family_id', familyId);
      } else {
        await this.db.from('sessions').update({
          revoked_at: nowIso,
          revoked_reason: 'USER_REVOKED'
        }).eq('id', sessionId);
      }
    } catch (e) {
      console.warn('Database revokeSession fallback:', e);
    }

    IN_MEMORY_SESSIONS.forEach(s => {
      if (s.id === sessionId || (familyId && s.token_family_id === familyId)) {
        s.revoked_at = nowIso;
        s.revoked_reason = 'USER_REVOKED';
      }
    });

    await this.logSecurityEvent({
      user_id: userId,
      session_id: sessionId,
      event_type: 'SESSION_REVOKED',
      severity: 'LOW',
      device_name: targetSession.device_name,
      ip_address: targetSession.ip_address,
      country: targetSession.country,
      city: targetSession.city,
      risk_score: 0,
      risk_level: 'LOW',
      flagged_reasons: [],
      metadata: { revokedSessionId: sessionId, familyId }
    });

    return { success: true, message: 'Session revoked successfully.' };
  }

  /**
   * Revokes all other active sessions for the user except the current one.
   */
  async revokeOtherSessions(userId: string, currentRefreshToken?: string): Promise<{ revokedCount: number; message: string }> {
    if (!currentRefreshToken) {
      throw new Error('Current session verification token is missing.');
    }

    const currentTokenHash = hashToken(currentRefreshToken);
    const nowIso = new Date().toISOString();

    // Find current session to preserve its family
    let currentSession = IN_MEMORY_SESSIONS.find(s => s.refresh_token_hash === currentTokenHash);
    let currentFamilyId = currentSession?.token_family_id;

    if (!currentFamilyId) {
      try {
        const { data } = await this.db
          .from('sessions')
          .select('token_family_id')
          .eq('refresh_token_hash', currentTokenHash)
          .maybeSingle();
        if (data) currentFamilyId = data.token_family_id;
      } catch (_) {}
    }

    let revokedCount = 0;

    // Update in database
    try {
      let query = this.db
        .from('sessions')
        .update({
          revoked_at: nowIso,
          revoked_reason: 'REVOKE_ALL_OTHERS'
        })
        .eq('user_id', userId)
        .is('revoked_at', null);

      if (currentFamilyId) {
        query = query.neq('token_family_id', currentFamilyId);
      } else {
        query = query.neq('refresh_token_hash', currentTokenHash);
      }

      const { data } = await query.select('id');
      if (data) revokedCount = data.length;
    } catch (e) {
      console.warn('Database revokeOtherSessions fallback:', e);
    }

    // Update in memory
    IN_MEMORY_SESSIONS.forEach(s => {
      if (s.user_id === userId && s.revoked_at == null) {
        const isCurrentFamily = currentFamilyId ? s.token_family_id === currentFamilyId : s.refresh_token_hash === currentTokenHash;
        if (!isCurrentFamily) {
          s.revoked_at = nowIso;
          s.revoked_reason = 'REVOKE_ALL_OTHERS';
          revokedCount++;
        }
      }
    });

    await this.logSecurityEvent({
      user_id: userId,
      event_type: 'ALL_OTHER_SESSIONS_REVOKED',
      severity: 'INFO',
      risk_score: 0,
      risk_level: 'LOW',
      flagged_reasons: [],
      metadata: { revokedCount, preservedFamilyId: currentFamilyId }
    });

    return { revokedCount, message: `${revokedCount} other active sessions have been signed out.` };
  }

  /**
   * Revokes all active sessions for a user (High-Security Trigger e.g. compromised account or password reset).
   */
  async revokeAllSessions(userId: string): Promise<{ revokedCount: number; message: string }> {
    const nowIso = new Date().toISOString();
    let count = 0;

    try {
      const { data } = await this.db
        .from('sessions')
        .update({
          revoked_at: nowIso,
          revoked_reason: 'REVOKE_ALL'
        })
        .eq('user_id', userId)
        .is('revoked_at', null)
        .select('id');

      if (data) count = data.length;
    } catch (e) {
      console.warn('Database revokeAllSessions fallback:', e);
    }

    IN_MEMORY_SESSIONS.forEach(s => {
      if (s.user_id === userId && s.revoked_at == null) {
        s.revoked_at = nowIso;
        s.revoked_reason = 'REVOKE_ALL';
        count++;
      }
    });

    await this.logSecurityEvent({
      user_id: userId,
      event_type: 'ALL_SESSIONS_REVOKED',
      severity: 'HIGH',
      risk_score: 50,
      risk_level: 'HIGH',
      flagged_reasons: ['HIGH_SECURITY_REVOKE_ALL_INVOKED'],
      metadata: { revokedCount: count }
    });

    return { revokedCount: count, message: 'All active sessions have been revoked. Fresh login required.' };
  }

  /**
   * Changes user password, verifies old password with Argon2id, and invalidates other sessions.
   */
  async changePassword(userId: string, oldPassword: string, newPassword: string, currentRefreshToken?: string) {
    if (!newPassword || newPassword.length < 8) {
      throw new Error('New password must be at least 8 characters long.');
    }

    const user = await this.findUserById(userId);
    if (!user) {
      throw new Error('User not found.');
    }

    const isValidOld = await verifyPassword(oldPassword, user.password_hash);
    if (!isValidOld) {
      throw new Error('Incorrect current password.');
    }

    const newHash = await hashPassword(newPassword);

    try {
      await this.db.from('users').update({
        password_hash: newHash,
        is_temporary_password: false,
        updated_at: new Date().toISOString()
      }).eq('id', userId);
    } catch (e) {
      console.warn('Database changePassword update fallback:', e);
    }

    // Update in memory
    const seed = SEED_USERS.find(u => u.id === userId);
    if (seed) {
      seed.password_hash = newHash;
      seed.is_temporary_password = false;
    }

    // High security: Invalidate other sessions
    if (currentRefreshToken) {
      await this.revokeOtherSessions(userId, currentRefreshToken);
    }

    await this.logSecurityEvent({
      user_id: userId,
      event_type: 'PASSWORD_CHANGED',
      severity: 'MEDIUM',
      risk_score: 0,
      risk_level: 'LOW',
      flagged_reasons: [],
      metadata: { changedAt: new Date().toISOString() }
    });

    return { success: true, message: 'Password updated successfully. Other active sessions have been signed out.' };
  }

  /**
   * Retrieves paginated security events for the authenticated user.
   */
  async getUserSecurityEvents(userId: string, limit = 50, offset = 0) {
    try {
      const { data, error } = await this.db
        .from('security_events')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (data && !error && data.length > 0) {
        return data as SecurityEventRecord[];
      }
    } catch (err) {
      console.warn('Database getUserSecurityEvents fallback:', err);
    }

    return IN_MEMORY_SECURITY_EVENTS
      .filter(e => e.user_id === userId)
      .slice(offset, offset + limit);
  }

  /**
   * Super Admin Audit Stream: Retrieves global security events with user enrichment.
   */
  async getAdminSecurityAudit(limit = 100, offset = 0, severityFilter?: string) {
    let events: SecurityEventRecord[] = [];

    try {
      let query = this.db
        .from('security_events')
        .select('*')
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (severityFilter && severityFilter !== 'ALL') {
        query = query.eq('severity', severityFilter);
      }

      const { data, error } = await query;
      if (data && !error) {
        events = data as SecurityEventRecord[];
      }
    } catch (err) {
      console.warn('Database getAdminSecurityAudit fallback:', err);
    }

    if (events.length === 0) {
      events = IN_MEMORY_SECURITY_EVENTS
        .filter(e => !severityFilter || severityFilter === 'ALL' || e.severity === severityFilter)
        .slice(offset, offset + limit);
    }

    return events;
  }

  /**
   * Retrieves profile of currently authenticated user.
   */
  async getMe(userId: string) {
    const user = await this.findUserById(userId);
    if (!user) {
      throw new Error('User not found.');
    }

    return {
      id: user.id,
      name: user.full_name,
      email: user.email,
      role: user.role,
      department: user.department,
      phone: user.phone,
      status: user.status,
      isTemporaryPassword: user.is_temporary_password || false,
      lastLogin: user.last_login_at || new Date().toLocaleString('en-IN', { hour12: true })
    };
  }

  /**
   * Generates a signed, time-limited, single-use reset token and dispatches reset instructions.
   * Responds with identical generic message regardless of email existence to prevent user enumeration.
   */
  async requestPasswordReset(email: string, ip = '127.0.0.1', userAgent = 'Unknown') {
    const cleanEmail = email.trim().toLowerCase();
    const user = await this.findUserByEmail(cleanEmail);

    if (user) {
      const rawToken = crypto.randomBytes(32).toString('hex');
      const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
      const expiresAt = Date.now() + 60 * 60 * 1000; // 60 minutes

      IN_MEMORY_RESET_TOKENS.push({
        token_hash: tokenHash,
        user_id: user.id,
        email: user.email,
        expires_at: expiresAt,
        used_at: null,
        created_at: new Date().toISOString()
      });

      await this.logSecurityEvent({
        user_id: user.id,
        event_type: 'PASSWORD_RESET_REQUESTED',
        severity: 'LOW',
        ip_address: ip,
        user_agent: userAgent,
        risk_score: 0,
        risk_level: 'LOW',
        flagged_reasons: [],
        metadata: { email: user.email, requestedAt: new Date().toISOString() }
      });

      try {
        await logAudit({
          actorId: user.id,
          actorEmail: user.email,
          action: 'PASSWORD_RESET_REQUESTED',
          entityType: 'user',
          entityId: user.id,
          ipAddress: ip,
          userAgent,
          details: `Password reset requested for ${user.email}`
        });
      } catch (_) {}

      // Optional email notification dispatch
      const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password?token=${rawToken}`;
      try {
        await notificationsService.sendEmail({
          to: user.email,
          subject: 'Reset your Owner OS Password',
          html: `<p>Hello ${user.full_name},</p><p>We received a request to reset your password. Click the link below to set a new password (valid for 60 minutes):</p><p><a href="${resetUrl}">${resetUrl}</a></p><p>If you did not request this, you can safely ignore this email.</p>`
        });
      } catch (err) {
        console.warn('Email dispatch warning for reset password:', err);
      }
    }

    return {
      success: true,
      message: 'If this email address is registered with Owner OS, a password reset link has been dispatched to your inbox.'
    };
  }

  /**
   * Resets password using a single-use verification token.
   * Validates token expiration, hashes password with Argon2id, marks token as used, and revokes all active sessions.
   */
  async resetPasswordWithToken(token: string, newPassword: string, ip = '127.0.0.1', userAgent = 'Unknown') {
    if (!token) {
      throw new Error('Reset token is required.');
    }
    if (!newPassword || newPassword.length < 8) {
      throw new Error('New password must be at least 8 characters long and contain at least one letter and one number.');
    }
    if (!/(?=.*[a-zA-Z])(?=.*\d)/.test(newPassword)) {
      throw new Error('Password must contain at least one letter and one number.');
    }

    const tokenHash = crypto.createHash('sha256').update(token.trim()).digest('hex');
    const tokenRecord = IN_MEMORY_RESET_TOKENS.find(t => t.token_hash === tokenHash && !t.used_at);

    if (!tokenRecord || tokenRecord.expires_at < Date.now()) {
      throw new Error('This password reset link is invalid, has expired, or has already been used. Please request a new one.');
    }

    const user = await this.findUserById(tokenRecord.user_id);
    if (!user) {
      throw new Error('Associated user account was not found.');
    }

    const newHash = await hashPassword(newPassword);

    try {
      await this.db.from('users').update({
        password_hash: newHash,
        is_temporary_password: false,
        updated_at: new Date().toISOString()
      }).eq('id', user.id);
    } catch (e) {
      console.warn('Database resetPassword update fallback:', e);
    }

    const seed = SEED_USERS.find(u => u.id === user.id);
    if (seed) {
      seed.password_hash = newHash;
      seed.is_temporary_password = false;
    }

    // Invalidate the token (single use)
    tokenRecord.used_at = new Date().toISOString();

    // Revoke all existing sessions for security
    await this.revokeAllSessions(user.id);

    await this.logSecurityEvent({
      user_id: user.id,
      event_type: 'PASSWORD_RESET_COMPLETED',
      severity: 'MEDIUM',
      ip_address: ip,
      user_agent: userAgent,
      risk_score: 0,
      risk_level: 'LOW',
      flagged_reasons: [],
      metadata: { completedAt: new Date().toISOString() }
    });

    try {
      await logAudit({
        actorId: user.id,
        actorEmail: user.email,
        action: 'PASSWORD_RESET_COMPLETED',
        entityType: 'user',
        entityId: user.id,
        ipAddress: ip,
        userAgent,
        details: `Password reset successfully completed for ${user.email}`
      });
    } catch (_) {}

    return {
      success: true,
      message: 'Your password has been reset successfully. Please log in with your new password.'
    };
  }

  /**
   * Registers a new user.
   */
  async register(params: {
    email: string;
    password?: string;
    name?: string;
    role?: string;
    department?: string;
    phone?: string;
    orgId?: string;
    requirePasswordChangeFirstLogin?: boolean;
  }) {
    const cleanEmail = params.email.trim().toLowerCase();
    const existing = await this.findUserByEmail(cleanEmail);
    if (existing) {
      throw new Error(`User with email "${cleanEmail}" already exists.`);
    }

    const rawPassword = params.password;
    if (!rawPassword) {
      throw new Error('Password is required.');
    }

    if (rawPassword.length < 8 || !/(?=.*[a-zA-Z])(?=.*\d)/.test(rawPassword)) {
      throw new Error('Password must be at least 8 characters long and contain at least one letter and one number.');
    }

    const normRole = normalizeRole(params.role || 'OPERATOR');
    if (normRole === 'ServerAdmin' || (params.role && params.role.trim().toLowerCase() === 'serveradmin')) {
      throw new Error('The ServerAdmin role cannot be created via the user API. It is strictly provisionable via CLI seed script only.');
    }

    const userId = crypto.randomUUID();
    const passwordHash = await hashPassword(rawPassword);
    const isTemp = params.requirePasswordChangeFirstLogin ?? false;

    const newUser: UserRecord = {
      id: userId,
      email: cleanEmail,
      password_hash: passwordHash,
      full_name: params.name || 'New Enterprise User',
      role: normRole,
      department: params.department || 'Operations',
      phone: params.phone || '',
      status: 'ACTIVE',
      org_id: params.orgId || '00000000-0000-0000-0000-000000000001',
      is_temporary_password: isTemp,
      created_at: new Date().toISOString()
    };

    const { error } = await this.db.from('users').insert({
      id: newUser.id,
      email: newUser.email,
      password_hash: newUser.password_hash,
      full_name: newUser.full_name,
      role: newUser.role,
      department: newUser.department,
      phone: newUser.phone,
      status: newUser.status,
      org_id: newUser.org_id,
      is_temporary_password: isTemp
    });

    if (error) {
      throw new Error(`Database insert failed: ${error.message}`);
    }

    notificationsService.broadcastEvent('user_created', {
      id: newUser.id,
      name: newUser.full_name,
      email: newUser.email,
      role: newUser.role
    });

    return {
      id: newUser.id,
      name: newUser.full_name,
      email: newUser.email,
      role: newUser.role,
      department: newUser.department,
      phone: newUser.phone,
      status: newUser.status,
      isTemporaryPassword: isTemp
    };
  }

  async getAllUsers() {
    try {
      const { data, error } = await this.db.from('users').select('*').order('created_at', { ascending: false });
      if (data && !error && data.length > 0) {
        return data.map((u: any) => ({
          id: u.id,
          userId: u.employee_code || u.user_id || u.id,
          code: u.employee_code || u.user_id || u.id,
          name: u.full_name || u.name,
          fullName: u.full_name || u.name,
          email: u.email,
          role: u.role,
          userRole: u.user_role || u.role,
          department: u.department || 'Executive Management',
          phone: u.phone || u.mobile || '',
          mobile: u.mobile || u.phone || '',
          status: u.status || 'ACTIVE',
          accessLevel: u.access_level || 'Full Access',
          modulesAccess: u.modules_access || [],
          reportingManager: u.reporting_manager || undefined,
          shift: u.shift || 'General-Day',
          isTemporaryPassword: u.is_temporary_password || false,
          lastLogin: u.last_login_at || (u.last_login ? new Date(u.last_login).toLocaleString('en-IN') : 'Never')
        }));
      }
    } catch (err) {
      console.warn('Database getAllUsers fallback:', err);
    }

    try {
      const { data, error } = await this.db.from('profiles').select('*').order('created_at', { ascending: false });
      if (data && !error && data.length > 0) {
        return data.map((u: any) => ({
          id: u.id,
          userId: u.id,
          code: u.id,
          name: u.full_name || u.name,
          fullName: u.full_name || u.name,
          email: u.email,
          role: u.role,
          userRole: u.role,
          department: u.department || 'Operations',
          phone: u.phone || '',
          mobile: u.phone || '',
          status: u.status || 'ACTIVE',
          accessLevel: 'Full Access',
          modulesAccess: [],
          reportingManager: undefined,
          shift: 'General-Day',
          isTemporaryPassword: u.is_temporary_password || false,
          lastLogin: u.last_login ? new Date(u.last_login).toLocaleString('en-IN') : 'Recently'
        }));
      }
    } catch (err) {
      console.warn('Database getAllUsers profiles fallback:', err);
    }

    return SEED_USERS.map(u => ({
      id: u.id,
      name: u.full_name,
      email: u.email,
      role: u.role,
      department: u.department,
      phone: u.phone,
      status: u.status,
      isTemporaryPassword: u.is_temporary_password || false,
      lastLogin: u.last_login_at || 'Never'
    }));
  }

  async updateUser(
    id: string,
    updates: {
      name?: string;
      full_name?: string;
      email?: string;
      role?: string;
      department?: string;
      phone?: string;
      reporting_manager?: string;
      status?: string;
    },
    actorContext?: { id?: string; email?: string; role?: string; name?: string }
  ) {
    const existing = await this.findUserById(id);
    if (!existing) {
      const err: any = new Error(`User with ID ${id} not found.`);
      err.statusCode = 404;
      throw err;
    }

    const cleanEmail = updates.email ? updates.email.trim().toLowerCase() : undefined;
    if (cleanEmail && cleanEmail !== existing.email.toLowerCase()) {
      // Check uniqueness
      const conflict = await this.findUserByEmail(cleanEmail);
      if (conflict && conflict.id !== id) {
        const err: any = new Error(`Email address ${cleanEmail} is already assigned to another user.`);
        err.statusCode = 409;
        throw err;
      }
    }

    const newFullName = updates.full_name || updates.name || existing.full_name;
    const newEmail = cleanEmail || existing.email;
    const newRole = updates.role || existing.role;
    const newDept = updates.department || existing.department;
    const newPhone = updates.phone !== undefined ? updates.phone : existing.phone;
    const newStatus = updates.status || existing.status;
    const nowIso = new Date().toISOString();

    const beforeState = {
      id: existing.id,
      email: existing.email,
      name: existing.full_name,
      role: existing.role,
      department: existing.department,
      status: existing.status
    };

    const afterState = {
      id: existing.id,
      email: newEmail,
      name: newFullName,
      role: newRole,
      department: newDept,
      status: newStatus
    };

    try {
      await this.db
        .from('profiles')
        .update({
          full_name: newFullName,
          email: newEmail,
          role: newRole,
          department: newDept,
          phone: newPhone,
          status: newStatus,
          updated_at: nowIso
        })
        .eq('id', id);
    } catch (dbErr) {
      console.warn('DB profiles update fallback:', dbErr);
    }

    try {
      await this.db
        .from('users')
        .update({
          full_name: newFullName,
          email: newEmail,
          role: newRole,
          department: newDept,
          phone: newPhone,
          status: newStatus,
          updated_at: nowIso
        })
        .eq('id', id);
    } catch (_) {}

    // Update in-memory seed if applicable
    const seed = SEED_USERS.find(u => u.id === id || u.email.toLowerCase() === existing.email.toLowerCase());
    if (seed) {
      seed.full_name = newFullName;
      seed.email = newEmail;
      seed.role = newRole;
      seed.department = newDept;
      seed.phone = newPhone;
      seed.status = newStatus;
    }

    await auditService.recordAuditLog({
      actorEmail: actorContext?.email || 'owner@guruom.in',
      actorRole: actorContext?.role || 'Owner',
      action: 'USER_MASTER_UPDATE',
      entityType: 'users',
      entityId: id,
      details: `User master updated: [Name: ${beforeState.name} → ${afterState.name}, Email: ${beforeState.email} → ${afterState.email}, Role: ${beforeState.role} → ${afterState.role}]`
    }).catch(() => {});

    notificationsService.broadcastEvent('user_updated', {
      id,
      name: newFullName,
      email: newEmail,
      role: newRole,
      department: newDept,
      phone: newPhone,
      status: newStatus
    });

    return {
      id,
      name: newFullName,
      fullName: newFullName,
      email: newEmail,
      role: newRole,
      department: newDept,
      phone: newPhone,
      status: newStatus,
      updatedAt: nowIso
    };
  }

  async updateUserRole(id: string, role: string, actorId?: string) {
    const normRole = normalizeRole(role);
    if (normRole === 'ServerAdmin' || role.trim().toLowerCase() === 'serveradmin') {
      throw new Error('The ServerAdmin role cannot be assigned via the API. This role is strictly provisionable via CLI seed script only.');
    }

    const existing = await this.findUserById(id);
    const beforeState = existing ? { role: existing.role, status: existing.status } : null;
    const afterState = { role: normRole, status: existing?.status };

    // Invalidate active sessions on role change
    await this.db.from('sessions').delete().eq('user_id', id);

    const { error } = await this.db.from('users').update({ role: normRole, updated_at: new Date().toISOString() }).eq('id', id);
    if (error) {
      throw new Error(`Database update failed: ${error.message}`);
    }

    try {
      await logAudit({
        actorId: actorId || 'usr-admin',
        actorEmail: 'admin@guruom.in',
        action: 'UPDATE_ROLE',
        entityType: 'user',
        entityId: id,
        beforeState,
        afterState,
        metadata: { role }
      });
    } catch (_) {}

    notificationsService.broadcastEvent('user_updated', { id, role });
    return { id, role };
  }

  async updateUserStatus(id: string, status: string, actorId?: string) {
    const nowIso = new Date().toISOString();
    const existing = await this.findUserById(id);
    const beforeState = existing ? { status: existing.status, role: existing.role } : null;
    const afterState = { status, role: existing?.role };

    const { error } = await this.db.from('users').update({ status, updated_at: nowIso }).eq('id', id);
    if (error) {
      throw new Error(`Database update failed: ${error.message}`);
    }
    if (status === 'REVOKED' || status === 'SUSPENDED') {
      await this.db.from('sessions').update({ revoked_at: nowIso, revoked_reason: 'USER_ACCOUNT_REVOKED' }).eq('user_id', id);
    }

    if (status === 'REVOKED' || status === 'SUSPENDED') {
      IN_MEMORY_SESSIONS.forEach(s => {
        if (s.user_id === id) {
          s.revoked_at = nowIso;
          s.revoked_reason = 'USER_ACCOUNT_REVOKED';
        }
      });
    }

    try {
      await logAudit({
        actorId: actorId || 'usr-admin',
        actorEmail: 'admin@guruom.in',
        action: status === 'REVOKED' ? 'REVOKE_USER' : 'RESTORE_USER',
        entityType: 'user',
        entityId: id,
        beforeState,
        afterState,
        metadata: { status }
      });
    } catch (_) {}

    notificationsService.broadcastEvent('user_updated', { id, status });
    return { id, status };
  }

  async deleteUser(id: string, actorId?: string) {
    const existing = await this.findUserById(id);
    const beforeState = existing ? { email: existing.email, name: existing.full_name, role: existing.role, status: existing.status } : null;

    const { error: sessionError } = await this.db.from('sessions').delete().eq('user_id', id);
    if (sessionError) {
      throw new Error(`Session deletion failed: ${sessionError.message}`);
    }
    const { error: userError } = await this.db.from('users').delete().eq('id', id);
    if (userError) {
      throw new Error(`User deletion failed: ${userError.message}`);
    }

    try {
      await logAudit({
        actorId: actorId || 'usr-admin',
        actorEmail: 'admin@guruom.in',
        action: 'DELETE_USER',
        entityType: 'user',
        entityId: id,
        beforeState,
        afterState: null,
        metadata: { deletedId: id }
      });
    } catch (_) {}

    notificationsService.broadcastEvent('user_deleted', { id });
    return { id, success: true };
  }
}

export const authService = new AuthService();

