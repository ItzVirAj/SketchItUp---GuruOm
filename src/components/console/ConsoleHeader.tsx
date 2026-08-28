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
  Palette
} from 'lucide-react';
import { AccentColorSelector } from './AccentColorSelector';
import { CustomerOrder, StockItem, CustomerInvoice, JobCard, UserRole, ConsoleView, SystemUser } from '../../types/console';
import { getViewTitle } from '../../utils/navigationConfig';

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
  currentView = 'command-centre'
}) => {
  const [isSyncing, setIsSyncing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [showScopeDropdown, setShowScopeDropdown] = useState(false);
  const [showCustomizeMenu, setShowCustomizeMenu] = useState(false);
  const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);

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
      setTimeout(() => setIsSyncing(false), 600);
    }
  };

  // Live Omnisearch query matching
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
  const activeTitle = getViewTitle(currentView);

  return (
    <header className={`px-3 sm:px-4 lg:px-6 py-2.5 sm:py-3 border-b transition-colors flex items-center justify-between gap-2 sm:gap-4 font-sans relative z-30 ${
      isDarkMode ? 'bg-[#16171B] border-[#262832] text-slate-200' : 'bg-[#F8FAFC] border-[#E2E8F0] text-slate-900'
    }`}>
      
      {/* Left Brand / Hamburger Menu / Page Title */}
      <div className="flex items-center gap-2 sm:gap-3 min-w-0">
        {onToggleMobileMenu && (
          <button
            type="button"
            onClick={onToggleMobileMenu}
            aria-label="Open Navigation Drawer"
            className={`p-2 rounded-xl border lg:hidden cursor-pointer shrink-0 transition-colors ${
              isDarkMode ? 'border-slate-800 bg-[#1A1B1F] hover:bg-slate-800 text-slate-200' : 'border-[#d8dde8] bg-white hover:bg-slate-50 text-slate-700'
            }`}
          >
            <Menu className="w-5 h-5" />
          </button>
        )}

        {/* Brand Indicator */}
        <div 
          id="sketchitup-logo-badge"
          className="flex items-center font-sans shrink-0"
        >
          <div className="flex flex-col leading-none">
            <span className="text-sm sm:text-base font-black tracking-tight text-slate-900 dark:text-white">
              sketch<span className="text-[var(--accent-primary)]">ItUP</span>
            </span>
            <span className="text-[9px] sm:text-[10px] font-mono text-slate-400 dark:text-slate-500 font-semibold uppercase tracking-wider mt-0.5">
              Owner OS
            </span>
          </div>
        </div>

        {/* Mobile-only Active View Title Divider & Badge */}
        <div className="flex lg:hidden items-center gap-1.5 min-w-0 pl-1 border-l border-slate-300 dark:border-slate-700">
          <span className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate">
            {activeTitle}
          </span>
        </div>
      </div>

      {/* Desktop OmniSearch Input */}
      <div className="hidden lg:flex items-center relative flex-1 max-w-xl xl:max-w-2xl mx-4">
        <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
        <input 
          ref={searchInputRef}
          type="text" 
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onFocus={() => setIsSearchFocused(true)}
          placeholder="Search orders, parts, invoices, jobs..."
          className="w-full bg-white dark:bg-slate-900 border border-[#d8dde8] dark:border-slate-800 rounded-xl pl-9 pr-16 py-2.5 text-xs text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-[var(--accent-ring)] focus:border-[var(--accent-primary)] transition-all placeholder:text-slate-400 shadow-2xs"
        />
        
        {searchQuery ? (
          <button 
            type="button"
            onClick={() => setSearchQuery('')}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        ) : (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-slate-400 font-mono border border-slate-200 dark:border-slate-800 px-1.5 py-0.5 rounded">
            ⌘K
          </span>
        )}

        {/* Search Results Dropdown */}
        {isSearchFocused && searchQuery.trim() !== '' && (
          <div 
            ref={searchDropdownRef}
            className={`absolute top-full left-0 right-0 mt-2 rounded-2xl border shadow-2xl z-50 overflow-hidden font-sans ${
              isDarkMode ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-900'
            }`}
          >
            <div className="p-3 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500 font-medium">
              <span>OmniSearch Results ({totalResultsCount})</span>
              <span className="font-mono text-[10px]">Press Esc to close</span>
            </div>

            <div className="max-h-80 overflow-y-auto p-2 space-y-3">
              {/* Matching Orders */}
              {matchingOrders.length > 0 && (
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-2.5 py-1">Customer Orders</div>
                  {matchingOrders.map(order => (
                    <div 
                      key={order.id}
                      onClick={() => handleSearchResultClick('order', order.id)}
                      className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800/80 cursor-pointer flex items-center justify-between transition-colors"
                    >
                      <div className="flex items-center gap-2.5">
                        <ShoppingCart className="w-4 h-4 text-[var(--accent-primary)] shrink-0" />
                        <div>
                          <div className="text-xs font-bold">{order.poNo || 'PO'} • {order.customerName || 'Customer'}</div>
                          <div className="text-[10px] text-slate-400 font-mono">{(order.lines || []).length} line items • ₹{(order.grossAmount || 0).toLocaleString()} • {order.status}</div>
                        </div>
                      </div>
                      <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                    </div>
                  ))}
                </div>
              )}

              {/* Matching Stock Items */}
              {matchingStock.length > 0 && (
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-2.5 py-1">Inventory / Parts</div>
                  {matchingStock.map(item => (
                    <div 
                      key={item.code}
                      onClick={() => handleSearchResultClick('stock', item.code)}
                      className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800/80 cursor-pointer flex items-center justify-between transition-colors"
                    >
                      <div className="flex items-center gap-2.5">
                        <Package className="w-4 h-4 text-emerald-500 shrink-0" />
                        <div>
                          <div className="text-xs font-bold">{item.code} • {item.description}</div>
                          <div className="text-[10px] text-slate-400 font-mono">Available: {item.available ?? item.onHand ?? 0} {item.unit || 'PCS'} • Status: {item.status}</div>
                        </div>
                      </div>
                      <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                    </div>
                  ))}
                </div>
              )}

              {/* Matching Invoices */}
              {matchingInvoices.length > 0 && (
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-2.5 py-1">Invoices</div>
                  {matchingInvoices.map(inv => (
                    <div 
                      key={inv.invoiceNo}
                      onClick={() => handleSearchResultClick('invoice', inv.invoiceNo)}
                      className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800/80 cursor-pointer flex items-center justify-between transition-colors"
                    >
                      <div className="flex items-center gap-2.5">
                        <FileText className="w-4 h-4 text-[var(--accent-primary)] shrink-0" />
                        <div>
                          <div className="text-xs font-bold">{inv.invoiceNo} • {inv.customerName}</div>
                          <div className="text-[10px] text-slate-400 font-mono">PO: {inv.orderPo} • Status: {inv.status} • Due: {inv.dueDate || 'Immediate'}</div>
                        </div>
                      </div>
                      <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                    </div>
                  ))}
                </div>
              )}

              {/* Matching Job Cards */}
              {matchingJobs.length > 0 && (
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-2.5 py-1">Shopfloor Jobs</div>
                  {matchingJobs.map(job => (
                    <div 
                      key={job.jobNo}
                      onClick={() => handleSearchResultClick('job', job.jobNo)}
                      className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800/80 cursor-pointer flex items-center justify-between transition-colors"
                    >
                      <div className="flex items-center gap-2.5">
                        <Wrench className="w-4 h-4 text-amber-500 shrink-0" />
                        <div>
                          <div className="text-xs font-bold">{job.jobNo} • {job.partCode || job.partDescription}</div>
                          <div className="text-[10px] text-slate-400 font-mono">Machine: {job.machine || 'CNC'} • Stage: {job.status} • Qty: {job.qty}</div>
                        </div>
                      </div>
                      <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                    </div>
                  ))}
                </div>
              )}

              {totalResultsCount === 0 && (
                <div className="py-6 text-center text-xs text-slate-400">
                  No matching orders, items, invoices or jobs found for "{searchQuery}".
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
        
        {/* Mobile Search Toggle Button */}
        <button
          type="button"
          onClick={() => setIsMobileSearchOpen(!isMobileSearchOpen)}
          aria-label="Toggle Quick Search"
          className={`p-2 rounded-xl border lg:hidden cursor-pointer transition-colors ${
            isDarkMode ? 'border-slate-800 bg-[#1A1B1F] text-slate-300' : 'border-[#d8dde8] bg-white text-slate-700'
          }`}
        >
          <Search className="w-4 h-4" />
        </button>

        {/* Scope Selector (Desktop Only) */}
        <div className="relative hidden lg:block" ref={scopeDropdownRef}>
          <button
            type="button"
            onClick={() => setShowScopeDropdown(!showScopeDropdown)}
            className="flex items-center gap-1.5 bg-white dark:bg-slate-900 border border-[#d8dde8] dark:border-slate-800 rounded-xl px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 shadow-2xs hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer transition-all"
            title="Select Fiscal Scope"
          >
            <span className="text-slate-400 hidden sm:inline">Scope:</span>
            <span>{scope}</span>
            <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${showScopeDropdown ? 'rotate-180 text-[var(--accent-primary)]' : ''}`} />
          </button>

          {showScopeDropdown && (
            <div className="absolute right-0 mt-2 w-36 bg-white dark:bg-slate-900 border border-[#d8dde8] dark:border-slate-800 rounded-xl shadow-xl z-50 p-1 font-sans text-xs">
              {scopeOptions.map((sc) => (
                <button
                  key={sc}
                  type="button"
                  onClick={() => {
                    if (setScope) setScope(sc);
                    setShowScopeDropdown(false);
                  }}
                  className={`w-full text-left px-3 py-1.5 rounded-lg cursor-pointer transition-colors ${
                    scope === sc 
                      ? 'bg-[var(--accent-primary)] text-white font-bold' 
                      : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  {sc}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Customize & Appearance Menu (Header Popover) */}
        <div className="relative" ref={customizeDropdownRef}>
          <button 
            type="button"
            onClick={() => setShowCustomizeMenu(prev => !prev)}
            className={`flex items-center gap-1.5 border rounded-xl px-2 sm:px-3 py-1.5 text-xs font-semibold shadow-2xs transition-all cursor-pointer ${
              showCustomizeMenu
                ? 'bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white'
                : 'bg-white dark:bg-slate-900 border-[#d8dde8] dark:border-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800'
            }`}
            title="Appearance & Dashboard Customization"
          >
            <Palette className="w-3.5 h-3.5 text-slate-500" />
            <span className="hidden md:inline">Theme</span>
            <ChevronDown className={`w-3 h-3 text-slate-400 transition-transform ${showCustomizeMenu ? 'rotate-180' : ''}`} />
          </button>

          {showCustomizeMenu && (
            <div className={`absolute right-0 top-full mt-2 w-72 p-4 rounded-2xl border shadow-xl z-50 space-y-4 font-sans animate-fade-in ${
              isDarkMode 
                ? 'bg-slate-900/95 border-slate-800/90 text-white backdrop-blur-xl shadow-black/40' 
                : 'bg-white border-slate-200 text-slate-900 shadow-xl'
            }`}>
              {/* Accent Color Section */}
              <AccentColorSelector isDarkMode={isDarkMode} />

              {/* Dashboard Layout Action */}
              {onOpenCustomize && (
                <div className="pt-3 border-t border-slate-200 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => {
                      setShowCustomizeMenu(false);
                      onOpenCustomize();
                    }}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium border transition-colors cursor-pointer ${
                      isDarkMode 
                        ? 'bg-slate-950/60 border-slate-800 text-slate-300 hover:bg-slate-800 hover:text-white' 
                        : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100 hover:text-slate-900'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <SlidersHorizontal className="w-3.5 h-3.5 text-slate-400" />
                      <span>Configure Widgets</span>
                    </div>
                    <ArrowRight className="w-3 h-3 text-slate-400" />
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Sync Now Pill */}
        <button
          type="button"
          onClick={handleSyncClick}
          disabled={isSyncing}
          title="Refresh & Synchronize all system data"
          className={`bg-[var(--accent-soft-light)] dark:bg-[var(--accent-soft-dark)] hover:opacity-90 border border-[var(--accent-border-light)] dark:border-[var(--accent-border-dark)] text-[var(--accent-text-light)] dark:text-[var(--accent-text-dark)] text-xs font-semibold px-2.5 sm:px-3 py-1.5 rounded-xl flex items-center gap-1.5 cursor-pointer transition-all shadow-2xs shrink-0 active:scale-95 ${
            isSyncing ? 'opacity-80 cursor-wait' : ''
          }`}
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin text-[var(--accent-primary)]' : ''}`} />
          <span className="hidden sm:inline">{isSyncing ? 'Syncing...' : 'Sync'}</span>
        </button>

        {/* Sync Status Label (Desktop Extra Wide Only) */}
        <div className="hidden 2xl:flex items-center gap-1.5 text-xs text-slate-500 font-medium shrink-0">
          <span>Last synced: {lastSynced}</span>
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
        </div>

        {/* Theme Switch Toggle */}
        <button
          type="button"
          onClick={() => setIsDarkMode(!isDarkMode)}
          className={`relative w-12 sm:w-14 h-7 sm:h-8 rounded-full p-0.5 sm:p-1 border transition-colors duration-300 flex items-center cursor-pointer shadow-2xs select-none shrink-0 ${
            isDarkMode 
              ? 'bg-slate-900 border-slate-700 text-slate-200' 
              : 'bg-white border-[#d8dde8] text-slate-700'
          }`}
          title={isDarkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
        >
          <motion.div
            layout
            transition={{ type: "spring", stiffness: 500, damping: 30 }}
            className={`w-5 sm:w-6 h-5 sm:h-6 rounded-full flex items-center justify-center shadow-xs z-10 ${
              isDarkMode 
                ? 'bg-indigo-600 text-white ml-auto' 
                : 'bg-[var(--accent-primary)] text-white mr-auto'
            }`}
          >
            {isDarkMode ? (
              <Moon className="w-3 sm:w-3.5 h-3 sm:h-3.5" />
            ) : (
              <Sun className="w-3 sm:w-3.5 h-3 sm:h-3.5" />
            )}
          </motion.div>
          
          <div className="absolute inset-0 px-1.5 sm:px-2 flex items-center justify-between pointer-events-none text-slate-400">
            <Sun className={`w-3 sm:w-3.5 h-3 sm:h-3.5 transition-opacity ${!isDarkMode ? 'opacity-0' : 'opacity-50'}`} />
            <Moon className={`w-3 sm:w-3.5 h-3 sm:h-3.5 transition-opacity ${isDarkMode ? 'opacity-0' : 'opacity-50'}`} />
          </div>
        </button>

      </div>

      {/* Mobile Search Overlay Input Panel */}
      {isMobileSearchOpen && (
        <div className={`absolute top-full left-0 right-0 p-3 border-b shadow-lg z-40 lg:hidden flex flex-col gap-2 font-sans ${
          isDarkMode ? 'bg-[#16171B] border-[#262832]' : 'bg-white border-[#d8dde8]'
        }`}>
          <div className="relative flex items-center">
            <Search className="w-4 h-4 text-slate-400 absolute left-3" />
            <input
              ref={mobileSearchInputRef}
              autoFocus
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search orders, parts, invoices, jobs..."
              className="w-full bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl pl-9 pr-8 py-2 text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[var(--accent-ring)]"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2 p-1 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {searchQuery.trim() !== '' && (
            <div className="max-h-60 overflow-y-auto space-y-2 pt-1">
              {matchingOrders.map(order => (
                <div 
                  key={order.id}
                  onClick={() => handleSearchResultClick('order', order.id)}
                  className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800/60 flex items-center justify-between text-xs cursor-pointer"
                >
                  <div className="truncate font-semibold">{order.poNo || 'PO'} • {order.customerName}</div>
                  <ArrowRight className="w-3.5 h-3.5 text-slate-400 shrink-0 ml-2" />
                </div>
              ))}
              {matchingStock.map(item => (
                <div 
                  key={item.code}
                  onClick={() => handleSearchResultClick('stock', item.code)}
                  className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800/60 flex items-center justify-between text-xs cursor-pointer"
                >
                  <div className="truncate font-semibold">{item.code} • {item.description}</div>
                  <ArrowRight className="w-3.5 h-3.5 text-slate-400 shrink-0 ml-2" />
                </div>
              ))}
              {totalResultsCount === 0 && (
                <div className="py-3 text-center text-xs text-slate-400">
                  No matching results.
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </header>
  );
};

export default ConsoleHeader;
