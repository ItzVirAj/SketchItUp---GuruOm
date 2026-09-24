import React, { useState, useMemo } from 'react';
import {
  Award,
  Calendar,
  Search,
  Plus,
  FileText,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Trash2,
  User,
  Building2,
  ExternalLink,
  ShieldCheck,
  Filter,
  UploadCloud,
  FileCheck,
  Check,
  X,
  Sparkles,
  ChevronRight,
  ShieldAlert,
  ArrowUpRight
} from 'lucide-react';
import { Modal } from '../../common/Modal';
import { EmployeeCertification } from '../../../types/console';

interface EmployeeUserOption {
  id: string;
  name: string;
  email: string;
  department?: string;
  role?: string;
}

interface EmployeeCertificationsViewProps {
  certifications: EmployeeCertification[];
  myCertifications: EmployeeCertification[];
  isLoading: boolean;
  canViewAll: boolean;
  canAssign: boolean;
  isDarkMode: boolean;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  statusFilter: 'ALL' | 'ACTIVE' | 'EXPIRED';
  onStatusFilterChange: (status: 'ALL' | 'ACTIVE' | 'EXPIRED') => void;
  activeTab: 'my' | 'all';
  onTabChange: (tab: 'my' | 'all') => void;
  onAssignCertification: (payload: {
    employee_id: string;
    title: string;
    issuing_body: string;
    issued_date: string;
    expiry_date?: string | null;
    document_url?: string | null;
  }) => Promise<any>;
  onDeleteCertification: (id: string, title?: string) => Promise<void>;
  onUploadDocument?: (file: File) => Promise<{ storagePath: string; signedUrl: string }>;
  employeesList?: EmployeeUserOption[];
}

export const EmployeeCertificationsView: React.FC<EmployeeCertificationsViewProps> = ({
  certifications,
  myCertifications,
  isLoading,
  canViewAll,
  canAssign,
  isDarkMode,
  searchQuery,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  activeTab,
  onTabChange,
  onAssignCertification,
  onDeleteCertification,
  onUploadDocument,
  employeesList = []
}) => {
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  // Form State
  const [formEmployeeId, setFormEmployeeId] = useState('');
  const [formTitle, setFormTitle] = useState('');
  const [formIssuingBody, setFormIssuingBody] = useState('');
  const [formIssuedDate, setFormIssuedDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [formHasExpiry, setFormHasExpiry] = useState(true);
  const [formExpiryDate, setFormExpiryDate] = useState('');
  const [formDocumentUrl, setFormDocumentUrl] = useState('');
  const [uploadedFileName, setUploadedFileName] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  // Active records based on tab
  const displayedCertifications = useMemo(() => {
    return activeTab === 'all' && canViewAll ? certifications : myCertifications;
  }, [activeTab, canViewAll, certifications, myCertifications]);

  // Filtered list
  const filteredList = useMemo(() => {
    return displayedCertifications.filter(cert => {
      // Status filter
      if (statusFilter === 'ACTIVE' && cert.isExpired) return false;
      if (statusFilter === 'EXPIRED' && !cert.isExpired) return false;

      // Search query
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      const matchTitle = cert.title.toLowerCase().includes(q);
      const matchIssuer = cert.issuingBody.toLowerCase().includes(q);
      const matchEmployee = (cert.employeeName || cert.employee?.name || '').toLowerCase().includes(q);
      return matchTitle || matchIssuer || matchEmployee;
    });
  }, [displayedCertifications, statusFilter, searchQuery]);

  // Stats calculation
  const stats = useMemo(() => {
    const list = displayedCertifications;
    const total = list.length;
    let active = 0;
    let expired = 0;
    let expiringSoon = 0;

    list.forEach(c => {
      if (c.isExpired) {
        expired++;
      } else {
        active++;
        if (c.daysUntilExpiry !== null && c.daysUntilExpiry !== undefined && c.daysUntilExpiry >= 0 && c.daysUntilExpiry <= 30) {
          expiringSoon++;
        }
      }
    });

    const complianceRate = total > 0 ? Math.round((active / total) * 100) : 100;

    return { total, active, expired, expiringSoon, complianceRate };
  }, [displayedCertifications]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !onUploadDocument) return;

    setIsUploading(true);
    setFormError(null);
    try {
      const res = await onUploadDocument(file);
      setFormDocumentUrl(res.storagePath);
      setUploadedFileName(file.name);
    } catch (err: any) {
      setFormError(err.message || 'File upload failed');
    } finally {
      setIsUploading(false);
    }
  };

  const handleOpenAssignModal = () => {
    setFormEmployeeId(employeesList[0]?.id || '');
    setFormTitle('');
    setFormIssuingBody('');
    setFormIssuedDate(new Date().toISOString().slice(0, 10));
    setFormHasExpiry(true);
    setFormExpiryDate('');
    setFormDocumentUrl('');
    setUploadedFileName('');
    setFormError(null);
    setIsAssignModalOpen(true);
  };

  const handleAssignSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formEmployeeId) {
      setFormError('Please select an employee.');
      return;
    }
    if (!formTitle.trim()) {
      setFormError('Certificate title is required.');
      return;
    }
    if (!formIssuingBody.trim()) {
      setFormError('Issuing authority is required.');
      return;
    }
    if (!formIssuedDate) {
      setFormError('Issued date is required.');
      return;
    }
    if (formHasExpiry && !formExpiryDate) {
      setFormError('Please specify an expiry date or select Lifetime credential.');
      return;
    }
    if (formHasExpiry && formExpiryDate && new Date(formExpiryDate) < new Date(formIssuedDate)) {
      setFormError('Expiry date cannot be prior to the issued date.');
      return;
    }

    setIsSubmitting(true);
    setFormError(null);

    try {
      await onAssignCertification({
        employee_id: formEmployeeId,
        title: formTitle.trim(),
        issuing_body: formIssuingBody.trim(),
        issued_date: formIssuedDate,
        expiry_date: formHasExpiry ? formExpiryDate : null,
        document_url: formDocumentUrl || null
      });
      setIsAssignModalOpen(false);
    } catch (err: any) {
      setFormError(err.message || 'Failed to assign certificate');
    } finally {
      setIsSubmitting(false);
    }
  };

  const cardBase = isDarkMode
    ? 'bg-[#09090B] border-white/10 text-white shadow-[0_16px_40px_rgba(0,0,0,0.6)]'
    : 'bg-white border-slate-200/80 shadow-sm text-slate-900';

  const elevatedCard = isDarkMode
    ? 'bg-[#111115]/90 border-white/10 text-white shadow-[0_8px_24px_rgba(0,0,0,0.45)]'
    : 'bg-white border-slate-200/80 shadow-2xs text-slate-900';

  return (
    <div className="space-y-4 sm:space-y-6 font-sans">
      {/* 1. Luminous Dual-Mode Hero & Integrated Mini Dashboard */}
      <div className={`relative overflow-hidden rounded-[28px] border transition-all duration-300 p-6 sm:p-8 ${
        isDarkMode
          ? 'bg-gradient-to-b from-[#111318] via-[#090a0d] to-[#020204] border-white/10 shadow-[0_24px_50px_rgba(0,0,0,0.7)] text-white'
          : 'bg-gradient-to-r from-[#1b64ff] via-[#155dfc] to-[#0f52dc] border-blue-400/30 shadow-[0_16px_36px_rgba(21,93,252,0.28)] text-white'
      }`}>
        {/* Ambient Top Glow */}
        <div
          aria-hidden="true"
          className={`pointer-events-none absolute -top-24 -right-10 w-96 h-96 rounded-full blur-3xl transition-opacity duration-500 ${
            isDarkMode ? 'bg-blue-500/10' : 'bg-white/20'
          }`}
        />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold tracking-wide backdrop-blur-md border bg-white/15 text-white border-white/20 shadow-sm">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>HR Module • Compliance Rate: {stats.complianceRate}% Active</span>
            </div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight text-white flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/15 backdrop-blur-md border border-white/20 text-white shadow-inner">
                <Award className="h-5 w-5" />
              </div>
              Employee Certifications
            </h1>
            <p className={`text-xs sm:text-sm max-w-2xl font-normal leading-relaxed ${
              isDarkMode ? 'text-white/60' : 'text-blue-100'
            }`}>
              Verify technical qualifications, ISO/NDT certifications, and compliance credentials across factory personnel.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0 self-start lg:self-center">
            {canAssign && (
              <button
                id="assign-cert-btn"
                type="button"
                onClick={handleOpenAssignModal}
                className={`flex h-11 shrink-0 items-center gap-2 rounded-full px-5 text-xs font-bold transition-all active:scale-[0.96] cursor-pointer shadow-lg ${
                  isDarkMode
                    ? 'bg-white hover:bg-slate-100 text-slate-950 shadow-black/40'
                    : 'bg-white hover:bg-blue-50 text-blue-700 shadow-blue-900/30'
                }`}
              >
                <Plus className="w-4 h-4" />
                <span>Assign Certificate</span>
              </button>
            )}
          </div>
        </div>

        {/* Mini Metric Dashboard Strip with SOLID VIBRANT ICON SQUIRCLES */}
        <div className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-3">
          {/* Card 1: Total Listed */}
          <div className={`p-4 rounded-2xl border backdrop-blur-md flex items-center gap-3.5 transition-colors ${
            isDarkMode ? 'bg-white/[0.04] border-white/10' : 'bg-white/15 border-white/25'
          }`}>
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white text-blue-600 shadow-md shadow-black/10">
              <Award className="w-5 h-5" />
            </div>
            <div className="min-w-0 flex-1">
              <span className={`text-[10px] font-bold uppercase tracking-wider block ${isDarkMode ? 'text-white/50' : 'text-blue-100'}`}>
                Total Listed
              </span>
              <span className="text-xl sm:text-2xl font-bold font-mono text-white block tabular-nums">
                {stats.total}
              </span>
              <span className={`text-[10px] truncate block ${isDarkMode ? 'text-white/40' : 'text-blue-100/80'}`}>
                Documented credentials
              </span>
            </div>
          </div>

          {/* Card 2: Active & Verified */}
          <div className={`p-4 rounded-2xl border backdrop-blur-md flex items-center gap-3.5 transition-colors ${
            isDarkMode ? 'bg-white/[0.04] border-white/10' : 'bg-white/15 border-white/25'
          }`}>
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-600 text-white shadow-md shadow-emerald-500/30">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div className="min-w-0 flex-1">
              <span className={`text-[10px] font-bold uppercase tracking-wider block ${isDarkMode ? 'text-white/50' : 'text-blue-100'}`}>
                Active &amp; Verified
              </span>
              <span className="text-xl sm:text-2xl font-bold font-mono text-white block tabular-nums">
                {stats.active}
              </span>
              <span className={`text-[10px] truncate block ${isDarkMode ? 'text-white/40' : 'text-blue-100/80'}`}>
                Audit-ready qualifications
              </span>
            </div>
          </div>

          {/* Card 3: Expiring Soon */}
          <div className={`p-4 rounded-2xl border backdrop-blur-md flex items-center gap-3.5 transition-colors ${
            isDarkMode ? 'bg-white/[0.04] border-white/10' : 'bg-white/15 border-white/25'
          }`}>
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-amber-500 text-white shadow-md shadow-amber-500/30">
              <Clock className="w-5 h-5" />
            </div>
            <div className="min-w-0 flex-1">
              <span className={`text-[10px] font-bold uppercase tracking-wider block ${isDarkMode ? 'text-white/50' : 'text-blue-100'}`}>
                Expiring Soon
              </span>
              <span className="text-xl sm:text-2xl font-bold font-mono text-white block tabular-nums">
                {stats.expiringSoon}
              </span>
              <span className={`text-[10px] truncate block ${isDarkMode ? 'text-white/40' : 'text-blue-100/80'}`}>
                Within 30 days
              </span>
            </div>
          </div>

          {/* Card 4: Expired */}
          <div className={`p-4 rounded-2xl border backdrop-blur-md flex items-center gap-3.5 transition-colors ${
            isDarkMode ? 'bg-white/[0.04] border-white/10' : 'bg-white/15 border-white/25'
          }`}>
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-rose-600 text-white shadow-md shadow-rose-500/30">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div className="min-w-0 flex-1">
              <span className={`text-[10px] font-bold uppercase tracking-wider block ${isDarkMode ? 'text-white/50' : 'text-blue-100'}`}>
                Expired
              </span>
              <span className="text-xl sm:text-2xl font-bold font-mono text-white block tabular-nums">
                {stats.expired}
              </span>
              <span className={`text-[10px] truncate block ${isDarkMode ? 'text-white/40' : 'text-blue-100/80'}`}>
                Requires renewal
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ── TABS & FILTER TOOLBAR (Apple HIG Segmented Control) ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
        {/* Apple-style Pill Segmented Control */}
        <div className={`p-1 rounded-full border inline-flex items-center gap-1 overflow-x-auto scrollbar-none ${
          isDarkMode ? 'bg-white/[0.04] border-white/10' : 'bg-slate-100/80 border-slate-200/80'
        }`}>
          <button
            id="tab-my-certifications"
            type="button"
            onClick={() => onTabChange('my')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'my'
                ? isDarkMode
                  ? 'bg-white text-slate-950 shadow-sm'
                  : 'bg-[#155dfc] text-white shadow-sm'
                : isDarkMode
                  ? 'text-slate-400 hover:text-white hover:bg-white/[0.06]'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            <User className="w-3.5 h-3.5" />
            <span>My Certifications</span>
            <span className={`px-1.5 py-0.5 rounded-full text-[10px] tabular-nums font-bold ${
              activeTab === 'my'
                ? isDarkMode ? 'bg-slate-900 text-white' : 'bg-white/20 text-white'
                : isDarkMode ? 'bg-white/10 text-slate-400' : 'bg-slate-200 text-slate-700'
            }`}>
              {myCertifications.length}
            </span>
          </button>

          {canViewAll && (
            <button
              id="tab-all-certifications"
              type="button"
              onClick={() => onTabChange('all')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                activeTab === 'all'
                  ? isDarkMode
                    ? 'bg-white text-slate-950 shadow-sm'
                    : 'bg-[#155dfc] text-white shadow-sm'
                  : isDarkMode
                    ? 'text-slate-400 hover:text-white hover:bg-white/[0.06]'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              <Building2 className="w-3.5 h-3.5" />
              <span>All Staff Certifications</span>
              <span className={`px-1.5 py-0.5 rounded-full text-[10px] tabular-nums font-bold ${
                activeTab === 'all'
                  ? isDarkMode ? 'bg-slate-900 text-white' : 'bg-white/20 text-white'
                  : isDarkMode ? 'bg-white/10 text-slate-400' : 'bg-slate-200 text-slate-700'
              }`}>
                {certifications.length}
              </span>
            </button>
          )}
        </div>

        {/* Search & Status Pill Filters */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Search Input */}
          <div className="relative min-w-[220px] sm:w-64">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Search title, authority, staff..."
              value={searchQuery}
              onChange={e => onSearchChange(e.target.value)}
              className={`w-full pl-9 pr-8 py-2 rounded-full text-xs border outline-none transition-all ${
                isDarkMode
                  ? 'bg-[#111115] border-white/10 text-white placeholder:text-slate-600 focus:border-[var(--accent-primary)]'
                  : 'bg-white border-slate-200 text-slate-900 placeholder:text-slate-400 focus:border-[var(--accent-primary)] shadow-2xs'
              }`}
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => onSearchChange('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Status Filter Segment */}
          <div className={`p-1 rounded-full border inline-flex items-center gap-1 ${
            isDarkMode ? 'bg-white/[0.04] border-white/10' : 'bg-slate-100/80 border-slate-200/80'
          }`}>
            {(['ALL', 'ACTIVE', 'EXPIRED'] as const).map(st => {
              const isSelected = statusFilter === st;
              return (
                <button
                  key={st}
                  type="button"
                  onClick={() => onStatusFilterChange(st)}
                  className={`px-3 py-1.5 text-xs font-bold rounded-full transition-all cursor-pointer whitespace-nowrap ${
                    isSelected
                      ? isDarkMode
                        ? 'bg-white text-slate-950 shadow-sm'
                        : 'bg-[#155dfc] text-white shadow-sm'
                      : isDarkMode
                        ? 'text-slate-400 hover:text-white hover:bg-white/[0.06]'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                  }`}
                >
                  {st === 'ALL' ? 'All' : st === 'ACTIVE' ? 'Active' : 'Expired'}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── MAIN CONTENT LIST (Apple Elevated Surface Table) ── */}
      <div className={`rounded-3xl border overflow-hidden transition-all ${cardBase}`}>
        {isLoading ? (
          <div className="p-16 text-center text-slate-400 flex flex-col items-center justify-center gap-3">
            <div className="w-9 h-9 border-3 border-[var(--accent-primary)] border-t-transparent rounded-full animate-spin" />
            <p className="text-xs font-semibold tracking-wide uppercase text-slate-400">Loading certifications...</p>
          </div>
        ) : filteredList.length === 0 ? (
          <div className="p-14 text-center flex flex-col items-center justify-center gap-3.5">
            <div className="p-4 rounded-2xl bg-slate-100 dark:bg-white/[0.04] text-slate-400 border border-slate-200/80 dark:border-white/10">
              <Award className="w-8 h-8 stroke-[1.5]" />
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                No certifications found
              </h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                {searchQuery || statusFilter !== 'ALL'
                  ? 'No credential matched the active search filters. Try clearing your query.'
                  : activeTab === 'my'
                  ? 'You currently have no training or skill certifications linked to your profile.'
                  : 'No employee certificates have been recorded in the register yet.'}
              </p>
            </div>
            {canAssign && (
              <button
                type="button"
                onClick={handleOpenAssignModal}
                className="mt-2 inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold bg-[var(--accent-primary)] text-white shadow-sm hover:opacity-95 transition-all cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Assign the first credential</span>
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs sm:text-sm">
              <thead>
                <tr className={`border-b font-mono font-bold uppercase tracking-[0.12em] text-[9px] ${
                  isDarkMode ? 'bg-black/20 border-white/10 text-slate-400' : 'bg-slate-50/80 border-slate-200 text-slate-500'
                }`}>
                  {activeTab === 'all' && <th className="py-4 px-5">Employee</th>}
                  <th className="py-4 px-5">Certificate & Authority</th>
                  <th className="py-4 px-5">Issued</th>
                  <th className="py-4 px-5">Expires</th>
                  <th className="py-4 px-5">Status</th>
                  <th className="py-4 px-5">Document</th>
                  <th className="py-4 px-5">Assigned By</th>
                  {canAssign && <th className="py-4 px-5 text-right">Action</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200/70 dark:divide-white/[0.06]">
                {filteredList.map(cert => {
                  const isExpiringSoon =
                    !cert.isExpired &&
                    cert.daysUntilExpiry !== null &&
                    cert.daysUntilExpiry !== undefined &&
                    cert.daysUntilExpiry >= 0 &&
                    cert.daysUntilExpiry <= 30;

                  return (
                    <tr
                      key={cert.id}
                      className={`group transition-colors duration-150 ${
                        isDarkMode ? 'hover:bg-white/[0.03]' : 'hover:bg-slate-50/70'
                      }`}
                    >
                      {/* Employee Column (shown on "All Staff" tab) */}
                      {activeTab === 'all' && (
                        <td className="py-4 px-5 whitespace-nowrap">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-[var(--accent-soft-light)] dark:bg-[var(--accent-soft-dark)] text-[var(--accent-text-light)] dark:text-[var(--accent-text-dark)] font-bold flex items-center justify-center text-xs border border-[var(--accent-border-light)] dark:border-[var(--accent-border-dark)] shrink-0">
                              {(cert.employeeName || cert.employee?.name || 'U').charAt(0).toUpperCase()}
                            </div>
                            <div className="space-y-0.5">
                              <div className="font-bold text-sm text-slate-900 dark:text-white">
                                {cert.employeeName || cert.employee?.name || 'Staff Member'}
                              </div>
                              <div className="text-[11px] text-slate-500 dark:text-slate-400">
                                {cert.employee?.department || 'Operations'} · {cert.employee?.role || 'Staff'}
                              </div>
                            </div>
                          </div>
                        </td>
                      )}

                      {/* Certificate Title & Issuer */}
                      <td className="py-3.5 px-4">
                        <div className="space-y-0.5">
                          <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                            <Award className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                            <span className="truncate max-w-[280px]">{cert.title}</span>
                          </div>
                          <div className="text-[11px] text-slate-500 dark:text-slate-400">
                            Authority: <span className="font-medium text-slate-700 dark:text-slate-300">{cert.issuingBody}</span>
                          </div>
                        </div>
                      </td>

                      {/* Issued Date */}
                      <td className="py-3.5 px-4 whitespace-nowrap font-mono text-xs text-slate-600 dark:text-slate-300">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-slate-400" />
                          <span>{cert.issuedDate}</span>
                        </div>
                      </td>

                      {/* Expiry Date */}
                      <td className="py-3.5 px-4 whitespace-nowrap font-mono text-xs">
                        {cert.expiryDate ? (
                          <div className="flex items-center gap-1.5">
                            <Calendar className="w-3.5 h-3.5 text-slate-400" />
                            <span className={cert.isExpired ? 'text-rose-600 dark:text-rose-400 font-bold' : 'text-slate-700 dark:text-slate-300'}>
                              {cert.expiryDate}
                            </span>
                          </div>
                        ) : (
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-slate-100 dark:bg-white/[0.06] text-slate-500 dark:text-slate-400">
                            Lifetime
                          </span>
                        )}
                      </td>

                      {/* Status Badge */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {cert.isExpired ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
                            <AlertTriangle className="w-3 h-3" />
                            Expired
                          </span>
                        ) : isExpiringSoon ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                            <Clock className="w-3 h-3" />
                            Expires in {cert.daysUntilExpiry}d
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                            <CheckCircle2 className="w-3 h-3" />
                            Active
                          </span>
                        )}
                      </td>

                      {/* Document Link */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {cert.documentUrl ? (
                          <a
                            href={cert.documentUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-[var(--accent-soft-light)] dark:bg-[var(--accent-soft-dark)] text-[var(--accent-text-light)] dark:text-[var(--accent-text-dark)] hover:opacity-80 transition-opacity"
                          >
                            <FileText className="w-3.5 h-3.5" />
                            <span>View Doc</span>
                            <ArrowUpRight className="w-3 h-3 opacity-60" />
                          </a>
                        ) : (
                          <span className="text-slate-400 text-xs">—</span>
                        )}
                      </td>

                      {/* Assigned By */}
                      <td className="py-3.5 px-4 whitespace-nowrap text-xs text-slate-500 dark:text-slate-400">
                        <div className="flex items-center gap-1.5">
                          <ShieldCheck className="w-3.5 h-3.5 text-amber-500" />
                          <span>{cert.assignedByName || 'HR Admin'}</span>
                        </div>
                      </td>

                      {/* Actions */}
                      {canAssign && (
                        <td className="py-3.5 px-4 text-right whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() => {
                              if (window.confirm(`Are you sure you want to revoke "${cert.title}"?`)) {
                                onDeleteCertification(cert.id, cert.title);
                              }
                            }}
                            className="p-1.5 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-500/10 transition-colors cursor-pointer"
                            title="Revoke certificate"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── ASSIGN CERTIFICATE MODAL SHEET (Apple HIG Dialog) ── */}
      {canAssign && (
        <Modal
          isOpen={isAssignModalOpen}
          onClose={() => setIsAssignModalOpen(false)}
          title="Assign Professional Certificate"
        >
          <form onSubmit={handleAssignSubmit} className="space-y-4 text-xs sm:text-sm">
            {formError && (
              <div className="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            {/* Target Employee Selection */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Target Employee <span className="text-rose-500">*</span>
              </label>
              <select
                value={formEmployeeId}
                onChange={e => setFormEmployeeId(e.target.value)}
                required
                className={`w-full p-2.5 rounded-xl border text-xs sm:text-sm outline-none transition-all ${
                  isDarkMode
                    ? 'bg-[#111115] border-white/10 text-white focus:border-[var(--accent-primary)]'
                    : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-[var(--accent-primary)]'
                }`}
              >
                {employeesList.length === 0 ? (
                  <option value="">No employees loaded</option>
                ) : (
                  employeesList.map(emp => (
                    <option key={emp.id} value={emp.id}>
                      {emp.name} ({emp.email}) — {emp.role || 'Staff'} {emp.department ? `[${emp.department}]` : ''}
                    </option>
                  ))
                )}
              </select>
            </div>

            {/* Certificate Title */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Certificate Title / Competency <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="e.g. ISO 9001 Lead Auditor, CNC Lathe Level-3 Operator"
                value={formTitle}
                onChange={e => setFormTitle(e.target.value)}
                className={`w-full p-2.5 rounded-xl border text-xs sm:text-sm outline-none transition-all ${
                  isDarkMode
                    ? 'bg-[#111115] border-white/10 text-white placeholder:text-slate-600 focus:border-[var(--accent-primary)]'
                    : 'bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400 focus:border-[var(--accent-primary)]'
                }`}
              />
            </div>

            {/* Issuing Body */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Issuing Authority / Board <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="e.g. TÜV SÜD, NSDC, American Welding Society"
                value={formIssuingBody}
                onChange={e => setFormIssuingBody(e.target.value)}
                className={`w-full p-2.5 rounded-xl border text-xs sm:text-sm outline-none transition-all ${
                  isDarkMode
                    ? 'bg-[#111115] border-white/10 text-white placeholder:text-slate-600 focus:border-[var(--accent-primary)]'
                    : 'bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400 focus:border-[var(--accent-primary)]'
                }`}
              />
            </div>

            {/* Dates Grid */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Issued Date <span className="text-rose-500">*</span>
                </label>
                <input
                  type="date"
                  required
                  value={formIssuedDate}
                  onChange={e => setFormIssuedDate(e.target.value)}
                  className={`w-full p-2.5 rounded-xl border text-xs sm:text-sm outline-none transition-all font-mono ${
                    isDarkMode
                      ? 'bg-[#111115] border-white/10 text-white focus:border-[var(--accent-primary)]'
                      : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-[var(--accent-primary)]'
                  }`}
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Expiry Date
                  </label>
                  <label className="text-[11px] text-slate-500 flex items-center gap-1.5 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={!formHasExpiry}
                      onChange={e => setFormHasExpiry(!e.target.checked)}
                      className="rounded text-[var(--accent-primary)] focus:ring-[var(--accent-primary)]"
                    />
                    <span>Lifetime</span>
                  </label>
                </div>
                <input
                  type="date"
                  disabled={!formHasExpiry}
                  value={formExpiryDate}
                  onChange={e => setFormExpiryDate(e.target.value)}
                  min={formIssuedDate}
                  className={`w-full p-2.5 rounded-xl border text-xs sm:text-sm outline-none transition-all font-mono ${
                    !formHasExpiry
                      ? 'opacity-40 cursor-not-allowed bg-slate-100 dark:bg-white/[0.02]'
                      : isDarkMode
                      ? 'bg-[#111115] border-white/10 text-white focus:border-[var(--accent-primary)]'
                      : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-[var(--accent-primary)]'
                  }`}
                />
              </div>
            </div>

            {/* Document Upload Dropzone */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Certificate Document (Optional PDF / Scan)
              </label>
              <div className="flex items-center gap-3">
                <label className={`cursor-pointer inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border text-xs font-semibold transition-all ${
                  isDarkMode
                    ? 'bg-[#111115] border-white/10 hover:bg-white/[0.05] text-white'
                    : 'bg-slate-50 border-slate-200 hover:bg-slate-100 text-slate-800'
                }`}>
                  <UploadCloud className="w-4 h-4 text-amber-500" />
                  <span>{isUploading ? 'Uploading document...' : 'Upload Document'}</span>
                  <input
                    type="file"
                    className="hidden"
                    accept=".pdf,.png,.jpg,.jpeg,.docx"
                    onChange={handleFileUpload}
                    disabled={isUploading}
                  />
                </label>
                {uploadedFileName && (
                  <span className="text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5 font-medium truncate max-w-[200px]">
                    <FileCheck className="w-4 h-4 shrink-0" />
                    <span className="truncate">{uploadedFileName}</span>
                  </span>
                )}
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200 dark:border-white/10">
              <button
                type="button"
                onClick={() => setIsAssignModalOpen(false)}
                className="px-4 py-2 rounded-xl border border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/[0.05] text-xs font-semibold transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting || isUploading}
                className="px-4 py-2 rounded-xl bg-[var(--accent-primary)] hover:opacity-90 text-white font-semibold text-xs shadow-md shadow-[var(--accent-shadow)] transition-all disabled:opacity-50 cursor-pointer active:scale-95"
              >
                {isSubmitting ? 'Assigning...' : 'Confirm Assignment'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};
