import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ShoppingCart, 
  Package, 
  Factory, 
  Truck, 
  CreditCard, 
  Users, 
  ShieldCheck, 
  CheckSquare, 
  Sparkles, 
  Cpu, 
  ArrowRight,
  Activity
} from 'lucide-react';
import { analytics } from '../../lib/analytics';

interface NodeItem {
  id: string;
  label: string;
  icon: React.ElementType;
  description: string;
  dataFlowText: string;
  connectedSlugs: string[];
  color: string;
}

export const HubAndSpokeVisual: React.FC = () => {
  const [activeNodeId, setActiveNodeId] = useState<string>('orders');

  const nodes: NodeItem[] = [
    {
      id: 'orders',
      label: 'Orders',
      icon: ShoppingCart,
      description: 'Multi-channel customer demand & margin gatekeeper.',
      dataFlowText: 'Confirmed order triggers credit check, reserves BOM stock in Inventory, and releases Work Order to Production.',
      connectedSlugs: ['inventory', 'production', 'finance'],
      color: 'from-sky-500 to-teal-600'
    },
    {
      id: 'inventory',
      label: 'Inventory',
      icon: Package,
      description: 'Multi-warehouse stock, bin control, and reorder triggers.',
      dataFlowText: 'Stock deduction triggers automated Purchase Requisition to Procurement when reorder safety threshold is breached.',
      connectedSlugs: ['procurement', 'production', 'quality'],
      color: 'from-emerald-500 to-teal-600'
    },
    {
      id: 'production',
      label: 'Production',
      icon: Factory,
      description: 'Shop floor work orders, machine OEE, and scrap tracking.',
      dataFlowText: 'Finished work orders trigger Quality inspection gate and update worker piece-rate incentives in HR & Payroll.',
      connectedSlugs: ['quality', 'hr', 'dispatch'],
      color: 'from-indigo-500 to-purple-600'
    },
    {
      id: 'procurement',
      label: 'Procurement',
      icon: Truck,
      description: 'Vendor RFQs, PO approvals, and 3-way matching.',
      dataFlowText: 'Approved PO matched with Goods Receipt Note (GRN) in warehouse and automatically posts to Accounts Payable.',
      connectedSlugs: ['inventory', 'finance'],
      color: 'from-amber-500 to-orange-600'
    },
    {
      id: 'finance',
      label: 'Finance',
      icon: CreditCard,
      description: 'Real-time general ledger, AR/AP aging, and cash flow.',
      dataFlowText: 'Live operational transactions post instantly to cash flow forecast and executive P&L ledgers.',
      connectedSlugs: ['orders', 'procurement', 'ai'],
      color: 'from-teal-500 to-emerald-600'
    },
    {
      id: 'hr',
      label: 'HR & Payroll',
      icon: Users,
      description: 'Biometric attendance, shift rosters, and automated payroll.',
      dataFlowText: 'Biometric attendance and shop-floor output logs feed directly into error-free monthly payroll runs.',
      connectedSlugs: ['production', 'finance'],
      color: 'from-pink-500 to-rose-600'
    },
    {
      id: 'quality',
      label: 'Quality (QC)',
      icon: ShieldCheck,
      description: 'Incoming & in-process inspection checklists and NCRs.',
      dataFlowText: 'Passed QC releases goods to Dispatch; failed QC locks batch and generates CAPA task for manager sign-off.',
      connectedSlugs: ['production', 'dispatch', 'tasks'],
      color: 'from-cyan-500 to-teal-600'
    },
    {
      id: 'dispatch',
      label: 'Dispatch',
      icon: Truck,
      description: 'Vehicle loading, e-Way bills, and digital POD capture.',
      dataFlowText: 'Digital Proof of Delivery (POD) signature triggers invoice dispatch and updates customer AR ledger.',
      connectedSlugs: ['orders', 'finance'],
      color: 'from-violet-500 to-purple-600'
    }
  ];

  const activeNode = nodes.find((n) => n.id === activeNodeId) || nodes[0];

  return (
    <div className="w-full bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 relative overflow-hidden font-sans">
      {/* Glow background */}
      <div className="absolute inset-0 bg-radial-gradient opacity-50 pointer-events-none" />

      <div className="text-center max-w-2xl mx-auto mb-8 relative z-10">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-teal-500/10 text-teal-400 border border-teal-500/30 mb-3">
          <Sparkles className="w-3.5 h-3.5" />
          INTERACTIVE ARCHITECTURE
        </div>
        <h3 className="text-xl sm:text-2xl font-extrabold text-white">
          The Hub-and-Spoke Operating Architecture
        </h3>
        <p className="text-xs sm:text-sm text-slate-400 mt-2">
          Click any operational node to see how Owner OS synchronizes real-time data flows across your enterprise.
        </p>
      </div>

      {/* Hub & Spoke Display Container */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center relative z-10">
        
        {/* Interactive Spoke Nodes Grid (Left/Top 7 cols) */}
        <div className="lg:col-span-7 grid grid-cols-2 sm:grid-cols-4 gap-3">
          {nodes.map((node) => {
            const Icon = node.icon;
            const isActive = node.id === activeNodeId;
            return (
              <motion.button
                key={node.id}
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.96 }}
                onClick={() => {
                  setActiveNodeId(node.id);
                  analytics.trackEvent('hub_node_click', { nodeId: node.id });
                }}
                className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer relative ${
                  isActive
                    ? 'bg-slate-950 border-teal-400 shadow-lg shadow-teal-500/20 ring-1 ring-teal-400'
                    : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                }`}
              >
                {isActive && (
                  <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-teal-400 animate-ping" />
                )}
                <div className={`p-2 rounded-lg bg-gradient-to-br ${node.color} text-slate-950 inline-block mb-2 shadow`}>
                  <Icon className="w-4 h-4" />
                </div>
                <div className="text-xs font-bold text-white">{node.label}</div>
                <div className="text-[10px] text-slate-400 line-clamp-1 mt-0.5">{node.description}</div>
              </motion.button>
            );
          })}
        </div>

        {/* Center Hub State & Active Data Flow Inspector (Right 5 cols) */}
        <div className="lg:col-span-5 bg-slate-950 border border-slate-800 rounded-xl p-5 sm:p-6 space-y-4 shadow-xl">
          
          <div className="flex items-center gap-3 border-b border-slate-800 pb-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-sky-500 to-teal-500 p-0.5 shadow-lg shadow-sky-500/20 shrink-0">
              <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center">
                <Cpu className="w-6 h-6 text-teal-400 animate-pulse" />
              </div>
            </div>
            <div>
              <span className="text-[10px] font-mono font-bold text-teal-400 uppercase tracking-wider">CENTER HUB</span>
              <h4 className="text-base font-extrabold text-white">SketchItUp Owner OS Core</h4>
              <p className="text-[11px] text-slate-400">Automated event bus & unified ledger</p>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold text-teal-300">
              <Activity className="w-4 h-4 text-teal-400" />
              <span>Active Data Flow: {activeNode.label} Node</span>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed bg-slate-900 p-3.5 rounded-lg border border-slate-800/80">
              "{activeNode.dataFlowText}"
            </p>

            <div className="pt-2">
              <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block mb-2">
                CONNECTED REAL-TIME MODULES
              </span>
              <div className="flex flex-wrap gap-2">
                {activeNode.connectedSlugs.map((slug) => (
                  <span
                    key={slug}
                    className="px-2.5 py-1 rounded bg-teal-500/10 text-teal-300 border border-teal-500/30 text-[11px] font-mono capitalize"
                  >
                    ● {slug}
                  </span>
                ))}
              </div>
            </div>
          </div>

          <div className="pt-2 text-[11px] text-slate-400 flex items-center justify-between border-t border-slate-800">
            <span>Latency: &lt; 1ms internal event bus</span>
            <span className="text-emerald-400 font-semibold">100% Data Sync</span>
          </div>

        </div>

      </div>
    </div>
  );
};
