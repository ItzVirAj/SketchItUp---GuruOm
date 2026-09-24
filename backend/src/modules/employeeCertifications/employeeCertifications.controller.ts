import { Request, Response } from 'express';
import {
  employeeCertificationsService,
  CertificationActor,
  CertificationNotFoundError,
  ForbiddenCertificationActionError
} from './employeeCertifications.service';
import {
  CreateEmployeeCertificationSchema,
  EmployeeCertificationQuerySchema
} from './employeeCertifications.schema';
import { validateMagicBytes } from '../../middleware/upload.middleware';

function actorFromRequest(req: Request): CertificationActor {
  const user = req.user;
  const id = user?.id || (user as any)?.userId || (user as any)?.sub;
  if (!user || !id) {
    throw Object.assign(new Error('Authenticated user session is required.'), { statusCode: 401 });
  }
  return {
    id,
    email: user.email || 'user@guruom.in',
    role: user.role || (user as any)?.userRole || '',
    name: (user as any)?.name || (user as any)?.fullName
  };
}

export class EmployeeCertificationsController {
  async list(req: Request, res: Response) {
    try {
      const actor = actorFromRequest(req);
      const query = EmployeeCertificationQuerySchema.parse(req.query);
      const isOwnRecordsOnly = req.rbacScope?.isOwnRecordsOnly ?? true;

      const data = await employeeCertificationsService.listCertifications(actor, isOwnRecordsOnly, query);
      return res.json({ data });
    } catch (err: any) {
      return res.status(err.statusCode || 400).json({
        error: err.name || 'EmployeeCertificationsError',
        message: err.message
      });
    }
  }

  async getMyCertifications(req: Request, res: Response) {
    try {
      const actor = actorFromRequest(req);
      const query = EmployeeCertificationQuerySchema.parse(req.query);
      const data = await employeeCertificationsService.getMyCertifications(actor, query);
      return res.json({ data });
    } catch (err: any) {
      return res.status(err.statusCode || 400).json({
        error: err.name || 'EmployeeCertificationsError',
        message: err.message
      });
    }
  }

  async getById(req: Request, res: Response) {
    try {
      const actor = actorFromRequest(req);
      const { id } = req.params;
      const isOwnRecordsOnly = req.rbacScope?.isOwnRecordsOnly ?? true;

      const data = await employeeCertificationsService.getCertificationById(id, actor, isOwnRecordsOnly);
      return res.json({ data });
    } catch (err: any) {
      return res.status(err.statusCode || 400).json({
        error: err.name || 'EmployeeCertificationsError',
        message: err.message
      });
    }
  }

  async create(req: Request, res: Response) {
    try {
      const actor = actorFromRequest(req);
      const input = CreateEmployeeCertificationSchema.parse(req.body);
      const data = await employeeCertificationsService.createCertification(input, actor);
      return res.status(201).json({
        message: 'Employee certification assigned successfully',
        data
      });
    } catch (err: any) {
      return res.status(err.statusCode || 400).json({
        error: err.name || 'EmployeeCertificationsError',
        message: err.message
      });
    }
  }

  async delete(req: Request, res: Response) {
    try {
      const actor = actorFromRequest(req);
      const { id } = req.params;
      const result = await employeeCertificationsService.deleteCertification(id, actor);
      return res.json(result);
    } catch (err: any) {
      return res.status(err.statusCode || 400).json({
        error: err.name || 'EmployeeCertificationsError',
        message: err.message
      });
    }
  }

  async uploadDocument(req: Request, res: Response) {
    try {
      const actor = actorFromRequest(req);
      if (!req.file) {
        return res.status(400).json({
          error: 'BadRequest',
          message: 'No document file uploaded.'
        });
      }

      await validateMagicBytes(req.file.buffer, req.file.originalname);
      const result = await employeeCertificationsService.uploadCertificateDocument(
        req.file.buffer,
        req.file.originalname,
        req.file.mimetype,
        actor
      );

      return res.status(201).json({
        message: 'Certificate document uploaded successfully',
        data: result
      });
    } catch (err: any) {
      return res.status(err.statusCode || 400).json({
        error: err.name || 'UploadError',
        message: err.message
      });
    }
  }
}

export const employeeCertificationsController = new EmployeeCertificationsController();
