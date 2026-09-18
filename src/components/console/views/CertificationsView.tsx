import React, { useState, useMemo } from 'react';
import {
  Award,
  Plus,
  Trash2,
  AlertTriangle,
  Search,
  Calendar,
  User,
  CheckCircle2,
  Building2,
  Clock,
  Sparkles,
  ShieldCheck
} from 'lucide-react';
import { Modal } from '../../common/Modal';
import { useUrlModal } from '../../../hooks/useUrlModal';
import { Certification } from '../../../services/consoleApiServices';
import { SystemUser } from '../../../types/console';

interface CertificationsViewProps {
  certifications: Certification[];
  isLoadingCertifications: boolean;
  canManageCertifications: boolean;
  users: SystemUser[];
  currentUser: SystemUser | null;
  isDarkMode: boolean;
  onCreateCertification: (payload: {
    employeeId: string;
    name: string;
    issuingBody?: string;
    issuedDate?: string;
    expiryDate?: string;
    notes?: string;
  }) => Promise<Certification>;
  onDeleteCertification: (id: string) => Promise<void>;
}

function getDaysRemaining(expiryDate?: string): number | null {
  if (!expiryDate) return null;
  const target = new Date(expiryDate).getTime();
  if (isNaN(target)) return null;
  return Math.ceil((target - Date.now()) / (1000 * 60 * 60 * 24));
}

function isExpiringSoon(expiryDate?: string): boolean {
  const days = getDaysRemaining(expiryDate);
  return days !== null && days >= 0 && days <= 30;
}

function isExpired(expiryDate?: string): boolean {
  const days = getDaysRemaining(expiryDate);
  return days !== null && days < 0;
}

export const CertificationsView: React.FC<CertificationsViewProps> = ({
  certifications,
  isLoadingCertifications,
  canManageCertifications,
  users,
  currentUser,
  isDarkMode,
  onCreateCertification,
  onDeleteCertification
}) => {
  const formModal = useUrlModal('cert-form');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Form State
  const [employeeId, setEmployeeId] = useState('');
  const [name, setName] = useState('');
  const [issuingBody, setIssuingBody] = useState('');
  const [issuedDate, setIssuedDate] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [notes, setNotes] = useState('');

  // Filter State
  const [filterTab, setFilterTab] = useState<'ALL' | 'VALID' | 'EXPIRING_SOON' | 'EXPIRED'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  const cardBase = isDarkMode
    ? 'bg-[#09090B] border-white/10 text-white shadow-[0_16px_40px_rgba(0,0,0,0.6)]'
    : 'bg-white border-slate-200/80 shadow-sm text-slate-900';

  const inputCls = `w-full mt-1.5 p-3 rounded-xl border text-sm font-sans transition-ui focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)]/40 ${
    isDarkMode
      ? 'bg-slate-950/60 border-slate-800 text-white placeholder:text-slate-600'
      : 'bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400'
  }`;

  // Metrics
  const expiringSoonCount = useMemo(
    () => certifications.filter((c) => isExpiringSoon(c.expiryDate)).length,
    [certifications]
  );
  const expiredCount = useMemo(
    () => certifications.filter((c) => isExpired(c.expiryDate)).length,
    [certifications]
  );
  const validCount = useMemo(
    () => certifications.filter((c) => !isExpired(c.expiryDate) && !isExpiringSoon(c.expiryDate)).length,
    [certifications]
  );

  // Filtered List
  const filteredCertifications = useMemo(() => {
    return certifications.filter((c) => {
      if (filterTab === 'VALID' && (isExpired(c.expiryDate) || isExpiringSoon(c.expiryDate))) return false;
      if (filterTab === 'EXPIRING_SOON' && !isExpiringSoon(c.expiryDate)) return false;
      if (filterTab === 'EXPIRED' && !isExpired(c.expiryDate)) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = (c.name || '').toLowerCase().includes(q);
        const matchesIssuer = (c.issuingBody || '').toLowerCase().includes(q);
        const matchesStaff = (c.employeeName || '').toLowerCase().includes(q);
        if (!matchesName && !matchesIssuer && !matchesStaff) return false;
      }
      return true;
    });
  }, [certifications, filterTab, searchQuery]);

  const handleSubmit = async () => {
    if (!name.trim()) return;
    setIsSubmitting(true);
    try {
      await onCreateCertification({
        employeeId: employeeId || currentUser?.id || '',
        name: name.trim(),
        issuingBody: issuingBody.trim() || undefined,
        issuedDate: issuedDate || undefined,
        expiryDate: expiryDate || undefined,
        notes: notes.trim() || undefined
      });
      formModal.close();
      setEmployeeId('');
      setName('');
      setIssuingBody('');
      setIssuedDate('');
      setExpiryDate('');
      setNotes('');
    } catch {
      // handled
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      await onDeleteCertification(id);
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6 font-sans">
      {/* ========================================================================= */}
      {/* ── TOP HERO HEADER (Apple HIG Banner) ──                                */}
      {/* ========================================================================= */}
      <div className={`p-6 sm:p-7 rounded-3xl border transition-all ${cardBase}`}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5 pb-6 border-b border-white/10 dark:border-white/10">
          <div className="flex items-start gap-4">
            <div className="p-3.5 rounded-2xl bg-[var(--accent-soft-light)] dark:bg-[var(--accent-soft-dark)] text-[var(--accent-text-light)] dark:text-[var(--accent-text-dark)] border border-[var(--accent-border-light)] dark:border-[var(--accent-border-dark)] shrink-0">
              <Award className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold tracking-wide bg-[var(--accent-soft-light)] dark:bg-[var(--accent-soft-dark)] text-[var(--accent-text-light)] dark:text-[var(--accent-text-dark)] border border-[var(--accent-border-light)] dark:border-[var(--accent-border-dark)]">
                  HR Module
                </span>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Compliance Tracking Active</span>
                </span>
              </div>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight">
                Certifications & Compliance
              </h1>
              <p className={`text-xs max-w-2xl leading-relaxed ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                Staff qualifications, licenses, and statutory safety credentials. Automated renewal alerts notify managers 30 days ahead of expiration.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 self-start sm:self-center">
            {/* Live Expiring Pill */}
            <div
              className={`p-3 sm:px-4 sm:py-2.5 rounded-2xl border font-mono text-right w-full sm:w-auto ${
                isDarkMode ? 'bg-black/40 border-white/10' : 'bg-slate-50 border-slate-200/80 shadow-2xs'
              }`}
            >
              <div className="flex sm:flex-col justify-between items-center sm:items-end">
                <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">
                  Expiring Soon
                </span>
                <span className={`text-xl sm:text-2xl font-bold tabular-nums ${expiringSoonCount > 0 ? 'text-amber-400' : 'text-slate-400'}`}>
                  {expiringSoonCount}
                </span>
              </div>
            </div>

            {canManageCertifications && (
              <button
                type="button"
                onClick={() => formModal.open()}
                className="flex h-11 shrink-0 items-center gap-2 rounded-xl bg-[var(--accent-primary)] px-4 text-xs font-extrabold text-white shadow-[0_8px_20px_var(--accent-shadow)] transition-ui hover:bg-[var(--accent-hover)] active:scale-[0.96] cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Add Certification</span>
              </button>
            )}
          </div>
        </div>

        {/* Apple 4-Column Metric Strip */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 pt-6">
          {[
            {
              label: 'Active & Valid',
              value: validCount,
              sub: 'In compliance, active period',
              icon: CheckCircle2,
              iconBg: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
            },
            {
              label: 'Expiring Soon (30d)',
              value: expiringSoonCount,
              sub: 'Requires renewal schedule',
              icon: AlertTriangle,
              iconBg: 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
            },
            {
              label: 'Expired Credentials',
              value: expiredCount,
              sub: 'Lapsed certification status',
              icon: Clock,
              iconBg: 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
            },
            {
              label: 'Total Tracked',
              value: certifications.length,
              sub: 'All employee credentials',
              icon: Award,
              iconBg: 'bg-[var(--accent-soft-light)] dark:bg-[var(--accent-soft-dark)] text-[var(--accent-text-light)] dark:text-[var(--accent-text-dark)] border border-[var(--accent-border-light)] dark:border-[var(--accent-border-dark)]'
            }
          ].map((m) => {
            const Icon = m.icon;
            return (
              <div
                key={m.label}
                className={`p-4 sm:p-5 rounded-2xl border transition-all ${
                  isDarkMode ? 'bg-black/40 border-white/10 hover:border-white/20' : 'bg-slate-50 border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className={`p-2.5 rounded-xl ${m.iconBg}`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <span className="text-[10px] font-mono uppercase font-semibold text-slate-400 tracking-wider">
                    {m.label}
                  </span>
                </div>
                <div className={`text-xl sm:text-2xl font-bold tracking-tight font-mono ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                  {m.value}
                </div>
                <div className="text-[11px] text-slate-400 mt-1 font-medium truncate">
                  {m.sub}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* ── APPLE SEGMENTED FILTER BAR ──                                        */}
      {/* ========================================================================= */}
      <div className={`p-2.5 sm:p-3 rounded-3xl border transition-ui flex flex-col md:flex-row md:items-center justify-between gap-3 ${cardBase}`}>
        <div
          className={`p-1 rounded-2xl border flex items-center overflow-x-auto scrollbar-none w-full md:w-auto ${
            isDarkMode ? 'bg-black/40 border-white/10' : 'bg-slate-100 border-slate-200'
          }`}
        >
          {[
            { id: 'ALL', label: 'All Certifications' },
            { id: 'VALID', label: 'Valid' },
            { id: 'EXPIRING_SOON', label: `Expiring Soon (${expiringSoonCount})` },
            { id: 'EXPIRED', label: 'Expired' }
          ].map((tab) => {
            const isActive = filterTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setFilterTab(tab.id as typeof filterTab)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-mono font-bold transition-ui cursor-pointer whitespace-nowrap ${
                  isActive
                    ? 'bg-[var(--accent-primary)] text-white shadow-sm'
                    : isDarkMode
                      ? 'text-slate-400 hover:text-white'
                      : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Search input */}
        <div className="relative w-full md:w-72 shrink-0">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search certificate, issuer, staff…"
            className={`w-full pl-9.5 pr-4 py-2 rounded-xl text-xs font-sans border transition-ui focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)]/40 ${
              isDarkMode
                ? 'bg-black/40 border-white/10 text-white placeholder:text-slate-500'
                : 'bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400'
            }`}
          />
        </div>
      </div>

      {/* ========================================================================= */}
      {/* ── CERTIFICATION CARDS LIST ──                                           */}
      {/* ========================================================================= */}
      <div className="space-y-3">
        {isLoadingCertifications ? (
          <div className={`p-12 rounded-3xl border text-center font-mono ${isDarkMode ? 'bg-[#09090B] border-white/10 text-slate-400' : 'bg-white border-slate-200 text-slate-500'}`}>
            <div className="inline-block animate-spin mb-3">
              <Award className="w-6 h-6 text-[var(--accent-primary)]" />
            </div>
            <p className="text-xs">Loading certification credentials…</p>
          </div>
        ) : filteredCertifications.length === 0 ? (
          <div className={`p-12 rounded-3xl border text-center ${cardBase}`}>
            <div className="w-12 h-12 mx-auto mb-3 rounded-2xl bg-[var(--accent-soft-light)] dark:bg-[var(--accent-soft-dark)] text-[var(--accent-text-light)] dark:text-[var(--accent-text-dark)] flex items-center justify-center border border-[var(--accent-border-light)] dark:border-[var(--accent-border-dark)]">
              <Award className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold tracking-tight">No certifications found</h3>
            <p className={`text-xs mt-1 max-w-sm mx-auto ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
              {searchQuery || filterTab !== 'ALL'
                ? 'Try broadening your search or switching filter tabs.'
                : 'Keep your team compliant by adding licenses and training certifications.'}
            </p>
            {(!searchQuery && filterTab === 'ALL' && canManageCertifications) && (
              <button
                type="button"
                onClick={() => formModal.open()}
                className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[var(--accent-primary)] text-white text-xs font-bold shadow-[0_8px_20px_var(--accent-shadow)] hover:bg-[var(--accent-hover)] transition-ui active:scale-95 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Certification</span>
              </button>
            )}
          </div>
        ) : (
          filteredCertifications.map((c) => {
            const expired = isExpired(c.expiryDate);
            const soon = isExpiringSoon(c.expiryDate);
            const daysLeft = getDaysRemaining(c.expiryDate);

            return (
              <div
                key={c.id}
                className={`p-5 rounded-2xl border transition-all ${cardBase} ${
                  expired
                    ? 'border-rose-500/30 dark:border-rose-500/30'
                    : soon
                      ? 'border-amber-500/30 dark:border-amber-500/30'
                      : 'hover:border-[var(--accent-primary)]/40'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-start gap-3.5">
                    <div
                      className={`p-3 rounded-2xl border shrink-0 ${
                        expired
                          ? 'bg-rose-500/10 text-rose-500 border-rose-500/20'
                          : soon
                            ? 'bg-amber-500/10 text-amber-500 border-amber-500/20'
                            : 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
                      }`}
                    >
                      <Award className="w-5 h-5" />
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-sm sm:text-base font-bold tracking-tight">{c.name}</h3>

                        {/* Status Chip */}
                        {expired ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
                            <AlertTriangle className="w-3 h-3" />
                            <span>Expired</span>
                          </span>
                        ) : soon ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                            <AlertTriangle className="w-3 h-3" />
                            <span>Expires in {daysLeft} {daysLeft === 1 ? 'day' : 'days'}</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                            <CheckCircle2 className="w-3 h-3" />
                            <span>Valid</span>
                          </span>
                        )}

                        {/* Staff name */}
                        {c.employeeName && (
                          <span className={`inline-flex items-center gap-1 text-xs font-medium ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                            <User className="w-3.5 h-3.5 text-slate-400" />
                            <span>{c.employeeName}</span>
                          </span>
                        )}
                      </div>

                      {/* Issuer & dates */}
                      <div className="flex items-center gap-3 text-xs text-slate-400 flex-wrap">
                        {c.issuingBody && (
                          <span className="flex items-center gap-1">
                            <Building2 className="w-3.5 h-3.5" />
                            <span>{c.issuingBody}</span>
                          </span>
                        )}

                        {c.issuedDate && (
                          <span className="font-mono">
                            Issued: {c.issuedDate}
                          </span>
                        )}

                        {c.expiryDate && (
                          <span className={`font-mono font-semibold ${expired ? 'text-rose-500' : soon ? 'text-amber-500' : ''}`}>
                            Expires: {c.expiryDate}
                          </span>
                        )}
                      </div>

                      {c.notes && (
                        <p className={`text-xs mt-1 ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                          {c.notes}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  {canManageCertifications && (
                    <button
                      type="button"
                      onClick={() => handleDelete(c.id)}
                      disabled={deletingId === c.id}
                      className={`shrink-0 p-2.5 rounded-xl border cursor-pointer transition-ui self-end sm:self-center active:scale-95 ${
                        isDarkMode
                          ? 'bg-rose-500/10 border-rose-500/30 text-rose-400 hover:bg-rose-500/20'
                          : 'bg-rose-50 border-rose-200 text-rose-600 hover:bg-rose-100'
                      }`}
                      title="Delete Certification"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* ========================================================================= */}
      {/* ── ADD CERTIFICATION MODAL (Apple Style) ──                            */}
      {/* ========================================================================= */}
      {canManageCertifications && (
        <Modal
          isOpen={formModal.isOpen}
          onClose={() => formModal.close()}
          isDarkMode={isDarkMode}
          maxWidth="md"
          icon={<Award className="w-5 h-5 text-[var(--accent-primary)]" />}
          title="Add Certification"
          subtitle="Record an employee license, safety permit, or training diploma."
          footer={
            <div className="flex items-center justify-end gap-3 w-full">
              <button
                type="button"
                onClick={() => formModal.close()}
                className={`min-h-[42px] px-4 py-2 rounded-xl text-xs font-bold transition-ui cursor-pointer ${
                  isDarkMode
                    ? 'text-slate-300 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10'
                    : 'border border-slate-200 text-slate-700 hover:bg-slate-100'
                }`}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={!name.trim() || !employeeId || isSubmitting}
                className="min-h-[42px] px-6 py-2 rounded-xl bg-[var(--accent-primary)] hover:bg-[var(--accent-hover)] text-white font-extrabold text-xs shadow-[0_8px_20px_var(--accent-shadow)] cursor-pointer transition-ui active:scale-[0.96] disabled:opacity-50"
              >
                {isSubmitting ? 'Saving…' : 'Add Certification'}
              </button>
            </div>
          }
        >
          <div className="space-y-4">
            <div>
              <label className={`text-xs font-semibold uppercase tracking-wide ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                Employee
              </label>
              <select
                value={employeeId}
                onChange={(e) => setEmployeeId(e.target.value)}
                className={inputCls}
              >
                <option value="">Select an employee…</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name} {u.email ? `(${u.email})` : ''}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className={`text-xs font-semibold uppercase tracking-wide ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                Certification / License Name
              </label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. ISO 9001 Internal Auditor / Forklift Operator"
                className={inputCls}
              />
            </div>

            <div>
              <label className={`text-xs font-semibold uppercase tracking-wide ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                Issuing Body / Authority
              </label>
              <input
                value={issuingBody}
                onChange={(e) => setIssuingBody(e.target.value)}
                placeholder="e.g. TÜV SÜD / Bureau Veritas / Red Cross"
                className={inputCls}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={`text-xs font-semibold uppercase tracking-wide ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                  Issue Date
                </label>
                <input
                  type="date"
                  value={issuedDate}
                  onChange={(e) => setIssuedDate(e.target.value)}
                  className={inputCls}
                />
              </div>
              <div>
                <label className={`text-xs font-semibold uppercase tracking-wide ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                  Expiry Date
                </label>
                <input
                  type="date"
                  value={expiryDate}
                  onChange={(e) => setExpiryDate(e.target.value)}
                  className={inputCls}
                />
              </div>
            </div>

            <div>
              <label className={`text-xs font-semibold uppercase tracking-wide ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                Notes / License No. (optional)
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                placeholder="License ID number, renewal requirements, or comments…"
                className={`${inputCls} resize-none`}
              />
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default CertificationsView;
