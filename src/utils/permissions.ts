import { UserRole, ConsoleView, SystemUser } from '../types/console';
import { normalizeRole, getRoleModulePermission, hasMinimumAccess, RBAC_ROLE_MATRIX } from './rbacMatrix';

export const ROLE_PERMISSIONS: Record<string, ConsoleView[]> = {
  'Owner': [
    'command-centre',
    'orders',
    'order-detail',
    'inventory',
    'production',
    'finished-goods',
    'plating-outwork',
    'purchasing',
    'grn',
    'reports',
    'qc',
    'pdi',
    'dispatch',
    'approvals',
    'invoices',
    'payables',
    'masters',
    'bom',
    'users-audit',
    'company-profile',
    'workflow-testing'
  ],
  'Sales/Order Desk': [
    'command-centre',
    'orders',
    'order-detail',
    'inventory',
    'finished-goods',
    'reports',
    'dispatch',
    'masters'
  ],
  'Production Planner': [
    'command-centre',
    'orders',
    'order-detail',
    'inventory',
    'production',
    'finished-goods',
    'plating-outwork',
    'reports',
    'qc',
    'pdi',
    'dispatch',
    'bom',
    'masters'
  ],
  'Shop Floor Supervisor': [
    'command-centre',
    'inventory',
    'production',
    'finished-goods',
    'plating-outwork',
    'reports',
    'qc',
    'pdi'
  ],
  'Quality Inspector': [
    'command-centre',
    'inventory',
    'production',
    'finished-goods',
    'plating-outwork',
    'reports',
    'qc',
    'pdi'
  ],
  'Store Keeper': [
    'command-centre',
    'inventory',
    'finished-goods',
    'purchasing',
    'grn',
    'dispatch',
    'reports',
    'masters'
  ],
  'Purchase Manager': [
    'command-centre',
    'orders',
    'inventory',
    'purchasing',
    'grn',
    'payables',
    'reports',
    'approvals',
    'masters'
  ],
  'Dispatch Executive': [
    'command-centre',
    'orders',
    'order-detail',
    'inventory',
    'finished-goods',
    'production',
    'reports',
    'pdi',
    'dispatch',
    'masters'
  ],
  'Accountant': [
    'command-centre',
    'orders',
    'order-detail',
    'inventory',
    'purchasing',
    'grn',
    'reports',
    'approvals',
    'invoices',
    'payables',
    'masters'
  ],
  'HR/Admin': [
    'command-centre',
    'masters',
    'users-audit',
    'company-profile'
  ],
  'Machine Operator': [
    'command-centre',
    'production'
  ],
  'Admin (System)': [
    'command-centre',
    'orders',
    'order-detail',
    'inventory',
    'production',
    'finished-goods',
    'plating-outwork',
    'purchasing',
    'grn',
    'reports',
    'qc',
    'pdi',
    'dispatch',
    'approvals',
    'invoices',
    'payables',
    'masters',
    'bom',
    'users-audit',
    'company-profile',
    'workflow-testing'
  ],

  // Legacy compatibility keys
  'SUPER ADMIN': [
    'command-centre',
    'orders',
    'order-detail',
    'inventory',
    'production',
    'finished-goods',
    'plating-outwork',
    'purchasing',
    'grn',
    'reports',
    'qc',
    'pdi',
    'dispatch',
    'approvals',
    'invoices',
    'payables',
    'masters',
    'bom',
    'users-audit',
    'company-profile',
    'workflow-testing'
  ],
  'OPERATOR': [
    'command-centre',
    'production'
  ],
  'QC_MANAGER': [
    'command-centre',
    'inventory',
    'production',
    'finished-goods',
    'plating-outwork',
    'reports',
    'qc',
    'pdi'
  ],
  'DISPATCH_CLERK': [
    'command-centre',
    'orders',
    'order-detail',
    'inventory',
    'finished-goods',
    'reports',
    'pdi',
    'dispatch',
    'invoices'
  ],
  'FINANCE_MANAGER': [
    'command-centre',
    'orders',
    'order-detail',
    'inventory',
    'reports',
    'approvals',
    'invoices',
    'payables',
    'masters',
    'company-profile'
  ]
};

const VIEW_PERMISSION_KEYS: Partial<Record<ConsoleView, string[]>> = {
  'orders': ['orders:view'],
  'order-detail': ['orders:view'],
  'inventory': ['inventory:view'],
  'production': ['production:view'],
  'bom': ['production:view'],
  'route-cards': ['production:view'],
  'finished-goods': ['inventory:view'],
  'plating-outwork': ['production:view'],
  'reports': ['reports:view', 'orders:view', 'inventory:view', 'production:view', 'finance:view'],
  'qc': ['qc:view'],
  'pdi': ['qc:view'],
  'dispatch': ['dispatch:view'],
  'approvals': ['approvals:view', 'finance:approve_high_value'],
  'invoices': ['finance:view'],
  'payables': ['finance:view'],
  'masters': ['admin:view_users', 'inventory:view'],
  'users-audit': ['admin:view_users', 'system:view_immutable_audit'],
  'company-profile': ['admin:view_users', 'system:manage_permission_overrides'],
  'workflow-testing': ['system:override_all_rules']
};

export function isViewAllowedForRole(role: string, view: ConsoleView): boolean {
  const normRole = normalizeRole(role);
  const allowed = ROLE_PERMISSIONS[normRole] || ROLE_PERMISSIONS[role];
  if (!allowed) return true;
  return allowed.includes(view);
}

export function isViewAllowedForUser(user: Pick<SystemUser, 'role' | 'effectivePermissions'> | null | undefined, view: ConsoleView): boolean {
  if (view === 'command-centre') return true;

  const permissions = user?.effectivePermissions;
  if (Array.isArray(permissions)) {
    if (permissions.includes('*')) return true;
    const required = VIEW_PERMISSION_KEYS[view];
    if (required) return required.some(key => permissions.includes(key));
  }

  return isViewAllowedForRole(String(user?.role || ''), view);
}

export function getRoleColor(role: string): { bg: string; text: string; border: string } {
  const normRole = normalizeRole(role);

  switch (normRole) {
    case 'ServerAdmin':
      return {
        bg: 'bg-violet-50 dark:bg-violet-500/15',
        text: 'text-violet-700 dark:text-violet-300',
        border: 'border-violet-200 dark:border-violet-500/30'
      };
    case 'Owner':
    case 'Admin (System)':
    case 'SUPER ADMIN':
      return {
        bg: 'bg-rose-50 dark:bg-rose-500/10',
        text: 'text-rose-700 dark:text-rose-400',
        border: 'border-rose-200 dark:border-rose-500/30'
      };
    case 'Purchase Manager':
    case 'Accountant':
    case 'FINANCE_MANAGER':
      return {
        bg: 'bg-emerald-50 dark:bg-emerald-500/10',
        text: 'text-emerald-700 dark:text-emerald-400',
        border: 'border-emerald-200 dark:border-emerald-500/30'
      };
    case 'Sales/Order Desk':
      return {
        bg: 'bg-blue-50 dark:bg-blue-500/10',
        text: 'text-blue-700 dark:text-blue-400',
        border: 'border-blue-200 dark:border-blue-500/30'
      };
    case 'Quality Inspector':
    case 'QC_MANAGER':
      return {
        bg: 'bg-cyan-50 dark:bg-cyan-500/10',
        text: 'text-cyan-700 dark:text-cyan-400',
        border: 'border-cyan-200 dark:border-cyan-500/30'
      };
    case 'Dispatch Executive':
    case 'DISPATCH_CLERK':
      return {
        bg: 'bg-teal-50 dark:bg-teal-500/10',
        text: 'text-teal-700 dark:text-teal-400',
        border: 'border-teal-200 dark:border-teal-500/30'
      };
    case 'Production Planner':
    case 'Shop Floor Supervisor':
      return {
        bg: 'bg-amber-50 dark:bg-amber-500/10',
        text: 'text-amber-700 dark:text-amber-400',
        border: 'border-amber-200 dark:border-amber-500/30'
      };
    case 'Store Keeper':
      return {
        bg: 'bg-indigo-50 dark:bg-indigo-500/10',
        text: 'text-indigo-700 dark:text-indigo-400',
        border: 'border-indigo-200 dark:border-indigo-500/30'
      };
    case 'HR/Admin':
      return {
        bg: 'bg-purple-50 dark:bg-purple-500/10',
        text: 'text-purple-700 dark:text-purple-400',
        border: 'border-purple-200 dark:border-purple-500/30'
      };
    case 'Machine Operator':
    case 'OPERATOR':
    default:
      return {
        bg: 'bg-slate-50 dark:bg-slate-800/40',
        text: 'text-slate-700 dark:text-slate-300',
        border: 'border-slate-200 dark:border-slate-700/50'
      };
  }
}


