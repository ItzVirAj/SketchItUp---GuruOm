import React from 'react';
import { ShieldAlert, Lock, ArrowLeft, UserCheck } from 'lucide-react';
import { SystemUser, ConsoleView } from '../../types/console';

interface AccessRestrictedGateProps {
  currentUser: SystemUser;
  targetView: ConsoleView;
  isDarkMode?: boolean;
  onNavigateHome: () => void;
  onOpenSwitchUser: () => void;
}

export const AccessRestrictedGate: React.FC<AccessRestrictedGateProps> = ({
  currentUser: _currentUser,
  targetView: _targetView,
  isDarkMode = false,
  onNavigateHome,
  onOpenSwitchUser: _onOpenSwitchUser
}) => {
  return (
    <div className={`p-8 md:p-12 rounded-2xl border flex flex-col items-center text-center max-w-lg mx-auto my-12 shadow-xl ${
      isDarkMode ? 'bg-slate-900/90 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-900'
    }`}>
      <div className="w-16 h-16 rounded-2xl bg-amber-500/10 dark:bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-600 dark:text-amber-400 mb-6 shadow-xs">
        <Lock className="w-8 h-8 stroke-[2.2]" />
      </div>

      <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-bold bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800 uppercase tracking-wider mb-6">
        <ShieldAlert className="w-3.5 h-3.5" />
        Role Access Restriction
      </div>

      <div className="flex items-center justify-center">
        <button
          onClick={onNavigateHome}
          className="px-5 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold text-sm flex items-center gap-2 cursor-pointer transition-all shadow-md shadow-teal-600/20"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Return to Command Centre</span>
        </button>
      </div>
    </div>
  );
};
