import React from 'react';
import { NavigationPage } from '../types/dashboard';
import { Search, Bell, Sparkles, Plus, Calendar } from 'lucide-react';

interface HeaderProps {
  currentPage: NavigationPage;
  searchTerm: string;
  onSearchChange: (term: string) => void;
  unreadNotifications: number;
  onToggleNotifications: () => void;
  onOpenCopilot: () => void;
  onNewProject: () => void;
  timeRange: string;
  onTimeRangeChange: (range: string) => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentPage,
  searchTerm,
  onSearchChange,
  unreadNotifications,
  onToggleNotifications,
  onOpenCopilot,
  onNewProject,
  timeRange,
  onTimeRangeChange,
}) => {
  const getPageTitle = (page: NavigationPage) => {
    switch (page) {
      case 'dashboard':
        return 'Dashboard Overview';
      case 'analytics':
        return 'Analytics & Performance Metrics';
      case 'projects':
        return 'Project & Task Management';
      case 'team':
        return 'Team Directory & Access';
      case 'ai-studio':
        return 'AI Studio & Copilot Insights';
      case 'settings':
        return 'Workspace Settings & Credentials';
      default:
        return 'Dashboard Overview';
    }
  };

  return (
    <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 shrink-0 z-10 select-none">
      {/* Breadcrumbs */}
      <div className="flex items-center gap-2.5 text-sm">
        <span className="text-slate-400 font-medium">Pages</span>
        <span className="text-slate-300">/</span>
        <span className="font-bold text-slate-800">{getPageTitle(currentPage)}</span>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-4">
        {/* Time Period Selector */}
        <div className="hidden md:flex items-center gap-1.5 bg-slate-100 p-1 rounded-lg border border-slate-200/60">
          <Calendar className="w-3.5 h-3.5 text-slate-500 ml-1.5" />
          {['Week', 'Month', 'Quarter'].map((range) => (
            <button
              key={range}
              onClick={() => onTimeRangeChange(range)}
              className={`px-2.5 py-1 text-[11px] font-semibold rounded-md transition-all ${
                timeRange === range
                  ? 'bg-white text-indigo-600 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {range}
            </button>
          ))}
        </div>

        {/* Search Bar */}
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search metrics, projects, logs..."
            className="pl-9 pr-4 py-1.5 bg-slate-100 border-none rounded-full text-xs w-48 sm:w-64 text-slate-800 focus:bg-white focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 outline-none transition-all"
          />
        </div>

        {/* Quick Actions */}
        <div className="flex items-center gap-2">
          {/* AI Copilot Quick Button */}
          <button
            onClick={onOpenCopilot}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">AI Copilot</span>
          </button>

          {/* New Project Quick Button */}
          <button
            onClick={onNewProject}
            className="hidden sm:flex items-center gap-1 px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition-colors"
            title="Create Project"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Create</span>
          </button>

          {/* Notifications Trigger */}
          <button
            onClick={onToggleNotifications}
            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 border border-slate-200 flex items-center justify-center relative transition-colors"
            aria-label="Notifications"
          >
            {unreadNotifications > 0 && (
              <span className="w-2 h-2 bg-rose-500 rounded-full absolute top-1 right-1 border-2 border-white"></span>
            )}
            <Bell className="w-4 h-4 text-slate-600" />
          </button>
        </div>
      </div>
    </header>
  );
};
