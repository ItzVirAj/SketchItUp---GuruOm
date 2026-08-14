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
  resetPassword: (email: string) => Promise<{ error: Error | null }>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<any | null>(null);
  const [session, setSession] = useState<any | null>(null);
  const [profile, setProfile] = useState<SystemUser | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Restore session on initial application load via httpOnly refresh cookie
  useEffect(() => {
    let mounted = true;

    async function restoreSession() {
      try {
        const res = await apiClient.post<{ access_token: string; user: SystemUser }>('/auth/refresh');
        if (mounted && res?.access_token && res?.user) {
          setAccessToken(res.access_token);
          setUser(res.user);
          setSession({ access_token: res.access_token });
          setProfile(res.user);
          localStorage.setItem('stratum_user', JSON.stringify(res.user));
        }
      } catch (err) {
        // No active session or cookie not present - user remains unauthenticated
        setAccessToken(null);
        setUser(null);
        setSession(null);
        setProfile(null);
      } finally {
        if (mounted) setLoading(false);
      }
    }

    restoreSession();

    // Listen for unexpected token expiration or revoked session from apiClient
    const unsubscribe = onAuthFailure(() => {
      if (mounted) {
        setUser(null);
        setSession(null);
        setProfile(null);
        localStorage.removeItem('stratum_user');
      }
    });

    return () => {
      mounted = false;
      unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password = '1234567890') => {
    setLoading(true);
    const cleanEmail = email.trim().toLowerCase();

    try {
      const res = await apiClient.post<{ access_token: string; user: SystemUser }>('/auth/login', {
        email: cleanEmail,
        password
      });

      if (res?.access_token && res?.user) {
        setAccessToken(res.access_token);
        setUser(res.user);
        setSession({ access_token: res.access_token });
        setProfile(res.user);
        localStorage.setItem('stratum_user', JSON.stringify(res.user));
        setLoading(false);
        return { error: null };
      }

      throw new Error('Invalid response received from authentication server.');
    } catch (err: any) {
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
      setAccessToken(null);
      setUser(null);
      setSession(null);
      setProfile(null);
      localStorage.removeItem('stratum_user');
      setLoading(false);
    }
  };

  const resetPassword = async (email: string) => {
    try {
      return { error: null };
    } catch (err: any) {
      return { error: err instanceof Error ? err : new Error('Failed to send reset link.') };
    }
  };

  const refreshProfile = async () => {
    try {
      const res = await apiClient.get<{ user: SystemUser }>('/auth/me');
      if (res?.user) {
        setUser(res.user);
        setProfile(res.user);
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
