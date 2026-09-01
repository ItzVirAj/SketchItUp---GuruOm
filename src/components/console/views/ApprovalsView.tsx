import React, { useState } from 'react';
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
  Package,
  Layers,
  ArrowRight,
  Sparkles
} from 'lucide-react';
import { PendingApproval, CustomerOrder } from '../../../types/console';

interface ApprovalsViewProps {
  approvals: PendingApproval[];
  orders?: CustomerOrder[];
  isDarkMode?: boolean;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
  onConfirmOrder?: (orderId: string) => void;
  onViewOrder?: (orderId: string) => void;
}

export const ApprovalsView: React.FC<ApprovalsViewProps> = ({
  approvals,
  orders = [],
  isDarkMode = true,
  onApprove,
  onReject,
  onConfirmOrder,
  onViewOrder,
}) => {
  const [filterType, setFilterType] = useState<string>('ALL');

  // Filter pending orders requiring confirmation (Stage 1: DRAFT, SUBMITTED, PO_RECEIVED)
  const pendingOrders = orders.filter(o => {
    const st = (o.status || o.stage || 'DRAFT').toUpperCase();
    const isApprovedOrConfirmed = ['CONFIRMED', 'APPROVED', 'RELEASED', 'MATERIAL_CHECKED', 'MATERIAL_CHECK', 'MATERIAL_READY', 'JOB_RELEASED', 'IN_PRODUCTION', 'QC_INSPECTION', 'QC', 'READY_TO_DISPATCH', 'READY_FOR_DISPATCH', 'DISPATCHED', 'INVOICED', 'COMPLETED', 'CLOSED'].includes(st);
    if (isApprovedOrConfirmed || (o.progressStep !== undefined && o.progressStep >= 2)) {
      return false;
    }
    return ['DRAFT', 'SUBMITTED', 'PO_RECEIVED', 'PENDING_APPROVAL'].includes(st) || (o.progressStep !== undefined && o.progressStep <= 1);
  }).sort((a, b) => {
    const timeB = new Date(b.createdAt || b.poDate || 0).getTime();
    const timeA = new Date(a.createdAt || a.poDate || 0).getTime();
    return timeB - timeA;
  });

  const filteredApprovals = approvals.filter(item => {
    if (filterType === 'ALL') return true;
    if (filterType === 'ORDER_CONFIRMATIONS') return false;
    return item.type === filterType;
  });

  const showOrdersSection = filterType === 'ALL' || filterType === 'ORDER_CONFIRMATIONS';
  const showApprovalsSection = filterType !== 'ORDER_CONFIRMATIONS';

  const totalPendingCount = approvals.length + pendingOrders.length;

  const getTypeBadge = (type: PendingApproval['type']) => {
    switch (type) {
      case 'DISCOUNT_OVERRIDE':
        return (
          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-mono font-bold border ${
            isDarkMode ? 'bg-amber-500/10 text-amber-400 border-amber-500/30' : 'bg-amber-50 text-amber-800 border-amber-200'
          }`}>
            <Percent className="w-3.5 h-3.5" /> Discount Override
          </span>
        );
      case 'HIGH_VALUE_PO':
        return (
          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-mono font-bold border ${
            isDarkMode ? 'bg-teal-500/10 text-teal-400 border-teal-500/30' : 'bg-teal-50 text-teal-800 border-teal-200'
          }`}>
            <DollarSign className="w-3.5 h-3.5" /> High Value PO
          </span>
        );
      case 'ORDER_CANCEL':
        return (
          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-mono font-bold border ${
            isDarkMode ? 'bg-rose-500/10 text-rose-400 border-rose-500/30' : 'bg-rose-50 text-rose-800 border-rose-200'
          }`}>
            <XCircle className="w-3.5 h-3.5" /> Order Cancel
          </span>
        );
      case 'SCRAP_WRITE_OFF':
        return (
          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-mono font-bold border ${
            isDarkMode ? 'bg-purple-500/10 text-purple-400 border-purple-500/30' : 'bg-purple-50 text-purple-800 border-purple-200'
          }`}>
            <Trash2 className="w-3.5 h-3.5" /> Scrap Write-off
          </span>
        );
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6 font-sans">
      
      {/* Top Banner Header */}
      <div className={`p-4 sm:p-6 md:p-8 rounded-3xl border transition-ui shadow-xl ${
        isDarkMode 
          ? 'bg-slate-900/85 border-slate-800/80 text-white backdrop-blur-xl' 
          : 'bg-white border-slate-200 shadow-sm text-slate-900'
      }`}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1 sm:mb-1.5">
              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider ${
                isDarkMode ? 'bg-teal-500/20 text-teal-300 border border-teal-500/30' : 'bg-teal-50 text-teal-800 border border-teal-200'
              }`}>
                Executive Authorization Desk
              </span>
              <span className={`text-[11px] sm:text-xs font-mono ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>• Stage 1 Gated Gatekeeper</span>
            </div>
            <h1 className={`text-xl sm:text-2xl md:text-3xl font-bold tracking-tight ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
              Approvals & Orders Queue
            </h1>
            <p className={`text-xs sm:text-sm mt-0.5 sm:mt-1 max-w-2xl ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
              Authorize pending draft customer orders, review commercial credit limits, discount overrides, and scrap write-offs before production release.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className={`p-3 sm:p-4 rounded-2xl border text-right font-mono w-full sm:w-auto ${
              isDarkMode ? 'bg-slate-950/70 border-slate-800' : 'bg-slate-50 border-slate-200 shadow-xs'
            }`}>
              <div className="flex sm:flex-col justify-between items-center sm:items-end">
                <span className={`text-[10px] uppercase font-semibold ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                  Action Items
                </span>
                <span className="text-xl sm:text-2xl font-bold text-teal-600 dark:text-teal-400">
                  {totalPendingCount}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className={`p-3 sm:p-4 rounded-3xl border transition-ui flex items-center gap-2 overflow-x-auto pb-2 sm:pb-0 scrollbar-none shadow-sm ${
        isDarkMode ? 'bg-slate-900/80 border-slate-800/80 backdrop-blur-xl' : 'bg-white border-slate-200 shadow-xs'
      }`}>
        {[
          { id: 'ALL', label: 'All Items', count: totalPendingCount },
          { id: 'ORDER_CONFIRMATIONS', label: 'Pending Orders', count: pendingOrders.length },
          { id: 'HIGH_VALUE_PO', label: 'High Value PO', count: approvals.filter(a => a.type === 'HIGH_VALUE_PO').length },
          { id: 'DISCOUNT_OVERRIDE', label: 'Discount Override', count: approvals.filter(a => a.type === 'DISCOUNT_OVERRIDE').length },
          { id: 'ORDER_CANCEL', label: 'Cancellations', count: approvals.filter(a => a.type === 'ORDER_CANCEL').length },
          { id: 'SCRAP_WRITE_OFF', label: 'Scrap Write-off', count: approvals.filter(a => a.type === 'SCRAP_WRITE_OFF').length },
        ].map(tab => {
          const isActive = filterType === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setFilterType(tab.id)}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-2xl text-xs font-mono font-bold transition-ui cursor-pointer whitespace-nowrap border ${
                isActive
                  ? isDarkMode 
                    ? 'bg-teal-500/20 text-teal-300 border-teal-500/40 shadow-xs' 
                    : 'bg-teal-600 text-white border-teal-600 shadow-md'
                  : isDarkMode
                    ? 'bg-slate-950/40 text-slate-400 border-slate-800/80 hover:text-white hover:bg-slate-800/60'
                    : 'bg-slate-50 text-slate-600 border-slate-200 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <span>{tab.label}</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                isActive 
                  ? 'bg-white/20 text-white' 
                  : isDarkMode ? 'bg-slate-800 text-slate-400' : 'bg-slate-200 text-slate-700'
              }`}>
                {tab.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Section 1: Pending Customer Order Confirmations (Stage 1) */}
      {showOrdersSection && (
        <div className="space-y-3 sm:space-y-4">
          <div className="flex items-center justify-between px-1 sm:px-2">
            <h2 className={`text-xs sm:text-sm font-bold uppercase font-mono tracking-wider flex items-center gap-2 ${
              isDarkMode ? 'text-blue-400' : 'text-blue-700'
            }`}>
              <ShieldCheck className="w-4 h-4" />
              <span>Pending Customer Orders ({pendingOrders.length})</span>
            </h2>
            <span className={`text-[10px] sm:text-[11px] font-mono ${isDarkMode ? 'text-slate-500' : 'text-slate-500'}`}>
              Stage 1: PO Received ➔ Confirm Order
            </span>
          </div>

          {pendingOrders.length === 0 ? (
            <div className={`p-6 sm:p-8 rounded-3xl border text-center font-mono ${
              isDarkMode ? 'bg-slate-900/60 border-slate-800 text-slate-400' : 'bg-slate-50 border-slate-200 text-slate-600'
            }`}>
              <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2 opacity-80" />
              <h3 className="text-sm font-bold">No Pending Orders in Draft Stage</h3>
              <p className="text-xs mt-0.5">All customer purchase orders have been confirmed and advanced to material check.</p>
            </div>
          ) : (
            pendingOrders.map((ord) => (
              <div
                key={ord.id}
                className={`p-4 sm:p-6 rounded-3xl border transition-ui space-y-3.5 shadow-md ${
                  isDarkMode 
                    ? 'bg-slate-900/85 border-slate-800/80 text-white backdrop-blur-xl hover:border-blue-500/40' 
                    : 'bg-white border-slate-200 text-slate-900 shadow-sm hover:border-blue-300'
                }`}
              >
                {/* Header Row */}
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-xl text-[10px] sm:text-xs font-mono font-bold uppercase border ${
                        isDarkMode ? 'bg-blue-500/15 text-blue-400 border-blue-500/30' : 'bg-blue-50 text-blue-700 border-blue-200'
                      }`}>
                        <FileText className="w-3 h-3" />
                        <span>Stage 1: Pending</span>
                      </span>

                      <span className={`text-[11px] font-mono flex items-center gap-1 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                        <Clock className="w-3 h-3" />
                        <span>PO: {ord.poDate || '—'}</span>
                      </span>
                    </div>

                    <div className="flex flex-wrap items-baseline gap-1.5 mt-1.5">
                      <h3 className={`text-base sm:text-lg font-bold font-mono ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`}>
                        {ord.poNo}
                      </h3>
                      <span className={isDarkMode ? 'text-slate-500' : 'text-slate-400'}>—</span>
                      <span className={`text-sm sm:text-base font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                        {ord.customerName}
                      </span>
                    </div>
                  </div>

                  {/* Gross Value Badge (Always Visible) */}
                  <div className={`p-2.5 rounded-2xl border text-right font-mono shrink-0 ${
                    isDarkMode ? 'bg-slate-950/70 border-slate-800' : 'bg-slate-50 border-slate-200'
                  }`}>
                    <span className="text-[9px] uppercase block font-semibold text-slate-400">Gross Value</span>
                    <span className="text-xs sm:text-sm font-bold text-emerald-400">
                      ₹{Number(ord.grossAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>

                {/* Line Items Overview */}
                <div className={`p-2.5 rounded-2xl border text-xs font-mono ${
                  isDarkMode ? 'bg-slate-950/50 border-slate-800/80 text-slate-300' : 'bg-slate-50 border-slate-200 text-slate-700'
                }`}>
                  <strong className="text-slate-400">{(ord.lines || []).length} Line Items:</strong>{' '}
                  {(ord.lines || []).map(l => `${l.orderQty}x ${l.itemDescription || l.itemCode}`).join(', ')}
                </div>

                {ord.remark && (
                  <div className={`text-xs italic ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                    Note: {ord.remark}
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex items-center gap-2 pt-1 border-t border-slate-800/60">
                  {onViewOrder && (
                    <button
                      type="button"
                      onClick={() => onViewOrder(ord.id)}
                      className={`flex-1 sm:flex-initial px-4 py-2.5 rounded-2xl border text-xs font-mono font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-ui ${
                        isDarkMode 
                          ? 'border-slate-700 bg-slate-800/80 text-slate-300 hover:bg-slate-700 hover:text-white' 
                          : 'border-slate-300 bg-slate-100 text-slate-700 hover:bg-slate-200'
                      }`}
                      title="Inspect Order Details"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>View PO</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => onConfirmOrder?.(ord.id)}
                    className="flex-1 sm:flex-initial px-5 py-2.5 rounded-2xl bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white font-bold text-xs font-mono flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-emerald-500/25 transition-ui active:scale-[0.96]"
                  >
                    <Check className="w-4 h-4" />
                    <span>Confirm Order</span>
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Section 2: Executive Overrides & Special Approvals */}
      {showApprovalsSection && (
        <div className="space-y-3 sm:space-y-4 pt-2">
          {filterType === 'ALL' && (
            <div className="flex items-center justify-between px-1 sm:px-2">
              <h2 className={`text-xs sm:text-sm font-bold uppercase font-mono tracking-wider flex items-center gap-2 ${
                isDarkMode ? 'text-teal-400' : 'text-teal-700'
              }`}>
                <ShieldCheck className="w-4 h-4" />
                <span>Executive Overrides & Governance ({filteredApprovals.length})</span>
              </h2>
            </div>
          )}

          {filteredApprovals.length === 0 ? (
            filterType !== 'ORDER_CONFIRMATIONS' && filterType !== 'ALL' ? (
              <div className={`p-8 sm:p-12 rounded-3xl border text-center font-mono ${
                isDarkMode ? 'bg-slate-900/80 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900 shadow-sm'
              }`}>
                <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-2 opacity-80" />
                <h3 className="text-sm sm:text-base font-bold">No Pending Requests</h3>
                <p className={`text-xs mt-1 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>All executive authorization requests in this category have been resolved.</p>
              </div>
            ) : null
          ) : (
            filteredApprovals.map((item) => (
              <div
                key={item.id}
                className={`p-4 sm:p-6 rounded-3xl border transition-ui space-y-3 shadow-md ${
                  isDarkMode 
                    ? 'bg-slate-900/80 border-slate-800/80 text-white backdrop-blur-xl' 
                    : 'bg-white border-slate-200 text-slate-900 shadow-sm'
                }`}
              >
                {/* Header & Value */}
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      {getTypeBadge(item.type)}
                      <span className={`text-[11px] font-mono flex items-center gap-1 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                        <Clock className="w-3 h-3" />
                        {item.timestamp}
                      </span>
                    </div>

                    <h3 className={`text-sm sm:text-base font-bold font-mono mt-1 ${isDarkMode ? 'text-teal-400' : 'text-teal-700'}`}>
                      {item.title}
                    </h3>
                  </div>

                  {item.amount && (
                    <div className={`p-2.5 rounded-2xl border text-right font-mono shrink-0 ${
                      isDarkMode ? 'bg-slate-950/70 border-slate-800' : 'bg-slate-50 border-slate-200'
                    }`}>
                      <span className="text-[9px] uppercase block font-semibold text-slate-400">Value</span>
                      <span className="text-xs sm:text-sm font-bold text-emerald-400">
                        ₹{item.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  )}
                </div>

                <p className={`text-xs font-medium ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                  {item.details}
                </p>

                <div className={`text-[11px] font-mono ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                  Requested by: <strong className={`font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{item.requestedBy}</strong>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 pt-1 border-t border-slate-800/60">
                  <button
                    type="button"
                    onClick={() => onReject(item.id)}
                    className="flex-1 sm:flex-initial px-4 py-2.5 rounded-2xl border border-rose-500/30 bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 font-bold text-xs font-mono flex items-center justify-center gap-1.5 cursor-pointer transition-ui active:scale-[0.96]"
                  >
                    <X className="w-4 h-4" />
                    <span>Reject</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => onApprove(item.id)}
                    className="flex-1 sm:flex-initial px-5 py-2.5 rounded-2xl bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white font-bold text-xs font-mono flex items-center justify-center gap-1.5 cursor-pointer shadow-lg shadow-emerald-500/20 transition-ui active:scale-[0.96]"
                  >
                    <Check className="w-4 h-4" />
                    <span>Authorize</span>
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

    </div>
  );
};

export default ApprovalsView;
