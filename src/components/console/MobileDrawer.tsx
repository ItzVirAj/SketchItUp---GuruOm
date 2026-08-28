import React, { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  LayoutGrid, 
  ChevronDown, 
  LogOut, 
  ShieldCheck,
  Building2,
  Lock
} from 'lucide-react';
import { ConsoleView, UserRole, ConsoleUser } from '../../types/console';
import { 
  COMMAND_CENTRE_NAV_ITEM, 
  getFilteredNavigation, 
  findParentSectionId 
} from '../../utils/navigationConfig';

interface MobileDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  currentView: ConsoleView;
  onSelectView: (view: ConsoleView) => void;
  currentRole?: UserRole;
  currentUser?: ConsoleUser | null;
  userName?: string;
  isDarkMode: boolean;
  onSignOut?: () => void;
  onOpenSecurityModal?: () => void;
  onOpenSwitchUser?: () => void;
  pendingApprovalsCount?: number;
}

export const MobileDrawer: React.FC<MobileDrawerProps> = ({
  isOpen,
  onClose,
  currentView,
  onSelectView,
  currentRole = 'SUPER ADMIN',
  currentUser,
  userName = 'Sachin Gharbude',
  isDarkMode,
  onSignOut,
  onOpenSecurityModal,
  onOpenSwitchUser,
  pendingApprovalsCount = 0
}) => {
  const drawerRef = useRef<HTMLDivElement>(null);
  const filteredSections = getFilteredNavigation(currentUser?.role || currentRole);
  
  // Accordion state for grouped modules
  const [openSections, setOpenSections] = useState<Record<string, boolean>>(() => {
    const activeParent = findParentSectionId(currentView);
    return {
      'operations-reports': activeParent === 'operations-reports' || true,
      'quality-dispatch': activeParent === 'quality-dispatch' || false,
      'finance': activeParent === 'finance' || false,
      'admin': activeParent === 'admin' || false,
    };
  });

  // Keep active section open when currentView changes
  useEffect(() => {
    const parent = findParentSectionId(currentView);
    if (parent) {
      setOpenSections(prev => ({
        ...prev,
        [parent]: true
      }));
    }
  }, [currentView]);

  // 1. Lock body scroll while drawer is open
  useEffect(() => {
    if (isOpen) {
      const originalOverflow = document.body.style.overflow;
      const originalPosition = document.body.style.position;
      document.body.style.overflow = 'hidden';

      return () => {
        document.body.style.overflow = originalOverflow;
        document.body.style.position = originalPosition;
      };
    }
  }, [isOpen]);

  // 2. Hardware / Browser Back Button Handling via History API
  useEffect(() => {
    if (!isOpen) return;

    // Push hash to state so back button triggers popstate
    const stateKey = `nav-drawer-${Date.now()}`;
    window.history.pushState({ modal: stateKey }, '', window.location.href);

    const handlePopState = () => {
      onClose();
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('popstate', handlePopState);
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('popstate', handlePopState);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  const handleItemClick = (view: ConsoleView) => {
    onSelectView(view);
    onClose();
  };

  const toggleSection = (sectionId: string) => {
    setOpenSections(prev => ({
      ...prev,
      [sectionId]: !prev[sectionId]
    }));
  };

  const displayName = currentUser ? currentUser.name : userName;
  const displayEmail = currentUser ? currentUser.email : 'owner@guruom.in';
  const initials = displayName
    .split(' ')
    .map(n => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase() || 'GA';

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          {/* Semi-transparent Backdrop Overlay */}
          <motion.div
            key="mobile-drawer-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            aria-hidden="true"
            className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs"
          />

          {/* Off-canvas Left Drawer Panel */}
          <motion.div
            key="mobile-drawer-panel"
            ref={drawerRef}
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 300 }}
            className={`relative flex flex-col w-[85vw] max-w-[340px] h-full shadow-2xl z-10 select-none overflow-hidden font-sans border-r ${
              isDarkMode 
                ? 'bg-[#16171B] border-[#262832] text-slate-200' 
                : 'bg-[#F8FAFC] border-[#E2E8F0] text-slate-800'
            }`}
          >
            {/* Header: Brand Logo, Role Badge & Close Button */}
            <div className={`px-4 py-3.5 border-b flex items-center justify-between gap-3 shrink-0 ${
              isDarkMode ? 'border-[#262832] bg-[#1A1B1F]/60' : 'border-[#E2E8F0] bg-[#F1F5F9]'
            }`}>
              <div className="flex items-center gap-2.5 overflow-hidden">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-[var(--accent-gradient-from)] to-[var(--accent-gradient-to)] flex items-center justify-center text-white text-xs font-black shadow-sm shrink-0">
                  G
                </div>
                <div className="flex flex-col leading-tight overflow-hidden">
                  <span className="text-sm font-extrabold text-slate-900 dark:text-white tracking-tight truncate leading-none">
                    GuruOm OS
                  </span>
                  <span className="text-[10px] text-slate-400 dark:text-slate-500 font-mono mt-0.5 tracking-wide uppercase">
                    {currentUser?.role || currentRole}
                  </span>
                </div>
              </div>

              {/* Close Button */}
              <button
                type="button"
                onClick={onClose}
                aria-label="Close Navigation Drawer"
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable Navigation List */}
            <div className="flex-1 overflow-y-auto p-3 space-y-2 overscroll-contain">
              
              {/* 1. Direct Command Centre Link */}
              <button
                type="button"
                onClick={() => handleItemClick('command-centre')}
                className={`w-full flex items-center justify-between px-3.5 py-3 rounded-xl text-sm font-semibold border transition-all cursor-pointer ${
                  currentView === 'command-centre'
                    ? 'bg-[var(--accent-primary)] text-white font-bold shadow-md shadow-[var(--accent-shadow)] border-transparent'
                    : isDarkMode
                      ? 'hover:bg-[var(--accent-soft-dark)] hover:text-white text-slate-300 border-transparent hover:border-[var(--accent-border-dark)]'
                      : 'hover:bg-[var(--accent-soft-light)] hover:text-[var(--accent-text-light)] text-slate-700 border-transparent hover:border-[var(--accent-border-light)]'
                }`}
              >
                <div className="flex items-center gap-3">
                  <LayoutGrid className={`w-5 h-5 shrink-0 ${
                    currentView === 'command-centre'
                      ? 'text-white'
                      : isDarkMode ? 'text-slate-400' : 'text-slate-500'
                  }`} />
                  <span className="font-bold">Command Centre</span>
                </div>
                <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-xs" />
              </button>

              {/* Group Section Header */}
              <div className="pt-2 px-1 text-[11px] font-mono font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 flex items-center justify-between">
                <span>Navigation Modules</span>
                <span className="text-[10px] text-slate-400 font-normal">{filteredSections.length} Sections</span>
              </div>

              {/* 2. Grouped Modules Accordion */}
              {filteredSections.map((section) => {
                const SectionIcon = section.icon;
                const isOpen = openSections[section.id] ?? false;
                const hasActiveChild = section.items.some(
                  item => item.id === currentView || (currentView === 'order-detail' && item.id === 'orders')
                );

                return (
                  <div key={section.id} className="space-y-1">
                    {/* Section Header Button */}
                    <button
                      type="button"
                      onClick={() => toggleSection(section.id)}
                      className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-semibold border transition-all cursor-pointer ${
                        hasActiveChild && !isOpen
                          ? isDarkMode
                            ? 'bg-[var(--accent-soft-dark)] text-[var(--accent-text-dark)] border-[var(--accent-border-dark)]'
                            : 'bg-white text-[var(--accent-text-light)] border-[var(--accent-border-light)] shadow-xs font-bold'
                          : isDarkMode
                            ? 'hover:bg-[var(--accent-soft-dark)] hover:text-white text-slate-400 border-transparent hover:border-[var(--accent-border-dark)]'
                            : 'hover:bg-[var(--accent-soft-light)] hover:text-[var(--accent-text-light)] text-slate-600 border-transparent hover:border-[var(--accent-border-light)]'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 overflow-hidden">
                        <SectionIcon className={`w-4 h-4 shrink-0 ${
                          hasActiveChild 
                            ? 'text-[var(--accent-text-light)] dark:text-[var(--accent-text-dark)]' 
                            : isDarkMode ? 'text-slate-400' : 'text-slate-500'
                        }`} />
                        <span className={`text-xs font-bold truncate ${
                          hasActiveChild ? 'text-[var(--accent-text-light)] dark:text-[var(--accent-text-dark)]' : ''
                        }`}>
                          {section.label}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        {hasActiveChild && !isOpen && (
                          <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent-primary)]" />
                        )}
                        <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${
                          isOpen ? 'rotate-180 text-[var(--accent-text-light)] dark:text-[var(--accent-text-dark)]' : ''
                        }`} />
                      </div>
                    </button>

                    {/* Sub-items List */}
                    <AnimatePresence initial={false}>
                      {isOpen && (
                        <motion.div
                          key={`drawer-sub-${section.id}`}
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.2 }}
                          className="overflow-hidden"
                        >
                          <div className="pl-2 pr-0.5 py-0.5 space-y-1 border-l-2 border-[var(--accent-border-light)] dark:border-[var(--accent-border-dark)] ml-2.5 my-1">
                            {section.items.map((item) => {
                              const ItemIcon = item.icon;
                              const isActive = currentView === item.id || (currentView === 'order-detail' && item.id === 'orders');
                              const showApprovalBadge = item.id === 'approvals' && pendingApprovalsCount > 0;

                              return (
                                <button
                                  key={item.id}
                                  type="button"
                                  onClick={() => handleItemClick(item.id)}
                                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                                    isActive
                                      ? 'bg-[var(--accent-primary)] text-white font-bold shadow-md shadow-[var(--accent-shadow)] border-transparent'
                                      : isDarkMode
                                        ? 'hover:bg-[var(--accent-soft-dark)] hover:text-white text-slate-300 border-transparent hover:border-[var(--accent-border-dark)]'
                                        : 'hover:bg-[var(--accent-soft-light)] hover:text-[var(--accent-text-light)] text-slate-600 border-transparent hover:border-[var(--accent-border-light)]'
                                  }`}
                                >
                                  <div className="flex items-center gap-2.5 truncate">
                                    <ItemIcon className={`w-4 h-4 shrink-0 ${
                                      isActive ? 'text-white' : isDarkMode ? 'text-slate-400' : 'text-slate-500'
                                    }`} />
                                    <span className="truncate">{item.label}</span>
                                  </div>

                                  {showApprovalBadge && (
                                    <span className="px-1.5 py-0.5 text-[10px] font-mono font-bold bg-rose-500 text-white rounded-full leading-none shrink-0 shadow-xs">
                                      {pendingApprovalsCount}
                                    </span>
                                  )}
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

            {/* Footer Profile & Actions Card */}
            <div className={`p-3 border-t space-y-2 shrink-0 ${
              isDarkMode ? 'border-[#262832] bg-[#1A1B1F]/80' : 'border-[#d8dde8] bg-[#F8FAFC]'
            }`}>
              {/* User Identity Box */}
              <div 
                onClick={() => {
                  if (onOpenSwitchUser) {
                    onOpenSwitchUser();
                    onClose();
                  }
                }}
                className={`p-2.5 rounded-xl border flex items-center justify-between gap-2.5 transition-colors cursor-pointer ${
                  isDarkMode 
                    ? 'bg-[#121316] border-[#262832] hover:border-slate-700' 
                    : 'bg-white border-[#E2EAE5] hover:border-slate-300'
                }`}
                title="Tap to switch user role"
              >
                <div className="flex items-center gap-2.5 overflow-hidden">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-[var(--accent-gradient-from)] to-[var(--accent-gradient-to)] flex items-center justify-center text-white font-black text-xs shadow-xs shrink-0">
                    {initials}
                  </div>
                  <div className="flex-1 overflow-hidden">
                    <div className="text-xs font-bold text-slate-900 dark:text-white truncate">
                      {displayName}
                    </div>
                    <div className="text-[10px] text-slate-500 dark:text-slate-400 font-mono truncate">
                      {currentUser?.role || currentRole}
                    </div>
                  </div>
                </div>

                <span className="text-[10px] font-mono font-semibold text-emerald-600 dark:text-emerald-400 px-1.5 py-0.5 rounded bg-emerald-50 dark:bg-emerald-500/10 shrink-0">
                  Active
                </span>
              </div>

              {/* Secondary Actions */}
              <div className="grid grid-cols-2 gap-2">
                {onOpenSecurityModal && (
                  <button
                    type="button"
                    onClick={() => {
                      onOpenSecurityModal();
                      onClose();
                    }}
                    className="flex items-center justify-center gap-1.5 px-2.5 py-2 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                  >
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                    <span>Security</span>
                  </button>
                )}

                {onSignOut && (
                  <button
                    type="button"
                    onClick={() => {
                      onSignOut();
                      onClose();
                    }}
                    className="flex items-center justify-center gap-1.5 px-2.5 py-2 rounded-xl text-xs font-semibold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-500/10 hover:bg-rose-100 dark:hover:bg-rose-500/20 transition-colors cursor-pointer"
                  >
                    <LogOut className="w-3.5 h-3.5 text-rose-500" />
                    <span>Log Out</span>
                  </button>
                )}
              </div>
            </div>

          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
