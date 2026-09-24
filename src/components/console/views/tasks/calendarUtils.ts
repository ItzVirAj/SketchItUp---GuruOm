import { Task, TaskPriority } from '../../../../services/consoleApiServices';
import { SystemUser } from '../../../../types/console';

export type CalendarViewMode = 'month' | 'week' | 'day' | 'agenda';

export interface TaskConflict {
  type: 'overloaded_assignee' | 'multiple_urgent' | 'overlapping_times' | 'overdue';
  message: string;
  severity: 'warning' | 'error' | 'info';
  taskIds: string[];
}

export interface SchedulingPreset {
  id: string;
  label: string;
  getDate: () => Date;
}

/**
 * Common Categories / Sections for tasks in GuruOm
 */
export const TASK_CATEGORIES = [
  'Operations',
  'Quality Control',
  'Purchasing & Procurement',
  'Maintenance & Tooling',
  'Human Resources',
  'Administrative & Compliance',
  'Engineering & Design'
] as const;

/**
 * Quick scheduling presets
 */
export const SCHEDULING_PRESETS: SchedulingPreset[] = [
  {
    id: 'today',
    label: 'Today (5 PM)',
    getDate: () => {
      const d = new Date();
      d.setHours(17, 0, 0, 0);
      return d;
    }
  },
  {
    id: 'tomorrow',
    label: 'Tomorrow (5 PM)',
    getDate: () => {
      const d = new Date();
      d.setDate(d.getDate() + 1);
      d.setHours(17, 0, 0, 0);
      return d;
    }
  },
  {
    id: 'end_of_week',
    label: 'This Friday (5 PM)',
    getDate: () => {
      const d = new Date();
      const day = d.getDay();
      const diff = (5 - day + 7) % 7 || 7;
      d.setDate(d.getDate() + diff);
      d.setHours(17, 0, 0, 0);
      return d;
    }
  },
  {
    id: 'next_week',
    label: 'Next Friday',
    getDate: () => {
      const d = new Date();
      const day = d.getDay();
      const diff = ((5 - day + 7) % 7 || 7) + 7;
      d.setDate(d.getDate() + diff);
      d.setHours(17, 0, 0, 0);
      return d;
    }
  }
];

export function isSameDay(d1: Date, d2: Date): boolean {
  return (
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate()
  );
}

export function isToday(d: Date): boolean {
  return isSameDay(d, new Date());
}

export function startOfDay(d: Date): Date {
  const res = new Date(d);
  res.setHours(0, 0, 0, 0);
  return res;
}

export function endOfDay(d: Date): Date {
  const res = new Date(d);
  res.setHours(23, 59, 59, 999);
  return res;
}

export function getMonthDays(currentDate: Date): Date[] {
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  // First day of current month
  const firstDay = new Date(year, month, 1);
  // Last day of current month
  const lastDay = new Date(year, month + 1, 0);

  // We start on Monday (1) or Sunday (0). Let's use Monday as standard manufacturing work week.
  const startDayOfWeek = (firstDay.getDay() + 6) % 7; // Monday = 0
  const days: Date[] = [];

  // Previous month trailing days
  for (let i = startDayOfWeek; i > 0; i--) {
    days.push(new Date(year, month, 1 - i));
  }

  // Days of month
  for (let i = 1; i <= lastDay.getDate(); i++) {
    days.push(new Date(year, month, i));
  }

  // Next month leading days to complete grid (42 days total for 6 rows)
  const remaining = 42 - days.length;
  for (let i = 1; i <= remaining; i++) {
    days.push(new Date(year, month + 1, i));
  }

  return days;
}

export function getWeekDays(currentDate: Date): Date[] {
  const d = new Date(currentDate);
  const day = (d.getDay() + 6) % 7; // Monday = 0
  d.setDate(d.getDate() - day);
  d.setHours(0, 0, 0, 0);

  const week: Date[] = [];
  for (let i = 0; i < 7; i++) {
    const next = new Date(d);
    next.setDate(d.getDate() + i);
    week.push(next);
  }
  return week;
}

export function formatMonthYear(d: Date): string {
  return d.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
}

export function formatDayHeader(d: Date): string {
  return d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });
}

export function formatTimeSlot(hour: number): string {
  const h = hour % 12 || 12;
  const ampm = hour < 12 ? 'AM' : 'PM';
  return `${h}:00 ${ampm}`;
}

export function getTaskDate(task: Task): Date | null {
  if (!task.dueDate) return null;
  const d = new Date(task.dueDate);
  return isNaN(d.getTime()) ? null : d;
}

export function isTaskOverdue(task: Task): boolean {
  if (!task.dueDate || task.status === 'DONE' || task.status === 'CANCELLED') return false;
  return new Date(task.dueDate).getTime() < Date.now();
}

/**
 * Detect operational scheduling conflicts
 */
export function detectConflictsForDate(tasksForDay: Task[]): TaskConflict[] {
  const conflicts: TaskConflict[] = [];

  // 1. Assignee overload (> 3 tasks on same day)
  const assigneeCounts: Record<string, { name: string; taskIds: string[] }> = {};
  for (const t of tasksForDay) {
    if (t.status === 'DONE' || t.status === 'CANCELLED') continue;
    for (const a of t.assignees) {
      if (!assigneeCounts[a.userId]) {
        assigneeCounts[a.userId] = { name: a.name || 'Teammate', taskIds: [] };
      }
      assigneeCounts[a.userId].taskIds.push(t.id);
    }
  }

  for (const info of Object.values(assigneeCounts)) {
    if (info.taskIds.length >= 4) {
      conflicts.push({
        type: 'overloaded_assignee',
        message: `${info.name} has ${info.taskIds.length} tasks scheduled today (capacity alert).`,
        severity: 'warning',
        taskIds: info.taskIds
      });
    }
  }

  // 2. Multiple urgent / high priority tasks on same day
  const urgentTasks = tasksForDay.filter(
    (t) => (t.priority === 'URGENT' || t.priority === 'HIGH') && t.status !== 'DONE' && t.status !== 'CANCELLED'
  );
  if (urgentTasks.length >= 3) {
    conflicts.push({
      type: 'multiple_urgent',
      message: `${urgentTasks.length} High/Urgent priority tasks scheduled for this day.`,
      severity: 'error',
      taskIds: urgentTasks.map((t) => t.id)
    });
  }

  // 3. Overdue tasks
  const overdueTasks = tasksForDay.filter(isTaskOverdue);
  if (overdueTasks.length > 0) {
    conflicts.push({
      type: 'overdue',
      message: `${overdueTasks.length} task${overdueTasks.length === 1 ? '' : 's'} past due deadline.`,
      severity: 'error',
      taskIds: overdueTasks.map((t) => t.id)
    });
  }

  return conflicts;
}

/**
 * Helper to compute team capacity metrics
 */
export function computeTeamWorkload(tasks: Task[], users: SystemUser[]) {
  const activeTasks = tasks.filter((t) => t.status !== 'CANCELLED');
  const now = Date.now();

  const userStats = users.map((user) => {
    const assigned = activeTasks.filter((t) => t.assignees.some((a) => a.userId === user.id));
    const pending = assigned.filter((t) => t.status !== 'DONE');
    const done = assigned.filter((t) => t.status === 'DONE');
    const overdue = assigned.filter(isTaskOverdue);
    const highPriority = assigned.filter((t) => (t.priority === 'HIGH' || t.priority === 'URGENT') && t.status !== 'DONE');
    const dueToday = assigned.filter((t) => {
      const td = getTaskDate(t);
      return td && isToday(td) && t.status !== 'DONE';
    });

    const isOverloaded = pending.length >= 6 || dueToday.length >= 4;

    return {
      user,
      total: assigned.length,
      pending: pending.length,
      completed: done.length,
      overdue: overdue.length,
      highPriority: highPriority.length,
      dueToday: dueToday.length,
      isOverloaded
    };
  });

  return userStats.sort((a, b) => b.pending - a.pending);
}
