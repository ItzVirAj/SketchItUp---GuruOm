import { Router } from 'express';
import { requireAuth } from '../../middleware/auth.middleware';
import { employeesController } from './employees.controller';

const router = Router();

router.use(requireAuth);
router.get('/', (req, res) => employeesController.listEmployees(req, res));
router.patch('/:id', (req, res) => employeesController.updateEmployee(req, res));

export default router;
