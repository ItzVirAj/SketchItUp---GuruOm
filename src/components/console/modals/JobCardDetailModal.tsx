import React, { useState, useMemo, useEffect } from 'react';
import {
  X,
  Factory,
  Route,
  Layers,
  Clock,
  CheckCircle2,
  Check,
  AlertTriangle,
  Lock,
  Plus,
  ArrowRight,
  ShieldCheck,
  RefreshCw,
  Package,
  Activity,
  History,
  FileText,
  Boxes,
  Flame,
  ChevronRight,
  Sparkles,
  Play,
  CheckSquare
} from 'lucide-react';
import {
  JobCard,
  CustomerOrder,
  ProductionLogReport,
  StockItem,
  MasterItem,
  BillOfMaterials,
  RouteCard,
  QCInspection,
  PDIInspection
} from '../../../types/console';
import { recordInventoryMovement } from '../../../services/supabaseServices';

export interface MaterialConsumptionRecord {
  id: string;
  jobNo: string;
  itemCode: string;
  itemName: string;
  operationSeq?: number;
  operationName?: string;
  plannedQty: number;
  actualQty: number;
  scrapQty: number;
  unit: string;
  heatLotNumber?: string;
  bookedAt: string;
  bookedBy: string;
  notes?: string;
}

interface JobCardDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  jobCard: JobCard | null;
  orders?: CustomerOrder[];
  boms?: BillOfMaterials[];
  routeCards?: RouteCard[];
  stock?: StockItem[];
  masters?: MasterItem[];
  productionLogs?: ProductionLogReport[];
  isDarkMode?: boolean;
  onLogProduction?: (log: Partial<ProductionLogReport>) => void | Promise<any>;
  onStartOperation?: (jobNo: string, payload: any) => Promise<any>;
  onCompleteOperation?: (jobNo: string, payload: any) => Promise<any>;
  onNavigate?: (view: any) => void;
  onSelectOrder?: (orderPo: string) => void;
}

export const JobCardDetailModal: React.FC<JobCardDetailModalProps> = ({
  isOpen,
  onClose,
  jobCard,
  orders = [],
  boms = [],
  routeCards = [],
  stock = [],
  masters = [],
  productionLogs = [],
  isDarkMode = true,
  onLogProduction,
  onStartOperation,
  onCompleteOperation,
  onNavigate,
  onSelectOrder
}) => {
  // Local reactive logs and consumptions for immediate UI feedback without page refresh
  const [localLogs, setLocalLogs] = useState<ProductionLogReport[]>([]);
  const [localConsumptions, setLocalConsumptions] = useState<MaterialConsumptionRecord[]>([]);
  const [activeMobileSection, setActiveMobileSection] = useState<'routes' | 'materials' | 'logs' | 'history'>('routes');

  // Action status messages
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Material booking row state (mapped by componentCode)
  const [toBookInputs, setToBookInputs] = useState<Record<string, { qty: string; scrap: string; heatLot: string }>>({});
  const [isBookingMaterial, setIsBookingMaterial] = useState<string | null>(null);

  // Add Unplanned Material Modal / Form state
  const [showAddMaterialModal, setShowAddMaterialModal] = useState(false);
  const [addMatCode, setAddMatCode] = useState('');
  const [addMatName, setAddMatName] = useState('');
  const [addMatQty, setAddMatQty] = useState('');
  const [addMatScrap, setAddMatScrap] = useState('0');
  const [addMatUnit, setAddMatUnit] = useState('NOS');
  const [addMatHeatLot, setAddMatHeatLot] = useState('');
  const [addMatStepSeq, setAddMatStepSeq] = useState<number>(10);
  const [isAddingCustomMaterial, setIsAddingCustomMaterial] = useState(false);

  // Quick Production Log Modal state
  const [showLogProductionModal, setShowLogProductionModal] = useState(false);
  const [logStepSeq, setLogStepSeq] = useState<number>(10);
  const [logQty, setLogQty] = useState<number>(1);
  const [logMins, setLogMins] = useState<number>(15);
  const [logNotes, setLogNotes] = useState<string>('');
  const [isSubmittingLog, setIsSubmittingLog] = useState(false);

  // Sync / Reset local state when target Job Card changes
  useEffect(() => {
    if (jobCard) {
      // Load initial consumptions from local storage if available for this job card
      const storageKey = `stratum_job_consumptions_${jobCard.jobNo}`;
      try {
        const stored = localStorage.getItem(storageKey);
        if (stored) {
          setLocalConsumptions(JSON.parse(stored));
        } else {
          // Initialize mock initial consumption if already in progress
          if (jobCard.status === 'IN_PROGRESS' || jobCard.status === 'COMPLETED' || jobCard.jobStatus === 'IN_PROGRESS' || jobCard.jobStatus === 'COMPLETED') {
            const initial: MaterialConsumptionRecord[] = [
              {
                id: `mc-${jobCard.jobNo}-01`,
                jobNo: jobCard.jobNo,
                itemCode: 'RM-EN24-RND-50',
                itemName: 'EN24 Alloy Steel Round Bar 50mm Dia',
                operationSeq: 10,
                operationName: 'Billet Saw Cutting',
                plannedQty: (jobCard.targetQty || jobCard.qty || 100) * 1.05,
                actualQty: (jobCard.targetQty || jobCard.qty || 100) * 1.02,
                scrapQty: 2.5,
                unit: 'Kg',
                heatLotNumber: jobCard.materialIssuedLot || 'HT-2026-9921',
                bookedAt: new Date(Date.now() - 3600000 * 4).toISOString(),
                bookedBy: 'Store Supervisor / PPC'
              }
            ];
            setLocalConsumptions(initial);
            localStorage.setItem(storageKey, JSON.stringify(initial));
          } else {
            setLocalConsumptions([]);
          }
        }
      } catch (_) {
        setLocalConsumptions([]);
      }
      setSuccessMsg(null);
      setErrorMsg(null);
    }
  }, [jobCard?.jobNo]);

  // Persist consumptions on update
  const persistConsumptions = (newConsumptions: MaterialConsumptionRecord[]) => {
    setLocalConsumptions(newConsumptions);
    if (jobCard?.jobNo) {
      try {
        localStorage.setItem(`stratum_job_consumptions_${jobCard.jobNo}`, JSON.stringify(newConsumptions));
      } catch (_) {}
    }
  };

  // Resolve matching Customer Order, BOM, and Route Card
  const matchedOrder = orders.find(o => o.poNo === jobCard?.orderPo || o.id === jobCard?.orderPo || o.id === jobCard?.orderId);
  const cleanPartCode = (jobCard?.partCode || '').toLowerCase().trim();
  const cleanPartDesc = (jobCard?.partDescription || '').toLowerCase().trim();

  const matchedBOM = boms.find(b => 
    (cleanPartCode && b.parentPartCode?.toLowerCase().trim() === cleanPartCode) ||
    (cleanPartDesc && b.parentPartName?.toLowerCase().trim() === cleanPartDesc)
  ) || boms[0] || null;

  const matchedRoute = routeCards.find(r => 
    (cleanPartCode && r.partCode?.toLowerCase().trim() === cleanPartCode) ||
    (cleanPartCode && r.routeCode?.toLowerCase().trim() === cleanPartCode) ||
    (cleanPartDesc && r.partDescription?.toLowerCase().trim() === cleanPartDesc)
  ) || routeCards[0] || null;

  // Target Quantity resolved from Job Card or matched Customer PO
  const targetQuantity = Number(
    jobCard?.targetQty || 
    jobCard?.qty || 
    matchedOrder?.lines?.find(l => l.partCode === jobCard?.partCode)?.orderQty || 
    matchedOrder?.lines?.[0]?.orderQty || 
    matchedOrder?.totalQty || 
    100
  );

  // Operations defined on Route Card or fallback standard sequence
  const routeOperations = useMemo(() => {
    if (jobCard?.operations && jobCard.operations.length > 0) {
      return jobCard.operations.map(op => ({
        sequenceNo: Number(op.sequenceNo),
        operationName: op.operationName,
        workCenter: op.machineId || 'Machining Bay',
        standardTimeMinutes: Number(op.standardTimeMinutes || 15),
        inspectionRequired: Boolean(op.inspectionRequired)
      })).sort((a, b) => a.sequenceNo - b.sequenceNo);
    }
    if (matchedRoute && matchedRoute.operations && matchedRoute.operations.length > 0) {
      return matchedRoute.operations.map(op => ({
        sequenceNo: Number(op.sequenceNo),
        operationName: op.operationName,
        workCenter: op.workCenter || 'Machining Bay',
        standardTimeMinutes: Number(op.standardTimeMinutes || 15),
        inspectionRequired: Boolean(op.inspectionRequired)
      })).sort((a, b) => a.sequenceNo - b.sequenceNo);
    }
    return [
      { sequenceNo: 10, operationName: 'Raw Material Saw Cutting', workCenter: 'BANDSAW-01', standardTimeMinutes: 8, inspectionRequired: false },
      { sequenceNo: 20, operationName: 'CNC Facing, Turning & Grooving', workCenter: 'CNC-LATHE-01', standardTimeMinutes: 20, inspectionRequired: false },
      { sequenceNo: 30, operationName: 'PCD Hole Pattern Drilling & Tapping', workCenter: 'RADIAL-DRILL-01', standardTimeMinutes: 15, inspectionRequired: false },
      { sequenceNo: 40, operationName: 'Surface Flatness & Dimensional QC', workCenter: 'QC-LAB', standardTimeMinutes: 10, inspectionRequired: true },
      { sequenceNo: 50, operationName: 'Rust Preventive Dipping & Wrapping', workCenter: 'PACK-01', standardTimeMinutes: 5, inspectionRequired: false }
    ];
  }, [jobCard, matchedRoute]);

  // Merge all Production Logs for this Job Card (global + local reactive entries)
  const allJobLogs = useMemo(() => {
    if (!jobCard?.jobNo) return [];
    const fromGlobal = productionLogs.filter(l => l.jobNo === jobCard.jobNo);
    const combined = [...localLogs, ...fromGlobal];
    // Deduplicate by id if any
    const seen = new Set<string>();
    const unique: ProductionLogReport[] = [];
    for (const log of combined) {
      const key = log.id || `${log.jobNo}-${log.stepNo}-${log.loggedTimestamp}-${log.qtyDone}`;
      if (!seen.has(key)) {
        seen.add(key);
        unique.push(log);
      }
    }
    // Reverse chronological (newest first)
    return unique.sort((a, b) => new Date(b.loggedTimestamp).getTime() - new Date(a.loggedTimestamp).getTime());
  }, [productionLogs, localLogs, jobCard?.jobNo]);

  // Calculate live cumulative logged quantity per route step sequence
  const loggedQtyPerStep = useMemo(() => {
    const map: Record<number, number> = {};
    for (const log of allJobLogs) {
      const seq = Number(log.stepNo);
      map[seq] = (map[seq] || 0) + Number(log.qtyDone || 0);
    }
    return map;
  }, [allJobLogs]);

  // Compute live step progress and sequential gating
  const stepProgressList = useMemo(() => {
    let previousStepCompleted = true;

    return routeOperations.map((op) => {
      const loggedQty = loggedQtyPerStep[op.sequenceNo] || 0;
      const isCompleted = loggedQty >= targetQuantity;
      const remainingQty = Math.max(0, targetQuantity - loggedQty);
      const isReachable = previousStepCompleted; // sequential gating rule

      if (!isCompleted) {
        previousStepCompleted = false;
      }

      return {
        ...op,
        loggedQty,
        remainingQty,
        isCompleted,
        isReachable,
        isNextIncomplete: !isCompleted && isReachable
      };
    });
  }, [routeOperations, loggedQtyPerStep, targetQuantity]);

  // Available incomplete steps (reachable first, then any incomplete)
  const incompleteSteps = useMemo(() => {
    const reachable = stepProgressList.filter(s => !s.isCompleted && s.isReachable);
    return reachable.length > 0 ? reachable : stepProgressList.filter(s => !s.isCompleted);
  }, [stepProgressList]);

  // Summary figures
  const totalStepsCount = routeOperations.length;
  const completedStepsCount = stepProgressList.filter(s => s.isCompleted).length;
  const nextIncompleteStep = stepProgressList.find(s => !s.isCompleted && s.isReachable) || stepProgressList.find(s => !s.isCompleted);
  const allStepsDone = completedStepsCount >= totalStepsCount && totalStepsCount > 0;

  // Active step selected in Log Production modal
  const selectedStepData = useMemo(() => {
    const found = stepProgressList.find(s => s.sequenceNo === Number(logStepSeq));
    if (found && !found.isCompleted) return found;
    return incompleteSteps[0] || stepProgressList[0] || null;
  }, [stepProgressList, logStepSeq, incompleteSteps]);

  // Maximum allowed log quantity (cannot exceed remaining PO target)
  const maxLoggableQty = useMemo(() => {
    if (!selectedStepData) return 1;
    const rem = targetQuantity - (selectedStepData.loggedQty || 0);
    return Math.max(1, rem);
  }, [selectedStepData, targetQuantity]);

  // Derive BOM planned components and live consumed quantities
  const rawMaterialRequirements = useMemo(() => {
    const components = matchedBOM?.components && matchedBOM.components.length > 0 ? matchedBOM.components : [
      {
        componentCode: 'RM-EN24-RND-50',
        componentName: 'EN24 Alloy Steel Round Bar 50mm Dia',
        qtyPerUnit: 1.2,
        uom: 'Kg',
        scrapAllowancePct: 5,
        unitCost: 145
      },
      {
        componentCode: 'RM-COOLANT-SYNTH',
        componentName: 'Synthetic Soluble Cutting Oil 5L',
        qtyPerUnit: 0.05,
        uom: 'Litre',
        scrapAllowancePct: 2,
        unitCost: 320
      }
    ];

    return components.map((comp, idx) => {
      const plannedTotal = Number((comp.qtyPerUnit * targetQuantity * (1 + (comp.scrapAllowancePct || 0) / 100)).toFixed(2));
      
      // Calculate total actual booked for this component across all bookings
      const totalBooked = localConsumptions
        .filter(c => c.itemCode.toLowerCase().trim() === comp.componentCode.toLowerCase().trim())
        .reduce((sum, c) => sum + Number(c.actualQty || 0), 0);

      const remainingLeft = Math.max(0, Number((plannedTotal - totalBooked).toFixed(2)));
      
      // Assign to operation step (first step 10 for primary RM, next steps for secondary)
      const assignedStepSeq = idx === 0 ? 10 : (idx + 1) * 10;
      const assignedOp = routeOperations.find(o => o.sequenceNo === assignedStepSeq) || routeOperations[0];

      return {
        componentCode: comp.componentCode,
        componentName: comp.componentName,
        uom: comp.uom || 'Nos',
        plannedTotal,
        totalBooked,
        remainingLeft,
        assignedStepSeq: assignedOp?.sequenceNo || 10,
        assignedOpName: assignedOp?.operationName || 'Initial Stage'
      };
    });
  }, [matchedBOM, targetQuantity, localConsumptions, routeOperations]);

  // Combined Material items (BOM Planned + Any Custom Added Materials)
  const allMaterialRows = useMemo(() => {
    const rows = [...rawMaterialRequirements];
    
    // Check for custom materials booked that are not in BOM
    const bomCodes = new Set(rawMaterialRequirements.map(r => r.componentCode.toLowerCase().trim()));
    const customBookings = localConsumptions.filter(c => !bomCodes.has(c.itemCode.toLowerCase().trim()));
    
    // Group custom bookings by itemCode
    const customGrouped: Record<string, MaterialConsumptionRecord[]> = {};
    for (const c of customBookings) {
      const k = c.itemCode;
      if (!customGrouped[k]) customGrouped[k] = [];
      customGrouped[k].push(c);
    }

    for (const [code, list] of Object.entries(customGrouped)) {
      const first = list[0];
      const totalBooked = list.reduce((sum, c) => sum + Number(c.actualQty || 0), 0);
      rows.push({
        componentCode: code,
        componentName: `${first.itemName} (Custom / Unplanned)`,
        uom: first.unit || 'Nos',
        plannedTotal: first.plannedQty || totalBooked,
        totalBooked,
        remainingLeft: 0,
        assignedStepSeq: first.operationSeq || 10,
        assignedOpName: first.operationName || 'Ad-hoc Stage'
      });
    }

    return rows;
  }, [rawMaterialRequirements, localConsumptions]);

  // Map material needed per route step for the Route Steps table
  const materialNeededPerStep = useMemo(() => {
    const map: Record<number, { code: string; req: number; left: number; uom: string }[]> = {};
    for (const mat of allMaterialRows) {
      const seq = mat.assignedStepSeq;
      if (!map[seq]) map[seq] = [];
      map[seq].push({
        code: mat.componentCode,
        req: mat.plannedTotal,
        left: mat.remainingLeft,
        uom: mat.uom
      });
    }
    return map;
  }, [allMaterialRows]);

  // Helper for live input updates
  const handleInputChange = (code: string, field: 'qty' | 'scrap' | 'heatLot', val: string) => {
    setToBookInputs(prev => ({
      ...prev,
      [code]: {
        qty: prev[code]?.qty || '',
        scrap: prev[code]?.scrap || '0',
        heatLot: prev[code]?.heatLot || jobCard.materialIssuedLot || 'HT-2026-9921',
        [field]: val
      }
    }));
  };

  // ----------------------------------------------------------------
  // MATERIAL CONSUMPTION BOOKING HANDLER
  // ----------------------------------------------------------------
  const handleBookMaterialSubmit = async (materialRow: typeof allMaterialRows[0]) => {
    const input = toBookInputs[materialRow.componentCode];
    const qtyToBook = Number(input?.qty || materialRow.remainingLeft || 0);

    if (qtyToBook <= 0) {
      setErrorMsg(`Please enter a valid quantity to book for ${materialRow.componentCode}.`);
      return;
    }

    try {
      setIsBookingMaterial(materialRow.componentCode);
      setErrorMsg(null);
      setSuccessMsg(null);

      const scrapVal = Number(input?.scrap || 0);
      const heatLotVal = input?.heatLot || jobCard.materialIssuedLot || 'HT-2026-9921';
      const nowIso = new Date().toISOString();

      // 1. Post signed ledger-based inventory movement (movementType: 'CONSUMPTION', negative quantityChange)
      await recordInventoryMovement({
        itemCode: materialRow.componentCode,
        quantityChange: -qtyToBook,
        movementType: 'CONSUMPTION',
        referenceId: jobCard.jobNo,
        referenceType: 'JOB_CARD',
        notes: `Production consumption for Job #${jobCard.jobNo} (${materialRow.assignedOpName}) • Heat/Lot: ${heatLotVal} • Scrap: ${scrapVal} ${materialRow.uom}`
      }).catch(err => console.warn('Ledger movement background warn:', err));

      // 2. Create MaterialConsumption Record
      const newConsumption: MaterialConsumptionRecord = {
        id: `mc-${jobCard.jobNo}-${Date.now()}`,
        jobNo: jobCard.jobNo,
        itemCode: materialRow.componentCode,
        itemName: materialRow.componentName,
        operationSeq: materialRow.assignedStepSeq,
        operationName: materialRow.assignedOpName,
        plannedQty: materialRow.plannedTotal,
        actualQty: qtyToBook,
        scrapQty: scrapVal,
        unit: materialRow.uom,
        heatLotNumber: heatLotVal,
        bookedAt: nowIso,
        bookedBy: 'Shopfloor Operator / PPC',
        notes: `Booked ${qtyToBook} ${materialRow.uom} against ${materialRow.assignedOpName}`
      };

      const updatedConsumptions = [newConsumption, ...localConsumptions];
      persistConsumptions(updatedConsumptions);

      // Clear input
      setToBookInputs(prev => ({
        ...prev,
        [materialRow.componentCode]: { qty: '', scrap: '0', heatLot: heatLotVal }
      }));

      setSuccessMsg(`Successfully booked ${qtyToBook} ${materialRow.uom} for ${materialRow.componentCode}. Ledger updated.`);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to book material consumption.');
    } finally {
      setIsBookingMaterial(null);
    }
  };

  // ----------------------------------------------------------------
  // ADD CUSTOM MATERIAL HANDLER
  // ----------------------------------------------------------------
  const handleAddCustomMaterialSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const qty = Number(addMatQty);
    if (!addMatCode || qty <= 0) {
      setErrorMsg('Please specify component code and a positive quantity.');
      return;
    }

    try {
      setIsAddingCustomMaterial(true);
      setErrorMsg(null);
      setSuccessMsg(null);

      const scrapVal = Number(addMatScrap || 0);
      const heatLotVal = addMatHeatLot || jobCard.materialIssuedLot || 'HT-2026-CUSTOM';
      const nowIso = new Date().toISOString();
      const op = routeOperations.find(o => o.sequenceNo === Number(addMatStepSeq)) || routeOperations[0];

      // 1. Post ledger movement
      await recordInventoryMovement({
        itemCode: addMatCode,
        quantityChange: -qty,
        movementType: 'CONSUMPTION',
        referenceId: jobCard.jobNo,
        referenceType: 'JOB_CARD',
        notes: `Unplanned material booking for Job #${jobCard.jobNo} (${op.operationName}) • Heat/Lot: ${heatLotVal}`
      }).catch(err => console.warn('Ledger movement background warn:', err));

      // 2. Create consumption record
      const newConsumption: MaterialConsumptionRecord = {
        id: `mc-${jobCard.jobNo}-${Date.now()}`,
        jobNo: jobCard.jobNo,
        itemCode: addMatCode,
        itemName: addMatName || addMatCode,
        operationSeq: op.sequenceNo,
        operationName: op.operationName,
        plannedQty: qty,
        actualQty: qty,
        scrapQty: scrapVal,
        unit: addMatUnit,
        heatLotNumber: heatLotVal,
        bookedAt: nowIso,
        bookedBy: 'Shopfloor Lead / PPC',
        notes: 'Unplanned ad-hoc material issue'
      };

      persistConsumptions([newConsumption, ...localConsumptions]);

      setShowAddMaterialModal(false);
      setAddMatCode('');
      setAddMatName('');
      setAddMatQty('');
      setAddMatScrap('0');
      setSuccessMsg(`Added & booked ${qty} ${addMatUnit} of ${addMatCode} to Job Card.`);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to add custom material.');
    } finally {
      setIsAddingCustomMaterial(false);
    }
  };

  // ----------------------------------------------------------------
  // PRODUCTION LOGGING HANDLER
  // ----------------------------------------------------------------
  const handleLogProductionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const op = selectedStepData || routeOperations.find(o => o.sequenceNo === Number(logStepSeq)) || routeOperations[0];
    const prevTotal = loggedQtyPerStep[op.sequenceNo] || 0;
    const remainingForStep = Math.max(0, targetQuantity - prevTotal);

    if (logQty <= 0) {
      setErrorMsg('Please enter a valid positive quantity produced.');
      return;
    }

    if (logQty > remainingForStep) {
      setErrorMsg(`Quantity (${logQty} NOS) exceeds remaining PO target (${remainingForStep} NOS) for Step ${op.sequenceNo}.`);
      return;
    }

    try {
      setIsSubmittingLog(true);
      setErrorMsg(null);
      setSuccessMsg(null);

      const nowIso = new Date().toISOString();

      const newLog: ProductionLogReport = {
        id: `pl-${jobCard.jobNo}-${Date.now()}`,
        jobNo: jobCard.jobNo,
        itemCode: jobCard.partCode,
        description: jobCard.partDescription,
        stepNo: op.sequenceNo,
        operationName: op.operationName,
        qtyDone: logQty,
        loggedTimestamp: nowIso
      };

      // Call parent handler if available
      if (onLogProduction) {
        await onLogProduction(newLog);
      }

      setLocalLogs(prev => [newLog, ...prev]);

      // Check if step now reached target
      const newTotal = prevTotal + logQty;
      const isNowDone = newTotal >= targetQuantity;

      setShowLogProductionModal(false);
      setLogQty(1);
      setSuccessMsg(`Logged ${logQty} NOS output for Step ${op.sequenceNo} (${op.operationName}). Cumulative: ${newTotal}/${targetQuantity} NOS${isNowDone ? ' — Step Complete! ✓' : ''}`);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to log production output.');
    } finally {
      setIsSubmittingLog(false);
    }
  };

  // Helper for formatting timestamps
  const formatDateTime = (isoString?: string) => {
    if (!isoString) return '—';
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

  if (!isOpen || !jobCard) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4 bg-slate-950/85 backdrop-blur-md font-sans overflow-y-auto">
      <div className={`relative w-full max-w-5xl h-[100dvh] sm:h-auto sm:max-h-[92vh] flex flex-col rounded-none sm:rounded-3xl border shadow-2xl transition-ui overflow-hidden ${
        isDarkMode 
          ? 'bg-slate-900/95 border-slate-800 text-white backdrop-blur-2xl shadow-[#5B75F8]/10' 
          : 'bg-white border-slate-200 text-slate-900 shadow-2xl'
      }`}>
        
        {/* ========================================================================= */}
        {/* 1. HEADER BLOCK */}
        {/* ========================================================================= */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 sm:px-6 py-4 sm:py-5 border-b border-slate-200 dark:border-slate-800/90 bg-slate-50/80 dark:bg-slate-950/60 shrink-0">
          <div className="flex items-start sm:items-center gap-3">
            <div className="p-2.5 sm:p-3 rounded-2xl bg-gradient-to-tr from-[#5B75F8] to-indigo-600 text-white shadow-md shadow-[#5B75F8]/20 shrink-0">
              <Factory className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-lg sm:text-xl font-bold font-mono tracking-tight text-[#5B75F8] dark:text-[#7B92FF]">
                  {jobCard.jobNo}
                </h2>

                {/* Status Badge */}
                <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-xl text-[11px] font-mono font-bold uppercase border ${
                  allStepsDone || jobCard.jobStatus === 'COMPLETED' || jobCard.status === 'COMPLETED'
                    ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                    : jobCard.jobStatus === 'QC_HOLD' || jobCard.status === 'QC_HOLD'
                    ? 'bg-rose-500/15 text-rose-400 border-rose-500/30'
                    : jobCard.jobStatus === 'IN_PROGRESS' || jobCard.status === 'IN_PROGRESS' || jobCard.status === 'RUNNING' || completedStepsCount > 0
                    ? 'bg-purple-500/15 text-purple-300 border-purple-500/30 animate-pulse'
                    : 'bg-[#5B75F8]/15 text-[#7B92FF] border-[#5B75F8]/30'
                }`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${
                    allStepsDone || jobCard.jobStatus === 'COMPLETED' || jobCard.status === 'COMPLETED'
                      ? 'bg-emerald-400'
                      : jobCard.jobStatus === 'QC_HOLD' || jobCard.status === 'QC_HOLD'
                      ? 'bg-rose-400'
                      : 'bg-purple-400'
                  }`} />
                  <span>
                    {allStepsDone ? 'COMPLETED' : (jobCard.jobStatus || jobCard.status || 'PLANNED')}
                  </span>
                </span>

                {jobCard.drawingRevision && (
                  <span className="px-2 py-0.5 rounded-lg text-[10px] font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    Rev: {jobCard.drawingRevision}
                  </span>
                )}
              </div>

              {/* Part Description and Customer PO */}
              <p className={`text-xs mt-1 truncate ${isDarkMode ? 'text-slate-300' : 'text-slate-600'}`}>
                <span className="font-bold text-slate-100 dark:text-white">{jobCard.partCode}</span> — {jobCard.partDescription}
              </p>
              <div className="flex items-center gap-2 mt-0.5 text-[11px] font-mono text-slate-400">
                <span>PO: <strong className="text-indigo-400">{jobCard.orderPo}</strong></span>
                <span>•</span>
                <span className="truncate">
                  {allStepsDone ? (
                    <span className="text-emerald-400 font-bold">Ready for PDI</span>
                  ) : (
                    <span>Next: <strong className="text-indigo-300">{nextIncompleteStep ? `Op ${nextIncompleteStep.sequenceNo}` : 'Production'}</strong></span>
                  )}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between sm:justify-end gap-2 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-800/60">
            {allStepsDone ? (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  if (onSelectOrder && jobCard.orderPo) {
                    onSelectOrder(jobCard.orderPo);
                  } else if (onNavigate) {
                    onNavigate('qc');
                  }
                }}
                className="flex-1 sm:flex-initial px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white text-xs font-mono font-bold shadow-md flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>QC / PDI →</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  const target = nextIncompleteStep || incompleteSteps[0] || stepProgressList[0];
                  if (target) {
                    setLogStepSeq(target.sequenceNo);
                    const rem = Math.max(1, targetQuantity - (target.loggedQty || 0));
                    setLogQty(rem);
                  }
                  setShowLogProductionModal(true);
                }}
                className="flex-1 sm:flex-initial px-4 py-2 rounded-xl bg-gradient-to-r from-[#5B75F8] to-indigo-600 text-white text-xs font-mono font-bold shadow-md flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Log Production</span>
              </button>
            )}
            <button
              onClick={onClose}
              className={`p-2 rounded-2xl border transition-ui cursor-pointer ${
                isDarkMode 
                  ? 'border-slate-800 bg-slate-950/60 text-slate-400 hover:text-white hover:bg-slate-800' 
                  : 'border-slate-200 bg-slate-50 text-slate-500 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* SUMMARY KPI CARDS (Both Mobile & PC View) */}
        {/* ========================================================================= */}
        <div className={`p-3.5 sm:p-5 border-b shrink-0 transition-ui ${
          isDarkMode 
            ? 'bg-slate-950/40 border-slate-800/80 backdrop-blur-xl' 
            : 'bg-slate-50/70 border-slate-200'
        }`}>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
            
            {/* Card 1: Target Output */}
            <div className={`p-3 sm:p-3.5 rounded-2xl border transition-ui relative overflow-hidden group ${
              isDarkMode 
                ? 'bg-gradient-to-b from-slate-900/90 to-slate-950/90 border-slate-800/90 hover:border-emerald-500/40 shadow-xs' 
                : 'bg-white border-slate-200/90 hover:border-emerald-500/30 shadow-xs'
            }`}>
              <div className="flex items-center justify-between gap-2">
                <span className="text-[10px] font-mono uppercase font-bold text-slate-400 tracking-wider">
                  Target Qty
                </span>
                <div className="p-1.5 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  <Package className="w-3.5 h-3.5" />
                </div>
              </div>
              <div className="mt-1 flex items-baseline gap-1.5 font-mono">
                <span className={`text-base sm:text-lg font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                  {targetQuantity}
                </span>
                <span className="text-xs font-semibold text-emerald-400">NOS</span>
              </div>
              <div className="mt-0.5 text-[10px] font-mono text-slate-400 truncate">
                Customer PO Target
              </div>
            </div>

            {/* Card 2: Target Date */}
            <div className={`p-3 sm:p-3.5 rounded-2xl border transition-ui relative overflow-hidden group ${
              isDarkMode 
                ? 'bg-gradient-to-b from-slate-900/90 to-slate-950/90 border-slate-800/90 hover:border-amber-500/40 shadow-xs' 
                : 'bg-white border-slate-200/90 hover:border-amber-500/30 shadow-xs'
            }`}>
              <div className="flex items-center justify-between gap-2">
                <span className="text-[10px] font-mono uppercase font-bold text-slate-400 tracking-wider">
                  Target Delivery
                </span>
                <div className="p-1.5 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
                  <Clock className="w-3.5 h-3.5" />
                </div>
              </div>
              <div className="mt-1 font-mono font-bold text-amber-400 text-sm sm:text-base truncate">
                {jobCard.targetDate || '2026-08-30'}
              </div>
              <div className="mt-0.5 text-[10px] font-mono text-slate-400 truncate">
                Shift Commitment
              </div>
            </div>

            {/* Card 3: Route Progress */}
            <div className={`p-3 sm:p-3.5 rounded-2xl border transition-ui relative overflow-hidden group ${
              isDarkMode 
                ? 'bg-gradient-to-b from-slate-900/90 to-slate-950/90 border-slate-800/90 hover:border-[#5B75F8]/40 shadow-xs' 
                : 'bg-white border-slate-200/90 hover:border-[#5B75F8]/30 shadow-xs'
            }`}>
              <div className="flex items-center justify-between gap-2">
                <span className="text-[10px] font-mono uppercase font-bold text-slate-400 tracking-wider">
                  Route Execution
                </span>
                <div className="p-1.5 rounded-xl bg-[#5B75F8]/10 text-[#7B92FF] border border-[#5B75F8]/20">
                  <Route className="w-3.5 h-3.5" />
                </div>
              </div>
              <div className="mt-1 flex items-baseline gap-2 font-mono">
                <span className={`text-base sm:text-lg font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                  {completedStepsCount} / {totalStepsCount}
                </span>
                <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-md bg-[#5B75F8]/15 text-[#7B92FF] border border-[#5B75F8]/25">
                  {Math.round((completedStepsCount / (totalStepsCount || 1)) * 100)}%
                </span>
              </div>
              <div className="mt-0.5 text-[10px] font-mono text-slate-400 truncate">
                {allStepsDone ? 'All stages completed ✓' : `${totalStepsCount - completedStepsCount} stages remaining`}
              </div>
            </div>

            {/* Card 4: Next Milestone */}
            <div className={`p-3 sm:p-3.5 rounded-2xl border transition-ui relative overflow-hidden group ${
              isDarkMode 
                ? 'bg-gradient-to-b from-slate-900/90 to-slate-950/90 border-slate-800/90 hover:border-purple-500/40 shadow-xs' 
                : 'bg-white border-slate-200/90 hover:border-purple-500/30 shadow-xs'
            }`}>
              <div className="flex items-center justify-between gap-2">
                <span className="text-[10px] font-mono uppercase font-bold text-slate-400 tracking-wider">
                  Next Milestone
                </span>
                <div className={`p-1.5 rounded-xl border ${
                  allStepsDone
                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                    : 'bg-purple-500/10 text-purple-400 border border-purple-500/20'
                }`}>
                  {allStepsDone ? <ShieldCheck className="w-3.5 h-3.5" /> : <Sparkles className="w-3.5 h-3.5" />}
                </div>
              </div>
              <div className={`mt-1 font-mono font-bold text-xs sm:text-sm truncate ${
                allStepsDone ? 'text-emerald-400' : 'text-indigo-400 dark:text-[#7B92FF]'
              }`}>
                {allStepsDone ? 'Pre-Dispatch QC (PDI)' : nextIncompleteStep ? `Op ${nextIncompleteStep.sequenceNo}: ${nextIncompleteStep.operationName}` : 'In Production'}
              </div>
              <div className="mt-0.5 text-[10px] font-mono text-slate-400 truncate">
                {allStepsDone ? 'Ready for final inspection' : nextIncompleteStep ? `Work Center: ${nextIncompleteStep.workCenter}` : 'Pending line release'}
              </div>
            </div>

          </div>
        </div>

        {/* ========================================================================= */}
        {/* MOBILE SECTION NAVIGATION BAR (Viewport < md) */}
        {/* ========================================================================= */}
        <div className={`flex md:hidden items-center gap-1.5 p-2.5 border-b overflow-x-auto scrollbar-none shrink-0 ${
          isDarkMode ? 'bg-slate-950/80 border-slate-800' : 'bg-slate-100/90 border-slate-200'
        }`}>
          {[
            { id: 'routes', label: 'Route Steps', icon: Route, count: `${completedStepsCount}/${totalStepsCount}` },
            { id: 'materials', label: 'BOM Materials', icon: Layers, count: allMaterialRows.length },
            { id: 'logs', label: 'Shift Logs', icon: Activity, count: allJobLogs.length },
            { id: 'history', label: 'History', icon: History, count: localConsumptions.length },
          ].map(tab => {
            const isActive = activeMobileSection === tab.id;
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveMobileSection(tab.id as any)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-mono font-bold whitespace-nowrap transition-ui cursor-pointer border ${
                  isActive
                    ? 'bg-[#5B75F8] text-white border-[#5B75F8] shadow-sm'
                    : isDarkMode 
                      ? 'bg-slate-900/80 text-slate-400 border-slate-800 hover:text-white' 
                      : 'bg-white text-slate-600 border-slate-200 hover:text-slate-900'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                  isActive 
                    ? 'bg-white/25 text-white' 
                    : isDarkMode ? 'bg-slate-800 text-slate-400' : 'bg-slate-200 text-slate-700'
                }`}>
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* ========================================================================= */}
        {/* SCROLLABLE BODY CONTENT */}
        {/* ========================================================================= */}
        <div className="p-4 sm:p-6 space-y-6 sm:space-y-7 overflow-y-auto flex-1 font-sans">
          
          {/* Feedback alerts */}
          {errorMsg && (
            <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-mono flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}
          {successMsg && (
            <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-mono flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* ========================================================================= */}
          {/* 2. ROUTE STEPS SECTION (Desktop Table + Mobile Stepper Cards) */}
          {/* ========================================================================= */}
          <div className={`space-y-3 ${activeMobileSection === 'routes' ? 'block' : 'hidden md:block'}`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Route className="w-4 h-4 text-[#5B75F8]" />
                <h3 className={`font-bold text-sm font-mono tracking-tight ${isDarkMode ? 'text-slate-200' : 'text-slate-800'}`}>
                  Route Steps
                </h3>
              </div>
              <span className="text-[11px] font-mono text-slate-400">
                {completedStepsCount} of {totalStepsCount} Executed ({Math.round((completedStepsCount / (totalStepsCount || 1)) * 100)}%)
              </span>
            </div>

            {/* Desktop Table View */}
            <div className={`hidden md:block rounded-2xl border overflow-hidden transition-ui shadow-sm ${
              isDarkMode ? 'bg-slate-950/60 border-slate-800' : 'bg-white border-slate-200'
            }`}>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse font-mono">
                  <thead>
                    <tr className={`border-b font-bold uppercase tracking-wider text-[10px] ${
                      isDarkMode ? 'bg-slate-900/80 border-slate-800 text-slate-400' : 'bg-slate-100 border-slate-200 text-slate-500'
                    }`}>
                      <th className="py-3 px-4 w-14">Seq</th>
                      <th className="py-3 px-4">Operation</th>
                      <th className="py-3 px-4">Machine</th>
                      <th className="py-3 px-4 text-center">Progress</th>
                      <th className="py-3 px-4">Material Needed</th>
                      <th className="py-3 px-4 text-right">Std Time</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-800/60">
                    {stepProgressList.map((step) => {
                      const mats = materialNeededPerStep[step.sequenceNo] || [];

                      return (
                        <tr
                          key={step.sequenceNo}
                          className={`transition-colors ${
                            !step.isReachable && !step.isCompleted
                              ? isDarkMode ? 'opacity-40 bg-slate-950/20' : 'opacity-40 bg-slate-100/50'
                              : step.isNextIncomplete
                              ? isDarkMode ? 'bg-[#5B75F8]/10' : 'bg-indigo-50/70'
                              : isDarkMode ? 'hover:bg-slate-800/40' : 'hover:bg-slate-50'
                          }`}
                        >
                          <td className="py-3 px-4 font-bold text-slate-400">
                            <div className="flex items-center gap-1.5">
                              {!step.isReachable && !step.isCompleted && <Lock className="w-3 h-3 text-slate-500 shrink-0" />}
                              <span>{step.sequenceNo}</span>
                            </div>
                          </td>
                          <td className={`py-3 px-4 font-sans font-semibold ${isDarkMode ? 'text-slate-200' : 'text-slate-800'}`}>
                            <div className="flex items-center gap-1.5">
                              <span>{step.operationName}</span>
                              {step.inspectionRequired && (
                                <span className="px-1.5 py-0.2 rounded text-[9px] font-mono bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                                  QC Gate
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="py-3 px-4 text-purple-400 font-medium">
                            {step.workCenter}
                          </td>
                          <td className="py-3 px-4 text-center">
                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-mono font-bold ${
                              step.isCompleted
                                ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                                : step.loggedQty > 0
                                ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                                : 'bg-slate-800/60 text-slate-400 border border-slate-700'
                            }`}>
                              <span>{step.loggedQty} / {targetQuantity}</span>
                              {step.isCompleted && <Check className="w-3.5 h-3.5 text-emerald-400 stroke-[2.5]" />}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-xs font-mono">
                            {mats.length > 0 ? (
                              <div className="space-y-1">
                                {mats.map((m, mIdx) => (
                                  <div key={mIdx} className="flex items-center gap-1.5">
                                    <span className={`font-bold ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>{m.code}:</span>
                                    <span className={isDarkMode ? 'text-slate-400' : 'text-slate-600'}>{m.req} {m.uom}</span>
                                    <span className={`font-bold ${m.left > 0 ? (isDarkMode ? 'text-amber-400' : 'text-amber-600') : (isDarkMode ? 'text-emerald-400' : 'text-emerald-600')}`}>
                                      (left {m.left} {m.uom})
                                    </span>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <span className={isDarkMode ? 'text-slate-500' : 'text-slate-400'}>—</span>
                            )}
                          </td>
                          <td className={`py-3 px-4 text-right font-mono ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                            {step.standardTimeMinutes || 15} mins
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Mobile Stepper Cards (Viewport < md) */}
            <div className="block md:hidden space-y-3">
              {stepProgressList.map((step) => {
                const mats = materialNeededPerStep[step.sequenceNo] || [];
                const pct = Math.min(100, Math.round(((step.loggedQty || 0) / (targetQuantity || 1)) * 100));

                return (
                  <div
                    key={step.sequenceNo}
                    className={`p-4 rounded-2xl border transition-ui space-y-3 shadow-xs ${
                      step.isCompleted
                        ? isDarkMode ? 'bg-slate-950/70 border-emerald-500/30' : 'bg-emerald-50/40 border-emerald-200'
                        : step.isNextIncomplete
                        ? isDarkMode ? 'bg-[#5B75F8]/10 border-[#5B75F8]/40 shadow-xs' : 'bg-indigo-50/80 border-indigo-200'
                        : !step.isReachable
                        ? isDarkMode ? 'bg-slate-950/40 border-slate-800/60 opacity-60' : 'bg-slate-100/60 border-slate-200 opacity-60'
                        : isDarkMode ? 'bg-slate-950/70 border-slate-800' : 'bg-white border-slate-200'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <span className={`w-8 h-8 rounded-xl flex items-center justify-center text-xs font-mono font-bold border shrink-0 ${
                          step.isCompleted
                            ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                            : step.isNextIncomplete
                            ? 'bg-[#5B75F8]/20 text-[#7B92FF] border-[#5B75F8]/50'
                            : 'bg-slate-800 text-slate-400 border-slate-700'
                        }`}>
                          {step.isCompleted ? <Check className="w-4 h-4 stroke-[3]" /> : step.sequenceNo}
                        </span>
                        <div>
                          <h4 className={`text-xs font-bold font-sans ${isDarkMode ? 'text-slate-100' : 'text-slate-900'}`}>
                            {step.operationName}
                          </h4>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className="text-[10px] font-mono font-medium text-purple-400">
                              {step.workCenter}
                            </span>
                            {step.inspectionRequired && (
                              <span className="px-1.5 py-0.2 rounded text-[9px] font-mono bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                                QC Gate
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <span className={`px-2 py-0.5 rounded-lg text-[10px] font-mono font-bold uppercase border shrink-0 ${
                        step.isCompleted
                          ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                          : step.isNextIncomplete
                          ? 'bg-[#5B75F8]/20 text-[#7B92FF] border-[#5B75F8]/40 animate-pulse'
                          : !step.isReachable
                          ? 'bg-slate-800/80 text-slate-500 border-slate-700'
                          : 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                      }`}>
                        {step.isCompleted ? 'Done' : step.isNextIncomplete ? 'Active' : !step.isReachable ? 'Locked' : 'Queued'}
                      </span>
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-[11px] font-mono">
                        <span className="text-slate-400">Step Progress:</span>
                        <span className={`font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                          {step.loggedQty} / {targetQuantity} NOS ({pct}%)
                        </span>
                      </div>
                      <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                        <div 
                          className={`h-full rounded-full transition-ui ${
                            step.isCompleted ? 'bg-emerald-500' : 'bg-gradient-to-r from-[#5B75F8] to-indigo-500'
                          }`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>

                    {mats.length > 0 && (
                      <div className={`p-2.5 rounded-xl border text-[11px] font-mono space-y-1 ${
                        isDarkMode ? 'bg-slate-900/60 border-slate-800/80' : 'bg-slate-50 border-slate-200'
                      }`}>
                        <span className={`font-bold block text-[10px] uppercase ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Material Requirement:</span>
                        {mats.map((m, idx) => (
                          <div key={idx} className={`flex items-center justify-between ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                            <span className="font-bold">{m.code}</span>
                            <span className={m.left > 0 ? (isDarkMode ? 'text-amber-400 font-bold' : 'text-amber-600 font-bold') : (isDarkMode ? 'text-emerald-400 font-bold' : 'text-emerald-600 font-bold')}>
                              Req: {m.req} {m.uom} (Left: {m.left})
                            </span>
                          </div>
                        ))}
                      </div>
                    )}

                    {!step.isCompleted && step.isReachable && (
                      <button
                        type="button"
                        onClick={() => {
                          setLogStepSeq(step.sequenceNo);
                          const rem = Math.max(1, targetQuantity - (step.loggedQty || 0));
                          setLogQty(rem);
                          setShowLogProductionModal(true);
                        }}
                        className="w-full py-2.5 rounded-xl bg-gradient-to-r from-[#5B75F8] to-indigo-600 text-white text-xs font-mono font-bold flex items-center justify-center gap-1.5 shadow-md shadow-[#5B75F8]/20 cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>+ Log Output for Op {step.sequenceNo}</span>
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* ========================================================================= */}
          {/* 3. MATERIAL CONSUMPTION SECTION (Desktop Table + Mobile Cards) */}
          {/* ========================================================================= */}
          <div className={`space-y-3 ${activeMobileSection === 'materials' ? 'block' : 'hidden md:block'}`}>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <div className="flex items-center gap-2">
                  <Layers className="w-4 h-4 text-[#5B75F8]" />
                  <h3 className={`font-bold text-sm font-mono tracking-tight ${isDarkMode ? 'text-slate-200' : 'text-slate-800'}`}>
                    Material Consumption
                  </h3>
                </div>
                <p className={`text-[11px] font-mono mt-0.5 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                  Bill of Materials — expected/guide only · book any qty, or add material
                </p>
              </div>

              <button
                type="button"
                onClick={() => setShowAddMaterialModal(true)}
                className={`px-3 py-1.5 rounded-xl border text-xs font-mono font-bold flex items-center gap-1.5 cursor-pointer transition-ui ${
                  isDarkMode 
                    ? 'border-indigo-500/40 bg-indigo-500/10 text-indigo-300 hover:bg-indigo-500/20' 
                    : 'border-indigo-300 bg-indigo-50 text-indigo-700 hover:bg-indigo-100'
                }`}
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ Add Material</span>
              </button>
            </div>

            {/* Desktop Table View */}
            <div className={`hidden md:block rounded-2xl border overflow-hidden transition-ui shadow-sm ${
              isDarkMode ? 'bg-slate-950/60 border-slate-800' : 'bg-white border-slate-200'
            }`}>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse font-mono">
                  <thead>
                    <tr className={`border-b font-bold uppercase tracking-wider text-[10px] ${
                      isDarkMode ? 'bg-slate-900/80 border-slate-800 text-slate-400' : 'bg-slate-100 border-slate-200 text-slate-500'
                    }`}>
                      <th className="py-3 px-4">Component</th>
                      <th className="py-3 px-4 text-right">Planned Total</th>
                      <th className="py-3 px-4 text-right">Left</th>
                      <th className="py-3 px-4 text-right">To Book (Qty)</th>
                      <th className="py-3 px-4 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-800/60">
                    {allMaterialRows.map((mat) => {
                      const inputVal = toBookInputs[mat.componentCode]?.qty ?? '';
                      const isBooking = isBookingMaterial === mat.componentCode;

                      return (
                        <tr key={mat.componentCode} className={isDarkMode ? 'hover:bg-slate-800/40' : 'hover:bg-slate-50'}>
                          <td className="py-3.5 px-4 font-sans">
                            <div className={`font-bold text-xs font-mono ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                              {mat.componentCode}
                            </div>
                            <div className={`text-[11px] ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                              {mat.componentName}
                            </div>
                            <span className="inline-block mt-0.5 px-1.5 py-0.2 rounded text-[9px] font-mono bg-purple-500/10 text-purple-600 dark:text-purple-300 border border-purple-500/20 font-medium">
                              Op {mat.assignedStepSeq}: {mat.assignedOpName}
                            </span>
                          </td>
                          <td className={`py-3.5 px-4 text-right font-mono ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                            {mat.plannedTotal} {mat.uom}
                          </td>
                          <td className={`py-3.5 px-4 text-right font-mono font-bold ${
                            mat.remainingLeft > 0 ? (isDarkMode ? 'text-amber-400' : 'text-amber-600') : (isDarkMode ? 'text-emerald-400' : 'text-emerald-600')
                          }`}>
                            {mat.remainingLeft} {mat.uom}
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <input
                                type="number"
                                step="any"
                                min="0"
                                placeholder={mat.remainingLeft > 0 ? String(mat.remainingLeft) : '0'}
                                value={inputVal}
                                onChange={(e) => handleInputChange(mat.componentCode, 'qty', e.target.value)}
                                className={`w-28 rounded-xl border px-3 py-1.5 text-xs font-mono text-right outline-none transition-ui ${
                                  isDarkMode 
                                    ? 'bg-slate-900 border-slate-700 text-white focus:border-[#5B75F8]' 
                                    : 'bg-slate-50 border-slate-300 text-slate-900 focus:border-[#5B75F8]'
                                }`}
                              />
                              <span className={`text-[11px] font-mono ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>{mat.uom}</span>
                            </div>
                          </td>
                          <td className="py-3.5 px-4 text-center">
                            <button
                              type="button"
                              disabled={isBooking}
                              onClick={() => handleBookMaterialSubmit(mat)}
                              className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-teal-600 hover:to-emerald-600 text-white text-xs font-mono font-bold shadow-md shadow-emerald-500/20 disabled:opacity-50 flex items-center justify-center gap-1 mx-auto cursor-pointer transition-ui hover:scale-[1.02] active:scale-[0.96]"
                            >
                              <Check className="w-3.5 h-3.5" />
                              <span>{isBooking ? 'Booking...' : 'Book'}</span>
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* 4. PRODUCTION LOGS / SHIFTS SECTION (Desktop Table + Mobile Cards) */}
          {/* ========================================================================= */}
          <div className={`space-y-3 ${activeMobileSection === 'shifts' ? 'block' : 'hidden md:block'}`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-[#5B75F8]" />
                <h3 className={`font-bold text-sm font-mono tracking-tight ${isDarkMode ? 'text-slate-200' : 'text-slate-800'}`}>
                  Shift Execution Logs
                </h3>
              </div>
              <span className={`text-[11px] font-mono ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                Recorded output batches ({allJobLogs.length})
              </span>
            </div>

            {/* Desktop Table View */}
            <div className={`hidden md:block rounded-2xl border overflow-hidden transition-ui shadow-sm ${
              isDarkMode ? 'bg-slate-950/60 border-slate-800' : 'bg-white border-slate-200'
            }`}>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse font-mono">
                  <thead>
                    <tr className={`border-b font-bold uppercase tracking-wider text-[10px] ${
                      isDarkMode ? 'bg-slate-900/80 border-slate-800 text-slate-400' : 'bg-slate-100 border-slate-200 text-slate-500'
                    }`}>
                      <th className="py-3 px-4">When</th>
                      <th className="py-3 px-4 text-center w-16">Step</th>
                      <th className="py-3 px-4">Operation</th>
                      <th className="py-3 px-4 text-right">Qty Done</th>
                      <th className="py-3 px-4 text-right">Mins</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-800/60">
                    {allJobLogs.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-8 text-center text-slate-400 font-mono">
                          No production shifts logged yet.
                        </td>
                      </tr>
                    ) : (
                      allJobLogs.map((log, idx) => (
                        <tr key={log.id || idx} className={isDarkMode ? 'hover:bg-slate-800/40' : 'hover:bg-slate-50'}>
                          <td className={`py-3 px-4 font-mono text-[11px] ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                            {formatDateTime(log.loggedTimestamp)}
                          </td>
                          <td className={`py-3 px-4 text-center font-bold ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                            {log.stepNo}
                          </td>
                          <td className={`py-3 px-4 font-sans font-semibold ${isDarkMode ? 'text-slate-100' : 'text-slate-900'}`}>
                            {log.operationName}
                          </td>
                          <td className="py-3 px-4 text-right font-bold text-emerald-600 dark:text-emerald-400 font-mono">
                            {log.qtyDone} NOS
                          </td>
                          <td className={`py-3 px-4 text-right font-mono ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                            —
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Mobile Shift Log Cards (Viewport < md) */}
            <div className="block md:hidden space-y-2.5">
              {allJobLogs.length === 0 ? (
                <div className={`p-8 text-center rounded-2xl border font-mono text-xs ${
                  isDarkMode ? 'border-slate-800 text-slate-400' : 'border-slate-200 text-slate-500'
                }`}>
                  No production output logged yet.
                </div>
              ) : (
                allJobLogs.map((log, idx) => (
                  <div 
                    key={log.id || idx} 
                    className={`p-3.5 rounded-2xl border space-y-1.5 font-mono text-xs ${
                      isDarkMode ? 'bg-slate-950/70 border-slate-800' : 'bg-slate-50 border-slate-200'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className={`font-bold ${isDarkMode ? 'text-slate-200' : 'text-slate-900'}`}>
                        Op {log.stepNo} — {log.operationName}
                      </span>
                      <span className="font-bold text-emerald-600 dark:text-emerald-400 text-sm">
                        +{log.qtyDone} NOS
                      </span>
                    </div>
                    <div className={`text-[10px] flex items-center justify-between ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                      <span>{formatDateTime(log.loggedTimestamp)}</span>
                      <span>Verified Shift Log</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* ========================================================================= */}
          {/* 5. CONSUMPTION HISTORY SECTION (Desktop Table + Mobile Cards) */}
          {/* ========================================================================= */}
          <div className={`space-y-3 ${activeMobileSection === 'history' ? 'block' : 'hidden md:block'}`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <History className="w-4 h-4 text-[#5B75F8]" />
                <h3 className={`font-bold text-sm font-mono tracking-tight ${isDarkMode ? 'text-slate-200' : 'text-slate-800'}`}>
                  Consumption History
                </h3>
              </div>
              <span className={`text-[11px] font-mono ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                Historical material booking audit trail ({localConsumptions.length})
              </span>
            </div>

            {/* Desktop Table View */}
            <div className={`hidden md:block rounded-2xl border overflow-hidden transition-ui shadow-sm ${
              isDarkMode ? 'bg-slate-950/60 border-slate-800' : 'bg-white border-slate-200'
            }`}>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse font-mono">
                  <thead>
                    <tr className={`border-b font-bold uppercase tracking-wider text-[10px] ${
                      isDarkMode ? 'bg-slate-900/80 border-slate-800 text-slate-400' : 'bg-slate-100 border-slate-200 text-slate-500'
                    }`}>
                      <th className="py-3 px-4">Component</th>
                      <th className="py-3 px-4">When</th>
                      <th className="py-3 px-4 text-right">Planned</th>
                      <th className="py-3 px-4 text-right">Actual</th>
                      <th className="py-3 px-4 text-right">Scrap</th>
                      <th className="py-3 px-4 text-center">Unit</th>
                      <th className="py-3 px-4">Heat / Lot</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-800/60">
                    {localConsumptions.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-8 text-center text-slate-400 font-mono">
                          No consumption booked
                        </td>
                      </tr>
                    ) : (
                      localConsumptions.map((c) => (
                        <tr key={c.id} className={isDarkMode ? 'hover:bg-slate-800/40' : 'hover:bg-slate-50'}>
                          <td className={`py-3 px-4 font-mono font-bold ${isDarkMode ? 'text-slate-200' : 'text-slate-900'}`}>
                            <div>{c.itemCode}</div>
                            <div className={`text-[10px] font-sans font-normal truncate max-w-xs ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                              {c.itemName}
                            </div>
                          </td>
                          <td className={`py-3 px-4 font-mono text-[11px] ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                            {formatDateTime(c.bookedAt)}
                          </td>
                          <td className={`py-3 px-4 text-right ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                            {c.plannedQty}
                          </td>
                          <td className="py-3 px-4 text-right font-bold text-emerald-600 dark:text-emerald-400">
                            {c.actualQty}
                          </td>
                          <td className="py-3 px-4 text-right text-rose-500 dark:text-rose-400">
                            {c.scrapQty || 0}
                          </td>
                          <td className={`py-3 px-4 text-center font-medium ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                            {c.unit}
                          </td>
                          <td className="py-3 px-4 text-amber-600 dark:text-amber-400 font-bold">
                            {c.heatLotNumber || '—'}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Mobile History Cards (Viewport < md) */}
            <div className="block md:hidden space-y-2.5">
              {localConsumptions.length === 0 ? (
                <div className={`p-8 text-center rounded-2xl border font-mono text-xs ${
                  isDarkMode ? 'border-slate-800 text-slate-400' : 'border-slate-200 text-slate-500'
                }`}>
                  No material consumption recorded yet.
                </div>
              ) : (
                localConsumptions.map((c) => (
                  <div 
                    key={c.id} 
                    className={`p-3.5 rounded-2xl border space-y-1.5 font-mono text-xs ${
                      isDarkMode ? 'bg-slate-950/70 border-slate-800' : 'bg-slate-50 border-slate-200'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-[#5B75F8] dark:text-[#7B92FF]">{c.itemCode}</span>
                      <span className="font-bold text-emerald-400 text-sm">
                        {c.actualQty} {c.unit}
                      </span>
                    </div>
                    <div className={`text-[11px] font-sans ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                      {c.itemName}
                    </div>
                    <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1 border-t border-slate-800/60">
                      <span>Heat/Lot: <strong className="text-amber-400">{c.heatLotNumber || '—'}</strong></span>
                      <span>{formatDateTime(c.bookedAt)}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="px-4 sm:px-6 py-3.5 sm:py-4 border-t border-slate-200 dark:border-slate-800/90 bg-slate-50/50 dark:bg-slate-950/40 flex items-center justify-between font-mono text-xs shrink-0">
          <div className="text-slate-400 flex items-center gap-2 text-[11px]">
            <span>Job: <strong>{jobCard.jobNo}</strong></span>
            <span>•</span>
            <span className="truncate">Heat/Lot: <strong className="text-amber-400">{jobCard.materialIssuedLot || 'HT-2026-9921'}</strong></span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className={`px-4 sm:px-5 py-2 rounded-xl border font-bold cursor-pointer transition-ui ${
              isDarkMode ? 'border-slate-800 text-slate-300 hover:bg-slate-800' : 'border-slate-200 text-slate-700 hover:bg-slate-100'
            }`}
          >
            Close
          </button>
        </div>

      </div>

      {/* ========================================================================= */}
      {/* SUB-MODAL 1: ADD UNPLANNED MATERIAL */}
      {/* ========================================================================= */}
      {showAddMaterialModal && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md font-sans">
          <div className={`w-full max-w-md rounded-3xl border p-6 space-y-4 shadow-2xl transition-ui ${
            isDarkMode ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
          }`}>
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                  <Plus className="w-5 h-5" />
                </div>
                <h4 className="font-bold text-sm">Add Material / Substitute</h4>
              </div>
              <button onClick={() => setShowAddMaterialModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddCustomMaterialSubmit} className="space-y-3.5">
              <div>
                <label className="block text-[10px] font-mono uppercase font-bold text-slate-400 mb-1">
                  Item / Material Code *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. RM-AL-6061-ROD-40 or TOOL-INSERT-CNMG"
                  value={addMatCode}
                  onChange={(e) => {
                    const code = e.target.value;
                    setAddMatCode(code);
                    const matchedStock = stock.find(s => s.code.toLowerCase() === code.toLowerCase());
                    if (matchedStock) {
                      setAddMatName(matchedStock.description);
                      setAddMatUnit(matchedStock.unit || 'Nos');
                    }
                  }}
                  className={`w-full px-3.5 py-2 rounded-xl text-xs font-mono border focus:outline-none transition-ui ${
                    isDarkMode ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                  }`}
                />
              </div>

              <div>
                <label className="block text-[10px] font-mono uppercase font-bold text-slate-400 mb-1">
                  Material Description
                </label>
                <input
                  type="text"
                  placeholder="e.g. Aluminum 6061 Round Bar 40mm"
                  value={addMatName}
                  onChange={(e) => setAddMatName(e.target.value)}
                  className={`w-full px-3.5 py-2 rounded-xl text-xs border focus:outline-none transition-ui ${
                    isDarkMode ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                  }`}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-mono uppercase font-bold text-slate-400 mb-1">
                    Qty to Book *
                  </label>
                  <input
                    type="number"
                    step="any"
                    required
                    value={addMatQty}
                    onChange={(e) => setAddMatQty(e.target.value)}
                    className={`w-full px-3.5 py-2 rounded-xl text-xs font-mono border focus:outline-none transition-ui ${
                      isDarkMode ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                    }`}
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-mono uppercase font-bold text-slate-400 mb-1">
                    Unit (UOM)
                  </label>
                  <select
                    value={addMatUnit}
                    onChange={(e) => setAddMatUnit(e.target.value)}
                    className={`w-full px-3.5 py-2 rounded-xl text-xs font-mono border focus:outline-none transition-ui ${
                      isDarkMode ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                    }`}
                  >
                    <option value="Nos">Nos</option>
                    <option value="Kg">Kg</option>
                    <option value="Meter">Meter</option>
                    <option value="Litre">Litre</option>
                    <option value="Set">Set</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-mono uppercase font-bold text-slate-400 mb-1">
                    Scrap Allowance
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={addMatScrap}
                    onChange={(e) => setAddMatScrap(e.target.value)}
                    className={`w-full px-3.5 py-2 rounded-xl text-xs font-mono border focus:outline-none transition-ui ${
                      isDarkMode ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                    }`}
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-mono uppercase font-bold text-slate-400 mb-1">
                    Heat / Lot #
                  </label>
                  <input
                    type="text"
                    placeholder="HT-2026-####"
                    value={addMatHeatLot}
                    onChange={(e) => setAddMatHeatLot(e.target.value)}
                    className={`w-full px-3.5 py-2 rounded-xl text-xs font-mono border focus:outline-none transition-ui ${
                      isDarkMode ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                    }`}
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-mono uppercase font-bold text-slate-400 mb-1">
                  Assign to Route Operation
                </label>
                <select
                  value={addMatStepSeq}
                  onChange={(e) => setAddMatStepSeq(Number(e.target.value))}
                  className={`w-full px-3.5 py-2 rounded-xl text-xs font-mono border focus:outline-none transition-ui ${
                    isDarkMode ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                  }`}
                >
                  {routeOperations.map(op => (
                    <option key={op.sequenceNo} value={op.sequenceNo}>
                      Op {op.sequenceNo} — {op.operationName}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddMaterialModal(false)}
                  className="px-4 py-2 rounded-xl border text-xs font-mono text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isAddingCustomMaterial}
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-[#5B75F8] to-indigo-600 text-white text-xs font-mono font-bold shadow-md cursor-pointer disabled:opacity-50"
                >
                  {isAddingCustomMaterial ? 'Booking...' : 'Book & Add Material'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUB-MODAL 2: QUICK LOG PRODUCTION SHIFT OUTPUT */}
      {/* ========================================================================= */}
      {showLogProductionModal && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md font-sans">
          <div className={`w-full max-w-md rounded-3xl border p-6 space-y-4 shadow-2xl transition-ui ${
            isDarkMode ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
          }`}>
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-[#5B75F8]/10 text-[#5B75F8] border border-[#5B75F8]/20">
                  <Activity className="w-5 h-5" />
                </div>
                <h4 className="font-bold text-sm">Log Production Shift Output</h4>
              </div>
              <button onClick={() => setShowLogProductionModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleLogProductionSubmit} className="space-y-3.5">
              <div>
                <label className="block text-[10px] font-mono uppercase font-bold text-slate-400 mb-1">
                  Operation Step *
                </label>
                <select
                  value={selectedStepData?.sequenceNo || logStepSeq}
                  onChange={(e) => {
                    const newSeq = Number(e.target.value);
                    setLogStepSeq(newSeq);
                    const targetStep = stepProgressList.find(s => s.sequenceNo === newSeq);
                    if (targetStep) {
                      const rem = Math.max(1, targetQuantity - (targetStep.loggedQty || 0));
                      setLogQty(rem);
                    }
                  }}
                  className={`w-full px-3.5 py-2.5 rounded-xl text-xs font-mono border focus:outline-none transition-ui ${
                    isDarkMode ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                  }`}
                >
                  {incompleteSteps.length === 0 ? (
                    <option value="">All Operations Completed</option>
                  ) : (
                    incompleteSteps.map(s => (
                      <option key={s.sequenceNo} value={s.sequenceNo}>
                        Op {s.sequenceNo} — {s.operationName} ({s.remainingQty} NOS remaining of {targetQuantity})
                      </option>
                    ))
                  )}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-[10px] font-mono uppercase font-bold text-slate-400">
                      Qty Produced (NOS) *
                    </label>
                    <span className="text-[10px] font-mono text-emerald-400 font-bold">
                      Max: {maxLoggableQty} NOS
                    </span>
                  </div>
                  <input
                    type="number"
                    required
                    min="1"
                    max={maxLoggableQty}
                    value={logQty}
                    onChange={(e) => setLogQty(Number(e.target.value))}
                    className={`w-full px-3.5 py-2 rounded-xl text-xs font-mono font-bold border focus:outline-none transition-ui ${
                      logQty > maxLoggableQty
                        ? 'border-rose-500 bg-rose-500/10 text-rose-300'
                        : isDarkMode ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                    }`}
                  />
                  <p className="text-[9px] font-mono text-slate-400 mt-1">
                    Capped at remaining PO target ({maxLoggableQty} of {targetQuantity} NOS)
                  </p>
                </div>
                <div>
                  <label className="block text-[10px] font-mono uppercase font-bold text-slate-400 mb-1">
                    Duration (Minutes)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={logMins}
                    onChange={(e) => setLogMins(Number(e.target.value))}
                    className={`w-full px-3.5 py-2 rounded-xl text-xs font-mono border focus:outline-none transition-ui ${
                      isDarkMode ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                    }`}
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-mono uppercase font-bold text-slate-400 mb-1">
                  Operator Notes (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Completed batch with zero tool wear"
                  value={logNotes}
                  onChange={(e) => setLogNotes(e.target.value)}
                  className={`w-full px-3.5 py-2 rounded-xl text-xs border focus:outline-none transition-ui ${
                    isDarkMode ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                  }`}
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowLogProductionModal(false)}
                  className="px-4 py-2 rounded-xl border text-xs font-mono text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingLog}
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-[#5B75F8] to-indigo-600 text-white text-xs font-mono font-bold shadow-md cursor-pointer disabled:opacity-50"
                >
                  {isSubmittingLog ? 'Logging...' : 'Save Production Log'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
export default JobCardDetailModal;
