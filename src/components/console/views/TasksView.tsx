import React, { useMemo, useState, useEffect, startTransition } from 'react';
import {
  ListTodo,
  Plus,
  MessageSquare,
  ChevronRight,
  ChevronLeft,
  Ban,
  Pencil,
  AlertTriangle,
  Clock,
  Link2,
  Send,
  CheckCircle2,
  Calendar,
  Search,
  Sparkles,
  Users as UsersIcon,
  AlertCircle
} from 'lucide-react';
import { Modal } from '../../common/Modal';
import { useUrlModal } from '../../../hooks/useUrlModal';
import { Task, TaskPriority, TaskStatus, TaskTemplate, fetchTaskTemplates, applyTaskTemplate } from '../../../services/consoleApiServices';
import { toast } from '../../../context/ToastContext';
import { SystemUser } from '../../../types/console';
import { TaskScheduleCalendar } from './tasks/TaskScheduleCalendar';

interface TasksViewProps {
  tasks: Task[];
  isLoadingTasks: boolean;
  users: SystemUser[];
  currentUser: SystemUser | null;
  canManageTasks: boolean;
  isDarkMode: boolean;
  onCreateTask: (payload: {
    title: string;
    description?: string;
    section?: string;
    priority: TaskPriority;
    dueDate?: string;
    assigneeUserIds: string[];
  }) => Promise<Task>;
  onUpdateTask: (id: string, payload: Partial<{
    title: string;
    description: string;
    section: string;
    priority: TaskPriority;
    dueDate: string | null;
    assigneeUserIds: string[];
  }>) => Promise<Task>;
  onUpdateStatus: (id: string, status: TaskStatus) => Promise<Task>;
  onAddComment: (id: string, body: string) => Promise<any>;
  onCancelTask: (id: string, reason?: string) => Promise<Task>;
}

const COLUMNS: { id: TaskStatus; label: string; dotClass: string; badgeColor: string }[] = [
  { id: 'TODO', label: 'To Do', dotClass: 'bg-slate-400', badgeColor: 'text-slate-400' },
  { id: 'IN_PROGRESS', label: 'In Progress', dotClass: 'bg-sky-400', badgeColor: 'text-sky-400' },
  { id: 'BLOCKED', label: 'Blocked', dotClass: 'bg-amber-400', badgeColor: 'text-amber-400' },
  { id: 'DONE', label: 'Done', dotClass: 'bg-emerald-400', badgeColor: 'text-emerald-400' }
];

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

function isOverdue(task: Task): boolean {
  if (!task.dueDate || task.status === 'DONE' || task.status === 'CANCELLED') return false;
  return new Date(task.dueDate).getTime() < Date.now();
}

function formatDue(iso: string): string {
  return new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
}

function getInitials(name: string): string {
  if (!name) return 'GO';
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export const TasksView: React.FC<TasksViewProps> = ({
  tasks,
  isLoadingTasks,
  users,
  currentUser,
  canManageTasks,
  isDarkMode,
  onCreateTask,
  onUpdateTask,
  onUpdateStatus,
  onAddComment,
  onCancelTask
}) => {
  const taskModal = useUrlModal<{ id?: string }>('task-form');
  const templateModal = useUrlModal('apply-template');
  const [templates, setTemplates] = useState<TaskTemplate[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const [templateAssigneeIds, setTemplateAssigneeIds] = useState<string[]>([]);
  const [isApplyingTemplate, setIsApplyingTemplate] = useState(false);

  useEffect(() => {
    if (templateModal.isOpen && templates.length === 0) {
      fetchTaskTemplates().then(setTemplates);
    }
  }, [templateModal.isOpen, templates.length]);

  const handleApplyTemplate = async () => {
    if (!selectedTemplateId || templateAssigneeIds.length === 0) return;
    setIsApplyingTemplate(true);
    try {
      const result = await applyTaskTemplate(selectedTemplateId, templateAssigneeIds);
      toast.success(`${result.createdCount} tasks created from "${result.templateName}".`, 'Template Applied');
      templateModal.close();
      setSelectedTemplateId('');
      setTemplateAssigneeIds([]);
    } catch (err: any) {
      toast.error(err?.message || 'Could not apply the template.', 'Apply Failed');
    } finally {
      setIsApplyingTemplate(false);
    }
  };

  const detailModal = useUrlModal<{ id: string }>('task-detail');
  const cancelModal = useUrlModal<{ id: string }>('cancel-task');
  const [mainView, setMainView] = useState<'board' | 'calendar'>('calendar');
  const [viewFilter, setViewFilter] = useState<'MINE' | 'ASSIGNED_BY_ME' | 'ALL'>(canManageTasks ? 'ALL' : 'MINE');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [commentDraft, setCommentDraft] = useState('');

  const editingTask = useMemo(
    () => (taskModal.params.id ? tasks.find((t) => t.id === taskModal.params.id) || null : null),
    [taskModal.params.id, tasks]
  );
  const detailTask = useMemo(
    () => (detailModal.params.id ? tasks.find((t) => t.id === detailModal.params.id) || null : null),
    [detailModal.params.id, tasks]
  );
  const taskPendingCancel = useMemo(
    () => (cancelModal.params.id ? tasks.find((t) => t.id === cancelModal.params.id) || null : null),
    [cancelModal.params.id, tasks]
  );

  const isInvolved = (task: Task) =>
    task.assignedBy === currentUser?.id || task.assignees.some((a) => a.userId === currentUser?.id);

  const visibleTasks = useMemo(() => {
    let list = tasks.filter((t) => t.status !== 'CANCELLED');
    if (viewFilter === 'MINE') list = list.filter((t) => currentUser && t.assignees.some((a) => a.userId === currentUser.id));
    if (viewFilter === 'ASSIGNED_BY_ME') list = list.filter((t) => t.assignedBy === currentUser?.id);
    return list;
  }, [tasks, viewFilter, currentUser]);

  const overdueCount = visibleTasks.filter(isOverdue).length;
  const dueTodayCount = visibleTasks.filter(
    (t) => t.dueDate && new Date(t.dueDate).toDateString() === new Date().toDateString() && t.status !== 'DONE'
  ).length;

  const cardBase = isDarkMode
    ? 'bg-[#09090B] border-white/10 text-white shadow-[0_16px_40px_rgba(0,0,0,0.6)] backdrop-blur-2xl'
    : 'bg-white border-slate-200/80 shadow-sm text-slate-900';

  const moveStatus = (task: Task, direction: 1 | -1) => {
    const idx = COLUMNS.findIndex((c) => c.id === task.status);
    const nextIdx = idx + direction;
    if (nextIdx < 0 || nextIdx >= COLUMNS.length) return;
    onUpdateStatus(task.id, COLUMNS[nextIdx].id);
  };

  const canActOn = (task: Task) => canManageTasks || isInvolved(task);

  const handleSubmitForm = async (form: {
    title: string;
    description: string;
    section: string;
    priority: TaskPriority;
    dueDate: string;
    assigneeUserIds: string[];
  }) => {
    setIsSubmitting(true);
    try {
      const payload = {
        title: form.title.trim(),
        description: form.description.trim() || undefined,
        section: form.section.trim() || undefined,
        priority: form.priority,
        dueDate: form.dueDate ? new Date(form.dueDate).toISOString() : undefined,
        assigneeUserIds: form.assigneeUserIds
      };
      if (editingTask) {
        await onUpdateTask(editingTask.id, payload);
      } else {
        await onCreateTask(payload);
      }
      taskModal.close();
    } catch {
      // toast handled by hook
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmCancel = async () => {
    if (!taskPendingCancel) return;
    setIsSubmitting(true);
    try {
      await onCancelTask(taskPendingCancel.id, cancelReason.trim() || undefined);
      setCancelReason('');
      cancelModal.close();
    } catch {
      // toast handled
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePostComment = async () => {
    if (!detailTask || !commentDraft.trim()) return;
    setIsSubmitting(true);
    try {
      await onAddComment(detailTask.id, commentDraft.trim());
      setCommentDraft('');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6 font-sans">
      {/* ========================================================================= */}
      {/* ── TOP HERO HEADER (Apple HIG Banner) ──                                */}
      {/* ========================================================================= */}
      <div className={`p-4 sm:p-6 md:p-7 rounded-3xl border transition-ui ${cardBase}`}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span
                className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider bg-[var(--accent-soft-light)] dark:bg-[var(--accent-soft-dark)] text-[var(--accent-text-light)] dark:text-[var(--accent-text-dark)] border border-[var(--accent-border-light)] dark:border-[var(--accent-border-dark)]"
              >
                HR Module
              </span>
              <span className={`text-[11px] sm:text-xs font-mono ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                • Team Action Items & Kanban Board
              </span>
            </div>
            <h1 className={`text-xl sm:text-2xl md:text-3xl font-bold tracking-tight flex items-center gap-2.5 ${
              isDarkMode ? 'text-white' : 'text-slate-900'
            }`}>
              <div className="flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-2xl bg-[var(--accent-primary)] text-white shadow-md shadow-[var(--accent-shadow)]">
                <ListTodo className="h-4 w-4 sm:h-5 sm:w-5" />
              </div>
              Tasks
            </h1>
            <p className={`text-xs sm:text-sm mt-1 max-w-2xl ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
              Internal assignments and deliverables. Assign work to colleagues with automated due-date reminders and tracking.
            </p>
          </div>

          <div className="flex items-center flex-wrap gap-3">
            {/* Primary View Switcher: Schedule & Calendar vs Board */}
            <div
              className={`flex items-center p-1 rounded-2xl border ${
                isDarkMode ? 'bg-black/40 border-white/10' : 'bg-slate-100 border-slate-200'
              }`}
            >
              <button
                type="button"
                onClick={() => setMainView('calendar')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-ui cursor-pointer ${
                  mainView === 'calendar'
                    ? 'bg-[var(--accent-primary)] text-white shadow-sm'
                    : isDarkMode
                      ? 'text-slate-400 hover:text-white'
                      : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Calendar className="w-3.5 h-3.5" />
                <span>Schedule & Calendar</span>
              </button>
              <button
                type="button"
                onClick={() => setMainView('board')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-ui cursor-pointer ${
                  mainView === 'board'
                    ? 'bg-[var(--accent-primary)] text-white shadow-sm'
                    : isDarkMode
                      ? 'text-slate-400 hover:text-white'
                      : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <ListTodo className="w-3.5 h-3.5" />
                <span>Board View</span>
              </button>
            </div>

            {/* Dual Summary Metrics Pill */}
            <div
              className={`flex items-center gap-3.5 p-3 sm:px-4 sm:py-2.5 rounded-2xl border font-mono w-full sm:w-auto ${
                isDarkMode ? 'bg-black/40 border-white/10' : 'bg-slate-50 border-slate-200/80 shadow-2xs'
              }`}
            >
              <div className="text-center">
                <div className={`text-[10px] uppercase font-bold tracking-wider ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                  Overdue
                </div>
                <div className={`text-lg sm:text-xl font-bold tabular-nums flex items-center justify-center gap-1 ${
                  overdueCount > 0 ? 'text-rose-500' : isDarkMode ? 'text-slate-500' : 'text-slate-400'
                }`}>
                  {overdueCount > 0 && <span className="h-2 w-2 rounded-full bg-rose-500 animate-ping" />}
                  {overdueCount}
                </div>
              </div>
              <div className={`w-px h-8 ${isDarkMode ? 'bg-white/10' : 'bg-slate-200'}`} />
              <div className="text-center">
                <div className={`text-[10px] uppercase font-bold tracking-wider ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                  Due Today
                </div>
                <div className="text-lg sm:text-xl font-bold text-amber-400 tabular-nums">
                  {dueTodayCount}
                </div>
              </div>
            </div>

            {canManageTasks && (
              <button
                type="button"
                onClick={() => templateModal.open()}
                className="flex h-11 shrink-0 items-center gap-2 rounded-xl border border-[var(--accent-primary)]/40 bg-[var(--accent-primary)]/10 hover:bg-[var(--accent-primary)]/20 px-4 text-xs font-extrabold text-[var(--accent-primary)] shadow-sm transition-ui active:scale-[0.96] cursor-pointer"
              >
                <Sparkles className="w-4 h-4" />
                <span>Apply Template</span>
              </button>
            )}

            {canManageTasks && (
              <button
                type="button"
                onClick={() => taskModal.open()}
                className="flex h-11 shrink-0 items-center gap-2 rounded-xl bg-[var(--accent-primary)] px-4 text-xs font-extrabold text-white shadow-[0_8px_20px_var(--accent-shadow)] transition-ui hover:bg-[var(--accent-hover)] active:scale-[0.96] cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Assign Task</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {mainView === 'calendar' ? (
        <TaskScheduleCalendar
          tasks={tasks}
          isLoadingTasks={isLoadingTasks}
          users={users}
          currentUser={currentUser}
          canManageTasks={canManageTasks}
          isDarkMode={isDarkMode}
          onCreateTask={onCreateTask}
          onUpdateTask={onUpdateTask}
          onUpdateStatus={onUpdateStatus}
          onAddComment={onAddComment}
          onCancelTask={onCancelTask}
          onOpenCancelModal={(taskToCancel) => cancelModal.open({ id: taskToCancel.id })}
        />
      ) : (
        <>
          {/* ========================================================================= */}
          {/* ── APPLE SEGMENTED FILTER BAR ──                                        */}
          {/* ========================================================================= */}
      <div className={`p-2.5 sm:p-3 rounded-3xl border transition-ui flex items-center justify-between gap-3 overflow-x-auto scrollbar-none ${cardBase}`}>
        <div
          className={`p-1 rounded-2xl border flex items-center overflow-x-auto scrollbar-none w-full sm:w-auto ${
            isDarkMode ? 'bg-black/40 border-white/10' : 'bg-slate-100 border-slate-200'
          }`}
        >
          {[
            { id: 'MINE', label: 'My Tasks' },
            { id: 'ASSIGNED_BY_ME', label: 'Assigned by Me' },
            ...(canManageTasks ? [{ id: 'ALL', label: 'All Tasks' }] : [])
          ].map((tab) => {
            const isActive = viewFilter === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setViewFilter(tab.id as typeof viewFilter)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-mono font-bold transition-ui cursor-pointer whitespace-nowrap ${
                  isActive
                    ? 'bg-[var(--accent-primary)] text-white shadow-sm'
                    : isDarkMode
                      ? 'text-slate-400 hover:text-white'
                      : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        <div className={`hidden md:flex items-center gap-2 text-xs font-mono pr-2 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
          <Sparkles className="w-3.5 h-3.5 text-[var(--accent-primary)]" />
          <span>Active workstreams: {visibleTasks.length} tasks</span>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* ── KANBAN BOARD (Apple Grouped Columns) ──                              */}
      {/* ========================================================================= */}
      {isLoadingTasks ? (
        <div className={`p-12 rounded-3xl border text-center font-mono ${cardBase}`}>
          <ListTodo className="w-8 h-8 animate-spin text-[var(--accent-primary)] mx-auto mb-2 opacity-80" />
          <div className={`text-sm ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>Loading tasks…</div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
          {COLUMNS.map((col) => {
            const colTasks = visibleTasks.filter((t) => t.status === col.id);
            return (
              <div
                key={col.id}
                className={`rounded-3xl border p-3.5 sm:p-4 space-y-3 min-h-[260px] flex flex-col transition-ui ${cardBase}`}
              >
                {/* Column Header */}
                <div className="flex items-center justify-between px-1 pb-1 border-b border-white/[0.06] dark:border-white/[0.06]">
                  <h3 className={`text-xs font-bold uppercase tracking-wider flex items-center gap-2 ${
                    isDarkMode ? 'text-slate-200' : 'text-slate-800'
                  }`}>
                    <span className={`w-2.5 h-2.5 rounded-full ${col.dotClass} shadow-xs`} />
                    {col.label}
                  </h3>
                  <span
                    className={`text-[11px] font-mono font-bold px-2 py-0.5 rounded-full ${
                      isDarkMode ? 'bg-white/10 text-slate-300' : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {colTasks.length}
                  </span>
                </div>

                {/* Cards List in Column */}
                <div className="flex-1 space-y-2.5">
                  {colTasks.length === 0 ? (
                    <div className={`text-xs text-center py-10 font-mono ${isDarkMode ? 'text-slate-600' : 'text-slate-400'}`}>
                      No tasks in this lane
                    </div>
                  ) : (
                    colTasks.map((task) => {
                      const overdue = isOverdue(task);
                      const priorityStyle = PRIORITY_STYLES[task.priority];
                      const colIdx = COLUMNS.findIndex((c) => c.id === task.status);

                      return (
                        <div
                          key={task.id}
                          onClick={() => detailModal.open({ id: task.id })}
                          className={`p-3.5 rounded-2xl border space-y-2.5 cursor-pointer transition-ui group ${
                            isDarkMode
                              ? 'bg-black/30 border-white/[0.08] hover:border-[var(--accent-primary)]/40 hover:bg-white/[0.02]'
                              : 'bg-slate-50/80 border-slate-200 hover:border-[var(--accent-primary)]/40 hover:bg-white'
                          } ${
                            overdue
                              ? isDarkMode
                                ? 'ring-1 ring-rose-500/40 border-rose-500/30'
                                : 'ring-1 ring-rose-300 border-rose-200'
                              : ''
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <p className="text-xs font-bold leading-snug line-clamp-2">
                              {task.title}
                            </p>
                            {canManageTasks && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  taskModal.open({ id: task.id });
                                }}
                                className={`shrink-0 p-1 rounded-lg transition-ui ${
                                  isDarkMode
                                    ? 'text-slate-500 hover:text-white hover:bg-white/10'
                                    : 'text-slate-400 hover:text-slate-800 hover:bg-slate-200'
                                }`}
                              >
                                <Pencil className="w-3 h-3" />
                              </button>
                            )}
                          </div>

                          {/* Priority & Due Date Badges */}
                          <div className="flex items-center flex-wrap gap-1.5">
                            <span
                              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-mono font-bold border ${
                                isDarkMode ? priorityStyle.dark : priorityStyle.light
                              }`}
                            >
                              <span className={`w-1.5 h-1.5 rounded-full ${priorityStyle.dot}`} />
                              {task.priority}
                            </span>
                            {task.dueDate && (
                              <span
                                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-mono ${
                                  overdue
                                    ? isDarkMode
                                      ? 'bg-rose-500/15 text-rose-300 border border-rose-500/30 font-bold'
                                      : 'bg-rose-50 text-rose-700 border border-rose-200 font-bold'
                                    : isDarkMode
                                      ? 'bg-white/5 text-slate-400 border border-white/10'
                                      : 'bg-slate-100 text-slate-600 border border-slate-200'
                                }`}
                              >
                                {overdue ? <AlertTriangle className="w-3 h-3 text-rose-400" /> : <Clock className="w-3 h-3 text-slate-400" />}
                                <span>{formatDue(task.dueDate)}</span>
                              </span>
                            )}
                            {task.comments.length > 0 && (
                              <span
                                className={`inline-flex items-center gap-1 text-[10px] font-mono ${
                                  isDarkMode ? 'text-slate-400' : 'text-slate-500'
                                }`}
                              >
                                <MessageSquare className="w-3 h-3 opacity-70" />
                                <span>{task.comments.length}</span>
                              </span>
                            )}
                          </div>

                          {/* Footer: Assignee Stack & Quick Move Buttons */}
                          <div className="flex items-center justify-between pt-1 border-t border-white/5 dark:border-white/5">
                            <div className="flex -space-x-1.5 overflow-hidden">
                              {task.assignees.slice(0, 3).map((a) => (
                                <div
                                  key={a.userId}
                                  title={a.name}
                                  className="w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-bold ring-2 select-none bg-[var(--accent-soft-light)] dark:bg-[var(--accent-soft-dark)] text-[var(--accent-text-light)] dark:text-[var(--accent-text-dark)] ring-white dark:ring-[#09090B]"
                                >
                                  {getInitials(a.name || '?')}
                                </div>
                              ))}
                              {task.assignees.length > 3 && (
                                <div
                                  className={`w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-mono font-bold ring-2 select-none ${
                                    isDarkMode ? 'bg-slate-800 text-slate-300 ring-[#09090B]' : 'bg-slate-200 text-slate-700 ring-white'
                                  }`}
                                >
                                  +{task.assignees.length - 3}
                                </div>
                              )}
                            </div>

                            {canActOn(task) && (
                              <div
                                className="flex items-center gap-0.5"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <button
                                  type="button"
                                  disabled={colIdx === 0}
                                  onClick={() => moveStatus(task, -1)}
                                  title="Move backwards"
                                  className={`p-1 rounded-lg transition-ui cursor-pointer disabled:opacity-20 disabled:cursor-not-allowed ${
                                    isDarkMode
                                      ? 'text-slate-400 hover:text-white hover:bg-white/10'
                                      : 'text-slate-500 hover:text-slate-800 hover:bg-slate-200'
                                  }`}
                                >
                                  <ChevronLeft className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  disabled={colIdx === COLUMNS.length - 1}
                                  onClick={() => moveStatus(task, 1)}
                                  title="Move forwards"
                                  className={`p-1 rounded-lg transition-ui cursor-pointer disabled:opacity-20 disabled:cursor-not-allowed ${
                                    isDarkMode
                                      ? 'text-slate-400 hover:text-white hover:bg-white/10'
                                      : 'text-slate-500 hover:text-slate-800 hover:bg-slate-200'
                                  }`}
                                >
                                  <ChevronRight className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </>
  )}

      {/* ========================================================================= */}
      {/* ── CREATE / EDIT TASK MODAL ──                                          */}
      {/* ========================================================================= */}
      {canManageTasks && (
        <TaskFormModal
          isOpen={taskModal.isOpen}
          onClose={() => taskModal.close()}
          isDarkMode={isDarkMode}
          isSubmitting={isSubmitting}
          users={users}
          editingTask={editingTask}
          onSubmit={handleSubmitForm}
        />
      )}

      {/* ========================================================================= */}
      {/* ── TASK DETAIL INSPECTOR / ACTIVITY SHEET MODAL ──                      */}
      {/* ========================================================================= */}
      <Modal
        isOpen={detailModal.isOpen}
        onClose={() => { detailModal.close(); setCommentDraft(''); }}
        isDarkMode={isDarkMode}
        maxWidth="lg"
        icon={<ListTodo className="w-5 h-5 text-[var(--accent-primary)]" />}
        title={detailTask?.title || 'Task Inspector'}
        subtitle={detailTask?.section ? `Section: ${detailTask.section}` : undefined}
      >
        {detailTask && (
          <div className="space-y-4 font-sans">
            {/* Status Segmented Picker inside Inspector */}
            {canActOn(detailTask) && (
              <div
                className={`p-1 rounded-2xl border flex items-center justify-between overflow-x-auto scrollbar-none ${
                  isDarkMode ? 'bg-black/40 border-white/10' : 'bg-slate-100 border-slate-200'
                }`}
              >
                {COLUMNS.map((c) => {
                  const isCur = detailTask.status === c.id;
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => onUpdateStatus(detailTask.id, c.id)}
                      className={`flex-1 py-1.5 px-2 rounded-xl text-[11px] font-mono font-bold transition-ui cursor-pointer ${
                        isCur
                          ? 'bg-[var(--accent-primary)] text-white shadow-sm'
                          : isDarkMode
                            ? 'text-slate-400 hover:text-white'
                            : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      {c.label}
                    </button>
                  );
                })}
              </div>
            )}

            {/* Inset Section 1: Task Description & Metadata */}
            <div
              className={`rounded-2xl border p-4 space-y-3 ${
                isDarkMode ? 'border-white/[0.08] bg-black/20' : 'border-slate-200 bg-white'
              }`}
            >
              {detailTask.description ? (
                <p className={`text-xs sm:text-sm leading-relaxed ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                  {detailTask.description}
                </p>
              ) : (
                <p className="text-xs text-slate-500 italic">No detailed description provided.</p>
              )}

              <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-white/5 dark:border-white/5 text-xs">
                <span
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl border text-[10px] font-mono font-bold ${
                    isDarkMode ? PRIORITY_STYLES[detailTask.priority].dark : PRIORITY_STYLES[detailTask.priority].light
                  }`}
                >
                  Priority: {detailTask.priority}
                </span>

                {detailTask.dueDate && (
                  <span
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl border text-[10px] font-mono ${
                      isOverdue(detailTask)
                        ? 'border-rose-500/30 bg-rose-500/10 text-rose-300'
                        : isDarkMode
                          ? 'border-white/10 bg-white/[0.02] text-slate-300'
                          : 'border-slate-200 bg-slate-50 text-slate-700'
                    }`}
                  >
                    <Calendar className="w-3 h-3 text-slate-400" />
                    Due {new Date(detailTask.dueDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </span>
                )}

                {detailTask.linkedEntityLabel && (
                  <span
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl border text-[10px] font-mono bg-[var(--accent-soft-light)] dark:bg-[var(--accent-soft-dark)] text-[var(--accent-text-light)] dark:text-[var(--accent-text-dark)] border-[var(--accent-border-light)] dark:border-[var(--accent-border-dark)]"
                  >
                    <Link2 className="w-3 h-3" /> {detailTask.linkedEntityLabel}
                  </span>
                )}
              </div>
            </div>

            {/* Inset Section 2: Assignees */}
            <div
              className={`rounded-2xl border p-4 space-y-2.5 ${
                isDarkMode ? 'border-white/[0.08] bg-black/20' : 'border-slate-200 bg-white'
              }`}
            >
              <div className="text-xs font-bold uppercase tracking-wider text-[var(--accent-primary)] font-mono flex items-center gap-1.5">
                <UsersIcon className="w-3.5 h-3.5" /> Assigned Team Members ({detailTask.assignees.length})
              </div>
              <div className="flex flex-wrap gap-2">
                {detailTask.assignees.map((a) => (
                  <div
                    key={a.userId}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs ${
                      isDarkMode ? 'border-white/10 bg-white/[0.03] text-slate-200' : 'border-slate-200 bg-slate-50 text-slate-700'
                    }`}
                  >
                    <div className="w-5 h-5 rounded-full bg-[var(--accent-soft-light)] dark:bg-[var(--accent-soft-dark)] text-[var(--accent-text-light)] dark:text-[var(--accent-text-dark)] flex items-center justify-center font-bold text-[9px]">
                      {getInitials(a.name)}
                    </div>
                    <span>{a.name}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Cancel Task Trigger */}
            {canManageTasks && detailTask.status !== 'CANCELLED' && (
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => {
                    detailModal.close();
                    cancelModal.open({ id: detailTask.id });
                  }}
                  className={`text-xs font-bold inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border transition-ui cursor-pointer ${
                    isDarkMode
                      ? 'border-rose-500/30 bg-rose-500/10 text-rose-300 hover:bg-rose-500/20'
                      : 'border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100'
                  }`}
                >
                  <Ban className="w-3.5 h-3.5" /> Cancel Task
                </button>
              </div>
            )}

            {/* Inset Section 3: Activity & Comments Thread */}
            <div
              className={`rounded-2xl border p-4 space-y-3 ${
                isDarkMode ? 'border-white/[0.08] bg-black/20' : 'border-slate-200 bg-white'
              }`}
            >
              <div className="text-xs font-bold uppercase tracking-wider text-[var(--accent-primary)] font-mono flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <MessageSquare className="w-3.5 h-3.5" /> Activity Log ({detailTask.comments.length})
                </span>
              </div>

              <div className="space-y-2.5 max-h-52 overflow-y-auto pr-1">
                {detailTask.comments.map((c) => (
                  <div
                    key={c.id}
                    className={`text-xs p-3 rounded-2xl border ${
                      isDarkMode ? 'bg-white/[0.03] border-white/5' : 'bg-slate-50 border-slate-200/80'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className={`font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                        {c.authorName || 'Teammate'}
                      </span>
                      <span className={`text-[10px] font-mono ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                        {new Date(c.createdAt).toLocaleString('en-IN', {
                          day: '2-digit',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </span>
                    </div>
                    <p className={`leading-relaxed ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                      {c.body}
                    </p>
                  </div>
                ))}

                {detailTask.comments.length === 0 && (
                  <p className={`text-xs font-mono text-center py-4 ${isDarkMode ? 'text-slate-600' : 'text-slate-400'}`}>
                    No notes or updates posted on this task yet.
                  </p>
                )}
              </div>

              {/* Comment Composer */}
              {(canManageTasks || isInvolved(detailTask)) && (
                <div className="flex items-center gap-2 pt-2 border-t border-white/5 dark:border-white/5">
                  <input
                    value={commentDraft}
                    onChange={(e) => setCommentDraft(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handlePostComment();
                    }}
                    placeholder="Write a progress note or update…"
                    className={`flex-1 px-3.5 py-2.5 rounded-xl border text-xs transition-ui outline-none ${
                      isDarkMode
                        ? 'border-white/10 bg-white/[0.04] text-white placeholder:text-slate-500 focus:border-[var(--accent-primary)] focus:ring-2 focus:ring-[var(--accent-ring)]'
                        : 'border-slate-200 bg-slate-50 text-slate-900 placeholder:text-slate-400 focus:border-[var(--accent-primary)] focus:ring-2 focus:ring-[var(--accent-ring)]'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={handlePostComment}
                    disabled={!commentDraft.trim() || isSubmitting}
                    className="h-10 w-10 flex items-center justify-center rounded-xl bg-[var(--accent-primary)] hover:bg-[var(--accent-hover)] text-white shadow-md shadow-[var(--accent-shadow)] transition-ui cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed active:scale-95"
                  >
                    <Send className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </Modal>

      {/* ========================================================================= */}
      {/* ── CANCEL CONFIRMATION MODAL ──                                         */}
      {/* ========================================================================= */}
      <Modal
        isOpen={cancelModal.isOpen}
        onClose={() => { cancelModal.close(); setCancelReason(''); }}
        isDarkMode={isDarkMode}
        maxWidth="md"
        icon={<Ban className="w-5 h-5 text-rose-400" />}
        title="Cancel Task"
        subtitle={taskPendingCancel ? `"${taskPendingCancel.title}"` : undefined}
        footer={
          <div className="flex items-center justify-end gap-3 w-full">
            <button
              type="button"
              onClick={() => { cancelModal.close(); setCancelReason(''); }}
              className={`inline-flex h-10 items-center justify-center gap-2 rounded-xl border text-xs font-semibold transition-ui cursor-pointer active:scale-95 ${
                isDarkMode ? 'text-slate-300 hover:text-white bg-white/[0.04] hover:bg-white/[0.08] border-white/10' : 'border-slate-300 text-slate-700 hover:bg-slate-100'
              }`}
            >
              Keep Task
            </button>
            <button
              type="button"
              onClick={handleConfirmCancel}
              disabled={isSubmitting}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow-lg shadow-rose-500/20 cursor-pointer transition-ui active:scale-95 disabled:opacity-50"
            >
              {isSubmitting ? 'Cancelling…' : 'Cancel Task'}
            </button>
          </div>
        }
      >
        <div className="space-y-4 font-sans">
          <p className={`text-xs sm:text-sm leading-relaxed ${isDarkMode ? 'text-slate-300' : 'text-slate-600'}`}>
            Assigned team members will be notified. Any pending system due-date reminders for this task will be revoked.
          </p>
          <div>
            <label className={`text-xs font-semibold uppercase tracking-wide ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
              Cancellation Reason (optional)
            </label>
            <textarea
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              rows={3}
              placeholder="e.g. Work completed elsewhere, obsolete requirement"
              className={`w-full mt-1.5 p-3 rounded-2xl border text-sm font-sans resize-none transition-ui outline-none ${
                isDarkMode ? 'border-white/10 bg-black/40 text-white placeholder:text-slate-500 focus:border-[var(--accent-primary)] focus:ring-2 focus:ring-[var(--accent-ring)]' : 'border-slate-200 bg-slate-50 text-slate-900 placeholder:text-slate-400 focus:border-[var(--accent-primary)] focus:ring-2 focus:ring-[var(--accent-ring)]'
              }`}
            />
          </div>
        </div>
      </Modal>

      {/* ============================ APPLY TASK TEMPLATE MODAL ============================ */}
      {canManageTasks && (
        <Modal
          isOpen={templateModal.isOpen}
          onClose={() => { templateModal.close(); setSelectedTemplateId(''); setTemplateAssigneeIds([]); }}
          isDarkMode={isDarkMode}
          maxWidth="lg"
          icon={<Sparkles className="w-5 h-5" />}
          title="Apply Task Template"
          subtitle="Creates one Task per template item, assigned to everyone you pick below."
          footer={
            <div className="flex items-center justify-end gap-3 w-full">
              <button
                type="button"
                onClick={() => templateModal.close()}
                className={`min-h-[42px] px-4 py-2 rounded-xl text-xs font-bold transition-ui cursor-pointer ${isDarkMode ? 'text-slate-300 hover:text-white bg-slate-800/60 hover:bg-slate-800 border border-slate-750' : 'border border-slate-300 text-slate-700 hover:bg-slate-100'}`}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleApplyTemplate}
                disabled={!selectedTemplateId || templateAssigneeIds.length === 0 || isApplyingTemplate}
                className="min-h-[42px] px-6 py-2 rounded-xl bg-[var(--accent-primary)] hover:bg-[var(--accent-hover)] text-white font-bold text-xs shadow-lg cursor-pointer transition-ui disabled:opacity-50"
              >
                {isApplyingTemplate ? 'Applying…' : 'Apply Template'}
              </button>
            </div>
          }
        >
          <div className="space-y-4">
            <div>
              <label className={`text-xs font-semibold uppercase tracking-wide ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Template</label>
              <select
                value={selectedTemplateId}
                onChange={(e) => setSelectedTemplateId(e.target.value)}
                className={`w-full mt-1.5 p-3 rounded-xl border text-sm ${isDarkMode ? 'bg-slate-950/60 border-slate-800 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'}`}
              >
                <option value="">Select a template…</option>
                {templates.map((t) => <option key={t.id} value={t.id}>{t.name} ({t.items.length} tasks)</option>)}
              </select>
            </div>
            {selectedTemplateId && (
              <ul className={`text-xs space-y-1 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                {templates.find((t) => t.id === selectedTemplateId)?.items.map((item) => (
                  <li key={item.id}>· {item.title} <span className="opacity-60">(due +{item.dueDaysOffset}d)</span></li>
                ))}
              </ul>
            )}
            <div>
              <label className={`text-xs font-semibold uppercase tracking-wide ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                Assign To ({templateAssigneeIds.length})
              </label>
              <div className={`max-h-40 overflow-y-auto rounded-xl border divide-y mt-1.5 ${isDarkMode ? 'border-slate-800 divide-slate-800' : 'border-slate-200 divide-slate-100'}`}>
                {users.map((u) => (
                  <label key={u.id} className={`flex items-center gap-2.5 px-3 py-2 text-sm cursor-pointer ${isDarkMode ? 'hover:bg-slate-800/50' : 'hover:bg-slate-50'}`}>
                    <input
                      type="checkbox"
                      checked={templateAssigneeIds.includes(u.id)}
                      onChange={() => setTemplateAssigneeIds((prev) => (prev.includes(u.id) ? prev.filter((id) => id !== u.id) : [...prev, u.id]))}
                      className="rounded"
                    />
                    <span className={isDarkMode ? 'text-slate-200' : 'text-slate-800'}>{u.name}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

// ============================================================================
// Create / Edit form modal — Apple HIG Grouped Inset Sections
// ============================================================================
interface TaskFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  isDarkMode: boolean;
  isSubmitting: boolean;
  users: SystemUser[];
  editingTask: Task | null;
  onSubmit: (form: {
    title: string;
    description: string;
    section: string;
    priority: TaskPriority;
    dueDate: string;
    assigneeUserIds: string[];
  }) => void;
}

const TaskFormModal: React.FC<TaskFormModalProps> = ({
  isOpen,
  onClose,
  isDarkMode,
  isSubmitting,
  users,
  editingTask,
  onSubmit
}) => {
  const isEdit = !!editingTask;
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [section, setSection] = useState('');
  const [priority, setPriority] = useState<TaskPriority>('MEDIUM');
  const [dueDate, setDueDate] = useState('');
  const [assigneeUserIds, setAssigneeUserIds] = useState<string[]>([]);
  const [assigneeSearch, setAssigneeSearch] = useState('');

  React.useEffect(() => {
    if (!isOpen) return;
    // Wrapped in startTransition — see useMeetings.ts (same
    // react-hooks/set-state-in-effect fix, several setState calls here).
    startTransition(() => {
    if (editingTask) {
      setTitle(editingTask.title);
      setDescription(editingTask.description || '');
      setSection(editingTask.section || '');
      setPriority(editingTask.priority);
      setDueDate(editingTask.dueDate ? editingTask.dueDate.slice(0, 10) : '');
      setAssigneeUserIds(editingTask.assignees.map((a) => a.userId));
    } else {
      setTitle('');
      setDescription('');
      setSection('');
      setPriority('MEDIUM');
      setDueDate('');
      setAssigneeUserIds([]);
    }
    });
  }, [isOpen, editingTask]); // eslint-disable-line react-hooks/exhaustive-deps

  const filteredUsers = useMemo(() => {
    const q = assigneeSearch.trim().toLowerCase();
    if (!q) return users;
    return users.filter((u) => u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q));
  }, [users, assigneeSearch]);

  const toggleAssignee = (userId: string) => {
    setAssigneeUserIds((prev) => (prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]));
  };

  const isValid = title.trim().length > 0 && assigneeUserIds.length > 0;

  const inputClass = `w-full rounded-xl border px-3.5 py-2.5 text-sm transition-ui outline-none ${
    isDarkMode
      ? 'border-white/10 bg-white/[0.04] text-white placeholder:text-slate-500 focus:border-[var(--accent-primary)] focus:bg-white/[0.06] focus:ring-2 focus:ring-[var(--accent-ring)]'
      : 'border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 focus:border-[var(--accent-primary)] focus:ring-2 focus:ring-[var(--accent-ring)] shadow-xs'
  }`;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      isDarkMode={isDarkMode}
      maxWidth="2xl"
      icon={<ListTodo className="w-5 h-5 text-[var(--accent-primary)]" />}
      title={isEdit ? 'Edit Task Assignment' : 'Assign New Task'}
      subtitle={dueDate ? 'A reminder is dispatched 24 hours prior to deadline.' : 'Assign action items to colleagues.'}
      footer={
        <div className="flex items-center justify-end gap-3 w-full">
          <button
            type="button"
            onClick={onClose}
            className={`inline-flex h-10 items-center justify-center gap-2 rounded-xl border text-xs font-semibold transition-ui cursor-pointer active:scale-95 ${
              isDarkMode ? 'text-slate-300 hover:text-white bg-white/[0.04] hover:bg-white/[0.08] border-white/10' : 'border-slate-300 text-slate-700 hover:bg-slate-100'
            }`}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => onSubmit({ title, description, section, priority, dueDate, assigneeUserIds })}
            disabled={!isValid || isSubmitting}
            className="flex h-10 items-center justify-center gap-2 rounded-xl bg-[var(--accent-primary)] px-5 text-xs font-extrabold text-white shadow-[0_8px_20px_var(--accent-shadow)] transition-ui hover:bg-[var(--accent-hover)] active:scale-[0.96] cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? 'Saving…' : isEdit ? 'Save Changes' : 'Assign Task'}
          </button>
        </div>
      }
    >
      <div className="space-y-4 font-sans">
        {/* Inset Section 1: Task Information */}
        <div className={`rounded-2xl border p-4 space-y-3.5 ${isDarkMode ? 'border-white/[0.08] bg-black/20' : 'border-slate-200 bg-white'}`}>
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[var(--accent-primary)] font-mono">
            <ListTodo className="h-3.5 w-3.5" /> Task Details
          </div>
          <div>
            <label className="block">
              <span className="mb-1.5 block text-xs font-semibold text-slate-400">Task Title *</span>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Inspect delayed batch of Plating lot #409"
                className={inputClass}
              />
            </label>
          </div>
          <div>
            <label className="block">
              <span className="mb-1.5 block text-xs font-semibold text-slate-400">Description & Context</span>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
                placeholder="Details, expectations, and reference notes for assignee"
                className={`${inputClass} resize-none`}
              />
            </label>
          </div>
        </div>

        {/* Inset Section 2: Priority & Schedule */}
        <div className={`rounded-2xl border p-4 space-y-3.5 ${isDarkMode ? 'border-white/[0.08] bg-black/20' : 'border-slate-200 bg-white'}`}>
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[var(--accent-primary)] font-mono">
            <Clock className="h-3.5 w-3.5" /> Priority & Timeline
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
            <div>
              <label className="block">
                <span className="mb-1.5 block text-xs font-semibold text-slate-400">Priority Level</span>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value as TaskPriority)}
                  className={inputClass}
                >
                  <option value="LOW">Low</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="HIGH">High</option>
                  <option value="URGENT">Urgent</option>
                </select>
              </label>
            </div>
            <div>
              <label className="block">
                <span className="mb-1.5 block text-xs font-semibold text-slate-400">Due Date</span>
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className={inputClass}
                />
              </label>
            </div>
            <div>
              <label className="block">
                <span className="mb-1.5 block text-xs font-semibold text-slate-400">Section (optional)</span>
                <input
                  value={section}
                  onChange={(e) => setSection(e.target.value)}
                  placeholder="e.g. purchasing"
                  className={inputClass}
                />
              </label>
            </div>
          </div>
        </div>

        {/* Inset Section 3: Assignees */}
        <div className={`rounded-2xl border p-4 space-y-3.5 ${isDarkMode ? 'border-white/[0.08] bg-black/20' : 'border-slate-200 bg-white'}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[var(--accent-primary)] font-mono">
              <UsersIcon className="h-3.5 w-3.5" /> Assignees ({assigneeUserIds.length}) *
            </div>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
            <input
              value={assigneeSearch}
              onChange={(e) => setAssigneeSearch(e.target.value)}
              placeholder="Search staff to assign…"
              className={`${inputClass} pl-9`}
            />
          </div>
          <div className={`max-h-44 overflow-y-auto rounded-2xl border divide-y ${
            isDarkMode ? 'border-white/10 bg-black/30 divide-white/5' : 'border-slate-200 bg-slate-50/50 divide-slate-100'
          }`}>
            {filteredUsers.map((u) => {
              const isChecked = assigneeUserIds.includes(u.id);
              return (
                <label
                  key={u.id}
                  className={`flex items-center gap-3 px-3.5 py-2.5 text-xs cursor-pointer transition-colors ${
                    isDarkMode ? 'hover:bg-white/[0.04]' : 'hover:bg-slate-100/60'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => toggleAssignee(u.id)}
                    className="rounded accent-[var(--accent-primary)] h-4 w-4"
                  />
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-[var(--accent-soft-light)] dark:bg-[var(--accent-soft-dark)] text-[var(--accent-text-light)] dark:text-[var(--accent-text-dark)] font-bold text-[10px]">
                      {getInitials(u.name)}
                    </div>
                    <span className={`font-medium truncate ${isDarkMode ? 'text-slate-200' : 'text-slate-800'}`}>
                      {u.name}
                    </span>
                  </div>
                  <span className={`text-[10px] font-mono ml-auto ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                    {u.role}
                  </span>
                </label>
              );
            })}
            {filteredUsers.length === 0 && (
              <div className={`px-4 py-6 text-xs text-center font-mono ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                No matching staff accounts
              </div>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default TasksView;
