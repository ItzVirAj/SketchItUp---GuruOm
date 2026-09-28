import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Laptop,
  Lock,
  MapPin,
  RefreshCw,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Smartphone,
  Tablet,
  Trash2,
  X
} from 'lucide-react';
import { apiClient } from '../../../lib/apiClient';
import { useAuth } from '../../../context/AuthContext';
import { ActiveSession, ConsoleUser, SecurityEvent, SystemUser } from '../../../types/console';

interface AccountViewProps {
  currentUser?: ConsoleUser | SystemUser | null;
  isDarkMode?: boolean;
  onSignOut?: () => void;
}

type AccountTab = 'general' | 'security';
type ToastState = { message: string; tone: 'success' | 'error' } | null;

const IDLE_OPTIONS = [
  { value: 5, label: '5 minutes' },
  { value: 10, label: '10 minutes' },
  { value: 15, label: '15 minutes' },
  { value: 30, label: '30 minutes' },
  { value: 0, label: 'Disabled' }
];

const MAX_SESSION_OPTIONS = [
  { value: 30, label: '30 minutes' },
  { value: 60, label: '1 hour' },
  { value: 120, label: '2 hours' },
  { value: 480, label: '8 hours' },
  { value: 1440, label: '24 hours' }
];

const formatTimestamp = (dateStr?: string): string => {
  if (!dateStr) return 'Just now';
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return dateStr;
  return d.toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', hour12: true });
};

const formatRelative = (dateStr?: string): string => {
  if (!dateStr) return 'Just now';
  const d = new Date(dateStr).getTime();
  if (Number.isNaN(d)) return dateStr;
  const mins = Math.max(0, Math.round((Date.now() - d) / 60000));
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs} hr ago`;
  const days = Math.round(hrs / 24);
  if (days < 30) return `${days} day${days > 1 ? 's' : ''} ago`;
  return formatTimestamp(dateStr);
};

const DeviceIcon: React.FC<{ type: string }> = ({ type }) => {
  const cls = 'h-4.5 w-4.5 text-neutral-700 dark:text-neutral-200';
  if (type === 'mobile') return <Smartphone className={cls} />;
  if (type === 'tablet') return <Tablet className={cls} />;
  return <Laptop className={cls} />;
};

// ── Layout primitives ─────────────────────────────────────────────────────────

const SectionTitle: React.FC<{ title: string; description?: string; action?: React.ReactNode }> = ({
  title,
  description,
  action
}) => (
  <div className="flex flex-wrap items-end justify-between gap-3">
    <div>
      <h2 className="text-base font-semibold tracking-tight text-neutral-900 dark:text-neutral-100">{title}</h2>
      {description && <p className="mt-0.5 text-xs text-neutral-500 dark:text-neutral-400">{description}</p>}
    </div>
    {action}
  </div>
);

const Row: React.FC<{
  label: string;
  description?: string;
  children?: React.ReactNode;
  action?: React.ReactNode;
}> = ({ label, description, children, action }) => (
  <div className="grid grid-cols-1 gap-3 border-t border-black/[0.07] py-5 first:border-t-0 dark:border-white/[0.08] md:grid-cols-[minmax(0,260px)_minmax(0,1fr)_auto] md:items-start md:gap-6">
    <div>
      <div className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">{label}</div>
      {description && <p className="mt-1 text-xs leading-relaxed text-neutral-500 dark:text-neutral-400">{description}</p>}
    </div>
    <div className="min-w-0 text-sm text-neutral-800 dark:text-neutral-200">{children}</div>
    <div className="flex md:justify-end">{action}</div>
  </div>
);

const OutlineButton: React.FC<React.ButtonHTMLAttributes<HTMLButtonElement>> = ({ className = '', ...props }) => (
  <button
    type="button"
    {...props}
    className={`inline-flex h-8 cursor-pointer items-center justify-center gap-1.5 rounded-lg border border-black/[0.12] bg-white px-3.5 text-xs font-semibold text-neutral-800 shadow-2xs transition-all hover:bg-neutral-50 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/[0.14] dark:bg-white/[0.06] dark:text-neutral-100 dark:hover:bg-white/[0.1] ${className}`}
  />
);

const PrimaryButton: React.FC<React.ButtonHTMLAttributes<HTMLButtonElement>> = ({ className = '', ...props }) => (
  <button
    {...props}
    className={`inline-flex h-8 cursor-pointer items-center justify-center gap-1.5 rounded-lg bg-[#2F6BFF] px-3.5 text-xs font-semibold text-white shadow-xs transition-all hover:bg-[#2559d9] active:scale-95 disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
  />
);

const selectClass =
  'h-9 w-full max-w-[220px] cursor-pointer rounded-lg border border-black/[0.12] bg-white px-2.5 text-xs font-medium text-neutral-900 outline-none transition-all hover:border-black/[0.2] focus:border-[#2F6BFF] focus:ring-2 focus:ring-[#2F6BFF]/25 dark:border-white/[0.14] dark:bg-white/[0.05] dark:text-neutral-100';

const inputClass =
  'h-9 w-full rounded-lg border border-black/[0.12] bg-white px-3 text-xs text-neutral-900 outline-none transition-all placeholder:text-neutral-400 hover:border-black/[0.2] focus:border-[#2F6BFF] focus:ring-2 focus:ring-[#2F6BFF]/25 dark:border-white/[0.14] dark:bg-white/[0.05] dark:text-neutral-100';

// ── Component ─────────────────────────────────────────────────────────────────

export const AccountView: React.FC<AccountViewProps> = ({ currentUser }) => {
  const { sessionSettings, updateSessionSettings, sessionStartedAt } = useAuth();

  const [activeTab, setActiveTab] = useState<AccountTab>('general');
  const [sessions, setSessions] = useState<ActiveSession[]>([]);
  const [events, setEvents] = useState<SecurityEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [toast, setToast] = useState<ToastState>(null);
  const [bannerDismissed, setBannerDismissed] = useState(false);
  const basicsRef = useRef<HTMLDivElement | null>(null);

  // Session policy draft state
  const [idleTimeout, setIdleTimeout] = useState<number>(sessionSettings.idleTimeoutMinutes);
  const [maxSession, setMaxSession] = useState<number>(sessionSettings.maxSessionMinutes);
  const [warningEnabled, setWarningEnabled] = useState<boolean>(sessionSettings.enableIdleWarning);

  // Device revoke state
  const [confirmRevokeId, setConfirmRevokeId] = useState<string | null>(null);
  const [confirmRevokeOthers, setConfirmRevokeOthers] = useState(false);
  const [isRevoking, setIsRevoking] = useState(false);

  // Password form state
  const [isEditingPassword, setIsEditingPassword] = useState(false);
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  const showToast = useCallback((message: string, tone: 'success' | 'error' = 'success') => {
    setToast({ message, tone });
  }, []);

  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(null), 5000);
    return () => window.clearTimeout(t);
  }, [toast]);

  const loadSecurityData = useCallback(async () => {
    const [sessionsRes, eventsRes] = await Promise.all([
      apiClient.get<{ sessions: ActiveSession[] }>('/auth/sessions').catch(() => ({ sessions: [] as ActiveSession[] })),
      apiClient.get<{ events: SecurityEvent[] }>('/auth/security-events').catch(() => ({ events: [] as SecurityEvent[] }))
    ]);
    if (sessionsRes?.sessions) setSessions(sessionsRes.sessions);
    if (eventsRes?.events) setEvents(eventsRes.events);
  }, []);

  useEffect(() => {
    let mounted = true;
    Promise.all([
      apiClient.get<{ sessions: ActiveSession[] }>('/auth/sessions').catch(() => ({ sessions: [] as ActiveSession[] })),
      apiClient.get<{ events: SecurityEvent[] }>('/auth/security-events').catch(() => ({ events: [] as SecurityEvent[] }))
    ])
      .then(([sessionsRes, eventsRes]) => {
        if (!mounted) return;
        if (sessionsRes?.sessions) setSessions(sessionsRes.sessions);
        if (eventsRes?.events) setEvents(eventsRes.events);
        setLoading(false);
      })
      .catch((err: unknown) => {
        if (!mounted) return;
        console.warn('Failed to fetch security data:', err);
        setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await loadSecurityData();
    } finally {
      setIsRefreshing(false);
    }
  };

  const otherSessions = useMemo(() => sessions.filter(s => !s.isCurrent), [sessions]);

  const lastPasswordChange = useMemo(
    () => events.find(e => e.event_type === 'PASSWORD_CHANGED')?.created_at,
    [events]
  );

  const policyDirty =
    idleTimeout !== sessionSettings.idleTimeoutMinutes ||
    maxSession !== sessionSettings.maxSessionMinutes ||
    warningEnabled !== sessionSettings.enableIdleWarning;

  // Security score: every check is derived from real settings/telemetry.
  const securityChecks = useMemo(
    () => [
      { label: 'Idle logout is enabled', passed: sessionSettings.idleTimeoutMinutes > 0 },
      { label: 'Session lifetime is 8 hours or less', passed: sessionSettings.maxSessionMinutes <= 480 },
      { label: 'Inactivity warning is enabled', passed: sessionSettings.enableIdleWarning },
      {
        label: 'No high-risk sessions',
        passed: !sessions.some(s => s.riskLevel === 'HIGH' || s.riskLevel === 'CRITICAL')
      },
      {
        label: 'No high-severity security events',
        passed: !events.some(e => e.severity === 'HIGH' || e.severity === 'CRITICAL')
      }
    ],
    [sessionSettings, sessions, events]
  );
  const score = Math.round((securityChecks.filter(c => c.passed).length / securityChecks.length) * 100);
  const failedChecks = securityChecks.filter(c => !c.passed);

  const handleSavePolicy = () => {
    updateSessionSettings({
      idleTimeoutMinutes: idleTimeout,
      maxSessionMinutes: maxSession,
      enableIdleWarning: warningEnabled
    });
    showToast('Session policy updated.');
  };

  const handleRevokeSingle = async (session: ActiveSession) => {
    setIsRevoking(true);
    try {
      await apiClient.delete(`/auth/sessions/${session.id}`);
      setConfirmRevokeId(null);
      showToast(`“${session.device}” removed.`);
      await loadSecurityData();
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Failed to revoke session.', 'error');
    } finally {
      setIsRevoking(false);
    }
  };

  const handleRevokeOthers = async () => {
    setIsRevoking(true);
    try {
      const res = await apiClient.post<{ revokedCount: number; message: string }>('/auth/sessions/revoke-others');
      setConfirmRevokeOthers(false);
      showToast(res?.message || 'All other devices have been signed out.');
      await loadSecurityData();
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Failed to revoke other sessions.', 'error');
    } finally {
      setIsRevoking(false);
    }
  };

  const resetPasswordForm = () => {
    setIsEditingPassword(false);
    setOldPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setPasswordError(null);
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setPasswordError('New passwords do not match.');
      return;
    }
    if (newPassword.length < 8) {
      setPasswordError('Password must be at least 8 characters long.');
      return;
    }
    setIsChangingPassword(true);
    setPasswordError(null);
    try {
      const res = await apiClient.post<{ message: string }>('/auth/change-password', { oldPassword, newPassword });
      resetPasswordForm();
      showToast(res?.message || 'Password changed. Other devices were signed out.');
      await loadSecurityData();
    } catch (err: unknown) {
      setPasswordError(err instanceof Error ? err.message : 'Failed to change password.');
    } finally {
      setIsChangingPassword(false);
    }
  };

  // ── Derived profile info ────────────────────────────────────────────────────
  const displayName = currentUser?.name || (currentUser as { fullName?: string } | null)?.fullName || 'GuruOm User';
  const displayEmail = currentUser?.email || '—';
  const displayRole = String(currentUser?.role || '—');
  const initials =
    displayName
      .split(' ')
      .filter(Boolean)
      .map(p => p[0])
      .join('')
      .slice(0, 2)
      .toUpperCase() || 'GO';

  const ringColor = score >= 80 ? '#2F6BFF' : score >= 60 ? '#F59E0B' : '#EF4444';
  const circumference = 2 * Math.PI * 16;

  const profileFields: Array<[string, string | undefined]> = [
    ['Full name', displayName],
    ['Email (login ID)', displayEmail],
    ['Role', displayRole],
    ['Department', currentUser?.department],
    ['Employee / User ID', currentUser?.employeeCode || currentUser?.userId || currentUser?.id],
    ['Mobile', currentUser?.mobile || currentUser?.phone],
    ['Reporting manager', currentUser?.reportingManager],
    ['Shift', currentUser?.shift],
    ['Status', currentUser?.status],
    ['Last login', currentUser?.lastLogin ? formatTimestamp(currentUser.lastLogin) : undefined]
  ];

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6 font-sans select-text">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-neutral-900 dark:text-white">My Account</h1>
        <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">Manage your details and personal preferences here.</p>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 border-b border-black/[0.07] dark:border-white/[0.08]" role="tablist">
        {([
          ['general', 'General'],
          ['security', 'Security']
        ] as Array<[AccountTab, string]>).map(([id, label]) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={activeTab === id}
            onClick={() => setActiveTab(id)}
            className={`-mb-px cursor-pointer rounded-t-lg border-b-2 px-3.5 py-2 text-sm font-semibold transition-colors ${
              activeTab === id
                ? 'border-[#2F6BFF] text-neutral-900 dark:text-white'
                : 'border-transparent text-neutral-500 hover:text-neutral-800 dark:text-neutral-400 dark:hover:text-neutral-200'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* ── GENERAL ─────────────────────────────────────────────────────────── */}
      {activeTab === 'general' && (
        <div className="space-y-6">
          <div className="flex items-center gap-4 rounded-2xl border border-black/[0.07] bg-white p-5 shadow-2xs dark:border-white/[0.08] dark:bg-white/[0.03]">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-gradient-to-tr from-[#0066FF] to-[#43B4FF] text-lg font-bold text-white shadow-xs">
              {initials}
            </div>
            <div className="min-w-0">
              <div className="truncate text-base font-semibold text-neutral-900 dark:text-white">{displayName}</div>
              <div className="truncate font-mono text-xs text-neutral-500 dark:text-neutral-400">{displayEmail}</div>
              <span className="mt-1.5 inline-flex items-center rounded-md border border-blue-500/20 bg-blue-500/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
                {displayRole}
              </span>
            </div>
          </div>

          <section className="space-y-1">
            <SectionTitle title="Profile" description="Your details as recorded by your administrator." />
            <div className="mt-2">
              {profileFields
                .filter(([, value]) => value)
                .map(([label, value]) => (
                  <Row key={label} label={label}>
                    <span className="break-words">{value}</span>
                  </Row>
                ))}
            </div>
            <p className="pt-2 text-xs text-neutral-500 dark:text-neutral-400">
              Need to change these details? Ask a Super Admin to update them from Users &amp; Audit Logs.
            </p>
          </section>
        </div>
      )}

      {/* ── SECURITY ────────────────────────────────────────────────────────── */}
      {activeTab === 'security' && (
        <div className="space-y-8">
          {/* Score banner */}
          {!bannerDismissed && (
            <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-black/[0.07] bg-black/[0.02] px-4 py-3.5 dark:border-white/[0.08] dark:bg-white/[0.03]">
              <div className="flex items-center gap-3.5">
                <svg viewBox="0 0 40 40" className="h-10 w-10 shrink-0 -rotate-90" aria-hidden="true">
                  <circle cx="20" cy="20" r="16" fill="none" strokeWidth="4" className="stroke-black/[0.08] dark:stroke-white/[0.12]" />
                  <circle
                    cx="20"
                    cy="20"
                    r="16"
                    fill="none"
                    strokeWidth="4"
                    strokeLinecap="round"
                    stroke={ringColor}
                    strokeDasharray={circumference}
                    strokeDashoffset={circumference * (1 - score / 100)}
                    style={{ transition: 'stroke-dashoffset 400ms ease' }}
                  />
                </svg>
                <div>
                  <div className="text-sm font-semibold text-neutral-900 dark:text-white">Your account security is {score}%</div>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400">
                    {failedChecks.length === 0
                      ? 'All security checks passed.'
                      : `To improve: ${failedChecks.map(c => c.label.toLowerCase()).join('; ')}.`}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <OutlineButton onClick={() => setBannerDismissed(true)}>Dismiss</OutlineButton>
                <PrimaryButton onClick={() => basicsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })}>
                  Review security
                </PrimaryButton>
              </div>
            </div>
          )}

          {/* Basics */}
          <section ref={basicsRef} className="scroll-mt-4">
            <SectionTitle title="Basics" />
            <div className="mt-1">
              <Row
                label="Password"
                description="Set a password to protect your account."
                action={
                  !isEditingPassword && <OutlineButton onClick={() => setIsEditingPassword(true)}>Edit</OutlineButton>
                }
              >
                {isEditingPassword ? (
                  <form onSubmit={handleChangePassword} className="max-w-sm space-y-3">
                    <input
                      type="password"
                      value={oldPassword}
                      onChange={e => setOldPassword(e.target.value)}
                      required
                      autoComplete="current-password"
                      placeholder="Current password"
                      className={inputClass}
                    />
                    <input
                      type="password"
                      value={newPassword}
                      onChange={e => setNewPassword(e.target.value)}
                      required
                      autoComplete="new-password"
                      placeholder="New password (min 8 characters)"
                      className={inputClass}
                    />
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={e => setConfirmPassword(e.target.value)}
                      required
                      autoComplete="new-password"
                      placeholder="Confirm new password"
                      className={inputClass}
                    />
                    {passwordError && (
                      <p className="flex items-center gap-1.5 text-xs font-medium text-rose-600 dark:text-rose-400">
                        <AlertTriangle className="h-3.5 w-3.5 shrink-0" /> {passwordError}
                      </p>
                    )}
                    <p className="text-xs text-neutral-500 dark:text-neutral-400">
                      Updating your password signs out all your other devices.
                    </p>
                    <div className="flex items-center gap-2">
                      <PrimaryButton type="submit" disabled={isChangingPassword}>
                        {isChangingPassword ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Lock className="h-3.5 w-3.5" />}
                        Update password
                      </PrimaryButton>
                      <OutlineButton onClick={resetPasswordForm} disabled={isChangingPassword}>
                        Cancel
                      </OutlineButton>
                    </div>
                  </form>
                ) : (
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                    <span className="tracking-[0.25em] text-neutral-700 dark:text-neutral-300">••••••••••••••••</span>
                    <span className="text-xs text-neutral-500 dark:text-neutral-400">
                      {lastPasswordChange ? `Changed ${formatRelative(lastPasswordChange)}` : 'Stored with Argon2id hashing'}
                    </span>
                  </div>
                )}
              </Row>

              <Row
                label="Idle logout"
                description="Sign out automatically when the workstation is idle."
              >
                <select value={idleTimeout} onChange={e => setIdleTimeout(Number(e.target.value))} className={selectClass}>
                  {IDLE_OPTIONS.map(o => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </Row>

              <Row
                label="Maximum session length"
                description="Force a fresh sign-in after this long, regardless of activity."
              >
                <select value={maxSession} onChange={e => setMaxSession(Number(e.target.value))} className={selectClass}>
                  {MAX_SESSION_OPTIONS.map(o => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </Row>

              <Row
                label="Inactivity warning"
                description="Show a 60-second countdown before an idle logout."
                action={
                  policyDirty && (
                    <div className="flex items-center gap-2">
                      <OutlineButton
                        onClick={() => {
                          setIdleTimeout(sessionSettings.idleTimeoutMinutes);
                          setMaxSession(sessionSettings.maxSessionMinutes);
                          setWarningEnabled(sessionSettings.enableIdleWarning);
                        }}
                      >
                        Reset
                      </OutlineButton>
                      <PrimaryButton onClick={handleSavePolicy}>
                        <CheckCircle2 className="h-3.5 w-3.5" /> Save
                      </PrimaryButton>
                    </div>
                  )
                }
              >
                <button
                  type="button"
                  role="switch"
                  aria-checked={warningEnabled}
                  onClick={() => setWarningEnabled(v => !v)}
                  className="flex cursor-pointer items-center gap-2.5"
                >
                  <span
                    className={`relative inline-block h-6 w-11 rounded-full transition-colors ${
                      warningEnabled ? 'bg-[#2F6BFF]' : 'bg-neutral-300 dark:bg-neutral-700'
                    }`}
                  >
                    <span
                      className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow-xs transition-transform ${
                        warningEnabled ? 'translate-x-5' : ''
                      }`}
                    />
                  </span>
                  <span className="text-xs font-medium">{warningEnabled ? 'On' : 'Off'}</span>
                </button>
              </Row>

              <Row label="This session" description="Started when you last signed in.">
                <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                  <Clock className="h-3.5 w-3.5" />
                  <span className="text-neutral-800 dark:text-neutral-200">{new Date(sessionStartedAt).toLocaleString('en-IN')}</span>
                </span>
              </Row>
            </div>
          </section>

          {/* Browsers and devices */}
          <section>
            <SectionTitle
              title="Browsers and devices"
              description="These browsers and devices are currently signed in to your account. Remove any unauthorized devices."
              action={
                <div className="flex items-center gap-2">
                  <OutlineButton onClick={handleRefresh} disabled={isRefreshing} aria-label="Refresh devices">
                    <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
                    Refresh
                  </OutlineButton>
                  {otherSessions.length > 0 &&
                    (confirmRevokeOthers ? (
                      <div className="flex items-center gap-2 rounded-lg border border-rose-500/25 bg-rose-500/10 py-1 pl-3 pr-1">
                        <span className="text-xs font-medium text-rose-700 dark:text-rose-300">
                          Sign out {otherSessions.length} other device{otherSessions.length > 1 ? 's' : ''}?
                        </span>
                        <OutlineButton className="h-6 px-2" onClick={() => setConfirmRevokeOthers(false)} disabled={isRevoking}>
                          Cancel
                        </OutlineButton>
                        <button
                          type="button"
                          onClick={handleRevokeOthers}
                          disabled={isRevoking}
                          className="inline-flex h-6 cursor-pointer items-center gap-1 rounded-md bg-rose-600 px-2 text-xs font-semibold text-white hover:bg-rose-500 disabled:opacity-50"
                        >
                          {isRevoking && <RefreshCw className="h-3 w-3 animate-spin" />} Confirm
                        </button>
                      </div>
                    ) : (
                      <OutlineButton
                        className="border-rose-500/30 text-rose-600 dark:text-rose-400"
                        onClick={() => setConfirmRevokeOthers(true)}
                      >
                        Remove other devices ({otherSessions.length})
                      </OutlineButton>
                    ))}
                </div>
              }
            />

            <div className="mt-3 divide-y divide-black/[0.07] border-y border-black/[0.07] dark:divide-white/[0.08] dark:border-white/[0.08]">
              {loading ? (
                <div className="flex items-center justify-center gap-2 py-10 text-xs text-neutral-400">
                  <RefreshCw className="h-4 w-4 animate-spin text-[#2F6BFF]" /> Loading devices…
                </div>
              ) : sessions.length === 0 ? (
                <div className="py-10 text-center font-mono text-xs text-neutral-400">No active sessions found.</div>
              ) : (
                sessions.map(session => (
                  <div key={session.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 py-3.5">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-black/[0.08] bg-white shadow-2xs dark:border-white/[0.1] dark:bg-white/[0.05]">
                      <DeviceIcon type={session.deviceType} />
                    </div>

                    <div className="min-w-0 flex-1 basis-48">
                      <div className="truncate text-sm font-semibold text-neutral-900 dark:text-neutral-100">
                        {session.browser} on {session.os || session.device}
                      </div>
                      <div className="truncate text-xs text-neutral-500 dark:text-neutral-400">
                        {session.device} · {session.ip}
                      </div>
                    </div>

                    <div className="flex min-w-[170px] items-center gap-1.5 text-xs text-neutral-700 dark:text-neutral-300">
                      <MapPin className="h-3.5 w-3.5 shrink-0 text-neutral-400" />
                      <span className="truncate">{session.location || 'Local workstation'}</span>
                    </div>

                    <div className="min-w-[110px] text-xs">
                      {session.isCurrent ? (
                        <span className="font-semibold text-emerald-600 dark:text-emerald-400">Current session</span>
                      ) : (
                        <span className="text-neutral-500 dark:text-neutral-400">{formatRelative(session.lastActiveAt)}</span>
                      )}
                    </div>

                    <div className="flex w-[150px] justify-end">
                      {session.isCurrent ? null : confirmRevokeId === session.id ? (
                        <div className="flex items-center gap-1.5">
                          <OutlineButton className="h-7 px-2" onClick={() => setConfirmRevokeId(null)} disabled={isRevoking}>
                            Cancel
                          </OutlineButton>
                          <button
                            type="button"
                            onClick={() => handleRevokeSingle(session)}
                            disabled={isRevoking}
                            className="inline-flex h-7 cursor-pointer items-center gap-1 rounded-lg bg-rose-600 px-2.5 text-xs font-semibold text-white hover:bg-rose-500 disabled:opacity-50"
                          >
                            {isRevoking && <RefreshCw className="h-3 w-3 animate-spin" />} Remove
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setConfirmRevokeId(session.id)}
                          aria-label={`Remove ${session.device}`}
                          title="Remove this device"
                          className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg text-neutral-400 transition-colors hover:bg-rose-500/10 hover:text-rose-500"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>

          {/* Security history */}
          <section>
            <SectionTitle title="Security history" description="Recent sign-ins, token rotations and flagged activity." />
            <div className="mt-3 divide-y divide-black/[0.07] border-y border-black/[0.07] dark:divide-white/[0.08] dark:border-white/[0.08]">
              {loading ? (
                <div className="flex items-center justify-center gap-2 py-10 text-xs text-neutral-400">
                  <RefreshCw className="h-4 w-4 animate-spin text-[#2F6BFF]" /> Loading history…
                </div>
              ) : events.length === 0 ? (
                <div className="py-10 text-center font-mono text-xs text-neutral-400">
                  No security incidents or suspicious events logged.
                </div>
              ) : (
                events.slice(0, 15).map(ev => {
                  const risky = ev.severity === 'HIGH' || ev.severity === 'CRITICAL';
                  return (
                    <div key={ev.id} className="flex flex-wrap items-start gap-x-4 gap-y-1 py-3">
                      <div className="mt-0.5 shrink-0">
                        {risky ? (
                          <ShieldAlert className="h-4.5 w-4.5 text-rose-500" />
                        ) : (
                          <Shield className="h-4.5 w-4.5 text-[#2F6BFF]" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1 basis-56">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-sm font-semibold capitalize text-neutral-900 dark:text-neutral-100">
                            {ev.event_type.replace(/_/g, ' ').toLowerCase()}
                          </span>
                          <span
                            className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${
                              risky
                                ? 'border-rose-500/25 bg-rose-500/10 text-rose-600 dark:text-rose-400'
                                : 'border-emerald-500/25 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                            }`}
                          >
                            {ev.severity}
                          </span>
                        </div>
                        <p className="text-xs text-neutral-500 dark:text-neutral-400">
                          {ev.device_name || 'Browser'} · {[ev.city, ev.country].filter(Boolean).join(', ') || 'Unknown location'}
                        </p>
                        {ev.flagged_reasons?.length > 0 && (
                          <div className="mt-1 flex flex-wrap gap-1">
                            {ev.flagged_reasons.map(r => (
                              <span
                                key={r}
                                className="rounded-md border border-rose-500/20 bg-rose-500/10 px-1.5 py-0.5 font-mono text-[10px] text-rose-600 dark:text-rose-400"
                              >
                                {r.replace(/_/g, ' ')}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                      <span className="shrink-0 font-mono text-[11px] text-neutral-400">{formatTimestamp(ev.created_at)}</span>
                    </div>
                  );
                })
              )}
            </div>
            <p className="mt-3 flex items-center gap-1.5 text-xs text-neutral-500 dark:text-neutral-400">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
              Protected with Argon2id password hashing and HMAC token rotation.
            </p>
          </section>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div
          role="status"
          className="fixed bottom-24 right-4 z-50 flex max-w-sm items-center gap-3 rounded-xl bg-neutral-900 px-4 py-3 text-white shadow-[0_12px_40px_rgba(0,0,0,0.35)] animate-in fade-in slide-in-from-bottom-2 lg:bottom-6 lg:right-6 dark:bg-neutral-800"
        >
          {toast.tone === 'success' ? (
            <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-400" />
          ) : (
            <AlertTriangle className="h-5 w-5 shrink-0 text-rose-400" />
          )}
          <span className="text-sm font-medium">{toast.message}</span>
          <button
            type="button"
            onClick={() => setToast(null)}
            aria-label="Dismiss"
            className="ml-1 cursor-pointer rounded p-0.5 text-neutral-400 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
};

export default AccountView;
