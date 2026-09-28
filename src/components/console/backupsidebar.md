import React, { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  LayoutGrid,
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

/**
 * Stylized 6-spoke brand asterisk icon matching the reference screenshot.
 */
const BrandAsterisk: React.FC<{ className?: string; isDarkMode?: boolean }> = ({
  className = 'w-7 h-7',
  isDarkMode = true,
}) => (
  <svg viewBox="0 0 32 32" className={className} fill="none" aria-hidden="true">
    <g fill="#FF6B2C">
      {/* 6 radial rounded spokes */}
      <rect x="14" y="2.5" width="4" height="8.5" rx="2" />
      <rect x="14" y="21" width="4" height="8.5" rx="2" />
      <rect x="14" y="2.5" width="4" height="8.5" rx="2" transform="rotate(60 16 16)" />
      <rect x="14" y="2.5" width="4" height="8.5" rx="2" transform="rotate(120 16 16)" />
      <rect x="14" y="2.5" width="4" height="8.5" rx="2" transform="rotate(240 16 16)" />
      <rect x="14" y="2.5" width="4" height="8.5" rx="2" transform="rotate(300 16 16)" />
    </g>
    {/* Center cutout */}
    <circle
      cx="16"
      cy="16"
      r="3"
      fill={isDarkMode ? '#141416' : '#E8E5DF'}
    />
  </svg>
);

/**
 * Curated accent colors for sub-items
 */
const getItemAccent = (id: string, isActive: boolean): string => {
  if (isActive) return 'text-white';
  switch (id) {
    case 'orders':
    case 'qc':
    case 'invoices':
    case 'tasks':
      return 'text-emerald-400 group-hover/item:text-emerald-300';
    case 'inventory':
    case 'company-profile':
    case 'employee-certifications':
    case 'certifications':
      return 'text-amber-400 group-hover/item:text-amber-300';
    case 'production':
    case 'pdi':
    case 'meetings':
      return 'text-blue-400 group-hover/item:text-blue-300';
    case 'finished-goods':
    case 'masters':
      return 'text-indigo-400 group-hover/item:text-indigo-300';
    case 'plating-outwork':
    case 'approvals':
    case 'attendance':
      return 'text-purple-400 group-hover/item:text-purple-300';
    case 'reports':
    case 'leave-requests':
    case 'announcements':
      return 'text-rose-400 group-hover/item:text-rose-300';
    case 'metrics':
    case 'users-audit':
    case 'employee-master':
      return 'text-cyan-400 group-hover/item:text-cyan-300';
    case 'dispatch':
      return 'text-orange-400 group-hover/item:text-orange-300';
    case 'payables':
      return 'text-red-400 group-hover/item:text-red-300';
    default:
      return 'text-neutral-400 group-hover/item:text-neutral-200';
  }
};

export const ConsoleSidebar: React.FC<ConsoleSidebarProps> = ({
  currentView,
  setCurrentView,
  isDarkMode,
  setIsDarkMode: _setIsDarkMode,
  currentRole = 'SUPER ADMIN',
  currentUser,
  userName: _userName = 'Sachin Gharbude',
  onSignOut: _onSignOut,
  onOpenSecurityModal: _onOpenSecurityModal,
  setIsOpenMobile,
  onOpenCommandPalette: _onOpenCommandPalette,
  onSync: _onSync,
  isSyncing: _isSyncing = false,
  lastSynced: _lastSynced,
  onOpenNotifications: _onOpenNotifications,
  unreadNotificationsCount: _unreadNotificationsCount = 0,
}) => {
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);

  const [isCollapsed, setIsCollapsed] = useState<boolean>(() => {
    try {
      return JSON.parse(
        localStorage.getItem('guruom_sidebar_collapsed') || 'false'
      );
    } catch {
      return false;
    }
  });

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

  const [hoveredSection, setHoveredSection] = useState<string | null>(null);

  useSmoothScroll(scrollContainerRef, [openSections, isCollapsed], {
    duration: 1.1,
    wheelMultiplier: 0.95,
    touchMultiplier: 1.25,
  });

  useEffect(() => {
    const parent = findParentSectionId(currentView);

    if (parent) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setOpenSections(previous => ({
        ...previous,
        [parent]: true,
      }));
    }
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
  const displayRole = activeUser?.role || currentRole || 'SUPER ADMIN';

  return (
    <aside
      className={`hidden h-full shrink-0 font-sans transition-[width] duration-300
        lg:flex select-none
        ${isCollapsed ? 'w-[64px]' : 'w-[284px]'}`}
    >
      <div className="console-sidebar relative flex h-full w-full select-none overflow-hidden">
        {/* ===================================================================== */}
        {/* COLUMN 1: LEFT NARROW ICON RAIL (64px)                                */}
        {/* ===================================================================== */}
        <div
          className={`
            w-[64px] shrink-0 h-full flex flex-col items-center py-3.5 z-20
            border-r transition-colors duration-200
            ${isDarkMode
              ? 'bg-[#141416] border-white/[0.07] text-white'
              : 'bg-[#E8E5DF] border-black/[0.08] text-neutral-800'
            }
          `}
        >
          {/* Top Logo / Brand Asterisk */}
          <button
            type="button"
            onClick={() => {
              if (isCollapsed) {
                toggleCollapse();
              }
              handleSelectView('command-centre');
            }}
            title="OwnerOS - Command Centre"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-transform duration-150 hover:scale-105 active:scale-95 cursor-pointer"
          >
            <BrandAsterisk className="w-7 h-7" isDarkMode={isDarkMode} />
          </button>

          {/* Vertical Stack of Section Icons */}
          <div className="mt-5 flex flex-1 flex-col items-center gap-2.5 w-full px-2.5">
            {/* Root Workspace / Layout Grid Icon */}
            <button
              type="button"
              onClick={() => {
                if (isCollapsed) {
                  toggleCollapse();
                }
                handleSelectView('command-centre');
              }}
              title="Executive Overview"
              className={`
                group relative flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border
                transition-all duration-150 cursor-pointer active:scale-95
                ${currentView === 'command-centre'
                  ? isDarkMode
                    ? 'bg-[#28292E] border-white/15 text-white shadow-md'
                    : 'bg-white border-black/15 text-neutral-900 shadow-sm'
                  : isDarkMode
                    ? 'border-transparent text-neutral-400 hover:text-white hover:bg-white/[0.06]'
                    : 'border-transparent text-neutral-600 hover:text-neutral-900 hover:bg-black/[0.05]'
                }
              `}
            >
              <LayoutGrid className="h-5 w-5 shrink-0" />
            </button>

            {/* Department Icons */}
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
                  className="relative w-full flex justify-center"
                  onMouseEnter={() => isCollapsed && setHoveredSection(section.id)}
                  onMouseLeave={() => isCollapsed && setHoveredSection(null)}
                >
                  <button
                    type="button"
                    onClick={() => {
                      if (isCollapsed) {
                        setIsCollapsed(false);
                        localStorage.setItem('guruom_sidebar_collapsed', 'false');
                        setOpenSections(prev => ({ ...prev, [section.id]: true }));
                      } else {
                        setOpenSections(prev => ({ ...prev, [section.id]: !isOpen }));
                      }
                    }}
                    title={section.label}
                    className={`
                      group relative flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border
                      transition-all duration-150 cursor-pointer active:scale-95
                      ${hasActiveChild && isCollapsed
                        ? isDarkMode
                          ? 'bg-[#28292E] border-white/15 text-white shadow-md'
                          : 'bg-white border-black/15 text-neutral-900 shadow-sm'
                        : isOpen && !isCollapsed
                          ? isDarkMode
                            ? 'bg-white/[0.08] border-white/10 text-white'
                            : 'bg-black/[0.06] border-black/10 text-neutral-900'
                          : isDarkMode
                            ? 'border-transparent text-neutral-400 hover:text-white hover:bg-white/[0.06]'
                            : 'border-transparent text-neutral-600 hover:text-neutral-900 hover:bg-black/[0.05]'
                      }
                    `}
                  >
                    <SectionIcon className="h-5 w-5 shrink-0 transition-colors" />
                  </button>

                  {/* Collapsed Hover Flyout */}
                  {isCollapsed && hoveredSection === section.id && (
                    <div
                      className={`
                        absolute left-full top-0 z-50 ml-2 w-60 overflow-hidden
                        rounded-xl border p-2 shadow-2xl backdrop-blur-3xl
                        ${isDarkMode
                          ? 'border-white/15 bg-[#17181B]/95 text-white shadow-black/80'
                          : 'border-black/10 bg-white/95 text-neutral-900 shadow-xl'
                        }
                      `}
                    >
                      <div className={`flex items-center gap-2 border-b px-2 pb-2 text-[13px] font-semibold ${isDarkMode ? 'border-white/10' : 'border-black/10'}`}>
                        <SectionIcon className="h-4 w-4 text-[#FF6B2C]" />
                        <span>{section.label}</span>
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
                              onClick={() => handleSelectView(item.id)}
                              className={`
                                flex w-full items-center gap-2.5 rounded-lg
                                px-2.5 py-[7px] text-left text-[13px] border
                                transition-all duration-150 cursor-pointer
                                ${isActive
                                  ? isDarkMode
                                    ? 'bg-[#28292E] border-white/10 text-white font-semibold'
                                    : 'bg-black/[0.06] border-black/10 text-neutral-900 font-semibold'
                                  : isDarkMode
                                    ? 'border-transparent text-neutral-400 hover:text-white hover:bg-white/[0.06]'
                                    : 'border-transparent text-neutral-600 hover:text-neutral-900 hover:bg-black/[0.04]'
                                }
                              `}
                            >
                              <ItemIcon className={`h-[15px] w-[15px] shrink-0 ${getItemAccent(item.id, isActive)}`} />
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

        {/* ===================================================================== */}
        {/* COLUMN 2: RIGHT EXPANDABLE DASHBOARD PANEL (220px)                    */}
        {/* ===================================================================== */}
        {!isCollapsed && (
          <div
            className={`
              flex-1 h-full flex flex-col min-w-0 transition-colors duration-200
              ${isDarkMode
                ? 'bg-[#1A1A1E] text-white'
                : 'bg-[#F2EFEA] text-neutral-900'
              }
            `}
          >
            {/* Header: Title "Dashboard" + Collapse Button "<" */}
            <div
              className={`
                h-[58px] shrink-0 px-4 flex items-center justify-between
                border-b transition-colors duration-200
                ${isDarkMode ? 'border-white/[0.07]' : 'border-black/[0.08]'}
              `}
            >
              <h2 className="text-[17px] font-semibold tracking-tight">
                Dashboard
              </h2>

              <button
                type="button"
                onClick={toggleCollapse}
                title="Collapse sidebar"
                className={`
                  flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border
                  transition-all duration-150 active:scale-95 cursor-pointer
                  ${isDarkMode
                    ? 'border-white/10 bg-[#25262B]/60 text-neutral-400 hover:bg-white/10 hover:text-white hover:border-white/20'
                    : 'border-black/10 bg-white/70 text-neutral-600 hover:bg-white hover:text-black hover:border-black/20'
                  }
                `}
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
            </div>

            {/* Scrollable Navigation Tree */}
            <div
              ref={scrollContainerRef}
              data-lenis-prevent="true"
              className="no-scrollbar flex-1 overflow-y-auto px-3 py-3.5 space-y-1.5"
            >
              {/* Executive Overview (Command Centre) */}
              <button
                type="button"
                onClick={() => handleSelectView('command-centre')}
                className={`
                  group w-full flex items-center px-3 py-2 rounded-lg text-[13.5px] font-medium
                  transition-all duration-150 cursor-pointer
                  ${currentView === 'command-centre'
                    ? isDarkMode
                      ? 'bg-[#28292E] text-white font-semibold border border-white/10 shadow-xs'
                      : 'bg-white text-neutral-900 font-semibold border border-black/10 shadow-xs'
                    : isDarkMode
                      ? 'text-neutral-400 hover:text-white hover:bg-white/[0.04]'
                      : 'text-neutral-600 hover:text-neutral-900 hover:bg-black/[0.04]'
                  }
                `}
              >
                <span className="truncate">Executive Overview</span>
              </button>

              {/* Department Sections */}
              {NAVIGATION_SECTIONS.map(section => {
                const allowedItems = section.items.filter(item =>
                  isViewAllowedForUser(currentUser || { role: displayRole }, item.id)
                );

                if (allowedItems.length === 0) return null;

                const isOpen = openSections[section.id] ?? false;

                return (
                  <div key={section.id} className="space-y-0.5">
                    {/* Section Header Button */}
                    <button
                      type="button"
                      onClick={() =>
                        setOpenSections(prev => ({
                          ...prev,
                          [section.id]: !isOpen,
                        }))
                      }
                      className={`
                        w-full flex items-center justify-between transition-all duration-150 cursor-pointer
                        ${isOpen
                          ? isDarkMode
                            ? 'bg-[#28292E] text-white rounded-xl px-3.5 py-2.5 font-semibold text-[13.5px] border border-white/[0.08] shadow-xs'
                            : 'bg-white text-neutral-900 rounded-xl px-3.5 py-2.5 font-semibold text-[13.5px] border border-black/10 shadow-xs'
                          : isDarkMode
                            ? 'px-3 py-2 rounded-lg text-[13.5px] font-medium text-neutral-400 hover:text-white hover:bg-white/[0.04]'
                            : 'px-3 py-2 rounded-lg text-[13.5px] font-medium text-neutral-600 hover:text-neutral-900 hover:bg-black/[0.04]'
                        }
                      `}
                    >
                      <span className="truncate">{section.label}</span>
                      {isOpen ? (
                        <ChevronUp className="h-4 w-4 shrink-0 opacity-70" />
                      ) : (
                        <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
                      )}
                    </button>

                    {/* Expanded Section Sub-items with Connected Vertical Rail */}
                    <AnimatePresence initial={false}>
                      {isOpen && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
                          className="overflow-hidden"
                        >
                          <div
                            className={`
                              relative ml-4 mt-1 pl-3.5 border-l space-y-1 py-1
                              ${isDarkMode ? 'border-neutral-700/60' : 'border-neutral-300'}
                            `}
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
                                  className={`  
                                    group/item relative flex w-full items-center gap-2.5 rounded-lg
                                    px-2.5 py-[7px] text-left transition-all duration-150 cursor-pointer
                                    ${isActive
                                      ? isDarkMode
                                        ? 'bg-white/[0.06] text-white font-semibold'
                                        : 'bg-black/[0.06] text-neutral-900 font-semibold'
                                      : isDarkMode
                                        ? 'text-neutral-400 hover:text-white hover:bg-white/[0.03] font-normal'
                                        : 'text-neutral-600 hover:text-neutral-900 hover:bg-black/[0.03] font-normal'
                                    }
                                  `}
                                >
                                  {/* Orange glowing vertical indicator on the left tree line */}
                                  {isActive && (
                                    <span
                                      className="absolute -left-[16px] top-1/2 -translate-y-1/2 h-3.5 w-[2.5px] rounded-full bg-[#FF6B2C] shadow-[0_0_8px_rgba(255,107,44,0.9)]"
                                    />
                                  )}

                                  <ItemIcon
                                    className={`h-[15px] w-[15px] shrink-0 transition-colors ${getItemAccent(item.id, isActive)}`}
                                  />
                                  <span className="min-w-0 flex-1 truncate text-[13px]">
                                    {item.label}
                                  </span>
                                </button>
                              );
                            })}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );a
              })}
            </div>
          </div>
        )}
      </div>
    </aside>
  );
};

export default ConsoleSidebar;