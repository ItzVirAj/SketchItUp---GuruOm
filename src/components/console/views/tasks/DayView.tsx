import React, { useState } from 'react';
import {
  isSameDay,
  isToday,
  formatTimeSlot,
  formatDayHeader,
  getTaskDate,
  isTaskOverdue,
  detectConflictsForDate
} from './calendarUtils';
import { Task, TaskPriority } from '../../../../services/consoleApiServices';
import { Clock, AlertTriangle, CheckCircle2, User, Plus, Calendar } from 'lucide-react';

interface DayViewProps {
  currentDate: Date;
  tasks: Task[];
  isDarkMode: boolean;
  onSelectTask: (task: Task) => void;
  onDateClick: (d: Date) => void;
  onRescheduleTask: (taskId: string, targetDate: Date) => void;
}

const HOURS = Array.from({ length: 13 }, (_, i) => i + 8); // 8 AM to 8 PM

const PRIORITY_BADGES: Record<TaskPriority, { text: string; bg: string }> = {
  LOW: { text: 'text-slate-400', bg: 'bg-slate-400/10 border-slate-400/20' },
  MEDIUM: { text: 'text-sky-400', bg: 'bg-sky-400/10 border-sky-400/20' },
  HIGH: { text: 'text-amber-400', bg: 'bg-amber-400/10 border-amber-400/20' },
  URGENT: { text: 'text-rose-400', bg: 'bg-rose-400/10 border-rose-400/20' }
};

export const DayView: React.FC<DayViewProps> = ({
  currentDate,
  tasks,
  isDarkMode,
  onSelectTask,
  onDateClick,
  onRescheduleTask
}) => {
  const [dragOverHour, setDragOverHour] = useState<number | null>(null);

  const cardBase = isDarkMode
    ? 'bg-[#09090B] border-white/10 text-white shadow-[0_20px_50px_rgba(0,0,0,0.7)]'
    : 'bg-white border-slate-200 shadow-sm text-slate-900';

  // Tasks scheduled for this day
  const dayTasks = tasks.filter((t) => {
    const d = getTaskDate(t);
    return d && isSameDay(d, currentDate);
  });

  const conflicts = detectConflictsForDate(dayTasks);
  const completedCount = dayTasks.filter((t) => t.status === 'DONE').length;
  const overdueCount = dayTasks.filter(isTaskOverdue).length;

  const handleDrop = (e: React.DragEvent, hour: number) => {
    e.preventDefault();
    setDragOverHour(null);
    const taskId = e.dataTransfer.getData('text/plain');
    if (taskId) {
      const target = new Date(currentDate);
      target.setHours(hour, 0, 0, 0);
      onRescheduleTask(taskId, target);
    }
  };

  return (
    <div className={`rounded-3xl border overflow-hidden transition-ui ${cardBase}`}>
      {/* ── Day Summary Header ── */}
      <div className="p-4 sm:p-5 border-b border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-lg sm:text-xl font-bold tracking-tight">
              {formatDayHeader(currentDate)}
            </h3>
            {isToday(currentDate) && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase bg-[var(--accent-primary)]/15 text-[var(--accent-primary)] border border-[var(--accent-primary)]/30">
                Today
              </span>
            )}
          </div>
          <p className="text-xs text-slate-400 mt-1">
            {dayTasks.length} task{dayTasks.length === 1 ? '' : 's'} scheduled for this date.
          </p>
        </div>

        <div className="flex items-center gap-2.5 font-mono text-xs">
          <span className={`px-3 py-1 rounded-xl border ${isDarkMode ? 'border-white/10 bg-white/[0.02]' : 'border-slate-200 bg-slate-50'}`}>
            Total: <b>{dayTasks.length}</b>
          </span>
          <span className="px-3 py-1 rounded-xl border border-emerald-500/20 bg-emerald-500/10 text-emerald-400 font-bold">
            Done: {completedCount}
          </span>
          {overdueCount > 0 && (
            <span className="px-3 py-1 rounded-xl border border-rose-500/20 bg-rose-500/10 text-rose-400 font-bold flex items-center gap-1">
              <AlertTriangle className="w-3 h-3" /> Overdue: {overdueCount}
            </span>
          )}
        </div>
      </div>

      {/* ── Conflict Awareness Callouts ── */}
      {conflicts.length > 0 && (
        <div className="p-3 bg-amber-500/10 border-b border-amber-500/20 space-y-1">
          {conflicts.map((c, idx) => (
            <div key={idx} className="flex items-center gap-2 text-xs font-semibold text-amber-300">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
              <span>{c.message}</span>
            </div>
          ))}
        </div>
      )}

      {/* ── Hourly Timeline Rows ── */}
      <div className="divide-y divide-white/5 max-h-[700px] overflow-y-auto">
        {HOURS.map((hour) => {
          const isTarget = dragOverHour === hour;
          const slotTasks = dayTasks.filter((t) => {
            const d = getTaskDate(t);
            return d && d.getHours() === hour;
          });

          return (
            <div
              key={hour}
              onDragOver={(e) => {
                e.preventDefault();
                setDragOverHour(hour);
              }}
              onDragLeave={() => setDragOverHour(null)}
              onDrop={(e) => handleDrop(e, hour)}
              onClick={() => {
                const target = new Date(currentDate);
                target.setHours(hour, 0, 0, 0);
                onDateClick(target);
              }}
              className={`flex items-start gap-4 p-3.5 sm:p-4 transition-colors cursor-pointer group ${
                isTarget
                  ? 'bg-[var(--accent-primary)]/15'
                  : isDarkMode
                    ? 'hover:bg-white/[0.015]'
                    : 'hover:bg-slate-50'
              }`}
            >
              {/* Hour Column */}
              <div className="w-20 shrink-0 text-xs font-mono text-slate-400 font-bold select-none pt-1">
                {formatTimeSlot(hour)}
              </div>

              {/* Tasks in this hour */}
              <div className="flex-1 space-y-2.5" onClick={(e) => e.stopPropagation()}>
                {slotTasks.map((task) => {
                  const badge = PRIORITY_BADGES[task.priority];
                  const overdue = isTaskOverdue(task);

                  return (
                    <div
                      key={task.id}
                      draggable
                      onDragStart={(e) => {
                        e.dataTransfer.setData('text/plain', task.id);
                        e.dataTransfer.effectAllowed = 'move';
                      }}
                      onClick={() => onSelectTask(task)}
                      className={`p-3.5 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-grab active:cursor-grabbing hover:scale-[1.005] transition-all select-none ${
                        task.status === 'DONE'
                          ? 'opacity-60 bg-white/[0.02] border-white/5 line-through'
                          : overdue
                            ? 'border-rose-500/30 bg-rose-500/10'
                            : isDarkMode
                              ? 'border-white/10 bg-white/[0.04] hover:border-[var(--accent-primary)]/40'
                              : 'border-slate-200 bg-slate-50/80 hover:border-[var(--accent-primary)]/40'
                      }`}
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-0.5 rounded-md text-[10px] font-mono font-bold border ${badge.bg} ${badge.text}`}>
                            {task.priority}
                          </span>
                          <h4 className="text-xs sm:text-sm font-bold">{task.title}</h4>
                        </div>
                        {task.description && (
                          <p className="text-xs text-slate-400 line-clamp-1">{task.description}</p>
                        )}
                      </div>

                      <div className="flex items-center gap-3 shrink-0 text-xs">
                        {task.section && (
                          <span className="px-2.5 py-0.5 rounded-xl border border-white/10 text-[11px] font-mono text-slate-300">
                            {task.section}
                          </span>
                        )}

                        <div className="flex items-center gap-1 text-slate-300 font-mono text-xs">
                          <User className="w-3.5 h-3.5 opacity-60" />
                          <span>{task.assignees.map((a) => a.name).join(', ') || 'Unassigned'}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}

                {slotTasks.length === 0 && (
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity text-xs font-mono text-slate-500 flex items-center gap-1 pt-1">
                    <Plus className="w-3 h-3 text-[var(--accent-primary)]" />
                    <span>Click to schedule task at {formatTimeSlot(hour)}</span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default DayView;
