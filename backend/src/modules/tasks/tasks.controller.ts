import { Request, Response } from 'express';
import { tasksService, ForbiddenTaskActionError } from './tasks.service';
import { ListTasksQuerySchema, UpdateTaskStatusSchema, AddTaskCommentSchema } from './tasks.schema';

function actorFromReq(req: Request) {
  const user = (req as any).user;
  if (!user?.userId) throw new Error('UNAUTHENTICATED');
  return { id: user.userId, email: user.email || 'unknown@guruom.in', role: user.role || user.userRole };
}

function handleError(res: Response, err: any) {
  if (err instanceof ForbiddenTaskActionError) {
    return res.status(403).json({ error: 'Forbidden', message: err.message });
  }
  return res.status(400).json({ error: 'ValidationError', message: err.message });
}

export class TasksController {
  async listTasks(req: Request, res: Response) {
    try {
      const query = ListTasksQuerySchema.parse({ scope: req.query.scope, status: req.query.status });
      const actor = actorFromReq(req);
      const data = await tasksService.listTasks(actor, query);
      return res.json({ data });
    } catch (err: any) {
      return res.status(500).json({ error: 'InternalServerError', message: err.message });
    }
  }

  async getTask(req: Request, res: Response) {
    try {
      const data = await tasksService.getTaskById(req.params.id);
      if (!data) return res.status(404).json({ error: 'NotFound', message: 'Task not found' });
      return res.json({ data });
    } catch (err: any) {
      return res.status(500).json({ error: 'InternalServerError', message: err.message });
    }
  }

  async createTask(req: Request, res: Response) {
    try {
      const actor = actorFromReq(req);
      const data = await tasksService.createTask(req.body, actor);
      return res.status(201).json({ message: 'Task assigned successfully', data });
    } catch (err: any) {
      return handleError(res, err);
    }
  }

  async updateTask(req: Request, res: Response) {
    try {
      const actor = actorFromReq(req);
      const data = await tasksService.updateTask(req.params.id, req.body, actor);
      return res.json({ message: 'Task updated successfully', data });
    } catch (err: any) {
      return handleError(res, err);
    }
  }

  async updateStatus(req: Request, res: Response) {
    try {
      const { status } = UpdateTaskStatusSchema.parse(req.body);
      const actor = actorFromReq(req);
      const data = await tasksService.updateStatus(req.params.id, status, actor);
      return res.json({ message: 'Task status updated', data });
    } catch (err: any) {
      return handleError(res, err);
    }
  }

  async addComment(req: Request, res: Response) {
    try {
      const { body } = AddTaskCommentSchema.parse(req.body);
      const actor = actorFromReq(req);
      const data = await tasksService.addComment(req.params.id, body, actor);
      return res.status(201).json({ message: 'Comment added', data });
    } catch (err: any) {
      return handleError(res, err);
    }
  }

  async cancelTask(req: Request, res: Response) {
    try {
      const actor = actorFromReq(req);
      const data = await tasksService.cancelTask(req.params.id, actor, req.body?.reason);
      return res.json({ message: 'Task cancelled successfully', data });
    } catch (err: any) {
      return handleError(res, err);
    }
  }
}

export const tasksController = new TasksController();
