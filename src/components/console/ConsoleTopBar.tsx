import React, { useState, useRef, useEffect } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  Bell,
  RefreshCw,
  Sun,
  Moon,
  Search,
  ShieldCheck,
  LogOut,
  Menu,
  ChevronRight,
  UserCheck,
  ChevronDown,
  Sparkles
} from 'lucide-react';
import { ConsoleView, UserRole, ConsoleUser, SystemUser } from '../../types/console';
import { getBreadcrumbsForView, getViewTitle, NAVIGATION_SECTIONS } from '../../utils/navigationConfig';

export interface ConsoleTopBarProps {
  currentView: ConsoleView;
  onNavigate?: (view: ConsoleView) => void;
  onToggleMobileMenu?: () => void;
  onOpenCommandPalette?: () => void;
  onSync?: () => void;
  isSyncing?: boolean;
  lastSynced?: string;
  onOpenNotifications?: () => void;
  unreadNotificationsCount?: number;
  isDarkMode: boolean;
  setIsDarkMode?: (dark: boolean) => void;
  currentUser?: ConsoleUser | SystemUser | null;
  userName?: string;
  currentRole?: UserRole;
  onOpenSecurityModal?: () => void;
  onOpenSwitchUser?: () => void;
  onSignOut?: () => void;
  scope?: string;
  setScope?: (scope: string) => void;
  orderPo?: string | null;
}

// Clean and standardize module names to pure Apple HIG style
function formatModuleLabel(rawLabel: string): string {
  if (rawLabel.includes('Operations')) return 'Operations';
  if (rawLabel.includes('Quality')) return 'Quality';
  if (rawLabel.includes('Finance')) return 'Finance';
  if (rawLabel.includes('Admin')) return 'Admin';
  if (rawLabel.includes('People') || rawLabel.includes('Human') || rawLabel.includes('HR')) return 'HR';
  return rawLabel;
}

export const ConsoleTopBar: React.FC<ConsoleTopBarProps> = ({
  currentView,
  onNavigate,
  onToggleMobileMenu,
  onOpenCommandPalette,
  onSync,
  isSyncing = false,
  lastSynced,
  onOpenNotifications,
  unreadNotificationsCount = 0,
  isDarkMode,
  setIsDarkMode,
  currentUser,
  userName = 'Sachin Gharbude',
  currentRole = 'SUPER ADMIN',
  onOpenSecurityModal,
  onOpenSwitchUser,
  onSignOut,
  orderPo
}) => {
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement | null>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setIsUserMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const displayName = currentUser?.name || (currentUser as any)?.fullName || userName || 'GuruOm Admin';
  const displayEmail = currentUser?.email || 'owner@guruom.in';
  const displayRole = currentUser?.role || currentRole || 'SUPER ADMIN';
  const initials = (displayName || 'GO')
    .split(' ')
    .filter(Boolean)
    .map(p => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase() || 'GO';

  const breadcrumbs = getBreadcrumbsForView(currentView, orderPo);
  const cleanModule = formatModuleLabel(breadcrumbs.moduleLabel);
  const cleanSubmodule = breadcrumbs.submoduleLabel || getViewTitle(currentView);

  // Default target view when clicking module label
  const getModuleDefaultView = (mod: string): ConsoleView => {
    if (mod === 'Operations') return 'orders';
    if (mod === 'Quality') return 'qc';
    if (mod === 'Finance') return 'invoices';
    if (mod === 'Admin') return 'masters';
    if (mod === 'HR') return 'tasks';
    return 'command-centre';
  };

  return (
    <header className="relative z-30 shrink-0 h-[56px] w-full select-none font-sans px-3.5 sm:px-5 flex items-center justify-between transition-colors backdrop-blur-xl bg-gradient-to-b from-white via-white/95 to-slate-50/80 dark:from-[#111115]/90 dark:via-[#09090B]/85 dark:to-[#09090B]/85 border-b border-black/[0.06] dark:border-white/[0.08] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.9),0_1px_2px_rgba(0,0,0,0.02)] dark:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05)] text-slate-900 dark:text-[#F4F4F5]">


      {/* ========================================================================= */}
      {/* ── 1. LEADING: APPLE HIG HIERARCHICAL BREADCRUMB NAVIGATION ──            */}
      {/* ========================================================================= */}
      <div className="flex items-center gap-1.5 sm:gap-2.5 min-w-0">
        {/* Mobile menu trigger */}
        {onToggleMobileMenu && (
          <button
            type="button"
            onClick={onToggleMobileMenu}
            className="flex h-8.5 w-8.5 items-center justify-center rounded-xl lg:hidden transition-all active:scale-95 text-slate-600 dark:text-neutral-300 hover:bg-black/[0.04] dark:hover:bg-white/[0.08] cursor-pointer"
            aria-label="Open sidebar drawer"
          >
            <Menu className="h-4.5 w-4.5" />
          </button>
        )}

        <nav aria-label="Breadcrumb" className="flex items-center gap-1 sm:gap-1.5 text-[13px] tracking-tight min-w-0">
          {/* Main Module (e.g., "Operations", "Quality", "Finance") */}
          {cleanModule !== 'Workspace' && (
            <>
              <button
                type="button"
                onClick={() => onNavigate?.(getModuleDefaultView(cleanModule))}
                className="group flex items-center gap-1 px-2 py-1 rounded-lg font-medium text-slate-500 hover:text-slate-900 dark:text-neutral-400 dark:hover:text-white hover:bg-black/[0.04] dark:hover:bg-white/[0.06] transition-all cursor-pointer truncate max-w-[130px]"
                title={`Navigate to ${cleanModule}`}
              >
                <span className="truncate">{cleanModule}</span>
              </button>

              <span className="text-slate-300 dark:text-neutral-600 font-semibold text-xs shrink-0 select-none">
                /
              </span>
            </>
          )}

          {/* Submodule (e.g., "Orders", "Inventory", "Production") */}
          <button
            type="button"
            onClick={() => onNavigate?.(currentView)}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[13px] font-semibold transition-all cursor-pointer truncate max-w-[200px] ${breadcrumbs.detailLabel
              ? 'text-slate-600 hover:text-slate-900 dark:text-neutral-300 dark:hover:text-white hover:bg-black/[0.04] dark:hover:bg-white/[0.06]'
              : 'text-slate-900 dark:text-white bg-black/[0.03] dark:bg-white/[0.07] border border-black/[0.04] dark:border-white/[0.08] shadow-2xs'
              }`}
          >
            <span className="truncate">{cleanSubmodule}</span>
          </button>

          {/* Detail Label if on an Order/Job Detail view */}
          {breadcrumbs.detailLabel && (
            <>
              <span className="text-slate-300 dark:text-neutral-600 font-semibold text-xs shrink-0 select-none">
                /
              </span>
              <span className="inline-flex items-center px-2 py-0.5 rounded-md font-mono text-[11.5px] font-bold tracking-tight bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 truncate max-w-[160px]">
                {breadcrumbs.detailLabel}
              </span>
            </>
          )}
        </nav>
      </div>

      {/* ========================================================================= */}
      {/* ── 2. CENTER: macOS SPOTLIGHT SEARCH CAPSULE ──                            */}
      {/* ========================================================================= */}
      <div className="hidden md:flex items-center justify-center flex-1 max-w-[420px] mx-auto px-4">
        <button
          type="button"
          onClick={onOpenCommandPalette}
          className="group relative flex h-8.5 w-full items-center justify-between rounded-xl px-3 transition-all duration-150 cursor-pointer text-xs bg-black/[0.03] hover:bg-black/[0.05] dark:bg-white/[0.05] dark:hover:bg-white/[0.08] border border-black/[0.06] hover:border-black/[0.12] dark:border-white/[0.08] dark:hover:border-white/[0.14] text-neutral-500 dark:text-neutral-400 hover:text-neutral-800 dark:hover:text-neutral-200 shadow-[inset_0_1px_1px_rgba(0,0,0,0.02)] active:scale-[0.99]"
          title="Spotlight command palette (⌘K / Ctrl+K)"
        >
          <div className="flex items-center gap-2 min-w-0">
            <Search className="h-3.5 w-3.5 shrink-0 text-neutral-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors" />
            <span className="truncate text-neutral-500 dark:text-neutral-400 font-normal">
              Spotlight search orders, stock, jobs...
            </span>
          </div>

          <kbd className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-[10.5px] font-mono font-medium tracking-tight bg-white dark:bg-white/[0.1] text-neutral-500 dark:text-neutral-300 border border-black/[0.08] dark:border-white/[0.1] shadow-2xs">
            <span>⌘</span>
            <span>K</span>
          </kbd>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* ── 3. TRAILING: APPLE CONTROL CENTER ACTION DECK ──                       */}
      {/* ========================================================================= */}
      <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">

        {/* Mobile Search Icon Trigger */}
        <button
          type="button"
          onClick={onOpenCommandPalette}
          className="flex h-8.5 w-8.5 items-center justify-center rounded-xl md:hidden text-neutral-600 dark:text-neutral-300 hover:bg-black/[0.04] dark:hover:bg-white/[0.08] transition-all cursor-pointer"
          title="Search (⌘K)"
          aria-label="Search"
        >
          <Search className="h-4 w-4" />
        </button>

        {/* Apple Segmented Quick Action Strip */}
        <div className="flex items-center p-0.5 rounded-xl bg-black/[0.03] dark:bg-white/[0.04] border border-black/[0.05] dark:border-white/[0.06]">
          {/* Live Sync Action */}
          {onSync && (
            <button
              type="button"
              onClick={onSync}
              disabled={isSyncing}
              className="flex items-center gap-1.5 h-7.5 px-2.5 rounded-lg text-xs font-medium transition-all cursor-pointer active:scale-95 disabled:opacity-40 text-neutral-700 dark:text-neutral-200 hover:bg-white dark:hover:bg-white/[0.08] hover:shadow-2xs"
              title={lastSynced ? `System Synced: ${lastSynced}` : 'Sync live data'}
              aria-label="Sync live data"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isSyncing ? 'animate-spin text-blue-500' : 'text-neutral-500 dark:text-neutral-400'}`} />
              <span className="hidden xl:inline text-[11.5px] font-medium">{isSyncing ? 'Syncing' : 'Sync'}</span>
            </button>
          )}

          {/* Notifications Center Action */}
          {onOpenNotifications && (
            <button
              type="button"
              onClick={onOpenNotifications}
              className="relative flex h-7.5 w-7.5 items-center justify-center rounded-lg text-xs font-medium transition-all cursor-pointer active:scale-95 text-neutral-700 dark:text-neutral-200 hover:bg-white dark:hover:bg-white/[0.08] hover:shadow-2xs"
              title={`Alerts & Notifications (${unreadNotificationsCount} unread)`}
              aria-label="Open notifications"
            >
              <Bell className="h-3.5 w-3.5 text-neutral-600 dark:text-neutral-300" />
              {unreadNotificationsCount > 0 && (
                <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#FF3B30] px-1 text-[9px] font-extrabold text-white shadow-xs">
                  {unreadNotificationsCount > 99 ? '99+' : unreadNotificationsCount}
                </span>
              )}
            </button>
          )}

          {/* Apple HIG Smooth Theme Switcher */}
          {setIsDarkMode && (
            <button
              type="button"
              onClick={() => setIsDarkMode(!isDarkMode)}
              className="flex h-7.5 w-7.5 items-center justify-center rounded-lg text-xs font-medium transition-all cursor-pointer active:scale-95 text-neutral-700 dark:text-neutral-200 hover:bg-white dark:hover:bg-white/[0.08] hover:shadow-2xs"
              title={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
              aria-label="Toggle color theme"
            >
              {isDarkMode ? (
                <Moon className="h-3.5 w-3.5 text-blue-400" />
              ) : (
                <Sun className="h-3.5 w-3.5 text-amber-500" />
              )}
            </button>
          )}
        </div>

        {/* ======================================================================= */}
        {/* ── 4. APPLE HIG ACCOUNT CAPSULE & FLYOUT POPOVER ──                    */}
        {/* ======================================================================= */}
        <div className="relative" ref={userMenuRef}>
          <button
            type="button"
            onClick={() => setIsUserMenuOpen(prev => !prev)}
            className={`group flex items-center gap-2 h-8.5 pl-1.5 pr-2.5 rounded-full border transition-all cursor-pointer active:scale-95 ${isUserMenuOpen
              ? 'bg-black/[0.06] dark:bg-white/[0.1] border-black/[0.15] dark:border-white/[0.2] shadow-xs'
              : 'bg-black/[0.03] hover:bg-black/[0.06] dark:bg-white/[0.05] dark:hover:bg-white/[0.09] border-black/[0.06] hover:border-black/[0.12] dark:border-white/[0.08] dark:hover:border-white/[0.14]'
              }`}
            title={`${displayName} — ${displayRole}`}
            aria-expanded={isUserMenuOpen}
            aria-haspopup="true"
          >
            {/* Vibrant Apple HIG Gradient Avatar */}
            <div className="relative shrink-0">
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-tr from-[#155dfc] via-[#4763F5] to-[#7A92FF] text-[10.5px] font-bold text-white shadow-2xs ring-1 ring-white/30">
                {initials}
              </div>
              <span className="absolute -bottom-0.5 -right-0.5 h-2 w-2 rounded-full bg-emerald-500 ring-1 ring-white dark:ring-[#09090B]" />
            </div>

            <div className="hidden lg:flex flex-col text-left leading-none">
              <span className="truncate text-xs font-semibold text-neutral-800 dark:text-neutral-100 max-w-[100px]">
                {displayName.split(' ')[0]}
              </span>
              <span className="text-[9px] font-bold text-blue-600 dark:text-blue-400 tracking-wider uppercase mt-0.5">
                {displayRole.split(' ')[0]}
              </span>
            </div>

            <ChevronDown className={`h-3 w-3 text-neutral-400 transition-transform duration-150 ${isUserMenuOpen ? 'rotate-180' : ''}`} />
          </button>

          {/* Apple HIG Popover Menu */}
          <AnimatePresence>
            {isUserMenuOpen && (
              <motion.div
                initial={{ opacity: 0, scale: 0.96, y: -4 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.96, y: -4 }}
                transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
                className="absolute right-0 top-full mt-2 w-64 rounded-2xl border p-1.5 shadow-[0_20px_50px_rgba(0,0,0,0.18)] dark:shadow-[0_24px_60px_rgba(0,0,0,0.7)] z-50 backdrop-blur-3xl bg-white/95 dark:bg-[#161822]/95 border-black/[0.08] dark:border-white/[0.12] text-slate-900 dark:text-white"
              >
                {/* Account Details Header */}
                <div className="px-3 py-2.5 border-b border-black/[0.06] dark:border-white/[0.08]">
                  <div className="flex items-center gap-2">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-tr from-[#155dfc] to-[#7A92FF] text-xs font-bold text-white shadow-2xs">
                      {initials}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="font-semibold text-[13px] text-neutral-900 dark:text-white truncate">
                        {displayName}
                      </div>
                      <div className="truncate text-[10.5px] text-neutral-400 font-mono">
                        {displayEmail}
                      </div>
                    </div>
                  </div>
                  <div className="mt-2 flex items-center justify-between">
                    <span className="inline-flex items-center px-1.5 py-0.5 rounded-md bg-blue-500/10 text-[9.5px] font-bold text-blue-600 dark:text-blue-400 tracking-wider uppercase border border-blue-500/20">
                      {displayRole}
                    </span>
                    <span className="flex items-center gap-1 text-[10.5px] text-emerald-500 font-medium">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Online
                    </span>
                  </div>
                </div>

                {/* Apple Standard Menu Actions */}
                <div className="pt-1 space-y-0.5">
                  {onOpenSecurityModal && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsUserMenuOpen(false);
                        onOpenSecurityModal();
                      }}
                      className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-medium transition-colors hover:bg-black/[0.04] dark:hover:bg-white/[0.08] text-neutral-700 dark:text-neutral-200 cursor-pointer"
                    >
                      <ShieldCheck className="h-4 w-4 text-emerald-500" />
                      <span>Security & Sessions</span>
                    </button>
                  )}

                  {onOpenSwitchUser && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsUserMenuOpen(false);
                        onOpenSwitchUser();
                      }}
                      className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-medium transition-colors hover:bg-black/[0.04] dark:hover:bg-white/[0.08] text-neutral-700 dark:text-neutral-200 cursor-pointer"
                    >
                      <UserCheck className="h-4 w-4 text-blue-500" />
                      <span>Switch Role / User</span>
                    </button>
                  )}

                  {onSignOut && (
                    <div className="border-t border-black/[0.06] dark:border-white/[0.08] pt-1 mt-1">
                      <button
                        type="button"
                        onClick={() => {
                          setIsUserMenuOpen(false);
                          onSignOut();
                        }}
                        className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-semibold text-[#FF3B30] hover:bg-[#FF3B30]/10 transition-colors cursor-pointer"
                      >
                        <LogOut className="h-4 w-4" />
                        <span>Sign Out</span>
                      </button>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

      </div>
    </header>
  );
};

export default ConsoleTopBar;
