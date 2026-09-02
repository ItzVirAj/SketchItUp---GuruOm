import React, { useState } from 'react';
import {
  Activity,
  AlertCircle,
  ArrowRight,
  Boxes,
  Building2,
  CheckCircle2,
  CircleCheck,
  Cpu,
  Eye,
  EyeOff,
  Factory,
  HardHat,
  KeyRound,
  Lock,
  Mail,
  Moon,
  RotateCcw,
  Route,
  ShieldAlert,
  ShieldCheck,
  Sun,
  Truck,
  UserCheck,
  X,
  Zap
} from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useAuth } from '../../context/AuthContext';
import { ApiError } from '../../lib/apiClient';

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
  const [pwErrorModal, setPwErrorModal] = useState<{ title: string; message: string } | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email.trim() || !password) {
      setLocalError('Enter both your work email and password to continue.');
      return;
    }

    setLocalError(null);
    setSuccessMsg(null);
    setIsLoading(true);

    try {
      const trimmedEmail = email.trim().toLowerCase();
      const { error: authError } = await signIn(trimmedEmail, password);

      if (authError) {
        const status = authError instanceof ApiError ? authError.statusCode : undefined;

        if (status === 401) {
          // Calm, respectful Apple alert dialog without native browser alert popups
          setLocalError(null);
          setPassword('');
          setPwErrorModal({
            title: 'Incorrect email or password',
            message: 'The email address or password you entered does not match our records. Verify your credentials and try again.'
          });
        } else if (status === 429) {
          setLocalError(null);
          setPwErrorModal({
            title: 'Too many sign-in attempts',
            message: 'For your security, access is temporarily locked. Wait a few moments before trying again.'
          });
        } else {
          setLocalError(
            authError.message || 'Unable to sign in. Verify your credentials and try again.'
          );
        }
      } else if (onLoginSuccess) {
        onLoginSuccess(trimmedEmail);
      }
    } catch (err: any) {
      setLocalError(
        err.message || 'Unable to complete sign-in. Check your connection and try again.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();

    const targetEmail = (forgotEmail || email).trim().toLowerCase();

    if (!targetEmail) {
      setLocalError('Enter your work email address to receive reset instructions.');
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
          `Password reset link dispatched to ${targetEmail}. Check your inbox.`
        );
        setIsForgotOpen(false);
      }
    } catch (err: any) {
      setLocalError(err.message || 'Unable to dispatch reset link. Try again later.');
    } finally {
      setIsResetting(false);
    }
  };

  const inputClassName = `h-12 w-full rounded-xl border pl-11 pr-4 text-sm font-medium outline-none transition-[border-color,box-shadow,background-color] duration-150 focus:border-[#007AFF] focus:ring-4 focus:ring-[#007AFF]/15 ${
    isDarkMode
      ? 'border-white/10 bg-black/40 text-white placeholder:text-slate-500 hover:border-white/20 focus:bg-black/60'
      : 'border-slate-200 bg-slate-50 text-slate-900 placeholder:text-slate-400 hover:border-slate-300 focus:bg-white'
  }`;

  return (
    <div
      className={`relative min-h-screen overflow-hidden font-sans transition-colors duration-300 ${
        isDarkMode ? 'bg-[#09090B] text-slate-100' : 'bg-[#F5F5F7] text-slate-900'
      }`}
    >
      {/* Apple Subtle Ambient Lighting */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
        <div
          className={`absolute -top-32 left-1/4 h-[500px] w-[500px] rounded-full blur-[140px] opacity-40 ${
            isDarkMode ? 'bg-blue-600/20' : 'bg-blue-400/20'
          }`}
        />
        <div
          className={`absolute -bottom-32 right-1/4 h-[550px] w-[550px] rounded-full blur-[160px] opacity-40 ${
            isDarkMode ? 'bg-indigo-600/20' : 'bg-indigo-400/20'
          }`}
        />
      </div>

      {/* Subtle Apple dot pattern */}
      <div
        aria-hidden="true"
        className={`pointer-events-none absolute inset-0 opacity-[0.02] ${
          isDarkMode ? 'opacity-[0.03]' : ''
        } bg-[radial-gradient(#888_1px,transparent_1px)] [background-size:24px_24px]`}
      />

      <div className="relative mx-auto flex min-h-screen w-full max-w-[1440px] flex-col px-4 py-4 sm:px-6 sm:py-6 lg:px-8">
        {/* Top Header / Navigation */}
        <header
          className={`flex h-16 shrink-0 items-center justify-between rounded-2xl border px-5 backdrop-blur-2xl transition-colors ${
            isDarkMode
              ? 'border-white/10 bg-[#09090B]/80 shadow-[0_4px_20px_rgba(0,0,0,0.4)]'
              : 'border-slate-200/80 bg-white/80 shadow-[0_4px_20px_rgba(0,0,0,0.04)]'
          }`}
        >
          {/* Brand Mark & Title */}
          <div className="flex min-w-0 items-center gap-3">
            <div className="relative flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-gradient-to-br from-[#007AFF] to-[#5856D6] text-white shadow-md shadow-blue-500/20">
              <span className="font-mono text-sm font-black tracking-tight">GO</span>
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className={`text-base font-semibold tracking-tight ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                  GuruOm
                </span>
                <span className="rounded-full bg-[#007AFF]/15 px-2 py-0.5 text-[10px] font-semibold text-[#007AFF]">
                  OwnerOS
                </span>
              </div>
              <p className={`text-[11px] ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                Precision Engineering Enterprise
              </p>
            </div>
          </div>

          {/* Right Status Indicator & Theme Switcher */}
          <div className="flex items-center gap-3">
            <div
              className={`hidden items-center gap-2 rounded-full border px-3 py-1 sm:flex ${
                isDarkMode
                  ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-300'
                  : 'border-emerald-200 bg-emerald-50 text-emerald-700'
              }`}
            >
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
              </span>
              <span className="text-[11px] font-medium">All services operational</span>
            </div>

            <div className={`hidden h-5 w-px sm:block ${isDarkMode ? 'bg-white/10' : 'bg-slate-200'}`} />

            {onToggleTheme && (
              <button
                type="button"
                onClick={onToggleTheme}
                aria-label="Toggle color theme"
                title={isDarkMode ? 'Switch to light appearance' : 'Switch to dark appearance'}
                className={`flex h-9 w-9 cursor-pointer items-center justify-center rounded-xl border transition-colors ${
                  isDarkMode
                    ? 'border-white/10 bg-white/[0.04] text-slate-300 hover:bg-white/10 hover:text-white'
                    : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                <AnimatePresence mode="popLayout" initial={false}>
                  <motion.div
                    key={isDarkMode ? 'sun' : 'moon'}
                    initial={{ opacity: 0, scale: 0.5 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.5 }}
                    transition={{ duration: 0.15 }}
                    className="flex h-6 w-6 items-center justify-center"
                  >
                    {isDarkMode ? (
                      <Sun className="h-4 w-4 text-amber-400" />
                    ) : (
                      <Moon className="h-4 w-4 text-slate-700" />
                    )}
                  </motion.div>
                </AnimatePresence>
              </button>
            )}
          </div>
        </header>

        {/* Main Application Container */}
        <main className="flex flex-1 items-center justify-center py-6 sm:py-8">
          <div
            className={`grid w-full overflow-hidden rounded-3xl border shadow-2xl transition-all lg:grid-cols-12 ${
              isDarkMode
                ? 'border-white/10 bg-[#09090B] shadow-[0_32px_96px_rgba(0,0,0,0.85)]'
                : 'border-slate-200/90 bg-white shadow-[0_32px_96px_rgba(0,0,0,0.08)]'
            }`}
          >
            {/* Left Operational Showcase (Apple Pro Enterprise Style) */}
            <section
              className={`relative hidden min-w-0 flex-col justify-between p-10 lg:col-span-7 lg:flex xl:p-12 ${
                isDarkMode
                  ? 'border-r border-white/10 bg-gradient-to-br from-[#09090B] via-[#0E0E12] to-[#14141A]'
                  : 'border-r border-slate-200 bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900 text-white'
              }`}
            >
              {/* Subtle ambient lighting inside showcase */}
              <div
                aria-hidden="true"
                className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,rgba(0,122,255,0.12),transparent_50%),radial-gradient(ellipse_at_bottom_right,rgba(52,199,89,0.08),transparent_50%)]"
              />

              {/* Showcase Header */}
              <div className="relative z-10">
                <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.05] px-3.5 py-1 text-xs font-medium text-slate-300 backdrop-blur-md">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#007AFF]" />
                  <span>Enterprise Operations Console</span>
                </div>
              </div>

              {/* Showcase Hero Statement */}
              <div className="relative z-10 my-auto py-8">
                <h1 className="max-w-[560px] text-3xl font-bold tracking-tight text-white sm:text-4xl lg:text-[42px] lg:leading-[1.12]">
                  Precision manufacturing, orchestrated in real time.
                </h1>

                <p className="mt-4 max-w-[500px] text-sm font-normal leading-relaxed text-slate-300/90 sm:text-base">
                  Monitor production jobs, material inventory, quality inspection, and outward dispatch from a single, unified system.
                </p>

                {/* Core Capability Badges */}
                <div className="mt-8 flex flex-wrap gap-2">
                  {[
                    { icon: Factory, label: 'Production & Job Cards' },
                    { icon: Boxes, label: 'Raw & Component Inventory' },
                    { icon: ShieldCheck, label: 'Quality Control (QC)' },
                    { icon: CheckCircle2, label: 'Pre-Dispatch Clearance (PDI)' },
                    { icon: Route, label: 'Outward Logistics & POD' },
                    { icon: Zap, label: 'Statutory Rule 55 Delivery' },
                  ].map(({ icon: Icon, label }) => (
                    <div
                      key={label}
                      className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs font-medium text-slate-200 backdrop-blur-md transition-colors hover:border-white/20 hover:bg-white/[0.08]"
                    >
                      <Icon className="h-3.5 w-3.5 text-[#007AFF]" />
                      <span>{label}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Live Operational Status Widget */}
              <div className="relative z-10 rounded-2xl border border-white/10 bg-white/[0.04] p-5 backdrop-blur-xl">
                <div className="flex items-center justify-between border-b border-white/10 pb-3">
                  <div className="flex items-center gap-2">
                    <Activity className="h-4 w-4 text-emerald-400" />
                    <span className="text-xs font-medium text-slate-300">Shop floor telemetry</span>
                  </div>
                  <span className="rounded-full bg-emerald-400/10 px-2.5 py-0.5 text-[11px] font-medium text-emerald-400">
                    Active · 18 ms latency
                  </span>
                </div>

                <div className="mt-3.5 grid grid-cols-3 gap-4 text-left">
                  <div>
                    <div className="text-lg font-semibold text-white">99.98%</div>
                    <div className="text-[11px] text-slate-400">Platform uptime</div>
                  </div>
                  <div>
                    <div className="text-lg font-semibold text-white">Real time</div>
                    <div className="text-[11px] text-slate-400">Data sync</div>
                  </div>
                  <div>
                    <div className="text-lg font-semibold text-white">Enforced</div>
                    <div className="text-[11px] text-slate-400">Role security (RBAC)</div>
                  </div>
                </div>
              </div>
            </section>

            {/* Right Authentication Panel */}
            <section
              className={`relative flex min-w-0 flex-col justify-center px-6 py-10 sm:px-10 lg:col-span-5 lg:px-10 xl:px-12 ${
                isDarkMode ? 'bg-[#09090B]' : 'bg-white'
              }`}
            >
              <div className="mx-auto w-full max-w-[380px]">
                {/* Form Header */}
                <div className="mb-6">
                  <div
                    className={`mb-4 inline-flex h-11 w-11 items-center justify-center rounded-xl border ${
                      isDarkMode
                        ? 'border-white/10 bg-white/[0.04] text-[#007AFF]'
                        : 'border-slate-200 bg-slate-50 text-[#007AFF]'
                    }`}
                  >
                    <KeyRound className="h-5 w-5" />
                  </div>

                  <h2
                    className={`text-2xl font-bold tracking-tight ${
                      isDarkMode ? 'text-white' : 'text-slate-900'
                    }`}
                  >
                    Sign in
                  </h2>

                  <p
                    className={`mt-1.5 text-xs font-normal leading-relaxed ${
                      isDarkMode ? 'text-slate-400' : 'text-slate-500'
                    }`}
                  >
                    Access GuruOm OwnerOS to manage manufacturing, quality, and dispatch.
                  </p>
                </div>

                {/* Inline Error Banner */}
                {localError && (
                  <div
                    role="alert"
                    className="mb-5 flex items-start gap-2.5 rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-xs leading-relaxed text-red-200"
                  >
                    <AlertCircle className="h-4 w-4 shrink-0 text-red-400 mt-0.5" />
                    <span className="flex-1">{localError}</span>
                    <button
                      type="button"
                      onClick={() => setLocalError(null)}
                      className="cursor-pointer text-slate-400 hover:text-white"
                      aria-label="Dismiss error"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                )}

                {/* Inline Success Banner */}
                {successMsg && (
                  <div
                    role="status"
                    className="mb-5 flex items-start gap-2.5 rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-3 text-xs leading-relaxed text-emerald-200"
                  >
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400 mt-0.5" />
                    <span className="flex-1">{successMsg}</span>
                    <button
                      type="button"
                      onClick={() => setSuccessMsg(null)}
                      className="cursor-pointer text-slate-400 hover:text-white"
                      aria-label="Dismiss message"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                )}

                {/* Sign-in Form */}
                <form onSubmit={handleLogin} className="space-y-4">
                  <div>
                    <label
                      htmlFor="login-email"
                      className={`mb-1.5 block text-xs font-medium ${
                        isDarkMode ? 'text-slate-300' : 'text-slate-700'
                      }`}
                    >
                      Work email
                    </label>

                    <div className="relative">
                      <Mail
                        className={`pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 ${
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
                        placeholder="name@guruom.in"
                        className={inputClassName}
                      />
                    </div>
                  </div>

                  <div>
                    <div className="mb-1.5 flex items-center justify-between">
                      <label
                        htmlFor="login-password"
                        className={`block text-xs font-medium ${
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
                        className="cursor-pointer text-xs font-medium text-[#007AFF] hover:underline"
                      >
                        Forgot password?
                      </button>
                    </div>

                    <div className="relative">
                      <Lock
                        className={`pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 ${
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
                        placeholder="Enter password"
                        className={`${inputClassName} pr-11`}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className={`absolute right-1.5 top-1/2 flex h-9 w-9 -translate-y-1/2 cursor-pointer items-center justify-center rounded-lg transition-colors ${
                          isDarkMode
                            ? 'text-slate-400 hover:bg-white/10 hover:text-white'
                            : 'text-slate-400 hover:bg-slate-100 hover:text-slate-700'
                        }`}
                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="flex h-12 w-full cursor-pointer items-center justify-center rounded-xl bg-[#007AFF] px-4 text-sm font-semibold text-white shadow-md shadow-blue-500/25 transition-all hover:bg-[#0071E3] active:scale-[0.98] disabled:cursor-wait disabled:opacity-60 mt-1"
                  >
                    {isLoading ? (
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                    ) : (
                      <span className="flex items-center gap-2">
                        <span>Sign in</span>
                        <ArrowRight className="h-4 w-4" />
                      </span>
                    )}
                  </button>
                </form>

                {/* Request Access Box */}
                <div
                  className={`mt-6 flex items-center justify-between gap-3 rounded-xl border p-3.5 transition-colors ${
                    isDarkMode ? 'border-white/10 bg-white/[0.02]' : 'border-slate-200 bg-slate-50'
                  }`}
                >
                  <div className="min-w-0">
                    <p className={`text-xs font-medium ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                      Need an account?
                    </p>
                    <p className={`text-[11px] ${isDarkMode ? 'text-slate-500' : 'text-slate-500'}`}>
                      Contact your plant administrator.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => setIsSignUpModalOpen(true)}
                    className="shrink-0 cursor-pointer rounded-lg px-2.5 py-1 text-xs font-semibold text-[#007AFF] hover:bg-[#007AFF]/10 transition-colors"
                  >
                    Request access
                  </button>
                </div>
              </div>
            </section>
          </div>
        </main>

        {/* Footer */}
        <footer
          className={`flex shrink-0 flex-col gap-2 px-1 text-[11px] font-normal sm:flex-row sm:items-center sm:justify-between ${
            isDarkMode ? 'text-slate-500' : 'text-slate-500'
          }`}
        >
          <span>© 2026 Guru Om Precision Engineering Pvt. Ltd. · OwnerOS Enterprise</span>
          <span className="flex items-center gap-1.5">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
            <span>Encrypted connection · Role-based access control</span>
          </span>
        </footer>
      </div>

      {/* Forgot Password Dialog (Apple Sheet Style) */}
      {isForgotOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-md"
          role="dialog"
          aria-modal="true"
          aria-labelledby="reset-password-title"
        >
          <div
            className={`w-full max-w-md overflow-hidden rounded-3xl border shadow-2xl animate-in fade-in zoom-in-95 duration-150 ${
              isDarkMode
                ? 'border-white/10 bg-[#09090B] text-white shadow-[0_24px_60px_rgba(0,0,0,0.8)]'
                : 'border-slate-200 bg-white text-slate-900 shadow-2xl'
            }`}
          >
            <div
              className={`flex items-start justify-between border-b p-5 sm:p-6 ${
                isDarkMode ? 'border-white/10 bg-black/40' : 'border-slate-200 bg-slate-50'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#007AFF]/15 text-[#007AFF] border border-[#007AFF]/30">
                  <Mail className="h-5 w-5" />
                </div>
                <div>
                  <h2 id="reset-password-title" className="text-lg font-bold tracking-tight">
                    Reset password
                  </h2>
                  <p className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                    Account recovery instructions
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsForgotOpen(false)}
                className={`flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg border transition-colors ${
                  isDarkMode
                    ? 'border-white/10 text-slate-400 hover:bg-white/10 hover:text-white'
                    : 'border-slate-200 text-slate-500 hover:bg-slate-100 hover:text-slate-900'
                }`}
                aria-label="Close dialog"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="p-5 sm:p-6">
              <p className={`text-xs leading-relaxed ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                Enter your work email address below. We will send you a secure link to reset your password.
              </p>

              <form onSubmit={handleSendResetPassword} className="mt-5 space-y-4">
                <div>
                  <label
                    htmlFor="forgot-email"
                    className={`mb-1.5 block text-xs font-medium ${
                      isDarkMode ? 'text-slate-300' : 'text-slate-700'
                    }`}
                  >
                    Work email
                  </label>

                  <div className="relative">
                    <Mail
                      className={`pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 ${
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
                      placeholder="name@guruom.in"
                      className={inputClassName}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2.5 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsForgotOpen(false)}
                    className={`h-11 cursor-pointer rounded-xl border text-xs font-semibold transition-colors ${
                      isDarkMode
                        ? 'border-white/10 text-slate-300 hover:bg-white/10'
                        : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    disabled={isResetting}
                    className="flex h-11 cursor-pointer items-center justify-center rounded-xl bg-[#007AFF] px-4 text-xs font-semibold text-white shadow-sm transition-all hover:bg-[#0071E3] active:scale-[0.98] disabled:cursor-wait disabled:opacity-60"
                  >
                    {isResetting ? (
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
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
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-md"
          role="dialog"
          aria-modal="true"
          aria-labelledby="enterprise-access-title"
        >
          <div
            className={`w-full max-w-md overflow-hidden rounded-3xl border shadow-2xl animate-in fade-in zoom-in-95 duration-150 ${
              isDarkMode
                ? 'border-white/10 bg-[#09090B] text-white shadow-[0_24px_60px_rgba(0,0,0,0.8)]'
                : 'border-slate-200 bg-white text-slate-900 shadow-2xl'
            }`}
          >
            <div className="relative px-6 pb-4 pt-7 text-center sm:px-8">
              <div className="relative mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[#007AFF]/15 text-[#007AFF] border border-[#007AFF]/30">
                <Building2 className="h-6 w-6" />
              </div>

              <h2
                id="enterprise-access-title"
                className="mt-4 text-xl font-bold tracking-tight"
              >
                Request account access
              </h2>

              <p
                className={`mx-auto mt-2 max-w-sm text-xs font-normal leading-relaxed ${
                  isDarkMode ? 'text-slate-400' : 'text-slate-600'
                }`}
              >
                GuruOm OwnerOS credentials and role permissions are managed centrally by your organization.
              </p>
            </div>

            <div className="px-6 pb-6 sm:px-8">
              <div
                className={`flex items-start gap-3 rounded-xl border p-3.5 text-left ${
                  isDarkMode ? 'border-white/10 bg-white/[0.03]' : 'border-slate-200 bg-slate-50'
                }`}
              >
                <ShieldCheck className="h-4 w-4 shrink-0 text-[#007AFF] mt-0.5" />
                <div>
                  <p className={`text-xs font-semibold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                    Access control policy
                  </p>
                  <p className={`mt-0.5 text-[11px] leading-relaxed ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                    Contact your shift supervisor or IT administrator to create your account with the appropriate department permissions.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsSignUpModalOpen(false)}
                className="mt-5 h-11 w-full cursor-pointer rounded-xl bg-[#007AFF] text-xs font-semibold text-white shadow-sm transition-all hover:bg-[#0071E3] active:scale-[0.98]"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Polite Apple-style Credentials Error Dialog */}
      {pwErrorModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-md"
          role="alertdialog"
          aria-modal="true"
          aria-labelledby="wrong-password-title"
        >
          <div
            className={`w-full max-w-sm overflow-hidden rounded-3xl border shadow-2xl animate-in fade-in zoom-in-95 duration-150 ${
              isDarkMode
                ? 'border-white/10 bg-[#09090B] text-white shadow-[0_24px_60px_rgba(0,0,0,0.8)]'
                : 'border-slate-200 bg-white text-slate-900 shadow-2xl'
            }`}
          >
            <div className="px-6 pb-2 pt-6 text-center sm:px-7">
              <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-500/15 text-amber-400 border border-amber-500/30">
                <AlertCircle className="h-5 w-5" />
              </div>

              <h2
                id="wrong-password-title"
                className="mt-3.5 text-base font-bold tracking-tight"
              >
                {pwErrorModal.title}
              </h2>

              <p
                className={`mx-auto mt-2 text-xs font-normal leading-relaxed ${
                  isDarkMode ? 'text-slate-400' : 'text-slate-600'
                }`}
              >
                {pwErrorModal.message}
              </p>
            </div>

            <div className="px-6 pb-6 pt-3 sm:px-7 space-y-2">
              <button
                type="button"
                onClick={() => {
                  setPwErrorModal(null);
                  document.getElementById('login-password')?.focus();
                }}
                className="h-10 w-full cursor-pointer rounded-xl bg-[#007AFF] text-xs font-semibold text-white transition-all hover:bg-[#0071E3] active:scale-[0.98]"
              >
                Try again
              </button>

              <button
                type="button"
                onClick={() => {
                  setPwErrorModal(null);
                  setForgotEmail(email);
                  setIsForgotOpen(true);
                }}
                className={`h-10 w-full cursor-pointer rounded-xl border text-xs font-medium transition-colors ${
                  isDarkMode
                    ? 'border-white/10 text-slate-300 hover:bg-white/10'
                    : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                }`}
              >
                Reset password
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LoginPage;
