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
  Ban
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

  const [selectedUserId, setSelectedUserId] = useState<string>(currentUserId);
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
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs font-sans"
      data-lenis-prevent="true"
    >
      <div className={`w-full max-w-2xl max-h-[90vh] flex flex-col rounded-2xl border shadow-2xl overflow-hidden ${
        isDarkMode ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-900'
      }`}>
        {/* Modal Header */}
        <div className={`shrink-0 p-4 border-b flex items-center justify-between ${
          isDarkMode ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'
        }`}>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-teal-600 flex items-center justify-center text-white font-bold shadow-xs">
              <UserCheck className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm tracking-tight">Realtime User Session & Role Switcher</h3>
              <p className="text-[11px] text-slate-500 font-mono">Authenticate & switch active role permissions</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer transition-all"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="shrink-0 flex border-b border-slate-100 dark:border-slate-800 px-4 pt-2 gap-2 text-xs font-mono">
          <button
            onClick={() => { setActiveTab('SWITCH'); setErrorMsg(null); }}
            className={`pb-2.5 px-3 font-semibold border-b-2 cursor-pointer transition-all ${
              activeTab === 'SWITCH'
                ? 'border-teal-600 text-teal-600 dark:text-teal-400 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            Switch User ({users.length})
          </button>
          <button
            onClick={() => { setActiveTab('NEW'); setErrorMsg(null); }}
            className={`pb-2.5 px-3 font-semibold border-b-2 cursor-pointer transition-all flex items-center gap-1 ${
              activeTab === 'NEW'
                ? 'border-teal-600 text-teal-600 dark:text-teal-400 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Provision User</span>
          </button>
        </div>

        {/* Scrollable Modal Content */}
        <div className="flex-1 overflow-y-auto overscroll-contain">

        {/* Alert / Error Banner */}
        {(errorMsg || authError) && (
          <div className="p-3 bg-rose-50 dark:bg-rose-950/50 border-b border-rose-200 dark:border-rose-800/80 text-rose-700 dark:text-rose-400 text-xs font-mono font-medium flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 shrink-0" />
            <span className="flex-1">{errorMsg}</span>
          </div>
        )}

        {/* Tab Content: SWITCH USER LIST */}
        {activeTab === 'SWITCH' && (
          <div className="p-4 max-h-[420px] overflow-y-auto space-y-2.5">
            {users.map((usr) => {
              const isCurrent = usr.id === currentUserId;
              const isRevoked = usr.status === 'REVOKED';
              const roleColors = getRoleColor(usr.role);

              return (
                <div
                  key={usr.id}
                  className={`p-3.5 rounded-xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                    isCurrent
                      ? 'border-teal-500/80 bg-teal-50/40 dark:bg-dark-surface/20 ring-1 ring-teal-500/30'
                      : isRevoked
                        ? 'border-rose-200 dark:border-rose-900/50 bg-rose-50/20 dark:bg-rose-950/10 opacity-80'
                        : isDarkMode
                          ? 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                          : 'bg-slate-50/80 border-slate-200/90 hover:bg-slate-100/80'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    {/* User Initials Avatar */}
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm shrink-0 border shadow-2xs ${
                      isRevoked
                        ? 'bg-rose-100 dark:bg-rose-950 text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-800'
                        : isCurrent
                          ? 'bg-teal-600 text-white border-teal-500'
                          : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700'
                    }`}>
                      {usr.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                    </div>

                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-sm text-slate-900 dark:text-slate-100">{usr.name}</span>
                        
                        {/* Role Badge */}
                        <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase border ${roleColors.bg} ${roleColors.text} ${roleColors.border}`}>
                          {usr.role}
                        </span>

                        {/* Status Badge */}
                        {isRevoked ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-800">
                            <Lock className="w-3 h-3" /> REVOKED
                          </span>
                        ) : isCurrent ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                            <CheckCircle2 className="w-3 h-3 text-emerald-500" /> ACTIVE SESSION
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> READY
                          </span>
                        )}
                      </div>

                      <div className="text-xs text-slate-500 mt-1 flex items-center gap-3 flex-wrap font-mono">
                        <span className="flex items-center gap-1">
                          <Mail className="w-3 h-3" /> {usr.email}
                        </span>
                        <span>•</span>
                        <span className="flex items-center gap-1 text-slate-600 dark:text-slate-400">
                          <Clock className="w-3 h-3" /> Last Login: {usr.lastLogin || 'Never'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Right Actions */}
                  <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                    {!isCurrent && (
                      <button
                        onClick={() => handleSwitch(usr.id)}
                        disabled={isRevoked}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold font-mono transition-all flex items-center gap-1 cursor-pointer ${
                          isRevoked
                            ? 'bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-600 cursor-not-allowed'
                            : 'bg-teal-600 hover:bg-teal-500 text-white shadow-2xs'
                        }`}
                      >
                        <Key className="w-3.5 h-3.5" />
                        <span>Log In</span>
                      </button>
                    )}

                    {/* Revoke / Restore Toggle */}
                    {isRevoked ? (
                      <button
                        onClick={() => onRestoreUser(usr.id)}
                        className="px-2.5 py-1.5 rounded-lg text-xs font-bold font-mono bg-emerald-50 hover:bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:hover:bg-emerald-900/60 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/80 cursor-pointer transition-all"
                        title="Restore Active User Access"
                      >
                        Restore
                      </button>
                    ) : (
                      usr.role !== 'SUPER ADMIN' && (
                        <button
                          onClick={() => onRevokeUser(usr.id)}
                          className="px-2.5 py-1.5 rounded-lg text-xs font-bold font-mono bg-rose-50 hover:bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:hover:bg-rose-900/60 dark:text-rose-400 border border-rose-200 dark:border-rose-800/80 cursor-pointer transition-all flex items-center gap-1"
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

        {/* Tab Content: PROVISION NEW USER */}
        {activeTab === 'NEW' && (
          <form onSubmit={handleCreateUser} className="p-5 space-y-4 font-sans text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-mono font-bold uppercase text-[10px] text-slate-500 mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Ramesh Deshmukh"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className={`w-full rounded-xl p-2.5 border font-mono ${
                    isDarkMode ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                  }`}
                />
              </div>

              <div>
                <label className="block font-mono font-bold uppercase text-[10px] text-slate-500 mb-1">
                  Corporate Email
                </label>
                <input
                  type="email"
                  required
                  placeholder="e.g. ramesh@guruom.in"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={`w-full rounded-xl p-2.5 border font-mono ${
                    isDarkMode ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                  }`}
                />
              </div>

              <div>
                <label className="block font-mono font-bold uppercase text-[10px] text-slate-500 mb-1">
                  Assigned System Role
                </label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as UserRole)}
                  className={`w-full rounded-xl p-2.5 border font-mono font-bold ${
                    isDarkMode ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                  }`}
                >
                  <option value="SUPER ADMIN">SUPER ADMIN (Full Access)</option>
                  <option value="OPERATOR">OPERATOR (Shop Floor & Production)</option>
                  <option value="QC_MANAGER">QC_MANAGER (Quality Inspection & PDI)</option>
                  <option value="DISPATCH_CLERK">DISPATCH_CLERK (Logistics & Challans)</option>
                  <option value="FINANCE_MANAGER">FINANCE_MANAGER (Invoices & Payables)</option>
                </select>
              </div>

              <div>
                <label className="block font-mono font-bold uppercase text-[10px] text-slate-500 mb-1">
                  Department
                </label>
                <input
                  type="text"
                  placeholder="e.g. Production / Quality Assurance"
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  className={`w-full rounded-xl p-2.5 border font-mono ${
                    isDarkMode ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                  }`}
                />
              </div>
            </div>

            <div className="pt-2 flex justify-end gap-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setActiveTab('SWITCH')}
                className="px-4 py-2 rounded-xl border text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 font-bold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold cursor-pointer shadow-md shadow-teal-600/20"
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
