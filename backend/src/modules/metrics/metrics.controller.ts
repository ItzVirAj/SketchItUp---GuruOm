import { Request, Response } from 'express';
import { metricsService } from './metrics.service';

export const metricsController = {
  async getHistory(req: Request, res: Response) {
    try {
      const days = req.query.days ? parseInt(req.query.days as string, 10) : 30;
      res.json({ history: await metricsService.getHistory(days) });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  },

  async captureToday(req: Request, res: Response) {
    try {
      res.json({ snapshot: await metricsService.captureSnapshot() });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  },

  async backfill(req: Request, res: Response) {
    try {
      const days = req.body?.days ? parseInt(req.body.days, 10) : 90;
      res.json(await metricsService.backfillHistory(days));
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  },
};