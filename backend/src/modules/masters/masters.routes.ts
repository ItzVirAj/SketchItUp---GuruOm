import { Router } from 'express';
import { mastersController } from './masters.controller';
import { requireAuth } from '../../middleware/auth.middleware';
import { requirePermission } from '../../middleware/rbac.middleware';

const router = Router();

// Apply Authentication to all master routes
router.use(requireAuth);

// 1. Core Item Masters
router.get('/', requirePermission('masters', 'VIEW_ONLY'), (req, res) => mastersController.getMasters(req, res));
router.post('/', requirePermission('masters', 'CREATE_EDIT'), (req, res) => mastersController.createMaster(req, res));

// 2. Customers
router.get('/customers', requirePermission('masters', 'VIEW_ONLY'), (req, res) => mastersController.getCustomers(req, res));
router.post('/customers', requirePermission('masters', 'CREATE_EDIT'), (req, res) => mastersController.createCustomer(req, res));

// 3. Vendors
router.get('/vendors', requirePermission('masters', 'VIEW_ONLY'), (req, res) => mastersController.getVendors(req, res));
router.post('/vendors', requirePermission('masters', 'CREATE_EDIT'), (req, res) => mastersController.createVendor(req, res));

// 4. Machines
router.get('/machines', requirePermission('masters', 'VIEW_ONLY'), (req, res) => mastersController.getMachines(req, res));
router.post('/machines', requirePermission('masters', 'CREATE_EDIT'), (req, res) => mastersController.createMachine(req, res));

// 5. Users Master (Permitted for HR/Admin, Owner, Admin (System))
router.get('/users', requirePermission('masters', 'VIEW_ONLY'), (req, res) => mastersController.getUsers(req, res));
router.post('/users', requirePermission('masters', 'CREATE_EDIT'), (req, res) => mastersController.createUser(req, res));

// 6. Reference Dropdowns (Salespersons, Preferred Vendors, Responsible Persons)
router.get('/dropdowns', requirePermission('masters', 'VIEW_ONLY'), (req, res) => mastersController.getDropdowns(req, res));

// 7. Company Profile
router.get('/company-profile', requirePermission('settings', 'VIEW_ONLY'), (req, res) => mastersController.getCompanyProfile(req, res));
router.put('/company-profile', requirePermission('settings', 'FULL_APPROVE'), (req, res) => mastersController.updateCompanyProfile(req, res));

export default router;
