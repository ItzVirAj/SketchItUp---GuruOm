import React from 'react';
import { 
  LayoutGrid, 
  ShoppingBag, 
  Activity, 
  CheckSquare, 
  Menu,
  LucideIcon
} from 'lucide-react';
import { isViewAllowedForRole, isViewAllowedForUser } from '../../utils/permissions';
import { ConsoleView, UserRole } from '../../types/console';

interface TabItem {
  id: ConsoleView | 'more';
  label: string;
  icon: LucideIcon;
  badgeCount?: number;
}

interface MobileBottomTabBarProps {
  currentView: ConsoleView;
  onSelectView: (view: ConsoleView) => void;
  onOpenDrawer: () => void;
  isDrawerOpen?: boolean;
  currentRole?: UserRole | string;
  isDarkMode: boolean;
  pendingApprovalsCount?: number;
}

export const MobileBottomTabBar: React.FC<MobileBottomTabBarProps> = ({
  currentView,
  onSelectView,
  onOpenDrawer,
  isDrawerOpen = false,
  currentRole = 'SUPER ADMIN',
  isDarkMode,
  pendingApprovalsCount = 0
}) => {
  // Base primary high-frequency tabs
  const defaultTabs: TabItem[] = [
    { id: 'command-centre', label: 'Command', icon: LayoutGrid },
    { id: 'orders', label: 'Orders', icon: ShoppingBag },
    { id: 'production', label: 'Production', icon: Activity },
    { id: 'approvals', label: 'Approvals', icon: CheckSquare, badgeCount: pendingApprovalsCount },
  ];

  // Filter tabs by RBAC role permission
  const allowedPrimaryTabs = defaultTabs.filter(tab => 
    isViewAllowedForRole(currentRole, tab.id as ConsoleView)
  );

  // Take up to 4 allowed tabs, and always append 'More' as the 5th tab
  const displayTabs: TabItem[] = [
    ...allowedPrimaryTabs.slice(0, 4),
    { id: 'more', label: 'More', icon: Menu }
  ];

  const handleTabClick = (tabId: ConsoleView | 'more') => {
    if (tabId === 'more') {
      onOpenDrawer();
    } else {
      onSelectView(tabId);
    }
  };

  return (
    <nav 
      aria-label="Mobile Navigation"
      className={`fixed bottom-0 left-0 right-0 z-40 lg:hidden border-t select-none ${
        isDarkMode 
          ? 'bg-[#16171B] border-[#262832] text-slate-400 shadow-[0_-4px_25px_rgba(0,0,0,0.4)]' 
          : 'bg-white border-[#d8dde8] text-slate-600 shadow-[0_-4px_20px_rgba(15,23,42,0.06)]'
      }`}
      style={{
        paddingBottom: 'max(0.4rem, env(safe-area-inset-bottom, 0px))'
      }}
    >
      <div className="flex items-center justify-around px-2 pt-1.5 pb-1">
        {displayTabs.map((tab) => {
          const Icon = tab.icon;
          const isMore = tab.id === 'more';
          const isActive = !isMore && (
            currentView === tab.id || 
            (tab.id === 'orders' && currentView === 'order-detail')
          );
          const isMoreActive = isMore && isDrawerOpen;

          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => handleTabClick(tab.id)}
              className={`relative flex flex-col items-center justify-center flex-1 py-1 px-1 rounded-xl transition-all duration-150 cursor-pointer active:scale-95 group ${
                isActive || isMoreActive
                  ? 'text-[var(--accent-primary)] font-bold'
                  : isDarkMode
                    ? 'text-slate-400 hover:text-slate-200'
                    : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              {/* Icon Container with Badge */}
              <div className="relative flex items-center justify-center w-7 h-7">
                <Icon className={`w-5 h-5 transition-transform duration-150 group-hover:scale-110 ${
                  isActive || isMoreActive
                    ? 'text-[var(--accent-primary)] scale-105 stroke-[2.25]'
                    : isDarkMode ? 'text-slate-400' : 'text-slate-500'
                }`} />

                {/* Badge for notifications / pending counts */}
                {tab.badgeCount !== undefined && tab.badgeCount > 0 && (
                  <span className="absolute -top-1 -right-2 px-1.5 py-0.2 min-w-[16px] h-4 rounded-full bg-rose-500 text-white text-[9px] font-mono font-bold flex items-center justify-center shadow-xs animate-pulse">
                    {tab.badgeCount > 99 ? '99+' : tab.badgeCount}
                  </span>
                )}
              </div>

              {/* Tab Label */}
              <span className={`text-[10px] font-medium tracking-tight mt-0.5 leading-tight ${
                isActive || isMoreActive
                  ? 'text-[var(--accent-primary)] font-bold'
                  : ''
              }`}>
                {tab.label}
              </span>

              {/* Active Indicator Bar */}
              {(isActive || isMoreActive) && (
                <span className="w-4 h-0.5 rounded-full bg-[var(--accent-primary)] mt-0.5" />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
};

