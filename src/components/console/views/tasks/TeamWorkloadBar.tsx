import React from 'react';
import { Task } from '../../../../services/consoleApiServices';
import { SystemUser } from '../../../../types/console';
import { computeTeamWorkload } from './calendarUtils';
import { Users, AlertTriangle, CheckCircle2, Clock, X, BarChart2 } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';

interface TeamWorkloadBarProps {
  isOpen: boolean;
  onClose: () => void;
  tasks: Task[];
  users: SystemUser[];
  selectedAssigneeId: string;
  onSelectAssignee: (id: string) => void;
  isDarkMode: boolean;
}

export const TeamWorkloadBar: React.FC<TeamWorkloadBarProps> = ({
  isOpen,
  onClose,
  tasks,
  users,
  selectedAssigneeId,
  onSelectAssignee,
  isDarkMode
}) => {
  const workload = computeTeamWorkload(tasks, users);

  const cardBase = isDarkMode
    ? 'bg-[#09090B] border-white/10 text-white'
    : 'bg-white border-slate-200 text-slate-900';

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
          className="overflow-hidden"
        >
          <div className={`p-4 sm:p-5 rounded-3xl border mb-4 shadow-xl ${cardBase}`}>
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[var(--accent-primary)]/15 text-[var(--accent-primary)]">
                  <BarChart2 className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-xs sm:text-sm font-bold">Team Workload & Capacity</h3>
                  <p className="text-[11px] text-slate-400">
                    Live distribution across team members. Click a teammate to isolate their schedule.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={onClose}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Teammates Cards Carousel / Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 pt-3.5">
              {workload.map(({ user, total, pending, completed, overdue, highPriority, dueToday, isOverloaded }) => {
                const isSelected = selectedAssigneeId === user.id;

                return (
                  <div
                    key={user.id}
                    onClick={() => onSelectAssignee(isSelected ? '' : user.id)}
                    className={`p-3 rounded-2xl border transition-all cursor-pointer select-none ${
                      isSelected
                        ? 'border-[var(--accent-primary)] ring-2 ring-[var(--accent-primary)]/30 bg-[var(--accent-primary)]/10'
                        : isDarkMode
                          ? 'border-white/10 bg-white/[0.02] hover:bg-white/[0.05] hover:border-white/20'
                          : 'border-slate-200 bg-slate-50 hover:bg-white'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="w-7 h-7 rounded-full bg-[var(--accent-primary)]/20 text-[var(--accent-primary)] font-bold text-xs flex items-center justify-center shrink-0">
                          {user.name.slice(0, 2).toUpperCase()}
                        </div>
                        <div className="truncate">
                          <h4 className="text-xs font-bold truncate">{user.name}</h4>
                          <span className="text-[10px] text-slate-400 font-mono capitalize">
                            {user.role?.toLowerCase() || 'Team'}
                          </span>
                        </div>
                      </div>

                      {isOverloaded && (
                        <span
                          title="Overloaded capacity: 6+ pending or 4+ due today"
                          className="px-1.5 py-0.5 rounded-md text-[9px] font-mono font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30"
                        >
                          Overloaded
                        </span>
                      )}
                    </div>

                    {/* Progress Bar: Completed vs Pending */}
                    <div className="w-full bg-white/10 rounded-full h-1.5 overflow-hidden mb-2">
                      <div
                        className="bg-[var(--accent-primary)] h-1.5 transition-all"
                        style={{ width: `${total > 0 ? (completed / total) * 100 : 0}%` }}
                      />
                    </div>

                    {/* Metric Pills */}
                    <div className="grid grid-cols-3 gap-1 text-center font-mono text-[10px]">
                      <div className="p-1 rounded-lg bg-white/[0.02] border border-white/5">
                        <span className="block text-slate-400">Active</span>
                        <b className="text-white text-xs">{pending}</b>
                      </div>
                      <div className="p-1 rounded-lg bg-white/[0.02] border border-white/5">
                        <span className="block text-slate-400">Today</span>
                        <b className={dueToday > 0 ? 'text-amber-400 text-xs' : 'text-slate-400 text-xs'}>
                          {dueToday}
                        </b>
                      </div>
                      <div className="p-1 rounded-lg bg-white/[0.02] border border-white/5">
                        <span className="block text-slate-400">Overdue</span>
                        <b className={overdue > 0 ? 'text-rose-400 text-xs' : 'text-slate-400 text-xs'}>
                          {overdue}
                        </b>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default TeamWorkloadBar;
