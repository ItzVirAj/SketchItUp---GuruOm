import React, { useState } from 'react';
import { MetricCardData, PerformancePoint, ActivityItem, TeamProject } from '../types/dashboard';
import { 
  TrendingUp, 
  TrendingDown, 
  Sparkles, 
  Rocket, 
  Filter, 
  MoreHorizontal,
  ArrowUpRight,
  RefreshCw,
  Plus,
  CheckCircle2
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  CartesianGrid 
} from 'recharts';

interface DashboardViewProps {
  metrics: MetricCardData[];
  performanceData: PerformancePoint[];
  activities: ActivityItem[];
  projects: TeamProject[];
  timeRange: string;
  onOpenUpgrade: () => void;
  onOpenCopilot: () => void;
  onAddActivity: (activity: Omit<ActivityItem, 'id' | 'timestamp'>) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  metrics,
  performanceData,
  activities,
  projects,
  timeRange,
  onOpenUpgrade,
  onOpenCopilot,
  onAddActivity,
}) => {
  const [activeChartMetric, setActiveChartMetric] = useState<'revenue' | 'users' | 'aiQueries'>('revenue');
  const [activityFilter, setActivityFilter] = useState<string>('all');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showAddActivity, setShowAddActivity] = useState(false);

  // New activity form state
  const [newActTitle, setNewActTitle] = useState('');
  const [newActDesc, setNewActDesc] = useState('');
  const [newActType, setNewActType] = useState<ActivityItem['type']>('system');

  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => setIsRefreshing(false), 600);
  };

  const handleCreateActivity = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newActTitle.trim()) return;

    let badgeColor: ActivityItem['badgeColor'] = 'indigo';
    if (newActType === 'subscription') badgeColor = 'indigo';
    else if (newActType === 'system') badgeColor = 'emerald';
    else if (newActType === 'payment') badgeColor = 'amber';
    else if (newActType === 'login') badgeColor = 'slate';
    else badgeColor = 'rose';

    onAddActivity({
      title: newActTitle,
      description: newActDesc || 'Manual event logged via workspace controls',
      type: newActType,
      user: 'Alex Rivera',
      badgeColor
    });

    setNewActTitle('');
    setNewActDesc('');
    setShowAddActivity(false);
  };

  const filteredActivities = activities.filter(act => {
    if (activityFilter === 'all') return true;
    return act.type === activityFilter;
  });

  const getBadgeStyle = (color: ActivityItem['badgeColor']) => {
    switch (color) {
      case 'indigo':
        return 'bg-indigo-500';
      case 'emerald':
        return 'bg-emerald-500';
      case 'amber':
        return 'bg-amber-500';
      case 'slate':
        return 'bg-slate-400';
      case 'rose':
        return 'bg-rose-500';
      default:
        return 'bg-indigo-500';
    }
  };

  return (
    <div className="flex-1 p-6 md:p-8 overflow-y-auto space-y-6 bg-slate-50">
      {/* 4 Metric Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        {metrics.map((metric) => (
          <div
            key={metric.id}
            className="bg-white p-4 rounded-xl shadow-xs border border-slate-200/80 hover:border-slate-300 transition-all flex flex-col justify-between group"
          >
            <div className="flex justify-between items-center mb-2">
              <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">{metric.title}</p>
              <span className="text-[10px] text-slate-400 font-medium">{metric.timeframe}</span>
            </div>
            <div className="flex items-end justify-between">
              <h3 className="text-2xl font-bold text-slate-900 tracking-tight">{metric.value}</h3>
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded flex items-center gap-0.5 ${
                  metric.isPositive
                    ? 'text-emerald-600 bg-emerald-50 border border-emerald-100'
                    : 'text-rose-600 bg-rose-50 border border-rose-100'
                }`}
              >
                {metric.isPositive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                {metric.change}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Main Grid Section: Performance Overview + Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Performance Overview Chart Card (8 cols) */}
        <div className="lg:col-span-8 bg-white p-6 rounded-xl shadow-xs border border-slate-200/80 flex flex-col justify-between relative min-h-[380px]">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
            <div>
              <h4 className="font-bold text-slate-800 text-base">Performance Overview</h4>
              <p className="text-xs text-slate-500 mt-0.5">
                Real-time workload metrics across enterprise regions ({timeRange})
              </p>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex bg-slate-100 p-1 rounded-lg border border-slate-200 text-[11px] font-semibold">
                <button
                  onClick={() => setActiveChartMetric('revenue')}
                  className={`px-2.5 py-1 rounded transition-colors ${
                    activeChartMetric === 'revenue' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Revenue
                </button>
                <button
                  onClick={() => setActiveChartMetric('users')}
                  className={`px-2.5 py-1 rounded transition-colors ${
                    activeChartMetric === 'users' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Users
                </button>
                <button
                  onClick={() => setActiveChartMetric('aiQueries')}
                  className={`px-2.5 py-1 rounded transition-colors ${
                    activeChartMetric === 'aiQueries' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  AI Tokens
                </button>
              </div>
              <button
                onClick={handleRefresh}
                className={`p-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors ${
                  isRefreshing ? 'animate-spin' : ''
                }`}
                title="Refresh metrics"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Interactive Bar Chart using Recharts */}
          <div className="h-64 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={performanceData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis 
                  dataKey="month" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 11, fill: '#64748b', fontWeight: 600 }} 
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 10, fill: '#94a3b8' }} 
                  tickFormatter={(val) => 
                    activeChartMetric === 'revenue' 
                      ? `$${val / 1000}k` 
                      : activeChartMetric === 'aiQueries' 
                        ? `${val / 1000}k` 
                        : `${val}`
                  } 
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#0f172a', 
                    borderRadius: '8px', 
                    border: 'none', 
                    color: '#fff', 
                    fontSize: '12px',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
                  }} 
                  formatter={(value: any) => [
                    activeChartMetric === 'revenue' 
                      ? `$${Number(value).toLocaleString()}` 
                      : Number(value).toLocaleString(), 
                    activeChartMetric === 'revenue' ? 'Revenue' : activeChartMetric === 'users' ? 'Active Users' : 'AI Queries'
                  ]}
                />
                <Bar 
                  dataKey={activeChartMetric} 
                  fill="#4f46e5" 
                  radius={[4, 4, 0, 0]} 
                  animationDuration={1000}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-slate-100 text-xs text-slate-500">
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1.5 font-medium">
                <span className="w-2.5 h-2.5 bg-indigo-600 rounded-sm"></span> Current Period
              </span>
              <span className="flex items-center gap-1.5 font-medium">
                <span className="w-2.5 h-2.5 bg-indigo-200 rounded-sm"></span> Baseline Target
              </span>
            </div>
            <button onClick={onOpenCopilot} className="text-indigo-600 font-semibold hover:underline flex items-center gap-1">
              Analyze with AI Copilot <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Recent Activity Card (4 cols) */}
        <div className="lg:col-span-4 bg-white p-6 rounded-xl shadow-xs border border-slate-200/80 flex flex-col justify-between min-h-[380px]">
          <div>
            <div className="flex justify-between items-center mb-4">
              <h4 className="font-bold text-slate-800 text-base">Recent Activity</h4>
              <div className="flex items-center gap-2">
                <select
                  value={activityFilter}
                  onChange={(e) => setActivityFilter(e.target.value)}
                  className="text-xs bg-slate-100 border-none rounded-md px-2 py-1 text-slate-600 font-medium outline-none cursor-pointer"
                >
                  <option value="all">All Events</option>
                  <option value="subscription">Subscriptions</option>
                  <option value="system">System</option>
                  <option value="payment">Payments</option>
                  <option value="login">Security</option>
                  <option value="ai">AI Triggers</option>
                </select>
                <button
                  onClick={() => setShowAddActivity(!showAddActivity)}
                  className="p-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
                  title="Add Event"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Quick Add Form modal inline */}
            {showAddActivity && (
              <form onSubmit={handleCreateActivity} className="mb-4 p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-2 text-xs">
                <div className="font-bold text-slate-700">Log Workspace Event</div>
                <input
                  type="text"
                  placeholder="Event Title..."
                  value={newActTitle}
                  onChange={(e) => setNewActTitle(e.target.value)}
                  className="w-full px-2 py-1 bg-white border border-slate-200 rounded outline-none"
                  required
                />
                <input
                  type="text"
                  placeholder="Description..."
                  value={newActDesc}
                  onChange={(e) => setNewActDesc(e.target.value)}
                  className="w-full px-2 py-1 bg-white border border-slate-200 rounded outline-none"
                />
                <div className="flex justify-between items-center pt-1">
                  <select
                    value={newActType}
                    onChange={(e) => setNewActType(e.target.value as any)}
                    className="bg-white border border-slate-200 rounded px-2 py-1 text-slate-700"
                  >
                    <option value="system">System</option>
                    <option value="subscription">Subscription</option>
                    <option value="payment">Payment</option>
                    <option value="login">Login</option>
                    <option value="ai">AI</option>
                  </select>
                  <div className="flex gap-1">
                    <button
                      type="button"
                      onClick={() => setShowAddActivity(false)}
                      className="px-2 py-1 bg-slate-200 text-slate-700 rounded"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-2.5 py-1 bg-indigo-600 text-white rounded font-semibold"
                    >
                      Add
                    </button>
                  </div>
                </div>
              </form>
            )}

            {/* Event Timeline */}
            <div className="space-y-4 max-h-[260px] overflow-y-auto pr-1">
              {filteredActivities.length === 0 ? (
                <div className="text-center py-8 text-xs text-slate-400">No activities found for this filter.</div>
              ) : (
                filteredActivities.map((act) => (
                  <div key={act.id} className="flex gap-3 items-start group">
                    <div className={`w-2 h-2 mt-1.5 rounded-full shrink-0 ${getBadgeStyle(act.badgeColor)}`} />
                    <div className="flex-1 overflow-hidden">
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-bold text-slate-800 truncate">{act.title}</p>
                        <span className="text-[9px] text-slate-400 shrink-0 ml-2">{act.timestamp}</span>
                      </div>
                      <p className="text-[11px] text-slate-500 line-clamp-1 leading-tight">{act.description}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>{activities.length} total events recorded</span>
            <button onClick={onOpenCopilot} className="text-indigo-600 font-semibold hover:underline">
              Summary
            </button>
          </div>
        </div>
      </div>

      {/* Bottom Grid Row: Team Progress + High Impact Upgrade Card */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Team Progress Card (6 cols) */}
        <div className="lg:col-span-6 bg-white rounded-xl shadow-xs border border-slate-200/80 overflow-hidden flex flex-col justify-between">
          <div className="p-4 border-b border-slate-100 flex justify-between items-center">
            <div>
              <h4 className="font-bold text-slate-800 text-sm">Team Progress</h4>
              <p className="text-[11px] text-slate-500">Active project roadmap & milestone status</p>
            </div>
            <span className="text-indigo-600 text-[11px] font-bold cursor-pointer hover:underline">
              View Roadmap
            </span>
          </div>

          <div className="p-5 space-y-4">
            {projects.map((proj) => (
              <div key={proj.id} className="flex items-center gap-4">
                <div className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center text-sm shrink-0 border border-slate-200/60">
                  {proj.icon}
                </div>
                <div className="flex-1">
                  <div className="flex justify-between mb-1.5 items-center">
                    <span className="text-xs font-bold text-slate-800">{proj.name}</span>
                    <span className="text-xs font-bold text-indigo-600">{proj.progress}%</span>
                  </div>
                  <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        proj.progress >= 75
                          ? 'bg-indigo-600'
                          : proj.progress >= 40
                          ? 'bg-emerald-500'
                          : 'bg-amber-500'
                      }`}
                      style={{ width: `${proj.progress}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="px-5 py-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
            <span>Sprint 42 ends in 5 days</span>
            <span className="font-semibold text-slate-700">4 Active Initiatives</span>
          </div>
        </div>

        {/* High Impact Upgrade/Copilot Card (6 cols) */}
        <div className="lg:col-span-6 bg-indigo-900 rounded-xl shadow-md border border-indigo-800 p-6 flex items-center justify-between overflow-hidden relative group">
          <div className="relative z-10 max-w-sm">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-indigo-800/80 rounded-full text-[10px] font-bold text-indigo-200 mb-3 border border-indigo-700">
              <Sparkles className="w-3 h-3 text-indigo-300" /> GEMINI 2.5 INTEGRATED
            </div>
            <h4 className="text-white font-bold text-xl leading-tight mb-2">
              Unlock Premium<br />Analytics & AI Copilot
            </h4>
            <p className="text-indigo-200 text-xs mb-5 leading-relaxed">
              Real-time anomaly detection, predictive revenue modeling, and instant natural language database queries.
            </p>
            <div className="flex items-center gap-3">
              <button
                onClick={onOpenUpgrade}
                className="bg-white text-indigo-900 hover:bg-indigo-50 text-xs font-bold px-4 py-2 rounded-lg shadow-xs transition-all transform group-hover:scale-105"
              >
                Upgrade Plan
              </button>
              <button
                onClick={onOpenCopilot}
                className="bg-indigo-800/80 hover:bg-indigo-800 text-white border border-indigo-700 text-xs font-bold px-4 py-2 rounded-lg transition-colors flex items-center gap-1.5"
              >
                Launch Copilot <Rocket className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Background Decorative Accents */}
          <div className="absolute -right-8 -bottom-8 w-56 h-56 bg-indigo-600 opacity-30 rounded-full blur-2xl pointer-events-none"></div>
          <div className="absolute right-6 top-6 text-5xl opacity-20 rotate-12 select-none">
            🚀
          </div>
        </div>
      </div>
    </div>
  );
};
