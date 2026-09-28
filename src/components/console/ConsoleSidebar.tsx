import React, { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  ChevronDown,
  LayoutGrid,
  PanelLeftClose,
  PanelLeft,
  Search,
  Bell,
  RefreshCw,
  Sun,
  Moon,
  LogOut,
  Shield,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { ConsoleUser, ConsoleView, UserRole } from '../../types/console';
import { useSmoothScroll } from '../../hooks/useSmoothScroll';
import { isViewAllowedForUser } from '../../utils/permissions';
import {
  findParentSectionId,
  NAVIGATION_SECTIONS,
} from '../../utils/navigationConfig';

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

  // Collapsed state persisted in localStorage
  const [isCollapsed, setIsCollapsed] = useState<boolean>(() => {
    try {
      return JSON.parse(
        localStorage.getItem('guruom_sidebar_collapsed') || 'false'
      );
    } catch {
      return false;
    }
  });

  // Open navigation sections
  const [openSections, setOpenSections] = useState<Record<string, boolean>>(
    () => {
      const activeParent = findParentSectionId(currentView);
      return Object.fromEntries(
        NAVIGATION_SECTIONS.map(section => [
          section.id,
          section.id === activeParent || section.id === 'operations-reports',
        ])
      );
    }
  );

  // Track hover flyout in collapsed mode
  const [hoveredSection, setHoveredSection] = useState<string | null>(null);

  // Smooth scroll
  useSmoothScroll(scrollContainerRef, [openSections, isCollapsed], {
    duration: 1.0,
    wheelMultiplier: 0.95,
    touchMultiplier: 1.2,
  });

  // Auto-expand section if active view changes
  useEffect(() => {
    const parent = findParentSectionId(currentView);
    if (parent) {
      setOpenSections(prev => ({
        ...prev,
        [parent]: true,
      }));
    }
  }, [currentView]);

  const toggleCollapse = () => {
    setIsCollapsed(prev => {
      const next = !prev;
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
  const displayRole = activeUser?.role || currentRole || 'SUPER ADMIN';
  const displayName = activeUser?.name || userName || 'Sachin Gharbude';

  // Compute initials for avatar
  const initials = displayName
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map(p => p[0]?.toUpperCase())
    .join('') || 'SG';

  // Design Tokens (Precision Drafting / Industrial Executive)
  const ACCENT_COLOR = '#3B6FE0';
  const ACCENT_BG = isDarkMode ? 'rgba(59, 111, 224, 0.16)' : 'rgba(59, 111, 224, 0.10)';
  const ACCENT_BORDER = isDarkMode ? 'rgba(59, 111, 224, 0.35)' : 'rgba(59, 111, 224, 0.25)';

  const bgSidebar = isDarkMode ? 'bg-[#111215]' : 'bg-[#FCFCFC]';
  const borderSidebar = isDarkMode ? 'border-[#22242B]' : 'border-[#E2DFD6]';
  const textPrimary = isDarkMode ? 'text-[#F3F4F6]' : 'text-[#141518]';
  const textMuted = isDarkMode ? 'text-[#8E939E]' : 'text-[#646872]';
  const cardBg = isDarkMode ? 'bg-[#17181D]' : 'bg-[#FFFFFF]';
  const cardBorder = isDarkMode ? 'border-[#262831]' : 'border-[#E5E2D9]';
  const hoverBg = isDarkMode ? 'hover:bg-white/[0.05]' : 'hover:bg-black/[0.04]';

  return (
    <aside
      aria-label="Application Sidebar Navigation"
      className={`hidden h-full shrink-0 font-sans select-none lg:flex transition-[width] duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] ${
        isCollapsed ? 'w-[74px]' : 'w-[280px]'
      }`}
    >
      <div
        className={`console-sidebar relative flex h-full w-full flex-col overflow-hidden border-r shadow-xs ${bgSidebar} ${borderSidebar} ${textPrimary}`}
      >
        {/* ===================================================================== */}
        {/* 1. BRAND HEADER & COLLAPSE CONTROL                                    */}
        {/* ===================================================================== */}
        <div
          className={`flex h-[66px] shrink-0 items-center border-b px-3.5 ${cardBorder} ${
            isCollapsed ? 'justify-center px-2' : 'justify-between'
          }`}
        >
          {!isCollapsed ? (
            <div className="flex min-w-0 items-center gap-3">
              <div
                className={`relative flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border p-1 shadow-xs overflow-hidden ${
                  isDarkMode
                    ? 'border-white/10 bg-black/60 shadow-black/40'
                    : 'border-black/10 bg-white shadow-neutral-200/50'
                }`}
              >
                <img
                  src="/logo.png"
                  alt="OwnerOS Logo"
                  className="h-full w-full object-contain"
                />
              </div>

              <div className="flex min-w-0 flex-col leading-tight">
                <div className="flex items-center gap-1.5">
                  <span className="truncate text-[15px] font-bold tracking-tight">
                    OwnerOS
                  </span>
                  <span
                    className={`rounded-[4px] px-1 py-[1px] text-[9px] font-semibold tracking-wide uppercase ${
                      isDarkMode
                        ? 'bg-blue-950/60 text-blue-400 border border-blue-800/40'
                        : 'bg-blue-50 text-blue-600 border border-blue-200'
                    }`}
                  >
                    PRO
                  </span>
                </div>
                <span className={`truncate text-[11px] font-medium ${textMuted}`}>
                  GuruOm Precision
                </span>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={toggleCollapse}
              aria-label="Expand sidebar navigation"
              className={`relative flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border p-1 shadow-xs transition-transform duration-150 cursor-pointer active:scale-[0.95] focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none ${
                isDarkMode
                  ? 'border-white/15 bg-black/60 hover:bg-black/90'
                  : 'border-black/10 bg-white hover:bg-neutral-50'
              }`}
              title="Expand sidebar"
            >
              <img
                src="/logo.png"
                alt="OwnerOS"
                className="h-full w-full object-contain"
              />
            </button>
          )}

          {!isCollapsed && (
            <button
              type="button"
              onClick={toggleCollapse}
              aria-label="Collapse sidebar navigation"
              title="Collapse sidebar"
              className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-all duration-150 cursor-pointer active:scale-[0.95] focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none ${textMuted} ${hoverBg} ${
                isDarkMode ? 'hover:text-white' : 'hover:text-black'
              }`}
            >
              <PanelLeftClose className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* ===================================================================== */}
        {/* 2. COMMAND SEARCH BAR (Expanded) / QUICK ICON (Collapsed)              */}
        {/* ===================================================================== */}
        <div className="shrink-0 px-3 pt-3 pb-1">
          {!isCollapsed ? (
            <button
              type="button"
              onClick={onOpenCommandPalette}
              aria-label="Open command palette (Ctrl+K)"
              className={`group flex w-full items-center justify-between rounded-xl border px-3 py-2 text-left shadow-xs transition-all duration-150 cursor-pointer active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none ${cardBg} ${cardBorder} ${
                isDarkMode
                  ? 'hover:border-white/20 text-[#8E939E] hover:text-[#EDEEF0]'
                  : 'hover:border-black/20 text-[#646872] hover:text-[#17181B]'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Search className="h-3.5 w-3.5 shrink-0 opacity-70 group-hover:opacity-100 transition-opacity" />
                <span className="text-[12.5px] font-normal">Search or command...</span>
              </div>
              <kbd
                className={`inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[10px] font-medium tracking-wide ${
                  isDarkMode
                    ? 'bg-white/[0.08] text-white/70 border border-white/10'
                    : 'bg-black/[0.05] text-black/60 border border-black/10'
                }`}
              >
                ⌘K
              </kbd>
            </button>
          ) : (
            <div className="flex justify-center">
              <button
                type="button"
                onClick={onOpenCommandPalette}
                aria-label="Open command palette"
                title="Command Palette (⌘K)"
                className={`flex h-10 w-10 items-center justify-center rounded-xl border transition-all duration-150 cursor-pointer active:scale-[0.95] focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none ${cardBg} ${cardBorder} ${textMuted} ${hoverBg} ${
                  isDarkMode ? 'hover:text-white' : 'hover:text-black'
                }`}
              >
                <Search className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>

        {/* ===================================================================== */}
        {/* 3. SCROLLABLE NAVIGATION TREE                                         */}
        {/* ===================================================================== */}
        <div
          ref={scrollContainerRef}
          data-lenis-prevent="true"
          className="no-scrollbar flex-1 overflow-y-auto px-3 py-2 space-y-4"
        >
          {/* Executive Workspace Anchor */}
          <div>
            {!isCollapsed && (
              <div className={`mb-1.5 flex items-center justify-between px-2 text-[10.5px] font-bold tracking-wider uppercase ${textMuted}`}>
                <span>Cockpit</span>
                <span className="flex items-center gap-1 text-[10px] text-emerald-500 font-bold lowercase">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  live
                </span>
              </div>
            )}

            <button
              type="button"
              onClick={() => handleSelectView('command-centre')}
              aria-current={currentView === 'command-centre' ? 'page' : undefined}
              title="Command Centre (Executive Overview)"
              className={`group relative flex w-full items-center rounded-xl border transition-all duration-150 cursor-pointer active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none ${
                isCollapsed ? 'h-11 justify-center px-1' : 'h-10 gap-3 px-3'
              } ${
                currentView === 'command-centre'
                  ? isDarkMode
                    ? 'bg-blue-600/15 border-blue-500/40 text-blue-400 font-bold shadow-xs'
                    : 'bg-blue-50/90 border-blue-300 text-blue-700 font-bold shadow-xs'
                  : `border-transparent ${textMuted} ${hoverBg} ${
                      isDarkMode ? 'hover:text-white' : 'hover:text-black'
                    }`
              }`}
            >
              {/* Active side indicator */}
              {currentView === 'command-centre' && (
                <span
                  className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-[3px] rounded-r-full bg-[#3B6FE0] shadow-[0_0_8px_rgba(59,111,224,0.6)]"
                  aria-hidden="true"
                />
              )}

              <LayoutGrid
                className={`h-[17px] w-[17px] shrink-0 transition-transform duration-150 group-hover:scale-105 ${
                  currentView === 'command-centre' ? 'text-blue-500' : ''
                }`}
              />

              {!isCollapsed && (
                <>
                  <span className="flex-1 text-left text-[13.5px] tracking-tight font-bold">
                    Command Centre
                  </span>
                  <span
                    className={`inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-bold ${
                      currentView === 'command-centre'
                        ? isDarkMode
                          ? 'bg-blue-500/20 text-blue-300'
                          : 'bg-blue-100 text-blue-800'
                        : isDarkMode
                        ? 'bg-white/[0.06] text-neutral-400'
                        : 'bg-black/[0.05] text-neutral-600'
                    }`}
                  >
                    Ops
                  </span>
                </>
              )}
            </button>
          </div>

          {/* Department Groupings */}
          <div>
            {!isCollapsed && (
              <div className={`mb-1.5 flex items-center justify-between px-2 text-[10.5px] font-bold tracking-wider uppercase ${textMuted}`}>
                <span>Departments</span>
                <span className="text-[10px] font-mono font-bold opacity-70">
                  {NAVIGATION_SECTIONS.length}
                </span>
              </div>
            )}

            <div className="space-y-1">
              {NAVIGATION_SECTIONS.map(section => {
                const SectionIcon = section.icon;
                const allowedItems = section.items.filter(item =>
                  isViewAllowedForUser(currentUser || { role: displayRole }, item.id)
                );

                if (allowedItems.length === 0) return null;

                const isOpen = openSections[section.id] ?? false;
                const hasActiveChild = allowedItems.some(
                  item =>
                    item.id === currentView ||
                    (currentView === 'order-detail' && item.id === 'orders')
                );

                return (
                  <div
                    key={section.id}
                    className="relative"
                    onMouseEnter={() => isCollapsed && setHoveredSection(section.id)}
                    onMouseLeave={() => isCollapsed && setHoveredSection(null)}
                  >
                    {/* Section Toggle Button */}
                    <button
                      type="button"
                      aria-expanded={!isCollapsed ? isOpen : undefined}
                      aria-label={`${section.label} section`}
                      onClick={() => {
                        if (isCollapsed) {
                          setIsCollapsed(false);
                          localStorage.setItem('guruom_sidebar_collapsed', 'false');
                          setOpenSections(prev => ({ ...prev, [section.id]: true }));
                        } else {
                          setOpenSections(prev => ({ ...prev, [section.id]: !isOpen }));
                        }
                      }}
                      title={isCollapsed ? section.label : undefined}
                      className={`group relative flex w-full items-center rounded-xl border transition-all duration-150 cursor-pointer active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none ${
                        isCollapsed ? 'h-11 justify-center px-1' : 'h-10 gap-3 px-3'
                      } ${
                        hasActiveChild && !isOpen && !isCollapsed
                          ? isDarkMode
                            ? 'bg-white/[0.05] border-white/10 text-white font-bold'
                            : 'bg-black/[0.04] border-black/10 text-black font-bold'
                          : isOpen && !isCollapsed
                          ? isDarkMode
                            ? 'bg-white/[0.03] border-white/5 text-white'
                            : 'bg-black/[0.02] border-black/5 text-neutral-900'
                          : `border-transparent ${textMuted} ${hoverBg} ${
                              isDarkMode ? 'hover:text-white' : 'hover:text-black'
                            }`
                      }`}
                      style={
                        hasActiveChild && isCollapsed
                          ? {
                              backgroundColor: ACCENT_BG,
                              borderColor: ACCENT_BORDER,
                            }
                          : undefined
                      }
                    >
                      {/* Active indicator dot on collapsed button */}
                      {hasActiveChild && isCollapsed && (
                        <span
                          className="absolute right-2 top-2 h-2 w-2 rounded-full bg-[#3B6FE0] ring-2 ring-[#111215]"
                          aria-hidden="true"
                        />
                      )}

                      <SectionIcon
                        className={`h-[17px] w-[17px] shrink-0 transition-transform duration-150 group-hover:scale-105 ${
                          hasActiveChild ? 'text-blue-500' : ''
                        }`}
                      />

                      {!isCollapsed && (
                        <>
                          <span
                            className={`min-w-0 flex-1 truncate text-left text-[13px] tracking-tight font-bold ${
                              hasActiveChild ? 'text-current' : ''
                            }`}
                          >
                            {section.label}
                          </span>

                          <div className="flex items-center gap-1.5 shrink-0">
                            <span
                              className={`rounded-full px-1.5 py-[1px] text-[10px] font-mono font-bold ${
                                isDarkMode ? 'bg-white/[0.06] text-neutral-300' : 'bg-black/[0.05] text-neutral-700'
                              }`}
                            >
                              {allowedItems.length}
                            </span>
                            <ChevronDown
                              className={`h-3.5 w-3.5 transition-transform duration-200 ${textMuted} ${
                                isOpen ? 'rotate-180' : ''
                              }`}
                            />
                          </div>
                        </>
                      )}
                    </button>

                    {/* Expanded Sub-items List */}
                    <AnimatePresence initial={false}>
                      {!isCollapsed && isOpen && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.18, ease: [0.23, 1, 0.32, 1] }}
                          className="overflow-hidden"
                        >
                          <div
                            className={`relative ml-[19px] mt-1 space-y-0.5 border-l py-1 pl-3.5 ${
                              isDarkMode ? 'border-white/10' : 'border-black/10'
                            }`}
                          >
                            {allowedItems.map(item => {
                              const ItemIcon = item.icon;
                              const isActive =
                                currentView === item.id ||
                                (currentView === 'order-detail' && item.id === 'orders');

                              return (
                                <button
                                  key={item.id}
                                  type="button"
                                  onClick={() => handleSelectView(item.id)}
                                  aria-current={isActive ? 'page' : undefined}
                                  className={`group/sub relative flex w-full items-center gap-2.5 rounded-lg px-2.5 py-[7px] text-left transition-all duration-150 cursor-pointer active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none ${
                                    isActive
                                      ? isDarkMode
                                        ? 'bg-blue-600/15 text-blue-400 font-bold'
                                        : 'bg-blue-50 text-blue-700 font-bold'
                                      : `${textMuted} ${hoverBg} ${
                                          isDarkMode ? 'hover:text-white' : 'hover:text-black'
                                        }`
                                  }`}
                                >
                                  {/* Left rail indicator line */}
                                  {isActive && (
                                    <span
                                      className="absolute -left-[16px] top-1/2 -translate-y-1/2 h-3.5 w-[2.5px] rounded-full bg-[#3B6FE0] shadow-[0_0_8px_rgba(59,111,224,0.7)]"
                                      aria-hidden="true"
                                    />
                                  )}

                                  <ItemIcon
                                    className={`h-[15px] w-[15px] shrink-0 transition-transform duration-150 group-hover/sub:scale-105 ${
                                      isActive ? 'text-blue-500' : 'opacity-70 group-hover/sub:opacity-100'
                                    }`}
                                  />
                                  <span className="min-w-0 flex-1 truncate text-[12.5px] font-bold">
                                    {item.label}
                                  </span>

                                  {/* Badge count if applicable */}
                                  {item.badgeKey === 'approvals' && (
                                    <span className="rounded-full bg-amber-500/15 px-1.5 py-0.2 text-[10px] font-bold text-amber-500">
                                      Queue
                                    </span>
                                  )}
                                </button>
                              );
                            })}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* Collapsed Mode Origin-Aware Hover Flyout with AnimatePresence */}
                    <AnimatePresence>
                      {isCollapsed && hoveredSection === section.id && (
                        <motion.div
                          role="menu"
                          aria-label={`${section.label} menu`}
                          initial={{ opacity: 0, scale: 0.95, x: -4 }}
                          animate={{ opacity: 1, scale: 1, x: 0 }}
                          exit={{ opacity: 0, scale: 0.96, x: -2 }}
                          transition={{ duration: 0.16, ease: [0.23, 1, 0.32, 1] }}
                          style={{ transformOrigin: 'left center' }}
                          className={`absolute left-[78px] top-0 z-50 w-64 overflow-hidden rounded-2xl border p-2 shadow-2xl backdrop-blur-xl ${
                            isDarkMode
                              ? 'border-white/15 bg-[#17181E]/95 text-white shadow-black/80'
                              : 'border-black/10 bg-white/95 text-neutral-900 shadow-xl'
                          }`}
                        >
                          <div
                            className={`flex items-center gap-2 border-b px-2.5 pb-2 text-[13px] font-bold ${
                              isDarkMode ? 'border-white/10' : 'border-black/10'
                            }`}
                          >
                            <SectionIcon className="h-4 w-4 text-[#3B6FE0]" />
                            <span className="truncate font-bold">{section.label}</span>
                          </div>

                          <div className="space-y-0.5 pt-1.5">
                            {allowedItems.map(item => {
                              const ItemIcon = item.icon;
                              const isActive =
                                currentView === item.id ||
                                (currentView === 'order-detail' && item.id === 'orders');

                              return (
                                <button
                                  key={item.id}
                                  type="button"
                                  role="menuitem"
                                  onClick={() => handleSelectView(item.id)}
                                  className={`flex w-full items-center gap-2.5 rounded-lg px-2.5 py-[7px] text-left text-[12.5px] font-bold transition-all duration-150 cursor-pointer active:scale-[0.98] ${
                                    isActive
                                      ? isDarkMode
                                        ? 'bg-blue-600/20 text-blue-400'
                                        : 'bg-blue-50 text-blue-700'
                                      : isDarkMode
                                      ? 'text-neutral-300 hover:bg-white/[0.06] hover:text-white'
                                      : 'text-neutral-700 hover:bg-black/[0.04] hover:text-neutral-900'
                                  }`}
                                >
                                  <ItemIcon className="h-3.5 w-3.5 shrink-0 opacity-80" />
                                  <span className="truncate flex-1 font-bold">{item.label}</span>
                                </button>
                              );
                            })}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* ===================================================================== */}
        {/* 4. BOTTOM UTILITY DOCK & USER PROFILE COCKPIT                          */}
        {/* ===================================================================== */}
        <div
          className={`shrink-0 border-t p-2.5 space-y-2 ${cardBorder} ${
            isDarkMode ? 'bg-[#14151A]/80' : 'bg-[#EFECE5]/60'
          }`}
        >
          {/* Quick Action Tools Bar */}
          <div
            className={`flex items-center rounded-xl border p-1 ${cardBg} ${cardBorder} ${
              isCollapsed ? 'flex-col gap-1 justify-center' : 'justify-between'
            }`}
          >
            {/* Sync Trigger */}
            <button
              type="button"
              onClick={onSync}
              disabled={isSyncing}
              aria-label={isSyncing ? 'Syncing data with cloud' : `Sync data (Last synced: ${lastSynced || 'just now'})`}
              title={isSyncing ? 'Syncing...' : `Sync cloud database (${lastSynced || 'Live'})`}
              className={`flex h-8 w-8 items-center justify-center rounded-lg transition-all duration-150 cursor-pointer active:scale-[0.95] focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none ${textMuted} ${hoverBg} ${
                isDarkMode ? 'hover:text-white' : 'hover:text-black'
              }`}
            >
              <RefreshCw
                className={`h-3.5 w-3.5 ${isSyncing ? 'animate-spin text-blue-500' : ''}`}
              />
            </button>

            {/* Notification Center Trigger */}
            <button
              type="button"
              onClick={onOpenNotifications}
              aria-label={`Open notifications (${unreadNotificationsCount} unread)`}
              title={`Notifications (${unreadNotificationsCount} unread)`}
              className={`relative flex h-8 w-8 items-center justify-center rounded-lg transition-all duration-150 cursor-pointer active:scale-[0.95] focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none ${textMuted} ${hoverBg} ${
                isDarkMode ? 'hover:text-white' : 'hover:text-black'
              }`}
            >
              <Bell className="h-3.5 w-3.5" />
              {unreadNotificationsCount > 0 && (
                <span className="absolute top-1.5 right-1.5 flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500" />
                </span>
              )}
            </button>

            {/* Dark / Light Mode Switch */}
            <button
              type="button"
              onClick={() => setIsDarkMode?.(!isDarkMode)}
              aria-label={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
              title={isDarkMode ? 'Switch to Light Theme' : 'Switch to Dark Theme'}
              className={`flex h-8 w-8 items-center justify-center rounded-lg transition-all duration-150 cursor-pointer active:scale-[0.95] focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none ${textMuted} ${hoverBg} ${
                isDarkMode ? 'hover:text-amber-300' : 'hover:text-amber-600'
              }`}
            >
              {isDarkMode ? (
                <Sun className="h-3.5 w-3.5" />
              ) : (
                <Moon className="h-3.5 w-3.5" />
              )}
            </button>

            {/* Security Sessions Trigger */}
            {onOpenSecurityModal && (
              <button
                type="button"
                onClick={onOpenSecurityModal}
                aria-label="Security & Session Audit"
                title="Security & Active Sessions"
                className={`flex h-8 w-8 items-center justify-center rounded-lg transition-all duration-150 cursor-pointer active:scale-[0.95] focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none ${textMuted} ${hoverBg} ${
                  isDarkMode ? 'hover:text-emerald-400' : 'hover:text-emerald-600'
                }`}
              >
                <Shield className="h-3.5 w-3.5" />
              </button>
            )}

            {/* Sign Out Trigger (Collapsed Only) */}
            {isCollapsed && onSignOut && (
              <button
                type="button"
                onClick={onSignOut}
                aria-label="Sign out from OwnerOS"
                title="Sign Out"
                className="flex h-8 w-8 items-center justify-center rounded-lg text-rose-500/80 hover:text-rose-500 hover:bg-rose-500/10 transition-all duration-150 cursor-pointer active:scale-[0.95] focus-visible:ring-2 focus-visible:ring-rose-500 focus-visible:outline-none"
              >
                <LogOut className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* User Profile Identity Pill (Expanded Only) */}
          {!isCollapsed && (
            <div
              className={`flex items-center justify-between rounded-xl border p-2 ${cardBg} ${cardBorder}`}
            >
              <div className="flex min-w-0 items-center gap-2.5">
                {/* User Avatar with Initials */}
                <div
                  className={`relative flex h-8 w-8 shrink-0 items-center justify-center rounded-lg font-mono text-[11px] font-bold ${
                    isDarkMode
                      ? 'bg-blue-600/20 text-blue-300 border border-blue-500/30'
                      : 'bg-blue-100 text-blue-700 border border-blue-200'
                  }`}
                >
                  {initials}
                  <span
                    className="absolute -bottom-0.5 -right-0.5 h-2 w-2 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-[#111215]"
                    title="Active online"
                  />
                </div>

                <div className="flex min-w-0 flex-col leading-none">
                  <span className="truncate text-[12.5px] font-semibold">
                    {displayName}
                  </span>
                  <span
                    className="mt-1 truncate text-[10px] font-medium opacity-70"
                    title={`Role: ${displayRole}`}
                  >
                    {displayRole}
                  </span>
                </div>
              </div>

              {/* Sign Out Action */}
              {onSignOut && (
                <button
                  type="button"
                  onClick={onSignOut}
                  aria-label="Sign out of account"
                  title="Sign out"
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-rose-500/80 hover:text-rose-500 hover:bg-rose-500/10 transition-all duration-150 cursor-pointer active:scale-[0.95] focus-visible:ring-2 focus-visible:ring-rose-500 focus-visible:outline-none"
                >
                  <LogOut className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </aside>
  );
};

export default ConsoleSidebar;