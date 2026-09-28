import React, { useState, useRef, useEffect } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  Bell,
  RefreshCw,
  Sun,
  Moon,
  Search,
  UserCircle,
  LogOut,
  Menu,
  ChevronRight,
  ChevronDown,
  Palette,
  Check
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
  onOpenSwitchUser: _onOpenSwitchUser,
  onSignOut,
  orderPo
}) => {
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement | null>(null);
  const [isThemeOpen, setIsThemeOpen] = useState(false);

  const { setAccent, isGreen, isBlue, isCrystal } = useAccentTheme();

  // Close dropdowns on outside click or Escape key
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setIsUserMenuOpen(false);
        setIsThemeOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsUserMenuOpen(false);
        setIsThemeOpen(false);
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

  // Icon button shared style — quiet, consistent
  const iconBtnClass = `flex h-8 w-8 items-center justify-center rounded-lg transition-colors duration-100 cursor-pointer active:scale-95 text-neutral-500 dark:text-neutral-400 hover:text-neutral-800 dark:hover:text-neutral-100 hover:bg-black/[0.05] dark:hover:bg-white/[0.07]`;

  return (
    <header className="relative z-30 shrink-0 h-[48px] w-full select-none font-sans px-4 sm:px-5 flex items-center justify-between bg-white dark:bg-[#111215] border-b border-[#E5E2D9] dark:border-[#22242B] text-neutral-900 dark:text-neutral-100">

      {/* ── 1. LEADING: BREADCRUMB NAVIGATION ── */}
      <div className="flex items-center gap-1 sm:gap-1.5 min-w-0">
        {onToggleMobileMenu && (
          <button
            type="button"
            onClick={onToggleMobileMenu}
            className={`${iconBtnClass} lg:hidden mr-1`}
            aria-label="Open sidebar drawer"
          >
            <Menu className="h-4 w-4" />
          </button>
        )}

        <nav aria-label="Breadcrumb" className="flex items-center gap-0.5 text-[13px] min-w-0">
          {cleanModule !== 'Workspace' && (
            <>
              <button
                type="button"
                onClick={() => onNavigate?.(getModuleDefaultView(cleanModule))}
                className="px-1.5 py-0.5 rounded-md font-medium text-neutral-400 dark:text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300 hover:bg-black/[0.04] dark:hover:bg-white/[0.05] transition-colors cursor-pointer truncate max-w-[120px]"
                title={`Navigate to ${cleanModule}`}
              >
                {cleanModule}
              </button>

              <ChevronRight className="h-3 w-3 text-neutral-300 dark:text-neutral-600 shrink-0" />
            </>
          )}

          <button
            type="button"
            onClick={() => onNavigate?.(currentView)}
            className={`px-1.5 py-0.5 rounded-md text-[13px] transition-colors cursor-pointer truncate max-w-[200px] ${breadcrumbs.detailLabel
              ? 'font-medium text-neutral-500 dark:text-neutral-400 hover:text-neutral-800 dark:hover:text-neutral-200 hover:bg-black/[0.04] dark:hover:bg-white/[0.05]'
              : 'font-semibold text-neutral-900 dark:text-white'
              }`}
          >
            {cleanSubmodule}
          </button>

          {breadcrumbs.detailLabel && (
            <>
              <ChevronRight className="h-3 w-3 text-neutral-300 dark:text-neutral-600 shrink-0" />
              <span className="inline-flex items-center px-1.5 py-0.5 rounded font-mono text-[11px] font-medium tracking-tight text-blue-600 dark:text-blue-400 bg-blue-500/8 dark:bg-blue-400/10 truncate max-w-[160px]">
                {breadcrumbs.detailLabel}
              </span>
            </>
          )}
        </nav>
      </div>

      {/* ── 2. CENTER: SEARCH ── */}
      <div className="hidden md:flex items-center justify-center flex-1 max-w-[340px] mx-auto px-6">
        <button
          type="button"
          onClick={onOpenCommandPalette}
          className="group flex h-[32px] w-full items-center justify-between rounded-lg px-3 cursor-pointer text-[12px] bg-neutral-100 dark:bg-white/[0.06] hover:bg-neutral-200/80 dark:hover:bg-white/[0.09] border border-neutral-200/80 dark:border-white/[0.08] text-neutral-400 dark:text-neutral-500 transition-colors duration-100 active:scale-[0.995]"
          title="Search (⌘K)"
        >
          <div className="flex items-center gap-2 min-w-0">
            <Search className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">Search orders, stock, jobs…</span>
          </div>

          <kbd className="hidden sm:inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-mono font-medium bg-white dark:bg-white/[0.08] text-neutral-500 dark:text-neutral-400 border border-neutral-200 dark:border-white/[0.1]">
            ⌘K
          </kbd>
        </button>
      </div>

      {/* ── 3. TRAILING: ACTIONS + AVATAR ── */}
      <div className="flex items-center gap-1 shrink-0">
        {/* Mobile Search */}
        <button
          type="button"
          onClick={onOpenCommandPalette}
          className={`${iconBtnClass} md:hidden`}
          title="Search (⌘K)"
          aria-label="Search"
        >
          <Search className="h-4 w-4" />
        </button>

        {/* Sync */}
        {onSync && (
          <button
            type="button"
            onClick={onSync}
            disabled={isSyncing}
            className={`${iconBtnClass} disabled:opacity-30`}
            title={lastSynced ? `Synced: ${lastSynced}` : 'Sync data'}
            aria-label="Sync live data"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isSyncing ? 'animate-spin text-blue-500' : ''}`} />
          </button>
        )}

        {/* Notifications */}
        {onOpenNotifications && (
          <button
            type="button"
            onClick={onOpenNotifications}
            className={`${iconBtnClass} relative`}
            title={`Notifications (${unreadNotificationsCount} unread)`}
            aria-label="Open notifications"
          >
            <Bell className="h-3.5 w-3.5" />
            {unreadNotificationsCount > 0 && (
              <span className="absolute top-1 right-1 flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-60 animate-ping" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-red-500" />
              </span>
            )}
          </button>
        )}

        {/* Theme toggle */}
        {setIsDarkMode && (
          <button
            type="button"
            onClick={() => setIsDarkMode(!isDarkMode)}
            className={iconBtnClass}
            title={isDarkMode ? 'Light mode' : 'Dark mode'}
            aria-label="Toggle color theme"
          >
            {isDarkMode
              ? <Sun className="h-3.5 w-3.5 text-amber-400" />
              : <Moon className="h-3.5 w-3.5" />
            }
          </button>
        )}

        {/* Separator */}
        <div className="h-5 w-px bg-neutral-200 dark:bg-white/[0.08] mx-1.5 hidden sm:block" />

        {/* ── 4. ACCOUNT AVATAR & MENU ── */}
        <div className="relative" ref={userMenuRef}>
          <button
            type="button"
            onClick={() => setIsUserMenuOpen(prev => !prev)}
            className={`flex h-8 w-8 items-center justify-center rounded-full cursor-pointer transition-all duration-100 active:scale-95 ring-1 ring-transparent ${isUserMenuOpen
              ? 'ring-neutral-300 dark:ring-neutral-600'
              : 'hover:ring-neutral-200 dark:hover:ring-neutral-700'
              }`}
            title={`${displayName} — ${displayRole}`}
            aria-expanded={isUserMenuOpen}
            aria-haspopup="true"
          >
            <div className="relative">
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-neutral-800 dark:bg-neutral-200 text-[10px] font-semibold text-white dark:text-neutral-800 tracking-tight">
                {initials}
              </div>
              <span className="absolute -bottom-px -right-px h-2 w-2 rounded-full bg-emerald-500 ring-[1.5px] ring-white dark:ring-[#111215]" />
            </div>
          </button>

          {/* Account Popover */}
          <AnimatePresence>
            {isUserMenuOpen && (
              <motion.div
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.12, ease: [0.2, 1, 0.4, 1] }}
                className="absolute right-0 top-full mt-2 w-72 rounded-xl border p-1.5 z-50 bg-white dark:bg-[#18191F] border-neutral-200 dark:border-neutral-800 shadow-lg shadow-black/[0.08] dark:shadow-black/[0.5] text-neutral-900 dark:text-neutral-100"
              >
                {/* Identity header */}
                <div className="px-3 py-2.5 mb-0.5">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-neutral-800 dark:bg-neutral-200 text-[11px] font-semibold text-white dark:text-neutral-800 tracking-tight">
                      {initials}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="font-semibold text-[13px] text-neutral-900 dark:text-white truncate leading-tight">
                        {displayName}
                      </div>
                      <div className="truncate text-[11px] text-neutral-400 dark:text-neutral-500 mt-0.5">
                        {displayEmail}
                      </div>
                    </div>
                  </div>
                  <div className="mt-2 flex items-center justify-between">
                    <span className="text-[10px] font-medium text-neutral-400 dark:text-neutral-500 tracking-wide">
                      {displayRole}
                    </span>
                    <span className="flex items-center gap-1.5 text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Online
                    </span>
                  </div>
                </div>

                <div className="h-px bg-neutral-100 dark:bg-white/[0.06] mx-1" />

                {/* Menu items */}
                <div className="py-1 space-y-0.5">
                  {onNavigate && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsUserMenuOpen(false);
                        onNavigate('account');
                      }}
                      className="group flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-[12.5px] font-medium transition-colors hover:bg-neutral-50 dark:hover:bg-white/[0.06] text-neutral-700 dark:text-neutral-300 cursor-pointer"
                    >
                      <UserCircle className="h-4 w-4 text-neutral-400 dark:text-neutral-500" />
                      <span className="flex-1 text-left">My account</span>
                      <ChevronRight className="h-3 w-3 text-neutral-300 dark:text-neutral-600 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </button>
                  )}

                  {/* Theme */}
                  <button
                    type="button"
                    onClick={() => setIsThemeOpen(prev => !prev)}
                    className={`group flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-[12.5px] font-medium transition-colors cursor-pointer ${
                      isThemeOpen
                        ? 'bg-neutral-50 dark:bg-white/[0.06] text-neutral-900 dark:text-white'
                        : 'hover:bg-neutral-50 dark:hover:bg-white/[0.06] text-neutral-700 dark:text-neutral-300'
                    }`}
                    aria-expanded={isThemeOpen}
                    aria-label="Set theme"
                  >
                    <Palette className="h-4 w-4 text-neutral-400 dark:text-neutral-500" />
                    <span className="flex-1 text-left">Theme</span>
                    <span className="text-[10px] text-neutral-400 dark:text-neutral-500 mr-0.5">
                      {isGreen ? 'Green' : isBlue ? 'Blue' : 'Crystal'}
                    </span>
                    <ChevronDown
                      className={`h-3 w-3 text-neutral-400 dark:text-neutral-500 transition-transform duration-150 ${
                        isThemeOpen ? 'rotate-180' : ''
                      }`}
                    />
                  </button>

                  {/* Theme panel */}
                  <AnimatePresence>
                    {isThemeOpen && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.15, ease: [0.2, 1, 0.4, 1] }}
                        className="overflow-hidden"
                      >
                        <div className="px-3 py-2 space-y-3">
                          {/* Accent */}
                          <div>
                            <div className="text-[10px] font-medium text-neutral-400 dark:text-neutral-500 mb-1.5">
                              Sidebar accent
                            </div>
                            <div className="flex gap-1.5">
                              {[
                                { key: 'green' as const, active: isGreen, gradient: 'from-[#0A7E58] to-[#044F36]', label: 'Green' },
                                { key: 'blue' as const, active: isBlue, gradient: 'from-[#1b64ff] to-[#0f52dc]', label: 'Blue' },
                                { key: 'crystal' as const, active: isCrystal, gradient: 'from-[#CBD5E1] to-[#94A3B8]', label: 'Crystal' },
                              ].map(opt => (
                                <button
                                  key={opt.key}
                                  type="button"
                                  onClick={() => setAccent(opt.key)}
                                  className={`flex items-center gap-1.5 px-2 py-1 rounded-md text-[11px] font-medium transition-all cursor-pointer active:scale-95 border ${
                                    opt.active
                                      ? 'bg-neutral-100 dark:bg-white/[0.08] border-neutral-300 dark:border-neutral-600 text-neutral-900 dark:text-white'
                                      : 'bg-transparent border-transparent hover:bg-neutral-50 dark:hover:bg-white/[0.04] text-neutral-500 dark:text-neutral-400'
                                  }`}
                                >
                                  <div className={`h-2.5 w-5 rounded-full bg-gradient-to-r ${opt.gradient}`} />
                                  {opt.label}
                                  {opt.active && <Check className="h-3 w-3 ml-auto" />}
                                </button>
                              ))}
                            </div>
                          </div>

                          {/* Appearance */}
                          {setIsDarkMode && (
                            <div>
                              <div className="text-[10px] font-medium text-neutral-400 dark:text-neutral-500 mb-1.5">
                                Appearance
                              </div>
                              <div className="flex gap-1.5 p-0.5 rounded-lg bg-neutral-100 dark:bg-white/[0.05]">
                                <button
                                  type="button"
                                  onClick={() => setIsDarkMode(false)}
                                  className={`flex-1 flex items-center justify-center gap-1.5 py-1 rounded-md text-[11px] font-medium transition-all cursor-pointer ${
                                    !isDarkMode
                                      ? 'bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white shadow-sm'
                                      : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200'
                                  }`}
                                >
                                  <Sun className="h-3 w-3 text-amber-500" />
                                  Light
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setIsDarkMode(true)}
                                  className={`flex-1 flex items-center justify-center gap-1.5 py-1 rounded-md text-[11px] font-medium transition-all cursor-pointer ${
                                    isDarkMode
                                      ? 'bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white shadow-sm'
                                      : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200'
                                  }`}
                                >
                                  <Moon className="h-3 w-3 text-blue-400" />
                                  Dark
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {onSignOut && (
                    <>
                      <div className="h-px bg-neutral-100 dark:bg-white/[0.06] mx-1 my-0.5" />
                      <button
                        type="button"
                        onClick={() => {
                          setIsUserMenuOpen(false);
                          onSignOut();
                        }}
                        className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-[12.5px] font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/[0.08] transition-colors cursor-pointer"
                      >
                        <LogOut className="h-4 w-4" />
                        <span className="flex-1 text-left">Sign out</span>
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
