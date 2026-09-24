import React, { useState } from 'react';
import { Task, TaskPriority, TaskStatus } from '../../../../services/consoleApiServices';
import {
  X,
  Calendar,
  Clock,
  User,
  Users,
  MessageSquare,
  Send,
  Pencil,
  Ban,
  CheckCircle2,
  AlertTriangle,
  Link2,
  ChevronDown
} from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { isTaskOverdue, getTaskDate } from './calendarUtils';

interface TaskDetailSidePanelProps {
  task: Task | null;
  onClose: () => void;
  isDarkMode: boolean;
  canManageTasks: boolean;
  currentUserId?: string;
  onUpdateStatus: (id: string, status: TaskStatus) => Promise<any>;
  onUpdatePriority: (id: string, priority: TaskPriority) => Promise<any>;
  onReschedule: (id: string, targetDate: Date) => Promise<any>;
  onAddComment: (id: string, body: string) => Promise<any>;
  onOpenEditModal: (task: Task) => void;
  onOpenCancelModal: (task: Task) => void;
}

const STATUS_COLUMNS: { id: TaskStatus; label: string }[] = [
  { id: 'TODO', label: 'To Do' },
  { id: 'IN_PROGRESS', label: 'In Progress' },
  { id: 'BLOCKED', label: 'Blocked' },
  { id: 'DONE', label: 'Done' }
];

const PRIORITY_OPTIONS: TaskPriority[] = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'];

export const TaskDetailSidePanel: React.FC<TaskDetailSidePanelProps> = ({
  task,
  onClose,
  isDarkMode,
  canManageTasks,
  currentUserId,
  onUpdateStatus,
  onUpdatePriority,
  onReschedule,
  onAddComment,
  onOpenEditModal,
  onOpenCancelModal
}) => {
  const [commentDraft, setCommentDraft] = useState('');
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const [isRescheduleOpen, setIsRescheduleOpen] = useState(false);

  if (!task) return null;

  const overdue = isTaskOverdue(task);
  const dueDate = getTaskDate(task);
  const isInvolved =
    task.assignedBy === currentUserId ||
    task.assignees.some((a) => a.userId === currentUserId);
  const canAct = canManageTasks || isInvolved;

  const handlePostComment = async () => {
    if (!commentDraft.trim() || isSubmittingComment) return;
    setIsSubmittingComment(true);
    try {
      await onAddComment(task.id, commentDraft.trim());
      setCommentDraft('');
    } finally {
      setIsSubmittingComment(false);
    }
  };

  const handleQuickReschedule = async (daysOffset: number) => {
    const d = new Date();
    d.setDate(d.getDate() + daysOffset);
    d.setHours(17, 0, 0, 0);
    await onReschedule(task.id, d);
    setIsRescheduleOpen(false);
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 pointer-events-none font-sans">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/40 backdrop-blur-xs pointer-events-auto"
        />

        {/* Slide-over Side Panel */}
        <motion.div
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          exit={{ x: '100%' }}
          transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
          className={`absolute right-0 top-0 bottom-0 w-full max-w-lg pointer-events-auto flex flex-col border-l shadow-2xl backdrop-blur-3xl overflow-hidden ${
            isDarkMode
              ? 'bg-[#09090B]/95 border-white/10 text-white'
              : 'bg-white/95 border-slate-200 text-slate-900'
          }`}
        >
          {/* Header */}
          <div className="p-5 border-b border-white/10 flex items-start justify-between gap-3">
            <div className="space-y-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                {task.section && (
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider bg-[var(--accent-primary)]/15 text-[var(--accent-primary)] border border-[var(--accent-primary)]/30">
                    {task.section}
                  </span>
                )}
                <span
                  className={`px-2 py-0.5 rounded-md text-[10px] font-mono font-bold border ${
                    task.priority === 'URGENT'
                      ? 'border-rose-500/30 bg-rose-500/15 text-rose-300'
                      : task.priority === 'HIGH'
                        ? 'border-amber-500/30 bg-amber-500/15 text-amber-300'
                        : 'border-white/10 bg-white/5 text-slate-300'
                  }`}
                >
                  {task.priority}
                </span>
                {overdue && (
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-bold border border-rose-500/40 bg-rose-500/20 text-rose-300 flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" /> Overdue
                  </span>
                )}
              </div>
              <h2 className="text-base sm:text-lg font-bold tracking-tight leading-snug">
                {task.title}
              </h2>
            </div>

            <div className="flex items-center gap-1 shrink-0">
              {canManageTasks && (
                <button
                  type="button"
                  onClick={() => onOpenEditModal(task)}
                  title="Edit task details"
                  className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                >
                  <Pencil className="w-4 h-4" />
                </button>
              )}
              <button
                type="button"
                onClick={onClose}
                aria-label="Close panel"
                className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Scrollable Content */}
          <div className="flex-1 overflow-y-auto p-5 space-y-5">
            {/* Status Segmented Picker */}
            {canAct && (
              <div className="space-y-1.5">
                <label className="text-[10px] font-mono uppercase font-bold text-slate-400">
                  Status Workflow
                </label>
                <div
                  className={`p-1 rounded-2xl border flex items-center justify-between ${
                    isDarkMode ? 'bg-black/40 border-white/10' : 'bg-slate-100 border-slate-200'
                  }`}
                >
                  {STATUS_COLUMNS.map((c) => {
                    const isCur = task.status === c.id;
                    return (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => onUpdateStatus(task.id, c.id)}
                        className={`flex-1 py-1.5 px-2 rounded-xl text-xs font-mono font-bold transition-ui cursor-pointer ${
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
              </div>
            )}

            {/* Quick Action Toolbar */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
              {/* Complete / Reopen button */}
              <button
                type="button"
                onClick={() => onUpdateStatus(task.id, task.status === 'DONE' ? 'TODO' : 'DONE')}
                className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl border text-xs font-semibold transition-ui cursor-pointer ${
                  task.status === 'DONE'
                    ? 'border-white/10 bg-white/5 text-slate-300 hover:bg-white/10'
                    : 'border-emerald-500/30 bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/25 font-bold'
                }`}
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>{task.status === 'DONE' ? 'Reopen' : 'Complete'}</span>
              </button>

              {/* Reschedule Dropdown */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setIsRescheduleOpen(!isRescheduleOpen)}
                  className="w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl border border-white/10 bg-white/[0.03] hover:bg-white/[0.08] text-xs font-semibold text-slate-200 transition-ui cursor-pointer"
                >
                  <Calendar className="w-3.5 h-3.5" />
                  <span>Reschedule</span>
                  <ChevronDown className="w-3 h-3" />
                </button>

                {isRescheduleOpen && (
                  <div
                    className={`absolute left-0 top-full mt-1.5 w-44 rounded-2xl border p-1 shadow-2xl z-20 space-y-1 ${
                      isDarkMode ? 'bg-[#121216] border-white/10' : 'bg-white border-slate-200 shadow-lg'
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => handleQuickReschedule(0)}
                      className="w-full text-left px-3 py-1.5 rounded-xl text-xs hover:bg-[var(--accent-primary)]/15 hover:text-[var(--accent-primary)] cursor-pointer"
                    >
                      Move to Today
                    </button>
                    <button
                      type="button"
                      onClick={() => handleQuickReschedule(1)}
                      className="w-full text-left px-3 py-1.5 rounded-xl text-xs hover:bg-[var(--accent-primary)]/15 hover:text-[var(--accent-primary)] cursor-pointer"
                    >
                      Move to Tomorrow
                    </button>
                    <button
                      type="button"
                      onClick={() => handleQuickReschedule(7)}
                      className="w-full text-left px-3 py-1.5 rounded-xl text-xs hover:bg-[var(--accent-primary)]/15 hover:text-[var(--accent-primary)] cursor-pointer"
                    >
                      Move to Next Week
                    </button>
                  </div>
                )}
              </div>

              {/* Change Priority */}
              {canManageTasks && (
                <select
                  value={task.priority}
                  onChange={(e) => onUpdatePriority(task.id, e.target.value as TaskPriority)}
                  className={`py-2 px-2.5 rounded-xl border text-xs font-semibold outline-none cursor-pointer ${
                    isDarkMode ? 'border-white/10 bg-white/[0.03] text-slate-200' : 'border-slate-200 bg-white'
                  }`}
                >
                  {PRIORITY_OPTIONS.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              )}

              {/* Cancel Task button */}
              {canManageTasks && task.status !== 'CANCELLED' && (
                <button
                  type="button"
                  onClick={() => onOpenCancelModal(task)}
                  className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl border border-rose-500/20 bg-rose-500/10 text-rose-300 hover:bg-rose-500/20 text-xs font-semibold transition-ui cursor-pointer"
                >
                  <Ban className="w-3.5 h-3.5" />
                  <span>Cancel</span>
                </button>
              )}
            </div>

            {/* Description Card */}
            <div className={`p-4 rounded-2xl border space-y-2 ${isDarkMode ? 'border-white/10 bg-white/[0.02]' : 'border-slate-200 bg-slate-50'}`}>
              <h4 className="text-[11px] font-mono uppercase font-bold text-slate-400">Description</h4>
              <p className="text-xs sm:text-sm leading-relaxed whitespace-pre-wrap">
                {task.description || 'No description provided.'}
              </p>
            </div>

            {/* Schedule & Timing Info */}
            <div className={`p-4 rounded-2xl border space-y-2.5 ${isDarkMode ? 'border-white/10 bg-white/[0.02]' : 'border-slate-200 bg-slate-50'}`}>
              <h4 className="text-[11px] font-mono uppercase font-bold text-slate-400">Schedule & Timestamps</h4>
              <div className="grid grid-cols-2 gap-3 text-xs font-mono">
                <div>
                  <span className="text-slate-500 block">Due Deadline</span>
                  <b className={overdue ? 'text-rose-400' : 'text-slate-200'}>
                    {dueDate ? dueDate.toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : 'Unscheduled'}
                  </b>
                </div>
                <div>
                  <span className="text-slate-500 block">Created On</span>
                  <span className="text-slate-300">
                    {new Date(task.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                  </span>
                </div>
              </div>

              {task.linkedEntityLabel && (
                <div className="pt-2 border-t border-white/5 flex items-center gap-2 text-xs">
                  <Link2 className="w-3.5 h-3.5 text-[var(--accent-primary)]" />
                  <span className="text-slate-400">Linked:</span>
                  <span className="font-semibold text-slate-200">{task.linkedEntityLabel}</span>
                </div>
              )}
            </div>

            {/* Assigned Teammates */}
            <div className={`p-4 rounded-2xl border space-y-2.5 ${isDarkMode ? 'border-white/10 bg-white/[0.02]' : 'border-slate-200 bg-slate-50'}`}>
              <div className="flex items-center justify-between">
                <h4 className="text-[11px] font-mono uppercase font-bold text-slate-400 flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-[var(--accent-primary)]" /> Assigned Teammates ({task.assignees.length})
                </h4>
              </div>

              <div className="flex flex-wrap gap-2">
                {task.assignees.map((a) => (
                  <div
                    key={a.userId}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs ${
                      isDarkMode ? 'border-white/10 bg-white/[0.03]' : 'border-slate-200 bg-white'
                    }`}
                  >
                    <div className="w-5 h-5 rounded-full bg-[var(--accent-primary)]/20 text-[var(--accent-primary)] flex items-center justify-center font-bold text-[9px]">
                      {a.name?.slice(0, 2).toUpperCase() || 'TM'}
                    </div>
                    <span className="font-semibold">{a.name}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Activity & Comments Thread */}
            <div className={`p-4 rounded-2xl border space-y-3 ${isDarkMode ? 'border-white/10 bg-white/[0.02]' : 'border-slate-200 bg-slate-50'}`}>
              <div className="flex items-center justify-between">
                <h4 className="text-[11px] font-mono uppercase font-bold text-slate-400 flex items-center gap-1.5">
                  <MessageSquare className="w-3.5 h-3.5 text-[var(--accent-primary)]" /> Activity Notes ({task.comments.length})
                </h4>
              </div>

              <div className="space-y-2.5 max-h-56 overflow-y-auto pr-1">
                {task.comments.map((c) => (
                  <div
                    key={c.id}
                    className={`p-3 rounded-xl border text-xs ${
                      isDarkMode ? 'border-white/5 bg-white/[0.03]' : 'border-slate-200 bg-white'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold">{c.authorName || 'Teammate'}</span>
                      <span className="text-[10px] font-mono text-slate-500">
                        {new Date(c.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <p className="text-slate-300 leading-relaxed">{c.body}</p>
                  </div>
                ))}

                {task.comments.length === 0 && (
                  <p className="text-center text-xs font-mono text-slate-500 py-3">
                    No progress updates posted yet.
                  </p>
                )}
              </div>

              {/* Comment Composer */}
              {canAct && (
                <div className="flex items-center gap-2 pt-2 border-t border-white/5">
                  <input
                    type="text"
                    value={commentDraft}
                    onChange={(e) => setCommentDraft(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handlePostComment();
                    }}
                    placeholder="Write a progress note…"
                    className={`flex-1 px-3.5 py-2 rounded-xl border text-xs outline-none ${
                      isDarkMode
                        ? 'border-white/10 bg-white/[0.04] text-white placeholder:text-slate-500'
                        : 'border-slate-200 bg-white text-slate-900 placeholder:text-slate-400'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={handlePostComment}
                    disabled={!commentDraft.trim() || isSubmittingComment}
                    className="h-9 w-9 flex items-center justify-center rounded-xl bg-[var(--accent-primary)] hover:bg-[var(--accent-hover)] text-white shadow-md transition-ui disabled:opacity-40 cursor-pointer"
                  >
                    <Send className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default TaskDetailSidePanel;
