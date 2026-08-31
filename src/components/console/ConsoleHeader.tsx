import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'motion/react';
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
  Bell
} from 'lucide-react';
import { AccentColorSelector } from './AccentColorSelector';
import { CustomerOrder, StockItem, CustomerInvoice, JobCard, UserRole, ConsoleView, SystemUser } from '../../types/console';
import { getViewTitle } from '../../utils/navigationConfig';
import { NotificationDrawer } from '../NotificationDrawer';
import { useInAppNotifications } from '../../hooks/useInAppNotifications';

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
      // Reload entire window/session like browser refresh
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
    <header className={`relative z-30 shrink-0 border-b px-3 font-sans transition-colors sm:px-4 lg:px-7 ${
      isDarkMode
        ? 'border-white/[0.07] bg-[#12161e]/95 text-slate-100'
        : 'border-slate-200/80 bg-white/95 text-slate-900'
    }`}>
      <div className="flex h-[76px] items-center gap-4">
        <div className="flex min-w-0 items-center gap-3 lg:shrink-0">
          {onToggleMobileMenu && (
            <button
              type="button"
              onClick={onToggleMobileMenu}
              aria-label="Open navigation"
              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border transition-colors lg:hidden ${
                isDarkMode ? 'border-slate-800 bg-slate-900 text-slate-200 hover:bg-slate-800' : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
              }`}
            >
              <Menu className="h-5 w-5" />
            </button>
          )}

          <button
            type="button"
            onClick={() => onNavigate?.('command-centre')}
            className="group flex min-w-0 items-center gap-3 text-left lg:hidden"
            title="Command Centre"
          >
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-tr from-[var(--accent-gradient-from)] to-[var(--accent-gradient-to)] text-sm font-black text-white shadow-md shadow-[var(--accent-shadow)]">
              G
            </div>
            <div className="hidden min-w-0 flex-col leading-tight sm:flex">
              <span className="truncate text-[15px] font-black tracking-tight text-slate-950 dark:text-white">
                GuruOm OS
              </span>
              <span className="mt-0.5 truncate font-mono text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Industrial Command
              </span>
            </div>
          </button>

          <div className="hidden min-w-0 lg:flex items-center gap-3.5">
            {/* Primary SketchItUp / - OwnerOS branding (Bigger) */}
            <div className="flex flex-col justify-center leading-tight shrink-0">
              <span className="text-[17px] font-black tracking-[-0.03em] text-slate-950 dark:text-white">
                SketchItUp
              </span>
              <span className="font-mono text-[11px] font-bold uppercase tracking-wider text-[var(--accent-text-light)] dark:text-[var(--accent-text-dark)]">
                - OwnerOS
              </span>
            </div>

            {/* Straight vertical line divider */}
            <div className="h-8 w-px bg-slate-200 dark:bg-white/[0.12] shrink-0" />

            {/* Workspace & Page context (Smaller) */}
            <div className="min-w-0 flex flex-col justify-center leading-tight">
              <div className="flex items-center gap-1.5 font-mono text-[9px] font-bold uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500">
                <span>Workspace</span>
                <span className="text-[10px] text-slate-300 dark:text-slate-600">/</span>
                <span className="text-[var(--accent-text-light)] dark:text-[var(--accent-text-dark)]">Live</span>
              </div>
              <div className="truncate text-[13px] font-bold tracking-tight text-slate-700 dark:text-slate-300 mt-0.5">
                {activeTitle}
              </div>
            </div>
          </div>

          <div className="min-w-0 border-l border-slate-200 pl-3 dark:border-slate-800 lg:hidden">
            <div className="truncate text-sm font-extrabold text-slate-900 dark:text-white">{activeTitle}</div>
          </div>
        </div>

        <div className="relative hidden flex-1 items-center justify-center lg:flex" ref={searchDropdownRef}>
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
            className={`group relative flex h-11 w-full max-w-[640px] items-center justify-between rounded-xl border px-3.5 transition-all cursor-pointer ${
              isDarkMode 
                ? 'border-white/[0.08] bg-white/[0.045] hover:border-white/[0.15] hover:bg-white/[0.07] text-slate-300' 
                : 'border-slate-200 bg-slate-50/80 hover:border-slate-300 hover:bg-slate-100 text-slate-700'
            }`}
          >
            <div className="flex items-center gap-3 min-w-0">
              <Search className="h-4 w-4 shrink-0 text-slate-400 group-hover:text-[var(--accent-primary)] transition-colors" />
              <span className="text-sm font-medium text-slate-400 dark:text-slate-500 truncate">
                Search PO #, Job Cards, Part Codes, Invoices, Customers...
              </span>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <span className="rounded-md border border-slate-200 bg-white px-2 py-0.5 font-mono text-[10px] font-bold text-slate-500 shadow-xs dark:border-white/10 dark:bg-white/[0.06] dark:text-slate-400 flex items-center gap-1">
                <span>CTRL</span>
                <span>K</span>
              </span>
            </div>
          </button>

          {isSearchFocused && searchQuery.trim() !== '' && (
            <div className={`absolute left-1/2 top-full mt-2 w-full max-w-[640px] -translate-x-1/2 overflow-hidden rounded-2xl border shadow-2xl ${
              isDarkMode ? 'border-slate-800 bg-slate-900 text-slate-100 shadow-black/40' : 'border-slate-200 bg-white text-slate-900 shadow-slate-300/50'
            }`}>
              <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3 text-xs font-semibold text-slate-500 dark:border-slate-800">
                <span>Search results ({totalResultsCount})</span>
                <span className="font-mono text-[10px]">orders - parts - finance</span>
              </div>
              <div className="max-h-80 overflow-y-auto p-2">
                {matchingOrders.length > 0 && <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">Customer Orders</div>}
                {matchingOrders.map(order => (
                  <button key={order.id} type="button" onClick={() => handleSearchResultClick('order', order.id)} className="flex w-full items-center justify-between gap-3 rounded-xl p-2.5 text-left transition hover:bg-slate-100 dark:hover:bg-slate-800/80">
                    <span className="flex min-w-0 items-center gap-2.5">
                      <ShoppingCart className="h-4 w-4 shrink-0 text-[var(--accent-primary)]" />
                      <span className="min-w-0">
                        <span className="block truncate text-xs font-bold">{order.poNo || 'PO'} - {order.customerName || 'Customer'}</span>
                        <span className="block truncate font-mono text-[10px] text-slate-400">{(order.lines || []).length} line items - Rs {(order.grossAmount || 0).toLocaleString()} - {order.status}</span>
                      </span>
                    </span>
                    <ArrowRight className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                  </button>
                ))}

                {matchingStock.length > 0 && <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">Inventory / Parts</div>}
                {matchingStock.map(item => (
                  <button key={item.code} type="button" onClick={() => handleSearchResultClick('stock', item.code)} className="flex w-full items-center justify-between gap-3 rounded-xl p-2.5 text-left transition hover:bg-slate-100 dark:hover:bg-slate-800/80">
                    <span className="flex min-w-0 items-center gap-2.5">
                      <Package className="h-4 w-4 shrink-0 text-emerald-500" />
                      <span className="min-w-0">
                        <span className="block truncate text-xs font-bold">{item.code} - {item.description}</span>
                        <span className="block truncate font-mono text-[10px] text-slate-400">Available: {item.available ?? item.onHand ?? 0} {item.unit || 'PCS'} - {item.status}</span>
                      </span>
                    </span>
                    <ArrowRight className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                  </button>
                ))}

                {matchingInvoices.length > 0 && <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">Invoices</div>}
                {matchingInvoices.map(inv => (
                  <button key={inv.invoiceNo} type="button" onClick={() => handleSearchResultClick('invoice', inv.invoiceNo)} className="flex w-full items-center justify-between gap-3 rounded-xl p-2.5 text-left transition hover:bg-slate-100 dark:hover:bg-slate-800/80">
                    <span className="flex min-w-0 items-center gap-2.5">
                      <FileText className="h-4 w-4 shrink-0 text-[var(--accent-primary)]" />
                      <span className="min-w-0">
                        <span className="block truncate text-xs font-bold">{inv.invoiceNo} - {inv.customerName}</span>
                        <span className="block truncate font-mono text-[10px] text-slate-400">PO: {inv.orderPo} - {inv.status} - Due: {inv.dueDate || 'Immediate'}</span>
                      </span>
                    </span>
                    <ArrowRight className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                  </button>
                ))}

                {matchingJobs.length > 0 && <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">Shopfloor Jobs</div>}
                {matchingJobs.map(job => (
                  <button key={job.jobNo} type="button" onClick={() => handleSearchResultClick('job', job.jobNo)} className="flex w-full items-center justify-between gap-3 rounded-xl p-2.5 text-left transition hover:bg-slate-100 dark:hover:bg-slate-800/80">
                    <span className="flex min-w-0 items-center gap-2.5">
                      <Wrench className="h-4 w-4 shrink-0 text-amber-500" />
                      <span className="min-w-0">
                        <span className="block truncate text-xs font-bold">{job.jobNo} - {job.partCode || job.partDescription}</span>
                        <span className="block truncate font-mono text-[10px] text-slate-400">Machine: {job.machine || 'CNC'} - {job.status} - Qty: {job.qty}</span>
                      </span>
                    </span>
                    <ArrowRight className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                  </button>
                ))}

                {totalResultsCount === 0 && (
                  <div className="py-7 text-center text-xs font-medium text-slate-400">No matching orders, items, invoices or jobs found.</div>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="ml-auto flex shrink-0 items-center gap-1.5">
          <button
            type="button"
            onClick={() => setIsMobileSearchOpen(!isMobileSearchOpen)}
            aria-label="Toggle quick search"
            className={`flex h-10 w-10 items-center justify-center rounded-xl border transition-colors lg:hidden ${
              isDarkMode ? 'border-slate-800 bg-slate-900 text-slate-300' : 'border-slate-200 bg-slate-50 text-slate-700'
            }`}
          >
            <Search className="h-4 w-4" />
          </button>

          <div className="relative hidden xl:block" ref={scopeDropdownRef}>
            <button
              type="button"
              onClick={() => setShowScopeDropdown(!showScopeDropdown)}
              className={`flex h-10 items-center gap-2 rounded-xl border px-3 text-xs font-bold transition-colors ${
                isDarkMode ? 'border-white/[0.08] bg-white/[0.045] text-slate-200 hover:bg-white/[0.08]' : 'border-slate-200 bg-slate-50/80 text-slate-700 hover:bg-slate-100'
              }`}
              title={`Reporting period: ${fiscalYear}`}
            >
              <CalendarRange className="h-3.5 w-3.5 text-slate-400" />
              <span>{scope}</span>
              <ChevronDown className={`h-3.5 w-3.5 text-slate-400 transition-transform ${showScopeDropdown ? 'rotate-180 text-[var(--accent-primary)]' : ''}`} />
            </button>
            {showScopeDropdown && (
              <div className={`absolute right-0 top-full mt-2 w-40 rounded-xl border p-1 text-xs shadow-xl ${
                isDarkMode ? 'border-slate-800 bg-slate-900 text-slate-100' : 'border-slate-200 bg-white text-slate-900'
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
                    className={`w-full rounded-lg px-3 py-2 text-left font-semibold transition-colors ${
                      scope === sc ? 'bg-[var(--accent-primary)] text-white' : 'hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    {sc}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="relative" ref={customizeDropdownRef}>
            <button
              type="button"
              onClick={() => setShowCustomizeMenu(prev => !prev)}
              className={`flex h-10 w-10 items-center justify-center rounded-xl border text-xs font-bold transition-colors ${
                showCustomizeMenu
                  ? 'border-[var(--accent-border-light)] bg-[var(--accent-soft-light)] text-[var(--accent-text-light)] dark:border-[var(--accent-border-dark)] dark:bg-[var(--accent-soft-dark)] dark:text-[var(--accent-text-dark)]'
                  : isDarkMode ? 'border-white/[0.08] bg-white/[0.045] text-slate-300 hover:bg-white/[0.08]' : 'border-slate-200 bg-slate-50/80 text-slate-600 hover:bg-slate-100'
              }`}
              title="Theme and dashboard"
            >
              <Palette className="h-4 w-4" />
            </button>

            {showCustomizeMenu && (
              <div className={`absolute right-0 top-full mt-2 w-72 rounded-2xl border p-4 shadow-2xl ${
                isDarkMode ? 'border-slate-800 bg-slate-900/95 text-white shadow-black/40' : 'border-slate-200 bg-white text-slate-900 shadow-slate-300/50'
              }`}>
                <AccentColorSelector isDarkMode={isDarkMode} />
                {onOpenCustomize && (
                  <button
                    type="button"
                    onClick={() => {
                      setShowCustomizeMenu(false);
                      onOpenCustomize();
                    }}
                    className={`mt-4 flex w-full items-center justify-between rounded-xl border px-3 py-2.5 text-xs font-bold transition-colors ${
                      isDarkMode ? 'border-slate-800 bg-slate-950/70 hover:bg-slate-800' : 'border-slate-200 bg-slate-50 hover:bg-slate-100'
                    }`}
                  >
                    <span className="flex items-center gap-2"><SlidersHorizontal className="h-3.5 w-3.5" /> Configure widgets</span>
                    <ArrowRight className="h-3.5 w-3.5 text-slate-400" />
                  </button>
                )}
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={handleSyncClick}
            disabled={isSyncing}
            title="Refresh and synchronize system data"
            className={`flex h-10 items-center gap-2 rounded-xl border px-3 text-xs font-bold transition-all active:scale-95 ${
              isSyncing
                ? 'cursor-wait opacity-80'
                : 'cursor-pointer bg-[var(--accent-soft-light)] text-[var(--accent-text-light)] hover:bg-[var(--accent-primary)] hover:text-white dark:bg-[var(--accent-soft-dark)] dark:text-[var(--accent-text-dark)]'
            } border-[var(--accent-border-light)] dark:border-[var(--accent-border-dark)]`}
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">{isSyncing ? 'Syncing' : 'Sync'}</span>
          </button>

          <div className="hidden items-center gap-1.5 px-1 2xl:flex" title={`Last synced: ${lastSynced}`}>
            <CircleCheck className="h-3.5 w-3.5 text-emerald-500" />
            <span className="font-mono text-[9px] font-semibold text-slate-400">{lastSynced}</span>
          </div>

          {/* Real-time Notifications Bell */}
          <button
            type="button"
            onClick={() => setIsNotificationOpen(true)}
            className={`relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border transition-colors cursor-pointer ${
              isDarkMode ? 'border-white/[0.08] bg-white/[0.045] text-slate-300 hover:bg-white/[0.08]' : 'border-slate-200 bg-slate-50/80 text-slate-700 hover:bg-slate-100'
            }`}
            title={`Operations Alerts (${unreadCount} unread)`}
          >
            <Bell className="h-4 w-4" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 flex h-4.5 min-w-4.5 items-center justify-center rounded-full bg-rose-500 px-1 font-mono text-[9px] font-extrabold text-white shadow-xs animate-pulse">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setIsDarkMode(!isDarkMode)}
            className={`relative flex h-10 w-[58px] shrink-0 items-center rounded-xl border p-1 transition-colors ${
              isDarkMode ? 'border-white/[0.08] bg-white/[0.045] text-slate-300' : 'border-slate-200 bg-slate-50/80 text-slate-700'
            }`}
            title={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            <motion.div
              layout
              transition={{ type: 'spring', stiffness: 500, damping: 30 }}
              className={`flex h-8 w-8 items-center justify-center rounded-lg text-white shadow-sm ${
                isDarkMode ? 'ml-4 bg-indigo-600' : 'ml-0 bg-[var(--accent-primary)]'
              }`}
            >
              {isDarkMode ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
            </motion.div>
          </button>

          <button
            type="button"
            onClick={onOpenSwitchUser}
            className={`hidden h-10 w-10 items-center justify-center rounded-xl border transition-colors xl:flex ${
              isDarkMode ? 'border-white/[0.08] bg-white/[0.045] text-slate-300 hover:bg-white/[0.08]' : 'border-slate-200 bg-slate-50/80 text-slate-600 hover:bg-slate-100'
            }`}
            title={`Switch user: ${currentUser?.name || userName} (${currentRole})`}
          >
            <UserRound className="h-4 w-4" />
          </button>
        </div>
      </div>

      {isMobileSearchOpen && (
        <div className={`absolute left-0 right-0 top-full z-40 border-b p-3 shadow-xl lg:hidden ${
          isDarkMode ? 'border-slate-800 bg-[#16171B]' : 'border-slate-200 bg-white'
        }`}>
          <div className="relative flex items-center">
            <Search className="absolute left-3 h-4 w-4 text-slate-400" />
            <input
              ref={mobileSearchInputRef}
              autoFocus
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search orders, parts, invoices, jobs..."
              className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-9 text-sm font-medium text-slate-800 outline-none focus:ring-2 focus:ring-[var(--accent-ring)] dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100"
            />
            {searchQuery && (
              <button type="button" onClick={() => setSearchQuery('')} className="absolute right-2 flex h-7 w-7 items-center justify-center rounded-lg text-slate-400">
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {searchQuery.trim() !== '' && (
            <div className="mt-2 max-h-64 overflow-y-auto space-y-1">
              {matchingOrders.map(order => (
                <button key={order.id} type="button" onClick={() => handleSearchResultClick('order', order.id)} className="flex w-full items-center justify-between gap-2 rounded-lg bg-slate-50 p-2 text-left text-xs font-semibold dark:bg-slate-800/60">
                  <span className="truncate">{order.poNo || 'PO'} - {order.customerName}</span>
                  <ArrowRight className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                </button>
              ))}
              {matchingStock.map(item => (
                <button key={item.code} type="button" onClick={() => handleSearchResultClick('stock', item.code)} className="flex w-full items-center justify-between gap-2 rounded-lg bg-slate-50 p-2 text-left text-xs font-semibold dark:bg-slate-800/60">
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
        isSoundEnabled={isSoundEnabled}
        onToggleSound={toggleSound}
        isDarkMode={isDarkMode}
      />
    </header>
  );
};

export default ConsoleHeader;
