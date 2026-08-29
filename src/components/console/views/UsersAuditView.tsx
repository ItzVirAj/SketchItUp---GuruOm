import React, { useState } from 'react';
import { 
  Users, 
  History, 
  ShieldCheck, 
  Plus, 
  Search, 
  Clock, 
  UserCheck, 
  Activity, 
  Lock,
  Ban,
  Key,
  CheckCircle2,
  Building,
  Mail,
  Phone,
  Shield,
  ShoppingBag,
  Wrench,
  Boxes,
  Truck,
  Receipt,
  Database,
  Layers,
  Download,
  Check,
  X,
  Filter,
  RotateCcw,
  Trash2,
  FileJson,
  FileSpreadsheet,
  Sliders,
  Settings,
  HardDrive,
  AlertTriangle,
  FileText,
  DollarSign,
  Briefcase,
  Eye,
  EyeOff,
  Copy,
  Sparkles,
  Edit,
  CheckSquare,
  Calendar,
  ShieldAlert,
  RefreshCw
} from 'lucide-react';
import { 
  SystemUser, 
  AuditLogEntry, 
  UserRole,
  CustomerOrder,
  StockItem,
  ShortageItem,
  JobCard,
  ProductionLogReport,
  QCInspection,
  PDIInspection,
  DispatchChallan,
  CustomerInvoice,
  VendorBill,
  MasterItem
} from '../../../types/console';
import { Modal } from '../../common/Modal';
import { exportAuditLogsApi } from '../../../services/supabaseServices';
import { useUrlModal } from '../../../hooks/useUrlModal';

import { getRoleColor } from '../../../utils/permissions';
import { 
  ROLE_DEFAULT_MODULES, 
  ALL_MODULES, 
  USER_ROLES, 
  ACCESS_LEVELS, 
  MACHINE_SHIFTS, 
  INDIAN_MOBILE_REGEX, 
  generateNextCode 
} from '../../../utils/masterValidation';
import { 
  RBAC_ROLE_MATRIX, 
  normalizeRole, 
  AccessLevel, 
  SystemModule, 
  RoleDefinitionRecord 
} from '../../../utils/rbacMatrix';

const getRoleBadgeClasses = (role: string): string => {
  const c = getRoleColor(role);
  if (!c) return 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700';
  if (typeof c === 'string') return c;
  return `${c.bg} ${c.text} ${c.border}`;
};

interface UsersAuditViewProps {
  users: SystemUser[];
  auditLogs: AuditLogEntry[];
  orders?: CustomerOrder[];
  stock?: StockItem[];
  jobCards?: JobCard[];
  qcQueue?: QCInspection[];
  dispatches?: DispatchChallan[];
  invoices?: CustomerInvoice[];
  payables?: VendorBill[];
  masters?: MasterItem[];
  productionLogs?: ProductionLogReport[];
  pdiQueue?: PDIInspection[];
  isDarkMode?: boolean;
  currentUserId?: string;
  currentRole?: string;
  onAddUser?: (user: Partial<SystemUser>) => void;
  onUpdateUser?: (userId: string, updates: Partial<SystemUser>) => Promise<any> | void;
  onSwitchUser?: (userId: string) => void;
  onRevokeUser?: (userId: string) => void;
  onRestoreUser?: (userId: string) => void;
  onUpdateUserRole?: (userId: string, role: any) => void;
  onDeleteUser?: (userId: string) => void;
  onResetAllData?: () => void;
  onClearOperationalData?: () => void;
}

export type SectionCategory = 
  | 'ALL' 
  | 'SECURITY' 
  | 'ORDERS' 
  | 'PRODUCTION' 
  | 'INVENTORY' 
  | 'QUALITY' 
  | 'DISPATCH' 
  | 'FINANCE' 
  | 'MASTERS';

export const ROLE_DEFINITIONS = Object.values(RBAC_ROLE_MATRIX).map(r => ({
  role: r.role,
  label: r.label,
  desc: r.scopeDescription || r.approvalLimitDisplay,
  category: r.category,
  approvalLimitDisplay: r.approvalLimitDisplay
}));

export const UsersAuditView: React.FC<UsersAuditViewProps> = ({
  users = [],
  auditLogs = [],
  orders = [],
  stock = [],
  jobCards = [],
  qcQueue = [],
  dispatches = [],
  invoices = [],
  payables = [],
  masters = [],
  productionLogs = [],
  pdiQueue = [],
  isDarkMode = true,
  currentUserId,
  currentRole,
  onAddUser,
  onUpdateUser,
  onSwitchUser,
  onRevokeUser,
  onRestoreUser,
  onUpdateUserRole,
  onDeleteUser,
  onResetAllData,
  onClearOperationalData
}) => {
  const [activeTab, setActiveTab] = useState<'AUDIT' | 'USERS' | 'RBAC_MATRIX' | 'DATA_ADMIN'>('AUDIT');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'REVOKED'>('ALL');
  const [selectedSection, setSelectedSection] = useState<SectionCategory>('ALL');
  const [selectedActor, setSelectedActor] = useState<string>('ALL');
  const [selectedActionType, setSelectedActionType] = useState<string>('ALL');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [copiedExport, setCopiedExport] = useState(false);

  // URL-Driven Modal Hooks
  const addUserModal = useUrlModal('add-user');
  const editUserModal = useUrlModal('edit-user');
  const editRoleModal = useUrlModal('edit-role');
  const deleteUserModal = useUrlModal('delete-user');
  const purgeModal = useUrlModal('purge-data');

  // Role Gate Evaluation
  const normalizedUserRole = normalizeRole(currentRole || '');
  const isOwnerAdmin = [
    'Owner',
    'Admin (System)',
    'SUPER ADMIN',
    'ADMIN_OWNER',
    'ADMIN',
    'Super Admin',
    'Admin',
    'Owner / Managing Director'
  ].includes(normalizedUserRole) || (currentRole || '').toLowerCase().includes('admin') || (currentRole || '').toLowerCase().includes('owner');

  // Edit Role State
  const [userToEditRole, setUserToEditRole] = useState<SystemUser | null>(null);
  const [newSelectedRole, setNewSelectedRole] = useState<string>('Shop Floor Supervisor');

  // Edit User Master State
  const [userToEdit, setUserToEdit] = useState<SystemUser | null>(null);
  const [editFullName, setEditFullName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editRole, setEditRole] = useState<string>('SUPER ADMIN');
  const [editDepartment, setEditDepartment] = useState('Executive Management');
  const [editMobile, setEditMobile] = useState('');
  const [editStatus, setEditStatus] = useState<'Active' | 'Inactive'>('Active');
  const [editReportingManager, setEditReportingManager] = useState('');
  const [editUserErrors, setEditUserErrors] = useState<Record<string, string>>({});

  // Delete User State
  const [userToDelete, setUserToDelete] = useState<SystemUser | null>(null);

  // Download Suite State
  const [selectedExportSection, setSelectedExportSection] = useState<string>('ALL');
  const [exportFormat, setExportFormat] = useState<'JSON' | 'CSV'>('JSON');

  // New User Form State (Exact Master Module Specification)
  const [uCode, setUCode] = useState('');
  const [uFullName, setUFullName] = useState('');
  const [uEmployeeCode, setUEmployeeCode] = useState('');
  const [uUserRole, setUUserRole] = useState<string>('Shop Floor Supervisor');
  const [uDepartment, setUDepartment] = useState('Production Operations');
  const [uMobile, setUMobile] = useState('');
  const [uEmail, setUEmail] = useState('');
  const [uPassword, setUPassword] = useState('');
  const [uConfirmPassword, setUConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [uRequirePasswordChange, setURequirePasswordChange] = useState(true);
  const [copiedPassword, setCopiedPassword] = useState(false);
  const [uAccessLevel, setUAccessLevel] = useState<'Full Access' | 'Edit' | 'View Only'>('Edit');
  const [uModulesAccess, setUModulesAccess] = useState<string[]>(ROLE_DEFAULT_MODULES['Production Supervisor'] || []);
  const [uReportingManager, setUReportingManager] = useState('');
  const [uShift, setUShift] = useState('General-Day');
  const [uStatus, setUStatus] = useState<'Active' | 'Inactive'>('Active');
  const [userErrors, setUserErrors] = useState<Record<string, string>>({});

  const handleGeneratePassword = () => {
    const uppercase = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
    const lowercase = 'abcdefghijkmnopqrstuvwxyz';
    const numbers = '23456789';
    const symbols = '!@#$%^&*';
    const all = uppercase + lowercase + numbers + symbols;

    let pwd = '';
    pwd += uppercase[Math.floor(Math.random() * uppercase.length)];
    pwd += lowercase[Math.floor(Math.random() * lowercase.length)];
    pwd += numbers[Math.floor(Math.random() * numbers.length)];
    pwd += symbols[Math.floor(Math.random() * symbols.length)];

    for (let i = 4; i < 12; i++) {
      pwd += all[Math.floor(Math.random() * all.length)];
    }

    pwd = pwd.split('').sort(() => 0.5 - Math.random()).join('');

    setUPassword(pwd);
    setUConfirmPassword(pwd);
    setShowPassword(true);
    setShowConfirmPassword(true);
    if (navigator.clipboard) {
      navigator.clipboard.writeText(pwd);
    }
    setCopiedPassword(true);
    setTimeout(() => setCopiedPassword(false), 3500);

    setUserErrors(prev => {
      const next = { ...prev };
      delete next.password;
      delete next.confirmPassword;
      return next;
    });
  };

  const openAddUserModal = () => {
    setUserErrors({});
    const nextCode = generateNextCode(users.map(u => u.code || u.userId || u.id), 'USR');
    setUCode(nextCode);
    setUFullName('');
    setUEmployeeCode(`EMP-${Math.floor(1000 + Math.random() * 9000)}`);
    setUUserRole('Shop Floor Supervisor');
    setUDepartment('Production Operations');
    setUMobile('');
    setUEmail('');
    setUPassword('');
    setUConfirmPassword('');
    setShowPassword(false);
    setShowConfirmPassword(false);
    setURequirePasswordChange(true);
    setCopiedPassword(false);
    setUAccessLevel('Edit');
    setUModulesAccess(ROLE_DEFAULT_MODULES['Production Supervisor'] || ['job_cards', 'production']);
    setUReportingManager(users[0]?.name || '');
    setUShift('General-Day');
    setUStatus('Active');
    addUserModal.open();
  };

  // Synchronize URL modals
  React.useEffect(() => {
    if (editUserModal.isOpen) {
      const { userId } = editUserModal.params;
      if (userId) {
        const found = users.find(u => u.id === userId || u.userId === userId || u.code === userId);
        if (found) {
          handleOpenEditUser(found);
        }
      }
    } else {
      setUserToEdit(null);
    }
  }, [editUserModal.isOpen, editUserModal.params.userId, users]);

  React.useEffect(() => {
    if (editRoleModal.isOpen) {
      const { userId } = editRoleModal.params;
      if (userId) {
        const found = users.find(u => u.id === userId || u.userId === userId || u.code === userId);
        if (found) {
          setUserToEditRole(found);
          const normRole = normalizeRole(found.userRole || found.role);
          setNewSelectedRole(normRole);
        }
      }
    } else {
      setUserToEditRole(null);
    }
  }, [editRoleModal.isOpen, editRoleModal.params.userId, users]);

  React.useEffect(() => {
    if (deleteUserModal.isOpen) {
      const { userId } = deleteUserModal.params;
      if (userId) {
        const found = users.find(u => u.id === userId || u.userId === userId || u.code === userId);
        if (found) {
          setUserToDelete(found);
        }
      }
    } else {
      setUserToDelete(null);
    }
  }, [deleteUserModal.isOpen, deleteUserModal.params.userId, users]);

  const handleRoleSelect = (role: string) => {
    setUUserRole(role);
    const defaults = ROLE_DEFAULT_MODULES[role] || [];
    setUModulesAccess(defaults);
    if (role === 'Owner' || role === 'Admin (System)' || role === 'Admin/Owner') {
      setUAccessLevel('Full Access');
      setUDepartment('Executive / Management');
    } else if (role === 'Management/Viewer') {
      setUAccessLevel('View Only');
      setUDepartment('Management');
    } else if (role === 'Sales/Order Desk' || role === 'Sales Executive') {
      setUDepartment('Sales & Marketing');
    } else if (role === 'Purchase Manager' || role === 'Purchase Executive') {
      setUDepartment('Procurement');
    } else if (role === 'Store Keeper' || role === 'Store/Inventory Executive') {
      setUDepartment('Stores & Warehouse');
    } else if (role === 'Accountant' || role === 'Accounts Executive') {
      setUDepartment('Accounts & Finance');
    } else if (role === 'Quality Inspector') {
      setUDepartment('Quality Assurance');
    } else if (role === 'Dispatch Executive') {
      setUDepartment('Logistics & Dispatch');
    } else if (role === 'Machine Operator') {
      setUDepartment('Shop Floor Operations');
    } else if (role === 'HR/Admin') {
      setUDepartment('Human Resources & Admin');
    }
  };

  const toggleModuleAccess = (moduleId: string) => {
    setUModulesAccess(prev => 
      prev.includes(moduleId) ? prev.filter(m => m !== moduleId) : [...prev, moduleId]
    );
  };

  // Audit Logs Pagination & Diff Inspector State
  const [expandedLogIds, setExpandedLogIds] = useState<Record<string, boolean>>({});
  const [auditPage, setAuditPage] = useState<number>(1);
  const AUDIT_PAGE_SIZE = 50;

  const toggleExpandLog = (id: string) => {
    setExpandedLogIds(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const getSectionInfo = (entity: string) => {
    const cleanEntity = (entity || '').toLowerCase();
    switch (cleanEntity) {
      case 'security':
      case 'user_admin':
      case 'user':
      case 'users':
        return { 
          category: 'SECURITY' as SectionCategory, 
          label: 'Security & Users', 
          icon: Shield, 
          badgeClass: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/30' 
        };
      case 'order':
      case 'customer order':
        return { 
          category: 'ORDERS' as SectionCategory, 
          label: 'Sales Orders', 
          icon: ShoppingBag, 
          badgeClass: 'bg-teal-500/10 text-teal-400 border-teal-500/30' 
        };
      case 'job_card':
      case 'production':
        return { 
          category: 'PRODUCTION' as SectionCategory, 
          label: 'Production Jobs', 
          icon: Wrench, 
          badgeClass: 'bg-amber-500/10 text-amber-400 border-amber-500/30' 
        };
      case 'stock_movement':
      case 'inventory':
      case 'stock':
        return { 
          category: 'INVENTORY' as SectionCategory, 
          label: 'Stock & Inventory', 
          icon: Boxes, 
          badgeClass: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' 
        };
      case 'qc_inspection':
      case 'pdi_report':
      case 'quality control':
        return { 
          category: 'QUALITY' as SectionCategory, 
          label: 'QC & Inspection', 
          icon: CheckCircle2, 
          badgeClass: 'bg-purple-500/10 text-purple-400 border-purple-500/30' 
        };
      case 'dispatch':
        return { 
          category: 'DISPATCH' as SectionCategory, 
          label: 'Dispatch & Shipping', 
          icon: Truck, 
          badgeClass: 'bg-teal-500/10 text-teal-400 border-teal-500/30' 
        };
      case 'invoice':
      case 'payable':
      case 'approvals':
        return { 
          category: 'FINANCE' as SectionCategory, 
          label: 'Finance & Payments', 
          icon: Receipt, 
          badgeClass: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30' 
        };
      case 'master_item':
      case 'company_profile':
      case 'system':
      default:
        return { 
          category: 'MASTERS' as SectionCategory, 
          label: 'System & Masters', 
          icon: Database, 
          badgeClass: 'bg-slate-500/10 text-slate-400 border-slate-500/30' 
        };
    }
  };

  const availableActionTypes = Array.from(
    new Set(auditLogs.map(l => l.action).filter(Boolean))
  ).sort();

  const availableActors = Array.from(
    new Set([
      ...users.map(u => u.email),
      ...auditLogs.map(l => l.actorEmail || l.user).filter(Boolean)
    ])
  ).sort();

  const filteredLogs = auditLogs.filter(log => {
    const actor = (log.user || log.actorEmail || '').toLowerCase();
    const act = (log.action || '').toLowerCase();
    const det = (log.details || '').toLowerCase();
    const ent = (log.entity || log.entityType || '').toLowerCase();
    const entId = (log.entityId || '').toLowerCase();
    const search = searchTerm.toLowerCase();

    const matchesSearch = 
      !search || 
      actor.includes(search) || 
      act.includes(search) || 
      det.includes(search) || 
      ent.includes(search) || 
      entId.includes(search);
    
    if (!matchesSearch) return false;

    if (selectedSection !== 'ALL') {
      const secInfo = getSectionInfo(log.entity || log.entityType || '');
      if (secInfo.category !== selectedSection) return false;
    }

    if (selectedActor !== 'ALL') {
      const targetActor = selectedActor.toLowerCase();
      if (actor !== targetActor && (log.actorEmail || '').toLowerCase() !== targetActor) {
        return false;
      }
    }

    if (selectedActionType !== 'ALL') {
      if (act !== selectedActionType.toLowerCase()) return false;
    }

    if (startDate) {
      const startMs = new Date(startDate).getTime();
      const logMs = log.createdAt ? new Date(log.createdAt).getTime() : 0;
      if (logMs > 0 && logMs < startMs) return false;
    }

    if (endDate) {
      const endMs = new Date(endDate).getTime() + 86400000;
      const logMs = log.createdAt ? new Date(log.createdAt).getTime() : 0;
      if (logMs > 0 && logMs > endMs) return false;
    }

    return true;
  });

  const activeFiltersCount = 
    (searchTerm ? 1 : 0) + 
    (selectedSection !== 'ALL' ? 1 : 0) + 
    (selectedActor !== 'ALL' ? 1 : 0) + 
    (selectedActionType !== 'ALL' ? 1 : 0) + 
    (startDate ? 1 : 0) + 
    (endDate ? 1 : 0);

  const handleClearFilters = () => {
    setSearchTerm('');
    setSelectedSection('ALL');
    setSelectedActor('ALL');
    setSelectedActionType('ALL');
    setStartDate('');
    setEndDate('');
    setAuditPage(1);
  };

  const totalAuditPages = Math.max(1, Math.ceil(filteredLogs.length / AUDIT_PAGE_SIZE));
  const paginatedLogs = filteredLogs.slice((auditPage - 1) * AUDIT_PAGE_SIZE, auditPage * AUDIT_PAGE_SIZE);

  const filteredUsers = users.filter(usr => {
    const matchesSearch = 
      usr.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      usr.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      usr.department.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (usr.userRole || usr.role || '').toLowerCase().includes(searchTerm.toLowerCase());
    
    if (statusFilter === 'ALL') return matchesSearch;
    return matchesSearch && usr.status === statusFilter;
  });

  const handleExportCSV = async () => {
    if (filteredLogs.length === 0) return;
    setIsExporting(true);
    try {
      await exportAuditLogsApi({
        actorEmail: users.find(u => u.userId === currentUserId || u.id === currentUserId)?.email || 'owner@guruom.in',
        entityType: selectedSection !== 'ALL' ? selectedSection : undefined,
        action: selectedActionType !== 'ALL' ? selectedActionType : undefined,
        search: searchTerm || undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined
      });
    } catch (_) {}

    const headers = 'ID,Timestamp,User,Actor_Role,Category,Action,Entity_ID,Details,IP_Address\n';
    const rows = filteredLogs.map(l => 
      `"${l.id}","${l.createdAt || l.when || ''}","${l.user || l.actorEmail || ''}","${l.actorRole || ''}","${l.entity || l.entityType || ''}","${l.action || ''}","${l.entityId || ''}","${(l.details || '').replace(/"/g, '""')}","${l.ipAddress || ''}"`
    ).join('\n');

    const blob = new Blob([headers + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `guruom_audit_log_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);

    setCopiedExport(true);
    setTimeout(() => setCopiedExport(false), 2500);
    setIsExporting(false);
  };

  const handleDownloadSection = () => {
    let exportData: any = null;
    const dateStr = new Date().toISOString().split('T')[0];
    let filename = `guruom_${selectedExportSection.toLowerCase()}_data_${dateStr}`;

    switch (selectedExportSection) {
      case 'AUDIT':
        exportData = auditLogs;
        break;
      case 'ORDERS':
        exportData = orders;
        break;
      case 'INVENTORY':
        exportData = { stock };
        break;
      case 'PRODUCTION':
        exportData = { jobCards, productionLogs };
        break;
      case 'QUALITY':
        exportData = { qcQueue, pdiQueue };
        break;
      case 'DISPATCH':
        exportData = dispatches;
        break;
      case 'INVOICES':
        exportData = invoices;
        break;
      case 'PAYABLES':
        exportData = payables;
        break;
      case 'MASTERS':
        exportData = masters;
        break;
      case 'USERS':
        exportData = users;
        break;
      case 'ALL':
      default:
        exportData = {
          users,
          auditLogs,
          orders,
          stock,
          jobCards,
          qcQueue,
          pdiQueue,
          dispatches,
          invoices,
          payables,
          masters
        };
        break;
    }

    if (exportFormat === 'JSON') {
      const jsonStr = JSON.stringify(exportData, null, 2);
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${filename}.json`;
      link.click();
      URL.revokeObjectURL(url);
    } else {
      let csvContent = '';
      const arrayTarget = Array.isArray(exportData) ? exportData : [exportData];
      if (arrayTarget.length > 0) {
        const headers = Object.keys(arrayTarget[0]).join(',');
        const rows = arrayTarget.map(row => 
          Object.values(row).map(val => 
            typeof val === 'object' ? `"${JSON.stringify(val).replace(/"/g, '""')}"` : `"${String(val).replace(/"/g, '""')}"`
          ).join(',')
        );
        csvContent = [headers, ...rows].join('\n');
      } else {
        csvContent = JSON.stringify(exportData);
      }
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${filename}.csv`;
      link.click();
      URL.revokeObjectURL(url);
    }
  };

  const handleCreateUser = (e: React.FormEvent) => {
    e.preventDefault();
    const errors: Record<string, string> = {};

    if (!uFullName.trim()) errors.fullName = 'Full Name is mandatory';
    if (!uEmail.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(uEmail.trim())) {
      errors.email = 'Valid unique email address is mandatory';
    } else if (users.some(u => u.email.toLowerCase() === uEmail.trim().toLowerCase())) {
      errors.email = 'A user with this email address already exists';
    }

    if (!uMobile.trim() || !INDIAN_MOBILE_REGEX.test(uMobile.trim())) {
      errors.mobile = 'Valid 10-digit Indian mobile number is required';
    }

    if (!uPassword) {
      errors.password = 'Password is required';
    } else if (uPassword.length < 8) {
      errors.password = 'Password must be at least 8 characters long';
    } else if (!/(?=.*[a-zA-Z])(?=.*\d)/.test(uPassword)) {
      errors.password = 'Password must contain at least one letter and one number';
    }

    if (uPassword !== uConfirmPassword) {
      errors.confirmPassword = 'Passwords do not match';
    }

    if (!uDepartment.trim()) errors.department = 'Department is mandatory';

    if (Object.keys(errors).length > 0) {
      setUserErrors(errors);
      return;
    }

    if (onAddUser) {
      onAddUser({
        id: `user-${Date.now()}`,
        code: uCode,
        userId: uCode,
        name: uFullName.trim(),
        fullName: uFullName.trim(),
        employeeCode: uEmployeeCode.trim(),
        email: uEmail.trim().toLowerCase(),
        mobile: uMobile.trim(),
        phone: uMobile.trim(),
        role: uUserRole as any,
        userRole: uUserRole,
        department: uDepartment.trim(),
        accessLevel: uAccessLevel,
        modulesAccess: uModulesAccess,
        reportingManager: uReportingManager.trim(),
        shift: uShift,
        status: uStatus === 'Active' ? 'ACTIVE' : 'REVOKED',
        password: uPassword,
        requirePasswordChangeFirstLogin: uRequirePasswordChange
      } as any);
    }

    addUserModal.close();
  };

  const handleOpenEditUser = (usr: SystemUser) => {
    setUserToEdit(usr);
    setEditFullName(usr.name || usr.fullName || '');
    setEditEmail(usr.email || '');
    setEditRole(usr.userRole || usr.role || 'SUPER ADMIN');
    setEditDepartment(usr.department || 'Executive Management');
    setEditMobile(usr.mobile || usr.phone || '');
    setEditStatus(usr.status === 'REVOKED' || usr.status === 'Inactive' ? 'Inactive' : 'Active');
    setEditReportingManager(usr.reportingManager || '');
    setEditUserErrors({});
    editUserModal.open({ userId: usr.id });
  };

  const handleSaveEditUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!userToEdit) return;

    const errors: Record<string, string> = {};
    if (!editFullName.trim()) errors.fullName = 'Full Name is mandatory';
    if (!editEmail.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(editEmail.trim())) {
      errors.email = 'Valid email address is mandatory';
    } else if (users.some(u => u.id !== userToEdit.id && u.email.toLowerCase() === editEmail.trim().toLowerCase())) {
      errors.email = 'A user with this email address already exists';
    }

    if (Object.keys(errors).length > 0) {
      setEditUserErrors(errors);
      return;
    }

    if (onUpdateUser) {
      onUpdateUser(userToEdit.id, {
        name: editFullName.trim(),
        fullName: editFullName.trim(),
        email: editEmail.trim().toLowerCase(),
        role: editRole as any,
        userRole: editRole,
        department: editDepartment.trim(),
        phone: editMobile.trim(),
        mobile: editMobile.trim(),
        status: editStatus === 'Active' ? 'ACTIVE' : 'REVOKED',
        reportingManager: editReportingManager.trim()
      } as any);
    }

    editUserModal.close();
  };

  return (
    <div className="space-y-6 font-sans">
      
      {/* Top Banner Header with Summary Telemetry */}
      <div className={`p-4 sm:p-6 rounded-3xl border transition-all ${
        isDarkMode 
          ? 'bg-slate-900/80 border-slate-800/80 text-white backdrop-blur-xl shadow-2xl' 
          : 'bg-white border-slate-200 shadow-sm text-slate-900'
      }`}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider ${
                isDarkMode ? 'bg-[#5B75F8]/20 text-[#7B92FF] border border-[#5B75F8]/30' : 'bg-[#5B75F8]/10 text-[#5B75F8] border border-[#5B75F8]/20'
              }`}>
                Governance & Authorization Hub
              </span>
              <span className={`text-[11px] sm:text-xs font-mono ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                • Exact 12-Role RBAC & Monetary Escalation Engine
              </span>
            </div>
            <h1 className={`text-xl sm:text-2xl font-bold tracking-tight ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
              Identity & Access Control Suite
            </h1>
            <p className={`text-xs mt-0.5 sm:mt-1 max-w-xl ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
              Manage users, explore the 12-role RBAC permission matrix with server-side monetary limits (Purchase: ₹1.0L, Accounts: ₹50k), and audit immutable logs.
            </p>
          </div>

          <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto">
            {activeTab === 'AUDIT' && (
              <button
                onClick={handleExportCSV}
                className="w-full sm:w-auto px-4 py-2.5 rounded-2xl bg-gradient-to-r from-[#5B75F8] to-blue-600 text-white font-bold text-xs flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-[#5B75F8]/20 hover:scale-[1.02] active:scale-[0.98] transition-all"
              >
                {copiedExport ? <Check className="w-4 h-4" /> : <Download className="w-4 h-4" />}
                <span>{copiedExport ? 'Exported Log!' : 'Export Log CSV'}</span>
              </button>
            )}

            {activeTab === 'USERS' && onAddUser && (
              <button
                onClick={openAddUserModal}
                className="w-full sm:w-auto px-4 py-2.5 rounded-2xl bg-gradient-to-r from-[#5B75F8] to-indigo-600 text-white font-bold text-xs flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-[#5B75F8]/20 hover:scale-[1.02] active:scale-[0.98] transition-all"
              >
                <Plus className="w-4 h-4" />
                <span>Provision New User</span>
              </button>
            )}

            {activeTab === 'DATA_ADMIN' && onResetAllData && (
              <button
                onClick={() => {
                  if (window.confirm('Repopulate all 19 system tables with rich test seed data metrics?')) {
                    onResetAllData();
                  }
                }}
                className="w-full sm:w-auto px-4 py-2.5 rounded-2xl bg-gradient-to-r from-[#5B75F8] to-indigo-600 text-white font-bold text-xs flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-[#5B75F8]/20 hover:scale-[1.02] active:scale-[0.98] transition-all"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Populate Test Seed Data</span>
              </button>
            )}
          </div>
        </div>

        {/* Master Metrics Strip */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3 mt-4 sm:mt-5 pt-3 sm:pt-4 border-t border-slate-200 dark:border-slate-800/60">
          <div className={`p-3 sm:p-4 rounded-2xl border transition-all ${isDarkMode ? 'bg-slate-950/60 border-slate-800/80' : 'bg-slate-50/90 border-slate-200/90 shadow-xs'}`}>
            <div className={`text-[10px] sm:text-[11px] font-mono font-medium ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>System Directory</div>
            <div className="text-base sm:text-xl font-bold text-indigo-600 dark:text-indigo-400 mt-0.5 sm:mt-1">{users.length} Users</div>
            <div className="text-[10px] sm:text-[11px] text-emerald-600 dark:text-emerald-400 font-mono font-semibold mt-0.5">● {users.filter(u => u.status === 'ACTIVE' || u.status === 'Active').length} Active Accounts</div>
          </div>
          <div className={`p-3 sm:p-4 rounded-2xl border transition-all ${isDarkMode ? 'bg-slate-950/60 border-slate-800/80' : 'bg-slate-50/90 border-slate-200/90 shadow-xs'}`}>
            <div className={`text-[10px] sm:text-[11px] font-mono font-medium ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>Immutable Audit Ledger</div>
            <div className="text-base sm:text-xl font-bold text-blue-600 dark:text-blue-400 mt-0.5 sm:mt-1">{auditLogs.length} Events</div>
            <div className="text-[10px] sm:text-[11px] text-blue-600 dark:text-blue-400 font-mono font-semibold mt-0.5">● Real-time Stream</div>
          </div>
          <div className={`p-3 sm:p-4 rounded-2xl border transition-all ${isDarkMode ? 'bg-slate-950/60 border-slate-800/80' : 'bg-slate-50/90 border-slate-200/90 shadow-xs'}`}>
            <div className={`text-[10px] sm:text-[11px] font-mono font-medium ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>RBAC Architecture</div>
            <div className="text-base sm:text-xl font-bold text-purple-600 dark:text-purple-400 mt-0.5 sm:mt-1">12 Matrix Roles</div>
            <div className="text-[10px] sm:text-[11px] text-purple-600 dark:text-purple-400 font-mono font-semibold mt-0.5">● Strict Boundaries</div>
          </div>
          <div className={`p-3 sm:p-4 rounded-2xl border transition-all ${isDarkMode ? 'bg-slate-950/60 border-slate-800/80' : 'bg-slate-50/90 border-slate-200/90 shadow-xs'}`}>
            <div className={`text-[10px] sm:text-[11px] font-mono font-medium ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>Monetary Ceilings</div>
            <div className="text-base sm:text-xl font-bold text-emerald-600 dark:text-emerald-400 mt-0.5 sm:mt-1">PO ₹1L • Pay ₹50k</div>
            <div className="text-[10px] sm:text-[11px] text-emerald-600 dark:text-emerald-400 font-mono font-semibold mt-0.5">● Auto-Escalation</div>
          </div>
        </div>
      </div>

      {/* Main Tab Controls Bar */}
      <div className={`p-3.5 sm:p-4 rounded-3xl border transition-all space-y-3 ${
        isDarkMode ? 'bg-slate-900/70 border-slate-800/80 backdrop-blur-xl' : 'bg-white border-slate-200 shadow-xs'
      }`}>
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
          <button
            onClick={() => setActiveTab('AUDIT')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap border ${
              activeTab === 'AUDIT'
                ? isDarkMode ? 'bg-[#5B75F8]/20 text-[#7B92FF] border border-[#5B75F8]/40 shadow-xs' : 'bg-[#5B75F8] text-white border-[#5B75F8] shadow-xs'
                : isDarkMode ? 'bg-slate-950/60 text-slate-400 border-slate-800 hover:text-white' : 'bg-slate-100 text-slate-600 border-slate-200 hover:text-slate-900'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            <span>Audit Trail ({auditLogs.length})</span>
          </button>
          
          <button
            onClick={() => setActiveTab('USERS')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap border ${
              activeTab === 'USERS'
                ? isDarkMode ? 'bg-[#5B75F8]/20 text-[#7B92FF] border border-[#5B75F8]/40 shadow-xs' : 'bg-[#5B75F8] text-white border-[#5B75F8] shadow-xs'
                : isDarkMode ? 'bg-slate-950/60 text-slate-400 border-slate-800 hover:text-white' : 'bg-slate-100 text-slate-600 border-slate-200 hover:text-slate-900'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Users ({users.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('RBAC_MATRIX')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap border ${
              activeTab === 'RBAC_MATRIX'
                ? isDarkMode ? 'bg-[#5B75F8]/20 text-[#7B92FF] border border-[#5B75F8]/40 shadow-xs' : 'bg-[#5B75F8] text-white border-[#5B75F8] shadow-xs'
                : isDarkMode ? 'bg-slate-950/60 text-slate-400 border-slate-800 hover:text-white' : 'bg-slate-100 text-slate-600 border-slate-200 hover:text-slate-900'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>RBAC Matrix (12 Roles)</span>
          </button>

          <button
            onClick={() => setActiveTab('DATA_ADMIN')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap border ${
              activeTab === 'DATA_ADMIN'
                ? isDarkMode ? 'bg-[#5B75F8]/20 text-[#7B92FF] border border-[#5B75F8]/40 shadow-xs' : 'bg-[#5B75F8] text-white border-[#5B75F8] shadow-xs'
                : isDarkMode ? 'bg-slate-950/60 text-slate-400 border-slate-800 hover:text-white' : 'bg-slate-100 text-slate-600 border-slate-200 hover:text-slate-900'
            }`}
          >
            <HardDrive className="w-3.5 h-3.5" />
            <span>Data Control</span>
          </button>
        </div>

        {/* Search Bar & Actions */}
        {activeTab !== 'DATA_ADMIN' && activeTab !== 'RBAC_MATRIX' && (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            {activeTab === 'USERS' && (
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className={`px-3 py-2 rounded-2xl border text-xs font-bold font-mono outline-none cursor-pointer w-full sm:w-auto ${
                  isDarkMode ? 'bg-slate-950/80 border-slate-800 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                }`}
              >
                <option value="ALL">All Status ({users.length})</option>
                <option value="ACTIVE">Active Only ({users.filter(u => u.status === 'ACTIVE').length})</option>
                <option value="REVOKED">Revoked Only ({users.filter(u => u.status === 'REVOKED').length})</option>
              </select>
            )}

            <div className={`flex items-center gap-2 px-3.5 py-2 rounded-2xl border text-xs flex-1 transition-all ${
              isDarkMode ? 'bg-slate-950/80 border-slate-800 text-white focus-within:border-[#5B75F8]' : 'bg-slate-50 border-slate-200 text-slate-900 focus-within:border-[#5B75F8]'
            }`}>
              <Search className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <input
                type="text"
                placeholder={activeTab === 'AUDIT' ? "Filter audit logs by keyword..." : "Search users by name, email, role..."}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="bg-transparent outline-none w-full font-mono"
              />
              {searchTerm && (
                <button onClick={() => setSearchTerm('')} className="text-slate-400 hover:text-white cursor-pointer ml-1">
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: AUDIT TRAIL STREAM */}
      {/* ========================================================================= */}
      {activeTab === 'AUDIT' && (
        <div className="space-y-4">
          {!isOwnerAdmin ? (
            <div className={`p-10 rounded-3xl border text-center space-y-4 shadow-xl ${
              isDarkMode ? 'bg-rose-950/20 border-rose-500/30 text-rose-200' : 'bg-rose-50 border-rose-200 text-rose-900'
            }`}>
              <div className="inline-flex p-4 rounded-2xl bg-rose-500/20 text-rose-400 border border-rose-500/30 shadow-lg">
                <ShieldAlert className="w-8 h-8" />
              </div>
              <div className="text-base font-bold font-mono uppercase tracking-wider">Access Restricted (403 Forbidden)</div>
              <p className="text-xs max-w-md mx-auto text-slate-400">
                The Comprehensive Audit Trail & Append-Only Security Ledger is restricted exclusively to <strong>Owner / Managing Director</strong> and <strong>Super Admin</strong> roles. Your current role ({currentRole || 'Staff'}) is not authorized to inspect audit logs.
              </p>
            </div>
          ) : (
            <>
              {/* Header Badge & Stats */}
              <div className={`p-4 rounded-2xl border flex flex-wrap items-center justify-between gap-3 text-xs ${
                isDarkMode ? 'bg-indigo-950/20 border-indigo-500/30 text-indigo-200' : 'bg-indigo-50/80 border-indigo-200 text-indigo-900'
              }`}>
                <div className="flex items-center gap-2.5">
                  <div className="p-1.5 rounded-xl bg-indigo-500/20 border border-indigo-500/30 text-indigo-400">
                    <Lock className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="font-bold font-mono tracking-tight flex items-center gap-2">
                      <span>Append-Only Immutable Security Ledger</span>
                      <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[9px] font-bold flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping inline-block"></span>
                        DB TRIGGER ENFORCED • REAL-TIME
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-400 mt-0.5">
                      Captures WHO, WHAT, WHEN, WHERE, Before/After states across Orders, Inventory, Production, Quality, Dispatch, Finance, and Auth.
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className={`font-mono text-[11px] ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                    Showing <span className={`font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{filteredLogs.length}</span> of <span className="font-bold">{auditLogs.length}</span> recorded events
                  </div>

                  <button
                    type="button"
                    disabled={isExporting || filteredLogs.length === 0}
                    onClick={handleExportCSV}
                    className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-[#5B75F8] to-indigo-600 hover:from-indigo-600 hover:to-[#5B75F8] text-white text-xs font-bold font-mono flex items-center gap-1.5 cursor-pointer shadow-md shadow-[#5B75F8]/20 transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
                  >
                    {isExporting ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Download className="w-3.5 h-3.5" />
                    )}
                    <span>{copiedExport ? 'Exported!' : 'Export Log (CSV)'}</span>
                  </button>
                </div>
              </div>

              {/* Advanced Multi-Filter Toolbar */}
              <div className={`p-4 rounded-2xl border transition-all space-y-3 ${
                isDarkMode ? 'bg-slate-900/60 border-slate-800' : 'bg-slate-50 border-slate-200'
              }`}>
                {/* Category Pills */}
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-[11px] font-mono font-bold text-slate-400 mr-1 flex items-center gap-1">
                    <Filter className="w-3 h-3" /> Entity:
                  </span>
                  {(['ALL', 'SECURITY', 'ORDERS', 'PRODUCTION', 'INVENTORY', 'QUALITY', 'DISPATCH', 'FINANCE', 'MASTERS'] as SectionCategory[]).map(cat => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => {
                        setSelectedSection(cat);
                        setAuditPage(1);
                      }}
                      className={`px-2.5 py-1 rounded-xl text-[10px] font-mono font-bold transition-all cursor-pointer ${
                        selectedSection === cat
                          ? isDarkMode ? 'bg-[#5B75F8] text-white shadow-xs' : 'bg-[#5B75F8] text-white shadow-xs'
                          : isDarkMode ? 'bg-slate-950/60 text-slate-400 hover:text-white border border-slate-800' : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>

                {/* Secondary Filters Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-2.5 pt-1">
                  {/* Actor Dropdown */}
                  <div>
                    <label className="block text-[10px] font-mono text-slate-400 mb-1">Actor (WHO)</label>
                    <select
                      value={selectedActor}
                      onChange={(e) => {
                        setSelectedActor(e.target.value);
                        setAuditPage(1);
                      }}
                      className={`w-full px-2.5 py-1.5 rounded-xl border text-xs font-mono outline-none cursor-pointer ${
                        isDarkMode ? 'bg-slate-950/80 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
                      }`}
                    >
                      <option value="ALL">All Actors ({availableActors.length})</option>
                      {availableActors.map(act => (
                        <option key={act} value={act}>{act}</option>
                      ))}
                    </select>
                  </div>

                  {/* Action Type Dropdown */}
                  <div>
                    <label className="block text-[10px] font-mono text-slate-400 mb-1">Action Type (WHAT)</label>
                    <select
                      value={selectedActionType}
                      onChange={(e) => {
                        setSelectedActionType(e.target.value);
                        setAuditPage(1);
                      }}
                      className={`w-full px-2.5 py-1.5 rounded-xl border text-xs font-mono outline-none cursor-pointer ${
                        isDarkMode ? 'bg-slate-950/80 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
                      }`}
                    >
                      <option value="ALL">All Action Types ({availableActionTypes.length})</option>
                      {availableActionTypes.map(act => (
                        <option key={act} value={act}>{act}</option>
                      ))}
                    </select>
                  </div>

                  {/* From Date */}
                  <div>
                    <label className="block text-[10px] font-mono text-slate-400 mb-1 flex items-center gap-1">
                      <Calendar className="w-2.5 h-2.5" /> From Date
                    </label>
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => {
                        setStartDate(e.target.value);
                        setAuditPage(1);
                      }}
                      className={`w-full px-2.5 py-1.5 rounded-xl border text-xs font-mono outline-none ${
                        isDarkMode ? 'bg-slate-950/80 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
                      }`}
                    />
                  </div>

                  {/* To Date */}
                  <div>
                    <label className="block text-[10px] font-mono text-slate-400 mb-1 flex items-center gap-1">
                      <Calendar className="w-2.5 h-2.5" /> To Date
                    </label>
                    <input
                      type="date"
                      value={endDate}
                      onChange={(e) => {
                        setEndDate(e.target.value);
                        setAuditPage(1);
                      }}
                      className={`w-full px-2.5 py-1.5 rounded-xl border text-xs font-mono outline-none ${
                        isDarkMode ? 'bg-slate-950/80 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
                      }`}
                    />
                  </div>

                  {/* Clear Filters Button */}
                  <div className="flex items-end">
                    <button
                      type="button"
                      disabled={activeFiltersCount === 0}
                      onClick={handleClearFilters}
                      className={`w-full px-3 py-1.5 rounded-xl border text-xs font-mono font-bold flex items-center justify-center gap-1.5 transition-all ${
                        activeFiltersCount > 0
                          ? isDarkMode 
                            ? 'bg-slate-800/80 hover:bg-slate-700 text-amber-400 border-amber-500/30 cursor-pointer shadow-xs' 
                            : 'bg-white hover:bg-slate-100 text-amber-600 border-amber-300 cursor-pointer shadow-xs'
                          : 'opacity-40 cursor-not-allowed border-transparent text-slate-500'
                      }`}
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Clear Filters {activeFiltersCount > 0 ? `(${activeFiltersCount})` : ''}</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Mobile Audit Cards (Viewport < md) */}
              <div className="block md:hidden space-y-3">
                {paginatedLogs.length === 0 ? (
                  <div className={`p-8 text-center rounded-3xl border ${
                    isDarkMode ? 'bg-slate-900/60 border-slate-800 text-slate-400' : 'bg-white border-slate-200 text-slate-500'
                  }`}>
                    <Lock className="w-8 h-8 mx-auto mb-2 opacity-30" />
                    <p className="text-xs font-mono font-bold">No Audit Events Matching Active Filters</p>
                  </div>
                ) : (
                  paginatedLogs.map((log) => {
                    const secInfo = getSectionInfo(log.entity || log.entityType || '');
                    const isExpanded = !!expandedLogIds[log.id];

                    return (
                      <div
                        key={log.id}
                        onClick={() => toggleExpandLog(log.id)}
                        className={`p-3.5 rounded-3xl border transition-all space-y-2.5 cursor-pointer shadow-sm ${
                          isDarkMode ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200'
                        }`}
                      >
                        {/* Header: Action + Entity Pill */}
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase border ${secInfo.badgeClass}`}>
                              {log.entity || log.entityType}
                            </span>
                            <span className="font-mono font-bold text-xs text-[#5B75F8] dark:text-[#7B92FF]">
                              {log.action}
                            </span>
                          </div>
                          <span className="text-[10px] font-mono text-slate-400">
                            {log.when || log.timestamp || (log.createdAt ? new Date(log.createdAt).toLocaleTimeString('en-IN', { hour12: true }) : 'Recent')}
                          </span>
                        </div>

                        {/* Actor info & Details */}
                        <div>
                          <div className={`text-xs font-semibold ${isDarkMode ? 'text-slate-200' : 'text-slate-800'}`}>
                            {log.user || log.actorEmail}
                            {log.actorRole && (
                              <span className="ml-1.5 text-[9px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">
                                {log.actorRole}
                              </span>
                            )}
                          </div>
                          <p className={`text-xs mt-1 ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                            {log.details}
                          </p>
                        </div>

                        {/* Expanded Details Drawer on Mobile */}
                        {isExpanded && (
                          <div className={`pt-2.5 mt-2 border-t text-[11px] font-mono space-y-2 ${
                            isDarkMode ? 'border-slate-800 text-slate-300' : 'border-slate-200 text-slate-700'
                          }`}>
                            {log.entityId && <div>Entity ID: <strong>{log.entityId}</strong></div>}
                            {log.ipAddress && <div>IP Address: <strong>{log.ipAddress}</strong></div>}
                            {log.createdAt && <div>Timestamp: <strong>{new Date(log.createdAt).toLocaleString('en-IN', { hour12: true })}</strong></div>}
                            {log.metadata && (
                              <pre className="p-2 rounded-xl bg-slate-950 border border-slate-800 text-indigo-300 text-[10px] overflow-x-auto">
                                {JSON.stringify(log.metadata, null, 2)}
                              </pre>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>

              {/* Desktop Immutable Ledger Table (Viewport >= md) */}
              <div className={`hidden md:block rounded-3xl border overflow-hidden shadow-2xl transition-all ${
                isDarkMode ? 'bg-slate-900/80 border-slate-800/80 backdrop-blur-xl' : 'bg-white border-slate-200'
              }`}>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse font-sans">
                    <thead>
                      <tr className={`border-b font-mono font-bold text-[10px] uppercase tracking-wider ${
                        isDarkMode ? 'bg-slate-950/60 border-slate-800 text-slate-400' : 'bg-slate-50 border-slate-200 text-slate-600'
                      }`}>
                        <th className="py-4 px-4 w-10 text-center"></th>
                        <th className="py-4 px-4">Timestamp (WHEN)</th>
                        <th className="py-4 px-4">Actor (WHO)</th>
                        <th className="py-4 px-4">Entity & ID</th>
                        <th className="py-4 px-4">Action (WHAT)</th>
                        <th className="py-4 px-5">State Transition / Details</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200/80 dark:divide-slate-800/60 font-sans">
                      {paginatedLogs.length === 0 && (
                        <tr>
                          <td colSpan={6} className="p-10 text-center">
                            <div className={`inline-flex p-3 rounded-2xl border mb-3 ${
                              isDarkMode ? 'bg-slate-950/60 border-slate-800 text-slate-500' : 'bg-slate-50 border-slate-200 text-slate-400'
                            }`}>
                              <Lock className="w-6 h-6" />
                            </div>
                            <div className={`text-sm font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>No Audit Events Matching Active Filters</div>
                            <div className={`text-xs mt-1 font-mono ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                              Try clearing filters to view complete historical ledger records.
                            </div>
                          </td>
                        </tr>
                      )}
                      {paginatedLogs.map((log) => {
                        const secInfo = getSectionInfo(log.entity || log.entityType || '');
                        const isExpanded = !!expandedLogIds[log.id];

                        return (
                          <React.Fragment key={log.id}>
                            <tr 
                              onClick={() => toggleExpandLog(log.id)}
                              className={`cursor-pointer transition-colors ${
                                isDarkMode ? 'hover:bg-slate-800/50 text-slate-300' : 'hover:bg-slate-50 text-slate-700'
                              }`}
                            >
                              <td className="py-3.5 px-4 text-center text-slate-500 font-mono text-[10px]">
                                {isExpanded ? '▼' : '▶'}
                              </td>
                              <td className="py-3.5 px-4 font-mono text-[11px] text-slate-400 whitespace-nowrap">
                                {log.when || log.timestamp || (log.createdAt ? new Date(log.createdAt).toLocaleString('en-IN', { hour12: true }) : 'Recent')}
                              </td>
                              <td className="py-3.5 px-4">
                                <div className={`font-semibold ${isDarkMode ? 'text-slate-200' : 'text-slate-900'}`}>{log.user || log.actorEmail}</div>
                                {log.actorRole && (
                                  <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded ${
                                    isDarkMode ? 'bg-slate-800 text-slate-400 border border-slate-700' : 'bg-slate-100 text-slate-600 border border-slate-200'
                                  }`}>
                                    {log.actorRole}
                                  </span>
                                )}
                              </td>
                              <td className="py-3.5 px-4 font-mono">
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${secInfo.badgeClass}`}>
                                  {log.entity || log.entityType}
                                </span>
                                {log.entityId && (
                                  <div className="text-[10px] text-slate-400 font-mono mt-0.5">{log.entityId}</div>
                                )}
                              </td>
                              <td className={`py-3.5 px-4 font-mono font-bold ${isDarkMode ? 'text-slate-200' : 'text-slate-900'}`}>
                                {log.action}
                              </td>
                              <td className="py-3.5 px-5">
                                <div className="line-clamp-1">{log.details}</div>
                              </td>
                            </tr>

                            {isExpanded && (
                              <tr className={isDarkMode ? 'bg-slate-950/60' : 'bg-slate-50/80'}>
                                <td colSpan={6} className="p-4 pl-12 text-xs">
                                  <div className={`p-4 rounded-2xl border space-y-3 ${
                                    isDarkMode ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200'
                                  }`}>
                                    <div className={`font-mono font-bold ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>Full Change Record (Immutable Log)</div>
                                    <div className={isDarkMode ? 'text-slate-400' : 'text-slate-600'}>{log.details}</div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                      {log.beforeState && (
                                        <div>
                                          <div className={`text-[10px] font-mono uppercase font-bold mb-1 ${isDarkMode ? 'text-rose-400' : 'text-rose-600'}`}>Before State</div>
                                          <pre className={`p-2.5 rounded-xl border font-mono text-[10px] overflow-x-auto max-h-48 ${
                                            isDarkMode ? 'bg-slate-950 border-slate-800 text-rose-300' : 'bg-rose-50/60 border-rose-200 text-rose-700'
                                          }`}>
                                            {typeof log.beforeState === 'string' ? log.beforeState : JSON.stringify(log.beforeState, null, 2)}
                                          </pre>
                                        </div>
                                      )}
                                      {log.afterState && (
                                        <div>
                                          <div className={`text-[10px] font-mono uppercase font-bold mb-1 ${isDarkMode ? 'text-emerald-400' : 'text-emerald-600'}`}>After State</div>
                                          <pre className={`p-2.5 rounded-xl border font-mono text-[10px] overflow-x-auto max-h-48 ${
                                            isDarkMode ? 'bg-slate-950 border-slate-800 text-emerald-300' : 'bg-emerald-50/60 border-emerald-200 text-emerald-700'
                                          }`}>
                                            {typeof log.afterState === 'string' ? log.afterState : JSON.stringify(log.afterState, null, 2)}
                                          </pre>
                                        </div>
                                      )}
                                    </div>

                                    <div className={`flex flex-wrap gap-x-6 gap-y-1 font-mono text-[10px] ${isDarkMode ? 'text-slate-500' : 'text-slate-500'}`}>
                                      {log.entityId && <span>Entity ID: <span className={isDarkMode ? 'text-slate-300' : 'text-slate-700'}>{log.entityId}</span></span>}
                                      {log.ipAddress && <span>IP: <span className={isDarkMode ? 'text-slate-300' : 'text-slate-700'}>{log.ipAddress}</span></span>}
                                      {log.userAgent && <span className="truncate max-w-md">Agent: <span className={isDarkMode ? 'text-slate-300' : 'text-slate-700'}>{log.userAgent}</span></span>}
                                      {log.createdAt && <span>Recorded: <span className={isDarkMode ? 'text-slate-300' : 'text-slate-700'}>{new Date(log.createdAt).toLocaleString('en-IN', { hour12: true })}</span></span>}
                                    </div>

                                    {log.metadata && (
                                      <pre className={`p-2.5 rounded-xl border font-mono text-[10px] overflow-x-auto max-h-48 ${
                                        isDarkMode ? 'bg-slate-950 border-slate-800 text-indigo-300' : 'bg-indigo-50/60 border-indigo-200 text-indigo-700'
                                      }`}>
                                        {JSON.stringify(log.metadata, null, 2)}
                                      </pre>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            )}
                          </React.Fragment>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {totalAuditPages > 1 && (
                  <div className={`p-4 border-t flex items-center justify-between text-xs font-mono ${
                    isDarkMode ? 'border-slate-800 bg-slate-950/40 text-slate-400' : 'border-slate-200 bg-slate-50 text-slate-600'
                  }`}>
                    <div>
                      Showing <strong>{(auditPage - 1) * AUDIT_PAGE_SIZE + 1}</strong> to <strong>{Math.min(auditPage * AUDIT_PAGE_SIZE, filteredLogs.length)}</strong> of <strong>{filteredLogs.length}</strong> events
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        disabled={auditPage === 1}
                        onClick={() => setAuditPage(p => Math.max(1, p - 1))}
                        className={`px-3 py-1.5 rounded-xl border disabled:opacity-40 cursor-pointer transition-all ${
                          isDarkMode ? 'border-slate-700 hover:bg-slate-800' : 'border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        Previous
                      </button>
                      <span>Page {auditPage} of {totalAuditPages}</span>
                      <button
                        type="button"
                        disabled={auditPage === totalAuditPages}
                        onClick={() => setAuditPage(p => Math.min(totalAuditPages, p + 1))}
                        className={`px-3 py-1.5 rounded-xl border disabled:opacity-40 cursor-pointer transition-all ${
                          isDarkMode ? 'border-slate-700 hover:bg-slate-800' : 'border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        Next
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: USER DIRECTORY */}
      {/* ========================================================================= */}
      {activeTab === 'USERS' && (
        <div className="space-y-3">
          {/* Mobile User Directory Cards (Viewport < md) */}
          <div className="block md:hidden space-y-3">
            {filteredUsers.length === 0 ? (
              <div className={`p-8 text-center rounded-3xl border ${
                isDarkMode ? 'bg-slate-900/60 border-slate-800 text-slate-400' : 'bg-white border-slate-200 text-slate-500'
              }`}>
                <Users className="w-8 h-8 mx-auto mb-2 opacity-30" />
                <p className="text-xs font-mono">No system users found matching search filters.</p>
              </div>
            ) : (
              filteredUsers.map((usr) => {
                const isCurrent = usr.id === currentUserId;
                const isRevoked = usr.status === 'REVOKED' || usr.status === 'Inactive';
                const normRole = normalizeRole(usr.userRole || usr.role);
                const roleDef = RBAC_ROLE_MATRIX[normRole];

                return (
                  <div
                    key={usr.id}
                    className={`p-4 rounded-3xl border transition-all space-y-3 shadow-sm ${
                      isRevoked
                        ? isDarkMode ? 'bg-slate-950/70 border-rose-500/30' : 'bg-rose-50/40 border-rose-200'
                        : isDarkMode ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200'
                    }`}
                  >
                    {/* Header: Avatar, Name, Status */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center font-bold text-xs shadow-xs shrink-0">
                          {usr.name.slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <div className={`font-bold text-xs flex items-center gap-1.5 ${isDarkMode ? 'text-slate-100' : 'text-slate-900'}`}>
                            <span>{usr.name}</span>
                            {isCurrent && (
                              <span className="px-1.5 py-0.2 rounded bg-blue-500/20 text-blue-400 border border-blue-500/30 text-[9px] font-mono font-bold">
                                YOU
                              </span>
                            )}
                          </div>
                          <div className="text-[10px] font-mono text-slate-400">
                            {usr.code ? `${usr.code} • ` : ''}{usr.email}
                          </div>
                        </div>
                      </div>

                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-xl text-[10px] font-mono font-bold uppercase border shrink-0 ${
                        isRevoked 
                          ? isDarkMode ? 'bg-rose-500/10 text-rose-400 border-rose-500/30' : 'bg-rose-50 text-rose-700 border-rose-200'
                          : isDarkMode ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${isRevoked ? 'bg-rose-500' : 'bg-emerald-500'}`} />
                        <span>{usr.status}</span>
                      </span>
                    </div>

                    {/* Role & Department info */}
                    <div className={`p-2.5 rounded-2xl border space-y-1 text-xs font-mono ${
                      isDarkMode ? 'bg-slate-950/60 border-slate-800/80' : 'bg-slate-50 border-slate-200'
                    }`}>
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] text-slate-400">Role:</span>
                        <span className={`px-2 py-0.5 rounded-lg text-[10px] font-bold uppercase border whitespace-nowrap inline-flex items-center shrink-0 ${getRoleBadgeClasses(normRole)}`}>
                          {normRole}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-[10px] text-slate-400">Dept / Shift:</span>
                        <span className={isDarkMode ? 'text-slate-200' : 'text-slate-800'}>
                          {usr.department || 'Operations'} ({usr.shift || 'General'})
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-[10px] text-slate-400">Authority:</span>
                        <span className="text-emerald-400 font-bold">
                          {roleDef?.approvalLimitDisplay || 'Standard'}
                        </span>
                      </div>
                    </div>

                    {/* Governance Action Buttons */}
                    <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-slate-200 dark:border-slate-800/60">
                      <button
                        onClick={() => handleOpenEditUser(usr)}
                        className={`flex-1 py-2 rounded-xl border font-mono text-xs font-bold flex items-center justify-center gap-1 cursor-pointer transition-all ${
                          isDarkMode 
                            ? 'bg-indigo-500/15 text-indigo-300 border-indigo-500/30 hover:bg-indigo-500/25' 
                            : 'bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100'
                        }`}
                      >
                        <Edit className="w-3.5 h-3.5" />
                        <span>Edit</span>
                      </button>

                      <button
                        onClick={() => {
                          setUserToEditRole(usr);
                          setNewSelectedRole(normRole);
                          editRoleModal.open({ userId: usr.id });
                        }}
                        className={`flex-1 py-2 rounded-xl border font-mono text-xs font-bold flex items-center justify-center gap-1 cursor-pointer transition-all ${
                          isDarkMode 
                            ? 'bg-blue-500/15 text-blue-300 border-blue-500/30 hover:bg-blue-500/25' 
                            : 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100'
                        }`}
                      >
                        <Shield className="w-3.5 h-3.5" />
                        <span>Role</span>
                      </button>

                      {!isRevoked ? (
                        <button
                          onClick={() => onRevokeUser && onRevokeUser(usr.id)}
                          className={`px-3 py-2 rounded-xl border font-mono text-xs font-bold flex items-center justify-center gap-1 cursor-pointer transition-all ${
                            isDarkMode 
                              ? 'bg-amber-500/15 text-amber-300 border-amber-500/30 hover:bg-amber-500/25' 
                              : 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100'
                          }`}
                        >
                          <Ban className="w-3.5 h-3.5" />
                          <span>Revoke</span>
                        </button>
                      ) : (
                        <button
                          onClick={() => onRestoreUser && onRestoreUser(usr.id)}
                          className={`px-3 py-2 rounded-xl border font-mono text-xs font-bold flex items-center justify-center gap-1 cursor-pointer transition-all ${
                            isDarkMode 
                              ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/25' 
                              : 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                          }`}
                        >
                          <UserCheck className="w-3.5 h-3.5" />
                          <span>Restore</span>
                        </button>
                      )}

                      {!isCurrent && onDeleteUser && (
                        <button
                          onClick={() => {
                            setUserToDelete(usr);
                            deleteUserModal.open({ userId: usr.id });
                          }}
                          className={`p-2 rounded-xl border cursor-pointer transition-all ${
                            isDarkMode 
                              ? 'bg-rose-500/15 text-rose-400 border-rose-500/30 hover:bg-rose-500/25' 
                              : 'bg-rose-50 text-rose-600 border-rose-200 hover:bg-rose-100'
                          }`}
                          title="Delete User"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Desktop User Directory Table (Viewport >= md) */}
          <div className={`hidden md:block rounded-3xl border overflow-hidden shadow-2xl transition-all ${
            isDarkMode ? 'bg-slate-900/80 border-slate-800/80 backdrop-blur-xl' : 'bg-white border-slate-200'
          }`}>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse font-sans">
                <thead>
                  <tr className={`border-b font-mono font-bold text-[10px] uppercase tracking-wider ${
                    isDarkMode ? 'bg-slate-950/60 border-slate-800 text-slate-400' : 'bg-slate-50 border-slate-200 text-slate-600'
                  }`}>
                    <th className="py-4 px-5">User ID & Name</th>
                    <th className="py-4 px-5">Department & Shift</th>
                    <th className="py-4 px-5 whitespace-nowrap">Exact RBAC Role</th>
                    <th className="py-4 px-5">Approval Authority</th>
                    <th className="py-4 px-5 text-center">Status</th>
                    <th className="py-4 px-5 text-right">User Governance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200/80 dark:divide-slate-800/60 font-sans">
                  {filteredUsers.map((usr) => {
                    const isCurrent = usr.id === currentUserId;
                    const isRevoked = usr.status === 'REVOKED' || usr.status === 'Inactive';
                    const normRole = normalizeRole(usr.userRole || usr.role);
                    const roleDef = RBAC_ROLE_MATRIX[normRole];

                    return (
                      <tr key={usr.id} className={isDarkMode ? 'hover:bg-slate-800/40' : 'hover:bg-slate-50/80'}>
                        <td className="py-4 px-5">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-2xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center font-bold text-xs shadow-xs">
                              {usr.name.slice(0, 2).toUpperCase()}
                            </div>
                            <div>
                              <div className={`font-bold text-xs flex items-center gap-1.5 ${isDarkMode ? 'text-slate-100' : 'text-slate-900'}`}>
                                <span>{usr.name}</span>
                                {usr.code && <span className="font-mono text-[10px] text-indigo-400">({usr.code})</span>}
                                {isCurrent && (
                                  <span className="px-2 py-0.5 rounded-md bg-blue-500/20 text-blue-400 border border-blue-500/30 text-[9px] font-mono font-bold">
                                    ACTIVE YOU
                                  </span>
                                )}
                              </div>
                              <div className={`text-[11px] font-mono ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                                {usr.email} • +91 {usr.mobile || usr.phone || '9822000000'}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className={`py-4 px-5 ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                          <div className="font-medium">{usr.department || 'Operations'}</div>
                          <div className="text-[10px] text-slate-400 font-mono">{usr.shift || 'General-Day'}</div>
                        </td>
                        <td className="py-4 px-5 whitespace-nowrap">
                          <span className={`px-2.5 py-1 rounded-xl text-[10px] font-mono font-bold uppercase border whitespace-nowrap inline-flex items-center gap-1 shrink-0 ${getRoleBadgeClasses(normRole)}`}>
                            {normRole}
                          </span>
                        </td>
                        <td className="py-4 px-5 font-mono text-[11px]">
                          <div className="text-slate-300">{roleDef?.approvalLimitDisplay || 'Standard View/Edit'}</div>
                          {roleDef?.scopeDescription && (
                            <div className="text-[10px] text-slate-500 max-w-xs truncate mt-0.5">{roleDef.scopeDescription}</div>
                          )}
                        </td>
                        <td className="py-4 px-5 text-center">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-[10px] font-mono font-bold uppercase border ${
                            isRevoked 
                              ? isDarkMode ? 'bg-rose-500/10 text-rose-400 border-rose-500/30' : 'bg-rose-50 text-rose-700 border-rose-200'
                              : isDarkMode ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                          }`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${isRevoked ? 'bg-rose-500' : 'bg-emerald-500'}`} />
                            <span>{usr.status}</span>
                          </span>
                        </td>
                        <td className="py-4 px-5 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => handleOpenEditUser(usr)}
                              className={`p-1.5 px-2.5 rounded-xl border text-[11px] font-bold font-mono transition-all cursor-pointer flex items-center gap-1 ${
                                isDarkMode 
                                  ? 'border-indigo-500/30 bg-indigo-500/10 text-indigo-300 hover:text-white hover:bg-indigo-500/20' 
                                  : 'border-indigo-200 bg-indigo-50 text-indigo-700 hover:bg-indigo-100'
                              }`}
                              title="Edit User Master Record"
                            >
                              <Edit className="w-3 h-3 text-indigo-400" />
                              <span>Edit</span>
                            </button>

                            <button
                              onClick={() => {
                                setUserToEditRole(usr);
                                setNewSelectedRole(normRole);
                                editRoleModal.open({ userId: usr.id });
                              }}
                              className={`p-1.5 px-2.5 rounded-xl border text-[11px] font-bold font-mono transition-all cursor-pointer flex items-center gap-1 ${
                                isDarkMode 
                                  ? 'bg-blue-500/10 text-blue-300 border-blue-500/30 hover:bg-blue-500/20' 
                                  : 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100'
                              }`}
                              title="Modify Role"
                            >
                              <Shield className="w-3.5 h-3.5" />
                              <span>Role</span>
                            </button>

                            {!isRevoked ? (
                              <button
                                onClick={() => onRevokeUser && onRevokeUser(usr.id)}
                                className={`p-1.5 px-2 rounded-xl border text-[11px] font-bold font-mono transition-all cursor-pointer flex items-center gap-1 ${
                                  isDarkMode 
                                    ? 'bg-amber-500/10 text-amber-300 border-amber-500/30 hover:bg-amber-500/20' 
                                    : 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100'
                                }`}
                                title="Revoke Access"
                              >
                                <Ban className="w-3.5 h-3.5" />
                                <span>Revoke</span>
                              </button>
                            ) : (
                              <button
                                onClick={() => onRestoreUser && onRestoreUser(usr.id)}
                                className={`p-1.5 px-2 rounded-xl border text-[11px] font-bold font-mono transition-all cursor-pointer flex items-center gap-1 ${
                                  isDarkMode 
                                    ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/20' 
                                    : 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                                }`}
                                title="Restore Access"
                              >
                                <UserCheck className="w-3.5 h-3.5" />
                                <span>Restore</span>
                              </button>
                            )}

                            {!isCurrent && onDeleteUser && (
                              <button
                                onClick={() => {
                                  setUserToDelete(usr);
                                  deleteUserModal.open({ userId: usr.id });
                                }}
                                className={`p-1.5 px-2 rounded-xl border text-[11px] font-bold font-mono transition-all cursor-pointer flex items-center gap-1 ${
                                  isDarkMode 
                                    ? 'bg-rose-500/10 text-rose-300 border-rose-500/30 hover:bg-rose-500/20' 
                                    : 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100'
                                }`}
                                title="Delete User Permanently"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: EXACT 12-ROLE RBAC MATRIX & MONETARY APPROVAL LIMITS */}
      {/* ========================================================================= */}
      {activeTab === 'RBAC_MATRIX' && (
        <div className="space-y-6">
          
          {/* Policy Summary Telemetry Strip */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className={`p-4 rounded-3xl border ${isDarkMode ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200 shadow-sm'}`}>
              <div className="flex items-center gap-2 text-indigo-400 mb-1">
                <ShieldCheck className="w-4 h-4" />
                <span className="text-[11px] font-mono font-bold uppercase">12 Business Roles Matrix</span>
              </div>
              <div className={`text-xl font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>Strict Per-Module Policy</div>
              <p className={`text-[11px] mt-1 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                Every request verifies module access level (No Access, View Only, Create-Edit, Full-Approve).
              </p>
            </div>

            <div className={`p-4 rounded-3xl border ${isDarkMode ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200 shadow-sm'}`}>
              <div className="flex items-center gap-2 text-emerald-400 mb-1">
                <DollarSign className="w-4 h-4" />
                <span className="text-[11px] font-mono font-bold uppercase">Server-Side Monetary Ceilings</span>
              </div>
              <div className="text-xl font-bold text-emerald-600 dark:text-emerald-400">PO: ₹1.0L • Pay: ₹50k</div>
              <p className={`text-[11px] mt-1 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                Purchases above ₹1L and disbursements above ₹50k automatically route escalation tickets to the Owner.
              </p>
            </div>

            <div className={`p-4 rounded-3xl border ${isDarkMode ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200 shadow-sm'}`}>
              <div className="flex items-center gap-2 text-amber-400 mb-1">
                <Filter className="w-4 h-4" />
                <span className="text-[11px] font-mono font-bold uppercase">Row-Level Query Scopes</span>
              </div>
              <div className="text-xl font-bold text-amber-600 dark:text-amber-500">3 Hardened Boundary Scopes</div>
              <p className={`text-[11px] mt-1 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                HR/Admin scoped to Users only; Operator to own job cards; PPC/Dispatch commercial fields locked.
              </p>
            </div>
          </div>

          {/* Full Role Matrix Cards */}
          <div className="grid grid-cols-1 gap-4">
            {Object.values(RBAC_ROLE_MATRIX).map((rDef) => {
              const modules = Object.entries(rDef.permissions);

              return (
                <div 
                  key={rDef.role}
                  className={`p-5 rounded-3xl border transition-all ${
                    isDarkMode ? 'bg-slate-900/70 border-slate-800/80' : 'bg-white border-slate-200 shadow-sm'
                  }`}
                >
                  <div className={`flex flex-wrap items-center justify-between gap-3 pb-3 border-b ${
                    isDarkMode ? 'border-slate-800/60' : 'border-slate-200'
                  }`}>
                    <div className="flex items-center gap-3">
                      <div className={`px-3 py-1 rounded-xl text-xs font-mono font-bold uppercase border whitespace-nowrap inline-flex items-center shrink-0 ${getRoleBadgeClasses(rDef.role)}`}>
                        {rDef.role}
                      </div>
                      <div>
                        <h3 className={`font-bold text-sm ${isDarkMode ? 'text-slate-100' : 'text-slate-900'}`}>{rDef.label}</h3>
                        <div className={`text-[11px] font-mono ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>{rDef.category} Category</div>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`px-3 py-1 rounded-xl text-xs font-mono font-bold flex items-center gap-1.5 ${
                        rDef.role === 'Owner' || rDef.role === 'Admin (System)'
                          ? 'bg-rose-500/15 text-rose-500 dark:text-rose-400 border border-rose-500/30'
                          : rDef.approvalLimitDisplay.includes('₹')
                          ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                          : isDarkMode
                          ? 'bg-slate-800 text-slate-400 border border-slate-700'
                          : 'bg-slate-100 text-slate-600 border border-slate-200'
                      }`}>
                        <DollarSign className="w-3.5 h-3.5" />
                        <span>Limit: {rDef.approvalLimitDisplay}</span>
                      </span>

                      {rDef.scopeDescription && (
                        <span className={`px-3 py-1 rounded-xl text-[11px] font-mono border ${
                          isDarkMode ? 'bg-indigo-500/10 text-indigo-300 border-indigo-500/20' : 'bg-indigo-50 text-indigo-700 border-indigo-200'
                        }`}>
                          {rDef.scopeDescription}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Modules Access Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-2.5 mt-4">
                    {modules.map(([modKey, rule]) => {
                      const accessColor =
                        rule.accessLevel === 'FULL_APPROVE'
                          ? isDarkMode ? 'bg-purple-500/15 text-purple-300 border-purple-500/40 font-bold' : 'bg-purple-50 text-purple-700 border-purple-300/60 font-bold'
                          : rule.accessLevel === 'CREATE_EDIT'
                          ? isDarkMode ? 'bg-blue-500/15 text-blue-300 border-blue-500/40 font-bold' : 'bg-blue-50 text-blue-700 border-blue-300/60 font-bold'
                          : rule.accessLevel === 'VIEW_ONLY'
                          ? isDarkMode ? 'bg-amber-500/15 text-amber-300 border-amber-500/40' : 'bg-amber-50 text-amber-700 border-amber-300/60'
                          : isDarkMode
                          ? 'bg-slate-800/40 text-slate-500 border-slate-800'
                          : 'bg-slate-100 text-slate-500 border-slate-200';

                      return (
                        <div
                          key={modKey}
                          className={`p-2.5 rounded-2xl border text-xs flex flex-col justify-between ${
                            isDarkMode ? 'bg-slate-950/50 border-slate-800/60' : 'bg-slate-50 border-slate-200'
                          }`}
                        >
                          <div className={`text-[11px] font-mono uppercase font-bold ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>{modKey}</div>
                          <div className="mt-2">
                            <span className={`px-2 py-0.5 rounded-lg text-[10px] font-mono uppercase border inline-block ${accessColor}`}>
                              {rule.accessLevel.replace('_', ' ')}
                            </span>
                            {rule.approvalLimit && (
                              <div className="text-[9px] text-emerald-600 dark:text-emerald-400 font-mono mt-1">
                                Max ₹{rule.approvalLimit.toLocaleString('en-IN')}
                              </div>
                            )}
                            {rule.scopeRule && rule.scopeRule !== 'ALL' && (
                              <div className="text-[9px] text-indigo-600 dark:text-indigo-400 font-mono mt-0.5 truncate">
                                [{rule.scopeRule}]
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: DATA CONTROL SUITE */}
      {/* ========================================================================= */}
      {activeTab === 'DATA_ADMIN' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 font-sans">
          <div className={`p-6 rounded-3xl border lg:col-span-2 space-y-4 ${
            isDarkMode ? 'bg-slate-900/80 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
          }`}>
            <h2 className="text-base font-bold flex items-center gap-2">
              <Download className="w-5 h-5 text-indigo-400" />
              <span>Bulk Data Export Suite</span>
            </h2>
            <p className="text-xs text-slate-400">
              Select module datasets to download as formatted JSON schemas or CSV records for external audit and compliance backup.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <div>
                <label className="block text-[11px] font-mono text-slate-400 mb-1">Target Module Dataset</label>
                <select
                  value={selectedExportSection}
                  onChange={(e) => setSelectedExportSection(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-slate-800 border border-slate-700 text-xs text-white"
                >
                  <option value="ALL">Entire System Snapshot (All 19 Modules)</option>
                  <option value="AUDIT">Audit Trail Logs</option>
                  <option value="ORDERS">Customer Orders</option>
                  <option value="INVENTORY">Inventory & Stock</option>
                  <option value="PRODUCTION">Job Cards & Production Logs</option>
                  <option value="QUALITY">QC & PDI Inspections</option>
                  <option value="DISPATCH">Dispatch Challans</option>
                  <option value="INVOICES">Commercial Invoices</option>
                  <option value="PAYABLES">Vendor Bills</option>
                  <option value="MASTERS">Master Data (Customers, Vendors, Items)</option>
                  <option value="USERS">User Accounts & RBAC Matrix</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-mono text-slate-400 mb-1">Export File Format</label>
                <select
                  value={exportFormat}
                  onChange={(e) => setExportFormat(e.target.value as any)}
                  className="w-full p-2.5 rounded-xl bg-slate-800 border border-slate-700 text-xs text-white"
                >
                  <option value="JSON">Structured JSON (.json)</option>
                  <option value="CSV">Comma-Separated Values (.csv)</option>
                </select>
              </div>
            </div>

            <div className="pt-3">
              <button
                onClick={handleDownloadSection}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#5B75F8] to-indigo-600 text-white font-bold text-xs flex items-center gap-2 cursor-pointer shadow-lg shadow-[#5B75F8]/20 hover:scale-[1.02] active:scale-[0.98] transition-all"
              >
                <Download className="w-4 h-4" />
                <span>Generate & Download {selectedExportSection} {exportFormat}</span>
              </button>
            </div>
          </div>

          <div className={`p-6 rounded-3xl border space-y-4 ${
            isDarkMode ? 'bg-slate-900/80 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
          }`}>
            <h2 className="text-base font-bold flex items-center gap-2 text-amber-400">
              <RotateCcw className="w-5 h-5 text-amber-400" />
              <span>Seed & Purge Controls</span>
            </h2>
            <p className="text-xs text-slate-400">
              Administrative actions for database seed management.
            </p>

            {onResetAllData && (
              <button
                onClick={() => {
                  if (window.confirm('Reset and repopulate all 19 system tables with clean test seed records?')) {
                    onResetAllData();
                  }
                }}
                className="w-full p-3 rounded-xl border border-indigo-500/30 bg-indigo-500/10 text-indigo-300 hover:bg-indigo-500/20 text-xs font-bold font-mono transition-all text-left flex items-center gap-2"
              >
                <RotateCcw className="w-4 h-4 text-indigo-400" />
                <span>Populate Test Seed Data</span>
              </button>
            )}

            {onClearOperationalData && (
              <button
                onClick={() => purgeModal.open()}
                className="w-full p-3 rounded-xl border border-rose-500/30 bg-rose-500/10 text-rose-300 hover:bg-rose-500/20 text-xs font-bold font-mono transition-all text-left flex items-center gap-2"
              >
                <Trash2 className="w-4 h-4 text-rose-400" />
                <span>Purge Operational Logs</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 1: PROVISION NEW USER (LIGHT THEME & PASSWORD WORKFLOW) */}
      {/* ========================================================================= */}
      <Modal
        isOpen={addUserModal.isOpen}
        onClose={() => addUserModal.close()}
        maxWidth="4xl"
        isDarkMode={isDarkMode}
        icon={<Users className="w-5 h-5" />}
        title="Provision New System User"
        subtitle={`User ID: ${uCode} • Role-Driven RBAC & Module Access Matrix`}
        footer={
          <div className="flex items-center justify-end gap-3 w-full">
            <button
              type="button"
              onClick={() => addUserModal.close()}
              className={`px-4 py-2.5 rounded-xl font-bold transition-all cursor-pointer ${
                isDarkMode 
                  ? 'text-slate-400 hover:text-white hover:bg-slate-800' 
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              Cancel
            </button>
            <button
              type="submit"
              form="provision-user-form"
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#5B75F8] to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-indigo-500/25 hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer"
            >
              <Check className="w-4 h-4" />
              <span>Provision System User</span>
            </button>
          </div>
        }
      >
        <form id="provision-user-form" onSubmit={handleCreateUser} className="space-y-4 text-xs">
          
          {/* Row 1: User ID, Full Name, Employee Code */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className={`block text-[11px] font-mono font-semibold mb-1 ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                User ID (Auto)
              </label>
              <input
                type="text"
                value={uCode}
                readOnly
                className={`w-full p-2.5 rounded-xl border text-xs font-mono cursor-not-allowed ${
                  isDarkMode ? 'bg-slate-800/40 border-slate-700 text-slate-400' : 'bg-slate-100 border-slate-200 text-slate-500'
                }`}
              />
            </div>
            <div>
              <label className={`block text-[11px] font-mono font-semibold mb-1 ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                Full Name *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Ramesh Kulkarni"
                value={uFullName}
                onChange={(e) => setUFullName(e.target.value)}
                className={`w-full p-2.5 rounded-xl border text-xs outline-none transition-all ${
                  userErrors.fullName 
                    ? 'border-rose-500 ring-1 ring-rose-500' 
                    : isDarkMode ? 'bg-slate-950 border-slate-800 text-white focus:border-indigo-500' : 'bg-slate-50 border-slate-300 text-slate-900 focus:border-indigo-500 focus:bg-white'
                }`}
              />
              {userErrors.fullName && <p className="text-[10px] text-rose-500 font-medium mt-0.5">{userErrors.fullName}</p>}
            </div>
            <div>
              <label className={`block text-[11px] font-mono font-semibold mb-1 ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                Employee Code *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. EMP-1048"
                value={uEmployeeCode}
                onChange={(e) => setUEmployeeCode(e.target.value)}
                className={`w-full p-2.5 rounded-xl border text-xs font-mono outline-none transition-all ${
                  isDarkMode ? 'bg-slate-950 border-slate-800 text-white focus:border-indigo-500' : 'bg-slate-50 border-slate-300 text-slate-900 focus:border-indigo-500 focus:bg-white'
                }`}
              />
            </div>
          </div>

          {/* Row 2: Mobile Number, Email Address */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className={`block text-[11px] font-mono font-semibold mb-1 ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                Mobile Number (10-digit) *
              </label>
              <div className="relative">
                <Phone className="w-3.5 h-3.5 absolute left-3 top-3 text-slate-400" />
                <input
                  type="tel"
                  required
                  maxLength={10}
                  placeholder="9876543210"
                  value={uMobile}
                  onChange={(e) => setUMobile(e.target.value.replace(/\D/g, ''))}
                  className={`w-full pl-9 p-2.5 rounded-xl border text-xs font-mono outline-none transition-all ${
                    userErrors.mobile 
                      ? 'border-rose-500 ring-1 ring-rose-500' 
                      : isDarkMode ? 'bg-slate-950 border-slate-800 text-white focus:border-indigo-500' : 'bg-slate-50 border-slate-300 text-slate-900 focus:border-indigo-500 focus:bg-white'
                  }`}
                />
              </div>
              {userErrors.mobile && <p className="text-[10px] text-rose-500 font-medium mt-0.5">{userErrors.mobile}</p>}
            </div>
            <div>
              <label className={`block text-[11px] font-mono font-semibold mb-1 ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                Email Address (Login Identity) *
              </label>
              <div className="relative">
                <Mail className="w-3.5 h-3.5 absolute left-3 top-3 text-slate-400" />
                <input
                  type="email"
                  required
                  placeholder="ramesh@guruom.in"
                  value={uEmail}
                  onChange={(e) => setUEmail(e.target.value)}
                  className={`w-full pl-9 p-2.5 rounded-xl border text-xs font-mono outline-none transition-all ${
                    userErrors.email 
                      ? 'border-rose-500 ring-1 ring-rose-500' 
                      : isDarkMode ? 'bg-slate-950 border-slate-800 text-white focus:border-indigo-500' : 'bg-slate-50 border-slate-300 text-slate-900 focus:border-indigo-500 focus:bg-white'
                  }`}
                />
              </div>
              {userErrors.email && <p className="text-[10px] text-rose-500 font-medium mt-0.5">{userErrors.email}</p>}
            </div>
          </div>

          {/* Row 2.5: Set Password & Confirm Password (NEW DIRECT PROVISIONING WORKFLOW) */}
          <div className={`p-3.5 rounded-2xl border ${
            isDarkMode ? 'bg-slate-800/40 border-slate-700/60' : 'bg-slate-50/80 border-slate-200'
          } space-y-3`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Key className="w-3.5 h-3.5 text-indigo-500" />
                <span className={`text-[11px] font-mono font-bold uppercase ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                  Admin Initial Credentials
                </span>
              </div>
              <button
                type="button"
                onClick={handleGeneratePassword}
                className="px-2.5 py-1 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 text-[10px] font-mono font-bold flex items-center gap-1 hover:bg-indigo-500/20 transition-all cursor-pointer"
              >
                <Sparkles className="w-3 h-3" />
                <span>Generate Strong Password</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Set Password Field */}
              <div>
                <label className={`block text-[10px] font-mono font-semibold mb-1 ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                  Set Password *
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    placeholder="Min 8 chars (letters + numbers)"
                    value={uPassword}
                    onChange={(e) => {
                      setUPassword(e.target.value);
                      setCopiedPassword(false);
                    }}
                    className={`w-full pr-16 p-2.5 rounded-xl border text-xs font-mono outline-none transition-all ${
                      userErrors.password 
                        ? 'border-rose-500 ring-1 ring-rose-500' 
                        : isDarkMode ? 'bg-slate-950 border-slate-800 text-white focus:border-indigo-500' : 'bg-white border-slate-300 text-slate-900 focus:border-indigo-500'
                    }`}
                  />
                  <div className="absolute right-2 top-2 flex items-center gap-1">
                    {uPassword && (
                      <button
                        type="button"
                        onClick={() => {
                          if (navigator.clipboard) {
                            navigator.clipboard.writeText(uPassword);
                            setCopiedPassword(true);
                            setTimeout(() => setCopiedPassword(false), 2500);
                          }
                        }}
                        title={copiedPassword ? 'Copied!' : 'Copy Password'}
                        className={`p-1 rounded-lg transition-all ${
                          copiedPassword ? 'text-emerald-500' : 'text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        {copiedPassword ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="p-1 text-slate-400 hover:text-slate-200 transition-all cursor-pointer"
                    >
                      {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>
                {userErrors.password && <p className="text-[10px] text-rose-500 font-medium mt-0.5">{userErrors.password}</p>}
              </div>

              {/* Confirm Password Field */}
              <div>
                <label className={`block text-[10px] font-mono font-semibold mb-1 ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                  Confirm Password *
                </label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    required
                    placeholder="Re-enter same password"
                    value={uConfirmPassword}
                    onChange={(e) => setUConfirmPassword(e.target.value)}
                    className={`w-full pr-9 p-2.5 rounded-xl border text-xs font-mono outline-none transition-all ${
                      userErrors.confirmPassword 
                        ? 'border-rose-500 ring-1 ring-rose-500' 
                        : isDarkMode ? 'bg-slate-950 border-slate-800 text-white focus:border-indigo-500' : 'bg-white border-slate-300 text-slate-900 focus:border-indigo-500'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="p-1 absolute right-2 top-2 text-slate-400 hover:text-slate-200 transition-all cursor-pointer"
                  >
                    {showConfirmPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
                {userErrors.confirmPassword && <p className="text-[10px] text-rose-500 font-medium mt-0.5">{userErrors.confirmPassword}</p>}
              </div>
            </div>

            {/* Force Password Change on First Login Checkbox */}
            <label className="flex items-center gap-2 pt-1 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={uRequirePasswordChange}
                onChange={(e) => setURequirePasswordChange(e.target.checked)}
                className="w-3.5 h-3.5 rounded text-indigo-600 focus:ring-0 cursor-pointer"
              />
              <span className={`text-[11px] font-mono ${isDarkMode ? 'text-slate-300' : 'text-slate-600'}`}>
                Require password change on first login
              </span>
            </label>
          </div>

          {/* Row 3: Reporting Manager, Department, Access Status */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className={`block text-[11px] font-mono font-semibold mb-1 ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                Reporting Manager
              </label>
              <select
                value={uReportingManager}
                onChange={(e) => setUReportingManager(e.target.value)}
                className={`w-full p-2.5 rounded-xl border text-xs outline-none transition-all cursor-pointer ${
                  isDarkMode ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                }`}
              >
                <option value="">-- Select Manager --</option>
                {users.map(u => (
                  <option key={u.id} value={u.name}>{u.name} ({u.role})</option>
                ))}
              </select>
            </div>
            <div>
              <label className={`block text-[11px] font-mono font-semibold mb-1 ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                Department *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Production Operations"
                value={uDepartment}
                onChange={(e) => setUDepartment(e.target.value)}
                className={`w-full p-2.5 rounded-xl border text-xs outline-none transition-all ${
                  userErrors.department 
                    ? 'border-rose-500 ring-1 ring-rose-500' 
                    : isDarkMode ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                }`}
              />
              {userErrors.department && <p className="text-[10px] text-rose-500 font-medium mt-0.5">{userErrors.department}</p>}
            </div>
            <div>
              <label className={`block text-[11px] font-mono font-semibold mb-1 ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                Account Status *
              </label>
              <select
                value={uStatus}
                onChange={(e) => setUStatus(e.target.value as any)}
                className={`w-full p-2.5 rounded-xl border text-xs outline-none transition-all cursor-pointer ${
                  isDarkMode ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                }`}
              >
                <option value="Active">Active (Production Access)</option>
                <option value="Inactive">Inactive (Suspended)</option>
              </select>
            </div>
          </div>

          {/* Row 4: Primary RBAC Role Selection */}
          <div>
            <label className={`block text-[11px] font-mono font-semibold mb-1.5 ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
              Primary System Role & Access Privilege *
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {Object.values(RBAC_ROLE_MATRIX).map((r) => {
                const isSelected = uUserRole === r.role || uUserRole === r.label;
                return (
                  <div
                    key={r.role}
                    onClick={() => handleRoleSelect(r.label)}
                    className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-start gap-3 ${
                      isSelected
                        ? isDarkMode 
                          ? 'border-indigo-500/80 bg-indigo-500/10 shadow-sm' 
                          : 'border-indigo-600 bg-indigo-50/80 shadow-sm ring-1 ring-indigo-500/20'
                        : isDarkMode
                          ? 'border-slate-800 bg-slate-950/40 hover:border-slate-700'
                          : 'border-slate-200 bg-slate-50 hover:bg-slate-100/80'
                    }`}
                  >
                    <div className={`w-4 h-4 mt-0.5 rounded-full border flex items-center justify-center ${
                      isSelected ? 'border-indigo-500 bg-indigo-500 text-white' : 'border-slate-400'
                    }`}>
                      {isSelected && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <span className={`font-bold text-xs ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{r.label}</span>
                        <span className={`px-1.5 py-0.5 rounded-md text-[9px] font-mono font-bold uppercase border whitespace-nowrap inline-flex items-center shrink-0 ${getRoleBadgeClasses(r.role)}`}>
                          {r.role}
                        </span>
                      </div>
                      <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-mono mt-0.5">
                        Approval Limit: {r.approvalLimitDisplay}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Row 5: Modules Granted */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className={`block text-[11px] font-mono font-semibold ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                Granular Module Permissions ({uModulesAccess.length} assigned)
              </label>
              <span className={`text-[10px] font-mono ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                Auto-synced with Role Matrix
              </span>
            </div>
            <div className={`p-3 rounded-2xl border grid grid-cols-2 sm:grid-cols-4 gap-2 max-h-40 overflow-y-auto ${
              isDarkMode ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50 border-slate-200'
            }`}>
              {ALL_MODULES.map((mod) => {
                const isChecked = uModulesAccess.includes(mod.id);
                return (
                  <label
                    key={mod.id}
                    onClick={() => toggleModuleAccess(mod.id)}
                    className={`p-2 rounded-xl border flex items-center gap-2 cursor-pointer transition-all ${
                      isChecked
                        ? isDarkMode
                          ? 'border-indigo-500/50 bg-indigo-500/10 text-white'
                          : 'border-indigo-400 bg-indigo-50/80 text-slate-900 font-medium'
                        : isDarkMode
                          ? 'border-slate-800/80 bg-slate-900/40 text-slate-400 hover:text-slate-200'
                          : 'border-slate-200 bg-white text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => {}}
                      className="w-4 h-4 rounded text-indigo-600 focus:ring-0 cursor-pointer"
                    />
                    <div className="overflow-hidden">
                      <div className="text-[11px] leading-tight truncate">{mod.name}</div>
                      <div className={`text-[9px] font-mono ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>{mod.category}</div>
                    </div>
                  </label>
                );
              })}
            </div>
          </div>

        </form>
      </Modal>

      {/* ========================================================================= */}
      {/* MODAL 1B: EDIT USER MASTER RECORD */}
      {/* ========================================================================= */}
      <Modal
        isOpen={editUserModal.isOpen && !!userToEdit}
        onClose={() => {
          editUserModal.close();
          setUserToEdit(null);
        }}
        maxWidth="2xl"
        isDarkMode={isDarkMode}
        icon={<Edit className="w-5 h-5 text-indigo-400" />}
        title="Edit User Master Record"
        subtitle={`Update credentials & identity for ${userToEdit?.name || userToEdit?.email}`}
        footer={
          <div className="flex items-center justify-end gap-3 w-full">
            <button 
              type="button" 
              onClick={() => {
                editUserModal.close();
                setUserToEdit(null);
              }} 
              className={`px-5 py-2.5 rounded-2xl border text-xs font-mono font-bold transition-all cursor-pointer ${
                isDarkMode ? 'border-slate-700 text-slate-300 hover:bg-slate-800' : 'border-slate-300 text-slate-700 hover:bg-slate-100'
              }`}
            >
              Cancel
            </button>
            <button 
              type="button"
              onClick={handleSaveEditUser}
              className="px-6 py-2.5 rounded-2xl bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-600 text-white font-bold text-xs font-mono shadow-lg shadow-indigo-500/25 cursor-pointer transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              Save Master Changes
            </button>
          </div>
        }
      >
        <form onSubmit={handleSaveEditUser} className="space-y-4 text-xs font-sans">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Full Name */}
            <div>
              <label className={`block text-[11px] uppercase font-mono font-bold mb-1 ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                Full Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={editFullName}
                onChange={e => setEditFullName(e.target.value)}
                placeholder="e.g. Sachin Gharbude"
                className={`w-full p-2.5 rounded-xl border text-xs font-mono ${
                  editUserErrors.fullName ? 'border-rose-500 ring-1 ring-rose-500' : isDarkMode ? 'border-slate-800 bg-slate-950 text-white' : 'border-slate-300 bg-white text-slate-900'
                }`}
              />
              {editUserErrors.fullName && <p className="text-[10px] text-rose-500 mt-1">{editUserErrors.fullName}</p>}
            </div>

            {/* Email */}
            <div>
              <label className={`block text-[11px] uppercase font-mono font-bold mb-1 ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                Email Address (Login ID) <span className="text-rose-500">*</span>
              </label>
              <input
                type="email"
                value={editEmail}
                onChange={e => setEditEmail(e.target.value)}
                placeholder="e.g. owner@guruom.in"
                className={`w-full p-2.5 rounded-xl border text-xs font-mono ${
                  editUserErrors.email ? 'border-rose-500 ring-1 ring-rose-500' : isDarkMode ? 'border-slate-800 bg-slate-950 text-white' : 'border-slate-300 bg-white text-slate-900'
                }`}
              />
              {editUserErrors.email && <p className="text-[10px] text-rose-500 mt-1">{editUserErrors.email}</p>}
            </div>

            {/* Exact RBAC Role */}
            <div>
              <label className={`block text-[11px] uppercase font-mono font-bold mb-1 ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                Exact RBAC Role <span className="text-rose-500">*</span>
              </label>
              <select
                value={editRole}
                onChange={e => setEditRole(e.target.value)}
                className={`w-full p-2.5 rounded-xl border text-xs font-mono ${
                  isDarkMode ? 'border-slate-800 bg-slate-950 text-white' : 'border-slate-300 bg-white text-slate-900'
                }`}
              >
                {Object.values(RBAC_ROLE_MATRIX).map(r => (
                  <option key={r.role} value={r.role}>
                    {r.label} ({r.role})
                  </option>
                ))}
              </select>
            </div>

            {/* Department */}
            <div>
              <label className={`block text-[11px] uppercase font-mono font-bold mb-1 ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                Department / Functional Unit <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={editDepartment}
                onChange={e => setEditDepartment(e.target.value)}
                placeholder="e.g. Executive Management / Plant Operations"
                className={`w-full p-2.5 rounded-xl border text-xs font-mono ${
                  editUserErrors.department ? 'border-rose-500 ring-1 ring-rose-500' : isDarkMode ? 'border-slate-800 bg-slate-950 text-white' : 'border-slate-300 bg-white text-slate-900'
                }`}
              />
              {editUserErrors.department && <p className="text-[10px] text-rose-500 mt-1">{editUserErrors.department}</p>}
            </div>

            {/* Mobile */}
            <div>
              <label className={`block text-[11px] uppercase font-mono font-bold mb-1 ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                Mobile Number
              </label>
              <input
                type="text"
                value={editMobile}
                onChange={e => setEditMobile(e.target.value)}
                placeholder="e.g. +91 98250 12345"
                className={`w-full p-2.5 rounded-xl border text-xs font-mono ${
                  isDarkMode ? 'border-slate-800 bg-slate-950 text-white' : 'border-slate-300 bg-white text-slate-900'
                }`}
              />
            </div>

            {/* Reporting Manager */}
            <div>
              <label className={`block text-[11px] uppercase font-mono font-bold mb-1 ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                Reporting Manager
              </label>
              <select
                value={editReportingManager}
                onChange={e => setEditReportingManager(e.target.value)}
                className={`w-full p-2.5 rounded-xl border text-xs font-mono ${
                  isDarkMode ? 'border-slate-800 bg-slate-950 text-white' : 'border-slate-300 bg-white text-slate-900'
                }`}
              >
                <option value="">None / Top Level Executive</option>
                {users
                  .filter(u => u.id !== userToEdit?.id)
                  .map(u => (
                    <option key={u.id} value={u.name}>
                      {u.name} ({u.email})
                    </option>
                  ))}
              </select>
            </div>

            {/* Account Status */}
            <div>
              <label className={`block text-[11px] uppercase font-mono font-bold mb-1 ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                Account Status
              </label>
              <div className="flex gap-4 items-center mt-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="editStatus"
                    checked={editStatus === 'Active'}
                    onChange={() => setEditStatus('Active')}
                    className="text-indigo-600"
                  />
                  <span className={isDarkMode ? 'text-slate-300' : 'text-slate-700'}>Active (Full Access)</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="editStatus"
                    checked={editStatus === 'Inactive'}
                    onChange={() => setEditStatus('Inactive')}
                    className="text-indigo-600"
                  />
                  <span className={isDarkMode ? 'text-slate-300' : 'text-slate-700'}>Inactive / Revoked</span>
                </label>
              </div>
            </div>
          </div>
        </form>
      </Modal>

      {/* ========================================================================= */}
      {/* MODAL 2: EDIT USER ROLE */}
      {/* ========================================================================= */}
      <Modal
        isOpen={editRoleModal.isOpen && !!userToEditRole}
        onClose={() => {
          editRoleModal.close();
          setUserToEditRole(null);
        }}
        maxWidth="lg"
        isDarkMode={isDarkMode}
        icon={<Shield className="w-5 h-5" />}
        title="Update RBAC Role"
        subtitle={`Modify permissions for ${userToEditRole?.name} (${userToEditRole?.email})`}
        footer={
          <div className="flex items-center justify-end gap-3 w-full">
            <button 
              type="button" 
              onClick={() => {
                editRoleModal.close();
                setUserToEditRole(null);
              }} 
              className={`px-5 py-2.5 rounded-2xl border text-xs font-mono font-bold transition-all cursor-pointer ${
                isDarkMode ? 'border-slate-700 text-slate-300 hover:bg-slate-800' : 'border-slate-300 text-slate-700 hover:bg-slate-100'
              }`}
            >
              Cancel
            </button>
            <button 
              type="button"
              onClick={() => {
                if (onUpdateUserRole && userToEditRole) {
                  onUpdateUserRole(userToEditRole.id, newSelectedRole);
                }
                editRoleModal.close();
                setUserToEditRole(null);
              }}
              className="px-6 py-2.5 rounded-2xl bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-600 text-white font-bold text-xs font-mono shadow-lg shadow-blue-500/25 cursor-pointer transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              Save Role Change
            </button>
          </div>
        }
      >
        <div className="space-y-2.5">
          <label className={`block text-[11px] uppercase font-mono font-bold ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
            Select Exact Access Role
          </label>
          {Object.values(RBAC_ROLE_MATRIX).map(r => {
            const isSelected = newSelectedRole === r.role;
            return (
              <div
                key={r.role}
                onClick={() => setNewSelectedRole(r.role)}
                className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-start gap-3 ${
                  isSelected
                    ? isDarkMode ? 'border-blue-500/60 bg-blue-500/10 shadow-sm' : 'border-blue-600 bg-blue-50 shadow-sm ring-1 ring-blue-500/20'
                    : isDarkMode ? 'border-slate-800 bg-slate-950/50 hover:border-slate-700' : 'border-slate-200 bg-slate-50 hover:bg-slate-100'
                }`}
              >
                <div className={`w-4 h-4 mt-0.5 rounded-full border flex items-center justify-center ${
                  isSelected ? 'border-blue-500 bg-blue-500 text-white' : 'border-slate-400'
                }`}>
                  {isSelected && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className={`font-bold text-xs ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                      {r.label}
                    </span>
                    <span className={`px-2 py-0.5 rounded-lg text-[9px] font-mono font-bold uppercase border whitespace-nowrap inline-flex items-center shrink-0 ${getRoleBadgeClasses(r.role)}`}>
                      {r.role}
                    </span>
                  </div>
                  <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-mono mt-0.5">
                    Approval Limit: {r.approvalLimitDisplay}
                  </div>
                  {r.scopeDescription && (
                    <div className={`text-[10px] mt-0.5 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                      {r.scopeDescription}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </Modal>

      {/* ========================================================================= */}
      {/* MODAL 3: DELETE CONFIRMATION */}
      {/* ========================================================================= */}
      <Modal
        isOpen={deleteUserModal.isOpen && !!userToDelete}
        onClose={() => {
          deleteUserModal.close();
          setUserToDelete(null);
        }}
        maxWidth="md"
        isDarkMode={isDarkMode}
        icon={<Trash2 className="w-5 h-5" />}
        title="Delete User Account?"
        subtitle="Permanent account removal"
        footer={
          <div className="flex justify-end gap-3 w-full">
            <button
              onClick={() => {
                deleteUserModal.close();
                setUserToDelete(null);
              }}
              className={`px-4 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                isDarkMode ? 'border-slate-800 text-slate-300 hover:bg-slate-800' : 'border-slate-200 text-slate-700 hover:bg-slate-100'
              }`}
            >
              Cancel
            </button>
            <button
              onClick={() => {
                if (onDeleteUser && userToDelete) {
                  onDeleteUser(userToDelete.id);
                }
                deleteUserModal.close();
                setUserToDelete(null);
              }}
              className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-md shadow-rose-500/20 cursor-pointer"
            >
              Confirm Delete
            </button>
          </div>
        }
      >
        <p className={`text-xs leading-relaxed ${isDarkMode ? 'text-slate-300' : 'text-slate-600'}`}>
          Are you sure you want to permanently delete <strong className="text-rose-500">{userToDelete?.name}</strong> ({userToDelete?.email})? All active sessions for this account will be invalidated immediately.
        </p>
      </Modal>

      {/* ========================================================================= */}
      {/* MODAL 4: PURGE OPERATIONAL DATA CONFIRMATION */}
      {/* ========================================================================= */}
      <Modal
        isOpen={purgeModal.isOpen}
        onClose={() => purgeModal.close()}
        maxWidth="md"
        isDarkMode={isDarkMode}
        icon={<AlertTriangle className="w-5 h-5" />}
        title="Purge Operational Data?"
        subtitle="Orders, Job Cards, QC & Invoices Reset"
        footer={
          <div className="flex justify-end gap-3 w-full">
            <button
              onClick={() => purgeModal.close()}
              className={`px-4 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                isDarkMode ? 'border-slate-800 text-slate-300 hover:bg-slate-800' : 'border-slate-200 text-slate-700 hover:bg-slate-100'
              }`}
            >
              Cancel
            </button>
            <button
              onClick={() => {
                if (onClearOperationalData) onClearOperationalData();
                purgeModal.close();
              }}
              className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-md shadow-rose-500/20 cursor-pointer"
            >
              Confirm Purge
            </button>
          </div>
        }
      >
        <p className={`text-xs leading-relaxed ${isDarkMode ? 'text-slate-300' : 'text-slate-600'}`}>
          Are you sure you want to clear operational queues? Masters (Items, Customers, Vendors) and Users will remain preserved.
        </p>
      </Modal>
    </div>
  );
};

export default UsersAuditView;
