import { useState, useCallback, useEffect, useMemo } from 'react';
import { toast } from '../context/ToastContext';
import { getRoleModulePermission, hasMinimumAccess } from '../utils/rbacMatrix';
import {
  Task,
  TaskComment,
  TaskStatus,
  fetchTasks,
  createTask as createTaskApi,
  updateTask as updateTaskApi,
  updateTaskStatus as updateTaskStatusApi,
  addTaskComment as addTaskCommentApi,
  cancelTask as cancelTaskApi
} from '../services/consoleApiServices';

/**
 * Tasks (HR module) state + actions. Kept standalone for the same reason as
 * useMeetings.ts — no shared state with the big useOwnerOSData hook, and
 * assignee-scoped actions (status/comments) don't map cleanly onto that
 * hook's all-or-nothing isAllowed() pattern anyway.
 */
export function useTasks(canView: boolean, currentUserRole?: string | null) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Owner / Admin (System) / ServerAdmin / TESTER — see rbacMatrix.ts 'tasks'.
  // Status updates & comments are separately gated per-task in the backend
  // (assignee/assigner), regardless of this flag.
  const canManageTasks = useMemo(() => {
    if (!currentUserRole) return false;
    const perm = getRoleModulePermission(currentUserRole, 'tasks');
    return hasMinimumAccess(perm.accessLevel, 'FULL_APPROVE');
  }, [currentUserRole]);

  const loadTasks = useCallback(async () => {
    if (!canView) return;
    setIsLoading(true);
    try {
      const scope = canManageTasks ? 'all' : 'mine';
      const data = await fetchTasks(scope);
      setTasks(data);
    } finally {
      setIsLoading(false);
    }
  }, [canView, canManageTasks]);

  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  // Same pragmatic polling choice as useMeetings.ts — see that file for why
  // this doesn't tap into the app's single central EventSource.
  useEffect(() => {
    if (!canView) return;
    const interval = setInterval(loadTasks, 60_000);
    return () => clearInterval(interval);
  }, [canView, loadTasks]);

  const handleCreateTask = useCallback(
    async (payload: Parameters<typeof createTaskApi>[0]) => {
      try {
        const created = await createTaskApi(payload);
        setTasks((prev) => [created, ...prev]);
        toast.success(`"${created.title}" assigned to ${created.assignees.length} teammate${created.assignees.length === 1 ? '' : 's'}.`, 'Task Assigned');
        return created;
      } catch (err: any) {
        toast.error(err?.message || 'Could not assign the task.', 'Assignment Failed');
        throw err;
      }
    },
    []
  );

  const handleUpdateTask = useCallback(
    async (id: string, payload: Parameters<typeof updateTaskApi>[1]) => {
      try {
        const updated = await updateTaskApi(id, payload);
        setTasks((prev) => prev.map((t) => (t.id === id ? updated : t)));
        toast.success(`"${updated.title}" was updated.`, 'Task Updated');
        return updated;
      } catch (err: any) {
        toast.error(err?.message || 'Could not update the task.', 'Update Failed');
        throw err;
      }
    },
    []
  );

  const handleUpdateStatus = useCallback(async (id: string, status: TaskStatus) => {
    // Optimistic update — status changes should feel instant on a board view.
    const previous = tasks;
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, status } : t)));
    try {
      const updated = await updateTaskStatusApi(id, status);
      setTasks((prev) => prev.map((t) => (t.id === id ? updated : t)));
      return updated;
    } catch (err: any) {
      setTasks(previous); // roll back
      toast.error(err?.message || 'Could not update task status.', 'Update Failed');
      throw err;
    }
  }, [tasks]);

  const handleAddComment = useCallback(async (id: string, body: string): Promise<TaskComment> => {
    try {
      const comment = await addTaskCommentApi(id, body);
      setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, comments: [...t.comments, comment] } : t)));
      return comment;
    } catch (err: any) {
      toast.error(err?.message || 'Could not post the comment.', 'Comment Failed');
      throw err;
    }
  }, []);

  const handleCancelTask = useCallback(async (id: string, reason?: string) => {
    try {
      const cancelled = await cancelTaskApi(id, reason);
      setTasks((prev) => prev.map((t) => (t.id === id ? cancelled : t)));
      toast.success(`"${cancelled.title}" was cancelled.`, 'Task Cancelled');
      return cancelled;
    } catch (err: any) {
      toast.error(err?.message || 'Could not cancel the task.', 'Cancellation Failed');
      throw err;
    }
  }, []);

  return {
    tasks,
    isLoadingTasks: isLoading,
    canManageTasks,
    loadTasks,
    handleCreateTask,
    handleUpdateTask,
    handleUpdateStatus,
    handleAddComment,
    handleCancelTask
  };
}
