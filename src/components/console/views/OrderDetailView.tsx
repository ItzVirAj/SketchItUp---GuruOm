import React, { useState, useEffect, useRef, useMemo } from 'react';
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
  ShieldAlert,
  Flame,
  Zap,
  Sparkles,
  CheckCircle,
  AlertCircle,
  Receipt,
  CheckSquare,
  Square,
  ClipboardCheck,
  Loader2,
  Eye,
  ExternalLink
} from 'lucide-react';
import { CustomerOrder, OrderStatus, QCInspection, PDIInspection, OrderLineItem, UserRole, VendorMaster, DispatchChallan, CustomerInvoice, OrderLineProgress } from '../../../types/console';
import { isRoleAuthorizedForCta, getCtaPermission, CtaId, normalizeRole } from '../../../utils/rbacMatrix';
import { useCtaPermission } from '../../../hooks/useCtaPermission';
import { executeOrderStageTransition, validatePodRequired, validateOrderClosure, normalizeOrderState, CanonicalOrderState } from '../../../utils/orderStateMachine';
import { runMaterialCheckForOrder, overrideMaterialCheckForOrder } from '../../../services/supabaseServices';
import { getCurrentFinancialYear, formatDocumentNumber } from '../../../utils/statutoryAccountingEngine';
import { ChallanDetailModal } from '../modals/ChallanDetailModal';
import { useUrlModal } from '../../../hooks/useUrlModal';
import { LineItemProgressBadge } from '../LineItemProgressBadge';
import { OrderClosureSummaryCard } from '../OrderClosureSummaryCard';

interface OrderDetailViewProps {
  order: CustomerOrder;
  qcQueue?: QCInspection[];
  pdiQueue?: PDIInspection[];
  dispatches?: DispatchChallan[];
  invoices?: CustomerInvoice[];
  vendors?: VendorMaster[];
  isDarkMode: boolean;
  currentRole?: UserRole | string;
  currentUser?: any;
  onBack: () => void;
  onNavigate?: (view: string) => void;
  onConfirmOrder?: (orderId: string) => Promise<any> | void;
  onUpdateOrder?: (orderId: string, updates: Partial<CustomerOrder>) => void;
  onNavigateToCreateJobCard?: (orderPo: string) => void;
  onCancelOrder?: (orderId: string) => void;
  onNavigateToPDI?: (orderPo?: string, jobNo?: string) => void;
  onNavigateToDispatch?: () => void;
  onNavigateToCreateInvoice?: (orderPo: string, challanNo?: string) => void;
  onCompletePDI?: (orderId: string, payload: any) => Promise<any> | void;
  onGenerateInvoice?: (orderId: string, invoiceData: any) => Promise<any> | void;
  onGenerateChallan?: (orderId: string, challanData: any) => Promise<any> | void;
  onUpdateChallan?: (challanNo: string, updates: any) => Promise<any>;
  onCancelChallan?: (challanNo: string, reason?: string) => Promise<void>;
  onMarkDispatched?: (orderId: string, dispatchData: any) => Promise<any> | void;
  onMarkDelivered?: (orderId: string, deliveryData: any) => Promise<any> | void;
  onMarkDelayed?: (orderId: string, delayData: { reason?: string; followUpDate?: string }) => Promise<any> | void;
  onRecordPayment?: (orderId: string, paymentData: any) => Promise<any> | void;
}

export const OrderDetailView: React.FC<OrderDetailViewProps> = ({
  order,
  qcQueue = [],
  pdiQueue = [],
  dispatches = [],
  invoices = [],
  vendors = [],
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
  onNavigateToDispatch,
  onNavigateToCreateInvoice,
  onCompletePDI,
  onGenerateInvoice,
  onGenerateChallan,
  onUpdateChallan,
  onCancelChallan,
  onMarkDispatched,
  onMarkDelivered,
  onMarkDelayed,
  onRecordPayment
}) => {
  // URL-driven modal hooks
  const uploadPoModal = useUrlModal('upload-po');
  const editOrderModal = useUrlModal('edit-order');
  const podModal = useUrlModal('upload-pod');
  const paymentModal = useUrlModal('record-payment');
  const pdiModal = useUrlModal('pdi-inspection');
  const invoiceModal = useUrlModal('generate-invoice');
  const challanModal = useUrlModal('generate-challan');
  const dispatchModal = useUrlModal('mark-dispatched');
  const deliveryModal = useUrlModal('mark-delivered');
  const delayedModal = useUrlModal('mark-delayed');
  const challanDetailModal = useUrlModal('challan-detail');
  const overrideModal = useUrlModal('material-override');

  // Permissions for CTAs (rules-of-hooks: declared unconditionally at top level)
  const allowedDelivered = useCtaPermission('MARK_DELIVERED') || useCtaPermission('ORDER_RECEIVED');
  const canMarkDelayed = useCtaPermission('MARK_DELAYED');
  const canMarkOrderClosed = useCtaPermission('MARK_ORDER_CLOSED');
  const canUploadPdiReport = useCtaPermission('UPLOAD_PDI_REPORT');

  const [selectedChallanDetail, setSelectedChallanDetail] = useState<DispatchChallan | null>(null);

  // Sync Challan Detail from URL
  useEffect(() => {
    if (challanDetailModal.isOpen && challanDetailModal.params.challanNo) {
      const found = dispatches.find(d => d.challanNo === challanDetailModal.params.challanNo || d.id === challanDetailModal.params.challanNo);
      if (found) setSelectedChallanDetail(found);
    }
  }, [challanDetailModal.isOpen, challanDetailModal.params.challanNo, dispatches]);

  const [poFileName, setPoFileName] = useState<string | null>(order.clientPoFile || null);
  const [isConfirming, setIsConfirming] = useState(false);
  const [confirmError, setConfirmError] = useState<string | null>(null);

  // Material Availability & Override States
  const [isRunningMaterialCheck, setIsRunningMaterialCheck] = useState(false);
  const [showOverrideModal, setShowOverrideModal] = useState(false);
  const [overrideReason, setOverrideReason] = useState('');
  const [overrideError, setOverrideError] = useState<string | null>(null);
  const [materialCheckFeedback, setMaterialCheckFeedback] = useState<{
    ready: boolean;
    shortages?: any[];
    message?: string;
  } | null>(null);

  // Transporter options from Vendor Master (Vendor Type: Transporter)
  const transporterVendors = (vendors || []).filter(v => (v.vendorType || '').toLowerCase().includes('transporter'));
  const defaultTransporterNames = ['VRL Logistics Ltd', 'SafeXpress Logistics', 'TCI Freight', 'Blue Dart Express', 'Direct Factory Delivery'];
  const allTransporterOptions = transporterVendors.length > 0 ? transporterVendors.map(v => v.name) : defaultTransporterNames;

  // 1. PDI Inspection Modal State
  const totalOrderQty = (order.lines || []).reduce((sum, l) => sum + Number(l.orderQty || 0), 0);
  const [pdiAcceptedQty, setPdiAcceptedQty] = useState<number>(totalOrderQty || 100);
  const [pdiRejectedQty, setPdiRejectedQty] = useState<number>(0);
  const [pdiRemarks, setPdiRemarks] = useState('');
  const [pdiReportUrl, setPdiReportUrl] = useState('');
  const [pdiChecklist, setPdiChecklist] = useState<Record<string, boolean>>({
    visualFinish: true,
    dimensionalAudit: true,
    gaugesChecked: true,
    packagingRustProof: true
  });
  const [pdiError, setPdiError] = useState<string | null>(null);

  // 2. Invoice Generation Modal State
  const [genInvoiceNo, setGenInvoiceNo] = useState(order.invoiceNo || formatDocumentNumber('INV', getCurrentFinancialYear(), Math.floor(1000 + Math.random() * 8999)));
  const [genInvoiceDate, setGenInvoiceDate] = useState(new Date().toISOString().split('T')[0]);

  // 3. Delivery Challan Modal State
  const [genChallanNo, setGenChallanNo] = useState(order.deliveryChallanNo || formatDocumentNumber('CHL', getCurrentFinancialYear(), Math.floor(1000 + Math.random() * 8999)));
  const [challanTransporter, setChallanTransporter] = useState(order.transporterName || allTransporterOptions[0]);
  const [challanVehicleNo, setChallanVehicleNo] = useState('MH 12 AB 4589');
  const [challanDriverContact, setChallanDriverContact] = useState('+91 98765 43210');
  const [challanRemarks, setChallanRemarks] = useState('Standard delivery with batch test certificate attached');

  // 4. Dispatch Modal State
  const [dispatchDate, setDispatchDate] = useState(new Date().toISOString().split('T')[0]);
  const [dispatchTransporter, setDispatchTransporter] = useState(order.transporterName || allTransporterOptions[0]);
  const [dispatchVehicleNo, setDispatchVehicleNo] = useState(challanVehicleNo || 'MH 12 AB 4589');
  const [dispatchLrNo, setDispatchLrNo] = useState(`LR-${Math.floor(100000 + Math.random() * 900000)}`);
  const [dispatchDriverContact, setDispatchDriverContact] = useState('+91 98765 43210');
  const [dispatchRemarks, setDispatchRemarks] = useState('');

  // 5. Delivery Modal State
  const podFileInputRef = useRef<HTMLInputElement>(null);
  const [deliveryDate, setDeliveryDate] = useState(new Date().toISOString().split('T')[0]);
  const [deliveryReceivedBy, setDeliveryReceivedBy] = useState(order.podReceivedBy || 'Stores Gate Security');
  const [deliveryRemarks, setDeliveryRemarks] = useState('Consignment received in intact condition');
  const [deliveryPodUrl, setDeliveryPodUrl] = useState(order.podDocumentUrl || '');

  // 6. POD Form State (PRD v1.0 Hard Gate)
  const [podDocUrl, setPodDocUrl] = useState(order.podDocumentUrl || '');
  const [podCarrier, setPodCarrier] = useState(order.transporterName || '');
  const [podReceivedBy, setPodReceivedBy] = useState(order.podReceivedBy || '');
  const [podDate, setPodDate] = useState(order.podReceivedDate || new Date().toISOString().split('T')[0]);
  const [podError, setPodError] = useState<string | null>(null);

  // 6b. Delayed Form State (Part 3: DELIVERY_DELAYED)
  const [delayedReason, setDelayedReason] = useState('Consignment delayed — delivery rescheduled');
  const [delayedFollowUpDate, setDelayedFollowUpDate] = useState(
    new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  );
  const [delayedError, setDelayedError] = useState<string | null>(null);

  const linkedDispatches = (dispatches || []).filter(d =>
    (d.orderPo && ((order.poNo && d.orderPo.trim().toUpperCase() === order.poNo.trim().toUpperCase()) || (order.id && d.orderPo.trim().toUpperCase() === order.id.trim().toUpperCase()))) ||
    (order.deliveryChallanNo && d.challanNo && d.challanNo.trim().toUpperCase() === order.deliveryChallanNo.trim().toUpperCase())
  );

  const latestDispatch = linkedDispatches[linkedDispatches.length - 1];
  const effectiveChallanNo = order.deliveryChallanNo || latestDispatch?.challanNo || null;
  const isDispatched = ['DISPATCHED', 'IN_TRANSIT', 'DELIVERED', 'CLOSED', 'PAID'].includes((order.status || order.stage || '').toUpperCase()) || latestDispatch?.status === 'DISPATCHED';

  const linkedInvoices = (invoices || []).filter(inv =>
    (inv.orderPo && ((order.poNo && inv.orderPo.trim().toUpperCase() === order.poNo.trim().toUpperCase()) || (order.id && inv.orderPo.trim().toUpperCase() === order.id.trim().toUpperCase()))) ||
    (inv.poNo && ((order.poNo && inv.poNo.trim().toUpperCase() === order.poNo.trim().toUpperCase()) || (order.id && inv.poNo.trim().toUpperCase() === order.id.trim().toUpperCase()))) ||
    (effectiveChallanNo && (inv as any).challanNo && (inv as any).challanNo.trim().toUpperCase() === effectiveChallanNo.trim().toUpperCase()) ||
    (order.deliveryChallanNo && (inv as any).challanNo && (inv as any).challanNo.trim().toUpperCase() === order.deliveryChallanNo.trim().toUpperCase()) ||
    (order.invoiceNo && (inv.invoiceNo === order.invoiceNo || inv.id === order.invoiceNo)) ||
    (effectiveChallanNo && (inv as any).dispatchNo && (inv as any).dispatchNo.trim().toUpperCase() === effectiveChallanNo.trim().toUpperCase()) ||
    (order.dispatchNo && (inv as any).dispatchNo && (inv as any).dispatchNo.trim().toUpperCase() === order.dispatchNo.trim().toUpperCase())
  );

  const latestInvoice = linkedInvoices[linkedInvoices.length - 1];
  const effectiveInvoiceNo = order.invoiceNo || (latestDispatch as any)?.invoiceNo || latestInvoice?.invoiceNo || null;

  // 7. Payment Form State (PRD v1.0 Hard Gate)
  const gross = Number(latestInvoice?.totalAmount || order.grossAmount || (order.lines || []).reduce((sum, l) => sum + (Number(l.orderQty || 0) * Number(l.rate || 0)), 0));
  const currentPaid = Number(latestInvoice?.paidAmount !== undefined ? latestInvoice.paidAmount : (order.paidAmount || 0));
  const remainingOutstanding = Number(latestInvoice?.balanceAmount !== undefined ? latestInvoice.balanceAmount : Math.max(0, gross - currentPaid));
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
  const [isUnmatchedBannerDismissed, setIsUnmatchedBannerDismissed] = useState(false);

  const editTotalGross = editLines.reduce((sum, l) => sum + (Number(l.orderQty || 0) * Number(l.rate || 0)), 0);

  const hasJobCards = (order.jobCards && order.jobCards.length > 0) || ['IN_PRODUCTION', 'QC_INSPECTION', 'READY_TO_DISPATCH', 'DISPATCHED'].includes(order.status || '');
  const isOwner = normalizeRole(currentRole) === 'ADMIN_OWNER' || String(currentRole).toUpperCase().includes('OWNER') || String(currentRole).toUpperCase().includes('ADMIN');

  const openEditModal = () => {
    setEditPoNo(order.poNo || '');
    setEditDeliveryDate(order.deliveryDate || '');
    setEditTaxCategory(order.taxCategory || 'GST 18%');
    setEditRemark(order.remark || '');
    setEditChangeReason('');
    setEditLines(order.lines ? [...order.lines.map(l => ({ ...l }))] : []);
    setEditError(null);
    editOrderModal.open();
  };

  // 8-Stage Order Lifecycle: Confirmed -> Production -> QC/PDI -> Invoice & Challan -> Dispatched -> Delivered -> Receivable -> Closed
  const steps = [
    { name: 'Confirmed', subtitle: 'Order Approved', key: 0, icon: CheckCircle2, stageMatch: ['DRAFT', 'SUBMITTED', 'PO_RECEIVED', 'CONFIRMED', 'APPROVED', 'RELEASED'] },
    { name: 'Production', subtitle: 'Job Cards & Machining', key: 1, icon: Package, stageMatch: ['MATERIAL_CHECKED', 'MATERIAL_CHECK', 'MATERIAL_READY', 'MATERIAL_VERIFIED', 'MATERIAL_SHORT', 'MATERIAL_SHORTAGE', 'PROCUREMENT_PENDING', 'GRN', 'PO_SENT', 'GRN_RECEIVED', 'JOB_RELEASED', 'MATERIAL_ISSUED', 'IN_PRODUCTION', 'WITH_SUBCONTRACTOR', 'REWORK'] },
    { name: 'QC / PDI', subtitle: 'Compliance & Audit', key: 2, icon: ShieldCheck, stageMatch: ['READY_FOR_QC', 'QC', 'QC_INSPECTION', 'QC_HOLD', 'QC_REPORT_UPLOADED', 'PDI', 'PDI_HOLD'] },
    { name: 'Invoice & Challan', subtitle: 'Dispatch Prep', key: 3, icon: FileText, stageMatch: ['PDI_COMPLETE', 'READY_FOR_DISPATCH', 'READY_TO_DISPATCH', 'INVOICE_GENERATED', 'DISPATCH_READY'] },
    { name: 'Dispatched', subtitle: 'Shipped to Customer', key: 4, icon: Truck, stageMatch: ['PARTIALLY_DISPATCHED', 'DISPATCHED', 'IN_TRANSIT', 'DELIVERY_DELAYED'] },
    { name: 'Delivered', subtitle: 'Goods Received', key: 5, icon: CheckCircle2, stageMatch: ['DELIVERED'] },
    { name: 'Receivable', subtitle: 'Payment Pending', key: 6, icon: DollarSign, stageMatch: ['PAYMENT_PENDING', 'INVOICED'] },
    { name: 'Closed', subtitle: 'Order Settled', key: 7, icon: CheckCircle, stageMatch: ['COMPLETED', 'CLOSED', 'PAID'] }
  ];

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setPoFileName(e.target.files[0].name);
      uploadPoModal.close();
    }
  };

  const linkedPdi = (pdiQueue || []).filter(p =>
    (p.orderPo && ((order.poNo && p.orderPo.trim().toUpperCase() === order.poNo.trim().toUpperCase()) || (order.id && p.orderPo.trim().toUpperCase() === order.id.trim().toUpperCase()))) ||
    (order.jobCards && order.jobCards.some(j => j.jobNo && j.jobNo.trim().toUpperCase() === (p.jobNo || '').trim().toUpperCase()))
  );

  const isPdiPassed = (linkedPdi.length > 0 && linkedPdi.every(p => p.pdiStatus === 'PASS')) ||
    ['PDI_COMPLETE', 'READY_FOR_DISPATCH', 'READY_TO_DISPATCH', 'INVOICE_GENERATED', 'DISPATCH_READY', 'PARTIALLY_DISPATCHED', 'DISPATCHED', 'IN_TRANSIT', 'DELIVERED', 'CLOSED', 'PAID'].includes((order.status || order.stage || '').toUpperCase()) ||
    Boolean(effectiveChallanNo);

  const linkedQc = (qcQueue || []).filter(q =>
    (q.orderPo && (q.orderPo.trim().toUpperCase() === (order.poNo || '').trim().toUpperCase() || q.orderPo.trim().toUpperCase() === (order.id || '').trim().toUpperCase())) ||
    (order.jobCards && order.jobCards.some(j => j.jobNo && j.jobNo.trim().toUpperCase() === (q.jobNo || '').trim().toUpperCase()))
  );

  const isQcRejected = linkedQc.some(q => q.qcStatus === 'REJECTED');
  const isQcHold = linkedQc.some(q => q.qcStatus === 'QC_HOLD');
  const allQcPassed = (linkedQc.length > 0 && linkedQc.every(q => q.qcStatus === 'PASS' || q.qcStatus === 'PASSED')) ||
    ['QC_INSPECTION', 'QC_PASS', 'QC_PASSED', 'QC_COMPLETE', 'PDI', 'PDI_HOLD', 'PDI_COMPLETE', 'READY_TO_DISPATCH', 'READY_FOR_DISPATCH', 'DISPATCHED', 'IN_TRANSIT', 'DELIVERED', 'INVOICED', 'CLOSED'].includes((order.status || order.stage || '').toUpperCase()) ||
    Boolean(isPdiPassed);
  const hasNcr = order.hasOpenNcr || isQcRejected || isQcHold;

  const lineProgress: OrderLineProgress[] = useMemo(() => {
    const relevantDispatches = (dispatches && dispatches.length > 0 ? linkedDispatches : (order.dispatches || []));
    const invStatus = order.paymentStatus || (order as any).invoiceStatus || latestInvoice?.status || null;

    return (order.lines || []).map((line) => {
      const lineJobCards = (order.jobCards || []).filter(
        j => j.partCode && j.partCode.trim().toUpperCase() === line.itemCode.trim().toUpperCase()
      );
      const jcTotal = lineJobCards.length;
      const jcCompleted = lineJobCards.filter(
        j => (j.status || '').toUpperCase() === 'COMPLETED'
      ).length;

      const lineQc = (qcQueue || []).filter(q =>
        ((q.orderPo && (
          (order.poNo && q.orderPo.trim().toUpperCase() === order.poNo.trim().toUpperCase()) ||
          (order.id && q.orderPo.trim().toUpperCase() === order.id.trim().toUpperCase())
        )) || (order.jobCards && order.jobCards.some(j => j.jobNo && j.jobNo.trim().toUpperCase() === (q.jobNo || '').trim().toUpperCase()))) &&
        q.partCode && q.partCode.trim().toUpperCase() === line.itemCode.trim().toUpperCase()
      );
      const qcStatus = lineQc.length > 0 ? (lineQc[lineQc.length - 1].qcStatus || null) : null;

      const linePdi = (pdiQueue || []).filter(p =>
        ((p.orderPo && (
          (order.poNo && p.orderPo.trim().toUpperCase() === order.poNo.trim().toUpperCase()) ||
          (order.id && p.orderPo.trim().toUpperCase() === order.id.trim().toUpperCase())
        )) || (order.jobCards && order.jobCards.some(j => j.jobNo && j.jobNo.trim().toUpperCase() === (p.jobNo || '').trim().toUpperCase()))) &&
        p.partCode && p.partCode.trim().toUpperCase() === line.itemCode.trim().toUpperCase()
      );
      const pdiStatus = linePdi.length > 0 ? (linePdi[linePdi.length - 1].pdiStatus || null) : null;

      let lineDispatchedQty = 0;
      for (const d of relevantDispatches) {
        if (d.lines && Array.isArray(d.lines)) {
          for (const dl of d.lines) {
            if (dl.itemCode && dl.itemCode.trim().toUpperCase() === line.itemCode.trim().toUpperCase()) {
              lineDispatchedQty += Number(dl.qty || 0);
            }
          }
        }
      }
      if (lineDispatchedQty === 0 && Number(line.dispatchedQty || 0) > 0) {
        lineDispatchedQty = Number(line.dispatchedQty || 0);
      }

      return {
        itemCode: line.itemCode,
        jcTotal,
        jcCompleted,
        qcStatus,
        pdiStatus,
        dispatchedQty: lineDispatchedQty,
        invoiceStatus: invStatus
      };
    });
  }, [order.lines, order.jobCards, order.poNo, order.id, order.paymentStatus, order.dispatches, qcQueue, pdiQueue, dispatches, linkedDispatches, latestInvoice]);

  // Active step index calculation matching the 8-stage lifecycle
  let activeStepIndex = 0;
  const currentStage = (order.status || order.stage || 'DRAFT').toUpperCase();
  if (['COMPLETED', 'CLOSED'].includes(currentStage)) {
    activeStepIndex = 7;
  } else if (['PAYMENT_PENDING', 'INVOICED'].includes(currentStage) || (['DELIVERED'].includes(currentStage) && (order.paymentStatus === 'PAID' || remainingOutstanding <= 0))) {
    activeStepIndex = 6;
  } else if (['DELIVERED'].includes(currentStage) || Boolean(order.podReceivedDate)) {
    activeStepIndex = (remainingOutstanding <= 0 || order.paymentStatus === 'PAID') ? 6 : 5;
  } else if (isDispatched || ['PARTIALLY_DISPATCHED', 'DISPATCHED', 'IN_TRANSIT', 'DELIVERY_DELAYED'].includes(currentStage)) {
    activeStepIndex = 4;
  } else if (isPdiPassed || ['PDI_COMPLETE', 'READY_FOR_DISPATCH', 'READY_TO_DISPATCH', 'INVOICE_GENERATED', 'DISPATCH_READY'].includes(currentStage)) {
    activeStepIndex = 3;
  } else if (['READY_FOR_QC', 'MANUFACTURING_COMPLETED', 'QC', 'QC_INSPECTION', 'QC_HOLD', 'QC_REPORT_UPLOADED', 'PDI', 'PDI_HOLD'].includes(currentStage)) {
    activeStepIndex = 2;
  } else if (['CONFIRMED', 'APPROVED', 'RELEASED', 'MATERIAL_CHECKED', 'MATERIAL_CHECK', 'MATERIAL_READY', 'MATERIAL_VERIFIED', 'MATERIAL_SHORT', 'MATERIAL_SHORTAGE', 'PROCUREMENT_PENDING', 'GRN', 'PO_SENT', 'GRN_RECEIVED', 'JOB_RELEASED', 'MATERIAL_ISSUED', 'IN_PRODUCTION', 'WITH_SUBCONTRACTOR', 'REWORK'].includes(currentStage)) {
    activeStepIndex = 1;
  } else {
    activeStepIndex = 0;
  }

  // Fulfillment stats
  const totalOrderedQty = (order.lines || []).reduce((sum, l) => sum + Number(l.orderQty || 0), 0);
  const totalDispatchedQty = (order.lines || []).reduce((sum, l) => sum + Number(l.dispatchedQty || 0), 0);
  const fulfillmentPercentage = totalOrderedQty > 0 ? Math.min(100, Math.round((totalDispatchedQty / totalOrderedQty) * 100)) : 0;

  const handleOpenChallanDetailModal = () => {
    const matched = latestDispatch || (effectiveChallanNo ? {
      id: effectiveChallanNo,
      challanNo: effectiveChallanNo,
      orderPo: order.poNo || order.id,
      date: order.dispatchedAt || new Date().toISOString().split('T')[0],
      customerName: order.customerName,
      customerGstin: order.customerGstin || '27AAAAA0000A1Z5',
      destinationCity: order.destinationCity || 'Pune',
      transporter: order.transporterName || 'VRL Logistics Ltd',
      vehicleNo: (order as any).vehicleNo || 'MH 12 AB 4589',
      lrNo: (order as any).lrNo || 'LR-2026-8899',
      driverContact: '+91 98765 43210',
      status: isDispatched ? 'DISPATCHED' : 'DRAFT',
      linesCount: (order.lines || []).length,
      totalQty: totalOrderedQty,
      remarks: 'Precision engineered machined components',
      items: order.lines || []
    } : null);
    setSelectedChallanDetail(matched as any);
    challanDetailModal.open(matched?.challanNo ? { challanNo: matched.challanNo } : {});
  };

  // ----------------------------------------------------
  // Order Progression Interactive Handlers
  // ----------------------------------------------------

  const handlePdiDecisionSubmit = async (pdiDecision: 'PASS' | 'FAIL') => {
    try {
      setIsConfirming(true);
      setPdiError(null);

      const payload = {
        orderPo: order.poNo || order.id,
        pdiStatus: pdiDecision,
        certificateNo: `PDI-COC-${Math.floor(10000 + Math.random() * 90000)}`,
        acceptedQty: pdiAcceptedQty,
        rejectedQty: pdiRejectedQty,
        remarks: pdiRemarks,
        pdiReportUrl: pdiReportUrl,
        checklist: pdiChecklist,
        inspectedBy: currentUser?.name || 'QC Inspector'
      };

      if (onCompletePDI) {
        await onCompletePDI(order.id, payload);
      } else if (onUpdateOrder) {
        const nextStatus = pdiDecision === 'PASS' ? 'READY_TO_DISPATCH' : 'REWORK';
        await onUpdateOrder(order.id, {
          status: nextStatus as any,
          stage: nextStatus as any,
          hasOpenNcr: pdiDecision === 'FAIL',
          progressStep: pdiDecision === 'PASS' ? 7 : 5
        });
      }

      pdiModal.close();
    } catch (err: any) {
      setPdiError(err?.message || 'Failed to complete PDI inspection.');
    } finally {
      setIsConfirming(false);
    }
  };

  const handleGenerateInvoiceSubmit = async () => {
    if (isConfirming) return; // block double-click patently until request resolves
    try {
      setIsConfirming(true);
      setConfirmError(null);
      const calculatedTax = Math.round(gross * 0.18);
      const totalInvoiceAmount = gross + calculatedTax;

      const idempotencyKey = `idmp-inv-${order.poNo}-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
      const invoiceData = {
        orderPo: order.poNo || order.id,
        customerName: order.customerName || 'Customer Entity',
        totalAmount: totalInvoiceAmount,
        taxAmount: calculatedTax,
        invoiceNo: genInvoiceNo.trim() || `INV-26-${Math.floor(1000 + Math.random() * 9000)}`,
        invoiceDate: genInvoiceDate,
        items: order.lines || [],
        idempotencyKey
      };

      if (onGenerateInvoice) {
        await onGenerateInvoice(order.id, invoiceData);
      } else if (onUpdateOrder) {
        await onUpdateOrder(order.id, {
          invoiceNo: invoiceData.invoiceNo,
          status: 'INVOICE_GENERATED' as any,
          stage: 'INVOICE_GENERATED' as any,
          progressStep: 8
        });
      }

      invoiceModal.close();
    } catch (err: any) {
      // Duplicate/in-flight guard surfaced clearly (Part 2): keep the modal open so the
      // user sees the "already exists: INV-XXXX" message instead of a silent false success.
      setConfirmError(err?.message || 'Failed to generate tax invoice.');
    } finally {
      setIsConfirming(false);
    }
  };

  const handleGenerateChallanSubmit = async () => {
    if (isConfirming) return;
    try {
      setIsConfirming(true);
      setConfirmError(null);

      const idempotencyKey = `idmp-chl-${order.poNo}-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
      const challanData = {
        orderPo: order.poNo || order.id,
        challanNo: genChallanNo.trim() || formatDocumentNumber('CHL', getCurrentFinancialYear(), Math.floor(1000 + Math.random() * 8999)),
        transporter: challanTransporter.trim(),
        vehicleNo: challanVehicleNo.trim(),
        driverContact: challanDriverContact.trim(),
        remarks: challanRemarks.trim(),
        items: order.lines || [],
        lines: order.lines || [],
        idempotencyKey
      };

      if (onGenerateChallan) {
        await onGenerateChallan(order.id, challanData);
      } else if (onUpdateOrder) {
        await onUpdateOrder(order.id, {
          deliveryChallanNo: challanData.challanNo,
          transporterName: challanData.transporter,
          status: 'READY_TO_DISPATCH' as any,
          stage: 'READY_FOR_DISPATCH' as any,
          progressStep: 7
        });
      }

      challanModal.close();
    } catch (err: any) {
      setConfirmError(err?.message || 'Failed to generate delivery challan.');
    } finally {
      setIsConfirming(false);
    }
  };

  const handleDispatchSubmit = async () => {
    try {
      setIsConfirming(true);
      const dispatchData = {
        dispatchDate,
        transporter: dispatchTransporter.trim() || challanTransporter || 'VRL Logistics Ltd',
        vehicleNo: dispatchVehicleNo.trim() || challanVehicleNo || 'MH 12 AB 4589',
        lrNo: dispatchLrNo.trim(),
        driverContact: dispatchDriverContact.trim(),
        remarks: dispatchRemarks.trim(),
        lines: order.lines || []
      };

      if (onMarkDispatched) {
        await onMarkDispatched(order.id, dispatchData);
      } else if (onUpdateOrder) {
        await onUpdateOrder(order.id, {
          status: 'DISPATCHED' as any,
          stage: 'DISPATCHED' as any,
          transporterName: dispatchData.transporter,
          dispatchedAt: dispatchData.dispatchDate,
          progressStep: 8,
          lines: (order.lines || []).map(l => ({
            ...l,
            dispatchedQty: l.orderQty,
            pendingQty: 0
          }))
        });
      }

      dispatchModal.close();
    } catch (err: any) {
      setConfirmError(err?.message || 'Failed to record dispatch.');
    } finally {
      setIsConfirming(false);
    }
  };


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

    editOrderModal.close();
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

  const handleConfirmOrderAction = handleConfirmAction;

  // 7-Stage Flow: redirect the user to Production, where job cards are created manually (per item)
  const handleGoToCreateJobCard = () => {
    if (onNavigateToCreateJobCard) {
      onNavigateToCreateJobCard(order.poNo || order.id);
    } else {
      onNavigate?.('production');
    }
  };

  // 7-Stage Flow: redirect the user to Invoices, linking directly to '+ Create New Invoice'
  const handleGoToCreateInvoice = () => {
    if (onNavigateToCreateInvoice) {
      onNavigateToCreateInvoice(order.poNo || order.id, order.deliveryChallanNo);
    } else if (onNavigate) {
      onNavigate('invoices');
    } else {
      invoiceModal.open();
    }
  };

  const handleGoToCreateChallan = () => {
    if (onNavigateToDispatch) {
      onNavigateToDispatch(order.poNo || order.id);
    } else if (onNavigate) {
      onNavigate('dispatch');
    } else {
      challanModal.open();
    }
  };

  const handleMaterialCheckAction = async () => {
    try {
      setIsRunningMaterialCheck(true);
      setConfirmError(null);
      const res = await runMaterialCheckForOrder(order.id || order.poNo);
      setMaterialCheckFeedback({
        ready: res.ready,
        shortages: res.shortages || [],
        message: res.ready
          ? 'Material Check PASSED: All BOM raw materials are in stock and allocated.'
          : `Material Check Shortage: ${res.shortages?.length || 0} items are short. Purchase requisitions auto-created.`
      });
      if (onUpdateOrder) {
        await onUpdateOrder(order.id, {
          status: res.status,
          stage: res.status,
          progressStep: res.progressStep
        });
      }
    } catch (err: any) {
      setConfirmError(err?.message || 'Failed to complete material check.');
    } finally {
      setIsRunningMaterialCheck(false);
    }
  };

  const handleOverrideMaterialSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!overrideReason || overrideReason.trim().length < 5) {
      setOverrideError('A detailed reason (min 5 characters) is required for Owner Override.');
      return;
    }
    try {
      setIsRunningMaterialCheck(true);
      setOverrideError(null);
      const res = await overrideMaterialCheckForOrder(order.id || order.poNo, overrideReason);
      overrideModal.close();
      setMaterialCheckFeedback({
        ready: true,
        message: `Owner Override Applied: ${overrideReason}`
      });
      if (onUpdateOrder) {
        await onUpdateOrder(order.id, {
          status: 'MATERIAL_READY',
          stage: 'MATERIAL_READY',
          progressStep: 4
        });
      }
    } catch (err: any) {
      setOverrideError(err?.message || 'Failed to apply material override.');
    } finally {
      setIsRunningMaterialCheck(false);
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

  // PRD v1.0 Hard Gate: Confirm Customer Delivery with Mandatory POD
  const handleDeliverySubmit = async () => {
    if (!deliveryPodUrl.trim()) {
      setConfirmError('Proof of Delivery (POD/E-POD) document is required to confirm delivery.');
      return;
    }
    if (!deliveryReceivedBy.trim()) {
      setConfirmError('Receiver name is required.');
      return;
    }

    try {
      setIsConfirming(true);
      setConfirmError(null);

      if (onMarkDelivered) {
        await onMarkDelivered(order.id, {
          deliveryDate,
          receivedBy: deliveryReceivedBy.trim(),
          podUrl: deliveryPodUrl.trim(),
          remarks: deliveryRemarks.trim()
        });
      } else if (onUpdateOrder) {
        await onUpdateOrder(order.id, {
          status: 'DELIVERED',
          stage: 'DELIVERED',
          podDocumentUrl: deliveryPodUrl.trim(),
          podReceivedBy: deliveryReceivedBy.trim(),
          podReceivedDate: deliveryDate,
          progressStep: 9
        });
      }

      deliveryModal.close();
    } catch (err: any) {
      setConfirmError(err?.message || 'Failed to mark delivery.');
    } finally {
      setIsConfirming(false);
    }
  };

  // PRD v1.0 Hard Gate: POD Submission modal handler
  const handleSavePodDelivery = handleDeliverySubmit;

  // Part 3: Mark Delayed handler
  const handleMarkDelayedSubmit = async () => {
    if (isConfirming) return;
    if (!delayedReason.trim()) {
      setDelayedError('A delay reason is required.');
      return;
    }
    try {
      setIsConfirming(true);
      setDelayedError(null);
      if (onMarkDelayed) {
        await onMarkDelayed(order.id, {
          reason: delayedReason.trim(),
          followUpDate: delayedFollowUpDate
        });
      } else if (onUpdateOrder) {
        await onUpdateOrder(order.id, {
          status: 'DELIVERY_DELAYED' as any,
          stage: 'DELIVERY_DELAYED' as any,
          progressStep: 9
        });
      }
      delayedModal.close();
    } catch (err: any) {
      setDelayedError(err?.message || 'Failed to mark delivery delayed.');
    } finally {
      setIsConfirming(false);
    }
  };

  const handleGenerateInvoiceAction = async () => {
    try {
      setIsConfirming(true);
      setConfirmError(null);
      if (onUpdateOrder) {
        await onUpdateOrder(order.id, {
          status: 'INVOICED',
          stage: 'INVOICED',
          invoiceNo: effectiveInvoiceNo || `INV-2526-${Math.floor(1000 + Math.random() * 9000)}`,
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
  const handleRecordPaymentSubmit = async () => {
    if (paymentAmount <= 0) {
      setPaymentError('Payment amount must be greater than ₹0.');
      return;
    }

    try {
      setIsConfirming(true);
      setPaymentError(null);

      const newTotalPaid = currentPaid + paymentAmount;
      const isFullyPaid = newTotalPaid >= gross;

      if (onRecordPayment) {
        await onRecordPayment(order.id, {
          amount: paymentAmount,
          mode: paymentMode,
          referenceNo: paymentRefNo.trim(),
          paymentDate,
          currentPaid,
          grossAmount: gross,
          invoiceNo: effectiveInvoiceNo || latestInvoice?.invoiceNo,
          remarks: `Commercial settlement for ${order.poNo || order.id} (Invoice: ${effectiveInvoiceNo || 'Direct'})`,
          receivedBy: currentUser?.name || 'Accounts Officer'
        });
      } else if (onUpdateOrder) {
        await onUpdateOrder(order.id, {
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
      }

      paymentModal.close();
    } catch (err: any) {
      setPaymentError(err?.message || 'Failed to record payment.');
    } finally {
      setIsConfirming(false);
    }
  };

  const handleSavePayment = handleRecordPaymentSubmit;

  // PRD v1.0 Hard Gate: Order Closure (Must be Delivered + Full Payment)
  const handleCloseOrderAction = async () => {
    try {
      setIsConfirming(true);
      setConfirmError(null);

      const isDeliveredState = ['DELIVERED', 'COMPLETED', 'CLOSED'].includes((order.status || '').toUpperCase()) || Boolean(order.podReceivedDate);
      const isFullyPaidState = remainingOutstanding <= 0 || order.paymentStatus === 'PAID';

      if (!isDeliveredState) {
        throw new Error('Awaiting delivery confirmation — consignment must be marked Delivered with POD before closing.');
      }
      if (!isFullyPaidState) {
        throw new Error(`Awaiting full payment — ₹${currentPaid.toLocaleString('en-IN')} of ₹${gross.toLocaleString('en-IN')} received. ₹${remainingOutstanding.toLocaleString('en-IN')} outstanding.`);
      }

      const closeRes = validateOrderClosure(
        currentStage as any,
        order.paymentStatus || (remainingOutstanding <= 0 ? 'PAID' : 'UNPAID'),
        remainingOutstanding,
        isDeliveredState
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

  const handleCloseOrderSubmit = handleCloseOrderAction;

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

    const st = (order.status || order.stage || 'DRAFT').toUpperCase();

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

    // Stage 2: CONFIRMED -> go to Production to create / start job cards
    if (['CONFIRMED', 'APPROVED', 'RELEASED', 'MATERIAL_CHECKED', 'MATERIAL_CHECK', 'MATERIAL_READY', 'MATERIAL_VERIFIED'].includes(st)) {
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

    // Stage 3 (Production Floor): JOB_RELEASED / MATERIAL_ISSUED / IN_PRODUCTION / WITH_SUBCONTRACTOR / REWORK -> Start PDI / QC
    if (['JOB_RELEASED', 'MATERIAL_ISSUED', 'IN_PRODUCTION', 'WITH_SUBCONTRACTOR', 'REWORK'].includes(st)) {
      return {
        label: 'Start PDI / QC Inspection',
        icon: ShieldCheck,
        buttonClass: 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-indigo-600 hover:to-purple-600 text-white shadow-purple-500/25',
        handler: () => pdiModal.open(),
        disabled: isConfirming,
        ownerRole: 'Quality & Pre-Dispatch'
      };
    }

    // Stage 4 (QC / PDI): Enter checklist & Complete PDI
    if (['MANUFACTURING_COMPLETED', 'READY_FOR_QC', 'QC', 'QC_INSPECTION', 'QC_HOLD', 'QC_REPORT_UPLOADED', 'PDI', 'PDI_HOLD'].includes(st) && !isPdiPassed) {
      if ((allQcPassed && !hasNcr) || ['PDI', 'QC_REPORT_UPLOADED', 'PDI_PENDING'].includes(st)) {
        return {
          label: 'Inspect PDI (Stage 8a)',
          icon: ClipboardCheck,
          buttonClass: 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-teal-600 hover:to-emerald-600 text-white shadow-emerald-500/25',
          handler: () => {
            if (onNavigateToPDI) onNavigateToPDI(order.poNo || order.id, order.jobCards?.[0]?.jobNo);
            else if (onNavigate) onNavigate('pdi');
            else pdiModal.open();
          },
          disabled: isConfirming || hasNcr,
          disabledReason: hasNcr ? 'Open NCR / QC Hold must be resolved before PDI' : undefined,
          ownerRole: 'Quality & Pre-Dispatch'
        };
      }
      return {
        label: 'Upload Quality Report / Perform QC',
        icon: ShieldCheck,
        buttonClass: 'bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-blue-600 hover:to-indigo-600 text-white shadow-indigo-500/25',
        handler: () => {
          if (onNavigate) onNavigate('qc');
          else pdiModal.open();
        },
        disabled: isConfirming,
        ownerRole: 'QC Manager / Inspector'
      };
    }

    // Stage 6 (Dispatched / In Transit / Delivery Delayed): shipped / in transit -> Generate Invoice or Order Received (Mark Delivered)
    if (isDispatched || ['PARTIALLY_DISPATCHED', 'DISPATCHED', 'IN_TRANSIT', 'DELIVERY_DELAYED'].includes(st)) {
      if (!effectiveInvoiceNo) {
        const allowed = isRoleAuthorizedForCta(currentRole, 'GENERATE_INVOICE');
        return {
          label: 'Generate Statutory GST Tax Invoice (Stage 9)',
          icon: Receipt,
          buttonClass: 'bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-blue-600 hover:to-indigo-600 text-white shadow-indigo-500/25',
          handler: handleGoToCreateInvoice,
          disabled: !allowed,
          disabledReason: !allowed ? 'Only Finance / Accounts or Owner can generate tax invoices' : undefined,
          ownerRole: 'Accounts / Finance'
        };
      } else if (!['DELIVERED', 'COMPLETED', 'CLOSED'].includes(st) && !order.podReceivedDate && !order.podDocumentUrl) {
        const allowed = isRoleAuthorizedForCta(currentRole, 'MARK_DELIVERED') || isRoleAuthorizedForCta(currentRole, 'ORDER_RECEIVED');
        const isDelayed = st === 'DELIVERY_DELAYED';
        return {
          label: isDelayed ? 'Confirm Delivery (Stage 10a)' : 'Mark Delivered (Stage 10a)',
          icon: CheckCircle2,
          buttonClass: isDelayed
            ? 'bg-gradient-to-r from-amber-600 to-emerald-600 hover:from-emerald-600 hover:to-amber-600 text-white shadow-amber-500/25'
            : 'bg-gradient-to-r from-blue-600 to-emerald-600 hover:from-emerald-600 hover:to-blue-600 text-white shadow-blue-500/25',
          handler: () => deliveryModal.open(),
          disabled: !allowed,
          disabledReason: !allowed ? 'Only Dispatch Clerk or Owner can mark delivered' : undefined,
          ownerRole: 'Dispatch Logistics'
        };
      }
    }

    // Stage 5 (Invoice & Challan / Ready to Dispatch): Delivery Challan & Dispatch
    if (!isDispatched && (isPdiPassed || ['PDI_COMPLETE', 'READY_FOR_DISPATCH', 'READY_TO_DISPATCH', 'INVOICE_GENERATED', 'DISPATCH_READY'].includes(st))) {
      const allowed = isRoleAuthorizedForCta(currentRole, 'GENERATE_DELIVERY_CHALLAN');
      if (!effectiveChallanNo) {
        return {
          label: 'Generate Delivery Challan (Stage 9a)',
          icon: Plus,
          buttonClass: 'bg-gradient-to-r from-[#5B75F8] to-indigo-600 hover:from-indigo-600 hover:to-[#5B75F8] text-white shadow-[#5B75F8]/25',
          handler: handleGoToCreateChallan,
          disabled: isConfirming || hasNcr || !allowed,
          disabledReason: !allowed ? 'Only Dispatch Clerk or Owner can generate delivery challan' : hasNcr ? 'Open NCR / QC Hold must be resolved before challan issuance' : undefined,
          ownerRole: 'Quality & Dispatch'
        };
      } else {
        return {
          label: `View / Dispatch Challan (${effectiveChallanNo})`,
          icon: Eye,
          buttonClass: 'bg-gradient-to-r from-[#5B75F8] to-indigo-600 hover:from-indigo-600 hover:to-[#5B75F8] text-white shadow-[#5B75F8]/20',
          handler: handleOpenChallanDetailModal,
          disabled: isConfirming || hasNcr || !allowed,
          disabledReason: !allowed ? 'Only Dispatch Clerk or Owner can dispatch the order' : hasNcr ? 'Open NCR / QC Hold must be resolved before dispatch' : undefined,
          ownerRole: 'Quality & Dispatch'
        };
      }
    }

    // Stage 7 (Delivered / Payment Pending): Invoicing, Payment Collection, or Order Closure
    // Strictly requires delivery confirmation (or POD) and excludes DELIVERY_DELAYED
    if ((['DELIVERED', 'PAYMENT_PENDING'].includes(st) || Boolean(order.podReceivedDate) || (['INVOICED'].includes(st) && Boolean(order.podDocumentUrl))) && st !== 'DELIVERY_DELAYED') {
      if (!effectiveInvoiceNo) {
        const allowed = isRoleAuthorizedForCta(currentRole, 'GENERATE_INVOICE');
        return {
          label: 'Generate Statutory GST Tax Invoice (Stage 9)',
          icon: Receipt,
          buttonClass: 'bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-blue-600 hover:to-indigo-600 text-white shadow-indigo-500/25',
          handler: handleGoToCreateInvoice,
          disabled: !allowed,
          disabledReason: !allowed ? 'Only Finance / Accounts or Owner can generate tax invoices' : undefined,
          ownerRole: 'Accounts / Finance'
        };
      }

      const isDeliveredState = ['DELIVERED', 'COMPLETED', 'CLOSED'].includes(st) || Boolean(order.podReceivedDate);
      if (!isDeliveredState) {
        const allowed = isRoleAuthorizedForCta(currentRole, 'MARK_DELIVERED') || isRoleAuthorizedForCta(currentRole, 'ORDER_RECEIVED');
        return {
          label: 'Mark Delivered (Stage 10a)',
          icon: CheckCircle2,
          buttonClass: 'bg-gradient-to-r from-blue-600 to-emerald-600 hover:from-emerald-600 hover:to-blue-600 text-white shadow-blue-500/25',
          handler: () => deliveryModal.open(),
          disabled: !allowed,
          disabledReason: !allowed ? 'Only Dispatch Clerk or Owner can mark delivered' : undefined,
          ownerRole: 'Dispatch & Transport Desk'
        };
      }

      const isPaid = order.paymentStatus === 'PAID' || remainingOutstanding <= 0;
      if (!isPaid) {
        const allowed = isRoleAuthorizedForCta(currentRole, 'RECORD_PAYMENT');
        const isPartial = currentPaid > 0;
        return {
          label: isPartial
            ? `Record Payment (Stage 11 — Bal: ₹${remainingOutstanding.toLocaleString('en-IN')})`
            : `Record Payment (Stage 11 — Total: ₹${gross.toLocaleString('en-IN')})`,
          icon: CreditCard,
          buttonClass: 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-teal-600 hover:to-emerald-600 text-white shadow-emerald-500/25',
          handler: () => paymentModal.open(),
          disabled: !allowed,
          disabledReason: !allowed ? 'Only Finance / Accounts or Owner can record payments' : undefined,
          ownerRole: 'Accounts & Finance Controller'
        };
      } else if (['CLOSED', 'COMPLETED'].includes(st)) {
        return {
          label: 'Order Closed & Settled (Completed)',
          icon: Lock,
          buttonClass: 'bg-slate-800 text-emerald-400 border border-emerald-500/30 cursor-default opacity-90',
          handler: () => { },
          disabled: true,
          ownerRole: 'Lifecycle Complete'
        };
      } else {
        if (!canMarkOrderClosed) return null;
        return {
          label: isConfirming ? 'Closing...' : 'Mark Order Closed (Stage 11a)',
          icon: CheckCircle2,
          buttonClass: 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-teal-600 hover:to-emerald-600 text-white shadow-emerald-500/25',
          handler: handleCloseOrderAction,
          disabled: isConfirming,
          ownerRole: 'Finance Controller / Owner'
        };
      }
    }

    return null;
  };

  // ----------------------------------------------------
  // Dynamic Stage Info for Pipeline Visualizer Banner
  // ----------------------------------------------------
  const getStageShortcutConfig = (step = activeStepIndex) => {
    switch (step) {
      case 0:
        return {
          title: 'Stage 1: Confirmed PO Spec Verification',
          desc: 'Order received and logged. Review commercials and item specifications, then confirm the order into production pipeline.',
          targetView: 'orders',
          viewLabel: 'Open Order Details ➔',
          endpoint: 'POST /api/v1/orders/:id/confirm',
          role: 'SALES_DESK / SUPER_ADMIN',
          testActionLabel: '⚡ Confirm Order (Lock Specs)',
          onTest: handleConfirmAction
        };
      case 1:
        return {
          title: 'Stage 2: Customer PO Confirmation & BOM Verification',
          desc: 'Verify customer purchase order terms, allocate bill of materials (BOM), and confirm technical specs.',
          targetView: 'orders',
          viewLabel: 'Open Order Details ➔',
          endpoint: 'POST /api/v1/orders/:id/confirm',
          role: 'SALES_MANAGER / OPS_ADMIN',
          testActionLabel: '⚡ Confirm Order (Lock Specs)',
          onTest: handleConfirmOrderAction
        };
      case 2:
        return {
          title: 'Stage 3: Production Routing & Job Cards',
          desc: 'Create CNC/VMC routing job cards, allocate machine line, and log daily operator production sheets.',
          targetView: 'production',
          viewLabel: 'Open Production Floor ➔',
          endpoint: 'POST /api/v1/production/jobs',
          role: 'PRODUCTION_HEAD / SHOP_FLOOR_SUPERVISOR',
          testActionLabel: '⚡ Create Job Card',
          onTest: handleGoToCreateJobCard
        };
      case 3:
        return {
          title: 'Stage 4: Outward Logistics & Dispatch Challan',
          desc: 'Pre-dispatch inspection cleared. Prepare outward delivery challan (CHL-2627-####) with transporter & vehicle details.',
          targetView: 'dispatch',
          viewLabel: 'Open Dispatch Register ➔',
          endpoint: 'POST /api/v1/dispatch',
          role: 'DISPATCH_STORE / OPS_ADMIN',
          testActionLabel: effectiveChallanNo ? '⚡ View / Dispatch Challan' : '⚡ Issue Delivery Challan',
          onTest: () => effectiveChallanNo ? handleOpenChallanDetailModal() : challanModal.open()
        };
      case 4:
        return {
          title: 'Stage 5: Statutory GST Invoicing',
          desc: 'Consignment dispatched. Issue statutory GST Tax Invoice (INV-2627-####) against the dispatch challan and line items.',
          targetView: 'invoices',
          viewLabel: 'Open Invoices & Accounts ➔',
          endpoint: 'POST /api/v1/invoices',
          role: 'ACCOUNTS_ADMIN / FINANCE',
          testActionLabel: '⚡ Generate GST Tax Invoice',
          onTest: handleGoToCreateInvoice
        };
      case 5:
        return {
          title: 'Stage 6: Goods Delivered & POD',
          desc: 'Shipment delivered to customer. Verify signed Proof of Delivery (POD) and finalize billing records.',
          targetView: 'dispatch',
          viewLabel: 'Open Dispatch Register ➔',
          endpoint: 'POST /api/v1/dispatch/:id/deliver',
          role: 'DISPATCH_STORE / OPS_ADMIN',
          testActionLabel: effectiveInvoiceNo ? '⚡ Mark Delivered (POD)' : '⚡ Generate GST Invoice',
          onTest: () => effectiveInvoiceNo ? deliveryModal.open() : handleGoToCreateInvoice()
        };
      case 6:
        return {
          title: 'Stage 7: Payment Realization',
          desc: 'Tax invoice issued. Record customer NEFT/RTGS collections against outstanding balance; full settlement closes the order.',
          targetView: 'invoices',
          viewLabel: 'Open Invoices & Accounts ➔',
          endpoint: 'POST /api/v1/invoices/:invoiceNo/pay',
          role: 'ACCOUNTS_ADMIN / FINANCE',
          testActionLabel: remainingOutstanding > 0 ? '⚡ Record Payment Received' : '⚡ Mark Order Closed',
          onTest: remainingOutstanding > 0 ? () => paymentModal.open() : handleCloseOrderAction
        };
      case 7:
      default:
        return {
          title: 'Stage 8: Order Closed & Settled',
          desc: 'Order lifecycle complete. Consignment delivered, verified POD received, and invoice settled in full.',
          targetView: 'orders',
          viewLabel: 'Open Order Register ➔',
          endpoint: 'POST /api/v1/orders/:id/close',
          role: 'FINANCE / SUPER_ADMIN',
          testActionLabel: '✓ Order Closed & Locked',
          onTest: undefined
        };
    }
  };

  const stageShortcut = getStageShortcutConfig();

  return (
    <div className="space-y-6 font-sans">

      {/* 1. Header Navigation & Action Bar - Apple HIG Toolbar */}
      <div className={`p-4 sm:p-5 rounded-2xl border transition-all relative overflow-hidden backdrop-blur-xl ${isDarkMode
        ? 'bg-slate-900/80 border-white/10 text-white shadow-[0_4px_24px_rgba(0,0,0,0.3)]'
        : 'bg-white/90 border-slate-200/80 shadow-[0_4px_20px_rgba(0,0,0,0.04)] text-slate-900'
        }`}>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">

          <div className="flex items-start md:items-center gap-3.5 min-w-0">
            <button
              onClick={onBack}
              className={`w-9 h-9 rounded-full border cursor-pointer transition-all hover:scale-105 active:scale-[0.96] shrink-0 flex items-center justify-center ${isDarkMode
                ? 'border-white/10 bg-slate-800 text-slate-200 hover:bg-slate-700 shadow-2xs'
                : 'border-slate-200 bg-slate-100 text-slate-700 hover:bg-slate-200 shadow-2xs'
                }`}
              title="Back to Orders Hub"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>

            <div className="min-w-0">
              {/* Breadcrumb row */}
              <div className="flex items-center gap-1.5 text-[11px] font-medium text-slate-400 dark:text-slate-500 mb-1 tracking-wide">
                <span>Orders</span>
                <span>/</span>
                <span>PO Detail</span>
                <span>/</span>
                <span className="text-[#5B75F8] dark:text-[#7B92FF] font-semibold">{order.poNo}</span>
              </div>

              <div className="flex flex-wrap items-center gap-2.5">
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
                  <span>{order.poNo}</span>
                </h1>

                {order.subType && (
                  <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-medium border ${order.subType === 'BLANKET_CALLOFF'
                    ? isDarkMode ? 'bg-purple-500/15 text-purple-300 border-purple-500/30' : 'bg-purple-50 text-purple-700 border-purple-200'
                    : isDarkMode ? 'bg-blue-500/15 text-[#7B92FF] border-blue-500/30' : 'bg-blue-50 text-[#5B75F8] border-blue-200'
                    }`}>
                    {order.subType === 'BLANKET_CALLOFF' ? 'Blanket Call-Off' : 'Fresh PO'}
                  </span>
                )}

                <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border transition-all ${isQcRejected ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20' :
                  isQcHold || hasNcr ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20' :
                    order.status === 'CANCELLED' ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20' :
                      order.status === 'DRAFT' || order.status === 'PO_RECEIVED' || order.status === 'SUBMITTED' ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20' :
                        order.status === 'CONFIRMED' || order.status === 'APPROVED' ? 'bg-blue-500/10 text-[#5B75F8] dark:text-[#7B92FF] border-blue-500/20' :
                          order.status === 'MATERIAL_CHECKED' || order.status === 'MATERIAL_CHECK' || order.status === 'MATERIAL_READY' ? 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20' :
                            order.status === 'IN_PRODUCTION' || order.status === 'JOB_RELEASED' ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20' :
                              order.status === 'READY_FOR_QC' || order.status === 'MANUFACTURING_COMPLETED' || order.status === 'QC_INSPECTION' || order.status === 'QC' ? 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20' :
                                order.status === 'READY_TO_DISPATCH' || order.status === 'READY_FOR_DISPATCH' || order.status === 'PDI_COMPLETE' ? 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/20' :
                                  order.status === 'PARTIALLY_DISPATCHED' || order.status === 'DISPATCHED' ? 'bg-teal-500/10 text-teal-600 dark:text-teal-400 border-teal-500/20' :
                                    order.status === 'CLOSED' || order.status === 'COMPLETED' ? 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20' :
                                      'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                  }`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${isQcRejected ? 'bg-rose-500 animate-pulse' :
                    isQcHold || hasNcr ? 'bg-amber-500 animate-pulse' :
                      order.status === 'CANCELLED' ? 'bg-rose-500' :
                        order.status === 'DRAFT' || order.status === 'PO_RECEIVED' || order.status === 'SUBMITTED' ? 'bg-amber-500 animate-pulse' :
                          order.status === 'CONFIRMED' || order.status === 'APPROVED' ? 'bg-[#5B75F8]' :
                            order.status === 'MATERIAL_CHECKED' || order.status === 'MATERIAL_CHECK' || order.status === 'MATERIAL_READY' ? 'bg-indigo-500' :
                              order.status === 'IN_PRODUCTION' || order.status === 'JOB_RELEASED' ? 'bg-amber-500 animate-pulse' :
                                order.status === 'READY_FOR_QC' || order.status === 'MANUFACTURING_COMPLETED' ? 'bg-purple-500 animate-pulse' :
                                  order.status === 'QC_INSPECTION' || order.status === 'QC' ? 'bg-purple-500' :
                                    order.status === 'READY_TO_DISPATCH' || order.status === 'READY_FOR_DISPATCH' || order.status === 'PDI_COMPLETE' ? 'bg-cyan-500' :
                                      order.status === 'PARTIALLY_DISPATCHED' || order.status === 'DISPATCHED' ? 'bg-teal-500' :
                                        order.status === 'CLOSED' || order.status === 'COMPLETED' ? 'bg-slate-400' : 'bg-emerald-500'
                    }`} />
                  <span>{isQcRejected ? 'QC Rejected' : (isQcHold || hasNcr) ? 'QC Hold / NCR' : (order.status || order.stage || 'DRAFT').replace(/_/g, ' ')}</span>
                </span>
              </div>

              {/* Customer & Date Metadata Strip */}
              <div className="flex flex-wrap items-center gap-2 text-xs mt-1.5 text-slate-500 dark:text-slate-400">
                <span className="flex items-center gap-1.5">
                  <span className="text-slate-400 dark:text-slate-500 font-normal">Customer:</span>
                  <strong className="text-slate-900 dark:text-white font-semibold">{order.customerName}</strong>
                </span>
                <span className="text-slate-300 dark:text-slate-700">•</span>
                <span>Created {order.poDate}</span>
                {order.deliveryDate && (
                  <>
                    <span className="text-slate-300 dark:text-slate-700">•</span>
                    <span>Due: <strong className="font-medium text-slate-800 dark:text-slate-200">{order.deliveryDate}</strong></span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Action Button Strip */}
          <div className="flex items-center gap-2 w-full md:w-auto shrink-0 justify-end">
            <button
              onClick={() => uploadPoModal.open()}
              className={`w-full md:w-auto px-4 py-2 rounded-full border text-xs font-medium transition-all cursor-pointer flex items-center justify-center gap-2 ${isDarkMode
                ? 'border-white/10 bg-slate-800/90 text-slate-200 hover:bg-slate-700 shadow-2xs'
                : 'border-slate-200/80 bg-slate-100/80 text-slate-700 hover:bg-slate-200 shadow-2xs'
                }`}
            >
              <Upload className="w-3.5 h-3.5" />
              <span>{poFileName ? 'PO File Attached' : 'Attach PO'}</span>
            </button>
          </div>
        </div>

        {confirmError && (
          <div className="mt-3.5 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs flex items-center justify-between gap-3 relative z-10 animate-fade-in">
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

      {/* 2. Apple HIG Segmented Progress Stepper */}
      <div className={`p-4 sm:p-5 rounded-2xl border transition-all relative overflow-hidden backdrop-blur-xl ${isDarkMode
        ? 'bg-slate-900/80 border-white/10 text-white shadow-[0_4px_24px_rgba(0,0,0,0.3)]'
        : 'bg-white/90 border-slate-200/80 shadow-[0_4px_20px_rgba(0,0,0,0.04)] text-slate-900'
        }`}>

        <div className="flex items-center justify-between gap-2.5 mb-3 px-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Lifecycle Progress
            </span>
          </div>
          <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-medium border ${isDarkMode ? 'bg-blue-500/10 border-blue-500/20 text-[#7B92FF]' : 'bg-blue-50 border-blue-100 text-[#5B75F8]'
            }`}>
            Phase {activeStepIndex + 1} of {steps.length} • {(order.status || order.stage || 'DRAFT').replace(/_/g, ' ')}
          </span>
        </div>

        {/* Apple Segmented Control Rail */}
        <div className={`p-1.5 rounded-2xl border flex items-center gap-1.5 overflow-x-auto scrollbar-none ${isDarkMode
          ? 'bg-slate-950/60 border-white/5'
          : 'bg-slate-100/80 border-slate-200/60'
          }`}>
          {steps.map((st, idx) => {
            const isCompleted = idx < activeStepIndex;
            const isCurrent = idx === activeStepIndex;
            const StepIcon = st.icon;

            return (
              <div
                key={st.name}
                className={`flex-1 min-w-[110px] sm:min-w-[130px] px-3 py-2 rounded-xl flex items-center gap-2.5 transition-all select-none ${isCurrent
                  ? 'bg-[#5B75F8] text-white shadow-sm shadow-blue-500/25'
                  : isCompleted
                    ? isDarkMode
                      ? 'bg-slate-900/90 text-slate-200 border border-white/5'
                      : 'bg-white text-slate-800 shadow-2xs border border-slate-200/50'
                    : 'text-slate-400 dark:text-slate-500'
                  }`}
              >
                <div className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 text-xs font-semibold ${isCurrent
                  ? 'bg-white/20 text-white'
                  : isCompleted
                    ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                    : isDarkMode
                      ? 'bg-slate-800 text-slate-400'
                      : 'bg-slate-200/70 text-slate-500'
                  }`}>
                  {isCompleted ? (
                    <CheckCircle2 className="w-3.5 h-3.5 stroke-[2.5]" />
                  ) : isCurrent ? (
                    <StepIcon className="w-3.5 h-3.5 stroke-[2.2]" />
                  ) : (
                    <span>{idx + 1}</span>
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <div className={`text-xs truncate ${isCurrent ? 'font-semibold text-white' : isCompleted ? 'font-medium' : 'font-normal'}`}>
                    {st.name}
                  </div>
                  <div className={`text-[10px] truncate ${isCurrent ? 'text-blue-100' : 'text-slate-400 dark:text-slate-500'}`}>
                    {st.subtitle}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 2.5 Unified Stage Gateway Panels (Single Source of Truth) */}
      <div className="space-y-2.5">

        {(() => {
          const norm = normalizeOrderState(order.status || order.stage);

          const stageDefinitions = [
            {
              id: 'stage-1',
              stageNumber: 'Stage 1',
              name: 'PO Received & Order Commercials',
              role: 'Sales / Order Desk',
              description: 'Review customer PO terms, delivery schedule, item specifications, and confirm order into production pipeline.',
              icon: FileText,
              matchCurrent: (n: CanonicalOrderState, o: CustomerOrder) =>
                ['DRAFT', 'SUBMITTED'].includes(n) || ['DRAFT', 'PO_RECEIVED', 'SUBMITTED', 'PENDING_REVIEW'].includes((o.status || '').toUpperCase()),
              renderActions: () => {
                const allowed = isRoleAuthorizedForCta(currentRole, 'CONFIRM_ORDER');
                return (
                  <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 w-full sm:w-auto">
                    {useCtaPermission('REQUEST_REVISION') && (
                      <button
                        onClick={openEditModal}
                        className={`flex h-11 shrink-0 items-center justify-center gap-1.5 rounded-xl border px-3.5 text-xs font-semibold transition-all cursor-pointer whitespace-nowrap active:scale-[0.98] ${isDarkMode
                          ? 'border-white/10 bg-white/[0.04] text-slate-300 hover:bg-white/10 hover:text-white'
                          : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-100 shadow-xs'
                          }`}
                      >
                        <Edit3 className="w-3.5 h-3.5 shrink-0" />
                        <span>Request Revision / Edit</span>
                      </button>
                    )}
                    {useCtaPermission('CONFIRM_ORDER') && (
                      <button
                        disabled={isConfirming || !allowed}
                        onClick={handleConfirmAction}
                        className="flex h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-[var(--accent-primary)] px-4 text-xs font-extrabold text-white shadow-[0_8px_20px_var(--accent-shadow)] transition-ui hover:bg-[var(--accent-hover)] active:scale-[0.96] cursor-pointer disabled:opacity-50 whitespace-nowrap"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                        <span>{isConfirming ? 'Confirming...' : 'Confirm Order'}</span>
                      </button>
                    )}
                    <button
                      onClick={() => onCancelOrder?.(order.id)}
                      className="flex h-11 shrink-0 items-center justify-center gap-1.5 rounded-xl border border-rose-500/30 bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 dark:text-rose-400 px-3.5 text-xs font-semibold cursor-pointer transition-all active:scale-[0.98] whitespace-nowrap"
                    >
                      <XCircle className="w-3.5 h-3.5 shrink-0" />
                      <span>Cancel</span>
                    </button>
                  </div>
                );
              }
            },
            {
              id: 'stage-2',
              stageNumber: 'Stage 2',
              name: 'Order Release Planning',
              role: 'Production Planner (PPC)',
              description: 'Commercials confirmed. Verify drawing revisions, plan shop floor release, or raise change order.',
              icon: Layers,
              matchCurrent: (n: CanonicalOrderState, o: CustomerOrder) =>
                n === 'APPROVED' || ['CONFIRMED', 'APPROVED', 'PO_APPROVED'].includes((o.status || '').toUpperCase()),
              renderActions: () => (
                <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 w-full sm:w-auto">
                  {useCtaPermission('RAISE_CHANGE_ORDER') && (
                    <button
                      onClick={openEditModal}
                      className={`flex h-11 shrink-0 items-center justify-center gap-1.5 rounded-xl border px-3.5 text-xs font-semibold transition-all cursor-pointer whitespace-nowrap active:scale-[0.98] ${isDarkMode
                        ? 'border-white/10 bg-white/[0.04] text-slate-300 hover:bg-white/10 hover:text-white'
                        : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-100 shadow-xs'
                        }`}
                    >
                      <Edit3 className="w-3.5 h-3.5 shrink-0" />
                      <span>Raise Change Order</span>
                    </button>
                  )}
                  {useCtaPermission('VERIFY_MATERIAL_AVAILABILITY') && (
                    <button
                      disabled={isRunningMaterialCheck}
                      onClick={handleMaterialCheckAction}
                      className="flex h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-[var(--accent-primary)] px-4 text-xs font-extrabold text-white shadow-[0_8px_20px_var(--accent-shadow)] transition-ui hover:bg-[var(--accent-hover)] active:scale-[0.96] cursor-pointer disabled:opacity-50 whitespace-nowrap"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 shrink-0 ${isRunningMaterialCheck ? 'animate-spin' : ''}`} />
                      <span>{isRunningMaterialCheck ? 'Checking Material...' : 'Proceed to Material Check'}</span>
                    </button>
                  )}
                </div>
              )
            },
            {
              id: 'stage-3',
              stageNumber: 'Stage 3',
              name: 'BOM Explosion & Material Verification',
              role: 'Stores & Material Control',
              description: 'Live BOM explosion verified against warehouse inventory stock. Determines Job Card release eligibility.',
              icon: Package,
              matchCurrent: (n: CanonicalOrderState, o: CustomerOrder) =>
                ['RELEASED', 'PENDING_VERIFICATION', 'MATERIAL_CHECK'].includes(n) || ['MATERIAL_CHECK', 'PENDING_VERIFICATION'].includes((o.status || '').toUpperCase()),
              renderActions: () => (
                <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 w-full sm:w-auto">
                  {useCtaPermission('VERIFY_MATERIAL_AVAILABILITY') && (
                    <button
                      disabled={isRunningMaterialCheck}
                      onClick={handleMaterialCheckAction}
                      className="flex h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-[var(--accent-primary)] px-4 text-xs font-extrabold text-white shadow-[0_8px_20px_var(--accent-shadow)] transition-ui hover:bg-[var(--accent-hover)] active:scale-[0.96] cursor-pointer disabled:opacity-50 whitespace-nowrap"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 shrink-0 ${isRunningMaterialCheck ? 'animate-spin' : ''}`} />
                      <span>{isRunningMaterialCheck ? 'Checking...' : 'Re-run Material Check'}</span>
                    </button>
                  )}
                  {isOwner && (
                    <button
                      onClick={() => setShowOverrideModal(true)}
                      className={`flex h-11 shrink-0 items-center justify-center gap-1.5 rounded-xl border px-3.5 text-xs font-semibold transition-all cursor-pointer whitespace-nowrap active:scale-[0.98] ${isDarkMode
                        ? 'border-purple-500/30 bg-purple-500/10 text-purple-400 hover:bg-purple-500/20'
                        : 'border-purple-300 bg-purple-50 text-purple-700 hover:bg-purple-100'
                        }`}
                    >
                      <Zap className="w-3.5 h-3.5 shrink-0" />
                      <span>Owner Override</span>
                    </button>
                  )}
                </div>
              )
            },
            {
              id: 'stage-4',
              stageNumber: 'Stage 4',
              name: 'Material Verified',
              role: 'Stores & Material Control',
              description: 'Raw material allocation verified and reserved for job card cutting.',
              icon: CheckCircle2,
              matchCurrent: (n: CanonicalOrderState, o: CustomerOrder) =>
                n === 'MATERIAL_SHORT' || ['MATERIAL_SHORT', 'MATERIAL_SHORTAGE'].includes((o.status || o.stage || '').toUpperCase()),
              renderActions: () => (
                <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 w-full sm:w-auto">
                  {useCtaPermission('VERIFY_MATERIAL_AVAILABILITY') && (
                    <button
                      disabled={isRunningMaterialCheck}
                      onClick={handleMaterialCheckAction}
                      className="flex h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-[var(--accent-primary)] px-4 text-xs font-extrabold text-white shadow-[0_8px_20px_var(--accent-shadow)] transition-ui hover:bg-[var(--accent-hover)] active:scale-[0.96] cursor-pointer disabled:opacity-50 whitespace-nowrap"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 shrink-0 ${isRunningMaterialCheck ? 'animate-spin' : ''}`} />
                      <span>{isRunningMaterialCheck ? 'Checking...' : 'Re-check Material'}</span>
                    </button>
                  )}
                  <button
                    onClick={() => onNavigate?.('inventory')}
                    className="flex h-11 shrink-0 items-center justify-center gap-1.5 rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-500 dark:text-amber-300 hover:bg-amber-500/20 px-3.5 text-xs font-semibold cursor-pointer transition-all active:scale-[0.98] whitespace-nowrap"
                  >
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                    <span>Open Purchase Requisitions ➔</span>
                  </button>
                </div>
              )
            },
            {
              id: 'stage-5',
              stageNumber: 'Stage 5',
              name: 'Procurement',
              role: 'Purchase / Procurement',
              description: 'Shortage identified. Purchase orders issued to raw material vendors.',
              icon: Building,
              isConditional: (o: CustomerOrder) => ['PROCUREMENT_PENDING', 'PO_SENT', 'GRN', 'GRN_PENDING', 'MATERIAL_SHORT', 'MATERIAL_SHORTAGE'].includes((o.status || o.stage || '').toUpperCase()),
              matchCurrent: (n: CanonicalOrderState, o: CustomerOrder) =>
                n === 'PROCUREMENT_PENDING' || ['PROCUREMENT_PENDING', 'PO_SENT', 'UNDER_PROCUREMENT'].includes((o.status || '').toUpperCase()),
              renderActions: () => (
                <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 w-full sm:w-auto">
                  {useCtaPermission('CREATE_PURCHASE_ORDER') && (
                    <button
                      onClick={() => onNavigate?.('inventory')}
                      className="flex h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-[var(--accent-primary)] px-4 text-xs font-extrabold text-white shadow-[0_8px_20px_var(--accent-shadow)] transition-ui hover:bg-[var(--accent-hover)] active:scale-[0.96] cursor-pointer whitespace-nowrap"
                    >
                      <Building className="w-3.5 h-3.5 shrink-0" />
                      <span>Create Purchase Order</span>
                    </button>
                  )}
                </div>
              )
            },
            {
              id: 'stage-5a',
              stageNumber: 'Stage 5a',
              name: 'Goods Receipt',
              role: 'Stores & Inward QC',
              description: 'Inward shipment inspection and warehouse Goods Receipt Note (GRN) entry.',
              icon: Package,
              isConditional: (o: CustomerOrder) => ['GRN', 'GRN_PENDING', 'AWAITING_GRN', 'PROCUREMENT_PENDING'].includes((o.status || o.stage || '').toUpperCase()),
              matchCurrent: (n: CanonicalOrderState, o: CustomerOrder) =>
                n === 'GRN' || ['GRN', 'GRN_PENDING', 'AWAITING_GRN'].includes((o.status || '').toUpperCase()),
              renderActions: () => (
                <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 w-full sm:w-auto">
                  {useCtaPermission('RECORD_GRN') && (
                    <button
                      onClick={() => onNavigate?.('inventory')}
                      className="flex h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-[var(--accent-primary)] px-4 text-xs font-extrabold text-white shadow-[0_8px_20px_var(--accent-shadow)] transition-ui hover:bg-[var(--accent-hover)] active:scale-[0.96] cursor-pointer whitespace-nowrap"
                    >
                      <Package className="w-3.5 h-3.5 shrink-0" />
                      <span>Record GRN</span>
                    </button>
                  )}
                </div>
              )
            },
            {
              id: 'stage-6',
              stageNumber: 'Stage 6',
              name: 'Job Card Creation',
              role: 'Production Planner (PPC)',
              description: 'BOM raw materials issued from stores. Route card operations scheduled for machine allocation.',
              icon: FileCheck,
              matchCurrent: (n: CanonicalOrderState, o: CustomerOrder) => {
                const st = (o.status || o.stage || '').toUpperCase();
                // Never show "Create Job Card" if the order is already past job card creation
                const pastJobCard = ['IN_PRODUCTION', 'WITH_SUBCONTRACTOR', 'REWORK', 'MANUFACTURING_COMPLETED',
                  'READY_FOR_QC', 'QC', 'QC_INSPECTION', 'QC_IN_PROGRESS', 'INSPECTION_PENDING', 'QC_HOLD',
                  'QC_REPORT_UPLOADED', 'PDI', 'PDI_HOLD', 'PDI_PENDING', 'AWAITING_PDI', 'PDI_COMPLETE',
                  'READY_FOR_DISPATCH', 'READY_TO_DISPATCH', 'DISPATCH_READY', 'INVOICE_GENERATED',
                  'DISPATCHED', 'PARTIALLY_DISPATCHED', 'IN_TRANSIT', 'DELIVERY_DELAYED', 'DELIVERED',
                  'INVOICED', 'PAYMENT_PENDING', 'COMPLETED', 'CLOSED'].includes(st);
                if (pastJobCard || isPdiPassed || allQcPassed) return false;
                return ['MATERIAL_READY', 'JOB_RELEASED'].includes(n) ||
                  ['MATERIAL_READY', 'READY_FOR_PRODUCTION', 'PLANNING', 'MATERIAL_ISSUED', 'MATERIAL_CHECKED', 'MATERIAL_VERIFIED'].includes(st);
              },
              renderActions: () => {
                const allowed = isRoleAuthorizedForCta(currentRole, 'CREATE_JOB_CARD');
                const lineCount = (order.lines || []).length;
                return (
                  <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 w-full sm:w-auto">
                    {useCtaPermission('CREATE_JOB_CARD') && (
                      <button
                        disabled={!allowed || lineCount === 0}
                        onClick={handleGoToCreateJobCard}
                        className="flex h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-[var(--accent-primary)] px-4 text-xs font-extrabold text-white shadow-[0_8px_20px_var(--accent-shadow)] transition-ui hover:bg-[var(--accent-hover)] active:scale-[0.96] cursor-pointer disabled:opacity-50 whitespace-nowrap"
                      >
                        <RefreshCw className="w-3.5 h-3.5 shrink-0" />
                        <span>Create Job Card ({lineCount} item{lineCount === 1 ? '' : 's'})</span>
                      </button>
                    )}
                  </div>
                );
              }
            },
            {
              id: 'stage-6a',
              stageNumber: 'Stage 6a',
              name: 'Subcontract Operations',
              role: 'Outwork & Subcontract Desk',
              description: 'External vendor processing for heat treatment, plating, or specialized machining operations.',
              icon: RefreshCw,
              isConditional: (o: CustomerOrder) => ['WITH_SUBCONTRACTOR', 'OUTWORK_DISPATCHED', 'OUTWORK_RECEIVED'].includes((o.status || o.stage || '').toUpperCase()),
              matchCurrent: (n: CanonicalOrderState, o: CustomerOrder) =>
                ['WITH_SUBCONTRACTOR', 'OUTWORK_DISPATCHED', 'OUTWORK_RECEIVED'].includes((o.status || '').toUpperCase()),
              renderActions: () => (
                <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 w-full sm:w-auto">
                  {(useCtaPermission('ISSUE_TO_SUBCONTRACTOR') || useCtaPermission('RECEIVE_FROM_SUBCONTRACTOR')) && (
                    <button
                      onClick={() => onNavigate?.('production')}
                      className="flex h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-[var(--accent-primary)] px-4 text-xs font-extrabold text-white shadow-[0_8px_20px_var(--accent-shadow)] transition-ui hover:bg-[var(--accent-hover)] active:scale-[0.96] cursor-pointer whitespace-nowrap"
                    >
                      <RefreshCw className="w-3.5 h-3.5 shrink-0" />
                      <span>Issue / Receive Subcontractor Outwork</span>
                    </button>
                  )}
                </div>
              )
            },
            {
              id: 'stage-7',
              stageNumber: 'Stage 7',
              name: 'Manufacturing Execution',
              role: 'Shop Floor & Machine Operators',
              description: 'Active CNC turning, milling, grinding, and route card operation execution on shop floor.',
              icon: Flame,
              matchCurrent: (n: CanonicalOrderState, o: CustomerOrder) =>
                n === 'IN_PRODUCTION' || ['IN_PRODUCTION', 'IN_PROGRESS', 'MANUFACTURING'].includes((o.status || '').toUpperCase()),
              renderActions: () => (
                <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 w-full sm:w-auto">
                  {(useCtaPermission('START_MANUFACTURING') || useCtaPermission('COMPLETE_STEP')) && (
                    <button
                      onClick={() => onNavigate?.('production')}
                      className="flex h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-[var(--accent-primary)] px-4 text-xs font-extrabold text-white shadow-[0_8px_20px_var(--accent-shadow)] transition-ui hover:bg-[var(--accent-hover)] active:scale-[0.96] cursor-pointer whitespace-nowrap"
                    >
                      <Flame className="w-3.5 h-3.5 shrink-0" />
                      <span>Log Production / Start Operations</span>
                    </button>
                  )}
                </div>
              )
            },
            {
              id: 'stage-7b',
              stageNumber: 'Stage 7b',
              name: 'Manufacturing Complete',
              role: 'Production Supervisor',
              description: 'All route card machining operations completed and logged on shop floor. Ready for QC clearance.',
              icon: CheckCircle,
              matchCurrent: (n: CanonicalOrderState, o: CustomerOrder) =>
                !allQcPassed && !isPdiPassed && ['MANUFACTURING_COMPLETED', 'READY_FOR_QC'].includes((o.status || o.stage || '').toUpperCase()),
              renderActions: () => (
                <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 w-full sm:w-auto">
                  {useCtaPermission('MARK_MANUFACTURING_COMPLETE') && (
                    <button
                      onClick={() => onNavigate?.('qc')}
                      className="flex h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-[var(--accent-primary)] px-4 text-xs font-extrabold text-white shadow-[0_8px_20px_var(--accent-shadow)] transition-ui hover:bg-[var(--accent-hover)] active:scale-[0.96] cursor-pointer whitespace-nowrap"
                    >
                      <span>Proceed to QC Queue ➔</span>
                    </button>
                  )}
                </div>
              )
            },
            {
              id: 'stage-8',
              stageNumber: 'Stage 8',
              name: 'Quality Control',
              role: 'QC Inspector',
              description: 'Dimensional audit, surface finish inspection, and tolerance verification against drawing.',
              icon: ShieldCheck,
              matchCurrent: (n: CanonicalOrderState, o: CustomerOrder) =>
                !allQcPassed && !isPdiPassed && (['QC', 'QC_INSPECTION'].includes(n) || ['QC', 'QC_INSPECTION', 'QC_IN_PROGRESS', 'INSPECTION_PENDING'].includes((o.status || '').toUpperCase())),
              renderActions: () => (
                <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 w-full sm:w-auto">
                  {allQcPassed && !hasNcr ? (
                    <button
                      onClick={() => {
                        if (onNavigateToPDI) onNavigateToPDI(order.poNo || order.id, order.jobCards?.[0]?.jobNo);
                        else if (onNavigate) onNavigate('pdi');
                        else pdiModal.open();
                      }}
                      title={`Inspect PDI for ${order.jobCards?.[0]?.jobNo || 'JC'} (${order.poNo || order.id})`}
                      className="flex h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-[var(--accent-primary)] px-4 text-xs font-extrabold text-white shadow-[0_8px_20px_var(--accent-shadow)] transition-ui hover:bg-[var(--accent-hover)] active:scale-[0.96] cursor-pointer whitespace-nowrap"
                    >
                      <ClipboardCheck className="w-3.5 h-3.5 shrink-0" />
                      <span>Proceed to PDI / Inspect PDI ➔</span>
                    </button>
                  ) : (
                    <button
                      onClick={() => onNavigate?.('qc')}
                      className="flex h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-[var(--accent-primary)] px-4 text-xs font-extrabold text-white shadow-[0_8px_20px_var(--accent-shadow)] transition-ui hover:bg-[var(--accent-hover)] active:scale-[0.96] cursor-pointer whitespace-nowrap"
                    >
                      <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
                      <span>Upload Quality Report / Perform QC</span>
                    </button>
                  )}
                </div>
              )
            },
            {
              id: 'stage-8a',
              stageNumber: 'Stage 8a',
              name: 'Pre-Dispatch Inspection (PDI)',
              role: 'Quality & Pre-Dispatch Inspector',
              description: 'Final compliance inspection, visual check, anti-rust coating, and protective packaging verification.',
              icon: ClipboardCheck,
              matchCurrent: (n: CanonicalOrderState, o: CustomerOrder) =>
                !isPdiPassed && ((allQcPassed && !hasNcr) || ['PDI', 'PDI_HOLD', 'QC_REPORT_UPLOADED'].includes(n) || ['PDI', 'PDI_PENDING', 'AWAITING_PDI', 'QC_REPORT_UPLOADED'].includes((o.status || '').toUpperCase())),
              renderActions: () => (
                <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 w-full sm:w-auto">
                  <button
                    onClick={() => {
                      if (onNavigateToPDI) onNavigateToPDI(order.poNo || order.id, order.jobCards?.[0]?.jobNo);
                      else if (onNavigate) onNavigate('pdi');
                      else pdiModal.open();
                    }}
                    title={`Inspect PDI for ${order.jobCards?.[0]?.jobNo || 'JC'} (${order.poNo || order.id})`}
                    className="flex h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-[var(--accent-primary)] px-4 text-xs font-extrabold text-white shadow-[0_8px_20px_var(--accent-shadow)] transition-ui hover:bg-[var(--accent-hover)] active:scale-[0.96] cursor-pointer whitespace-nowrap"
                  >
                    <ClipboardCheck className="w-3.5 h-3.5 shrink-0" />
                    <span>Inspect PDI</span>
                  </button>
                </div>
              )
            },
            {
              id: 'stage-8b',
              stageNumber: 'Stage 8b',
              name: 'QC Decision & Clearance',
              role: 'Quality Gatekeeper',
              description: 'Quality verification sign-off and Certificate of Compliance (CoC) clearance.',
              icon: ShieldAlert,
              matchCurrent: (n: CanonicalOrderState, o: CustomerOrder) =>
                !isPdiPassed && (['REWORK', 'QC_HOLD'].includes(n) || ['REWORK', 'QC_HOLD'].includes((o.status || '').toUpperCase()) || isQcHold || hasNcr),
              renderActions: () => (
                <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 w-full sm:w-auto">
                  <button
                    onClick={() => pdiModal.open()}
                    className="flex h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-[var(--accent-primary)] px-4 text-xs font-extrabold text-white shadow-[0_8px_20px_var(--accent-shadow)] transition-ui hover:bg-[var(--accent-hover)] active:scale-[0.96] cursor-pointer whitespace-nowrap"
                  >
                    <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
                    <span>Mark Ready to Dispatch</span>
                  </button>
                  <button
                    onClick={() => pdiModal.open()}
                    className="flex h-11 shrink-0 items-center justify-center gap-1.5 rounded-xl border border-rose-500/30 bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 dark:text-rose-400 px-3.5 text-xs font-semibold cursor-pointer transition-all active:scale-[0.98] whitespace-nowrap"
                  >
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                    <span>Raise NCR & Send to Rework</span>
                  </button>
                </div>
              )
            },
            {
              id: 'stage-9a',
              stageNumber: 'Stage 9a',
              name: 'Delivery Challan & Dispatch',
              role: 'Dispatch & Shipping Clerk',
              description: 'Pre-Dispatch Quality Inspection cleared. Issue statutory Delivery Challan (CHL-2627-####) and dispatch finished parts.',
              icon: Truck,
              matchCurrent: (n: CanonicalOrderState, o: CustomerOrder) =>
                !isDispatched && (['READY_FOR_DISPATCH', 'PDI_COMPLETE', 'DISPATCH_READY'].includes(n) || ['READY_TO_DISPATCH', 'READY_FOR_DISPATCH', 'PDI_COMPLETE', 'DISPATCH_READY'].includes((o.status || '').toUpperCase())),
              renderActions: () => {
                const allowed = isRoleAuthorizedForCta(currentRole, 'GENERATE_DELIVERY_CHALLAN');
                return (
                  <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 w-full sm:w-auto">
                    {!effectiveChallanNo ? (
                      <button
                        disabled={isConfirming || hasNcr || !allowed}
                        onClick={handleGoToCreateChallan}
                        className="flex h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-[var(--accent-primary)] px-4 text-xs font-extrabold text-white shadow-[0_8px_20px_var(--accent-shadow)] transition-ui hover:bg-[var(--accent-hover)] active:scale-[0.96] cursor-pointer disabled:opacity-50 whitespace-nowrap"
                      >
                        <Plus className="w-4 h-4 shrink-0" />
                        <span>Generate Delivery Challan</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={handleOpenChallanDetailModal}
                        className="flex h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-[var(--accent-primary)] px-4 text-xs font-extrabold text-white shadow-[0_8px_20px_var(--accent-shadow)] transition-ui hover:bg-[var(--accent-hover)] active:scale-[0.96] cursor-pointer whitespace-nowrap"
                      >
                        <Eye className="w-4 h-4 shrink-0" />
                        <span>View / Dispatch Challan ({effectiveChallanNo})</span>
                      </button>
                    )}
                  </div>
                );
              }
            },
            {
              id: 'stage-9',
              stageNumber: 'Stage 9',
              name: 'GST Tax Invoicing',
              role: 'Accounts & Finance Controller',
              description: 'Statutory GST Tax Invoice (INV-2627-####) generation against outward dispatch challan.',
              icon: Receipt,
              matchCurrent: (n: CanonicalOrderState, o: CustomerOrder) =>
                (isDispatched || ['DISPATCHED', 'PARTIALLY_DISPATCHED', 'INVOICE_GENERATED', 'INVOICED'].includes(n) || ['DISPATCHED', 'PARTIALLY_DISPATCHED'].includes((o.status || '').toUpperCase())) && (!effectiveInvoiceNo || effectiveInvoiceNo === ''),
              renderActions: () => {
                const allowed = isRoleAuthorizedForCta(currentRole, 'GENERATE_INVOICE');
                if (effectiveInvoiceNo) {
                  return (
                    <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 w-full sm:w-auto">
                      <span className="text-xs font-mono font-bold px-3 py-1.5 rounded-xl bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Invoice: {effectiveInvoiceNo}</span>
                      </span>
                      {onNavigate && (
                        <button
                          onClick={() => onNavigate('invoices')}
                          className={`flex h-11 shrink-0 items-center justify-center gap-1.5 rounded-xl border px-3.5 text-xs font-semibold transition-all cursor-pointer whitespace-nowrap active:scale-[0.98] ${isDarkMode
                            ? 'border-white/10 bg-white/[0.04] text-slate-300 hover:bg-white/10 hover:text-white'
                            : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-100 shadow-xs'
                            }`}
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                          <span>View in Invoices</span>
                        </button>
                      )}
                    </div>
                  );
                }
                return (
                  <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 w-full sm:w-auto">
                    <button
                      disabled={isConfirming || !allowed}
                      onClick={handleGoToCreateInvoice}
                      className="flex h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-[var(--accent-primary)] px-4 text-xs font-extrabold text-white shadow-[0_8px_20px_var(--accent-shadow)] transition-ui hover:bg-[var(--accent-hover)] active:scale-[0.96] cursor-pointer disabled:opacity-50 whitespace-nowrap"
                    >
                      <Receipt className="w-3.5 h-3.5 shrink-0" />
                      <span>Generate GST Tax Invoice</span>
                    </button>
                  </div>
                );
              }
            },
            {
              id: 'stage-10a',
              stageNumber: 'Stage 10a',
              name: 'Order Received / Delivery Status',
              role: 'Dispatch & Transport Desk',
              description: 'Confirm customer receipt (with mandatory POD) or record in-transit delivery delay.',
              icon: CheckCircle2,
              matchCurrent: (n: CanonicalOrderState, o: CustomerOrder) =>
                (Boolean(effectiveInvoiceNo) || isDispatched || ['DISPATCHED', 'IN_TRANSIT', 'PARTIALLY_DISPATCHED', 'DELIVERY_DELAYED'].includes((o.status || '').toUpperCase())) &&
                !['DELIVERED', 'COMPLETED', 'CLOSED'].includes((o.status || '').toUpperCase()) &&
                !Boolean(o.podDocumentUrl || o.podReceivedDate),
              renderActions: () => {
                const isDelayed = (order.status || order.stage || '').toUpperCase() === 'DELIVERY_DELAYED';

                return (
                  <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 w-full sm:w-auto">
                    {isDelayed && (
                      <span className="text-xs font-mono font-bold px-3 py-1.5 rounded-xl bg-amber-500/15 text-amber-400 border border-amber-500/30 whitespace-nowrap shrink-0 flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-amber-400" />
                        <span>Delivery Delayed {order.delayedReason ? `(${order.delayedReason})` : ''}</span>
                      </span>
                    )}
                    {allowedDelivered && (
                      <button
                        disabled={isConfirming}
                        onClick={() => deliveryModal.open()}
                        className="flex h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-[var(--accent-primary)] px-4 text-xs font-extrabold text-white shadow-[0_8px_20px_var(--accent-shadow)] transition-ui hover:bg-[var(--accent-hover)] active:scale-[0.96] cursor-pointer disabled:opacity-50 whitespace-nowrap"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                        <span>Mark Delivered (POD)</span>
                      </button>
                    )}
                    {!isDelayed && canMarkDelayed && (
                      <button
                        disabled={isConfirming}
                        onClick={() => delayedModal.open()}
                        className="flex h-11 shrink-0 items-center justify-center gap-1.5 rounded-xl border border-amber-500/30 bg-amber-500/10 hover:bg-amber-500/20 text-amber-500 dark:text-amber-400 px-3.5 text-xs font-semibold cursor-pointer transition-all active:scale-[0.98] disabled:opacity-50 whitespace-nowrap"
                      >
                        <Clock className="w-3.5 h-3.5 shrink-0" />
                        <span>Mark Delayed</span>
                      </button>
                    )}
                  </div>
                );
              }
            },
            {
              id: 'stage-11',
              stageNumber: 'Stage 11',
              name: 'Payment Collection',
              role: 'Accounts & Finance Controller',
              description: 'Record customer payment against the issued invoice after goods are received.',
              icon: CreditCard,
              matchCurrent: (n: CanonicalOrderState, o: CustomerOrder) => {
                const status = (o.status || o.stage || '').toUpperCase();
                const isGenuinelyDelivered = ['DELIVERED', 'PAYMENT_PENDING'].includes(status) || Boolean(o.podReceivedDate) || Boolean(o.podDocumentUrl);
                const isDelayed = status === 'DELIVERY_DELAYED';
                return isGenuinelyDelivered && !isDelayed && !['COMPLETED', 'CLOSED'].includes(status) && (remainingOutstanding > 0 || o.paymentStatus !== 'PAID');
              },
              renderActions: () => {
                const allowed = isRoleAuthorizedForCta(currentRole, 'RECORD_PAYMENT');
                const isPartial = currentPaid > 0 && remainingOutstanding > 0;
                return (
                  <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 w-full sm:w-auto">
                    {isPartial && (
                      <span className="text-xs font-mono font-bold px-3 py-1.5 rounded-xl bg-amber-500/15 text-amber-400 border border-amber-500/30 whitespace-nowrap shrink-0">
                        ₹{currentPaid.toLocaleString('en-IN')} of ₹{gross.toLocaleString('en-IN')} received (₹{remainingOutstanding.toLocaleString('en-IN')} due)
                      </span>
                    )}
                    <button
                      disabled={isConfirming || !allowed}
                      onClick={() => paymentModal.open()}
                      title={!allowed ? 'Only Finance / Accounts or Owner can record payment' : undefined}
                      className="flex h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-[var(--accent-primary)] px-4 text-xs font-extrabold text-white shadow-[0_8px_20px_var(--accent-shadow)] transition-ui hover:bg-[var(--accent-hover)] active:scale-[0.96] cursor-pointer disabled:opacity-50 whitespace-nowrap"
                    >
                      <CreditCard className="w-3.5 h-3.5 shrink-0" />
                      <span>{isPartial ? 'Record Remaining Payment' : 'Record Payment'}</span>
                    </button>
                  </div>
                );
              }
            },
            {
              id: 'stage-11a',
              stageNumber: 'Stage 11a',
              name: 'Order Closure',
              role: 'Finance Controller / Owner',
              description: 'Finalize and lock this order. Requires delivery confirmation and full payment.',
              icon: Lock,
              matchCurrent: (n: CanonicalOrderState, o: CustomerOrder) =>
                ['COMPLETED', 'CLOSED'].includes((o.status || '').toUpperCase()) ||
                ((['DELIVERED'].includes((o.status || '').toUpperCase()) || Boolean(o.podReceivedDate)) && (remainingOutstanding <= 0 || o.paymentStatus === 'PAID')),
              renderActions: () => {
                const isDeliveredState = ['DELIVERED', 'COMPLETED', 'CLOSED'].includes((order.status || '').toUpperCase()) || Boolean(order.podReceivedDate);
                const isFullyPaidState = remainingOutstanding <= 0 || order.paymentStatus === 'PAID';
                const canClose = isDeliveredState && isFullyPaidState;
                const isClosed = order.status === 'CLOSED' || order.status === 'COMPLETED';

                let disabledReason = '';
                if (!isDeliveredState) {
                  disabledReason = 'Awaiting delivery confirmation (POD required)';
                } else if (!isFullyPaidState) {
                  disabledReason = `Awaiting full payment — ₹${currentPaid.toLocaleString('en-IN')} of ₹${gross.toLocaleString('en-IN')} received`;
                }

                return (
                  <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 w-full sm:w-auto">
                    {!isClosed && canMarkOrderClosed && (
                      <button
                        disabled={isConfirming || !canClose}
                        onClick={handleCloseOrderAction}
                        title={!canClose ? disabledReason : undefined}
                        className="flex h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-[var(--accent-primary)] px-4 text-xs font-extrabold text-white shadow-[0_8px_20px_var(--accent-shadow)] transition-ui hover:bg-[var(--accent-hover)] active:scale-[0.96] cursor-pointer disabled:opacity-50 whitespace-nowrap"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                        <span>Mark Order Closed</span>
                      </button>
                    )}
                    {isClosed && (
                      <span className="px-3 py-1.5 rounded-xl text-xs font-mono font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1.5 whitespace-nowrap shrink-0">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Order Closed & Locked</span>
                      </span>
                    )}
                  </div>
                );
              }
            }
          ];

          const visibleStages = stageDefinitions.filter(s => !s.isConditional || s.isConditional(order));

          let activeIndex = -1;
          for (let i = 0; i < visibleStages.length; i++) {
            if (visibleStages[i].matchCurrent(norm, order)) {
              activeIndex = i;
              break;
            }
          }
          if (order.status === 'CLOSED' || order.status === 'COMPLETED') {
            activeIndex = visibleStages.length - 1;
          }

          const isUnmatchedStage = activeIndex === -1;
          if (isUnmatchedStage) {
            console.warn(
              `[OrderDetailView] Order ${order.poNo || order.id} status='${order.status}', stage='${order.stage}', norm='${norm}' did not match any known lifecycle stage. Using best-guess fallback.`
            );
            // Search visibleStages in reverse for the highest-indexed stage whose isConditional evaluates true
            for (let i = visibleStages.length - 1; i >= 0; i--) {
              if (visibleStages[i].isConditional && visibleStages[i].isConditional!(order)) {
                activeIndex = i;
                break;
              }
            }
            if (activeIndex === -1) {
              activeIndex = 0;
            }
          }

          const currentStageDef = visibleStages[activeIndex] || visibleStages[0];
          if (!currentStageDef) return null;

          const StageIcon = currentStageDef.icon;
          const isClosed = order.status === 'CLOSED' || order.status === 'COMPLETED';

          return (
            <div className="space-y-2.5 w-full">
              {isUnmatchedStage && !isUnmatchedBannerDismissed && (
                <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-600 dark:text-amber-400 text-xs font-mono flex items-center justify-between gap-3 relative z-10 animate-fade-in">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    <span>
                      Order status &apos;{order.status}&apos; didn&apos;t match a known lifecycle stage — showing best guess. Please report this.
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsUnmatchedBannerDismissed(true)}
                    className="p-1 hover:bg-amber-500/20 rounded-lg transition-colors cursor-pointer"
                    title="Dismiss warning"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
              <div
                key={currentStageDef.id}
                className={`p-4 sm:p-5 rounded-2xl border transition-all w-full relative overflow-hidden backdrop-blur-xl ${isDarkMode
                  ? 'bg-slate-900/80 border-white/10 shadow-[0_4px_24px_rgba(0,0,0,0.3)] text-white'
                  : 'bg-white/90 border-slate-200/80 shadow-[0_4px_20px_rgba(0,0,0,0.04)] text-slate-900'
                  }`}
              >
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3.5 w-full relative z-10">
                  <div className="flex items-start sm:items-center gap-3.5 min-w-0 flex-1">
                    <div className={`w-10 h-10 rounded-xl shrink-0 flex items-center justify-center transition-all ${isDarkMode
                      ? 'bg-blue-500/15 text-[#7B92FF] border border-blue-500/20'
                      : 'bg-blue-50 text-[#5B75F8] border border-blue-100 shadow-2xs'
                      }`}>
                      <StageIcon className="w-5 h-5 stroke-[2]" />
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`text-[11px] font-semibold uppercase px-2 py-0.5 rounded-md shrink-0 ${isDarkMode
                          ? 'bg-blue-500/15 text-[#7B92FF] border border-blue-500/20'
                          : 'bg-blue-50 text-[#5B75F8] border border-blue-100'
                          }`}>
                          {currentStageDef.stageNumber}
                        </span>

                        <h3 className="font-semibold text-sm sm:text-base tracking-tight">
                          {currentStageDef.name}
                        </h3>

                        <span className={`text-[11px] font-medium px-2.5 py-0.5 rounded-full flex items-center gap-1.5 shrink-0 ${isClosed
                          ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                          : 'bg-blue-500/10 text-[#5B75F8] dark:text-[#7B92FF] border border-blue-500/20'
                          }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${isClosed ? 'bg-emerald-500' : 'bg-[#5B75F8] animate-pulse'}`} />
                          <span>{isClosed ? 'Order Closed' : 'Active Stage'}</span>
                        </span>

                        <span className={`hidden sm:inline text-[11px] font-medium px-2 py-0.5 rounded-md shrink-0 ${isDarkMode ? 'bg-slate-800 text-slate-300 border border-white/5' : 'bg-slate-100 text-slate-600 border border-slate-200/60'
                          }`}>
                          {currentStageDef.role}
                        </span>
                      </div>

                      <p className={`text-xs mt-1 leading-relaxed ${isDarkMode ? 'text-slate-400' : 'text-slate-500'
                        }`}>
                        {currentStageDef.description}
                      </p>
                    </div>
                  </div>

                  {/* Action Buttons Right-Aligned */}
                  <div className="w-full lg:w-auto flex items-center justify-start lg:justify-end shrink-0 pt-2.5 lg:pt-0 border-t lg:border-t-0 border-slate-100 dark:border-white/5">
                    {currentStageDef.renderActions && currentStageDef.renderActions()}
                  </div>
                </div>
              </div>
            </div>
          );
        })()}
      </div>

      {/* 3. Executive KPI & Order Metadata Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4 font-mono">

        {/* Card 1: Gross Commercials */}
        <div className={`p-3.5 sm:p-5 rounded-2xl sm:rounded-3xl border transition-ui ${isDarkMode ? 'bg-slate-900/70 border-slate-800/80' : 'bg-white border-slate-200 shadow-xs'
          }`}>
          <div className="flex items-center justify-between mb-2 sm:mb-3">
            <span className="text-[10px] sm:text-[11px] text-slate-400 uppercase font-bold tracking-wider">Gross Value</span>
            <div className="p-1.5 sm:p-2 rounded-xl bg-emerald-500/15 text-emerald-500">
              <DollarSign className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </div>
          </div>
          <div className="text-base sm:text-xl font-bold text-emerald-600 dark:text-emerald-400 tracking-tight">
            ₹{order.grossAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>
          <div className="mt-2 flex items-center justify-between text-[10px] sm:text-[11px] text-slate-400 pt-2 border-t border-slate-100 dark:border-slate-800">
            <span>Tax Bracket:</span>
            <span className={`font-bold ${isDarkMode ? 'text-slate-200' : 'text-slate-800'}`}>{order.taxCategory || 'GST 18%'}</span>
          </div>
        </div>

        {/* Card 2: Delivery & Timeline */}
        <div className={`p-3.5 sm:p-5 rounded-2xl sm:rounded-3xl border transition-ui ${isDarkMode ? 'bg-slate-900/70 border-slate-800/80' : 'bg-white border-slate-200 shadow-xs'
          }`}>
          <div className="flex items-center justify-between mb-2 sm:mb-3">
            <span className="text-[10px] sm:text-[11px] text-slate-400 uppercase font-bold tracking-wider">Target Date</span>
            <div className="p-1.5 sm:p-2 rounded-xl bg-amber-500/15 text-amber-500">
              <Calendar className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </div>
          </div>
          <div className="text-base sm:text-xl font-bold text-amber-600 dark:text-amber-400 tracking-tight truncate">
            {order.deliveryDate || '—'}
          </div>
          <div className="mt-2 flex items-center justify-between text-[10px] sm:text-[11px] text-slate-400 pt-2 border-t border-slate-100 dark:border-slate-800">
            <span>PO Raised:</span>
            <span className={`font-bold ${isDarkMode ? 'text-slate-200' : 'text-slate-800'}`}>{order.poDate || '—'}</span>
          </div>
        </div>

        {/* Card 3: Quality & Heat Traceability */}
        <div className={`p-3.5 sm:p-5 rounded-2xl sm:rounded-3xl border transition-ui ${isDarkMode ? 'bg-slate-900/70 border-slate-800/80' : 'bg-white border-slate-200 shadow-xs'
          }`}>
          <div className="flex items-center justify-between mb-2 sm:mb-3">
            <span className="text-[10px] sm:text-[11px] text-slate-400 uppercase font-bold tracking-wider">QA Gate</span>
            <div className={`p-1.5 sm:p-2 rounded-xl ${isQcRejected ? 'bg-rose-500/15 text-rose-500' : isQcHold || hasNcr ? 'bg-amber-500/15 text-amber-500' : 'bg-blue-500/15 text-blue-500'
              }`}>
              <ShieldCheck className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </div>
          </div>
          <div className="text-xs sm:text-sm font-bold truncate">
            {order.heatLotNumber ? (
              <span className="text-amber-500 font-bold">{order.heatLotNumber}</span>
            ) : (
              <span className="text-slate-400 font-normal">Pending Issue</span>
            )}
          </div>
          <div className="mt-2 flex items-center justify-between text-[10px] sm:text-[11px] text-slate-400 pt-2 border-t border-slate-100 dark:border-slate-800">
            <span>QA Status:</span>
            <span className={`font-bold ${isQcRejected ? 'text-rose-500' : isQcHold || hasNcr ? 'text-amber-500' : 'text-emerald-500'}`}>
              {isQcRejected ? 'Rejected' : isQcHold || hasNcr ? 'Hold' : 'Cleared'}
            </span>
          </div>
        </div>

        {/* Card 4: Fulfillment Progress */}
        <div className={`p-3.5 sm:p-5 rounded-2xl sm:rounded-3xl border transition-ui ${isDarkMode ? 'bg-slate-900/70 border-slate-800/80' : 'bg-white border-slate-200 shadow-xs'
          }`}>
          <div className="flex items-center justify-between mb-2 sm:mb-3">
            <span className="text-[10px] sm:text-[11px] text-slate-400 uppercase font-bold tracking-wider">Dispatched</span>
            <div className="p-1.5 sm:p-2 rounded-xl bg-purple-500/15 text-purple-500">
              <Package className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </div>
          </div>
          <div className="text-base sm:text-xl font-bold text-indigo-600 dark:text-indigo-400 tracking-tight">
            {totalDispatchedQty} / {totalOrderedQty} <span className="text-[10px] sm:text-xs font-normal text-slate-400">units</span>
          </div>
          <div className="mt-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            <div className="w-full bg-slate-200 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
              <div
                className="bg-gradient-to-r from-[#5B75F8] to-emerald-500 h-full rounded-full transition-[width] duration-500"
                style={{ width: `${fulfillmentPercentage}%` }}
              />
            </div>
          </div>
        </div>

      </div>

      {/* 4. Client PO Document & Special Instructions Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 sm:gap-4 font-mono text-xs">

        <div className={`p-4 sm:p-5 rounded-2xl sm:rounded-3xl border flex items-center justify-between gap-3 ${isDarkMode ? 'bg-slate-900/70 border-slate-800/80 text-white' : 'bg-white border-slate-200 text-slate-900 shadow-xs'
          }`}>
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-2 sm:p-2.5 rounded-2xl bg-[#5B75F8]/20 text-[#7B92FF] shrink-0">
              <FileText className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div className="min-w-0">
              <span className="font-bold block text-xs sm:text-sm font-sans">Client PO Document</span>
              <span className="text-slate-400 text-[10px] sm:text-[11px] block mt-0.5 truncate">{poFileName ? poFileName : 'No document attached yet'}</span>
            </div>
          </div>
          <button
            onClick={() => uploadPoModal.open()}
            className="px-3 py-1.5 sm:px-3.5 sm:py-1.5 rounded-xl border border-[#5B75F8]/30 bg-[#5B75F8]/10 text-[#5B75F8] dark:text-[#7B92FF] font-bold hover:bg-[#5B75F8]/20 cursor-pointer text-[11px] sm:text-xs flex items-center gap-1.5 transition-ui shrink-0"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Upload</span>
          </button>
        </div>

        <div className={`p-4 sm:p-5 rounded-2xl sm:rounded-3xl border flex items-center gap-3 ${isDarkMode ? 'bg-slate-900/70 border-slate-800/80 text-white' : 'bg-white border-slate-200 text-slate-900 shadow-xs'
          }`}>
          <div className="p-2 sm:p-2.5 rounded-2xl bg-amber-500/20 text-amber-400 shrink-0">
            <Tag className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
          <div className="overflow-hidden">
            <span className="font-bold block text-xs sm:text-sm font-sans">Special Instructions</span>
            <span className={`text-[10px] sm:text-[11px] block mt-0.5 truncate ${isDarkMode ? 'text-slate-300' : 'text-slate-600'}`}>
              {order.remark || 'No special order notes recorded.'}
            </span>
          </div>
        </div>

      </div>

      {/* 5. LINE ITEMS SECTION */}
      <div className={`p-4 sm:p-6 rounded-2xl sm:rounded-3xl border space-y-4 font-mono text-xs transition-ui shadow-lg ${isDarkMode ? 'bg-slate-900/80 border-slate-800/80 backdrop-blur-xl text-white' : 'bg-white border-slate-200 text-slate-900 shadow-xs'
        }`}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 sm:gap-4 border-b border-slate-200 dark:border-slate-800 pb-3">
          <h3 className="font-bold uppercase tracking-wider text-[#5B75F8] dark:text-[#7B92FF] text-xs sm:text-sm flex items-center gap-2">
            <Package className="w-4 h-4" />
            <span>Order Line Items ({order.lines?.length || 0})</span>
          </h3>
          <span className="text-slate-400 text-[11px] sm:text-xs">Gross Line Total: ₹{order.grossAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
        </div>

        {/* Mobile Line Items Cards (< md) */}
        <div className="block md:hidden space-y-2.5">
          {order.lines.map((ln, idx) => (
            <div key={ln.id} className={`p-3.5 rounded-2xl border transition-ui space-y-2.5 ${isDarkMode ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50 border-slate-200'
              }`}>
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-bold">
                      #{idx + 1}
                    </span>
                    <span className="font-mono font-bold text-xs text-[#5B75F8] dark:text-[#7B92FF] truncate">
                      {ln.itemCode}
                    </span>
                    <LineItemProgressBadge
                      progress={lineProgress.find(p => p.itemCode === ln.itemCode) || {
                        itemCode: ln.itemCode,
                        jcTotal: 0,
                        jcCompleted: 0,
                        qcStatus: null,
                        pdiStatus: null,
                        dispatchedQty: ln.dispatchedQty || 0,
                        invoiceStatus: order.paymentStatus || null
                      }}
                      orderPo={order.poNo || order.id}
                      onNavigateToCreateJobCard={onNavigateToCreateJobCard}
                      onNavigateToPDI={onNavigateToPDI}
                      isDarkMode={isDarkMode}
                    />
                  </div>
                  <div className="text-xs font-semibold mt-1 text-slate-800 dark:text-slate-200 font-sans line-clamp-2">
                    {ln.itemDescription}
                  </div>
                  {ln.custPartNo && (
                    <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                      Part No: {ln.custPartNo}
                    </div>
                  )}
                </div>
                <div className="text-right shrink-0">
                  <div className="text-xs sm:text-sm font-bold font-mono text-emerald-600 dark:text-emerald-400">
                    ₹{(Number(ln.orderQty) * Number(ln.rate)).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </div>
                  <div className="text-[9px] text-slate-400 font-mono">
                    @ ₹{ln.rate.toFixed(2)} / {ln.unit}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-1.5 pt-2 border-t border-slate-200 dark:border-slate-800/80 text-[10px] font-mono text-center">
                <div className="p-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                  <div className="text-[8px] text-slate-400 uppercase">Ordered</div>
                  <div className="font-bold text-slate-800 dark:text-slate-100">{ln.orderQty} {ln.unit}</div>
                </div>
                <div className="p-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                  <div className="text-[8px] text-emerald-500 uppercase">Dispatched</div>
                  <div className="font-bold text-emerald-600 dark:text-emerald-400">{ln.dispatchedQty || 0}</div>
                </div>
                <div className="p-1.5 rounded-xl bg-amber-500/10 border border-amber-500/20">
                  <div className="text-[8px] text-amber-500 uppercase">Pending</div>
                  <div className="font-bold text-amber-600 dark:text-amber-400">{ln.pendingQty || 0}</div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Desktop Line Items Table (>= md) */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className={`border-b text-[10px] font-bold uppercase tracking-wider ${isDarkMode ? 'text-slate-400 border-slate-800' : 'text-slate-500 border-slate-200'
                }`}>
                <th className="py-3 px-4">#</th>
                <th className="py-3 px-4">Item Code & Description</th>
                <th className="py-3 px-4">Customer Part #</th>
                <th className="py-3 px-4 text-center">Progress</th>
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
                  <td className="py-3.5 px-4 text-center">
                    <LineItemProgressBadge
                      progress={lineProgress.find(p => p.itemCode === ln.itemCode) || {
                        itemCode: ln.itemCode,
                        jcTotal: 0,
                        jcCompleted: 0,
                        qcStatus: null,
                        pdiStatus: null,
                        dispatchedQty: ln.dispatchedQty || 0,
                        invoiceStatus: order.paymentStatus || null
                      }}
                      orderPo={order.poNo || order.id}
                      onNavigateToCreateJobCard={onNavigateToCreateJobCard}
                      onNavigateToPDI={onNavigateToPDI}
                      isDarkMode={isDarkMode}
                    />
                  </td>
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

      {/* Closure Summary — shown only for settled orders */}
      {['COMPLETED', 'CLOSED', 'PAID'].includes((order.status || order.stage || '').toUpperCase()) && (
        <OrderClosureSummaryCard
          isDarkMode={isDarkMode}
          closedAt={order.closedAt}
          closedBy={order.closedBy}
          paymentStatus={order.paymentStatus}
          podReceivedDate={order.podReceivedDate}
          podReceivedBy={order.podReceivedBy}
          invoiceNo={order.invoiceNo}
          totalJobCards={order.jobCards?.length || 0}
          completedJobCards={(order.jobCards || []).filter(j => (j.status || '').toUpperCase() === 'COMPLETED').length}
          onNavigateToProduction={onNavigateToCreateJobCard ? () => onNavigateToCreateJobCard(order.poNo || order.id) : undefined}
        />
      )}

      {/* Upload Modal */}
      {uploadPoModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md font-sans">
          <div className={`relative w-full max-w-md rounded-3xl border p-6 space-y-4 font-sans text-xs z-10 shadow-2xl transition-ui ${isDarkMode ? 'bg-slate-950 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
            }`}>
            <div className={`flex items-center justify-between border-b pb-3 ${isDarkMode ? 'border-slate-800' : 'border-slate-200'}`}>
              <h3 className="font-bold text-sm uppercase text-[#5B75F8] dark:text-[#7B92FF]">Upload Client PO Document</h3>
              <button
                onClick={() => uploadPoModal.close()}
                className={`p-1 rounded-xl transition-ui cursor-pointer ${isDarkMode ? 'text-slate-400 hover:text-white hover:bg-slate-800' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'}`}
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div>
              <p className={`text-xs mb-3 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                Upload PDF or image file of the customer purchase order
              </p>
              <input
                type="file"
                onChange={handleFileUpload}
                className={`w-full p-3 border rounded-xl text-xs cursor-pointer ${isDarkMode ? 'border-slate-800 bg-slate-900 text-white' : 'border-slate-300 bg-slate-50 text-slate-800'
                  }`}
              />
            </div>
            <div className={`pt-3 flex justify-end border-t ${isDarkMode ? 'border-slate-800' : 'border-slate-200'}`}>
              <button
                onClick={() => uploadPoModal.close()}
                className={`px-4 py-2 rounded-xl border text-xs font-bold transition-ui cursor-pointer ${isDarkMode ? 'border-slate-800 text-slate-400 hover:text-white hover:bg-slate-900' : 'border-slate-300 text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Order Modal */}
      {editOrderModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md font-sans">
          <div className={`relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl border shadow-2xl p-6 transition-ui ${isDarkMode ? 'bg-slate-900/95 border-slate-800 text-white backdrop-blur-2xl' : 'bg-white border-slate-200 text-slate-900 shadow-2xl'
            }`}>
            <div className={`flex items-center justify-between pb-4 border-b ${isDarkMode ? 'border-slate-800' : 'border-slate-200'}`}>
              <div className="flex items-center gap-3">
                <div className={`p-2.5 rounded-2xl border ${isDarkMode ? 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30' : 'bg-indigo-50 text-indigo-600 border-indigo-200'
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
                onClick={() => editOrderModal.close()}
                className={`p-2 rounded-2xl border transition-ui cursor-pointer ${isDarkMode
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
                    className={`w-full p-2.5 rounded-xl border font-mono text-xs outline-none transition-ui ${isDarkMode ? 'bg-slate-950/80 border-slate-800 text-white focus:border-indigo-500' : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-indigo-500 focus:bg-white'
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
                    className={`w-full p-2.5 rounded-xl border text-xs outline-none opacity-80 cursor-not-allowed ${isDarkMode ? 'bg-slate-950/40 border-slate-800 text-slate-300' : 'bg-slate-100 border-slate-200 text-slate-700'
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
                    className={`w-full p-2.5 rounded-xl border text-xs font-mono outline-none ${isDarkMode ? 'bg-slate-950/80 border-slate-800 text-white' : 'bg-slate-50 border-slate-200 text-slate-900 focus:bg-white'
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
                    className={`w-full p-2.5 rounded-xl border text-xs font-mono outline-none cursor-pointer ${isDarkMode ? 'bg-slate-950/80 border-slate-800 text-white' : 'bg-slate-50 border-slate-200 text-slate-900 focus:bg-white'
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
                  className={`w-full p-2.5 rounded-xl border text-xs outline-none ${isDarkMode ? 'bg-slate-950/80 border-slate-800 text-white' : 'bg-slate-50 border-slate-200 text-slate-900 focus:bg-white'
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
                  className={`w-full p-2.5 rounded-xl border text-xs outline-none ${isDarkMode ? 'bg-slate-950/80 border-slate-800 text-white' : 'bg-slate-50 border-slate-200 text-slate-900 focus:bg-white'
                    }`}
                />
              </div>

              {/* Line Items */}
              <div className={`p-3.5 rounded-2xl border space-y-2 ${isDarkMode ? 'bg-slate-800/40 border-slate-700/60' : 'bg-slate-50 border-slate-200'
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
                  <div key={line.id || idx} className={`p-3 rounded-xl border space-y-2 ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-xs'
                    }`}>
                    <div className="grid grid-cols-3 gap-2">
                      <input
                        type="text"
                        placeholder="Item Code"
                        value={line.itemCode}
                        onChange={(e) => updateEditLineItem(idx, 'itemCode', e.target.value)}
                        className={`p-2 rounded-lg border font-mono text-xs outline-none ${isDarkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-900 focus:bg-white'
                          }`}
                      />
                      <input
                        type="text"
                        placeholder="Description"
                        value={line.itemDescription}
                        onChange={(e) => updateEditLineItem(idx, 'itemDescription', e.target.value)}
                        className={`col-span-2 p-2 rounded-lg border text-xs outline-none ${isDarkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-900 focus:bg-white'
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
                          className={`w-full p-1.5 rounded-lg border font-mono text-xs outline-none ${isDarkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-900 focus:bg-white'
                            }`}
                        />
                      </div>
                      <div>
                        <label className={`text-[9px] font-mono ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Qty ({line.unit || 'NOS'})</label>
                        <input
                          type="number"
                          value={line.orderQty}
                          onChange={(e) => updateEditLineItem(idx, 'orderQty', Number(e.target.value))}
                          className={`w-full p-1.5 rounded-lg border font-mono font-bold text-xs outline-none ${isDarkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-900 focus:bg-white'
                            }`}
                        />
                      </div>
                      <div>
                        <label className={`text-[9px] font-mono ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Unit Rate ₹</label>
                        <input
                          type="number"
                          value={line.rate}
                          onChange={(e) => updateEditLineItem(idx, 'rate', Number(e.target.value))}
                          className={`w-full p-1.5 rounded-lg border font-mono text-xs outline-none ${isDarkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-900 focus:bg-white'
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
              <div className={`flex items-center justify-between p-3 rounded-xl font-mono border ${isDarkMode ? 'bg-slate-950 border-slate-800' : 'bg-slate-100 border-slate-200'
                }`}>
                <span className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>Calculated Total:</span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400 text-sm">
                  ₹{editTotalGross.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
              </div>

              <div className={`flex justify-end gap-3 pt-3 border-t ${isDarkMode ? 'border-slate-800' : 'border-slate-200'}`}>
                <button
                  type="button"
                  onClick={() => editOrderModal.close()}
                  className={`px-4 py-2 rounded-xl text-xs font-mono font-bold cursor-pointer transition-ui ${isDarkMode ? 'text-slate-400 hover:text-white' : 'border border-slate-200 text-slate-600 hover:bg-slate-100 text-slate-700'
                    }`}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-blue-600 hover:to-indigo-600 text-white font-bold text-xs font-mono shadow-lg cursor-pointer transition-ui hover:scale-[1.02] active:scale-[0.96] flex items-center gap-1.5"
                >
                  <Save className="w-4 h-4" />
                  <span>Save Changes</span>
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* 1. PRE-DISPATCH INSPECTION (PDI) MODAL */}
      {pdiModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md font-sans">
          <div className={`relative w-full max-w-xl rounded-3xl border p-6 space-y-4 font-sans text-xs z-10 shadow-2xl transition-ui ${isDarkMode ? 'bg-slate-950 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900 shadow-slate-200/50'
            }`}>
            {/* Header */}
            <div className={`flex items-center justify-between border-b pb-4 ${isDarkMode ? 'border-slate-800' : 'border-slate-200'
              }`}>
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-2xl bg-gradient-to-br from-[#5B75F8]/20 to-indigo-500/20 text-[#5B75F8] dark:text-[#7B92FF]">
                  <ClipboardCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm uppercase tracking-tight text-[#5B75F8] dark:text-[#7B92FF]">
                    Pre-Dispatch Inspection (PDI)
                  </h3>
                  <p className={`text-[11px] mt-0.5 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                    Quality verification & Compliance Certificate Clearance
                  </p>
                </div>
              </div>
              <button
                onClick={() => pdiModal.close()}
                className={`p-1.5 rounded-xl transition-ui cursor-pointer ${isDarkMode ? 'text-slate-400 hover:text-white hover:bg-slate-800' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
                  }`}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {pdiError && (
              <div className="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-500 dark:text-rose-400 text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{pdiError}</span>
              </div>
            )}

            <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
              {/* Order & Part Summary Box */}
              <div className={`p-3.5 rounded-2xl border space-y-2 ${isDarkMode ? 'bg-slate-900/60 border-slate-800/90' : 'bg-slate-50 border-slate-200'
                }`}>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                  <div>
                    <span className={`text-[10px] font-bold uppercase ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Order PO #</span>
                    <div className="font-bold truncate">{order.poNo}</div>
                  </div>
                  <div>
                    <span className={`text-[10px] font-bold uppercase ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Customer</span>
                    <div className="font-bold truncate">{order.customerName}</div>
                  </div>
                  <div className="col-span-2 sm:col-span-1">
                    <span className={`text-[10px] font-bold uppercase ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Total Ordered Qty</span>
                    <div className="font-bold text-emerald-500 dark:text-emerald-400 font-mono">{totalOrderedQty} NOS</div>
                  </div>
                </div>

                {order.lines && order.lines.length > 0 && (
                  <div className={`pt-2 border-t flex flex-wrap gap-1.5 ${isDarkMode ? 'border-slate-800' : 'border-slate-200'}`}>
                    {order.lines.map((l, i) => (
                      <span key={l.id || i} className={`px-2 py-0.5 rounded-lg text-[10px] font-mono border ${isDarkMode ? 'bg-slate-950 border-slate-800 text-slate-300' : 'bg-white border-slate-200 text-slate-700'
                        }`}>
                        {l.itemCode} • {l.orderQty} {l.unit || 'NOS'}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* 4-Point Quality & Compliance Checklist */}
              <div className="space-y-2">
                <label className={`block text-[11px] font-bold uppercase tracking-wider ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                  4-Point Quality & Compliance Checklist
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {[
                    { key: 'visualFinish', label: '1. Visual Finish & Surface', desc: '100% surface inspection, no burrs or blemishes' },
                    { key: 'dimensionalAudit', label: '2. Critical Dimensions', desc: 'Sampling verified against approved drawing' },
                    { key: 'gaugesChecked', label: '3. Gauge & Thread Tolerance', desc: 'Go/No-Go plug and ring gauges cleared' },
                    { key: 'packagingRustProof', label: '4. Anti-Rust & Packaging', desc: 'VCI coating and protective wrap verified' }
                  ].map(({ key, label, desc }) => {
                    const isChecked = pdiChecklist[key] ?? true;
                    return (
                      <div
                        key={key}
                        onClick={() => setPdiChecklist(prev => ({ ...prev, [key]: !isChecked }))}
                        className={`p-3 rounded-2xl border cursor-pointer transition-ui flex items-start gap-2.5 select-none ${isChecked
                          ? isDarkMode
                            ? 'bg-emerald-950/20 border-emerald-500/40 text-emerald-300'
                            : 'bg-emerald-50 border-emerald-300 text-emerald-900'
                          : isDarkMode
                            ? 'bg-slate-900/40 border-slate-800 text-slate-400 hover:border-slate-700'
                            : 'bg-slate-50 border-slate-200 text-slate-600 hover:border-slate-300'
                          }`}
                      >
                        <div className={`mt-0.5 p-0.5 rounded-md ${isChecked ? 'text-emerald-500 dark:text-emerald-400' : isDarkMode ? 'text-slate-500' : 'text-slate-400'
                          }`}>
                          {isChecked ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
                        </div>
                        <div>
                          <div className="font-bold text-[11px]">{label}</div>
                          <div className="text-[10px] opacity-80 mt-0.5 font-normal">{desc}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Accepted vs Rejected Qty */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={`block text-[11px] font-bold uppercase mb-1 ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                    Accepted Qty (NOS) *
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={pdiAcceptedQty}
                    onChange={(e) => setPdiAcceptedQty(Number(e.target.value))}
                    className={`w-full p-2.5 rounded-xl border font-bold text-xs outline-none transition-ui ${isDarkMode
                      ? 'bg-slate-900/90 border-slate-800 text-white focus:border-indigo-500'
                      : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-indigo-500'
                      }`}
                  />
                </div>
                <div>
                  <label className={`block text-[11px] font-bold uppercase mb-1 ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                    Rejected Qty (NOS)
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={pdiRejectedQty}
                    onChange={(e) => setPdiRejectedQty(Number(e.target.value))}
                    className={`w-full p-2.5 rounded-xl border font-bold text-xs outline-none transition-ui ${isDarkMode
                      ? 'bg-slate-900/90 border-slate-800 text-white focus:border-rose-500'
                      : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-rose-500'
                      }`}
                  />
                </div>
              </div>

              {/* Certificate / Report Document URL */}
              <div>
                <label className={`block text-[11px] font-bold uppercase mb-1 ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                  Compliance / PDI Certificate URL or Filename (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. COC-2026-0816.pdf or https://..."
                  value={pdiReportUrl}
                  onChange={(e) => setPdiReportUrl(e.target.value)}
                  className={`w-full p-2.5 rounded-xl border text-xs outline-none transition-ui ${isDarkMode
                    ? 'bg-slate-900/90 border-slate-800 text-white focus:border-indigo-500 placeholder-slate-600'
                    : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-indigo-500 placeholder-slate-400'
                    }`}
                />
              </div>

              {/* Remarks */}
              <div>
                <label className={`block text-[11px] font-bold uppercase mb-1 ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                  Inspection Remarks & Observations
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. 100% parts cleared visual, dimensional, and thread tolerance checks without non-conformance."
                  value={pdiRemarks}
                  onChange={(e) => setPdiRemarks(e.target.value)}
                  className={`w-full p-2.5 rounded-xl border text-xs outline-none transition-ui ${isDarkMode
                    ? 'bg-slate-900/90 border-slate-800 text-white focus:border-indigo-500 placeholder-slate-600'
                    : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-indigo-500 placeholder-slate-400'
                    }`}
                />
              </div>
            </div>

            {/* Actions */}
            <div className={`pt-4 flex flex-wrap items-center justify-between gap-2.5 border-t ${isDarkMode ? 'border-slate-800' : 'border-slate-200'
              }`}>
              <button
                type="button"
                onClick={() => handlePdiDecisionSubmit('FAIL')}
                disabled={isConfirming}
                className="px-4 py-2.5 rounded-xl bg-rose-500/10 text-rose-500 dark:text-rose-400 border border-rose-500/30 hover:bg-rose-500/20 text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-ui disabled:opacity-50"
              >
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>PDI Fail (Flag Rework)</span>
              </button>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => pdiModal.close()}
                  className={`px-4 py-2.5 rounded-xl border text-xs font-semibold cursor-pointer transition-ui ${isDarkMode
                    ? 'border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800'
                    : 'border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                    }`}
                >
                  Cancel
                </button>
                {canUploadPdiReport && (
                  <button
                    type="button"
                    onClick={() => handlePdiDecisionSubmit('PASS')}
                    disabled={isConfirming || pdiAcceptedQty <= 0}
                    className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-teal-600 hover:to-emerald-600 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-lg shadow-emerald-500/25 disabled:opacity-50 transition-ui"
                  >
                    <ShieldCheck className="w-4 h-4" />
                    <span>{isConfirming ? 'Processing...' : 'Complete PDI (Pass & Release)'}</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 2. GENERATE TAX INVOICE MODAL */}
      {invoiceModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md font-sans">
          <div className={`relative w-full max-w-lg rounded-3xl border p-6 space-y-4 font-sans text-xs z-10 shadow-2xl transition-ui ${isDarkMode ? 'bg-slate-950 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
            }`}>
            <div className={`flex items-center justify-between border-b pb-3 ${isDarkMode ? 'border-slate-800' : 'border-slate-200'}`}>
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm uppercase text-emerald-500 dark:text-emerald-400 tracking-tight">Generate GST Tax Invoice</h3>
                  <p className={`text-[11px] ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Auto-populated from Order PO #{order.poNo}</p>
                </div>
              </div>
              <button
                onClick={() => invoiceModal.close()}
                className={`p-1 rounded-xl transition-ui cursor-pointer ${isDarkMode ? 'text-slate-400 hover:text-white hover:bg-slate-800' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'}`}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={`block text-[11px] font-bold uppercase mb-1 ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>Invoice Number *</label>
                  <input
                    type="text"
                    value={genInvoiceNo}
                    onChange={(e) => setGenInvoiceNo(e.target.value)}
                    className={`w-full p-2.5 rounded-xl border font-bold text-xs outline-none transition-ui ${isDarkMode ? 'border-slate-800 bg-slate-900 text-white focus:border-emerald-500' : 'border-slate-300 bg-slate-50 text-slate-900 focus:border-emerald-600 focus:bg-white'
                      }`}
                  />
                </div>
                <div>
                  <label className={`block text-[11px] font-bold uppercase mb-1 ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>Invoice Date</label>
                  <input
                    type="date"
                    value={genInvoiceDate}
                    onChange={(e) => setGenInvoiceDate(e.target.value)}
                    className={`w-full p-2.5 rounded-xl border text-xs outline-none transition-ui ${isDarkMode ? 'border-slate-800 bg-slate-900 text-white focus:border-emerald-500' : 'border-slate-300 bg-slate-50 text-slate-900 focus:border-emerald-600 focus:bg-white'
                      }`}
                  />
                </div>
              </div>

              <div className={`p-3 rounded-2xl border space-y-1.5 font-mono text-xs ${isDarkMode ? 'bg-slate-900/70 border-slate-800' : 'bg-slate-50 border-slate-200'
                }`}>
                <div className="flex justify-between">
                  <span className={isDarkMode ? 'text-slate-400' : 'text-slate-600'}>Customer Name:</span>
                  <span className="font-bold">{order.customerName}</span>
                </div>
                <div className="flex justify-between">
                  <span className={isDarkMode ? 'text-slate-400' : 'text-slate-600'}>Order Tax Category:</span>
                  <span className="font-bold text-emerald-500">{order.taxCategory || 'GST 18%'}</span>
                </div>
                <div className="flex justify-between">
                  <span className={isDarkMode ? 'text-slate-400' : 'text-slate-600'}>Taxable Value:</span>
                  <span className="font-bold">₹{gross.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="flex justify-between">
                  <span className={isDarkMode ? 'text-slate-400' : 'text-slate-600'}>GST (18%):</span>
                  <span className="font-bold">₹{(Math.round(gross * 0.18)).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                </div>
                <div className={`flex justify-between font-bold border-t pt-1.5 text-xs ${isDarkMode ? 'border-slate-800' : 'border-slate-200'}`}>
                  <span className="text-emerald-500">Total Invoice Amount:</span>
                  <span className="text-emerald-500">₹{(gross + Math.round(gross * 0.18)).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                </div>
              </div>

              {/* Line Items Summary */}
              <div className="space-y-1">
                <label className={`block text-[11px] font-bold uppercase ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>Invoice Line Items</label>
                <div className={`divide-y rounded-2xl border p-2 ${isDarkMode ? 'bg-slate-900/60 border-slate-800 divide-slate-800' : 'bg-slate-50 border-slate-200 divide-slate-200'
                  }`}>
                  {(order.lines || []).map((l, i) => (
                    <div key={l.id || i} className="py-1.5 flex items-center justify-between text-[11px]">
                      <div>
                        <span className="font-bold">{l.itemCode}</span>
                        <span className={`ml-1.5 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>({l.orderQty} {l.unit || 'NOS'} @ ₹{l.rate})</span>
                      </div>
                      <span className="font-bold text-emerald-500 font-mono">₹{(Number(l.orderQty) * Number(l.rate)).toLocaleString('en-IN')}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className={`pt-3 flex justify-end gap-2.5 border-t ${isDarkMode ? 'border-slate-800' : 'border-slate-200'}`}>
              <button
                type="button"
                onClick={() => invoiceModal.close()}
                className={`px-4 py-2 rounded-xl border text-xs font-bold transition-ui cursor-pointer ${isDarkMode ? 'border-slate-800 text-slate-400 hover:text-white hover:bg-slate-900' : 'border-slate-300 text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleGenerateInvoiceSubmit}
                disabled={isConfirming}
                className="px-5 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-indigo-600 hover:from-indigo-600 hover:to-emerald-600 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-lg shadow-emerald-500/25"
              >
                <FileText className="w-4 h-4" />
                <span>{isConfirming ? 'Generating...' : 'Confirm & Generate Tax Invoice'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. GENERATE DELIVERY CHALLAN MODAL */}
      {challanModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md font-sans">
          <div className={`relative w-full max-w-lg rounded-3xl border p-6 space-y-4 font-sans text-xs z-10 shadow-2xl transition-ui ${isDarkMode ? 'bg-slate-950 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
            }`}>
            <div className={`flex items-center justify-between border-b pb-3 ${isDarkMode ? 'border-slate-800' : 'border-slate-200'}`}>
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-cyan-500/20 text-cyan-400">
                  <Truck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm uppercase text-cyan-500 dark:text-cyan-400 tracking-tight">Generate Delivery Challan</h3>
                  <p className={`text-[11px] ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Outward Transport Manifest for Order #{order.poNo}</p>
                </div>
              </div>
              <button
                onClick={() => challanModal.close()}
                className={`p-1 rounded-xl transition-ui cursor-pointer ${isDarkMode ? 'text-slate-400 hover:text-white hover:bg-slate-800' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'}`}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={`block text-[11px] font-bold uppercase mb-1 ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>Challan Number *</label>
                  <input
                    type="text"
                    value={genChallanNo}
                    onChange={(e) => setGenChallanNo(e.target.value)}
                    className={`w-full p-2.5 rounded-xl border font-bold text-xs outline-none transition-ui ${isDarkMode ? 'border-slate-800 bg-slate-900 text-white focus:border-cyan-500' : 'border-slate-300 bg-slate-50 text-slate-900 focus:border-cyan-600 focus:bg-white'
                      }`}
                  />
                </div>
                <div>
                  <label className={`block text-[11px] font-bold uppercase mb-1 ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>Vehicle Registration # *</label>
                  <input
                    type="text"
                    value={challanVehicleNo}
                    onChange={(e) => setChallanVehicleNo(e.target.value)}
                    placeholder="e.g. MH 12 AB 4589"
                    className={`w-full p-2.5 rounded-xl border font-bold text-xs outline-none transition-ui ${isDarkMode ? 'border-slate-800 bg-slate-900 text-white focus:border-cyan-500' : 'border-slate-300 bg-slate-50 text-slate-900 focus:border-cyan-600 focus:bg-white'
                      }`}
                  />
                </div>
              </div>

              {/* Transporter partner free-text entry */}
              <div>
                <label className={`block text-[11px] font-bold uppercase mb-1 ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                  Transporter Partner *
                </label>
                <input
                  type="text"
                  required
                  value={challanTransporter}
                  onChange={(e) => setChallanTransporter(e.target.value)}
                  placeholder="e.g. VRL Logistics, SafeXpress, Self Pick-up"
                  className={`w-full p-2.5 rounded-xl border text-xs outline-none transition-ui ${isDarkMode ? 'border-slate-800 bg-slate-900 text-white focus:border-cyan-500' : 'border-slate-300 bg-slate-50 text-slate-900 focus:border-cyan-600 focus:bg-white'
                    }`}
                />
              </div>

              <div>
                <label className={`block text-[11px] font-bold uppercase mb-1 ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>Driver Contact / Phone</label>
                <input
                  type="text"
                  value={challanDriverContact}
                  onChange={(e) => setChallanDriverContact(e.target.value)}
                  className={`w-full p-2.5 rounded-xl border text-xs outline-none transition-ui ${isDarkMode ? 'border-slate-800 bg-slate-900 text-white focus:border-cyan-500' : 'border-slate-300 bg-slate-50 text-slate-900 focus:border-cyan-600 focus:bg-white'
                    }`}
                />
              </div>

              <div>
                <label className={`block text-[11px] font-bold uppercase mb-1 ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>Delivery Notes / Remarks</label>
                <input
                  type="text"
                  value={challanRemarks}
                  onChange={(e) => setChallanRemarks(e.target.value)}
                  className={`w-full p-2.5 rounded-xl border text-xs outline-none transition-ui ${isDarkMode ? 'border-slate-800 bg-slate-900 text-white focus:border-cyan-500' : 'border-slate-300 bg-slate-50 text-slate-900 focus:border-cyan-600 focus:bg-white'
                    }`}
                />
              </div>
            </div>

            <div className={`pt-3 flex justify-end gap-2.5 border-t ${isDarkMode ? 'border-slate-800' : 'border-slate-200'}`}>
              <button
                type="button"
                onClick={() => challanModal.close()}
                className={`px-4 py-2 rounded-xl border text-xs font-bold transition-ui cursor-pointer ${isDarkMode ? 'border-slate-800 text-slate-400 hover:text-white hover:bg-slate-900' : 'border-slate-300 text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleGenerateChallanSubmit}
                disabled={isConfirming || !challanVehicleNo.trim()}
                className="px-5 py-2 rounded-xl bg-gradient-to-r from-[#5B75F8] to-indigo-600 hover:from-indigo-600 hover:to-[#5B75F8] text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-lg shadow-[#5B75F8]/20 disabled:opacity-50"
              >
                {isConfirming ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Issuing Delivery Challan...</span>
                  </>
                ) : (
                  <>
                    <Truck className="w-4 h-4" />
                    <span>Issue Delivery Challan</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4. DISPATCH OUTWARD CONSIGNMENT MODAL */}
      {dispatchModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md font-sans">
          <div className={`relative w-full max-w-lg rounded-3xl border p-6 space-y-4 font-sans text-xs z-10 shadow-2xl transition-ui ${isDarkMode ? 'bg-slate-950 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
            }`}>
            <div className={`flex items-center justify-between border-b pb-3 ${isDarkMode ? 'border-slate-800' : 'border-slate-200'}`}>
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-cyan-500/20 text-cyan-400">
                  <Truck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm uppercase text-cyan-500 dark:text-cyan-400 tracking-tight">Confirm Outward Dispatch</h3>
                  <p className={`text-[11px] ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Mark shipment as dispatched and in-transit</p>
                </div>
              </div>
              <button
                onClick={() => dispatchModal.close()}
                className={`p-1 rounded-xl transition-ui cursor-pointer ${isDarkMode ? 'text-slate-400 hover:text-white hover:bg-slate-800' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'}`}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={`block text-[11px] font-bold uppercase mb-1 ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>Dispatch Date *</label>
                  <input
                    type="date"
                    value={dispatchDate}
                    onChange={(e) => setDispatchDate(e.target.value)}
                    className={`w-full p-2.5 rounded-xl border font-bold text-xs outline-none transition-ui ${isDarkMode ? 'border-slate-800 bg-slate-900 text-white focus:border-cyan-500' : 'border-slate-300 bg-slate-50 text-slate-900 focus:border-cyan-600 focus:bg-white'
                      }`}
                  />
                </div>
                <div>
                  <label className={`block text-[11px] font-bold uppercase mb-1 ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>LR / Consignment # *</label>
                  <input
                    type="text"
                    value={dispatchLrNo}
                    onChange={(e) => setDispatchLrNo(e.target.value)}
                    className={`w-full p-2.5 rounded-xl border font-bold text-xs outline-none transition-ui ${isDarkMode ? 'border-slate-800 bg-slate-900 text-white focus:border-cyan-500' : 'border-slate-300 bg-slate-50 text-slate-900 focus:border-cyan-600 focus:bg-white'
                      }`}
                  />
                </div>
              </div>

              <div>
                <label className={`block text-[11px] font-bold uppercase mb-1 ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>Transporter Partner *</label>
                <input
                  type="text"
                  required
                  value={dispatchTransporter}
                  onChange={(e) => setDispatchTransporter(e.target.value)}
                  placeholder="e.g. VRL Logistics, SafeXpress, Self Pick-up"
                  className={`w-full p-2.5 rounded-xl border text-xs outline-none transition-ui ${isDarkMode ? 'border-slate-800 bg-slate-900 text-white focus:border-cyan-500' : 'border-slate-300 bg-slate-50 text-slate-900 focus:border-cyan-600 focus:bg-white'
                    }`}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={`block text-[11px] font-bold uppercase mb-1 ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>Vehicle Registration # *</label>
                  <input
                    type="text"
                    value={dispatchVehicleNo}
                    onChange={(e) => setDispatchVehicleNo(e.target.value)}
                    className={`w-full p-2.5 rounded-xl border font-bold text-xs outline-none transition-ui ${isDarkMode ? 'border-slate-800 bg-slate-900 text-white focus:border-cyan-500' : 'border-slate-300 bg-slate-50 text-slate-900 focus:border-cyan-600 focus:bg-white'
                      }`}
                  />
                </div>
                <div>
                  <label className={`block text-[11px] font-bold uppercase mb-1 ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>Driver Contact Phone</label>
                  <input
                    type="text"
                    value={dispatchDriverContact}
                    onChange={(e) => setDispatchDriverContact(e.target.value)}
                    className={`w-full p-2.5 rounded-xl border text-xs outline-none transition-ui ${isDarkMode ? 'border-slate-800 bg-slate-900 text-white focus:border-cyan-500' : 'border-slate-300 bg-slate-50 text-slate-900 focus:border-cyan-600 focus:bg-white'
                      }`}
                  />
                </div>
              </div>

              <div>
                <label className={`block text-[11px] font-bold uppercase mb-1 ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>Dispatch Remarks</label>
                <input
                  type="text"
                  placeholder="e.g. Lorry loaded and sealed with GPS tracking active"
                  value={dispatchRemarks}
                  onChange={(e) => setDispatchRemarks(e.target.value)}
                  className={`w-full p-2.5 rounded-xl border text-xs outline-none transition-ui ${isDarkMode ? 'border-slate-800 bg-slate-900 text-white focus:border-cyan-500' : 'border-slate-300 bg-slate-50 text-slate-900 focus:border-cyan-600 focus:bg-white'
                    }`}
                />
              </div>
            </div>

            <div className={`pt-3 flex justify-end gap-2.5 border-t ${isDarkMode ? 'border-slate-800' : 'border-slate-200'}`}>
              <button
                type="button"
                onClick={() => dispatchModal.close()}
                className={`px-4 py-2 rounded-xl border text-xs font-bold transition-ui cursor-pointer ${isDarkMode ? 'border-slate-800 text-slate-400 hover:text-white hover:bg-slate-900' : 'border-slate-300 text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDispatchSubmit}
                disabled={isConfirming}
                className="px-5 py-2 rounded-xl bg-gradient-to-r from-[#5B75F8] to-indigo-600 hover:from-indigo-600 hover:to-[#5B75F8] text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-lg shadow-[#5B75F8]/20"
              >
                <Truck className="w-4 h-4" />
                <span>{isConfirming ? 'Dispatching...' : 'Confirm Dispatch (Mark In-Transit)'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 5. CONFIRM DELIVERY MODAL (WITH FILE CHOOSER & CLEAN UI) */}
      {deliveryModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md font-sans">
          <div className={`relative w-full max-w-lg rounded-3xl border p-6 space-y-4 font-sans text-xs z-10 shadow-2xl transition-ui ${isDarkMode ? 'bg-slate-950 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
            }`}>
            <div className={`flex items-center justify-between border-b pb-3 ${isDarkMode ? 'border-slate-800' : 'border-slate-200'}`}>
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-blue-500/20 text-blue-500 dark:text-blue-400">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm uppercase text-blue-500 dark:text-blue-400 tracking-tight">Confirm Customer Delivery</h3>
                  <p className={`text-[11px] ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Record destination arrival and move to Receivable</p>
                </div>
              </div>
              <button
                onClick={() => deliveryModal.close()}
                className={`p-1 rounded-xl transition-ui cursor-pointer ${isDarkMode ? 'text-slate-400 hover:text-white hover:bg-slate-800' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'}`}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={`block text-[11px] font-bold uppercase mb-1 ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>Delivery Date *</label>
                  <input
                    type="date"
                    value={deliveryDate}
                    onChange={(e) => setDeliveryDate(e.target.value)}
                    className={`w-full p-2.5 rounded-xl border font-bold text-xs outline-none transition-ui ${isDarkMode ? 'border-slate-800 bg-slate-900 text-white focus:border-blue-500' : 'border-slate-300 bg-slate-50 text-slate-900 focus:border-blue-600 focus:bg-white'
                      }`}
                  />
                </div>
                <div>
                  <label className={`block text-[11px] font-bold uppercase mb-1 ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>Received By (Person) *</label>
                  <input
                    type="text"
                    value={deliveryReceivedBy}
                    onChange={(e) => setDeliveryReceivedBy(e.target.value)}
                    placeholder="e.g. Ramesh Kumar (Stores)"
                    className={`w-full p-2.5 rounded-xl border font-bold text-xs outline-none transition-ui ${isDarkMode ? 'border-slate-800 bg-slate-900 text-white focus:border-blue-500' : 'border-slate-300 bg-slate-50 text-slate-900 focus:border-blue-600 focus:bg-white'
                      }`}
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className={`text-[11px] font-bold uppercase ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                    Proof of Delivery (POD / E-POD) Document *
                  </label>
                  <button
                    type="button"
                    onClick={() => podFileInputRef.current?.click()}
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-lg border transition-ui flex items-center gap-1 cursor-pointer ${isDarkMode ? 'bg-slate-900 border-slate-700 text-blue-400 hover:bg-slate-800' : 'bg-blue-50 border-blue-200 text-blue-600 hover:bg-blue-100'
                      }`}
                  >
                    <Upload className="w-3 h-3" />
                    <span>Upload POD</span>
                  </button>
                </div>
                <input
                  type="file"
                  ref={podFileInputRef}
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) setDeliveryPodUrl(f.name);
                  }}
                />
                <input
                  type="text"
                  placeholder="e.g. signed-pod-challan.pdf or attachment URL"
                  value={deliveryPodUrl}
                  onChange={(e) => setDeliveryPodUrl(e.target.value)}
                  className={`w-full p-2.5 rounded-xl border font-bold text-xs outline-none transition-ui ${isDarkMode ? 'border-slate-800 bg-slate-900 text-white focus:border-blue-500' : 'border-slate-300 bg-slate-50 text-slate-900 focus:border-blue-600 focus:bg-white'
                    }`}
                />
                {!deliveryPodUrl.trim() ? (
                  <div className="flex items-center justify-between mt-1.5">
                    <span className="text-[10px] text-amber-500 font-bold">
                      * POD document attachment is strictly required to confirm delivery.
                    </span>
                    <button
                      type="button"
                      onClick={() => setDeliveryPodUrl(`signed-pod-${effectiveChallanNo || order.poNo || 'CHL-2627'}.pdf`)}
                      className="text-[10px] text-blue-500 underline font-bold cursor-pointer hover:text-blue-400"
                    >
                      ⚡ Auto-fill signed POD name
                    </button>
                  </div>
                ) : (
                  <span className="text-[10px] text-emerald-500 font-bold mt-1 block flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> POD Document linked: {deliveryPodUrl}
                  </span>
                )}
              </div>

              <div>
                <label className={`block text-[11px] font-bold uppercase mb-1 ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>Delivery Remarks</label>
                <input
                  type="text"
                  value={deliveryRemarks}
                  onChange={(e) => setDeliveryRemarks(e.target.value)}
                  className={`w-full p-2.5 rounded-xl border text-xs outline-none transition-ui ${isDarkMode ? 'border-slate-800 bg-slate-900 text-white focus:border-blue-500' : 'border-slate-300 bg-slate-50 text-slate-900 focus:border-blue-600 focus:bg-white'
                    }`}
                />
              </div>
            </div>

            <div className={`pt-3 flex justify-end gap-2.5 border-t ${isDarkMode ? 'border-slate-800' : 'border-slate-200'}`}>
              <button
                type="button"
                onClick={() => deliveryModal.close()}
                className={`px-4 py-2 rounded-xl border text-xs font-bold transition-ui cursor-pointer ${isDarkMode ? 'border-slate-800 text-slate-400 hover:text-white hover:bg-slate-900' : 'border-slate-300 text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeliverySubmit}
                disabled={isConfirming || !deliveryReceivedBy.trim() || !deliveryPodUrl.trim()}
                title={!deliveryPodUrl.trim() ? 'Attach POD to mark as delivered' : undefined}
                className="px-5 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-emerald-600 hover:from-emerald-600 hover:to-blue-600 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-lg shadow-blue-500/25 disabled:opacity-50"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>{isConfirming ? 'Confirming...' : 'Confirm Delivery (Mark Delivered)'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 5b. MARK DELIVERY DELAYED MODAL */}
      {delayedModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md font-sans">
          <div className={`relative w-full max-w-lg rounded-3xl border p-6 space-y-4 font-sans text-xs z-10 shadow-2xl transition-ui ${isDarkMode ? 'bg-slate-950 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
            }`}>
            <div className={`flex items-center justify-between border-b pb-3 ${isDarkMode ? 'border-slate-800' : 'border-slate-200'}`}>
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-amber-500/20 text-amber-500 dark:text-amber-400">
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm uppercase text-amber-500 dark:text-amber-400 tracking-tight">Mark Delivery Delayed</h3>
                  <p className={`text-[11px] ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Record transit delay & reschedule follow-up date</p>
                </div>
              </div>
              <button
                onClick={() => delayedModal.close()}
                className={`p-1 rounded-xl transition-ui cursor-pointer ${isDarkMode ? 'text-slate-400 hover:text-white hover:bg-slate-800' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'}`}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {delayedError && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-500 dark:text-rose-400 text-xs">
                {delayedError}
              </div>
            )}

            <div className="space-y-3">
              <div>
                <label className={`block text-[11px] font-bold uppercase mb-1 ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>Delay Reason *</label>
                <textarea
                  rows={3}
                  placeholder="e.g. Transporter vehicle breakdown near highway checkpoint; rescheduled."
                  value={delayedReason}
                  onChange={(e) => setDelayedReason(e.target.value)}
                  className={`w-full p-2.5 rounded-xl border text-xs outline-none resize-none transition-ui ${isDarkMode ? 'border-slate-800 bg-slate-900 text-white focus:border-amber-500' : 'border-slate-300 bg-slate-50 text-slate-900 focus:border-amber-600 focus:bg-white'
                    }`}
                />
              </div>

              <div>
                <label className={`block text-[11px] font-bold uppercase mb-1 ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>Expected Follow-Up Date</label>
                <input
                  type="date"
                  value={delayedFollowUpDate}
                  onChange={(e) => setDelayedFollowUpDate(e.target.value)}
                  className={`w-full p-2.5 rounded-xl border font-bold text-xs outline-none transition-ui ${isDarkMode ? 'border-slate-800 bg-slate-900 text-white focus:border-amber-500' : 'border-slate-300 bg-slate-50 text-slate-900 focus:border-amber-600 focus:bg-white'
                    }`}
                />
              </div>
            </div>

            <div className={`pt-3 flex justify-end gap-2.5 border-t ${isDarkMode ? 'border-slate-800' : 'border-slate-200'}`}>
              <button
                type="button"
                onClick={() => delayedModal.close()}
                className={`px-4 py-2 rounded-xl border text-xs font-bold transition-ui cursor-pointer ${isDarkMode ? 'border-slate-800 text-slate-400 hover:text-white hover:bg-slate-900' : 'border-slate-300 text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleMarkDelayedSubmit}
                disabled={isConfirming || !delayedReason.trim()}
                className="px-5 py-2 rounded-xl bg-gradient-to-r from-amber-600 to-orange-600 hover:from-orange-600 hover:to-amber-600 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-lg shadow-amber-500/25 disabled:opacity-50"
              >
                <Clock className="w-4 h-4" />
                <span>{isConfirming ? 'Updating...' : 'Confirm Delay (Mark Delayed)'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 6. RECORD PAYMENT & SETTLE MODAL */}
      {paymentModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md font-sans">
          <div className={`relative w-full max-w-lg rounded-3xl border p-6 space-y-4 font-sans text-xs z-10 shadow-2xl transition-ui ${isDarkMode ? 'bg-slate-950 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
            }`}>
            <div className={`flex items-center justify-between border-b pb-3 ${isDarkMode ? 'border-slate-800' : 'border-slate-200'}`}>
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-500 dark:text-emerald-400">
                  <CreditCard className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm uppercase text-emerald-500 dark:text-emerald-400 tracking-tight">Record Commercial Payment</h3>
                  <p className={`text-[11px] ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                    {order.poNo || order.id} • {order.customerName}
                  </p>
                </div>
              </div>
              <button
                onClick={() => paymentModal.close()}
                className={`p-1 rounded-xl transition-ui cursor-pointer ${isDarkMode ? 'text-slate-400 hover:text-white hover:bg-slate-800' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'}`}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {paymentError && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-500 dark:text-rose-400 text-xs">
                {paymentError}
              </div>
            )}

            {/* Linked Invoice Badge */}
            {effectiveInvoiceNo && (
              <div className={`p-2.5 rounded-xl border flex items-center justify-between font-mono text-xs ${isDarkMode ? 'bg-indigo-500/10 border-indigo-500/30 text-indigo-300' : 'bg-indigo-50 border-indigo-200 text-indigo-800'
                }`}>
                <div className="flex items-center gap-2">
                  <Receipt className="w-4 h-4 text-indigo-400" />
                  <span>Linked Tax Invoice: <strong>{effectiveInvoiceNo}</strong></span>
                </div>
                {onNavigate && (
                  <button
                    type="button"
                    onClick={() => {
                      paymentModal.close();
                      onNavigate('invoices');
                    }}
                    className="text-[11px] font-bold text-indigo-400 hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <span>View in Invoices & Payments</span>
                    <ExternalLink className="w-3 h-3" />
                  </button>
                )}
              </div>
            )}

            <div className={`p-3 rounded-2xl border space-y-1.5 font-mono text-xs ${isDarkMode ? 'bg-slate-900/70 border-slate-800' : 'bg-slate-50 border-slate-200'
              }`}>
              <div className="flex justify-between">
                <span className={isDarkMode ? 'text-slate-400' : 'text-slate-600'}>Gross Invoice Total:</span>
                <span className="font-bold">₹{gross.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between">
                <span className={isDarkMode ? 'text-slate-400' : 'text-slate-600'}>Already Realized / Paid:</span>
                <span className="font-bold text-emerald-500">₹{currentPaid.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              </div>
              <div className={`flex justify-between pt-1 border-t font-bold ${isDarkMode ? 'border-slate-800' : 'border-slate-200'}`}>
                <span className="text-amber-500">Outstanding Receivable Balance:</span>
                <span className="text-amber-500">₹{remainingOutstanding.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className={`block text-[11px] font-bold uppercase ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                    Payment Amount ₹ *
                  </label>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setPaymentAmount(remainingOutstanding)}
                      className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-lg border transition-ui cursor-pointer ${paymentAmount === remainingOutstanding
                        ? 'bg-emerald-500 text-white border-emerald-500 shadow-sm'
                        : isDarkMode ? 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700' : 'bg-slate-100 text-slate-700 border-slate-300 hover:bg-slate-200'
                        }`}
                    >
                      ⚡ Full (₹{remainingOutstanding.toLocaleString('en-IN')})
                    </button>
                    {remainingOutstanding > 100 && (
                      <button
                        type="button"
                        onClick={() => setPaymentAmount(Math.round(remainingOutstanding / 2))}
                        className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-lg border transition-ui cursor-pointer ${paymentAmount === Math.round(remainingOutstanding / 2)
                          ? 'bg-emerald-500 text-white border-emerald-500 shadow-sm'
                          : isDarkMode ? 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700' : 'bg-slate-100 text-slate-700 border-slate-300 hover:bg-slate-200'
                          }`}
                      >
                        50% Partial
                      </button>
                    )}
                  </div>
                </div>
                <div className="relative">
                  <span className="absolute left-3.5 top-2.5 font-mono font-bold text-slate-400">₹</span>
                  <input
                    type="number"
                    step="0.01"
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(Number(e.target.value))}
                    className={`w-full pl-8 pr-3.5 py-2.5 rounded-xl border font-mono font-bold text-sm outline-none transition-ui ${isDarkMode
                      ? 'border-slate-800 bg-slate-900 text-white focus:border-emerald-500'
                      : 'border-slate-300 bg-slate-50 text-slate-900 focus:border-emerald-600 focus:bg-white'
                      }`}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={`block text-[11px] font-bold uppercase mb-1 ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>Payment Mode</label>
                  <select
                    value={paymentMode}
                    onChange={(e) => setPaymentMode(e.target.value as any)}
                    className={`w-full p-2.5 rounded-xl border text-xs outline-none cursor-pointer transition-ui ${isDarkMode ? 'border-slate-800 bg-slate-900 text-white focus:border-emerald-500' : 'border-slate-300 bg-slate-50 text-slate-900 focus:border-emerald-600 focus:bg-white'
                      }`}
                  >
                    <option value="NEFT">Bank NEFT</option>
                    <option value="RTGS">Bank RTGS</option>
                    <option value="UPI">UPI Direct</option>
                    <option value="CHEQUE">Cheque / DD</option>
                  </select>
                </div>
                <div>
                  <label className={`block text-[11px] font-bold uppercase mb-1 ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>Payment Date</label>
                  <input
                    type="date"
                    value={paymentDate}
                    onChange={(e) => setPaymentDate(e.target.value)}
                    className={`w-full p-2.5 rounded-xl border font-mono text-xs outline-none transition-ui ${isDarkMode ? 'border-slate-800 bg-slate-900 text-white focus:border-emerald-500' : 'border-slate-300 bg-slate-50 text-slate-900 focus:border-emerald-600 focus:bg-white'
                      }`}
                  />
                </div>
              </div>

              <div>
                <label className={`block text-[11px] font-bold uppercase mb-1 ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>Reference / UTR No *</label>
                <input
                  type="text"
                  placeholder="e.g. UTR-HDFC98234723 or CHQ-004521"
                  value={paymentRefNo}
                  onChange={(e) => setPaymentRefNo(e.target.value)}
                  className={`w-full p-2.5 rounded-xl border font-mono text-xs outline-none transition-ui ${isDarkMode ? 'border-slate-800 bg-slate-900 text-white focus:border-emerald-500' : 'border-slate-300 bg-slate-50 text-slate-900 focus:border-emerald-600 focus:bg-white'
                    }`}
                />
              </div>
            </div>

            <div className={`pt-3 flex justify-end gap-2.5 border-t ${isDarkMode ? 'border-slate-800' : 'border-slate-200'}`}>
              <button
                type="button"
                onClick={() => paymentModal.close()}
                className={`px-4 py-2 rounded-xl border text-xs font-bold transition-ui cursor-pointer ${isDarkMode ? 'border-slate-800 text-slate-400 hover:text-white hover:bg-slate-900' : 'border-slate-300 text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleRecordPaymentSubmit}
                disabled={isConfirming || paymentAmount <= 0}
                className="px-5 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-teal-600 hover:to-emerald-600 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-lg shadow-emerald-500/25 disabled:opacity-50 transition-ui"
              >
                <CreditCard className="w-4 h-4" />
                <span>{isConfirming ? 'Recording...' : `Confirm & Settle ₹${paymentAmount.toLocaleString('en-IN')}`}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Owner Override Material Check Modal */}
      {overrideModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md font-sans">
          <div className={`relative w-full max-w-md rounded-3xl border p-6 space-y-4 font-sans text-xs z-10 shadow-2xl transition-ui ${isDarkMode ? 'bg-slate-950 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
            }`}>
            <div className={`flex items-center justify-between border-b pb-3 ${isDarkMode ? 'border-slate-800' : 'border-slate-200'}`}>
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-purple-500/20 text-purple-400">
                  <Zap className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm uppercase text-purple-500 dark:text-purple-400">Owner Material Override</h3>
                  <p className={`text-[11px] ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Force Order to MATERIAL_READY with audit trace</p>
                </div>
              </div>
              <button
                onClick={() => overrideModal.close()}
                className={`p-1 rounded-xl transition-ui cursor-pointer ${isDarkMode ? 'text-slate-400 hover:text-white hover:bg-slate-800' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'}`}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {overrideError && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-500 dark:text-rose-400 text-xs">
                {overrideError}
              </div>
            )}

            <form onSubmit={handleOverrideMaterialSubmit} className="space-y-3">
              <div>
                <label className={`block text-[11px] font-bold uppercase mb-1 ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                  Reason for Override (Mandatory) *
                </label>
                <textarea
                  rows={3}
                  placeholder="e.g. Raw material stock verified physically in bay 3 / Expedited demo order approval"
                  value={overrideReason}
                  onChange={(e) => setOverrideReason(e.target.value)}
                  className={`w-full p-2.5 rounded-xl border text-xs outline-none transition-ui ${isDarkMode ? 'border-slate-800 bg-slate-900 text-white focus:border-purple-500' : 'border-slate-300 bg-slate-50 text-slate-900 focus:border-purple-600 focus:bg-white'
                    }`}
                  required
                />
              </div>

              <div className="p-3 rounded-xl bg-purple-500/10 border border-purple-500/20 text-[11px] text-purple-600 dark:text-purple-300">
                ⚠️ This action will be permanently logged in the audit trail under your user ID: <strong>{currentUser?.name || 'Owner'}</strong>.
              </div>

              <div className={`pt-3 flex justify-end gap-2.5 border-t ${isDarkMode ? 'border-slate-800' : 'border-slate-200'}`}>
                <button
                  type="button"
                  onClick={() => overrideModal.close()}
                  className={`px-4 py-2 rounded-xl border text-xs font-bold transition-ui cursor-pointer ${isDarkMode ? 'border-slate-800 text-slate-400 hover:text-white hover:bg-slate-900' : 'border-slate-300 text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                    }`}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isRunningMaterialCheck || overrideReason.trim().length < 5}
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-bold cursor-pointer hover:from-indigo-600 hover:to-purple-600 shadow-lg shadow-purple-500/25 disabled:opacity-50"
                >
                  {isRunningMaterialCheck ? 'Applying Override...' : 'Confirm Owner Override'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 6. CHALLAN DETAIL & STATUTORY PRINT MODAL */}
      <ChallanDetailModal
        isOpen={challanDetailModal.isOpen}
        onClose={() => challanDetailModal.close()}
        challan={selectedChallanDetail}
        order={order}
        isDarkMode={isDarkMode}
        transporters={allTransporterOptions}
        onUpdateChallan={onUpdateChallan}
        onCancelChallan={onCancelChallan}
        onDispatchChallan={async (challanNo) => {
          if (onUpdateChallan) {
            await onUpdateChallan(challanNo, { status: 'DISPATCHED' });
          }
          if (onMarkDispatched) {
            await onMarkDispatched(order.id, {
              dispatchDate: selectedChallanDetail?.date || new Date().toISOString().split('T')[0],
              transporter: selectedChallanDetail?.transporter || order.transporterName || 'VRL Logistics Ltd',
              vehicleNo: selectedChallanDetail?.vehicleNo || 'MH 12 AB 4589',
              lrNo: selectedChallanDetail?.lrNo,
              challanNo: challanNo,
              lines: order.lines
            });
          }
          setSelectedChallanDetail(prev => prev ? { ...prev, status: 'DISPATCHED' } : null);
        }}
      />

    </div>
  );
};

export default OrderDetailView;
