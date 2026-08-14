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
  HardDrive
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
import { getRoleColor } from '../../../utils/permissions';

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
  onAddUser?: (user: Partial<SystemUser>) => void;
  onSwitchUser?: (userId: string) => void;
  onRevokeUser?: (userId: string) => void;
  onRestoreUser?: (userId: string) => void;
  onUpdateUserRole?: (userId: string, role: UserRole) => void;
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

export const ROLE_DEFINITIONS: { role: UserRole; label: string; desc: string }[] = [
  { role: 'SUPER ADMIN', label: 'Super Admin', desc: 'Full root access to all ERP modules, configuration, user management, and system data.' },
  { role: 'OPERATOR', label: 'Shop Floor Operator', desc: 'Access to Orders, Job Cards, Inventory, Production Logging, Quality, and Dispatch.' },
  { role: 'QC_MANAGER', label: 'Quality Control Manager', desc: 'Authorized to conduct and approve QC stages, defect categorization, and PDI certificates.' },
  { role: 'DISPATCH_CLERK', label: 'Dispatch & Logistics Clerk', desc: 'Authorized to generate delivery challans, schedule transporters, and generate dispatch invoices.' },
  { role: 'FINANCE_MANAGER', label: 'Finance & Accounts Manager', desc: 'Authorized for commercial invoicing, vendor bills disbursement, approvals, and financial reports.' }
];

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
  onAddUser,
  onSwitchUser,
  onRevokeUser,
  onRestoreUser,
  onUpdateUserRole,
  onDeleteUser,
  onResetAllData,
  onClearOperationalData
}) => {
  const [activeTab, setActiveTab] = useState<'AUDIT' | 'USERS' | 'DATA_ADMIN'>('AUDIT');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'REVOKED'>('ALL');
  const [selectedSection, setSelectedSection] = useState<SectionCategory>('ALL');
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [showPurgeModal, setShowPurgeModal] = useState(false);
  const [copiedExport, setCopiedExport] = useState(false);

  // Edit Role State
  const [showEditRoleModal, setShowEditRoleModal] = useState(false);
  const [userToEditRole, setUserToEditRole] = useState<SystemUser | null>(null);
  const [newSelectedRole, setNewSelectedRole] = useState<UserRole>('OPERATOR');

  // Delete User State
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [userToDelete, setUserToDelete] = useState<SystemUser | null>(null);

  // Download Suite State
  const [selectedExportSection, setSelectedExportSection] = useState<string>('ALL');
  const [exportFormat, setExportFormat] = useState<'JSON' | 'CSV'>('JSON');

  // New User Form State
  const [userName, setUserName] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [userRole, setUserRole] = useState<UserRole>('OPERATOR');
  const [userDepartment, setUserDepartment] = useState('Shop Floor Operations');
  const [userPhone, setUserPhone] = useState('');

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

  const filteredLogs = auditLogs.filter(log => {
    const actor = (log.user || log.actorEmail || '').toLowerCase();
    const act = (log.action || '').toLowerCase();
    const det = (log.details || '').toLowerCase();
    const ent = (log.entity || log.entityType || '').toLowerCase();
    const search = searchTerm.toLowerCase();

    const matchesSearch = actor.includes(search) || act.includes(search) || det.includes(search) || ent.includes(search);
    
    if (selectedSection === 'ALL') return matchesSearch;
    const secInfo = getSectionInfo(log.entity || log.entityType || '');
    return matchesSearch && secInfo.category === selectedSection;
  });

  const totalAuditPages = Math.max(1, Math.ceil(filteredLogs.length / AUDIT_PAGE_SIZE));
  const paginatedLogs = filteredLogs.slice((auditPage - 1) * AUDIT_PAGE_SIZE, auditPage * AUDIT_PAGE_SIZE);

  const filteredUsers = users.filter(usr => {
    const matchesSearch = 
      usr.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      usr.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      usr.department.toLowerCase().includes(searchTerm.toLowerCase());
    
    if (statusFilter === 'ALL') return matchesSearch;
    return matchesSearch && usr.status === statusFilter;
  });

  const handleExportCSV = () => {
    if (auditLogs.length === 0) return;
    const headers = 'ID,Timestamp,User,Category,Action,Details\n';
    const rows = auditLogs.map(l => 
      `"${l.id}","${l.when}","${l.user}","${l.entity}","${l.action}","${l.details.replace(/"/g, '""')}"`
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
    if (!userName || !userEmail) return;

    if (onAddUser) {
      onAddUser({
        name: userName,
        email: userEmail,
        role: userRole,
        department: userDepartment,
        phone: userPhone,
        status: 'ACTIVE'
      });
    }

    setShowAddUserModal(false);
    setUserName('');
    setUserEmail('');
  };

  return (
    <div className="space-y-6 font-sans">
      
      {/* Top Banner Header */}
      <div className={`p-6 rounded-3xl border transition-all ${
        isDarkMode 
          ? 'bg-slate-900/80 border-slate-800/80 text-white backdrop-blur-xl shadow-2xl' 
          : 'bg-white border-slate-200 shadow-sm text-slate-900'
      }`}>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider ${
                isDarkMode ? 'bg-[#5B75F8]/20 text-[#7B92FF] border border-[#5B75F8]/30' : 'bg-[#5B75F8]/10 text-[#5B75F8] border border-[#5B75F8]/20'
              }`}>
                Identity & Administration
              </span>
              <span className="text-xs text-slate-400 font-mono">• Compliance & System Data Control</span>
            </div>
            <h1 className={`text-2xl font-bold tracking-tight ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
              Admin Control & System Data Suite
            </h1>
            <p className={`text-xs mt-1 max-w-xl ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
              Provision system users, inspect security audit logs, reset test seed metrics, or export section datasets as JSON/CSV.
            </p>
          </div>

          <div className="flex items-center gap-3">
            {activeTab === 'AUDIT' && (
              <button
                onClick={handleExportCSV}
                className="px-4 py-2.5 rounded-2xl bg-gradient-to-r from-[#5B75F8] to-blue-600 text-white font-bold text-xs flex items-center gap-2 cursor-pointer shadow-lg shadow-[#5B75F8]/20 hover:scale-[1.02] active:scale-[0.98] transition-all"
              >
                {copiedExport ? <Check className="w-4 h-4" /> : <Download className="w-4 h-4" />}
                <span>{copiedExport ? 'Exported Log!' : 'Export Log CSV'}</span>
              </button>
            )}

            {activeTab === 'USERS' && onAddUser && (
              <button
                onClick={() => setShowAddUserModal(true)}
                className="px-4 py-2.5 rounded-2xl bg-gradient-to-r from-[#5B75F8] to-indigo-600 text-white font-bold text-xs flex items-center gap-2 cursor-pointer shadow-lg shadow-[#5B75F8]/20 hover:scale-[1.02] active:scale-[0.98] transition-all"
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
                className="px-4 py-2.5 rounded-2xl bg-gradient-to-r from-[#5B75F8] to-indigo-600 text-white font-bold text-xs flex items-center gap-2 cursor-pointer shadow-lg shadow-[#5B75F8]/20 hover:scale-[1.02] active:scale-[0.98] transition-all"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Populate Test Seed Data</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main Tab Controls Bar */}
      <div className={`p-4 rounded-3xl border transition-all flex flex-wrap items-center justify-between gap-4 ${
        isDarkMode ? 'bg-slate-900/70 border-slate-800/80 backdrop-blur-xl' : 'bg-white border-slate-200 shadow-xs'
      }`}>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('AUDIT')}
            className={`px-4 py-2 rounded-2xl text-xs font-mono font-bold transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === 'AUDIT'
                ? isDarkMode ? 'bg-[#5B75F8]/20 text-[#7B92FF] border border-[#5B75F8]/40 shadow-xs' : 'bg-[#5B75F8] text-white shadow-xs'
                : isDarkMode ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            <span>Audit Trail Stream ({auditLogs.length})</span>
          </button>
          
          <button
            onClick={() => setActiveTab('USERS')}
            className={`px-4 py-2 rounded-2xl text-xs font-mono font-bold transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === 'USERS'
                ? isDarkMode ? 'bg-[#5B75F8]/20 text-[#7B92FF] border border-[#5B75F8]/40 shadow-xs' : 'bg-[#5B75F8] text-white shadow-xs'
                : isDarkMode ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>User Directory ({users.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('DATA_ADMIN')}
            className={`px-4 py-2 rounded-2xl text-xs font-mono font-bold transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === 'DATA_ADMIN'
                ? isDarkMode ? 'bg-[#5B75F8]/20 text-[#7B92FF] border border-[#5B75F8]/40 shadow-xs' : 'bg-[#5B75F8] text-white shadow-xs'
                : isDarkMode ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <HardDrive className="w-3.5 h-3.5" />
            <span>Data Control & Log Export Suite</span>
          </button>
        </div>

        {/* Search Bar & Actions for AUDIT / USERS */}
        {activeTab !== 'DATA_ADMIN' && (
          <div className="flex items-center gap-3">
            {activeTab === 'USERS' && (
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className={`px-3 py-1.5 rounded-2xl border text-xs font-bold font-mono outline-none cursor-pointer ${
                  isDarkMode ? 'bg-slate-950/80 border-slate-800 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                }`}
              >
                <option value="ALL">All Status ({users.length})</option>
                <option value="ACTIVE">Active Only ({users.filter(u => u.status === 'ACTIVE').length})</option>
                <option value="REVOKED">Revoked Only ({users.filter(u => u.status === 'REVOKED').length})</option>
              </select>
            )}

            <div className={`flex items-center gap-2 px-3.5 py-1.5 rounded-2xl border text-xs w-56 ${
              isDarkMode ? 'bg-slate-950/80 border-slate-800 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
            }`}>
              <Search className="w-3.5 h-3.5 text-slate-400" />
              <input
                type="text"
                placeholder={activeTab === 'AUDIT' ? "Filter logs..." : "Search users..."}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="bg-transparent outline-none w-full"
              />
            </div>

            {activeTab === 'USERS' && (
              <button
                onClick={() => setShowAddUserModal(true)}
                className="px-4 py-1.5 rounded-2xl bg-gradient-to-r from-[#5B75F8] to-indigo-600 hover:from-indigo-600 hover:to-[#5B75F8] text-white font-bold text-xs font-mono flex items-center gap-1.5 cursor-pointer shadow-md shadow-[#5B75F8]/20 transition-all hover:scale-[1.02]"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add User</span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* TAB 1: AUDIT TRAIL STREAM */}
      {activeTab === 'AUDIT' && (
        <div className="space-y-4">
          {/* Append-Only Immutability Security Banner */}
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
                  <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[9px] font-bold">
                    DB TRIGGER ENFORCED
                  </span>
                </div>
                <div className="text-[11px] text-slate-400 mt-0.5">
                  Records full WHO, WHAT, WHEN, WHERE, BEFORE, and AFTER history. Mutation or deletion of logs is strictly prohibited.
                </div>
              </div>
            </div>

            <div className="font-mono text-[11px] text-slate-400">
              Total Recorded Events: <span className="font-bold text-white">{filteredLogs.length}</span>
            </div>
          </div>

          <div className={`rounded-3xl border overflow-hidden shadow-2xl transition-all ${
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
                  {paginatedLogs.map((log) => {
                    const secInfo = getSectionInfo(log.entity || log.entityType || '');
                    const Icon = secInfo.icon;
                    const isExpanded = !!expandedLogIds[log.id];

                    // Determine changed keys if before/after states exist
                    const allKeys = Array.from(new Set([
                      ...Object.keys(log.beforeState || {}),
                      ...Object.keys(log.afterState || {})
                    ]));
                    const changedKeys = allKeys.filter(k => {
                      const b = log.beforeState ? log.beforeState[k] : undefined;
                      const a = log.afterState ? log.afterState[k] : undefined;
                      return JSON.stringify(b) !== JSON.stringify(a);
                    });

                    return (
                      <React.Fragment key={log.id}>
                        <tr 
                          onClick={() => toggleExpandLog(log.id)}
                          className={`cursor-pointer transition-colors ${
                            isDarkMode ? 'hover:bg-slate-800/40' : 'hover:bg-slate-50/80'
                          } ${isExpanded ? (isDarkMode ? 'bg-slate-800/20' : 'bg-slate-50/50') : ''}`}
                        >
                          <td className="py-4 px-4 text-center">
                            <button
                              type="button"
                              className="p-1 rounded-lg hover:bg-slate-800 text-slate-400"
                              title={isExpanded ? 'Collapse Diff' : 'Inspect State Diff'}
                            >
                              <span className="font-mono text-xs font-bold">{isExpanded ? '▼' : '▶'}</span>
                            </button>
                          </td>
                          <td className={`py-4 px-4 font-mono text-[11px] whitespace-nowrap ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                            {log.when}
                          </td>
                          <td className="py-4 px-4">
                            <div className="font-bold text-xs truncate max-w-[160px] text-slate-900 dark:text-slate-100">
                              {log.user || log.actorEmail}
                            </div>
                            {log.ipAddress && (
                              <div className="text-[10px] font-mono text-slate-500">
                                IP: {log.ipAddress}
                              </div>
                            )}
                          </td>
                          <td className="py-4 px-4">
                            <div className="flex items-center gap-1.5">
                              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-mono font-bold uppercase border ${secInfo.badgeClass}`}>
                                <Icon className="w-2.5 h-2.5" />
                                <span>{secInfo.label}</span>
                              </span>
                            </div>
                            {log.entityId && (
                              <span className="text-[10px] font-mono text-slate-400 block mt-0.5 truncate max-w-[120px]">
                                ID: #{log.entityId}
                              </span>
                            )}
                          </td>
                          <td className="py-4 px-4 font-mono text-xs text-blue-500 font-bold uppercase whitespace-nowrap">
                            {log.action}
                          </td>
                          <td className={`py-4 px-5 ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                            <div>{log.details}</div>
                            {changedKeys.length > 0 && !isExpanded && (
                              <div className="flex flex-wrap items-center gap-1.5 mt-1">
                                {changedKeys.slice(0, 3).map(k => (
                                  <span key={k} className="px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20 text-[10px] font-mono">
                                    Δ {k}: {String(log.beforeState?.[k] ?? 'null')} → {String(log.afterState?.[k] ?? 'null')}
                                  </span>
                                ))}
                                {changedKeys.length > 3 && (
                                  <span className="text-[10px] font-mono text-slate-500">
                                    +{changedKeys.length - 3} more
                                  </span>
                                )}
                              </div>
                            )}
                          </td>
                        </tr>

                        {/* Expandable State Transition Diff Row */}
                        {isExpanded && (
                          <tr className={isDarkMode ? 'bg-slate-950/60' : 'bg-slate-100/60'}>
                            <td colSpan={6} className="p-4 pl-12 pr-6">
                              <div className="space-y-3 font-mono">
                                <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] pb-2 border-b border-slate-800">
                                  <div className="flex items-center gap-4 text-slate-400">
                                    <span><strong>Actor:</strong> {log.user || log.actorEmail}</span>
                                    {log.actorId && <span><strong>Actor ID:</strong> {log.actorId}</span>}
                                    {log.ipAddress && <span><strong>IP:</strong> {log.ipAddress}</span>}
                                    {log.userAgent && <span><strong>Client:</strong> {log.userAgent}</span>}
                                  </div>
                                  <span className="px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold uppercase">
                                    Append-Only Immutability Verified
                                  </span>
                                </div>

                                {/* Before vs After Visual Diff */}
                                {changedKeys.length > 0 ? (
                                  <div className="space-y-2">
                                    <div className="text-[11px] font-bold uppercase text-slate-400">
                                      Changed State Fields ({changedKeys.length}):
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                      <div className="p-3 rounded-xl bg-rose-950/20 border border-rose-500/30 space-y-1.5">
                                        <div className="text-[10px] uppercase font-bold text-rose-400">
                                          - BEFORE STATE (Previous)
                                        </div>
                                        {changedKeys.map(k => (
                                          <div key={`before-${k}`} className="text-xs">
                                            <span className="text-slate-400 font-bold">{k}: </span>
                                            <span className="text-rose-300 font-bold">
                                              {typeof log.beforeState?.[k] === 'object' 
                                                ? JSON.stringify(log.beforeState?.[k]) 
                                                : String(log.beforeState?.[k] ?? 'null')}
                                            </span>
                                          </div>
                                        ))}
                                      </div>

                                      <div className="p-3 rounded-xl bg-emerald-950/20 border border-emerald-500/30 space-y-1.5">
                                        <div className="text-[10px] uppercase font-bold text-emerald-400">
                                          + AFTER STATE (Mutated)
                                        </div>
                                        {changedKeys.map(k => (
                                          <div key={`after-${k}`} className="text-xs">
                                            <span className="text-slate-400 font-bold">{k}: </span>
                                            <span className="text-emerald-300 font-bold">
                                              {typeof log.afterState?.[k] === 'object' 
                                                ? JSON.stringify(log.afterState?.[k]) 
                                                : String(log.afterState?.[k] ?? 'null')}
                                            </span>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  </div>
                                ) : (
                                  <div className="text-xs text-slate-400 italic">
                                    Initial creation or atomic event without prior baseline state.
                                  </div>
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

            {/* Pagination Controls Footer (50 rows/page) */}
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
                    className="px-3 py-1.5 rounded-xl border border-slate-700 hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                  >
                    Previous
                  </button>
                  <span>Page {auditPage} of {totalAuditPages}</span>
                  <button
                    type="button"
                    disabled={auditPage === totalAuditPages}
                    onClick={() => setAuditPage(p => Math.min(totalAuditPages, p + 1))}
                    className="px-3 py-1.5 rounded-xl border border-slate-700 hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: USER DIRECTORY */}
      {activeTab === 'USERS' && (
        <div className={`rounded-3xl border overflow-hidden shadow-2xl transition-all ${
          isDarkMode ? 'bg-slate-900/80 border-slate-800/80 backdrop-blur-xl' : 'bg-white border-slate-200'
        }`}>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse font-sans">
              <thead>
                <tr className={`border-b font-mono font-bold text-[10px] uppercase tracking-wider ${
                  isDarkMode ? 'bg-slate-950/60 border-slate-800 text-slate-400' : 'bg-slate-50 border-slate-200 text-slate-600'
                }`}>
                  <th className="py-4 px-5">User Name & Identity</th>
                  <th className="py-4 px-5">Department</th>
                  <th className="py-4 px-5">Access Role Matrix</th>
                  <th className="py-4 px-5">Last Activity</th>
                  <th className="py-4 px-5 text-center">Status</th>
                  <th className="py-4 px-5 text-right">User Governance & Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200/80 dark:divide-slate-800/60 font-sans">
                {filteredUsers.map((usr) => {
                  const isCurrent = usr.id === currentUserId;
                  const isRevoked = usr.status === 'REVOKED';
                  return (
                    <tr key={usr.id} className={isDarkMode ? 'hover:bg-slate-800/40' : 'hover:bg-slate-50/80'}>
                      <td className="py-4 px-5">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-2xl bg-blue-500/20 text-blue-400 border border-blue-500/30 flex items-center justify-center font-bold text-xs shadow-xs">
                            {usr.name.slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <div className={`font-bold text-xs flex items-center gap-1.5 ${isDarkMode ? 'text-slate-100' : 'text-slate-900'}`}>
                              <span>{usr.name}</span>
                              {isCurrent && (
                                <span className="px-2 py-0.5 rounded-md bg-blue-500/20 text-blue-400 border border-blue-500/30 text-[9px] font-mono font-bold">
                                  ACTIVE YOU
                                </span>
                              )}
                            </div>
                            <div className={`text-[11px] font-mono ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                              {usr.email}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className={`py-4 px-5 font-medium ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                        {usr.department || 'Operations'}
                      </td>
                      <td className="py-4 px-5">
                        <span className={`px-2.5 py-1 rounded-xl text-[10px] font-mono font-bold uppercase border ${getRoleColor(usr.role)}`}>
                          {usr.role}
                        </span>
                      </td>
                      <td className={`py-4 px-5 font-mono text-[11px] ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                        {usr.lastLogin || 'Never'}
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
                          {/* 1. Edit Role Button */}
                          <button
                            onClick={() => {
                              setUserToEditRole(usr);
                              setNewSelectedRole(usr.role);
                              setShowEditRoleModal(true);
                            }}
                            className={`p-1.5 px-2.5 rounded-xl border text-[11px] font-bold font-mono transition-all cursor-pointer flex items-center gap-1 ${
                              isDarkMode 
                                ? 'border-slate-800 bg-slate-950/70 text-slate-300 hover:text-white hover:bg-slate-800 hover:border-slate-700' 
                                : 'border-slate-200 bg-slate-50 text-slate-700 hover:text-slate-900 hover:bg-slate-100'
                            }`}
                            title="Edit Role Matrix"
                          >
                            <Shield className="w-3 h-3 text-blue-400" />
                            <span>Role</span>
                          </button>

                          {/* 2. Revoke / Restore Toggle */}
                          {!isRevoked ? (
                            <button
                              onClick={() => onRevokeUser && onRevokeUser(usr.id)}
                              className={`p-1.5 px-2.5 rounded-xl border text-[11px] font-bold font-mono transition-all cursor-pointer flex items-center gap-1 ${
                                isDarkMode 
                                  ? 'border-amber-500/30 bg-amber-500/10 text-amber-300 hover:bg-amber-500/20' 
                                  : 'border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100'
                              }`}
                              title="Revoke access"
                            >
                              <Ban className="w-3 h-3" />
                              <span>Revoke</span>
                            </button>
                          ) : (
                            <button
                              onClick={() => onRestoreUser && onRestoreUser(usr.id)}
                              className={`p-1.5 px-2.5 rounded-xl border text-[11px] font-bold font-mono transition-all cursor-pointer flex items-center gap-1 ${
                                isDarkMode 
                                  ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20' 
                                  : 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                              }`}
                              title="Restore access"
                            >
                              <UserCheck className="w-3 h-3" />
                              <span>Restore</span>
                            </button>
                          )}

                          {/* 3. Delete User Button (for other users) */}
                          {!isCurrent && onDeleteUser && (
                            <button
                              onClick={() => {
                                setUserToDelete(usr);
                                setShowDeleteModal(true);
                              }}
                              className={`p-1.5 px-2 rounded-xl border text-[11px] font-bold font-mono transition-all cursor-pointer flex items-center gap-1 ${
                                isDarkMode 
                                  ? 'border-rose-500/30 bg-rose-500/10 text-rose-300 hover:bg-rose-500/20' 
                                  : 'border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100'
                              }`}
                              title="Delete user permanently"
                            >
                              <Trash2 className="w-3 h-3 text-rose-400" />
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
      )}

      {/* TAB 3: DATA CONTROL & LOG EXPORT SUITE */}
      {activeTab === 'DATA_ADMIN' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 font-sans">
          
          {/* Card 1: Seed Factory Test Metrics */}
          <div className={`p-6 rounded-3xl border flex flex-col justify-between space-y-4 shadow-xl ${
            isDarkMode ? 'bg-slate-900/80 border-slate-800 backdrop-blur-xl' : 'bg-white border-slate-200'
          }`}>
            <div>
              <div className="flex items-center gap-3 mb-3">
                <div className="p-3 rounded-2xl bg-blue-500/15 text-blue-400 border border-blue-500/30">
                  <RotateCcw className="w-5 h-5" />
                </div>
                <div>
                  <h3 className={`font-bold text-base ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                    Seed Factory Test Metrics
                  </h3>
                  <p className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                    Populate complete mock dataset
                  </p>
                </div>
              </div>
              <p className={`text-xs leading-relaxed ${isDarkMode ? 'text-slate-300' : 'text-slate-600'}`}>
                Repopulates all 19 system tables and state collections with realistic manufacturing seed metrics (Orders, Stock, Job Cards, QC Inspections, Delivery Challans, and Invoices) for testing.
              </p>
            </div>

            {onResetAllData && (
              <button
                onClick={() => {
                  if (window.confirm('Populate all system collections with rich factory seed dataset?')) {
                    onResetAllData();
                  }
                }}
                className="w-full py-3 rounded-2xl bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white font-bold text-xs flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-blue-500/20 transition-all hover:scale-[1.01]"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Populate Test Seed Data</span>
              </button>
            )}
          </div>

          {/* Card 2: Purge Operational Test Data */}
          <div className={`p-6 rounded-3xl border flex flex-col justify-between space-y-4 shadow-xl ${
            isDarkMode ? 'bg-slate-900/80 border-slate-800 backdrop-blur-xl' : 'bg-white border-slate-200'
          }`}>
            <div>
              <div className="flex items-center gap-3 mb-3">
                <div className="p-3 rounded-2xl bg-rose-500/15 text-rose-400 border border-rose-500/30">
                  <Trash2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className={`font-bold text-base ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                    Purge Operational Test Data
                  </h3>
                  <p className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                    Delete active operational records
                  </p>
                </div>
              </div>
              <p className={`text-xs leading-relaxed ${isDarkMode ? 'text-slate-300' : 'text-slate-600'}`}>
                Purges active customer purchase orders, production job cards, shift log reports, delivery challans, and customer invoices to start clean testing from zero orders.
              </p>
            </div>

            {onClearOperationalData && (
              <button
                onClick={() => setShowPurgeModal(true)}
                className="w-full py-3 rounded-2xl bg-gradient-to-r from-rose-600 to-rose-500 hover:from-rose-500 hover:to-rose-400 text-white font-bold text-xs flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-rose-500/20 transition-all hover:scale-[1.01]"
              >
                <Trash2 className="w-4 h-4" />
                <span>Purge Operational Test Data</span>
              </button>
            )}
          </div>

          {/* Card 3: Download Specific Section Logs & Data */}
          <div className={`p-6 rounded-3xl border flex flex-col justify-between space-y-4 shadow-xl ${
            isDarkMode ? 'bg-slate-900/80 border-slate-800 backdrop-blur-xl' : 'bg-white border-slate-200'
          }`}>
            <div>
              <div className="flex items-center gap-3 mb-3">
                <div className="p-3 rounded-2xl bg-blue-500/15 text-blue-400 border border-blue-500/30">
                  <Download className="w-5 h-5" />
                </div>
                <div>
                  <h3 className={`font-bold text-base ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                    Download Section Logs & Data
                  </h3>
                  <p className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                    Export custom dataset in JSON or CSV
                  </p>
                </div>
              </div>

              <div className="space-y-3 pt-1">
                <div>
                  <label className="block text-[10px] uppercase font-mono font-bold text-slate-400 mb-1">Target ERP Section</label>
                  <select
                    value={selectedExportSection}
                    onChange={(e) => setSelectedExportSection(e.target.value)}
                    className={`w-full px-3 py-2 rounded-xl text-xs font-bold border outline-none cursor-pointer ${
                      isDarkMode ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                    }`}
                  >
                    <option value="ALL">All System Data & Telemetry (Full Dump)</option>
                    <option value="AUDIT">Audit Telemetry Stream ({auditLogs.length})</option>
                    <option value="ORDERS">Customer Purchase Orders ({orders.length})</option>
                    <option value="INVENTORY">Inventory Stock & Shortages ({stock.length})</option>
                    <option value="PRODUCTION">Job Cards & Production Logs ({jobCards.length})</option>
                    <option value="QUALITY">Quality Control (QC & PDI Queue) ({qcQueue.length})</option>
                    <option value="DISPATCH">Delivery Challans & Dispatches ({dispatches.length})</option>
                    <option value="INVOICES">Customer Invoices & Receivables ({invoices.length})</option>
                    <option value="PAYABLES">Vendor Bills & Payables ({payables.length})</option>
                    <option value="MASTERS">Master SKU Directory ({masters.length})</option>
                    <option value="USERS">System User Directory ({users.length})</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] uppercase font-mono font-bold text-slate-400 mb-1">Export File Format</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setExportFormat('JSON')}
                      className={`px-3 py-2 rounded-xl text-xs font-bold border flex items-center justify-center gap-1.5 cursor-pointer transition-all ${
                        exportFormat === 'JSON'
                          ? 'bg-blue-600 text-white border-blue-600'
                          : isDarkMode ? 'bg-slate-950 border-slate-800 text-slate-300' : 'bg-slate-50 border-slate-200 text-slate-700'
                      }`}
                    >
                      <FileJson className="w-3.5 h-3.5" />
                      <span>JSON Object</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setExportFormat('CSV')}
                      className={`px-3 py-2 rounded-xl text-xs font-bold border flex items-center justify-center gap-1.5 cursor-pointer transition-all ${
                        exportFormat === 'CSV'
                          ? 'bg-blue-600 text-white border-blue-600'
                          : isDarkMode ? 'bg-slate-950 border-slate-800 text-slate-300' : 'bg-slate-50 border-slate-200 text-slate-700'
                      }`}
                    >
                      <FileSpreadsheet className="w-3.5 h-3.5" />
                      <span>CSV Table</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <button
              onClick={handleDownloadSection}
              className="w-full py-3 rounded-2xl bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white font-bold text-xs flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-blue-500/20 transition-all hover:scale-[1.01]"
            >
              <Download className="w-4 h-4" />
              <span>Download Selected Section File</span>
            </button>
          </div>

        </div>
      )}

      {/* Confirmation Modal for Purge Data */}
      {showPurgeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md font-sans">
          <div className={`relative w-full max-w-md rounded-3xl border p-6 space-y-5 shadow-2xl ${
            isDarkMode ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
          }`}>
            <div className="flex items-center gap-3 text-rose-500">
              <div className="p-2.5 rounded-2xl bg-rose-500/15 border border-rose-500/30">
                <Trash2 className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-lg">Purge Operational Data?</h3>
            </div>

            <p className={`text-xs leading-relaxed ${isDarkMode ? 'text-slate-300' : 'text-slate-600'}`}>
              Are you sure you want to clear all active operational test data (Orders, Production Logs, Dispatches, and Invoices)? Masters and User Profiles will be preserved.
            </p>

            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setShowPurgeModal(false)}
                className={`px-4 py-2 rounded-xl text-xs font-bold border cursor-pointer ${
                  isDarkMode ? 'border-slate-800 text-slate-300 hover:bg-slate-800' : 'border-slate-200 text-slate-700 hover:bg-slate-100'
                }`}
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (onClearOperationalData) onClearOperationalData();
                  setShowPurgeModal(false);
                }}
                className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold cursor-pointer shadow-md shadow-rose-500/20"
              >
                Confirm Purge
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Provision User Modal */}
      {showAddUserModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md font-sans">
          <div className={`relative w-full max-w-lg rounded-3xl border p-7 space-y-6 shadow-2xl transition-all ${
            isDarkMode 
              ? 'bg-slate-900/95 border-slate-800/80 text-white backdrop-blur-2xl shadow-blue-500/5' 
              : 'bg-white border-slate-200 text-slate-900 shadow-2xl'
          }`}>
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800/80 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-2xl bg-blue-500/15 text-blue-500 border border-blue-500/30">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <h3 className={`font-bold text-base tracking-tight ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                    Provision System User
                  </h3>
                  <p className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                    Assign role matrix permissions and account identity
                  </p>
                </div>
              </div>

              <button 
                onClick={() => setShowAddUserModal(false)} 
                className={`p-2 rounded-2xl border transition-all cursor-pointer ${
                  isDarkMode 
                    ? 'border-slate-800 bg-slate-950/60 text-slate-400 hover:text-white hover:bg-slate-800' 
                    : 'border-slate-200 bg-slate-50 text-slate-500 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="space-y-4">
              <div>
                <label className="block text-[11px] uppercase font-mono font-bold text-slate-400 mb-1.5">Full Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Ramesh Patel"
                  value={userName}
                  onChange={(e) => setUserName(e.target.value)}
                  className={`w-full rounded-2xl border px-4 py-3 text-xs outline-none transition-all ${
                    isDarkMode 
                      ? 'bg-slate-950/80 border-slate-800 text-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20' 
                      : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-blue-600 focus:ring-2 focus:ring-blue-500/10'
                  }`}
                />
              </div>

              <div>
                <label className="block text-[11px] uppercase font-mono font-bold text-slate-400 mb-1.5">Email Address *</label>
                <input
                  type="email"
                  required
                  placeholder="e.g. ramesh@guruom.in"
                  value={userEmail}
                  onChange={(e) => setUserEmail(e.target.value)}
                  className={`w-full rounded-2xl border px-4 py-3 text-xs font-mono outline-none transition-all ${
                    isDarkMode 
                      ? 'bg-slate-950/80 border-slate-800 text-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20' 
                      : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-blue-600 focus:ring-2 focus:ring-blue-500/10'
                  }`}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] uppercase font-mono font-bold text-slate-400 mb-1.5">Department</label>
                  <input
                    type="text"
                    placeholder="e.g. Production Operations"
                    value={userDepartment}
                    onChange={(e) => setUserDepartment(e.target.value)}
                    className={`w-full rounded-2xl border px-4 py-3 text-xs outline-none transition-all ${
                      isDarkMode 
                        ? 'bg-slate-950/80 border-slate-800 text-white focus:border-blue-500' 
                        : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-blue-600'
                    }`}
                  />
                </div>

                <div>
                  <label className="block text-[11px] uppercase font-mono font-bold text-slate-400 mb-1.5">Phone Number</label>
                  <input
                    type="text"
                    placeholder="e.g. +91 98250 12345"
                    value={userPhone}
                    onChange={(e) => setUserPhone(e.target.value)}
                    className={`w-full rounded-2xl border px-4 py-3 text-xs font-mono outline-none transition-all ${
                      isDarkMode 
                        ? 'bg-slate-950/80 border-slate-800 text-white focus:border-blue-500' 
                        : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-blue-600'
                    }`}
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] uppercase font-mono font-bold text-slate-400 mb-1.5">Role Matrix *</label>
                <select
                  value={userRole}
                  onChange={(e) => setUserRole(e.target.value as UserRole)}
                  className={`w-full rounded-2xl border px-4 py-3 text-xs font-mono font-bold outline-none transition-all cursor-pointer ${
                    isDarkMode 
                      ? 'bg-slate-950/80 border-slate-800 text-white focus:border-blue-500' 
                      : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-blue-600'
                  }`}
                >
                  {ROLE_DEFINITIONS.map(r => (
                    <option key={r.role} value={r.role}>{r.label} ({r.role})</option>
                  ))}
                </select>
              </div>

              <div className="pt-4 border-t border-slate-200 dark:border-slate-800/80 flex items-center justify-end gap-3">
                <button 
                  type="button" 
                  onClick={() => setShowAddUserModal(false)} 
                  className={`px-5 py-2.5 rounded-2xl border text-xs font-mono font-bold cursor-pointer transition-all ${
                    isDarkMode 
                      ? 'border-slate-800 bg-slate-950/60 text-slate-300 hover:bg-slate-800' 
                      : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="px-6 py-2.5 rounded-2xl bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white font-bold text-xs font-mono cursor-pointer shadow-lg shadow-blue-500/25 transition-all hover:scale-[1.02] active:scale-[0.98]"
                >
                  Provision User Access
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit User Role Modal */}
      {showEditRoleModal && userToEditRole && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md font-sans">
          <div className={`relative w-full max-w-lg rounded-3xl border p-7 space-y-6 shadow-2xl transition-all ${
            isDarkMode 
              ? 'bg-slate-900/95 border-slate-800/80 text-white backdrop-blur-2xl' 
              : 'bg-white border-slate-200 text-slate-900 shadow-2xl'
          }`}>
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800/80 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-2xl bg-blue-500/15 text-blue-400 border border-blue-500/30">
                  <Shield className="w-5 h-5" />
                </div>
                <div>
                  <h3 className={`font-bold text-base tracking-tight ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                    Update Role Matrix
                  </h3>
                  <p className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                    Modify permissions for {userToEditRole.name} ({userToEditRole.email})
                  </p>
                </div>
              </div>

              <button 
                onClick={() => setShowEditRoleModal(false)} 
                className={`p-2 rounded-2xl border transition-all cursor-pointer ${
                  isDarkMode 
                    ? 'border-slate-800 bg-slate-950/60 text-slate-400 hover:text-white hover:bg-slate-800' 
                    : 'border-slate-200 bg-slate-50 text-slate-500 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <label className="block text-[11px] uppercase font-mono font-bold text-slate-400">Select Access Role</label>
              {ROLE_DEFINITIONS.map(r => {
                const isSelected = newSelectedRole === r.role;
                return (
                  <div
                    key={r.role}
                    onClick={() => setNewSelectedRole(r.role)}
                    className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-start gap-3 ${
                      isSelected
                        ? isDarkMode ? 'border-blue-500/60 bg-blue-500/10 shadow-sm' : 'border-blue-600 bg-blue-50 shadow-sm'
                        : isDarkMode ? 'border-slate-800 bg-slate-950/50 hover:border-slate-700' : 'border-slate-200 bg-slate-50 hover:bg-slate-100'
                    }`}
                  >
                    <div className={`w-4 h-4 mt-0.5 rounded-full border flex items-center justify-center ${
                      isSelected ? 'border-blue-500 bg-blue-500 text-white' : 'border-slate-500'
                    }`}>
                      {isSelected && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className={`font-bold text-xs ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                          {r.label}
                        </span>
                        <span className={`px-2 py-0.5 rounded-lg text-[9px] font-mono font-bold uppercase border ${getRoleColor(r.role)}`}>
                          {r.role}
                        </span>
                      </div>
                      <p className={`text-[11px] mt-1 leading-relaxed ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                        {r.desc}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="pt-4 border-t border-slate-200 dark:border-slate-800/80 flex items-center justify-end gap-3">
              <button 
                type="button" 
                onClick={() => setShowEditRoleModal(false)} 
                className={`px-5 py-2.5 rounded-2xl border text-xs font-mono font-bold cursor-pointer transition-all ${
                  isDarkMode 
                    ? 'border-slate-800 bg-slate-950/60 text-slate-300 hover:bg-slate-800' 
                    : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
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
                  setShowEditRoleModal(false);
                }}
                className="px-6 py-2.5 rounded-2xl bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white font-bold text-xs font-mono cursor-pointer shadow-lg shadow-blue-500/25 transition-all hover:scale-[1.02] active:scale-[0.98]"
              >
                Save Role Change
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete User Confirmation Modal */}
      {showDeleteModal && userToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md font-sans">
          <div className={`relative w-full max-w-md rounded-3xl border p-6 space-y-5 shadow-2xl ${
            isDarkMode ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
          }`}>
            <div className="flex items-center gap-3 text-rose-500">
              <div className="p-2.5 rounded-2xl bg-rose-500/15 border border-rose-500/30">
                <Trash2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-base">Delete User Account?</h3>
                <p className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                  Permanent account removal
                </p>
              </div>
            </div>

            <p className={`text-xs leading-relaxed ${isDarkMode ? 'text-slate-300' : 'text-slate-600'}`}>
              Are you sure you want to permanently delete <strong className="text-rose-400">{userToDelete.name}</strong> ({userToDelete.email})? All active sessions for this account will be invalidated immediately.
            </p>

            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setShowDeleteModal(false)}
                className={`px-4 py-2 rounded-xl text-xs font-bold border cursor-pointer ${
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
                  setShowDeleteModal(false);
                }}
                className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold cursor-pointer shadow-md shadow-rose-500/20"
              >
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default UsersAuditView;
