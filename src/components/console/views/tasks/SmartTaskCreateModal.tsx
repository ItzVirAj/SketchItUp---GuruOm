import React, { useState, useEffect, useMemo, startTransition } from 'react';
import { Modal } from '../../../common/Modal';
import { Task, TaskPriority } from '../../../../services/consoleApiServices';
import { SystemUser } from '../../../../types/console';
import { TASK_CATEGORIES, SCHEDULING_PRESETS } from './calendarUtils';
import { ListTodo, Calendar, Clock, Sparkles, User, Repeat } from 'lucide-react';

interface SmartTaskCreateModalProps {
  isOpen: boolean;
  onClose: () => void;
  isDarkMode: boolean;
  users: SystemUser[];
  initialDate?: Date | null;
  editingTask?: Task | null;
  onSubmit: (form: {
    title: string;
    description: string;
    section: string;
    priority: TaskPriority;
    dueDate: string;
    assigneeUserIds: string[];
  }) => Promise<any>;
}

const DURATIONS = [
  { label: '15m', minutes: 15 },
  { label: '30m', minutes: 30 },
  { label: '1h', minutes: 60 },
  { label: '2h', minutes: 120 },
  { label: '4h', minutes: 240 },
  { label: 'All Day', minutes: 480 }
];

export const SmartTaskCreateModal: React.FC<SmartTaskCreateModalProps> = ({
  isOpen,
  onClose,
  isDarkMode,
  users,
  initialDate,
  editingTask,
  onSubmit
}) => {
  const isEdit = !!editingTask;
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [section, setSection] = useState<string>('Operations');
  const [priority, setPriority] = useState<TaskPriority>('MEDIUM');
  const [dueDate, setDueDate] = useState('');
  const [dueTime, setDueTime] = useState('17:00');
  const [durationMinutes, setDurationMinutes] = useState(60);
  const [recurrence, setRecurrence] = useState<'NONE' | 'DAILY' | 'WEEKLY' | 'MONTHLY'>('NONE');
  const [assigneeUserIds, setAssigneeUserIds] = useState<string[]>([]);
  const [assigneeSearch, setAssigneeSearch] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    startTransition(() => {
      if (editingTask) {
        setTitle(editingTask.title);
        setDescription(editingTask.description || '');
        setSection(editingTask.section || 'Operations');
        setPriority(editingTask.priority);
        if (editingTask.dueDate) {
          const d = new Date(editingTask.dueDate);
          setDueDate(d.toISOString().slice(0, 10));
          setDueTime(d.toTimeString().slice(0, 5));
        } else {
          setDueDate('');
          setDueTime('17:00');
        }
        setAssigneeUserIds(editingTask.assignees.map((a) => a.userId));
        setRecurrence('NONE');
      } else {
        setTitle('');
        setDescription('');
        setSection('Operations');
        setPriority('MEDIUM');
        if (initialDate) {
          setDueDate(initialDate.toISOString().slice(0, 10));
          const h = initialDate.getHours();
          if (h > 0) {
            setDueTime(`${String(h).padStart(2, '0')}:00`);
          } else {
            setDueTime('17:00');
          }
        } else {
          const now = new Date();
          setDueDate(now.toISOString().slice(0, 10));
          setDueTime('17:00');
        }
        setAssigneeUserIds([]);
        setRecurrence('NONE');
        setDurationMinutes(60);
      }
    });
  }, [isOpen, editingTask, initialDate]);

  const filteredUsers = useMemo(() => {
    const q = assigneeSearch.trim().toLowerCase();
    if (!q) return users;
    return users.filter((u) => u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q));
  }, [users, assigneeSearch]);

  const toggleAssignee = (userId: string) => {
    setAssigneeUserIds((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  };

  const applyPreset = (presetDate: Date) => {
    setDueDate(presetDate.toISOString().slice(0, 10));
    setDueTime(presetDate.toTimeString().slice(0, 5));
  };

  const handleSubmit = async () => {
    if (!title.trim() || assigneeUserIds.length === 0 || isSubmitting) return;

    let finalDueDateIso = '';
    if (dueDate) {
      const [year, month, day] = dueDate.split('-').map(Number);
      const [hour, minute] = (dueTime || '17:00').split(':').map(Number);
      const combined = new Date(year, month - 1, day, hour, minute, 0);
      finalDueDateIso = combined.toISOString();
    }

    // Append recurrence note to description if selected
    let finalDesc = description.trim();
    if (recurrence !== 'NONE') {
      finalDesc = `${finalDesc ? finalDesc + '\n\n' : ''}[Recurrence: ${recurrence}]`;
    }

    setIsSubmitting(true);
    try {
      await onSubmit({
        title: title.trim(),
        description: finalDesc,
        section,
        priority,
        dueDate: finalDueDateIso,
        assigneeUserIds
      });
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  const isValid = title.trim().length > 0 && assigneeUserIds.length > 0;

  const inputClass = `w-full rounded-xl border px-3.5 py-2 text-xs transition-ui outline-none ${
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
      title={isEdit ? 'Edit Task Schedule' : 'Schedule New Task'}
      subtitle="Create and place deliverables directly on the team schedule."
      footer={
        <div className="flex items-center justify-end gap-3 w-full">
          <button
            type="button"
            onClick={onClose}
            className={`inline-flex h-10 items-center justify-center gap-2 rounded-xl border text-xs font-semibold transition-ui cursor-pointer active:scale-95 ${
              isDarkMode
                ? 'text-slate-300 hover:text-white bg-white/[0.04] hover:bg-white/[0.08] border-white/10'
                : 'border-slate-300 text-slate-700 hover:bg-slate-100'
            }`}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!isValid || isSubmitting}
            className="flex h-10 items-center justify-center gap-2 rounded-xl bg-[var(--accent-primary)] px-5 text-xs font-extrabold text-white shadow-[0_8px_20px_var(--accent-shadow)] transition-ui hover:bg-[var(--accent-hover)] active:scale-[0.96] cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? 'Scheduling…' : isEdit ? 'Save Changes' : 'Schedule Task'}
          </button>
        </div>
      }
    >
      <div className="space-y-4 font-sans max-h-[75vh] overflow-y-auto pr-1">
        {/* Section 1: Task Core Details */}
        <div className={`rounded-2xl border p-4 space-y-3 ${isDarkMode ? 'border-white/[0.08] bg-black/20' : 'border-slate-200 bg-white'}`}>
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[var(--accent-primary)] font-mono">
            <ListTodo className="h-3.5 w-3.5" /> Core Information
          </div>

          <div>
            <label className="block mb-1 text-xs font-semibold text-slate-400">Task Title *</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Calibrate CMM Coordinate Measuring Machine"
              className={inputClass}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block mb-1 text-xs font-semibold text-slate-400">Category / Section</label>
              <select
                value={section}
                onChange={(e) => setSection(e.target.value)}
                className={inputClass}
              >
                {TASK_CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block mb-1 text-xs font-semibold text-slate-400">Priority Level</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as TaskPriority)}
                className={inputClass}
              >
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
                <option value="URGENT">Urgent (Red Alert)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block mb-1 text-xs font-semibold text-slate-400">Description & Instructions</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              placeholder="Add key context, checklist items, or deliverables…"
              className={`${inputClass} resize-none`}
            />
          </div>
        </div>

        {/* Section 2: Scheduling & Time Presets */}
        <div className={`rounded-2xl border p-4 space-y-3 ${isDarkMode ? 'border-white/[0.08] bg-black/20' : 'border-slate-200 bg-white'}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[var(--accent-primary)] font-mono">
              <Calendar className="h-3.5 w-3.5" /> Date & Time Scheduling
            </div>
            <span className="text-[10px] text-slate-400 font-mono">24h automated reminder</span>
          </div>

          {/* Quick Presets */}
          <div>
            <span className="block mb-1.5 text-[11px] font-semibold text-slate-400">Quick Presets:</span>
            <div className="flex items-center flex-wrap gap-2">
              {SCHEDULING_PRESETS.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => applyPreset(p.getDate())}
                  className={`px-3 py-1 rounded-xl border text-[11px] font-semibold transition-ui cursor-pointer ${
                    isDarkMode
                      ? 'border-white/10 bg-white/[0.03] text-slate-300 hover:bg-white/10 hover:text-white'
                      : 'border-slate-200 bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <div>
              <label className="block mb-1 text-xs font-semibold text-slate-400">Due Date</label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className={inputClass}
              />
            </div>

            <div>
              <label className="block mb-1 text-xs font-semibold text-slate-400">Due Time</label>
              <input
                type="time"
                value={dueTime}
                onChange={(e) => setDueTime(e.target.value)}
                className={inputClass}
              />
            </div>
          </div>

          {/* Estimated Duration & Optional Recurrence */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 border-t border-white/5">
            <div>
              <label className="block mb-1 text-xs font-semibold text-slate-400">Duration Block</label>
              <div className="flex items-center flex-wrap gap-1.5">
                {DURATIONS.map((d) => (
                  <button
                    key={d.minutes}
                    type="button"
                    onClick={() => setDurationMinutes(d.minutes)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-mono border transition-ui cursor-pointer ${
                      durationMinutes === d.minutes
                        ? 'border-[var(--accent-primary)] bg-[var(--accent-primary)]/20 text-[var(--accent-primary)] font-bold'
                        : isDarkMode
                          ? 'border-white/5 text-slate-400 hover:text-white'
                          : 'border-slate-200 text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {d.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block mb-1 text-xs font-semibold text-slate-400 flex items-center gap-1">
                <Repeat className="w-3 h-3 text-[var(--accent-primary)]" />
                <span>Recurrence</span>
              </label>
              <select
                value={recurrence}
                onChange={(e) => setRecurrence(e.target.value as any)}
                className={inputClass}
              >
                <option value="NONE">Does not repeat</option>
                <option value="DAILY">Daily</option>
                <option value="WEEKLY">Weekly</option>
                <option value="MONTHLY">Monthly</option>
              </select>
            </div>
          </div>
        </div>

        {/* Section 3: Assignees */}
        <div className={`rounded-2xl border p-4 space-y-3 ${isDarkMode ? 'border-white/[0.08] bg-black/20' : 'border-slate-200 bg-white'}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[var(--accent-primary)] font-mono">
              <User className="h-3.5 w-3.5" /> Assign To Team * ({assigneeUserIds.length})
            </div>
          </div>

          <input
            type="text"
            value={assigneeSearch}
            onChange={(e) => setAssigneeSearch(e.target.value)}
            placeholder="Search teammates by name or email…"
            className={inputClass}
          />

          <div className="max-h-36 overflow-y-auto space-y-1 rounded-xl border border-white/10 p-2 divide-y divide-white/5">
            {filteredUsers.map((u) => {
              const isChecked = assigneeUserIds.includes(u.id);
              return (
                <label
                  key={u.id}
                  className={`flex items-center justify-between p-2 rounded-lg cursor-pointer transition-colors ${
                    isChecked
                      ? 'bg-[var(--accent-primary)]/10 text-[var(--accent-primary)]'
                      : isDarkMode
                        ? 'hover:bg-white/[0.04] text-slate-300'
                        : 'hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => toggleAssignee(u.id)}
                      className="rounded accent-[var(--accent-primary)]"
                    />
                    <div>
                      <div className="text-xs font-semibold">{u.name}</div>
                      <div className="text-[10px] text-slate-400 font-mono">{u.email}</div>
                    </div>
                  </div>
                  <span className="text-[10px] font-mono capitalize opacity-70">
                    {u.role?.toLowerCase() || 'Team'}
                  </span>
                </label>
              );
            })}
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default SmartTaskCreateModal;
