import React, { useState, useMemo } from 'react';
import { 
  X, 
  UserCheck, 
  ShieldAlert, 
  Lock, 
  Clock, 
  Key, 
  Mail, 
  Search, 
  CheckCircle2, 
  Ban,
  ShieldCheck
} from 'lucide-react';
import { SystemUser } from '../../types/console';
import { getRoleColor } from '../../utils/permissions';
import { useBodyScrollLock } from './Modal';

interface SwitchUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  users: SystemUser[];
  currentUserId: string;
  onSwitchUser: (userId: string) => { success: boolean; error?: string };
  onRevokeUser?: (userId: string) => void;
  onRestoreUser?: (userId: string) => void;
  isDarkMode?: boolean;
}

function formatLastLogin(lastLogin?: string): string {
  if (!lastLogin || lastLogin === 'Never') return 'Never';
  try {
    const d = new Date(lastLogin);
    if (isNaN(d.getTime())) return lastLogin;
    return d.toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  } catch {
    return lastLogin;
  }
}

export const SwitchUserModal: React.FC<SwitchUserModalProps> = ({
  isOpen,
  onClose,
  users,
  currentUserId,
  onSwitchUser,
  onRevokeUser,
  onRestoreUser,
  isDarkMode = false
}) => {
  useBodyScrollLock(isOpen);

  const [searchQuery, setSearchQuery] = useState('');
  const [authError, setAuthError] = useState<string | null>(null);

  const filteredUsers = useMemo(() => {
    if (!searchQuery.trim()) return users;
    const q = searchQuery.toLowerCase().trim();
    return users.filter(u => 
      u.name?.toLowerCase().includes(q) ||
      u.email?.toLowerCase().includes(q) ||
      (typeof u.role === 'string' && u.role.toLowerCase().includes(q)) ||
      u.department?.toLowerCase().includes(q)
    );
  }, [users, searchQuery]);

  if (!isOpen) return null;

  const handleSwitch = (userId: string) => {
    setAuthError(null);
    const result = onSwitchUser(userId);
    if (result.success) {
      onClose();
    } else {
      setAuthError(result.error || 'Authentication failed');
    }
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/70 backdrop-blur-2xl font-sans animate-in fade-in duration-200"
      data-lenis-prevent="true"
    >
      <div className={`relative w-full max-w-2xl max-h-[88vh] flex flex-col rounded-3xl border overflow-hidden transition-all backdrop-blur-3xl shadow-[0_30px_70px_rgba(0,0,0,0.8)] ${
        isDarkMode 
          ? 'bg-[#141418]/95 border-white/15 text-white shadow-[inset_0_1px_0_0_rgba(255,255,255,0.15),0_30px_70px_rgba(0,0,0,0.8)]' 
          : 'bg-white/95 border-slate-200 text-slate-900 shadow-2xl'
      }`}>
        {/* Apple Inset Ambient Highlight */}
        <div className="pointer-events-none absolute -top-24 -right-24 h-64 w-64 rounded-full bg-[radial-gradient(circle,rgba(0,122,255,0.22),transparent_70%)] blur-2xl" />
        <div className="pointer-events-none absolute -bottom-24 -left-24 h-64 w-64 rounded-full bg-[radial-gradient(circle,rgba(147,51,234,0.15),transparent_70%)] blur-2xl" />

        {/* ── Modal Header ── */}
        <div className={`relative shrink-0 p-5 sm:p-6 border-b flex items-center justify-between gap-4 ${
          isDarkMode ? 'border-white/10' : 'border-slate-200'
        }`}>
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/25">
              <ShieldCheck className="h-5 w-5" strokeWidth={2.2} />
            </div>
            <div className="min-w-0">
              <h3 className={`text-base font-bold tracking-tight truncate ${
                isDarkMode ? 'text-white' : 'text-slate-900'
              }`}>
                Executive Authority Switching
              </h3>
              <p className={`mt-0.5 text-xs truncate ${
                isDarkMode ? 'text-slate-400' : 'text-slate-500'
              }`}>
                {users.length <= 2 
                  ? 'Fast switch between Owner and Server Admin system authorities'
                  : `Real-time registered platform accounts (${users.length} registered)`}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className={`flex h-8.5 w-8.5 shrink-0 items-center justify-center rounded-full border active:scale-95 cursor-pointer transition-all shadow-2xs ${
              isDarkMode
                ? 'border-white/15 bg-white/[0.06] text-slate-300 hover:text-white hover:bg-white/[0.12] hover:border-white/25'
                : 'border-slate-200 bg-slate-100 text-slate-600 hover:text-slate-900 hover:bg-slate-200 hover:border-slate-300'
            }`}
            title="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* ── Search Bar (only shown when more than 3 accounts exist) ── */}
        {users.length > 3 && (
          <div className={`shrink-0 px-5 sm:px-6 py-3 border-b ${
            isDarkMode ? 'border-white/10' : 'border-slate-200'
          }`}>
            <div className="relative">
              <Search className={`absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 ${
                isDarkMode ? 'text-slate-400' : 'text-slate-500'
              }`} />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search registered users by name, role, email, or department..."
                className={`w-full rounded-2xl border pl-10 pr-4 py-2 text-xs font-medium outline-none transition-all ${
                  isDarkMode 
                    ? 'border-white/15 bg-white/[0.04] text-white placeholder:text-slate-500 focus:border-[#5B75F8] focus:ring-2 focus:ring-[#5B75F8]/20'
                    : 'border-slate-200 bg-slate-50 text-slate-900 placeholder:text-slate-400 focus:border-[#5B75F8] focus:bg-white focus:ring-2 focus:ring-[#5B75F8]/20'
                }`}
              />
            </div>
          </div>
        )}

        {/* ── Scrollable User List ── */}
        <div className="relative flex-1 overflow-y-auto overscroll-contain p-5 sm:p-6 space-y-3">
          {/* Error Banner */}
          {authError && (
            <div className="p-3.5 rounded-2xl border border-rose-500/30 bg-rose-500/15 text-rose-300 text-xs font-semibold flex items-center gap-2.5 backdrop-blur-xl animate-in fade-in">
              <ShieldAlert className="h-4 w-4 text-rose-400 shrink-0" />
              <span className="flex-1">{authError}</span>
            </div>
          )}

          {filteredUsers.length === 0 ? (
            <div className={`py-12 text-center text-xs font-medium ${
              isDarkMode ? 'text-slate-400' : 'text-slate-500'
            }`}>
              No registered platform authorities found.
            </div>
          ) : (
            filteredUsers.map((usr) => {
              const isCurrent = usr.id === currentUserId || usr.email?.toLowerCase() === currentUserId.toLowerCase();
              const isRevoked = usr.status === 'REVOKED';
              const isServerAdmin = usr.role === 'ServerAdmin' || usr.email?.toLowerCase() === 'serveradmin@guruom.in';
              const displayRole = isServerAdmin ? 'Server Admin' : (usr.role === 'SUPER ADMIN' ? 'Owner / Super Admin' : usr.role);
              const roleColors = getRoleColor(usr.role as any);

              return (
                <div
                  key={usr.id}
                  className={`p-4 rounded-3xl border transition-all backdrop-blur-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                    isCurrent
                      ? 'border-[#5B75F8]/60 bg-[#5B75F8]/10 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.15),0_8px_24px_rgba(0,122,255,0.15)] ring-1 ring-[#5B75F8]/40'
                      : isRevoked
                        ? 'border-rose-500/25 bg-rose-500/5 opacity-75'
                        : isDarkMode
                          ? 'bg-white/[0.04] border-white/10 hover:bg-white/[0.08] hover:border-white/25 shadow-2xs'
                          : 'bg-slate-50/90 border-slate-200 hover:bg-white hover:border-slate-300 hover:shadow-xs'
                  }`}
                >
                  <div className="flex items-start gap-3.5 min-w-0">
                    {/* User Monogram Avatar */}
                    <div className={`w-11 h-11 rounded-2xl flex items-center justify-center font-bold text-sm shrink-0 border shadow-sm ${
                      isRevoked
                        ? 'bg-rose-500/20 text-rose-400 border-rose-500/30'
                        : isServerAdmin
                          ? 'bg-gradient-to-br from-violet-600 to-indigo-600 text-white border-violet-400/30 shadow-violet-500/20'
                          : 'bg-gradient-to-br from-rose-600 to-amber-600 text-white border-rose-400/30 shadow-rose-500/20'
                    }`}>
                      {(usr.name || usr.fullName || usr.email).split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`font-bold text-sm tracking-tight ${
                          isDarkMode ? 'text-white' : 'text-slate-900'
                        }`}>
                          {usr.name || usr.fullName}
                        </span>
                        
                        {/* Role Badge */}
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider border ${roleColors.bg} ${roleColors.text} ${roleColors.border}`}>
                          {displayRole}
                        </span>

                        {/* Status Badge */}
                        {isRevoked ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-rose-500/15 text-rose-400 border border-rose-500/30">
                            <Lock className="w-3 h-3" /> Revoked
                          </span>
                        ) : isCurrent ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/15 text-emerald-500 border border-emerald-500/30 shadow-2xs">
                            <span className="relative flex h-1.5 w-1.5">
                              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400" />
                            </span>
                            Active Session
                          </span>
                        ) : (
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-semibold border ${
                            isDarkMode
                              ? 'bg-white/[0.06] text-slate-300 border-white/15'
                              : 'bg-slate-100 text-slate-600 border-slate-200'
                          }`}>
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Ready
                          </span>
                        )}
                      </div>

                      <div className={`text-xs mt-1 flex items-center gap-2.5 flex-wrap ${
                        isDarkMode ? 'text-slate-400' : 'text-slate-500'
                      }`}>
                        <span className="flex items-center gap-1">
                          <Mail className="w-3 h-3" /> {usr.email}
                        </span>
                        {usr.department && (
                          <>
                            <span>•</span>
                            <span>{usr.department}</span>
                          </>
                        )}
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" /> Last: {formatLastLogin(usr.lastLogin)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Right Actions */}
                  <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                    {!isCurrent ? (
                      <button
                        type="button"
                        onClick={() => handleSwitch(usr.id)}
                        disabled={isRevoked}
                        className={`px-4 py-2 rounded-full text-xs font-semibold transition-all flex items-center gap-1.5 active:scale-95 cursor-pointer ${
                          isRevoked
                            ? 'border border-slate-200 bg-slate-100 text-slate-400 dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-500 cursor-not-allowed'
                            : 'bg-[#5B75F8] hover:bg-[#435BE8] text-white shadow-sm shadow-blue-500/25'
                        }`}
                      >
                        <Key className="w-3.5 h-3.5" />
                        <span>Switch</span>
                      </button>
                    ) : (
                      <span className="px-3 py-1.5 rounded-full text-xs font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Current</span>
                      </span>
                    )}

                    {/* Optional Revoke / Restore Toggle for Admin (disabled for SuperAdmin & ServerAdmin) */}
                    {isRevoked && onRestoreUser ? (
                      <button
                        type="button"
                        onClick={() => onRestoreUser(usr.id)}
                        className="px-3.5 py-2 rounded-full text-xs font-semibold bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 border border-emerald-500/30 cursor-pointer active:scale-95 transition-all"
                        title="Restore Active User Access"
                      >
                        Restore
                      </button>
                    ) : (
                      !isRevoked && onRevokeUser && usr.role !== 'SUPER ADMIN' && usr.role !== 'ServerAdmin' && (
                        <button
                          type="button"
                          onClick={() => onRevokeUser(usr.id)}
                          className="px-3 py-2 rounded-full text-xs font-semibold bg-rose-500/15 hover:bg-rose-500/25 text-rose-500 border border-rose-500/30 cursor-pointer active:scale-95 transition-all flex items-center gap-1"
                          title="Revoke Access Immediately"
                        >
                          <Ban className="w-3 h-3" />
                          <span>Revoke</span>
                        </button>
                      )
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};

export default SwitchUserModal;
