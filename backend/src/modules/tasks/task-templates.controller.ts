import { Request, Response } from 'express';
import { taskTemplatesService } from './task-templates.service';
import { ApplyTemplateSchema } from './task-templates.schema';

function actorFromReq(req: Request) {
  const user = (req as any).user;
  // JwtUserPayload's real field is `id` (see backend/src/utils/jwt.ts) — not
  // `userId`, which doesn't exist on it. This mirrors the defensive fallback
  // chain already fixed in meetings.controller.ts.
  const id = user?.id || user?.userId || user?.sub;
  if (!id) throw new Error('UNAUTHENTICATED');
  return { id, email: user.email || 'unknown@guruom.in', role: user.role || user.userRole };
}

export class TaskTemplatesController {
  async list(_req: Request, res: Response) {
    try {
      const data = await taskTemplatesService.listTemplates();
      return res.json({ data });
    } catch (err: any) {
      return res.status(500).json({ error: 'InternalServerError', message: err.message });
    }
  }

  async create(req: Request, res: Response) {
    try {
      const actor = actorFromReq(req);
      const id = await taskTemplatesService.createTemplate(req.body, actor.id);
      return res.status(201).json({ message: 'Template created', data: { id } });
    } catch (err: any) {
      return res.status(400).json({ error: 'ValidationError', message: err.message });
    }
  }

  async apply(req: Request, res: Response) {
    try {
      const { assigneeUserIds, appliedFromDate } = ApplyTemplateSchema.parse(req.body);
      const actor = actorFromReq(req);
      const data = await taskTemplatesService.applyTemplate(req.params.id, assigneeUserIds, appliedFromDate, actor);
      return res.status(201).json({ message: `Applied "${data.templateName}" — ${data.createdCount} tasks created`, data });
    } catch (err: any) {
      return res.status(400).json({ error: 'ValidationError', message: err.message });
    }
  }
}

export const taskTemplatesController = new TaskTemplatesController();
