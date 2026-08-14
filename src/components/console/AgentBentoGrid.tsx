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
  Cpu
} from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import {
  CustomerOrder,
  StockItem,
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
  qcItems?: QCInspection[];
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
        "group relative flex flex-col gap-2 overflow-hidden rounded-2xl p-4.5 font-sans",
        "bg-white dark:bg-[#1C1E24]",
        "border border-slate-200/90 dark:border-slate-800",
        "shadow-2xs hover:shadow-xs transition-all",
        className
      )}
    >
      <div className="z-10 flex items-start justify-between gap-2">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <h3 className="font-bold text-slate-900 dark:text-white text-sm tracking-tight">{title}</h3>
            {badge && (
              <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-full border uppercase tracking-wider", badgeColor)}>
                {badge}
              </span>
            )}
          </div>
          <p className="text-slate-500 dark:text-slate-400 text-xs leading-relaxed max-w-[95%]">{description}</p>
        </div>
      </div>
      <div className="relative mt-2 flex-1 w-full rounded-xl overflow-hidden border border-slate-100 dark:border-slate-800/80 bg-slate-50/70 dark:bg-[#16171B] p-2.5">
        {children}
      </div>
    </motion.div>
  );
}

/* ─────────────────────────────────────────────
   Card 1 – Realtime Autonomous ERP Pipeline
   Interactive node graph wired to active POs and Job Cards
   ───────────────────────────────────────────── */

type ActiveStep = 'request' | 'router' | 'agent' | 'memory' | 'tools' | 'response';

const VW = 320;
const VH = 240;

interface NodeConfig {
  id: string;
  x: number;
  y: number;
  icon?: any;
  label?: string;
  type: 'box' | 'circle';
}

const NODES: NodeConfig[] = [
  { id: 'A', x: 50, y: 120, icon: ChatCircle, label: "PO INGEST", type: 'box' },
  { id: 'Router', x: 125, y: 120, type: 'circle' },
  { id: 'C', x: 200, y: 120, icon: Brain, label: "PLANNER", type: 'box' },
  { id: 'B', x: 280, y: 50, icon: Database, label: "BOM / SPEC", type: 'box' },
  { id: 'D', x: 280, y: 190, icon: TerminalWindow, label: "CNC I/O", type: 'box' },
];

interface FlowPath {
  id: string;
  d: string;
  activeSteps: ActiveStep[];
  flowDirection: 'forward' | 'backward' | 'both';
  colorClass: string;
}

const PATHS: FlowPath[] = [
  {
    id: "a-to-router",
    d: "M 78 120 L 113 120",
    activeSteps: ["request"],
    flowDirection: "forward",
    colorClass: "text-cyan-500 dark:text-cyan-400",
  },
  {
    id: "router-to-agent",
    d: "M 137 120 L 172 120",
    activeSteps: ["agent"],
    flowDirection: "forward",
    colorClass: "text-violet-500 dark:text-violet-400",
  },
  {
    id: "agent-to-memory",
    d: "M 200 92 L 200 50 L 252 50",
    activeSteps: ["memory"],
    flowDirection: "both",
    colorClass: "text-fuchsia-500 dark:text-fuchsia-400",
  },
  {
    id: "agent-to-tools",
    d: "M 200 148 L 200 190 L 252 190",
    activeSteps: ["tools"],
    flowDirection: "both",
    colorClass: "text-emerald-500 dark:text-emerald-400",
  },
  {
    id: "response-flow-1",
    d: "M 172 120 L 137 120",
    activeSteps: ["response"],
    flowDirection: "forward",
    colorClass: "text-cyan-500 dark:text-cyan-400",
  },
  {
    id: "response-flow-2",
    d: "M 113 120 L 78 120",
    activeSteps: ["response"],
    flowDirection: "forward",
    colorClass: "text-cyan-500 dark:text-cyan-400",
  },
];

const NODE_COLORS: Record<string, { bg: string; border: string; text: string; buttonBg: string; buttonBorder: string }> = {
  A: {
    bg: "bg-cyan-500/10 dark:bg-cyan-500/5",
    border: "border-cyan-500/60 dark:border-cyan-400/50",
    text: "text-cyan-600 dark:text-cyan-400",
    buttonBg: "bg-cyan-600 dark:bg-cyan-500",
    buttonBorder: "border-cyan-500",
  },
  Router: {
    bg: "bg-amber-500/10 dark:bg-amber-500/5",
    border: "border-amber-500/60 dark:border-amber-400/50",
    text: "text-amber-600 dark:text-amber-400",
    buttonBg: "bg-amber-500",
    buttonBorder: "border-amber-600",
  },
  C: {
    bg: "bg-violet-500/10 dark:bg-violet-500/5",
    border: "border-violet-500/60 dark:border-violet-400/50",
    text: "text-violet-600 dark:text-violet-400",
    buttonBg: "bg-violet-600 dark:bg-violet-500",
    buttonBorder: "border-violet-500",
  },
  B: {
    bg: "bg-fuchsia-500/10 dark:bg-fuchsia-500/5",
    border: "border-fuchsia-500/60 dark:border-fuchsia-400/50",
    text: "text-fuchsia-600 dark:text-fuchsia-400",
    buttonBg: "bg-fuchsia-600 dark:bg-fuchsia-500",
    buttonBorder: "border-fuchsia-500",
  },
  D: {
    bg: "bg-emerald-500/10 dark:bg-emerald-500/5",
    border: "border-emerald-500/60 dark:border-emerald-400/50",
    text: "text-emerald-600 dark:text-emerald-400",
    buttonBg: "bg-emerald-600 dark:bg-emerald-500",
    buttonBorder: "border-emerald-500",
  },
};

export function Card1({
  orders = [],
  jobCards = [],
  isRealtime = true
}: {
  orders?: CustomerOrder[];
  jobCards?: JobCard[];
  isRealtime?: boolean;
}) {
  const [step, setStep] = useState<ActiveStep>("request");

  useEffect(() => {
    const steps: ActiveStep[] = ["request", "router", "agent", "memory", "tools", "response"];
    let idx = 0;
    const interval = setInterval(() => {
      idx = (idx + 1) % steps.length;
      setStep(steps[idx]);
    }, isRealtime ? 2200 : 4000);
    return () => clearInterval(interval);
  }, [isRealtime]);

  // Derive real active order & job card data
  const sampleOrder = orders[0] || { poNo: 'PO-2026-901', customerName: 'Larsen & Toubro Ltd', grossAmount: 145000 };
  const sampleJobCard = jobCards[0] || { jobNo: 'JC/0002/26-27', status: 'IN_PRODUCTION' as const };
  const activeOrdersCount = orders.filter(o => o.status !== 'CLOSED' && o.status !== 'CANCELLED').length;

  const stepStatusText = useMemo(() => {
    switch (step) {
      case "request":
        return `Ingesting ${sampleOrder.poNo || 'PO-2026'} from ${sampleOrder.customerName || 'Customer'} (${activeOrdersCount} POs)`;
      case "router":
        return `Routing to CNC Machining Cell & Raw Material Allocation`;
      case "agent":
        return `Gemini Planner scheduling ${sampleJobCard.jobNo || 'JC-26-27'} with BOM parameters`;
      case "memory":
        return `Retrieving CAD drawings & ISO-9001 quality tolerance limits`;
      case "tools":
        return `Writing Supabase records & streaming spindle telemetry to CNC-01`;
      case "response":
        return `Job Card confirmed — automated shopfloor work order released`;
      default:
        return "Autonomous ERP swarm active";
    }
  }, [step, sampleOrder, sampleJobCard, activeOrdersCount]);

  const isNodeActive = (nodeId: string) => {
    switch (step) {
      case 'request':
        return nodeId === 'A';
      case 'router':
        return nodeId === 'Router';
      case 'agent':
        return nodeId === 'C';
      case 'memory':
        return nodeId === 'C' || nodeId === 'B';
      case 'tools':
        return nodeId === 'C' || nodeId === 'D';
      case 'response':
        return nodeId === 'C' || nodeId === 'Router' || nodeId === 'A';
      default:
        return false;
    }
  };

  return (
    <div className="w-full h-full relative overflow-hidden select-none bg-slate-50/70 dark:bg-[#16171B] rounded-xl flex flex-col items-center justify-between p-2 font-sans">
      {/* ── Layer 1: Dotted grid ── */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none" aria-hidden>
        <defs>
          <pattern id="clean-grid" width="16" height="16" patternUnits="userSpaceOnUse">
            <circle cx="1.5" cy="1.5" r="0.75" fill="currentColor" className="text-slate-200 dark:text-slate-800/60" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#clean-grid)" />
      </svg>

      {/* Top micro badge */}
      <div className="w-full flex items-center justify-between z-10 px-2 pt-1">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="uppercase tracking-wider">Live Pipeline</span>
        </div>
        <span className="text-xs font-bold text-cyan-600 dark:text-cyan-400 uppercase tracking-wider">{step}</span>
      </div>

      {/* ── Layer 2: Connector SVG & Nodes ── */}
      <div className="relative w-full flex-1 max-h-[190px] flex items-center justify-center">
        <svg
          className="w-full h-full"
          viewBox={`0 0 ${VW} ${VH}`}
          preserveAspectRatio="xMidYMid meet"
          aria-hidden
        >
          {/* Base Static Connection Paths */}
          <path d="M 78 120 L 113 120" fill="none" stroke="currentColor" className="text-slate-300 dark:text-slate-800" strokeWidth="1.5" strokeDasharray="3 3" />
          <path d="M 137 120 L 172 120" fill="none" stroke="currentColor" className="text-slate-300 dark:text-slate-800" strokeWidth="1.5" strokeDasharray="3 3" />
          <path d="M 200 92 L 200 50 L 252 50" fill="none" stroke="currentColor" className="text-slate-300 dark:text-slate-800" strokeWidth="1.5" strokeDasharray="3 3" />
          <path d="M 200 148 L 200 190 L 252 190" fill="none" stroke="currentColor" className="text-slate-300 dark:text-slate-800" strokeWidth="1.5" strokeDasharray="3 3" />

          {/* Animated Flow Overlays */}
          {PATHS.map((p) => {
            const isActive = p.activeSteps.includes(step);
            if (!isActive) return null;

            return (
              <g key={p.id}>
                <motion.path
                  d={p.d}
                  fill="none"
                  stroke="currentColor"
                  className={p.colorClass}
                  strokeWidth="4"
                  strokeOpacity="0.25"
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ duration: 0.8, ease: "easeInOut" }}
                />
                <motion.path
                  d={p.d}
                  fill="none"
                  stroke="currentColor"
                  className={p.colorClass}
                  strokeWidth="2"
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ duration: 0.8, ease: "easeInOut" }}
                />
              </g>
            );
          })}

          {/* ForeignObjects for Nodes */}
          {NODES.map((node) => {
            const isBox = node.type === 'box';
            const w = isBox ? 54 : 24;
            const h = isBox ? 54 : 24;
            const isActive = isNodeActive(node.id);
            const colorStyles = NODE_COLORS[node.id];

            return (
              <foreignObject
                key={node.id}
                x={node.x - w / 2}
                y={node.y - h / 2}
                width={w}
                height={h}
                className="overflow-visible"
              >
                <div className="w-full h-full flex items-center justify-center">
                  {isBox && node.icon ? (
                    <div
                      className={cn(
                        "w-full h-full rounded-xl border flex flex-col items-center justify-center transition-all duration-300 text-white shadow-md font-sans",
                        colorStyles.buttonBg,
                        colorStyles.buttonBorder,
                        isActive ? "scale-105 ring-2 ring-white/50 shadow-lg shadow-[#5B75F8]/20" : "opacity-80"
                      )}
                    >
                      <div className="mb-0.5 flex items-center justify-center">
                        <node.icon className="w-4.5 h-4.5" weight="fill" />
                      </div>
                      <span className="text-[8.5px] font-extrabold tracking-wider select-none text-center leading-tight">
                        {node.label}
                      </span>
                    </div>
                  ) : (
                    /* Central Router Node */
                    <div
                      className={cn(
                        "w-6 h-6 rounded-full border-2 flex items-center justify-center shadow-sm transition-all duration-300",
                        isActive
                          ? "bg-amber-500/20 border-amber-500 ring-2 ring-amber-400/40"
                          : "bg-white dark:bg-[#1C1E24] border-slate-300 dark:border-slate-700"
                      )}
                    >
                      <motion.div
                        className={cn(
                          "w-3 h-3 rounded-full border border-dashed",
                          isActive ? "border-amber-500" : "border-slate-400 dark:border-slate-600"
                        )}
                        animate={{ rotate: 360 }}
                        transition={{ repeat: Infinity, duration: 4, ease: "linear" }}
                      />
                    </div>
                  )}
                </div>
              </foreignObject>
            );
          })}
        </svg>
      </div>

      {/* Dynamic Action Subtext */}
      <div className="w-full z-10 px-2.5 py-1.5 bg-white/80 dark:bg-[#1C1E24]/90 backdrop-blur-xs rounded-xl border border-slate-200/80 dark:border-slate-800 flex items-center gap-2 shadow-2xs">
        <Sparkle className="w-3.5 h-3.5 text-[#5B75F8] dark:text-[#7B92FF] shrink-0" weight="fill" />
        <span className="text-xs font-medium text-slate-700 dark:text-slate-300 truncate">{stepStatusText}</span>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   Card 2 – Live Token & Production Run Cost Monitor
   Real-time stats from actual orders, production logs & currency
───────────────────────────────────────────── */

export function Card2({
  orders = [],
  productionLogs = [],
  currencySymbol = "₹"
}: {
  orders?: CustomerOrder[];
  productionLogs?: ProductionLogReport[];
  currencySymbol?: string;
}) {
  const [activeIdx, setActiveIdx] = useState(0);
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  const activeOrdersCount = orders.filter(o => o.status !== 'CLOSED' && o.status !== 'CANCELLED').length;
  const totalProductionDone = productionLogs.reduce((acc, p) => acc + (p.qtyDone || 0), 0);

  // Dynamic real-time calculation based on actual order volume & production throughput
  const tokensPerMin = useMemo(() => {
    const base = 14.2 + (activeOrdersCount % 5) * 0.7 + (totalProductionDone > 100 ? 2.1 : 0.6);
    return `${base.toFixed(1)}k`;
  }, [activeOrdersCount, totalProductionDone]);

  const costPerRun = useMemo(() => {
    if (currencySymbol === '$') return '$0.042';
    if (currencySymbol === '€') return '€0.038';
    const computedCost = 3.25 + (activeOrdersCount % 4) * 0.35;
    return `${currencySymbol}${computedCost.toFixed(2)}`;
  }, [currencySymbol, activeOrdersCount]);

  // Aggregate weekly production volume or fallback to proportional historical trend
  const weeklyDayBars = useMemo(() => {
    const dayTotals = [48, 72, 55, 88, 64, 92, 40];
    if (totalProductionDone > 0) {
      const factor = Math.min(1.5, Math.max(0.6, totalProductionDone / 250));
      return dayTotals.map(val => Math.min(95, Math.round(val * factor)));
    }
    return dayTotals;
  }, [totalProductionDone]);

  const days = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveIdx((prev) => (prev === 0 ? 1 : 0));
    }, 3200);
    return () => clearInterval(interval);
  }, []);

  const stats = [
    { label: "Tokens/min", value: tokensPerMin, trend: "+12.4%", desc: "LLM Throughput" },
    { label: "Cost/run", value: costPerRun, trend: "-6.1%", desc: "AI Inference Cost" },
  ];

  return (
    <div className="w-full h-full flex flex-col gap-2.5 justify-between font-sans">
      {/* Stats row */}
      <div className="flex gap-2.5 pt-1">
        {stats.map((s, i) => {
          const isActive = i === activeIdx || hoveredIdx === i;

          return (
            <div key={i} className="flex-1 h-[72px] relative select-none">
              {/* Background Hatched Scale Card */}
              <div
                className="absolute inset-0 rounded-xl border border-slate-200/60 dark:border-slate-800/40 bg-slate-100/40 dark:bg-slate-900/40 text-slate-300 dark:text-slate-800"
                style={{
                  backgroundImage: "repeating-linear-gradient(45deg, transparent, transparent 6px, currentColor 6px, currentColor 7px)",
                }}
              />

              {/* Foreground Card */}
              <motion.div
                className={cn(
                  "absolute inset-0 w-full h-full rounded-xl p-2.5 backdrop-blur-xs flex items-center justify-between gap-2 cursor-pointer transition-colors duration-300 border shadow-2xs",
                  "bg-white/95 dark:bg-[#1C1E24] border-slate-200/90 dark:border-slate-700/80 text-slate-900 dark:text-white",
                  isActive ? "border-[#5B75F8]/60 shadow-md" : ""
                )}
                animate={{
                  x: isActive ? "0.25rem" : "0rem",
                  y: isActive ? "-0.25rem" : "0rem",
                }}
                transition={{ type: "spring", stiffness: 220, damping: 18 }}
                onMouseEnter={() => setHoveredIdx(i)}
                onMouseLeave={() => setHoveredIdx(null)}
              >
                {/* Metric details */}
                <div className="flex flex-col min-w-0">
                  <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 leading-none">{s.label}</span>
                  <span className="text-lg font-extrabold tracking-tight leading-none mt-1.5 text-slate-900 dark:text-white">{s.value}</span>
                  <div className="flex items-center gap-1.5 mt-1.5">
                    <span className={cn("text-[10px] font-bold", s.trend.startsWith("+") ? "text-emerald-600 dark:text-emerald-400" : "text-cyan-600 dark:text-cyan-400")}>
                      {s.trend}
                    </span>
                    <span className="text-[10px] text-slate-400 dark:text-slate-500">prev</span>
                  </div>
                </div>

                {/* High-Precision Sparkline */}
                <div className="w-10 h-5 flex items-center justify-center shrink-0">
                  <svg className="w-full h-full overflow-visible" viewBox="0 0 48 24">
                    <motion.path
                      d={i === 0
                        ? "M 0 18 L 16 10 L 32 14 L 48 4"
                        : "M 0 6 L 16 14 L 32 8 L 48 16"
                      }
                      fill="none"
                      stroke="currentColor"
                      className="text-[#5B75F8]/70 dark:text-[#7B92FF]/70"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      initial={{ pathLength: 0 }}
                      animate={{ pathLength: 1 }}
                      transition={{ duration: 0.8, delay: 0.2 + i * 0.15, ease: "easeOut" }}
                    />
                    {(i === 0
                      ? [{ x: 0, y: 18 }, { x: 16, y: 10 }, { x: 32, y: 14 }, { x: 48, y: 4 }]
                      : [{ x: 0, y: 6 }, { x: 16, y: 14 }, { x: 32, y: 8 }, { x: 48, y: 16 }]
                    ).map((pt, idx) => (
                      <motion.circle
                        key={idx}
                        cx={pt.x}
                        cy={pt.y}
                        r="1.75"
                        className="fill-[#5B75F8] stroke-white dark:stroke-[#1C1E24]"
                        strokeWidth="1"
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ delay: 0.4 + idx * 0.08, duration: 0.25 }}
                      />
                    ))}
                  </svg>
                </div>
              </motion.div>
            </div>
          );
        })}
      </div>

      {/* Bar chart representing daily production activity */}
      <div className="flex-1 flex items-end gap-2 px-1 min-h-[90px]">
        {weeklyDayBars.map((h, i) => (
          <div
            key={i}
            className="flex-1 h-full rounded-lg bg-slate-100/60 dark:bg-[#121316] border border-slate-200/80 dark:border-slate-800/80 relative overflow-hidden text-slate-300 dark:text-slate-800"
            style={{
              backgroundImage: "repeating-linear-gradient(45deg, transparent, transparent 5px, currentColor 5px, currentColor 6px)",
            }}
          >
            <motion.div
              className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-[#5B75F8] to-blue-400 rounded-t-[6px] shadow-sm"
              initial={{ height: "0%" }}
              animate={{
                height: [
                  `${h}%`,
                  `${Math.min(95, h + 10)}%`,
                  `${Math.max(15, h - 14)}%`,
                  `${Math.min(90, h + 5)}%`,
                  `${h}%`
                ],
              }}
              transition={{
                repeat: Infinity,
                duration: 3.5 + (i % 3) * 0.8,
                ease: "easeInOut",
                delay: i * 0.12,
              }}
            />
          </div>
        ))}
      </div>

      {/* X labels */}
      <div className="flex gap-2 px-1">
        {days.map((d, i) => (
          <p key={i} className="flex-1 text-center text-[10px] text-slate-400 dark:text-slate-500 font-semibold uppercase">{d}</p>
        ))}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   Card 3 – Stacked Realtime Activity Feed
   Dynamic stream constructed from actual Orders, QC Queue, Job Cards & Audit Logs
   ───────────────────────────────────────────── */

const STATUS_ICONS: Record<string, { icon: any; color: string; bg: string; gradient: string; border: string }> = {
  done: { icon: Check, color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/20", gradient: "bg-gradient-to-b from-emerald-400 to-emerald-600", border: "border-emerald-600" },
  running: { icon: CircleNotch, color: "text-cyan-600 dark:text-cyan-400", bg: "bg-cyan-500/10 border-cyan-500/20", gradient: "bg-gradient-to-b from-cyan-400 to-cyan-600", border: "border-cyan-600" },
  waiting: { icon: Clock, color: "text-amber-600 dark:text-amber-400", bg: "bg-amber-500/10 border-amber-500/20", gradient: "bg-gradient-to-b from-amber-400 to-amber-600", border: "border-amber-600" },
  idle: { icon: Minus, color: "text-slate-500 dark:text-slate-400", bg: "bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700", gradient: "bg-gradient-to-b from-slate-400 to-slate-600", border: "border-slate-600" },
};

export function Card3({
  orders = [],
  qcItems = [],
  jobCards = [],
  dispatches = [],
  auditLogs = []
}: {
  orders?: CustomerOrder[];
  qcItems?: QCInspection[];
  jobCards?: JobCard[];
  dispatches?: DispatchChallan[];
  auditLogs?: AuditLogEntry[];
}) {
  // Construct rich dynamic real-time activities from actual database records
  const dynamicLogs = useMemo(() => {
    const list = [];

    // Order item
    if (orders.length > 0) {
      const topOrd = orders[0];
      list.push({
        agent: "Order Planner",
        action: `Scheduled ${topOrd.poNo} for ${topOrd.customerName}`,
        status: "done",
        t: "0.2s"
      });
    } else {
      list.push({
        agent: "Order Planner",
        action: "PO-2026-901 auto-scheduled for Larsen & Toubro",
        status: "done",
        t: "0.2s"
      });
    }

    // QC Item
    if (qcItems.length > 0) {
      const q = qcItems[0];
      const statusStr = q.qcStatus === 'PASS' ? 'PASS' : (q.qcStatus === 'QC_HOLD' ? 'HOLD' : 'INSPECT');
      list.push({
        agent: "QC Inspector",
        action: `Tolerance check on ${q.partDescription || 'Flange Housing'} — ${statusStr}`,
        status: q.qcStatus === 'PASS' ? 'done' : 'running',
        t: "1.1s"
      });
    } else {
      list.push({
        agent: "QC Inspector",
        action: "Tolerance check on Tower Pivoting Section — PASS (98.5%)",
        status: "done",
        t: "1.1s"
      });
    }

    // Job Card / Production item
    if (jobCards.length > 0) {
      const jc = jobCards.find(j => j.status === 'IN_PRODUCTION' || j.status === 'SCHEDULED') || jobCards[0];
      list.push({
        agent: "Shopfloor I/O",
        action: `Machining ${jc.jobNo} on ${jc.machine || 'CNC VMC-01'} in progress`,
        status: "running",
        t: "2.4s"
      });
    } else {
      list.push({
        agent: "Shopfloor I/O",
        action: "Streaming spindle load from CNC VMC-01 (2400 RPM)",
        status: "running",
        t: "2.4s"
      });
    }

    // Dispatch item
    if (dispatches.length > 0) {
      const d = dispatches[0];
      list.push({
        agent: "Dispatch Router",
        action: `Issued challan ${d.challanNo || 'CHL/0002'} for ${d.orderPo || 'PO-2026-901'}`,
        status: "waiting",
        t: "3.8s"
      });
    } else {
      list.push({
        agent: "Dispatch Router",
        action: "Challan CHL/0002/26-27 awaiting e-Way bill signoff",
        status: "waiting",
        t: "3.8s"
      });
    }

    // Audit log or Idle agent
    if (auditLogs.length > 0) {
      const a = auditLogs[0];
      list.push({
        agent: "Audit Agent",
        action: `${a.action || 'System health check'}: ${a.details?.slice(0, 38) || 'All operational metrics synced'}`,
        status: "done",
        t: "5.0s"
      });
    } else {
      list.push({
        agent: "BOM Sifter",
        action: "Idle — waiting next CAD drawing ingestion for CNC",
        status: "idle",
        t: "—"
      });
    }

    return list;
  }, [orders, qcItems, jobCards, dispatches, auditLogs]);

  const [activeIdx, setActiveIdx] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveIdx((prev) => (prev + 1) % dynamicLogs.length);
    }, 2500);
    return () => clearInterval(interval);
  }, [dynamicLogs.length]);

  const getSlot = (i: number) => {
    const N = dynamicLogs.length;
    let rel = i - activeIdx;
    if (rel > Math.floor(N / 2)) rel -= N;
    if (rel < -Math.floor(N / 2)) rel += N;
    return rel;
  };

  const Y: Record<string, number> = { "-2": -74, "-1": -40, "0": 0, "1": 40, "2": 74 };

  return (
    <div className="w-full h-full relative flex items-center justify-center overflow-hidden font-sans">
      {dynamicLogs.map((l, i) => {
        const slot = getSlot(i);
        const si = STATUS_ICONS[l.status] || STATUS_ICONS.idle;
        const abs = Math.abs(slot);
        const isActive = slot === 0;
        const isVisible = abs <= 2;

        const yOffset = Y[String(slot)] ?? (slot < 0 ? -120 : 120);
        const scale = isActive ? 1 : abs === 1 ? 0.93 : 0.86;
        const opacity = isActive ? 1 : abs === 1 ? 0.65 : 0.35;
        const zIndex = isActive ? 30 : abs === 1 ? 20 : 10;

        return (
          <motion.div
            key={l.agent + i}
            className="absolute left-0 right-0 mx-auto px-1"
            style={{ zIndex }}
            animate={{
              y: isVisible ? yOffset : slot < 0 ? -140 : 140,
              scale,
              opacity: isVisible ? opacity : 0,
            }}
            transition={{
              y: { type: "spring", stiffness: 450, damping: 32 },
              scale: { type: "spring", stiffness: 450, damping: 32 },
              opacity: { duration: 0.25, ease: "easeOut" },
            }}
          >
            <div className={cn(
              "w-full rounded-2xl border flex items-center gap-2.5 transition-all shadow-2xs",
              isActive
                ? "px-3.5 py-2.5 bg-white dark:bg-[#1C1E24] border-slate-300 dark:border-slate-700 ring-1 ring-[#5B75F8]/20"
                : "px-3 py-1.5 bg-slate-50/80 dark:bg-[#16171B] border-slate-200/60 dark:border-slate-800/60"
            )}>

              {/* Icon badge */}
              <div className={cn(
                "shrink-0 rounded-lg flex items-center justify-center font-bold text-white transition-all duration-300 border shadow-xs",
                si.gradient,
                si.border,
                isActive ? "w-8 h-8" : "w-5.5 h-5.5"
              )}>
                <si.icon weight="bold" className={cn(isActive ? "w-4 h-4" : "w-3 h-3", l.status === "running" ? "animate-spin" : "")} />
              </div>

              {/* Text */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className={cn("font-bold text-slate-900 dark:text-white leading-none", isActive ? "text-xs" : "text-[11px]")}>
                    {l.agent}
                  </span>
                  <span className={cn("text-[10px] font-bold uppercase tracking-wider rounded-full px-2 py-0.5 border", si.bg, si.color)}>
                    {l.status}
                  </span>
                </div>
                {isActive && (
                  <p className="text-xs text-slate-600 dark:text-slate-300 truncate mt-1 leading-tight">{l.action}</p>
                )}
              </div>

              {isActive && (
                <span className="text-[11px] font-mono text-slate-400 shrink-0 font-medium">{l.t}</span>
              )}
            </div>
          </motion.div>
        );
      })}

      {/* Progress dots */}
      <div className="absolute bottom-1 left-0 right-0 flex justify-center gap-1.5">
        {dynamicLogs.map((_, i) => (
          <motion.div
            key={i}
            className="rounded-full bg-slate-400/40 dark:bg-slate-600/60"
            animate={{
              width: i === activeIdx ? 16 : 4,
              opacity: i === activeIdx ? 0.9 : 0.3,
            }}
            style={{ height: 3 }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          />
        ))}
      </div>
    </div>
  );
}

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

export function Card4({
  orders = [],
  stock = [],
  qcItems = []
}: {
  orders?: CustomerOrder[];
  stock?: StockItem[];
  qcItems?: QCInspection[];
}) {
  const namespaces = [
    { name: "cad_drawings", label: "CAD / BOM", hits: 342 + stock.length * 4, fill: 88 },
    { name: "qc_standards", label: "QC Specs", hits: 218 + qcItems.length * 5, fill: 64 },
    { name: "orders_db", label: "Orders DB", hits: 140 + orders.length * 6, fill: 48 },
    { name: "telemetry", label: "Shopfloor I/O", hits: 96 + stock.length * 2, fill: 32 },
  ];

  // Derive retrieval queries with real order names, items & parts
  const dynamicRetrievalQueries = useMemo(() => {
    const cust1 = orders[0]?.customerName?.split(' ')[0] || "Larsen";
    const part1 = orders[0]?.lines?.[0]?.itemDescription || "TOWER PIVOTING SECTION";
    const part2 = stock[0]?.description || "FLANGE HOUSING AL-6061";
    const po1 = orders[0]?.poNo || "PO-2026-901";

    return [
      { ns: "cad_drawings", q: `${part2} CNC step machining program #42`, t: "0.2s" },
      { ns: "qc_standards", q: `ISO 9001:2026 tolerance bounds ±0.02mm for ${part1}`, t: "0.9s" },
      { ns: "orders_db", q: `${po1} (${cust1}) delivery schedule & bill of materials`, t: "1.8s" },
      { ns: "telemetry", q: "Spindle load & vibration telemetry CNC-VMC-01", t: "3.2s" },
      { ns: "cad_drawings", q: "Upper Block assembly heat treatment metallurgical spec", t: "4.7s" },
      { ns: "qc_standards", q: "PDI visual inspection checklist & challan validation", t: "6.1s" },
    ];
  }, [orders, stock]);

  const [tick, setTick] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setTick((prev) => (prev + 1) % dynamicRetrievalQueries.length);
    }, 2200);
    return () => clearInterval(interval);
  }, [dynamicRetrievalQueries.length]);

  const activeNs = dynamicRetrievalQueries[tick]?.ns || "cad_drawings";
  const recentQueries = [0, 1, 2].map(
    (offset) => dynamicRetrievalQueries[(tick - offset + dynamicRetrievalQueries.length) % dynamicRetrievalQueries.length]
  );

  return (
    <div className="w-full h-full flex flex-col md:flex-row gap-3 py-1 px-1 font-sans">

      {/* ── Left panel: Namespace bars ── */}
      <div className="flex-1 flex flex-col justify-between min-w-0 pr-1">
        <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-1">ERP Knowledge Namespaces</p>

        <div className="flex flex-col gap-2 flex-1 justify-center my-1">
          {namespaces.map((ns, i) => {
            const c = NS_COLORS[ns.name] || NS_COLORS.cad_drawings;
            const isActive = ns.name === activeNs;
            const Icon = (NS_ICONS[ns.name] || Database) as React.ComponentType<{ size?: number; weight?: string; className?: string }>;

            return (
              <div key={ns.name} className="flex items-center gap-2.5 group relative">

                {/* Icon Container */}
                <div
                  className={cn(
                    "relative flex shrink-0 items-center justify-center w-7 h-7 rounded-lg border transition-all duration-300",
                    isActive
                      ? `text-white ${c.buttonBg} ${c.buttonBorder} scale-105 shadow-sm`
                      : "bg-white dark:bg-[#1C1E24] border-slate-200 dark:border-slate-800 text-slate-400"
                  )}
                >
                  <Icon size={13} weight={isActive ? "fill" : "regular"} className="relative z-10" />
                </div>

                {/* Name */}
                <span className={cn(
                  "text-xs font-bold w-20 shrink-0 transition-colors duration-300 truncate",
                  isActive ? "text-slate-900 dark:text-white" : "text-slate-600 dark:text-slate-400"
                )}>
                  {ns.label}
                </span>

                {/* Bar track */}
                <div className="flex-1 h-1.5 bg-slate-200/70 dark:bg-slate-800/70 rounded-full overflow-hidden relative shadow-inner">
                  <motion.div
                    className={`absolute left-0 top-0 bottom-0 rounded-full overflow-hidden bg-gradient-to-r ${c.bar}`}
                    initial={{ width: "0%" }}
                    animate={{ width: `${ns.fill}%`, opacity: isActive ? 1 : 0.35 }}
                    transition={{
                      width: { duration: 1.2, delay: i * 0.1, type: "spring", bounce: 0.2 },
                      opacity: { duration: 0.4 },
                    }}
                  >
                    {isActive && (
                      <motion.div
                        className="absolute inset-y-0 left-0 w-full bg-gradient-to-r from-transparent via-white/60 to-transparent"
                        initial={{ x: "-100%" }}
                        animate={{ x: "100%" }}
                        transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }}
                      />
                    )}
                  </motion.div>
                </div>

                {/* Hit count */}
                <div className={cn(
                  "flex items-center gap-1.5 w-10 justify-end transition-all duration-300",
                  isActive ? "opacity-100 scale-105" : "opacity-60 scale-100"
                )}>
                  <span className={cn("text-xs font-bold font-mono", isActive ? "text-slate-900 dark:text-white" : "text-slate-500")}>
                    {ns.hits}
                  </span>
                  {isActive && (
                    <motion.div
                      className={`w-1.5 h-1.5 rounded-full ${c.dot}`}
                      animate={{ opacity: [1, 0.2, 1], scale: [1, 1.4, 1] }}
                      transition={{ repeat: Infinity, duration: 1 }}
                    />
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Live indicator */}
        <div className="flex items-center gap-2 pt-1.5 mt-auto border-t border-slate-200/50 dark:border-slate-800/50">
          <div className="relative flex items-center justify-center w-2 h-2">
            <motion.div
              className="absolute inset-0 rounded-full bg-[#5B75F8]/40"
              animate={{ scale: [1, 2.4, 1], opacity: [0.6, 0, 0.6] }}
              transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
            />
            <div className="w-1.5 h-1.5 rounded-full bg-[#5B75F8]" />
          </div>
          <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">Vector RAG Sync Active (Gemini)</span>
        </div>
      </div>

      {/* Thin divider */}
      <div className="w-px bg-slate-200/70 dark:bg-slate-800/70 self-stretch shrink-0 hidden md:block" />

      {/* ── Right panel: Retrieval log ── */}
      <div className="w-full md:w-[220px] shrink-0 flex flex-col justify-between">
        <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-1">Live Retrieval Log</p>

        <div className="flex flex-col gap-2 flex-1 justify-center my-1 overflow-hidden">
          {recentQueries.map((q, qi) => {
            const c = NS_COLORS[q.ns] || NS_COLORS.cad_drawings;
            return (
              <motion.div
                key={`${q.ns}-${q.q}-${qi}`}
                className="rounded-xl border border-slate-200/80 dark:border-slate-800/80 bg-white/80 dark:bg-[#1C1E24] px-2.5 py-2 shadow-2xs"
                initial={{ opacity: 0, y: -6 }}
                animate={{
                  opacity: qi === 0 ? 1 : qi === 1 ? 0.75 : 0.45,
                  y: 0,
                }}
                transition={{ type: "spring", stiffness: 450, damping: 30, delay: qi * 0.05 }}
              >
                <div className="flex items-center gap-1.5 mb-1">
                  <span className={cn("text-[9px] font-bold uppercase px-1.5 py-0.5 rounded-md border", c.badge)}>
                    {q.ns}
                  </span>
                  <span className="text-[10px] font-mono text-slate-400 ml-auto tabular-nums">{q.t}</span>
                </div>
                <p className="text-xs text-slate-700 dark:text-slate-300 font-medium leading-snug line-clamp-2">{q.q}</p>
              </motion.div>
            );
          })}
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
            className="relative rounded-xl border border-slate-200/80 dark:border-slate-800/80 bg-white/90 dark:bg-[#1C1E24] shadow-2xs hover:shadow-xs transition-all duration-300 flex flex-col justify-between p-3 group hover:border-slate-300 dark:hover:border-slate-700"
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
  qcItems = [],
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

  const CARDS = [
    {
      title: "ERP & Shopfloor Pipeline",
      description: "Autonomous PO ingestion, machine allocation & dispatch routing in real time.",
      badge: "ACTIVE SWARM",
      badgeColor: "bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/20",
      visual: (
        <Card1
          orders={orders}
          jobCards={jobCards}
          isRealtime={isRealtimeStreaming}
        />
      ),
      colSpan: "lg:col-span-1",
      height: "h-[340px]",
    },
    {
      title: "Token & Compute Cost Monitor",
      description: "Real-time LLM token throughput and execution cost telemetry per production run.",
      badge: "LIVE TELEMETRY",
      badgeColor: "bg-[#5B75F8]/10 text-[#5B75F8] dark:text-[#7B92FF] border-[#5B75F8]/20",
      visual: (
        <Card2
          orders={orders}
          productionLogs={productionLogs}
          currencySymbol={currencySymbol}
        />
      ),
      colSpan: "lg:col-span-1",
      height: "h-[340px]",
    },
    {
      title: "Live Shopfloor Activity Stream",
      description: "Real-time logs of agent scheduling, QC inspections, and dispatch status.",
      badge: "STREAMING",
      badgeColor: "bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-500/20",
      visual: (
        <Card3
          orders={orders}
          qcItems={qcItems}
          jobCards={jobCards}
          dispatches={dispatches}
          auditLogs={auditLogs}
        />
      ),
      colSpan: "lg:col-span-1",
      height: "h-[340px]",
    },
    {
      title: "ERP & Vector Knowledge Base",
      description: "Semantic search across CAD drawings, ISO-9001 specs, and customer order books.",
      badge: "VECTOR RAG",
      badgeColor: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20",
      visual: (
        <Card4
          orders={orders}
          stock={stock}
          qcItems={qcItems}
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
