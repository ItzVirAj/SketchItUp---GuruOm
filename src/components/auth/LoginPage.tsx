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
  ChevronDown
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

export const LoginPage: React.FC<LoginPageProps> = ({ onLoginSuccess }) => {
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
  const [isDevLoginOpen, setIsDevLoginOpen] = useState(true);
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

  // Combine static dev accounts with any dynamic demo users from database
  const effectiveDevAccounts = DEV_ACCOUNTS.map(acc => {
    const matched = demoUsers.find(u => u.email?.toLowerCase() === acc.email.toLowerCase());
    return {
      ...acc,
      name: matched?.name || acc.name,
      role: matched?.role || acc.role,
    };
  });

  return (
    <div className="min-h-screen w-screen bg-[#F0F3FA] flex items-center justify-center p-3 sm:p-6 lg:p-10 select-none font-sans">
      {/* Split-screen Card Shell - Expanded Width */}
      <div className="w-full max-w-6xl bg-white rounded-3xl sm:rounded-[36px] shadow-2xl border border-[#E0E7F5] overflow-hidden grid grid-cols-1 lg:grid-cols-12 min-h-[640px]">
        
        {/* ========================================================================= */}
        {/* LEFT PANEL: Manufacturing-Themed Hero Brand Visual (#5B75F8 -> #384FD9)  */}
        {/* ========================================================================= */}
        <div className="lg:col-span-5 bg-gradient-to-br from-[#5B75F8] via-[#4860EB] to-[#2B3FB8] p-6 sm:p-10 text-white flex flex-col justify-between relative overflow-hidden pointer-events-none select-none">
          {/* Subtle Background Pattern & Glow */}
          <div className="absolute -right-16 -bottom-16 w-64 h-64 rounded-full bg-white/10 blur-2xl pointer-events-none"></div>
          <div className="absolute -left-16 -top-16 w-56 h-56 rounded-full bg-indigo-400/20 blur-2xl pointer-events-none"></div>

          {/* Top Brand Header */}
          <div className="relative z-10">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-[#0F172A] flex items-center justify-center text-[#7B92FF] shadow-md shadow-[#5B75F8]/30">
                <Factory className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-2xl font-black tracking-tight leading-none text-white flex items-center gap-1.5">
                  Owner<span className="text-[#E0E7FF]">OS</span>
                  <span className="text-[10px] uppercase font-extrabold tracking-wider px-2 py-0.5 rounded-full bg-white/20 text-white border border-white/30 font-mono">
                    Enterprise
                  </span>
                </h1>
                <p className="text-xs text-white/80 font-medium mt-0.5">Manufacturing & Shop Floor ERP</p>
              </div>
            </div>

            <div className="mt-8 sm:mt-12 space-y-3">
              <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight leading-tight text-white">
                Intelligent Precision Manufacturing, Shop Floor & ERP OS.
              </h2>
              <p className="text-xs sm:text-sm text-white/85 leading-relaxed">
                Unified operational command center for CNC machining, route travelers, FEFO inventory, traceability & dispatch.
              </p>
            </div>
          </div>

          {/* Center Manufacturing Motifs Graphic (Hover effect removed) */}
          <div className="my-6 relative z-10 py-4 border-y border-white/20 grid grid-cols-3 gap-2 text-center text-white/90 font-mono">
            <div className="flex flex-col items-center gap-1 p-2 bg-white/10 rounded-2xl backdrop-blur-xs">
              <Route className="w-5 h-5 text-[#FCD34D]" />
              <span className="text-[11px] font-bold">Route Cards</span>
            </div>

            <div className="flex flex-col items-center gap-1 p-2 bg-white/10 rounded-2xl backdrop-blur-xs">
              <Boxes className="w-5 h-5 text-white" />
              <span className="text-[11px] font-bold">Heat Trace</span>
            </div>

            <div className="flex flex-col items-center gap-1 p-2 bg-white/10 rounded-2xl backdrop-blur-xs">
              <Cpu className="w-5 h-5 text-[#93C5FD]" />
              <span className="text-[11px] font-bold">Shop IoT</span>
            </div>
          </div>

          {/* Bottom Security / Trust Badge */}
          <div className="relative z-10 flex items-center justify-between text-xs text-white/80">
            <div className="flex items-center gap-2 font-mono">
              <ShieldCheck className="w-4 h-4 text-white" />
              <span>Role-Based Access Control</span>
            </div>
            <span className="font-mono text-[10px] text-white/70">v2.6 Production</span>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* RIGHT PANEL: Form & Dev Quick Login                                       */}
        {/* ========================================================================= */}
        <div className="lg:col-span-7 bg-[#F8FAFC] p-6 sm:p-10 lg:p-12 flex flex-col justify-between overflow-y-auto">
          <div>
            {/* Top Brand Heading (Dedicated Division) */}
            <div className="mb-7 pb-4 border-b border-[#E2E8F0]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-[#EEF2FF] text-[#5B75F8] border border-[#C7D2FE] flex items-center justify-center font-black shadow-xs">
                  <Factory className="w-5 h-5" />
                </div>
                <div>
                  <h1 className="text-2xl sm:text-3xl font-black text-[#0F172A] tracking-tight flex items-center gap-1.5">
                    GuruOm <span className="text-[#5B75F8]">OS</span>
                  </h1>
                  <p className="text-xs text-[#64748B] font-medium mt-0.5">
                    Sign in to your manufacturing terminal & shop floor command center.
                  </p>
                </div>
              </div>
            </div>

            {/* Error Notification */}
            {localError && (
              <div
                id="login-error-alert"
                className="mb-4 p-3.5 rounded-2xl flex items-start gap-2.5 text-xs bg-rose-50 border border-rose-200 text-rose-800 animate-in fade-in slide-in-from-top-1 duration-200 font-sans"
              >
                <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0 text-rose-600" />
                <div className="flex-1 font-medium leading-relaxed">{localError}</div>
                <button
                  type="button"
                  onClick={() => setLocalError(null)}
                  className="text-rose-400 hover:text-rose-700 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* Success Notification */}
            {successMsg && (
              <div className="mb-4 p-3.5 rounded-2xl flex items-start gap-2.5 text-xs bg-emerald-50 border border-emerald-200 text-emerald-800 animate-in fade-in slide-in-from-top-1 duration-200">
                <CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0 text-emerald-600" />
                <div className="flex-1 font-medium leading-relaxed">{successMsg}</div>
                <button
                  type="button"
                  onClick={() => setSuccessMsg(null)}
                  className="text-emerald-400 hover:text-emerald-700 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* Login Form */}
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-[#0F172A] mb-1.5 font-mono uppercase text-[11px]">
                  Work Email Address
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#94A3B8]">
                    <Mail className="w-4 h-4" />
                  </div>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="e.g. owner@guruom.in"
                    className="w-full pl-10 pr-3.5 py-2.5 bg-white border border-[#CBD5E1] rounded-2xl text-xs font-semibold text-[#0F172A] placeholder-[#94A3B8] focus:border-[#5B75F8] focus:ring-2 focus:ring-[#5B75F8]/20 focus:outline-none transition-all shadow-2xs font-mono"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-bold text-[#0F172A] font-mono uppercase text-[11px]">
                    Password
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setForgotEmail(email);
                      setIsForgotOpen(true);
                    }}
                    className="text-[11px] font-bold text-[#5B75F8] hover:text-[#4355E8] hover:underline cursor-pointer"
                  >
                    Forgot password?
                  </button>
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#94A3B8]">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full pl-10 pr-10 py-2.5 bg-white border border-[#CBD5E1] rounded-2xl text-xs font-semibold text-[#0F172A] placeholder-[#94A3B8] focus:border-[#5B75F8] focus:ring-2 focus:ring-[#5B75F8]/20 focus:outline-none transition-all shadow-2xs font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-[#94A3B8] hover:text-[#0F172A] cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 px-4 bg-[#5B75F8] hover:bg-[#4860EB] active:scale-[0.99] text-white text-xs sm:text-sm font-bold rounded-2xl shadow-md shadow-[#5B75F8]/25 transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer font-mono"
              >
                {isLoading ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                ) : (
                  <>
                    <span>Log In to Terminal</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>

            <div className="mt-4 text-center">
              <p className="text-[11px] text-[#64748B]">
                New employee? Accounts must be provisioned by a System Administrator.{' '}
                <button
                  type="button"
                  onClick={() => setIsSignUpModalOpen(true)}
                  className="font-bold text-[#5B75F8] hover:underline cursor-pointer"
                >
                  Request Access
                </button>
              </p>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* DEV DIRECT LOGIN - Collapsible Dropdown Accordion                          */}
          {/* ========================================================================= */}
          <div className="mt-6 pt-4 border-t border-[#E2E8F0]">
            <button
              type="button"
              onClick={() => setIsDevLoginOpen(!isDevLoginOpen)}
              className="w-full flex items-center justify-between py-1.5 text-left cursor-pointer group select-none rounded-xl hover:bg-slate-100/60 transition-colors px-1"
            >
              <div className="flex items-center gap-2 text-xs font-bold text-[#0F172A]">
                <Sparkles className="w-3.5 h-3.5 text-[#F59E0B]" />
                <span>Dev Quick Login (Direct Role Access)</span>
              </div>
              <div className="flex items-center gap-1.5 text-slate-400 group-hover:text-[#5B75F8] transition-colors">
                <span className="text-[10px] font-mono font-medium">
                  {isDevLoginOpen ? 'Hide' : 'Show Roles'}
                </span>
                <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${isDevLoginOpen ? 'rotate-180' : ''}`} />
              </div>
            </button>

            {isDevLoginOpen && (
              <div className="mt-2.5 space-y-2 animate-in fade-in slide-in-from-top-1 duration-150">
                <p className="text-[10px] text-[#64748B] font-sans">
                  Click any role below to authenticate directly via real JWT token with password <code className="font-bold text-[#0F172A] font-mono bg-slate-200 px-1 py-0.5 rounded">1234567890</code>:
                </p>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 font-sans">
                  {effectiveDevAccounts.map((account) => (
                    <button
                      key={account.email}
                      type="button"
                      onClick={() => handleDevQuickLogin(account.email, account.password)}
                      disabled={isLoading}
                      className="p-2 rounded-xl bg-white hover:bg-[#F1F5F9] border border-[#CBD5E1] hover:border-[#5B75F8] text-left transition-all group flex flex-col justify-between shadow-2xs cursor-pointer"
                    >
                      <div className="text-[11px] font-bold text-[#0F172A] group-hover:text-[#5B75F8] truncate">
                        {account.label}
                      </div>
                      <div className="text-[10px] text-[#64748B] truncate flex items-center justify-between mt-0.5 font-mono">
                        <span className="font-semibold text-[9px] uppercase">{account.role}</span>
                        <span className="text-[8px] px-1 py-0.2 rounded bg-[#EEF2FF] text-[#5B75F8] font-bold">
                          Login →
                        </span>
                      </div>
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm font-sans">
          <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl p-6 sm:p-8 border border-slate-200">
            <div className="flex items-center justify-between mb-4">
              <div className="w-10 h-10 rounded-2xl bg-[#EEF2FF] text-[#5B75F8] flex items-center justify-center font-bold">
                <Mail className="w-5 h-5" />
              </div>
              <button
                type="button"
                onClick={() => setIsForgotOpen(false)}
                className="p-1.5 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <h2 className="text-xl font-bold text-[#0F172A]">Reset Your Password</h2>
            <p className="text-xs text-[#64748B] mt-1.5 mb-5 leading-relaxed">
              Enter your registered workspace email address and we'll send you instructions to reset your password.
            </p>

            <form onSubmit={handleSendResetPassword} className="space-y-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-[#0F172A] font-mono text-[11px] uppercase">
                  Email Address
                </label>
                <input
                  type="email"
                  required
                  value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)}
                  placeholder="e.g. owner@guruom.in"
                  className="w-full h-[46px] rounded-2xl border border-slate-300 bg-white px-4 text-xs font-mono text-[#0F172A] placeholder:text-slate-400 focus:border-[#5B75F8] focus:ring-2 focus:ring-[#5B75F8]/20 outline-none"
                />
              </div>

              <div className="flex items-center gap-3 pt-2 font-mono">
                <button
                  type="button"
                  onClick={() => setIsForgotOpen(false)}
                  className="flex-1 h-[44px] rounded-2xl border border-slate-200 text-slate-700 text-xs font-bold hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isResetting}
                  className="flex-1 h-[44px] rounded-2xl bg-[#5B75F8] hover:bg-[#4860EB] text-white text-xs font-bold shadow-md shadow-[#5B75F8]/20 transition-all cursor-pointer flex items-center justify-center gap-1.5"
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

      {/* Sign Up / Enterprise Access Notice Modal */}
      {isSignUpModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm font-sans">
          <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl p-6 sm:p-8 border border-slate-200 text-center">
            <div className="w-12 h-12 rounded-2xl bg-[#EEF2FF] text-[#5B75F8] mx-auto flex items-center justify-center font-bold mb-4">
              <Building2 className="w-6 h-6" />
            </div>

            <h2 className="text-xl font-bold text-[#0F172A]">Enterprise Account Access</h2>
            <p className="text-xs text-[#64748B] mt-2 mb-6 leading-relaxed">
              GuruOm OS is an enterprise operating system. User accounts and security role permissions are provisioned by your system administrator.
            </p>

            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5 text-xs text-slate-600 mb-6 text-left">
              💡 <strong className="text-slate-800">Need immediate testing access?</strong> Use any of the pre-configured role accounts from the Dev Quick Login panel.
            </div>

            <div className="flex items-center gap-3 font-mono">
              <button
                type="button"
                onClick={() => setIsSignUpModalOpen(false)}
                className="w-full h-[44px] rounded-2xl bg-[#5B75F8] hover:bg-[#4860EB] text-white text-xs font-bold transition-colors cursor-pointer"
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
