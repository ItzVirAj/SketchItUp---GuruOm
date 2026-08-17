import React, { useEffect, useRef, useState } from 'react';
import { 
  Factory, 
  List, 
  Kanban, 
  Cpu, 
  Calendar, 
  Search, 
  Plus, 
  Download, 
  Clock, 
  CheckCircle2, 
  AlertTriangle,
  Play,
  X,
  SlidersHorizontal,
  Wrench,
  Activity
} from 'lucide-react';
import { JobCard, ProductionLogReport, QCInspection, CustomerOrder } from '../../../types/console';

interface ProductionViewProps {
  jobCards: JobCard[];
  orders?: CustomerOrder[];
  productionLogs?: ProductionLogReport[];
  qcItems?: QCInspection[];
  isDarkMode: boolean;
  onCreateJobCard: (newCard: Partial<JobCard>) => void;
  onLogProduction?: (log: Partial<ProductionLogReport>) => void;
  preselectedOrderPo?: string;
  onJobCardModalOpened?: () => void;
}

export const ProductionView: React.FC<ProductionViewProps> = ({
  jobCards,
  orders = [],
  productionLogs = [],
  qcItems = [],
  isDarkMode,
  onCreateJobCard,
  onLogProduction,
  preselectedOrderPo,
  onJobCardModalOpened
}) => {
  const [viewMode, setViewMode] = useState<'list' | 'board' | 'machine' | 'timeline'>('list');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [showNewJobModal, setShowNewJobModal] = useState(false);
  const [selectedJobForLog, setSelectedJobForLog] = useState<JobCard | null>(null);

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

  // New Job Form State
  const [newOrderPo, setNewOrderPo] = useState('');
  const [newPartCode, setNewPartCode] = useState('00000001');
  const [newPartDesc, setNewPartDesc] = useState('MAIN SPINDLE HOUSING 120MM');
  const [newDrawingRev, setNewDrawingRev] = useState('REV-A');
  const [newHeatLot, setNewHeatLot] = useState('');
  const [newQty, setNewQty] = useState(100);
  const [newMachine, setNewMachine] = useState('VMC-01 (Vertical Milling)');
  const [newTargetDate, setNewTargetDate] = useState('2026-08-20');

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
      setNewPartDesc('');
      setNewHeatLot('');
    }
    setShowNewJobModal(true);
  };

  // Redirect from Order Detail "Create Job Card" CTA: open the manual form with the order preselected
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
  const [logOperation, setLogOperation] = useState<string>('CNC CNC Milling');
  const [logDoneQty, setLogDoneQty] = useState<number>(25);

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

  const handleCreateJobSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newJobNo = `JC/${String(jobCards.length + 1).padStart(4, '0')}/26-27`;
    onCreateJobCard({
      jobNo: newJobNo,
      orderPo: newOrderPo,
      partCode: newPartCode,
      partDescription: newPartDesc,
      drawingRevision: newDrawingRev,
      materialIssuedLot: newHeatLot,
      orderStatus: 'IN_PRODUCTION',
      qty: Number(newQty),
      targetQty: Number(newQty),
      machine: newMachine,
      targetDate: newTargetDate,
      status: 'SCHEDULED'
    });
    setShowNewJobModal(false);
  };

  // Per-item job cards: fill the form from one of the selected order's line items
  const selectedOrderForForm = eligibleOrders.find(o => o.poNo === newOrderPo || o.id === newOrderPo);
  const handleSelectLineItem = (lineId: string) => {
    const line = selectedOrderForForm?.lines?.find(l => l.id === lineId);
    if (!line) return;
    setNewPartCode(line.itemCode || '00000001');
    setNewPartDesc(line.itemDescription || 'MANUFACTURED COMPONENT');
    setNewQty(Number(line.pendingQty ?? line.orderQty ?? 100));
    setNewDrawingRev(line.drawingRevision || selectedOrderForForm?.drawingRevision || 'REV-A');
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
  };

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
                Shopfloor Control
              </span>
              <span className="text-xs text-slate-400 font-mono">• Machine Scheduling Telemetry</span>
            </div>
            <h1 className={`text-2xl font-bold tracking-tight ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
              Production Board & Job Cards
            </h1>
            <p className={`text-xs mt-1 max-w-xl ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
              Schedule shopfloor job cards, monitor machine loading, log operator shift output, and feed Quality Control (QC) inspection queues.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={openNewJobModal}
              className="px-4 py-2.5 rounded-2xl bg-gradient-to-r from-[#5B75F8] to-indigo-600 hover:from-indigo-600 hover:to-[#5B75F8] text-white font-bold text-xs flex items-center gap-2 cursor-pointer shadow-lg shadow-[#5B75F8]/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              <Plus className="w-4 h-4" />
              <span>Create Job Card</span>
            </button>
          </div>
        </div>

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
              <span className="text-[11px] font-mono font-semibold text-[#5B75F8]">In Progress</span>
            </div>
          </div>

          <div className={`p-4 rounded-2xl border transition-all ${
            isDarkMode ? 'bg-slate-950/60 border-slate-800/80' : 'bg-slate-50/80 border-slate-200/80'
          }`}>
            <div className="flex items-center justify-between">
              <span className={`text-xs font-medium ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Active CNC Machines</span>
              <div className={`p-2 rounded-xl ${isDarkMode ? 'bg-purple-500/20 text-purple-400' : 'bg-purple-100 text-purple-700'}`}>
                <Cpu className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2 flex items-baseline justify-between">
              <span className={`text-2xl font-bold font-mono ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{runningMachinesCount}</span>
              <span className="text-[11px] font-mono font-semibold text-purple-400">Allocated</span>
            </div>
          </div>

          <div className={`p-4 rounded-2xl border transition-all ${
            isDarkMode ? 'bg-slate-950/60 border-slate-800/80' : 'bg-slate-50/80 border-slate-200/80'
          }`}>
            <div className="flex items-center justify-between">
              <span className={`text-xs font-medium ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Completed Jobs</span>
              <div className={`p-2 rounded-xl ${isDarkMode ? 'bg-emerald-500/20 text-emerald-400' : 'bg-emerald-100 text-emerald-700'}`}>
                <CheckCircle2 className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2 flex items-baseline justify-between">
              <span className={`text-2xl font-bold font-mono ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{completedJobsCount}</span>
              <span className="text-[11px] font-mono font-semibold text-emerald-500">QC Ready</span>
            </div>
          </div>

          <div className={`p-4 rounded-2xl border transition-all ${
            isDarkMode ? 'bg-slate-950/60 border-slate-800/80' : 'bg-slate-50/80 border-slate-200/80'
          }`}>
            <div className="flex items-center justify-between">
              <span className={`text-xs font-medium ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>OEE Shopfloor Efficiency</span>
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

      {/* Filter & View Switcher Bar */}
      <div className={`p-4 rounded-3xl border transition-all flex flex-wrap items-center justify-between gap-4 ${
        isDarkMode ? 'bg-slate-900/70 border-slate-800/80 backdrop-blur-xl' : 'bg-white border-slate-200 shadow-xs'
      }`}>
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

        <div className="flex items-center gap-3">
          <div className={`relative flex items-center rounded-2xl border px-3 py-1.5 transition-all ${
            isDarkMode ? 'bg-slate-950/80 border-slate-800 text-white focus-within:border-[#5B75F8]/50' : 'bg-slate-50 border-slate-200 text-slate-900 focus-within:border-[#5B75F8]'
          }`}>
            <Search className="w-4 h-4 text-slate-400 shrink-0 mr-2" />
            <input
              type="text"
              placeholder="Search Job # or Machine..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-transparent outline-none text-xs w-48 sm:w-56 font-mono"
            />
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
      </div>

      {/* Main Jobs Table */}
      {viewMode === 'list' ? (
        <div className={`rounded-3xl border overflow-hidden transition-all shadow-xl ${
          isDarkMode ? 'bg-slate-900/80 border-slate-800/80 backdrop-blur-xl' : 'bg-white border-slate-200'
        }`}>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className={`border-b font-mono font-bold uppercase tracking-wider text-[11px] ${
                  isDarkMode ? 'bg-slate-950/60 border-slate-800 text-slate-400' : 'bg-slate-50 border-slate-200 text-slate-500'
                }`}>
                  <th className="py-4 px-5">Job Card #</th>
                  <th className="py-4 px-5">Customer Order PO</th>
                  <th className="py-4 px-5">Part Description</th>
                  <th className="py-4 px-5 text-right">Job Qty</th>
                  <th className="py-4 px-5">Machine Allocated</th>
                  <th className="py-4 px-5">Target Date</th>
                  <th className="py-4 px-5 text-center">Status</th>
                  <th className="py-4 px-5 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800/60">
                {filteredCards.map((jc) => (
                  <tr key={jc.jobNo} className={isDarkMode ? 'hover:bg-slate-800/50' : 'hover:bg-slate-50'}>
                    <td className="py-4 px-5 font-bold font-mono text-[#5B75F8] dark:text-[#7B92FF]">
                      <div>{jc.jobNo}</div>
                      {jc.drawingRevision && (
                        <span className="inline-block mt-0.5 px-1.5 py-0.5 rounded text-[9px] font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          Rev: {jc.drawingRevision} (Locked)
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
                    <td className={`py-4 px-5 font-semibold ${isDarkMode ? 'text-slate-100' : 'text-slate-800'}`}>
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
                      {jc.machine || jc.currentOperation || 'Machine Center'}
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
                      <button
                        onClick={() => setSelectedJobForLog(jc)}
                        className={`px-3 py-1.5 rounded-xl font-mono text-xs font-bold transition-all cursor-pointer ${
                          isDarkMode ? 'bg-[#5B75F8]/10 text-[#7B92FF] hover:bg-[#5B75F8]/20 border border-[#5B75F8]/30' : 'bg-[#5B75F8]/10 text-[#5B75F8] hover:bg-[#5B75F8]/20 border border-[#5B75F8]/20'
                        }`}
                      >
                        Log Production
                      </button>
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
              <div key={colStatus} className={`p-5 rounded-3xl border ${
                isDarkMode ? 'bg-slate-900/80 border-slate-800/80' : 'bg-white border-slate-200 shadow-sm'
              }`}>
                <div className="flex items-center justify-between mb-4 border-b border-slate-800 pb-3 font-mono">
                  <h3 className="font-bold text-xs uppercase text-[#5B75F8] dark:text-[#7B92FF]">{colStatus} ({colJobs.length})</h3>
                </div>
                <div className="space-y-3">
                  {colJobs.map(job => (
                    <div key={job.jobNo} className={`p-4 rounded-2xl border space-y-2 font-mono text-xs ${
                      isDarkMode ? 'bg-slate-950/80 border-slate-800' : 'bg-slate-50 border-slate-200'
                    }`}>
                      <div className="flex justify-between font-bold text-[#5B75F8] dark:text-[#7B92FF]">
                        <span>{job.jobNo}</span>
                        <span>{job.qty} NOS</span>
                      </div>
                      <p className="text-slate-300 font-semibold">{job.partDescription}</p>
                      <div className="flex justify-between text-[11px] text-slate-400">
                        <span>Machine: {job.machine}</span>
                        <span>Target: {job.targetDate}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Ultra-Polished Create Job Card Modal */}
      {showNewJobModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md font-sans">
          <div className={`relative w-full max-w-lg rounded-3xl border p-7 space-y-6 shadow-2xl transition-all ${
            isDarkMode 
              ? 'bg-slate-900/95 border-slate-800/80 text-white backdrop-blur-2xl shadow-[#5B75F8]/5' 
              : 'bg-white border-slate-200 text-slate-900 shadow-2xl'
          }`}>
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800/80 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-2xl bg-[#5B75F8]/15 text-[#5B75F8] border border-[#5B75F8]/30">
                  <Wrench className="w-5 h-5" />
                </div>
                <div>
                  <h3 className={`font-bold text-base tracking-tight ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                    Create Shopfloor Job Card
                  </h3>
                  <p className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                    Dispatch job order to CNC machining center
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
              {eligibleOrders.length === 0 ? (
                <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-600 dark:text-amber-400 text-xs font-mono flex items-start gap-2.5">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                  <div>
                    <strong className="font-bold block">No Confirmed Orders Ready</strong>
                    <span>No orders currently available for job card creation — an order must be Confirmed (Stage 1 complete) before job cards can be released.</span>
                  </div>
                </div>
              ) : null}

              {selectedOrderForForm && (selectedOrderForForm.lines || []).length > 0 ? (
                <div>
                  <label className="block text-[11px] font-mono uppercase font-bold text-slate-400 mb-1.5">
                    Line Item (per-item job card) *
                  </label>
                  <select
                    value={(selectedOrderForForm.lines || []).find(l => l.itemCode === newPartCode)?.id || ''}
                    onChange={(e) => handleSelectLineItem(e.target.value)}
                    className={`w-full rounded-2xl border px-3.5 py-3 text-xs font-mono font-bold outline-none transition-all cursor-pointer ${
                      isDarkMode
                        ? 'bg-slate-950/80 border-slate-800 text-white focus:border-[#5B75F8]'
                        : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-[#5B75F8]'
                    }`}
                  >
                    <option value="">— Custom (edit fields below) —</option>
                    {(selectedOrderForForm.lines || []).map(l => (
                      <option key={l.id} value={l.id}>
                        {l.itemCode} — {l.itemDescription} ({l.pendingQty ?? l.orderQty} {l.unit || 'NOS'} pending)
                      </option>
                    ))}
                  </select>
                </div>
              ) : null}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-mono uppercase font-bold text-slate-400 mb-1.5">
                    Order / PO Selection * {eligibleOrders.length > 0 && <span className="text-emerald-500 text-[10px]">({eligibleOrders.length} Ready)</span>}
                  </label>
                  {eligibleOrders.length > 0 ? (
                    <select
                      required
                      value={newOrderPo}
                      onChange={(e) => handleSelectOrder(e.target.value)}
                      className={`w-full rounded-2xl border px-3.5 py-3 text-xs font-mono font-bold outline-none transition-all cursor-pointer ${
                        isDarkMode 
                          ? 'bg-slate-950/80 border-slate-800 text-white focus:border-[#5B75F8]' 
                          : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-[#5B75F8]'
                      }`}
                    >
                      {eligibleOrders.map(ord => (
                        <option key={ord.id || ord.poNo} value={ord.poNo}>
                          {ord.poNo} — {ord.customerName} ({ord.lines?.[0]?.itemCode || 'PART'} • {ord.lines?.[0]?.orderQty || ord.orderedQty || 0} NOS)
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type="text"
                      disabled
                      placeholder="No material-verified orders available"
                      className={`w-full rounded-2xl border px-4 py-3 text-xs font-mono opacity-60 cursor-not-allowed ${
                        isDarkMode ? 'bg-slate-950/80 border-slate-800 text-slate-500' : 'bg-slate-100 border-slate-200 text-slate-400'
                      }`}
                    />
                  )}
                </div>
                <div>
                  <label className="block text-[11px] font-mono uppercase font-bold text-slate-400 mb-1.5">Job Quantity *</label>
                  <input
                    type="number"
                    required
                    value={newQty}
                    onChange={(e) => setNewQty(Number(e.target.value))}
                    className={`w-full rounded-2xl border px-4 py-3 text-xs font-mono font-bold outline-none transition-all ${
                      isDarkMode 
                        ? 'bg-slate-950/80 border-slate-800 text-white focus:border-[#5B75F8]' 
                        : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-[#5B75F8]'
                    }`}
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
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
                  <label className="block text-[11px] font-mono uppercase font-bold text-slate-400 mb-1.5">Heat/Lot #</label>
                  <input
                    type="text"
                    value={newHeatLot}
                    onChange={(e) => setNewHeatLot(e.target.value)}
                    placeholder="Optional — e.g. HEAT-LOT-9821"
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

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-mono uppercase font-bold text-slate-400 mb-1.5">Machine Allocated *</label>
                  <input
                    type="text"
                    required
                    value={newMachine}
                    onChange={(e) => setNewMachine(e.target.value)}
                    placeholder="e.g. VMC-01"
                    className={`w-full rounded-2xl border px-4 py-3 text-xs font-mono outline-none transition-all ${
                      isDarkMode 
                        ? 'bg-slate-950/80 border-slate-800 text-white focus:border-[#5B75F8]' 
                        : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-[#5B75F8]'
                    }`}
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-mono uppercase font-bold text-slate-400 mb-1.5">Target Completion</label>
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

              <div className="pt-4 border-t border-slate-200 dark:border-slate-800/80 flex items-center justify-end gap-3">
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
                  className="px-6 py-2.5 rounded-2xl bg-gradient-to-r from-[#5B75F8] to-indigo-600 hover:from-indigo-600 hover:to-[#5B75F8] text-white font-bold text-xs font-mono cursor-pointer shadow-lg shadow-[#5B75F8]/25 transition-all hover:scale-[1.02] active:scale-[0.98]"
                >
                  Generate Job Card
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Ultra-Polished Log Production Shift Modal */}
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

              <div className="pt-4 border-t border-slate-200 dark:border-slate-800/80 flex items-center justify-end gap-3">
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

    </div>
  );
};

export default ProductionView;
