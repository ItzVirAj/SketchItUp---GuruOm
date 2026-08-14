import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  TrendingUp, 
  ShoppingCart, 
  Factory, 
  Package, 
  DollarSign, 
  AlertTriangle, 
  Sparkles, 
  Activity, 
  Clock, 
  CheckCircle2, 
  Users,
  ChevronRight,
  RefreshCw,
  ShieldAlert,
  ArrowUpRight
} from 'lucide-react';
import { analytics } from '../../lib/analytics';

export const DashboardMockup: React.FC = () => {
  const [timeframe, setTimeframe] = useState<'live' | 'today' | 'week' | 'month'>('today');
  const [selectedAlert, setSelectedAlert] = useState<number | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = () => {
    setIsRefreshing(true);
    analytics.trackEvent('dashboard_mockup_refresh');
    setTimeout(() => setIsRefreshing(false), 800);
  };

  const timeframeData = {
    live: {
      revenue: '$142,850',
      orders: '28 Active',
      productionOee: '86.4%',
      inventoryHealth: '99.1%',
      cashFlow: '+$48,200',
      alertsCount: '2 Action Needed'
    },
    today: {
      revenue: '$284,500',
      orders: '42 Orders',
      productionOee: '84.8%',
      inventoryHealth: '98.6%',
      cashFlow: '+$92,400',
      alertsCount: '3 Action Needed'
    },
    week: {
      revenue: '$1,420,000',
      orders: '218 Orders',
      productionOee: '85.2%',
      inventoryHealth: '99.4%',
      cashFlow: '+$410,000',
      alertsCount: '1 Action Needed'
    },
    month: {
      revenue: '$5,890,000',
      orders: '890 Orders',
      productionOee: '86.1%',
      inventoryHealth: '99.2%',
      cashFlow: '+$1,680,000',
      alertsCount: '0 Action Needed'
    }
  };

  const activeData = timeframeData[timeframe];

  const alerts = [
    {
      id: 1,
      type: 'warning',
      module: 'Machine Maintenance',
      title: 'CNC Mill #3 Vibration Anomaly Detected',
      desc: 'Vibration pattern indicates bearing wear. Schedule preventive check before 4:00 PM shift to avoid $14,000 line downtime.',
      action: 'Approve Preventive Inspection'
    },
    {
      id: 2,
      type: 'opportunity',
      module: 'AI Copilot & Finance',
      title: 'Aluminum Ingot Rate Spike Alert',
      desc: 'Supplier B rate is $2,180/ton vs Market $2,340. Lock order now to save $12,400 on upcoming batch #804.',
      action: 'Trigger PO Lock'
    },
    {
      id: 3,
      type: 'info',
      module: 'Order Management',
      title: 'Customer Credit Line Approaching Threshold',
      desc: 'Apex Components reached 92% of credit limit. Next order requires executive margin review.',
      action: 'View Account Details'
    }
  ];

  return (
    <div className="w-full bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden font-sans">
      
      {/* Top Header Bar */}
      <div className="bg-slate-950 px-4 sm:px-6 py-3.5 border-b border-slate-800 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-red-500/80 inline-block" />
            <span className="w-3 h-3 rounded-full bg-amber-500/80 inline-block" />
            <span className="w-3 h-3 rounded-full bg-emerald-500/80 inline-block" />
          </div>
          <span className="text-xs font-mono font-semibold text-slate-400 pl-2 border-l border-slate-800">
            SketchItUp Owner OS — Executive Command Center
          </span>
        </div>

        {/* Timeframe Toggles */}
        <div className="flex items-center gap-2 bg-slate-900 p-1 rounded-lg border border-slate-800">
          {(['live', 'today', 'week', 'month'] as const).map((t) => (
            <button
              key={t}
              onClick={() => {
                setTimeframe(t);
                analytics.trackEvent('dashboard_timeframe_change', { timeframe: t });
              }}
              className={`px-3 py-1 text-xs font-semibold rounded-md transition-all uppercase cursor-pointer ${
                timeframe === t
                  ? 'bg-teal-500 text-slate-950 shadow-md font-bold'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              {t === 'live' ? '● Live' : t}
            </button>
          ))}
          <button
            onClick={handleRefresh}
            className="p-1 rounded text-slate-400 hover:text-teal-400 transition-colors ml-1"
            title="Refresh Live Data Feed"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-teal-400' : ''}`} />
          </button>
        </div>
      </div>

      {/* Main Command Dashboard Layout */}
      <div className="p-4 sm:p-6 space-y-6">
        
        {/* Top KPI Metrics Row */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          
          <div className="bg-slate-950/80 p-3.5 rounded-xl border border-slate-800 hover:border-teal-500/30 transition-all">
            <div className="flex items-center justify-between text-slate-400 text-[11px] font-medium">
              <span>Gross Revenue</span>
              <DollarSign className="w-3.5 h-3.5 text-teal-400" />
            </div>
            <div className="text-lg sm:text-xl font-bold text-white mt-1">{activeData.revenue}</div>
            <div className="text-[10px] text-emerald-400 font-medium flex items-center gap-0.5 mt-1">
              <TrendingUp className="w-3 h-3" /> +14.2% vs prev
            </div>
          </div>

          <div className="bg-slate-950/80 p-3.5 rounded-xl border border-slate-800 hover:border-teal-500/30 transition-all">
            <div className="flex items-center justify-between text-slate-400 text-[11px] font-medium">
              <span>Active Orders</span>
              <ShoppingCart className="w-3.5 h-3.5 text-sky-400" />
            </div>
            <div className="text-lg sm:text-xl font-bold text-white mt-1">{activeData.orders}</div>
            <div className="text-[10px] text-sky-400 font-medium flex items-center gap-0.5 mt-1">
              <CheckCircle2 className="w-3 h-3" /> 98.4% on-time
            </div>
          </div>

          <div className="bg-slate-950/80 p-3.5 rounded-xl border border-slate-800 hover:border-teal-500/30 transition-all">
            <div className="flex items-center justify-between text-slate-400 text-[11px] font-medium">
              <span>Plant OEE</span>
              <Factory className="w-3.5 h-3.5 text-emerald-400" />
            </div>
            <div className="text-lg sm:text-xl font-bold text-white mt-1">{activeData.productionOee}</div>
            <div className="text-[10px] text-emerald-400 font-medium flex items-center gap-0.5 mt-1">
              <Activity className="w-3 h-3" /> 12 Lines Active
            </div>
          </div>

          <div className="bg-slate-950/80 p-3.5 rounded-xl border border-slate-800 hover:border-teal-500/30 transition-all">
            <div className="flex items-center justify-between text-slate-400 text-[11px] font-medium">
              <span>Stock Accuracy</span>
              <Package className="w-3.5 h-3.5 text-amber-400" />
            </div>
            <div className="text-lg sm:text-xl font-bold text-white mt-1">{activeData.inventoryHealth}</div>
            <div className="text-[10px] text-slate-400 font-medium flex items-center gap-0.5 mt-1">
              3 Warehouses
            </div>
          </div>

          <div className="bg-slate-950/80 p-3.5 rounded-xl border border-slate-800 hover:border-teal-500/30 transition-all">
            <div className="flex items-center justify-between text-slate-400 text-[11px] font-medium">
              <span>Net Cash Flow</span>
              <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
            </div>
            <div className="text-lg sm:text-xl font-bold text-emerald-400 mt-1">{activeData.cashFlow}</div>
            <div className="text-[10px] text-slate-400 font-medium flex items-center gap-0.5 mt-1">
              AR Overdue: $12k
            </div>
          </div>

          <div className="bg-slate-950/80 p-3.5 rounded-xl border border-amber-500/30 bg-amber-500/5 transition-all">
            <div className="flex items-center justify-between text-amber-400 text-[11px] font-medium">
              <span>AI Anomaly Stream</span>
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            </div>
            <div className="text-lg sm:text-xl font-bold text-amber-400 mt-1">{activeData.alertsCount}</div>
            <div className="text-[10px] text-amber-300 font-medium flex items-center gap-0.5 mt-1">
              Tap below to review
            </div>
          </div>

        </div>

        {/* Middle Section: Real-Time Anomaly Stream & Active Production Lines */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* AI Anomaly & Action Stream (2 cols) */}
          <div className="lg:col-span-2 bg-slate-950 p-4 sm:p-5 rounded-xl border border-slate-800 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/30">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider">AI Anomaly & Recommendation Feed</h4>
                  <p className="text-[11px] text-slate-400">Proactive operational guidance generated from live data</p>
                </div>
              </div>
              <span className="text-[10px] font-mono text-teal-400 bg-teal-500/10 px-2 py-0.5 rounded border border-teal-500/30">
                LIVE GEMINI MODEL
              </span>
            </div>

            <div className="space-y-3">
              {alerts.map((alert, idx) => (
                <motion.div
                  key={alert.id}
                  onClick={() => {
                    setSelectedAlert(selectedAlert === alert.id ? null : alert.id);
                    analytics.trackEvent('dashboard_alert_clicked', { alertId: alert.id });
                  }}
                  className={`p-3.5 rounded-lg border transition-all cursor-pointer ${
                    selectedAlert === alert.id
                      ? 'bg-slate-900 border-teal-500 shadow-md'
                      : alert.type === 'warning'
                      ? 'bg-amber-950/20 border-amber-500/30 hover:border-amber-500/60'
                      : alert.type === 'opportunity'
                      ? 'bg-teal-950/20 border-teal-500/30 hover:border-teal-500/60'
                      : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-2.5">
                      {alert.type === 'warning' ? (
                        <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                      ) : alert.type === 'opportunity' ? (
                        <Sparkles className="w-4 h-4 text-teal-400 shrink-0 mt-0.5" />
                      ) : (
                        <CheckCircle2 className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
                      )}
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-semibold uppercase text-slate-400 bg-slate-800 px-1.5 py-0.5 rounded">
                            {alert.module}
                          </span>
                          <span className="text-xs font-bold text-slate-200">{alert.title}</span>
                        </div>
                        <p className="text-xs text-slate-400 mt-1 leading-relaxed">{alert.desc}</p>
                      </div>
                    </div>

                    <button className="text-xs font-semibold text-teal-400 hover:text-teal-300 whitespace-nowrap flex items-center gap-1 shrink-0 bg-slate-900 px-2.5 py-1 rounded border border-slate-700">
                      <span>Action</span>
                      <ChevronRight className="w-3 h-3" />
                    </button>
                  </div>

                  {selectedAlert === alert.id && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      className="mt-3 pt-3 border-t border-slate-800 flex items-center justify-between text-xs text-teal-300 bg-teal-500/5 p-2.5 rounded"
                    >
                      <span>Owner OS Impact: Executing this recommendation saves estimated 4.5 hours of delay.</span>
                      <button className="px-3 py-1 bg-teal-500 text-slate-950 font-bold rounded hover:bg-teal-400">
                        Confirm Action
                      </button>
                    </motion.div>
                  )}
                </motion.div>
              ))}
            </div>
          </div>

          {/* Shop Floor & Plant Line Status (1 col) */}
          <div className="bg-slate-950 p-4 sm:p-5 rounded-xl border border-slate-800 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                <Factory className="w-3.5 h-3.5 text-teal-400" />
                Live Shop Floor Lines
              </h4>
              <span className="text-[10px] text-emerald-400 font-semibold flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" /> 11 / 12 Running
              </span>
            </div>

            <div className="space-y-2.5">
              {[
                { line: 'Line A (Precision Turning)', status: 'Optimal', oee: '92.1%', job: 'WO-8041 (Parts B)' },
                { line: 'Line B (CNC Milling)', status: 'Optimal', oee: '88.4%', job: 'WO-8042 (Flanges)' },
                { line: 'Line C (Assembly Bay 2)', status: 'Optimal', oee: '91.0%', job: 'WO-8043 (Valves)' },
                { line: 'Line D (Stamping Press)', status: 'Warning', oee: '71.2%', job: 'Inspection Pending' }
              ].map((item, idx) => (
                <div key={idx} className="p-2.5 rounded-lg bg-slate-900 border border-slate-800/80 flex items-center justify-between text-xs">
                  <div>
                    <div className="font-semibold text-slate-200">{item.line}</div>
                    <div className="text-[10px] text-slate-400">{item.job}</div>
                  </div>
                  <div className="text-right">
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                      item.status === 'Optimal' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30' : 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                    }`}>
                      {item.oee} OEE
                    </span>
                  </div>
                </div>
              ))}
            </div>

            <div className="p-3 rounded-lg bg-slate-900/60 border border-slate-800 text-[11px] text-slate-400 flex items-center justify-between">
              <span>Shift Output Target: 4,200 Units</span>
              <span className="text-emerald-400 font-bold">3,980 Done (94%)</span>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
};
