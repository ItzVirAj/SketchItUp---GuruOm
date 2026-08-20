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
  Tag,
  AlertTriangle,
  Flame,
  Layers,
  FileSpreadsheet,
  RefreshCw
} from 'lucide-react';
import { CustomerOrder, OrderStatus, OrderLineItem, CustomerMaster, QCInspection, MasterItem } from '../../../types/console';
import { ORDER_STAGE_LABELS, ORDER_STAGE_STEPS, OrderStage, OrderSubType } from '../../../utils/orderStateMachine';
import { Modal } from '../../common/Modal';

interface OrdersViewProps {
  orders: CustomerOrder[];
  qcQueue?: QCInspection[];
  customers?: CustomerMaster[];
  masters?: MasterItem[];
  isDarkMode: boolean;
  onSelectOrder: (order: CustomerOrder) => void;
  onCreateOrder: (newOrder: Partial<CustomerOrder>) => void;
  onNavigateToCustomers?: () => void;
  onNavigateToMasters?: () => void;
}

export const OrdersView: React.FC<OrdersViewProps> = ({
  orders,
  qcQueue = [],
  customers = [],
  masters = [],
  isDarkMode,
  onSelectOrder,
  onCreateOrder,
  onNavigateToCustomers,
  onNavigateToMasters
}) => {
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [subTypeFilter, setSubTypeFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState<'RECENCY' | 'PO_NO' | 'CUSTOMER' | 'AMOUNT'>('RECENCY');
  const [sortDirection, setSortDirection] = useState<'ASC' | 'DESC'>('DESC');
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');
  const [showNewModal, setShowNewModal] = useState(false);

  // New order form state
  const [newSubType, setNewSubType] = useState<OrderSubType>('FRESH_PO');
  const [newBlanketPoId, setNewBlanketPoId] = useState('');
  const [newBlanketBalance, setNewBlanketBalance] = useState(500);
  const [newPoNo, setNewPoNo] = useState('');
  const [newCustomer, setNewCustomer] = useState('');
  const [selectedCustomerCode, setSelectedCustomerCode] = useState('');
  const [newPoDate, setNewPoDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [newDeliveryDate, setNewDeliveryDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 14);
    return d.toISOString().split('T')[0];
  });
  const [newTaxCategory, setNewTaxCategory] = useState('GST 18%');
  const [newRemark, setNewRemark] = useState('');

  // Credit Hold Override State
  const [isCustomerCreditHeld, setIsCustomerCreditHeld] = useState(false);
  const [creditOverrideBy, setCreditOverrideBy] = useState('');
  const [creditOverrideReason, setCreditOverrideReason] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);

  // Line items state - indexed to Master Items
  const [lines, setLines] = useState<Array<{
    itemCode: string;
    itemDescription: string;
    custPartNo: string;
    orderQty: number;
    unit: string;
    rate: number;
    drawingRevision: string;
  }>>(() => {
    return [
      {
        itemCode: 'ITEM-0002',
        itemDescription: 'Boom Bracket Sub-assembly',
        custPartNo: 'DWG-BRK-2026',
        orderQty: 100,
        unit: 'Nos',
        rate: 1850,
        drawingRevision: 'REV-A'
      }
    ];
  });

  const handleSelectItemForLine = (index: number, code: string) => {
    if (code === 'CUSTOM_ITEM') {
      setLines(prev => prev.map((line, i) => i === index ? {
        ...line,
        itemCode: 'CUSTOM',
        itemDescription: line.itemDescription || 'Custom Special Component',
        custPartNo: line.custPartNo || '',
        unit: line.unit || 'Nos',
        rate: line.rate || 100
      } : line));
      return;
    }

    const found = masters.find(m => m.code === code || m.id === code);
    if (found) {
      const defaultRate = Number(found.sellingPrice || found.saleRate || (found.standardCost ? found.standardCost : 100));
      setLines(prev => prev.map((line, i) => i === index ? {
        ...line,
        itemCode: found.code,
        itemDescription: found.name || found.description || found.partNo || '',
        custPartNo: found.partNo || found.code,
        unit: found.unit || 'Nos',
        rate: defaultRate > 0 ? defaultRate : (line.rate || 100),
        drawingRevision: line.drawingRevision || 'REV-A'
      } : line));
    } else {
      updateLineItem(index, 'itemCode', code);
    }
  };

  const addLineItem = () => {
    // Pick the next available master item if present
    const availableMaster = masters[lines.length % Math.max(1, masters.length)];
    if (availableMaster) {
      const defaultRate = Number(availableMaster.sellingPrice || availableMaster.saleRate || (availableMaster.standardCost ? availableMaster.standardCost : 100));
      setLines(prev => [
        ...prev,
        {
          itemCode: availableMaster.code,
          itemDescription: availableMaster.name || availableMaster.description || availableMaster.partNo || '',
          custPartNo: availableMaster.partNo || availableMaster.code,
          orderQty: 50,
          unit: availableMaster.unit || 'Nos',
          rate: defaultRate > 0 ? defaultRate : 100,
          drawingRevision: 'REV-A'
        }
      ]);
    } else {
      setLines(prev => [
        ...prev,
        {
          itemCode: `ITEM-000${prev.length + 1}`,
          itemDescription: 'NEW COMPONENT PART',
          custPartNo: '',
          orderQty: 50,
          unit: 'Nos',
          rate: 100,
          drawingRevision: 'REV-A'
        }
      ]);
    }
  };

  const removeLineItem = (index: number) => {
    if (lines.length <= 1) return;
    setLines(prev => prev.filter((_, i) => i !== index));
  };

  const updateLineItem = (index: number, field: string, value: any) => {
    setLines(prev => prev.map((line, i) => i === index ? { ...line, [field]: value } : line));
  };

  const totalCalculatedGross = lines.reduce((sum, l) => sum + (Number(l.orderQty) * Number(l.rate)), 0);
  const totalOrderQty = lines.reduce((sum, l) => sum + Number(l.orderQty || 0), 0);

  const handleSelectCustomer = (code: string) => {
    setSelectedCustomerCode(code);
    const found = customers.find(c => c.code === code || c.id === code);
    if (found) {
      setNewCustomer(found.name);
      // Simulate customer credit check
      if (found.name.toLowerCase().includes('mahindra') || found.notes?.toLowerCase().includes('overdue') || (found as any).isOverdue) {
        setIsCustomerCreditHeld(true);
      } else {
        setIsCustomerCreditHeld(false);
        setCreditOverrideBy('');
        setCreditOverrideReason('');
      }
    } else {
      setNewCustomer('');
      setIsCustomerCreditHeld(false);
    }
  };

  const selectedCustomer = customers.find(c => c.code === selectedCustomerCode || c.id === selectedCustomerCode);

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    // Customer Master Validation
    if (!newCustomer || !selectedCustomerCode) {
      if (customers.length === 0) {
        setValidationError('No Customer Master found. Please create a customer in the Customers master first.');
      } else {
        setValidationError('Please select a valid customer from the Customer Master.');
      }
      return;
    }

    // Customer Credit Hold Check
    if (isCustomerCreditHeld) {
      if (!creditOverrideBy || !creditOverrideReason) {
        setValidationError(`Customer Credit Hold Gate Blocked: "${newCustomer}" has overdue receivables exceeding 90 days. An explicit Owner-level override authorization and reason are mandatory.`);
        return;
      }
    }

    // Line Items Validation
    if (lines.length === 0) {
      setValidationError('At least one order line item is required.');
      return;
    }
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (!line.itemCode || !line.itemDescription) {
        setValidationError(`Line ${i + 1}: Please select a valid item from the Master Item Catalog.`);
        return;
      }
      if (Number(line.orderQty) <= 0) {
        setValidationError(`Line ${i + 1}: Order quantity must be greater than 0.`);
        return;
      }
      if (Number(line.rate) < 0) {
        setValidationError(`Line ${i + 1}: Unit rate cannot be negative.`);
        return;
      }
    }

    onCreateOrder({
      id: `ord-${Date.now()}`,
      poNo: newPoNo,
      customerName: newCustomer,
      poDate: newPoDate,
      orderDate: newPoDate,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      deliveryDate: newDeliveryDate,
      status: 'CONFIRMED',
      stage: 'PO_RECEIVED',
      progressStep: 1,
      grossAmount: totalCalculatedGross,
      taxCategory: newTaxCategory,
      remark: newRemark,
      subType: newSubType,
      blanketPoId: newSubType === 'BLANKET_CALLOFF' ? newBlanketPoId : undefined,
      blanketPoBalance: newSubType === 'BLANKET_CALLOFF' ? newBlanketBalance - totalOrderQty : undefined,
      drawingRevision: 'REV-A',
      masterDrawingRevision: 'REV-A',
      isDrawingRevisionMatched: true,
      isCustomerOnCreditHold: isCustomerCreditHeld,
      creditHoldOverrideBy: isCustomerCreditHeld ? creditOverrideBy : undefined,
      creditHoldOverrideReason: isCustomerCreditHeld ? creditOverrideReason : undefined,
      lines: lines.map((l, idx) => ({
        id: `line-${Date.now()}-${idx}`,
        itemCode: l.itemCode,
        itemDescription: l.itemDescription,
        custPartNo: l.custPartNo,
        orderQty: l.orderQty,
        unit: l.unit,
        rate: l.rate,
        dispatchedQty: 0,
        pendingQty: l.orderQty,
        drawingRevision: l.drawingRevision
      })),
      jobCards: [],
      dispatches: []
    });

    setShowNewModal(false);
  };

  const filteredOrders = orders.filter(o => {
    const matchesStatus = statusFilter === 'ALL' || o.status === statusFilter || o.stage === statusFilter;
    const matchesSubType = subTypeFilter === 'ALL' || o.subType === subTypeFilter;
    const matchesSearch = o.poNo.toLowerCase().includes(searchQuery.toLowerCase()) ||
      o.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (o.drawingRevision || '').toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSubType && matchesSearch;
  });

  // Helper to parse date strings across multiple international and ISO formats
  const parseDateToTimestamp = (val?: string | number | null): number => {
    if (!val) return 0;
    if (typeof val === 'number') return val > 0 ? val : 0;
    const str = String(val).trim();
    if (!str) return 0;

    // 1. Numeric timestamp string (e.g. '1786858123456')
    if (/^\d{10,13}$/.test(str)) {
      const num = parseInt(str, 10);
      if (!isNaN(num) && num > 0) return num;
    }

    // 2. ID with embedded timestamp (e.g. 'ord-1786858123456')
    const idMatch = str.match(/ord-(\d{10,13})/);
    if (idMatch) {
      const num = parseInt(idMatch[1], 10);
      if (!isNaN(num) && num > 0) return num;
    }

    // 3. Indian / British date format DD/MM/YYYY or DD-MM-YYYY
    const ddmmyyyy = str.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
    if (ddmmyyyy) {
      const day = parseInt(ddmmyyyy[1], 10);
      const month = parseInt(ddmmyyyy[2], 10) - 1;
      const year = parseInt(ddmmyyyy[3], 10);
      const d = new Date(year, month, day).getTime();
      if (!isNaN(d) && d > 0) return d;
    }

    // 4. ISO format YYYY-MM-DD or standard parseable string
    const parsed = new Date(str).getTime();
    if (!isNaN(parsed) && parsed > 0) {
      return parsed;
    }

    return 0;
  };

  // Helper to extract robust timestamp from order records
  const getOrderTime = (o: CustomerOrder): number => {
    if (o.createdAt) {
      const t = parseDateToTimestamp(o.createdAt);
      if (t > 0) return t;
    }
    const idTime = parseDateToTimestamp(o.id);
    if (idTime > 0) return idTime;

    if (o.poDate) {
      const t = parseDateToTimestamp(o.poDate);
      if (t > 0) return t;
    }
    if (o.orderDate) {
      const t = parseDateToTimestamp(o.orderDate);
      if (t > 0) return t;
    }
    if (o.deliveryDate) {
      const t = parseDateToTimestamp(o.deliveryDate);
      if (t > 0) return t;
    }

    return 0;
  };

  const sortedOrders = [...filteredOrders].sort((a, b) => {
    if (sortField === 'PO_NO') {
      const cmp = a.poNo.localeCompare(b.poNo, undefined, { numeric: true });
      return sortDirection === 'ASC' ? cmp : -cmp;
    }
    if (sortField === 'CUSTOMER') {
      const cmp = a.customerName.localeCompare(b.customerName);
      return sortDirection === 'ASC' ? cmp : -cmp;
    }
    if (sortField === 'AMOUNT') {
      const cmp = (a.grossAmount || 0) - (b.grossAmount || 0);
      return sortDirection === 'ASC' ? cmp : -cmp;
    }
    // Default RECENCY: newest orders first (createdAt / poDate / ID DESC)
    const timeB = getOrderTime(b);
    const timeA = getOrderTime(a);
    if (timeB !== timeA) {
      return sortDirection === 'ASC' ? timeA - timeB : timeB - timeA;
    }
    return sortDirection === 'ASC'
      ? String(a.id || a.poNo).localeCompare(String(b.id || b.poNo), undefined, { numeric: true })
      : String(b.id || b.poNo).localeCompare(String(a.id || a.poNo), undefined, { numeric: true });
  });

  const getStatusBadge = (status: string, stage?: string) => {
    const key = stage || status;
    switch (key) {
      case 'PO_RECEIVED':
      case 'CONFIRMED':
        return {
          bg: isDarkMode ? 'bg-blue-500/15 text-blue-400 border-blue-500/30' : 'bg-blue-50 text-blue-700 border-blue-200',
          dot: 'bg-blue-500',
          label: '1. PO Received'
        };
      case 'MATERIAL_CHECKED':
        return {
          bg: isDarkMode ? 'bg-indigo-500/15 text-indigo-400 border-indigo-500/30' : 'bg-indigo-50 text-indigo-700 border-indigo-200',
          dot: 'bg-indigo-500',
          label: '3. Material Checked'
        };
      case 'MATERIAL_ISSUED':
      case 'IN_PRODUCTION':
        return {
          bg: isDarkMode ? 'bg-amber-500/15 text-amber-400 border-amber-500/30' : 'bg-amber-50 text-amber-800 border-amber-200',
          dot: 'bg-amber-500',
          label: '5. In Production'
        };
      case 'QC_INSPECTION':
        return {
          bg: isDarkMode ? 'bg-purple-500/15 text-purple-400 border-purple-500/30' : 'bg-purple-50 text-purple-700 border-purple-200',
          dot: 'bg-purple-500',
          label: '6. QC Cleared'
        };
      case 'READY_TO_DISPATCH':
        return {
          bg: isDarkMode ? 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30' : 'bg-cyan-50 text-cyan-700 border-cyan-200',
          dot: 'bg-cyan-500',
          label: '7. Ready to Dispatch'
        };
      case 'DISPATCHED':
        return {
          bg: isDarkMode ? 'bg-teal-500/15 text-teal-400 border-teal-500/30' : 'bg-teal-50 text-teal-700 border-teal-200',
          dot: 'bg-teal-500',
          label: '8. Dispatched'
        };
      case 'INVOICED':
        return {
          bg: isDarkMode ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' : 'bg-emerald-50 text-emerald-700 border-emerald-200',
          dot: 'bg-emerald-500',
          label: '9. Invoiced'
        };
      case 'CLOSED':
      case 'PAID':
        return {
          bg: isDarkMode ? 'bg-slate-500/15 text-slate-400 border-slate-500/30' : 'bg-slate-100 text-slate-700 border-slate-300',
          dot: 'bg-slate-500',
          label: '10. Closed'
        };
      default:
        return {
          bg: isDarkMode ? 'bg-blue-500/15 text-blue-400 border-blue-500/30' : 'bg-blue-50 text-blue-700 border-blue-200',
          dot: 'bg-blue-500',
          label: status
        };
    }
  };

  // Calculated KPI stats
  const totalActiveValue = orders.reduce((sum, o) => sum + (o.grossAmount || 0), 0);
  const inProdCount = orders.filter(o => o.status === 'IN_PRODUCTION' || o.stage === 'IN_PRODUCTION' || o.status === 'JOB_RELEASED').length;
  const qcGateCount = orders.filter(o => o.status === 'QC_INSPECTION' || o.stage === 'QC_INSPECTION' || o.stage === 'QC').length;
  const dispatchReadyCount = orders.filter(o => o.status === 'READY_TO_DISPATCH' || o.stage === 'READY_TO_DISPATCH' || o.status === 'DISPATCHED').length;

  return (
    <div className="space-y-6 font-sans">

      {/* Hero Header Banner */}
      <div className={`p-6 rounded-3xl border transition-all ${isDarkMode
        ? 'bg-slate-900/80 border-slate-800/80 text-white backdrop-blur-xl shadow-2xl'
        : 'bg-white border-slate-200 shadow-sm text-slate-900'
        }`}>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider ${isDarkMode ? 'bg-[#5B75F8]/20 text-[#7B92FF] border border-[#5B75F8]/30' : 'bg-[#5B75F8]/10 text-[#5B75F8] border border-[#5B75F8]/20'
                }`}>
                Sales & Order Management Hub
              </span>
              <span className={`text-xs font-mono ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>• 10-Stage State Machine with Hard Precondition Gates</span>
            </div>
            <h1 className={`text-2xl font-bold tracking-tight ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
              Sales Orders & Blanket Call-Offs
            </h1>
            <p className={`text-xs mt-1 max-w-xl ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
              Enforce BOM Drawing Revision Matching, 90-Day Credit Limits, Material Availability Checks, and Job Card Traceability through Final Invoicing.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                setValidationError(null);
                setNewPoNo(`PO-2026-${Math.floor(100 + Math.random() * 900)}`);
                if (customers.length > 0) {
                  const defaultCust = customers[0];
                  setSelectedCustomerCode(defaultCust.code);
                  setNewCustomer(defaultCust.name);
                  if (defaultCust.name.toLowerCase().includes('mahindra') || defaultCust.notes?.toLowerCase().includes('overdue') || (defaultCust as any).isOverdue) {
                    setIsCustomerCreditHeld(true);
                  } else {
                    setIsCustomerCreditHeld(false);
                    setCreditOverrideBy('');
                    setCreditOverrideReason('');
                  }
                } else {
                  setSelectedCustomerCode('');
                  setNewCustomer('');
                  setIsCustomerCreditHeld(false);
                  setCreditOverrideBy('');
                  setCreditOverrideReason('');
                }
                setShowNewModal(true);
              }}
              className="px-4 py-2.5 rounded-2xl bg-gradient-to-r from-[#5B75F8] to-indigo-600 hover:from-indigo-600 hover:to-[#5B75F8] text-white font-bold text-xs flex items-center gap-2 cursor-pointer shadow-lg shadow-[#5B75F8]/20 hover:scale-[1.02] active:scale-[0.98] transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>Create Purchase Order</span>
            </button>
          </div>
        </div>
      </div>

      {/* 4 Executive KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 font-mono">
        <div className={`p-4 sm:p-5 rounded-3xl border transition-all ${isDarkMode ? 'bg-slate-900/70 border-slate-800/80' : 'bg-white border-slate-200 shadow-xs'
          }`}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Active Order Book</span>
            <div className="p-2 rounded-xl bg-indigo-500/15 text-[#7B92FF]">
              <FileSpreadsheet className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl font-bold text-indigo-600 dark:text-[#7B92FF]">
            {orders.length} <span className="text-xs font-normal text-slate-400">orders</span>
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            Total Pipeline Value: <strong className="text-emerald-500 font-bold">₹{totalActiveValue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</strong>
          </div>
        </div>

        <div className={`p-4 sm:p-5 rounded-3xl border transition-all ${isDarkMode ? 'bg-slate-900/70 border-slate-800/80' : 'bg-white border-slate-200 shadow-xs'
          }`}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Shop-Floor In Production</span>
            <div className="p-2 rounded-xl bg-amber-500/15 text-amber-500">
              <RefreshCw className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl font-bold text-amber-600 dark:text-amber-400">
            {inProdCount} <span className="text-xs font-normal text-slate-400">active</span>
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            <span>Machine routing in progress</span>
          </div>
        </div>

        <div className={`p-4 sm:p-5 rounded-3xl border transition-all ${isDarkMode ? 'bg-slate-900/70 border-slate-800/80' : 'bg-white border-slate-200 shadow-xs'
          }`}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">QC & NCR Gates</span>
            <div className="p-2 rounded-xl bg-purple-500/15 text-purple-500">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl font-bold text-purple-600 dark:text-purple-400">
            {qcGateCount} <span className="text-xs font-normal text-slate-400">in inspection</span>
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            <span>QA gating enforced</span>
          </div>
        </div>

        <div className={`p-4 sm:p-5 rounded-3xl border transition-all ${isDarkMode ? 'bg-slate-900/70 border-slate-800/80' : 'bg-white border-slate-200 shadow-xs'
          }`}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Dispatch / Ready</span>
            <div className="p-2 rounded-xl bg-emerald-500/15 text-emerald-500">
              <Truck className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl font-bold text-emerald-600 dark:text-emerald-400">
            {dispatchReadyCount} <span className="text-xs font-normal text-slate-400">orders</span>
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            <span>4-Way clearance verified</span>
          </div>
        </div>
      </div>

      <div className={`p-4 rounded-3xl border transition-all flex flex-wrap items-center justify-between gap-4 ${isDarkMode ? 'bg-slate-900/70 border-slate-800/80 backdrop-blur-xl' : 'bg-white border-slate-200 shadow-xs'
        }`}>
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={subTypeFilter}
            onChange={(e) => setSubTypeFilter(e.target.value)}
            className={`px-3 py-1.5 rounded-2xl border text-xs font-mono font-bold outline-none cursor-pointer ${isDarkMode ? 'bg-slate-950/80 border-slate-800 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
              }`}
          >
            <option value="ALL">All Order Types ({orders.length})</option>
            <option value="FRESH_PO">Fresh POs ({orders.filter(o => (o.subType || 'FRESH_PO') === 'FRESH_PO').length})</option>
            <option value="BLANKET_CALLOFF">Blanket Call-Offs ({orders.filter(o => o.subType === 'BLANKET_CALLOFF').length})</option>
            <option value="AMENDMENT">Amendments ({orders.filter(o => o.subType === 'AMENDMENT').length})</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className={`px-3 py-1.5 rounded-2xl border text-xs font-mono font-bold outline-none cursor-pointer ${isDarkMode ? 'bg-slate-950/80 border-slate-800 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
              }`}
          >
            <option value="ALL">All Stages ({orders.length})</option>
            <option value="PO_RECEIVED">1. PO Received</option>
            <option value="CONFIRMED">2. Confirmed & Released</option>
            <option value="MATERIAL_CHECKED">3. Material Checked</option>
            <option value="IN_PRODUCTION">5. In Production</option>
            <option value="QC_INSPECTION">6. QC Cleared</option>
            <option value="READY_TO_DISPATCH">7. Ready to Dispatch</option>
            <option value="DISPATCHED">8. Dispatched</option>
            <option value="INVOICED">9. Invoiced</option>
          </select>

          <select
            value={`${sortField}_${sortDirection}`}
            onChange={(e) => {
              const [field, dir] = e.target.value.split('_');
              setSortField(field as any);
              setSortDirection(dir as any);
            }}
            className={`px-3 py-1.5 rounded-2xl border text-xs font-mono font-bold outline-none cursor-pointer ${sortField === 'RECENCY' && sortDirection === 'DESC'
              ? isDarkMode ? 'bg-[#5B75F8]/20 border-[#5B75F8]/40 text-[#7B92FF]' : 'bg-blue-50 border-blue-200 text-[#5B75F8]'
              : isDarkMode ? 'bg-slate-950/80 border-slate-800 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
              }`}
          >
            <option value="RECENCY_DESC">Sort: Recent Orders (Newest First)</option>
            <option value="RECENCY_ASC">Sort: Oldest Orders First</option>
            <option value="PO_NO_ASC">Sort: PO Number (A → Z)</option>
            <option value="PO_NO_DESC">Sort: PO Number (Z → A)</option>
            <option value="CUSTOMER_ASC">Sort: Customer (A → Z)</option>
            <option value="AMOUNT_DESC">Sort: Amount (High → Low)</option>
            <option value="AMOUNT_ASC">Sort: Amount (Low → High)</option>
          </select>

          {(statusFilter !== 'ALL' || subTypeFilter !== 'ALL' || searchQuery.trim() !== '' || sortField !== 'RECENCY' || sortDirection !== 'DESC') && (
            <button
              onClick={() => {
                setStatusFilter('ALL');
                setSubTypeFilter('ALL');
                setSearchQuery('');
                setSortField('RECENCY');
                setSortDirection('DESC');
              }}
              className="px-3 py-1.5 rounded-2xl border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-mono font-bold transition-all cursor-pointer text-slate-500 hover:text-slate-900 dark:hover:text-white"
            >
              Reset Filters
            </button>
          )}
        </div>

        <div className="flex items-center gap-3">
          <div className={`flex items-center gap-2 px-3.5 py-1.5 rounded-2xl border text-xs w-64 ${isDarkMode ? 'bg-slate-950/80 border-slate-800 text-white focus-within:border-[#5B75F8]/50' : 'bg-slate-50 border-slate-200 text-slate-900 focus-within:border-[#5B75F8]'
            }`}>
            <Search className="w-3.5 h-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search PO#, Customer, Rev..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-transparent outline-none w-full font-mono text-xs"
            />
          </div>

          <div className={`flex items-center p-1 rounded-2xl border ${isDarkMode ? 'border-slate-800 bg-slate-950/60' : 'border-slate-200 bg-slate-100'
            }`}>
            <button
              onClick={() => setViewMode('table')}
              className={`p-1.5 rounded-xl transition-all cursor-pointer ${viewMode === 'table'
                ? isDarkMode ? 'bg-slate-800 text-[#7B92FF]' : 'bg-white text-[#5B75F8] shadow-xs'
                : isDarkMode ? 'text-slate-400 hover:text-slate-200' : 'text-slate-500 hover:text-slate-900'
                }`}
              title="Table View"
            >
              <List className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-xl transition-all cursor-pointer ${viewMode === 'grid'
                ? isDarkMode ? 'bg-slate-800 text-[#7B92FF]' : 'bg-white text-[#5B75F8] shadow-xs'
                : isDarkMode ? 'text-slate-400 hover:text-slate-200' : 'text-slate-500 hover:text-slate-900'
                }`}
              title="Grid View"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {viewMode === 'table' ? (
        <div className={`rounded-3xl border overflow-hidden transition-all shadow-xl ${isDarkMode ? 'bg-slate-900/80 border-slate-800/80 backdrop-blur-xl' : 'bg-white border-slate-200'
          }`}>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse font-sans">
              <thead>
                <tr className={`border-b font-mono font-bold uppercase tracking-wider text-[11px] ${isDarkMode ? 'bg-slate-950/60 border-slate-800 text-slate-400' : 'bg-slate-50 border-slate-200 text-slate-500'
                  }`}>
                  <th
                    onClick={() => {
                      if (sortField === 'RECENCY') {
                        setSortDirection(d => d === 'DESC' ? 'ASC' : 'DESC');
                      } else {
                        setSortField('RECENCY');
                        setSortDirection('DESC');
                      }
                    }}
                    className="py-4 px-5 cursor-pointer hover:text-[#5B75F8] select-none transition-colors"
                  >
                    <div className="flex items-center gap-1.5">
                      <span>Purchase Order & Date</span>
                      {sortField === 'RECENCY' && (
                        <span className="text-[#5B75F8] font-bold text-[10px] bg-[#5B75F8]/10 px-1.5 py-0.5 rounded border border-[#5B75F8]/20">
                          {sortDirection === 'DESC' ? '↓ Recent' : '↑ Oldest'}
                        </span>
                      )}
                      {sortField === 'PO_NO' && (
                        <span className="text-[#5B75F8]">{sortDirection === 'ASC' ? '↑' : '↓'}</span>
                      )}
                    </div>
                  </th>
                  <th
                    onClick={() => {
                      if (sortField === 'CUSTOMER') {
                        setSortDirection(d => d === 'ASC' ? 'DESC' : 'ASC');
                      } else {
                        setSortField('CUSTOMER');
                        setSortDirection('ASC');
                      }
                    }}
                    className="py-4 px-5 cursor-pointer hover:text-[#5B75F8] select-none transition-colors"
                  >
                    <div className="flex items-center gap-1.5">
                      <span>Customer & Credit Status</span>
                      {sortField === 'CUSTOMER' && <span className="text-[#5B75F8]">{sortDirection === 'ASC' ? '↑' : '↓'}</span>}
                    </div>
                  </th>
                  <th className="py-4 px-5">Heat / Lot Trace</th>
                  <th className="py-4 px-5">10-Stage Pipeline</th>
                  <th className="py-4 px-5">Quality / NCR Gate</th>
                  <th
                    onClick={() => {
                      if (sortField === 'AMOUNT') {
                        setSortDirection(d => d === 'ASC' ? 'DESC' : 'ASC');
                      } else {
                        setSortField('AMOUNT');
                        setSortDirection('DESC');
                      }
                    }}
                    className="py-4 px-5 text-right cursor-pointer hover:text-[#5B75F8] select-none transition-colors"
                  >
                    <div className="flex items-center justify-end gap-1.5">
                      <span>Gross Amount</span>
                      {sortField === 'AMOUNT' && <span className="text-[#5B75F8]">{sortDirection === 'ASC' ? '↑' : '↓'}</span>}
                    </div>
                  </th>
                  <th className="py-4 px-5 text-center">Action</th>
                </tr>
              </thead>
              <tbody className={`divide-y ${isDarkMode ? 'divide-slate-800/60' : 'divide-slate-200'}`}>
                {sortedOrders.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <ShoppingCart className="w-8 h-8 text-slate-400 opacity-50" />
                        <p className={`text-sm font-semibold ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>No purchase orders found</p>
                        <p className={`text-xs ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>Try adjusting your status or sub-type filter</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  sortedOrders.map((ord) => {
                    const subType = ord.subType || 'FRESH_PO';
                    const hasCreditHold = ord.isCustomerOnCreditHold;

                    // Match all related QC inspection records
                    const linkedQc = (qcQueue || []).filter(q =>
                      (q.orderPo && (q.orderPo.trim().toUpperCase() === ord.poNo.trim().toUpperCase() || q.orderPo.trim().toUpperCase() === ord.id.trim().toUpperCase())) ||
                      (ord.jobCards && ord.jobCards.some(j => j.jobNo && j.jobNo.trim().toUpperCase() === (q.jobNo || '').trim().toUpperCase()))
                    );

                    const isQcRejected = linkedQc.some(q => q.qcStatus === 'REJECTED');
                    const isQcHold = linkedQc.some(q => q.qcStatus === 'QC_HOLD');
                    const isQcPassed = linkedQc.length > 0 && linkedQc.every(q => q.qcStatus === 'PASS' || q.qcStatus === 'PASSED');
                    const hasNcr = ord.hasOpenNcr || isQcRejected || isQcHold;

                    // Dynamic pipeline badge that accurately surfaces QC Rejection / Hold
                    let badge = getStatusBadge(ord.status as string, ord.stage);
                    if (isQcRejected) {
                      badge = {
                        bg: isDarkMode ? 'bg-rose-500/15 text-rose-400 border-rose-500/30' : 'bg-rose-50 text-rose-700 border-rose-200',
                        dot: 'bg-rose-500 animate-pulse',
                        label: '6. QC Rejected'
                      };
                    } else if (isQcHold || hasNcr) {
                      badge = {
                        bg: isDarkMode ? 'bg-amber-500/15 text-amber-400 border-amber-500/30' : 'bg-amber-50 text-amber-800 border-amber-200',
                        dot: 'bg-amber-500 animate-pulse',
                        label: '6. QC Hold / NCR'
                      };
                    }

                    return (
                      <tr
                        key={ord.id}
                        onClick={() => onSelectOrder(ord)}
                        className={`group transition-all cursor-pointer ${isDarkMode ? 'hover:bg-slate-800/50' : 'hover:bg-slate-50'
                          }`}
                      >
                        <td className="py-4 px-5 font-bold font-mono">
                          <div className="flex items-center gap-2.5">
                            <div className={`p-2 rounded-xl transition-transform group-hover:scale-105 ${subType === 'BLANKET_CALLOFF'
                              ? isDarkMode ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30' : 'bg-purple-100 text-purple-700 border border-purple-200'
                              : isDarkMode ? 'bg-[#5B75F8]/20 text-[#7B92FF] border border-[#5B75F8]/30' : 'bg-[#5B75F8]/10 text-[#5B75F8] border border-[#5B75F8]/20'
                              }`}>
                              <ShoppingCart className="w-3.5 h-3.5" />
                            </div>
                            <div>
                              <div className={`text-xs font-bold flex items-center gap-1.5 ${isDarkMode ? 'text-slate-100' : 'text-slate-900'}`}>
                                <span>{ord.poNo}</span>
                                <span className={`px-1.5 py-0.5 rounded text-[9px] font-mono font-bold uppercase border ${subType === 'BLANKET_CALLOFF'
                                  ? isDarkMode ? 'bg-purple-500/20 text-purple-300 border-purple-500/30' : 'bg-purple-100 text-purple-800 border-purple-200'
                                  : subType === 'AMENDMENT'
                                    ? isDarkMode ? 'bg-amber-500/20 text-amber-300 border-amber-500/30' : 'bg-amber-100 text-amber-800 border-amber-200'
                                    : isDarkMode ? 'bg-blue-500/20 text-blue-300 border-blue-500/30' : 'bg-blue-100 text-blue-800 border-blue-200'
                                  }`}>
                                  {subType === 'BLANKET_CALLOFF' ? 'Blanket Call-off' : subType === 'AMENDMENT' ? 'Amendment' : 'Fresh PO'}
                                </span>
                              </div>
                              <div className={`text-[10px] font-mono font-normal mt-0.5 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                                {ord.lines ? `${ord.lines.length} Lines` : '0 Lines'} • PO Date: <span className="font-semibold">{ord.poDate || ord.createdAt?.split('T')[0] || 'N/A'}</span> • Del: {ord.deliveryDate}
                              </div>
                            </div>
                          </div>
                        </td>

                        <td className="py-4 px-5">
                          <div className={`font-semibold ${isDarkMode ? 'text-slate-200' : 'text-slate-800'}`}>{ord.customerName}</div>
                          {hasCreditHold ? (
                            <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg text-[10px] font-mono font-bold mt-1 border ${isDarkMode ? 'bg-rose-500/15 text-rose-400 border-rose-500/30' : 'bg-rose-50 text-rose-700 border-rose-200'
                              }`}>
                              <AlertCircle className="w-3 h-3 text-rose-500" />
                              <span>Credit Hold {ord.creditHoldOverrideBy ? '(Owner Overridden)' : '(Blocked)'}</span>
                            </span>
                          ) : (
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-mono font-medium mt-1 border ${isDarkMode ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              }`}>
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                              <span>Credit Verified OK</span>
                            </span>
                          )}
                        </td>

                        <td className="py-4 px-5 font-mono text-[11px]">
                          {ord.heatLotNumber ? (
                            <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg text-[10px] font-mono font-bold border ${isDarkMode ? 'bg-amber-500/15 text-amber-400 border-amber-500/30' : 'bg-amber-50 text-amber-800 border-amber-200'
                              }`}>
                              <Flame className="w-3 h-3 text-amber-500" />
                              <span>{ord.heatLotNumber}</span>
                            </span>
                          ) : (
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-mono border ${isDarkMode ? 'bg-slate-800/40 text-slate-400 border-slate-700/50' : 'bg-slate-100 text-slate-500 border-slate-200'
                              }`}>
                              <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                              <span>Pending Issue</span>
                            </span>
                          )}
                        </td>

                        <td className="py-4 px-5">
                          <div className="space-y-1.5">
                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-[10px] font-mono font-bold uppercase border ${badge.bg}`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${badge.dot}`} />
                              <span>{badge.label}</span>
                            </span>
                            <div className="flex items-center gap-1 pt-0.5">
                              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((stepNum) => {
                                const currentStep = ord.progressStep || 1;
                                const isComplete = stepNum <= currentStep;
                                return (
                                  <div
                                    key={stepNum}
                                    className={`w-1.5 h-1.5 rounded-full ${isComplete
                                      ? isQcRejected ? 'bg-rose-500' : 'bg-[#5B75F8]'
                                      : (isDarkMode ? 'bg-slate-800' : 'bg-slate-200')
                                      }`}
                                    title={`Step ${stepNum}`}
                                  />
                                );
                              })}
                            </div>
                          </div>
                        </td>

                        <td className="py-4 px-5">
                          {isQcRejected ? (
                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-[10px] font-mono font-bold uppercase border ${isDarkMode ? 'bg-rose-500/15 text-rose-400 border-rose-500/30' : 'bg-rose-50 text-rose-700 border-rose-200'
                              }`}>
                              <AlertTriangle className="w-3 h-3 text-rose-500" />
                              <span>QC Rejected</span>
                            </span>
                          ) : (isQcHold || hasNcr) ? (
                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-[10px] font-mono font-bold uppercase border ${isDarkMode ? 'bg-amber-500/15 text-amber-400 border-amber-500/30' : 'bg-amber-50 text-amber-800 border-amber-200'
                              }`}>
                              <AlertTriangle className="w-3 h-3 text-amber-500" />
                              <span>Open NCR Block</span>
                            </span>
                          ) : (isQcPassed || (ord.progressStep && ord.progressStep >= 6)) ? (
                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-[10px] font-mono font-bold uppercase border ${isDarkMode ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              }`}>
                              <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                              <span>QC Clear</span>
                            </span>
                          ) : (
                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-[10px] font-mono font-bold uppercase border ${isDarkMode ? 'bg-blue-500/10 text-blue-400 border-blue-500/30' : 'bg-blue-50 text-blue-700 border-blue-200'
                              }`}>
                              <Clock className="w-3 h-3 text-blue-500" />
                              <span>Pending QC</span>
                            </span>
                          )}
                        </td>

                        <td className={`py-4 px-5 text-right font-bold font-mono text-xs ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                          ₹{ord.grossAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </td>

                        <td className="py-4 px-5 text-center">
                          <button className={`px-3 py-1.5 rounded-xl border text-xs font-bold font-mono transition-all flex items-center justify-center gap-1 mx-auto cursor-pointer ${isDarkMode
                            ? 'bg-[#5B75F8]/10 text-[#7B92FF] border-[#5B75F8]/30 hover:bg-[#5B75F8]/20'
                            : 'bg-[#5B75F8]/10 text-[#5B75F8] border-[#5B75F8]/20 hover:bg-[#5B75F8]/20'
                            }`}>
                            <span>Inspect</span>
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
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {sortedOrders.map((ord) => {
            const linkedQc = (qcQueue || []).filter(q =>
              (q.orderPo && (q.orderPo.trim().toUpperCase() === ord.poNo.trim().toUpperCase() || q.orderPo.trim().toUpperCase() === ord.id.trim().toUpperCase())) ||
              (ord.jobCards && ord.jobCards.some(j => j.jobNo && j.jobNo.trim().toUpperCase() === (q.jobNo || '').trim().toUpperCase()))
            );
            const isQcRejected = linkedQc.some(q => q.qcStatus === 'REJECTED');
            const isQcHold = linkedQc.some(q => q.qcStatus === 'QC_HOLD');
            const hasNcr = ord.hasOpenNcr || isQcRejected || isQcHold;

            let badge = getStatusBadge(ord.status as string, ord.stage);
            if (isQcRejected) {
              badge = {
                bg: isDarkMode ? 'bg-rose-500/15 text-rose-400 border-rose-500/30' : 'bg-rose-50 text-rose-700 border-rose-200',
                dot: 'bg-rose-500 animate-pulse',
                label: '6. QC Rejected'
              };
            } else if (isQcHold || hasNcr) {
              badge = {
                bg: isDarkMode ? 'bg-amber-500/15 text-amber-400 border-amber-500/30' : 'bg-amber-50 text-amber-800 border-amber-200',
                dot: 'bg-amber-500 animate-pulse',
                label: '6. QC Hold / NCR'
              };
            }

            return (
              <div
                key={ord.id}
                onClick={() => onSelectOrder(ord)}
                className={`p-5 rounded-3xl border transition-all cursor-pointer hover:scale-[1.01] shadow-lg ${isDarkMode ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200'
                  }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="font-bold font-mono text-sm text-[#5B75F8]">{ord.poNo}</div>
                  <span className={`px-2 py-0.5 rounded-lg text-[10px] font-mono font-bold uppercase border ${badge.bg}`}>
                    {badge.label}
                  </span>
                </div>
                <div className={`text-xs font-bold ${isDarkMode ? 'text-slate-100' : 'text-slate-900'}`}>{ord.customerName}</div>
                <div className={`text-[10px] font-mono mt-1 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                  PO Date: <span className="font-semibold">{ord.poDate || ord.createdAt?.split('T')[0] || 'N/A'}</span> • Del: {ord.deliveryDate}
                </div>
                <div className="text-sm font-bold font-mono text-emerald-600 dark:text-emerald-400 mt-2">
                  ₹{ord.grossAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Modal
        isOpen={showNewModal}
        onClose={() => setShowNewModal(false)}
        maxWidth="3xl"
        isDarkMode={isDarkMode}
        icon={<Plus className="w-5 h-5" />}
        title="Create Purchase Order / Blanket Call-Off"
        subtitle="Stage 1 Precondition: Customer Master Indexing & Credit Check"
        footer={
          <>
            <div className={`flex items-center justify-between p-2.5 px-4 rounded-xl font-mono border ${isDarkMode ? 'bg-slate-950/80 border-slate-800' : 'bg-white border-slate-200 shadow-xs'
              }`}>
              <span className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>Total Gross:</span>
              <span className="font-bold text-emerald-600 dark:text-emerald-400 text-sm ml-2">
                ₹{totalCalculatedGross.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </span>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setShowNewModal(false)}
                className={`px-4 py-2.5 rounded-xl text-xs font-mono font-bold cursor-pointer transition-all ${isDarkMode ? 'text-slate-400 hover:text-white bg-slate-800/50 hover:bg-slate-800' : 'border border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                  }`}
              >
                Cancel
              </button>
              <button
                type="submit"
                form="create-po-form"
                className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-blue-600 hover:to-indigo-600 text-white font-bold text-xs font-mono shadow-lg cursor-pointer transition-all hover:scale-[1.02] active:scale-[0.98]"
              >
                Validate & Confirm Order
              </button>
            </div>
          </>
        }
      >
        {/* Validation Error Banner */}
        {validationError && (
          <div className="p-3.5 rounded-2xl bg-rose-500/15 border border-rose-500/40 text-rose-400 text-xs flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 text-rose-400 mt-0.5 shrink-0" />
            <div>
              <div className="font-bold font-mono uppercase text-[11px]">Precondition Gate Blocked</div>
              <div className="text-[11px] mt-0.5 leading-relaxed">{validationError}</div>
            </div>
          </div>
        )}

        <form id="create-po-form" onSubmit={handleCreateSubmit} className="space-y-4 text-xs font-sans">

          {/* Sub-Type Selection - Fresh PO or Blanket Call-Off */}
          <div className={`grid grid-cols-2 gap-2 p-1.5 rounded-2xl border ${isDarkMode ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-100 border-slate-200'
            }`}>
            {(['FRESH_PO', 'BLANKET_CALLOFF'] as OrderSubType[]).map(type => (
              <button
                key={type}
                type="button"
                onClick={() => setNewSubType(type)}
                className={`py-2 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer ${newSubType === type
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : (isDarkMode ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900')
                  }`}
              >
                {type === 'FRESH_PO' ? 'Fresh Customer PO' : 'Blanket Call-Off'}
              </button>
            ))}
          </div>

          {/* Blanket PO Specific Inputs */}
          {newSubType === 'BLANKET_CALLOFF' && (
            <div className={`p-3.5 rounded-2xl border grid grid-cols-2 gap-3 ${isDarkMode ? 'bg-purple-950/20 border-purple-500/30' : 'bg-purple-50 border-purple-200'
              }`}>
              <div>
                <label className={`block text-[10px] font-mono uppercase font-bold mb-1 ${isDarkMode ? 'text-purple-300' : 'text-purple-800'}`}>
                  Standing Blanket PO #
                </label>
                <input
                  type="text"
                  placeholder="e.g. BPO-2026-TATA-01"
                  value={newBlanketPoId}
                  onChange={(e) => setNewBlanketPoId(e.target.value)}
                  className={`w-full p-2.5 rounded-xl border font-mono text-xs outline-none transition-all ${isDarkMode ? 'bg-slate-900 border-purple-500/40 text-white' : 'bg-white border-purple-300 text-slate-900'
                    }`}
                />
              </div>
              <div>
                <label className={`block text-[10px] font-mono uppercase font-bold mb-1 ${isDarkMode ? 'text-purple-300' : 'text-purple-800'}`}>
                  Standing Balance Qty
                </label>
                <input
                  type="number"
                  value={newBlanketBalance}
                  onChange={(e) => setNewBlanketBalance(Number(e.target.value))}
                  className={`w-full p-2.5 rounded-xl border font-mono text-xs outline-none transition-all ${isDarkMode ? 'bg-slate-900 border-purple-500/40 text-white' : 'bg-white border-purple-300 text-slate-900'
                    }`}
                />
              </div>
            </div>
          )}

          {/* Customer Master Check & Indexing */}
          {customers.length === 0 ? (
            <div className={`p-4 rounded-2xl border ${isDarkMode ? 'bg-amber-500/10 border-amber-500/30 text-amber-300' : 'bg-amber-50 border-amber-300 text-amber-900'
              }`}>
              <div className="flex items-center gap-2 font-bold text-xs">
                <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
                <span>No Customer Master Found</span>
              </div>
              <p className={`text-[11px] mt-1.5 leading-relaxed ${isDarkMode ? 'text-slate-300' : 'text-slate-600'}`}>
                No customers are registered in Customer Master. You must create a Customer in Masters &gt; Customers first before proceeding to raise an order.
              </p>
              <button
                type="button"
                onClick={() => {
                  setShowNewModal(false);
                  onNavigateToCustomers?.();
                }}
                className="mt-3 px-3.5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-md transition-all hover:scale-[1.02] active:scale-[0.98]"
              >
                <span>Create Customer in Master First</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className={`block text-[11px] font-mono font-bold uppercase mb-1 ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                  PO Number *
                </label>
                <input
                  type="text"
                  required
                  value={newPoNo}
                  onChange={(e) => setNewPoNo(e.target.value)}
                  placeholder="e.g. PO-2026-901"
                  className={`w-full p-2.5 rounded-xl border font-mono text-xs outline-none transition-all ${isDarkMode ? 'bg-slate-950/80 border-slate-800 text-white focus:border-indigo-500' : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-indigo-500 focus:bg-white'
                    }`}
                />
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className={`block text-[11px] font-mono font-bold uppercase ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                    Customer * (Master Indexed)
                  </label>
                  {onNavigateToCustomers && (
                    <button
                      type="button"
                      onClick={() => {
                        setShowNewModal(false);
                        onNavigateToCustomers();
                      }}
                      className="text-[10px] font-mono font-bold text-indigo-500 hover:underline cursor-pointer flex items-center gap-0.5"
                    >
                      <span>+ New Customer</span>
                    </button>
                  )}
                </div>
                <select
                  required
                  value={selectedCustomerCode}
                  onChange={(e) => handleSelectCustomer(e.target.value)}
                  className={`w-full p-2.5 rounded-xl border text-xs outline-none transition-all cursor-pointer font-sans ${isDarkMode ? 'bg-slate-950/80 border-slate-800 text-white focus:border-indigo-500' : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-indigo-500 focus:bg-white'
                    }`}
                >
                  <option value="">-- Select Customer ({customers.length} in Master) --</option>
                  {customers.map(c => (
                    <option key={c.code || c.id} value={c.code}>
                      {c.name} ({c.code}{c.gstin ? ` • ${c.gstin}` : ''}{c.city ? ` • ${c.city}` : ''})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* Selected Customer Info Badge */}
          {selectedCustomer && (
            <div className={`p-3 rounded-2xl border flex flex-wrap items-center justify-between gap-2 text-xs font-mono ${isDarkMode ? 'bg-slate-950/60 border-slate-800 text-slate-300' : 'bg-slate-50 border-slate-200 text-slate-700'
              }`}>
              <div className="flex items-center gap-2">
                <span className="font-bold text-indigo-400">{selectedCustomer.name}</span>
                <span className="text-[10px] text-slate-400">[{selectedCustomer.code}]</span>
              </div>
              <div className="flex items-center gap-3 text-[11px]">
                <span>GSTIN: <strong className={isDarkMode ? 'text-white' : 'text-slate-900'}>{selectedCustomer.gstin || 'N/A'}</strong></span>
                <span>Terms: <strong className={isDarkMode ? 'text-white' : 'text-slate-900'}>{selectedCustomer.paymentTerms || 'Net 30'} ({selectedCustomer.creditDays || 30}d)</strong></span>
              </div>
            </div>
          )}

          {/* Gate 2: Customer Credit Hold Override Panel */}
          {isCustomerCreditHeld && (
            <div className={`p-3.5 rounded-2xl border space-y-2 ${isDarkMode ? 'bg-rose-950/20 border-rose-500/40 text-rose-300' : 'bg-rose-50 border-rose-300 text-rose-900'
              }`}>
              <div className="flex items-center gap-2 text-rose-500 font-bold text-xs font-mono">
                <AlertTriangle className="w-4 h-4" />
                <span>Customer On Credit Hold (Overdue Receivables &gt; 90 Days)</span>
              </div>
              <p className={`text-[11px] ${isDarkMode ? 'text-slate-300' : 'text-slate-600'}`}>
                This customer has unpaid invoices overdue exceeding 90 days. An Owner-level override is required to proceed.
              </p>
              <div className="grid grid-cols-2 gap-2 pt-1">
                <input
                  type="text"
                  required
                  placeholder="Override Authorized By (Owner/Admin)"
                  value={creditOverrideBy}
                  onChange={(e) => setCreditOverrideBy(e.target.value)}
                  className={`p-2 rounded-xl border text-xs font-mono outline-none ${isDarkMode ? 'bg-slate-900 border-rose-500/40 text-white' : 'bg-white border-rose-300 text-slate-900'
                    }`}
                />
                <input
                  type="text"
                  required
                  placeholder="Override Business Justification"
                  value={creditOverrideReason}
                  onChange={(e) => setCreditOverrideReason(e.target.value)}
                  className={`p-2 rounded-xl border text-xs outline-none ${isDarkMode ? 'bg-slate-900 border-rose-500/40 text-white' : 'bg-white border-rose-300 text-slate-900'
                    }`}
                />
              </div>
            </div>
          )}

          {/* PO Date & Delivery Target */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={`block text-[11px] font-mono mb-1 ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>PO Date</label>
              <input
                type="date"
                value={newPoDate}
                onChange={(e) => setNewPoDate(e.target.value)}
                className={`w-full p-2.5 rounded-xl border text-xs font-mono outline-none ${isDarkMode ? 'bg-slate-950/80 border-slate-800 text-white' : 'bg-slate-50 border-slate-200 text-slate-900 focus:bg-white'
                  }`}
              />
            </div>
            <div>
              <label className={`block text-[11px] font-mono mb-1 ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>Delivery Target</label>
              <input
                type="date"
                value={newDeliveryDate}
                onChange={(e) => setNewDeliveryDate(e.target.value)}
                className={`w-full p-2.5 rounded-xl border text-xs font-mono outline-none ${isDarkMode ? 'bg-slate-950/80 border-slate-800 text-white' : 'bg-slate-50 border-slate-200 text-slate-900 focus:bg-white'
                  }`}
              />
            </div>
          </div>

          {/* Line Items - Indexed to Master Item Catalog */}
          <div className={`p-4 rounded-2xl border space-y-3 ${isDarkMode ? 'bg-slate-800/40 border-slate-700/60' : 'bg-slate-50 border-slate-200'
            }`}>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className={`font-bold font-mono text-xs ${isDarkMode ? 'text-slate-200' : 'text-slate-800'}`}>
                  Order Line Items ({lines.length})
                </span>
                <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-md bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                  Master Items Catalog Indexed
                </span>
              </div>
              <div className="flex items-center gap-2">
                {onNavigateToMasters && (
                  <button
                    type="button"
                    onClick={() => {
                      setShowNewModal(false);
                      onNavigateToMasters();
                    }}
                    className="text-[11px] font-mono font-bold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer flex items-center gap-1"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Manage Items in Master</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={addLineItem}
                  className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white text-xs font-mono cursor-pointer font-bold shadow-sm transition-all hover:scale-[1.02] active:scale-[0.98]"
                >
                  + Add Line Item
                </button>
              </div>
            </div>

            {lines.map((line, idx) => {
              const matchedMaster = masters.find(m => m.code === line.itemCode || m.id === line.itemCode);
              return (
                <div key={idx} className={`p-3.5 rounded-2xl border space-y-3 transition-all ${isDarkMode ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
                  }`}>
                  {/* Master Item Selector Dropdown */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className={`block text-[11px] font-mono font-bold uppercase ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                        Line {idx + 1}: Select Item from Master Catalog <span className="text-rose-500">*</span>
                      </label>
                      {matchedMaster && (
                        <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1">
                          <span>✓ Catalog Verified:</span>
                          <strong>{matchedMaster.code}</strong>
                        </span>
                      )}
                    </div>
                    <select
                      required
                      value={line.itemCode}
                      onChange={(e) => handleSelectItemForLine(idx, e.target.value)}
                      className={`w-full p-2.5 rounded-xl border text-xs font-mono font-medium outline-none transition-all cursor-pointer ${isDarkMode
                        ? 'bg-slate-800 border-slate-700 text-white focus:border-indigo-500'
                        : 'bg-slate-50 border-slate-300 text-slate-900 focus:border-indigo-500 focus:bg-white'
                        }`}
                    >
                      <option value="">-- Choose Item from Master Catalog ({masters.length} registered) --</option>
                      {masters.map((m) => {
                        const rate = m.sellingPrice || m.saleRate || (m.standardCost ? m.standardCost : 0);
                        const type = m.itemType || (m.isFinishedGoods ? 'Finished Good' : 'Raw Material');
                        return (
                          <option key={m.code || m.id} value={m.code}>
                            {m.code} — {m.name || m.partNo || m.description} [{type} • ₹{rate.toLocaleString('en-IN')}/{m.unit || 'Nos'}]
                          </option>
                        );
                      })}
                      <option value="CUSTOM_ITEM">+ Unindexed / Custom Part Number</option>
                    </select>
                  </div>

                  {/* Selected Master Item Metadata Badge */}
                  {matchedMaster && (
                    <div className={`p-2.5 rounded-xl border text-[11px] font-mono flex flex-wrap items-center justify-between gap-2 ${isDarkMode ? 'bg-slate-950/60 border-slate-800/80 text-slate-300' : 'bg-slate-50 border-slate-200 text-slate-700'
                      }`}>
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded-md font-bold text-[10px] uppercase bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
                          {matchedMaster.itemType || (matchedMaster.isFinishedGoods ? 'Finished Good' : 'Raw Material')}
                        </span>
                        <span className="font-semibold text-slate-900 dark:text-white">{matchedMaster.name || matchedMaster.description}</span>
                      </div>
                      <div className="flex items-center gap-3 text-[10px]">
                        <span>HSN: <strong className="text-slate-900 dark:text-white">{matchedMaster.hsnCode || 'N/A'}</strong></span>
                        <span>UOM: <strong className="text-slate-900 dark:text-white">{matchedMaster.unit || 'Nos'}</strong></span>
                        <span>Catalog Rate: <strong className="text-emerald-600 dark:text-emerald-400">₹{(matchedMaster.sellingPrice || matchedMaster.saleRate || matchedMaster.standardCost || 0).toLocaleString('en-IN')}</strong></span>
                      </div>
                    </div>
                  )}

                  {/* Part Code & Description manual refine/view */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <div>
                      <label className={`block text-[10px] font-mono mb-1 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Part / Item Code</label>
                      <input
                        type="text"
                        required
                        placeholder="Part Code"
                        value={line.itemCode}
                        onChange={(e) => updateLineItem(idx, 'itemCode', e.target.value)}
                        className={`w-full p-2 rounded-lg border font-mono text-xs outline-none ${isDarkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-900 focus:bg-white'
                          }`}
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className={`block text-[10px] font-mono mb-1 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Item Description</label>
                      <input
                        type="text"
                        required
                        placeholder="Item description"
                        value={line.itemDescription}
                        onChange={(e) => updateLineItem(idx, 'itemDescription', e.target.value)}
                        className={`w-full p-2 rounded-lg border text-xs outline-none ${isDarkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-900 focus:bg-white'
                          }`}
                      />
                    </div>
                  </div>

                  {/* Qty, Unit, Rate, Drawing Rev, Line Total & Remove */}
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 items-end">
                    <div>
                      <label className={`text-[10px] font-mono font-semibold block mb-1 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                        Order Qty <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="number"
                        min={1}
                        required
                        value={line.orderQty}
                        onChange={(e) => updateLineItem(idx, 'orderQty', Number(e.target.value))}
                        className={`w-full p-2 rounded-lg border font-mono font-bold text-xs outline-none ${isDarkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-900 focus:bg-white'
                          }`}
                      />
                    </div>
                    <div>
                      <label className={`text-[10px] font-mono font-semibold block mb-1 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                        UOM
                      </label>
                      <input
                        type="text"
                        value={line.unit}
                        onChange={(e) => updateLineItem(idx, 'unit', e.target.value)}
                        placeholder="Nos"
                        className={`w-full p-2 rounded-lg border font-mono text-xs outline-none ${isDarkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-900 focus:bg-white'
                          }`}
                      />
                    </div>
                    <div>
                      <label className={`text-[10px] font-mono font-semibold block mb-1 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                        Unit Rate (₹) <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="number"
                        min={0}
                        required
                        value={line.rate}
                        onChange={(e) => updateLineItem(idx, 'rate', Number(e.target.value))}
                        className={`w-full p-2 rounded-lg border font-mono font-bold text-xs outline-none ${isDarkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-900 focus:bg-white'
                          }`}
                      />
                    </div>
                    <div>
                      <label className={`text-[10px] font-mono font-semibold block mb-1 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                        Drawing Rev
                      </label>
                      <input
                        type="text"
                        value={line.drawingRevision}
                        onChange={(e) => updateLineItem(idx, 'drawingRevision', e.target.value)}
                        placeholder="REV-A"
                        className={`w-full p-2 rounded-lg border font-mono text-xs outline-none ${isDarkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-900 focus:bg-white'
                          }`}
                      />
                    </div>
                    <div className="flex items-center justify-between p-2 rounded-lg bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700">
                      <div>
                        <div className="text-[9px] font-mono text-slate-400">Line Amount</div>
                        <div className="font-mono font-bold text-emerald-600 dark:text-emerald-400 text-xs">
                          ₹{(Number(line.orderQty) * Number(line.rate)).toLocaleString('en-IN')}
                        </div>
                      </div>
                      {lines.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeLineItem(idx)}
                          className="text-rose-500 hover:text-rose-600 text-xs font-mono font-bold cursor-pointer hover:underline"
                        >
                          Remove
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

        </form>
      </Modal>

    </div>
  );
};

export default OrdersView;
