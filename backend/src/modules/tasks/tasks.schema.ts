import { z } from 'zod';

export const TaskPriorityEnum = z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']);
export const TaskStatusEnum = z.enum(['TODO', 'IN_PROGRESS', 'BLOCKED', 'DONE', 'CANCELLED']);

// Due-date reminder offsets. Mirrors REMINDER_OFFSETS_MINUTES in meetings.schema.ts,
// but tasks additionally get an "overdue" nudge since — unlike a meeting — a
// task doesn't naturally end when its due_date passes.
export const TASK_REMINDER_OFFSETS: { label: string; minutesBeforeDue: number }[] = [
  { label: '24h_before_due', minutesBeforeDue: 24 * 60 }
];

export const CreateTaskSchema = z.object({
  title: z.string().min(1, 'Task title is required').max(200),
  description: z.string().max(4000).optional(),
  section: z.string().max(100).optional(),
  priority: TaskPriorityEnum.default('MEDIUM'),
  dueDate: z.string().datetime({ offset: true }).optional(),
  assigneeUserIds: z.array(z.string().uuid()).min(1, 'At least one assignee is required'),
  linkedEntityType: z.string().max(50).optional(),
  linkedEntityId: z.string().uuid().optional(),
  linkedEntityLabel: z.string().max(200).optional()
});

export const UpdateTaskSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(4000).optional(),
  section: z.string().max(100).optional(),
  priority: TaskPriorityEnum.optional(),
  dueDate: z.string().datetime({ offset: true }).nullable().optional(),
  assigneeUserIds: z.array(z.string().uuid()).min(1).optional(),
  linkedEntityType: z.string().max(50).optional(),
  linkedEntityId: z.string().uuid().optional(),
  linkedEntityLabel: z.string().max(200).optional()
});

export const UpdateTaskStatusSchema = z.object({
  status: TaskStatusEnum
});

export const AddTaskCommentSchema = z.object({
  body: z.string().min(1, 'Comment cannot be empty').max(2000)
});

export const ListTasksQuerySchema = z.object({
  scope: z.enum(['mine', 'assigned-by-me', 'all']).default('mine'),
  status: TaskStatusEnum.optional()
});
