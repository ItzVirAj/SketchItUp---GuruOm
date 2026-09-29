import React, { useState, useEffect, useRef } from 'react';
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
  ChevronDown,
  RotateCcw,
  CalendarDays
} from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { isTaskOverdue, getTaskDate } from './calendarUtils';
import { useBodyScrollLock } from '../../../common/Modal';

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

const STATUS_COLUMNS: { id: TaskStatus; label: string; activeClass: string; dotClass: string }[] = [
  {
    id: 'TODO',
    label: 'To Do',
    activeClass: 'bg-slate-700/90 text-white shadow-xs border-slate-600',
    dotClass: 'bg-slate-400'
  },
  {
    id: 'IN_PROGRESS',
    label: 'In Progress',
    activeClass: 'bg-blue-600 text-white shadow-xs shadow-blue-500/25 border-blue-500',
    dotClass: 'bg-blue-400'
  },
  {
    id: 'BLOCKED',
    label: 'Blocked',
    activeClass: 'bg-amber-600 text-white shadow-xs shadow-amber-500/25 border-amber-500',
    dotClass: 'bg-amber-400'
  },
  {
    id: 'DONE',
    label: 'Done',
    activeClass: 'bg-emerald-600 text-white shadow-xs shadow-emerald-500/25 border-emerald-500',
    dotClass: 'bg-emerald-400'
  }
];

const PRIORITY_OPTIONS: { id: TaskPriority; label: string; badgeClass: string }[] = [
  { id: 'LOW', label: 'Low', badgeClass: 'text-slate-400 bg-slate-500/10 border-slate-500/20' },
  { id: 'MEDIUM', label: 'Medium', badgeClass: 'text-sky-400 bg-sky-500/10 border-sky-500/20' },
  { id: 'HIGH', label: 'High', badgeClass: 'text-amber-400 bg-amber-500/15 border-amber-500/30' },
  { id: 'URGENT', label: 'Urgent', badgeClass: 'text-rose-400 bg-rose-500/20 border-rose-500/40' }
];

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
  const [customDate, setCustomDate] = useState('');
  const [customTime, setCustomTime] = useState('17:00');

  const modalRef = useRef<HTMLDivElement>(null);
  const isMouseDownOnBackdrop = useRef(false);

  // Lock background body scroll when task modal is displayed
  useBodyScrollLock(!!task);

  // Handle ESC key to dismiss modal
  useEffect(() => {
    if (!task) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [task, onClose]);

  // Sync date picker defaults if task changes
  useEffect(() => {
    if (task?.dueDate) {
      const d = new Date(task.dueDate);
      setCustomDate(d.toISOString().slice(0, 10));
      setCustomTime(d.toTimeString().slice(0, 5));
    } else {
      setCustomDate('');
      setCustomTime('17:00');
    }
    setIsRescheduleOpen(false);
    setCommentDraft('');
  }, [task?.id]);

  if (!task) return null;

  const overdue = isTaskOverdue(task);
  const dueDate = getTaskDate(task);
  const isInvolved =
    task.assignedBy === currentUserId ||
    task.assignees.some((a) => a.userId === currentUserId);
  const canAct = canManageTasks || isInvolved;
  const isDone = task.status === 'DONE';

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

  const handleApplyCustomReschedule = async () => {
    if (!customDate) return;
    const [year, month, day] = customDate.split('-').map(Number);
    const [hours, minutes] = customTime.split(':').map(Number);
    const d = new Date(year, month - 1, day, hours, minutes, 0, 0);
    await onReschedule(task.id, d);
    setIsRescheduleOpen(false);
  };

  const currentPriorityConfig = PRIORITY_OPTIONS.find((p) => p.id === task.priority) || PRIORITY_OPTIONS[1];

  return (
    <AnimatePresence>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 md:p-6 bg-slate-950/75 dark:bg-black/80 backdrop-blur-md font-sans"
        data-lenis-prevent="true"
        onMouseDown={(e) => {
          isMouseDownOnBackdrop.current = e.target === e.currentTarget;
        }}
        onClick={(e) => {
          if (e.target === e.currentTarget && isMouseDownOnBackdrop.current) {
            onClose();
          }
          isMouseDownOnBackdrop.current = false;
        }}
      >
        <motion.div
          ref={modalRef}
          initial={{ opacity: 0, scale: 0.96, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 12 }}
          transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
          onMouseDown={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
          className={`relative w-full max-w-4xl max-h-[92vh] sm:max-h-[88vh] flex flex-col rounded-3xl border shadow-[0_30px_90px_rgba(0,0,0,0.7)] backdrop-blur-3xl overflow-hidden ${
            isDarkMode
              ? 'bg-[#101014]/98 border-white/[0.12] text-zinc-100 ring-1 ring-white/[0.08]'
              : 'bg-white/98 border-slate-200/90 text-slate-900 ring-1 ring-black/[0.04]'
          }`}
        >
          {/* Subtle top specular accent highlight */}
          <div className="h-px bg-gradient-to-r from-transparent via-[var(--accent-primary)]/40 to-transparent absolute top-0 inset-x-0 pointer-events-none z-10" />

          {/* ── Modal Header ── */}
          <div
            className={`shrink-0 px-6 py-5 border-b flex items-start justify-between gap-4 select-none ${
              isDarkMode ? 'border-white/[0.08] bg-white/[0.02]' : 'border-slate-200/80 bg-slate-50/60'
            }`}
          >
            <div className="space-y-2 min-w-0 flex-1">
              {/* Context Badges Bar */}
              <div className="flex items-center gap-2 flex-wrap">
                {task.section && (
                  <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold tracking-wide bg-[var(--accent-primary)]/15 text-[var(--accent-primary)] border border-[var(--accent-primary)]/30">
                    {task.section}
                  </span>
                )}
                <span
                  className={`px-2.5 py-0.5 rounded-full text-[11px] font-medium border flex items-center gap-1.5 ${currentPriorityConfig.badgeClass}`}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-current opacity-80" />
                  {currentPriorityConfig.label} Priority
                </span>
                {overdue && (
                  <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold border border-rose-500/40 bg-rose-500/15 text-rose-300 flex items-center gap-1.5 animate-pulse">
                    <AlertTriangle className="w-3 h-3 text-rose-400" />
                    Overdue
                  </span>
                )}
                {isDone && (
                  <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold border border-emerald-500/40 bg-emerald-500/15 text-emerald-300 flex items-center gap-1.5">
                    <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                    Completed
                  </span>
                )}
              </div>

              {/* Task Title */}
              <h2 className="text-lg sm:text-xl md:text-2xl font-bold tracking-tight leading-snug">
                {task.title}
              </h2>
            </div>

            {/* Header Right Actions */}
            <div className="flex items-center gap-2 shrink-0 pt-0.5">
              {canManageTasks && (
                <button
                  type="button"
                  onClick={() => onOpenEditModal(task)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all cursor-pointer active:scale-95 ${
                    isDarkMode
                      ? 'border-white/10 bg-white/[0.04] hover:bg-white/[0.09] text-zinc-300 hover:text-white'
                      : 'border-slate-200 bg-white hover:bg-slate-100 text-slate-700'
                  }`}
                  title="Edit task details"
                >
                  <Pencil className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Edit</span>
                </button>
              )}
              <button
                type="button"
                onClick={onClose}
                aria-label="Close modal"
                className={`w-8 h-8 rounded-full flex items-center justify-center transition-all cursor-pointer active:scale-95 ${
                  isDarkMode
                    ? 'bg-white/10 hover:bg-white/20 text-zinc-300 hover:text-white border border-white/10'
                    : 'bg-slate-200/80 hover:bg-slate-300 text-slate-600 hover:text-slate-900 border border-slate-300/50'
                }`}
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* ── Modal Scrollable Body: 2-Column Responsive Workspace ── */}
          <div className="flex-1 overflow-y-auto p-5 sm:p-6">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* ── LEFT COLUMN: Status Pipeline, Description, Activity Notes (~60%) ── */}
              <div className="lg:col-span-7 space-y-6">
                {/* Status Segmented Control Pipeline */}
                {canAct && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-zinc-400">Workflow Status</span>
                      <span className="text-[11px] text-zinc-500">Click to advance</span>
                    </div>
                    <div
                      className={`p-1 rounded-2xl border flex items-center gap-1 ${
                        isDarkMode ? 'bg-black/40 border-white/10' : 'bg-slate-100 border-slate-200'
                      }`}
                    >
                      {STATUS_COLUMNS.map((col) => {
                        const isSelected = task.status === col.id;
                        return (
                          <button
                            key={col.id}
                            type="button"
                            onClick={() => onUpdateStatus(task.id, col.id)}
                            className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-2 rounded-xl text-xs font-semibold transition-all cursor-pointer active:scale-98 ${
                              isSelected
                                ? col.activeClass
                                : isDarkMode
                                  ? 'text-zinc-400 hover:text-white hover:bg-white/[0.04]'
                                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                            }`}
                          >
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-white' : col.dotClass}`}
                            />
                            <span>{col.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Description Block */}
                <div
                  className={`p-5 rounded-2xl border space-y-2.5 ${
                    isDarkMode ? 'border-white/10 bg-white/[0.02]' : 'border-slate-200 bg-slate-50/70'
                  }`}
                >
                  <h3 className="text-xs font-semibold text-zinc-400 flex items-center gap-2">
                    <span>Task Description</span>
                  </h3>
                  <div className="text-sm leading-relaxed whitespace-pre-wrap text-zinc-300 dark:text-zinc-300">
                    {task.description ? (
                      task.description
                    ) : (
                      <span className="text-zinc-500 italic text-xs">
                        No additional description provided.
                      </span>
                    )}
                  </div>
                </div>

                {/* Activity & Comments Stream */}
                <div
                  className={`p-5 rounded-2xl border space-y-4 ${
                    isDarkMode ? 'border-white/10 bg-white/[0.02]' : 'border-slate-200 bg-slate-50/70'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-semibold text-zinc-400 flex items-center gap-2">
                      <MessageSquare className="w-3.5 h-3.5 text-[var(--accent-primary)]" />
                      <span>Activity & Updates</span>
                      <span className="px-2 py-0.2 rounded-full text-[10px] bg-white/10 text-zinc-300">
                        {task.comments.length}
                      </span>
                    </h3>
                  </div>

                  {/* Comment List */}
                  <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
                    {task.comments.map((c) => (
                      <div
                        key={c.id}
                        className={`p-3.5 rounded-2xl border text-xs space-y-1.5 ${
                          isDarkMode ? 'border-white/[0.06] bg-white/[0.03]' : 'border-slate-200 bg-white shadow-2xs'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <div className="w-5 h-5 rounded-full bg-[var(--accent-primary)]/20 text-[var(--accent-primary)] flex items-center justify-center font-bold text-[9px]">
                              {c.authorName?.slice(0, 2).toUpperCase() || 'TM'}
                            </div>
                            <span className="font-semibold text-zinc-200">{c.authorName || 'Teammate'}</span>
                          </div>
                          <span className="text-[11px] text-zinc-500">
                            {new Date(c.createdAt).toLocaleString('en-IN', {
                              day: '2-digit',
                              month: 'short',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </span>
                        </div>
                        <p className="text-zinc-300 leading-relaxed pl-7">{c.body}</p>
                      </div>
                    ))}

                    {task.comments.length === 0 && (
                      <div className="text-center py-6 border border-dashed border-white/10 rounded-2xl">
                        <MessageSquare className="w-5 h-5 mx-auto text-zinc-600 mb-1.5" />
                        <p className="text-xs text-zinc-400 font-medium">No progress updates yet</p>
                        <p className="text-[11px] text-zinc-500 mt-0.5">
                          Post a note below to keep team members aligned.
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Inline Composer */}
                  {canAct && (
                    <div className="pt-2 border-t border-white/[0.06]">
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={commentDraft}
                          onChange={(e) => setCommentDraft(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                              e.preventDefault();
                              handlePostComment();
                            }
                          }}
                          placeholder="Write a progress note… (Press Enter to post)"
                          className={`flex-1 px-3.5 py-2.5 rounded-xl border text-xs outline-none transition-all ${
                            isDarkMode
                              ? 'border-white/10 bg-white/[0.04] text-white placeholder:text-zinc-500 focus:border-[var(--accent-primary)] focus:bg-white/[0.06]'
                              : 'border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 focus:border-[var(--accent-primary)]'
                          }`}
                        />
                        <button
                          type="button"
                          onClick={handlePostComment}
                          disabled={!commentDraft.trim() || isSubmittingComment}
                          className="h-9 px-3 flex items-center justify-center gap-1.5 rounded-xl bg-[var(--accent-primary)] hover:bg-[var(--accent-hover)] text-white text-xs font-semibold shadow-md transition-all disabled:opacity-40 cursor-pointer active:scale-95"
                        >
                          <Send className="w-3.5 h-3.5" />
                          <span className="hidden sm:inline">Post</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* ── RIGHT COLUMN: Quick Actions, Schedule & Metadata (~40%) ── */}
              <div
                className={`lg:col-span-5 space-y-5 lg:border-l ${
                  isDarkMode ? 'lg:border-white/[0.08]' : 'lg:border-slate-200'
                } lg:pl-6`}
              >
                {/* Primary Action Button (Done / Reopen) */}
                <div className="space-y-2">
                  <span className="text-xs font-semibold text-zinc-400">Quick Actions</span>
                  <button
                    type="button"
                    onClick={() => onUpdateStatus(task.id, isDone ? 'TODO' : 'DONE')}
                    className={`w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl border text-xs font-bold transition-all cursor-pointer active:scale-98 ${
                      isDone
                        ? 'border-white/10 bg-white/[0.04] text-zinc-300 hover:bg-white/[0.08]'
                        : 'border-emerald-500/40 bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/25 shadow-xs shadow-emerald-950/40'
                    }`}
                  >
                    {isDone ? (
                      <>
                        <RotateCcw className="w-4 h-4" />
                        <span>Reopen Task</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        <span>Mark as Completed</span>
                      </>
                    )}
                  </button>

                  {/* Reschedule Button & Popover */}
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setIsRescheduleOpen(!isRescheduleOpen)}
                      className={`w-full flex items-center justify-between py-2 px-3 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${
                        isDarkMode
                          ? 'border-white/10 bg-white/[0.03] hover:bg-white/[0.07] text-zinc-200'
                          : 'border-slate-200 bg-white hover:bg-slate-100 text-slate-700'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <Calendar className="w-3.5 h-3.5 text-[var(--accent-primary)]" />
                        <span>Reschedule Deadline</span>
                      </div>
                      <ChevronDown
                        className={`w-3.5 h-3.5 text-zinc-400 transition-transform ${
                          isRescheduleOpen ? 'rotate-180' : ''
                        }`}
                      />
                    </button>

                    {isRescheduleOpen && (
                      <div
                        className={`absolute left-0 right-0 top-full mt-2 rounded-2xl border p-2.5 shadow-2xl z-30 space-y-2 backdrop-blur-2xl ${
                          isDarkMode
                            ? 'bg-[#18181c] border-white/15 text-zinc-200 shadow-black/80'
                            : 'bg-white border-slate-200 text-slate-800 shadow-xl'
                        }`}
                      >
                        <div className="text-[11px] font-semibold text-zinc-400 px-2 pt-1">
                          Quick Presets
                        </div>
                        <div className="grid grid-cols-2 gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleQuickReschedule(0)}
                            className="text-left px-2.5 py-1.5 rounded-lg text-xs hover:bg-[var(--accent-primary)]/15 hover:text-[var(--accent-primary)] cursor-pointer transition-colors"
                          >
                            Today 5 PM
                          </button>
                          <button
                            type="button"
                            onClick={() => handleQuickReschedule(1)}
                            className="text-left px-2.5 py-1.5 rounded-lg text-xs hover:bg-[var(--accent-primary)]/15 hover:text-[var(--accent-primary)] cursor-pointer transition-colors"
                          >
                            Tomorrow 5 PM
                          </button>
                          <button
                            type="button"
                            onClick={() => handleQuickReschedule(3)}
                            className="text-left px-2.5 py-1.5 rounded-lg text-xs hover:bg-[var(--accent-primary)]/15 hover:text-[var(--accent-primary)] cursor-pointer transition-colors"
                          >
                            In 3 Days
                          </button>
                          <button
                            type="button"
                            onClick={() => handleQuickReschedule(7)}
                            className="text-left px-2.5 py-1.5 rounded-lg text-xs hover:bg-[var(--accent-primary)]/15 hover:text-[var(--accent-primary)] cursor-pointer transition-colors"
                          >
                            Next Week
                          </button>
                        </div>

                        {/* Custom Date Input inside Popover */}
                        <div className="pt-2 border-t border-white/10 space-y-1.5">
                          <div className="text-[11px] font-semibold text-zinc-400 px-1">
                            Custom Date & Time
                          </div>
                          <div className="grid grid-cols-12 gap-1.5">
                            <input
                              type="date"
                              value={customDate}
                              onChange={(e) => setCustomDate(e.target.value)}
                              className={`col-span-7 px-2 py-1 rounded-lg border text-xs outline-none ${
                                isDarkMode
                                  ? 'border-white/10 bg-white/[0.04] text-white'
                                  : 'border-slate-200 bg-slate-50'
                              }`}
                            />
                            <input
                              type="time"
                              value={customTime}
                              onChange={(e) => setCustomTime(e.target.value)}
                              className={`col-span-5 px-2 py-1 rounded-lg border text-xs outline-none ${
                                isDarkMode
                                  ? 'border-white/10 bg-white/[0.04] text-white'
                                  : 'border-slate-200 bg-slate-50'
                              }`}
                            />
                          </div>
                          <button
                            type="button"
                            onClick={handleApplyCustomReschedule}
                            disabled={!customDate}
                            className="w-full py-1.5 rounded-lg bg-[var(--accent-primary)] hover:bg-[var(--accent-hover)] text-white text-xs font-semibold cursor-pointer disabled:opacity-40 transition-colors"
                          >
                            Apply Date
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Priority Setting Tile */}
                {canManageTasks && (
                  <div
                    className={`p-3.5 rounded-2xl border space-y-2 ${
                      isDarkMode ? 'border-white/[0.08] bg-white/[0.02]' : 'border-slate-200 bg-slate-50/70'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-zinc-400">Priority Level</span>
                      <span
                        className={`text-[11px] font-medium px-2 py-0.5 rounded-full border ${currentPriorityConfig.badgeClass}`}
                      >
                        {currentPriorityConfig.label}
                      </span>
                    </div>
                    <div className="grid grid-cols-4 gap-1 pt-1">
                      {PRIORITY_OPTIONS.map((p) => {
                        const isCur = task.priority === p.id;
                        return (
                          <button
                            key={p.id}
                            type="button"
                            onClick={() => onUpdatePriority(task.id, p.id)}
                            className={`py-1.5 rounded-xl text-[11px] font-semibold transition-all cursor-pointer ${
                              isCur
                                ? 'bg-white/20 text-white shadow-xs font-bold border border-white/20'
                                : 'text-zinc-400 hover:text-white hover:bg-white/[0.05]'
                            }`}
                          >
                            {p.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Schedule & Due Date Information Tile */}
                <div
                  className={`p-4 rounded-2xl border space-y-3 ${
                    isDarkMode ? 'border-white/[0.08] bg-white/[0.02]' : 'border-slate-200 bg-slate-50/70'
                  }`}
                >
                  <span className="text-xs font-semibold text-zinc-400 block">
                    Schedule & Reference
                  </span>

                  <div className="space-y-2.5 text-xs">
                    {/* Due Date row */}
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-zinc-400 flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-zinc-500" />
                        Due Date:
                      </span>
                      <span
                        className={`font-semibold ${
                          overdue ? 'text-rose-400' : isDarkMode ? 'text-zinc-200' : 'text-slate-800'
                        }`}
                      >
                        {dueDate
                          ? dueDate.toLocaleString('en-IN', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })
                          : 'Unscheduled'}
                      </span>
                    </div>

                    {/* Created date row */}
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-zinc-400 flex items-center gap-1.5">
                        <CalendarDays className="w-3.5 h-3.5 text-zinc-500" />
                        Created:
                      </span>
                      <span className="text-zinc-300">
                        {new Date(task.createdAt).toLocaleDateString('en-IN', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric'
                        })}
                      </span>
                    </div>

                    {/* Linked entity if present */}
                    {task.linkedEntityLabel && (
                      <div className="pt-2 border-t border-white/[0.06] flex items-center justify-between gap-2">
                        <span className="text-zinc-400 flex items-center gap-1.5">
                          <Link2 className="w-3.5 h-3.5 text-[var(--accent-primary)]" />
                          Linked:
                        </span>
                        <span className="font-semibold text-zinc-200 truncate max-w-[160px]">
                          {task.linkedEntityLabel}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Assigned Teammates Roster */}
                <div
                  className={`p-4 rounded-2xl border space-y-3 ${
                    isDarkMode ? 'border-white/[0.08] bg-white/[0.02]' : 'border-slate-200 bg-slate-50/70'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-zinc-400 flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5 text-[var(--accent-primary)]" />
                      Assigned Teammates ({task.assignees.length})
                    </span>
                  </div>

                  <div className="space-y-1.5 max-h-44 overflow-y-auto pr-1">
                    {task.assignees.map((a) => (
                      <div
                        key={a.userId}
                        className={`flex items-center gap-2.5 p-2 rounded-xl border text-xs ${
                          isDarkMode ? 'border-white/[0.06] bg-white/[0.03]' : 'border-slate-200 bg-white'
                        }`}
                      >
                        <div className="w-6 h-6 rounded-full bg-[var(--accent-primary)]/20 text-[var(--accent-primary)] flex items-center justify-center font-bold text-[10px] shrink-0">
                          {a.name?.slice(0, 2).toUpperCase() || 'TM'}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold text-zinc-200 truncate">{a.name}</p>
                        </div>
                      </div>
                    ))}

                    {task.assignees.length === 0 && (
                      <p className="text-xs text-zinc-500 italic py-1">No assignees selected</p>
                    )}
                  </div>
                </div>

                {/* Danger Zone: Cancel Task */}
                {canManageTasks && task.status !== 'CANCELLED' && (
                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={() => onOpenCancelModal(task)}
                      className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl border border-rose-500/20 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 text-xs font-semibold transition-all cursor-pointer active:scale-98"
                    >
                      <Ban className="w-3.5 h-3.5" />
                      <span>Cancel Task</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

// Also export TaskDetailModal as alias for TaskDetailSidePanel
export const TaskDetailModal = TaskDetailSidePanel;
export default TaskDetailSidePanel;
