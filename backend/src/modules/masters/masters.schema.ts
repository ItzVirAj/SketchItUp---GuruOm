import { z } from 'zod';

// ============================================================================
// Regex Patterns
// ============================================================================
export const INDIAN_MOBILE_REGEX = /^[6-9]\d{9}$/;
export const GSTIN_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/i;
export const PAN_REGEX = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/i;
export const PINCODE_REGEX = /^\d{6}$/;
export const HSN_CODE_REGEX = /^\d{4,8}$/;
export const IFSC_REGEX = /^[A-Z]{4}0[A-Z0-9]{6}$/i;

const isGstExemptValue = (val?: string | null) => {
  if (!val) return false;
  const s = val.trim().toLowerCase();
  return s === 'n/a — gst-exempt' || s === 'n/a - gst-exempt' || s === 'n/a' || s.includes('exempt');
};

// ============================================================================
// 1. CUSTOMER MASTER SCHEMA
// ============================================================================
export const CustomerMasterBaseSchema = z.object({
  id: z.string().optional(),
  code: z.string().min(1, 'Customer ID code is required'),
  name: z.string().min(1, 'Customer name is required'),
  legalName: z.string().optional().default(''),
  customerType: z.enum([
    'Dealer',
    'Distributor',
    'OEM',
    'Retailer',
    'Corporate',
    'Export',
    'Other'
  ], { errorMap: () => ({ message: 'Please select a valid customer type' }) }),
  contactPerson: z.string().min(1, 'Contact person is required'),
  mobile: z.string().regex(INDIAN_MOBILE_REGEX, 'Mobile must be a valid 10-digit Indian mobile number starting with 6-9'),
  email: z.string().email('Please enter a valid email address').optional().or(z.literal('')),
  gstin: z.string().min(1, 'GSTIN is required or choose N/A — GST-exempt')
    .refine((val) => isGstExemptValue(val) || GSTIN_REGEX.test(val.trim()), {
      message: 'Invalid GSTIN format (15 characters alphanumeric, e.g. 27AABCL1234M1ZP) or N/A — GST-exempt'
    }),
  pan: z.string().optional().or(z.literal(''))
    .refine((val) => !val || PAN_REGEX.test(val.trim()), {
      message: 'Invalid PAN format (10 characters alphanumeric, e.g. AABCL1234M)'
    }),
  billingAddress: z.string().min(1, 'Billing address is required'),
  shippingAddress: z.string().optional().default(''),
  city: z.string().min(1, 'City is required'),
  state: z.string().min(1, 'State is required'),
  stateCode: z.string().optional().default('27'),
  pincode: z.string().optional().or(z.literal(''))
    .refine((val) => !val || PINCODE_REGEX.test(val.trim()), {
      message: 'Pincode must be 6 digits'
    }),
  paymentTerms: z.enum([
    'Advance',
    'Net 15',
    'Net 30',
    'Net 45',
    'Net 60',
    'Other'
  ], { errorMap: () => ({ message: 'Please select valid payment terms' }) }),
  creditDays: z.coerce.number().min(0, 'Credit days cannot be negative').max(180, 'Max credit days is 180').default(0),
  creditLimit: z.coerce.number().min(0, 'Credit limit cannot be negative').default(0),
  salesperson: z.string().optional().default(''),
  status: z.enum(['Active', 'Inactive']).default('Active'),
  notes: z.string().optional().default('')
});

export const CustomerMasterSchema = CustomerMasterBaseSchema.refine((data) => {
  // If payment terms is Net, credit days must be > 0 and credit limit > 0
  if (data.paymentTerms && data.paymentTerms.startsWith('Net')) {
    return data.creditDays > 0 && data.creditLimit > 0;
  }
  return true;
}, {
  message: 'Credit Days (1-180) and Credit Limit (₹) are required when Payment Terms are Net',
  path: ['creditDays']
}).refine((data) => {
  // If GST is exempt, reason must be provided in notes
  if (isGstExemptValue(data.gstin)) {
    return data.notes && data.notes.trim().length > 0;
  }
  return true;
}, {
  message: 'Please provide a GST exemption reason in the Notes field when GSTIN is N/A — GST-exempt',
  path: ['notes']
});

// ============================================================================
// 2. VENDOR MASTER SCHEMA
// ============================================================================
export const VendorMasterBaseSchema = z.object({
  id: z.string().optional(),
  code: z.string().min(1, 'Vendor ID code is required'),
  name: z.string().min(1, 'Vendor name is required'),
  legalName: z.string().optional().default(''),
  vendorType: z.enum([
    'Supplier',
    'Transporter',
    'Subcontractor / Job Worker',
    'ServiceProvider',
    'EquipmentVendor',
    'ProfessionalService',
    'ManpowerProvider',
    'Other'
  ], { errorMap: () => ({ message: 'Please select a valid vendor type' }) }),
  vendorCategory: z.enum([
    'Raw Material',
    'Components',
    'Consumables',
    'Packaging',
    'Machinery',
    'Maintenance',
    'Transport',
    'IT',
    'Professional',
    'Manpower',
    'Other'
  ], { errorMap: () => ({ message: 'Please select a valid vendor category' }) }),
  contactPerson: z.string().min(1, 'Contact person is required'),
  mobile: z.string().regex(INDIAN_MOBILE_REGEX, 'Mobile must be a valid 10-digit Indian mobile number starting with 6-9'),
  email: z.string().email('Please enter a valid email address').optional().or(z.literal('')),
  billingAddress: z.string().min(1, 'Billing address is required'),
  shippingAddress: z.string().optional().default(''),
  city: z.string().min(1, 'City is required'),
  state: z.string().min(1, 'State is required'),
  stateCode: z.string().optional().default('27'),
  pincode: z.string().optional().or(z.literal(''))
    .refine((val) => !val || PINCODE_REGEX.test(val.trim()), {
      message: 'Pincode must be 6 digits'
    }),
  gstin: z.string().optional().or(z.literal(''))
    .refine((val) => !val || isGstExemptValue(val) || GSTIN_REGEX.test(val.trim()), {
      message: 'Invalid GSTIN format (15 characters) or leave blank/exempt'
    }),
  pan: z.string().min(1, 'PAN is mandatory for TDS compliance')
    .regex(PAN_REGEX, 'PAN must be a valid 10-digit format (e.g. AAAFS1111A)'),
  bankAccountName: z.string().min(1, 'Bank account name is required'),
  bankAccountNumber: z.string().min(1, 'Bank account number is required'),
  ifsc: z.string().min(1, 'IFSC code is required')
    .regex(IFSC_REGEX, 'IFSC must be a valid 11-character code (e.g. HDFC0001234)'),
  paymentTerms: z.enum([
    'Advance',
    'Net 15',
    'Net 30',
    'Net 45',
    'Net 60',
    'Other'
  ]).default('Net 30'),
  creditDays: z.coerce.number().min(0).max(180).default(0),
  creditLimit: z.coerce.number().min(0).default(0),
  processType: z.string().optional().default(''),
  turnaroundTimeDays: z.coerce.number().min(0).optional().default(0),
  status: z.enum(['Active', 'Inactive']).default('Active'),
  notes: z.string().optional().default('')
});

export const VendorMasterSchema = VendorMasterBaseSchema.refine((data) => {
  // If subcontractor, prompt processType and turnaroundTimeDays
  if (data.vendorType === 'Subcontractor / Job Worker') {
    return data.processType && data.processType.trim().length > 0;
  }
  return true;
}, {
  message: 'Process type is required for Subcontractor / Job Worker vendors',
  path: ['processType']
});

// ============================================================================
// 3. ITEM MASTER SCHEMA
// ============================================================================
export const MasterItemBaseSchema = z.object({
  id: z.string().optional(),
  code: z.string().min(1, 'Item code is required'),
  name: z.string().min(1, 'Item name is required'),
  itemType: z.enum([
    'Raw Material',
    'Semi-Finished',
    'Finished Good',
    'Consumable',
    'Bought-Out',
    'Other'
  ], { errorMap: () => ({ message: 'Please select a valid item type' }) }),
  category: z.string().optional().default(''),
  description: z.string().optional().default(''),
  partNo: z.string().optional().default(''),
  unit: z.enum(['Nos', 'Kg', 'Meter', 'Litre', 'Set', 'Box'], {
    errorMap: () => ({ message: 'Please select a valid Unit of Measure (UOM)' })
  }),
  hsnCode: z.string().min(1, 'HSN code is required')
    .regex(HSN_CODE_REGEX, 'HSN code must be 4 to 8 digits for GST invoicing'),
  gstRate: z.coerce.number().refine((val) => [0, 5, 12, 18, 28].includes(val), {
    message: 'GST rate must be 0, 5, 12, 18, or 28%'
  }),
  standardCost: z.coerce.number().min(0, 'Standard cost cannot be negative').optional().default(0),
  sellingPrice: z.coerce.number().min(0, 'Selling price cannot be negative').optional().default(0),
  minStock: z.coerce.number().min(0).optional().default(0),
  maxStock: z.coerce.number().min(0).optional().default(0),
  reorderLevel: z.coerce.number().min(0, 'Reorder level cannot be negative').default(10),
  leadTimeDays: z.coerce.number().min(0).optional().default(0),
  preferredVendor: z.string().optional().default(''),
  defaultWarehouse: z.string().optional().default('Main Store'),
  storeLocation: z.string().optional().default('A1-RACK-1'),
  isFinishedGoods: z.boolean().optional().default(false),
  status: z.enum(['Active', 'Inactive']).default('Active')
});

export const MasterItemSchema = MasterItemBaseSchema.refine((data) => {
  // If Raw Material, Consumable, Bought-Out: standard_cost is required (> 0) and preferred_vendor is required
  if (['Raw Material', 'Consumable', 'Bought-Out'].includes(data.itemType)) {
    return (data.standardCost !== undefined && data.standardCost > 0) &&
           (data.preferredVendor !== undefined && data.preferredVendor.trim().length > 0);
  }
  return true;
}, {
  message: 'Standard Cost (₹) and Preferred Vendor are required for Raw Material, Consumable, and Bought-Out items',
  path: ['standardCost']
}).refine((data) => {
  // If Finished Good: selling_price is required (> 0)
  if (data.itemType === 'Finished Good') {
    return data.sellingPrice !== undefined && data.sellingPrice > 0;
  }
  return true;
}, {
  message: 'Selling Price (₹) is required for Finished Goods',
  path: ['sellingPrice']
});

// ============================================================================
// 4. MACHINE MASTER SCHEMA
// ============================================================================
export const MachineMasterBaseSchema = z.object({
  id: z.string().optional(),
  code: z.string().min(1, 'Machine ID code is required'),
  name: z.string().min(1, 'Machine name is required (e.g. VMC-01)'),
  type: z.enum([
    'Cutting',
    'Welding',
    'CNC Turning',
    'CNC Machining',
    'Conventional Machining',
    'Grinding',
    'Inspection-CMM',
    'Other'
  ], { errorMap: () => ({ message: 'Please select a valid machine type' }) }),
  department: z.string().min(1, 'Department is required'),
  location: z.string().min(1, 'Location on shop floor is required'),
  manufacturer: z.string().optional().default(''),
  model: z.string().optional().default(''),
  serialNumber: z.string().optional().default(''),
  installationDate: z.string().optional().default(''),
  capacity: z.coerce.number().min(0).optional(),
  capacityUom: z.string().optional().default(''),
  operatingHours: z.coerce.number().min(0, 'Min 0 hours').max(24, 'Max 24 hours per day').default(16),
  shift: z.enum(['Shift A', 'Shift B', 'Shift C', 'General-Day']).default('General-Day'),
  status: z.enum(['Active', 'Under Maintenance', 'Idle', 'Decommissioned']).default('Active'),
  responsiblePerson: z.string().optional().default(''),
  hourlyCost: z.coerce.number().min(0).optional().default(500),
  active: z.boolean().optional().default(true)
});

export const MachineMasterSchema = MachineMasterBaseSchema.refine((data) => {
  // If capacity is filled, capacity_uom is required
  if (data.capacity !== undefined && data.capacity > 0) {
    return data.capacityUom && data.capacityUom.trim().length > 0;
  }
  return true;
}, {
  message: 'Capacity UOM is required when machine capacity is specified',
  path: ['capacityUom']
});

// ============================================================================
// 5. USER MASTER SCHEMA
// ============================================================================
export const UserMasterSchema = z.object({
  id: z.string().optional(),
  userId: z.string().optional(), // USR-####
  fullName: z.string().min(1, 'Full name is required'),
  employeeCode: z.string().optional().default(''),
  userRole: z.enum([
    'Admin/Owner',
    'Sales Executive',
    'Purchase Executive',
    'Production Supervisor',
    'Store/Inventory Executive',
    'Accounts Executive',
    'Machine Operator',
    'Quality Inspector',
    'Dispatch Executive',
    'Management/Viewer',
    'Other'
  ], { errorMap: () => ({ message: 'Please select a valid user role' }) }),
  department: z.string().min(1, 'Department is required'),
  mobile: z.string().regex(INDIAN_MOBILE_REGEX, 'Mobile must be a valid 10-digit Indian mobile number used for OTP'),
  email: z.string().email('Please enter a valid email ID (login identifier)'),
  accessLevel: z.enum(['Full Access', 'Edit', 'View Only'], {
    errorMap: () => ({ message: 'Please select access level' })
  }),
  modulesAccess: z.array(z.string()).min(1, 'Select at least one module for access'),
  reportingManager: z.string().optional().default(''),
  shift: z.enum(['General-Day', 'Shift A', 'Shift B', 'Shift C']).default('General-Day'),
  status: z.enum(['Active', 'Inactive']).default('Active'),
  password: z.string().optional().default('1234567890')
});
