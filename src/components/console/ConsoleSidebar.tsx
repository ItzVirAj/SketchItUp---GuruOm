import React, { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  ChevronDown,
  ChevronRight,
  LayoutGrid,
  LogOut,
  PanelLeftClose,
  PanelLeftOpen,
  ShieldCheck,
  Search,
  Sun,
  Moon,
  Bell,
  RefreshCw
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { ConsoleUser, ConsoleView, UserRole } from '../../types/console';
import { useSmoothScroll } from '../../hooks/useSmoothScroll';
import { isViewAllowedForUser } from '../../utils/permissions';
import { findParentSectionId, NAVIGATION_SECTIONS } from '../../utils/navigationConfig';

interface ConsoleSidebarProps {
  currentView: ConsoleView;
  setCurrentView: (view: ConsoleView) => void;
  isDarkMode: boolean;
  setIsDarkMode?: (dark: boolean) => void;
  currentRole?: UserRole;
  currentUser?: ConsoleUser | null;
  userName?: string;
  onSignOut?: () => void;
  onOpenSecurityModal?: () => void;
  isOpenMobile?: boolean;
  setIsOpenMobile?: (open: boolean) => void;
  onOpenCommandPalette?: () => void;
  onSync?: () => void;
  isSyncing?: boolean;
  lastSynced?: string;
  onOpenNotifications?: () => void;
  unreadNotificationsCount?: number;
}

export const ConsoleSidebar: React.FC<ConsoleSidebarProps> = ({
  currentView,
  setCurrentView,
  isDarkMode,
  setIsDarkMode,
  currentRole = 'SUPER ADMIN',
  currentUser,
  userName = 'Sachin Gharbude',
  onSignOut,
  onOpenSecurityModal,
  setIsOpenMobile,
  onOpenCommandPalette,
  onSync,
  isSyncing = false,
  lastSynced,
  onOpenNotifications,
  unreadNotificationsCount = 0,
}) => {
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const [isCollapsed, setIsCollapsed] = useState<boolean>(() => {
    try {
      return JSON.parse(localStorage.getItem('guruom_sidebar_collapsed') || 'false');
    } catch {
      return false;
    }
  });
  const [openSections, setOpenSections] = useState<Record<string, boolean>>(() => {
    const activeParent = findParentSectionId(currentView);
    return Object.fromEntries(
      NAVIGATION_SECTIONS.map(section => [
        section.id,
        section.id === activeParent || section.id === 'operations-reports',
      ]),
    );
  });
  const [hoveredSection, setHoveredSection] = useState<string | null>(null);

  useSmoothScroll(scrollContainerRef, [openSections, isCollapsed], {
    duration: 1.1,
    wheelMultiplier: 0.95,
    touchMultiplier: 1.25,
  });

  useEffect(() => {
    const parent = findParentSectionId(currentView);
    if (parent) setOpenSections(previous => ({ ...previous, [parent]: true }));
  }, [currentView]);

  const toggleCollapse = () => {
    setIsCollapsed(previous => {
      const next = !previous;
      localStorage.setItem('guruom_sidebar_collapsed', JSON.stringify(next));
      return next;
    });
    setHoveredSection(null);
  };

  const handleSelectView = (view: ConsoleView) => {
    setCurrentView(view);
    setIsOpenMobile?.(false);
    setHoveredSection(null);
  };

  const { profile: authProfile } = useAuth();
  const activeUser = currentUser || authProfile;
  const displayName = activeUser?.name || (activeUser as any)?.fullName || userName || 'GuruOm Admin';
  const displayEmail = activeUser?.email || 'owner@guruom.in';
  const displayRole = activeUser?.role || currentRole || 'SUPER ADMIN';
  const initials = (displayName || 'GO')
    .split(' ')
    .filter(Boolean)
    .map(part => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase() || 'GO';

  const navButtonClass = (active: boolean) =>
    `sidebar-module-btn group relative flex w-full items-center rounded-xl transition-all duration-150 cursor-pointer active:scale-[0.98] ${
      isCollapsed ? 'h-11 justify-center px-2' : 'h-11 gap-3 px-3.5'
    } ${
      active
        ? 'is-active bg-white text-black font-bold shadow-md shadow-white/10'
        : 'text-white hover:bg-white/15'
    }`;

  return (
    <aside
      className={`hidden h-full shrink-0 font-sans transition-[width] duration-300 lg:flex select-none ${
        isCollapsed ? 'w-[84px]' : 'w-[290px]'
      }`}
    >
      <div className="console-sidebar relative flex h-full w-full flex-col bg-black text-white border border-white/15 rounded-2xl lg:rounded-3xl select-none overflow-hidden shadow-2xl">

        {/* ========================================================================= */}
        {/* ── TOP: BRAND & COLLAPSE TRIGGER ──                                       */}
        {/* ========================================================================= */}
        <div
          className={`flex h-[76px] shrink-0 items-center border-b border-white/10 ${
            isCollapsed ? 'justify-center px-2.5' : 'justify-between px-4'
          }`}
        >
          {!isCollapsed ? (
            <div className="flex min-w-0 items-center gap-3">
              {/* Logo beside OwnerOS */}
              <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-black border border-white/20 p-1 shadow-md overflow-hidden">
                <img
                  src="/logo.png"
                  alt="OwnerOS Logo"
                  className="h-full w-full object-contain"
                />
              </div>
              <div className="flex flex-col min-w-0">
                <span className="truncate text-2xl font-black tracking-tight text-white leading-tight">
                  OwnerOS
                </span>
                <span className="text-[12px] font-bold tracking-tight text-[#3B82F6] truncate leading-tight mt-0.5">
                  SketchitUp Solutions
                </span>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={toggleCollapse}
              className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-black border border-white/20 p-1 shadow-md overflow-hidden hover:border-white/40 transition-all cursor-pointer"
              title="Expand sidebar - OwnerOS"
            >
              <img
                src="/logo.png"
                alt="OwnerOS Logo"
                className="h-full w-full object-contain"
              />
            </button>
          )}

          {!isCollapsed && (
            <button
              type="button"
              onClick={toggleCollapse}
              className="flex h-8.5 w-8.5 shrink-0 items-center justify-center rounded-lg border border-white/15 bg-white/[0.06] text-white hover:bg-white/20 hover:text-white transition-all active:scale-95 cursor-pointer shadow-xs"
              title="Collapse sidebar"
            >
              <PanelLeftClose className="h-4.5 w-4.5" />
            </button>
          )}
        </div>

        {/* ========================================================================= */}
        {/* ── SEARCH BAR (Spotlight Command Palette Trigger) ──                      */}
        {/* ========================================================================= */}
        <div className="shrink-0 px-3.5 pt-3 pb-2.5 border-b border-white/10">
          {!isCollapsed ? (
            <button
              type="button"
              onClick={onOpenCommandPalette}
              className="group flex h-10 w-full items-center justify-between rounded-xl border border-white/15 bg-white/[0.06] px-3.5 text-xs text-white/90 hover:border-white/30 hover:bg-white/15 hover:text-white transition-all cursor-pointer shadow-xs active:scale-[0.99]"
              title="Spotlight search (⌘K / Ctrl+K)"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <Search className="h-4 w-4 shrink-0 text-white/80 group-hover:text-white transition-colors" />
                <span className="truncate text-white/90 group-hover:text-white font-medium text-[13.5px]">
                  Search orders, stock, jobs...
                </span>
              </div>
              <kbd className="flex items-center gap-0.5 rounded-md border border-white/20 bg-white/10 px-1.5 py-0.5 text-[11px] font-mono text-white font-bold group-hover:bg-white/20">
                <span>⌘</span>
                <span>K</span>
              </kbd>
            </button>
          ) : (
            <div className="flex justify-center">
              <button
                type="button"
                onClick={onOpenCommandPalette}
                className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/15 bg-white/[0.06] text-white hover:border-white/30 hover:bg-white/15 transition-all active:scale-95 cursor-pointer shadow-xs"
                title="Search orders, stock, jobs... (⌘K)"
              >
                <Search className="h-4.5 w-4.5" />
              </button>
            </div>
          )}
        </div>

        {/* ========================================================================= */}
        {/* ── MIDDLE: SCROLLABLE NAVIGATION TREE ──                                  */}
        {/* ========================================================================= */}
        <div ref={scrollContainerRef} data-lenis-prevent="true" className="no-scrollbar flex-1 overflow-y-auto px-3.5 py-4 space-y-4">

          {/* Workspace Root */}
          <div>
            {!isCollapsed && (
              <div className="mb-2 px-2 font-mono text-[11px] font-bold uppercase tracking-[0.16em] text-white">
                Workspace
              </div>
            )}

            <button
              type="button"
              onClick={() => handleSelectView('command-centre')}
              className={navButtonClass(currentView === 'command-centre')}
              title="Command Centre"
            >
              <LayoutGrid className="h-5 w-5 shrink-0" />
              {!isCollapsed && (
                <>
                  <span className="flex-1 text-left text-sm sm:text-[14.5px] font-semibold">Command Centre</span>
                  <span className={`flex items-center gap-1 font-mono text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                    currentView === 'command-centre' ? 'bg-black text-white' : 'bg-emerald-600 text-white'
                  }`}>
                    <span className="h-1.5 w-1.5 rounded-full bg-white animate-pulse" /> Live
                  </span>
                </>
              )}
            </button>
          </div>

          {/* Departments */}
          <div>
            {!isCollapsed && (
              <div className="mb-2 px-2 flex items-center justify-between font-mono text-[11px] font-bold uppercase tracking-[0.16em] text-white">
                <span>Departments</span>
                <span className="rounded-full px-2 py-0.5 border border-white/20 bg-white/10 text-white font-mono text-[10px] font-bold">
                  {NAVIGATION_SECTIONS.length}
                </span>
              </div>
            )}

            <div className="space-y-1.5">
              {NAVIGATION_SECTIONS.map(section => {
                const SectionIcon = section.icon;
                const allowedItems = section.items.filter(item => isViewAllowedForUser(currentUser || { role: displayRole }, item.id));
                if (allowedItems.length === 0) return null;

                const isOpen = openSections[section.id] ?? false;
                const hasActiveChild = allowedItems.some(item => item.id === currentView || (currentView === 'order-detail' && item.id === 'orders'));

                return (
                  <div
                    key={section.id}
                    className="relative"
                    onMouseEnter={() => isCollapsed && setHoveredSection(section.id)}
                    onMouseLeave={() => isCollapsed && setHoveredSection(null)}
                  >
                    <button
                      type="button"
                      onClick={() => {
                        if (isCollapsed) {
                          setIsCollapsed(false);
                          localStorage.setItem('guruom_sidebar_collapsed', 'false');
                          setOpenSections(previous => ({ ...previous, [section.id]: true }));
                        } else {
                          setOpenSections(previous => ({ ...previous, [section.id]: !isOpen }));
                        }
                      }}
                      className={`sidebar-module-btn group relative flex w-full items-center rounded-xl transition-all duration-150 cursor-pointer active:scale-[0.98] ${
                        isCollapsed ? 'h-11 justify-center px-2' : 'h-11 gap-3 px-3.5'
                      } ${
                        hasActiveChild
                          ? 'border border-white/25 bg-white/[0.12] text-white font-semibold shadow-xs'
                          : 'border border-transparent text-white hover:text-white hover:bg-white/15'
                      }`}
                      title={isCollapsed ? section.label : undefined}
                    >
                      <SectionIcon className="h-5 w-5 shrink-0 text-white" />
                      {!isCollapsed && (
                        <>
                          <span className="min-w-0 flex-1 truncate text-left text-sm sm:text-[14.5px] font-semibold">{section.label}</span>
                          <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180 text-white' : 'text-white/70 group-hover:text-white'}`} />
                        </>
                      )}
                    </button>

                    <AnimatePresence initial={false}>
                      {!isCollapsed && isOpen && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
                          className="overflow-hidden"
                        >
                          <div className="relative ml-4 space-y-1 py-1.5 pl-3 border-l border-white/15">
                            {allowedItems.map(item => {
                              const ItemIcon = item.icon;
                              const isActive = currentView === item.id || (currentView === 'order-detail' && item.id === 'orders');
                              return (
                                <button
                                  key={item.id}
                                  type="button"
                                  onClick={() => handleSelectView(item.id)}
                                  className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left transition-all cursor-pointer active:scale-[0.98] ${
                                    isActive
                                      ? 'is-active bg-white text-black font-bold shadow-sm'
                                      : 'text-white/90 hover:text-white hover:bg-white/15'
                                  }`}
                                >
                                  <ItemIcon className={`h-4 w-4 shrink-0 ${isActive ? 'text-black' : 'text-white'}`} />
                                  <span className="min-w-0 flex-1 truncate text-[13.5px] font-medium">{item.label}</span>
                                  {isActive && <ChevronRight className="h-3.5 w-3.5 shrink-0 text-black" />}
                                </button>
                              );
                            })}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* Collapsed Hover Flyout */}
                    {isCollapsed && hoveredSection === section.id && (
                      <div className="absolute left-full top-0 z-50 ml-3 w-64 overflow-hidden rounded-2xl border border-white/20 bg-black p-3 text-white shadow-2xl backdrop-blur-3xl">
                        <div className="flex items-center gap-2.5 border-b border-white/15 px-3 py-2 text-[13.5px] font-bold text-white">
                          <SectionIcon className="h-4.5 w-4.5 text-[#3B82F6]" />
                          <span>{section.label}</span>
                        </div>
                        <div className="space-y-1 pt-2">
                          {allowedItems.map(item => {
                            const ItemIcon = item.icon;
                            const isActive = currentView === item.id || (currentView === 'order-detail' && item.id === 'orders');
                            return (
                              <button
                                key={item.id}
                                type="button"
                                onClick={() => handleSelectView(item.id)}
                                className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-[13px] font-semibold transition-all cursor-pointer ${
                                  isActive
                                    ? 'bg-white text-black shadow-sm'
                                    : 'text-white hover:bg-white/15'
                                }`}
                              >
                                <ItemIcon className="h-4 w-4 shrink-0" />
                                <span className="truncate">{item.label}</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

        </div>

        {/* ========================================================================= */}
        {/* ── BOTTOM: APPLE HIG UNIFIED ACCOUNT & SYSTEM CONTROL DECK ──              */}
        {/* ========================================================================= */}
        <div className="shrink-0 border-t border-white/[0.08] p-3 bg-gradient-to-b from-white/[0.015] to-white/[0.04] backdrop-blur-xl">
          {!isCollapsed ? (
            <div className="flex flex-col gap-2">
              {/* ── Apple Account Card ── */}
              <div className="group relative flex items-center justify-between p-2 rounded-2xl bg-white/[0.04] hover:bg-white/[0.07] border border-white/[0.08] hover:border-white/15 transition-all duration-200">
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                  {/* Avatar with Apple subtle ring & status indicator */}
                  <div className="relative shrink-0">
                    <div className="flex h-9.5 w-9.5 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 via-blue-600 to-indigo-700 text-[11px] font-bold text-white shadow-sm ring-1 ring-white/20">
                      {initials}
                    </div>
                    <span
                      className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-emerald-400 ring-2 ring-black"
                      title="Online"
                    />
                  </div>

                  {/* Name & Role */}
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[13px] font-semibold text-white tracking-tight leading-snug">
                      {displayName}
                    </div>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded-md bg-blue-500/15 text-[9.5px] font-bold text-blue-400 tracking-wider uppercase border border-blue-500/20">
                        {displayRole}
                      </span>
                      <span className="truncate text-[10.5px] text-white/40 font-mono">
                        {displayEmail.split('@')[0]}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Apple Quick Account Actions (Security & Sign Out) */}
                <div className="flex items-center gap-0.5 shrink-0 ml-1">
                  {onOpenSecurityModal && (
                    <button
                      type="button"
                      onClick={onOpenSecurityModal}
                      className="flex h-7.5 w-7.5 items-center justify-center rounded-lg text-white/60 hover:text-emerald-300 hover:bg-white/10 active:scale-95 transition-all cursor-pointer"
                      title="Security & Sessions"
                      aria-label="Security and sessions"
                    >
                      <ShieldCheck className="h-4 w-4 text-emerald-400" />
                    </button>
                  )}
                  {onSignOut && (
                    <button
                      type="button"
                      onClick={onSignOut}
                      className="flex h-7.5 w-7.5 items-center justify-center rounded-lg text-rose-400/80 hover:text-rose-200 hover:bg-rose-500/15 active:scale-95 transition-all cursor-pointer"
                      title="Sign out of OwnerOS"
                      aria-label="Sign out"
                    >
                      <LogOut className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* ── Apple Segmented Control Bar (Sync, Alerts, Theme) ── */}
              <div className="grid grid-cols-3 gap-1 p-1 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                {/* Sync */}
                {onSync && (
                  <button
                    type="button"
                    onClick={onSync}
                    disabled={isSyncing}
                    className="flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-white/80 hover:text-white hover:bg-white/[0.08] active:scale-95 transition-all cursor-pointer disabled:opacity-40"
                    title={lastSynced ? `Synced: ${lastSynced}` : 'Sync live data'}
                    aria-label="Sync data"
                  >
                    <RefreshCw className={`h-3.5 w-3.5 ${isSyncing ? 'animate-spin text-blue-400' : 'text-white/70'}`} />
                    <span className="text-[11px] font-medium tracking-tight">Sync</span>
                  </button>
                )}

                {/* Notifications / Alerts */}
                {onOpenNotifications && (
                  <button
                    type="button"
                    onClick={onOpenNotifications}
                    className="relative flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-white/80 hover:text-white hover:bg-white/[0.08] active:scale-95 transition-all cursor-pointer"
                    title="Notifications & Alerts"
                    aria-label="Open notifications"
                  >
                    <div className="relative flex items-center justify-center">
                      <Bell className="h-3.5 w-3.5 text-white/70" />
                      {unreadNotificationsCount > 0 && (
                        <span className="absolute -top-1 -right-1.5 flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-rose-500 px-0.5 text-[8.5px] font-extrabold text-white shadow-xs">
                          {unreadNotificationsCount > 99 ? '99+' : unreadNotificationsCount}
                        </span>
                      )}
                    </div>
                    <span className="text-[11px] font-medium tracking-tight">Alerts</span>
                  </button>
                )}

                {/* Theme Toggle */}
                {setIsDarkMode && (
                  <button
                    type="button"
                    onClick={() => setIsDarkMode(!isDarkMode)}
                    className="flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-white/80 hover:text-white hover:bg-white/[0.08] active:scale-95 transition-all cursor-pointer"
                    title={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
                    aria-label="Toggle theme"
                  >
                    {isDarkMode ? (
                      <>
                        <Moon className="h-3.5 w-3.5 text-blue-400" />
                        <span className="text-[11px] font-medium tracking-tight">Dark</span>
                      </>
                    ) : (
                      <>
                        <Sun className="h-3.5 w-3.5 text-amber-400" />
                        <span className="text-[11px] font-medium tracking-tight">Light</span>
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          ) : (
            /* Collapsed Mode */
            <div className="flex flex-col items-center gap-2">
              <div className="relative">
                <div
                  className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 via-blue-600 to-indigo-700 text-xs font-bold text-white shadow-sm ring-1 ring-white/20"
                  title={`${displayName} — ${displayRole}`}
                >
                  {initials}
                </div>
                <span
                  className="absolute -bottom-0.5 -right-0.5 h-2 w-2 rounded-full bg-emerald-400 ring-2 ring-black"
                  title="Online"
                />
              </div>

              <div className="w-full flex flex-col items-center gap-1.5 pt-1 border-t border-white/[0.08]">
                {onSync && (
                  <button
                    type="button"
                    onClick={onSync}
                    disabled={isSyncing}
                    className="flex h-8 w-8 items-center justify-center rounded-lg text-white/70 hover:text-white hover:bg-white/[0.08] active:scale-95 transition-all cursor-pointer disabled:opacity-40"
                    title={lastSynced ? `Sync (Last: ${lastSynced})` : 'Sync live data'}
                    aria-label="Sync data"
                  >
                    <RefreshCw className={`h-3.5 w-3.5 ${isSyncing ? 'animate-spin text-blue-400' : ''}`} />
                  </button>
                )}

                {onOpenNotifications && (
                  <button
                    type="button"
                    onClick={onOpenNotifications}
                    className="relative flex h-8 w-8 items-center justify-center rounded-lg text-white/70 hover:text-white hover:bg-white/[0.08] active:scale-95 transition-all cursor-pointer"
                    title="Notifications & Alerts"
                    aria-label="Open notifications"
                  >
                    <Bell className="h-3.5 w-3.5" />
                    {unreadNotificationsCount > 0 && (
                      <span className="absolute -top-0.5 -right-0.5 flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-rose-500 px-0.5 text-[8px] font-bold text-white shadow-xs">
                        {unreadNotificationsCount > 99 ? '99+' : unreadNotificationsCount}
                      </span>
                    )}
                  </button>
                )}

                {setIsDarkMode && (
                  <button
                    type="button"
                    onClick={() => setIsDarkMode(!isDarkMode)}
                    className="flex h-8 w-8 items-center justify-center rounded-lg text-white/70 hover:text-white hover:bg-white/[0.08] active:scale-95 transition-all cursor-pointer"
                    title={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
                    aria-label="Toggle theme"
                  >
                    {isDarkMode ? <Moon className="h-3.5 w-3.5 text-blue-400" /> : <Sun className="h-3.5 w-3.5 text-amber-400" />}
                  </button>
                )}

                {onOpenSecurityModal && (
                  <button
                    type="button"
                    onClick={onOpenSecurityModal}
                    className="flex h-8 w-8 items-center justify-center rounded-lg text-white/70 hover:text-emerald-300 hover:bg-white/[0.08] active:scale-95 transition-all cursor-pointer"
                    title="Security & Sessions"
                    aria-label="Security and sessions"
                  >
                    <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
                  </button>
                )}

                {onSignOut && (
                  <button
                    type="button"
                    onClick={onSignOut}
                    className="flex h-8 w-8 items-center justify-center rounded-lg text-rose-400/80 hover:text-rose-300 hover:bg-rose-500/15 active:scale-95 transition-all cursor-pointer"
                    title="Sign out of OwnerOS"
                    aria-label="Sign out"
                  >
                    <LogOut className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

      </div>
    </aside>
  );
};

export default ConsoleSidebar;