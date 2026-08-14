import React, { useState, useEffect } from 'react';
import { 
  BarChart3, 
  Hash, 
  AlertTriangle, 
  Check, 
  Clock, 
  DollarSign, 
  ShoppingCart, 
  Factory, 
  ShieldCheck, 
  Truck, 
  SlidersHorizontal,
  ChevronDown,
  ChevronRight,
  Cpu,
  RefreshCw,
  X,
  Eye,
  EyeOff,
  Radio,
  RotateCcw,
  Activity,
  Layers,
  ArrowRight,
  Search,
  Filter,
  TrendingUp,
  TrendingDown,
  Box,
  Package,
  UserCheck,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Calendar,
  Layers3,
  PieChart,
  Download
} from 'lucide-react';
import { 
  CustomerOrder, 
  StockItem, 
  QCInspection, 
  JobCard, 
  DispatchChallan,
  CustomerInvoice,
  VendorBill,
  ProductionLogReport,
  AuditLogEntry
} from '../../../types/console';
import { AgentBentoGrid } from '../AgentBentoGrid';

interface CommandCentreViewProps {
  orders?: CustomerOrder[];
  stock?: StockItem[];
  qcItems?: QCInspection[];
  jobCards?: JobCard[];
  shortages?: any[];
  dispatches?: DispatchChallan[];
  invoices?: CustomerInvoice[];
  payables?: VendorBill[];
  productionLogs?: ProductionLogReport[];
  pdiQueue?: any[];
  machines?: any[];
  users?: any[];
  auditLogs?: AuditLogEntry[];
  isDarkMode?: boolean;
  isRealtimeStreaming?: boolean;
  onToggleRealtimeStreaming?: () => void;
  onResetAllData?: () => void;
  onNavigateView?: (view: any) => void;
  onNavigate?: (view: any) => void;
  onSelectOrder?: (orderId: string) => void;
  showCustomizeModal?: boolean;
  setShowCustomizeModal?: (show: boolean) => void;
  scope?: string;
  setScope?: (scope: string) => void;
}

export const CommandCentreView: React.FC<CommandCentreViewProps> = ({
  orders = [],
  stock = [],
  qcItems = [],
  jobCards = [],
  dispatches = [],
  invoices = [],
  payables = [],
  productionLogs = [],
  pdiQueue = [],
  machines = [],
  users = [],
  auditLogs = [],
  isDarkMode = false,
  isRealtimeStreaming = true,
  onToggleRealtimeStreaming,
  onResetAllData,
  onNavigateView,
  onNavigate,
  onSelectOrder,
  showCustomizeModal: externalShowCustomizeModal,
  setShowCustomizeModal: externalSetShowCustomizeModal,
  scope: externalScope,
  setScope: externalSetScope
}) => {
  const [mode, setMode] = useState<'charts' | 'numbers'>('charts');
  const [tabularSearchQuery, setTabularSearchQuery] = useState<string>('');
  const [tabularCategoryFilter, setTabularCategoryFilter] = useState<string>('ALL');
  const [tabularDensity, setTabularDensity] = useState<'compact' | 'comfortable'>('comfortable');
  const [localScope, setLocalScope] = useState<string>('FY 26-27');
  const scope = externalScope ?? localScope;
  const setScope = externalSetScope ?? setLocalScope;

  const [localShowCustomizeModal, setLocalShowCustomizeModal] = useState<boolean>(false);
  const showCustomizeModal = externalShowCustomizeModal ?? localShowCustomizeModal;
  const setShowCustomizeModal = externalSetShowCustomizeModal ?? setLocalShowCustomizeModal;

  // Timeframe selector for charts
  const [topProductsTimeframe, setTopProductsTimeframe] = useState<string>('June');
  const [salesAnalyticsTimeframe, setSalesAnalyticsTimeframe] = useState<string>('June');

  // Search & Filter state for Recent Activities Table
  const [activitySearchQuery, setActivitySearchQuery] = useState<string>('');
  const [activityCategoryFilter, setActivityCategoryFilter] = useState<string>('ALL');

  const defaultVisibility = {
    showAlertsBar: true,
    showShortagesBanner: true,
    showAgentBentoGrid: true,
    showTopMetricsRow: true,
    showAnalyticsGrid: true,
    showRecentActivities: true,
    showThroughputChart: true,
    showQcCard: true,
    showMachineRuntimeCard: true,
    showOrderPipelineCard: true
  };

  // Customization Options State (Persisted in localStorage with auto-merge for new keys)
  const [widgetVisibility, setWidgetVisibility] = useState(() => {
    try {
      const saved = localStorage.getItem('stratum_cmd_widgets');
      if (!saved) return defaultVisibility;
      const parsed = JSON.parse(saved);
      return {
        ...defaultVisibility,
        ...parsed,
        showAgentBentoGrid: parsed.showAgentBentoGrid ?? true,
        showTopMetricsRow: parsed.showTopMetricsRow ?? true,
        showAnalyticsGrid: parsed.showAnalyticsGrid ?? true,
        showRecentActivities: parsed.showRecentActivities ?? true
      };
    } catch {
      return defaultVisibility;
    }
  });

  const [currencySymbol, setCurrencySymbol] = useState<string>(() => {
    try {
      return localStorage.getItem('stratum_currency') || '₹';
    } catch {
      return '₹';
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('stratum_cmd_widgets', JSON.stringify(widgetVisibility));
    } catch (e) {
      // ignore
    }
  }, [widgetVisibility]);

  useEffect(() => {
    try {
      localStorage.setItem('stratum_currency', currencySymbol);
    } catch (e) {
      // ignore
    }
  }, [currencySymbol]);

  const handleNavigate = (view: any) => {
    if (onNavigate) onNavigate(view);
    if (onNavigateView) onNavigateView(view);
  };

  const toggleWidget = (key: keyof typeof widgetVisibility) => {
    setWidgetVisibility(prev => ({ ...prev, [key]: !prev[key] }));
  };

  // =========================================================================
  // REALTIME LIVE DYNAMIC CALCULATIONS FILTERED BY ACTIVE SCOPE
  // =========================================================================
  const getScopeFilter = (dateString?: string) => {
    if (!dateString || scope === 'All-Time') return true;
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return true;
    
    if (scope === 'FY 26-27') {
      return date >= new Date('2026-04-01T00:00:00') && date <= new Date('2027-03-31T23:59:59');
    }
    if (scope === 'FY 25-26') {
      return date >= new Date('2025-04-01T00:00:00') && date <= new Date('2026-03-31T23:59:59');
    }
    if (scope === 'Q3 2026') {
      return date >= new Date('2026-10-01T00:00:00') && date <= new Date('2026-12-31T23:59:59');
    }
    return true;
  };

  // Scope-Filtered Collections
  const scopedOrders = orders.filter(o => getScopeFilter(o.orderDate || o.createdAt));
  const scopedInvoices = invoices.filter(i => getScopeFilter(i.invoiceDate || i.createdAt));
  const scopedJobCards = jobCards.filter(j => getScopeFilter(j.createdAt || j.targetDate));
  const scopedDispatches = dispatches.filter(d => getScopeFilter(d.dispatchDate || d.createdAt));

  const qcHoldCount = qcItems.filter(q => q.qcStatus === 'QC_HOLD' || q.jobStatus === 'QC_HOLD').length;
  
  const shortItemsList = stock.filter(s => s.status === 'SHORTAGE' || s.status === 'CRITICAL' || s.available < 0);
  const itemsShortCount = shortItemsList.length;

  const overdueDeliveriesCount = scopedOrders.filter(o => {
    if (o.status === 'CLOSED' || o.status === 'CANCELLED') return false;
    if (o.status === 'OVERDUE') return true;
    if (o.dueDate) {
      return new Date(o.dueDate) < new Date();
    }
    return false;
  }).length;

  const overdueInvoicesList = scopedInvoices.filter(i => i.status === 'OVERDUE');
  const overdueReceivablesSum = overdueInvoicesList.reduce((acc, i) => acc + (i.amount || 0), 0);

  const pendingDispatchesCount = scopedDispatches.filter(d => d.status === 'PENDING' || d.status === 'IN_TRANSIT').length;

  // Realtime Live Order & Revenue Metrics
  const openOrders = scopedOrders.filter(o => o.status !== 'CLOSED' && o.status !== 'CANCELLED');
  const totalOrdersNum = scopedOrders.length > 0 ? scopedOrders.length : (scope === 'FY 25-26' ? 940 : scope === 'Q3 2026' ? 380 : 1305);
  const activeOrdersNum = openOrders.length > 0 ? openOrders.length : (scope === 'FY 25-26' ? 760 : scope === 'Q3 2026' ? 310 : 1230);

  const realTotalRevenueSum = scopedOrders.reduce((acc, o) => acc + (o.grossAmount || 0), 0);
  const openOrderBookValue = openOrders.reduce((acc, o) => acc + (o.grossAmount || 0), 0);
  const totalSalesRevenueVal = realTotalRevenueSum > 0 ? realTotalRevenueSum : (openOrderBookValue > 0 ? openOrderBookValue : (scope === 'FY 25-26' ? 98000 : scope === 'Q3 2026' ? 42000 : 125000));

  // Realtime Order Status Breakdown
  const completedOrdersNum = scopedOrders.length > 0 ? scopedOrders.filter(o => o.status === 'CLOSED' || o.status === 'DISPATCHED').length : Math.round(totalOrdersNum * 0.78);
  const processingOrdersNum = scopedOrders.length > 0 ? scopedOrders.filter(o => o.status === 'IN_PRODUCTION' || o.status === 'CONFIRMED' || o.status === 'PARTIALLY_DISPATCHED').length : Math.round(totalOrdersNum * 0.15);
  const cancelledOrdersNum = scopedOrders.length > 0 ? scopedOrders.filter(o => o.status === 'CANCELLED').length : Math.round(totalOrdersNum * 0.05);
  const returnedOrdersNum = qcHoldCount > 0 ? qcHoldCount : Math.round(totalOrdersNum * 0.02);

  const completedPct = totalOrdersNum > 0 ? Math.round((completedOrdersNum / totalOrdersNum) * 100) : 78;
  const processingPct = totalOrdersNum > 0 ? Math.round((processingOrdersNum / totalOrdersNum) * 100) : 15;
  const cancelledPct = totalOrdersNum > 0 ? Math.round((cancelledOrdersNum / totalOrdersNum) * 100) : 5;
  const returnedPct = totalOrdersNum > 0 ? Math.round((returnedOrdersNum / totalOrdersNum) * 100) : 2;

  const inProdOrdersVal = scopedOrders.filter(o => o.status === 'IN_PRODUCTION' || o.status === 'CONFIRMED' || o.status === 'PARTIALLY_DISPATCHED').reduce((acc, o) => acc + (o.grossAmount || 0), 0);
  const processingRevenueVal = inProdOrdersVal > 0 ? inProdOrdersVal : 6900;

  const totalMonthlyPartsOutput = productionLogs.reduce((acc, p) => acc + (p.qtyDone || 0), 0);

  const passQcCount = qcItems.filter(q => q.qcStatus === 'PASS').length;
  const totalQcInspected = qcItems.length;
  const qcPassRate = totalQcInspected > 0 ? ((passQcCount / totalQcInspected) * 100).toFixed(1) : '98.5';

  const outstandingPayablesSum = payables.filter(p => p.status === 'UNPAID' || p.status === 'OVERDUE').reduce((acc, p) => acc + (p.amount || 0), 0);

  // Pipeline summary breakdown
  const confirmedOrdersVal = scopedOrders.filter(o => o.status === 'CONFIRMED').reduce((acc, o) => acc + (o.grossAmount || 0), 0);
  const partialDispOrdersVal = scopedOrders.filter(o => o.status === 'PARTIALLY_DISPATCHED').reduce((acc, o) => acc + (o.grossAmount || 0), 0);
  const dispOrdersVal = scopedOrders.filter(o => o.status === 'DISPATCHED').reduce((acc, o) => acc + (o.grossAmount || 0), 0);

  // Currency Formatter
  const fmt = (num: number) => {
    return `${currencySymbol}${num.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
  };

  // Realtime Top Selling Products aggregated from live stock & order line items
  const productSalesMap: Record<string, number> = {};
  orders.forEach(o => {
    if (o.partDescription) {
      productSalesMap[o.partDescription] = (productSalesMap[o.partDescription] || 0) + (o.orderedQty || 1);
    }
  });
  stock.forEach(s => {
    if (s.description && !productSalesMap[s.description]) {
      productSalesMap[s.description] = Math.round(s.onHand * 2.5);
    }
  });

  const dynamicTopProducts = Object.keys(productSalesMap).length >= 5 
    ? Object.entries(productSalesMap).slice(0, 5).map(([name, sales], idx) => ({
        name,
        sales: Math.min(1000, Math.max(200, sales * 15)),
        active: idx === 1
      }))
    : [
        { name: 'Flange Housing', sales: 340, active: false },
        { name: 'CNC Valve Body', sales: 880, active: true },
        { name: 'Precision Shaft', sales: 540, active: false },
        { name: 'Spur Gear', sales: 240, active: false },
        { name: 'Brass Bushing', sales: 540, active: false }
      ];

  // Activities log merged with realtime auditLogs and live fallback stream
  const formattedActivities = auditLogs.length > 0 ? auditLogs.map(log => ({
    time: log.when || 'Just now',
    activity: log.details || `${log.entity} status updated`,
    category: log.entity || 'System',
    user: log.user || 'Admin',
    status: log.details?.toLowerCase().includes('completed') || log.details?.toLowerCase().includes('pass') 
      ? 'Completed' 
      : log.details?.toLowerCase().includes('process') || log.details?.toLowerCase().includes('created') 
      ? 'Processing' 
      : log.details?.toLowerCase().includes('cancel') || log.details?.toLowerCase().includes('hold') 
      ? 'Cancelled' 
      : 'Completed'
  })) : [
    { time: '10 min ago', activity: 'Order #PO-2026-901 moved to Processing', category: 'Order', user: 'Admin', status: 'Processing' },
    { time: '35 min ago', activity: 'Order #PO-2026-880 has been Completed', category: 'Order', user: 'System', status: 'Completed' },
    { time: '1h ago', activity: '30 units of Flange Housing (SKU-FLG203) added to stock', category: 'Inventory', user: 'Warehouse Staff', status: 'Completed' },
    { time: '3h ago', activity: 'Order #PO-2026-872 was Cancelled', category: 'Order', user: 'Admin', status: 'Cancelled' }
  ];

  const filteredActivities = formattedActivities.filter(act => {
    const matchesSearch = act.activity.toLowerCase().includes(activitySearchQuery.toLowerCase()) ||
                          act.user.toLowerCase().includes(activitySearchQuery.toLowerCase()) ||
                          act.category.toLowerCase().includes(activitySearchQuery.toLowerCase());
    const matchesCategory = activityCategoryFilter === 'ALL' || act.category.toUpperCase() === activityCategoryFilter.toUpperCase();
    return matchesSearch && matchesCategory;
  });

  const allTabularMetrics = [
    {
      code: 'MTR-FIN-01',
      name: 'Open Order Book Value',
      category: 'FINANCIAL',
      valueStr: fmt(openOrderBookValue),
      status: openOrderBookValue > 0 ? 'HEALTHY' : 'NEUTRAL',
      statusBadge: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30',
      target: 'Target ₹5.0M',
      delta: '+14.2% MoM',
      deltaType: 'up',
      viewKey: 'orders',
      actionLabel: 'Open Orders'
    },
    {
      code: 'MTR-ORD-02',
      name: 'Active Customer Purchase Orders',
      category: 'PRODUCTION',
      valueStr: `${openOrders.length} POs`,
      status: openOrders.length > 0 ? 'ACTIVE' : 'IDLE',
      statusBadge: 'bg-teal-500/15 text-teal-600 dark:text-teal-400 border-teal-500/30',
      target: 'Scope: ' + scope,
      delta: `${openOrders.filter(o => o.status === 'IN_PRODUCTION').length} In Prod`,
      deltaType: 'neutral',
      viewKey: 'orders',
      actionLabel: 'View Orders'
    },
    {
      code: 'MTR-PRD-03',
      name: 'In-Progress Shopfloor Job Cards',
      category: 'PRODUCTION',
      valueStr: `${jobCards.filter(j => j.status === 'IN_PROGRESS').length} Active`,
      status: 'RUNNING',
      statusBadge: 'bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30',
      target: 'Capacity Target: 10',
      delta: `${jobCards.length} Total JC`,
      deltaType: 'neutral',
      viewKey: 'job-cards',
      actionLabel: 'Job Cards'
    },
    {
      code: 'MTR-QLT-04',
      name: 'QC Quality Pass Rate Index',
      category: 'QUALITY',
      valueStr: `${qcPassRate}%`,
      status: Number(qcPassRate) >= 95 ? 'OPTIMAL' : 'ATTENTION',
      statusBadge: Number(qcPassRate) >= 95 ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30' : 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30',
      target: 'Benchmark: 98.0%',
      delta: '+2.1% MoM',
      deltaType: 'up',
      viewKey: 'qc',
      actionLabel: 'View QC'
    },
    {
      code: 'MTR-QLT-05',
      name: 'QC Hold & Pending Queue',
      category: 'QUALITY',
      valueStr: `${qcHoldCount} Holds`,
      status: qcHoldCount > 0 ? 'HOLD' : 'CLEAR',
      statusBadge: qcHoldCount > 0 ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30' : 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30',
      target: 'Target: 0 Holds',
      delta: `${qcItems.length} In Queue`,
      deltaType: 'neutral',
      viewKey: 'qc',
      actionLabel: 'QC Queue'
    },
    {
      code: 'MTR-INV-06',
      name: 'Inventory Items in Shortage',
      category: 'INVENTORY',
      valueStr: `${itemsShortCount} SKUs`,
      status: itemsShortCount > 0 ? 'CRITICAL' : 'OPTIMAL',
      statusBadge: itemsShortCount > 0 ? 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30' : 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30',
      target: 'Threshold: 0 Short',
      delta: itemsShortCount > 0 ? 'Reorder Needed' : 'Stock Healthy',
      deltaType: itemsShortCount > 0 ? 'down' : 'up',
      viewKey: 'inventory',
      actionLabel: 'View Stock'
    },
    {
      code: 'MTR-INV-07',
      name: 'Total Stock Inventory SKUs',
      category: 'INVENTORY',
      valueStr: `${stock.length} SKUs`,
      status: 'ACTIVE',
      statusBadge: 'bg-teal-500/15 text-teal-600 dark:text-teal-400 border-teal-500/30',
      target: 'Target: 50 SKUs',
      delta: 'Live Sync',
      deltaType: 'neutral',
      viewKey: 'inventory',
      actionLabel: 'Stock Items'
    },
    {
      code: 'MTR-PRD-08',
      name: 'Monthly Output Parts Volume',
      category: 'PRODUCTION',
      valueStr: `${totalMonthlyPartsOutput} Units`,
      status: 'OPTIMAL',
      statusBadge: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30',
      target: 'Target: 250 Units',
      delta: '+23.4% MoM',
      deltaType: 'up',
      viewKey: 'reports',
      actionLabel: 'View Output'
    },
    {
      code: 'MTR-LGS-09',
      name: 'PDI Pre-Dispatch Inspections',
      category: 'LOGISTICS',
      valueStr: `${pdiQueue.filter((p: any) => p.pdiStatus === 'PENDING').length} Pending`,
      status: pdiQueue.filter((p: any) => p.pdiStatus === 'PENDING').length > 0 ? 'PENDING' : 'CLEAR',
      statusBadge: pdiQueue.filter((p: any) => p.pdiStatus === 'PENDING').length > 0 ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30' : 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30',
      target: 'Target: 0 Pending',
      delta: `${pdiQueue.length} Total`,
      deltaType: 'neutral',
      viewKey: 'pdi',
      actionLabel: 'PDI Queue'
    },
    {
      code: 'MTR-LGS-10',
      name: 'Issued Dispatch Delivery Challans',
      category: 'LOGISTICS',
      valueStr: `${dispatches.length} Challans`,
      status: 'DISPATCHED',
      statusBadge: 'bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border-indigo-500/30',
      target: 'Target: 20 Challans',
      delta: `${dispatches.filter(d => d.status === 'DELIVERED').length} Delivered`,
      deltaType: 'up',
      viewKey: 'dispatches',
      actionLabel: 'Dispatches'
    },
    {
      code: 'MTR-FIN-11',
      name: 'Total Invoiced Sales Revenue',
      category: 'FINANCIAL',
      valueStr: fmt(invoices.reduce((a, b) => a + (b.totalAmount || 0), 0)),
      status: 'BILLED',
      statusBadge: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30',
      target: 'Target ₹10M',
      delta: `${invoices.length} Invoices`,
      deltaType: 'up',
      viewKey: 'invoices',
      actionLabel: 'Invoices'
    },
    {
      code: 'MTR-FIN-12',
      name: 'Outstanding Accounts Receivable',
      category: 'FINANCIAL',
      valueStr: fmt(overdueReceivablesSum),
      status: overdueReceivablesSum > 0 ? 'DUE' : 'CLEAR',
      statusBadge: overdueReceivablesSum > 0 ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30' : 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30',
      target: 'Target: ₹0 Due',
      delta: `${overdueInvoicesList.length} Overdue`,
      deltaType: overdueReceivablesSum > 0 ? 'down' : 'up',
      viewKey: 'invoices',
      actionLabel: 'Receivables'
    },
    {
      code: 'MTR-FIN-13',
      name: 'Accounts Payable (Vendor Bills)',
      category: 'FINANCIAL',
      valueStr: fmt(payables.reduce((a, b) => a + (b.balanceAmount || 0), 0)),
      status: payables.some(p => p.status === 'OVERDUE') ? 'OVERDUE' : 'OK',
      statusBadge: payables.some(p => p.status === 'OVERDUE') ? 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30' : 'bg-teal-500/15 text-teal-600 dark:text-teal-400 border-teal-500/30',
      target: 'Credit Net 30',
      delta: `${payables.length} Bills`,
      deltaType: 'neutral',
      viewKey: 'payables',
      actionLabel: 'Payables'
    }
  ];

  const filteredTabularMetrics = allTabularMetrics.filter(m => {
    const q = tabularSearchQuery.toLowerCase();
    const matchesQuery = m.code.toLowerCase().includes(q) ||
                          m.name.toLowerCase().includes(q) ||
                          m.status.toLowerCase().includes(q) ||
                          m.target.toLowerCase().includes(q);
    const matchesCat = tabularCategoryFilter === 'ALL' || m.category === tabularCategoryFilter;
    return matchesQuery && matchesCat;
  });

  const handleExportTabularCSV = () => {
    const headers = ['Metric Code', 'Metric Name', 'Category', 'Current Telemetry Value', 'Status', 'Target/Benchmark', 'Period Delta'];
    const rows = filteredTabularMetrics.map(m => [
      m.code,
      `"${m.name.replace(/"/g, '""')}"`,
      m.category,
      `"${m.valueStr.replace(/"/g, '""')}"`,
      m.status,
      `"${m.target.replace(/"/g, '""')}"`,
      `"${m.delta.replace(/"/g, '""')}"`
    ]);
    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Command_Centre_Tabular_Metrics_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 font-sans">
      
      {/* CHARTS / VISUAL DASHBOARD MODE */}
      {mode === 'charts' ? (
        <>
          {/* Operational Alerts Bar (5 Cards Row) - Solid Colored Backgrounds */}
          {widgetVisibility.showAlertsBar && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                
                {/* QC Holds - Solid Amber Card */}
                <div 
                  onClick={() => handleNavigate('qc')}
                  className="bg-[#FFF8E7] dark:bg-[#38260B] border border-[#FCD34D] dark:border-[#B45309] p-3.5 rounded-2xl flex items-center justify-between cursor-pointer hover:border-amber-500 hover:shadow-xs transition-all"
                >
                  <div className="flex items-center gap-2">
                    <span className="bg-[#FDE68A] dark:bg-[#78350F] text-[#78350F] dark:text-[#FEF3C7] font-black px-2 py-0.5 rounded-md text-xs">
                      {qcHoldCount}
                    </span>
                    <span className="text-xs font-bold text-[#78350F] dark:text-[#FDE68A]">QC HOLDS</span>
                  </div>
                  <AlertTriangle className="w-4 h-4 text-[#D97706] dark:text-[#FBBF24] shrink-0" />
                </div>

                {/* Items Short - Solid Rose Card */}
                <div 
                  onClick={() => handleNavigate('inventory')}
                  className="bg-[#FFF1F2] dark:bg-[#45101C] border border-[#FDA4AF] dark:border-[#BE123C] p-3.5 rounded-2xl flex items-center justify-between cursor-pointer hover:border-rose-500 hover:shadow-xs transition-all"
                >
                  <div className="flex items-center gap-2">
                    <span className="bg-[#FECDD3] dark:bg-[#881337] text-[#881337] dark:text-[#FFE4E6] font-black px-2 py-0.5 rounded-md text-xs">
                      {itemsShortCount}
                    </span>
                    <span className="text-xs font-bold text-[#881337] dark:text-[#FECDD3]">ITEMS SHORT</span>
                  </div>
                  <AlertTriangle className="w-4 h-4 text-[#E11D48] dark:text-[#FB7185] shrink-0" />
                </div>

                {/* Overdue Deliveries - Solid Amber Card */}
                <div 
                  onClick={() => handleNavigate('orders')}
                  className="bg-[#FFF8E7] dark:bg-[#38260B] border border-[#FCD34D] dark:border-[#B45309] p-3.5 rounded-2xl flex items-center justify-between cursor-pointer hover:border-amber-500 hover:shadow-xs transition-all"
                >
                  <div className="flex items-center gap-2">
                    <span className="bg-[#FDE68A] dark:bg-[#78350F] text-[#78350F] dark:text-[#FEF3C7] font-black px-2 py-0.5 rounded-md text-xs">
                      {overdueDeliveriesCount}
                    </span>
                    <span className="text-xs font-bold text-[#78350F] dark:text-[#FDE68A]">OVERDUE DELIVERIES</span>
                  </div>
                  <Clock className="w-4 h-4 text-[#D97706] dark:text-[#FBBF24] shrink-0" />
                </div>

                {/* Overdue Receivables - Solid Emerald Card */}
                <div 
                  onClick={() => handleNavigate('invoices')}
                  className="bg-[#ECFDF5] dark:bg-[#0C3327] border border-[#6EE7B7] dark:border-[#059669] p-3.5 rounded-2xl flex items-center justify-between cursor-pointer hover:border-emerald-500 hover:shadow-xs transition-all"
                >
                  <div className="flex items-center gap-2 truncate">
                    <span className="bg-[#A7F3D0] dark:bg-[#064E3B] text-[#064E3B] dark:text-[#D1FAE5] font-black px-1.5 py-0.5 rounded-md text-[10px] truncate max-w-[75px]">
                      {fmt(overdueReceivablesSum)}
                    </span>
                    <span className="text-xs font-bold text-[#064E3B] dark:text-[#A7F3D0] truncate">OVERDUE REC.</span>
                  </div>
                  <DollarSign className="w-4 h-4 text-[#059669] dark:text-[#34D399] shrink-0" />
                </div>

                {/* Pending Dispatches - Solid Teal Card */}
                <div 
                  onClick={() => handleNavigate('dispatch')}
                  className="bg-[#F0FDFA] dark:bg-[#0F3634] border border-[#5EEAD4] dark:border-[#0D9488] p-3.5 rounded-2xl flex items-center justify-between cursor-pointer hover:border-teal-500 hover:shadow-xs transition-all"
                >
                  <div className="flex items-center gap-2">
                    <span className="bg-[#99F6E4] dark:bg-[#134E4A] text-[#134E4A] dark:text-[#CCFBF1] font-black px-2 py-0.5 rounded-md text-xs">
                      {pendingDispatchesCount}
                    </span>
                    <span className="text-xs font-bold text-[#134E4A] dark:text-[#99F6E4]">PENDING DISPATCHES</span>
                  </div>
                  <Truck className="w-4 h-4 text-[#0D9488] dark:text-[#2DD4BF] shrink-0" />
                </div>

              </div>

              {/* Shortages Alert Banner - Solid Rose Alert Box */}
              {widgetVisibility.showShortagesBanner && (
                <div className="bg-[#FFF1F2] dark:bg-[#45101C] border border-[#FDA4AF] dark:border-[#BE123C] p-3.5 rounded-2xl text-xs flex items-center justify-between shadow-xs">
                  <div className="flex items-center gap-2.5 overflow-x-auto">
                    <div className="bg-[#FFE4E6] dark:bg-[#881337] text-[#E11D48] dark:text-[#FB7185] p-1.5 rounded-xl shrink-0">
                      <AlertTriangle className="w-4 h-4" />
                    </div>
                    <span className="font-black text-[#881337] dark:text-[#FECDD3] shrink-0 tracking-tight">MATERIAL SHORTAGES:</span>
                    <span className="font-mono text-xs font-bold text-[#9F1239] dark:text-[#FFE4E6] whitespace-nowrap">
                      {shortItemsList.length > 0 
                        ? shortItemsList.map(s => `${s.code} (${s.available.toFixed(1)})`).join(' | ')
                        : 'No critical material shortages currently detected'}
                    </span>
                  </div>
                  <button 
                    onClick={() => handleNavigate('inventory')}
                    className="text-[#BE123C] dark:text-[#FDA4AF] font-black hover:underline shrink-0 ml-4 cursor-pointer"
                  >
                    View All
                  </button>
                </div>
              )}
            </div>
          )}

          {/* ========================================================================= */}
          {/* SCREENSHOT REPLICATION - SECTION 1: TOP 4 METRIC TELEMETRY CARDS (GRID 4) */}
          {/* ========================================================================= */}
          {widgetVisibility.showTopMetricsRow && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              
              {/* Card 1: Total Sales */}
              <div 
                onClick={() => handleNavigate('orders')}
                className={`p-5 rounded-2xl border transition-all cursor-pointer shadow-2xs hover:shadow-md ${
                  isDarkMode ? 'bg-slate-900 border-slate-800 hover:border-slate-700' : 'bg-white border-slate-200/90 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300">
                      <DollarSign className="w-4 h-4" />
                    </div>
                    <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Total Sales</span>
                  </div>
                  <button className="p-1 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>

                <div className="flex items-baseline gap-2 mb-2">
                  <span className={`text-2xl font-extrabold tracking-tight ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                    {fmt(totalSalesRevenueVal)}
                  </span>
                  <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[11px] font-bold text-emerald-700 bg-emerald-100 dark:bg-emerald-950/60 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/50">
                    12% <TrendingUp className="w-3 h-3" />
                  </span>
                </div>

                <p className="text-[11px] text-slate-400 dark:text-slate-500">
                  Compared to <span className="font-semibold text-slate-600 dark:text-slate-400">{fmt(totalSalesRevenueVal * 0.89)}</span> last month
                </p>
              </div>

              {/* Card 2: Active Orders */}
              <div 
                onClick={() => handleNavigate('orders')}
                className={`p-5 rounded-2xl border transition-all cursor-pointer shadow-2xs hover:shadow-md ${
                  isDarkMode ? 'bg-slate-900 border-slate-800 hover:border-slate-700' : 'bg-white border-slate-200/90 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300">
                      <Truck className="w-4 h-4" />
                    </div>
                    <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Active Orders</span>
                  </div>
                  <button className="p-1 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>

                <div className="flex items-baseline gap-2 mb-2">
                  <span className={`text-2xl font-extrabold tracking-tight ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                    {activeOrdersNum.toLocaleString('en-IN')}
                  </span>
                  <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[11px] font-bold text-emerald-700 bg-emerald-100 dark:bg-emerald-950/60 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/50">
                    8% <TrendingUp className="w-3 h-3" />
                  </span>
                </div>

                <p className="text-[11px] text-slate-400 dark:text-slate-500">
                  Compared to <span className="font-semibold text-slate-600 dark:text-slate-400">{Math.max(1, activeOrdersNum - 90)} orders</span> last month
                </p>
              </div>

              {/* Card 3: Low Stock Items */}
              <div 
                onClick={() => handleNavigate('inventory')}
                className={`p-5 rounded-2xl border transition-all cursor-pointer shadow-2xs hover:shadow-md ${
                  isDarkMode ? 'bg-slate-900 border-slate-800 hover:border-slate-700' : 'bg-white border-slate-200/90 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300">
                      <AlertTriangle className="w-4 h-4 text-amber-500" />
                    </div>
                    <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Low Stock Items</span>
                  </div>
                  <button className="p-1 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>

                <div className="flex items-baseline gap-2 mb-2">
                  <span className={`text-2xl font-extrabold tracking-tight ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                    {itemsShortCount > 0 ? itemsShortCount : 37} SKUs
                  </span>
                  <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[11px] font-bold text-rose-700 bg-rose-100 dark:bg-rose-950/60 dark:text-rose-400 border border-rose-200 dark:border-rose-800/50">
                    15% <TrendingDown className="w-3 h-3" />
                  </span>
                </div>

                <p className="text-[11px] text-slate-400 dark:text-slate-500">
                  Compared to <span className="font-semibold text-slate-600 dark:text-slate-400">{(itemsShortCount || 37) + 7} SKUs</span> last month
                </p>
              </div>

              {/* Card 4: Revenue Growth */}
              <div 
                onClick={() => handleNavigate('qc')}
                className={`p-5 rounded-2xl border transition-all cursor-pointer shadow-2xs hover:shadow-md ${
                  isDarkMode ? 'bg-slate-900 border-slate-800 hover:border-slate-700' : 'bg-white border-slate-200/90 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300">
                      <Layers3 className="w-4 h-4" />
                    </div>
                    <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Revenue Growth</span>
                  </div>
                  <button className="p-1 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>

                <div className="flex items-baseline gap-2 mb-2">
                  <span className={`text-2xl font-extrabold tracking-tight ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                    18%
                  </span>
                  <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[11px] font-bold text-emerald-700 bg-emerald-100 dark:bg-emerald-950/60 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/50">
                    18% <TrendingUp className="w-3 h-3" />
                  </span>
                </div>

                <p className="text-[11px] text-slate-400 dark:text-slate-500">
                  Compared to <span className="font-semibold text-slate-600 dark:text-slate-400">+15%</span> last month
                </p>
              </div>

            </div>
          )}

          {/* ========================================================================= */}
          {/* SCREENSHOT REPLICATION - SECTION 2: MIDDLE ANALYTICS GRID (3 COLUMNS)      */}
          {/* ========================================================================= */}
          {widgetVisibility.showAnalyticsGrid && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
              
              {/* Column 1: Top Selling Products (Bar Chart Widget) */}
              <div className={`p-5 rounded-2xl border flex flex-col justify-between shadow-2xs ${
                isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200/90'
              }`}>
                <div className="flex items-center justify-between mb-4">
                  <h3 className={`font-bold text-sm ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                    Top Selling Products
                  </h3>
                  <select
                    value={topProductsTimeframe}
                    onChange={(e) => setTopProductsTimeframe(e.target.value)}
                    className={`px-2.5 py-1 rounded-xl text-xs border outline-none font-semibold cursor-pointer ${
                      isDarkMode ? 'bg-slate-800 border-slate-700 text-slate-200' : 'bg-slate-50 border-slate-200 text-slate-700'
                    }`}
                  >
                    <option value="June">June</option>
                    <option value="May">May</option>
                    <option value="Q3 2026">Q3 2026</option>
                  </select>
                </div>

                {/* Vertical Bar Chart Graphic */}
                <div className="pt-4 pb-2">
                  <div className="flex items-end justify-between gap-3 h-44 px-2 border-b border-slate-100 dark:border-slate-800 pb-2">
                    {dynamicTopProducts.map((item, index) => (
                      <div key={index} className="flex-1 flex flex-col items-center gap-2 group h-full justify-end">
                        <div className="w-full bg-slate-100 dark:bg-slate-800/60 rounded-t-xl overflow-hidden flex flex-col justify-end h-full relative">
                          <div 
                            className={`w-full transition-all duration-500 rounded-t-xl ${
                              item.active 
                                ? 'bg-blue-600 dark:bg-blue-500 shadow-md shadow-blue-500/20' 
                                : 'bg-blue-100 dark:bg-slate-700 group-hover:bg-blue-300 dark:group-hover:bg-slate-600'
                            }`}
                            style={{ height: `${(item.sales / 1000) * 100}%` }}
                          />
                        </div>
                        <span className="text-[10px] font-semibold text-slate-400 truncate max-w-full text-center">
                          {item.name.split(' ')[0]}
                        </span>
                      </div>
                    ))}
                  </div>
                  <div className="flex justify-between px-2 pt-2 text-[10px] font-mono text-slate-400">
                    <span>1K</span>
                    <span>500</span>
                    <span>0</span>
                  </div>
                </div>
              </div>

              {/* Column 2: Sales & Orders Analytics (Progress Bars with Active Hover Tooltip) */}
              <div className={`p-5 rounded-2xl border flex flex-col justify-between shadow-2xs relative ${
                isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200/90'
              }`}>
                <div className="flex items-center justify-between mb-3">
                  <h3 className={`font-bold text-sm ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                    Sales & Orders Analytics
                  </h3>
                  <select
                    value={salesAnalyticsTimeframe}
                    onChange={(e) => setSalesAnalyticsTimeframe(e.target.value)}
                    className={`px-2.5 py-1 rounded-xl text-xs border outline-none font-semibold cursor-pointer ${
                      isDarkMode ? 'bg-slate-800 border-slate-700 text-slate-200' : 'bg-slate-50 border-slate-200 text-slate-700'
                    }`}
                  >
                    <option value="June">June</option>
                    <option value="May">May</option>
                  </select>
                </div>

                <div className="mb-4">
                  <p className="text-[11px] font-semibold text-slate-400">Total Orders:</p>
                  <div className="flex items-baseline gap-2 mt-0.5">
                    <span className={`text-xl font-extrabold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                      {totalOrdersNum.toLocaleString('en-IN')}
                    </span>
                    <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-bold text-emerald-700 bg-emerald-100 dark:bg-emerald-950/60 dark:text-emerald-400">
                      6% <TrendingUp className="w-3 h-3" />
                    </span>
                    <span className="text-[11px] text-slate-400">vs {Math.max(1, totalOrdersNum - 75)} last month</span>
                  </div>
                </div>

                {/* Progress Status Bars */}
                <div className="space-y-3.5 pt-1">
                  
                  {/* Completed */}
                  <div className="flex items-center justify-between text-xs gap-3">
                    <span className="w-20 text-slate-500 font-medium">Completed</span>
                    <div className="flex-1 h-6 bg-blue-50 dark:bg-slate-800 rounded-full overflow-hidden">
                      <div className="h-full bg-blue-200 dark:bg-slate-700 rounded-full" style={{ width: `${completedPct}%` }} />
                    </div>
                    <span className="w-10 text-right font-bold text-slate-400 text-[11px]">{completedOrdersNum}</span>
                  </div>

                  {/* Processing (With Screenshot Tooltip Card) */}
                  <div className="relative group">
                    <div className="flex items-center justify-between text-xs gap-3">
                      <span className="w-20 text-slate-900 dark:text-slate-100 font-bold">Processing</span>
                      <div className="flex-1 h-6 bg-blue-50 dark:bg-slate-800 rounded-full overflow-hidden">
                        <div className="h-full bg-blue-600 transition-all duration-500 rounded-full" style={{ width: `${processingPct}%` }} />
                      </div>
                      <span className="w-10 text-right font-bold text-slate-900 dark:text-white text-[11px]">{processingOrdersNum}</span>
                    </div>

                    {/* Hover-Only Tooltip Popover */}
                    <div className="hidden group-hover:block absolute right-2 top-8 z-30 w-48 p-3 rounded-2xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-1 text-[11px] font-sans pointer-events-none transition-all duration-200">
                      <div className="font-bold text-slate-900 dark:text-white text-xs mb-1">{processingOrdersNum} Orders</div>
                      <div className="flex justify-between text-slate-500 dark:text-slate-400">
                        <span>• Share:</span>
                        <span className="font-bold text-slate-700 dark:text-slate-300">{processingPct}%</span>
                      </div>
                      <div className="flex justify-between text-slate-500 dark:text-slate-400">
                        <span>• Change vs May:</span>
                        <span className="font-bold text-emerald-600 dark:text-emerald-400">+11%</span>
                      </div>
                      <div className="flex justify-between text-slate-500 dark:text-slate-400">
                        <span>• Revenue:</span>
                        <span className="font-bold text-slate-900 dark:text-white">{fmt(processingRevenueVal)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Cancelled */}
                  <div className="flex items-center justify-between text-xs gap-3">
                    <span className="w-20 text-slate-500 font-medium">Cancelled</span>
                    <div className="flex-1 h-6 bg-blue-50 dark:bg-slate-800 rounded-full overflow-hidden">
                      <div className="h-full bg-blue-400 dark:bg-slate-600 rounded-full" style={{ width: `${cancelledPct}%` }} />
                    </div>
                    <span className="w-10 text-right font-bold text-slate-400 text-[11px]">{cancelledOrdersNum}</span>
                  </div>

                  {/* Returned */}
                  <div className="flex items-center justify-between text-xs gap-3">
                    <span className="w-20 text-slate-500 font-medium">Returned</span>
                    <div className="flex-1 h-6 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                      <div className="h-full bg-slate-300 dark:bg-slate-700 rounded-full" style={{ width: `${returnedPct}%` }} />
                    </div>
                    <span className="w-10 text-right font-bold text-slate-400 text-[11px]">{returnedOrdersNum}</span>
                  </div>

                </div>
              </div>

              {/* Column 3: Channel Performance / Order Distribution (Half-Gauge / Donut Chart) */}
              <div className={`p-5 rounded-2xl border flex flex-col justify-between shadow-2xs ${
                isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200/90'
              }`}>
                <div>
                  <h3 className={`font-bold text-sm mb-1 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                    Channel Performance
                  </h3>
                  <p className="text-[11px] font-semibold text-slate-400 mb-1">Total Revenue by Channel:</p>
                  <div className={`text-2xl font-extrabold tracking-tight ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                    {fmt(totalSalesRevenueVal)}
                  </div>
                </div>

                {/* Donut Semi-Circle Graphic (TEXT OVERLAP FIX: top-[58px] inside hollow center) */}
                <div className="relative flex flex-col items-center justify-center my-2">
                  <svg className="w-52 h-32" viewBox="0 0 200 110">
                    <path
                      d="M 20 100 A 80 80 0 0 1 180 100"
                      fill="none"
                      stroke="#e2e8f0"
                      strokeWidth="20"
                      strokeLinecap="round"
                      className="dark:stroke-slate-800"
                    />
                    <path
                      d="M 20 100 A 80 80 0 0 1 100 20"
                      fill="none"
                      stroke="#93c5fd"
                      strokeWidth="20"
                      strokeLinecap="round"
                    />
                    <path
                      d="M 105 20 A 80 80 0 0 1 178 95"
                      fill="none"
                      stroke="#2563eb"
                      strokeWidth="20"
                      strokeLinecap="round"
                    />
                  </svg>
                  
                  {/* Clean Non-Overlapping Inner Text Overlay */}
                  <div className="absolute top-[58px] flex flex-col items-center justify-center pointer-events-none">
                    <span className="text-[10px] text-slate-400 uppercase font-semibold tracking-wider">TOTAL ORDERS:</span>
                    <span className={`text-xl font-extrabold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                      {totalOrdersNum.toLocaleString('en-IN')}
                    </span>
                  </div>
                </div>

                {/* Legend Items */}
                <div className="grid grid-cols-2 gap-2 pt-2 text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-blue-600" />
                    <span>OEM Clients</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-blue-400" />
                    <span>Export Market</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-blue-300" />
                    <span>Tier-1 Auto</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-slate-300 dark:bg-slate-700" />
                    <span>Direct Sales</span>
                  </div>
                </div>
              </div>

            </div>
          )}

          {/* ========================================================================= */}
          {/* AUTONOMOUS AI AGENT WORKSPACE - 5-CARD REALTIME BENTO GRID                */}
          {/* ========================================================================= */}
          {widgetVisibility.showAgentBentoGrid && (
            <AgentBentoGrid
              orders={orders}
              stock={stock}
              qcItems={qcItems}
              jobCards={jobCards}
              dispatches={dispatches}
              invoices={invoices}
              payables={payables}
              productionLogs={productionLogs}
              auditLogs={auditLogs}
              isRealtimeStreaming={isRealtimeStreaming}
              currencySymbol={currencySymbol}
              isDarkMode={isDarkMode}
              onNavigateView={handleNavigate}
            />
          )}

          {/* ========================================================================= */}
          {/* SCREENSHOT REPLICATION - SECTION 3: RECENT ACTIVITIES TABLE               */}
          {/* ========================================================================= */}
          {widgetVisibility.showRecentActivities && (
            <div className={`rounded-2xl border p-5 space-y-4 shadow-2xs ${
              isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200/90'
            }`}>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h3 className={`font-bold text-base ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                  Recent Activities
                </h3>

                <div className="flex items-center gap-3">
                  {/* Search Input */}
                  <div className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs w-64 ${
                    isDarkMode ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                  }`}>
                    <Search className="w-3.5 h-3.5 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Search activities..."
                      value={activitySearchQuery}
                      onChange={(e) => setActivitySearchQuery(e.target.value)}
                      className="bg-transparent outline-none w-full"
                    />
                  </div>

                  {/* Filter Button */}
                  <div className="relative">
                    <select
                      value={activityCategoryFilter}
                      onChange={(e) => setActivityCategoryFilter(e.target.value)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold cursor-pointer outline-none ${
                        isDarkMode ? 'bg-slate-950 border-slate-800 text-slate-200' : 'bg-slate-50 border-slate-200 text-slate-700'
                      }`}
                    >
                      <option value="ALL">All Categories</option>
                      <option value="ORDER">Order</option>
                      <option value="INVENTORY">Inventory</option>
                      <option value="SYSTEM">System</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse font-sans">
                  <thead>
                    <tr className={`border-b font-semibold text-[11px] text-slate-400 uppercase tracking-wider ${
                      isDarkMode ? 'bg-slate-950/40 border-slate-800' : 'bg-slate-50/70 border-slate-100'
                    }`}>
                      <th className="py-3 px-4">Time ↕</th>
                      <th className="py-3 px-4">Activities</th>
                      <th className="py-3 px-4">Category ↕</th>
                      <th className="py-3 px-4">User ↕</th>
                      <th className="py-3 px-4 text-center">Status ↕</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                    {filteredActivities.slice(0, 8).map((act, index) => (
                      <tr key={index} className={isDarkMode ? 'hover:bg-slate-800/40' : 'hover:bg-slate-50/80'}>
                        <td className="py-3.5 px-4 text-slate-400 font-mono text-[11px]">
                          {act.time}
                        </td>
                        <td className={`py-3.5 px-4 font-semibold ${isDarkMode ? 'text-slate-100' : 'text-slate-800'}`}>
                          {act.activity}
                        </td>
                        <td className="py-3.5 px-4 font-medium text-slate-500">
                          {act.category}
                        </td>
                        <td className="py-3.5 px-4 font-medium text-slate-500">
                          {act.user}
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          {act.status === 'Processing' && (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                              <span>Processing</span>
                            </span>
                          )}
                          {act.status === 'Completed' && (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                              <span>Completed</span>
                            </span>
                          )}
                          {act.status === 'Cancelled' && (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
                              <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                              <span>Cancelled</span>
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Module: Production Throughput Trends (Preserved original SVG chart option) */}
          {widgetVisibility.showThroughputChart && (
            <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 shadow-2xs flex flex-col justify-between">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Production Throughput Trends (Historical Log)
                </h3>
                <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 rounded-lg px-2.5 py-1 text-xs text-slate-700 dark:text-slate-300 font-semibold">
                  <span>Scope: {scope}</span>
                </div>
              </div>

              <div className="relative pt-2 pb-1">
                <div className="flex items-center gap-4 text-xs font-medium text-slate-500 mb-2">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-teal-600" />
                    <span>Parts Completed ({totalMonthlyPartsOutput})</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full border border-dashed border-slate-400" />
                    <span>Target (250)</span>
                  </div>
                </div>

                <div className="h-44 w-full relative">
                  <svg className="w-full h-full overflow-visible" viewBox="0 0 500 160">
                    <defs>
                      <linearGradient id="tealGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#0EA5E9" stopOpacity="0.25" />
                        <stop offset="100%" stopColor="#0EA5E9" stopOpacity="0.0" />
                      </linearGradient>
                    </defs>

                    <line x1="40" y1="20" x2="480" y2="20" stroke="#f1f5f9" strokeWidth="1" />
                    <line x1="40" y1="60" x2="480" y2="60" stroke="#f1f5f9" strokeWidth="1" />
                    <line x1="40" y1="100" x2="480" y2="100" stroke="#f1f5f9" strokeWidth="1" />
                    <line x1="40" y1="140" x2="480" y2="140" stroke="#f1f5f9" strokeWidth="1" />

                    <text x="30" y="143" fill="#94a3b8" fontSize="10" textAnchor="end">0</text>
                    <text x="30" y="103" fill="#94a3b8" fontSize="10" textAnchor="end">100</text>
                    <text x="30" y="63" fill="#94a3b8" fontSize="10" textAnchor="end">200</text>
                    <text x="30" y="23" fill="#94a3b8" fontSize="10" textAnchor="end">400</text>

                    <line x1="50" y1="50" x2="470" y2="50" stroke="#cbd5e1" strokeWidth="1.5" strokeDasharray="4 4" />

                    <path
                      d="M 60,110 C 100,105 130,95 150,90 C 180,85 210,80 240,75 C 270,80 300,80 330,75 C 370,70 410,60 450,45 L 450,140 L 60,140 Z"
                      fill="url(#tealGradient)"
                    />

                    <path
                      d="M 60,110 C 100,105 130,95 150,90 C 180,85 210,80 240,75 C 270,80 300,80 330,75 C 370,70 410,60 450,45"
                      fill="none"
                      stroke="#0D9488"
                      strokeWidth="3"
                      strokeLinecap="round"
                    />

                    <circle cx="60" cy="110" r="4" fill="#0D9488" />
                    <circle cx="150" cy="90" r="4" fill="#0D9488" />
                    <circle cx="240" cy="75" r="4" fill="#0D9488" />
                    <circle cx="330" cy="75" r="4" fill="#0D9488" />
                    <circle cx="410" cy="55" r="4" fill="#0D9488" />
                    <circle cx="450" cy="45" r="5" fill="#0D9488" stroke="#ffffff" strokeWidth="2" />

                    <g transform="translate(420, 10)">
                      <rect x="0" y="0" width="60" height="32" rx="6" fill="#0f172a" />
                      <text x="30" y="12" fill="#94a3b8" fontSize="8" fontWeight="bold" textAnchor="middle">Current</text>
                      <text x="30" y="24" fill="#ffffff" fontSize="10" fontWeight="bold" textAnchor="middle">{totalMonthlyPartsOutput} Parts</text>
                    </g>

                    <text x="60" y="158" fill="#94a3b8" fontSize="10" textAnchor="middle">Mar</text>
                    <text x="140" y="158" fill="#94a3b8" fontSize="10" textAnchor="middle">Apr</text>
                    <text x="220" y="158" fill="#94a3b8" fontSize="10" textAnchor="middle">May</text>
                    <text x="300" y="158" fill="#94a3b8" fontSize="10" textAnchor="middle">Jun</text>
                    <text x="380" y="158" fill="#94a3b8" fontSize="10" textAnchor="middle">Jul</text>
                    <text x="450" y="158" fill="#94a3b8" fontSize="10" textAnchor="middle">Aug</text>
                  </svg>
                </div>
              </div>
            </div>
          )}
        </>
      ) : (
        /* REVAMPED TABULAR NUMBERS MODE */
        <div className="space-y-5 font-sans">
          {/* Summary KPI Cards Strip */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className={`p-4 rounded-2xl border flex items-center justify-between shadow-2xs ${
              isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200/80'
            }`}>
              <div>
                <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Total Tracked Metrics</div>
                <div className="text-xl font-black text-slate-900 dark:text-white mt-1">{filteredTabularMetrics.length} Active</div>
                <div className="text-[10px] text-teal-600 dark:text-teal-400 font-semibold mt-0.5">Realtime System Telemetry</div>
              </div>
              <div className="p-3 rounded-xl bg-teal-500/10 text-teal-600 dark:text-teal-400">
                <Hash className="w-5 h-5" />
              </div>
            </div>

            <div className={`p-4 rounded-2xl border flex items-center justify-between shadow-2xs ${
              isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200/80'
            }`}>
              <div>
                <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Critical & Warning Alerts</div>
                <div className="text-xl font-black text-rose-600 dark:text-rose-400 mt-1">
                  {itemsShortCount + qcHoldCount} Items
                </div>
                <div className="text-[10px] text-rose-500 font-semibold mt-0.5">
                  {itemsShortCount} Shortages • {qcHoldCount} QC Holds
                </div>
              </div>
              <div className="p-3 rounded-xl bg-rose-500/10 text-rose-500">
                <AlertTriangle className="w-5 h-5" />
              </div>
            </div>

            <div className={`p-4 rounded-2xl border flex items-center justify-between shadow-2xs ${
              isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200/80'
            }`}>
              <div>
                <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Quality Pass Index</div>
                <div className="text-xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
                  {qcPassRate}%
                </div>
                <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold mt-0.5">Benchmark Target: 98%</div>
              </div>
              <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-500">
                <ShieldCheck className="w-5 h-5" />
              </div>
            </div>

            <div className={`p-4 rounded-2xl border flex items-center justify-between shadow-2xs ${
              isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200/80'
            }`}>
              <div>
                <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Total Book Exposure</div>
                <div className="text-xl font-black text-slate-900 dark:text-white mt-1">
                  {fmt(openOrderBookValue + overdueReceivablesSum)}
                </div>
                <div className="text-[10px] text-slate-500 font-semibold mt-0.5">Orders + Receivables</div>
              </div>
              <div className="p-3 rounded-xl bg-indigo-500/10 text-indigo-500">
                <DollarSign className="w-5 h-5" />
              </div>
            </div>
          </div>

          {/* Interactive Toolbar for Tabular Numbers Mode */}
          <div className={`p-4 rounded-2xl border flex flex-wrap items-center justify-between gap-3 shadow-2xs ${
            isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200/80'
          }`}>
            {/* Search Bar */}
            <div className="relative flex-1 min-w-[240px]">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={tabularSearchQuery}
                onChange={(e) => setTabularSearchQuery(e.target.value)}
                placeholder="Filter tabular metrics by code, category, or name..."
                className={`w-full rounded-xl border pl-9 pr-4 py-2 text-xs font-sans outline-none transition-all ${
                  isDarkMode 
                    ? 'bg-slate-950 border-slate-800 text-white focus:border-teal-500' 
                    : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-teal-600'
                }`}
              />
              {tabularSearchQuery && (
                <button 
                  onClick={() => setTabularSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Category Filter Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto py-1">
              {['ALL', 'FINANCIAL', 'QUALITY', 'INVENTORY', 'PRODUCTION', 'LOGISTICS'].map((cat) => (
                <button
                  key={cat}
                  onClick={() => setTabularCategoryFilter(cat)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    tabularCategoryFilter === cat
                      ? 'bg-teal-600 text-white shadow-xs'
                      : isDarkMode
                        ? 'bg-slate-800 text-slate-400 hover:text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* CSV Export & Density Toggle Buttons */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setTabularDensity(tabularDensity === 'compact' ? 'comfortable' : 'compact')}
                className={`px-3 py-1.5 rounded-xl border text-xs font-bold cursor-pointer transition-all ${
                  isDarkMode ? 'bg-slate-800 border-slate-700 text-slate-300' : 'bg-slate-100 border-slate-200 text-slate-700'
                }`}
              >
                {tabularDensity === 'compact' ? 'Comfortable View' : 'Compact View'}
              </button>

              <button
                onClick={handleExportTabularCSV}
                className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm cursor-pointer transition-all"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export CSV</span>
              </button>
            </div>
          </div>

          {/* Main High-Density Tabular Metrics Grid */}
          <div className={`border rounded-2xl overflow-hidden shadow-2xs ${
            isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200/80'
          }`}>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-sans">
                <thead className={`font-bold border-b uppercase tracking-wider text-[11px] ${
                  isDarkMode ? 'bg-slate-950/80 border-slate-800 text-slate-400' : 'bg-slate-50 border-slate-200 text-slate-500'
                }`}>
                  <tr>
                    <th className="py-3 px-4">Code</th>
                    <th className="py-3 px-4">Metric Description</th>
                    <th className="py-3 px-4">Category</th>
                    <th className="py-3 px-4">Current Telemetry</th>
                    <th className="py-3 px-4">Status & Health</th>
                    <th className="py-3 px-4">Target / Benchmark</th>
                    <th className="py-3 px-4">Period Delta</th>
                    <th className="py-3 px-4 text-right">Quick Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80 font-mono">
                  {filteredTabularMetrics.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-slate-400 font-sans">
                        No telemetry metrics matching "{tabularSearchQuery}" in {tabularCategoryFilter} category.
                      </td>
                    </tr>
                  ) : (
                    filteredTabularMetrics.map((m) => (
                      <tr 
                        key={m.code} 
                        className={`transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/40 ${
                          tabularDensity === 'compact' ? 'py-1.5' : ''
                        }`}
                      >
                        <td className="py-3 px-4 font-bold text-slate-400 text-[11px]">{m.code}</td>
                        <td className="py-3 px-4 font-bold font-sans text-slate-900 dark:text-white">
                          {m.name}
                        </td>
                        <td className="py-3 px-4">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200/60 dark:border-slate-700">
                            {m.category}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-black text-sm text-slate-900 dark:text-white">
                          {m.valueStr}
                        </td>
                        <td className="py-3 px-4">
                          <span className={`px-2.5 py-1 rounded-full font-bold text-[10px] border tracking-wider uppercase inline-flex items-center gap-1 ${m.statusBadge}`}>
                            <span className="w-1.5 h-1.5 rounded-full bg-current" />
                            <span>{m.status}</span>
                          </span>
                        </td>
                        <td className="py-3 px-4 font-sans text-slate-500 font-medium">{m.target}</td>
                        <td className="py-3 px-4">
                          <span className={`font-bold text-xs flex items-center gap-0.5 ${
                            m.deltaType === 'up' 
                              ? 'text-emerald-600 dark:text-emerald-400' 
                              : m.deltaType === 'down' 
                                ? 'text-rose-600 dark:text-rose-400' 
                                : 'text-slate-500'
                          }`}>
                            {m.deltaType === 'up' && <TrendingUp className="w-3.5 h-3.5 inline" />}
                            {m.deltaType === 'down' && <TrendingDown className="w-3.5 h-3.5 inline" />}
                            <span>{m.delta}</span>
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <button
                            onClick={() => handleNavigate(m.viewKey)}
                            className="px-3 py-1 rounded-xl bg-teal-500/10 hover:bg-teal-500/20 text-teal-600 dark:text-teal-400 font-bold font-sans text-xs transition-all cursor-pointer"
                          >
                            {m.actionLabel} →
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* CUSTOMIZE MODAL */}
      {showCustomizeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 font-sans">
          <div 
            onClick={() => setShowCustomizeModal(false)}
            className="fixed inset-0 bg-slate-950/70"
          />
          <div className={`relative w-full max-w-md rounded-2xl border p-6 space-y-5 font-sans z-10 shadow-2xl ${
            isDarkMode ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
          }`}>
            <div className="flex items-center justify-between border-b pb-3">
              <div className="flex items-center gap-2">
                <SlidersHorizontal className="w-5 h-5 text-teal-600" />
                <h3 className="font-bold text-base">Customize Command Centre</h3>
              </div>
              <button onClick={() => setShowCustomizeModal(false)} className="text-slate-400 hover:text-slate-600 font-bold cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
              
              {/* Display Mode Selection */}
              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700 space-y-2">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">
                  Command Centre Display Mode
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setMode('charts')}
                    className={`px-3 py-2 rounded-xl text-xs font-bold border cursor-pointer transition-all flex items-center justify-center gap-2 ${
                      mode === 'charts'
                        ? 'bg-[#5B75F8] text-white border-[#5B75F8] shadow-xs'
                        : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    <BarChart3 className="w-4 h-4" />
                    <span>Charts Dashboard</span>
                  </button>
                  <button
                    onClick={() => setMode('numbers')}
                    className={`px-3 py-2 rounded-xl text-xs font-bold border cursor-pointer transition-all flex items-center justify-center gap-2 ${
                      mode === 'numbers'
                        ? 'bg-[#5B75F8] text-white border-[#5B75F8] shadow-xs'
                        : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    <Hash className="w-4 h-4" />
                    <span>Tabular Numbers</span>
                  </button>
                </div>
              </div>

              {/* Currency Selector */}
              <div>
                <label className="block text-xs font-bold uppercase text-slate-500 mb-2">Currency Symbol</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { symbol: '₹', label: 'INR (₹)' },
                    { symbol: '$', label: 'USD ($)' },
                    { symbol: '€', label: 'EUR (€)' }
                  ].map((c) => (
                    <button
                      key={c.symbol}
                      onClick={() => setCurrencySymbol(c.symbol)}
                      className={`px-3 py-2 rounded-xl text-xs font-bold border cursor-pointer transition-all ${
                        currencySymbol === c.symbol
                          ? 'bg-[#5B75F8] text-white border-[#5B75F8]'
                          : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      {c.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Realtime Stream Switch */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                <div>
                  <div className="font-bold text-xs">Realtime Telemetry Feed</div>
                  <div className="text-[11px] text-slate-500">Auto-updates shopfloor sensors every 5s</div>
                </div>
                <button
                  onClick={onToggleRealtimeStreaming}
                  className={`w-11 h-6 rounded-full transition-colors p-0.5 cursor-pointer ${
                    isRealtimeStreaming ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-700'
                  }`}
                >
                  <div className={`w-5 h-5 rounded-full bg-white transition-transform ${
                    isRealtimeStreaming ? 'translate-x-5' : 'translate-x-0'
                  }`} />
                </button>
              </div>

              {/* Toggle Widget Visibilities */}
              <div className="space-y-2">
                <label className="block text-xs font-bold uppercase text-slate-500 mb-1">Visible Dashboard Widgets</label>
                
                {[
                  { key: 'showAlertsBar', label: 'Operational Alerts Bar' },
                  { key: 'showShortagesBanner', label: 'Material Shortages Warning Banner' },
                  { key: 'showAgentBentoGrid', label: 'Autonomous AI Agent Command Grid (5-Card Bento)' },
                  { key: 'showTopMetricsRow', label: 'Top 4 Telemetry Metric Cards' },
                  { key: 'showAnalyticsGrid', label: 'Middle 3-Column Analytics Grid' },
                  { key: 'showRecentActivities', label: 'Recent Activities Table' },
                  { key: 'showThroughputChart', label: 'Production Throughput Trend Line Chart' }
                ].map((item) => {
                  const key = item.key as keyof typeof widgetVisibility;
                  const isVis = widgetVisibility[key];
                  return (
                    <div 
                      key={key} 
                      onClick={() => toggleWidget(key)}
                      className="flex items-center justify-between p-2.5 rounded-xl border border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer text-xs font-medium"
                    >
                      <span>{item.label}</span>
                      {isVis ? (
                        <Eye className="w-4 h-4 text-[#5B75F8]" />
                      ) : (
                        <EyeOff className="w-4 h-4 text-slate-400" />
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Reset Factory Seed Data */}
              {onResetAllData && (
                <div className="pt-2 border-t border-slate-200 dark:border-slate-800">
                  <button
                    onClick={() => {
                      if (window.confirm('Reset all stored data to factory defaults?')) {
                        onResetAllData();
                        setShowCustomizeModal(false);
                      }
                    }}
                    className="w-full flex items-center justify-center gap-2 p-2.5 rounded-xl border border-rose-200 dark:border-rose-900/50 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-xs font-bold cursor-pointer transition-all"
                  >
                    <RotateCcw className="w-4 h-4" />
                    <span>Reset All Data to Factory Defaults</span>
                  </button>
                </div>
              )}

            </div>

            <div className="pt-2 border-t border-slate-200 dark:border-slate-800 flex justify-end">
              <button
                onClick={() => setShowCustomizeModal(false)}
                className="px-5 py-2.5 rounded-xl bg-[#5B75F8] hover:bg-[#4A64E7] text-white font-bold text-xs cursor-pointer shadow-sm transition-colors"
              >
                Save & Apply Settings
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
