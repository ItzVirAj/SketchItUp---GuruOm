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

    const matchesStatus = statusFilter === 'ALL' || o.status === statusFilter || o.stage === statusFilter;
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
      activeColor: 'bg-slate-400 shadow-[0_0_12px_rgba(148,163,184,0.8)] ring-1 ring-slate-300 scale-105',
      activeBadge: 'bg-slate-400/10 text-slate-500 dark:text-slate-400 border-slate-400/30',
      completedColor: 'bg-slate-400/70',
      badgeDot: 'bg-slate-400'
    },
    1: {
      code: 'MAT',
      label: 'Material Checked',
      activeColor: 'bg-amber-500 shadow-[0_0_12px_rgba(245,158,11,0.8)] ring-1 ring-amber-300 scale-105',
      activeBadge: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30',
      completedColor: 'bg-amber-500/70',
      badgeDot: 'bg-amber-500'
    },
    2: {
      code: 'PROD',
      label: 'In Production',
      activeColor: 'bg-[#5B75F8] shadow-[0_0_12px_rgba(91,117,248,0.8)] ring-1 ring-[#5B75F8]/50 scale-105',
      activeBadge: 'bg-[#5B75F8]/10 text-[#5B75F8] dark:text-[#7B92FF] border-[#5B75F8]/30',
      completedColor: 'bg-[#5B75F8]/70',
      badgeDot: 'bg-[#5B75F8]'
    },
    3: {
      code: 'QC',
      label: 'QC Inspection',
      activeColor: 'bg-orange-600 shadow-[0_0_12px_rgba(234,88,12,0.8)] ring-1 ring-orange-400 scale-105',
      activeBadge: 'bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/30',
      completedColor: 'bg-orange-500/70',
      badgeDot: 'bg-orange-500'
    },
    4: {
      code: 'PDI',
      label: 'Ready to Dispatch (PDI)',
      activeColor: 'bg-purple-500 shadow-[0_0_12px_rgba(139,92,246,0.8)] ring-1 ring-purple-300 scale-105',
      activeBadge: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/30',
      completedColor: 'bg-purple-500/70',
      badgeDot: 'bg-purple-500'
    },
    5: {
      code: 'DISP',
      label: 'Dispatched',
      activeColor: 'bg-cyan-600 shadow-[0_0_12px_rgba(8,145,178,0.8)] ring-1 ring-cyan-400 scale-105',
      activeBadge: 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/30',
      completedColor: 'bg-cyan-500/70',
      badgeDot: 'bg-cyan-500'
    },
    6: {
      code: 'INV',
      label: 'Invoiced',
      activeColor: 'bg-teal-600 shadow-[0_0_12px_rgba(13,148,136,0.8)] ring-1 ring-teal-400 scale-105',
      activeBadge: 'bg-teal-500/10 text-teal-600 dark:text-teal-400 border-teal-500/30',
      completedColor: 'bg-teal-500/70',
      badgeDot: 'bg-teal-500'
    },
    7: {
      code: 'DONE',
      label: 'Closed',
      activeColor: 'bg-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.8)] ring-1 ring-emerald-300 scale-105',
      activeBadge: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30',
      completedColor: 'bg-emerald-500/70',
      badgeDot: 'bg-emerald-500'
    }
  };

  const getOrderProgression = (ord?: Partial<CustomerOrder> | null) => {
    if (!ord) {
      return {
        activeStepIndex: 0,
        statusLabel: '1. PO Received',
        badgeBg: 'bg-slate-400/10 text-slate-500 dark:text-slate-400 border-slate-400/30',
        badgeDot: 'bg-slate-400',
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

    let activeStepIndex = 0;
    let statusLabel = '1. PO Received';
    let badgeBg = 'bg-slate-400/10 text-slate-500 dark:text-slate-400 border-slate-400/30';
    let badgeDot = 'bg-slate-400';

    if (isQcRejected) {
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
      badgeBg = 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30';
      badgeDot = 'bg-emerald-500';
    } else if (['INVOICED', 'INVOICE_GENERATED'].includes(rawStatus) || norm === 'INVOICED') {
      activeStepIndex = 6;
      statusLabel = ord.invoiceNumber ? `7. Invoiced (${ord.invoiceNumber})` : '7. GST Invoiced';
      badgeBg = 'bg-teal-500/10 text-teal-600 dark:text-teal-400 border-teal-500/30';
      badgeDot = 'bg-teal-500';
    } else if (['DISPATCHED', 'PARTIALLY_DISPATCHED', 'IN_TRANSIT', 'DELIVERED', 'ORDER_RECEIVED', 'PAYMENT_PENDING'].includes(rawStatus) || norm === 'DISPATCHED' || norm === 'DELIVERED' || norm === 'IN_TRANSIT' || norm === 'PAYMENT_PENDING') {
      activeStepIndex = 5;
      statusLabel = isDelayed ? '6. Delivery Delayed' : (rawStatus === 'PARTIALLY_DISPATCHED' ? '6. Partially Dispatched' : '6. Outward Dispatched');
      badgeBg = isDelayed
        ? (isDarkMode ? 'bg-amber-500/15 text-amber-400 border-amber-500/30' : 'bg-amber-50 text-amber-800 border-amber-200')
        : 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/30';
      badgeDot = isDelayed ? 'bg-amber-500' : 'bg-cyan-500';
    } else if (['READY_TO_DISPATCH', 'READY_FOR_DISPATCH', 'PDI', 'PDI_COMPLETE', 'PDI_PASS', 'PDI_PASSED', 'DISPATCH_READY'].includes(rawStatus) || norm === 'READY_FOR_DISPATCH' || norm === 'PDI' || norm === 'PDI_COMPLETE' || norm === 'DISPATCH_READY') {
      activeStepIndex = 4;
      statusLabel = rawStatus.includes('PDI') ? '5. PDI Passed (Dispatch Ready)' : '5. Ready for Dispatch';
      badgeBg = 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/30';
      badgeDot = 'bg-purple-500';
    } else if (['QC', 'QC_INSPECTION', 'READY_FOR_QC', 'MANUFACTURING_COMPLETED', 'QC_REPORT_UPLOADED'].includes(rawStatus) || norm === 'QC' || norm === 'QC_REPORT_UPLOADED') {
      activeStepIndex = 3;
      statusLabel = '4. QC Inspection';
      badgeBg = 'bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/30';
      badgeDot = 'bg-orange-500';
    } else if (['IN_PRODUCTION', 'JOB_RELEASED', 'WITH_SUBCONTRACTOR', 'REWORK'].includes(rawStatus) || norm === 'IN_PRODUCTION' || norm === 'JOB_RELEASED' || norm === 'REWORK') {
      activeStepIndex = 2;
      statusLabel = rawStatus === 'JOB_RELEASED' ? '3. Job Card Released' : '3. In Production';
      badgeBg = 'bg-[#5B75F8]/10 text-[#5B75F8] dark:text-[#7B92FF] border-[#5B75F8]/30';
      badgeDot = 'bg-[#5B75F8]';
    } else if (['MATERIAL_READY', 'MATERIAL_CHECKED', 'MATERIAL_VERIFIED', 'MATERIAL_CHECK', 'MATERIAL_SHORT', 'PROCUREMENT_PENDING', 'GRN', 'PENDING_VERIFICATION'].includes(rawStatus) || ['MATERIAL_READY', 'MATERIAL_CHECK', 'MATERIAL_SHORT', 'PROCUREMENT_PENDING', 'GRN', 'PENDING_VERIFICATION'].includes(norm)) {
      activeStepIndex = 1;
      statusLabel = (rawStatus === 'MATERIAL_SHORT' || norm === 'MATERIAL_SHORT') ? '2. Material Shortage' : (rawStatus === 'PROCUREMENT_PENDING' ? '2. Procurement Pending' : '2. Material Verified');
      badgeBg = (rawStatus === 'MATERIAL_SHORT' || norm === 'MATERIAL_SHORT')
        ? (isDarkMode ? 'bg-amber-500/15 text-amber-400 border-amber-500/30' : 'bg-amber-50 text-amber-800 border-amber-200')
        : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30';
      badgeDot = 'bg-amber-500';
    } else {
      activeStepIndex = 0;
      statusLabel = '1. PO Received';
      badgeBg = 'bg-slate-400/10 text-slate-500 dark:text-slate-400 border-slate-400/30';
      badgeDot = 'bg-slate-400';
    }

    return {
      activeStepIndex,
      statusLabel,
      badgeBg,
      badgeDot,
      isQcRejected,
      isQcHold,
      isPdiHold,
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
    const prog = getOrderProgression(ord);
    const stagePct = Math.round(((prog.activeStepIndex + 1) / 8) * 100);

    let progressGradient = 'from-rose-500 via-amber-500 to-emerald-500';
    if (prog.isQcRejected) {
      progressGradient = 'from-rose-600 to-rose-700';
    } else if (prog.isQcHold || prog.isPdiHold) {
      progressGradient = 'from-amber-500 to-amber-600';
    } else if (stagePct <= 25) {
      progressGradient = 'from-rose-500 to-orange-500';
    } else if (stagePct <= 50) {
      progressGradient = 'from-rose-500 via-orange-500 to-amber-400';
    } else if (stagePct <= 75) {
      progressGradient = 'from-rose-500 via-amber-500 to-teal-400';
    } else {
      progressGradient = 'from-rose-500 via-amber-500 to-emerald-500';
    }

    return (
      <div className={`space-y-1.5 select-none font-mono ${variant === 'table' ? 'min-w-[220px] max-w-[300px]' : 'w-full'}`}>
        {/* Status Header */}
        <div className="flex items-center justify-between gap-2">
          {/* Active Stage Pill */}
          <div className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg text-[10px] font-bold uppercase border transition-all ${prog.badgeBg}`}>
            <span className="relative flex h-1.5 w-1.5 shrink-0">
              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                prog.isQcRejected ? 'bg-rose-400' : (prog.isQcHold || prog.isPdiHold) ? 'bg-amber-400' : prog.badgeDot
              }`} />
              <span className={`relative inline-flex rounded-full h-1.5 w-1.5 ${
                prog.isQcRejected ? 'bg-rose-500' : (prog.isQcHold || prog.isPdiHold) ? 'bg-amber-500' : prog.badgeDot
              }`} />
            </span>
            <span className="tracking-wide truncate max-w-[160px]">{prog.statusLabel}</span>
          </div>

          {/* Telemetry Gate & % Badge */}
          <div className="flex items-center gap-1 text-[9px] font-bold shrink-0 text-slate-400 dark:text-slate-500">
            <span>{prog.activeStepIndex + 1}/8</span>
            <span>•</span>
            <span>{stagePct}%</span>
          </div>
        </div>

        {/* Continuous Seamless Red-to-Green Progress Bar */}
        <div
          title={`Stage ${prog.activeStepIndex + 1}/8: ${prog.statusLabel} (${stagePct}% complete)`}
          className={`w-full h-2 rounded-full overflow-hidden relative cursor-help ${
            isDarkMode ? 'bg-slate-800/80 border border-slate-700/60' : 'bg-slate-200/80 border border-slate-300/60'
          }`}
        >
          <div
            className={`h-full rounded-full bg-gradient-to-r ${progressGradient} transition-all duration-500 ease-out shadow-xs`}
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
            className="min-h-[44px] px-3.5 py-2 rounded-xl bg-gradient-to-r from-[var(--accent-gradient-from)] to-[var(--accent-gradient-to)] text-white font-bold text-xs flex items-center gap-1.5 shadow-md cursor-pointer shrink-0 active:scale-95 transition-transform font-mono"
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
            { id: 'CLOSED', label: '8. Closed', active: 'bg-emerald-600 text-white', idle: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30' }
          ].map((stage) => {
            const isSelected = statusFilter === stage.id;
            return (
              <button
                key={stage.id}
                onClick={() => setStatusFilter(stage.id)}
                className={`min-h-[36px] px-3 py-1 rounded-xl text-xs font-bold font-mono shrink-0 transition-all border cursor-pointer ${
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
        <section className={`overflow-hidden rounded-[24px] border ${isDarkMode ? 'border-white/[0.08] bg-[#171b24]' : 'border-slate-200 bg-white shadow-[0_12px_36px_rgba(15,23,42,0.06)]'}`}>
          <div className="flex items-center justify-between gap-6 px-6 py-5">
            <div className="min-w-0">
              <div className="mb-1.5 flex items-center gap-2 font-mono text-[9px] font-bold uppercase tracking-[0.18em] text-slate-400">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                Live order book
                <span className="text-slate-300 dark:text-slate-700">/</span>
                <span>{orders.length} purchase orders</span>
              </div>
              <div className="flex items-baseline gap-3">
                <h1 className="truncate text-[25px] font-extrabold tracking-[-0.04em] text-slate-950 dark:text-white">Customer Orders</h1>
                <span className="hidden font-mono text-[10px] font-semibold text-slate-400 xl:inline">PO → MATERIAL → PRODUCTION → QC → DISPATCH → INVOICE</span>
              </div>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Track commercial value, delivery commitments, and every gated manufacturing handoff.</p>
            </div>
            <button
              onClick={openNewOrderModal}
              className="flex h-11 shrink-0 items-center gap-2 rounded-xl bg-[var(--accent-primary)] px-4 text-xs font-extrabold text-white shadow-[0_8px_20px_var(--accent-shadow)] transition-all hover:bg-[var(--accent-hover)] active:scale-[0.98]"
            >
              <Plus className="h-4 w-4" />
              New purchase order
            </button>
          </div>

          <div className={`grid grid-cols-4 border-t ${isDarkMode ? 'border-white/[0.07]' : 'border-slate-200'}`}>
            {[
              { label: 'Pipeline value', value: `₹${totalActiveValue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`, detail: `${orders.length} total orders`, icon: TrendingUp, tone: 'text-[var(--accent-text-light)] dark:text-[var(--accent-text-dark)]', iconBg: 'bg-[var(--accent-soft-light)] dark:bg-[var(--accent-soft-dark)]' },
              { label: 'In production', value: String(inProdCount), detail: 'Active shop-floor jobs', icon: Package, tone: 'text-amber-600 dark:text-amber-400', iconBg: 'bg-amber-500/10' },
              { label: 'Quality gate', value: String(qcGateCount), detail: 'Inspection or NCR review', icon: ShieldCheck, tone: 'text-violet-600 dark:text-violet-400', iconBg: 'bg-violet-500/10' },
              { label: 'Dispatch ready', value: String(dispatchReadyCount), detail: 'PDI-cleared orders', icon: Truck, tone: 'text-emerald-600 dark:text-emerald-400', iconBg: 'bg-emerald-500/10' },
            ].map((metric, index) => {
              const MetricIcon = metric.icon;
              return (
                <div key={metric.label} className={`flex items-center gap-3 px-5 py-4 ${index > 0 ? isDarkMode ? 'border-l border-white/[0.07]' : 'border-l border-slate-200' : ''}`}>
                  <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${metric.iconBg} ${metric.tone}`}><MetricIcon className="h-4 w-4" /></div>
                  <div className="min-w-0">
                    <div className="font-mono text-[9px] font-bold uppercase tracking-[0.13em] text-slate-400">{metric.label}</div>
                    <div className={`mt-0.5 truncate text-lg font-extrabold tracking-[-0.03em] ${metric.tone}`}>{metric.value}</div>
                    <div className="truncate text-[10px] text-slate-400">{metric.detail}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <div className={`rounded-2xl border p-3 ${isDarkMode ? 'border-white/[0.08] bg-[#171b24]' : 'border-slate-200 bg-white shadow-[0_6px_22px_rgba(15,23,42,0.04)]'}`}>
          <div className="flex items-center gap-2">
            <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${isDarkMode ? 'bg-white/[0.05] text-slate-400' : 'bg-slate-100 text-slate-500'}`} title="Filters">
              <Filter className="h-4 w-4" />
            </div>
            <div className={`flex h-10 min-w-[260px] flex-1 items-center gap-2 rounded-xl border px-3 ${isDarkMode ? 'border-white/[0.08] bg-black/20 text-white focus-within:border-[var(--accent-border-dark)]' : 'border-slate-200 bg-slate-50 text-slate-900 focus-within:border-[var(--accent-primary)]'}`}>
              <Search className="h-4 w-4 shrink-0 text-slate-400" />
              <input
                type="text"
                placeholder="Search PO, customer, part, revision or heat lot..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-full w-full bg-transparent text-xs font-semibold outline-none placeholder:font-normal placeholder:text-slate-400"
              />
              {searchQuery && <button type="button" onClick={() => setSearchQuery('')} className="text-slate-400 hover:text-slate-700 dark:hover:text-white"><X className="h-3.5 w-3.5" /></button>}
            </div>

            <select
              value={subTypeFilter}
              onChange={(e) => setSubTypeFilter(e.target.value)}
              className={`h-10 rounded-xl border px-3 text-[11px] font-bold outline-none ${isDarkMode ? 'border-white/[0.08] bg-black/20 text-white' : 'border-slate-200 bg-slate-50 text-slate-700'}`}
            >
              <option value="ALL">All types ({orders.length})</option>
              <option value="FRESH_PO">Fresh POs ({orders.filter(o => (o.subType || 'FRESH_PO') === 'FRESH_PO').length})</option>
              <option value="BLANKET_CALLOFF">Blanket Call-Offs ({orders.filter(o => o.subType === 'BLANKET_CALLOFF').length})</option>
              <option value="AMENDMENT">Amendments ({orders.filter(o => o.subType === 'AMENDMENT').length})</option>
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className={`h-10 rounded-xl border px-3 text-[11px] font-bold outline-none ${isDarkMode ? 'border-white/[0.08] bg-black/20 text-white' : 'border-slate-200 bg-slate-50 text-slate-700'}`}
            >
              <option value="ALL">All stages ({orders.length})</option>
              <option value="PO_RECEIVED">1. PO Confirmed</option>
              <option value="MATERIAL_CHECKED">2. Material Verified</option>
              <option value="IN_PRODUCTION">3. In Production</option>
              <option value="QC_INSPECTION">4. QC Inspection & NCR</option>
              <option value="READY_TO_DISPATCH">5. PDI / Ready to Dispatch</option>
              <option value="DISPATCHED">6. Outward Dispatched</option>
              <option value="INVOICED">7. GST Invoiced</option>
              <option value="CLOSED">8. Closed & Settled</option>
            </select>

            <select
              value={`${sortField}_${sortDirection}`}
              onChange={(e) => {
                const [field, dir] = e.target.value.split('_');
                setSortField(field as any);
                setSortDirection(dir as any);
              }}
              className={`hidden h-10 rounded-xl border px-3 text-[11px] font-bold outline-none xl:block ${isDarkMode ? 'border-white/[0.08] bg-black/20 text-white' : 'border-slate-200 bg-slate-50 text-slate-700'}`}
            >
              <option value="RECENCY_DESC">Sort: Recent Orders (Newest First)</option>
              <option value="RECENCY_ASC">Sort: Oldest Orders First</option>
              <option value="PO_NO_ASC">Sort: PO Number (A → Z)</option>
              <option value="PO_NO_DESC">Sort: PO Number (Z → A)</option>
              <option value="CUSTOMER_ASC">Sort: Customer (A → Z)</option>
              <option value="AMOUNT_DESC">Sort: Amount (High → Low)</option>
              <option value="AMOUNT_ASC">Sort: Amount (Low → High)</option>
            </select>

            <div className={`flex h-10 items-center rounded-xl border p-1 ${isDarkMode ? 'border-white/[0.08] bg-black/20' : 'border-slate-200 bg-slate-100'}`}>
              <button
                onClick={() => setViewMode('table')}
                className={`flex h-8 w-8 items-center justify-center rounded-lg transition-all ${viewMode === 'table'
                  ? isDarkMode ? 'bg-white/[0.09] text-[var(--accent-text-dark)]' : 'bg-white text-[var(--accent-text-light)] shadow-xs'
                  : isDarkMode ? 'text-slate-400 hover:text-slate-200' : 'text-slate-500 hover:text-slate-900'
                  }`}
                title="Table View"
              >
                <List className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('grid')}
                className={`flex h-8 w-8 items-center justify-center rounded-lg transition-all ${viewMode === 'grid'
                  ? isDarkMode ? 'bg-white/[0.09] text-[var(--accent-text-dark)]' : 'bg-white text-[var(--accent-text-light)] shadow-xs'
                  : isDarkMode ? 'text-slate-400 hover:text-slate-200' : 'text-slate-500 hover:text-slate-900'
                  }`}
                title="Grid View"
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
            </div>

            {(statusFilter !== 'ALL' || subTypeFilter !== 'ALL' || searchQuery.trim() !== '' || sortField !== 'RECENCY' || sortDirection !== 'DESC') && (
              <button
                onClick={() => {
                  setStatusFilter('ALL');
                  setSubTypeFilter('ALL');
                  setSearchQuery('');
                  setSortField('RECENCY');
                  setSortDirection('DESC');
                }}
                className="h-10 rounded-xl px-3 text-[11px] font-bold text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-white/[0.06] dark:hover:text-white"
              >
                Clear
              </button>
            )}
          </div>

          <div className="mt-2.5 flex items-center justify-between px-1 font-mono text-[9px] font-semibold uppercase tracking-wider text-slate-400">
            <span>Showing {sortedOrders.length} of {orders.length} orders</span>
            <span>Click an order to inspect its lifecycle</span>
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
                className={`p-4 rounded-2xl border space-y-3 cursor-pointer shadow-2xs active:scale-[0.99] transition-all ${
                  isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
                }`}
              >
                {/* Header: PO Number + Type Pill */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="font-mono font-black text-sm text-[var(--accent-primary)] truncate">
                      {ord.poNo}
                    </span>
                    <span className={`px-1.5 py-0.5 rounded text-[9px] font-mono font-bold uppercase border shrink-0 ${
                      subType === 'BLANKET_CALLOFF'
                        ? 'bg-purple-500/15 text-purple-600 dark:text-purple-400 border-purple-500/30'
                        : 'bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30'
                    }`}>
                      {subType === 'BLANKET_CALLOFF' ? 'Blanket' : 'Fresh PO'}
                    </span>
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
                    {hasCreditHold ? (
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30">
                        <AlertCircle className="w-2.5 h-2.5" />
                        <span>Credit Hold</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-mono text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/20">
                        <CheckCircle2 className="w-2.5 h-2.5" />
                        <span>Credit OK</span>
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
          <div className={`overflow-hidden rounded-[22px] border transition-all ${isDarkMode ? 'border-white/[0.08] bg-[#171b24]' : 'border-slate-200 bg-white shadow-[0_12px_36px_rgba(15,23,42,0.06)]'
            }`}>
            <div className={`flex items-center justify-between border-b px-5 py-3 ${isDarkMode ? 'border-white/[0.07]' : 'border-slate-200'}`}>
              <div>
                <div className="text-xs font-extrabold text-slate-900 dark:text-white">Order lifecycle queue</div>
                <div className="mt-0.5 text-[10px] text-slate-400">Commercial and manufacturing status in one view</div>
              </div>
              <span className={`rounded-lg border px-2 py-1 font-mono text-[9px] font-bold uppercase tracking-wider ${isDarkMode ? 'border-white/[0.08] bg-white/[0.04] text-slate-400' : 'border-slate-200 bg-slate-50 text-slate-500'}`}>{sortedOrders.length} records</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse font-sans">
                <thead>
                  <tr className={`border-b font-mono font-bold uppercase tracking-[0.12em] text-[9px] ${isDarkMode ? 'border-white/[0.07] bg-black/20 text-slate-500' : 'border-slate-200 bg-slate-50/80 text-slate-400'
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
                    <th className="py-4 px-5">Current State</th>
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
                      <td colSpan={5} className="py-12 text-center">
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

                      const linkedQc = (qcQueue || []).filter(q =>
                        (q.orderPo && (q.orderPo.trim().toUpperCase() === ord.poNo.trim().toUpperCase() || q.orderPo.trim().toUpperCase() === ord.id.trim().toUpperCase())) ||
                        (ord.jobCards && ord.jobCards.some(j => j.jobNo && j.jobNo.trim().toUpperCase() === (q.jobNo || '').trim().toUpperCase()))
                      );

                      const isQcRejected = linkedQc.some(q => q.qcStatus === 'REJECTED');
                      const isQcHold = linkedQc.some(q => q.qcStatus === 'QC_HOLD');
                      const isQcPassed = linkedQc.length > 0 && linkedQc.every(q => q.qcStatus === 'PASS' || q.qcStatus === 'PASSED');
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
                        <tr
                          key={ord.id}
                          onClick={() => onSelectOrder(ord)}
                          className={`group cursor-pointer transition-colors ${isDarkMode ? 'hover:bg-white/[0.035]' : 'hover:bg-slate-50/80'
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

                          <td className="py-4 px-5">
                            {renderProgressionStepper(ord, 'table')}
                          </td>

                          <td className={`py-4 px-5 text-right font-bold font-mono text-xs ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                            ₹{ord.grossAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </td>

                          <td className="py-4 px-5 text-center">
                            <button className={`mx-auto flex h-8 items-center justify-center gap-1 rounded-lg border px-2.5 font-mono text-[10px] font-bold transition-all ${isDarkMode
                              ? 'border-white/[0.08] bg-white/[0.04] text-slate-300 hover:border-[var(--accent-border-dark)] hover:text-[var(--accent-text-dark)]'
                              : 'border-slate-200 bg-white text-slate-600 shadow-xs hover:border-[var(--accent-border-light)] hover:text-[var(--accent-text-light)]'
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
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 2xl:grid-cols-3">
            {sortedOrders.map((ord) => {
              return (
                <div
                  key={ord.id}
                  onClick={() => onSelectOrder(ord)}
                  className={`group cursor-pointer space-y-3 rounded-[20px] border p-5 transition-all ${isDarkMode ? 'border-white/[0.08] bg-[#171b24] hover:border-white/[0.14]' : 'border-slate-200 bg-white shadow-[0_8px_24px_rgba(15,23,42,0.05)] hover:-translate-y-0.5 hover:border-[var(--accent-border-light)] hover:shadow-[0_14px_34px_rgba(15,23,42,0.08)]'
                    }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="font-bold font-mono text-sm text-[#5B75F8]">{ord.poNo}</div>
                    <div className="text-sm font-bold font-mono text-emerald-600 dark:text-emerald-400">
                      ₹{ord.grossAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </div>
                  </div>
                  <div className={`text-xs font-bold ${isDarkMode ? 'text-slate-100' : 'text-slate-900'}`}>{ord.customerName}</div>
                  <div className={`text-[10px] font-mono ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                    PO Date: <span className="font-semibold">{ord.poDate || ord.createdAt?.split('T')[0] || 'N/A'}</span> • Del: {ord.deliveryDate}
                  </div>
                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80">
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
        icon={<Plus className="w-5 h-5" />}
        title="Create Purchase Order / Blanket Call-Off"
        subtitle="Stage 1 Precondition: Customer Master Indexing & Credit Check"
        footer={
          <>
            <div className={`flex items-center justify-between px-4 py-2.5 rounded-xl font-mono border shadow-xs ${
              isDarkMode ? 'bg-[#0d1017] border-slate-800' : 'bg-slate-50 border-slate-200'
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
                className={`min-h-[42px] px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
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
                className="min-h-[42px] px-6 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white font-bold text-xs shadow-lg shadow-indigo-500/25 cursor-pointer transition-all hover:scale-[1.01] active:scale-[0.99]"
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
            isDarkMode ? 'bg-[#0d1017] border-slate-800' : 'bg-slate-100 border-slate-200'
          }`}>
            {(['FRESH_PO', 'BLANKET_CALLOFF'] as OrderSubType[]).map(type => (
              <button
                key={type}
                type="button"
                onClick={() => setNewSubType(type)}
                className={`py-2 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer ${
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
                  className={`w-full p-2.5 rounded-xl border text-xs font-medium outline-none transition-all ${
                    isDarkMode ? 'bg-[#0d1017] border-purple-500/40 text-white focus:border-purple-400' : 'bg-white border-purple-300 text-slate-900 focus:border-purple-600'
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
                  className={`w-full p-2.5 rounded-xl border text-xs font-medium outline-none transition-all ${
                    isDarkMode ? 'bg-[#0d1017] border-purple-500/40 text-white focus:border-purple-400' : 'bg-white border-purple-300 text-slate-900 focus:border-purple-600'
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
                className="mt-3 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-md transition-all hover:scale-[1.01]"
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
                  className={`h-11 w-full rounded-xl border px-3 text-xs font-medium outline-none transition-all ${
                    isDarkMode ? 'bg-[#0d1017] border-slate-700/80 text-white placeholder:text-slate-500 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30' : 'bg-slate-50 border-slate-300 text-slate-900 focus:border-indigo-500 focus:bg-white shadow-xs'
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
                  className={`h-11 w-full rounded-xl border px-3 text-xs font-medium outline-none transition-all ${
                    isDarkMode ? 'bg-[#0d1017] border-slate-700/80 text-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30' : 'bg-slate-50 border-slate-300 text-slate-900 focus:border-indigo-500 focus:bg-white shadow-xs'
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
                      isDarkMode ? 'bg-[#0d1017] border-rose-500/50 text-white focus:border-rose-400' : 'bg-white border-rose-300 text-slate-900 focus:border-rose-500'
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
                      isDarkMode ? 'bg-[#0d1017] border-rose-500/50 text-white focus:border-rose-400' : 'bg-white border-rose-300 text-slate-900 focus:border-rose-500'
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
                className={`h-11 w-full rounded-xl border px-3 text-xs font-medium outline-none transition-all ${
                  isDarkMode ? 'bg-[#0d1017] border-slate-700/80 text-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30' : 'bg-slate-50 border-slate-300 text-slate-900 focus:border-indigo-500 focus:bg-white shadow-xs'
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
                className={`h-11 w-full rounded-xl border px-3 text-xs font-medium outline-none transition-all ${
                  isDarkMode ? 'bg-[#0d1017] border-slate-700/80 text-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30' : 'bg-slate-50 border-slate-300 text-slate-900 focus:border-indigo-500 focus:bg-white shadow-xs'
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
                className={`h-11 w-full rounded-xl border px-3 text-xs font-medium outline-none transition-all ${
                  isDarkMode ? 'bg-[#0d1017] border-slate-700/80 text-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30' : 'bg-slate-50 border-slate-300 text-slate-900 focus:border-indigo-500 focus:bg-white shadow-xs'
                }`}
              >
                <option value="GST 18%">GST 18% (Standard Engineering)</option>
                <option value="GST 12%">GST 12% (Machined Castings)</option>
                <option value="GST 28%">GST 28% (Automotive Spares)</option>
                <option value="EXEMPT">Exempt / Export SEZ (0%)</option>
              </select>
            </div>
          </div>

          {/* Line Items Table with Master Part Indexing */}
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
                className="px-3 py-1.5 rounded-xl bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 hover:text-indigo-300 text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all border border-indigo-500/20"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Part Line</span>
              </button>
            </div>

            <div className={`rounded-xl border overflow-hidden shadow-xs ${
              isDarkMode ? 'bg-[#0d1017] border-slate-800' : 'bg-white border-slate-200'
            }`}>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className={`border-b text-[10px] font-bold uppercase tracking-wider ${
                      isDarkMode ? 'bg-[#12161f] border-slate-800 text-slate-300' : 'bg-slate-100 border-slate-200 text-slate-700'
                    }`}>
                      <th className="p-3">Master Part Code</th>
                      <th className="p-3">Description</th>
                      <th className="p-3">Cust Part No</th>
                      <th className="p-3">Rev</th>
                      <th className="p-3 w-24">Qty</th>
                      <th className="p-3 w-28">Rate (₹)</th>
                      <th className="p-3 text-right">Gross (₹)</th>
                      <th className="p-3 w-10 text-center"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-800/80">
                    {lines.map((line, idx) => (
                      <tr key={idx} className={isDarkMode ? 'hover:bg-slate-850/50' : 'hover:bg-slate-50'}>
                        <td className="p-2.5">
                          <select
                            value={line.itemCode}
                            onChange={(e) => handleSelectItemForLine(idx, e.target.value)}
                            className={`w-40 p-2 rounded-lg border text-xs font-mono outline-none ${
                              isDarkMode ? 'bg-[#141822] border-slate-700 text-white focus:border-indigo-500' : 'bg-white border-slate-300 text-slate-900 focus:border-indigo-500'
                            }`}
                          >
                            <option value="">-- Choose FG Part --</option>
                            {finishedGoodsMasters.map(m => (
                              <option key={m.code || m.id} value={m.code}>
                                {m.code} - {m.name || m.description || m.partNo}
                              </option>
                            ))}
                            <option value="CUSTOM_ITEM">+ Custom / Ad-hoc Part</option>
                          </select>
                        </td>
                        <td className="p-2.5">
                          <input
                            type="text"
                            value={line.itemDescription}
                            onChange={(e) => updateLineItem(idx, 'itemDescription', e.target.value)}
                            placeholder="Part description"
                            className={`w-36 p-2 rounded-lg border text-xs outline-none ${
                              isDarkMode ? 'bg-[#141822] border-slate-700 text-white placeholder:text-slate-500 focus:border-indigo-500' : 'bg-white border-slate-300 text-slate-900 placeholder:text-slate-400 focus:border-indigo-500'
                            }`}
                          />
                        </td>
                        <td className="p-2.5">
                          <input
                            type="text"
                            value={line.custPartNo}
                            onChange={(e) => updateLineItem(idx, 'custPartNo', e.target.value)}
                            placeholder="Drawing Part #"
                            className={`w-28 p-2 rounded-lg border text-xs font-mono outline-none ${
                              isDarkMode ? 'bg-[#141822] border-slate-700 text-white placeholder:text-slate-500 focus:border-indigo-500' : 'bg-white border-slate-300 text-slate-900 placeholder:text-slate-400 focus:border-indigo-500'
                            }`}
                          />
                        </td>
                        <td className="p-2.5">
                          <input
                            type="text"
                            value={line.drawingRevision}
                            onChange={(e) => updateLineItem(idx, 'drawingRevision', e.target.value)}
                            placeholder="Rev"
                            className={`w-16 p-2 rounded-lg border text-xs font-mono text-center outline-none ${
                              isDarkMode ? 'bg-[#141822] border-slate-700 text-white placeholder:text-slate-500 focus:border-indigo-500' : 'bg-white border-slate-300 text-slate-900 placeholder:text-slate-400 focus:border-indigo-500'
                            }`}
                          />
                        </td>
                        <td className="p-2.5">
                          <input
                            type="number"
                            min="1"
                            value={line.orderQty}
                            onChange={(e) => updateLineItem(idx, 'orderQty', Number(e.target.value))}
                            className={`w-20 p-2 rounded-lg border text-xs font-mono text-right outline-none ${
                              isDarkMode ? 'bg-[#141822] border-slate-700 text-white focus:border-indigo-500' : 'bg-white border-slate-300 text-slate-900 focus:border-indigo-500'
                            }`}
                          />
                        </td>
                        <td className="p-2.5">
                          <input
                            type="number"
                            min="0"
                            step="0.5"
                            value={line.rate}
                            onChange={(e) => updateLineItem(idx, 'rate', Number(e.target.value))}
                            className={`w-24 p-2 rounded-lg border text-xs font-mono text-right outline-none ${
                              isDarkMode ? 'bg-[#141822] border-slate-700 text-white focus:border-indigo-500' : 'bg-white border-slate-300 text-slate-900 focus:border-indigo-500'
                            }`}
                          />
                        </td>
                        <td className="p-2.5 text-right font-bold text-slate-900 dark:text-white font-mono">
                          ₹{(Number(line.orderQty) * Number(line.rate)).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                        </td>
                        <td className="p-2.5 text-center">
                          <button
                            type="button"
                            disabled={lines.length <= 1}
                            onClick={() => removeLineItem(idx)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 disabled:opacity-30 cursor-pointer transition-colors"
                            aria-label="Remove line item"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
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
              className={`h-11 w-full rounded-xl border px-3 text-xs outline-none transition-all ${
                isDarkMode ? 'bg-[#0d1017] border-slate-700/80 text-white placeholder:text-slate-500 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30' : 'bg-slate-50 border-slate-300 text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:bg-white shadow-xs'
              }`}
            />
          </div>

        </form>
      </Modal>

    </div>
  );
};

export default OrdersView;
