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
  ChevronRight
} from 'lucide-react';
import { PDIInspection } from '../../../types/console';
import { triggerPDIFailure } from '../../../services/notificationService';
import { useUrlModal } from '../../../hooks/useUrlModal';

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
  const certModal = useUrlModal('view-pdi-certificate');
  const [selectedReport, setSelectedReport] = useState<PDIInspection | null>(null);
  const [inspectingItem, setInspectingItem] = useState<PDIInspection | null>(null);
  const [searchQuery, setSearchQuery] = useState(preselectedOrderPo || preselectedJobNo || '');
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'PASS' | 'PENDING' | 'FAIL'>('ALL');
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');

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
      handleOpenInspect(matched);
      inspectModal.open({ pdiNo: matched.id, jobNo: matched.jobNo, orderPo: matched.orderPo });
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

  // Inspection form states
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

  const handleToggleChecklist = (key: keyof typeof checklist) => {
    setChecklist(prev => ({ ...prev, [key]: !prev[key] }));
  };

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

      // Optimistic local state update
      setLocalPdiList(prev => prev.map(p => (p.id === inspectingItem.id || (p.jobNo === inspectingItem.jobNo && p.orderPo === inspectingItem.orderPo) ? updatedItem : p)));

      if (decision === 'PASS') {
        if (onPassPDI) {
          await onPassPDI(inspectingItem.id, updatedItem);
        }
      } else {
        if (onFailPDI) {
          await onFailPDI(inspectingItem.id, updatedItem);
        }
        // Fire live in-app push notification for PDI rejection
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

  const passPct = totalCount > 0 ? Math.round((passedCount / totalCount) * 100) : 0;
  const pendingPct = totalCount > 0 ? Math.round((pendingCount / totalCount) * 100) : 0;
  const failPct = totalCount > 0 ? Math.round((failedCount / totalCount) * 100) : 0;

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
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-500/10 text-[#007AFF] dark:text-[#0A84FF] shrink-0">
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
              className={`flex items-center gap-1.5 px-4 py-2 rounded-full border text-xs font-semibold transition-all cursor-pointer ${
                isDarkMode 
                  ? 'border-white/10 bg-black/60 text-slate-200 hover:bg-white/10' 
                  : 'border-slate-200 bg-slate-100 text-slate-700 hover:bg-slate-200 shadow-xs'
              }`}
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export CSV</span>
            </button>

            {/* Quick First Pending CTA */}
            {pendingCount > 0 && (
              <button
                type="button"
                onClick={() => {
                  const firstPending = activePdiItems.find(q => q.pdiStatus === 'PENDING') || activePdiItems[0];
                  if (firstPending) {
                    handleOpenInspect(firstPending);
                    inspectModal.open({ pdiNo: firstPending.id, jobNo: firstPending.jobNo, orderPo: firstPending.orderPo });
                  }
                }}
                className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#007AFF] hover:bg-[#0071E3] text-white text-xs font-semibold shadow-xs cursor-pointer transition-all active:scale-[0.98]"
              >
                <ClipboardCheck className="w-3.5 h-3.5" />
                <span>Audit Next Pending ({pendingCount})</span>
              </button>
            )}
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
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-500/10 text-[#007AFF] dark:text-[#0A84FF]">
                <ClipboardCheck className="w-4 h-4 stroke-[2]" />
              </div>
            </div>
            <div className="mt-2 flex items-baseline justify-between">
              <span className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">{totalCount}</span>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-500/10 text-[#007AFF] dark:text-[#0A84FF]">Lots</span>
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
                {totalPassedQty.toLocaleString()}
              </span>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">NOS</span>
            </div>
          </div>

          {/* Pending Inspection */}
          <div className={`p-4 rounded-2xl border transition-all ${
            isDarkMode 
              ? 'bg-[#09090B] border-white/10 hover:border-white/20' 
              : 'bg-white/80 border-slate-200/80 hover:border-slate-300 shadow-xs'
          }`}>
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Pending Inspection</span>
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
                <Clock className="w-4 h-4 stroke-[2]" />
              </div>
            </div>
            <div className="mt-2 flex items-baseline justify-between">
              <span className="text-2xl font-bold tracking-tight text-amber-600 dark:text-amber-400">{pendingCount}</span>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400">Waiting</span>
            </div>
          </div>

          {/* Compliance Rate */}
          <div className={`p-4 rounded-2xl border transition-all ${
            isDarkMode 
              ? 'bg-[#09090B] border-white/10 hover:border-white/20' 
              : 'bg-white/80 border-slate-200/80 hover:border-slate-300 shadow-xs'
          }`}>
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Compliance Rate</span>
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400">
                <Award className="w-4 h-4 stroke-[2]" />
              </div>
            </div>
            <div className="mt-2 flex items-baseline justify-between">
              <span className="text-2xl font-bold tracking-tight text-purple-600 dark:text-purple-400">
                {complianceRate}%
              </span>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-600 dark:text-purple-400">Certified</span>
            </div>
          </div>
        </div>

        {/* ── Apple PDI Compliance Distribution Bar ── */}
        <div className={`p-4 rounded-2xl border transition-all mt-4 ${
          isDarkMode ? 'bg-[#09090B] border-white/10' : 'bg-slate-50 border-slate-200/70'
        }`}>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2.5">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-[#007AFF] dark:text-[#0A84FF]" />
              <span className="text-xs font-bold tracking-tight text-slate-900 dark:text-white">
                Pre-Dispatch Quality Clearance & Certificate Release
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                {complianceRate}% Clearance
              </span>
            </div>
            <span className="text-xs text-slate-400 dark:text-slate-500">
              {passedCount + failedCount} of {totalCount} lots audited
            </span>
          </div>

          {/* Multi-Segmented Pro Bar */}
          <div className="h-2.5 w-full rounded-full bg-slate-200/60 dark:bg-black/60 overflow-hidden flex p-0.5 gap-0.5 border border-slate-200/40 dark:border-white/5">
            {passedCount > 0 && (
              <div 
                style={{ width: `${(passedCount / (totalCount || 1)) * 100}%` }} 
                className="h-full bg-emerald-500 rounded-full transition-all duration-500" 
                title={`Passed CoC: ${passedCount} (${passPct}%)`}
              />
            )}
            {pendingCount > 0 && (
              <div 
                style={{ width: `${(pendingCount / (totalCount || 1)) * 100}%` }} 
                className="h-full bg-amber-400 rounded-full transition-all duration-500" 
                title={`Pending PDI: ${pendingCount} (${pendingPct}%)`}
              />
            )}
            {failedCount > 0 && (
              <div 
                style={{ width: `${(failedCount / (totalCount || 1)) * 100}%` }} 
                className="h-full bg-rose-500 rounded-full transition-all duration-500" 
                title={`Failed / Rework: ${failedCount} (${failPct}%)`}
              />
            )}
          </div>

          {/* Legend Pills */}
          <div className="flex items-center flex-wrap gap-3 sm:gap-5 mt-3 text-xs">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span className="text-slate-500 dark:text-slate-400 font-medium">Passed CoC:</span>
              <span className="font-bold text-slate-900 dark:text-white tabular-nums">{passedCount} ({passPct}%)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-amber-400" />
              <span className="text-slate-500 dark:text-slate-400 font-medium">Pending PDI:</span>
              <span className="font-bold text-slate-900 dark:text-white tabular-nums">{pendingCount} ({pendingPct}%)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-rose-500" />
              <span className="text-slate-500 dark:text-slate-400 font-medium">Failed / Rework:</span>
              <span className="font-bold text-slate-900 dark:text-white tabular-nums">{failedCount} ({failPct}%)</span>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* ── FILTER & SEARCH TOOLBAR (Apple Segmented Control & Finder Search) ──   */}
      {/* ========================================================================= */}
      <div className={`p-3 sm:p-4 rounded-2xl border transition-all space-y-3 ${
        isDarkMode ? 'bg-[#09090B] border-white/10' : 'bg-white/90 border-slate-200/80 shadow-xs'
      }`}>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Apple Segmented Control */}
          <div className={`flex items-center gap-1 p-1 rounded-xl border overflow-x-auto no-scrollbar shrink-0 ${
            isDarkMode ? 'bg-black/60 border-white/10' : 'bg-slate-100/80 border-slate-200/80'
          }`}>
            {[
              { id: 'ALL', label: 'All Lots', count: totalCount },
              { id: 'PENDING', label: 'Pending PDI', count: pendingCount },
              { id: 'PASS', label: 'Passed / CoC', count: passedCount },
              { id: 'FAIL', label: 'Failed / Rework', count: failedCount, isAlert: failedCount > 0 },
            ].map(tab => {
              const isActive = filterStatus === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setFilterStatus(tab.id as any)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all cursor-pointer ${
                    isActive
                      ? isDarkMode ? 'bg-white/10 text-white shadow-xs' : 'bg-white text-slate-900 shadow-xs'
                      : tab.isAlert
                      ? 'text-rose-500 hover:text-rose-600'
                      : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                  }`}
                >
                  <span>{tab.label}</span>
                  <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-semibold ${
                    isActive 
                      ? isDarkMode ? 'bg-white/15 text-white' : 'bg-slate-100 text-slate-700' 
                      : tab.isAlert
                      ? 'bg-rose-500/10 text-rose-500'
                      : isDarkMode ? 'bg-white/5 text-slate-400' : 'bg-slate-200 text-slate-600'
                  }`}>
                    {tab.count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Search Field & View Mode Switcher */}
          <div className="flex items-center gap-2.5">
            {/* macOS Finder Capsule */}
            <div className={`relative flex items-center rounded-full border px-3.5 py-1.5 transition-all w-full sm:w-80 ${
              isDarkMode ? 'bg-black/60 border-white/10 text-white focus-within:border-[#007AFF]' : 'bg-slate-50 border-slate-200 text-slate-900 focus-within:border-[#007AFF]'
            }`}>
              <Search className="w-3.5 h-3.5 text-slate-400 shrink-0 mr-2" />
              <input
                type="text"
                placeholder="Search Job #, Order PO, Part..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-transparent outline-none text-xs w-full placeholder:text-slate-400"
              />
              {searchQuery && (
                <button type="button" onClick={() => setSearchQuery('')} className="text-slate-400 hover:text-slate-600 dark:hover:text-white ml-2">
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Apple View Mode Switcher (Table vs Grid) */}
            <div className={`hidden sm:flex items-center p-0.5 rounded-xl border shrink-0 ${
              isDarkMode ? 'bg-black/60 border-white/10' : 'bg-slate-100/80 border-slate-200/80'
            }`}>
              <button
                type="button"
                onClick={() => setViewMode('table')}
                className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                  viewMode === 'table'
                    ? isDarkMode ? 'bg-white/10 text-white shadow-xs' : 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                }`}
                title="Table Register View"
              >
                <List className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setViewMode('grid')}
                className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                  viewMode === 'grid'
                    ? isDarkMode ? 'bg-white/10 text-white shadow-xs' : 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                }`}
                title="Inspector Card Grid"
              >
                <LayoutGrid className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* ── MOBILE PDI CARDS (Viewport < md) ──                                    */}
      {/* ========================================================================= */}
      <div className="block md:hidden space-y-3">
        {filteredPdi.length === 0 ? (
          <div className={`p-8 text-center rounded-2xl border text-xs ${
            isDarkMode ? 'bg-[#09090B] border-white/10 text-slate-400' : 'bg-white border-slate-200 text-slate-500'
          }`}>
            No PDI items found matching your filters.
          </div>
        ) : (
          filteredPdi.map((pdi) => {
            const isPassed = pdi.pdiStatus === 'PASS';
            const isFailed = pdi.pdiStatus === 'FAIL';

            return (
              <div
                key={pdi.id}
                className={`p-4 rounded-2xl border transition-all space-y-3 shadow-xs ${
                  isPassed
                    ? isDarkMode ? 'bg-[#09090B] border-emerald-500/30' : 'bg-emerald-50/40 border-emerald-200'
                    : isFailed
                    ? isDarkMode ? 'bg-[#09090B] border-rose-500/30' : 'bg-rose-50/40 border-rose-200'
                    : isDarkMode ? 'bg-[#09090B] border-white/10' : 'bg-white border-slate-200'
                }`}
              >
                {/* Header: Job No + Status Pill */}
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-xs text-[#007AFF] dark:text-[#0A84FF]">
                        {pdi.jobNo}
                      </span>
                      {pdi.orderPo && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-blue-500/10 text-[#007AFF] dark:text-[#0A84FF] border border-blue-500/20">
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
                      handleOpenInspect(pdi);
                      inspectModal.open({ pdiNo: pdi.id, jobNo: pdi.jobNo, orderPo: pdi.orderPo });
                    }}
                    className={`flex-1 py-2 rounded-full text-xs font-semibold flex items-center justify-center gap-1.5 shadow-xs cursor-pointer transition-all active:scale-[0.98] ${
                      isPassed
                        ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                        : 'bg-[#007AFF] hover:bg-[#0071E3] text-white'
                    }`}
                  >
                    <ClipboardCheck className="w-3.5 h-3.5" />
                    <span>{isPassed ? 'Re-Inspect PDI' : 'Inspect PDI'}</span>
                  </button>

                  {(pdi.certificateNo || isPassed) && (
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedReport(pdi);
                        certModal.open({ pdiNo: pdi.id, jobNo: pdi.jobNo, orderPo: pdi.orderPo });
                      }}
                      className={`p-2 rounded-full border flex items-center justify-center cursor-pointer transition-all ${
                        isDarkMode 
                          ? 'border-white/10 bg-black/60 text-slate-200 hover:bg-white/10' 
                          : 'border-slate-200 bg-slate-100 text-slate-700 hover:bg-slate-200'
                      }`}
                      title="View CoC Certificate"
                    >
                      <Award className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
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
        <div className={`hidden md:block rounded-2xl border overflow-hidden transition-all shadow-xs ${
          isDarkMode ? 'bg-[#09090B] border-white/10' : 'bg-white border-slate-200/80'
        }`}>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className={`border-b text-xs font-semibold ${
                  isDarkMode ? 'bg-black/60 border-white/10 text-slate-400' : 'bg-slate-50/80 border-slate-200/80 text-slate-500'
                }`}>
                  <th className="py-3.5 px-5">Job Card #</th>
                  <th className="py-3.5 px-5">Customer PO</th>
                  <th className="py-3.5 px-5">Part Description</th>
                  <th className="py-3.5 px-5 text-right">Inspect Qty</th>
                  <th className="py-3.5 px-5 text-center">PDI Status</th>
                  <th className="py-3.5 px-5 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className={`divide-y ${isDarkMode ? 'divide-white/5' : 'divide-slate-100'}`}>
                {filteredPdi.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-400 text-xs">
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
                          handleOpenInspect(pdi);
                          inspectModal.open({ pdiNo: pdi.id, jobNo: pdi.jobNo, orderPo: pdi.orderPo });
                        }}
                        className={`group transition-colors cursor-pointer ${isDarkMode ? 'hover:bg-white/[0.04]' : 'hover:bg-slate-50/70'}`}
                      >
                        <td className="py-3.5 px-5">
                          <div className="flex items-center gap-2.5">
                            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-500/10 text-[#007AFF] dark:text-[#0A84FF] shrink-0">
                              <Package className="w-3.5 h-3.5 stroke-[2]" />
                            </div>
                            <span className="font-bold text-[#007AFF] dark:text-[#0A84FF]">
                              {pdi.jobNo}
                            </span>
                            <ChevronRight className="w-3 h-3 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                          </div>
                        </td>
                        <td className={`py-3.5 px-5 ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                          {pdi.orderPo ? (
                            <span className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-blue-500/10 text-[#007AFF] dark:text-[#0A84FF] border border-blue-500/20">
                              {pdi.orderPo}
                            </span>
                          ) : '—'}
                        </td>
                        <td className={`py-3.5 px-5 font-medium ${isDarkMode ? 'text-slate-100' : 'text-slate-800'}`}>
                          <span className="font-semibold text-slate-900 dark:text-white">{pdi.partCode}</span>
                          {pdi.partDescription && (
                            <span className="text-slate-400 dark:text-slate-500"> — {pdi.partDescription}</span>
                          )}
                        </td>
                        <td className="py-3.5 px-5 text-right font-bold tabular-nums">
                          <span className={isPassed ? 'text-emerald-600 dark:text-emerald-400' : isDarkMode ? 'text-white' : 'text-slate-900'}>
                            {pdi.acceptedQty ?? pdi.qty} NOS
                          </span>
                          {pdi.rejectedQty ? (
                            <div className="text-[10px] text-rose-500 font-normal">
                              ({pdi.rejectedQty} rejected)
                            </div>
                          ) : null}
                        </td>
                        <td className="py-3.5 px-5 text-center">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
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
                        <td className="py-3.5 px-5 text-center" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-center gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                handleOpenInspect(pdi);
                                inspectModal.open({ pdiNo: pdi.id, jobNo: pdi.jobNo, orderPo: pdi.orderPo });
                              }}
                              className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer inline-flex items-center gap-1.5 active:scale-[0.98] ${
                                isPassed
                                  ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-xs'
                                  : 'bg-[#007AFF] hover:bg-[#0071E3] text-white shadow-xs'
                              }`}
                              title={`Inspect PDI for ${pdi.jobNo}`}
                            >
                              <ClipboardCheck className="w-3.5 h-3.5" />
                              <span>{isPassed ? 'Re-Inspect' : 'Inspect PDI'}</span>
                            </button>

                            {(pdi.certificateNo || isPassed) && (
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedReport(pdi);
                                  certModal.open({ pdiNo: pdi.id, jobNo: pdi.jobNo, orderPo: pdi.orderPo });
                                }}
                                className={`px-2.5 py-1.5 rounded-full border text-xs font-semibold transition-all cursor-pointer inline-flex items-center gap-1 ${
                                  isDarkMode 
                                    ? 'border-white/10 bg-black/60 text-slate-300 hover:bg-white/10' 
                                    : 'border-slate-200 bg-slate-100 text-slate-700 hover:bg-slate-200'
                                }`}
                                title="View Compliance Certificate"
                              >
                                <FileCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                                <span>CoC</span>
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
                    handleOpenInspect(pdi);
                    inspectModal.open({ pdiNo: pdi.id, jobNo: pdi.jobNo, orderPo: pdi.orderPo });
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
                      <span className="font-bold text-xs text-[#007AFF] dark:text-[#0A84FF]">
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
                          handleOpenInspect(pdi);
                          inspectModal.open({ pdiNo: pdi.id, jobNo: pdi.jobNo, orderPo: pdi.orderPo });
                        }}
                        className="px-3.5 py-1.5 rounded-full bg-[#007AFF] hover:bg-[#0071E3] text-white text-xs font-semibold shadow-xs flex items-center gap-1 transition-all active:scale-[0.98]"
                      >
                        <ClipboardCheck className="w-3.5 h-3.5" />
                        <span>Inspect</span>
                      </button>
                      {(pdi.certificateNo || isPassed) && (
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedReport(pdi);
                            certModal.open({ pdiNo: pdi.id, jobNo: pdi.jobNo, orderPo: pdi.orderPo });
                          }}
                          className={`p-1.5 rounded-full border text-xs font-semibold transition-all cursor-pointer inline-flex items-center gap-1 ${
                            isDarkMode 
                              ? 'border-white/10 bg-black/60 text-slate-300 hover:bg-white/10' 
                              : 'border-slate-200 bg-slate-100 text-slate-700 hover:bg-slate-200'
                          }`}
                          title="View CoC Certificate"
                        >
                          <Award className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
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
      {/* 1. INTERACTIVE PDI INSPECTION MODAL (Apple Sheet Presentation)            */}
      {/* ========================================================================= */}
      {inspectModal.isOpen && inspectingItem && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-950/60 backdrop-blur-md font-sans overflow-y-auto">
          <div className={`relative w-full max-w-xl max-h-[92vh] sm:max-h-[90vh] flex flex-col rounded-t-2xl sm:rounded-2xl border shadow-2xl backdrop-blur-2xl transition-all overflow-hidden ${
            isDarkMode 
              ? 'bg-[#09090B] border-white/10 text-white shadow-[0_24px_60px_rgba(0,0,0,0.8)]' 
              : 'bg-white/95 border-slate-200/80 text-slate-900 shadow-[0_20px_60px_rgba(0,0,0,0.15)]'
          }`}>
            {/* Mobile Grab Handle */}
            <div className="pt-2.5 pb-0 block sm:hidden">
              <div className="w-10 h-1 bg-slate-300 dark:bg-slate-700 rounded-full mx-auto" />
            </div>

            {/* Modal Window Header */}
            <div className={`flex items-center justify-between px-5 sm:px-6 py-4 border-b shrink-0 ${
              isDarkMode ? 'border-white/10 bg-black/60' : 'border-slate-200/80 bg-slate-50/50'
            }`}>
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/10 text-[#007AFF] dark:text-[#0A84FF] shrink-0">
                  <ClipboardCheck className="w-5 h-5 stroke-[2]" />
                </div>
                <div>
                  <h3 className="font-bold text-base tracking-tight text-slate-900 dark:text-white">
                    Pre-Dispatch Inspection (PDI)
                  </h3>
                  <div className="flex items-center gap-2 text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                    <span>Job: <strong className="text-slate-700 dark:text-slate-200">{inspectingItem.jobNo}</strong></span>
                    <span>•</span>
                    <span>PO: <strong className="text-slate-700 dark:text-slate-200">{inspectingItem.orderPo}</strong></span>
                  </div>
                </div>
              </div>
              <button 
                type="button"
                onClick={() => {
                  setInspectingItem(null);
                  inspectModal.close();
                }} 
                className="rounded-full p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-600 dark:hover:text-slate-200 transition-all cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Form Body */}
            <div className="p-5 sm:p-6 space-y-4 overflow-y-auto flex-1">
              
              {/* Part Summary Inspector Box */}
              <div className={`p-4 rounded-2xl border ${
                isDarkMode ? 'bg-black/60 border-white/10' : 'bg-slate-50/80 border-slate-200/80'
              }`}>
                <div className="flex justify-between items-center">
                  <div>
                    <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Component</span>
                    <div className="font-bold text-sm text-[#007AFF] dark:text-[#0A84FF]">{inspectingItem.partCode}</div>
                    <div className="text-xs text-slate-600 dark:text-slate-300 font-medium mt-0.5">{inspectingItem.partDescription}</div>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Batch Target</span>
                    <div className="text-base font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">{inspectingItem.qty} NOS</div>
                  </div>
                </div>
              </div>

              {/* 4-Point Checklist - Apple Interactive Check Cards */}
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400">
                  4-Point Quality & Compliance Checklist
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {[
                    { key: 'visualFinish', label: '1. Visual Finish & Deburring', desc: 'No burrs, sharp edges, or surface blemishes' },
                    { key: 'dimensionalAudit', label: '2. Dimensions & Tolerances', desc: '100% drawing tolerances verified' },
                    { key: 'gaugesChecked', label: '3. Gauge & Thread Fitment', desc: 'Go/No-Go plug and ring gauges cleared' },
                    { key: 'packagingRustProof', label: '4. Anti-Rust & Packaging', desc: 'VCI oil applied, barcode label attached' }
                  ].map(({ key, label, desc }) => {
                    const isChecked = !!checklist[key as keyof typeof checklist];
                    return (
                      <div
                        key={key}
                        onClick={() => handleToggleChecklist(key as keyof typeof checklist)}
                        className={`p-3 rounded-2xl border cursor-pointer transition-all flex items-start gap-2.5 select-none ${
                          isChecked
                            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-900 dark:text-emerald-300 ring-1 ring-emerald-500/20 shadow-xs'
                            : isDarkMode
                            ? 'bg-black/40 border-white/10 text-slate-400 hover:border-white/20'
                            : 'bg-slate-50 border-slate-200 text-slate-600 hover:border-slate-300'
                        }`}
                      >
                        <div className={`mt-0.5 p-0.5 rounded-md ${
                          isChecked ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400'
                        }`}>
                          {isChecked ? <CheckSquare className="w-4 h-4 stroke-[2.5]" /> : <Square className="w-4 h-4 stroke-[1.5]" />}
                        </div>
                        <div>
                          <div className="font-semibold text-xs">{label}</div>
                          <div className="text-[11px] opacity-75 mt-0.5">{desc}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Quantity Inputs */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400">
                      Accepted Qty *
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        setAcceptedQty(inspectingItem.qty || 1);
                        setRejectedQty(0);
                      }}
                      className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold hover:underline cursor-pointer"
                    >
                      All ({inspectingItem.qty})
                    </button>
                  </div>
                  <input
                    type="number"
                    min={0}
                    value={acceptedQty}
                    onChange={(e) => setAcceptedQty(Number(e.target.value))}
                    className={`w-full px-3.5 py-2 rounded-xl border text-xs font-bold tabular-nums outline-none transition-all ${
                      isDarkMode ? 'bg-black/60 border-white/10 text-emerald-400 focus:border-emerald-500' : 'bg-slate-50 border-slate-200 text-emerald-600 focus:border-emerald-500'
                    }`}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">
                    Rejected / Scrap
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={rejectedQty}
                    onChange={(e) => setRejectedQty(Number(e.target.value))}
                    className={`w-full px-3.5 py-2 rounded-xl border text-xs font-bold tabular-nums outline-none transition-all ${
                      isDarkMode ? 'bg-black/60 border-white/10 text-rose-400 focus:border-rose-500' : 'bg-slate-50 border-slate-200 text-rose-600 focus:border-rose-500'
                    }`}
                  />
                </div>
              </div>

              {/* Certificate No & Report URL */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">
                    CoC Certificate #
                  </label>
                  <input
                    type="text"
                    value={certificateNo}
                    onChange={(e) => setCertificateNo(e.target.value)}
                    placeholder="e.g. PDI-COC-2026-001"
                    className={`w-full px-3.5 py-2 rounded-xl border text-xs outline-none transition-all ${
                      isDarkMode ? 'bg-black/60 border-white/10 text-white focus:border-[#007AFF]' : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-[#007AFF]'
                    }`}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">
                    Document URL (Optional)
                  </label>
                  <input
                    type="text"
                    value={reportUrl}
                    onChange={(e) => setReportUrl(e.target.value)}
                    placeholder="e.g. COC-Report.pdf"
                    className={`w-full px-3.5 py-2 rounded-xl border text-xs outline-none transition-all ${
                      isDarkMode ? 'bg-black/60 border-white/10 text-white focus:border-[#007AFF]' : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-[#007AFF]'
                    }`}
                  />
                </div>
              </div>

              {/* Remarks */}
              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">
                  Inspector Observations & Remarks
                </label>
                <textarea
                  rows={2}
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  placeholder="e.g. Surface finish Ra 0.8 achieved. Thread gauges matched cleanly. Ready for dispatch."
                  className={`w-full px-3.5 py-2.5 rounded-xl border text-xs outline-none transition-all ${
                    isDarkMode ? 'bg-black/60 border-white/10 text-white focus:border-[#007AFF]' : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-[#007AFF]'
                  }`}
                />
              </div>

            </div>

            {/* Modal Actions Footer */}
            <div className={`px-5 sm:px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-3 border-t shrink-0 ${
              isDarkMode ? 'border-white/10 bg-black/60' : 'border-slate-100 bg-slate-50/50'
            }`}>
              <button
                type="button"
                onClick={() => handleInspectSubmit('FAIL')}
                disabled={isSubmitting}
                className="w-full sm:w-auto px-4 py-2 rounded-full border border-rose-500/30 bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer transition-all disabled:opacity-50"
              >
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>PDI Fail (Flag Rework)</span>
              </button>

              <div className="flex items-center gap-2.5 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() => {
                    setInspectingItem(null);
                    inspectModal.close();
                  }}
                  className={`flex-1 sm:flex-initial px-5 py-2 rounded-full border text-xs font-semibold cursor-pointer transition-all ${
                    isDarkMode ? 'border-white/10 bg-black/60 text-slate-300 hover:bg-white/10' : 'border-slate-200/80 bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => handleInspectSubmit('PASS')}
                  disabled={isSubmitting || acceptedQty <= 0}
                  className="flex-1 sm:flex-initial px-6 py-2 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow-xs transition-all active:scale-[0.98] disabled:opacity-50"
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
      {/* 2. PDI CERTIFICATE MODAL (Apple Sheet Presentation)                       */}
      {/* ========================================================================= */}
      {certModal.isOpen && selectedReport && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-950/60 backdrop-blur-md font-sans overflow-y-auto">
          <div className={`relative w-full max-w-lg max-h-[92vh] sm:max-h-[90vh] flex flex-col rounded-t-2xl sm:rounded-2xl border p-5 sm:p-6 space-y-4 shadow-2xl backdrop-blur-2xl transition-all overflow-hidden ${
            isDarkMode ? 'bg-[#09090B] border-white/10 text-white shadow-[0_24px_60px_rgba(0,0,0,0.8)]' : 'bg-white/95 border-slate-200/80 text-slate-900 shadow-[0_20px_60px_rgba(0,0,0,0.15)]'
          }`}>
            {/* Mobile Grab Handle */}
            <div className="pt-1 pb-0 block sm:hidden">
              <div className="w-10 h-1 bg-slate-300 dark:bg-slate-700 rounded-full mx-auto" />
            </div>

            <div className={`flex items-center justify-between border-b pb-3.5 ${isDarkMode ? 'border-white/10' : 'border-slate-100'}`}>
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                  <Award className="w-5 h-5 stroke-[2]" />
                </div>
                <div>
                  <h3 className="font-bold text-sm tracking-tight">Certificate of Compliance (CoC)</h3>
                  <p className="text-xs text-slate-400">Pre-Dispatch Inspection Report</p>
                </div>
              </div>
              <button 
                onClick={() => {
                  setSelectedReport(null);
                  certModal.close();
                }} 
                className="rounded-full p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-600 dark:hover:text-slate-200 transition-all cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 overflow-y-auto flex-1 text-xs">
              <div className={`p-4 rounded-2xl border space-y-2.5 ${
                isDarkMode ? 'bg-black/60 border-white/10' : 'bg-slate-50 border-slate-200/80'
              }`}>
                <div className="flex justify-between items-center font-semibold">
                  <span className="text-[#007AFF] dark:text-[#0A84FF]">{selectedReport.certificateNo || 'PDI-COC-2026-001'}</span>
                  <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                    Status: Passed
                  </span>
                </div>
                <div className="font-semibold text-slate-900 dark:text-white">{selectedReport.partCode} — {selectedReport.partDescription}</div>
                <div className="flex justify-between text-slate-400">
                  <span>Job #: <strong className="text-slate-700 dark:text-slate-200">{selectedReport.jobNo}</strong></span>
                  <span>PO #: <strong className="text-slate-700 dark:text-slate-200">{selectedReport.orderPo}</strong></span>
                </div>
                <div className={`flex justify-between text-slate-400 border-t pt-2 ${isDarkMode ? 'border-white/10' : 'border-slate-200/60'}`}>
                  <span>Quantity Passed:</span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">{selectedReport.acceptedQty || selectedReport.qty} NOS</span>
                </div>
                {selectedReport.inspectorNotes ? (
                  <div className="text-slate-400 pt-1">
                    <span className="font-semibold text-slate-600 dark:text-slate-300">Observations:</span> {selectedReport.inspectorNotes}
                  </div>
                ) : null}
              </div>

              <div className="p-3 rounded-xl border border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-center font-medium text-xs">
                ✓ 100% Dimensional Audit & Visual Surface Quality Verified
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button 
                onClick={() => {
                  setSelectedReport(null);
                  certModal.close();
                }} 
                className={`w-full sm:w-auto px-5 py-2 rounded-full border text-xs font-semibold cursor-pointer transition-all ${
                  isDarkMode ? 'border-white/10 bg-black/60 text-slate-300 hover:bg-white/10' : 'border-slate-200 bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                Close Certificate
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default PDIView;
