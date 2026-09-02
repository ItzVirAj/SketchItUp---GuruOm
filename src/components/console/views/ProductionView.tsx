import React, { useEffect, useRef, useState, useMemo } from 'react';
import { 
  Factory, 
  List, 
  Kanban, 
  Cpu, 
  Calendar, 
  Search, 
  Plus, 
  Clock, 
  CheckCircle2, 
  AlertTriangle, 
  Play, 
  X, 
  SlidersHorizontal, 
  Wrench, 
  Activity,
  Layers,
  Route,
  GitFork,
  Copy,
  Trash2,
  Edit,
  ArrowUp,
  ArrowDown,
  ShieldCheck,
  ChevronDown,
  ChevronRight,
  Sparkles,
  Package,
  Calculator,
  Zap,
  ArrowRight,
  FileCheck,
  RotateCcw,
  Check,
  FolderPlus,
  RefreshCw,
  Box,
  User,
  Timer,
  Lock,
  History,
  CheckSquare,
  Sparkle,
  FastForward,
  CheckCheck,
  Printer,
  ExternalLink
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { 
  JobCard, 
  ProductionLogReport, 
  QCInspection, 
  CustomerOrder,
  BillOfMaterials,
  RouteCard,
  RouteCardTemplateStep,
  StockItem,
  MasterItem,
  CompanyProfile,
  MachineMaster
} from '../../../types/console';
import {
  fetchBOMs,
  saveBOM,
  duplicateBOM,
  createBOMRevision,
  updateBOMStatus,
  deleteBOM,
  fetchGroupedRouteCards,
  saveRouteCard,
  duplicateRouteCard,
  deleteRouteCard
} from '../../../services/supabaseServices';
import { JobCardDetailModal } from '../modals/JobCardDetailModal';
import { Modal } from '../../common/Modal';
import { triggerMachineDowntime } from '../../../services/notificationService';
import { MachineDowntimeLog } from '../../../types/console';
import { useUrlModal } from '../../../hooks/useUrlModal';

export const DEFAULT_ROUTE_CARDS: RouteCard[] = [];

export type ProductionSection = 'job-cards' | 'route-cards' | 'bom' | 'matrix';

interface ProductionViewProps {
  jobCards: JobCard[];
  orders?: CustomerOrder[];
  productionLogs?: ProductionLogReport[];
  qcItems?: QCInspection[];
  stock?: StockItem[];
  masters?: MasterItem[];
  machines?: MachineMaster[];
  companyProfile?: CompanyProfile | null;
  isDarkMode: boolean;
  initialSection?: ProductionSection;
  onCreateJobCard: (newCard: Partial<JobCard>) => void;
  onStartOperation?: (jobNo: string, payload: { sequenceNo: number; machineId: string; operatorName: string; actualStartTime?: string }) => Promise<any>;
  onCompleteOperation?: (jobNo: string, payload: { sequenceNo: number; qtyProcessed: number; qtyRejected: number; actualMinutes: number; notes?: string; actualStartTime?: string; actualEndTime?: string }) => Promise<any>;
  onLogProduction?: (log: Partial<ProductionLogReport>) => void;
  onNavigate?: (view: any) => void;
  onSelectOrder?: (order: string | CustomerOrder) => void;
  preselectedOrderPo?: string | null;
  onJobCardModalOpened?: () => void;
}

export const ProductionView: React.FC<ProductionViewProps> = ({
  jobCards,
  orders = [],
  productionLogs = [],
  qcItems = [],
  stock = [],
  masters = [],
  machines = [],
  companyProfile,
  isDarkMode,
  initialSection = 'job-cards',
  onCreateJobCard,
  onStartOperation,
  onCompleteOperation,
  onLogProduction,
  onNavigate,
  onSelectOrder,
  preselectedOrderPo,
  onJobCardModalOpened
}) => {
  const navigate = useNavigate();

  // Top-level Navigation Sections
  const [activeSection, setActiveSection] = useState<ProductionSection>(initialSection);
  
  useEffect(() => {
    if (initialSection) {
      setActiveSection(initialSection);
    }
  }, [initialSection]);

  // URL-driven modal hooks
  const createJobModal = useUrlModal('create-job-card');
  const jobDetailModal = useUrlModal('job-card-detail');
  const logProdModal = useUrlModal('log-production');
  const travelerModal = useUrlModal('route-traveler');
  const breakdownModal = useUrlModal('report-breakdown');
  const createBomModal = useUrlModal('create-bom');
  const duplicateBomModal = useUrlModal('duplicate-bom');
  const revisionBomModal = useUrlModal('revision-bom');
  const deleteBomModal = useUrlModal('delete-bom');
  const createRouteModal = useUrlModal('create-route');
  const duplicateRouteModal = useUrlModal('duplicate-route');
  const deleteRouteModal = useUrlModal('delete-route');

  // View mode for Job Cards (list / board)
  const [viewMode, setViewMode] = useState<'list' | 'board'>('list');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  // Job Cards Modal States
  const [orderSearchQuery, setOrderSearchQuery] = useState('');
  const [orderDropdownOpen, setOrderDropdownOpen] = useState(false);
  const [fgSearchQuery, setFgSearchQuery] = useState('');
  const [fgDropdownOpen, setFgDropdownOpen] = useState(false);
  const [selectedJobForDetail, setSelectedJobForDetail] = useState<JobCard | null>(null);
  const [selectedJobForLog, setSelectedJobForLog] = useState<JobCard | null>(null);
  const [selectedJobForTraveler, setSelectedJobForTraveler] = useState<JobCard | null>(null);
  const [selectedOpSequence, setSelectedOpSequence] = useState<number | null>(null);

  // Machine Master Integration - strictly linked to /masters/machines
  const availableMachines = useMemo(() => {
    return machines || [];
  }, [machines]);

  // Machine Breakdown Reporting Modal State
  const [breakdownMachine, setBreakdownMachine] = useState<string>('');

  useEffect(() => {
    if (availableMachines.length > 0) {
      const match = availableMachines.find(m => (m.name || m.code) === breakdownMachine || m.code === breakdownMachine);
      if (!match) {
        setBreakdownMachine(availableMachines[0].name || availableMachines[0].code);
      }
    } else {
      setBreakdownMachine('');
    }
  }, [availableMachines]);

  const [breakdownReason, setBreakdownReason] = useState('Spindle Overheat & Axis Servo Error');
  const [breakdownOperator, setBreakdownOperator] = useState('Sachin G. (Lead Machinist)');
  const [breakdownNotes, setBreakdownNotes] = useState('');
  const [isSubmittingBreakdown, setIsSubmittingBreakdown] = useState(false);

  const handleReportBreakdown = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmittingBreakdown(true);
    try {
      await triggerMachineDowntime(
        breakdownMachine,
        breakdownReason + (breakdownNotes ? ` - Notes: ${breakdownNotes}` : ''),
        breakdownOperator
      );
      breakdownModal.close();
      setActionSuccess(`Machine breakdown reported for [${breakdownMachine}]. Critical alert broadcasted to shopfloor supervisory cell.`);
      setBreakdownNotes('');
    } catch (err: any) {
      setActionError(err.message || 'Failed to report machine breakdown.');
    } finally {
      setIsSubmittingBreakdown(false);
    }
  };

  // Operation Execution Form State
  const [opMachineId, setOpMachineId] = useState<string>('CNC-01');
  const [opOperatorName, setOpOperatorName] = useState<string>('Sachin G. (Lead Machinist)');
  const [opQtyProcessed, setOpQtyProcessed] = useState<number>(1);
  const [opQtyRejected, setOpQtyRejected] = useState<number>(0);
  const [opActualMinutes, setOpActualMinutes] = useState<number>(15);
  const [opNotes, setOpNotes] = useState<string>('');
  const [isExecutingOp, setIsExecutingOp] = useState<boolean>(false);
  const [travelerError, setTravelerError] = useState<string | null>(null);
  const [travelerSuccess, setTravelerSuccess] = useState<string | null>(null);

  // BOM & Route Card Async Records
  const [boms, setBoms] = useState<BillOfMaterials[]>([]);
  const [routeCards, setRouteCards] = useState<RouteCard[]>([]);
  const [isLoadingAsyncData, setIsLoadingAsyncData] = useState(false);
  const [expandedBomCode, setExpandedBomCode] = useState<string | null>(null);
  const [expandedRoutePart, setExpandedRoutePart] = useState<string | null>(null);

  // Load BOMs and Route Cards
  const loadManufacturingData = async () => {
    setIsLoadingAsyncData(true);
    try {
      const [bomData, routeData] = await Promise.all([
        fetchBOMs(),
        fetchGroupedRouteCards()
      ]);
      setBoms(bomData || []);
      setRouteCards(routeData || []);
    } catch (err: any) {
      console.warn('Error loading manufacturing data:', err);
      setRouteCards([]);
    } finally {
      setIsLoadingAsyncData(false);
    }
  };

  useEffect(() => {
    loadManufacturingData();
  }, []);

  // Filter orders eligible for manual Job Card release (7-stage flow: Confirmed or later, before dispatch)
  const eligibleOrders = orders.filter(o => {
    const st = (o.status || o.stage || '').toUpperCase();
    if (['DRAFT', 'SUBMITTED', 'PO_RECEIVED'].includes(st)) return false;
    if (['PARTIALLY_DISPATCHED', 'DISPATCHED', 'IN_TRANSIT', 'DELIVERED', 'PAYMENT_PENDING', 'INVOICED', 'INVOICE_GENERATED', 'COMPLETED', 'CLOSED', 'CANCELLED', 'PAID'].includes(st)) return false;
    return true;
  }).sort((a, b) => {
    const timeB = new Date(b.createdAt || b.poDate || 0).getTime();
    const timeA = new Date(a.createdAt || a.poDate || 0).getTime();
    return timeB - timeA;
  });

  // Orders with at least one line item that still needs a job card released
  // A line item is considered "pending" if no job card exists for this PO + item code
  const ordersWithPendingJobCards = useMemo(() => {
    return eligibleOrders.filter(o => {
      if (!o.lines || o.lines.length === 0) return true; // No line items, still show (manual entry)
      return o.lines.some(line => {
        // Check if a job card already exists for this order + item
        const existingJC = jobCards.find(jc =>
          (jc.orderPo === o.poNo || jc.orderPo === o.id) &&
          (jc.partCode?.toLowerCase().trim() === line.itemCode?.toLowerCase().trim())
        );
        return !existingJC; // Pending if no job card exists for this line
      });
    });
  }, [eligibleOrders, jobCards]);

  // Filtered by search query (PO number or customer name)
  const filteredOrdersForJobCard = useMemo(() => {
    const q = orderSearchQuery.trim().toLowerCase();
    if (!q) return ordersWithPendingJobCards;
    return ordersWithPendingJobCards.filter(o =>
      o.poNo?.toLowerCase().includes(q) ||
      o.customerName?.toLowerCase().includes(q) ||
      o.lines?.some(l => l.itemCode?.toLowerCase().includes(q) || l.itemDescription?.toLowerCase().includes(q))
    );
  }, [ordersWithPendingJobCards, orderSearchQuery]);

  // ----------------------------------------------------------------
  // Finished Goods Master Index (for Part Code picker site-wide)
  // ----------------------------------------------------------------
  const finishedGoodsMasters = useMemo(() => {
    return (masters || []).filter(m =>
      m.itemType === 'Finished Good' ||
      m.isFinishedGoods === true ||
      m.code?.toUpperCase().startsWith('FG-')
    ).sort((a, b) => a.code.localeCompare(b.code));
  }, [masters]);

  const filteredFGMasters = useMemo(() => {
    const q = fgSearchQuery.trim().toLowerCase();
    if (!q) return finishedGoodsMasters;
    return finishedGoodsMasters.filter(m =>
      m.code?.toLowerCase().includes(q) ||
      m.name?.toLowerCase().includes(q) ||
      m.description?.toLowerCase().includes(q) ||
      m.partNo?.toLowerCase().includes(q)
    );
  }, [finishedGoodsMasters, fgSearchQuery]);

  const handleSelectFG = (m: MasterItem) => {
    setNewPartCode(m.code);
    setNewPartDesc(m.description || m.name || m.code);
    // Use partNo as drawing revision hint if available
    if (m.partNo) setNewDrawingRev(m.partNo);
    setFgSearchQuery('');
    setFgDropdownOpen(false);
  };

  // ----------------------------------------------------------------
  // New Job Form State (Integrated with BOM + Route Card)
  // ----------------------------------------------------------------
  const [newOrderPo, setNewOrderPo] = useState('');
  const [newPartCode, setNewPartCode] = useState('00000001');
  const [newPartDesc, setNewPartDesc] = useState('MAIN SPINDLE HOUSING 120MM');
  const [newDrawingRev, setNewDrawingRev] = useState('REV-A');
  const [newHeatLot, setNewHeatLot] = useState(''); // Optional!
  const [newQty, setNewQty] = useState(100);
  const [newMachine, setNewMachine] = useState('');
  const [newTargetDate, setNewTargetDate] = useState('2026-08-20');

  // Computed linked BOM and Route Card for selected Part Code
  const linkedBOMForNewJob = useMemo(() => {
    return boms.find(b => b.parentPartCode?.toLowerCase().trim() === newPartCode?.toLowerCase().trim() && b.status === 'ACTIVE') ||
           boms.find(b => b.parentPartCode?.toLowerCase().trim() === newPartCode?.toLowerCase().trim()) || null;
  }, [boms, newPartCode]);

  const linkedRouteForNewJob = useMemo(() => {
    const cleanCode = newPartCode?.toLowerCase().trim();
    const cleanDesc = newPartDesc?.toLowerCase().trim();
    return routeCards.find(r => 
      (cleanCode && r.partCode?.toLowerCase().trim() === cleanCode) ||
      (cleanCode && r.routeCode?.toLowerCase().trim() === cleanCode) ||
      (cleanDesc && r.partDescription && r.partDescription.toLowerCase().trim() === cleanDesc) ||
      (cleanCode && r.partCode && (r.partCode.toLowerCase().includes(cleanCode) || cleanCode.includes(r.partCode.toLowerCase())))
    ) || null;
  }, [routeCards, newPartCode, newPartDesc]);

  const handleSelectOrder = (poNo: string) => {
    setNewOrderPo(poNo);
    const ord = eligibleOrders.find(o => o.poNo === poNo || o.id === poNo);
    if (ord) {
      const primaryLine = ord.lines?.[0];
      if (primaryLine) {
        setNewPartCode(primaryLine.itemCode || '00000001');
        setNewPartDesc(primaryLine.itemDescription || 'MANUFACTURED COMPONENT');
        setNewQty(Number(primaryLine.pendingQty ?? primaryLine.orderQty ?? 100));
        setNewDrawingRev(primaryLine.drawingRevision || ord.drawingRevision || 'REV-A');
      }
      if (ord.heatLotNumber) {
        setNewHeatLot(ord.heatLotNumber);
      }
    }
  };

  const openNewJobModal = () => {
    if (eligibleOrders.length > 0) {
      const first = eligibleOrders[0];
      handleSelectOrder(first.poNo);
      createJobModal.open({ orderPo: first.poNo });
    } else {
      setNewOrderPo('');
      setNewPartCode('00000001');
      setNewPartDesc('Precision Machined Component');
      setNewHeatLot('');
      createJobModal.open();
    }
  };

  // Redirect from Order Detail "Create Job Card" CTA
  const preselectHandled = useRef<string | null>(null);
  useEffect(() => {
    if (!preselectedOrderPo || preselectHandled.current === preselectedOrderPo) return;
    preselectHandled.current = preselectedOrderPo;
    if (eligibleOrders.some(o => o.poNo === preselectedOrderPo || o.id === preselectedOrderPo)) {
      handleSelectOrder(preselectedOrderPo);
    } else {
      setNewOrderPo(preselectedOrderPo);
    }
    createJobModal.open({ orderPo: preselectedOrderPo });
    onJobCardModalOpened?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preselectedOrderPo]);

  // URL sync effects
  useEffect(() => {
    if (jobDetailModal.isOpen && jobDetailModal.params.jobNo) {
      const found = jobCards.find(j => j.jobNo === jobDetailModal.params.jobNo || j.id === jobDetailModal.params.jobNo);
      if (found && (!selectedJobForDetail || selectedJobForDetail.jobNo !== found.jobNo)) {
        setSelectedJobForDetail(found);
      }
    }
  }, [jobDetailModal.isOpen, jobDetailModal.params.jobNo, jobCards, selectedJobForDetail]);

  useEffect(() => {
    if (logProdModal.isOpen && logProdModal.params.jobNo) {
      const found = jobCards.find(j => j.jobNo === logProdModal.params.jobNo || j.id === logProdModal.params.jobNo);
      if (found && (!selectedJobForLog || selectedJobForLog.jobNo !== found.jobNo)) {
        setSelectedJobForLog(found);
      }
    }
  }, [logProdModal.isOpen, logProdModal.params.jobNo, jobCards, selectedJobForLog]);

  useEffect(() => {
    if (travelerModal.isOpen && travelerModal.params.jobNo) {
      const found = jobCards.find(j => j.jobNo === travelerModal.params.jobNo || j.id === travelerModal.params.jobNo);
      if (found && (!selectedJobForTraveler || selectedJobForTraveler.jobNo !== found.jobNo)) {
        setSelectedJobForTraveler(found);
      }
    }
  }, [travelerModal.isOpen, travelerModal.params.jobNo, jobCards, selectedJobForTraveler]);

  useEffect(() => {
    if (createJobModal.isOpen && (createJobModal.params.orderPo || createJobModal.params.orderId)) {
      const po = createJobModal.params.orderPo || createJobModal.params.orderId;
      handleSelectOrder(po);
    }
  }, [createJobModal.isOpen, createJobModal.params.orderPo, createJobModal.params.orderId]);

  // Helper to determine if a Job Card is fully completed or ready for QC
  const isJcCompleted = (jc: JobCard) => {
    const st = (jc.jobStatus || jc.status || '').toUpperCase();
    if (['COMPLETED', 'READY_FOR_QC', 'PDI_READY'].includes(st)) {
      return true;
    }
    if (jc.operations && jc.operations.length > 0 && jc.operations.every((o: any) => o.opStatus === 'COMPLETED' || o.inspectionPassed)) {
      return true;
    }
    const target = Number(jc.targetQty || jc.qty || 1);
    const jcLogs = productionLogs.filter(l => l.jobNo === jc.jobNo);
    if (jcLogs.length > 0) {
      let stepSeqs: number[] = [];
      if (jc.operations && jc.operations.length > 0) {
        stepSeqs = jc.operations.map(o => Number(o.sequenceNo));
      } else {
        stepSeqs = Array.from(new Set(jcLogs.map(l => Number(l.stepNo))));
      }
      if (stepSeqs.length > 0 && stepSeqs.every(s => {
        const stepTotal = jcLogs.filter(l => Number(l.stepNo) === s).reduce((sum, l) => sum + Number(l.qtyDone || 0), 0);
        return stepTotal >= target;
      })) {
        return true;
      }
    }
    return false;
  };

  // Log Production Form State
  const [logStepNo, setLogStepNo] = useState<number>(1);
  const [logOperation, setLogOperation] = useState<string>('CNC Milling');
  const [logDoneQty, setLogDoneQty] = useState<number>(25);
  const [isSubmittingJobCard, setIsSubmittingJobCard] = useState(false);
  const [isCompletingAllSteps, setIsCompletingAllSteps] = useState(false);

  const handleCreateJobSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmittingJobCard(true);
    setActionError(null);
    setActionSuccess(null);
    const newJobNo = `JC/${String(jobCards.length + 1).padStart(4, '0')}/26-27`;
    
    // Resolve operations from matched Route Card for this part
    const operationsToAttach = (linkedRouteForNewJob?.operations && linkedRouteForNewJob.operations.length > 0)
      ? linkedRouteForNewJob.operations.map(op => ({
          id: `op-${newJobNo}-${op.sequenceNo}`,
          jobNo: newJobNo,
          sequenceNo: Number(op.sequenceNo),
          operationName: op.operationName,
          machineId: op.workCenter,
          operatorName: '',
          requiredCertification: op.requiredCertification || 'None',
          standardTimeMinutes: Number(op.standardTimeMinutes || 15),
          actualTimeMinutes: 0,
          qtyProcessed: 0,
          qtyRejected: 0,
          inspectionRequired: Boolean(op.inspectionRequired),
          inspectionPassed: false,
          opStatus: 'PENDING'
        }))
      : undefined;

    try {
      await onCreateJobCard({
        jobNo: newJobNo,
        orderPo: newOrderPo,
        partCode: newPartCode,
        partDescription: newPartDesc,
        drawingRevision: newDrawingRev,
        materialIssuedLot: newHeatLot || undefined,
        orderStatus: 'IN_PRODUCTION',
        qty: Number(newQty),
        targetQty: Number(newQty),
        machine: newMachine,
        targetDate: newTargetDate,
        status: 'SCHEDULED',
        operations: operationsToAttach as any
      });
      createJobModal.close();
      setActionSuccess(`Job Card ${newJobNo} created with ${operationsToAttach?.length || 0} routed operations.`);
    } catch (err: any) {
      setActionError(err.message || 'Failed to release Job Card to shopfloor.');
    } finally {
      setIsSubmittingJobCard(false);
    }
  };

  const handleLogSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedJobForLog || !onLogProduction) return;
    onLogProduction({
      jobNo: selectedJobForLog.jobNo,
      itemCode: selectedJobForLog.partCode,
      description: selectedJobForLog.partDescription,
      stepNo: logStepNo,
      operationName: logOperation,
      qtyDone: Number(logDoneQty),
      loggedTimestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    });
    setSelectedJobForLog(null);
    logProdModal.close();
    setActionSuccess(`Production shift logged for ${selectedJobForLog.jobNo}.`);
  };

  // ----------------------------------------------------------------
  // JOB CARD ROUTE TRAVELER WORKFLOW ENGINE
  // ----------------------------------------------------------------
  const activeJobCard = useMemo(() => {
    if (!selectedJobForTraveler) return null;
    return jobCards.find(j => j.jobNo === selectedJobForTraveler.jobNo || j.id === selectedJobForTraveler.id) || selectedJobForTraveler;
  }, [jobCards, selectedJobForTraveler]);

  const effectiveOperations: any[] = useMemo(() => {
    if (!activeJobCard) return [];
    if (activeJobCard.operations && activeJobCard.operations.length > 0) {
      return [...activeJobCard.operations].sort((a: any, b: any) => Number(a.sequenceNo) - Number(b.sequenceNo));
    }

    const cleanCode = activeJobCard.partCode?.toLowerCase().trim();
    const cleanDesc = activeJobCard.partDescription?.toLowerCase().trim();

    // 1. Direct Part Code or Route Code match
    let matchingRoute = routeCards.find(r => 
      (cleanCode && r.partCode?.toLowerCase().trim() === cleanCode) ||
      (cleanCode && r.routeCode?.toLowerCase().trim() === cleanCode)
    );

    // 2. Exact Description match
    if (!matchingRoute && cleanDesc) {
      matchingRoute = routeCards.find(r => 
        r.partDescription && r.partDescription.toLowerCase().trim() === cleanDesc
      );
    }

    // 3. Parent Order PO Line Item match
    if (!matchingRoute && activeJobCard.orderPo) {
      const parentOrder = orders.find(o => o.poNo === activeJobCard.orderPo || o.id === activeJobCard.orderPo);
      if (parentOrder && parentOrder.lines && parentOrder.lines.length > 0) {
        for (const line of parentOrder.lines) {
          const lCode = line.itemCode?.toLowerCase().trim();
          const lDesc = line.itemDescription?.toLowerCase().trim();
          matchingRoute = routeCards.find(r => 
            (lCode && r.partCode?.toLowerCase().trim() === lCode) ||
            (lDesc && r.partDescription && r.partDescription.toLowerCase().trim() === lDesc)
          );
          if (matchingRoute) break;
        }
      }
    }

    // 4. Substring / Keyword match
    if (!matchingRoute) {
      matchingRoute = routeCards.find(r => {
        const rCode = r.partCode?.toLowerCase().trim() || '';
        const rDesc = r.partDescription?.toLowerCase().trim() || '';
        return (cleanCode && (rCode.includes(cleanCode) || cleanCode.includes(rCode))) ||
               (cleanDesc && (rDesc.includes(cleanDesc) || cleanDesc.includes(rDesc)));
      });
    }

    // If matching Route Card found, map its operations
    if (matchingRoute && matchingRoute.operations && matchingRoute.operations.length > 0) {
      return matchingRoute.operations.map((op: any) => ({
        id: `op-${activeJobCard.jobNo}-${op.sequenceNo}`,
        jobCardId: activeJobCard.id || '',
        jobNo: activeJobCard.jobNo,
        sequenceNo: Number(op.sequenceNo),
        operationName: op.operationName,
        machineId: op.workCenter,
        operatorName: '',
        requiredCertification: op.requiredCertification || 'None',
        standardTimeMinutes: Number(op.standardTimeMinutes || 15),
        actualTimeMinutes: 0,
        qtyProcessed: 0,
        qtyRejected: 0,
        inspectionRequired: Boolean(op.inspectionRequired),
        inspectionPassed: false,
        opStatus: 'PENDING'
      })).sort((a: any, b: any) => Number(a.sequenceNo) - Number(b.sequenceNo));
    }

    const defaultRoute = routeCards[0];
    if (defaultRoute && defaultRoute.operations && defaultRoute.operations.length > 0) {
      return defaultRoute.operations.map((op: any) => ({
        id: `op-${activeJobCard.jobNo}-${op.sequenceNo}`,
        jobCardId: activeJobCard.id || '',
        jobNo: activeJobCard.jobNo,
        sequenceNo: Number(op.sequenceNo),
        operationName: op.operationName,
        machineId: op.workCenter,
        operatorName: '',
        requiredCertification: op.requiredCertification || 'None',
        standardTimeMinutes: Number(op.standardTimeMinutes || 15),
        actualTimeMinutes: 0,
        qtyProcessed: 0,
        qtyRejected: 0,
        inspectionRequired: Boolean(op.inspectionRequired),
        inspectionPassed: false,
        opStatus: 'PENDING'
      })).sort((a: any, b: any) => Number(a.sequenceNo) - Number(b.sequenceNo));
    }

    return [];
  }, [activeJobCard, routeCards, orders]);

  const currentExecutableOp = useMemo(() => {
    if (!effectiveOperations || effectiveOperations.length === 0) return null;
    const inProgress = effectiveOperations.find((o: any) => o.opStatus === 'IN_PROGRESS');
    if (inProgress) return inProgress;
    const nextPending = effectiveOperations.find((o: any) => o.opStatus === 'PENDING' || !o.opStatus);
    return nextPending || null;
  }, [effectiveOperations]);

  useEffect(() => {
    if (activeJobCard) {
      if (selectedOpSequence === null || !effectiveOperations.some((o: any) => o.sequenceNo === selectedOpSequence)) {
        if (currentExecutableOp) {
          setSelectedOpSequence(currentExecutableOp.sequenceNo);
        } else if (effectiveOperations.length > 0) {
          setSelectedOpSequence(effectiveOperations[0].sequenceNo);
        }
      }
    }
  }, [activeJobCard, effectiveOperations, currentExecutableOp, selectedOpSequence]);

  const selectedOp = useMemo(() => {
    if (!effectiveOperations || effectiveOperations.length === 0) return null;
    return effectiveOperations.find((o: any) => o.sequenceNo === selectedOpSequence) || currentExecutableOp || effectiveOperations[0];
  }, [effectiveOperations, selectedOpSequence, currentExecutableOp]);

  useEffect(() => {
    if (selectedOp) {
      setOpMachineId(selectedOp.machineId || activeJobCard?.machine || 'CNC-01');
      setOpOperatorName(selectedOp.operatorName || 'Sachin G. (Lead Machinist)');
      const goodTarget = (activeJobCard?.targetQty || activeJobCard?.qty || 1) - (selectedOp.qtyRejected || 0);
      setOpQtyProcessed(selectedOp.qtyProcessed > 0 ? selectedOp.qtyProcessed : goodTarget);
      setOpQtyRejected(selectedOp.qtyRejected || 0);
      setOpActualMinutes(selectedOp.actualTimeMinutes > 0 ? selectedOp.actualTimeMinutes : (selectedOp.standardTimeMinutes || 15));
      setOpNotes(selectedOp.notes || '');
    }
  }, [selectedOp, activeJobCard]);

  // Timestamp formatting and timing helper utilities for Route Card Traveler
  const formatStepDateTime = (isoString?: string) => {
    if (!isoString) return null;
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return isoString;
    return d.toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    });
  };

  const formatStepTimeOnly = (isoString?: string) => {
    if (!isoString) return null;
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return isoString;
    return d.toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  const getDerivedStepStart = (op: any, index: number, total: number) => {
    if (op.actualStartTime) return op.actualStartTime;
    if (op.opStatus === 'COMPLETED') {
      const std = Number(op.standardTimeMinutes || 20);
      const offsetMin = (total - index) * std;
      return new Date(Date.now() - offsetMin * 60000).toISOString();
    }
    return undefined;
  };

  const getDerivedStepEnd = (op: any, index: number, total: number) => {
    if (op.actualEndTime) return op.actualEndTime;
    if (op.opStatus === 'COMPLETED') {
      const std = Number(op.standardTimeMinutes || 20);
      const offsetMin = (total - 1 - index) * std;
      return new Date(Date.now() - offsetMin * 60000).toISOString();
    }
    return undefined;
  };

  const handleOpenJobTraveler = (jc: JobCard) => {
    setSelectedJobForTraveler(jc);
    setSelectedOpSequence(null);
    setTravelerError(null);
    setTravelerSuccess(null);
  };

  const handleStartOpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeJobCard || !selectedOp || !onStartOperation) return;
    setIsExecutingOp(true);
    setTravelerError(null);
    setTravelerSuccess(null);
    const startIso = new Date().toISOString();
    try {
      const updated = await onStartOperation(activeJobCard.jobNo, {
        sequenceNo: selectedOp.sequenceNo,
        machineId: opMachineId,
        operatorName: opOperatorName,
        actualStartTime: startIso
      });
      setTravelerSuccess(`Operation ${selectedOp.sequenceNo} (${selectedOp.operationName}) started at ${formatStepTimeOnly(startIso)}.`);
      if (updated) setSelectedJobForTraveler(updated);
    } catch (err: any) {
      setTravelerError(err.message || 'Failed to start operation');
    } finally {
      setIsExecutingOp(false);
    }
  };

  const handleCompleteOpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeJobCard || !selectedOp || !onCompleteOperation) return;
    setIsExecutingOp(true);
    setTravelerError(null);
    setTravelerSuccess(null);
    const endIso = new Date().toISOString();
    const startIso = selectedOp.actualStartTime || new Date(Date.now() - (Number(opActualMinutes) || 15) * 60000).toISOString();
    try {
      const updated = await onCompleteOperation(activeJobCard.jobNo, {
        sequenceNo: selectedOp.sequenceNo,
        qtyProcessed: Number(opQtyProcessed),
        qtyRejected: Number(opQtyRejected),
        actualMinutes: Number(opActualMinutes),
        notes: opNotes || undefined,
        actualStartTime: startIso,
        actualEndTime: endIso
      });
      setTravelerSuccess(`Operation ${selectedOp.sequenceNo} completed at ${formatStepTimeOnly(endIso)}! (${opQtyProcessed} good output, ${opQtyRejected} rejected, ${opActualMinutes}m duration). Next step unlocked.`);
      if (updated) setSelectedJobForTraveler(updated);
    } catch (err: any) {
      setTravelerError(err.message || 'Failed to complete operation');
    } finally {
      setIsExecutingOp(false);
    }
  };

  const handleCompleteAllSteps = async () => {
    if (!activeJobCard || !onCompleteOperation) return;
    setIsCompletingAllSteps(true);
    setTravelerError(null);
    setTravelerSuccess(null);
    try {
      const targetQty = Number(activeJobCard.targetQty || activeJobCard.qty || 1);
      let lastUpdated = activeJobCard;
      const now = Date.now();
      const total = effectiveOperations.length;
      
      for (let idx = 0; idx < total; idx++) {
        const op = effectiveOperations[idx];
        if (op.opStatus !== 'COMPLETED') {
          const stdMinutes = Number(op.standardTimeMinutes || 15);
          const startIso = op.actualStartTime || new Date(now - (total - idx) * stdMinutes * 60000).toISOString();
          const endIso = new Date(now - (total - 1 - idx) * stdMinutes * 60000).toISOString();

          if (onStartOperation && (op.opStatus === 'PENDING' || !op.opStatus)) {
            try {
              await onStartOperation(activeJobCard.jobNo, {
                sequenceNo: op.sequenceNo,
                machineId: op.machineId || activeJobCard.machine || 'CNC-01',
                operatorName: op.operatorName || 'Sachin G. (Lead Machinist)',
                actualStartTime: startIso
              });
            } catch (e) {
              // Ignore start error if already active
            }
          }
          const updated = await onCompleteOperation(activeJobCard.jobNo, {
            sequenceNo: op.sequenceNo,
            qtyProcessed: targetQty,
            qtyRejected: 0,
            actualMinutes: stdMinutes,
            notes: 'Fast-forward: Completed via Route Card Traveler',
            actualStartTime: startIso,
            actualEndTime: endIso
          });
          if (updated) lastUpdated = updated;
        }
      }
      setSelectedJobForTraveler(lastUpdated);
      setTravelerSuccess(`All ${effectiveOperations.length} operations marked COMPLETED! Start times, completion times, cycle durations, and output logged.`);
    } catch (err: any) {
      setTravelerError(err.message || 'Failed to complete all operations');
    } finally {
      setIsCompletingAllSteps(false);
    }
  };

  // ----------------------------------------------------------------
  // BOM MODAL STATES & HANDLERS
  // ----------------------------------------------------------------
  const [editingBom, setEditingBom] = useState<BillOfMaterials | null>(null);
  const [duplicatingBom, setDuplicatingBom] = useState<BillOfMaterials | null>(null);
  const [revisionBom, setRevisionBom] = useState<BillOfMaterials | null>(null);
  const [deleteConfirmBom, setDeleteConfirmBom] = useState<BillOfMaterials | null>(null);

  // Controlled Parent Part Code & Name for BOM Modal
  const [bomFormParentCode, setBomFormParentCode] = useState<string>('');
  const [bomFormParentName, setBomFormParentName] = useState<string>('');

  // Finished Goods filtered from Items Master for BOM & Route Card configuration
  const fgMasters = useMemo(() => {
    return (masters || [])
      .filter(m => m.itemType === 'Finished Good' || m.isFinishedGoods === true)
      .sort((a, b) => (a.code || '').localeCompare(b.code || ''));
  }, [masters]);

  // Non-finished-goods categorized items for BOM Component Rows
  const bomComponentMasters = useMemo(() => {
    const list = masters || [];
    const isRM = (m: MasterItem) => m.itemType === 'Raw Material' || m.category === 'RAW_MATERIAL' || m.category === 'Raw Material';
    const isSF = (m: MasterItem) => m.itemType === 'Semi-Finished' || m.category === 'SEMI_FINISHED' || m.category === 'Semi-Finished';
    const isBO = (m: MasterItem) => m.itemType === 'Bought-Out' || m.category === 'BOUGHT_OUT' || m.category === 'Bought-Out';
    const isCO = (m: MasterItem) => m.itemType === 'Consumable' || m.category === 'CONSUMABLE' || m.category === 'Consumable';

    const rm = list.filter(isRM).sort((a, b) => (a.code || '').localeCompare(b.code || ''));
    const sf = list.filter(isSF).sort((a, b) => (a.code || '').localeCompare(b.code || ''));
    const bo = list.filter(isBO).sort((a, b) => (a.code || '').localeCompare(b.code || ''));
    const co = list.filter(isCO).sort((a, b) => (a.code || '').localeCompare(b.code || ''));
    const other = list.filter(m => !isRM(m) && !isSF(m) && !isBO(m) && !isCO(m) && m.itemType !== 'Finished Good' && !m.isFinishedGoods && m.category !== 'FINISHED_GOODS').sort((a, b) => (a.code || '').localeCompare(b.code || ''));
    const totalCount = rm.length + sf.length + bo.length + co.length + other.length;
    return { rm, sf, bo, co, other, totalCount };
  }, [masters]);

  // Dynamic component items for BOM modal
  const [bomFormComponents, setBomFormComponents] = useState<Array<{
    componentCode: string;
    componentName: string;
    componentType: string;
    qtyPerUnit: number;
    unit: string;
    scrapAllowancePct: number;
    stage: string;
    unitCost: number;
  }>>([
    {
      componentCode: 'RAW-EN8-BAR-32MM',
      componentName: 'EN8 Steel Bar Ø32mm',
      componentType: 'RAW_MATERIAL',
      qtyPerUnit: 1.8,
      unit: 'KG',
      scrapAllowancePct: 2.5,
      stage: 'CNC_MACHINING',
      unitCost: 95
    }
  ]);

  // Track components with SKUs not found in the Items Master
  const unmatchedComponentCount = useMemo(() => {
    const list = masters || [];
    return bomFormComponents.filter(c => {
      const code = (c.componentCode || '').trim().toLowerCase();
      if (!code) return false;
      return !list.some(m => (m.code || '').trim().toLowerCase() === code);
    }).length;
  }, [bomFormComponents, masters]);

  const handleOpenCreateBom = () => {
    setEditingBom(null);
    const initialCode = fgMasters[0]?.code || '';
    setBomFormParentCode(initialCode);
    const matched = masters.find(m => m.code === initialCode);
    setBomFormParentName(matched?.name || matched?.description || '');
    setBomFormComponents([
      {
        componentCode: 'RAW-EN8-BAR-32MM',
        componentName: 'EN8 Steel Bar Ø32mm',
        componentType: 'RAW_MATERIAL',
        qtyPerUnit: 1.8,
        unit: 'KG',
        scrapAllowancePct: 2.5,
        stage: 'CNC_MACHINING',
        unitCost: 95
      }
    ]);
    createBomModal.open();
  };

  const handleOpenEditBom = (bom: BillOfMaterials) => {
    setEditingBom(bom);
    setBomFormParentCode(bom.parentPartCode || '');
    setBomFormParentName(bom.parentPartName || '');
    setBomFormComponents(
      bom.components?.length > 0 
        ? bom.components.map(c => ({
            componentCode: c.componentCode,
            componentName: c.componentName,
            componentType: c.componentType || 'RAW_MATERIAL',
            qtyPerUnit: c.qtyPerUnit,
            unit: c.unit || 'KG',
            scrapAllowancePct: c.scrapAllowancePct || 0,
            stage: c.stage || 'MACHINING',
            unitCost: c.unitCost || 0
          }))
        : [{
            componentCode: 'RAW-EN8-BAR-32MM',
            componentName: 'EN8 Steel Bar Ø32mm',
            componentType: 'RAW_MATERIAL',
            qtyPerUnit: 1.8,
            unit: 'KG',
            scrapAllowancePct: 2.5,
            stage: 'CNC_MACHINING',
            unitCost: 95
          }]
    );
    createBomModal.open({ bomCode: bom.bomCode });
  };

  const handleCloseCreateBom = () => {
    createBomModal.close();
    setEditingBom(null);
    setBomFormParentCode('');
    setBomFormParentName('');
  };

  const handleAddBomComponentRow = () => {
    setBomFormComponents(prev => [
      ...prev,
      {
        componentCode: '',
        componentName: '',
        componentType: 'RAW_MATERIAL',
        qtyPerUnit: 1.0,
        unit: 'NOS',
        scrapAllowancePct: 0,
        stage: 'CNC_MACHINING',
        unitCost: 50
      }
    ]);
  };

  const handleRemoveBomComponentRow = (index: number) => {
    setBomFormComponents(prev => prev.filter((_, i) => i !== index));
  };

  const handleBomComponentChange = (index: number, field: string, value: any) => {
    setBomFormComponents(prev => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: value };
      // Auto-fill component name, unit, and cost from masters if componentCode matches
      if (field === 'componentCode') {
        const found = masters.find(m => m.code.toLowerCase() === String(value).toLowerCase());
        if (found) {
          copy[index].componentName = found.name || found.description || copy[index].componentName;
          if (found.unit) copy[index].unit = found.unit;
          if (found.standardCost) copy[index].unitCost = found.standardCost;
          else if (found.purchaseRate) copy[index].unitCost = found.purchaseRate;
        }
      }
      return copy;
    });
  };

  const handleSaveBOMSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const form = e.target as any;
    const bomPayload: BillOfMaterials = {
      id: editingBom?.id,
      bomCode: form.bomCode?.value || editingBom?.bomCode || 'BOM-00000001-A',
      parentPartCode: bomFormParentCode || form.parentCode?.value,
      parentPartName: bomFormParentName || form.parentName?.value,
      revision: form.revision?.value || 'v1.0',
      yieldPercentage: Number(form.yield?.value || 98.5),
      batchSize: Number(form.batchSize?.value || 100),
      status: (form.status?.value as any) || (editingBom?.status as any) || 'ACTIVE',
      notes: form.notes?.value || '',
      components: bomFormComponents
        .filter(c => c.componentCode && c.componentCode.trim().length > 0)
        .map(c => ({
          ...c,
          componentCode: c.componentCode.trim(),
          componentName: c.componentName?.trim() || c.componentCode.trim(),
          qtyPerUnit: Number(c.qtyPerUnit) > 0 ? Number(c.qtyPerUnit) : 1,
          unit: c.unit || 'NOS',
          scrapAllowancePct: Number(c.scrapAllowancePct) >= 0 ? Number(c.scrapAllowancePct) : 0,
          stage: c.stage || 'CNC_MACHINING',
          unitCost: Number(c.unitCost) >= 0 ? Number(c.unitCost) : 0
        }))
    };

    try {
      await saveBOM(bomPayload);
      handleCloseCreateBom();
      setActionSuccess(`BOM ${bomPayload.bomCode} saved successfully.`);
      await loadManufacturingData();
    } catch (err: any) {
      setActionError(err.message || 'Failed to save BOM.');
    }
  };

  const handleDuplicateBOMSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!duplicatingBom) return;
    const form = e.target as any;
    try {
      await duplicateBOM({
        sourceBomCode: duplicatingBom.bomCode,
        targetBomCode: form.targetBomCode.value,
        targetPartCode: form.targetPartCode.value,
        targetPartName: form.targetPartName.value
      });
      setDuplicatingBom(null);
      duplicateBomModal.close();
      setActionSuccess(`BOM duplicated to ${form.targetBomCode.value}.`);
      await loadManufacturingData();
    } catch (err: any) {
      setActionError(err.message || 'Failed to duplicate BOM.');
    }
  };

  const handleRevisionBOMSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!revisionBom) return;
    const form = e.target as any;
    try {
      await createBOMRevision(revisionBom.bomCode, form.newRevision.value);
      setRevisionBom(null);
      revisionBomModal.close();
      setActionSuccess(`Created new revision ${form.newRevision.value} for BOM ${revisionBom.bomCode}.`);
      await loadManufacturingData();
    } catch (err: any) {
      setActionError(err.message || 'Failed to create revision.');
    }
  };

  const handleToggleBOMStatus = async (bom: BillOfMaterials, newStatus: 'ACTIVE' | 'DRAFT' | 'OBSOLETE') => {
    try {
      await updateBOMStatus(bom.bomCode, newStatus);
      setActionSuccess(`Status updated to ${newStatus} for ${bom.bomCode}.`);
      await loadManufacturingData();
    } catch (err: any) {
      setActionError(err.message || 'Failed to update status.');
    }
  };

  const handleDeleteBOMConfirmed = async () => {
    if (!deleteConfirmBom) return;
    try {
      await deleteBOM(deleteConfirmBom.bomCode);
      setBoms(prev => prev.filter(b => b.bomCode !== deleteConfirmBom.bomCode));
      setDeleteConfirmBom(null);
      deleteBomModal.close();
      setActionSuccess(`BOM ${deleteConfirmBom.bomCode} deleted.`);
    } catch (err: any) {
      setActionError(err.message || 'Failed to delete BOM.');
    }
  };

  // ----------------------------------------------------------------
  // ROUTE CARD MODAL STATES & HANDLERS
  // ----------------------------------------------------------------
  const [editingRoute, setEditingRoute] = useState<RouteCard | null>(null);
  const [duplicatingRoute, setDuplicatingRoute] = useState<RouteCard | null>(null);
  const [deleteConfirmRoute, setDeleteConfirmRoute] = useState<RouteCard | null>(null);

  // Controlled Part Code & Description for Route Card Modal
  const [routeFormPartCode, setRouteFormPartCode] = useState<string>('');
  const [routeFormPartDescription, setRouteFormPartDescription] = useState<string>('');

  // Finished Goods filtered from Items Master for Route Card configuration
  const routeFgMasters = fgMasters;

  // Standard Presets for Quick Route Card construction
  const standardRoutePreset: Array<{
    sequenceNo: number;
    operationName: string;
    workCenter: string;
    standardTimeMinutes: number;
    inspectionRequired: boolean;
    requiredCertification: string;
  }> = [
    { sequenceNo: 10, operationName: 'Raw Material Saw Cutting', workCenter: '', standardTimeMinutes: 5, inspectionRequired: false, requiredCertification: 'Operator Lv1' },
    { sequenceNo: 20, operationName: 'CNC Turning (OD/Facing)', workCenter: '', standardTimeMinutes: 12, inspectionRequired: false, requiredCertification: 'CNC Certified' },
    { sequenceNo: 30, operationName: 'VMC Drilling & Tapping', workCenter: '', standardTimeMinutes: 15, inspectionRequired: false, requiredCertification: 'VMC Machinist' },
    { sequenceNo: 40, operationName: 'Heat Treatment (Hardening)', workCenter: '', standardTimeMinutes: 30, inspectionRequired: true, requiredCertification: 'Heat Treatment Tech' },
    { sequenceNo: 50, operationName: 'Cylindrical Precision Grinding', workCenter: '', standardTimeMinutes: 10, inspectionRequired: true, requiredCertification: 'Grinding Specialist' },
    { sequenceNo: 60, operationName: 'Final Quality Inspection (QC)', workCenter: '', standardTimeMinutes: 8, inspectionRequired: true, requiredCertification: 'QC Inspector Lv2' },
    { sequenceNo: 70, operationName: 'Ultrasonic Cleaning & Protective Packing', workCenter: '', standardTimeMinutes: 5, inspectionRequired: false, requiredCertification: 'Packing Clerk' }
  ];

  const [routeFormSteps, setRouteFormSteps] = useState<Array<{
    id?: string;
    sequenceNo: number;
    operationName: string;
    workCenter: string;
    standardTimeMinutes: number;
    inspectionRequired: boolean;
    requiredCertification: string;
  }>>(standardRoutePreset);

  const handleOpenCreateRoute = () => {
    setEditingRoute(null);
    setRouteFormSteps(standardRoutePreset);
    const initialCode = routeFgMasters[0]?.code || '';
    setRouteFormPartCode(initialCode);
    const matched = masters.find(m => m.code === initialCode);
    setRouteFormPartDescription(matched?.description || matched?.name || '');
    createRouteModal.open();
  };

  const handleOpenEditRoute = (route: RouteCard) => {
    setEditingRoute(route);
    setRouteFormPartCode(route.partCode || '');
    setRouteFormPartDescription(route.partDescription || '');
    setRouteFormSteps(
      route.operations?.length > 0
        ? route.operations.map(op => ({
            id: op.id,
            sequenceNo: op.sequenceNo,
            operationName: op.operationName,
            // Only retain workCenter if it actually exists in Machine Master (availableMachines)
            workCenter: availableMachines.some(m => (m.name || m.code) === op.workCenter || m.code === op.workCenter)
              ? op.workCenter
              : '',
            standardTimeMinutes: op.standardTimeMinutes || 10,
            inspectionRequired: !!op.inspectionRequired,
            requiredCertification: op.requiredCertification || 'None'
          }))
        : standardRoutePreset
    );
    createRouteModal.open({ routeCode: route.routeCode || route.partCode });
  };

  const handleAddRouteStepRow = () => {
    setRouteFormSteps(prev => {
      const lastSeq = prev.length > 0 ? Math.max(...prev.map(s => s.sequenceNo)) : 0;
      const defaultMch = availableMachines[0]?.name || availableMachines[0]?.code || '';
      return [
        ...prev,
        {
          sequenceNo: lastSeq + 10,
          operationName: 'Precision Machining',
          workCenter: defaultMch,
          standardTimeMinutes: 10,
          inspectionRequired: false,
          requiredCertification: 'None'
        }
      ];
    });
  };

  const handleRemoveRouteStepRow = (index: number) => {
    setRouteFormSteps(prev => prev.filter((_, i) => i !== index));
  };

  const handleMoveRouteStep = (index: number, direction: 'up' | 'down') => {
    setRouteFormSteps(prev => {
      const copy = [...prev];
      const targetIndex = direction === 'up' ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= copy.length) return prev;
      const temp = copy[index];
      copy[index] = copy[targetIndex];
      copy[targetIndex] = temp;
      // Re-number sequences by 10s
      return copy.map((step, idx) => ({ ...step, sequenceNo: (idx + 1) * 10 }));
    });
  };

  const handleRouteStepChange = (index: number, field: string, value: any) => {
    setRouteFormSteps(prev => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: value };
      return copy;
    });
  };

  const handleSaveRouteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const form = e.target as any;
    const payload = {
      partCode: form.partCode.value,
      partDescription: form.partDescription.value,
      revision: form.revision.value || 'REV-A',
      status: (form.status?.value as any) || 'ACTIVE',
      notes: form.notes.value || '',
      operations: routeFormSteps.map((step, idx) => ({
        id: step.id,
        sequenceNo: Number(step.sequenceNo || (idx + 1) * 10),
        operationName: step.operationName,
        workCenter: step.workCenter,
        standardTimeMinutes: Number(step.standardTimeMinutes || 0),
        inspectionRequired: Boolean(step.inspectionRequired),
        requiredCertification: step.requiredCertification || 'None'
      }))
    };

    try {
      await saveRouteCard(payload);
      createRouteModal.close();
      setActionSuccess(`Route Card for ${payload.partCode} saved successfully.`);
      await loadManufacturingData();
    } catch (err: any) {
      setActionError(err.message || 'Failed to save Route Card.');
    }
  };

  const handleDuplicateRouteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!duplicatingRoute) return;
    const form = e.target as any;
    try {
      await duplicateRouteCard(
        duplicatingRoute.partCode,
        form.targetPartCode.value,
        form.targetPartDescription.value
      );
      setDuplicatingRoute(null);
      duplicateRouteModal.close();
      setActionSuccess(`Route Card duplicated for ${form.targetPartCode.value}.`);
      await loadManufacturingData();
    } catch (err: any) {
      setActionError(err.message || 'Failed to duplicate Route Card.');
    }
  };

  const handleDeleteRouteConfirmed = async () => {
    if (!deleteConfirmRoute) return;
    try {
      await deleteRouteCard(deleteConfirmRoute.partCode);
      setDeleteConfirmRoute(null);
      deleteRouteModal.close();
      setActionSuccess(`Route Card for ${deleteConfirmRoute.partCode} deleted.`);
      await loadManufacturingData();
    } catch (err: any) {
      setActionError(err.message || 'Failed to delete Route Card.');
    }
  };

  useEffect(() => {
    if (!createBomModal.isOpen) {
      if (editingBom) setEditingBom(null);
      return;
    }
    if (createBomModal.params.bomCode) {
      if (!editingBom || editingBom.bomCode !== createBomModal.params.bomCode) {
        const found = boms.find(b => b.bomCode === createBomModal.params.bomCode);
        if (found) {
          setEditingBom(found);
          setBomFormParentCode(found.parentPartCode || '');
          setBomFormParentName(found.parentPartName || '');
          setBomFormComponents(
            found.components?.length > 0 
              ? found.components.map(c => ({
                  componentCode: c.componentCode,
                  componentName: c.componentName,
                  componentType: c.componentType || 'RAW_MATERIAL',
                  qtyPerUnit: c.qtyPerUnit,
                  unit: c.unit || 'KG',
                  scrapAllowancePct: c.scrapAllowancePct || 0,
                  stage: c.stage || 'MACHINING',
                  unitCost: c.unitCost || 0
                }))
              : [{
                  componentCode: 'RAW-EN8-BAR-32MM',
                  componentName: 'EN8 Steel Bar Ø32mm',
                  componentType: 'RAW_MATERIAL',
                  qtyPerUnit: 1.8,
                  unit: 'KG',
                  scrapAllowancePct: 2.5,
                  stage: 'CNC_MACHINING',
                  unitCost: 95
                }]
          );
        }
      }
    } else if (!editingBom && !bomFormParentCode) {
      const initialCode = fgMasters[0]?.code || '';
      setBomFormParentCode(initialCode);
      const matched = masters.find(m => m.code === initialCode);
      setBomFormParentName(matched?.name || matched?.description || '');
    }
  }, [createBomModal.isOpen, createBomModal.params.bomCode, boms, editingBom, fgMasters, masters, bomFormParentCode]);

  useEffect(() => {
    if (duplicateBomModal.isOpen && duplicateBomModal.params.bomCode && !duplicatingBom) {
      const found = boms.find(b => b.bomCode === duplicateBomModal.params.bomCode);
      if (found) setDuplicatingBom(found);
    }
  }, [duplicateBomModal.isOpen, duplicateBomModal.params.bomCode, boms, duplicatingBom]);

  useEffect(() => {
    if (revisionBomModal.isOpen && revisionBomModal.params.bomCode && !revisionBom) {
      const found = boms.find(b => b.bomCode === revisionBomModal.params.bomCode);
      if (found) setRevisionBom(found);
    }
  }, [revisionBomModal.isOpen, revisionBomModal.params.bomCode, boms, revisionBom]);

  useEffect(() => {
    if (deleteBomModal.isOpen && deleteBomModal.params.bomCode && !deleteConfirmBom) {
      const found = boms.find(b => b.bomCode === deleteBomModal.params.bomCode);
      if (found) setDeleteConfirmBom(found);
    }
  }, [deleteBomModal.isOpen, deleteBomModal.params.bomCode, boms, deleteConfirmBom]);

  useEffect(() => {
    if (createRouteModal.isOpen && createRouteModal.params.routeCode && !editingRoute) {
      const found = routeCards.find(r => r.routeCode === createRouteModal.params.routeCode || r.partCode === createRouteModal.params.routeCode);
      if (found) handleOpenEditRoute(found);
    } else if (createRouteModal.isOpen && !editingRoute && !routeFormPartCode) {
      const initialCode = routeFgMasters[0]?.code || '';
      setRouteFormPartCode(initialCode);
      const matched = masters.find(m => m.code === initialCode);
      setRouteFormPartDescription(matched?.description || matched?.name || '');
    }
  }, [createRouteModal.isOpen, createRouteModal.params.routeCode, routeCards, editingRoute, routeFgMasters, masters, routeFormPartCode]);

  useEffect(() => {
    if (duplicateRouteModal.isOpen && duplicateRouteModal.params.routeCode && !duplicatingRoute) {
      const found = routeCards.find(r => r.routeCode === duplicateRouteModal.params.routeCode || r.partCode === duplicateRouteModal.params.routeCode);
      if (found) setDuplicatingRoute(found);
    }
  }, [duplicateRouteModal.isOpen, duplicateRouteModal.params.routeCode, routeCards, duplicatingRoute]);

  useEffect(() => {
    if (deleteRouteModal.isOpen && deleteRouteModal.params.routeCode && !deleteConfirmRoute) {
      const found = routeCards.find(r => r.routeCode === deleteRouteModal.params.routeCode || r.partCode === deleteRouteModal.params.routeCode);
      if (found) setDeleteConfirmRoute(found);
    }
  }, [deleteRouteModal.isOpen, deleteRouteModal.params.routeCode, routeCards, deleteConfirmRoute]);

  // ----------------------------------------------------------------
  // MATRIX & EXPLOSION CALCULATOR STATE
  // ----------------------------------------------------------------
  const [matrixSelectedPart, setMatrixSelectedPart] = useState<string>('00000001');
  const [matrixBatchQty, setMatrixBatchQty] = useState<number>(250);

  const selectedMatrixItem = useMemo(() => {
    return masters.find(m => m.code === matrixSelectedPart) || {
      code: matrixSelectedPart,
      name: boms.find(b => b.parentPartCode === matrixSelectedPart)?.parentPartName || 'Manufactured Component',
      category: 'FINISHED_GOODS'
    };
  }, [masters, matrixSelectedPart, boms]);

  const selectedMatrixBOM = useMemo(() => {
    return boms.find(b => b.parentPartCode === matrixSelectedPart && b.status === 'ACTIVE') ||
           boms.find(b => b.parentPartCode === matrixSelectedPart) || null;
  }, [boms, matrixSelectedPart]);

  const selectedMatrixRoute = useMemo(() => {
    return routeCards.find(r => r.partCode === matrixSelectedPart && r.status === 'ACTIVE') ||
           routeCards.find(r => r.partCode === matrixSelectedPart) || null;
  }, [routeCards, matrixSelectedPart]);

  // Exploded Material Requirements based on Planned Batch Qty
  const explodedMaterialReqs = useMemo(() => {
    if (!selectedMatrixBOM || !selectedMatrixBOM.components) return [];
    return selectedMatrixBOM.components.map(comp => {
      const totalRawNeeded = Number((comp.qtyPerUnit * matrixBatchQty * (1 + (comp.scrapAllowancePct || 0) / 100)).toFixed(2));
      const matchedStock = stock.find(s => s.code.toLowerCase() === comp.componentCode.toLowerCase());
      const onHand = matchedStock?.onHand ?? 500;
      const deficit = Math.max(0, totalRawNeeded - onHand);
      const isShortage = deficit > 0;
      return {
        ...comp,
        totalRawNeeded,
        onHand,
        deficit,
        isShortage,
        totalCost: Number((totalRawNeeded * (comp.unitCost || 0)).toFixed(2))
      };
    });
  }, [selectedMatrixBOM, matrixBatchQty, stock]);

  // Exploded Machine Hours based on Planned Batch Qty
  const explodedCapacityReqs = useMemo(() => {
    if (!selectedMatrixRoute || !selectedMatrixRoute.operations) return [];
    return selectedMatrixRoute.operations.map(op => {
      const totalMins = op.standardTimeMinutes * matrixBatchQty;
      const totalHours = Number((totalMins / 60).toFixed(1));
      return {
        ...op,
        totalMins,
        totalHours
      };
    });
  }, [selectedMatrixRoute, matrixBatchQty]);

  // Filtered Job Cards
  const filteredCards = jobCards.filter(jc => {
    const matchesSearch = jc.jobNo.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          jc.orderPo.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          jc.partDescription.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'ALL' || jc.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const activeJobsCount = jobCards.filter(j => j.status === 'RUNNING' || j.status === 'SCHEDULED' || j.status === 'IN_PROGRESS').length;
  const runningMachinesCount = Array.from(new Set(jobCards.map(j => j.machine))).length;
  const completedJobsCount = jobCards.filter(j => j.status === 'COMPLETED').length;

  return (
    <div className="space-y-4 sm:space-y-6 font-sans w-full max-w-full min-w-0 pb-6">

      {/* ========================================================================= */}
      {/* ── MOBILE-FIRST TOP HEADER (< md) ──                                      */}
      {/* ========================================================================= */}
      <div className="block md:hidden space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[var(--accent-primary)] animate-pulse" />
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400">
                Manufacturing Hub
              </span>
            </div>
            <h1 className="text-xl font-black text-slate-900 dark:text-white tracking-tight leading-tight">
              {activeSection === 'job-cards' ? `Job Cards (${filteredCards.length})` :
               activeSection === 'route-cards' ? `Route Cards (${routeCards.length})` :
               activeSection === 'bom' ? `BOM Recipes (${boms.length})` : 'Engineering Hub'}
            </h1>
          </div>

          <div className="shrink-0">
            {activeSection === 'job-cards' && (
              <button
                onClick={openNewJobModal}
                className="min-h-[44px] px-3.5 py-2 rounded-xl bg-gradient-to-r from-[var(--accent-gradient-from)] to-[var(--accent-gradient-to)] text-white font-bold text-xs flex items-center gap-1.5 shadow-md cursor-pointer active:scale-[0.96] transition-transform font-mono"
              >
                <Plus className="w-4 h-4" />
                <span>New Job</span>
              </button>
            )}
            <button
              onClick={() => breakdownModal.open()}
              className="min-h-[44px] px-3 py-2 rounded-xl border border-rose-500/30 bg-rose-500/10 text-rose-500 font-bold text-xs flex items-center gap-1.5 cursor-pointer active:scale-[0.96] transition-transform"
            >
              <AlertTriangle className="w-4 h-4" />
              <span>Breakdown</span>
            </button>
            {activeSection === 'route-cards' && (
              <button
                onClick={handleOpenCreateRoute}
                className="min-h-[44px] px-3.5 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-bold text-xs flex items-center gap-1.5 shadow-md cursor-pointer active:scale-[0.96] transition-transform font-mono"
              >
                <Route className="w-4 h-4" />
                <span>+ Route</span>
              </button>
            )}
            {activeSection === 'bom' && (
              <button
                onClick={handleOpenCreateBom}
                className="min-h-[44px] px-3.5 py-2 rounded-xl bg-gradient-to-r from-[var(--accent-gradient-from)] to-[var(--accent-gradient-to)] text-white font-bold text-xs flex items-center gap-1.5 shadow-md cursor-pointer active:scale-[0.96] transition-transform font-mono"
              >
                <Layers className="w-4 h-4" />
                <span>+ BOM</span>
              </button>
            )}
          </div>
        </div>

        {/* Mobile 2x2 Telemetry Matrix */}
        <div className="grid grid-cols-2 gap-2">
          <div className={`p-3 rounded-2xl border ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
            <div className="text-[10px] font-bold uppercase text-slate-400 font-mono">Active Job Cards</div>
            <div className="text-base font-black text-indigo-500 tracking-tight mt-0.5">
              {activeJobsCount} <span className="text-xs font-normal text-slate-400">active</span>
            </div>
          </div>

          <div className={`p-3 rounded-2xl border ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
            <div className="text-[10px] font-bold uppercase text-slate-400 font-mono">BOM Recipes</div>
            <div className="text-base font-black text-slate-900 dark:text-white tracking-tight mt-0.5">
              {boms.length} <span className="text-xs font-normal text-slate-400">formulas</span>
            </div>
          </div>

          <div className={`p-3 rounded-2xl border ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
            <div className="text-[10px] font-bold uppercase text-slate-400 font-mono">Route Cards</div>
            <div className="text-base font-black text-emerald-500 tracking-tight mt-0.5">
              {routeCards.length} <span className="text-xs font-normal text-slate-400">routes</span>
            </div>
          </div>

          <div className={`p-3 rounded-2xl border ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
            <div className="text-[10px] font-bold uppercase text-slate-400 font-mono">OEE Efficiency</div>
            <div className="text-base font-black text-amber-500 tracking-tight mt-0.5">
              94.2% <span className="text-xs font-normal text-emerald-500">Nominal</span>
            </div>
          </div>
        </div>
      </div>
      
      {/* ========================================================================= */}
      {/* ── DESKTOP HEADER & INTEGRATED KPI ROW (≥ md) ──                          */}
      {/* ========================================================================= */}
      <div className="hidden md:block space-y-4">
        <section className={`overflow-hidden rounded-[24px] border ${isDarkMode ? 'border-white/[0.08] bg-[#121215]' : 'border-slate-200 bg-white shadow-[0_12px_36px_rgba(15,23,42,0.06)]'}`}>
          <div className="flex items-center justify-between gap-6 px-6 py-5">
            <div className="min-w-0">
              <div className="mb-1.5 flex items-center gap-2 font-mono text-[9px] font-bold uppercase tracking-[0.18em] text-slate-400">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                Shopfloor & Engineering Telemetry
                <span className="text-slate-300 dark:text-slate-700">/</span>
                <span>{activeJobsCount} Active Jobs</span>
              </div>
              <div className="flex items-baseline gap-3">
                <h1 className="truncate text-[25px] font-extrabold tracking-[-0.04em] text-slate-950 dark:text-white">
                  Production & Manufacturing Engineering
                </h1>
                <span className="hidden font-mono text-[10px] font-semibold text-slate-400 xl:inline">
                  JOB CARDS • ROUTE CARDS • BOM RECIPES • CAPACITY MATRIX
                </span>
              </div>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                Manage Bill of Materials (BOM recipes), configure multi-operation Route Cards, simulate batch requirements, and release shopfloor Job Cards.
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => breakdownModal.open()}
                className="flex h-11 shrink-0 items-center gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 hover:bg-rose-500/20 px-3.5 text-xs font-bold text-rose-600 dark:text-rose-400 transition-ui cursor-pointer active:scale-[0.96]"
                title="Report machine downtime or breakdown to shopfloor cell"
              >
                <AlertTriangle className="h-4 w-4" />
                <span>Report Breakdown</span>
              </button>

              {activeSection === 'job-cards' && (
                <button
                  onClick={openNewJobModal}
                  className="flex h-11 shrink-0 items-center gap-2 rounded-xl bg-[var(--accent-primary)] px-4 text-xs font-extrabold text-white shadow-[0_8px_20px_var(--accent-shadow)] transition-ui hover:bg-[var(--accent-hover)] active:scale-[0.96]"
                >
                  <Plus className="h-4 w-4" />
                  Create Job Card
                </button>
              )}
              {activeSection === 'route-cards' && (
                <button
                  onClick={handleOpenCreateRoute}
                  className="flex h-11 shrink-0 items-center gap-2 rounded-xl bg-[var(--accent-primary)] px-4 text-xs font-extrabold text-white shadow-[0_8px_20px_var(--accent-shadow)] transition-ui hover:bg-[var(--accent-hover)] active:scale-[0.96]"
                >
                  <Route className="h-4 w-4" />
                  Create Route Card
                </button>
              )}
              {activeSection === 'bom' && (
                <button
                  onClick={handleOpenCreateBom}
                  className="flex h-11 shrink-0 items-center gap-2 rounded-xl bg-[var(--accent-primary)] px-4 text-xs font-extrabold text-white shadow-[0_8px_20px_var(--accent-shadow)] transition-ui hover:bg-[var(--accent-hover)] active:scale-[0.96]"
                >
                  <Layers className="h-4 w-4" />
                  Create BOM Formula
                </button>
              )}
            </div>
          </div>

          {/* Integrated 4-Column Metric Strip (border-t) */}
          <div className={`grid grid-cols-4 border-t ${isDarkMode ? 'border-white/[0.07]' : 'border-slate-200'}`}>
            {[
              { label: 'Active Job Cards', value: String(activeJobsCount), detail: 'Shopfloor execution', icon: Factory, tone: 'text-[var(--accent-text-light)] dark:text-[var(--accent-text-dark)]', iconBg: 'bg-[var(--accent-soft-light)] dark:bg-[var(--accent-soft-dark)]' },
              { label: 'Configured BOMs', value: String(boms.length), detail: 'WHAT formulas', icon: Layers, tone: 'text-indigo-600 dark:text-indigo-400', iconBg: 'bg-indigo-500/10' },
              { label: 'Route Cards', value: String(routeCards.length), detail: 'HOW sequences', icon: Route, tone: 'text-emerald-600 dark:text-emerald-400', iconBg: 'bg-emerald-500/10' },
              { label: 'OEE Efficiency', value: '94.2%', detail: 'Nominal shopfloor rate', icon: Activity, tone: 'text-amber-600 dark:text-amber-400', iconBg: 'bg-amber-500/10' },
            ].map((metric, index) => {
              const MetricIcon = metric.icon;
              return (
                <div key={metric.label} className={`flex items-center gap-3 px-5 py-4 ${index > 0 ? isDarkMode ? 'border-l border-white/[0.07]' : 'border-l border-slate-200' : ''}`}>
                  <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${metric.iconBg} ${metric.tone}`}>
                    <MetricIcon className="h-4 w-4" />
                  </div>
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

        {/* Global Toast Feedback Banners */}
        {actionSuccess && (
          <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex items-center justify-between font-mono">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>{actionSuccess}</span>
            </div>
            <button onClick={() => setActionSuccess(null)} className="cursor-pointer text-slate-400 hover:text-white"><X className="w-4 h-4" /></button>
          </div>
        )}
        {actionError && (
          <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center justify-between font-mono">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-400" />
              <span>{actionError}</span>
            </div>
            <button onClick={() => setActionError(null)} className="cursor-pointer text-slate-400 hover:text-white"><X className="w-4 h-4" /></button>
          </div>
        )}

        {/* Desktop Primary Section Navigation & Search Toolbar */}
        <div className={`rounded-2xl border p-3 ${isDarkMode ? 'border-white/[0.08] bg-[#121215]' : 'border-slate-200 bg-white shadow-[0_6px_22px_rgba(15,23,42,0.04)]'}`}>
          <div className="flex items-center gap-2">
            <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${isDarkMode ? 'bg-white/[0.05] text-slate-400' : 'bg-slate-100 text-slate-500'}`} title="Modules">
              <Factory className="h-4 w-4" />
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto">
              {[
                { id: 'job-cards', label: 'Job Cards (Shopfloor)', count: jobCards.length, icon: Factory },
                { id: 'route-cards', label: 'Route Cards (HOW)', count: routeCards.length, icon: Route },
                { id: 'bom', label: 'Bill of Materials (WHAT)', count: boms.length, icon: Layers },
                { id: 'matrix', label: 'Engineering Hub & Matrix', icon: GitFork },
              ].map(section => {
                const Icon = section.icon;
                const isActive = activeSection === section.id;
                return (
                  <button
                    key={section.id}
                    onClick={() => setActiveSection(section.id as ProductionSection)}
                    className={`flex items-center gap-1.5 h-10 px-3.5 rounded-xl text-xs font-bold transition-ui cursor-pointer whitespace-nowrap border ${
                      isActive
                        ? isDarkMode
                          ? 'bg-[var(--accent-primary)]/20 text-[var(--accent-text-dark)] border-[var(--accent-primary)]/40 shadow-xs'
                          : 'bg-[var(--accent-primary)] text-white border-[var(--accent-primary)] shadow-sm shadow-[var(--accent-shadow)]'
                        : isDarkMode
                          ? 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-white/[0.06]'
                          : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span>{section.label}</span>
                    {section.count !== undefined && (
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-mono ${
                        isActive
                          ? isDarkMode ? 'bg-[var(--accent-primary)]/30 text-white' : 'bg-white/25 text-white'
                          : isDarkMode ? 'bg-white/[0.06] text-slate-400' : 'bg-slate-200 text-slate-600'
                      }`}>
                        {section.count}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            <div className={`flex h-10 min-w-[240px] flex-1 items-center gap-2 rounded-xl border px-3 ml-auto ${isDarkMode ? 'border-white/[0.08] bg-black/20 text-white focus-within:border-[var(--accent-border-dark)]' : 'border-slate-200 bg-slate-50 text-slate-900 focus-within:border-[var(--accent-primary)]'}`}>
              <Search className="h-4 w-4 shrink-0 text-slate-400" />
              <input
                type="text"
                placeholder={
                  activeSection === 'job-cards' ? "Search Job #, Machine, Part..." :
                  activeSection === 'route-cards' ? "Search Part Code, Route..." :
                  activeSection === 'bom' ? "Search BOM Code, SKU..." : "Search Finished Good SKU..."
                }
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-full w-full bg-transparent text-xs font-semibold outline-none placeholder:font-normal placeholder:text-slate-400 font-mono"
              />
              {searchQuery && (
                <button type="button" onClick={() => setSearchQuery('')} className="text-slate-400 hover:text-slate-700 dark:hover:text-white">
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>

          <div className="mt-2.5 flex items-center justify-between px-1 font-mono text-[9px] font-semibold uppercase tracking-wider text-slate-400">
            <span>Showing {activeSection === 'job-cards' ? filteredCards.length : activeSection === 'route-cards' ? routeCards.length : activeSection === 'bom' ? boms.length : 1} records</span>
            <span>Discrete Manufacturing & Shopfloor Execution Control</span>
          </div>
        </div>
      </div>

      {/* ========================================================================================= */}
      {/* SECTION 1: JOB CARDS & SHOPFLOOR EXECUTION */}
      {/* ========================================================================================= */}
      {activeSection === 'job-cards' && (
        <div className="space-y-4">
          {/* Status Filter Tabs & View Switcher Bar */}
          <div className={`p-2.5 rounded-2xl border flex items-center justify-between gap-3 ${
            isDarkMode ? 'border-white/[0.08] bg-[#121215]' : 'border-slate-200 bg-white shadow-[0_6px_22px_rgba(15,23,42,0.04)]'
          }`}>
            <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none">
              <div className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400 px-2 shrink-0">
                Status:
              </div>
              {[
                { id: 'ALL', label: 'All Jobs', count: jobCards.length },
                { id: 'SCHEDULED', label: 'Scheduled', count: jobCards.filter(j => j.status === 'SCHEDULED').length },
                { id: 'RUNNING', label: 'Running', count: jobCards.filter(j => j.status === 'RUNNING').length },
                { id: 'IN_PROGRESS', label: 'In Progress', count: jobCards.filter(j => j.status === 'IN_PROGRESS').length },
                { id: 'COMPLETED', label: 'Completed', count: jobCards.filter(j => j.status === 'COMPLETED').length },
              ].map(tab => {
                const isActive = statusFilter === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setStatusFilter(tab.id)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-mono font-bold transition-ui cursor-pointer whitespace-nowrap border ${
                      isActive
                        ? isDarkMode 
                          ? 'bg-[var(--accent-soft-dark)] text-[var(--accent-text-dark)] border-[var(--accent-border-dark)] shadow-xs'
                          : 'bg-[var(--accent-primary)] text-white border-[var(--accent-primary)] shadow-xs'
                        : isDarkMode
                          ? 'bg-white/[0.04] text-slate-400 border-white/[0.06] hover:text-slate-200 hover:bg-white/[0.08]'
                          : 'bg-slate-50 text-slate-600 border-slate-200 hover:text-slate-900 hover:bg-slate-100'
                    }`}
                  >
                    <span>{tab.label}</span>
                    <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                      isActive
                        ? isDarkMode ? 'bg-white/20 text-white' : 'bg-white/25 text-white'
                        : isDarkMode ? 'bg-white/[0.06] text-slate-400' : 'bg-slate-200 text-slate-700'
                    }`}>
                      {tab.count}
                    </span>
                  </button>
                );
              })}
            </div>

            <div className={`flex items-center p-1 rounded-xl border shrink-0 ${
              isDarkMode ? 'bg-white/[0.04] border-white/[0.08]' : 'bg-slate-100 border-slate-200'
            }`}>
              <button
                onClick={() => setViewMode('list')}
                className={`p-1.5 rounded-lg transition-ui cursor-pointer ${
                  viewMode === 'list' ? (isDarkMode ? 'bg-white/[0.1] text-white shadow-xs' : 'bg-white text-slate-900 shadow-xs') : 'text-slate-400 hover:text-slate-700 dark:hover:text-white'
                }`}
                title="List View"
              >
                <List className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('board')}
                className={`p-1.5 rounded-lg transition-ui cursor-pointer ${
                  viewMode === 'board' ? (isDarkMode ? 'bg-white/[0.1] text-white shadow-xs' : 'bg-white text-slate-900 shadow-xs') : 'text-slate-400 hover:text-slate-700 dark:hover:text-white'
                }`}
                title="Kanban Board"
              >
                <Kanban className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Dedicated Mobile Job Cards (< md) */}
          <div className="block md:hidden space-y-3">
            {filteredCards.length === 0 ? (
              <div className={`p-8 rounded-3xl border text-center ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
                <Factory className="w-8 h-8 text-slate-400 mx-auto mb-2 opacity-50" />
                <p className="text-xs font-bold text-slate-700 dark:text-slate-300">No job cards found</p>
                <p className="text-[10px] text-slate-400 mt-0.5">Try adjusting your filters</p>
              </div>
            ) : (
              filteredCards.map((jc) => {
                const isRunning = jc.jobStatus === 'IN_PROGRESS' || jc.status === 'RUNNING' || jc.status === 'IN_PROGRESS';
                const isHold = jc.jobStatus === 'QC_HOLD' || jc.status === 'QC_HOLD';
                const isDone = jc.jobStatus === 'COMPLETED' || jc.status === 'COMPLETED';

                return (
                  <div
                    key={jc.jobNo}
                    onClick={() => setSelectedJobForDetail(jc)}
                    className={`p-4 rounded-2xl border space-y-3 cursor-pointer shadow-2xs active:scale-[0.96] transition-ui ${
                      isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
                    }`}
                  >
                    {/* Top Row: Job # + Status Pill */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="font-mono font-black text-sm text-[var(--accent-primary)] truncate">
                          {jc.jobNo}
                        </span>
                        {jc.drawingRevision && (
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-mono bg-emerald-500/10 text-emerald-500 dark:text-emerald-400 border border-emerald-500/20 shrink-0">
                            Rev: {jc.drawingRevision}
                          </span>
                        )}
                      </div>

                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase border shrink-0 flex items-center gap-1 ${
                        isHold
                          ? 'bg-rose-500/10 text-rose-500 dark:text-rose-400 border-rose-500/30'
                          : isRunning
                          ? 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/30'
                          : isDone
                          ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                          : 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${
                          isHold ? 'bg-rose-500' : isRunning ? 'bg-purple-500 animate-pulse' : isDone ? 'bg-emerald-500' : 'bg-blue-500'
                        }`} />
                        <span>{jc.jobStatus || jc.status}</span>
                      </span>
                    </div>

                    {/* Part & Order Info */}
                    <div>
                      <div className="text-xs font-bold text-slate-900 dark:text-white truncate">
                        {jc.partCode} — {jc.partDescription}
                      </div>
                      <div className="flex flex-wrap items-center gap-1.5 mt-1 text-[10px] font-mono">
                        <span className="text-slate-400">PO: <strong className="text-slate-700 dark:text-slate-300">{jc.orderPo}</strong></span>
                        {jc.materialIssuedLot && (
                          <span className="px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                            Heat: {jc.materialIssuedLot}
                          </span>
                        )}
                        {jc.hasOpenNcr && (
                          <span className="px-1.5 py-0.5 rounded bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 font-bold">
                            Hold: {jc.ncrReference || 'NCR'}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Metrics Row */}
                    <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800 text-xs font-mono">
                      <div>
                        <div className="text-[10px] text-slate-400 uppercase">Target Qty</div>
                        <div className="text-sm font-bold text-slate-900 dark:text-white mt-0.5">
                          {jc.targetQty || jc.qty} NOS
                        </div>
                      </div>

                      <div className="text-center">
                        <div className="text-[10px] text-slate-400 uppercase">Machine Center</div>
                        <div className="text-xs font-semibold text-purple-600 dark:text-purple-400 mt-0.5">
                          {jc.machine || jc.currentOperation || 'VMC Center'}
                        </div>
                      </div>

                      <div className="text-right">
                        <div className="text-[10px] text-slate-400 uppercase">Target Date</div>
                        <div className="text-xs font-semibold text-amber-600 dark:text-amber-400 mt-0.5">
                          {jc.targetDate}
                        </div>
                      </div>
                    </div>

                    {/* Touch Action Buttons */}
                    <div className="pt-1 flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => {
                          setSelectedJobForDetail(jc);
                          jobDetailModal.open({ jobNo: jc.jobNo });
                        }}
                        className="flex-1 py-2 px-3 rounded-xl font-mono text-xs font-bold bg-gradient-to-r from-[#5B75F8] to-indigo-600 hover:from-indigo-500 hover:to-[#5B75F8] text-white border border-[#7B92FF]/30 shadow-xs flex items-center justify-center gap-1.5 cursor-pointer active:scale-[0.96] transition-ui"
                      >
                        <Route className="w-3.5 h-3.5 text-white" />
                        <span>View Card</span>
                      </button>
                      <button
                        onClick={() => {
                          setSelectedJobForDetail(jc);
                          jobDetailModal.open({ jobNo: jc.jobNo });
                        }}
                        title="Print Route Card"
                        className={`p-2 rounded-xl border flex items-center justify-center font-mono text-xs transition-ui cursor-pointer ${
                          isDarkMode
                            ? 'border-slate-700 bg-slate-800 text-slate-200 hover:bg-slate-700 hover:text-white'
                            : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        <Printer className="w-4 h-4 text-emerald-400" />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Main Desktop Jobs Table / Kanban (≥ md) */}
          <div className="hidden md:block">
            {viewMode === 'list' ? (
              <div className={`overflow-hidden rounded-[22px] border transition-ui ${
                isDarkMode ? 'border-white/[0.08] bg-[#121215]' : 'border-slate-200 bg-white shadow-[0_12px_36px_rgba(15,23,42,0.06)]'
              }`}>
                <div className={`flex items-center justify-between border-b px-5 py-3 ${isDarkMode ? 'border-white/[0.07]' : 'border-slate-200'}`}>
                  <div>
                    <div className="text-xs font-extrabold text-slate-900 dark:text-white">Active Shopfloor Job Cards</div>
                    <div className="mt-0.5 text-[10px] text-slate-400">Live operational execution, machine assignment, and routing traveler status</div>
                  </div>
                  <span className={`rounded-lg border px-2 py-1 font-mono text-[9px] font-bold uppercase tracking-wider ${isDarkMode ? 'border-white/[0.08] bg-white/[0.04] text-slate-400' : 'border-slate-200 bg-slate-50 text-slate-500'}`}>{filteredCards.length} job cards</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse font-mono">
                    <thead>
                      <tr className={`border-b font-mono font-bold uppercase tracking-[0.12em] text-[9px] ${
                        isDarkMode ? 'border-white/[0.07] bg-black/20 text-slate-500' : 'border-slate-200 bg-slate-50/80 text-slate-400'
                      }`}>
                        <th className="py-4 px-5">Job Card #</th>
                        <th className="py-4 px-5">Customer Order PO</th>
                        <th className="py-4 px-5">Part Description</th>
                        <th className="py-4 px-5 text-right">Job Qty</th>
                        <th className="py-4 px-5">Machine Center</th>
                        <th className="py-4 px-5">Target Date</th>
                        <th className="py-4 px-5 text-center">Status</th>
                        <th className="py-4 px-5 text-center">Action</th>
                      </tr>
                    </thead>
                    <tbody className={`divide-y ${isDarkMode ? 'divide-slate-800/60' : 'divide-slate-200'}`}>
                      {filteredCards.length === 0 ? (
                        <tr>
                          <td colSpan={8} className="py-12 text-center text-slate-400 font-mono text-xs">
                            No job cards found matching criteria.
                          </td>
                        </tr>
                      ) : null}
                      {filteredCards.map((jc) => (
                        <tr 
                          key={jc.jobNo} 
                          onClick={() => {
                            setSelectedJobForDetail(jc);
                            jobDetailModal.open({ jobNo: jc.jobNo });
                          }}
                          className={`group transition-colors ${isDarkMode ? 'hover:bg-white/[0.035]' : 'hover:bg-slate-50/80'}`}
                        >
                          <td className="py-4 px-5">
                            <div className="flex items-center gap-2.5">
                              <div className={`p-2 rounded-xl transition-transform group-hover:scale-105 shrink-0 ${
                                isDarkMode 
                                  ? 'bg-[var(--accent-primary)]/20 text-[var(--accent-text-dark)] border border-[var(--accent-primary)]/30' 
                                  : 'bg-[var(--accent-primary)]/10 text-[var(--accent-text-light)] border border-[var(--accent-primary)]/20'
                              }`}>
                                <Factory className="w-3.5 h-3.5" />
                              </div>
                              <div className="min-w-0">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span className="font-bold text-xs font-mono text-[var(--accent-primary)] dark:text-[var(--accent-text-dark)]">
                                    {jc.jobNo}
                                  </span>
                                  {jc.drawingRevision && (
                                    <span className={`px-1.5 py-0.5 rounded-md text-[9px] font-mono font-bold uppercase tracking-wider border ${
                                      isDarkMode ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                    }`}>
                                      Rev: {jc.drawingRevision}
                                    </span>
                                  )}
                                </div>
                                {jc.materialIssuedLot && (
                                  <div className={`text-[10px] font-mono truncate mt-0.5 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                                    Heat: {jc.materialIssuedLot}
                                  </div>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="py-4 px-5 font-mono text-slate-400">
                            <div className="font-bold text-slate-800 dark:text-slate-200">{jc.orderPo}</div>
                          </td>
                          <td className={`py-4 px-5 font-semibold font-sans ${isDarkMode ? 'text-slate-100' : 'text-slate-800'}`}>
                            <div>{jc.partCode} — {jc.partDescription}</div>
                            {jc.hasOpenNcr && (
                              <span className="inline-flex items-center gap-1 mt-1 px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-rose-500/20 text-rose-400 border border-rose-500/40">
                                <AlertTriangle className="w-3 h-3" />
                                <span>Hold: {jc.ncrReference || 'Open NCR'}</span>
                              </span>
                            )}
                          </td>
                          <td className={`py-4 px-5 text-right font-bold font-mono ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                            {jc.targetQty || jc.qty} NOS
                          </td>
                          <td className="py-4 px-5 font-mono text-purple-400 font-medium">
                            {jc.machine || jc.currentOperation || 'VMC / Lathe Center'}
                          </td>
                          <td className="py-4 px-5 font-mono text-amber-500">
                            {jc.targetDate}
                          </td>
                          <td className="py-4 px-5 text-center">
                            <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-[10px] font-mono font-bold uppercase border ${
                              jc.jobStatus === 'QC_HOLD' || jc.status === 'QC_HOLD'
                                ? 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                                : jc.jobStatus === 'IN_PROGRESS' || jc.status === 'RUNNING' || jc.status === 'IN_PROGRESS'
                                ? 'bg-purple-500/10 text-purple-400 border-purple-500/30'
                                : jc.jobStatus === 'COMPLETED' || jc.status === 'COMPLETED'
                                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                                  : 'bg-[#5B75F8]/10 text-[#7B92FF] border-[#5B75F8]/30'
                            }`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${
                                jc.jobStatus === 'QC_HOLD' || jc.status === 'QC_HOLD' 
                                  ? 'bg-rose-500' 
                                  : jc.jobStatus === 'IN_PROGRESS' || jc.status === 'RUNNING' 
                                  ? 'bg-purple-500 animate-pulse' 
                                  : 'bg-[#5B75F8]'
                              }`} />
                              <span>{jc.jobStatus || jc.status}</span>
                            </span>
                          </td>
                          <td className="py-3 px-5 text-center" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                onClick={() => {
                                  setSelectedJobForDetail(jc);
                                  jobDetailModal.open({ jobNo: jc.jobNo });
                                }}
                                className={`px-3 py-1.5 rounded-xl font-mono text-xs font-bold transition-ui cursor-pointer ${
                                  isDarkMode ? 'bg-[var(--accent-soft-dark)] text-[var(--accent-text-dark)] hover:brightness-125 border border-[var(--accent-border-dark)]' : 'bg-[var(--accent-soft-light)] text-[var(--accent-text-light)] hover:brightness-95 border border-[var(--accent-border-light)]'
                                }`}
                                title="Open Full Job Card Detail View"
                              >
                                View Card
                              </button>
                              <button
                                onClick={() => {
                                  setSelectedJobForDetail(jc);
                                  jobDetailModal.open({ jobNo: jc.jobNo });
                                }}
                                className={`p-1.5 rounded-xl border flex items-center justify-center font-mono text-xs transition-ui cursor-pointer ${
                                  isDarkMode
                                    ? 'border-slate-700 bg-slate-800 text-slate-200 hover:bg-slate-700 hover:text-white'
                                    : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-100'
                                }`}
                                title="Print Route Card"
                              >
                                <Printer className="w-3.5 h-3.5 text-emerald-400" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              /* Kanban Board View */
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {['SCHEDULED', 'RUNNING', 'COMPLETED'].map((colStatus) => {
                  const colJobs = filteredCards.filter(j => j.status === colStatus || (colStatus === 'RUNNING' && j.status === 'IN_PROGRESS'));
                return (
                  <div key={colStatus} className={`p-4 rounded-3xl border ${
                    isDarkMode ? 'bg-slate-900/60 border-slate-800/80' : 'bg-slate-50 border-slate-200'
                  }`}>
                    <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-200 dark:border-slate-800">
                      <span className={`font-bold text-xs font-mono tracking-wider ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{colStatus}</span>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ${
                        isDarkMode ? 'bg-slate-800 text-slate-300' : 'bg-slate-200 text-slate-700'
                      }`}>
                        {colJobs.length}
                      </span>
                    </div>

                    <div className="space-y-3">
                      {colJobs.map(jc => (
                        <div 
                          key={jc.jobNo} 
                          onClick={() => {
                            setSelectedJobForDetail(jc);
                            jobDetailModal.open({ jobNo: jc.jobNo });
                          }}
                          className={`p-4 rounded-2xl border transition-ui cursor-pointer hover:scale-[1.01] ${
                            isDarkMode ? 'bg-slate-900 border-slate-800 hover:border-[#5B75F8]/50' : 'bg-white border-slate-200 shadow-sm hover:border-[#5B75F8]'
                          }`}
                        >
                          <div className="flex items-center justify-between text-xs font-mono font-bold text-[#5B75F8]">
                            <span>{jc.jobNo}</span>
                            <span className={isDarkMode ? 'text-slate-400' : 'text-slate-500'}>{jc.targetQty || jc.qty} NOS</span>
                          </div>
                          <div className={`mt-1 font-semibold text-xs font-sans ${isDarkMode ? 'text-slate-200' : 'text-slate-800'}`}>
                            {jc.partDescription}
                          </div>
                          <div className={`mt-2 flex items-center justify-between text-[11px] font-mono ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                            <span>{jc.machine}</span>
                            <span className={isDarkMode ? 'text-amber-400' : 'text-amber-600'}>{jc.targetDate}</span>
                          </div>
                          <div className="mt-3 pt-2 border-t border-slate-200 dark:border-slate-800/60 flex items-center justify-between">
                            <span className="text-[10px] font-mono text-indigo-500 dark:text-indigo-400 flex items-center gap-1 font-medium">
                              <Route className="w-3 h-3" />
                              <span>Job Card Details</span>
                            </span>
                            <span className={`text-[10px] font-mono font-bold ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                              {(jc.operations?.filter((o: any) => o.opStatus === 'COMPLETED').length || 0)} / {(jc.operations?.length || 2)} Ops Done
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    )}

      {/* ========================================================================================= */}
      {/* SECTION 2: ROUTE CARDS (HOW: SEQUENCE & PROCESS TRAVELERS) */}
      {/* ========================================================================================= */}
      {activeSection === 'route-cards' && (
        <div className="space-y-4">
          {routeCards.length === 0 ? (
            <div className={`p-10 rounded-[22px] border text-center ${
              isDarkMode ? 'border-white/[0.08] bg-[#121215]' : 'border-slate-200 bg-white shadow-[0_12px_36px_rgba(15,23,42,0.06)]'
            }`}>
              <div className="inline-flex p-3 rounded-2xl bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 mb-3">
                <Route className="w-7 h-7" />
              </div>
              <h4 className={`text-base font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>No Route Cards Configured</h4>
              <p className={`text-xs mt-1 font-mono max-w-md mx-auto ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                Configure operational sequence templates (Cutting → Turning → Milling → HT → Grinding → QC → Packing) to govern how products are manufactured.
              </p>
              <button
                onClick={handleOpenCreateRoute}
                className="mt-4 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs font-mono inline-flex items-center gap-2 cursor-pointer shadow-md shadow-emerald-500/20"
              >
                <Plus className="w-4 h-4" />
                <span>Create Master Route Card</span>
              </button>
            </div>
          ) : null}

          {routeCards.map(route => {
            const isExpanded = expandedRoutePart === route.partCode;
            const totalMins = route.totalStandardTimeMinutes || route.operations?.reduce((sum, op) => sum + (op.standardTimeMinutes || 0), 0) || 0;
            const totalHours = (totalMins / 60).toFixed(1);

            return (
              <div
                key={route.partCode}
                className={`rounded-[22px] border transition-ui overflow-hidden ${
                  isDarkMode ? 'border-white/[0.08] bg-[#121215]' : 'border-slate-200 bg-white shadow-[0_6px_22px_rgba(15,23,42,0.04)]'
                }`}
              >
                <div
                  className={`p-5 flex flex-wrap items-center justify-between gap-4 transition-ui ${
                    isDarkMode ? 'hover:bg-white/[0.02]' : 'hover:bg-slate-50'
                  }`}
                >
                  <div 
                    onClick={() => setExpandedRoutePart(isExpanded ? null : route.partCode)}
                    className="flex items-center gap-3.5 cursor-pointer flex-1 min-w-[280px]"
                  >
                    <div className="p-2.5 rounded-xl bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                      <Route className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold font-mono text-sm text-emerald-500 dark:text-emerald-400">{route.partCode}</span>
                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-mono ${
                          isDarkMode ? 'bg-white/[0.06] text-slate-300' : 'bg-slate-100 text-slate-600'
                        }`}>{route.revision || 'REV-A'}</span>
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                          {route.status || 'ACTIVE'}
                        </span>
                      </div>
                      <h4 className={`text-sm font-semibold mt-0.5 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                        {route.partDescription}
                      </h4>
                    </div>
                  </div>

                  <div className="flex items-center gap-6">
                    <div className="text-right font-mono">
                      <div className={`text-[11px] ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                        Sequence: <span className={`font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{route.operations?.length || 0} Stages</span>
                      </div>
                      <div className="text-[11px] text-emerald-400 font-bold">
                        Std Cycle Time: {totalMins}m ({totalHours} hrs/unit)
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => handleOpenEditRoute(route)}
                        title="Edit Route Card Sequences"
                        className={`p-2 rounded-xl border text-xs font-mono font-bold cursor-pointer transition-ui hover:scale-105 active:scale-[0.96] ${
                          isDarkMode ? 'border-white/[0.08] bg-white/[0.04] text-slate-300 hover:text-white' : 'border-slate-200 bg-slate-50 text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        <Edit className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => setDuplicatingRoute(route)}
                        title="Duplicate Route Card"
                        className={`p-2 rounded-xl border text-xs font-mono font-bold cursor-pointer transition-ui hover:scale-105 active:scale-[0.96] ${
                          isDarkMode ? 'border-white/[0.08] bg-white/[0.04] text-slate-300 hover:text-white' : 'border-slate-200 bg-slate-50 text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => {
                          setDeleteConfirmRoute(route);
                          deleteRouteModal.open({ routeCode: route.routeCode || route.partCode });
                        }}
                        title="Delete Route Card"
                        className="p-2 rounded-xl border border-rose-500/30 bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 shadow-xs text-xs font-mono font-bold cursor-pointer transition-ui hover:scale-105 active:scale-[0.96]"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => setExpandedRoutePart(isExpanded ? null : route.partCode)}
                        className={`p-2 rounded-xl border text-slate-400 hover:text-white cursor-pointer transition-ui hover:scale-105 active:scale-[0.96] ${
                          isDarkMode ? 'border-white/[0.08] bg-white/[0.04]' : 'border-slate-200 bg-slate-50'
                        }`}
                      >
                        {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Collapsible Sequenced Operations Flow */}
                {isExpanded && (
                  <div className={`p-5 border-t ${
                    isDarkMode ? 'border-white/[0.07] bg-black/20' : 'border-slate-200 bg-slate-50/60'
                  }`}>
                    <div className="flex items-center justify-between mb-3">
                      <h5 className={`text-[11px] font-mono uppercase font-bold ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                        Operational Routing Sequences (HOW Process Traveler)
                      </h5>
                      <span className="text-[10px] font-mono text-emerald-400">
                        Total {route.operations?.length} Process Steps
                      </span>
                    </div>

                    <div className={`rounded-2xl border overflow-hidden ${
                      isDarkMode ? 'border-white/[0.07]' : 'border-slate-200'
                    }`}>
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs border-collapse font-mono">
                          <thead>
                            <tr className={`border-b font-bold uppercase tracking-wider text-[10px] ${
                              isDarkMode ? 'bg-black/20 border-white/[0.07] text-slate-400' : 'bg-slate-100/80 border-slate-200 text-slate-500'
                            }`}>
                              <th className="py-3 px-4 text-center">Seq #</th>
                              <th className="py-3 px-4">Operation Name</th>
                              <th className="py-3 px-4">Work Center / Machine</th>
                              <th className="py-3 px-4 text-right">Std Time</th>
                              <th className="py-3 px-4 text-center">Inspection Req</th>
                              <th className="py-3 px-4">Required Certification</th>
                            </tr>
                          </thead>
                          <tbody className={`divide-y ${isDarkMode ? 'divide-slate-800/50' : 'divide-slate-200'}`}>
                            {route.operations?.map((op, idx) => (
                              <tr key={op.id || idx} className={isDarkMode ? 'hover:bg-white/[0.02]' : 'bg-white hover:bg-slate-50'}>
                                <td className="py-3 px-4 text-center font-bold text-emerald-400">
                                  {op.sequenceNo}
                                </td>
                                <td className={`py-3 px-4 font-semibold ${isDarkMode ? 'text-slate-200' : 'text-slate-900'}`}>
                                  {op.operationName}
                                </td>
                                <td className="py-3 px-4 text-purple-400 font-medium">
                                  {op.workCenter}
                                </td>
                                <td className="py-3 px-4 text-right font-bold text-amber-500">
                                  {op.standardTimeMinutes} mins
                                </td>
                                <td className="py-3 px-4 text-center">
                                  {op.inspectionRequired ? (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/30">
                                      <ShieldCheck className="w-3 h-3" /> QC Gate
                                    </span>
                                  ) : (
                                    <span className="text-slate-500 text-[10px]">No</span>
                                  )}
                                </td>
                                <td className={`py-3 px-4 ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                                  {op.requiredCertification || 'None'}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ========================================================================================= */}
      {/* SECTION 3: BILL OF MATERIALS (WHAT: RECIPE & RAW MATERIALS) */}
      {/* ========================================================================================= */}
      {activeSection === 'bom' && (
        <div className="space-y-4">
          {boms.length === 0 ? (
            <div className={`p-10 rounded-[22px] border text-center ${
              isDarkMode ? 'border-white/[0.08] bg-[#121215]' : 'border-slate-200 bg-white shadow-[0_12px_36px_rgba(15,23,42,0.06)]'
            }`}>
              <div className="inline-flex p-3 rounded-2xl bg-[var(--accent-primary)]/15 text-[var(--accent-primary)] dark:text-[var(--accent-text-dark)] border border-[var(--accent-primary)]/30 mb-3">
                <Layers className="w-7 h-7" />
              </div>
              <h4 className={`text-base font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>No BOM Formulas Configured</h4>
              <p className={`text-xs mt-1 font-mono max-w-md mx-auto ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                Configure engineering Bill of Materials to define the raw materials, standard batch size, scrap allowances, and component costs consumed per finished good.
              </p>
              <button
                onClick={handleOpenCreateBom}
                className="mt-4 px-5 py-2.5 rounded-xl bg-[var(--accent-primary)] hover:bg-[var(--accent-hover)] text-white font-bold text-xs font-mono inline-flex items-center gap-2 cursor-pointer shadow-md shadow-[var(--accent-shadow)]"
              >
                <Plus className="w-4 h-4" />
                <span>Create BOM Formula</span>
              </button>
            </div>
          ) : null}

          {boms.map(bom => {
            const isExpanded = expandedBomCode === bom.bomCode;
            return (
              <div
                key={bom.id || bom.bomCode}
                className={`rounded-[22px] border transition-ui overflow-hidden ${
                  isDarkMode ? 'border-white/[0.08] bg-[#121215]' : 'border-slate-200 bg-white shadow-[0_6px_22px_rgba(15,23,42,0.04)]'
                }`}
              >
                <div
                  className={`p-5 flex flex-wrap items-center justify-between gap-4 transition-ui ${
                    isDarkMode ? 'hover:bg-white/[0.02]' : 'hover:bg-slate-50'
                  }`}
                >
                  <div 
                    onClick={() => setExpandedBomCode(isExpanded ? null : bom.bomCode)}
                    className="flex items-center gap-3.5 cursor-pointer flex-1 min-w-[280px]"
                  >
                    <div className="p-2.5 rounded-xl bg-[var(--accent-primary)]/15 text-[var(--accent-primary)] dark:text-[var(--accent-text-dark)] border border-[var(--accent-primary)]/30">
                      <Layers className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold font-mono text-sm text-[var(--accent-primary)] dark:text-[var(--accent-text-dark)]">{bom.bomCode}</span>
                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-mono ${
                          isDarkMode ? 'bg-white/[0.06] text-slate-300' : 'bg-slate-100 text-slate-600'
                        }`}>{bom.revision}</span>
                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-mono font-bold border ${
                          bom.status === 'ACTIVE' 
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' 
                            : bom.status === 'DRAFT'
                            ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                            : 'bg-white/[0.06] text-slate-400 border-white/[0.08]'
                        }`}>
                          {bom.status}
                        </span>
                      </div>
                      <h4 className={`text-sm font-semibold mt-0.5 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                        {bom.parentPartCode} — {bom.parentPartName}
                      </h4>
                    </div>
                  </div>

                  <div className="flex items-center gap-6">
                    <div className="text-right font-mono">
                      <div className={`text-[11px] ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                        Standard Batch: <span className={`font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{bom.batchSize} Units</span>
                      </div>
                      <div className="text-[11px] text-emerald-600 dark:text-emerald-400">Yield Factor: <span className="font-bold">{bom.yieldPercentage}%</span></div>
                    </div>

                    {/* BOM Action Buttons */}
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => handleOpenEditBom(bom)}
                        title="Edit BOM Formula & Components"
                        className={`p-2 rounded-xl border text-xs font-mono font-bold cursor-pointer transition-ui hover:scale-105 active:scale-[0.96] ${
                          isDarkMode ? 'border-white/[0.08] bg-white/[0.04] text-slate-300 hover:text-white' : 'border-slate-200 bg-slate-50 text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        <Edit className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => setDuplicatingBom(bom)}
                        title="Duplicate BOM Formula"
                        className={`p-2 rounded-xl border text-xs font-mono font-bold cursor-pointer transition-ui hover:scale-105 active:scale-[0.96] ${
                          isDarkMode ? 'border-white/[0.08] bg-white/[0.04] text-slate-300 hover:text-white' : 'border-slate-200 bg-slate-50 text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => setRevisionBom(bom)}
                        title="Create New Revision (e.g. REV-B)"
                        className="p-2 rounded-xl border border-indigo-500/30 bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20 text-xs font-mono font-bold cursor-pointer transition-ui hover:scale-105 active:scale-[0.96]"
                      >
                        <FolderPlus className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleToggleBOMStatus(bom, bom.status === 'ACTIVE' ? 'DRAFT' : 'ACTIVE')}
                        title={bom.status === 'ACTIVE' ? 'Set as Draft' : 'Set as Active'}
                        className={`p-2 rounded-xl border text-xs font-mono font-bold cursor-pointer transition-ui hover:scale-105 active:scale-[0.96] ${
                          bom.status === 'ACTIVE'
                            ? 'border-amber-500/30 bg-amber-500/10 text-amber-400 hover:bg-amber-500/20'
                            : 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20'
                        }`}
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => {
                          setDeleteConfirmBom(bom);
                          deleteBomModal.open({ bomCode: bom.bomCode });
                        }}
                        title="Delete BOM"
                        className="p-2 rounded-xl border border-rose-500/30 bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 text-xs font-mono font-bold cursor-pointer transition-ui hover:scale-105 active:scale-[0.96]"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => setExpandedBomCode(isExpanded ? null : bom.bomCode)}
                        className={`p-2 rounded-xl border text-slate-400 hover:text-white cursor-pointer transition-ui hover:scale-105 active:scale-[0.96] ${
                          isDarkMode ? 'border-white/[0.08] bg-white/[0.04]' : 'border-slate-200 bg-slate-50'
                        }`}
                      >
                        {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Collapsible Component Tree */}
                {isExpanded && (
                  <div className={`p-5 border-t ${
                    isDarkMode ? 'border-white/[0.07] bg-black/20' : 'border-slate-200 bg-slate-50/60'
                  }`}>
                    <h5 className={`text-[11px] font-mono uppercase font-bold mb-3 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Components & Scrap Ratios</h5>
                    <div className={`rounded-2xl border overflow-hidden ${
                      isDarkMode ? 'border-white/[0.07]' : 'border-slate-200'
                    }`}>
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs border-collapse font-mono">
                          <thead>
                            <tr className={`border-b font-bold uppercase tracking-wider text-[10px] ${
                              isDarkMode ? 'bg-black/20 border-white/[0.07] text-slate-400' : 'bg-slate-100/80 border-slate-200 text-slate-500'
                            }`}>
                              <th className="py-3 px-4">Component SKU</th>
                              <th className="py-3 px-4">Component Name</th>
                              <th className="py-3 px-4">Category</th>
                              <th className="py-3 px-4 text-right">Qty / Unit</th>
                              <th className="py-3 px-4 text-right">Scrap %</th>
                              <th className="py-3 px-4">Process Stage</th>
                              <th className="py-3 px-4 text-right">Unit Cost</th>
                            </tr>
                          </thead>
                          <tbody className={`divide-y ${isDarkMode ? 'divide-slate-800/50' : 'divide-slate-200'}`}>
                            {bom.components?.map((comp, idx) => (
                              <tr key={comp.id || idx} className={isDarkMode ? '' : 'bg-white'}>
                                <td className="py-3 px-4 font-bold text-[var(--accent-primary)] dark:text-[var(--accent-text-dark)]">{comp.componentCode}</td>
                                <td className={`py-3 px-4 ${isDarkMode ? 'text-slate-200' : 'text-slate-900'}`}>{comp.componentName}</td>
                                <td className={`py-3 px-4 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>{comp.componentType}</td>
                                <td className="py-3 px-4 text-right font-bold text-emerald-600 dark:text-emerald-400">{comp.qtyPerUnit} {comp.unit}</td>
                                <td className="py-3 px-4 text-right text-rose-600 dark:text-rose-400">+{comp.scrapAllowancePct}%</td>
                                <td className={`py-3 px-4 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>{comp.stage || 'MACHINING'}</td>
                                <td className={`py-3 px-4 text-right ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>₹{comp.unitCost}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ========================================================================================= */}
      {/* SECTION 4: PRODUCT ENGINEERING HUB & DEMAND EXPLOSION MATRIX */}
      {/* ========================================================================================= */}
      {activeSection === 'matrix' && (
        <div className="space-y-6">
          {/* Top Explainer Header */}
          <div className={`p-6 rounded-[22px] border ${
            isDarkMode ? 'border-white/[0.08] bg-[#121215]' : 'border-slate-200 bg-white shadow-[0_12px_36px_rgba(15,23,42,0.06)]'
          }`}>
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-xl bg-[var(--accent-primary)]/15 text-[var(--accent-primary)] dark:text-[var(--accent-text-dark)] border border-[var(--accent-primary)]/30">
                  <GitFork className="w-6 h-6" />
                </div>
                <div>
                  <h3 className={`text-base font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                    Finished Product Matrix: BOM (WHAT) + Route Card (HOW)
                  </h3>
                  <p className={`text-xs font-mono mt-0.5 ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                    Every manufactured product connects a Bill of Materials recipe to an operational Route Card traveler.
                  </p>
                </div>
              </div>

              {/* Product Selector & Batch Exploder */}
              <div className="flex items-center gap-3 font-mono text-xs">
                <div>
                  <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Target Product</label>
                  <select
                    value={matrixSelectedPart}
                    onChange={(e) => setMatrixSelectedPart(e.target.value)}
                    className={`rounded-xl border px-3 py-2 font-bold outline-none cursor-pointer ${
                      isDarkMode ? 'border-white/[0.08] bg-black/20 text-white' : 'border-slate-200 bg-slate-50 text-slate-900'
                    }`}
                  >
                    {masters.filter(m => m.category === 'FINISHED_GOODS' || m.type === 'FG' || !m.category).map(m => (
                      <option key={m.code} value={m.code}>
                        {m.code} — {m.name}
                      </option>
                    ))}
                    {/* If masters empty, fallback to BOM parent parts */}
                    {masters.length === 0 && boms.map(b => (
                      <option key={b.parentPartCode} value={b.parentPartCode}>
                        {b.parentPartCode} — {b.parentPartName}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Planned Batch Qty</label>
                  <input
                    type="number"
                    value={matrixBatchQty}
                    onChange={(e) => setMatrixBatchQty(Math.max(1, Number(e.target.value)))}
                    className={`w-28 rounded-xl border px-3 py-2 font-bold outline-none ${
                      isDarkMode ? 'border-white/[0.08] bg-black/20 text-white' : 'border-slate-200 bg-slate-50 text-slate-900'
                    }`}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Matrix Linked View: WHAT vs HOW Side-by-Side */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left: Active BOM Formula (WHAT) */}
            <div className={`p-6 rounded-[22px] border ${
              isDarkMode ? 'border-white/[0.08] bg-[#121215]' : 'border-slate-200 bg-white shadow-[0_12px_36px_rgba(15,23,42,0.06)]'
            }`}>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-xl bg-[var(--accent-primary)]/15 text-[var(--accent-primary)] dark:text-[var(--accent-text-dark)] border border-[var(--accent-primary)]/30">
                    <Layers className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm">Active BOM (WHAT)</h4>
                    <span className="text-[10px] font-mono text-slate-400">Raw materials & component formula</span>
                  </div>
                </div>

                {selectedMatrixBOM ? (
                  <span className="px-2.5 py-1 rounded-xl text-[10px] font-mono font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                    {selectedMatrixBOM.bomCode} ({selectedMatrixBOM.revision})
                  </span>
                ) : (
                  <span className="px-2.5 py-1 rounded-xl text-[10px] font-mono font-bold bg-rose-500/10 text-rose-400 border border-rose-500/30">
                    No BOM Linked
                  </span>
                )}
              </div>

              {selectedMatrixBOM ? (
                <div className="space-y-3 font-mono text-xs">
                  <div className={`p-3 rounded-xl border ${
                    isDarkMode ? 'border-white/[0.08] bg-black/20' : 'bg-slate-50 border-slate-200'
                  }`}>
                    <div className="flex justify-between mb-1">
                      <span className="text-slate-400">Parent Finished Good:</span>
                      <span className="font-bold text-[var(--accent-primary)] dark:text-[var(--accent-text-dark)]">{selectedMatrixBOM.parentPartCode}</span>
                    </div>
                    <div className="flex justify-between mb-1">
                      <span className="text-slate-400">Standard Yield:</span>
                      <span className="font-bold text-emerald-400">{selectedMatrixBOM.yieldPercentage}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Batch Explosion Qty:</span>
                      <span className={`font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{matrixBatchQty} Units</span>
                    </div>
                  </div>

                  <div className={`rounded-xl border overflow-hidden ${
                    isDarkMode ? 'border-white/[0.08]' : 'border-slate-200'
                  }`}>
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className={`border-b text-[10px] uppercase font-mono font-bold ${
                          isDarkMode ? 'bg-black/20 border-white/[0.08] text-slate-400' : 'bg-slate-100 border-slate-200 text-slate-600'
                        }`}>
                          <th className="py-2.5 px-3">Component</th>
                          <th className="py-2.5 px-3 text-right">Qty/Unit</th>
                          <th className="py-2.5 px-3 text-right">Total Req ({matrixBatchQty})</th>
                          <th className="py-2.5 px-3 text-right">Available</th>
                          <th className="py-2.5 px-3 text-center">Status</th>
                        </tr>
                      </thead>
                      <tbody className={`divide-y ${isDarkMode ? 'divide-slate-800/60' : 'divide-slate-200'}`}>
                        {explodedMaterialReqs.map((comp, idx) => (
                          <tr key={idx} className={comp.isShortage ? (isDarkMode ? 'bg-rose-950/20' : 'bg-rose-50/60') : ''}>
                            <td className={`py-2.5 px-3 font-bold ${isDarkMode ? 'text-slate-200' : 'text-slate-900'}`}>
                              <div>{comp.componentCode}</div>
                              <div className={`text-[10px] font-normal ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>{comp.componentName}</div>
                            </td>
                            <td className={`py-2.5 px-3 text-right ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>{comp.qtyPerUnit} {comp.unit}</td>
                            <td className={`py-2.5 px-3 text-right font-bold ${isDarkMode ? 'text-emerald-400' : 'text-emerald-600'}`}>{comp.totalRawNeeded} {comp.unit}</td>
                            <td className={`py-2.5 px-3 text-right font-mono font-medium ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>{comp.onHand} {comp.unit}</td>
                            <td className="py-2.5 px-3 text-center">
                              {comp.isShortage ? (
                                <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-rose-500/20 text-rose-500 dark:text-rose-400 border border-rose-500/30">
                                  Short -{comp.deficit}
                                </span>
                              ) : (
                                <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                                  Covered
                                </span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <div className="p-8 text-center text-slate-400 font-mono text-xs">
                  Please configure a BOM for SKU {matrixSelectedPart} to view raw material requirements.
                </div>
              )}
            </div>

            {/* Right: Active Route Card (HOW) */}
            <div className={`p-6 rounded-[22px] border ${
              isDarkMode ? 'border-white/[0.08] bg-[#121215]' : 'border-slate-200 bg-white shadow-[0_12px_36px_rgba(15,23,42,0.06)]'
            }`}>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-xl bg-emerald-500/15 text-emerald-500 dark:text-emerald-400 border border-emerald-500/30">
                    <Route className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm">Active Route Card (HOW)</h4>
                    <span className="text-[10px] font-mono text-slate-400">Sequence, Work Centers & Standard Times</span>
                  </div>
                </div>

                {selectedMatrixRoute ? (
                  <span className="px-2.5 py-1 rounded-xl text-[10px] font-mono font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                    {selectedMatrixRoute.operations?.length} Steps ({selectedMatrixRoute.revision || 'REV-A'})
                  </span>
                ) : (
                  <span className="px-2.5 py-1 rounded-xl text-[10px] font-mono font-bold bg-rose-500/10 text-rose-500 dark:text-rose-400 border border-rose-500/30">
                    No Route Card Linked
                  </span>
                )}
              </div>

              {selectedMatrixRoute ? (
                <div className="space-y-3 font-mono text-xs">
                  <div className={`p-3 rounded-xl border ${
                    isDarkMode ? 'border-white/[0.08] bg-black/20' : 'bg-slate-50 border-slate-200'
                  }`}>
                    <div className="flex justify-between mb-1">
                      <span className={isDarkMode ? 'text-slate-400' : 'text-slate-500'}>Total Route Stages:</span>
                      <span className="font-bold text-emerald-500 dark:text-emerald-400">{selectedMatrixRoute.operations?.length} Operations</span>
                    </div>
                    <div className="flex justify-between mb-1">
                      <span className={isDarkMode ? 'text-slate-400' : 'text-slate-500'}>Unit Cycle Time:</span>
                      <span className="font-bold text-amber-500">{selectedMatrixRoute.totalStandardTimeMinutes || 45} mins/unit</span>
                    </div>
                    <div className="flex justify-between">
                      <span className={isDarkMode ? 'text-slate-400' : 'text-slate-500'}>Total Machine Hours for {matrixBatchQty} Units:</span>
                      <span className="font-bold text-purple-600 dark:text-purple-400">
                        {((selectedMatrixRoute.totalStandardTimeMinutes || 45) * matrixBatchQty / 60).toFixed(1)} Hours
                      </span>
                    </div>
                  </div>

                  <div className={`rounded-xl border overflow-hidden ${
                    isDarkMode ? 'border-white/[0.08]' : 'border-slate-200'
                  }`}>
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className={`border-b text-[10px] uppercase font-mono font-bold ${
                          isDarkMode ? 'bg-black/20 border-white/[0.08] text-slate-400' : 'bg-slate-100 border-slate-200 text-slate-600'
                        }`}>
                          <th className="py-2.5 px-3 text-center">Seq</th>
                          <th className="py-2.5 px-3">Operation</th>
                          <th className="py-2.5 px-3">Work Center</th>
                          <th className="py-2.5 px-3 text-right">Unit Time</th>
                          <th className="py-2.5 px-3 text-right">Total Load</th>
                        </tr>
                      </thead>
                      <tbody className={`divide-y ${isDarkMode ? 'divide-slate-800/60' : 'divide-slate-200'}`}>
                        {explodedCapacityReqs.map((op, idx) => (
                          <tr key={idx} className={isDarkMode ? 'hover:bg-white/[0.02]' : 'bg-white hover:bg-slate-50'}>
                            <td className="py-2.5 px-3 text-center font-bold text-emerald-500 dark:text-emerald-400">{op.sequenceNo}</td>
                            <td className={`py-2.5 px-3 font-semibold ${isDarkMode ? 'text-slate-200' : 'text-slate-900'}`}>{op.operationName}</td>
                            <td className="py-2.5 px-3 text-purple-600 dark:text-purple-400 font-medium">{op.workCenter}</td>
                            <td className={`py-2.5 px-3 text-right ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>{op.standardTimeMinutes}m</td>
                            <td className="py-2.5 px-3 text-right font-bold text-amber-500">{op.totalHours} hrs</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <div className="p-8 text-center text-slate-400 font-mono text-xs">
                  Please configure a Route Card for SKU {matrixSelectedPart} to view operational capacity requirements.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================================= */}
      {/* MODAL 1: CREATE / EDIT ROUTE CARD */}
      {/* ========================================================================================= */}
      <Modal
        isOpen={createRouteModal.isOpen}
        onClose={() => createRouteModal.close()}
        maxWidth="3xl"
        isDarkMode={isDarkMode}
        icon={<Route className="w-5 h-5" />}
        title={editingRoute ? `Edit Route Card — ${editingRoute.partCode}` : 'Configure Operational Route Card'}
        subtitle="Sequence manufacturing steps, machine bays, cycle times & QC gates"
      >
        <form onSubmit={handleSaveRouteSubmit} className="space-y-4 text-xs font-sans">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className={`block text-[11px] font-bold uppercase tracking-wider ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                  Part Code *
                </label>
                <button
                  type="button"
                  onClick={() => {
                    createRouteModal.close();
                    navigate('/masters/items');
                    if (onNavigate) onNavigate('masters');
                  }}
                  className="text-[10px] font-mono font-medium text-emerald-500 dark:text-emerald-400 hover:underline flex items-center gap-1 cursor-pointer transition-ui"
                  title="Manage Items in Items Master"
                >
                  <span>Manage Items Master</span>
                  <ExternalLink className="w-3 h-3" />
                </button>
              </div>

              {routeFgMasters.length > 0 ? (
                <select
                  name="partCode"
                  required
                  value={routeFormPartCode}
                  onChange={(e) => {
                    const newCode = e.target.value;
                    setRouteFormPartCode(newCode);
                    const matched = masters.find(m => m.code === newCode);
                    if (matched) {
                      setRouteFormPartDescription(matched.description || matched.name || '');
                    }
                  }}
                  className={`h-11 w-full rounded-xl border px-3 text-xs font-mono outline-none transition-ui cursor-pointer ${
                    isDarkMode ? 'bg-[#09090B] border-slate-700/80 text-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20' : 'bg-slate-50 border-slate-300 text-slate-900 focus:border-emerald-500 shadow-xs'
                  }`}
                >
                  {/* When editing an existing route card whose partCode is not in routeFgMasters, keep it as an option */}
                  {editingRoute?.partCode && !routeFgMasters.some(m => m.code === editingRoute.partCode) && (
                    <option value={editingRoute.partCode}>
                      {editingRoute.partCode} — {editingRoute.partDescription || 'Existing Part (Unlisted FG)'}
                    </option>
                  )}
                  {routeFgMasters.map(m => (
                    <option key={m.code} value={m.code}>
                      {m.code} — {m.name || m.description}
                    </option>
                  ))}
                </select>
              ) : (
                <>
                  <input
                    name="partCode"
                    required
                    value={routeFormPartCode}
                    onChange={(e) => setRouteFormPartCode(e.target.value)}
                    placeholder="e.g. FG-0001"
                    className={`h-11 w-full rounded-xl border px-3 text-xs font-mono outline-none transition-ui ${
                      isDarkMode ? 'bg-[#09090B] border-slate-700/80 text-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20' : 'bg-slate-50 border-slate-300 text-slate-900 focus:border-emerald-500 shadow-xs'
                    }`}
                  />
                  <p className="text-[10px] text-amber-500 dark:text-amber-400 mt-1 font-mono">
                    No finished-goods items found in Items Master — showing manual entry
                  </p>
                </>
              )}
            </div>

            <div className="md:col-span-2">
              <label className={`block text-[11px] font-bold uppercase tracking-wider mb-1.5 ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                Part Description *
              </label>
              <input
                name="partDescription"
                required
                value={routeFormPartDescription}
                onChange={(e) => setRouteFormPartDescription(e.target.value)}
                placeholder="e.g. Precision Shaft"
                className={`h-11 w-full rounded-xl border px-3 text-xs outline-none transition-ui ${
                  isDarkMode ? 'bg-[#09090B] border-slate-700/80 text-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20' : 'bg-slate-50 border-slate-300 text-slate-900 focus:border-emerald-500 shadow-xs'
                }`}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={`block text-[11px] font-bold uppercase tracking-wider mb-1.5 ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                Revision
              </label>
              <input
                name="revision"
                defaultValue={editingRoute?.revision || 'REV-A'}
                className={`h-11 w-full rounded-xl border px-3 text-xs font-mono outline-none transition-ui ${
                  isDarkMode ? 'bg-[#09090B] border-slate-700/80 text-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20' : 'bg-slate-50 border-slate-300 text-slate-900 focus:border-emerald-500 shadow-xs'
                }`}
              />
            </div>
            <div>
              <label className={`block text-[11px] font-bold uppercase tracking-wider mb-1.5 ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                Route Status
              </label>
              <select
                name="status"
                defaultValue={editingRoute?.status || 'ACTIVE'}
                className={`h-11 w-full rounded-xl border px-3 text-xs font-mono outline-none transition-ui cursor-pointer ${
                  isDarkMode ? 'bg-[#09090B] border-slate-700/80 text-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20' : 'bg-slate-50 border-slate-300 text-slate-900 focus:border-emerald-500 shadow-xs'
                }`}
              >
                <option value="ACTIVE">ACTIVE</option>
                <option value="DRAFT">DRAFT</option>
                <option value="OBSOLETE">OBSOLETE</option>
              </select>
            </div>
          </div>

          {/* Sequenced Operations Builder */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span className="text-[11px] font-bold uppercase text-emerald-500 dark:text-emerald-400 font-mono">
                  Operation Steps & Sequence Builder ({routeFormSteps.length} Stages)
                </span>
                <button
                  type="button"
                  onClick={() => {
                    createRouteModal.close();
                    navigate('/masters/machines');
                    if (onNavigate) onNavigate('masters');
                  }}
                  className="text-[10px] font-mono font-medium text-emerald-500 dark:text-emerald-400 hover:underline flex items-center gap-1 cursor-pointer transition-ui"
                  title="Manage Machines in Machine Master"
                >
                  <span>Manage Machine Master</span>
                  <ExternalLink className="w-3 h-3" />
                </button>
              </div>

              <button
                type="button"
                onClick={handleAddRouteStepRow}
                className="px-3 py-1.5 rounded-xl bg-emerald-600/20 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-600/30 border border-emerald-500/30 text-[10px] font-mono font-bold flex items-center gap-1 cursor-pointer transition-ui hover:scale-[1.02]"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Operation Step</span>
              </button>
            </div>

            {availableMachines.length === 0 && (
              <div className="p-2.5 rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400 text-xs flex items-center justify-between">
                <span className="flex items-center gap-1.5 font-mono text-[11px]">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                  Machine Master is empty. Register machines at Machine Master.
                </span>
                <button
                  type="button"
                  onClick={() => {
                    createRouteModal.close();
                    navigate('/masters/machines');
                    if (onNavigate) onNavigate('masters');
                  }}
                  className="font-bold underline hover:text-amber-300 font-mono text-[11px] flex items-center gap-1 cursor-pointer"
                >
                  <span>Go to Machine Master</span>
                </button>
              </div>
            )}

            <div className="space-y-2.5 max-h-[320px] overflow-y-auto pr-1">
              {routeFormSteps.map((step, idx) => (
                <div
                  key={idx}
                  className={`p-3 rounded-2xl border flex flex-wrap items-center gap-3 ${
                    isDarkMode ? 'bg-[#09090B] border-slate-800' : 'bg-slate-50 border-slate-200'
                  }`}
                >
                  {/* Sequence and Reorder buttons */}
                  <div className="flex items-center gap-1">
                    <span className="w-8 h-8 rounded-xl bg-emerald-500/15 text-emerald-500 dark:text-emerald-400 font-mono font-bold flex items-center justify-center text-xs">
                      {step.sequenceNo}
                    </span>
                    <div className="flex flex-col gap-0.5">
                      <button
                        type="button"
                        onClick={() => handleMoveRouteStep(idx, 'up')}
                        disabled={idx === 0}
                        className={`p-1 rounded cursor-pointer disabled:opacity-30 ${isDarkMode ? 'bg-slate-800 text-slate-300 hover:bg-slate-700' : 'bg-slate-200 text-slate-700 hover:bg-slate-300'}`}
                      >
                        <ArrowUp className="w-2.5 h-2.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleMoveRouteStep(idx, 'down')}
                        disabled={idx === routeFormSteps.length - 1}
                        className={`p-1 rounded cursor-pointer disabled:opacity-30 ${isDarkMode ? 'bg-slate-800 text-slate-300 hover:bg-slate-700' : 'bg-slate-200 text-slate-700 hover:bg-slate-300'}`}
                      >
                        <ArrowDown className="w-2.5 h-2.5" />
                      </button>
                    </div>
                  </div>

                  {/* Operation Name */}
                  <div className="flex-1 min-w-[160px]">
                    <input
                      value={step.operationName}
                      onChange={(e) => handleRouteStepChange(idx, 'operationName', e.target.value)}
                      placeholder="Operation Name (e.g. CNC Turning)"
                      required
                      className={`w-full rounded-xl border p-2 text-xs outline-none focus:border-emerald-500 ${
                        isDarkMode ? 'border-slate-700/80 bg-slate-900 text-white' : 'border-slate-300 bg-white text-slate-900 shadow-2xs'
                      }`}
                    />
                  </div>

                  {/* Work Center / Machine from Machine Master */}
                  <div className="w-48 sm:w-56">
                    <select
                      value={step.workCenter}
                      onChange={(e) => {
                        const val = e.target.value;
                        handleRouteStepChange(idx, 'workCenter', val);
                        const match = availableMachines.find(m => (m.name || m.code) === val || m.code === val);
                        if (match && (!step.operationName || step.operationName === 'Precision Machining')) {
                          handleRouteStepChange(idx, 'operationName', match.type || match.name);
                        }
                      }}
                      className={`w-full rounded-xl border p-2 text-xs font-mono outline-none focus:border-emerald-500 cursor-pointer ${
                        isDarkMode ? 'border-slate-700/80 bg-slate-900 text-white' : 'border-slate-300 bg-white text-slate-900 shadow-2xs'
                      }`}
                    >
                      {availableMachines.length === 0 ? (
                        <option value="">-- No machines in Machine Master --</option>
                      ) : (
                        <>
                          <option value="">-- Select Machine from Master --</option>
                          {availableMachines.map((m) => (
                            <option key={m.code} value={m.name || m.code}>
                              {m.code} — {m.name} ({m.type || m.department || 'Machine Shop'})
                            </option>
                          ))}
                        </>
                      )}
                    </select>
                    {availableMachines.length === 0 && (
                      <button
                        type="button"
                        onClick={() => {
                          createRouteModal.close();
                          navigate('/masters/machines');
                          if (onNavigate) onNavigate('masters');
                        }}
                        className="text-[9px] font-mono text-emerald-500 dark:text-emerald-400 hover:underline flex items-center gap-0.5 mt-1 cursor-pointer"
                        title="Add machines in Machine Master"
                      >
                        <span>+ Add in Machine Master</span>
                        <ExternalLink className="w-2.5 h-2.5" />
                      </button>
                    )}
                  </div>

                  {/* Standard Time Mins */}
                  <div className="w-24">
                    <input
                      type="number"
                      value={step.standardTimeMinutes}
                      onChange={(e) => handleRouteStepChange(idx, 'standardTimeMinutes', Number(e.target.value))}
                      placeholder="Std Mins"
                      required
                      className={`w-full rounded-xl border p-2 text-xs font-mono outline-none focus:border-emerald-500 text-right font-bold ${
                        isDarkMode ? 'border-slate-700/80 bg-slate-900 text-white' : 'border-slate-300 bg-white text-slate-900 shadow-2xs'
                      }`}
                    />
                  </div>

                  {/* Inspection Required Checkbox */}
                  <label className={`flex items-center gap-1.5 cursor-pointer text-[10px] font-mono font-bold ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                    <input
                      type="checkbox"
                      checked={step.inspectionRequired}
                      onChange={(e) => handleRouteStepChange(idx, 'inspectionRequired', e.target.checked)}
                      className="accent-emerald-500"
                    />
                    <span>QC Gate</span>
                  </label>

                  {/* Certification */}
                  <div className="w-32">
                    <input
                      value={step.requiredCertification}
                      onChange={(e) => handleRouteStepChange(idx, 'requiredCertification', e.target.value)}
                      placeholder="Cert/Skill"
                      className={`w-full rounded-xl border p-2 text-xs outline-none focus:border-emerald-500 ${
                        isDarkMode ? 'border-slate-700/80 bg-slate-900 text-white' : 'border-slate-300 bg-white text-slate-900 shadow-2xs'
                      }`}
                    />
                  </div>

                  {/* Remove Row Button */}
                  <button
                    type="button"
                    onClick={() => handleRemoveRouteStepRow(idx)}
                    className="p-2 rounded-xl text-rose-500 dark:text-rose-400 hover:bg-rose-500/20 cursor-pointer transition-ui"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div>
            <label className={`block text-[11px] font-bold uppercase tracking-wider mb-1.5 ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
              Engineering Notes
            </label>
            <input
              name="notes"
              defaultValue={editingRoute?.notes || 'Standard manufacturing process traveler'}
              className={`h-11 w-full rounded-xl border px-3 text-xs outline-none transition-ui ${
                isDarkMode ? 'bg-[#09090B] border-slate-700/80 text-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20' : 'bg-slate-50 border-slate-300 text-slate-900 focus:border-emerald-500 shadow-xs'
              }`}
            />
          </div>

          <div className={`pt-4 border-t flex justify-end gap-3 font-sans ${isDarkMode ? 'border-slate-800' : 'border-slate-200'}`}>
            <button
              type="button"
              onClick={() => createRouteModal.close()}
              className={`px-4 py-2 rounded-xl border text-xs font-bold cursor-pointer transition-ui ${
                isDarkMode ? 'border-slate-700 text-slate-300 hover:bg-slate-800' : 'border-slate-300 text-slate-700 hover:bg-slate-100'
              }`}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs cursor-pointer transition-ui shadow-md shadow-emerald-500/20 hover:scale-[1.01]"
            >
              Save Route Card
            </button>
          </div>
        </form>
      </Modal>

      {/* ========================================================================================= */}
      {/* MODAL 2: CREATE / EDIT BILL OF MATERIALS (BOM) */}
      {/* ========================================================================================= */}
      <Modal
        isOpen={createBomModal.isOpen}
        onClose={handleCloseCreateBom}
        maxWidth="3xl"
        isDarkMode={isDarkMode}
        icon={<Layers className="w-5 h-5" />}
        title={editingBom ? `Edit BOM Formula — ${editingBom.bomCode}` : 'Configure Bill of Materials (BOM)'}
        subtitle="Define raw material formulas, scrap allowances & component costs"
      >
        <form onSubmit={handleSaveBOMSubmit} className="space-y-4 text-xs font-sans">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className={`block text-[11px] font-bold uppercase tracking-wider mb-1.5 ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                BOM Code *
              </label>
              <input
                name="bomCode"
                required
                defaultValue={editingBom?.bomCode || `BOM-00000001-A`}
                placeholder="e.g. BOM-00000001-A"
                className={`h-11 w-full rounded-xl border px-3 text-xs font-mono outline-none transition-ui ${
                  isDarkMode ? 'bg-[#09090B] border-slate-700/80 text-white focus:border-[var(--accent-primary)] focus:ring-2 focus:ring-[var(--accent-ring)]' : 'bg-slate-50 border-slate-300 text-slate-900 focus:border-[var(--accent-primary)] shadow-xs'
                }`}
              />
            </div>
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className={`block text-[11px] font-bold uppercase tracking-wider ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                  Parent Part Code *
                </label>
                <button
                  type="button"
                  onClick={() => {
                    handleCloseCreateBom();
                    navigate('/masters/items');
                    if (onNavigate) onNavigate('masters');
                  }}
                  className="text-[10px] font-mono font-medium text-emerald-500 dark:text-emerald-400 hover:underline flex items-center gap-1 cursor-pointer transition-ui"
                  title="Manage Items in Items Master"
                >
                  <span>Manage Items Master</span>
                  <ExternalLink className="w-3 h-3" />
                </button>
              </div>

              {fgMasters.length > 0 ? (
                <select
                  name="parentCode"
                  required
                  value={bomFormParentCode}
                  onChange={(e) => {
                    const newCode = e.target.value;
                    setBomFormParentCode(newCode);
                    const matched = masters.find(m => m.code === newCode);
                    if (matched) {
                      setBomFormParentName(matched.name || matched.description || '');
                    }
                  }}
                  className={`h-11 w-full rounded-xl border px-3 text-xs font-mono outline-none transition-ui cursor-pointer ${
                    isDarkMode ? 'bg-[#09090B] border-slate-700/80 text-white focus:border-[var(--accent-primary)] focus:ring-2 focus:ring-[var(--accent-ring)]' : 'bg-slate-50 border-slate-300 text-slate-900 focus:border-[var(--accent-primary)] shadow-xs'
                  }`}
                >
                  {/* When editing an existing BOM whose parentPartCode is not in fgMasters, keep it as an option */}
                  {editingBom?.parentPartCode && !fgMasters.some(m => m.code === editingBom.parentPartCode) && (
                    <option value={editingBom.parentPartCode}>
                      {editingBom.parentPartCode} — {editingBom.parentPartName || 'Existing Part (Unlisted FG)'}
                    </option>
                  )}
                  {fgMasters.map(m => (
                    <option key={m.code} value={m.code}>
                      {m.code} — {m.name || m.description}
                    </option>
                  ))}
                </select>
              ) : (
                <>
                  <input
                    name="parentCode"
                    required
                    value={bomFormParentCode}
                    onChange={(e) => setBomFormParentCode(e.target.value)}
                    placeholder="e.g. FG-0001"
                    className={`h-11 w-full rounded-xl border px-3 text-xs font-mono outline-none transition-ui ${
                      isDarkMode ? 'bg-[#09090B] border-slate-700/80 text-white focus:border-[var(--accent-primary)] focus:ring-2 focus:ring-[var(--accent-ring)]' : 'bg-slate-50 border-slate-300 text-slate-900 focus:border-[var(--accent-primary)] shadow-xs'
                    }`}
                  />
                  <p className="text-[10px] text-amber-500 dark:text-amber-400 mt-1 font-mono">
                    No finished-goods items found in Items Master — showing manual entry
                  </p>
                </>
              )}
            </div>
            <div>
              <label className={`block text-[11px] font-bold uppercase tracking-wider mb-1.5 ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                Parent Part Name *
              </label>
              <input
                name="parentName"
                required
                value={bomFormParentName}
                onChange={(e) => setBomFormParentName(e.target.value)}
                placeholder="e.g. Precision Shaft"
                className={`h-11 w-full rounded-xl border px-3 text-xs outline-none transition-ui ${
                  isDarkMode ? 'bg-[#09090B] border-slate-700/80 text-white focus:border-[var(--accent-primary)] focus:ring-2 focus:ring-[var(--accent-ring)]' : 'bg-slate-50 border-slate-300 text-slate-900 focus:border-[var(--accent-primary)] shadow-xs'
                }`}
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className={`block text-[11px] font-bold uppercase tracking-wider mb-1.5 ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                Revision
              </label>
              <input
                name="revision"
                defaultValue={editingBom?.revision || 'v1.0'}
                className={`h-11 w-full rounded-xl border px-3 text-xs font-mono outline-none transition-ui ${
                  isDarkMode ? 'bg-[#09090B] border-slate-700/80 text-white focus:border-[var(--accent-primary)] focus:ring-2 focus:ring-[var(--accent-ring)]' : 'bg-slate-50 border-slate-300 text-slate-900 focus:border-[var(--accent-primary)] shadow-xs'
                }`}
              />
            </div>
            <div>
              <label className={`block text-[11px] font-bold uppercase tracking-wider mb-1.5 ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                Batch Size
              </label>
              <input
                name="batchSize"
                type="number"
                defaultValue={editingBom?.batchSize || 100}
                className={`h-11 w-full rounded-xl border px-3 text-xs font-mono font-bold outline-none transition-ui ${
                  isDarkMode ? 'bg-[#09090B] border-slate-700/80 text-white focus:border-[var(--accent-primary)] focus:ring-2 focus:ring-[var(--accent-ring)]' : 'bg-slate-50 border-slate-300 text-slate-900 focus:border-[var(--accent-primary)] shadow-xs'
                }`}
              />
            </div>
            <div>
              <label className={`block text-[11px] font-bold uppercase tracking-wider mb-1.5 ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                Expected Yield (%)
              </label>
              <input
                name="yield"
                type="number"
                step="0.1"
                defaultValue={editingBom?.yieldPercentage || 98.5}
                className={`h-11 w-full rounded-xl border px-3 text-xs font-mono font-bold outline-none transition-ui ${
                  isDarkMode ? 'bg-[#09090B] border-slate-700/80 text-white focus:border-[var(--accent-primary)] focus:ring-2 focus:ring-[var(--accent-ring)]' : 'bg-slate-50 border-slate-300 text-slate-900 focus:border-[var(--accent-primary)] shadow-xs'
                }`}
              />
            </div>
          </div>

          {/* Dynamic Components Multi-Row Table */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5 flex-wrap">
                <div className="text-[11px] font-bold uppercase text-[var(--accent-text-light)] dark:text-[var(--accent-text-dark)] font-mono">
                  Raw Materials & Components ({bomFormComponents.length} Items)
                </div>
                {unmatchedComponentCount > 0 && (
                  <span
                    className="px-2 py-0.5 rounded-lg text-[10px] font-mono font-bold bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 flex items-center gap-1.5"
                    title={`${unmatchedComponentCount} component(s) have SKU codes that do not exist in the Items Master`}
                  >
                    <AlertTriangle className="w-3 h-3 shrink-0 text-amber-500" />
                    <span>
                      {unmatchedComponentCount} of {bomFormComponents.length} component{unmatchedComponentCount === 1 ? '' : 's'} {unmatchedComponentCount === 1 ? 'has' : 'have'} an unmatched SKU
                    </span>
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={handleAddBomComponentRow}
                className="px-3 py-1.5 rounded-xl bg-[var(--accent-primary)]/20 text-[var(--accent-text-light)] dark:text-[var(--accent-text-dark)] hover:bg-[var(--accent-primary)]/30 border border-[var(--accent-primary)]/30 text-[10px] font-mono font-bold flex items-center gap-1 cursor-pointer transition-ui hover:scale-[1.02]"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Component</span>
              </button>
            </div>

            <div className="space-y-2.5 max-h-[300px] overflow-y-auto pr-1">
              {bomFormComponents.map((comp, idx) => {
                const isMatched = (masters || []).some(m => (m.code || '').trim().toLowerCase() === (comp.componentCode || '').trim().toLowerCase());
                const isUnmatched = Boolean(comp.componentCode && comp.componentCode.trim().length > 0 && !isMatched);

                return (
                <div
                  key={idx}
                  className={`p-3 rounded-2xl border flex flex-wrap items-center gap-2.5 transition-ui ${
                    isUnmatched
                      ? isDarkMode
                        ? 'bg-amber-950/20 border-amber-500/50 shadow-xs'
                        : 'bg-amber-50/70 border-amber-300 shadow-xs'
                      : isDarkMode
                        ? 'bg-[#09090B] border-slate-800'
                        : 'bg-slate-50 border-slate-200'
                  }`}
                >
                  <div className="w-40 sm:w-48">
                    {bomComponentMasters.totalCount > 0 ? (
                      <select
                        id={`bom-comp-code-${idx}`}
                        value={comp.componentCode}
                        onChange={(e) => handleBomComponentChange(idx, 'componentCode', e.target.value)}
                        required
                        className={`w-full rounded-xl border p-2 text-xs font-mono outline-none cursor-pointer focus:border-[var(--accent-primary)] transition-ui ${
                          isUnmatched
                            ? 'border-amber-500/80 bg-amber-500/10 text-amber-700 dark:text-amber-300 font-bold'
                            : isDarkMode
                              ? 'border-slate-700/80 bg-slate-900 text-white'
                              : 'border-slate-300 bg-white text-slate-900 shadow-2xs'
                        }`}
                      >
                        <option value="" disabled>Select Component...</option>
                        {/* Preserve existing/custom code if not in any optgroup */}
                        {comp.componentCode && !isMatched && (
                          <option value={comp.componentCode}>
                            ⚠ {comp.componentCode} — {comp.componentName || 'Unlisted SKU'}
                          </option>
                        )}
                        {bomComponentMasters.rm.length > 0 && (
                          <optgroup label="Raw Material">
                            {bomComponentMasters.rm.map(m => (
                              <option key={m.code} value={m.code}>
                                {m.code} — {m.name || m.description}
                              </option>
                            ))}
                          </optgroup>
                        )}
                        {bomComponentMasters.sf.length > 0 && (
                          <optgroup label="Semi-Finished">
                            {bomComponentMasters.sf.map(m => (
                              <option key={m.code} value={m.code}>
                                {m.code} — {m.name || m.description}
                              </option>
                            ))}
                          </optgroup>
                        )}
                        {bomComponentMasters.bo.length > 0 && (
                          <optgroup label="Bought-Out">
                            {bomComponentMasters.bo.map(m => (
                              <option key={m.code} value={m.code}>
                                {m.code} — {m.name || m.description}
                              </option>
                            ))}
                          </optgroup>
                        )}
                        {bomComponentMasters.co.length > 0 && (
                          <optgroup label="Consumable">
                            {bomComponentMasters.co.map(m => (
                              <option key={m.code} value={m.code}>
                                {m.code} — {m.name || m.description}
                              </option>
                            ))}
                          </optgroup>
                        )}
                        {bomComponentMasters.other.length > 0 && (
                          <optgroup label="Other Components">
                            {bomComponentMasters.other.map(m => (
                              <option key={m.code} value={m.code}>
                                {m.code} — {m.name || m.description}
                              </option>
                            ))}
                          </optgroup>
                        )}
                      </select>
                    ) : (
                      <>
                        <input
                          id={`bom-comp-code-${idx}`}
                          value={comp.componentCode}
                          onChange={(e) => handleBomComponentChange(idx, 'componentCode', e.target.value)}
                          placeholder="SKU (e.g. RAW-EN8)"
                          required
                          className={`w-full rounded-xl border p-2 text-xs font-mono outline-none focus:border-[var(--accent-primary)] transition-ui ${
                            isUnmatched
                              ? 'border-amber-500/80 bg-amber-500/10 text-amber-700 dark:text-amber-300 font-bold'
                              : isDarkMode
                                ? 'border-slate-700/80 bg-slate-900 text-white'
                                : 'border-slate-300 bg-white text-slate-900 shadow-2xs'
                          }`}
                        />
                        <p className="text-[10px] text-amber-500 dark:text-amber-400 mt-1 font-mono">
                          No component items found in Items Master — showing manual entry
                        </p>
                      </>
                    )}

                    {isUnmatched && (
                      <div className="flex items-center justify-between gap-1.5 mt-1">
                        <span
                          title={`SKU "${comp.componentCode}" not found in Items Master — this component will always show as out of stock`}
                          className="px-1.5 py-0.5 rounded-md bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 flex items-center gap-1 text-[10px] font-mono font-bold cursor-help truncate"
                        >
                          <AlertTriangle className="w-3 h-3 shrink-0 text-amber-500" />
                          <span className="truncate">Unmatched SKU</span>
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            const el = document.getElementById(`bom-comp-code-${idx}`) as HTMLSelectElement | HTMLInputElement | null;
                            if (el) {
                              el.focus();
                              if ('showPicker' in el && typeof (el as any).showPicker === 'function') {
                                try { (el as any).showPicker(); } catch (_) {}
                              }
                            }
                          }}
                          className="px-2 py-0.5 rounded-md bg-[var(--accent-primary)]/20 text-[var(--accent-text-light)] dark:text-[var(--accent-text-dark)] hover:bg-[var(--accent-primary)]/30 border border-[var(--accent-primary)]/40 text-[10px] font-mono font-bold transition-ui cursor-pointer shrink-0 hover:scale-105 active:scale-95"
                          title="Reassign to a valid SKU from Items Master"
                        >
                          Fix SKU
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="flex-1 min-w-[140px]">
                    <input
                      value={comp.componentName}
                      onChange={(e) => handleBomComponentChange(idx, 'componentName', e.target.value)}
                      placeholder="Component Name"
                      required
                      className={`w-full rounded-xl border p-2 text-xs outline-none focus:border-[var(--accent-primary)] ${
                        isDarkMode ? 'border-slate-700/80 bg-slate-900 text-white' : 'border-slate-300 bg-white text-slate-900 shadow-2xs'
                      }`}
                    />
                  </div>

                  <div className="w-20">
                    <input
                      type="number"
                      step="0.01"
                      value={comp.qtyPerUnit}
                      onChange={(e) => handleBomComponentChange(idx, 'qtyPerUnit', Number(e.target.value))}
                      placeholder="Qty/Unit"
                      required
                      className={`w-full rounded-xl border p-2 text-xs font-mono outline-none focus:border-[var(--accent-primary)] text-right font-bold ${
                        isDarkMode ? 'border-slate-700/80 bg-slate-900 text-white' : 'border-slate-300 bg-white text-slate-900 shadow-2xs'
                      }`}
                    />
                  </div>

                  <div className="w-16">
                    <input
                      value={comp.unit}
                      onChange={(e) => handleBomComponentChange(idx, 'unit', e.target.value)}
                      placeholder="UOM"
                      className={`w-full rounded-xl border p-2 text-xs font-mono outline-none focus:border-[var(--accent-primary)] ${
                        isDarkMode ? 'border-slate-700/80 bg-slate-900 text-white' : 'border-slate-300 bg-white text-slate-900 shadow-2xs'
                      }`}
                    />
                  </div>

                  <div className="w-16">
                    <input
                      type="number"
                      step="0.1"
                      value={comp.scrapAllowancePct}
                      onChange={(e) => handleBomComponentChange(idx, 'scrapAllowancePct', Number(e.target.value))}
                      placeholder="Scrap%"
                      className={`w-full rounded-xl border p-2 text-xs font-mono outline-none focus:border-[var(--accent-primary)] text-right ${
                        isDarkMode ? 'border-slate-700/80 bg-slate-900 text-white' : 'border-slate-300 bg-white text-slate-900 shadow-2xs'
                      }`}
                    />
                  </div>

                  <div className="w-20">
                    <input
                      type="number"
                      value={comp.unitCost}
                      onChange={(e) => handleBomComponentChange(idx, 'unitCost', Number(e.target.value))}
                      placeholder="Cost (₹)"
                      className={`w-full rounded-xl border p-2 text-xs font-mono outline-none focus:border-[var(--accent-primary)] text-right ${
                        isDarkMode ? 'border-slate-700/80 bg-slate-900 text-white' : 'border-slate-300 bg-white text-slate-900 shadow-2xs'
                      }`}
                    />
                  </div>

                  <button
                    type="button"
                    onClick={() => handleRemoveBomComponentRow(idx)}
                    className="p-2 rounded-xl text-rose-500 dark:text-rose-400 hover:bg-rose-500/20 cursor-pointer transition-ui"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
                );
              })}
            </div>
          </div>

          <div>
            <label className={`block text-[11px] font-bold uppercase tracking-wider mb-1.5 ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
              Engineering Notes
            </label>
            <input
              name="notes"
              defaultValue={editingBom?.notes || 'Engineering release BOM formula'}
              className={`h-11 w-full rounded-xl border px-3 text-xs outline-none transition-ui ${
                isDarkMode ? 'bg-[#09090B] border-slate-700/80 text-white focus:border-[var(--accent-primary)] focus:ring-2 focus:ring-[var(--accent-ring)]' : 'bg-slate-50 border-slate-300 text-slate-900 focus:border-[var(--accent-primary)] shadow-xs'
              }`}
            />
          </div>

          <div className={`pt-4 border-t flex justify-end gap-3 font-sans ${isDarkMode ? 'border-slate-800' : 'border-slate-200'}`}>
            <button
              type="button"
              onClick={handleCloseCreateBom}
              className={`px-4 py-2 rounded-xl border text-xs font-bold cursor-pointer transition-ui ${
                isDarkMode ? 'border-slate-700 text-slate-300 hover:bg-slate-800' : 'border-slate-300 text-slate-700 hover:bg-slate-100'
              }`}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-[var(--accent-primary)] hover:brightness-110 text-white font-bold text-xs cursor-pointer transition-ui shadow-md shadow-[var(--accent-shadow)] hover:scale-[1.01]"
            >
              Save BOM Formula
            </button>
          </div>
        </form>
      </Modal>

      {/* ========================================================================================= */}
      {/* MODAL 3: DUPLICATE BOM MODAL */}
      {/* ========================================================================================= */}
      <Modal
        isOpen={duplicateBomModal.isOpen && Boolean(duplicatingBom)}
        onClose={() => {
          setDuplicatingBom(null);
          duplicateBomModal.close();
        }}
        maxWidth="md"
        isDarkMode={isDarkMode}
        icon={<Copy className="w-5 h-5" />}
        title="Duplicate BOM Formula"
        subtitle={`Clone components from ${duplicatingBom?.bomCode || ''}`}
      >
        {duplicatingBom && (
          <form onSubmit={handleDuplicateBOMSubmit} className="space-y-4 text-xs font-sans">
            <div>
              <label className={`block text-[11px] font-bold uppercase tracking-wider mb-1.5 ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>New BOM Code *</label>
              <input
                name="targetBomCode"
                required
                defaultValue={`${duplicatingBom.bomCode}-COPY`}
                className={`h-11 w-full rounded-xl border px-3 text-xs font-mono outline-none transition-ui ${
                  isDarkMode ? 'bg-[#09090B] border-slate-700/80 text-white focus:border-[var(--accent-primary)] focus:ring-2 focus:ring-[var(--accent-ring)]' : 'bg-slate-50 border-slate-300 text-slate-900 focus:border-[var(--accent-primary)] shadow-xs'
                }`}
              />
            </div>

            <div>
              <label className={`block text-[11px] font-bold uppercase tracking-wider mb-1.5 ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>Target Part Code *</label>
              <input
                name="targetPartCode"
                required
                defaultValue={`${duplicatingBom.parentPartCode}-V2`}
                className={`h-11 w-full rounded-xl border px-3 text-xs font-mono outline-none transition-ui ${
                  isDarkMode ? 'bg-[#09090B] border-slate-700/80 text-white focus:border-[var(--accent-primary)] focus:ring-2 focus:ring-[var(--accent-ring)]' : 'bg-slate-50 border-slate-300 text-slate-900 focus:border-[var(--accent-primary)] shadow-xs'
                }`}
              />
            </div>

            <div>
              <label className={`block text-[11px] font-bold uppercase tracking-wider mb-1.5 ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>Target Part Name</label>
              <input
                name="targetPartName"
                defaultValue={duplicatingBom.parentPartName}
                className={`h-11 w-full rounded-xl border px-3 text-xs outline-none transition-ui ${
                  isDarkMode ? 'bg-[#09090B] border-slate-700/80 text-white focus:border-[var(--accent-primary)] focus:ring-2 focus:ring-[var(--accent-ring)]' : 'bg-slate-50 border-slate-300 text-slate-900 focus:border-[var(--accent-primary)] shadow-xs'
                }`}
              />
            </div>

            <div className={`pt-4 border-t flex justify-end gap-3 font-sans ${isDarkMode ? 'border-slate-800' : 'border-slate-200'}`}>
              <button type="button" onClick={() => setDuplicatingBom(null)} className={`px-4 py-2 rounded-xl border text-xs font-bold transition-ui cursor-pointer ${
                isDarkMode ? 'border-slate-700 text-slate-300 hover:bg-slate-800' : 'border-slate-300 text-slate-700 hover:bg-slate-100'
              }`}>
                Cancel
              </button>
              <button type="submit" className="px-5 py-2 rounded-xl bg-[var(--accent-primary)] hover:brightness-110 text-white font-bold text-xs cursor-pointer shadow-md shadow-[var(--accent-shadow)] transition-ui hover:scale-[1.01]">
                Duplicate BOM
              </button>
            </div>
          </form>
        )}
      </Modal>

      {/* ========================================================================================= */}
      {/* MODAL 4: CREATE BOM REVISION MODAL */}
      {/* ========================================================================================= */}
      <Modal
        isOpen={revisionBomModal.isOpen && Boolean(revisionBom)}
        onClose={() => {
          setRevisionBom(null);
          revisionBomModal.close();
        }}
        maxWidth="md"
        isDarkMode={isDarkMode}
        icon={<FolderPlus className="w-5 h-5" />}
        title="Create BOM Revision"
        subtitle={`Increment version for ${revisionBom?.bomCode || ''}`}
      >
        {revisionBom && (
          <form onSubmit={handleRevisionBOMSubmit} className="space-y-4 text-xs font-sans">
            <div className={`p-3.5 rounded-2xl border ${isDarkMode ? 'bg-[#09090B] border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
              <div className={isDarkMode ? 'text-slate-400' : 'text-slate-600'}>Current Revision: <span className="font-bold text-emerald-500 dark:text-emerald-400">{revisionBom.revision}</span></div>
              <div className={isDarkMode ? 'text-slate-400' : 'text-slate-600'}>Parent Part: <span className="font-bold text-[var(--accent-primary)] dark:text-[var(--accent-text-dark)]">{revisionBom.parentPartCode}</span></div>
            </div>

            <div>
              <label className={`block text-[11px] font-bold uppercase tracking-wider mb-1.5 ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>New Revision Identifier *</label>
              <input
                name="newRevision"
                required
                defaultValue={revisionBom.revision.includes('v') ? `v${(parseFloat(revisionBom.revision.replace('v', '')) + 0.1).toFixed(1)}` : 'REV-B'}
                className={`h-11 w-full rounded-xl border px-3 text-xs font-mono outline-none transition-ui ${
                  isDarkMode ? 'bg-[#09090B] border-slate-700/80 text-white focus:border-[var(--accent-primary)] focus:ring-2 focus:ring-[var(--accent-ring)]' : 'bg-slate-50 border-slate-300 text-slate-900 focus:border-[var(--accent-primary)] shadow-xs'
                }`}
              />
            </div>

            <div className={`pt-4 border-t flex justify-end gap-3 font-sans ${isDarkMode ? 'border-slate-800' : 'border-slate-200'}`}>
              <button type="button" onClick={() => setRevisionBom(null)} className={`px-4 py-2 rounded-xl border text-xs font-bold transition-ui cursor-pointer ${
                isDarkMode ? 'border-slate-700 text-slate-300 hover:bg-slate-800' : 'border-slate-300 text-slate-700 hover:bg-slate-100'
              }`}>
                Cancel
              </button>
              <button type="submit" className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs cursor-pointer shadow-md shadow-indigo-500/25 transition-ui hover:scale-[1.01]">
                Release Revision
              </button>
            </div>
          </form>
        )}
      </Modal>

      {/* ========================================================================================= */}
      {/* MODAL 5: DUPLICATE ROUTE CARD MODAL */}
      {/* ========================================================================================= */}
      <Modal
        isOpen={duplicateRouteModal.isOpen && Boolean(duplicatingRoute)}
        onClose={() => {
          setDuplicatingRoute(null);
          duplicateRouteModal.close();
        }}
        maxWidth="md"
        isDarkMode={isDarkMode}
        icon={<Copy className="w-5 h-5" />}
        title="Duplicate Route Card"
        subtitle={`Copy operation steps from ${duplicatingRoute?.partCode || ''}`}
      >
        {duplicatingRoute && (
          <form onSubmit={handleDuplicateRouteSubmit} className="space-y-4 text-xs font-sans">
            <div>
              <label className={`block text-[11px] font-bold uppercase tracking-wider mb-1.5 ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>Target Part Code *</label>
              <input
                name="targetPartCode"
                required
                defaultValue={`${duplicatingRoute.partCode}-V2`}
                className={`h-11 w-full rounded-xl border px-3 text-xs font-mono outline-none transition-ui ${
                  isDarkMode ? 'bg-[#09090B] border-slate-700/80 text-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20' : 'bg-slate-50 border-slate-300 text-slate-900 focus:border-emerald-500 shadow-xs'
                }`}
              />
            </div>

            <div>
              <label className={`block text-[11px] font-bold uppercase tracking-wider mb-1.5 ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>Target Part Description</label>
              <input
                name="targetPartDescription"
                defaultValue={duplicatingRoute.partDescription}
                className={`h-11 w-full rounded-xl border px-3 text-xs outline-none transition-ui ${
                  isDarkMode ? 'bg-[#09090B] border-slate-700/80 text-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20' : 'bg-slate-50 border-slate-300 text-slate-900 focus:border-emerald-500 shadow-xs'
                }`}
              />
            </div>

            <div className={`pt-4 border-t flex justify-end gap-3 font-sans ${isDarkMode ? 'border-slate-800' : 'border-slate-200'}`}>
              <button type="button" onClick={() => setDuplicatingRoute(null)} className={`px-4 py-2 rounded-xl border text-xs font-bold transition-ui cursor-pointer ${
                isDarkMode ? 'border-slate-700 text-slate-300 hover:bg-slate-800' : 'border-slate-300 text-slate-700 hover:bg-slate-100'
              }`}>
                Cancel
              </button>
              <button type="submit" className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs cursor-pointer shadow-md shadow-emerald-500/25 transition-ui hover:scale-[1.01]">
                Duplicate Route
              </button>
            </div>
          </form>
        )}
      </Modal>

      {/* ========================================================================================= */}
      {/* MODAL 6: DELETE CONFIRMATION DIALOG */}
      {/* ========================================================================================= */}
      <Modal
        isOpen={(deleteBomModal.isOpen && Boolean(deleteConfirmBom)) || (deleteRouteModal.isOpen && Boolean(deleteConfirmRoute))}
        onClose={() => {
          setDeleteConfirmBom(null);
          setDeleteConfirmRoute(null);
          deleteBomModal.close();
          deleteRouteModal.close();
        }}
        maxWidth="md"
        isDarkMode={isDarkMode}
        icon={<AlertTriangle className="w-5 h-5 text-rose-500" />}
        title="Confirm Deletion"
        subtitle="This action cannot be undone."
      >
        <div className="space-y-4 font-sans text-xs">
          <p className={isDarkMode ? 'text-slate-300' : 'text-slate-700'}>
            {deleteConfirmBom && `Are you sure you want to delete BOM formula ${deleteConfirmBom.bomCode}? All component relationships will be removed.`}
            {deleteConfirmRoute && `Are you sure you want to delete the Route Card template for ${deleteConfirmRoute.partCode}? All ${deleteConfirmRoute.operations?.length} sequenced operations will be removed.`}
          </p>

          <div className={`pt-3 border-t flex justify-end gap-3 font-sans ${isDarkMode ? 'border-slate-800' : 'border-slate-200'}`}>
            <button
              type="button"
              onClick={() => {
                setDeleteConfirmBom(null);
                setDeleteConfirmRoute(null);
                deleteBomModal.close();
                deleteRouteModal.close();
              }}
              className={`px-4 py-2 rounded-xl border text-xs font-bold transition-ui cursor-pointer ${
                isDarkMode ? 'border-slate-700 text-slate-300 hover:bg-slate-800' : 'border-slate-300 text-slate-700 hover:bg-slate-100'
              }`}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => {
                if (deleteConfirmBom) handleDeleteBOMConfirmed();
                if (deleteConfirmRoute) handleDeleteRouteConfirmed();
              }}
              className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs cursor-pointer shadow-md shadow-rose-500/25 transition-ui hover:scale-[1.01]"
            >
              Delete Record
            </button>
          </div>
        </div>
      </Modal>

      {/* ========================================================================================= */}
      {/* MODAL 7: CREATE SHOPFLOOR JOB CARD (INTEGRATED WITH ACTIVE BOM & ROUTE CARD) */}
      {/* ========================================================================================= */}
      <Modal
        isOpen={createJobModal.isOpen}
        onClose={() => createJobModal.close()}
        maxWidth="2xl"
        isDarkMode={isDarkMode}
        icon={<Factory className="w-5 h-5" />}
        title="Create Shopfloor Job Card"
        subtitle="Schedule manufacturing operation traveler from active Order, BOM & Route Card"
      >
        <form onSubmit={handleCreateJobSubmit} className="space-y-4 text-xs font-sans">
          {actionError && (
            <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-500 dark:text-rose-400 text-xs font-mono flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{actionError}</span>
            </div>
          )}
          {/* Order PO Selector — Combobox (hides after selection, click to reopen) */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className={`text-[11px] font-bold uppercase tracking-wider ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                Customer Order PO *
              </label>
              <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${
                isDarkMode ? 'text-slate-400 border-slate-700 bg-slate-800' : 'text-slate-500 border-slate-200 bg-white'
              }`}>
                {ordersWithPendingJobCards.length} pending
              </span>
            </div>

            {ordersWithPendingJobCards.length > 0 ? (
              <div className="relative">
                {/* Search / display input */}
                <div className="relative">
                  <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`} />
                  <input
                    type="text"
                    value={orderDropdownOpen ? orderSearchQuery : (newOrderPo || '')}
                    onFocus={() => { setOrderDropdownOpen(true); setOrderSearchQuery(''); }}
                    onChange={(e) => { setOrderSearchQuery(e.target.value); setOrderDropdownOpen(true); }}
                    placeholder="Click to search by PO No., customer, or item..."
                    className={`h-11 w-full rounded-xl border pl-9 pr-10 text-xs font-mono outline-none transition-ui ${
                      isDarkMode
                        ? 'bg-[#09090B] border-slate-700/80 text-white placeholder:text-slate-600 focus:border-[var(--accent-primary)] focus:ring-2 focus:ring-[var(--accent-ring)]'
                        : 'bg-slate-50 border-slate-300 text-slate-900 placeholder:text-slate-400 focus:border-[var(--accent-primary)] shadow-xs'
                    }`}
                  />
                  {newOrderPo && !orderDropdownOpen && (
                    <div className={`absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold px-1.5 py-0.5 rounded ${
                      isDarkMode ? 'bg-emerald-500/10 text-emerald-400' : 'bg-emerald-50 text-emerald-700'
                    }`}>
                      ✓ selected
                    </div>
                  )}
                </div>

                {/* Dropdown list — only when open */}
                {orderDropdownOpen && (
                  <div className={`absolute z-50 mt-1 w-full rounded-2xl border shadow-xl overflow-hidden ${
                    isDarkMode ? 'bg-[#09090B] border-slate-800 shadow-black/50' : 'bg-white border-slate-200 shadow-slate-200'
                  }`}>
                    <div className="max-h-52 overflow-y-auto divide-y">
                      {filteredOrdersForJobCard.length > 0 ? filteredOrdersForJobCard.map(o => {
                        const pendingLines = (o.lines || []).filter(line =>
                          !jobCards.find(jc =>
                            (jc.orderPo === o.poNo || jc.orderPo === o.id) &&
                            jc.partCode?.toLowerCase().trim() === line.itemCode?.toLowerCase().trim()
                          )
                        );
                        const isSelected = newOrderPo === o.poNo;
                        return (
                          <button
                            key={o.id || o.poNo}
                            type="button"
                            onMouseDown={() => {
                              handleSelectOrder(o.poNo);
                              setOrderSearchQuery('');
                              setOrderDropdownOpen(false);
                            }}
                            className={`w-full text-left px-3.5 py-2.5 text-xs transition-ui ${
                              isSelected
                                ? isDarkMode ? 'bg-[var(--accent-primary)]/15 border-l-2 border-[var(--accent-primary)]' : 'bg-indigo-50 border-l-2 border-indigo-500'
                                : isDarkMode ? 'hover:bg-slate-800/80 border-l-2 border-transparent' : 'hover:bg-slate-50 border-l-2 border-transparent'
                            }`}
                          >
                            <div className="flex items-center justify-between gap-2">
                              <span className={`font-mono font-bold ${isSelected ? 'text-[var(--accent-primary)]' : isDarkMode ? 'text-slate-200' : 'text-slate-900'}`}>
                                {o.poNo}
                              </span>
                              <span className={`shrink-0 text-[10px] font-medium px-1.5 py-0.5 rounded font-mono ${
                                isDarkMode ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' : 'bg-amber-50 text-amber-700 border border-amber-200'
                              }`}>
                                {pendingLines.length} item{pendingLines.length !== 1 ? 's' : ''} pending
                              </span>
                            </div>
                            <div className={`text-[10px] mt-0.5 truncate ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                              {o.customerName || 'Customer'} · {pendingLines.map(l => l.itemCode || l.itemDescription).filter(Boolean).join(', ') || 'Manual Entry'}
                            </div>
                          </button>
                        );
                      }) : (
                        <div className={`text-center py-5 text-xs font-mono ${
                          isDarkMode ? 'text-slate-500' : 'text-slate-400'
                        }`}>
                          No orders matching "{orderSearchQuery}"
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Click-outside overlay */}
                {orderDropdownOpen && (
                  <div className="fixed inset-0 z-40" onMouseDown={() => setOrderDropdownOpen(false)} />
                )}
              </div>
            ) : (
              <input
                type="text"
                required
                value={newOrderPo}
                onChange={(e) => setNewOrderPo(e.target.value)}
                placeholder="e.g. PO-2026-0891 (no pending orders found)"
                className={`h-11 w-full rounded-xl border px-3 text-xs font-mono outline-none transition-ui ${
                  isDarkMode ? 'bg-[#09090B] border-slate-700/80 text-white focus:border-[var(--accent-primary)] focus:ring-2 focus:ring-[var(--accent-ring)]' : 'bg-slate-50 border-slate-300 text-slate-900 focus:border-[var(--accent-primary)] shadow-xs'
                }`}
              />
            )}

            {/* Selected order confirmation strip */}
            {newOrderPo && !orderDropdownOpen && (() => {
              const selOrder = eligibleOrders.find(o => o.poNo === newOrderPo || o.id === newOrderPo);
              if (!selOrder) return null;
              return (
                <div className={`mt-2 flex items-center gap-2 text-[11px] font-mono px-2.5 py-1.5 rounded-lg ${
                  isDarkMode ? 'bg-[var(--accent-primary)]/10 text-[var(--accent-primary)]' : 'bg-indigo-50 text-indigo-700'
                }`}>
                  <Check className="w-3 h-3 shrink-0" />
                  <span className="font-bold">{selOrder.poNo}</span>
                  <span className="opacity-70">· {selOrder.customerName}</span>
                </div>
              );
            })()}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={`block text-[11px] font-bold uppercase tracking-wider mb-1.5 ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>Batch Qty (NOS) *</label>
              <input
                type="number"
                required
                value={newQty}
                onChange={(e) => setNewQty(Number(e.target.value))}
                className={`h-11 w-full rounded-xl border px-3 text-xs font-mono font-bold outline-none transition-ui ${
                  isDarkMode ? 'bg-[#09090B] border-slate-700/80 text-white focus:border-[var(--accent-primary)] focus:ring-2 focus:ring-[var(--accent-ring)]' : 'bg-slate-50 border-slate-300 text-slate-900 focus:border-[var(--accent-primary)] shadow-xs'
                }`}
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            {/* FG Number — Inventory-Indexed Picker */}
            <div className="col-span-3">
              <label className={`block text-[11px] font-bold uppercase tracking-wider mb-1.5 ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                Finished Goods No. *
                <span className={`ml-2 text-[10px] normal-case font-normal px-1.5 py-0.5 rounded border ${
                  isDarkMode ? 'border-slate-700 text-slate-400 bg-slate-800' : 'border-slate-200 text-slate-500 bg-white'
                }`}>
                  {finishedGoodsMasters.length} items in inventory
                </span>
              </label>

              {finishedGoodsMasters.length > 0 ? (
                <div className="relative">
                  {/* Selected display / search input */}
                  <div className="relative">
                    <Package className={`absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 ${
                      isDarkMode ? 'text-slate-500' : 'text-slate-400'
                    }`} />
                    <input
                      type="text"
                      value={fgDropdownOpen ? fgSearchQuery : newPartCode}
                      onFocus={() => { setFgDropdownOpen(true); setFgSearchQuery(''); }}
                      onChange={(e) => { setFgSearchQuery(e.target.value); setFgDropdownOpen(true); }}
                      placeholder="Search FG code, name, or part no..."
                      className={`h-11 w-full rounded-xl border pl-9 pr-10 text-xs font-mono outline-none transition-ui ${
                        isDarkMode
                          ? 'bg-[#09090B] border-slate-700/80 text-white placeholder:text-slate-600 focus:border-[var(--accent-primary)] focus:ring-2 focus:ring-[var(--accent-ring)]'
                          : 'bg-slate-50 border-slate-300 text-slate-900 placeholder:text-slate-400 focus:border-[var(--accent-primary)] shadow-xs'
                      }`}
                    />
                    {newPartCode && !fgDropdownOpen && (
                      <div className={`absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold px-1.5 py-0.5 rounded ${
                        isDarkMode ? 'bg-emerald-500/10 text-emerald-400' : 'bg-emerald-50 text-emerald-700'
                      }`}>
                        ✓ linked
                      </div>
                    )}
                  </div>

                  {/* Dropdown list */}
                  {fgDropdownOpen && (
                    <div className={`absolute z-50 mt-1 w-full rounded-2xl border shadow-xl overflow-hidden ${
                      isDarkMode ? 'bg-[#09090B] border-slate-800 shadow-black/50' : 'bg-white border-slate-200 shadow-slate-200'
                    }`}>
                      <div className="max-h-52 overflow-y-auto divide-y">
                        {filteredFGMasters.length > 0 ? filteredFGMasters.map(m => (
                          <button
                            key={m.id || m.code}
                            type="button"
                            onMouseDown={() => handleSelectFG(m)}
                            className={`w-full text-left px-3.5 py-2.5 transition-ui ${
                              newPartCode === m.code
                                ? isDarkMode ? 'bg-[var(--accent-primary)]/15 border-l-2 border-[var(--accent-primary)]' : 'bg-indigo-50 border-l-2 border-indigo-500'
                                : isDarkMode ? 'hover:bg-slate-800/80 border-l-2 border-transparent' : 'hover:bg-slate-50 border-l-2 border-transparent'
                            }`}
                          >
                            <div className="flex items-center justify-between gap-2">
                              <span className={`text-xs font-mono font-bold ${
                                newPartCode === m.code ? 'text-[var(--accent-primary)]' : isDarkMode ? 'text-slate-200' : 'text-slate-900'
                              }`}>{m.code}</span>
                              {m.unit && (
                                <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono shrink-0 ${
                                  isDarkMode ? 'bg-slate-800 text-slate-400' : 'bg-slate-100 text-slate-500'
                                }`}>{m.unit}</span>
                              )}
                            </div>
                            <div className={`text-[11px] mt-0.5 truncate ${
                              isDarkMode ? 'text-slate-400' : 'text-slate-600'
                            }`}>{m.name || m.description}</div>
                            {m.partNo && (
                              <div className={`text-[10px] font-mono mt-0.5 ${
                                isDarkMode ? 'text-slate-600' : 'text-slate-400'
                              }`}>Drwg: {m.partNo}</div>
                            )}
                          </button>
                        )) : (
                          <div className={`text-center py-5 text-xs font-mono ${
                            isDarkMode ? 'text-slate-500' : 'text-slate-400'
                          }`}>
                            No finished goods matching "{fgSearchQuery}"
                          </div>
                        )}
                      </div>
                      <div
                        className={`px-3 py-2 border-t text-[10px] font-mono cursor-pointer transition-colors ${
                          isDarkMode ? 'border-slate-800 text-slate-500 hover:text-slate-300' : 'border-slate-100 text-slate-400 hover:text-slate-700'
                        }`}
                        onMouseDown={() => { setFgDropdownOpen(false); }}
                      >
                        ✎ Type manually — or close to enter a custom code above
                      </div>
                    </div>
                  )}

                  {/* Click-outside overlay */}
                  {fgDropdownOpen && (
                    <div className="fixed inset-0 z-40" onMouseDown={() => setFgDropdownOpen(false)} />
                  )}
                </div>
              ) : (
                /* No masters loaded — plain manual input */
                <input
                  type="text"
                  required
                  value={newPartCode}
                  onChange={(e) => setNewPartCode(e.target.value)}
                  placeholder="e.g. FG-0001 (no inventory masters loaded)"
                  className={`h-11 w-full rounded-xl border px-3 text-xs font-mono outline-none transition-ui ${
                    isDarkMode ? 'bg-[#09090B] border-slate-700/80 text-white focus:border-[var(--accent-primary)] focus:ring-2 focus:ring-[var(--accent-ring)]' : 'bg-slate-50 border-slate-300 text-slate-900 focus:border-[var(--accent-primary)] shadow-xs'
                  }`}
                />
              )}
            </div>

            {/* Drawing Rev */}
            <div>
              <label className={`block text-[11px] font-bold uppercase tracking-wider mb-1.5 ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>Drawing Rev *</label>
              <input
                type="text"
                required
                value={newDrawingRev}
                onChange={(e) => setNewDrawingRev(e.target.value)}
                className={`h-11 w-full rounded-xl border px-3 text-xs font-mono outline-none transition-ui ${
                  isDarkMode ? 'bg-[#09090B] border-slate-700/80 text-white focus:border-[var(--accent-primary)] focus:ring-2 focus:ring-[var(--accent-ring)]' : 'bg-slate-50 border-slate-300 text-slate-900 focus:border-[var(--accent-primary)] shadow-xs'
                }`}
              />
            </div>
            <div>
              <label className={`block text-[11px] font-bold uppercase tracking-wider mb-1.5 ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>Heat/Lot # (Optional)</label>
              <input
                type="text"
                value={newHeatLot}
                onChange={(e) => setNewHeatLot(e.target.value)}
                placeholder="Optional"
                className={`h-11 w-full rounded-xl border px-3 text-xs font-mono outline-none transition-ui ${
                  isDarkMode ? 'bg-[#09090B] border-slate-700/80 text-white focus:border-[var(--accent-primary)] focus:ring-2 focus:ring-[var(--accent-ring)]' : 'bg-slate-50 border-slate-300 text-slate-900 focus:border-[var(--accent-primary)] shadow-xs'
                }`}
              />
            </div>
          </div>

          <div>
            <label className={`block text-[11px] font-bold uppercase tracking-wider mb-1.5 ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>Part Description *</label>
            <input
              type="text"
              required
              value={newPartDesc}
              onChange={(e) => setNewPartDesc(e.target.value)}
              placeholder="e.g. MAIN SPINDLE HOUSING 120MM"
              className={`h-11 w-full rounded-xl border px-3 text-xs outline-none transition-ui ${
                isDarkMode 
                  ? 'bg-[#09090B] border-slate-700/80 text-white focus:border-[var(--accent-primary)] focus:ring-2 focus:ring-[var(--accent-ring)]' 
                  : 'bg-slate-50 border-slate-300 text-slate-900 focus:border-[var(--accent-primary)] shadow-xs'
              }`}
            />
          </div>

          {/* Connected Active BOM & Route Card Intel Card */}
          <div className={`p-4 rounded-2xl border space-y-3 font-mono text-xs ${
            isDarkMode ? 'bg-[#09090B] border-slate-800' : 'bg-slate-50 border-slate-200'
          }`}>
            <div className="flex items-center justify-between text-[11px] font-bold uppercase">
              <span className="text-[var(--accent-text-light)] dark:text-[var(--accent-text-dark)] flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-[var(--accent-primary)]" />
                Linked Manufacturing Configuration
              </span>
              <span className={isDarkMode ? 'text-slate-400' : 'text-slate-500'}>Engineering Check</span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className={`p-2.5 rounded-xl border ${
                linkedBOMForNewJob ? (isDarkMode ? 'border-slate-800 bg-slate-900/60' : 'border-slate-200 bg-white') : 'border-rose-500/30 bg-rose-500/10'
              }`}>
                <div className={`text-[10px] ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>WHAT Formula (BOM):</div>
                {linkedBOMForNewJob ? (
                  <div className="font-bold text-emerald-600 dark:text-emerald-400 text-xs mt-0.5">
                    {linkedBOMForNewJob.bomCode} ({linkedBOMForNewJob.components?.length || 0} Components)
                  </div>
                ) : (
                  <div className="text-rose-500 dark:text-rose-400 text-[11px] font-bold mt-0.5">
                    No BOM found (Direct manual issue)
                  </div>
                )}
              </div>

              <div className={`p-2.5 rounded-xl border ${
                linkedRouteForNewJob ? (isDarkMode ? 'border-slate-800 bg-slate-900/60' : 'border-slate-200 bg-white') : 'border-amber-500/30 bg-amber-500/10'
              }`}>
                <div className={`text-[10px] ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>HOW Sequence (Route Card):</div>
                {linkedRouteForNewJob ? (
                  <div className="font-bold text-emerald-600 dark:text-emerald-400 text-xs mt-0.5">
                    {linkedRouteForNewJob.operations?.length} Stages ({linkedRouteForNewJob.totalStandardTimeMinutes || 45} mins total)
                  </div>
                ) : (
                  <div className="text-amber-600 dark:text-amber-400 text-[11px] font-bold mt-0.5">
                    Standard Single-Stage Machining
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={`block text-[11px] font-bold uppercase tracking-wider mb-1.5 ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                Machine Center (Machine Master) *
              </label>
              <select
                required
                value={newMachine}
                onChange={(e) => setNewMachine(e.target.value)}
                className={`h-11 w-full rounded-xl border px-3 text-xs font-mono outline-none cursor-pointer transition-ui ${
                  isDarkMode 
                    ? 'bg-[#09090B] border-slate-700/80 text-white focus:border-[var(--accent-primary)] focus:ring-2 focus:ring-[var(--accent-ring)]' 
                    : 'bg-slate-50 border-slate-300 text-slate-900 focus:border-[var(--accent-primary)] shadow-xs'
                }`}
              >
                {availableMachines.length === 0 ? (
                  <>
                    <option value="" disabled>No machines in Machine Master</option>
                    {newMachine && <option value={newMachine}>{newMachine}</option>}
                  </>
                ) : (
                  <>
                    <option value="">-- Select Machine from Master --</option>
                    {availableMachines.map((m) => (
                      <option key={m.code} value={m.name || m.code}>
                        {m.code} — {m.name} ({m.type || m.department || 'Machine Shop'})
                      </option>
                    ))}
                    {newMachine && !availableMachines.some(m => (m.name || m.code) === newMachine || m.code === newMachine) && (
                      <option value={newMachine}>{newMachine}</option>
                    )}
                  </>
                )}
              </select>
            </div>
            <div>
              <label className={`block text-[11px] font-bold uppercase tracking-wider mb-1.5 ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>Target Completion Date</label>
              <input
                type="date"
                required
                value={newTargetDate}
                onChange={(e) => setNewTargetDate(e.target.value)}
                className={`h-11 w-full rounded-xl border px-3 text-xs font-mono outline-none transition-ui ${
                  isDarkMode ? 'bg-[#09090B] border-slate-700/80 text-white focus:border-[var(--accent-primary)] focus:ring-2 focus:ring-[var(--accent-ring)]' : 'bg-slate-50 border-slate-300 text-slate-900 focus:border-[var(--accent-primary)] shadow-xs'
                }`}
              />
            </div>
          </div>

          <div className={`pt-4 border-t flex items-center justify-end gap-3 font-sans ${isDarkMode ? 'border-slate-800' : 'border-slate-200'}`}>
            <button 
              type="button" 
              onClick={() => createJobModal.close()} 
              className={`px-4 py-2 rounded-xl border text-xs font-bold cursor-pointer transition-ui ${
                isDarkMode 
                  ? 'border-slate-700 text-slate-300 hover:bg-slate-800' 
                  : 'border-slate-300 text-slate-700 hover:bg-slate-100'
              }`}
            >
              Cancel
            </button>
            <button 
              type="submit" 
              disabled={isSubmittingJobCard}
              className="px-5 py-2 rounded-xl bg-[var(--accent-primary)] hover:brightness-110 text-white font-bold text-xs cursor-pointer shadow-md shadow-[var(--accent-shadow)] transition-ui hover:scale-[1.01] active:scale-[0.96] disabled:opacity-50 flex items-center gap-2"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSubmittingJobCard ? 'animate-spin' : ''}`} />
              <span>{isSubmittingJobCard ? 'Releasing Job Card...' : 'Release Job Card'}</span>
            </button>
          </div>
        </form>
      </Modal>

      {/* ========================================================================================= */}
      {/* MODAL 8: LOG PRODUCTION SHIFT OUTPUT */}
      {/* ========================================================================================= */}
      <Modal
        isOpen={logProdModal.isOpen && Boolean(selectedJobForLog)}
        onClose={() => {
          setSelectedJobForLog(null);
          logProdModal.close();
        }}
        maxWidth="md"
        isDarkMode={isDarkMode}
        icon={<Activity className="w-5 h-5" />}
        title="Log Shift Output"
        subtitle="Record operational production output"
      >
        {selectedJobForLog && (
          <form onSubmit={handleLogSubmit} className="space-y-4 text-xs font-sans">
            <div className={`p-3.5 rounded-2xl border font-mono font-bold text-xs ${
              isDarkMode ? 'bg-[#09090B] border-slate-800 text-[var(--accent-text-dark)]' : 'bg-slate-50 border-slate-200 text-[var(--accent-text-light)]'
            }`}>
              {selectedJobForLog.jobNo} — {selectedJobForLog.partDescription}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={`block text-[11px] font-bold uppercase tracking-wider mb-1.5 ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>Step #</label>
                <input
                  type="number"
                  value={logStepNo}
                  onChange={(e) => setLogStepNo(Number(e.target.value))}
                  className={`h-11 w-full rounded-xl border px-3 text-xs font-mono outline-none ${
                    isDarkMode ? 'bg-[#09090B] border-slate-700/80 text-white focus:border-[var(--accent-primary)]' : 'bg-slate-50 border-slate-300 text-slate-900 focus:border-[var(--accent-primary)]'
                  }`}
                />
              </div>
              <div>
                <label className={`block text-[11px] font-bold uppercase tracking-wider mb-1.5 ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>Qty Produced</label>
                <input
                  type="number"
                  value={logDoneQty}
                  onChange={(e) => setLogDoneQty(Number(e.target.value))}
                  className={`h-11 w-full rounded-xl border px-3 text-xs font-mono font-bold outline-none ${
                    isDarkMode ? 'bg-[#09090B] border-slate-700/80 text-white focus:border-[var(--accent-primary)]' : 'bg-slate-50 border-slate-300 text-slate-900 focus:border-[var(--accent-primary)]'
                  }`}
                />
              </div>
            </div>

            <div>
              <label className={`block text-[11px] font-bold uppercase tracking-wider mb-1.5 ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>Operation Name</label>
              <input
                type="text"
                value={logOperation}
                onChange={(e) => setLogOperation(e.target.value)}
                className={`h-11 w-full rounded-xl border px-3 text-xs outline-none ${
                  isDarkMode ? 'bg-[#09090B] border-slate-700/80 text-white focus:border-[var(--accent-primary)]' : 'bg-slate-50 border-slate-300 text-slate-900 focus:border-[var(--accent-primary)]'
                }`}
              />
            </div>

            <div className={`pt-4 border-t flex items-center justify-end gap-3 font-sans ${isDarkMode ? 'border-slate-800' : 'border-slate-200'}`}>
              <button 
                type="button" 
                onClick={() => setSelectedJobForLog(null)} 
                className={`px-4 py-2 rounded-xl border text-xs font-bold cursor-pointer transition-ui ${
                  isDarkMode 
                    ? 'border-slate-700 text-slate-300 hover:bg-slate-800' 
                    : 'border-slate-300 text-slate-700 hover:bg-slate-100'
                }`}
              >
                Cancel
              </button>
              <button 
                type="submit" 
                className="px-5 py-2 rounded-xl bg-[var(--accent-primary)] hover:brightness-110 text-white font-bold text-xs cursor-pointer shadow-md shadow-[var(--accent-shadow)] transition-ui hover:scale-[1.01] active:scale-[0.96]"
              >
                Log Production Shift
              </button>
            </div>
          </form>
        )}
      </Modal>

      {/* ========================================================================================= */}
      {/* MODAL 9: JOB CARD ROUTE TRAVELER & LIVE OPERATION EXECUTION */}
      {/* ========================================================================================= */}
      {travelerModal.isOpen && activeJobCard && selectedJobForTraveler && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md font-sans overflow-y-auto">
          <div className={`relative w-full max-w-4xl max-h-[90vh] flex flex-col rounded-3xl border shadow-2xl transition-ui overflow-hidden ${
            isDarkMode 
              ? 'bg-slate-900/95 border-slate-800/90 text-white backdrop-blur-2xl shadow-[#5B75F8]/10' 
              : 'bg-white border-slate-200 text-slate-900 shadow-2xl'
          }`}>
            {/* Header */}
            <div className="flex flex-wrap items-center justify-between gap-3 px-7 py-5 border-b border-slate-200 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-950/40">
              <div className="flex items-center gap-3.5">
                <div className="p-3 rounded-2xl bg-gradient-to-tr from-[#5B75F8] to-indigo-600 text-white shadow-md shadow-[#5B75F8]/20">
                  <Route className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-lg font-mono text-[#5B75F8] dark:text-[#7B92FF] tracking-tight">
                      {activeJobCard.jobNo}
                    </h3>
                    <span className={`px-2.5 py-0.5 rounded-xl text-[10px] font-mono font-bold uppercase border ${
                      activeJobCard.jobStatus === 'QC_HOLD' || activeJobCard.status === 'QC_HOLD'
                        ? 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                        : activeJobCard.jobStatus === 'IN_PROGRESS' || activeJobCard.status === 'RUNNING'
                        ? 'bg-purple-500/10 text-purple-400 border-purple-500/30 animate-pulse'
                        : activeJobCard.jobStatus === 'COMPLETED' || activeJobCard.status === 'COMPLETED'
                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                        : 'bg-[#5B75F8]/10 text-[#7B92FF] border-[#5B75F8]/30'
                    }`}>
                      {activeJobCard.jobStatus || activeJobCard.status}
                    </span>
                    {activeJobCard.drawingRevision && (
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        Rev: {activeJobCard.drawingRevision}
                      </span>
                    )}
                  </div>
                  <p className={`text-xs mt-0.5 font-sans ${isDarkMode ? 'text-slate-300' : 'text-slate-600'}`}>
                    <span className="font-bold">{activeJobCard.partCode}</span> — {activeJobCard.partDescription} • PO: <span className="font-mono font-bold text-indigo-400">{activeJobCard.orderPo}</span> • Target: <span className="font-mono font-bold">{activeJobCard.targetQty || activeJobCard.qty} NOS</span>
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {activeJobCard.materialIssuedLot && (
                  <div className={`px-3 py-1.5 rounded-xl border text-[11px] font-mono ${
                    isDarkMode ? 'bg-slate-950/60 border-slate-800 text-slate-300' : 'bg-slate-100 border-slate-200 text-slate-700'
                  }`}>
                    Heat/Lot: <span className="font-bold text-amber-400">{activeJobCard.materialIssuedLot}</span>
                  </div>
                )}
                <button 
                  onClick={() => {
                    setSelectedJobForTraveler(null);
                    travelerModal.close();
                  }} 
                  className={`p-2.5 rounded-2xl border transition-ui cursor-pointer ${
                    isDarkMode 
                      ? 'border-slate-800 bg-slate-950/60 text-slate-400 hover:text-white hover:bg-slate-800' 
                      : 'border-slate-200 bg-slate-50 text-slate-500 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Scrollable Body */}
            <div className="p-7 space-y-6 overflow-y-auto flex-1">
              {/* Alert Feedback */}
              {travelerError && (
                <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-mono flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{travelerError}</span>
                </div>
              )}
              {travelerSuccess && (
                <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-mono flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>{travelerSuccess}</span>
                </div>
              )}

              {/* ROUTE CARD TRAVELER WORKFLOW SEQUENCE TIMELINE */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Layers className="w-4 h-4 text-[#5B75F8]" />
                    <span className="text-xs font-mono uppercase font-bold tracking-wider text-slate-400">
                      Operational Routing Sequence (Route Card Traveler)
                    </span>
                  </div>
                  <span className="text-[11px] font-mono text-slate-400">
                    {effectiveOperations.filter((o: any) => o.opStatus === 'COMPLETED').length} of {effectiveOperations.length} Operations Completed
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                  {effectiveOperations.map((op: any, index: number) => {
                    const isSelected = selectedOp?.sequenceNo === op.sequenceNo;
                    const isCompleted = op.opStatus === 'COMPLETED';
                    const isInProgress = op.opStatus === 'IN_PROGRESS';
                    const isPending = !isCompleted && !isInProgress;
                    const isNextExecutable = currentExecutableOp?.sequenceNo === op.sequenceNo;

                    const stepStartTime = getDerivedStepStart(op, index, effectiveOperations.length);
                    const stepEndTime = getDerivedStepEnd(op, index, effectiveOperations.length);

                    return (
                      <div
                        key={op.sequenceNo}
                        onClick={() => setSelectedOpSequence(op.sequenceNo)}
                        className={`p-4 rounded-2xl border transition-ui cursor-pointer relative overflow-hidden flex flex-col justify-between ${
                          isSelected 
                            ? isDarkMode
                              ? 'bg-slate-800/90 border-[#5B75F8] shadow-lg shadow-[#5B75F8]/10 ring-1 ring-[#5B75F8]/30'
                              : 'bg-indigo-50/70 border-[#5B75F8] shadow-md shadow-indigo-100 ring-1 ring-[#5B75F8]/30'
                            : isDarkMode
                              ? 'bg-slate-950/40 border-slate-800 hover:border-slate-700'
                              : 'bg-slate-50 border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        <div>
                          {/* Top Step Pill & Status */}
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-[10px] font-mono font-bold text-slate-400">
                              STEP {index + 1} • OP {op.sequenceNo}
                            </span>
                            {isCompleted ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-mono font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                                <CheckCircle2 className="w-3 h-3" />
                                <span>DONE</span>
                              </span>
                            ) : isInProgress ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-mono font-bold bg-purple-500/20 text-purple-300 border border-purple-500/40 animate-pulse">
                                <Play className="w-2.5 h-2.5 fill-current" />
                                <span>RUNNING</span>
                              </span>
                            ) : isNextExecutable ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-mono font-bold bg-[#5B75F8]/20 text-[#7B92FF] border border-[#5B75F8]/40">
                                <Sparkle className="w-2.5 h-2.5" />
                                <span>READY</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-mono font-bold bg-slate-800/60 text-slate-500 border border-slate-700/50">
                                <Lock className="w-2.5 h-2.5" />
                                <span>LOCKED</span>
                              </span>
                            )}
                          </div>

                          {/* Operation Name */}
                          <h4 className={`text-xs font-bold font-sans line-clamp-1 ${
                            isSelected ? (isDarkMode ? 'text-white' : 'text-slate-900') : (isDarkMode ? 'text-slate-300' : 'text-slate-700')
                          }`}>
                            {op.operationName}
                          </h4>
                        </div>

                        {/* Timing and Work Center Summary on Card */}
                        {isCompleted ? (
                          <div className="mt-3 pt-2 border-t border-slate-200 dark:border-slate-800/60 space-y-1 text-[10px] font-mono">
                            <div className="flex items-center justify-between text-slate-400">
                              <span className="flex items-center gap-1 text-slate-300">
                                <Clock className="w-2.5 h-2.5 text-emerald-400" />
                                <span>{formatStepTimeOnly(stepStartTime) || '09:30 AM'}</span>
                              </span>
                              <span className="text-slate-500">→</span>
                              <span className="flex items-center gap-1 font-bold text-emerald-400">
                                <Check className="w-2.5 h-2.5" />
                                <span>{formatStepTimeOnly(stepEndTime) || 'Done'}</span>
                              </span>
                            </div>
                            <div className="flex items-center justify-between text-[9.5px]">
                              <span className="text-indigo-400 font-bold">{op.actualTimeMinutes || op.standardTimeMinutes || 15}m actual</span>
                              <span className="text-emerald-400 font-bold">{op.qtyProcessed || activeJobCard.targetQty || 1} NOS OK</span>
                            </div>
                          </div>
                        ) : isInProgress ? (
                          <div className="mt-3 pt-2 border-t border-slate-200 dark:border-slate-800/60 space-y-1 text-[10px] font-mono">
                            <div className="flex items-center justify-between text-purple-300">
                              <span className="flex items-center gap-1">
                                <Play className="w-2.5 h-2.5 fill-current text-purple-400 animate-pulse" />
                                <span>Started: {formatStepTimeOnly(op.actualStartTime) || 'Active'}</span>
                              </span>
                            </div>
                            <div className="flex items-center justify-between text-slate-400 text-[9.5px]">
                              <span className="truncate max-w-[90px]">{op.operatorName || 'Shopfloor Operator'}</span>
                              <span>{op.machineId || 'Machining Bay'}</span>
                            </div>
                          </div>
                        ) : (
                          <div className="mt-3 pt-2 border-t border-slate-200 dark:border-slate-800/60 flex items-center justify-between text-[10px] font-mono text-slate-400">
                            <span>{op.machineId || 'Machining Bay'}</span>
                            <span>{op.standardTimeMinutes || 15}m std</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* ALL OPERATIONS COMPLETED STATE BANNER */}
              {effectiveOperations.length > 0 && effectiveOperations.every((o: any) => o.opStatus === 'COMPLETED') && (
                <div className={`p-5 rounded-3xl border flex flex-wrap items-center justify-between gap-4 ${
                  isDarkMode 
                    ? 'bg-emerald-950/30 border-emerald-500/40 text-emerald-300' 
                    : 'bg-emerald-50 border-emerald-200 text-emerald-800'
                }`}>
                  <div className="flex items-center gap-3.5">
                    <div className="p-3 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                      <ShieldCheck className="w-6 h-6" />
                    </div>
                    <div>
                      <h4 className="font-bold text-sm font-sans">
                        🎉 Manufacturing Completed! All Routing Operations Executed.
                      </h4>
                      <p className="text-xs font-mono mt-0.5 opacity-90">
                        Job Card {activeJobCard.jobNo} is ready for Pre-Dispatch Inspection (PDI) & Quality Clearance.
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedJobForTraveler(null);
                      if (onSelectOrder && activeJobCard.orderPo) {
                        onSelectOrder(activeJobCard.orderPo);
                      } else if (onNavigate) {
                        onNavigate('qc');
                      }
                    }}
                    className="px-5 py-2.5 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-teal-600 hover:to-emerald-600 text-white font-bold text-xs font-mono shadow-lg shadow-emerald-500/25 flex items-center gap-2 cursor-pointer transition-ui hover:scale-105 shrink-0"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>START QC / PDI CHECK</span>
                  </button>
                </div>
              )}

              {/* ACTIVE OPERATION EXECUTION WORKSPACE */}
              {selectedOp && (
                <div className={`p-6 rounded-3xl border transition-ui ${
                  isDarkMode ? 'bg-slate-950/60 border-slate-800/90' : 'bg-slate-50/80 border-slate-200'
                }`}>
                  <div className="flex flex-wrap items-center justify-between gap-3 pb-4 mb-5 border-b border-slate-200 dark:border-slate-800/80">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded-lg text-[10px] font-mono font-bold bg-[#5B75F8]/20 text-[#7B92FF]">
                          OP {selectedOp.sequenceNo}
                        </span>
                        <h4 className={`text-base font-bold font-sans ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                          {selectedOp.operationName}
                        </h4>
                      </div>
                      <p className={`text-xs mt-1 font-mono ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                        Work Center: <span className="font-bold text-indigo-400">{selectedOp.machineId || 'Machining Bay'}</span> • Standard Cycle Time: <span className="font-bold">{selectedOp.standardTimeMinutes || 15} Mins</span> • Required Skill: <span className="font-bold">{selectedOp.requiredCertification || 'None'}</span>
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className={`px-3 py-1 rounded-xl text-xs font-mono font-bold uppercase border ${
                        selectedOp.opStatus === 'COMPLETED'
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                          : selectedOp.opStatus === 'IN_PROGRESS'
                          ? 'bg-purple-500/10 text-purple-400 border-purple-500/30'
                          : 'bg-slate-800 text-slate-400 border-slate-700'
                      }`}>
                        {selectedOp.opStatus || 'PENDING'}
                      </span>
                    </div>
                  </div>

                  {/* SUB-CASE 1: Operation is COMPLETED */}
                  {selectedOp.opStatus === 'COMPLETED' ? (
                    <div className="space-y-4 font-mono">
                      {/* Detailed Process Timing & Output Summary Grid */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
                        <div className={`p-4 rounded-2xl border flex flex-col justify-between ${
                          isDarkMode ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-200'
                        }`}>
                          <div className="flex items-center justify-between text-slate-400 text-[10px] uppercase font-bold tracking-wider">
                            <span>Process Started At</span>
                            <Clock className="w-3.5 h-3.5 text-indigo-400" />
                          </div>
                          <div className="mt-2 text-xs font-bold text-slate-200">
                            {formatStepDateTime(getDerivedStepStart(selectedOp, effectiveOperations.findIndex(o => o.sequenceNo === selectedOp.sequenceNo), effectiveOperations.length)) || '26 Aug 2026, 09:30 AM'}
                          </div>
                          <div className="mt-1 text-[10px] text-slate-400">
                            Logged on shopfloor start
                          </div>
                        </div>

                        <div className={`p-4 rounded-2xl border flex flex-col justify-between ${
                          isDarkMode ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-200'
                        }`}>
                          <div className="flex items-center justify-between text-slate-400 text-[10px] uppercase font-bold tracking-wider">
                            <span>Process Completed At</span>
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                          </div>
                          <div className="mt-2 text-xs font-bold text-emerald-400">
                            {formatStepDateTime(getDerivedStepEnd(selectedOp, effectiveOperations.findIndex(o => o.sequenceNo === selectedOp.sequenceNo), effectiveOperations.length)) || '26 Aug 2026, 09:48 AM'}
                          </div>
                          <div className="mt-1 text-[10px] text-emerald-400/80">
                            Verified & Gate Cleared
                          </div>
                        </div>

                        <div className={`p-4 rounded-2xl border flex flex-col justify-between ${
                          isDarkMode ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-200'
                        }`}>
                          <div className="flex items-center justify-between text-slate-400 text-[10px] uppercase font-bold tracking-wider">
                            <span>Cycle Time (Actual / Std)</span>
                            <Timer className="w-3.5 h-3.5 text-amber-400" />
                          </div>
                          <div className="mt-2 text-sm font-bold text-indigo-400">
                            {selectedOp.actualTimeMinutes || selectedOp.standardTimeMinutes || 15} Mins
                            <span className="text-[11px] font-normal text-slate-400 ml-1.5 font-sans">
                              (Std: {selectedOp.standardTimeMinutes || 15}m)
                            </span>
                          </div>
                          <div className="mt-1 text-[10px] text-slate-400">
                            {(selectedOp.actualTimeMinutes || 15) <= (selectedOp.standardTimeMinutes || 15) ? (
                              <span className="text-emerald-400">✓ On / Under Cycle Target</span>
                            ) : (
                              <span className="text-amber-400">⚡ +{(selectedOp.actualTimeMinutes || 15) - (selectedOp.standardTimeMinutes || 15)}m Variance</span>
                            )}
                          </div>
                        </div>

                        <div className={`p-4 rounded-2xl border flex flex-col justify-between ${
                          isDarkMode ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-200'
                        }`}>
                          <div className="flex items-center justify-between text-slate-400 text-[10px] uppercase font-bold tracking-wider">
                            <span>Output Yield & Scrap</span>
                            <Package className="w-3.5 h-3.5 text-purple-400" />
                          </div>
                          <div className="mt-2 text-sm font-bold text-emerald-400">
                            {selectedOp.qtyProcessed || activeJobCard.targetQty || 1} NOS Good
                          </div>
                          <div className="mt-1 text-[10px] text-slate-400">
                            {selectedOp.qtyRejected > 0 ? (
                              <span className="text-rose-400 font-bold">{selectedOp.qtyRejected} Rejected / Scrapped</span>
                            ) : (
                              <span className="text-emerald-400">Zero Scrap (100% Yield)</span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Work Center, Operator and Quality Certification Detail Box */}
                      <div className={`p-4 rounded-2xl border grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs ${
                        isDarkMode ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200'
                      }`}>
                        <div>
                          <div className={`text-[10px] uppercase font-bold ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Assigned Machine / Bay</div>
                          <div className={`mt-1 font-bold flex items-center gap-1.5 ${isDarkMode ? 'text-slate-200' : 'text-slate-900'}`}>
                            <Cpu className="w-3.5 h-3.5 text-indigo-500 dark:text-indigo-400" />
                            <span>{selectedOp.machineId || activeJobCard.machine || 'CNC-01 Vertical Milling'}</span>
                          </div>
                        </div>

                        <div>
                          <div className={`text-[10px] uppercase font-bold ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Technician / Operator</div>
                          <div className={`mt-1 font-bold flex items-center gap-1.5 ${isDarkMode ? 'text-slate-200' : 'text-slate-900'}`}>
                            <User className="w-3.5 h-3.5 text-indigo-500 dark:text-indigo-400" />
                            <span>{selectedOp.operatorName || 'Sachin G. (Lead Machinist)'}</span>
                          </div>
                          <div className="text-[10px] text-emerald-600 dark:text-emerald-400 mt-0.5 flex items-center gap-1 font-medium">
                            <ShieldCheck className="w-3 h-3" />
                            <span>Skill Certified: {selectedOp.requiredCertification || 'Level-2 Machinist'}</span>
                          </div>
                        </div>

                        <div>
                          <div className={`text-[10px] uppercase font-bold ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>QC Inspection Gate</div>
                          <div className="mt-1 font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                            <CheckCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                            <span>Passed & Signed Off</span>
                          </div>
                          <div className={`text-[10px] mt-0.5 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                            Heat Lot: {activeJobCard.materialIssuedLot || 'HEAT-LOT-VERIFIED'}
                          </div>
                        </div>
                      </div>

                      {/* Remarks & Readings */}
                      <div className={`p-4 rounded-2xl border text-xs ${isDarkMode ? 'bg-slate-900/60 border-slate-800 text-slate-300' : 'bg-white border-slate-200 text-slate-700'}`}>
                        <div className={`text-[10px] font-bold uppercase mb-1 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                          Activity Logs, Parameter Readings & Operator Remarks:
                        </div>
                        <p className={`font-sans ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                          {selectedOp.notes || 'Dimensions verified within 0.02mm tolerance; spindle speed 1200 RPM; coolant checked. All critical parameters inspected OK.'}
                        </p>
                      </div>
                    </div>
                  ) : selectedOp.opStatus === 'IN_PROGRESS' ? (
                    /* SUB-CASE 2: Operation is IN_PROGRESS -> Show Complete Operation Form */
                    <form onSubmit={handleCompleteOpSubmit} className="space-y-4">
                      {/* Active timer banner */}
                      <div className={`p-4 rounded-2xl border flex items-center justify-between ${
                        isDarkMode ? 'bg-purple-950/20 border-purple-500/30 text-purple-300' : 'bg-purple-50 border-purple-200 text-purple-900'
                      }`}>
                        <div className="flex items-center gap-2.5 text-xs font-mono">
                          <Play className="w-4 h-4 text-purple-500 dark:text-purple-400 fill-current animate-pulse" />
                          <span>
                            Operation in progress on <strong className={isDarkMode ? 'text-white' : 'text-purple-950'}>{selectedOp.machineId || opMachineId || 'Bay'}</strong> by <strong className={isDarkMode ? 'text-white' : 'text-purple-950'}>{selectedOp.operatorName || opOperatorName || 'Operator'}</strong>
                          </span>
                        </div>
                        <div className="text-xs font-mono">
                          Started at: <span className="font-bold text-purple-600 dark:text-purple-300">{formatStepDateTime(selectedOp.actualStartTime || new Date().toISOString())}</span>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div>
                          <label className={`block text-[11px] font-bold uppercase mb-1.5 ${isDarkMode ? 'text-slate-400' : 'text-slate-700'}`}>
                            Good Processed Output (NOS) *
                          </label>
                          <input
                            type="number"
                            min="0"
                            required
                            value={opQtyProcessed}
                            onChange={(e) => setOpQtyProcessed(Number(e.target.value))}
                            className={`h-11 w-full rounded-xl border px-3 text-xs font-mono font-bold outline-none transition-ui ${
                              isDarkMode ? 'bg-[#09090B] border-slate-700/80 text-white focus:border-[var(--accent-primary)]' : 'bg-slate-50 border-slate-300 text-slate-900 focus:border-[var(--accent-primary)] shadow-xs'
                            }`}
                          />
                        </div>

                        <div>
                          <label className={`block text-[11px] font-bold uppercase mb-1.5 ${isDarkMode ? 'text-slate-400' : 'text-slate-700'}`}>
                            Rejection / Scrap Qty (NOS)
                          </label>
                          <input
                            type="number"
                            min="0"
                            value={opQtyRejected}
                            onChange={(e) => setOpQtyRejected(Number(e.target.value))}
                            className={`h-11 w-full rounded-xl border px-3 text-xs font-mono font-bold outline-none transition-ui ${
                              isDarkMode ? 'bg-[#09090B] border-slate-700/80 text-rose-400 focus:border-rose-500' : 'bg-slate-50 border-slate-300 text-rose-600 focus:border-rose-500 shadow-xs'
                            }`}
                          />
                        </div>

                        <div>
                          <label className={`block text-[11px] font-bold uppercase mb-1.5 ${isDarkMode ? 'text-slate-400' : 'text-slate-700'}`}>
                            Actual Time Spent (Minutes) *
                          </label>
                          <input
                            type="number"
                            min="1"
                            required
                            value={opActualMinutes}
                            onChange={(e) => setOpActualMinutes(Number(e.target.value))}
                            className={`h-11 w-full rounded-xl border px-3 text-xs font-mono font-bold outline-none transition-ui ${
                              isDarkMode ? 'bg-[#09090B] border-slate-700/80 text-indigo-400 focus:border-[var(--accent-primary)]' : 'bg-slate-50 border-slate-300 text-indigo-700 focus:border-[var(--accent-primary)] shadow-xs'
                            }`}
                          />
                        </div>
                      </div>

                      <div>
                        <label className={`block text-[11px] font-bold uppercase mb-1.5 ${isDarkMode ? 'text-slate-400' : 'text-slate-700'}`}>
                          Activity Logs, Parameter Readings & Operator Remarks
                        </label>
                        <textarea
                          rows={2}
                          value={opNotes}
                          onChange={(e) => setOpNotes(e.target.value)}
                          placeholder="e.g. Dimensions verified within 0.02mm tolerance; spindle speed 1200 RPM; coolant checked."
                          className={`w-full rounded-xl border p-3 text-xs outline-none transition-ui ${
                            isDarkMode ? 'bg-[#09090B] border-slate-700/80 text-white focus:border-[var(--accent-primary)]' : 'bg-slate-50 border-slate-300 text-slate-900 focus:border-[var(--accent-primary)] shadow-xs'
                          }`}
                        />
                      </div>

                      <div className="flex items-center justify-between pt-2">
                        <div className="text-[11px] font-mono text-slate-400">
                          ⚡ Completing this operation records completion timestamp and unlocks the next sequence step.
                        </div>
                        <div className="flex items-center gap-2.5">
                          <button
                            type="button"
                            disabled={isExecutingOp || isCompletingAllSteps}
                            onClick={handleCompleteAllSteps}
                            className="px-5 py-3 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-teal-600 hover:to-emerald-600 text-white font-bold text-xs font-mono cursor-pointer shadow-lg shadow-emerald-500/20 transition-ui hover:scale-[1.02] active:scale-[0.96] disabled:opacity-50 flex items-center gap-2"
                          >
                            <FastForward className={`w-4 h-4 ${isCompletingAllSteps ? 'animate-spin' : ''}`} />
                            <span>{isCompletingAllSteps ? 'Completing All Steps...' : 'Complete All Steps'}</span>
                          </button>
                          <button
                            type="submit"
                            disabled={isExecutingOp || isCompletingAllSteps}
                            className="px-6 py-3 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-teal-600 hover:to-emerald-600 text-white font-bold text-xs font-mono cursor-pointer shadow-lg shadow-emerald-500/20 transition-ui hover:scale-[1.02] active:scale-[0.96] disabled:opacity-50 flex items-center gap-2"
                          >
                            <CheckCircle2 className="w-4 h-4" />
                            <span>{isExecutingOp ? 'Recording...' : 'RECORD COMPLETION & ADVANCE'}</span>
                          </button>
                        </div>
                      </div>
                    </form>
                  ) : currentExecutableOp?.sequenceNo === selectedOp.sequenceNo ? (
                    /* SUB-CASE 3: Operation is PENDING & is Next Step to Start */
                    <form onSubmit={handleStartOpSubmit} className="space-y-4">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-[11px] font-mono uppercase font-bold text-slate-400 mb-1.5">
                            Assigned Machine / Work Center (Machine Master) *
                          </label>
                          <select
                            required
                            value={opMachineId}
                            onChange={(e) => setOpMachineId(e.target.value)}
                            className={`w-full rounded-2xl border px-4 py-3 text-xs font-mono outline-none cursor-pointer transition-ui ${
                              isDarkMode ? 'bg-slate-900 border-slate-800 text-white focus:border-[#5B75F8]' : 'bg-white border-slate-200 text-slate-900 focus:border-[#5B75F8]'
                            }`}
                          >
                            {availableMachines.length === 0 ? (
                              <>
                                <option value="" disabled>No machines in Machine Master</option>
                                {opMachineId && <option value={opMachineId}>{opMachineId}</option>}
                              </>
                            ) : (
                              <>
                                <option value="">-- Select Machine from Master --</option>
                                {availableMachines.map((m) => (
                                  <option key={m.code} value={m.name || m.code}>
                                    {m.code} — {m.name} ({m.type || m.department || 'Machining'})
                                  </option>
                                ))}
                                {opMachineId && !availableMachines.some(m => (m.name || m.code) === opMachineId || m.code === opMachineId) && (
                                  <option value={opMachineId}>{opMachineId}</option>
                                )}
                              </>
                            )}
                          </select>
                        </div>

                        <div>
                          <label className="block text-[11px] font-mono uppercase font-bold text-slate-400 mb-1.5">
                            Technician / Machine Operator Name *
                          </label>
                          <input
                            type="text"
                            required
                            value={opOperatorName}
                            onChange={(e) => setOpOperatorName(e.target.value)}
                            placeholder="e.g. Sachin Gharbude"
                            className={`w-full rounded-2xl border px-4 py-3 text-xs outline-none transition-ui ${
                              isDarkMode ? 'bg-slate-900 border-slate-800 text-white focus:border-[#5B75F8]' : 'bg-white border-slate-200 text-slate-900 focus:border-[#5B75F8]'
                            }`}
                          />
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-2">
                        <div className="text-[11px] font-mono text-slate-400 flex items-center gap-1.5">
                          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                          <span>Starting this step timestamps process commencement and locks operator credentials.</span>
                        </div>
                        <div className="flex items-center gap-2.5">
                          <button
                            type="button"
                            disabled={isExecutingOp || isCompletingAllSteps}
                            onClick={handleCompleteAllSteps}
                            className="px-5 py-3 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-teal-600 hover:to-emerald-600 text-white font-bold text-xs font-mono cursor-pointer shadow-lg shadow-emerald-500/20 transition-ui hover:scale-[1.02] active:scale-[0.96] disabled:opacity-50 flex items-center gap-2"
                          >
                            <FastForward className={`w-4 h-4 ${isCompletingAllSteps ? 'animate-spin' : ''}`} />
                            <span>{isCompletingAllSteps ? 'Completing All Steps...' : 'Complete All Steps'}</span>
                          </button>
                          <button
                            type="submit"
                            disabled={isExecutingOp || isCompletingAllSteps}
                            className="px-6 py-3 rounded-2xl bg-gradient-to-r from-[#5B75F8] to-indigo-600 hover:from-indigo-600 hover:to-[#5B75F8] text-white font-bold text-xs font-mono cursor-pointer shadow-lg shadow-[#5B75F8]/25 transition-ui hover:scale-[1.02] active:scale-[0.96] disabled:opacity-50 flex items-center gap-2"
                          >
                            <Play className="w-4 h-4 fill-current" />
                            <span>{isExecutingOp ? 'Starting...' : 'START OPERATION (RECORD START TIME)'}</span>
                          </button>
                        </div>
                      </div>
                    </form>
                  ) : (
                    /* SUB-CASE 4: Operation is Locked Pending Earlier Steps */
                    <div className={`p-6 rounded-2xl border text-center ${
                      isDarkMode ? 'bg-slate-900/50 border-slate-800/80 text-slate-400' : 'bg-slate-100 border-slate-200 text-slate-600'
                    }`}>
                      <Lock className="w-6 h-6 mx-auto mb-2 text-slate-500" />
                      <h5 className="font-bold text-xs font-mono uppercase tracking-wider">
                        Operation Sequence Locked
                      </h5>
                      <p className="text-xs mt-1 font-sans">
                        Please complete previous routing steps first. The current active step is <span className="font-bold text-indigo-400">Op {currentExecutableOp?.sequenceNo}: {currentExecutableOp?.operationName}</span>.
                      </p>
                      <div className="mt-3 flex items-center justify-center gap-2">
                        {currentExecutableOp && (
                          <button
                            type="button"
                            onClick={() => setSelectedOpSequence(currentExecutableOp.sequenceNo)}
                            className="px-4 py-1.5 rounded-xl bg-[#5B75F8]/10 text-[#7B92FF] border border-[#5B75F8]/30 font-mono text-xs font-bold hover:bg-[#5B75F8]/20 cursor-pointer"
                          >
                            Switch to Op {currentExecutableOp.sequenceNo}
                          </button>
                        )}
                        <button
                          type="button"
                          disabled={isExecutingOp || isCompletingAllSteps}
                          onClick={handleCompleteAllSteps}
                          className="px-4 py-1.5 rounded-xl bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 font-mono text-xs font-bold hover:bg-emerald-500/25 cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                        >
                          <FastForward className={`w-3.5 h-3.5 ${isCompletingAllSteps ? 'animate-spin' : ''}`} />
                          <span>{isCompletingAllSteps ? 'Completing All...' : 'Complete All Steps'}</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* COMPREHENSIVE ROUTING EXECUTION AUDIT DATA SHEET */}
              <div className={`p-6 rounded-3xl border ${
                isDarkMode ? 'bg-slate-950/40 border-slate-800' : 'bg-slate-50/70 border-slate-200'
              }`}>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <History className="w-4 h-4 text-emerald-400" />
                    <h5 className="text-xs font-mono uppercase font-bold tracking-wider text-slate-300">
                      Operational Routing Execution History & Process Log
                    </h5>
                  </div>
                  <span className="text-[11px] font-mono text-slate-400">
                    Job Card Traveler Audit Trail
                  </span>
                </div>

                <div className={`rounded-2xl border overflow-hidden ${
                  isDarkMode ? 'border-slate-800 bg-slate-900/80' : 'border-slate-200 bg-white'
                }`}>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse font-mono">
                      <thead>
                        <tr className={`border-b font-bold uppercase tracking-wider text-[10px] ${
                          isDarkMode ? 'bg-slate-950/70 border-slate-800 text-slate-400' : 'bg-slate-100 border-slate-200 text-slate-500'
                        }`}>
                          <th className="py-3 px-3.5 text-center">Step</th>
                          <th className="py-3 px-3.5">Operation</th>
                          <th className="py-3 px-3.5">Machine / Bay</th>
                          <th className="py-3 px-3.5">Started At</th>
                          <th className="py-3 px-3.5">Completed At</th>
                          <th className="py-3 px-3.5 text-center">Duration</th>
                          <th className="py-3 px-3.5 text-center">Yield</th>
                          <th className="py-3 px-3.5">Operator</th>
                          <th className="py-3 px-3.5 text-center">Status</th>
                        </tr>
                      </thead>
                      <tbody className={`divide-y ${isDarkMode ? 'divide-slate-800/60' : 'divide-slate-200'}`}>
                        {effectiveOperations.map((op: any, idx: number) => {
                          const isDone = op.opStatus === 'COMPLETED';
                          const isRunning = op.opStatus === 'IN_PROGRESS';
                          const startTime = getDerivedStepStart(op, idx, effectiveOperations.length);
                          const endTime = getDerivedStepEnd(op, idx, effectiveOperations.length);

                          return (
                            <tr 
                              key={op.sequenceNo} 
                              onClick={() => setSelectedOpSequence(op.sequenceNo)}
                              className={`cursor-pointer transition-colors ${
                                selectedOp?.sequenceNo === op.sequenceNo
                                  ? isDarkMode ? 'bg-[#5B75F8]/10' : 'bg-indigo-50/80'
                                  : isDarkMode ? 'hover:bg-slate-800/40' : 'hover:bg-slate-50'
                              }`}
                            >
                              <td className="py-3 px-3.5 text-center font-bold text-slate-400">
                                Op {op.sequenceNo}
                              </td>
                              <td className="py-3 px-3.5 font-bold text-slate-200">
                                <span className={isDone ? 'text-emerald-400' : isRunning ? 'text-purple-300' : ''}>
                                  {op.operationName}
                                </span>
                              </td>
                              <td className="py-3 px-3.5 text-slate-400 text-[11px]">
                                {op.machineId || 'Machining Bay'}
                              </td>
                              <td className="py-3 px-3.5 text-[11px] text-slate-300">
                                {isDone || isRunning ? (
                                  <span className="flex items-center gap-1">
                                    <Clock className="w-3 h-3 text-indigo-400 shrink-0" />
                                    <span>{formatStepDateTime(startTime) || '09:30 AM'}</span>
                                  </span>
                                ) : (
                                  <span className="text-slate-600">Pending Start</span>
                                )}
                              </td>
                              <td className="py-3 px-3.5 text-[11px]">
                                {isDone ? (
                                  <span className="flex items-center gap-1 font-bold text-emerald-400">
                                    <CheckCircle2 className="w-3 h-3 shrink-0" />
                                    <span>{formatStepDateTime(endTime) || '09:48 AM'}</span>
                                  </span>
                                ) : isRunning ? (
                                  <span className="text-purple-400 font-bold animate-pulse">Running In Progress...</span>
                                ) : (
                                  <span className="text-slate-600">--</span>
                                )}
                              </td>
                              <td className="py-3 px-3.5 text-center font-bold text-[11px]">
                                {isDone ? (
                                  <span className="text-indigo-400">{op.actualTimeMinutes || op.standardTimeMinutes || 15}m</span>
                                ) : (
                                  <span className="text-slate-500">{op.standardTimeMinutes || 15}m std</span>
                                )}
                              </td>
                              <td className="py-3 px-3.5 text-center font-bold text-[11px]">
                                {isDone ? (
                                  <span className="text-emerald-400">{op.qtyProcessed || activeJobCard.targetQty || 1} OK</span>
                                ) : (
                                  <span className="text-slate-600">--</span>
                                )}
                              </td>
                              <td className="py-3 px-3.5 text-slate-300 text-[11px]">
                                {op.operatorName || (isDone ? 'Lead Machinist' : '--')}
                              </td>
                              <td className="py-3 px-3.5 text-center">
                                {isDone ? (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                                    <Check className="w-2.5 h-2.5" /> VERIFIED
                                  </span>
                                ) : isRunning ? (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold bg-purple-500/15 text-purple-300 border border-purple-500/30 animate-pulse">
                                    <Play className="w-2.5 h-2.5 fill-current" /> RUNNING
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold bg-slate-800 text-slate-500 border border-slate-700">
                                    PENDING
                                  </span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between px-7 py-4 border-t border-slate-200 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-950/40">
              <div className="flex items-center gap-2 text-xs font-mono text-slate-400">
                <Activity className="w-4 h-4 text-emerald-400" />
                <span>Real-Time Audit Trail & Order Progression Synced</span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setSelectedJobForTraveler(null);
                  travelerModal.close();
                }}
                className={`px-5 py-2 rounded-2xl border text-xs font-mono font-bold cursor-pointer transition-ui ${
                  isDarkMode 
                    ? 'border-slate-800 bg-slate-900 text-slate-300 hover:bg-slate-800' 
                    : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-100'
                }`}
              >
                Close Traveler
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 10: FULL JOB CARD DETAIL VIEW (DRILL-DOWN SOURCE OF TRUTH) */}
      {/* ========================================================================= */}
      <JobCardDetailModal
        isOpen={jobDetailModal.isOpen && Boolean(selectedJobForDetail)}
        onClose={() => {
          setSelectedJobForDetail(null);
          jobDetailModal.close();
        }}
        jobCard={jobCards.find(j => j.jobNo === selectedJobForDetail?.jobNo || j.id === selectedJobForDetail?.id) || selectedJobForDetail}
        orders={orders}
        boms={boms}
        routeCards={routeCards}
        stock={stock}
        masters={masters}
        productionLogs={productionLogs}
        companyProfile={companyProfile}
        isDarkMode={isDarkMode}
        onLogProduction={onLogProduction}
        onStartOperation={onStartOperation}
        onCompleteOperation={onCompleteOperation}
        onNavigate={onNavigate}
        onSelectOrder={onSelectOrder}
      />

      {/* ========================================================================= */}
      {/* MODAL 11: MACHINE BREAKDOWN & DOWNTIME ALERT REPORTING */}
      {/* ========================================================================= */}
      <Modal
        isOpen={breakdownModal.isOpen}
        onClose={() => breakdownModal.close()}
        title="Report Machine Downtime / Breakdown"
        isDarkMode={isDarkMode}
      >
        <form onSubmit={handleReportBreakdown} className="space-y-4">
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>Reporting a machine breakdown triggers an immediate CRITICAL alert to the supervisory cell.</span>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                Select Work Center / Machine (Machine Master) *
              </label>
              <span className="text-[10px] text-slate-500 font-mono">
                {availableMachines.length} Machine{availableMachines.length === 1 ? '' : 's'} in Master
              </span>
            </div>
            <select
              required
              value={breakdownMachine}
              onChange={(e) => setBreakdownMachine(e.target.value)}
              className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-semibold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-rose-500"
            >
              {availableMachines.length === 0 ? (
                <option value="" disabled>No machines found in Machine Master</option>
              ) : (
                availableMachines.map((m) => (
                  <option key={m.code} value={m.name || m.code}>
                    {m.code} — {m.name} ({m.type || m.department || 'Machine Shop'}) [{m.status || 'Active'}]
                  </option>
                ))
              )}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Primary Breakdown Reason *
            </label>
            <select
              value={breakdownReason}
              onChange={(e) => setBreakdownReason(e.target.value)}
              className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-semibold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-rose-500"
            >
              <option value="Spindle Overheat & Axis Servo Error">Spindle Overheat & Axis Servo Error</option>
              <option value="Hydraulic Chuck Clamping Failure">Hydraulic Chuck Clamping Failure</option>
              <option value="Coolant Pump Jam & Line Blockage">Coolant Pump Jam & Line Blockage</option>
              <option value="Tool Turret Indexing Jam">Tool Turret Indexing Jam</option>
              <option value="CNC Controller Software Lock / Crash">CNC Controller Software Lock / Crash</option>
              <option value="Scheduled Emergency Maintenance">Scheduled Emergency Maintenance</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Reporting Operator / Lead
            </label>
            <input
              type="text"
              value={breakdownOperator}
              onChange={(e) => setBreakdownOperator(e.target.value)}
              className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white outline-none"
              placeholder="e.g. Sachin G."
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Additional Observations & Notes
            </label>
            <textarea
              rows={3}
              value={breakdownNotes}
              onChange={(e) => setBreakdownNotes(e.target.value)}
              placeholder="Describe alarm codes, noises, or physical damage observed..."
              className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white outline-none"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={() => breakdownModal.close()}
              className="px-4 py-2 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmittingBreakdown}
              className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-md flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>{isSubmittingBreakdown ? 'Broadcasting...' : 'Broadcast Breakdown Alert'}</span>
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default ProductionView;
