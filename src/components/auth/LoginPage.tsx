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
  Moon
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
    <div className={`min-h-screen w-full flex flex-col items-center justify-center p-3 sm:p-6 lg:p-8 select-none font-sans transition-colors duration-300 relative ${
      isDarkMode ? 'bg-[#0E0F12] text-slate-100 dark' : 'bg-[#F1F4F9] text-slate-900'
    }`}>
      
      {/* ========================================================================= */}
      {/* TOP HEADER: Prominent, Centered, Bigger Brand Logo & Title with OwnerOS  */}
      {/* ========================================================================= */}
      <div className="w-full max-w-6xl flex flex-col sm:flex-row items-center justify-between gap-3.5 py-4 sm:py-6 px-2 mb-2 sm:mb-4">
        {/* Brand Center / Left Logo */}
        <div className="flex items-center gap-3.5 mx-auto sm:mx-0 text-center sm:text-left">
          <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-gradient-to-tr from-[var(--accent-gradient-from)] to-[var(--accent-gradient-to)] flex items-center justify-center text-white font-black text-xl sm:text-2xl shadow-md shrink-0">
            G
          </div>
          <div className="flex flex-col items-start leading-tight">
            <span className={`text-2xl sm:text-3xl font-black tracking-tight leading-none ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
              sketch<span className="text-[var(--accent-primary)]">ItUP</span>
            </span>
            <span className="text-xs sm:text-sm font-mono text-slate-400 font-bold uppercase tracking-widest mt-1">
              OwnerOS
            </span>
          </div>
        </div>

        {/* Theme Toggle Button */}
        {onToggleTheme && (
          <button
            type="button"
            onClick={onToggleTheme}
            className={`min-h-[44px] px-4 py-2 rounded-2xl border flex items-center gap-2 text-xs sm:text-sm font-bold shadow-2xs transition-all cursor-pointer ${
              isDarkMode 
                ? 'bg-slate-900/90 border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800' 
                : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
            }`}
            title="Toggle Light / Dark theme"
          >
            {isDarkMode ? (
              <>
                <Sun className="w-4 h-4 text-amber-400" />
                <span>Light Mode</span>
              </>
            ) : (
              <>
                <Moon className="w-4 h-4 text-indigo-600" />
                <span>Dark Mode</span>
              </>
            )}
          </button>
        )}
      </div>

      {/* Main Responsive Card Container */}
      <div className={`w-full max-w-6xl rounded-3xl sm:rounded-[32px] shadow-2xl border overflow-hidden grid grid-cols-1 lg:grid-cols-12 min-h-[580px] transition-colors ${
        isDarkMode 
          ? 'bg-[#16171B] border-slate-800 shadow-black/50' 
          : 'bg-white border-[#E2EAE5] shadow-[0_12px_40px_rgba(15,23,42,0.08)]'
      }`}>
        
        {/* ========================================================================= */}
        {/* DESKTOP-ONLY LEFT HERO PANEL (≥ 1024px)                                   */}
        {/* ========================================================================= */}
        <div className="hidden lg:flex lg:col-span-5 bg-gradient-to-br from-[#5B75F8] via-[#4860EB] to-[#2B3FB8] p-8 lg:p-10 text-white flex-col justify-between relative overflow-hidden pointer-events-none select-none">
          <div className="absolute -right-16 -bottom-16 w-64 h-64 rounded-full bg-white/10 blur-2xl pointer-events-none" />
          <div className="absolute -left-16 -top-16 w-56 h-56 rounded-full bg-indigo-400/20 blur-2xl pointer-events-none" />

          {/* Top Brand Info */}
          <div className="relative z-10 space-y-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-[#0F172A] flex items-center justify-center text-[#7B92FF] shadow-lg shadow-black/20">
                <Factory className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-2xl font-black tracking-tight leading-none text-white flex items-center gap-2">
                  Owner<span className="text-[#E0E7FF]">OS</span>
                  <span className="text-[9px] uppercase font-extrabold tracking-wider px-2 py-0.5 rounded-full bg-white/20 text-white border border-white/30 font-mono">
                    v2.6
                  </span>
                </h1>
                <p className="text-xs text-white/80 font-medium mt-1">Manufacturing & Shopfloor ERP</p>
              </div>
            </div>

            <div className="space-y-2.5">
              <h2 className="text-2xl lg:text-3xl font-extrabold tracking-tight leading-tight text-white">
                Intelligent Precision Manufacturing & Shop Floor OS.
              </h2>
              <p className="text-xs text-white/85 leading-relaxed">
                Unified operational command center for CNC machining, route travelers, FEFO inventory, traceability & dispatches.
              </p>
            </div>
          </div>

          {/* Manufacturing Motifs Grid */}
          <div className="my-6 relative z-10 py-4 border-y border-white/20 grid grid-cols-3 gap-2.5 text-center text-white font-mono">
            <div className="flex flex-col items-center gap-1.5 p-2.5 bg-white/10 rounded-2xl backdrop-blur-xs">
              <Route className="w-5 h-5 text-[#FCD34D]" />
              <span className="text-[11px] font-bold">Route Cards</span>
            </div>

            <div className="flex flex-col items-center gap-1.5 p-2.5 bg-white/10 rounded-2xl backdrop-blur-xs">
              <Boxes className="w-5 h-5 text-white" />
              <span className="text-[11px] font-bold">Heat Trace</span>
            </div>

            <div className="flex flex-col items-center gap-1.5 p-2.5 bg-white/10 rounded-2xl backdrop-blur-xs">
              <Cpu className="w-5 h-5 text-[#93C5FD]" />
              <span className="text-[11px] font-bold">Shop IoT</span>
            </div>
          </div>

          {/* Security / Trust Footer */}
          <div className="relative z-10 flex items-center justify-between text-xs text-white/80 font-mono">
            <div className="flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-300" />
              <span>Role-Based Access (RBAC)</span>
            </div>
            <span className="text-[10px] text-white/70">Enterprise Ready</span>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* RIGHT / MOBILE UNIFIED LOGIN PANEL                                        */}
        {/* ========================================================================= */}
        <div className={`col-span-1 lg:col-span-7 p-5 sm:p-8 lg:p-10 flex flex-col justify-between overflow-y-auto ${
          isDarkMode ? 'bg-[#16171B] text-slate-100' : 'bg-[#FAFCFF] text-slate-900'
        }`}>
          <div>
            {/* Header Banner */}
            <div className={`mb-5 sm:mb-6 pb-4 border-b ${isDarkMode ? 'border-slate-800' : 'border-slate-200'}`}>
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 sm:w-11 sm:h-11 rounded-2xl flex items-center justify-center font-black shadow-2xs shrink-0 ${
                    isDarkMode 
                      ? 'bg-[#5B75F8]/20 text-[#7B92FF] border border-[#5B75F8]/30' 
                      : 'bg-[#5B75F8]/10 text-[#5B75F8] border border-[#5B75F8]/20'
                  }`}>
                    <Factory className="w-5 h-5 sm:w-6 sm:h-6" />
                  </div>
                  <div>
                    <h2 className={`text-xl sm:text-2xl font-black tracking-tight flex items-center gap-2 leading-tight ${
                      isDarkMode ? 'text-white' : 'text-slate-900'
                    }`}>
                      <span>GuruOm OS</span>
                      <span className={`text-xs sm:text-sm font-bold font-mono px-2.5 py-0.5 rounded-lg ${
                        isDarkMode 
                          ? 'bg-[#5B75F8]/20 text-[#7B92FF] border border-[#5B75F8]/30' 
                          : 'bg-[#5B75F8]/10 text-[#5B75F8] border border-[#5B75F8]/20'
                      }`}>
                        Terminal Login
                      </span>
                    </h2>
                    <p className={`text-xs font-medium mt-0.5 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                      Sign in to your manufacturing terminal & shop floor command center
                    </p>
                  </div>
                </div>

                <div className="hidden sm:flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 text-[10px] font-mono font-bold uppercase tracking-wider">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span>Terminal Online</span>
                </div>
              </div>
            </div>

            {/* Error Notification */}
            {localError && (
              <div
                id="login-error-alert"
                className={`mb-4 p-3.5 rounded-2xl flex items-start gap-2.5 text-xs animate-fade-in font-sans ${
                  isDarkMode
                    ? 'bg-rose-950/40 border border-rose-800/60 text-rose-300'
                    : 'bg-rose-50 border border-rose-200 text-rose-800'
                }`}
              >
                <AlertCircle className={`w-4 h-4 mt-0.5 shrink-0 ${isDarkMode ? 'text-rose-400' : 'text-rose-600'}`} />
                <div className="flex-1 font-medium leading-relaxed">{localError}</div>
                <button
                  type="button"
                  onClick={() => setLocalError(null)}
                  className="text-rose-400 hover:text-rose-300 dark:hover:text-rose-200 cursor-pointer min-h-[32px] min-w-[32px] flex items-center justify-center"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* Success Notification */}
            {successMsg && (
              <div className={`mb-4 p-3.5 rounded-2xl flex items-start gap-2.5 text-xs animate-fade-in ${
                isDarkMode
                  ? 'bg-emerald-950/40 border border-emerald-800/60 text-emerald-300'
                  : 'bg-emerald-50 border border-emerald-200 text-emerald-800'
              }`}>
                <CheckCircle2 className={`w-4 h-4 mt-0.5 shrink-0 ${isDarkMode ? 'text-emerald-400' : 'text-emerald-600'}`} />
                <div className="flex-1 font-medium leading-relaxed">{successMsg}</div>
                <button
                  type="button"
                  onClick={() => setSuccessMsg(null)}
                  className="text-emerald-400 hover:text-emerald-300 dark:hover:text-emerald-200 cursor-pointer min-h-[32px] min-w-[32px] flex items-center justify-center"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* Login Form */}
            <form onSubmit={handleLogin} className="space-y-3.5 sm:space-y-4">
              <div>
                <label className={`block text-xs font-bold mb-1.5 font-mono uppercase text-[11px] ${
                  isDarkMode ? 'text-slate-200' : 'text-slate-800'
                }`}>
                  Work Email Address
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Mail className="w-4 h-4" />
                  </div>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="e.g. owner@guruom.in"
                    className={`w-full h-11 sm:h-12 pl-10 pr-3.5 rounded-2xl text-xs font-semibold font-mono transition-all shadow-2xs outline-none focus:ring-2 focus:ring-[var(--accent-ring)] ${
                      isDarkMode
                        ? 'bg-slate-900 border border-slate-700 text-white placeholder-slate-500 focus:border-[var(--accent-primary)]'
                        : 'bg-white border border-slate-300 text-slate-900 placeholder-slate-400 focus:border-[var(--accent-primary)]'
                    }`}
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className={`block text-xs font-bold font-mono uppercase text-[11px] ${
                    isDarkMode ? 'text-slate-200' : 'text-slate-800'
                  }`}>
                    Password
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setForgotEmail(email);
                      setIsForgotOpen(true);
                    }}
                    className="text-[11px] font-bold text-[var(--accent-primary)] hover:underline cursor-pointer min-h-[32px] flex items-center"
                  >
                    Forgot password?
                  </button>
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className={`w-full h-11 sm:h-12 pl-10 pr-10 rounded-2xl text-xs font-semibold font-mono transition-all shadow-2xs outline-none focus:ring-2 focus:ring-[var(--accent-ring)] ${
                      isDarkMode
                        ? 'bg-slate-900 border border-slate-700 text-white placeholder-slate-500 focus:border-[var(--accent-primary)]'
                        : 'bg-white border border-slate-300 text-slate-900 placeholder-slate-400 focus:border-[var(--accent-primary)]'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className={`absolute inset-y-0 right-0 pr-3 min-w-[40px] flex items-center justify-center cursor-pointer transition-colors ${
                      isDarkMode ? 'text-slate-400 hover:text-white' : 'text-slate-400 hover:text-slate-700'
                    }`}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full h-12 bg-gradient-to-r from-[var(--accent-gradient-from)] to-[var(--accent-gradient-to)] hover:opacity-95 active:scale-[0.99] text-white text-xs sm:text-sm font-bold rounded-2xl shadow-md shadow-[var(--accent-shadow)] transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer font-mono min-h-[48px]"
              >
                {isLoading ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <span>Log In to Terminal</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>

            <div className="mt-3.5 text-center">
              <p className={`text-[11px] ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                New employee?{' '}
                <button
                  type="button"
                  onClick={() => setIsSignUpModalOpen(true)}
                  className="font-bold text-[var(--accent-primary)] hover:underline cursor-pointer"
                >
                  Request Account Access
                </button>
              </p>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* DEV QUICK LOGIN - COLLAPSED BY DEFAULT (EXPANDED ON USER TAP)             */}
          {/* ========================================================================= */}
          <div className={`mt-5 pt-4 border-t ${isDarkMode ? 'border-slate-800' : 'border-slate-200'}`}>
            <button
              type="button"
              onClick={() => setIsDevLoginOpen(!isDevLoginOpen)}
              className={`w-full min-h-[44px] flex items-center justify-between py-1 text-left cursor-pointer group select-none rounded-xl transition-colors px-1 ${
                isDarkMode ? 'hover:bg-slate-800/50' : 'hover:bg-slate-100'
              }`}
            >
              <div className={`flex items-center gap-2 text-xs font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                <Sparkles className="w-4 h-4 text-amber-500" />
                <span>Dev Quick Role Login</span>
              </div>
              <div className="flex items-center gap-1.5 text-slate-400 group-hover:text-[var(--accent-primary)] transition-colors">
                <span className="text-[10px] font-mono font-medium">
                  {isDevLoginOpen ? 'Hide' : 'Show Roles'}
                </span>
                <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${isDevLoginOpen ? 'rotate-180' : ''}`} />
              </div>
            </button>

            {isDevLoginOpen && (
              <div className="mt-2.5 space-y-2 animate-fade-in">
                <p className={`text-[10px] font-sans ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                  Tap any role below to authenticate directly via JWT token:
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 font-sans">
                  {effectiveDevAccounts.map((account) => (
                    <button
                      key={account.email}
                      type="button"
                      onClick={() => handleDevQuickLogin(account.email, account.password)}
                      disabled={isLoading}
                      className={`min-h-[48px] p-2.5 rounded-xl text-left transition-all group flex items-center justify-between shadow-2xs cursor-pointer active:scale-[0.99] border ${
                        isDarkMode
                          ? 'bg-slate-900 border-slate-700/80 hover:bg-slate-800 hover:border-[var(--accent-primary)]'
                          : 'bg-white border-slate-200 hover:bg-slate-50 hover:border-[var(--accent-primary)]'
                      }`}
                    >
                      <div className="min-w-0 flex-1 pr-2">
                        <div className={`text-xs font-bold group-hover:text-[var(--accent-primary)] truncate ${
                          isDarkMode ? 'text-white' : 'text-slate-900'
                        }`}>
                          {account.label}
                        </div>
                        <div className={`text-[10px] truncate font-mono mt-0.5 ${
                          isDarkMode ? 'text-slate-400' : 'text-slate-500'
                        }`}>
                          {account.role}
                        </div>
                      </div>
                      <span className={`text-[9px] px-2 py-1 rounded-lg font-bold shrink-0 ${
                        isDarkMode
                          ? 'bg-[#5B75F8]/20 text-[#7B92FF] border border-[#5B75F8]/30'
                          : 'bg-[#5B75F8]/10 text-[#5B75F8] border border-[#5B75F8]/20'
                      }`}>
                        Login →
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Forgot Password Modal */}
      {isForgotOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs font-sans">
          <div className={`relative w-full max-w-md rounded-3xl shadow-2xl p-6 sm:p-8 border ${
            isDarkMode ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
          }`}>
            <div className="flex items-center justify-between mb-4">
              <div className={`w-10 h-10 rounded-2xl flex items-center justify-center font-bold ${
                isDarkMode ? 'bg-[#5B75F8]/20 text-[#7B92FF]' : 'bg-[#5B75F8]/10 text-[#5B75F8]'
              }`}>
                <Mail className="w-5 h-5" />
              </div>
              <button
                type="button"
                onClick={() => setIsForgotOpen(false)}
                className={`min-h-[44px] min-w-[44px] flex items-center justify-center cursor-pointer ${
                  isDarkMode ? 'text-slate-400 hover:text-white' : 'text-slate-400 hover:text-slate-600'
                }`}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <h2 className={`text-xl font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>Reset Your Password</h2>
            <p className={`text-xs mt-1.5 mb-5 leading-relaxed ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
              Enter your registered workspace email address and we'll send you instructions to reset your password.
            </p>

            <form onSubmit={handleSendResetPassword} className="space-y-4">
              <div className="flex flex-col gap-1.5">
                <label className={`text-xs font-bold font-mono text-[11px] uppercase ${
                  isDarkMode ? 'text-slate-200' : 'text-slate-800'
                }`}>
                  Email Address
                </label>
                <input
                  type="email"
                  required
                  value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)}
                  placeholder="e.g. owner@guruom.in"
                  className={`w-full h-12 rounded-2xl px-4 text-xs font-mono transition-all outline-none focus:ring-2 focus:ring-[var(--accent-ring)] ${
                    isDarkMode
                      ? 'bg-slate-950 border border-slate-700 text-white placeholder-slate-500 focus:border-[var(--accent-primary)]'
                      : 'bg-white border border-slate-300 text-slate-900 placeholder-slate-400 focus:border-[var(--accent-primary)]'
                  }`}
                />
              </div>

              <div className="flex items-center gap-3 pt-2 font-mono">
                <button
                  type="button"
                  onClick={() => setIsForgotOpen(false)}
                  className={`flex-1 min-h-[44px] rounded-2xl border text-xs font-bold transition-colors cursor-pointer ${
                    isDarkMode
                      ? 'border-slate-700 text-slate-300 hover:bg-slate-800'
                      : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isResetting}
                  className="flex-1 min-h-[44px] rounded-2xl bg-[var(--accent-primary)] hover:opacity-90 text-white text-xs font-bold shadow-md transition-all cursor-pointer flex items-center justify-center gap-1.5"
                >
                  {isResetting ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <span>Send Link</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Enterprise Access Notice Modal */}
      {isSignUpModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs font-sans">
          <div className={`relative w-full max-w-md rounded-3xl shadow-2xl p-6 sm:p-8 border text-center ${
            isDarkMode ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
          }`}>
            <div className={`w-12 h-12 rounded-2xl mx-auto flex items-center justify-center font-bold mb-4 ${
              isDarkMode ? 'bg-[#5B75F8]/20 text-[#7B92FF]' : 'bg-[#5B75F8]/10 text-[#5B75F8]'
            }`}>
              <Building2 className="w-6 h-6" />
            </div>

            <h2 className={`text-xl font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>Enterprise Account Access</h2>
            <p className={`text-xs mt-2 mb-5 leading-relaxed ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
              GuruOm OS is an enterprise operating system. User accounts and security role permissions are provisioned by your system administrator.
            </p>

            <div className={`border rounded-2xl p-3.5 text-xs mb-6 text-left ${
              isDarkMode ? 'bg-slate-950 border-slate-800 text-slate-300' : 'bg-slate-50 border-slate-200 text-slate-600'
            }`}>
              💡 <strong className={isDarkMode ? 'text-slate-100' : 'text-slate-800'}>Need immediate testing access?</strong> Use any of the pre-configured role accounts from the Dev Quick Login panel.
            </div>

            <button
              type="button"
              onClick={() => setIsSignUpModalOpen(false)}
              className="w-full min-h-[44px] rounded-2xl bg-[var(--accent-primary)] hover:opacity-90 text-white text-xs font-bold transition-colors cursor-pointer"
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
