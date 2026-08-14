import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Cable, Database, Activity, Sparkles, Zap, ArrowRight, CheckCircle2 } from 'lucide-react';

export const WorkflowSteps: React.FC = () => {
  const [activeStep, setActiveStep] = useState<number>(1);

  const steps = [
    {
      step: 1,
      title: 'Connect Business Processes',
      icon: Cable,
      summary: 'Plug in orders, inventory, factory floor, accounting, and workforce.',
      detail: 'Our 14-day rapid deployment integrates direct inputs from web sales, Tally accounting, biometric devices, handheld barcode scanners, and shop-floor operator kiosks.',
      kpi: '100% Process Digitalization'
    },
    {
      step: 2,
      title: 'Centralize Real-Time Data',
      icon: Database,
      summary: 'Data streams flow into a single unified double-entry ledger.',
      detail: 'Eliminate departmental silos. Every physical event on the shop floor or warehouse immediately updates financial ledgers, inventory counts, and order status.',
      kpi: '< 1 second Data Latency'
    },
    {
      step: 3,
      title: 'Monitor Live Operations',
      icon: Activity,
      summary: 'Executive Command Center renders high-density real-time feeds.',
      detail: 'Business owners and plant managers gain a 360-degree digital twin of the business — tracking revenue, orders, machine OEE, cash flow, and bottlenecks on a single screen.',
      kpi: 'Single-Screen Visibility'
    },
    {
      step: 4,
      title: 'Receive Actionable AI Insights',
      icon: Sparkles,
      summary: 'AI Copilot detects rate spikes, vibration anomalies, and credit risks.',
      detail: 'Instead of drowning in static dashboards, management receives contextual alerts with projected cost impacts and recommended corrective actions.',
      kpi: '$84,000 Avg Annual Leakage Saved'
    },
    {
      step: 5,
      title: 'Execute Faster Decisions',
      icon: Zap,
      summary: 'Approve actions with one click via desktop or WhatsApp.',
      detail: 'Rule-based delegation workflows allow management to sign off on POs, credit limit overrides, and maintenance requests in seconds from anywhere in the world.',
      kpi: '5-Minute Decision Latency'
    }
  ];

  return (
    <div className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-6 sm:p-8 space-y-8 font-sans">
      
      <div className="text-center max-w-2xl mx-auto space-y-2">
        <span className="text-[10px] font-mono font-bold text-teal-400 uppercase tracking-wider bg-teal-500/10 px-3 py-1 rounded border border-teal-500/30">
          OPERATIONAL METHODOLOGY
        </span>
        <h3 className="text-xl sm:text-2xl font-extrabold text-white">How Owner OS Operates</h3>
        <p className="text-xs sm:text-sm text-slate-400">
          A continuous 5-step loop transforming fragmented operational events into strategic enterprise growth.
        </p>
      </div>

      {/* Steps Pipeline Buttons Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
        {steps.map((s) => {
          const Icon = s.icon;
          const isActive = s.step === activeStep;
          return (
            <button
              key={s.step}
              onClick={() => setActiveStep(s.step)}
              className={`p-3 rounded-xl border text-left transition-all cursor-pointer relative ${
                isActive
                  ? 'bg-slate-900 border-teal-400 shadow-lg ring-1 ring-teal-400/50'
                  : 'bg-slate-900/40 border-slate-800 hover:border-slate-700'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded ${
                  isActive ? 'bg-teal-500 text-slate-950' : 'bg-slate-800 text-slate-400'
                }`}>
                  0{s.step}
                </span>
                <Icon className={`w-4 h-4 ${isActive ? 'text-teal-400' : 'text-slate-500'}`} />
              </div>
              <div className="text-xs font-bold text-white line-clamp-1">{s.title}</div>
            </button>
          );
        })}
      </div>

      {/* Active Step Content Box */}
      <motion.div
        key={activeStep}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="p-6 rounded-xl bg-slate-900 border border-slate-800 grid grid-cols-1 md:grid-cols-3 gap-6 items-center"
      >
        <div className="md:col-span-2 space-y-3">
          <div className="flex items-center gap-2 text-teal-400 font-bold text-sm">
            <CheckCircle2 className="w-5 h-5" />
            <span>Step {steps[activeStep - 1].step}: {steps[activeStep - 1].title}</span>
          </div>
          <p className="text-sm text-slate-200 font-medium leading-relaxed">
            {steps[activeStep - 1].summary}
          </p>
          <p className="text-xs text-slate-400 leading-relaxed">
            {steps[activeStep - 1].detail}
          </p>
        </div>

        <div className="p-4 rounded-lg bg-slate-950 border border-teal-500/30 text-center space-y-1">
          <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">MEASURABLE OUTCOME</span>
          <div className="text-lg font-extrabold text-teal-400">{steps[activeStep - 1].kpi}</div>
        </div>
      </motion.div>

    </div>
  );
};
