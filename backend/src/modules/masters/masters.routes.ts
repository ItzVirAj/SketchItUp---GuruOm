import { Router } from 'express';
import { mastersController } from './masters.controller';
import { requireAuth } from '../../middleware/auth.middleware';
import { requireRole } from '../../middleware/rbac.middleware';

const router = Router();

// Apply Authentication to all master routes
router.use(requireAuth);

// Core Item Masters
router.get('/', (req, res) => mastersController.getMasters(req, res));
router.post('/', requireRole(['SUPER ADMIN']), (req, res) => mastersController.createMaster(req, res));

// Customers
router.get('/customers', (req, res) => mastersController.getCustomers(req, res));
router.post('/customers', requireRole(['SUPER ADMIN', 'FINANCE_MANAGER', 'DISPATCH_CLERK']), (req, res) => mastersController.createCustomer(req, res));

// Vendors
router.get('/vendors', (req, res) => mastersController.getVendors(req, res));
router.post('/vendors', requireRole(['SUPER ADMIN', 'FINANCE_MANAGER']), (req, res) => mastersController.createVendor(req, res));

// Machines
router.get('/machines', (req, res) => mastersController.getMachines(req, res));
router.post('/machines', requireRole(['SUPER ADMIN', 'OPERATOR']), (req, res) => mastersController.createMachine(req, res));

// Company Profile
router.get('/company-profile', (req, res) => mastersController.getCompanyProfile(req, res));
router.put('/company-profile', requireRole(['SUPER ADMIN']), (req, res) => mastersController.updateCompanyProfile(req, res));

export default router;
