import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion } from 'motion/react';
import {
  Sun,
  Moon,
  RefreshCw,
  Search,
  Menu,
  X,
  ShoppingCart,
  Package,
  FileText,
  Wrench,
  ArrowRight,
  ChevronDown,
  SlidersHorizontal,
  Palette,
  CalendarRange,
  Bell,
  Terminal,
  Shield,
  LogOut,
  Check
} from 'lucide-react';
import { AccentColorSelector } from './AccentColorSelector';
import { CustomerOrder, StockItem, CustomerInvoice, JobCard, UserRole, ConsoleView, SystemUser } from '../../types/console';
import { getViewTitle, getBreadcrumbsForView } from '../../utils/navigationConfig';
import { NotificationDrawer } from './NotificationDrawer';
import { useInAppNotifications } from '../../hooks/useInAppNotifications';
import { tryNormalizeRole } from '../../utils/rbacMatrix';

interface ConsoleHeaderProps {
  fiscalYear: string;
  setFiscalYear: (fy: string) => void;
  scope?: string;
  setScope?: (scope: string) => void;
  onOpenCustomize?: () => void;
  onOpenSecurityModal?: () => void;
  isDarkMode: boolean;
  setIsDarkMode: (dark: boolean) => void;
  currentRole: UserRole;
  setCurrentRole: (role: UserRole) => void;
  userName: string;
  currentUser?: SystemUser;
  onOpenSwitchUser?: () => void;
  onSync: () => void;
  lastSynced: string;
  onToggleMobileMenu?: () => void;
  orders?: CustomerOrder[];
  stock?: StockItem[];
  invoices?: CustomerInvoice[];
  jobCards?: JobCard[];
  onNavigate?: (view: ConsoleView) => void;
  onSelectOrder?: (orderId: string) => void;
  onSignOut?: () => void;
  currentView?: ConsoleView;
  onOpenCommandPalette?: () => void;
}

export const ConsoleHeader: React.FC<ConsoleHeaderProps> = ({
  fiscalYear,
  setFiscalYear,
  scope = 'FY 26-27',
  setScope,
  onOpenCustomize,
  onOpenSecurityModal,
  isDarkMode,
  setIsDarkMode,
  currentRole,
  userName,
  currentUser,
  onSync,
  lastSynced,
  onToggleMobileMenu,
  orders = [],
  stock = [],
  invoices = [],
  jobCards = [],
  onNavigate,
  onSelectOrder,
  onSignOut,
  currentView = 'command-centre',
  onOpenCommandPalette
}) => {
  const [isSyncing, setIsSyncing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [showScopeDropdown, setShowScopeDropdown] = useState(false);
  const [showCustomizeMenu, setShowCustomizeMenu] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);

  // In-app real-time notifications hook
  const {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    clearAll,
    isSoundEnabled,
    toggleSound
  } = useInAppNotifications();

  const searchInputRef = useRef<HTMLInputElement>(null);
  const mobileSearchInputRef = useRef<HTMLInputElement>(null);
  const searchDropdownRef = useRef<HTMLDivElement>(null);
  const scopeDropdownRef = useRef<HTMLDivElement>(null);
  const customizeDropdownRef = useRef<HTMLDivElement>(null);
  const userDropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdowns on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        searchDropdownRef.current &&
        !searchDropdownRef.current.contains(event.target as Node) &&
        searchInputRef.current &&
        !searchInputRef.current.contains(event.target as Node) &&
        mobileSearchInputRef.current &&
        !mobileSearchInputRef.current.contains(event.target as Node)
      ) {
        setIsSearchFocused(false);
      }
      if (
        scopeDropdownRef.current &&
        !scopeDropdownRef.current.contains(event.target as Node)
      ) {
        setShowScopeDropdown(false);
      }
      if (
        customizeDropdownRef.current &&
        !customizeDropdownRef.current.contains(event.target as Node)
      ) {
        setShowCustomizeMenu(false);
      }
      if (
        userDropdownRef.current &&
        !userDropdownRef.current.contains(event.target as Node)
      ) {
        setShowUserMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSyncClick = async () => {
    if (isSyncing) return;
    setIsSyncing(true);
    try {
      if (onSync) {
        await onSync();
      }
    } catch (err) {
      console.warn('System refresh error:', err);
    } finally {
      setTimeout(() => {
        window.location.reload();
      }, 350);
    }
  };

  const query = searchQuery.trim().toLowerCase();

  const matchingOrders = query
    ? orders.filter(o =>
      (o?.poNo || '').toLowerCase().includes(query) ||
      (o?.customerName || '').toLowerCase().includes(query) ||
      (o?.lines || []).some(i =>
        (i?.itemCode || '').toLowerCase().includes(query) ||
        (i?.itemDescription || '').toLowerCase().includes(query)
      )
    ).slice(0, 4)
    : [];

  const matchingStock = query
    ? stock.filter(s =>
      (s?.code || '').toLowerCase().includes(query) ||
      (s?.description || '').toLowerCase().includes(query) ||
      (s?.status || '').toLowerCase().includes(query)
    ).slice(0, 4)
    : [];

  const matchingInvoices = query
    ? invoices.filter(i =>
      (i?.invoiceNo || '').toLowerCase().includes(query) ||
      (i?.customerName || '').toLowerCase().includes(query) ||
      (i?.orderPo || '').toLowerCase().includes(query)
    ).slice(0, 3)
    : [];

  const matchingJobs = query
    ? jobCards.filter(j =>
      (j?.jobNo || '').toLowerCase().includes(query) ||
      (j?.orderPo || '').toLowerCase().includes(query) ||
      (j?.partCode || '').toLowerCase().includes(query) ||
      (j?.partDescription || '').toLowerCase().includes(query)
    ).slice(0, 3)
    : [];

  const totalResultsCount = matchingOrders.length + matchingStock.length + matchingInvoices.length + matchingJobs.length;

  const handleSearchResultClick = (type: 'order' | 'stock' | 'invoice' | 'job', id?: string) => {
    setIsSearchFocused(false);
    setIsMobileSearchOpen(false);
    setSearchQuery('');

    if (type === 'order') {
      if (id && onSelectOrder) onSelectOrder(id);
      else if (onNavigate) onNavigate('orders');
    } else if (type === 'stock') {
      if (onNavigate) onNavigate('inventory');
    } else if (type === 'invoice') {
      if (onNavigate) onNavigate('invoices');
    } else if (type === 'job') {
      if (onNavigate) onNavigate('production');
    }
  };

  const scopeOptions = ['FY 26-27', 'FY 25-26', 'Q3 2026', 'All-Time'];
  const activeTitle = getViewTitle(currentView as ConsoleView);
  const breadcrumb = getBreadcrumbsForView(currentView as ConsoleView);
  const normalizedRole = tryNormalizeRole(currentRole);
  const displayName = currentUser?.name || userName || 'Sachin Gharbude';
  const initial = displayName.charAt(0).toUpperCase();

  return (
    <header className="relative z-30 shrink-0 select-none font-sans bg-[#101317] text-white border-b border-white/[0.08]">
      {/* 1.10X height: 62px */}
      <div className="flex h-[62px] items-center justify-between px-3.5 sm:px-6 lg:px-7 gap-3.5">

        {/* ========================================================================= */}
        {/* ── LEADING: BRANDING (MOBILE) & ERP BREADCRUMBS ──                       */}
        {/* ========================================================================= */}
        <div className="flex min-w-0 items-center gap-2.5 sm:gap-3.5 shrink-0">
          {onToggleMobileMenu && (
            <button
              type="button"
              onClick={onToggleMobileMenu}
              aria-label="Toggle navigation menu"
              className="flex h-9 w-9 items-center justify-center rounded-lg transition-all cursor-pointer active:scale-95 lg:hidden text-neutral-300 hover:bg-white/[0.08] hover:text-white"
            >
              <Menu className="h-4.5 w-4.5" />
            </button>
          )}

          {/* App Brandmark & Title (shown on mobile, sidebar handles desktop) */}
          <button
            type="button"
            onClick={() => onNavigate?.('command-centre')}
            className="group flex items-center gap-2.5 rounded-xl py-1 px-1.5 transition-all hover:bg-white/[0.06] cursor-pointer lg:hidden"
            title="Command Centre"
          >
            <div className="relative flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 p-1 shadow-sm text-white">
              <img
                src="/logo.png"
                alt="OwnerOS"
                className="h-full w-full object-contain"
              />
            </div>
            <div className="flex flex-col text-left leading-tight">
              <span className="text-[14px] font-bold tracking-tight text-white">
                OwnerOS
              </span>
              <span className="text-[10px] font-medium tracking-normal text-slate-400">
                SketchItUp
              </span>
            </div>
          </button>

          {/* Canonical ERP Breadcrumb Hierarchy */}
          <div className="hidden lg:flex items-center gap-2 text-[13px]">
            {breadcrumb.modulePath && breadcrumb.moduleLabel !== 'Workspace' ? (
              <button
                type="button"
                onClick={() => {
                  const targetView: ConsoleView =
                    breadcrumb.modulePath?.includes('operations') ? 'orders' :
                    breadcrumb.modulePath?.includes('quality') ? 'qc' :
                    breadcrumb.modulePath?.includes('finance') ? 'invoices' :
                    breadcrumb.modulePath?.includes('admin') ? 'masters' :
                    breadcrumb.modulePath?.includes('hr') ? 'tasks' : 'command-centre';
                  onNavigate?.(targetView);
                }}
                className="font-medium text-slate-400 hover:text-white transition-colors cursor-pointer truncate"
              >
                {breadcrumb.moduleLabel}
              </button>
            ) : (
              <span className="font-medium text-slate-400">
                {breadcrumb.moduleLabel}
              </span>
            )}

            {breadcrumb.submoduleLabel && (
              <>
                <span className="text-slate-600 text-xs">/</span>
                {breadcrumb.detailLabel ? (
                  <button
                    type="button"
                    onClick={() => onNavigate?.('orders')}
                    className="font-medium text-slate-400 hover:text-white transition-colors cursor-pointer truncate"
                  >
                    {breadcrumb.submoduleLabel}
                  </button>
                ) : (
                  <span className="font-semibold tracking-tight text-blue-400 truncate max-w-[220px] xl:max-w-none">
                    {breadcrumb.submoduleLabel}
                  </span>
                )}
              </>
            )}

            {breadcrumb.detailLabel && (
              <>
                <span className="text-slate-600 text-xs">/</span>
                <span className="font-semibold tracking-tight text-blue-400 truncate max-w-[180px]">
                  {breadcrumb.detailLabel}
                </span>
              </>
            )}
          </div>

          <div className="lg:hidden text-[13px] font-semibold text-neutral-200 truncate">
            {breadcrumb.submoduleLabel || breadcrumb.moduleLabel}
          </div>
        </div>

        {/* ========================================================================= */}
        {/* ── CENTER: macOS SPOTLIGHT SEARCH (1.10X) ──                              */}
        {/* ========================================================================= */}
        <div className="relative hidden md:flex flex-1 items-center justify-center max-w-[506px] mx-auto" ref={searchDropdownRef}>
          <button
            type="button"
            onClick={() => {
              if (onOpenCommandPalette) {
                onOpenCommandPalette();
              } else {
                setIsSearchFocused(true);
                searchInputRef.current?.focus();
              }
            }}
            className={`group relative flex h-9 w-full items-center justify-between rounded-xl px-3 transition-all duration-150 cursor-pointer text-[13px] border ${
              isDarkMode
                ? 'border-white/[0.08] bg-white/[0.05] hover:bg-white/[0.08] hover:border-white/[0.14] text-neutral-300 shadow-[inset_0_1px_1px_rgba(0,0,0,0.2)]'
                : 'border-black/[0.08] bg-black/[0.03] hover:bg-black/[0.05] hover:border-black/[0.14] text-neutral-600 shadow-[inset_0_1px_1px_rgba(0,0,0,0.03)]'
            }`}
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <Search className="h-4 w-4 shrink-0 text-neutral-400 group-hover:text-[#4763F5] dark:group-hover:text-[#7A92FF] transition-colors" />
              <span className="truncate text-[13px] font-normal text-neutral-400 dark:text-neutral-400">
                Spotlight search orders, stock, jobs...
              </span>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <kbd className={`flex items-center gap-0.5 px-2 py-0.5 rounded-md text-[11px] font-medium font-mono border ${
                isDarkMode
                  ? 'border-white/[0.1] bg-white/[0.08] text-neutral-300'
                  : 'border-black/[0.08] bg-white text-neutral-500 shadow-2xs'
              }`}>
                <span>⌘</span>
                <span>K</span>
              </kbd>
            </div>
          </button>

          {/* Spotlight Search Results Menu (1.10X) */}
          {isSearchFocused && searchQuery.trim() !== '' && (
            <div className={`absolute left-0 right-0 top-full mt-2.5 overflow-hidden rounded-2xl border shadow-[0_20px_50px_rgba(0,0,0,0.25)] dark:shadow-[0_24px_60px_rgba(0,0,0,0.8)] z-50 backdrop-blur-3xl transition-all ${
              isDarkMode ? 'bg-[#1C1C1E]/95 border-white/[0.12] text-white' : 'bg-white/95 border-black/[0.08] text-neutral-900'
            }`}>
              <div className={`flex items-center justify-between border-b px-4 py-3 text-xs font-medium ${
                isDarkMode ? 'border-white/[0.08] text-neutral-400' : 'border-black/[0.06] text-neutral-500'
              }`}>
                <span>Spotlight results ({totalResultsCount})</span>
                <span className="font-mono text-[11px] text-neutral-400">Esc to dismiss</span>
              </div>
              <div className="max-h-84 overflow-y-auto p-2 space-y-1">
                {matchingOrders.length > 0 && (
                  <div className="px-3 pt-2 pb-1 text-[11px] font-semibold uppercase tracking-wider text-neutral-400">
                    Orders
                  </div>
                )}
                {matchingOrders.map(order => (
                  <button
                    key={order.id}
                    type="button"
                    onClick={() => handleSearchResultClick('order', order.id)}
                    className="flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2 text-left transition hover:bg-black/[0.04] dark:hover:bg-white/[0.08] cursor-pointer"
                  >
                    <span className="flex min-w-0 items-center gap-3">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-500/10 text-blue-500 dark:text-blue-400">
                        <ShoppingCart className="h-4 w-4" />
                      </div>
                      <span className="min-w-0">
                        <span className="block truncate text-[13px] font-medium text-neutral-900 dark:text-neutral-100">
                          {order.poNo || 'PO'} · {order.customerName || 'Customer'}
                        </span>
                        <span className="block truncate text-[11px] text-neutral-400 font-mono">
                          {(order.lines || []).length} items · ₹{(order.grossAmount || 0).toLocaleString()} · {order.status}
                        </span>
                      </span>
                    </span>
                    <ArrowRight className="h-4 w-4 shrink-0 text-neutral-400" />
                  </button>
                ))}

                {matchingStock.length > 0 && (
                  <div className="px-3 pt-2 pb-1 text-[11px] font-semibold uppercase tracking-wider text-neutral-400">
                    Inventory
                  </div>
                )}
                {matchingStock.map(item => (
                  <button
                    key={item.code}
                    type="button"
                    onClick={() => handleSearchResultClick('stock', item.code)}
                    className="flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2 text-left transition hover:bg-black/[0.04] dark:hover:bg-white/[0.08] cursor-pointer"
                  >
                    <span className="flex min-w-0 items-center gap-3">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-500 dark:text-emerald-400">
                        <Package className="h-4 w-4" />
                      </div>
                      <span className="min-w-0">
                        <span className="block truncate text-[13px] font-medium text-neutral-900 dark:text-neutral-100">
                          {item.code} · {item.description}
                        </span>
                        <span className="block truncate text-[11px] text-neutral-400 font-mono">
                          Qty: {item.available ?? item.onHand ?? 0} {item.unit || 'PCS'} · {item.status}
                        </span>
                      </span>
                    </span>
                    <ArrowRight className="h-4 w-4 shrink-0 text-neutral-400" />
                  </button>
                ))}

                {matchingInvoices.length > 0 && (
                  <div className="px-3 pt-2 pb-1 text-[11px] font-semibold uppercase tracking-wider text-neutral-400">
                    Invoices
                  </div>
                )}
                {matchingInvoices.map(inv => (
                  <button
                    key={inv.invoiceNo}
                    type="button"
                    onClick={() => handleSearchResultClick('invoice', inv.invoiceNo)}
                    className="flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2 text-left transition hover:bg-black/[0.04] dark:hover:bg-white/[0.08] cursor-pointer"
                  >
                    <span className="flex min-w-0 items-center gap-3">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-purple-500/10 text-purple-500 dark:text-purple-400">
                        <FileText className="h-4 w-4" />
                      </div>
                      <span className="min-w-0">
                        <span className="block truncate text-[13px] font-medium text-neutral-900 dark:text-neutral-100">
                          {inv.invoiceNo} · {inv.customerName}
                        </span>
                        <span className="block truncate text-[11px] text-neutral-400 font-mono">
                          PO: {inv.orderPo} · ₹{Number(inv.totalAmount || 0).toLocaleString()} · {inv.status}
                        </span>
                      </span>
                    </span>
                    <ArrowRight className="h-4 w-4 shrink-0 text-neutral-400" />
                  </button>
                ))}

                {matchingJobs.length > 0 && (
                  <div className="px-3 pt-2 pb-1 text-[11px] font-semibold uppercase tracking-wider text-neutral-400">
                    Job Cards
                  </div>
                )}
                {matchingJobs.map(job => (
                  <button
                    key={job.jobNo}
                    type="button"
                    onClick={() => handleSearchResultClick('job', job.jobNo)}
                    className="flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2 text-left transition hover:bg-black/[0.04] dark:hover:bg-white/[0.08] cursor-pointer"
                  >
                    <span className="flex min-w-0 items-center gap-3">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-500/10 text-amber-500 dark:text-amber-400">
                        <Wrench className="h-4 w-4" />
                      </div>
                      <span className="min-w-0">
                        <span className="block truncate text-[13px] font-medium text-neutral-900 dark:text-neutral-100">
                          {job.jobNo} · {job.partCode || job.partDescription}
                        </span>
                        <span className="block truncate text-[11px] text-neutral-400 font-mono">
                          Machine: {job.machine || 'CNC'} · Qty: {job.qty} · {job.status}
                        </span>
                      </span>
                    </span>
                    <ArrowRight className="h-4 w-4 shrink-0 text-neutral-400" />
                  </button>
                ))}

                {totalResultsCount === 0 && (
                  <div className="py-7 text-center text-xs font-normal text-neutral-400">
                    No matching results found.
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* ========================================================================= */}
        {/* ── TRAILING: APPLE UNIFIED TOOLBAR CONTROL DECK (1.10X) ──               */}
        {/* ========================================================================= */}
        <div className="flex shrink-0 items-center gap-2 sm:gap-2.5">

          {/* Mobile Search Button */}
          <button
            type="button"
            onClick={() => setIsMobileSearchOpen(!isMobileSearchOpen)}
            aria-label="Toggle search"
            className={`flex h-9 w-9 items-center justify-center rounded-lg md:hidden transition-all cursor-pointer ${
              isDarkMode
                ? 'text-neutral-300 hover:bg-white/[0.08]'
                : 'text-neutral-600 hover:bg-black/[0.05]'
            }`}
          >
            <Search className="h-4.5 w-4.5" />
          </button>

          {/* Apple Pop-up Button: Scope Selector (1.10X) */}
          <div className="relative hidden lg:block" ref={scopeDropdownRef}>
            <button
              type="button"
              onClick={() => setShowScopeDropdown(!showScopeDropdown)}
              className={`flex h-9 items-center gap-2 rounded-xl px-3 text-[13px] font-medium transition-all duration-150 cursor-pointer border ${
                showScopeDropdown
                  ? isDarkMode
                    ? 'border-white/[0.2] bg-white/[0.1] text-white'
                    : 'border-black/[0.2] bg-black/[0.06] text-neutral-900'
                  : isDarkMode
                    ? 'border-white/[0.08] bg-white/[0.04] text-neutral-300 hover:bg-white/[0.08] hover:border-white/[0.14]'
                    : 'border-black/[0.06] bg-black/[0.02] text-neutral-700 hover:bg-black/[0.05] hover:border-black/[0.12]'
              }`}
              title={`Reporting scope: ${fiscalYear}`}
            >
              <CalendarRange className="h-4 w-4 text-[#4763F5] dark:text-[#7A92FF]" />
              <span className="tracking-tight">{scope}</span>
              <ChevronDown className={`h-3.5 w-3.5 text-neutral-400 transition-transform duration-150 ${showScopeDropdown ? 'rotate-180' : ''}`} />
            </button>

            {showScopeDropdown && (
              <div className={`absolute right-0 top-full mt-2 w-44 overflow-hidden rounded-xl border p-1 text-xs shadow-[0_16px_36px_rgba(0,0,0,0.2)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.7)] z-50 backdrop-blur-3xl ${
                isDarkMode ? 'bg-[#1C1C1E]/95 border-white/[0.12] text-white' : 'bg-white/95 border-black/[0.08] text-neutral-900'
              }`}>
                {scopeOptions.map(sc => (
                  <button
                    key={sc}
                    type="button"
                    onClick={() => {
                      setScope?.(sc);
                      if (sc.startsWith('FY')) setFiscalYear(sc);
                      setShowScopeDropdown(false);
                    }}
                    className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-xs font-medium transition-colors cursor-pointer ${
                      scope === sc
                        ? 'bg-[#4763F5] text-white'
                        : isDarkMode
                          ? 'hover:bg-white/[0.08] text-neutral-300'
                          : 'hover:bg-black/[0.05] text-neutral-700'
                    }`}
                  >
                    <span>{sc}</span>
                    {scope === sc && <Check className="h-3.5 w-3.5 text-white" />}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Sync Control & Live Status (1.10X) */}
          <div className="flex items-center">
            <button
              type="button"
              onClick={handleSyncClick}
              disabled={isSyncing}
              title={`Synchronize system (Last: ${lastSynced})`}
              className={`group flex h-9 items-center gap-2 rounded-xl px-3 text-[13px] font-medium transition-all duration-150 cursor-pointer border ${
                isSyncing
                  ? 'cursor-wait opacity-80 border-blue-500/30 bg-blue-500/10 text-blue-500'
                  : isDarkMode
                    ? 'border-white/[0.08] bg-white/[0.04] text-neutral-300 hover:bg-white/[0.08] hover:border-white/[0.14]'
                    : 'border-black/[0.06] bg-black/[0.02] text-neutral-700 hover:bg-black/[0.05] hover:border-black/[0.12]'
              }`}
            >
              <RefreshCw className={`h-4 w-4 ${isSyncing ? 'animate-spin text-[#4763F5] dark:text-[#7A92FF]' : 'text-neutral-400 group-hover:text-neutral-700 dark:group-hover:text-neutral-200'}`} />
              <span className="hidden xl:inline">{isSyncing ? 'Syncing...' : 'Sync'}</span>
              <span className="hidden 2xl:inline text-[11px] text-neutral-400 dark:text-neutral-400 font-mono">
                · {lastSynced}
              </span>
            </button>
          </div>

          {/* macOS Control Center Style: Appearance & Accent Popover (1.10X) */}
          <div className="relative" ref={customizeDropdownRef}>
            <button
              type="button"
              onClick={() => setShowCustomizeMenu(prev => !prev)}
              className={`flex h-9 w-9 items-center justify-center rounded-xl transition-all duration-150 cursor-pointer border ${
                showCustomizeMenu
                  ? isDarkMode
                    ? 'border-[#4763F5] bg-[#4763F5]/20 text-[#7A92FF]'
                    : 'border-[#4763F5] bg-[#4763F5]/10 text-[#4763F5]'
                  : isDarkMode
                    ? 'border-white/[0.08] bg-white/[0.04] text-neutral-300 hover:bg-white/[0.08] hover:border-white/[0.14]'
                    : 'border-black/[0.06] bg-black/[0.02] text-neutral-600 hover:bg-black/[0.05] hover:border-black/[0.12]'
              }`}
              title="Theme and appearance settings"
            >
              <Palette className="h-4 w-4" />
            </button>

            {showCustomizeMenu && (
              <div className={`absolute right-0 top-full mt-2 w-76 rounded-2xl border p-4 shadow-[0_20px_50px_rgba(0,0,0,0.25)] dark:shadow-[0_24px_60px_rgba(0,0,0,0.8)] z-50 backdrop-blur-3xl ${
                isDarkMode ? 'bg-[#1C1C1E]/95 border-white/[0.12] text-white' : 'bg-white/95 border-black/[0.08] text-neutral-900'
              }`}>
                <div className="mb-3 flex items-center justify-between border-b pb-2.5 border-black/[0.06] dark:border-white/[0.08]">
                  <span className="text-[13px] font-semibold tracking-tight">Appearance</span>
                  <span className="text-[11px] font-medium text-neutral-400">macOS System Style</span>
                </div>
                <AccentColorSelector isDarkMode={isDarkMode} />
                {onOpenCustomize && (
                  <button
                    type="button"
                    onClick={() => {
                      setShowCustomizeMenu(false);
                      onOpenCustomize();
                    }}
                    className={`mt-4 flex w-full items-center justify-between rounded-xl border px-3.5 py-2 text-xs font-medium transition-all cursor-pointer ${
                      isDarkMode
                        ? 'border-white/[0.08] bg-white/[0.04] hover:bg-white/[0.08] text-neutral-200'
                        : 'border-black/[0.06] bg-black/[0.02] hover:bg-black/[0.05] text-neutral-800'
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <SlidersHorizontal className="h-4 w-4 text-neutral-400" />
                      Configure console widgets
                    </span>
                    <ArrowRight className="h-3.5 w-3.5 text-neutral-400" />
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Admin Vault Link (Only if role is ServerAdmin) */}
          {normalizedRole === 'ServerAdmin' && (
            <Link
              to="/server-admin"
              className="hidden sm:flex h-9 items-center gap-1.5 rounded-xl border border-purple-500/25 bg-purple-500/10 px-3 text-[13px] font-medium text-purple-600 dark:text-purple-300 hover:bg-purple-500/20 transition-all"
              title="Maker Vault Admin Panel"
            >
              <Terminal className="h-4 w-4 text-purple-500 dark:text-purple-400" />
              <span>Admin</span>
            </Link>
          )}

          {/* Notification Center Trigger (1.10X) */}
          <button
            type="button"
            onClick={() => setIsNotificationOpen(true)}
            className={`relative flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition-all duration-150 cursor-pointer border ${
              isDarkMode
                ? 'border-white/[0.08] bg-white/[0.04] text-neutral-300 hover:bg-white/[0.08] hover:border-white/[0.14]'
                : 'border-black/[0.06] bg-black/[0.02] text-neutral-600 hover:bg-black/[0.05] hover:border-black/[0.12]'
            }`}
            title={`Notifications (${unreadCount} unread)`}
          >
            <Bell className="h-4 w-4" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 flex h-4.5 min-w-4.5 items-center justify-center rounded-full bg-[#FF3B30] px-1 font-sans text-[10px] font-bold text-white shadow-xs">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </button>

          {/* Apple Light / Dark Mode Segmented Toggle (1.10X) */}
          <button
            type="button"
            onClick={() => setIsDarkMode(!isDarkMode)}
            className={`relative flex h-9 w-14 shrink-0 items-center rounded-full p-0.5 transition-all duration-200 cursor-pointer border ${
              isDarkMode
                ? 'border-white/[0.12] bg-neutral-900/90 shadow-inner'
                : 'border-black/[0.08] bg-neutral-200/80'
            }`}
            title={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            aria-label="Toggle dark and light mode"
          >
            <motion.div
              layout
              transition={{ type: 'spring', stiffness: 500, damping: 32 }}
              className={`flex h-7 w-7 items-center justify-center rounded-full shadow-xs ${
                isDarkMode ? 'ml-6 bg-[#4763F5] text-white' : 'ml-0 bg-white text-neutral-800'
              }`}
            >
              <AnimatePresence mode="popLayout" initial={false}>
                <motion.div
                  key={isDarkMode ? 'moon' : 'sun'}
                  initial={{ opacity: 0, scale: 0.4 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.4 }}
                  transition={{ duration: 0.15 }}
                  className="flex items-center justify-center"
                >
                  {isDarkMode ? <Moon className="h-3.5 w-3.5" /> : <Sun className="h-3.5 w-3.5" />}
                </motion.div>
              </AnimatePresence>
            </motion.div>
          </button>

          {/* Apple HIG Account Capsule & Menu (1.10X) */}
          <div className="relative" ref={userDropdownRef}>
            <button
              type="button"
              onClick={() => setShowUserMenu(prev => !prev)}
              className={`flex h-9 items-center gap-2 rounded-xl pl-2 pr-2.5 transition-all duration-150 cursor-pointer border ${
                showUserMenu
                  ? isDarkMode
                    ? 'border-white/[0.2] bg-white/[0.1]'
                    : 'border-black/[0.2] bg-black/[0.06]'
                  : isDarkMode
                    ? 'border-white/[0.08] bg-white/[0.04] hover:bg-white/[0.08]'
                    : 'border-black/[0.06] bg-black/[0.02] hover:bg-black/[0.05]'
              }`}
              title="Account & Security"
            >
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-tr from-[#4763F5] to-[#7A92FF] text-[11px] font-bold text-white shadow-2xs">
                {initial}
              </div>
              <span className="hidden xl:inline text-[13px] font-medium text-neutral-700 dark:text-neutral-200 truncate max-w-[110px]">
                {displayName.split(' ')[0]}
              </span>
              <ChevronDown className={`h-3.5 w-3.5 text-neutral-400 transition-transform duration-150 ${showUserMenu ? 'rotate-180' : ''}`} />
            </button>

            {showUserMenu && (
              <div className={`absolute right-0 top-full mt-2 w-60 overflow-hidden rounded-2xl border p-1.5 text-xs shadow-[0_20px_50px_rgba(0,0,0,0.25)] dark:shadow-[0_24px_60px_rgba(0,0,0,0.8)] z-50 backdrop-blur-3xl ${
                isDarkMode ? 'bg-[#1C1C1E]/95 border-white/[0.12] text-white' : 'bg-white/95 border-black/[0.08] text-neutral-900'
              }`}>
                {/* User Info Header */}
                <div className="px-3 py-2.5 border-b border-black/[0.06] dark:border-white/[0.08]">
                  <div className="font-semibold text-[13px] text-neutral-900 dark:text-neutral-100 truncate">
                    {displayName}
                  </div>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500" />
                    <span className="text-[11px] font-medium font-mono text-neutral-400">
                      {normalizedRole}
                    </span>
                  </div>
                </div>

                {/* Actions */}
                <div className="pt-1.5 space-y-0.5">
                  {onOpenSecurityModal && (
                    <button
                      type="button"
                      onClick={() => {
                        setShowUserMenu(false);
                        onOpenSecurityModal();
                      }}
                      className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-xs font-medium transition hover:bg-black/[0.04] dark:hover:bg-white/[0.08] cursor-pointer"
                    >
                      <Shield className="h-4 w-4 text-neutral-400" />
                      <span>Security & Access</span>
                    </button>
                  )}

                  {onSignOut && (
                    <div className="border-t pt-1 border-black/[0.06] dark:border-white/[0.08]">
                      <button
                        type="button"
                        onClick={() => {
                          setShowUserMenu(false);
                          onSignOut();
                        }}
                        className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-xs font-medium text-[#FF3B30] transition hover:bg-[#FF3B30]/10 cursor-pointer"
                      >
                        <LogOut className="h-4 w-4" />
                        <span>Sign Out</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

        </div>
      </div>

      {/* Mobile Search Overlay Bar (1.10X) */}
      {isMobileSearchOpen && (
        <div className={`absolute left-0 right-0 top-full z-40 border-b p-3 shadow-xl md:hidden ${
          isDarkMode ? 'border-white/[0.1] bg-[#1C1C1E]/98 backdrop-blur-3xl' : 'border-black/[0.08] bg-white/98 backdrop-blur-3xl'
        }`}>
          <div className="relative flex items-center">
            <Search className="absolute left-3 h-4 w-4 text-neutral-400" />
            <input
              ref={mobileSearchInputRef}
              autoFocus
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search orders, stock, jobs, invoices..."
              className={`w-full rounded-xl border py-2 pl-9 pr-9 text-xs font-normal outline-none ${
                isDarkMode
                  ? 'border-white/[0.1] bg-white/[0.06] text-white placeholder:text-neutral-500 focus:border-[#4763F5]'
                  : 'border-black/[0.1] bg-neutral-100 text-neutral-900 placeholder:text-neutral-400 focus:border-[#4763F5]'
              }`}
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3 text-neutral-400 hover:text-neutral-600 dark:hover:text-white cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {searchQuery.trim() !== '' && (
            <div className="mt-2.5 max-h-64 overflow-y-auto space-y-1">
              {matchingOrders.map(order => (
                <button
                  key={order.id}
                  type="button"
                  onClick={() => handleSearchResultClick('order', order.id)}
                  className={`flex w-full items-center justify-between gap-2.5 rounded-xl p-2.5 text-left text-xs font-medium cursor-pointer ${
                    isDarkMode ? 'hover:bg-white/[0.08] text-white' : 'hover:bg-neutral-100 text-neutral-800'
                  }`}
                >
                  <span className="truncate">{order.poNo || 'PO'} · {order.customerName}</span>
                  <ArrowRight className="h-4 w-4 shrink-0 text-neutral-400" />
                </button>
              ))}
              {matchingStock.map(item => (
                <button
                  key={item.code}
                  type="button"
                  onClick={() => handleSearchResultClick('stock', item.code)}
                  className={`flex w-full items-center justify-between gap-2.5 rounded-xl p-2.5 text-left text-xs font-medium cursor-pointer ${
                    isDarkMode ? 'hover:bg-white/[0.08] text-white' : 'hover:bg-neutral-100 text-neutral-800'
                  }`}
                >
                  <span className="truncate">{item.code} · {item.description}</span>
                  <ArrowRight className="h-4 w-4 shrink-0 text-neutral-400" />
                </button>
              ))}
              {totalResultsCount === 0 && (
                <div className="py-4 text-center text-xs text-neutral-400">
                  No matching results found.
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Slide-over Notifications Center Drawer */}
      <NotificationDrawer
        isOpen={isNotificationOpen}
        onClose={() => setIsNotificationOpen(false)}
        notifications={notifications}
        unreadCount={unreadCount}
        onMarkAsRead={markAsRead}
        onMarkAllAsRead={markAllAsRead}
        onClearAll={clearAll}
        isSoundEnabled={isSoundEnabled}
        onToggleSound={toggleSound}
        isDarkMode={isDarkMode}
      />
    </header>
  );
};

export default ConsoleHeader;