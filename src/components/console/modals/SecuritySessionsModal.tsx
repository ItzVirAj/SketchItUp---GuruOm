import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  Laptop, 
  Smartphone, 
  Tablet, 
  Clock, 
  MapPin, 
  AlertTriangle, 
  CheckCircle2, 
  X, 
  RefreshCw, 
  LogOut, 
  Key, 
  Lock, 
  ShieldAlert, 
  Shield, 
  History, 
  Info
} from 'lucide-react';
import { apiClient } from '../../../lib/apiClient';
import { ActiveSession, SecurityEvent } from '../../../types/console';
import { useAuth } from '../../../context/AuthContext';

interface SecuritySessionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  isDarkMode?: boolean;
  currentUser?: {
    id?: string;
    name?: string;
    email?: string;
    role?: string;
  };
}

export const SecuritySessionsModal: React.FC<SecuritySessionsModalProps> = ({
  isOpen,
  onClose,
  isDarkMode = true,
  currentUser: _currentUser
}) => {
  const { sessionSettings, updateSessionSettings, sessionStartedAt } = useAuth();
  const [activeTab, setActiveTab] = useState<'SESSIONS' | 'HISTORY' | 'TIMEOUTS' | 'PASSWORD'>('SESSIONS');
  const [sessions, setSessions] = useState<ActiveSession[]>([]);
  const [events, setEvents] = useState<SecurityEvent[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Timeouts Configuration State
  const [tempIdleTimeout, setTempIdleTimeout] = useState<number>(sessionSettings.idleTimeoutMinutes);
  const [tempMaxSession, setTempMaxSession] = useState<number>(sessionSettings.maxSessionMinutes);
  const [tempWarningEnabled, setTempWarningEnabled] = useState<boolean>(sessionSettings.enableIdleWarning);

  const [prevIsOpen, setPrevIsOpen] = useState(isOpen);
  if (isOpen !== prevIsOpen) {
    setPrevIsOpen(isOpen);
    if (isOpen) {
      setTempIdleTimeout(sessionSettings.idleTimeoutMinutes);
      setTempMaxSession(sessionSettings.maxSessionMinutes);
      setTempWarningEnabled(sessionSettings.enableIdleWarning);
    }
  }

  const handleSaveTimeouts = () => {
    updateSessionSettings({
      idleTimeoutMinutes: tempIdleTimeout,
      maxSessionMinutes: tempMaxSession,
      enableIdleWarning: tempWarningEnabled
    });
    setActionSuccess(`Session security policies updated! Idle timeout: ${tempIdleTimeout ? `${tempIdleTimeout}m` : 'Disabled'}, max session: ${tempMaxSession >= 60 ? `${tempMaxSession / 60}h` : `${tempMaxSession}m`}.`);
  };

  // Revoke Dialog State
  const [sessionToRevoke, setSessionToRevoke] = useState<ActiveSession | null>(null);
  const [showRevokeOthersModal, setShowRevokeOthersModal] = useState<boolean>(false);
  const [isRevoking, setIsRevoking] = useState<boolean>(false);

  // Password Change State
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  // Fetch Sessions and Security Events
  const fetchSecurityData = async () => {
    setIsRefreshing(true);
    setActionError(null);
    try {
      const [sessionsRes, eventsRes] = await Promise.all([
        apiClient.get<{ sessions: ActiveSession[] }>('/auth/sessions').catch(() => ({ sessions: [] })),
        apiClient.get<{ events: SecurityEvent[] }>('/auth/security-events').catch(() => ({ events: [] }))
      ]);

      if (sessionsRes?.sessions) {
        setSessions(sessionsRes.sessions);
      }
      if (eventsRes?.events) {
        setEvents(eventsRes.events);
      }
    } catch (err: unknown) {
      console.warn('Failed to fetch security data:', err);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    if (!isOpen) return;
    let isMounted = true;
    Promise.all([
      apiClient.get<{ sessions: ActiveSession[] }>('/auth/sessions').catch(() => ({ sessions: [] })),
      apiClient.get<{ events: SecurityEvent[] }>('/auth/security-events').catch(() => ({ events: [] }))
    ]).then(([sessionsRes, eventsRes]) => {
      if (!isMounted) return;
      if (sessionsRes?.sessions) {
        setSessions(sessionsRes.sessions);
      }
      if (eventsRes?.events) {
        setEvents(eventsRes.events);
      }
      setLoading(false);
    }).catch((err: unknown) => {
      if (!isMounted) return;
      console.warn('Failed to fetch security data:', err);
      setLoading(false);
    });

    return () => {
      isMounted = false;
    };
  }, [isOpen]);

  if (!isOpen) return null;

  // Single Session Revocation
  const handleRevokeSingle = async () => {
    if (!sessionToRevoke) return;
    setIsRevoking(true);
    setActionError(null);
    try {
      await apiClient.delete(`/auth/sessions/${sessionToRevoke.id}`);
      setActionSuccess(`Session on "${sessionToRevoke.device}" was revoked.`);
      setSessionToRevoke(null);
      await fetchSecurityData();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to revoke session.';
      setActionError(message);
    } finally {
      setIsRevoking(false);
    }
  };

  // Revoke All Other Sessions
  const handleRevokeOthers = async () => {
    setIsRevoking(true);
    setActionError(null);
    try {
      const res = await apiClient.post<{ revokedCount: number; message: string }>('/auth/sessions/revoke-others');
      setActionSuccess(res?.message || 'All other active sessions have been signed out.');
      setShowRevokeOthersModal(false);
      await fetchSecurityData();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to revoke other sessions.';
      setActionError(message);
    } finally {
      setIsRevoking(false);
    }
  };

  // Change Password
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setActionError('New passwords do not match.');
      return;
    }
    if (newPassword.length < 8) {
      setActionError('Password must be at least 8 characters long.');
      return;
    }

    setIsChangingPassword(true);
    setActionError(null);
    setActionSuccess(null);
    try {
      const res = await apiClient.post<{ message: string }>('/auth/change-password', {
        oldPassword,
        newPassword
      });
      setActionSuccess(res?.message || 'Password changed successfully. Other devices signed out.');
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
      await fetchSecurityData();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to change password.';
      setActionError(message);
    } finally {
      setIsChangingPassword(false);
    }
  };

  const getDeviceIcon = (deviceType: string) => {
    if (deviceType === 'mobile') return <Smartphone className="w-4 h-4 text-indigo-500 dark:text-indigo-400" />;
    if (deviceType === 'tablet') return <Tablet className="w-4 h-4 text-purple-500 dark:text-purple-400" />;
    return <Laptop className="w-4 h-4 text-[#4763F5] dark:text-[#7A92FF]" />;
  };

  const getEventBadge = (type: string, severity: string) => {
    if (severity === 'CRITICAL' || type === 'REFRESH_TOKEN_REUSE') {
      return 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20';
    }
    if (severity === 'HIGH' || type === 'SUSPICIOUS_LOGIN') {
      return 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20';
    }
    if (type === 'PASSWORD_CHANGED' || type === 'ALL_OTHER_SESSIONS_REVOKED') {
      return 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20';
    }
    return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20';
  };

  const formatTimestamp = (dateStr?: string) => {
    if (!dateStr) return 'Just now';
    try {
      const d = new Date(dateStr);
      return d.toLocaleString('en-IN', {
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      });
    } catch {
      return dateStr;
    }
  };

  const otherSessionsCount = sessions.filter(s => !s.isCurrent).length;

  const inputClass = `h-10 w-full rounded-xl border px-3 text-xs font-normal outline-none transition-all duration-150 ${
    isDarkMode 
      ? 'border-white/[0.1] bg-white/[0.04] text-neutral-100 placeholder:text-neutral-500 hover:border-white/[0.18] focus:border-[#4763F5] focus:ring-2 focus:ring-[#4763F5]/30' 
      : 'border-black/[0.1] bg-white text-neutral-900 placeholder:text-neutral-400 hover:border-black/[0.18] focus:border-[#4763F5] focus:ring-2 focus:ring-[#4763F5]/20'
  }`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/40 dark:bg-black/65 backdrop-blur-md font-sans animate-in fade-in duration-200">
      <div 
        className={`w-full max-w-3xl rounded-2xl sm:rounded-3xl border shadow-[0_24px_70px_rgba(0,0,0,0.16)] dark:shadow-[0_24px_70px_rgba(0,0,0,0.8)] overflow-hidden flex flex-col max-h-[90vh] transition-colors ${
          isDarkMode ? 'bg-[#18181B] border-white/[0.1] text-neutral-100' : 'bg-white border-black/[0.08] text-neutral-900'
        }`}
      >
        {/* Apple Modal Header */}
        <div className={`px-5 sm:px-6 py-4 border-b flex items-center justify-between gap-4 ${
          isDarkMode ? 'border-white/[0.08]' : 'border-black/[0.06]'
        }`}>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-[#4763F5]/10 text-[#4763F5] dark:text-[#7A92FF] border border-[#4763F5]/20 shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm sm:text-base font-semibold tracking-tight text-neutral-900 dark:text-neutral-100">
                  Security & Active Sessions
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                  Protected
                </span>
              </div>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                Manage connected devices, security events, and session policies.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={fetchSecurityData}
              disabled={isRefreshing}
              className={`h-8 w-8 rounded-lg flex items-center justify-center transition-colors cursor-pointer ${
                isRefreshing ? 'opacity-50' : ''
              } ${
                isDarkMode 
                  ? 'text-neutral-400 hover:text-white hover:bg-white/[0.08]' 
                  : 'text-neutral-500 hover:text-neutral-900 hover:bg-black/[0.05]'
              }`}
              title="Refresh security telemetry"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            </button>

            <button
              type="button"
              onClick={onClose}
              aria-label="Close modal"
              className={`h-8 w-8 rounded-lg flex items-center justify-center transition-colors cursor-pointer ${
                isDarkMode 
                  ? 'text-neutral-400 hover:text-white hover:bg-white/[0.08]' 
                  : 'text-neutral-500 hover:text-neutral-900 hover:bg-black/[0.05]'
              }`}
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Apple Segmented Control Tab Switcher */}
        <div className={`px-5 sm:px-6 py-2.5 border-b flex items-center ${
          isDarkMode ? 'border-white/[0.08] bg-white/[0.02]' : 'border-black/[0.06] bg-black/[0.02]'
        }`}>
          <div className={`p-1 rounded-xl flex items-center gap-1 overflow-x-auto scrollbar-none w-full sm:w-auto border ${
            isDarkMode 
              ? 'bg-black/30 border-white/[0.06]' 
              : 'bg-black/[0.04] border-black/[0.04]'
          }`}>
            {[
              { id: 'SESSIONS', label: 'Active Sessions', count: sessions.length, icon: Laptop },
              { id: 'HISTORY', label: 'Security History', icon: History, alert: events.some(e => e.severity === 'HIGH' || e.severity === 'CRITICAL') },
              { id: 'TIMEOUTS', label: 'Session & Timeout', icon: Clock, badge: sessionSettings.idleTimeoutMinutes ? `${sessionSettings.idleTimeoutMinutes}m` : 'Off' },
              { id: 'PASSWORD', label: 'Password & Auth', icon: Key }
            ].map((tab) => {
              const isActive = activeTab === tab.id;
              const TabIcon = tab.icon;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => {
                    setActiveTab(tab.id as 'SESSIONS' | 'HISTORY' | 'TIMEOUTS' | 'PASSWORD');
                    setActionError(null);
                    setActionSuccess(null);
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 select-none ${
                    isActive
                      ? isDarkMode
                        ? 'bg-white/[0.14] text-white shadow-xs font-semibold'
                        : 'bg-white text-neutral-900 shadow-xs font-semibold'
                      : isDarkMode
                        ? 'text-neutral-400 hover:text-white hover:bg-white/[0.05] font-medium'
                        : 'text-neutral-600 hover:text-neutral-900 hover:bg-black/[0.03] font-medium'
                  }`}
                >
                  <TabIcon className="w-3.5 h-3.5" />
                  <span>{tab.label}</span>
                  {tab.count !== undefined && (
                    <span className={`text-[10px] px-1.5 py-0.2 rounded-md font-mono ${
                      isActive 
                        ? isDarkMode ? 'bg-white/20 text-white' : 'bg-black/10 text-neutral-900' 
                        : isDarkMode ? 'bg-white/10 text-neutral-400' : 'bg-black/[0.06] text-neutral-600'
                    }`}>
                      {tab.count}
                    </span>
                  )}
                  {tab.badge && (
                    <span className={`text-[9px] px-1.5 py-0.2 rounded-md font-mono font-bold ${
                      isActive 
                        ? isDarkMode ? 'bg-white/20 text-white' : 'bg-[#4763F5]/15 text-[#4763F5]' 
                        : 'bg-blue-500/10 text-blue-600 dark:text-blue-400'
                    }`}>
                      {tab.badge}
                    </span>
                  )}
                  {tab.alert && (
                    <span className="w-1.5 h-1.5 rounded-full bg-[#FF3B30] animate-pulse" />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Action Alerts */}
        {actionSuccess && (
          <div className="mx-5 sm:mx-6 mt-4 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-400 text-xs flex items-center justify-between font-mono animate-in fade-in">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
              <span>{actionSuccess}</span>
            </div>
            <button onClick={() => setActionSuccess(null)} className="text-neutral-400 hover:text-neutral-700 dark:hover:text-white cursor-pointer">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {actionError && (
          <div className="mx-5 sm:mx-6 mt-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-700 dark:text-rose-400 text-xs flex items-center justify-between font-mono animate-in fade-in">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600 dark:text-rose-400" />
              <span>{actionError}</span>
            </div>
            <button onClick={() => setActionError(null)} className="text-neutral-400 hover:text-neutral-700 dark:hover:text-white cursor-pointer">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Content Body */}
        <div className="p-5 sm:p-6 overflow-y-auto flex-1 space-y-4">
          
          {/* TAB 1: ACTIVE SESSIONS */}
          {activeTab === 'SESSIONS' && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-neutral-400">
                    Logged-in Devices
                  </h3>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                    Sessions authenticated with rotating HMAC token families.
                  </p>
                </div>

                {otherSessionsCount > 0 && (
                  <button
                    type="button"
                    onClick={() => setShowRevokeOthersModal(true)}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium text-rose-600 dark:text-rose-400 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/25 transition-all cursor-pointer flex items-center gap-1.5 active:scale-95 shadow-2xs"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    Revoke Other Sessions ({otherSessionsCount})
                  </button>
                )}
              </div>

              {loading ? (
                <div className="py-12 flex flex-col items-center justify-center text-neutral-400 text-xs gap-2">
                  <RefreshCw className="w-5 h-5 animate-spin text-[#4763F5]" />
                  <span>Loading active sessions...</span>
                </div>
              ) : sessions.length === 0 ? (
                <div className="py-12 text-center text-xs text-neutral-400 font-mono">
                  No active sessions found.
                </div>
              ) : (
                <div className="space-y-2.5">
                  {sessions.map((session) => (
                    <div
                      key={session.id}
                      className={`p-3.5 rounded-xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3.5 ${
                        session.isCurrent 
                          ? isDarkMode
                            ? 'bg-[#4763F5]/10 border-[#4763F5]/30'
                            : 'bg-[#4763F5]/5 border-[#4763F5]/30'
                          : isDarkMode
                            ? 'bg-white/[0.03] border-white/[0.08] hover:border-white/[0.15]'
                            : 'bg-neutral-50/80 border-black/[0.06] hover:border-black/[0.12]'
                      }`}
                    >
                      <div className="flex items-start gap-3 min-w-0">
                        <div className={`p-2 rounded-lg border shrink-0 ${
                          session.isCurrent 
                            ? 'bg-[#4763F5]/15 border-[#4763F5]/30 text-[#4763F5] dark:text-[#7A92FF]' 
                            : isDarkMode
                              ? 'bg-white/[0.05] border-white/[0.08] text-neutral-400'
                              : 'bg-black/[0.04] border-black/[0.06] text-neutral-600'
                        }`}>
                          {getDeviceIcon(session.deviceType)}
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-semibold text-xs text-neutral-900 dark:text-neutral-100 truncate">
                              {session.device} • {session.browser}
                            </span>
                            {session.isCurrent && (
                              <span className="px-2 py-0.5 rounded-full text-[9px] font-mono font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                                This Device (Active)
                              </span>
                            )}
                          </div>

                          <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-neutral-500 dark:text-neutral-400 font-mono">
                            <span className="flex items-center gap-1">
                              <MapPin className="w-3 h-3 text-neutral-400" />
                              {session.location || 'Local Workstation'}
                            </span>
                            <span>•</span>
                            <span>{session.ip}</span>
                            <span>•</span>
                            <span>Last active {formatTimestamp(session.lastActiveAt)}</span>
                          </div>
                        </div>
                      </div>

                      {!session.isCurrent && (
                        <div className="shrink-0 flex items-center justify-end">
                          <button
                            type="button"
                            onClick={() => setSessionToRevoke(session)}
                            className="px-3 py-1 rounded-lg border border-rose-500/25 bg-rose-500/5 hover:bg-rose-500/15 text-rose-600 dark:text-rose-400 text-xs font-medium transition-all cursor-pointer flex items-center gap-1.5 active:scale-95"
                          >
                            <LogOut className="w-3 h-3" />
                            Revoke
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: LOGIN HISTORY & SECURITY EVENTS */}
          {activeTab === 'HISTORY' && (
            <div className="space-y-4">
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wider text-neutral-400">
                  Security Event Audit Trail
                </h3>
                <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                  Recent sign-in attempts, token rotations, and geographic events.
                </p>
              </div>

              {loading ? (
                <div className="py-12 flex flex-col items-center justify-center text-neutral-400 text-xs gap-2">
                  <RefreshCw className="w-5 h-5 animate-spin text-[#4763F5]" />
                  <span>Loading event trail...</span>
                </div>
              ) : events.length === 0 ? (
                <div className="py-12 text-center text-xs text-neutral-400 font-mono">
                  No security incidents or suspicious events logged.
                </div>
              ) : (
                <div className="space-y-2">
                  {events.map((ev) => (
                    <div
                      key={ev.id}
                      className={`p-3 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                        isDarkMode 
                          ? 'border-white/[0.08] bg-white/[0.03]' 
                          : 'border-black/[0.06] bg-neutral-50/80'
                      }`}
                    >
                      <div className="flex items-start gap-3 min-w-0">
                        <div className={`p-1.5 rounded-lg shrink-0 mt-0.5 ${
                          isDarkMode ? 'bg-white/[0.05] text-neutral-400' : 'bg-black/[0.04] text-neutral-600'
                        }`}>
                          {ev.severity === 'CRITICAL' || ev.severity === 'HIGH' ? (
                            <ShieldAlert className="w-4 h-4 text-rose-500 dark:text-rose-400" />
                          ) : (
                            <Shield className="w-4 h-4 text-[#4763F5] dark:text-[#7A92FF]" />
                          )}
                        </div>

                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-semibold text-neutral-900 dark:text-neutral-100">
                              {ev.event_type.replace(/_/g, ' ')}
                            </span>
                            <span className={`text-[10px] font-mono font-semibold px-2 py-0.2 rounded-full border ${getEventBadge(ev.event_type, ev.severity)}`}>
                              {ev.severity}
                            </span>
                          </div>

                          <p className="text-xs text-neutral-600 dark:text-neutral-300">
                            {ev.device_name || 'Browser'} • {ev.city || 'Pune'}, {ev.country || 'India'}
                          </p>

                          {ev.flagged_reasons && ev.flagged_reasons.length > 0 && (
                            <div className="flex flex-wrap gap-1 pt-1">
                              {ev.flagged_reasons.map((r, i) => (
                                <span 
                                  key={i}
                                  className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20"
                                >
                                  {r.replace(/_/g, ' ')}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>

                      <span className="text-[11px] text-neutral-400 font-mono shrink-0">
                        {formatTimestamp(ev.created_at)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: SESSION TIMEOUT & INACTIVITY PREFERENCES */}
          {activeTab === 'TIMEOUTS' && (
            <div className="space-y-4">
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wider text-neutral-400 flex items-center gap-2">
                  <Clock className="w-3.5 h-3.5 text-[#4763F5] dark:text-[#7A92FF]" />
                  <span>Session & Inactivity Policies</span>
                </h3>
                <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                  Configure automated idle logout timers and maximum session lifetime.
                </p>
              </div>

              {/* Setting 1: Inactivity Idle Logout */}
              <div className={`p-4 rounded-xl border space-y-2.5 ${
                isDarkMode ? 'border-white/[0.08] bg-white/[0.03]' : 'border-black/[0.06] bg-neutral-50/80'
              }`}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h4 className="text-xs font-semibold text-neutral-900 dark:text-neutral-100">
                      Inactivity Idle Logout
                    </h4>
                    <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                      Signs out when completely idle. Keyboard and mouse activity resets the timer.
                    </p>
                  </div>
                  <span className="shrink-0 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-[#4763F5]/10 text-[#4763F5] dark:text-[#7A92FF] border border-[#4763F5]/25">
                    {tempIdleTimeout === 0 ? 'Disabled' : `${tempIdleTimeout} Minutes`}
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 pt-1">
                  {[
                    { value: 5, label: '5 min' },
                    { value: 10, label: '10 min' },
                    { value: 15, label: '15 min' },
                    { value: 30, label: '30 min' },
                    { value: 0, label: 'Disabled' }
                  ].map(opt => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setTempIdleTimeout(opt.value)}
                      className={`p-2 rounded-lg border text-xs font-medium transition-all cursor-pointer text-center active:scale-95 ${
                        tempIdleTimeout === opt.value
                          ? 'bg-[#4763F5] text-white border-[#4763F5] shadow-xs font-semibold'
                          : isDarkMode
                            ? 'bg-white/[0.04] border-white/[0.08] text-neutral-300 hover:bg-white/[0.08]'
                            : 'bg-white border-black/[0.08] text-neutral-700 hover:bg-neutral-100'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Setting 2: Maximum Absolute Session Ceiling */}
              <div className={`p-4 rounded-xl border space-y-2.5 ${
                isDarkMode ? 'border-white/[0.08] bg-white/[0.03]' : 'border-black/[0.06] bg-neutral-50/80'
              }`}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h4 className="text-xs font-semibold text-neutral-900 dark:text-neutral-100">
                      Absolute Maximum Session Duration
                    </h4>
                    <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                      Enforces maximum total duration from initial sign-in.
                    </p>
                  </div>
                  <span className="shrink-0 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/25">
                    {tempMaxSession >= 60 ? `${tempMaxSession / 60} Hour${tempMaxSession > 60 ? 's' : ''}` : `${tempMaxSession} Minutes`}
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 pt-1">
                  {[
                    { value: 30, label: '30 min' },
                    { value: 60, label: '1 Hour' },
                    { value: 120, label: '2 Hours' },
                    { value: 480, label: '8 Hours' },
                    { value: 1440, label: '24 Hours' }
                  ].map(opt => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setTempMaxSession(opt.value)}
                      className={`p-2 rounded-lg border text-xs font-medium transition-all cursor-pointer text-center active:scale-95 ${
                        tempMaxSession === opt.value
                          ? 'bg-amber-600 text-white border-amber-600 shadow-xs font-semibold'
                          : isDarkMode
                            ? 'bg-white/[0.04] border-white/[0.08] text-neutral-300 hover:bg-white/[0.08]'
                            : 'bg-white border-black/[0.08] text-neutral-700 hover:bg-neutral-100'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Setting 3: Inactivity Warning Toggle (Apple Switch) */}
              <div className={`p-3.5 rounded-xl border flex items-center justify-between gap-4 ${
                isDarkMode ? 'border-white/[0.08] bg-white/[0.03]' : 'border-black/[0.06] bg-neutral-50/80'
              }`}>
                <div>
                  <h4 className="text-xs font-semibold text-neutral-900 dark:text-neutral-100">
                    60-Second Inactivity Warning Dialog
                  </h4>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                    Displays a countdown prompt before an idle logout occurs.
                  </p>
                </div>

                <label className="relative inline-flex items-center cursor-pointer shrink-0">
                  <input
                    type="checkbox"
                    checked={tempWarningEnabled}
                    onChange={(e) => setTempWarningEnabled(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className={`w-11 h-6 rounded-full peer peer-focus:outline-none transition-colors after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all after:shadow-xs peer-checked:after:translate-x-full ${
                    isDarkMode ? 'bg-neutral-700 peer-checked:bg-[#34C759]' : 'bg-neutral-300 peer-checked:bg-[#34C759]'
                  }`}></div>
                </label>
              </div>

              {/* Live Session Telemetry Card */}
              <div className={`p-3.5 rounded-xl border font-mono text-xs space-y-2 ${
                isDarkMode ? 'border-white/[0.08] bg-black/25' : 'border-black/[0.06] bg-neutral-100/70'
              }`}>
                <div className={`flex items-center justify-between text-[11px] border-b pb-2 ${
                  isDarkMode ? 'border-white/[0.06]' : 'border-black/[0.06]'
                }`}>
                  <span className="text-neutral-500 dark:text-neutral-400">Workstation Status:</span>
                  <span className="text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    Online & Protected
                  </span>
                </div>
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-neutral-500 dark:text-neutral-400">Session Started:</span>
                  <span className="font-semibold text-neutral-900 dark:text-neutral-100">
                    {new Date(sessionStartedAt).toLocaleTimeString()}
                  </span>
                </div>
              </div>

              {/* Save Button */}
              <div className="pt-2 flex items-center justify-end">
                <button
                  type="button"
                  onClick={handleSaveTimeouts}
                  className="px-4 py-2 rounded-xl bg-[#4763F5] hover:bg-[#3952D8] text-white text-xs font-semibold shadow-xs transition-all cursor-pointer flex items-center gap-1.5 active:scale-95"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Apply Policy Changes</span>
                </button>
              </div>
            </div>
          )}

          {/* TAB 4: PASSWORD & CREDENTIALS */}
          {activeTab === 'PASSWORD' && (
            <form onSubmit={handleChangePassword} className="space-y-4 max-w-md">
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wider text-neutral-400">
                  Change Password
                </h3>
                <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                  Updating your password will revoke all other active sessions.
                </p>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                    Current Password
                  </label>
                  <input
                    type="password"
                    value={oldPassword}
                    onChange={(e) => setOldPassword(e.target.value)}
                    required
                    placeholder="Enter current password"
                    className={inputClass}
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                    New Password
                  </label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    placeholder="Minimum 8 characters"
                    className={inputClass}
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                    Confirm New Password
                  </label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    placeholder="Re-enter new password"
                    className={inputClass}
                  />
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isChangingPassword}
                  className="px-4 py-2 rounded-xl bg-[#4763F5] hover:bg-[#3952D8] text-white text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 shadow-xs active:scale-95 disabled:opacity-50"
                >
                  {isChangingPassword ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Lock className="w-3.5 h-3.5" />}
                  <span>Update Password</span>
                </button>
              </div>
            </form>
          )}

        </div>

        {/* Apple Modal Footer */}
        <div className={`px-5 sm:px-6 py-3.5 border-t flex items-center justify-between text-xs transition-colors ${
          isDarkMode ? 'border-white/[0.08] bg-white/[0.02] text-neutral-400' : 'border-black/[0.06] bg-neutral-50/80 text-neutral-500'
        }`}>
          <div className="flex items-center gap-1.5">
            <Info className="w-3.5 h-3.5 text-neutral-400" />
            <span className="font-mono text-[11px]">Protected with Argon2id & HMAC token rotation</span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className={`px-4 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer active:scale-95 border ${
              isDarkMode 
                ? 'border-white/[0.1] bg-white/[0.06] hover:bg-white/[0.1] text-neutral-200' 
                : 'border-black/[0.1] bg-white hover:bg-neutral-100 text-neutral-800 shadow-2xs'
            }`}
          >
            Done
          </button>
        </div>

      </div>

      {/* Confirmation Modal: Revoke Single Session (Apple HIG Alert Style) */}
      {sessionToRevoke && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/40 dark:bg-black/65 backdrop-blur-md animate-in fade-in">
          <div className={`w-full max-w-sm rounded-2xl p-5 shadow-2xl space-y-3.5 border ${
            isDarkMode ? 'bg-[#1C1C1E] border-white/[0.12] text-white' : 'bg-white border-black/[0.08] text-neutral-900'
          }`}>
            <div className="flex items-center gap-2.5 text-rose-500">
              <div className="p-2 rounded-xl bg-rose-500/10 border border-rose-500/20">
                <AlertTriangle className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-semibold">
                Revoke this session?
              </h3>
            </div>

            <p className="text-xs text-neutral-500 dark:text-neutral-400 leading-relaxed">
              The device <span className="font-semibold text-neutral-900 dark:text-neutral-100">"{sessionToRevoke.device}"</span> will be signed out the next time it connects.
            </p>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setSessionToRevoke(null)}
                disabled={isRevoking}
                className={`px-3 py-1.5 rounded-lg border text-xs font-medium transition-all cursor-pointer ${
                  isDarkMode 
                    ? 'border-white/[0.1] text-neutral-300 hover:bg-white/[0.06]' 
                    : 'border-black/[0.1] text-neutral-700 hover:bg-black/[0.04]'
                }`}
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleRevokeSingle}
                disabled={isRevoking}
                className="px-3.5 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 active:scale-95 shadow-xs"
              >
                {isRevoking ? <RefreshCw className="w-3 h-3 animate-spin" /> : null}
                <span>Revoke</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal: Revoke Other Sessions (Apple HIG Alert Style) */}
      {showRevokeOthersModal && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/40 dark:bg-black/65 backdrop-blur-md animate-in fade-in">
          <div className={`w-full max-w-sm rounded-2xl p-5 shadow-2xl space-y-3.5 border ${
            isDarkMode ? 'bg-[#1C1C1E] border-white/[0.12] text-white' : 'bg-white border-black/[0.08] text-neutral-900'
          }`}>
            <div className="flex items-center gap-2.5 text-rose-500">
              <div className="p-2 rounded-xl bg-rose-500/10 border border-rose-500/20">
                <LogOut className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-semibold">
                Sign out other devices?
              </h3>
            </div>

            <p className="text-xs text-neutral-500 dark:text-neutral-400 leading-relaxed">
              This keeps your current workstation active and revokes all other connected sessions.
            </p>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowRevokeOthersModal(false)}
                disabled={isRevoking}
                className={`px-3 py-1.5 rounded-lg border text-xs font-medium transition-all cursor-pointer ${
                  isDarkMode 
                    ? 'border-white/[0.1] text-neutral-300 hover:bg-white/[0.06]' 
                    : 'border-black/[0.1] text-neutral-700 hover:bg-black/[0.04]'
                }`}
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleRevokeOthers}
                disabled={isRevoking}
                className="px-3.5 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 active:scale-95 shadow-xs"
              >
                {isRevoking ? <RefreshCw className="w-3 h-3 animate-spin" /> : null}
                <span>Sign Out Others</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default SecuritySessionsModal;
