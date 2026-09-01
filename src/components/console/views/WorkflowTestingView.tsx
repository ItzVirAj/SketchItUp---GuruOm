import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Play,
  RotateCcw,
  CheckCircle2,
  XCircle,
  Clock,
  FlaskConical,
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  Copy,
  Check,
  Server,
  Database,
  Layers,
  FileCheck,
  BellRing,
  ExternalLink,
  ShieldAlert
} from 'lucide-react';
import { apiClient } from '../../../lib/apiClient';

interface WorkflowStageResult {
  stage: number;
  id: string;
  name: string;
  department: string;
  status: 'PENDING' | 'RUNNING' | 'SUCCESS' | 'FAILED' | 'SKIPPED';
  durationMs?: number;
  outputSummary?: string;
  details?: Record<string, any>;
  error?: string;
  checks: {
    api: boolean;
    database: boolean;
    inventoryLedger?: boolean;
    auditLog: boolean;
    notification?: boolean;
  };
}

interface WorkflowRunState {
  runId: string;
  startedAt: string;
  completedAt?: string;
  totalDurationMs?: number;
  status: 'IDLE' | 'RUNNING' | 'COMPLETED' | 'FAILED';
  passedStages: number;
  failedStages: number;
  stages: WorkflowStageResult[];
  context: {
    customerId?: string;
    customerName?: string;
    customerGst?: string;
    orderPo?: string;
    orderId?: string;
    partCode?: string;
    partDescription?: string;
    rawMaterialCode?: string;
    rawMaterialDesc?: string;
    bomCode?: string;
    poNo?: string;
    poId?: string;
    grnNo?: string;
    grnId?: string;
    jobNo?: string;
    jobId?: string;
    qcId?: string;
    pdiId?: string;
    certNo?: string;
    challanNo?: string;
    challanId?: string;
    invoiceNo?: string;
    invoiceId?: string;
    orderQty: number;
    unitRate: number;
    grossAmount: number;
    rawMaterialRequiredKg: number;
    rawMaterialUnitPrice: number;
  };
}

const DEFAULT_STAGES: WorkflowStageResult[] = [
  { stage: 1, id: 'customer', name: 'Create Customer', department: 'Sales Master', status: 'PENDING', checks: { api: false, database: false, auditLog: false } },
  { stage: 2, id: 'order', name: 'Create Order', department: 'Sales & Order Management', status: 'PENDING', checks: { api: false, database: false, auditLog: false } },
  { stage: 3, id: 'bom', name: 'Create BOM (Bill of Materials)', department: 'Engineering Master', status: 'PENDING', checks: { api: false, database: false, auditLog: false } },
  { stage: 4, id: 'reservation', name: 'Material Reservation', department: 'Inventory Control', status: 'PENDING', checks: { api: false, database: false, auditLog: false } },
  { stage: 5, id: 'purchase', name: 'Create Purchase Order', department: 'Procurement', status: 'PENDING', checks: { api: false, database: false, auditLog: false } },
  { stage: 6, id: 'grn', name: 'Record Inward GRN', department: 'Gate Inward & Stores', status: 'PENDING', checks: { api: false, database: false, auditLog: false } },
  { stage: 7, id: 'inventory', name: 'Confirm Inventory Ledger', department: 'Append-Only Ledger', status: 'PENDING', checks: { api: false, database: false, auditLog: false } },
  { stage: 8, id: 'job_card', name: 'Create Job Card', department: 'Production Planning', status: 'PENDING', checks: { api: false, database: false, auditLog: false } },
  { stage: 9, id: 'production', name: 'Record Production Exec', department: 'Shopfloor Operations', status: 'PENDING', checks: { api: false, database: false, auditLog: false } },
  { stage: 10, id: 'qc', name: 'Perform QC Check & Quality Gate', department: 'Quality Control', status: 'PENDING', checks: { api: false, database: false, auditLog: false } },
  { stage: 11, id: 'pdi', name: 'Perform PDI Inspection', department: 'Quality Assurance', status: 'PENDING', checks: { api: false, database: false, auditLog: false } },
  { stage: 12, id: 'finished_goods', name: 'Confirm Finished Goods Stock', department: 'Stores & FG Registry', status: 'PENDING', checks: { api: false, database: false, auditLog: false } },
  { stage: 13, id: 'dispatch', name: 'Record Outward Dispatch', department: 'Logistics & Shipping', status: 'PENDING', checks: { api: false, database: false, auditLog: false } },
  { stage: 14, id: 'invoice', name: 'Generate Final Invoice', department: 'Finance & Accounts', status: 'PENDING', checks: { api: false, database: false, auditLog: false } }
];

interface WorkflowTestingViewProps {
  isDarkMode: boolean;
}

export const WorkflowTestingView: React.FC<WorkflowTestingViewProps> = ({ isDarkMode }) => {
  const [isRunning, setIsRunning] = useState(false);
  const [testUnhappyPath, setTestUnhappyPath] = useState(true);
  const [stages, setStages] = useState<WorkflowStageResult[]>(DEFAULT_STAGES);
  const [runData, setRunData] = useState<WorkflowRunState | null>(null);
  const [expandedStage, setExpandedStage] = useState<number | null>(null);
  const [logs, setLogs] = useState<string[]>([]);
  const [copiedLogs, setCopiedLogs] = useState(false);

  const addLog = (msg: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [`[${timestamp}] ${msg}`, ...prev]);
  };

  const handleRunWorkflow = async () => {
    setIsRunning(true);
    setLogs([]);
    addLog(`🚀 Starting Golden-Path Order-to-Cash Workflow (Unhappy path check: ${testUnhappyPath ? 'ON' : 'OFF'})...`);

    // Reset stages to pending
    setStages(DEFAULT_STAGES.map(s => ({ ...s, status: 'PENDING', durationMs: undefined, outputSummary: undefined, error: undefined })));

    try {
      // Direct call to our backend testing runner
      const res = await apiClient.post<{ success: boolean; data: WorkflowRunState }>('/testing/run-golden-path', {
        testUnhappyPath
      });

      if (res.data) {
        setRunData(res.data);
        setStages(res.data.stages);

        if (res.data.status === 'COMPLETED') {
          addLog(`🎉 Full workflow completed successfully: 14/14 stages passed in ${res.data.totalDurationMs}ms!`);
        } else {
          addLog(`❌ Workflow halted at stage with status: ${res.data.status}. Passed: ${res.data.passedStages}, Failed: ${res.data.failedStages}`);
        }

        res.data.stages.forEach(st => {
          if (st.status === 'SUCCESS') {
            addLog(`✅ Stage ${st.stage}: ${st.name} -> ${st.outputSummary || 'Passed'}`);
          } else if (st.status === 'FAILED') {
            addLog(`❌ Stage ${st.stage}: ${st.name} FAILED -> ${st.error}`);
          }
        });
      }
    } catch (err: any) {
      addLog(`💥 Execution exception: ${err?.message || err}`);
      setStages(prev => prev.map((s, idx) => idx === 0 ? { ...s, status: 'FAILED', error: err?.message } : s));
    } finally {
      setIsRunning(false);
    }
  };

  const handleReset = () => {
    setStages(DEFAULT_STAGES);
    setRunData(null);
    setLogs([]);
    setExpandedStage(null);
  };

  const copyLogsToClipboard = () => {
    navigator.clipboard.writeText(logs.join('\n'));
    setCopiedLogs(true);
    setTimeout(() => setCopiedLogs(false), 2000);
  };

  const passedCount = runData ? runData.passedStages : stages.filter(s => s.status === 'SUCCESS').length;
  const failedCount = runData ? runData.failedStages : stages.filter(s => s.status === 'FAILED').length;

  return (
    <div className="space-y-6">
      {/* Dev Warning Banner */}
      <div className={`p-4 rounded-xl border flex items-center justify-between gap-4 ${
        isDarkMode 
          ? 'bg-amber-950/30 border-amber-800/60 text-amber-300' 
          : 'bg-amber-50 border-amber-200 text-amber-900'
      }`}>
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-amber-500/20 text-amber-500">
            <FlaskConical className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-sm">Temporary Development & Testing Tool</span>
              <span className="px-2 py-0.5 text-xs font-bold rounded-full bg-amber-500/20 text-amber-500 uppercase tracking-wider">
                Dev Only
              </span>
            </div>
            <p className="text-xs opacity-80 mt-0.5">
              This dashboard is for verifying the 14-stage Order-to-Cash ERP pipeline in development. It reuses existing API endpoints and is designed for zero-impact removal.
            </p>
          </div>
        </div>
      </div>

      {/* Control Panel Card */}
      <div className={`p-6 rounded-2xl border ${
        isDarkMode ? 'bg-zinc-900/60 border-zinc-800' : 'bg-white border-zinc-200 shadow-sm'
      }`}>
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div>
            <h1 className="text-xl font-bold tracking-tight">Golden-Path Workflow Testing</h1>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
              Executes a live, stateful Order-to-Cash transaction through all modules in strict sequence.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-zinc-600 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-800/70 px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700">
              <input
                type="checkbox"
                checked={testUnhappyPath}
                onChange={e => setTestUnhappyPath(e.target.checked)}
                className="rounded border-zinc-300 dark:border-zinc-700 text-indigo-600 focus:ring-indigo-500"
              />
              <span>Test Unhappy-Path Quality Gate</span>
            </label>

            <button
              onClick={handleReset}
              disabled={isRunning}
              className={`px-3 py-2 rounded-lg text-xs font-medium border flex items-center gap-1.5 transition-colors ${
                isDarkMode 
                  ? 'border-zinc-700 hover:bg-zinc-800 text-zinc-300' 
                  : 'border-zinc-300 hover:bg-zinc-50 text-zinc-700'
              } disabled:opacity-50`}
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset</span>
            </button>

            <button
              onClick={handleRunWorkflow}
              disabled={isRunning}
              className={`px-5 py-2 rounded-lg text-sm font-semibold flex items-center gap-2 text-white shadow-lg transition-ui ${
                isRunning 
                  ? 'bg-indigo-500 cursor-not-allowed opacity-80' 
                  : 'bg-indigo-600 hover:bg-indigo-500 hover:shadow-indigo-500/25 transition-transform duration-150 ease-out active:scale-[0.96]'
              }`}
            >
              {isRunning ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Executing Pipeline...</span>
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 fill-white" />
                  <span>Run Golden-Path Workflow (14 Stages)</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Metrics Status Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 pt-6 border-t border-zinc-200 dark:border-zinc-800">
          <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200/70 dark:border-zinc-800">
            <span className="text-xs text-zinc-500 block">Pipeline Status</span>
            <span className={`text-sm font-bold mt-0.5 inline-flex items-center gap-1.5 ${
              runData?.status === 'COMPLETED' ? 'text-emerald-500' :
              runData?.status === 'FAILED' ? 'text-rose-500' :
              isRunning ? 'text-indigo-500 animate-pulse' : 'text-zinc-500'
            }`}>
              {isRunning ? 'RUNNING...' : (runData?.status || 'READY')}
            </span>
          </div>

          <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200/70 dark:border-zinc-800">
            <span className="text-xs text-zinc-500 block">Passed Stages</span>
            <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400 mt-0.5 block">
              {passedCount} / 14
            </span>
          </div>

          <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200/70 dark:border-zinc-800">
            <span className="text-xs text-zinc-500 block">Failed Stages</span>
            <span className={`text-sm font-bold mt-0.5 block ${failedCount > 0 ? 'text-rose-500' : 'text-zinc-500'}`}>
              {failedCount}
            </span>
          </div>

          <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200/70 dark:border-zinc-800">
            <span className="text-xs text-zinc-500 block">Execution Time</span>
            <span className="text-sm font-bold text-zinc-700 dark:text-zinc-300 mt-0.5 block">
              {runData?.totalDurationMs ? `${runData.totalDurationMs} ms` : '—'}
            </span>
          </div>
        </div>

        {/* Dynamic Context Preview Pills (When Run Completes) */}
        {runData?.context && (
          <div className="mt-4 pt-4 border-t border-zinc-200 dark:border-zinc-800 flex flex-wrap gap-2 text-xs">
            <span className="px-2 py-1 bg-zinc-100 dark:bg-zinc-800 rounded font-mono text-zinc-600 dark:text-zinc-400">
              Customer: {runData.context.customerName}
            </span>
            <span className="px-2 py-1 bg-zinc-100 dark:bg-zinc-800 rounded font-mono text-zinc-600 dark:text-zinc-400">
              PO: {runData.context.orderPo}
            </span>
            <span className="px-2 py-1 bg-zinc-100 dark:bg-zinc-800 rounded font-mono text-zinc-600 dark:text-zinc-400">
              GRN: {runData.context.grnNo}
            </span>
            <span className="px-2 py-1 bg-zinc-100 dark:bg-zinc-800 rounded font-mono text-zinc-600 dark:text-zinc-400">
              Job: {runData.context.jobNo}
            </span>
            <span className="px-2 py-1 bg-zinc-100 dark:bg-zinc-800 rounded font-mono text-zinc-600 dark:text-zinc-400">
              Challan: {runData.context.challanNo}
            </span>
            <span className="px-2 py-1 bg-zinc-100 dark:bg-zinc-800 rounded font-mono text-zinc-600 dark:text-zinc-400">
              Invoice: {runData.context.invoiceNo}
            </span>
          </div>
        )}
      </div>

      {/* 14-Stage Visual Workflow Pipeline */}
      <div className="space-y-3">
        <h2 className="text-base font-bold text-zinc-800 dark:text-zinc-200">
          Workflow Stages Breakdown
        </h2>

        <div className="grid grid-cols-1 gap-3">
          {stages.map((st) => {
            const isExpanded = expandedStage === st.stage;
            return (
              <div
                key={st.stage}
                className={`rounded-xl border transition-ui ${
                  st.status === 'SUCCESS' 
                    ? isDarkMode ? 'bg-emerald-950/10 border-emerald-900/40' : 'bg-emerald-50/50 border-emerald-200/80'
                    : st.status === 'FAILED'
                    ? isDarkMode ? 'bg-rose-950/10 border-rose-900/40' : 'bg-rose-50/50 border-rose-200/80'
                    : st.status === 'RUNNING'
                    ? isDarkMode ? 'bg-indigo-950/20 border-indigo-700/50' : 'bg-indigo-50/70 border-indigo-200'
                    : isDarkMode ? 'bg-zinc-900/40 border-zinc-800' : 'bg-white border-zinc-200'
                }`}
              >
                <div 
                  className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer select-none"
                  onClick={() => setExpandedStage(isExpanded ? null : st.stage)}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${
                      st.status === 'SUCCESS' ? 'bg-emerald-500 text-white' :
                      st.status === 'FAILED' ? 'bg-rose-500 text-white' :
                      st.status === 'RUNNING' ? 'bg-indigo-500 text-white animate-pulse' :
                      'bg-zinc-200 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400'
                    }`}>
                      {st.stage}
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-sm text-zinc-900 dark:text-zinc-100 truncate">
                          {st.name}
                        </span>
                        <span className="text-xs px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400">
                          {st.department}
                        </span>
                      </div>

                      {st.outputSummary && (
                        <p className="text-xs text-zinc-600 dark:text-zinc-300 mt-1 truncate">
                          {st.outputSummary}
                        </p>
                      )}

                      {st.error && (
                        <p className="text-xs text-rose-600 dark:text-rose-400 mt-1 font-mono">
                          Error: {st.error}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0 self-end sm:self-center">
                    {/* Verification Pills */}
                    <div className="flex items-center gap-1.5 text-[10px] font-mono">
                      <span title="API Output Check" className={`px-1.5 py-0.5 rounded ${st.checks.api ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400' : 'bg-zinc-200 dark:bg-zinc-800 text-zinc-400'}`}>
                        API
                      </span>
                      <span title="Database State Check" className={`px-1.5 py-0.5 rounded ${st.checks.database ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400' : 'bg-zinc-200 dark:bg-zinc-800 text-zinc-400'}`}>
                        DB
                      </span>
                      {st.checks.inventoryLedger !== undefined && (
                        <span title="Inventory Ledger Check" className={`px-1.5 py-0.5 rounded ${st.checks.inventoryLedger ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400' : 'bg-zinc-200 dark:bg-zinc-800 text-zinc-400'}`}>
                          LEDGER
                        </span>
                      )}
                      <span title="Audit Log Check" className={`px-1.5 py-0.5 rounded ${st.checks.auditLog ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400' : 'bg-zinc-200 dark:bg-zinc-800 text-zinc-400'}`}>
                        AUDIT
                      </span>
                    </div>

                    {st.durationMs !== undefined && (
                      <span className="text-xs font-mono text-zinc-400">
                        {st.durationMs}ms
                      </span>
                    )}

                    <div className="w-6 h-6 flex items-center justify-center">
                      {st.status === 'SUCCESS' && <CheckCircle2 className="w-5 h-5 text-emerald-500" />}
                      {st.status === 'FAILED' && <XCircle className="w-5 h-5 text-rose-500" />}
                      {st.status === 'RUNNING' && <div className="w-4 h-4 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />}
                      {st.status === 'PENDING' && <Clock className="w-4 h-4 text-zinc-400" />}
                    </div>

                    <div className="text-zinc-400">
                      {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                    </div>
                  </div>
                </div>

                {/* Expanded Details Drawer */}
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="border-t border-zinc-200 dark:border-zinc-800 px-4 py-3 bg-zinc-50/50 dark:bg-zinc-950/40 text-xs"
                    >
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <span className="font-semibold text-zinc-700 dark:text-zinc-300 block mb-1">
                            Stage Output & Verification Checks
                          </span>
                          <ul className="space-y-1 text-zinc-600 dark:text-zinc-400">
                            <li>• API Status: {st.checks.api ? '✅ OK' : '❌ Not verified'}</li>
                            <li>• Database State: {st.checks.database ? '✅ OK' : '❌ Not verified'}</li>
                            {st.checks.inventoryLedger !== undefined && (
                              <li>• Append-Only Ledger: {st.checks.inventoryLedger ? '✅ OK' : '❌ Failed'}</li>
                            )}
                            <li>• Audit Log Record: {st.checks.auditLog ? '✅ Recorded' : '❌ None'}</li>
                          </ul>
                        </div>

                        {st.details && (
                          <div>
                            <span className="font-semibold text-zinc-700 dark:text-zinc-300 block mb-1">
                              Payload Details
                            </span>
                            <pre className="p-2 rounded bg-zinc-900 text-zinc-200 font-mono text-[11px] overflow-x-auto max-h-36">
                              {JSON.stringify(st.details, null, 2)}
                            </pre>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      </div>

      {/* Live Pipeline Execution Console */}
      <div className={`p-4 rounded-xl border ${
        isDarkMode ? 'bg-zinc-950 border-zinc-800' : 'bg-zinc-900 border-zinc-800 text-zinc-200'
      }`}>
        <div className="flex items-center justify-between pb-3 mb-3 border-b border-zinc-800">
          <div className="flex items-center gap-2">
            <Server className="w-4 h-4 text-indigo-400" />
            <span className="text-xs font-semibold text-zinc-300 uppercase tracking-wider font-mono">
              Live Execution Log
            </span>
          </div>

          <button
            onClick={copyLogsToClipboard}
            disabled={logs.length === 0}
            className="flex items-center gap-1 text-xs text-zinc-400 hover:text-white px-2 py-1 rounded bg-zinc-800/80 disabled:opacity-40"
          >
            {copiedLogs ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copiedLogs ? 'Copied' : 'Copy Logs'}</span>
          </button>
        </div>

        <div className="font-mono text-xs text-zinc-300 space-y-1 max-h-48 overflow-y-auto">
          {logs.length === 0 ? (
            <p className="text-zinc-500 italic">No execution logs yet. Click &quot;Run Golden-Path Workflow&quot; above to start test.</p>
          ) : (
            logs.map((log, index) => (
              <p key={index} className="leading-relaxed">
                {log}
              </p>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
