import { Request, Response } from 'express';
import { meetingsService } from './meetings.service';
import { ListMeetingsQuerySchema } from './meetings.schema';

function actorFromReq(req: Request) {
  const user = (req as any).user;
  const id = user?.id || user?.userId || user?.sub;
  if (!id) throw new Error('UNAUTHENTICATED');
  return { id, email: user.email || 'unknown@guruom.in', name: user.name || 'User' };
}

export class MeetingsController {
  async listMeetings(req: Request, res: Response) {
    try {
      const query = ListMeetingsQuerySchema.parse({
        scope: req.query.scope,
        status: req.query.status
      });
      const actor = actorFromReq(req);
      const data = await meetingsService.listMeetings(actor.id, query);
      return res.json({ data });
    } catch (err: any) {
      return res.status(500).json({ error: 'InternalServerError', message: err.message });
    }
  }

  async getMeeting(req: Request, res: Response) {
    try {
      const data = await meetingsService.getMeetingById(req.params.id);
      if (!data) return res.status(404).json({ error: 'NotFound', message: 'Meeting not found' });
      return res.json({ data });
    } catch (err: any) {
      return res.status(500).json({ error: 'InternalServerError', message: err.message });
    }
  }

  async createMeeting(req: Request, res: Response) {
    try {
      const actor = actorFromReq(req);
      const data = await meetingsService.createMeeting(req.body, actor);
      return res.status(201).json({ message: 'Meeting scheduled successfully', data });
    } catch (err: any) {
      return res.status(400).json({ error: 'ValidationError', message: err.message });
    }
  }

  async updateMeeting(req: Request, res: Response) {
    try {
      const actor = actorFromReq(req);
      const data = await meetingsService.updateMeeting(req.params.id, req.body, actor);
      return res.json({ message: 'Meeting updated successfully', data });
    } catch (err: any) {
      return res.status(400).json({ error: 'ValidationError', message: err.message });
    }
  }

  async cancelMeeting(req: Request, res: Response) {
    try {
      const actor = actorFromReq(req);
      const data = await meetingsService.cancelMeeting(req.params.id, actor, req.body?.reason);
      return res.json({ message: 'Meeting cancelled successfully', data });
    } catch (err: any) {
      return res.status(400).json({ error: 'ValidationError', message: err.message });
    }
  }
}

export const meetingsController = new MeetingsController();
