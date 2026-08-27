import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  LayoutGrid, 
  ShoppingBag, 
  Box, 
  Activity, 
  Boxes, 
  Wrench, 
  FileText, 
  ShieldCheck, 
  ClipboardCheck, 
  Truck, 
  CheckSquare, 
  Receipt, 
  DollarSign, 
  Database, 
  Users, 
  Building2, 
  LogOut,
  Lock,
  ChevronDown,
  PanelLeftClose,
  PanelLeftOpen,
  Layers,
  CircleDollarSign,
  Settings,
  FlaskConical
} from 'lucide-react';
import { ConsoleView, UserRole, ConsoleUser } from '../../types/console';
import { isViewAllowedForRole } from '../../utils/permissions';
import { useSmoothScroll } from '../../hooks/useSmoothScroll';

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

interface DropdownSection {
  id: string;
  label: string;
  icon: React.ElementType;
  items: {
    id: ConsoleView;
    label: string;
    icon: React.ElementType;
  }[];
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
  isOpenMobile,
  setIsOpenMobile
}) => {
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const sectionRefs = useRef<Record<string, HTMLDivElement | null>>({});

  // Shrink / Expand state (persisted in localStorage)
  const [isCollapsed, setIsCollapsed] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('guruom_sidebar_collapsed');
      return saved ? JSON.parse(saved) : false;
    } catch {
      return false;
    }
  });

  const toggleCollapse = () => {
    setIsCollapsed(prev => {
      const next = !prev;
      localStorage.setItem('guruom_sidebar_collapsed', JSON.stringify(next));
      return next;
    });
  };

  // Section Groups Definition (Operations, Quality & Dispatch, Finance, Admin)
  const dropdownSections: DropdownSection[] = [
    {
      id: 'operations-reports',
      label: 'Operations & Reports',
      icon: Layers,
      items: [
        { id: 'orders', label: 'Orders', icon: ShoppingBag },
        { id: 'inventory', label: 'Inventory', icon: Box },
        { id: 'production', label: 'Production', icon: Activity },
        { id: 'finished-goods', label: 'Finished Goods', icon: Boxes },
        { id: 'plating-outwork', label: 'Plating / Outwork', icon: Wrench },
        { id: 'reports', label: 'Reports', icon: FileText },
      ]
    },
    {
      id: 'quality-dispatch',
      label: 'Quality & Dispatch',
      icon: ShieldCheck,
      items: [
        { id: 'qc', label: 'QC Inspection', icon: ShieldCheck },
        { id: 'pdi', label: 'PDI Inspection', icon: ClipboardCheck },
        { id: 'dispatch', label: 'Dispatch & Logistics', icon: Truck },
        { id: 'approvals', label: 'Management Approvals', icon: CheckSquare },
      ]
    },
    {
      id: 'finance',
      label: 'Finance & Accounts',
      icon: CircleDollarSign,
      items: [
        { id: 'invoices', label: 'Invoices & Payments', icon: Receipt },
        { id: 'payables', label: 'Vendor Payables', icon: DollarSign },
      ]
    },
    {
      id: 'admin',
      label: 'Admin & Systems',
      icon: Settings,
      items: [
        { id: 'masters', label: 'Master Catalogs', icon: Database },
        { id: 'users-audit', label: 'Users & Audit Logs', icon: Users },
        { id: 'company-profile', label: 'Company Profile', icon: Building2 },
        { id: 'workflow-testing', label: 'Workflow Testing', icon: FlaskConical },
      ]
    }
  ];

  // Map view to parent section
  const findParentSection = (view: ConsoleView): string | null => {
    if (view === 'command-centre') return null;
    if (view === 'order-detail') return 'operations-reports';
    for (const section of dropdownSections) {
      if (section.items.some(item => item.id === view)) {
        return section.id;
      }
    }
    return null;
  };

  // Expanded/Collapsed state for each accordion dropdown section
  const [openSections, setOpenSections] = useState<Record<string, boolean>>(() => {
    const parent = findParentSection(currentView);
    return {
      'operations-reports': parent === 'operations-reports' || true,
      'quality-dispatch': parent === 'quality-dispatch' || false,
      'finance': parent === 'finance' || false,
      'admin': parent === 'admin' || false,
    };
  });

  // Attach Butter-Smooth Container Inertial Scrolling
  useSmoothScroll(scrollContainerRef, [openSections, isCollapsed], {
    duration: 1.1,
    wheelMultiplier: 0.95,
    touchMultiplier: 1.25
  });

  // Automatically keep parent section open when active view changes
  useEffect(() => {
    const parent = findParentSection(currentView);
    if (parent) {
      setOpenSections(prev => ({
        ...prev,
        [parent]: true
      }));
    }
  }, [currentView]);

  /**
   * Smoothly scrolls only when a section expands and is partially or fully hidden under the UI.
   */
  const ensureSectionVisible = (sectionId: string) => {
    const el = sectionRefs.current[sectionId];
    const container = scrollContainerRef.current;
    if (!el || !container) return;

    const elRect = el.getBoundingClientRect();
    const containerRect = container.getBoundingClientRect();

    // Check if the bottom of the expanded section is hidden below the container view
    if (elRect.bottom > containerRect.bottom) {
      const overflowDistance = elRect.bottom - containerRect.bottom + 16;
      container.scrollBy({
        top: overflowDistance,
        behavior: 'smooth'
      });
    } else if (elRect.top < containerRect.top) {
      const underflowDistance = elRect.top - containerRect.top - 8;
      container.scrollBy({
        top: underflowDistance,
        behavior: 'smooth'
      });
    }
  };

  const toggleSection = (sectionId: string) => {
    setOpenSections(prev => {
      const isOpening = !prev[sectionId];
      const nextState = { ...prev, [sectionId]: isOpening };

      if (isOpening) {
        // Trigger smooth scroll check as the section expands
        setTimeout(() => {
          ensureSectionVisible(sectionId);
        }, 150);
        setTimeout(() => {
          ensureSectionVisible(sectionId);
        }, 320);
      }

      return nextState;
    });
  };

  // Hover Popover Flyout Menu State for Collapsed Mode
  const [hoveredSection, setHoveredSection] = useState<string | null>(null);

  const handleSelectView = (view: ConsoleView) => {
    setCurrentView(view);
    if (setIsOpenMobile) setIsOpenMobile(false);
    setHoveredSection(null);
  };

  // User Initials
  const displayName = currentUser ? currentUser.name : userName;
  const displayEmail = currentUser ? currentUser.email : 'owner@guruom.in';
  const initials = displayName
    .split(' ')
    .map(n => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase() || 'GA';

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      {isOpenMobile && (
        <div 
          onClick={() => setIsOpenMobile && setIsOpenMobile(false)}
          className="fixed inset-0 bg-slate-950/60 z-40 md:hidden backdrop-blur-xs"
        />
      )}

      <aside className={`
        fixed md:static inset-y-0 left-0 z-50 shrink-0 select-none font-sans transition-all duration-300 ease-in-out h-full max-h-screen overflow-hidden
        ${isOpenMobile ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
        ${isCollapsed ? 'w-[92px]' : 'w-[304px]'}
      `}>
      {/* Outer Floating Pill Sidebar Shell */}
      <div className="h-full w-full p-2.5 sm:p-3">
        <div className={`h-full w-full flex flex-col justify-between overflow-hidden font-sans rounded-3xl border transition-all duration-300 ease-in-out ${
          isCollapsed
            ? ''
            : isDarkMode
              ? 'shadow-[0_8px_40px_rgba(0,0,0,0.45)]'
              : 'shadow-[0_8px_32px_rgba(15,23,42,0.06)]'
        } ${
          isDarkMode
            ? 'bg-[#1A1B1F]/95 border-[#262832] text-slate-300'
            : 'bg-white/95 backdrop-blur-md border-[#E2EAE5] text-slate-800'
        }`}>

        {/* Top Header & Scrollable Nav Section */}
        <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
          {/* Brand Logo & Collapse Toggle */}
          <div className={`px-4 py-3.5 border-b border-[#d8dde8] dark:border-[#262832] flex items-center ${isCollapsed ? 'justify-center' : 'justify-between'} gap-2 shrink-0`}>
            {!isCollapsed ? (
              <>
                <div className="flex items-center gap-2.5 overflow-hidden">
                  <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-[var(--accent-gradient-from)] to-[var(--accent-gradient-to)] flex items-center justify-center text-white text-xs font-black shadow-sm shrink-0">
                    G
                  </div>
                  <div className="flex flex-col leading-tight overflow-hidden">
                    <span className="text-[15px] font-extrabold text-[var(--accent-text-light)] dark:text-[var(--accent-text-dark)] tracking-tight truncate leading-none">
                      GuruOm OS
                    </span>
                    <span className="text-[10px] text-slate-400 dark:text-slate-500 font-mono mt-0.5 tracking-wide">
                      Industrial Suite
                    </span>
                  </div>
                </div>
                
                {/* Shrink / Collapse Button */}
                <button
                  type="button"
                  onClick={toggleCollapse}
                  className="p-1.5 rounded-xl hover:bg-[var(--accent-soft-light)] dark:hover:bg-[var(--accent-soft-dark)] text-slate-400 hover:text-[var(--accent-text-light)] dark:hover:text-[var(--accent-text-dark)] transition-all cursor-pointer"
                  title="Shrink Sidebar"
                >
                  <PanelLeftClose className="w-4 h-4" />
                </button>
              </>
            ) : (
              /* Clickable Logo Mark when collapsed to expand sidebar with hover icon overlay */
              <button
                type="button"
                onClick={toggleCollapse}
                className="relative w-10 h-10 rounded-xl bg-gradient-to-tr from-[var(--accent-gradient-from)] to-[var(--accent-gradient-to)] flex items-center justify-center text-white text-sm font-black shadow-xs transition-all hover:scale-105 hover:shadow-md cursor-pointer group overflow-hidden"
                title="Expand Sidebar"
              >
                <span className="transition-opacity duration-200 group-hover:opacity-0">G</span>
                <div className="absolute inset-0 bg-black/40 backdrop-blur-2xs opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity duration-200">
                  <PanelLeftOpen className="w-4 h-4 text-white" />
                </div>
              </button>
            )}
          </div>

          {/* Navigation Items List with Butter Smooth Momentum Scrolling & Zero Scrollbar UI */}
          <div 
            ref={scrollContainerRef}
            data-lenis-prevent="true"
            className="p-3 space-y-1.5 overflow-y-auto overscroll-contain no-scrollbar scroll-smooth flex-1 min-h-0 select-none"
          >
            
            {/* 1. COMMAND CENTRE (Direct link item) */}
            <div className="relative">
              <button
                type="button"
                onClick={() => handleSelectView('command-centre')}
                className={`sidebar-module-btn w-full flex items-center ${isCollapsed ? 'justify-center px-2 py-2.5' : 'justify-between px-3.5 py-2.5'} rounded-xl text-sm font-semibold border transition-all duration-200 cursor-pointer group hover:translate-x-0.5 ${
                  currentView === 'command-centre'
                    ? 'is-active bg-[var(--accent-primary)] text-white font-bold shadow-md shadow-[var(--accent-shadow)] border-transparent'
                    : isDarkMode
                      ? 'hover:bg-[var(--accent-soft-dark)] hover:text-white text-slate-400 border-transparent hover:border-[var(--accent-border-dark)]'
                      : 'hover:bg-[var(--accent-soft-light)] hover:text-[var(--accent-text-light)] text-slate-600 border-transparent hover:border-[var(--accent-border-light)]'
                }`}
                title="Command Centre"
              >
                <div className="flex items-center gap-3">
                  <LayoutGrid className={`sidebar-icon w-5 h-5 transition-transform duration-200 group-hover:scale-110 shrink-0 ${
                    currentView === 'command-centre'
                      ? 'text-white' 
                      : isDarkMode ? 'text-slate-400 group-hover:text-[var(--accent-text-dark)]' : 'text-slate-500 group-hover:text-[var(--accent-text-light)]'
                  }`} />
                  {!isCollapsed && <span className="tracking-tight font-bold">Command Centre</span>}
                </div>
                {!isCollapsed && (
                  <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-xs" title="Live Overview" />
                )}
              </button>
            </div>

            {/* Separator */}
            {!isCollapsed && (
              <div className="pt-2 px-1 text-[11px] font-mono font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 flex items-center justify-between">
                <span>Modules</span>
                <span className="text-[10px] text-slate-400 font-normal">4 Groups</span>
              </div>
            )}

            {/* 2. THE 4 DROPDOWN SECTIONS */}
            {dropdownSections.map((section) => {
              const SectionIcon = section.icon;
              const isOpen = openSections[section.id] ?? false;
              const hasActiveChild = section.items.some(
                item => item.id === currentView || (currentView === 'order-detail' && item.id === 'orders')
              );

              return (
                <div 
                  key={section.id} 
                  ref={el => { sectionRefs.current[section.id] = el; }}
                  className="space-y-0.5 relative"
                  onMouseEnter={() => isCollapsed && setHoveredSection(section.id)}
                  onMouseLeave={() => isCollapsed && setHoveredSection(null)}
                >
                  {/* Accordion Group Header Button */}
                  <button
                    type="button"
                    onClick={() => {
                      if (isCollapsed) {
                        setIsCollapsed(false);
                        setOpenSections(prev => ({ ...prev, [section.id]: true }));
                        setTimeout(() => ensureSectionVisible(section.id), 150);
                      } else {
                        toggleSection(section.id);
                      }
                    }}
                    className={`sidebar-module-btn w-full flex items-center ${isCollapsed ? 'justify-center px-2 py-2.5' : 'justify-between px-3.5 py-2.5'} rounded-xl text-sm font-semibold border transition-all duration-200 cursor-pointer group hover:translate-x-0.5 ${
                      hasActiveChild && !isOpen
                        ? isDarkMode
                          ? 'bg-[var(--accent-soft-dark)] text-[var(--accent-text-dark)] border-[var(--accent-border-dark)]'
                          : 'bg-white text-[var(--accent-text-light)] border-[var(--accent-border-light)] shadow-2xs font-bold'
                        : isDarkMode
                          ? 'hover:bg-[var(--accent-soft-dark)] hover:text-white text-slate-400 border-transparent hover:border-[var(--accent-border-dark)]'
                          : 'hover:bg-[var(--accent-soft-light)] hover:text-[var(--accent-text-light)] text-slate-600 border-transparent hover:border-[var(--accent-border-light)]'
                    }`}
                    title={isCollapsed ? section.label : undefined}
                  >
                    <div className="flex items-center gap-3 overflow-hidden">
                      <SectionIcon className={`sidebar-icon w-5 h-5 transition-transform duration-200 group-hover:scale-110 shrink-0 ${
                        hasActiveChild 
                          ? 'text-[var(--accent-text-light)] dark:text-[var(--accent-text-dark)]' 
                          : isDarkMode ? 'text-slate-400 group-hover:text-[var(--accent-text-dark)]' : 'text-slate-500 group-hover:text-[var(--accent-text-light)]'
                      }`} />
                      
                      {!isCollapsed && (
                        <span className={`tracking-tight font-bold truncate text-sm ${hasActiveChild ? 'text-[var(--accent-text-light)] dark:text-[var(--accent-text-dark)]' : ''}`}>
                          {section.label}
                        </span>
                      )}
                    </div>

                    {!isCollapsed && (
                      <div className="flex items-center gap-2 shrink-0">
                        {hasActiveChild && !isOpen && (
                          <span className="w-2 h-2 rounded-full bg-[var(--accent-primary)] shadow-xs" />
                        )}
                        <ChevronDown className={`sidebar-chevron w-4 h-4 text-slate-400 group-hover:text-[var(--accent-text-light)] dark:group-hover:text-[var(--accent-text-dark)] transition-transform duration-300 ${
                          isOpen ? 'rotate-180 text-[var(--accent-text-light)] dark:text-[var(--accent-text-dark)]' : ''
                        }`} />
                      </div>
                    )}
                  </button>

                  {/* Expanded Sub-items List with Butter Smooth Animation & Auto-Scroll */}
                  <AnimatePresence initial={false}>
                    {!isCollapsed && isOpen && (
                      <motion.div
                        key={`dropdown-${section.id}`}
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
                        onAnimationComplete={() => {
                          if (openSections[section.id]) {
                            ensureSectionVisible(section.id);
                          }
                        }}
                        className="overflow-hidden"
                      >
                        <div className="pl-2 pr-0.5 py-1 space-y-1 border-l-2 border-[var(--accent-border-light)] dark:border-[var(--accent-border-dark)] ml-2.5 my-1">
                          {section.items.map((item) => {
                            const ItemIcon = item.icon;
                            const isActive = currentView === item.id || (currentView === 'order-detail' && item.id === 'orders');
                            const isAllowed = isViewAllowedForRole(currentRole as UserRole, item.id as ConsoleView);

                            return (
                              <button
                                key={item.id}
                                type="button"
                                onClick={() => handleSelectView(item.id)}
                                className={`sidebar-module-btn w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-semibold border transition-all duration-150 cursor-pointer group hover:translate-x-0.5 ${
                                  isActive
                                    ? 'is-active bg-[var(--accent-primary)] text-white font-bold shadow-md shadow-[var(--accent-shadow)] border-transparent'
                                    : isDarkMode
                                      ? 'hover:bg-[var(--accent-soft-dark)] hover:text-white text-slate-300 border-transparent hover:border-[var(--accent-border-dark)]'
                                      : 'hover:bg-[var(--accent-soft-light)] hover:text-[var(--accent-text-light)] text-slate-600 border-transparent hover:border-[var(--accent-border-light)]'
                                } ${!isAllowed ? 'opacity-50' : ''}`}
                              >
                                <div className="flex items-center gap-3 truncate">
                                  <ItemIcon className={`sidebar-icon w-4 h-4 shrink-0 transition-transform duration-200 group-hover:scale-110 ${
                                    isActive ? 'text-white' : isDarkMode ? 'text-slate-400 group-hover:text-[var(--accent-text-dark)]' : 'text-slate-500 group-hover:text-[var(--accent-text-light)]'
                                  }`} />
                                  <span className="truncate">{item.label}</span>
                                </div>

                                {!isAllowed && (
                                  <Lock className="w-3.5 h-3.5 text-amber-500 shrink-0" title={`Requires higher permissions`} />
                                )}
                              </button>
                            );
                          })}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Collapsed Mode Popover Hover Flyout */}
                  {isCollapsed && hoveredSection === section.id && (
                    <div className={`absolute left-full top-0 ml-2 w-56 p-2 rounded-2xl border shadow-xl z-50 space-y-1 font-sans animate-fade-in ${
                      isDarkMode ? 'bg-[#1A1B1F]/95 border-[#262832] text-slate-100' : 'bg-white/95 backdrop-blur-md border-[#E2EAE5] text-slate-900'
                    }`}>
                      <div className="px-2.5 py-1.5 border-b border-slate-100 dark:border-slate-800 font-bold text-xs flex items-center gap-2 text-[var(--accent-text-light)] dark:text-[var(--accent-text-dark)]">
                        <SectionIcon className="w-4 h-4" />
                        <span>{section.label}</span>
                      </div>
                      <div className="pt-1 space-y-0.5 max-h-60 overflow-y-auto no-scrollbar">
                        {section.items.map((item) => {
                          const ItemIcon = item.icon;
                          const isActive = currentView === item.id || (currentView === 'order-detail' && item.id === 'orders');

                          return (
                            <button
                              key={item.id}
                              type="button"
                              onClick={() => handleSelectView(item.id)}
                              className={`sidebar-module-btn w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-xs font-semibold text-left border transition-all cursor-pointer ${
                                isActive
                                  ? 'is-active bg-[var(--accent-primary)] text-white font-bold border-transparent'
                                  : isDarkMode
                                    ? 'hover:bg-[var(--accent-soft-dark)] hover:text-white text-slate-300 border-transparent hover:border-[var(--accent-border-dark)]'
                                    : 'hover:bg-[var(--accent-soft-light)] hover:text-[var(--accent-text-light)] text-slate-700 border-transparent hover:border-[var(--accent-border-light)]'
                              }`}
                            >
                              <ItemIcon className={`sidebar-icon w-3.5 h-3.5 shrink-0 transition-colors ${isActive ? 'text-white' : 'text-slate-400'}`} />
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

        {/* Footer: User Profile + Sign Out + Expand Button */}
        <div className="p-3 border-t border-[#d8dde8] dark:border-[#262832] space-y-2 shrink-0">
          
          {/* User Profile Card (Placed above Log Out) */}
          {!isCollapsed ? (
            <div className="p-3 rounded-2xl bg-[#F6F8FA] dark:bg-white/5 border border-[#E8EEE9] dark:border-[#262832] space-y-2">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[var(--accent-gradient-from)] to-[var(--accent-gradient-to)] flex items-center justify-center text-white font-black text-xs shadow-xs shrink-0">
                  {initials}
                </div>
                <div className="flex-1 overflow-hidden">
                  <div className="text-xs font-bold text-slate-900 dark:text-white truncate leading-tight">
                    {displayName}
                  </div>
                  <div className="text-[10px] text-slate-500 dark:text-slate-400 font-mono truncate mt-0.5">
                    {displayEmail}
                  </div>
                </div>
              </div>

              {/* Role & Status Pill */}
              <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800">
                <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-[var(--accent-soft-light)] dark:bg-[var(--accent-soft-dark)] text-[var(--accent-text-light)] dark:text-[var(--accent-text-dark)] border border-[var(--accent-border-light)] dark:border-[var(--accent-border-dark)] text-[10px] font-mono font-bold tracking-wider uppercase truncate max-w-[175px]">
                  <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent-primary)] shrink-0" />
                  <span className="truncate">{currentUser?.role || currentRole}</span>
                </div>
                <span className="text-[10px] font-mono font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Active
                </span>
              </div>
            </div>
          ) : (
            <div 
              className="flex justify-center relative group"
              title={`${displayName} • ${currentUser?.role || currentRole} (${displayEmail})`}
            >
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[var(--accent-gradient-from)] to-[var(--accent-gradient-to)] flex items-center justify-center text-white font-black text-xs shadow-xs shrink-0 cursor-default">
                {initials}
              </div>
            </div>
          )}

          {/* Security & Sessions Trigger */}
          {onOpenSecurityModal && (
            <button
              type="button"
              onClick={onOpenSecurityModal}
              className={`sidebar-module-btn w-full flex items-center ${isCollapsed ? 'justify-center px-2 py-2' : 'justify-start gap-3 px-3.5 py-2'} rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-[var(--accent-soft-light)] dark:hover:bg-[var(--accent-soft-dark)] hover:text-[var(--accent-text-light)] dark:hover:text-[var(--accent-text-dark)] border border-transparent hover:border-[var(--accent-border-light)] dark:hover:border-[var(--accent-border-dark)] transition-all cursor-pointer group mb-1.5`}
              title="Security & Active Sessions"
            >
              <ShieldCheck className="w-4 h-4 text-emerald-500 group-hover:text-[var(--accent-primary)] transition-colors shrink-0" />
              {!isCollapsed && <span>Security & Sessions</span>}
            </button>
          )}

          {/* Log Out / Sign Out Button */}
          <button
            type="button"
            onClick={onSignOut}
            className={`w-full flex items-center ${isCollapsed ? 'justify-center px-2 py-2.5' : 'justify-start gap-3 px-3.5 py-2.5'} rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-[#FEE4E2] dark:hover:bg-slate-800 hover:text-rose-600 dark:hover:text-rose-400 border border-transparent hover:border-[#FED7D0] dark:hover:border-slate-800 transition-all cursor-pointer group`}
            title="Log Out"
          >
            <LogOut className="w-4 h-4 text-slate-500 group-hover:text-rose-500 transition-colors shrink-0" />
            {!isCollapsed && <span>Log Out</span>}
          </button>
        </div>

        </div>{/* end floating pill shell */}
      </div>{/* end padding wrapper */}
      </aside>
    </>
  );
};

export default ConsoleSidebar;
