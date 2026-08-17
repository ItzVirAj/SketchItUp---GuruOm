import { z } from 'zod';

// ============================================================================
// Indian States & Union Territories (with 2-digit GST State Codes)
// ============================================================================
export interface IndianState {
  code: string;
  name: string;
}

export const INDIAN_STATES: IndianState[] = [
  { code: '01', name: 'Jammu and Kashmir' },
  { code: '02', name: 'Himachal Pradesh' },
  { code: '03', name: 'Punjab' },
  { code: '04', name: 'Chandigarh' },
  { code: '05', name: 'Uttarakhand' },
  { code: '06', name: 'Haryana' },
  { code: '07', name: 'Delhi' },
  { code: '08', name: 'Rajasthan' },
  { code: '09', name: 'Uttar Pradesh' },
  { code: '10', name: 'Bihar' },
  { code: '11', name: 'Sikkim' },
  { code: '12', name: 'Arunachal Pradesh' },
  { code: '13', name: 'Nagaland' },
  { code: '14', name: 'Manipur' },
  { code: '15', name: 'Mizoram' },
  { code: '16', name: 'Tripura' },
  { code: '17', name: 'Meghalaya' },
  { code: '18', name: 'Assam' },
  { code: '19', name: 'West Bengal' },
  { code: '20', name: 'Jharkhand' },
  { code: '21', name: 'Odisha' },
  { code: '22', name: 'Chhattisgarh' },
  { code: '23', name: 'Madhya Pradesh' },
  { code: '24', name: 'Gujarat' },
  { code: '25', name: 'Daman and Diu' },
  { code: '26', name: 'Dadra and Nagar Haveli' },
  { code: '27', name: 'Maharashtra' },
  { code: '28', name: 'Andhra Pradesh (Old)' },
  { code: '29', name: 'Karnataka' },
  { code: '30', name: 'Goa' },
  { code: '31', name: 'Lakshadweep' },
  { code: '32', name: 'Kerala' },
  { code: '33', name: 'Tamil Nadu' },
  { code: '34', name: 'Puducherry' },
  { code: '35', name: 'Andaman and Nicobar Islands' },
  { code: '36', name: 'Telangana' },
  { code: '37', name: 'Andhra Pradesh (New)' },
  { code: '38', name: 'Ladakh' },
  { code: '97', name: 'Other Territory / Special Zone' }
];

// Helper to lookup state code from state name
export function getStateCodeByName(stateName: string): string {
  if (!stateName) return '27';
  const found = INDIAN_STATES.find(s => s.name.toLowerCase() === stateName.toLowerCase().trim());
  return found ? found.code : '27';
}

// ============================================================================
// Core Master Regex & Rule Patterns
// ============================================================================
export const INDIAN_MOBILE_REGEX = /^[6-9]\d{9}$/;
export const GSTIN_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/i;
export const PAN_REGEX = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/i;
export const PINCODE_REGEX = /^\d{6}$/;
export const HSN_CODE_REGEX = /^\d{4,8}$/;
export const IFSC_REGEX = /^[A-Z]{4}0[A-Z0-9]{6}$/i;
export const GST_EXEMPT_VALUE = 'N/A — GST-exempt';

export function isGstExempt(gstin?: string | null): boolean {
  if (!gstin) return false;
  const clean = gstin.trim().toLowerCase();
  return clean === 'n/a — gst-exempt' || clean === 'n/a - gst-exempt' || clean === 'n/a' || clean.includes('exempt');
}

// ============================================================================
// Dropdown Option Constants
// ============================================================================
export const CUSTOMER_TYPES = [
  'Dealer',
  'Distributor',
  'OEM',
  'Retailer',
  'Corporate',
  'Export',
  'Other'
] as const;

export const VENDOR_TYPES = [
  'Supplier',
  'Transporter',
  'Subcontractor / Job Worker',
  'ServiceProvider',
  'EquipmentVendor',
  'ProfessionalService',
  'ManpowerProvider',
  'Other'
] as const;

export const VENDOR_CATEGORIES = [
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
] as const;

export const ITEM_TYPES = [
  'Raw Material',
  'Semi-Finished',
  'Finished Good',
  'Consumable',
  'Bought-Out',
  'Other'
] as const;

export const ITEM_UOMS = [
  'Nos',
  'Kg',
  'Meter',
  'Litre',
  'Set',
  'Box'
] as const;

export const GST_RATES = [0, 5, 12, 18, 28] as const;

export const PAYMENT_TERMS = [
  'Advance',
  'Net 15',
  'Net 30',
  'Net 45',
  'Net 60',
  'Other'
] as const;

export const MACHINE_TYPES = [
  'Cutting',
  'Welding',
  'CNC Turning',
  'CNC Machining',
  'Conventional Machining',
  'Grinding',
  'Inspection-CMM',
  'Other'
] as const;

export const MACHINE_SHIFTS = [
  'General-Day',
  'Shift A',
  'Shift B',
  'Shift C'
] as const;

export const MACHINE_STATUSES = [
  'Active',
  'Under Maintenance',
  'Idle',
  'Decommissioned'
] as const;

export const USER_ROLES = [
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
] as const;

export const USER_ACCESS_LEVELS = [
  'Full Access',
  'Edit',
  'View Only'
] as const;

export const ACCESS_LEVELS = USER_ACCESS_LEVELS;

export const SUBCONTRACTOR_PROCESS_TYPES = [
  'Plating / Anodizing / Zinc Coating',
  'Heat Treatment / Hardening / Nitriding',
  'Powder Coating / Industrial Painting',
  'Precision Grinding / Lapping',
  'Wire EDM / Spark Erosion',
  'Laser Cutting / CNC Bending',
  'Boring / Heavy Machining',
  'Other Specialized Process'
] as const;

export const SYSTEM_MODULES: { id: string; label: string; description: string; category: string }[] = [
  { id: 'command-centre', label: 'Command Centre', description: 'Executive KPIs, factory velocity & real-time telemetry', category: 'Executive' },
  { id: 'orders', label: 'Customer Orders', description: 'Order intake, line items, PO tracking & milestones', category: 'Sales' },
  { id: 'invoices', label: 'Sales Invoices', description: 'GST invoicing, payment tracking & debtor ageing', category: 'Sales' },
  { id: 'purchasing', label: 'Purchase Orders', description: 'Requisitions, supplier POs & procurement approvals', category: 'Procurement' },
  { id: 'grn', label: 'Goods Receipt Note (GRN)', description: 'Gate-in, raw material weight checks & GRN tracking', category: 'Procurement' },
  { id: 'payables', label: 'Vendor Bills & Payables', description: '3-way PO match, vendor ledger & payment cycles', category: 'Procurement' },
  { id: 'inventory', label: 'Live Inventory & Ledger', description: 'Stock on-hand, reorder thresholds & FIFO movements', category: 'Operations' },
  { id: 'production', label: 'Shop Floor & Job Cards', description: 'Route cards, machine scheduling & daily logs', category: 'Operations' },
  { id: 'finished-goods', label: 'Finished Goods Yard', description: 'FG inspection batches, carton packaging & FG storage', category: 'Operations' },
  { id: 'plating-outwork', label: 'Outwork / Job Work', description: 'Gate-out challans, vendor turn-around & return inspection', category: 'Operations' },
  { id: 'qc', label: 'Quality Control (QC)', description: 'Stage-wise dimensional inspection & rejection logs', category: 'Quality' },
  { id: 'pdi', label: 'Pre-Dispatch Inspection (PDI)', description: 'Final customer lot verification & test certificates', category: 'Quality' },
  { id: 'dispatch', label: 'Dispatch & Logistics', description: 'Delivery challans, e-Way bills & transport gate-out', category: 'Logistics' },
  { id: 'bom', label: 'Bill of Materials (BOM)', description: 'Multi-level engineering recipes & unit material costs', category: 'Engineering' },
  { id: 'masters', label: 'Master Data Hub', description: 'Customers, Vendors, Items, Machines master management', category: 'Administration' },
  { id: 'users-audit', label: 'Users & Audit Vault', description: 'Staff credentials, RBAC matrix & immutable audit logs', category: 'Administration' },
  { id: 'approvals', label: 'Approval Queue', description: 'Multi-level authorization for high-value orders & POs', category: 'Governance' },
  { id: 'reports', label: 'Intelligence Reports', description: 'OEE, gross margins, scrap variance & financial summaries', category: 'Governance' },
  { id: 'company-profile', label: 'Company Profile', description: 'Statutory GSTIN, PAN, bank accounts & factory plant details', category: 'Administration' }
];

export const ALL_MODULES = SYSTEM_MODULES.map(m => ({
  id: m.id,
  name: m.label,
  description: m.description,
  category: m.category
}));

// Default modules access mapping by User Role
export const ROLE_DEFAULT_MODULES: Record<string, string[]> = {
  'Admin/Owner': SYSTEM_MODULES.map(m => m.id),
  'Sales Executive': ['command-centre', 'orders', 'invoices', 'masters', 'reports'],
  'Purchase Executive': ['command-centre', 'purchasing', 'grn', 'payables', 'inventory', 'masters', 'plating-outwork'],
  'Production Supervisor': ['command-centre', 'production', 'finished-goods', 'plating-outwork', 'qc', 'bom', 'masters'],
  'Store/Inventory Executive': ['command-centre', 'inventory', 'grn', 'dispatch', 'finished-goods', 'masters'],
  'Accounts Executive': ['command-centre', 'invoices', 'payables', 'reports', 'approvals', 'masters'],
  'Machine Operator': ['production'],
  'Quality Inspector': ['qc', 'pdi', 'finished-goods', 'plating-outwork'],
  'Dispatch Executive': ['dispatch', 'finished-goods', 'orders'],
  'Management/Viewer': ['command-centre', 'orders', 'inventory', 'production', 'reports', 'users-audit'],
  'Other': ['command-centre']
};

// ============================================================================
// Auto-Code ID Prefix Helpers
// ============================================================================
export function getItemPrefix(itemType: string): string {
  switch (itemType) {
    case 'Raw Material':
      return 'RM';
    case 'Finished Good':
      return 'FG';
    case 'Semi-Finished':
      return 'SF';
    case 'Consumable':
      return 'CO';
    case 'Bought-Out':
      return 'BO';
    default:
      return 'ITM';
  }
}

export function generateNextCode(existingCodes: string[], prefix: string): string {
  const cleanPrefix = prefix.endsWith('-') ? prefix : `${prefix}-`;
  let maxSeq = 0;
  
  for (const c of existingCodes) {
    if (c && c.startsWith(cleanPrefix)) {
      const numPart = parseInt(c.slice(cleanPrefix.length), 10);
      if (!isNaN(numPart) && numPart > maxSeq) {
        maxSeq = numPart;
      }
    }
  }
  
  const nextSeq = maxSeq + 1;
  return `${cleanPrefix}${String(nextSeq).padStart(4, '0')}`;
}

// Masking bank account for secure UI display
export function maskBankAccount(accountNo?: string | null): string {
  if (!accountNo) return '•••• ••••';
  const trimmed = accountNo.trim();
  if (trimmed.length <= 4) return trimmed;
  const lastFour = trimmed.slice(-4);
  return `•••• •••• •••• ${lastFour}`;
}
