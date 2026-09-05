import React, { useState } from 'react';
import {
  AlertCircle,
  ArrowRight,
  Building2,
  CheckCircle2,
  Eye,
  EyeOff,
  HelpCircle,
  KeyRound,
  Lock,
  Mail,
  Moon,
  ShieldCheck,
  Sun,
  X
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

  // Real-time inline field & auth state alerts
  const [inlineAlert, setInlineAlert] = useState<{
    type: 'error' | 'warning' | 'success';
    title: string;
    message: string;
  } | null>(null);

  const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string }>({});
  const [isForgotOpen, setIsForgotOpen] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [isResetting, setIsResetting] = useState(false);
  const [isRequestAccessOpen, setIsRequestAccessOpen] = useState(false);

  const validateForm = () => {
    const errors: { email?: string; password?: string } = {};
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!email.trim()) {
      errors.email = 'Work email is required.';
    } else if (!emailRegex.test(email.trim())) {
      errors.email = 'Enter a valid enterprise work email address.';
    }

    if (!password) {
      errors.password = 'Password is required.';
    } else if (password.length < 4) {
      errors.password = 'Password must be at least 4 characters.';
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      setInlineAlert({
        type: 'warning',
        title: 'Incomplete Credentials',
        message: 'Please resolve the highlighted fields below before attempting to sign in.'
      });
      return;
    }

    setInlineAlert(null);
    setFieldErrors({});
    setIsLoading(true);

    try {
      const trimmedEmail = email.trim().toLowerCase();
      const { error: authError } = await signIn(trimmedEmail, password);

      if (authError) {
        const status = authError instanceof ApiError ? authError.statusCode : undefined;

        if (status === 401) {
          setFieldErrors({ password: 'Incorrect password entered.' });
          setInlineAlert({
            type: 'error',
            title: 'Authentication Failed (401)',
            message: 'The password or work email entered does not match our verified records. Please check your credentials and try again.'
          });
        } else if (status === 404) {
          setFieldErrors({ email: 'No account registered with this email.' });
          setInlineAlert({
            type: 'error',
            title: 'Account Not Found',
            message: 'We could not find an active OwnerOS profile for this email address. Contact your plant administrator.'
          });
        } else if (status === 429) {
          setInlineAlert({
            type: 'error',
            title: 'Rate Limit Exceeded (429)',
            message: 'Too many failed sign-in attempts. For security reasons, this terminal is temporarily throttled. Wait 60 seconds.'
          });
        } else {
          setInlineAlert({
            type: 'error',
            title: 'Sign-In Error',
            message: authError.message || 'Unable to authenticate. Verify server connectivity.'
          });
        }
      } else if (onLoginSuccess) {
        onLoginSuccess(trimmedEmail);
      }
    } catch (err: any) {
      setInlineAlert({
        type: 'error',
        title: 'Connection Error',
        message: err.message || 'Unable to establish secure handshake with the OwnerOS server. Check network.'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();

    const targetEmail = (forgotEmail || email).trim().toLowerCase();

    if (!targetEmail) {
      setInlineAlert({
        type: 'warning',
        title: 'Email Required',
        message: 'Provide your enterprise work email to receive password recovery instructions.'
      });
      return;
    }

    setIsResetting(true);

    try {
      const { error: resetError } = await resetPassword(targetEmail);

      if (resetError) {
        setInlineAlert({
          type: 'error',
          title: 'Reset Failed',
          message: resetError.message || 'Failed to dispatch reset instructions.'
        });
      } else {
        setInlineAlert({
          type: 'success',
          title: 'Recovery Link Dispatched',
          message: `Secure password reset instructions sent to ${targetEmail}. Check your inbox.`
        });
        setIsForgotOpen(false);
      }
    } catch (err: any) {
      setInlineAlert({
        type: 'error',
        title: 'Dispatch Error',
        message: err.message || 'Network error encountered during password reset request.'
      });
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <div className={`relative min-h-screen w-full overflow-x-hidden font-sans transition-colors duration-300 ${isDarkMode ? 'bg-[#09090C] text-slate-100' : 'bg-[#EAEAEE] text-slate-900'
      }`}>

      {/* ========================================================================= */}
      {/* ── ATMOSPHERIC APPLE BACKGROUND GLOWS ──                                 */}
      {/* ========================================================================= */}
      <div aria-hidden="true" className="pointer-events-none fixed inset-0 overflow-hidden select-none">
        {/* Deep top-left blue atmospheric glow */}
        <div className={`absolute -top-40 -left-40 h-[640px] w-[640px] rounded-full blur-[160px] ${isDarkMode ? 'bg-[#5B75F8]/18' : 'bg-[#5B75F8]/12'
          }`} />

        {/* Center-right indigo/violet flare */}
        <div className={`absolute top-1/3 -right-40 h-[680px] w-[680px] rounded-full blur-[180px] ${isDarkMode ? 'bg-[#5856D6]/14' : 'bg-[#5856D6]/10'
          }`} />

        {/* Bottom subtle emerald operational glow */}
        <div className={`absolute -bottom-40 left-1/3 h-[580px] w-[580px] rounded-full blur-[160px] ${isDarkMode ? 'bg-[#34C759]/10' : 'bg-[#34C759]/8'
          }`} />

        {/* Specular noise & dot matrix */}
        <div className={`absolute inset-0 ${isDarkMode
          ? 'opacity-[0.035] bg-[radial-gradient(rgba(255,255,255,0.7)_1px,transparent_1px)]'
          : 'opacity-[0.035] bg-[radial-gradient(rgba(0,0,0,0.6)_1px,transparent_1px)]'
          } [background-size:28px_28px]`} />
      </div>

      <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-[1520px] flex-col justify-between px-4 py-6 sm:px-6 sm:py-8 lg:px-8">

        {/* ========================================================================= */}
        {/* ── MAIN CONTENT: CENTERED FLOATING FROSTED AUTH CARD ──                   */}
        {/* ========================================================================= */}
        <main className="my-auto flex flex-1 items-center justify-center py-6 sm:py-10">
          <div
            className="relative w-full max-w-[540px] overflow-hidden rounded-[32px] border p-8 sm:p-11 transition-all backdrop-blur-3xl"
            style={{
              backgroundColor: isDarkMode ? 'rgba(12, 12, 16, 0.94)' : '#FFFFFF',
              borderColor: isDarkMode ? 'rgba(255, 255, 255, 0.18)' : 'rgba(203, 213, 225, 0.9)',
              boxShadow: isDarkMode
                ? 'inset 0 1px 0 0 rgba(255, 255, 255, 0.25), 0 40px 120px rgba(0, 0, 0, 0.95)'
                : 'inset 0 1.5px 0 0 rgba(255, 255, 255, 1), 0 25px 60px -10px rgba(15, 23, 42, 0.18), 0 10px 25px -5px rgba(15, 23, 42, 0.1), 0 0 0 1px rgba(0, 0, 0, 0.04)'
            }}
          >

            {/* Top Brand Identity & Appearance Switcher */}
            <div className="mb-6 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[#5B75F8] via-[#0055D4] to-[#5856D6] text-white shadow-lg shadow-[#5B75F8]/25">
                  <span className="font-mono text-xs font-black tracking-tight">OS</span>
                </div>

                <div className="flex flex-col justify-center">
                  <span className={`text-base font-bold tracking-tight ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                    GuruOm OS
                  </span>
                  <p className={`text-[11px] font-medium tracking-tight ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                    Client Instance · Precision Manufacturing Enterprise
                  </p>
                </div>
              </div>

              {/* Theme Switcher Button */}
              {onToggleTheme && (
                <button
                  type="button"
                  onClick={onToggleTheme}
                  aria-label="Toggle visual appearance"
                  className={`flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-xl border transition-all active:scale-95 shadow-2xs ${isDarkMode
                    ? 'border-white/15 bg-white/[0.06] text-slate-200 hover:bg-white/10 hover:border-white/25'
                    : 'border-slate-200 bg-slate-100 text-slate-700 hover:bg-slate-200 shadow-xs'
                    }`}
                  title={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
                >
                  <AnimatePresence mode="popLayout" initial={false}>
                    <motion.div
                      key={isDarkMode ? 'sun' : 'moon'}
                      initial={{ opacity: 0, scale: 0.5, rotate: -30 }}
                      animate={{ opacity: 1, scale: 1, rotate: 0 }}
                      exit={{ opacity: 0, scale: 0.5, rotate: 30 }}
                      transition={{ duration: 0.2 }}
                      className="flex items-center justify-center"
                    >
                      {isDarkMode ? <Sun className="h-4 w-4 text-amber-400" /> : <Moon className="h-4 w-4 text-slate-700" />}
                    </motion.div>
                  </AnimatePresence>
                </button>
              )}
            </div>

            {/* Hairline Divider */}
            <div className={`mb-6 border-t ${isDarkMode ? 'border-white/10' : 'border-slate-200/90'}`} />

            {/* Form Title & Context */}
            <div className="mb-6 flex items-start justify-between">
              <div>
                <h2 className={`text-2xl font-black tracking-tight sm:text-3xl ${isDarkMode ? 'text-white' : 'text-slate-900'
                  }`}>
                  Sign in to OwnerOS
                </h2>

                <p className={`mt-1.5 text-xs font-normal leading-relaxed ${isDarkMode ? 'text-slate-300' : 'text-slate-600'
                  }`}>
                  Authorized portal for <strong className="font-semibold text-[#5B75F8]">GuruOm OS</strong> team members.
                </p>
              </div>

              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[#5B75F8] to-[#5856D6] text-white shadow-lg shadow-[#5B75F8]/25">
                <Lock className="h-5 w-5" />
              </div>
            </div>

            {/* ───────────────────────────────────────────────────────────────── */}
            {/* ── REAL-TIME ON-PAGE ALERTS (APPLE NOTIFICATION CARD) ──        */}
            {/* ───────────────────────────────────────────────────────────────── */}
            <AnimatePresence mode="wait">
              {inlineAlert && (
                <motion.div
                  key={inlineAlert.title}
                  initial={{ opacity: 0, y: -8, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -8, scale: 0.97 }}
                  transition={{ duration: 0.18 }}
                  role="alert"
                  className={`mb-5 flex items-start gap-3 rounded-2xl border p-4 shadow-lg backdrop-blur-xl ${inlineAlert.type === 'error'
                    ? 'border-rose-500/30 bg-rose-500/15 text-rose-200'
                    : inlineAlert.type === 'warning'
                      ? 'border-amber-500/30 bg-amber-500/15 text-amber-200'
                      : 'border-emerald-500/30 bg-emerald-500/15 text-emerald-200'
                    }`}
                >
                  <div className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-xl ${inlineAlert.type === 'error'
                    ? 'bg-rose-500/20 text-rose-400'
                    : inlineAlert.type === 'warning'
                      ? 'bg-amber-500/20 text-amber-400'
                      : 'bg-emerald-500/20 text-emerald-400'
                    }`}>
                    {inlineAlert.type === 'error' ? (
                      <AlertCircle className="h-4 w-4" />
                    ) : inlineAlert.type === 'warning' ? (
                      <HelpCircle className="h-4 w-4" />
                    ) : (
                      <CheckCircle2 className="h-4 w-4" />
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="font-bold text-xs tracking-tight">
                      {inlineAlert.title}
                    </div>
                    <div className="mt-0.5 text-xs font-normal leading-relaxed opacity-90">
                      {inlineAlert.message}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setInlineAlert(null)}
                    className="cursor-pointer p-1 text-slate-400 hover:text-white transition-colors"
                    aria-label="Dismiss alert"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </motion.div>
              )}
            </AnimatePresence>

            {/* ───────────────────────────────────────────────────────────────── */}
            {/* ── CREDENTIAL INPUT FORM ──                                      */}
            {/* ───────────────────────────────────────────────────────────────── */}
            <form onSubmit={handleLogin} className="space-y-4.5" noValidate>

              {/* 1. Work Email */}
              <div>
                <div className="mb-1.5 flex items-center justify-between">
                  <label
                    htmlFor="auth-email"
                    className={`block text-xs font-bold ${isDarkMode ? 'text-slate-200' : 'text-slate-700'
                      }`}
                  >
                    Enterprise Work Email
                  </label>
                  {fieldErrors.email && (
                    <span className="font-mono text-[10.5px] font-semibold text-rose-400 animate-pulse">
                      {fieldErrors.email}
                    </span>
                  )}
                </div>

                <div className="relative">
                  <div className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
                    <Mail className="h-4 w-4" />
                  </div>

                  <input
                    id="auth-email"
                    type="email"
                    required
                    autoComplete="username"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (fieldErrors.email) setFieldErrors(prev => ({ ...prev, email: undefined }));
                    }}
                    placeholder="Enter Account Email"
                    className={`h-12 w-full rounded-2xl border pl-10 pr-4 text-xs font-medium outline-none transition-all duration-150 ${fieldErrors.email
                      ? 'border-rose-500/70 bg-rose-500/10 text-rose-100 ring-2 ring-rose-500/20'
                      : isDarkMode
                        ? 'border-white/15 bg-[#0C0C10] text-white placeholder:text-slate-500 hover:border-white/25 focus:border-[#5B75F8] focus:bg-[#111116] focus:ring-4 focus:ring-[#5B75F8]/15'
                        : 'border-slate-300 bg-slate-50 text-slate-900 placeholder:text-slate-400 hover:border-slate-400 focus:border-[#5B75F8] focus:bg-white focus:ring-4 focus:ring-[#5B75F8]/15'
                      }`}
                  />
                </div>
              </div>

              {/* 2. Password */}
              <div>
                <div className="mb-1.5 flex items-center justify-between">
                  <label
                    htmlFor="auth-password"
                    className={`block text-xs font-bold ${isDarkMode ? 'text-slate-200' : 'text-slate-700'
                      }`}
                  >
                    Security Password
                  </label>

                  <button
                    type="button"
                    onClick={() => {
                      setForgotEmail(email);
                      setIsForgotOpen(true);
                    }}
                    className="cursor-pointer font-mono text-[11px] font-semibold text-[#5B75F8] hover:underline transition-all"
                  >
                    Forgot?
                  </button>
                </div>

                <div className="relative">
                  <div className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
                    <Lock className="h-4 w-4" />
                  </div>

                  <input
                    id="auth-password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      if (fieldErrors.password) setFieldErrors(prev => ({ ...prev, password: undefined }));
                    }}
                    placeholder="Enter Account Password"
                    className={`h-12 w-full rounded-2xl border pl-10 pr-11 text-xs font-medium outline-none transition-all duration-150 ${fieldErrors.password
                      ? 'border-rose-500/70 bg-rose-500/10 text-rose-100 ring-2 ring-rose-500/20'
                      : isDarkMode
                        ? 'border-white/15 bg-[#0C0C10] text-white placeholder:text-slate-500 hover:border-white/25 focus:border-[#5B75F8] focus:bg-[#111116] focus:ring-4 focus:ring-[#5B75F8]/15'
                        : 'border-slate-300 bg-slate-50 text-slate-900 placeholder:text-slate-400 hover:border-slate-400 focus:border-[#5B75F8] focus:bg-white focus:ring-4 focus:ring-[#5B75F8]/15'
                      }`}
                  />

                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 cursor-pointer items-center justify-center rounded-xl text-slate-400 hover:bg-white/10 hover:text-white transition-colors"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>

                {fieldErrors.password && (
                  <p className="mt-1 font-mono text-[10.5px] font-semibold text-rose-400 animate-pulse">
                    {fieldErrors.password}
                  </p>
                )}
              </div>

              {/* 3. Primary Apple Glossy Action Button */}
              <button
                type="submit"
                disabled={isLoading}
                className="relative mt-2 flex h-13 w-full cursor-pointer items-center justify-center gap-2 overflow-hidden rounded-2xl bg-gradient-to-b from-[#7B92FF] to-[#435BE8] px-6 text-sm font-bold text-white shadow-[0_6px_20px_rgba(0,122,255,0.4),inset_0_1px_0_0_rgba(255,255,255,0.35)] transition-all hover:brightness-110 active:scale-[0.98] disabled:cursor-wait disabled:opacity-60"
              >
                {isLoading ? (
                  <div className="flex items-center gap-2.5">
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                    <span>Verifying Credentials...</span>
                  </div>
                ) : (
                  <>
                    <span>Sign in to OwnerOS</span>
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </>
                )}
              </button>
            </form>

            {/* ───────────────────────────────────────────────────────────────── */}
            {/* ── REQUEST ACCESS & SUPPORT CALLOUT ──                           */}
            {/* ───────────────────────────────────────────────────────────────── */}
            <div className={`mt-6 flex items-center justify-between rounded-2xl border p-3.5 transition-all ${isDarkMode
              ? 'border-white/15 bg-white/[0.04] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06)]'
              : 'border-slate-200 bg-slate-100/80'
              }`}>
              <div className="min-w-0 pr-2">
                <div className={`text-xs font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                  Need an account?
                </div>
                <div className={`text-[11px] truncate ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                  Provisioned by GuruOm IT Admin.
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsRequestAccessOpen(true)}
                className="shrink-0 cursor-pointer rounded-xl bg-[#5B75F8]/15 border border-[#5B75F8]/30 px-3 py-1.5 font-mono text-[11px] font-bold text-[#5B75F8] hover:bg-[#5B75F8]/25 transition-all"
              >
                Request Access
              </button>
            </div>

            {/* Security & Organization Meta */}
            <div className="mt-6 flex items-center justify-center text-[11px] text-slate-400 pt-3 border-t"
              style={{ borderColor: isDarkMode ? 'rgba(255, 255, 255, 0.08)' : 'rgba(226, 232, 240, 0.8)' }}
            >
              <span className="flex items-center gap-1.5">
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
                <span>256-Bit TLS Secured Handshake</span>
              </span>
            </div>

          </div>
        </main>

        {/* ========================================================================= */}
        {/* ── FOOTER: SYSTEM & BRAND CREDENTIALS ──                                 */}
        {/* ========================================================================= */}
        <footer className={`flex shrink-0 flex-col gap-2 px-2 sm:px-4 py-3.5 text-[11.5px] font-medium transition-all sm:flex-row sm:items-center sm:justify-between ${isDarkMode ? 'text-slate-400' : 'text-slate-600'
          }`}>
          <div className="flex flex-wrap items-center gap-2">
            <span className={`font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>OwnerOS Enterprise</span>
            <span>·</span>
            <span>Dedicated Client: <strong className="text-[#5B75F8]">GuruOm Precision Engineering Pvt. Ltd.</strong></span>
            <span>·</span>
            <span>Engineered by: <strong className="text-[#5B75F8]">SketchItUp Solutions</strong></span>
          </div>

          <div className="flex items-center gap-3 font-mono text-[11px]">
            <span>ISO 9001:2015 Compliant</span>
            <span>·</span>
            <span className="text-emerald-400">Cluster Status: Healthy</span>
          </div>
        </footer>
      </div>

      {/* ========================================================================= */}
      {/* ── MODAL: PASSWORD RESET SHEET ──                                         */}
      {/* ========================================================================= */}
      {isForgotOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-md"
          role="dialog"
          aria-modal="true"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className={`w-full max-w-md overflow-hidden rounded-3xl border shadow-2xl ${isDarkMode
              ? 'border-white/15 bg-[#141419]/95 text-white shadow-[inset_0_1px_0_0_rgba(255,255,255,0.15),0_30px_70px_rgba(0,0,0,0.85)] backdrop-blur-3xl'
              : 'border-slate-200 bg-white text-slate-900 shadow-2xl'
              }`}
          >
            <div className={`flex items-start justify-between border-b p-6 ${isDarkMode ? 'border-white/15 bg-black/40' : 'border-slate-200 bg-slate-50'
              }`}>
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#5B75F8]/15 text-[#5B75F8] border border-[#5B75F8]/30">
                  <Mail className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold tracking-tight">
                    Reset Security Password
                  </h2>
                  <p className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                    OwnerOS Identity Verification
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsForgotOpen(false)}
                className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-xl border border-white/15 text-slate-400 hover:bg-white/10 hover:text-white transition-colors"
                aria-label="Close dialog"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="p-6">
              <p className={`text-xs leading-relaxed ${isDarkMode ? 'text-slate-300' : 'text-slate-600'}`}>
                Enter your registered work email address below. A verified recovery link will be sent to regenerate your login token.
              </p>

              <form onSubmit={handleSendResetPassword} className="mt-5 space-y-4">
                <div>
                  <label
                    htmlFor="forgot-email"
                    className={`mb-1.5 block text-xs font-bold ${isDarkMode ? 'text-slate-200' : 'text-slate-700'
                      }`}
                  >
                    Enterprise Work Email
                  </label>

                  <div className="relative">
                    <Mail className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <input
                      id="forgot-email"
                      type="email"
                      required
                      autoComplete="email"
                      value={forgotEmail}
                      onChange={(e) => setForgotEmail(e.target.value)}
                      placeholder="name@guruom.in"
                      className={`h-12 w-full rounded-2xl border pl-10 pr-4 text-xs font-medium outline-none ${isDarkMode
                        ? 'border-white/15 bg-[#0C0C10] text-white focus:border-[#5B75F8]'
                        : 'border-slate-300 bg-slate-50 text-slate-900 focus:border-[#5B75F8]'
                        }`}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsForgotOpen(false)}
                    className={`h-11 cursor-pointer rounded-2xl border text-xs font-semibold transition-colors ${isDarkMode
                      ? 'border-white/15 text-slate-300 hover:bg-white/10'
                      : 'border-slate-200 text-slate-700 hover:bg-slate-100'
                      }`}
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    disabled={isResetting}
                    className="flex h-11 cursor-pointer items-center justify-center rounded-2xl bg-[#5B75F8] px-4 text-xs font-semibold text-white shadow-md shadow-[#5B75F8]/30 transition-all hover:bg-[#435BE8] active:scale-[0.98] disabled:opacity-60"
                  >
                    {isResetting ? (
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                    ) : (
                      'Send Recovery Link'
                    )}
                  </button>
                </div>
              </form>
            </div>
          </motion.div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* ── MODAL: REQUEST ACCESS SHEET ──                                         */}
      {/* ========================================================================= */}
      {isRequestAccessOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-md"
          role="dialog"
          aria-modal="true"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className={`w-full max-w-md overflow-hidden rounded-3xl border shadow-2xl ${isDarkMode
              ? 'border-white/15 bg-[#141419]/95 text-white shadow-[inset_0_1px_0_0_rgba(255,255,255,0.15),0_30px_70px_rgba(0,0,0,0.85)] backdrop-blur-3xl'
              : 'border-slate-200 bg-white text-slate-900 shadow-2xl'
              }`}
          >
            <div className="relative px-6 pb-4 pt-7 text-center sm:px-8">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[#5B75F8]/15 text-[#5B75F8] border border-[#5B75F8]/30">
                <Building2 className="h-6 w-6" />
              </div>

              <h2 className="mt-4 text-xl font-bold tracking-tight">
                Request Account Provisioning
              </h2>

              <p className={`mx-auto mt-2 max-w-sm text-xs leading-relaxed ${isDarkMode ? 'text-slate-300' : 'text-slate-600'
                }`}>
                GuruOm OwnerOS is a private enterprise platform architected by <strong>SketchItUp Solutions</strong>. Access is restricted to authenticated plant personnel.
              </p>
            </div>

            <div className="px-6 pb-6 sm:px-8 space-y-4">
              <div className={`flex items-start gap-3 rounded-2xl border p-4 text-left ${isDarkMode ? 'border-white/15 bg-white/[0.04]' : 'border-slate-200 bg-slate-50'
                }`}>
                <ShieldCheck className="h-5 w-5 shrink-0 text-[#5B75F8] mt-0.5" />
                <div>
                  <p className={`text-xs font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                    Role-Based Access Control (RBAC)
                  </p>
                  <p className={`mt-0.5 text-[11px] leading-relaxed ${isDarkMode ? 'text-slate-300' : 'text-slate-600'}`}>
                    To obtain access, contact your Department Head or GuruOm Server Administrator. They will assign your role (Production, QC, Dispatch, Finance, or Admin).
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsRequestAccessOpen(false)}
                className="h-11 w-full cursor-pointer rounded-2xl bg-[#5B75F8] text-xs font-semibold text-white shadow-md shadow-[#5B75F8]/30 transition-all hover:bg-[#435BE8] active:scale-[0.98]"
              >
                Understood & Close
              </button>
            </div>
          </motion.div>
        </div>
      )}

    </div>
  );
};

export default LoginPage;
