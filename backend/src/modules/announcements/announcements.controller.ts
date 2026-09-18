import { Request, Response } from 'express';
import { announcementsService } from './announcements.service';

function actorFromReq(req: Request) {
  const user = (req as any).user;
  // Defensive fallback chain for user identity
  const id = user?.id || user?.userId || user?.sub;
  if (!id) throw new Error('UNAUTHENTICATED');
  return { id, email: user.email || 'unknown@guruom.in', name: user.name };
}

export class AnnouncementsController {
  async list(req: Request, res: Response) {
    try {
      const activeOnly = req.query.active === 'true';
      const data = await announcementsService.listAnnouncements(activeOnly);
      return res.json({ data });
    } catch (err: any) {
      return res.status(500).json({ error: 'InternalServerError', message: err.message });
    }
  }

  async create(req: Request, res: Response) {
    try {
      const actor = actorFromReq(req);
      const data = await announcementsService.createAnnouncement(req.body, actor);
      return res.status(201).json({ message: 'Announcement posted', data });
    } catch (err: any) {
      return res.status(400).json({ error: 'ValidationError', message: err.message });
    }
  }

  async update(req: Request, res: Response) {
    try {
      const actor = actorFromReq(req);
      const data = await announcementsService.updateAnnouncement(req.params.id, req.body, actor);
      return res.json({ message: 'Announcement updated', data });
    } catch (err: any) {
      return res.status(400).json({ error: 'ValidationError', message: err.message });
    }
  }

  async remove(req: Request, res: Response) {
    try {
      const actor = actorFromReq(req);
      const data = await announcementsService.deleteAnnouncement(req.params.id, actor);
      return res.json({ message: 'Announcement removed', data });
    } catch (err: any) {
      return res.status(400).json({ error: 'ValidationError', message: err.message });
    }
  }
}

export const announcementsController = new AnnouncementsController();
