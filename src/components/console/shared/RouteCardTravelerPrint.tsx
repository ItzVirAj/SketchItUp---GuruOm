import React from 'react';
import {
  JobCard,
  CustomerOrder,
  RouteCard,
  CompanyProfile,
  JobCardOperation,
  RouteCardTemplateStep
} from '../../../types/console';

export interface RouteCardTravelerPrintProps {
  jobCard: JobCard;
  order?: CustomerOrder | null;
  routeCard?: RouteCard | null;
  companyProfile?: CompanyProfile | null;
  isDarkMode?: boolean;
}

export const RouteCardTravelerPrint: React.FC<RouteCardTravelerPrintProps> = ({
  jobCard,
  order,
  routeCard,
  companyProfile,
  isDarkMode = true
}) => {
  // Priority 1: JobCardOperation[] with actual execution data
  // Priority 2: RouteCardTemplateStep[] fallback (planned-only steps)
  const isActualExecution = Boolean(jobCard.operations && jobCard.operations.length > 0);
  const rawOps = isActualExecution
    ? (jobCard.operations as JobCardOperation[])
    : (routeCard?.operations || []);

  const sortedOps = [...rawOps].sort(
    (a, b) => Number(a.sequenceNo) - Number(b.sequenceNo)
  );

  const printDate = new Date().toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });

  const legalName = companyProfile?.legalName || 'GuruOm Precision Engineering';
  const companyAddress = companyProfile?.address || 'Plot No. W-45, MIDC Industrial Area, Waluj, Chhatrapati Sambhaji Nagar, Maharashtra 431136';
  const companyPhone = companyProfile?.phone || '+91 20 2712 3456';
  const companyEmail = companyProfile?.email || 'production@guruom.in';
  const companyGstin = companyProfile?.gstin || '27AABCG1234F1Z5';
  const companyPan = companyProfile?.pan || 'AABCG1234F';

  return (
    <div
      className={`print-clean-box p-5 sm:p-7 rounded-2xl border transition-ui space-y-6 ${
        isDarkMode
          ? 'bg-slate-900/90 border-slate-800 text-white'
          : 'bg-white border-slate-200 text-slate-900 shadow-sm'
      }`}
    >
      {/* ===================================================================== */}
      {/* 1. HEADER / LETTERHEAD */}
      {/* ===================================================================== */}
      <div className="border-b border-slate-300 dark:border-slate-700/80 pb-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="space-y-1">
            <div className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Manufacturing Operational Traveler
            </div>
            <h1 className="text-lg sm:text-xl font-black uppercase tracking-tight text-slate-900 dark:text-white">
              {legalName}
            </h1>
            <p className="text-xs text-slate-600 dark:text-slate-300 max-w-2xl">
              {companyAddress}
            </p>
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs font-mono text-slate-600 dark:text-slate-400 pt-0.5">
              <span><strong>Phone:</strong> {companyPhone}</span>
              <span><strong>Email:</strong> {companyEmail}</span>
              <span><strong>GSTIN:</strong> {companyGstin}</span>
              <span><strong>PAN:</strong> {companyPan}</span>
            </div>
          </div>

          <div className="text-left sm:text-right border-t sm:border-t-0 sm:border-l border-slate-200 dark:border-slate-800 pt-3 sm:pt-0 sm:pl-6 shrink-0 font-mono">
            <div className="inline-block px-3 py-1 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 font-bold text-xs uppercase tracking-wider">
              SHOPFLOOR ROUTE CARD / JOB TRAVELER
            </div>
            <div className="mt-2 text-sm font-bold text-slate-900 dark:text-white">
              Job Card: <span className="text-emerald-600 dark:text-emerald-400">{jobCard.jobNo}</span>
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400">
              Print Date: {printDate}
            </div>
          </div>
        </div>
      </div>

      {/* ===================================================================== */}
      {/* 2. JOB CARD SUMMARY BLOCK */}
      {/* ===================================================================== */}
      <div className="space-y-3">
        {/* NCR QUALITY HOLD BANNER (If Applicable) */}
        {jobCard.hasOpenNcr && (
          <div className="p-3 border-2 border-black dark:border-rose-500 text-black dark:text-rose-400 bg-slate-100 dark:bg-rose-500/10 font-mono text-xs font-black uppercase tracking-wider text-center">
            ⚠ QUALITY HOLD — NCR: {jobCard.ncrReference || 'OPEN NCR INVESTIGATION'}
          </div>
        )}

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 text-xs font-mono">
          <div className={`p-2.5 rounded-xl border ${
            isDarkMode ? 'border-slate-800 bg-slate-950/40' : 'border-slate-200 bg-slate-50/70'
          }`}>
            <span className="text-[10px] text-slate-500 dark:text-slate-400 block uppercase font-bold">Job Card No</span>
            <span className="font-bold text-slate-900 dark:text-white">{jobCard.jobNo}</span>
          </div>

          <div className={`p-2.5 rounded-xl border ${
            isDarkMode ? 'border-slate-800 bg-slate-950/40' : 'border-slate-200 bg-slate-50/70'
          }`}>
            <span className="text-[10px] text-slate-500 dark:text-slate-400 block uppercase font-bold">Customer Order PO</span>
            <span className="font-bold text-slate-900 dark:text-white">{jobCard.orderPo}</span>
          </div>

          <div className={`p-2.5 rounded-xl border ${
            isDarkMode ? 'border-slate-800 bg-slate-950/40' : 'border-slate-200 bg-slate-50/70'
          }`}>
            <span className="text-[10px] text-slate-500 dark:text-slate-400 block uppercase font-bold">Customer Name</span>
            <span className="font-bold text-slate-900 dark:text-white truncate block" title={order?.customerName || '—'}>
              {order?.customerName || '—'}
            </span>
          </div>

          <div className={`p-2.5 rounded-xl border ${
            isDarkMode ? 'border-slate-800 bg-slate-950/40' : 'border-slate-200 bg-slate-50/70'
          }`}>
            <span className="text-[10px] text-slate-500 dark:text-slate-400 block uppercase font-bold">Part Code</span>
            <span className="font-bold text-emerald-600 dark:text-emerald-400">{jobCard.partCode}</span>
          </div>

          <div className={`p-2.5 rounded-xl border col-span-2 ${
            isDarkMode ? 'border-slate-800 bg-slate-950/40' : 'border-slate-200 bg-slate-50/70'
          }`}>
            <span className="text-[10px] text-slate-500 dark:text-slate-400 block uppercase font-bold">Part Description</span>
            <span className="font-semibold text-slate-900 dark:text-white">{jobCard.partDescription}</span>
          </div>

          <div className={`p-2.5 rounded-xl border ${
            isDarkMode ? 'border-slate-800 bg-slate-950/40' : 'border-slate-200 bg-slate-50/70'
          }`}>
            <span className="text-[10px] text-slate-500 dark:text-slate-400 block uppercase font-bold">Drawing Revision</span>
            <span className="font-bold text-slate-900 dark:text-white">{jobCard.drawingRevision || 'REV-A'}</span>
          </div>

          <div className={`p-2.5 rounded-xl border ${
            isDarkMode ? 'border-slate-800 bg-slate-950/40' : 'border-slate-200 bg-slate-50/70'
          }`}>
            <span className="text-[10px] text-slate-500 dark:text-slate-400 block uppercase font-bold">Job / Target Qty</span>
            <span className="font-bold text-slate-900 dark:text-white">{jobCard.targetQty ?? jobCard.qty ?? 0} NOS</span>
          </div>

          <div className={`p-2.5 rounded-xl border ${
            isDarkMode ? 'border-slate-800 bg-slate-950/40' : 'border-slate-200 bg-slate-50/70'
          }`}>
            <span className="text-[10px] text-slate-500 dark:text-slate-400 block uppercase font-bold">Target Delivery Date</span>
            <span className="font-bold text-slate-900 dark:text-white">{jobCard.targetDate || '—'}</span>
          </div>

          <div className={`p-2.5 rounded-xl border ${
            isDarkMode ? 'border-slate-800 bg-slate-950/40' : 'border-slate-200 bg-slate-50/70'
          }`}>
            <span className="text-[10px] text-slate-500 dark:text-slate-400 block uppercase font-bold">Machine / Work Center</span>
            <span className="font-bold text-slate-900 dark:text-white">{jobCard.machine || '—'}</span>
          </div>

          <div className={`p-2.5 rounded-xl border ${
            isDarkMode ? 'border-slate-800 bg-slate-950/40' : 'border-slate-200 bg-slate-50/70'
          }`}>
            <span className="text-[10px] text-slate-500 dark:text-slate-400 block uppercase font-bold">Material Lot / Heat #</span>
            <span className="font-bold text-slate-900 dark:text-white">{jobCard.materialIssuedLot || '—'}</span>
          </div>

          <div className={`p-2.5 rounded-xl border ${
            isDarkMode ? 'border-slate-800 bg-slate-950/40' : 'border-slate-200 bg-slate-50/70'
          }`}>
            <span className="text-[10px] text-slate-500 dark:text-slate-400 block uppercase font-bold">Material QC Status</span>
            <span className="font-bold text-slate-900 dark:text-white">{jobCard.materialQcStatus || 'ACCEPTED'}</span>
          </div>

          <div className={`p-2.5 rounded-xl border ${
            isDarkMode ? 'border-slate-800 bg-slate-950/40' : 'border-slate-200 bg-slate-50/70'
          }`}>
            <span className="text-[10px] text-slate-500 dark:text-slate-400 block uppercase font-bold">Current Status</span>
            <span className="font-bold text-slate-900 dark:text-white">{jobCard.status ?? jobCard.jobStatus ?? 'PLANNED'}</span>
          </div>
        </div>
      </div>

      {/* ===================================================================== */}
      {/* 3. ROUTE CARD / OPERATIONS TABLE */}
      {/* ===================================================================== */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs font-mono font-bold uppercase text-slate-700 dark:text-slate-300">
          <span>Operational Routing Sequence</span>
          <span className="text-[10px] text-slate-500">
            {isActualExecution ? 'Recorded Shopfloor Execution' : 'Planned Routing Template'}
          </span>
        </div>

        <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
          <table className="w-full text-left text-xs border-collapse font-mono">
            <thead>
              <tr className="bg-slate-100 dark:bg-slate-900 text-slate-700 dark:text-slate-300 uppercase text-[10px] font-bold">
                <th className="py-2.5 px-3 border border-slate-300 dark:border-slate-800 w-12 text-center">Seq</th>
                <th className="py-2.5 px-3 border border-slate-300 dark:border-slate-800">Operation Name</th>
                <th className="py-2.5 px-3 border border-slate-300 dark:border-slate-800">Work Center / Machine</th>
                <th className="py-2.5 px-3 border border-slate-300 dark:border-slate-800 text-right w-20">Std Time</th>
                <th className="py-2.5 px-3 border border-slate-300 dark:border-slate-800 text-right w-20">Actual Time</th>
                <th className="py-2.5 px-3 border border-slate-300 dark:border-slate-800 text-right w-20">Qty OK</th>
                <th className="py-2.5 px-3 border border-slate-300 dark:border-slate-800 text-right w-20">Qty Scrap</th>
                <th className="py-2.5 px-3 border border-slate-300 dark:border-slate-800">Operator</th>
                <th className="py-2.5 px-3 border border-slate-300 dark:border-slate-800 text-center w-20">QC Req'd</th>
                <th className="py-2.5 px-3 border border-slate-300 dark:border-slate-800 text-center w-24">Status</th>
              </tr>
            </thead>
            <tbody>
              {sortedOps.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-6 text-center text-slate-400 font-mono text-xs border border-slate-300 dark:border-slate-800">
                    No routing operations defined for this part.
                  </td>
                </tr>
              ) : (
                sortedOps.map((op: any, idx: number) => {
                  if (isActualExecution) {
                    const actualOp = op as JobCardOperation;
                    return (
                      <tr
                        key={actualOp.id || `${actualOp.sequenceNo}-${idx}`}
                        className={idx % 2 === 0 ? 'bg-transparent' : 'bg-slate-50/50 dark:bg-slate-900/30'}
                      >
                        <td className="py-2 px-3 border border-slate-300 dark:border-slate-800 text-center font-bold text-slate-600 dark:text-slate-400">
                          {actualOp.sequenceNo}
                        </td>
                        <td className="py-2 px-3 border border-slate-300 dark:border-slate-800 font-semibold text-slate-900 dark:text-white font-sans">
                          {actualOp.operationName}
                        </td>
                        <td className="py-2 px-3 border border-slate-300 dark:border-slate-800 text-slate-700 dark:text-slate-300">
                          {actualOp.machineId || jobCard.machine || '—'}
                        </td>
                        <td className="py-2 px-3 border border-slate-300 dark:border-slate-800 text-right">
                          {actualOp.standardTimeMinutes != null ? `${actualOp.standardTimeMinutes}m` : '—'}
                        </td>
                        <td className="py-2 px-3 border border-slate-300 dark:border-slate-800 text-right font-bold text-slate-900 dark:text-white">
                          {actualOp.actualTimeMinutes != null ? `${actualOp.actualTimeMinutes}m` : '—'}
                        </td>
                        <td className="py-2 px-3 border border-slate-300 dark:border-slate-800 text-right font-bold text-emerald-600 dark:text-emerald-400">
                          {actualOp.qtyProcessed != null ? actualOp.qtyProcessed : '—'}
                        </td>
                        <td className="py-2 px-3 border border-slate-300 dark:border-slate-800 text-right font-bold text-rose-600 dark:text-rose-400">
                          {actualOp.qtyRejected != null ? actualOp.qtyRejected : '—'}
                        </td>
                        <td className="py-2 px-3 border border-slate-300 dark:border-slate-800 text-slate-700 dark:text-slate-300">
                          {actualOp.operatorName || '—'}
                        </td>
                        <td className="py-2 px-3 border border-slate-300 dark:border-slate-800 text-center font-bold">
                          {actualOp.inspectionRequired ? 'YES' : 'NO'}
                        </td>
                        <td className="py-2 px-3 border border-slate-300 dark:border-slate-800 text-center font-bold text-slate-700 dark:text-slate-300">
                          {actualOp.opStatus || '—'}
                        </td>
                      </tr>
                    );
                  } else {
                    const tplOp = op as RouteCardTemplateStep;
                    return (
                      <tr
                        key={tplOp.id || `${tplOp.sequenceNo}-${idx}`}
                        className={idx % 2 === 0 ? 'bg-transparent' : 'bg-slate-50/50 dark:bg-slate-900/30'}
                      >
                        <td className="py-2 px-3 border border-slate-300 dark:border-slate-800 text-center font-bold text-slate-600 dark:text-slate-400">
                          {tplOp.sequenceNo}
                        </td>
                        <td className="py-2 px-3 border border-slate-300 dark:border-slate-800 font-semibold text-slate-900 dark:text-white font-sans">
                          {tplOp.operationName}
                        </td>
                        <td className="py-2 px-3 border border-slate-300 dark:border-slate-800 text-slate-700 dark:text-slate-300">
                          {tplOp.workCenter || '—'}
                        </td>
                        <td className="py-2 px-3 border border-slate-300 dark:border-slate-800 text-right">
                          {tplOp.standardTimeMinutes != null ? `${tplOp.standardTimeMinutes}m` : '—'}
                        </td>
                        {/* Fallback template steps leave execution cells blank for manual pen entry */}
                        <td className="py-2 px-3 border border-slate-300 dark:border-slate-800 text-right">
                          &nbsp;
                        </td>
                        <td className="py-2 px-3 border border-slate-300 dark:border-slate-800 text-right">
                          &nbsp;
                        </td>
                        <td className="py-2 px-3 border border-slate-300 dark:border-slate-800 text-right">
                          &nbsp;
                        </td>
                        <td className="py-2 px-3 border border-slate-300 dark:border-slate-800">
                          &nbsp;
                        </td>
                        <td className="py-2 px-3 border border-slate-300 dark:border-slate-800 text-center font-bold">
                          {tplOp.inspectionRequired ? 'YES' : 'NO'}
                        </td>
                        <td className="py-2 px-3 border border-slate-300 dark:border-slate-800 text-center">
                          &nbsp;
                        </td>
                      </tr>
                    );
                  }
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ===================================================================== */}
      {/* 4. SIGN-OFF SECTION & REMARKS */}
      {/* ===================================================================== */}
      <div className="space-y-3 pt-1">
        {/* Remarks Box */}
        {jobCard.remarks && (
          <div className={`p-3 rounded-xl border text-xs font-mono ${
            isDarkMode ? 'border-slate-800 bg-slate-950/40 text-slate-300' : 'border-slate-300 bg-slate-50 text-slate-800'
          }`}>
            <span className="font-bold uppercase tracking-wider block text-[10px] text-slate-500 dark:text-slate-400 mb-0.5">
              Engineering / Shopfloor Remarks:
            </span>
            <span>{jobCard.remarks}</span>
          </div>
        )}

        {/* Physical Hand-Signature Lines for Shopfloor Travelers */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
          <div className={`p-3 rounded-xl border flex flex-col justify-between h-24 ${
            isDarkMode ? 'border-slate-800 bg-slate-950/40' : 'border-slate-300 bg-white'
          }`}>
            <div className="text-[10px] font-bold uppercase text-slate-500 tracking-wider">
              Operator Name & Sign
            </div>
            <div className="border-b border-dashed border-slate-400 dark:border-slate-600 pb-1 text-slate-400 text-[11px]">
              &nbsp;
            </div>
          </div>

          <div className={`p-3 rounded-xl border flex flex-col justify-between h-24 ${
            isDarkMode ? 'border-slate-800 bg-slate-950/40' : 'border-slate-300 bg-white'
          }`}>
            <div className="text-[10px] font-bold uppercase text-slate-500 tracking-wider">
              Supervisor Sign-Off
            </div>
            <div className="border-b border-dashed border-slate-400 dark:border-slate-600 pb-1 font-bold text-slate-900 dark:text-white text-[11px] truncate">
              {jobCard.supervisorSignOff || <span className="opacity-0">—</span>}
            </div>
          </div>

          <div className={`p-3 rounded-xl border flex flex-col justify-between h-24 ${
            isDarkMode ? 'border-slate-800 bg-slate-950/40' : 'border-slate-300 bg-white'
          }`}>
            <div className="text-[10px] font-bold uppercase text-slate-500 tracking-wider">
              QC Inspector Sign-Off
            </div>
            <div className="border-b border-dashed border-slate-400 dark:border-slate-600 pb-1 text-slate-400 text-[11px]">
              &nbsp;
            </div>
          </div>

          <div className={`p-3 rounded-xl border flex flex-col justify-between h-24 ${
            isDarkMode ? 'border-slate-800 bg-slate-950/40' : 'border-slate-300 bg-white'
          }`}>
            <div className="text-[10px] font-bold uppercase text-slate-500 tracking-wider">
              Date & Verification
            </div>
            <div className="border-b border-dashed border-slate-400 dark:border-slate-600 pb-1 text-slate-800 dark:text-slate-200 text-[11px]">
              {printDate}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RouteCardTravelerPrint;
