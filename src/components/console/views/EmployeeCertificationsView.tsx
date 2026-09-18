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
  FileCheck
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

    return { total, active, expired, expiringSoon };
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
      setFormError('Please select a valid employee.');
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
      setFormError('Please specify an expiry date or mark as lifetime credential.');
      return;
    }
    if (formHasExpiry && formExpiryDate && new Date(formExpiryDate) < new Date(formIssuedDate)) {
      setFormError('Expiry date cannot be earlier than issued date.');
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

  return (
    <div className={`p-6 max-w-7xl mx-auto space-y-6 ${isDarkMode ? 'text-gray-100' : 'text-gray-900'}`}>
      {/* Top Banner & Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-2 border-b border-gray-200 dark:border-gray-800">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-500 dark:bg-amber-400/10 dark:text-amber-400">
              <Award className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Employee Certifications</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Staff professional credentials, training qualifications & compliance licenses
              </p>
            </div>
          </div>
        </div>

        {/* Assign Certificate Button - ONLY rendered if canAssign (HR) */}
        {canAssign && (
          <button
            id="assign-cert-btn"
            onClick={handleOpenAssignModal}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-medium shadow-sm transition-all hover:shadow-md hover:scale-[1.01] active:scale-[0.99]"
          >
            <Plus className="w-4 h-4" />
            <span>Assign Certificate</span>
          </button>
        )}
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className={`p-4 rounded-xl border ${isDarkMode ? 'bg-gray-900/60 border-gray-800' : 'bg-white border-gray-200 shadow-sm'}`}>
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Total Listed</span>
            <Award className="w-4 h-4 text-gray-400" />
          </div>
          <div className="mt-2 text-2xl font-bold">{stats.total}</div>
          <span className="text-xs text-gray-500 dark:text-gray-400">Recorded credentials</span>
        </div>

        <div className={`p-4 rounded-xl border ${isDarkMode ? 'bg-gray-900/60 border-gray-800' : 'bg-white border-gray-200 shadow-sm'}`}>
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">Active</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="mt-2 text-2xl font-bold text-emerald-600 dark:text-emerald-400">{stats.active}</div>
          <span className="text-xs text-gray-500 dark:text-gray-400">Compliant & verified</span>
        </div>

        <div className={`p-4 rounded-xl border ${isDarkMode ? 'bg-gray-900/60 border-gray-800' : 'bg-white border-gray-200 shadow-sm'}`}>
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-amber-600 dark:text-amber-400">Expiring Soon</span>
            <Clock className="w-4 h-4 text-amber-500" />
          </div>
          <div className="mt-2 text-2xl font-bold text-amber-600 dark:text-amber-400">{stats.expiringSoon}</div>
          <span className="text-xs text-gray-500 dark:text-gray-400">Within 30 calendar days</span>
        </div>

        <div className={`p-4 rounded-xl border ${isDarkMode ? 'bg-gray-900/60 border-gray-800' : 'bg-white border-gray-200 shadow-sm'}`}>
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-rose-600 dark:text-rose-400">Expired</span>
            <AlertTriangle className="w-4 h-4 text-rose-500" />
          </div>
          <div className="mt-2 text-2xl font-bold text-rose-600 dark:text-rose-400">{stats.expired}</div>
          <span className="text-xs text-gray-500 dark:text-gray-400">Requires renewal / retrain</span>
        </div>
      </div>

      {/* Tabs & Filter Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        {/* Tab Navigation: "My Certifications" vs "All Certifications" */}
        <div className="inline-flex p-1 rounded-xl bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
          <button
            id="tab-my-certifications"
            onClick={() => onTabChange('my')}
            className={`px-4 py-1.5 text-sm font-medium rounded-lg transition-all ${
              activeTab === 'my'
                ? 'bg-white dark:bg-gray-900 text-amber-600 dark:text-amber-400 shadow-sm'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
            }`}
          >
            My Certifications ({myCertifications.length})
          </button>

          {/* All Certifications tab ONLY rendered if user has ALL view scope (HR, Owner, ServerAdmin, Admin) */}
          {canViewAll && (
            <button
              id="tab-all-certifications"
              onClick={() => onTabChange('all')}
              className={`px-4 py-1.5 text-sm font-medium rounded-lg transition-all ${
                activeTab === 'all'
                  ? 'bg-white dark:bg-gray-900 text-amber-600 dark:text-amber-400 shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
              }`}
            >
              All Staff Certifications ({certifications.length})
            </button>
          )}
        </div>

        {/* Search & Status Filters */}
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search title, issuer, staff..."
              value={searchQuery}
              onChange={e => onSearchChange(e.target.value)}
              className={`pl-9 pr-3 py-1.5 text-sm rounded-lg border outline-none transition-all ${
                isDarkMode
                  ? 'bg-gray-900 border-gray-700 text-gray-200 focus:border-amber-500'
                  : 'bg-white border-gray-300 text-gray-800 focus:border-amber-500'
              }`}
            />
          </div>

          <div className="inline-flex rounded-lg border border-gray-200 dark:border-gray-700 p-0.5 bg-gray-100 dark:bg-gray-800 text-xs">
            {(['ALL', 'ACTIVE', 'EXPIRED'] as const).map(status => (
              <button
                key={status}
                onClick={() => onStatusFilterChange(status)}
                className={`px-2.5 py-1 rounded-md font-medium transition-all ${
                  statusFilter === status
                    ? 'bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 shadow-xs'
                    : 'text-gray-500 hover:text-gray-800 dark:hover:text-gray-200'
                }`}
              >
                {status}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main List Table / Cards */}
      <div className={`rounded-xl border overflow-hidden ${isDarkMode ? 'bg-gray-900/50 border-gray-800' : 'bg-white border-gray-200 shadow-sm'}`}>
        {isLoading ? (
          <div className="p-12 text-center text-gray-400 flex flex-col items-center gap-2">
            <Clock className="w-8 h-8 animate-spin text-amber-500" />
            <p className="text-sm">Loading certifications...</p>
          </div>
        ) : filteredList.length === 0 ? (
          <div className="p-12 text-center text-gray-400 flex flex-col items-center gap-3">
            <Award className="w-12 h-12 text-gray-300 dark:text-gray-600" />
            <div>
              <p className="font-medium text-gray-700 dark:text-gray-300">No certifications found</p>
              <p className="text-xs text-gray-500 mt-1">
                {searchQuery || statusFilter !== 'ALL'
                  ? 'Try modifying your search query or status filter.'
                  : activeTab === 'my'
                  ? 'You currently have no certificates assigned to your profile.'
                  : 'No employee certificates have been recorded yet.'}
              </p>
            </div>
            {canAssign && (
              <button
                onClick={handleOpenAssignModal}
                className="mt-2 text-xs text-amber-600 dark:text-amber-400 hover:underline font-medium"
              >
                + Assign the first certificate
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className={`border-b text-xs font-semibold uppercase tracking-wider ${isDarkMode ? 'bg-gray-800/60 border-gray-800 text-gray-400' : 'bg-gray-50 border-gray-200 text-gray-500'}`}>
                  {activeTab === 'all' && <th className="p-3.5">Employee</th>}
                  <th className="p-3.5">Certificate & Issuer</th>
                  <th className="p-3.5">Issued Date</th>
                  <th className="p-3.5">Expiry Date</th>
                  <th className="p-3.5">Status</th>
                  <th className="p-3.5">Attachment</th>
                  <th className="p-3.5">Assigned By</th>
                  {canAssign && <th className="p-3.5 text-right">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                {filteredList.map(cert => {
                  const isExpiringSoon = !cert.isExpired && cert.daysUntilExpiry !== null && cert.daysUntilExpiry !== undefined && cert.daysUntilExpiry >= 0 && cert.daysUntilExpiry <= 30;

                  return (
                    <tr
                      key={cert.id}
                      className={`transition-colors ${isDarkMode ? 'hover:bg-gray-800/40' : 'hover:bg-gray-50/80'}`}
                    >
                      {/* Employee Column (shown on "All" tab) */}
                      {activeTab === 'all' && (
                        <td className="p-3.5 whitespace-nowrap">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 font-semibold flex items-center justify-center text-xs">
                              {(cert.employeeName || cert.employee?.name || 'U').charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <div className="font-medium text-gray-900 dark:text-gray-100">
                                {cert.employeeName || cert.employee?.name || 'Staff Member'}
                              </div>
                              <div className="text-xs text-gray-500 dark:text-gray-400">
                                {cert.employee?.department || 'Operations'} · {cert.employee?.role || 'User'}
                              </div>
                            </div>
                          </div>
                        </td>
                      )}

                      {/* Certificate Title & Issuer */}
                      <td className="p-3.5">
                        <div className="font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-1.5">
                          <Award className="w-4 h-4 text-amber-500 flex-shrink-0" />
                          <span>{cert.title}</span>
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                          Issuing Body: <span className="font-medium">{cert.issuingBody}</span>
                        </div>
                      </td>

                      {/* Issued Date */}
                      <td className="p-3.5 whitespace-nowrap text-gray-700 dark:text-gray-300 text-xs">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-gray-400" />
                          <span>{cert.issuedDate}</span>
                        </div>
                      </td>

                      {/* Expiry Date */}
                      <td className="p-3.5 whitespace-nowrap text-xs">
                        {cert.expiryDate ? (
                          <div className="flex items-center gap-1.5">
                            <Calendar className="w-3.5 h-3.5 text-gray-400" />
                            <span className={cert.isExpired ? 'text-rose-600 dark:text-rose-400 font-semibold' : 'text-gray-700 dark:text-gray-300'}>
                              {cert.expiryDate}
                            </span>
                          </div>
                        ) : (
                          <span className="text-gray-400 italic">Lifetime credential</span>
                        )}
                      </td>

                      {/* Status Badge */}
                      <td className="p-3.5 whitespace-nowrap">
                        {cert.isExpired ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
                            <AlertTriangle className="w-3 h-3" />
                            Expired
                          </span>
                        ) : isExpiringSoon ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                            <Clock className="w-3 h-3" />
                            Expires in {cert.daysUntilExpiry}d
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                            <CheckCircle2 className="w-3 h-3" />
                            Active
                          </span>
                        )}
                      </td>

                      {/* Attachment Document */}
                      <td className="p-3.5 whitespace-nowrap text-xs">
                        {cert.documentUrl ? (
                          <a
                            href={cert.documentUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-amber-600 dark:text-amber-400 hover:underline font-medium"
                          >
                            <FileText className="w-3.5 h-3.5" />
                            <span>View Doc</span>
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        ) : (
                          <span className="text-gray-400 text-xs">—</span>
                        )}
                      </td>

                      {/* Assigned By */}
                      <td className="p-3.5 whitespace-nowrap text-xs text-gray-500 dark:text-gray-400">
                        <div className="flex items-center gap-1">
                          <ShieldCheck className="w-3.5 h-3.5 text-amber-500" />
                          <span>{cert.assignedByName || 'HR Admin'}</span>
                        </div>
                      </td>

                      {/* Actions (Revoke) - ONLY HR (canAssign) */}
                      {canAssign && (
                        <td className="p-3.5 text-right whitespace-nowrap">
                          <button
                            onClick={() => {
                              if (window.confirm(`Are you sure you want to revoke "${cert.title}"?`)) {
                                onDeleteCertification(cert.id, cert.title);
                              }
                            }}
                            className="p-1.5 rounded-lg text-gray-400 hover:text-rose-600 hover:bg-rose-500/10 transition-colors"
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

      {/* Assign Certificate Modal (Rendered ONLY if canAssign is true) */}
      {canAssign && (
        <Modal
          isOpen={isAssignModalOpen}
          onClose={() => setIsAssignModalOpen(false)}
          title="Assign Professional Certificate"
        >
          <form onSubmit={handleAssignSubmit} className="space-y-4 text-sm">
            {formError && (
              <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            {/* Target Employee Selection */}
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                Target Employee <span className="text-rose-500">*</span>
              </label>
              <select
                value={formEmployeeId}
                onChange={e => setFormEmployeeId(e.target.value)}
                required
                className={`w-full p-2 rounded-lg border text-sm outline-none transition-all ${
                  isDarkMode
                    ? 'bg-gray-900 border-gray-700 text-gray-100 focus:border-amber-500'
                    : 'bg-white border-gray-300 text-gray-900 focus:border-amber-500'
                }`}
              >
                {employeesList.length === 0 ? (
                  <option value="">No employees loaded</option>
                ) : (
                  employeesList.map(emp => (
                    <option key={emp.id} value={emp.id}>
                      {emp.name} ({emp.email}) — {emp.role || 'Staff'}
                    </option>
                  ))
                )}
              </select>
            </div>

            {/* Certificate Title */}
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                Certificate Title / Qualification <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="e.g. ISO 9001 Lead Auditor, CNC Level-3 Operator"
                value={formTitle}
                onChange={e => setFormTitle(e.target.value)}
                className={`w-full p-2 rounded-lg border text-sm outline-none transition-all ${
                  isDarkMode
                    ? 'bg-gray-900 border-gray-700 text-gray-100 focus:border-amber-500'
                    : 'bg-white border-gray-300 text-gray-900 focus:border-amber-500'
                }`}
              />
            </div>

            {/* Issuing Body */}
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                Issuing Body / Authority <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="e.g. TÜV SÜD, NSDC, American Welding Society"
                value={formIssuingBody}
                onChange={e => setFormIssuingBody(e.target.value)}
                className={`w-full p-2 rounded-lg border text-sm outline-none transition-all ${
                  isDarkMode
                    ? 'bg-gray-900 border-gray-700 text-gray-100 focus:border-amber-500'
                    : 'bg-white border-gray-300 text-gray-900 focus:border-amber-500'
                }`}
              />
            </div>

            {/* Dates Row */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Issued Date <span className="text-rose-500">*</span>
                </label>
                <input
                  type="date"
                  required
                  value={formIssuedDate}
                  onChange={e => setFormIssuedDate(e.target.value)}
                  className={`w-full p-2 rounded-lg border text-sm outline-none transition-all ${
                    isDarkMode
                      ? 'bg-gray-900 border-gray-700 text-gray-100 focus:border-amber-500'
                      : 'bg-white border-gray-300 text-gray-900 focus:border-amber-500'
                  }`}
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-medium text-gray-700 dark:text-gray-300">
                    Expiry Date
                  </label>
                  <label className="text-xs text-gray-500 flex items-center gap-1 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={!formHasExpiry}
                      onChange={e => setFormHasExpiry(!e.target.checked)}
                      className="rounded text-amber-600 focus:ring-amber-500"
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
                  className={`w-full p-2 rounded-lg border text-sm outline-none transition-all ${
                    !formHasExpiry
                      ? 'opacity-40 cursor-not-allowed bg-gray-100 dark:bg-gray-800'
                      : isDarkMode
                      ? 'bg-gray-900 border-gray-700 text-gray-100 focus:border-amber-500'
                      : 'bg-white border-gray-300 text-gray-900 focus:border-amber-500'
                  }`}
                />
              </div>
            </div>

            {/* Document Upload */}
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                Certificate Document (Optional PDF / Scan)
              </label>
              <div className="flex items-center gap-3">
                <label className="cursor-pointer inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-xs font-medium">
                  <UploadCloud className="w-4 h-4 text-amber-500" />
                  <span>{isUploading ? 'Uploading...' : 'Choose File'}</span>
                  <input
                    type="file"
                    className="hidden"
                    accept=".pdf,.png,.jpg,.jpeg,.docx"
                    onChange={handleFileUpload}
                    disabled={isUploading}
                  />
                </label>
                {uploadedFileName && (
                  <span className="text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-1 font-medium">
                    <FileCheck className="w-4 h-4" />
                    {uploadedFileName}
                  </span>
                )}
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-800">
              <button
                type="button"
                onClick={() => setIsAssignModalOpen(false)}
                className="px-4 py-2 rounded-xl border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 text-xs font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting || isUploading}
                className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-medium text-xs shadow-sm transition-all disabled:opacity-50"
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
