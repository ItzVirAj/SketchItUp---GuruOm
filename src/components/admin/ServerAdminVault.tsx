// ============================================================================
// File: src/components/admin/ServerAdminVault.tsx
// Description: Dedicated ServerAdmin (Platform Maker / Dev Team) Governance Vault.
//              Separate top-level route (/admin) with client-side gating on
//              ServerAdmin role, strict re-authentication on destructive actions,
//              sub-tier role assignment, per-user permission overrides,
//              one-time password resets, and append-only audit log inspection.
// ============================================================================

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { apiClient } from '../../lib/apiClient';
import { normalizeRole, RBAC_ROLE_MATRIX, CTA_PERMISSION_TABLE, CtaId } from '../../utils/rbacMatrix';
import {
  Shield,
  ShieldAlert,
  Users,
  Key,
  FileText,
  Lock,
  RefreshCw,
  Search,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ArrowRight,
  LogOut,
  ChevronRight,
  ChevronDown,
  Sliders,
  Clock,
  Terminal,
  ExternalLink,
  Copy,
  Check,
  X,
  Eye,
  EyeOff,
  ShoppingBag,
  Box,
  Activity,
  ShoppingCart,
  ShieldCheck,
  Truck,
  CircleDollarSign,
  Database,
  Layers,
  Sparkles,
  RotateCcw
} from 'lucide-react';
import { Link } from 'react-router-dom';

// Roles allowed to be assigned in UI (ServerAdmin is strictly excluded)
const ASSIGNABLE_ROLES = [
  'Owner',
  'Admin (System)',
  'Purchase Manager',
  'Accountant',
  'Production Planner',
  'Quality Auditor',
  'Quality Inspector',
  'Store Keeper',
  'Dispatch Executive',
  'Sales/Order Desk',
  'Subcontractor Coordinator',
  'Shop Floor Supervisor',
  'HR/Admin',
  'Machine Operator',
  'Client'
];

interface SubsectionCapability {
  key: string;
  name: string;
  description: string;
  isView?: boolean;
  isEdit?: boolean;
  isApprove?: boolean;
}

interface SectionGroup {
  id: string;
  name: string;
  icon: any;
  color: string;
  description: string;
  subsections: SubsectionCapability[];
}

const SECTION_GROUPS: SectionGroup[] = [
  {
    id: 'orders',
    name: 'Commercial & Orders',
    icon: ShoppingBag,
    color: 'text-sky-400 bg-sky-500/10 border-sky-500/30',
    description: 'Customer purchase orders, commercial pricing & fulfillment release',
    subsections: [
      { key: 'orders:view', name: 'Order Directory & Inquiry', description: 'Browse and inspect customer purchase orders and line-items', isView: true },
      { key: 'orders:create_draft', name: 'Order Draft Creation', description: 'Create and ingest client PO orders into draft queue', isEdit: true },
      { key: 'orders:confirm', name: 'Order Confirmation & Job Release', description: 'Authorize commercial drafts and release to shopfloor production', isApprove: true },
      { key: 'orders:edit_commercials', name: 'Commercial & Price Adjustments', description: 'Modify unit rates, customer discounts, and credit terms', isEdit: true },
      { key: 'orders:cancel', name: 'Order Cancellation', description: 'Cancel active orders and release reserved inventory balances', isApprove: true }
    ]
  },
  {
    id: 'inventory',
    name: 'Inventory & Stores',
    icon: Box,
    color: 'text-amber-400 bg-amber-500/10 border-amber-500/30',
    description: 'Raw materials, stock on hand, bin locations & GRN receipt',
    subsections: [
      { key: 'inventory:view', name: 'Stock Ledger & On-Hand Balance', description: 'View real-time item stock, bin allocation, and ledger history', isView: true },
      { key: 'inventory:create_grn', name: 'Goods Receipt Note (GRN)', description: 'Receive vendor consignments and update physical stock', isEdit: true },
      { key: 'inventory:adjust_stock', name: 'Physical Stock Adjustments', description: 'Perform manual reconciliation, scrap write-offs, and transfers', isApprove: true }
    ]
  },
  {
    id: 'production',
    name: 'Production & Shopfloor',
    icon: Activity,
    color: 'text-violet-400 bg-violet-500/10 border-violet-500/30',
    description: 'Job cards, route cards, machine allocation & stage output',
    subsections: [
      { key: 'production:view', name: 'Job Cards & Machine Queue', description: 'View active route cards, machine schedules, and stage progress', isView: true },
      { key: 'production:create_job_card', name: 'Job Card Generation', description: 'Create production batches and allocate raw materials', isEdit: true },
      { key: 'production:log_output', name: 'Stage Output & Scrap Logging', description: 'Log hourly machine production output and cycle times', isEdit: true }
    ]
  },
  {
    id: 'procurement',
    name: 'Procurement & Purchasing',
    icon: ShoppingCart,
    color: 'text-teal-400 bg-teal-500/10 border-teal-500/30',
    description: 'Purchase requisitions, vendor POs, RFQs & approvals',
    subsections: [
      { key: 'procurement:view', name: 'Purchase Order Tracking', description: 'View open purchase requisitions and supplier PO status', isView: true },
      { key: 'procurement:create_po', name: 'Purchase Order Generation', description: 'Draft and dispatch formal purchase orders to approved vendors', isEdit: true },
      { key: 'procurement:approve_high_value', name: 'High-Value PO Sign-off', description: 'Approve vendor POs exceeding standard monetary thresholds', isApprove: true }
    ]
  },
  {
    id: 'qc',
    name: 'Quality Assurance & PDI',
    icon: ShieldCheck,
    color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
    description: 'In-process QC inspections, quality holds / NCR & Pre-Delivery sign-offs',
    subsections: [
      { key: 'qc:view', name: 'QC & PDI Audit Ledger', description: 'View inspection parameters, test reports, and dimensional audits', isView: true },
      { key: 'qc:log_inspection', name: 'Inspection Logging & Reports', description: 'Record measurement values, CMM inspection, and pass/fail verdicts', isEdit: true },
      { key: 'qc:place_hold', name: 'Quality Hold & NCR Flagging', description: 'Place shopfloor lot holds or flag non-conformance discrepancies', isApprove: true },
      { key: 'qc:release_hold', name: 'Hold Clearance & Authorization', description: 'Clear quality holds and authorize batch rework or release', isApprove: true }
    ]
  },
  {
    id: 'dispatch',
    name: 'Dispatch & Logistics',
    icon: Truck,
    color: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/30',
    description: 'Outbound delivery challans, gate passes & customer shipments',
    subsections: [
      { key: 'dispatch:view', name: 'Dispatch Queue & Shipments', description: 'Track pending deliveries, outbound consignments, and transport logs', isView: true },
      { key: 'dispatch:create_challan', name: 'Delivery Challan Generation', description: 'Create statutory delivery challans with e-way bill references', isEdit: true },
      { key: 'dispatch:confirm_delivery', name: 'Proof of Delivery (POD)', description: 'Record signed client delivery receipts and close shipment runs', isApprove: true }
    ]
  },
  {
    id: 'finance',
    name: 'Finance & Invoicing',
    icon: CircleDollarSign,
    color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
    description: 'GST e-invoices, client billing, vendor bills & payment ledger',
    subsections: [
      { key: 'finance:view', name: 'Billing & Ledger Inquiry', description: 'View sales invoices, customer receipts, and vendor payables', isView: true },
      { key: 'finance:generate_invoice', name: 'Sales Invoice Generation', description: 'Generate GST tax invoices and debit/credit notes for shipments', isEdit: true },
      { key: 'finance:record_payment', name: 'Payment Receipts & Remittances', description: 'Log client bank receipts and vendor disbursement entries', isEdit: true },
      { key: 'finance:approve_high_value', name: 'Disbursement Authorization', description: 'Approve vendor payments exceeding standard finance limits', isApprove: true }
    ]
  },
  {
    id: 'admin',
    name: 'Administration & Masters',
    icon: Database,
    color: 'text-purple-400 bg-purple-500/10 border-purple-500/30',
    description: 'Item, customer, vendor masters, user accounts & audit inspection',
    subsections: [
      { key: 'admin:view_users', name: 'User Directory & Roster', description: 'View employee accounts and operational role assignments', isView: true },
      { key: 'admin:create_users', name: 'Account Provisioning', description: 'Provision new team members with default role assignment', isEdit: true },
      { key: 'admin:assign_roles', name: 'Role Assignment Control', description: 'Modify sub-tier roles adhering to hierarchy constraints', isApprove: true },
      { key: 'admin:manage_masters', name: 'Master Catalogs Management', description: 'Manage item specs, machines, approved vendors, and client profiles', isEdit: true },
      { key: 'system:view_immutable_audit', name: 'Immutable Audit Vault', description: 'Inspect full append-only system and security event journals', isView: true }
    ]
  },
  {
    id: 'bom',
    name: 'BOM & Engineering',
    icon: Layers,
    color: 'text-amber-400 bg-amber-500/10 border-amber-500/30',
    description: 'Bill of materials, routing sequences & engineering specifications',
    subsections: [
      { key: 'bom:view', name: 'View BOM', description: 'Inspect engineering bill of materials and component trees', isView: true },
      { key: 'bom:create_edit', name: 'Create/Edit BOM', description: 'Create and revise item BOM structures and routing steps', isEdit: true }
    ]
  },
  {
    id: 'transport',
    name: 'Transport & Logistics',
    icon: Truck,
    color: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/30',
    description: 'Vehicle tracking, freight partners & transport movement',
    subsections: [
      { key: 'transport:view', name: 'View Transport', description: 'Inspect vehicle dispatches, trip logs, and carrier records', isView: true },
      { key: 'transport:manage', name: 'Manage Transport', description: 'Assign freight carriers, create vehicle runs, and update logs', isEdit: true }
    ]
  },
  {
    id: 'subcontracting',
    name: 'Subcontracting',
    icon: RefreshCw,
    color: 'text-orange-400 bg-orange-500/10 border-orange-500/30',
    description: 'External vendor processing, job allocation & material movement',
    subsections: [
      { key: 'subcontracting:view', name: 'View Subcontract Jobs', description: 'View external subcontract challans and vendor processing status', isView: true },
      { key: 'subcontracting:issue_receive', name: 'Issue & Receive Material', description: 'Issue raw stock to job-workers and receive processed items', isEdit: true }
    ]
  },
  {
    id: 'reports',
    name: 'Reports & Analytics',
    icon: FileText,
    color: 'text-blue-400 bg-blue-500/10 border-blue-500/30',
    description: 'Operational insights, audit summaries & metric exports',
    subsections: [
      { key: 'reports:view', name: 'View Standard Reports', description: 'Access operational dashboards and performance analytics', isView: true },
      { key: 'reports:export', name: 'Export Reports', description: 'Export tabular reports to CSV, Excel, and PDF formats', isEdit: true }
    ]
  },
  {
    id: 'settings',
    name: 'System Settings',
    icon: Sliders,
    color: 'text-slate-400 bg-slate-500/10 border-slate-500/30',
    description: 'System configurations, tenant rules & governance parameters',
    subsections: [
      { key: 'settings:view', name: 'View Settings', description: 'Inspect system settings and environment configuration', isView: true },
      { key: 'settings:edit_config', name: 'Edit System Configuration', description: 'Update system rules, company profiles, and preferences', isApprove: true }
    ]
  },
  {
    id: 'approvals',
    name: 'Approval Workflows',
    icon: CheckCircle2,
    color: 'text-rose-400 bg-rose-500/10 border-rose-500/30',
    description: 'Multi-stage authorization requests & hold resolutions',
    subsections: [
      { key: 'approvals:view', name: 'View Approvals Queue', description: 'Inspect pending approval requests across departments', isView: true },
      { key: 'approvals:action', name: 'Action Approvals', description: 'Approve or reject commercial and operational escalations', isApprove: true }
    ]
  }
];

const DEFAULT_PERMISSIONS: PermissionDefinition[] = SECTION_GROUPS.flatMap(s =>
  s.subsections.map((sub, i) => ({
    id: `p-${s.id}-${i}`,
    key: sub.key,
    category: s.id,
    description: sub.description
  }))
);

interface CtaGroupDefinition {
  name: string;
  icon: any;
  color: string;
  ctaIds: CtaId[];
}

const CTA_GROUPS: CtaGroupDefinition[] = [
  {
    name: 'Commercial & Orders',
    icon: ShoppingBag,
    color: 'text-sky-400 bg-sky-500/10 border-sky-500/30',
    ctaIds: ['CREATE_ORDER_DRAFT', 'CONFIRM_ORDER', 'REQUEST_REVISION', 'RAISE_CHANGE_ORDER']
  },
  {
    name: 'Inventory & Stores',
    icon: Box,
    color: 'text-amber-400 bg-amber-500/10 border-amber-500/30',
    ctaIds: ['VERIFY_MATERIAL_AVAILABILITY', 'RECORD_GRN']
  },
  {
    name: 'Production & Shopfloor',
    icon: Activity,
    color: 'text-violet-400 bg-violet-500/10 border-violet-500/30',
    ctaIds: ['CREATE_JOB_CARD', 'START_MANUFACTURING', 'COMPLETE_STEP', 'MARK_MANUFACTURING_COMPLETE']
  },
  {
    name: 'Procurement & Purchasing',
    icon: ShoppingCart,
    color: 'text-teal-400 bg-teal-500/10 border-teal-500/30',
    ctaIds: ['CREATE_PURCHASE_ORDER']
  },
  {
    name: 'Subcontracting',
    icon: RefreshCw,
    color: 'text-orange-400 bg-orange-500/10 border-orange-500/30',
    ctaIds: ['ISSUE_TO_SUBCONTRACTOR', 'RECEIVE_FROM_SUBCONTRACTOR']
  },
  {
    name: 'Quality Assurance & PDI',
    icon: ShieldCheck,
    color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
    ctaIds: ['UPLOAD_QC_REPORT', 'UPLOAD_PDI_REPORT', 'MARK_READY_TO_DISPATCH', 'RAISE_NCR_REWORK']
  },
  {
    name: 'Dispatch & Logistics',
    icon: Truck,
    color: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/30',
    ctaIds: ['GENERATE_DELIVERY_CHALLAN', 'MARK_IN_TRANSIT', 'MARK_DELIVERED', 'ORDER_RECEIVED', 'MARK_DELAYED']
  },
  {
    name: 'Finance & Invoicing',
    icon: CircleDollarSign,
    color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
    ctaIds: ['GENERATE_INVOICE', 'RECORD_PAYMENT', 'MARK_ORDER_CLOSED']
  }
];

interface AdminUserRecord {
  id: string;
  email: string;
  full_name: string;
  role: string;
  normalizedRole: string;
  tier: number;
  department: string;
  phone: string;
  status: string;
  is_temporary_password: boolean;
  last_login_at: string | null;
  created_at: string;
  permissionOverrides: Array<{
    permission_key: string;
    effect: 'GRANTED' | 'REVOKED';
    reason?: string;
  }>;
}

interface PermissionDefinition {
  id: string;
  key: string;
  category: string;
  description: string;
}

interface AuditLogEntry {
  id: string;
  actor_id: string;
  actor_email: string;
  actor_role: string;
  action: string;
  target_user_id: string | null;
  target_user_email: string | null;
  before_state: any;
  after_state: any;
  ip: string | null;
  user_agent: string | null;
  created_at: string;
}

interface Props {
  onSignOut: () => Promise<void>;
}

export function ServerAdminVault({ onSignOut }: Props) {
  const { user, profile } = useAuth();
  const currentRole = normalizeRole(profile?.role || user?.role);
  const isServerAdmin = currentRole === 'ServerAdmin';

  const [activeTab, setActiveTab] = useState<'users' | 'permissions' | 'audit'>('users');
  const [users, setUsers] = useState<AdminUserRecord[]>([]);
  const [permissionsCatalog, setPermissionsCatalog] = useState<PermissionDefinition[]>(DEFAULT_PERMISSIONS);
  const [permSearch, setPermSearch] = useState('');
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Search & Filter state
  const [userSearch, setUserSearch] = useState('');
  const [auditSearch, setAuditSearch] = useState('');
  const [auditActionFilter, setAuditActionFilter] = useState('');
  const [auditPage, setAuditPage] = useState(1);
  const [auditTotalPages, setAuditTotalPages] = useState(1);

  // Active Modals
  const [selectedUserForRole, setSelectedUserForRole] = useState<AdminUserRecord | null>(null);
  const [newRoleValue, setNewRoleValue] = useState<string>('');
  const [roleChangeReason, setRoleChangeReason] = useState<string>('');
  const [isRoleModalCurrentStateOpen, setIsRoleModalCurrentStateOpen] = useState(true);

  const [selectedUserForPerms, setSelectedUserForPerms] = useState<AdminUserRecord | null>(null);
  const [pendingOverrides, setPendingOverrides] = useState<Record<string, 'DEFAULT' | 'GRANTED' | 'REVOKED'>>({});
  const [savedOverridesSnapshot, setSavedOverridesSnapshot] = useState<Array<{ permission_key: string; effect: 'GRANTED' | 'REVOKED'; reason?: string }>>([]);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({ orders: true, inventory: true });
  const [overridesModalTab, setOverridesModalTab] = useState<'sections' | 'cta'>('sections');
  const [expandedCtaGroups, setExpandedCtaGroups] = useState<Record<string, boolean>>({});
  const [selectedUserForReset, setSelectedUserForReset] = useState<AdminUserRecord | null>(null);
  const [resetTokenResult, setResetTokenResult] = useState<{ token: string; email: string; expiresAt: string } | null>(null);
  const [copiedToken, setCopiedToken] = useState(false);

  // Destructive Re-authentication Modal State
  const [reauthOpen, setReauthOpen] = useState(false);
  const [reauthPassword, setReauthPassword] = useState('');
  const [reauthError, setReauthError] = useState<string | null>(null);
  const [reauthPendingAction, setReauthPendingAction] = useState<(() => Promise<void>) | null>(null);

  // Load Users Directory
  const loadUsers = useCallback(async () => {
    try {
      setLoading(true);
      setErrorMsg(null);
      const res = await apiClient.get<{ success: boolean; data: AdminUserRecord[] }>('/admin/users');
      if (res?.data) {
        setUsers(res.data);
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to load user directory');
    } finally {
      setLoading(false);
    }
  }, []);

  // Load Permissions Catalog
  const loadPermissionsCatalog = useCallback(async () => {
    try {
      const res = await apiClient.get<{ success: boolean; data: PermissionDefinition[] }>('/admin/permissions-catalog');
      if (res?.data && res.data.length > 0) {
        setPermissionsCatalog(res.data);
      } else {
        setPermissionsCatalog(DEFAULT_PERMISSIONS);
      }
    } catch (err: any) {
      setPermissionsCatalog(DEFAULT_PERMISSIONS);
    }
  }, []);

  // Load Audit Logs
  const loadAuditLogs = useCallback(async () => {
    try {
      setLoading(true);
      setErrorMsg(null);
      const params = new URLSearchParams();
      params.set('page', auditPage.toString());
      params.set('limit', '25');
      if (auditActionFilter) params.set('action', auditActionFilter);
      if (auditSearch) params.set('search', auditSearch);

      const res = await apiClient.get<{
        success: boolean;
        data: AuditLogEntry[];
        pagination: { total: number; page: number; limit: number; totalPages: number };
      }>(`/admin/audit-log?${params.toString()}`);

      if (res?.data) {
        setAuditLogs(res.data);
        if (res.pagination) {
          setAuditTotalPages(res.pagination.totalPages || 1);
        }
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to query admin audit log');
    } finally {
      setLoading(false);
    }
  }, [auditPage, auditActionFilter, auditSearch]);

  useEffect(() => {
    if (isServerAdmin) {
      loadUsers();
      loadPermissionsCatalog();
      if (activeTab === 'audit') {
        loadAuditLogs();
      }
    }
  }, [isServerAdmin, activeTab, loadUsers, loadPermissionsCatalog, loadAuditLogs]);

  // Trigger Re-authentication before any destructive action
  const requireReauth = (action: () => Promise<void>) => {
    setReauthPendingAction(() => action);
    setReauthPassword('');
    setReauthError(null);
    setReauthOpen(true);
  };

  const handleReauthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reauthPassword) {
      setReauthError('Please enter your master password.');
      return;
    }

    try {
      setLoading(true);
      await apiClient.post('/admin/reauth', { password: reauthPassword });
      setReauthOpen(false);
      setReauthPassword('');
      if (reauthPendingAction) {
        await reauthPendingAction();
      }
    } catch (err: any) {
      setReauthError(err?.message || 'Incorrect master password. Access denied.');
    } finally {
      setLoading(false);
    }
  };

  // 1. Role Change Execution
  const executeRoleChange = async () => {
    if (!selectedUserForRole || !newRoleValue) return;

    try {
      setLoading(true);
      const res = await apiClient.patch<{ success: boolean; message: string }>(`/admin/users/${selectedUserForRole.id}/role`, {
        role: newRoleValue,
        reason: roleChangeReason || 'Administrative update via Maker Console'
      });

      setSuccessMsg(res?.message || `Role updated to ${newRoleValue}`);
      setSelectedUserForRole(null);
      setNewRoleValue('');
      setRoleChangeReason('');
      await loadUsers();
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to update user role');
    } finally {
      setLoading(false);
    }
  };

  // Set Section Level Preset (e.g. View Only, Edit & View, Full Approve, Hide)
  const setSectionAccessLevel = (section: SectionGroup, level: 'DEFAULT' | 'VIEW_ONLY' | 'CREATE_EDIT' | 'FULL_APPROVE' | 'HIDDEN') => {
    setPendingOverrides(prev => {
      const next = { ...prev };
      section.subsections.forEach(sub => {
        if (level === 'HIDDEN') {
          next[sub.key] = 'REVOKED';
        } else if (level === 'DEFAULT') {
          next[sub.key] = 'DEFAULT';
        } else if (level === 'VIEW_ONLY') {
          next[sub.key] = sub.isView ? 'GRANTED' : 'REVOKED';
        } else if (level === 'CREATE_EDIT') {
          next[sub.key] = sub.isApprove ? 'REVOKED' : 'GRANTED';
        } else if (level === 'FULL_APPROVE') {
          next[sub.key] = 'GRANTED';
        }
      });
      return next;
    });
  };

  // Helper to determine the current composite access state of a section
  const getSectionCompositeState = (section: SectionGroup): 'HIDDEN' | 'VIEW_ONLY' | 'CREATE_EDIT' | 'FULL_APPROVE' | 'CUSTOM' | 'DEFAULT' => {
    const statuses = section.subsections.map(s => pendingOverrides[s.key] || 'DEFAULT');
    const allDefault = statuses.every(s => s === 'DEFAULT');
    if (allDefault) return 'DEFAULT';

    const allRevoked = statuses.every(s => s === 'REVOKED');
    if (allRevoked) return 'HIDDEN';

    const allGranted = statuses.every(s => s === 'GRANTED');
    if (allGranted) return 'FULL_APPROVE';

    const viewOnlyMatch = section.subsections.every(s => {
      const st = pendingOverrides[s.key] || 'DEFAULT';
      return s.isView ? st === 'GRANTED' : st === 'REVOKED';
    });
    if (viewOnlyMatch) return 'VIEW_ONLY';

    const editViewMatch = section.subsections.every(s => {
      const st = pendingOverrides[s.key] || 'DEFAULT';
      return s.isApprove ? st === 'REVOKED' : st === 'GRANTED';
    });
    if (editViewMatch) return 'CREATE_EDIT';

    return 'CUSTOM';
  };

  const toggleSectionExpanded = (sectionId: string) => {
    setExpandedSections(prev => ({ ...prev, [sectionId]: !prev[sectionId] }));
  };

  // Quick Preset Handlers
  const applyGlobalPreset = (preset: 'DEFAULT' | 'VIEW_ONLY' | 'FULL_APPROVE' | 'HIDDEN') => {
    SECTION_GROUPS.forEach(s => setSectionAccessLevel(s, preset));
  };

  // Open Overrides Modal & Sync Pending State
  const openOverridesModal = (u: AdminUserRecord) => {
    const map: Record<string, 'DEFAULT' | 'GRANTED' | 'REVOKED'> = {};
    (u.permissionOverrides || []).forEach(o => {
      map[o.permission_key] = o.effect;
    });
    setPendingOverrides(map);
    setSavedOverridesSnapshot([...(u.permissionOverrides || [])]);
    setSelectedUserForPerms(u);
    setOverridesModalTab('sections');
  };

  // Update Pending Override Locally (Instant click with no password prompt)
  const setLocalOverride = (key: string, effect: 'DEFAULT' | 'GRANTED' | 'REVOKED') => {
    setPendingOverrides(prev => ({
      ...prev,
      [key]: effect
    }));
  };

  // 2. Batch Permission Override Execution (Single Re-auth prompt on Save)
  const saveBatchOverrides = () => {
    if (!selectedUserForPerms) return;

    requireReauth(async () => {
      try {
        setLoading(true);
        const payload = Object.entries(pendingOverrides).map(([permissionKey, effect]) => ({
          permissionKey,
          effect
        }));

        await apiClient.patch(`/admin/users/${selectedUserForPerms.id}/permissions`, {
          overrides: payload,
          reason: 'Granular permissions batch updated via Maker Console'
        });

        setSuccessMsg(`Permissions saved successfully for ${selectedUserForPerms.email}`);
        setSelectedUserForPerms(null);
        await loadUsers();
      } catch (err: any) {
        setErrorMsg(err?.message || 'Failed to save permission overrides');
      } finally {
        setLoading(false);
      }
    });
  };

  // 3. Force Password Reset Execution
  const executePasswordReset = async () => {
    if (!selectedUserForReset) return;

    try {
      setLoading(true);
      const res = await apiClient.post<{
        success: boolean;
        data: { resetToken: string; email: string; expiresAt: string };
      }>(`/admin/users/${selectedUserForReset.id}/force-password-reset`, {
        reason: 'Forced reset by platform maker'
      });

      if (res?.data) {
        setResetTokenResult(res.data);
      }
      setSelectedUserForReset(null);
      setSuccessMsg('Active sessions invalidated and one-time password reset issued.');
      await loadUsers();
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to issue password reset');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedToken(true);
    setTimeout(() => setCopiedToken(false), 2000);
  };

  // Client-Side UX Gate: If not ServerAdmin, render Access Restricted View
  if (!isServerAdmin) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-center font-sans">
        <div className="w-16 h-16 bg-rose-500/10 border border-rose-500/30 rounded-2xl flex items-center justify-center text-rose-500 mb-4 shadow-xl shadow-rose-950/40">
          <ShieldAlert className="w-8 h-8" />
        </div>
        <h1 className="text-2xl font-bold text-slate-100 tracking-tight mb-2">Maker Authority Restricted</h1>
        <p className="text-sm text-slate-400 max-w-md mb-6 leading-relaxed">
          The <span className="text-rose-400 font-mono font-semibold">/admin</span> module is strictly reserved for Platform Developers and Server Administrators (Tier 0). Your current account role (<span className="text-amber-400 font-semibold">{currentRole}</span>) does not possess maker privileges.
        </p>
        <div className="flex gap-3">
          <Link
            to="/"
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-medium rounded-lg border border-slate-700 transition"
          >
            Return to Operational Console
          </Link>
          <button
            onClick={() => onSignOut()}
            className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white text-sm font-medium rounded-lg transition"
          >
            Sign Out
          </button>
        </div>
      </div>
    );
  }

  const filteredUsers = users.filter(u =>
    u.email.toLowerCase().includes(userSearch.toLowerCase()) ||
    u.full_name.toLowerCase().includes(userSearch.toLowerCase()) ||
    u.role.toLowerCase().includes(userSearch.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans flex flex-col">
      {/* Top Navbar */}
      <header className="h-16 border-b border-slate-800/80 bg-slate-900/60 backdrop-blur-md px-6 flex items-center justify-between sticky top-0 z-40">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-amber-500/10 border border-amber-500/30 rounded-xl flex items-center justify-center text-amber-400 shadow-inner">
            <Terminal className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-100 tracking-tight text-base">GuruOm OS</span>
              <span className="px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30 uppercase">
                ServerAdmin Tier 0
              </span>
            </div>
            <p className="text-xs text-slate-400">Platform Maker & Infrastructure Governance Vault</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Link
            to="/"
            className="px-3 py-1.5 text-xs font-medium text-slate-300 hover:text-white bg-slate-800/80 hover:bg-slate-800 border border-slate-700 rounded-lg flex items-center gap-1.5 transition"
          >
            <span>Operational Console</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
          <button
            onClick={() => onSignOut()}
            className="p-2 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition"
            title="Sign Out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Notifications / Alerts Banner */}
      {errorMsg && (
        <div className="bg-rose-500/10 border-b border-rose-500/30 px-6 py-2.5 flex items-center justify-between text-rose-300 text-xs">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{errorMsg}</span>
          </div>
          <button onClick={() => setErrorMsg(null)} className="text-rose-400 hover:text-rose-200 font-bold">×</button>
        </div>
      )}

      {successMsg && (
        <div className="bg-emerald-500/10 border-b border-emerald-500/30 px-6 py-2.5 flex items-center justify-between text-emerald-300 text-xs">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{successMsg}</span>
          </div>
          <button onClick={() => setSuccessMsg(null)} className="text-emerald-400 hover:text-emerald-200 font-bold">×</button>
        </div>
      )}

      {/* Main Layout Container */}
      <div className="flex-1 flex flex-col md:flex-row">
        {/* Navigation Sidebar */}
        <aside className="w-full md:w-64 border-b md:border-b-0 md:border-r border-slate-800/80 bg-slate-900/40 p-4 shrink-0">
          <div className="text-xs font-bold text-slate-400 uppercase tracking-wider px-3 mb-2">Vault Modules</div>
          <nav className="space-y-1">
            <button
              onClick={() => setActiveTab('users')}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition ${
                activeTab === 'users'
                  ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                  : 'text-slate-300 hover:bg-slate-800/50 hover:text-slate-100'
              }`}
            >
              <Users className="w-4 h-4" />
              <span>User Directory & Roles</span>
            </button>

            <button
              onClick={() => setActiveTab('audit')}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition ${
                activeTab === 'audit'
                  ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                  : 'text-slate-300 hover:bg-slate-800/50 hover:text-slate-100'
              }`}
            >
              <FileText className="w-4 h-4" />
              <span>Immutable Audit Ledger</span>
            </button>
          </nav>

          <div className="mt-8 p-3.5 bg-slate-950/60 border border-slate-800 rounded-xl text-xs space-y-2">
            <div className="flex items-center gap-1.5 text-amber-400 font-semibold">
              <Shield className="w-3.5 h-3.5" />
              <span>Security Invariants</span>
            </div>
            <ul className="text-[11px] text-slate-400 space-y-1 list-disc list-inside">
              <li>ServerAdmin role is CLI-only.</li>
              <li>Tier hierarchy strictly enforced.</li>
              <li>All actions written to append-only log.</li>
              <li>Re-auth enforced on mutations.</li>
            </ul>
          </div>
        </aside>

        {/* Content Area */}
        <main className="flex-1 p-6 overflow-y-auto">
          {/* TAB 1: USER DIRECTORY & ROLES */}
          {activeTab === 'users' && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-xl font-bold text-slate-100">Enterprise User Directory</h2>
                  <p className="text-xs text-slate-400">Manage credentials, assign sub-tier roles, and configure per-user capability overrides.</p>
                </div>
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type="text"
                      placeholder="Search users..."
                      value={userSearch}
                      onChange={e => setUserSearch(e.target.value)}
                      className="pl-9 pr-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-amber-500"
                    />
                  </div>
                  <button
                    onClick={loadUsers}
                    className="p-2 bg-slate-900 hover:bg-slate-800 border border-slate-700 rounded-lg text-slate-300 transition"
                    title="Reload users"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                  </button>
                </div>
              </div>

              {/* Users Table */}
              <div className="bg-slate-900/60 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-950/80 border-b border-slate-800 text-slate-400 font-semibold">
                      <tr>
                        <th className="px-4 py-3">User & Email</th>
                        <th className="px-4 py-3">Role & Tier</th>
                        <th className="px-4 py-3">Status</th>
                        <th className="px-4 py-3">Overrides</th>
                        <th className="px-4 py-3">Last Login</th>
                        <th className="px-4 py-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {filteredUsers.map(u => (
                        <tr key={u.id} className="hover:bg-slate-800/30 transition">
                          <td className="px-4 py-3">
                            <div className="font-medium text-slate-100">{u.full_name || 'System User'}</div>
                            <div className="text-slate-400 font-mono text-[11px]">{u.email}</div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <span
                                className={`px-2 py-0.5 rounded text-[11px] font-semibold ${
                                  u.normalizedRole === 'ServerAdmin'
                                    ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30 font-mono'
                                    : u.normalizedRole === 'Owner'
                                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                                    : 'bg-slate-800 text-slate-300 border border-slate-700'
                                }`}
                              >
                                {u.role}
                              </span>
                              <span className="text-[10px] font-mono text-slate-500">Tier {u.tier}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                                u.status === 'ACTIVE'
                                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                  : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                              }`}
                            >
                              {u.status}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            {u.permissionOverrides && u.permissionOverrides.length > 0 ? (() => {
                              const ctaCount = u.permissionOverrides.filter(o => o.permission_key.startsWith('cta:')).length;
                              const moduleCount = u.permissionOverrides.length - ctaCount;
                              const granted = u.permissionOverrides.filter(o => o.effect === 'GRANTED').map(o => o.permission_key);
                              const revoked = u.permissionOverrides.filter(o => o.effect === 'REVOKED').map(o => o.permission_key);
                              const tooltipParts: string[] = [];
                              if (granted.length > 0) {
                                tooltipParts.push(`Granted:\n${granted.map(k => `• ${k}`).join('\n')}`);
                              }
                              if (revoked.length > 0) {
                                tooltipParts.push(`Revoked:\n${revoked.map(k => `• ${k}`).join('\n')}`);
                              }
                              const tooltipText = tooltipParts.join('\n\n');

                              return (
                                <div className="flex flex-col items-start gap-1" title={tooltipText}>
                                  <span className="px-2 py-0.5 rounded text-[10px] bg-blue-500/20 text-blue-300 border border-blue-500/30 font-medium">
                                    {u.permissionOverrides.length} Override{u.permissionOverrides.length > 1 ? 's' : ''}
                                  </span>
                                  <span className="text-[10px] text-slate-400">
                                    {moduleCount} Module / {ctaCount} CTA overrides
                                  </span>
                                </div>
                              );
                            })() : (() => {
                              const matrixPerms = RBAC_ROLE_MATRIX[normalizeRole(u.role)]?.permissions;
                              const defaultModuleCount = matrixPerms ? Object.keys(matrixPerms).length : 0;
                              return (
                                <div className="flex flex-col items-start gap-1">
                                  <span className="text-slate-500 text-[11px]">Role Defaults</span>
                                  <span className="px-1.5 py-0.5 rounded text-[10px] bg-slate-800 text-slate-400 border border-slate-700">
                                    {defaultModuleCount} modules at default
                                  </span>
                                </div>
                              );
                            })()}
                          </td>
                          <td className="px-4 py-3 text-slate-400 text-[11px]">
                            {u.last_login_at ? new Date(u.last_login_at).toLocaleString() : 'Never logged in'}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {/* Change Role Button */}
                              <button
                                onClick={() => {
                                  setSelectedUserForRole(u);
                                  setNewRoleValue(
                                    ASSIGNABLE_ROLES.find(r => normalizeRole(r) === normalizeRole(u.role)) || u.role
                                  );
                                }}
                                disabled={u.normalizedRole === 'ServerAdmin'}
                                className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 disabled:opacity-30 disabled:hover:bg-slate-800 text-slate-200 rounded border border-slate-700 transition"
                                title="Change Role"
                              >
                                Role
                              </button>

                              {/* Permission Overrides Button */}
                              <button
                                onClick={() => openOverridesModal(u)}
                                disabled={u.normalizedRole === 'ServerAdmin'}
                                className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 disabled:opacity-30 disabled:hover:bg-slate-800 text-slate-200 rounded border border-slate-700 transition"
                                title="Granular Permissions"
                              >
                                Overrides
                              </button>

                              {/* Force Password Reset Button */}
                              <button
                                onClick={() => setSelectedUserForReset(u)}
                                className="px-2.5 py-1 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 rounded border border-rose-500/30 transition"
                                title="Invalidate sessions & Issue One-Time Reset Token"
                              >
                                Reset
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: IMMUTABLE AUDIT LOG */}
          {activeTab === 'audit' && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-xl font-bold text-slate-100">Immutable Administrative Audit Log</h2>
                  <p className="text-xs text-slate-400">Append-only security journal enforced by PostgreSQL triggers.</p>
                </div>
                <div className="flex items-center gap-2">
                  <select
                    value={auditActionFilter}
                    onChange={e => setAuditActionFilter(e.target.value)}
                    className="px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-slate-200 focus:outline-none focus:border-amber-500"
                  >
                    <option value="">All Actions</option>
                    <option value="ROLE_ASSIGNED">ROLE_ASSIGNED</option>
                    <option value="PERMISSION_OVERRIDDEN">PERMISSION_OVERRIDDEN</option>
                    <option value="PASSWORD_RESET_ISSUED">PASSWORD_RESET_ISSUED</option>
                    <option value="SERVER_ADMIN_SEEDED_CLI">SERVER_ADMIN_SEEDED_CLI</option>
                    <option value="SERVER_ADMIN_FORBIDDEN_ACCESS_ATTEMPT">SERVER_ADMIN_FORBIDDEN_ACCESS_ATTEMPT</option>
                  </select>
                  <button
                    onClick={loadAuditLogs}
                    className="p-2 bg-slate-900 hover:bg-slate-800 border border-slate-700 rounded-lg text-slate-300 transition"
                    title="Reload audit logs"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                  </button>
                </div>
              </div>

              {/* Audit Table */}
              <div className="bg-slate-900/60 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-950/80 border-b border-slate-800 text-slate-400 font-semibold">
                      <tr>
                        <th className="px-4 py-3">Timestamp</th>
                        <th className="px-4 py-3">Action</th>
                        <th className="px-4 py-3">Actor</th>
                        <th className="px-4 py-3">Target User</th>
                        <th className="px-4 py-3">IP / Client</th>
                        <th className="px-4 py-3">State Mutation</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 font-mono">
                      {auditLogs.map(log => (
                        <tr key={log.id} className="hover:bg-slate-800/30 transition">
                          <td className="px-4 py-3 text-slate-400 text-[11px] whitespace-nowrap">
                            {new Date(log.created_at).toLocaleString()}
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                log.action.includes('FORBIDDEN') || log.action.includes('BLOCKED')
                                  ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                                  : log.action.includes('RESET')
                                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                                  : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                              }`}
                            >
                              {log.action}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-slate-300 text-[11px]">
                            {log.actor_email}
                          </td>
                          <td className="px-4 py-3 text-slate-300 text-[11px]">
                            {log.target_user_email || '—'}
                          </td>
                          <td className="px-4 py-3 text-slate-400 text-[10px]">
                            {log.ip || '127.0.0.1'}
                          </td>
                          <td className="px-4 py-3 text-[10px] text-slate-300">
                            {log.after_state ? (
                              <details className="cursor-pointer">
                                <summary className="text-amber-400 hover:underline">View Snapshot</summary>
                                <pre className="mt-1 p-2 bg-slate-950 rounded border border-slate-800 text-[10px] text-slate-300 overflow-x-auto max-w-xs">
                                  {JSON.stringify({ before: log.before_state, after: log.after_state }, null, 2)}
                                </pre>
                              </details>
                            ) : (
                              '—'
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Pagination Controls */}
                <div className="bg-slate-950/80 px-4 py-3 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
                  <span>Page {auditPage} of {auditTotalPages}</span>
                  <div className="flex gap-2">
                    <button
                      disabled={auditPage <= 1}
                      onClick={() => setAuditPage(p => Math.max(1, p - 1))}
                      className="px-3 py-1 bg-slate-800 hover:bg-slate-700 disabled:opacity-30 rounded border border-slate-700 text-slate-300 transition"
                    >
                      Previous
                    </button>
                    <button
                      disabled={auditPage >= auditTotalPages}
                      onClick={() => setAuditPage(p => Math.min(auditTotalPages, p + 1))}
                      className="px-3 py-1 bg-slate-800 hover:bg-slate-700 disabled:opacity-30 rounded border border-slate-700 text-slate-300 transition"
                    >
                      Next
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* MODAL 1: ROLE CHANGE DIALOG */}
      {selectedUserForRole && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-amber-500/10 border border-amber-500/30 rounded-xl flex items-center justify-center text-amber-400">
                <Sliders className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-slate-100 text-base">Assign User Role</h3>
                <p className="text-xs text-slate-400">{selectedUserForRole.email}</p>
              </div>
            </div>

            {/* Collapsible Current State Card */}
            <div className="border border-slate-800 rounded-xl bg-slate-950/50 overflow-hidden text-xs">
              <button
                type="button"
                onClick={() => setIsRoleModalCurrentStateOpen(prev => !prev)}
                className="w-full px-3.5 py-2.5 flex items-center justify-between bg-slate-900/60 hover:bg-slate-800/40 text-slate-200 transition font-medium"
              >
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-slate-200">Current State</span>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                    selectedUserForRole.normalizedRole === 'ServerAdmin'
                      ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30 font-mono'
                      : selectedUserForRole.normalizedRole === 'Owner'
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                      : 'bg-slate-800 text-slate-300 border border-slate-700'
                  }`}>
                    {selectedUserForRole.role}
                  </span>
                </div>
                {isRoleModalCurrentStateOpen ? (
                  <ChevronDown className="w-4 h-4 text-slate-400" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-slate-400" />
                )}
              </button>

              {isRoleModalCurrentStateOpen && (
                <div className="p-3 border-t border-slate-800 space-y-2.5">
                  <div className="flex items-center justify-between py-0.5">
                    <span className="text-slate-400 font-medium">Current Role:</span>
                    <span className={`px-2 py-0.5 rounded text-[11px] font-semibold ${
                      selectedUserForRole.normalizedRole === 'ServerAdmin'
                        ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30 font-mono'
                        : selectedUserForRole.normalizedRole === 'Owner'
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                        : 'bg-slate-800 text-slate-300 border border-slate-700'
                    }`}>
                      {selectedUserForRole.role}
                    </span>
                  </div>

                  <div className="flex items-center justify-between py-0.5">
                    <span className="text-slate-400 font-medium">Tier:</span>
                    <span className="text-slate-200 font-mono font-medium">{selectedUserForRole.tier}</span>
                  </div>

                  {(() => {
                    const matrixPerms = RBAC_ROLE_MATRIX[normalizeRole(selectedUserForRole.role)]?.permissions;
                    if (!matrixPerms) {
                      return <p className="text-[11px] text-slate-500 italic mt-1">No standard matrix permissions found for this role.</p>;
                    }
                    return (
                      <div className="pt-1">
                        <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1.5">
                          Module Access Summary
                        </span>
                        <div className="max-h-36 overflow-y-auto border border-slate-800 rounded-lg">
                          <table className="w-full text-[11px] text-left">
                            <thead className="bg-slate-950/80 text-slate-400 border-b border-slate-800 font-medium sticky top-0">
                              <tr>
                                <th className="px-2.5 py-1">Module</th>
                                <th className="px-2.5 py-1 text-right">Access Level</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-800/50 text-slate-300">
                              {Object.entries(matrixPerms).map(([mod, rule]) => (
                                <tr key={mod} className="hover:bg-slate-800/20">
                                  <td className="px-2.5 py-1 capitalize font-medium">{mod}</td>
                                  <td className="px-2.5 py-1 text-right">
                                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold border ${
                                      rule.accessLevel === 'FULL_APPROVE'
                                        ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/20'
                                        : rule.accessLevel === 'CREATE_EDIT'
                                        ? 'bg-purple-500/15 text-purple-300 border-purple-500/20'
                                        : rule.accessLevel === 'VIEW_ONLY'
                                        ? 'bg-sky-500/15 text-sky-300 border-sky-500/20'
                                        : 'bg-slate-800 text-slate-500 border-slate-700'
                                    }`}>
                                      {rule.accessLevel}
                                    </span>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-slate-400 font-medium">Target Role (Sub-Tier Only):</label>
                  {!ASSIGNABLE_ROLES.includes(newRoleValue) && (
                    <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-500/15 text-amber-300 border border-amber-500/30 inline-flex items-center gap-1">
                      Current role is non-standard
                    </span>
                  )}
                </div>
                <select
                  value={newRoleValue}
                  onChange={e => setNewRoleValue(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-slate-200 focus:outline-none focus:border-amber-500"
                >
                  {!ASSIGNABLE_ROLES.includes(newRoleValue) && (
                    <option value={newRoleValue}>{newRoleValue}</option>
                  )}
                  {ASSIGNABLE_ROLES.map(r => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
                <p className="text-[11px] text-slate-500 mt-1">
                  * Note: ServerAdmin role is strictly barred from API/UI assignment and does not appear here.
                </p>
              </div>

              <div>
                <label className="block text-slate-400 font-medium mb-1">Audit Reason / Justification:</label>
                <input
                  type="text"
                  placeholder="e.g. Promoted to Head of Procurement"
                  value={roleChangeReason}
                  onChange={e => setRoleChangeReason(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-slate-200 placeholder-slate-500 focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setSelectedUserForRole(null)}
                className="px-3 py-1.5 text-xs text-slate-400 hover:text-slate-200"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => requireReauth(executeRoleChange)}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white font-medium rounded-lg text-xs transition"
              >
                Confirm & Re-authenticate
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: GRANULAR PERMISSION OVERRIDES PANEL */}
      {selectedUserForPerms && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-5">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-4xl w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-800 bg-slate-950/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-500/10 border border-blue-500/30 rounded-xl flex items-center justify-center text-blue-400 shrink-0">
                  <Key className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-bold text-slate-100 text-base">Section & Permission Access Control</h3>
                    <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-500/15 text-amber-300 border border-amber-500/30">
                      {selectedUserForPerms.role}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Configure accessible sections, view/edit/approve levels, and individual capability overrides for <span className="text-slate-200 font-medium">{selectedUserForPerms.email}</span>.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedUserForPerms(null)}
                className="text-slate-400 hover:text-slate-200 text-2xl font-bold self-end sm:self-auto p-1 leading-none"
              >
                ×
              </button>
            </div>

            {/* Saved Overrides (Current) Fixed Band */}
            <div className="px-5 py-3 border-b border-slate-800 bg-slate-950/40 shrink-0">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                  Saved Overrides (Current)
                </span>
                {savedOverridesSnapshot.length > 0 && (
                  <span className="px-1.5 py-0.2 rounded text-[10px] font-mono text-slate-400 bg-slate-800 border border-slate-700">
                    {savedOverridesSnapshot.length}
                  </span>
                )}
              </div>
              {savedOverridesSnapshot.length === 0 ? (
                <p className="text-xs text-slate-400 italic">No overrides — running on role defaults.</p>
              ) : (
                <div className="flex items-center gap-2 flex-wrap max-h-24 overflow-y-auto pr-1">
                  {savedOverridesSnapshot.map(o => (
                    <span
                      key={o.permission_key}
                      className={`px-2 py-0.5 rounded text-[11px] font-mono font-medium border inline-flex items-center gap-1 ${
                        o.effect === 'GRANTED'
                          ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                          : 'bg-rose-500/15 text-rose-300 border-rose-500/30'
                      }`}
                    >
                      <span>{o.permission_key}</span>
                      <span className="text-slate-500">→</span>
                      <span className="font-bold">{o.effect}</span>
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Tab Switcher */}
            <div className="flex items-center gap-2 px-5 pt-3 pb-2 border-b border-slate-800 bg-slate-950/60 shrink-0">
              <button
                type="button"
                onClick={() => setOverridesModalTab('sections')}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition ${
                  overridesModalTab === 'sections'
                    ? 'bg-blue-500/15 text-blue-400 border border-blue-500/30 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40 border border-transparent'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>Module & Section Access</span>
              </button>
              <button
                type="button"
                onClick={() => setOverridesModalTab('cta')}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition ${
                  overridesModalTab === 'cta'
                    ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40 border border-transparent'
                }`}
              >
                <Activity className="w-3.5 h-3.5" />
                <span>Pipeline CTA Visibility</span>
              </button>
            </div>

            {/* TAB 1: MODULE & SECTION ACCESS */}
            {overridesModalTab === 'sections' && (
              <>
                {/* Quick Action Toolbar & Search */}
                <div className="px-5 py-3 border-b border-slate-800/80 bg-slate-900/80 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 text-xs shrink-0">
                  <div className="relative flex-1 max-w-md">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type="text"
                      placeholder="Search sections or capabilities..."
                      value={permSearch}
                      onChange={e => setPermSearch(e.target.value)}
                      className="w-full pl-9 pr-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  {/* Global Preset Buttons */}
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-[11px] text-slate-400 mr-1 font-semibold uppercase tracking-wider">Presets:</span>
                    <button
                      type="button"
                      onClick={() => applyGlobalPreset('DEFAULT')}
                      className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-md transition text-[11px] flex items-center gap-1"
                      title="Revert all sections to standard role defaults"
                    >
                      <RotateCcw className="w-3 h-3" />
                      <span>Role Default</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => applyGlobalPreset('VIEW_ONLY')}
                      className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-sky-300 rounded-md transition text-[11px] flex items-center gap-1"
                      title="Make all sections read-only"
                    >
                      <Eye className="w-3 h-3" />
                      <span>View Only All</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => applyGlobalPreset('FULL_APPROVE')}
                      className="px-2.5 py-1 bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30 rounded-md transition text-[11px] flex items-center gap-1 font-semibold"
                      title="Grant full approval rights across all sections"
                    >
                      <Sparkles className="w-3 h-3" />
                      <span>Grant All</span>
                    </button>
                  </div>
                </div>

                {/* Sections & Subsections Accordion List */}
                <div className="flex-1 overflow-y-auto p-5 space-y-4">
                  <div className="flex items-center justify-between pb-1 border-b border-slate-800/60">
                    <span className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                      <Sliders className="w-3.5 h-3.5 text-blue-400" />
                      Edit Overrides (Pending)
                    </span>
                  </div>
                  {SECTION_GROUPS
                    .filter(sec =>
                      !permSearch ||
                      sec.name.toLowerCase().includes(permSearch.toLowerCase()) ||
                      sec.subsections.some(sub =>
                        sub.name.toLowerCase().includes(permSearch.toLowerCase()) ||
                        sub.key.toLowerCase().includes(permSearch.toLowerCase()) ||
                        sub.description.toLowerCase().includes(permSearch.toLowerCase())
                      )
                    )
                    .map(sec => {
                      const Icon = sec.icon;
                      const compState = getSectionCompositeState(sec);
                      const isExpanded = expandedSections[sec.id] !== false || Boolean(permSearch);
                      const isSectionVisible = compState !== 'HIDDEN';

                      return (
                        <div
                          key={sec.id}
                          className="bg-slate-950/80 border border-slate-800 rounded-xl overflow-hidden shadow-sm transition hover:border-slate-700/80"
                        >
                          {/* Section Header Card */}
                          <div className="p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-3 bg-slate-900/40 border-b border-slate-800/60">
                            <div className="flex items-center gap-3">
                              <button
                                type="button"
                                onClick={() => toggleSectionExpanded(sec.id)}
                                className="p-1 text-slate-400 hover:text-slate-200"
                                title={isExpanded ? 'Collapse section' : 'Expand section'}
                              >
                                {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                              </button>

                              <div className={`w-9 h-9 rounded-lg border flex items-center justify-center ${sec.color}`}>
                                <Icon className="w-4 h-4" />
                              </div>

                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="font-bold text-slate-100 text-sm">{sec.name}</span>
                                  <span
                                    className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                                      compState === 'HIDDEN'
                                        ? 'bg-rose-500/15 text-rose-300 border border-rose-500/30'
                                        : compState === 'FULL_APPROVE'
                                        ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                                        : compState === 'VIEW_ONLY'
                                        ? 'bg-sky-500/15 text-sky-300 border border-sky-500/30'
                                        : compState === 'CREATE_EDIT'
                                        ? 'bg-purple-500/15 text-purple-300 border border-purple-500/30'
                                        : compState === 'CUSTOM'
                                        ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                                        : 'bg-slate-800 text-slate-400'
                                    }`}
                                  >
                                    {compState === 'HIDDEN' ? 'Hidden' : compState === 'DEFAULT' ? 'Role Default' : compState}
                                  </span>
                                </div>
                                <p className="text-[11px] text-slate-400">{sec.description}</p>
                              </div>
                            </div>

                            {/* Section Level Controls (Visibility Switch + Access Level Pill) */}
                            <div className="flex items-center gap-2.5 self-end lg:self-auto flex-wrap">
                              {/* Visibility Toggle Switch */}
                              <button
                                type="button"
                                onClick={() => setSectionAccessLevel(sec, isSectionVisible ? 'HIDDEN' : 'DEFAULT')}
                                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-semibold transition ${
                                  isSectionVisible
                                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20'
                                    : 'bg-rose-500/10 text-rose-400 border-rose-500/30 hover:bg-rose-500/20'
                                }`}
                                title={isSectionVisible ? 'Hide this section from user navigation' : 'Make section accessible'}
                              >
                                {isSectionVisible ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                                <span>{isSectionVisible ? 'Section Visible' : 'Section Hidden'}</span>
                              </button>

                              {/* Access Level Presets Pill */}
                              <div className="flex items-center bg-slate-900 border border-slate-800 p-0.5 rounded-lg text-[11px] font-semibold">
                                <button
                                  type="button"
                                  onClick={() => setSectionAccessLevel(sec, 'VIEW_ONLY')}
                                  className={`px-2.5 py-1 rounded transition ${
                                    compState === 'VIEW_ONLY'
                                      ? 'bg-sky-600 text-white shadow-sm'
                                      : 'text-slate-400 hover:text-sky-300'
                                  }`}
                                >
                                  View Only
                                </button>

                                <button
                                  type="button"
                                  onClick={() => setSectionAccessLevel(sec, 'CREATE_EDIT')}
                                  className={`px-2.5 py-1 rounded transition ${
                                    compState === 'CREATE_EDIT'
                                      ? 'bg-purple-600 text-white shadow-sm'
                                      : 'text-slate-400 hover:text-purple-300'
                                  }`}
                                >
                                  Edit & View
                                </button>

                                <button
                                  type="button"
                                  onClick={() => setSectionAccessLevel(sec, 'FULL_APPROVE')}
                                  className={`px-2.5 py-1 rounded transition ${
                                    compState === 'FULL_APPROVE'
                                      ? 'bg-emerald-600 text-white shadow-sm font-bold'
                                      : 'text-slate-400 hover:text-emerald-300'
                                  }`}
                                >
                                  Full Approve
                                </button>
                              </div>
                            </div>
                          </div>

                          {/* Subsections & Granular Capability Toggles */}
                          {isExpanded && (
                            <div className="p-3 divide-y divide-slate-800/40 bg-slate-950/40">
                              {sec.subsections.map(sub => {
                                const currentStatus = pendingOverrides[sub.key] || 'DEFAULT';

                                return (
                                  <div
                                    key={sub.key}
                                    className="py-2.5 px-2 flex flex-col sm:flex-row sm:items-center justify-between gap-2 hover:bg-slate-900/30 rounded-lg transition"
                                  >
                                    <div className="min-w-0 flex-1">
                                      <div className="flex items-center gap-2">
                                        <span className="font-semibold text-slate-200 text-xs">{sub.name}</span>
                                        <span className="font-mono text-[10px] text-slate-500">({sub.key})</span>
                                      </div>
                                      <p className="text-[11px] text-slate-400 mt-0.5">{sub.description}</p>
                                    </div>

                                    {/* 3-State Capability Switch */}
                                    <div className="flex items-center bg-slate-900 border border-slate-800/90 p-0.5 rounded-lg shrink-0 self-start sm:self-auto text-[11px] font-semibold">
                                      <button
                                        type="button"
                                        onClick={() => setLocalOverride(sub.key, 'DEFAULT')}
                                        className={`px-2 py-0.5 rounded transition ${
                                          currentStatus === 'DEFAULT'
                                            ? 'bg-slate-700 text-slate-100 shadow-sm'
                                            : 'text-slate-400 hover:text-slate-200'
                                        }`}
                                        title="Inherit role default"
                                      >
                                        Auto
                                      </button>

                                      <button
                                        type="button"
                                        onClick={() => setLocalOverride(sub.key, 'GRANTED')}
                                        className={`px-2 py-0.5 rounded transition flex items-center gap-1 ${
                                          currentStatus === 'GRANTED'
                                            ? 'bg-emerald-500 text-slate-950 font-bold shadow-sm'
                                            : 'text-slate-400 hover:text-emerald-300'
                                        }`}
                                        title="Force Allow capability"
                                      >
                                        <Check className="w-3 h-3" />
                                        <span>Allow</span>
                                      </button>

                                      <button
                                        type="button"
                                        onClick={() => setLocalOverride(sub.key, 'REVOKED')}
                                        className={`px-2 py-0.5 rounded transition flex items-center gap-1 ${
                                          currentStatus === 'REVOKED'
                                            ? 'bg-rose-500 text-white font-bold shadow-sm'
                                            : 'text-slate-400 hover:text-rose-300'
                                        }`}
                                        title="Force Deny capability"
                                      >
                                        <X className="w-3 h-3" />
                                        <span>Deny</span>
                                      </button>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })}
                </div>
              </>
            )}

            {/* TAB 2: PIPELINE CTA VISIBILITY */}
            {overridesModalTab === 'cta' && (
              <>
                {/* Tab 2 Search Bar */}
                <div className="px-5 py-3 border-b border-slate-800/80 bg-slate-900/80 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 text-xs shrink-0">
                  <div className="relative flex-1 max-w-md">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type="text"
                      placeholder="Search CTAs, stages, or authorized roles..."
                      value={permSearch}
                      onChange={e => setPermSearch(e.target.value)}
                      className="w-full pl-9 pr-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-amber-500"
                    />
                  </div>
                  <div className="flex items-center gap-2 text-slate-400 text-xs">
                    <span>25 Pipeline Action Gates</span>
                  </div>
                </div>

                {/* Tab 2 Functional Groups List */}
                <div className="flex-1 overflow-y-auto p-5 space-y-4">
                  <div className="flex items-center justify-between pb-1 border-b border-slate-800/60">
                    <span className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                      <Activity className="w-3.5 h-3.5 text-amber-400" />
                      Pipeline CTA Visibility Overrides (Pending)
                    </span>
                  </div>

                  {CTA_GROUPS
                    .filter(group => {
                      if (!permSearch) return true;
                      const q = permSearch.toLowerCase();
                      if (group.name.toLowerCase().includes(q)) return true;
                      return group.ctaIds.some(ctaId => {
                        const c = CTA_PERMISSION_TABLE.find(tbl => tbl.ctaId === ctaId);
                        if (!c) return false;
                        return (
                          c.label.toLowerCase().includes(q) ||
                          c.ctaId.toLowerCase().includes(q) ||
                          c.stage.toLowerCase().includes(q) ||
                          c.authorizedRoles.some(r => r.toLowerCase().includes(q))
                        );
                      });
                    })
                    .map(group => {
                      const Icon = group.icon;
                      const isExpanded = expandedCtaGroups[group.name] !== false || Boolean(permSearch);
                      const matchingCtas = group.ctaIds.filter(ctaId => {
                        if (!permSearch) return true;
                        const c = CTA_PERMISSION_TABLE.find(tbl => tbl.ctaId === ctaId);
                        if (!c) return false;
                        const q = permSearch.toLowerCase();
                        return (
                          group.name.toLowerCase().includes(q) ||
                          c.label.toLowerCase().includes(q) ||
                          c.ctaId.toLowerCase().includes(q) ||
                          c.stage.toLowerCase().includes(q) ||
                          c.authorizedRoles.some(r => r.toLowerCase().includes(q))
                        );
                      });

                      return (
                        <div
                          key={group.name}
                          className="bg-slate-950/80 border border-slate-800 rounded-xl overflow-hidden shadow-sm transition hover:border-slate-700/80"
                        >
                          <div className="p-4 flex items-center justify-between gap-3 bg-slate-900/40 border-b border-slate-800/60">
                            <div className="flex items-center gap-3">
                              <button
                                type="button"
                                onClick={() => setExpandedCtaGroups(prev => ({ ...prev, [group.name]: !isExpanded }))}
                                className="p-1 text-slate-400 hover:text-slate-200"
                                title={isExpanded ? 'Collapse group' : 'Expand group'}
                              >
                                {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                              </button>

                              <div className={`w-9 h-9 rounded-lg border flex items-center justify-center ${group.color}`}>
                                <Icon className="w-4 h-4" />
                              </div>

                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="font-bold text-slate-100 text-sm">{group.name}</span>
                                  <span className="text-[10px] font-mono text-slate-500">
                                    ({matchingCtas.length} CTA{matchingCtas.length !== 1 ? 's' : ''})
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>

                          {isExpanded && (
                            <div className="p-3 divide-y divide-slate-800/40 bg-slate-950/40">
                              {matchingCtas.map(ctaId => {
                                const ctaDef = CTA_PERMISSION_TABLE.find(c => c.ctaId === ctaId);
                                if (!ctaDef) return null;
                                const overrideKey = `cta:${ctaDef.ctaId}`;
                                const currentStatus = pendingOverrides[overrideKey] || 'DEFAULT';

                                return (
                                  <div
                                    key={ctaDef.ctaId}
                                    className="py-2.5 px-2 flex flex-col sm:flex-row sm:items-center justify-between gap-2 hover:bg-slate-900/30 rounded-lg transition"
                                  >
                                    <div className="min-w-0 flex-1">
                                      <div className="flex items-center gap-2 flex-wrap">
                                        <span className="font-semibold text-slate-200 text-xs">{ctaDef.label}</span>
                                        <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-500/15 text-amber-300 border border-amber-500/30">
                                          {ctaDef.stage}
                                        </span>
                                        <span className="font-mono text-[10px] text-slate-500">({overrideKey})</span>
                                      </div>
                                      <div className="flex items-center gap-1.5 flex-wrap mt-1">
                                        <span className="text-[10px] text-slate-500 font-medium">Default Authorized:</span>
                                        {ctaDef.authorizedRoles.map(role => (
                                          <span
                                            key={role}
                                            className="px-1.5 py-0.5 rounded text-[10px] bg-slate-800/90 text-slate-400 border border-slate-700/60 font-medium"
                                          >
                                            {role}
                                          </span>
                                        ))}
                                      </div>
                                    </div>

                                    {/* 3-State Capability Switch */}
                                    <div className="flex items-center bg-slate-900 border border-slate-800/90 p-0.5 rounded-lg shrink-0 self-start sm:self-auto text-[11px] font-semibold">
                                      <button
                                        type="button"
                                        onClick={() => setLocalOverride(overrideKey, 'DEFAULT')}
                                        className={`px-2 py-0.5 rounded transition ${
                                          currentStatus === 'DEFAULT'
                                            ? 'bg-slate-700 text-slate-100 shadow-sm'
                                            : 'text-slate-400 hover:text-slate-200'
                                        }`}
                                        title="Inherit role default"
                                      >
                                        Auto
                                      </button>

                                      <button
                                        type="button"
                                        onClick={() => setLocalOverride(overrideKey, 'GRANTED')}
                                        className={`px-2 py-0.5 rounded transition flex items-center gap-1 ${
                                          currentStatus === 'GRANTED'
                                            ? 'bg-emerald-500 text-slate-950 font-bold shadow-sm'
                                            : 'text-slate-400 hover:text-emerald-300'
                                        }`}
                                        title="Force Allow capability"
                                      >
                                        <Check className="w-3 h-3" />
                                        <span>Allow</span>
                                      </button>

                                      <button
                                        type="button"
                                        onClick={() => setLocalOverride(overrideKey, 'REVOKED')}
                                        className={`px-2 py-0.5 rounded transition flex items-center gap-1 ${
                                          currentStatus === 'REVOKED'
                                            ? 'bg-rose-500 text-white font-bold shadow-sm'
                                            : 'text-slate-400 hover:text-rose-300'
                                        }`}
                                        title="Force Deny capability"
                                      >
                                        <X className="w-3 h-3" />
                                        <span>Deny</span>
                                      </button>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })}
                </div>
              </>
            )}

            {/* Modal Footer with Summary and Batch Apply */}
            <div className="p-4 border-t border-slate-800 bg-slate-950/80 flex items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2">
                <span className="text-slate-400">
                  Configured overrides: <span className="text-amber-400 font-bold">{Object.values(pendingOverrides).filter(v => v !== 'DEFAULT').length}</span> active
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedUserForPerms(null)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition font-medium"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={saveBatchOverrides}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg shadow-sm transition flex items-center gap-2"
                >
                  <Check className="w-4 h-4" />
                  <span>Save & Apply Changes</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: FORCE PASSWORD RESET CONFIRMATION */}
      {selectedUserForReset && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-rose-500/10 border border-rose-500/30 rounded-xl flex items-center justify-center text-rose-400">
                <Lock className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-slate-100 text-base">Force Password Reset</h3>
                <p className="text-xs text-slate-400">{selectedUserForReset.email}</p>
              </div>
            </div>

            <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-xs text-rose-300 space-y-1">
              <p className="font-bold">⚠️ Warning: Destructive Action</p>
              <p>• All active sessions for this user will be invalidated instantly.</p>
              <p>• A high-entropy one-time reset token will be issued.</p>
              <p>• No plaintext password is exposed or stored.</p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setSelectedUserForReset(null)}
                className="px-3 py-1.5 text-xs text-slate-400 hover:text-slate-200"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => requireReauth(executePasswordReset)}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white font-medium rounded-lg text-xs transition"
              >
                Invalidate & Issue Token
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 4: RESET TOKEN RESULT DIALOG */}
      {resetTokenResult && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-emerald-500/30 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-emerald-500/10 border border-emerald-500/30 rounded-xl flex items-center justify-center text-emerald-400">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-slate-100 text-base">One-Time Reset Token Issued</h3>
                <p className="text-xs text-slate-400">{resetTokenResult.email}</p>
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-semibold text-slate-300">Secure Reset Token:</label>
              <div className="flex items-center gap-2 bg-slate-950 p-2.5 rounded-lg border border-slate-800 font-mono text-xs text-emerald-400 break-all">
                <span className="flex-1">{resetTokenResult.resetToken}</span>
                <button
                  onClick={() => copyToClipboard(resetTokenResult.resetToken)}
                  className="p-1.5 bg-slate-800 hover:bg-slate-700 rounded text-slate-300 transition"
                  title="Copy Token"
                >
                  {copiedToken ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
              <p className="text-[11px] text-slate-400">
                Expires at: {new Date(resetTokenResult.expiresAt).toLocaleString()}. Share this with the user to force password change on next login.
              </p>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setResetTokenResult(null)}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-medium rounded-lg text-xs transition"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 5: RE-AUTHENTICATION GATE */}
      {reauthOpen && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <form onSubmit={handleReauthSubmit} className="bg-slate-900 border border-slate-700 rounded-2xl max-w-sm w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-amber-500/10 border border-amber-500/30 rounded-xl flex items-center justify-center text-amber-400">
                <Lock className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-slate-100 text-base">Re-authentication Required</h3>
                <p className="text-xs text-slate-400">Confirm master developer credentials</p>
              </div>
            </div>

            {reauthError && (
              <div className="p-2.5 bg-rose-500/10 border border-rose-500/20 rounded-lg text-xs text-rose-300">
                {reauthError}
              </div>
            )}

            <div className="space-y-1">
              <label className="block text-xs font-semibold text-slate-300">Master Password:</label>
              <input
                type="password"
                required
                autoFocus
                placeholder="••••••••••••"
                value={reauthPassword}
                onChange={e => setReauthPassword(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-slate-200 focus:outline-none focus:border-amber-500"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setReauthOpen(false);
                  setReauthPassword('');
                  setReauthPendingAction(null);
                }}
                className="px-3 py-1.5 text-xs text-slate-400 hover:text-slate-200"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white font-medium rounded-lg text-xs transition flex items-center gap-1.5"
              >
                {loading && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                <span>Verify & Proceed</span>
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
