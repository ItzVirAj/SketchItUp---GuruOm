import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  Laptop, 
  Smartphone, 
  Tablet, 
  Globe, 
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
  ExternalLink,
  ChevronRight,
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
  currentUser
}) => {
  const { sessionSettings, updateSessionSettings, sessionStartedAt, lastActivityAt } = useAuth();
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

  useEffect(() => {
    if (isOpen) {
      setTempIdleTimeout(sessionSettings.idleTimeoutMinutes);
      setTempMaxSession(sessionSettings.maxSessionMinutes);
      setTempWarningEnabled(sessionSettings.enableIdleWarning);
    }
  }, [isOpen, sessionSettings]);

  const handleSaveTimeouts = () => {
    updateSessionSettings({
      idleTimeoutMinutes: tempIdleTimeout,
      maxSessionMinutes: tempMaxSession,
      enableIdleWarning: tempWarningEnabled
    });
    setActionSuccess(`Session security policies updated! Idle inactivity timeout is set to ${tempIdleTimeout ? `${tempIdleTimeout}m` : 'Disabled'} and absolute max session is ${tempMaxSession >= 60 ? `${tempMaxSession / 60}h` : `${tempMaxSession}m`}.`);
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
    } catch (err: any) {
      console.warn('Failed to fetch security data:', err);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchSecurityData();
    }
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
    } catch (err: any) {
      setActionError(err.message || 'Failed to revoke session.');
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
    } catch (err: any) {
      setActionError(err.message || 'Failed to revoke other sessions.');
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
    } catch (err: any) {
      setActionError(err.message || 'Failed to change password.');
    } finally {
      setIsChangingPassword(false);
    }
  };

  const getDeviceIcon = (deviceType: string, browser: string) => {
    if (deviceType === 'mobile') return <Smartphone className="w-5 h-5 text-indigo-500" />;
    if (deviceType === 'tablet') return <Tablet className="w-5 h-5 text-violet-500" />;
    return <Laptop className="w-5 h-5 text-[#5B75F8]" />;
  };

  const getEventBadge = (type: string, severity: string) => {
    if (severity === 'CRITICAL' || type === 'REFRESH_TOKEN_REUSE') {
      return 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30';
    }
    if (severity === 'HIGH' || type === 'SUSPICIOUS_LOGIN') {
      return 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30';
    }
    if (type === 'PASSWORD_CHANGED' || type === 'ALL_OTHER_SESSIONS_REVOKED') {
      return 'bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-500/30';
    }
    return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30';
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs font-sans animate-in fade-in duration-200">
      <div 
        className={`w-full max-w-3xl rounded-2xl border shadow-2xl overflow-hidden flex flex-col max-h-[90vh] transition-all ${
          isDarkMode ? 'bg-[#16171B] border-[#262832] text-slate-200' : 'bg-white border-[#d8dde8] text-slate-900'
        }`}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#d8dde8] dark:border-[#262832] flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-[#5B75F8]/10 text-[#5B75F8] dark:text-[#7B92FF] border border-[#5B75F8]/20">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-black text-slate-900 dark:text-white">
                Security & Active Sessions
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Manage connected devices, token rotation, and inspect suspicious login events.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={fetchSecurityData}
              disabled={isRefreshing}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              title="Refresh security data"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="px-6 border-b border-[#d8dde8] dark:border-[#262832] flex items-center gap-2 pt-2 bg-slate-50/50 dark:bg-[#121316]">
          <button
            type="button"
            onClick={() => { setActiveTab('SESSIONS'); setActionError(null); setActionSuccess(null); }}
            className={`pb-2.5 px-3 text-xs font-bold border-b-2 flex items-center gap-1.5 transition-all cursor-pointer ${
              activeTab === 'SESSIONS'
                ? 'border-[#5B75F8] text-[#5B75F8] dark:text-[#7B92FF]'
                : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <Laptop className="w-3.5 h-3.5" />
            Active Sessions
            <span className="ml-1 text-[10px] px-1.5 py-0.2 rounded-full bg-slate-200 dark:bg-slate-800 font-mono">
              {sessions.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => { setActiveTab('HISTORY'); setActionError(null); setActionSuccess(null); }}
            className={`pb-2.5 px-3 text-xs font-bold border-b-2 flex items-center gap-1.5 transition-all cursor-pointer ${
              activeTab === 'HISTORY'
                ? 'border-[#5B75F8] text-[#5B75F8] dark:text-[#7B92FF]'
                : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            Login & Security History
            {events.some(e => e.severity === 'HIGH' || e.severity === 'CRITICAL') && (
              <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
            )}
          </button>

          <button
            type="button"
            onClick={() => { setActiveTab('TIMEOUTS'); setActionError(null); setActionSuccess(null); }}
            className={`pb-2.5 px-3 text-xs font-bold border-b-2 flex items-center gap-1.5 transition-all cursor-pointer ${
              activeTab === 'TIMEOUTS'
                ? 'border-[#5B75F8] text-[#5B75F8] dark:text-[#7B92FF]'
                : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            Session & Idle Timeout
            <span className="text-[9px] px-1.5 py-0.2 rounded-md bg-indigo-500/10 text-indigo-500 font-mono font-bold">
              {sessionSettings.idleTimeoutMinutes ? `${sessionSettings.idleTimeoutMinutes}m idle` : 'Off'}
            </span>
          </button>

          <button
            type="button"
            onClick={() => { setActiveTab('PASSWORD'); setActionError(null); setActionSuccess(null); }}
            className={`pb-2.5 px-3 text-xs font-bold border-b-2 flex items-center gap-1.5 transition-all cursor-pointer ${
              activeTab === 'PASSWORD'
                ? 'border-[#5B75F8] text-[#5B75F8] dark:text-[#7B92FF]'
                : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <Key className="w-3.5 h-3.5" />
            Password & Credentials
          </button>
        </div>

        {/* Action Alerts */}
        {actionSuccess && (
          <div className="mx-6 mt-4 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{actionSuccess}</span>
          </div>
        )}

        {actionError && (
          <div className="mx-6 mt-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{actionError}</span>
          </div>
        )}

        {/* Content Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-4">
          
          {/* TAB 1: ACTIVE SESSIONS */}
          {activeTab === 'SESSIONS' && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Logged-in Devices
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Sessions currently authenticated with rotating refresh tokens.
                  </p>
                </div>

                {otherSessionsCount > 0 && (
                  <button
                    type="button"
                    onClick={() => setShowRevokeOthersModal(true)}
                    className="px-3 py-1.5 rounded-xl text-xs font-bold text-rose-600 dark:text-rose-400 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 transition-all cursor-pointer flex items-center gap-1.5 shadow-2xs"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    Revoke All Other Sessions ({otherSessionsCount})
                  </button>
                )}
              </div>

              {loading ? (
                <div className="py-12 flex flex-col items-center justify-center text-slate-400 text-xs gap-2">
                  <RefreshCw className="w-5 h-5 animate-spin text-[#5B75F8]" />
                  <span>Loading active sessions...</span>
                </div>
              ) : sessions.length === 0 ? (
                <div className="py-12 text-center text-xs text-slate-400">
                  No active sessions found.
                </div>
              ) : (
                <div className="space-y-3">
                  {sessions.map((session) => (
                    <div
                      key={session.id}
                      className={`p-4 rounded-xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                        session.isCurrent 
                          ? (isDarkMode ? 'bg-[#5B75F8]/5 border-[#5B75F8]/30' : 'bg-indigo-50/50 border-indigo-200')
                          : (isDarkMode ? 'bg-[#1C1E24]/60 border-[#262832] hover:border-slate-700' : 'bg-slate-50/60 border-slate-200 hover:border-slate-300')
                      }`}
                    >
                      <div className="flex items-start gap-3.5 min-w-0">
                        <div className={`p-2.5 rounded-xl border shrink-0 ${
                          session.isCurrent 
                            ? 'bg-[#5B75F8]/15 border-[#5B75F8]/30 text-[#7B92FF]' 
                            : 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-400'
                        }`}>
                          {getDeviceIcon(session.deviceType, session.browser)}
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-bold text-xs text-slate-900 dark:text-white truncate">
                              {session.device} • {session.browser}
                            </span>
                            {session.isCurrent && (
                              <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 font-mono">
                                This Device (Active)
                              </span>
                            )}
                          </div>

                          <div className="mt-1 flex flex-wrap items-center gap-3 text-[11px] text-slate-500 dark:text-slate-400">
                            <span className="flex items-center gap-1">
                              <MapPin className="w-3 h-3 text-slate-400" />
                              {session.location || 'Local Network'}
                            </span>
                            <span>•</span>
                            <span className="font-mono">{session.ip}</span>
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
                            className="px-3 py-1.5 rounded-xl border border-rose-500/30 text-rose-500 dark:text-rose-400 hover:bg-rose-500/10 text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow-2xs"
                          >
                            <LogOut className="w-3.5 h-3.5" />
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
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Security Event Audit Trail
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Recent sign-in attempts, token rotations, and suspicious geographic anomalies.
                </p>
              </div>

              {loading ? (
                <div className="py-12 flex flex-col items-center justify-center text-slate-400 text-xs gap-2">
                  <RefreshCw className="w-5 h-5 animate-spin text-[#5B75F8]" />
                  <span>Loading event trail...</span>
                </div>
              ) : events.length === 0 ? (
                <div className="py-12 text-center text-xs text-slate-400">
                  No security incidents or suspicious events logged.
                </div>
              ) : (
                <div className="space-y-2.5">
                  {events.map((ev) => (
                    <div
                      key={ev.id}
                      className={`p-3.5 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                        isDarkMode ? 'bg-[#1C1E24]/60 border-[#262832]' : 'bg-slate-50/60 border-slate-200'
                      }`}
                    >
                      <div className="flex items-start gap-3 min-w-0">
                        <div className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-400 shrink-0 mt-0.5">
                          {ev.severity === 'CRITICAL' || ev.severity === 'HIGH' ? (
                            <ShieldAlert className="w-4 h-4" />
                          ) : (
                            <Shield className="w-4 h-4" />
                          )}
                        </div>

                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-black text-slate-900 dark:text-white">
                              {ev.event_type.replace(/_/g, ' ')}
                            </span>
                            <span className={`text-[10px] font-mono font-bold px-2 py-0.2 rounded-full border ${getEventBadge(ev.event_type, ev.severity)}`}>
                              {ev.severity}
                            </span>
                          </div>

                          <p className="text-xs text-slate-600 dark:text-slate-300">
                            {ev.device_name || 'Browser'} • {ev.city || 'Mumbai'}, {ev.country || 'India'}
                          </p>

                          {ev.flagged_reasons && ev.flagged_reasons.length > 0 && (
                            <div className="flex flex-wrap gap-1.5 pt-1">
                              {ev.flagged_reasons.map((r, i) => (
                                <span 
                                  key={i}
                                  className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-rose-500/10 text-rose-500 border border-rose-500/20"
                                >
                                  {r.replace(/_/g, ' ')}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>

                      <span className="text-[11px] text-slate-400 font-mono shrink-0">
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
            <div className="space-y-5">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Clock className="w-4 h-4 text-[#5B75F8] dark:text-[#7B92FF]" />
                  <span>Two-Tier Session & Inactivity Management</span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Configure automated idle logout timers and maximum absolute session lifetime policies for this workstation.
                </p>
              </div>

              {/* Setting 1: Inactivity Idle Logout */}
              <div className={`p-4 rounded-2xl border space-y-3 ${
                isDarkMode ? 'bg-[#1C1E24]/60 border-[#262832]' : 'bg-slate-50 border-slate-200'
              }`}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                      1. Inactivity Idle Logout (When Mouse / Keyboard Idle)
                    </h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                      Logs you out <strong className="text-slate-800 dark:text-slate-200">only when completely idle</strong>. While you are actively moving the mouse, scrolling, or typing in forms, your session remains active and will not interrupt your work.
                    </p>
                  </div>
                  <span className="shrink-0 px-2.5 py-1 rounded-xl text-[10px] font-mono font-bold bg-[#5B75F8]/10 text-[#5B75F8] dark:text-[#7B92FF] border border-[#5B75F8]/20">
                    {tempIdleTimeout === 0 ? 'Disabled' : `${tempIdleTimeout} Minutes`}
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 pt-1">
                  {[
                    { value: 5, label: '5 min (Strict)' },
                    { value: 10, label: '10 min' },
                    { value: 15, label: '15 min (Default)' },
                    { value: 30, label: '30 min' },
                    { value: 0, label: 'Disabled (Never)' }
                  ].map(opt => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setTempIdleTimeout(opt.value)}
                      className={`p-2.5 rounded-xl border text-xs font-bold transition-all cursor-pointer text-center ${
                        tempIdleTimeout === opt.value
                          ? 'bg-[#5B75F8] text-white border-[#5B75F8] shadow-md shadow-[#5B75F8]/25 font-black'
                          : (isDarkMode ? 'bg-[#121316] border-slate-800 text-slate-300 hover:border-slate-700' : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300')
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Setting 2: Maximum Absolute Session Ceiling */}
              <div className={`p-4 rounded-2xl border space-y-3 ${
                isDarkMode ? 'bg-[#1C1E24]/60 border-[#262832]' : 'bg-slate-50 border-slate-200'
              }`}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                      2. Absolute Maximum Session Duration (Hard Ceiling)
                    </h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                      Enforces a maximum total session duration from the initial login time, regardless of ongoing activity, to comply with ISO/industrial security compliance.
                    </p>
                  </div>
                  <span className="shrink-0 px-2.5 py-1 rounded-xl text-[10px] font-mono font-bold bg-amber-500/10 text-amber-500 border border-amber-500/20">
                    {tempMaxSession >= 60 ? `${tempMaxSession / 60} Hour${tempMaxSession > 60 ? 's' : ''}` : `${tempMaxSession} Minutes`}
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 pt-1">
                  {[
                    { value: 30, label: '30 min (Default)' },
                    { value: 60, label: '1 Hour' },
                    { value: 120, label: '2 Hours' },
                    { value: 480, label: '8 Hours (Shift)' },
                    { value: 1440, label: '24 Hours' }
                  ].map(opt => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setTempMaxSession(opt.value)}
                      className={`p-2.5 rounded-xl border text-xs font-bold transition-all cursor-pointer text-center ${
                        tempMaxSession === opt.value
                          ? 'bg-amber-600 text-white border-amber-600 shadow-md shadow-amber-600/25 font-black'
                          : (isDarkMode ? 'bg-[#121316] border-slate-800 text-slate-300 hover:border-slate-700' : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300')
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Setting 3: Inactivity Warning Toggle */}
              <div className={`p-4 rounded-2xl border flex items-center justify-between gap-4 ${
                isDarkMode ? 'bg-[#1C1E24]/60 border-[#262832]' : 'bg-slate-50 border-slate-200'
              }`}>
                <div>
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                    Show 60-Second Inactivity Warning Dialog
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Displays a countdown warning with a "Stay Logged In" button before an idle logout occurs.
                  </p>
                </div>

                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={tempWarningEnabled}
                    onChange={(e) => setTempWarningEnabled(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#5B75F8]"></div>
                </label>
              </div>

              {/* Live Session Telemetry Card */}
              <div className={`p-4 rounded-2xl border font-mono text-xs space-y-2 ${
                isDarkMode ? 'bg-slate-950/80 border-slate-800 text-slate-300' : 'bg-white border-slate-200 text-slate-700 shadow-xs'
              }`}>
                <div className="flex items-center justify-between text-[11px] border-b pb-2 border-slate-800/80">
                  <span className="text-slate-400">Current Workstation Status:</span>
                  <span className="text-emerald-400 font-bold flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    Online & Monitored
                  </span>
                </div>
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-slate-400">Session Started:</span>
                  <span className="font-bold">{new Date(sessionStartedAt).toLocaleTimeString()}</span>
                </div>
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-slate-400">Last User Input:</span>
                  <span className="text-indigo-400 font-bold">Active now</span>
                </div>
              </div>

              {/* Save Button */}
              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={handleSaveTimeouts}
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#5B75F8] to-indigo-600 hover:from-indigo-600 hover:to-[#5B75F8] text-white text-xs font-bold shadow-lg shadow-[#5B75F8]/25 transition-all cursor-pointer flex items-center gap-2"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  Save & Apply Session Policy
                </button>
              </div>
            </div>
          )}

          {/* TAB 4: PASSWORD & CREDENTIALS */}
          {activeTab === 'PASSWORD' && (
            <form onSubmit={handleChangePassword} className="space-y-4 max-w-md">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Change Account Password
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Changing your password will automatically sign out all other active sessions.
                </p>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Current Password
                  </label>
                  <input
                    type="password"
                    value={oldPassword}
                    onChange={(e) => setOldPassword(e.target.value)}
                    required
                    placeholder="Enter current password"
                    className="w-full bg-white dark:bg-slate-900 border border-[#d8dde8] dark:border-slate-800 rounded-xl px-3.5 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#5B75F8]/20 focus:border-[#5B75F8]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    New Password
                  </label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    placeholder="Minimum 8 characters"
                    className="w-full bg-white dark:bg-slate-900 border border-[#d8dde8] dark:border-slate-800 rounded-xl px-3.5 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#5B75F8]/20 focus:border-[#5B75F8]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Confirm New Password
                  </label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    placeholder="Re-enter new password"
                    className="w-full bg-white dark:bg-slate-900 border border-[#d8dde8] dark:border-slate-800 rounded-xl px-3.5 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#5B75F8]/20 focus:border-[#5B75F8]"
                  />
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isChangingPassword}
                  className="px-4 py-2 rounded-xl bg-[#5B75F8] hover:bg-[#4A64E8] text-white text-xs font-bold transition-all cursor-pointer flex items-center gap-2 shadow-xs"
                >
                  {isChangingPassword ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Lock className="w-3.5 h-3.5" />}
                  Update Password
                </button>
              </div>
            </form>
          )}

        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-[#d8dde8] dark:border-[#262832] flex items-center justify-between text-xs text-slate-400 bg-slate-50/50 dark:bg-[#121316]">
          <div className="flex items-center gap-1.5">
            <Info className="w-3.5 h-3.5 text-slate-400" />
            <span>Encrypted with Argon2id & rotating HMAC token families.</span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl border border-[#d8dde8] dark:border-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer text-xs font-bold"
          >
            Close
          </button>
        </div>

      </div>

      {/* Confirmation Modal: Revoke Single Session */}
      {sessionToRevoke && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-sm rounded-2xl bg-white dark:bg-[#1C1E24] border border-[#d8dde8] dark:border-slate-800 p-5 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-rose-500">
              <div className="p-2 rounded-xl bg-rose-500/10 border border-rose-500/20">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Revoke this session?
              </h3>
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400">
              The device <span className="font-bold text-slate-900 dark:text-white">"{sessionToRevoke.device}"</span> will be signed out the next time it attempts to access your account.
            </p>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setSessionToRevoke(null)}
                disabled={isRevoking}
                className="px-3.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleRevokeSingle}
                disabled={isRevoking}
                className="px-3.5 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5"
              >
                {isRevoking ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : null}
                Revoke Session
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal: Revoke All Other Sessions */}
      {showRevokeOthersModal && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-sm rounded-2xl bg-white dark:bg-[#1C1E24] border border-[#d8dde8] dark:border-slate-800 p-5 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-rose-500">
              <div className="p-2 rounded-xl bg-rose-500/10 border border-rose-500/20">
                <LogOut className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Sign out all other devices?
              </h3>
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400">
              This will keep your current device active and immediately sign out every other active session across all devices.
            </p>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowRevokeOthersModal(false)}
                disabled={isRevoking}
                className="px-3.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleRevokeOthers}
                disabled={isRevoking}
                className="px-3.5 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5"
              >
                {isRevoking ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : null}
                Sign Out Other Devices
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
