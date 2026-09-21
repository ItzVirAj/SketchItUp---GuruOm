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
          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-[10px] font-mono font-bold uppercase border ${
            isDarkMode ? 'bg-amber-500/10 text-amber-400 border-amber-500/30' : 'bg-amber-50 text-amber-800 border-amber-200'
          }`}>
            <Percent className="w-3 h-3 text-amber-500 shrink-0" />
            <span>Discount Override</span>
          </span>
        );
      case 'HIGH_VALUE_PO':
        return (
          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-[10px] font-mono font-bold uppercase border ${
            isDarkMode ? 'bg-teal-500/10 text-teal-400 border-teal-500/30' : 'bg-teal-50 text-teal-800 border-teal-200'
          }`}>
            <DollarSign className="w-3 h-3 text-teal-500 shrink-0" />
            <span>High Value PO</span>
          </span>
        );
      case 'ORDER_CANCEL':
        return (
          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-[10px] font-mono font-bold uppercase border ${
            isDarkMode ? 'bg-rose-500/10 text-rose-400 border-rose-500/30' : 'bg-rose-50 text-rose-800 border-rose-200'
          }`}>
            <XCircle className="w-3 h-3 text-rose-500 shrink-0" />
            <span>Cancellation</span>
          </span>
        );
      case 'SCRAP_WRITE_OFF':
        return (
          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-[10px] font-mono font-bold uppercase border ${
            isDarkMode ? 'bg-purple-500/10 text-purple-400 border-purple-500/30' : 'bg-purple-50 text-purple-800 border-purple-200'
          }`}>
            <Trash2 className="w-3 h-3 text-purple-500 shrink-0" />
            <span>Scrap Write-off</span>
          </span>
        );
      default:
        return (
          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-[10px] font-mono font-bold uppercase border ${
            isDarkMode ? 'bg-slate-800 text-slate-300 border-slate-700' : 'bg-slate-100 text-slate-700 border-slate-200'
          }`}>
            <ShieldCheck className="w-3 h-3 text-slate-400 shrink-0" />
            <span>{type}</span>
          </span>
        );
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6 font-sans w-full max-w-full min-w-0 pb-10">
      
      {/* ========================================================================= */}
      {/* ── TOP HEADER & INTEGRATED EXECUTIVE DESK BANNER ──                       */}
      {/* ========================================================================= */}
      <section className={`overflow-hidden rounded-[24px] border ${
        isDarkMode ? 'border-white/[0.08] bg-[#121215]' : 'border-slate-200 bg-white shadow-[0_12px_36px_rgba(15,23,42,0.06)]'
      }`}>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-5 px-6 py-5">
          <div className="min-w-0">
            <div className="mb-1.5 flex items-center gap-2 font-mono text-[9px] font-bold uppercase tracking-[0.18em] text-slate-400">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Executive Governance Desk
              <span className="text-slate-300 dark:text-slate-700">/</span>
              <span>Stage 1 Gated Gatekeeper</span>
            </div>
            
            <div className="flex flex-wrap items-baseline gap-3">
              <h1 className="truncate text-xl sm:text-2xl md:text-[25px] font-extrabold tracking-[-0.04em] text-slate-950 dark:text-white">
                Management Approvals & Authorization Queue
              </h1>
            </div>
            
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 max-w-2xl">
              Multi-level commercial governance, credit authorization, high-value procurement sign-offs, discount overrides, and Stage 1 customer order releases.
            </p>
          </div>

          {/* Signatory Authorization Lozenge */}
          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <div className={`p-2.5 px-3.5 rounded-2xl border flex items-center gap-2.5 font-mono text-xs ${
              isAuthorizedSignatory
                ? isDarkMode ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400' : 'border-emerald-200 bg-emerald-50 text-emerald-800'
                : isDarkMode ? 'border-amber-500/30 bg-amber-500/10 text-amber-400' : 'border-amber-200 bg-amber-50 text-amber-800'
            }`}>
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <div>
                <span className="font-bold block text-[11px] leading-tight">
                  {isAuthorizedSignatory ? 'Authorized Signatory' : 'View Only Mode'}
                </span>
                <span className="text-[9px] text-slate-400 uppercase tracking-wider block">
                  Server Admin • Owner • Admin • HR
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Integrated 4-Column Apple Inset Metric Strip */}
        <div className={`grid grid-cols-2 md:grid-cols-4 border-t ${isDarkMode ? 'border-white/[0.07]' : 'border-slate-200'}`}>
          {[
            { 
              label: 'Total Pending Actions', 
              value: String(totalPendingCount), 
              detail: `${pendingOrders.length} orders · ${activeApprovals.length} overrides`, 
              icon: CheckCircle2, 
              tone: 'text-emerald-500', 
              iconBg: 'bg-emerald-500/10' 
            },
            { 
              label: 'Gated Order Value', 
              value: `₹${totalGatedOrderValue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`, 
              detail: 'Stage 1 order pipeline', 
              icon: DollarSign, 
              tone: 'text-teal-500', 
              iconBg: 'bg-teal-500/10' 
            },
            { 
              label: 'High-Value POs', 
              value: String(highValuePOCount), 
              detail: 'Procurement sign-offs', 
              icon: ShieldCheck, 
              tone: 'text-[var(--accent-text-light)] dark:text-[var(--accent-text-dark)]', 
              iconBg: 'bg-[var(--accent-primary)]/15' 
            },
            { 
              label: 'Commercial Overrides', 
              value: String(overridesCount), 
              detail: 'Discounts & write-offs', 
              icon: Percent, 
              tone: 'text-amber-500', 
              iconBg: 'bg-amber-500/10' 
            },
          ].map((metric, index) => {
            const MetricIcon = metric.icon;
            return (
              <div 
                key={metric.label} 
                className={`flex items-center gap-3 px-5 py-3.5 ${
                  index > 0 ? isDarkMode ? 'border-l border-white/[0.07]' : 'border-l border-slate-200' : ''
                }`}
              >
                <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${metric.iconBg} ${metric.tone}`}>
                  <MetricIcon className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <div className="font-mono text-[9px] font-bold uppercase tracking-[0.13em] text-slate-400">{metric.label}</div>
                  <div className={`mt-0.5 truncate text-base sm:text-lg font-extrabold tracking-[-0.03em] ${metric.tone}`}>{metric.value}</div>
                  <div className="truncate text-[10px] text-slate-400 font-mono">{metric.detail}</div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ========================================================================= */}
      {/* ── TOOLBAR: APPLE SEGMENTED FILTER STRIP & SEARCH ──                      */}
      {/* ========================================================================= */}
      <div className={`rounded-2xl border p-2.5 flex flex-col md:flex-row items-center justify-between gap-3 ${
        isDarkMode ? 'border-white/[0.08] bg-[#121215]' : 'border-slate-200 bg-white shadow-[0_6px_22px_rgba(15,23,42,0.04)]'
      }`}>
        {/* macOS Segmented Filter Control */}
        <div className={`p-1 rounded-xl border flex items-center gap-1 overflow-x-auto w-full md:w-auto scrollbar-none ${
          isDarkMode ? 'bg-black/40 border-white/10' : 'bg-slate-100 border-slate-200'
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
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold font-mono transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                  isActive
                    ? 'bg-[var(--accent-primary)] text-white shadow-xs'
                    : isDarkMode
                      ? 'text-slate-400 hover:text-white'
                      : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <span>{tab.label}</span>
                <span className={`px-1.5 py-0.2 rounded-full text-[9px] ${
                  isActive ? 'bg-white/25 text-white' : isDarkMode ? 'bg-white/10 text-slate-400' : 'bg-slate-200 text-slate-700'
                }`}>
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Global Search Bar */}
        <div className={`flex h-10 w-full md:w-80 items-center gap-2 rounded-xl border px-3 shrink-0 ${
          isDarkMode ? 'border-white/[0.08] bg-black/20 text-white focus-within:border-[var(--accent-border-dark)]' : 'border-slate-200 bg-slate-50 text-slate-900 focus-within:border-[var(--accent-primary)]'
        }`}>
          <Search className="h-4 w-4 shrink-0 text-slate-400" />
          <input
            type="text"
            placeholder="Search PO #, customer, requester..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-full w-full bg-transparent text-xs font-semibold outline-none placeholder:font-normal placeholder:text-slate-400 font-mono"
          />
          {searchQuery && (
            <button type="button" onClick={() => setSearchQuery('')} className="text-slate-400 hover:text-slate-700 dark:hover:text-white">
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* ── SECTION 1: PENDING CUSTOMER ORDERS (STAGE 1 GATED GATEKEEPER) ──      */}
      {/* ========================================================================= */}
      {showOrdersSection && (
        <div className={`overflow-hidden rounded-[22px] border transition-ui ${
          isDarkMode ? 'border-white/[0.08] bg-[#121215]' : 'border-slate-200 bg-white shadow-[0_12px_36px_rgba(15,23,42,0.06)]'
        }`}>
          {/* Section Header Bar */}
          <div className={`flex items-center justify-between border-b px-5 py-4 ${isDarkMode ? 'border-white/[0.07]' : 'border-slate-200'}`}>
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-blue-500/15 text-blue-500 border border-blue-500/25 flex items-center justify-center">
                <FileText className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-extrabold text-slate-900 dark:text-white">
                  Pending Customer Order Confirmations (Stage 1 Gatekeeper)
                </div>
                <div className="mt-0.5 text-[10px] text-slate-400 font-mono">
                  Review customer purchase orders, pricing terms, and gross value before advancing to technical review
                </div>
              </div>
            </div>

            <span className={`rounded-lg border px-2.5 py-1 font-mono text-[9px] font-bold uppercase tracking-wider ${
              isDarkMode ? 'border-white/[0.08] bg-white/[0.04] text-slate-400' : 'border-slate-200 bg-slate-50 text-slate-500'
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
                        <td className="py-3.5 px-5 whitespace-nowrap">
                          <div className="flex items-center gap-2.5">
                            <div className="w-7 h-7 rounded-lg bg-blue-500/15 text-blue-500 border border-blue-500/20 flex items-center justify-center shrink-0">
                              <FileText className="w-3.5 h-3.5" />
                            </div>
                            <span 
                              onClick={() => onViewOrder?.(ord.id)}
                              className="font-mono font-bold text-xs text-[var(--accent-primary)] dark:text-[var(--accent-text-dark)] hover:underline cursor-pointer"
                            >
                              {ord.poNo}
                            </span>
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
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-[10px] font-mono font-bold uppercase border bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30">
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
                                className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border text-xs font-mono font-bold transition-all cursor-pointer ${
                                  isDarkMode
                                    ? 'border-white/10 bg-white/[0.04] text-slate-300 hover:bg-white/[0.08] hover:text-white'
                                    : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
                                }`}
                                title="Inspect Complete PO Details"
                              >
                                <ExternalLink className="w-3 h-3" />
                                <span>Inspect</span>
                              </button>
                            )}

                            {isAuthorizedSignatory ? (
                              <button
                                type="button"
                                onClick={() => onConfirmOrder?.(ord.id)}
                                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs font-mono shadow-xs active:scale-95 transition-all cursor-pointer"
                                title="Authorize and advance PO to technical review"
                              >
                                <Check className="w-3.5 h-3.5" />
                                <span>Confirm Order</span>
                              </button>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-[10px] font-mono text-slate-400 border border-slate-700/50">
                                <Lock className="w-3 h-3" />
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
        <div className={`overflow-hidden rounded-[22px] border transition-ui ${
          isDarkMode ? 'border-white/[0.08] bg-[#121215]' : 'border-slate-200 bg-white shadow-[0_12px_36px_rgba(15,23,42,0.06)]'
        }`}>
          {/* Section Header Bar */}
          <div className={`flex items-center justify-between border-b px-5 py-4 ${isDarkMode ? 'border-white/[0.07]' : 'border-slate-200'}`}>
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-teal-500/15 text-teal-500 border border-teal-500/25 flex items-center justify-center">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-extrabold text-slate-900 dark:text-white">
                  Executive Overrides & Financial Authorizations
                </div>
                <div className="mt-0.5 text-[10px] text-slate-400 font-mono">
                  Multi-level authorization for high-value supplier POs, discount overrides, and scrap write-offs
                </div>
              </div>
            </div>

            <span className={`rounded-lg border px-2.5 py-1 font-mono text-[9px] font-bold uppercase tracking-wider ${
              isDarkMode ? 'border-white/[0.08] bg-white/[0.04] text-slate-400' : 'border-slate-200 bg-slate-50 text-slate-500'
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
                      <td className="py-3.5 px-5 whitespace-nowrap">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-lg bg-teal-500/15 text-teal-500 border border-teal-500/20 flex items-center justify-center shrink-0">
                            <ShieldCheck className="w-3.5 h-3.5" />
                          </div>
                          <div>
                            <span className="font-mono font-bold text-xs text-[var(--accent-primary)] dark:text-[var(--accent-text-dark)] block">
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
                      <td className="py-3.5 px-5 text-right whitespace-nowrap">
                        {isAuthorizedSignatory ? (
                          <div className="flex items-center justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => onReject(item.id)}
                              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-rose-500/30 bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 text-xs font-mono font-bold active:scale-95 transition-all cursor-pointer shadow-2xs"
                              title="Reject this approval request"
                            >
                              <X className="w-3.5 h-3.5" />
                              <span>Reject</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => onApprove(item.id)}
                              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs font-mono shadow-xs active:scale-95 transition-all cursor-pointer"
                              title="Sign and authorize this transaction"
                            >
                              <Check className="w-3.5 h-3.5" />
                              <span>Authorize</span>
                            </button>
                          </div>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-[10px] font-mono text-slate-400 border border-slate-700/50">
                            <Lock className="w-3 h-3" />
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
