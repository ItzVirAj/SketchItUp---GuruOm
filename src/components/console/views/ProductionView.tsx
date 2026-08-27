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
  CheckCheck
} from 'lucide-react';
import { 
  JobCard, 
  ProductionLogReport, 
  QCInspection, 
  CustomerOrder,
  BillOfMaterials,
  RouteCard,
  RouteCardTemplateStep,
  StockItem,
  MasterItem
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

export const DEFAULT_ROUTE_CARDS: RouteCard[] = [
  {
    id: 'rc-00000001',
    routeCode: 'RC-00000001',
    partCode: '00000001',
    partDescription: 'MAIN SPINDLE HOUSING 120MM',
    revision: 'REV-A',
    status: 'ACTIVE',
    totalStandardTimeMinutes: 140,
    notes: 'Multi-stage CNC turning, boring, induction hardening & precision grinding route',
    operations: [
      { id: 'op-001-10', partCode: '00000001', partDescription: 'MAIN SPINDLE HOUSING 120MM', sequenceNo: 10, operationName: 'Raw Material Saw Cutting', workCenter: 'BANDSAW-01', standardTimeMinutes: 10, inspectionRequired: false, requiredCertification: 'Operator Lv1' },
      { id: 'op-001-20', partCode: '00000001', partDescription: 'MAIN SPINDLE HOUSING 120MM', sequenceNo: 20, operationName: 'CNC Rough Turning & Facing', workCenter: 'CNC-LATHE-01', standardTimeMinutes: 25, inspectionRequired: false, requiredCertification: 'CNC Certified' },
      { id: 'op-001-30', partCode: '00000001', partDescription: 'MAIN SPINDLE HOUSING 120MM', sequenceNo: 30, operationName: 'VMC Boring & Keyway Milling', workCenter: 'VMC-01', standardTimeMinutes: 35, inspectionRequired: false, requiredCertification: 'VMC Machinist' },
      { id: 'op-001-40', partCode: '00000001', partDescription: 'MAIN SPINDLE HOUSING 120MM', sequenceNo: 40, operationName: 'Induction Hardening & Case Depth Check', workCenter: 'HT-FURNACE-01', standardTimeMinutes: 30, inspectionRequired: true, requiredCertification: 'Heat Treatment Tech' },
      { id: 'op-001-50', partCode: '00000001', partDescription: 'MAIN SPINDLE HOUSING 120MM', sequenceNo: 50, operationName: 'Precision Cylindrical OD Grinding', workCenter: 'GRIND-01', standardTimeMinutes: 20, inspectionRequired: true, requiredCertification: 'Grinding Specialist' },
      { id: 'op-001-60', partCode: '00000001', partDescription: 'MAIN SPINDLE HOUSING 120MM', sequenceNo: 60, operationName: 'Final Dimensional & Runout Inspection', workCenter: 'QC-LAB', standardTimeMinutes: 15, inspectionRequired: true, requiredCertification: 'QC Inspector Lv2' },
      { id: 'op-001-70', partCode: '00000001', partDescription: 'MAIN SPINDLE HOUSING 120MM', sequenceNo: 70, operationName: 'Ultrasonic Cleaning & Protective Packing', workCenter: 'PACK-01', standardTimeMinutes: 5, inspectionRequired: false, requiredCertification: 'Packing Clerk' }
    ]
  },
  {
    id: 'rc-00000002',
    routeCode: 'RC-00000002',
    partCode: '00000002',
    partDescription: 'Boom Bracket Sub-assembly',
    revision: 'REV-A',
    status: 'ACTIVE',
    totalStandardTimeMinutes: 95,
    notes: 'Structural fabrication, welding, coordinate milling and CMM verification',
    operations: [
      { id: 'op-002-10', partCode: '00000002', partDescription: 'Boom Bracket Sub-assembly', sequenceNo: 10, operationName: 'Profile Saw & Plate Cutting', workCenter: 'CUT-01', standardTimeMinutes: 12, inspectionRequired: false, requiredCertification: 'Operator Lv1' },
      { id: 'op-002-20', partCode: '00000002', partDescription: 'Boom Bracket Sub-assembly', sequenceNo: 20, operationName: 'MIG/TIG Structural Welding', workCenter: 'WELD-01', standardTimeMinutes: 25, inspectionRequired: false, requiredCertification: 'Certified Welder' },
      { id: 'op-002-30', partCode: '00000002', partDescription: 'Boom Bracket Sub-assembly', sequenceNo: 30, operationName: 'CNC Coordinate Milling', workCenter: 'VMC-01', standardTimeMinutes: 40, inspectionRequired: true, requiredCertification: 'VMC Machinist' },
      { id: 'op-002-40', partCode: '00000002', partDescription: 'Boom Bracket Sub-assembly', sequenceNo: 40, operationName: 'CMM Dimensional Inspection', workCenter: 'CMM-01', standardTimeMinutes: 10, inspectionRequired: true, requiredCertification: 'Quality Inspector' },
      { id: 'op-002-50', partCode: '00000002', partDescription: 'Boom Bracket Sub-assembly', sequenceNo: 50, operationName: 'Surface Powder Coating & Packing', workCenter: 'PACK-01', standardTimeMinutes: 8, inspectionRequired: false, requiredCertification: 'None' }
    ]
  },
  {
    id: 'rc-00000003',
    routeCode: 'RC-00000003',
    partCode: '00000003',
    partDescription: 'Control Panel Assembly',
    revision: 'REV-B',
    status: 'ACTIVE',
    totalStandardTimeMinutes: 90,
    notes: 'Electrical enclosure laser cutting, bending, assembly and dielectric testing',
    operations: [
      { id: 'op-003-10', partCode: '00000003', partDescription: 'Control Panel Assembly', sequenceNo: 10, operationName: 'Sheet Metal Laser Cutting', workCenter: 'CUT-01', standardTimeMinutes: 15, inspectionRequired: false, requiredCertification: 'Laser Op' },
      { id: 'op-003-20', partCode: '00000003', partDescription: 'Control Panel Assembly', sequenceNo: 20, operationName: 'CNC Turret Punching & Bending', workCenter: 'BEND-01', standardTimeMinutes: 20, inspectionRequired: false, requiredCertification: 'Bending Op' },
      { id: 'op-003-30', partCode: '00000003', partDescription: 'Control Panel Assembly', sequenceNo: 30, operationName: 'Electrical Busbar & Component Mounting', workCenter: 'ELEC-01', standardTimeMinutes: 30, inspectionRequired: false, requiredCertification: 'Electrician Lv2' },
      { id: 'op-003-40', partCode: '00000003', partDescription: 'Control Panel Assembly', sequenceNo: 40, operationName: 'High-Voltage Insulation & Continuity Testing', workCenter: 'TEST-BAY', standardTimeMinutes: 15, inspectionRequired: true, requiredCertification: 'QC Electrical' },
      { id: 'op-003-50', partCode: '00000003', partDescription: 'Control Panel Assembly', sequenceNo: 50, operationName: 'Protective Packaging & Labeling', workCenter: 'PACK-01', standardTimeMinutes: 10, inspectionRequired: false, requiredCertification: 'None' }
    ]
  },
  {
    id: 'rc-00000004',
    routeCode: 'RC-00000004',
    partCode: '00000004',
    partDescription: 'Hydraulic Cylinder Mount',
    revision: 'REV-A',
    status: 'ACTIVE',
    totalStandardTimeMinutes: 90,
    notes: 'Heavy bore roughing, 4-axis milling and magnetic particle testing',
    operations: [
      { id: 'op-004-10', partCode: '00000004', partDescription: 'Hydraulic Cylinder Mount', sequenceNo: 10, operationName: 'Round Billet Saw Cutting', workCenter: 'BANDSAW-01', standardTimeMinutes: 10, inspectionRequired: false, requiredCertification: 'Operator Lv1' },
      { id: 'op-004-20', partCode: '00000004', partDescription: 'Hydraulic Cylinder Mount', sequenceNo: 20, operationName: 'Heavy Turning & Bore Roughing', workCenter: 'CNC-LATHE-02', standardTimeMinutes: 30, inspectionRequired: false, requiredCertification: 'CNC Certified' },
      { id: 'op-004-30', partCode: '00000004', partDescription: 'Hydraulic Cylinder Mount', sequenceNo: 30, operationName: '4-Axis Milling & Pin Hole Reaming', workCenter: 'VMC-02', standardTimeMinutes: 25, inspectionRequired: false, requiredCertification: 'VMC Machinist' },
      { id: 'op-004-40', partCode: '00000004', partDescription: 'Hydraulic Cylinder Mount', sequenceNo: 40, operationName: 'Magnetic Particle Non-Destructive Testing', workCenter: 'NDT-01', standardTimeMinutes: 15, inspectionRequired: true, requiredCertification: 'NDT Level II' },
      { id: 'op-004-50', partCode: '00000004', partDescription: 'Hydraulic Cylinder Mount', sequenceNo: 50, operationName: 'Anti-Corrosion Phosphate Coating', workCenter: 'COAT-01', standardTimeMinutes: 10, inspectionRequired: false, requiredCertification: 'None' }
    ]
  },
  {
    id: 'rc-00000005',
    routeCode: 'RC-00000005',
    partCode: '00000005',
    partDescription: 'Precision Machined Flange 100mm',
    revision: 'REV-A',
    status: 'ACTIVE',
    totalStandardTimeMinutes: 58,
    notes: 'Facing, turning, PCD hole pattern drilling and flatness inspection',
    operations: [
      { id: 'op-005-10', partCode: '00000005', partDescription: 'Precision Machined Flange 100mm', sequenceNo: 10, operationName: 'Billet Saw Cutting', workCenter: 'BANDSAW-01', standardTimeMinutes: 8, inspectionRequired: false, requiredCertification: 'Operator Lv1' },
      { id: 'op-005-20', partCode: '00000005', partDescription: 'Precision Machined Flange 100mm', sequenceNo: 20, operationName: 'CNC Facing, Turning & Grooving', workCenter: 'CNC-LATHE-01', standardTimeMinutes: 20, inspectionRequired: false, requiredCertification: 'CNC Certified' },
      { id: 'op-005-30', partCode: '00000005', partDescription: 'Precision Machined Flange 100mm', sequenceNo: 30, operationName: 'PCD Hole Pattern Drilling & Tapping', workCenter: 'RADIAL-DRILL-01', standardTimeMinutes: 15, inspectionRequired: false, requiredCertification: 'Machinist' },
      { id: 'op-005-40', partCode: '00000005', partDescription: 'Precision Machined Flange 100mm', sequenceNo: 40, operationName: 'Surface Flatness & Dimensional QC', workCenter: 'QC-LAB', standardTimeMinutes: 10, inspectionRequired: true, requiredCertification: 'QC Inspector' },
      { id: 'op-005-50', partCode: '00000005', partDescription: 'Precision Machined Flange 100mm', sequenceNo: 50, operationName: 'Rust Preventive Dipping & Wrapping', workCenter: 'PACK-01', standardTimeMinutes: 5, inspectionRequired: false, requiredCertification: 'None' }
    ]
  },
  {
    id: 'rc-00000006',
    routeCode: 'RC-00000006',
    partCode: '00000006',
    partDescription: 'Pinion Gear Shaft EN24',
    revision: 'REV-A',
    status: 'ACTIVE',
    totalStandardTimeMinutes: 150,
    notes: 'Gear tooth hobbing, vacuum carburizing and spline precision grinding',
    operations: [
      { id: 'op-006-10', partCode: '00000006', partDescription: 'Pinion Gear Shaft EN24', sequenceNo: 10, operationName: 'Bar Stock Sawing', workCenter: 'BANDSAW-01', standardTimeMinutes: 10, inspectionRequired: false, requiredCertification: 'Operator Lv1' },
      { id: 'op-006-20', partCode: '00000006', partDescription: 'Pinion Gear Shaft EN24', sequenceNo: 20, operationName: 'CNC Step Turning & Centering', workCenter: 'CNC-LATHE-01', standardTimeMinutes: 25, inspectionRequired: false, requiredCertification: 'CNC Certified' },
      { id: 'op-006-30', partCode: '00000006', partDescription: 'Pinion Gear Shaft EN24', sequenceNo: 30, operationName: 'Gear Hobbing & Tooth Generation', workCenter: 'HOBBING-01', standardTimeMinutes: 35, inspectionRequired: false, requiredCertification: 'Gear Specialist' },
      { id: 'op-006-40', partCode: '00000006', partDescription: 'Pinion Gear Shaft EN24', sequenceNo: 40, operationName: 'Vacuum Carburizing & Quenching', workCenter: 'HT-FURNACE-01', standardTimeMinutes: 45, inspectionRequired: true, requiredCertification: 'Heat Treatment Tech' },
      { id: 'op-006-50', partCode: '00000006', partDescription: 'Pinion Gear Shaft EN24', sequenceNo: 50, operationName: 'Spline & Journal Precision Grinding', workCenter: 'GRIND-01', standardTimeMinutes: 20, inspectionRequired: true, requiredCertification: 'Grinding Specialist' },
      { id: 'op-006-60', partCode: '00000006', partDescription: 'Pinion Gear Shaft EN24', sequenceNo: 60, operationName: 'Gear Profile & Lead Pitch Inspection', workCenter: 'QC-LAB', standardTimeMinutes: 15, inspectionRequired: true, requiredCertification: 'QC Inspector Lv2' }
    ]
  }
];

export type ProductionSection = 'job-cards' | 'route-cards' | 'bom' | 'matrix';

interface ProductionViewProps {
  jobCards: JobCard[];
  orders?: CustomerOrder[];
  productionLogs?: ProductionLogReport[];
  qcItems?: QCInspection[];
  stock?: StockItem[];
  masters?: MasterItem[];
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
  // Top-level Navigation Sections
  const [activeSection, setActiveSection] = useState<ProductionSection>(initialSection);
  
  useEffect(() => {
    if (initialSection) {
      setActiveSection(initialSection);
    }
  }, [initialSection]);

  // View mode for Job Cards (list / board)
  const [viewMode, setViewMode] = useState<'list' | 'board'>('list');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  // Job Cards Modal States
  const [showNewJobModal, setShowNewJobModal] = useState(false);
  const [selectedJobForLog, setSelectedJobForLog] = useState<JobCard | null>(null);
  const [selectedJobForTraveler, setSelectedJobForTraveler] = useState<JobCard | null>(null);
  const [selectedOpSequence, setSelectedOpSequence] = useState<number | null>(null);

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
  const [routeCards, setRouteCards] = useState<RouteCard[]>(DEFAULT_ROUTE_CARDS);
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
      
      // Merge fetched route cards with default route cards
      if (routeData && routeData.length > 0) {
        const fetchedPartCodes = new Set(routeData.map(r => r.partCode?.toLowerCase().trim()));
        const nonDuplicateDefaults = DEFAULT_ROUTE_CARDS.filter(
          def => !fetchedPartCodes.has(def.partCode?.toLowerCase().trim())
        );
        setRouteCards([...routeData, ...nonDuplicateDefaults]);
      } else {
        setRouteCards(DEFAULT_ROUTE_CARDS);
      }
    } catch (err: any) {
      console.warn('Error loading manufacturing data:', err);
      setRouteCards(DEFAULT_ROUTE_CARDS);
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

  // ----------------------------------------------------------------
  // New Job Form State (Integrated with BOM + Route Card)
  // ----------------------------------------------------------------
  const [newOrderPo, setNewOrderPo] = useState('');
  const [newPartCode, setNewPartCode] = useState('00000001');
  const [newPartDesc, setNewPartDesc] = useState('MAIN SPINDLE HOUSING 120MM');
  const [newDrawingRev, setNewDrawingRev] = useState('REV-A');
  const [newHeatLot, setNewHeatLot] = useState(''); // Optional!
  const [newQty, setNewQty] = useState(100);
  const [newMachine, setNewMachine] = useState('VMC-01 (Vertical Milling)');
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
    } else {
      setNewOrderPo('');
      setNewPartCode('00000001');
      setNewPartDesc('Precision Machined Component');
      setNewHeatLot('');
    }
    setShowNewJobModal(true);
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
    setShowNewJobModal(true);
    onJobCardModalOpened?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preselectedOrderPo]);

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
      setShowNewJobModal(false);
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

    // Fallback to the first available Route Card
    const defaultRoute = routeCards[0] || DEFAULT_ROUTE_CARDS[0];
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
  const [isCreateBomOpen, setIsCreateBomOpen] = useState(false);
  const [editingBom, setEditingBom] = useState<BillOfMaterials | null>(null);
  const [duplicatingBom, setDuplicatingBom] = useState<BillOfMaterials | null>(null);
  const [revisionBom, setRevisionBom] = useState<BillOfMaterials | null>(null);
  const [deleteConfirmBom, setDeleteConfirmBom] = useState<BillOfMaterials | null>(null);

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

  const handleOpenCreateBom = () => {
    setEditingBom(null);
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
    setIsCreateBomOpen(true);
  };

  const handleOpenEditBom = (bom: BillOfMaterials) => {
    setEditingBom(bom);
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
    setIsCreateBomOpen(true);
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
      // Auto-fill component name from masters if componentCode matches
      if (field === 'componentCode') {
        const found = masters.find(m => m.code.toLowerCase() === String(value).toLowerCase());
        if (found) {
          copy[index].componentName = found.name;
          if (found.uom) copy[index].unit = found.uom;
          if (found.rate) copy[index].unitCost = found.rate;
        }
      }
      return copy;
    });
  };

  const handleSaveBOMSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const form = e.target as any;
    const bomPayload: BillOfMaterials = {
      bomCode: form.bomCode.value,
      parentPartCode: form.parentCode.value,
      parentPartName: form.parentName.value,
      revision: form.revision.value || 'v1.0',
      yieldPercentage: Number(form.yield.value || 98.5),
      batchSize: Number(form.batchSize.value || 100),
      status: (form.status?.value as any) || 'ACTIVE',
      notes: form.notes.value || '',
      components: bomFormComponents.filter(c => c.componentCode.trim().length > 0)
    };

    try {
      await saveBOM(bomPayload);
      setIsCreateBomOpen(false);
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
      setDeleteConfirmBom(null);
      setActionSuccess(`BOM ${deleteConfirmBom.bomCode} deleted.`);
      await loadManufacturingData();
    } catch (err: any) {
      setActionError(err.message || 'Failed to delete BOM.');
    }
  };

  // ----------------------------------------------------------------
  // ROUTE CARD MODAL STATES & HANDLERS
  // ----------------------------------------------------------------
  const [isCreateRouteOpen, setIsCreateRouteOpen] = useState(false);
  const [editingRoute, setEditingRoute] = useState<RouteCard | null>(null);
  const [duplicatingRoute, setDuplicatingRoute] = useState<RouteCard | null>(null);
  const [deleteConfirmRoute, setDeleteConfirmRoute] = useState<RouteCard | null>(null);

  // Standard Presets for Quick Route Card construction
  const standardRoutePreset: Array<{
    sequenceNo: number;
    operationName: string;
    workCenter: string;
    standardTimeMinutes: number;
    inspectionRequired: boolean;
    requiredCertification: string;
  }> = [
    { sequenceNo: 10, operationName: 'Raw Material Saw Cutting', workCenter: 'BANDSAW-01', standardTimeMinutes: 5, inspectionRequired: false, requiredCertification: 'Operator Lv1' },
    { sequenceNo: 20, operationName: 'CNC Turning (OD/Facing)', workCenter: 'CNC-LATHE-01', standardTimeMinutes: 12, inspectionRequired: false, requiredCertification: 'CNC Certified' },
    { sequenceNo: 30, operationName: 'VMC Drilling & Tapping', workCenter: 'VMC-02', standardTimeMinutes: 15, inspectionRequired: false, requiredCertification: 'VMC Machinist' },
    { sequenceNo: 40, operationName: 'Heat Treatment (Hardening)', workCenter: 'HT-FURNACE-01', standardTimeMinutes: 30, inspectionRequired: true, requiredCertification: 'Heat Treatment Tech' },
    { sequenceNo: 50, operationName: 'Cylindrical Precision Grinding', workCenter: 'GRIND-01', standardTimeMinutes: 10, inspectionRequired: true, requiredCertification: 'Grinding Specialist' },
    { sequenceNo: 60, operationName: 'Final Quality Inspection (QC)', workCenter: 'QC-LAB', standardTimeMinutes: 8, inspectionRequired: true, requiredCertification: 'QC Inspector Lv2' },
    { sequenceNo: 70, operationName: 'Ultrasonic Cleaning & Protective Packing', workCenter: 'PACK-01', standardTimeMinutes: 5, inspectionRequired: false, requiredCertification: 'Packing Clerk' }
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
    setIsCreateRouteOpen(true);
  };

  const handleOpenEditRoute = (route: RouteCard) => {
    setEditingRoute(route);
    setRouteFormSteps(
      route.operations?.length > 0
        ? route.operations.map(op => ({
            id: op.id,
            sequenceNo: op.sequenceNo,
            operationName: op.operationName,
            workCenter: op.workCenter,
            standardTimeMinutes: op.standardTimeMinutes || 10,
            inspectionRequired: !!op.inspectionRequired,
            requiredCertification: op.requiredCertification || 'None'
          }))
        : standardRoutePreset
    );
    setIsCreateRouteOpen(true);
  };

  const handleAddRouteStepRow = () => {
    setRouteFormSteps(prev => {
      const lastSeq = prev.length > 0 ? Math.max(...prev.map(s => s.sequenceNo)) : 0;
      return [
        ...prev,
        {
          sequenceNo: lastSeq + 10,
          operationName: 'Precision Machining',
          workCenter: 'VMC-01',
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
      setIsCreateRouteOpen(false);
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
      setActionSuccess(`Route Card for ${deleteConfirmRoute.partCode} deleted.`);
      await loadManufacturingData();
    } catch (err: any) {
      setActionError(err.message || 'Failed to delete Route Card.');
    }
  };

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
    <div className="space-y-6 font-sans">
      
      {/* Top Banner Header */}
      <div className={`p-6 rounded-3xl border transition-all ${
        isDarkMode 
          ? 'bg-slate-900/80 border-slate-800/80 text-white backdrop-blur-xl shadow-2xl' 
          : 'bg-white border-slate-200 shadow-sm text-slate-900'
      }`}>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider ${
                isDarkMode ? 'bg-[#5B75F8]/20 text-[#7B92FF] border border-[#5B75F8]/30' : 'bg-[#5B75F8]/10 text-[#5B75F8] border border-[#5B75F8]/20'
              }`}>
                Manufacturing Control System
              </span>
              <span className="text-xs text-slate-400 font-mono">• BOM, Route Cards & Shopfloor Execution</span>
            </div>
            <h1 className={`text-2xl font-bold tracking-tight ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
              Production & Manufacturing Engineering
            </h1>
            <p className={`text-xs mt-1 max-w-xl ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
              Manage Bill of Materials (BOM recipes), configure multi-operation Route Cards, simulate batch requirements, and release shopfloor Job Cards.
            </p>
          </div>

          <div className="flex items-center gap-3">
            {activeSection === 'job-cards' && (
              <button
                onClick={openNewJobModal}
                className="px-4 py-2.5 rounded-2xl bg-gradient-to-r from-[#5B75F8] to-indigo-600 hover:from-indigo-600 hover:to-[#5B75F8] text-white font-bold text-xs flex items-center gap-2 cursor-pointer shadow-lg shadow-[#5B75F8]/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
              >
                <Plus className="w-4 h-4" />
                <span>Create Job Card</span>
              </button>
            )}
            {activeSection === 'route-cards' && (
              <button
                onClick={handleOpenCreateRoute}
                className="px-4 py-2.5 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-teal-600 hover:to-emerald-600 text-white font-bold text-xs flex items-center gap-2 cursor-pointer shadow-lg shadow-emerald-500/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
              >
                <Route className="w-4 h-4" />
                <span>Create Route Card</span>
              </button>
            )}
            {activeSection === 'bom' && (
              <button
                onClick={handleOpenCreateBom}
                className="px-4 py-2.5 rounded-2xl bg-gradient-to-r from-[#5B75F8] to-indigo-600 hover:from-indigo-600 hover:to-[#5B75F8] text-white font-bold text-xs flex items-center gap-2 cursor-pointer shadow-lg shadow-[#5B75F8]/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
              >
                <Layers className="w-4 h-4" />
                <span>Create BOM Formula</span>
              </button>
            )}
          </div>
        </div>

        {/* Global Toast Feedback Banners */}
        {actionSuccess && (
          <div className="mt-4 p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex items-center justify-between font-mono">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>{actionSuccess}</span>
            </div>
            <button onClick={() => setActionSuccess(null)} className="cursor-pointer text-slate-400 hover:text-white"><X className="w-4 h-4" /></button>
          </div>
        )}
        {actionError && (
          <div className="mt-4 p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center justify-between font-mono">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-400" />
              <span>{actionError}</span>
            </div>
            <button onClick={() => setActionError(null)} className="cursor-pointer text-slate-400 hover:text-white"><X className="w-4 h-4" /></button>
          </div>
        )}

        {/* Telemetry Stat Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
          <div className={`p-4 rounded-2xl border transition-all ${
            isDarkMode ? 'bg-slate-950/60 border-slate-800/80' : 'bg-slate-50/80 border-slate-200/80'
          }`}>
            <div className="flex items-center justify-between">
              <span className={`text-xs font-medium ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Active Job Cards</span>
              <div className={`p-2 rounded-xl ${isDarkMode ? 'bg-[#5B75F8]/20 text-[#7B92FF]' : 'bg-[#5B75F8]/10 text-[#5B75F8]'}`}>
                <Factory className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2 flex items-baseline justify-between">
              <span className={`text-2xl font-bold font-mono ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{activeJobsCount}</span>
              <span className="text-[11px] font-mono font-semibold text-[#5B75F8]">Shopfloor</span>
            </div>
          </div>

          <div className={`p-4 rounded-2xl border transition-all ${
            isDarkMode ? 'bg-slate-950/60 border-slate-800/80' : 'bg-slate-50/80 border-slate-200/80'
          }`}>
            <div className="flex items-center justify-between">
              <span className={`text-xs font-medium ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Configured BOMs</span>
              <div className={`p-2 rounded-xl ${isDarkMode ? 'bg-indigo-500/20 text-indigo-400' : 'bg-indigo-100 text-indigo-700'}`}>
                <Layers className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2 flex items-baseline justify-between">
              <span className={`text-2xl font-bold font-mono ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{boms.length}</span>
              <span className="text-[11px] font-mono font-semibold text-indigo-400">WHAT Formulas</span>
            </div>
          </div>

          <div className={`p-4 rounded-2xl border transition-all ${
            isDarkMode ? 'bg-slate-950/60 border-slate-800/80' : 'bg-slate-50/80 border-slate-200/80'
          }`}>
            <div className="flex items-center justify-between">
              <span className={`text-xs font-medium ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Route Cards</span>
              <div className={`p-2 rounded-xl ${isDarkMode ? 'bg-emerald-500/20 text-emerald-400' : 'bg-emerald-100 text-emerald-700'}`}>
                <Route className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2 flex items-baseline justify-between">
              <span className={`text-2xl font-bold font-mono ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{routeCards.length}</span>
              <span className="text-[11px] font-mono font-semibold text-emerald-500">HOW Sequences</span>
            </div>
          </div>

          <div className={`p-4 rounded-2xl border transition-all ${
            isDarkMode ? 'bg-slate-950/60 border-slate-800/80' : 'bg-slate-50/80 border-slate-200/80'
          }`}>
            <div className="flex items-center justify-between">
              <span className={`text-xs font-medium ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>OEE Efficiency</span>
              <div className={`p-2 rounded-xl ${isDarkMode ? 'bg-amber-500/20 text-amber-400' : 'bg-amber-100 text-amber-700'}`}>
                <Activity className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2 flex items-baseline justify-between">
              <span className={`text-2xl font-bold font-mono ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>94.2%</span>
              <span className="text-[11px] font-mono font-semibold text-amber-500">Nominal</span>
            </div>
          </div>
        </div>
      </div>

      {/* Primary Section Switcher Navigation Tabs */}
      <div className={`p-3 rounded-3xl border transition-all flex flex-wrap items-center justify-between gap-4 ${
        isDarkMode ? 'bg-slate-900/70 border-slate-800/80 backdrop-blur-xl' : 'bg-white border-slate-200 shadow-xs'
      }`}>
        <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
          {[
            { id: 'job-cards', label: 'Job Cards (Shopfloor)', icon: Factory },
            { id: 'route-cards', label: 'Route Cards (HOW)', icon: Route },
            { id: 'bom', label: 'Bill of Materials (WHAT)', icon: Layers },
            { id: 'matrix', label: 'Engineering Hub & Demand Matrix', icon: GitFork },
          ].map(section => {
            const Icon = section.icon;
            const isActive = activeSection === section.id;
            return (
              <button
                key={section.id}
                onClick={() => setActiveSection(section.id as ProductionSection)}
                className={`px-4 py-2.5 rounded-2xl text-xs font-mono font-bold transition-all cursor-pointer flex items-center gap-2 whitespace-nowrap ${
                  isActive
                    ? isDarkMode 
                      ? 'bg-[#5B75F8]/20 text-[#7B92FF] border border-[#5B75F8]/40 shadow-xs' 
                      : 'bg-[#5B75F8] text-white shadow-xs'
                    : isDarkMode
                      ? 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{section.label}</span>
              </button>
            );
          })}
        </div>

        {/* Global Search Bar */}
        <div className={`relative flex items-center rounded-2xl border px-3.5 py-1.5 transition-all ${
          isDarkMode ? 'bg-slate-950/80 border-slate-800 text-white focus-within:border-[#5B75F8]/50' : 'bg-slate-50 border-slate-200 text-slate-900 focus-within:border-[#5B75F8]'
        }`}>
          <Search className="w-4 h-4 text-slate-400 shrink-0 mr-2" />
          <input
            type="text"
            placeholder={
              activeSection === 'job-cards' ? "Search Job #, Machine, Part..." :
              activeSection === 'route-cards' ? "Search Part Code, Route, Work Center..." :
              activeSection === 'bom' ? "Search BOM Code, Component SKU..." : "Search Finished Good SKU..."
            }
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="bg-transparent outline-none text-xs w-48 sm:w-64 font-mono"
          />
        </div>
      </div>

      {/* ========================================================================================= */}
      {/* SECTION 1: JOB CARDS & SHOPFLOOR EXECUTION */}
      {/* ========================================================================================= */}
      {activeSection === 'job-cards' && (
        <div className="space-y-6">
          {/* View Filter Pill Bar */}
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
              {[
                { id: 'ALL', label: 'All Jobs' },
                { id: 'SCHEDULED', label: 'Scheduled' },
                { id: 'RUNNING', label: 'Running' },
                { id: 'IN_PROGRESS', label: 'In Progress' },
                { id: 'COMPLETED', label: 'Completed' },
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

            <div className={`flex items-center p-1 rounded-2xl border ${
              isDarkMode ? 'bg-slate-950 border-slate-800' : 'bg-slate-100 border-slate-200'
            }`}>
              <button
                onClick={() => setViewMode('list')}
                className={`p-1.5 rounded-xl transition-all cursor-pointer ${
                  viewMode === 'list' ? (isDarkMode ? 'bg-slate-800 text-[#7B92FF]' : 'bg-white text-[#5B75F8] shadow-xs') : 'text-slate-400'
                }`}
                title="List View"
              >
                <List className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('board')}
                className={`p-1.5 rounded-xl transition-all cursor-pointer ${
                  viewMode === 'board' ? (isDarkMode ? 'bg-slate-800 text-[#7B92FF]' : 'bg-white text-[#5B75F8] shadow-xs') : 'text-slate-400'
                }`}
                title="Kanban Board"
              >
                <Kanban className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Main Jobs Table / Kanban */}
          {viewMode === 'list' ? (
            <div className={`rounded-3xl border overflow-hidden transition-all shadow-xl ${
              isDarkMode ? 'bg-slate-900/80 border-slate-800/80 backdrop-blur-xl' : 'bg-white border-slate-200'
            }`}>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse font-mono">
                  <thead>
                    <tr className={`border-b font-bold uppercase tracking-wider text-[11px] ${
                      isDarkMode ? 'bg-slate-950/60 border-slate-800 text-slate-400' : 'bg-slate-50 border-slate-200 text-slate-500'
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
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-800/60">
                    {filteredCards.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="py-8 text-center text-slate-400">
                          No job cards found matching criteria.
                        </td>
                      </tr>
                    ) : null}
                    {filteredCards.map((jc) => (
                      <tr key={jc.jobNo} className={isDarkMode ? 'hover:bg-slate-800/50' : 'hover:bg-slate-50'}>
                        <td className="py-4 px-5 font-bold font-mono text-[#5B75F8] dark:text-[#7B92FF]">
                          <div>{jc.jobNo}</div>
                          {jc.drawingRevision && (
                            <span className="inline-block mt-0.5 px-1.5 py-0.5 rounded text-[9px] font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                              Rev: {jc.drawingRevision}
                            </span>
                          )}
                        </td>
                        <td className="py-4 px-5 font-mono text-slate-400">
                          <div>{jc.orderPo}</div>
                          {jc.materialIssuedLot && (
                            <div className="text-[10px] text-slate-500">
                              Heat: {jc.materialIssuedLot}
                            </div>
                          )}
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
                        <td className="py-4 px-5 text-center">
                          <div className="flex items-center justify-center gap-2">
                            {(jc.jobStatus === 'COMPLETED' || jc.status === 'COMPLETED') && (
                              <button
                                onClick={() => {
                                  if (onSelectOrder && jc.orderPo) {
                                    onSelectOrder(jc.orderPo);
                                  } else if (onNavigate) {
                                    onNavigate('qc');
                                  }
                                }}
                                className="px-3 py-1.5 rounded-xl font-mono text-xs font-bold transition-all cursor-pointer bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-teal-600 hover:to-emerald-600 text-white shadow-xs hover:scale-[1.02] flex items-center gap-1.5"
                                title="Start QC / PDI Check"
                              >
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span>QC / PDI</span>
                              </button>
                            )}
                            <button
                              onClick={() => handleOpenJobTraveler(jc)}
                              className="px-3.5 py-1.5 rounded-xl font-mono text-xs font-bold transition-all cursor-pointer bg-gradient-to-r from-[#5B75F8] to-indigo-600 hover:from-indigo-600 hover:to-[#5B75F8] text-white shadow-xs hover:scale-[1.02] flex items-center gap-1.5"
                            >
                              <Route className="w-3.5 h-3.5" />
                              <span>Traveler</span>
                            </button>
                            <button
                              onClick={() => setSelectedJobForLog(jc)}
                              className={`p-1.5 rounded-xl font-mono text-xs font-bold transition-all cursor-pointer ${
                                isDarkMode ? 'bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700' : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200'
                              }`}
                              title="Legacy Shift Log"
                            >
                              <Activity className="w-3.5 h-3.5" />
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
                      <span className="font-bold text-xs font-mono tracking-wider">{colStatus}</span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-slate-800 text-slate-300">
                        {colJobs.length}
                      </span>
                    </div>

                    <div className="space-y-3">
                      {colJobs.map(jc => (
                        <div 
                          key={jc.jobNo} 
                          onClick={() => handleOpenJobTraveler(jc)}
                          className={`p-4 rounded-2xl border transition-all cursor-pointer hover:scale-[1.01] ${
                            isDarkMode ? 'bg-slate-900 border-slate-800 hover:border-[#5B75F8]/50' : 'bg-white border-slate-200 shadow-sm hover:border-[#5B75F8]'
                          }`}
                        >
                          <div className="flex items-center justify-between text-xs font-mono font-bold text-[#5B75F8]">
                            <span>{jc.jobNo}</span>
                            <span className="text-slate-400">{jc.targetQty || jc.qty} NOS</span>
                          </div>
                          <div className="mt-1 font-semibold text-xs text-slate-200 font-sans">
                            {jc.partDescription}
                          </div>
                          <div className="mt-2 flex items-center justify-between text-[11px] font-mono text-slate-400">
                            <span>{jc.machine}</span>
                            <span className="text-amber-500">{jc.targetDate}</span>
                          </div>
                          <div className="mt-3 pt-2 border-t border-slate-200 dark:border-slate-800/60 flex items-center justify-between">
                            <span className="text-[10px] font-mono text-indigo-400 flex items-center gap-1">
                              <Route className="w-3 h-3" />
                              <span>Route Traveler</span>
                            </span>
                            <span className="text-[10px] font-mono font-bold text-slate-400">
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
      )}

      {/* ========================================================================================= */}
      {/* SECTION 2: ROUTE CARDS (HOW: SEQUENCE & PROCESS TRAVELERS) */}
      {/* ========================================================================================= */}
      {activeSection === 'route-cards' && (
        <div className="space-y-4">
          {routeCards.length === 0 ? (
            <div className={`p-10 rounded-3xl border text-center ${
              isDarkMode ? 'bg-slate-900/80 border-slate-800/80' : 'bg-white border-slate-200 shadow-sm'
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
                className="mt-4 px-5 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs font-mono inline-flex items-center gap-2 cursor-pointer shadow-lg shadow-emerald-500/20"
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
                className={`rounded-3xl border transition-all overflow-hidden ${
                  isDarkMode ? 'bg-slate-900/80 border-slate-800/80' : 'bg-white border-slate-200 shadow-sm'
                }`}
              >
                <div
                  className={`p-5 flex flex-wrap items-center justify-between gap-4 transition-all ${
                    isDarkMode ? 'hover:bg-slate-800/30' : 'hover:bg-slate-50'
                  }`}
                >
                  <div 
                    onClick={() => setExpandedRoutePart(isExpanded ? null : route.partCode)}
                    className="flex items-center gap-3.5 cursor-pointer flex-1 min-w-[280px]"
                  >
                    <div className="p-2.5 rounded-2xl bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                      <Route className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold font-mono text-sm text-emerald-500 dark:text-emerald-400">{route.partCode}</span>
                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-mono ${
                          isDarkMode ? 'bg-slate-800 text-slate-300' : 'bg-slate-100 text-slate-600'
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
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleOpenEditRoute(route)}
                        title="Edit Route Card Sequences"
                        className={`p-2 rounded-xl border text-xs font-mono font-bold cursor-pointer transition-all ${
                          isDarkMode ? 'border-slate-800 bg-slate-950 text-slate-300 hover:text-white hover:bg-slate-800' : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        <Edit className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => setDuplicatingRoute(route)}
                        title="Duplicate Route Card"
                        className={`p-2 rounded-xl border text-xs font-mono font-bold cursor-pointer transition-all ${
                          isDarkMode ? 'border-slate-800 bg-slate-950 text-slate-300 hover:text-white hover:bg-slate-800' : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => setDeleteConfirmRoute(route)}
                        title="Delete Route Card"
                        className={`p-2 rounded-xl border border-rose-500/30 bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 text-xs font-mono font-bold cursor-pointer transition-all`}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => setExpandedRoutePart(isExpanded ? null : route.partCode)}
                        className={`p-2 rounded-xl border cursor-pointer ${
                          isDarkMode ? 'border-slate-800 text-slate-400' : 'border-slate-200 text-slate-400'
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
                    isDarkMode ? 'border-slate-800/80 bg-slate-950/40' : 'border-slate-200 bg-slate-50/60'
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
                      isDarkMode ? 'border-slate-800/80' : 'border-slate-200'
                    }`}>
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs border-collapse font-mono">
                          <thead>
                            <tr className={`border-b font-bold uppercase tracking-wider text-[10px] ${
                              isDarkMode ? 'bg-slate-950/60 border-slate-800 text-slate-400' : 'bg-slate-100/80 border-slate-200 text-slate-500'
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
                              <tr key={op.id || idx} className={isDarkMode ? 'hover:bg-slate-900/60' : 'bg-white hover:bg-slate-50'}>
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
            <div className={`p-10 rounded-3xl border text-center ${
              isDarkMode ? 'bg-slate-900/80 border-slate-800/80' : 'bg-white border-slate-200 shadow-sm'
            }`}>
              <div className="inline-flex p-3 rounded-2xl bg-[#5B75F8]/15 text-[#5B75F8] dark:text-[#7B92FF] border border-[#5B75F8]/30 mb-3">
                <Layers className="w-7 h-7" />
              </div>
              <h4 className={`text-base font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>No BOM Formulas Configured</h4>
              <p className={`text-xs mt-1 font-mono max-w-md mx-auto ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                Configure engineering Bill of Materials to define the raw materials, standard batch size, scrap allowances, and component costs consumed per finished good.
              </p>
              <button
                onClick={handleOpenCreateBom}
                className="mt-4 px-5 py-2.5 rounded-2xl bg-[#5B75F8] hover:bg-[#4A64E7] text-white font-bold text-xs font-mono inline-flex items-center gap-2 cursor-pointer shadow-lg shadow-[#5B75F8]/20"
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
                className={`rounded-3xl border transition-all overflow-hidden ${
                  isDarkMode ? 'bg-slate-900/80 border-slate-800/80' : 'bg-white border-slate-200 shadow-sm'
                }`}
              >
                <div
                  className={`p-5 flex flex-wrap items-center justify-between gap-4 transition-all ${
                    isDarkMode ? 'hover:bg-slate-800/30' : 'hover:bg-slate-50'
                  }`}
                >
                  <div 
                    onClick={() => setExpandedBomCode(isExpanded ? null : bom.bomCode)}
                    className="flex items-center gap-3.5 cursor-pointer flex-1 min-w-[280px]"
                  >
                    <div className="p-2.5 rounded-2xl bg-[#5B75F8]/15 text-[#5B75F8] dark:text-[#7B92FF] border border-[#5B75F8]/30">
                      <Layers className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold font-mono text-sm text-[#5B75F8] dark:text-[#7B92FF]">{bom.bomCode}</span>
                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-mono ${
                          isDarkMode ? 'bg-slate-800 text-slate-300' : 'bg-slate-100 text-slate-600'
                        }`}>{bom.revision}</span>
                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-mono font-bold border ${
                          bom.status === 'ACTIVE' 
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' 
                            : bom.status === 'DRAFT'
                            ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                            : 'bg-slate-800 text-slate-400 border-slate-700'
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
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleOpenEditBom(bom)}
                        title="Edit BOM Formula & Components"
                        className={`p-2 rounded-xl border text-xs font-mono font-bold cursor-pointer transition-all ${
                          isDarkMode ? 'border-slate-800 bg-slate-950 text-slate-300 hover:text-white hover:bg-slate-800' : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        <Edit className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => setDuplicatingBom(bom)}
                        title="Duplicate BOM Formula"
                        className={`p-2 rounded-xl border text-xs font-mono font-bold cursor-pointer transition-all ${
                          isDarkMode ? 'border-slate-800 bg-slate-950 text-slate-300 hover:text-white hover:bg-slate-800' : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => setRevisionBom(bom)}
                        title="Create New Revision (e.g. REV-B)"
                        className={`p-2 rounded-xl border text-xs font-mono font-bold cursor-pointer transition-all ${
                          isDarkMode ? 'border-slate-800 bg-slate-950 text-indigo-400 hover:text-indigo-300 hover:bg-slate-800' : 'border-slate-200 bg-slate-50 text-indigo-600 hover:bg-slate-100'
                        }`}
                      >
                        <FolderPlus className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleToggleBOMStatus(bom, bom.status === 'ACTIVE' ? 'DRAFT' : 'ACTIVE')}
                        title={bom.status === 'ACTIVE' ? 'Set as Draft' : 'Set as Active'}
                        className={`p-2 rounded-xl border text-xs font-mono font-bold cursor-pointer transition-all ${
                          bom.status === 'ACTIVE'
                            ? 'border-amber-500/30 bg-amber-500/10 text-amber-400 hover:bg-amber-500/20'
                            : 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20'
                        }`}
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => setDeleteConfirmBom(bom)}
                        title="Delete BOM"
                        className={`p-2 rounded-xl border border-rose-500/30 bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 text-xs font-mono font-bold cursor-pointer transition-all`}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => setExpandedBomCode(isExpanded ? null : bom.bomCode)}
                        className={`p-2 rounded-xl border cursor-pointer ${
                          isDarkMode ? 'border-slate-800 text-slate-400' : 'border-slate-200 text-slate-400'
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
                    isDarkMode ? 'border-slate-800/80 bg-slate-950/40' : 'border-slate-200 bg-slate-50/60'
                  }`}>
                    <h5 className={`text-[11px] font-mono uppercase font-bold mb-3 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Components & Scrap Ratios</h5>
                    <div className={`rounded-2xl border overflow-hidden ${
                      isDarkMode ? 'border-slate-800/80' : 'border-slate-200'
                    }`}>
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs border-collapse font-mono">
                          <thead>
                            <tr className={`border-b font-bold uppercase tracking-wider text-[10px] ${
                              isDarkMode ? 'bg-slate-950/60 border-slate-800 text-slate-400' : 'bg-slate-100/80 border-slate-200 text-slate-500'
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
                                <td className="py-3 px-4 font-bold text-[#5B75F8] dark:text-[#7B92FF]">{comp.componentCode}</td>
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
          <div className={`p-6 rounded-3xl border ${
            isDarkMode ? 'bg-slate-900/80 border-slate-800/80' : 'bg-white border-slate-200 shadow-sm'
          }`}>
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-2xl bg-[#5B75F8]/15 text-[#5B75F8] dark:text-[#7B92FF] border border-[#5B75F8]/30">
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
                    className={`rounded-2xl border px-3 py-2 font-bold outline-none cursor-pointer ${
                      isDarkMode ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
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
                    className={`w-28 rounded-2xl border px-3 py-2 font-bold outline-none ${
                      isDarkMode ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                    }`}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Matrix Linked View: WHAT vs HOW Side-by-Side */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left: Active BOM Formula (WHAT) */}
            <div className={`p-6 rounded-3xl border ${
              isDarkMode ? 'bg-slate-900/80 border-slate-800/80' : 'bg-white border-slate-200 shadow-sm'
            }`}>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-xl bg-[#5B75F8]/15 text-[#5B75F8]">
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
                  <div className={`p-3 rounded-2xl border ${
                    isDarkMode ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50 border-slate-200'
                  }`}>
                    <div className="flex justify-between mb-1">
                      <span className="text-slate-400">Parent Finished Good:</span>
                      <span className="font-bold text-[#5B75F8]">{selectedMatrixBOM.parentPartCode}</span>
                    </div>
                    <div className="flex justify-between mb-1">
                      <span className="text-slate-400">Standard Yield:</span>
                      <span className="font-bold text-emerald-400">{selectedMatrixBOM.yieldPercentage}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Batch Explosion Qty:</span>
                      <span className="font-bold text-white">{matrixBatchQty} Units</span>
                    </div>
                  </div>

                  <div className={`rounded-2xl border overflow-hidden ${
                    isDarkMode ? 'border-slate-800' : 'border-slate-200'
                  }`}>
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className={`border-b text-[10px] uppercase ${
                          isDarkMode ? 'bg-slate-950 border-slate-800 text-slate-400' : 'bg-slate-100 border-slate-200 text-slate-600'
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
                            <td className="py-2.5 px-3 font-bold text-slate-200">
                              <div>{comp.componentCode}</div>
                              <div className="text-[10px] text-slate-500 font-normal">{comp.componentName}</div>
                            </td>
                            <td className="py-2.5 px-3 text-right text-slate-400">{comp.qtyPerUnit} {comp.unit}</td>
                            <td className="py-2.5 px-3 text-right font-bold text-emerald-400">{comp.totalRawNeeded} {comp.unit}</td>
                            <td className="py-2.5 px-3 text-right font-mono text-slate-300">{comp.onHand} {comp.unit}</td>
                            <td className="py-2.5 px-3 text-center">
                              {comp.isShortage ? (
                                <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-rose-500/20 text-rose-400 border border-rose-500/30">
                                  Short -{comp.deficit}
                                </span>
                              ) : (
                                <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
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
            <div className={`p-6 rounded-3xl border ${
              isDarkMode ? 'bg-slate-900/80 border-slate-800/80' : 'bg-white border-slate-200 shadow-sm'
            }`}>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-xl bg-emerald-500/15 text-emerald-400">
                    <Route className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm">Active Route Card (HOW)</h4>
                    <span className="text-[10px] font-mono text-slate-400">Sequence, Work Centers & Standard Times</span>
                  </div>
                </div>

                {selectedMatrixRoute ? (
                  <span className="px-2.5 py-1 rounded-xl text-[10px] font-mono font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                    {selectedMatrixRoute.operations?.length} Steps ({selectedMatrixRoute.revision || 'REV-A'})
                  </span>
                ) : (
                  <span className="px-2.5 py-1 rounded-xl text-[10px] font-mono font-bold bg-rose-500/10 text-rose-400 border border-rose-500/30">
                    No Route Card Linked
                  </span>
                )}
              </div>

              {selectedMatrixRoute ? (
                <div className="space-y-3 font-mono text-xs">
                  <div className={`p-3 rounded-2xl border ${
                    isDarkMode ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50 border-slate-200'
                  }`}>
                    <div className="flex justify-between mb-1">
                      <span className="text-slate-400">Total Route Stages:</span>
                      <span className="font-bold text-emerald-400">{selectedMatrixRoute.operations?.length} Operations</span>
                    </div>
                    <div className="flex justify-between mb-1">
                      <span className="text-slate-400">Unit Cycle Time:</span>
                      <span className="font-bold text-amber-500">{selectedMatrixRoute.totalStandardTimeMinutes || 45} mins/unit</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Total Machine Hours for {matrixBatchQty} Units:</span>
                      <span className="font-bold text-purple-400">
                        {((selectedMatrixRoute.totalStandardTimeMinutes || 45) * matrixBatchQty / 60).toFixed(1)} Hours
                      </span>
                    </div>
                  </div>

                  <div className={`rounded-2xl border overflow-hidden ${
                    isDarkMode ? 'border-slate-800' : 'border-slate-200'
                  }`}>
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className={`border-b text-[10px] uppercase ${
                          isDarkMode ? 'bg-slate-950 border-slate-800 text-slate-400' : 'bg-slate-100 border-slate-200 text-slate-600'
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
                          <tr key={idx} className={isDarkMode ? 'hover:bg-slate-900/60' : 'bg-white hover:bg-slate-50'}>
                            <td className="py-2.5 px-3 text-center font-bold text-emerald-400">{op.sequenceNo}</td>
                            <td className="py-2.5 px-3 font-semibold text-slate-200">{op.operationName}</td>
                            <td className="py-2.5 px-3 text-purple-400">{op.workCenter}</td>
                            <td className="py-2.5 px-3 text-right text-slate-400">{op.standardTimeMinutes}m</td>
                            <td className="py-2.5 px-3 text-right font-bold text-purple-400">{op.totalHours} hrs</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <div className="p-8 text-center text-slate-400 font-mono text-xs">
                  Please configure a Route Card for SKU {matrixSelectedPart} to simulate shopfloor capacity.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================================= */}
      {/* MODAL 1: CREATE / EDIT ROUTE CARD */}
      {/* ========================================================================================= */}
      {isCreateRouteOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-md font-sans">
          <div className={`relative w-full max-w-3xl rounded-3xl border p-7 space-y-6 shadow-2xl transition-all max-h-[90vh] overflow-y-auto ${
            isDarkMode 
              ? 'bg-slate-900/95 border-slate-800/80 text-white backdrop-blur-2xl' 
              : 'bg-white border-slate-200 text-slate-900 shadow-2xl'
          }`}>
            <div className={`flex items-center justify-between border-b pb-4 ${isDarkMode ? 'border-slate-800' : 'border-slate-200'}`}>
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-2xl bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                  <Route className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base font-mono">
                    {editingRoute ? `Edit Route Card — ${editingRoute.partCode}` : 'Create Master Route Card'}
                  </h3>
                  <p className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                    Define the multi-stage manufacturing sequence, work centers & cycle times
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setIsCreateRouteOpen(false)} 
                className={`p-2 rounded-2xl border transition-all cursor-pointer ${
                  isDarkMode ? 'border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800' : 'border-slate-200 text-slate-500 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveRouteSubmit} className="space-y-4 text-xs font-mono">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className={`block text-[10px] uppercase font-bold mb-1 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                    Part Code *
                  </label>
                  <input
                    name="partCode"
                    required
                    defaultValue={editingRoute?.partCode || '00000001'}
                    placeholder="e.g. 00000001"
                    className={`w-full rounded-xl border p-2.5 outline-none transition-all focus:border-emerald-500 ${
                      isDarkMode ? 'border-slate-800 bg-slate-950 text-white' : 'border-slate-200 bg-slate-50 text-slate-900'
                    }`}
                  />
                </div>
                <div className="md:col-span-2">
                  <label className={`block text-[10px] uppercase font-bold mb-1 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                    Part Description *
                  </label>
                  <input
                    name="partDescription"
                    required
                    defaultValue={editingRoute?.partDescription || 'MAIN SPINDLE HOUSING 120MM'}
                    placeholder="e.g. Precision Shaft"
                    className={`w-full rounded-xl border p-2.5 outline-none transition-all focus:border-emerald-500 ${
                      isDarkMode ? 'border-slate-800 bg-slate-950 text-white' : 'border-slate-200 bg-slate-50 text-slate-900'
                    }`}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={`block text-[10px] uppercase font-bold mb-1 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                    Revision
                  </label>
                  <input
                    name="revision"
                    defaultValue={editingRoute?.revision || 'REV-A'}
                    className={`w-full rounded-xl border p-2.5 outline-none transition-all focus:border-emerald-500 ${
                      isDarkMode ? 'border-slate-800 bg-slate-950 text-white' : 'border-slate-200 bg-slate-50 text-slate-900'
                    }`}
                  />
                </div>
                <div>
                  <label className={`block text-[10px] uppercase font-bold mb-1 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                    Route Status
                  </label>
                  <select
                    name="status"
                    defaultValue={editingRoute?.status || 'ACTIVE'}
                    className={`w-full rounded-xl border p-2.5 outline-none transition-all focus:border-emerald-500 ${
                      isDarkMode ? 'border-slate-800 bg-slate-950 text-white' : 'border-slate-200 bg-slate-50 text-slate-900'
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
                  <div className="text-[11px] font-bold uppercase text-emerald-400">
                    Operation Steps & Sequence Builder ({routeFormSteps.length} Stages)
                  </div>
                  <button
                    type="button"
                    onClick={handleAddRouteStepRow}
                    className="px-3 py-1.5 rounded-xl bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600/30 border border-emerald-500/30 text-[10px] font-bold flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Operation Step</span>
                  </button>
                </div>

                <div className={`space-y-2.5 max-h-[320px] overflow-y-auto pr-1`}>
                  {routeFormSteps.map((step, idx) => (
                    <div
                      key={idx}
                      className={`p-3 rounded-2xl border flex flex-wrap items-center gap-3 ${
                        isDarkMode ? 'bg-slate-950/70 border-slate-800' : 'bg-slate-50 border-slate-200'
                      }`}
                    >
                      {/* Sequence and Reorder buttons */}
                      <div className="flex items-center gap-1">
                        <span className="w-8 h-8 rounded-xl bg-emerald-500/15 text-emerald-400 font-bold flex items-center justify-center text-xs">
                          {step.sequenceNo}
                        </span>
                        <div className="flex flex-col gap-0.5">
                          <button
                            type="button"
                            onClick={() => handleMoveRouteStep(idx, 'up')}
                            disabled={idx === 0}
                            className="p-1 rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-30 cursor-pointer"
                          >
                            <ArrowUp className="w-2.5 h-2.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleMoveRouteStep(idx, 'down')}
                            disabled={idx === routeFormSteps.length - 1}
                            className="p-1 rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-30 cursor-pointer"
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
                            isDarkMode ? 'border-slate-800 bg-slate-900 text-white' : 'border-slate-200 bg-white text-slate-900'
                          }`}
                        />
                      </div>

                      {/* Work Center */}
                      <div className="w-32">
                        <input
                          value={step.workCenter}
                          onChange={(e) => handleRouteStepChange(idx, 'workCenter', e.target.value)}
                          placeholder="Work Center (e.g. VMC-01)"
                          required
                          className={`w-full rounded-xl border p-2 text-xs outline-none focus:border-emerald-500 ${
                            isDarkMode ? 'border-slate-800 bg-slate-900 text-white' : 'border-slate-200 bg-white text-slate-900'
                          }`}
                        />
                      </div>

                      {/* Standard Time Mins */}
                      <div className="w-24">
                        <input
                          type="number"
                          value={step.standardTimeMinutes}
                          onChange={(e) => handleRouteStepChange(idx, 'standardTimeMinutes', Number(e.target.value))}
                          placeholder="Std Mins"
                          required
                          className={`w-full rounded-xl border p-2 text-xs outline-none focus:border-emerald-500 text-right ${
                            isDarkMode ? 'border-slate-800 bg-slate-900 text-white' : 'border-slate-200 bg-white text-slate-900'
                          }`}
                        />
                      </div>

                      {/* Inspection Required Checkbox */}
                      <label className="flex items-center gap-1.5 cursor-pointer text-[10px] text-slate-300">
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
                            isDarkMode ? 'border-slate-800 bg-slate-900 text-white' : 'border-slate-200 bg-white text-slate-900'
                          }`}
                        />
                      </div>

                      {/* Remove Row Button */}
                      <button
                        type="button"
                        onClick={() => handleRemoveRouteStepRow(idx)}
                        className="p-2 rounded-xl text-rose-400 hover:bg-rose-500/20 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <label className={`block text-[10px] uppercase font-bold mb-1 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                  Engineering Notes
                </label>
                <input
                  name="notes"
                  defaultValue={editingRoute?.notes || 'Standard manufacturing process traveler'}
                  className={`w-full rounded-xl border p-2.5 outline-none transition-all focus:border-emerald-500 ${
                    isDarkMode ? 'border-slate-800 bg-slate-950 text-white' : 'border-slate-200 bg-slate-50 text-slate-900'
                  }`}
                />
              </div>

              <div className={`pt-4 border-t flex justify-end gap-3 font-sans ${isDarkMode ? 'border-slate-800' : 'border-slate-200'}`}>
                <button
                  type="button"
                  onClick={() => setIsCreateRouteOpen(false)}
                  className={`px-5 py-2.5 rounded-xl border font-bold cursor-pointer transition-all ${
                    isDarkMode ? 'border-slate-800 text-slate-300 hover:bg-slate-800' : 'border-slate-200 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold cursor-pointer transition-all shadow-lg shadow-emerald-500/20"
                >
                  Save Route Card
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================================= */}
      {/* MODAL 2: CREATE / EDIT BILL OF MATERIALS (BOM) */}
      {/* ========================================================================================= */}
      {isCreateBomOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-md font-sans">
          <div className={`relative w-full max-w-3xl rounded-3xl border p-7 space-y-6 shadow-2xl transition-all max-h-[90vh] overflow-y-auto ${
            isDarkMode 
              ? 'bg-slate-900/95 border-slate-800/80 text-white backdrop-blur-2xl' 
              : 'bg-white border-slate-200 text-slate-900 shadow-2xl'
          }`}>
            <div className={`flex items-center justify-between border-b pb-4 ${isDarkMode ? 'border-slate-800' : 'border-slate-200'}`}>
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-2xl bg-[#5B75F8]/15 text-[#5B75F8] dark:text-[#7B92FF] border border-[#5B75F8]/30">
                  <Layers className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base font-mono">
                    {editingBom ? `Edit BOM Formula — ${editingBom.bomCode}` : 'Configure Bill of Materials (BOM)'}
                  </h3>
                  <p className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                    Define raw material formulas, scrap allowances & component costs
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setIsCreateBomOpen(false)} 
                className={`p-2 rounded-2xl border transition-all cursor-pointer ${
                  isDarkMode ? 'border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800' : 'border-slate-200 text-slate-500 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveBOMSubmit} className="space-y-4 text-xs font-mono">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className={`block text-[10px] uppercase font-bold mb-1 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                    BOM Code *
                  </label>
                  <input
                    name="bomCode"
                    required
                    defaultValue={editingBom?.bomCode || `BOM-00000001-A`}
                    placeholder="e.g. BOM-00000001-A"
                    className={`w-full rounded-xl border p-2.5 outline-none transition-all focus:border-[#5B75F8] ${
                      isDarkMode ? 'border-slate-800 bg-slate-950 text-white' : 'border-slate-200 bg-slate-50 text-slate-900'
                    }`}
                  />
                </div>
                <div>
                  <label className={`block text-[10px] uppercase font-bold mb-1 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                    Parent Part Code *
                  </label>
                  <input
                    name="parentCode"
                    required
                    defaultValue={editingBom?.parentPartCode || '00000001'}
                    className={`w-full rounded-xl border p-2.5 outline-none transition-all focus:border-[#5B75F8] ${
                      isDarkMode ? 'border-slate-800 bg-slate-950 text-white' : 'border-slate-200 bg-slate-50 text-slate-900'
                    }`}
                  />
                </div>
                <div>
                  <label className={`block text-[10px] uppercase font-bold mb-1 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                    Parent Part Name *
                  </label>
                  <input
                    name="parentName"
                    required
                    defaultValue={editingBom?.parentPartName || 'MAIN SPINDLE HOUSING 120MM'}
                    className={`w-full rounded-xl border p-2.5 outline-none transition-all focus:border-[#5B75F8] ${
                      isDarkMode ? 'border-slate-800 bg-slate-950 text-white' : 'border-slate-200 bg-slate-50 text-slate-900'
                    }`}
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className={`block text-[10px] uppercase font-bold mb-1 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                    Revision
                  </label>
                  <input
                    name="revision"
                    defaultValue={editingBom?.revision || 'v1.0'}
                    className={`w-full rounded-xl border p-2.5 outline-none transition-all focus:border-[#5B75F8] ${
                      isDarkMode ? 'border-slate-800 bg-slate-950 text-white' : 'border-slate-200 bg-slate-50 text-slate-900'
                    }`}
                  />
                </div>
                <div>
                  <label className={`block text-[10px] uppercase font-bold mb-1 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                    Batch Size
                  </label>
                  <input
                    name="batchSize"
                    type="number"
                    defaultValue={editingBom?.batchSize || 100}
                    className={`w-full rounded-xl border p-2.5 outline-none transition-all focus:border-[#5B75F8] ${
                      isDarkMode ? 'border-slate-800 bg-slate-950 text-white' : 'border-slate-200 bg-slate-50 text-slate-900'
                    }`}
                  />
                </div>
                <div>
                  <label className={`block text-[10px] uppercase font-bold mb-1 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                    Expected Yield (%)
                  </label>
                  <input
                    name="yield"
                    type="number"
                    step="0.1"
                    defaultValue={editingBom?.yieldPercentage || 98.5}
                    className={`w-full rounded-xl border p-2.5 outline-none transition-all focus:border-[#5B75F8] ${
                      isDarkMode ? 'border-slate-800 bg-slate-950 text-white' : 'border-slate-200 bg-slate-50 text-slate-900'
                    }`}
                  />
                </div>
              </div>

              {/* Dynamic Components Multi-Row Table */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <div className="text-[11px] font-bold uppercase text-[#5B75F8] dark:text-[#7B92FF]">
                    Raw Materials & Components ({bomFormComponents.length} Items)
                  </div>
                  <button
                    type="button"
                    onClick={handleAddBomComponentRow}
                    className="px-3 py-1.5 rounded-xl bg-[#5B75F8]/20 text-[#7B92FF] hover:bg-[#5B75F8]/30 border border-[#5B75F8]/30 text-[10px] font-bold flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Component</span>
                  </button>
                </div>

                <div className="space-y-2.5 max-h-[300px] overflow-y-auto pr-1">
                  {bomFormComponents.map((comp, idx) => (
                    <div
                      key={idx}
                      className={`p-3 rounded-2xl border flex flex-wrap items-center gap-2.5 ${
                        isDarkMode ? 'bg-slate-950/70 border-slate-800' : 'bg-slate-50 border-slate-200'
                      }`}
                    >
                      <div className="w-40">
                        <input
                          value={comp.componentCode}
                          onChange={(e) => handleBomComponentChange(idx, 'componentCode', e.target.value)}
                          placeholder="SKU (e.g. RAW-EN8)"
                          required
                          className={`w-full rounded-xl border p-2 text-xs outline-none focus:border-[#5B75F8] ${
                            isDarkMode ? 'border-slate-800 bg-slate-900 text-white' : 'border-slate-200 bg-white text-slate-900'
                          }`}
                        />
                      </div>

                      <div className="flex-1 min-w-[140px]">
                        <input
                          value={comp.componentName}
                          onChange={(e) => handleBomComponentChange(idx, 'componentName', e.target.value)}
                          placeholder="Component Name"
                          required
                          className={`w-full rounded-xl border p-2 text-xs outline-none focus:border-[#5B75F8] ${
                            isDarkMode ? 'border-slate-800 bg-slate-900 text-white' : 'border-slate-200 bg-white text-slate-900'
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
                          className={`w-full rounded-xl border p-2 text-xs outline-none focus:border-[#5B75F8] text-right font-bold ${
                            isDarkMode ? 'border-slate-800 bg-slate-900 text-white' : 'border-slate-200 bg-white text-slate-900'
                          }`}
                        />
                      </div>

                      <div className="w-16">
                        <input
                          value={comp.unit}
                          onChange={(e) => handleBomComponentChange(idx, 'unit', e.target.value)}
                          placeholder="UOM"
                          className={`w-full rounded-xl border p-2 text-xs outline-none focus:border-[#5B75F8] ${
                            isDarkMode ? 'border-slate-800 bg-slate-900 text-white' : 'border-slate-200 bg-white text-slate-900'
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
                          className={`w-full rounded-xl border p-2 text-xs outline-none focus:border-[#5B75F8] text-right ${
                            isDarkMode ? 'border-slate-800 bg-slate-900 text-white' : 'border-slate-200 bg-white text-slate-900'
                          }`}
                        />
                      </div>

                      <div className="w-20">
                        <input
                          type="number"
                          value={comp.unitCost}
                          onChange={(e) => handleBomComponentChange(idx, 'unitCost', Number(e.target.value))}
                          placeholder="Cost (₹)"
                          className={`w-full rounded-xl border p-2 text-xs outline-none focus:border-[#5B75F8] text-right ${
                            isDarkMode ? 'border-slate-800 bg-slate-900 text-white' : 'border-slate-200 bg-white text-slate-900'
                          }`}
                        />
                      </div>

                      <button
                        type="button"
                        onClick={() => handleRemoveBomComponentRow(idx)}
                        className="p-2 rounded-xl text-rose-400 hover:bg-rose-500/20 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <label className={`block text-[10px] uppercase font-bold mb-1 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                  Engineering Notes
                </label>
                <input
                  name="notes"
                  defaultValue={editingBom?.notes || 'Engineering release BOM formula'}
                  className={`w-full rounded-xl border p-2.5 outline-none transition-all focus:border-[#5B75F8] ${
                    isDarkMode ? 'border-slate-800 bg-slate-950 text-white' : 'border-slate-200 bg-slate-50 text-slate-900'
                  }`}
                />
              </div>

              <div className={`pt-4 border-t flex justify-end gap-3 font-sans ${isDarkMode ? 'border-slate-800' : 'border-slate-200'}`}>
                <button
                  type="button"
                  onClick={() => setIsCreateBomOpen(false)}
                  className={`px-5 py-2.5 rounded-xl border font-bold cursor-pointer transition-all ${
                    isDarkMode ? 'border-slate-800 text-slate-300 hover:bg-slate-800' : 'border-slate-200 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl bg-[#5B75F8] hover:bg-[#4A64E7] text-white font-bold cursor-pointer transition-all shadow-lg shadow-[#5B75F8]/20"
                >
                  Save BOM Formula
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================================= */}
      {/* MODAL 3: DUPLICATE BOM MODAL */}
      {/* ========================================================================================= */}
      {duplicatingBom && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-md font-sans">
          <div className={`relative w-full max-w-md rounded-3xl border p-7 space-y-6 shadow-2xl transition-all ${
            isDarkMode ? 'bg-slate-900/95 border-slate-800/80 text-white' : 'bg-white border-slate-200 text-slate-900'
          }`}>
            <div className="flex items-center justify-between border-b pb-4 border-slate-800">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-2xl bg-[#5B75F8]/15 text-[#7B92FF]">
                  <Copy className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base font-mono">Duplicate BOM Formula</h3>
                  <p className="text-xs text-slate-400">Clone components from {duplicatingBom.bomCode}</p>
                </div>
              </div>
              <button onClick={() => setDuplicatingBom(null)} className="p-2 rounded-2xl border border-slate-800 text-slate-400 hover:text-white cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleDuplicateBOMSubmit} className="space-y-4 text-xs font-mono">
              <div>
                <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">New BOM Code *</label>
                <input
                  name="targetBomCode"
                  required
                  defaultValue={`${duplicatingBom.bomCode}-COPY`}
                  className={`w-full rounded-xl border p-2.5 outline-none ${
                    isDarkMode ? 'border-slate-800 bg-slate-950 text-white' : 'border-slate-200 bg-slate-50 text-slate-900'
                  }`}
                />
              </div>

              <div>
                <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Target Part Code *</label>
                <input
                  name="targetPartCode"
                  required
                  defaultValue={`${duplicatingBom.parentPartCode}-V2`}
                  className={`w-full rounded-xl border p-2.5 outline-none ${
                    isDarkMode ? 'border-slate-800 bg-slate-950 text-white' : 'border-slate-200 bg-slate-50 text-slate-900'
                  }`}
                />
              </div>

              <div>
                <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Target Part Name</label>
                <input
                  name="targetPartName"
                  defaultValue={duplicatingBom.parentPartName}
                  className={`w-full rounded-xl border p-2.5 outline-none ${
                    isDarkMode ? 'border-slate-800 bg-slate-950 text-white' : 'border-slate-200 bg-slate-50 text-slate-900'
                  }`}
                />
              </div>

              <div className="pt-4 border-t border-slate-800 flex justify-end gap-3 font-sans">
                <button type="button" onClick={() => setDuplicatingBom(null)} className="px-5 py-2.5 rounded-xl border border-slate-800 text-slate-300 hover:bg-slate-800">
                  Cancel
                </button>
                <button type="submit" className="px-6 py-2.5 rounded-xl bg-[#5B75F8] text-white font-bold">
                  Duplicate BOM
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================================= */}
      {/* MODAL 4: CREATE BOM REVISION MODAL */}
      {/* ========================================================================================= */}
      {revisionBom && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-md font-sans">
          <div className={`relative w-full max-w-md rounded-3xl border p-7 space-y-6 shadow-2xl transition-all ${
            isDarkMode ? 'bg-slate-900/95 border-slate-800/80 text-white' : 'bg-white border-slate-200 text-slate-900'
          }`}>
            <div className="flex items-center justify-between border-b pb-4 border-slate-800">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-2xl bg-indigo-500/15 text-indigo-400">
                  <FolderPlus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base font-mono">Create BOM Revision</h3>
                  <p className="text-xs text-slate-400">Increment version for {revisionBom.bomCode}</p>
                </div>
              </div>
              <button onClick={() => setRevisionBom(null)} className="p-2 rounded-2xl border border-slate-800 text-slate-400 hover:text-white cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleRevisionBOMSubmit} className="space-y-4 text-xs font-mono">
              <div className="p-3 rounded-2xl bg-slate-950/60 border border-slate-800">
                <div className="text-slate-400">Current Revision: <span className="text-white font-bold">{revisionBom.revision}</span></div>
                <div className="text-slate-400">Parent Part: <span className="text-[#7B92FF]">{revisionBom.parentPartCode}</span></div>
              </div>

              <div>
                <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">New Revision Identifier *</label>
                <input
                  name="newRevision"
                  required
                  defaultValue={revisionBom.revision.includes('v') ? `v${(parseFloat(revisionBom.revision.replace('v', '')) + 0.1).toFixed(1)}` : 'REV-B'}
                  className={`w-full rounded-xl border p-2.5 outline-none ${
                    isDarkMode ? 'border-slate-800 bg-slate-950 text-white' : 'border-slate-200 bg-slate-50 text-slate-900'
                  }`}
                />
              </div>

              <div className="pt-4 border-t border-slate-800 flex justify-end gap-3 font-sans">
                <button type="button" onClick={() => setRevisionBom(null)} className="px-5 py-2.5 rounded-xl border border-slate-800 text-slate-300 hover:bg-slate-800">
                  Cancel
                </button>
                <button type="submit" className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold">
                  Release Revision
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================================= */}
      {/* MODAL 5: DUPLICATE ROUTE CARD MODAL */}
      {/* ========================================================================================= */}
      {duplicatingRoute && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-md font-sans">
          <div className={`relative w-full max-w-md rounded-3xl border p-7 space-y-6 shadow-2xl transition-all ${
            isDarkMode ? 'bg-slate-900/95 border-slate-800/80 text-white' : 'bg-white border-slate-200 text-slate-900'
          }`}>
            <div className="flex items-center justify-between border-b pb-4 border-slate-800">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-2xl bg-emerald-500/15 text-emerald-400">
                  <Copy className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base font-mono">Duplicate Route Card</h3>
                  <p className="text-xs text-slate-400">Copy operation steps from {duplicatingRoute.partCode}</p>
                </div>
              </div>
              <button onClick={() => setDuplicatingRoute(null)} className="p-2 rounded-2xl border border-slate-800 text-slate-400 hover:text-white cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleDuplicateRouteSubmit} className="space-y-4 text-xs font-mono">
              <div>
                <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Target Part Code *</label>
                <input
                  name="targetPartCode"
                  required
                  defaultValue={`${duplicatingRoute.partCode}-V2`}
                  className={`w-full rounded-xl border p-2.5 outline-none ${
                    isDarkMode ? 'border-slate-800 bg-slate-950 text-white' : 'border-slate-200 bg-slate-50 text-slate-900'
                  }`}
                />
              </div>

              <div>
                <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Target Part Description</label>
                <input
                  name="targetPartDescription"
                  defaultValue={duplicatingRoute.partDescription}
                  className={`w-full rounded-xl border p-2.5 outline-none ${
                    isDarkMode ? 'border-slate-800 bg-slate-950 text-white' : 'border-slate-200 bg-slate-50 text-slate-900'
                  }`}
                />
              </div>

              <div className="pt-4 border-t border-slate-800 flex justify-end gap-3 font-sans">
                <button type="button" onClick={() => setDuplicatingRoute(null)} className="px-5 py-2.5 rounded-xl border border-slate-800 text-slate-300 hover:bg-slate-800">
                  Cancel
                </button>
                <button type="submit" className="px-6 py-2.5 rounded-xl bg-emerald-600 text-white font-bold">
                  Duplicate Route
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================================= */}
      {/* MODAL 6: DELETE CONFIRMATION DIALOG */}
      {/* ========================================================================================= */}
      {(deleteConfirmBom || deleteConfirmRoute) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md font-sans">
          <div className={`relative w-full max-w-md rounded-3xl border p-7 space-y-5 shadow-2xl transition-all ${
            isDarkMode ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
          }`}>
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-2xl bg-rose-500/15 text-rose-400 border border-rose-500/30">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-base">
                  Confirm Deletion
                </h3>
                <p className="text-xs text-slate-400">This action cannot be undone.</p>
              </div>
            </div>

            <p className="text-xs font-mono text-slate-300">
              {deleteConfirmBom && `Are you sure you want to delete BOM formula ${deleteConfirmBom.bomCode}? All component relationships will be removed.`}
              {deleteConfirmRoute && `Are you sure you want to delete the Route Card template for ${deleteConfirmRoute.partCode}? All ${deleteConfirmRoute.operations?.length} sequenced operations will be removed.`}
            </p>

            <div className="pt-3 border-t border-slate-800 flex justify-end gap-3 font-sans">
              <button
                type="button"
                onClick={() => {
                  setDeleteConfirmBom(null);
                  setDeleteConfirmRoute(null);
                }}
                className="px-5 py-2.5 rounded-xl border border-slate-800 text-slate-300 hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  if (deleteConfirmBom) handleDeleteBOMConfirmed();
                  if (deleteConfirmRoute) handleDeleteRouteConfirmed();
                }}
                className="px-6 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold shadow-lg shadow-rose-500/25"
              >
                Delete Record
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================================= */}
      {/* MODAL 7: CREATE SHOPFLOOR JOB CARD (INTEGRATED WITH ACTIVE BOM & ROUTE CARD) */}
      {/* ========================================================================================= */}
      {showNewJobModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-md font-sans">
          <div className={`relative w-full max-w-2xl rounded-3xl border p-7 space-y-6 shadow-2xl transition-all max-h-[90vh] overflow-y-auto ${
            isDarkMode 
              ? 'bg-slate-900/95 border-slate-800/80 text-white backdrop-blur-2xl' 
              : 'bg-white border-slate-200 text-slate-900 shadow-2xl'
          }`}>
            <div className={`flex items-center justify-between border-b pb-4 ${isDarkMode ? 'border-slate-800' : 'border-slate-200'}`}>
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-2xl bg-[#5B75F8]/15 text-[#5B75F8] border border-[#5B75F8]/30">
                  <Factory className="w-5 h-5" />
                </div>
                <div>
                  <h3 className={`font-bold text-base tracking-tight ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                    Create Shopfloor Job Card
                  </h3>
                  <p className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                    Schedule manufacturing operation traveler from active Order, BOM & Route Card
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setShowNewJobModal(false)} 
                className={`p-2 rounded-2xl border transition-all cursor-pointer ${
                  isDarkMode 
                    ? 'border-slate-800 bg-slate-950/60 text-slate-400 hover:text-white hover:bg-slate-800' 
                    : 'border-slate-200 bg-slate-50 text-slate-500 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateJobSubmit} className="space-y-4">
              {actionError && (
                <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-mono flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{actionError}</span>
                </div>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-mono uppercase font-bold text-slate-400 mb-1.5">Customer Order PO *</label>
                  {eligibleOrders.length > 0 ? (
                    <select
                      value={newOrderPo}
                      onChange={(e) => handleSelectOrder(e.target.value)}
                      className={`w-full rounded-2xl border px-3.5 py-2.5 text-xs font-mono outline-none transition-all cursor-pointer ${
                        isDarkMode ? 'bg-slate-950/80 border-slate-800 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                      }`}
                    >
                      {eligibleOrders.map(o => (
                        <option key={o.id || o.poNo} value={o.poNo}>
                          {o.poNo} — {o.customerName || 'Customer'} ({o.lines?.[0]?.itemCode || 'Item'})
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type="text"
                      required
                      value={newOrderPo}
                      onChange={(e) => setNewOrderPo(e.target.value)}
                      placeholder="e.g. PO-2026-0891"
                      className={`w-full rounded-2xl border px-3.5 py-2.5 text-xs font-mono outline-none transition-all ${
                        isDarkMode ? 'bg-slate-950/80 border-slate-800 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                      }`}
                    />
                  )}
                </div>

                <div>
                  <label className="block text-[11px] font-mono uppercase font-bold text-slate-400 mb-1.5">Batch Qty (NOS) *</label>
                  <input
                    type="number"
                    required
                    value={newQty}
                    onChange={(e) => setNewQty(Number(e.target.value))}
                    className={`w-full rounded-2xl border px-3.5 py-2.5 text-xs font-mono font-bold outline-none transition-all ${
                      isDarkMode ? 'bg-slate-950/80 border-slate-800 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                    }`}
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-[11px] font-mono uppercase font-bold text-slate-400 mb-1.5">Part Code *</label>
                  <input
                    type="text"
                    required
                    value={newPartCode}
                    onChange={(e) => setNewPartCode(e.target.value)}
                    className={`w-full rounded-2xl border px-3.5 py-2.5 text-xs font-mono outline-none transition-all ${
                      isDarkMode ? 'bg-slate-950/80 border-slate-800 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                    }`}
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-mono uppercase font-bold text-slate-400 mb-1.5">Drawing Rev *</label>
                  <input
                    type="text"
                    required
                    value={newDrawingRev}
                    onChange={(e) => setNewDrawingRev(e.target.value)}
                    className={`w-full rounded-2xl border px-3.5 py-2.5 text-xs font-mono outline-none transition-all ${
                      isDarkMode ? 'bg-slate-950/80 border-slate-800 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                    }`}
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-mono uppercase font-bold text-slate-400 mb-1.5">Heat/Lot # (Optional)</label>
                  <input
                    type="text"
                    value={newHeatLot}
                    onChange={(e) => setNewHeatLot(e.target.value)}
                    placeholder="Optional"
                    className={`w-full rounded-2xl border px-3.5 py-2.5 text-xs font-mono outline-none transition-all ${
                      isDarkMode ? 'bg-slate-950/80 border-slate-800 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                    }`}
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-mono uppercase font-bold text-slate-400 mb-1.5">Part Description *</label>
                <input
                  type="text"
                  required
                  value={newPartDesc}
                  onChange={(e) => setNewPartDesc(e.target.value)}
                  placeholder="e.g. MAIN SPINDLE HOUSING 120MM"
                  className={`w-full rounded-2xl border px-4 py-3 text-xs outline-none transition-all ${
                    isDarkMode 
                      ? 'bg-slate-950/80 border-slate-800 text-white focus:border-[#5B75F8]' 
                      : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-[#5B75F8]'
                  }`}
                />
              </div>

              {/* Connected Active BOM & Route Card Intel Card */}
              <div className={`p-4 rounded-2xl border space-y-3 font-mono text-xs ${
                isDarkMode ? 'bg-slate-950/80 border-slate-800' : 'bg-slate-50 border-slate-200'
              }`}>
                <div className="flex items-center justify-between text-[11px] font-bold uppercase">
                  <span className="text-[#7B92FF] flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-[#5B75F8]" />
                    Linked Manufacturing Configuration
                  </span>
                  <span className="text-slate-400">Engineering Check</span>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className={`p-2.5 rounded-xl border ${
                    linkedBOMForNewJob ? (isDarkMode ? 'border-slate-800 bg-slate-900/60' : 'border-slate-200 bg-white') : 'border-rose-500/30 bg-rose-500/10'
                  }`}>
                    <div className="text-[10px] text-slate-400">WHAT Formula (BOM):</div>
                    {linkedBOMForNewJob ? (
                      <div className="font-bold text-emerald-400 text-xs mt-0.5">
                        {linkedBOMForNewJob.bomCode} ({linkedBOMForNewJob.components?.length || 0} Components)
                      </div>
                    ) : (
                      <div className="text-rose-400 text-[11px] font-bold mt-0.5">
                        No BOM found (Direct manual issue)
                      </div>
                    )}
                  </div>

                  <div className={`p-2.5 rounded-xl border ${
                    linkedRouteForNewJob ? (isDarkMode ? 'border-slate-800 bg-slate-900/60' : 'border-slate-200 bg-white') : 'border-amber-500/30 bg-amber-500/10'
                  }`}>
                    <div className="text-[10px] text-slate-400">HOW Sequence (Route Card):</div>
                    {linkedRouteForNewJob ? (
                      <div className="font-bold text-emerald-400 text-xs mt-0.5">
                        {linkedRouteForNewJob.operations?.length} Stages ({linkedRouteForNewJob.totalStandardTimeMinutes || 45} mins total)
                      </div>
                    ) : (
                      <div className="text-amber-400 text-[11px] font-bold mt-0.5">
                        Standard Single-Stage Machining
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-mono uppercase font-bold text-slate-400 mb-1.5">Machine Center *</label>
                  <input
                    type="text"
                    required
                    value={newMachine}
                    onChange={(e) => setNewMachine(e.target.value)}
                    placeholder="e.g. VMC-01 (Vertical Milling)"
                    className={`w-full rounded-2xl border px-4 py-3 text-xs font-mono outline-none transition-all ${
                      isDarkMode 
                        ? 'bg-slate-950/80 border-slate-800 text-white focus:border-[#5B75F8]' 
                        : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-[#5B75F8]'
                    }`}
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-mono uppercase font-bold text-slate-400 mb-1.5">Target Completion Date</label>
                  <input
                    type="date"
                    required
                    value={newTargetDate}
                    onChange={(e) => setNewTargetDate(e.target.value)}
                    className={`w-full rounded-2xl border px-3.5 py-2.5 text-xs font-mono outline-none transition-all ${
                      isDarkMode ? 'bg-slate-950/80 border-slate-800 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                    }`}
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-slate-200 dark:border-slate-800/80 flex items-center justify-end gap-3 font-sans">
                <button 
                  type="button" 
                  onClick={() => setShowNewJobModal(false)} 
                  className={`px-5 py-2.5 rounded-2xl border text-xs font-mono font-bold cursor-pointer transition-all ${
                    isDarkMode 
                      ? 'border-slate-800 bg-slate-950/60 text-slate-300 hover:bg-slate-800' 
                      : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={isSubmittingJobCard}
                  className="px-6 py-2.5 rounded-2xl bg-gradient-to-r from-[#5B75F8] to-indigo-600 hover:from-indigo-600 hover:to-[#5B75F8] text-white font-bold text-xs font-mono cursor-pointer shadow-lg shadow-[#5B75F8]/25 transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 flex items-center gap-2"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isSubmittingJobCard ? 'animate-spin' : ''}`} />
                  <span>{isSubmittingJobCard ? 'Releasing Job Card...' : 'Release Job Card'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================================= */}
      {/* MODAL 8: LOG PRODUCTION SHIFT OUTPUT */}
      {/* ========================================================================================= */}
      {selectedJobForLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md font-sans">
          <div className={`relative w-full max-w-md rounded-3xl border p-7 space-y-6 shadow-2xl transition-all ${
            isDarkMode 
              ? 'bg-slate-900/95 border-slate-800/80 text-white backdrop-blur-2xl shadow-[#5B75F8]/5' 
              : 'bg-white border-slate-200 text-slate-900 shadow-2xl'
          }`}>
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800/80 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-2xl bg-[#5B75F8]/15 text-[#5B75F8] border border-[#5B75F8]/30">
                  <Activity className="w-5 h-5" />
                </div>
                <div>
                  <h3 className={`font-bold text-base tracking-tight ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                    Log Shift Output
                  </h3>
                  <p className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                    Record operational production output
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setSelectedJobForLog(null)} 
                className={`p-2 rounded-2xl border transition-all cursor-pointer ${
                  isDarkMode 
                    ? 'border-slate-800 bg-slate-950/60 text-slate-400 hover:text-white hover:bg-slate-800' 
                    : 'border-slate-200 bg-slate-50 text-slate-500 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleLogSubmit} className="space-y-4">
              <div className={`p-3.5 rounded-2xl border font-mono font-bold text-xs ${
                isDarkMode ? 'bg-slate-950/80 border-slate-800 text-[#7B92FF]' : 'bg-slate-50 border-slate-200 text-[#5B75F8]'
              }`}>
                {selectedJobForLog.jobNo} — {selectedJobForLog.partDescription}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-mono uppercase font-bold text-slate-400 mb-1.5">Step #</label>
                  <input
                    type="number"
                    value={logStepNo}
                    onChange={(e) => setLogStepNo(Number(e.target.value))}
                    className={`w-full rounded-2xl border px-4 py-3 text-xs font-mono outline-none ${
                      isDarkMode ? 'bg-slate-950/80 border-slate-800 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                    }`}
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-mono uppercase font-bold text-slate-400 mb-1.5">Qty Produced</label>
                  <input
                    type="number"
                    value={logDoneQty}
                    onChange={(e) => setLogDoneQty(Number(e.target.value))}
                    className={`w-full rounded-2xl border px-4 py-3 text-xs font-mono font-bold outline-none ${
                      isDarkMode ? 'bg-slate-950/80 border-slate-800 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                    }`}
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-mono uppercase font-bold text-slate-400 mb-1.5">Operation Name</label>
                <input
                  type="text"
                  value={logOperation}
                  onChange={(e) => setLogOperation(e.target.value)}
                  className={`w-full rounded-2xl border px-4 py-3 text-xs outline-none ${
                    isDarkMode ? 'bg-slate-950/80 border-slate-800 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                  }`}
                />
              </div>

              <div className="pt-4 border-t border-slate-200 dark:border-slate-800/80 flex items-center justify-end gap-3 font-sans">
                <button 
                  type="button" 
                  onClick={() => setSelectedJobForLog(null)} 
                  className={`px-5 py-2.5 rounded-2xl border text-xs font-mono font-bold cursor-pointer transition-all ${
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
                  Log Production Shift
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================================= */}
      {/* MODAL 9: JOB CARD ROUTE TRAVELER & LIVE OPERATION EXECUTION */}
      {/* ========================================================================================= */}
      {activeJobCard && selectedJobForTraveler && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md font-sans overflow-y-auto">
          <div className={`relative w-full max-w-4xl max-h-[90vh] flex flex-col rounded-3xl border shadow-2xl transition-all overflow-hidden ${
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
                  onClick={() => setSelectedJobForTraveler(null)} 
                  className={`p-2.5 rounded-2xl border transition-all cursor-pointer ${
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
                        className={`p-4 rounded-2xl border transition-all cursor-pointer relative overflow-hidden flex flex-col justify-between ${
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
                    className="px-5 py-2.5 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-teal-600 hover:to-emerald-600 text-white font-bold text-xs font-mono shadow-lg shadow-emerald-500/25 flex items-center gap-2 cursor-pointer transition-all hover:scale-105 shrink-0"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>START QC / PDI CHECK</span>
                  </button>
                </div>
              )}

              {/* ACTIVE OPERATION EXECUTION WORKSPACE */}
              {selectedOp && (
                <div className={`p-6 rounded-3xl border transition-all ${
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
                          <div className="text-[10px] text-slate-400 uppercase font-bold">Assigned Machine / Bay</div>
                          <div className="mt-1 font-bold text-slate-200 flex items-center gap-1.5">
                            <Cpu className="w-3.5 h-3.5 text-indigo-400" />
                            <span>{selectedOp.machineId || activeJobCard.machine || 'CNC-01 Vertical Milling'}</span>
                          </div>
                        </div>

                        <div>
                          <div className="text-[10px] text-slate-400 uppercase font-bold">Technician / Operator</div>
                          <div className="mt-1 font-bold text-slate-200 flex items-center gap-1.5">
                            <User className="w-3.5 h-3.5 text-indigo-400" />
                            <span>{selectedOp.operatorName || 'Sachin G. (Lead Machinist)'}</span>
                          </div>
                          <div className="text-[10px] text-emerald-400 mt-0.5 flex items-center gap-1">
                            <ShieldCheck className="w-3 h-3" />
                            <span>Skill Certified: {selectedOp.requiredCertification || 'Level-2 Machinist'}</span>
                          </div>
                        </div>

                        <div>
                          <div className="text-[10px] text-slate-400 uppercase font-bold">QC Inspection Gate</div>
                          <div className="mt-1 font-bold text-emerald-400 flex items-center gap-1.5">
                            <CheckCheck className="w-4 h-4 text-emerald-400" />
                            <span>Passed & Signed Off</span>
                          </div>
                          <div className="text-[10px] text-slate-400 mt-0.5">
                            Heat Lot: {activeJobCard.materialIssuedLot || 'HEAT-LOT-VERIFIED'}
                          </div>
                        </div>
                      </div>

                      {/* Remarks & Readings */}
                      <div className={`p-4 rounded-2xl border text-xs ${isDarkMode ? 'bg-slate-900/60 border-slate-800 text-slate-300' : 'bg-white border-slate-200 text-slate-700'}`}>
                        <div className="text-[10px] font-bold text-slate-400 uppercase mb-1">
                          Activity Logs, Parameter Readings & Operator Remarks:
                        </div>
                        <p className="font-sans text-slate-300">
                          {selectedOp.notes || 'Dimensions verified within 0.02mm tolerance; spindle speed 1200 RPM; coolant checked. All critical parameters inspected OK.'}
                        </p>
                      </div>
                    </div>
                  ) : selectedOp.opStatus === 'IN_PROGRESS' ? (
                    /* SUB-CASE 2: Operation is IN_PROGRESS -> Show Complete Operation Form */
                    <form onSubmit={handleCompleteOpSubmit} className="space-y-4">
                      {/* Active timer banner */}
                      <div className={`p-4 rounded-2xl border flex items-center justify-between ${
                        isDarkMode ? 'bg-purple-950/20 border-purple-500/30 text-purple-300' : 'bg-purple-50 border-purple-200 text-purple-800'
                      }`}>
                        <div className="flex items-center gap-2.5 text-xs font-mono">
                          <Play className="w-4 h-4 text-purple-400 fill-current animate-pulse" />
                          <span>
                            Operation in progress on <strong className="text-white">{selectedOp.machineId || opMachineId || 'Bay'}</strong> by <strong className="text-white">{selectedOp.operatorName || opOperatorName || 'Operator'}</strong>
                          </span>
                        </div>
                        <div className="text-xs font-mono">
                          Started at: <span className="font-bold text-purple-300">{formatStepDateTime(selectedOp.actualStartTime || new Date().toISOString())}</span>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div>
                          <label className="block text-[11px] font-mono uppercase font-bold text-slate-400 mb-1.5">
                            Good Processed Output (NOS) *
                          </label>
                          <input
                            type="number"
                            min="0"
                            required
                            value={opQtyProcessed}
                            onChange={(e) => setOpQtyProcessed(Number(e.target.value))}
                            className={`w-full rounded-2xl border px-4 py-3 text-xs font-mono font-bold outline-none transition-all ${
                              isDarkMode ? 'bg-slate-900 border-slate-800 text-white focus:border-[#5B75F8]' : 'bg-white border-slate-200 text-slate-900 focus:border-[#5B75F8]'
                            }`}
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] font-mono uppercase font-bold text-slate-400 mb-1.5">
                            Rejection / Scrap Qty (NOS)
                          </label>
                          <input
                            type="number"
                            min="0"
                            value={opQtyRejected}
                            onChange={(e) => setOpQtyRejected(Number(e.target.value))}
                            className={`w-full rounded-2xl border px-4 py-3 text-xs font-mono font-bold outline-none transition-all ${
                              isDarkMode ? 'bg-slate-900 border-slate-800 text-rose-400 focus:border-rose-500' : 'bg-white border-slate-200 text-rose-600 focus:border-rose-500'
                            }`}
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] font-mono uppercase font-bold text-slate-400 mb-1.5">
                            Actual Time Spent (Minutes) *
                          </label>
                          <input
                            type="number"
                            min="1"
                            required
                            value={opActualMinutes}
                            onChange={(e) => setOpActualMinutes(Number(e.target.value))}
                            className={`w-full rounded-2xl border px-4 py-3 text-xs font-mono font-bold outline-none transition-all ${
                              isDarkMode ? 'bg-slate-900 border-slate-800 text-indigo-400 focus:border-[#5B75F8]' : 'bg-white border-slate-200 text-indigo-600 focus:border-[#5B75F8]'
                            }`}
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-[11px] font-mono uppercase font-bold text-slate-400 mb-1.5">
                          Activity Logs, Parameter Readings & Operator Remarks
                        </label>
                        <textarea
                          rows={2}
                          value={opNotes}
                          onChange={(e) => setOpNotes(e.target.value)}
                          placeholder="e.g. Dimensions verified within 0.02mm tolerance; spindle speed 1200 RPM; coolant checked."
                          className={`w-full rounded-2xl border px-4 py-3 text-xs outline-none transition-all ${
                            isDarkMode ? 'bg-slate-900 border-slate-800 text-white focus:border-[#5B75F8]' : 'bg-white border-slate-200 text-slate-900 focus:border-[#5B75F8]'
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
                            className="px-5 py-3 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-teal-600 hover:to-emerald-600 text-white font-bold text-xs font-mono cursor-pointer shadow-lg shadow-emerald-500/20 transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 flex items-center gap-2"
                          >
                            <FastForward className={`w-4 h-4 ${isCompletingAllSteps ? 'animate-spin' : ''}`} />
                            <span>{isCompletingAllSteps ? 'Completing All Steps...' : 'Complete All Steps'}</span>
                          </button>
                          <button
                            type="submit"
                            disabled={isExecutingOp || isCompletingAllSteps}
                            className="px-6 py-3 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-teal-600 hover:to-emerald-600 text-white font-bold text-xs font-mono cursor-pointer shadow-lg shadow-emerald-500/20 transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 flex items-center gap-2"
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
                            Assigned Machine / Work Center *
                          </label>
                          <input
                            type="text"
                            required
                            value={opMachineId}
                            onChange={(e) => setOpMachineId(e.target.value)}
                            placeholder="e.g. VMC-01 (Vertical Milling)"
                            className={`w-full rounded-2xl border px-4 py-3 text-xs font-mono outline-none transition-all ${
                              isDarkMode ? 'bg-slate-900 border-slate-800 text-white focus:border-[#5B75F8]' : 'bg-white border-slate-200 text-slate-900 focus:border-[#5B75F8]'
                            }`}
                          />
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
                            className={`w-full rounded-2xl border px-4 py-3 text-xs outline-none transition-all ${
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
                            className="px-5 py-3 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-teal-600 hover:to-emerald-600 text-white font-bold text-xs font-mono cursor-pointer shadow-lg shadow-emerald-500/20 transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 flex items-center gap-2"
                          >
                            <FastForward className={`w-4 h-4 ${isCompletingAllSteps ? 'animate-spin' : ''}`} />
                            <span>{isCompletingAllSteps ? 'Completing All Steps...' : 'Complete All Steps'}</span>
                          </button>
                          <button
                            type="submit"
                            disabled={isExecutingOp || isCompletingAllSteps}
                            className="px-6 py-3 rounded-2xl bg-gradient-to-r from-[#5B75F8] to-indigo-600 hover:from-indigo-600 hover:to-[#5B75F8] text-white font-bold text-xs font-mono cursor-pointer shadow-lg shadow-[#5B75F8]/25 transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 flex items-center gap-2"
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
                onClick={() => setSelectedJobForTraveler(null)}
                className={`px-5 py-2 rounded-2xl border text-xs font-mono font-bold cursor-pointer transition-all ${
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

    </div>
  );
};

export default ProductionView;
