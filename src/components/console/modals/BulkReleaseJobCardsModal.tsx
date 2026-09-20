import React, { useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle2, Factory, Search } from 'lucide-react';
import { Modal } from '../../common/Modal';
import type { CustomerOrder, JobCard, RouteCard } from '../../../types/console';
import type { BulkReleaseLineInput, BulkReleaseResult } from '../../../services/consoleApiServices';
import { computeBulkLineStates, countReleasableLines, type BulkLineState } from '../../../utils/bulkRelease';

interface BulkReleaseJobCardsModalProps {
  isOpen: boolean;
  onClose: () => void;
  isDarkMode: boolean;
  /** Orders that are allowed to release job cards (Material Ready / In Production). */
  orders: CustomerOrder[];
  jobCards: JobCard[];
  routeCards: RouteCard[];
  /** PO number or id to preselect when the modal opens. */
  initialOrderPo?: string;
  onRelease: (
    orderRef: string,
    payload: { targetDate?: string; lines: BulkReleaseLineInput[] }
  ) => Promise<BulkReleaseResult>;
  onConfigureRouteCards?: () => void;
}

interface RowEdit {
  checked: boolean;
  qty: string;
  revision: string;
  lot: string;
}

const defaultTargetDate = () => new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10);

const BulkReleaseJobCardsModalInner: React.FC<BulkReleaseJobCardsModalProps> = ({
  isOpen,
  onClose,
  isDarkMode,
  orders,
  jobCards,
  routeCards,
  initialOrderPo,
  onRelease,
  onConfigureRouteCards
}) => {
  // This component is mounted only while the modal is open (see the wrapper below), so every
  // field starts fresh on each open and no reset effects are needed.
  const [orderId, setOrderId] = useState(
    () => orders.find(o => o.poNo === initialOrderPo || o.id === initialOrderPo)?.id || ''
  );
  // Only what the planner changed is stored; everything else is derived from the line state.
  // So edits survive job cards refreshing underneath the open modal (e.g. a colleague releases one).
  const [overrides, setOverrides] = useState<Record<string, Partial<RowEdit>>>({});
  const [targetDate, setTargetDate] = useState(defaultTargetDate);
  const [query, setQuery] = useState('');
  const [showReleased, setShowReleased] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<BulkReleaseResult | null>(null);

  const order = useMemo(() => orders.find(o => o.id === orderId) || null, [orders, orderId]);
  const lineStates = useMemo(() => computeBulkLineStates(order, jobCards, routeCards), [order, jobCards, routeCards]);

  // Orders that still have something to release, for the picker.
  const pickerOrders = useMemo(
    () => orders
      .map(o => ({ o, n: countReleasableLines(o, jobCards, routeCards) }))
      .filter(x => x.n > 0 || x.o.id === orderId),
    [orders, jobCards, routeCards, orderId]
  );

  const editFor = (l: BulkLineState): RowEdit => ({
    checked: l.releasable,
    qty: l.releasable ? String(l.remainingQty) : '',
    revision: l.drawingRevision,
    lot: '',
    ...overrides[l.key]
  });

  const q = query.trim().toLowerCase();
  const visibleLines = lineStates.filter(l => {
    if (!showReleased && l.blocker === 'ALREADY_RELEASED') return false;
    if (!q) return true;
    return l.itemCode.toLowerCase().includes(q) || l.description.toLowerCase().includes(q);
  });

  const releasableVisible = visibleLines.filter(l => l.releasable);
  const selected = lineStates.filter(l => l.releasable && editFor(l).checked);
  const selectedQty = selected.reduce((sum, l) => sum + (Number(editFor(l).qty) || 0), 0);
  const invalidSelected = selected.filter(l => !(Number(editFor(l).qty) > 0));
  const allVisibleChecked = releasableVisible.length > 0 && releasableVisible.every(l => editFor(l).checked);
  const alreadyReleasedCount = lineStates.filter(l => l.blocker === 'ALREADY_RELEASED').length;
  const noRouteCount = lineStates.filter(l => l.blocker === 'NO_ROUTE_CARD').length;

  const setEdit = (key: string, patch: Partial<RowEdit>) =>
    setOverrides(prev => ({ ...prev, [key]: { ...prev[key], ...patch } }));

  const toggleAllVisible = (checked: boolean) =>
    setOverrides(prev => {
      const next = { ...prev };
      releasableVisible.forEach(l => { next[l.key] = { ...next[l.key], checked }; });
      return next;
    });

  const submit = async () => {
    if (!order || selected.length === 0 || invalidSelected.length > 0) return;
    setSubmitting(true);
    setError(null);
    try {
      const lines: BulkReleaseLineInput[] = selected.map(l => {
        const e = editFor(l);
        return {
          itemCode: l.itemCode,
          qty: Number(e.qty),
          drawingRevision: e.revision.trim() || undefined,
          materialIssuedLot: e.lot.trim() || undefined
        };
      });
      const res = await onRelease(order.id, { targetDate, lines });
      if (res.skipped.length === 0 && res.created.length > 0) {
        onClose(); // everything went through, nothing left to read
      } else {
        setResult(res); // show what was released and why some lines were skipped
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to release job cards.');
    } finally {
      setSubmitting(false);
    }
  };

  const muted = isDarkMode ? 'text-slate-400' : 'text-slate-500';
  const border = isDarkMode ? 'border-slate-700' : 'border-slate-200';
  const inputCls = `h-8 rounded-lg border px-2 text-xs font-mono outline-none focus:ring-1 focus:ring-blue-500 ${
    isDarkMode ? 'bg-slate-900 border-slate-700 text-slate-100' : 'bg-white border-slate-300 text-slate-900'
  }`;

  const footer = result ? (
    <div className="flex justify-end w-full">
      <button
        type="button"
        onClick={onClose}
        className="min-h-[40px] px-5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold cursor-pointer"
      >
        Done
      </button>
    </div>
  ) : (
    <div className="flex items-center justify-between gap-3 w-full flex-wrap">
      <span className={`text-[11px] font-mono ${muted}`}>
        {selected.length} line{selected.length === 1 ? '' : 's'} selected · {selectedQty.toLocaleString()} pcs
        {invalidSelected.length > 0 && <span className="text-rose-500"> · {invalidSelected.length} with invalid qty</span>}
      </span>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={onClose}
          className={`min-h-[40px] px-4 rounded-xl border text-xs font-bold cursor-pointer ${border} ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}
        >
          Cancel
        </button>
        <button
          type="button"
          disabled={submitting || !order || selected.length === 0 || invalidSelected.length > 0}
          onClick={submit}
          className="min-h-[40px] px-5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-bold cursor-pointer"
        >
          {submitting ? 'Releasing…' : `Release ${selected.length} Job Card${selected.length === 1 ? '' : 's'}`}
        </button>
      </div>
    </div>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      maxWidth="5xl"
      isDarkMode={isDarkMode}
      icon={<Factory className="w-5 h-5" />}
      title="Release Job Cards for a PO"
      subtitle="Release many order lines to the shopfloor in one go"
      footer={footer}
    >
      <div className="space-y-4 text-xs font-sans">
        {error && (
          <div className="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-500 text-xs font-mono flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {result ? (
          <div className="space-y-3">
            <div className={`p-3.5 rounded-2xl border flex items-center gap-2 ${
              result.created.length > 0 ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-500' : 'bg-amber-500/10 border-amber-500/30 text-amber-500'
            }`}>
              {result.created.length > 0 ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertTriangle className="w-4 h-4 shrink-0" />}
              <span className="font-bold">
                {result.created.length} job card{result.created.length === 1 ? '' : 's'} released
                {result.skipped.length > 0 && ` · ${result.skipped.length} line${result.skipped.length === 1 ? '' : 's'} skipped`}
              </span>
            </div>
            {result.skipped.length > 0 && (
              <div className={`rounded-2xl border ${border} divide-y ${isDarkMode ? 'divide-slate-800' : 'divide-slate-100'}`}>
                {result.skipped.map((s, i) => (
                  <div key={`${s.itemCode}-${i}`} className="p-3 flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="font-mono font-bold">{s.itemCode}</div>
                      <div className={`${muted} text-[11px]`}>{s.reason}</div>
                    </div>
                    {s.code === 'ROUTE_CARD_REQUIRED' && onConfigureRouteCards && (
                      <button
                        type="button"
                        onClick={() => { onClose(); onConfigureRouteCards(); }}
                        className="shrink-0 px-2.5 py-1 text-[10px] font-bold uppercase rounded-lg bg-rose-500/15 text-rose-500 hover:bg-rose-500/25 cursor-pointer"
                      >
                        Configure Route Card →
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2">
                <label className={`block mb-1.5 text-[11px] font-bold uppercase tracking-wider ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                  Customer Order PO *
                </label>
                <select
                  value={orderId}
                  onChange={e => setOrderId(e.target.value)}
                  className={`${inputCls} h-11 w-full`}
                >
                  <option value="">Select a PO with lines to release…</option>
                  {pickerOrders.map(({ o, n }) => (
                    <option key={o.id} value={o.id}>
                      {o.poNo} · {o.customerName} · {n} line{n === 1 ? '' : 's'} to release
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className={`block mb-1.5 text-[11px] font-bold uppercase tracking-wider ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                  Target Date
                </label>
                <input type="date" value={targetDate} onChange={e => setTargetDate(e.target.value)} className={`${inputCls} h-11 w-full`} />
              </div>
            </div>

            {order && (
              <>
                <div className="flex flex-wrap items-center gap-3">
                  <div className="relative flex-1 min-w-[180px]">
                    <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 ${muted}`} />
                    <input
                      type="text"
                      value={query}
                      onChange={e => setQuery(e.target.value)}
                      placeholder={`Filter ${lineStates.length} lines by item code or description…`}
                      className={`${inputCls} h-9 w-full pl-9`}
                    />
                  </div>
                  {alreadyReleasedCount > 0 && (
                    <label className={`flex items-center gap-1.5 cursor-pointer ${muted}`}>
                      <input type="checkbox" checked={showReleased} onChange={e => setShowReleased(e.target.checked)} />
                      Show {alreadyReleasedCount} already released
                    </label>
                  )}
                </div>

                {noRouteCount > 0 && (
                  <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-500 text-[11px] font-mono flex items-center justify-between gap-2">
                    <span className="flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 shrink-0" />
                      {noRouteCount} line{noRouteCount === 1 ? ' has' : 's have'} no Route Card and cannot be released yet.
                    </span>
                    {onConfigureRouteCards && (
                      <button
                        type="button"
                        onClick={() => { onClose(); onConfigureRouteCards(); }}
                        className="shrink-0 px-2.5 py-1 text-[10px] font-bold uppercase rounded-lg bg-amber-500/20 hover:bg-amber-500/30 cursor-pointer"
                      >
                        Route Cards →
                      </button>
                    )}
                  </div>
                )}

                {/* Wide content scrolls inside its own container so the modal never scrolls sideways */}
                <div className={`rounded-2xl border ${border} overflow-auto max-h-[52vh]`}>
                  <table className="w-full text-left min-w-[760px]">
                    <thead className={`sticky top-0 z-10 ${isDarkMode ? 'bg-slate-900' : 'bg-slate-50'}`}>
                      <tr className={`text-[10px] uppercase tracking-wider ${muted}`}>
                        <th className="p-2.5 w-9">
                          <input
                            type="checkbox"
                            aria-label="Select all visible lines"
                            checked={allVisibleChecked}
                            disabled={releasableVisible.length === 0}
                            onChange={e => toggleAllVisible(e.target.checked)}
                          />
                        </th>
                        <th className="p-2.5">Item</th>
                        <th className="p-2.5 text-right">Ordered</th>
                        <th className="p-2.5 text-right">Released</th>
                        <th className="p-2.5 w-24">Qty</th>
                        <th className="p-2.5 w-24">Rev</th>
                        <th className="p-2.5 w-32">Heat / Lot</th>
                      </tr>
                    </thead>
                    <tbody className={`divide-y ${isDarkMode ? 'divide-slate-800' : 'divide-slate-100'}`}>
                      {visibleLines.length === 0 && (
                        <tr>
                          <td colSpan={7} className={`p-6 text-center ${muted}`}>
                            {lineStates.length === 0 ? 'This order has no line items.' : 'No lines match. Everything visible is already released.'}
                          </td>
                        </tr>
                      )}
                      {visibleLines.map(l => {
                        const e = editFor(l);
                        const disabled = !l.releasable;
                        return (
                          <tr key={l.key} className={disabled ? 'opacity-60' : ''}>
                            <td className="p-2.5">
                              <input
                                type="checkbox"
                                aria-label={`Release ${l.itemCode}`}
                                disabled={disabled}
                                checked={!!e?.checked}
                                onChange={ev => setEdit(l.key, { checked: ev.target.checked })}
                              />
                            </td>
                            <td className="p-2.5">
                              <div className="font-mono font-bold">{l.itemCode}</div>
                              <div className={`${muted} text-[11px] max-w-[280px] truncate`}>{l.description}</div>
                            </td>
                            <td className="p-2.5 text-right font-mono">{l.orderQty.toLocaleString()}</td>
                            <td className="p-2.5 text-right font-mono">{l.releasedQty.toLocaleString()}</td>
                            {disabled ? (
                              <td className="p-2.5" colSpan={3}>
                                <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                                  l.blocker === 'NO_ROUTE_CARD' ? 'bg-amber-500/15 text-amber-500' : 'bg-emerald-500/15 text-emerald-500'
                                }`}>
                                  {l.blocker === 'NO_ROUTE_CARD' ? 'No route card' : 'Fully released'}
                                </span>
                              </td>
                            ) : (
                              <>
                                <td className="p-2.5">
                                  <input
                                    type="number"
                                    min={1}
                                    value={e?.qty ?? ''}
                                    onChange={ev => setEdit(l.key, { qty: ev.target.value })}
                                    className={`${inputCls} w-full`}
                                  />
                                </td>
                                <td className="p-2.5">
                                  <input
                                    type="text"
                                    value={e?.revision ?? ''}
                                    onChange={ev => setEdit(l.key, { revision: ev.target.value })}
                                    className={`${inputCls} w-full`}
                                  />
                                </td>
                                <td className="p-2.5">
                                  <input
                                    type="text"
                                    placeholder="optional"
                                    value={e?.lot ?? ''}
                                    onChange={ev => setEdit(l.key, { lot: ev.target.value })}
                                    className={`${inputCls} w-full`}
                                  />
                                </td>
                              </>
                            )}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </>
        )}
      </div>
    </Modal>
  );
};

/** Mounts the body only while open, so all state resets on every open. */
export const BulkReleaseJobCardsModal: React.FC<BulkReleaseJobCardsModalProps> = props =>
  props.isOpen ? <BulkReleaseJobCardsModalInner {...props} /> : null;
