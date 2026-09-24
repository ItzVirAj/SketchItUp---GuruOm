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
  ListTodo,
  CalendarOff,
  Fingerprint,
  Award,
  Megaphone,
  Settings,
  FlaskConical,
  CalendarClock,
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
  path: string;
}

export interface NavSectionConfig {
  id: string;
  label: string;
  icon: LucideIcon;
  path: string;
  defaultSubmodulePath: string;
  items: NavItemConfig[];
}

export const NAVIGATION_SECTIONS: NavSectionConfig[] = [
  {
    id: 'operations-reports',
    label: 'Operations & Reports',
    icon: Layers,
    path: '/operations',
    defaultSubmodulePath: '/operations/orders',
    items: [
      { id: 'orders', label: 'Orders', shortLabel: 'Orders', icon: ShoppingBag, description: 'Customer POs & Sales Orders', path: '/operations/orders' },
      { id: 'inventory', label: 'Inventory', shortLabel: 'Stock', icon: Box, description: 'Raw Material & Stock On Hand', path: '/operations/inventory' },
      { id: 'production', label: 'Production', shortLabel: 'Shopfloor', icon: Activity, description: 'Job Cards & Machine Allocation', path: '/operations/production' },
      { id: 'finished-goods', label: 'Finished Goods', shortLabel: 'FG', icon: Boxes, description: 'Ready Stock & Warehouse', path: '/operations/finished-goods' },
      { id: 'plating-outwork', label: 'Plating / Outwork', shortLabel: 'Outwork', icon: Wrench, description: 'Vendor Processing & Subcontracting', path: '/operations/plating-outwork' },
      { id: 'reports', label: 'Reports', shortLabel: 'Reports', icon: FileText, description: 'Operational Insights & Analytics', path: '/operations/reports' },
    ]
  },
  {
    id: 'quality-dispatch',
    label: 'Quality & Dispatch',
    icon: ShieldCheck,
    path: '/quality-dispatch',
    defaultSubmodulePath: '/quality-dispatch/qc-inspection',
    items: [
      { id: 'qc', label: 'QC Inspection', shortLabel: 'QC', icon: ShieldCheck, description: 'Stage & In-Process Inspection', path: '/quality-dispatch/qc-inspection' },
      { id: 'pdi', label: 'PDI Inspection', shortLabel: 'PDI', icon: ClipboardCheck, description: 'Pre-Dispatch Final Inspection', path: '/quality-dispatch/pdi-inspection' },
      { id: 'dispatch', label: 'Dispatch & Logistics', shortLabel: 'Dispatch', icon: Truck, description: 'Delivery Challans & Shipments', path: '/quality-dispatch/dispatch-logistics' },
    ]
  },
  {
    id: 'finance',
    label: 'Finance & Accounts',
    icon: CircleDollarSign,
    path: '/finance',
    defaultSubmodulePath: '/finance/invoices-payments',
    items: [
      { id: 'invoices', label: 'Invoices & Payments', shortLabel: 'Invoices', icon: Receipt, description: 'Customer Billing & Receivables', path: '/finance/invoices-payments' },
      { id: 'payables', label: 'Vendor Payables', shortLabel: 'Payables', icon: DollarSign, description: 'Vendor Invoices & Disbursements', path: '/finance/vendor-payables' },
      { id: 'approvals', label: 'Management Approvals', shortLabel: 'Approvals', icon: CheckSquare, description: 'Pending Authorizations & Queue', badgeKey: 'approvals', path: '/finance/management-approvals' },
    ]
  },
  {
    id: 'admin',
    label: 'Admin & Systems',
    icon: Settings,
    path: '/admin',
    defaultSubmodulePath: '/admin/master-catalogs',
    items: [
      { id: 'masters', label: 'Master Catalogs', shortLabel: 'Masters', icon: Database, description: 'Items, Customers, Vendors & Machines', path: '/admin/master-catalogs' },
      { id: 'users-audit', label: 'Users & Audit Logs', shortLabel: 'Users', icon: Users, description: 'Role Permissions & Activity Logs', path: '/admin/users-audit-logs' },
      { id: 'company-profile', label: 'Company Profile', shortLabel: 'Company', icon: Building2, description: 'GSTIN, Bank Details & Factory Address', path: '/admin/company-profile' },
    ]
  },
  {
    id: 'hr',
    label: 'HR',
    icon: Users,
    path: '/hr',
    defaultSubmodulePath: '/hr/tasks',
    items: [
      { id: 'meetings', label: 'Meetings', shortLabel: 'Meetings', icon: CalendarClock, description: 'Team Meeting Schedule & Reminders', badgeKey: 'meetings', path: '/hr/meetings' },
      { id: 'tasks', label: 'Tasks', shortLabel: 'Tasks', icon: ListTodo, description: 'Team Task Assignment & Reminders', badgeKey: 'tasks', path: '/hr/tasks' },
      { id: 'leave-requests', label: 'Leave Requests', shortLabel: 'Leave', icon: CalendarOff, description: 'Time-Off Requests & Approvals', badgeKey: 'leave', path: '/hr/leave' },
      { id: 'attendance', label: 'Attendance', shortLabel: 'Attendance', icon: Fingerprint, description: 'Shift Check-In / Check-Out Log', path: '/hr/attendance' },
      { id: 'employee-certifications', label: 'Employee Certifications', shortLabel: 'Certifications', icon: Award, description: 'Staff Skills & Training Certifications', path: '/hr/employee-certifications' },
      { id: 'announcements', label: 'Announcements', shortLabel: 'Announcements', icon: Megaphone, description: 'Company-Wide Notices', badgeKey: 'announcements', path: '/hr/announcements' },
      { id: 'employee-master', label: 'Employee Management', shortLabel: 'Employees', icon: Users, description: 'Employee Master & Staff Profiles', path: '/hr/employees' },
    ]
  }
];

export const COMMAND_CENTRE_NAV_ITEM: NavItemConfig = {
  id: 'command-centre',
  label: 'Command Centre',
  shortLabel: 'Overview',
  icon: LayoutGrid,
  description: 'Live Executive Control Room',
  path: '/command-center'
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
 * Find parent section for active view.
 */
export function findParentSection(view: ConsoleView): NavSectionConfig | null {
  if (view === 'command-centre') return null;
  if (view === 'order-detail') {
    return NAVIGATION_SECTIONS.find(s => s.id === 'operations-reports') || null;
  }

  for (const section of NAVIGATION_SECTIONS) {
    if (section.items.some(item => item.id === view)) {
      return section;
    }
  }
  return null;
}

/**
 * Find parent section ID for active view.
 */
export function findParentSectionId(view: ConsoleView): string | null {
  const section = findParentSection(view);
  return section ? section.id : null;
}

export interface BreadcrumbInfo {
  moduleLabel: string;
  modulePath?: string;
  submoduleLabel?: string;
  submodulePath?: string;
  detailLabel?: string;
}

/**
 * Get standardized breadcrumb structure for any ConsoleView.
 */
export function getBreadcrumbsForView(view: ConsoleView, orderPo?: string | null): BreadcrumbInfo {
  if (view === 'command-centre') {
    return {
      moduleLabel: 'Workspace',
      modulePath: '/command-center',
      submoduleLabel: 'Command Centre',
      submodulePath: '/command-center'
    };
  }

  if (view === 'order-detail') {
    return {
      moduleLabel: 'Operations & Reports',
      modulePath: '/operations/orders',
      submoduleLabel: 'Orders',
      submodulePath: '/operations/orders',
      detailLabel: orderPo || 'Order Details'
    };
  }

  const section = findParentSection(view);
  if (section) {
    const item = section.items.find(i => i.id === view);
    return {
      moduleLabel: section.label,
      modulePath: section.defaultSubmodulePath,
      submoduleLabel: item ? item.label : getViewTitle(view),
      submodulePath: item ? item.path : section.defaultSubmodulePath
    };
  }

  return {
    moduleLabel: 'Workspace',
    modulePath: '/command-center',
    submoduleLabel: getViewTitle(view)
  };
}

/**
 * Returns the canonical path for any view and optional order ID.
 */
export function getCanonicalPathForView(view: ConsoleView, orderId?: string | null): string {
  switch (view) {
    case 'command-centre':
      return '/command-center';
    case 'orders':
      return '/operations/orders';
    case 'order-detail':
      return `/operations/orders/${orderId || 'ord-1'}`;
    case 'inventory':
      return '/operations/inventory';
    case 'production':
      return '/operations/production';
    case 'finished-goods':
      return '/operations/finished-goods';
    case 'plating-outwork':
      return '/operations/plating-outwork';
    case 'reports':
      return '/operations/reports';
    case 'qc':
      return '/quality-dispatch/qc-inspection';
    case 'pdi':
      return '/quality-dispatch/pdi-inspection';
    case 'dispatch':
      return '/quality-dispatch/dispatch-logistics';
    case 'invoices':
      return '/finance/invoices-payments';
    case 'payables':
      return '/finance/vendor-payables';
    case 'approvals':
      return '/finance/management-approvals';
    case 'masters':
      return '/admin/master-catalogs';
    case 'users-audit':
      return '/admin/users-audit-logs';
    case 'company-profile':
      return '/admin/company-profile';
    case 'meetings':
      return '/hr/meetings';
    case 'tasks':
      return '/hr/tasks';
    case 'leave':
    case 'leave-requests':
      return '/hr/leave';
    case 'attendance':
      return '/hr/attendance';
    case 'certifications':
    case 'employee-certifications':
      return '/hr/employee-certifications';
    case 'announcements':
      return '/hr/announcements';
    case 'employee-master':
      return '/hr/employees';
    case 'workflow-testing':
      return '/workflow-testing';
    case 'bom':
      return '/operations/production?tab=bom';
    case 'route-cards':
      return '/operations/production?tab=route-cards';
    default:
      return '/command-center';
  }
}

