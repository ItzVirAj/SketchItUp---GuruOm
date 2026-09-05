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
  CircleCheck,
  UserRound,
  Bell,
  Terminal,
  Layers,
  Sparkles
} from 'lucide-react';
import { AccentColorSelector } from './AccentColorSelector';
import { CustomerOrder, StockItem, CustomerInvoice, JobCard, UserRole, ConsoleView, SystemUser } from '../../types/console';
import { getViewTitle } from '../../utils/navigationConfig';
import { NotificationDrawer } from './NotificationDrawer';
import { useInAppNotifications } from '../../hooks/useInAppNotifications';
import { normalizeRole } from '../../utils/rbacMatrix';

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
  setCurrentRole,
  userName,
  currentUser,
  onOpenSwitchUser,
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

  // Close search dropdown on click outside
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

  return (
    <header className={`relative z-30 shrink-0 border-b px-4 font-sans transition-colors sm:px-6 lg:px-8 ${
      isDarkMode
        ? 'border-white/15 bg-[#141418]/90 backdrop-blur-3xl text-white shadow-[inset_0_1px_0_0_rgba(255,255,255,0.12),0_8px_30px_rgba(0,0,0,0.4)]'
        : 'border-slate-200/90 bg-white/95 backdrop-blur-3xl text-slate-900 shadow-xs'
    }`}>
      <div className="flex h-[74px] items-center justify-between gap-4">
        
        {/* ========================================================================= */}
        {/* ── LEFT: APPLE BRANDING & VIEW CONTEXT ──                                 */}
        {/* ========================================================================= */}
        <div className="flex min-w-0 items-center gap-3.5 lg:shrink-0">
          {onToggleMobileMenu && (
            <button
              type="button"
              onClick={onToggleMobileMenu}
              aria-label="Open navigation"
              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border transition-all active:scale-95 cursor-pointer lg:hidden ${
                isDarkMode 
                  ? 'border-white/10 bg-white/[0.06] text-white hover:bg-white/10' 
                  : 'border-slate-200 bg-slate-100 text-slate-800 hover:bg-slate-200'
              }`}
            >
              <Menu className="h-5 w-5" />
            </button>
          )}

          <button
            type="button"
            onClick={() => onNavigate?.('command-centre')}
            className="group flex min-w-0 items-center gap-2.5 text-left transition-all active:scale-95 cursor-pointer lg:hidden"
            title="Command Centre"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[var(--accent-gradient-from)] to-[var(--accent-gradient-to)] text-xs font-black text-white shadow-md shadow-[var(--accent-shadow)]">
              OS
            </div>
            <div className="hidden min-w-0 flex-col leading-tight sm:flex">
              <span className={`truncate text-sm font-bold tracking-tight ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                SketchItUp
              </span>
              <span className="truncate font-mono text-[9px] font-semibold text-[var(--accent-text-light)] dark:text-[var(--accent-text-dark)] uppercase tracking-wider">
                OwnerOS
              </span>
            </div>
          </button>

          {/* Desktop Apple HIG Title Strip */}
          <div className="hidden min-w-0 lg:flex items-center gap-3">
            <div 
              onClick={() => onNavigate?.('command-centre')}
              className="flex items-center gap-2.5 cursor-pointer group"
            >
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[var(--accent-gradient-from)] to-[var(--accent-gradient-to)] text-xs font-black text-white shadow-md shadow-[var(--accent-shadow)] group-hover:scale-105 transition-transform">
                OS
              </div>
              <div className="flex flex-col justify-center leading-tight">
                <span className={`text-sm font-bold tracking-tight group-hover:text-[var(--accent-text-light)] dark:group-hover:text-[var(--accent-text-dark)] transition-colors ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                  SketchItUp
                </span>
                <span className="font-mono text-[10px] font-semibold uppercase tracking-wider text-[var(--accent-text-light)] dark:text-[var(--accent-text-dark)]">
                  OwnerOS
                </span>
              </div>
            </div>

            {/* Hairline vertical divider */}
            <div className={`h-6 w-px shrink-0 mx-1 ${isDarkMode ? 'bg-white/15' : 'bg-slate-200'}`} />

            {/* Breadcrumb pill */}
            <div className={`min-w-0 flex items-center gap-1.5 px-3 py-1 rounded-full text-xs shadow-2xs border ${
              isDarkMode ? 'bg-white/[0.06] border-white/15' : 'bg-slate-100 border-slate-200'
            }`}>
              <span className={`${isDarkMode ? 'text-slate-300' : 'text-slate-600'} font-medium`}>Workspace</span>
              <span className="text-slate-400">/</span>
              <span className="font-semibold text-[#5B75F8] dark:text-[#7B92FF] truncate">{activeTitle}</span>
            </div>
          </div>

          <div className={`min-w-0 border-l pl-3 lg:hidden ${isDarkMode ? 'border-white/15' : 'border-slate-200'}`}>
            <div className={`truncate text-xs font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{activeTitle}</div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* ── CENTER: APPLE SPOTLIGHT SEARCH BAR ──                                  */}
        {/* ========================================================================= */}
        <div className="relative hidden flex-1 items-center justify-center lg:flex px-4" ref={searchDropdownRef}>
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
            className={`group relative flex h-10 w-full max-w-[560px] items-center justify-between rounded-full border px-4 transition-all duration-150 cursor-pointer active:scale-[0.99] ${
              isDarkMode
                ? 'border-white/15 bg-white/[0.06] hover:border-white/25 hover:bg-white/[0.1] text-slate-200 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06)]'
                : 'border-slate-200 bg-slate-50/90 hover:border-slate-300 hover:bg-slate-100 text-slate-700'
            }`}
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <Search className="h-3.5 w-3.5 shrink-0 text-slate-400 group-hover:text-[#5B75F8] transition-colors" />
              <span className={`text-xs font-normal truncate ${isDarkMode ? 'text-slate-300' : 'text-slate-500'}`}>
                Search purchase orders, job cards, parts, invoices, customers...
              </span>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <span className={`rounded-full border px-2.5 py-0.5 font-mono text-[10px] font-semibold flex items-center gap-1 shadow-xs ${
                isDarkMode ? 'border-white/15 bg-white/[0.08] text-slate-300' : 'border-slate-300 bg-slate-200/80 text-slate-600'
              }`}>
                <span>⌘</span>
                <span>K</span>
              </span>
            </div>
          </button>

          {/* Live Search Quick Results Dropdown */}
          {isSearchFocused && searchQuery.trim() !== '' && (
            <div className={`absolute left-1/2 top-full mt-2 w-full max-w-[580px] -translate-x-1/2 overflow-hidden rounded-3xl border shadow-[0_24px_60px_rgba(0,0,0,0.8),inset_0_1px_0_0_rgba(255,255,255,0.15)] z-50 backdrop-blur-3xl ${
              isDarkMode ? 'bg-[#18181D]/98 border-white/15 text-white' : 'bg-white border-slate-200 text-slate-900'
            }`}>
              <div className="flex items-center justify-between border-b border-white/10 px-4 py-3 text-xs font-semibold text-slate-400">
                <span>Search results ({totalResultsCount})</span>
                <span className="font-mono text-[10px]">Orders • Parts • Finance</span>
              </div>
              <div className="max-h-80 overflow-y-auto p-2 space-y-1">
                {matchingOrders.length > 0 && <div className="px-2 py-1 text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400">Customer Orders</div>}
                {matchingOrders.map(order => (
                  <button key={order.id} type="button" onClick={() => handleSearchResultClick('order', order.id)} className="flex w-full items-center justify-between gap-3 rounded-2xl p-2.5 text-left transition hover:bg-white/[0.08] cursor-pointer">
                    <span className="flex min-w-0 items-center gap-2.5">
                      <div className="p-2 rounded-xl bg-[#5B75F8]/10 text-[#5B75F8]">
                        <ShoppingCart className="h-3.5 w-3.5 shrink-0" />
                      </div>
                      <span className="min-w-0">
                        <span className="block truncate text-xs font-semibold">{order.poNo || 'PO'} - {order.customerName || 'Customer'}</span>
                        <span className="block truncate font-mono text-[10px] text-slate-400">{(order.lines || []).length} items • ₹{(order.grossAmount || 0).toLocaleString()} • {order.status}</span>
                      </span>
                    </span>
                    <ArrowRight className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                  </button>
                ))}

                {matchingStock.length > 0 && <div className="px-2 py-1 text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400">Inventory & Stock</div>}
                {matchingStock.map(item => (
                  <button key={item.code} type="button" onClick={() => handleSearchResultClick('stock', item.code)} className="flex w-full items-center justify-between gap-3 rounded-2xl p-2.5 text-left transition hover:bg-white/[0.08] cursor-pointer">
                    <span className="flex min-w-0 items-center gap-2.5">
                      <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400">
                        <Package className="h-3.5 w-3.5 shrink-0" />
                      </div>
                      <span className="min-w-0">
                        <span className="block truncate text-xs font-semibold">{item.code} - {item.description}</span>
                        <span className="block truncate font-mono text-[10px] text-slate-400">Qty: {item.available ?? item.onHand ?? 0} {item.unit || 'PCS'} • {item.status}</span>
                      </span>
                    </span>
                    <ArrowRight className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                  </button>
                ))}

                {matchingInvoices.length > 0 && <div className="px-2 py-1 text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400">Tax Invoices</div>}
                {matchingInvoices.map(inv => (
                  <button key={inv.invoiceNo} type="button" onClick={() => handleSearchResultClick('invoice', inv.invoiceNo)} className="flex w-full items-center justify-between gap-3 rounded-2xl p-2.5 text-left transition hover:bg-white/[0.08] cursor-pointer">
                    <span className="flex min-w-0 items-center gap-2.5">
                      <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400">
                        <FileText className="h-3.5 w-3.5 shrink-0" />
                      </div>
                      <span className="min-w-0">
                        <span className="block truncate text-xs font-semibold">{inv.invoiceNo} - {inv.customerName}</span>
                        <span className="block truncate font-mono text-[10px] text-slate-400">PO: {inv.orderPo} • ₹{Number(inv.totalAmount || 0).toLocaleString()} • {inv.status}</span>
                      </span>
                    </span>
                    <ArrowRight className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                  </button>
                ))}

                {matchingJobs.length > 0 && <div className="px-2 py-1 text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400">Shopfloor Job Cards</div>}
                {matchingJobs.map(job => (
                  <button key={job.jobNo} type="button" onClick={() => handleSearchResultClick('job', job.jobNo)} className="flex w-full items-center justify-between gap-3 rounded-2xl p-2.5 text-left transition hover:bg-white/[0.08] cursor-pointer">
                    <span className="flex min-w-0 items-center gap-2.5">
                      <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400">
                        <Wrench className="h-3.5 w-3.5 shrink-0" />
                      </div>
                      <span className="min-w-0">
                        <span className="block truncate text-xs font-semibold">{job.jobNo} - {job.partCode || job.partDescription}</span>
                        <span className="block truncate font-mono text-[10px] text-slate-400">Machine: {job.machine || 'CNC'} • Qty: {job.qty} • {job.status}</span>
                      </span>
                    </span>
                    <ArrowRight className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                  </button>
                ))}

                {totalResultsCount === 0 && (
                  <div className="py-8 text-center text-xs font-medium text-slate-400">No matching orders, items, invoices or jobs found.</div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* ========================================================================= */}
        {/* ── RIGHT: APPLE CONTROL DECK & ACTION PILLS ──                            */}
        {/* ========================================================================= */}
        <div className="ml-auto flex shrink-0 items-center gap-2">
          
          {/* Mobile Search Button */}
          <button
            type="button"
            onClick={() => setIsMobileSearchOpen(!isMobileSearchOpen)}
            aria-label="Toggle quick search"
            className={`flex h-9 w-9 items-center justify-center rounded-full border transition-all active:scale-95 lg:hidden ${
              isDarkMode ? 'border-white/15 bg-white/[0.06] text-slate-200' : 'border-slate-200 bg-slate-100 text-slate-700'
            }`}
          >
            <Search className="h-4 w-4" />
          </button>

          {/* Scope Selector */}
          <div className="relative hidden xl:block" ref={scopeDropdownRef}>
            <button
              type="button"
              onClick={() => setShowScopeDropdown(!showScopeDropdown)}
              className={`flex h-9 items-center gap-2 rounded-full border px-3.5 text-xs font-semibold transition-all active:scale-95 cursor-pointer shadow-2xs ${
                isDarkMode 
                  ? 'border-white/15 bg-white/[0.06] text-slate-200 hover:bg-white/[0.1] hover:border-white/25' 
                  : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
              }`}
              title={`Reporting period: ${fiscalYear}`}
            >
              <CalendarRange className="h-3.5 w-3.5 text-[#5B75F8]" />
              <span>{scope}</span>
              <ChevronDown className={`h-3 w-3 text-slate-400 transition-transform ${showScopeDropdown ? 'rotate-180 text-[#5B75F8]' : ''}`} />
            </button>
            
            {showScopeDropdown && (
              <div className={`absolute right-0 top-full mt-2 w-44 rounded-2xl border p-1.5 text-xs shadow-[0_20px_50px_rgba(0,0,0,0.8),inset_0_1px_0_0_rgba(255,255,255,0.12)] z-50 backdrop-blur-3xl ${
                isDarkMode ? 'bg-[#18181D]/98 border-white/15 text-white' : 'bg-white border-slate-200 text-slate-900'
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
                    className={`w-full rounded-xl px-3 py-2 text-left font-semibold transition-all cursor-pointer ${
                      scope === sc 
                        ? 'bg-[#5B75F8] text-white shadow-sm' 
                        : isDarkMode ? 'hover:bg-white/[0.08] text-slate-200' : 'hover:bg-slate-100 text-slate-700'
                    }`}
                  >
                    {sc}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Theme and Dashboard Customizer */}
          <div className="relative" ref={customizeDropdownRef}>
            <button
              type="button"
              onClick={() => setShowCustomizeMenu(prev => !prev)}
              className={`flex h-9 w-9 items-center justify-center rounded-full border text-xs font-semibold transition-all active:scale-95 cursor-pointer shadow-2xs ${
                showCustomizeMenu
                  ? 'border-[#5B75F8] bg-[#5B75F8]/15 text-[#5B75F8]'
                  : isDarkMode 
                    ? 'border-white/15 bg-white/[0.06] text-slate-200 hover:bg-white/[0.1] hover:border-white/25' 
                    : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'
              }`}
              title="Theme and appearance"
            >
              <Palette className="h-4 w-4" />
            </button>

            {showCustomizeMenu && (
              <div className={`absolute right-0 top-full mt-2 w-72 rounded-3xl border p-4 shadow-[0_20px_50px_rgba(0,0,0,0.8),inset_0_1px_0_0_rgba(255,255,255,0.12)] z-50 backdrop-blur-3xl ${
                isDarkMode ? 'bg-[#18181D]/98 border-white/15 text-white' : 'bg-white border-slate-200 text-slate-900'
              }`}>
                <AccentColorSelector isDarkMode={isDarkMode} />
                {onOpenCustomize && (
                  <button
                    type="button"
                    onClick={() => {
                      setShowCustomizeMenu(false);
                      onOpenCustomize();
                    }}
                    className={`mt-4 flex w-full items-center justify-between rounded-full border px-4 py-2.5 text-xs font-semibold transition-all cursor-pointer ${
                      isDarkMode ? 'border-white/15 bg-white/[0.06] hover:bg-white/10 text-white' : 'border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-800'
                    }`}
                  >
                    <span className="flex items-center gap-2"><SlidersHorizontal className="h-3.5 w-3.5" /> Configure widgets</span>
                    <ArrowRight className="h-3.5 w-3.5 text-slate-400" />
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Sync Button */}
          <button
            type="button"
            onClick={handleSyncClick}
            disabled={isSyncing}
            title="Refresh and synchronize system data"
            className={`flex h-9 items-center gap-1.5 rounded-full border px-3 text-xs font-semibold transition-all active:scale-95 cursor-pointer shadow-2xs ${
              isSyncing
                ? 'cursor-wait opacity-80'
                : isDarkMode
                ? 'border-white/15 bg-white/[0.06] text-slate-200 hover:bg-white/[0.1] hover:border-white/25'
                : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
            }`}
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isSyncing ? 'animate-spin text-[#5B75F8]' : 'text-slate-400'}`} />
            <span className="hidden sm:inline">{isSyncing ? 'Syncing' : 'Sync'}</span>
          </button>

          {/* Last Synced Badge (1.15X Scaled) */}
          <div 
            className={`hidden items-center gap-2 rounded-full border px-3.5 py-1.5 xl:flex shadow-2xs transition-all ${
              isDarkMode ? 'border-white/15 bg-white/[0.06] hover:bg-white/[0.1]' : 'border-slate-200 bg-slate-50 hover:bg-slate-100'
            }`} 
            title={`Last synchronized: ${lastSynced}`}
          >
            <CircleCheck className="h-4 w-4 text-emerald-500 shrink-0" />
            <span className={`font-mono text-[11px] font-semibold tracking-tight ${isDarkMode ? 'text-slate-200' : 'text-slate-700'}`}>{lastSynced}</span>
          </div>

          {/* ServerAdmin Vault Link */}
          {normalizeRole(currentRole) === 'ServerAdmin' && (
            <Link
              to="/admin"
              className="flex h-9 items-center gap-1.5 rounded-full border border-purple-500/30 bg-purple-500/15 px-3 text-xs font-semibold text-purple-300 hover:bg-purple-500/25 transition-all shadow-sm active:scale-95"
              title="Enter ServerAdmin Maker Vault"
            >
              <Terminal className="h-3.5 w-3.5 text-purple-400" />
              <span className="hidden sm:inline">Admin Vault</span>
            </Link>
          )}

          {/* Real-time Notifications Bell */}
          <button
            type="button"
            onClick={() => setIsNotificationOpen(true)}
            className={`relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full border transition-all active:scale-95 cursor-pointer shadow-2xs ${
              isDarkMode 
                ? 'border-white/15 bg-white/[0.06] text-slate-200 hover:bg-white/[0.1] hover:border-white/25' 
                : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
            }`}
            title={`Operations Alerts (${unreadCount} unread)`}
          >
            <Bell className="h-4 w-4" />
            {unreadCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 font-mono text-[8px] font-bold text-white shadow-sm animate-pulse">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </button>

          {/* Apple Segmented Dark/Light Mode Switch */}
          <button
            type="button"
            onClick={() => setIsDarkMode(!isDarkMode)}
            className={`relative flex h-9 w-14 shrink-0 items-center rounded-full border p-0.5 transition-all cursor-pointer shadow-2xs ${
              isDarkMode ? 'border-white/15 bg-black/60 shadow-inner' : 'border-slate-200 bg-slate-100'
            }`}
            title={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            <motion.div
              layout
              transition={{ type: 'spring', stiffness: 500, damping: 30 }}
              className={`flex h-7 w-7 items-center justify-center rounded-full text-white shadow-sm ${
                isDarkMode ? 'ml-6 bg-[#5B75F8]' : 'ml-0 bg-slate-800'
              }`}
            >
              <AnimatePresence mode="popLayout" initial={false}>
                <motion.div
                  key={isDarkMode ? 'moon' : 'sun'}
                  initial={{ opacity: 0, scale: 0.25 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.25 }}
                  transition={{ type: 'spring', duration: 0.25, bounce: 0 }}
                  className="flex h-7 w-7 items-center justify-center"
                >
                  {isDarkMode ? <Moon className="h-3.5 w-3.5" /> : <Sun className="h-3.5 w-3.5" />}
                </motion.div>
              </AnimatePresence>
            </motion.div>
          </button>

          {/* User Profile Pill (Only available to authorized administrators) */}
          {onOpenSwitchUser && (
            <button
              type="button"
              onClick={onOpenSwitchUser}
              className={`hidden h-9 w-9 items-center justify-center rounded-full border transition-all active:scale-95 cursor-pointer xl:flex shadow-2xs ${
                isDarkMode 
                  ? 'border-white/15 bg-white/[0.06] text-slate-200 hover:bg-white/[0.1] hover:border-white/25' 
                  : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'
              }`}
              title={`Switch user: ${currentUser?.name || userName} (${currentRole})`}
            >
              <UserRound className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {/* Mobile Search Overlay Bar */}
      {isMobileSearchOpen && (
        <div className={`absolute left-0 right-0 top-full z-40 border-b p-3 shadow-2xl lg:hidden ${
          isDarkMode ? 'border-white/15 bg-[#18181D]/98 backdrop-blur-3xl' : 'border-slate-200 bg-white'
        }`}>
          <div className="relative flex items-center">
            <Search className="absolute left-3.5 h-4 w-4 text-slate-400" />
            <input
              ref={mobileSearchInputRef}
              autoFocus
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search orders, parts, invoices, jobs..."
              className={`w-full rounded-full border py-2 pl-9 pr-9 text-xs font-medium outline-none ${
                isDarkMode 
                  ? 'border-white/15 bg-white/[0.06] text-white placeholder:text-slate-400 focus:border-[#5B75F8]' 
                  : 'border-slate-200 bg-slate-50 text-slate-900 placeholder:text-slate-400 focus:border-[#5B75F8]'
              }`}
            />
            {searchQuery && (
              <button type="button" onClick={() => setSearchQuery('')} className="absolute right-3 text-slate-400 hover:text-slate-900 dark:hover:text-white cursor-pointer">
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {searchQuery.trim() !== '' && (
            <div className="mt-2 max-h-64 overflow-y-auto space-y-1">
              {matchingOrders.map(order => (
                <button key={order.id} type="button" onClick={() => handleSearchResultClick('order', order.id)} className={`flex w-full items-center justify-between gap-2 rounded-xl p-2 text-left text-xs font-semibold cursor-pointer ${isDarkMode ? 'hover:bg-white/[0.08] text-white' : 'hover:bg-slate-100 text-slate-800'}`}>
                  <span className="truncate">{order.poNo || 'PO'} - {order.customerName}</span>
                  <ArrowRight className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                </button>
              ))}
              {matchingStock.map(item => (
                <button key={item.code} type="button" onClick={() => handleSearchResultClick('stock', item.code)} className={`flex w-full items-center justify-between gap-2 rounded-xl p-2 text-left text-xs font-semibold cursor-pointer ${isDarkMode ? 'hover:bg-white/[0.08] text-white' : 'hover:bg-slate-100 text-slate-800'}`}>
                  <span className="truncate">{item.code} - {item.description}</span>
                  <ArrowRight className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                </button>
              ))}
              {totalResultsCount === 0 && <div className="py-4 text-center text-xs text-slate-400">No matching results.</div>}
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
