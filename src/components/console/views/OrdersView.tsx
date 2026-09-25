import React, { useState, useMemo } from 'react';
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
  RefreshCw,
  ArrowRight,
  Building2,
  Calendar,
  Layers3
} from 'lucide-react';
import { CustomerOrder, OrderStatus, OrderLineItem, CustomerMaster, QCInspection, MasterItem } from '../../../types/console';
import { ORDER_STAGE_LABELS, ORDER_STAGE_STEPS, OrderStage, OrderSubType, normalizeOrderState } from '../../../utils/orderStateMachine';
import { Modal } from '../../common/Modal';
import { useUrlModal } from '../../../hooks/useUrlModal';

interface OrdersViewProps {
  orders: CustomerOrder[];
  qcQueue?: QCInspection[];
  customers?: CustomerMaster[];
  masters?: MasterItem[];
  isDarkMode?: boolean;
  onSelectOrder?: (order: CustomerOrder) => void;
  onCreateOrder?: (orderData: Partial<CustomerOrder>) => Promise<boolean | void> | boolean | void;
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
  const createOrderModal = useUrlModal('create-order');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [subTypeFilter, setSubTypeFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState<'RECENCY' | 'PO_NO' | 'CUSTOMER' | 'AMOUNT'>('RECENCY');
  const [sortDirection, setSortDirection] = useState<'ASC' | 'DESC'>('DESC');
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');

  // Filter masters to only finished goods items for Customer Purchase Orders
  const finishedGoodsMasters = useMemo(() => {
    const fg = masters.filter(m => 
      m.isFinishedGoods === true || 
      m.itemType === 'Finished Good' || 
      m.itemType === 'Finished Goods' ||
      m.category === 'FINISHED_GOODS' ||
      (m.category && m.category.toLowerCase().includes('finished')) ||
      (m.code && m.code.toUpperCase().startsWith('FG-'))
    );
    return fg.length > 0 ? fg : masters;
  }, [masters]);

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
    const pool = finishedGoodsMasters.length > 0 ? finishedGoodsMasters : masters;
    const availableMaster = pool[lines.length % Math.max(1, pool.length)];
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

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    if (customers.length > 0 && !selectedCustomerCode) {
      setValidationError('Please select a verified customer from the Customer Master index.');
      return;
    }

    if (!newCustomer.trim()) {
      setValidationError('Customer Name is required.');
      return;
    }

    if (isCustomerCreditHeld && !creditOverrideBy.trim()) {
      setValidationError('Customer has an active 90-Day Credit Overdue / Hold. An authorized Owner override username is required to proceed.');
      return;
    }

    if (!newPoNo.trim()) {
      setValidationError('Customer PO Number is required.');
      return;
    }

    if (lines.length === 0 || lines.some(l => !l.itemCode || Number(l.orderQty) <= 0 || Number(l.rate) <= 0)) {
      setValidationError('Please specify at least one valid line item with positive quantity and unit rate.');
      return;
    }

    const firstLine = lines[0];

    const orderPayload: Partial<CustomerOrder> = {
      id: `ord_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      poNo: newPoNo.trim(),
      customerName: newCustomer.trim(),
      partCode: firstLine.itemCode,
      partDescription: firstLine.itemDescription,
      drawingRevision: firstLine.drawingRevision,
      orderedQty: totalOrderQty,
      rate: firstLine.rate,
      grossAmount: totalCalculatedGross,
      netAmount: totalCalculatedGross * 1.18,
      status: 'PO_RECEIVED',
      stage: 'PO_RECEIVED',
      progressStep: 1,
      orderDate: newPoDate,
      poDate: newPoDate,
      deliveryDate: newDeliveryDate,
      subType: newSubType,
      isCustomerOnCreditHold: isCustomerCreditHeld,
      creditHoldOverrideBy: isCustomerCreditHeld ? creditOverrideBy : undefined,
      creditHoldOverrideReason: isCustomerCreditHeld ? creditOverrideReason : undefined,
      blanketPoId: newSubType === 'BLANKET_CALLOFF' ? newBlanketPoId : undefined,
      blanketBalanceQty: newSubType === 'BLANKET_CALLOFF' ? newBlanketBalance : undefined,
      lines: lines.map((l, idx) => ({
        id: `line_${Date.now()}_${idx}`,
        itemCode: l.itemCode,
        itemDescription: l.itemDescription,
        description: l.itemDescription,
        partCode: l.itemCode,
        orderQty: Number(l.orderQty),
        unit: l.unit,
        unitRate: Number(l.rate),
        rate: Number(l.rate),
        amount: Number(l.orderQty) * Number(l.rate),
        grossAmount: Number(l.orderQty) * Number(l.rate),
        drawingRevision: l.drawingRevision,
        producedQty: 0,
        dispatchedQty: 0,
        invoicedQty: 0
      })),
      createdAt: new Date().toISOString()
    };

    onCreateOrder(orderPayload);
    createOrderModal.close();
  };

  // Filter orders
  const filteredOrders = orders.filter(o => {
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch = !q ||
      o.poNo.toLowerCase().includes(q) ||
      o.customerName.toLowerCase().includes(q) ||
      (o.partDescription && o.partDescription.toLowerCase().includes(q)) ||
      (o.partCode && o.partCode.toLowerCase().includes(q)) ||
      (o.drawingRevision && o.drawingRevision.toLowerCase().includes(q)) ||
      (o.heatLotNumber && o.heatLotNumber.toLowerCase().includes(q));

    const matchesStatus = statusFilter === 'ALL' || o.status === statusFilter || o.stage === statusFilter || (statusFilter === 'CANCELLED' && (String(o.status || '').toUpperCase() === 'CANCELLED' || String(o.stage || '').toUpperCase() === 'CANCELLED' || normalizeOrderState(o.stage) === 'CANCELLED' || normalizeOrderState(o.status) === 'CANCELLED'));
    const matchesSubType = subTypeFilter === 'ALL' || (o.subType || 'FRESH_PO') === subTypeFilter;

    return matchesSearch && matchesStatus && matchesSubType;
  });

  const parseDateToTimestamp = (dateVal: any): number => {
    if (!dateVal) return 0;
    if (typeof dateVal === 'number') return dateVal;
    if (dateVal instanceof Date) return dateVal.getTime();
    if (typeof dateVal === 'string') {
      const parsed = Date.parse(dateVal);
      if (!isNaN(parsed)) return parsed;
      const parts = dateVal.split(/[-/]/);
      if (parts.length === 3) {
        const year = parts[0].length === 4 ? Number(parts[0]) : Number(parts[2]);
        const month = Number(parts[1]) - 1;
        const day = parts[0].length === 4 ? Number(parts[2]) : Number(parts[0]);
        const d = new Date(year, month, day);
        if (!isNaN(d.getTime())) return d.getTime();
      }
    }
    return 0;
  };

  const getOrderTime = (o: CustomerOrder): number => {
    if (o.createdAt) {
      const t = parseDateToTimestamp(o.createdAt);
      if (t > 0) return t;
    }
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
    const timeB = getOrderTime(b);
    const timeA = getOrderTime(a);
    if (timeB !== timeA) {
      return sortDirection === 'ASC' ? timeA - timeB : timeB - timeA;
    }
    return sortDirection === 'ASC'
      ? String(a.id || a.poNo).localeCompare(String(b.id || b.poNo), undefined, { numeric: true })
      : String(b.id || b.poNo).localeCompare(String(a.id || a.poNo), undefined, { numeric: true });
  });

  const ORDER_PROGRESSION_STEPS = [
    { code: 'PO', label: 'PO', fullLabel: 'PO Confirmed' },
    { code: 'MAT', label: 'Mat', fullLabel: 'Material Checked' },
    { code: 'PROD', label: 'Prod', fullLabel: 'Production' },
    { code: 'QC', label: 'QC', fullLabel: 'Quality Check & NCR' },
    { code: 'PDI', label: 'PDI', fullLabel: 'Pre-Dispatch Insp.' },
    { code: 'DISP', label: 'Disp', fullLabel: 'Outward Dispatch' },
    { code: 'INV', label: 'Inv', fullLabel: 'GST Tax Invoice' },
    { code: 'DONE', label: 'Done', fullLabel: 'Delivered & Closed' },
  ];

  const STAGE_THEMES: Record<number, { code: string; label: string; activeColor: string; activeBadge: string; completedColor: string; badgeDot: string }> = {
    0: {
      code: 'PO',
      label: 'PO Received',
      activeColor: 'bg-blue-600 shadow-[0_0_12px_rgba(37,99,235,0.6)] ring-1 ring-blue-400 scale-105',
      activeBadge: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',
      completedColor: 'bg-blue-600/70',
      badgeDot: 'bg-blue-600'
    },
    1: {
      code: 'MAT',
      label: 'Material Checked',
      activeColor: 'bg-indigo-500 shadow-[0_0_12px_rgba(99,102,241,0.6)] ring-1 ring-indigo-300 scale-105',
      activeBadge: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20',
      completedColor: 'bg-indigo-500/70',
      badgeDot: 'bg-indigo-500'
    },
    2: {
      code: 'PROD',
      label: 'In Production',
      activeColor: 'bg-blue-600 shadow-[0_0_12px_rgba(37,99,235,0.6)] ring-1 ring-blue-400 scale-105',
      activeBadge: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',
      completedColor: 'bg-blue-600/70',
      badgeDot: 'bg-blue-600'
    },
    3: {
      code: 'QC',
      label: 'QC Inspection',
      activeColor: 'bg-orange-500 shadow-[0_0_12px_rgba(249,115,22,0.6)] ring-1 ring-orange-300 scale-105',
      activeBadge: 'bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20',
      completedColor: 'bg-orange-500/70',
      badgeDot: 'bg-orange-500'
    },
    4: {
      code: 'PDI',
      label: 'Ready to Dispatch (PDI)',
      activeColor: 'bg-purple-500 shadow-[0_0_12px_rgba(168,85,247,0.6)] ring-1 ring-purple-300 scale-105',
      activeBadge: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20',
      completedColor: 'bg-purple-500/70',
      badgeDot: 'bg-purple-500'
    },
    5: {
      code: 'DISP',
      label: 'Dispatched',
      activeColor: 'bg-cyan-500 shadow-[0_0_12px_rgba(6,182,212,0.6)] ring-1 ring-cyan-300 scale-105',
      activeBadge: 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/20',
      completedColor: 'bg-cyan-500/70',
      badgeDot: 'bg-cyan-500'
    },
    6: {
      code: 'INV',
      label: 'Invoiced',
      activeColor: 'bg-teal-500 shadow-[0_0_12px_rgba(20,184,166,0.6)] ring-1 ring-teal-300 scale-105',
      activeBadge: 'bg-teal-500/10 text-teal-600 dark:text-teal-400 border-teal-500/20',
      completedColor: 'bg-teal-500/70',
      badgeDot: 'bg-teal-500'
    },
    7: {
      code: 'DONE',
      label: 'Closed',
      activeColor: 'bg-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.6)] ring-1 ring-emerald-300 scale-105',
      activeBadge: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
      completedColor: 'bg-emerald-500/70',
      badgeDot: 'bg-emerald-500'
    }
  };

  const getOrderProgression = (ord?: Partial<CustomerOrder> | null) => {
    if (!ord) {
      return {
        activeStepIndex: 0,
        statusLabel: '1. PO Received',
        badgeBg: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',
        badgeDot: 'bg-blue-600',
        isQcRejected: false,
        isQcHold: false,
        isPdiHold: false,
        steps: ORDER_PROGRESSION_STEPS
      };
    }

    const rawStatus = String(ord.status || ord.stage || '').trim().toUpperCase();
    const norm = normalizeOrderState(ord.stage || ord.status);
    const orderPoStr = String(ord.poNo || '').trim().toUpperCase();
    const orderIdStr = String(ord.id || '').trim().toUpperCase();

    const linkedQc = (qcQueue || []).filter(q => {
      const qPo = String(q.orderPo || '').trim().toUpperCase();
      if (qPo && ((orderPoStr && qPo === orderPoStr) || (orderIdStr && qPo === orderIdStr))) return true;
      if (ord.jobCards && ord.jobCards.some(j => j.jobNo && String(j.jobNo || '').trim().toUpperCase() === String(q.jobNo || '').trim().toUpperCase())) {
        return true;
      }
      return false;
    });

    const isQcRejected = linkedQc.some(q => q.qcStatus === 'REJECTED') || rawStatus === 'QC_REJECTED';
    const isQcHold = linkedQc.some(q => q.qcStatus === 'QC_HOLD') || rawStatus === 'QC_HOLD' || Boolean(ord.hasOpenNcr);
    const isPdiHold = rawStatus === 'PDI_HOLD';
    const isDelayed = rawStatus === 'DELIVERY_DELAYED';

    const isCancelled = ['CANCELLED'].includes(rawStatus) || norm === 'CANCELLED' || String(ord.status || '').toUpperCase() === 'CANCELLED' || String(ord.stage || '').toUpperCase() === 'CANCELLED';

    let activeStepIndex = 0;
    let statusLabel = '1. PO Received';
    let badgeBg = 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20';
    let badgeDot = 'bg-blue-600';

    if (isCancelled) {
      activeStepIndex = -1;
      statusLabel = 'Cancelled';
      badgeBg = isDarkMode ? 'bg-rose-500/15 text-rose-400 border-rose-500/30' : 'bg-rose-50 text-rose-700 border-rose-200';
      badgeDot = 'bg-rose-500';
    } else if (isQcRejected) {
      activeStepIndex = 3;
      statusLabel = '4. QC Rejected (NCR)';
      badgeBg = isDarkMode ? 'bg-rose-500/15 text-rose-400 border-rose-500/30' : 'bg-rose-50 text-rose-700 border-rose-200';
      badgeDot = 'bg-rose-500 animate-ping';
    } else if (isQcHold) {
      activeStepIndex = 3;
      statusLabel = '4. QC Hold / NCR Open';
      badgeBg = isDarkMode ? 'bg-amber-500/15 text-amber-400 border-amber-500/30' : 'bg-amber-50 text-amber-800 border-amber-200';
      badgeDot = 'bg-amber-500 animate-pulse';
    } else if (isPdiHold) {
      activeStepIndex = 4;
      statusLabel = '5. PDI Hold';
      badgeBg = isDarkMode ? 'bg-amber-500/15 text-amber-400 border-amber-500/30' : 'bg-amber-50 text-amber-800 border-amber-200';
      badgeDot = 'bg-amber-500 animate-pulse';
    } else if (['CLOSED', 'COMPLETED', 'PAID'].includes(rawStatus) || norm === 'COMPLETED') {
      activeStepIndex = 7;
      statusLabel = '8. Closed & Settled';
      badgeBg = 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20';
      badgeDot = 'bg-emerald-500';
    } else if (['INVOICED', 'INVOICE_GENERATED'].includes(rawStatus) || norm === 'INVOICED') {
      activeStepIndex = 6;
      statusLabel = ord.invoiceNumber ? `7. Invoiced (${ord.invoiceNumber})` : '7. GST Invoiced';
      badgeBg = 'bg-teal-500/10 text-teal-600 dark:text-teal-400 border-teal-500/20';
      badgeDot = 'bg-teal-500';
    } else if (['DISPATCHED', 'PARTIALLY_DISPATCHED', 'IN_TRANSIT', 'DELIVERED', 'ORDER_RECEIVED', 'PAYMENT_PENDING'].includes(rawStatus) || norm === 'DISPATCHED' || norm === 'DELIVERED' || norm === 'IN_TRANSIT' || norm === 'PAYMENT_PENDING') {
      activeStepIndex = 5;
      statusLabel = isDelayed ? '6. Delivery Delayed' : (rawStatus === 'PARTIALLY_DISPATCHED' ? '6. Partially Dispatched' : '6. Outward Dispatched');
      badgeBg = isDelayed
        ? (isDarkMode ? 'bg-amber-500/15 text-amber-400 border-amber-500/30' : 'bg-amber-50 text-amber-800 border-amber-200')
        : 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/20';
      badgeDot = isDelayed ? 'bg-amber-500' : 'bg-cyan-500';
    } else if (['READY_TO_DISPATCH', 'READY_FOR_DISPATCH', 'PDI', 'PDI_COMPLETE', 'PDI_PASS', 'PDI_PASSED', 'DISPATCH_READY'].includes(rawStatus) || norm === 'READY_FOR_DISPATCH' || norm === 'PDI' || norm === 'PDI_COMPLETE' || norm === 'DISPATCH_READY') {
      activeStepIndex = 4;
      statusLabel = rawStatus.includes('PDI') ? '5. PDI Passed (Dispatch Ready)' : '5. Ready for Dispatch';
      badgeBg = 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20';
      badgeDot = 'bg-purple-500';
    } else if (['QC', 'QC_INSPECTION', 'READY_FOR_QC', 'MANUFACTURING_COMPLETED', 'QC_REPORT_UPLOADED'].includes(rawStatus) || norm === 'QC' || norm === 'QC_REPORT_UPLOADED') {
      activeStepIndex = 3;
      statusLabel = '4. QC Inspection';
      badgeBg = 'bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20';
      badgeDot = 'bg-orange-500';
    } else if (['IN_PRODUCTION', 'JOB_RELEASED', 'WITH_SUBCONTRACTOR', 'REWORK'].includes(rawStatus) || norm === 'IN_PRODUCTION' || norm === 'JOB_RELEASED' || norm === 'REWORK') {
      activeStepIndex = 2;
      statusLabel = rawStatus === 'JOB_RELEASED' ? '3. Job Card Released' : '3. In Production';
      badgeBg = 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20';
      badgeDot = 'bg-blue-600';
    } else if (['MATERIAL_READY', 'MATERIAL_CHECKED', 'MATERIAL_VERIFIED', 'MATERIAL_CHECK', 'MATERIAL_SHORT', 'PROCUREMENT_PENDING', 'GRN', 'PENDING_VERIFICATION'].includes(rawStatus) || ['MATERIAL_READY', 'MATERIAL_CHECK', 'MATERIAL_SHORT', 'PROCUREMENT_PENDING', 'GRN', 'PENDING_VERIFICATION'].includes(norm)) {
      activeStepIndex = 1;
      statusLabel = (rawStatus === 'MATERIAL_SHORT' || norm === 'MATERIAL_SHORT') ? '2. Material Shortage' : (rawStatus === 'PROCUREMENT_PENDING' ? '2. Procurement Pending' : '2. Material Verified');
      badgeBg = (rawStatus === 'MATERIAL_SHORT' || norm === 'MATERIAL_SHORT')
        ? (isDarkMode ? 'bg-amber-500/15 text-amber-400 border-amber-500/30' : 'bg-amber-50 text-amber-800 border-amber-200')
        : 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20';
      badgeDot = (rawStatus === 'MATERIAL_SHORT' || norm === 'MATERIAL_SHORT') ? 'bg-amber-500' : 'bg-indigo-500';
    } else {
      activeStepIndex = 0;
      statusLabel = '1. PO Received';
      badgeBg = 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20';
      badgeDot = 'bg-blue-600';
    }

    return {
      activeStepIndex,
      statusLabel,
      badgeBg,
      badgeDot,
      isQcRejected,
      isQcHold,
      isPdiHold,
      isCancelled,
      steps: ORDER_PROGRESSION_STEPS
    };
  };

  const getStatusBadge = (status: string, stage?: string) => {
    const dummyOrder = { status, stage } as CustomerOrder;
    const prog = getOrderProgression(dummyOrder);
    return {
      bg: prog.badgeBg,
      dot: prog.badgeDot,
      label: prog.statusLabel
    };
  };

  const renderProgressionStepper = (ord?: CustomerOrder, variant: 'table' | 'card' | 'grid' = 'table') => {
    const rawStatus = String(ord?.status || ord?.stage || '').trim().toUpperCase();
    const norm = normalizeOrderState(ord?.stage || ord?.status);
    const isCancelled = rawStatus === 'CANCELLED' || norm === 'CANCELLED' || String(ord?.status || '').toUpperCase() === 'CANCELLED' || String(ord?.stage || '').toUpperCase() === 'CANCELLED';
    const prog = getOrderProgression(ord);

    if (isCancelled) {
      return (
        <div className={`space-y-1.5 select-none ${variant === 'table' ? 'min-w-[210px] max-w-[280px]' : 'w-full'}`}>
          <div className="flex items-center justify-between gap-2">
            <div className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${prog.badgeBg}`}>
              <span className="relative flex h-1.5 w-1.5 shrink-0">
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-rose-500" />
              </span>
              <span className="truncate max-w-[150px] font-semibold">Cancelled</span>
            </div>

            <div className="flex items-center gap-1 text-[10px] font-mono font-bold shrink-0 text-slate-400 dark:text-slate-500">
              <span>Terminated</span>
            </div>
          </div>

          <div
            title="Order Cancelled — Workflow terminated"
            className={`w-full h-1.5 rounded-full overflow-hidden ${
              isDarkMode ? 'bg-white/10' : 'bg-slate-100'
            }`}
          >
            <div
              className="h-full rounded-full bg-rose-500/80 transition-all"
              style={{ width: '100%' }}
            />
          </div>
        </div>
      );
    }

    const stagePct = Math.round(((prog.activeStepIndex + 1) / 8) * 100);

    let progressBg = 'bg-blue-600';
    if (prog.isQcRejected) {
      progressBg = 'bg-rose-500';
    } else if (prog.isQcHold || prog.isPdiHold) {
      progressBg = 'bg-amber-500';
    } else if (prog.activeStepIndex >= 7) {
      progressBg = 'bg-emerald-500';
    }

    if (variant === 'table') {
      return (
        <div className="space-y-2 select-none min-w-[220px] max-w-[290px]">
          {/* Status Header */}
          <div className="flex items-center justify-between gap-2">
            <div className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold tracking-tight border ${prog.badgeBg}`}>
              <span className="relative flex h-1.5 w-1.5 shrink-0">
                <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                  prog.isQcRejected ? 'bg-rose-400' : (prog.isQcHold || prog.isPdiHold) ? 'bg-amber-400' : prog.badgeDot
                }`} />
                <span className={`relative inline-flex rounded-full h-1.5 w-1.5 ${
                  prog.isQcRejected ? 'bg-rose-500' : (prog.isQcHold || prog.isPdiHold) ? 'bg-amber-500' : prog.badgeDot
                }`} />
              </span>
              <span className="truncate max-w-[140px] font-semibold">{prog.statusLabel}</span>
            </div>

            <div className="flex items-center gap-1 text-[10px] font-mono font-bold shrink-0 text-slate-400 dark:text-slate-500">
              <span className="text-slate-700 dark:text-slate-300">Gate {prog.activeStepIndex + 1}/8</span>
              <span>•</span>
              <span>{stagePct}%</span>
            </div>
          </div>

          {/* Apple Discrete 8-Segment Stepper Rail */}
          <div className="grid grid-cols-8 gap-1 w-full" title={`Stage ${prog.activeStepIndex + 1}/8: ${prog.statusLabel} (${stagePct}% complete)`}>
            {ORDER_PROGRESSION_STEPS.map((step, idx) => {
              const isPassed = idx < prog.activeStepIndex;
              const isCurrent = idx === prog.activeStepIndex;
              
              let segmentColor = isDarkMode ? 'bg-white/10' : 'bg-slate-200/80';
              if (isPassed) {
                segmentColor = prog.activeStepIndex >= 7 ? 'bg-emerald-500' : 'bg-blue-600/80 dark:bg-blue-500/80';
              } else if (isCurrent) {
                segmentColor = progressBg;
              }

              return (
                <div
                  key={step.code}
                  title={`${idx + 1}. ${step.fullLabel}`}
                  className="group/step relative"
                >
                  <div
                    className={`h-1.5 rounded-full transition-all duration-300 ${segmentColor}`}
                  />
                </div>
              );
            })}
          </div>
        </div>
      );
    }

    return (
      <div className={`space-y-1.5 select-none ${variant === 'card' ? 'w-full' : 'min-w-[190px] max-w-[270px]'}`}>
        <div className="flex items-center justify-between gap-2">
          <div className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium tracking-tight border ${prog.badgeBg}`}>
            <span className="relative flex h-1.5 w-1.5 shrink-0">
              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                prog.isQcRejected ? 'bg-rose-400' : (prog.isQcHold || prog.isPdiHold) ? 'bg-amber-400' : prog.badgeDot
              }`} />
              <span className={`relative inline-flex rounded-full h-1.5 w-1.5 ${
                prog.isQcRejected ? 'bg-rose-500' : (prog.isQcHold || prog.isPdiHold) ? 'bg-amber-500' : prog.badgeDot
              }`} />
            </span>
            <span className="truncate max-w-[150px] font-medium">{prog.statusLabel}</span>
          </div>

          <div className="flex items-center gap-1 text-[10px] font-mono font-medium shrink-0 text-slate-400 dark:text-slate-500">
            <span>{prog.activeStepIndex + 1}/8</span>
            <span>•</span>
            <span>{stagePct}%</span>
          </div>
        </div>

        <div
          title={`Stage ${prog.activeStepIndex + 1}/8: ${prog.statusLabel} (${stagePct}% complete)`}
          className={`w-full h-1.5 rounded-full overflow-hidden ${
            isDarkMode ? 'bg-white/10' : 'bg-slate-100'
          }`}
        >
          <div
            className={`h-full rounded-full ${progressBg} transition-[width] duration-500 ease-out`}
            style={{ width: `${Math.max(stagePct, 6)}%` }}
          />
        </div>
      </div>
    );
  };

  // Calculated KPI stats
  const totalActiveValue = orders.reduce((sum, o) => sum + (o.grossAmount || 0), 0);
  const inProdCount = orders.filter(o => o.status === 'IN_PRODUCTION' || o.stage === 'IN_PRODUCTION' || o.status === 'JOB_RELEASED').length;
  const qcGateCount = orders.filter(o => o.status === 'QC_INSPECTION' || o.stage === 'QC_INSPECTION' || o.stage === 'QC').length;
  const dispatchReadyCount = orders.filter(o => o.status === 'READY_TO_DISPATCH' || o.stage === 'READY_TO_DISPATCH' || o.status === 'DISPATCHED').length;
  const cancelledCount = orders.filter(o => (o.status || '').toUpperCase() === 'CANCELLED' || (o.stage || '').toUpperCase() === 'CANCELLED' || normalizeOrderState(o.stage) === 'CANCELLED' || normalizeOrderState(o.status) === 'CANCELLED').length;

  const openNewOrderModal = () => {
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
    createOrderModal.open();
  };

  return (
    <div className="space-y-4 sm:space-y-6 font-sans select-none pb-4">

      {/* ========================================================================= */}
      {/* ── MOBILE-FIRST TOP HEADER & QUICK ACTION BAR (< md) ──                   */}
      {/* ========================================================================= */}
      <div className="block md:hidden space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[var(--accent-primary)] animate-pulse" />
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400">
                Sales & Orders Hub
              </span>
            </div>
            <h1 className="text-xl font-black text-slate-900 dark:text-white tracking-tight leading-tight">
              Customer POs ({orders.length})
            </h1>
          </div>

          <button
            onClick={openNewOrderModal}
            className={`min-h-[44px] px-3.5 py-2 rounded-xl text-white font-bold text-xs flex items-center gap-1.5 shadow-md cursor-pointer shrink-0 active:scale-[0.96] transition-transform font-mono ${
              isDarkMode ? 'bg-[#181920] hover:bg-[#252730]' : 'bg-[#155dfc] hover:bg-blue-600'
            }`}
          >
            <Plus className="w-4 h-4" />
            <span>New PO</span>
          </button>
        </div>

        {/* Mobile 2x2 Executive KPI Strip */}
        <div className="grid grid-cols-2 gap-2">
          <div className={`p-3 rounded-2xl border ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
            <div className="text-[10px] font-bold uppercase text-slate-400 font-mono">Order Book Value</div>
            <div className="text-base font-black text-slate-900 dark:text-white tracking-tight mt-0.5">
              ₹{totalActiveValue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
            </div>
          </div>

          <div className={`p-3 rounded-2xl border ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
            <div className="text-[10px] font-bold uppercase text-slate-400 font-mono">In Production</div>
            <div className="text-base font-black text-amber-500 tracking-tight mt-0.5">
              {inProdCount} Active Jobs
            </div>
          </div>

          <div className={`p-3 rounded-2xl border ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
            <div className="text-[10px] font-bold uppercase text-slate-400 font-mono">QC Gate & Hold</div>
            <div className="text-base font-black text-purple-500 tracking-tight mt-0.5">
              {qcGateCount} Inspected
            </div>
          </div>

          <div className={`p-3 rounded-2xl border ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
            <div className="text-[10px] font-bold uppercase text-slate-400 font-mono">Ready to Dispatch</div>
            <div className="text-base font-black text-emerald-500 tracking-tight mt-0.5">
              {dispatchReadyCount} Orders
            </div>
          </div>
        </div>

        {/* Mobile Full-Width Search Input */}
        <div className={`flex items-center gap-2 px-3.5 py-2.5 rounded-2xl border text-xs min-h-[44px] ${
          isDarkMode ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
        }`}>
          <Search className="w-4 h-4 text-slate-400 shrink-0" />
          <input
            type="text"
            placeholder="Search PO#, Customer, Part..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="bg-transparent outline-none w-full font-mono text-xs"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} className="text-slate-400 p-1">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Mobile Horizontal Stage Filter Chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto py-1 no-scrollbar">
          {[
            { id: 'ALL', label: `All (${orders.length})`, active: 'bg-slate-600 text-white', idle: 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/30' },
            { id: 'PO_RECEIVED', label: '1. PO', active: 'bg-slate-500 text-white', idle: 'bg-slate-400/10 text-slate-500 dark:text-slate-400 border-slate-400/30' },
            { id: 'MATERIAL_CHECKED', label: '2. Material', active: 'bg-amber-500 text-white', idle: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30' },
            { id: 'IN_PRODUCTION', label: '3. Prod', active: 'bg-[#5B75F8] text-white', idle: 'bg-[#5B75F8]/10 text-[#5B75F8] dark:text-[#7B92FF] border-[#5B75F8]/30' },
            { id: 'QC_INSPECTION', label: '4. QC', active: 'bg-orange-600 text-white', idle: 'bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/30' },
            { id: 'READY_TO_DISPATCH', label: '5. PDI', active: 'bg-purple-600 text-white', idle: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/30' },
            { id: 'DISPATCHED', label: '6. Dispatch', active: 'bg-cyan-600 text-white', idle: 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/30' },
            { id: 'INVOICED', label: '7. Invoice', active: 'bg-teal-600 text-white', idle: 'bg-teal-500/10 text-teal-600 dark:text-teal-400 border-teal-500/30' },
            { id: 'CLOSED', label: '8. Closed', active: 'bg-emerald-600 text-white', idle: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30' },
            { id: 'CANCELLED', label: `Cancelled (${cancelledCount})`, active: 'bg-rose-600 text-white', idle: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30' }
          ].map((stage) => {
            const isSelected = statusFilter === stage.id;
            return (
              <button
                key={stage.id}
                onClick={() => setStatusFilter(stage.id)}
                className={`min-h-[36px] px-3 py-1 rounded-xl text-xs font-bold font-mono shrink-0 transition-ui border cursor-pointer ${
                  isSelected
                    ? `${stage.active} shadow-xs border-transparent scale-105`
                    : `${stage.idle}`
                }`}
              >
                {stage.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* ── DESKTOP HEADER & KPI ROW (≥ md) ──                                      */}
      {/* ========================================================================= */}
      <div className="hidden md:block space-y-4">
        {/* Apple macOS Frosted Header & Integrated Metrics */}
        <section className={`relative isolate overflow-hidden rounded-2xl border transition-all ${
          isDarkMode
            ? 'border-white/10 bg-gradient-to-b from-[#111318] via-[#090a0d] to-[#020204] text-white shadow-[0_16px_44px_rgba(0,0,0,0.6),inset_0_1px_0_0_rgba(255,255,255,0.06)]'
            : 'border-slate-200/90 bg-[radial-gradient(120%_120%_at_100%_0%,#c2e7fd_0%,rgba(194,231,253,0.45)_24%,rgba(194,231,253,0)_60%),linear-gradient(180deg,#ffffff_0%,#fbfdff_52%,#eff6fe_100%)] text-black shadow-[0_1px_2px_rgba(15,23,42,0.04),0_12px_32px_-12px_rgba(15,23,42,0.12),inset_0_1px_0_0_rgba(255,255,255,0.9)]'
        }`}>
          {/* Light-scheme only: whisper-faint drafting grid, dissolved before the KPI shelf */}
          {!isDarkMode && (
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 -z-10 bg-grid-pattern opacity-70 [mask-image:linear-gradient(to_bottom,black,transparent_72%)] [-webkit-mask-image:linear-gradient(to_bottom,black,transparent_72%)]"
            />
          )}

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 px-6 py-6 sm:py-7">
            <div className="min-w-0 space-y-1.5">
              <div className="flex items-center gap-2.5">
                <span className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold tracking-wide ${
                  isDarkMode
                    ? 'bg-white/10 border border-white/15 text-white'
                    : 'bg-white/80 border border-slate-200/90 backdrop-blur-md text-black shadow-2xs'
                }`}>
                  <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span>Active Order Book</span>
                </span>
                <span className={`text-sm font-semibold ${isDarkMode ? 'text-white/80' : 'text-black/45'}`}>•</span>
                <span className={`text-xs sm:text-sm font-semibold ${isDarkMode ? 'text-white/95' : 'text-black/70'}`}>
                  {orders.length} Purchase Orders
                </span>
              </div>

              <h1 className={`text-3xl sm:text-[32px] font-black tracking-tight leading-tight ${isDarkMode ? 'text-white' : 'text-black'}`}>
                Customer Purchase Orders
              </h1>

              <p className={`text-xs sm:text-sm font-medium leading-relaxed max-w-2xl ${isDarkMode ? 'text-white/95' : 'text-black/70'}`}>
                Real-time commercial value, engineering handoffs, and gated production commitments.
              </p>
            </div>

            <button
              onClick={openNewOrderModal}
              className={`inline-flex items-center gap-2 px-5 py-3 rounded-full text-xs sm:text-sm font-bold shadow-md transition-all active:scale-95 cursor-pointer shrink-0 self-start sm:self-auto ${
                isDarkMode
                  ? 'bg-white hover:bg-slate-100 text-slate-950 shadow-black/40'
                  : 'bg-white hover:bg-slate-50 text-black border border-slate-200/90 shadow-md shadow-slate-900/10 hover:shadow-lg hover:shadow-slate-900/15'
              }`}
            >
              <Plus className="h-4 w-4 stroke-[3]" />
              <span>New Purchase Order</span>
            </button>
          </div>

          <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 border-t ${
            isDarkMode
              ? 'border-white/10 bg-gradient-to-b from-black/40 to-black/70 backdrop-blur-md'
              : 'border-slate-200/70 bg-white/55 backdrop-blur-md'
          }`}>
            {[
              {
                label: 'Pipeline Value',
                value: `₹${totalActiveValue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`,
                detail: `${orders.length} total active contracts`,
                icon: TrendingUp,
                iconColor: isDarkMode ? 'text-white' : 'text-[#1d4ed8]',
                iconBg: isDarkMode ? 'bg-blue-600 shadow-xs' : 'bg-[#e8f2fe] ring-1 ring-inset ring-black/[0.04] shadow-2xs',
              },
              {
                label: 'In Production',
                value: String(inProdCount),
                detail: 'Shopfloor active jobs',
                icon: Package,
                iconColor: isDarkMode ? 'text-white' : 'text-[#b45309]',
                iconBg: isDarkMode ? 'bg-amber-500 shadow-xs' : 'bg-[#fdf5e6] ring-1 ring-inset ring-black/[0.04] shadow-2xs',
              },
              {
                label: 'Quality Gate',
                value: String(qcGateCount),
                detail: 'Under inspection & NCR',
                icon: ShieldCheck,
                iconColor: isDarkMode ? 'text-white' : 'text-[#6d28d9]',
                iconBg: isDarkMode ? 'bg-purple-600 shadow-xs' : 'bg-[#f4efff] ring-1 ring-inset ring-black/[0.04] shadow-2xs',
              },
              {
                label: 'Ready for Dispatch',
                value: String(dispatchReadyCount),
                detail: 'PDI cleared shipments',
                icon: Truck,
                iconColor: isDarkMode ? 'text-white' : 'text-[#047857]',
                iconBg: isDarkMode ? 'bg-emerald-500 shadow-xs' : 'bg-[#e9f7f1] ring-1 ring-inset ring-black/[0.04] shadow-2xs',
              },
            ].map((metric, index) => {
              const MetricIcon = metric.icon;
              return (
                <div
                  key={metric.label}
                  className={`flex items-center gap-4 px-6 py-5 transition-all ${isDarkMode ? '' : 'hover:bg-white/60'} ${
                    index > 0 ? (isDarkMode ? 'lg:border-l border-white/10' : 'lg:border-l border-slate-200/70') : ''
                  }`}
                >
                  <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${metric.iconBg} ${metric.iconColor}`}>
                    <MetricIcon className="h-5 w-5 stroke-[2.5]" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className={`text-xs font-bold uppercase tracking-wider ${isDarkMode ? 'text-white/85' : 'text-black/60'}`}>
                      {metric.label}
                    </div>
                    <div className={`text-2xl sm:text-[26px] font-black tracking-tight tabular-nums my-0.5 leading-tight ${isDarkMode ? 'text-white' : 'text-black'}`}>
                      {metric.value}
                    </div>
                    <div className={`text-xs font-medium truncate ${isDarkMode ? 'text-white/90' : 'text-black/60'}`}>
                      {metric.detail}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Apple macOS Style Pro Command Deck / Filters */}
        <div className={`rounded-2xl border p-3.5 space-y-3 transition-all backdrop-blur-xl ${
          isDarkMode
            ? 'border-white/10 bg-gradient-to-b from-[#111318] via-[#090a0d] to-[#020204] shadow-[0_8px_28px_rgba(0,0,0,0.5),inset_0_1px_0_0_rgba(255,255,255,0.06)]'
            : 'border-slate-200/80 bg-gradient-to-b from-white/95 via-slate-50/90 to-slate-100/70 shadow-[0_2px_12px_rgba(0,0,0,0.03),inset_0_1px_0_0_rgba(255,255,255,0.9)]'
        }`}>
          {/* Top Tier: Apple Segmented Stage Filter Rail */}
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className={`inline-flex items-center p-1 rounded-xl border text-xs ${
              isDarkMode ? 'border-white/10 bg-black/60' : 'border-slate-200/80 bg-slate-200/50 shadow-inner'
            }`}>
              <button
                type="button"
                onClick={() => setStatusFilter('ALL')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  statusFilter === 'ALL'
                    ? isDarkMode ? 'bg-white/15 text-white shadow-xs border border-white/10' : 'bg-white text-slate-900 shadow-xs border border-slate-200/80'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <span>All Orders</span>
                <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full ${
                  statusFilter === 'ALL'
                    ? isDarkMode ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-800'
                    : isDarkMode ? 'bg-white/5 text-slate-400' : 'bg-slate-300/60 text-slate-600'
                }`}>
                  {orders.length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setStatusFilter('IN_PRODUCTION')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  statusFilter === 'IN_PRODUCTION'
                    ? isDarkMode ? 'bg-white/15 text-white shadow-xs border border-white/10' : 'bg-white text-slate-900 shadow-xs border border-slate-200/80'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <span>In Production</span>
                <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full ${
                  statusFilter === 'IN_PRODUCTION'
                    ? isDarkMode ? 'bg-blue-500/30 text-blue-300' : 'bg-blue-50 text-blue-700'
                    : isDarkMode ? 'bg-white/5 text-slate-400' : 'bg-slate-300/60 text-slate-600'
                }`}>
                  {inProdCount}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setStatusFilter('QC_INSPECTION')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  statusFilter === 'QC_INSPECTION'
                    ? isDarkMode ? 'bg-white/15 text-white shadow-xs border border-white/10' : 'bg-white text-slate-900 shadow-xs border border-slate-200/80'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <span>QC Gate</span>
                <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full ${
                  statusFilter === 'QC_INSPECTION'
                    ? isDarkMode ? 'bg-orange-500/30 text-orange-300' : 'bg-orange-50 text-orange-700'
                    : isDarkMode ? 'bg-white/5 text-slate-400' : 'bg-slate-300/60 text-slate-600'
                }`}>
                  {qcGateCount}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setStatusFilter('READY_TO_DISPATCH')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  statusFilter === 'READY_TO_DISPATCH'
                    ? isDarkMode ? 'bg-white/15 text-white shadow-xs border border-white/10' : 'bg-white text-slate-900 shadow-xs border border-slate-200/80'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <span>Ready to Dispatch</span>
                <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full ${
                  statusFilter === 'READY_TO_DISPATCH'
                    ? isDarkMode ? 'bg-purple-500/30 text-purple-300' : 'bg-purple-50 text-purple-700'
                    : isDarkMode ? 'bg-white/5 text-slate-400' : 'bg-slate-300/60 text-slate-600'
                }`}>
                  {dispatchReadyCount}
                </span>
              </button>

              {cancelledCount > 0 && (
                <button
                  type="button"
                  onClick={() => setStatusFilter('CANCELLED')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                    statusFilter === 'CANCELLED'
                      ? isDarkMode ? 'bg-white/15 text-white shadow-xs border border-white/10' : 'bg-white text-slate-900 shadow-xs border border-slate-200/80'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <span>Cancelled</span>
                  <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full ${
                    statusFilter === 'CANCELLED'
                      ? isDarkMode ? 'bg-rose-500/30 text-rose-300' : 'bg-rose-50 text-rose-700'
                    : isDarkMode ? 'bg-white/5 text-slate-400' : 'bg-slate-300/60 text-slate-600'
                  }`}>
                    {cancelledCount}
                  </span>
                </button>
              )}
            </div>

            {/* Quick status counters & Reset */}
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 dark:text-slate-400">
              <span className="hidden sm:inline">Showing <strong className="text-slate-900 dark:text-white">{sortedOrders.length}</strong> of {orders.length} orders</span>
              {(statusFilter !== 'ALL' || subTypeFilter !== 'ALL' || searchQuery.trim() !== '' || sortField !== 'RECENCY' || sortDirection !== 'DESC') && (
                <button
                  onClick={() => {
                    setStatusFilter('ALL');
                    setSubTypeFilter('ALL');
                    setSearchQuery('');
                    setSortField('RECENCY');
                    setSortDirection('DESC');
                  }}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                >
                  <X className="w-3 h-3" />
                  <span>Reset All</span>
                </button>
              )}
            </div>
          </div>

          {/* Bottom Tier: Spotlight Search & Granular Controls */}
          <div className="flex items-center gap-2.5 flex-wrap">
            {/* Apple Spotlight Search Input */}
            <div className={`flex h-10 min-w-[280px] flex-1 items-center gap-2.5 rounded-xl border px-3 transition-all ${
              isDarkMode
                ? 'border-white/10 bg-black/60 text-white focus-within:border-white/30 focus-within:bg-black/90'
                : 'border-slate-200/90 bg-white text-slate-900 shadow-2xs focus-within:border-slate-400 focus-within:ring-2 focus-within:ring-slate-200/60'
            }`}>
              <Search className="h-4 w-4 shrink-0 text-slate-400" />
              <input
                type="text"
                placeholder="Search PO number, customer, part, heat lot, revision..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-full w-full bg-transparent text-xs font-medium outline-none placeholder:text-slate-400"
              />
              <span className="hidden sm:inline-block text-[10px] font-mono text-slate-400 border border-slate-200 dark:border-white/10 px-1.5 py-0.5 rounded bg-slate-50 dark:bg-white/5">
                ⌘F
              </span>
              {searchQuery && (
                <button type="button" onClick={() => setSearchQuery('')} className="text-slate-400 hover:text-slate-600 dark:hover:text-white p-0.5 cursor-pointer">
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            {/* SubType Filter Pill */}
            <select
              value={subTypeFilter}
              onChange={(e) => setSubTypeFilter(e.target.value)}
              className={`h-10 rounded-xl border px-3 text-xs font-semibold outline-none cursor-pointer transition-all ${
                isDarkMode ? 'border-white/10 bg-black/60 text-slate-200 hover:bg-black/80' : 'border-slate-200/90 bg-white text-slate-700 shadow-2xs hover:bg-slate-50'
              }`}
            >
              <option value="ALL">All Types ({orders.length})</option>
              <option value="FRESH_PO">Fresh POs ({orders.filter(o => (o.subType || 'FRESH_PO') === 'FRESH_PO').length})</option>
              <option value="BLANKET_CALLOFF">Blanket Call-Offs ({orders.filter(o => o.subType === 'BLANKET_CALLOFF').length})</option>
              <option value="AMENDMENT">Amendments ({orders.filter(o => o.subType === 'AMENDMENT').length})</option>
            </select>

            {/* Granular Stage Filter Pill */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className={`h-10 rounded-xl border px-3 text-xs font-semibold outline-none cursor-pointer transition-all ${
                isDarkMode ? 'border-white/10 bg-black/60 text-slate-200 hover:bg-black/80' : 'border-slate-200/90 bg-white text-slate-700 shadow-2xs hover:bg-slate-50'
              }`}
            >
              <option value="ALL">All 8 Stages</option>
              <option value="PO_RECEIVED">1. PO Confirmed</option>
              <option value="MATERIAL_CHECKED">2. Material Verified</option>
              <option value="IN_PRODUCTION">3. In Production</option>
              <option value="QC_INSPECTION">4. QC Inspection & NCR</option>
              <option value="READY_TO_DISPATCH">5. PDI / Ready to Dispatch</option>
              <option value="DISPATCHED">6. Outward Dispatched</option>
              <option value="INVOICED">7. GST Invoiced</option>
              <option value="CLOSED">8. Closed & Settled</option>
              <option value="CANCELLED">Cancelled ({cancelledCount})</option>
            </select>

            {/* Sort Pill */}
            <select
              value={`${sortField}_${sortDirection}`}
              onChange={(e) => {
                const [field, dir] = e.target.value.split('_');
                setSortField(field as any);
                setSortDirection(dir as any);
              }}
              className={`h-10 rounded-xl border px-3 text-xs font-semibold outline-none cursor-pointer transition-all ${
                isDarkMode ? 'border-white/10 bg-black/60 text-slate-200 hover:bg-black/80' : 'border-slate-200/90 bg-white text-slate-700 shadow-2xs hover:bg-slate-50'
              }`}
            >
              <option value="RECENCY_DESC">Sort: Recent Orders</option>
              <option value="RECENCY_ASC">Sort: Oldest Orders First</option>
              <option value="PO_NO_ASC">Sort: PO Number (A → Z)</option>
              <option value="PO_NO_DESC">Sort: PO Number (Z → A)</option>
              <option value="CUSTOMER_ASC">Sort: Customer (A → Z)</option>
              <option value="AMOUNT_DESC">Sort: Amount (High → Low)</option>
              <option value="AMOUNT_ASC">Sort: Amount (Low → High)</option>
            </select>

            {/* Apple Segmented View Toggle */}
            <div className={`flex h-10 items-center rounded-xl border p-0.5 ${
              isDarkMode ? 'border-white/10 bg-black/60' : 'border-slate-200/90 bg-slate-200/70 shadow-inner'
            }`}>
              <button
                onClick={() => setViewMode('table')}
                className={`flex h-8.5 w-9 items-center justify-center rounded-lg transition-all cursor-pointer ${
                  viewMode === 'table'
                    ? isDarkMode ? 'bg-white/15 text-white shadow-2xs' : 'bg-white text-slate-900 shadow-2xs'
                    : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'
                }`}
                title="Table View"
              >
                <List className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('grid')}
                className={`flex h-8.5 w-9 items-center justify-center rounded-lg transition-all cursor-pointer ${
                  viewMode === 'grid'
                    ? isDarkMode ? 'bg-white/15 text-white shadow-2xs' : 'bg-white text-slate-900 shadow-2xs'
                    : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'
                }`}
                title="Grid View"
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* ── DEDICATED MOBILE ORDER CARDS (< md) ──                                  */}
      {/* ========================================================================= */}
      <div className="block md:hidden space-y-3">
        {sortedOrders.length === 0 ? (
          <div className={`p-8 rounded-3xl border text-center ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
            <ShoppingCart className="w-8 h-8 text-slate-400 mx-auto mb-2 opacity-50" />
            <p className="text-xs font-bold text-slate-700 dark:text-slate-300">No purchase orders found</p>
            <p className="text-[10px] text-slate-400 mt-0.5">Try clearing your filters</p>
          </div>
        ) : (
          sortedOrders.map((ord) => {
            const subType = ord.subType || 'FRESH_PO';
            const hasCreditHold = ord.isCustomerOnCreditHold;
            const prog = getOrderProgression(ord);

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
                className={`p-4 rounded-2xl border space-y-3 cursor-pointer shadow-2xs active:scale-[0.96] transition-ui ${
                  isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
                }`}
              >
                {/* Header: PO Number + Type Pill */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className={`font-mono font-black text-sm truncate ${prog.isCancelled ? 'line-through opacity-70 text-slate-400' : 'text-[var(--accent-primary)]'}`}>
                      {ord.poNo}
                    </span>
                    {prog.isCancelled ? (
                      <span className="px-2 py-0.5 rounded-full text-[9px] font-semibold tracking-tight border bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30 shrink-0">
                        Cancelled
                      </span>
                    ) : (
                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-semibold tracking-tight border shrink-0 ${
                        subType === 'BLANKET_CALLOFF'
                          ? 'bg-purple-500/15 text-purple-600 dark:text-purple-400 border-purple-500/30'
                          : 'bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30'
                      }`}>
                        {subType === 'BLANKET_CALLOFF' ? 'Blanket' : 'Fresh PO'}
                      </span>
                    )}
                  </div>

                  <span className="text-[10px] text-slate-400 font-mono">
                    {ord.lines ? `${ord.lines.length} Lines` : `${ord.orderedQty || 1} Units`}
                  </span>
                </div>

                {/* Customer Name & Tags */}
                <div>
                  <div className="text-xs font-bold text-slate-900 dark:text-white truncate">
                    {ord.customerName}
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5 mt-1">
                    {hasCreditHold && (
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30">
                        <AlertCircle className="w-2.5 h-2.5" />
                        <span>Credit Hold</span>
                      </span>
                    )}

                    {ord.heatLotNumber && (
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                        <Flame className="w-2.5 h-2.5" />
                        <span>Lot: {ord.heatLotNumber}</span>
                      </span>
                    )}

                    {ord.drawingRevision && (
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-mono text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800">
                        <span>Rev: {ord.drawingRevision}</span>
                      </span>
                    )}
                  </div>
                </div>

                {/* Quantitative Details */}
                <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
                  <div>
                    <div className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">
                      PO Date: <span className="font-semibold text-slate-700 dark:text-slate-300">{ord.poDate || 'N/A'}</span> • Del: <span className="font-semibold text-slate-700 dark:text-slate-300">{ord.deliveryDate || 'N/A'}</span>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="text-sm font-black font-mono text-slate-900 dark:text-white">
                      ₹{ord.grossAmount.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                    </div>
                  </div>
                </div>

                {/* 8-Stage Gated Progression Stepper Bar (QC & PDI Integrated) */}
                <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80">
                  {renderProgressionStepper(ord, 'card')}
                </div>

                {/* Mobile Tap Action */}
                <button
                  type="button"
                  className="w-full min-h-[40px] py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <span>Inspect Order Lifecycle</span>
                  <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                </button>
              </div>
            );
          })
        )}
      </div>

      {/* ========================================================================= */}
      {/* ── DESKTOP TABLE & GRID VIEWS (≥ md) ──                                    */}
      {/* ========================================================================= */}
      <div className="hidden md:block">
        {viewMode === 'table' ? (
          <div className={`overflow-hidden rounded-3xl border transition-all ${
            isDarkMode
              ? 'border-white/[0.08] bg-gradient-to-b from-[#111318] via-[#08090c] to-[#010203] shadow-[0_20px_50px_rgba(0,0,0,0.6),inset_0_1px_0_0_rgba(255,255,255,0.06)]'
              : 'border-slate-200/90 bg-gradient-to-b from-white via-slate-50/40 to-[#f6f8fc] shadow-[0_16px_40px_rgba(15,23,42,0.05),inset_0_1px_0_0_rgba(255,255,255,1)]'
          }`}>
            {/* Table Queue Header Bar */}
            <div className={`flex items-center justify-between border-b px-6 py-4.5 transition-all ${
              isDarkMode
                ? 'border-white/[0.08] bg-gradient-to-r from-black/60 via-black/30 to-black/60'
                : 'border-slate-200/80 bg-gradient-to-r from-slate-50/90 via-white/60 to-slate-50/90'
            }`}>
              <div className="flex items-center gap-3.5">
                <div className={`flex h-10 w-10 items-center justify-center rounded-2xl shadow-xs ${
                  isDarkMode ? 'bg-white/10 text-white border border-white/10' : 'bg-slate-900 text-white shadow-2xs'
                }`}>
                  <ShoppingCart className="h-5 w-5 stroke-[2]" />
                </div>
                <div>
                  <div className="text-base font-black tracking-tight text-slate-900 dark:text-white">
                    Order Lifecycle Queue
                  </div>
                  <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
                    Commercial validation and gated manufacturing handoffs across 8 precision verification gates
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2.5">
                <span className={`hidden lg:inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1 text-xs font-mono font-bold tracking-tight ${
                  isDarkMode
                    ? 'border-white/10 bg-black/60 text-slate-300'
                    : 'border-slate-200/90 bg-white text-slate-700 shadow-2xs'
                }`}>
                  <span className="text-slate-400 font-normal">Pipeline:</span>
                  <span className="text-slate-900 dark:text-white font-black">₹{totalActiveValue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span>
                </span>

                <span className={`rounded-full border px-3 py-1 font-mono text-xs font-bold tracking-tight ${
                  isDarkMode
                    ? 'border-white/10 bg-black/60 text-slate-300'
                    : 'border-slate-200 bg-white text-slate-700 shadow-2xs'
                }`}>
                  {sortedOrders.length} records
                </span>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse font-sans">
                <thead>
                  <tr className={`border-b text-[11px] font-bold uppercase tracking-wider transition-all ${
                    isDarkMode
                      ? 'border-white/[0.07] bg-gradient-to-b from-black/80 to-black/60 text-slate-400'
                      : 'border-slate-200/90 bg-gradient-to-b from-slate-100/90 to-slate-50/90 text-slate-600'
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
                      className="py-4 px-6 cursor-pointer select-none transition-colors hover:text-blue-600 dark:hover:text-blue-400"
                    >
                      <div className="flex items-center gap-2">
                        <span>Purchase Order & Part Details</span>
                        {sortField === 'RECENCY' && (
                          <span className="text-[10px] font-mono font-bold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 px-2 py-0.5 rounded-full">
                            {sortDirection === 'DESC' ? '↓ Recent' : '↑ Oldest'}
                          </span>
                        )}
                        {sortField === 'PO_NO' && (
                          <span className="text-blue-600 dark:text-blue-400">{sortDirection === 'ASC' ? '↑' : '↓'}</span>
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
                      className="py-4 px-6 cursor-pointer select-none transition-colors hover:text-blue-600 dark:hover:text-blue-400"
                    >
                      <div className="flex items-center gap-2">
                        <span>Customer & Credit Risk</span>
                        {sortField === 'CUSTOMER' && (
                          <span className="text-blue-600 dark:text-blue-400">{sortDirection === 'ASC' ? '↑' : '↓'}</span>
                        )}
                      </div>
                    </th>
                    <th className="py-4 px-6">Gated Lifecycle Pipeline</th>
                    <th
                      onClick={() => {
                        if (sortField === 'AMOUNT') {
                          setSortDirection(d => d === 'ASC' ? 'DESC' : 'ASC');
                        } else {
                          setSortField('AMOUNT');
                          setSortDirection('DESC');
                        }
                      }}
                      className="py-4 px-6 text-right cursor-pointer select-none transition-colors hover:text-blue-600 dark:hover:text-blue-400"
                    >
                      <div className="flex items-center justify-end gap-2">
                        <span>Commercial Value</span>
                        {sortField === 'AMOUNT' && (
                          <span className="text-blue-600 dark:text-blue-400">{sortDirection === 'ASC' ? '↑' : '↓'}</span>
                        )}
                      </div>
                    </th>
                    <th className="py-4 px-6 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className={`divide-y transition-colors ${
                  isDarkMode ? 'divide-white/[0.05]' : 'divide-slate-200/80'
                }`}>
                  {sortedOrders.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-20 text-center">
                        <div className="flex flex-col items-center justify-center gap-3">
                          <div className={`w-14 h-14 rounded-3xl flex items-center justify-center ${
                            isDarkMode ? 'bg-white/5 text-slate-400' : 'bg-slate-100 text-slate-400'
                          }`}>
                            <ShoppingCart className="w-7 h-7 opacity-40" />
                          </div>
                          <div>
                            <p className={`text-base font-bold ${isDarkMode ? 'text-slate-200' : 'text-slate-800'}`}>
                              No purchase orders match your criteria
                            </p>
                            <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                              Try adjusting your search terms, stage filter, or resetting all filters
                            </p>
                          </div>
                          {(statusFilter !== 'ALL' || subTypeFilter !== 'ALL' || searchQuery.trim() !== '') && (
                            <button
                              onClick={() => {
                                setStatusFilter('ALL');
                                setSubTypeFilter('ALL');
                                setSearchQuery('');
                              }}
                              className="mt-2 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-[#155dfc] text-white hover:bg-blue-600 transition-colors shadow-xs cursor-pointer"
                            >
                              <RefreshCw className="w-3.5 h-3.5" />
                              <span>Reset Filters</span>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ) : (
                    sortedOrders.map((ord) => {
                      const subType = ord.subType || 'FRESH_PO';
                      const hasCreditHold = ord.isCustomerOnCreditHold;
                      const prog = getOrderProgression(ord);

                      return (
                        <tr
                          key={ord.id}
                          onClick={() => onSelectOrder(ord)}
                          className={`group cursor-pointer transition-all ${
                            isDarkMode
                              ? 'even:bg-white/[0.015] hover:bg-gradient-to-r hover:from-white/[0.06] hover:via-white/[0.02] hover:to-transparent'
                              : 'even:bg-slate-50/50 hover:bg-gradient-to-r hover:from-blue-500/[0.05] hover:via-indigo-500/[0.03] hover:to-transparent'
                          }`}
                        >
                          <td className="py-4.5 px-6">
                            <div className="flex items-center gap-3.5">
                              <div className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-105 shadow-2xs ${
                                prog.isCancelled
                                  ? isDarkMode ? 'bg-rose-500/15 text-rose-400 border border-rose-500/30' : 'bg-rose-50 text-rose-600 border border-rose-200'
                                  : subType === 'BLANKET_CALLOFF'
                                  ? isDarkMode ? 'bg-purple-500/15 text-purple-300 border border-purple-500/20' : 'bg-purple-50 text-purple-700 border border-purple-200'
                                  : isDarkMode ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' : 'bg-blue-50 text-blue-600 border border-blue-200/70'
                              }`}>
                                <ShoppingCart className="w-5 h-5 stroke-[2]" />
                              </div>
                              <div className="min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className={`font-mono text-sm tracking-tight ${
                                    prog.isCancelled
                                      ? 'line-through opacity-70 text-slate-400 font-bold'
                                      : 'text-slate-900 dark:text-white font-black'
                                  }`}>
                                    {ord.poNo}
                                  </span>
                                  {prog.isCancelled ? (
                                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-tight border bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30">
                                      Cancelled
                                    </span>
                                  ) : (
                                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-tight border ${
                                      subType === 'BLANKET_CALLOFF'
                                        ? isDarkMode ? 'bg-purple-500/15 text-purple-300 border-purple-500/30' : 'bg-purple-50 text-purple-700 border-purple-200'
                                        : subType === 'AMENDMENT'
                                          ? isDarkMode ? 'bg-amber-500/15 text-amber-300 border-amber-500/30' : 'bg-amber-50 text-amber-800 border-amber-200'
                                          : isDarkMode ? 'bg-blue-500/15 text-blue-400 border-blue-500/30' : 'bg-blue-50 text-blue-700 border-blue-200'
                                    }`}>
                                      {subType === 'BLANKET_CALLOFF' ? 'Blanket Call-off' : subType === 'AMENDMENT' ? 'Amendment' : 'Fresh PO'}
                                    </span>
                                  )}
                                </div>
                                {(ord.partDescription || (ord.lines && ord.lines[0]?.itemDescription)) && (
                                  <div className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate max-w-[320px] mt-1">
                                    {ord.partDescription || ord.lines[0]?.itemDescription}
                                  </div>
                                )}
                                <div className="text-xs font-medium text-slate-400 dark:text-slate-500 flex items-center gap-1.5 mt-0.5">
                                  <span>{ord.lines ? `${ord.lines.length} Line${ord.lines.length > 1 ? 's' : ''}` : '0 Lines'}</span>
                                  <span>•</span>
                                  <span>PO: {ord.poDate || ord.createdAt?.split('T')[0] || 'N/A'}</span>
                                  <span>•</span>
                                  <span className="text-slate-600 dark:text-slate-300 font-semibold">Due: {ord.deliveryDate || 'N/A'}</span>
                                </div>
                              </div>
                            </div>
                          </td>

                          <td className="py-4.5 px-6">
                            <div className="text-sm font-bold text-slate-900 dark:text-white leading-snug">
                              {ord.customerName}
                            </div>
                            <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                              {hasCreditHold ? (
                                <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                                  isDarkMode ? 'bg-rose-500/15 text-rose-400 border-rose-500/30' : 'bg-rose-50 text-rose-700 border-rose-200'
                                }`}>
                                  <AlertCircle className="w-3 h-3 text-rose-500 shrink-0" />
                                  <span>Credit Hold {ord.creditHoldOverrideBy ? '(Overridden)' : '(Blocked)'}</span>
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                  <span>Credit OK</span>
                                </span>
                              )}

                              {ord.heatLotNumber && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-mono font-semibold bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20">
                                  <span>Lot: {ord.heatLotNumber}</span>
                                </span>
                              )}

                              {ord.drawingRevision && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-mono text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-white/[0.06] border border-slate-200/80 dark:border-white/10">
                                  <span>Rev: {ord.drawingRevision}</span>
                                </span>
                              )}
                            </div>
                          </td>

                          <td className="py-4.5 px-6">
                            {renderProgressionStepper(ord, 'table')}
                          </td>

                          <td className="py-4.5 px-6 text-right">
                            <div className="text-sm sm:text-base font-black font-mono text-slate-900 dark:text-white tabular-nums tracking-tight">
                              ₹{ord.grossAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                            </div>
                            <div className="text-[11px] font-semibold text-slate-400 mt-0.5">
                              Total Contract
                            </div>
                          </td>

                          <td className="py-4.5 px-6 text-center">
                            <button
                              type="button"
                              className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold transition-all shadow-2xs active:scale-95 cursor-pointer ${
                                isDarkMode
                                  ? 'border border-white/10 bg-white/10 text-white hover:bg-blue-600 hover:border-transparent'
                                  : 'border border-slate-200/90 bg-white text-slate-700 hover:bg-[#155dfc] hover:text-white hover:border-transparent hover:shadow-xs'
                              }`}
                            >
                              <span>Inspect</span>
                              <ChevronRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
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
          <div className="grid grid-cols-1 gap-3.5 md:grid-cols-2 2xl:grid-cols-3">
            {sortedOrders.map((ord) => {
              const prog = getOrderProgression(ord);
              return (
                <div
                  key={ord.id}
                  onClick={() => onSelectOrder(ord)}
                  className={`group cursor-pointer space-y-3.5 rounded-3xl border p-5 transition-all backdrop-blur-xl ${
                    isDarkMode 
                      ? 'border-white/10 bg-gradient-to-b from-[#111318] via-[#08090c] to-[#020204] hover:border-white/20 shadow-[0_8px_24px_rgba(0,0,0,0.5)]' 
                      : 'border-slate-200/90 bg-gradient-to-b from-white via-slate-50/50 to-slate-100/30 hover:border-slate-300 shadow-[0_8px_24px_rgba(15,23,42,0.04)] hover:shadow-[0_12px_32px_rgba(15,23,42,0.08)]'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className={`font-mono font-black text-sm tracking-tight ${prog.isCancelled ? 'line-through opacity-70 text-slate-400' : 'text-slate-900 dark:text-white'}`}>{ord.poNo}</div>
                      {prog.isCancelled ? (
                        <span className="px-2 py-0.5 rounded-full text-[9px] font-bold tracking-tight border bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30">
                          Cancelled
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-[9px] font-bold tracking-tight border bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20">
                          {ord.subType === 'BLANKET_CALLOFF' ? 'Blanket' : ord.subType === 'AMENDMENT' ? 'Amendment' : 'Fresh PO'}
                        </span>
                      )}
                    </div>
                    <div className="text-sm font-black font-mono text-slate-900 dark:text-white">
                      ₹{ord.grossAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </div>
                  </div>
                  <div>
                    <div className={`text-xs font-bold ${isDarkMode ? 'text-slate-100' : 'text-slate-900'}`}>{ord.customerName}</div>
                    {(ord.partDescription || (ord.lines && ord.lines[0]?.itemDescription)) && (
                      <div className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">
                        {ord.partDescription || ord.lines[0]?.itemDescription}
                      </div>
                    )}
                  </div>
                  <div className={`text-[11px] font-medium flex items-center justify-between ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                    <span>PO Date: <strong className="text-slate-700 dark:text-slate-300">{ord.poDate || ord.createdAt?.split('T')[0] || 'N/A'}</strong></span>
                    <span>Due: <strong className="text-slate-700 dark:text-slate-300">{ord.deliveryDate || 'N/A'}</strong></span>
                  </div>
                  <div className="pt-2 border-t border-slate-100 dark:border-white/5">
                    {renderProgressionStepper(ord, 'grid')}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* ── CREATE PURCHASE ORDER MODAL ──                                          */}
      {/* ========================================================================= */}
      <Modal
        isOpen={createOrderModal.isOpen}
        onClose={() => createOrderModal.close()}
        isDarkMode={isDarkMode}
        maxWidth="4xl"
        icon={<Plus className="w-5 h-5" />}
        title="Create Purchase Order / Blanket Call-Off"
        subtitle="Stage 1 Precondition: Customer Master Indexing & Credit Check"
        footer={
          <>
            <div className={`flex items-center justify-between px-4 py-2.5 rounded-xl font-mono border shadow-xs ${
              isDarkMode ? 'bg-[#09090B] border-slate-800' : 'bg-slate-50 border-slate-200'
            }`}>
              <span className={`text-xs font-medium ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>Total Gross:</span>
              <span className="font-black text-emerald-500 dark:text-emerald-400 text-sm ml-3">
                ₹{totalCalculatedGross.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </span>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => createOrderModal.close()}
                className={`min-h-[42px] px-4 py-2 rounded-xl text-xs font-bold transition-ui cursor-pointer ${
                  isDarkMode 
                    ? 'text-slate-300 hover:text-white bg-slate-800/60 hover:bg-slate-800 border border-slate-750' 
                    : 'border border-slate-300 text-slate-700 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                Cancel
              </button>
              <button
                type="submit"
                form="create-po-form"
                className="min-h-[42px] px-6 py-2 rounded-xl bg-[#181920] hover:bg-[#252730] text-white font-bold text-xs shadow-lg shadow-black/20 cursor-pointer transition-ui hover:scale-[1.01] active:scale-[0.96]"
              >
                Validate & Confirm Order
              </button>
            </div>
          </>
        }
      >
        {/* Validation Error Banner */}
        {validationError && (
          <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-3 shadow-xs">
            <AlertTriangle className="w-4 h-4 text-rose-400 mt-0.5 shrink-0" />
            <div>
              <div className="font-bold uppercase tracking-wider text-[11px] text-rose-400">Precondition Gate Blocked</div>
              <div className="text-xs mt-1 leading-relaxed text-rose-200">{validationError}</div>
            </div>
          </div>
        )}

        <form id="create-po-form" onSubmit={handleCreateSubmit} className="space-y-5 text-xs font-sans">

          {/* Sub-Type Selection - Fresh PO or Blanket Call-Off */}
          <div className={`p-1.5 rounded-xl border grid grid-cols-2 gap-1.5 ${
            isDarkMode ? 'bg-[#09090B] border-slate-800' : 'bg-slate-100 border-slate-200'
          }`}>
            {(['FRESH_PO', 'BLANKET_CALLOFF'] as OrderSubType[]).map(type => (
              <button
                key={type}
                type="button"
                onClick={() => setNewSubType(type)}
                className={`py-2 px-3 rounded-lg text-xs font-bold transition-ui cursor-pointer ${
                  newSubType === type
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30 font-black'
                    : (isDarkMode ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50' : 'text-slate-600 hover:text-slate-900 hover:bg-white')
                }`}
              >
                {type === 'FRESH_PO' ? 'Fresh Customer PO' : 'Blanket Call-Off'}
              </button>
            ))}
          </div>

          {/* Blanket PO Specific Inputs */}
          {newSubType === 'BLANKET_CALLOFF' && (
            <div className={`p-4 rounded-xl border grid grid-cols-1 sm:grid-cols-2 gap-3.5 ${
              isDarkMode ? 'bg-purple-950/20 border-purple-500/30 text-purple-200' : 'bg-purple-50/80 border-purple-200 text-purple-900'
            }`}>
              <div>
                <label className={`block text-[11px] font-bold uppercase tracking-wider mb-1.5 ${isDarkMode ? 'text-purple-300' : 'text-purple-800'}`}>
                  Standing Blanket PO #
                </label>
                <input
                  type="text"
                  placeholder="e.g. BPO-2026-TATA-01"
                  value={newBlanketPoId}
                  onChange={(e) => setNewBlanketPoId(e.target.value)}
                  className={`w-full p-2.5 rounded-xl border text-xs font-medium outline-none transition-ui ${
                    isDarkMode ? 'bg-[#09090B] border-purple-500/40 text-white focus:border-purple-400' : 'bg-white border-purple-300 text-slate-900 focus:border-purple-600'
                  }`}
                />
              </div>
              <div>
                <label className={`block text-[11px] font-bold uppercase tracking-wider mb-1.5 ${isDarkMode ? 'text-purple-300' : 'text-purple-800'}`}>
                  Standing Balance Qty
                </label>
                <input
                  type="number"
                  value={newBlanketBalance}
                  onChange={(e) => setNewBlanketBalance(Number(e.target.value))}
                  className={`w-full p-2.5 rounded-xl border text-xs font-medium outline-none transition-ui ${
                    isDarkMode ? 'bg-[#09090B] border-purple-500/40 text-white focus:border-purple-400' : 'bg-white border-purple-300 text-slate-900 focus:border-purple-600'
                  }`}
                />
              </div>
            </div>
          )}

          {/* Customer Master Check & Indexing */}
          {customers.length === 0 ? (
            <div className={`p-4 rounded-xl border ${
              isDarkMode ? 'bg-amber-500/10 border-amber-500/30 text-amber-300' : 'bg-amber-50 border-amber-300 text-amber-900'
            }`}>
              <div className="flex items-center gap-2 font-bold text-xs">
                <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
                <span>No Customer Master Found</span>
              </div>
              <p className={`text-xs mt-1.5 leading-relaxed ${isDarkMode ? 'text-slate-300' : 'text-slate-600'}`}>
                No customers are registered in Customer Master. You must create a Customer in Masters &gt; Customers first before proceeding to raise an order.
              </p>
              <button
                type="button"
                onClick={() => {
                  createOrderModal.close();
                  onNavigateToCustomers?.();
                }}
                className="mt-3 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-md transition-ui hover:scale-[1.01]"
              >
                <span>Create Customer in Master First</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={`block text-[11px] font-bold uppercase tracking-wider mb-1.5 ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                  PO Number *
                </label>
                <input
                  type="text"
                  required
                  value={newPoNo}
                  onChange={(e) => setNewPoNo(e.target.value)}
                  placeholder="e.g. PO-2026-901"
                  className={`h-11 w-full rounded-xl border px-3 text-xs font-medium outline-none transition-ui ${
                    isDarkMode ? 'bg-[#09090B] border-slate-700/80 text-white placeholder:text-slate-500 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30' : 'bg-slate-50 border-slate-300 text-slate-900 focus:border-indigo-500 focus:bg-white shadow-xs'
                  }`}
                />
              </div>
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className={`block text-[11px] font-bold uppercase tracking-wider ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                    Customer * (Master Indexed)
                  </label>
                  {onNavigateToCustomers && (
                    <button
                      type="button"
                      onClick={() => {
                        createOrderModal.close();
                        onNavigateToCustomers();
                      }}
                      className="text-[10px] font-bold text-indigo-400 hover:text-indigo-300 hover:underline cursor-pointer flex items-center gap-1"
                    >
                      <span>+ New Master Customer</span>
                      <ArrowUpRight className="w-3 h-3" />
                    </button>
                  )}
                </div>
                <select
                  required
                  value={selectedCustomerCode}
                  onChange={(e) => handleSelectCustomer(e.target.value)}
                  className={`h-11 w-full rounded-xl border px-3 text-xs font-medium outline-none transition-ui ${
                    isDarkMode ? 'bg-[#09090B] border-slate-700/80 text-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30' : 'bg-slate-50 border-slate-300 text-slate-900 focus:border-indigo-500 focus:bg-white shadow-xs'
                  }`}
                >
                  <option value="">Select registered customer from Master...</option>
                  {customers.map(c => (
                    <option key={c.code || c.id} value={c.code || c.id}>
                      {c.code} — {c.name} {c.notes?.toLowerCase().includes('overdue') || (c as any).isOverdue ? '⚠️ [Credit Hold 90d]' : ''}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* Hard Precondition Alert: 90-Day Customer Credit Hold */}
          {isCustomerCreditHeld && (
            <div className={`p-4 rounded-xl border shadow-sm ${
              isDarkMode ? 'bg-rose-950/25 border-rose-500/40 text-rose-200' : 'bg-rose-50 border-rose-300 text-rose-900'
            }`}>
              <div className="flex items-center gap-2 font-bold text-xs text-rose-400">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>Customer on 90-Day Credit Overdue Hold</span>
              </div>
              <p className={`text-xs mt-1 leading-relaxed ${isDarkMode ? 'text-slate-300' : 'text-slate-600'}`}>
                {newCustomer || 'Selected customer'} has overdue payment receivables exceeding approved 90-day credit limits. New order creation is locked.
              </p>

              <div className={`mt-3 pt-3 border-t grid grid-cols-1 sm:grid-cols-2 gap-3 ${isDarkMode ? 'border-rose-500/30' : 'border-rose-200'}`}>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-rose-400 mb-1.5">
                    Owner Override Authorizer Username *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. sachin.owner / superadmin"
                    value={creditOverrideBy}
                    onChange={(e) => setCreditOverrideBy(e.target.value)}
                    className={`w-full p-2.5 rounded-xl border text-xs font-medium outline-none ${
                      isDarkMode ? 'bg-[#09090B] border-rose-500/50 text-white focus:border-rose-400' : 'bg-white border-rose-300 text-slate-900 focus:border-rose-500'
                    }`}
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-rose-400 mb-1.5">
                    Override Justification Reason
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 50% advance received via RTGS"
                    value={creditOverrideReason}
                    onChange={(e) => setCreditOverrideReason(e.target.value)}
                    className={`w-full p-2.5 rounded-xl border text-xs font-medium outline-none ${
                      isDarkMode ? 'bg-[#09090B] border-rose-500/50 text-white focus:border-rose-400' : 'bg-white border-rose-300 text-slate-900 focus:border-rose-500'
                    }`}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Dates & Tax */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className={`block text-[11px] font-bold uppercase tracking-wider mb-1.5 ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                PO Date
              </label>
              <input
                type="date"
                value={newPoDate}
                onChange={(e) => setNewPoDate(e.target.value)}
                className={`h-11 w-full rounded-xl border px-3 text-xs font-medium outline-none transition-ui ${
                  isDarkMode ? 'bg-[#09090B] border-slate-700/80 text-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30' : 'bg-slate-50 border-slate-300 text-slate-900 focus:border-indigo-500 focus:bg-white shadow-xs'
                }`}
              />
            </div>
            <div>
              <label className={`block text-[11px] font-bold uppercase tracking-wider mb-1.5 ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                Promised Delivery Date
              </label>
              <input
                type="date"
                value={newDeliveryDate}
                onChange={(e) => setNewDeliveryDate(e.target.value)}
                className={`h-11 w-full rounded-xl border px-3 text-xs font-medium outline-none transition-ui ${
                  isDarkMode ? 'bg-[#09090B] border-slate-700/80 text-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30' : 'bg-slate-50 border-slate-300 text-slate-900 focus:border-indigo-500 focus:bg-white shadow-xs'
                }`}
              />
            </div>
            <div>
              <label className={`block text-[11px] font-bold uppercase tracking-wider mb-1.5 ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                Tax Category
              </label>
              <select
                value={newTaxCategory}
                onChange={(e) => setNewTaxCategory(e.target.value)}
                className={`h-11 w-full rounded-xl border px-3 text-xs font-medium outline-none transition-ui ${
                  isDarkMode ? 'bg-[#09090B] border-slate-700/80 text-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30' : 'bg-slate-50 border-slate-300 text-slate-900 focus:border-indigo-500 focus:bg-white shadow-xs'
                }`}
              >
                <option value="GST 18%">GST 18% (Standard Engineering)</option>
                <option value="GST 12%">GST 12% (Machined Castings)</option>
                <option value="GST 28%">GST 28% (Automotive Spares)</option>
                <option value="EXEMPT">Exempt / Export SEZ (0%)</option>
              </select>
            </div>
          </div>

          {/* Line Items Cards with Master Part Indexing - No Horizontal Scroll */}
          <div className="space-y-3 pt-1">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className={`text-xs font-black uppercase tracking-wide ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                  Order Line Items
                </span>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ${
                  isDarkMode ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30' : 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                }`}>
                  {lines.length} {lines.length === 1 ? 'part' : 'parts'}
                </span>
              </div>
              <button
                type="button"
                onClick={addLineItem}
                className="px-3 py-1.5 rounded-xl bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 hover:text-indigo-300 text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-ui border border-indigo-500/20"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Part Line</span>
              </button>
            </div>

            <div className="space-y-3">
              {lines.map((line, idx) => {
                const lineGross = Number(line.orderQty || 0) * Number(line.rate || 0);

                return (
                  <div
                    key={idx}
                    className={`p-3.5 sm:p-4 rounded-2xl border transition-ui relative ${
                      isDarkMode
                        ? 'bg-[#09090B] border-slate-800 hover:border-slate-700/80 shadow-xs'
                        : 'bg-slate-50/80 border-slate-200 hover:border-slate-300 shadow-xs'
                    }`}
                  >
                    {/* Item Header */}
                    <div className="flex items-center justify-between gap-2 mb-3 pb-2.5 border-b border-slate-200/70 dark:border-slate-800">
                      <div className="flex items-center gap-2">
                        <span className={`w-5 h-5 rounded-full text-[10px] font-mono font-bold flex items-center justify-center ${
                          isDarkMode ? 'bg-indigo-500/20 text-indigo-300' : 'bg-indigo-100 text-indigo-700'
                        }`}>
                          {idx + 1}
                        </span>
                        <span className="font-bold text-xs text-slate-800 dark:text-slate-200">
                          {line.itemCode ? line.itemCode : `Part Item #${idx + 1}`}
                        </span>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="text-right font-mono">
                          <span className="text-[10px] text-slate-400 mr-1.5 uppercase font-medium">Line Total:</span>
                          <span className="font-black text-xs text-emerald-600 dark:text-emerald-400">
                            ₹{lineGross.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                          </span>
                        </div>
                        <button
                          type="button"
                          disabled={lines.length <= 1}
                          onClick={() => removeLineItem(idx)}
                          className="p-1 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 disabled:opacity-20 cursor-pointer transition-colors"
                          title="Remove line item"
                          aria-label="Remove line item"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Form Inputs Grid - Responsive Full-Width */}
                    <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
                      {/* Master FG Part Dropdown */}
                      <div className="sm:col-span-6">
                        <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                          Master FG Part Code
                        </label>
                        <select
                          value={line.itemCode}
                          onChange={(e) => handleSelectItemForLine(idx, e.target.value)}
                          className={`w-full h-9 p-2 rounded-xl border text-xs font-mono outline-none transition-ui ${
                            isDarkMode
                              ? 'bg-[#18181B] border-slate-700 text-white focus:border-indigo-500'
                              : 'bg-white border-slate-300 text-slate-900 focus:border-indigo-500 shadow-xs'
                          }`}
                        >
                          <option value="">-- Choose FG Part from Master --</option>
                          {finishedGoodsMasters.map(m => (
                            <option key={m.code || m.id} value={m.code}>
                              {m.code} - {m.name || m.description || m.partNo}
                            </option>
                          ))}
                          <option value="CUSTOM_ITEM">+ Custom / Ad-hoc Part</option>
                        </select>
                      </div>

                      {/* Description */}
                      <div className="sm:col-span-6">
                        <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                          Part Description
                        </label>
                        <input
                          type="text"
                          value={line.itemDescription}
                          onChange={(e) => updateLineItem(idx, 'itemDescription', e.target.value)}
                          placeholder="e.g. CNC Shaft Bushing"
                          className={`w-full h-9 px-2.5 rounded-xl border text-xs outline-none transition-ui ${
                            isDarkMode
                              ? 'bg-[#18181B] border-slate-700 text-white placeholder:text-slate-500 focus:border-indigo-500'
                              : 'bg-white border-slate-300 text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 shadow-xs'
                          }`}
                        />
                      </div>

                      {/* Cust Part No */}
                      <div className="sm:col-span-4">
                        <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                          Drawing / Cust Part #
                        </label>
                        <input
                          type="text"
                          value={line.custPartNo}
                          onChange={(e) => updateLineItem(idx, 'custPartNo', e.target.value)}
                          placeholder="e.g. DWG-8802"
                          className={`w-full h-9 px-2.5 rounded-xl border text-xs font-mono outline-none transition-ui ${
                            isDarkMode
                              ? 'bg-[#18181B] border-slate-700 text-white placeholder:text-slate-500 focus:border-indigo-500'
                              : 'bg-white border-slate-300 text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 shadow-xs'
                          }`}
                        />
                      </div>

                      {/* Rev */}
                      <div className="sm:col-span-2">
                        <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                          Rev
                        </label>
                        <input
                          type="text"
                          value={line.drawingRevision}
                          onChange={(e) => updateLineItem(idx, 'drawingRevision', e.target.value)}
                          placeholder="01"
                          className={`w-full h-9 px-2.5 rounded-xl border text-xs font-mono text-center outline-none transition-ui ${
                            isDarkMode
                              ? 'bg-[#18181B] border-slate-700 text-white placeholder:text-slate-500 focus:border-indigo-500'
                              : 'bg-white border-slate-300 text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 shadow-xs'
                          }`}
                        />
                      </div>

                      {/* Qty */}
                      <div className="sm:col-span-3">
                        <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                          Order Qty (Pcs)
                        </label>
                        <input
                          type="number"
                          min="1"
                          value={line.orderQty}
                          onChange={(e) => updateLineItem(idx, 'orderQty', Number(e.target.value))}
                          className={`w-full h-9 px-2.5 rounded-xl border text-xs font-mono text-right outline-none transition-ui ${
                            isDarkMode
                              ? 'bg-[#18181B] border-slate-700 text-white focus:border-indigo-500'
                              : 'bg-white border-slate-300 text-slate-900 focus:border-indigo-500 shadow-xs'
                          }`}
                        />
                      </div>

                      {/* Unit Rate */}
                      <div className="sm:col-span-3">
                        <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                          Unit Rate (₹)
                        </label>
                        <input
                          type="number"
                          min="0"
                          step="0.5"
                          value={line.rate}
                          onChange={(e) => updateLineItem(idx, 'rate', Number(e.target.value))}
                          className={`w-full h-9 px-2.5 rounded-xl border text-xs font-mono text-right outline-none transition-ui ${
                            isDarkMode
                              ? 'bg-[#18181B] border-slate-700 text-white focus:border-indigo-500'
                              : 'bg-white border-slate-300 text-slate-900 focus:border-indigo-500 shadow-xs'
                          }`}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Remarks */}
          <div>
            <label className={`block text-[11px] font-bold uppercase tracking-wider mb-1.5 ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
              Special Packing / Quality Instructions
            </label>
            <input
              type="text"
              placeholder="e.g. VCI Anti-rust polybag packing with Mill TC inspection report attached"
              value={newRemark}
              onChange={(e) => setNewRemark(e.target.value)}
              className={`h-11 w-full rounded-xl border px-3 text-xs outline-none transition-ui ${
                isDarkMode ? 'bg-[#09090B] border-slate-700/80 text-white placeholder:text-slate-500 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30' : 'bg-slate-50 border-slate-300 text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:bg-white shadow-xs'
              }`}
            />
          </div>

        </form>
      </Modal>

    </div>
  );
};

export default OrdersView;
