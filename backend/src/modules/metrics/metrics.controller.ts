import { Request, Response } from 'express';
import { metricsService } from './metrics.service';
import { logger } from '../../utils/logger';

export class MetricsController {
  async getSummary(req: Request, res: Response) {
    try {
      const summary = await metricsService.getSummary();
      return res.json({ success: true, data: summary });
    } catch (err: any) {
      logger.error('[MetricsController] getSummary error:', err);
      return res.status(500).json({ error: 'InternalServerError', message: err.message });
    }
  }

  async getHistory(req: Request, res: Response) {
    try {
      const days = parseInt(req.query.days as string, 10) || 30;
      const history = await metricsService.getHistory(days);
      return res.json({ success: true, data: history });
    } catch (err: any) {
      logger.error('[MetricsController] getHistory error:', err);
      return res.status(500).json({ error: 'InternalServerError', message: err.message });
    }
  }

  async getRegistry(req: Request, res: Response) {
    try {
      const registry = await metricsService.getMetricsRegistry();
      return res.json({ success: true, data: registry });
    } catch (err: any) {
      logger.error('[MetricsController] getRegistry error:', err);
      return res.status(500).json({ error: 'InternalServerError', message: err.message });
    }
  }
}

export const metricsController = new MetricsController();
