import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Mail, 
  Lock, 
  Eye, 
  EyeOff, 
  ArrowRight, 
  AlertCircle, 
  CheckCircle2, 
  Key, 
  Shield, 
  Sparkles, 
  X,
  Building2
} from 'lucide-react';
import { initialUsers } from '../../data/consoleData';
import { getRoleColor } from '../../utils/permissions';
import { useAuth } from '../../context/AuthContext';

interface LoginPageProps {
  onLoginSuccess?: (email: string) => void;
  isDarkMode?: boolean;
  onToggleTheme?: () => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({
  onLoginSuccess
}) => {
  const { signIn, resetPassword } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isDemoModalOpen, setIsDemoModalOpen] = useState(false);
  const [isForgotPasswordOpen, setIsForgotPasswordOpen] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [isResetting, setIsResetting] = useState(false);
  const [isSignUpModalOpen, setIsSignUpModalOpen] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');

    const trimmedEmail = email.trim().toLowerCase();
    const trimmedPassword = password.trim();

    if (!trimmedEmail || !trimmedPassword) {
      setError('Please enter both Email and Password.');
      return;
    }

    setIsLoading(true);
    const { error: authError } = await signIn(trimmedEmail, trimmedPassword);
    setIsLoading(false);

    if (authError) {
      setError(authError.message || 'Failed to sign in. Please verify your credentials.');
    } else if (onLoginSuccess) {
      onLoginSuccess(trimmedEmail);
    }
  };

  const handleAutoFillAndLogin = async (userEmail: string) => {
    setEmail(userEmail);
    setPassword('1234567890');
    setIsDemoModalOpen(false);
    setError('');
    setSuccessMsg('');
    setIsLoading(true);
    const { error: authError } = await signIn(userEmail, '1234567890');
    setIsLoading(false);

    if (authError) {
      setError(authError.message || 'Failed to log in via demo account.');
    } else if (onLoginSuccess) {
      onLoginSuccess(userEmail);
    }
  };

  const handleSendResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    const targetEmail = (forgotEmail || email).trim().toLowerCase();
    if (!targetEmail) {
      setError('Please enter your email address to receive reset instructions.');
      return;
    }
    setIsResetting(true);
    const { error: resetError } = await resetPassword(targetEmail);
    setIsResetting(false);

    if (resetError) {
      setError(resetError.message);
    } else {
      setSuccessMsg(`Password reset link sent to ${targetEmail}. Please check your inbox.`);
      setIsForgotPasswordOpen(false);
    }
  };

  return (
    <div 
      className="min-h-screen w-full relative flex flex-col items-center justify-center overflow-hidden p-4 sm:p-6 md:p-8 font-sans selection:bg-[#6C63FF]/20 selection:text-[#5B4FE8]"
      style={{
        background: 'linear-gradient(180deg, #ffffff 0.000%, #6C63FF 100.000%)'
      }}
    >
      
      {/* Decorative Subtle Glow Accents */}
      <div 
        aria-hidden="true" 
        className="pointer-events-none absolute -top-28 -left-28 w-[520px] h-[520px] rounded-full bg-white/70 blur-[100px] opacity-80"
      />
      <div 
        aria-hidden="true" 
        className="pointer-events-none absolute top-1/3 -right-20 w-[480px] h-[480px] rounded-full bg-[#6C63FF]/30 blur-[120px] opacity-60" 
      />
      <div 
        aria-hidden="true" 
        className="pointer-events-none absolute -bottom-28 -left-20 w-[580px] h-[580px] rounded-full bg-[#5B4FE8]/35 blur-[130px] opacity-70" 
      />
      <div 
        aria-hidden="true" 
        className="pointer-events-none absolute top-12 left-1/3 w-[360px] h-[360px] rounded-full bg-white/50 blur-[90px] opacity-80" 
      />

      {/* Main SaaS Card Container */}
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-[440px] bg-[#FFFFFF] rounded-[24px] shadow-[0_20px_60px_-15px_rgba(108,99,255,0.25),0_10px_30px_-10px_rgba(0,0,0,0.06)] p-8 sm:p-10 relative z-10 border border-white/80"
      >
        {/* Logo Section */}
        <div className="w-[44px] h-[44px] rounded-[12px] bg-gradient-to-br from-[#6C63FF] to-[#4338CA] flex items-center justify-center text-white shadow-md shadow-[#6C63FF]/30 mb-6">
          <span className="font-extrabold text-xl tracking-tight leading-none select-none">G</span>
        </div>

        {/* Heading Section */}
        <div className="mb-7">
          <h1 className="text-[28px] font-bold text-[#1A1B2E] leading-tight tracking-tight">
            Sign In To Your Account.
          </h1>
          <p className="text-[15px] text-[#6B7280] mt-2 font-normal leading-relaxed">
            Welcome back! Please enter your details.
          </p>
        </div>

        {/* Alerts */}
        <AnimatePresence mode="wait">
          {error && (
            <motion.div
              initial={{ opacity: 0, height: 0, y: -10 }}
              animate={{ opacity: 1, height: 'auto', y: 0 }}
              exit={{ opacity: 0, height: 0, y: -10 }}
              className="mb-5 p-3.5 rounded-[14px] bg-rose-50 border border-rose-200/80 text-rose-700 text-xs font-medium flex items-start gap-2.5"
            >
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-500 mt-0.5" />
              <div className="flex-1 leading-snug">{error}</div>
              <button 
                type="button" 
                onClick={() => setError('')}
                className="text-rose-400 hover:text-rose-600 transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </motion.div>
          )}

          {successMsg && (
            <motion.div
              initial={{ opacity: 0, height: 0, y: -10 }}
              animate={{ opacity: 1, height: 'auto', y: 0 }}
              exit={{ opacity: 0, height: 0, y: -10 }}
              className="mb-5 p-3.5 rounded-[14px] bg-emerald-50 border border-emerald-200/80 text-emerald-700 text-xs font-medium flex items-start gap-2.5"
            >
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-500 mt-0.5" />
              <div className="flex-1 leading-snug">{successMsg}</div>
              <button 
                type="button" 
                onClick={() => setSuccessMsg('')}
                className="text-emerald-400 hover:text-emerald-600 transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Form Fields */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          {/* Email Field */}
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="email"
              className="text-[13px] font-medium text-[#1A1B2E]"
            >
              Email address
            </label>
            <div className="relative flex items-center">
              <Mail className="w-[18px] h-[18px] absolute left-4 text-[#9CA3AF] pointer-events-none transition-colors" />
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
                className="w-full h-[48px] rounded-[14px] border border-[#E5E7EB] bg-[#FFFFFF] pl-11 pr-4 text-[14px] text-[#1A1B2E] placeholder:text-[#9CA3AF] transition-all duration-200 focus:border-[#6C63FF] focus:ring-4 focus:ring-[#6C63FF]/15 outline-none shadow-xs"
              />
            </div>
          </div>

          {/* Password Field */}
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="password"
              className="text-[13px] font-medium text-[#1A1B2E]"
            >
              Password
            </label>
            <div className="relative flex items-center">
              <Lock className="w-[18px] h-[18px] absolute left-4 text-[#9CA3AF] pointer-events-none transition-colors" />
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                className="w-full h-[48px] rounded-[14px] border border-[#E5E7EB] bg-[#FFFFFF] pl-11 pr-11 text-[14px] text-[#1A1B2E] placeholder:text-[#9CA3AF] transition-all duration-200 focus:border-[#6C63FF] focus:ring-4 focus:ring-[#6C63FF]/15 outline-none shadow-xs"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 text-[#9CA3AF] hover:text-[#6B7280] transition-colors p-1 cursor-pointer"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? (
                  <EyeOff className="w-[18px] h-[18px]" />
                ) : (
                  <Eye className="w-[18px] h-[18px]" />
                )}
              </button>
            </div>
          </div>

          {/* Options Row */}
          <div className="flex items-center justify-between pt-0.5">
            <label className="flex items-center gap-2 cursor-pointer select-none group">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="w-4 h-4 rounded border-[#D1D5DB] text-[#6C63FF] accent-[#6C63FF] focus:ring-[#6C63FF]/20 cursor-pointer"
              />
              <span className="text-[13px] font-medium text-[#6B7280] group-hover:text-[#1A1B2E] transition-colors">
                Remember For 30 Days
              </span>
            </label>

            <button
              type="button"
              onClick={() => {
                setForgotEmail(email);
                setIsForgotPasswordOpen(true);
              }}
              className="text-[13px] font-medium text-[#5B4FE8] hover:text-[#4338CA] hover:underline transition-colors cursor-pointer"
            >
              Forgot Password
            </button>
          </div>

          {/* Primary Button */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={isLoading}
              className="w-full h-[50px] rounded-full bg-gradient-to-r from-[#5B4FE8] to-[#7C6FF0] hover:from-[#5043DB] hover:to-[#7163E8] text-white text-[15px] font-bold shadow-lg shadow-[#5B4FE8]/25 hover:shadow-xl hover:shadow-[#5B4FE8]/35 active:scale-[0.99] transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <span>Sign In</span>
                  <ArrowRight className="w-4 h-4 ml-0.5" />
                </>
              )}
            </button>
          </div>
        </form>

        {/* Footer Link */}
        <div className="mt-7 text-center text-[14px] text-[#6B7280]">
          Don't have an account?{' '}
          <button
            type="button"
            onClick={() => setIsSignUpModalOpen(true)}
            className="font-bold text-[#5B4FE8] hover:text-[#4338CA] hover:underline transition-colors cursor-pointer ml-1"
          >
            Sign Up
          </button>
        </div>
      </motion.div>

      {/* Floating Subtle Demo Role Quick Access Pill */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.4 }}
        className="mt-6 z-10"
      >
        <button
          type="button"
          onClick={() => setIsDemoModalOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/70 hover:bg-white text-xs font-semibold text-[#5B4FE8] border border-white/80 shadow-[0_4px_16px_rgba(108,99,255,0.12)] backdrop-blur-md transition-all duration-200 hover:scale-105 cursor-pointer group"
        >
          <Key className="w-3.5 h-3.5 text-[#6C63FF] group-hover:rotate-12 transition-transform" />
          <span>Demo Role Accounts & Directory</span>
        </button>
      </motion.div>

      {/* POPUP MODAL: Forgot Password */}
      <AnimatePresence>
        {isForgotPasswordOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/50 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="relative w-full max-w-md bg-white rounded-[24px] shadow-2xl p-6 sm:p-8 border border-white/80"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="w-10 h-10 rounded-[12px] bg-[#6C63FF]/10 text-[#6C63FF] flex items-center justify-center font-bold">
                  <Mail className="w-5 h-5" />
                </div>
                <button
                  type="button"
                  onClick={() => setIsForgotPasswordOpen(false)}
                  className="p-1.5 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <h2 className="text-xl font-bold text-[#1A1B2E]">Reset Your Password</h2>
              <p className="text-xs text-[#6B7280] mt-1.5 mb-5 leading-relaxed">
                Enter your registered workspace email address and we'll send you instructions to reset your password.
              </p>

              <form onSubmit={handleSendResetPassword} className="space-y-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium text-[#1A1B2E]">
                    Email Address
                  </label>
                  <input
                    type="email"
                    required
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    placeholder="e.g. owner@guruom.in"
                    className="w-full h-[46px] rounded-[14px] border border-[#E5E7EB] bg-white px-4 text-sm text-[#1A1B2E] placeholder:text-[#9CA3AF] focus:border-[#6C63FF] focus:ring-4 focus:ring-[#6C63FF]/15 outline-none"
                  />
                </div>

                <div className="flex items-center gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsForgotPasswordOpen(false)}
                    className="flex-1 h-[44px] rounded-full border border-slate-200 text-slate-700 text-xs font-bold hover:bg-slate-50 transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isResetting}
                    className="flex-1 h-[44px] rounded-full bg-gradient-to-r from-[#5B4FE8] to-[#7C6FF0] text-white text-xs font-bold hover:opacity-95 shadow-md shadow-[#5B4FE8]/20 transition-all cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    {isResetting ? (
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <span>Send Link</span>
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* POPUP MODAL: Sign Up Notice */}
      <AnimatePresence>
        {isSignUpModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/50 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="relative w-full max-w-md bg-white rounded-[24px] shadow-2xl p-6 sm:p-8 border border-white/80 text-center"
            >
              <div className="w-12 h-12 rounded-2xl bg-[#6C63FF]/10 text-[#6C63FF] mx-auto flex items-center justify-center font-bold mb-4">
                <Building2 className="w-6 h-6" />
              </div>

              <h2 className="text-xl font-bold text-[#1A1B2E]">Enterprise Account Access</h2>
              <p className="text-xs text-[#6B7280] mt-2 mb-6 leading-relaxed">
                GuruOm Owner OS is an enterprise operating system. User accounts and security role permissions are provisioned by your system administrator.
              </p>

              <div className="bg-slate-50 border border-slate-200/70 rounded-[14px] p-3 text-xs text-slate-600 mb-6 text-left">
                💡 <strong className="text-slate-800">Need immediate testing access?</strong> You can use any of the pre-configured role accounts from the Demo Directory.
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setIsSignUpModalOpen(false)}
                  className="flex-1 h-[44px] rounded-full border border-slate-200 text-slate-700 text-xs font-bold hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  Close
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsSignUpModalOpen(false);
                    setIsDemoModalOpen(true);
                  }}
                  className="flex-1 h-[44px] rounded-full bg-gradient-to-r from-[#5B4FE8] to-[#7C6FF0] text-white text-xs font-bold shadow-md shadow-[#5B4FE8]/20 hover:opacity-95 transition-all cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <Key className="w-3.5 h-3.5" />
                  <span>Demo Accounts</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* POPUP MODAL: Demo Users & Passwords Directory */}
      <AnimatePresence>
        {isDemoModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="relative w-full max-w-xl rounded-[24px] bg-white border border-slate-200/80 shadow-2xl overflow-hidden font-sans text-slate-900"
            >
              {/* Modal Header */}
              <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-slate-50 to-white">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-[14px] bg-gradient-to-br from-[#6C63FF] to-[#4338CA] text-white flex items-center justify-center font-bold shadow-xs">
                    <Key className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-base text-[#1A1B2E]">Role Accounts & Passwords</h3>
                    <p className="text-xs text-[#6B7280]">
                      Click any account below to instantly log in as that role
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsDemoModalOpen(false)}
                  className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-all cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Modal Body: Users List */}
              <div className="p-6 max-h-[60vh] overflow-y-auto space-y-3">
                <div className="p-3.5 rounded-[14px] border border-[#6C63FF]/20 bg-[#6C63FF]/5 text-xs text-[#5B4FE8] flex items-center gap-2.5">
                  <Shield className="w-4 h-4 shrink-0 text-[#6C63FF]" />
                  <span>Standard Password for all demo accounts: <strong className="font-mono px-2 py-0.5 rounded bg-white text-[#1A1B2E] border border-[#6C63FF]/30 font-bold ml-1">1234567890</strong></span>
                </div>

                <div className="space-y-2.5 pt-2">
                  {initialUsers.map((usr) => {
                    const roleColors = getRoleColor(usr.role);

                    return (
                      <div
                        key={usr.id}
                        className="p-3.5 rounded-[16px] border border-slate-200/80 bg-slate-50/60 hover:bg-white hover:border-[#6C63FF]/40 hover:shadow-xs transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-[12px] bg-gradient-to-tr from-[#6C63FF] to-[#4338CA] flex items-center justify-center text-white font-black text-xs shrink-0 shadow-xs">
                            {usr.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <div className="text-xs font-bold text-[#1A1B2E] flex items-center gap-2">
                              <span>{usr.name}</span>
                              <span className={`px-2 py-0.5 rounded-full text-[9px] font-mono font-bold uppercase border ${roleColors.bg} ${roleColors.text} ${roleColors.border}`}>
                                {usr.role}
                              </span>
                            </div>
                            <div className="text-[11px] font-mono text-[#6B7280] mt-0.5">
                              {usr.email}
                            </div>
                            <div className="text-[10px] text-slate-400 mt-0.5">
                              Dept: {usr.department || 'Operations'}
                            </div>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleAutoFillAndLogin(usr.email)}
                          className="px-3.5 py-2 rounded-full bg-gradient-to-r from-[#5B4FE8] to-[#7C6FF0] hover:from-[#5043DB] hover:to-[#7163E8] text-white font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer transition-all shadow-xs shrink-0"
                        >
                          <Sparkles className="w-3.5 h-3.5" />
                          <span>Login as {usr.role.split('_')[0]}</span>
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Modal Footer */}
              <div className="p-4 border-t border-slate-100 bg-slate-50 text-center">
                <button
                  type="button"
                  onClick={() => setIsDemoModalOpen(false)}
                  className="px-6 py-2 rounded-full border border-slate-300 text-slate-700 font-bold text-xs hover:bg-slate-200/80 transition-all cursor-pointer"
                >
                  Close Directory
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default LoginPage;
