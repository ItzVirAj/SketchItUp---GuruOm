import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  AlertCircle,
  ArrowRight,
  ArrowUpRight,
  Building2,
  Check,
  CheckCircle2,
  ChevronRight,
  Eye,
  EyeOff,
  KeyRound,
  Layers3,
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

interface LoginPageProps {
  onLoginSuccess?: (email: string) => void;
  isDarkMode?: boolean;
  onToggleTheme?: () => void;
  /** "split" shows the OwnerOS showcase panel. "centered" matches the original single-card layout. */
  variant?: 'split' | 'centered';
}

type Notice = {
  type: 'error' | 'warning' | 'success';
  message: string;
};

type FieldErrors = {
  email?: string;
  password?: string;
};

type ThemeVariables = React.CSSProperties & {
  [key: `--${string}`]: string;
};

/* -------------------------------------------------------------------------- */
/* Design tokens — matched to the original obsidian + cobalt system            */
/* -------------------------------------------------------------------------- */

const getThemeVariables = (isDarkMode: boolean): ThemeVariables =>
  isDarkMode
    ? {
      colorScheme: 'dark',
      '--page': '#090a0f',
      '--surface': 'rgba(15, 17, 24, 0.85)',
      '--surface-soft': 'rgba(255, 255, 255, 0.04)',
      '--surface-hover': 'rgba(255, 255, 255, 0.07)',
      '--input': 'rgba(0, 0, 0, 0.35)',
      '--text': '#e8e9f0',
      '--muted': '#98a1b3',
      '--subtle': '#6b7484',
      '--line': 'rgba(255, 255, 255, 0.12)',
      '--line-soft': 'rgba(255, 255, 255, 0.07)',
      '--accent': '#4d8eff',
      '--accent-cyan': '#4cd7f6',
      '--accent-soft': 'rgba(77, 142, 255, 0.12)',
      '--accent-line': 'rgba(77, 142, 255, 0.28)',
      '--ring': 'rgba(77, 142, 255, 0.18)',
      '--btn-from': '#4d8eff',
      '--btn-to': '#005ac2',
      '--btn-text': '#ffffff',
    }
    : {
      colorScheme: 'light',
      '--page': '#f4f5f8',
      '--surface': 'rgba(255, 255, 255, 0.95)',
      '--surface-soft': '#f6f8fb',
      '--surface-hover': '#eef2f8',
      '--input': '#f8fafc',
      '--text': '#0f172a',
      '--muted': '#5a677d',
      '--subtle': '#94a3b8',
      '--line': '#e2e8f0',
      '--line-soft': '#eef2f7',
      '--accent': '#0055d4',
      '--accent-cyan': '#0891b2',
      '--accent-soft': 'rgba(0, 85, 212, 0.08)',
      '--accent-line': 'rgba(0, 85, 212, 0.18)',
      '--ring': 'rgba(0, 85, 212, 0.14)',
      '--btn-from': '#4d8eff',
      '--btn-to': '#005ac2',
      '--btn-text': '#ffffff',
    };

/* -------------------------------------------------------------------------- */
/* Storage helpers — email only, never the password                           */
/* -------------------------------------------------------------------------- */

function removeRememberedEmail() {
  try {
    localStorage.removeItem(REMEMBERED_EMAIL_KEY);
  } catch {
    // Storage may be unavailable in restricted browsing modes.
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

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

/* -------------------------------------------------------------------------- */
/* Shared UI                                                                  */
/* -------------------------------------------------------------------------- */

function BrandMark({
  className = '',
}: {
  className?: string;
  isDarkMode?: boolean;
}) {
  return (
    <img
      src="/logo.png"
      alt="GuruOm Logo"
      aria-hidden="true"
      className={`shrink-0 object-contain drop-shadow-sm transition-transform hover:scale-105 ${className}`}
    />
  );
}

function NoticeBanner({
  notice,
  onDismiss,
  isDarkMode,
  id,
}: {
  notice: Notice;
  onDismiss?: () => void;
  isDarkMode: boolean;
  id?: string;
}) {
  const styles = {
    error: isDarkMode
      ? 'border-rose-500/30 bg-rose-500/10 text-rose-200'
      : 'border-rose-200 bg-rose-50 text-rose-800',
    warning: isDarkMode
      ? 'border-amber-500/30 bg-amber-500/10 text-amber-200'
      : 'border-amber-200 bg-amber-50 text-amber-900',
    success: isDarkMode
      ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200'
      : 'border-emerald-200 bg-emerald-50 text-emerald-800',
  };

  const Icon = notice.type === 'success' ? CheckCircle2 : AlertCircle;

  return (
    <div
      id={id}
      role={notice.type === 'success' ? 'status' : 'alert'}
      className={`flex items-start gap-2.5 rounded-2xl border p-3.5 backdrop-blur-sm ${styles[notice.type]}`}
    >
      <Icon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />

      <p className="flex-1 text-[12.5px] leading-relaxed">{notice.message}</p>

      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Dismiss message"
          className="shrink-0 cursor-pointer rounded-md p-1 opacity-60 transition-opacity hover:opacity-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
        >
          <X className="h-3.5 w-3.5" aria-hidden="true" />
        </button>
      )}
    </div>
  );
}

interface DialogProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  onClose: () => void;
  isDarkMode: boolean;
  children: React.ReactNode;
}

function Dialog({ title, description, icon, onClose, isDarkMode, children }: DialogProps) {
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
        return;
      }

      if (event.key !== 'Tab') return;

      const panel = panelRef.current;
      if (!panel) return;

      const elements: HTMLElement[] = Array.from(
        panel.querySelectorAll(
          'button:not([disabled]), input:not([disabled]), a[href], select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ),
      ).filter((element): element is HTMLElement => element instanceof HTMLElement && element.getClientRects().length > 0);

      const first: HTMLElement | undefined = elements[0];
      const last: HTMLElement | undefined = elements[elements.length - 1];

      if (!first || !last) {
        event.preventDefault();
        panel.focus();
        return;
      }

      const activeElement = document.activeElement;
      const isOutsidePanel = !panel.contains(activeElement);

      if (event.shiftKey && (activeElement === first || activeElement === panel || isOutsidePanel)) {
        event.preventDefault();
        last.focus();
      } else if (
        !event.shiftKey &&
        (activeElement === last || activeElement === panel || isOutsidePanel)
      ) {
        event.preventDefault();
        first.focus();
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
      style={getThemeVariables(isDarkMode)}
      className="fixed inset-0 z-50 overflow-y-auto bg-black/75 p-4 font-sans text-[var(--text)] backdrop-blur-md sm:p-6"
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
          transition={{ duration: 0.22 }}
          className={`pointer-events-auto relative w-full max-w-[440px] rounded-[28px] border border-[var(--line)] bg-[var(--surface)] p-6 outline-none backdrop-blur-3xl sm:p-8 ${isDarkMode
              ? 'shadow-[0_30px_70px_rgba(0,0,0,0.85),inset_0_1px_1px_rgba(255,255,255,0.12)]'
              : 'shadow-[0_24px_70px_-15px_rgba(15,23,42,0.22)]'
            }`}
        >
          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="absolute right-4 top-4 flex h-10 w-10 cursor-pointer items-center justify-center rounded-full text-[var(--subtle)] transition-colors hover:bg-[var(--surface-soft)] hover:text-[var(--text)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>

          <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-[var(--accent-line)] bg-[var(--accent-soft)] text-[var(--accent)]">
            {icon}
          </div>

          <h2 id={titleId} className="mt-5 pr-6 text-[21px] font-bold tracking-[-0.03em]">
            {title}
          </h2>

          <p id={descriptionId} className="mt-2.5 text-[12.5px] leading-relaxed text-[var(--muted)]">
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
/* Login page                                                                 */
/* -------------------------------------------------------------------------- */

export const LoginPage: React.FC<LoginPageProps> = ({
  onLoginSuccess,
  isDarkMode = true,
  onToggleTheme,
  variant = 'split',
}) => {
  const { signIn, resetPassword } = useAuth();
  const reduceMotion = useReducedMotion();
  const isCentered = variant === 'centered';

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
      // Purge credentials written by the previous build. Base64 is encoding, not encryption.
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
    setFieldErrors((previous) => ({ ...previous, [field]: undefined }));
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
        const status = error instanceof ApiError ? error.statusCode : undefined;

        if (status === 401 || status === 404) {
          setNotice({
            type: 'error',
            message:
              'We couldn’t sign you in with those details. Check your email and password, then try again.',
          });
        } else if (status === 429) {
          setNotice({
            type: 'warning',
            message: 'Too many sign-in attempts. Please wait a moment before trying again.',
          });
        } else {
          setNotice({
            type: 'error',
            message:
              'Sign-in is currently unavailable. Please try again shortly or contact your administrator.',
          });
        }

        return;
      }

      if (rememberEmail) {
        persistRememberedEmail(normalizedEmail);
      } else {
        removeRememberedEmail();
      }

      authenticated = true;
      setPassword('');
    } catch {
      setNotice({
        type: 'error',
        message: 'We couldn’t connect to OwnerOS. Check your connection and try again.',
      });
    } finally {
      loginInFlight.current = false;
      setIsLoading(false);
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
        message:
          'If an account matches that email, you’ll receive password reset instructions shortly.',
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

  /* ---------------------------------------------------------------- */
  /* Reusable class strings                                           */
  /* ---------------------------------------------------------------- */

  const inputClassName =
    'h-[46px] w-full rounded-2xl border bg-[var(--input)] pl-11 pr-4 text-[13.5px] text-[var(--text)] outline-none transition-all duration-200 placeholder:text-[var(--subtle)] focus:border-[var(--accent)] focus:ring-4 focus:ring-[color:var(--ring)] disabled:cursor-not-allowed disabled:opacity-60';

  const primaryButtonClassName =
    'group flex h-[46px] w-full cursor-pointer items-center justify-center gap-2 rounded-2xl bg-[linear-gradient(180deg,var(--btn-from),var(--btn-to))] px-4 text-[14px] font-semibold text-[var(--btn-text)] shadow-[0_6px_18px_-4px_rgba(77,142,255,0.45),inset_0_1px_1px_rgba(255,255,255,0.35)] transition-all duration-200 hover:brightness-110 active:scale-[0.98] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--accent)] disabled:cursor-wait disabled:opacity-60';

  const labelClassName =
    'text-[11px] font-semibold uppercase tracking-[0.05em] text-[var(--muted)]';

  const errorTextClassName = `mt-1.5 text-[11px] font-medium ${isDarkMode ? 'text-rose-300' : 'text-rose-700'
    }`;

  /* ---------------------------------------------------------------- */
  /* Auth card                                                         */
  /* ---------------------------------------------------------------- */

  const authPanel = (
    <motion.section
      aria-labelledby="signin-heading"
      initial={reduceMotion ? false : { opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: reduceMotion || isCentered ? 0 : 0.1, ease: 'easeOut' }}
      className={`w-full max-w-[470px] ${isCentered ? 'mx-auto' : 'mx-auto lg:ml-auto lg:mr-0'}`}
    >
      <div
        className={`overflow-hidden rounded-[32px] border border-[var(--line)] bg-[var(--surface)] backdrop-blur-3xl ${isDarkMode
            ? 'shadow-[0_30px_90px_-15px_rgba(0,0,0,0.9),0_0_120px_-40px_rgba(77,142,255,0.25),inset_0_1px_1px_rgba(255,255,255,0.13)]'
            : 'shadow-[0_24px_70px_-15px_rgba(15,23,42,0.15),0_4px_16px_rgba(15,23,42,0.04),inset_0_1px_1px_rgba(255,255,255,1)]'
          }`}
      >
        {/* Workspace strip */}
        <div className="flex items-center justify-between gap-3 border-b border-[var(--line-soft)] px-6 py-2.5 sm:px-8">
          <div className="flex items-center gap-2.5">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[var(--surface-soft)]">
              <Building2 className="h-3.5 w-3.5 text-[var(--accent)]" aria-hidden="true" />
            </span>
            <span className="text-[12px] font-semibold tracking-[-0.01em]">GuruOm Industries</span>
          </div>

          <span className="text-[9.5px] font-semibold uppercase tracking-[0.16em] text-[var(--subtle)]">
            Workspace
          </span>
        </div>

        <div className="px-6 pb-6 pt-5 sm:px-8 sm:pb-7 sm:pt-6">
          {/* Emblem + heading */}
          <div className="flex flex-col items-center text-center">
            <div
              className={`group relative mb-3 flex h-12 w-12 items-center justify-center rounded-2xl border text-[var(--accent)] transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] hover:scale-105 ${isDarkMode
                  ? 'border-white/20 bg-gradient-to-b from-white/[0.14] to-white/[0.02] shadow-[0_8px_24px_rgba(0,0,0,0.6),inset_0_1px_1px_rgba(255,255,255,0.4)]'
                  : 'border-slate-200 bg-gradient-to-b from-slate-100 to-white shadow-[0_8px_20px_rgba(15,23,42,0.06)]'
                }`}
            >
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-tr from-[var(--accent)]/15 to-[var(--accent-cyan)]/15 opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
              <ShieldCheck className="h-5 w-5" strokeWidth={2} aria-hidden="true" />
            </div>

            <h2
              id="signin-heading"
              className="text-[21px] font-bold leading-tight tracking-[-0.03em] sm:text-[23px]"
            >
              Sign in to <span className="text-[var(--accent)]">OwnerOS</span>
            </h2>

            <p className="mt-1 text-[12.5px] font-medium text-[var(--muted)]">
              The owner’s operating system, by SketchitUp
            </p>

            <div className="mt-2.5 inline-flex items-center gap-1.5 rounded-full border border-[var(--accent-line)] bg-[var(--accent-soft)] px-3 py-0.5 text-[11px] font-semibold tracking-tight text-[var(--accent)]">
              <KeyRound className="h-3 w-3" aria-hidden="true" />
              <span>Welcome back</span>
            </div>
          </div>

          {/* Alerts */}
          <AnimatePresence mode="wait">
            {notice && (
              <motion.div
                key={notice.message}
                initial={reduceMotion ? false : { opacity: 0, y: -8, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -8, scale: 0.98 }}
                transition={{ duration: 0.2 }}
                className="mt-5"
              >
                <NoticeBanner
                  notice={notice}
                  onDismiss={() => setNotice(null)}
                  isDarkMode={isDarkMode}
                />
              </motion.div>
            )}
          </AnimatePresence>

          {/* Form */}
          <form onSubmit={handleLogin} noValidate aria-busy={isLoading} className="mt-4 space-y-3.5">
            {/* Email */}
            <div>
              <div className="mb-1.5 flex items-center justify-between px-1">
                <label htmlFor="owneros-email" className={labelClassName}>
                  Work email
                </label>
              </div>

              <div className="relative">
                <Mail
                  className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--subtle)]"
                  aria-hidden="true"
                />

                <input
                  ref={emailRef}
                  id="owneros-email"
                  name="email"
                  type="email"
                  autoComplete="username"
                  inputMode="email"
                  autoCapitalize="none"
                  spellCheck={false}
                  required
                  disabled={isLoading}
                  value={email}
                  onChange={(event) => {
                    setEmail(event.target.value);
                    clearFieldError('email');
                  }}
                  aria-invalid={Boolean(fieldErrors.email)}
                  aria-describedby={fieldErrors.email ? 'owneros-email-error' : undefined}
                  placeholder="name@company.com"
                  className={`${inputClassName} ${fieldErrors.email ? 'border-rose-500' : 'border-[var(--line)]'
                    }`}
                />
              </div>

              {fieldErrors.email && (
                <p id="owneros-email-error" role="alert" className={errorTextClassName}>
                  {fieldErrors.email}
                </p>
              )}
            </div>

            {/* Password */}
            <div>
              <div className="mb-1.5 flex items-center justify-between gap-3 px-1">
                <label htmlFor="owneros-password" className={labelClassName}>
                  Password
                </label>

                <button
                  type="button"
                  onClick={openRecovery}
                  className="cursor-pointer rounded-md text-[11.5px] font-medium text-[var(--accent)] underline-offset-2 transition-opacity hover:underline hover:opacity-80 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--accent)]"
                >
                  Forgot password?
                </button>
              </div>

              <div className="relative">
                <Lock
                  className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--subtle)]"
                  aria-hidden="true"
                />

                <input
                  ref={passwordRef}
                  id="owneros-password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  disabled={isLoading}
                  value={password}
                  onChange={(event) => {
                    setPassword(event.target.value);
                    clearFieldError('password');
                  }}
                  aria-invalid={Boolean(fieldErrors.password)}
                  aria-describedby={fieldErrors.password ? 'owneros-password-error' : undefined}
                  placeholder="Enter your password"
                  className={`${inputClassName} pr-12 ${fieldErrors.password ? 'border-rose-500' : 'border-[var(--line)]'
                    }`}
                />

                <button
                  type="button"
                  onClick={() => setShowPassword((previous) => !previous)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  aria-pressed={showPassword}
                  className="absolute right-1.5 top-1/2 flex h-10 w-10 -translate-y-1/2 cursor-pointer items-center justify-center rounded-xl text-[var(--subtle)] transition-colors hover:text-[var(--text)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--accent)]"
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" aria-hidden="true" />
                  ) : (
                    <Eye className="h-4 w-4" aria-hidden="true" />
                  )}
                </button>
              </div>

              {fieldErrors.password && (
                <p id="owneros-password-error" role="alert" className={errorTextClassName}>
                  {fieldErrors.password}
                </p>
              )}
            </div>

            {/* Remember email — password is never stored */}
            <div className="px-1 pt-0.5">
              <label className="group inline-flex cursor-pointer items-center gap-2.5">
                <span className="relative flex h-[18px] w-[18px] shrink-0">
                  <input
                    type="checkbox"
                    name="rememberEmail"
                    checked={rememberEmail}
                    disabled={isLoading}
                    onChange={(event) => handleRememberChange(event.target.checked)}
                    className="peer sr-only"
                  />

                  <span
                    className={`flex h-[18px] w-[18px] items-center justify-center rounded-[6px] border transition-all duration-200 peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-4 peer-focus-visible:outline-[var(--accent)] peer-disabled:opacity-50 ${rememberEmail
                        ? 'border-[var(--accent)] bg-[var(--accent)] text-white shadow-[0_2px_8px_rgba(77,142,255,0.4)]'
                        : 'border-[var(--line)] bg-[var(--surface-soft)] group-hover:border-[var(--subtle)]'
                      }`}
                  >
                    {rememberEmail && (
                      <Check className="h-3 w-3" strokeWidth={2.8} aria-hidden="true" />
                    )}
                  </span>
                </span>

                <span
                  className={`text-[12px] font-medium transition-colors ${rememberEmail ? 'text-[var(--text)]' : 'text-[var(--muted)]'
                    }`}
                >
                  Remember my email on this device (7 days)
                </span>
              </label>
            </div>

            <button type="submit" disabled={isLoading} className={`${primaryButtonClassName} mt-1`}>
              {isLoading ? (
                <>
                  <Loader2
                    className="h-4 w-4 animate-spin motion-reduce:animate-none"
                    aria-hidden="true"
                  />
                  <span>Signing you in…</span>
                </>
              ) : (
                <>
                  <span>Sign in</span>
                  <ArrowRight
                    className="h-4 w-4 transition-transform group-hover:translate-x-1 motion-reduce:transform-none"
                    aria-hidden="true"
                  />
                </>
              )}
            </button>
          </form>

          {/* Request access */}
          <div
            className={`mt-6 flex items-center justify-between gap-3 rounded-2xl border border-[var(--line-soft)] bg-[var(--surface-soft)] p-3.5 transition-colors hover:bg-[var(--surface-hover)] sm:p-4`}
          >
            <div className="flex min-w-0 items-center gap-3 pr-1">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-[var(--line)] bg-[var(--surface-soft)]">
                <Building2 className="h-4 w-4 text-[var(--accent)]" aria-hidden="true" />
              </div>

              <div className="min-w-0">
                <div className="text-[12px] font-semibold">Need an account?</div>
                <div className="truncate text-[11px] text-[var(--muted)]">
                  Provisioned by your GuruOm administrator
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setActiveDialog('access')}
              className="group inline-flex shrink-0 cursor-pointer items-center gap-1.5 rounded-xl border border-[var(--line)] bg-[var(--surface-soft)] px-3.5 py-2 text-[11.5px] font-semibold tracking-tight transition-all hover:bg-[var(--surface-hover)] active:scale-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--accent)]"
            >
              <span>Request access</span>
              <ChevronRight
                className="h-3.5 w-3.5 text-[var(--accent)] transition-transform group-hover:translate-x-0.5"
                aria-hidden="true"
              />
            </button>
          </div>

          {/* Signature line */}
          <div className="mt-6 flex items-center justify-center border-t border-[var(--line-soft)] pt-4 text-[11px] text-[var(--muted)]">
            <span className="flex items-center gap-1.5 font-mono">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" aria-hidden="true" />
              <span>Encrypted session · Authorized personnel only</span>
            </span>
          </div>
        </div>
      </div>
    </motion.section>
  );

  /* ---------------------------------------------------------------- */
  /* Showcase panel                                                    */
  /* ---------------------------------------------------------------- */

  const showcasePanel = (
    <motion.section
      aria-labelledby="product-heading"
      initial={reduceMotion ? false : { opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
      className="hidden lg:block"
    >
      <div className="mb-9 flex items-center gap-3">
        <span className="flex h-8 w-8 items-center justify-center rounded-xl border border-[var(--line)] bg-[var(--surface-soft)]">
          <Layers3 className="h-4 w-4 text-[var(--accent)]" strokeWidth={1.9} aria-hidden="true" />
        </span>

        <span className="text-[14px] font-bold tracking-[-0.02em]">OwnerOS</span>

        <span className="h-4 w-px bg-[var(--line)]" />

        <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--muted)]">
          Built for your business
        </span>
      </div>

      <h1
        id="product-heading"
        className="max-w-[560px] text-[clamp(2.6rem,4.8vw,4.4rem)] font-bold leading-[1.05] tracking-[-0.045em]"
      >
        Your operation.
        <br />
        <span className="bg-gradient-to-r from-[var(--accent)] to-[var(--accent-cyan)] bg-clip-text text-transparent">
          In focus.
        </span>
      </h1>

      <p className="mt-6 max-w-[400px] text-[15px] leading-7 text-[var(--muted)]">
        Less switching. More clarity. One workspace for the people, processes, and decisions that
        move your business forward.
      </p>

      <div className="mt-10 max-w-[440px]">
        <div className="mb-3.5 flex items-center justify-between px-1">
          <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--subtle)]">
            Connected by design
          </span>

          <span aria-hidden="true" className="flex items-center gap-1.5">
            <span className="h-1 w-1 rounded-full bg-[var(--accent)]" />
            <span className="h-1 w-1 rounded-full bg-[var(--line)]" />
            <span className="h-1 w-1 rounded-full bg-[var(--line)]" />
          </span>
        </div>

        <div
          className={`rounded-[26px] border border-[var(--line)] bg-[var(--surface)] p-5 backdrop-blur-2xl ${isDarkMode
              ? 'shadow-[0_24px_60px_-25px_rgba(0,0,0,0.9),inset_0_1px_1px_rgba(255,255,255,0.1)]'
              : 'shadow-[0_18px_50px_-25px_rgba(15,23,42,0.2)]'
            }`}
        >
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-2xl border border-[var(--line)] bg-[var(--surface-soft)]">
                <Building2 className="h-5 w-5 text-[var(--accent)]" strokeWidth={1.7} aria-hidden="true" />
              </span>

              <div>
                <p className="text-[13.5px] font-bold tracking-[-0.02em]">GuruOm Industries</p>
                <p className="mt-0.5 text-[11.5px] text-[var(--muted)]">
                  Your business. One shared view.
                </p>
              </div>
            </div>

            <ArrowUpRight className="h-4 w-4 text-[var(--subtle)]" aria-hidden="true" />
          </div>

          <div className="my-5 h-px bg-[var(--line-soft)]" />

          <div className="grid grid-cols-3 gap-2.5">
            {[
              { number: '01', title: 'Production', subtitle: 'Plan & execute' },
              { number: '02', title: 'Quality', subtitle: 'Review & refine' },
              { number: '03', title: 'Dispatch', subtitle: 'Deliver & track' },
            ].map((item) => (
              <div
                key={item.number}
                className="rounded-2xl border border-[var(--line-soft)] bg-[var(--surface-soft)] px-3 py-3.5"
              >
                <span className="font-mono text-[10px] text-[var(--accent)]">{item.number}</span>
                <p className="mt-3 text-[12px] font-semibold">{item.title}</p>
                <p className="mt-1 text-[10.5px] text-[var(--muted)]">{item.subtitle}</p>
              </div>
            ))}
          </div>
        </div>

        <p className="mt-4 px-1 text-[11.5px] text-[var(--muted)]">
          A little more connected. A lot more in control.
        </p>
      </div>
    </motion.section>
  );

  /* ---------------------------------------------------------------- */
  /* Render                                                            */
  /* ---------------------------------------------------------------- */

  return (
    <div
      style={getThemeVariables(isDarkMode)}
      className="relative isolate flex min-h-screen min-h-[100dvh] w-full flex-col overflow-x-hidden bg-[var(--page)] font-sans text-[var(--text)] antialiased transition-colors duration-300"
    >
      {/* Minimal atmospheric field — two soft washes only */}
      <div aria-hidden="true" className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div
          className="absolute -top-[22%] left-1/2 h-[520px] w-[900px] -translate-x-1/2 rounded-full blur-[140px]"
          style={{
            background: isDarkMode
              ? 'radial-gradient(circle, rgba(28, 53, 105, 0.38) 0%, rgba(0, 78, 92, 0.12) 45%, transparent 72%)'
              : 'radial-gradient(circle, rgba(147, 197, 253, 0.28) 0%, rgba(165, 243, 252, 0.12) 45%, transparent 72%)',
          }}
        />
        <div
          className="absolute -bottom-[22%] right-[-12%] h-[480px] w-[620px] rounded-full blur-[150px]"
          style={{
            background: isDarkMode
              ? 'radial-gradient(circle, rgba(44, 19, 84, 0.28) 0%, transparent 70%)'
              : 'radial-gradient(circle, rgba(199, 210, 254, 0.30) 0%, transparent 70%)',
          }}
        />
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Header                                                              */}
      {/* ------------------------------------------------------------------ */}

      <header className="relative z-10">
        <div className="mx-auto flex w-full max-w-[1320px] items-center justify-between gap-4 px-5 py-3 sm:px-8 lg:px-12 lg:py-4">
          <div
            className={`inline-flex items-center gap-3.5 rounded-full border border-[var(--line)] bg-[var(--surface)] py-1.5 pl-2.5 pr-5 backdrop-blur-xl transition-all hover:bg-[var(--surface-hover)] hover:shadow-md ${isDarkMode ? 'shadow-lg shadow-black/40' : 'shadow-sm'
              }`}
          >
            <BrandMark className="h-12 w-12" isDarkMode={isDarkMode} />

            <div className="flex items-center gap-2.5">
              <span className="text-[15px] font-bold tracking-[-0.03em]">SketchitUp</span>
              <span className="hidden h-3.5 w-px bg-[var(--line)] sm:block" />
              <span className="hidden text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--muted)] sm:block">
                Business, by design
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3 sm:gap-5">
            <div className="hidden items-center gap-2 rounded-full border border-[var(--line)] bg-[var(--surface)] px-3.5 py-1.5 text-[11.5px] font-medium text-[var(--muted)] backdrop-blur-xl md:flex">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--accent-cyan)] opacity-75 motion-reduce:animate-none" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-[var(--accent-cyan)]" />
              </span>
              GuruOm Industries workspace
            </div>

            {onToggleTheme && (
              <button
                type="button"
                onClick={onToggleTheme}
                aria-label={isDarkMode ? 'Switch to light theme' : 'Switch to dark theme'}
                title={isDarkMode ? 'Light theme' : 'Dark theme'}
                className="flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-full border border-[var(--line)] bg-[var(--surface)] text-[var(--muted)] backdrop-blur-xl transition-all hover:bg-[var(--surface-hover)] hover:text-[var(--text)] active:scale-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--accent)]"
              >
                <AnimatePresence mode="popLayout" initial={false}>
                  <motion.span
                    key={isDarkMode ? 'sun' : 'moon'}
                    initial={{ opacity: 0, scale: 0.5, rotate: -30 }}
                    animate={{ opacity: 1, scale: 1, rotate: 0 }}
                    exit={{ opacity: 0, scale: 0.5, rotate: 30 }}
                    transition={{ duration: 0.2 }}
                    className="flex items-center justify-center"
                  >
                    {isDarkMode ? (
                      <Sun className="h-4 w-4 text-amber-400" aria-hidden="true" />
                    ) : (
                      <Moon className="h-4 w-4" aria-hidden="true" />
                    )}
                  </motion.span>
                </AnimatePresence>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* ------------------------------------------------------------------ */}
      {/* Main                                                                */}
      {/* ------------------------------------------------------------------ */}

      <main className="relative z-10 mx-auto flex w-full max-w-[1320px] flex-1 items-center px-5 py-2 sm:px-8 lg:px-12 lg:py-4">
        {isCentered ? (
          <div className="mx-auto w-full">{authPanel}</div>
        ) : (
          <div className="grid w-full items-center gap-12 lg:grid-cols-[1.05fr_1fr] lg:gap-16 xl:gap-24">
            {showcasePanel}
            {authPanel}
          </div>
        )}
      </main>

      {/* ------------------------------------------------------------------ */}
      {/* Footer                                                              */}
      {/* ------------------------------------------------------------------ */}

      <footer className="relative z-10">
        <div className="mx-auto flex w-full max-w-[1320px] flex-col items-center justify-between gap-2 border-t border-[var(--line-soft)] px-5 py-3 text-center sm:flex-row sm:px-8 sm:text-left lg:px-12">
          <p className="text-[11.5px] text-[var(--muted)]">
            © {new Date().getFullYear()}{' '}
            <span className="font-semibold text-[var(--text)]">SketchitUp</span>
            <span className="mx-2 text-[var(--subtle)]">/</span>
            Thoughtfully built for GuruOm Industries.
          </p>

          <div className="flex items-center gap-2 text-[11.5px]">
            <span className="font-bold tracking-[-0.02em] text-[var(--accent)]">OwnerOS</span>
            <span className="text-[var(--subtle)]">—</span>
            <span className="text-[var(--muted)]">The owner’s operating system</span>
          </div>
        </div>
      </footer>

      {/* ------------------------------------------------------------------ */}
      {/* Password recovery                                                   */}
      {/* ------------------------------------------------------------------ */}

      {activeDialog === 'recovery' && (
        <Dialog
          title="Let’s get you back in."
          description="Enter your work email and we’ll send instructions to reset your OwnerOS password."
          icon={<KeyRound className="h-5 w-5" aria-hidden="true" />}
          onClose={() => {
            if (!resetInFlight.current) setActiveDialog(null);
          }}
          isDarkMode={isDarkMode}
        >
          <form onSubmit={handleResetPassword} noValidate aria-busy={isResetting} className="space-y-4">
            {resetNotice && (
              <NoticeBanner id="owneros-reset-notice" notice={resetNotice} isDarkMode={isDarkMode} />
            )}

            <div>
              <label htmlFor="owneros-recovery-email" className={`${labelClassName} mb-1.5 block px-1`}>
                Work email
              </label>

              <div className="relative">
                <Mail
                  className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--subtle)]"
                  aria-hidden="true"
                />

                <input
                  id="owneros-recovery-email"
                  name="recoveryEmail"
                  type="email"
                  autoComplete="email"
                  inputMode="email"
                  autoCapitalize="none"
                  spellCheck={false}
                  required
                  disabled={isResetting}
                  value={forgotEmail}
                  onChange={(event) => {
                    setForgotEmail(event.target.value);
                    setResetNotice(null);
                  }}
                  aria-describedby={resetNotice ? 'owneros-reset-notice' : undefined}
                  placeholder="name@company.com"
                  className={`${inputClassName} border-[var(--line)]`}
                />
              </div>
            </div>

            <div className="flex items-center gap-3 pt-1">
              <button
                type="button"
                disabled={isResetting}
                onClick={() => setActiveDialog(null)}
                className="h-[52px] flex-1 cursor-pointer rounded-2xl border border-[var(--line)] bg-[var(--surface-soft)] text-[13px] font-semibold text-[var(--muted)] transition-colors hover:bg-[var(--surface-hover)] hover:text-[var(--text)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--accent)] disabled:opacity-50"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={isResetting}
                className={`${primaryButtonClassName} flex-1`}
              >
                {isResetting ? (
                  <>
                    <Loader2
                      className="h-4 w-4 animate-spin motion-reduce:animate-none"
                      aria-hidden="true"
                    />
                    <span>Sending…</span>
                  </>
                ) : (
                  <span>Send reset link</span>
                )}
              </button>
            </div>
          </form>
        </Dialog>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* Request access                                                      */}
      {/* ------------------------------------------------------------------ */}

      {activeDialog === 'access' && (
        <Dialog
          title="Your workspace starts here."
          description="OwnerOS access is managed by GuruOm Industries. Your administrator can create your account and assign the right permissions."
          icon={<Building2 className="h-5 w-5" aria-hidden="true" />}
          onClose={() => setActiveDialog(null)}
          isDarkMode={isDarkMode}
        >
          <div className="space-y-5">
            <div className="rounded-2xl border border-[var(--line)] bg-[var(--surface-soft)] p-4">
              <p className="text-[12.5px] font-bold">Contact your department head or IT admin</p>
              <p className="mt-1.5 text-[11.5px] leading-relaxed text-[var(--muted)]">
                Share your full name, work email, and department. They’ll help you join the GuruOm
                Industries workspace with the access you need.
              </p>
            </div>

            <div className="flex items-start gap-3 px-1">
              <ShieldCheck
                className="mt-0.5 h-4 w-4 shrink-0 text-[var(--accent)]"
                aria-hidden="true"
              />
              <p className="text-[11.5px] leading-relaxed text-[var(--muted)]">
                Accounts are provisioned internally. Public self-registration isn’t available for
                this workspace.
              </p>
            </div>

            <button
              type="button"
              onClick={() => setActiveDialog(null)}
              className={primaryButtonClassName}
            >
              Got it
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </button>

            <p className="text-center text-[10.5px] text-[var(--subtle)]">
              OwnerOS by SketchitUp · For GuruOm Industries
            </p>
          </div>
        </Dialog>
      )}
    </div>
  );
};

export default LoginPage;