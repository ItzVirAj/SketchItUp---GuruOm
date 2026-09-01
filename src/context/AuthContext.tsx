import React, { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react';
import { apiClient, setAccessToken, onAuthFailure } from '../lib/apiClient';
import { SystemUser, UserRole } from '../types/console';
import { AlertTriangle, Clock, RefreshCw, ShieldAlert, LogOut } from 'lucide-react';

export interface SessionSecuritySettings {
  idleTimeoutMinutes: number; // e.g. 15 (default: 15 min idle inactivity timeout, 0 for off)
  maxSessionMinutes: number;  // e.g. 30 (default: 30 min hard ceiling, 0 for off)
  enableIdleWarning: boolean; // default: true (show 60s countdown toast before idle timeout)
}

const DEFAULT_SESSION_SETTINGS: SessionSecuritySettings = {
  idleTimeoutMinutes: 15,
  maxSessionMinutes: 30,
  enableIdleWarning: true
};

const SETTINGS_STORAGE_KEY = 'guruom_session_security_settings';
const SESSION_START_KEY = 'guruom_session_started_at';
const LAST_ACTIVITY_KEY = 'guruom_last_activity_at';
const USER_STORAGE_KEY = 'stratum_user';
const ACCESS_TOKEN_KEY = 'stratum_access_token';
const SESSION_EXPIRY_KEY = 'stratum_session_expires_at';

export function loadSessionSecuritySettings(): SessionSecuritySettings {
  try {
    const saved = localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      return {
        idleTimeoutMinutes: typeof parsed.idleTimeoutMinutes === 'number' ? parsed.idleTimeoutMinutes : DEFAULT_SESSION_SETTINGS.idleTimeoutMinutes,
        maxSessionMinutes: typeof parsed.maxSessionMinutes === 'number' ? parsed.maxSessionMinutes : DEFAULT_SESSION_SETTINGS.maxSessionMinutes,
        enableIdleWarning: typeof parsed.enableIdleWarning === 'boolean' ? parsed.enableIdleWarning : DEFAULT_SESSION_SETTINGS.enableIdleWarning
      };
    }
  } catch (_) {}
  return DEFAULT_SESSION_SETTINGS;
}

export function saveSessionSecuritySettings(settings: SessionSecuritySettings) {
  try {
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
  } catch (e) {
    console.warn('Failed to save session security settings:', e);
  }
}

interface AuthContextType {
  user: any | null;
  session: any | null;
  profile: SystemUser | null;
  loading: boolean;
  sessionSettings: SessionSecuritySettings;
  updateSessionSettings: (updates: Partial<SessionSecuritySettings>) => void;
  lastActivityAt: number;
  sessionStartedAt: number;
  signIn: (email: string, password?: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password?: string, fullName?: string, role?: UserRole) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: Error | null; message?: string }>;
  confirmPasswordReset: (token: string, newPassword: string) => Promise<{ error: Error | null; message?: string }>;
  refreshProfile: () => Promise<void>;
  resetIdleTimer: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<any | null>(null);
  const [session, setSession] = useState<any | null>(null);
  const [profile, setProfile] = useState<SystemUser | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [sessionSettings, setSessionSettings] = useState<SessionSecuritySettings>(loadSessionSecuritySettings);
  const [sessionStartedAt, setSessionStartedAt] = useState<number>(() => {
    const saved = localStorage.getItem(SESSION_START_KEY);
    return saved ? parseInt(saved, 10) : Date.now();
  });
  const [lastActivityAt, setLastActivityAt] = useState<number>(() => {
    const saved = localStorage.getItem(LAST_ACTIVITY_KEY);
    return saved ? parseInt(saved, 10) : Date.now();
  });

  // Warning Modal State
  const [isIdleWarningOpen, setIsIdleWarningOpen] = useState(false);
  const [idleSecondsRemaining, setIdleSecondsRemaining] = useState(60);

  const lastActivityRef = useRef<number>(lastActivityAt);
  const sessionStartRef = useRef<number>(sessionStartedAt);
  const settingsRef = useRef<SessionSecuritySettings>(sessionSettings);

  useEffect(() => {
    settingsRef.current = sessionSettings;
  }, [sessionSettings]);

  useEffect(() => {
    lastActivityRef.current = lastActivityAt;
  }, [lastActivityAt]);

  useEffect(() => {
    sessionStartRef.current = sessionStartedAt;
  }, [sessionStartedAt]);

  // Helper to persist session & initialize tracking timestamps
  const persistSession = (userData: SystemUser, token?: string) => {
    try {
      const now = Date.now();
      localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(userData));
      localStorage.setItem(SESSION_START_KEY, now.toString());
      localStorage.setItem(LAST_ACTIVITY_KEY, now.toString());
      setSessionStartedAt(now);
      setLastActivityAt(now);
      lastActivityRef.current = now;
      sessionStartRef.current = now;

      // Calculate max absolute expiry
      const maxMs = (settingsRef.current.maxSessionMinutes || 30) * 60 * 1000;
      localStorage.setItem(SESSION_EXPIRY_KEY, (now + maxMs).toString());

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
      localStorage.removeItem(SESSION_START_KEY);
      localStorage.removeItem(LAST_ACTIVITY_KEY);
    } catch (_) {}
    setAccessToken(null);
    setUser(null);
    setSession(null);
    setProfile(null);
    setIsIdleWarningOpen(false);
  };

  // Reset/touch idle activity timer
  const resetIdleTimer = useCallback(() => {
    const now = Date.now();
    lastActivityRef.current = now;
    setLastActivityAt(now);
    localStorage.setItem(LAST_ACTIVITY_KEY, now.toString());
    setIsIdleWarningOpen(false);
  }, []);

  // Update session settings
  const updateSessionSettings = useCallback((updates: Partial<SessionSecuritySettings>) => {
    setSessionSettings(prev => {
      const next = { ...prev, ...updates };
      saveSessionSecuritySettings(next);
      return next;
    });
  }, []);

  // Restore session on initial application load
  useEffect(() => {
    let mounted = true;

    async function restoreSession() {
      try {
        const savedUserStr = localStorage.getItem(USER_STORAGE_KEY);
        const savedStartedAtStr = localStorage.getItem(SESSION_START_KEY);
        const savedActivityStr = localStorage.getItem(LAST_ACTIVITY_KEY);
        const savedToken = localStorage.getItem(ACCESS_TOKEN_KEY);
        const settings = loadSessionSecuritySettings();

        const now = Date.now();
        const startedAt = savedStartedAtStr ? parseInt(savedStartedAtStr, 10) : now;
        const lastActive = savedActivityStr ? parseInt(savedActivityStr, 10) : now;

        // Check if absolute max session expired
        const maxSessionMs = (settings.maxSessionMinutes || 30) * 60 * 1000;
        const isMaxExpired = settings.maxSessionMinutes > 0 && (now - startedAt >= maxSessionMs);

        // Check if idle inactivity expired
        const idleMs = (settings.idleTimeoutMinutes || 15) * 60 * 1000;
        const isIdleExpired = settings.idleTimeoutMinutes > 0 && (now - lastActive >= idleMs);

        if (savedUserStr && !isMaxExpired && !isIdleExpired) {
          const parsedUser = JSON.parse(savedUserStr);
          if (savedToken) {
            setAccessToken(savedToken);
          }
          if (mounted) {
            setUser(parsedUser);
            setSession({ access_token: savedToken || 'stratum_session' });
            setProfile(parsedUser);
            setSessionStartedAt(startedAt);
            setLastActivityAt(lastActive);
            lastActivityRef.current = lastActive;
            sessionStartRef.current = startedAt;
          }

          // Asynchronously silent refresh
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
              .catch(() => {});
          } catch (_) {}
        } else if (savedUserStr) {
          // Expired
          purgeSession();
        } else {
          purgeSession();
        }
      } catch (err) {
        purgeSession();
      } finally {
        if (mounted) setLoading(false);
      }
    }

    restoreSession();

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

  // Real-Time Security & RBAC Live Synchronizer
  useEffect(() => {
    if (!user) return;

    const handleSecuritySync = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (!detail) return;

      const currentUserId = user.id || profile?.id;
      if (detail.userId === currentUserId) {
        if (detail.forceLogout) {
          purgeSession();
        } else {
          // Live refresh profile without requiring re-login
          refreshProfile();
        }
      }
    };

    window.addEventListener('guruom:security_sync', handleSecuritySync);
    return () => window.removeEventListener('guruom:security_sync', handleSecuritySync);
  }, [user, profile]);

  // Passive Activity Listeners (detect mouse, keyboard, touch, scroll)
  useEffect(() => {
    if (!user) return;

    let lastRecord = Date.now();
    const handleUserActivity = () => {
      const now = Date.now();
      // Throttle localStorage writes to once every 2 seconds
      if (now - lastRecord > 2000) {
        lastRecord = now;
        lastActivityRef.current = now;
        setLastActivityAt(now);
        localStorage.setItem(LAST_ACTIVITY_KEY, now.toString());

        // If warning dialog was open, dismiss it when active
        setIsIdleWarningOpen(false);
      }
    };

    const events = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll', 'wheel'];
    events.forEach(evt => window.addEventListener(evt, handleUserActivity, { passive: true }));

    return () => {
      events.forEach(evt => window.removeEventListener(evt, handleUserActivity));
    };
  }, [user]);

  // Periodic Two-Tier Session Expiration Monitor
  useEffect(() => {
    if (!user) return;

    const checkSessionState = () => {
      const now = Date.now();
      const settings = settingsRef.current;
      const startedAt = sessionStartRef.current;
      const lastActive = lastActivityRef.current;

      // Tier 1: Check Absolute Max Session Duration (e.g. 30m / 8h)
      if (settings.maxSessionMinutes > 0) {
        const maxMs = settings.maxSessionMinutes * 60 * 1000;
        if (now - startedAt >= maxMs) {
          console.info(`Max session duration of ${settings.maxSessionMinutes}m reached. Auto logging out...`);
          signOut();
          return;
        }
      }

      // Tier 2: Check Idle Inactivity Timeout (e.g. 15m)
      if (settings.idleTimeoutMinutes > 0) {
        const idleMs = settings.idleTimeoutMinutes * 60 * 1000;
        const elapsedIdle = now - lastActive;

        if (elapsedIdle >= idleMs) {
          console.info(`Idle timeout of ${settings.idleTimeoutMinutes}m reached with no input. Auto logging out...`);
          signOut();
          return;
        }

        // Check for 60s Warning Window
        const warningThresholdMs = idleMs - 60000;
        if (settings.enableIdleWarning && elapsedIdle >= warningThresholdMs) {
          const remainingSec = Math.max(1, Math.ceil((idleMs - elapsedIdle) / 1000));
          setIdleSecondsRemaining(remainingSec);
          setIsIdleWarningOpen(true);
        } else {
          setIsIdleWarningOpen(false);
        }
      } else {
        setIsIdleWarningOpen(false);
      }
    };

    const interval = setInterval(checkSessionState, 1000);
    window.addEventListener('focus', checkSessionState);
    window.addEventListener('visibilitychange', checkSessionState);

    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', checkSessionState);
      window.removeEventListener('visibilitychange', checkSessionState);
    };
  }, [user]);

  const signIn = async (email: string, password?: string) => {
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
      setLoading(false);
      return { error: err instanceof Error ? err : new Error(err?.message || 'Failed to sign in.') };
    }
  };

  const signUp = async (email: string, password?: string, fullName?: string, role: UserRole = 'OPERATOR') => {
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
        sessionSettings,
        updateSessionSettings,
        lastActivityAt,
        sessionStartedAt,
        signIn,
        signUp,
        signOut,
        resetPassword,
        confirmPasswordReset,
        refreshProfile,
        resetIdleTimer
      }}
    >
      {children}

      {/* Floating Inactivity Warning Modal */}
      {isIdleWarningOpen && user && (
        <div className="fixed inset-0 z-100 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-150 font-sans">
          <div className="w-full max-w-md rounded-3xl bg-slate-900 border border-amber-500/40 p-6 shadow-2xl space-y-4 text-white ring-1 ring-amber-500/30">
            <div className="flex items-center gap-3 text-amber-400">
              <div className="p-3 rounded-2xl bg-amber-500/15 border border-amber-500/30 shrink-0 animate-pulse">
                <Clock className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">
                  Inactive Session Warning
                </h3>
                <p className="text-xs text-amber-300/80 font-medium">
                  Auto-logout due to inactivity
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              No keyboard or mouse activity was detected for <strong className="text-white">{sessionSettings.idleTimeoutMinutes} minutes</strong>. For your industrial account security, you will be signed out in:
            </p>

            <div className="py-3 px-4 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-center gap-2">
              <span className="font-mono text-2xl font-black text-amber-400">
                {idleSecondsRemaining}
              </span>
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                seconds remaining
              </span>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => signOut()}
                className="px-4 py-2 rounded-xl border border-slate-800 text-xs font-bold text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer flex items-center gap-1.5"
              >
                <LogOut className="w-3.5 h-3.5" />
                Sign Out Now
              </button>

              <button
                type="button"
                onClick={resetIdleTimer}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 text-xs font-black shadow-lg shadow-amber-500/20 transition-ui cursor-pointer flex items-center gap-1.5"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Stay Logged In
              </button>
            </div>
          </div>
        </div>
      )}
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
