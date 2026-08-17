import React, { useState } from 'react';
import { 
  ArrowLeft, 
  Upload, 
  XCircle, 
  CheckCircle2, 
  Clock, 
  Truck, 
  FileText, 
  ChevronRight,
  ShieldCheck,
  Package,
  Layers,
  Calendar,
  DollarSign,
  Tag,
  X,
  RefreshCw,
  Edit3,
  Plus,
  Trash2,
  AlertTriangle,
  Save,
  Check,
  Lock,
  FileCheck,
  CreditCard,
  Building,
  User,
  ShieldAlert
} from 'lucide-react';
import { CustomerOrder, OrderStatus, QCInspection, OrderLineItem, UserRole } from '../../../types/console';
import { isRoleAuthorizedForCta, getCtaPermission, CtaId, normalizeRole } from '../../../utils/rbacMatrix';
import { executeOrderStageTransition, validatePodRequired, validateOrderClosure } from '../../../utils/orderStateMachine';

interface OrderDetailViewProps {
  order: CustomerOrder;
  qcQueue?: QCInspection[];
  isDarkMode: boolean;
  currentRole?: UserRole | string;
  currentUser?: any;
  onBack: () => void;
  onNavigate?: (view: string) => void;
  onConfirmOrder?: (orderId: string) => Promise<any> | void;
  onUpdateOrder?: (orderId: string, updates: Partial<CustomerOrder>) => void;
  onNavigateToCreateJobCard?: (orderPo: string) => void;
  onCancelOrder?: (orderId: string) => void;
  onNavigateToPDI?: () => void;
  onNavigateToDispatch?: () => void;
}

export const OrderDetailView: React.FC<OrderDetailViewProps> = ({
  order,
  qcQueue = [],
  isDarkMode,
  currentRole = 'SUPER ADMIN',
  currentUser,
  onBack,
  onNavigate,
  onConfirmOrder,
  onUpdateOrder,
  onNavigateToCreateJobCard,
  onCancelOrder,
  onNavigateToPDI,
  onNavigateToDispatch
}) => {
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showPodModal, setShowPodModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [poFileName, setPoFileName] = useState<string | null>(order.clientPoFile || null);
  const [isConfirming, setIsConfirming] = useState(false);
  const [confirmError, setConfirmError] = useState<string | null>(null);

  // POD Form State (PRD v1.0 Hard Gate)
  const [podDocUrl, setPodDocUrl] = useState(order.podDocumentUrl || '');
  const [podCarrier, setPodCarrier] = useState(order.transporterName || '');
  const [podReceivedBy, setPodReceivedBy] = useState(order.podReceivedBy || '');
  const [podDate, setPodDate] = useState(order.podReceivedDate || new Date().toISOString().split('T')[0]);
  const [podError, setPodError] = useState<string | null>(null);

  // Payment Form State (PRD v1.0 Hard Gate)
  const gross = Number(order.grossAmount || (order.lines || []).reduce((sum, l) => sum + (Number(l.orderQty || 0) * Number(l.rate || 0)), 0));
  const currentPaid = Number(order.paidAmount || 0);
  const remainingOutstanding = Math.max(0, gross - currentPaid);
  const [paymentAmount, setPaymentAmount] = useState<number>(remainingOutstanding > 0 ? remainingOutstanding : gross);
  const [paymentMode, setPaymentMode] = useState<'NEFT' | 'RTGS' | 'UPI' | 'CHEQUE'>('NEFT');
  const [paymentRefNo, setPaymentRefNo] = useState(`UTR-${Date.now().toString().slice(-6)}`);
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
  const [paymentError, setPaymentError] = useState<string | null>(null);

  // Edit Order Form State (PRD v1.0 Change Order)
  const [editPoNo, setEditPoNo] = useState(order.poNo || '');
  const [editDeliveryDate, setEditDeliveryDate] = useState(order.deliveryDate || '');
  const [editTaxCategory, setEditTaxCategory] = useState(order.taxCategory || 'GST 18%');
  const [editRemark, setEditRemark] = useState(order.remark || '');
  const [editChangeReason, setEditChangeReason] = useState('');
  const [editLines, setEditLines] = useState<OrderLineItem[]>(order.lines || []);
  const [editError, setEditError] = useState<string | null>(null);

  const editTotalGross = editLines.reduce((sum, l) => sum + (Number(l.orderQty || 0) * Number(l.rate || 0)), 0);

  const hasJobCards = (order.jobCards && order.jobCards.length > 0) || ['IN_PRODUCTION', 'QC_INSPECTION', 'READY_TO_DISPATCH', 'DISPATCHED'].includes(order.status || '');
  const isOwner = normalizeRole(currentRole) === 'ADMIN_OWNER';

  const openEditModal = () => {
    setEditPoNo(order.poNo || '');
    setEditDeliveryDate(order.deliveryDate || '');
    setEditTaxCategory(order.taxCategory || 'GST 18%');
    setEditRemark(order.remark || '');
    setEditChangeReason('');
    setEditLines(order.lines ? [...order.lines.map(l => ({ ...l }))] : []);
    setEditError(null);
    setShowEditModal(true);
  };

  // 7-Stage Order Lifecycle: Confirmed -> Production -> QCI & PDI -> Dispatched -> Delivered -> Invoiced -> Paid
  const steps = [
    { name: 'Confirmed', subtitle: 'Order Approved', key: 0, icon: CheckCircle2, stageMatch: ['DRAFT', 'SUBMITTED', 'PO_RECEIVED', 'CONFIRMED', 'APPROVED', 'RELEASED'] },
    { name: 'Production', subtitle: 'Job Cards & Machining', key: 1, icon: Package, stageMatch: ['MATERIAL_CHECKED', 'MATERIAL_CHECK', 'MATERIAL_READY', 'MATERIAL_VERIFIED', 'PROCUREMENT_PENDING', 'GRN', 'PO_SENT', 'GRN_RECEIVED', 'JOB_RELEASED', 'MATERIAL_ISSUED', 'IN_PRODUCTION', 'WITH_SUBCONTRACTOR', 'REWORK'] },
    { name: 'QCI & PDI', subtitle: 'Quality Clearance', key: 2, icon: ShieldCheck, stageMatch: ['READY_FOR_QC', 'QC', 'QC_INSPECTION', 'QC_HOLD', 'QC_REPORT_UPLOADED', 'PDI', 'PDI_HOLD', 'PDI_COMPLETE', 'READY_FOR_DISPATCH', 'READY_TO_DISPATCH', 'DISPATCH_READY'] },
    { name: 'Dispatched', subtitle: 'Shipped to Customer', key: 3, icon: Truck, stageMatch: ['PARTIALLY_DISPATCHED', 'DISPATCHED', 'IN_TRANSIT'] },
    { name: 'Delivered', subtitle: 'POD Received', key: 4, icon: CheckCircle2, stageMatch: ['DELIVERED', 'PAYMENT_PENDING'] },
    { name: 'Invoiced', subtitle: 'GST Invoice Issued', key: 5, icon: FileText, stageMatch: ['INVOICED', 'INVOICE_GENERATED'] },
    { name: 'Paid', subtitle: 'Payment Settled', key: 6, icon: DollarSign, stageMatch: ['COMPLETED', 'CLOSED', 'PAID'] }
  ];

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setPoFileName(e.target.files[0].name);
      setShowUploadModal(false);
    }
  };

  const linkedQc = (qcQueue || []).filter(q => 
    (q.orderPo && (q.orderPo.trim().toUpperCase() === order.poNo.trim().toUpperCase() || q.orderPo.trim().toUpperCase() === order.id.trim().toUpperCase())) ||
    (order.jobCards && order.jobCards.some(j => j.jobNo && j.jobNo.trim().toUpperCase() === (q.jobNo || '').trim().toUpperCase()))
  );

  const isQcRejected = linkedQc.some(q => q.qcStatus === 'REJECTED');
  const isQcHold = linkedQc.some(q => q.qcStatus === 'QC_HOLD');
  const hasNcr = order.hasOpenNcr || isQcRejected || isQcHold;

  // Active step index calculation matching the 7-stage lifecycle
  let activeStepIndex = 0;
  const currentStage = (order.stage || order.status || 'DRAFT').toUpperCase();
  if (['COMPLETED', 'CLOSED', 'PAID'].includes(currentStage)) {
    activeStepIndex = 6;
  } else if (['INVOICED', 'INVOICE_GENERATED'].includes(currentStage)) {
    activeStepIndex = 5;
  } else if (['DELIVERED', 'PAYMENT_PENDING'].includes(currentStage)) {
    activeStepIndex = 4;
  } else if (['PARTIALLY_DISPATCHED', 'DISPATCHED', 'IN_TRANSIT'].includes(currentStage)) {
    activeStepIndex = 3;
  } else if (['READY_FOR_QC', 'QC', 'QC_INSPECTION', 'QC_HOLD', 'QC_REPORT_UPLOADED', 'PDI', 'PDI_HOLD', 'PDI_COMPLETE', 'READY_FOR_DISPATCH', 'READY_TO_DISPATCH', 'DISPATCH_READY'].includes(currentStage)) {
    activeStepIndex = 2;
  } else if (['CONFIRMED', 'APPROVED', 'RELEASED', 'MATERIAL_CHECKED', 'MATERIAL_CHECK', 'MATERIAL_READY', 'MATERIAL_VERIFIED', 'PROCUREMENT_PENDING', 'GRN', 'PO_SENT', 'GRN_RECEIVED', 'JOB_RELEASED', 'MATERIAL_ISSUED', 'IN_PRODUCTION', 'WITH_SUBCONTRACTOR', 'REWORK'].includes(currentStage)) {
    activeStepIndex = 1;
  } else {
    activeStepIndex = 0;
  }

  // Fulfillment stats
  const totalOrderedQty = (order.lines || []).reduce((sum, l) => sum + Number(l.orderQty || 0), 0);
  const totalDispatchedQty = (order.lines || []).reduce((sum, l) => sum + Number(l.dispatchedQty || 0), 0);
  const fulfillmentPercentage = totalOrderedQty > 0 ? Math.min(100, Math.round((totalDispatchedQty / totalOrderedQty) * 100)) : 0;

  const addEditLineItem = () => {
    setEditLines(prev => [
      ...prev,
      {
        id: `line-${Date.now()}-${prev.length + 1}`,
        itemCode: `0000000${prev.length + 1}`,
        itemDescription: 'NEW COMPONENT PART',
        custPartNo: '',
        orderQty: 50,
        dispatchedQty: 0,
        pendingQty: 50,
        unit: 'NOS',
        rate: 100,
        drawingRevision: 'REV-A'
      }
    ]);
  };

  const removeEditLineItem = (index: number) => {
    if (editLines.length <= 1) {
      setEditError('Order must have at least 1 line item');
      return;
    }
    setEditLines(prev => prev.filter((_, i) => i !== index));
  };

  const updateEditLineItem = (index: number, field: keyof OrderLineItem, value: any) => {
    setEditLines(prev => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };

  const handleSaveOrderEdits = () => {
    if (!editPoNo.trim()) {
      setEditError('PO Number is required');
      return;
    }
    if (!editDeliveryDate) {
      setEditError('Delivery Date is required');
      return;
    }

    // Change order validation if job cards exist
    if (hasJobCards && !isOwner) {
      setEditError('Job Cards already exist for this order. Only the Owner/Super Admin can authorize change orders in production.');
      return;
    }

    for (let i = 0; i < editLines.length; i++) {
      const l = editLines[i];
      if (!l.itemCode.trim()) {
        setEditError(`Line #${i + 1}: Item Code is required`);
        return;
      }
      if (Number(l.orderQty) <= 0) {
        setEditError(`Line #${i + 1}: Quantity must be > 0`);
        return;
      }
      if (Number(l.rate) <= 0) {
        setEditError(`Line #${i + 1}: Rate must be > 0`);
        return;
      }
    }

    const calculatedGross = editLines.reduce((sum, l) => sum + (Number(l.orderQty) * Number(l.rate)), 0);
    const nextVersion = (order.version || 1) + 1;

    onUpdateOrder?.(order.id, {
      poNo: editPoNo.trim().toUpperCase(),
      deliveryDate: editDeliveryDate,
      taxCategory: editTaxCategory,
      remark: editRemark.trim(),
      grossAmount: calculatedGross,
      version: nextVersion,
      amendmentHistory: [
        ...(order.amendmentHistory || []),
        {
          version: nextVersion,
          modifiedAt: new Date().toISOString(),
          modifiedBy: currentUser?.name || 'Owner / Administrator',
          reason: editChangeReason || 'Order parameters modified',
          previousGross: order.grossAmount || 0,
          newGross: calculatedGross
        }
      ],
      lines: editLines.map(l => ({
        ...l,
        orderQty: Number(l.orderQty),
        rate: Number(l.rate),
        pendingQty: Math.max(0, Number(l.orderQty) - Number(l.dispatchedQty || 0))
      }))
    });

    setShowEditModal(false);
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSaveOrderEdits();
  };

  // Stage Transition Handlers with RBAC & Hard Gates
  const handleConfirmAction = async () => {
    try {
      setIsConfirming(true);
      setConfirmError(null);
      if (onConfirmOrder) {
        await onConfirmOrder(order.id);
      } else if (onUpdateOrder) {
        await onUpdateOrder(order.id, {
          status: 'CONFIRMED',
          stage: 'CONFIRMED',
          progressStep: 2
        });
      }
    } catch (err: any) {
      console.error('Order confirmation failed:', err);
      setConfirmError(err?.message || 'Failed to confirm order.');
    } finally {
      setIsConfirming(false);
    }
  };

  // 7-Stage Flow: redirect the user to Production, where job cards are created manually (per item)
  const handleGoToCreateJobCard = () => {
    if (onNavigateToCreateJobCard) {
      onNavigateToCreateJobCard(order.poNo || order.id);
    } else {
      onNavigate?.('production');
    }
  };

  const handleMaterialCheckAction = async () => {
    try {
      setIsConfirming(true);
      setConfirmError(null);
      const heatLot = order.heatLotNumber || `HEAT-LOT-${Math.floor(1000 + Math.random() * 9000)}`;

      if (onUpdateOrder) {
        await onUpdateOrder(order.id, {
          status: 'MATERIAL_READY',
          stage: 'MATERIAL_READY',
          heatLotNumber: heatLot,
          progressStep: 3
        });
      }
    } catch (err: any) {
      setConfirmError(err?.message || 'Failed to complete material check.');
    } finally {
      setIsConfirming(false);
    }
  };

  const handleReleaseJobCardsAction = async () => {
    try {
      setIsConfirming(true);
      setConfirmError(null);
      if (onUpdateOrder) {
        await onUpdateOrder(order.id, {
          status: 'JOB_RELEASED',
          stage: 'JOB_RELEASED',
          progressStep: 4
        });
      }
    } catch (err: any) {
      setConfirmError(err?.message || 'Failed to release job cards.');
    } finally {
      setIsConfirming(false);
    }
  };

  const handleStartProductionAction = async () => {
    try {
      setIsConfirming(true);
      setConfirmError(null);
      if (onUpdateOrder) {
        await onUpdateOrder(order.id, {
          status: 'IN_PRODUCTION',
          stage: 'IN_PRODUCTION',
          progressStep: 4
        });
      }
    } catch (err: any) {
      setConfirmError(err?.message || 'Failed to advance to production.');
    } finally {
      setIsConfirming(false);
    }
  };

  const handleAdvanceToQcAction = async () => {
    try {
      setIsConfirming(true);
      setConfirmError(null);
      if (onUpdateOrder) {
        await onUpdateOrder(order.id, {
          status: 'READY_FOR_QC',
          stage: 'READY_FOR_QC',
          progressStep: 5
        });
      }
    } catch (err: any) {
      setConfirmError(err?.message || 'Failed to advance to QC inspection.');
    } finally {
      setIsConfirming(false);
    }
  };

  const handleClearQcAction = async () => {
    try {
      setIsConfirming(true);
      setConfirmError(null);
      if (hasNcr) {
        throw new Error('Open Non-Conformance Report (NCR) exists! Clear all NCRs before passing QC.');
      }
      if (onUpdateOrder) {
        await onUpdateOrder(order.id, {
          status: 'QC_REPORT_UPLOADED',
          stage: 'QC_REPORT_UPLOADED',
          progressStep: 5
        });
      }
    } catch (err: any) {
      setConfirmError(err?.message || 'Failed to clear QC inspection.');
    } finally {
      setIsConfirming(false);
    }
  };

  const handleClearPdiAction = async () => {
    try {
      setIsConfirming(true);
      setConfirmError(null);
      if (hasNcr) {
        throw new Error('Open NCR or Quality Hold exists! PDI Certificate cannot be issued.');
      }
      if (onUpdateOrder) {
        await onUpdateOrder(order.id, {
          status: 'PDI_COMPLETE',
          stage: 'PDI_COMPLETE',
          hasOpenNcr: false,
          progressStep: 6
        });
      }
    } catch (err: any) {
      setConfirmError(err?.message || 'Failed to clear PDI.');
    } finally {
      setIsConfirming(false);
    }
  };

  const handleCreateChallanAction = async () => {
    try {
      setIsConfirming(true);
      setConfirmError(null);
      if (onUpdateOrder) {
        await onUpdateOrder(order.id, {
          status: 'READY_TO_DISPATCH',
          stage: 'READY_TO_DISPATCH',
          deliveryChallanNo: order.deliveryChallanNo || `CHL-26-${Math.floor(1000 + Math.random() * 9000)}`,
          progressStep: 7
        });
      }
    } catch (err: any) {
      setConfirmError(err?.message || 'Failed to create Delivery Challan.');
    } finally {
      setIsConfirming(false);
    }
  };

  const handleMarkInTransitAction = async () => {
    try {
      setIsConfirming(true);
      setConfirmError(null);
      if (onUpdateOrder) {
        await onUpdateOrder(order.id, {
          status: 'IN_TRANSIT',
          stage: 'IN_TRANSIT',
          progressStep: 8,
          lines: (order.lines || []).map(l => ({
            ...l,
            dispatchedQty: l.orderQty,
            pendingQty: 0
          }))
        });
      }
    } catch (err: any) {
      setConfirmError(err?.message || 'Failed to mark as In Transit.');
    } finally {
      setIsConfirming(false);
    }
  };

  // PRD v1.0 Hard Gate: POD Submission
  const handleSavePodDelivery = () => {
    if (!podDocUrl.trim()) {
      setPodError('POD / E-POD Document URL or File Name is required.');
      return;
    }
    if (!podReceivedBy.trim()) {
      setPodError('Receiver name is required.');
      return;
    }

    onUpdateOrder?.(order.id, {
      status: 'DELIVERED',
      stage: 'DELIVERED',
      podDocumentUrl: podDocUrl.trim(),
      transporterName: podCarrier.trim() || order.transporterName,
      podReceivedBy: podReceivedBy.trim(),
      podReceivedDate: podDate,
      paymentStatus: order.paymentStatus || 'UNPAID',
      progressStep: 9
    });

    setShowPodModal(false);
    setPodError(null);
  };

  const handleGenerateInvoiceAction = async () => {
    try {
      setIsConfirming(true);
      setConfirmError(null);
      if (onUpdateOrder) {
        await onUpdateOrder(order.id, {
          status: 'INVOICED',
          stage: 'INVOICED',
          invoiceNo: order.invoiceNo || `INV-2526-${Math.floor(1000 + Math.random() * 9000)}`,
          paymentStatus: order.paymentStatus || 'UNPAID',
          progressStep: 10
        });
      }
    } catch (err: any) {
      setConfirmError(err?.message || 'Failed to generate tax invoice.');
    } finally {
      setIsConfirming(false);
    }
  };

  // PRD v1.0 Hard Gate: Record Payment & Settle
  const handleSavePayment = () => {
    if (paymentAmount <= 0) {
      setPaymentError('Payment amount must be greater than ₹0.');
      return;
    }

    const newTotalPaid = currentPaid + paymentAmount;
    const isFullyPaid = newTotalPaid >= gross;

    onUpdateOrder?.(order.id, {
      paidAmount: newTotalPaid,
      paymentStatus: isFullyPaid ? 'PAID' : 'PARTIAL',
      paymentHistory: [
        ...(order.paymentHistory || []),
        {
          id: `pay-${Date.now()}`,
          amount: paymentAmount,
          mode: paymentMode,
          referenceNo: paymentRefNo.trim(),
          receivedDate: paymentDate,
          receivedBy: currentUser?.name || 'Accounts Officer'
        }
      ]
    });

    setShowPaymentModal(false);
    setPaymentError(null);
  };

  // PRD v1.0 Hard Gate: Order Closure (Must be Delivered + Full Payment)
  const handleCloseOrderAction = async () => {
    try {
      setIsConfirming(true);
      setConfirmError(null);

      const closeRes = validateOrderClosure(
        currentStage as any,
        order.paymentStatus || (remainingOutstanding <= 0 ? 'PAID' : 'UNPAID'),
        remainingOutstanding
      );

      if (!closeRes.valid) {
        throw new Error(closeRes.errorMessage);
      }

      if (onUpdateOrder) {
        await onUpdateOrder(order.id, {
          status: 'CLOSED',
          stage: 'CLOSED',
          closedAt: new Date().toISOString(),
          closedBy: currentUser?.name || 'Finance Controller',
          progressStep: 11
        });
      }
    } catch (err: any) {
      setConfirmError(err?.message || 'Failed to close order.');
    } finally {
      setIsConfirming(false);
    }
  };

  // 7-Stage Flow: QCI & PDI cleared -> dispatch the order (challan + full line quantities)
  const handleDispatchOrderAction = async () => {
    try {
      setIsConfirming(true);
      setConfirmError(null);
      if (hasNcr) {
        throw new Error('Open Non-Conformance Report (NCR) exists! Clear all NCRs before dispatch.');
      }
      if (onUpdateOrder) {
        await onUpdateOrder(order.id, {
          status: 'DISPATCHED',
          stage: 'DISPATCHED',
          hasOpenNcr: false,
          deliveryChallanNo: order.deliveryChallanNo || `CHL-26-${Math.floor(1000 + Math.random() * 9000)}`,
          progressStep: 6,
          lines: (order.lines || []).map(l => ({
            ...l,
            dispatchedQty: l.orderQty,
            pendingQty: 0
          }))
        });
      }
    } catch (err: any) {
      setConfirmError(err?.message || 'Failed to dispatch order.');
    } finally {
      setIsConfirming(false);
    }
  };

  // Dynamic CTA Engine matching the PRD v1.0 Action Table and RBAC
  const getNextAction = () => {
    if (order.status === 'CLOSED' || order.status === 'CANCELLED' || order.status === 'COMPLETED') return null;

    const st = (order.stage || order.status || 'DRAFT').toUpperCase();

    // Stage 1: DRAFT / SUBMITTED / PO_RECEIVED
    if (['DRAFT', 'SUBMITTED', 'PO_RECEIVED'].includes(st)) {
      const allowed = isRoleAuthorizedForCta(currentRole, 'CONFIRM_ORDER');
      return {
        label: isConfirming ? 'Confirming...' : 'Confirm Order',
        icon: CheckCircle2,
        buttonClass: 'bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white shadow-emerald-500/25',
        handler: handleConfirmAction,
        disabled: isConfirming || !allowed,
        disabledReason: !allowed ? 'Only Sales/Order Desk or Owner can confirm order' : undefined,
        ownerRole: 'Sales / Order Desk'
      };
    }

    // Stage 1 -> 2: CONFIRMED -> go to Production and create job cards manually (one per line item)
    if (['CONFIRMED', 'APPROVED', 'RELEASED', 'MATERIAL_CHECKED', 'MATERIAL_CHECK', 'MATERIAL_READY', 'MATERIAL_VERIFIED', 'JOB_RELEASED', 'MATERIAL_ISSUED'].includes(st)) {
      const allowed = isRoleAuthorizedForCta(currentRole, 'CREATE_JOB_CARD');
      const lineCount = (order.lines || []).length;
      return {
        label: `Create Job Card in Production (${lineCount} item${lineCount === 1 ? '' : 's'})`,
        icon: RefreshCw,
        buttonClass: 'bg-gradient-to-r from-amber-600 to-orange-500 hover:from-orange-500 hover:to-amber-600 text-white shadow-amber-500/25',
        handler: handleGoToCreateJobCard,
        disabled: !allowed || lineCount === 0,
        disabledReason: !allowed ? 'Only Production Planner (PPC) or Owner can create job cards' : lineCount === 0 ? 'Order has no line items to release' : undefined,
        ownerRole: 'Production Planner (PPC)'
      };
    }

    if (['PROCUREMENT_PENDING', 'PO_SENT', 'GRN'].includes(st)) {
      return {
        label: 'Material Shortage (Procurement Active)',
        icon: AlertTriangle,
        buttonClass: 'bg-amber-600/80 text-white cursor-not-allowed',
        handler: () => onNavigate?.('inventory'),
        disabled: false,
        ownerRole: 'Purchase / Stores'
      };
    }

    // Stage 2 (Production): IN_PRODUCTION / WITH_SUBCONTRACTOR / REWORK -> advance to QCI & PDI
    if (['IN_PRODUCTION', 'WITH_SUBCONTRACTOR', 'REWORK'].includes(st)) {
      return {
        label: isConfirming ? 'Advancing...' : 'Advance to QCI & PDI',
        icon: ShieldCheck,
        buttonClass: 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-indigo-600 hover:to-purple-600 text-white shadow-purple-500/25',
        handler: handleAdvanceToQcAction,
        disabled: isConfirming,
        ownerRole: 'Production Floor Supervisor'
      };
    }

    // Stage 3 (QCI & PDI): pass quality clearance and dispatch the order
    if (['READY_FOR_QC', 'QC', 'QC_INSPECTION', 'QC_HOLD', 'QC_REPORT_UPLOADED', 'PDI', 'PDI_HOLD', 'PDI_COMPLETE', 'READY_FOR_DISPATCH', 'READY_TO_DISPATCH', 'DISPATCH_READY'].includes(st)) {
      const allowed = isRoleAuthorizedForCta(currentRole, 'GENERATE_DELIVERY_CHALLAN');
      return {
        label: isConfirming ? 'Dispatching...' : 'Pass QC & PDI and Dispatch',
        icon: Truck,
        buttonClass: 'bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-blue-600 hover:to-cyan-600 text-white shadow-cyan-500/25',
        handler: handleDispatchOrderAction,
        disabled: isConfirming || hasNcr || !allowed,
        disabledReason: !allowed ? 'Only Dispatch Clerk or Owner can dispatch the order' : hasNcr ? 'Open NCR / QC Hold must be resolved before dispatch' : undefined,
        ownerRole: 'Quality & Dispatch'
      };
    }

    // Stage 4 (Dispatched): shipped / in transit -> Mark Delivered (Requires POD upload)
    if (['PARTIALLY_DISPATCHED', 'DISPATCHED', 'IN_TRANSIT'].includes(st)) {
      const allowed = isRoleAuthorizedForCta(currentRole, 'MARK_DELIVERED');
      return {
        label: 'Mark Delivered (Attach POD)',
        icon: CheckCircle2,
        buttonClass: 'bg-gradient-to-r from-blue-600 to-emerald-600 hover:from-emerald-600 hover:to-blue-600 text-white shadow-blue-500/25',
        handler: () => setShowPodModal(true),
        disabled: !allowed,
        disabledReason: !allowed ? 'Only Dispatch Clerk or Owner can mark delivered' : undefined,
        ownerRole: 'Dispatch Logistics'
      };
    }

    // Stage 5 (Delivered): generate the GST tax invoice
    if (['DELIVERED', 'PAYMENT_PENDING'].includes(st)) {
      const allowed = isRoleAuthorizedForCta(currentRole, 'GENERATE_INVOICE');
      return {
        label: isConfirming ? 'Generating...' : 'Generate GST Tax Invoice',
        icon: FileText,
        buttonClass: 'bg-gradient-to-r from-emerald-600 to-indigo-600 hover:from-indigo-600 hover:to-emerald-600 text-white shadow-emerald-500/25',
        handler: handleGenerateInvoiceAction,
        disabled: isConfirming || !allowed,
        disabledReason: !allowed ? 'Only Finance / Accounts or Owner can generate tax invoices' : undefined,
        ownerRole: 'Finance / Accounts'
      };
    }

    // Stage 6 (Invoiced): settle payment; Stage 7 (Paid): close the order
    if (['INVOICED', 'INVOICE_GENERATED'].includes(st)) {
      const isPaid = order.paymentStatus === 'PAID' || remainingOutstanding <= 0;
      if (!isPaid) {
        const allowed = isRoleAuthorizedForCta(currentRole, 'RECORD_PAYMENT');
        return {
          label: `Record Payment (Bal: ₹${remainingOutstanding.toLocaleString('en-IN')})`,
          icon: CreditCard,
          buttonClass: 'bg-gradient-to-r from-amber-600 to-emerald-600 hover:from-emerald-600 hover:to-amber-600 text-white shadow-amber-500/25',
          handler: () => setShowPaymentModal(true),
          disabled: !allowed,
          disabledReason: !allowed ? 'Only Finance / Accounts or Owner can record payments' : undefined,
          ownerRole: 'Finance / Accounts'
        };
      } else {
        const allowed = isRoleAuthorizedForCta(currentRole, 'MARK_ORDER_CLOSED');
        return {
          label: isConfirming ? 'Closing...' : 'Mark Order Closed (Paid in Full)',
          icon: CheckCircle2,
          buttonClass: 'bg-gradient-to-r from-emerald-700 to-slate-800 hover:from-slate-800 hover:to-emerald-700 text-white shadow-emerald-500/25',
          handler: handleCloseOrderAction,
          disabled: isConfirming || !allowed,
          disabledReason: !allowed ? 'Only Finance / Accounts or Owner can close order' : undefined,
          ownerRole: 'Finance / Accounts'
        };
      }
    }

    return null;
  };

  // Configuration of dynamic stage shortcuts & testing endpoints (7-stage lifecycle)
  const getStageShortcutConfig = () => {
    switch (activeStepIndex) {
      case 0:
        return {
          title: 'Stage 1: Confirmed',
          desc: 'Order received and logged. Review commercials and line item drawing revisions, then confirm the order to release it for production.',
          targetView: 'approvals',
          viewLabel: 'Open Approvals Queue ➔',
          endpoint: 'POST /api/v1/orders/:id/confirm',
          role: 'SALES_DESK / SUPER_ADMIN',
          testActionLabel: 'Confirm & Approve Order (Test)',
          onTest: handleConfirmAction
        };
      case 1:
        return {
          title: 'Stage 2: Production',
          desc: 'Order confirmed. Redirect to the Production floor to create job cards manually — one per order line item, with route card and material lot filled in.',
          targetView: 'production',
          viewLabel: 'Open Production Floor ➔',
          endpoint: 'POST /api/v1/production/job-cards',
          role: 'PRODUCTION_PLANNER / PPC',
          testActionLabel: 'Go to Create Job Card (Test)',
          onTest: handleGoToCreateJobCard
        };
      case 2:
        return {
          title: 'Stage 3: QCI & PDI',
          desc: 'Perform dimensional audits, resolve quality holds, and clear PDI inspection certificates before dispatch.',
          targetView: 'qc',
          secondaryView: 'pdi',
          viewLabel: 'Open Quality Control Queue ➔',
          secondaryViewLabel: 'Open PDI Bay ➔',
          endpoint: 'POST /api/v1/qc/inspections/:id/review',
          role: 'QC_ADMIN / DISPATCH_QC',
          testActionLabel: 'Advance to QCI & PDI (Test)',
          onTest: () => {
            onUpdateOrder?.(order.id, {
              status: 'QC_INSPECTION',
              stage: 'QC_INSPECTION',
              progressStep: 5
            });
          }
        };
      case 3:
        return {
          title: 'Stage 4: Dispatched',
          desc: 'QC & PDI cleared. Dispatch the order — challan issued, line quantities shipped to the customer.',
          targetView: 'dispatch',
          viewLabel: 'Open Dispatch Challans ➔',
          endpoint: 'POST /api/v1/dispatch/:id/dispatch',
          role: 'DISPATCH_STORE / OPS_ADMIN',
          testActionLabel: 'Dispatch Order (Test)',
          onTest: handleDispatchOrderAction
        };
      case 4:
        return {
          title: 'Stage 5: Delivered',
          desc: 'Shipment in transit / dispatched. Collect the signed POD / E-POD from the customer to mark the order delivered.',
          targetView: 'dispatch',
          viewLabel: 'Open Dispatch Challans ➔',
          endpoint: 'POST /api/v1/dispatch/:id/deliver',
          role: 'DISPATCH_STORE / OPS_ADMIN',
          testActionLabel: 'Mark Delivered (Test)',
          onTest: () => {
            onUpdateOrder?.(order.id, {
              status: 'DELIVERED',
              stage: 'DELIVERED',
              podDocumentUrl: order.podDocumentUrl || 'POD-SIGNED-EPOD',
              podReceivedBy: order.podReceivedBy || 'Customer Reception',
              progressStep: 7
            });
          }
        };
      case 5:
        return {
          title: 'Stage 6: Invoiced',
          desc: 'Order delivered with POD on record. Generate the statutory GST tax invoice (INV-2526-####) for the settled quantity.',
          targetView: 'invoices',
          viewLabel: 'Open Invoices & Accounts ➔',
          endpoint: 'POST /api/v1/invoices',
          role: 'ACCOUNTS_ADMIN',
          testActionLabel: 'Generate GST Invoice (Test)',
          onTest: () => {
            onUpdateOrder?.(order.id, {
              status: 'INVOICED',
              stage: 'INVOICED',
              invoiceNo: order.invoiceNo || `INV-2526-${Math.floor(1000 + Math.random() * 9000)}`,
              progressStep: 8
            });
          }
        };
      default:
        return {
          title: 'Stage 7: Paid',
          desc: 'Invoice issued. Record customer payments against the outstanding balance; full settlement closes the order.',
          targetView: 'invoices',
          viewLabel: 'Open Invoices & Accounts ➔',
          endpoint: 'POST /api/v1/invoices/:invoiceNo/pay',
          role: 'ACCOUNTS_ADMIN',
          testActionLabel: 'Order Settled',
          onTest: undefined
        };
    }
  };

  const stageShortcut = getStageShortcutConfig();

  return (
    <div className="space-y-6 font-sans">
      
      {/* 1. Header Navigation & Action Bar */}
      <div className={`p-6 rounded-3xl border transition-all ${
        isDarkMode 
          ? 'bg-slate-900/85 border-slate-800/80 text-white backdrop-blur-xl shadow-2xl' 
          : 'bg-white border-slate-200 shadow-md text-slate-900'
      }`}>
        <div className="flex flex-wrap items-center justify-between gap-4">
          
          <div className="flex items-center gap-3.5">
            <button
              onClick={onBack}
              className={`p-2.5 rounded-2xl border cursor-pointer transition-all hover:scale-105 active:scale-95 ${
                isDarkMode 
                  ? 'border-slate-800 bg-slate-950/70 text-slate-300 hover:bg-slate-800 hover:text-white' 
                  : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
              }`}
              title="Back to Orders Hub"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>

            <div>
              <div className="flex flex-wrap items-center gap-2.5">
                <h1 className="text-2xl font-bold font-mono tracking-tight text-[#5B75F8] dark:text-[#7B92FF] flex items-center gap-2">
                  <span>{order.poNo}</span>
                </h1>
                
                {order.subType && (
                  <span className={`px-2.5 py-0.5 rounded-lg text-[10px] font-mono font-bold uppercase border ${
                    order.subType === 'BLANKET_CALLOFF' 
                      ? isDarkMode ? 'bg-purple-500/20 text-purple-300 border-purple-500/30' : 'bg-purple-100 text-purple-800 border-purple-200'
                      : isDarkMode ? 'bg-blue-500/20 text-blue-300 border-blue-500/30' : 'bg-blue-100 text-blue-800 border-blue-200'
                  }`}>
                    {order.subType === 'BLANKET_CALLOFF' ? 'Blanket Call-Off' : 'Fresh PO'}
                  </span>
                )}

                <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-mono font-bold uppercase border ${
                  isQcRejected ? 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-500/15 dark:text-rose-400 dark:border-rose-500/30' :
                  isQcHold || hasNcr ? 'bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-500/15 dark:text-amber-400 dark:border-amber-500/30' :
                  order.status === 'CANCELLED' ? 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-500/15 dark:text-rose-400 dark:border-rose-500/30' :
                  order.status === 'DRAFT' || order.status === 'PO_RECEIVED' || order.status === 'SUBMITTED' ? 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/15 dark:text-amber-300 dark:border-amber-500/30' :
                  order.status === 'CONFIRMED' || order.status === 'APPROVED' ? 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-500/15 dark:text-blue-400 dark:border-blue-500/30' :
                  order.status === 'MATERIAL_CHECKED' || order.status === 'MATERIAL_CHECK' || order.status === 'MATERIAL_READY' ? 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-500/15 dark:text-indigo-400 dark:border-indigo-500/30' :
                  order.status === 'IN_PRODUCTION' ? 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/15 dark:text-amber-400 dark:border-amber-500/30' :
                  order.status === 'QC_INSPECTION' || order.status === 'QC' ? 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-500/15 dark:text-purple-400 dark:border-purple-500/30' :
                  order.status === 'READY_TO_DISPATCH' || order.status === 'READY_FOR_DISPATCH' ? 'bg-cyan-50 text-cyan-700 border-cyan-200 dark:bg-cyan-500/15 dark:text-cyan-400 dark:border-cyan-500/30' :
                  order.status === 'PARTIALLY_DISPATCHED' || order.status === 'DISPATCHED' ? 'bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-500/15 dark:text-teal-400 dark:border-teal-500/30' :
                  order.status === 'CLOSED' || order.status === 'COMPLETED' ? 'bg-slate-100 text-slate-700 border-slate-300 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700' :
                  'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-400 dark:border-emerald-500/30'
                }`}>
                  <span className={`w-2 h-2 rounded-full ${
                    isQcRejected ? 'bg-rose-500 animate-pulse' :
                    isQcHold || hasNcr ? 'bg-amber-500 animate-pulse' :
                    order.status === 'CANCELLED' ? 'bg-rose-500' :
                    order.status === 'DRAFT' || order.status === 'PO_RECEIVED' || order.status === 'SUBMITTED' ? 'bg-amber-500 animate-pulse' :
                    order.status === 'CONFIRMED' || order.status === 'APPROVED' ? 'bg-blue-500' :
                    order.status === 'MATERIAL_CHECKED' || order.status === 'MATERIAL_CHECK' || order.status === 'MATERIAL_READY' ? 'bg-indigo-500' :
                    order.status === 'IN_PRODUCTION' ? 'bg-amber-500 animate-pulse' :
                    order.status === 'QC_INSPECTION' || order.status === 'QC' ? 'bg-purple-500' :
                    order.status === 'READY_TO_DISPATCH' || order.status === 'READY_FOR_DISPATCH' ? 'bg-cyan-500' :
                    order.status === 'PARTIALLY_DISPATCHED' || order.status === 'DISPATCHED' ? 'bg-teal-500' :
                    order.status === 'CLOSED' || order.status === 'COMPLETED' ? 'bg-slate-400' : 'bg-emerald-500'
                  }`} />
                  <span>{isQcRejected ? 'QC Rejected' : (isQcHold || hasNcr) ? 'QC Hold / NCR' : (order.stage || order.status).replace(/_/g, ' ')}</span>
                </span>
              </div>
              <p className={`text-xs mt-1 flex items-center gap-1.5 ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                <span>Customer:</span>
                <strong className="text-[#5B75F8] dark:text-[#7B92FF] font-semibold">{order.customerName}</strong>
                <span className="text-slate-500">•</span>
                <span>Created {order.poDate}</span>
              </p>
            </div>
          </div>

          {/* Action Buttons Toolbar */}
          <div className="flex items-center gap-2.5">
            <button
              onClick={() => setShowUploadModal(true)}
              className={`px-3.5 py-2 rounded-2xl border text-xs font-mono font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                isDarkMode 
                  ? 'border-slate-800 bg-slate-950/60 text-slate-300 hover:bg-slate-800 hover:text-white' 
                  : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
              }`}
            >
              <Upload className="w-3.5 h-3.5" />
              <span>{poFileName ? 'PO File Attached' : 'Attach PO'}</span>
            </button>

            {(() => {
              const nextAction = getNextAction();
              if (!nextAction) return null;
              const ActionIcon = nextAction.icon;
              return (
                <button
                  disabled={nextAction.disabled}
                  title={nextAction.disabledReason}
                  onClick={nextAction.handler}
                  className={`px-4 py-2 rounded-2xl ${nextAction.buttonClass} text-xs font-bold font-mono transition-all cursor-pointer flex items-center gap-1.5 shadow-lg hover:scale-[1.02] active:scale-[0.98] ${
                    nextAction.disabled ? 'opacity-60 cursor-not-allowed hover:scale-100' : ''
                  }`}
                >
                  <ActionIcon className="w-3.5 h-3.5" />
                  <span>{nextAction.label}</span>
                </button>
              );
            })()}

            {order.status !== 'CLOSED' && order.status !== 'CANCELLED' && (
              <>
                <button
                  onClick={openEditModal}
                  className="px-4 py-2 rounded-2xl bg-gradient-to-r from-[#5B75F8] to-indigo-600 hover:from-indigo-600 hover:to-[#5B75F8] text-white text-xs font-bold font-mono transition-all cursor-pointer flex items-center gap-1.5 shadow-lg shadow-[#5B75F8]/25 hover:scale-[1.02] active:scale-[0.98]"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>Edit Order</span>
                </button>
                <button
                  onClick={() => onCancelOrder?.(order.id)}
                  className="px-3.5 py-2 rounded-2xl border border-rose-500/30 bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 font-bold text-xs font-mono transition-all cursor-pointer"
                >
                  Cancel Order
                </button>
              </>
            )}
          </div>
        </div>

        {confirmError && (
          <div className="mt-4 p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs font-mono flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{confirmError}</span>
            </div>
            <button
              onClick={() => setConfirmError(null)}
              className="p-1 hover:bg-rose-500/20 rounded-lg transition-colors cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* 2. Redesigned Milestone Progress Pipeline */}
      <div className={`p-6 sm:p-8 rounded-3xl border transition-all shadow-xl relative overflow-hidden ${
        isDarkMode 
          ? 'bg-slate-900/90 border-slate-800/90 backdrop-blur-xl text-white' 
          : 'bg-white border-slate-200 text-slate-900 shadow-sm'
      }`}>
        
        {/* Subtle Ambient Background Gradient */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-bl from-indigo-500/10 via-blue-500/5 to-transparent rounded-full blur-3xl pointer-events-none -z-0" />
        
        <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-100 dark:border-slate-800/80 relative z-10">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-indigo-500/15 text-indigo-500 dark:text-indigo-400">
              <RefreshCw className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-bold text-sm uppercase tracking-wider">
                Production & Order Fulfillment Pipeline
              </h2>
              <p className={`text-[11px] font-mono mt-0.5 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                Gated 7-stage verification • Stage {activeStepIndex + 1} of 7 Active
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className={`px-3 py-1 rounded-xl text-xs font-mono font-bold border ${
              isDarkMode ? 'bg-indigo-500/10 border-indigo-500/30 text-[#7B92FF]' : 'bg-indigo-50 border-indigo-200 text-indigo-700'
            }`}>
              {Math.round(((activeStepIndex + 1) / 7) * 100)}% Milestone Completed
            </span>
          </div>
        </div>

        {/* Milestone Steps Bar */}
        <div className="relative z-10 py-2 overflow-x-auto scrollbar-none">
          <div className="flex items-start justify-between min-w-[700px]">
            {steps.map((st, idx) => {
              const isCompleted = idx < activeStepIndex;
              const isCurrent = idx === activeStepIndex;
              const isUpcoming = idx > activeStepIndex;
              const StepIcon = st.icon;

              return (
                <React.Fragment key={st.name}>
                  {/* Step Node */}
                  <div className="flex flex-col items-center shrink-0 min-w-[100px] max-w-[130px] group text-center">
                    
                    {/* Node Circle */}
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-300 ${
                      isCurrent
                        ? isQcRejected 
                          ? 'bg-gradient-to-tr from-rose-600 to-rose-500 text-white ring-4 ring-rose-500/30 shadow-lg shadow-rose-500/40 scale-110 border-2 border-rose-400'
                          : isQcHold || hasNcr
                          ? 'bg-gradient-to-tr from-amber-600 to-amber-500 text-white ring-4 ring-amber-500/30 shadow-lg shadow-amber-500/40 scale-110 border-2 border-amber-400'
                          : 'bg-gradient-to-tr from-[#5B75F8] to-indigo-600 text-white ring-4 ring-[#5B75F8]/30 shadow-lg shadow-[#5B75F8]/40 scale-110 border-2 border-indigo-300'
                        : isCompleted
                          ? 'bg-emerald-500/15 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border-2 border-emerald-500/40 shadow-xs'
                          : 'bg-slate-100 dark:bg-slate-800/80 text-slate-400 dark:text-slate-500 border-2 border-slate-200 dark:border-slate-700/60'
                    }`}>
                      {isCompleted ? (
                        <CheckCircle2 className="w-5 h-5 stroke-[2.5]" />
                      ) : (
                        <StepIcon className="w-5 h-5 stroke-[2]" />
                      )}
                    </div>

                    {/* Step Title & Subtitle */}
                    <span className={`mt-3 text-xs font-bold tracking-tight block ${
                      isCurrent 
                        ? 'text-[#5B75F8] dark:text-[#7B92FF]' 
                        : isCompleted 
                        ? (isDarkMode ? 'text-slate-200' : 'text-slate-800') 
                        : 'text-slate-400 dark:text-slate-500'
                    }`}>
                      {st.name}
                    </span>

                    <span className={`mt-0.5 text-[10px] font-mono block leading-tight ${
                      isCurrent 
                        ? 'text-indigo-400 font-semibold' 
                        : isCompleted 
                        ? 'text-emerald-500 font-medium' 
                        : 'text-slate-400/80 dark:text-slate-500'
                    }`}>
                      {isCompleted ? '✓ Cleared' : isCurrent ? '● In Progress' : st.subtitle}
                    </span>
                  </div>

                  {/* Connecting Line */}
                  {idx < steps.length - 1 && (
                    <div className="flex-1 self-start mt-6 mx-2 min-w-[30px]">
                      <div className={`h-1 rounded-full transition-all duration-500 ${
                        idx < activeStepIndex 
                          ? 'bg-gradient-to-r from-emerald-500 to-emerald-400 shadow-sm shadow-emerald-500/20' 
                          : idx === activeStepIndex
                          ? 'bg-gradient-to-r from-[#5B75F8] to-slate-300 dark:to-slate-700 animate-pulse'
                          : isDarkMode ? 'bg-slate-800' : 'bg-slate-200'
                      }`} />
                    </div>
                  )}
                </React.Fragment>
              );
            })}
          </div>
        </div>

        {/* 2.5 Stage Testing & Direct Navigation Shortcut Banner */}
        <div className={`mt-6 p-4 rounded-2xl border flex flex-wrap items-center justify-between gap-4 font-mono text-xs ${
          isDarkMode 
            ? 'bg-slate-950/70 border-[#5B75F8]/30' 
            : 'bg-indigo-50/70 border-indigo-200'
        }`}>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-[#5B75F8]/20 text-[#7B92FF] font-bold">
              ⚡ Stage Gateway
            </div>
            <div>
              <div className="font-bold text-sm font-sans flex items-center gap-2">
                <span>{stageShortcut.title}</span>
                <span className={`text-[10px] px-2 py-0.5 rounded-md font-mono ${
                  isDarkMode ? 'bg-slate-800 text-slate-300 border border-slate-700' : 'bg-white text-slate-700 border border-slate-300'
                }`}>
                  {stageShortcut.role}
                </span>
              </div>
              <p className={`text-[11px] mt-0.5 ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                {stageShortcut.desc} • <code className="text-[#5B75F8] dark:text-[#7B92FF] font-bold">{stageShortcut.endpoint}</code>
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {stageShortcut.targetView && (
              <button
                onClick={() => onNavigate?.(stageShortcut.targetView)}
                className="px-3.5 py-2 rounded-xl bg-[#5B75F8] hover:bg-indigo-600 text-white font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-sm hover:scale-105"
              >
                <span>{stageShortcut.viewLabel}</span>
              </button>
            )}

            {stageShortcut.secondaryView && (
              <button
                onClick={() => onNavigate?.(stageShortcut.secondaryView!)}
                className="px-3.5 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-sm hover:scale-105"
              >
                <span>{stageShortcut.secondaryViewLabel}</span>
              </button>
            )}

            {stageShortcut.onTest && (
              <button
                onClick={stageShortcut.onTest}
                className={`px-3.5 py-2 rounded-xl border text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 hover:scale-105 ${
                  isDarkMode 
                    ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20' 
                    : 'border-emerald-300 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                }`}
                title="Testing Quick Action: Transition order to next verified state"
              >
                <span>⚡ {stageShortcut.testActionLabel}</span>
              </button>
            )}
          </div>
        </div>

      </div>

      {/* 3. Executive KPI & Order Metadata Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 font-mono">
        
        {/* Card 1: Gross Commercials */}
        <div className={`p-5 rounded-3xl border transition-all ${
          isDarkMode ? 'bg-slate-900/70 border-slate-800/80' : 'bg-white border-slate-200 shadow-xs'
        }`}>
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] text-slate-400 uppercase font-bold tracking-wider">Gross Order Value</span>
            <div className="p-2 rounded-xl bg-emerald-500/15 text-emerald-500">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl font-bold text-emerald-600 dark:text-emerald-400 tracking-tight">
            ₹{order.grossAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>
          <div className="mt-2 flex items-center justify-between text-[11px] text-slate-400 pt-2 border-t border-slate-100 dark:border-slate-800">
            <span>Tax Bracket:</span>
            <span className={`font-bold ${isDarkMode ? 'text-slate-200' : 'text-slate-800'}`}>{order.taxCategory || 'GST 18%'}</span>
          </div>
        </div>

        {/* Card 2: Delivery & Timeline */}
        <div className={`p-5 rounded-3xl border transition-all ${
          isDarkMode ? 'bg-slate-900/70 border-slate-800/80' : 'bg-white border-slate-200 shadow-xs'
        }`}>
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] text-slate-400 uppercase font-bold tracking-wider">Delivery Target</span>
            <div className="p-2 rounded-xl bg-amber-500/15 text-amber-500">
              <Calendar className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl font-bold text-amber-600 dark:text-amber-400 tracking-tight">
            {order.deliveryDate || '—'}
          </div>
          <div className="mt-2 flex items-center justify-between text-[11px] text-slate-400 pt-2 border-t border-slate-100 dark:border-slate-800">
            <span>PO Raised:</span>
            <span className={`font-bold ${isDarkMode ? 'text-slate-200' : 'text-slate-800'}`}>{order.poDate || '—'}</span>
          </div>
        </div>

        {/* Card 3: Quality & Heat Traceability */}
        <div className={`p-5 rounded-3xl border transition-all ${
          isDarkMode ? 'bg-slate-900/70 border-slate-800/80' : 'bg-white border-slate-200 shadow-xs'
        }`}>
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] text-slate-400 uppercase font-bold tracking-wider">Trace & QA Gate</span>
            <div className={`p-2 rounded-xl ${
              isQcRejected ? 'bg-rose-500/15 text-rose-500' : isQcHold || hasNcr ? 'bg-amber-500/15 text-amber-500' : 'bg-blue-500/15 text-blue-500'
            }`}>
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="text-sm font-bold truncate">
            {order.heatLotNumber ? (
              <span className="text-amber-500 font-bold">{order.heatLotNumber}</span>
            ) : (
              <span className="text-slate-400 font-normal">Pending Issue</span>
            )}
          </div>
          <div className="mt-2 flex items-center justify-between text-[11px] text-slate-400 pt-2 border-t border-slate-100 dark:border-slate-800">
            <span>QA Status:</span>
            <span className={`font-bold ${isQcRejected ? 'text-rose-500' : isQcHold || hasNcr ? 'text-amber-500' : 'text-emerald-500'}`}>
              {isQcRejected ? 'Rejected' : isQcHold || hasNcr ? 'Hold' : 'Cleared'}
            </span>
          </div>
        </div>

        {/* Card 4: Fulfillment Progress */}
        <div className={`p-5 rounded-3xl border transition-all ${
          isDarkMode ? 'bg-slate-900/70 border-slate-800/80' : 'bg-white border-slate-200 shadow-xs'
        }`}>
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] text-slate-400 uppercase font-bold tracking-wider">Dispatched / Total</span>
            <div className="p-2 rounded-xl bg-purple-500/15 text-purple-500">
              <Package className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl font-bold text-indigo-600 dark:text-indigo-400 tracking-tight">
            {totalDispatchedQty} / {totalOrderedQty} <span className="text-xs font-normal text-slate-400">units</span>
          </div>
          <div className="mt-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            <div className="w-full bg-slate-200 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
              <div 
                className="bg-gradient-to-r from-[#5B75F8] to-emerald-500 h-full rounded-full transition-all duration-500" 
                style={{ width: `${fulfillmentPercentage}%` }}
              />
            </div>
          </div>
        </div>

      </div>

      {/* 4. Client PO Document & Special Instructions Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 font-mono text-xs">
        
        <div className={`p-5 rounded-3xl border flex items-center justify-between gap-3 ${
          isDarkMode ? 'bg-slate-900/70 border-slate-800/80 text-white' : 'bg-white border-slate-200 text-slate-900 shadow-xs'
        }`}>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-[#5B75F8]/20 text-[#7B92FF]">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <span className="font-bold block text-sm font-sans">Client PO Document</span>
              <span className="text-slate-400 text-[11px] block mt-0.5">{poFileName ? poFileName : 'No document attached yet'}</span>
            </div>
          </div>
          <button
            onClick={() => setShowUploadModal(true)}
            className="px-3.5 py-1.5 rounded-xl border border-[#5B75F8]/30 bg-[#5B75F8]/10 text-[#5B75F8] dark:text-[#7B92FF] font-bold hover:bg-[#5B75F8]/20 cursor-pointer text-xs flex items-center gap-1.5 transition-all"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Upload</span>
          </button>
        </div>

        <div className={`p-5 rounded-3xl border flex items-center gap-3 ${
          isDarkMode ? 'bg-slate-900/70 border-slate-800/80 text-white' : 'bg-white border-slate-200 text-slate-900 shadow-xs'
        }`}>
          <div className="p-2.5 rounded-2xl bg-amber-500/20 text-amber-400">
            <Tag className="w-5 h-5" />
          </div>
          <div className="overflow-hidden">
            <span className="font-bold block text-sm font-sans">Special Instructions</span>
            <span className={`text-[11px] block mt-0.5 truncate ${isDarkMode ? 'text-slate-300' : 'text-slate-600'}`}>
              {order.remark || 'No special order notes recorded.'}
            </span>
          </div>
        </div>

      </div>

      {/* 5. LINE ITEMS TABLE */}
      <div className={`p-6 rounded-3xl border space-y-4 font-mono text-xs transition-all shadow-lg ${
        isDarkMode ? 'bg-slate-900/80 border-slate-800/80 backdrop-blur-xl text-white' : 'bg-white border-slate-200 text-slate-900 shadow-xs'
      }`}>
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
          <h3 className="font-bold uppercase tracking-wider text-[#5B75F8] dark:text-[#7B92FF] text-sm flex items-center gap-2">
            <Package className="w-4 h-4" />
            <span>Order Line Items ({order.lines?.length || 0})</span>
          </h3>
          <span className="text-slate-400 text-xs">Gross Line Total: ₹{order.grossAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className={`border-b text-[10px] font-bold uppercase tracking-wider ${
                isDarkMode ? 'text-slate-400 border-slate-800' : 'text-slate-500 border-slate-200'
              }`}>
                <th className="py-3 px-4">#</th>
                <th className="py-3 px-4">Item Code & Description</th>
                <th className="py-3 px-4">Customer Part #</th>
                <th className="py-3 px-4 text-right">Order Qty</th>
                <th className="py-3 px-4 text-right">Dispatched</th>
                <th className="py-3 px-4 text-right">Pending</th>
                <th className="py-3 px-4 text-right">Unit Rate</th>
                <th className="py-3 px-4 text-right">Total ₹</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800/60">
              {order.lines.map((ln, idx) => (
                <tr key={ln.id} className={isDarkMode ? 'hover:bg-slate-800/40' : 'hover:bg-slate-50'}>
                  <td className="py-3.5 px-4 font-bold text-slate-400">{idx + 1}</td>
                  <td className="py-3.5 px-4 font-bold">
                    <div className="text-[#5B75F8] dark:text-[#7B92FF]">{ln.itemCode}</div>
                    <div className="text-slate-400 text-[11px] font-normal">{ln.itemDescription}</div>
                  </td>
                  <td className="py-3.5 px-4 text-slate-400">{ln.custPartNo || '—'}</td>
                  <td className="py-3.5 px-4 text-right font-bold">{ln.orderQty} {ln.unit}</td>
                  <td className="py-3.5 px-4 text-right text-emerald-500 font-bold">{ln.dispatchedQty}</td>
                  <td className="py-3.5 px-4 text-right text-amber-500 font-bold">{ln.pendingQty}</td>
                  <td className="py-3.5 px-4 text-right font-bold">₹{ln.rate.toFixed(2)}</td>
                  <td className="py-3.5 px-4 text-right font-bold text-emerald-500">₹{(Number(ln.orderQty) * Number(ln.rate)).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md font-sans">
          <div className={`relative w-full max-w-md rounded-3xl border p-6 space-y-4 font-mono text-xs z-10 shadow-2xl ${
            isDarkMode ? 'bg-slate-950 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
          }`}>
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-bold text-sm uppercase text-[#5B75F8] dark:text-[#7B92FF]">Upload Client PO Document</h3>
              <button onClick={() => setShowUploadModal(false)} className="text-slate-400 hover:text-white font-bold cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div>
              <p className="text-xs text-slate-400 mb-3">Upload PDF or image file of the customer purchase order</p>
              <input 
                type="file" 
                onChange={handleFileUpload}
                className="w-full p-3 border border-slate-800 rounded-xl text-xs bg-slate-900 cursor-pointer" 
              />
            </div>
            <div className="pt-2 flex justify-end">
              <button onClick={() => setShowUploadModal(false)} className="px-4 py-2 rounded-xl border border-slate-800 cursor-pointer">Close</button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Order Modal */}
      {showEditModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md font-sans">
          <div className={`relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl border shadow-2xl p-6 transition-all ${
            isDarkMode ? 'bg-slate-900/95 border-slate-800 text-white backdrop-blur-2xl' : 'bg-white border-slate-200 text-slate-900 shadow-2xl'
          }`}>
            <div className={`flex items-center justify-between pb-4 border-b ${isDarkMode ? 'border-slate-800' : 'border-slate-200'}`}>
              <div className="flex items-center gap-3">
                <div className={`p-2.5 rounded-2xl border ${
                  isDarkMode ? 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30' : 'bg-indigo-50 text-indigo-600 border-indigo-200'
                }`}>
                  <Edit3 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className={`font-bold text-base ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                    Edit Purchase Order
                  </h3>
                  <p className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                    Modify Order Spine & Lines for <strong className="text-indigo-400 font-semibold">{order.customerName}</strong>
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setShowEditModal(false)}
                className={`p-2 rounded-2xl border transition-all cursor-pointer ${
                  isDarkMode 
                    ? 'border-slate-800 bg-slate-950/60 text-slate-400 hover:text-white hover:bg-slate-800' 
                    : 'border-slate-200 bg-slate-50 text-slate-500 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Error Banner */}
            {editError && (
              <div className="mt-4 p-3.5 rounded-2xl bg-rose-500/15 border border-rose-500/40 text-rose-400 text-xs flex items-start gap-2.5">
                <AlertTriangle className="w-4 h-4 text-rose-400 mt-0.5 shrink-0" />
                <div>
                  <div className="font-bold font-mono uppercase text-[11px]">Validation Warning</div>
                  <div className="text-[11px] mt-0.5 leading-relaxed">{editError}</div>
                </div>
              </div>
            )}

            <form onSubmit={handleEditSubmit} className="space-y-4 mt-4 text-xs font-sans">
              
              {/* PO Number & Customer Read-Only */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className={`block text-[11px] font-mono font-bold uppercase mb-1 ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                    PO Number *
                  </label>
                  <input
                    type="text"
                    required
                    value={editPoNo}
                    onChange={(e) => setEditPoNo(e.target.value)}
                    className={`w-full p-2.5 rounded-xl border font-mono text-xs outline-none transition-all ${
                      isDarkMode ? 'bg-slate-950/80 border-slate-800 text-white focus:border-indigo-500' : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-indigo-500 focus:bg-white'
                    }`}
                  />
                </div>
                <div>
                  <label className={`block text-[11px] font-mono font-bold uppercase mb-1 ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                    Customer (Master Linked)
                  </label>
                  <input
                    type="text"
                    disabled
                    value={order.customerName}
                    className={`w-full p-2.5 rounded-xl border text-xs outline-none opacity-80 cursor-not-allowed ${
                      isDarkMode ? 'bg-slate-950/40 border-slate-800 text-slate-300' : 'bg-slate-100 border-slate-200 text-slate-700'
                    }`}
                  />
                </div>
              </div>

              {/* Delivery Target & Tax Category */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className={`block text-[11px] font-mono mb-1 ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                    Delivery Target Date
                  </label>
                  <input
                    type="date"
                    value={editDeliveryDate}
                    onChange={(e) => setEditDeliveryDate(e.target.value)}
                    className={`w-full p-2.5 rounded-xl border text-xs font-mono outline-none ${
                      isDarkMode ? 'bg-slate-950/80 border-slate-800 text-white' : 'bg-slate-50 border-slate-200 text-slate-900 focus:bg-white'
                    }`}
                  />
                </div>
                <div>
                  <label className={`block text-[11px] font-mono mb-1 ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                    Tax Category
                  </label>
                  <select
                    value={editTaxCategory}
                    onChange={(e) => setEditTaxCategory(e.target.value)}
                    className={`w-full p-2.5 rounded-xl border text-xs font-mono outline-none cursor-pointer ${
                      isDarkMode ? 'bg-slate-950/80 border-slate-800 text-white' : 'bg-slate-50 border-slate-200 text-slate-900 focus:bg-white'
                    }`}
                  >
                    <option value="GST 18%">GST 18% (Standard Engineering)</option>
                    <option value="GST 12%">GST 12%</option>
                    <option value="GST 28%">GST 28%</option>
                    <option value="GST 5%">GST 5%</option>
                    <option value="GST Exempt 0%">GST Exempt 0%</option>
                  </select>
                </div>
              </div>

              {/* Remarks */}
              <div>
                <label className={`block text-[11px] font-mono mb-1 ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                  Special Instructions / Remark
                </label>
                <input
                  type="text"
                  placeholder="e.g. Expedited delivery for plant overhaul"
                  value={editRemark}
                  onChange={(e) => setEditRemark(e.target.value)}
                  className={`w-full p-2.5 rounded-xl border text-xs outline-none ${
                    isDarkMode ? 'bg-slate-950/80 border-slate-800 text-white' : 'bg-slate-50 border-slate-200 text-slate-900 focus:bg-white'
                  }`}
                />
              </div>

              {/* Change Reason for Audit History */}
              <div>
                <label className={`block text-[11px] font-mono mb-1 ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                  Revision Note / Change Reason (Version Bump: v{order.version || 1} ➔ v{(order.version || 1) + 1})
                </label>
                <input
                  type="text"
                  placeholder="e.g. Customer requested amendment in quantity and delivery timeline"
                  value={editChangeReason}
                  onChange={(e) => setEditChangeReason(e.target.value)}
                  className={`w-full p-2.5 rounded-xl border text-xs outline-none ${
                    isDarkMode ? 'bg-slate-950/80 border-slate-800 text-white' : 'bg-slate-50 border-slate-200 text-slate-900 focus:bg-white'
                  }`}
                />
              </div>

              {/* Line Items */}
              <div className={`p-3.5 rounded-2xl border space-y-2 ${
                isDarkMode ? 'bg-slate-800/40 border-slate-700/60' : 'bg-slate-50 border-slate-200'
              }`}>
                <div className="flex items-center justify-between">
                  <span className={`font-bold font-mono text-xs ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>Order Line Items</span>
                  <button
                    type="button"
                    onClick={addEditLineItem}
                    className="px-2.5 py-1 rounded-xl bg-indigo-500/20 text-indigo-600 dark:text-indigo-300 text-xs font-mono cursor-pointer font-bold hover:bg-indigo-500/30 flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Item</span>
                  </button>
                </div>

                {editLines.map((line, idx) => (
                  <div key={line.id || idx} className={`p-3 rounded-xl border space-y-2 ${
                    isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-xs'
                  }`}>
                    <div className="grid grid-cols-3 gap-2">
                      <input
                        type="text"
                        placeholder="Item Code"
                        value={line.itemCode}
                        onChange={(e) => updateEditLineItem(idx, 'itemCode', e.target.value)}
                        className={`p-2 rounded-lg border font-mono text-xs outline-none ${
                          isDarkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-900 focus:bg-white'
                        }`}
                      />
                      <input
                        type="text"
                        placeholder="Description"
                        value={line.itemDescription}
                        onChange={(e) => updateEditLineItem(idx, 'itemDescription', e.target.value)}
                        className={`col-span-2 p-2 rounded-lg border text-xs outline-none ${
                          isDarkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-900 focus:bg-white'
                        }`}
                      />
                    </div>
                    <div className="grid grid-cols-4 gap-2">
                      <div>
                        <label className={`text-[9px] font-mono ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Cust Part#</label>
                        <input
                          type="text"
                          value={line.custPartNo || ''}
                          onChange={(e) => updateEditLineItem(idx, 'custPartNo', e.target.value)}
                          className={`w-full p-1.5 rounded-lg border font-mono text-xs outline-none ${
                            isDarkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-900 focus:bg-white'
                          }`}
                        />
                      </div>
                      <div>
                        <label className={`text-[9px] font-mono ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Qty ({line.unit || 'NOS'})</label>
                        <input
                          type="number"
                          value={line.orderQty}
                          onChange={(e) => updateEditLineItem(idx, 'orderQty', Number(e.target.value))}
                          className={`w-full p-1.5 rounded-lg border font-mono font-bold text-xs outline-none ${
                            isDarkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-900 focus:bg-white'
                          }`}
                        />
                      </div>
                      <div>
                        <label className={`text-[9px] font-mono ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Unit Rate ₹</label>
                        <input
                          type="number"
                          value={line.rate}
                          onChange={(e) => updateEditLineItem(idx, 'rate', Number(e.target.value))}
                          className={`w-full p-1.5 rounded-lg border font-mono text-xs outline-none ${
                            isDarkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-900 focus:bg-white'
                          }`}
                        />
                      </div>
                      <div className="flex items-center justify-between pt-3">
                        <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400 text-xs">
                          ₹{(Number(line.orderQty) * Number(line.rate)).toLocaleString('en-IN')}
                        </span>
                        {editLines.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeEditLineItem(idx)}
                            className="text-rose-500 text-xs hover:underline cursor-pointer font-medium"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Total & Submit */}
              <div className={`flex items-center justify-between p-3 rounded-xl font-mono border ${
                isDarkMode ? 'bg-slate-950 border-slate-800' : 'bg-slate-100 border-slate-200'
              }`}>
                <span className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>Calculated Total:</span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400 text-sm">
                  ₹{editTotalGross.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
              </div>

              <div className={`flex justify-end gap-3 pt-3 border-t ${isDarkMode ? 'border-slate-800' : 'border-slate-200'}`}>
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className={`px-4 py-2 rounded-xl text-xs font-mono font-bold cursor-pointer transition-all ${
                    isDarkMode ? 'text-slate-400 hover:text-white' : 'border border-slate-200 text-slate-600 hover:bg-slate-100 text-slate-700'
                  }`}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-blue-600 hover:to-indigo-600 text-white font-bold text-xs font-mono shadow-lg cursor-pointer transition-all hover:scale-[1.02] active:scale-[0.98] flex items-center gap-1.5"
                >
                  <Save className="w-4 h-4" />
                  <span>Save Changes</span>
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* Proof of Delivery (POD) Hard Gate Modal */}
      {showPodModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md font-sans">
          <div className={`relative w-full max-w-lg rounded-3xl border p-6 space-y-4 font-mono text-xs z-10 shadow-2xl ${
            isDarkMode ? 'bg-slate-950 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
          }`}>
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm uppercase text-emerald-400">Attach Proof of Delivery (POD)</h3>
                  <p className="text-[11px] text-slate-400">PRD Hard Gate: Mandatory verification before mark as Delivered</p>
                </div>
              </div>
              <button onClick={() => setShowPodModal(false)} className="text-slate-400 hover:text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            {podError && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs">
                {podError}
              </div>
            )}

            <div className="space-y-3">
              <div>
                <label className="block text-[11px] text-slate-400 font-bold uppercase mb-1">
                  POD Document URL or File Name *
                </label>
                <input 
                  type="text" 
                  placeholder="e.g. https://storage.guruom.in/pod/POD-2026-0816.pdf or signed-pod-scan.pdf"
                  value={podDocUrl}
                  onChange={(e) => setPodDocUrl(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-800 bg-slate-900 text-white text-xs outline-none focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] text-slate-400 font-bold uppercase mb-1">
                    Received By (Customer Rep) *
                  </label>
                  <input 
                    type="text" 
                    placeholder="e.g. Ramesh Kumar (Store Incharge)"
                    value={podReceivedBy}
                    onChange={(e) => setPodReceivedBy(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-800 bg-slate-900 text-white text-xs outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-400 font-bold uppercase mb-1">
                    Delivery Date
                  </label>
                  <input 
                    type="date" 
                    value={podDate}
                    onChange={(e) => setPodDate(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-800 bg-slate-900 text-white text-xs outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] text-slate-400 font-bold uppercase mb-1">
                  Transporter / Vehicle No
                </label>
                <input 
                  type="text" 
                  placeholder="e.g. VRL Logistics / MH-12-AB-1234"
                  value={podCarrier}
                  onChange={(e) => setPodCarrier(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-800 bg-slate-900 text-white text-xs outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            <div className="pt-3 flex justify-end gap-2.5 border-t border-slate-800">
              <button 
                onClick={() => setShowPodModal(false)} 
                className="px-4 py-2 rounded-xl border border-slate-800 text-slate-400 hover:text-white cursor-pointer"
              >
                Cancel
              </button>
              <button 
                onClick={handleSavePodDelivery}
                className="px-5 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-bold cursor-pointer hover:from-teal-600 hover:to-emerald-600 shadow-lg shadow-emerald-500/25"
              >
                Verify & Confirm Delivery
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Payment Recording & Settle Hard Gate Modal */}
      {showPaymentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md font-sans">
          <div className={`relative w-full max-w-lg rounded-3xl border p-6 space-y-4 font-mono text-xs z-10 shadow-2xl ${
            isDarkMode ? 'bg-slate-950 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
          }`}>
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400">
                  <CreditCard className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm uppercase text-amber-400">Record Commercial Payment</h3>
                  <p className="text-[11px] text-slate-400">PRD Hard Gate: Full payment required for Order Closure</p>
                </div>
              </div>
              <button onClick={() => setShowPaymentModal(false)} className="text-slate-400 hover:text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            {paymentError && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs">
                {paymentError}
              </div>
            )}

            <div className="p-3 rounded-2xl bg-slate-900 border border-slate-800 space-y-1.5">
              <div className="flex justify-between">
                <span className="text-slate-400">Gross Invoice Amount:</span>
                <span className="font-bold text-white">₹{gross.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Already Received:</span>
                <span className="font-bold text-emerald-400">₹{currentPaid.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between pt-1 border-t border-slate-800 font-bold">
                <span className="text-amber-400">Outstanding Balance:</span>
                <span className="text-amber-400">₹{remainingOutstanding.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              </div>
            </div>

            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] text-slate-400 font-bold uppercase mb-1">
                    Payment Amount ₹ *
                  </label>
                  <input 
                    type="number" 
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(Number(e.target.value))}
                    className="w-full p-2.5 rounded-xl border border-slate-800 bg-slate-900 text-white font-bold text-xs outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-400 font-bold uppercase mb-1">
                    Payment Mode
                  </label>
                  <select
                    value={paymentMode}
                    onChange={(e) => setPaymentMode(e.target.value as any)}
                    className="w-full p-2.5 rounded-xl border border-slate-800 bg-slate-900 text-white text-xs outline-none cursor-pointer"
                  >
                    <option value="NEFT">Bank NEFT</option>
                    <option value="RTGS">Bank RTGS</option>
                    <option value="UPI">UPI Direct</option>
                    <option value="CHEQUE">Cheque / DD</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] text-slate-400 font-bold uppercase mb-1">
                    Reference / UTR No *
                  </label>
                  <input 
                    type="text" 
                    value={paymentRefNo}
                    onChange={(e) => setPaymentRefNo(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-800 bg-slate-900 text-white text-xs outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-400 font-bold uppercase mb-1">
                    Received Date
                  </label>
                  <input 
                    type="date" 
                    value={paymentDate}
                    onChange={(e) => setPaymentDate(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-800 bg-slate-900 text-white text-xs outline-none focus:border-amber-500"
                  />
                </div>
              </div>
            </div>

            <div className="pt-3 flex justify-end gap-2.5 border-t border-slate-800">
              <button 
                onClick={() => setShowPaymentModal(false)} 
                className="px-4 py-2 rounded-xl border border-slate-800 text-slate-400 hover:text-white cursor-pointer"
              >
                Cancel
              </button>
              <button 
                onClick={handleSavePayment}
                className="px-5 py-2 rounded-xl bg-gradient-to-r from-amber-600 to-emerald-600 text-white font-bold cursor-pointer hover:from-emerald-600 hover:to-amber-600 shadow-lg shadow-amber-500/25"
              >
                Record Payment
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default OrderDetailView;
