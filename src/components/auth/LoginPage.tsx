"use client";

import React, { useEffect, useRef, useState, Component } from 'react';
import { createPortal } from 'react-dom';
import type { ReactNode, ErrorInfo } from 'react';
import { GrainGradient } from '@paper-design/shaders-react';
import {
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  Building2,
  CheckCircle2,
  ChevronRight,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  Lock,
  Mail,
  Moon,
  ShieldCheck,
  Sun,
  X,
} from 'lucide-react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { useAuth } from '../../context/AuthContext';
import { ApiError } from '../../lib/apiClient';

const REMEMBERED_EMAIL_KEY = 'owneros_remembered_email_v1';
const LEGACY_CREDENTIALS_KEY = 'guruom_remember_me_7d';
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

export interface LoginPageProps {
  onLoginSuccess?: (email: string) => void;
  isDarkMode?: boolean;
  onToggleTheme?: () => void;
  variant?: 'split' | 'centered';
}

export type Notice = {
  type: 'error' | 'warning' | 'success';
  message: string;
};

type FieldErrors = {
  email?: string;
  password?: string;
};

/* -------------------------------------------------------------------------- */
/* Storage helpers                                                            */
/* -------------------------------------------------------------------------- */

function removeRememberedEmail() {
  try {
    localStorage.removeItem(REMEMBERED_EMAIL_KEY);
  } catch {
    // Storage may be unavailable in private browsing mode.
  }
}

function persistRememberedEmail(email: string) {
  try {
    localStorage.setItem(
      REMEMBERED_EMAIL_KEY,
      JSON.stringify({ email, expiresAt: Date.now() + SEVEN_DAYS_MS }),
    );
  } catch {
    // Remembering an email must never block authentication.
  }
}

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error && error.message ? error.message : fallback;
}

export function getLoginNotice(error: unknown): Notice {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    return {
      type: 'error',
      message: "We couldn't connect to OwnerOS. Check your connection and try again.",
    };
  }

  const statusCode =
    error instanceof ApiError
      ? error.statusCode
      : typeof error === 'object' && error !== null && 'statusCode' in error && typeof (error as any).statusCode === 'number'
        ? (error as any).statusCode
        : undefined;

  const rawMessage =
    error instanceof Error
      ? error.message
      : typeof error === 'object' && error !== null && 'message' in error && typeof (error as any).message === 'string'
        ? (error as any).message
        : '';

  if (
    statusCode === 0 ||
    /failed to fetch|network failure|network error|connection refused|network/i.test(rawMessage)
  ) {
    return {
      type: 'error',
      message: "We couldn't connect to OwnerOS. Check your connection and try again.",
    };
  }

  if (
    statusCode === 403 ||
    /revoked|suspended|deactivated|disabled|inactive/i.test(rawMessage)
  ) {
    return {
      type: 'error',
      message: 'Your account is currently unavailable. Please contact your administrator.',
    };
  }

  if (statusCode === 429 || /too many|rate limit/i.test(rawMessage)) {
    return {
      type: 'warning',
      message: 'Too many sign-in attempts. Please wait a moment and try again.',
    };
  }

  if (statusCode === 401 || statusCode === 404 || statusCode === 400) {
    return {
      type: 'error',
      message: 'Invalid email or password. Please check your details and try again.',
    };
  }

  if (typeof statusCode === 'number' && statusCode >= 500 && statusCode < 600) {
    return {
      type: 'error',
      message: 'Sign-in is temporarily unavailable. Please try again shortly.',
    };
  }

  return {
    type: 'error',
    message: 'Sign-in is temporarily unavailable. Please try again shortly.',
  };
}

export function getLoginErrorMessage(error: unknown): string {
  return getLoginNotice(error).message;
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

/* -------------------------------------------------------------------------- */
/* Notice Banner                                                              */
/* -------------------------------------------------------------------------- */

export function NoticeBanner({
  notice,
  onDismiss,
  id,
}: {
  notice: Notice;
  onDismiss?: () => void;
  id?: string;
}) {
  const styles = {
    error: 'border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-200',
    warning: 'border-amber-500/30 bg-amber-500/10 text-amber-800 dark:text-amber-200',
    success: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-800 dark:text-emerald-200',
  };

  const iconColors = {
    error: 'text-rose-500 dark:text-rose-400',
    warning: 'text-amber-500 dark:text-amber-400',
    success: 'text-emerald-500 dark:text-emerald-400',
  };

  const Icon =
    notice.type === 'success'
      ? CheckCircle2
      : notice.type === 'warning'
        ? AlertTriangle
        : AlertCircle;

  return (
    <div
      id={id}
      role={notice.type === 'success' ? 'status' : 'alert'}
      aria-live={notice.type === 'success' ? 'polite' : 'assertive'}
      className={`flex items-start gap-2.5 rounded-[10px] border p-3.5 backdrop-blur-sm transition-colors ${styles[notice.type]}`}
    >
      <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${iconColors[notice.type]}`} aria-hidden="true" />
      <p className="flex-1 text-[13px] font-medium leading-relaxed">{notice.message}</p>
      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Dismiss alert"
          className="shrink-0 cursor-pointer rounded-md p-1 opacity-60 transition-opacity hover:opacity-100"
        >
          <X className="h-3.5 w-3.5" aria-hidden="true" />
        </button>
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Modal Dialog                                                               */
/* -------------------------------------------------------------------------- */

interface DialogProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  onClose: () => void;
  children: React.ReactNode;
}

function Dialog({ title, description, icon, onClose, children }: DialogProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef(onClose);
  const titleId = React.useId();
  const descriptionId = React.useId();
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    closeRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    const previousFocus = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const frame = requestAnimationFrame(() => {
      const panel = panelRef.current;
      const initialInput = panel?.querySelector<HTMLInputElement>('input');
      if (initialInput) {
        initialInput.focus();
      } else {
        panel?.focus();
      }
    });

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        closeRef.current();
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      cancelAnimationFrame(frame);
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', handleKeyDown);
      if (previousFocus?.isConnected) {
        previousFocus.focus();
      }
    };
  }, []);

  if (typeof document === 'undefined') return null;

  return createPortal(
    <div
      className="fixed inset-0 z-50 overflow-y-auto bg-black/75 p-4 font-sans text-black backdrop-blur-md dark:text-white sm:p-6"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="pointer-events-none flex min-h-full items-center justify-center">
        <motion.div
          ref={panelRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          aria-describedby={descriptionId}
          tabIndex={-1}
          initial={reduceMotion ? false : { opacity: 0, y: 14, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.2 }}
          className="pointer-events-auto relative w-full max-w-[480px] rounded-[16px] border border-black/20 bg-white p-6 shadow-2xl dark:border-white/10 dark:bg-[#0d0d0d] sm:p-8"
        >
          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="absolute right-4 top-4 flex h-10 w-10 cursor-pointer items-center justify-center rounded-full text-black/40 transition-colors hover:bg-black/5 hover:text-black dark:text-white/40 dark:hover:bg-white/10 dark:hover:text-white"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>

          <div className="flex h-12 w-12 items-center justify-center rounded-[10px] border border-black/20 bg-black/5 text-black dark:border-white/20 dark:bg-white/10 dark:text-white">
            {icon}
          </div>

          <h2 id={titleId} className="mt-5 pr-6 text-2xl font-medium tracking-tight">
            {title}
          </h2>

          <p id={descriptionId} className="mt-2 text-sm leading-relaxed text-black/60 dark:text-white/60">
            {description}
          </p>

          <div className="mt-6">{children}</div>
        </motion.div>
      </div>
    </div>,
    document.body,
  );
}

/* -------------------------------------------------------------------------- */
/* Input Field Box matching the requested UI specification                   */
/* -------------------------------------------------------------------------- */

interface FieldBoxProps {
  label: string;
  value: string;
  type?: string;
  placeholder?: string;
  onChange: (val: string) => void;
  error?: string;
  inputRef?: React.RefObject<HTMLInputElement | null>;
  rightElement?: React.ReactNode;
  autoComplete?: string;
  disabled?: boolean;
  name?: string;
  id?: string;
  required?: boolean;
}

function FieldBox({
  label,
  value,
  type = 'text',
  placeholder,
  onChange,
  error,
  inputRef,
  rightElement,
  autoComplete,
  disabled,
  name,
  id,
  required,
}: FieldBoxProps) {
  const [isFocused, setIsFocused] = useState(false);

  return (
    <div>
      <label
        htmlFor={id}
        className={`flex h-14 items-center justify-between gap-4 rounded-[10px] border bg-white px-5 text-lg leading-none transition-all dark:bg-white/5 xl:text-xl ${error
          ? 'border-rose-500 ring-1 ring-rose-500/20'
          : isFocused
            ? 'border-black dark:border-white shadow-sm'
            : 'border-black/25 dark:border-white/15'
          }`}
      >
        <input
          ref={inputRef}
          id={id}
          name={name}
          type={type}
          value={value}
          required={required}
          disabled={disabled}
          autoComplete={autoComplete}
          aria-label={label}
          placeholder={placeholder || label}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          onChange={(event) => onChange(event.target.value)}
          className="min-w-0 flex-1 truncate bg-transparent text-black outline-none placeholder:text-black/30 dark:text-white dark:placeholder:text-white/35"
        />
        {rightElement ? (
          <div className="shrink-0">{rightElement}</div>
        ) : (
          !value && !isFocused && (
            <span className="shrink-0 text-sm font-medium text-black/50 dark:text-white/50">{label}</span>
          )
        )}
      </label>
      {error && (
        <p className="mt-1.5 px-1 text-xs font-medium text-rose-500 dark:text-rose-400">
          {error}
        </p>
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Checkbox matching the requested UI specification                           */
/* -------------------------------------------------------------------------- */

function CheckboxLine({
  children,
  checked,
  onChange,
  disabled,
}: {
  children: ReactNode;
  checked?: boolean;
  onChange?: (checked: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <label className="flex items-start gap-3 cursor-pointer select-none">
      <span className="relative mt-1 size-3.5 shrink-0">
        <input
          type="checkbox"
          checked={checked}
          disabled={disabled}
          onChange={(e) => onChange?.(e.target.checked)}
          className="peer size-full appearance-none rounded-[2px] border border-black/25 bg-white checked:border-black checked:bg-black dark:border-white/30 dark:bg-white/5 dark:checked:border-white dark:checked:bg-white transition-colors"
        />
        <svg
          viewBox="0 0 12 12"
          className="pointer-events-none absolute inset-0 hidden size-full p-0.5 text-white peer-checked:block dark:text-black"
          fill="none"
          aria-hidden="true"
        >
          <path
            d="M3 6.2 5 8.1 9 3.9"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>
      <span className="text-black/70 dark:text-white/70">{children}</span>
    </label>
  );
}

function WindowsIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      aria-hidden="true"
    >
      <path d="M3 4.7 10.7 3.6v7.7H3V4.7Zm8.8-1.25L21 2.1v9.2h-9.2V3.45ZM3 12.7h7.7v7.7L3 19.3v-6.6Zm8.8 0H21v9.2l-9.2-1.3v-7.9Z" />
    </svg>
  );
}

const termsText = (
  <>
    By signing in, you agree to our{' '}
    <a
      href="#"
      onClick={(e) => e.preventDefault()}
      className="font-medium text-black/60 underline underline-offset-2 hover:text-black dark:text-white/60 dark:hover:text-white"
    >
      Terms and Services
    </a>{' '}
    and{' '}
    <a
      href="#"
      onClick={(e) => e.preventDefault()}
      className="font-medium text-black/60 underline underline-offset-2 hover:text-black dark:text-white/60 dark:hover:text-white"
    >
      Privacy Policy
    </a>
  </>
);

/* -------------------------------------------------------------------------- */
/* Main Login Page Component                                                  */
/* -------------------------------------------------------------------------- */

export const LoginPage: React.FC<LoginPageProps> = ({
  onLoginSuccess,
  isDarkMode = true,
  onToggleTheme,
}) => {
  const { signIn, resetPassword } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberEmail, setRememberEmail] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const loginInFlight = useRef(false);

  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [notice, setNotice] = useState<Notice | null>(null);

  const [activeDialog, setActiveDialog] = useState<'recovery' | 'access' | null>(null);

  const [forgotEmail, setForgotEmail] = useState('');
  const [resetNotice, setResetNotice] = useState<Notice | null>(null);
  const [isResetting, setIsResetting] = useState(false);
  const resetInFlight = useRef(false);

  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    try {
      localStorage.removeItem(LEGACY_CREDENTIALS_KEY);
      const raw = localStorage.getItem(REMEMBERED_EMAIL_KEY);
      if (!raw) return;

      const saved: unknown = JSON.parse(raw);

      if (
        typeof saved === 'object' &&
        saved !== null &&
        'email' in saved &&
        typeof saved.email === 'string' &&
        'expiresAt' in saved &&
        typeof saved.expiresAt === 'number' &&
        saved.expiresAt > Date.now() &&
        isValidEmail(saved.email)
      ) {
        setEmail(saved.email);
        setRememberEmail(true);
      } else {
        removeRememberedEmail();
      }
    } catch {
      removeRememberedEmail();
    }
  }, []);

  const clearFieldError = (field: keyof FieldErrors) => {
    setFieldErrors((prev) => ({ ...prev, [field]: undefined }));
    setNotice(null);
  };

  const handleRememberChange = (checked: boolean) => {
    setRememberEmail(checked);
    if (!checked) removeRememberedEmail();
  };

  const handleLogin = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (loginInFlight.current) return;

    const normalizedEmail = email.trim().toLowerCase();
    const errors: FieldErrors = {};

    if (!normalizedEmail) {
      errors.email = 'Enter your work email.';
    } else if (!isValidEmail(normalizedEmail)) {
      errors.email = 'Enter a valid email address.';
    }

    if (!password) {
      errors.password = 'Enter your password.';
    }

    setFieldErrors(errors);
    setNotice(null);

    if (Object.keys(errors).length > 0) {
      if (errors.email) {
        emailRef.current?.focus();
      } else {
        passwordRef.current?.focus();
      }
      return;
    }

    loginInFlight.current = true;
    setIsLoading(true);

    let authenticated = false;

    try {
      const { error } = await signIn(normalizedEmail, password);

      if (error) {
        setNotice(getLoginNotice(error));
        return;
      }

      if (rememberEmail) {
        persistRememberedEmail(normalizedEmail);
      } else {
        removeRememberedEmail();
      }

      authenticated = true;
      setPassword('');
      setNotice(null);
    } catch (err: unknown) {
      setNotice(getLoginNotice(err));
    } finally {
      loginInFlight.current = false;
      if (!authenticated) {
        setIsLoading(false);
      }
    }

    if (authenticated) {
      onLoginSuccess?.(normalizedEmail);
    }
  };

  const openRecovery = () => {
    setForgotEmail(email);
    setResetNotice(null);
    setActiveDialog('recovery');
  };

  const handleResetPassword = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (resetInFlight.current) return;

    const normalizedEmail = forgotEmail.trim().toLowerCase();

    if (!isValidEmail(normalizedEmail)) {
      setResetNotice({ type: 'warning', message: 'Enter a valid work email address.' });
      return;
    }

    resetInFlight.current = true;
    setIsResetting(true);
    setResetNotice(null);

    try {
      const { error } = await resetPassword(normalizedEmail);

      if (error) {
        setResetNotice({
          type: 'error',
          message: 'We couldn’t process the request. Please try again shortly.',
        });
        return;
      }

      setActiveDialog(null);
      setNotice({
        type: 'success',
        message: 'If an account matches that email, you will receive password reset instructions shortly.',
      });
    } catch (error: unknown) {
      setResetNotice({
        type: 'error',
        message: getErrorMessage(
          error,
          'Unable to send your request. Check your connection and try again.',
        ),
      });
    } finally {
      resetInFlight.current = false;
      setIsResetting(false);
    }
  };

  return (
    <section className="min-h-screen bg-white p-3 text-black antialiased [font-synthesis:none] dark:bg-[#050505] dark:text-white">
      <div className="grid min-h-[calc(100vh-1.5rem)] gap-6 lg:grid-cols-[0.94fr_1.06fr]">
        {/* Left Side: Authentication Form */}
        <div className="flex min-h-[760px] items-start rounded-md border border-black/20 bg-white px-6 py-12 sm:px-10 dark:border-white/10 dark:bg-[#0a0a0a] lg:min-h-0 lg:px-14 lg:py-16 xl:px-20">
          <div className="mx-auto w-full max-w-[590px]">
            {/* Top Theme Toggle */}
            {onToggleTheme && (
              <div className="mb-8 flex justify-end">
                <button
                  type="button"
                  onClick={onToggleTheme}
                  aria-label={isDarkMode ? 'Switch to light theme' : 'Switch to dark theme'}
                  title={isDarkMode ? 'Light theme' : 'Dark theme'}
                  className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-full border border-black/15 bg-black/[0.03] text-black/60 transition-colors hover:border-black/30 hover:text-black dark:border-white/15 dark:bg-white/5 dark:text-white/60 dark:hover:border-white/30 dark:hover:text-white"
                >
                  {isDarkMode ? (
                    <Sun className="h-4 w-4 text-amber-400" aria-hidden="true" />
                  ) : (
                    <Moon className="h-4 w-4" aria-hidden="true" />
                  )}
                </button>
              </div>
            )}

            {/* Heading */}
            <div>
              <h1 className="whitespace-nowrap text-3xl font-medium tracking-[-0.04em] sm:text-4xl lg:text-[42px] lg:leading-[1.05] xl:text-[50px]">
                Welcome Back
              </h1>
              <p className="mt-3 whitespace-nowrap text-lg leading-snug text-black/60 dark:text-white/55 sm:text-xl lg:text-2xl xl:text-3xl">
                Sign In to GuruOm OwnerOS
              </p>
            </div>

            {/* Feedback Notice Banner */}
            <AnimatePresence mode="wait">
              {notice && (
                <motion.div
                  key={notice.message}
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.2 }}
                  className="mt-6"
                >
                  <NoticeBanner
                    id="login-notice-banner"
                    notice={notice}
                    onDismiss={() => setNotice(null)}
                  />
                </motion.div>
              )}
            </AnimatePresence>

            {/* Login Form */}
            <form onSubmit={handleLogin} noValidate className="mt-8 space-y-5">
              {/* Work Email Field */}
              <FieldBox
                id="owneros-email"
                name="email"
                type="email"
                label="Work email"
                placeholder="name@company.com"
                value={email}
                autoComplete="username"
                disabled={isLoading}
                inputRef={emailRef}
                error={fieldErrors.email}
                onChange={(val) => {
                  setEmail(val);
                  clearFieldError('email');
                }}
                rightElement={
                  <Mail className="h-5 w-5 text-black/40 dark:text-white/40" aria-hidden="true" />
                }
              />

              {/* Password Field */}
              <div>
                <FieldBox
                  id="owneros-password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  label="Password"
                  placeholder="Enter your password"
                  value={password}
                  autoComplete="current-password"
                  disabled={isLoading}
                  inputRef={passwordRef}
                  error={fieldErrors.password}
                  onChange={(val) => {
                    setPassword(val);
                    clearFieldError('password');
                  }}
                  rightElement={
                    <button
                      type="button"
                      onClick={() => setShowPassword((prev) => !prev)}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                      className="cursor-pointer p-1 text-black/40 transition-colors hover:text-black dark:text-white/40 dark:hover:text-white"
                    >
                      {showPassword ? (
                        <EyeOff className="h-5 w-5" aria-hidden="true" />
                      ) : (
                        <Eye className="h-5 w-5" aria-hidden="true" />
                      )}
                    </button>
                  }
                />

                <div className="mt-2 flex justify-end">
                  <button
                    type="button"
                    onClick={openRecovery}
                    className="cursor-pointer text-xs font-medium text-black/60 underline underline-offset-2 transition-colors hover:text-black dark:text-white/60 dark:hover:text-white"
                  >
                    Forgot password?
                  </button>
                </div>
              </div>

              {/* Checkboxes & Terms */}
              <div className="space-y-4 pt-2 text-sm leading-5 text-black/60 dark:text-white/55 sm:text-[15px]">
                <CheckboxLine
                  checked={rememberEmail}
                  onChange={handleRememberChange}
                  disabled={isLoading}
                >
                  Remember my email on this device (7 days)
                </CheckboxLine>
                <div className="text-xs leading-relaxed text-black/45 dark:text-white/45">
                  {termsText}
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isLoading}
                className="mt-9 flex h-12 w-full cursor-pointer items-center justify-center rounded-[10px] border border-black/40 bg-black text-xl font-medium text-white transition-colors hover:bg-black/85 disabled:cursor-wait disabled:opacity-75 dark:border-white/40 dark:bg-white dark:text-black dark:hover:bg-white/85"
              >
                {isLoading ? (
                  <span className="flex items-center gap-2.5">
                    <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
                    <span>Signing in…</span>
                  </span>
                ) : (
                  <span>Submit</span>
                )}
              </button>
            </form>

            {/* Need an account / Request access strip */}
            <div className="mt-8 flex items-center justify-between gap-3 rounded-[10px] border border-black/10 bg-black/[0.02] p-4 dark:border-white/10 dark:bg-white/[0.03]">
              <div className="min-w-0 pr-2">
                <div className="text-sm font-semibold text-black dark:text-white">
                  Need an account?
                </div>
                <div className="truncate text-xs text-black/55 dark:text-white/50">
                  Provisioned by your GuruOm administrator
                </div>
              </div>

              <button
                type="button"
                onClick={() => setActiveDialog('access')}
                className="group inline-flex shrink-0 cursor-pointer items-center gap-1 rounded-[8px] border border-black/25 bg-white px-3.5 py-1.5 text-xs font-semibold text-black transition-colors hover:bg-black/[0.04] dark:border-white/20 dark:bg-white/10 dark:text-white dark:hover:bg-white/15"
              >
                <span>Request access</span>
                <ChevronRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
              </button>
            </div>

            {/* Security Note */}
            <div className="mt-8 flex items-center justify-center gap-1.5 text-xs text-black/40 dark:text-white/40">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" aria-hidden="true" />
              <span>Encrypted session · Authorized personnel only</span>
            </div>
          </div>
        </div>

        {/* Right Side: Grain Shader Showcase Panel */}
        <div className="relative flex min-h-[720px] overflow-hidden rounded-md bg-black p-8 text-white sm:p-12 lg:min-h-0">
          <GrainGradient
            speed={1}
            scale={1}
            rotation={0}
            offsetX={0}
            offsetY={0}
            softness={0.5}
            intensity={0.5}
            noise={0.25}
            shape="corners"
            frame={2854.5}
            colors={['#FFFFFF', '#FC7819', '#FC7819', '#FFFFFF']}
            colorBack="#00000000"
            className="absolute inset-0 bg-black"
          />

          <div className="relative z-10 flex h-full w-full flex-col justify-between">
            <div>
              <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3.5 py-1 text-xs font-medium text-white/90 backdrop-blur-md">
                <span className="h-2 w-2 rounded-full bg-[#FC7819] animate-pulse" />
                <span>GuruOm Industries · OwnerOS</span>
              </div>

              <h2 className="max-w-[620px] pt-0 text-5xl font-medium tracking-[-0.05em] text-white sm:text-6xl lg:pt-16 lg:text-[64px] lg:leading-[0.98] xl:text-[70px]">
                SketchitUp
                <br />
                Solutions
              </h2>
            </div>
          </div>
        </div>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Password Recovery Dialog                                            */}
      {/* ------------------------------------------------------------------ */}
      {activeDialog === 'recovery' && (
        <Dialog
          title="Reset your password"
          description="Enter your work email and we will send instructions to reset your OwnerOS password."
          icon={<KeyRound className="h-6 w-6" aria-hidden="true" />}
          onClose={() => {
            if (!resetInFlight.current) setActiveDialog(null);
          }}
        >
          <form onSubmit={handleResetPassword} noValidate className="space-y-4">
            {resetNotice && (
              <NoticeBanner id="owneros-reset-notice" notice={resetNotice} />
            )}

            <div>
              <label htmlFor="owneros-recovery-email" className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-black/60 dark:text-white/60">
                Work email
              </label>
              <FieldBox
                id="owneros-recovery-email"
                name="recoveryEmail"
                type="email"
                label="name@company.com"
                value={forgotEmail}
                autoComplete="email"
                disabled={isResetting}
                onChange={(val) => {
                  setForgotEmail(val);
                  setResetNotice(null);
                }}
                rightElement={
                  <Mail className="h-5 w-5 text-black/40 dark:text-white/40" aria-hidden="true" />
                }
              />
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                disabled={isResetting}
                onClick={() => setActiveDialog(null)}
                className="flex-1 h-12 cursor-pointer rounded-[10px] border border-black/20 bg-transparent text-sm font-medium text-black/70 transition-colors hover:bg-black/5 dark:border-white/20 dark:text-white/70 dark:hover:bg-white/5"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={isResetting}
                className="flex-1 h-12 cursor-pointer rounded-[10px] border border-black/40 bg-black text-sm font-medium text-white transition-colors hover:bg-black/85 disabled:cursor-wait dark:border-white/40 dark:bg-white dark:text-black dark:hover:bg-white/85"
              >
                {isResetting ? (
                  <span className="flex items-center justify-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                    <span>Sending…</span>
                  </span>
                ) : (
                  <span>Send reset link</span>
                )}
              </button>
            </div>
          </form>
        </Dialog>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* Request Access Dialog                                               */}
      {/* ------------------------------------------------------------------ */}
      {activeDialog === 'access' && (
        <Dialog
          title="GuruOm Industries Workspace"
          description="OwnerOS access is managed internally by GuruOm Industries. Your administrator can create your account and assign permissions."
          icon={<Building2 className="h-6 w-6" aria-hidden="true" />}
          onClose={() => setActiveDialog(null)}
        >
          <div className="space-y-4">
            <div className="rounded-[10px] border border-black/10 bg-black/[0.02] p-4 dark:border-white/10 dark:bg-white/[0.03]">
              <p className="text-sm font-semibold text-black dark:text-white">
                Contact your department lead or IT administrator
              </p>
              <p className="mt-1 text-xs leading-relaxed text-black/60 dark:text-white/60">
                Share your full name, work email, and department. They will provision your account with the appropriate roles and permissions.
              </p>
            </div>

            <div className="flex items-start gap-2.5">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" aria-hidden="true" />
              <p className="text-xs leading-relaxed text-black/60 dark:text-white/60">
                Accounts are provisioned internally. Public self-registration is disabled for security and regulatory compliance.
              </p>
            </div>

            <button
              type="button"
              onClick={() => setActiveDialog(null)}
              className="mt-2 flex h-12 w-full cursor-pointer items-center justify-center gap-2 rounded-[10px] border border-black/40 bg-black text-sm font-medium text-white transition-colors hover:bg-black/85 dark:border-white/40 dark:bg-white dark:text-black dark:hover:bg-white/85"
            >
              <span>Got it</span>
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        </Dialog>
      )}
    </section>
  );
};

export default LoginPage;