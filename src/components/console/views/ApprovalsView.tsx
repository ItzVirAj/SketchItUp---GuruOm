import React, { useState, useMemo } from 'react';
import { 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  Clock, 
  ShieldCheck, 
  FileText, 
  Percent, 
  Trash2, 
  DollarSign, 
  Check, 
  X, 
  ExternalLink,
  Search,
  Lock,
  UserCheck,
  ShieldAlert,
  Sparkles,
  Layers,
  ArrowUpRight
} from 'lucide-react';
import { PendingApproval, CustomerOrder, ConsoleUser, SystemUser, UserRole } from '../../../types/console';
import { useAccentTheme } from '../../../context/AccentThemeContext';

interface ApprovalsViewProps {
  approvals: PendingApproval[];
  orders?: CustomerOrder[];
  isDarkMode?: boolean;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
  onConfirmOrder?: (orderId: string) => void;
  onViewOrder?: (orderId: string) => void;
  currentUser?: ConsoleUser | SystemUser | null;
  currentRole?: UserRole;
}

export const ApprovalsView: React.FC<ApprovalsViewProps> = ({
  approvals,
  orders = [],
  isDarkMode = true,
  onApprove,
  onReject,
  onConfirmOrder,
  onViewOrder,
  currentUser,
  currentRole
}) => {
  const { accent, isGreen, isBlue, isCrystal } = useAccentTheme();
  const [filterType, setFilterType] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Access Control verification:
  // Submodule visible & editable exclusively to: Server Admin, Owner, Platform Admin, and HR
  const userRoleStr = (currentUser?.role || currentRole || '').toUpperCase();
  const isAuthorizedSignatory = useMemo(() => {
    return (
      userRoleStr === 'SERVERADMIN' ||
      userRoleStr === 'SERVER ADMIN' ||
      userRoleStr === 'OWNER' ||
      userRoleStr === 'ADMIN (SYSTEM)' ||
      userRoleStr === 'SUPER ADMIN' ||
      userRoleStr === 'ADMIN' ||
      userRoleStr === 'PLATFORM ADMIN' ||
      userRoleStr === 'HR/ADMIN' ||
      userRoleStr === 'HR' ||
      userRoleStr === 'HR_ADMIN'
    );
  }, [userRoleStr]);

  // Filter pending customer orders requiring confirmation (Stage 1: DRAFT, SUBMITTED, PO_RECEIVED)
  // Filter pending customer orders requiring confirmation (Stage 1: DRAFT, SUBMITTED, PO_RECEIVED)
  const pendingOrders = useMemo(() => {
    return orders.filter(o => {
      const st = String(o.status || '').trim().toUpperCase();
      const stage = String(o.stage || '').trim().toUpperCase();

      // Explicitly and strictly exclude any cancelled, rejected, or void orders
      if (
        st.includes('CANCEL') ||
        stage.includes('CANCEL') ||
        st === 'REJECTED' ||
        stage === 'REJECTED' ||
        st === 'VOID' ||
        (o as any).isCancelled === true
      ) {
        return false;
      }

      const isAlreadyAdvanced = [
        'CONFIRMED', 'APPROVED', 'RELEASED', 'MATERIAL_CHECKED', 'MATERIAL_CHECK', 
        'MATERIAL_READY', 'JOB_RELEASED', 'IN_PRODUCTION', 'QC_INSPECTION', 'QC', 
        'READY_TO_DISPATCH', 'READY_FOR_DISPATCH', 'DISPATCHED', 'INVOICED', 'COMPLETED', 'CLOSED'
      ].includes(st) || [
        'CONFIRMED', 'APPROVED', 'RELEASED', 'MATERIAL_CHECKED', 'MATERIAL_CHECK', 
        'MATERIAL_READY', 'JOB_RELEASED', 'IN_PRODUCTION', 'QC_INSPECTION', 'QC', 
        'READY_TO_DISPATCH', 'READY_FOR_DISPATCH', 'DISPATCHED', 'INVOICED', 'COMPLETED', 'CLOSED'
      ].includes(stage);

      if (isAlreadyAdvanced || (o.progressStep !== undefined && o.progressStep >= 2)) {
        return false;
      }

      return (
        ['DRAFT', 'SUBMITTED', 'PO_RECEIVED', 'PENDING_APPROVAL', 'PENDING', 'NEW'].includes(st) ||
        ['DRAFT', 'SUBMITTED', 'PO_RECEIVED', 'PENDING_APPROVAL', 'PENDING', 'NEW'].includes(stage) ||
        (o.progressStep !== undefined && o.progressStep <= 1)
      );
    }).sort((a, b) => {
      const timeB = new Date(b.createdAt || b.poDate || 0).getTime();
      const timeA = new Date(a.createdAt || a.poDate || 0).getTime();
      return timeB - timeA;
    });
  }, [orders]);

  // Filtered by search query
  const searchedOrders = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return pendingOrders;
    return pendingOrders.filter(o =>
      o.poNo?.toLowerCase().includes(q) ||
      o.customerName?.toLowerCase().includes(q) ||
      o.lines?.some(l => l.itemCode?.toLowerCase().includes(q) || l.itemDescription?.toLowerCase().includes(q))
    );
  }, [pendingOrders, searchQuery]);

  // Active approvals excluding resolved, rejected, or those linked to cancelled orders
  const activeApprovals = useMemo(() => {
    return approvals.filter(item => {
      // Exclude resolved or cancelled approvals
      const itemStatus = String((item as any).status || '').toUpperCase();
      if (itemStatus && (itemStatus === 'APPROVED' || itemStatus === 'REJECTED' || itemStatus.includes('CANCEL'))) {
        return false;
      }

      // If linked to an order that is cancelled, exclude it
      if ((item as any).orderId || (item as any).poNo) {
        const linkedOrder = orders.find(o => 
          o.id === (item as any).orderId || 
          o.poNo === (item as any).poNo || 
          o.poNo === (item as any).orderId
        );
        if (linkedOrder) {
          const linkedSt = String(linkedOrder.status || '').toUpperCase();
          const linkedStage = String(linkedOrder.stage || '').toUpperCase();
          if (
            linkedSt.includes('CANCEL') ||
            linkedStage.includes('CANCEL') ||
            linkedSt === 'REJECTED' ||
            linkedStage === 'REJECTED' ||
            linkedSt === 'VOID' ||
            (linkedOrder as any).isCancelled === true
          ) {
            return false;
          }
        }
      }

      return true;
    });
  }, [approvals, orders]);

  // Filter approvals by category and search
  const filteredApprovals = useMemo(() => {
    return activeApprovals.filter(item => {
      if (filterType !== 'ALL' && filterType !== 'ORDER_CONFIRMATIONS' && item.type !== filterType) {
        return false;
      }
      if (filterType === 'ORDER_CONFIRMATIONS') return false;

      const q = searchQuery.trim().toLowerCase();
      if (!q) return true;
      return (
        item.title?.toLowerCase().includes(q) ||
        item.requestedBy?.toLowerCase().includes(q) ||
        item.details?.toLowerCase().includes(q) ||
        item.type?.toLowerCase().includes(q)
      );
    });
  }, [activeApprovals, filterType, searchQuery]);

  // Robust order gross calculation resolving grossAmount, totalAmount, or sum of line items (orderQty * rate)
  const getOrderGrossValue = (ord: Partial<CustomerOrder> | null | undefined): number => {
    if (!ord) return 0;
    if (ord.grossAmount && Number(ord.grossAmount) > 0) return Number(ord.grossAmount);
    if ((ord as any).totalAmount && Number((ord as any).totalAmount) > 0) return Number((ord as any).totalAmount);
    if ((ord as any).totalValue && Number((ord as any).totalValue) > 0) return Number((ord as any).totalValue);
    if ((ord as any).netAmount && Number((ord as any).netAmount) > 0) return Number((ord as any).netAmount);
    if (ord.lines && Array.isArray(ord.lines) && ord.lines.length > 0) {
      const linesTotal = ord.lines.reduce((sum, l: any) => {
        const qty = Number(l.orderQty ?? l.quantity ?? l.qty ?? 0);
        const rate = Number(l.rate ?? l.unitPrice ?? l.price ?? 0);
        return sum + (qty * rate);
      }, 0);
      if (linesTotal > 0) return linesTotal;
    }
    return 0;
  };

  // Robust approval amount resolver linked to order or parsed from details
  const getApprovalAmount = (item: PendingApproval, ordersList: CustomerOrder[]): number => {
    if (item.amount && Number(item.amount) > 0) return Number(item.amount);
    const linked = ordersList.find(o => 
      o.id === (item as any).orderId || 
      o.poNo === (item as any).poNo || 
      o.poNo === (item as any).orderId ||
      o.id === (item as any).entityId || 
      o.poNo === (item as any).entityId ||
      (o.poNo && item.title?.includes(o.poNo)) ||
      (o.poNo && item.details?.includes(o.poNo))
    );
    if (linked) {
      return getOrderGrossValue(linked);
    }
    if (item.details) {
      const match = item.details.match(/(?:₹|Rs\.?|INR)\s*([\d,]+(?:\.\d+)?)/i) ||
                    item.details.match(/(?:amount|value|total)[\s:]+(?:₹|Rs\.?|INR)?\s*([\d,]+(?:\.\d+)?)/i);
      if (match && match[1]) {
        const parsed = parseFloat(match[1].replace(/,/g, ''));
        if (!isNaN(parsed) && parsed > 0) return parsed;
      }
    }
    return 0;
  };

  const showOrdersSection = filterType === 'ALL' || filterType === 'ORDER_CONFIRMATIONS';
  const showApprovalsSection = filterType !== 'ORDER_CONFIRMATIONS';

  // Metrics computation based on properly fetched order gross & active items
  const totalPendingCount = activeApprovals.length + pendingOrders.length;
  const totalGatedOrderValue = useMemo(() => {
    return pendingOrders.reduce((sum, o) => sum + getOrderGrossValue(o), 0);
  }, [pendingOrders]);
  const highValuePOCount = useMemo(() => activeApprovals.filter(a => a.type === 'HIGH_VALUE_PO').length, [activeApprovals]);
  const overridesCount = useMemo(() => activeApprovals.filter(a => a.type !== 'HIGH_VALUE_PO').length, [activeApprovals]);

  const getTypeBadge = (type: PendingApproval['type']) => {
    switch (type) {
      case 'DISCOUNT_OVERRIDE':
        return (
          <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold tracking-tight border ${
            isDarkMode ? 'bg-amber-500/10 text-amber-400 border-amber-500/30' : 'bg-amber-50 text-amber-800 border-amber-200'
          }`}>
            <Percent className="w-3.5 h-3.5 text-amber-500 shrink-0" />
            <span>Discount Override</span>
          </span>
        );
      case 'HIGH_VALUE_PO':
        return (
          <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold tracking-tight border ${
            isDarkMode ? 'bg-teal-500/10 text-teal-400 border-teal-500/30' : 'bg-teal-50 text-teal-800 border-teal-200'
          }`}>
            <DollarSign className="w-3.5 h-3.5 text-teal-500 shrink-0" />
            <span>High Value PO</span>
          </span>
        );
      case 'ORDER_CANCEL':
        return (
          <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold tracking-tight border ${
            isDarkMode ? 'bg-rose-500/10 text-rose-400 border-rose-500/30' : 'bg-rose-50 text-rose-800 border-rose-200'
          }`}>
            <XCircle className="w-3.5 h-3.5 text-rose-500 shrink-0" />
            <span>Cancellation</span>
          </span>
        );
      case 'SCRAP_WRITE_OFF':
        return (
          <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold tracking-tight border ${
            isDarkMode ? 'bg-purple-500/10 text-purple-400 border-purple-500/30' : 'bg-purple-50 text-purple-800 border-purple-200'
          }`}>
            <Trash2 className="w-3.5 h-3.5 text-purple-500 shrink-0" />
            <span>Scrap Write-off</span>
          </span>
        );
      default:
        return (
          <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold tracking-tight border ${
            isDarkMode ? 'bg-slate-800 text-slate-300 border-slate-700' : 'bg-slate-100 text-slate-700 border-slate-200'
          }`}>
            <ShieldCheck className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span>{type}</span>
          </span>
        );
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6 font-sans w-full max-w-full min-w-0 pb-10">
      
      {/* ========================================================================= */}
      {/* ── MOBILE VIEW (< md): Header + 2x2 Matrix ──                            */}
      {/* ========================================================================= */}
      <div className="block md:hidden space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[var(--accent-primary)] animate-pulse" />
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400">
                Governance Desk
              </span>
            </div>
            <h1 className="text-xl font-black text-slate-900 dark:text-white tracking-tight leading-tight">
              Approvals ({totalPendingCount})
            </h1>
          </div>
          <div className={`px-2.5 py-1 rounded-full border flex items-center gap-1.5 font-mono text-[10px] ${
            isDarkMode
              ? 'border-white/15 bg-white/10 text-white'
              : isCrystal
                ? 'border-slate-300 bg-white text-slate-800 shadow-xs'
                : 'border-white/30 bg-white/20 text-white'
          }`}>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="font-bold">{isAuthorizedSignatory ? 'Signatory' : 'View Only'}</span>
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
                <CheckCircle2 className="w-3.5 h-3.5" />
              </div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Pending</span>
            </div>
            <p className="text-lg font-black font-mono text-slate-900 dark:text-white tabular-nums">
              {totalPendingCount}
            </p>
          </div>

          <div className={`p-3 rounded-2xl border transition-all ${
            isDarkMode
              ? isCrystal ? 'border-white/10 bg-white/[0.04]' : isGreen ? 'border-emerald-500/15 bg-emerald-950/20' : 'border-blue-500/15 bg-blue-950/20'
              : isCrystal ? 'border-slate-200 bg-white shadow-xs' : isGreen ? 'border-emerald-100 bg-emerald-50/50' : 'border-blue-100 bg-blue-50/50'
          }`}>
            <div className="flex items-center gap-2 mb-1">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-600 text-white shadow-xs">
                <DollarSign className="w-3.5 h-3.5" />
              </div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Gated Value</span>
            </div>
            <p className="text-lg font-black font-mono text-emerald-600 dark:text-emerald-400 tabular-nums">
              ₹{totalGatedOrderValue >= 100000 ? `${(totalGatedOrderValue / 100000).toFixed(1)}L` : totalGatedOrderValue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
            </p>
          </div>

          <div className={`p-3 rounded-2xl border transition-all ${
            isDarkMode
              ? isCrystal ? 'border-white/10 bg-white/[0.04]' : isGreen ? 'border-emerald-500/15 bg-emerald-950/20' : 'border-blue-500/15 bg-blue-950/20'
              : isCrystal ? 'border-slate-200 bg-white shadow-xs' : isGreen ? 'border-emerald-100 bg-emerald-50/50' : 'border-blue-100 bg-blue-50/50'
          }`}>
            <div className="flex items-center gap-2 mb-1">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-purple-600 text-white shadow-xs">
                <ShieldCheck className="w-3.5 h-3.5" />
              </div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">High POs</span>
            </div>
            <p className="text-lg font-black font-mono text-purple-600 dark:text-purple-400 tabular-nums">
              {highValuePOCount}
            </p>
          </div>

          <div className={`p-3 rounded-2xl border transition-all ${
            isDarkMode
              ? isCrystal ? 'border-white/10 bg-white/[0.04]' : isGreen ? 'border-emerald-500/15 bg-emerald-950/20' : 'border-blue-500/15 bg-blue-950/20'
              : isCrystal ? 'border-slate-200 bg-white shadow-xs' : isGreen ? 'border-emerald-100 bg-emerald-50/50' : 'border-blue-100 bg-blue-50/50'
          }`}>
            <div className="flex items-center gap-2 mb-1">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-500 text-white shadow-xs">
                <Percent className="w-3.5 h-3.5" />
              </div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Overrides</span>
            </div>
            <p className="text-lg font-black font-mono text-amber-500 tabular-nums">
              {overridesCount}
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
                  Finance Governance • Executive Authorization Queue
                </span>
                <span className="text-slate-400 mx-1">•</span>
                <span className={!isDarkMode && isCrystal ? 'text-emerald-700 font-medium' : 'text-emerald-300 font-medium'}>
                  Stage 1 Gated Gatekeeper
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
                  <ShieldCheck className="h-5 w-5" />
                </div>
                Management Approvals & Authorization Queue
              </h1>
              <p className={`text-xs sm:text-sm max-w-2xl font-normal leading-relaxed ${
                !isDarkMode && isCrystal ? 'text-slate-600' : isDarkMode ? 'text-white/60' : 'text-white/80'
              }`}>
                Multi-level commercial governance, credit authorization, high-value procurement sign-offs, discount overrides, and Stage 1 customer order releases.
              </p>
            </div>

            {/* Signatory Authorization Lozenge */}
            <div className="flex flex-wrap items-center gap-2.5 shrink-0 self-start lg:self-center">
              <div className={`p-3 px-4 rounded-full border flex items-center gap-2.5 font-mono text-xs shadow-inner backdrop-blur-md ${
                !isDarkMode && isCrystal
                  ? 'border-slate-300/80 bg-white/80 text-slate-900 shadow-xs'
                  : isDarkMode
                    ? 'border-white/15 bg-white/10 text-white'
                    : 'border-white/30 bg-white/20 text-white shadow-xs'
              }`}>
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                <div>
                  <span className={`font-bold block text-xs leading-tight ${!isDarkMode && isCrystal ? 'text-slate-900' : 'text-white'}`}>
                    {isAuthorizedSignatory ? 'Authorized Signatory' : 'View Only Mode'}
                  </span>
                  <span className={`text-[10px] uppercase tracking-wider block font-semibold ${
                    !isDarkMode && isCrystal ? 'text-slate-500' : isDarkMode ? 'text-white/50' : 'text-blue-100/80'
                  }`}>
                    Server Admin • Owner • Admin • HR
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Integrated 4-Column Apple Metric Strip */}
        <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 border-t ${
          isDarkMode
            ? 'border-white/10 bg-gradient-to-b from-black/40 to-black/70 backdrop-blur-md'
            : isCrystal
              ? 'border-slate-200/80 bg-slate-50/70'
              : 'border-white/20 bg-white/[0.06] backdrop-blur-sm'
        }`}>
          {/* Total Pending Actions */}
          <div className={`p-4 sm:p-5 flex items-center gap-4 transition-colors ${
            !isDarkMode && isCrystal ? 'border-b sm:border-b-0 sm:border-r border-slate-200/80' : 'border-b sm:border-b-0 sm:border-r border-white/10'
          }`}>
            <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl shadow-sm ${
              !isDarkMode && isCrystal
                ? 'bg-slate-100 text-slate-800 border border-slate-200'
                : 'bg-white text-blue-600'
            }`}>
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div className="min-w-0 flex-1">
              <span className={`text-[10px] font-bold uppercase tracking-wider block ${
                !isDarkMode && isCrystal ? 'text-slate-500' : isDarkMode ? 'text-white/50' : 'text-blue-100'
              }`}>
                Pending Actions
              </span>
              <span className={`text-2xl font-bold font-mono block tabular-nums ${
                !isDarkMode && isCrystal ? 'text-slate-900' : 'text-white'
              }`}>
                {totalPendingCount}
              </span>
              <span className={`text-[10px] truncate block ${
                !isDarkMode && isCrystal ? 'text-slate-400' : isDarkMode ? 'text-white/40' : 'text-blue-100/80'
              }`}>
                {pendingOrders.length} orders · {activeApprovals.length} overrides
              </span>
            </div>
          </div>

          {/* Gated Order Value */}
          <div className={`p-4 sm:p-5 flex items-center gap-4 transition-colors ${
            !isDarkMode && isCrystal ? 'border-b sm:border-b-0 sm:border-r border-slate-200/80' : 'border-b sm:border-b-0 sm:border-r border-white/10'
          }`}>
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-600 text-white shadow-sm shadow-emerald-500/30">
              <DollarSign className="w-5 h-5" />
            </div>
            <div className="min-w-0 flex-1">
              <span className={`text-[10px] font-bold uppercase tracking-wider block ${
                !isDarkMode && isCrystal ? 'text-slate-500' : isDarkMode ? 'text-white/50' : 'text-blue-100'
              }`}>
                Gated Order Value
              </span>
              <span className={`text-2xl font-bold font-mono block tabular-nums ${
                !isDarkMode && isCrystal ? 'text-emerald-700' : 'text-emerald-400'
              }`}>
                ₹{totalGatedOrderValue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
              </span>
              <span className={`text-[10px] truncate block ${
                !isDarkMode && isCrystal ? 'text-slate-400' : isDarkMode ? 'text-white/40' : 'text-blue-100/80'
              }`}>
                Stage 1 order pipeline
              </span>
            </div>
          </div>

          {/* High-Value POs */}
          <div className={`p-4 sm:p-5 flex items-center gap-4 transition-colors ${
            !isDarkMode && isCrystal ? 'border-b sm:border-b-0 sm:border-r border-slate-200/80' : 'border-b sm:border-b-0 sm:border-r border-white/10'
          }`}>
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-purple-600 text-white shadow-sm shadow-purple-500/30">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div className="min-w-0 flex-1">
              <span className={`text-[10px] font-bold uppercase tracking-wider block ${
                !isDarkMode && isCrystal ? 'text-slate-500' : isDarkMode ? 'text-white/50' : 'text-blue-100'
              }`}>
                High-Value POs
              </span>
              <span className={`text-2xl font-bold font-mono block tabular-nums ${
                !isDarkMode && isCrystal ? 'text-purple-700' : 'text-purple-400'
              }`}>
                {highValuePOCount}
              </span>
              <span className={`text-[10px] truncate block ${
                !isDarkMode && isCrystal ? 'text-slate-400' : isDarkMode ? 'text-white/40' : 'text-blue-100/80'
              }`}>
                Procurement sign-offs
              </span>
            </div>
          </div>

          {/* Commercial Overrides */}
          <div className="p-4 sm:p-5 flex items-center gap-4 transition-colors">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-amber-500 text-white shadow-sm shadow-amber-500/30">
              <Percent className="w-5 h-5" />
            </div>
            <div className="min-w-0 flex-1">
              <span className={`text-[10px] font-bold uppercase tracking-wider block ${
                !isDarkMode && isCrystal ? 'text-slate-500' : isDarkMode ? 'text-white/50' : 'text-blue-100'
              }`}>
                Commercial Overrides
              </span>
              <span className={`text-2xl font-bold font-mono block tabular-nums ${
                !isDarkMode && isCrystal ? 'text-amber-700' : 'text-amber-400'
              }`}>
                {overridesCount}
              </span>
              <span className={`text-[10px] truncate block ${
                !isDarkMode && isCrystal ? 'text-slate-400' : isDarkMode ? 'text-white/40' : 'text-blue-100/80'
              }`}>
                Discounts & write-offs
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* ── TOOLBAR: APPLE 2-TIER COMMAND DECK & SEARCH ──                         */}
      {/* ========================================================================= */}
      <div className={`rounded-2xl border p-3.5 space-y-3 transition-all ${
        isDarkMode
          ? 'border-white/10 bg-gradient-to-b from-[#111318] via-[#090a0d] to-[#020204] shadow-[0_8px_28px_rgba(0,0,0,0.5)]'
          : 'border-slate-200/80 bg-gradient-to-b from-white/95 via-slate-50/90 to-slate-100/70 shadow-[0_4px_20px_rgba(0,0,0,0.03)]'
      }`}>
        {/* Tier 1: Segmented Filter Control */}
        <div className="flex items-center justify-between gap-3 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
          <div className={`inline-flex items-center p-1 rounded-xl border text-xs overflow-x-auto max-w-full ${
            isDarkMode ? 'border-white/10 bg-black/60' : 'border-slate-200/80 bg-slate-200/50 shadow-inner'
          }`}>
            {[
              { id: 'ALL', label: 'All Items', count: totalPendingCount },
              { id: 'ORDER_CONFIRMATIONS', label: 'Customer Orders', count: pendingOrders.length },
              { id: 'HIGH_VALUE_PO', label: 'High Value PO', count: highValuePOCount },
              { id: 'DISCOUNT_OVERRIDE', label: 'Discounts', count: activeApprovals.filter(a => a.type === 'DISCOUNT_OVERRIDE').length },
              { id: 'ORDER_CANCEL', label: 'Cancellations', count: activeApprovals.filter(a => a.type === 'ORDER_CANCEL').length },
              { id: 'SCRAP_WRITE_OFF', label: 'Scrap Write-offs', count: activeApprovals.filter(a => a.type === 'SCRAP_WRITE_OFF').length },
            ].map(tab => {
              const isActive = filterType === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setFilterType(tab.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                    isActive
                      ? isDarkMode
                        ? 'bg-white/15 text-white shadow-xs border border-white/10'
                        : 'bg-white text-slate-900 shadow-xs border border-slate-200/80'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <span>{tab.label}</span>
                  <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full ${
                    isActive
                      ? isDarkMode ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-800'
                      : isDarkMode ? 'bg-white/5 text-slate-400' : 'bg-slate-300/60 text-slate-600'
                  }`}>
                    {tab.count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Tier 2: Search Bar & Info */}
        <div className="flex items-center justify-between gap-3 pt-2 border-t border-slate-200/50 dark:border-white/5">
          <div className="relative flex-1 max-w-md">
            <Search className={`w-4 h-4 absolute left-3.5 top-3 ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`} />
            <input
              type="text"
              placeholder="Search PO #, customer, requester..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={`h-10 w-full pl-10 pr-16 rounded-full border text-xs font-medium outline-none transition-all ${
                isDarkMode 
                  ? 'border-white/10 bg-black/60 text-white placeholder:text-slate-500 focus:border-[#5B75F8] focus:ring-4 focus:ring-[#5B75F8]/15' 
                  : 'border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 focus:border-[#155dfc] focus:ring-4 focus:ring-[#155dfc]/15 shadow-xs'
              }`}
            />
            <div className="absolute right-3 top-2.5 flex items-center gap-1.5">
              {searchQuery ? (
                <button type="button" onClick={() => setSearchQuery('')} className="text-slate-400 hover:text-slate-700 dark:hover:text-white cursor-pointer">
                  <X className="w-3.5 h-3.5" />
                </button>
              ) : (
                <span className="hidden sm:inline-block px-1.5 py-0.5 rounded text-[10px] font-mono text-slate-400 border border-slate-200 dark:border-white/10">
                  ⌘F
                </span>
              )}
            </div>
          </div>

          <span className={`text-xs font-mono font-bold px-3 py-1.5 rounded-full border ${
            isDarkMode ? 'border-white/10 bg-white/5 text-slate-400' : 'border-slate-200 bg-slate-100 text-slate-600'
          }`}>
            {totalPendingCount} Pending
          </span>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* ── SECTION 1: PENDING CUSTOMER ORDERS (STAGE 1 GATED GATEKEEPER) ──      */}
      {/* ========================================================================= */}
      {showOrdersSection && (
        <div className={`overflow-hidden rounded-3xl border transition-all ${
          isDarkMode
            ? 'border-white/10 bg-gradient-to-b from-[#111318] via-[#08090c] to-[#010203] shadow-[0_16px_40px_rgba(0,0,0,0.5)]'
            : 'border-slate-200/90 bg-gradient-to-b from-white via-slate-50/40 to-[#f6f8fc] shadow-[0_4px_24px_rgba(0,0,0,0.04)]'
        }`}>
          {/* Top Specular Highlight */}
          <div className="h-[1px] w-full bg-gradient-to-r from-transparent via-white/70 dark:via-white/10 to-transparent" />

          {/* Section Header Bar */}
          <div className={`flex items-center justify-between border-b px-6 py-4 ${isDarkMode ? 'border-white/[0.07]' : 'border-slate-200'}`}>
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-2xl bg-blue-500/15 text-blue-500 border border-blue-500/25 flex items-center justify-center">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xs font-black tracking-tight text-slate-900 dark:text-white uppercase font-mono">
                  Pending Customer Order Confirmations (Stage 1 Gatekeeper)
                </div>
                <div className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400 font-sans">
                  Review customer purchase orders, pricing terms, and gross value before advancing to technical review
                </div>
              </div>
            </div>

            <span className={`rounded-full border px-3 py-1 font-mono text-[10px] font-bold uppercase tracking-wider ${
              isDarkMode ? 'border-white/10 bg-white/[0.04] text-slate-400' : 'border-slate-200 bg-slate-50 text-slate-600 shadow-2xs'
            }`}>
              {searchedOrders.length} {searchedOrders.length === 1 ? 'Order' : 'Orders'}
            </span>
          </div>

          {/* Orders Table */}
          {searchedOrders.length === 0 ? (
            <div className="p-10 text-center font-mono">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 flex items-center justify-center mx-auto mb-3">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <p className={`text-sm font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>No Pending Orders in Draft Stage</p>
              <p className="text-xs text-slate-400 mt-1">All customer purchase orders have been confirmed and advanced to technical review.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs font-sans">
                <thead>
                  <tr className={`border-b font-mono font-bold uppercase tracking-[0.12em] text-[9px] select-none ${
                    isDarkMode ? 'border-white/[0.06] bg-black/30 text-slate-400' : 'border-slate-200 bg-slate-50/90 text-slate-500'
                  }`}>
                    <th className="py-3.5 px-5">PO Number</th>
                    <th className="py-3.5 px-4">Customer & Line Items</th>
                    <th className="py-3.5 px-4">Gross Value</th>
                    <th className="py-3.5 px-4">PO Date & Terms</th>
                    <th className="py-3.5 px-4">Stage Status</th>
                    <th className="py-3.5 px-5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className={`divide-y ${isDarkMode ? 'divide-white/[0.06]' : 'divide-slate-100'}`}>
                  {searchedOrders.map((ord) => {
                    const linesCount = (ord.lines || []).length;
                    const itemsSummary = (ord.lines || []).map(l => `${l.orderQty}x ${l.itemDescription || l.itemCode}`).join(', ');

                    return (
                      <tr
                        key={ord.id}
                        className={`group transition-colors ${isDarkMode ? 'hover:bg-white/[0.03]' : 'hover:bg-slate-50/80'}`}
                      >
                        {/* 1st Column: Bold PO Number with Squircle FileText Icon */}
                        <td className="py-4 px-5 whitespace-nowrap">
                          <div className="flex items-center gap-3">
                            <div className={`h-11 w-11 rounded-2xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-105 shadow-sm ${
                              isDarkMode 
                                ? 'bg-blue-500/15 text-blue-400 border border-blue-500/30' 
                                : 'bg-blue-500/10 text-blue-600 border border-blue-500/20 shadow-xs'
                            }`}>
                              <FileText className="w-5 h-5" />
                            </div>
                            <div className="flex flex-col">
                              <span 
                                onClick={() => onViewOrder?.(ord.id)}
                                className="font-mono text-sm tracking-tight text-slate-900 dark:text-white font-black hover:underline cursor-pointer"
                              >
                                {ord.poNo}
                              </span>
                              <span className="text-[10px] text-slate-400 font-mono mt-0.5">
                                {ord.poDate || 'Stage 1'}
                              </span>
                            </div>
                          </div>
                        </td>

                        {/* Customer & Line Items */}
                        <td className="py-3.5 px-4 min-w-[220px]">
                          <div>
                            <div className="font-bold text-xs text-slate-900 dark:text-white truncate">
                              {ord.customerName}
                            </div>
                            <div className="text-[11px] text-slate-500 dark:text-slate-400 font-mono truncate mt-0.5" title={itemsSummary}>
                              <span className="font-semibold text-slate-700 dark:text-slate-300">{linesCount} Item{linesCount === 1 ? '' : 's'}:</span> {itemsSummary || '—'}
                            </div>
                          </div>
                        </td>

                        {/* Gross Value */}
                        <td className="py-3.5 px-4 whitespace-nowrap font-mono">
                          <span className="font-bold text-xs text-emerald-600 dark:text-emerald-400">
                            ₹{getOrderGrossValue(ord).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </span>
                        </td>

                        {/* PO Date & Payment Terms */}
                        <td className="py-3.5 px-4 whitespace-nowrap font-mono">
                          <div className="text-xs text-slate-700 dark:text-slate-300">
                            {ord.poDate || '—'}
                          </div>
                          {ord.paymentTerms && (
                            <div className="text-[10px] text-slate-400 mt-0.5">
                              {ord.paymentTerms}
                            </div>
                          )}
                        </td>

                        {/* Stage Status */}
                        <td className="py-4 px-4 whitespace-nowrap">
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold tracking-tight border bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30">
                            <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                            <span>Stage 1: Pending</span>
                          </span>
                        </td>

                        {/* Action Buttons: Signatory restricted */}
                        <td className="py-3.5 px-5 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-2">
                            {onViewOrder && (
                              <button
                                type="button"
                                onClick={() => onViewOrder(ord.id)}
                                className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full border text-xs font-bold transition-all cursor-pointer ${
                                  isDarkMode
                                    ? 'border-white/10 bg-white/[0.04] text-slate-300 hover:bg-white/[0.08] hover:text-white'
                                    : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                                }`}
                                title="Inspect Complete PO Details"
                              >
                                <ExternalLink className="w-3.5 h-3.5" />
                                <span>Inspect</span>
                              </button>
                            )}

                            {isAuthorizedSignatory ? (
                              <button
                                type="button"
                                onClick={() => onConfirmOrder?.(ord.id)}
                                className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs font-mono shadow-xs active:scale-95 transition-all cursor-pointer"
                                title="Authorize and advance PO to technical review"
                              >
                                <Check className="w-3.5 h-3.5" />
                                <span>Confirm Order</span>
                              </button>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold text-slate-400 border border-slate-700/50">
                                <Lock className="w-3.5 h-3.5" />
                                <span>Signatory Only</span>
                              </span>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* ── SECTION 2: EXECUTIVE OVERRIDES & FINANCIAL AUTHORIZATIONS ──           */}
      {/* ========================================================================= */}
      {showApprovalsSection && (
        <div className={`overflow-hidden rounded-3xl border transition-all ${
          isDarkMode
            ? 'border-white/10 bg-gradient-to-b from-[#111318] via-[#08090c] to-[#010203] shadow-[0_16px_40px_rgba(0,0,0,0.5)]'
            : 'border-slate-200/90 bg-gradient-to-b from-white via-slate-50/40 to-[#f6f8fc] shadow-[0_4px_24px_rgba(0,0,0,0.04)]'
        }`}>
          {/* Top Specular Highlight */}
          <div className="h-[1px] w-full bg-gradient-to-r from-transparent via-white/70 dark:via-white/10 to-transparent" />

          {/* Section Header Bar */}
          <div className={`flex items-center justify-between border-b px-6 py-4 ${isDarkMode ? 'border-white/[0.07]' : 'border-slate-200'}`}>
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-2xl bg-teal-500/15 text-teal-500 border border-teal-500/25 flex items-center justify-center">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xs font-black tracking-tight text-slate-900 dark:text-white uppercase font-mono">
                  Executive Overrides & Financial Authorizations
                </div>
                <div className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400 font-sans">
                  Multi-level authorization for high-value supplier POs, discount overrides, and scrap write-offs
                </div>
              </div>
            </div>

            <span className={`rounded-full border px-3 py-1 font-mono text-[10px] font-bold uppercase tracking-wider ${
              isDarkMode ? 'border-white/10 bg-white/[0.04] text-slate-400' : 'border-slate-200 bg-slate-50 text-slate-600 shadow-2xs'
            }`}>
              {filteredApprovals.length} {filteredApprovals.length === 1 ? 'Action' : 'Actions'}
            </span>
          </div>

          {/* Authorizations Table */}
          {filteredApprovals.length === 0 ? (
            <div className="p-10 text-center font-mono">
              <div className="w-12 h-12 rounded-2xl bg-teal-500/10 text-teal-500 border border-teal-500/20 flex items-center justify-center mx-auto mb-3">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <p className={`text-sm font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>No Pending Authorizations</p>
              <p className="text-xs text-slate-400 mt-1">All executive authorization requests in this governance queue have been resolved.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs font-sans">
                <thead>
                  <tr className={`border-b font-mono font-bold uppercase tracking-[0.12em] text-[9px] select-none ${
                    isDarkMode ? 'border-white/[0.06] bg-black/30 text-slate-400' : 'border-slate-200 bg-slate-50/90 text-slate-500'
                  }`}>
                    <th className="py-3.5 px-5">Authorization Item</th>
                    <th className="py-3.5 px-4">Category</th>
                    <th className="py-3.5 px-4">Financial Impact</th>
                    <th className="py-3.5 px-4">Requested By & Details</th>
                    <th className="py-3.5 px-4">Timestamp</th>
                    <th className="py-3.5 px-5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className={`divide-y ${isDarkMode ? 'divide-white/[0.06]' : 'divide-slate-100'}`}>
                  {filteredApprovals.map((item) => (
                    <tr
                      key={item.id}
                      className={`group transition-colors ${isDarkMode ? 'hover:bg-white/[0.03]' : 'hover:bg-slate-50/80'}`}
                    >
                      {/* 1st Column: Bold Item Title with Squircle Icon */}
                      <td className="py-4 px-5 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          <div className={`h-11 w-11 rounded-2xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-105 shadow-sm ${
                            isDarkMode 
                              ? 'bg-teal-500/15 text-teal-400 border border-teal-500/30' 
                              : 'bg-teal-500/10 text-teal-600 border border-teal-500/20 shadow-xs'
                          }`}>
                            <ShieldCheck className="w-5 h-5" />
                          </div>
                          <div>
                            <span className="font-mono text-sm tracking-tight text-slate-900 dark:text-white font-black block">
                              {item.title}
                            </span>
                            <span className="text-[10px] text-slate-400 font-mono block mt-0.5">
                              ID: {item.id}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Category Badge */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {getTypeBadge(item.type)}
                      </td>

                      {/* Financial Impact */}
                      <td className="py-3.5 px-4 whitespace-nowrap font-mono">
                        {(() => {
                          const amt = getApprovalAmount(item, orders);
                          return amt > 0 ? (
                            <span className="font-bold text-xs text-emerald-600 dark:text-emerald-400">
                              ₹{amt.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                            </span>
                          ) : (
                            <span className="text-slate-400 text-xs">—</span>
                          );
                        })()}
                      </td>

                      {/* Requested By & Details */}
                      <td className="py-3.5 px-4 min-w-[220px]">
                        <div>
                          <span className="font-bold text-xs text-slate-900 dark:text-white">
                            {item.requestedBy}
                          </span>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-1" title={item.details}>
                            {item.details}
                          </p>
                        </div>
                      </td>

                      {/* Timestamp */}
                      <td className="py-3.5 px-4 whitespace-nowrap font-mono text-slate-500 dark:text-slate-400 text-xs">
                        <div className="flex items-center gap-1.5">
                          <Clock className="w-3 h-3 text-slate-400" />
                          <span>{item.timestamp}</span>
                        </div>
                      </td>

                      {/* Actions: Signatory restricted */}
                      <td className="py-4 px-5 text-right whitespace-nowrap">
                        {isAuthorizedSignatory ? (
                          <div className="flex items-center justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => onReject(item.id)}
                              className="inline-flex items-center gap-1 px-3.5 py-1.5 rounded-full border border-rose-500/30 bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 text-xs font-mono font-bold active:scale-95 transition-all cursor-pointer shadow-2xs"
                              title="Reject this approval request"
                            >
                              <X className="w-3.5 h-3.5" />
                              <span>Reject</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => onApprove(item.id)}
                              className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs font-mono shadow-xs active:scale-95 transition-all cursor-pointer"
                              title="Sign and authorize this transaction"
                            >
                              <Check className="w-3.5 h-3.5" />
                              <span>Authorize</span>
                            </button>
                          </div>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold text-slate-400 border border-slate-700/50">
                            <Lock className="w-3.5 h-3.5" />
                            <span>Signatory Only</span>
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

    </div>
  );
};

export default ApprovalsView;
