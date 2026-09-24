import React, { useState, useMemo } from 'react';
import { Task, TaskPriority, TaskStatus } from '../../../../services/consoleApiServices';
import { SystemUser } from '../../../../types/console';
import { CalendarViewMode, isTaskOverdue, getTaskDate, isToday } from './calendarUtils';
import { CalendarHeader } from './CalendarHeader';
import { MonthView } from './MonthView';
import { WeekView } from './WeekView';
import { DayView } from './DayView';
import { AgendaView } from './AgendaView';
import { UnscheduledTasksDrawer } from './UnscheduledTasksDrawer';
import { TeamWorkloadBar } from './TeamWorkloadBar';
import { TaskDetailSidePanel } from './TaskDetailSidePanel';
import { SmartTaskCreateModal } from './SmartTaskCreateModal';

interface TaskScheduleCalendarProps {
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
  onOpenCancelModal: (task: Task) => void;
}

export const TaskScheduleCalendar: React.FC<TaskScheduleCalendarProps> = ({
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
  onCancelTask,
  onOpenCancelModal
}) => {
  // Navigation & View Mode State
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [viewMode, setViewMode] = useState<CalendarViewMode>('month');

  // Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAssigneeId, setSelectedAssigneeId] = useState('');
  const [selectedPriority, setSelectedPriority] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [myTasksOnly, setMyTasksOnly] = useState(false);
  const [overdueOnly, setOverdueOnly] = useState(false);

  // Panels & Modals State
  const [isWorkloadOpen, setIsWorkloadOpen] = useState(false);
  const [isUnscheduledOpen, setIsUnscheduledOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [createInitialDate, setCreateInitialDate] = useState<Date | null>(null);
  const [editingTask, setEditingTask] = useState<Task | null>(null);

  // Filter Pipeline
  const filteredTasks = useMemo(() => {
    return tasks.filter((task) => {
      if (task.status === 'CANCELLED') return false;

      // Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesTitle = task.title.toLowerCase().includes(q);
        const matchesDesc = (task.description || '').toLowerCase().includes(q);
        const matchesSection = (task.section || '').toLowerCase().includes(q);
        if (!matchesTitle && !matchesDesc && !matchesSection) return false;
      }

      // Assignee Filter
      if (selectedAssigneeId) {
        if (!task.assignees.some((a) => a.userId === selectedAssigneeId)) return false;
      }

      // Priority Filter
      if (selectedPriority && task.priority !== selectedPriority) return false;

      // Status Filter
      if (selectedStatus && task.status !== selectedStatus) return false;

      // My Tasks Only
      if (myTasksOnly && currentUser) {
        if (!task.assignees.some((a) => a.userId === currentUser.id)) return false;
      }

      // Overdue Only
      if (overdueOnly && !isTaskOverdue(task)) return false;

      return true;
    });
  }, [
    tasks,
    searchQuery,
    selectedAssigneeId,
    selectedPriority,
    selectedStatus,
    myTasksOnly,
    overdueOnly,
    currentUser
  ]);

  // Metric counts
  const overdueCount = tasks.filter(isTaskOverdue).length;
  const dueTodayCount = tasks.filter((t) => {
    const d = getTaskDate(t);
    return d && isToday(d) && t.status !== 'DONE';
  }).length;
  const unscheduledCount = tasks.filter((t) => !t.dueDate && t.status !== 'CANCELLED' && t.status !== 'DONE').length;

  // Calendar Navigation Handlers
  const handleNavigatePrev = () => {
    const d = new Date(currentDate);
    if (viewMode === 'month') {
      d.setMonth(d.getMonth() - 1);
    } else if (viewMode === 'week') {
      d.setDate(d.getDate() - 7);
    } else if (viewMode === 'day') {
      d.setDate(d.getDate() - 1);
    } else {
      d.setDate(d.getDate() - 7);
    }
    setCurrentDate(d);
  };

  const handleNavigateNext = () => {
    const d = new Date(currentDate);
    if (viewMode === 'month') {
      d.setMonth(d.getMonth() + 1);
    } else if (viewMode === 'week') {
      d.setDate(d.getDate() + 7);
    } else if (viewMode === 'day') {
      d.setDate(d.getDate() + 1);
    } else {
      d.setDate(d.getDate() + 7);
    }
    setCurrentDate(d);
  };

  const handleNavigateToday = () => {
    setCurrentDate(new Date());
  };

  const handleDateSelect = (d: Date) => {
    setCurrentDate(d);
  };

  // Date Slot Click -> Open Create Task with initial date
  const handleDateClick = (d: Date) => {
    setCreateInitialDate(d);
    setEditingTask(null);
    setIsCreateModalOpen(true);
  };

  // Reschedule Task (via Drag-and-Drop or Quick Presets)
  const handleRescheduleTask = async (taskId: string, targetDate: Date) => {
    await onUpdateTask(taskId, { dueDate: targetDate.toISOString() });
    // Keep selectedTask updated if it's currently open
    if (selectedTask && selectedTask.id === taskId) {
      setSelectedTask((prev) => (prev ? { ...prev, dueDate: targetDate.toISOString() } : null));
    }
  };

  // Quick Priority Change
  const handleUpdatePriority = async (taskId: string, priority: TaskPriority) => {
    await onUpdateTask(taskId, { priority });
    if (selectedTask && selectedTask.id === taskId) {
      setSelectedTask((prev) => (prev ? { ...prev, priority } : null));
    }
  };

  // Quick Status Change
  const handleQuickStatus = async (taskId: string, status: TaskStatus) => {
    await onUpdateStatus(taskId, status);
    if (selectedTask && selectedTask.id === taskId) {
      setSelectedTask((prev) => (prev ? { ...prev, status } : null));
    }
  };

  return (
    <div className="space-y-4 font-sans">
      {/* ── Top Master Header & Toolbar ── */}
      <CalendarHeader
        currentDate={currentDate}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        onNavigatePrev={handleNavigatePrev}
        onNavigateNext={handleNavigateNext}
        onNavigateToday={handleNavigateToday}
        onDateSelect={handleDateSelect}
        isDarkMode={isDarkMode}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        selectedAssigneeId={selectedAssigneeId}
        onAssigneeChange={setSelectedAssigneeId}
        selectedPriority={selectedPriority}
        onPriorityChange={setSelectedPriority}
        selectedStatus={selectedStatus}
        onStatusChange={setSelectedStatus}
        myTasksOnly={myTasksOnly}
        onMyTasksOnlyToggle={() => setMyTasksOnly(!myTasksOnly)}
        overdueOnly={overdueOnly}
        onOverdueOnlyToggle={() => setOverdueOnly(!overdueOnly)}
        overdueCount={overdueCount}
        dueTodayCount={dueTodayCount}
        unscheduledCount={unscheduledCount}
        isWorkloadOpen={isWorkloadOpen}
        onToggleWorkload={() => setIsWorkloadOpen(!isWorkloadOpen)}
        isUnscheduledOpen={isUnscheduledOpen}
        onToggleUnscheduled={() => setIsUnscheduledOpen(!isUnscheduledOpen)}
        canManageTasks={canManageTasks}
        onOpenCreateTask={() => {
          setCreateInitialDate(null);
          setEditingTask(null);
          setIsCreateModalOpen(true);
        }}
        users={users}
      />

      {/* ── Team Workload & Capacity Drawer ── */}
      <TeamWorkloadBar
        isOpen={isWorkloadOpen}
        onClose={() => setIsWorkloadOpen(false)}
        tasks={tasks}
        users={users}
        selectedAssigneeId={selectedAssigneeId}
        onSelectAssignee={setSelectedAssigneeId}
        isDarkMode={isDarkMode}
      />

      {/* ── Calendar Grid / Agenda Views ── */}
      {viewMode === 'month' && (
        <MonthView
          currentDate={currentDate}
          tasks={filteredTasks}
          isDarkMode={isDarkMode}
          onSelectTask={setSelectedTask}
          onDateClick={handleDateClick}
          onRescheduleTask={handleRescheduleTask}
        />
      )}

      {viewMode === 'week' && (
        <WeekView
          currentDate={currentDate}
          tasks={filteredTasks}
          isDarkMode={isDarkMode}
          onSelectTask={setSelectedTask}
          onDateClick={handleDateClick}
          onRescheduleTask={handleRescheduleTask}
        />
      )}

      {viewMode === 'day' && (
        <DayView
          currentDate={currentDate}
          tasks={filteredTasks}
          isDarkMode={isDarkMode}
          onSelectTask={setSelectedTask}
          onDateClick={handleDateClick}
          onRescheduleTask={handleRescheduleTask}
        />
      )}

      {viewMode === 'agenda' && (
        <AgendaView
          tasks={filteredTasks}
          isDarkMode={isDarkMode}
          onSelectTask={setSelectedTask}
          onQuickStatusChange={handleQuickStatus}
          onRescheduleToToday={(taskId) => {
            const d = new Date();
            d.setHours(17, 0, 0, 0);
            handleRescheduleTask(taskId, d);
          }}
        />
      )}

      {/* ── Unscheduled Tasks Slide-out Drawer ── */}
      <UnscheduledTasksDrawer
        isOpen={isUnscheduledOpen}
        onClose={() => setIsUnscheduledOpen(false)}
        tasks={tasks}
        isDarkMode={isDarkMode}
        onSelectTask={setSelectedTask}
        onScheduleTask={handleRescheduleTask}
      />

      {/* ── Task Details Slide-over Inspector Sheet ── */}
      <TaskDetailSidePanel
        task={selectedTask}
        onClose={() => setSelectedTask(null)}
        isDarkMode={isDarkMode}
        canManageTasks={canManageTasks}
        currentUserId={currentUser?.id}
        onUpdateStatus={handleQuickStatus}
        onUpdatePriority={handleUpdatePriority}
        onReschedule={handleRescheduleTask}
        onAddComment={onAddComment}
        onOpenEditModal={(taskToEdit) => {
          setEditingTask(taskToEdit);
          setIsCreateModalOpen(true);
        }}
        onOpenCancelModal={(taskToCancel) => {
          setSelectedTask(null);
          onOpenCancelModal(taskToCancel);
        }}
      />

      {/* ── Smart Task Creation / Edit Modal ── */}
      <SmartTaskCreateModal
        isOpen={isCreateModalOpen}
        onClose={() => {
          setIsCreateModalOpen(false);
          setEditingTask(null);
          setCreateInitialDate(null);
        }}
        isDarkMode={isDarkMode}
        users={users}
        initialDate={createInitialDate}
        editingTask={editingTask}
        onSubmit={async (form) => {
          if (editingTask) {
            await onUpdateTask(editingTask.id, form);
          } else {
            await onCreateTask(form);
          }
        }}
      />
    </div>
  );
};

export default TaskScheduleCalendar;
