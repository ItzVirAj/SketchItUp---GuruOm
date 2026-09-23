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
      {/* ── TOP HEADER & INTEGRATED EXECUTIVE DESK BANNER ──                       */}
      {/* ========================================================================= */}
      <section className={`overflow-hidden rounded-2xl border transition-all ${
        isDarkMode
          ? 'border-white/10 bg-gradient-to-b from-[#111318] via-[#090a0d] to-[#020204] text-white shadow-[0_16px_44px_rgba(0,0,0,0.6),inset_0_1px_0_0_rgba(255,255,255,0.06)]'
          : 'border-[#155dfc]/30 bg-gradient-to-b from-[#1b64ff] via-[#155dfc] to-[#0f52dc] text-white shadow-[0_16px_40px_rgba(21,93,252,0.25)]'
      }`}>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-5 p-6 sm:p-7">
          <div className="min-w-0 space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold tracking-wide ${
                isDarkMode ? 'bg-white/10 border border-white/15 text-white' : 'bg-white/20 border border-white/30 backdrop-blur-md text-white shadow-xs'
              }`}>
                <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>Executive Governance Desk</span>
              </span>
              <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${
                isDarkMode ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-white/20 text-white border border-white/30 backdrop-blur-md'
              }`}>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                <span>Stage 1 Gated Gatekeeper</span>
              </span>
            </div>
            
            <h1 className="text-xl sm:text-2xl md:text-[26px] font-black tracking-tight text-white">
              Management Approvals & Authorization Queue
            </h1>
            
            <p className={`text-xs leading-relaxed max-w-2xl font-normal mt-1 ${
              isDarkMode ? 'text-white/60' : 'text-blue-100/90'
            }`}>
              Multi-level commercial governance, credit authorization, high-value procurement sign-offs, discount overrides, and Stage 1 customer order releases.
            </p>
          </div>

          {/* Signatory Authorization Lozenge */}
          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <div className={`p-3 px-4 rounded-full border flex items-center gap-2.5 font-mono text-xs shadow-inner ${
              isDarkMode
                ? 'border-white/15 bg-white/10 text-white'
                : 'border-white/30 bg-white/20 text-white backdrop-blur-md shadow-xs'
            }`}>
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
              <div>
                <span className="font-bold block text-xs leading-tight text-white">
                  {isAuthorizedSignatory ? 'Authorized Signatory' : 'View Only Mode'}
                </span>
                <span className={`text-[10px] uppercase tracking-wider block font-semibold ${
                  isDarkMode ? 'text-white/50' : 'text-blue-100/80'
                }`}>
                  Server Admin • Owner • Admin • HR
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Integrated 4-Column Apple Inset Metric Strip */}
        <div className={`grid grid-cols-2 md:grid-cols-4 border-t divide-y sm:divide-y-0 sm:divide-x ${
          isDarkMode
            ? 'border-white/10 bg-gradient-to-b from-black/40 to-black/70 divide-white/10 backdrop-blur-md'
            : 'border-white/20 bg-white/[0.06] divide-white/15 backdrop-blur-sm'
        }`}>
          {[
            { 
              label: 'Total Pending Actions', 
              value: String(totalPendingCount), 
              detail: `${pendingOrders.length} orders · ${activeApprovals.length} overrides`, 
              icon: CheckCircle2, 
              iconBg: 'bg-white text-blue-600 shadow-md shadow-black/10',
            },
            { 
              label: 'Gated Order Value', 
              value: `₹${totalGatedOrderValue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`, 
              detail: 'Stage 1 order pipeline', 
              icon: DollarSign, 
              iconBg: 'bg-emerald-600 text-white shadow-md shadow-emerald-500/30',
            },
            { 
              label: 'High-Value POs', 
              value: String(highValuePOCount), 
              detail: 'Procurement sign-offs', 
              icon: ShieldCheck, 
              iconBg: 'bg-purple-600 text-white shadow-md shadow-purple-500/30',
            },
            { 
              label: 'Commercial Overrides', 
              value: String(overridesCount), 
              detail: 'Discounts & write-offs', 
              icon: Percent, 
              iconBg: 'bg-amber-500 text-white shadow-md shadow-amber-500/30',
            },
          ].map((metric) => {
            const MetricIcon = metric.icon;
            return (
              <div 
                key={metric.label} 
                className="p-4 sm:p-5 flex flex-col justify-between"
              >
                <div className="flex items-center justify-between mb-3">
                  <span className={`text-[11px] font-mono uppercase tracking-wider font-bold ${
                    isDarkMode ? 'text-white/50' : 'text-blue-100/70'
                  }`}>
                    {metric.label}
                  </span>
                  <div className={`flex h-11 w-11 items-center justify-center rounded-2xl ${metric.iconBg}`}>
                    <MetricIcon className="w-5 h-5" />
                  </div>
                </div>
                <div className="text-2xl sm:text-[26px] font-black tracking-tight text-white tabular-nums my-0.5 leading-tight">
                  {metric.value}
                </div>
                <div className={`text-[11px] font-medium truncate ${
                  isDarkMode ? 'text-white/50' : 'text-blue-100/80'
                }`}>
                  {metric.detail}
                </div>
              </div>
            );
          })}
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
          <div className="flex items-center gap-1.5 min-w-max">
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
                  className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
                    isActive
                      ? isDarkMode
                        ? 'bg-white text-slate-950 shadow-sm'
                        : 'bg-[#155dfc] text-white shadow-sm'
                      : isDarkMode
                      ? 'text-slate-400 hover:text-white hover:bg-white/[0.06]'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  <span>{tab.label}</span>
                  <span className={`px-1.5 py-0.5 rounded-full text-[10px] tabular-nums font-bold ${
                    isActive
                      ? isDarkMode ? 'bg-slate-900 text-white' : 'bg-white/20 text-white'
                      : isDarkMode ? 'bg-white/10 text-slate-400' : 'bg-slate-200 text-slate-700'
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
