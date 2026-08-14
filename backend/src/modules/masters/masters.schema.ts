import { z } from 'zod';

export const MasterItemSchema = z.object({
  id: z.string().optional(),
  code: z.string().min(1, 'Item code is required'),
  partNo: z.string().optional().default(''),
  description: z.string().min(1, 'Description is required'),
  unit: z.string().default('NOS'),
  hsnCode: z.string().default('8483'),
  reorderLevel: z.coerce.number().nonnegative().default(10),
  storeLocation: z.string().default('A1-RACK-1'),
  isFinishedGoods: z.boolean().default(true),
  saleRate: z.coerce.number().nonnegative().default(100),
  purchaseRate: z.coerce.number().nonnegative().default(70)
});

export const CustomerMasterSchema = z.object({
  code: z.string().min(1, 'Customer code is required'),
  name: z.string().min(1, 'Customer name is required'),
  legalName: z.string().optional().default(''),
  customerType: z.string().optional().default('OEM'),
  gstin: z.string().optional().default(''),
  pan: z.string().optional().default(''),
  address: z.string().optional().default(''),
  shippingAddress: z.string().optional().default(''),
  city: z.string().optional().default(''),
  state: z.string().optional().default(''),
  stateCode: z.string().optional().default('27'),
  pin: z.string().optional().default(''),
  email: z.string().optional().default(''),
  contact: z.string().optional().default(''),
  contactPerson: z.string().optional().default(''),
  creditDays: z.coerce.number().nonnegative().optional().default(30),
  paymentTerms: z.string().optional().default('Net 30'),
  creditLimit: z.coerce.number().nonnegative().optional().default(1000000),
  salesperson: z.string().optional().default(''),
  status: z.string().optional().default('Active'),
  notes: z.string().optional().default('')
});

export const VendorMasterSchema = z.object({
  code: z.string().min(1, 'Vendor code is required'),
  name: z.string().min(1, 'Vendor name is required'),
  legalName: z.string().optional().default(''),
  vendorType: z.string().optional().default('Supplier'),
  vendorCategory: z.string().optional().default('Raw Material'),
  gstin: z.string().optional().default(''),
  pan: z.string().optional().default(''),
  address: z.string().optional().default(''),
  city: z.string().optional().default(''),
  state: z.string().optional().default(''),
  stateCode: z.string().optional().default('27'),
  pin: z.string().optional().default(''),
  email: z.string().optional().default(''),
  contact: z.string().optional().default(''),
  contactPerson: z.string().optional().default(''),
  paymentTerms: z.string().optional().default('Net 30'),
  creditDays: z.coerce.number().nonnegative().optional().default(30),
  creditLimit: z.coerce.number().nonnegative().optional().default(500000),
  bankAccountName: z.string().optional().default(''),
  bankAccountNumber: z.string().optional().default(''),
  ifsc: z.string().optional().default(''),
  status: z.string().optional().default('Active'),
  notes: z.string().optional().default('')
});

export const MachineMasterSchema = z.object({
  code: z.string().min(1, 'Machine code is required'),
  name: z.string().min(1, 'Machine name is required'),
  type: z.string().min(1, 'Machine type is required'),
  status: z.string().optional().default('RUNNING'),
  hourlyCost: z.coerce.number().nonnegative().default(1000),
  active: z.boolean().optional().default(true)
});
