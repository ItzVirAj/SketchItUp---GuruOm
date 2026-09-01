import React, { useState } from 'react';
import { motion } from 'motion/react';
import { XCircle, CheckCircle2, AlertOctagon, Sparkles, ArrowRight } from 'lucide-react';

export const BeforeAfter: React.FC = () => {
  const [viewMode, setViewMode] = useState<'sideBySide' | 'before' | 'after'>('sideBySide');

  const comparisons = [
    {
      topic: 'Operational Visibility',
      before: 'Chasing staff via phone & WhatsApp for manual status updates; 15-day delayed Excel reports.',
      after: 'Single-screen Executive Command Center with live shop-floor, order & financial feeds.'
    },
    {
      topic: 'Order & Margin Control',
      before: 'Orders entered on paper; unverified credit lines leading to overdue receivables & thin margins.',
      after: 'Automated credit limit gatekeeper & margin floor rules prior to production release.'
    },
    {
      topic: 'Inventory & Raw Materials',
      before: 'Frequent sudden stockouts halting production; capital tied up in slow-moving inventory.',
      after: 'Multi-warehouse bin level tracking with automated reorder alerts & QR code issue logs.'
    },
    {
      topic: 'Shop Floor & Equipment',
      before: 'Unplanned machine breakdowns; untracked scrap material; unclear job priorities.',
      after: '32% higher OEE, preventive maintenance schedules, and shop-floor operator tablet kiosks.'
    },
    {
      topic: 'Financial P&L & Cash Flow',
      before: 'Waiting 2 weeks after month-end for accounting close; unexpected cash flow shortages.',
      after: 'Real-time double-entry ledger hooks with daily cash flow forecast & 4-hour month-end close.'
    },
    {
      topic: 'Owner Reliance & Scale',
      before: 'Owner trapped in daily micro-management fire-fighting; inability to delegate safely.',
      after: 'Rule-based approval workflows enabling confident delegation and remote management.'
    }
  ];

  return (
    <div className="w-full bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 space-y-6 font-sans">
      
      {/* Header & Mode Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <span className="text-[10px] font-mono font-bold text-teal-400 uppercase tracking-wider bg-teal-500/10 px-2.5 py-1 rounded border border-teal-500/30">
            BUSINESS TRANSFORMATION
          </span>
          <h3 className="text-xl font-extrabold text-white mt-1">Before vs After Owner OS</h3>
        </div>

        <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800">
          <button
            onClick={() => setViewMode('sideBySide')}
            className={`px-3 py-1.5 text-xs font-semibold rounded transition-ui ${
              viewMode === 'sideBySide' ? 'bg-teal-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'
            }`}
          >
            Side-by-Side
          </button>
          <button
            onClick={() => setViewMode('before')}
            className={`px-3 py-1.5 text-xs font-semibold rounded transition-ui ${
              viewMode === 'before' ? 'bg-rose-500 text-white font-bold' : 'text-slate-400 hover:text-white'
            }`}
          >
            Before Only
          </button>
          <button
            onClick={() => setViewMode('after')}
            className={`px-3 py-1.5 text-xs font-semibold rounded transition-ui ${
              viewMode === 'after' ? 'bg-emerald-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'
            }`}
          >
            After Only
          </button>
        </div>
      </div>

      {/* Comparisons Grid */}
      <div className="space-y-4">
        {comparisons.map((item, idx) => (
          <div key={idx} className="bg-slate-950 rounded-xl border border-slate-800 p-4 space-y-3">
            <h4 className="text-xs font-extrabold uppercase text-teal-400 tracking-wider flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-teal-400" />
              {item.topic}
            </h4>

            <div className={`grid gap-4 ${viewMode === 'sideBySide' ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-1'}`}>
              
              {/* BEFORE CARD */}
              {(viewMode === 'sideBySide' || viewMode === 'before') && (
                <div className="p-3.5 rounded-lg bg-rose-950/20 border border-rose-500/30 space-y-1.5">
                  <div className="flex items-center gap-2 text-rose-400 font-bold text-xs uppercase tracking-wider">
                    <XCircle className="w-4 h-4 shrink-0" />
                    <span>Without Owner OS (Fragmented)</span>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">{item.before}</p>
                </div>
              )}

              {/* AFTER CARD */}
              {(viewMode === 'sideBySide' || viewMode === 'after') && (
                <div className="p-3.5 rounded-lg bg-emerald-950/20 border border-emerald-500/30 space-y-1.5">
                  <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs uppercase tracking-wider">
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    <span>With SketchItUp Owner OS</span>
                  </div>
                  <p className="text-xs text-slate-200 font-medium leading-relaxed">{item.after}</p>
                </div>
              )}

            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
