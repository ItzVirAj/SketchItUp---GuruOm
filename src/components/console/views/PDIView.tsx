import React, { useState } from 'react';
import {
  ClipboardCheck,
  FileCheck,
  CheckCircle2,
  Search,
  X,
  ShieldCheck,
  Award,
  AlertTriangle,
  Clock,
  CheckSquare,
  Square,
  Package,
  Download,
  List,
  LayoutGrid,
  Activity,
  ChevronRight,
  RotateCcw,
  Trash2,
  Filter,
  Eye,
  ArrowRight,
  ShieldAlert,
  Info,
  Check,
  Printer,
  Copy,
  FileText
} from 'lucide-react';
import { PDIInspection } from '../../../types/console';
import { triggerPDIFailure } from '../../../services/notificationService';
import { useUrlModal } from '../../../hooks/useUrlModal';
import { printElementById } from '../../../utils/printDocument';

interface PDIViewProps {
  pdiItems?: PDIInspection[];
  pdiQueue?: PDIInspection[];
  isDarkMode?: boolean;
  preselectedOrderPo?: string | null;
  preselectedJobNo?: string | null;
  onPdiModalOpened?: () => void;
  onPassPDI?: (pdiNo: string, payload?: any) => void;
  onFailPDI?: (pdiNo: string, payload?: any) => void;
}

export const PDIView: React.FC<PDIViewProps> = ({ 
  pdiItems, 
  pdiQueue, 
  isDarkMode = true, 
  preselectedOrderPo,
  preselectedJobNo,
  onPdiModalOpened,
  onPassPDI, 
  onFailPDI 
}) => {
  const rawPdiItems = pdiItems || pdiQueue || [];
  
  // Local state for instant optimistic updates
  const [localPdiList, setLocalPdiList] = useState<PDIInspection[]>(rawPdiItems);

  React.useEffect(() => {
    if (pdiItems || pdiQueue) {
      setLocalPdiList(pdiItems || pdiQueue || []);
    }
  }, [pdiItems, pdiQueue]);

  // Deduplicate PDI inspection items by orderPo + jobNo (keep latest)
  const activePdiItems = React.useMemo(() => {
    const map = new Map<string, PDIInspection>();
    for (const item of localPdiList) {
      const key = `${(item.orderPo || '').trim().toUpperCase()}_${(item.jobNo || '').trim().toUpperCase()}`;
      if (key !== '_') {
        map.set(key, item);
      } else {
        map.set(item.id, item);
      }
    }
    return Array.from(map.values());
  }, [localPdiList]);

  const inspectModal = useUrlModal('inspect-pdi');
  const reinspectModal = useUrlModal('reinspect-pdi');
  const certModal = useUrlModal('view-pdi-certificate');

  // Modal selections
  const [selectedReport, setSelectedReport] = useState<PDIInspection | null>(null);
  const [inspectingItem, setInspectingItem] = useState<PDIInspection | null>(null);
  const [reinspectingItem, setReinspectingItem] = useState<PDIInspection | null>(null);

  // Global PDI Audit Box State
  const [isGlobalAuditOpen, setIsGlobalAuditOpen] = useState<boolean>(false);
  const [globalAuditSearch, setGlobalAuditSearch] = useState<string>('');

  // Page filters
  const [searchQuery, setSearchQuery] = useState(preselectedOrderPo || preselectedJobNo || '');
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'PASS' | 'PENDING' | 'FAIL'>('ALL');
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');

  // Revoke CoC confirmation dialog state
  const [showRevokeConfirm, setShowRevokeConfirm] = useState(false);
  const [revokeTargetItem, setRevokeTargetItem] = useState<PDIInspection | null>(null);

  // CoC Copy Feedback & Print Handlers
  const [copiedCoC, setCopiedCoC] = useState(false);
  const handleCopyCoC = (text: string) => {
    navigator.clipboard?.writeText(text);
    setCopiedCoC(true);
    setTimeout(() => setCopiedCoC(false), 2000);
  };

  const handlePrintCoC = () => {
    if (!selectedReport) return;
    printElementById('pdi-coc-document', `Certificate-of-Compliance-${selectedReport.certificateNo || selectedReport.jobNo}`);
  };

  // Handle preselection
  const preselectHandled = React.useRef<string | null>(null);
  React.useEffect(() => {
    const key = preselectedOrderPo || preselectedJobNo;
    if (!key || preselectHandled.current === key) return;
    preselectHandled.current = key;

    const matched = activePdiItems.find(p => 
      (preselectedJobNo && (p.jobNo?.toLowerCase() === preselectedJobNo.toLowerCase() || p.id === preselectedJobNo)) ||
      (preselectedOrderPo && (p.orderPo?.toLowerCase() === preselectedOrderPo.toLowerCase()))
    );

    if (matched) {
      if (matched.pdiStatus === 'PASS') {
        handleOpenReinspect(matched);
        reinspectModal.open({ pdiNo: matched.id, jobNo: matched.jobNo, orderPo: matched.orderPo });
      } else {
        handleOpenInspect(matched);
        inspectModal.open({ pdiNo: matched.id, jobNo: matched.jobNo, orderPo: matched.orderPo });
      }
      onPdiModalOpened?.();
    } else if (preselectedOrderPo) {
      setSearchQuery(preselectedOrderPo);
    }
  }, [preselectedOrderPo, preselectedJobNo, activePdiItems, onPdiModalOpened]);

  // Sync inspectModal from URL
  React.useEffect(() => {
    if (inspectModal.isOpen) {
      const { pdiNo, jobNo, orderPo } = inspectModal.params;
      if (pdiNo || jobNo || orderPo) {
        const found = activePdiItems.find(p => (pdiNo && p.id === pdiNo) || (jobNo && p.jobNo === jobNo) || (orderPo && p.orderPo === orderPo));
        if (found) {
          handleOpenInspect(found);
        }
      }
    } else {
      setInspectingItem(null);
    }
  }, [inspectModal.isOpen, inspectModal.params.pdiNo, inspectModal.params.jobNo, inspectModal.params.orderPo, activePdiItems]);

  // Sync reinspectModal from URL
  React.useEffect(() => {
    if (reinspectModal.isOpen) {
      const { pdiNo, jobNo, orderPo } = reinspectModal.params;
      if (pdiNo || jobNo || orderPo) {
        const found = activePdiItems.find(p => (pdiNo && p.id === pdiNo) || (jobNo && p.jobNo === jobNo) || (orderPo && p.orderPo === orderPo));
        if (found) {
          handleOpenReinspect(found);
        }
      }
    } else {
      setReinspectingItem(null);
    }
  }, [reinspectModal.isOpen, reinspectModal.params.pdiNo, reinspectModal.params.jobNo, reinspectModal.params.orderPo, activePdiItems]);

  // Sync certModal from URL
  React.useEffect(() => {
    if (certModal.isOpen) {
      const { pdiNo, jobNo, orderPo } = certModal.params;
      if (pdiNo || jobNo || orderPo) {
        const found = activePdiItems.find(p => (pdiNo && p.id === pdiNo) || (jobNo && p.jobNo === jobNo) || (orderPo && p.orderPo === orderPo));
        if (found) {
          setSelectedReport(found);
        }
      }
    } else {
      setSelectedReport(null);
    }
  }, [certModal.isOpen, certModal.params.pdiNo, certModal.params.jobNo, certModal.params.orderPo, activePdiItems]);

  // Initial Inspection form states
  const [acceptedQty, setAcceptedQty] = useState<number>(0);
  const [rejectedQty, setRejectedQty] = useState<number>(0);
  const [certificateNo, setCertificateNo] = useState<string>('');
  const [remarks, setRemarks] = useState<string>('');
  const [reportUrl, setReportUrl] = useState<string>('');
  const [checklist, setChecklist] = useState({
    visualFinish: true,
    dimensionalAudit: true,
    gaugesChecked: true,
    packagingRustProof: true
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Re-inspection form states
  const [reinspectAcceptedQty, setReinspectAcceptedQty] = useState<number>(0);
  const [reinspectRejectedQty, setReinspectRejectedQty] = useState<number>(0);
  const [reinspectCertificateNo, setReinspectCertificateNo] = useState<string>('');
  const [reinspectRemarks, setReinspectRemarks] = useState<string>('');
  const [reinspectReason, setReinspectReason] = useState<string>('Routine Audit Revision');
  const [reinspectChecklist, setReinspectChecklist] = useState({
    visualFinish: true,
    dimensionalAudit: true,
    gaugesChecked: true,
    packagingRustProof: true
  });

  const handleOpenInspect = (item: PDIInspection) => {
    setInspectingItem(item);
    setAcceptedQty(item.acceptedQty ?? item.qty ?? 1);
    setRejectedQty(item.rejectedQty ?? 0);
    setCertificateNo(item.certificateNo || `PDI-COC-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`);
    setRemarks(item.inspectorNotes || '100% parts cleared visual and dimensional tolerance checks.');
    setReportUrl(item.pdiReportUrl || '');
    setChecklist(item.checklist || {
      visualFinish: true,
      dimensionalAudit: true,
      gaugesChecked: true,
      packagingRustProof: true
    });
  };

  const handleOpenReinspect = (item: PDIInspection) => {
    setReinspectingItem(item);
    setReinspectAcceptedQty(item.acceptedQty ?? item.qty ?? 1);
    setReinspectRejectedQty(item.rejectedQty ?? 0);
    setReinspectCertificateNo(item.certificateNo || `PDI-COC-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`);
    setReinspectRemarks(item.inspectorNotes || 'Re-inspection completed. All dimensions and surface criteria re-verified.');
    setReinspectReason('Customer Pre-Shipment Audit');
    setReinspectChecklist(item.checklist || {
      visualFinish: true,
      dimensionalAudit: true,
      gaugesChecked: true,
      packagingRustProof: true
    });
    setShowRevokeConfirm(false);
  };

  const handleToggleChecklist = (key: keyof typeof checklist) => {
    setChecklist(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleToggleReinspectChecklist = (key: keyof typeof reinspectChecklist) => {
    setReinspectChecklist(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSelectAllChecklist = () => {
    setChecklist({
      visualFinish: true,
      dimensionalAudit: true,
      gaugesChecked: true,
      packagingRustProof: true
    });
  };

  const handleSelectAllReinspectChecklist = () => {
    setReinspectChecklist({
      visualFinish: true,
      dimensionalAudit: true,
      gaugesChecked: true,
      packagingRustProof: true
    });
  };

  // Submit initial inspection
  const handleInspectSubmit = async (decision: 'PASS' | 'FAIL') => {
    if (!inspectingItem) return;
    setIsSubmitting(true);
    try {
      const updatedItem: PDIInspection = {
        ...inspectingItem,
        pdiStatus: decision,
        certificateNo: decision === 'PASS' ? certificateNo : undefined,
        acceptedQty: Number(acceptedQty),
        rejectedQty: Number(rejectedQty),
        inspectorNotes: remarks,
        pdiReportUrl: reportUrl,
        reportDate: new Date().toISOString().split('T')[0],
        checklist
      };

      setLocalPdiList(prev => prev.map(p => (p.id === inspectingItem.id || (p.jobNo === inspectingItem.jobNo && p.orderPo === inspectingItem.orderPo) ? updatedItem : p)));

      if (decision === 'PASS') {
        if (onPassPDI) {
          await onPassPDI(inspectingItem.id, updatedItem);
        }
      } else {
        if (onFailPDI) {
          await onFailPDI(inspectingItem.id, updatedItem);
        }
        triggerPDIFailure(
          inspectingItem.partDescription || inspectingItem.partCode || `Job ${inspectingItem.jobNo}`,
          remarks || `Pre-Delivery Inspection non-conformance (Rejected Qty: ${rejectedQty})`,
          'QC Lead'
        ).catch(() => {});
      }
      setInspectingItem(null);
      inspectModal.close();
    } catch (err) {
      console.error("Failed to submit PDI Inspection:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Submit re-inspection
  const handleReinspectSubmit = async (decision: 'PASS' | 'FAIL') => {
    if (!reinspectingItem) return;
    setIsSubmitting(true);
    try {
      const updatedItem: PDIInspection = {
        ...reinspectingItem,
        pdiStatus: decision,
        certificateNo: decision === 'PASS' ? (reinspectCertificateNo || reinspectingItem.certificateNo) : undefined,
        acceptedQty: Number(reinspectAcceptedQty),
        rejectedQty: Number(reinspectRejectedQty),
        inspectorNotes: `[Re-inspection: ${reinspectReason}] ${reinspectRemarks}`,
        reportDate: new Date().toISOString().split('T')[0],
        checklist: reinspectChecklist
      };

      setLocalPdiList(prev => prev.map(p => (p.id === reinspectingItem.id || (p.jobNo === reinspectingItem.jobNo && p.orderPo === reinspectingItem.orderPo) ? updatedItem : p)));

      if (decision === 'PASS') {
        if (onPassPDI) {
          await onPassPDI(reinspectingItem.id, updatedItem);
        }
      } else {
        if (onFailPDI) {
          await onFailPDI(reinspectingItem.id, updatedItem);
        }
        triggerPDIFailure(
          reinspectingItem.partDescription || reinspectingItem.partCode || `Job ${reinspectingItem.jobNo}`,
          reinspectRemarks || `Re-inspection failure (Rejected Qty: ${reinspectRejectedQty})`,
          'QC Lead'
        ).catch(() => {});
      }
      setReinspectingItem(null);
      reinspectModal.close();
    } catch (err) {
      console.error("Failed to submit Re-inspection:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Remove / Revoke CoC
  const handleRemoveCoC = async (item: PDIInspection) => {
    setIsSubmitting(true);
    try {
      const revokedItem: PDIInspection = {
        ...item,
        pdiStatus: 'PENDING',
        certificateNo: undefined,
        acceptedQty: 0,
        rejectedQty: 0,
        inspectorNotes: `CoC revoked on ${new Date().toLocaleDateString('en-IN')} for re-inspection`,
        reportDate: undefined
      };

      setLocalPdiList(prev => prev.map(p => (p.id === item.id || (p.jobNo === item.jobNo && p.orderPo === item.orderPo) ? revokedItem : p)));

      if (onPassPDI) {
        await onPassPDI(item.id, revokedItem);
      }

      setShowRevokeConfirm(false);
      setRevokeTargetItem(null);
      setReinspectingItem(null);
      reinspectModal.close();
    } catch (err) {
      console.error("Failed to revoke CoC:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Filtered lists
  const filteredPdi = activePdiItems.filter(p => {
    const matchesSearch = 
      p.jobNo.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.orderPo.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.partDescription.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.partCode.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesFilter = filterStatus === 'ALL' || p.pdiStatus === filterStatus;
    return matchesSearch && matchesFilter;
  });

  const totalCount = activePdiItems.length;
  const pendingCount = activePdiItems.filter(p => p.pdiStatus === 'PENDING').length;
  const passedCount = activePdiItems.filter(p => p.pdiStatus === 'PASS').length;
  const failedCount = activePdiItems.filter(p => p.pdiStatus === 'FAIL').length;
  const totalPassedQty = activePdiItems.filter(p => p.pdiStatus === 'PASS').reduce((acc, p) => acc + (p.acceptedQty || p.qty || 0), 0);
  const complianceRate = totalCount > 0 ? Math.round((passedCount / totalCount) * 100) : 100;

  // Pending Job Cards for Global Audit Box
  const pendingAuditJCs = activePdiItems.filter(p => {
    if (p.pdiStatus !== 'PENDING') return false;
    if (!globalAuditSearch.trim()) return true;
    const q = globalAuditSearch.toLowerCase();
    return (
      (p.jobNo || '').toLowerCase().includes(q) ||
      (p.orderPo || '').toLowerCase().includes(q) ||
      (p.partCode || '').toLowerCase().includes(q) ||
      (p.partDescription || '').toLowerCase().includes(q)
    );
  });

  const handleExportCSV = () => {
    if (activePdiItems.length === 0) return;
    const headers = ['Job Card #', 'Customer PO', 'Part Code', 'Part Description', 'Batch Qty', 'Accepted Qty', 'Rejected Qty', 'PDI Status', 'Certificate #', 'Date'];
    const rows = activePdiItems.map(p => [
      `"${p.jobNo || ''}"`,
      `"${p.orderPo || ''}"`,
      `"${p.partCode || ''}"`,
      `"${(p.partDescription || '').replace(/"/g, '""')}"`,
      p.qty ?? 0,
      p.acceptedQty ?? p.qty ?? 0,
      p.rejectedQty ?? 0,
      `"${p.pdiStatus || 'PENDING'}"`,
      `"${p.certificateNo || ''}"`,
      `"${p.reportDate || ''}"`
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `PDI_Inspection_Report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-4 sm:space-y-6 font-sans w-full max-w-full min-w-0 pb-6">
      
      {/* ========================================================================= */}
      {/* ── TOP HEADER & TELEMETRY WIDGETS (Apple Executive Window) ──             */}
      {/* ========================================================================= */}
      <div className={`p-5 sm:p-6 rounded-2xl border transition-all ${
        isDarkMode 
          ? 'bg-[#09090B] border-white/10 text-white shadow-[0_4px_24px_rgba(0,0,0,0.4)]' 
          : 'bg-white/90 border-slate-200/80 shadow-xs text-slate-900 backdrop-blur-xl'
      }`}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start sm:items-center gap-3.5">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-500/10 text-[#5B75F8] dark:text-[#7B92FF] border border-blue-500/20 shrink-0">
              <ClipboardCheck className="w-6 h-6 stroke-[2]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                  Pre-Dispatch Clearance
                </span>
                <span className="text-xs text-slate-400 dark:text-slate-500">
                  • 4-Point Audit & CoC Release
                </span>
              </div>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white mt-1">
                PDI Queue (Pre-Dispatch Inspection)
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 max-w-xl">
                Final pre-dispatch compliance verification for Job Cards and Customer POs, dimensional checklists, and outward CoC generation.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            {/* Export CSV Button */}
            <button
              type="button"
              onClick={handleExportCSV}
              className={`flex h-10 items-center gap-2 px-4 rounded-xl border text-xs font-bold transition-all cursor-pointer active:scale-[0.96] shadow-xs ${
                isDarkMode 
                  ? 'border-white/10 bg-white/[0.04] text-slate-200 hover:bg-white/[0.08] hover:border-white/20' 
                  : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
              }`}
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export CSV</span>
            </button>

            {/* Apple Redesigned Global PDI Audit Box Trigger */}
            <button
              type="button"
              onClick={() => {
                setIsGlobalAuditOpen(true);
                setGlobalAuditSearch('');
              }}
              className="flex h-10 items-center gap-2.5 px-4 rounded-xl bg-gradient-to-r from-[#5B75F8] to-indigo-600 hover:from-[#4E67F0] hover:to-indigo-700 text-white text-xs font-bold shadow-md shadow-[#5B75F8]/25 cursor-pointer transition-all active:scale-[0.96]"
              title="Open Global PDI Audit Box"
            >
              <ClipboardCheck className="w-4 h-4 stroke-[2.2]" />
              <span>Global PDI Audit Box</span>
              <span className="px-2 py-0.5 rounded-full bg-white/20 text-white font-mono text-[11px] font-bold">
                {pendingCount} Left
              </span>
              {pendingCount > 0 && (
                <span className="w-2 h-2 rounded-full bg-amber-300 animate-pulse" />
              )}
            </button>
          </div>
        </div>

        {/* Telemetry Stat Cards Grid - Apple Desktop Widgets */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mt-5">
          {/* Total PDI Lots */}
          <div className={`p-4 rounded-2xl border transition-all ${
            isDarkMode 
              ? 'bg-[#09090B] border-white/10 hover:border-white/20' 
              : 'bg-white/80 border-slate-200/80 hover:border-slate-300 shadow-xs'
          }`}>
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Total PDI Lots</span>
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-500/10 text-[#5B75F8] dark:text-[#7B92FF]">
                <ClipboardCheck className="w-4 h-4 stroke-[2]" />
              </div>
            </div>
            <div className="mt-2 flex items-baseline justify-between">
              <span className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">{totalCount}</span>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-500/10 text-[#5B75F8] dark:text-[#7B92FF]">Lots</span>
            </div>
          </div>

          {/* Passed Quantity */}
          <div className={`p-4 rounded-2xl border transition-all ${
            isDarkMode 
              ? 'bg-[#09090B] border-white/10 hover:border-white/20' 
              : 'bg-white/80 border-slate-200/80 hover:border-slate-300 shadow-xs'
          }`}>
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Passed Quantity</span>
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="w-4 h-4 stroke-[2]" />
              </div>
            </div>
            <div className="mt-2 flex items-baseline justify-between">
              <span className="text-2xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400 tabular-nums">
                {totalPassedQty.toLocaleString('en-IN')}
              </span>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                {passedCount} Lots
              </span>
            </div>
          </div>

          {/* Pending Audit Lots */}
          <div className={`p-4 rounded-2xl border transition-all ${
            isDarkMode 
              ? 'bg-[#09090B] border-white/10 hover:border-white/20' 
              : 'bg-white/80 border-slate-200/80 hover:border-slate-300 shadow-xs'
          }`}>
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Pending Audit</span>
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-500/10 text-amber-500">
                <Clock className="w-4 h-4 stroke-[2]" />
              </div>
            </div>
            <div className="mt-2 flex items-baseline justify-between">
              <span className="text-2xl font-bold tracking-tight text-amber-500">{pendingCount}</span>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-500">
                Awaiting
              </span>
            </div>
          </div>

          {/* Quality Compliance Rate */}
          <div className={`p-4 rounded-2xl border transition-all ${
            isDarkMode 
              ? 'bg-[#09090B] border-white/10 hover:border-white/20' 
              : 'bg-white/80 border-slate-200/80 hover:border-slate-300 shadow-xs'
          }`}>
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Compliance Rate</span>
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-purple-500/10 text-purple-500">
                <ShieldCheck className="w-4 h-4 stroke-[2]" />
              </div>
            </div>
            <div className="mt-2 flex items-baseline justify-between">
              <span className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">{complianceRate}%</span>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-500">PDI Rate</span>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* ── SEARCH & FILTER CONTROLS BAR (Apple Unified Search & Segmented Pill) ── */}
      {/* ========================================================================= */}
      <div className={`p-3.5 sm:p-4 rounded-2xl border flex flex-col md:flex-row items-center justify-between gap-3 ${
        isDarkMode ? 'bg-[#09090B] border-white/10' : 'bg-white border-slate-200/80 shadow-xs'
      }`}>
        {/* Search Bar */}
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search Job Card, PO, component..."
            className={`w-full pl-9 pr-8 py-2 rounded-xl text-xs font-medium outline-none transition-all ${
              isDarkMode 
                ? 'bg-white/[0.04] border border-white/10 text-white placeholder-slate-500 focus:border-[#5B75F8] focus:ring-1 focus:ring-[#5B75F8]' 
                : 'bg-slate-50 border border-slate-200 text-slate-900 placeholder-slate-400 focus:border-[#5B75F8] focus:ring-1 focus:ring-[#5B75F8]'
            }`}
          />
          {searchQuery && (
            <button 
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 p-0.5 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Filter Pills & View Switcher */}
        <div className="flex items-center gap-2 w-full md:w-auto justify-between md:justify-end overflow-x-auto">
          <div className={`flex items-center p-1 rounded-xl border ${
            isDarkMode ? 'bg-black/50 border-white/10' : 'bg-slate-100 border-slate-200'
          }`}>
            {(['ALL', 'PENDING', 'PASS', 'FAIL'] as const).map((status) => (
              <button
                key={status}
                type="button"
                onClick={() => setFilterStatus(status)}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  filterStatus === status
                    ? isDarkMode ? 'bg-white/15 text-white shadow-xs' : 'bg-white text-slate-900 shadow-xs'
                    : isDarkMode ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {status === 'ALL' ? 'All Lots' : status === 'PASS' ? 'Passed' : status === 'FAIL' ? 'Failed' : 'Pending'}
              </button>
            ))}
          </div>

          <div className={`flex items-center p-1 rounded-xl border ${
            isDarkMode ? 'bg-black/50 border-white/10' : 'bg-slate-100 border-slate-200'
          }`}>
            <button
              type="button"
              onClick={() => setViewMode('table')}
              className={`p-1.5 rounded-lg text-xs transition-all cursor-pointer ${
                viewMode === 'table'
                  ? isDarkMode ? 'bg-white/15 text-white shadow-xs' : 'bg-white text-slate-900 shadow-xs'
                  : isDarkMode ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900'
              }`}
              title="Table View"
            >
              <List className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-lg text-xs transition-all cursor-pointer ${
                viewMode === 'grid'
                  ? isDarkMode ? 'bg-white/15 text-white shadow-xs' : 'bg-white text-slate-900 shadow-xs'
                  : isDarkMode ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900'
              }`}
              title="Cards Grid View"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* ── MOBILE CARD LIST (Viewport < md) ──                                    */}
      {/* ========================================================================= */}
      <div className="md:hidden space-y-3">
        {filteredPdi.length === 0 ? (
          <div className={`p-8 text-center rounded-2xl border text-xs ${
            isDarkMode ? 'bg-[#09090B] border-white/10 text-slate-400' : 'bg-white border-slate-200 text-slate-500'
          }`}>
            No PDI inspections matching your query.
          </div>
        ) : (
          filteredPdi.map((pdi) => {
            const isPassed = pdi.pdiStatus === 'PASS';
            const isFailed = pdi.pdiStatus === 'FAIL';

            return (
              <div 
                key={pdi.id}
                className={`p-4 rounded-2xl border space-y-3 transition-all shadow-xs ${
                  isDarkMode ? 'bg-[#09090B] border-white/10' : 'bg-white border-slate-200/80'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-xs text-[#5B75F8] dark:text-[#7B92FF]">{pdi.jobNo}</span>
                      {pdi.orderPo && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-blue-500/10 text-[#5B75F8] dark:text-[#7B92FF] border border-blue-500/20">
                          {pdi.orderPo}
                        </span>
                      )}
                    </div>
                    <h3 className={`text-xs font-semibold mt-1 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                      {pdi.partDescription}
                    </h3>
                  </div>

                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-semibold uppercase border shrink-0 ${
                    isPassed
                      ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                      : isFailed
                      ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20'
                      : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20'
                  }`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${
                      isPassed ? 'bg-emerald-500' : isFailed ? 'bg-rose-500' : 'bg-amber-500'
                    }`} />
                    <span>{pdi.pdiStatus || 'PENDING'}</span>
                  </span>
                </div>

                {/* Part Code & Quantity Detail */}
                <div className={`grid grid-cols-2 gap-2 p-2.5 rounded-xl border text-xs text-center ${
                  isDarkMode ? 'bg-black/40 border-white/10' : 'bg-slate-50 border-slate-100'
                }`}>
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase block">Part Code</span>
                    <span className="font-semibold text-slate-700 dark:text-slate-200">{pdi.partCode || '—'}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase block">Inspection Qty</span>
                    <span className="font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
                      {pdi.acceptedQty ?? pdi.qty} NOS
                    </span>
                  </div>
                </div>

                {/* Inspector Notes */}
                {pdi.inspectorNotes && (
                  <div className={`p-2.5 rounded-xl border text-xs ${
                    isDarkMode ? 'bg-black/40 border-white/10 text-slate-300' : 'bg-slate-50 border-slate-100 text-slate-600'
                  }`}>
                    <span className="text-slate-400 font-semibold block text-[10px] uppercase">Observations:</span>
                    <span>{pdi.inspectorNotes}</span>
                  </div>
                )}

                {/* Action CTA Button */}
                <div className="flex items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      if (isPassed) {
                        handleOpenReinspect(pdi);
                        reinspectModal.open({ pdiNo: pdi.id, jobNo: pdi.jobNo, orderPo: pdi.orderPo });
                      } else {
                        handleOpenInspect(pdi);
                        inspectModal.open({ pdiNo: pdi.id, jobNo: pdi.jobNo, orderPo: pdi.orderPo });
                      }
                    }}
                    className={`flex-1 min-h-[38px] py-1.5 px-4 rounded-xl text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer active:scale-[0.96] shadow-xs ${
                      isPassed
                        ? 'bg-amber-600 hover:bg-amber-500 shadow-amber-600/20'
                        : 'bg-[#5B75F8] hover:bg-[#4E67F0] shadow-[#5B75F8]/25'
                    }`}
                  >
                    {isPassed ? <RotateCcw className="w-3.5 h-3.5" /> : <ClipboardCheck className="w-3.5 h-3.5" />}
                    <span>{isPassed ? 'Re-Inspect PDI' : 'Inspect PDI'}</span>
                  </button>

                  {(pdi.certificateNo || isPassed) && (
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedReport(pdi);
                        certModal.open({ pdiNo: pdi.id, jobNo: pdi.jobNo, orderPo: pdi.orderPo });
                      }}
                      className={`px-3.5 min-h-[38px] rounded-xl border flex items-center justify-center gap-1.5 text-xs font-bold cursor-pointer transition-all active:scale-[0.96] shadow-xs ${
                        isDarkMode 
                          ? 'bg-white/[0.06] border-white/10 text-slate-200 hover:bg-[#5B75F8]/20 hover:border-[#5B75F8]/50 hover:text-blue-300' 
                          : 'bg-white border-slate-200 text-slate-700 hover:bg-blue-50 hover:border-[#5B75F8]/60 hover:text-[#5B75F8]'
                      }`}
                      title="View CoC Certificate"
                    >
                      <Award className="w-3.5 h-3.5" />
                      <span>CoC</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* ========================================================================= */}
      {/* ── DESKTOP PDI VIEW: TABLE OR INSPECTOR CARD GRID (Viewport >= md) ──      */}
      {/* ========================================================================= */}
      {viewMode === 'table' ? (
        <div className={`hidden md:block overflow-hidden rounded-[22px] border transition-ui ${
          isDarkMode ? 'border-white/[0.08] bg-[#121215]' : 'border-slate-200 bg-white shadow-[0_12px_36px_rgba(15,23,42,0.06)]'
        }`}>
          <div className={`flex items-center justify-between border-b px-5 py-3 ${isDarkMode ? 'border-white/[0.07]' : 'border-slate-200'}`}>
            <div>
              <div className="text-xs font-extrabold text-slate-900 dark:text-white">Pre-Dispatch Inspection (PDI) Register</div>
              <div className="mt-0.5 text-[10px] text-slate-400">Final dimensional verification, outward CoC generation, and pre-delivery gate clearance</div>
            </div>
            <span className={`rounded-lg border px-2 py-1 font-mono text-[9px] font-bold uppercase tracking-wider ${isDarkMode ? 'border-white/[0.08] bg-white/[0.04] text-slate-400' : 'border-slate-200 bg-slate-50 text-slate-500'}`}>
              {filteredPdi.length} job cards
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className={`border-b font-mono font-bold uppercase tracking-[0.12em] text-[9px] ${
                  isDarkMode ? 'border-white/[0.07] bg-black/20 text-slate-500' : 'border-slate-200 bg-slate-50/80 text-slate-400'
                }`}>
                  <th className="py-4 px-5">Job Card #</th>
                  <th className="py-4 px-5">Customer PO</th>
                  <th className="py-4 px-5">Part Description</th>
                  <th className="py-4 px-5 text-right">Inspect Qty</th>
                  <th className="py-4 px-5 text-center">PDI Status</th>
                  <th className="py-4 px-5 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className={`divide-y ${isDarkMode ? 'divide-slate-800/60' : 'divide-slate-200'}`}>
                {filteredPdi.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-400 font-mono text-xs">
                      No PDI inspections matching your query.
                    </td>
                  </tr>
                ) : (
                  filteredPdi.map((pdi) => {
                    const isPassed = pdi.pdiStatus === 'PASS';
                    const isFailed = pdi.pdiStatus === 'FAIL';
                    return (
                      <tr 
                        key={pdi.id} 
                        onClick={() => {
                          if (isPassed) {
                            handleOpenReinspect(pdi);
                            reinspectModal.open({ pdiNo: pdi.id, jobNo: pdi.jobNo, orderPo: pdi.orderPo });
                          } else {
                            handleOpenInspect(pdi);
                            inspectModal.open({ pdiNo: pdi.id, jobNo: pdi.jobNo, orderPo: pdi.orderPo });
                          }
                        }}
                        className={`group transition-colors cursor-pointer ${isDarkMode ? 'hover:bg-white/[0.035]' : 'hover:bg-slate-50/80'}`}
                      >
                        <td className="py-4 px-5">
                          <div className="flex items-center gap-2.5">
                            <div className={`p-2 rounded-xl transition-transform group-hover:scale-105 shrink-0 ${
                              isDarkMode 
                                ? 'bg-[var(--accent-primary)]/20 text-[var(--accent-text-dark)] border border-[var(--accent-primary)]/30' 
                                : 'bg-[var(--accent-primary)]/10 text-[var(--accent-text-light)] border border-[var(--accent-primary)]/20'
                            }`}>
                              <Package className="w-3.5 h-3.5" />
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="font-bold text-xs font-mono text-[var(--accent-primary)] dark:text-[var(--accent-text-dark)]">
                                  {pdi.jobNo}
                                </span>
                              </div>
                            </div>
                            <ChevronRight className="w-3 h-3 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity ml-auto" />
                          </div>
                        </td>
                        <td className="py-4 px-5 font-mono text-xs">
                          {pdi.orderPo ? (
                            <span className="font-bold text-slate-800 dark:text-slate-200">
                              {pdi.orderPo}
                            </span>
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
                        </td>
                        <td className={`py-4 px-5 font-medium ${isDarkMode ? 'text-slate-100' : 'text-slate-800'}`}>
                          <span className="font-semibold text-slate-900 dark:text-white">{pdi.partCode}</span>
                          {pdi.partDescription && (
                            <span className="text-slate-400 dark:text-slate-500"> — {pdi.partDescription}</span>
                          )}
                        </td>
                        <td className="py-4 px-5 text-right font-bold font-mono tabular-nums">
                          <span className={isPassed ? 'text-emerald-600 dark:text-emerald-400' : isDarkMode ? 'text-white' : 'text-slate-900'}>
                            {pdi.acceptedQty ?? pdi.qty} NOS
                          </span>
                          {pdi.rejectedQty ? (
                            <div className="text-[10px] text-rose-500 font-normal">
                              ({pdi.rejectedQty} rejected)
                            </div>
                          ) : null}
                        </td>
                        <td className="py-4 px-5 text-center">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-[10px] font-mono font-bold uppercase border ${
                            isPassed
                              ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                              : isFailed
                              ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20'
                              : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20'
                          }`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${
                              isPassed ? 'bg-emerald-500' : isFailed ? 'bg-rose-500' : 'bg-amber-500'
                            }`} />
                            <span>{pdi.pdiStatus || 'PENDING'}</span>
                          </span>
                        </td>
                        <td className="py-4 px-5 text-center" onClick={(e) => e.stopPropagation()}>
                          <div className="w-[216px] mx-auto flex items-center justify-center gap-2">
                            {isPassed ? (
                              <>
                                {/* Re-Inspect Button (Fixed 128px) */}
                                <button
                                  type="button"
                                  onClick={() => {
                                    handleOpenReinspect(pdi);
                                    reinspectModal.open({ pdiNo: pdi.id, jobNo: pdi.jobNo, orderPo: pdi.orderPo });
                                  }}
                                  className="w-[128px] h-8 px-3 py-1.5 rounded-xl text-white text-xs font-bold transition-all cursor-pointer inline-flex items-center justify-center gap-1.5 shadow-xs active:scale-[0.96] bg-amber-600 hover:bg-amber-500 shadow-amber-600/25 shrink-0"
                                  title={`Re-Inspect PDI for ${pdi.jobNo}`}
                                >
                                  <RotateCcw className="w-3.5 h-3.5" />
                                  <span>Re-Inspect</span>
                                </button>

                                {/* CoC Button (Fixed 80px) - Apple Secondary Style */}
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSelectedReport(pdi);
                                    certModal.open({ pdiNo: pdi.id, jobNo: pdi.jobNo, orderPo: pdi.orderPo });
                                  }}
                                  className={`w-[80px] h-8 px-2.5 py-1.5 rounded-xl border text-xs font-bold transition-all cursor-pointer inline-flex items-center justify-center gap-1.5 active:scale-[0.96] shadow-xs shrink-0 ${
                                    isDarkMode 
                                      ? 'bg-white/[0.06] border-white/10 text-slate-200 hover:bg-[#5B75F8]/20 hover:border-[#5B75F8]/50 hover:text-blue-300' 
                                      : 'bg-white border-slate-200 text-slate-700 hover:bg-blue-50 hover:border-[#5B75F8]/60 hover:text-[#5B75F8]'
                                  }`}
                                  title="View Compliance Certificate"
                                >
                                  <FileCheck className="w-3.5 h-3.5" />
                                  <span>CoC</span>
                                </button>
                              </>
                            ) : (
                              /* Single Primary Action for Pending Lot (Spans exact full 216px container) */
                              <button
                                type="button"
                                onClick={() => {
                                  handleOpenInspect(pdi);
                                  inspectModal.open({ pdiNo: pdi.id, jobNo: pdi.jobNo, orderPo: pdi.orderPo });
                                }}
                                className={`w-full h-8 px-4 py-1.5 rounded-xl text-white text-xs font-bold transition-all cursor-pointer inline-flex items-center justify-center gap-1.5 shadow-xs active:scale-[0.96] ${
                                  isFailed
                                    ? 'bg-rose-600 hover:bg-rose-500 shadow-rose-600/25'
                                    : 'bg-[#5B75F8] hover:bg-[#4E67F0] shadow-[#5B75F8]/25'
                                }`}
                                title={isFailed ? `Re-Audit Failed PDI for ${pdi.jobNo}` : `Inspect PDI for ${pdi.jobNo}`}
                              >
                                {isFailed ? <RotateCcw className="w-3.5 h-3.5" /> : <ClipboardCheck className="w-3.5 h-3.5" />}
                                <span>{isFailed ? 'Re-Audit Failed' : 'Inspect PDI'}</span>
                              </button>
                            )}
                          </div>
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
        /* Grid Inspector Cards View */
        <div className="hidden md:grid grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredPdi.length === 0 ? (
            <div className={`col-span-full p-12 text-center rounded-2xl border text-xs ${
              isDarkMode ? 'bg-[#09090B] border-white/10 text-slate-400' : 'bg-white border-slate-200 text-slate-500'
            }`}>
              No PDI inspections matching your query.
            </div>
          ) : (
            filteredPdi.map((pdi) => {
              const isPassed = pdi.pdiStatus === 'PASS';
              const isFailed = pdi.pdiStatus === 'FAIL';

              return (
                <div
                  key={pdi.id}
                  onClick={() => {
                    if (isPassed) {
                      handleOpenReinspect(pdi);
                      reinspectModal.open({ pdiNo: pdi.id, jobNo: pdi.jobNo, orderPo: pdi.orderPo });
                    } else {
                      handleOpenInspect(pdi);
                      inspectModal.open({ pdiNo: pdi.id, jobNo: pdi.jobNo, orderPo: pdi.orderPo });
                    }
                  }}
                  className={`p-5 rounded-2xl border transition-all space-y-3.5 shadow-xs cursor-pointer hover:shadow-md ${
                    isPassed
                      ? isDarkMode ? 'bg-[#09090B] border-emerald-500/30 hover:border-emerald-500/50' : 'bg-white border-emerald-200 hover:border-emerald-300'
                      : isFailed
                      ? isDarkMode ? 'bg-[#09090B] border-rose-500/30 hover:border-rose-500/50' : 'bg-white border-rose-200 hover:border-rose-300'
                      : isDarkMode ? 'bg-[#09090B] border-white/10 hover:border-white/20' : 'bg-white border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="font-bold text-xs text-[#5B75F8] dark:text-[#7B92FF]">
                        {pdi.jobNo}
                      </span>
                      <h3 className={`text-sm font-bold mt-1 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                        {pdi.partCode}
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-1">
                        {pdi.partDescription || 'Precision Machined Component'}
                      </p>
                    </div>

                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-semibold uppercase border shrink-0 ${
                      isPassed
                        ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                        : isFailed
                        ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20'
                        : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20'
                    }`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${
                        isPassed ? 'bg-emerald-500' : isFailed ? 'bg-rose-500' : 'bg-amber-500'
                      }`} />
                      <span>{pdi.pdiStatus || 'PENDING'}</span>
                    </span>
                  </div>

                  <div className={`grid grid-cols-2 gap-2 p-2.5 rounded-xl border text-xs text-center ${
                    isDarkMode ? 'bg-black/40 border-white/10' : 'bg-slate-50 border-slate-100'
                  }`}>
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase block">Customer PO</span>
                      <span className="font-semibold text-slate-700 dark:text-slate-200">{pdi.orderPo || '—'}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase block">Target Qty</span>
                      <span className="font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">{pdi.qty} NOS</span>
                    </div>
                  </div>

                  {pdi.inspectorNotes ? (
                    <div className={`p-2.5 rounded-xl border text-xs line-clamp-2 ${
                      isDarkMode ? 'bg-black/40 border-white/10 text-slate-300' : 'bg-slate-50 border-slate-100 text-slate-600'
                    }`}>
                      <span className="text-slate-400 font-semibold block text-[10px] uppercase">Notes:</span>
                      <span>{pdi.inspectorNotes}</span>
                    </div>
                  ) : (
                    <div className="text-[11px] text-slate-400 italic">No notes recorded yet</div>
                  )}

                  <div className="pt-2 border-t border-slate-100 dark:border-white/5 flex items-center justify-between" onClick={(e) => e.stopPropagation()}>
                    <span className="text-[11px] text-slate-400 font-medium">Click to inspect</span>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => {
                          if (isPassed) {
                            handleOpenReinspect(pdi);
                            reinspectModal.open({ pdiNo: pdi.id, jobNo: pdi.jobNo, orderPo: pdi.orderPo });
                          } else {
                            handleOpenInspect(pdi);
                            inspectModal.open({ pdiNo: pdi.id, jobNo: pdi.jobNo, orderPo: pdi.orderPo });
                          }
                        }}
                        className={`px-3.5 py-1.5 rounded-xl text-white text-xs font-bold shadow-xs flex items-center gap-1.5 transition-all active:scale-[0.96] cursor-pointer ${
                          isPassed ? 'bg-amber-600 hover:bg-amber-500' : 'bg-[#5B75F8] hover:bg-[#4E67F0]'
                        }`}
                      >
                        {isPassed ? <RotateCcw className="w-3.5 h-3.5" /> : <ClipboardCheck className="w-3.5 h-3.5" />}
                        <span>{isPassed ? 'Re-Inspect' : 'Inspect'}</span>
                      </button>
                      {(pdi.certificateNo || isPassed) && (
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedReport(pdi);
                            certModal.open({ pdiNo: pdi.id, jobNo: pdi.jobNo, orderPo: pdi.orderPo });
                          }}
                          className={`px-2.5 py-1.5 rounded-xl border text-xs font-bold transition-all cursor-pointer inline-flex items-center gap-1 active:scale-[0.96] shadow-xs ${
                            isDarkMode 
                              ? 'bg-white/[0.06] border-white/10 text-slate-200 hover:bg-[#5B75F8]/20 hover:border-[#5B75F8]/50 hover:text-blue-300' 
                              : 'bg-white border-slate-200 text-slate-700 hover:bg-blue-50 hover:border-[#5B75F8]/60 hover:text-[#5B75F8]'
                          }`}
                          title="View CoC Certificate"
                        >
                          <Award className="w-3.5 h-3.5" />
                          <span>CoC</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* ── GLOBAL PDI AUDIT BOX MODAL (Apple Sheet Presentation) ──               */}
      {/* ========================================================================= */}
      {isGlobalAuditOpen && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/60 dark:bg-black/80 backdrop-blur-xl animate-in fade-in duration-200 font-sans overflow-y-auto"
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsGlobalAuditOpen(false);
          }}
        >
          <div className={`relative w-full max-w-4xl h-[82vh] max-h-[750px] min-h-[520px] flex flex-col rounded-3xl border shadow-2xl transition-all overflow-hidden ${
            isDarkMode 
              ? 'bg-[#121316]/95 border-white/[0.08] text-slate-100 shadow-[0_24px_70px_rgba(0,0,0,0.85)]' 
              : 'bg-white/95 border-slate-200/90 text-slate-900 shadow-[0_24px_70px_rgba(15,23,42,0.18)]'
          }`}>
            {/* Top Right Close Button */}
            <button
              type="button"
              onClick={() => setIsGlobalAuditOpen(false)}
              className={`absolute top-4 right-4 z-20 w-8 h-8 rounded-full flex items-center justify-center transition-all cursor-pointer ${
                isDarkMode
                  ? 'bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-900'
              }`}
              title="Close (Esc)"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Apple Sheet Header */}
            <div className={`px-6 py-4 border-b flex items-center justify-between gap-3 shrink-0 ${
              isDarkMode ? 'border-white/[0.07] bg-[#16171c]/80' : 'border-slate-200/80 bg-slate-50/90'
            }`}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl flex items-center justify-center bg-blue-500/10 text-[#5B75F8] dark:text-[#7B92FF] border border-blue-500/20">
                  <ClipboardCheck className="w-5 h-5 stroke-[2]" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-base sm:text-lg font-bold tracking-tight text-slate-900 dark:text-white">
                      Global PDI Audit Queue
                    </h2>
                    <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/25">
                      {pendingCount} JCs Remaining
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Pre-dispatch clearance pool for all Job Cards awaiting visual, dimensional, and gauge audits.
                  </p>
                </div>
              </div>
            </div>

            {/* Global Audit Search & Stats Bar */}
            <div className={`px-6 py-3 border-b flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0 ${
              isDarkMode ? 'bg-black/30 border-white/[0.06]' : 'bg-slate-50/60 border-slate-200/70'
            }`}>
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  value={globalAuditSearch}
                  onChange={(e) => setGlobalAuditSearch(e.target.value)}
                  placeholder="Filter pending JCs by Job #, PO #, Part Code..."
                  className={`w-full pl-9 pr-8 py-2 rounded-xl text-xs font-medium outline-none transition-all ${
                    isDarkMode
                      ? 'bg-black/50 border border-white/10 text-white placeholder-slate-500 focus:border-[#5B75F8]'
                      : 'bg-white border border-slate-300 text-slate-900 placeholder-slate-400 focus:border-[#5B75F8]'
                  }`}
                />
                {globalAuditSearch && (
                  <button
                    onClick={() => setGlobalAuditSearch('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white p-0.5 cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              <div className="text-xs text-slate-400 flex items-center gap-2">
                <span>Showing <strong>{pendingAuditJCs.length}</strong> of {pendingCount} pending</span>
              </div>
            </div>

            {/* Scrollable List of All Pending Job Cards */}
            <div className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-6 space-y-3">
              {pendingAuditJCs.length === 0 ? (
                <div className="py-12 text-center space-y-3">
                  <div className="w-14 h-14 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center mx-auto">
                    <CheckCircle2 className="w-7 h-7" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                      {pendingCount === 0 ? 'All Job Cards Cleared!' : 'No Matching Pending Lots'}
                    </h4>
                    <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1">
                      {pendingCount === 0 
                        ? 'All finished goods lots have passed Pre-Dispatch Inspection with CoC issued.' 
                        : 'No pending Job Cards matched your filter query. Try searching with different terms.'}
                    </p>
                  </div>
                </div>
              ) : (
                pendingAuditJCs.map((item) => (
                  <div
                    key={item.id}
                    className={`p-4 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs hover:shadow-sm ${
                      isDarkMode
                        ? 'bg-white/[0.02] border-white/[0.08] hover:border-white/20'
                        : 'bg-slate-50/70 border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-blue-500/10 text-[#5B75F8] dark:text-[#7B92FF] shrink-0 mt-0.5">
                        <Package className="w-4 h-4 stroke-[2]" />
                      </div>
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-mono font-bold text-sm text-[#5B75F8] dark:text-[#7B92FF]">
                            {item.jobNo}
                          </span>
                          {item.orderPo && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-blue-500/10 text-[#5B75F8] dark:text-[#7B92FF] border border-blue-500/20">
                              PO: {item.orderPo}
                            </span>
                          )}
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                            Awaiting PDI
                          </span>
                        </div>
                        <div className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                          {item.partCode} — <span className="font-normal text-slate-500 dark:text-slate-400">{item.partDescription}</span>
                        </div>
                        <div className="text-[11px] text-slate-400 flex items-center gap-3">
                          <span>Inspection Lot Qty: <strong className="text-slate-700 dark:text-slate-200 font-bold">{item.qty} NOS</strong></span>
                          <span>•</span>
                          <span>4-Point Check: Go/No-Go Plug & Surface Finish</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 sm:self-center">
                      <button
                        type="button"
                        onClick={() => {
                          setIsGlobalAuditOpen(false);
                          handleOpenInspect(item);
                          inspectModal.open({ pdiNo: item.id, jobNo: item.jobNo, orderPo: item.orderPo });
                        }}
                        className="w-full sm:w-auto px-4 py-2 rounded-xl bg-[#5B75F8] hover:bg-[#4E67F0] text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-md shadow-[#5B75F8]/25 cursor-pointer transition-all active:scale-[0.96]"
                      >
                        <ClipboardCheck className="w-3.5 h-3.5" />
                        <span>Audit This JC</span>
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Apple Sheet Footer */}
            <div className={`px-6 py-3.5 border-t flex items-center justify-between shrink-0 ${
              isDarkMode ? 'border-white/[0.07] bg-[#16171c]/80' : 'border-slate-200/80 bg-slate-50/90'
            }`}>
              <span className="text-xs text-slate-400 font-medium">
                {pendingCount} Job Cards waiting in dispatch release queue
              </span>
              <button
                type="button"
                onClick={() => setIsGlobalAuditOpen(false)}
                className={`px-4 py-1.5 rounded-xl border text-xs font-medium cursor-pointer transition-all ${
                  isDarkMode ? 'border-white/10 text-slate-300 hover:text-white hover:bg-white/10' : 'border-slate-300 text-slate-700 hover:bg-slate-100'
                }`}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 1. INITIAL PDI INSPECTION MODAL (Apple Sheet Presentation)                */}
      {/* ========================================================================= */}
      {inspectModal.isOpen && inspectingItem && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 dark:bg-black/80 backdrop-blur-xl font-sans overflow-y-auto">
          <div className={`relative w-full max-w-2xl max-h-[92vh] sm:max-h-[90vh] flex flex-col rounded-t-3xl sm:rounded-3xl border shadow-2xl backdrop-blur-2xl transition-all overflow-hidden ${
            isDarkMode 
              ? 'bg-[#121316]/95 border-white/[0.08] text-white shadow-[0_28px_80px_rgba(0,0,0,0.85)]' 
              : 'bg-[#FAFAFC] border-slate-200/90 text-slate-900 shadow-[0_24px_70px_rgba(15,23,42,0.18)]'
          }`}>
            {/* Modal Window Header */}
            <div className={`flex items-center justify-between px-6 py-4 border-b shrink-0 ${
              isDarkMode ? 'border-white/[0.07] bg-[#16171c]/80' : 'border-slate-200/80 bg-slate-50/90'
            }`}>
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-500/15 text-[#5B75F8] dark:text-[#7B92FF] border border-blue-500/25 shadow-xs shrink-0">
                  <ClipboardCheck className="w-5 h-5 stroke-[2]" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-base tracking-tight text-slate-900 dark:text-white">
                      Pre-Dispatch Inspection (PDI)
                    </h3>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-blue-500/10 text-[#5B75F8] dark:text-[#7B92FF] border border-blue-500/20">
                      QA Audit
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    <span>Job Card: <strong className="font-mono text-slate-800 dark:text-slate-200">{inspectingItem.jobNo}</strong></span>
                    <span>•</span>
                    <span>Customer PO: <strong className="font-mono text-slate-800 dark:text-slate-200">{inspectingItem.orderPo || 'PO-DIRECT'}</strong></span>
                  </div>
                </div>
              </div>
              <button 
                type="button"
                onClick={() => {
                  setInspectingItem(null);
                  inspectModal.close();
                }} 
                className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:bg-white/10 hover:text-white transition-all cursor-pointer"
                title="Close (Esc)"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Form Body */}
            <div className="p-5 sm:p-6 space-y-4 overflow-y-auto flex-1 text-xs">
              
              {/* Part Specification Hero Bento Card */}
              <div className={`p-4 sm:p-5 rounded-2xl border space-y-3 ${
                isDarkMode ? 'bg-black/40 border-white/[0.08]' : 'bg-white border-slate-200 shadow-2xs'
              }`}>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Component Specification</span>
                      <span className="font-mono text-[11px] px-2 py-0.5 rounded-md bg-blue-500/10 text-[#5B75F8] dark:text-[#7B92FF] font-bold">
                        {inspectingItem.partCode}
                      </span>
                    </div>
                    <div className="text-sm font-extrabold text-slate-900 dark:text-white">
                      {inspectingItem.partDescription || 'Precision CNC Machined Component'}
                    </div>
                  </div>

                  <div className="flex items-center gap-3 sm:text-right border-t sm:border-t-0 pt-2 sm:pt-0 border-slate-100 dark:border-white/5">
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider block">Lot Size</span>
                      <span className="text-lg font-black text-emerald-600 dark:text-emerald-400 tabular-nums">
                        {inspectingItem.qty} NOS
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* 4-Point Quality Verification Protocols - Interactive Bento Grid */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] uppercase font-bold tracking-wider text-slate-400">
                    Quality Verification Protocols (4-Point Mandatory)
                  </label>
                  <button
                    type="button"
                    onClick={handleSelectAllChecklist}
                    className="text-[11px] text-[#5B75F8] dark:text-[#7B92FF] font-bold hover:underline cursor-pointer"
                  >
                    Select All (4/4 Verified)
                  </button>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {[
                    { key: 'visualFinish', label: '1. Visual Finish & Deburring', desc: 'No burrs, sharp edges, or surface scratches' },
                    { key: 'dimensionalAudit', label: '2. Dimensions & Tolerances', desc: '100% drawing tolerances & CMM verified' },
                    { key: 'gaugesChecked', label: '3. Gauge & Thread Fitment', desc: 'Go/No-Go plug and ring gauges cleared' },
                    { key: 'packagingRustProof', label: '4. Anti-Rust & Packaging', desc: 'VCI oil applied, barcode label attached' }
                  ].map(({ key, label, desc }) => {
                    const isChecked = !!checklist[key as keyof typeof checklist];
                    return (
                      <div
                        key={key}
                        onClick={() => handleToggleChecklist(key as keyof typeof checklist)}
                        className={`p-3.5 rounded-2xl border cursor-pointer transition-all flex items-start gap-2.5 select-none ${
                          isChecked
                            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-900 dark:text-emerald-300 ring-1 ring-emerald-500/20 shadow-xs'
                            : isDarkMode
                            ? 'bg-black/30 border-white/10 text-slate-400 hover:border-white/20'
                            : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                        }`}
                      >
                        <div className={`mt-0.5 p-0.5 rounded-md ${
                          isChecked ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400'
                        }`}>
                          {isChecked ? <CheckSquare className="w-4 h-4 stroke-[2.5]" /> : <Square className="w-4 h-4 stroke-[1.5]" />}
                        </div>
                        <div>
                          <div className="font-bold text-xs">{label}</div>
                          <div className="text-[11px] opacity-80 mt-0.5">{desc}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Quantity Allocation Cards */}
              <div className={`p-4 rounded-2xl border space-y-3 ${
                isDarkMode ? 'bg-black/30 border-white/[0.08]' : 'bg-white border-slate-200 shadow-2xs'
              }`}>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">
                    Inspection Disposition
                  </span>
                  <span className="text-[11px] font-mono text-slate-400">
                    Target: <strong className="text-slate-700 dark:text-slate-200">{inspectingItem.qty} NOS</strong>
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                        Accepted Qty *
                      </label>
                      <button
                        type="button"
                        onClick={() => {
                          setAcceptedQty(inspectingItem.qty || 1);
                          setRejectedQty(0);
                        }}
                        className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20 cursor-pointer transition-all"
                      >
                        All ({inspectingItem.qty})
                      </button>
                    </div>
                    <input
                      type="number"
                      min={0}
                      max={inspectingItem.qty}
                      value={acceptedQty}
                      onChange={(e) => {
                        const val = Math.max(0, Number(e.target.value));
                        setAcceptedQty(val);
                        setRejectedQty(Math.max(0, (inspectingItem.qty || 0) - val));
                      }}
                      className={`w-full px-3.5 py-2.5 rounded-xl border text-sm font-extrabold tabular-nums outline-none transition-all ${
                        isDarkMode 
                          ? 'bg-black/60 border-white/10 text-emerald-400 focus:border-emerald-500' 
                          : 'bg-slate-50 border-slate-200 text-emerald-600 focus:border-emerald-500'
                      }`}
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                        Rejected / Scrap Qty
                      </label>
                      {rejectedQty > 0 && (
                        <span className="text-[10px] font-bold text-rose-500">
                          Non-conforming
                        </span>
                      )}
                    </div>
                    <input
                      type="number"
                      min={0}
                      value={rejectedQty}
                      onChange={(e) => setRejectedQty(Math.max(0, Number(e.target.value)))}
                      className={`w-full px-3.5 py-2.5 rounded-xl border text-sm font-extrabold tabular-nums outline-none transition-all ${
                        isDarkMode 
                          ? 'bg-black/60 border-white/10 text-rose-400 focus:border-rose-500' 
                          : 'bg-slate-50 border-slate-200 text-rose-600 focus:border-rose-500'
                      }`}
                    />
                  </div>
                </div>
              </div>

              {/* Certificate No & Document Reference */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5">
                    CoC Certificate Number
                  </label>
                  <input
                    type="text"
                    value={certificateNo}
                    onChange={(e) => setCertificateNo(e.target.value)}
                    placeholder="e.g. PDI-COC-2026-001"
                    className={`w-full px-3.5 py-2.5 rounded-xl border font-mono text-xs font-bold outline-none transition-all ${
                      isDarkMode 
                        ? 'bg-black/60 border-white/10 text-white focus:border-[#5B75F8]' 
                        : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-[#5B75F8]'
                    }`}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5">
                    External Inspection Report URL (Optional)
                  </label>
                  <input
                    type="text"
                    value={reportUrl}
                    onChange={(e) => setReportUrl(e.target.value)}
                    placeholder="e.g. https://storage.../coc-report.pdf"
                    className={`w-full px-3.5 py-2.5 rounded-xl border text-xs outline-none transition-all ${
                      isDarkMode 
                        ? 'bg-black/60 border-white/10 text-white focus:border-[#5B75F8]' 
                        : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-[#5B75F8]'
                    }`}
                  />
                </div>
              </div>

              {/* Inspector Remarks */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5">
                  Inspector Observations & Release Findings
                </label>
                <textarea
                  rows={2}
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  placeholder="e.g. Surface finish Ra 0.8 achieved. Thread gauges matched cleanly. Ready for dispatch."
                  className={`w-full px-3.5 py-2.5 rounded-xl border text-xs outline-none transition-all ${
                    isDarkMode 
                      ? 'bg-black/60 border-white/10 text-white focus:border-[#5B75F8]' 
                      : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-[#5B75F8]'
                  }`}
                />
              </div>

            </div>

            {/* Modal Actions Footer */}
            <div className={`px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-3 border-t shrink-0 ${
              isDarkMode ? 'border-white/[0.07] bg-[#16171c]/80' : 'border-slate-200/80 bg-slate-50/90'
            }`}>
              <button
                type="button"
                onClick={() => handleInspectSubmit('FAIL')}
                disabled={isSubmitting}
                className="w-full sm:w-auto px-4 py-2.5 rounded-xl border border-rose-500/30 bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-all active:scale-[0.96] disabled:opacity-50"
              >
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>PDI Fail (Flag Rework)</span>
              </button>

              <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
                <button
                  type="button"
                  onClick={() => {
                    setInspectingItem(null);
                    inspectModal.close();
                  }}
                  className={`flex-1 sm:flex-initial px-5 py-2.5 rounded-xl border text-xs font-bold cursor-pointer transition-all active:scale-[0.96] ${
                    isDarkMode 
                      ? 'border-white/10 bg-white/[0.06] text-slate-200 hover:bg-white/[0.12] hover:text-white' 
                      : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => handleInspectSubmit('PASS')}
                  disabled={isSubmitting || acceptedQty <= 0}
                  className="flex-1 sm:flex-initial px-6 py-2.5 rounded-xl bg-[#5B75F8] hover:bg-[#4E67F0] text-white font-extrabold text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow-md shadow-[#5B75F8]/25 transition-all active:scale-[0.96] disabled:opacity-50"
                >
                  <ShieldCheck className="w-4 h-4" />
                  <span>{isSubmitting ? 'Processing...' : 'Complete PDI (Pass & Release)'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. RE-INSPECT PDI UI BOX MODAL (Distinct Apple Sheet with Remove CoC)     */}
      {/* ========================================================================= */}
      {reinspectModal.isOpen && reinspectingItem && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 dark:bg-black/80 backdrop-blur-xl font-sans overflow-y-auto">
          <div className={`relative w-full max-w-2xl max-h-[92vh] sm:max-h-[90vh] flex flex-col rounded-t-3xl sm:rounded-3xl border shadow-2xl backdrop-blur-2xl transition-all overflow-hidden ${
            isDarkMode 
              ? 'bg-[#121316]/95 border-amber-500/25 text-white shadow-[0_28px_80px_rgba(0,0,0,0.85)]' 
              : 'bg-[#FAFAFC] border-amber-300/80 text-slate-900 shadow-[0_24px_70px_rgba(15,23,42,0.18)]'
          }`}>
            {/* Window Header */}
            <div className={`flex items-center justify-between px-6 py-4 border-b shrink-0 ${
              isDarkMode ? 'border-white/[0.07] bg-[#16171c]/80' : 'border-amber-200/60 bg-amber-50/50'
            }`}>
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-500/15 text-amber-500 border border-amber-500/30 shadow-xs shrink-0">
                  <RotateCcw className="w-5 h-5 stroke-[2]" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-base tracking-tight text-slate-900 dark:text-white">
                      PDI Re-Inspection & Audit Revision
                    </h3>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/25">
                      RE-AUDIT ACTIVE
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                    <span>Job Card: <strong className="font-mono text-slate-800 dark:text-slate-200">{reinspectingItem.jobNo}</strong></span>
                    <span>•</span>
                    <span>Customer PO: <strong className="font-mono text-slate-800 dark:text-slate-200">{reinspectingItem.orderPo || 'PO-DIRECT'}</strong></span>
                  </div>
                </div>
              </div>
              <button 
                type="button"
                onClick={() => {
                  setReinspectingItem(null);
                  reinspectModal.close();
                }} 
                className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:bg-white/10 hover:text-white transition-all cursor-pointer"
                title="Close (Esc)"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Form Body */}
            <div className="p-5 sm:p-6 space-y-4 overflow-y-auto flex-1 text-xs">
              
              {/* Current Clearance Snapshot Box */}
              <div className={`p-4 rounded-2xl border space-y-2.5 ${
                isDarkMode ? 'bg-amber-500/[0.06] border-amber-500/25' : 'bg-amber-50/80 border-amber-200 shadow-2xs'
              }`}>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] uppercase font-bold tracking-wider text-amber-700 dark:text-amber-400">
                      Existing Certificate of Compliance:
                    </span>
                    <span className="font-mono font-bold text-xs text-amber-700 dark:text-amber-300">
                      {reinspectingItem.certificateNo || 'PDI-COC-ACTIVE'}
                    </span>
                  </div>
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    Previously Cleared
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs pt-2 border-t border-amber-500/20">
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider block">Part Reference</span>
                    <span className="font-extrabold text-slate-900 dark:text-white">{reinspectingItem.partCode}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider block">Certified Qty</span>
                    <span className="font-black text-emerald-600 dark:text-emerald-400 tabular-nums">
                      {reinspectingItem.acceptedQty || reinspectingItem.qty} NOS
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider block">Last Inspection Date</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">
                      {reinspectingItem.reportDate || 'Previous Audit'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Reason for Re-Inspection */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5">
                  Reason for Re-Inspection / Revision Audit *
                </label>
                <select
                  value={reinspectReason}
                  onChange={(e) => setReinspectReason(e.target.value)}
                  className={`w-full px-3.5 py-2.5 rounded-xl border text-xs font-semibold outline-none transition-all ${
                    isDarkMode 
                      ? 'bg-black/60 border-white/10 text-white focus:border-amber-400' 
                      : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-amber-500'
                  }`}
                >
                  <option value="Customer Pre-Shipment Audit">Customer Pre-Shipment Audit</option>
                  <option value="Re-Sampling & Tolerance Audit">Re-Sampling & Tolerance Audit</option>
                  <option value="Packaging & Surface Re-verification">Packaging & Surface Re-verification</option>
                  <option value="Inspector Shift Turnover Review">Inspector Shift Turnover Review</option>
                  <option value="Rework / Rectification Check">Rework / Rectification Check</option>
                  <option value="Client Specification Revision">Client Specification Revision</option>
                </select>
              </div>

              {/* Revised 4-Point Checklist */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] uppercase font-bold tracking-wider text-slate-400">
                    Re-Check Quality & Compliance Protocols
                  </label>
                  <button
                    type="button"
                    onClick={handleSelectAllReinspectChecklist}
                    className="text-[11px] text-amber-600 dark:text-amber-400 font-bold hover:underline cursor-pointer"
                  >
                    Select All (4/4 Verified)
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {[
                    { key: 'visualFinish', label: '1. Visual Finish & Deburring', desc: 'No burrs, sharp edges, or surface blemishes' },
                    { key: 'dimensionalAudit', label: '2. Dimensions & Tolerances', desc: '100% drawing tolerances verified' },
                    { key: 'gaugesChecked', label: '3. Gauge & Thread Fitment', desc: 'Go/No-Go plug and ring gauges cleared' },
                    { key: 'packagingRustProof', label: '4. Anti-Rust & Packaging', desc: 'VCI oil applied, barcode label attached' }
                  ].map(({ key, label, desc }) => {
                    const isChecked = !!reinspectChecklist[key as keyof typeof reinspectChecklist];
                    return (
                      <div
                        key={key}
                        onClick={() => handleToggleReinspectChecklist(key as keyof typeof reinspectChecklist)}
                        className={`p-3.5 rounded-2xl border cursor-pointer transition-all flex items-start gap-2.5 select-none ${
                          isChecked
                            ? 'bg-amber-500/10 border-amber-500/30 text-amber-900 dark:text-amber-300 ring-1 ring-amber-500/20 shadow-xs'
                            : isDarkMode
                            ? 'bg-black/30 border-white/10 text-slate-400 hover:border-white/20'
                            : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                        }`}
                      >
                        <div className={`mt-0.5 p-0.5 rounded-md ${
                          isChecked ? 'text-amber-600 dark:text-amber-400' : 'text-slate-400'
                        }`}>
                          {isChecked ? <CheckSquare className="w-4 h-4 stroke-[2.5]" /> : <Square className="w-4 h-4 stroke-[1.5]" />}
                        </div>
                        <div>
                          <div className="font-bold text-xs">{label}</div>
                          <div className="text-[11px] opacity-80 mt-0.5">{desc}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Revised Quantities */}
              <div className={`p-4 rounded-2xl border space-y-3 ${
                isDarkMode ? 'bg-black/30 border-white/[0.08]' : 'bg-white border-slate-200 shadow-2xs'
              }`}>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">
                    Revised Quantity Allocation
                  </span>
                  <span className="text-[11px] font-mono text-slate-400">
                    Total Lot: <strong className="text-slate-700 dark:text-slate-200">{reinspectingItem.qty} NOS</strong>
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                        Accepted Qty *
                      </label>
                      <button
                        type="button"
                        onClick={() => {
                          setReinspectAcceptedQty(reinspectingItem.qty || 1);
                          setReinspectRejectedQty(0);
                        }}
                        className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 hover:bg-amber-500/20 cursor-pointer transition-all"
                      >
                        All ({reinspectingItem.qty})
                      </button>
                    </div>
                    <input
                      type="number"
                      min={0}
                      max={reinspectingItem.qty}
                      value={reinspectAcceptedQty}
                      onChange={(e) => {
                        const val = Math.max(0, Number(e.target.value));
                        setReinspectAcceptedQty(val);
                        setReinspectRejectedQty(Math.max(0, (reinspectingItem.qty || 0) - val));
                      }}
                      className={`w-full px-3.5 py-2.5 rounded-xl border text-sm font-extrabold tabular-nums outline-none transition-all ${
                        isDarkMode 
                          ? 'bg-black/60 border-white/10 text-emerald-400 focus:border-emerald-500' 
                          : 'bg-slate-50 border-slate-200 text-emerald-600 focus:border-emerald-500'
                      }`}
                    />
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                        Rejected / Scrap
                      </label>
                      {reinspectRejectedQty > 0 && (
                        <span className="text-[10px] font-bold text-rose-500">
                          Non-conforming
                        </span>
                      )}
                    </div>
                    <input
                      type="number"
                      min={0}
                      value={reinspectRejectedQty}
                      onChange={(e) => setReinspectRejectedQty(Math.max(0, Number(e.target.value)))}
                      className={`w-full px-3.5 py-2.5 rounded-xl border text-sm font-extrabold tabular-nums outline-none transition-all ${
                        isDarkMode 
                          ? 'bg-black/60 border-white/10 text-rose-400 focus:border-rose-500' 
                          : 'bg-slate-50 border-slate-200 text-rose-600 focus:border-rose-500'
                      }`}
                    />
                  </div>
                </div>
              </div>

              {/* Revised Observations */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5">
                  Re-Inspection Observations & Findings
                </label>
                <textarea
                  rows={2}
                  value={reinspectRemarks}
                  onChange={(e) => setReinspectRemarks(e.target.value)}
                  placeholder="Record re-inspection notes, measurement tools used, or reason for changes..."
                  className={`w-full px-3.5 py-2.5 rounded-xl border text-xs outline-none transition-all ${
                    isDarkMode 
                      ? 'bg-black/60 border-white/10 text-white focus:border-amber-400' 
                      : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-amber-500'
                  }`}
                />
              </div>

            </div>

            {/* Modal Actions Footer with REMOVE COC BUTTON */}
            <div className={`px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-3 border-t shrink-0 ${
              isDarkMode ? 'border-white/[0.07] bg-[#16171c]/80' : 'border-slate-200/80 bg-slate-50/90'
            }`}>
              {/* THE REMOVE COC BUTTON */}
              <button
                type="button"
                onClick={() => {
                  setRevokeTargetItem(reinspectingItem);
                  setShowRevokeConfirm(true);
                }}
                disabled={isSubmitting}
                className="w-full sm:w-auto px-4 py-2 rounded-xl border border-rose-500/35 bg-rose-500/10 hover:bg-rose-500/25 text-rose-600 dark:text-rose-400 text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-all active:scale-[0.96] disabled:opacity-50"
                title="Revoke Certificate of Compliance and return to PDI Queue"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Remove CoC (Revoke)</span>
              </button>

              <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
                <button
                  type="button"
                  onClick={() => {
                    setReinspectingItem(null);
                    reinspectModal.close();
                  }}
                  className={`flex-1 sm:flex-initial px-5 py-2 rounded-xl border text-xs font-bold cursor-pointer transition-all active:scale-[0.96] ${
                    isDarkMode 
                      ? 'border-white/10 bg-white/[0.06] text-slate-200 hover:bg-white/[0.12] hover:text-white' 
                      : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={() => handleReinspectSubmit('PASS')}
                  disabled={isSubmitting || reinspectAcceptedQty <= 0}
                  className="flex-1 sm:flex-initial px-6 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-extrabold text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow-md shadow-amber-600/30 transition-all active:scale-[0.96] disabled:opacity-50"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>{isSubmitting ? 'Updating...' : 'Update & Re-Certify'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. REMOVE COC CONFIRMATION DIALOG (Apple Destructive Alert Sheet)         */}
      {/* ========================================================================= */}
      {showRevokeConfirm && (
        <div 
          className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xl animate-in fade-in duration-200 font-sans"
          onClick={() => setShowRevokeConfirm(false)}
        >
          <div 
            className={`w-full max-w-md p-6 rounded-3xl border shadow-2xl space-y-4 ${
              isDarkMode 
                ? 'bg-[#18191e] border-rose-500/30 text-white' 
                : 'bg-white border-rose-200 text-slate-900'
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl flex items-center justify-center bg-rose-500/15 text-rose-500 border border-rose-500/30 shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-rose-600 dark:text-rose-400">
                  Revoke Certificate of Compliance?
                </h3>
                <p className="text-xs text-slate-400">
                  Job Card: <strong>{revokeTargetItem?.jobNo}</strong>
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              Are you sure you want to remove CoC <strong>{revokeTargetItem?.certificateNo || 'Certificate'}</strong>? 
              This will revoke clearance, reset quantities, and return this Job Card to the active PDI queue as <strong>PENDING</strong>.
            </p>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setShowRevokeConfirm(false)}
                className={`px-4 py-2 rounded-xl border text-xs font-medium cursor-pointer transition-all ${
                  isDarkMode ? 'border-white/10 text-slate-300 hover:text-white hover:bg-white/10' : 'border-slate-300 text-slate-700 hover:bg-slate-100'
                }`}
              >
                Keep CoC
              </button>
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => {
                  if (revokeTargetItem) {
                    handleRemoveCoC(revokeTargetItem);
                  }
                }}
                className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs cursor-pointer shadow-md shadow-rose-600/30 transition-all active:scale-[0.96] disabled:opacity-50"
              >
                {isSubmitting ? 'Revoking...' : 'Revoke & Remove CoC'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 4. PDI CERTIFICATE MODAL (Apple Sheet Presentation)                       */}
      {/* ========================================================================= */}
      {certModal.isOpen && selectedReport && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 dark:bg-black/80 backdrop-blur-xl font-sans overflow-y-auto">
          <div className={`relative w-full max-w-2xl max-h-[92vh] sm:max-h-[90vh] flex flex-col rounded-t-3xl sm:rounded-3xl border shadow-2xl backdrop-blur-2xl transition-all overflow-hidden ${
            isDarkMode 
              ? 'bg-[#121316]/95 border-white/[0.08] text-white shadow-[0_28px_80px_rgba(0,0,0,0.85)]' 
              : 'bg-[#FAFAFC] border-slate-200/90 text-slate-900 shadow-[0_24px_70px_rgba(15,23,42,0.18)]'
          }`}>
            {/* Apple Sheet Header */}
            <div className={`flex items-center justify-between px-6 py-4 border-b shrink-0 ${
              isDarkMode ? 'border-white/[0.07] bg-[#16171c]/80' : 'border-slate-200/80 bg-slate-50/90'
            }`}>
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/25 shadow-xs shrink-0">
                  <Award className="w-5 h-5 stroke-[2]" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-base tracking-tight text-slate-900 dark:text-white">
                      Certificate of Compliance (CoC)
                    </h3>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                      ISO 9001:2015
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Pre-Dispatch Quality Clearance • Official Quality Document
                  </p>
                </div>
              </div>

              {/* Window Controls */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handlePrintCoC}
                  className={`px-3 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer shadow-xs active:scale-[0.96] ${
                    isDarkMode 
                      ? 'bg-white/[0.06] border-white/10 text-slate-200 hover:bg-white/[0.12] hover:text-white' 
                      : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100 hover:text-slate-900'
                  }`}
                  title="Print Certificate"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Print Document</span>
                </button>

                <button 
                  type="button"
                  onClick={() => {
                    setSelectedReport(null);
                    certModal.close();
                  }} 
                  className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:bg-white/10 hover:text-white transition-all cursor-pointer"
                  title="Close (Esc)"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Scrollable Certificate Canvas Container */}
            <div className="p-5 sm:p-6 space-y-4 overflow-y-auto flex-1 text-xs">
              
              {/* PRINTABLE CERTIFICATE CANVAS */}
              <div 
                id="pdi-coc-document" 
                className={`p-6 sm:p-7 rounded-3xl border space-y-5 transition-all shadow-xs ${
                  isDarkMode 
                    ? 'bg-black/40 border-white/[0.08]' 
                    : 'bg-white border-slate-200'
                }`}
              >
                {/* 1. Official Organization Masthead */}
                <div className={`pb-4 border-b flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                  isDarkMode ? 'border-white/[0.08]' : 'border-slate-200'
                }`}>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-500 flex items-center justify-center font-black text-sm">
                        Ω
                      </div>
                      <span className="font-extrabold text-sm tracking-tight text-slate-900 dark:text-white uppercase">
                        Guru Om Precision Engineering
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      Quality Assurance & Pre-Dispatch Certification Department
                    </p>
                    <p className="text-[10px] text-slate-400 dark:text-slate-500">
                      Regd. Facility: Plot 42-B, Industrial Area • ISO 9001:2015 Certified
                    </p>
                  </div>

                  {/* Certified Seal Pill */}
                  <div className="flex sm:flex-col items-start sm:items-end gap-1">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 shadow-xs">
                      <ShieldCheck className="w-3.5 h-3.5 stroke-[2.5]" />
                      <span>QUALITY CLEARED</span>
                    </span>
                    <span className="text-[10px] font-mono text-slate-400">
                      {selectedReport.reportDate || 'Active Release'}
                    </span>
                  </div>
                </div>

                {/* 2. Certificate Meta Header Bar */}
                <div className={`p-4 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                  isDarkMode 
                    ? 'bg-emerald-500/[0.04] border-emerald-500/20' 
                    : 'bg-emerald-50/60 border-emerald-200/70'
                }`}>
                  <div className="space-y-1">
                    <span className="text-[10px] uppercase font-bold tracking-wider text-emerald-700 dark:text-emerald-400 block">
                      Certificate Reference Number
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-extrabold text-sm sm:text-base text-slate-900 dark:text-white select-all">
                        {selectedReport.certificateNo || 'PDI-COC-2026-001'}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleCopyCoC(selectedReport.certificateNo || 'PDI-COC-2026-001')}
                        className={`p-1 rounded-lg border transition-all cursor-pointer ${
                          copiedCoC
                            ? 'bg-emerald-500 text-white border-emerald-500'
                            : isDarkMode
                            ? 'bg-white/10 hover:bg-white/20 border-white/10 text-slate-300'
                            : 'bg-white hover:bg-slate-100 border-slate-200 text-slate-600'
                        }`}
                        title="Copy Certificate Number"
                      >
                        {copiedCoC ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 sm:text-right">
                    <div className="space-y-0.5">
                      <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block">
                        Compliance Status
                      </span>
                      <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                        <span>100% Passed & Authorized</span>
                      </span>
                    </div>
                  </div>
                </div>

                {/* 3. Component & Traceability Bento Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Card A: Component Specification */}
                  <div className={`p-4 rounded-2xl border space-y-1.5 ${
                    isDarkMode ? 'bg-black/30 border-white/[0.06]' : 'bg-slate-50/70 border-slate-200'
                  }`}>
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Component Spec</span>
                      <Package className="w-3.5 h-3.5 text-slate-400" />
                    </div>
                    <div className="font-extrabold text-sm text-slate-900 dark:text-white">
                      {selectedReport.partCode}
                    </div>
                    <div className="text-xs text-slate-600 dark:text-slate-300 font-medium line-clamp-2">
                      {selectedReport.partDescription || 'Precision CNC Machined Component'}
                    </div>
                  </div>

                  {/* Card B: Traceability References */}
                  <div className={`p-4 rounded-2xl border space-y-1.5 ${
                    isDarkMode ? 'bg-black/30 border-white/[0.06]' : 'bg-slate-50/70 border-slate-200'
                  }`}>
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Order Traceability</span>
                      <FileText className="w-3.5 h-3.5 text-slate-400" />
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] text-slate-500 dark:text-slate-400">Job Card:</span>
                      <span className="font-mono font-bold text-xs text-[#5B75F8] dark:text-[#7B92FF]">{selectedReport.jobNo}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] text-slate-500 dark:text-slate-400">Customer PO:</span>
                      <span className="font-mono font-bold text-xs text-slate-800 dark:text-slate-200">{selectedReport.orderPo || 'PO-DIRECT'}</span>
                    </div>
                  </div>

                  {/* Card C: Inspection Batch Metrics */}
                  <div className={`p-4 rounded-2xl border space-y-1.5 ${
                    isDarkMode ? 'bg-black/30 border-white/[0.06]' : 'bg-slate-50/70 border-slate-200'
                  }`}>
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Lot Quantity Metrics</span>
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                    </div>
                    <div className="flex items-baseline justify-between pt-0.5">
                      <div>
                        <span className="text-[10px] text-slate-400 block uppercase">Inspected Lot</span>
                        <span className="text-sm font-bold text-slate-800 dark:text-slate-200 tabular-nums">{selectedReport.qty} NOS</span>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] text-emerald-600 dark:text-emerald-400 block uppercase font-bold">Approved & Cleared</span>
                        <span className="text-base font-extrabold text-emerald-600 dark:text-emerald-400 tabular-nums">
                          {selectedReport.acceptedQty ?? selectedReport.qty} NOS
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Card D: Quality Standard Protocol */}
                  <div className={`p-4 rounded-2xl border space-y-1.5 ${
                    isDarkMode ? 'bg-black/30 border-white/[0.06]' : 'bg-slate-50/70 border-slate-200'
                  }`}>
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Audit Framework</span>
                      <ShieldCheck className="w-3.5 h-3.5 text-[#5B75F8] dark:text-[#7B92FF]" />
                    </div>
                    <div className="font-bold text-xs text-slate-800 dark:text-slate-200">
                      Standard: ISO 9001 Clause 8.6
                    </div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400">
                      Sampling: 100% Comprehensive Audit
                    </div>
                  </div>
                </div>

                {/* 4. Four-Point Inspection Protocols Cleared */}
                <div className="space-y-2">
                  <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block">
                    Quality Inspection Protocols Cleared
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {[
                      { title: '1. Visual Finish & Deburring', detail: 'Zero burrs, scratch-free, surface roughness Ra < 0.8µm' },
                      { title: '2. Dimensions & Tolerances', detail: 'Critical CMM & drawing dimensions verified within limits' },
                      { title: '3. Gauge & Thread Fitment', detail: 'Calibrated Go/No-Go plug and ring gauges 100% cleared' },
                      { title: '4. Anti-Rust & Packaging', detail: 'VCI corrosion barrier applied, sealed with barcode label' }
                    ].map((item, idx) => (
                      <div 
                        key={idx}
                        className={`p-3 rounded-xl border flex items-start gap-2.5 ${
                          isDarkMode 
                            ? 'bg-emerald-500/[0.04] border-emerald-500/20' 
                            : 'bg-emerald-50/50 border-emerald-200/60'
                        }`}
                      >
                        <div className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
                          <Check className="w-3 h-3 stroke-[3]" />
                        </div>
                        <div>
                          <div className="font-bold text-xs text-slate-900 dark:text-slate-100">{item.title}</div>
                          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">{item.detail}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 5. Auditor Sign-off & Electronic Stamp */}
                <div className={`p-4 rounded-2xl border space-y-2.5 ${
                  isDarkMode ? 'bg-black/30 border-white/[0.06]' : 'bg-slate-50/70 border-slate-200'
                }`}>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Auditor Observations</span>
                    <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 font-bold">
                      VERIFIED COMPLIANT
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-300 italic leading-relaxed">
                    "{selectedReport.inspectorNotes || 'All critical dimensions, surface finishes, and gauge tolerances verified 100% compliant with approved customer drawings. Clearance granted for packaging and dispatch.'}"
                  </p>
                  <div className="pt-2 border-t border-slate-200/60 dark:border-white/5 flex flex-col sm:flex-row sm:items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 gap-1">
                    <span>Authorized by: <strong>Quality Assurance Lead (Level II)</strong></span>
                    <span>Digital Verification ID: <strong className="font-mono text-slate-700 dark:text-slate-300">QA-SIG-{selectedReport.id.slice(-6).toUpperCase()}</strong></span>
                  </div>
                </div>
              </div>
            </div>

            {/* Apple Sheet Action Footer */}
            <div className={`px-6 py-4 border-t flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0 ${
              isDarkMode ? 'border-white/[0.07] bg-[#16171c]/80' : 'border-slate-200/80 bg-slate-50/90'
            }`}>
              {/* Destructive Revoke Button */}
              <button
                type="button"
                onClick={() => {
                  setRevokeTargetItem(selectedReport);
                  setShowRevokeConfirm(true);
                  setSelectedReport(null);
                  certModal.close();
                }}
                className="w-full sm:w-auto px-4 py-2 rounded-xl text-rose-500 hover:bg-rose-500/10 border border-rose-500/25 text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Remove CoC (Revoke)</span>
              </button>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                <button
                  type="button"
                  onClick={handlePrintCoC}
                  className={`flex-1 sm:flex-initial px-4 py-2 rounded-xl border text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-xs active:scale-[0.96] ${
                    isDarkMode 
                      ? 'bg-white/[0.06] border-white/10 text-slate-200 hover:bg-white/[0.12] hover:text-white' 
                      : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100 hover:text-slate-900'
                  }`}
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print CoC</span>
                </button>

                <button 
                  type="button"
                  onClick={() => {
                    setSelectedReport(null);
                    certModal.close();
                  }} 
                  className="flex-1 sm:flex-initial px-6 py-2 rounded-xl bg-[#5B75F8] hover:bg-[#4E67F0] text-white text-xs font-bold cursor-pointer transition-all active:scale-[0.96] shadow-xs"
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default PDIView;
