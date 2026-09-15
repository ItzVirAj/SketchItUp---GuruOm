import { z } from 'zod';
import { getDbClient } from '../../config/database';
import { tryNormalizeRole } from '../../../../src/utils/rbacMatrix';
import { auditService } from '../audit/audit.service';
import { notificationsService } from '../notifications/notifications.service';
import { EmployeeListQuerySchema, EmployeeUpdateSchema } from './employees.schema';

export interface EmployeeActor {
  id: string;
  email: string;
  role: string;
  name?: string;
}

const EXCLUDED_EMPLOYEE_ROLES = new Set(['ServerAdmin', 'Owner', 'Client']);

export function isEmployeeRole(role?: string | null): boolean {
  // Read/display filter: an unrecognized role is still listed as an employee
  // row (same as before, where it failed open to Shop Floor Supervisor) — the
  // row renders its raw role string, so nothing is silently misrepresented.
  const resolved = tryNormalizeRole(role || '');
  return !EXCLUDED_EMPLOYEE_ROLES.has(resolved ?? String(role ?? ''));
}

function canManageEmployeeMaster(role?: string | null): boolean {
  const normalized = tryNormalizeRole(role || '');
  // Fail-closed: an unrecognized role can never manage the employee master.
  return normalized === 'ServerAdmin' || normalized === 'Owner' ||
    normalized === 'Admin (System)' || normalized === 'HR/Admin';
}

function mapEmployee(u: any) {
  return {
    id: u.id,
    employeeCode: u.employee_code || u.user_id || u.id,
    name: u.full_name || '',
    email: u.email || '',
    role: u.role || '',
    department: u.department || 'Unassigned',
    phone: u.phone || u.mobile || '',
    reportingManager: u.reporting_manager || '',
    shift: u.shift || 'General-Day',
    status: u.status || 'ACTIVE',
    lastLogin: u.last_login_at || null,
    createdAt: u.created_at || null,
    updatedAt: u.updated_at || null
  };
}

export class EmployeesService {
  private readonly db = getDbClient();

  assertCanManage(actor: EmployeeActor) {
    if (!canManageEmployeeMaster(actor.role)) {
      const err: any = new Error('Employee Master access is restricted to Owner, Admin (System), HR/Admin, and ServerAdmin.');
      err.statusCode = 403;
      throw err;
    }
  }

  async listEmployees(actor: EmployeeActor, query: z.infer<typeof EmployeeListQuerySchema>) {
    this.assertCanManage(actor);

    let dbQuery = this.db
      .from('users')
      .select('id, employee_code, user_id, full_name, email, role, department, phone, mobile, reporting_manager, shift, status, last_login_at, created_at, updated_at')
      .order('created_at', { ascending: false });

    if (query.search) {
      const escaped = query.search.replace(/[%_,]/g, '');
      if (escaped) {
        dbQuery = dbQuery.or(
          `full_name.ilike.%${escaped}%,email.ilike.%${escaped}%,employee_code.ilike.%${escaped}%,department.ilike.%${escaped}%`
        );
      }
    }
    if (query.department) dbQuery = dbQuery.eq('department', query.department);
    if (query.status) dbQuery = dbQuery.eq('status', query.status);

    const { data, error } = await dbQuery;
    if (error) throw new Error(`Employee query failed: ${error.message}`);

    return (data || []).filter((u: any) => isEmployeeRole(u.role)).map(mapEmployee);
  }

  async updateEmployee(id: string, input: unknown, actor: EmployeeActor) {
    this.assertCanManage(actor);
    const validated = EmployeeUpdateSchema.parse(input);

    const { data: existing, error: fetchError } = await this.db
      .from('users')
      .select('id, employee_code, full_name, email, role, department, phone, reporting_manager, shift, status')
      .eq('id', id)
      .maybeSingle();

    if (fetchError) throw new Error(`Employee lookup failed: ${fetchError.message}`);
    if (!existing) {
      const err: any = new Error(`Employee with ID ${id} was not found.`);
      err.statusCode = 404;
      throw err;
    }
    if (!isEmployeeRole(existing.role)) {
      const err: any = new Error('Privileged or external accounts cannot be edited from Employee Master.');
      err.statusCode = 403;
      throw err;
    }

    const patch: Record<string, string> = {};
    if (validated.name !== undefined) patch.full_name = validated.name;
    if (validated.email !== undefined) patch.email = validated.email.toLowerCase();
    if (validated.department !== undefined) patch.department = validated.department;
    if (validated.phone !== undefined) patch.phone = validated.phone;
    if (validated.reportingManager !== undefined) patch.reporting_manager = validated.reportingManager;
    if (validated.shift !== undefined) patch.shift = validated.shift;
    if (Object.keys(patch).length === 0) return mapEmployee(existing);

    if (patch.email && patch.email !== String(existing.email).toLowerCase()) {
      const { data: conflict } = await this.db.from('users').select('id').ilike('email', patch.email).neq('id', id).maybeSingle();
      if (conflict) {
        const err: any = new Error(`Email address ${patch.email} is already assigned to another user.`);
        err.statusCode = 409;
        throw err;
      }
    }

    const beforeState = {
      id: existing.id, employeeCode: existing.employee_code, name: existing.full_name,
      email: existing.email, role: existing.role, department: existing.department,
      phone: existing.phone, reportingManager: existing.reporting_manager,
      shift: existing.shift, status: existing.status
    };

    const { data: updated, error: updateError } = await this.db
      .from('users')
      .update({ ...patch, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select('id, employee_code, user_id, full_name, email, role, department, phone, mobile, reporting_manager, shift, status, last_login_at, created_at, updated_at')
      .single();

    if (updateError) throw new Error(`Employee update failed: ${updateError.message}`);

    const afterState = {
      id: updated.id, employeeCode: updated.employee_code, name: updated.full_name,
      email: updated.email, role: updated.role, department: updated.department,
      phone: updated.phone, reportingManager: updated.reporting_manager,
      shift: updated.shift, status: updated.status
    };

    await auditService.recordAuditLog({
      actorId: actor.id,
      actorEmail: actor.email,
      // Audit metadata records the truthful value: canonical when recognized,
      // otherwise the raw string — never a silent 'Shop Floor Supervisor'.
      actorRole: tryNormalizeRole(actor.role) ?? String(actor.role ?? ''),
      action: 'EMPLOYEE_MASTER_UPDATE',
      entityType: 'employee',
      entityId: id,
      beforeState,
      afterState,
      details: `Employee Master profile updated for ${existing.full_name}.`,
      metadata: { source: 'hr.employee-master' }
    });

    const mapped = mapEmployee(updated);
    notificationsService.broadcastEvent('employee_updated', mapped);
    return mapped;
  }
}

export const employeesService = new EmployeesService();
