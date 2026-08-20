import React, { useState, useEffect, useMemo } from 'react';
import { 
  Package, 
  AlertTriangle, 
  Search, 
  Download, 
  Plus, 
  Layers, 
  CheckCircle2, 
  X,
  TrendingDown,
  ArrowUpRight,
  SlidersHorizontal,
  Box,
  BarChart3,
  Boxes,
  ShoppingCart,
  Truck,
  FileSpreadsheet,
  ChevronDown,
  ChevronRight,
  ShieldCheck,
  XCircle,
  FileText,
  History,
  RotateCcw,
  FileDiff,
  TrendingUp
} from 'lucide-react';
import {
  StockItem,
  ShortageItem,
  PurchaseOrder,
  GoodsReceiptNote,
  InventoryMovement,
  StockReconciliationReport,
  MovementType,
  MasterItem
} from '../../../types/console';
import { 
  fetchPurchaseOrders, 
  insertPurchaseOrder, 
  reviewPurchaseOrder,
  fetchGrnList,
  insertGrn,
  updateGrnStatus,
  fetchInventoryMovements,
  fetchItemStockHistory,
  recordInventoryMovement,
  fetchStockReconciliation,
  reverseInventoryMovement
} from '../../../services/supabaseServices';
import { useAuth } from '../../../context/AuthContext';

interface InventoryViewProps {
  stock: StockItem[];
  shortages: ShortageItem[];
  isDarkMode: boolean;
  masters?: MasterItem[];
  onAdjustStock: (code: string, newOnHand: number, reason: string) => void;
}

export const InventoryView: React.FC<InventoryViewProps> = ({
  stock,
  shortages,
  isDarkMode,
  masters = [],
  onAdjustStock
}) => {
  const { user } = useAuth();
  const [subTab, setSubTab] = useState<'stock' | 'shortages' | 'purchases' | 'grn' | 'movements' | 'reconciliation'>('stock');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStockForAdjust, setSelectedStockForAdjust] = useState<StockItem | null>(null);
  const [adjustQty, setAdjustQty] = useState<number>(0);
  const [adjustReason, setAdjustReason] = useState<string>('Physical Audit Adjustment');

  // Async states for Purchasing, GRN, Movements & Reconciliation
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [grnList, setGrnList] = useState<GoodsReceiptNote[]>([]);
  const [movements, setMovements] = useState<InventoryMovement[]>([]);
  const [reconciliationReport, setReconciliationReport] = useState<StockReconciliationReport[]>([]);
  const [movementTypeFilter, setMovementTypeFilter] = useState<string>('ALL');
  const [selectedItemHistory, setSelectedItemHistory] = useState<{ itemCode: string; description?: string; history: InventoryMovement[] } | null>(null);
  const [selectedMovementForCorrection, setSelectedMovementForCorrection] = useState<InventoryMovement | null>(null);
  const [correctionReason, setCorrectionReason] = useState<string>('');
  const [isLoadingModuleData, setIsLoadingModuleData] = useState(false);

  // Modals state
  const [isCreatePoOpen, setIsCreatePoOpen] = useState(false);
  const [isCreateGrnOpen, setIsCreateGrnOpen] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  const loadModuleData = async () => {
    setIsLoadingModuleData(true);
    try {
      if (subTab === 'purchases') {
        const data = await fetchPurchaseOrders();
        setPurchaseOrders(data);
      } else if (subTab === 'grn') {
        const data = await fetchGrnList();
        setGrnList(data);
      } else if (subTab === 'movements') {
        const data = await fetchInventoryMovements();
        setMovements(data);
      } else if (subTab === 'reconciliation') {
        const data = await fetchStockReconciliation();
        setReconciliationReport(data);
      }
    } catch (err) {
      console.warn('InventoryView async fetch error:', err);
    } finally {
      setIsLoadingModuleData(false);
    }
  };

  useEffect(() => {
    loadModuleData();
  }, [subTab]);

  const handleOpenItemHistory = async (stk: StockItem) => {
    try {
      const history = await fetchItemStockHistory(stk.code);
      setSelectedItemHistory({
        itemCode: stk.code,
        description: stk.description,
        history
      });
    } catch (err) {
      console.warn('Failed to load item stock history:', err);
    }
  };

  const handleReverseMovement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMovementForCorrection) return;
    setActionError(null);
    setActionSuccess(null);
    try {
      await reverseInventoryMovement(selectedMovementForCorrection.id, correctionReason || 'Physical stock audit correction');
      setActionSuccess(`Reversal movement appended for ${selectedMovementForCorrection.id}`);
      setSelectedMovementForCorrection(null);
      setCorrectionReason('');
      loadModuleData();
    } catch (err: any) {
      setActionError(err.message || 'Failed to append correction movement');
    }
  };

  // Stock Master = full Item Catalog (Masters section) LEFT JOINed with live stock levels.
  // Every catalog item appears in realtime; items with no ledger movement yet show zero levels.
  const stockMasterRows = useMemo<StockItem[]>(() => {
    const byCode = new Map<string, StockItem>(stock.map(s => [s.code, s] as [string, StockItem]));
    const rows: StockItem[] = [];
    for (const item of masters) {
      const existing = byCode.get(item.code);
      if (existing) {
        rows.push(existing);
        byCode.delete(item.code);
      } else {
        rows.push({
          code: item.code,
          description: item.name || item.description || 'Catalog Item',
          onHand: 0,
          reserved: 0,
          available: 0,
          demand: 0,
          reorderLevel: Number(item.reorderLevel ?? 0),
          shortage: 0,
          unit: item.unit || 'NOS',
          status: 'OK'
        });
      }
    }
    rows.push(...byCode.values());
    return rows;
  }, [stock, masters]);

  const filteredStock = stockMasterRows.filter(s =>
    s.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleAdjustSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStockForAdjust) return;
    // The form collects a delta (+/-); the backend API expects the absolute new on-hand value
    const newOnHand = Math.max(0, (Number(selectedStockForAdjust.onHand) || 0) + adjustQty);
    try {
      setActionError(null);
      await onAdjustStock(selectedStockForAdjust.code, newOnHand, adjustReason);
      setSelectedStockForAdjust(null);
      setAdjustQty(0);
    } catch (err: any) {
      setActionError(err?.message || 'Failed to adjust stock. Check your role permissions.');
    }
  };

  const handlePoApproval = async (id: string, decision: 'APPROVE' | 'REJECT') => {
    setActionError(null);
    setActionSuccess(null);
    try {
      await reviewPurchaseOrder(id, decision);
      setActionSuccess(`Purchase order ${decision === 'APPROVE' ? 'approved' : 'rejected'} successfully.`);
      const updated = await fetchPurchaseOrders();
      setPurchaseOrders(updated);
    } catch (err: any) {
      setActionError(err.message || 'Failed to update approval status. Check your role permissions.');
    }
  };

  const handleGrnStatusChange = async (id: string, status: 'QC_VERIFIED' | 'REJECTED') => {
    setActionError(null);
    setActionSuccess(null);
    try {
      await updateGrnStatus(id, status);
      setActionSuccess(`GRN status updated to ${status}.`);
      const updated = await fetchGrnList();
      setGrnList(updated);
    } catch (err: any) {
      setActionError(err.message || 'Failed to update GRN status.');
    }
  };

  const totalOnHand = stockMasterRows.reduce((sum, s) => sum + (s.onHand || 0), 0);
  const shortageCount = stockMasterRows.filter(s => (s.shortage || 0) > 0 || s.status === 'SHORTAGE').length;
  const reorderCount = stockMasterRows.filter(s => (s.available || 0) <= (s.reorderLevel || 0) && (s.onHand || 0) > 0).length;

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
                isDarkMode ? 'bg-teal-500/20 text-teal-300 border border-teal-500/30' : 'bg-teal-50 text-teal-800 border border-teal-200'
              }`}>
                Store & Material Telemetry
              </span>
              <span className="text-xs text-slate-400 font-mono">• Physical Stock, GRN, Movements & Purchasing</span>
            </div>
            <h1 className={`text-2xl font-bold tracking-tight ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
              Inventory, Procurement & Store Ledger
            </h1>
            <p className={`text-xs mt-1 max-w-xl ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
              Monitor physical store inventory, execute Goods Receipt (GRN), audit real-time stock movements, and govern Purchase Orders.
            </p>
          </div>

          <div className="flex items-center gap-3">
            {subTab === 'stock' && (
              <button
                onClick={() => {
                  if (stockMasterRows.length > 0) setSelectedStockForAdjust(stockMasterRows[0]);
                }}
                className="px-4 py-2.5 rounded-2xl bg-gradient-to-r from-[#5B75F8] to-indigo-600 hover:from-indigo-600 hover:to-[#5B75F8] text-white font-bold text-xs flex items-center gap-2 cursor-pointer shadow-lg shadow-[#5B75F8]/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
              >
                <SlidersHorizontal className="w-4 h-4" />
                <span>Adjust Stock</span>
              </button>
            )}
            {subTab === 'purchases' && (
              <button
                onClick={() => setIsCreatePoOpen(true)}
                className="px-4 py-2.5 rounded-2xl bg-gradient-to-r from-[#5B75F8] to-indigo-600 hover:from-indigo-600 hover:to-[#5B75F8] text-white font-bold text-xs flex items-center gap-2 cursor-pointer shadow-lg shadow-[#5B75F8]/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
              >
                <Plus className="w-4 h-4" />
                <span>Create Purchase Order</span>
              </button>
            )}
            {subTab === 'grn' && (
              <button
                onClick={() => setIsCreateGrnOpen(true)}
                className="px-4 py-2.5 rounded-2xl bg-gradient-to-r from-[#5B75F8] to-indigo-600 hover:from-indigo-600 hover:to-[#5B75F8] text-white font-bold text-xs flex items-center gap-2 cursor-pointer shadow-lg shadow-[#5B75F8]/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
              >
                <Truck className="w-4 h-4" />
                <span>Receive Material (GRN)</span>
              </button>
            )}
          </div>
        </div>

        {/* Feedback Banners */}
        {actionSuccess && (
          <div className="mt-4 p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex items-center justify-between">
            <span>{actionSuccess}</span>
            <button onClick={() => setActionSuccess(null)} className="cursor-pointer"><X className="w-4 h-4" /></button>
          </div>
        )}
        {actionError && (
          <div className="mt-4 p-3 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center justify-between">
            <span>{actionError}</span>
            <button onClick={() => setActionError(null)} className="cursor-pointer"><X className="w-4 h-4" /></button>
          </div>
        )}

        {/* Telemetry Stat Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
          <div className={`p-4 rounded-2xl border transition-all ${
            isDarkMode ? 'bg-slate-950/60 border-slate-800/80' : 'bg-slate-50/80 border-slate-200/80'
          }`}>
            <div className="flex items-center justify-between">
              <span className={`text-xs font-medium ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Total SKUs</span>
              <div className={`p-2 rounded-xl ${isDarkMode ? 'bg-[#5B75F8]/20 text-[#7B92FF]' : 'bg-[#5B75F8]/10 text-[#5B75F8]'}`}>
                <Package className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2 flex items-baseline justify-between">
              <span className={`text-2xl font-bold font-mono ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{stockMasterRows.length}</span>
              <span className="text-[11px] font-mono font-semibold text-[#5B75F8]">Active Parts</span>
            </div>
          </div>

          <div className={`p-4 rounded-2xl border transition-all ${
            isDarkMode ? 'bg-slate-950/60 border-slate-800/80' : 'bg-slate-50/80 border-slate-200/80'
          }`}>
            <div className="flex items-center justify-between">
              <span className={`text-xs font-medium ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Total On-Hand Qty</span>
              <div className={`p-2 rounded-xl ${isDarkMode ? 'bg-emerald-500/20 text-emerald-400' : 'bg-emerald-100 text-emerald-700'}`}>
                <Box className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2 flex items-baseline justify-between">
              <span className={`text-2xl font-bold font-mono ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{totalOnHand.toLocaleString()}</span>
              <span className="text-[11px] font-mono font-semibold text-emerald-500">Units</span>
            </div>
          </div>

          <div className={`p-4 rounded-2xl border transition-all ${
            isDarkMode ? 'bg-slate-950/60 border-slate-800/80' : 'bg-slate-50/80 border-slate-200/80'
          }`}>
            <div className="flex items-center justify-between">
              <span className={`text-xs font-medium ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Shortage Items</span>
              <div className={`p-2 rounded-xl ${isDarkMode ? 'bg-rose-500/20 text-rose-400' : 'bg-rose-100 text-rose-700'}`}>
                <AlertTriangle className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2 flex items-baseline justify-between">
              <span className={`text-2xl font-bold font-mono ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{shortageCount}</span>
              <span className="text-[11px] font-mono font-semibold text-rose-500">Deficit Alert</span>
            </div>
          </div>

          <div className={`p-4 rounded-2xl border transition-all ${
            isDarkMode ? 'bg-slate-950/60 border-slate-800/80' : 'bg-slate-50/80 border-slate-200/80'
          }`}>
            <div className="flex items-center justify-between">
              <span className={`text-xs font-medium ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Below Reorder Point</span>
              <div className={`p-2 rounded-xl ${isDarkMode ? 'bg-amber-500/20 text-amber-400' : 'bg-amber-100 text-amber-700'}`}>
                <TrendingDown className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2 flex items-baseline justify-between">
              <span className={`text-2xl font-bold font-mono ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{reorderCount}</span>
              <span className="text-[11px] font-mono font-semibold text-amber-500">Reorder Req</span>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Sub-Tabs Bar */}
      <div className={`p-4 rounded-3xl border transition-all flex flex-wrap items-center justify-between gap-4 ${
        isDarkMode ? 'bg-slate-900/70 border-slate-800/80 backdrop-blur-xl' : 'bg-white border-slate-200 shadow-xs'
      }`}>
        <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
          {[
            { id: 'stock', label: 'Stock Master' },
            { id: 'movements', label: 'Movement Ledger' },
            { id: 'reconciliation', label: 'Stock Reconciliation' },
            { id: 'shortages', label: 'Material Shortages' },
            { id: 'purchases', label: 'Purchase Orders' },
            { id: 'grn', label: 'Goods-in (GRN)' },
          ].map(t => (
            <button
              key={t.id}
              onClick={() => setSubTab(t.id as any)}
              className={`px-4 py-2 rounded-2xl text-xs font-mono font-bold transition-all cursor-pointer whitespace-nowrap ${
                subTab === t.id
                  ? isDarkMode 
                    ? 'bg-[#5B75F8]/20 text-[#7B92FF] border border-[#5B75F8]/40 shadow-xs' 
                    : 'bg-[#5B75F8] text-white shadow-xs'
                  : isDarkMode
                    ? 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className={`relative flex items-center rounded-2xl border px-3.5 py-1.5 transition-all ${
          isDarkMode ? 'bg-slate-950/80 border-slate-800 text-white focus-within:border-[#5B75F8]/50' : 'bg-slate-50 border-slate-200 text-slate-900 focus-within:border-[#5B75F8]'
        }`}>
          <Search className="w-4 h-4 text-slate-400 shrink-0 mr-2" />
          <input
            type="text"
            placeholder="Search Code / Description..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="bg-transparent outline-none text-xs w-48 sm:w-64 font-mono"
          />
        </div>
      </div>

      {/* 1. Main Stock Table */}
      {subTab === 'stock' && (
        <div className={`rounded-3xl border overflow-hidden transition-all shadow-xl ${
          isDarkMode ? 'bg-slate-900/80 border-slate-800/80 backdrop-blur-xl' : 'bg-white border-slate-200'
        }`}>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className={`border-b font-mono font-bold uppercase tracking-wider text-[11px] ${
                  isDarkMode ? 'bg-slate-950/60 border-slate-800 text-slate-400' : 'bg-slate-50 border-slate-200 text-slate-500'
                }`}>
                  <th className="py-4 px-5">Part Code</th>
                  <th className="py-4 px-5">Description</th>
                  <th className="py-4 px-5 text-right">On Hand</th>
                  <th className="py-4 px-5 text-right">Reserved</th>
                  <th className="py-4 px-5 text-right">Available</th>
                  <th className="py-4 px-5 text-right">Demand</th>
                  <th className="py-4 px-5 text-right">Reorder Level</th>
                  <th className="py-4 px-5 text-center">Status</th>
                  <th className="py-4 px-5 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800/60">
                {filteredStock.map((stk) => {
                  const isShort = stk.status === 'SHORTAGE' || (stk.shortage || 0) > 0;
                  return (
                    <tr 
                      key={stk.code}
                      className={isDarkMode ? 'hover:bg-slate-800/50' : 'hover:bg-slate-50'}
                    >
                      <td className="py-4 px-5 font-bold font-mono text-[#5B75F8] dark:text-[#7B92FF]">
                        {stk.code}
                      </td>
                      <td className={`py-4 px-5 font-semibold ${isDarkMode ? 'text-slate-100' : 'text-slate-800'}`}>
                        {stk.description}
                      </td>
                      <td className={`py-4 px-5 text-right font-bold font-mono ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                        {stk.onHand} {stk.unit}
                      </td>
                      <td className="py-4 px-5 text-right font-mono text-slate-400">
                        {stk.reserved}
                      </td>
                      <td className="py-4 px-5 text-right font-bold font-mono text-emerald-500">
                        {stk.available}
                      </td>
                      <td className="py-4 px-5 text-right font-mono text-amber-500 font-semibold">
                        {stk.demand}
                      </td>
                      <td className="py-4 px-5 text-right font-mono text-slate-400">
                        {stk.reorderLevel}
                      </td>
                      <td className="py-4 px-5 text-center">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-[10px] font-mono font-bold uppercase border ${
                          isShort
                            ? 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                            : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${isShort ? 'bg-rose-500' : 'bg-emerald-500'}`} />
                          <span>{stk.status}</span>
                        </span>
                      </td>
                      <td className="py-4 px-5 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => setSelectedStockForAdjust(stk)}
                            className={`px-3 py-1.5 rounded-xl font-mono text-xs font-bold transition-all cursor-pointer ${
                              isDarkMode ? 'bg-[#5B75F8]/10 text-[#7B92FF] hover:bg-[#5B75F8]/20 border border-[#5B75F8]/30' : 'bg-[#5B75F8]/10 text-[#5B75F8] hover:bg-[#5B75F8]/20 border border-[#5B75F8]/20'
                            }`}
                          >
                            Adjust
                          </button>
                          <button
                            onClick={() => handleOpenItemHistory(stk)}
                            title="View Append-Only Movement History"
                            className={`p-1.5 rounded-xl font-mono text-xs font-bold transition-all cursor-pointer ${
                              isDarkMode ? 'bg-slate-800 text-slate-300 hover:bg-slate-700' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                            }`}
                          >
                            <History className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 2. Material Shortages Sub-View */}
      {subTab === 'shortages' && (
        <div className={`rounded-3xl border overflow-hidden transition-all shadow-xl ${
          isDarkMode ? 'bg-slate-900/80 border-slate-800/80 backdrop-blur-xl' : 'bg-white border-slate-200'
        }`}>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className={`border-b font-mono font-bold uppercase tracking-wider text-[11px] ${
                  isDarkMode ? 'bg-slate-950/60 border-slate-800 text-slate-400' : 'bg-slate-50 border-slate-200 text-slate-500'
                }`}>
                  <th className="py-4 px-5">Material SKU</th>
                  <th className="py-4 px-5">Description</th>
                  <th className="py-4 px-5 text-right">Required Qty</th>
                  <th className="py-4 px-5 text-right">Available Qty</th>
                  <th className="py-4 px-5 text-right">Deficit / Deficit Alert</th>
                  <th className="py-4 px-5 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800/60">
                {shortages.map(sh => (
                  <tr key={sh.code} className={isDarkMode ? 'hover:bg-slate-800/50' : 'hover:bg-slate-50'}>
                    <td className="py-4 px-5 font-bold font-mono text-[#5B75F8] dark:text-[#7B92FF]">{sh.code}</td>
                    <td className={`py-4 px-5 font-semibold ${isDarkMode ? 'text-slate-100' : 'text-slate-800'}`}>{sh.description}</td>
                    <td className="py-4 px-5 text-right font-mono font-bold text-amber-500">{sh.requiredQty} {sh.unit}</td>
                    <td className="py-4 px-5 text-right font-mono text-slate-400">{sh.availableQty} {sh.unit}</td>
                    <td className="py-4 px-5 text-right font-mono font-bold text-rose-400">-{sh.deficit} {sh.unit}</td>
                    <td className="py-4 px-5 text-center">
                      <button
                        onClick={() => {
                          setSubTab('purchases');
                          setIsCreatePoOpen(true);
                        }}
                        className="px-3 py-1.5 rounded-xl bg-[#5B75F8]/10 hover:bg-[#5B75F8]/20 text-[#7B92FF] border border-[#5B75F8]/30 text-xs font-mono font-bold cursor-pointer transition-all"
                      >
                        Raise PO
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 3. Purchase Orders Sub-View */}
      {subTab === 'purchases' && (
        <div className={`rounded-3xl border overflow-hidden transition-all shadow-xl ${
          isDarkMode ? 'bg-slate-900/80 border-slate-800/80 backdrop-blur-xl' : 'bg-white border-slate-200'
        }`}>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className={`border-b font-mono font-bold uppercase tracking-wider text-[11px] ${
                  isDarkMode ? 'bg-slate-950/60 border-slate-800 text-slate-400' : 'bg-slate-50 border-slate-200 text-slate-500'
                }`}>
                  <th className="py-4 px-5">PO Number</th>
                  <th className="py-4 px-5">Supplier Name</th>
                  <th className="py-4 px-5">Order Date</th>
                  <th className="py-4 px-5">Exp. Delivery</th>
                  <th className="py-4 px-5 text-right">Total Amount</th>
                  <th className="py-4 px-5 text-center">Approval</th>
                  <th className="py-4 px-5 text-center">Status</th>
                  <th className="py-4 px-5 text-center">Governance Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800/60">
                {purchaseOrders.map(po => (
                  <tr key={po.id || po.poNo} className={isDarkMode ? 'hover:bg-slate-800/50' : 'hover:bg-slate-50'}>
                    <td className="py-4 px-5 font-bold font-mono text-[#5B75F8] dark:text-[#7B92FF]">{po.poNo}</td>
                    <td className={`py-4 px-5 font-semibold ${isDarkMode ? 'text-slate-100' : 'text-slate-800'}`}>
                      <div>{po.supplierName}</div>
                      <div className="text-[10px] text-slate-500 font-mono">{po.supplierCode}</div>
                    </td>
                    <td className="py-4 px-5 font-mono text-slate-400">{po.orderDate}</td>
                    <td className="py-4 px-5 font-mono text-slate-300">{po.expectedDeliveryDate}</td>
                    <td className="py-4 px-5 text-right font-mono font-bold text-emerald-400">
                      ₹{po.totalAmount.toLocaleString()}
                    </td>
                    <td className="py-4 px-5 text-center">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-[10px] font-mono font-bold uppercase border ${
                        po.approvalStatus === 'APPROVED'
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                          : po.approvalStatus === 'REJECTED'
                          ? 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                          : 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                      }`}>
                        {po.approvalStatus}
                      </span>
                    </td>
                    <td className="py-4 px-5 text-center">
                      <span className="inline-flex items-center px-2.5 py-1 rounded-xl text-[10px] font-mono font-bold uppercase bg-slate-800 text-slate-300 border border-slate-700">
                        {po.status}
                      </span>
                    </td>
                    <td className="py-4 px-5 text-center">
                      {po.approvalStatus === 'PENDING' ? (
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => handlePoApproval(po.id || po.poNo, 'APPROVE')}
                            className="px-2.5 py-1 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 text-[11px] font-mono font-bold cursor-pointer"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => handlePoApproval(po.id || po.poNo, 'REJECT')}
                            className="px-2.5 py-1 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 text-[11px] font-mono font-bold cursor-pointer"
                          >
                            Reject
                          </button>
                        </div>
                      ) : (
                        <span className="text-[11px] font-mono text-slate-500">
                          {po.approvedBy ? `By ${po.approvedBy.split(' ')[0]}` : '—'}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 4. Goods Receipt Notes (GRN) Sub-View */}
      {subTab === 'grn' && (
        <div className={`rounded-3xl border overflow-hidden transition-all shadow-xl ${
          isDarkMode ? 'bg-slate-900/80 border-slate-800/80 backdrop-blur-xl' : 'bg-white border-slate-200'
        }`}>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className={`border-b font-mono font-bold uppercase tracking-wider text-[11px] ${
                  isDarkMode ? 'bg-slate-950/60 border-slate-800 text-slate-400' : 'bg-slate-50 border-slate-200 text-slate-500'
                }`}>
                  <th className="py-4 px-5">GRN Number</th>
                  <th className="py-4 px-5">PO Reference</th>
                  <th className="py-4 px-5">Vendor</th>
                  <th className="py-4 px-5">Challan / Vehicle</th>
                  <th className="py-4 px-5">Received Date</th>
                  <th className="py-4 px-5 text-center">QC Status</th>
                  <th className="py-4 px-5 text-center">Gate Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800/60">
                {grnList.map(g => (
                  <tr key={g.id || g.grnNo} className={isDarkMode ? 'hover:bg-slate-800/50' : 'hover:bg-slate-50'}>
                    <td className="py-4 px-5 font-bold font-mono text-[#5B75F8] dark:text-[#7B92FF]">{g.grnNo}</td>
                    <td className="py-4 px-5 font-mono text-slate-300">{g.poNo}</td>
                    <td className={`py-4 px-5 font-semibold ${isDarkMode ? 'text-slate-100' : 'text-slate-800'}`}>{g.vendorName}</td>
                    <td className="py-4 px-5 font-mono text-slate-400">
                      <div>{g.challanNo}</div>
                      <div className="text-[10px] text-slate-500">{g.vehicleNo || 'Courier'}</div>
                    </td>
                    <td className="py-4 px-5 font-mono text-slate-300">{g.receivedDate}</td>
                    <td className="py-4 px-5 text-center">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-[10px] font-mono font-bold uppercase border ${
                        g.status === 'QC_VERIFIED'
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                          : g.status === 'REJECTED'
                          ? 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                          : 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                      }`}>
                        {g.status}
                      </span>
                    </td>
                    <td className="py-4 px-5 text-center">
                      {g.status === 'RECEIVED' ? (
                        <button
                          onClick={() => handleGrnStatusChange(g.id || g.grnNo, 'QC_VERIFIED')}
                          className="px-3 py-1.5 rounded-xl bg-[#5B75F8]/20 hover:bg-[#5B75F8]/30 text-[#7B92FF] border border-[#5B75F8]/40 text-xs font-mono font-bold cursor-pointer transition-all"
                        >
                          QC Verify
                        </button>
                      ) : (
                        <span className="text-[11px] font-mono text-slate-500">Verified</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 5. Append-Only Inventory Movements Ledger Sub-View */}
      {subTab === 'movements' && (
        <div className="space-y-4">
          {/* Security & Immutability Badge Banner */}
          <div className={`p-4 rounded-3xl border flex items-center justify-between gap-4 ${
            isDarkMode ? 'bg-slate-900/80 border-slate-800/80 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
          }`}>
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-2xl bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-xs">Append-Only Inventory Ledger (Single Source of Truth)</h4>
                <p className="text-[11px] text-slate-400 font-mono">
                  Stock is calculated as the sum of immutable movement entries. Updates/deletions are locked at the database trigger level.
                </p>
              </div>
            </div>

            {/* Filter Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
              {['ALL', 'OPENING_BALANCE', 'GRN', 'PRODUCTION_CONSUMPTION', 'PRODUCTION_OUTPUT', 'DISPATCH', 'ADJUSTMENT', 'CORRECTION'].map(t => (
                <button
                  key={t}
                  onClick={() => setMovementTypeFilter(t)}
                  className={`px-2.5 py-1 rounded-xl text-[10px] font-mono font-bold transition-all cursor-pointer whitespace-nowrap ${
                    movementTypeFilter === t
                      ? 'bg-[#5B75F8] text-white shadow-xs'
                      : isDarkMode ? 'bg-slate-800/80 text-slate-400 hover:text-white' : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                  }`}
                >
                  {t.replace('_', ' ')}
                </button>
              ))}
            </div>
          </div>

          <div className={`rounded-3xl border overflow-hidden transition-all shadow-xl ${
            isDarkMode ? 'bg-slate-900/80 border-slate-800/80 backdrop-blur-xl' : 'bg-white border-slate-200'
          }`}>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse font-mono">
                <thead>
                  <tr className={`border-b font-bold uppercase tracking-wider text-[10px] ${
                    isDarkMode ? 'bg-slate-950/60 border-slate-800 text-slate-400' : 'bg-slate-50 border-slate-200 text-slate-500'
                  }`}>
                    <th className="py-3.5 px-4">Timestamp</th>
                    <th className="py-3.5 px-4">Part Code</th>
                    <th className="py-3.5 px-4">Movement Type</th>
                    <th className="py-3.5 px-4 text-right">Qty Delta</th>
                    <th className="py-3.5 px-4 text-right">Balance After</th>
                    <th className="py-3.5 px-4">Reference Doc</th>
                    <th className="py-3.5 px-4">Actor</th>
                    <th className="py-3.5 px-4">Notes</th>
                    <th className="py-3.5 px-4 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800/60">
                  {movements
                    .filter(m => movementTypeFilter === 'ALL' || m.movementType === movementTypeFilter)
                    .filter(m => !searchQuery || m.itemCode.toLowerCase().includes(searchQuery.toLowerCase()) || m.referenceId?.toLowerCase().includes(searchQuery.toLowerCase()))
                    .map((mov) => {
                      const isInbound = mov.quantityChange > 0;
                      const isCorrection = mov.movementType === 'CORRECTION';
                      const isAdjustment = mov.movementType === 'ADJUSTMENT';

                      return (
                        <tr key={mov.id} className={isDarkMode ? 'hover:bg-slate-800/50' : 'hover:bg-slate-50'}>
                          <td className="py-3 px-4 text-slate-400 text-[11px]">
                            {new Date(mov.createdAt).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                          </td>
                          <td className="py-3 px-4 font-bold text-[#5B75F8] dark:text-[#7B92FF]">
                            {mov.itemCode}
                          </td>
                          <td className="py-3 px-4">
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[9px] font-bold uppercase border ${
                              isCorrection
                                ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                                : isAdjustment
                                  ? 'bg-blue-500/10 text-blue-400 border-blue-500/30'
                                  : isInbound
                                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                                    : 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                            }`}>
                              {mov.movementType}
                            </span>
                          </td>
                          <td className={`py-3 px-4 text-right font-bold text-xs ${
                            isCorrection
                              ? 'text-amber-400'
                              : isInbound ? 'text-emerald-400' : 'text-rose-400'
                          }`}>
                            {isInbound ? `+${mov.quantityChange}` : mov.quantityChange}
                          </td>
                          <td className={`py-3 px-4 text-right font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                            {mov.balanceAfter}
                          </td>
                          <td className="py-3 px-4 text-slate-300">
                            {mov.referenceId ? (
                              <span className="px-2 py-0.5 rounded bg-slate-800 text-[10px] text-slate-300 border border-slate-700">
                                {mov.referenceId}
                              </span>
                            ) : (
                              <span className="text-slate-500">—</span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-slate-400 text-[11px] truncate max-w-[140px]" title={mov.actorEmail}>
                            {mov.actorEmail}
                          </td>
                          <td className="py-3 px-4 text-slate-400 text-[11px] truncate max-w-[200px]" title={mov.notes || ''}>
                            {mov.notes || '—'}
                          </td>
                          <td className="py-3 px-4 text-center">
                            {mov.movementType !== 'CORRECTION' && (
                              <button
                                onClick={() => {
                                  setSelectedMovementForCorrection(mov);
                                  setCorrectionReason(`Offset error in movement ${mov.id}`);
                                }}
                                title="Record Offset Reversal Movement"
                                className="px-2 py-1 rounded-lg text-[10px] font-bold bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 border border-amber-500/30 cursor-pointer"
                              >
                                Reversal
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  {movements.length === 0 && (
                    <tr>
                      <td colSpan={9} className="py-8 text-center text-slate-500">
                        No ledger movements recorded yet. Movements automatically generate from GRNs, Job Cards, and Dispatches.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 6. Stock Reconciliation & Discrepancy Audit Sub-View */}
      {subTab === 'reconciliation' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className={`p-4 rounded-3xl border ${isDarkMode ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200'}`}>
              <div className="text-xs text-slate-400 font-mono">Audited Items</div>
              <div className="text-2xl font-bold font-mono mt-1 text-[#5B75F8]">{reconciliationReport.length}</div>
            </div>
            <div className={`p-4 rounded-3xl border ${isDarkMode ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200'}`}>
              <div className="text-xs text-slate-400 font-mono">100% Ledger Matched</div>
              <div className="text-2xl font-bold font-mono mt-1 text-emerald-400">
                {reconciliationReport.filter(r => r.status === 'MATCHED').length}
              </div>
            </div>
            <div className={`p-4 rounded-3xl border ${isDarkMode ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200'}`}>
              <div className="text-xs text-slate-400 font-mono">Discrepancies Flagged</div>
              <div className="text-2xl font-bold font-mono mt-1 text-rose-400">
                {reconciliationReport.filter(r => r.status === 'DISCREPANCY').length}
              </div>
            </div>
          </div>

          <div className={`rounded-3xl border overflow-hidden transition-all shadow-xl ${
            isDarkMode ? 'bg-slate-900/80 border-slate-800/80 backdrop-blur-xl' : 'bg-white border-slate-200'
          }`}>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse font-mono">
                <thead>
                  <tr className={`border-b font-bold uppercase tracking-wider text-[10px] ${
                    isDarkMode ? 'bg-slate-950/60 border-slate-800 text-slate-400' : 'bg-slate-50 border-slate-200 text-slate-500'
                  }`}>
                    <th className="py-3.5 px-5">Part Code</th>
                    <th className="py-3.5 px-5">Description</th>
                    <th className="py-3.5 px-5 text-right">Ledger Derived Sum</th>
                    <th className="py-3.5 px-5 text-right">Physical / Cache Count</th>
                    <th className="py-3.5 px-5 text-right">Discrepancy (Δ)</th>
                    <th className="py-3.5 px-5 text-center">Status</th>
                    <th className="py-3.5 px-5 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800/60">
                  {reconciliationReport.map((rec) => {
                    const isDiscrepancy = rec.status === 'DISCREPANCY';
                    return (
                      <tr key={rec.itemCode} className={isDarkMode ? 'hover:bg-slate-800/50' : 'hover:bg-slate-50'}>
                        <td className="py-4 px-5 font-bold text-[#5B75F8] dark:text-[#7B92FF]">{rec.itemCode}</td>
                        <td className="py-4 px-5 text-slate-200 font-sans font-medium">{rec.description}</td>
                        <td className="py-4 px-5 text-right font-bold text-emerald-400">{rec.ledgerBalance}</td>
                        <td className={`py-4 px-5 text-right font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{rec.cachedOnHand}</td>
                        <td className={`py-4 px-5 text-right font-bold ${isDiscrepancy ? 'text-rose-400' : 'text-emerald-400'}`}>
                          {rec.discrepancy > 0 ? `+${rec.discrepancy}` : rec.discrepancy}
                        </td>
                        <td className="py-4 px-5 text-center">
                          <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-[10px] font-bold uppercase border ${
                            isDiscrepancy
                              ? 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                              : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                          }`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${isDiscrepancy ? 'bg-rose-500' : 'bg-emerald-500'}`} />
                            <span>{rec.status}</span>
                          </span>
                        </td>
                        <td className="py-4 px-5 text-center">
                          <button
                            onClick={() => {
                              onAdjustStock(rec.itemCode, rec.discrepancy, 'Reconciliation Correction');
                            }}
                            className={`px-3 py-1.5 rounded-xl font-mono text-xs font-bold transition-all cursor-pointer ${
                              isDarkMode ? 'bg-[#5B75F8]/10 text-[#7B92FF] hover:bg-[#5B75F8]/20 border border-[#5B75F8]/30' : 'bg-[#5B75F8]/10 text-[#5B75F8] hover:bg-[#5B75F8]/20 border border-[#5B75F8]/20'
                            }`}
                          >
                            Reconcile
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
      )}

      {/* Adjust Stock Modal */}
      {selectedStockForAdjust && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md font-sans">
          <div className={`relative w-full max-w-lg rounded-3xl border p-7 space-y-6 shadow-2xl transition-all ${
            isDarkMode 
              ? 'bg-slate-900/95 border-slate-800/80 text-white backdrop-blur-2xl shadow-[#5B75F8]/5' 
              : 'bg-white border-slate-200 text-slate-900 shadow-2xl'
          }`}>
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800/80 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-2xl bg-[#5B75F8]/15 text-[#5B75F8] border border-[#5B75F8]/30">
                  <Boxes className="w-5 h-5" />
                </div>
                <div>
                  <h3 className={`font-bold text-base tracking-tight ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                    Physical Stock Audit Adjustment
                  </h3>
                  <p className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                    Reconcile physical store inventory delta
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setSelectedStockForAdjust(null)} 
                className={`p-2 rounded-2xl border transition-all cursor-pointer ${
                  isDarkMode 
                    ? 'border-slate-800 bg-slate-950/60 text-slate-400 hover:text-white hover:bg-slate-800' 
                    : 'border-slate-200 bg-slate-50 text-slate-500 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAdjustSubmit} className="space-y-4">
              <div>
                <label className="block text-[11px] font-mono uppercase font-bold text-slate-400 mb-1.5">
                  Target SKU / Material Component *
                </label>
                <select
                  value={selectedStockForAdjust.code}
                  onChange={(e) => {
                    const found = stockMasterRows.find(s => s.code === e.target.value);
                    if (found) setSelectedStockForAdjust(found);
                  }}
                  className={`w-full rounded-2xl border px-4 py-3 text-xs font-mono font-bold outline-none transition-all cursor-pointer ${
                    isDarkMode 
                      ? 'bg-slate-950/80 border-slate-800 text-[#7B92FF] focus:border-[#5B75F8]' 
                      : 'bg-slate-50 border-slate-200 text-[#5B75F8] focus:border-[#5B75F8]'
                  }`}
                >
                  {stockMasterRows.map((s) => (
                    <option key={s.code} value={s.code} className={isDarkMode ? 'bg-slate-900 text-white' : 'bg-white text-slate-900'}>
                      {s.code} — {s.description} ({s.onHand} {s.unit || 'units'} on hand)
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-mono uppercase font-bold text-slate-400 mb-1.5">Current On Hand</label>
                  <div className={`p-3 rounded-2xl border font-mono font-bold text-xs ${
                    isDarkMode ? 'bg-slate-950/80 border-slate-800 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                  }`}>
                    {selectedStockForAdjust.onHand} {selectedStockForAdjust.unit}
                  </div>
                </div>
                <div>
                  <label className="block text-[11px] font-mono uppercase font-bold text-slate-400 mb-1.5">Adjustment Delta (+/-)</label>
                  <input
                    type="number"
                    required
                    value={adjustQty}
                    onChange={(e) => setAdjustQty(Number(e.target.value))}
                    className={`w-full rounded-2xl border px-4 py-3 text-xs font-mono font-bold outline-none transition-all ${
                      isDarkMode 
                        ? 'bg-slate-950/80 border-slate-800 text-white focus:border-[#5B75F8]' 
                        : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-[#5B75F8]'
                    }`}
                    placeholder="e.g. +10 or -5"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-mono uppercase font-bold text-slate-400 mb-1.5">Audit Reason *</label>
                <input
                  type="text"
                  required
                  value={adjustReason}
                  onChange={(e) => setAdjustReason(e.target.value)}
                  className={`w-full rounded-2xl border px-4 py-3 text-xs outline-none transition-all ${
                    isDarkMode 
                      ? 'bg-slate-950/80 border-slate-800 text-white focus:border-[#5B75F8]' 
                      : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-[#5B75F8]'
                  }`}
                  placeholder="e.g. Physical count reconciliation"
                />
              </div>

              <div className="pt-4 border-t border-slate-200 dark:border-slate-800/80 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setSelectedStockForAdjust(null)}
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
                  Confirm Adjustment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Create Purchase Order */}
      {isCreatePoOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md font-sans">
          <div className="relative w-full max-w-xl rounded-3xl border border-slate-800 bg-slate-900/95 p-7 space-y-6 text-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-2xl bg-[#5B75F8]/15 text-[#7B92FF] border border-[#5B75F8]/30">
                  <ShoppingCart className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base">Issue Purchase Order</h3>
                  <p className="text-xs text-slate-400">Raise procurement order to supplier</p>
                </div>
              </div>
              <button onClick={() => setIsCreatePoOpen(false)} className="p-2 rounded-2xl border border-slate-800 text-slate-400 hover:text-white"><X className="w-4 h-4" /></button>
            </div>

            <form onSubmit={async (e) => {
              e.preventDefault();
              const form = e.target as any;
              const newPo: PurchaseOrder = {
                poNo: `PO-PUR-${Date.now().toString().slice(-6)}`,
                supplierCode: form.supplierCode.value,
                supplierName: form.supplierName.value,
                orderDate: new Date().toISOString().split('T')[0],
                expectedDeliveryDate: form.deliveryDate.value,
                paymentTerms: 'Net 30',
                taxRate: 18.0,
                grossAmount: Number(form.qty.value) * Number(form.rate.value),
                taxAmount: (Number(form.qty.value) * Number(form.rate.value)) * 0.18,
                totalAmount: (Number(form.qty.value) * Number(form.rate.value)) * 1.18,
                status: 'DRAFT',
                approvalStatus: (Number(form.qty.value) * Number(form.rate.value)) * 1.18 > 100000 ? 'PENDING' : 'APPROVED',
                createdBy: user?.name || 'Owner OS Admin',
                notes: form.notes.value,
                items: [{
                  itemCode: form.itemCode.value,
                  itemDescription: form.itemDesc.value,
                  orderQty: Number(form.qty.value),
                  receivedQty: 0,
                  unit: form.unit.value,
                  unitPrice: Number(form.rate.value),
                  lineTotal: Number(form.qty.value) * Number(form.rate.value)
                }]
              };

              try {
                await insertPurchaseOrder(newPo);
                setIsCreatePoOpen(false);
                setActionSuccess('Purchase order created successfully.');
                const updated = await fetchPurchaseOrders();
                setPurchaseOrders(updated);
              } catch (err: any) {
                setActionError(err.message || 'Failed to create PO.');
              }
            }} className="space-y-4 text-xs font-mono">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Supplier Code</label>
                  <input name="supplierCode" required defaultValue="VEND-001" className="w-full rounded-xl border border-slate-800 bg-slate-950 p-2.5 text-white outline-none" />
                </div>
                <div>
                  <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Supplier Name</label>
                  <input name="supplierName" required defaultValue="Mahalaxmi Steel Traders" className="w-full rounded-xl border border-slate-800 bg-slate-950 p-2.5 text-white outline-none" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Item Code / SKU</label>
                  <input name="itemCode" required defaultValue="RAW-ALU-6061-ROD" className="w-full rounded-xl border border-slate-800 bg-slate-950 p-2.5 text-white outline-none" />
                </div>
                <div>
                  <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Item Description</label>
                  <input name="itemDesc" required defaultValue="Aluminium 6061 Round Bar Ø50mm" className="w-full rounded-xl border border-slate-800 bg-slate-950 p-2.5 text-white outline-none" />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Order Qty</label>
                  <input name="qty" type="number" required defaultValue="100" className="w-full rounded-xl border border-slate-800 bg-slate-950 p-2.5 text-white outline-none" />
                </div>
                <div>
                  <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Unit</label>
                  <input name="unit" required defaultValue="KG" className="w-full rounded-xl border border-slate-800 bg-slate-950 p-2.5 text-white outline-none" />
                </div>
                <div>
                  <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Unit Rate (₹)</label>
                  <input name="rate" type="number" required defaultValue="280" className="w-full rounded-xl border border-slate-800 bg-slate-950 p-2.5 text-white outline-none" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Exp Delivery Date</label>
                  <input name="deliveryDate" type="date" required defaultValue="2026-08-30" className="w-full rounded-xl border border-slate-800 bg-slate-950 p-2.5 text-white outline-none" />
                </div>
                <div>
                  <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Notes</label>
                  <input name="notes" defaultValue="Standard factory delivery" className="w-full rounded-xl border border-slate-800 bg-slate-950 p-2.5 text-white outline-none" />
                </div>
              </div>

              <div className="pt-4 border-t border-slate-800 flex justify-end gap-3 font-sans">
                <button type="button" onClick={() => setIsCreatePoOpen(false)} className="px-4 py-2 rounded-xl border border-slate-800 text-slate-300">Cancel</button>
                <button type="submit" className="px-5 py-2 rounded-xl bg-[#5B75F8] hover:bg-[#4A64E7] text-white font-bold">Issue PO</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Receive Material (GRN) */}
      {isCreateGrnOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md font-sans">
          <div className="relative w-full max-w-xl rounded-3xl border border-slate-800 bg-slate-900/95 p-7 space-y-6 text-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-2xl bg-[#5B75F8]/15 text-[#7B92FF] border border-[#5B75F8]/30">
                  <Truck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base">Inward Goods Receipt (GRN)</h3>
                  <p className="text-xs text-slate-400">Receive supplier material at gate</p>
                </div>
              </div>
              <button onClick={() => setIsCreateGrnOpen(false)} className="p-2 rounded-2xl border border-slate-800 text-slate-400 hover:text-white"><X className="w-4 h-4" /></button>
            </div>

            <form onSubmit={async (e) => {
              e.preventDefault();
              const form = e.target as any;
              const newGrn: GoodsReceiptNote = {
                grnNo: `GRN-26-${Date.now().toString().slice(-4)}`,
                poNo: form.poNo.value,
                vendorCode: form.vendorCode.value,
                vendorName: form.vendorName.value,
                challanNo: form.challanNo.value,
                challanDate: new Date().toISOString().split('T')[0],
                receivedDate: new Date().toISOString().split('T')[0],
                receivedBy: user?.name || 'Gate Inward Officer',
                status: 'RECEIVED',
                vehicleNo: form.vehicleNo.value,
                remarks: form.remarks.value,
                items: [{
                  itemCode: form.itemCode.value,
                  itemDescription: form.itemDesc.value,
                  orderedQty: Number(form.qty.value),
                  receivedQty: Number(form.qty.value),
                  acceptedQty: Number(form.qty.value),
                  rejectedQty: 0,
                  unit: form.unit.value,
                  unitRate: 280
                }]
              };

              try {
                await insertGrn(newGrn);
                setIsCreateGrnOpen(false);
                setActionSuccess('GRN logged successfully at gate.');
                const updated = await fetchGrnList();
                setGrnList(updated);
              } catch (err: any) {
                setActionError(err.message || 'Failed to log GRN.');
              }
            }} className="space-y-4 text-xs font-mono">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">PO Reference</label>
                  <input name="poNo" required defaultValue="PO-PUR-2026-001" className="w-full rounded-xl border border-slate-800 bg-slate-950 p-2.5 text-white outline-none" />
                </div>
                <div>
                  <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Challan No / Invoice</label>
                  <input name="challanNo" required defaultValue="CH-GATE-4401" className="w-full rounded-xl border border-slate-800 bg-slate-950 p-2.5 text-white outline-none" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Vendor Code</label>
                  <input name="vendorCode" required defaultValue="VEND-001" className="w-full rounded-xl border border-slate-800 bg-slate-950 p-2.5 text-white outline-none" />
                </div>
                <div>
                  <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Vendor Name</label>
                  <input name="vendorName" required defaultValue="Mahalaxmi Steel Traders" className="w-full rounded-xl border border-slate-800 bg-slate-950 p-2.5 text-white outline-none" />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Item SKU</label>
                  <input name="itemCode" required defaultValue="RAW-ALU-6061-ROD" className="w-full rounded-xl border border-slate-800 bg-slate-950 p-2.5 text-white outline-none" />
                </div>
                <div>
                  <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Item Desc</label>
                  <input name="itemDesc" required defaultValue="Aluminium 6061 Round Bar" className="w-full rounded-xl border border-slate-800 bg-slate-950 p-2.5 text-white outline-none" />
                </div>
                <div>
                  <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Received Qty</label>
                  <input name="qty" type="number" required defaultValue="100" className="w-full rounded-xl border border-slate-800 bg-slate-950 p-2.5 text-white outline-none" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Vehicle / Transporter</label>
                  <input name="vehicleNo" defaultValue="GJ-03-AX-8910" className="w-full rounded-xl border border-slate-800 bg-slate-950 p-2.5 text-white outline-none" />
                </div>
                <div>
                  <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Unit</label>
                  <input name="unit" defaultValue="KG" className="w-full rounded-xl border border-slate-800 bg-slate-950 p-2.5 text-white outline-none" />
                </div>
              </div>

              <div>
                <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Gate Inspection Remarks</label>
                <input name="remarks" defaultValue="Material physically verified against MTC." className="w-full rounded-xl border border-slate-800 bg-slate-950 p-2.5 text-white outline-none" />
              </div>

              <div className="pt-4 border-t border-slate-800 flex justify-end gap-3 font-sans">
                <button type="button" onClick={() => setIsCreateGrnOpen(false)} className="px-4 py-2 rounded-xl border border-slate-800 text-slate-300">Cancel</button>
                <button type="submit" className="px-5 py-2 rounded-xl bg-[#5B75F8] hover:bg-[#4A64E7] text-white font-bold">Log GRN Inward</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Item Stock Movement History (Chronological Ledger) */}
      {selectedItemHistory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-md font-sans">
          <div className={`relative w-full max-w-3xl rounded-3xl border p-7 space-y-6 shadow-2xl transition-all ${
            isDarkMode 
              ? 'bg-slate-900/95 border-slate-800/80 text-white backdrop-blur-2xl' 
              : 'bg-white border-slate-200 text-slate-900 shadow-2xl'
          }`}>
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800/80 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-2xl bg-[#5B75F8]/15 text-[#7B92FF] border border-[#5B75F8]/30">
                  <History className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base font-mono">
                    Stock Movement History — {selectedItemHistory.itemCode}
                  </h3>
                  <p className="text-xs text-slate-400">
                    {selectedItemHistory.description || 'Precision Engineered Component'} • Chronological Running Balance
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setSelectedItemHistory(null)} 
                className="p-2 rounded-2xl border border-slate-800 text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="max-h-[60vh] overflow-y-auto space-y-2 pr-1 font-mono text-xs">
              {selectedItemHistory.history.map((h) => {
                const isInbound = h.quantityChange > 0;
                const isCorrection = h.movementType === 'CORRECTION';
                const isAdjustment = h.movementType === 'ADJUSTMENT';

                return (
                  <div 
                    key={h.id}
                    className={`p-3.5 rounded-2xl border flex items-center justify-between gap-3 ${
                      isDarkMode ? 'bg-slate-950/70 border-slate-800/80' : 'bg-slate-50 border-slate-200'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-xl border text-[10px] font-bold uppercase ${
                        isCorrection 
                          ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                          : isAdjustment
                            ? 'bg-blue-500/10 text-blue-400 border-blue-500/30'
                            : isInbound
                              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                              : 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                      }`}>
                        {h.movementType}
                      </div>
                      <div>
                        <div className="font-bold text-slate-200 flex items-center gap-2">
                          <span className={isInbound ? 'text-emerald-400' : 'text-rose-400'}>
                            {isInbound ? `+${h.quantityChange}` : h.quantityChange}
                          </span>
                          {h.referenceId && (
                            <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                              Ref: {h.referenceId}
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-400 mt-0.5">
                          {h.notes || 'Ledger event recorded'} • <span className="text-slate-500">{h.actorEmail}</span>
                        </div>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="text-[10px] text-slate-500 uppercase font-bold">Running Balance</div>
                      <div className="text-sm font-bold text-white mt-0.5">{h.balanceAfter} Units</div>
                      <div className="text-[10px] text-slate-500 mt-0.5">
                        {new Date(h.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                  </div>
                );
              })}

              {selectedItemHistory.history.length === 0 && (
                <div className="p-8 text-center text-slate-500">
                  No historical movements found for this SKU.
                </div>
              )}
            </div>

            <div className="pt-4 border-t border-slate-800 flex justify-end">
              <button 
                onClick={() => setSelectedItemHistory(null)}
                className="px-5 py-2 rounded-xl bg-slate-800 text-white font-bold text-xs cursor-pointer hover:bg-slate-700"
              >
                Close Ledger
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Reverse / Correct Movement */}
      {selectedMovementForCorrection && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-md font-sans">
          <div className="relative w-full max-w-md rounded-3xl border border-slate-800 bg-slate-900/95 p-7 space-y-6 text-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-2xl bg-amber-500/15 text-amber-400 border border-amber-500/30">
                  <RotateCcw className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base">Append Correction Movement</h3>
                  <p className="text-xs text-slate-400">Offset target movement without mutating history</p>
                </div>
              </div>
              <button onClick={() => setSelectedMovementForCorrection(null)} className="p-2 rounded-2xl border border-slate-800 text-slate-400 hover:text-white cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleReverseMovement} className="space-y-4 font-mono text-xs">
              <div className="p-3 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-1.5">
                <div className="text-[10px] text-slate-400 uppercase font-bold">Target Movement</div>
                <div className="text-slate-200 font-bold">{selectedMovementForCorrection.id} ({selectedMovementForCorrection.itemCode})</div>
                <div className="text-amber-400 text-[11px]">
                  Original: {selectedMovementForCorrection.quantityChange > 0 ? `+${selectedMovementForCorrection.quantityChange}` : selectedMovementForCorrection.quantityChange} • Offset: {-selectedMovementForCorrection.quantityChange > 0 ? `+${-selectedMovementForCorrection.quantityChange}` : -selectedMovementForCorrection.quantityChange}
                </div>
              </div>

              <div>
                <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Reason for Reversal / Correction *</label>
                <input 
                  type="text" 
                  required 
                  value={correctionReason} 
                  onChange={(e) => setCorrectionReason(e.target.value)}
                  placeholder="e.g. Inward counting error or damaged box returned"
                  className="w-full rounded-xl border border-slate-800 bg-slate-950 p-2.5 text-white outline-none"
                />
              </div>

              <div className="pt-4 border-t border-slate-800 flex justify-end gap-3 font-sans">
                <button type="button" onClick={() => setSelectedMovementForCorrection(null)} className="px-4 py-2 rounded-xl border border-slate-800 text-slate-300 cursor-pointer">Cancel</button>
                <button type="submit" className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold cursor-pointer">
                  Append Correction
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default InventoryView;
