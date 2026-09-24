import React, { useState } from 'react';
import { motion } from 'motion/react';
import { 
  Database, 
  Cpu, 
  Sparkles, 
  LayoutDashboard, 
  CheckCircle2, 
  ArrowDown, 
  Server, 
  Smartphone, 
  ShieldCheck, 
  Layers
} from 'lucide-react';

export const ArchitectureDiagram: React.FC = () => {
  const [activeLayer, setActiveLayer] = useState<number>(4);

  const layers = [
    {
      num: 4,
      title: 'Layer 4: Executive Command Center & Access Points',
      icon: LayoutDashboard,
      color: 'border-teal-500 bg-teal-500/10 text-teal-300',
      desc: 'Single-screen executive control panel, mobile operator kiosks, manager WhatsApp alerts, and desktop BI exports.',
      components: ['Owner Command Dashboard', 'Shop-Floor Tablet App', 'WhatsApp Nudge Bot', 'Executive Mobile Web']
    },
    {
      num: 3,
      title: 'Layer 3: AI Business Copilot & Anomaly Engine',
      icon: Sparkles,
      color: 'border-amber-500 bg-amber-500/10 text-amber-300',
      desc: 'Continuous real-time anomaly scanning, rate-spike detection, natural language query processing, and automated narrative summaries.',
      components: ['Gemini 2.5 API Bridge', 'Leakage & Fraud Scanner', 'Predictive Margin Guard', 'Weekly Digest Writer']
    },
    {
      num: 2,
      title: 'Layer 2: Core Operating Engine & Rule Books',
      icon: Cpu,
      color: 'border-sky-500 bg-sky-500/10 text-sky-300',
      desc: 'Enforces business rules, multi-tier approvals, credit line gates, BOM explosion, machine OEE, and 3-way invoice matching.',
      components: ['BOM & Inventory Engine', 'Credit Gatekeeper', 'OEE & Downtime Tracker', 'Double-Entry Ledger']
    },
    {
      num: 1,
      title: 'Layer 1: Data Integration & Device Ingestion',
      icon: Database,
      color: 'border-slate-700 bg-slate-900 text-slate-300',
      desc: 'Multi-channel ingestion from Web Portals, Handheld Barcode Scanners, IoT Sensors, Biometric Terminals, and Tally Sync.',
      components: ['Tally & ERP Direct Sync', 'Biometric Attendance Sync', 'IoT Sensor Gateways', 'REST & Webhook APIs']
    }
  ];

  return (
    <div className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-6 sm:p-8 space-y-6 font-sans shadow-2xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <span className="text-[10px] font-mono font-bold uppercase text-teal-400 bg-teal-500/10 px-2.5 py-1 rounded border border-teal-500/30">
            ENTERPRISE ARCHITECTURE
          </span>
          <h3 className="text-xl font-extrabold text-white mt-1">4-Layer Stack of SketchItUp Owner OS</h3>
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <ShieldCheck className="w-4 h-4 text-teal-400" />
          <span>Tenant Isolated & AES-256 Encrypted</span>
        </div>
      </div>

      <p className="text-xs sm:text-sm text-slate-300">
        Click any architectural layer to inspect its underlying software engines, security boundaries, and data pipelines.
      </p>

      {/* Layers Stack */}
      <div className="space-y-3">
        {layers.map((layer) => {
          const Icon = layer.icon;
          const isActive = layer.num === activeLayer;

          return (
            <motion.div
              key={layer.num}
              onClick={() => setActiveLayer(layer.num)}
              className={`p-4 sm:p-5 rounded-xl border transition-ui cursor-pointer ${
                isActive
                  ? 'bg-slate-900 border-teal-400 shadow-xl ring-1 ring-teal-400/50'
                  : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className={`p-2.5 rounded-lg border ${layer.color} shrink-0`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white">{layer.title}</h4>
                    <p className="text-xs text-slate-400 mt-0.5">{layer.desc}</p>
                  </div>
                </div>

                <span className={`text-xs font-mono px-2 py-1 rounded border ${
                  isActive ? 'bg-teal-500 text-slate-950 font-bold border-teal-400' : 'bg-slate-950 text-slate-400 border-slate-800'
                }`}>
                  Layer 0{layer.num}
                </span>
              </div>

              {/* Expanded Sub-components Grid */}
              {isActive && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="mt-4 pt-4 border-t border-slate-800 grid grid-cols-2 sm:grid-cols-4 gap-2"
                >
                  {layer.components.map((comp, idx) => (
                    <div
                      key={idx}
                      className="p-2 rounded bg-slate-950 border border-slate-800 text-[11px] font-mono text-teal-300 flex items-center gap-1.5"
                    >
                      <CheckCircle2 className="w-3 h-3 text-teal-400 shrink-0" />
                      <span className="truncate">{comp}</span>
                    </div>
                  ))}
                </motion.div>
              )}
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};
