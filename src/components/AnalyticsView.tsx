import React, { useState } from 'react';
import { PerformancePoint } from '../types/dashboard';
import { 
  BarChart3, 
  TrendingUp, 
  Clock, 
  Download, 
  Filter, 
  Zap, 
  PieChart as PieChartIcon, 
  Activity,
  Layers
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  Tooltip, 
  CartesianGrid, 
  BarChart, 
  Bar, 
  LineChart, 
  Line 
} from 'recharts';

interface AnalyticsViewProps {
  performanceData: PerformancePoint[];
  onOpenCopilot: () => void;
}

export const AnalyticsView: React.FC<AnalyticsViewProps> = ({ performanceData, onOpenCopilot }) => {
  const [selectedMetric, setSelectedMetric] = useState<'revenue' | 'users' | 'aiQueries' | 'latency'>('revenue');

  const funnelStages = [
    { stage: 'Unique Visitors', count: 142000, percentage: '100%' },
    { stage: 'Product Page Views', count: 86400, percentage: '60.8%' },
    { stage: 'Trial Signup Initiated', count: 18200, percentage: '12.8%' },
    { stage: 'Active Workspace Set Up', count: 9100, percentage: '6.4%' },
    { stage: 'Paid Subscription Converted', count: 4600, percentage: '3.24%' },
  ];

  const handleExportCsv = () => {
    const headers = ['Month', 'Revenue', 'Users', 'AI Queries', 'Latency (ms)'];
    const rows = performanceData.map(p => [p.month, p.revenue, p.users, p.aiQueries, p.latency]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `stratum_analytics_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="flex-1 p-6 md:p-8 overflow-y-auto space-y-6 bg-slate-50">
      {/* Analytics Header Controls */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs">
        <div>
          <h3 className="font-bold text-slate-900 text-lg">System & Business Analytics</h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Detailed performance telemetry, token usage breakdown, latency distribution, and conversion pipeline.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleExportCsv}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition-colors border border-slate-200"
          >
            <Download className="w-3.5 h-3.5" /> Export Data
          </button>
          <button
            onClick={onOpenCopilot}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg shadow-xs transition-colors"
          >
            <Zap className="w-3.5 h-3.5" /> AI Latency Audit
          </button>
        </div>
      </div>

      {/* Main Area Chart Card */}
      <div className="bg-white p-6 rounded-xl border border-slate-200/80 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 font-bold">
              <Activity className="w-4 h-4" />
            </div>
            <div>
              <h4 className="font-bold text-slate-800 text-sm">Longitudinal Telemetry Trend</h4>
              <p className="text-[11px] text-slate-500">12-Month historical tracking data</p>
            </div>
          </div>

          {/* Metric Selector Pills */}
          <div className="flex bg-slate-100 p-1 rounded-lg border border-slate-200 text-xs font-semibold">
            <button
              onClick={() => setSelectedMetric('revenue')}
              className={`px-3 py-1 rounded transition-colors ${selectedMetric === 'revenue' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-600'}`}
            >
              Revenue
            </button>
            <button
              onClick={() => setSelectedMetric('aiQueries')}
              className={`px-3 py-1 rounded transition-colors ${selectedMetric === 'aiQueries' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-600'}`}
            >
              AI Tokens
            </button>
            <button
              onClick={() => setSelectedMetric('users')}
              className={`px-3 py-1 rounded transition-colors ${selectedMetric === 'users' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-600'}`}
            >
              Active Users
            </button>
            <button
              onClick={() => setSelectedMetric('latency')}
              className={`px-3 py-1 rounded transition-colors ${selectedMetric === 'latency' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-600'}`}
            >
              Latency (ms)
            </button>
          </div>
        </div>

        {/* Recharts Area Chart */}
        <div className="h-72 w-full pt-2">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={performanceData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="indigoGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#4f46e5" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748b' }} />
              <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8' }} />
              <Tooltip 
                contentStyle={{ backgroundColor: '#0f172a', borderRadius: '8px', border: 'none', color: '#fff', fontSize: '12px' }}
              />
              <Area 
                type="monotone" 
                dataKey={selectedMetric} 
                stroke="#4f46e5" 
                strokeWidth={2}
                fillOpacity={1} 
                fill="url(#indigoGrad)" 
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Two Column Grid: Conversion Funnel + Latency Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Conversion Funnel */}
        <div className="bg-white p-6 rounded-xl border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex justify-between items-center">
            <h4 className="font-bold text-slate-800 text-sm flex items-center gap-2">
              <Layers className="w-4 h-4 text-indigo-600" /> Conversion Funnel Analysis
            </h4>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-50 text-emerald-600 border border-emerald-100">
              3.24% Overall Conversion
            </span>
          </div>

          <div className="space-y-3 pt-2">
            {funnelStages.map((stage, i) => (
              <div key={i} className="space-y-1">
                <div className="flex justify-between text-xs font-semibold">
                  <span className="text-slate-700">{stage.stage}</span>
                  <div className="flex gap-2">
                    <span className="text-slate-500">{stage.count.toLocaleString()}</span>
                    <span className="text-indigo-600 font-bold">{stage.percentage}</span>
                  </div>
                </div>
                <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                  <div 
                    className="bg-indigo-600 h-full rounded-full transition-all"
                    style={{ width: stage.percentage }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* System Health & Regional Response Latency */}
        <div className="bg-white p-6 rounded-xl border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex justify-between items-center">
            <h4 className="font-bold text-slate-800 text-sm flex items-center gap-2">
              <Clock className="w-4 h-4 text-indigo-600" /> Regional API Cluster Latency
            </h4>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-indigo-50 text-indigo-700">
              Avg 98ms global
            </span>
          </div>

          <div className="space-y-3 pt-2">
            {[
              { region: 'us-east1 (N. Virginia)', status: 'Healthy', ping: '24ms', load: '32%' },
              { region: 'us-central1 (Iowa)', status: 'Healthy', ping: '38ms', load: '45%' },
              { region: 'europe-west1 (Belgium)', status: 'Healthy', ping: '84ms', load: '28%' },
              { region: 'asia-east1 (Taiwan)', status: 'Healthy', ping: '112ms', load: '51%' },
              { region: 'sa-east1 (São Paulo)', status: 'Optimal', ping: '142ms', load: '18%' },
            ].map((cluster, i) => (
              <div key={i} className="flex items-center justify-between p-2.5 bg-slate-50 rounded-lg text-xs border border-slate-100">
                <div className="flex items-center gap-2.5">
                  <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                  <div>
                    <p className="font-bold text-slate-800">{cluster.region}</p>
                    <p className="text-[10px] text-slate-400">Cluster load: {cluster.load}</p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="font-bold text-slate-900">{cluster.ping}</span>
                  <span className="block text-[9px] text-emerald-600 font-medium">{cluster.status}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
