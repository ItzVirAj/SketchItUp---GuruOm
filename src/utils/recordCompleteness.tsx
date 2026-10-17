import React from 'react';
import { AlertTriangle } from 'lucide-react';

export type CompletenessEntity = 'customer' | 'vendor' | 'user';

export interface MissingFieldInfo {
  key: string;
  label: string;
}

export function isFieldBlank(val: any): boolean {
  if (val === undefined || val === null) return true;
  const str = String(val).trim();
  return str.length === 0 || str === 'null' || str === 'undefined';
}

/**
 * Shared helper to compute missing fields across Customers, Vendors, and Users.
 * - Customers: contact person, mobile, PAN
 * - Vendors: contact person, mobile, PAN, bank account, IFSC
 * - Users: phone number
 */
export function getMissingFields(entity: CompletenessEntity, record: any): MissingFieldInfo[] {
  if (!record) return [];
  const missing: MissingFieldInfo[] = [];

  if (entity === 'customer') {
    const hasContact = !isFieldBlank(record.contactPerson) || !isFieldBlank(record.contact);
    if (!hasContact) {
      missing.push({ key: 'contactPerson', label: 'Contact Person' });
    }

    const hasMobile = !isFieldBlank(record.mobile) || !isFieldBlank(record.phone);
    if (!hasMobile) {
      missing.push({ key: 'mobile', label: 'Mobile Number' });
    }

    const hasPan = !isFieldBlank(record.pan);
    if (!hasPan) {
      missing.push({ key: 'pan', label: 'PAN' });
    }
  } else if (entity === 'vendor') {
    const hasContact = !isFieldBlank(record.contactPerson) || !isFieldBlank(record.contact);
    if (!hasContact) {
      missing.push({ key: 'contactPerson', label: 'Contact Person' });
    }

    const hasMobile = !isFieldBlank(record.mobile) || !isFieldBlank(record.phone);
    if (!hasMobile) {
      missing.push({ key: 'mobile', label: 'Mobile Number' });
    }

    const hasPan = !isFieldBlank(record.pan);
    if (!hasPan) {
      missing.push({ key: 'pan', label: 'PAN' });
    }

    const hasBank = !isFieldBlank(record.bankAccountNumber) || !isFieldBlank(record.bankAccount);
    if (!hasBank) {
      missing.push({ key: 'bankAccountNumber', label: 'Bank Account' });
    }

    const hasIfsc = !isFieldBlank(record.ifsc);
    if (!hasIfsc) {
      missing.push({ key: 'ifsc', label: 'IFSC Code' });
    }
  } else if (entity === 'user') {
    const hasPhone = !isFieldBlank(record.mobile) || !isFieldBlank(record.phone);
    if (!hasPhone) {
      missing.push({ key: 'phone', label: 'Phone Number' });
    }
  }

  return missing;
}

export function isRecordIncomplete(entity: CompletenessEntity, record: any): boolean {
  return getMissingFields(entity, record).length > 0;
}

export const IncompleteBadge: React.FC<{
  entity: CompletenessEntity;
  record: any;
  className?: string;
}> = ({ entity, record, className = '' }) => {
  const missing = getMissingFields(entity, record);
  if (missing.length === 0) return null;

  const tooltipText = `Missing: ${missing.map(f => f.label).join(', ')}`;

  return (
    <span
      className={`relative group inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold tracking-tight bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 cursor-help transition-all ${className}`}
      title={tooltipText}
    >
      <AlertTriangle className="w-3 h-3 text-amber-500 shrink-0" />
      <span>Incomplete</span>
      {/* Tooltip on hover */}
      <div className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:flex flex-col items-center z-50">
        <div className="whitespace-nowrap rounded-lg bg-slate-900 border border-amber-500/40 px-2.5 py-1 text-[11px] font-sans font-medium text-amber-200 shadow-xl backdrop-blur-md">
          {tooltipText}
        </div>
        <div className="w-2 h-2 -mt-1 rotate-45 bg-slate-900 border-r border-b border-amber-500/40" />
      </div>
    </span>
  );
};
