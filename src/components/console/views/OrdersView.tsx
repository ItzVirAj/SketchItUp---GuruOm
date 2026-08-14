import React, { useState } from 'react';
import { 
  Plus, 
  Download, 
  Search, 
  ChevronRight, 
  ShoppingCart, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  XCircle, 
  FileText, 
  LayoutGrid, 
  List, 
  TrendingUp, 
  DollarSign, 
  Package, 
  Truck, 
  X, 
  Filter, 
  ArrowUpRight,
  ShieldCheck,
  Tag
} from 'lucide-react';
import { CustomerOrder, OrderStatus, OrderLineItem } from '../../../types/console';

interface OrdersViewProps {
  orders: CustomerOrder[];
  isDarkMode: boolean;
  onSelectOrder: (order: CustomerOrder) => void;
  onCreateOrder: (newOrder: Partial<CustomerOrder>) => void;
}

export const OrdersView: React.FC<OrdersViewProps> = ({
  orders,
  isDarkMode,
  onSelectOrder,
  onCreateOrder
}) => {
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');
  const [showNewModal, setShowNewModal] = useState(false);

  // New order form state
  const [newPoNo, setNewPoNo] = useState('');
  const [newCustomer, setNewCustomer] = useState('');
  const [newPoDate, setNewPoDate] = useState('2026-08-12');
  const [newDeliveryDate, setNewDeliveryDate] = useState('2026-08-25');
  const [newTaxCategory, setNewTaxCategory] = useState('GST 18%');
  const [newRemark, setNewRemark] = useState('');
  
  // Line items state
  const [lines, setLines] = useState<Array<{
    itemCode: string;
    itemDescription: string;
    custPartNo: string;
    orderQty: number;
    unit: string;
    rate: number;
  }>>([
    {
      itemCode: '00000003',
      itemDescription: 'TOWER PIVOTING SECTION',
      custPartNo: '90812450',
      orderQty: 100,
      unit: 'NOS',
      rate: 150
    }
  ]);

  const addLineItem = () => {
    setLines(prev => [
      ...prev,
      {
        itemCode: `0000000${prev.length + 1}`,
        itemDescription: 'NEW COMPONENT PART',
        custPartNo: '',
        orderQty: 50,
        unit: 'NOS',
        rate: 100
      }
    ]);
  };

  const removeLineItem = (index: number) => {
    if (lines.length <= 1) return;
    setLines(prev => prev.filter((_, i) => i !== index));
  };

  const updateLineItem = (index: number, field: string, value: any) => {
    setLines(prev => prev.map((line, i) => i === index ? { ...line, [field]: value } : line));
  };

  const totalCalculatedGross = lines.reduce((sum, l) => sum + (Number(l.orderQty) * Number(l.rate)), 0);

  const filteredOrders = orders.filter(o => {
    const matchesStatus = statusFilter === 'ALL' || o.status === statusFilter;
    const matchesSearch = o.poNo.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          o.customerName.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const totalRevenue = orders.reduce((sum, o) => sum + (o.grossAmount || 0), 0);
  const activeOrdersCount = orders.filter(o => o.status !== 'CLOSED' && o.status !== 'CANCELLED').length;
  const inProductionCount = orders.filter(o => o.status === 'IN_PRODUCTION').length;
  const dispatchedCount = orders.filter(o => o.status === 'PARTIALLY_DISPATCHED' || o.status === 'DISPATCHED' || o.status === 'DELIVERED').length;

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPoNo || !newCustomer) return;

    const formattedLines: OrderLineItem[] = lines.map((l, i) => ({
      id: `line-${Date.now()}-${i}`,
      itemCode: l.itemCode,
      itemDescription: l.itemDescription,
      custPartNo: l.custPartNo,
      orderQty: Number(l.orderQty),
      unit: l.unit,
      dispatchedQty: 0,
      pendingQty: Number(l.orderQty),
      rate: Number(l.rate)
    }));

    onCreateOrder({
      id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `ord-${Date.now()}`,
      poNo: newPoNo,
      customerName: newCustomer,
      poDate: newPoDate,
      deliveryDate: newDeliveryDate,
      status: 'CONFIRMED',
      progressStep: 0,
      grossAmount: totalCalculatedGross,
      taxCategory: newTaxCategory,
      remark: newRemark,
      lines: formattedLines,
      jobCards: [],
      dispatches: []
    });

    setShowNewModal(false);
    setNewPoNo('');
    setNewCustomer('');
    setNewRemark('');
  };

  const getStatusBadge = (status: OrderStatus) => {
    switch (status) {
      case 'CONFIRMED':
        return {
          label: 'CONFIRMED',
          bg: isDarkMode ? 'bg-teal-500/10 text-teal-400 border-teal-500/30' : 'bg-teal-50 text-teal-700 border-teal-200',
          dot: 'bg-teal-500',
          icon: CheckCircle2
        };
      case 'IN_PRODUCTION':
        return {
          label: 'IN PRODUCTION',
          bg: isDarkMode ? 'bg-purple-500/10 text-purple-400 border-purple-500/30' : 'bg-purple-50 text-purple-700 border-purple-200',
          dot: 'bg-purple-500 animate-pulse',
          icon: Clock
        };
      case 'PARTIALLY_DISPATCHED':
        return {
          label: 'PARTIALLY DISPATCHED',
          bg: isDarkMode ? 'bg-amber-500/10 text-amber-400 border-amber-500/30' : 'bg-amber-50 text-amber-700 border-amber-200',
          dot: 'bg-amber-500',
          icon: Truck
        };
      case 'DISPATCHED':
      case 'DELIVERED':
      case 'INVOICED':
      case 'PAID':
        return {
          label: status.replace('_', ' '),
          bg: isDarkMode ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' : 'bg-emerald-50 text-emerald-700 border-emerald-200',
          dot: 'bg-emerald-500',
          icon: ShieldCheck
        };
      case 'CLOSED':
        return {
          label: 'CLOSED',
          bg: isDarkMode ? 'bg-slate-800 text-slate-400 border-slate-700' : 'bg-slate-100 text-slate-600 border-slate-200',
          dot: 'bg-slate-400',
          icon: CheckCircle2
        };
      case 'CANCELLED':
        return {
          label: 'CANCELLED',
          bg: isDarkMode ? 'bg-rose-500/10 text-rose-400 border-rose-500/30' : 'bg-rose-50 text-rose-700 border-rose-200',
          dot: 'bg-rose-500',
          icon: XCircle
        };
      default:
        return {
          label: status,
          bg: isDarkMode ? 'bg-slate-800 text-slate-400 border-slate-700' : 'bg-slate-100 text-slate-600 border-slate-200',
          dot: 'bg-slate-400',
          icon: CheckCircle2
        };
    }
  };

  const exportCSV = () => {
    const headers = ['PO Number', 'Customer Name', 'PO Date', 'Delivery Date', 'Status', 'Gross Amount'];
    const rows = filteredOrders.map(o => [o.poNo, o.customerName, o.poDate, o.deliveryDate, o.status, o.grossAmount]);
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `orders_report_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 font-sans">
      
      {/* Top Banner Header */}
      <div className={`p-6 rounded-3xl border transition-all ${
        isDarkMode 
          ? 'bg-slate-900/80 border-slate-800/80 text-white backdrop-blur-xl shadow-2xl' 
          : 'bg-white border-slate-200/90 text-slate-900 shadow-sm'
      }`}>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider ${
                isDarkMode ? 'bg-teal-500/20 text-teal-300 border border-teal-500/30' : 'bg-teal-50 text-teal-800 border border-teal-200'
              }`}>
                Customer PO Spine
              </span>
              <span className="text-xs text-slate-400 font-mono">• Realtime Telemetry</span>
            </div>
            <h1 className={`text-2xl font-bold tracking-tight ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
              Purchase Orders Management
            </h1>
            <p className={`text-xs mt-1 max-w-xl ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
              Track client purchase orders, progress milestones, shopfloor job scheduling, dispatch status, and billing telemetry.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => {
                setNewPoNo(`PO-2026-${Math.floor(100 + Math.random() * 900)}`);
                setShowNewModal(true);
              }}
              className="px-4 py-2.5 rounded-2xl bg-gradient-to-r from-[#5B75F8] to-indigo-600 hover:from-indigo-600 hover:to-[#5B75F8] text-white font-bold text-xs flex items-center gap-2 cursor-pointer shadow-lg shadow-[#5B75F8]/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              <Plus className="w-4 h-4" />
              <span>Create Purchase Order</span>
            </button>
            <button
              type="button"
              onClick={exportCSV}
              title="Export Orders CSV"
              className={`p-2.5 rounded-2xl border transition-all cursor-pointer ${
                isDarkMode ? 'border-slate-800 bg-slate-950/60 text-slate-300 hover:bg-slate-800' : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
              }`}
            >
              <Download className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Telemetry Stat Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
          {/* Card 1: Total Orders */}
          <div className={`p-4 rounded-2xl border transition-all ${
            isDarkMode ? 'bg-slate-950/60 border-slate-800/80' : 'bg-slate-50/80 border-slate-200/80'
          }`}>
            <div className="flex items-center justify-between">
              <span className={`text-xs font-medium ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Total Orders</span>
              <div className={`p-2 rounded-xl ${isDarkMode ? 'bg-[#5B75F8]/20 text-[#7B92FF]' : 'bg-[#5B75F8]/10 text-[#5B75F8]'}`}>
                <ShoppingCart className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2 flex items-baseline justify-between">
              <span className={`text-2xl font-bold font-mono ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{orders.length}</span>
              <span className="text-[11px] font-mono font-semibold text-[#5B75F8]">{activeOrdersCount} Active</span>
            </div>
          </div>

          {/* Card 2: Revenue Pipeline */}
          <div className={`p-4 rounded-2xl border transition-all ${
            isDarkMode ? 'bg-slate-950/60 border-slate-800/80' : 'bg-slate-50/80 border-slate-200/80'
          }`}>
            <div className="flex items-center justify-between">
              <span className={`text-xs font-medium ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Pipeline Value</span>
              <div className={`p-2 rounded-xl ${isDarkMode ? 'bg-emerald-500/20 text-emerald-400' : 'bg-emerald-100 text-emerald-700'}`}>
                <DollarSign className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2 flex items-baseline justify-between">
              <span className={`text-xl font-bold font-mono ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                ₹{totalRevenue.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
              <span className="text-[11px] font-mono font-semibold text-emerald-500">Gross</span>
            </div>
          </div>

          {/* Card 3: In Production */}
          <div className={`p-4 rounded-2xl border transition-all ${
            isDarkMode ? 'bg-slate-950/60 border-slate-800/80' : 'bg-slate-50/80 border-slate-200/80'
          }`}>
            <div className="flex items-center justify-between">
              <span className={`text-xs font-medium ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>In Production</span>
              <div className={`p-2 rounded-xl ${isDarkMode ? 'bg-purple-500/20 text-purple-400' : 'bg-purple-100 text-purple-700'}`}>
                <Clock className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2 flex items-baseline justify-between">
              <span className={`text-2xl font-bold font-mono ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{inProductionCount}</span>
              <span className="text-[11px] font-mono font-semibold text-purple-400">On Shopfloor</span>
            </div>
          </div>

          {/* Card 4: Dispatched / Delivered */}
          <div className={`p-4 rounded-2xl border transition-all ${
            isDarkMode ? 'bg-slate-950/60 border-slate-800/80' : 'bg-slate-50/80 border-slate-200/80'
          }`}>
            <div className="flex items-center justify-between">
              <span className={`text-xs font-medium ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Dispatched / Delivered</span>
              <div className={`p-2 rounded-xl ${isDarkMode ? 'bg-amber-500/20 text-amber-400' : 'bg-amber-100 text-amber-700'}`}>
                <Truck className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2 flex items-baseline justify-between">
              <span className={`text-2xl font-bold font-mono ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{dispatchedCount}</span>
              <span className="text-[11px] font-mono font-semibold text-amber-500">Fulfilled</span>
            </div>
          </div>
        </div>
      </div>

      {/* Controls & Filter Bar */}
      <div className={`p-4 rounded-3xl border transition-all flex flex-wrap items-center justify-between gap-4 ${
        isDarkMode ? 'bg-slate-900/70 border-slate-800/80 backdrop-blur-xl' : 'bg-white border-slate-200 shadow-xs'
      }`}>
        {/* Status Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
          {[
            { id: 'ALL', label: 'All Orders' },
            { id: 'CONFIRMED', label: 'Confirmed' },
            { id: 'IN_PRODUCTION', label: 'In Production' },
            { id: 'PARTIALLY_DISPATCHED', label: 'Partially Dispatched' },
            { id: 'CLOSED', label: 'Closed' },
            { id: 'CANCELLED', label: 'Cancelled' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                statusFilter === tab.id
                  ? isDarkMode 
                    ? 'bg-[#5B75F8]/20 text-[#7B92FF] border border-[#5B75F8]/40 shadow-xs' 
                    : 'bg-[#5B75F8] text-white shadow-xs'
                  : isDarkMode
                    ? 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search & Layout Toggle */}
        <div className="flex items-center gap-3">
          <div className={`relative flex items-center rounded-2xl border px-3 py-1.5 transition-all ${
            isDarkMode ? 'bg-slate-950/80 border-slate-800 text-white focus-within:border-[#5B75F8]/50' : 'bg-slate-50 border-slate-200 text-slate-900 focus-within:border-[#5B75F8]'
          }`}>
            <Search className="w-4 h-4 text-slate-400 shrink-0 mr-2" />
            <input
              type="text"
              placeholder="Search PO # or Customer..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-transparent outline-none text-xs w-48 sm:w-56"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} className="text-slate-400 hover:text-slate-200 ml-1">
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className={`flex items-center p-1 rounded-2xl border ${
            isDarkMode ? 'bg-slate-950 border-slate-800' : 'bg-slate-100 border-slate-200'
          }`}>
            <button
              onClick={() => setViewMode('table')}
              className={`p-1.5 rounded-xl transition-all cursor-pointer ${
                viewMode === 'table' 
                  ? isDarkMode ? 'bg-slate-800 text-[#7B92FF]' : 'bg-white text-[#5B75F8] shadow-xs' 
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Table View"
            >
              <List className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-xl transition-all cursor-pointer ${
                viewMode === 'grid' 
                  ? isDarkMode ? 'bg-slate-800 text-[#7B92FF]' : 'bg-white text-[#5B75F8] shadow-xs' 
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Grid View"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Area: Table or Grid */}
      {viewMode === 'table' ? (
        <div className={`rounded-3xl border overflow-hidden transition-all shadow-xl ${
          isDarkMode ? 'bg-slate-900/80 border-slate-800/80 backdrop-blur-xl' : 'bg-white border-slate-200'
        }`}>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className={`border-b font-mono font-bold uppercase tracking-wider text-[11px] ${
                  isDarkMode ? 'bg-slate-950/60 border-slate-800 text-slate-400' : 'bg-slate-50 border-slate-200 text-slate-500'
                }`}>
                  <th className="py-4 px-5">Purchase Order</th>
                  <th className="py-4 px-5">Customer Name</th>
                  <th className="py-4 px-5">PO Date</th>
                  <th className="py-4 px-5">Target Delivery</th>
                  <th className="py-4 px-5">Status</th>
                  <th className="py-4 px-5">7-Stage Pipeline</th>
                  <th className="py-4 px-5 text-right">Gross Amount</th>
                  <th className="py-4 px-5 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800/60">
                {filteredOrders.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <ShoppingCart className="w-8 h-8 text-slate-400 opacity-50" />
                        <p className={`text-sm font-semibold ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>No purchase orders found</p>
                        <p className="text-xs text-slate-500">Try adjusting your status filter or search term</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredOrders.map((ord) => {
                    const badge = getStatusBadge(ord.status);
                    const BadgeIcon = badge.icon;
                    return (
                      <tr 
                        key={ord.id}
                        onClick={() => onSelectOrder(ord)}
                        className={`group transition-all cursor-pointer ${
                          isDarkMode ? 'hover:bg-slate-800/50' : 'hover:bg-slate-50/80'
                        }`}
                      >
                        {/* PO Number */}
                        <td className="py-4 px-5 font-bold font-mono">
                          <div className="flex items-center gap-2.5">
                            <div className={`p-2 rounded-xl transition-transform group-hover:scale-105 ${
                              isDarkMode ? 'bg-[#5B75F8]/20 text-[#7B92FF]' : 'bg-[#5B75F8]/10 text-[#5B75F8] border border-[#5B75F8]/20'
                            }`}>
                              <ShoppingCart className="w-3.5 h-3.5" />
                            </div>
                            <div>
                              <div className={`text-xs font-bold ${isDarkMode ? 'text-[#7B92FF]' : 'text-[#5B75F8]'}`}>
                                {ord.poNo}
                              </div>
                              <div className="text-[10px] text-slate-400 font-mono font-normal">
                                {ord.lines ? `${ord.lines.length} ${ord.lines.length === 1 ? 'Line Item' : 'Line Items'}` : '0 Items'}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Customer */}
                        <td className={`py-4 px-5 font-semibold ${isDarkMode ? 'text-slate-100' : 'text-slate-800'}`}>
                          {ord.customerName}
                        </td>

                        {/* PO Date */}
                        <td className="py-4 px-5 font-mono text-slate-500 dark:text-slate-400">
                          {ord.poDate}
                        </td>

                        {/* Target Delivery */}
                        <td className="py-4 px-5 font-mono text-slate-500 dark:text-slate-400">
                          <div className="flex items-center gap-1.5">
                            <Clock className="w-3 h-3 text-amber-500" />
                            <span>{ord.deliveryDate}</span>
                          </div>
                        </td>

                        {/* Status */}
                        <td className="py-4 px-5">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-[10px] font-mono font-bold uppercase border ${badge.bg}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${badge.dot}`} />
                            <span>{badge.label}</span>
                          </span>
                        </td>

                        {/* 7-Stage Pipeline */}
                        <td className="py-4 px-5">
                          <div className="flex items-center gap-1">
                            {['Confirmed', 'Production', 'PDI', 'Dispatched', 'Delivered', 'Invoiced', 'Paid'].map((stepName, idx) => {
                              const isComplete = idx <= ord.progressStep;
                              return (
                                <div key={stepName} className="flex items-center" title={`${stepName}: ${isComplete ? 'Done' : 'Pending'}`}>
                                  <div className={`w-2.5 h-2.5 rounded-full transition-colors ${
                                    isComplete 
                                      ? 'bg-gradient-to-r from-amber-500 to-orange-500 shadow-xs' 
                                      : isDarkMode ? 'bg-slate-800 border border-slate-700' : 'bg-slate-200 border border-slate-300'
                                  }`} />
                                  {idx < 6 && (
                                    <div className={`w-2.5 h-0.5 ${
                                      isComplete ? 'bg-amber-500' : isDarkMode ? 'bg-slate-800' : 'bg-slate-200'
                                    }`} />
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </td>

                        {/* Gross Amount */}
                        <td className={`py-4 px-5 text-right font-bold font-mono text-sm ${
                          isDarkMode ? 'text-white' : 'text-slate-900'
                        }`}>
                          ₹{ord.grossAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </td>

                        {/* Action */}
                        <td className="py-4 px-5 text-center">
                          <button className={`p-2 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1 mx-auto text-xs font-bold ${
                            isDarkMode 
                              ? 'bg-[#5B75F8]/10 text-[#7B92FF] hover:bg-[#5B75F8]/20 border border-[#5B75F8]/30' 
                              : 'bg-[#5B75F8]/10 text-[#5B75F8] hover:bg-[#5B75F8]/20 border border-[#5B75F8]/20'
                          }`}>
                            <span>Spine</span>
                            <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Table Footer Bar */}
          <div className={`p-4 border-t flex flex-wrap items-center justify-between gap-3 text-xs font-mono font-bold ${
            isDarkMode ? 'bg-slate-950/80 border-slate-800 text-slate-300' : 'bg-slate-50 border-slate-200 text-slate-700'
          }`}>
            <span>Showing {filteredOrders.length} Purchase Orders</span>
            <div className="flex items-center gap-3">
              <span>Total Revenue:</span>
              <span className="text-sm font-bold text-emerald-500">
                ₹{filteredOrders.reduce((sum, o) => sum + o.grossAmount, 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>
        </div>
      ) : (
        /* Grid View */
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredOrders.map((ord) => {
            const badge = getStatusBadge(ord.status);
            return (
              <div
                key={ord.id}
                onClick={() => onSelectOrder(ord)}
                className={`p-5 rounded-3xl border transition-all cursor-pointer group hover:scale-[1.01] shadow-lg flex flex-col justify-between gap-4 ${
                  isDarkMode 
                    ? 'bg-slate-900/80 border-slate-800/80 hover:border-slate-700 backdrop-blur-xl text-white' 
                    : 'bg-white border-slate-200 hover:border-slate-300 text-slate-900'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <div className="flex items-center gap-2">
                      <div className={`p-2.5 rounded-2xl ${isDarkMode ? 'bg-[#5B75F8]/20 text-[#7B92FF]' : 'bg-[#5B75F8]/10 text-[#5B75F8] border border-[#5B75F8]/20'}`}>
                        <ShoppingCart className="w-4 h-4" />
                      </div>
                      <div>
                        <h3 className="font-bold text-sm font-mono text-[#5B75F8] dark:text-[#7B92FF]">{ord.poNo}</h3>
                        <p className="text-[11px] text-slate-400 font-medium">{ord.customerName}</p>
                      </div>
                    </div>

                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-[10px] font-mono font-bold uppercase border ${badge.bg}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${badge.dot}`} />
                      <span>{badge.label}</span>
                    </span>
                  </div>

                  <div className={`p-3 rounded-2xl border space-y-2 text-xs font-mono ${
                    isDarkMode ? 'bg-slate-950/60 border-slate-800/80' : 'bg-slate-50 border-slate-200'
                  }`}>
                    <div className="flex justify-between">
                      <span className="text-slate-400">PO Date:</span>
                      <span className="font-semibold">{ord.poDate}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Target Delivery:</span>
                      <span className="font-semibold text-amber-500">{ord.deliveryDate}</span>
                    </div>
                    <div className="flex justify-between border-t border-slate-200 dark:border-slate-800/80 pt-2">
                      <span className="text-slate-400">Gross Amount:</span>
                      <span className="font-bold text-emerald-500">₹{ord.grossAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-slate-200 dark:border-slate-800/80">
                  <span className="text-[11px] text-slate-400 font-mono">{ord.lines?.length || 0} Line Items</span>
                  <button className={`px-3 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 cursor-pointer ${
                    isDarkMode ? 'bg-[#5B75F8]/10 text-[#7B92FF] group-hover:bg-[#5B75F8]/20' : 'bg-[#5B75F8]/10 text-[#5B75F8] group-hover:bg-[#5B75F8]/20'
                  }`}>
                    <span>View Spine</span>
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Ultra-Polished Create PO Modal */}
      {showNewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md font-sans">
          <div className={`relative w-full max-w-2xl rounded-3xl border shadow-2xl transition-all overflow-hidden ${
            isDarkMode 
              ? 'bg-slate-900/95 border-slate-800/80 text-white backdrop-blur-2xl shadow-[#5B75F8]/5' 
              : 'bg-white border-slate-200 text-slate-900 shadow-2xl'
          }`}>
            {/* Modal Header */}
            <div className={`p-6 border-b flex items-center justify-between ${isDarkMode ? 'border-slate-800/80 bg-slate-950/40' : 'border-slate-200 bg-slate-50/60'}`}>
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-2xl bg-[#5B75F8]/15 text-[#5B75F8] border border-[#5B75F8]/30">
                  <Plus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className={`font-bold text-base tracking-tight ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                    Create New Customer Purchase Order
                  </h3>
                  <p className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                    Initialize order spine & line items for production scheduling
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowNewModal(false)}
                className={`p-2 rounded-2xl border transition-all cursor-pointer ${
                  isDarkMode 
                    ? 'border-slate-800 bg-slate-950/60 text-slate-400 hover:text-white hover:bg-slate-800' 
                    : 'border-slate-200 bg-slate-50 text-slate-500 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body Form */}
            <form onSubmit={handleCreateSubmit} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto font-sans">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-mono font-bold uppercase text-slate-400 mb-1.5">PO Number *</label>
                  <div className="relative flex items-center">
                    <input
                      type="text"
                      required
                      value={newPoNo}
                      onChange={(e) => setNewPoNo(e.target.value)}
                      placeholder="e.g. PO-2026-901"
                      className={`w-full rounded-2xl border px-4 py-3 pr-28 text-xs font-mono outline-none transition-all ${
                        isDarkMode 
                          ? 'bg-slate-950/80 border-slate-800 text-white focus:border-[#5B75F8] focus:ring-2 focus:ring-[#5B75F8]/20' 
                          : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-[#5B75F8] focus:ring-2 focus:ring-[#5B75F8]/10'
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => setNewPoNo(`PO-2026-${Math.floor(100 + Math.random() * 900)}`)}
                      className="absolute right-2.5 px-3 py-1.5 rounded-xl bg-[#5B75F8]/15 hover:bg-[#5B75F8]/25 text-[#7B92FF] border border-[#5B75F8]/30 text-[10px] font-mono font-bold cursor-pointer transition-all"
                    >
                      Generate PO
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-[11px] font-mono font-bold uppercase text-slate-400 mb-1.5">Customer Name *</label>
                  <input
                    type="text"
                    required
                    value={newCustomer}
                    onChange={(e) => setNewCustomer(e.target.value)}
                    placeholder="e.g. Tata Motors Components"
                    className={`w-full rounded-2xl border px-4 py-3 text-xs outline-none transition-all ${
                      isDarkMode 
                        ? 'bg-slate-950/80 border-slate-800 text-white focus:border-[#5B75F8] focus:ring-2 focus:ring-[#5B75F8]/20' 
                        : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-[#5B75F8] focus:ring-2 focus:ring-[#5B75F8]/10'
                    }`}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-[11px] font-mono font-bold uppercase text-slate-400 mb-1.5">PO Date</label>
                  <input
                    type="date"
                    value={newPoDate}
                    onChange={(e) => setNewPoDate(e.target.value)}
                    className={`w-full rounded-2xl border px-3.5 py-2.5 text-xs font-mono outline-none ${
                      isDarkMode ? 'bg-slate-950/80 border-slate-800 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                    }`}
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-mono font-bold uppercase text-slate-400 mb-1.5">Delivery Target</label>
                  <input
                    type="date"
                    value={newDeliveryDate}
                    onChange={(e) => setNewDeliveryDate(e.target.value)}
                    className={`w-full rounded-2xl border px-3.5 py-2.5 text-xs font-mono outline-none ${
                      isDarkMode ? 'bg-slate-950/80 border-slate-800 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                    }`}
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-mono font-bold uppercase text-slate-400 mb-1.5">Tax Category</label>
                  <select
                    value={newTaxCategory}
                    onChange={(e) => setNewTaxCategory(e.target.value)}
                    className={`w-full rounded-2xl border px-3.5 py-2.5 text-xs font-mono font-bold outline-none cursor-pointer ${
                      isDarkMode ? 'bg-slate-950/80 border-slate-800 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                    }`}
                  >
                    <option value="GST 18%">GST 18%</option>
                    <option value="GST 12%">GST 12%</option>
                    <option value="GST 28%">GST 28%</option>
                    <option value="EXEMPT">EXEMPT</option>
                  </select>
                </div>
              </div>

              {/* Dynamic Line Items Section */}
              <div className="pt-3 border-t border-slate-200 dark:border-slate-800/80 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold font-mono uppercase text-[#5B75F8]">Order Line Items</span>
                  <button
                    type="button"
                    onClick={addLineItem}
                    className="px-3 py-1.5 rounded-xl bg-[#5B75F8]/15 text-[#7B92FF] hover:bg-[#5B75F8]/25 border border-[#5B75F8]/30 text-xs font-bold font-mono flex items-center gap-1 cursor-pointer transition-all"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Item</span>
                  </button>
                </div>

                <div className="space-y-3">
                  {lines.map((line, idx) => (
                    <div
                      key={idx}
                      className={`p-4 rounded-2xl border space-y-3 ${
                        isDarkMode ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50/80 border-slate-200'
                      }`}
                    >
                      <div className="flex items-center justify-between text-xs font-bold font-mono text-slate-400">
                        <span>Line Item #{idx + 1}</span>
                        {lines.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeLineItem(idx)}
                            className="text-rose-400 hover:text-rose-300 font-bold cursor-pointer"
                          >
                            Remove
                          </button>
                        )}
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <input
                          type="text"
                          placeholder="Part Code"
                          value={line.itemCode}
                          onChange={(e) => updateLineItem(idx, 'itemCode', e.target.value)}
                          className={`rounded-xl border px-3.5 py-2 text-xs font-mono outline-none ${
                            isDarkMode ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
                          }`}
                        />
                        <input
                          type="text"
                          placeholder="Part Description"
                          value={line.itemDescription}
                          onChange={(e) => updateLineItem(idx, 'itemDescription', e.target.value)}
                          className={`sm:col-span-2 rounded-xl border px-3.5 py-2 text-xs outline-none ${
                            isDarkMode ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
                          }`}
                        />
                      </div>

                      <div className="grid grid-cols-3 gap-3">
                        <div>
                          <label className="block text-[10px] font-mono text-slate-400 uppercase mb-1">Order Qty</label>
                          <input
                            type="number"
                            value={line.orderQty}
                            onChange={(e) => updateLineItem(idx, 'orderQty', Number(e.target.value))}
                            className={`w-full rounded-xl border px-3 py-1.5 text-xs font-mono font-bold outline-none ${
                              isDarkMode ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
                            }`}
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-mono text-slate-400 uppercase mb-1">Unit Rate ₹</label>
                          <input
                            type="number"
                            value={line.rate}
                            onChange={(e) => updateLineItem(idx, 'rate', Number(e.target.value))}
                            className={`w-full rounded-xl border px-3 py-1.5 text-xs font-mono outline-none ${
                              isDarkMode ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
                            }`}
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-mono text-slate-400 uppercase mb-1">Line Total</label>
                          <div className="px-3 py-1.5 font-mono font-bold text-xs text-emerald-500">
                            ₹{(Number(line.orderQty) * Number(line.rate)).toLocaleString('en-IN')}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Total Summary */}
              <div className={`p-4 rounded-2xl border flex items-center justify-between font-mono ${
                isDarkMode ? 'bg-slate-950/80 border-slate-800 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
              }`}>
                <span className="text-xs font-bold uppercase text-slate-400">Calculated PO Gross Amount</span>
                <span className="text-lg font-bold text-emerald-500">
                  ₹{totalCalculatedGross.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
              </div>

              {/* Action Buttons */}
              <div className="pt-4 border-t border-slate-200 dark:border-slate-800/80 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowNewModal(false)}
                  className={`px-5 py-2.5 rounded-2xl border text-xs font-mono font-bold transition-all cursor-pointer ${
                    isDarkMode 
                      ? 'border-slate-800 bg-slate-950/60 text-slate-300 hover:bg-slate-800' 
                      : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-2xl bg-gradient-to-r from-[#5B75F8] to-indigo-600 hover:from-indigo-600 hover:to-[#5B75F8] text-white font-bold text-xs font-mono cursor-pointer shadow-lg shadow-[#5B75F8]/25 transition-all hover:scale-[1.02] active:scale-[0.98]"
                >
                  Create PO Record
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default OrdersView;
