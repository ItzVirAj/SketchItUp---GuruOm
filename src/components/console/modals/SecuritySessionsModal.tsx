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
  Info,
  Check
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
    if (deviceType === 'mobile') return <Smartphone className="w-5 h-5 text-indigo-400" />;
    if (deviceType === 'tablet') return <Tablet className="w-5 h-5 text-purple-400" />;
    return <Laptop className="w-5 h-5 text-[#007AFF]" />;
  };

  const getEventBadge = (type: string, severity: string) => {
    if (severity === 'CRITICAL' || type === 'REFRESH_TOKEN_REUSE') {
      return 'bg-rose-500/15 text-rose-400 border-rose-500/30';
    }
    if (severity === 'HIGH' || type === 'SUSPICIOUS_LOGIN') {
      return 'bg-amber-500/15 text-amber-400 border-amber-500/30';
    }
    if (type === 'PASSWORD_CHANGED' || type === 'ALL_OTHER_SESSIONS_REVOKED') {
      return 'bg-purple-500/15 text-purple-400 border-purple-500/30';
    }
    return 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30';
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

  const inputClass = `h-11 w-full rounded-xl border px-3.5 text-xs font-medium outline-none transition-[border-color,box-shadow,background-color] duration-150 focus:border-[#007AFF] focus:ring-4 focus:ring-[#007AFF]/15 ${
    isDarkMode 
      ? 'border-white/10 bg-black/60 text-white placeholder:text-slate-500 hover:border-white/20 focus:bg-black/80' 
      : 'border-slate-200 bg-slate-50 text-slate-900 placeholder:text-slate-400 hover:border-slate-300 focus:bg-white'
  }`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/70 backdrop-blur-2xl font-sans animate-in fade-in duration-200">
      <div 
        className={`w-full max-w-3xl rounded-3xl border shadow-[0_24px_70px_rgba(0,0,0,0.8)] overflow-hidden flex flex-col max-h-[90vh] transition-all ${
          isDarkMode ? 'bg-[#09090B] border-white/10 text-white' : 'bg-white border-slate-200 text-slate-900'
        }`}
      >
        {/* Header */}
        <div className="px-6 py-5 border-b border-white/10 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="p-2.5 rounded-2xl bg-[#007AFF]/10 text-[#007AFF] border border-[#007AFF]/20 shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold tracking-tight">
                  Security & Active Sessions
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  Protected
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Manage connected devices, token rotation, and session timeout policies.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={fetchSecurityData}
              disabled={isRefreshing}
              className={`h-8.5 w-8.5 rounded-full border border-white/10 flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/[0.06] transition-all active:scale-95 cursor-pointer ${
                isRefreshing ? 'opacity-50' : ''
              }`}
              title="Refresh security telemetry"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            </button>

            <button
              type="button"
              onClick={onClose}
              className="h-8.5 w-8.5 rounded-full border border-white/10 flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/[0.06] transition-all active:scale-95 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Apple Segmented Tab Switcher */}
        <div className="px-6 py-3 border-b border-white/10 flex items-center gap-1.5 overflow-x-auto scrollbar-none bg-black/40">
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
                onClick={() => { setActiveTab(tab.id as any); setActionError(null); setActionSuccess(null); }}
                className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 active:scale-[0.98] ${
                  isActive
                    ? 'bg-[#007AFF] text-white shadow-sm'
                    : isDarkMode
                    ? 'text-slate-400 hover:text-white hover:bg-white/[0.06]'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <TabIcon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
                {tab.count !== undefined && (
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                    isActive ? 'bg-white/20 text-white' : 'bg-white/10 text-slate-400'
                  }`}>
                    {tab.count}
                  </span>
                )}
                {tab.badge && (
                  <span className={`text-[9px] px-1.5 py-0.2 rounded-full font-mono font-bold ${
                    isActive ? 'bg-white/20 text-white' : 'bg-indigo-500/20 text-indigo-400'
                  }`}>
                    {tab.badge}
                  </span>
                )}
                {tab.alert && (
                  <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
                )}
              </button>
            );
          })}
        </div>

        {/* Action Alerts */}
        {actionSuccess && (
          <div className="mx-6 mt-4 p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs flex items-center justify-between font-mono animate-in fade-in">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{actionSuccess}</span>
            </div>
            <button onClick={() => setActionSuccess(null)} className="text-slate-400 hover:text-white cursor-pointer">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {actionError && (
          <div className="mx-6 mt-4 p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center justify-between font-mono animate-in fade-in">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{actionError}</span>
            </div>
            <button onClick={() => setActionError(null)} className="text-slate-400 hover:text-white cursor-pointer">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Content Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-4">
          
          {/* TAB 1: ACTIVE SESSIONS */}
          {activeTab === 'SESSIONS' && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Logged-in Devices
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Sessions currently authenticated with rotating HMAC token families.
                  </p>
                </div>

                {otherSessionsCount > 0 && (
                  <button
                    type="button"
                    onClick={() => setShowRevokeOthersModal(true)}
                    className="px-3.5 py-1.5 rounded-full text-xs font-semibold text-rose-400 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 transition-all cursor-pointer flex items-center gap-1.5 active:scale-95 shadow-sm"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    Revoke Other Sessions ({otherSessionsCount})
                  </button>
                )}
              </div>

              {loading ? (
                <div className="py-12 flex flex-col items-center justify-center text-slate-400 text-xs gap-2">
                  <RefreshCw className="w-5 h-5 animate-spin text-[#007AFF]" />
                  <span>Loading active sessions...</span>
                </div>
              ) : sessions.length === 0 ? (
                <div className="py-12 text-center text-xs text-slate-400 font-mono">
                  No active sessions found.
                </div>
              ) : (
                <div className="space-y-3">
                  {sessions.map((session) => (
                    <div
                      key={session.id}
                      className={`p-4 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                        session.isCurrent 
                          ? 'bg-[#007AFF]/5 border-[#007AFF]/30' 
                          : 'bg-black/60 border-white/10 hover:border-white/20'
                      }`}
                    >
                      <div className="flex items-start gap-3.5 min-w-0">
                        <div className={`p-2.5 rounded-xl border shrink-0 ${
                          session.isCurrent 
                            ? 'bg-[#007AFF]/15 border-[#007AFF]/30 text-[#007AFF]' 
                            : 'bg-white/[0.04] border-white/10 text-slate-400'
                        }`}>
                          {getDeviceIcon(session.deviceType, session.browser)}
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-bold text-xs text-white truncate">
                              {session.device} • {session.browser}
                            </span>
                            {session.isCurrent && (
                              <span className="px-2.5 py-0.5 rounded-full text-[9px] font-mono font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                This Device (Active)
                              </span>
                            )}
                          </div>

                          <div className="mt-1 flex flex-wrap items-center gap-2.5 text-[11px] text-slate-400 font-mono">
                            <span className="flex items-center gap-1 text-slate-300">
                              <MapPin className="w-3 h-3 text-slate-400" />
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
                            className="px-3.5 py-1.5 rounded-full border border-rose-500/30 text-rose-400 hover:bg-rose-500/10 text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 active:scale-95"
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
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Security Event Audit Trail
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Recent sign-in attempts, token rotations, and suspicious geographic anomalies.
                </p>
              </div>

              {loading ? (
                <div className="py-12 flex flex-col items-center justify-center text-slate-400 text-xs gap-2">
                  <RefreshCw className="w-5 h-5 animate-spin text-[#007AFF]" />
                  <span>Loading event trail...</span>
                </div>
              ) : events.length === 0 ? (
                <div className="py-12 text-center text-xs text-slate-400 font-mono">
                  No security incidents or suspicious events logged.
                </div>
              ) : (
                <div className="space-y-2.5">
                  {events.map((ev) => (
                    <div
                      key={ev.id}
                      className="p-3.5 rounded-2xl border border-white/10 bg-black/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      <div className="flex items-start gap-3 min-w-0">
                        <div className="p-2 rounded-xl bg-white/[0.04] text-slate-400 shrink-0 mt-0.5">
                          {ev.severity === 'CRITICAL' || ev.severity === 'HIGH' ? (
                            <ShieldAlert className="w-4 h-4 text-rose-400" />
                          ) : (
                            <Shield className="w-4 h-4 text-[#007AFF]" />
                          )}
                        </div>

                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-white">
                              {ev.event_type.replace(/_/g, ' ')}
                            </span>
                            <span className={`text-[10px] font-mono font-bold px-2 py-0.2 rounded-full border ${getEventBadge(ev.event_type, ev.severity)}`}>
                              {ev.severity}
                            </span>
                          </div>

                          <p className="text-xs text-slate-300">
                            {ev.device_name || 'Browser'} • {ev.city || 'Pune'}, {ev.country || 'India'}
                          </p>

                          {ev.flagged_reasons && ev.flagged_reasons.length > 0 && (
                            <div className="flex flex-wrap gap-1.5 pt-1">
                              {ev.flagged_reasons.map((r, i) => (
                                <span 
                                  key={i}
                                  className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-rose-500/10 text-rose-400 border border-rose-500/20"
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
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-[#007AFF]" />
                  <span>Two-Tier Session & Inactivity Management</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Configure automated idle logout timers and maximum absolute session lifetime policies.
                </p>
              </div>

              {/* Setting 1: Inactivity Idle Logout */}
              <div className="p-4.5 rounded-3xl border border-white/10 bg-black/60 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                      1. Inactivity Idle Logout (When Inactive)
                    </h4>
                    <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                      Logs you out <strong className="text-white">only when completely idle</strong>. Active typing, scrolling, and navigation keep your session continuous.
                    </p>
                  </div>
                  <span className="shrink-0 px-3 py-1 rounded-full text-[10px] font-mono font-bold bg-[#007AFF]/15 text-[#007AFF] border border-[#007AFF]/30">
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
                      className={`p-2.5 rounded-2xl border text-xs font-semibold transition-all cursor-pointer text-center active:scale-95 ${
                        tempIdleTimeout === opt.value
                          ? 'bg-[#007AFF] text-white border-[#007AFF] shadow-md shadow-blue-500/25 font-bold'
                          : 'bg-black/40 border-white/10 text-slate-300 hover:border-white/20'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Setting 2: Maximum Absolute Session Ceiling */}
              <div className="p-4.5 rounded-3xl border border-white/10 bg-black/60 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                      2. Absolute Maximum Session Duration (Hard Ceiling)
                    </h4>
                    <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                      Enforces maximum total duration from initial sign-in for enterprise security compliance.
                    </p>
                  </div>
                  <span className="shrink-0 px-3 py-1 rounded-full text-[10px] font-mono font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30">
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
                      className={`p-2.5 rounded-2xl border text-xs font-semibold transition-all cursor-pointer text-center active:scale-95 ${
                        tempMaxSession === opt.value
                          ? 'bg-amber-600 text-white border-amber-600 shadow-md shadow-amber-600/25 font-bold'
                          : 'bg-black/40 border-white/10 text-slate-300 hover:border-white/20'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Setting 3: Inactivity Warning Toggle */}
              <div className="p-4 rounded-2xl border border-white/10 bg-black/60 flex items-center justify-between gap-4">
                <div>
                  <h4 className="text-xs font-bold text-white">
                    Show 60-Second Inactivity Warning Dialog
                  </h4>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Displays a countdown prompt with a "Stay Logged In" button before an idle logout occurs.
                  </p>
                </div>

                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={tempWarningEnabled}
                    onChange={(e) => setTempWarningEnabled(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#007AFF]"></div>
                </label>
              </div>

              {/* Live Session Telemetry Card */}
              <div className="p-4 rounded-2xl border border-white/10 bg-black/40 font-mono text-xs space-y-2">
                <div className="flex items-center justify-between text-[11px] border-b border-white/10 pb-2">
                  <span className="text-slate-400">Current Workstation Status:</span>
                  <span className="text-emerald-400 font-bold flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    Online & Monitored
                  </span>
                </div>
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-slate-400">Session Started:</span>
                  <span className="font-bold text-white">{new Date(sessionStartedAt).toLocaleTimeString()}</span>
                </div>
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-slate-400">Activity Heartbeat:</span>
                  <span className="text-[#007AFF] font-bold">Active now</span>
                </div>
              </div>

              {/* Save Button */}
              <div className="pt-2 flex items-center justify-end">
                <button
                  type="button"
                  onClick={handleSaveTimeouts}
                  className="px-6 py-2.5 rounded-full bg-[#007AFF] hover:bg-[#0071E3] text-white text-xs font-semibold shadow-md shadow-blue-500/25 transition-all cursor-pointer flex items-center gap-2 active:scale-[0.98]"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Save & Apply Session Policy</span>
                </button>
              </div>
            </div>
          )}

          {/* TAB 4: PASSWORD & CREDENTIALS */}
          {activeTab === 'PASSWORD' && (
            <form onSubmit={handleChangePassword} className="space-y-4 max-w-md">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Change Account Password
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Changing your password will automatically revoke other active device sessions.
                </p>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
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
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
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
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
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
                  className="px-6 py-2.5 rounded-full bg-[#007AFF] hover:bg-[#0071E3] text-white text-xs font-semibold transition-all cursor-pointer flex items-center gap-2 shadow-md shadow-blue-500/25 active:scale-[0.98] disabled:opacity-50"
                >
                  {isChangingPassword ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Lock className="w-3.5 h-3.5" />}
                  <span>Update Password</span>
                </button>
              </div>
            </form>
          )}

        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-white/10 flex items-center justify-between text-xs text-slate-400 bg-black/40">
          <div className="flex items-center gap-1.5">
            <Info className="w-3.5 h-3.5 text-slate-400" />
            <span className="font-mono text-[11px]">Protected with Argon2id & rotating HMAC token families</span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-full border border-white/10 text-slate-300 hover:text-white hover:bg-white/[0.06] transition-all cursor-pointer text-xs font-semibold active:scale-95"
          >
            Done
          </button>
        </div>

      </div>

      {/* Confirmation Modal: Revoke Single Session */}
      {sessionToRevoke && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/70 backdrop-blur-2xl animate-in fade-in">
          <div className="w-full max-w-sm rounded-3xl bg-[#09090B] border border-white/10 p-6 shadow-2xl space-y-4 text-white">
            <div className="flex items-center gap-3 text-rose-400">
              <div className="p-2.5 rounded-2xl bg-rose-500/10 border border-rose-500/20">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-bold">
                Revoke this session?
              </h3>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed">
              The device <span className="font-bold text-white">"{sessionToRevoke.device}"</span> will be signed out the next time it connects to your account.
            </p>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setSessionToRevoke(null)}
                disabled={isRevoking}
                className="px-4 py-2 rounded-full border border-white/10 text-xs font-semibold text-slate-300 hover:bg-white/[0.06] transition-all cursor-pointer"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleRevokeSingle}
                disabled={isRevoking}
                className="px-5 py-2 rounded-full bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 active:scale-95 shadow-md shadow-rose-500/25"
              >
                {isRevoking ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : null}
                <span>Revoke Session</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {showRevokeOthersModal && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/70 backdrop-blur-2xl animate-in fade-in">
          <div className="w-full max-w-sm rounded-3xl bg-[#09090B] border border-white/10 p-6 shadow-2xl space-y-4 text-white">
            <div className="flex items-center gap-3 text-rose-400">
              <div className="p-2.5 rounded-2xl bg-rose-500/10 border border-rose-500/20">
                <LogOut className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-bold">
                Sign out other devices?
              </h3>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed">
              This keeps your current workstation active and immediately revokes all other connected sessions.
            </p>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setShowRevokeOthersModal(false)}
                disabled={isRevoking}
                className="px-4 py-2 rounded-full border border-white/10 text-xs font-semibold text-slate-300 hover:bg-white/[0.06] transition-all cursor-pointer"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleRevokeOthers}
                disabled={isRevoking}
                className="px-5 py-2 rounded-full bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 active:scale-95 shadow-md shadow-rose-500/25"
              >
                {isRevoking ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : null}
                <span>Sign Out Devices</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default SecuritySessionsModal;
