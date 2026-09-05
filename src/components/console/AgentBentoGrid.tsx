"use client";

import React, { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import {
  ChatCircle,
  Brain,
  Database,
  TerminalWindow,
  Check,
  CircleNotch,
  Clock,
  Minus,
  Sparkle,
  ArrowSquareOut,
  Pulse,
  ShieldCheck,
  FileCode,
  Gauge,
  Factory,
  Truck,
  Package,
  Cpu,
  Warning,
  WarningOctagon,
  ArrowRight,
  CheckCircle,
  ShoppingCart,
  Receipt,
  CreditCard,
  Wallet,
  FileText,
  TrendUp,
  TrendDown,
  CaretRight,
  Gear
} from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import {
  CustomerOrder,
  StockItem,
  ShortageItem,
  QCInspection,
  JobCard,
  DispatchChallan,
  CustomerInvoice,
  VendorBill,
  ProductionLogReport,
  AuditLogEntry
} from "@/types/console";

/* ──────────────────────────────────────────────────────
   Props for the Bento Grid and its Cards
────────────────────────────────────────────────────── */

export interface AgentBentoGridProps {
  orders?: CustomerOrder[];
  stock?: StockItem[];
  shortages?: ShortageItem[];
  qcItems?: QCInspection[];
  pdiQueue?: any[];
  jobCards?: JobCard[];
  dispatches?: DispatchChallan[];
  invoices?: CustomerInvoice[];
  payables?: VendorBill[];
  productionLogs?: ProductionLogReport[];
  auditLogs?: AuditLogEntry[];
  isRealtimeStreaming?: boolean;
  currencySymbol?: string;
  isDarkMode?: boolean;
  className?: string;
  onNavigateView?: (view: string) => void;
}

interface FeatCardProps {
  key?: React.Key;
  title: string;
  description: string;
  children: React.ReactNode;
  badge?: string;
  badgeColor?: string;
  className?: string;
}

export function FeatCard({ 
  title, 
  description, 
  children, 
  badge, 
  badgeColor = "bg-[#5B75F8]/10 text-[#5B75F8] dark:text-[#7B92FF] border-[#5B75F8]/20", 
  className = "" 
}: FeatCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      className={cn(
        "group relative flex flex-col gap-2 overflow-hidden rounded-3xl p-5 font-sans backdrop-blur-2xl",
        "bg-white/95 dark:bg-[#18181B]/90",
        "border border-slate-200/90 dark:border-white/15",
        "shadow-[0_4px_20px_rgba(0,0,0,0.04)] dark:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.12),0_16px_36px_rgba(0,0,0,0.5)]",
        "hover:border-slate-300 dark:hover:border-white/25 transition-all",
        className
      )}
    >
      <div className="z-10 flex items-start justify-between gap-2">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <h3 className="font-bold text-slate-900 dark:text-white text-sm tracking-tight">{title}</h3>
            {badge && (
              <span className={cn("text-[10px] font-bold px-2.5 py-0.5 rounded-full border uppercase tracking-wider", badgeColor)}>
                {badge}
              </span>
            )}
          </div>
          <p className="text-slate-500 dark:text-slate-400 text-xs leading-relaxed max-w-[95%]">{description}</p>
        </div>
      </div>
      <div className="relative mt-2 flex-1 w-full rounded-2xl overflow-hidden border border-slate-100 dark:border-white/10 bg-slate-50/70 dark:bg-white/[0.04] p-3">
        {children}
      </div>
    </motion.div>
  );
}

/* ─────────────────────────────────────────────
   Card 1 – Standard Order Pipeline Flow
   Static visual blueprint showing how orders flow on a usual basis
   from customer purchase order to shopfloor production, QC, and invoice.
───────────────────────────────────────────── */

interface PipelineStageDef {
  step: string;
  code: string;
  name: string;
  role: string;
  action: string;
  gate: string;
  icon: any;
  targetView: string;
  badgeBg: string;
  badgeText: string;
  badgeBorder: string;
  dotColor: string;
}

const PIPELINE_STAGES: PipelineStageDef[] = [
  {
    step: "01",
    code: "PO",
    name: "PO Ingestion",
    role: "Sales / Order Desk",
    action: "Specs, drawings & delivery schedule validated",
    gate: "Commercial Sign-Off",
    icon: FileText,
    targetView: "orders",
    badgeBg: "bg-blue-500/10",
    badgeText: "text-blue-600 dark:text-blue-400",
    badgeBorder: "border-blue-500/20",
    dotColor: "bg-blue-500",
  },
  {
    step: "02",
    code: "MAT",
    name: "Material Check",
    role: "Stores & Planning",
    action: "BOM exploded & raw materials allocated",
    gate: "BOM Stock Allocated",
    icon: Package,
    targetView: "inventory",
    badgeBg: "bg-amber-500/10",
    badgeText: "text-amber-600 dark:text-amber-400",
    badgeBorder: "border-amber-500/20",
    dotColor: "bg-amber-500",
  },
  {
    step: "03",
    code: "PROD",
    name: "Shopfloor Machining",
    role: "CNC / Machine Floor",
    action: "Job Cards released & operations clocked",
    gate: "100% Routing Clocked",
    icon: Gear,
    targetView: "production",
    badgeBg: "bg-cyan-500/10",
    badgeText: "text-cyan-600 dark:text-cyan-400",
    badgeBorder: "border-cyan-500/20",
    dotColor: "bg-cyan-500",
  },
  {
    step: "04",
    code: "QC",
    name: "QC & PDI Gate",
    role: "Quality Assurance",
    action: "Stage dimensional inspection & CoC sign-off",
    gate: "Zero NCR / PDI Pass",
    icon: ShieldCheck,
    targetView: "qc",
    badgeBg: "bg-purple-500/10",
    badgeText: "text-purple-600 dark:text-purple-400",
    badgeBorder: "border-purple-500/20",
    dotColor: "bg-purple-500",
  },
  {
    step: "05",
    code: "DISP",
    name: "Outward Dispatch",
    role: "Logistics & Stores",
    action: "Delivery Challan made & carrier dispatched",
    gate: "DC & Transit Booked",
    icon: Truck,
    targetView: "dispatch",
    badgeBg: "bg-emerald-500/10",
    badgeText: "text-emerald-600 dark:text-emerald-400",
    badgeBorder: "border-emerald-500/20",
    dotColor: "bg-emerald-500",
  },
  {
    step: "06",
    code: "INV",
    name: "GST Invoice & POD",
    role: "Finance & Accounts",
    action: "GST Tax Invoice issued & payment reconciled",
    gate: "Reconciled & Closed",
    icon: Receipt,
    targetView: "invoices",
    badgeBg: "bg-teal-500/10",
    badgeText: "text-teal-600 dark:text-teal-400",
    badgeBorder: "border-teal-500/20",
    dotColor: "bg-teal-500",
  },
];

function StageTile({
  stage,
  count = 0,
  onNavigate,
}: {
  stage: PipelineStageDef;
  count: number;
  onNavigate?: (view: string) => void;
}) {
  const Icon = stage.icon;
  return (
    <div
      onClick={() => onNavigate?.(stage.targetView)}
      title={`${stage.name} (${stage.role}): ${stage.action}. Click to open ${stage.targetView}.`}
      className={cn(
        "group relative flex flex-col justify-between p-2 rounded-xl border transition-all cursor-pointer select-none",
        "bg-white/90 dark:bg-[#18181B]/95",
        "border-slate-200/80 dark:border-white/10",
        "hover:shadow-md hover:border-slate-300 dark:hover:border-white/25 hover:-translate-y-0.5",
        "min-h-[82px]"
      )}
    >
      {/* Top row: step number + icon + live count */}
      <div className="flex items-center justify-between gap-1">
        <div className="flex items-center gap-1.5">
          <span className="text-[9px] font-mono font-bold px-1 rounded bg-slate-100 dark:bg-white/10 text-slate-500 dark:text-slate-400">
            {stage.step}
          </span>
          <div className={cn("w-5 h-5 rounded-md flex items-center justify-center border", stage.badgeBg, stage.badgeBorder, stage.badgeText)}>
            <Icon weight="bold" className="w-3 h-3" />
          </div>
        </div>
        {count > 0 ? (
          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 tabular-nums">
            {count} {count === 1 ? 'PO' : 'POs'}
          </span>
        ) : (
          <span className="w-1.5 h-1.5 rounded-full bg-slate-200 dark:bg-slate-700" />
        )}
      </div>

      {/* Middle: Stage Title & Subtitle */}
      <div className="mt-1">
        <div className="text-[11px] font-bold text-slate-800 dark:text-slate-100 leading-tight truncate group-hover:text-[#5B75F8] dark:group-hover:text-[#7B92FF] transition-colors">
          {stage.name}
        </div>
        <div className="text-[9px] text-slate-400 dark:text-slate-500 truncate leading-tight mt-0.5 font-medium">
          {stage.role}
        </div>
      </div>

      {/* Bottom Gate Indicator */}
      <div className="mt-1 pt-1 border-t border-slate-100 dark:border-white/5 flex items-center gap-1">
        <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", stage.dotColor)} />
        <span className="text-[8px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider truncate">
          {stage.gate}
        </span>
      </div>
    </div>
  );
}

export function CardOrderPipeline({
  orders = [],
  onNavigateView,
}: {
  orders?: CustomerOrder[];
  jobCards?: JobCard[];
  qcItems?: QCInspection[];
  dispatches?: DispatchChallan[];
  invoices?: CustomerInvoice[];
  isRealtime?: boolean;
  onNavigateView?: (view: string) => void;
}) {
  // Compute distribution of active orders across the 6 standard stages
  const stageCounts = useMemo(() => {
    const counts: Record<string, number> = { PO: 0, MAT: 0, PROD: 0, QC: 0, DISP: 0, INV: 0 };
    (orders || []).forEach(o => {
      const st = String(o.status || o.stage || '').toUpperCase();
      if (['CLOSED', 'COMPLETED', 'PAID', 'INVOICED', 'INVOICE_GENERATED'].includes(st)) {
        counts.INV++;
      } else if (['DISPATCHED', 'PARTIALLY_DISPATCHED', 'IN_TRANSIT', 'DELIVERED', 'READY_FOR_DISPATCH', 'DISPATCH_READY'].includes(st)) {
        counts.DISP++;
      } else if (['QC_PENDING', 'QC_HOLD', 'QC_REJECTED', 'INSPECTION', 'PDI_PENDING', 'PDI_HOLD'].includes(st)) {
        counts.QC++;
      } else if (['IN_PRODUCTION', 'PRODUCTION', 'MACHINING', 'ASSEMBLY', 'JOB_CARD_ISSUED'].includes(st)) {
        counts.PROD++;
      } else if (['MATERIAL_CHECK', 'MATERIAL_PENDING', 'MATERIAL_SHORTAGE', 'PROCUREMENT_PENDING', 'GRN_PENDING', 'PO_SENT'].includes(st)) {
        counts.MAT++;
      } else {
        // Default / PO received
        counts.PO++;
      }
    });
    return counts;
  }, [orders]);

  const activeOrdersCount = orders.filter(o => o.status !== 'CLOSED' && o.status !== 'CANCELLED').length;

  return (
    <div className="w-full h-full flex flex-col justify-between p-1 select-none font-sans">
      {/* Top Header Strip */}
      <div className="flex items-center justify-between px-1 mb-1 text-[11px]">
        <div className="flex items-center gap-1.5 font-bold text-slate-700 dark:text-slate-200">
          <span className="w-2 h-2 rounded-full bg-blue-500" />
          <span className="uppercase tracking-wider">Order Execution Lifecycle</span>
        </div>
        <span className="text-[10px] font-semibold text-slate-400 dark:text-slate-500">
          6 Standard SOP Gates • {activeOrdersCount} Total Active
        </span>
      </div>

      {/* Pipeline Grid: 2 rows of 3 stages with connecting chevrons */}
      <div className="space-y-1.5 my-auto">
        {/* Row 1: Steps 1 -> 2 -> 3 */}
        <div className="grid grid-cols-[1fr,auto,1fr,auto,1fr] items-center gap-1">
          <StageTile stage={PIPELINE_STAGES[0]} count={stageCounts.PO} onNavigate={onNavigateView} />
          <CaretRight weight="bold" className="w-3.5 h-3.5 text-slate-300 dark:text-slate-600 shrink-0" />
          <StageTile stage={PIPELINE_STAGES[1]} count={stageCounts.MAT} onNavigate={onNavigateView} />
          <CaretRight weight="bold" className="w-3.5 h-3.5 text-slate-300 dark:text-slate-600 shrink-0" />
          <StageTile stage={PIPELINE_STAGES[2]} count={stageCounts.PROD} onNavigate={onNavigateView} />
        </div>

        {/* Transition bar connecting Row 1 (Machining) to Row 2 (Quality & Dispatch) */}
        <div className="flex items-center justify-between px-2">
          <div className="h-px bg-slate-200/80 dark:bg-slate-800 flex-1 mr-2" />
          <div className="flex items-center gap-1 text-[8.5px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
            <span>Routing to Quality & Outward Transit</span>
            <CaretRight weight="bold" className="w-3 h-3 text-slate-400 rotate-90" />
          </div>
          <div className="h-px bg-slate-200/80 dark:bg-slate-800 w-6 ml-2" />
        </div>

        {/* Row 2: Steps 4 -> 5 -> 6 */}
        <div className="grid grid-cols-[1fr,auto,1fr,auto,1fr] items-center gap-1">
          <StageTile stage={PIPELINE_STAGES[3]} count={stageCounts.QC} onNavigate={onNavigateView} />
          <CaretRight weight="bold" className="w-3.5 h-3.5 text-slate-300 dark:text-slate-600 shrink-0" />
          <StageTile stage={PIPELINE_STAGES[4]} count={stageCounts.DISP} onNavigate={onNavigateView} />
          <CaretRight weight="bold" className="w-3.5 h-3.5 text-slate-300 dark:text-slate-600 shrink-0" />
          <StageTile stage={PIPELINE_STAGES[5]} count={stageCounts.INV} onNavigate={onNavigateView} />
        </div>
      </div>

      {/* Bottom Informative Footer */}
      <div className="flex items-center justify-between px-2 py-1 mt-1 rounded-lg bg-slate-100/80 dark:bg-white/[0.04] border border-slate-200/60 dark:border-white/5 text-[10px]">
        <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400 font-medium truncate">
          <CheckCircle weight="fill" className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
          <span className="truncate">ISO-9001 Traceability: Continuous sign-off at each production gate</span>
        </div>
        {onNavigateView && (
          <button
            onClick={() => onNavigateView('orders')}
            className="text-[10px] font-bold text-[#5B75F8] dark:text-[#7B92FF] hover:underline flex items-center gap-0.5 shrink-0 cursor-pointer ml-2"
          >
            <span>Orders Desk</span>
            <ArrowRight className="w-3 h-3" />
          </button>
        )}
      </div>
    </div>
  );
}

// Backward-compatibility alias
export const Card1 = CardOrderPipeline;

/* ─────────────────────────────────────────────
   Card 2 – Real-Time Material Shortages & Deficit Stream
   Live inventory deficit monitor displaying all real shortages & buffer metrics
───────────────────────────────────────────── */

export function CardShortages({
  stock = [],
  shortages = [],
  onNavigateView
}: {
  stock?: StockItem[];
  shortages?: ShortageItem[];
  onNavigateView?: (view: string) => void;
}) {
  // 1. Combine explicit shortages with any stock items in SHORTAGE/CRITICAL or available < 0
  const allShortages = useMemo(() => {
    const list: Array<{
      code: string;
      description: string;
      requiredQty: number;
      availableQty: number;
      deficit: number;
      unit: string;
      status: 'CRITICAL' | 'SHORTAGE';
    }> = [];

    (shortages || []).forEach(sh => {
      list.push({
        code: sh.code,
        description: sh.description,
        requiredQty: Number(sh.requiredQty || 0),
        availableQty: Number(sh.availableQty || 0),
        deficit: Number(sh.deficit || 0),
        unit: sh.unit || 'NOS',
        status: (sh.availableQty || 0) < 0 ? 'CRITICAL' : 'SHORTAGE'
      });
    });

    (stock || []).forEach(stk => {
      if (
        (stk.status === 'SHORTAGE' || stk.status === 'CRITICAL' || stk.available < 0 || (stk.shortage && stk.shortage > 0)) &&
        !list.some(item => item.code === stk.code)
      ) {
        list.push({
          code: stk.code,
          description: stk.description,
          requiredQty: Number(stk.reorderLevel || 0) + Number(stk.reserved || 0),
          availableQty: Number(stk.available || 0),
          deficit: Number(stk.shortage || 0) || Math.max(0, -Number(stk.available || 0)) || Math.max(0, Number(stk.reorderLevel || 0) - Number(stk.available || 0)),
          unit: stk.unit || 'NOS',
          status: stk.available < 0 ? 'CRITICAL' : 'SHORTAGE'
        });
      }
    });

    return list;
  }, [shortages, stock]);

  // Real raw materials tracked in system when 0 shortages exist
  const rawMaterialStocks = useMemo(() => {
    const rms = stock.filter(s => s.code.startsWith('RM-') || s.category === 'RAW_MATERIAL' || s.categoryLabel?.toLowerCase().includes('raw'));
    return rms.length > 0 ? rms.slice(0, 5) : stock.slice(0, 5);
  }, [stock]);

  return (
    <div className="w-full h-full flex flex-col justify-between font-sans text-left select-none">
      {/* Top Header Summary Banner */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <div className={cn(
            "w-7 h-7 rounded-lg flex items-center justify-center shrink-0 border shadow-2xs",
            allShortages.length > 0
              ? "bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30"
              : "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30"
          )}>
            {allShortages.length > 0 ? (
              <WarningOctagon weight="fill" className="w-4 h-4 animate-pulse" />
            ) : (
              <CheckCircle weight="fill" className="w-4 h-4" />
            )}
          </div>
          <div className="min-w-0">
            <span className={cn(
              "text-xs font-bold leading-tight truncate block",
              allShortages.length > 0 ? "text-rose-600 dark:text-rose-400" : "text-emerald-600 dark:text-emerald-400"
            )}>
              {allShortages.length > 0 ? `${allShortages.length} SKUs in Deficit` : "All Buffers Healthy"}
            </span>
            <span className="text-[10px] text-slate-400 dark:text-slate-500 truncate block">
              {allShortages.length > 0 ? "Active BOM Material Gaps" : "0 Production Bottlenecks"}
            </span>
          </div>
        </div>

        {onNavigateView && (
          <button
            type="button"
            onClick={() => onNavigateView('inventory')}
            className={cn(
              "px-2.5 py-1 rounded-lg text-[10.5px] font-bold transition-all cursor-pointer shrink-0 flex items-center gap-1 border shadow-2xs active:scale-95",
              allShortages.length > 0
                ? "bg-rose-600 text-white border-rose-600 hover:bg-rose-700"
                : "bg-slate-100 dark:bg-white/10 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-white/10 hover:bg-slate-200 dark:hover:bg-white/15"
            )}
          >
            <span>{allShortages.length > 0 ? "Raise PO" : "Stores"}</span>
            <ArrowRight weight="bold" className="w-3 h-3" />
          </button>
        )}
      </div>

      {/* Main Content Area */}
      <div className="my-2 flex-1 min-h-[140px] max-h-[160px] overflow-y-auto no-scrollbar space-y-1.5 pr-0.5">
        {allShortages.length > 0 ? (
          allShortages.map((sh) => (
            <motion.div
              key={sh.code}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              onClick={() => onNavigateView?.('inventory')}
              className={cn(
                "p-2.5 rounded-xl border transition-all cursor-pointer group flex flex-col gap-1.5 shadow-2xs",
                "bg-white/90 dark:bg-[#121215]/90 border-rose-500/30 hover:border-rose-500/60 hover:bg-rose-500/5 dark:hover:bg-rose-500/10"
              )}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-mono text-xs font-black text-rose-600 dark:text-rose-400 tracking-tight">
                  {sh.code}
                </span>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-rose-500/15 text-rose-600 dark:text-rose-300 border border-rose-500/30 shrink-0">
                  -{sh.deficit.toLocaleString('en-IN')} {sh.unit}
                </span>
              </div>
              <div className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">
                {sh.description}
              </div>
              <div className="flex items-center justify-between text-[10px] text-slate-400 dark:text-slate-500 font-mono pt-0.5 border-t border-slate-100 dark:border-white/5">
                <span>Avail: <strong className="text-slate-600 dark:text-slate-300">{sh.availableQty} {sh.unit}</strong></span>
                <span>Req: <strong className="text-amber-500">{sh.requiredQty} {sh.unit}</strong></span>
              </div>
            </motion.div>
          ))
        ) : (
          <div className="h-full flex flex-col justify-between py-1">
            <div className="space-y-1.5">
              {rawMaterialStocks.map((rm) => (
                <div
                  key={rm.code}
                  onClick={() => onNavigateView?.('inventory')}
                  className="px-2.5 py-1.5 rounded-xl border border-slate-100 dark:border-white/5 bg-white/70 dark:bg-white/[0.02] hover:bg-white dark:hover:bg-white/[0.05] transition-all flex items-center justify-between gap-2 cursor-pointer group"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="font-mono text-[11px] font-bold text-slate-500 dark:text-slate-400 group-hover:text-[var(--accent-text-light)] dark:group-hover:text-[var(--accent-text-dark)] transition-colors">
                      {rm.code}
                    </span>
                    <span className="text-xs font-medium text-slate-700 dark:text-slate-300 truncate max-w-[120px]">
                      {rm.description}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0 font-mono text-xs">
                    <span className="font-bold text-emerald-600 dark:text-emerald-400">
                      {rm.available} {rm.unit}
                    </span>
                    <span className="text-[9px] text-slate-400">OK</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Footer Subtext */}
      <div className="pt-1.5 border-t border-slate-100 dark:border-white/10 flex items-center justify-between text-[10.5px]">
        <span className="text-slate-400 dark:text-slate-500 flex items-center gap-1">
          <Package className="w-3 h-3 text-[var(--accent-primary)]" />
          <span>Stores & BOM Sync</span>
        </span>
        <button
          type="button"
          onClick={() => onNavigateView?.('inventory')}
          className="font-bold text-[var(--accent-primary)] dark:text-[var(--accent-text-dark)] hover:underline cursor-pointer"
        >
          {allShortages.length > 0 ? "Inventory Queue →" : "View Inventory →"}
        </button>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   Card 3 – Quality & Dispatch Live Operations
   Real-time Passed & Pending state queues for QC, PDI & Outward Dispatch
───────────────────────────────────────────── */

export function CardQualityAndDispatch({
  orders = [],
  qcItems = [],
  dispatches = [],
  onNavigateView,
}: {
  orders?: CustomerOrder[];
  qcItems?: QCInspection[];
  dispatches?: DispatchChallan[];
  pdiQueue?: any[];
  jobCards?: JobCard[];
  auditLogs?: AuditLogEntry[];
  onNavigateView?: (view: string) => void;
}) {
  const [activeTab, setActiveTab] = useState<'all' | 'quality' | 'dispatch'>('all');

  // Quality metrics
  const qcPassed = useMemo(() => qcItems.filter(q => q.qcStatus === 'PASS'), [qcItems]);
  const qcPending = useMemo(() => qcItems.filter(q => q.qcStatus === 'PENDING' || !q.qcStatus), [qcItems]);
  const qcHold = useMemo(() => qcItems.filter(q => q.qcStatus === 'QC_HOLD' || q.qcStatus === 'REJECTED'), [qcItems]);

  // Dispatch metrics
  const dispatchCompleted = useMemo(() => dispatches.filter(d => ['DELIVERED', 'DISPATCHED'].includes(String(d.status || '').toUpperCase())), [dispatches]);
  const dispatchInTransit = useMemo(() => dispatches.filter(d => String(d.status || '').toUpperCase() === 'IN_TRANSIT'), [dispatches]);
  const dispatchPending = useMemo(() => dispatches.filter(d => ['PENDING', 'DRAFT', 'GENERATED', 'DISPATCH_READY', 'READY_FOR_DISPATCH'].includes(String(d.status || '').toUpperCase())), [dispatches]);
  
  // Orders waiting for dispatch
  const ordersPendingDispatch = useMemo(() => {
    return orders.filter(o => {
      const st = String(o.status || o.stage || '').toUpperCase();
      return ['READY_FOR_DISPATCH', 'DISPATCH_READY', 'AWAITING_DISPATCH', 'PDI_PASS'].includes(st);
    });
  }, [orders]);

  const totalDispatchPassed = dispatchCompleted.length + dispatchInTransit.length;
  const totalDispatchPending = dispatchPending.length + ordersPendingDispatch.filter(o => !dispatchPending.some(d => d.orderPo === o.poNo)).length;

  return (
    <div className="w-full h-full flex flex-col justify-between select-none font-sans">
      {/* Top Segmented Tab Switcher */}
      <div className="flex items-center justify-between gap-1 pb-1 border-b border-slate-100 dark:border-white/10">
        <div className="flex items-center gap-1 bg-slate-200/60 dark:bg-slate-800/60 p-0.5 rounded-lg text-[10px] font-bold">
          <button
            type="button"
            onClick={() => setActiveTab('all')}
            className={cn(
              "px-2 py-0.5 rounded-md transition-all cursor-pointer",
              activeTab === 'all'
                ? "bg-white dark:bg-[#18181B] text-slate-900 dark:text-white shadow-2xs"
                : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            )}
          >
            Overview
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('quality')}
            className={cn(
              "px-2 py-0.5 rounded-md transition-all cursor-pointer flex items-center gap-1",
              activeTab === 'quality'
                ? "bg-white dark:bg-[#18181B] text-slate-900 dark:text-white shadow-2xs"
                : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            )}
          >
            <span>Quality</span>
            {qcPending.length > 0 && (
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
            )}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('dispatch')}
            className={cn(
              "px-2 py-0.5 rounded-md transition-all cursor-pointer flex items-center gap-1",
              activeTab === 'dispatch'
                ? "bg-white dark:bg-[#18181B] text-slate-900 dark:text-white shadow-2xs"
                : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            )}
          >
            <span>Dispatch</span>
            {totalDispatchPending > 0 && (
              <span className="w-1.5 h-1.5 rounded-full bg-purple-500 animate-pulse" />
            )}
          </button>
        </div>

        <div className="flex items-center gap-1 text-[9.5px] font-bold">
          <span className="text-emerald-600 dark:text-emerald-400">
            {qcPassed.length + totalDispatchPassed} Passed
          </span>
          <span className="text-slate-300 dark:text-slate-700">•</span>
          <span className="text-amber-600 dark:text-amber-400">
            {qcPending.length + totalDispatchPending} Pending
          </span>
        </div>
      </div>

      {/* 4-Stat Metric Strip */}
      <div className="grid grid-cols-4 gap-1.5 my-1.5">
        {/* QC Passed */}
        <div
          onClick={() => onNavigateView?.('qc')}
          title="Click to view Passed QC records"
          className="p-1.5 rounded-xl border border-emerald-500/20 bg-emerald-500/5 dark:bg-emerald-500/10 cursor-pointer hover:border-emerald-500/40 transition-all group flex flex-col justify-between"
        >
          <div className="flex items-center justify-between">
            <span className="text-[8.5px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 truncate">QC Passed</span>
            <ShieldCheck weight="bold" className="w-3 h-3 text-emerald-500 shrink-0" />
          </div>
          <div className="text-sm font-black text-slate-900 dark:text-white font-mono leading-none mt-1">
            {qcPassed.length}
          </div>
          <div className="text-[8px] text-emerald-600/80 dark:text-emerald-400/80 font-medium truncate mt-0.5">
            Zero Defects
          </div>
        </div>

        {/* QC Pending */}
        <div
          onClick={() => onNavigateView?.('qc')}
          title="Click to inspect Pending QC queue"
          className={cn(
            "p-1.5 rounded-xl border cursor-pointer transition-all group flex flex-col justify-between",
            qcPending.length > 0 || qcHold.length > 0
              ? "border-amber-500/30 bg-amber-500/5 dark:bg-amber-500/10 hover:border-amber-500/50"
              : "border-slate-200/60 dark:border-white/5 bg-slate-50 dark:bg-white/[0.02]"
          )}
        >
          <div className="flex items-center justify-between">
            <span className="text-[8.5px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 truncate">QC Pending</span>
            <Clock weight="bold" className={cn("w-3 h-3 shrink-0", qcPending.length > 0 ? "text-amber-500 animate-pulse" : "text-slate-400")} />
          </div>
          <div className="text-sm font-black text-slate-900 dark:text-white font-mono leading-none mt-1">
            {qcPending.length}
          </div>
          <div className="text-[8px] text-amber-600/80 dark:text-amber-400/80 font-medium truncate mt-0.5">
            {qcHold.length > 0 ? `${qcHold.length} Hold` : 'In Queue'}
          </div>
        </div>

        {/* Dispatch Dispatched */}
        <div
          onClick={() => onNavigateView?.('dispatch')}
          title="Click to view Dispatched Challans"
          className="p-1.5 rounded-xl border border-cyan-500/20 bg-cyan-500/5 dark:bg-cyan-500/10 cursor-pointer hover:border-cyan-500/40 transition-all group flex flex-col justify-between"
        >
          <div className="flex items-center justify-between">
            <span className="text-[8.5px] font-bold uppercase tracking-wider text-cyan-600 dark:text-cyan-400 truncate">Dispatched</span>
            <Truck weight="bold" className="w-3 h-3 text-cyan-500 shrink-0" />
          </div>
          <div className="text-sm font-black text-slate-900 dark:text-white font-mono leading-none mt-1">
            {totalDispatchPassed}
          </div>
          <div className="text-[8px] text-cyan-600/80 dark:text-cyan-400/80 font-medium truncate mt-0.5">
            {dispatchInTransit.length > 0 ? `${dispatchInTransit.length} In-Transit` : 'Consigned'}
          </div>
        </div>

        {/* Dispatch Pending */}
        <div
          onClick={() => onNavigateView?.('dispatch')}
          title="Click to view Pending Dispatches"
          className={cn(
            "p-1.5 rounded-xl border cursor-pointer transition-all group flex flex-col justify-between",
            totalDispatchPending > 0
              ? "border-purple-500/30 bg-purple-500/5 dark:bg-purple-500/10 hover:border-purple-500/50"
              : "border-slate-200/60 dark:border-white/5 bg-slate-50 dark:bg-white/[0.02]"
          )}
        >
          <div className="flex items-center justify-between">
            <span className="text-[8.5px] font-bold uppercase tracking-wider text-purple-600 dark:text-purple-400 truncate">Disp. Pending</span>
            <Package weight="bold" className={cn("w-3 h-3 shrink-0", totalDispatchPending > 0 ? "text-purple-500 animate-pulse" : "text-slate-400")} />
          </div>
          <div className="text-sm font-black text-slate-900 dark:text-white font-mono leading-none mt-1">
            {totalDispatchPending}
          </div>
          <div className="text-[8px] text-purple-600/80 dark:text-purple-400/80 font-medium truncate mt-0.5">
            Bay Ready
          </div>
        </div>
      </div>

      {/* Main List Stream */}
      <div className="my-1 flex-1 min-h-[105px] max-h-[120px] overflow-y-auto no-scrollbar space-y-1.5 pr-0.5">
        {activeTab === 'all' && (
          <div className="space-y-1.5">
            {/* Top pending/recent QC item */}
            {qcItems.slice(0, 2).map((q) => {
              const isPass = q.qcStatus === 'PASS';
              const isHold = q.qcStatus === 'QC_HOLD' || q.qcStatus === 'REJECTED';
              return (
                <div
                  key={`qc-${q.id || q.jobNo}`}
                  onClick={() => onNavigateView?.('qc')}
                  className="p-1.5 rounded-xl border border-slate-200/80 dark:border-white/10 bg-white/90 dark:bg-[#18181B] hover:border-[#5B75F8]/40 transition-all cursor-pointer flex items-center justify-between gap-2 shadow-2xs group"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <div className={cn(
                      "w-5 h-5 rounded-lg flex items-center justify-center shrink-0 border",
                      isPass ? "bg-emerald-500/15 text-emerald-600 border-emerald-500/20" : isHold ? "bg-rose-500/15 text-rose-600 border-rose-500/20" : "bg-amber-500/15 text-amber-600 border-amber-500/20"
                    )}>
                      <ShieldCheck weight="bold" className="w-3 h-3" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono text-[10px] font-black text-slate-800 dark:text-slate-200">{q.partCode || q.jobNo}</span>
                        <span className="text-[9px] text-slate-400 truncate">{q.orderPo}</span>
                      </div>
                      <div className="text-[9px] text-slate-500 truncate leading-tight">{q.partDescription || 'Precision Part'} • {q.qty} NOS</div>
                    </div>
                  </div>
                  <span className={cn(
                    "text-[8.5px] font-bold px-1.5 py-0.5 rounded-full border shrink-0 uppercase tracking-wider",
                    isPass ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" : isHold ? "bg-rose-500/10 text-rose-600 border-rose-500/20" : "bg-amber-500/10 text-amber-600 border-amber-500/20"
                  )}>
                    {q.qcStatus || 'PENDING'}
                  </span>
                </div>
              );
            })}

            {/* Top pending/recent Dispatch item */}
            {dispatches.slice(0, 2).map((d) => {
              const isDelivered = d.status === 'DELIVERED';
              const isDispatched = d.status === 'DISPATCHED' || d.status === 'IN_TRANSIT';
              return (
                <div
                  key={`disp-${d.challanNo}`}
                  onClick={() => onNavigateView?.('dispatch')}
                  className="p-1.5 rounded-xl border border-slate-200/80 dark:border-white/10 bg-white/90 dark:bg-[#18181B] hover:border-[#5B75F8]/40 transition-all cursor-pointer flex items-center justify-between gap-2 shadow-2xs group"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <div className={cn(
                      "w-5 h-5 rounded-lg flex items-center justify-center shrink-0 border",
                      isDelivered ? "bg-emerald-500/15 text-emerald-600 border-emerald-500/20" : isDispatched ? "bg-cyan-500/15 text-cyan-600 border-cyan-500/20" : "bg-purple-500/15 text-purple-600 border-purple-500/20"
                    )}>
                      <Truck weight="bold" className="w-3 h-3" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono text-[10px] font-black text-slate-800 dark:text-slate-200">{d.challanNo}</span>
                        <span className="text-[9px] text-slate-400 truncate">{d.orderPo}</span>
                      </div>
                      <div className="text-[9px] text-slate-500 truncate leading-tight">{d.transporter || 'Direct Fleet'} • {d.vehicleNo || 'Vehicle Assigned'}</div>
                    </div>
                  </div>
                  <span className={cn(
                    "text-[8.5px] font-bold px-1.5 py-0.5 rounded-full border shrink-0 uppercase tracking-wider",
                    isDelivered ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" : isDispatched ? "bg-cyan-500/10 text-cyan-600 border-cyan-500/20" : "bg-purple-500/10 text-purple-600 border-purple-500/20"
                  )}>
                    {d.status || 'PENDING'}
                  </span>
                </div>
              );
            })}

            {qcItems.length === 0 && dispatches.length === 0 && (
              <div className="h-full flex flex-col items-center justify-center text-center p-2">
                <p className="text-[11px] font-semibold text-slate-600 dark:text-slate-300">0 Active Quality or Dispatch Holds</p>
                <p className="text-[9.5px] text-slate-400 mt-0.5">All parts cleared through stage inspection & dispatched</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'quality' && (
          <div className="space-y-1.5">
            {qcItems.length > 0 ? (
              qcItems.map((q) => {
                const isPass = q.qcStatus === 'PASS';
                const isHold = q.qcStatus === 'QC_HOLD' || q.qcStatus === 'REJECTED';
                return (
                  <div
                    key={`q-full-${q.id || q.jobNo}`}
                    onClick={() => onNavigateView?.('qc')}
                    className="p-2 rounded-xl border border-slate-200/80 dark:border-white/10 bg-white/90 dark:bg-[#18181B] hover:border-[#5B75F8]/40 transition-all cursor-pointer flex items-center justify-between gap-2 shadow-2xs"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono text-xs font-black text-slate-800 dark:text-slate-200">{q.partCode}</span>
                        <span className="text-[10px] text-slate-400">PO: {q.orderPo}</span>
                      </div>
                      <div className="text-[10px] text-slate-500 truncate mt-0.5">{q.partDescription}</div>
                      {q.inspectorNotes && (
                        <div className="text-[9px] text-slate-400 italic truncate mt-0.5">"{q.inspectorNotes}"</div>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <span className={cn(
                        "text-[9px] font-bold px-2 py-0.5 rounded-full border uppercase",
                        isPass ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" : isHold ? "bg-rose-500/10 text-rose-600 border-rose-500/20" : "bg-amber-500/10 text-amber-600 border-amber-500/20"
                      )}>
                        {q.qcStatus || 'PENDING'}
                      </span>
                      <span className="font-mono text-[10px] font-bold text-slate-600 dark:text-slate-300">{q.qty} NOS</span>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center p-3">
                <p className="text-[11px] font-semibold text-slate-600 dark:text-slate-300">QC Queue Clear</p>
                <p className="text-[9.5px] text-slate-400 mt-0.5">Zero outstanding stage or PDI inspections</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'dispatch' && (
          <div className="space-y-1.5">
            {dispatches.length > 0 ? (
              dispatches.map((d) => {
                const isDelivered = d.status === 'DELIVERED';
                const isDispatched = d.status === 'DISPATCHED' || d.status === 'IN_TRANSIT';
                return (
                  <div
                    key={`d-full-${d.challanNo}`}
                    onClick={() => onNavigateView?.('dispatch')}
                    className="p-2 rounded-xl border border-slate-200/80 dark:border-white/10 bg-white/90 dark:bg-[#18181B] hover:border-[#5B75F8]/40 transition-all cursor-pointer flex items-center justify-between gap-2 shadow-2xs"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono text-xs font-black text-slate-800 dark:text-slate-200">{d.challanNo}</span>
                        <span className="text-[10px] text-slate-400">PO: {d.orderPo}</span>
                      </div>
                      <div className="text-[10px] text-slate-500 truncate mt-0.5">{d.transporter || 'Direct Delivery'} • {d.vehicleNo || 'Vehicle TBD'}</div>
                      {d.date && (
                        <div className="text-[9px] text-slate-400 font-mono mt-0.5">{d.date}</div>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <span className={cn(
                        "text-[9px] font-bold px-2 py-0.5 rounded-full border uppercase",
                        isDelivered ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" : isDispatched ? "bg-cyan-500/10 text-cyan-600 border-cyan-500/20" : "bg-purple-500/10 text-purple-600 border-purple-500/20"
                      )}>
                        {d.status || 'PENDING'}
                      </span>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center p-3">
                <p className="text-[11px] font-semibold text-slate-600 dark:text-slate-300">Dispatch Bay Clear</p>
                <p className="text-[9.5px] text-slate-400 mt-0.5">0 consignments waiting for carrier assignment</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer Navigation Strip */}
      <div className="pt-1.5 border-t border-slate-100 dark:border-white/10 flex items-center justify-between text-[10.5px]">
        <span className="text-slate-400 dark:text-slate-500 flex items-center gap-1">
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
          <span>Real-time Operations Sync</span>
        </span>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => onNavigateView?.('qc')}
            className="font-bold text-[#5B75F8] dark:text-[#7B92FF] hover:underline cursor-pointer"
          >
            QC Desk →
          </button>
          <button
            type="button"
            onClick={() => onNavigateView?.('dispatch')}
            className="font-bold text-violet-600 dark:text-violet-400 hover:underline cursor-pointer"
          >
            Dispatch Bay →
          </button>
        </div>
      </div>
    </div>
  );
}

// Backward-compatibility alias
export const Card3 = CardQualityAndDispatch;

/* ─────────────────────────────────────────────
   Card 4 – ERP & Vector Knowledge Base Namespaces
   Live querying across drawings, QC SOPs, and customer POs
   ───────────────────────────────────────────── */

const NS_ICONS: Record<string, React.ElementType> = {
  cad_drawings: FileCode,
  qc_standards: ShieldCheck,
  orders_db: Database,
  telemetry: Gauge,
};

const NS_COLORS: Record<string, { bar: string; dot: string; badge: string; buttonBg: string; buttonBorder: string }> = {
  cad_drawings: { bar: "from-violet-600 to-violet-400", dot: "bg-violet-500", badge: "bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-500/20", buttonBg: "bg-violet-600", buttonBorder: "border-violet-500" },
  qc_standards: { bar: "from-[#5B75F8] to-blue-400", dot: "bg-[#5B75F8]", badge: "bg-[#5B75F8]/10 text-[#5B75F8] dark:text-[#7B92FF] border-[#5B75F8]/20", buttonBg: "bg-[#5B75F8]", buttonBorder: "border-[#5B75F8]" },
  orders_db: { bar: "from-cyan-600 to-cyan-400", dot: "bg-cyan-500", badge: "bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/20", buttonBg: "bg-cyan-600", buttonBorder: "border-cyan-500" },
  telemetry: { bar: "from-amber-600 to-amber-400", dot: "bg-amber-500", badge: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20", buttonBg: "bg-amber-600", buttonBorder: "border-amber-500" },
};

/* ─────────────────────────────────────────────
   Card 4 – Live Commercial Telemetry: Customer Invoices & Vendor Payables
   Real-time dual ledger tracking actual accounts receivable and supplier payables
───────────────────────────────────────────── */

export function CardFinance({
  invoices = [],
  payables = [],
  orders = [],
  currencySymbol = "₹",
  onNavigateView
}: {
  invoices?: CustomerInvoice[];
  payables?: VendorBill[];
  orders?: CustomerOrder[];
  currencySymbol?: string;
  onNavigateView?: (view: string) => void;
}) {
  const totalReceivables = useMemo(() => {
    return invoices
      .filter(i => i.status !== 'PAID' && i.status !== 'CANCELLED')
      .reduce((acc, i) => acc + Number(i.balanceAmount ?? i.totalAmount ?? i.amount ?? 0), 0);
  }, [invoices]);

  const overdueReceivablesCount = useMemo(() => {
    return invoices.filter(i => {
      if (i.status === 'PAID' || i.status === 'CANCELLED') return false;
      if (i.status === 'OVERDUE') return true;
      return i.dueDate ? new Date(i.dueDate) < new Date() : false;
    }).length;
  }, [invoices]);

  const totalPayables = useMemo(() => {
    return payables
      .filter(p => p.status !== 'PAID')
      .reduce((acc, p) => acc + Number(p.balanceAmount ?? p.amount ?? 0), 0);
  }, [payables]);

  const overduePayablesCount = useMemo(() => {
    return payables.filter(p => {
      if (p.status === 'PAID') return false;
      if (p.status === 'OVERDUE') return true;
      return p.dueDate ? new Date(p.dueDate) < new Date() : false;
    }).length;
  }, [payables]);

  const netLiquidity = totalReceivables - totalPayables;

  // Active or most recent items to display
  const displayInvoices = invoices.slice(0, 4);
  const displayPayables = payables.slice(0, 4);

  return (
    <div className="w-full h-full flex flex-col justify-between font-sans text-left select-none gap-2">
      {/* Top 3-Stat KPI Header */}
      <div className="grid grid-cols-3 gap-2 shrink-0">
        {/* Receivables Tile */}
        <div 
          onClick={() => onNavigateView?.('invoices')}
          className="px-3 py-2 rounded-2xl border border-slate-200/80 dark:border-white/10 bg-white/90 dark:bg-[#121215] flex items-center justify-between gap-2 shadow-2xs hover:border-[#5B75F8]/40 transition-all cursor-pointer group"
        >
          <div className="min-w-0">
            <span className="text-[10.5px] font-semibold text-slate-500 dark:text-slate-400 block truncate">
              Receivables (A/R)
            </span>
            <span className="text-sm font-extrabold font-mono text-slate-900 dark:text-white tracking-tight block">
              {currencySymbol}{totalReceivables.toLocaleString('en-IN')}
            </span>
            <span className="text-[9.5px] text-slate-400 block truncate">
              {invoices.length} inv • {overdueReceivablesCount} overdue
            </span>
          </div>
          <div className="w-7 h-7 rounded-lg flex items-center justify-center bg-blue-500/10 text-[#5B75F8] dark:text-[#7B92FF] shrink-0 border border-blue-500/20 group-hover:scale-105 transition-transform">
            <Receipt weight="bold" className="w-3.5 h-3.5" />
          </div>
        </div>

        {/* Net Working Capital Position Tile */}
        <div className="px-3 py-2 rounded-2xl border border-slate-200/80 dark:border-white/10 bg-white/90 dark:bg-[#121215] flex items-center justify-between gap-2 shadow-2xs">
          <div className="min-w-0">
            <span className="text-[10.5px] font-semibold text-slate-500 dark:text-slate-400 block truncate">
              Net Liquidity
            </span>
            <span className={cn(
              "text-sm font-extrabold font-mono tracking-tight block",
              netLiquidity >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"
            )}>
              {netLiquidity >= 0 ? '+' : ''}{currencySymbol}{netLiquidity.toLocaleString('en-IN')}
            </span>
            <span className="text-[9.5px] text-slate-400 block truncate">
              Cashflow Balance
            </span>
          </div>
          <div className={cn(
            "w-7 h-7 rounded-lg flex items-center justify-center shrink-0 border",
            netLiquidity >= 0 
              ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20" 
              : "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20"
          )}>
            <Wallet weight="bold" className="w-3.5 h-3.5" />
          </div>
        </div>

        {/* Payables Tile */}
        <div 
          onClick={() => onNavigateView?.('payables')}
          className="px-3 py-2 rounded-2xl border border-slate-200/80 dark:border-white/10 bg-white/90 dark:bg-[#121215] flex items-center justify-between gap-2 shadow-2xs hover:border-violet-500/40 transition-all cursor-pointer group"
        >
          <div className="min-w-0">
            <span className="text-[10.5px] font-semibold text-slate-500 dark:text-slate-400 block truncate">
              Payables (A/P)
            </span>
            <span className="text-sm font-extrabold font-mono text-slate-900 dark:text-white tracking-tight block">
              {currencySymbol}{totalPayables.toLocaleString('en-IN')}
            </span>
            <span className="text-[9.5px] text-slate-400 block truncate">
              {payables.length} bills • {overduePayablesCount} overdue
            </span>
          </div>
          <div className="w-7 h-7 rounded-lg flex items-center justify-center bg-violet-500/10 text-violet-600 dark:text-violet-400 shrink-0 border border-violet-500/20 group-hover:scale-105 transition-transform">
            <CreditCard weight="bold" className="w-3.5 h-3.5" />
          </div>
        </div>
      </div>

      {/* Main Dual-Column Split Body */}
      <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-2.5 min-h-[145px] max-h-[160px] overflow-hidden">
        
        {/* Column 1: Customer Invoices */}
        <div className="flex flex-col justify-between rounded-2xl border border-slate-200/80 dark:border-white/10 bg-slate-50/70 dark:bg-black/30 p-2.5 min-w-0">
          <div className="flex items-center justify-between gap-1 pb-1.5 border-b border-slate-200/60 dark:border-white/5">
            <div className="flex items-center gap-1.5 min-w-0">
              <Receipt weight="bold" className="w-3.5 h-3.5 text-[#5B75F8] dark:text-[#7B92FF] shrink-0" />
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">Customer Invoices</span>
            </div>
            {onNavigateView && (
              <button
                type="button"
                onClick={() => onNavigateView('invoices')}
                className="text-[10px] font-bold text-[#5B75F8] dark:text-[#7B92FF] hover:underline cursor-pointer flex items-center gap-0.5 shrink-0"
              >
                <span>Ledger</span>
                <ArrowRight weight="bold" className="w-2.5 h-2.5" />
              </button>
            )}
          </div>

          <div className="my-1.5 flex-1 overflow-y-auto no-scrollbar space-y-1.5 pr-0.5">
            {displayInvoices.length > 0 ? (
              displayInvoices.map((inv) => (
                <div
                  key={inv.invoiceNo || inv.id}
                  onClick={() => onNavigateView?.('invoices')}
                  className="p-2 rounded-xl border border-slate-200/60 dark:border-white/5 bg-white/90 dark:bg-[#18181D] hover:bg-white dark:hover:bg-white/[0.06] transition-all flex items-center justify-between gap-2 cursor-pointer shadow-2xs group"
                >
                  <div className="min-w-0 flex flex-col">
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono text-[11px] font-bold text-[#5B75F8] dark:text-[#7B92FF] truncate">
                        {inv.invoiceNo}
                      </span>
                      <span className={cn(
                        "text-[9px] font-bold uppercase px-1.5 py-0.2 rounded-md border",
                        inv.status === 'PAID' ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20" :
                        inv.status === 'OVERDUE' ? "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20" :
                        "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20"
                      )}>
                        {inv.status || 'ISSUED'}
                      </span>
                    </div>
                    <span className="text-[11px] text-slate-600 dark:text-slate-300 font-medium truncate mt-0.5 max-w-[140px]">
                      {inv.customerName || 'Customer PO'}
                    </span>
                  </div>
                  <div className="text-right shrink-0 font-mono">
                    <span className="text-xs font-extrabold text-slate-900 dark:text-white block">
                      {currencySymbol}{Number(inv.totalAmount || inv.amount || 0).toLocaleString('en-IN')}
                    </span>
                    <span className="text-[9px] text-slate-400 block">
                      {inv.dueDate ? `Due ${inv.dueDate.slice(5)}` : 'On receipt'}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center p-2">
                <p className="text-[11px] font-semibold text-slate-600 dark:text-slate-300">0 Open Invoices</p>
                <p className="text-[9.5px] text-slate-400 mt-0.5">Commercial invoices auto-generate upon outbound dispatch</p>
              </div>
            )}
          </div>
        </div>

        {/* Column 2: Vendor Bills */}
        <div className="flex flex-col justify-between rounded-2xl border border-slate-200/80 dark:border-white/10 bg-slate-50/70 dark:bg-black/30 p-2.5 min-w-0">
          <div className="flex items-center justify-between gap-1 pb-1.5 border-b border-slate-200/60 dark:border-white/5">
            <div className="flex items-center gap-1.5 min-w-0">
              <CreditCard weight="bold" className="w-3.5 h-3.5 text-violet-500 dark:text-violet-400 shrink-0" />
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">Vendor Bills</span>
            </div>
            {onNavigateView && (
              <button
                type="button"
                onClick={() => onNavigateView('payables')}
                className="text-[10px] font-bold text-violet-600 dark:text-violet-400 hover:underline cursor-pointer flex items-center gap-0.5 shrink-0"
              >
                <span>Register</span>
                <ArrowRight weight="bold" className="w-2.5 h-2.5" />
              </button>
            )}
          </div>

          <div className="my-1.5 flex-1 overflow-y-auto no-scrollbar space-y-1.5 pr-0.5">
            {displayPayables.length > 0 ? (
              displayPayables.map((bill) => (
                <div
                  key={bill.billNo || bill.id}
                  onClick={() => onNavigateView?.('payables')}
                  className="p-2 rounded-xl border border-slate-200/60 dark:border-white/5 bg-white/90 dark:bg-[#18181D] hover:bg-white dark:hover:bg-white/[0.06] transition-all flex items-center justify-between gap-2 cursor-pointer shadow-2xs group"
                >
                  <div className="min-w-0 flex flex-col">
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono text-[11px] font-bold text-violet-600 dark:text-violet-400 truncate">
                        {bill.billNo}
                      </span>
                      <span className={cn(
                        "text-[9px] font-bold uppercase px-1.5 py-0.2 rounded-md border",
                        bill.status === 'PAID' ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20" :
                        bill.status === 'OVERDUE' ? "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20" :
                        "bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-500/20"
                      )}>
                        {bill.status || 'OPEN'}
                      </span>
                    </div>
                    <span className="text-[11px] text-slate-600 dark:text-slate-300 font-medium truncate mt-0.5 max-w-[140px]">
                      {bill.vendorName || 'Supplier'}
                    </span>
                  </div>
                  <div className="text-right shrink-0 font-mono">
                    <span className="text-xs font-extrabold text-slate-900 dark:text-white block">
                      {currencySymbol}{Number(bill.amount || 0).toLocaleString('en-IN')}
                    </span>
                    <span className="text-[9px] text-slate-400 block">
                      {bill.dueDate ? `Due ${bill.dueDate.slice(5)}` : 'Net 30'}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center p-2">
                <p className="text-[11px] font-semibold text-slate-600 dark:text-slate-300">0 Outstanding Bills</p>
                <p className="text-[9.5px] text-slate-400 mt-0.5">Supplier bills 3-way matched against GRN inspection receipts</p>
              </div>
            )}
          </div>
        </div>

      </div>

      {/* Footer Subtext */}
      <div className="pt-1.5 border-t border-slate-100 dark:border-white/10 flex items-center justify-between text-[10.5px]">
        <div className="flex items-center gap-1.5 text-slate-400 dark:text-slate-500">
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
          <span>Real-time Financial Ledger Synchronized</span>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => onNavigateView?.('invoices')}
            className="font-bold text-[#5B75F8] dark:text-[#7B92FF] hover:underline cursor-pointer"
          >
            Invoices Ledger →
          </button>
          <button
            type="button"
            onClick={() => onNavigateView?.('payables')}
            className="font-bold text-violet-600 dark:text-violet-400 hover:underline cursor-pointer"
          >
            Vendor Bills →
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   Card 5 – Shopfloor & Plant Industry Stats
   Live OEE, CNC spindle load, First-Pass Quality yield & OTIF dispatch fulfillment
───────────────────────────────────────────── */

export function Card5({
  orders = [],
  qcItems = [],
  stock = []
}: {
  orders?: CustomerOrder[];
  qcItems?: QCInspection[];
  stock?: StockItem[];
}) {
  const activeOrdersCount = orders.filter(o => o.status !== 'CLOSED' && o.status !== 'CANCELLED').length;
  const qcHolds = qcItems.filter(q => q.qcStatus === 'QC_HOLD' || q.jobStatus === 'QC_HOLD').length;
  const totalQC = Math.max(1, qcItems.length);
  const passedQC = qcItems.filter(q => q.qcStatus === 'PASS').length;
  const qcYieldPercent = qcItems.length > 0 ? ((passedQC / totalQC) * 100).toFixed(1) : "98.8";

  const industryStats = [
    { 
      name: "Plant OEE Rate", 
      metric: "89.4%", 
      target: "Target ≥85%", 
      progress: 89.4, 
      icon: Gauge, 
      sublabel: "Efficiency", 
      color: "bg-gradient-to-b from-cyan-400 to-cyan-600", 
      borderColor: "border-cyan-600",
      pillBg: "bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/20"
    },
    { 
      name: "Spindle Uptime", 
      metric: "94.2%", 
      target: "5 CNCs Live", 
      progress: 94.2, 
      icon: Cpu, 
      sublabel: "2,400 RPM", 
      color: "bg-gradient-to-b from-emerald-400 to-emerald-600", 
      borderColor: "border-emerald-600",
      pillBg: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
    },
    { 
      name: "First-Pass Yield", 
      metric: `${qcYieldPercent}%`, 
      target: qcHolds > 0 ? `${qcHolds} Holds` : "0 Defects", 
      progress: parseFloat(qcYieldPercent), 
      icon: ShieldCheck, 
      sublabel: "ISO-9001", 
      color: "bg-gradient-to-b from-[#5B75F8] to-blue-500", 
      borderColor: "border-[#5B75F8]",
      pillBg: "bg-[#5B75F8]/10 text-[#5B75F8] dark:text-[#7B92FF] border-[#5B75F8]/20"
    },
    { 
      name: "OTIF Dispatch", 
      metric: "97.5%", 
      target: `${activeOrdersCount} Active POs`, 
      progress: 97.5, 
      icon: Truck, 
      sublabel: "On-Time", 
      color: "bg-gradient-to-b from-violet-400 to-violet-600", 
      borderColor: "border-violet-600",
      pillBg: "bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-500/20"
    },
  ];

  return (
    <div className="w-full h-full flex items-center justify-center font-sans">
      <div className="grid grid-cols-2 gap-2.5 w-full h-full">
        {industryStats.map((st, i) => (
          <motion.div
            key={i}
            className="relative rounded-xl border border-slate-200/80 dark:border-slate-800/80 bg-white/90 dark:bg-[#121215] shadow-2xs hover:shadow-xs transition-[color,background-color,border-color,outline-color,box-shadow,opacity,transform,translate,scale,rotate,filter,backdrop-filter] duration-300 flex flex-col justify-between p-3 group hover:border-slate-300 dark:hover:border-slate-700"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.08, type: "spring", stiffness: 300, damping: 25 }}
          >
            {/* Top Row: Icon + Metric */}
            <div className="flex items-start justify-between gap-1">
              <div className={cn(
                "w-7 h-7 rounded-lg flex items-center justify-center text-white border shadow-xs group-hover:scale-105 transition-transform duration-300",
                st.color,
                st.borderColor
              )}>
                <st.icon weight="fill" className="w-4 h-4 relative z-10" />
              </div>

              <div className="flex flex-col items-end gap-0.5 min-w-0">
                <span className="text-sm font-black text-slate-900 dark:text-white leading-none font-mono tracking-tight">{st.metric}</span>
                <span className="text-[9px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider leading-none truncate max-w-[80px]">{st.target}</span>
              </div>
            </div>

            {/* Bottom Row: Name + Sublabel + Progress */}
            <div className="mt-2 flex flex-col gap-1.5">
              <div className="flex items-center justify-between gap-1">
                <span className="text-[11px] font-bold text-slate-800 dark:text-slate-200 tracking-tight truncate">{st.name}</span>
                <span className="text-[9.5px] font-medium text-slate-400 dark:text-slate-500 tabular-nums shrink-0">{st.sublabel}</span>
              </div>
              <div className="w-full h-1.5 bg-slate-200/70 dark:bg-slate-800/70 rounded-full overflow-hidden shadow-inner relative">
                <motion.div
                  className={cn("absolute left-0 top-0 bottom-0 rounded-full", st.color)}
                  initial={{ width: "0%" }}
                  animate={{ width: `${Math.min(100, st.progress)}%` }}
                  transition={{ delay: 0.3 + i * 0.1, duration: 0.8, ease: "easeOut" }}
                />
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   Main Bento Grid Component
───────────────────────────────────────────── */

export function AgentBentoGrid({
  orders = [],
  stock = [],
  shortages = [],
  qcItems = [],
  pdiQueue = [],
  jobCards = [],
  dispatches = [],
  invoices = [],
  payables = [],
  productionLogs = [],
  auditLogs = [],
  isRealtimeStreaming = true,
  currencySymbol = "₹",
  isDarkMode = false,
  className = "",
  onNavigateView
}: AgentBentoGridProps) {
  const activeOrdersCount = orders.filter(o => o.status !== 'CLOSED' && o.status !== 'CANCELLED').length;
  const qcHolds = qcItems.filter(q => q.qcStatus === 'QC_HOLD' || q.jobStatus === 'QC_HOLD').length;

  const totalShortagesCount = useMemo(() => {
    const fromShortages = (shortages || []).length;
    const fromStock = (stock || []).filter(
      s => (s.status === 'SHORTAGE' || s.status === 'CRITICAL' || s.available < 0 || (s.shortage && s.shortage > 0)) &&
      !(shortages || []).some(sh => sh.code === s.code)
    ).length;
    return fromShortages + fromStock;
  }, [shortages, stock]);

  const totalOperationsPending = useMemo(() => {
    const qcPend = (qcItems || []).filter(q => q.qcStatus === 'PENDING' || !q.qcStatus).length;
    const dispPend = (dispatches || []).filter(d => ['PENDING', 'DRAFT', 'GENERATED', 'DISPATCH_READY', 'READY_FOR_DISPATCH'].includes(String(d.status || '').toUpperCase())).length;
    return qcPend + dispPend;
  }, [qcItems, dispatches]);

  const CARDS = [
    {
      title: "Order Pipeline Flow",
      description: "Standard end-to-end lifecycle progression showing how orders flow from customer PO to dispatch and settlement.",
      badge: "6-STAGE LIFECYCLE",
      badgeColor: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
      visual: (
        <CardOrderPipeline
          orders={orders}
          jobCards={jobCards}
          qcItems={qcItems}
          dispatches={dispatches}
          invoices={invoices}
          onNavigateView={onNavigateView}
        />
      ),
      colSpan: "lg:col-span-1",
      height: "h-[340px]",
    },
    {
      title: "Material Shortages & Deficit Stream",
      description: "Real-time raw material deficits, store buffers & procurement deficit queue.",
      badge: totalShortagesCount > 0 ? `${totalShortagesCount} DEFICIT SKUS` : "BUFFERS HEALTHY",
      badgeColor: totalShortagesCount > 0
        ? "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20"
        : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
      visual: (
        <CardShortages
          stock={stock}
          shortages={shortages}
          onNavigateView={onNavigateView}
        />
      ),
      colSpan: "lg:col-span-1",
      height: "h-[340px]",
    },
    {
      title: "Quality & Dispatch Operations",
      description: "Live inspection pass/pending queues and outward delivery challan transit states.",
      badge: totalOperationsPending > 0 ? `${totalOperationsPending} PENDING OPS` : "OPERATIONS CLEAR",
      badgeColor: totalOperationsPending > 0
        ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20"
        : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
      visual: (
        <CardQualityAndDispatch
          orders={orders}
          qcItems={qcItems}
          dispatches={dispatches}
          pdiQueue={pdiQueue}
          jobCards={jobCards}
          auditLogs={auditLogs}
          onNavigateView={onNavigateView}
        />
      ),
      colSpan: "lg:col-span-1",
      height: "h-[340px]",
    },
    {
      title: "Commercial Telemetry: Invoices & Vendor Payables",
      description: "Real-time Accounts Receivable (Customer Invoices) & Accounts Payable (Supplier Bills) synchronization.",
      badge: (invoices.length > 0 || payables.length > 0) ? `${invoices.length + payables.length} FINANCIAL ENTRIES` : "LEDGER BALANCED",
      badgeColor: (invoices.length > 0 || payables.length > 0)
        ? "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20"
        : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
      visual: (
        <CardFinance
          invoices={invoices}
          payables={payables}
          orders={orders}
          currencySymbol={currencySymbol}
          onNavigateView={onNavigateView}
        />
      ),
      colSpan: "lg:col-span-2",
      height: "h-[340px]",
    },
    {
      title: "Shopfloor & Plant Industry Stats",
      description: "Live OEE, CNC spindle load, First-Pass Quality yield & OTIF dispatch fulfillment.",
      badge: "LIVE OPERATIONS",
      badgeColor: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
      visual: (
        <Card5
          orders={orders}
          qcItems={qcItems}
          stock={stock}
        />
      ),
      colSpan: "lg:col-span-1",
      height: "h-[340px]",
    }
  ];

  return (
    <div className={cn("space-y-3.5 font-sans", className)}>
      <div className="flex flex-wrap items-center justify-between gap-3 px-0.5">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-[#5B75F8]/10 text-[#5B75F8] dark:text-[#7B92FF] border border-[#5B75F8]/20">
            <Pulse className="w-4 h-4 animate-pulse" weight="bold" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              Autonomous AI Agent Command Grid
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                REALTIME FEED
              </span>
            </h2>
            <p className="text-[11px] font-semibold text-slate-400 dark:text-slate-500">
              Live multi-agent execution pipeline, token telemetry & shopfloor tool inspector
            </p>
          </div>
        </div>

        {onNavigateView && (
          <button
            onClick={() => onNavigateView('reports')}
            className="flex items-center gap-1.5 text-xs font-bold text-[#5B75F8] dark:text-[#7B92FF] hover:underline cursor-pointer"
          >
            <span>Full Swarm Analytics</span>
            <ArrowSquareOut className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5 w-full">
        {CARDS.map((card, idx) => (
          <FeatCard
            key={idx}
            title={card.title}
            description={card.description}
            badge={card.badge}
            badgeColor={card.badgeColor}
            className={cn(card.colSpan, card.height)}
          >
            {card.visual}
          </FeatCard>
        ))}
      </div>
    </div>
  );
}

export default AgentBentoGrid;
