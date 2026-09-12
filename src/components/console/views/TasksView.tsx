import React, { useMemo, useState } from 'react';
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
  Send
} from 'lucide-react';
import { Modal } from '../../common/Modal';
import { useUrlModal } from '../../../hooks/useUrlModal';
import { Task, TaskPriority, TaskStatus } from '../../../services/consoleApiServices';
import { SystemUser } from '../../../types/console';

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

// NOTE: dot classes are written out in full (not built from `accent` via a
// template literal) because Tailwind's JIT scanner only picks up literal
// class strings it can find in source — `bg-${accent}-400` would silently
// produce no CSS at build time.
const COLUMNS: { id: TaskStatus; label: string; dotClass: string }[] = [
  { id: 'TODO', label: 'To Do', dotClass: 'bg-slate-400' },
  { id: 'IN_PROGRESS', label: 'In Progress', dotClass: 'bg-sky-400' },
  { id: 'BLOCKED', label: 'Blocked', dotClass: 'bg-amber-400' },
  { id: 'DONE', label: 'Done', dotClass: 'bg-emerald-400' }
];

const PRIORITY_STYLES: Record<TaskPriority, { dark: string; light: string; dot: string }> = {
  LOW: { dark: 'bg-slate-500/15 text-slate-300 border-slate-500/30', light: 'bg-slate-100 text-slate-600 border-slate-200', dot: 'bg-slate-400' },
  MEDIUM: { dark: 'bg-sky-500/15 text-sky-300 border-sky-500/30', light: 'bg-sky-50 text-sky-700 border-sky-200', dot: 'bg-sky-400' },
  HIGH: { dark: 'bg-amber-500/15 text-amber-300 border-amber-500/30', light: 'bg-amber-50 text-amber-700 border-amber-200', dot: 'bg-amber-400' },
  URGENT: { dark: 'bg-rose-500/15 text-rose-300 border-rose-500/30', light: 'bg-rose-50 text-rose-700 border-rose-200', dot: 'bg-rose-500 animate-pulse' }
};

function isOverdue(task: Task): boolean {
  if (!task.dueDate || task.status === 'DONE' || task.status === 'CANCELLED') return false;
  return new Date(task.dueDate).getTime() < Date.now();
}

function formatDue(iso: string): string {
  return new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
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
  const detailModal = useUrlModal<{ id: string }>('task-detail');
  const cancelModal = useUrlModal<{ id: string }>('cancel-task');
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
    ? 'bg-slate-900/85 border-slate-800/80 text-white backdrop-blur-xl'
    : 'bg-white border-slate-200 shadow-sm text-slate-900';

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
      // toast already shown by the hook
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
      // toast already shown
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
      {/* Top Banner Header */}
      <div className={`p-4 sm:p-6 md:p-8 rounded-3xl border transition-ui shadow-xl ${cardBase}`}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1 sm:mb-1.5">
              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider ${
                isDarkMode ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30' : 'bg-purple-50 text-purple-800 border border-purple-200'
              }`}>
                HR Module
              </span>
              <span className={`text-[11px] sm:text-xs font-mono ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>• Task Assignment & Reminders</span>
            </div>
            <h1 className={`text-xl sm:text-2xl md:text-3xl font-bold tracking-tight flex items-center gap-2.5 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
              <ListTodo className="w-6 h-6 sm:w-7 sm:h-7 text-teal-500" />
              Tasks
            </h1>
            <p className={`text-xs sm:text-sm mt-0.5 sm:mt-1 max-w-2xl ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
              Internal action items — separate from shop-floor Job Cards. Assign work to a teammate, they get reminded before it's due.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className={`flex items-center gap-3 p-3 sm:p-4 rounded-2xl border font-mono w-full sm:w-auto ${
              isDarkMode ? 'bg-slate-950/70 border-slate-800' : 'bg-slate-50 border-slate-200 shadow-xs'
            }`}>
              <div className="text-center">
                <div className={`text-[10px] uppercase font-semibold ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Overdue</div>
                <div className={`text-lg sm:text-xl font-bold ${overdueCount > 0 ? 'text-rose-500' : isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>{overdueCount}</div>
              </div>
              <div className={`w-px h-8 ${isDarkMode ? 'bg-slate-800' : 'bg-slate-200'}`} />
              <div className="text-center">
                <div className={`text-[10px] uppercase font-semibold ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Due Today</div>
                <div className="text-lg sm:text-xl font-bold text-amber-500">{dueTodayCount}</div>
              </div>
            </div>

            {canManageTasks && (
              <button
                onClick={() => taskModal.open()}
                className="min-h-[42px] px-4 sm:px-5 py-2.5 rounded-2xl bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-500 hover:to-cyan-500 text-white font-bold text-xs sm:text-sm shadow-lg shadow-teal-500/25 cursor-pointer transition-ui hover:scale-[1.02] active:scale-[0.96] flex items-center gap-1.5 whitespace-nowrap"
              >
                <Plus className="w-4 h-4" /> Assign Task
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className={`p-3 sm:p-4 rounded-3xl border transition-ui flex items-center gap-2 overflow-x-auto pb-2 sm:pb-0 scrollbar-none shadow-sm ${
        isDarkMode ? 'bg-slate-900/80 border-slate-800/80 backdrop-blur-xl' : 'bg-white border-slate-200 shadow-xs'
      }`}>
        {[
          { id: 'MINE', label: 'My Tasks' },
          { id: 'ASSIGNED_BY_ME', label: 'Assigned by Me' },
          ...(canManageTasks ? [{ id: 'ALL', label: 'All Tasks' }] : [])
        ].map((tab) => {
          const isActive = viewFilter === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setViewFilter(tab.id as typeof viewFilter)}
              className={`px-3.5 py-2 rounded-2xl text-xs font-mono font-bold transition-ui cursor-pointer whitespace-nowrap border ${
                isActive
                  ? isDarkMode
                    ? 'bg-teal-500/20 text-teal-300 border-teal-500/40 shadow-xs'
                    : 'bg-teal-600 text-white border-teal-600 shadow-md'
                  : isDarkMode
                    ? 'bg-slate-950/40 text-slate-400 border-slate-800/80 hover:text-white hover:bg-slate-800/60'
                    : 'bg-slate-50 text-slate-600 border-slate-200 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Kanban Board */}
      {isLoadingTasks ? (
        <div className={`p-8 rounded-3xl border text-center font-mono ${isDarkMode ? 'bg-slate-900/60 border-slate-800 text-slate-400' : 'bg-slate-50 border-slate-200 text-slate-600'}`}>
          Loading tasks…
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {COLUMNS.map((col) => {
            const colTasks = visibleTasks.filter((t) => t.status === col.id);
            return (
              <div key={col.id} className={`rounded-3xl border p-3 sm:p-4 space-y-3 min-h-[200px] ${cardBase}`}>
                <div className="flex items-center justify-between px-1">
                  <h3 className={`text-xs font-bold uppercase tracking-wide flex items-center gap-1.5 ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                    <span className={`w-2 h-2 rounded-full ${col.dotClass}`} />
                    {col.label}
                  </h3>
                  <span className={`text-[11px] font-mono px-1.5 rounded-full ${isDarkMode ? 'bg-slate-800 text-slate-400' : 'bg-slate-100 text-slate-500'}`}>{colTasks.length}</span>
                </div>

                {colTasks.length === 0 ? (
                  <div className={`text-[11px] text-center py-6 font-mono ${isDarkMode ? 'text-slate-600' : 'text-slate-400'}`}>Nothing here</div>
                ) : (
                  colTasks.map((task) => {
                    const overdue = isOverdue(task);
                    const priorityStyle = PRIORITY_STYLES[task.priority];
                    const colIdx = COLUMNS.findIndex((c) => c.id === task.status);
                    return (
                      <div
                        key={task.id}
                        className={`p-3 rounded-2xl border space-y-2 cursor-pointer transition-ui ${
                          isDarkMode ? 'bg-slate-950/50 border-slate-800 hover:border-teal-500/40' : 'bg-slate-50 border-slate-200 hover:border-teal-300'
                        } ${overdue ? (isDarkMode ? 'ring-1 ring-rose-500/40' : 'ring-1 ring-rose-300') : ''}`}
                        onClick={() => detailModal.open({ id: task.id })}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-xs font-bold leading-snug line-clamp-2">{task.title}</p>
                          {canManageTasks && (
                            <button
                              onClick={(e) => { e.stopPropagation(); taskModal.open({ id: task.id }); }}
                              className={`shrink-0 p-1 rounded-lg ${isDarkMode ? 'text-slate-500 hover:text-white hover:bg-slate-800' : 'text-slate-400 hover:text-slate-700 hover:bg-slate-200'}`}
                            >
                              <Pencil className="w-3 h-3" />
                            </button>
                          )}
                        </div>

                        <div className="flex items-center flex-wrap gap-1.5">
                          <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-mono font-bold border ${isDarkMode ? priorityStyle.dark : priorityStyle.light}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${priorityStyle.dot}`} /> {task.priority}
                          </span>
                          {task.dueDate && (
                            <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-mono ${
                              overdue ? 'bg-rose-500/15 text-rose-400' : isDarkMode ? 'text-slate-400' : 'text-slate-500'
                            }`}>
                              {overdue ? <AlertTriangle className="w-3 h-3" /> : <Clock className="w-3 h-3" />} {formatDue(task.dueDate)}
                            </span>
                          )}
                          {task.comments.length > 0 && (
                            <span className={`inline-flex items-center gap-1 text-[10px] font-mono ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                              <MessageSquare className="w-3 h-3" /> {task.comments.length}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center justify-between">
                          <div className="flex -space-x-1.5">
                            {task.assignees.slice(0, 3).map((a) => (
                              <div
                                key={a.userId}
                                title={a.name}
                                className={`w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold border-2 ${
                                  isDarkMode ? 'bg-teal-500/20 text-teal-300 border-slate-900' : 'bg-teal-100 text-teal-700 border-white'
                                }`}
                              >
                                {(a.name || '?').charAt(0).toUpperCase()}
                              </div>
                            ))}
                          </div>

                          {canActOn(task) && (
                            <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                              <button
                                disabled={colIdx === 0}
                                onClick={() => moveStatus(task, -1)}
                                className={`p-1 rounded-lg disabled:opacity-30 disabled:cursor-not-allowed ${isDarkMode ? 'text-slate-400 hover:text-white hover:bg-slate-800' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-200'}`}
                              >
                                <ChevronLeft className="w-3.5 h-3.5" />
                              </button>
                              <button
                                disabled={colIdx === COLUMNS.length - 1}
                                onClick={() => moveStatus(task, 1)}
                                className={`p-1 rounded-lg disabled:opacity-30 disabled:cursor-not-allowed ${isDarkMode ? 'text-slate-400 hover:text-white hover:bg-slate-800' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-200'}`}
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
            );
          })}
        </div>
      )}

      {/* ============================ CREATE / EDIT TASK MODAL ============================ */}
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

      {/* ============================ TASK DETAIL / COMMENTS MODAL ============================ */}
      <Modal
        isOpen={detailModal.isOpen}
        onClose={() => { detailModal.close(); setCommentDraft(''); }}
        isDarkMode={isDarkMode}
        maxWidth="lg"
        icon={<ListTodo className="w-5 h-5" />}
        title={detailTask?.title || 'Task'}
        subtitle={detailTask?.section ? `Section: ${detailTask.section}` : undefined}
      >
        {detailTask && (
          <div className="space-y-4">
            {detailTask.description && (
              <p className={`text-sm ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>{detailTask.description}</p>
            )}

            <div className="flex flex-wrap items-center gap-3 text-xs">
              <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg border ${isDarkMode ? PRIORITY_STYLES[detailTask.priority].dark : PRIORITY_STYLES[detailTask.priority].light}`}>
                {detailTask.priority}
              </span>
              {detailTask.dueDate && (
                <span className={isDarkMode ? 'text-slate-400' : 'text-slate-500'}>
                  Due {new Date(detailTask.dueDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                </span>
              )}
              {detailTask.linkedEntityLabel && (
                <span className={`inline-flex items-center gap-1 ${isDarkMode ? 'text-teal-300' : 'text-teal-700'}`}>
                  <Link2 className="w-3 h-3" /> {detailTask.linkedEntityLabel}
                </span>
              )}
            </div>

            <div>
              <div className={`text-[11px] font-semibold uppercase tracking-wide mb-1.5 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Assignees</div>
              <div className="flex flex-wrap gap-1.5">
                {detailTask.assignees.map((a) => (
                  <span key={a.userId} className={`px-2 py-1 rounded-lg text-xs ${isDarkMode ? 'bg-slate-800/60 text-slate-200' : 'bg-slate-100 text-slate-700'}`}>{a.name}</span>
                ))}
              </div>
            </div>

            {canManageTasks && detailTask.status !== 'CANCELLED' && (
              <button
                onClick={() => { detailModal.close(); cancelModal.open({ id: detailTask.id }); }}
                className={`text-xs font-bold flex items-center gap-1.5 ${isDarkMode ? 'text-rose-400 hover:text-rose-300' : 'text-rose-600 hover:text-rose-700'}`}
              >
                <Ban className="w-3.5 h-3.5" /> Cancel this task
              </button>
            )}

            <div className={`pt-3 border-t ${isDarkMode ? 'border-slate-800' : 'border-slate-200'}`}>
              <div className={`text-[11px] font-semibold uppercase tracking-wide mb-2 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                Activity ({detailTask.comments.length})
              </div>
              <div className="space-y-2.5 max-h-48 overflow-y-auto mb-3">
                {detailTask.comments.map((c) => (
                  <div key={c.id} className={`text-xs p-2.5 rounded-xl ${isDarkMode ? 'bg-slate-800/40' : 'bg-slate-50'}`}>
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="font-bold">{c.authorName || 'Someone'}</span>
                      <span className={isDarkMode ? 'text-slate-500' : 'text-slate-400'}>{new Date(c.createdAt).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                    <p className={isDarkMode ? 'text-slate-300' : 'text-slate-700'}>{c.body}</p>
                  </div>
                ))}
                {detailTask.comments.length === 0 && (
                  <p className={`text-xs ${isDarkMode ? 'text-slate-600' : 'text-slate-400'}`}>No activity yet.</p>
                )}
              </div>

              {(canManageTasks || isInvolved(detailTask)) && (
                <div className="flex items-center gap-2">
                  <input
                    value={commentDraft}
                    onChange={(e) => setCommentDraft(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') handlePostComment(); }}
                    placeholder="Add an update…"
                    className={`flex-1 p-2.5 rounded-xl border text-xs focus:outline-none focus:ring-2 focus:ring-teal-500/40 ${
                      isDarkMode ? 'bg-slate-950/60 border-slate-800 text-white placeholder:text-slate-600' : 'bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400'
                    }`}
                  />
                  <button
                    onClick={handlePostComment}
                    disabled={!commentDraft.trim() || isSubmitting}
                    className="p-2.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <Send className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </Modal>

      {/* ============================ CANCEL CONFIRMATION MODAL ============================ */}
      <Modal
        isOpen={cancelModal.isOpen}
        onClose={() => { cancelModal.close(); setCancelReason(''); }}
        isDarkMode={isDarkMode}
        maxWidth="md"
        icon={<Ban className="w-5 h-5" />}
        title="Cancel Task"
        subtitle={taskPendingCancel ? `"${taskPendingCancel.title}"` : undefined}
        footer={
          <div className="flex items-center justify-end gap-3 w-full">
            <button
              onClick={() => { cancelModal.close(); setCancelReason(''); }}
              className={`min-h-[42px] px-4 py-2 rounded-xl text-xs font-bold transition-ui cursor-pointer ${
                isDarkMode ? 'text-slate-300 hover:text-white bg-slate-800/60 hover:bg-slate-800 border border-slate-750' : 'border border-slate-300 text-slate-700 hover:bg-slate-100'
              }`}
            >
              Keep Task
            </button>
            <button
              onClick={handleConfirmCancel}
              disabled={isSubmitting}
              className="min-h-[42px] px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow-lg shadow-rose-500/20 cursor-pointer transition-ui disabled:opacity-50"
            >
              {isSubmitting ? 'Cancelling…' : 'Cancel Task'}
            </button>
          </div>
        }
      >
        <p className={`text-sm mb-3 ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
          Assignees will be notified. Any pending due-date reminders will be retracted.
        </p>
        <label className={`text-xs font-semibold uppercase tracking-wide ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Reason (optional)</label>
        <textarea
          value={cancelReason}
          onChange={(e) => setCancelReason(e.target.value)}
          rows={3}
          placeholder="e.g. No longer needed"
          className={`w-full mt-1.5 p-3 rounded-xl border text-sm font-sans resize-none focus:outline-none focus:ring-2 focus:ring-teal-500/40 ${
            isDarkMode ? 'bg-slate-950/60 border-slate-800 text-white placeholder:text-slate-600' : 'bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400'
          }`}
        />
      </Modal>
    </div>
  );
};

// ============================================================================
// Create / Edit form modal
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

const TaskFormModal: React.FC<TaskFormModalProps> = ({ isOpen, onClose, isDarkMode, isSubmitting, users, editingTask, onSubmit }) => {
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
  const inputCls = `w-full mt-1.5 p-3 rounded-xl border text-sm font-sans focus:outline-none focus:ring-2 focus:ring-teal-500/40 ${
    isDarkMode ? 'bg-slate-950/60 border-slate-800 text-white placeholder:text-slate-600' : 'bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400'
  }`;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      isDarkMode={isDarkMode}
      maxWidth="2xl"
      icon={<ListTodo className="w-5 h-5" />}
      title={isEdit ? 'Edit Task' : 'Assign a Task'}
      subtitle={dueDate ? 'A reminder is sent 24h before the due date.' : undefined}
      footer={
        <div className="flex items-center justify-end gap-3 w-full">
          <button
            onClick={onClose}
            className={`min-h-[42px] px-4 py-2 rounded-xl text-xs font-bold transition-ui cursor-pointer ${
              isDarkMode ? 'text-slate-300 hover:text-white bg-slate-800/60 hover:bg-slate-800 border border-slate-750' : 'border border-slate-300 text-slate-700 hover:bg-slate-100'
            }`}
          >
            Cancel
          </button>
          <button
            onClick={() => onSubmit({ title, description, section, priority, dueDate, assigneeUserIds })}
            disabled={!isValid || isSubmitting}
            className="min-h-[42px] px-6 py-2 rounded-xl bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-500 hover:to-cyan-500 text-white font-bold text-xs shadow-lg shadow-teal-500/25 cursor-pointer transition-ui disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? 'Saving…' : isEdit ? 'Save Changes' : 'Assign Task'}
          </button>
        </div>
      }
    >
      <div className="space-y-4">
        <div>
          <label className={`text-xs font-semibold uppercase tracking-wide ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Title *</label>
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Follow up with Vendor X on delayed GRN" className={inputCls} />
        </div>

        <div>
          <label className={`text-xs font-semibold uppercase tracking-wide ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Description</label>
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} placeholder="Any context the assignee needs" className={`${inputCls} resize-none`} />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className={`text-xs font-semibold uppercase tracking-wide ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Priority</label>
            <select value={priority} onChange={(e) => setPriority(e.target.value as TaskPriority)} className={inputCls}>
              <option value="LOW">Low</option>
              <option value="MEDIUM">Medium</option>
              <option value="HIGH">High</option>
              <option value="URGENT">Urgent</option>
            </select>
          </div>
          <div>
            <label className={`text-xs font-semibold uppercase tracking-wide ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Due Date</label>
            <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className={inputCls} />
          </div>
          <div>
            <label className={`text-xs font-semibold uppercase tracking-wide ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Section</label>
            <input value={section} onChange={(e) => setSection(e.target.value)} placeholder="e.g. purchasing" className={inputCls} />
          </div>
        </div>

        <div>
          <label className={`text-xs font-semibold uppercase tracking-wide ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
            Assignees ({assigneeUserIds.length}) *
          </label>
          <input
            value={assigneeSearch}
            onChange={(e) => setAssigneeSearch(e.target.value)}
            placeholder="Search people…"
            className={`${inputCls} mb-2`}
          />
          <div className={`max-h-44 overflow-y-auto rounded-xl border divide-y ${isDarkMode ? 'border-slate-800 divide-slate-800' : 'border-slate-200 divide-slate-100'}`}>
            {filteredUsers.map((u) => (
              <label key={u.id} className={`flex items-center gap-2.5 px-3 py-2 text-sm cursor-pointer ${isDarkMode ? 'hover:bg-slate-800/50' : 'hover:bg-slate-50'}`}>
                <input type="checkbox" checked={assigneeUserIds.includes(u.id)} onChange={() => toggleAssignee(u.id)} className="rounded" />
                <span className={isDarkMode ? 'text-slate-200' : 'text-slate-800'}>{u.name}</span>
                <span className={`text-[11px] font-mono ml-auto ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>{u.role}</span>
              </label>
            ))}
            {filteredUsers.length === 0 && (
              <div className={`px-3 py-4 text-xs text-center ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>No matching users</div>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default TasksView;
