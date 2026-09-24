import React, { useState } from 'react';
import { Task, TaskPriority } from '../../../../services/consoleApiServices';
import { Inbox, X, GripVertical, Calendar, Search, ArrowRight } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';

interface UnscheduledTasksDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  tasks: Task[];
  isDarkMode: boolean;
  onSelectTask: (task: Task) => void;
  onScheduleTask: (taskId: string, date: Date) => void;
}

const PRIORITY_STYLES: Record<TaskPriority, string> = {
  LOW: 'border-slate-400/20 text-slate-400 bg-slate-400/10',
  MEDIUM: 'border-sky-400/20 text-sky-400 bg-sky-400/10',
  HIGH: 'border-amber-400/20 text-amber-400 bg-amber-400/10',
  URGENT: 'border-rose-400/20 text-rose-400 bg-rose-400/10'
};

export const UnscheduledTasksDrawer: React.FC<UnscheduledTasksDrawerProps> = ({
  isOpen,
  onClose,
  tasks,
  isDarkMode,
  onSelectTask,
  onScheduleTask
}) => {
  const [search, setSearch] = useState('');

  // Unscheduled tasks filter
  const unscheduled = tasks.filter(
    (t) => !t.dueDate && t.status !== 'CANCELLED' && t.status !== 'DONE'
  );

  const filtered = unscheduled.filter((t) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return t.title.toLowerCase().includes(q) || (t.description || '').toLowerCase().includes(q);
  });

  const handleScheduleToday = (taskId: string) => {
    const d = new Date();
    d.setHours(17, 0, 0, 0);
    onScheduleTask(taskId, d);
  };

  const handleScheduleTomorrow = (taskId: string) => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    d.setHours(17, 0, 0, 0);
    onScheduleTask(taskId, d);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop on mobile */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/50 backdrop-blur-xs z-40 lg:hidden"
          />

          {/* Slide-over Drawer */}
          <motion.div
            initial={{ x: '100%', opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: '100%', opacity: 0 }}
            transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
            className={`fixed right-0 top-0 bottom-0 w-full max-w-sm z-50 p-4 sm:p-5 flex flex-col border-l shadow-2xl backdrop-blur-3xl font-sans ${
              isDarkMode
                ? 'bg-[#09090B]/95 border-white/10 text-white'
                : 'bg-white/95 border-slate-200 text-slate-900'
            }`}
          >
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[var(--accent-primary)]/15 text-[var(--accent-primary)]">
                  <Inbox className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold">Unscheduled Tasks</h3>
                  <p className="text-[11px] text-slate-400">
                    {unscheduled.length} task{unscheduled.length === 1 ? '' : 's'} waiting for due dates
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

            {/* Instruction Tip */}
            <div className="my-3 p-2.5 rounded-xl border border-[var(--accent-primary)]/20 bg-[var(--accent-primary)]/5 text-[11px] text-slate-300 leading-snug">
              💡 <b>Drag & drop</b> any task onto the calendar to assign a date, or use the quick buttons below.
            </div>

            {/* Search */}
            <div className="relative mb-3">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search unscheduled tasks…"
                className={`w-full pl-9 pr-3 py-1.5 rounded-xl border text-xs outline-none ${
                  isDarkMode
                    ? 'border-white/10 bg-white/[0.03] text-white placeholder:text-slate-500'
                    : 'border-slate-200 bg-slate-50 text-slate-900 placeholder:text-slate-400'
                }`}
              />
            </div>

            {/* Tasks List */}
            <div className="flex-1 overflow-y-auto space-y-2 pr-1">
              {filtered.map((task) => {
                const priorityStyle = PRIORITY_STYLES[task.priority];

                return (
                  <div
                    key={task.id}
                    draggable
                    onDragStart={(e) => {
                      e.dataTransfer.setData('text/plain', task.id);
                      e.dataTransfer.effectAllowed = 'move';
                    }}
                    onClick={() => onSelectTask(task)}
                    className={`p-3 rounded-2xl border transition-all cursor-grab active:cursor-grabbing hover:border-[var(--accent-primary)]/50 group select-none ${
                      isDarkMode
                        ? 'bg-white/[0.03] border-white/10 hover:bg-white/[0.05]'
                        : 'bg-slate-50 border-slate-200 hover:bg-white'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <GripVertical className="w-3.5 h-3.5 text-slate-500 opacity-60 shrink-0" />
                        <span className="text-xs font-bold truncate">{task.title}</span>
                      </div>

                      <span className={`px-2 py-0.5 rounded-md text-[9.5px] font-mono font-bold border shrink-0 ${priorityStyle}`}>
                        {task.priority}
                      </span>
                    </div>

                    {task.description && (
                      <p className="text-[11px] text-slate-400 line-clamp-1 mt-1 ml-5">
                        {task.description}
                      </p>
                    )}

                    {/* Quick schedule buttons */}
                    <div
                      className="flex items-center justify-between pt-2 mt-2 border-t border-white/5 ml-5"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <span className="text-[10px] font-mono text-slate-400">
                        {task.assignees[0]?.name || 'Unassigned'}
                      </span>

                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleScheduleToday(task.id)}
                          className="px-2 py-0.5 rounded-lg text-[10.5px] font-semibold border border-white/10 text-slate-300 hover:text-white hover:bg-white/10 transition-ui cursor-pointer"
                        >
                          Today
                        </button>
                        <button
                          type="button"
                          onClick={() => handleScheduleTomorrow(task.id)}
                          className="px-2 py-0.5 rounded-lg text-[10.5px] font-semibold border border-white/10 text-slate-300 hover:text-white hover:bg-white/10 transition-ui cursor-pointer"
                        >
                          Tomorrow
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}

              {filtered.length === 0 && (
                <div className="py-12 text-center text-xs font-mono text-slate-500">
                  {unscheduled.length === 0
                    ? 'All active tasks are scheduled!'
                    : 'No matching unscheduled tasks.'}
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default UnscheduledTasksDrawer;
