import React from 'react';
import {
  JobCard,
  CustomerOrder,
  RouteCard,
  CompanyProfile,
  JobCardOperation,
  RouteCardTemplateStep,
  BillOfMaterials,
  ProductionLogReport
} from '../../../types/console';

export interface RouteCardTravelerPrintProps {
  jobCard: JobCard;
  order?: CustomerOrder | null;
  routeCard?: RouteCard | null;
  bom?: BillOfMaterials | null;
  productionLogs?: ProductionLogReport[];
  companyProfile?: CompanyProfile | null;
  isDarkMode?: boolean;
}

export const RouteCardTravelerPrint: React.FC<RouteCardTravelerPrintProps> = ({
  jobCard,
  order,
  routeCard,
  bom,
  productionLogs = [],
  companyProfile
}) => {
  // Operational steps priority:
  // 1. jobCard.operations (actual execution)
  // 2. routeCard.operations (planned template)
  const isActualExecution = Boolean(jobCard.operations && jobCard.operations.length > 0);
  const rawOps = isActualExecution
    ? (jobCard.operations as JobCardOperation[])
    : (routeCard?.operations || []);

  const sortedOps = [...rawOps].sort(
    (a, b) => Number(a.sequenceNo) - Number(b.sequenceNo)
  );

  // Time & Date formatters
  const now = new Date();
  const printTimestamp = now.toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true
  });

  const formatDateOnly = (iso?: string) => {
    if (!iso) return '—';
    const d = new Date(iso);
    if (isNaN(d.getTime())) return iso;
    return d.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  const formatTimeOnly = (iso?: string) => {
    if (!iso) return null;
    const d = new Date(iso);
    if (isNaN(d.getTime())) return iso;
    return d.toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  // Company Information
  const legalName = companyProfile?.legalName || 'GuruOm Precision Engineering';
  const companyAddress = companyProfile?.address || 'Plot No. W-45, MIDC Industrial Area, Waluj, Chhatrapati Sambhaji Nagar, MH 431136';
  const companyPhone = companyProfile?.phone || '+91 20 2712 3456';
  const companyEmail = companyProfile?.email || 'production@guruom.in';
  const companyGstin = companyProfile?.gstin || '27AABCG1234F1Z5';

  // Raw Material Spec from BOM or JobCard
  const primaryMaterial = bom?.components?.[0];
  const materialCode = primaryMaterial?.componentCode || 'RAW-EN8-BAR';
  const materialName = primaryMaterial?.componentName || 'EN8 Carbon Steel Bar Ø32mm';
  const materialQtyPerUnit = primaryMaterial?.qtyPerUnit ? `${primaryMaterial.qtyPerUnit} ${primaryMaterial.unit || 'KG'}` : '1.8 KG';

  // Calculate timing aggregates
  const totalStdMinutes = sortedOps.reduce((sum, op: any) => sum + Number(op.standardTimeMinutes || 0), 0);
  const totalActualMinutes = isActualExecution
    ? (sortedOps as JobCardOperation[]).reduce((sum, op) => sum + Number(op.actualTimeMinutes || 0), 0)
    : 0;

  const totalQtyOk = isActualExecution
    ? (sortedOps as JobCardOperation[]).reduce((sum, op) => sum + Number(op.qtyProcessed || 0), 0)
    : 0;

  const totalQtyScrap = isActualExecution
    ? (sortedOps as JobCardOperation[]).reduce((sum, op) => sum + Number(op.qtyRejected || 0), 0)
    : 0;

  return (
    <div
      className="print-clean-box bg-white text-slate-900 border border-slate-400 p-5 sm:p-6 text-xs font-sans space-y-4 shadow-sm"
      style={{ color: '#0f172a', background: '#ffffff' }}
    >
      {/* ========================================================================= */}
      {/* 1. OFFICIAL STATUTORY LETTERHEAD & DOCUMENT TITLE */}
      {/* ========================================================================= */}
      <div className="border-b-2 border-slate-900 pb-3 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h1 className="text-base sm:text-lg font-black uppercase tracking-tight text-slate-950">
            {legalName}
          </h1>
          <p className="text-[11px] text-slate-700 max-w-xl leading-relaxed">
            {companyAddress}
          </p>
          <div className="flex flex-wrap gap-x-4 text-[10px] text-slate-600 font-mono mt-0.5">
            <span><strong>GSTIN:</strong> {companyGstin}</span>
            <span><strong>Phone:</strong> {companyPhone}</span>
            <span><strong>Email:</strong> {companyEmail}</span>
          </div>
        </div>

        <div className="text-left sm:text-right shrink-0 border-t sm:border-t-0 sm:border-l sm:border-slate-300 pt-2 sm:pt-0 sm:pl-4">
          <div className="text-[11px] font-black uppercase tracking-wider text-slate-900 border border-slate-900 px-2 py-0.5 inline-block bg-slate-100">
            MANUFACTURING ROUTE CARD / JOB TRAVELER
          </div>
          <div className="text-xs font-mono font-bold text-slate-900 mt-1">
            Job No: <span className="text-sm font-black">{jobCard.jobNo}</span>
          </div>
          <div className="text-[10px] font-mono text-slate-600">
            Doc Ref: GOM-PRD-TRV-01 • Print: {printTimestamp}
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. ORDER & JOB SPECIFICATIONS GRID (NORMAL INDUSTRIAL TABULAR FORMAT) */}
      {/* ========================================================================= */}
      <table className="w-full text-left text-[11px] border-collapse border border-slate-400 font-mono">
        <tbody>
          <tr>
            <td className="bg-slate-100 font-bold border border-slate-300 p-1.5 w-1/6">Customer Name</td>
            <td className="border border-slate-300 p-1.5 w-2/6 font-semibold">{order?.customerName || 'Liebherr CMCtec India Pvt Ltd'}</td>
            <td className="bg-slate-100 font-bold border border-slate-300 p-1.5 w-1/6">Customer PO #</td>
            <td className="border border-slate-300 p-1.5 w-2/6 font-black text-slate-950">{jobCard.orderPo}</td>
          </tr>
          <tr>
            <td className="bg-slate-100 font-bold border border-slate-300 p-1.5">PO Date</td>
            <td className="border border-slate-300 p-1.5">{formatDateOnly(order?.poDate)}</td>
            <td className="bg-slate-100 font-bold border border-slate-300 p-1.5">Target Delivery Date</td>
            <td className="border border-slate-300 p-1.5 font-bold text-slate-900">{formatDateOnly(jobCard.targetDate || order?.deliveryDate)}</td>
          </tr>
          <tr>
            <td className="bg-slate-100 font-bold border border-slate-300 p-1.5">Finished Part Code</td>
            <td className="border border-slate-300 p-1.5 font-black">{jobCard.partCode}</td>
            <td className="bg-slate-100 font-bold border border-slate-300 p-1.5">Drawing Revision</td>
            <td className="border border-slate-300 p-1.5 font-bold">{jobCard.drawingRevision || 'REV-A'}</td>
          </tr>
          <tr>
            <td className="bg-slate-100 font-bold border border-slate-300 p-1.5">Part Description</td>
            <td className="border border-slate-300 p-1.5 font-sans font-medium" colSpan={3}>
              {jobCard.partDescription}
            </td>
          </tr>
          <tr>
            <td className="bg-slate-100 font-bold border border-slate-300 p-1.5">Batch / Order Qty</td>
            <td className="border border-slate-300 p-1.5 font-bold">
              {jobCard.targetQty ?? jobCard.qty ?? 1} NOS
            </td>
            <td className="bg-slate-100 font-bold border border-slate-300 p-1.5">Primary Work Center</td>
            <td className="border border-slate-300 p-1.5 font-bold">{jobCard.machine || 'VMC-01 (Vertical Milling)'}</td>
          </tr>
          <tr>
            <td className="bg-slate-100 font-bold border border-slate-300 p-1.5">Raw Material Code</td>
            <td className="border border-slate-300 p-1.5">{materialCode} — {materialName} ({materialQtyPerUnit}/unit)</td>
            <td className="bg-slate-100 font-bold border border-slate-300 p-1.5">Heat / Material Lot #</td>
            <td className="border border-slate-300 p-1.5 font-bold">{jobCard.materialIssuedLot || 'HT-2026-EN8-091'}</td>
          </tr>
          <tr>
            <td className="bg-slate-100 font-bold border border-slate-300 p-1.5">Material QC Status</td>
            <td className="border border-slate-300 p-1.5 font-bold">
              {jobCard.materialQcStatus || 'ACCEPTED'}
            </td>
            <td className="bg-slate-100 font-bold border border-slate-300 p-1.5">Current Job Stage</td>
            <td className="border border-slate-300 p-1.5 font-bold text-slate-900">
              {jobCard.status || jobCard.jobStatus || 'SCHEDULED'}
            </td>
          </tr>
        </tbody>
      </table>

      {/* ========================================================================= */}
      {/* 3. ROUTE OPERATIONS & TIMING SCHEDULE (DETAILED TIMING COLUMNS) */}
      {/* ========================================================================= */}
      <div className="space-y-1.5">
        <div className="flex justify-between items-center text-[11px] font-mono font-bold uppercase text-slate-900 border-b border-slate-300 pb-1">
          <span>Operational Routing Sequence & Timing Log</span>
          <span className="text-[10px] text-slate-600 font-normal">
            {isActualExecution ? 'Recorded Floor Timings' : 'Standard Routing Schedule (Fill in start/end on shopfloor)'}
          </span>
        </div>

        <table className="w-full text-left text-[10px] border-collapse border border-slate-400 font-mono">
          <thead>
            <tr className="bg-slate-200 text-slate-900 font-bold text-center">
              <th className="border border-slate-400 p-1.5 w-8">Seq</th>
              <th className="border border-slate-400 p-1.5 text-left w-36">Operation Name</th>
              <th className="border border-slate-400 p-1.5 text-left w-28">Machine / Station</th>
              <th className="border border-slate-400 p-1.5 w-16">Std Time</th>
              <th className="border border-slate-400 p-1.5 w-20">Start Time</th>
              <th className="border border-slate-400 p-1.5 w-20">End Time</th>
              <th className="border border-slate-400 p-1.5 w-16">Act. Time</th>
              <th className="border border-slate-400 p-1.5 w-14">Qty OK</th>
              <th className="border border-slate-400 p-1.5 w-14">Scrap</th>
              <th className="border border-slate-400 p-1.5 w-24">Operator</th>
              <th className="border border-slate-400 p-1.5 w-20">QC Sign</th>
            </tr>
          </thead>
          <tbody>
            {sortedOps.length === 0 ? (
              <tr>
                <td colSpan={11} className="border border-slate-400 p-4 text-center text-slate-500">
                  No routing operations defined for this part code.
                </td>
              </tr>
            ) : (
              sortedOps.map((op: any, idx: number) => {
                const actualOp = isActualExecution ? (op as JobCardOperation) : null;
                const tplOp = !isActualExecution ? (op as RouteCardTemplateStep) : null;

                // Match with productionLogs if actual start/end are not populated directly on op
                const matchedLog = productionLogs.find(l => l.stepNo === op.sequenceNo);
                const startTimeDisplay = actualOp?.actualStartTime
                  ? formatTimeOnly(actualOp.actualStartTime)
                  : matchedLog?.loggedTimestamp
                  ? formatTimeOnly(matchedLog.loggedTimestamp)
                  : '____:____';

                const endTimeDisplay = actualOp?.actualEndTime
                  ? formatTimeOnly(actualOp.actualEndTime)
                  : actualOp?.opStatus === 'COMPLETED' && matchedLog?.loggedTimestamp
                  ? formatTimeOnly(matchedLog.loggedTimestamp)
                  : '____:____';

                const actualDurationDisplay = actualOp?.actualTimeMinutes != null
                  ? `${actualOp.actualTimeMinutes} m`
                  : '____ m';

                const qtyOkDisplay = actualOp?.qtyProcessed != null
                  ? actualOp.qtyProcessed
                  : matchedLog?.qtyDone != null
                  ? matchedLog.qtyDone
                  : '____';

                const qtyScrapDisplay = actualOp?.qtyRejected != null
                  ? actualOp.qtyRejected
                  : '0';

                const operatorDisplay = actualOp?.operatorName || '—';
                const qcDisplay = actualOp?.inspectionPassed
                  ? 'PASS ✓'
                  : actualOp?.inspectionRequired
                  ? 'REQ'
                  : 'N/A';

                return (
                  <tr key={op.id || idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                    <td className="border border-slate-300 p-1.5 text-center font-bold text-slate-700">
                      {op.sequenceNo}
                    </td>
                    <td className="border border-slate-300 p-1.5 font-semibold text-slate-900 font-sans">
                      {op.operationName}
                    </td>
                    <td className="border border-slate-300 p-1.5 text-slate-700">
                      {actualOp?.machineId || tplOp?.workCenter || jobCard.machine || '—'}
                    </td>
                    <td className="border border-slate-300 p-1.5 text-right font-bold">
                      {op.standardTimeMinutes != null ? `${op.standardTimeMinutes}m` : '—'}
                    </td>
                    <td className="border border-slate-300 p-1.5 text-center font-mono">
                      {startTimeDisplay}
                    </td>
                    <td className="border border-slate-300 p-1.5 text-center font-mono">
                      {endTimeDisplay}
                    </td>
                    <td className="border border-slate-300 p-1.5 text-right font-bold font-mono">
                      {actualDurationDisplay}
                    </td>
                    <td className="border border-slate-300 p-1.5 text-right font-bold text-emerald-700">
                      {qtyOkDisplay}
                    </td>
                    <td className="border border-slate-300 p-1.5 text-right text-rose-700 font-bold">
                      {qtyScrapDisplay}
                    </td>
                    <td className="border border-slate-300 p-1.5 text-center truncate">
                      {operatorDisplay}
                    </td>
                    <td className="border border-slate-300 p-1.5 text-center font-bold text-[9px]">
                      {qcDisplay}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* ========================================================================= */}
      {/* 4. TIMING & YIELD TOTALS SUMMARY (CLEAN TABULAR BOX) */}
      {/* ========================================================================= */}
      <table className="w-full text-left text-[11px] border-collapse border border-slate-400 font-mono">
        <tbody>
          <tr className="bg-slate-100">
            <td className="border border-slate-300 p-1.5 font-bold">Total Standard Cycle Time:</td>
            <td className="border border-slate-300 p-1.5 font-bold">{totalStdMinutes} Minutes ({Math.round((totalStdMinutes / 60) * 100) / 100} Hrs)</td>
            <td className="border border-slate-300 p-1.5 font-bold">Total Actual Floor Time:</td>
            <td className="border border-slate-300 p-1.5 font-bold text-slate-900">
              {totalActualMinutes > 0 ? `${totalActualMinutes} Minutes` : 'To be calculated post-run'}
            </td>
          </tr>
          <tr>
            <td className="border border-slate-300 p-1.5 font-bold">Total Target Quantity:</td>
            <td className="border border-slate-300 p-1.5 font-bold">{jobCard.targetQty ?? jobCard.qty ?? 1} NOS</td>
            <td className="border border-slate-300 p-1.5 font-bold">Yield / Rejection Summary:</td>
            <td className="border border-slate-300 p-1.5 font-bold">
              {totalQtyOk > 0 ? `${totalQtyOk} OK / ${totalQtyScrap} Scrap` : 'In Process'}
            </td>
          </tr>
        </tbody>
      </table>

      {/* ========================================================================= */}
      {/* 5. PHYSICAL HAND-SIGNATURE & AUTHORIZATION GRID */}
      {/* ========================================================================= */}
      <div className="space-y-1">
        <div className="text-[10px] font-mono font-bold uppercase text-slate-800">
          Statutory Shopfloor Authorization & Physical Verification Sign-Off
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[10px] font-mono">
          <div className="border border-slate-400 p-2 flex flex-col justify-between h-20 bg-slate-50">
            <div className="font-bold uppercase text-slate-700">1. Machine Operator</div>
            <div className="text-[9px] text-slate-500">Sign: ___________________</div>
            <div className="text-[9px] text-slate-500">Date/Time: _______________</div>
          </div>

          <div className="border border-slate-400 p-2 flex flex-col justify-between h-20 bg-slate-50">
            <div className="font-bold uppercase text-slate-700">2. Production Supervisor</div>
            <div className="text-[9px] text-slate-500">
              {jobCard.supervisorSignOff ? `Verified: ${jobCard.supervisorSignOff}` : 'Sign: ___________________'}
            </div>
            <div className="text-[9px] text-slate-500">Date: ___________________</div>
          </div>

          <div className="border border-slate-400 p-2 flex flex-col justify-between h-20 bg-slate-50">
            <div className="font-bold uppercase text-slate-700">3. QC Inspector (Stage/PDI)</div>
            <div className="text-[9px] text-slate-500">
              {jobCard.materialQcStatus === 'ACCEPTED' ? 'QC Clearance: ACCEPTED ✓' : 'Stamp: __________________'}
            </div>
            <div className="text-[9px] text-slate-500">Sign: ___________________</div>
          </div>

          <div className="border border-slate-400 p-2 flex flex-col justify-between h-20 bg-slate-50">
            <div className="font-bold uppercase text-slate-700">4. Stores In-Charge</div>
            <div className="text-[9px] text-slate-500">Material Issued Lot Confirmed</div>
            <div className="text-[9px] text-slate-500">Sign & Date: _____________</div>
          </div>
        </div>
      </div>

      {/* Footer Notes */}
      <div className="pt-2 border-t border-slate-300 flex justify-between text-[9px] text-slate-500 font-mono">
        <span>* Machine operators must log actual start/end timings and sign upon completing each operation.</span>
        <span>Internal Document • GuruOm OS</span>
      </div>
    </div>
  );
};

export default RouteCardTravelerPrint;
