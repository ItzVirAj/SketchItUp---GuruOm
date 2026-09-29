import { Request, Response } from 'express';
import { attendanceService, AttendanceActor, AttendanceMeta } from './attendance.service';
import { GeoLocationService } from '../../utils/geolocation';
import { parseUserAgent } from '../../utils/deviceParser';
import {
  AttendanceListQuerySchema,
  CreateAttendanceSchema,
  UpdateAttendanceSchema,
  CheckInSchema
} from './attendance.schema';

function actorFromRequest(req: Request): AttendanceActor {
  const user = req.user;
  const id = user?.id || (user as any)?.userId || (user as any)?.sub;
  if (!user || !id) {
    throw Object.assign(new Error('Authenticated actor is required.'), { statusCode: 401 });
  }
  return {
    id,
    email: user.email || 'unknown@guruom.in',
    role: user.role || (user as any)?.userRole || '',
    name: user.name
  };
}

function metaFromRequest(req: Request): AttendanceMeta {
  const ipAddress = GeoLocationService.extractClientIp(req);
  const userAgent = (req.headers['user-agent'] as string) || '';
  const parsed = parseUserAgent(userAgent);
  const device = parsed.deviceName ? `${parsed.deviceName} (${parsed.browser})` : (parsed.browser || 'Web Client');
  return {
    ipAddress,
    device,
    deviceType: parsed.deviceType,
    browser: parsed.browser,
    os: parsed.os,
    userAgent
  };
}

export class AttendanceController {
  async list(req: Request, res: Response) {
    try {
      const actor = actorFromRequest(req);
      const query = AttendanceListQuerySchema.parse(req.query);
      const isOwnRecordsOnly = req.rbacScope?.isOwnRecordsOnly ?? true;

      const data = await attendanceService.listAttendance(actor, isOwnRecordsOnly, query);
      return res.json({ data });
    } catch (err: any) {
      return res.status(err.statusCode || 400).json({
        error: err.name || 'AttendanceError',
        message: err.message
      });
    }
  }

  async getMyAttendance(req: Request, res: Response) {
    try {
      const actor = actorFromRequest(req);
      const query = AttendanceListQuerySchema.pick({ from: true, to: true, status: true }).parse(req.query);
      const data = await attendanceService.getMyAttendance(actor, query);
      return res.json({ data });
    } catch (err: any) {
      return res.status(err.statusCode || 400).json({
        error: err.name || 'AttendanceError',
        message: err.message
      });
    }
  }

  async create(req: Request, res: Response) {
    try {
      const actor = actorFromRequest(req);
      const input = CreateAttendanceSchema.parse(req.body);
      const meta = metaFromRequest(req);
      const data = await attendanceService.createAttendance(input, actor, meta);
      return res.status(201).json({ message: 'Attendance record created successfully', data });
    } catch (err: any) {
      return res.status(err.statusCode || 400).json({
        error: err.name || 'AttendanceError',
        message: err.message
      });
    }
  }

  async update(req: Request, res: Response) {
    try {
      const actor = actorFromRequest(req);
      const input = UpdateAttendanceSchema.parse(req.body);
      const meta = metaFromRequest(req);
      const data = await attendanceService.updateAttendance(req.params.id, input, actor, meta);
      return res.json({ message: 'Attendance record updated successfully', data });
    } catch (err: any) {
      return res.status(err.statusCode || 400).json({
        error: err.name || 'AttendanceError',
        message: err.message
      });
    }
  }

  async checkIn(req: Request, res: Response) {
    try {
      const actor = actorFromRequest(req);
      const { shift } = CheckInSchema.parse(req.body || {});
      const meta = metaFromRequest(req);
      const data = await attendanceService.checkIn(actor, shift, meta);
      return res.status(201).json({ message: 'Checked in successfully', data });
    } catch (err: any) {
      return res.status(err.statusCode || 400).json({
        error: err.name || 'AttendanceError',
        message: err.message
      });
    }
  }

  async checkOut(req: Request, res: Response) {
    try {
      const actor = actorFromRequest(req);
      const meta = metaFromRequest(req);
      const data = await attendanceService.checkOut(actor, meta);
      return res.json({ message: 'Checked out successfully', data });
    } catch (err: any) {
      return res.status(err.statusCode || 400).json({
        error: err.name || 'AttendanceError',
        message: err.message
      });
    }
  }
}

export const attendanceController = new AttendanceController();
