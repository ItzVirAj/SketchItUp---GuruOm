import React, { useMemo, useState } from 'react';
import {
  Users,
  Building2,
  Clock3,
  Edit3,
  Mail,
  Phone,
  RefreshCw,
  Search,
  ShieldCheck,
  UserRound,
  X,
  Save,
  Copy,
  Check,
  LayoutGrid,
  Table as TableIcon,
  ChevronRight,
  Briefcase,
  UserCheck,
  Sparkles
} from 'lucide-react';
import { EmployeeMasterRecord } from '../../../types/console';
import { Modal } from '../../common/Modal';
import { getRoleColor } from '../../../utils/permissions';
import { toast } from '../../../context/ToastContext';

interface Props {
  employees: EmployeeMasterRecord[];
  isLoadingEmployees?: boolean;
  canManageEmployees?: boolean;
  isDarkMode?: boolean;
  onUpdateEmployee?: (id: string, updates: Partial<{
    name: string;
    email: string;
    department: string;
    phone: string;
    reportingManager: string;
    shift: string;
  }>) => Promise<any>;
  onRefresh?: () => Promise<any> | void;
}

const statuses = ['ALL', 'ACTIVE', 'REVOKED', 'SUSPENDED'] as const;
type StatusType = (typeof statuses)[number];

function getInitials(name: string): string {
  if (!name) return 'EM';
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export const EmployeeMasterView: React.FC<Props> = ({
  employees = [],
  isLoadingEmployees = false,
  canManageEmployees = false,
  isDarkMode = true,
  onUpdateEmployee,
  onRefresh
}) => {
  const [search, setSearch] = useState('');
  const [department, setDepartment] = useState('ALL');
  const [status, setStatus] = useState<StatusType>('ALL');
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');
  const [selected, setSelected] = useState<EmployeeMasterRecord | null>(null);
  const [saving, setSaving] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: '',
    email: '',
    department: '',
    phone: '',
    reportingManager: '',
    shift: ''
  });

  const departments = useMemo(
    () => Array.from(new Set(employees.map(e => e.department).filter(Boolean))).sort(),
    [employees]
  );

  const statusCounts = useMemo(() => {
    return {
      ALL: employees.length,
      ACTIVE: employees.filter(e => e.status === 'ACTIVE').length,
      REVOKED: employees.filter(e => e.status === 'REVOKED').length,
      SUSPENDED: employees.filter(e => e.status === 'SUSPENDED').length
    };
  }, [employees]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return employees.filter(e => {
      const textMatch =
        !q ||
        [e.employeeCode, e.name, e.email, e.role, e.department, e.phone, e.reportingManager]
          .some(v => String(v || '').toLowerCase().includes(q));
      return (
        textMatch &&
        (department === 'ALL' || e.department === department) &&
        (status === 'ALL' || e.status === status)
      );
    });
  }, [employees, search, department, status]);

  const openEdit = (e: EmployeeMasterRecord) => {
    setSelected(e);
    setForm({
      name: e.name || '',
      email: e.email || '',
      department: e.department || '',
      phone: e.phone || '',
      reportingManager: e.reportingManager || '',
      shift: e.shift || ''
    });
  };

  const save = async () => {
    if (!selected || !onUpdateEmployee) return;
    setSaving(true);
    try {
      await onUpdateEmployee(selected.id, form);
      setSelected(null);
    } finally {
      setSaving(false);
    }
  };

  const handleCopy = (text: string, key: string, label: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    toast.success(`${label} copied to clipboard.`, 'Copied');
    setTimeout(() => setCopiedKey(null), 1800);
  };

  const cardBase = isDarkMode
    ? 'bg-[#09090B] border-white/10 text-white shadow-[0_16px_40px_rgba(0,0,0,0.6)]'
    : 'bg-white border-slate-200/80 shadow-sm text-slate-900';

  const inputClass = `w-full rounded-xl border px-3.5 py-2.5 text-sm transition-ui outline-none ${
    isDarkMode
      ? 'border-white/10 bg-white/[0.04] text-white placeholder:text-slate-500 focus:border-[var(--accent-primary)] focus:bg-white/[0.06] focus:ring-2 focus:ring-[var(--accent-ring)]'
      : 'border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 focus:border-[var(--accent-primary)] focus:ring-2 focus:ring-[var(--accent-ring)] shadow-xs'
  }`;

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
              <span>HR / People Operations • Internal Staff Roster</span>
            </div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight text-white flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/15 backdrop-blur-md border border-white/20 text-white shadow-inner">
                <Users className="h-5 w-5" />
              </div>
              Employee Management
            </h1>
            <p className={`text-xs sm:text-sm max-w-2xl font-normal leading-relaxed ${
              isDarkMode ? 'text-white/60' : 'text-blue-100'
            }`}>
              Canonical staff records projected from internal accounts. Manage roles, department assignments, and contact records.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0 self-start lg:self-center">
            {/* View Switcher (macOS Segmented Toggle) */}
            <div className={`p-1 rounded-full border backdrop-blur-md flex items-center gap-1 ${
              isDarkMode ? 'border-white/15 bg-white/[0.06]' : 'border-white/25 bg-white/20'
            }`}>
              <button
                type="button"
                onClick={() => setViewMode('table')}
                title="Table View"
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                  viewMode === 'table'
                    ? 'bg-white text-slate-900 shadow-sm'
                    : isDarkMode ? 'text-white/70 hover:text-white' : 'text-white/90 hover:text-white'
                }`}
              >
                <TableIcon className="h-3.5 w-3.5" />
                <span>Table</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('grid')}
                title="Cards Grid View"
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                  viewMode === 'grid'
                    ? 'bg-white text-slate-900 shadow-sm'
                    : isDarkMode ? 'text-white/70 hover:text-white' : 'text-white/90 hover:text-white'
                }`}
              >
                <LayoutGrid className="h-3.5 w-3.5" />
                <span>Cards</span>
              </button>
            </div>

            {/* Refresh Action */}
            <button
              type="button"
              onClick={() => onRefresh?.()}
              disabled={isLoadingEmployees}
              className="inline-flex h-11 items-center gap-2 rounded-full border border-white/20 bg-white/10 hover:bg-white/15 text-white text-xs font-semibold transition-all cursor-pointer active:scale-95 shadow-sm disabled:opacity-50 px-4 backdrop-blur-md"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isLoadingEmployees ? 'animate-spin text-white' : ''}`} />
              <span>Refresh</span>
            </button>
          </div>
        </div>

        {/* Mini Metric Dashboard Strip with SOLID VIBRANT ICON SQUIRCLES */}
        <div className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-3">
          {/* Card 1: Total Staff */}
          <div className={`p-4 rounded-2xl border backdrop-blur-md flex items-center gap-3.5 transition-colors ${
            isDarkMode ? 'bg-white/[0.04] border-white/10' : 'bg-white/15 border-white/25'
          }`}>
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white text-blue-600 shadow-md shadow-black/10">
              <Users className="w-5 h-5" />
            </div>
            <div className="min-w-0 flex-1">
              <span className={`text-[10px] font-bold uppercase tracking-wider block ${isDarkMode ? 'text-white/50' : 'text-blue-100'}`}>
                Total Staff
              </span>
              <span className="text-xl sm:text-2xl font-bold font-mono text-white block tabular-nums">
                {employees.length}
              </span>
              <span className={`text-[10px] truncate block ${isDarkMode ? 'text-white/40' : 'text-blue-100/80'}`}>
                Enrolled employees
              </span>
            </div>
          </div>

          {/* Card 2: Active Staff */}
          <div className={`p-4 rounded-2xl border backdrop-blur-md flex items-center gap-3.5 transition-colors ${
            isDarkMode ? 'bg-white/[0.04] border-white/10' : 'bg-white/15 border-white/25'
          }`}>
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-600 text-white shadow-md shadow-emerald-500/30">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div className="min-w-0 flex-1">
              <span className={`text-[10px] font-bold uppercase tracking-wider block ${isDarkMode ? 'text-white/50' : 'text-blue-100'}`}>
                Active Staff
              </span>
              <span className="text-xl sm:text-2xl font-bold font-mono text-white block tabular-nums">
                {employees.filter(e => e.status === 'ACTIVE').length}
              </span>
              <span className={`text-[10px] truncate block ${isDarkMode ? 'text-white/40' : 'text-blue-100/80'}`}>
                Active credentials
              </span>
            </div>
          </div>

          {/* Card 3: Departments */}
          <div className={`p-4 rounded-2xl border backdrop-blur-md flex items-center gap-3.5 transition-colors ${
            isDarkMode ? 'bg-white/[0.04] border-white/10' : 'bg-white/15 border-white/25'
          }`}>
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-purple-600 text-white shadow-md shadow-purple-500/30">
              <Building2 className="w-5 h-5" />
            </div>
            <div className="min-w-0 flex-1">
              <span className={`text-[10px] font-bold uppercase tracking-wider block ${isDarkMode ? 'text-white/50' : 'text-blue-100'}`}>
                Departments
              </span>
              <span className="text-xl sm:text-2xl font-bold font-mono text-white block tabular-nums">
                {departments.length}
              </span>
              <span className={`text-[10px] truncate block ${isDarkMode ? 'text-white/40' : 'text-blue-100/80'}`}>
                Functional units
              </span>
            </div>
          </div>

          {/* Card 4: Filtered Staff */}
          <div className={`p-4 rounded-2xl border backdrop-blur-md flex items-center gap-3.5 transition-colors ${
            isDarkMode ? 'bg-white/[0.04] border-white/10' : 'bg-white/15 border-white/25'
          }`}>
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-amber-500 text-white shadow-md shadow-amber-500/30">
              <UserCheck className="w-5 h-5" />
            </div>
            <div className="min-w-0 flex-1">
              <span className={`text-[10px] font-bold uppercase tracking-wider block ${isDarkMode ? 'text-white/50' : 'text-blue-100'}`}>
                Filtered Roster
              </span>
              <span className="text-xl sm:text-2xl font-bold font-mono text-white block tabular-nums">
                {filtered.length}
              </span>
              <span className={`text-[10px] truncate block ${isDarkMode ? 'text-white/40' : 'text-blue-100/80'}`}>
                Matching view
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* ── CONTROLS & APPLE SEGMENTED FILTER BAR ──                            */}
      {/* ========================================================================= */}
      <div className={`p-3 sm:p-4 rounded-3xl border transition-ui space-y-3 ${cardBase}`}>
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
          {/* SF-Style Inset Search Field */}
          <div className="relative min-w-0 flex-1">
            <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search staff by name, code, email, role, department..."
              className={`h-10 w-full rounded-xl border pl-10 pr-9 text-xs sm:text-sm transition-ui outline-none ${
                isDarkMode
                  ? 'border-white/10 bg-black/40 text-white placeholder:text-slate-500 focus:border-[var(--accent-primary)] focus:bg-black/60 focus:ring-2 focus:ring-[var(--accent-ring)]'
                  : 'border-slate-200 bg-slate-50/80 text-slate-900 placeholder:text-slate-400 focus:border-[var(--accent-primary)] focus:bg-white focus:ring-2 focus:ring-[var(--accent-ring)] shadow-2xs'
              }`}
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 rounded-full text-slate-400 hover:text-white hover:bg-white/10 transition-ui cursor-pointer"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          <div className="flex flex-wrap sm:flex-nowrap items-center gap-2">
            {/* Department Pop-up Menu */}
            <div className="relative min-w-[160px] flex-1 sm:flex-initial">
              <select
                value={department}
                onChange={e => setDepartment(e.target.value)}
                className={`h-10 w-full rounded-xl border px-3.5 text-xs font-semibold transition-ui outline-none cursor-pointer ${
                  isDarkMode
                    ? 'border-white/10 bg-black/40 text-slate-200 focus:border-[var(--accent-primary)]'
                    : 'border-slate-200 bg-white text-slate-700 focus:border-[var(--accent-primary)] shadow-2xs'
                }`}
              >
                <option value="ALL">All Departments ({departments.length})</option>
                {departments.map(d => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>

            {/* Apple Segmented Control for Status */}
            <div
              className={`p-1 rounded-full border flex items-center gap-1 overflow-x-auto scrollbar-none w-full sm:w-auto ${
                isDarkMode ? 'bg-white/[0.04] border-white/10' : 'bg-slate-100/80 border-slate-200/80'
              }`}
            >
              {statuses.map(s => {
                const isActive = status === s;
                const count = statusCounts[s];
                return (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setStatus(s)}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                      isActive
                        ? isDarkMode ? 'bg-white text-slate-950 shadow-sm' : 'bg-[#155dfc] text-white shadow-sm'
                        : isDarkMode
                          ? 'text-slate-400 hover:text-white hover:bg-white/[0.06]'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                    }`}
                  >
                    <span>{s === 'ALL' ? 'All' : s}</span>
                    <span
                      className={`px-1.5 py-0.5 rounded-full text-[10px] tabular-nums font-bold ${
                        isActive
                          ? isDarkMode ? 'bg-slate-900 text-white' : 'bg-white/20 text-white'
                          : isDarkMode ? 'bg-white/10 text-slate-400' : 'bg-slate-200 text-slate-700'
                      }`}
                    >
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* ── PRESENTATION VIEW: TABLE LIST (macOS Grouped Table) ──                */}
      {/* ========================================================================= */}
      {viewMode === 'table' && (
        <div className={`overflow-hidden rounded-3xl border transition-ui ${cardBase}`}>
          <div className={`flex items-center justify-between border-b px-5 py-3 ${isDarkMode ? 'border-white/[0.07]' : 'border-slate-200'}`}>
            <div>
              <div className="text-xs font-extrabold text-slate-900 dark:text-white">Staff Roster Directory</div>
              <div className="mt-0.5 text-[10px] text-slate-400">Canonical personnel & credential ledger</div>
            </div>
            <span className={`rounded-lg border px-2 py-1 font-mono text-[9px] font-bold uppercase tracking-wider ${isDarkMode ? 'border-white/[0.08] bg-white/[0.04] text-slate-400' : 'border-slate-200 bg-slate-50 text-slate-500'}`}>
              {filtered.length} Staff Members
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px] text-left border-collapse">
              <thead>
                <tr
                  className={`border-b font-mono font-bold uppercase tracking-[0.12em] text-[9px] select-none ${
                    isDarkMode
                      ? 'border-white/[0.08] bg-black/20 text-slate-400'
                      : 'border-slate-200 bg-slate-50/80 text-slate-500'
                  }`}
                >
                  <th className="px-5 py-4">Employee</th>
                  <th className="px-4 py-4">Role & Access</th>
                  <th className="px-4 py-4">Department</th>
                  <th className="px-4 py-4">Contact Details</th>
                  <th className="px-4 py-4">Schedule</th>
                  <th className="px-4 py-4">Status</th>
                  {canManageEmployees && <th className="px-5 py-4 text-right">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04] dark:divide-white/[0.04]">
                {isLoadingEmployees ? (
                  <tr>
                    <td colSpan={canManageEmployees ? 7 : 6} className="px-5 py-20 text-center">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <RefreshCw className="h-6 w-6 animate-spin text-[var(--accent-text-dark)]" />
                        <span className={`text-xs font-mono ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                          Loading Employee Master records…
                        </span>
                      </div>
                    </td>
                  </tr>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={canManageEmployees ? 7 : 6} className="px-5 py-16 text-center">
                      <div className="flex flex-col items-center justify-center max-w-sm mx-auto">
                        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--accent-soft-light)] dark:bg-[var(--accent-soft-dark)] text-[var(--accent-text-light)] dark:text-[var(--accent-text-dark)] mb-3">
                          <Users className="h-6 w-6" />
                        </div>
                        <p className={`text-sm font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                          No matching employee records
                        </p>
                        <p className={`text-xs mt-1 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                          {search || department !== 'ALL' || status !== 'ALL'
                            ? 'Try clearing or changing your search filters to view staff.'
                            : 'No active employee records are available in the master catalog.'}
                        </p>
                        {(search || department !== 'ALL' || status !== 'ALL') && (
                          <button
                            type="button"
                            onClick={() => {
                              setSearch('');
                              setDepartment('ALL');
                              setStatus('ALL');
                            }}
                            className="mt-3.5 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[var(--accent-soft-light)] dark:bg-[var(--accent-soft-dark)] text-[var(--accent-text-light)] dark:text-[var(--accent-text-dark)] border border-[var(--accent-border-light)] dark:border-[var(--accent-border-dark)] text-xs font-semibold transition-ui cursor-pointer"
                          >
                            Reset Filters
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ) : (
                  filtered.map(e => {
                    const roleColor = getRoleColor(e.role);
                    const initials = getInitials(e.name);
                    const isCopied = copiedKey === e.id;

                    return (
                      <tr
                        key={e.id}
                        className={`transition-colors group ${
                          isDarkMode
                            ? 'hover:bg-white/[0.035]'
                            : 'hover:bg-slate-50/80'
                        }`}
                      >
                        {/* Employee Details & Monogram */}
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-3">
                            <div
                              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[var(--accent-soft-light)] dark:bg-[var(--accent-soft-dark)] text-[var(--accent-text-light)] dark:text-[var(--accent-text-dark)] border border-[var(--accent-border-light)] dark:border-[var(--accent-border-dark)] font-bold text-xs"
                            >
                              {initials}
                            </div>
                            <div className="min-w-0">
                              <div
                                className={`text-sm font-bold truncate ${
                                  isDarkMode ? 'text-white' : 'text-slate-900'
                                }`}
                              >
                                {e.name}
                              </div>
                              <div className="flex items-center gap-1.5 mt-0.5">
                                <button
                                  type="button"
                                  onClick={() => handleCopy(e.employeeCode, e.id, 'Employee code')}
                                  title="Click to copy employee code"
                                  className="inline-flex items-center gap-1 font-mono font-bold text-[10px] text-[var(--accent-primary)] dark:text-[var(--accent-text-dark)] hover:opacity-80 transition-ui cursor-pointer"
                                >
                                  <span>{e.employeeCode}</span>
                                  {isCopied ? (
                                    <Check className="h-2.5 w-2.5 text-emerald-400" />
                                  ) : (
                                    <Copy className="h-2.5 w-2.5 opacity-0 group-hover:opacity-70 transition-opacity" />
                                  )}
                                </button>
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Role Badge */}
                        <td className="px-4 py-3.5">
                          <span
                            className={`inline-flex rounded-lg border px-2.5 py-1 text-[10px] font-semibold tracking-wide ${roleColor.bg} ${roleColor.text} ${roleColor.border}`}
                          >
                            {e.role}
                          </span>
                        </td>

                        {/* Department */}
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-1.5">
                            <Building2 className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                            <span
                              className={`text-xs font-medium truncate ${
                                isDarkMode ? 'text-slate-200' : 'text-slate-700'
                              }`}
                            >
                              {e.department || 'General Staff'}
                            </span>
                          </div>
                          {e.reportingManager && (
                            <div className="text-[10px] text-slate-400 mt-0.5 pl-5 truncate">
                              Reports to: {e.reportingManager}
                            </div>
                          )}
                        </td>

                        {/* Contact Info */}
                        <td className="px-4 py-3.5">
                          <div className="space-y-1">
                            <button
                              type="button"
                              onClick={() => handleCopy(e.email, `${e.id}-email`, 'Email')}
                              className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-[var(--accent-text-dark)] transition-ui cursor-pointer truncate max-w-[200px]"
                              title="Click to copy email"
                            >
                              <Mail className="h-3.5 w-3.5 shrink-0 opacity-70" />
                              <span className="truncate">{e.email}</span>
                            </button>
                            {e.phone && (
                              <a
                                href={`tel:${e.phone}`}
                                className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-[var(--accent-text-dark)] transition-ui truncate"
                                title="Click to call"
                              >
                                <Phone className="h-3.5 w-3.5 shrink-0 opacity-70" />
                                <span>{e.phone}</span>
                              </a>
                            )}
                          </div>
                        </td>

                        {/* Shift Schedule */}
                        <td className="px-4 py-3.5">
                          <span
                            className={`inline-flex items-center gap-1.5 rounded-xl border px-2.5 py-1 text-[11px] font-mono ${
                              isDarkMode
                                ? 'border-white/10 bg-white/[0.02] text-slate-300'
                                : 'border-slate-200 bg-slate-50 text-slate-700'
                            }`}
                          >
                            <Clock3 className="h-3 w-3 text-slate-400" />
                            {e.shift || 'General-Day'}
                          </span>
                        </td>

                        {/* Account Status */}
                        <td className="px-4 py-3.5">
                          <span
                            className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[9px] font-mono font-bold ${
                              e.status === 'ACTIVE'
                                ? isDarkMode
                                  ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
                                  : 'border-emerald-200 bg-emerald-50 text-emerald-700'
                                : e.status === 'REVOKED'
                                  ? isDarkMode
                                    ? 'border-rose-500/30 bg-rose-500/10 text-rose-300'
                                    : 'border-rose-200 bg-rose-50 text-rose-700'
                                  : isDarkMode
                                    ? 'border-amber-500/30 bg-amber-500/10 text-amber-300'
                                    : 'border-amber-200 bg-amber-50 text-amber-700'
                            }`}
                          >
                            <span
                              className={`h-1.5 w-1.5 rounded-full ${
                                e.status === 'ACTIVE'
                                  ? 'bg-emerald-400'
                                  : e.status === 'REVOKED'
                                    ? 'bg-rose-400'
                                    : 'bg-amber-400'
                              }`}
                            />
                            {e.status}
                          </span>
                        </td>

                        {/* Actions */}
                        {canManageEmployees && (
                          <td className="px-5 py-3.5 text-right">
                            <button
                              type="button"
                              onClick={() => openEdit(e)}
                              className={`inline-flex h-8 items-center gap-1.5 rounded-xl border px-3 text-xs font-semibold transition-ui cursor-pointer active:scale-95 ${
                                isDarkMode
                                  ? 'border-white/10 text-slate-300 hover:border-[var(--accent-border-dark)] hover:bg-[var(--accent-soft-dark)] hover:text-[var(--accent-text-dark)]'
                                  : 'border-slate-200 text-slate-700 hover:border-[var(--accent-border-light)] hover:bg-[var(--accent-soft-light)] hover:text-[var(--accent-text-light)] shadow-2xs'
                              }`}
                            >
                              <Edit3 className="h-3 w-3" />
                              <span>Edit</span>
                            </button>
                          </td>
                        )}
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* ── PRESENTATION VIEW: CARDS GRID (Apple Contacts Grid) ──               */}
      {/* ========================================================================= */}
      {viewMode === 'grid' && (
        <div>
          {isLoadingEmployees ? (
            <div className={`p-16 rounded-3xl border text-center font-mono ${cardBase}`}>
              <RefreshCw className="h-6 w-6 animate-spin text-[var(--accent-text-dark)] mx-auto mb-2" />
              Loading staff profiles…
            </div>
          ) : filtered.length === 0 ? (
            <div className={`p-12 rounded-3xl border text-center ${cardBase}`}>
              <Users className="h-8 w-8 text-slate-400 mx-auto mb-2 opacity-80" />
              <h3 className={`text-sm font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                No employee records found
              </h3>
              <p className={`text-xs mt-0.5 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                No records match your active search filters.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-3.5 sm:gap-4">
              {filtered.map(e => {
                const roleColor = getRoleColor(e.role);
                const initials = getInitials(e.name);

                return (
                  <div
                    key={e.id}
                    className={`rounded-3xl border p-4 sm:p-5 flex flex-col justify-between transition-ui hover:scale-[1.01] ${cardBase} ${
                      isDarkMode ? 'hover:border-white/20' : 'hover:border-slate-300'
                    }`}
                  >
                    <div>
                      {/* Card Header: Avatar, Status & Role */}
                      <div className="flex items-start justify-between gap-3">
                        <div
                          className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--accent-soft-light)] dark:bg-[var(--accent-soft-dark)] text-[var(--accent-text-light)] dark:text-[var(--accent-text-dark)] border border-[var(--accent-border-light)] dark:border-[var(--accent-border-dark)] font-bold text-sm"
                        >
                          {initials}
                        </div>
                        <div className="flex flex-col items-end gap-1.5">
                          <span
                            className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[9px] font-mono font-bold ${
                              e.status === 'ACTIVE'
                                ? isDarkMode
                                  ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
                                  : 'border-emerald-200 bg-emerald-50 text-emerald-700'
                                : isDarkMode
                                  ? 'border-amber-500/30 bg-amber-500/10 text-amber-300'
                                  : 'border-amber-200 bg-amber-50 text-amber-700'
                            }`}
                          >
                            <span
                              className={`h-1.5 w-1.5 rounded-full ${
                                e.status === 'ACTIVE' ? 'bg-emerald-400' : 'bg-amber-400'
                              }`}
                            />
                            {e.status}
                          </span>
                          <span
                            className={`inline-flex rounded-lg border px-2 py-0.5 text-[9px] font-semibold ${roleColor.bg} ${roleColor.text} ${roleColor.border}`}
                          >
                            {e.role}
                          </span>
                        </div>
                      </div>

                      {/* Name & ID */}
                      <div className="mt-3">
                        <h3 className={`text-base font-bold truncate ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                          {e.name}
                        </h3>
                        <div className="flex items-center gap-1.5 mt-0.5 font-mono text-[11px] text-slate-400">
                          <span>{e.employeeCode}</span>
                          <span>•</span>
                          <span className="truncate">{e.department || 'Staff'}</span>
                        </div>
                      </div>

                      {/* Inset Metadata Details */}
                      <div
                        className={`mt-3.5 p-3 rounded-2xl border space-y-2 text-xs ${
                          isDarkMode ? 'bg-black/30 border-white/[0.06]' : 'bg-slate-50 border-slate-200/80'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-slate-400 text-[11px] flex items-center gap-1">
                            <Clock3 className="h-3 w-3" /> Shift
                          </span>
                          <span className={`font-mono font-medium ${isDarkMode ? 'text-slate-200' : 'text-slate-700'}`}>
                            {e.shift || 'General-Day'}
                          </span>
                        </div>
                        {e.reportingManager && (
                          <div className="flex items-center justify-between gap-2 pt-1.5 border-t border-white/5 dark:border-white/5">
                            <span className="text-slate-400 text-[11px] flex items-center gap-1">
                              <Briefcase className="h-3 w-3" /> Manager
                            </span>
                            <span className={`truncate font-medium ${isDarkMode ? 'text-slate-200' : 'text-slate-700'}`}>
                              {e.reportingManager}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Card Footer: Quick Actions */}
                    <div className="mt-4 pt-3 border-t border-white/[0.06] dark:border-white/[0.06] flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5">
                        <a
                          href={`mailto:${e.email}`}
                          title={`Email ${e.name}`}
                          className={`flex h-8 w-8 items-center justify-center rounded-xl border transition-ui cursor-pointer ${
                            isDarkMode
                              ? 'border-white/10 bg-white/[0.04] text-slate-300 hover:bg-white/[0.08] hover:text-white'
                              : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-100 hover:text-slate-950'
                          }`}
                        >
                          <Mail className="h-3.5 w-3.5" />
                        </a>
                        {e.phone && (
                          <a
                            href={`tel:${e.phone}`}
                            title={`Call ${e.name}`}
                            className={`flex h-8 w-8 items-center justify-center rounded-xl border transition-ui cursor-pointer ${
                              isDarkMode
                                ? 'border-white/10 bg-white/[0.04] text-slate-300 hover:bg-white/[0.08] hover:text-white'
                                : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-100 hover:text-slate-950'
                            }`}
                          >
                            <Phone className="h-3.5 w-3.5" />
                          </a>
                        )}
                        <button
                          type="button"
                          onClick={() => handleCopy(`${e.name} (${e.employeeCode}) - ${e.email}`, e.id, 'Contact Info')}
                          title="Copy Contact Details"
                          className={`flex h-8 w-8 items-center justify-center rounded-xl border transition-ui cursor-pointer ${
                            isDarkMode
                              ? 'border-white/10 bg-white/[0.04] text-slate-300 hover:bg-white/[0.08] hover:text-white'
                              : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-100 hover:text-slate-950'
                          }`}
                        >
                          <Copy className="h-3.5 w-3.5" />
                        </button>
                      </div>

                      {canManageEmployees && (
                        <button
                          type="button"
                          onClick={() => openEdit(e)}
                          className={`inline-flex h-8 items-center gap-1.5 rounded-xl border px-3 text-xs font-semibold transition-ui cursor-pointer active:scale-95 ${
                            isDarkMode
                              ? 'border-[var(--accent-border-dark)] bg-[var(--accent-soft-dark)] text-[var(--accent-text-dark)] hover:bg-[var(--accent-primary)] hover:text-white'
                              : 'border-[var(--accent-border-light)] bg-[var(--accent-soft-light)] text-[var(--accent-text-light)] hover:bg-[var(--accent-primary)] hover:text-white'
                          }`}
                        >
                          <Edit3 className="h-3 w-3" />
                          <span>Edit</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* ── APPLE PROFILE INSPECTOR / EDIT SHEET MODAL ──                        */}
      {/* ========================================================================= */}
      <Modal
        isOpen={Boolean(selected)}
        onClose={() => !saving && setSelected(null)}
        title="Employee Profile Details"
        subtitle={selected ? `${selected.name} (${selected.employeeCode})` : undefined}
        icon={<UserRound className="w-5 h-5 text-[var(--accent-text-dark)]" />}
        isDarkMode={isDarkMode}
        maxWidth="2xl"
      >
        {selected && (
          <div className="space-y-5 font-sans">
            {/* Profile Overview Card */}
            <div
              className={`rounded-2xl border p-4 flex items-center gap-4 ${
                isDarkMode
                  ? 'border-white/10 bg-white/[0.035] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06)]'
                  : 'border-slate-200 bg-slate-50'
              }`}
            >
              <div
                className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[var(--accent-soft-light)] dark:bg-[var(--accent-soft-dark)] text-[var(--accent-text-light)] dark:text-[var(--accent-text-dark)] border border-[var(--accent-border-light)] dark:border-[var(--accent-border-dark)] font-bold text-lg"
              >
                {getInitials(selected.name)}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className={`text-base font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                    {selected.name}
                  </h3>
                  <span
                    className={`inline-flex rounded-md border px-2 py-0.5 text-[10px] font-semibold ${
                      getRoleColor(selected.role).bg
                    } ${getRoleColor(selected.role).text} ${getRoleColor(selected.role).border}`}
                  >
                    {selected.role}
                  </span>
                  <span
                    className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[9px] font-mono font-bold ${
                      selected.status === 'ACTIVE'
                        ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400'
                        : 'border-amber-500/30 bg-amber-500/10 text-amber-400'
                    }`}
                  >
                    {selected.status}
                  </span>
                </div>
                <div className="font-mono text-xs text-slate-400 mt-1">
                  Employee Code: <span className="font-bold text-[var(--accent-text-dark)]">{selected.employeeCode}</span>
                </div>
              </div>
            </div>

            {/* Apple Grouped Inset Section 1: Personal & Contact */}
            <div
              className={`rounded-2xl border p-4 space-y-3.5 ${
                isDarkMode ? 'border-white/[0.08] bg-black/20' : 'border-slate-200 bg-white'
              }`}
            >
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[var(--accent-text-dark)] font-mono">
                <UserRound className="h-3.5 w-3.5" /> Personal & Contact Info
              </div>
              <div className="grid gap-3.5 sm:grid-cols-2">
                <label className="block">
                  <span className="mb-1.5 block text-xs font-semibold text-slate-400">Full Name</span>
                  <input
                    className={inputClass}
                    value={form.name}
                    onChange={e => setForm({ ...form, name: e.target.value })}
                    placeholder="e.g. John Doe"
                    type="text"
                  />
                </label>
                <label className="block">
                  <span className="mb-1.5 block text-xs font-semibold text-slate-400">Email Address</span>
                  <input
                    className={inputClass}
                    value={form.email}
                    onChange={e => setForm({ ...form, email: e.target.value })}
                    placeholder="e.g. user@guruom.com"
                    type="email"
                  />
                </label>
                <label className="block sm:col-span-2">
                  <span className="mb-1.5 block text-xs font-semibold text-slate-400">Phone Number</span>
                  <input
                    className={inputClass}
                    value={form.phone}
                    onChange={e => setForm({ ...form, phone: e.target.value })}
                    placeholder="e.g. +91 98765 43210"
                    type="tel"
                  />
                </label>
              </div>
            </div>

            {/* Apple Grouped Inset Section 2: Organization & Work Schedule */}
            <div
              className={`rounded-2xl border p-4 space-y-3.5 ${
                isDarkMode ? 'border-white/[0.08] bg-black/20' : 'border-slate-200 bg-white'
              }`}
            >
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[var(--accent-text-dark)] font-mono">
                <Building2 className="h-3.5 w-3.5" /> Organization & Schedule
              </div>
              <div className="grid gap-3.5 sm:grid-cols-2">
                <label className="block">
                  <span className="mb-1.5 block text-xs font-semibold text-slate-400">Department</span>
                  <input
                    className={inputClass}
                    value={form.department}
                    onChange={e => setForm({ ...form, department: e.target.value })}
                    placeholder="e.g. Production / Quality Control"
                    type="text"
                  />
                </label>
                <label className="block">
                  <span className="mb-1.5 block text-xs font-semibold text-slate-400">Reporting Manager</span>
                  <input
                    className={inputClass}
                    value={form.reportingManager}
                    onChange={e => setForm({ ...form, reportingManager: e.target.value })}
                    placeholder="e.g. Jane Smith"
                    type="text"
                  />
                </label>
                <label className="block sm:col-span-2">
                  <span className="mb-1.5 block text-xs font-semibold text-slate-400">Work Shift</span>
                  <input
                    className={inputClass}
                    value={form.shift}
                    onChange={e => setForm({ ...form, shift: e.target.value })}
                    placeholder="e.g. General-Day, Shift-A (06:00-14:00)"
                    type="text"
                  />
                </label>
              </div>
            </div>

            {/* RBAC Policy Notice */}
            <div
              className={`rounded-2xl border px-4 py-3 text-xs flex items-start gap-2.5 ${
                isDarkMode
                  ? 'border-amber-500/30 bg-amber-500/[0.08] text-amber-200'
                  : 'border-amber-200 bg-amber-50 text-amber-800'
              }`}
            >
              <Sparkles className="h-4 w-4 shrink-0 text-amber-400 mt-0.5" />
              <p className="leading-relaxed">
                Role tier, employee code, account credentials, and system login status remain governed under RBAC security administration.
              </p>
            </div>

            {/* Sheet Actions */}
            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-white/[0.08] dark:border-white/[0.08]">
              <button
                type="button"
                onClick={() => setSelected(null)}
                disabled={saving}
                className={`inline-flex h-11 items-center gap-2 rounded-xl border px-4 text-xs font-semibold transition-ui cursor-pointer ${
                  isDarkMode
                    ? 'border-white/10 bg-white/[0.04] text-slate-300 hover:bg-white/[0.08] hover:text-white'
                    : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-100'
                }`}
              >
                <X className="h-4 w-4" /> Cancel
              </button>
              <button
                type="button"
                onClick={save}
                disabled={saving || !form.name.trim() || !form.email.trim()}
                className="inline-flex h-11 items-center gap-2 rounded-xl bg-[var(--accent-primary)] hover:bg-[var(--accent-hover)] text-white px-5 text-xs font-extrabold shadow-[0_8px_20px_var(--accent-shadow)] transition-ui cursor-pointer active:scale-96 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Save className="h-4 w-4" />
                {saving ? 'Saving Changes…' : 'Save Changes'}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
