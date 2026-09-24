import React from 'react';
import {
  isToday,
  getTaskDate,
  isTaskOverdue
} from './calendarUtils';
import { Task, TaskPriority, TaskStatus } from '../../../../services/consoleApiServices';
import { Clock, CheckCircle2, AlertTriangle, User, Calendar as CalendarIcon, ArrowRight } from 'lucide-react';

interface AgendaViewProps {
  tasks: Task[];
  isDarkMode: boolean;
  onSelectTask: (task: Task) => void;
  onQuickStatusChange: (taskId: string, status: TaskStatus) => void;
  onRescheduleToToday: (taskId: string) => void;
}

const PRIORITY_STYLES: Record<TaskPriority, { bg: string; text: string }> = {
  LOW: { bg: 'bg-slate-400/10 border-slate-400/20', text: 'text-slate-400' },
  MEDIUM: { bg: 'bg-sky-400/10 border-sky-400/20', text: 'text-sky-400' },
  HIGH: { bg: 'bg-amber-400/10 border-amber-400/20', text: 'text-amber-400' },
  URGENT: { bg: 'bg-rose-400/10 border-rose-400/20', text: 'text-rose-400' }
};

export const AgendaView: React.FC<AgendaViewProps> = ({
  tasks,
  isDarkMode,
  onSelectTask,
  onQuickStatusChange,
  onRescheduleToToday
}) => {
  const cardBase = isDarkMode
    ? 'bg-[#09090B] border-white/10 text-white shadow-[0_16px_40px_rgba(0,0,0,0.6)] backdrop-blur-2xl'
    : 'bg-white border-slate-200/80 shadow-sm text-slate-900';

  // Grouping buckets
  const now = new Date();
  const tomorrow = new Date();
  tomorrow.setDate(now.getDate() + 1);

  const overdueList: Task[] = [];
  const todayList: Task[] = [];
  const tomorrowList: Task[] = [];
  const upcomingList: Task[] = [];
  const unscheduledList: Task[] = [];

  for (const t of tasks) {
    if (t.status === 'CANCELLED') continue;
    const d = getTaskDate(t);
    if (!d) {
      unscheduledList.push(t);
    } else if (isTaskOverdue(t)) {
      overdueList.push(t);
    } else if (isToday(d)) {
      todayList.push(t);
    } else if (
      d.getFullYear() === tomorrow.getFullYear() &&
      d.getMonth() === tomorrow.getMonth() &&
      d.getDate() === tomorrow.getDate()
    ) {
      tomorrowList.push(t);
    } else {
      upcomingList.push(t);
    }
  }

  // Sort by date
  upcomingList.sort((a, b) => {
    const da = getTaskDate(a)?.getTime() || 0;
    const db = getTaskDate(b)?.getTime() || 0;
    return da - db;
  });

  const renderSection = (title: string, list: Task[], alert?: boolean) => {
    if (list.length === 0) return null;

    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <h3
            className={`text-xs font-mono font-bold uppercase tracking-wider flex items-center gap-2 ${
              alert ? 'text-rose-400' : isDarkMode ? 'text-slate-300' : 'text-slate-700'
            }`}
          >
            {alert && <AlertTriangle className="w-3.5 h-3.5" />}
            <span>{title}</span>
            <span
              className={`px-2 py-0.2 rounded-full text-[10px] ${
                alert
                  ? 'bg-rose-500/20 text-rose-300'
                  : isDarkMode
                    ? 'bg-white/10 text-slate-300'
                    : 'bg-slate-100 text-slate-600'
              }`}
            >
              {list.length}
            </span>
          </h3>
        </div>

        <div className="space-y-2">
          {list.map((task) => {
            const isDone = task.status === 'DONE';
            const priorityStyle = PRIORITY_STYLES[task.priority];
            const date = getTaskDate(task);

            return (
              <div
                key={task.id}
                onClick={() => onSelectTask(task)}
                className={`p-3.5 sm:p-4 rounded-2xl border transition-all cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3 group hover:border-[var(--accent-primary)]/50 ${
                  isDone
                    ? 'opacity-60 line-through bg-white/[0.01] border-white/5'
                    : isDarkMode
                      ? 'bg-black/30 border-white/[0.08] hover:bg-white/[0.02]'
                      : 'bg-slate-50/80 border-slate-200 hover:bg-white'
                }`}
              >
                <div className="space-y-1.5 flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`px-2 py-0.5 rounded-md text-[10px] font-mono font-bold border ${priorityStyle.bg} ${priorityStyle.text}`}>
                      {task.priority}
                    </span>
                    <span className="text-xs font-mono px-2 py-0.5 rounded-md bg-white/5 text-slate-400">
                      {task.status}
                    </span>
                    {task.section && (
                      <span className="text-xs font-mono text-slate-400">
                        • {task.section}
                      </span>
                    )}
                  </div>

                  <h4 className="text-xs sm:text-sm font-bold truncate">
                    {task.title}
                  </h4>

                  {task.description && (
                    <p className="text-xs text-slate-400 line-clamp-1">
                      {task.description}
                    </p>
                  )}
                </div>

                {/* Right: Date, Assignee & Quick Actions */}
                <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-white/5">
                  <div className="text-left sm:text-right font-mono text-xs">
                    {date ? (
                      <div className="flex items-center gap-1 text-slate-300">
                        <CalendarIcon className="w-3 h-3 text-slate-400" />
                        <span>{date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}</span>
                        <span className="opacity-60">{date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                    ) : (
                      <span className="text-amber-400/80">Unscheduled</span>
                    )}

                    <div className="flex items-center gap-1 text-[11px] text-slate-400 mt-0.5">
                      <User className="w-3 h-3" />
                      <span>{task.assignees.map((a) => a.name).join(', ') || 'Unassigned'}</span>
                    </div>
                  </div>

                  {/* Quick Action Pill */}
                  <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                    {!isDone ? (
                      <button
                        type="button"
                        onClick={() => onQuickStatusChange(task.id, 'DONE')}
                        className="px-2.5 py-1 rounded-xl text-xs font-semibold bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/25 transition-ui cursor-pointer"
                      >
                        Done
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => onQuickStatusChange(task.id, 'TODO')}
                        className="px-2.5 py-1 rounded-xl text-xs font-semibold border border-white/10 text-slate-400 hover:text-white transition-ui cursor-pointer"
                      >
                        Reopen
                      </button>
                    )}

                    {!date && (
                      <button
                        type="button"
                        onClick={() => onRescheduleToToday(task.id)}
                        className="px-2.5 py-1 rounded-xl text-xs font-semibold bg-[var(--accent-primary)]/15 border border-[var(--accent-primary)]/30 text-[var(--accent-primary)] hover:bg-[var(--accent-primary)]/25 transition-ui cursor-pointer"
                      >
                        Today
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className={`p-4 sm:p-6 rounded-3xl border space-y-6 transition-ui ${cardBase}`}>
      {renderSection('Overdue Tasks', overdueList, true)}
      {renderSection('Due Today', todayList)}
      {renderSection('Due Tomorrow', tomorrowList)}
      {renderSection('Upcoming Tasks', upcomingList)}
      {renderSection('Unscheduled Tasks', unscheduledList)}

      {tasks.length === 0 && (
        <div className="py-16 text-center text-xs font-mono text-slate-400">
          No tasks match the active filters or search criteria.
        </div>
      )}
    </div>
  );
};

export default AgendaView;
