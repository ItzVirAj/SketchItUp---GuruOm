import React, { useState } from 'react';
import {
  getMonthDays,
  isSameDay,
  isToday,
  detectConflictsForDate,
  getTaskDate,
  isTaskOverdue
} from './calendarUtils';
import { Task, TaskPriority } from '../../../../services/consoleApiServices';
import { AlertTriangle, Clock, AlertCircle, Plus } from 'lucide-react';

interface MonthViewProps {
  currentDate: Date;
  tasks: Task[];
  isDarkMode: boolean;
  onSelectTask: (task: Task) => void;
  onDateClick: (d: Date) => void;
  onRescheduleTask: (taskId: string, targetDate: Date) => void;
}

const WEEK_DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const PRIORITY_DOTS: Record<TaskPriority, string> = {
  LOW: 'bg-slate-400',
  MEDIUM: 'bg-sky-400',
  HIGH: 'bg-amber-400',
  URGENT: 'bg-rose-500 animate-pulse'
};

export const MonthView: React.FC<MonthViewProps> = ({
  currentDate,
  tasks,
  isDarkMode,
  onSelectTask,
  onDateClick,
  onRescheduleTask
}) => {
  const monthDays = getMonthDays(currentDate);
  const currentMonthIdx = currentDate.getMonth();
  const [dragOverDate, setDragOverDate] = useState<string | null>(null);

  // Group tasks by date string
  const tasksByDay = new Map<string, Task[]>();
  for (const task of tasks) {
    const d = getTaskDate(task);
    if (!d) continue;
    const key = d.toDateString();
    const list = tasksByDay.get(key) || [];
    list.push(task);
    tasksByDay.set(key, list);
  }

  const handleDragOver = (e: React.DragEvent, dateKey: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverDate !== dateKey) {
      setDragOverDate(dateKey);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOverDate(null);
  };

  const handleDrop = (e: React.DragEvent, targetDate: Date) => {
    e.preventDefault();
    setDragOverDate(null);
    const taskId = e.dataTransfer.getData('text/plain');
    if (taskId) {
      onRescheduleTask(taskId, targetDate);
    }
  };

  return (
    <div
      className={`rounded-3xl border overflow-hidden transition-ui ${
        isDarkMode
          ? 'bg-[#09090B] border-white/10 text-white shadow-[0_20px_50px_rgba(0,0,0,0.7)]'
          : 'bg-white border-slate-200 shadow-sm text-slate-900'
      }`}
    >
      {/* Week Day Header */}
      <div
        className={`grid grid-cols-7 border-b text-center text-[11px] font-mono font-bold uppercase tracking-wider py-2.5 ${
          isDarkMode ? 'border-white/10 bg-white/[0.02] text-slate-400' : 'border-slate-200 bg-slate-50 text-slate-600'
        }`}
      >
        {WEEK_DAYS.map((day) => (
          <div key={day} className="py-0.5">
            {day}
          </div>
        ))}
      </div>

      {/* Month Days Grid */}
      <div className="grid grid-cols-7 auto-rows-fr divide-x divide-y divide-white/5 dark:divide-white/5">
        {monthDays.map((day) => {
          const dateKey = day.toDateString();
          const isCurrentMonth = day.getMonth() === currentMonthIdx;
          const dayIsToday = isToday(day);
          const isDragTarget = dragOverDate === dateKey;
          const dayTasks = tasksByDay.get(dateKey) || [];
          const conflicts = detectConflictsForDate(dayTasks);
          const hasConflict = conflicts.length > 0;

          // Max 3 tasks in cell preview
          const previewTasks = dayTasks.slice(0, 3);
          const extraCount = dayTasks.length - 3;

          return (
            <div
              key={dateKey}
              onDragOver={(e) => handleDragOver(e, dateKey)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, day)}
              onClick={() => onDateClick(day)}
              className={`min-h-[110px] sm:min-h-[125px] p-2 flex flex-col justify-between transition-colors group relative cursor-pointer ${
                !isCurrentMonth
                  ? isDarkMode
                    ? 'bg-black/40 opacity-45'
                    : 'bg-slate-50/50 text-slate-400'
                  : isDarkMode
                    ? 'bg-[#09090B] hover:bg-white/[0.02]'
                    : 'bg-white hover:bg-slate-50/80'
              } ${isDragTarget ? 'ring-2 ring-[var(--accent-primary)] bg-[var(--accent-primary)]/10' : ''}`}
            >
              {/* Day Header: Date Number + Conflict Indicators */}
              <div className="flex items-center justify-between mb-1.5 pointer-events-none">
                <span
                  className={`text-xs font-mono font-bold flex items-center justify-center h-6 w-6 rounded-full transition-transform ${
                    dayIsToday
                      ? 'bg-[var(--accent-primary)] text-white shadow-sm scale-105'
                      : isCurrentMonth
                        ? isDarkMode
                          ? 'text-slate-300'
                          : 'text-slate-800'
                        : 'text-slate-500'
                  }`}
                >
                  {day.getDate()}
                </span>

                <div className="flex items-center gap-1">
                  {hasConflict && (
                    <span
                      title={conflicts.map((c) => c.message).join('\n')}
                      className="p-0.5 rounded-md bg-amber-500/15 text-amber-400 border border-amber-500/30"
                    >
                      <AlertTriangle className="w-3 h-3" />
                    </span>
                  )}

                  {/* Plus icon visible on hover to indicate quick add */}
                  <span className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 rounded text-slate-400 hover:text-white">
                    <Plus className="w-3.5 h-3.5" />
                  </span>
                </div>
              </div>

              {/* Task Items List */}
              <div className="space-y-1 flex-1 overflow-hidden" onClick={(e) => e.stopPropagation()}>
                {previewTasks.map((task) => {
                  const overdue = isTaskOverdue(task);
                  const isDone = task.status === 'DONE';

                  return (
                    <div
                      key={task.id}
                      draggable
                      onDragStart={(e) => {
                        e.dataTransfer.setData('text/plain', task.id);
                        e.dataTransfer.effectAllowed = 'move';
                      }}
                      onClick={() => onSelectTask(task)}
                      className={`px-2 py-1 rounded-lg border text-[11px] font-medium flex items-center justify-between gap-1.5 cursor-grab active:cursor-grabbing transition-all hover:scale-[1.01] select-none ${
                        isDone
                          ? isDarkMode
                            ? 'bg-white/[0.03] border-white/5 text-slate-400 line-through'
                            : 'bg-slate-100 border-slate-200 text-slate-400 line-through'
                          : overdue
                            ? isDarkMode
                              ? 'bg-rose-500/15 border-rose-500/30 text-rose-300'
                              : 'bg-rose-50 border-rose-200 text-rose-800'
                            : isDarkMode
                              ? 'bg-white/[0.05] border-white/10 hover:border-[var(--accent-primary)]/50 text-slate-200'
                              : 'bg-slate-50 border-slate-200 hover:border-[var(--accent-primary)]/50 text-slate-800'
                      }`}
                    >
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${PRIORITY_DOTS[task.priority]}`} />
                        <span className="truncate font-semibold">{task.title}</span>
                      </div>

                      {task.assignees.length > 0 && (
                        <span
                          title={task.assignees.map((a) => a.name).join(', ')}
                          className="shrink-0 text-[9px] font-mono font-bold px-1 rounded bg-black/30 dark:bg-white/10 text-slate-300"
                        >
                          {task.assignees[0].name?.slice(0, 1) || 'T'}
                        </span>
                      )}
                    </div>
                  );
                })}

                {extraCount > 0 && (
                  <div
                    onClick={() => onDateClick(day)}
                    className="text-[10px] font-mono text-[var(--accent-primary)] hover:underline cursor-pointer pt-0.5 px-1 font-bold"
                  >
                    +{extraCount} more task{extraCount === 1 ? '' : 's'}
                  </div>
                )}
              </div>

              {/* Subtle bottom indicator */}
              <div className="h-0.5 w-full mt-1" />
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default MonthView;
