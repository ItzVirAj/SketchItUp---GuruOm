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
} from 'lucide-react';
import { ConsoleUser, ConsoleView, UserRole } from '../../types/console';
import { useSmoothScroll } from '../../hooks/useSmoothScroll';
import { isViewAllowedForRole } from '../../utils/permissions';
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

  const navButtonClass = (active: boolean) => `sidebar-module-btn group relative flex w-full items-center rounded-xl border transition-all ${
    isCollapsed ? 'h-11 justify-center px-2' : 'min-h-11 gap-3 px-3'
  } ${
    active
      ? isDarkMode
        ? 'is-active border-white/10 bg-white/[0.09] text-white shadow-none'
        : 'is-active border-[var(--accent-border-light)] bg-[var(--accent-soft-light)] text-[var(--accent-text-light)] shadow-none'
      : isDarkMode
        ? 'border-transparent text-slate-400 hover:border-white/[0.06] hover:bg-white/[0.06] hover:text-white'
        : 'border-transparent text-slate-600 hover:border-slate-200 hover:bg-slate-100 hover:text-slate-950'
  }`;

  return (
    <aside className={`hidden h-full shrink-0 overflow-visible p-3 pr-0 font-sans transition-[width] duration-300 lg:flex ${
      isCollapsed ? 'w-[88px]' : 'w-[280px]'
    }`}>
      <div className={`console-sidebar ${isDarkMode ? 'console-sidebar-dark border-white/[0.07] bg-[#11151d] text-slate-300 shadow-[0_20px_55px_rgba(15,23,42,0.18)]' : 'console-sidebar-light border-slate-200 bg-white text-slate-700 shadow-[0_16px_42px_rgba(15,23,42,0.08)]'} relative flex h-full w-full flex-col overflow-visible rounded-[24px] border`}>
        <div className={`flex h-[76px] shrink-0 items-center border-b ${isDarkMode ? 'border-white/[0.07]' : 'border-slate-200'} ${
          isCollapsed ? 'justify-center px-3' : 'justify-between px-4'
        }`}>
          {!isCollapsed && (
            <div className="flex min-w-0 items-center gap-3">
              <div className={`relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl shadow-sm ${isDarkMode ? 'bg-white text-[#11151d]' : 'bg-slate-950 text-white'}`}>
                <Command className="h-5 w-5" strokeWidth={2.4} />
                <span className={`absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full border-2 bg-emerald-400 ${isDarkMode ? 'border-[#11151d]' : 'border-white'}`} />
              </div>
              <div className="min-w-0">
                <div className={`truncate text-[15px] font-extrabold tracking-[-0.03em] ${isDarkMode ? 'text-white' : 'text-slate-950'}`}>GuruOm OS</div>
                <div className={`mt-0.5 truncate font-mono text-[9px] font-semibold uppercase tracking-[0.16em] ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>Operations system</div>
              </div>
            </div>
          )}

          <button
            type="button"
            onClick={toggleCollapse}
            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border transition-colors ${
              isDarkMode
                ? isCollapsed
                  ? 'border-white/10 bg-white/[0.07] text-white hover:bg-white/[0.12]'
                  : 'border-white/[0.07] text-slate-500 hover:bg-white/[0.07] hover:text-white'
                : 'border-slate-200 bg-slate-50 text-slate-500 hover:bg-slate-100 hover:text-slate-950'
            }`}
            title={isCollapsed ? 'Expand navigation' : 'Collapse navigation'}
          >
            {isCollapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
          </button>
        </div>

        <div ref={scrollContainerRef} data-lenis-prevent="true" className="no-scrollbar flex-1 overflow-y-auto px-3 py-4">
          {!isCollapsed && (
            <div className={`mb-2 px-2 font-mono text-[10px] font-bold uppercase tracking-[0.18em] ${isDarkMode ? 'text-slate-600' : 'text-slate-400'}`}>Workspace</div>
          )}

          <button type="button" onClick={() => handleSelectView('command-centre')} className={navButtonClass(currentView === 'command-centre')} title="Command Centre">
            {currentView === 'command-centre' && <span className={`absolute left-0 h-5 w-[3px] rounded-r-full ${isDarkMode ? 'bg-white' : 'bg-[var(--accent-primary)]'}`} />}
            <LayoutGrid className="sidebar-icon h-[19px] w-[19px] shrink-0" />
            {!isCollapsed && (
              <>
                <span className="flex-1 text-left text-[14.3px] font-bold">Command Centre</span>
                <span className="flex items-center gap-1.5 font-mono text-[8.5px] font-bold uppercase tracking-wider text-emerald-400">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" /> Live
                </span>
              </>
            )}
          </button>

          {!isCollapsed && (
            <div className="mb-2 mt-6 flex items-center justify-between px-2">
              <span className={`font-mono text-[10px] font-bold uppercase tracking-[0.18em] ${isDarkMode ? 'text-slate-600' : 'text-slate-400'}`}>Departments</span>
              <span className={`rounded-md px-1.5 py-0.5 font-mono text-[8.5px] ${isDarkMode ? 'bg-white/[0.05] text-slate-500' : 'bg-slate-100 text-slate-500'}`}>{NAVIGATION_SECTIONS.length}</span>
            </div>
          )}

          <div className="space-y-1">
            {NAVIGATION_SECTIONS.map(section => {
              const SectionIcon = section.icon;
              const allowedItems = section.items.filter(item => isViewAllowedForRole(displayRole, item.id));
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
                    className={navButtonClass(hasActiveChild)}
                    title={isCollapsed ? section.label : undefined}
                  >
                    {hasActiveChild && <span className="absolute left-0 h-5 w-[3px] rounded-r-full bg-[var(--accent-primary)]" />}
                    <SectionIcon className={`sidebar-icon h-[19px] w-[19px] shrink-0 ${hasActiveChild ? 'text-[var(--accent-text-dark)]' : ''}`} />
                    {!isCollapsed && (
                      <>
                        <span className="min-w-0 flex-1 truncate text-left text-[14.3px] font-bold">{section.label}</span>
                        <ChevronDown className={`sidebar-chevron h-4 w-4 transition-transform ${isDarkMode ? 'text-slate-600' : 'text-slate-400'} ${isOpen ? `rotate-180 ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}` : ''}`} />
                      </>
                    )}
                  </button>

                  <AnimatePresence initial={false}>
                    {!isCollapsed && isOpen && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                        className="overflow-hidden"
                      >
                        <div className={`relative ml-[21px] space-y-0.5 py-1 pl-4 before:absolute before:bottom-2 before:left-0 before:top-1 before:w-px ${isDarkMode ? 'before:bg-white/[0.08]' : 'before:bg-slate-200'}`}>
                          {allowedItems.map(item => {
                            const ItemIcon = item.icon;
                            const isActive = currentView === item.id || (currentView === 'order-detail' && item.id === 'orders');
                            return (
                              <button
                                key={item.id}
                                type="button"
                                onClick={() => handleSelectView(item.id)}
                                className={`sidebar-module-btn group flex w-full items-center gap-2.5 rounded-lg border px-2.5 py-2 text-left transition-colors ${
                                  isActive
                                    ? isDarkMode
                                      ? 'is-active border-[var(--accent-border-dark)] bg-[var(--accent-soft-dark)] text-white shadow-none'
                                      : 'is-active border-[var(--accent-border-light)] bg-[var(--accent-soft-light)] text-[var(--accent-text-light)] shadow-none'
                                    : isDarkMode
                                      ? 'border-transparent text-slate-500 hover:border-white/[0.05] hover:bg-white/[0.05] hover:text-slate-200'
                                      : 'border-transparent text-slate-500 hover:border-slate-200 hover:bg-slate-100 hover:text-slate-900'
                                }`}
                              >
                                <ItemIcon className={`sidebar-icon h-4 w-4 shrink-0 ${isActive ? 'text-[var(--accent-text-dark)]' : ''}`} />
                                <span className="min-w-0 flex-1 truncate text-[14.4px] font-semibold">{item.label}</span>
                                {isActive && <ChevronRight className="h-3.5 w-3.5 shrink-0 text-[var(--accent-text-dark)]" />}
                              </button>
                            );
                          })}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {isCollapsed && hoveredSection === section.id && (
                    <div className="absolute left-full top-0 z-50 ml-3 w-64 overflow-hidden rounded-2xl border border-slate-200 bg-white p-2 text-slate-900 shadow-[0_20px_60px_rgba(15,23,42,0.22)] dark:border-white/10 dark:bg-[#181d27] dark:text-white">
                      <div className="flex items-center gap-2 border-b border-slate-100 px-2.5 py-2 text-[14px] font-extrabold dark:border-white/[0.07]">
                        <SectionIcon className="h-4 w-4 text-[var(--accent-primary)]" />
                        {section.label}
                      </div>
                      <div className="space-y-0.5 pt-1.5">
                        {allowedItems.map(item => {
                          const ItemIcon = item.icon;
                          const isActive = currentView === item.id || (currentView === 'order-detail' && item.id === 'orders');
                          return (
                            <button
                              key={item.id}
                              type="button"
                              onClick={() => handleSelectView(item.id)}
                              className={`sidebar-module-btn flex w-full items-center gap-2.5 rounded-xl border px-2.5 py-2 text-left text-[14.4px] font-semibold ${
                                isActive ? 'is-active border-transparent bg-[var(--accent-primary)] text-white' : 'border-transparent text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-white/[0.06]'
                              }`}
                            >
                              <ItemIcon className="sidebar-icon h-4 w-4" />
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

        <div className={`shrink-0 border-t p-3 ${isDarkMode ? 'border-white/[0.07]' : 'border-slate-200'}`}>
          {!isCollapsed ? (
            <div className={`rounded-2xl border p-2.5 ${isDarkMode ? 'border-white/[0.08] bg-white/[0.045]' : 'border-slate-200 bg-slate-50'}`}>
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[var(--accent-gradient-from)] to-[var(--accent-gradient-to)] text-[11px] font-black text-white">
                  {initials}
                </div>
                <div className="min-w-0 flex-1">
                  <div className={`truncate text-[12px] font-extrabold ${isDarkMode ? 'text-white' : 'text-slate-950'}`}>{displayName}</div>
                  <div className={`mt-0.5 truncate font-mono text-[9px] ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>{displayEmail}</div>
                </div>
                <span className="h-2 w-2 shrink-0 rounded-full bg-emerald-400 shadow-[0_0_0_3px_rgba(52,211,153,0.12)]" title="Online" />
              </div>
              <div className={`mt-2.5 flex items-center justify-between border-t pt-2 ${isDarkMode ? 'border-white/[0.07]' : 'border-slate-200'}`}>
                <span className="max-w-[135px] truncate font-mono text-[8px] font-bold uppercase tracking-wider text-slate-500">{displayRole}</span>
                <div className="flex items-center gap-1">
                  {onOpenSecurityModal && (
                    <button type="button" onClick={onOpenSecurityModal} className={`flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 transition-colors ${isDarkMode ? 'hover:bg-white/[0.08] hover:text-white' : 'hover:bg-slate-200 hover:text-slate-950'}`} title="Security and sessions">
                      <ShieldCheck className="h-4 w-4" />
                    </button>
                  )}
                  {onSignOut && (
                    <button type="button" onClick={onSignOut} className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-rose-500/10 hover:text-rose-400" title="Log out">
                      <LogOut className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[var(--accent-gradient-from)] to-[var(--accent-gradient-to)] text-[11px] font-black text-white" title={`${displayName} - ${displayRole}`}>
                {initials}
              </div>
              {onSignOut && (
                <button type="button" onClick={onSignOut} className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-500 transition-colors hover:bg-rose-500/10 hover:text-rose-400" title="Log out">
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
