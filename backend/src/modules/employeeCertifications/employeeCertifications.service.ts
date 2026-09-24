import { z } from 'zod';
import crypto from 'crypto';
import { getDbClient } from '../../config/database';
import { auditService } from '../audit/audit.service';
import { logger } from '../../utils/logger';
import { StorageService, ATTACHMENTS_BUCKET } from '../../lib/storage';
import {
  CreateEmployeeCertificationSchema,
  UpdateEmployeeCertificationSchema,
  EmployeeCertificationQuerySchema,
  CreateEmployeeCertificationInput,
  UpdateEmployeeCertificationInput,
  EmployeeCertificationQueryParams
} from './employeeCertifications.schema';

export interface CertificationActor {
  id: string;
  email: string;
  role?: string;
  name?: string;
}

export class CertificationNotFoundError extends Error {
  readonly statusCode = 404;
  constructor(message = 'Employee certification record not found.') {
    super(message);
    this.name = 'CertificationNotFoundError';
  }
}

export class ForbiddenCertificationActionError extends Error {
  readonly statusCode = 403;
  constructor(message = 'You are not authorized to perform this certification action.') {
    super(message);
    this.name = 'ForbiddenCertificationActionError';
  }
}

function todayDateString(): string {
  return new Date().toISOString().slice(0, 10);
}

export class EmployeeCertificationsService {
  private db = getDbClient();

  private mapCertification(row: any) {
    const employee = row.users || row.employee || (row.employee_user?.[0] ?? row.employee_user);
    const assigner = row.assigner || (row.assigned_by_user?.[0] ?? row.assigned_by_user);
    const today = todayDateString();
    const expiryDate = row.expiry_date || row.valid_until || null;
    const isExpired = expiryDate ? expiryDate < today : false;
    const employeeId = row.employee_id || row.employee_code;
    const title = row.title || row.certification_name || 'Certificate';
    const issuingBody = row.issuing_body || 'Verified Authority';
    const issuedDate = row.issued_date || row.created_at?.slice(0, 10) || today;
    const employeeName = row.employee_name || employee?.full_name || employee?.name || 'Staff Member';

    let daysUntilExpiry: number | null = null;
    if (expiryDate) {
      const diffMs = new Date(expiryDate).getTime() - new Date(today).getTime();
      daysUntilExpiry = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    }

    return {
      id: row.id,
      employeeId,
      title,
      issuingBody,
      issuedDate,
      expiryDate,
      documentUrl: row.document_url || null,
      assignedBy: row.assigned_by || 'HR/Admin',
      orgId: row.org_id || '00000000-0000-0000-0000-000000000001',
      createdAt: row.created_at || new Date().toISOString(),
      updatedAt: row.updated_at || row.created_at || new Date().toISOString(),
      isExpired,
      daysUntilExpiry,
      employee: employee
        ? {
            id: employee.id || employeeId,
            name: employee.full_name || employee.name || employeeName,
            email: employee.email || '',
            department: employee.department || 'Operations',
            role: employee.role || 'Staff'
          }
        : {
            id: employeeId,
            name: employeeName,
            email: '',
            department: 'Operations',
            role: 'Staff'
          },
      employeeName,
      assigner: assigner
        ? {
            id: assigner.id,
            name: assigner.full_name || assigner.name || 'HR Admin',
            email: assigner.email || ''
          }
        : undefined,
      assignedByName: assigner?.full_name || assigner?.name || 'HR Admin'
    };
  }

  async listCertifications(
    actor: CertificationActor,
    isOwnRecordsOnly: boolean,
    queryParams: EmployeeCertificationQueryParams
  ) {
    let matchedEmployeeIds: string[] | null = null;

    if (!isOwnRecordsOnly && queryParams.search) {
      const searchPattern = `%${queryParams.search.trim()}%`;
      const { data: matchedUsers, error: userError } = await this.db
        .from('users')
        .select('id')
        .or(`full_name.ilike.${searchPattern},email.ilike.${searchPattern}`);

      if (userError) {
        logger.warn('[EmployeeCertificationsService] User search failed:', userError);
      } else {
        matchedEmployeeIds = (matchedUsers || []).map((u: any) => u.id);
      }
    }

    const buildQuery = (colName: 'employee_id' | 'employee_code', withRelations = false) => {
      let q = withRelations
        ? this.db
            .from('employee_certifications')
            .select('*, employee:users!employee_id(id, full_name, email, department, role), assigner:users!assigned_by(id, full_name, email, role)')
        : this.db.from('employee_certifications').select('*');

      // Sort
      if (colName === 'employee_id') {
        q = q.order('created_at', { ascending: false });
      } else {
        q = q.order('created_at', { ascending: false });
      }

      // Own-records scoping vs All-records scoping
      if (isOwnRecordsOnly || queryParams.scope === 'mine') {
        q = q.eq(colName, actor.id);
      } else {
        const targetId = queryParams.employee_id || queryParams.employeeId;
        if (targetId) {
          q = q.eq(colName, targetId);
        } else if (queryParams.search) {
          const searchPattern = `%${queryParams.search.trim()}%`;
          if (matchedEmployeeIds && matchedEmployeeIds.length > 0) {
            q = q.or(`title.ilike.${searchPattern},certification_name.ilike.${searchPattern},${colName}.in.(${matchedEmployeeIds.join(',')})`);
          } else {
            q = q.or(`title.ilike.${searchPattern},certification_name.ilike.${searchPattern},employee_name.ilike.${searchPattern}`);
          }
        }
      }

      const today = todayDateString();
      if (queryParams.status === 'ACTIVE') {
        q = q.or(`valid_until.is.null,valid_until.gte.${today}`);
      } else if (queryParams.status === 'EXPIRED') {
        q = q.not('valid_until', 'is', null).lt('valid_until', today);
      }

      if (queryParams.limit) {
        q = q.limit(queryParams.limit);
      }
      if (queryParams.offset) {
        q = q.range(queryParams.offset, queryParams.offset + (queryParams.limit || 50) - 1);
      }

      return q;
    };

    // Try primary query with employee_id
    let { data, error } = await buildQuery('employee_id', false);

    // If PostgREST schema cache has legacy employee_code column
    if (error && (error.code === 'PGRST204' || error.code === '42703' || error.message?.includes('schema cache') || error.message?.includes('does not exist'))) {
      const res = await buildQuery('employee_code', false);
      data = res.data;
      error = res.error;
    }

    if (error) {
      logger.error('[EmployeeCertificationsService] Query error:', error);
      throw error;
    }

    return (data || []).map(this.mapCertification);
  }

  async getMyCertifications(actor: CertificationActor, queryParams: EmployeeCertificationQueryParams) {
    return this.listCertifications(actor, true, { ...queryParams, scope: 'mine' });
  }

  async getCertificationById(id: string, actor: CertificationActor, isOwnRecordsOnly: boolean) {
    let { data, error } = await this.db
      .from('employee_certifications')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error || !data) {
      throw new CertificationNotFoundError();
    }

    const recordOwner = data.employee_id || data.employee_code;
    if (isOwnRecordsOnly && recordOwner !== actor.id) {
      throw new ForbiddenCertificationActionError('You may only view your own certifications.');
    }

    return this.mapCertification(data);
  }

  async createCertification(input: CreateEmployeeCertificationInput, actor: CertificationActor) {
    const validated = CreateEmployeeCertificationSchema.parse(input);

    // Verify employee exists
    const { data: employeeUser, error: empError } = await this.db
      .from('users')
      .select('id, full_name, email')
      .eq('id', validated.employee_id)
      .maybeSingle();

    if (empError || !employeeUser) {
      throw Object.assign(new Error(`Target employee ID ${validated.employee_id} does not exist.`), {
        statusCode: 400
      });
    }

    const certId = crypto.randomUUID();

    // Primary full row for updated schema
    const fullRow: any = {
      id: certId,
      employee_id: validated.employee_id,
      employee_name: employeeUser.full_name,
      employee_code: validated.employee_id,
      title: validated.title.trim(),
      certification_name: validated.title.trim(),
      issuing_body: validated.issuing_body.trim(),
      issued_date: validated.issued_date,
      expiry_date: validated.expiry_date || null,
      valid_until: validated.expiry_date || null,
      document_url: validated.document_url || null,
      assigned_by: actor.id
    };

    if (validated.org_id && validated.org_id !== 'org_default') {
      fullRow.org_id = validated.org_id;
    }

    let { data: inserted, error: insertError } = await this.db
      .from('employee_certifications')
      .insert(fullRow)
      .select('*')
      .single();

    // Fallback if PostgREST cache has not updated schema cache
    if (insertError && (insertError.code === 'PGRST204' || insertError.code === '42703' || insertError.message?.includes('schema cache') || insertError.message?.includes('does not exist'))) {
      logger.warn('[EmployeeCertificationsService] Using compat row insert:', insertError.message);
      const compatRow: any = {
        id: certId,
        employee_name: employeeUser.full_name,
        employee_code: validated.employee_id,
        certification_name: validated.title.trim(),
        valid_until: validated.expiry_date || null
      };

      const res = await this.db
        .from('employee_certifications')
        .insert(compatRow)
        .select('*')
        .single();

      inserted = res.data;
      insertError = res.error;
    }

    if (insertError) {
      logger.error('[EmployeeCertificationsService] Insert error:', insertError);
      throw insertError;
    }

    // Merge in inputs if compat row returned subset
    const mapped = this.mapCertification({
      ...fullRow,
      ...inserted
    });

    await auditService.recordAuditLog({
      actorId: actor.id,
      actorEmail: actor.email,
      actorRole: actor.role || 'HR/Admin',
      action: 'EMPLOYEE_CERTIFICATION_ASSIGNED',
      entityType: 'employee_certifications',
      entityId: certId,
      details: `Assigned certificate "${validated.title}" issued by "${validated.issuing_body}" to employee "${employeeUser.full_name}" (${employeeUser.email}).`,
      metadata: {
        employeeId: validated.employee_id,
        issuedDate: validated.issued_date,
        expiryDate: validated.expiry_date
      }
    }).catch(err => logger.warn('[EmployeeCertificationsService] Audit log error:', err));

    return mapped;
  }

  async deleteCertification(id: string, actor: CertificationActor) {
    const { data: existing, error: fetchError } = await this.db
      .from('employee_certifications')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (fetchError || !existing) {
      throw new CertificationNotFoundError();
    }

    const { error: deleteError } = await this.db
      .from('employee_certifications')
      .delete()
      .eq('id', id);

    if (deleteError) {
      logger.error('[EmployeeCertificationsService] Delete error:', deleteError);
      throw deleteError;
    }

    await auditService.recordAuditLog({
      actorId: actor.id,
      actorEmail: actor.email,
      actorRole: actor.role || 'HR/Admin',
      action: 'EMPLOYEE_CERTIFICATION_REVOKED',
      entityType: 'employee_certifications',
      entityId: id,
      details: `Revoked certificate "${existing.title || existing.certification_name}" for employee ${existing.employee_name || existing.employee_id}.`,
      metadata: {
        certificationId: id,
        employeeId: existing.employee_id || existing.employee_code
      }
    }).catch(err => logger.warn('[EmployeeCertificationsService] Audit log error:', err));

    return { success: true, message: 'Employee certification revoked successfully.' };
  }

  async uploadCertificateDocument(
    buffer: Buffer,
    filename: string,
    contentType: string,
    actor: CertificationActor
  ) {
    const timestamp = Date.now();
    const sanitizedFilename = filename.replace(/[^a-zA-Z0-9._-]/g, '_');
    const storagePath = `employee-certifications/${actor.id}/${timestamp}_${sanitizedFilename}`;

    const uploadRes = await StorageService.uploadBuffer(
      ATTACHMENTS_BUCKET,
      storagePath,
      buffer,
      contentType
    );

    if (uploadRes.error) {
      throw new Error(`Document upload failed: ${uploadRes.error}`);
    }

    const signedUrlRes = await StorageService.createSignedDownloadUrl(
      ATTACHMENTS_BUCKET,
      uploadRes.path,
      3600 // 1 hour download expiration
    );

    return {
      storagePath: uploadRes.path,
      signedUrl: signedUrlRes.signedUrl
    };
  }
}

export const employeeCertificationsService = new EmployeeCertificationsService();
