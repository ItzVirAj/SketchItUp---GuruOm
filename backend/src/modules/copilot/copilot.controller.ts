import { Request, Response } from 'express';
import { copilotService } from './copilot.service';

function actorFrom(req: Request) {
  return {
    role: req.rbacScope?.role || req.user?.role,
    name: req.rbacScope?.userName || req.user?.name || req.user?.email,
  };
}

export const copilotController = {
  async chat(req: Request, res: Response) {
    try {
      const result = await copilotService.chat(req.body.messages, actorFrom(req));
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  },

  async confirmAction(req: Request, res: Response) {
    try {
      const { tool, arguments: args } = req.body;
      if (tool !== 'create_order') {
        return res.status(400).json({ error: 'Unknown or unsupported confirmable action.' });
      }
      const order = await copilotService.confirmCreateOrder(args, actorFrom(req));
      res.status(201).json({ order });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  },
};