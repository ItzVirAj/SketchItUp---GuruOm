import { UserRole, ConsoleView } from '../types/console';

export const ROLE_PERMISSIONS: Record<UserRole, ConsoleView[]> = {
  'SUPER ADMIN': [
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
    'approvals',
    'invoices',
    'payables',
    'masters',
    'users-audit',
    'company-profile'
  ],
  'OPERATOR': [
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
    'dispatch'
  ],
  'QC_MANAGER': [
    'command-centre',
    'orders',
    'order-detail',
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
    'finished-goods',
    'reports',
    'approvals',
    'invoices',
    'payables',
    'masters',
    'company-profile'
  ]
};

export function isViewAllowedForRole(role: UserRole, view: ConsoleView): boolean {
  const allowed = ROLE_PERMISSIONS[role];
  if (!allowed) return true;
  return allowed.includes(view);
}

export function getRoleColor(role: UserRole): { bg: string; text: string; border: string } {
  switch (role) {
    case 'SUPER ADMIN':
      return {
        bg: 'bg-rose-50 dark:bg-rose-500/10',
        text: 'text-rose-700 dark:text-rose-400',
        border: 'border-rose-200 dark:border-rose-500/30'
      };
    case 'QC_MANAGER':
      return {
        bg: 'bg-cyan-50 dark:bg-cyan-500/10',
        text: 'text-cyan-700 dark:text-cyan-400',
        border: 'border-cyan-200 dark:border-cyan-500/30'
      };
    case 'OPERATOR':
      return {
        bg: 'bg-indigo-50 dark:bg-indigo-500/10',
        text: 'text-indigo-700 dark:text-indigo-400',
        border: 'border-indigo-200 dark:border-indigo-500/30'
      };
    case 'DISPATCH_CLERK':
      return {
        bg: 'bg-teal-50 dark:bg-teal-500/10',
        text: 'text-teal-700 dark:text-teal-400',
        border: 'border-teal-200 dark:border-teal-500/30'
      };
    case 'FINANCE_MANAGER':
      return {
        bg: 'bg-emerald-50 dark:bg-emerald-500/10',
        text: 'text-emerald-700 dark:text-emerald-400',
        border: 'border-emerald-200 dark:border-emerald-500/30'
      };
  }
}
