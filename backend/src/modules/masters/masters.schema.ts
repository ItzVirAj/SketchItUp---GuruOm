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
export const BANK_ACCOUNT_REGEX = /^[0-9A-Za-z]{6,24}$/;
export const ITEM_CODE_REGEX = /^[A-Z0-9\-_]+$/;
export const ITEM_CATEGORIES = ['None', 'Round Bar', 'Plate', 'Angle'] as const;
export type ItemCategory = (typeof ITEM_CATEGORIES)[number];

export function isMaskedAccountNumber(val?: string | null): boolean {
  if (!val) return false;
  const trimmed = val.trim();
  return trimmed.includes('•') || trimmed.includes('*') || trimmed.includes('#') || /[Xx]{2,}/.test(trimmed);
}

export function isValidMaskedFormat(val?: string | null): boolean {
  if (!val) return false;
  const trimmed = val.trim();
  // Valid masked representations: starts with mask symbols and optional ending suffix of 2-4 chars, or all mask symbols
  // e.g. "••••••••1234", "********1234", "XXXXXX1234", "•••• •••• •••• 1234", "********", "XXXXXXXX"
  return /^(?:[•*#Xx\s]{4,}[0-9A-Za-z]{0,4}|[•*#Xx\s]+)$/.test(trimmed);
}

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
  ], { message: 'Please select a valid customer type' }),
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
  ], { message: 'Please select valid payment terms' }),
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
  vendorType: z.string().optional().default(''),
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
  ], { message: 'Please select a valid vendor category' }),
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
  pan: z.string().optional().or(z.literal('')).refine((val) => !val || PAN_REGEX.test(val.trim()), { message: 'Invalid PAN format (10 characters alphanumeric, e.g. AAAFS1111A)' }),
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
}).refine((data) => {
  if (!data.bankAccountNumber) return false;
  const trimmed = data.bankAccountNumber.trim();
  if (isMaskedAccountNumber(trimmed)) return false;
  return BANK_ACCOUNT_REGEX.test(trimmed);
}, {
  message: 'Valid plaintext bank account number (6-24 alphanumeric characters, unmasked) is required for new vendors',
  path: ['bankAccountNumber']
});

// ============================================================================
// 3. ITEM MASTER SCHEMA
// ============================================================================


const isUpToTwoDecimals = (num: number): boolean => {
  const parts = num.toString().split('.');
  return parts.length <= 1 || parts[1].length <= 2;
};

const dimensionNumberSchema = z.preprocess(
  (val) => {
    if (val === null || val === undefined || val === '') return null;
    const num = Number(val);
    return isNaN(num) ? val : num;
  },
  z.number({ error: 'Dimension must be a valid number' })
    .positive('Dimension must be a positive number')
    .nullable()
    .optional()
);

export function validateCategoryDimensions(
  data: {
    category?: string;
    dimDiameter?: number | null;
    dimLength?: number | null;
    dimWidth?: number | null;
    dimThickness?: number | null;
  },
  ctx: z.RefinementCtx
) {
  if (data.category === 'None') {
    if (data.dimDiameter !== null && data.dimDiameter !== undefined) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Diameter must be null or absent when category is None',
        path: ['dimDiameter']
      });
    }
    if (data.dimLength !== null && data.dimLength !== undefined) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Length must be null or absent when category is None',
        path: ['dimLength']
      });
    }
    if (data.dimWidth !== null && data.dimWidth !== undefined) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Width must be null or absent when category is None',
        path: ['dimWidth']
      });
    }
    if (data.dimThickness !== null && data.dimThickness !== undefined) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Thickness must be null or absent when category is None',
        path: ['dimThickness']
      });
    }
  } else if (data.category === 'Round Bar') {
    if (data.dimDiameter === null || data.dimDiameter === undefined || data.dimDiameter <= 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Diameter is required and must be a positive number for Round Bar',
        path: ['dimDiameter']
      });
    } else if (!isUpToTwoDecimals(data.dimDiameter)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Diameter can have at most 2 decimal places',
        path: ['dimDiameter']
      });
    }

    if (data.dimLength === null || data.dimLength === undefined || data.dimLength <= 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Length is required and must be a positive number for Round Bar',
        path: ['dimLength']
      });
    } else if (!isUpToTwoDecimals(data.dimLength)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Length can have at most 2 decimal places',
        path: ['dimLength']
      });
    }

    if (data.dimWidth !== null && data.dimWidth !== undefined) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Width must be null for Round Bar',
        path: ['dimWidth']
      });
    }

    if (data.dimThickness !== null && data.dimThickness !== undefined) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Thickness must be null for Round Bar',
        path: ['dimThickness']
      });
    }
  } else if (data.category === 'Plate' || data.category === 'Angle') {
    if (data.dimDiameter !== null && data.dimDiameter !== undefined) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Diameter must be null for ${data.category}`,
        path: ['dimDiameter']
      });
    }

    if (data.dimLength === null || data.dimLength === undefined || data.dimLength <= 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Length is required and must be a positive number for ${data.category}`,
        path: ['dimLength']
      });
    } else if (!isUpToTwoDecimals(data.dimLength)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Length can have at most 2 decimal places',
        path: ['dimLength']
      });
    }

    if (data.dimWidth === null || data.dimWidth === undefined || data.dimWidth <= 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Width is required and must be a positive number for ${data.category}`,
        path: ['dimWidth']
      });
    } else if (!isUpToTwoDecimals(data.dimWidth)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Width can have at most 2 decimal places',
        path: ['dimWidth']
      });
    }

    if (data.dimThickness === null || data.dimThickness === undefined || data.dimThickness <= 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Thickness is required and must be a positive number for ${data.category}`,
        path: ['dimThickness']
      });
    } else if (!isUpToTwoDecimals(data.dimThickness)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Thickness can have at most 2 decimal places',
        path: ['dimThickness']
      });
    }
  }
}

export const MasterItemBaseSchema = z.object({
  id: z.string().optional(),
  code: z.string()
    .trim()
    .min(1, 'Item code is required')
    .max(100, 'Item code cannot exceed 100 characters')
    .transform(val => val.toUpperCase())
    .refine(val => val.length > 0, { message: 'Item code is required' })
    .refine(val => ITEM_CODE_REGEX.test(val), {
      message: 'Item code must contain only letters, numbers, hyphens, and underscores'
    }),
  name: z.string().min(1, 'Item name is required'),
  itemType: z.enum([
    'Raw Material',
    'Semi-Finished',
    'Finished Good',
    'Consumable',
    'Bought-Out',
    'Other'
  ] as const, { error: 'Please select a valid item type' }),
  category: z.enum(ITEM_CATEGORIES, {
    error: 'Category must be one of: None, Round Bar, Plate, Angle'
  }),
  dimDiameter: dimensionNumberSchema.default(null),
  dimLength: dimensionNumberSchema.default(null),
  dimWidth: dimensionNumberSchema.default(null),
  dimThickness: dimensionNumberSchema.default(null),
  description: z.string().optional().default(''),
  partNo: z.string().optional().default(''),
  unit: z.enum(['Nos', 'Kg', 'Meter', 'Litre', 'Set', 'Box'] as const, {
    error: 'Please select a valid Unit of Measure (UOM)'
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

export const MasterItemSchema = MasterItemBaseSchema.superRefine((data, ctx) => {
  // If Raw Material, Consumable, Bought-Out: standard_cost is required (> 0) and preferred_vendor is required
  if (['Raw Material', 'Consumable', 'Bought-Out'].includes(data.itemType)) {
    if (data.standardCost === undefined || data.standardCost <= 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Standard Cost (₹) and Preferred Vendor are required for Raw Material, Consumable, and Bought-Out items',
        path: ['standardCost']
      });
    }
    if (!data.preferredVendor || data.preferredVendor.trim().length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Preferred Vendor is required for Raw Material, Consumable, and Bought-Out items',
        path: ['preferredVendor']
      });
    }
  }

  // If Finished Good: selling_price is required (> 0)
  if (data.itemType === 'Finished Good') {
    if (data.sellingPrice === undefined || data.sellingPrice <= 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Selling Price (₹) is required for Finished Goods',
        path: ['sellingPrice']
      });
    }
  }

  validateCategoryDimensions(data, ctx);
});

export const MasterItemUpdateSchema = MasterItemBaseSchema
  .omit({ code: true })
  .extend({
    code: z.string().optional()
  })
  .superRefine((data, ctx) => {
    if (data.itemType && ['Raw Material', 'Consumable', 'Bought-Out'].includes(data.itemType)) {
      if (data.standardCost === undefined || data.standardCost <= 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Standard Cost (₹) and Preferred Vendor are required for Raw Material, Consumable, and Bought-Out items',
          path: ['standardCost']
        });
      }
      if (!data.preferredVendor || data.preferredVendor.trim().length === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Preferred Vendor is required for Raw Material, Consumable, and Bought-Out items',
          path: ['preferredVendor']
        });
      }
    }

    if (data.itemType === 'Finished Good') {
      if (data.sellingPrice === undefined || data.sellingPrice <= 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Selling Price (₹) is required for Finished Goods',
          path: ['sellingPrice']
        });
      }
    }

    validateCategoryDimensions(data, ctx);
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
  ], { message: 'Please select a valid machine type' }),
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
  ], { message: 'Please select a valid user role' }),
  department: z.string().min(1, 'Department is required'),
  mobile: z.string().regex(INDIAN_MOBILE_REGEX, 'Mobile must be a valid 10-digit Indian mobile number used for OTP'),
  email: z.string().email('Please enter a valid email ID (login identifier)'),
  accessLevel: z.enum(['Full Access', 'Edit', 'View Only'], {
    message: 'Please select access level'
  }),
  modulesAccess: z.array(z.string()).min(1, 'Select at least one module for access'),
  reportingManager: z.string().optional().default(''),
  shift: z.enum(['General-Day', 'Shift A', 'Shift B', 'Shift C']).default('General-Day'),
  status: z.enum(['Active', 'Inactive']).default('Active'),
  password: z.string().optional().default('1234567890')
});
