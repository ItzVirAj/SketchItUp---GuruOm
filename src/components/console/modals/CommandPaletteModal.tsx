import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Search,
  ShoppingCart,
  Wrench,
  Package,
  FileText,
  Truck,
  ArrowRight,
  Command,
  CornerDownLeft,
  X,
  Building2,
  SlidersHorizontal,
  ChevronRight,
  ShieldAlert,
  Clock,
  Sparkles,
  Layers,
  LayoutGrid,
  CheckCircle2,
  AlertCircle,
  FileCheck,
  Receipt,
  Boxes,
  ShieldCheck,
  Calendar,
  IndianRupee,
  Hash,
  ArrowUpRight,
  User,
  MapPin,
  Flame,
  Activity,
  Maximize2
} from 'lucide-react';
import {
  CustomerOrder,
  JobCard,
  StockItem,
  CustomerInvoice,
  DispatchChallan,
  MasterItem,
  ConsoleView
} from '../../../types/console';

export type SearchCategory = 'ALL' | 'ORDERS' | 'JOB_CARDS' | 'INVENTORY' | 'INVOICES' | 'DISPATCH' | 'NAVIGATION';

interface CommandPaletteModalProps {
  isOpen: boolean;
  onClose: () => void;
  orders?: CustomerOrder[];
  jobCards?: JobCard[];
  stock?: StockItem[];
  masters?: MasterItem[];
  invoices?: CustomerInvoice[];
  dispatches?: DispatchChallan[];
  onNavigate: (view: ConsoleView) => void;
  onSelectOrder?: (orderId: string) => void;
  isDarkMode?: boolean;
}

interface IndexedItem {
  id: string;
  category: SearchCategory;
  categoryLabel: string;
  title: string;
  subtitle: string;
  meta?: string;
  badge?: string;
  badgeType?: 'default' | 'success' | 'warning' | 'info' | 'purple' | 'rose';
  icon: React.ComponentType<{ className?: string }>;
  iconBg: string;
  iconColor: string;
  searchKey: string;
  onSelect: () => void;
}

interface DisplayItem extends IndexedItem {
  flatIndex: number;
}

const CATEGORIES: { key: SearchCategory; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { key: 'ALL', label: 'All Operations', icon: Sparkles },
  { key: 'ORDERS', label: 'Orders (PO)', icon: ShoppingCart },
  { key: 'JOB_CARDS', label: 'Job Cards', icon: Wrench },
  { key: 'INVENTORY', label: 'Inventory', icon: Package },
  { key: 'INVOICES', label: 'Invoices', icon: Receipt },
  { key: 'DISPATCH', label: 'Dispatch', icon: Truck },
  { key: 'NAVIGATION', label: 'Modules', icon: LayoutGrid },
];

export const CommandPaletteModal: React.FC<CommandPaletteModalProps> = ({
  isOpen,
  onClose,
  orders = [],
  jobCards = [],
  stock = [],
  masters = [],
  invoices = [],
  dispatches = [],
  onNavigate,
  onSelectOrder,
  isDarkMode = true,
}) => {
  const [query, setQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<SearchCategory>('ALL');
  const [selectedIndex, setSelectedIndex] = useState(0);

  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const tabsContainerRef = useRef<HTMLDivElement>(null);

  // Focus input on open
  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setActiveCategory('ALL');
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [isOpen]);

  // Horizontal mouse-wheel scroll when hovering over the tab bar
  useEffect(() => {
    const el = tabsContainerRef.current;
    if (!el || !isOpen) return;

    const handleWheel = (e: WheelEvent) => {
      if (e.deltaY !== 0) {
        e.preventDefault();
        el.scrollLeft += e.deltaY;
      }
    };

    el.addEventListener('wheel', handleWheel, { passive: false });
    return () => el.removeEventListener('wheel', handleWheel);
  }, [isOpen]);

  // Global keybinds (Ctrl+K / Cmd+K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        if (isOpen) onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Pre-index master dataset matching GuruOm styling tokens
  const masterDataset = useMemo<IndexedItem[]>(() => {
    const items: IndexedItem[] = [];

    // 1. Navigation Modules
    const navModules: { id: string; view: ConsoleView; title: string; subtitle: string; icon: any; color: string; bg: string }[] = [
      { id: 'nav-command-centre', view: 'command-centre', title: 'Command Centre Dashboard', subtitle: 'Live operations overview, machine KPIs & holds', icon: LayoutGrid, color: 'text-[#5B75F8] dark:text-[#7B92FF]', bg: 'bg-[#5B75F8]/10 border-[#5B75F8]/20' },
      { id: 'nav-orders', view: 'orders', title: 'Customer Orders & Sales Desk', subtitle: 'PO tracking, order confirmation & dispatch scheduling', icon: ShoppingCart, color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-500/10 border-blue-500/20' },
      { id: 'nav-production', view: 'production', title: 'Production Planning & Job Cards', subtitle: 'Machine scheduling, route cards & shop floor logs', icon: Wrench, color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-500/10 border-amber-500/20' },
      { id: 'nav-inventory', view: 'inventory', title: 'Inventory & Stock Ledger', subtitle: 'Raw material stock, hardware bins & Inward GRN registry', icon: Package, color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20' },
      { id: 'nav-finished-goods', view: 'finished-goods', title: 'Finished Goods Warehouse', subtitle: 'FG batch inspection, serial boxes & stock allocation', icon: Boxes, color: 'text-teal-600 dark:text-teal-400', bg: 'bg-teal-500/10 border-teal-500/20' },
      { id: 'nav-qc', view: 'qc', title: 'Quality Assurance & PDI Inspection', subtitle: 'Pre-dispatch inspections, QA approvals & rejection logs', icon: ShieldCheck, color: 'text-sky-600 dark:text-sky-400', bg: 'bg-sky-500/10 border-sky-500/20' },
      { id: 'nav-dispatch', view: 'dispatch', title: 'Logistics & Dispatch Challans', subtitle: 'Delivery Challans, transporter manifests & gate passes', icon: Truck, color: 'text-rose-600 dark:text-rose-400', bg: 'bg-rose-500/10 border-rose-500/20' },
      { id: 'nav-invoices', view: 'invoices', title: 'GST Tax Invoicing & Accounts', subtitle: 'Statutory GST Tax invoices, ledger reconciliation & payments', icon: Receipt, color: 'text-purple-600 dark:text-purple-400', bg: 'bg-purple-500/10 border-purple-500/20' },
      { id: 'nav-company-profile', view: 'company-profile', title: 'Company Profile & Tax Settings', subtitle: 'Master enterprise registration, GSTIN, PAN & plant address', icon: Building2, color: 'text-slate-600 dark:text-slate-400', bg: 'bg-slate-500/10 border-slate-500/20' },
      { id: 'nav-masters', view: 'masters', title: 'Master Catalog & Data Central', subtitle: 'Customer masters, vendor accounts, machines & user access', icon: Layers, color: 'text-slate-600 dark:text-slate-400', bg: 'bg-slate-500/10 border-slate-500/20' },
    ];

    navModules.forEach(mod => {
      items.push({
        id: mod.id,
        category: 'NAVIGATION',
        categoryLabel: 'Quick Navigation',
        title: mod.title,
        subtitle: mod.subtitle,
        badge: 'Module',
        badgeType: 'purple',
        icon: mod.icon,
        iconBg: mod.bg,
        iconColor: mod.color,
        searchKey: `${mod.title} ${mod.subtitle}`.toLowerCase(),
        onSelect: () => { onNavigate(mod.view); onClose(); }
      });
    });

    // 2. Customer Orders
    orders.forEach(order => {
      const lineParts = (order.lines || []).map(l => `${l.itemCode} ${l.itemDescription}`).join(' ');
      const totalQty = (order.lines || []).reduce((sum, l) => sum + (l.orderedQty || 0), 0);
      let badgeType: IndexedItem['badgeType'] = 'info';
      if (order.orderStatus === 'DELIVERED') badgeType = 'success';
      else if (order.orderStatus === 'IN_PRODUCTION') badgeType = 'warning';
      else if (order.orderStatus === 'ON_HOLD') badgeType = 'default';

      items.push({
        id: `order-${order.id || order.poNo}`,
        category: 'ORDERS',
        categoryLabel: 'Customer Orders',
        title: `PO #${order.poNo} • ${order.customerName}`,
        subtitle: `${(order.lines || []).length} lines (${totalQty.toLocaleString('en-IN')} pcs) • Due: ${order.deliveryDate || 'N/A'}${order.lines?.[0] ? ` • Part: ${order.lines[0].itemCode}` : ''}`,
        meta: `₹${(order.totalAmount || 0).toLocaleString('en-IN')}`,
        badge: order.orderStatus || 'CONFIRMED',
        badgeType,
        icon: ShoppingCart,
        iconBg: 'bg-blue-500/10 border-blue-500/20',
        iconColor: 'text-blue-600 dark:text-blue-400',
        searchKey: `${order.poNo} ${order.customerName} ${order.orderStatus} ${lineParts}`.toLowerCase(),
        onSelect: () => {
          if (order.id && onSelectOrder) onSelectOrder(order.id);
          else onNavigate('orders');
          onClose();
        }
      });
    });

    // 3. Job Cards
    jobCards.forEach(job => {
      let badgeType: IndexedItem['badgeType'] = 'warning';
      if (job.status === 'COMPLETED' || job.currentStage === 'COMPLETED') badgeType = 'success';
      else if (job.currentStage === 'FINAL_INSPECTION') badgeType = 'info';

      items.push({
        id: `job-${job.id || job.jobNo}`,
        category: 'JOB_CARDS',
        categoryLabel: 'Job Cards & Production',
        title: `Job #${job.jobNo} • ${job.partCode}`,
        subtitle: `${job.partDescription || 'Component'} • Qty: ${(job.targetQty || 0).toLocaleString('en-IN')} pcs • PO Ref: #${job.orderPo}`,
        meta: job.currentStage?.replace(/_/g, ' ') || 'In Production',
        badge: job.currentStage || job.status || 'IN_PROGRESS',
        badgeType,
        icon: Wrench,
        iconBg: 'bg-amber-500/10 border-amber-500/20',
        iconColor: 'text-amber-600 dark:text-amber-400',
        searchKey: `${job.jobNo} ${job.orderPo} ${job.partCode} ${job.partDescription} ${job.currentStage} ${job.status}`.toLowerCase(),
        onSelect: () => { onNavigate('production'); onClose(); }
      });
    });

    // 4. Inventory Masters & Stock
    const combinedItems = new Map<string, any>();
    masters.forEach(m => combinedItems.set(m.code, { ...m, isMaster: true }));
    stock.forEach(s => {
      const existing = combinedItems.get(s.code);
      combinedItems.set(s.code, { ...existing, ...s });
    });

    Array.from(combinedItems.values()).forEach(item => {
      const isLow = (item.currentStock || 0) <= (item.reorderLevel || 0);
      items.push({
        id: `inv-${item.code}`,
        category: 'INVENTORY',
        categoryLabel: 'Inventory & Items',
        title: `${item.code} • ${item.name || item.description || 'Item Master'}`,
        subtitle: `${item.itemType || item.category || 'Inventory Item'} • Unit: ${item.unit || 'PCS'}${item.partNo ? ` • Part #: ${item.partNo}` : ''}`,
        meta: `Stock: ${item.currentStock ?? '0'} ${item.unit || 'PCS'}`,
        badge: isLow ? 'Low Stock' : 'In Stock',
        badgeType: isLow ? 'warning' : 'success',
        icon: Package,
        iconBg: 'bg-emerald-500/10 border-emerald-500/20',
        iconColor: 'text-emerald-600 dark:text-emerald-400',
        searchKey: `${item.code} ${item.name || item.description} ${item.partNo || ''} ${item.category || ''} ${item.itemType || ''}`.toLowerCase(),
        onSelect: () => { onNavigate('inventory'); onClose(); }
      });
    });

    // 5. Invoices
    invoices.forEach(inv => {
      items.push({
        id: `inv-${inv.id || inv.invoiceNo}`,
        category: 'INVOICES',
        categoryLabel: 'GST Tax Invoices',
        title: `Invoice #${inv.invoiceNo} • ${inv.customerName}`,
        subtitle: `PO Ref: #${inv.orderPo} • Date: ${inv.invoiceDate || 'N/A'} • GST: ${inv.customerGstin || 'Registered'}`,
        meta: `₹${(inv.grandTotal || 0).toLocaleString('en-IN')}`,
        badge: inv.status === 'PAID' ? 'PAID' : 'PENDING',
        badgeType: inv.status === 'PAID' ? 'success' : 'warning',
        icon: Receipt,
        iconBg: 'bg-purple-500/10 border-purple-500/20',
        iconColor: 'text-purple-600 dark:text-purple-400',
        searchKey: `${inv.invoiceNo} ${inv.customerName} ${inv.orderPo} ${inv.status || ''}`.toLowerCase(),
        onSelect: () => { onNavigate('invoices'); onClose(); }
      });
    });

    // 6. Dispatches
    dispatches.forEach(disp => {
      items.push({
        id: `disp-${disp.id || disp.challanNo}`,
        category: 'DISPATCH',
        categoryLabel: 'Dispatch & Logistics',
        title: `Challan #${disp.challanNo} • ${disp.customerName}`,
        subtitle: `Order: #${disp.orderPo}${disp.transporter ? ` • Transporter: ${disp.transporter}` : ''}${disp.vehicleNo ? ` (${disp.vehicleNo})` : ''}`,
        meta: `${(disp.lines || []).length} items`,
        badge: disp.status || 'ISSUED',
        badgeType: 'rose',
        icon: Truck,
        iconBg: 'bg-rose-500/10 border-rose-500/20',
        iconColor: 'text-rose-600 dark:text-rose-400',
        searchKey: `${disp.challanNo} ${disp.customerName} ${disp.orderPo} ${disp.transporter || ''} ${disp.vehicleNo || ''}`.toLowerCase(),
        onSelect: () => { onNavigate('dispatch'); onClose(); }
      });
    });

    return items;
  }, [orders, jobCards, stock, masters, invoices, dispatches, onNavigate, onSelectOrder, onClose]);

  // Filtering & Grouping
  const { filteredResults, groupedResults } = useMemo(() => {
    const q = query.trim().toLowerCase();
    const matches: DisplayItem[] = [];
    const maxItems = 40;

    let count = 0;
    for (let i = 0; i < masterDataset.length; i++) {
      const item = masterDataset[i];

      if (activeCategory !== 'ALL' && item.category !== activeCategory) {
        continue;
      }

      if (q && !item.searchKey.includes(q)) {
        continue;
      }

      matches.push({ ...item, flatIndex: count });
      count++;
      if (count >= maxItems) break;
    }

    const groupMap = new Map<string, DisplayItem[]>();
    for (let i = 0; i < matches.length; i++) {
      const item = matches[i];
      const label = item.categoryLabel;
      if (!groupMap.has(label)) {
        groupMap.set(label, []);
      }
      groupMap.get(label)!.push(item);
    }

    const groups: { categoryLabel: string; items: DisplayItem[] }[] = [];
    groupMap.forEach((items, categoryLabel) => {
      groups.push({ categoryLabel, items });
    });

    return { filteredResults: matches, groupedResults: groups };
  }, [masterDataset, query, activeCategory]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query, activeCategory]);

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => (prev < filteredResults.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => (prev > 0 ? prev - 1 : filteredResults.length - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredResults[selectedIndex]) {
        filteredResults[selectedIndex].onSelect();
      }
    } else if (e.key === 'Tab') {
      e.preventDefault();
      const currentIndex = CATEGORIES.findIndex(c => c.key === activeCategory);
      const nextIndex = e.shiftKey
        ? (currentIndex > 0 ? currentIndex - 1 : CATEGORIES.length - 1)
        : (currentIndex < CATEGORIES.length - 1 ? currentIndex + 1 : 0);
      setActiveCategory(CATEGORIES[nextIndex].key);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
  };

  useEffect(() => {
    if (listRef.current) {
      const activeEl = listRef.current.querySelector(`[data-index="${selectedIndex}"]`) as HTMLElement | null;
      if (activeEl) {
        activeEl.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [selectedIndex]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center pt-10 sm:pt-16 px-4 font-sans select-none animate-in fade-in duration-150">

      {/* Dim Backdrop */}
      <div
        onClick={onClose}
        className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs transition-opacity"
      />

      {/* Main Command Modal Card - Matching GuruOm OS Modal Standard */}
      <div
        className={`relative w-full max-w-3xl rounded-2xl border shadow-2xl overflow-hidden flex flex-col max-h-[85vh] transition-ui ${isDarkMode
          ? 'bg-[#18181B] border-[#2E2E34] text-slate-200'
          : 'bg-white border-[#d8dde8] text-slate-900'
          }`}
      >
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-[#d8dde8] dark:border-[#2E2E34] flex items-center justify-between gap-4 bg-slate-50/40 dark:bg-[#18181B]">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-[#5B75F8]/10 text-[#5B75F8] dark:text-[#7B92FF] border border-[#5B75F8]/20">
              <Search className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                Universal Spotlight Search
                <span className="text-[10px] font-bold font-mono px-2 py-0.5 rounded-full bg-[#5B75F8]/10 text-[#5B75F8] dark:text-[#7B92FF] border border-[#5B75F8]/20">
                  CTRL + K
                </span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Instant search across purchase orders, job cards, inventory, invoices & modules
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Search Input Bar */}
        <div className="px-6 py-3 border-b border-[#d8dde8] dark:border-[#2E2E34] bg-white dark:bg-[#09090B]">
          <div className="relative flex items-center">
            <Search className="absolute left-3.5 h-4 w-4 text-slate-400 pointer-events-none" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Search PO #, Job Card #, Part Code, Customer Name, or Module..."
              className="w-full h-11 pl-10 pr-10 rounded-xl border border-slate-200 dark:border-[#2E2E34] bg-slate-50/80 dark:bg-[#18181B] text-sm font-medium text-slate-900 dark:text-white outline-none focus:border-[#5B75F8] focus:ring-2 focus:ring-[#5B75F8]/20 transition-ui placeholder:text-slate-400"
            />
            {query && (
              <button
                type="button"
                onClick={() => { setQuery(''); inputRef.current?.focus(); }}
                className="absolute right-3 p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                title="Clear search"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Tab Navigation (Exact GuruOm Tab Language) */}
        <div
          ref={tabsContainerRef}
          className="px-6 border-b border-[#d8dde8] dark:border-[#2E2E34] flex items-center gap-2 pt-2 bg-slate-50/50 dark:bg-[#09090B] overflow-x-auto no-scrollbar scroll-smooth"
        >
          {CATEGORIES.map((cat) => {
            const isActive = activeCategory === cat.key;
            const CatIcon = cat.icon;
            return (
              <button
                key={cat.key}
                type="button"
                onClick={() => { setActiveCategory(cat.key); inputRef.current?.focus(); }}
                className={`pb-2.5 px-3 text-xs font-bold border-b-2 flex items-center gap-1.5 transition-ui cursor-pointer shrink-0 ${isActive
                  ? 'border-[#5B75F8] text-[#5B75F8] dark:text-[#7B92FF]'
                  : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
                  }`}
              >
                <CatIcon className="w-3.5 h-3.5" />
                <span>{cat.label}</span>
              </button>
            );
          })}
        </div>

        {/* Results List */}
        <div ref={listRef} className="flex-1 overflow-y-auto p-4 space-y-4 no-scrollbar max-h-[420px]">
          {filteredResults.length === 0 ? (
            <div className="py-14 text-center space-y-2">
              <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex items-center justify-center mx-auto text-slate-400">
                <Search className="w-5 h-5" />
              </div>
              <p className="text-sm font-bold text-slate-800 dark:text-slate-200">No matching records found for "{query}"</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
                Check for typos or try searching with Customer PO number, Job Card ID, or component code.
              </p>
            </div>
          ) : (
            groupedResults.map((group) => (
              <div key={group.categoryLabel} className="space-y-2">
                <div className="flex items-center justify-between px-2 text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                  <span>{group.categoryLabel}</span>
                  <span className="font-mono text-[10px] px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-800 text-slate-500">
                    {group.items.length}
                  </span>
                </div>

                <div className="space-y-1.5">
                  {group.items.map((item) => {
                    const isSelected = item.flatIndex === selectedIndex;
                    const Icon = item.icon;

                    return (
                      <div
                        key={item.id}
                        data-index={item.flatIndex}
                        onClick={item.onSelect}
                        className={`group relative flex items-center justify-between p-3 rounded-xl cursor-pointer transition-ui border ${isSelected
                          ? 'bg-[#5B75F8]/10 border-[#5B75F8]/40 dark:bg-[#5B75F8]/15 text-slate-900 dark:text-white shadow-xs'
                          : 'border-slate-100 dark:border-[#2E2E34]/60 hover:bg-slate-50 dark:hover:bg-slate-800/50 text-slate-800 dark:text-slate-200'
                          }`}
                      >
                        {isSelected && (
                          <span className="absolute left-0 top-2.5 bottom-2.5 w-1 rounded-r-full bg-[#5B75F8]" />
                        )}

                        <div className="flex items-center gap-3.5 min-w-0 flex-1 pl-1">
                          <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border ${item.iconBg} ${item.iconColor}`}>
                            <Icon className="w-4 h-4" />
                          </div>

                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold truncate">
                                {item.title}
                              </span>

                              {item.badge && (
                                <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider shrink-0 border ${item.badgeType === 'success'
                                  ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                                  : item.badgeType === 'warning'
                                    ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20'
                                    : item.badgeType === 'rose'
                                      ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20'
                                      : item.badgeType === 'purple'
                                        ? 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20'
                                        : 'bg-[#5B75F8]/10 text-[#5B75F8] dark:text-[#7B92FF] border-[#5B75F8]/20'
                                  }`}>
                                  {item.badge}
                                </span>
                              )}
                            </div>

                            <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                              {item.subtitle}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 shrink-0 ml-3">
                          {item.meta && (
                            <span className="text-xs font-mono font-bold text-slate-600 dark:text-slate-300 hidden sm:inline">
                              {item.meta}
                            </span>
                          )}
                          <div className={`p-1.5 rounded-lg border transition-ui ${isSelected
                            ? 'bg-[#5B75F8] border-transparent text-white shadow-xs'
                            : 'opacity-0 group-hover:opacity-100 border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-slate-500'
                            }`}>
                            <CornerDownLeft className="w-3.5 h-3.5" />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Modal Footer Status Bar */}
        <div className="px-6 py-3 border-t border-[#d8dde8] dark:border-[#2E2E34] bg-slate-50/60 dark:bg-[#09090B] flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 shrink-0">
          <div className="flex items-center gap-3 sm:gap-4">
            <span className="flex items-center gap-1.5">
              <kbd className="px-1.5 py-0.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-[10px] font-mono font-bold text-slate-700 dark:text-slate-300">↑↓</kbd>
              <span className="hidden sm:inline">Navigate</span>
            </span>
            <span className="flex items-center gap-1.5">
              <kbd className="px-1.5 py-0.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-[10px] font-mono font-bold text-slate-700 dark:text-slate-300">↵</kbd>
              <span className="hidden sm:inline">Open</span>
            </span>
            <span className="flex items-center gap-1.5">
              <kbd className="px-1.5 py-0.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-[10px] font-mono font-bold text-slate-700 dark:text-slate-300">Tab</kbd>
              <span className="hidden sm:inline">Filter</span>
            </span>
            <span className="flex items-center gap-1.5 hidden sm:flex">
              <kbd className="px-1.5 py-0.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-[10px] font-mono font-bold text-slate-700 dark:text-slate-300">ESC</kbd>
              <span>Close</span>
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[11px] font-mono font-bold text-slate-500">
              {filteredResults.length} records
            </span>
            <span className="hidden sm:inline text-slate-300 dark:text-slate-700">•</span>
            <span className="text-[11px] font-bold text-[#5B75F8] dark:text-[#7B92FF] hidden sm:inline">
              GuruOm OS Spotlight
            </span>
          </div>
        </div>

      </div>
    </div>
  );
};

export default CommandPaletteModal;
