import React, { useEffect, useState } from 'react';
import {
  AlertCircle,
  ArrowRight,
  Building2,
  Check,
  Eye,
  EyeOff,
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

const SAVED_CREDENTIALS_KEY = 'guruom_remember_me_7d';
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

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
  const [trustDevice, setTrustDevice] = useState(true);
  const [isLoading, setIsLoading] = useState(false);

  // Real-time 7-day credential autofill on load
  useEffect(() => {
    try {
      const savedRaw = localStorage.getItem(SAVED_CREDENTIALS_KEY);
      if (savedRaw) {
        const saved = JSON.parse(savedRaw);
        if (saved && saved.expiresAt && saved.expiresAt > Date.now()) {
          if (saved.email) setEmail(saved.email);
          if (saved.password) {
            try {
              setPassword(atob(saved.password));
            } catch {
              setPassword(saved.password);
            }
          }
          setTrustDevice(true);
        } else {
          localStorage.removeItem(SAVED_CREDENTIALS_KEY);
        }
      }
    } catch {
      // Ignore parsing errors
    }
  }, []);

  // Sync credentials in real-time if trustDevice is active
  const handleToggleTrustDevice = () => {
    const nextVal = !trustDevice;
    setTrustDevice(nextVal);
    if (!nextVal) {
      localStorage.removeItem(SAVED_CREDENTIALS_KEY);
    } else if (email && password) {
      try {
        localStorage.setItem(
          SAVED_CREDENTIALS_KEY,
          JSON.stringify({
            email: email.trim(),
            password: btoa(password),
            expiresAt: Date.now() + SEVEN_DAYS_MS
          })
        );
      } catch {}
    }
  };

  const handleEmailChange = (val: string) => {
    setEmail(val);
    if (fieldErrors.email) setFieldErrors(prev => ({ ...prev, email: undefined }));
    if (trustDevice && val && password) {
      try {
        localStorage.setItem(
          SAVED_CREDENTIALS_KEY,
          JSON.stringify({
            email: val.trim(),
            password: btoa(password),
            expiresAt: Date.now() + SEVEN_DAYS_MS
          })
        );
      } catch {}
    }
  };

  const handlePasswordChange = (val: string) => {
    setPassword(val);
    if (fieldErrors.password) setFieldErrors(prev => ({ ...prev, password: undefined }));
    if (trustDevice && email && val) {
      try {
        localStorage.setItem(
          SAVED_CREDENTIALS_KEY,
          JSON.stringify({
            email: email.trim(),
            password: btoa(val),
            expiresAt: Date.now() + SEVEN_DAYS_MS
          })
        );
      } catch {}
    }
  };

  // Mouse ambient glow coords
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePos({ x: e.clientX, y: e.clientY });
    };
    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

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

  const handleLogin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

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
            message: 'The password or work email entered does not match verified records. Please check your credentials and try again.'
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
      } else {
        if (trustDevice) {
          try {
            localStorage.setItem(
              SAVED_CREDENTIALS_KEY,
              JSON.stringify({
                email: trimmedEmail,
                password: btoa(password),
                expiresAt: Date.now() + SEVEN_DAYS_MS
              })
            );
          } catch {}
        } else {
          localStorage.removeItem(SAVED_CREDENTIALS_KEY);
        }

        if (onLoginSuccess) {
          onLoginSuccess(trimmedEmail);
        }
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
    <div
      className={`relative min-h-screen w-full flex items-center justify-center px-4 py-8 sm:py-12 overflow-x-hidden font-sans transition-colors duration-300 select-none ${
        isDarkMode ? 'bg-[#090a0f] text-[#e3e1e9]' : 'bg-[#f4f5f8] text-slate-900'
      }`}
    >
      {/* ── INTERACTIVE POINTER AMBIENT LIGHT ── */}
      {mousePos.x > 0 && (
        <div
          aria-hidden="true"
          className="pointer-events-none fixed z-0 rounded-full blur-[100px] transition-opacity duration-300"
          style={{
            left: mousePos.x,
            top: mousePos.y,
            width: '640px',
            height: '640px',
            transform: 'translate(-50%, -50%)',
            background: isDarkMode
              ? 'radial-gradient(circle, rgba(77, 142, 255, 0.08) 0%, rgba(76, 215, 246, 0.03) 40%, transparent 70%)'
              : 'radial-gradient(circle, rgba(67, 91, 232, 0.06) 0%, rgba(14, 165, 233, 0.02) 40%, transparent 70%)'
          }}
        />
      )}

      {/* ── ATMOSPHERIC DEEP FIELD GRADIENTS (NO IMAGES) ── */}
      <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-0 overflow-hidden select-none">
        {/* Top-center deep cobalt/teal glow */}
        <div
          className={`absolute -top-[25%] left-1/2 -translate-x-1/2 w-[900px] h-[540px] rounded-full blur-[130px] ${
            isDarkMode ? 'bg-gradient-to-b from-[#1c3569]/35 via-[#004e5c]/15 to-transparent' : 'bg-gradient-to-b from-blue-300/25 via-teal-200/10 to-transparent'
          }`}
        />
        {/* Bottom right violet/slate glow */}
        <div
          className={`absolute -bottom-[20%] right-[-10%] w-[620px] h-[500px] rounded-full blur-[140px] ${
            isDarkMode ? 'bg-gradient-to-t from-[#2c1354]/25 via-transparent to-transparent' : 'bg-gradient-to-t from-indigo-200/20 via-transparent to-transparent'
          }`}
        />
        {/* Left subtle operational flare */}
        <div
          className={`absolute top-[40%] -left-[15%] w-[520px] h-[520px] rounded-full blur-[140px] ${
            isDarkMode ? 'bg-gradient-to-r from-[#003640]/20 to-transparent' : 'bg-gradient-to-r from-teal-200/15 to-transparent'
          }`}
        />
      </div>

      {/* ── CENTERED CONTAINER (HOLDS HEADER, AUTH CARD & FOOTER TOGETHER) ── */}
      <div className="relative z-10 w-full max-w-[460px] flex flex-col items-center my-auto space-y-5">

        {/* ========================================================================= */}
        {/* ── TOP SYSTEM BAR: FLOATING PILL (GURUOMOS ONLY) & THEME SWITCHER ──      */}
        {/* ========================================================================= */}
        <header className="w-full flex items-center justify-between gap-3">
          <div className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border backdrop-blur-xl shadow-lg transition-all duration-300 ${
            isDarkMode
              ? 'bg-white/[0.04] border-white/[0.08] hover:bg-white/[0.07] hover:border-white/[0.15]'
              : 'bg-white/80 border-slate-200/80 text-slate-700 hover:bg-white'
          }`}>
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#4cd7f6] opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-[#4cd7f6]" />
            </span>
            <span className={`text-[12px] font-bold tracking-tight ${isDarkMode ? 'text-white/90' : 'text-slate-900'}`}>
              SketchItUp Solutions
            </span>
          </div>

          {/* Visual Appearance Switcher */}
          {onToggleTheme && (
            <button
              type="button"
              onClick={onToggleTheme}
              aria-label="Toggle theme appearance"
              className={`flex h-8.5 w-8.5 shrink-0 cursor-pointer items-center justify-center rounded-full border transition-all active:scale-95 shadow-sm ${
                isDarkMode
                  ? 'border-white/15 bg-white/[0.06] text-slate-200 hover:bg-white/10 hover:border-white/25'
                  : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
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
        </header>

        {/* ========================================================================= */}
        {/* ── MAIN CENTERPIECE: STITCH OBSIDIAN AUTH ENCLAVE CARD ──                 */}
        {/* ========================================================================= */}
        <main className="w-full">
          <div
            className={`w-full rounded-[32px] p-7 sm:p-9 transition-all duration-300 backdrop-blur-3xl border ${
              isDarkMode
                ? 'bg-[#0f1118]/85 border-white/[0.12] text-[#e3e1e9] shadow-[0_30px_90px_-15px_rgba(0,0,0,0.9),0_0_120px_-30px_rgba(77,142,255,0.2),inset_0_1px_1px_rgba(255,255,255,0.15)]'
                : 'bg-white/95 border-slate-200 text-slate-900 shadow-[0_24px_70px_-15px_rgba(15,23,42,0.15),0_4px_16px_rgba(15,23,42,0.04),inset_0_1px_1px_rgba(255,255,255,1)]'
            }`}
          >
            {/* Header Typographic Brand Glyph & Enclave Emblem */}
            <div className="flex flex-col items-center text-center">
              <div
                className={`relative w-14 h-14 rounded-2xl border shadow-lg flex items-center justify-center group mb-4 transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] hover:scale-105 active:scale-95 ${
                  isDarkMode
                    ? 'bg-gradient-to-b from-white/[0.14] to-white/[0.02] border-white/20 text-[#adc6ff] shadow-[0_8px_24px_rgba(0,0,0,0.6),inset_0_1px_1px_rgba(255,255,255,0.4)]'
                    : 'bg-gradient-to-b from-slate-100 to-white border-slate-200 text-[#0055D4] shadow-[0_8px_20px_rgba(0,0,0,0.06)]'
                }`}
              >
                <div className="absolute inset-0 rounded-2xl bg-gradient-to-tr from-[#4d8eff]/15 to-[#4cd7f6]/15 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                <ShieldCheck className="w-6 h-6 transition-transform duration-500 group-hover:scale-110" strokeWidth={2} />
              </div>

              <h1 className={`text-[23px] sm:text-[25px] font-bold tracking-[-0.03em] leading-tight ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                Authenticate with <span className="text-[#4d8eff]">GuruOmOS</span>
              </h1>
              <p className={`text-[13px] font-medium tracking-[-0.01em] mt-1 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                Owner Operating System Architecture
              </p>

              {/* "Welcome Back" Pill Indicator */}
              <div className="mt-4 inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full border text-[11.5px] font-semibold tracking-tight backdrop-blur-sm bg-white/[0.04] border-white/[0.10] text-[#adc6ff] dark:text-[#adc6ff]">
                <KeyRound className="w-3.5 h-3.5 text-[#4d8eff]" />
                <span>Welcome Back</span>
              </div>
            </div>

            {/* ── REAL-TIME ALERTS ── */}
            <AnimatePresence mode="wait">
              {inlineAlert && (
                <motion.div
                  key={inlineAlert.title}
                  initial={{ opacity: 0, y: -8, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -8, scale: 0.97 }}
                  transition={{ duration: 0.2 }}
                  className={`mt-5 rounded-2xl border p-3.5 text-left text-xs ${
                    inlineAlert.type === 'error'
                      ? 'border-rose-500/30 bg-rose-500/10 text-rose-300 dark:text-rose-200'
                      : inlineAlert.type === 'warning'
                      ? 'border-amber-500/30 bg-amber-500/10 text-amber-300 dark:text-amber-200'
                      : 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300 dark:text-emerald-200'
                  }`}
                >
                  <div className="flex items-start gap-2.5">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <strong className="block font-semibold">{inlineAlert.title}</strong>
                      <p className="mt-0.5 text-[11px] leading-relaxed opacity-90">{inlineAlert.message}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setInlineAlert(null)}
                      className="p-1 rounded-md opacity-60 hover:opacity-100 transition-opacity cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* ── AUTHENTICATION FORM ── */}
            <div className="mt-6">
              <form onSubmit={handleLogin} className="space-y-4">
                {/* Work Email */}
                <div>
                  <div className="flex justify-between items-center mb-1.5 px-1">
                    <label
                      htmlFor="auth-email"
                      className={`text-[11px] font-semibold tracking-[0.05em] uppercase ${
                        isDarkMode ? 'text-white/60' : 'text-slate-600'
                      }`}
                    >
                      Enterprise Identity
                    </label>
                    <span className="text-[11px] text-[#4d8eff] font-medium">SSO Enabled</span>
                  </div>

                  <div className={`relative rounded-2xl border transition-all duration-200 ${
                    fieldErrors.email
                      ? 'border-rose-500/70 bg-rose-500/10 text-rose-100 ring-2 ring-rose-500/20'
                      : isDarkMode
                      ? 'border-white/[0.12] bg-black/35 focus-within:border-[#4d8eff] focus-within:ring-4 focus-within:ring-[#4d8eff]/15'
                      : 'border-slate-300 bg-slate-50 focus-within:border-[#4d8eff] focus-within:bg-white focus-within:ring-4 focus-within:ring-[#4d8eff]/15'
                  }`}>
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <Mail className="w-4 h-4" />
                    </div>
                    <input
                      id="auth-email"
                      type="email"
                      required
                      autoComplete="username"
                      value={email}
                      onChange={(e) => handleEmailChange(e.target.value)}
                      placeholder="name@company.com"
                      className={`w-full pl-10 pr-10 py-3 bg-transparent text-[13.5px] rounded-2xl border-0 focus:ring-0 focus:outline-none ${
                        isDarkMode ? 'text-white placeholder-white/25' : 'text-slate-900 placeholder-slate-400'
                      }`}
                    />
                    {email && (
                      <button
                        type="button"
                        onClick={() => handleEmailChange('')}
                        className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                  {fieldErrors.email && (
                    <p className="mt-1 font-mono text-[10.5px] font-semibold text-rose-400 animate-pulse">
                      {fieldErrors.email}
                    </p>
                  )}
                </div>

                {/* Security Password */}
                <div>
                  <div className="flex justify-between items-center mb-1.5 px-1">
                    <label
                      htmlFor="auth-password"
                      className={`text-[11px] font-semibold tracking-[0.05em] uppercase ${
                        isDarkMode ? 'text-white/60' : 'text-slate-600'
                      }`}
                    >
                      Master Password
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        setForgotEmail(email);
                        setIsForgotOpen(true);
                      }}
                      className="text-[11.5px] text-[#4d8eff] hover:text-[#7B92FF] transition-colors hover:underline underline-offset-2 cursor-pointer font-medium"
                    >
                      Recover key
                    </button>
                  </div>

                  <div className={`relative rounded-2xl border transition-all duration-200 ${
                    fieldErrors.password
                      ? 'border-rose-500/70 bg-rose-500/10 text-rose-100 ring-2 ring-rose-500/20'
                      : isDarkMode
                      ? 'border-white/[0.12] bg-black/35 focus-within:border-[#4d8eff] focus-within:ring-4 focus-within:ring-[#4d8eff]/15'
                      : 'border-slate-300 bg-slate-50 focus-within:border-[#4d8eff] focus-within:bg-white focus-within:ring-4 focus-within:ring-[#4d8eff]/15'
                  }`}>
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <Lock className="w-4 h-4" />
                    </div>
                    <input
                      id="auth-password"
                      type={showPassword ? 'text' : 'password'}
                      required
                      autoComplete="current-password"
                      value={password}
                      onChange={(e) => handlePasswordChange(e.target.value)}
                      placeholder="Enter enclave password"
                      className={`w-full pl-10 pr-11 py-3 bg-transparent text-[13.5px] rounded-2xl border-0 focus:ring-0 focus:outline-none ${
                        isDarkMode ? 'text-white placeholder-white/25' : 'text-slate-900 placeholder-slate-400'
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                      className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>

                  {fieldErrors.password && (
                    <p className="mt-1 font-mono text-[10.5px] font-semibold text-rose-400 animate-pulse">
                      {fieldErrors.password}
                    </p>
                  )}
                </div>

                {/* Custom Apple-grade 7-day autofill checkbox */}
                <div className="flex items-center justify-between pt-1">
                  <button
                    type="button"
                    onClick={handleToggleTrustDevice}
                    className="flex items-center gap-2.5 cursor-pointer group select-none text-left"
                    role="checkbox"
                    aria-checked={trustDevice}
                  >
                    <div
                      className={`w-4.5 h-4.5 rounded-[6px] border flex items-center justify-center transition-all duration-200 shrink-0 ${
                        trustDevice
                          ? 'bg-[#4d8eff] border-[#4d8eff] text-white shadow-xs shadow-[#4d8eff]/40'
                          : isDarkMode
                          ? 'border-white/20 bg-white/[0.04] group-hover:border-white/35 text-transparent'
                          : 'border-slate-300 bg-slate-100 group-hover:border-slate-400 text-transparent'
                      }`}
                    >
                      <Check className={`w-3 h-3 transition-transform duration-150 stroke-[2.8] ${trustDevice ? 'scale-100 text-white' : 'scale-50 opacity-0'}`} />
                    </div>
                    <span className={`text-[12px] font-medium transition-colors ${
                      isDarkMode
                        ? trustDevice ? 'text-white' : 'text-slate-400 group-hover:text-slate-300'
                        : trustDevice ? 'text-slate-900' : 'text-slate-600 group-hover:text-slate-800'
                    }`}>
                      Autofill & trust this device (7 Days)
                    </span>
                  </button>
                </div>

                {/* Submit Action Button */}
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full mt-2 py-3 px-4 rounded-2xl bg-gradient-to-b from-[#4d8eff] to-[#005ac2] hover:brightness-110 active:scale-[0.98] transition-all duration-200 text-white font-medium text-[14px] shadow-[0_8px_20px_-4px_rgba(77,142,255,0.45),inset_0_1px_1px_rgba(255,255,255,0.35)] flex items-center justify-center gap-2 group cursor-pointer disabled:cursor-wait disabled:opacity-60"
                >
                  {isLoading ? (
                    <div className="flex items-center gap-2">
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                      <span>Decrypting & Authenticating...</span>
                    </div>
                  ) : (
                    <>
                      <span>Decrypt & Sign In</span>
                      <ArrowRight className="w-4 h-4 text-white group-hover:translate-x-1 transition-transform" />
                    </>
                  )}
                </button>
              </form>
            </div>

            {/* ── REQUEST ACCESS & SUPPORT CALLOUT ── */}
            <div
              className={`mt-6 flex items-center justify-between gap-3 rounded-2xl border p-3.5 sm:p-4 transition-all ${
                isDarkMode
                  ? 'border-white/10 bg-white/[0.03] hover:bg-white/[0.05]'
                  : 'border-slate-200/90 bg-slate-50/80 hover:bg-slate-100/80 shadow-2xs'
              }`}
            >
              <div className="flex items-center gap-3 min-w-0 pr-1">
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border ${
                    isDarkMode
                      ? 'bg-white/[0.06] border-white/10 text-slate-300'
                      : 'bg-white border-slate-200 text-slate-700 shadow-2xs'
                  }`}
                >
                  <Building2 className="w-4 h-4 text-[#4d8eff]" />
                </div>
                <div className="min-w-0">
                  <div className={`text-xs font-semibold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                    Need an account?
                  </div>
                  <div className={`text-[11px] truncate ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                    Provisioned by GuruOm IT Admin
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsRequestAccessOpen(true)}
                className={`group inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold tracking-tight transition-all active:scale-95 cursor-pointer shrink-0 border ${
                  isDarkMode
                    ? 'border-white/15 bg-white/[0.08] text-white hover:bg-white/15 hover:border-white/25 shadow-xs'
                    : 'border-slate-300/90 bg-white text-slate-800 hover:bg-slate-50 hover:border-slate-400 shadow-xs'
                }`}
              >
                <span>Request Access</span>
                <ArrowRight className="w-3.5 h-3.5 opacity-60 group-hover:translate-x-0.5 group-hover:opacity-100 transition-all text-[#4d8eff]" />
              </button>
            </div>

            {/* ── SECURITY CREDENTIAL SIGNATURE ── */}
            <div
              className={`mt-6 flex items-center justify-center text-[11px] pt-3 border-t ${
                isDarkMode ? 'border-white/[0.08] text-slate-400' : 'border-slate-200 text-slate-500'
              }`}
            >
              <span className="flex items-center gap-1.5 font-mono">
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
                <span>256-Bit Hardware Enclave Handshake</span>
              </span>
            </div>
          </div>
        </main>

        {/* ========================================================================= */}
        {/* ── FOOTER: ENTERPRISE ATTRIBUTION ──                                      */}
        {/* ========================================================================= */}
        <footer className="w-full text-center flex flex-col items-center gap-2 pt-1">
          <div className={`text-[12px] tracking-[-0.01em] ${isDarkMode ? 'text-white/50' : 'text-slate-600'}`}>
            Architected with precision by{' '}
            <span className={`font-semibold ${isDarkMode ? 'text-white/90' : 'text-slate-900'}`}>
              SketchItUp Solutions
            </span>{' '}
            for <strong className="text-[#4d8eff] dark:text-[#adc6ff]">GuruOmOS</strong> Enterprise.
          </div>

          <div className={`flex gap-4 text-[11px] ${isDarkMode ? 'text-white/40' : 'text-slate-400'}`}>
            <span>Privacy Specification</span>
            <span>•</span>
            <span>Zero-Trust Protocol</span>
            <span>•</span>
            <span>Compliance Shield</span>
          </div>
        </footer>

      </div>

      {/* ========================================================================= */}
      {/* ── MODAL: FORGOT PASSWORD RECOVERY ──                                     */}
      {/* ========================================================================= */}
      {isForgotOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-md"
          role="dialog"
          aria-modal="true"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className={`w-full max-w-md overflow-hidden rounded-3xl border shadow-2xl ${
              isDarkMode
                ? 'border-white/15 bg-[#12141c]/95 text-white backdrop-blur-3xl shadow-[0_30px_70px_rgba(0,0,0,0.85)]'
                : 'border-slate-200 bg-white text-slate-900 shadow-2xl'
            }`}
          >
            <div className="relative px-6 pb-4 pt-7 text-center sm:px-8">
              <button
                type="button"
                onClick={() => setIsForgotOpen(false)}
                className="absolute right-4 top-4 rounded-full p-2 text-slate-400 hover:bg-white/10 hover:text-white transition-colors cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>

              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[#4d8eff]/15 text-[#4d8eff] border border-[#4d8eff]/30">
                <KeyRound className="h-6 w-6" />
              </div>

              <h2 className="mt-4 text-xl font-bold tracking-tight">Recover Security Password</h2>
              <p className={`mx-auto mt-2 max-w-sm text-xs leading-relaxed ${isDarkMode ? 'text-slate-300' : 'text-slate-600'}`}>
                Enter the enterprise work email associated with your OwnerOS user profile to receive recovery instructions.
              </p>
            </div>

            <form onSubmit={handleSendResetPassword} className="px-6 pb-6 sm:px-8 space-y-4">
              <div>
                <label className={`block text-xs font-semibold ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                  Work Email Address
                </label>
                <div className="relative mt-1.5">
                  <div className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
                    <Mail className="h-4 w-4" />
                  </div>
                  <input
                    type="email"
                    required
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    placeholder="Enter registered work email"
                    className={`h-11 w-full rounded-2xl border pl-10 pr-4 text-xs font-medium outline-none transition-all ${
                      isDarkMode
                        ? 'border-white/15 bg-black/40 text-white placeholder:text-slate-500 focus:border-[#4d8eff] focus:ring-4 focus:ring-[#4d8eff]/15'
                        : 'border-slate-300 bg-slate-50 text-slate-900 placeholder:text-slate-400 focus:border-[#4d8eff] focus:bg-white focus:ring-4 focus:ring-[#4d8eff]/15'
                    }`}
                  />
                </div>
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsForgotOpen(false)}
                  className={`h-11 flex-1 rounded-2xl border text-xs font-semibold transition-all cursor-pointer ${
                    isDarkMode
                      ? 'border-white/15 bg-white/5 text-slate-300 hover:bg-white/10'
                      : 'border-slate-300 bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isResetting}
                  className="h-11 flex-1 rounded-2xl bg-gradient-to-r from-[#4d8eff] to-[#005ac2] text-xs font-semibold text-white shadow-md shadow-[#4d8eff]/30 transition-all hover:brightness-110 active:scale-95 cursor-pointer disabled:opacity-60"
                >
                  {isResetting ? 'Dispatching...' : 'Send Recovery Link'}
                </button>
              </div>
            </form>
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
            className={`w-full max-w-md overflow-hidden rounded-3xl border shadow-2xl ${
              isDarkMode
                ? 'border-white/15 bg-[#12141c]/95 text-white shadow-[inset_0_1px_0_0_rgba(255,255,255,0.15),0_30px_70px_rgba(0,0,0,0.85)] backdrop-blur-3xl'
                : 'border-slate-200 bg-white text-slate-900 shadow-2xl'
            }`}
          >
            <div className="relative px-6 pb-4 pt-7 text-center sm:px-8">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[#4d8eff]/15 text-[#4d8eff] border border-[#4d8eff]/30">
                <Building2 className="h-6 w-6" />
              </div>

              <h2 className="mt-4 text-xl font-bold tracking-tight">Request Account Provisioning</h2>
              <p className={`mx-auto mt-2 max-w-sm text-xs leading-relaxed ${isDarkMode ? 'text-slate-300' : 'text-slate-600'}`}>
                GuruOm OwnerOS is a private enterprise platform architected by <strong>SketchItUp Solutions</strong>. Access is restricted to authenticated plant personnel.
              </p>
            </div>

            <div className="px-6 pb-6 sm:px-8 space-y-4">
              <div className={`flex items-start gap-3 rounded-2xl border p-4 text-left ${
                isDarkMode ? 'border-white/15 bg-white/[0.04]' : 'border-slate-200 bg-slate-50'
              }`}>
                <ShieldCheck className="h-5 w-5 shrink-0 text-[#4d8eff] mt-0.5" />
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
                className="h-11 w-full cursor-pointer rounded-2xl bg-[#4d8eff] text-xs font-semibold text-white shadow-md shadow-[#4d8eff]/30 transition-all hover:bg-[#005ac2] active:scale-[0.98]"
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
