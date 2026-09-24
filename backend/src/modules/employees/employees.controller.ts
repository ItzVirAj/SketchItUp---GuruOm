import { Request, Response } from 'express';
import { EmployeeListQuerySchema, EmployeeUpdateSchema } from './employees.schema';
import { employeesService } from './employees.service';

function actorFromRequest(req: Request) {
  const user = req.user;
  if (!user?.id || !user.email) {
    throw Object.assign(new Error('Authenticated actor is required.'), { statusCode: 401 });
  }
  return { id: user.id, email: user.email, role: user.role || '', name: user.name };
}

export class EmployeesController {
  async listEmployees(req: Request, res: Response) {
    try {
      const actor = actorFromRequest(req);
      const query = EmployeeListQuerySchema.parse({
        search: req.query.search,
        department: req.query.department,
        status: req.query.status
      });
      return res.json({ data: await employeesService.listEmployees(actor, query) });
    } catch (err: any) {
      return res.status(err.statusCode || 400).json({ error: 'EmployeeMasterError', message: err.message });
    }
  }

  async updateEmployee(req: Request, res: Response) {
    try {
      const actor = actorFromRequest(req);
      EmployeeUpdateSchema.parse(req.body);
      const data = await employeesService.updateEmployee(req.params.id, req.body, actor);
      return res.json({ message: 'Employee updated successfully', data });
    } catch (err: any) {
      return res.status(err.statusCode || 400).json({ error: 'EmployeeMasterError', message: err.message });
    }
  }
}

export const employeesController = new EmployeesController();
