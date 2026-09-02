import React, { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  ChevronDown,
  ChevronRight,
  Command,
  LayoutGrid,
  LogOut,
  PanelLeftClose,
  PanelLeftOpen,
  ShieldCheck,
  Sparkles
} from 'lucide-react';
import { ConsoleUser, ConsoleView, UserRole } from '../../types/console';
import { useSmoothScroll } from '../../hooks/useSmoothScroll';
import { isViewAllowedForUser } from '../../utils/permissions';
import { findParentSectionId, NAVIGATION_SECTIONS } from '../../utils/navigationConfig';

interface ConsoleSidebarProps {
  currentView: ConsoleView;
  setCurrentView: (view: ConsoleView) => void;
  isDarkMode: boolean;
  currentRole?: UserRole;
  currentUser?: ConsoleUser | null;
  userName?: string;
  onSignOut?: () => void;
  onOpenSecurityModal?: () => void;
  isOpenMobile?: boolean;
  setIsOpenMobile?: (open: boolean) => void;
}

export const ConsoleSidebar: React.FC<ConsoleSidebarProps> = ({
  currentView,
  setCurrentView,
  isDarkMode,
  currentRole = 'SUPER ADMIN',
  currentUser,
  userName = 'Sachin Gharbude',
  onSignOut,
  onOpenSecurityModal,
  setIsOpenMobile,
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

  const displayName = currentUser?.name || userName;
  const displayEmail = currentUser?.email || 'owner@guruom.in';
  const displayRole = currentUser?.role || currentRole;
  const initials = displayName
    .split(' ')
    .map(part => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase() || 'GO';

  const navButtonClass = (active: boolean) => `sidebar-module-btn group relative flex w-full items-center rounded-2xl transition-all duration-150 cursor-pointer active:scale-[0.98] ${
    isCollapsed ? 'h-11 justify-center px-2.5' : 'h-11 gap-3.5 px-3.5'
  } ${
    active
      ? 'bg-[var(--accent-primary)] text-white font-semibold shadow-md shadow-[var(--accent-shadow)] border border-white/20'
      : isDarkMode
        ? 'text-slate-300 hover:text-white hover:bg-white/[0.08]'
        : 'text-slate-600 hover:text-slate-950 hover:bg-slate-100'
  }`;

  return (
    <aside className={`hidden h-full shrink-0 overflow-visible p-3.5 pr-0 font-sans transition-[width] duration-300 lg:flex ${
      isCollapsed ? 'w-[92px]' : 'w-[308px]'
    }`}>
      <div className={`console-sidebar relative flex h-full w-full flex-col overflow-visible rounded-3xl border transition-all ${
        isDarkMode 
          ? 'border-white/15 bg-[#131317]/95 text-white shadow-[inset_0_1px_0_0_rgba(255,255,255,0.14),0_20px_50px_rgba(0,0,0,0.7)] backdrop-blur-3xl' 
          : 'border-slate-200 bg-white text-slate-800 shadow-md'
      }`}>
        
        {/* ========================================================================= */}
        {/* ── TOP: BRAND & COLLAPSE TRIGGER ──                                       */}
        {/* ========================================================================= */}
        <div className={`flex h-[74px] shrink-0 items-center border-b border-white/15 dark:border-white/15 ${
          isCollapsed ? 'justify-center px-3' : 'justify-between px-4'
        }`}>
          {!isCollapsed && (
            <div className="flex min-w-0 items-center gap-3">
              <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[var(--accent-gradient-from)] to-[var(--accent-gradient-to)] text-white shadow-md shadow-[var(--accent-shadow)]">
                <Command className="h-5 w-5" strokeWidth={2.5} />
                <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full border-2 border-[#09090B] bg-emerald-400" />
              </div>
              <div className="min-w-0">
                <div className="truncate text-[15px] font-bold tracking-tight text-slate-900 dark:text-white">GuruOm</div>
                <div className="mt-0.5 truncate font-mono text-[9.5px] font-semibold uppercase tracking-wider text-[var(--accent-text-light)] dark:text-[var(--accent-text-dark)]">OwnerOS</div>
              </div>
            </div>
          )}

          <button
            type="button"
            onClick={toggleCollapse}
            className={`flex h-8.5 w-8.5 shrink-0 items-center justify-center rounded-full border transition-all active:scale-95 cursor-pointer shadow-2xs ${
              isDarkMode
                ? isCollapsed
                  ? 'border-white/15 bg-white/[0.08] text-white hover:bg-white/15'
                  : 'border-white/15 bg-white/[0.04] text-slate-300 hover:bg-white/[0.08] hover:text-white'
                : 'border-slate-200 bg-slate-50 text-slate-500 hover:bg-slate-100 hover:text-slate-950'
            }`}
            title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {isCollapsed ? <PanelLeftOpen className="h-4.5 w-4.5" /> : <PanelLeftClose className="h-4.5 w-4.5" />}
          </button>
        </div>

        {/* ========================================================================= */}
        {/* ── MIDDLE: SCROLLABLE NAVIGATION TREE ──                                  */}
        {/* ========================================================================= */}
        <div ref={scrollContainerRef} data-lenis-prevent="true" className="no-scrollbar flex-1 overflow-y-auto px-3.5 py-4 space-y-4">
          
          {/* Workspace Root */}
          <div>
            {!isCollapsed && (
              <div className="mb-2 px-2 font-mono text-[9.5px] font-bold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
                Workspace
              </div>
            )}

            <button
              type="button"
              onClick={() => handleSelectView('command-centre')}
              className={navButtonClass(currentView === 'command-centre')}
              title="Command Centre"
            >
              <LayoutGrid className="h-4.5 w-4.5 shrink-0" />
              {!isCollapsed && (
                <>
                  <span className="flex-1 text-left text-xs sm:text-[13px] font-semibold">Command Centre</span>
                  <span className="flex items-center gap-1 font-mono text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" /> Live
                  </span>
                </>
              )}
            </button>
          </div>

          {/* Departments */}
          <div>
            {!isCollapsed && (
              <div className="mb-2 px-2 flex items-center justify-between font-mono text-[9.5px] font-bold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
                <span>Departments</span>
                <span className={`rounded-full px-2 py-0.5 border font-mono text-[9px] ${
                  isDarkMode ? 'border-white/15 bg-white/[0.06] text-slate-300' : 'border-slate-200 bg-slate-100 text-slate-600'
                }`}>
                  {NAVIGATION_SECTIONS.length}
                </span>
              </div>
            )}

            <div className="space-y-1">
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
                      className={`sidebar-module-btn group relative flex w-full items-center rounded-2xl transition-all duration-150 cursor-pointer active:scale-[0.98] ${
                        isCollapsed ? 'h-11 justify-center px-2.5' : 'h-11 gap-3.5 px-3.5'
                      } ${
                        hasActiveChild
                          ? isDarkMode
                            ? 'bg-white/[0.1] text-white font-semibold border border-white/15 shadow-2xs'
                            : 'bg-slate-100 text-slate-900 font-semibold'
                          : isDarkMode
                            ? 'text-slate-300 hover:text-white hover:bg-white/[0.06]'
                            : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                      }`}
                      title={isCollapsed ? section.label : undefined}
                    >
                      <SectionIcon className={`h-4.5 w-4.5 shrink-0 ${hasActiveChild ? 'text-[var(--accent-text-light)] dark:text-[var(--accent-text-dark)]' : ''}`} />
                      {!isCollapsed && (
                        <>
                          <span className="min-w-0 flex-1 truncate text-left text-xs sm:text-[13px] font-semibold">{section.label}</span>
                          <ChevronDown className={`h-3.5 w-3.5 text-slate-400 transition-transform ${isOpen ? 'rotate-180 text-slate-900 dark:text-white' : ''}`} />
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
                          <div className={`relative ml-4 space-y-0.5 py-1.5 pl-3.5 border-l ${
                            isDarkMode ? 'border-white/15' : 'border-slate-200'
                          }`}>
                            {allowedItems.map(item => {
                              const ItemIcon = item.icon;
                              const isActive = currentView === item.id || (currentView === 'order-detail' && item.id === 'orders');
                              return (
                                <button
                                  key={item.id}
                                  type="button"
                                  onClick={() => handleSelectView(item.id)}
                                  className={`flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-xs sm:text-[12.5px] transition-all cursor-pointer active:scale-[0.98] ${
                                    isActive
                                      ? 'bg-[var(--accent-primary)] text-white font-semibold shadow-sm shadow-[var(--accent-shadow)] border border-white/20'
                                      : isDarkMode
                                        ? 'text-slate-300 hover:text-white hover:bg-white/[0.06]'
                                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                                  }`}
                                >
                                  <ItemIcon className="h-3.5 w-3.5 shrink-0" />
                                  <span className="min-w-0 flex-1 truncate">{item.label}</span>
                                  {isActive && <ChevronRight className="h-3 w-3 shrink-0" />}
                                </button>
                              );
                            })}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* Collapsed Hover Flyout */}
                    {isCollapsed && hoveredSection === section.id && (
                      <div className={`absolute left-full top-0 z-50 ml-3 w-64 overflow-hidden rounded-3xl border p-2.5 shadow-[0_24px_60px_rgba(0,0,0,0.8),inset_0_1px_0_0_rgba(255,255,255,0.12)] backdrop-blur-3xl ${
                        isDarkMode ? 'bg-[#18181D]/98 border-white/15 text-white' : 'bg-white border-slate-200 text-slate-900'
                      }`}>
                        <div className={`flex items-center gap-2 border-b px-3 py-2 text-xs font-bold ${
                          isDarkMode ? 'border-white/15 text-white' : 'border-slate-200 text-slate-900'
                        }`}>
                          <SectionIcon className="h-4 w-4 text-[var(--accent-primary)]" />
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
                                className={`flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-xs font-semibold transition-all cursor-pointer ${
                                  isActive 
                                    ? 'bg-[var(--accent-primary)] text-white shadow-sm' 
                                    : isDarkMode ? 'text-slate-300 hover:bg-white/[0.08]' : 'text-slate-700 hover:bg-slate-100'
                                }`}
                              >
                                <ItemIcon className="h-3.5 w-3.5 shrink-0" />
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
        {/* ── BOTTOM: APPLE USER CONTACT PASS & ACTIONS ──                          */}
        {/* ========================================================================= */}
        <div className={`shrink-0 border-t p-3.5 ${isDarkMode ? 'border-white/15' : 'border-slate-200'}`}>
          {!isCollapsed ? (
            <div className={`p-3 rounded-2xl border transition-all ${
              isDarkMode ? 'bg-white/[0.04] border-white/15 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.08)] hover:bg-white/[0.07] hover:border-white/25' : 'bg-slate-50 border-slate-200 hover:bg-slate-100'
            }`}>
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[var(--accent-gradient-from)] to-[var(--accent-gradient-to)] text-[11px] font-bold text-white shadow-sm">
                  {initials}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-xs font-bold text-slate-900 dark:text-white">{displayName}</div>
                  <div className="truncate font-mono text-[9px] text-slate-500 dark:text-slate-400">{displayEmail}</div>
                </div>
                <span className="h-2 w-2 shrink-0 rounded-full bg-emerald-400 shadow-sm" title="Online" />
              </div>

              <div className={`mt-2.5 flex items-center justify-between border-t pt-2 ${isDarkMode ? 'border-white/15' : 'border-slate-200'}`}>
                <span className="max-w-[140px] truncate font-mono text-[9.5px] font-semibold uppercase tracking-wider text-[var(--accent-text-light)] dark:text-[var(--accent-text-dark)]">
                  {displayRole}
                </span>
                <div className="flex items-center gap-1">
                  {onOpenSecurityModal && (
                    <button
                      type="button"
                      onClick={onOpenSecurityModal}
                      className={`flex h-7.5 w-7.5 items-center justify-center rounded-lg transition-all active:scale-95 cursor-pointer ${
                        isDarkMode ? 'text-slate-300 hover:bg-white/10 hover:text-white' : 'text-slate-500 hover:bg-slate-200 hover:text-slate-900'
                      }`}
                      title="Security and sessions"
                    >
                      <ShieldCheck className="h-4 w-4" />
                    </button>
                  )}
                  {onSignOut && (
                    <button
                      type="button"
                      onClick={onSignOut}
                      className={`flex h-7.5 w-7.5 items-center justify-center rounded-lg hover:bg-rose-500/20 hover:text-rose-400 transition-all active:scale-95 cursor-pointer ${
                        isDarkMode ? 'text-slate-300' : 'text-slate-500'
                      }`}
                      title="Sign out"
                    >
                      <LogOut className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2">
              <div
                className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[var(--accent-gradient-from)] to-[var(--accent-gradient-to)] text-[11px] font-bold text-white shadow-sm"
                title={`${displayName} - ${displayRole}`}
              >
                {initials}
              </div>
              {onSignOut && (
                <button
                  type="button"
                  onClick={onSignOut}
                  className={`flex h-8.5 w-8.5 items-center justify-center rounded-full hover:bg-rose-500/20 hover:text-rose-400 transition-all active:scale-95 cursor-pointer ${
                    isDarkMode ? 'text-slate-300' : 'text-slate-500'
                  }`}
                  title="Sign out"
                >
                  <LogOut className="h-4 w-4" />
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
