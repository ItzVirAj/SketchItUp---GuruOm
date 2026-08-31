import React from 'react';
import { 
  LayoutGrid, 
  ShoppingBag, 
  Box, 
  Activity, 
  Boxes, 
  Wrench, 
  FileText, 
  ShieldCheck, 
  ClipboardCheck, 
  Truck, 
  CheckSquare, 
  Receipt, 
  DollarSign, 
  Database, 
  Users, 
  Building2, 
  Layers,
  CircleDollarSign,
  Settings,
  FlaskConical,
  LucideIcon
} from 'lucide-react';
import { isViewAllowedForRole, isViewAllowedForUser } from './permissions';
import { ConsoleView, UserRole } from '../types/console';

export interface NavItemConfig {
  id: ConsoleView;
  label: string;
  shortLabel?: string;
  icon: LucideIcon;
  description?: string;
  badgeKey?: string;
}

export interface NavSectionConfig {
  id: string;
  label: string;
  icon: LucideIcon;
  items: NavItemConfig[];
}

export const NAVIGATION_SECTIONS: NavSectionConfig[] = [
  {
    id: 'operations-reports',
    label: 'Operations & Reports',
    icon: Layers,
    items: [
      { id: 'orders', label: 'Orders', shortLabel: 'Orders', icon: ShoppingBag, description: 'Customer POs & Sales Orders' },
      { id: 'inventory', label: 'Inventory', shortLabel: 'Stock', icon: Box, description: 'Raw Material & Stock On Hand' },
      { id: 'production', label: 'Production', shortLabel: 'Shopfloor', icon: Activity, description: 'Job Cards & Machine Allocation' },
      { id: 'finished-goods', label: 'Finished Goods', shortLabel: 'FG', icon: Boxes, description: 'Ready Stock & Warehouse' },
      { id: 'plating-outwork', label: 'Plating / Outwork', shortLabel: 'Outwork', icon: Wrench, description: 'Vendor Processing & Subcontracting' },
      { id: 'reports', label: 'Reports', shortLabel: 'Reports', icon: FileText, description: 'Operational Insights & Analytics' },
    ]
  },
  {
    id: 'quality-dispatch',
    label: 'Quality & Dispatch',
    icon: ShieldCheck,
    items: [
      { id: 'qc', label: 'QC Inspection', shortLabel: 'QC', icon: ShieldCheck, description: 'Stage & In-Process Inspection' },
      { id: 'pdi', label: 'PDI Inspection', shortLabel: 'PDI', icon: ClipboardCheck, description: 'Pre-Dispatch Final Inspection' },
      { id: 'dispatch', label: 'Dispatch & Logistics', shortLabel: 'Dispatch', icon: Truck, description: 'Delivery Challans & Shipments' },
      { id: 'approvals', label: 'Management Approvals', shortLabel: 'Approvals', icon: CheckSquare, description: 'Pending Authorizations & Queue', badgeKey: 'approvals' },
    ]
  },
  {
    id: 'finance',
    label: 'Finance & Accounts',
    icon: CircleDollarSign,
    items: [
      { id: 'invoices', label: 'Invoices & Payments', shortLabel: 'Invoices', icon: Receipt, description: 'Customer Billing & Receivables' },
      { id: 'payables', label: 'Vendor Payables', shortLabel: 'Payables', icon: DollarSign, description: 'Vendor Invoices & Disbursements' },
    ]
  },
  {
    id: 'admin',
    label: 'Admin & Systems',
    icon: Settings,
    items: [
      { id: 'masters', label: 'Master Catalogs', shortLabel: 'Masters', icon: Database, description: 'Items, Customers, Vendors & Machines' },
      { id: 'users-audit', label: 'Users & Audit Logs', shortLabel: 'Users', icon: Users, description: 'Role Permissions & Activity Logs' },
      { id: 'company-profile', label: 'Company Profile', shortLabel: 'Company', icon: Building2, description: 'GSTIN, Bank Details & Factory Address' },
      { id: 'workflow-testing', label: 'Workflow Testing', shortLabel: 'Testing', icon: FlaskConical, description: 'End-to-End Simulation & Verification' },
    ]
  }
];

export const COMMAND_CENTRE_NAV_ITEM: NavItemConfig = {
  id: 'command-centre',
  label: 'Command Centre',
  shortLabel: 'Overview',
  icon: LayoutGrid,
  description: 'Live Executive Control Room'
};

/**
 * Filter sections and their nested items according to user role RBAC.
 * When a user-like object is passed it gates through the resolved
 * `effectivePermissions` (falling back to the role), otherwise it gates by the
 * role string directly.
 */
type NavigationContext =
  | UserRole
  | string
  | { role: UserRole | string; effectivePermissions?: string[] }
  | null
  | undefined;

export function getFilteredNavigation(context: NavigationContext): NavSectionConfig[] {
  return NAVIGATION_SECTIONS.map(section => {
    const allowedItems = section.items.filter(item => 
      context != null && typeof context === 'object'
        ? isViewAllowedForUser(context, item.id)
        : isViewAllowedForRole(String(context ?? ''), item.id)
    );
    return {
      ...section,
      items: allowedItems
    };
  }).filter(section => section.items.length > 0);
}

/**
 * Get human-readable title for any ConsoleView ID.
 */
export function getViewTitle(view: ConsoleView): string {
  if (view === 'command-centre') return 'Command Centre';
  if (view === 'order-detail') return 'Order Details';

  for (const section of NAVIGATION_SECTIONS) {
    const found = section.items.find(item => item.id === view);
    if (found) return found.label;
  }
  return 'Dashboard';
}

/**
 * Find parent section ID for active view.
 */
export function findParentSectionId(view: ConsoleView): string | null {
  if (view === 'command-centre') return null;
  if (view === 'order-detail') return 'operations-reports';
  
  for (const section of NAVIGATION_SECTIONS) {
    if (section.items.some(item => item.id === view)) {
      return section.id;
    }
  }
  return null;
}

