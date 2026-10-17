import React, { useState } from 'react';
import {
  Lock,
  KeyRound,
  ShieldAlert,
  ShieldCheck,
  Eye,
  EyeOff,
  LogOut,
  ArrowRight,
  Loader2,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { apiClient, setAccessToken } from '../../lib/apiClient';
import { toast } from '../../context/ToastContext';

interface ChangePasswordPageProps {
  isDarkMode?: boolean;
  onSuccess?: () => void;
  onSignOut?: () => void;
}

export const ChangePasswordPage: React.FC<ChangePasswordPageProps> = ({
  isDarkMode = true,
  onSuccess,
  onSignOut
}) => {
  const { user, clearMustChangePassword, signOut } = useAuth();

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleLogout = async () => {
    if (onSignOut) {
      onSignOut();
    } else {
      await signOut();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    // 1. Validation: Current Password
    if (!currentPassword) {
      setErrorMessage('Please enter your current temporary password.');
      return;
    }

    // 2. Validation: At least 8 characters
    if (newPassword.length < 8) {
      setErrorMessage('New password must be at least 8 characters long.');
      return;
    }

    // 3. Validation: Differs from current password
    if (newPassword === currentPassword) {
      setErrorMessage('New password must be different from your current temporary password.');
      return;
    }

    // 4. Validation: Is not "Pass@123"
    if (newPassword === 'Pass@123') {
      setErrorMessage('You cannot reuse the initial temporary password "Pass@123". Please choose a unique password.');
      return;
    }

    // 5. Validation: Matches confirmation
    if (newPassword !== confirmPassword) {
      setErrorMessage('New password and confirm password do not match.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await apiClient.post<{
        success: boolean;
        message: string;
        accessToken?: string;
        user?: any;
      }>('/auth/change-password', {
        currentPassword,
        newPassword
      });

      if (res?.accessToken) {
        setAccessToken(res.accessToken);
      }

      // Clear the flag in auth context & local storage
      clearMustChangePassword();

      toast.success(
        res?.message || 'Password changed successfully. You now have full access to OwnerOS.',
        'Security Updated'
      );

      if (onSuccess) {
        onSuccess();
      } else {
        // Redirect to dashboard
        window.location.href = '/';
      }
    } catch (err: any) {
      const msg = err?.message || 'Failed to update password. Please check your current password and try again.';
      setErrorMessage(msg);
      toast.error(msg, 'Password Change Failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className={`min-h-screen w-full flex flex-col items-center justify-center p-4 relative overflow-hidden transition-colors ${
      isDarkMode ? 'bg-[#090B0E] text-slate-100' : 'bg-slate-50 text-slate-900'
    }`}>
      {/* Background radial gradient glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Main Container Card */}
      <div className={`w-full max-w-lg rounded-3xl border shadow-2xl p-6 sm:p-8 backdrop-blur-xl relative z-10 transition-all ${
        isDarkMode 
          ? 'bg-slate-900/80 border-slate-800 shadow-[0_20px_50px_rgba(0,0,0,0.6)]' 
          : 'bg-white/90 border-slate-200 shadow-[0_20px_50px_rgba(0,0,0,0.06)]'
      }`}>
        {/* Top Header Badge */}
        <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-200 dark:border-slate-800/80">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-500 flex items-center justify-center shrink-0">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[10px] font-mono uppercase font-bold tracking-wider text-amber-500">
                Security Requirement
              </div>
              <h1 className="text-lg font-bold font-sans">
                Change your password
              </h1>
            </div>
          </div>

          {/* Logout Button */}
          <button
            type="button"
            onClick={handleLogout}
            className={`px-3 py-1.5 rounded-xl border text-xs font-mono font-bold flex items-center gap-1.5 transition-ui cursor-pointer ${
              isDarkMode 
                ? 'bg-slate-800/80 hover:bg-slate-800 text-slate-300 border-slate-700 hover:text-white' 
                : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200 hover:text-slate-900'
            }`}
            title="Sign out of this session"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>
        </div>

        {/* Informational Subtext */}
        <div className={`p-3.5 rounded-2xl border text-xs font-mono mb-5 space-y-1 ${
          isDarkMode ? 'bg-slate-950/60 border-slate-800/80 text-slate-300' : 'bg-slate-50 border-slate-200 text-slate-700'
        }`}>
          <div className="flex items-center gap-2 text-indigo-400 font-bold">
            <Lock className="w-3.5 h-3.5" />
            <span>First-Login Password Setup</span>
          </div>
          <p className="text-[11px] leading-relaxed text-slate-400">
            You signed in with a temporary administrative password. For account protection and industrial compliance, you must set a new personal password before accessing the system.
          </p>
          {user?.email && (
            <div className="text-[10px] text-slate-500 pt-0.5">
              Account: <strong className="text-slate-300 font-mono">{user.email}</strong>
            </div>
          )}
        </div>

        {/* Error Banner */}
        {errorMessage && (
          <div className="mb-5 p-3 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-mono flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <div className="leading-snug">{errorMessage}</div>
          </div>
        )}

        {/* Change Password Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Current Password Field */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className={`text-xs font-mono font-semibold ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                Current Password <span className="text-rose-500">*</span>
              </label>
              <span className="text-[10px] font-mono text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded-md border border-amber-500/20">
                your temporary password
              </span>
            </div>
            <div className="relative">
              <div className="absolute left-3.5 top-3 text-slate-400">
                <KeyRound className="w-4 h-4" />
              </div>
              <input
                type={showCurrentPassword ? 'text' : 'password'}
                placeholder="your temporary password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                autoComplete="current-password"
                required
                className={`w-full pl-10 pr-10 py-2.5 rounded-xl border text-xs font-mono transition-ui outline-none ${
                  isDarkMode 
                    ? 'bg-slate-950/80 border-slate-800 text-white placeholder:text-slate-500 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20' 
                    : 'bg-white border-slate-300 text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 shadow-xs'
                }`}
              />
              <button
                type="button"
                onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-200 cursor-pointer p-0.5"
                title={showCurrentPassword ? 'Hide password' : 'Show password'}
              >
                {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* New Password Field */}
          <div>
            <label className={`block text-xs font-mono font-semibold mb-1.5 ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
              New Password <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <div className="absolute left-3.5 top-3 text-slate-400">
                <Lock className="w-4 h-4" />
              </div>
              <input
                type={showNewPassword ? 'text' : 'password'}
                placeholder="At least 8 characters (different from current)"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                autoComplete="new-password"
                required
                minLength={8}
                className={`w-full pl-10 pr-10 py-2.5 rounded-xl border text-xs font-mono transition-ui outline-none ${
                  isDarkMode 
                    ? 'bg-slate-950/80 border-slate-800 text-white placeholder:text-slate-500 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20' 
                    : 'bg-white border-slate-300 text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 shadow-xs'
                }`}
              />
              <button
                type="button"
                onClick={() => setShowNewPassword(!showNewPassword)}
                className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-200 cursor-pointer p-0.5"
                title={showNewPassword ? 'Hide password' : 'Show password'}
              >
                {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Confirm Password Field */}
          <div>
            <label className={`block text-xs font-mono font-semibold mb-1.5 ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
              Confirm New Password <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <div className="absolute left-3.5 top-3 text-slate-400">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                placeholder="Re-enter your new password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                autoComplete="new-password"
                required
                minLength={8}
                className={`w-full pl-10 pr-10 py-2.5 rounded-xl border text-xs font-mono transition-ui outline-none ${
                  isDarkMode 
                    ? 'bg-slate-950/80 border-slate-800 text-white placeholder:text-slate-500 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20' 
                    : 'bg-white border-slate-300 text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 shadow-xs'
                }`}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-200 cursor-pointer p-0.5"
                title={showConfirmPassword ? 'Hide password' : 'Show password'}
              >
                {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Password Rules Checklist */}
          <div className={`p-3 rounded-2xl border text-[11px] font-mono space-y-1.5 ${
            isDarkMode ? 'bg-slate-950/40 border-slate-800/60' : 'bg-slate-50 border-slate-200'
          }`}>
            <div className="text-[10px] uppercase font-bold text-slate-400 mb-1">Password Requirements:</div>
            <div className={`flex items-center gap-1.5 ${newPassword.length >= 8 ? 'text-emerald-400' : 'text-slate-500'}`}>
              <CheckCircle2 className={`w-3.5 h-3.5 ${newPassword.length >= 8 ? 'text-emerald-400' : 'text-slate-600'}`} />
              <span>At least 8 characters long</span>
            </div>
            <div className={`flex items-center gap-1.5 ${newPassword && newPassword !== currentPassword ? 'text-emerald-400' : 'text-slate-500'}`}>
              <CheckCircle2 className={`w-3.5 h-3.5 ${newPassword && newPassword !== currentPassword ? 'text-emerald-400' : 'text-slate-600'}`} />
              <span>Different from your current temporary password</span>
            </div>
            <div className={`flex items-center gap-1.5 ${newPassword && newPassword !== 'Pass@123' ? 'text-emerald-400' : 'text-slate-500'}`}>
              <CheckCircle2 className={`w-3.5 h-3.5 ${newPassword && newPassword !== 'Pass@123' ? 'text-emerald-400' : 'text-slate-600'}`} />
              <span>Cannot be initial default ("Pass@123")</span>
            </div>
            <div className={`flex items-center gap-1.5 ${confirmPassword && newPassword === confirmPassword ? 'text-emerald-400' : 'text-slate-500'}`}>
              <CheckCircle2 className={`w-3.5 h-3.5 ${confirmPassword && newPassword === confirmPassword ? 'text-emerald-400' : 'text-slate-600'}`} />
              <span>Passwords match</span>
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={submitting}
            className={`w-full py-3 rounded-2xl font-bold font-mono text-xs flex items-center justify-center gap-2 cursor-pointer transition-all shadow-lg ${
              submitting
                ? 'opacity-60 cursor-not-allowed bg-indigo-600 text-white'
                : 'bg-gradient-to-r from-indigo-600 via-indigo-500 to-indigo-600 hover:from-indigo-500 hover:to-indigo-500 text-white shadow-indigo-500/25 hover:scale-[1.01] active:scale-[0.98]'
            }`}
          >
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Updating Password...</span>
              </>
            ) : (
              <>
                <span>Save New Password & Continue</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};
