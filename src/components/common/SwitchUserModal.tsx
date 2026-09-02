import React, { useState } from 'react';
import { 
  X, 
  UserCheck, 
  ShieldAlert, 
  Lock, 
  Clock, 
  Plus, 
  Key, 
  Building, 
  Mail, 
  CheckCircle2,
  Ban,
  ArrowRight,
  Shield,
  Smartphone,
  Laptop
} from 'lucide-react';
import { SystemUser, UserRole } from '../../types/console';
import { getRoleColor } from '../../utils/permissions';
import { useBodyScrollLock } from './Modal';

interface SwitchUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  users: SystemUser[];
  currentUserId: string;
  onSwitchUser: (userId: string) => { success: boolean; error?: string };
  onRevokeUser: (userId: string) => void;
  onRestoreUser: (userId: string) => void;
  onAddUser?: (user: Partial<SystemUser>) => void;
  isDarkMode?: boolean;
}

export const SwitchUserModal: React.FC<SwitchUserModalProps> = ({
  isOpen,
  onClose,
  users,
  currentUserId,
  onSwitchUser,
  onRevokeUser,
  onRestoreUser,
  onAddUser,
  isDarkMode = false
}) => {
  useBodyScrollLock(isOpen);

  const [activeTab, setActiveTab] = useState<'SWITCH' | 'NEW'>('SWITCH');
  const [authError, setAuthError] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // New User Form State
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<UserRole>('OPERATOR');
  const [department, setDepartment] = useState('Shop Floor Operations');
  const [phone, setPhone] = useState('');

  if (!isOpen) return null;

  const handleSwitch = (userId: string) => {
    setAuthError(null);
    setErrorMsg(null);
    const result = onSwitchUser(userId);
    if (result.success) {
      onClose();
    } else {
      setAuthError(result.error || 'Authentication failed');
    }
  };

  const handleCreateUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email) {
      setErrorMsg('Name and Email are mandatory');
      return;
    }

    if (onAddUser) {
      onAddUser({
        name,
        email,
        role,
        department,
        phone,
        status: 'ACTIVE'
      });
    }

    setActiveTab('SWITCH');
    setName('');
    setEmail('');
    setPhone('');
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/70 backdrop-blur-2xl font-sans animate-in fade-in duration-200"
      data-lenis-prevent="true"
    >
      <div className={`relative w-full max-w-2xl max-h-[88vh] flex flex-col rounded-3xl border overflow-hidden transition-all backdrop-blur-3xl shadow-[0_30px_70px_rgba(0,0,0,0.8)] ${
        isDarkMode 
          ? 'bg-[#141418]/95 border-white/15 text-white shadow-[inset_0_1px_0_0_rgba(255,255,255,0.15),0_30px_70px_rgba(0,0,0,0.8)]' 
          : 'bg-white/95 border-slate-200/90 text-slate-900 shadow-2xl'
      }`}>
        {/* Apple Inset Ambient Highlight */}
        <div className="pointer-events-none absolute -top-24 -right-24 h-64 w-64 rounded-full bg-[radial-gradient(circle,rgba(0,122,255,0.22),transparent_70%)] blur-2xl" />
        <div className="pointer-events-none absolute -bottom-24 -left-24 h-64 w-64 rounded-full bg-[radial-gradient(circle,rgba(147,51,234,0.15),transparent_70%)] blur-2xl" />

        {/* ── Apple HIG Modal Header ── */}
        <div className="relative shrink-0 p-5 sm:p-6 border-b border-white/10 dark:border-white/10 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[var(--accent-gradient-from)] to-[var(--accent-gradient-to)] text-white shadow-md shadow-[var(--accent-shadow)]">
              <UserCheck className="h-5 w-5" strokeWidth={2.2} />
            </div>
            <div className="min-w-0">
              <h3 className="text-base font-bold tracking-tight text-white dark:text-white truncate">
                Fast User Switching
              </h3>
              <p className="mt-0.5 text-xs text-slate-400 truncate">
                Switch active operator persona or provision new workstation access
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="flex h-8.5 w-8.5 shrink-0 items-center justify-center rounded-full border border-white/15 bg-white/[0.06] text-slate-300 hover:text-white hover:bg-white/[0.12] hover:border-white/25 active:scale-95 cursor-pointer transition-all shadow-2xs"
            title="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* ── Apple Segmented Tab Switcher ── */}
        <div className="shrink-0 px-5 sm:px-6 pt-3 pb-2 border-b border-white/10 dark:border-white/10">
          <div className={`flex h-10 items-center rounded-full border p-1 ${
            isDarkMode ? 'border-white/15 bg-black/60' : 'border-slate-200/90 bg-slate-100'
          }`}>
            <button
              type="button"
              onClick={() => { setActiveTab('SWITCH'); setErrorMsg(null); setAuthError(null); }}
              className={`flex-1 flex h-8 items-center justify-center gap-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'SWITCH'
                  ? 'bg-[#007AFF] text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <UserCheck className="h-3.5 w-3.5" />
              <span>Switch User ({users.length})</span>
            </button>
            <button
              type="button"
              onClick={() => { setActiveTab('NEW'); setErrorMsg(null); setAuthError(null); }}
              className={`flex-1 flex h-8 items-center justify-center gap-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'NEW'
                  ? 'bg-[#007AFF] text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Provision User</span>
            </button>
          </div>
        </div>

        {/* ── Scrollable Modal Content ── */}
        <div className="relative flex-1 overflow-y-auto overscroll-contain p-5 sm:p-6 space-y-3">

          {/* Alert / Error Banner */}
          {(errorMsg || authError) && (
            <div className="p-3.5 rounded-2xl border border-rose-500/30 bg-rose-500/15 text-rose-300 text-xs font-semibold flex items-center gap-2.5 backdrop-blur-xl animate-in fade-in">
              <ShieldAlert className="h-4 w-4 text-rose-400 shrink-0" />
              <span className="flex-1">{errorMsg || authError}</span>
            </div>
          )}

          {/* ══════════  TAB: SWITCH USER LIST  ══════════ */}
          {activeTab === 'SWITCH' && (
            <div className="space-y-3">
              {users.map((usr) => {
                const isCurrent = usr.id === currentUserId;
                const isRevoked = usr.status === 'REVOKED';
                const roleColors = getRoleColor(usr.role);

                return (
                  <div
                    key={usr.id}
                    className={`p-4 rounded-3xl border transition-all backdrop-blur-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                      isCurrent
                        ? 'border-[#007AFF]/60 bg-[#007AFF]/10 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.15),0_8px_24px_rgba(0,122,255,0.15)] ring-1 ring-[#007AFF]/40'
                        : isRevoked
                          ? 'border-rose-500/25 bg-rose-500/5 opacity-75'
                          : isDarkMode
                            ? 'bg-white/[0.04] border-white/10 hover:bg-white/[0.08] hover:border-white/25 shadow-2xs'
                            : 'bg-slate-50/80 border-slate-200/90 hover:bg-white hover:shadow-xs'
                    }`}
                  >
                    <div className="flex items-start gap-3.5 min-w-0">
                      {/* User Monogram Avatar */}
                      <div className={`w-11 h-11 rounded-2xl flex items-center justify-center font-bold text-sm shrink-0 border shadow-sm ${
                        isRevoked
                          ? 'bg-rose-500/20 text-rose-400 border-rose-500/30'
                          : isCurrent
                            ? 'bg-gradient-to-br from-[var(--accent-gradient-from)] to-[var(--accent-gradient-to)] text-white border-white/20'
                            : 'bg-white/[0.08] text-white border-white/15'
                      }`}>
                        {usr.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-sm text-white dark:text-white tracking-tight">
                            {usr.name}
                          </span>
                          
                          {/* Role Badge */}
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider border ${roleColors.bg} ${roleColors.text} ${roleColors.border}`}>
                            {usr.role}
                          </span>

                          {/* Status Badge */}
                          {isRevoked ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-rose-500/15 text-rose-400 border border-rose-500/30">
                              <Lock className="w-3 h-3" /> Revoked
                            </span>
                          ) : isCurrent ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 shadow-2xs">
                              <span className="relative flex h-1.5 w-1.5">
                                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400" />
                              </span>
                              Active Session
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-white/[0.06] text-slate-300 border border-white/15">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" /> Ready
                            </span>
                          )}
                        </div>

                        <div className="text-xs text-slate-400 mt-1 flex items-center gap-2.5 flex-wrap">
                          <span className="flex items-center gap-1 text-slate-400">
                            <Mail className="w-3 h-3" /> {usr.email}
                          </span>
                          <span>•</span>
                          <span className="flex items-center gap-1 text-slate-400">
                            <Clock className="w-3 h-3" /> Last Login: {usr.lastLogin || 'Never'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Right Actions */}
                    <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                      {!isCurrent && (
                        <button
                          type="button"
                          onClick={() => handleSwitch(usr.id)}
                          disabled={isRevoked}
                          className={`px-4 py-2 rounded-full text-xs font-semibold transition-all flex items-center gap-1.5 active:scale-95 cursor-pointer ${
                            isRevoked
                              ? 'border border-white/10 bg-white/[0.04] text-slate-500 cursor-not-allowed'
                              : 'bg-[#007AFF] hover:bg-[#0071E3] text-white shadow-sm shadow-blue-500/25'
                          }`}
                        >
                          <Key className="w-3.5 h-3.5" />
                          <span>Switch</span>
                        </button>
                      )}

                      {/* Revoke / Restore Toggle */}
                      {isRevoked ? (
                        <button
                          type="button"
                          onClick={() => onRestoreUser(usr.id)}
                          className="px-3.5 py-2 rounded-full text-xs font-semibold bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 border border-emerald-500/30 cursor-pointer active:scale-95 transition-all"
                          title="Restore Active User Access"
                        >
                          Restore
                        </button>
                      ) : (
                        usr.role !== 'SUPER ADMIN' && (
                          <button
                            type="button"
                            onClick={() => onRevokeUser(usr.id)}
                            className="px-3 py-2 rounded-full text-xs font-semibold bg-rose-500/15 hover:bg-rose-500/25 text-rose-400 border border-rose-500/30 cursor-pointer active:scale-95 transition-all flex items-center gap-1"
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
              })}
            </div>
          )}

          {/* ══════════  TAB: PROVISION NEW USER  ══════════ */}
          {activeTab === 'NEW' && (
            <form onSubmit={handleCreateUser} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block font-semibold text-[11px] text-slate-400 mb-1.5">
                    Full Name
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Ramesh Deshmukh"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full rounded-2xl border border-white/15 bg-white/[0.04] p-3 text-xs text-white placeholder:text-slate-500 outline-none focus:border-[#007AFF] focus:ring-4 focus:ring-[#007AFF]/15 transition-all"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-[11px] text-slate-400 mb-1.5">
                    Corporate Email
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="e.g. ramesh@guruom.in"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full rounded-2xl border border-white/15 bg-white/[0.04] p-3 text-xs text-white placeholder:text-slate-500 outline-none focus:border-[#007AFF] focus:ring-4 focus:ring-[#007AFF]/15 transition-all"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-[11px] text-slate-400 mb-1.5">
                    Assigned System Role
                  </label>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value as UserRole)}
                    className="w-full rounded-2xl border border-white/15 bg-[#18181D] p-3 text-xs font-semibold text-white outline-none focus:border-[#007AFF] focus:ring-4 focus:ring-[#007AFF]/15 transition-all cursor-pointer"
                  >
                    <option value="SUPER ADMIN">SUPER ADMIN (Full Access)</option>
                    <option value="OPERATOR">OPERATOR (Shop Floor & Production)</option>
                    <option value="QC_MANAGER">QC_MANAGER (Quality Inspection & PDI)</option>
                    <option value="DISPATCH_CLERK">DISPATCH_CLERK (Logistics & Challans)</option>
                    <option value="FINANCE_MANAGER">FINANCE_MANAGER (Invoices & Payables)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-[11px] text-slate-400 mb-1.5">
                    Department
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Production / Quality Assurance"
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    className="w-full rounded-2xl border border-white/15 bg-white/[0.04] p-3 text-xs text-white placeholder:text-slate-500 outline-none focus:border-[#007AFF] focus:ring-4 focus:ring-[#007AFF]/15 transition-all"
                  />
                </div>
              </div>

              <div className="pt-3 flex justify-end items-center gap-2.5 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setActiveTab('SWITCH')}
                  className="px-4 py-2.5 rounded-full border border-white/15 bg-white/[0.04] text-slate-300 hover:bg-white/[0.08] text-xs font-semibold cursor-pointer active:scale-95 transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-full bg-[#007AFF] hover:bg-[#0071E3] text-white font-bold text-xs cursor-pointer shadow-sm shadow-blue-500/25 active:scale-95 transition-all"
                >
                  Provision User
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default SwitchUserModal;

