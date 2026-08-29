import React, { useState, useEffect } from 'react';
import {
  Lock,
  Mail,
  ArrowRight,
  ShieldCheck,
  AlertCircle,
  Sparkles,
  Eye,
  EyeOff,
  Factory,
  Cpu,
  CheckCircle2,
  X,
  Building2,
  Route,
  Boxes,
  ChevronDown,
  Sun,
  Moon,
  Activity,
  CircleCheck,
  Command,
  Clock3,
  HardHat,
  ChevronRight
} from 'lucide-react';
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
  onToggleTheme 
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
  
  // Feedback 1: Keep Dev Quick Login in hidden/collapsed state by default (toggled by user)
  const [isDevLoginOpen, setIsDevLoginOpen] = useState(false);
  const [demoUsers, setDemoUsers] = useState<SystemUser[]>([]);

  useEffect(() => {
    let cancelled = false;
    fetchProfiles()
      .then(users => {
        if (!cancelled && users && users.length > 0) {
          setDemoUsers(users);
          try {
            localStorage.setItem('stratum_demo_users', JSON.stringify(users));
          } catch (_) {}
        }
      })
      .catch(() => {});
    return () => { cancelled = true; };
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
        setLocalError(authError.message || 'Invalid email or password. Please verify your credentials.');
      } else if (onLoginSuccess) {
        onLoginSuccess(trimmedEmail);
      }
    } catch (err: any) {
      setLocalError(err.message || 'An unexpected error occurred during login.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDevQuickLogin = async (devEmail: string, devPass: string) => {
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
      setLocalError('Please enter your email address to receive reset instructions.');
      return;
    }
    setIsResetting(true);
    setLocalError(null);
    try {
      const { error: resetError } = await resetPassword(targetEmail);
      if (resetError) {
        setLocalError(resetError.message);
      } else {
        setSuccessMsg(`Password reset link sent to ${targetEmail}. Please check your inbox.`);
        setIsForgotOpen(false);
      }
    } catch (err: any) {
      setLocalError(err.message || 'Failed to send reset link.');
    } finally {
      setIsResetting(false);
    }
  };

  // Combine static dev accounts with dynamic demo users
  const effectiveDevAccounts = DEV_ACCOUNTS.map(acc => {
    const matched = demoUsers.find(u => u.email?.toLowerCase() === acc.email.toLowerCase());
    return {
      ...acc,
      name: matched?.name || acc.name,
      role: matched?.role || acc.role,
    };
  });

  return (
    <div className={`min-h-screen overflow-x-hidden font-sans transition-colors duration-300 ${isDarkMode ? 'bg-[#0b0e14] text-slate-100 dark' : 'bg-[#F3F6F8] text-slate-950'}`}>
      <div className={`mx-auto flex min-h-screen w-full max-w-[1600px] flex-col px-4 py-4 sm:px-6 lg:px-10 lg:py-7 ${isDarkMode ? 'bg-[#0b0e14]' : 'bg-[#F3F6F8]'}`}>
        <header className={`flex min-h-14 items-center justify-between border-b pb-4 ${isDarkMode ? 'border-slate-800/80' : 'border-slate-300/80'}`}>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--accent-primary)] text-sm font-black text-white shadow-lg shadow-[var(--accent-shadow)]">
              GO
            </div>
            <div className="leading-none">
              <div className={`text-lg font-black tracking-tight ${isDarkMode ? 'text-white' : 'text-slate-950'}`}>GuruOm - OwnerOS</div>
              <div className={`mt-1 text-[10px] font-bold uppercase tracking-[0.16em] ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>BY SKETCHITUP SOLUTIONS</div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className={`hidden items-center gap-2 rounded-lg border px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.12em] sm:flex ${isDarkMode ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400' : 'border-emerald-600/20 bg-emerald-50 text-emerald-700'}`}>
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              Systems online
            </div>
            {onToggleTheme && (
              <button 
                type="button" 
                onClick={onToggleTheme} 
                aria-label="Toggle color theme" 
                className={`flex h-10 w-10 items-center justify-center rounded-xl border transition-all cursor-pointer ${isDarkMode ? 'border-slate-750 bg-slate-800/60 text-slate-300 hover:bg-slate-800 hover:text-white' : 'border-slate-300 bg-white text-slate-600 hover:bg-slate-100'}`} 
                title={isDarkMode ? 'Use light mode' : 'Use dark mode'}
              >
                {isDarkMode ? <Sun className="h-4 w-4 text-amber-400" /> : <Moon className="h-4 w-4 text-slate-700" />}
              </button>
            )}
          </div>
        </header>

        <main className="flex flex-1 items-center py-8 lg:py-10">
          <div className={`grid w-full grid-cols-1 rounded-2xl border shadow-2xl overflow-hidden lg:min-h-[660px] lg:grid-cols-[minmax(0,0.95fr)_minmax(440px,0.75fr)] xl:grid-cols-[minmax(0,1fr)_minmax(480px,0.7fr)] ${isDarkMode ? 'border-slate-800/90 bg-[#12161f]' : 'border-slate-300 bg-white'}`}>
            {/* Left Showcase Banner */}
            <section className={`relative hidden overflow-hidden border-r p-9 lg:flex lg:flex-col xl:p-12 ${isDarkMode ? 'border-slate-800/80 bg-[#0f131a]' : 'border-slate-200 bg-[#FAFBFC]'}`}>
              <div className={`absolute inset-0 opacity-[0.14] ${isDarkMode ? 'bg-[linear-gradient(to_right,#64748b_1px,transparent_1px),linear-gradient(to_bottom,#64748b_1px,transparent_1px)]' : 'bg-[linear-gradient(to_right,#94a3b8_1px,transparent_1px),linear-gradient(to_bottom,#94a3b8_1px,transparent_1px)]'} bg-[size:32px_32px]`} />
              <div className="relative flex h-full flex-col justify-between">
                <div>
                  <div className={`mb-8 inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.14em] ${isDarkMode ? 'border-slate-700/80 bg-slate-900/80 text-slate-300' : 'border-slate-300 bg-white text-slate-700'}`}>
                    <Command className="h-3.5 w-3.5 text-[var(--accent-primary)]" />
                    Operations control plane
                  </div>
                  <h1 className={`max-w-xl text-4xl font-black leading-[1.08] xl:text-5xl ${isDarkMode ? 'text-white' : 'text-slate-950'}`}>
                    Work moves better when every signal is visible.
                  </h1>
                  <p className={`mt-5 max-w-lg text-sm leading-7 ${isDarkMode ? 'text-slate-300' : 'text-slate-600'}`}>
                    Coordinate jobs, material, quality, and dispatch from one secure operating system built for precision engineering and shop floor telemetry.
                  </p>
                </div>
                <div className="grid grid-cols-3 gap-3 pt-6">
                  {[
                    { icon: Activity, value: '99.98%', label: 'Platform uptime' },
                    { icon: Clock3, value: 'Live', label: 'Shop Signals' },
                    { icon: ShieldCheck, value: 'RBAC', label: 'Secure Access' }
                  ].map(({ icon: Icon, value, label }) => (
                    <div key={label} className={`rounded-xl border p-4 backdrop-blur-sm ${isDarkMode ? 'border-slate-800 bg-[#12161f]/90' : 'border-slate-200 bg-white shadow-xs'}`}>
                      <Icon className="h-4 w-4 text-[var(--accent-primary)]" />
                      <div className={`mt-5 text-base font-black ${isDarkMode ? 'text-white' : 'text-slate-950'}`}>{value}</div>
                      <div className={`mt-1 text-[10px] font-bold uppercase tracking-[0.1em] ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>{label}</div>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            {/* Right Login Section */}
            <section className={`flex min-w-0 flex-col justify-center p-6 sm:p-8 lg:p-10 xl:px-14 ${isDarkMode ? 'bg-[#12161f]' : 'bg-white'}`}>
              <div className="mx-auto w-full max-w-md">
                <div className="mb-7">
                  <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--accent-primary)]">
                    <HardHat className="h-3.5 w-3.5" />
                    Secure terminal access
                  </div>
                  <h2 className={`mt-3 text-3xl font-black tracking-tight ${isDarkMode ? 'text-white' : 'text-slate-950'}`}>Welcome back</h2>
                  <p className={`mt-2 text-sm leading-6 ${isDarkMode ? 'text-slate-300' : 'text-slate-600'}`}>Sign in with your work credentials to continue.</p>
                </div>

                {localError && (
                  <div id="login-error-alert" className={`mb-5 flex items-start gap-3 rounded-xl border p-3.5 text-xs leading-5 shadow-sm ${isDarkMode ? 'border-rose-500/40 bg-rose-500/10 text-rose-200' : 'border-rose-200 bg-rose-50 text-rose-800'}`}>
                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-400" />
                    <span className="flex-1 font-medium">{localError}</span>
                    <button type="button" onClick={() => setLocalError(null)} className="opacity-70 hover:opacity-100 cursor-pointer" aria-label="Dismiss error">
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                )}

                {successMsg && (
                  <div className={`mb-5 flex items-start gap-3 rounded-xl border p-3.5 text-xs leading-5 shadow-sm ${isDarkMode ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-200' : 'border-emerald-200 bg-emerald-50 text-emerald-800'}`}>
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
                    <span className="flex-1 font-medium">{successMsg}</span>
                    <button type="button" onClick={() => setSuccessMsg(null)} className="opacity-70 hover:opacity-100 cursor-pointer" aria-label="Dismiss message">
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                )}

                <form onSubmit={handleLogin} className="space-y-5">
                  {/* Email Input */}
                  <div>
                    <label className={`mb-2 block text-xs font-bold uppercase tracking-[0.08em] ${isDarkMode ? 'text-slate-200' : 'text-slate-700'}`}>
                      Work email
                    </label>
                    <div className="relative">
                      <Mail className={`pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 ${isDarkMode ? 'text-slate-400' : 'text-slate-400'}`} />
                      <input 
                        type="email" 
                        required 
                        value={email} 
                        onChange={(e) => setEmail(e.target.value)} 
                        placeholder="name@company.com" 
                        className={`h-12 w-full rounded-xl border pl-11 pr-4 text-sm font-medium outline-none transition-all focus:border-[var(--accent-primary)] focus:ring-2 focus:ring-[var(--accent-ring)] ${
                          isDarkMode 
                            ? 'border-slate-700/80 bg-[#0d1017] text-white placeholder:text-slate-500 focus:bg-[#0f131a]' 
                            : 'border-slate-300 bg-white text-slate-950 placeholder:text-slate-400 shadow-xs'
                        }`} 
                      />
                    </div>
                  </div>

                  {/* Password Input */}
                  <div>
                    <div className="mb-2 flex items-center justify-between">
                      <label className={`block text-xs font-bold uppercase tracking-[0.08em] ${isDarkMode ? 'text-slate-200' : 'text-slate-700'}`}>
                        Password
                      </label>
                      <button 
                        type="button" 
                        onClick={() => { setForgotEmail(email); setIsForgotOpen(true); }} 
                        className="text-xs font-bold text-[var(--accent-primary)] hover:underline cursor-pointer"
                      >
                        Forgot password?
                      </button>
                    </div>
                    <div className="relative">
                      <Lock className={`pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 ${isDarkMode ? 'text-slate-400' : 'text-slate-400'}`} />
                      <input 
                        type={showPassword ? 'text' : 'password'} 
                        required 
                        value={password} 
                        onChange={(e) => setPassword(e.target.value)} 
                        placeholder="Enter your password" 
                        className={`h-12 w-full rounded-xl border pl-11 pr-11 text-sm font-medium outline-none transition-all focus:border-[var(--accent-primary)] focus:ring-2 focus:ring-[var(--accent-ring)] ${
                          isDarkMode 
                            ? 'border-slate-700/80 bg-[#0d1017] text-white placeholder:text-slate-500 focus:bg-[#0f131a]' 
                            : 'border-slate-300 bg-white text-slate-950 placeholder:text-slate-400 shadow-xs'
                        }`} 
                      />
                      <button 
                        type="button" 
                        onClick={() => setShowPassword(!showPassword)} 
                        className={`absolute right-0 top-0 flex h-12 w-12 items-center justify-center rounded-r-xl transition-colors cursor-pointer ${
                          isDarkMode ? 'text-slate-400 hover:text-white' : 'text-slate-400 hover:text-slate-700'
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
                    className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[var(--accent-primary)] text-sm font-bold text-white shadow-lg shadow-[var(--accent-shadow)] transition-all hover:brightness-110 active:scale-[0.99] disabled:cursor-wait disabled:opacity-60 cursor-pointer"
                  >
                    {isLoading ? (
                      <span className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                    ) : (
                      <>
                        <span>Sign in to GuruOm OS</span>
                        <ArrowRight className="h-4 w-4" />
                      </>
                    )}
                  </button>
                </form>

                <div className={`mt-6 flex items-center justify-between border-t pt-5 text-xs ${isDarkMode ? 'border-slate-800 text-slate-300' : 'border-slate-200 text-slate-600'}`}>
                  <span>Need access to this workspace?</span>
                  <button 
                    type="button" 
                    onClick={() => setIsSignUpModalOpen(true)} 
                    className="font-bold text-[var(--accent-primary)] hover:underline cursor-pointer"
                  >
                    Request access
                  </button>
                </div>

                {/* Collapsible Dev Quick Login */}
                <div className={`mt-5 border-t pt-4 ${isDarkMode ? 'border-slate-800' : 'border-slate-200'}`}>
                  <button 
                    type="button" 
                    onClick={() => setIsDevLoginOpen(!isDevLoginOpen)} 
                    className={`flex min-h-10 w-full items-center justify-between rounded-xl px-2.5 py-1 text-left text-xs font-bold transition-all cursor-pointer ${
                      isDarkMode ? 'text-slate-300 hover:bg-slate-800/60 hover:text-white' : 'text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-amber-400" />
                      Developer role access
                    </span>
                    <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${isDevLoginOpen ? 'rotate-180' : ''}`} />
                  </button>
                  {isDevLoginOpen && (
                    <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                      {effectiveDevAccounts.map((account) => (
                        <button 
                          key={account.email} 
                          type="button" 
                          onClick={() => handleDevQuickLogin(account.email, account.password)} 
                          disabled={isLoading} 
                          className={`group flex min-h-14 items-center justify-between rounded-xl border p-3 text-left transition-all cursor-pointer ${
                            isDarkMode 
                              ? 'border-slate-800/90 bg-[#0d1017] hover:border-[var(--accent-primary)] hover:bg-[#12161f]' 
                              : 'border-slate-200 bg-slate-50 hover:border-[var(--accent-primary)] hover:bg-white shadow-xs'
                          }`}
                        >
                          <span className="min-w-0 pr-2">
                            <span className={`block truncate text-xs font-bold ${isDarkMode ? 'text-slate-100 group-hover:text-white' : 'text-slate-800'}`}>
                              {account.label}
                            </span>
                            <span className={`mt-1 block truncate text-[10px] font-mono uppercase tracking-[0.08em] ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                              {account.role}
                            </span>
                          </span>
                          <ChevronRight className="h-4 w-4 shrink-0 text-[var(--accent-primary)] transition-transform group-hover:translate-x-0.5" />
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </section>
          </div>
        </main>

        <footer className={`flex flex-col gap-2 border-t pt-4 text-[10px] font-medium uppercase tracking-[0.1em] sm:flex-row sm:items-center sm:justify-between ${isDarkMode ? 'border-slate-800/80 text-slate-400' : 'border-slate-300/80 text-slate-500'}`}>
          <span>SketchItUp - OwnerOS - Dev Build 1.0 - GuruomOS</span>
          <span className="flex items-center gap-1.5">
            <CircleCheck className="h-3.5 w-3.5 text-emerald-400" />
            Encrypted session and role-based access
          </span>
        </footer>
      </div>

      {/* Forgot Password Dialog */}
      {isForgotOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-md animate-in fade-in duration-150">
          <div className={`w-full max-w-md rounded-2xl border p-6 shadow-2xl sm:p-8 ${isDarkMode ? 'border-slate-800 bg-[#12161f] text-white' : 'border-slate-200 bg-white text-slate-950'}`}>
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--accent-primary)] text-white shadow-md">
                  <Mail className="h-5 w-5" />
                </div>
                <h2 className="mt-4 text-xl font-black">Reset password</h2>
              </div>
              <button 
                type="button" 
                onClick={() => setIsForgotOpen(false)} 
                className={`flex h-9 w-9 items-center justify-center rounded-lg border transition-colors cursor-pointer ${isDarkMode ? 'border-slate-800 text-slate-400 hover:bg-slate-800 hover:text-white' : 'border-slate-200 text-slate-500 hover:bg-slate-100 hover:text-slate-900'}`} 
                aria-label="Close reset password dialog"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <p className={`mt-3 text-sm leading-6 ${isDarkMode ? 'text-slate-300' : 'text-slate-600'}`}>
              Enter your registered work email and we will send password reset instructions.
            </p>
            <form onSubmit={handleSendResetPassword} className="mt-6 space-y-5">
              <div>
                <label className={`mb-2 block text-xs font-bold uppercase tracking-[0.08em] ${isDarkMode ? 'text-slate-200' : 'text-slate-700'}`}>
                  Work email
                </label>
                <input 
                  type="email" 
                  required 
                  value={forgotEmail} 
                  onChange={(e) => setForgotEmail(e.target.value)} 
                  placeholder="name@company.com" 
                  className={`h-12 w-full rounded-xl border px-4 text-sm font-medium outline-none transition-all focus:border-[var(--accent-primary)] focus:ring-2 focus:ring-[var(--accent-ring)] ${
                    isDarkMode 
                      ? 'border-slate-700/80 bg-[#0d1017] text-white placeholder:text-slate-500 focus:bg-[#0f131a]' 
                      : 'border-slate-300 bg-white text-slate-950 placeholder:text-slate-400'
                  }`} 
                />
              </div>
              <div className="flex gap-3">
                <button 
                  type="button" 
                  onClick={() => setIsForgotOpen(false)} 
                  className={`h-11 flex-1 rounded-xl border text-sm font-bold transition-colors cursor-pointer ${
                    isDarkMode ? 'border-slate-700 text-slate-300 hover:bg-slate-800' : 'border-slate-300 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={isResetting} 
                  className="flex h-11 flex-1 items-center justify-center rounded-xl bg-[var(--accent-primary)] text-sm font-bold text-white shadow-md transition-all hover:brightness-110 disabled:opacity-60 cursor-pointer"
                >
                  {isResetting ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" /> : 'Send reset link'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Enterprise Account Access Dialog */}
      {isSignUpModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-md animate-in fade-in duration-150">
          <div className={`w-full max-w-md rounded-2xl border p-6 text-center shadow-2xl sm:p-8 ${isDarkMode ? 'border-slate-800 bg-[#12161f] text-white' : 'border-slate-200 bg-white text-slate-950'}`}>
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--accent-primary)] text-white shadow-md">
              <Building2 className="h-6 w-6" />
            </div>
            <h2 className="mt-4 text-xl font-black">Enterprise account access</h2>
            <p className={`mt-3 text-sm leading-6 ${isDarkMode ? 'text-slate-300' : 'text-slate-600'}`}>
              GuruOm OS accounts and role permissions are provisioned by your system administrator.
            </p>
            <div className={`mt-5 rounded-xl border p-4 text-left text-xs leading-5 ${isDarkMode ? 'border-slate-800 bg-[#0d1017] text-slate-300' : 'border-slate-200 bg-slate-50 text-slate-700'}`}>
              <strong className={isDarkMode ? 'text-white' : 'text-slate-900'}>Testing access:</strong> use a configured role from Developer role access on the sign-in panel.
            </div>
            <button 
              type="button" 
              onClick={() => setIsSignUpModalOpen(false)} 
              className="mt-6 h-11 w-full rounded-xl bg-[var(--accent-primary)] text-sm font-bold text-white shadow-md transition-all hover:brightness-110 cursor-pointer"
            >
              Understood
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default LoginPage;

