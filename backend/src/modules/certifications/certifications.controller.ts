import { Request, Response } from 'express';
import { certificationsService } from './certifications.service';
import { ListCertificationsQuerySchema } from './certifications.schema';
import { getRoleModulePermission, hasMinimumAccess } from '../../../../src/utils/rbacMatrix';

function actorFromReq(req: Request) {
  const user = (req as any).user;
  // JwtUserPayload's real field is `id` (see backend/src/utils/jwt.ts) — not
  // `userId`, which doesn't exist on it. This mirrors the defensive fallback
  // chain already fixed in meetings.controller.ts.
  const id = user?.id || user?.userId || user?.sub;
  if (!id) throw new Error('UNAUTHENTICATED');
  return { id, email: user.email || 'unknown@guruom.in' };
}

function canManage(req: Request): boolean {
  const role = (req as any).user?.role || (req as any).user?.userRole;
  return hasMinimumAccess(getRoleModulePermission(role, 'certifications').accessLevel, 'FULL_APPROVE');
}

export class CertificationsController {
  async list(req: Request, res: Response) {
    try {
      const query = ListCertificationsQuerySchema.parse({ scope: req.query.scope, employeeId: req.query.employeeId });
      const actor = actorFromReq(req);
      const data = await certificationsService.listCertifications(actor, canManage(req), query);
      return res.json({ data });
    } catch (err: any) {
      return res.status(500).json({ error: 'InternalServerError', message: err.message });
    }
  }

  async create(req: Request, res: Response) {
    if (!canManage(req)) return res.status(403).json({ error: 'Forbidden', message: 'Only HR/Admin can add certifications.' });
    try {
      const actor = actorFromReq(req);
      const data = await certificationsService.createCertification(req.body, actor);
      return res.status(201).json({ message: 'Certification added', data });
    } catch (err: any) {
      return res.status(400).json({ error: 'ValidationError', message: err.message });
    }
  }

  async update(req: Request, res: Response) {
    if (!canManage(req)) return res.status(403).json({ error: 'Forbidden', message: 'Only HR/Admin can edit certifications.' });
    try {
      const actor = actorFromReq(req);
      const data = await certificationsService.updateCertification(req.params.id, req.body, actor);
      return res.json({ message: 'Certification updated', data });
    } catch (err: any) {
      return res.status(400).json({ error: 'ValidationError', message: err.message });
    }
  }

  async remove(req: Request, res: Response) {
    if (!canManage(req)) return res.status(403).json({ error: 'Forbidden', message: 'Only HR/Admin can remove certifications.' });
    try {
      const actor = actorFromReq(req);
      const data = await certificationsService.deleteCertification(req.params.id, actor);
      return res.json({ message: 'Certification removed', data });
    } catch (err: any) {
      return res.status(400).json({ error: 'ValidationError', message: err.message });
    }
  }
}

export const certificationsController = new CertificationsController();
