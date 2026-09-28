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
  ChevronDown,
  Settings,
  Palette,
  Check,
  X
} from 'lucide-react';
import { ConsoleView, UserRole, ConsoleUser, SystemUser } from '../../types/console';
import { getBreadcrumbsForView, getViewTitle } from '../../utils/navigationConfig';
import { useAccentTheme } from '../../context/AccentThemeContext';

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
  onOpenSwitchUser: _onOpenSwitchUser,
  onSignOut,
  orderPo
}) => {
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const settingsMenuRef = useRef<HTMLDivElement | null>(null);

  const { setAccent, isGreen, isBlue, isCrystal } = useAccentTheme();

  // Close dropdowns on outside click or Escape key
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setIsUserMenuOpen(false);
      }
      if (settingsMenuRef.current && !settingsMenuRef.current.contains(e.target as Node)) {
        setIsSettingsOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsUserMenuOpen(false);
        setIsSettingsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('keydown', handleKeyDown);
    };
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
    <header className="relative z-30 shrink-0 h-[52px] w-full select-none font-sans px-3.5 sm:px-5 flex items-center justify-between transition-colors backdrop-blur-2xl bg-[#FCFCFC]/90 dark:bg-[#0E0F12]/85 border-b border-black/[0.08] dark:border-white/[0.08] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.4)] dark:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.04)] text-slate-900 dark:text-[#F4F4F5]">

      {/* ========================================================================= */}
      {/* ── 1. LEADING: APPLE HIG HIERARCHICAL BREADCRUMB NAVIGATION ──            */}
      {/* ========================================================================= */}
      <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
        {onToggleMobileMenu && (
          <button
            type="button"
            onClick={onToggleMobileMenu}
            className="flex h-8 w-8 items-center justify-center rounded-lg lg:hidden transition-all active:scale-95 text-slate-600 dark:text-neutral-300 hover:bg-black/[0.04] dark:hover:bg-white/[0.08] cursor-pointer"
            aria-label="Open sidebar drawer"
          >
            <Menu className="h-4 w-4" />
          </button>
        )}

        <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-[13px] tracking-tight min-w-0">
          {cleanModule !== 'Workspace' && (
            <>
              <button
                type="button"
                onClick={() => onNavigate?.(getModuleDefaultView(cleanModule))}
                className="flex items-center gap-1 px-2 py-1 rounded-md font-medium text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white hover:bg-black/[0.04] dark:hover:bg-white/[0.06] transition-colors cursor-pointer truncate max-w-[130px]"
                title={`Navigate to ${cleanModule}`}
              >
                <span className="truncate">{cleanModule}</span>
              </button>

              <ChevronRight className="h-3 w-3 text-neutral-400 dark:text-neutral-500 shrink-0 stroke-[2.2]" />
            </>
          )}

          <button
            type="button"
            onClick={() => onNavigate?.(currentView)}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[13px] font-semibold transition-all cursor-pointer truncate max-w-[200px] ${breadcrumbs.detailLabel
              ? 'text-neutral-600 hover:text-neutral-900 dark:text-neutral-300 dark:hover:text-white hover:bg-black/[0.04] dark:hover:bg-white/[0.06]'
              : 'text-neutral-900 dark:text-white bg-white/70 dark:bg-white/[0.08] border border-black/[0.05] dark:border-white/[0.08] shadow-2xs'
              }`}
          >
            <span className="truncate">{cleanSubmodule}</span>
          </button>

          {breadcrumbs.detailLabel && (
            <>
              <ChevronRight className="h-3 w-3 text-neutral-400 dark:text-neutral-500 shrink-0 stroke-[2.2]" />
              <span className="inline-flex items-center px-2 py-0.5 rounded-md font-mono text-[11px] font-semibold tracking-tight bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 truncate max-w-[160px]">
                {breadcrumbs.detailLabel}
              </span>
            </>
          )}
        </nav>
      </div>

      {/* ========================================================================= */}
      {/* ── 2. CENTER: macOS SPOTLIGHT SEARCH CAPSULE ──                            */}
      {/* ========================================================================= */}
      <div className="hidden md:flex items-center justify-center flex-1 max-w-[380px] mx-auto px-4">
        <button
          type="button"
          onClick={onOpenCommandPalette}
          className="group relative flex h-8 w-full items-center justify-between rounded-lg px-3 transition-all duration-150 cursor-pointer text-xs bg-black/[0.035] hover:bg-black/[0.06] dark:bg-white/[0.05] dark:hover:bg-white/[0.08] border border-black/[0.06] hover:border-black/[0.1] dark:border-white/[0.07] dark:hover:border-white/[0.12] text-neutral-500 dark:text-neutral-400 hover:text-neutral-800 dark:hover:text-neutral-200 shadow-[inset_0_1px_1px_rgba(0,0,0,0.02)] active:scale-[0.99]"
          title="Spotlight command palette (⌘K)"
        >
          <div className="flex items-center gap-2 min-w-0">
            <Search className="h-3.5 w-3.5 shrink-0 text-neutral-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors" />
            <span className="truncate text-neutral-500 dark:text-neutral-400 font-normal">
              Spotlight search orders, stock, jobs...
            </span>
          </div>

          <kbd className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-[10px] font-mono font-medium tracking-tight bg-white/90 dark:bg-white/[0.1] text-neutral-600 dark:text-neutral-300 border border-black/[0.08] dark:border-white/[0.08] shadow-2xs">
            <span>⌘</span>
            <span>K</span>
          </kbd>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* ── 3. TRAILING: APPLE CONTROL CENTER ACTION DECK ──                       */}
      {/* ========================================================================= */}
      <div className="flex items-center gap-2 shrink-0">
        {/* Mobile Search Icon Trigger */}
        <button
          type="button"
          onClick={onOpenCommandPalette}
          className="flex h-8 w-8 items-center justify-center rounded-lg md:hidden text-neutral-600 dark:text-neutral-300 hover:bg-black/[0.04] dark:hover:bg-white/[0.08] transition-all cursor-pointer"
          title="Search (⌘K)"
          aria-label="Search"
        >
          <Search className="h-4 w-4" />
        </button>

        {/* Apple Segmented Quick Action Strip */}
        <div className="flex items-center p-0.5 rounded-xl bg-black/[0.035] dark:bg-white/[0.04] border border-black/[0.05] dark:border-white/[0.06]">
          {onSync && (
            <button
              type="button"
              onClick={onSync}
              disabled={isSyncing}
              className="flex items-center gap-1.5 h-7.5 px-2.5 rounded-lg text-xs font-medium transition-all cursor-pointer active:scale-95 disabled:opacity-40 text-neutral-700 dark:text-neutral-200 hover:bg-white dark:hover:bg-white/[0.1] hover:shadow-2xs"
              title={lastSynced ? `System Synced: ${lastSynced}` : 'Sync live data'}
              aria-label="Sync live data"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isSyncing ? 'animate-spin text-blue-500' : 'text-neutral-500 dark:text-neutral-400'}`} />
              <span className="hidden xl:inline text-[11px] font-medium">{isSyncing ? 'Syncing' : 'Sync'}</span>
            </button>
          )}

          {/* Settings Menu Button & Popover */}
          <div className="relative" ref={settingsMenuRef}>
            <button
              type="button"
              onClick={() => setIsSettingsOpen(prev => !prev)}
              className={`flex h-7.5 w-7.5 items-center justify-center rounded-lg text-xs font-medium transition-all cursor-pointer active:scale-95 ${
                isSettingsOpen
                  ? 'bg-white dark:bg-white/[0.14] text-neutral-900 dark:text-white shadow-2xs'
                  : 'text-neutral-700 dark:text-neutral-200 hover:bg-white dark:hover:bg-white/[0.1] hover:shadow-2xs'
              }`}
              title="Interface Settings & Theme"
              aria-label="Settings and Theme menu"
              aria-expanded={isSettingsOpen}
              aria-haspopup="true"
            >
              <Settings className={`h-3.5 w-3.5 transition-transform duration-200 ${isSettingsOpen ? 'rotate-45 text-neutral-950 dark:text-white' : 'text-neutral-600 dark:text-neutral-300'}`} />
            </button>

            {/* Settings Dropdown Popover */}
            <AnimatePresence>
              {isSettingsOpen && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: 6 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: 4 }}
                  transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
                  className="absolute right-0 top-full mt-2 w-[360px] rounded-2xl bg-white/95 dark:bg-[#14151B]/95 backdrop-blur-xl border border-neutral-200/80 dark:border-neutral-800/90 shadow-2xl shadow-black/15 dark:shadow-black/60 p-4 z-50 text-left"
                >
                  {/* Header */}
                  <div className="flex items-center justify-between pb-3 border-b border-neutral-100 dark:border-neutral-800/80">
                    <div className="flex items-center gap-2">
                      <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-neutral-100 dark:bg-white/10 text-neutral-700 dark:text-neutral-200">
                        <Palette className="h-3.5 w-3.5" />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-neutral-900 dark:text-white">Console Settings</div>
                        <div className="text-[10px] text-neutral-500 dark:text-neutral-400">Theme gradients & preferences</div>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsSettingsOpen(false)}
                      className="p-1 rounded-md text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-white/10 transition-colors cursor-pointer"
                      aria-label="Close settings"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  {/* Section: Gradient Theme Toggle */}
                  <div className="py-3 space-y-2 border-b border-neutral-100 dark:border-neutral-800/80">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
                        Header Gradient Theme
                      </span>
                      <span className="text-[10px] font-semibold text-neutral-400 dark:text-neutral-500">
                        {isGreen ? 'Darker Green' : isBlue ? 'Darker Blue' : 'Crystal White'}
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                      {/* Darker Green Option */}
                      <button
                        type="button"
                        onClick={() => setAccent('green')}
                        className={`group relative flex flex-col p-2 rounded-xl border text-left transition-all active:scale-[0.97] cursor-pointer ${
                          isGreen
                            ? 'bg-emerald-500/10 border-emerald-500/40 dark:border-emerald-500/50 shadow-2xs ring-1 ring-emerald-500/30'
                            : 'bg-neutral-50 hover:bg-neutral-100/80 dark:bg-white/[0.03] dark:hover:bg-white/[0.06] border-neutral-200/70 dark:border-neutral-800'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1.5">
                          <div className="h-3.5 w-8 rounded-full bg-gradient-to-r from-[#0A7E58] via-[#086B4A] to-[#044F36] shadow-2xs ring-1 ring-black/10" />
                          {isGreen && (
                            <span className="flex h-3.5 w-3.5 items-center justify-center rounded-full bg-emerald-600 text-white shadow-2xs">
                              <Check className="h-2 w-2 stroke-[3]" />
                            </span>
                          )}
                        </div>
                        <span className={`text-[11px] font-bold leading-tight ${isGreen ? 'text-emerald-700 dark:text-emerald-300' : 'text-neutral-800 dark:text-neutral-200'}`}>
                          Dark Green
                        </span>
                        <span className="text-[9px] text-neutral-500 dark:text-neutral-400 truncate mt-0.5">
                          Deep Forest
                        </span>
                      </button>

                      {/* Darker Blue Option */}
                      <button
                        type="button"
                        onClick={() => setAccent('blue')}
                        className={`group relative flex flex-col p-2 rounded-xl border text-left transition-all active:scale-[0.97] cursor-pointer ${
                          isBlue
                            ? 'bg-blue-500/10 border-blue-500/40 dark:border-blue-500/50 shadow-2xs ring-1 ring-blue-500/30'
                            : 'bg-neutral-50 hover:bg-neutral-100/80 dark:bg-white/[0.03] dark:hover:bg-white/[0.06] border-neutral-200/70 dark:border-neutral-800'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1.5">
                          <div className="h-3.5 w-8 rounded-full bg-gradient-to-r from-[#1b64ff] via-[#155dfc] to-[#0f52dc] shadow-2xs ring-1 ring-black/10" />
                          {isBlue && (
                            <span className="flex h-3.5 w-3.5 items-center justify-center rounded-full bg-blue-600 text-white shadow-2xs">
                              <Check className="h-2 w-2 stroke-[3]" />
                            </span>
                          )}
                        </div>
                        <span className={`text-[11px] font-bold leading-tight ${isBlue ? 'text-blue-700 dark:text-blue-300' : 'text-neutral-800 dark:text-neutral-200'}`}>
                          Dark Blue
                        </span>
                        <span className="text-[9px] text-neutral-500 dark:text-neutral-400 truncate mt-0.5">
                          Cobalt Royal
                        </span>
                      </button>

                      {/* Crystal White Option */}
                      <button
                        type="button"
                        onClick={() => setAccent('crystal')}
                        className={`group relative flex flex-col p-2 rounded-xl border text-left transition-all active:scale-[0.97] cursor-pointer ${
                          isCrystal
                            ? 'bg-slate-500/10 border-slate-400 dark:border-slate-500 shadow-2xs ring-1 ring-slate-400/30'
                            : 'bg-neutral-50 hover:bg-neutral-100/80 dark:bg-white/[0.03] dark:hover:bg-white/[0.06] border-neutral-200/70 dark:border-neutral-800'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1.5">
                          <div className="h-3.5 w-8 rounded-full bg-gradient-to-r from-white via-[#F8FAFC] to-[#EEF2F6] shadow-2xs ring-1 ring-black/20" />
                          {isCrystal && (
                            <span className="flex h-3.5 w-3.5 items-center justify-center rounded-full bg-slate-900 text-white shadow-2xs">
                              <Check className="h-2 w-2 stroke-[3]" />
                            </span>
                          )}
                        </div>
                        <span className={`text-[11px] font-bold leading-tight ${isCrystal ? 'text-slate-900 dark:text-slate-100' : 'text-neutral-800 dark:text-neutral-200'}`}>
                          Crystal White
                        </span>
                        <span className="text-[9px] text-neutral-500 dark:text-neutral-400 truncate mt-0.5">
                          Black text
                        </span>
                      </button>
                    </div>
                  </div>

                  {/* Section: Mode Appearance (Dark/Light) */}
                  {setIsDarkMode && (
                    <div className="py-3 border-b border-neutral-100 dark:border-neutral-800/80">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
                          Appearance
                        </span>
                        <span className="text-[10px] font-medium text-neutral-400 dark:text-neutral-500">
                          {isDarkMode ? 'Dark Mode' : 'Light Mode'}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 p-0.5 rounded-xl bg-neutral-100 dark:bg-white/[0.06]">
                        <button
                          type="button"
                          onClick={() => setIsDarkMode(false)}
                          className={`flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer active:scale-95 ${
                            !isDarkMode
                              ? 'bg-white text-neutral-900 shadow-2xs'
                              : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
                          }`}
                        >
                          <Sun className="h-3.5 w-3.5 text-amber-500" />
                          <span>Light</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setIsDarkMode(true)}
                          className={`flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer active:scale-95 ${
                            isDarkMode
                              ? 'bg-[#1F2128] text-white shadow-2xs'
                              : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
                          }`}
                        >
                          <Moon className="h-3.5 w-3.5 text-blue-400" />
                          <span>Dark</span>
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Telemetry / Live sync status footer */}
                  <div className="pt-3 flex items-center justify-between text-[11px] text-neutral-500 dark:text-neutral-400">
                    <span className="truncate">
                      {lastSynced ? `Synced: ${lastSynced}` : 'Live data connected'}
                    </span>
                    {onSync && (
                      <button
                        type="button"
                        onClick={onSync}
                        disabled={isSyncing}
                        className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer disabled:opacity-50"
                      >
                        {isSyncing ? 'Syncing...' : 'Sync Now'}
                      </button>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {onOpenNotifications && (
            <button
              type="button"
              onClick={onOpenNotifications}
              className="relative flex h-7.5 w-7.5 items-center justify-center rounded-lg text-xs font-medium transition-all cursor-pointer active:scale-95 text-neutral-700 dark:text-neutral-200 hover:bg-white dark:hover:bg-white/[0.1] hover:shadow-2xs"
              title={`Alerts & Notifications (${unreadNotificationsCount} unread)`}
              aria-label="Open notifications"
            >
              <Bell className="h-3.5 w-3.5 text-neutral-600 dark:text-neutral-300" />
              {unreadNotificationsCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-[#FF3B30] px-1 text-[9px] font-bold text-white shadow-2xs">
                  {unreadNotificationsCount > 99 ? '99+' : unreadNotificationsCount}
                </span>
              )}
            </button>
          )}

          {setIsDarkMode && (
            <button
              type="button"
              onClick={() => setIsDarkMode(!isDarkMode)}
              className="flex h-7.5 w-7.5 items-center justify-center rounded-lg text-xs font-medium transition-all cursor-pointer active:scale-95 text-neutral-700 dark:text-neutral-200 hover:bg-white dark:hover:bg-white/[0.1] hover:shadow-2xs"
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
        {/* ── 4. APPLE HIG ACCOUNT CAPSULE & REDESIGNED POPOVER ──                */}
        {/* ======================================================================= */}
        <div className="relative" ref={userMenuRef}>
          <button
            type="button"
            onClick={() => setIsUserMenuOpen(prev => !prev)}
            className={`group flex items-center gap-2 h-8 pl-1 pr-2.5 rounded-full border transition-all cursor-pointer active:scale-95 ${isUserMenuOpen
              ? 'bg-white dark:bg-white/[0.12] border-black/[0.15] dark:border-white/[0.2] shadow-xs'
              : 'bg-white/60 hover:bg-white/90 dark:bg-white/[0.05] dark:hover:bg-white/[0.09] border-black/[0.07] hover:border-black/[0.12] dark:border-white/[0.08] dark:hover:border-white/[0.14] shadow-2xs'
              }`}
            title={`${displayName} — ${displayRole}`}
            aria-expanded={isUserMenuOpen}
            aria-haspopup="true"
          >
            <div className="relative shrink-0">
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-tr from-[#0066FF] to-[#43B4FF] text-[10.5px] font-bold text-white shadow-2xs">
                {initials}
              </div>
              <span className="absolute -bottom-0.5 -right-0.5 h-2 w-2 rounded-full bg-emerald-500 ring-1 ring-white dark:ring-[#0E0F12]" />
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

          {/* Redesigned Apple HIG Popover Menu */}
          <AnimatePresence>
            {isUserMenuOpen && (
              <motion.div
                initial={{ opacity: 0, scale: 0.96, y: -4 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.96, y: -4 }}
                transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
                className="absolute right-0 top-full mt-2 w-72 rounded-2xl border p-2 shadow-[0_20px_50px_rgba(0,0,0,0.16)] dark:shadow-[0_24px_64px_rgba(0,0,0,0.7)] z-50 backdrop-blur-3xl bg-white/95 dark:bg-[#161822]/95 border-black/[0.08] dark:border-white/[0.12] text-slate-900 dark:text-white"
              >
                {/* Account Details Header: Apple ID style */}
                <div className="p-2.5 rounded-xl bg-black/[0.02] dark:bg-white/[0.03] border border-black/[0.04] dark:border-white/[0.05]">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-tr from-[#0066FF] to-[#43B4FF] text-xs font-bold text-white shadow-2xs ring-1 ring-white/20">
                      {initials}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="font-semibold text-[13.5px] text-neutral-900 dark:text-white truncate leading-tight">
                        {displayName}
                      </div>
                      <div className="truncate text-[11px] text-neutral-500 dark:text-neutral-400 font-mono mt-0.5">
                        {displayEmail}
                      </div>
                    </div>
                  </div>

                  <div className="mt-2.5 pt-2 border-t border-black/[0.04] dark:border-white/[0.06] flex items-center justify-between">
                    <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-blue-500/10 text-[9.5px] font-bold text-blue-600 dark:text-blue-400 tracking-wider uppercase border border-blue-500/20">
                      {displayRole}
                    </span>
                    <span className="flex items-center gap-1.5 text-[10.5px] text-emerald-600 dark:text-emerald-400 font-medium">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" /> Online
                    </span>
                  </div>
                </div>

                {/* Apple Standard Menu Actions */}
                <div className="mt-1.5 space-y-0.5">
                  {onOpenSecurityModal && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsUserMenuOpen(false);
                        onOpenSecurityModal();
                      }}
                      className="group flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-xs font-medium transition-colors hover:bg-black/[0.04] dark:hover:bg-white/[0.08] text-neutral-700 dark:text-neutral-200 cursor-pointer active:scale-[0.99]"
                    >
                      <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                        <ShieldCheck className="h-3.5 w-3.5" />
                      </div>
                      <span className="flex-1 text-left">Security & Sessions</span>
                      <ChevronRight className="h-3 w-3 text-neutral-400 opacity-50 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all" />
                    </button>
                  )}

                  {onSignOut && (
                    <>
                      <div className="h-px bg-black/[0.06] dark:bg-white/[0.08] my-1 mx-1" />
                      <button
                        type="button"
                        onClick={() => {
                          setIsUserMenuOpen(false);
                          onSignOut();
                        }}
                        className="group flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-xs font-semibold text-[#FF3B30] hover:bg-[#FF3B30]/10 transition-colors cursor-pointer active:scale-[0.99]"
                      >
                        <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-[#FF3B30]/10 text-[#FF3B30]">
                          <LogOut className="h-3.5 w-3.5" />
                        </div>
                        <span className="flex-1 text-left">Sign Out</span>
                      </button>
                    </>
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
