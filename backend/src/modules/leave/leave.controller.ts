import { Request, Response } from 'express';
import { 
  CreateLeaveRequestSchema, 
  DecideLeaveRequestSchema, 
  LeaveListQuerySchema 
} from './leave.schema';
import { leaveService, LeaveActor } from './leave.service';

function actorFromRequest(req: Request): LeaveActor {
  const user = req.user;
  if (!user?.id || !user.email) {
    throw Object.assign(new Error('Authenticated actor is required.'), { statusCode: 401 });
  }
  return { 
    id: user.id, 
    email: user.email, 
    role: user.role || (user as any).userRole || '', 
    name: user.name 
  };
}

export class LeaveController {
  async list(req: Request, res: Response) {
    try {
      const actor = actorFromRequest(req);
      const query = LeaveListQuerySchema.parse({
        status: req.query.status,
        requester: req.query.requester,
        requester_id: req.query.requester_id,
        scope: req.query.scope
      });
      const data = await leaveService.listLeaveRequests(actor, query);
      return res.json({ data });
    } catch (err: any) {
      return res.status(err.statusCode || 400).json({ 
        error: err.name || 'LeaveRequestError', 
        message: err.message 
      });
    }
  }

  async create(req: Request, res: Response) {
    try {
      const actor = actorFromRequest(req);
      const input = CreateLeaveRequestSchema.parse(req.body);
      const data = await leaveService.createLeaveRequest(input, actor);
      return res.status(201).json({ message: 'Leave request submitted successfully', data });
    } catch (err: any) {
      return res.status(err.statusCode || 400).json({ 
        error: err.name || 'LeaveRequestError', 
        message: err.message 
      });
    }
  }

  async decide(req: Request, res: Response) {
    try {
      const actor = actorFromRequest(req);
      const input = DecideLeaveRequestSchema.parse(req.body);
      const data = await leaveService.decideLeaveRequest(req.params.id, input, actor);
      return res.json({ message: `Leave request ${input.status.toLowerCase()} successfully`, data });
    } catch (err: any) {
      return res.status(err.statusCode || 400).json({ 
        error: err.name || 'LeaveRequestError', 
        message: err.message 
      });
    }
  }

  async cancel(req: Request, res: Response) {
    try {
      const actor = actorFromRequest(req);
      const data = await leaveService.cancelLeaveRequest(req.params.id, actor);
      return res.json({ message: 'Leave request cancelled successfully', data });
    } catch (err: any) {
      return res.status(err.statusCode || 400).json({ 
        error: err.name || 'LeaveRequestError', 
        message: err.message 
      });
    }
  }
}

export const leaveController = new LeaveController();
