import React, { useState } from 'react';
import {
  getWeekDays,
  isSameDay,
  isToday,
  formatTimeSlot,
  getTaskDate,
  isTaskOverdue
} from './calendarUtils';
import { Task, TaskPriority } from '../../../../services/consoleApiServices';
import { Clock, Plus } from 'lucide-react';

interface WeekViewProps {
  currentDate: Date;
  tasks: Task[];
  isDarkMode: boolean;
  onSelectTask: (task: Task) => void;
  onDateClick: (d: Date) => void;
  onRescheduleTask: (taskId: string, targetDate: Date) => void;
}

const HOURS = Array.from({ length: 13 }, (_, i) => i + 8); // 8 AM to 8 PM

const PRIORITY_STYLES: Record<TaskPriority, { dark: string; light: string; dot: string }> = {
  LOW: {
    dark: 'bg-slate-500/15 text-slate-300 border-slate-500/30',
    light: 'bg-slate-100 text-slate-600 border-slate-200',
    dot: 'bg-slate-400'
  },
  MEDIUM: {
    dark: 'bg-sky-500/15 text-sky-300 border-sky-500/30',
    light: 'bg-sky-50 text-sky-700 border-sky-200',
    dot: 'bg-sky-400'
  },
  HIGH: {
    dark: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
    light: 'bg-amber-50 text-amber-700 border-amber-200',
    dot: 'bg-amber-400'
  },
  URGENT: {
    dark: 'bg-rose-500/15 text-rose-300 border-rose-500/30',
    light: 'bg-rose-50 text-rose-700 border-rose-200',
    dot: 'bg-rose-500 animate-pulse'
  }
};

export const WeekView: React.FC<WeekViewProps> = ({
  currentDate,
  tasks,
  isDarkMode,
  onSelectTask,
  onDateClick,
  onRescheduleTask
}) => {
  const weekDays = getWeekDays(currentDate);
  const [dragOverKey, setDragOverKey] = useState<string | null>(null);

  const cardBase = isDarkMode
    ? 'bg-[#09090B] border-white/10 text-white shadow-[0_20px_50px_rgba(0,0,0,0.7)]'
    : 'bg-white border-slate-200 shadow-sm text-slate-900';

  const handleDrop = (e: React.DragEvent, day: Date, hour: number) => {
    e.preventDefault();
    setDragOverKey(null);
    const taskId = e.dataTransfer.getData('text/plain');
    if (taskId) {
      const target = new Date(day);
      target.setHours(hour, 0, 0, 0);
      onRescheduleTask(taskId, target);
    }
  };

  return (
    <div className={`rounded-3xl border overflow-hidden transition-ui ${cardBase}`}>
      {/* ── Week Days Header ── */}
      <div className="grid grid-cols-8 border-b border-white/10 divide-x divide-white/5">
        <div className={`p-3 text-center text-xs font-mono font-bold text-slate-500 flex items-center justify-center ${isDarkMode ? 'bg-white/[0.02]' : 'bg-slate-50'}`}>
          Time
        </div>
        {weekDays.map((day) => {
          const dayIsToday = isToday(day);
          return (
            <div
              key={day.toDateString()}
              onClick={() => onDateClick(day)}
              className={`p-3 text-center cursor-pointer transition-colors ${
                dayIsToday
                  ? isDarkMode
                    ? 'bg-[var(--accent-primary)]/10'
                    : 'bg-sky-50'
                  : isDarkMode
                    ? 'bg-white/[0.01] hover:bg-white/[0.03]'
                    : 'bg-white hover:bg-slate-50'
              }`}
            >
              <div className={`text-[11px] font-mono uppercase font-bold ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                {day.toLocaleDateString('en-IN', { weekday: 'short' })}
              </div>
              <div
                className={`text-sm font-bold font-mono inline-flex items-center justify-center h-7 w-7 rounded-full mt-1 ${
                  dayIsToday
                    ? 'bg-[var(--accent-primary)] text-white shadow-sm'
                    : isDarkMode
                      ? 'text-slate-200'
                      : 'text-slate-800'
                }`}
              >
                {day.getDate()}
              </div>
            </div>
          );
        })}
      </div>

      {/* ── All-Day Task Strip ── */}
      <div className="grid grid-cols-8 border-b border-white/10 divide-x divide-white/5 min-h-[46px] bg-white/[0.01]">
        <div className="p-2 text-[10px] font-mono uppercase font-bold text-slate-500 flex items-center justify-center">
          All-Day
        </div>
        {weekDays.map((day) => {
          const dayTasks = tasks.filter((t) => {
            const d = getTaskDate(t);
            return d && isSameDay(d, day);
          });

          return (
            <div
              key={`allday-${day.toDateString()}`}
              onDragOver={(e) => {
                e.preventDefault();
                setDragOverKey(`allday-${day.toDateString()}`);
              }}
              onDragLeave={() => setDragOverKey(null)}
              onDrop={(e) => handleDrop(e, day, 17)}
              onClick={() => onDateClick(day)}
              className={`p-1.5 space-y-1 cursor-pointer transition-colors ${
                dragOverKey === `allday-${day.toDateString()}`
                  ? 'bg-[var(--accent-primary)]/20'
                  : ''
              }`}
            >
              {dayTasks.map((task) => (
                <div
                  key={task.id}
                  draggable
                  onDragStart={(e) => {
                    e.dataTransfer.setData('text/plain', task.id);
                    e.dataTransfer.effectAllowed = 'move';
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectTask(task);
                  }}
                  className={`px-2 py-1 rounded-md border text-[10.5px] font-semibold truncate cursor-grab active:cursor-grabbing hover:scale-[1.01] transition-transform ${
                    task.status === 'DONE'
                      ? 'opacity-50 line-through'
                      : isTaskOverdue(task)
                        ? 'border-rose-500/40 bg-rose-500/15 text-rose-300'
                        : isDarkMode
                          ? 'border-white/10 bg-white/[0.05] text-slate-200'
                          : 'border-slate-200 bg-slate-100 text-slate-800'
                  }`}
                >
                  {task.title}
                </div>
              ))}
            </div>
          );
        })}
      </div>

      {/* ── Hourly Time Grid ── */}
      <div className="max-h-[640px] overflow-y-auto divide-y divide-white/5">
        {HOURS.map((hour) => (
          <div key={hour} className="grid grid-cols-8 divide-x divide-white/5 min-h-[58px]">
            {/* Hour Label */}
            <div className="p-2 text-center text-[10px] font-mono text-slate-500 select-none">
              {formatTimeSlot(hour)}
            </div>

            {/* Day columns for this hour */}
            {weekDays.map((day) => {
              const cellKey = `${day.toDateString()}-${hour}`;
              const isCellTarget = dragOverKey === cellKey;

              const slotTasks = tasks.filter((t) => {
                const d = getTaskDate(t);
                return d && isSameDay(d, day) && d.getHours() === hour;
              });

              return (
                <div
                  key={cellKey}
                  onDragOver={(e) => {
                    e.preventDefault();
                    setDragOverKey(cellKey);
                  }}
                  onDragLeave={() => setDragOverKey(null)}
                  onDrop={(e) => handleDrop(e, day, hour)}
                  onClick={() => {
                    const target = new Date(day);
                    target.setHours(hour, 0, 0, 0);
                    onDateClick(target);
                  }}
                  className={`p-1 space-y-1 relative group cursor-pointer transition-colors ${
                    isCellTarget
                      ? 'bg-[var(--accent-primary)]/20 ring-1 ring-[var(--accent-primary)]'
                      : isDarkMode
                        ? 'hover:bg-white/[0.02]'
                        : 'hover:bg-slate-50'
                  }`}
                >
                  {slotTasks.map((task) => {
                    const priorityStyle = PRIORITY_STYLES[task.priority];
                    const overdue = isTaskOverdue(task);

                    return (
                      <div
                        key={task.id}
                        draggable
                        onDragStart={(e) => {
                          e.dataTransfer.setData('text/plain', task.id);
                          e.dataTransfer.effectAllowed = 'move';
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectTask(task);
                        }}
                        className={`p-1.5 rounded-xl border text-[11px] font-semibold cursor-grab active:cursor-grabbing hover:scale-[1.01] transition-all select-none shadow-xs ${
                          task.status === 'DONE'
                            ? 'opacity-50 line-through'
                            : overdue
                              ? 'border-rose-500/40 bg-rose-500/15 text-rose-300'
                              : isDarkMode
                                ? `${priorityStyle.dark}`
                                : `${priorityStyle.light}`
                        }`}
                      >
                        <div className="flex items-center gap-1.5">
                          <span className={`w-1.5 h-1.5 rounded-full ${priorityStyle.dot}`} />
                          <span className="truncate">{task.title}</span>
                        </div>
                        <div className="flex items-center justify-between text-[9.5px] font-mono mt-1 opacity-70">
                          <span>{task.section || 'General'}</span>
                          {task.assignees[0] && <span>{task.assignees[0].name}</span>}
                        </div>
                      </div>
                    );
                  })}

                  <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute right-1 bottom-1 text-slate-400">
                    <Plus className="w-3 h-3" />
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
};

export default WeekView;
