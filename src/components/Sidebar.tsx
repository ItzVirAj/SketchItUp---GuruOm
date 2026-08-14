import React from 'react';
import { NavigationPage } from '../types/dashboard';
import { 
  LayoutDashboard, 
  BarChart3, 
  FolderKanban, 
  Users, 
  Sparkles, 
  Settings, 
  ChevronRight,
  ShieldAlert,
  Zap
} from 'lucide-react';

interface SidebarProps {
  currentPage: NavigationPage;
  onNavigate: (page: NavigationPage) => void;
  unreadCount: number;
  onOpenCopilot: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentPage,
  onNavigate,
  unreadCount,
  onOpenCopilot,
}) => {
  const mainNavItems = [
    { id: 'dashboard' as NavigationPage, label: 'Dashboard', icon: LayoutDashboard },
    { id: 'analytics' as NavigationPage, label: 'Analytics', icon: BarChart3 },
    { id: 'projects' as NavigationPage, label: 'Projects', icon: FolderKanban },
    { id: 'team' as NavigationPage, label: 'Team', icon: Users },
    { id: 'ai-studio' as NavigationPage, label: 'AI Studio', icon: Sparkles, badge: 'PRO' },
  ];

  const supportNavItems = [
    { id: 'settings' as NavigationPage, label: 'Settings', icon: Settings },
  ];

  return (
    <aside className="w-60 h-full bg-white border-r border-slate-200 flex flex-col shrink-0 select-none">
      {/* Brand Header */}
      <div className="p-5 flex items-center justify-between border-b border-slate-100">
        <div className="flex items-center gap-3 cursor-pointer" onClick={() => onNavigate('dashboard')}>
          <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center shadow-xs">
            <div className="w-4 h-4 border-2 border-white rounded-sm"></div>
          </div>
          <div className="flex flex-col">
            <span className="font-bold text-lg tracking-tight text-slate-900 leading-none">Stratum AI</span>
            <span className="text-[10px] text-slate-400 font-medium tracking-wide mt-0.5">Enterprise v2.4</span>
          </div>
        </div>
      </div>

      {/* Navigation Sections */}
      <nav className="flex-1 px-3 py-4 space-y-6 overflow-y-auto no-scrollbar">
        <div>
          <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider px-3 mb-2">
            Main Menu
          </div>
          <div className="space-y-1">
            {mainNavItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentPage === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onNavigate(item.id)}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-slate-100 text-indigo-600 font-semibold'
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className={`w-4 h-4 ${isActive ? 'text-indigo-600' : 'text-slate-400'}`} />
                    <span>{item.label}</span>
                  </div>
                  {item.badge && (
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-700">
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider px-3 mb-2">
            Support & Config
          </div>
          <div className="space-y-1">
            {supportNavItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentPage === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onNavigate(item.id)}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-slate-100 text-indigo-600 font-semibold'
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className={`w-4 h-4 ${isActive ? 'text-indigo-600' : 'text-slate-400'}`} />
                    <span>{item.label}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Quick Copilot Trigger Widget */}
        <div className="pt-2">
          <div className="p-3 bg-indigo-50/80 rounded-xl border border-indigo-100 flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-indigo-900 flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-indigo-600 fill-indigo-600" /> Executive AI
              </span>
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            </div>
            <p className="text-[11px] text-indigo-700 leading-tight">
              Gemini 2.5 active & analyzing metrics in real-time.
            </p>
            <button
              onClick={onOpenCopilot}
              className="mt-1 w-full text-center py-1.5 px-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded text-xs font-semibold shadow-xs transition-colors flex items-center justify-center gap-1"
            >
              Ask AI Copilot <ChevronRight className="w-3 h-3" />
            </button>
          </div>
        </div>
      </nav>

      {/* User Footer */}
      <div className="p-3 border-t border-slate-100">
        <div className="flex items-center justify-between p-2 bg-slate-50 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer" onClick={() => onNavigate('settings')}>
          <div className="flex items-center gap-2.5 overflow-hidden">
            <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold text-xs shrink-0">
              AR
            </div>
            <div className="overflow-hidden">
              <p className="text-xs font-bold text-slate-800 truncate leading-tight">Alex Rivera</p>
              <p className="text-[10px] text-slate-500 truncate leading-tight">Lead Architect</p>
            </div>
          </div>
          <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" title="Online"></span>
        </div>
      </div>
    </aside>
  );
};
