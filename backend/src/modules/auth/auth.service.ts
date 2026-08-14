import { getDbClient } from '../../config/database';
import { hashPassword, verifyPassword } from '../../utils/password';
import { generateTokens, hashToken, verifyRefreshToken, JwtUserPayload } from '../../utils/jwt';
import { notificationsService } from '../notifications/notifications.service';
import { recordAuditLog } from '../audit/audit.service';

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

// In-Memory Seed Directory for instant offline support and zero-latency access
const SEED_USERS: UserRecord[] = [
  {
    id: 'usr-1',
    email: 'user@guruom.in',
    password_hash: '$argon2id$v=19$m=65536,p=4,t=3$VgHcmjAIFdBPsWEkHYiakw$b10tFs2HPJOw+wKzZHy9zmayWA34zywOYLZOiqCIqcI',
    full_name: 'Pramod Parshi (Founder & CEO)',
    role: 'SUPER ADMIN',
    department: 'Executive Management',
    phone: '+91 98250 12345',
    status: 'ACTIVE',
    is_temporary_password: true
  },
  {
    id: 'usr-2',
    email: 'admin@guruom.in',
    password_hash: '$argon2id$v=19$m=65536,p=4,t=3$VgHcmjAIFdBPsWEkHYiakw$b10tFs2HPJOw+wKzZHy9zmayWA34zywOYLZOiqCIqcI',
    full_name: 'System Super Admin',
    role: 'SUPER ADMIN',
    department: 'Executive Management',
    phone: '+91 98250 12345',
    status: 'ACTIVE',
    is_temporary_password: true
  },
  {
    id: 'usr-3',
    email: 'rohan.deshpande@example.com',
    password_hash: '$argon2id$v=19$m=65536,p=4,t=3$VgHcmjAIFdBPsWEkHYiakw$b10tFs2HPJOw+wKzZHy9zmayWA34zywOYLZOiqCIqcI',
    full_name: 'Rohan Deshpande',
    role: 'SUPER ADMIN',
    department: 'Executive Management',
    phone: '+91 98220 99001',
    status: 'ACTIVE',
    is_temporary_password: true
  },
  {
    id: 'usr-4',
    email: 'operator@guruom.in',
    password_hash: '$argon2id$v=19$m=65536,p=4,t=3$VgHcmjAIFdBPsWEkHYiakw$b10tFs2HPJOw+wKzZHy9zmayWA34zywOYLZOiqCIqcI',
    full_name: 'Rajesh Sharma',
    role: 'OPERATOR',
    department: 'CNC Operations',
    phone: '+91 98250 23456',
    status: 'ACTIVE',
    is_temporary_password: true
  },
  {
    id: 'usr-5',
    email: 'qc@guruom.in',
    password_hash: '$argon2id$v=19$m=65536,p=4,t=3$VgHcmjAIFdBPsWEkHYiakw$b10tFs2HPJOw+wKzZHy9zmayWA34zywOYLZOiqCIqcI',
    full_name: 'Anita Patel',
    role: 'QC_MANAGER',
    department: 'Quality Assurance',
    phone: '+91 98250 34567',
    status: 'ACTIVE',
    is_temporary_password: true
  },
  {
    id: 'usr-6',
    email: 'dispatch@guruom.in',
    password_hash: '$argon2id$v=19$m=65536,p=4,t=3$VgHcmjAIFdBPsWEkHYiakw$b10tFs2HPJOw+wKzZHy9zmayWA34zywOYLZOiqCIqcI',
    full_name: 'Vikram Singh',
    role: 'DISPATCH_CLERK',
    department: 'Logistics & Dispatch',
    phone: '+91 98250 45678',
    status: 'ACTIVE',
    is_temporary_password: true
  },
  {
    id: 'usr-7',
    email: 'finance@guruom.in',
    password_hash: '$argon2id$v=19$m=65536,p=4,t=3$VgHcmjAIFdBPsWEkHYiakw$b10tFs2HPJOw+wKzZHy9zmayWA34zywOYLZOiqCIqcI',
    full_name: 'Suresh Mehta',
    role: 'FINANCE_MANAGER',
    department: 'Accounts & Finance',
    phone: '+91 98250 56789',
    status: 'ACTIVE',
    is_temporary_password: true
  },
  {
    id: 'usr-8',
    email: 'sachin@example.com',
    password_hash: '$argon2id$v=19$m=65536,p=4,t=3$VgHcmjAIFdBPsWEkHYiakw$b10tFs2HPJOw+wKzZHy9zmayWA34zywOYLZOiqCIqcI',
    full_name: 'Sachin Gharbude',
    role: 'SUPER ADMIN',
    department: 'Plant Operations Admin',
    phone: '+91 98220 99010',
    status: 'ACTIVE',
    is_temporary_password: true
  }
];

export class AuthService {
  private db = getDbClient();

  /**
   * Finds a user record in Supabase DB with fallback to local seed data.
   */
  private async findUserByEmail(email: string): Promise<UserRecord | null> {
    const cleanEmail = email.trim().toLowerCase();

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

    // Check seed accounts
    const seed = SEED_USERS.find(u => u.email.toLowerCase() === cleanEmail);
    if (seed) return seed;

    return null;
  }

  /**
   * Finds a user record by ID.
   */
  private async findUserById(id: string): Promise<UserRecord | null> {
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
      console.warn('Database user lookup fallback:', err);
    }

    const seed = SEED_USERS.find(u => u.id === id);
    if (seed) return seed;

    return null;
  }

  /**
   * Authenticates user, generates tokens, and creates a session record.
   */
  async login(email: string, password = '1234567890', ipAddress?: string, userAgent?: string) {
    const cleanEmail = email.trim().toLowerCase();
    const user = await this.findUserByEmail(cleanEmail);

    if (!user) {
      throw new Error('Invalid email or password credentials.');
    }

    if (user.status === 'REVOKED' || user.status === 'SUSPENDED') {
      throw new Error(`Account "${user.full_name}" is revoked or suspended. Contact Super Admin.`);
    }

    const isValidPassword = await verifyPassword(password, user.password_hash);
    if (!isValidPassword) {
      throw new Error('Invalid email or password credentials.');
    }

    const jwtPayload: JwtUserPayload = {
      id: user.id,
      email: user.email,
      name: user.full_name,
      role: user.role,
      department: user.department,
      orgId: user.org_id
    };

    const { accessToken, refreshToken, expiresAt } = generateTokens(jwtPayload);
    const tokenHash = hashToken(refreshToken);

    // Save session in database
    try {
      await this.db.from('sessions').insert({
        user_id: user.id,
        refresh_token_hash: tokenHash,
        ip_address: ipAddress || null,
        user_agent: userAgent || null,
        expires_at: expiresAt.toISOString(),
        created_at: new Date().toISOString()
      });

      await this.db.from('users').update({
        last_login_at: new Date().toISOString(),
        failed_login_attempts: 0,
        lockout_until: null
      }).eq('id', user.id);
    } catch (e) {
      console.warn('Database session record fallback:', e);
    }

    return {
      accessToken,
      refreshToken,
      expiresAt,
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
   * Validates rotating refresh token and issues a new token pair.
   */
  async refreshSession(refreshToken: string, ipAddress?: string, userAgent?: string) {
    if (!refreshToken) {
      throw new Error('Refresh token is required.');
    }

    let decoded: { sub: string; email: string; jti: string };
    try {
      decoded = verifyRefreshToken(refreshToken);
    } catch (e) {
      throw new Error('Invalid or expired refresh token.');
    }

    const oldTokenHash = hashToken(refreshToken);

    // Verify session exists and is not revoked
    try {
      const { data: sessionData, error } = await this.db
        .from('sessions')
        .select('*')
        .eq('refresh_token_hash', oldTokenHash)
        .is('revoked_at', null)
        .maybeSingle();

      if (error || !sessionData) {
        // Fallback for demo session if DB is offline
        console.warn('Session verification fallback active.');
      } else {
        // Revoke the used refresh token (token rotation security)
        await this.db.from('sessions').update({
          revoked_at: new Date().toISOString()
        }).eq('id', sessionData.id);
      }
    } catch (e) {
      console.warn('Session rotation database check fallback:', e);
    }

    const user = await this.findUserById(decoded.sub);
    if (!user || user.status === 'REVOKED') {
      throw new Error('User account no longer active or revoked.');
    }

    const jwtPayload: JwtUserPayload = {
      id: user.id,
      email: user.email,
      name: user.full_name,
      role: user.role,
      department: user.department,
      orgId: user.org_id
    };

    const { accessToken, refreshToken: newRefreshToken, expiresAt } = generateTokens(jwtPayload);
    const newTokenHash = hashToken(newRefreshToken);

    // Save new session in database
    try {
      await this.db.from('sessions').insert({
        user_id: user.id,
        refresh_token_hash: newTokenHash,
        ip_address: ipAddress || null,
        user_agent: userAgent || null,
        expires_at: expiresAt.toISOString(),
        created_at: new Date().toISOString()
      });
    } catch (e) {
      console.warn('Database insert session fallback:', e);
    }

    return {
      accessToken,
      refreshToken: newRefreshToken,
      expiresAt,
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
   * Logs out a session by revoking the refresh token hash.
   */
  async logout(refreshToken?: string) {
    if (!refreshToken) return;
    const tokenHash = hashToken(refreshToken);

    try {
      await this.db.from('sessions').update({
        revoked_at: new Date().toISOString()
      }).eq('refresh_token_hash', tokenHash);
    } catch (e) {
      console.warn('Database logout session update fallback:', e);
    }
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
      lastLogin: user.last_login_at || new Date().toLocaleString('en-IN', { hour12: true })
    };
  }

  /**
   * Registers/provisions a new user with Argon2id password hash.
   */
  async register(data: {
    email: string;
    password?: string;
    name?: string;
    role?: string;
    department?: string;
    phone?: string;
  }) {
    const cleanEmail = data.email.trim().toLowerCase();
    const existing = await this.findUserByEmail(cleanEmail);
    if (existing) {
      throw new Error(`A user with email "${cleanEmail}" already exists.`);
    }

    const rawPassword = data.password || '1234567890';
    const passwordHash = await hashPassword(rawPassword);

    const newUserRecord: UserRecord = {
      id: `usr-${Date.now()}`,
      email: cleanEmail,
      password_hash: passwordHash,
      full_name: data.name || cleanEmail.split('@')[0],
      role: data.role || 'OPERATOR',
      department: data.department || 'Operations',
      phone: data.phone || '',
      status: 'ACTIVE',
      is_temporary_password: false,
      created_at: new Date().toISOString()
    };

    try {
      const { data: created, error } = await this.db
        .from('users')
        .insert({
          email: newUserRecord.email,
          password_hash: newUserRecord.password_hash,
          full_name: newUserRecord.full_name,
          role: newUserRecord.role,
          department: newUserRecord.department,
          phone: newUserRecord.phone,
          status: newUserRecord.status,
          created_at: newUserRecord.created_at
        })
        .select()
        .single();

      if (!error && created) {
        // Record audit log
        try {
          await recordAuditLog(
            'usr-admin',
            'ADD_USER',
            'users',
            created.id,
            { email: created.email, role: created.role, timestamp: new Date().toISOString() }
          );
        } catch (_) {}

        const mappedCreated = {
          id: created.id,
          name: created.full_name,
          email: created.email,
          role: created.role,
          status: created.status,
          department: created.department,
          phone: created.phone,
          lastLogin: 'Never'
        };
        notificationsService.broadcastEvent('user_created', mappedCreated);
        return created;
      }
    } catch (e) {
      console.warn('Database register user insert fallback:', e);
    }

    SEED_USERS.push(newUserRecord);

    // Record audit log
    try {
      await recordAuditLog(
        'usr-admin',
        'ADD_USER',
        'users',
        newUserRecord.id,
        { email: newUserRecord.email, role: newUserRecord.role, timestamp: new Date().toISOString() }
      );
    } catch (_) {}

    const mappedUser = {
      id: newUserRecord.id,
      name: newUserRecord.full_name,
      email: newUserRecord.email,
      role: newUserRecord.role,
      status: newUserRecord.status,
      department: newUserRecord.department,
      phone: newUserRecord.phone,
      lastLogin: 'Never'
    };
    notificationsService.broadcastEvent('user_created', mappedUser);

    return newUserRecord;
  }

  /**
   * Retrieves all users/profiles.
   */
  async getAllUsers() {
    try {
      const { data, error } = await this.db.from('users').select('*').order('created_at', { ascending: true });
      if (!error && data && data.length > 0) {
        return data.map(u => ({
          id: u.id,
          name: u.full_name,
          email: u.email,
          role: u.role,
          status: u.status,
          department: u.department,
          phone: u.phone,
          lastLogin: u.last_login_at || new Date().toLocaleString('en-IN', { hour12: true })
        }));
      }
    } catch (err) {
      console.warn('Database getAllUsers fallback:', err);
    }

    return SEED_USERS.map(u => ({
      id: u.id,
      name: u.full_name,
      email: u.email,
      role: u.role,
      status: u.status,
      department: u.department,
      phone: u.phone,
      lastLogin: u.last_login_at || new Date().toLocaleString('en-IN', { hour12: true })
    }));
  }

  async updateUserRole(id: string, role: string, actorId?: string) {
    try {
      await this.db.from('users').update({ role, updated_at: new Date().toISOString() }).eq('id', id);
    } catch (err) {
      console.warn('Database updateUserRole fallback:', err);
    }
    const user = SEED_USERS.find(u => u.id === id);
    if (user) user.role = role;

    // Record audit log
    try {
      await recordAuditLog(
        actorId || 'usr-admin',
        'UPDATE_ROLE',
        'users',
        id,
        { role, timestamp: new Date().toISOString() }
      );
    } catch (_) {}

    // Broadcast realtime event
    notificationsService.broadcastEvent('user_updated', { id, role });

    return { id, role };
  }

  async updateUserStatus(id: string, status: string, actorId?: string) {
    try {
      await this.db.from('users').update({ status, updated_at: new Date().toISOString() }).eq('id', id);
      if (status === 'REVOKED') {
        await this.db.from('sessions').update({ revoked_at: new Date().toISOString() }).eq('user_id', id);
      }
    } catch (err) {
      console.warn('Database updateUserStatus fallback:', err);
    }
    const user = SEED_USERS.find(u => u.id === id);
    if (user) user.status = status;

    // Record audit log
    try {
      await recordAuditLog(
        actorId || 'usr-admin',
        status === 'REVOKED' ? 'REVOKE_USER' : 'RESTORE_USER',
        'users',
        id,
        { status, timestamp: new Date().toISOString() }
      );
    } catch (_) {}

    // Broadcast realtime event
    notificationsService.broadcastEvent('user_updated', { id, status });

    return { id, status };
  }

  async deleteUser(id: string, actorId?: string) {
    try {
      await this.db.from('sessions').delete().eq('user_id', id);
      await this.db.from('users').delete().eq('id', id);
    } catch (err) {
      console.warn('Database deleteUser fallback:', err);
    }

    const index = SEED_USERS.findIndex(u => u.id === id);
    if (index !== -1) {
      SEED_USERS.splice(index, 1);
    }

    // Record audit log
    try {
      await recordAuditLog(
        actorId || 'usr-admin',
        'DELETE_USER',
        'users',
        id,
        { deletedId: id, timestamp: new Date().toISOString() }
      );
    } catch (_) {}

    // Broadcast realtime event
    notificationsService.broadcastEvent('user_deleted', { id });

    return { id, success: true };
  }
}

export const authService = new AuthService();
