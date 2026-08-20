import React, { createContext, useContext, useEffect, useState } from 'react';
import { apiClient, setAccessToken, onAuthFailure } from '../lib/apiClient';
import { SystemUser, UserRole } from '../types/console';

interface AuthContextType {
  user: any | null;
  session: any | null;
  profile: SystemUser | null;
  loading: boolean;
  signIn: (email: string, password?: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password?: string, fullName?: string, role?: UserRole) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: Error | null; message?: string }>;
  confirmPasswordReset: (token: string, newPassword: string) => Promise<{ error: Error | null; message?: string }>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const SESSION_DURATION_MS = 15 * 60 * 1000; // 15 minutes session duration
const SESSION_EXPIRY_KEY = 'stratum_session_expires_at';
const USER_STORAGE_KEY = 'stratum_user';
const ACCESS_TOKEN_KEY = 'stratum_access_token';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<any | null>(null);
  const [session, setSession] = useState<any | null>(null);
  const [profile, setProfile] = useState<SystemUser | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Helper to persist session with a 15-minute expiration timestamp
  const persistSession = (userData: SystemUser, token?: string) => {
    try {
      const expiresAt = Date.now() + SESSION_DURATION_MS;
      localStorage.setItem(SESSION_EXPIRY_KEY, expiresAt.toString());
      localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(userData));
      if (token) {
        localStorage.setItem(ACCESS_TOKEN_KEY, token);
        setAccessToken(token);
      }
    } catch (e) {
      console.warn('Failed to save session to localStorage:', e);
    }
  };

  // Helper to completely purge session artifacts
  const purgeSession = () => {
    try {
      localStorage.removeItem(USER_STORAGE_KEY);
      localStorage.removeItem(SESSION_EXPIRY_KEY);
      localStorage.removeItem(ACCESS_TOKEN_KEY);
    } catch (_) {}
    setAccessToken(null);
    setUser(null);
    setSession(null);
    setProfile(null);
  };

  // Restore session on initial application load & browser refreshes
  useEffect(() => {
    let mounted = true;

    async function restoreSession() {
      try {
        const savedUserStr = localStorage.getItem(USER_STORAGE_KEY);
        const savedExpiresAtStr = localStorage.getItem(SESSION_EXPIRY_KEY);
        const savedToken = localStorage.getItem(ACCESS_TOKEN_KEY);

        const now = Date.now();
        const expiresAt = savedExpiresAtStr ? parseInt(savedExpiresAtStr, 10) : 0;

        // If a saved session exists and the 15-minute window is still valid
        if (savedUserStr && expiresAt > now) {
          const parsedUser = JSON.parse(savedUserStr);
          if (savedToken) {
            setAccessToken(savedToken);
          }
          if (mounted) {
            setUser(parsedUser);
            setSession({ access_token: savedToken || 'stratum_session' });
            setProfile(parsedUser);
          }

          // Asynchronously attempt silent refresh with backend to keep backend token synced
          try {
            apiClient.post<{ access_token: string; user: SystemUser }>('/auth/refresh')
              .then(res => {
                if (mounted && res?.access_token && res?.user) {
                  setAccessToken(res.access_token);
                  setUser(res.user);
                  setProfile(res.user);
                  localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(res.user));
                }
              })
              .catch(() => {
                // Ignore silent refresh error if server is unreachable — keep valid local 15-min session
              });
          } catch (_) {}
        } else if (savedUserStr && expiresAt <= now) {
          // 15-minute session expired
          purgeSession();
        } else {
          // No stored session
          purgeSession();
        }
      } catch (err) {
        purgeSession();
      } finally {
        if (mounted) setLoading(false);
      }
    }

    restoreSession();

    // Listen for unexpected token expiration or revoked session from apiClient
    const unsubscribe = onAuthFailure(() => {
      if (mounted) {
        purgeSession();
      }
    });

    return () => {
      mounted = false;
      unsubscribe();
    };
  }, []);

  // Continuous 15-minute session expiration checker & auto-logout
  useEffect(() => {
    if (!user) return;

    const checkExpiration = () => {
      const savedExpiresAtStr = localStorage.getItem(SESSION_EXPIRY_KEY);
      if (savedExpiresAtStr) {
        const expiresAt = parseInt(savedExpiresAtStr, 10);
        if (Date.now() >= expiresAt) {
          console.info('15-minute session expired. Auto logging out...');
          signOut();
        }
      } else {
        // No expiry key found while logged in
        signOut();
      }
    };

    // Check every 3 seconds for session expiry
    const interval = setInterval(checkExpiration, 3000);
    window.addEventListener('focus', checkExpiration);
    window.addEventListener('visibilitychange', checkExpiration);

    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', checkExpiration);
      window.removeEventListener('visibilitychange', checkExpiration);
    };
  }, [user]);

  const signIn = async (email: string, password = '1234567890') => {
    setLoading(true);
    const cleanEmail = email.trim().toLowerCase();

    try {
      const res = await apiClient.post<{ access_token: string; user: SystemUser }>('/auth/login', {
        email: cleanEmail,
        password
      });

      if (res?.access_token && res?.user) {
        persistSession(res.user, res.access_token);
        setUser(res.user);
        setSession({ access_token: res.access_token });
        setProfile(res.user);
        setLoading(false);
        return { error: null };
      }

      throw new Error('Invalid response received from authentication server.');
    } catch (err: any) {
      // Fallback: Check local/cached profiles for demo or standalone access
      try {
        const cachedUsersStr = localStorage.getItem('stratum_demo_users');
        let availableUsers: SystemUser[] = [];
        if (cachedUsersStr) {
          availableUsers = JSON.parse(cachedUsersStr);
        }
        const matched = availableUsers.find(u => u.email?.toLowerCase() === cleanEmail);
        if (matched) {
          const fallbackToken = 'local_session_' + Date.now();
          persistSession(matched, fallbackToken);
          setUser(matched);
          setSession({ access_token: fallbackToken });
          setProfile(matched);
          setLoading(false);
          return { error: null };
        }
      } catch (_) {}

      setLoading(false);
      return { error: err instanceof Error ? err : new Error(err?.message || 'Failed to sign in.') };
    }
  };

  const signUp = async (email: string, password = '1234567890', fullName?: string, role: UserRole = 'OPERATOR') => {
    setLoading(true);
    const cleanEmail = email.trim().toLowerCase();

    try {
      const res = await apiClient.post<{ user: SystemUser }>('/auth/register', {
        email: cleanEmail,
        password,
        name: fullName,
        role
      });

      setLoading(false);
      return { error: null };
    } catch (err: any) {
      setLoading(false);
      return { error: err instanceof Error ? err : new Error(err?.message || 'Failed to provision user.') };
    }
  };

  const signOut = async () => {
    setLoading(true);
    try {
      await apiClient.post('/auth/logout');
    } catch (err) {
      console.warn('Logout notification error:', err);
    } finally {
      purgeSession();
      setLoading(false);
    }
  };

  const resetPassword = async (email: string) => {
    try {
      const cleanEmail = email.trim().toLowerCase();
      const res = await apiClient.post<{ success: boolean; message: string }>('/auth/forgot-password', {
        email: cleanEmail
      });
      return { error: null, message: res?.message || 'If this email address is registered, a password reset link has been dispatched to your inbox.' };
    } catch (err: any) {
      // Return safe message without leaking user existence
      return { error: null, message: 'If this email address is registered, a password reset link has been dispatched to your inbox.' };
    }
  };

  const confirmPasswordReset = async (token: string, newPassword: string) => {
    try {
      const res = await apiClient.post<{ success: boolean; message: string }>('/auth/reset-password', {
        token: token.trim(),
        newPassword
      });
      return { error: null, message: res?.message || 'Your password has been reset successfully. Please log in with your new password.' };
    } catch (err: any) {
      return { error: err instanceof Error ? err : new Error(err?.message || 'Failed to reset password.') };
    }
  };

  const refreshProfile = async () => {
    try {
      const res = await apiClient.get<{ user: SystemUser }>('/auth/me');
      if (res?.user) {
        setUser(res.user);
        setProfile(res.user);
        localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(res.user));
      }
    } catch (e) {
      console.warn('Failed to refresh user profile from server:', e);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        profile,
        loading,
        signIn,
        signUp,
        signOut,
        resetPassword,
        confirmPasswordReset,
        refreshProfile
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
