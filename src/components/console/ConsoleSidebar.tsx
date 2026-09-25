import React, { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  ChevronDown,
  LayoutGrid,
  LogOut,
  PanelLeftClose,
  Search,
  ShieldCheck,
  Sun,
  Moon,
  Bell,
  RefreshCw,
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

  const handleThemeToggle = () => {
    setIsDarkMode?.(!isDarkMode);
  };

  const { profile: authProfile } = useAuth();

  const activeUser = currentUser || authProfile;

  const displayName =
    activeUser?.name ||
    (activeUser as any)?.fullName ||
    userName ||
    'GuruOm Admin';

  const displayEmail = activeUser?.email || 'owner@guruom.in';
  const displayRole = activeUser?.role || currentRole || 'SUPER ADMIN';

  const initials =
    (displayName || 'GO')
      .split(' ')
      .filter(Boolean)
      .map(part => part[0])
      .join('')
      .slice(0, 2)
      .toUpperCase() || 'GO';

  /*
   * Theme tokens
   *
   * A drafting-ledger palette: cool graphite paper in light mode, ink
   * charcoal in dark mode, one signature blueprint-blue accent that carries
   * every "you are here" signal so it never competes with itself.
   */
  const ACCENT = '#3B6FE0';
  const ACCENT_SOFT_LIGHT = 'rgba(59,111,224,0.10)';
  const ACCENT_SOFT_DARK = 'rgba(59,111,224,0.16)';

  const ink = isDarkMode ? 'text-[#EDEEF0]' : 'text-[#17181B]';
  const inkMuted = isDarkMode ? 'text-[#8B909A]' : 'text-[#6B6E76]';
  const hairline = isDarkMode ? 'border-[#2A2D33]' : 'border-[#DEDCD4]';

  const sectionHeaderClass = `
    mb-2 flex items-center justify-between px-2
    text-[11px] font-semibold ${inkMuted}
  `;

  return (
    <aside
      className={`hidden h-full shrink-0 font-sans transition-[width] duration-300
        lg:flex select-none
        ${isCollapsed ? 'w-[84px]' : 'w-[280px]'}`}
    >
      <div
        className={`
          console-sidebar relative flex h-full w-full flex-col
          border rounded-2xl
          select-none overflow-hidden
          transition-colors duration-300
          ${isDarkMode
            ? `${ink} ${hairline} bg-[#101114]`
            : `${ink} ${hairline} bg-[#F6F5F1]`
          }
        `}
      >
        {/* ===================================================================== */}
        {/* TOP: BRAND & COLLAPSE TRIGGER                                         */}
        {/* ===================================================================== */}

        <div
          className={`
            flex h-[72px] shrink-0 items-center border-b
            transition-colors duration-300 ${hairline}
            ${isCollapsed ? 'justify-center px-2.5' : 'justify-between px-4'}
          `}
        >
          {!isCollapsed ? (
            <div className="flex min-w-0 items-center gap-3">
              <div
                className={`
                  relative flex h-9 w-9 shrink-0 items-center justify-center
                  rounded-lg border p-1 overflow-hidden
                  ${isDarkMode ? 'bg-black border-white/15' : 'bg-white border-black/10'}
                `}
              >
                <img src="/logo.png" alt="OwnerOS" className="h-full w-full object-contain" />
              </div>

              <div className="flex min-w-0 flex-col leading-none">
                <span className={`truncate text-[17px] font-bold tracking-tight ${ink}`}>
                  OwnerOS
                </span>
                <span
                  className="mt-1 truncate text-[11px] font-medium"
                  style={{ color: ACCENT }}
                >
                  SketchitUp Solutions
                </span>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={toggleCollapse}
              className={`
                relative flex h-9 w-9 shrink-0 items-center justify-center
                rounded-lg border p-1 overflow-hidden cursor-pointer
                transition-transform duration-150 active:scale-95
                ${isDarkMode ? 'bg-black border-white/15' : 'bg-white border-black/10'}
              `}
              title="Expand sidebar"
            >
              <img src="/logo.png" alt="OwnerOS" className="h-full w-full object-contain" />
            </button>
          )}

          {!isCollapsed && (
            <div className="flex items-center gap-1.5">
              {setIsDarkMode && (
                <button
                  type="button"
                  onClick={handleThemeToggle}
                  title={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
                  aria-label="Toggle theme"
                  className={`
                    flex h-8 w-8 shrink-0 items-center justify-center rounded-lg
                    transition-colors duration-150 active:scale-95 cursor-pointer
                    ${isDarkMode ? `${inkMuted} hover:bg-white/[0.06] hover:text-white` : `${inkMuted} hover:bg-black/[0.05] hover:text-black`}
                  `}
                >
                  {isDarkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                </button>
              )}

              <button
                type="button"
                onClick={toggleCollapse}
                title="Collapse sidebar"
                className={`
                  flex h-8 w-8 shrink-0 items-center justify-center rounded-lg
                  transition-colors duration-150 active:scale-95 cursor-pointer
                  ${isDarkMode ? `${inkMuted} hover:bg-white/[0.06] hover:text-white` : `${inkMuted} hover:bg-black/[0.05] hover:text-black`}
                `}
              >
                <PanelLeftClose className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>

        {/* ===================================================================== */}
        {/* QUICK FIND                                                            */}
        {/* ===================================================================== */}

        {onOpenCommandPalette && !isCollapsed && (
          <div className="shrink-0 px-3.5 pt-3.5">
            <button
              type="button"
              onClick={onOpenCommandPalette}
              className={`
                flex w-full items-center gap-2 rounded-lg border px-3 py-2
                text-left text-[13px] transition-colors duration-150 cursor-pointer
                ${isDarkMode
                  ? `${hairline} ${inkMuted} hover:border-white/25 hover:text-white`
                  : `${hairline} ${inkMuted} hover:border-black/20 hover:text-black`
                }
              `}
            >
              <Search className="h-3.5 w-3.5 shrink-0" />
              <span className="flex-1">Jump to&hellip;</span>
              <kbd
                className={`
                  rounded border px-1.5 py-0.5 font-mono text-[10px]
                  ${isDarkMode ? 'border-white/15 text-white/50' : 'border-black/10 text-black/45'}
                `}
              >
                &#8984;K
              </kbd>
            </button>
          </div>
        )}

        {/* ===================================================================== */}
        {/* MIDDLE: SCROLLABLE NAVIGATION TREE                                    */}
        {/* ===================================================================== */}

        <div
          ref={scrollContainerRef}
          data-lenis-prevent="true"
          className="no-scrollbar flex-1 overflow-y-auto px-3.5 py-4 space-y-5"
        >
          {/* Workspace Root */}
          <div>
            {!isCollapsed && <div className={sectionHeaderClass}>Workspace</div>}

            <button
              type="button"
              onClick={() => handleSelectView('command-centre')}
              title="Command Centre"
              className={`
                group relative flex w-full items-center rounded-xl
                transition-colors duration-150 cursor-pointer active:scale-[0.99]
                ${isCollapsed ? 'h-11 justify-center px-2' : 'h-11 gap-3 px-3.5'}
                ${currentView === 'command-centre'
                  ? isDarkMode
                    ? 'bg-white text-black font-semibold'
                    : 'bg-[#17181B] text-white font-semibold'
                  : isDarkMode
                    ? `${ink} hover:bg-white/[0.06]`
                    : `${ink} hover:bg-black/[0.04]`
                }
              `}
            >
              <LayoutGrid className="h-[18px] w-[18px] shrink-0" />

              {!isCollapsed && (
                <>
                  <span className="flex-1 text-left text-[14px] font-medium">Command Centre</span>
                  <span
                    className={`
                      flex items-center gap-1.5 text-[10px] font-medium
                      ${currentView === 'command-centre'
                        ? isDarkMode ? 'text-black/60' : 'text-white/60'
                        : 'text-emerald-600'
                      }
                    `}
                  >
                    <span
                      className={`h-1.5 w-1.5 rounded-full ${currentView === 'command-centre'
                          ? isDarkMode ? 'bg-black/60' : 'bg-white/60'
                          : 'bg-emerald-500 animate-pulse'
                        }`}
                    />
                    Live
                  </span>
                </>
              )}
            </button>
          </div>

          {/* Departments */}
          <div>
            {!isCollapsed && (
              <div className={sectionHeaderClass}>
                <span>Departments</span>
                <span className={inkMuted}>{NAVIGATION_SECTIONS.length}</span>
              </div>
            )}

            <div className="space-y-0.5">
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
                      title={isCollapsed ? section.label : undefined}
                      className={`
                        group relative flex w-full items-center rounded-lg
                        transition-colors duration-150 cursor-pointer
                        ${isCollapsed ? 'h-11 justify-center px-2' : 'h-10 gap-3 px-2.5'}
                        ${isDarkMode ? 'hover:bg-white/[0.05]' : 'hover:bg-black/[0.035]'}
                      `}
                      style={
                        hasActiveChild && !isCollapsed
                          ? { backgroundColor: isDarkMode ? ACCENT_SOFT_DARK : ACCENT_SOFT_LIGHT }
                          : undefined
                      }
                    >
                      {hasActiveChild && (
                        <span
                          className="absolute left-0 top-1/2 h-5 w-[2.5px] -translate-y-1/2 rounded-full"
                          style={{ backgroundColor: ACCENT }}
                        />
                      )}

                      <SectionIcon
                        className={`h-[17px] w-[17px] shrink-0 ${hasActiveChild ? '' : inkMuted
                          }`}
                        style={hasActiveChild ? { color: ACCENT } : undefined}
                      />

                      {!isCollapsed && (
                        <>
                          <span
                            className={`min-w-0 flex-1 truncate text-left text-[13.5px] ${hasActiveChild ? `font-semibold ${ink}` : `font-medium ${ink}`
                              }`}
                          >
                            {section.label}
                          </span>

                          <ChevronDown
                            className={`h-3.5 w-3.5 shrink-0 transition-transform duration-200 ${inkMuted} ${isOpen ? 'rotate-180' : ''
                              }`}
                          />
                        </>
                      )}
                    </button>

                    <AnimatePresence initial={false}>
                      {!isCollapsed && isOpen && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
                          className="overflow-hidden"
                        >
                          <div className={`relative ml-[19px] space-y-0.5 border-l py-1 pl-4 ${hairline}`}>
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
                                    flex w-full items-center gap-2.5 rounded-md
                                    px-2.5 py-[7px] text-left
                                    transition-colors duration-150 cursor-pointer
                                    ${isActive
                                      ? ''
                                      : isDarkMode
                                        ? `${inkMuted} hover:bg-white/[0.05] hover:text-white`
                                        : `${inkMuted} hover:bg-black/[0.04] hover:text-black`
                                    }
                                  `}
                                  style={
                                    isActive
                                      ? {
                                        backgroundColor: isDarkMode ? ACCENT_SOFT_DARK : ACCENT_SOFT_LIGHT,
                                        color: ACCENT,
                                      }
                                      : undefined
                                  }
                                >
                                  <ItemIcon className="h-[15px] w-[15px] shrink-0" />
                                  <span
                                    className={`min-w-0 flex-1 truncate text-[13px] ${isActive ? 'font-semibold' : 'font-medium'
                                      }`}
                                  >
                                    {item.label}
                                  </span>
                                </button>
                              );
                            })}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* COLLAPSED HOVER FLYOUT */}
                    {isCollapsed && hoveredSection === section.id && (
                      <div
                        className={`
                          absolute left-full top-0 z-50 ml-3 w-64 overflow-hidden
                          rounded-xl border p-2.5 shadow-2xl
                          ${isDarkMode ? 'border-white/15 bg-[#17181B]' : 'border-black/10 bg-white'}
                        `}
                      >
                        <div className={`flex items-center gap-2 border-b px-2 pb-2 text-[13px] font-semibold ${hairline} ${ink}`}>
                          <SectionIcon className="h-4 w-4" style={{ color: ACCENT }} />
                          <span>{section.label}</span>
                        </div>

                        <div className="space-y-0.5 pt-2">
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
                                  flex w-full items-center gap-2.5 rounded-md
                                  px-2.5 py-[7px] text-left text-[13px] font-medium
                                  transition-colors duration-150 cursor-pointer
                                  ${isActive
                                    ? ''
                                    : isDarkMode
                                      ? `${inkMuted} hover:bg-white/[0.06] hover:text-white`
                                      : `${inkMuted} hover:bg-black/[0.05] hover:text-black`
                                  }
                                `}
                                style={
                                  isActive
                                    ? { backgroundColor: isDarkMode ? ACCENT_SOFT_DARK : ACCENT_SOFT_LIGHT, color: ACCENT }
                                    : undefined
                                }
                              >
                                <ItemIcon className="h-[15px] w-[15px] shrink-0" />
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

        {/* ===================================================================== */}
        {/* BOTTOM: STATUS & PROFILE                                              */}
        {/* ===================================================================== */}

        <div className={`shrink-0 border-t px-3 py-3 ${hairline}`}>
          {!isCollapsed && (onSync || onOpenNotifications) && (
            <div className="mb-2.5 flex items-center justify-between px-1">
              {onSync ? (
                <button
                  type="button"
                  onClick={onSync}
                  disabled={isSyncing}
                  title={lastSynced ? `Last synced ${lastSynced}` : 'Sync now'}
                  className={`
                    flex items-center gap-1.5 text-[11px] font-medium
                    transition-colors duration-150 cursor-pointer disabled:cursor-wait
                    ${inkMuted} ${isDarkMode ? 'hover:text-white' : 'hover:text-black'}
                  `}
                >
                  <RefreshCw className={`h-3 w-3 ${isSyncing ? 'animate-spin' : ''}`} />
                  {isSyncing ? 'Syncing…' : lastSynced ? `Synced ${lastSynced}` : 'Sync'}
                </button>
              ) : (
                <span />
              )}

              {onOpenNotifications && (
                <button
                  type="button"
                  onClick={onOpenNotifications}
                  title="Notifications"
                  className={`
                    relative flex h-7 w-7 items-center justify-center rounded-lg
                    transition-colors duration-150 cursor-pointer
                    ${inkMuted} ${isDarkMode ? 'hover:bg-white/[0.06] hover:text-white' : 'hover:bg-black/[0.05] hover:text-black'}
                  `}
                >
                  <Bell className="h-4 w-4" />
                  {unreadNotificationsCount > 0 && (
                    <span
                      className="absolute -right-0.5 -top-0.5 flex h-3.5 min-w-3.5 items-center justify-center rounded-full px-0.5 text-[9px] font-bold text-white"
                      style={{ backgroundColor: ACCENT }}
                    >
                      {unreadNotificationsCount > 9 ? '9+' : unreadNotificationsCount}
                    </span>
                  )}
                </button>
              )}
            </div>
          )}

          <div
            className={`
              flex items-center rounded-xl
              ${isCollapsed ? 'justify-center' : 'gap-2.5 px-1'}
            `}
          >
            <div
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[12px] font-bold text-white"
              style={{ backgroundColor: ACCENT }}
              title={displayName}
            >
              {initials}
            </div>

            {!isCollapsed && (
              <div className="min-w-0 flex-1 leading-none">
                <div className={`truncate text-[13px] font-semibold ${ink}`}>{displayName}</div>
                <div className={`mt-1 truncate text-[11px] ${inkMuted}`}>{displayEmail}</div>
              </div>
            )}

            {!isCollapsed && (
              <div className="flex shrink-0 items-center gap-0.5">
                {onOpenSecurityModal && (
                  <button
                    type="button"
                    onClick={onOpenSecurityModal}
                    title="Security"
                    className={`
                      flex h-7 w-7 items-center justify-center rounded-lg
                      transition-colors duration-150 cursor-pointer
                      ${inkMuted} ${isDarkMode ? 'hover:bg-white/[0.06] hover:text-white' : 'hover:bg-black/[0.05] hover:text-black'}
                    `}
                  >
                    <ShieldCheck className="h-4 w-4" />
                  </button>
                )}

                {onSignOut && (
                  <button
                    type="button"
                    onClick={onSignOut}
                    title="Sign out"
                    className={`
                      flex h-7 w-7 items-center justify-center rounded-lg
                      transition-colors duration-150 cursor-pointer
                      ${inkMuted} hover:bg-red-500/10 hover:text-red-500
                    `}
                  >
                    <LogOut className="h-4 w-4" />
                  </button>
                )}
              </div>
            )}
          </div>

          {!isCollapsed && (
            <div className={`mt-2.5 px-1 text-[10px] font-medium uppercase tracking-wide ${inkMuted}`}>
              {displayRole}
            </div>
          )}
        </div>
      </div>
    </aside>
  );
};

export default ConsoleSidebar;