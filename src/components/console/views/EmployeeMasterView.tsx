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
import { useAccentTheme } from '../../../context/AccentThemeContext';
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
  const { accent, isGreen, isBlue, isCrystal } = useAccentTheme();
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
    ? isCrystal
      ? 'border-white/10 bg-gradient-to-b from-[#181C24] via-[#10131A] to-[#0A0C10] text-white shadow-[0_16px_40px_rgba(0,0,0,0.6)]'
      : isGreen
        ? 'border-emerald-500/20 bg-gradient-to-b from-[#0D241B] via-[#081711] to-[#030B07] text-white shadow-[0_16px_40px_rgba(0,0,0,0.6)]'
        : 'border-white/10 bg-[#09090B] text-white shadow-[0_16px_40px_rgba(0,0,0,0.6)]'
    : isCrystal
      ? 'border-slate-300/80 bg-gradient-to-b from-white via-[#F8FAFC] to-[#EEF2F6] text-slate-900 shadow-sm'
      : 'border-slate-200/80 bg-white text-slate-900 shadow-sm';

  const inputClass = `w-full rounded-xl border px-3.5 py-2.5 text-sm transition-ui outline-none ${
    isDarkMode
      ? 'border-white/10 bg-white/[0.04] text-white placeholder:text-slate-500 focus:border-[var(--accent-primary)] focus:bg-white/[0.06] focus:ring-2 focus:ring-[var(--accent-ring)]'
      : 'border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 focus:border-[var(--accent-primary)] focus:ring-2 focus:ring-[var(--accent-ring)] shadow-xs'
  }`;

  return (
    <div className="space-y-4 sm:space-y-6 font-sans">
      {/* ========================================================================= */}
      {/* ── MOBILE VIEW (< md): Header + 2x2 Matrix ──                            */}
      {/* ========================================================================= */}
      <div className="block md:hidden space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[var(--accent-primary)] animate-pulse" />
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400">
                HR Operations
              </span>
            </div>
            <h1 className="text-xl font-black text-slate-900 dark:text-white tracking-tight leading-tight">
              Employees ({filtered.length})
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setViewMode(viewMode === 'table' ? 'grid' : 'table')}
              className="flex h-9 items-center gap-1.5 px-2.5 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/[0.06] text-xs font-bold text-slate-700 dark:text-slate-200 shadow-xs cursor-pointer"
            >
              {viewMode === 'table' ? <LayoutGrid className="w-3.5 h-3.5" /> : <TableIcon className="w-3.5 h-3.5" />}
              <span>{viewMode === 'table' ? 'Cards' : 'Table'}</span>
            </button>
            <button
              type="button"
              onClick={() => onRefresh?.()}
              disabled={isLoadingEmployees}
              className="flex h-9 items-center gap-1.5 px-3 rounded-xl bg-[var(--accent-primary)] text-white text-xs font-bold shadow-sm active:scale-95 transition-transform cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoadingEmployees ? 'animate-spin' : ''}`} />
              <span>Sync</span>
            </button>
          </div>
        </div>

        {/* 2x2 Telemetry Matrix */}
        <div className="grid grid-cols-2 gap-2">
          <div className={`p-3 rounded-2xl border transition-all ${
            isDarkMode
              ? isCrystal ? 'border-white/10 bg-white/[0.04]' : isGreen ? 'border-emerald-500/15 bg-emerald-950/20' : 'border-blue-500/15 bg-blue-950/20'
              : isCrystal ? 'border-slate-200 bg-white shadow-xs' : isGreen ? 'border-emerald-100 bg-emerald-50/50' : 'border-blue-100 bg-blue-50/50'
          }`}>
            <div className="flex items-center gap-2 mb-1">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[var(--accent-primary)] text-white shadow-xs">
                <Users className="w-3.5 h-3.5" />
              </div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Staff</span>
            </div>
            <p className="text-xl font-black font-mono text-slate-900 dark:text-white tabular-nums">
              {employees.length}
            </p>
          </div>

          <div className={`p-3 rounded-2xl border transition-all ${
            isDarkMode
              ? isCrystal ? 'border-white/10 bg-white/[0.04]' : isGreen ? 'border-emerald-500/15 bg-emerald-950/20' : 'border-blue-500/15 bg-blue-950/20'
              : isCrystal ? 'border-slate-200 bg-white shadow-xs' : isGreen ? 'border-emerald-100 bg-emerald-50/50' : 'border-blue-100 bg-blue-50/50'
          }`}>
            <div className="flex items-center gap-2 mb-1">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-600 text-white shadow-xs">
                <ShieldCheck className="w-3.5 h-3.5" />
              </div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Active</span>
            </div>
            <p className="text-xl font-black font-mono text-emerald-600 dark:text-emerald-400 tabular-nums">
              {employees.filter(e => e.status === 'ACTIVE').length}
            </p>
          </div>

          <div className={`p-3 rounded-2xl border transition-all ${
            isDarkMode
              ? isCrystal ? 'border-white/10 bg-white/[0.04]' : isGreen ? 'border-emerald-500/15 bg-emerald-950/20' : 'border-blue-500/15 bg-blue-950/20'
              : isCrystal ? 'border-slate-200 bg-white shadow-xs' : isGreen ? 'border-emerald-100 bg-emerald-50/50' : 'border-blue-100 bg-blue-50/50'
          }`}>
            <div className="flex items-center gap-2 mb-1">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-purple-600 text-white shadow-xs">
                <Building2 className="w-3.5 h-3.5" />
              </div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Depts</span>
            </div>
            <p className="text-xl font-black font-mono text-purple-500 tabular-nums">
              {departments.length}
            </p>
          </div>

          <div className={`p-3 rounded-2xl border transition-all ${
            isDarkMode
              ? isCrystal ? 'border-white/10 bg-white/[0.04]' : isGreen ? 'border-emerald-500/15 bg-emerald-950/20' : 'border-blue-500/15 bg-blue-950/20'
              : isCrystal ? 'border-slate-200 bg-white shadow-xs' : isGreen ? 'border-emerald-100 bg-emerald-50/50' : 'border-blue-100 bg-blue-50/50'
          }`}>
            <div className="flex items-center gap-2 mb-1">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-500 text-white shadow-xs">
                <UserCheck className="w-3.5 h-3.5" />
              </div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Filtered</span>
            </div>
            <p className="text-xl font-black font-mono text-amber-500 tabular-nums">
              {filtered.length}
            </p>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* ── DESKTOP VIEW (hidden md:block): Executive Hero Banner ──               */}
      {/* ========================================================================= */}
      <section className={`hidden md:block relative overflow-hidden rounded-2xl border transition-all duration-300 ${
        isDarkMode
          ? isCrystal
            ? 'border-white/10 bg-gradient-to-b from-[#181C24] via-[#10131A] to-[#0A0C10] text-white shadow-[0_16px_44px_rgba(0,0,0,0.6)]'
            : isGreen
              ? 'border-emerald-500/20 bg-gradient-to-b from-[#0D241B] via-[#081711] to-[#030B07] text-white shadow-[0_16px_44px_rgba(0,0,0,0.6),inset_0_1px_0_0_rgba(16,185,129,0.12)]'
              : 'border-blue-500/20 bg-gradient-to-b from-[#0a1836] via-[#071126] to-[#030712] text-white shadow-[0_16px_44px_rgba(0,0,0,0.6),inset_0_1px_0_0_rgba(21,93,252,0.15)]'
          : isCrystal
            ? 'border-slate-300/80 bg-gradient-to-b from-white via-[#F8FAFC] to-[#EEF2F6] text-slate-950 shadow-[0_16px_40px_rgba(0,0,0,0.06),inset_0_1px_0_0_rgba(255,255,255,0.95)]'
            : isGreen
              ? 'border-emerald-600/30 bg-gradient-to-b from-[#0A7E58] via-[#086B4A] to-[#044F36] text-white shadow-[0_16px_40px_rgba(10,126,88,0.22)]'
              : 'border-[#155dfc]/30 bg-gradient-to-b from-[#1b64ff] via-[#155dfc] to-[#0f52dc] text-white shadow-[0_16px_40px_rgba(21,93,252,0.25)]'
      }`}>
        {/* Subtle Drafting Grid Pattern */}
        {!isDarkMode && isCrystal && (
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 -z-10 bg-grid-pattern opacity-40 [mask-image:linear-gradient(to_bottom,black,transparent_72%)] [-webkit-mask-image:linear-gradient(to_bottom,black,transparent_72%)]"
          />
        )}

        <div className="p-6 lg:p-8">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold tracking-wide backdrop-blur-md border shadow-xs transition-colors">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className={
                  !isDarkMode && isCrystal ? 'text-slate-600' : 'text-white/90'
                }>
                  HR / People Operations • Internal Staff Roster
                </span>
              </div>
              <h1 className={`text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight flex items-center gap-3 ${
                !isDarkMode && isCrystal ? 'text-slate-900' : 'text-white'
              }`}>
                <div className={`flex h-10 w-10 items-center justify-center rounded-2xl shadow-inner ${
                  !isDarkMode && isCrystal
                    ? 'bg-slate-100 border border-slate-200 text-slate-800'
                    : 'bg-white/15 backdrop-blur-md border border-white/20 text-white'
                }`}>
                  <Users className="h-5 w-5" />
                </div>
                Employee Management
              </h1>
              <p className={`text-xs sm:text-sm max-w-2xl font-normal leading-relaxed ${
                !isDarkMode && isCrystal ? 'text-slate-600' : isDarkMode ? 'text-white/60' : 'text-white/80'
              }`}>
                Canonical staff records projected from internal accounts. Manage roles, department assignments, and contact records.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2.5 shrink-0 self-start lg:self-center">
              {/* View Switcher */}
              <div className={`p-1 rounded-full border backdrop-blur-md flex items-center gap-1 ${
                !isDarkMode && isCrystal
                  ? 'border-slate-300/80 bg-slate-200/50'
                  : isDarkMode ? 'border-white/15 bg-white/[0.06]' : 'border-white/25 bg-white/20'
              }`}>
                <button
                  type="button"
                  onClick={() => setViewMode('table')}
                  title="Table View"
                  className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                    viewMode === 'table'
                      ? !isDarkMode && isCrystal
                        ? 'bg-slate-950 text-white shadow-xs'
                        : 'bg-white text-slate-900 shadow-sm'
                      : !isDarkMode && isCrystal
                        ? 'text-slate-600 hover:text-slate-900'
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
                      ? !isDarkMode && isCrystal
                        ? 'bg-slate-950 text-white shadow-xs'
                        : 'bg-white text-slate-900 shadow-sm'
                      : !isDarkMode && isCrystal
                        ? 'text-slate-600 hover:text-slate-900'
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
                className={`inline-flex h-11 items-center gap-2 rounded-full border text-xs font-semibold transition-all cursor-pointer active:scale-95 shadow-sm disabled:opacity-50 px-4 backdrop-blur-md ${
                  !isDarkMode && isCrystal
                    ? 'border-slate-300/80 bg-white/80 hover:bg-white text-slate-700'
                    : 'border-white/20 bg-white/10 hover:bg-white/15 text-white'
                }`}
              >
                <RefreshCw className={`h-3.5 w-3.5 ${isLoadingEmployees ? 'animate-spin' : ''}`} />
                <span>Refresh</span>
              </button>
            </div>
          </div>
        </div>

        {/* 4-Column Metric Strip */}
        <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 border-t ${
          isDarkMode
            ? 'border-white/10 bg-gradient-to-b from-black/40 to-black/70 backdrop-blur-md'
            : isCrystal
              ? 'border-slate-200/80 bg-slate-50/70'
              : 'border-white/20 bg-white/[0.06] backdrop-blur-sm'
        }`}>
          {/* Total Staff */}
          <div className={`p-4 sm:p-5 flex items-center gap-4 transition-colors ${
            !isDarkMode && isCrystal ? 'border-b sm:border-b-0 sm:border-r border-slate-200/80' : 'border-b sm:border-b-0 sm:border-r border-white/10'
          }`}>
            <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl shadow-sm ${
              !isDarkMode && isCrystal
                ? 'bg-slate-100 text-slate-800 border border-slate-200'
                : 'bg-white text-blue-600'
            }`}>
              <Users className="w-5 h-5" />
            </div>
            <div className="min-w-0 flex-1">
              <span className={`text-[10px] font-bold uppercase tracking-wider block ${
                !isDarkMode && isCrystal ? 'text-slate-500' : isDarkMode ? 'text-white/50' : 'text-blue-100'
              }`}>
                Total Staff
              </span>
              <span className={`text-2xl font-bold font-mono block tabular-nums ${
                !isDarkMode && isCrystal ? 'text-slate-900' : 'text-white'
              }`}>
                {employees.length}
              </span>
              <span className={`text-[10px] truncate block ${
                !isDarkMode && isCrystal ? 'text-slate-400' : isDarkMode ? 'text-white/40' : 'text-blue-100/80'
              }`}>
                Enrolled employees
              </span>
            </div>
          </div>

          {/* Active Staff */}
          <div className={`p-4 sm:p-5 flex items-center gap-4 transition-colors ${
            !isDarkMode && isCrystal ? 'border-b sm:border-b-0 sm:border-r border-slate-200/80' : 'border-b sm:border-b-0 sm:border-r border-white/10'
          }`}>
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-600 text-white shadow-sm shadow-emerald-500/30">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div className="min-w-0 flex-1">
              <span className={`text-[10px] font-bold uppercase tracking-wider block ${
                !isDarkMode && isCrystal ? 'text-slate-500' : isDarkMode ? 'text-white/50' : 'text-blue-100'
              }`}>
                Active Staff
              </span>
              <span className={`text-2xl font-bold font-mono block tabular-nums ${
                !isDarkMode && isCrystal ? 'text-emerald-700' : 'text-emerald-400'
              }`}>
                {employees.filter(e => e.status === 'ACTIVE').length}
              </span>
              <span className={`text-[10px] truncate block ${
                !isDarkMode && isCrystal ? 'text-slate-400' : isDarkMode ? 'text-white/40' : 'text-blue-100/80'
              }`}>
                Active credentials
              </span>
            </div>
          </div>

          {/* Departments */}
          <div className={`p-4 sm:p-5 flex items-center gap-4 transition-colors ${
            !isDarkMode && isCrystal ? 'border-b sm:border-b-0 sm:border-r border-slate-200/80' : 'border-b sm:border-b-0 sm:border-r border-white/10'
          }`}>
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-purple-600 text-white shadow-sm shadow-purple-500/30">
              <Building2 className="w-5 h-5" />
            </div>
            <div className="min-w-0 flex-1">
              <span className={`text-[10px] font-bold uppercase tracking-wider block ${
                !isDarkMode && isCrystal ? 'text-slate-500' : isDarkMode ? 'text-white/50' : 'text-blue-100'
              }`}>
                Departments
              </span>
              <span className={`text-2xl font-bold font-mono block tabular-nums ${
                !isDarkMode && isCrystal ? 'text-purple-700' : 'text-purple-400'
              }`}>
                {departments.length}
              </span>
              <span className={`text-[10px] truncate block ${
                !isDarkMode && isCrystal ? 'text-slate-400' : isDarkMode ? 'text-white/40' : 'text-blue-100/80'
              }`}>
                Functional units
              </span>
            </div>
          </div>

          {/* Filtered Staff */}
          <div className="p-4 sm:p-5 flex items-center gap-4 transition-colors">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-amber-500 text-white shadow-sm shadow-amber-500/30">
              <UserCheck className="w-5 h-5" />
            </div>
            <div className="min-w-0 flex-1">
              <span className={`text-[10px] font-bold uppercase tracking-wider block ${
                !isDarkMode && isCrystal ? 'text-slate-500' : isDarkMode ? 'text-white/50' : 'text-blue-100'
              }`}>
                Filtered Roster
              </span>
              <span className={`text-2xl font-bold font-mono block tabular-nums ${
                !isDarkMode && isCrystal ? 'text-amber-600' : 'text-amber-400'
              }`}>
                {filtered.length}
              </span>
              <span className={`text-[10px] truncate block ${
                !isDarkMode && isCrystal ? 'text-slate-400' : isDarkMode ? 'text-white/40' : 'text-blue-100/80'
              }`}>
                Matching view
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* ── CONTROLS & SEGMENTED FILTER BAR ──                                  */}
      {/* ========================================================================= */}
      <div className={`p-2.5 sm:p-3 rounded-2xl border transition-all space-y-3 ${
        isDarkMode
          ? 'border-white/10 bg-gradient-to-b from-[#111318] via-[#090a0d] to-[#020204]'
          : 'border-slate-200 bg-white shadow-xs'
      }`}>
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
          {/* SF-Style Inset Search Field */}
          <div className="relative min-w-0 flex-1">
            <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search staff by name, code, email, role, department..."
              className={`h-10 w-full rounded-xl border pl-10 pr-9 text-xs sm:text-sm transition-ui outline-none focus:border-[var(--accent-primary)] focus:ring-4 focus:ring-[var(--accent-primary)]/15 ${
                isDarkMode
                  ? 'border-white/10 bg-black/40 text-white placeholder:text-slate-500'
                  : 'border-slate-200 bg-slate-50/80 text-slate-900 placeholder:text-slate-400 shadow-2xs'
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
                className={`h-10 w-full rounded-xl border px-3.5 text-xs font-semibold transition-ui outline-none cursor-pointer focus:border-[var(--accent-primary)] focus:ring-4 focus:ring-[var(--accent-primary)]/15 ${
                  isDarkMode
                    ? 'border-white/10 bg-black/40 text-slate-200'
                    : 'border-slate-200 bg-white text-slate-700 shadow-2xs'
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

            {/* Segmented Control for Status (Inventory-aligned) */}
            <div
              className={`inline-flex items-center p-1 rounded-xl border text-xs overflow-x-auto max-w-full ${
                isDarkMode ? 'border-white/10 bg-black/60' : 'border-slate-200/80 bg-slate-200/50 shadow-inner'
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
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
                      isActive
                        ? isDarkMode
                          ? 'bg-white/15 text-white shadow-xs border border-white/10'
                          : 'bg-white text-slate-900 shadow-xs border border-slate-200/80'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    <span>{s === 'ALL' ? 'All' : s}</span>
                    <span
                      className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full ${
                        isActive
                          ? isDarkMode ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-800'
                          : isDarkMode ? 'bg-white/5 text-slate-400' : 'bg-slate-300/60 text-slate-600'
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
          <div className="h-[1px] w-full bg-gradient-to-r from-transparent via-white/70 dark:via-white/10 to-transparent" />
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
