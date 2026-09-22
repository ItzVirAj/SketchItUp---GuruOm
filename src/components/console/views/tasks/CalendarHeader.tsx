import React from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  Search,
  Filter,
  Users,
  AlertTriangle,
  Clock,
  Inbox,
  Plus,
  BarChart2,
  X
} from 'lucide-react';
import { CalendarViewMode, formatMonthYear } from './calendarUtils';
import { TaskPriority, TaskStatus } from '../../../../services/consoleApiServices';
import { SystemUser } from '../../../../types/console';

interface CalendarHeaderProps {
  currentDate: Date;
  viewMode: CalendarViewMode;
  onViewModeChange: (mode: CalendarViewMode) => void;
  onNavigatePrev: () => void;
  onNavigateNext: () => void;
  onNavigateToday: () => void;
  onDateSelect: (d: Date) => void;
  isDarkMode: boolean;

  // Filter States
  searchQuery: string;
  onSearchChange: (q: string) => void;
  selectedAssigneeId: string;
  onAssigneeChange: (id: string) => void;
  selectedPriority: string;
  onPriorityChange: (p: string) => void;
  selectedStatus: string;
  onStatusChange: (s: string) => void;
  myTasksOnly: boolean;
  onMyTasksOnlyToggle: () => void;
  overdueOnly: boolean;
  onOverdueOnlyToggle: () => void;

  // Counts & Toggles
  overdueCount: number;
  dueTodayCount: number;
  unscheduledCount: number;
  isWorkloadOpen: boolean;
  onToggleWorkload: () => void;
  isUnscheduledOpen: boolean;
  onToggleUnscheduled: () => void;
  canManageTasks: boolean;
  onOpenCreateTask: () => void;
  users: SystemUser[];
}

export const CalendarHeader: React.FC<CalendarHeaderProps> = ({
  currentDate,
  viewMode,
  onViewModeChange,
  onNavigatePrev,
  onNavigateNext,
  onNavigateToday,
  onDateSelect,
  isDarkMode,
  searchQuery,
  onSearchChange,
  selectedAssigneeId,
  onAssigneeChange,
  selectedPriority,
  onPriorityChange,
  selectedStatus,
  onStatusChange,
  myTasksOnly,
  onMyTasksOnlyToggle,
  overdueOnly,
  onOverdueOnlyToggle,
  overdueCount,
  dueTodayCount,
  unscheduledCount,
  isWorkloadOpen,
  onToggleWorkload,
  isUnscheduledOpen,
  onToggleUnscheduled,
  canManageTasks,
  onOpenCreateTask,
  users
}) => {
  const cardBase = isDarkMode
    ? 'bg-[#09090B] border-white/10 text-white shadow-[0_16px_40px_rgba(0,0,0,0.6)] backdrop-blur-2xl'
    : 'bg-white border-slate-200/80 shadow-sm text-slate-900';

  const hasActiveFilters =
    searchQuery.trim().length > 0 ||
    selectedAssigneeId !== '' ||
    selectedPriority !== '' ||
    selectedStatus !== '' ||
    myTasksOnly ||
    overdueOnly;

  const clearAllFilters = () => {
    onSearchChange('');
    onAssigneeChange('');
    onPriorityChange('');
    onStatusChange('');
    if (myTasksOnly) onMyTasksOnlyToggle();
    if (overdueOnly) onOverdueOnlyToggle();
  };

  return (
    <div className={`p-4 sm:p-5 rounded-3xl border space-y-4 transition-ui ${cardBase}`}>
      {/* ── Top Bar: Date navigation, View Switcher & Actions ── */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        {/* Left: Navigation Controls & Title */}
        <div className="flex items-center flex-wrap gap-2.5 sm:gap-3">
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={onNavigateToday}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-ui cursor-pointer active:scale-95 ${
                isDarkMode
                  ? 'border-white/10 bg-white/[0.04] text-slate-200 hover:bg-white/[0.08] hover:text-white'
                  : 'border-slate-200 bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              Today
            </button>

            <div
              className={`flex items-center rounded-xl border p-0.5 ${
                isDarkMode ? 'border-white/10 bg-white/[0.02]' : 'border-slate-200 bg-slate-100'
              }`}
            >
              <button
                type="button"
                onClick={onNavigatePrev}
                aria-label="Previous period"
                className={`p-1.5 rounded-lg transition-ui cursor-pointer ${
                  isDarkMode
                    ? 'text-slate-400 hover:text-white hover:bg-white/10'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white shadow-2xs'
                }`}
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={onNavigateNext}
                aria-label="Next period"
                className={`p-1.5 rounded-lg transition-ui cursor-pointer ${
                  isDarkMode
                    ? 'text-slate-400 hover:text-white hover:bg-white/10'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white shadow-2xs'
                }`}
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <h2 className="text-base sm:text-lg md:text-xl font-bold tracking-tight">
              {formatMonthYear(currentDate)}
            </h2>

            {/* Quick jump to date picker */}
            <label className="relative cursor-pointer inline-flex items-center" title="Jump to date">
              <CalendarIcon className="w-4 h-4 text-[var(--accent-primary)] opacity-70 hover:opacity-100 transition-opacity" />
              <input
                type="date"
                onChange={(e) => {
                  if (e.target.value) {
                    onDateSelect(new Date(e.target.value + 'T00:00:00'));
                  }
                }}
                className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
              />
            </label>
          </div>
        </div>

        {/* Right: View Mode Picker, Productivity Counters & Actions */}
        <div className="flex items-center flex-wrap gap-2.5 sm:gap-3">
          {/* View Mode Segmented Picker */}
          <div
            className={`p-1 rounded-2xl border flex items-center ${
              isDarkMode ? 'bg-black/40 border-white/10' : 'bg-slate-100 border-slate-200'
            }`}
          >
            {(['month', 'week', 'day', 'agenda'] as CalendarViewMode[]).map((mode) => {
              const isActive = viewMode === mode;
              const labels: Record<CalendarViewMode, string> = {
                month: 'Month',
                week: 'Week',
                day: 'Day',
                agenda: 'Agenda'
              };
              return (
                <button
                  key={mode}
                  type="button"
                  onClick={() => onViewModeChange(mode)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold capitalize transition-ui cursor-pointer ${
                    isActive
                      ? 'bg-[var(--accent-primary)] text-white shadow-sm font-bold'
                      : isDarkMode
                        ? 'text-slate-400 hover:text-white'
                        : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {labels[mode]}
                </button>
              );
            })}
          </div>

          {/* Unscheduled Tasks Drawer Trigger */}
          <button
            type="button"
            onClick={onToggleUnscheduled}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold transition-ui cursor-pointer active:scale-95 ${
              isUnscheduledOpen
                ? 'border-[var(--accent-primary)] bg-[var(--accent-primary)] text-white shadow-sm'
                : isDarkMode
                  ? 'border-white/10 bg-white/[0.04] text-slate-300 hover:text-white hover:bg-white/[0.08]'
                  : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
            }`}
          >
            <Inbox className="w-3.5 h-3.5" />
            <span>Unscheduled</span>
            {unscheduledCount > 0 && (
              <span
                className={`ml-0.5 px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold ${
                  isUnscheduledOpen
                    ? 'bg-white/20 text-white'
                    : isDarkMode
                      ? 'bg-amber-500/20 text-amber-300'
                      : 'bg-amber-100 text-amber-800'
                }`}
              >
                {unscheduledCount}
              </span>
            )}
          </button>

          {/* Team Workload Trigger */}
          <button
            type="button"
            onClick={onToggleWorkload}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold transition-ui cursor-pointer active:scale-95 ${
              isWorkloadOpen
                ? 'border-[var(--accent-primary)] bg-[var(--accent-primary)] text-white shadow-sm'
                : isDarkMode
                  ? 'border-white/10 bg-white/[0.04] text-slate-300 hover:text-white hover:bg-white/[0.08]'
                  : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
            }`}
          >
            <BarChart2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Capacity</span>
          </button>

          {/* Quick Create Task */}
          {canManageTasks && (
            <button
              type="button"
              onClick={onOpenCreateTask}
              className="flex h-9 items-center gap-1.5 rounded-xl bg-[var(--accent-primary)] px-3.5 text-xs font-extrabold text-white shadow-[0_6px_16px_var(--accent-shadow)] transition-ui hover:bg-[var(--accent-hover)] active:scale-95 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Schedule Task</span>
            </button>
          )}
        </div>
      </div>

      {/* ── Secondary Filter Bar: Multi-Filter, Search & Chips ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pt-3 border-t border-white/5 dark:border-white/5">
        {/* Search Input */}
        <div className="relative flex-1 max-w-sm">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search task title or description…"
            className={`w-full pl-9 pr-8 py-1.5 rounded-xl border text-xs outline-none transition-ui ${
              isDarkMode
                ? 'border-white/10 bg-white/[0.03] text-white placeholder:text-slate-500 focus:border-[var(--accent-primary)] focus:ring-2 focus:ring-[var(--accent-ring)]'
                : 'border-slate-200 bg-slate-50 text-slate-900 placeholder:text-slate-400 focus:border-[var(--accent-primary)] focus:ring-2 focus:ring-[var(--accent-ring)]'
            }`}
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => onSearchChange('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Dropdown Filters & Quick Filter Chips */}
        <div className="flex items-center flex-wrap gap-2 text-xs">
          {/* Assignee Filter */}
          <select
            value={selectedAssigneeId}
            onChange={(e) => onAssigneeChange(e.target.value)}
            className={`px-2.5 py-1.5 rounded-xl border text-xs outline-none cursor-pointer ${
              isDarkMode
                ? 'border-white/10 bg-[#121216] text-slate-200'
                : 'border-slate-200 bg-white text-slate-800'
            }`}
          >
            <option value="">All Assignees</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name}
              </option>
            ))}
          </select>

          {/* Priority Filter */}
          <select
            value={selectedPriority}
            onChange={(e) => onPriorityChange(e.target.value)}
            className={`px-2.5 py-1.5 rounded-xl border text-xs outline-none cursor-pointer ${
              isDarkMode
                ? 'border-white/10 bg-[#121216] text-slate-200'
                : 'border-slate-200 bg-white text-slate-800'
            }`}
          >
            <option value="">All Priorities</option>
            <option value="URGENT">Urgent</option>
            <option value="HIGH">High</option>
            <option value="MEDIUM">Medium</option>
            <option value="LOW">Low</option>
          </select>

          {/* Status Filter */}
          <select
            value={selectedStatus}
            onChange={(e) => onStatusChange(e.target.value)}
            className={`px-2.5 py-1.5 rounded-xl border text-xs outline-none cursor-pointer ${
              isDarkMode
                ? 'border-white/10 bg-[#121216] text-slate-200'
                : 'border-slate-200 bg-white text-slate-800'
            }`}
          >
            <option value="">All Statuses</option>
            <option value="TODO">To Do</option>
            <option value="IN_PROGRESS">In Progress</option>
            <option value="BLOCKED">Blocked</option>
            <option value="DONE">Done</option>
          </select>

          {/* Quick Toggle Chip: My Tasks */}
          <button
            type="button"
            onClick={onMyTasksOnlyToggle}
            className={`px-3 py-1 rounded-xl border font-semibold transition-ui cursor-pointer ${
              myTasksOnly
                ? 'border-[var(--accent-primary)] bg-[var(--accent-primary)]/15 text-[var(--accent-primary)] font-bold'
                : isDarkMode
                  ? 'border-white/10 text-slate-400 hover:text-white'
                  : 'border-slate-200 text-slate-600 hover:text-slate-900'
            }`}
          >
            My Tasks
          </button>

          {/* Quick Toggle Chip: Overdue */}
          <button
            type="button"
            onClick={onOverdueOnlyToggle}
            className={`px-3 py-1 rounded-xl border font-semibold transition-ui cursor-pointer flex items-center gap-1.5 ${
              overdueOnly
                ? 'border-rose-500 bg-rose-500/15 text-rose-400 font-bold'
                : isDarkMode
                  ? 'border-white/10 text-slate-400 hover:text-rose-400'
                  : 'border-slate-200 text-slate-600 hover:text-rose-600'
            }`}
          >
            <AlertTriangle className="w-3 h-3 text-rose-400" />
            <span>Overdue ({overdueCount})</span>
          </button>

          {/* Reset Filters */}
          {hasActiveFilters && (
            <button
              type="button"
              onClick={clearAllFilters}
              className="text-[11px] text-slate-400 hover:text-slate-200 underline cursor-pointer ml-1"
            >
              Reset
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default CalendarHeader;
