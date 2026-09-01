import React, { useEffect, useState } from 'react';
import {
  Activity,
  AlertCircle,
  ArrowRight,
  Boxes,
  Building2,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  CircleCheck,
  Clock3,
  Command,
  Cpu,
  Eye,
  EyeOff,
  Factory,
  HardHat,
  Lock,
  Mail,
  Moon,
  Route,
  ShieldCheck,
  Sparkles,
  Sun,
  X,
  Zap
} from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useAuth } from '../../context/AuthContext';
import { fetchProfiles } from '../../services/supabaseServices';
import type { SystemUser } from '../../types/console';

export const DEV_ACCOUNTS = [
  {
    email: 'owner@guruom.in',
    password: '1234567890',
    label: 'Executive Owner',
    role: 'SUPER ADMIN',
    name: 'Sachin Gharbude',
  },
  {
    email: 'ppc@guruom.in',
    password: '1234567890',
    label: 'Production Planner',
    role: 'PLANNER',
    name: 'PPC Lead',
  },
  {
    email: 'operator@guruom.in',
    password: '1234567890',
    label: 'Machine Operator',
    role: 'OPERATOR',
    name: 'CNC Machinist',
  },
  {
    email: 'qc@guruom.in',
    password: '1234567890',
    label: 'Quality Inspector',
    role: 'QUALITY_INSPECTOR',
    name: 'Quality Lead',
  },
  {
    email: 'stores@guruom.in',
    password: '1234567890',
    label: 'Store Keeper',
    role: 'STORE_KEEPER',
    name: 'Inventory Manager',
  },
  {
    email: 'dispatch@guruom.in',
    password: '1234567890',
    label: 'Dispatch Lead',
    role: 'DISPATCH_OFFICER',
    name: 'Logistics Supervisor',
  },
  {
    email: 'accounts@guruom.in',
    password: '1234567890',
    label: 'Finance / Accounts',
    role: 'ACCOUNTS',
    name: 'Commercial Lead',
  },
];

interface LoginPageProps {
  onLoginSuccess?: (email: string) => void;
  isDarkMode?: boolean;
  onToggleTheme?: () => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({
  onLoginSuccess,
  isDarkMode = true,
  onToggleTheme,
}) => {
  const { signIn, resetPassword } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isForgotOpen, setIsForgotOpen] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [isResetting, setIsResetting] = useState(false);
  const [isSignUpModalOpen, setIsSignUpModalOpen] = useState(false);
  const [isDevLoginOpen, setIsDevLoginOpen] = useState(false);
  const [demoUsers, setDemoUsers] = useState<SystemUser[]>([]);

  useEffect(() => {
    let cancelled = false;

    fetchProfiles()
      .then((users) => {
        if (!cancelled && users && users.length > 0) {
          setDemoUsers(users);

          try {
            localStorage.setItem('stratum_demo_users', JSON.stringify(users));
          } catch (_) { }
        }
      })
      .catch(() => { });

    return () => {
      cancelled = true;
    };
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email.trim() || !password) {
      setLocalError('Please enter both email and password.');
      return;
    }

    setLocalError(null);
    setSuccessMsg(null);
    setIsLoading(true);

    try {
      const trimmedEmail = email.trim().toLowerCase();
      const { error: authError } = await signIn(trimmedEmail, password);

      if (authError) {
        setLocalError(
          authError.message ||
          'Invalid email or password. Please verify your credentials.',
        );
      } else if (onLoginSuccess) {
        onLoginSuccess(trimmedEmail);
      }
    } catch (err: any) {
      setLocalError(
        err.message || 'An unexpected error occurred during login.',
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleDevQuickLogin = async (
    devEmail: string,
    devPass: string,
  ) => {
    setEmail(devEmail);
    setPassword(devPass);
    setLocalError(null);
    setSuccessMsg(null);
    setIsLoading(true);

    try {
      const { error: authError } = await signIn(devEmail, devPass);

      if (authError) {
        setLocalError(`Login failed: ${authError.message}`);
      } else if (onLoginSuccess) {
        onLoginSuccess(devEmail);
      }
    } catch (err: any) {
      setLocalError(err.message || 'Dev login error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();

    const targetEmail = (forgotEmail || email).trim().toLowerCase();

    if (!targetEmail) {
      setLocalError(
        'Please enter your email address to receive reset instructions.',
      );
      return;
    }

    setIsResetting(true);
    setLocalError(null);

    try {
      const { error: resetError } = await resetPassword(targetEmail);

      if (resetError) {
        setLocalError(resetError.message);
      } else {
        setSuccessMsg(
          `Password reset link sent to ${targetEmail}. Please check your inbox.`,
        );
        setIsForgotOpen(false);
      }
    } catch (err: any) {
      setLocalError(err.message || 'Failed to send reset link.');
    } finally {
      setIsResetting(false);
    }
  };

  const effectiveDevAccounts = DEV_ACCOUNTS.map((account) => {
    const matched = demoUsers.find(
      (user) =>
        user.email?.toLowerCase() === account.email.toLowerCase(),
    );

    return {
      ...account,
      name: matched?.name || account.name,
      role: matched?.role || account.role,
    };
  });

  const inputClassName = `h-13 w-full rounded-2xl border pl-12 pr-4 text-sm font-semibold outline-none transition-[color,background-color,border-color,outline-color,box-shadow,opacity,transform,translate,scale,rotate,filter,backdrop-filter] duration-200 focus:border-[var(--accent-primary)] focus:ring-4 focus:ring-[var(--accent-ring)] ${
    isDarkMode
      ? 'border-white/10 bg-white/[0.04] text-white placeholder:text-slate-500 hover:border-white/20 focus:bg-white/[0.07]'
      : 'border-slate-200 bg-slate-50/80 text-slate-900 placeholder:text-slate-400 hover:border-slate-300 focus:bg-white'
  }`;

  return (
    <div
      className={`relative min-h-screen overflow-hidden font-sans transition-colors duration-300 ${
        isDarkMode
          ? 'bg-[#09090B] text-slate-100'
          : 'bg-[#f4f6fa] text-slate-900'
      }`}
    >
      {/* Dynamic Background Glows & Grid Pattern */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 overflow-hidden"
      >
        <div
          className={`absolute -top-40 -left-40 h-[550px] w-[550px] rounded-full blur-[140px] ${
            isDarkMode ? 'bg-blue-600/15' : 'bg-blue-500/10'
          }`}
        />
        <div
          className={`absolute -bottom-40 -right-40 h-[600px] w-[600px] rounded-full blur-[160px] ${
            isDarkMode ? 'bg-indigo-600/15' : 'bg-indigo-400/10'
          }`}
        />
        <div
          className={`absolute top-1/2 left-1/3 -translate-y-1/2 h-[450px] w-[450px] rounded-full blur-[150px] ${
            isDarkMode ? 'bg-teal-500/10' : 'bg-teal-400/5'
          }`}
        />
      </div>

      <div
        aria-hidden="true"
        className={`pointer-events-none absolute inset-0 opacity-[0.03] ${
          isDarkMode ? 'opacity-[0.05]' : ''
        } bg-[linear-gradient(to_right,currentColor_1px,transparent_1px),linear-gradient(to_bottom,currentColor_1px,transparent_1px)] bg-[size:40px_40px]`}
      />

      <div className="relative mx-auto flex min-h-screen w-full max-w-[1600px] flex-col px-4 py-4 sm:px-6 sm:py-5 lg:px-8">
        {/* Top Header */}
        <header
          className={`flex h-18 shrink-0 items-center justify-between rounded-2xl border px-5 shadow-sm backdrop-blur-xl transition-colors ${
            isDarkMode
              ? 'border-white/[0.08] bg-[#121215]/85 shadow-black/30'
              : 'border-slate-200/80 bg-white/90 shadow-slate-200/50'
          }`}
        >
          {/* Brand Header */}
          <div className="flex min-w-0 items-center gap-3.5">
            <div className="relative flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-br from-[var(--accent-primary)] to-blue-600 text-sm font-black text-white shadow-lg shadow-[var(--accent-shadow)]">
              <span className="relative z-10 font-mono tracking-tighter">SIU</span>
              <div className="absolute -right-2 -top-2 h-7 w-7 rounded-full bg-white/20 blur-xs" />
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span
                  className={`text-lg font-black tracking-tight ${
                    isDarkMode ? 'text-white' : 'text-slate-950'
                  }`}
                >
                  SketchItUp
                </span>
                <span className="rounded-md bg-[var(--accent-primary)]/15 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-[var(--accent-primary)]">
                  OwnerOS
                </span>
              </div>
              <div
                className={`mt-0.5 text-[10px] font-bold uppercase tracking-[0.16em] ${
                  isDarkMode ? 'text-slate-400' : 'text-slate-500'
                }`}
              >
                Industrial Operations Platform
              </div>
            </div>
          </div>

          {/* Right Header Status & Theme Switcher */}
          <div className="flex items-center gap-2.5 sm:gap-3">
            <div
              className={`hidden items-center gap-2 rounded-xl border px-3.5 py-1.5 md:flex ${
                isDarkMode
                  ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-300'
                  : 'border-emerald-200 bg-emerald-50/90 text-emerald-700'
              }`}
            >
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
              </span>
              <span className="text-[10px] font-black uppercase tracking-[0.12em]">
                All Systems Online
              </span>
            </div>

            <div
              className={`hidden h-6 w-px sm:block ${
                isDarkMode ? 'bg-white/10' : 'bg-slate-200'
              }`}
            />

            {onToggleTheme && (
              <button
                type="button"
                onClick={onToggleTheme}
                aria-label="Toggle color theme"
                title={isDarkMode ? 'Switch to light theme' : 'Switch to dark theme'}
                className={`flex h-10 w-10 cursor-pointer items-center justify-center rounded-xl border transition-[color,background-color,border-color,outline-color,box-shadow,opacity,transform,translate,scale,rotate,filter,backdrop-filter] duration-200 ${
                  isDarkMode
                    ? 'border-white/10 bg-white/[0.05] text-slate-300 hover:border-white/20 hover:bg-white/10 hover:text-white'
                    : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50 hover:text-slate-950 shadow-xs'
                }`}
              >
                <AnimatePresence mode="popLayout" initial={false}>
                  <motion.div
                    key={isDarkMode ? 'sun' : 'moon'}
                    initial={{ opacity: 0, scale: 0.25, filter: 'blur(4px)' }}
                    animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
                    exit={{ opacity: 0, scale: 0.25, filter: 'blur(4px)' }}
                    transition={{ type: 'spring', duration: 0.3, bounce: 0 }}
                    className="flex h-8 w-8 items-center justify-center"
                  >
                    {isDarkMode ? (
                      <Sun className="h-4.5 w-4.5 text-amber-400" />
                    ) : (
                      <Moon className="h-4.5 w-4.5 text-slate-700" />
                    )}
                  </motion.div>
                </AnimatePresence>
              </button>
            )}
          </div>
        </header>

        {/* Main Application Container */}
        <main className="flex flex-1 items-center py-5 sm:py-6">
          <div
            className={`grid w-full overflow-hidden rounded-[28px] border shadow-2xl transition-ui lg:min-h-[680px] lg:grid-cols-[minmax(0,1.2fr)_minmax(450px,0.8fr)] xl:grid-cols-[minmax(0,1.25fr)_minmax(480px,0.75fr)] ${
              isDarkMode
                ? 'border-white/[0.08] bg-[#121215] shadow-black/50'
                : 'border-slate-200/90 bg-white shadow-slate-300/40'
            }`}
          >
            {/* Left Operational Showcase */}
            <section
              className={`relative hidden min-w-0 overflow-hidden lg:flex lg:flex-col ${
                isDarkMode
                  ? 'bg-gradient-to-br from-[#09090B] via-[#09090B] to-[#121215]'
                  : 'bg-gradient-to-br from-slate-900 via-[#111827] to-[#0f172a] text-white'
              }`}
            >
              {/* Showcase Background Gradients */}
              <div
                aria-hidden="true"
                className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,rgba(59,130,246,0.18),transparent_40%),radial-gradient(ellipse_at_bottom_right,rgba(20,184,166,0.12),transparent_40%)]"
              />
              <div
                aria-hidden="true"
                className="absolute inset-0 opacity-[0.06] bg-[linear-gradient(to_right,#94a3b8_1px,transparent_1px),linear-gradient(to_bottom,#94a3b8_1px,transparent_1px)] bg-[size:36px_36px]"
              />

              <div className="relative z-10 flex h-full flex-col justify-between p-10 xl:p-12">
                {/* Showcase Top Tag */}
                <div className="flex items-center justify-between">
                  <div className="inline-flex items-center gap-3 rounded-2xl border border-white/15 bg-white/[0.08] px-5 py-2.5 text-lg sm:text-xl font-black tracking-tight text-white backdrop-blur-md shadow-lg shadow-black/20">
                    <Command className="h-5 w-5 text-[var(--accent-primary)]" />
                    <span>Guruom - OwnerOS</span>
                  </div>

                  <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">
                    <Clock3 className="h-3.5 w-3.5 text-blue-400" />
                    <span>Live Telemetry Engine</span>
                  </div>
                </div>

                {/* Showcase Hero Statement */}
                <div className="my-auto max-w-2xl py-8">
                  <h1 className="max-w-[620px] text-4xl font-black leading-[1.08] tracking-[-0.035em] text-white xl:text-[50px]">
                    Work moves better when every signal is visible.
                  </h1>

                  <p className="mt-5 max-w-[540px] text-sm font-medium leading-7 text-slate-300/90 xl:text-base">
                    Coordinate jobs, material inventory, quality inspections, and real-time shop telemetry from one mission-critical operating system.
                  </p>

                  {/* Operational Capabilities Pills */}
                  <div className="mt-8 flex flex-wrap gap-2.5">
                    {[
                      { icon: Factory, label: 'Production Jobs' },
                      { icon: Boxes, label: 'Real-time Stock' },
                      { icon: ShieldCheck, label: 'PDI & Quality' },
                      { icon: Route, label: 'Dispatch Tracking' },
                      { icon: Zap, label: 'Automated Approvals' },
                    ].map(({ icon: Icon, label }) => (
                      <div
                        key={label}
                        className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.05] px-3.5 py-2 text-xs font-bold text-slate-200 backdrop-blur-md transition-colors hover:border-white/20 hover:bg-white/[0.08]"
                      >
                        <Icon className="h-3.5 w-3.5 text-[var(--accent-primary)]" />
                        <span>{label}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Live Platform Health Card */}
                <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.05] backdrop-blur-xl">
                  <div className="flex items-center justify-between border-b border-white/[0.08] px-5 py-3.5">
                    <div className="flex items-center gap-2.5">
                      <Activity className="h-4 w-4 text-emerald-400" />
                      <span className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-300">
                        Shop Floor Telemetry
                      </span>
                    </div>
                    <span className="rounded-full bg-emerald-400/10 px-2.5 py-1 text-[9px] font-black uppercase tracking-wider text-emerald-400 border border-emerald-400/20">
                      Healthy · Latency 24ms
                    </span>
                  </div>

                  <div className="grid grid-cols-3 divide-x divide-white/[0.08]">
                    {[
                      {
                        icon: Activity,
                        value: '99.99%',
                        label: 'Platform Uptime',
                      },
                      {
                        icon: Cpu,
                        value: 'Sub-second',
                        label: 'Shop Sync',
                      },
                      {
                        icon: ShieldCheck,
                        value: 'Enforced',
                        label: 'RBAC Security',
                      },
                    ].map(({ icon: Icon, value, label }) => (
                      <div key={label} className="px-5 py-4">
                        <Icon className="h-4 w-4 text-slate-400" />
                        <div className="mt-3 text-base font-black text-white">
                          {value}
                        </div>
                        <div className="mt-0.5 text-[9px] font-bold uppercase tracking-[0.12em] text-slate-400">
                          {label}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </section>

            {/* Right Authentication Panel */}
            <section
              className={`relative flex min-w-0 flex-col justify-center px-6 py-9 sm:px-10 lg:px-10 xl:px-12 ${
                isDarkMode ? 'bg-[#121215]' : 'bg-white'
              }`}
            >
              <div className="mx-auto w-full max-w-[420px]">
                {/* Form Header */}
                <div className="mb-7">
                  <div
                    className={`mb-4 inline-flex h-11 w-11 items-center justify-center rounded-2xl border transition-colors ${
                      isDarkMode
                        ? 'border-white/10 bg-white/[0.05] text-[var(--accent-primary)]'
                        : 'border-slate-200 bg-slate-50 text-[var(--accent-primary)]'
                    }`}
                  >
                    <HardHat className="h-5 w-5" />
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black uppercase tracking-[0.18em] text-[var(--accent-primary)]">
                      SketchItUp Secure Access
                    </span>
                  </div>

                  <h2
                    className={`mt-1.5 text-2xl sm:text-3xl font-black tracking-tight ${
                      isDarkMode ? 'text-white' : 'text-slate-950'
                    }`}
                  >
                    Sign in to OwnerOS
                  </h2>

                  <p
                    className={`mt-2 text-xs sm:text-sm font-medium leading-relaxed ${
                      isDarkMode ? 'text-slate-400' : 'text-slate-500'
                    }`}
                  >
                    Enter your assigned organization credentials to unlock the operations terminal.
                  </p>
                </div>

                {/* Error Banner */}
                {localError && (
                  <div
                    id="login-error-alert"
                    role="alert"
                    className={`mb-5 flex items-start gap-3 rounded-2xl border p-4 text-xs font-medium leading-5 animate-in fade-in duration-200 ${
                      isDarkMode
                        ? 'border-rose-400/20 bg-rose-400/[0.08] text-rose-200'
                        : 'border-rose-200 bg-rose-50 text-rose-800'
                    }`}
                  >
                    <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-rose-500/10">
                      <AlertCircle className="h-4 w-4 text-rose-400" />
                    </div>
                    <span className="flex-1 pt-0.5">{localError}</span>
                    <button
                      type="button"
                      onClick={() => setLocalError(null)}
                      className="cursor-pointer rounded-md p-1 opacity-60 transition-opacity hover:opacity-100"
                      aria-label="Dismiss error"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                )}

                {/* Success Banner */}
                {successMsg && (
                  <div
                    role="status"
                    className={`mb-5 flex items-start gap-3 rounded-2xl border p-4 text-xs font-medium leading-5 animate-in fade-in duration-200 ${
                      isDarkMode
                        ? 'border-emerald-400/20 bg-emerald-400/[0.08] text-emerald-200'
                        : 'border-emerald-200 bg-emerald-50 text-emerald-800'
                    }`}
                  >
                    <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10">
                      <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                    </div>
                    <span className="flex-1 pt-0.5">{successMsg}</span>
                    <button
                      type="button"
                      onClick={() => setSuccessMsg(null)}
                      className="cursor-pointer rounded-md p-1 opacity-60 transition-opacity hover:opacity-100"
                      aria-label="Dismiss message"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                )}

                {/* Login Form */}
                <form onSubmit={handleLogin} className="space-y-4.5">
                  <div>
                    <label
                      htmlFor="login-email"
                      className={`mb-2 block text-[11px] font-black uppercase tracking-[0.1em] ${
                        isDarkMode ? 'text-slate-300' : 'text-slate-700'
                      }`}
                    >
                      Work Email
                    </label>

                    <div className="relative">
                      <Mail
                        className={`pointer-events-none absolute left-4 top-1/2 h-4.5 w-4.5 -translate-y-1/2 ${
                          isDarkMode ? 'text-slate-500' : 'text-slate-400'
                        }`}
                      />
                      <input
                        id="login-email"
                        type="email"
                        required
                        autoComplete="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="name@company.com"
                        className={inputClassName}
                      />
                    </div>
                  </div>

                  <div>
                    <div className="mb-2 flex items-center justify-between gap-4">
                      <label
                        htmlFor="login-password"
                        className={`block text-[11px] font-black uppercase tracking-[0.1em] ${
                          isDarkMode ? 'text-slate-300' : 'text-slate-700'
                        }`}
                      >
                        Password
                      </label>

                      <button
                        type="button"
                        onClick={() => {
                          setForgotEmail(email);
                          setIsForgotOpen(true);
                        }}
                        className="cursor-pointer text-xs font-bold text-[var(--accent-primary)] transition-opacity hover:opacity-75"
                      >
                        Forgot password?
                      </button>
                    </div>

                    <div className="relative">
                      <Lock
                        className={`pointer-events-none absolute left-4 top-1/2 h-4.5 w-4.5 -translate-y-1/2 ${
                          isDarkMode ? 'text-slate-500' : 'text-slate-400'
                        }`}
                      />
                      <input
                        id="login-password"
                        type={showPassword ? 'text' : 'password'}
                        required
                        autoComplete="current-password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Enter your password"
                        className={`${inputClassName} pr-12`}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className={`absolute right-1 top-1/2 flex h-11 w-11 -translate-y-1/2 cursor-pointer items-center justify-center rounded-xl transition-colors ${
                          isDarkMode
                            ? 'text-slate-500 hover:bg-white/[0.06] hover:text-white'
                            : 'text-slate-400 hover:bg-slate-100 hover:text-slate-700'
                        }`}
                        aria-label={
                          showPassword ? 'Hide password' : 'Show password'
                        }
                      >
                        {showPassword ? (
                          <EyeOff className="h-4.5 w-4.5" />
                        ) : (
                          <Eye className="h-4.5 w-4.5" />
                        )}
                      </button>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="group relative flex h-13 w-full cursor-pointer items-center justify-center overflow-hidden rounded-2xl bg-[var(--accent-primary)] px-5 text-sm font-black text-white shadow-xl shadow-[var(--accent-shadow)] transition-[color,background-color,border-color,outline-color,box-shadow,opacity,transform,translate,scale,rotate,filter,backdrop-filter] duration-200 hover:-translate-y-0.5 hover:brightness-110 active:translate-y-0 disabled:cursor-wait disabled:opacity-60 disabled:hover:translate-y-0 mt-2"
                  >
                    <span className="absolute inset-0 translate-x-[-110%] bg-gradient-to-r from-transparent via-white/20 to-transparent transition-transform duration-700 group-hover:translate-x-[110%]" />

                    {isLoading ? (
                      <span className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                    ) : (
                      <span className="relative flex items-center gap-2.5">
                        <span>Sign In to SketchItUp OwnerOS</span>
                        <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                      </span>
                    )}
                  </button>
                </form>

                {/* Need Access Box */}
                <div
                  className={`mt-6 flex items-center justify-between gap-4 rounded-2xl border px-4 py-3.5 transition-colors ${
                    isDarkMode
                      ? 'border-white/[0.07] bg-white/[0.025]'
                      : 'border-slate-200 bg-slate-50'
                  }`}
                >
                  <div className="min-w-0">
                    <p
                      className={`text-xs font-bold ${
                        isDarkMode ? 'text-slate-300' : 'text-slate-700'
                      }`}
                    >
                      Need workspace access?
                    </p>
                    <p
                      className={`mt-0.5 hidden text-[10px] sm:block ${
                        isDarkMode ? 'text-slate-500' : 'text-slate-500'
                      }`}
                    >
                      Contact your SketchItUp system administrator
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => setIsSignUpModalOpen(true)}
                    className="shrink-0 cursor-pointer rounded-xl px-3 py-1.5 text-xs font-black text-[var(--accent-primary)] transition-colors hover:bg-[var(--accent-ring)]"
                  >
                    Request access
                  </button>
                </div>

                {/* Developer Role Quick Login Drawer */}
                <div
                  className={`mt-4 overflow-hidden rounded-2xl border transition-colors ${
                    isDarkMode
                      ? 'border-white/[0.07] bg-white/[0.025]'
                      : 'border-slate-200 bg-white'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => setIsDevLoginOpen(!isDevLoginOpen)}
                    aria-expanded={isDevLoginOpen}
                    className={`flex min-h-12 w-full cursor-pointer items-center justify-between gap-3 px-4 text-left transition-colors ${
                      isDarkMode ? 'hover:bg-white/[0.04]' : 'hover:bg-slate-50'
                    }`}
                  >
                    <span className="flex min-w-0 items-center gap-2.5">
                      <span
                        className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${
                          isDarkMode ? 'bg-amber-400/10' : 'bg-amber-50'
                        }`}
                      >
                        <Sparkles className="h-3.5 w-3.5 text-amber-400" />
                      </span>

                      <span className="min-w-0">
                        <span
                          className={`block text-xs font-black ${
                            isDarkMode ? 'text-slate-200' : 'text-slate-800'
                          }`}
                        >
                          Developer Quick Login
                        </span>
                        <span
                          className={`block text-[9px] font-bold uppercase tracking-[0.1em] ${
                            isDarkMode ? 'text-slate-500' : 'text-slate-400'
                          }`}
                        >
                          Testing & QA Persona Switching
                        </span>
                      </span>
                    </span>

                    <ChevronDown
                      className={`h-4 w-4 shrink-0 transition-transform duration-200 ${
                        isDevLoginOpen ? 'rotate-180' : ''
                      } ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}
                    />
                  </button>

                  {isDevLoginOpen && (
                    <div
                      className={`border-t p-3 ${
                        isDarkMode ? 'border-white/[0.07]' : 'border-slate-200'
                      }`}
                    >
                      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                        {effectiveDevAccounts.map((account) => (
                          <button
                            key={account.email}
                            type="button"
                            onClick={() =>
                              handleDevQuickLogin(
                                account.email,
                                account.password,
                              )
                            }
                            disabled={isLoading}
                            className={`group flex min-h-[62px] cursor-pointer items-center justify-between gap-3 rounded-xl border px-3.5 py-2.5 text-left transition-ui disabled:cursor-wait disabled:opacity-50 ${
                              isDarkMode
                                ? 'border-white/[0.07] bg-[#09090B] hover:border-[var(--accent-primary)] hover:bg-white/[0.04]'
                                : 'border-slate-200 bg-slate-50 hover:border-[var(--accent-primary)] hover:bg-white hover:shadow-xs'
                            }`}
                          >
                            <span className="min-w-0">
                              <span
                                className={`block truncate text-xs font-black ${
                                  isDarkMode ? 'text-slate-200' : 'text-slate-800'
                                }`}
                              >
                                {account.label}
                              </span>
                              <span
                                className={`mt-0.5 block truncate text-[9px] font-bold uppercase tracking-[0.08em] ${
                                  isDarkMode ? 'text-slate-500' : 'text-slate-400'
                                }`}
                              >
                                {account.role}
                              </span>
                            </span>

                            <ChevronRight className="h-4 w-4 shrink-0 text-[var(--accent-primary)] transition-transform group-hover:translate-x-0.5" />
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </section>
          </div>
        </main>

        {/* Footer */}
        <footer
          className={`flex shrink-0 flex-col gap-2 px-1 text-[9px] font-bold uppercase tracking-[0.14em] sm:flex-row sm:items-center sm:justify-between ${
            isDarkMode ? 'text-slate-500' : 'text-slate-500'
          }`}
        >
          <span>SketchItUp Solutions · OwnerOS · Enterprise Build</span>
          <span className="flex items-center gap-2">
            <CircleCheck className="h-3.5 w-3.5 text-emerald-400" />
            <span>Encrypted Session · Role-Based Security</span>
          </span>
        </footer>
      </div>

      {/* Forgot Password Dialog */}
      {isForgotOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#000000]/80 p-4 backdrop-blur-md"
          role="dialog"
          aria-modal="true"
          aria-labelledby="reset-password-title"
        >
          <div
            className={`w-full max-w-md overflow-hidden rounded-[26px] border shadow-2xl ${
              isDarkMode
                ? 'border-white/10 bg-[#121215] text-white shadow-black/50'
                : 'border-white bg-white text-slate-950 shadow-slate-900/20'
            }`}
          >
            <div
              className={`flex items-start justify-between border-b p-6 sm:p-7 ${
                isDarkMode ? 'border-white/[0.08]' : 'border-slate-200'
              }`}
            >
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--accent-primary)] text-white shadow-lg shadow-[var(--accent-shadow)]">
                  <Mail className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-[9px] font-black uppercase tracking-[0.18em] text-[var(--accent-primary)]">
                    Account Recovery
                  </p>
                  <h2
                    id="reset-password-title"
                    className="mt-1 text-xl font-black"
                  >
                    Reset Password
                  </h2>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsForgotOpen(false)}
                className={`flex h-10 w-10 cursor-pointer items-center justify-center rounded-xl border transition-colors ${
                  isDarkMode
                    ? 'border-white/10 text-slate-400 hover:bg-white/[0.06] hover:text-white'
                    : 'border-slate-200 text-slate-500 hover:bg-slate-100 hover:text-slate-950'
                }`}
                aria-label="Close reset password dialog"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6 sm:p-7">
              <p
                className={`text-sm font-medium leading-6 ${
                  isDarkMode ? 'text-slate-400' : 'text-slate-600'
                }`}
              >
                Enter your registered work email. We will send password reset instructions to your inbox.
              </p>

              <form
                onSubmit={handleSendResetPassword}
                className="mt-6 space-y-5"
              >
                <div>
                  <label
                    htmlFor="forgot-email"
                    className={`mb-2.5 block text-[11px] font-black uppercase tracking-[0.1em] ${
                      isDarkMode ? 'text-slate-300' : 'text-slate-700'
                    }`}
                  >
                    Work Email
                  </label>

                  <div className="relative">
                    <Mail
                      className={`pointer-events-none absolute left-4 top-1/2 h-4.5 w-4.5 -translate-y-1/2 ${
                        isDarkMode ? 'text-slate-500' : 'text-slate-400'
                      }`}
                    />
                    <input
                      id="forgot-email"
                      type="email"
                      required
                      autoComplete="email"
                      value={forgotEmail}
                      onChange={(e) => setForgotEmail(e.target.value)}
                      placeholder="name@company.com"
                      className={inputClassName}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setIsForgotOpen(false)}
                    className={`h-12 cursor-pointer rounded-2xl border text-sm font-black transition-colors ${
                      isDarkMode
                        ? 'border-white/10 text-slate-300 hover:bg-white/[0.06]'
                        : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    disabled={isResetting}
                    className="flex h-12 cursor-pointer items-center justify-center rounded-2xl bg-[var(--accent-primary)] px-4 text-sm font-black text-white shadow-lg shadow-[var(--accent-shadow)] transition-ui hover:brightness-110 disabled:cursor-wait disabled:opacity-60"
                  >
                    {isResetting ? (
                      <span className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                    ) : (
                      'Send reset link'
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Enterprise Access Dialog */}
      {isSignUpModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#000000]/80 p-4 backdrop-blur-md"
          role="dialog"
          aria-modal="true"
          aria-labelledby="enterprise-access-title"
        >
          <div
            className={`w-full max-w-md overflow-hidden rounded-[26px] border shadow-2xl ${
              isDarkMode
                ? 'border-white/10 bg-[#121215] text-white shadow-black/50'
                : 'border-white bg-white text-slate-950 shadow-slate-900/20'
            }`}
          >
            <div className="relative overflow-hidden px-6 pb-6 pt-8 text-center sm:px-8">
              <div
                aria-hidden="true"
                className="absolute left-1/2 top-0 h-40 w-40 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[var(--accent-primary)] opacity-10 blur-3xl"
              />

              <div className="relative mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--accent-primary)] text-white shadow-xl shadow-[var(--accent-shadow)]">
                <Building2 className="h-6 w-6" />
              </div>

              <p className="mt-5 text-[9px] font-black uppercase tracking-[0.18em] text-[var(--accent-primary)]">
                Managed Workspace
              </p>

              <h2
                id="enterprise-access-title"
                className="mt-2 text-2xl font-black tracking-tight"
              >
                SketchItUp OwnerOS Access
              </h2>

              <p
                className={`mx-auto mt-3 max-w-sm text-sm font-medium leading-6 ${
                  isDarkMode ? 'text-slate-400' : 'text-slate-600'
                }`}
              >
                SketchItUp OwnerOS user accounts and role permissions are provisioned centrally by your organization&apos;s system administrator.
              </p>
            </div>

            <div className="px-6 pb-7 sm:px-8">
              <div
                className={`flex items-start gap-3 rounded-2xl border p-4 text-left ${
                  isDarkMode
                    ? 'border-white/[0.08] bg-white/[0.035]'
                    : 'border-slate-200 bg-slate-50'
                }`}
              >
                <div
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${
                    isDarkMode ? 'bg-amber-400/10' : 'bg-amber-100'
                  }`}
                >
                  <Sparkles className="h-4 w-4 text-amber-400" />
                </div>

                <div>
                  <p
                    className={`text-xs font-black ${
                      isDarkMode ? 'text-white' : 'text-slate-900'
                    }`}
                  >
                    Testing Access
                  </p>
                  <p
                    className={`mt-1 text-xs font-medium leading-5 ${
                      isDarkMode ? 'text-slate-400' : 'text-slate-600'
                    }`}
                  >
                    Use a configured role from the Developer Quick Login section on the sign-in panel.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsSignUpModalOpen(false)}
                className="mt-5 h-12 w-full cursor-pointer rounded-2xl bg-[var(--accent-primary)] text-sm font-black text-white shadow-lg shadow-[var(--accent-shadow)] transition-ui hover:brightness-110"
              >
                Understood
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LoginPage;
