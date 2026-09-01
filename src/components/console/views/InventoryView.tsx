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
  INVENTORY_CATEGORIES,
  InventoryCategoryKey,
  resolveInventoryPartCodes
} from '../../../utils/inventoryCategorization';
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
import { Modal } from '../../common/Modal';
import { useUrlModal } from '../../../hooks/useUrlModal';
import { evaluateGrnMismatch, evaluatePoAging } from '../../../utils/procurementEngine';

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
  const [selectedCategory, setSelectedCategory] = useState<InventoryCategoryKey>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // URL-driven modals
  const adjustStockModal = useUrlModal('adjust-stock');
  const createPoModal = useUrlModal('create-po');
  const createGrnModal = useUrlModal('create-grn');
  const itemHistoryModal = useUrlModal('item-history');
  const correctMovementModal = useUrlModal('correct-movement');

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
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  const overduePoCount = useMemo(() => {
    return purchaseOrders.filter(po => evaluatePoAging(po).isOverdue).length;
  }, [purchaseOrders]);

  const loadModuleData = async () => {
    setIsLoadingModuleData(true);
    try {
      if (subTab === 'purchases') {
        const data = await fetchPurchaseOrders();
        setPurchaseOrders(Array.isArray(data) ? data : []);
      } else if (subTab === 'grn') {
        const data = await fetchGrnList();
        setGrnList(Array.isArray(data) ? data : []);
      } else if (subTab === 'movements') {
        const data = await fetchInventoryMovements();
        const list = Array.isArray(data) ? data : (data as any)?.movements || [];
        setMovements(Array.isArray(list) ? list : []);
      } else if (subTab === 'reconciliation') {
        const data = await fetchStockReconciliation();
        setReconciliationReport(Array.isArray(data) ? data : []);
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
      const targetCode = stk.rawCode || stk.code;
      const history = await fetchItemStockHistory(targetCode);
      setSelectedItemHistory({
        itemCode: stk.code,
        description: stk.description,
        history
      });
      itemHistoryModal.open({ itemId: stk.code });
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
      correctMovementModal.close();
      loadModuleData();
    } catch (err: any) {
      setActionError(err.message || 'Failed to append correction movement');
    }
  };

  // Resolved part codes & structured categories mapping for all stock and master items
  const resolvedCodeMap = useMemo(() => {
    const allInputItems = [
      ...masters.map(m => ({
        code: m.code,
        name: m.name,
        description: m.description,
        itemType: m.itemType,
        category: m.category,
        storeLocation: m.storeLocation,
        isFinishedGoods: m.isFinishedGoods,
        partNo: m.partNo
      })),
      ...stock.map(s => ({
        code: s.code,
        description: s.description,
        storeLocation: s.storeLocation,
        partNo: s.partNo
      }))
    ];
    return resolveInventoryPartCodes(allInputItems);
  }, [masters, stock]);

  // Stock Master = full Item Catalog LEFT JOINed with live stock levels.
  // Each item gets persistent category-based sequential part code and structured category data.
  const stockMasterRows = useMemo<StockItem[]>(() => {
    const byCode = new Map<string, StockItem>(stock.map(s => [s.code, s] as [string, StockItem]));
    const rows: StockItem[] = [];

    for (const item of masters) {
      const resolved = resolvedCodeMap.get(item.code) || {
        partCode: item.code,
        category: 'OTHER' as InventoryCategoryKey,
        rawCode: item.code
      };
      const catMeta = INVENTORY_CATEGORIES.find(c => c.key === resolved.category);
      const existing = byCode.get(item.code);

      if (existing) {
        rows.push({
          ...existing,
          code: resolved.partCode,
          partCode: resolved.partCode,
          rawCode: item.code,
          category: resolved.category,
          categoryLabel: catMeta?.label || 'Other',
          storeLocation: item.storeLocation || existing.storeLocation,
          partNo: item.partNo || existing.partNo,
          hsnCode: item.hsnCode || existing.hsnCode
        });
        byCode.delete(item.code);
      } else {
        rows.push({
          code: resolved.partCode,
          partCode: resolved.partCode,
          rawCode: item.code,
          description: item.name || item.description || item.partNo || 'Catalog Item',
          onHand: 0,
          reserved: 0,
          available: 0,
          demand: 0,
          reorderLevel: Number(item.reorderLevel ?? 0),
          shortage: 0,
          unit: item.unit || 'NOS',
          status: 'OK',
          category: resolved.category,
          categoryLabel: catMeta?.label || 'Other',
          storeLocation: item.storeLocation,
          partNo: item.partNo,
          hsnCode: item.hsnCode
        });
      }
    }

    for (const [code, existing] of byCode.entries()) {
      const resolved = resolvedCodeMap.get(code) || {
        partCode: code,
        category: 'OTHER' as InventoryCategoryKey,
        rawCode: code
      };
      const catMeta = INVENTORY_CATEGORIES.find(c => c.key === resolved.category);
      rows.push({
        ...existing,
        code: resolved.partCode,
        partCode: resolved.partCode,
        rawCode: code,
        category: resolved.category,
        categoryLabel: catMeta?.label || 'Other'
      });
    }

    return rows;
  }, [stock, masters, resolvedCodeMap]);

  // Telemetry counts by category
  const categoryCounts = useMemo(() => {
    const counts: Record<InventoryCategoryKey, number> = {
      ALL: stockMasterRows.length,
      RAW_MATERIAL: 0,
      FINISHED_GOODS: 0,
      CONSUMABLES: 0,
      TOOLS: 0,
      SPARE_PARTS: 0,
      OTHER: 0
    };
    for (const s of stockMasterRows) {
      const cat = (s.category as InventoryCategoryKey) || 'OTHER';
      if (counts[cat] !== undefined) {
        counts[cat]++;
      } else {
        counts.OTHER++;
      }
    }
    return counts;
  }, [stockMasterRows]);

  // Filtered stock based on selected category tab and search query
  const filteredStock = useMemo(() => {
    return stockMasterRows.filter(s => {
      const matchesCategory = selectedCategory === 'ALL' || s.category === selectedCategory;
      if (!matchesCategory) return false;

      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        s.code.toLowerCase().includes(q) ||
        (s.rawCode && s.rawCode.toLowerCase().includes(q)) ||
        (s.partNo && s.partNo.toLowerCase().includes(q)) ||
        (s.categoryLabel && s.categoryLabel.toLowerCase().includes(q)) ||
        s.description.toLowerCase().includes(q)
      );
    });
  }, [stockMasterRows, selectedCategory, searchQuery]);

  // Sync adjust modal from URL params if reloaded or deep linked
  useEffect(() => {
    if (adjustStockModal.isOpen && adjustStockModal.params.itemId) {
      const found = stockMasterRows.find(s => s.code === adjustStockModal.params.itemId || s.rawCode === adjustStockModal.params.itemId);
      if (found && (!selectedStockForAdjust || selectedStockForAdjust.code !== found.code)) {
        setSelectedStockForAdjust(found);
      }
    } else if (adjustStockModal.isOpen && !selectedStockForAdjust && stockMasterRows.length > 0) {
      setSelectedStockForAdjust(stockMasterRows[0]);
    }
  }, [adjustStockModal.isOpen, adjustStockModal.params.itemId, stockMasterRows, selectedStockForAdjust]);

  // Sync item history modal from URL
  useEffect(() => {
    if (itemHistoryModal.isOpen && itemHistoryModal.params.itemId && !selectedItemHistory) {
      const target = stockMasterRows.find(s => s.code === itemHistoryModal.params.itemId || s.rawCode === itemHistoryModal.params.itemId);
      if (target) {
        handleOpenItemHistory(target);
      }
    }
  }, [itemHistoryModal.isOpen, itemHistoryModal.params.itemId, selectedItemHistory, stockMasterRows]);

  // Sync correct movement modal from URL
  useEffect(() => {
    if (correctMovementModal.isOpen && correctMovementModal.params.movementId && !selectedMovementForCorrection) {
      const found = movements.find(m => m.id === correctMovementModal.params.movementId);
      if (found) {
        setSelectedMovementForCorrection(found);
        setCorrectionReason(`Offset error in movement ${found.id}`);
      }
    }
  }, [correctMovementModal.isOpen, correctMovementModal.params.movementId, selectedMovementForCorrection, movements]);

  const handleAdjustSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStockForAdjust) return;
    const newOnHand = Math.max(0, (Number(selectedStockForAdjust.onHand) || 0) + adjustQty);
    try {
      setActionError(null);
      const targetCode = selectedStockForAdjust.rawCode || selectedStockForAdjust.code;
      await onAdjustStock(targetCode, newOnHand, adjustReason);
      setActionSuccess(`Stock adjusted for ${selectedStockForAdjust.code} (${selectedStockForAdjust.description}) to ${newOnHand} ${selectedStockForAdjust.unit}`);
      setSelectedStockForAdjust(null);
      setAdjustQty(0);
      adjustStockModal.close();
    } catch (err: any) {
      setActionError(err?.message || 'Failed to adjust stock. Check your role permissions.');
    }
  };

  const renderCategoryBadge = (categoryKey?: string, categoryLabel?: string) => {
    const cat = INVENTORY_CATEGORIES.find(c => c.key === categoryKey) || INVENTORY_CATEGORIES[6];
    return (
      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-[10px] font-mono font-bold uppercase tracking-wider border ${
        isDarkMode 
          ? `${cat.badgeBgDark} ${cat.badgeTextDark} ${cat.badgeBorderDark}`
          : `${cat.badgeBgLight} ${cat.badgeTextLight} ${cat.badgeBorderLight}`
      }`}>
        <span className="w-1.5 h-1.5 rounded-full bg-current opacity-80" />
        <span>{categoryLabel || cat.label}</span>
      </span>
    );
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
    <div className="space-y-4 sm:space-y-6 font-sans select-none pb-4">

      {/* ========================================================================= */}
      {/* ── MOBILE-FIRST TOP HEADER & QUICK ACTION BAR (< md) ──                   */}
      {/* ========================================================================= */}
      <div className="block md:hidden space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400">
                Store & Material Telemetry
              </span>
            </div>
            <h1 className="text-xl font-black text-slate-900 dark:text-white tracking-tight leading-tight">
              Inventory & Stores ({stockMasterRows.length})
            </h1>
          </div>

          <div className="flex items-center gap-2">
            {subTab === 'stock' && (
              <button
                onClick={() => {
                  const target = stockMasterRows[0];
                  if (target) {
                    setSelectedStockForAdjust(target);
                    adjustStockModal.open({ itemId: target.code });
                  }
                }}
                className="min-h-[40px] px-3.5 py-2 rounded-xl bg-gradient-to-r from-[var(--accent-gradient-from)] to-[var(--accent-gradient-to)] text-white font-bold text-xs flex items-center gap-1.5 shadow-md cursor-pointer shrink-0 active:scale-[0.96] transition-transform font-mono"
              >
                <SlidersHorizontal className="w-3.5 h-3.5" />
                <span>Adjust</span>
              </button>
            )}
            {subTab === 'purchases' && (
              <button
                onClick={() => createPoModal.open()}
                className="min-h-[40px] px-3.5 py-2 rounded-xl bg-gradient-to-r from-[var(--accent-gradient-from)] to-[var(--accent-gradient-to)] text-white font-bold text-xs flex items-center gap-1.5 shadow-md cursor-pointer shrink-0 active:scale-[0.96] transition-transform font-mono"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>New PO</span>
              </button>
            )}
            {subTab === 'grn' && (
              <button
                onClick={() => createGrnModal.open()}
                className="min-h-[40px] px-3.5 py-2 rounded-xl bg-gradient-to-r from-[var(--accent-gradient-from)] to-[var(--accent-gradient-to)] text-white font-bold text-xs flex items-center gap-1.5 shadow-md cursor-pointer shrink-0 active:scale-[0.96] transition-transform font-mono"
              >
                <Truck className="w-3.5 h-3.5" />
                <span>GRN</span>
              </button>
            )}
          </div>
        </div>

        {/* Mobile 2x2 Executive KPI Strip */}
        <div className="grid grid-cols-2 gap-2">
          <div className={`p-3 rounded-2xl border ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
            <div className="text-[10px] font-bold uppercase text-slate-400 font-mono">Total SKUs</div>
            <div className="text-base font-black text-slate-900 dark:text-white tracking-tight mt-0.5">
              {stockMasterRows.length} Active Parts
            </div>
          </div>

          <div className={`p-3 rounded-2xl border ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
            <div className="text-[10px] font-bold uppercase text-slate-400 font-mono">On-Hand Qty</div>
            <div className="text-base font-black text-emerald-500 tracking-tight mt-0.5">
              {totalOnHand.toLocaleString()} Units
            </div>
          </div>

          <div className={`p-3 rounded-2xl border ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
            <div className="text-[10px] font-bold uppercase text-slate-400 font-mono">Shortage Items</div>
            <div className="text-base font-black text-rose-500 tracking-tight mt-0.5">
              {shortageCount} Deficit Alerts
            </div>
          </div>

          <div className={`p-3 rounded-2xl border ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
            <div className="text-[10px] font-bold uppercase text-slate-400 font-mono">Below Reorder</div>
            <div className="text-base font-black text-amber-500 tracking-tight mt-0.5">
              {reorderCount} Reorder Req
            </div>
          </div>
        </div>

        {/* Mobile Full-Width Search Input */}
        <div className={`flex items-center gap-2 px-3.5 py-2.5 rounded-2xl border text-xs min-h-[44px] ${
          isDarkMode ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
        }`}>
          <Search className="w-4 h-4 text-slate-400 shrink-0" />
          <input
            type="text"
            placeholder="Search Part Code, Description..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="bg-transparent outline-none w-full font-mono text-xs"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} className="text-slate-400 p-1">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Mobile Horizontal Sub-Tabs Filter Chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto py-1 no-scrollbar">
          {[
            { id: 'stock', label: `Stock (${stockMasterRows.length})` },
            { id: 'movements', label: 'Movements' },
            { id: 'reconciliation', label: 'Reconciliation' },
            { id: 'shortages', label: `Shortages (${shortageCount})` },
            { id: 'purchases', label: `POs (${purchaseOrders.length})` },
            { id: 'grn', label: `GRNs (${grnList.length})` },
          ].map((tab) => {
            const isSelected = subTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setSubTab(tab.id as any)}
                className={`min-h-[36px] px-3 py-1 rounded-xl text-xs font-bold font-mono shrink-0 transition-ui border cursor-pointer ${
                  isSelected
                    ? 'bg-[var(--accent-primary)] text-white shadow-xs border-transparent scale-105'
                    : isDarkMode
                      ? 'bg-slate-800/60 text-slate-400 border-slate-700/60'
                      : 'bg-slate-100 text-slate-600 border-slate-200'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Feedback Banners */}
      {actionSuccess && (
        <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex items-center justify-between">
          <span>{actionSuccess}</span>
          <button onClick={() => setActionSuccess(null)} className="cursor-pointer"><X className="w-4 h-4" /></button>
        </div>
      )}
      {actionError && (
        <div className="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center justify-between">
          <span>{actionError}</span>
          <button onClick={() => setActionError(null)} className="cursor-pointer"><X className="w-4 h-4" /></button>
        </div>
      )}

      {/* ========================================================================= */}
      {/* ── DESKTOP HEADER & KPI ROW (≥ md) ──                                      */}
      {/* ========================================================================= */}
      <div className="hidden md:block space-y-4">
        <section className={`overflow-hidden rounded-[24px] border ${isDarkMode ? 'border-white/[0.08] bg-[#121215]' : 'border-slate-200 bg-white shadow-[0_12px_36px_rgba(15,23,42,0.06)]'}`}>
          <div className="flex items-center justify-between gap-6 px-6 py-5">
            <div className="min-w-0">
              <div className="mb-1.5 flex items-center gap-2 font-mono text-[9px] font-bold uppercase tracking-[0.18em] text-slate-400">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                Store & Material Telemetry
                <span className="text-slate-300 dark:text-slate-700">/</span>
                <span>{stockMasterRows.length} active SKUs</span>
              </div>
              <div className="flex items-baseline gap-3">
                <h1 className="truncate text-[25px] font-extrabold tracking-[-0.04em] text-slate-950 dark:text-white">
                  Inventory & Store Ledger
                </h1>
                <span className="hidden font-mono text-[10px] font-semibold text-slate-400 xl:inline">
                  STOCK • MOVEMENTS • RECONCILIATION • SHORTAGES • PO • GRN
                </span>
              </div>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                Monitor physical store inventory, execute Goods Receipt (GRN), audit real-time stock movements, and govern Purchase Orders.
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {subTab === 'stock' && (
                <button
                  onClick={() => {
                    const target = stockMasterRows[0];
                    if (target) {
                      setSelectedStockForAdjust(target);
                      adjustStockModal.open({ itemId: target.code });
                    }
                  }}
                  className="flex h-11 shrink-0 items-center gap-2 rounded-xl bg-[var(--accent-primary)] px-4 text-xs font-extrabold text-white shadow-[0_8px_20px_var(--accent-shadow)] transition-ui hover:bg-[var(--accent-hover)] active:scale-[0.96]"
                >
                  <SlidersHorizontal className="h-4 w-4" />
                  Adjust Stock
                </button>
              )}
              {subTab === 'purchases' && (
                <button
                  onClick={() => createPoModal.open()}
                  className="flex h-11 shrink-0 items-center gap-2 rounded-xl bg-[var(--accent-primary)] px-4 text-xs font-extrabold text-white shadow-[0_8px_20px_var(--accent-shadow)] transition-ui hover:bg-[var(--accent-hover)] active:scale-[0.96]"
                >
                  <Plus className="h-4 w-4" />
                  Create Purchase Order
                </button>
              )}
              {subTab === 'grn' && (
                <button
                  onClick={() => createGrnModal.open()}
                  className="flex h-11 shrink-0 items-center gap-2 rounded-xl bg-[var(--accent-primary)] px-4 text-xs font-extrabold text-white shadow-[0_8px_20px_var(--accent-shadow)] transition-ui hover:bg-[var(--accent-hover)] active:scale-[0.96]"
                >
                  <Truck className="h-4 w-4" />
                  Receive Material (GRN)
                </button>
              )}
            </div>
          </div>

          {/* Integrated 4-Column Metric Strip (border-t) */}
          <div className={`grid grid-cols-4 border-t ${isDarkMode ? 'border-white/[0.07]' : 'border-slate-200'}`}>
            {[
              { label: 'Total SKUs', value: String(stockMasterRows.length), detail: 'Active catalog parts', icon: Package, tone: 'text-[var(--accent-text-light)] dark:text-[var(--accent-text-dark)]', iconBg: 'bg-[var(--accent-soft-light)] dark:bg-[var(--accent-soft-dark)]' },
              { label: 'Total On-Hand Qty', value: totalOnHand.toLocaleString(), detail: 'Physical warehouse units', icon: Box, tone: 'text-emerald-600 dark:text-emerald-400', iconBg: 'bg-emerald-500/10' },
              { label: 'Shortage Items', value: String(shortageCount), detail: 'Production deficit alerts', icon: AlertTriangle, tone: 'text-rose-600 dark:text-rose-400', iconBg: 'bg-rose-500/10' },
              { label: 'Below Reorder Point', value: String(reorderCount), detail: 'Procurement action req', icon: TrendingDown, tone: 'text-amber-600 dark:text-amber-400', iconBg: 'bg-amber-500/10' },
            ].map((metric, index) => {
              const MetricIcon = metric.icon;
              return (
                <div key={metric.label} className={`flex items-center gap-3 px-5 py-4 ${index > 0 ? isDarkMode ? 'border-l border-white/[0.07]' : 'border-l border-slate-200' : ''}`}>
                  <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${metric.iconBg} ${metric.tone}`}>
                    <MetricIcon className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="font-mono text-[9px] font-bold uppercase tracking-[0.13em] text-slate-400">{metric.label}</div>
                    <div className={`mt-0.5 truncate text-lg font-extrabold tracking-[-0.03em] ${metric.tone}`}>{metric.value}</div>
                    <div className="truncate text-[10px] text-slate-400">{metric.detail}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Desktop Sub-Tabs Navigation & Search Toolbar */}
        <div className={`rounded-2xl border p-3 ${isDarkMode ? 'border-white/[0.08] bg-[#121215]' : 'border-slate-200 bg-white shadow-[0_6px_22px_rgba(15,23,42,0.04)]'}`}>
          <div className="flex items-center gap-2">
            <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${isDarkMode ? 'bg-white/[0.05] text-slate-400' : 'bg-slate-100 text-slate-500'}`} title="Modules">
              <Layers className="h-4 w-4" />
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto">
              {[
                { id: 'stock', label: 'Stock Master', count: stockMasterRows.length },
                { id: 'movements', label: 'Movement Ledger', count: movements.length },
                { id: 'reconciliation', label: 'Stock Reconciliation', count: reconciliationReport.length },
                { id: 'shortages', label: 'Shortages', count: shortageCount },
                { id: 'purchases', label: 'Purchase Orders', count: purchaseOrders.length },
                { id: 'grn', label: 'Goods-in (GRN)', count: grnList.length },
              ].map(t => (
                <button
                  key={t.id}
                  onClick={() => setSubTab(t.id as any)}
                  className={`flex items-center gap-1.5 h-10 px-3.5 rounded-xl text-xs font-bold transition-ui cursor-pointer whitespace-nowrap border ${
                    subTab === t.id
                      ? isDarkMode
                        ? 'bg-[var(--accent-primary)]/20 text-[var(--accent-text-dark)] border-[var(--accent-primary)]/40 shadow-xs'
                        : 'bg-[var(--accent-primary)] text-white border-[var(--accent-primary)] shadow-sm shadow-[var(--accent-shadow)]'
                      : isDarkMode
                        ? 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-white/[0.06]'
                        : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  <span>{t.label}</span>
                  {t.count !== undefined && (
                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-mono ${
                      subTab === t.id
                        ? isDarkMode ? 'bg-[var(--accent-primary)]/30 text-white' : 'bg-white/25 text-white'
                        : isDarkMode ? 'bg-white/[0.06] text-slate-400' : 'bg-slate-200 text-slate-600'
                    }`}>
                      {t.count}
                    </span>
                  )}
                </button>
              ))}
            </div>

            <div className={`flex h-10 min-w-[240px] flex-1 items-center gap-2 rounded-xl border px-3 ml-auto ${isDarkMode ? 'border-white/[0.08] bg-black/20 text-white focus-within:border-[var(--accent-border-dark)]' : 'border-slate-200 bg-slate-50 text-slate-900 focus-within:border-[var(--accent-primary)]'}`}>
              <Search className="h-4 w-4 shrink-0 text-slate-400" />
              <input
                type="text"
                placeholder="Search Part Code, Description, Catalog ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-full w-full bg-transparent text-xs font-semibold outline-none placeholder:font-normal placeholder:text-slate-400 font-mono"
              />
              {searchQuery && (
                <button type="button" onClick={() => setSearchQuery('')} className="text-slate-400 hover:text-slate-700 dark:hover:text-white">
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>

          <div className="mt-2.5 flex items-center justify-between px-1 font-mono text-[9px] font-semibold uppercase tracking-wider text-slate-400">
            <span>Showing {subTab === 'stock' ? filteredStock.length : (subTab === 'shortages' ? shortages.length : (subTab === 'purchases' ? purchaseOrders.length : (subTab === 'grn' ? grnList.length : (subTab === 'movements' ? movements.length : reconciliationReport.length))))} records</span>
            <span>Physical Store & Append-Only Ledger Control</span>
          </div>
        </div>
      </div>

      {/* 1. Main Stock Table */}
      {subTab === 'stock' && (
        <div className="space-y-4">
          {/* Category Filter Tabs Bar */}
          <div className={`p-2.5 rounded-2xl border flex items-center gap-1.5 overflow-x-auto scrollbar-none transition-ui ${
            isDarkMode ? 'border-white/[0.08] bg-[#121215]' : 'border-slate-200 bg-white shadow-[0_6px_22px_rgba(15,23,42,0.04)]'
          }`}>
            <div className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400 px-2 shrink-0">
              Category:
            </div>
            {INVENTORY_CATEGORIES.map(cat => {
              const isActive = selectedCategory === cat.key;
              const count = categoryCounts[cat.key] || 0;
              return (
                <button
                  key={cat.key}
                  onClick={() => setSelectedCategory(cat.key)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-mono font-bold transition-ui cursor-pointer whitespace-nowrap border ${
                    isActive
                      ? isDarkMode 
                        ? 'bg-[var(--accent-soft-dark)] text-[var(--accent-text-dark)] border-[var(--accent-border-dark)] shadow-xs'
                        : 'bg-[var(--accent-primary)] text-white border-[var(--accent-primary)] shadow-xs'
                      : isDarkMode
                        ? 'bg-white/[0.04] text-slate-400 border-white/[0.06] hover:text-slate-200 hover:bg-white/[0.08]'
                        : 'bg-slate-50 text-slate-600 border-slate-200 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  <span>{cat.label}</span>
                  <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                    isActive
                      ? isDarkMode ? 'bg-white/20 text-white' : 'bg-white/25 text-white'
                      : isDarkMode ? 'bg-white/[0.06] text-slate-400' : 'bg-slate-200 text-slate-700'
                  }`}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Desktop Stock Master Table */}
          <div className={`hidden md:block overflow-hidden rounded-[22px] border transition-ui ${
            isDarkMode ? 'border-white/[0.08] bg-[#121215]' : 'border-slate-200 bg-white shadow-[0_12px_36px_rgba(15,23,42,0.06)]'
          }`}>
            <div className={`flex items-center justify-between border-b px-5 py-3 ${isDarkMode ? 'border-white/[0.07]' : 'border-slate-200'}`}>
              <div>
                <div className="text-xs font-extrabold text-slate-900 dark:text-white">Store Inventory Master</div>
                <div className="mt-0.5 text-[10px] text-slate-400">Real-time on-hand, reserved, and available material balance</div>
              </div>
              <span className={`rounded-lg border px-2 py-1 font-mono text-[9px] font-bold uppercase tracking-wider ${isDarkMode ? 'border-white/[0.08] bg-white/[0.04] text-slate-400' : 'border-slate-200 bg-slate-50 text-slate-500'}`}>{filteredStock.length} items</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className={`border-b font-mono font-bold uppercase tracking-[0.12em] text-[9px] ${
                    isDarkMode ? 'border-white/[0.07] bg-black/20 text-slate-500' : 'border-slate-200 bg-slate-50/80 text-slate-400'
                  }`}>
                    <th className="py-4 px-5">Part Code</th>
                    <th className="py-4 px-5">Category</th>
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
                <tbody className={`divide-y ${isDarkMode ? 'divide-slate-800/60' : 'divide-slate-200'}`}>
                  {filteredStock.map((stk) => {
                    const isShort = stk.status === 'SHORTAGE' || (stk.shortage || 0) > 0;
                    return (
                      <tr 
                        key={stk.code}
                        className={`group transition-colors ${isDarkMode ? 'hover:bg-white/[0.035]' : 'hover:bg-slate-50/80'}`}
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
                                <span className={`font-mono font-bold text-xs ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                                  {stk.code}
                                </span>
                                {stk.rawCode && stk.rawCode !== stk.code && (
                                  <span 
                                    className={`px-1.5 py-0.5 rounded-md text-[9px] font-mono font-bold uppercase tracking-wider border ${
                                      isDarkMode 
                                        ? 'bg-white/[0.06] text-slate-400 border-white/[0.08]' 
                                        : 'bg-slate-100 text-slate-600 border-slate-200'
                                    }`} 
                                    title={`Catalog Master Code: ${stk.rawCode}`}
                                  >
                                    {stk.rawCode}
                                  </span>
                                )}
                              </div>
                              {stk.partNo && stk.partNo !== stk.code && (
                                <div className={`text-[10px] font-mono truncate mt-0.5 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                                  Part #{stk.partNo}
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="py-4 px-5">
                          {renderCategoryBadge(stk.category, stk.categoryLabel)}
                        </td>
                        <td className={`py-4 px-5 font-semibold ${isDarkMode ? 'text-slate-100' : 'text-slate-800'}`}>
                          <div>{stk.description}</div>
                          {stk.partNo && stk.partNo !== stk.description && (
                            <div className="text-[11px] text-slate-400 font-mono mt-0.5">{stk.partNo}</div>
                          )}
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
                              onClick={() => {
                                setSelectedStockForAdjust(stk);
                                adjustStockModal.open({ itemId: stk.code });
                              }}
                              className={`px-3 py-1.5 rounded-xl font-mono text-xs font-bold transition-ui cursor-pointer ${
                                isDarkMode ? 'bg-[var(--accent-soft-dark)] text-[var(--accent-text-dark)] hover:brightness-125 border border-[var(--accent-border-dark)]' : 'bg-[var(--accent-soft-light)] text-[var(--accent-text-light)] hover:brightness-95 border border-[var(--accent-border-light)]'
                              }`}
                            >
                              Adjust
                            </button>
                            <button
                              onClick={() => handleOpenItemHistory(stk)}
                              className={`p-1.5 rounded-xl border transition-ui cursor-pointer ${
                                isDarkMode ? 'border-slate-800 bg-black/20 text-slate-400 hover:text-white' : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'
                              }`}
                              title="View Running Ledger Movements"
                            >
                              <History className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {filteredStock.length === 0 && (
                    <tr>
                      <td colSpan={10} className="py-12 text-center text-slate-400 font-mono text-xs">
                        No inventory items found matching the selected category or search term.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile Stock Cards (Viewport < md) */}
          <div className="block md:hidden space-y-3">
            {filteredStock.map((stk) => {
              const isShort = stk.status === 'SHORTAGE' || (stk.shortage || 0) > 0;
              return (
                <div
                  key={stk.code}
                  className={`p-4 rounded-2xl border transition-ui space-y-3 shadow-sm ${
                    isDarkMode ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono font-bold text-sm text-[var(--accent-primary)] dark:text-[var(--accent-text-dark)]">
                        {stk.code}
                      </span>
                      {renderCategoryBadge(stk.category, stk.categoryLabel)}
                      {stk.rawCode && stk.rawCode !== stk.code && (
                        <span className={`text-[9px] px-1.5 py-0.5 rounded-md border font-mono font-bold uppercase tracking-wider ${
                          isDarkMode ? 'bg-white/[0.06] text-slate-400 border-white/[0.08]' : 'bg-slate-100 text-slate-600 border-slate-200'
                        }`}>
                          {stk.rawCode}
                        </span>
                      )}
                    </div>
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-mono font-bold uppercase border shrink-0 ${
                      isShort ? 'bg-rose-500/10 text-rose-400 border-rose-500/30' : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                    }`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${isShort ? 'bg-rose-500' : 'bg-emerald-500'}`} />
                      {stk.status}
                    </span>
                  </div>

                  <div>
                    <h4 className={`text-xs font-bold ${isDarkMode ? 'text-slate-100' : 'text-slate-900'}`}>
                      {stk.description}
                    </h4>
                    {stk.partNo && stk.partNo !== stk.description && (
                      <p className="text-[10px] text-slate-400 font-mono mt-0.5">{stk.partNo}</p>
                    )}
                  </div>

                  <div className={`grid grid-cols-3 gap-2 text-center font-mono text-[11px] p-2.5 rounded-xl border ${
                    isDarkMode ? 'bg-slate-950/70 border-slate-800/80' : 'bg-slate-50 border-slate-200'
                  }`}>
                    <div>
                      <span className="text-[10px] text-slate-500 uppercase block">On Hand</span>
                      <span className={`font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                        {stk.onHand} {stk.unit}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 uppercase block">Available</span>
                      <span className="font-bold text-emerald-500">{stk.available} {stk.unit}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 uppercase block">Reserved</span>
                      <span className="font-bold text-slate-400">{stk.reserved} {stk.unit}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-2 pt-1">
                    <button
                      onClick={() => setSelectedStockForAdjust(stk)}
                      className="flex-1 py-2 rounded-xl bg-[var(--accent-primary)]/15 hover:bg-[var(--accent-primary)]/25 text-[var(--accent-text-light)] dark:text-[var(--accent-text-dark)] border border-[var(--accent-primary)]/30 text-xs font-mono font-bold flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <SlidersHorizontal className="w-3.5 h-3.5" />
                      <span>Adjust Stock</span>
                    </button>
                    <button
                      onClick={() => handleOpenItemHistory(stk)}
                      className={`p-2 rounded-xl border transition-ui cursor-pointer ${
                        isDarkMode ? 'bg-slate-800 border-slate-700 text-slate-300 hover:text-white' : 'bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200'
                      }`}
                      title="View History"
                    >
                      <History className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
            {filteredStock.length === 0 && (
              <div className={`p-8 text-center rounded-2xl border font-mono text-xs ${
                isDarkMode ? 'bg-slate-900/60 border-slate-800 text-slate-400' : 'bg-white border-slate-200 text-slate-500'
              }`}>
                No inventory items found matching the selected category.
              </div>
            )}
          </div>
        </div>
      )}

      {/* 2. Material Shortages Sub-View */}
      {subTab === 'shortages' && (
        <div className={`overflow-hidden rounded-[22px] border transition-ui ${
          isDarkMode ? 'border-white/[0.08] bg-[#121215]' : 'border-slate-200 bg-white shadow-[0_12px_36px_rgba(15,23,42,0.06)]'
        }`}>
          <div className={`flex items-center justify-between border-b px-5 py-3 ${isDarkMode ? 'border-white/[0.07]' : 'border-slate-200'}`}>
            <div>
              <div className="text-xs font-extrabold text-slate-900 dark:text-white">Material Shortages & Deficit Queue</div>
              <div className="mt-0.5 text-[10px] text-slate-400">Components with active BOM deficit required for releasing jobs</div>
            </div>
            <span className={`rounded-lg border px-2 py-1 font-mono text-[9px] font-bold uppercase tracking-wider ${isDarkMode ? 'border-white/[0.08] bg-white/[0.04] text-slate-400' : 'border-slate-200 bg-slate-50 text-slate-500'}`}>{shortages.length} shortages</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className={`border-b font-mono font-bold uppercase tracking-[0.12em] text-[9px] ${
                  isDarkMode ? 'border-white/[0.07] bg-black/20 text-slate-500' : 'border-slate-200 bg-slate-50/80 text-slate-400'
                }`}>
                  <th className="py-4 px-5">Material SKU</th>
                  <th className="py-4 px-5">Description</th>
                  <th className="py-4 px-5 text-right">Required Qty</th>
                  <th className="py-4 px-5 text-right">Available Qty</th>
                  <th className="py-4 px-5 text-right">Deficit / Alert</th>
                  <th className="py-4 px-5 text-center">Action</th>
                </tr>
              </thead>
              <tbody className={`divide-y ${isDarkMode ? 'divide-slate-800/60' : 'divide-slate-200'}`}>
                {shortages.map(sh => (
                  <tr key={sh.code} className={`transition-colors ${isDarkMode ? 'hover:bg-white/[0.035]' : 'hover:bg-slate-50/80'}`}>
                    <td className="py-4 px-5 font-bold font-mono text-[var(--accent-primary)] dark:text-[var(--accent-text-dark)]">{sh.code}</td>
                    <td className={`py-4 px-5 font-semibold ${isDarkMode ? 'text-slate-100' : 'text-slate-800'}`}>{sh.description}</td>
                    <td className="py-4 px-5 text-right font-mono font-bold text-amber-500">{sh.requiredQty} {sh.unit}</td>
                    <td className="py-4 px-5 text-right font-mono text-slate-400">{sh.availableQty} {sh.unit}</td>
                    <td className="py-4 px-5 text-right font-mono font-bold text-rose-400">-{sh.deficit} {sh.unit}</td>
                    <td className="py-4 px-5 text-center">
                      <button
                        onClick={() => {
                          setSubTab('purchases');
                          createPoModal.open();
                        }}
                        className="px-3 py-1.5 rounded-xl bg-[var(--accent-primary)]/10 hover:bg-[var(--accent-primary)]/20 text-[var(--accent-text-light)] dark:text-[var(--accent-text-dark)] border border-[var(--accent-primary)]/30 text-xs font-mono font-bold cursor-pointer transition-ui"
                      >
                        Raise PO
                      </button>
                    </td>
                  </tr>
                ))}
                {shortages.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-400 font-mono text-xs">
                      No material shortages detected. All production jobs have sufficient store buffer.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 3. Purchase Orders Sub-View */}
      {subTab === 'purchases' && (
        <div className={`overflow-hidden rounded-[22px] border transition-ui ${
          isDarkMode ? 'border-white/[0.08] bg-[#121215]' : 'border-slate-200 bg-white shadow-[0_12px_36px_rgba(15,23,42,0.06)]'
        }`}>
          <div className={`flex items-center justify-between border-b px-5 py-3 ${isDarkMode ? 'border-white/[0.07]' : 'border-slate-200'}`}>
            <div>
              <div className="text-xs font-extrabold text-slate-900 dark:text-white">Procurement & Purchase Orders</div>
              <div className="mt-0.5 text-[10px] text-slate-400">Supplier purchase orders, delivery milestones, and management approvals</div>
            </div>
            <div className="flex items-center gap-2">
              <span className={`rounded-lg border px-2 py-1 font-mono text-[9px] font-bold uppercase tracking-wider ${isDarkMode ? 'border-white/[0.08] bg-white/[0.04] text-slate-400' : 'border-slate-200 bg-slate-50 text-slate-500'}`}>{purchaseOrders.length} orders</span>
              {overduePoCount > 0 && (
                <span className="rounded-lg border px-2 py-1 font-mono text-[9px] font-bold uppercase tracking-wider bg-rose-500/10 text-rose-400 border-rose-500/30">
                  {overduePoCount} overdue
                </span>
              )}
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className={`border-b font-mono font-bold uppercase tracking-[0.12em] text-[9px] ${
                  isDarkMode ? 'border-white/[0.07] bg-black/20 text-slate-500' : 'border-slate-200 bg-slate-50/80 text-slate-400'
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
              <tbody className={`divide-y ${isDarkMode ? 'divide-slate-800/60' : 'divide-slate-200'}`}>
                {purchaseOrders.map(po => {
                  const aging = evaluatePoAging(po);
                  const isClosed = po.status === 'RECEIVED' || po.status === 'CANCELLED';

                  return (
                    <tr key={po.id || po.poNo} className={`transition-colors ${isDarkMode ? 'hover:bg-white/[0.035]' : 'hover:bg-slate-50/80'}`}>
                      <td className="py-4 px-5 font-bold font-mono text-[var(--accent-primary)] dark:text-[var(--accent-text-dark)]">{po.poNo}</td>
                      <td className={`py-4 px-5 font-semibold ${isDarkMode ? 'text-slate-100' : 'text-slate-800'}`}>
                        <div>{po.supplierName}</div>
                        <div className="text-[10px] text-slate-500 font-mono">{po.supplierCode}</div>
                      </td>
                      <td className="py-4 px-5 font-mono text-slate-400">{po.orderDate}</td>
                      <td className="py-4 px-5 font-mono">
                        <div className={isDarkMode ? 'text-slate-300' : 'text-slate-700'}>
                          {po.expectedDeliveryDate || '—'}
                        </div>
                        {!isClosed && (
                          <div className="mt-1">
                            {aging.agingBucket === 'SEVERELY_OVERDUE' ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[9px] font-mono font-bold uppercase border bg-rose-500/20 text-rose-400 border-rose-500/40">
                                <AlertTriangle className="w-3 h-3 text-rose-400" />
                                <span>Overdue (+{aging.daysOverdue}d)</span>
                              </span>
                            ) : aging.agingBucket === 'OVERDUE' ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[9px] font-mono font-bold uppercase border bg-rose-500/10 text-rose-400 border-rose-500/30">
                                <span>Overdue (+{aging.daysOverdue}d)</span>
                              </span>
                            ) : aging.agingBucket === 'DUE_SOON' ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[9px] font-mono font-bold uppercase border bg-amber-500/10 text-amber-400 border-amber-500/30">
                                <span>Due Soon</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[9px] font-mono font-bold uppercase border bg-emerald-500/10 text-emerald-400 border-emerald-500/30">
                                <span>On Track</span>
                              </span>
                            )}
                          </div>
                        )}
                      </td>
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
                  );
                })}
                {purchaseOrders.length === 0 && (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-slate-400 font-mono text-xs">
                      No purchase orders recorded yet. Create one to replenish material.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 4. Goods Receipt Notes (GRN) Sub-View */}
      {subTab === 'grn' && (
        <div className={`overflow-hidden rounded-[22px] border transition-ui ${
          isDarkMode ? 'border-white/[0.08] bg-[#121215]' : 'border-slate-200 bg-white shadow-[0_12px_36px_rgba(15,23,42,0.06)]'
        }`}>
          <div className={`flex items-center justify-between border-b px-5 py-3 ${isDarkMode ? 'border-white/[0.07]' : 'border-slate-200'}`}>
            <div>
              <div className="text-xs font-extrabold text-slate-900 dark:text-white">Goods Receipt Notes (GRN)</div>
              <div className="mt-0.5 text-[10px] text-slate-400">Inward gate logs, vehicle manifests, and QC verification check-ins</div>
            </div>
            <span className={`rounded-lg border px-2 py-1 font-mono text-[9px] font-bold uppercase tracking-wider ${isDarkMode ? 'border-white/[0.08] bg-white/[0.04] text-slate-400' : 'border-slate-200 bg-slate-50 text-slate-500'}`}>{grnList.length} receipts</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className={`border-b font-mono font-bold uppercase tracking-[0.12em] text-[9px] ${
                  isDarkMode ? 'border-white/[0.07] bg-black/20 text-slate-500' : 'border-slate-200 bg-slate-50/80 text-slate-400'
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
              <tbody className={`divide-y ${isDarkMode ? 'divide-slate-800/60' : 'divide-slate-200'}`}>
                {grnList.map(g => (
                  <tr key={g.id || g.grnNo} className={`transition-colors ${isDarkMode ? 'hover:bg-white/[0.035]' : 'hover:bg-slate-50/80'}`}>
                    <td className="py-4 px-5 font-bold font-mono text-[var(--accent-primary)] dark:text-[var(--accent-text-dark)]">{g.grnNo}</td>
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
                          className="px-3 py-1.5 rounded-xl bg-[var(--accent-primary)]/20 hover:bg-[var(--accent-primary)]/30 text-[var(--accent-text-light)] dark:text-[var(--accent-text-dark)] border border-[var(--accent-primary)]/40 text-xs font-mono font-bold cursor-pointer transition-ui"
                        >
                          QC Verify
                        </button>
                      ) : (
                        <span className="text-[11px] font-mono text-slate-500">Verified</span>
                      )}
                    </td>
                  </tr>
                ))}
                {grnList.length === 0 && (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-400 font-mono text-xs">
                      No Goods Receipt Notes logged yet. Receive inbound vendor shipments to create one.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 5. Append-Only Inventory Movements Ledger Sub-View */}
      {subTab === 'movements' && (
        <div className="space-y-4">
          {/* Security & Immutability Badge Banner */}
          <div className={`p-4 rounded-2xl border flex items-center justify-between gap-4 ${
            isDarkMode ? 'border-white/[0.08] bg-[#121215] text-white' : 'border-slate-200 bg-white shadow-[0_6px_22px_rgba(15,23,42,0.04)] text-slate-900'
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
                  className={`px-2.5 py-1 rounded-xl text-[10px] font-mono font-bold transition-ui cursor-pointer whitespace-nowrap ${
                    movementTypeFilter === t
                      ? 'bg-[var(--accent-primary)] text-white shadow-xs'
                      : isDarkMode ? 'bg-white/[0.06] text-slate-400 hover:text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  {t.replace('_', ' ')}
                </button>
              ))}
            </div>
          </div>

          <div className={`overflow-hidden rounded-[22px] border transition-ui ${
            isDarkMode ? 'border-white/[0.08] bg-[#121215]' : 'border-slate-200 bg-white shadow-[0_12px_36px_rgba(15,23,42,0.06)]'
          }`}>
            <div className={`flex items-center justify-between border-b px-5 py-3 ${isDarkMode ? 'border-white/[0.07]' : 'border-slate-200'}`}>
              <div>
                <div className="text-xs font-extrabold text-slate-900 dark:text-white">Immutable Movement Ledger</div>
                <div className="mt-0.5 text-[10px] text-slate-400">Cryptographically verifiable sequence of store additions and subtractions</div>
              </div>
              <span className={`rounded-lg border px-2 py-1 font-mono text-[9px] font-bold uppercase tracking-wider ${isDarkMode ? 'border-white/[0.08] bg-white/[0.04] text-slate-400' : 'border-slate-200 bg-slate-50 text-slate-500'}`}>{movements.length} ledger events</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse font-mono">
                <thead>
                  <tr className={`border-b font-bold uppercase tracking-[0.12em] text-[9px] ${
                    isDarkMode ? 'border-white/[0.07] bg-black/20 text-slate-500' : 'border-slate-200 bg-slate-50/80 text-slate-400'
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
                <tbody className={`divide-y ${isDarkMode ? 'divide-slate-800/60' : 'divide-slate-200'}`}>
                  {(Array.isArray(movements) ? movements : [])
                    .filter(m => movementTypeFilter === 'ALL' || m.movementType === movementTypeFilter)
                    .filter(m => !searchQuery || m.itemCode.toLowerCase().includes(searchQuery.toLowerCase()) || m.referenceId?.toLowerCase().includes(searchQuery.toLowerCase()))
                    .map((mov) => {
                      const isInbound = mov.quantityChange > 0;
                      const isCorrection = mov.movementType === 'CORRECTION';
                      const isAdjustment = mov.movementType === 'ADJUSTMENT';

                      return (
                        <tr key={mov.id} className={`transition-colors ${isDarkMode ? 'hover:bg-white/[0.035]' : 'hover:bg-slate-50/80'}`}>
                          <td className="py-3 px-4 text-slate-400 text-[11px]">
                            {new Date(mov.createdAt).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                          </td>
                          <td className="py-3 px-4 font-bold text-[var(--accent-primary)] dark:text-[var(--accent-text-dark)]">
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
                                  correctMovementModal.open({ movementId: mov.id });
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
                  {(movements?.length ?? 0) === 0 && (
                    <tr>
                      <td colSpan={9} className="py-8 text-center text-slate-500 font-sans text-xs">
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
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className={`p-4 rounded-2xl border ${isDarkMode ? 'border-white/[0.08] bg-[#121215]' : 'border-slate-200 bg-white shadow-[0_6px_22px_rgba(15,23,42,0.04)]'}`}>
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 font-mono">Audited Items</div>
              <div className="text-2xl font-extrabold font-mono mt-1 text-[var(--accent-primary)] dark:text-[var(--accent-text-dark)]">{(reconciliationReport || []).length}</div>
            </div>
            <div className={`p-4 rounded-2xl border ${isDarkMode ? 'border-white/[0.08] bg-[#121215]' : 'border-slate-200 bg-white shadow-[0_6px_22px_rgba(15,23,42,0.04)]'}`}>
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 font-mono">100% Ledger Matched</div>
              <div className="text-2xl font-extrabold font-mono mt-1 text-emerald-400">
                {(reconciliationReport || []).filter(r => r.status === 'MATCHED').length}
              </div>
            </div>
            <div className={`p-4 rounded-2xl border ${isDarkMode ? 'border-white/[0.08] bg-[#121215]' : 'border-slate-200 bg-white shadow-[0_6px_22px_rgba(15,23,42,0.04)]'}`}>
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 font-mono">Discrepancies Flagged</div>
              <div className="text-2xl font-extrabold font-mono mt-1 text-rose-400">
                {(reconciliationReport || []).filter(r => r.status === 'DISCREPANCY').length}
              </div>
            </div>
          </div>

          <div className={`overflow-hidden rounded-[22px] border transition-ui ${
            isDarkMode ? 'border-white/[0.08] bg-[#121215]' : 'border-slate-200 bg-white shadow-[0_12px_36px_rgba(15,23,42,0.06)]'
          }`}>
            <div className={`flex items-center justify-between border-b px-5 py-3 ${isDarkMode ? 'border-white/[0.07]' : 'border-slate-200'}`}>
              <div>
                <div className="text-xs font-extrabold text-slate-900 dark:text-white">Physical vs. Derived Ledger Reconciliation</div>
                <div className="mt-0.5 text-[10px] text-slate-400">Audit report comparing fast cache count against immutable ledger transaction sum</div>
              </div>
              <span className={`rounded-lg border px-2 py-1 font-mono text-[9px] font-bold uppercase tracking-wider ${isDarkMode ? 'border-white/[0.08] bg-white/[0.04] text-slate-400' : 'border-slate-200 bg-slate-50 text-slate-500'}`}>{reconciliationReport.length} items</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse font-mono">
                <thead>
                  <tr className={`border-b font-bold uppercase tracking-[0.12em] text-[9px] ${
                    isDarkMode ? 'border-white/[0.07] bg-black/20 text-slate-500' : 'border-slate-200 bg-slate-50/80 text-slate-400'
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
                <tbody className={`divide-y ${isDarkMode ? 'divide-slate-800/60' : 'divide-slate-200'}`}>
                  {(reconciliationReport || []).map((rec) => {
                    const isDiscrepancy = rec.status === 'DISCREPANCY';
                    return (
                      <tr key={rec.itemCode} className={`transition-colors ${isDarkMode ? 'hover:bg-white/[0.035]' : 'hover:bg-slate-50/80'}`}>
                        <td className="py-4 px-5 font-bold text-[var(--accent-primary)] dark:text-[var(--accent-text-dark)]">{rec.itemCode}</td>
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
                            className={`px-3 py-1.5 rounded-xl font-mono text-xs font-bold transition-ui cursor-pointer ${
                              isDarkMode ? 'bg-[var(--accent-soft-dark)] text-[var(--accent-text-dark)] hover:brightness-125 border border-[var(--accent-border-dark)]' : 'bg-[var(--accent-soft-light)] text-[var(--accent-text-light)] hover:brightness-95 border border-[var(--accent-border-light)]'
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

      {/* Modal 1: Physical Stock Audit Adjustment */}
      <Modal
        isOpen={adjustStockModal.isOpen && Boolean(selectedStockForAdjust)}
        onClose={() => {
          setSelectedStockForAdjust(null);
          adjustStockModal.close();
        }}
        maxWidth="lg"
        isDarkMode={isDarkMode}
        icon={<Boxes className="w-5 h-5" />}
        title="Physical Stock Audit Adjustment"
        subtitle="Reconcile physical store inventory delta"
      >
        {selectedStockForAdjust && (
          <form onSubmit={handleAdjustSubmit} className="space-y-4 font-sans text-xs">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className={`block text-[11px] font-bold uppercase tracking-wider ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                  Target SKU / Material Component *
                </label>
                {renderCategoryBadge(selectedStockForAdjust.category, selectedStockForAdjust.categoryLabel)}
              </div>
              <select
                value={selectedStockForAdjust.code}
                onChange={(e) => {
                  const found = stockMasterRows.find(s => s.code === e.target.value);
                  if (found) setSelectedStockForAdjust(found);
                }}
                className={`h-11 w-full rounded-xl border px-3 text-xs font-mono font-bold outline-none transition-ui cursor-pointer ${
                  isDarkMode 
                    ? 'bg-[#09090B] border-slate-700/80 text-[var(--accent-text-dark)] focus:border-[var(--accent-primary)] focus:ring-2 focus:ring-[var(--accent-ring)]' 
                    : 'bg-slate-50 border-slate-300 text-[var(--accent-text-light)] focus:border-[var(--accent-primary)] shadow-xs'
                }`}
              >
                {stockMasterRows.map((s) => (
                  <option key={s.code} value={s.code} className={isDarkMode ? 'bg-slate-900 text-white' : 'bg-white text-slate-900'}>
                    [{s.categoryLabel || 'Item'}] {s.code} — {s.description} ({s.onHand} {s.unit || 'units'} on hand)
                  </option>
                ))}
              </select>
              {selectedStockForAdjust.rawCode && selectedStockForAdjust.rawCode !== selectedStockForAdjust.code && (
                <div className="text-[10px] font-mono text-slate-400 flex items-center gap-1.5 pt-0.5">
                  <span>Catalog Reference:</span>
                  <span className={`px-2 py-0.5 rounded-md font-bold border ${
                    isDarkMode ? 'bg-slate-800 text-slate-300 border-slate-700' : 'bg-slate-100 text-slate-700 border-slate-200'
                  }`}>
                    {selectedStockForAdjust.rawCode}
                  </span>
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3.5">
              <div>
                <label className={`block text-[11px] font-bold uppercase tracking-wider mb-1.5 ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                  Current On Hand
                </label>
                <div className={`h-11 px-3 flex items-center rounded-xl border font-mono font-bold text-xs ${
                  isDarkMode ? 'bg-[#09090B] border-slate-700/80 text-white' : 'bg-slate-50 border-slate-300 text-slate-900 shadow-xs'
                }`}>
                  {selectedStockForAdjust.onHand} {selectedStockForAdjust.unit}
                </div>
              </div>
              <div>
                <label className={`block text-[11px] font-bold uppercase tracking-wider mb-1.5 ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                  Adjustment Delta (+/-) *
                </label>
                <input
                  type="number"
                  required
                  value={adjustQty}
                  onChange={(e) => setAdjustQty(Number(e.target.value))}
                  className={`h-11 w-full rounded-xl border px-3 text-xs font-mono font-bold outline-none transition-ui ${
                    isDarkMode 
                      ? 'bg-[#09090B] border-slate-700/80 text-white focus:border-[var(--accent-primary)] focus:ring-2 focus:ring-[var(--accent-ring)]' 
                      : 'bg-slate-50 border-slate-300 text-slate-900 focus:border-[var(--accent-primary)] shadow-xs'
                  }`}
                  placeholder="e.g. +10 or -5"
                />
              </div>
            </div>

            <div>
              <label className={`block text-[11px] font-bold uppercase tracking-wider mb-1.5 ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                Audit Reason *
              </label>
              <input
                type="text"
                required
                value={adjustReason}
                onChange={(e) => setAdjustReason(e.target.value)}
                className={`h-11 w-full rounded-xl border px-3 text-xs outline-none transition-ui ${
                  isDarkMode 
                    ? 'bg-[#09090B] border-slate-700/80 text-white placeholder:text-slate-500 focus:border-[var(--accent-primary)] focus:ring-2 focus:ring-[var(--accent-ring)]' 
                    : 'bg-slate-50 border-slate-300 text-slate-900 placeholder:text-slate-400 focus:border-[var(--accent-primary)] shadow-xs'
                }`}
                placeholder="e.g. Physical count reconciliation"
              />
            </div>

            <div className={`pt-4 border-t flex items-center justify-end gap-3 ${isDarkMode ? 'border-slate-800' : 'border-slate-200'}`}>
              <button
                type="button"
                onClick={() => {
                  setSelectedStockForAdjust(null);
                  adjustStockModal.close();
                }}
                className={`px-4 py-2 rounded-xl border text-xs font-bold transition-ui cursor-pointer ${
                  isDarkMode 
                    ? 'border-slate-700 text-slate-300 hover:bg-slate-800' 
                    : 'border-slate-300 text-slate-700 hover:bg-slate-100'
                }`}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl bg-[var(--accent-primary)] hover:brightness-110 text-white font-bold text-xs cursor-pointer shadow-lg shadow-[var(--accent-shadow)] transition-ui hover:scale-[1.01] active:scale-[0.96]"
              >
                Confirm Adjustment
              </button>
            </div>
          </form>
        )}
      </Modal>

      {/* Modal 2: Create Purchase Order */}
      <Modal
        isOpen={createPoModal.isOpen}
        onClose={() => createPoModal.close()}
        maxWidth="xl"
        isDarkMode={isDarkMode}
        icon={<ShoppingCart className="w-5 h-5" />}
        title="Issue Purchase Order"
        subtitle="Raise procurement order to supplier"
      >
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
            createPoModal.close();
            setActionSuccess('Purchase order created successfully.');
            const updated = await fetchPurchaseOrders();
            setPurchaseOrders(updated);
          } catch (err: any) {
            setActionError(err.message || 'Failed to create PO.');
          }
        }} className="space-y-4 text-xs font-sans">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={`block text-[11px] font-bold uppercase tracking-wider mb-1.5 ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>Supplier Code</label>
              <input name="supplierCode" required defaultValue="VEND-001" className={`h-11 w-full rounded-xl border px-3 text-xs font-mono outline-none transition-ui ${
                isDarkMode ? 'bg-[#09090B] border-slate-700/80 text-white focus:border-[var(--accent-primary)] focus:ring-2 focus:ring-[var(--accent-ring)]' : 'bg-slate-50 border-slate-300 text-slate-900 focus:border-[var(--accent-primary)] shadow-xs'
              }`} />
            </div>
            <div>
              <label className={`block text-[11px] font-bold uppercase tracking-wider mb-1.5 ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>Supplier Name</label>
              <input name="supplierName" required defaultValue="Mahalaxmi Steel Traders" className={`h-11 w-full rounded-xl border px-3 text-xs outline-none transition-ui ${
                isDarkMode ? 'bg-[#09090B] border-slate-700/80 text-white focus:border-[var(--accent-primary)] focus:ring-2 focus:ring-[var(--accent-ring)]' : 'bg-slate-50 border-slate-300 text-slate-900 focus:border-[var(--accent-primary)] shadow-xs'
              }`} />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={`block text-[11px] font-bold uppercase tracking-wider mb-1.5 ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>Item Code / SKU</label>
              <input name="itemCode" required defaultValue="RAW-ALU-6061-ROD" className={`h-11 w-full rounded-xl border px-3 text-xs font-mono outline-none transition-ui ${
                isDarkMode ? 'bg-[#09090B] border-slate-700/80 text-white focus:border-[var(--accent-primary)] focus:ring-2 focus:ring-[var(--accent-ring)]' : 'bg-slate-50 border-slate-300 text-slate-900 focus:border-[var(--accent-primary)] shadow-xs'
              }`} />
            </div>
            <div>
              <label className={`block text-[11px] font-bold uppercase tracking-wider mb-1.5 ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>Item Description</label>
              <input name="itemDesc" required defaultValue="Aluminium 6061 Round Bar Ø50mm" className={`h-11 w-full rounded-xl border px-3 text-xs outline-none transition-ui ${
                isDarkMode ? 'bg-[#09090B] border-slate-700/80 text-white focus:border-[var(--accent-primary)] focus:ring-2 focus:ring-[var(--accent-ring)]' : 'bg-slate-50 border-slate-300 text-slate-900 focus:border-[var(--accent-primary)] shadow-xs'
              }`} />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className={`block text-[11px] font-bold uppercase tracking-wider mb-1.5 ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>Order Qty</label>
              <input name="qty" type="number" required defaultValue="100" className={`h-11 w-full rounded-xl border px-3 text-xs font-mono outline-none transition-ui ${
                isDarkMode ? 'bg-[#09090B] border-slate-700/80 text-white focus:border-[var(--accent-primary)] focus:ring-2 focus:ring-[var(--accent-ring)]' : 'bg-slate-50 border-slate-300 text-slate-900 focus:border-[var(--accent-primary)] shadow-xs'
              }`} />
            </div>
            <div>
              <label className={`block text-[11px] font-bold uppercase tracking-wider mb-1.5 ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>Unit</label>
              <input name="unit" required defaultValue="KG" className={`h-11 w-full rounded-xl border px-3 text-xs font-mono outline-none transition-ui ${
                isDarkMode ? 'bg-[#09090B] border-slate-700/80 text-white focus:border-[var(--accent-primary)] focus:ring-2 focus:ring-[var(--accent-ring)]' : 'bg-slate-50 border-slate-300 text-slate-900 focus:border-[var(--accent-primary)] shadow-xs'
              }`} />
            </div>
            <div>
              <label className={`block text-[11px] font-bold uppercase tracking-wider mb-1.5 ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>Unit Rate (₹)</label>
              <input name="rate" type="number" required defaultValue="280" className={`h-11 w-full rounded-xl border px-3 text-xs font-mono outline-none transition-ui ${
                isDarkMode ? 'bg-[#09090B] border-slate-700/80 text-white focus:border-[var(--accent-primary)] focus:ring-2 focus:ring-[var(--accent-ring)]' : 'bg-slate-50 border-slate-300 text-slate-900 focus:border-[var(--accent-primary)] shadow-xs'
              }`} />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={`block text-[11px] font-bold uppercase tracking-wider mb-1.5 ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>Exp Delivery Date</label>
              <input name="deliveryDate" type="date" required defaultValue="2026-08-30" className={`h-11 w-full rounded-xl border px-3 text-xs font-mono outline-none transition-ui ${
                isDarkMode ? 'bg-[#09090B] border-slate-700/80 text-white focus:border-[var(--accent-primary)] focus:ring-2 focus:ring-[var(--accent-ring)]' : 'bg-slate-50 border-slate-300 text-slate-900 focus:border-[var(--accent-primary)] shadow-xs'
              }`} />
            </div>
            <div>
              <label className={`block text-[11px] font-bold uppercase tracking-wider mb-1.5 ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>Notes</label>
              <input name="notes" defaultValue="Standard factory delivery" className={`h-11 w-full rounded-xl border px-3 text-xs outline-none transition-ui ${
                isDarkMode ? 'bg-[#09090B] border-slate-700/80 text-white placeholder:text-slate-500 focus:border-[var(--accent-primary)] focus:ring-2 focus:ring-[var(--accent-ring)]' : 'bg-slate-50 border-slate-300 text-slate-900 placeholder:text-slate-400 focus:border-[var(--accent-primary)] shadow-xs'
              }`} />
            </div>
          </div>

          <div className={`pt-4 border-t flex justify-end gap-3 font-sans ${isDarkMode ? 'border-slate-800' : 'border-slate-200'}`}>
            <button type="button" onClick={() => createPoModal.close()} className={`px-4 py-2 rounded-xl border text-xs font-bold transition-ui cursor-pointer ${
              isDarkMode ? 'border-slate-700 text-slate-300 hover:bg-slate-800' : 'border-slate-300 text-slate-700 hover:bg-slate-100'
            }`}>Cancel</button>
            <button type="submit" className="px-5 py-2 rounded-xl bg-[var(--accent-primary)] hover:brightness-110 text-white font-bold text-xs cursor-pointer shadow-lg shadow-[var(--accent-shadow)] transition-ui hover:scale-[1.01]">Issue PO</button>
          </div>
        </form>
      </Modal>

      {/* Modal 3: Inward Goods Receipt (GRN) */}
      <Modal
        isOpen={createGrnModal.isOpen}
        onClose={() => createGrnModal.close()}
        maxWidth="xl"
        isDarkMode={isDarkMode}
        icon={<Truck className="w-5 h-5" />}
        title="Inward Goods Receipt (GRN)"
        subtitle="Receive supplier material at gate"
      >
        <GrnReceiptForm
          purchaseOrders={purchaseOrders}
          user={user}
          isDarkMode={isDarkMode}
          onSuccess={async () => {
            createGrnModal.close();
            setActionSuccess('GRN logged successfully at gate.');
            const updated = await fetchGrnList();
            setGrnList(updated);
          }}
          onError={(msg) => setActionError(msg)}
          onCancel={() => createGrnModal.close()}
        />
      </Modal>

      {/* Modal 4: Item Stock Movement History (Chronological Ledger) */}
      <Modal
        isOpen={itemHistoryModal.isOpen && Boolean(selectedItemHistory)}
        onClose={() => {
          setSelectedItemHistory(null);
          itemHistoryModal.close();
        }}
        maxWidth="3xl"
        isDarkMode={isDarkMode}
        icon={<History className="w-5 h-5" />}
        title={`Stock Movement History — ${selectedItemHistory?.itemCode || ''}`}
        subtitle={`${selectedItemHistory?.description || 'Precision Component'} • Chronological Running Balance`}
        footer={
          <div className="w-full flex justify-end">
            <button 
              onClick={() => {
                setSelectedItemHistory(null);
                itemHistoryModal.close();
              }}
              className={`px-5 py-2 rounded-xl border text-xs font-bold transition-ui cursor-pointer ${
                isDarkMode ? 'border-slate-700 text-slate-300 hover:bg-slate-800' : 'border-slate-300 text-slate-700 hover:bg-slate-100'
              }`}
            >
              Close Ledger
            </button>
          </div>
        }
      >
        {selectedItemHistory && (
          <div className="max-h-[60vh] overflow-y-auto space-y-2.5 pr-1 font-mono text-xs">
            {selectedItemHistory.history.map((h) => {
              const isInbound = h.quantityChange > 0;
              const isCorrection = h.movementType === 'CORRECTION';
              const isAdjustment = h.movementType === 'ADJUSTMENT';

              return (
                <div 
                  key={h.id}
                  className={`p-3.5 rounded-xl border flex items-center justify-between gap-3 ${
                    isDarkMode ? 'bg-[#09090B] border-slate-800/90' : 'bg-slate-50 border-slate-200'
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
                      <div className={`font-bold flex items-center gap-2 ${isDarkMode ? 'text-slate-100' : 'text-slate-900'}`}>
                        <span className={isInbound ? 'text-emerald-400 font-black' : 'text-rose-400 font-black'}>
                          {isInbound ? `+${h.quantityChange}` : h.quantityChange}
                        </span>
                        {h.referenceId && (
                          <span className={`text-[10px] px-2 py-0.5 rounded-md font-bold border ${
                            isDarkMode ? 'bg-slate-800 text-slate-300 border-slate-700' : 'bg-slate-100 text-slate-700 border-slate-200'
                          }`}>
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
                    <div className="text-[10px] text-slate-400 uppercase font-bold">Running Balance</div>
                    <div className={`text-sm font-black mt-0.5 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{h.balanceAfter} Units</div>
                    <div className="text-[10px] text-slate-500 mt-0.5">
                      {new Date(h.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                </div>
              );
            })}

            {selectedItemHistory.history.length === 0 && (
              <div className="p-8 text-center text-slate-400">
                No historical movements found for this SKU.
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Modal 5: Reverse / Correct Movement */}
      <Modal
        isOpen={correctMovementModal.isOpen && Boolean(selectedMovementForCorrection)}
        onClose={() => {
          setSelectedMovementForCorrection(null);
          correctMovementModal.close();
        }}
        maxWidth="md"
        isDarkMode={isDarkMode}
        icon={<RotateCcw className="w-5 h-5" />}
        title="Append Correction Movement"
        subtitle="Offset target movement without mutating history"
      >
        {selectedMovementForCorrection && (
          <form onSubmit={handleReverseMovement} className="space-y-4 font-mono text-xs">
            <div className={`p-3.5 rounded-xl border space-y-1.5 ${
              isDarkMode ? 'bg-[#09090B] border-slate-800' : 'bg-slate-50 border-slate-200'
            }`}>
              <div className="text-[10px] text-slate-400 uppercase font-bold">Target Movement</div>
              <div className={`font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                {selectedMovementForCorrection.id} ({selectedMovementForCorrection.itemCode})
              </div>
              <div className="text-amber-400 text-[11px] font-bold">
                Original: {selectedMovementForCorrection.quantityChange > 0 ? `+${selectedMovementForCorrection.quantityChange}` : selectedMovementForCorrection.quantityChange} • Offset: {-selectedMovementForCorrection.quantityChange > 0 ? `+${-selectedMovementForCorrection.quantityChange}` : -selectedMovementForCorrection.quantityChange}
              </div>
            </div>

            <div>
              <label className={`block text-[11px] font-sans font-bold uppercase tracking-wider mb-1.5 ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                Reason for Reversal / Correction *
              </label>
              <input 
                type="text" 
                required 
                value={correctionReason} 
                onChange={(e) => setCorrectionReason(e.target.value)}
                placeholder="e.g. Inward counting error or damaged box returned"
                className={`h-11 w-full rounded-xl border px-3 text-xs outline-none transition-ui ${
                  isDarkMode ? 'bg-[#09090B] border-slate-700/80 text-white placeholder:text-slate-500 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/30' : 'bg-slate-50 border-slate-300 text-slate-900 placeholder:text-slate-400 focus:border-amber-500 shadow-xs'
                }`}
              />
            </div>

            <div className={`pt-4 border-t flex justify-end gap-3 font-sans ${isDarkMode ? 'border-slate-800' : 'border-slate-200'}`}>
              <button type="button" onClick={() => {
                setSelectedMovementForCorrection(null);
                correctMovementModal.close();
              }} className={`px-4 py-2 rounded-xl border text-xs font-bold transition-ui cursor-pointer ${
                isDarkMode ? 'border-slate-700 text-slate-300 hover:bg-slate-800' : 'border-slate-300 text-slate-700 hover:bg-slate-100'
              }`}>Cancel</button>
              <button type="submit" className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs cursor-pointer shadow-md transition-ui hover:scale-[1.01]">
                Append Correction
              </button>
            </div>
          </form>
        )}
      </Modal>

    </div>
  );
};

interface GrnReceiptFormProps {
  purchaseOrders: PurchaseOrder[];
  user: any;
  isDarkMode: boolean;
  onSuccess: () => void;
  onError: (msg: string) => void;
  onCancel: () => void;
}

const GrnReceiptForm: React.FC<GrnReceiptFormProps> = ({
  purchaseOrders,
  user,
  isDarkMode,
  onSuccess,
  onError,
  onCancel
}) => {
  const defaultPo = purchaseOrders[0];
  const [poNo, setPoNo] = useState(defaultPo?.poNo || 'PO-PUR-2026-001');
  const [challanNo, setChallanNo] = useState('CH-GATE-4401');
  const [vendorCode, setVendorCode] = useState(defaultPo?.supplierCode || 'VEND-001');
  const [vendorName, setVendorName] = useState(defaultPo?.supplierName || 'Mahalaxmi Steel Traders');
  const [itemCode, setItemCode] = useState(defaultPo?.items?.[0]?.itemCode || 'RAW-ALU-6061-ROD');
  const [itemDesc, setItemDesc] = useState(defaultPo?.items?.[0]?.itemDescription || 'Aluminium 6061 Round Bar');
  const [receivedQty, setReceivedQty] = useState<number | string>(defaultPo?.items?.[0]?.orderQty ?? 100);
  const [vehicleNo, setVehicleNo] = useState('GJ-03-AX-8910');
  const [unit, setUnit] = useState(defaultPo?.items?.[0]?.unit || 'KG');
  const [remarks, setRemarks] = useState('Material physically verified against MTC.');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Look up matching PO from loaded purchase orders
  const matchedPo = useMemo(() => {
    if (!poNo) return null;
    return purchaseOrders.find(
      p => p.poNo.toLowerCase().trim() === poNo.toLowerCase().trim() || p.id?.toLowerCase().trim() === poNo.toLowerCase().trim()
    ) || null;
  }, [purchaseOrders, poNo]);

  // Look up matching item from PO
  const matchedPoItem = useMemo(() => {
    if (!matchedPo || !matchedPo.items || matchedPo.items.length === 0) return null;
    return matchedPo.items.find(i => i.itemCode?.toLowerCase().trim() === itemCode?.toLowerCase().trim()) || matchedPo.items[0];
  }, [matchedPo, itemCode]);

  // Expected PO Quantity
  const expectedPoQty = useMemo(() => {
    if (matchedPoItem && typeof matchedPoItem.orderQty === 'number') {
      return matchedPoItem.orderQty;
    }
    return 100;
  }, [matchedPoItem]);

  // Evaluate Mismatch using procurement engine
  const mismatchResult = useMemo(() => {
    return evaluateGrnMismatch(expectedPoQty, Number(receivedQty || 0));
  }, [expectedPoQty, receivedQty]);

  const handlePoChange = (selectedPoNo: string) => {
    setPoNo(selectedPoNo);
    const found = purchaseOrders.find(
      p => p.poNo.toLowerCase().trim() === selectedPoNo.toLowerCase().trim() || p.id?.toLowerCase().trim() === selectedPoNo.toLowerCase().trim()
    );
    if (found) {
      if (found.supplierCode) setVendorCode(found.supplierCode);
      if (found.supplierName) setVendorName(found.supplierName);
      if (found.items && found.items.length > 0) {
        setItemCode(found.items[0].itemCode);
        setItemDesc(found.items[0].itemDescription);
        setUnit(found.items[0].unit || 'KG');
        setReceivedQty(found.items[0].orderQty);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    const newGrn: GoodsReceiptNote = {
      grnNo: `GRN-26-${Date.now().toString().slice(-4)}`,
      poNo,
      vendorCode,
      vendorName,
      challanNo,
      challanDate: new Date().toISOString().split('T')[0],
      receivedDate: new Date().toISOString().split('T')[0],
      receivedBy: user?.name || 'Gate Inward Officer',
      status: 'RECEIVED',
      vehicleNo,
      remarks,
      poExpectedQty: expectedPoQty,
      receivedQty: Number(receivedQty || 0),
      isQtyMismatched: mismatchResult.isMismatched,
      mismatchNotes: mismatchResult.isMismatched ? mismatchResult.message : undefined,
      items: [{
        itemCode,
        itemDescription: itemDesc,
        orderedQty: expectedPoQty,
        receivedQty: Number(receivedQty || 0),
        acceptedQty: Number(receivedQty || 0),
        rejectedQty: 0,
        unit,
        unitRate: matchedPoItem?.unitPrice || 280
      }]
    };

    try {
      await insertGrn(newGrn);
      onSuccess();
    } catch (err: any) {
      onError(err.message || 'Failed to log GRN.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 text-xs font-sans">
      {/* Real-Time GRN vs PO Quantity Mismatch Warning Banner */}
      {mismatchResult.isMismatched && (
        <div className={`p-3.5 rounded-2xl border flex items-start gap-3 text-xs ${
          mismatchResult.alertSeverity === 'MAJOR_SHORTAGE'
            ? isDarkMode ? 'bg-rose-950/30 border-rose-500/40 text-rose-300' : 'bg-rose-50 border-rose-300 text-rose-800'
            : isDarkMode ? 'bg-amber-950/30 border-amber-500/40 text-amber-300' : 'bg-amber-50 border-amber-300 text-amber-800'
        }`}>
          <AlertTriangle className={`w-4 h-4 mt-0.5 shrink-0 ${
            mismatchResult.alertSeverity === 'MAJOR_SHORTAGE' ? 'text-rose-500' : 'text-amber-500'
          }`} />
          <div className="space-y-1 flex-1">
            <div className="flex items-center justify-between">
              <span className="font-bold uppercase tracking-wider text-[10px]">
                {mismatchResult.alertSeverity === 'MAJOR_SHORTAGE' && 'Major Quantity Shortage Detected'}
                {mismatchResult.alertSeverity === 'MINOR_SHORTAGE' && 'Minor Quantity Shortage Detected'}
                {mismatchResult.alertSeverity === 'EXCESS_DELIVERY' && 'Excess Delivery Detected'}
              </span>
              <span className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold ${
                mismatchResult.alertSeverity === 'MAJOR_SHORTAGE'
                  ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                  : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
              }`}>
                {mismatchResult.discrepancyQty > 0 ? `+${mismatchResult.discrepancyQty}` : mismatchResult.discrepancyQty} {unit} ({mismatchResult.variancePercentage}%)
              </span>
            </div>
            <p className="text-xs leading-relaxed opacity-90">{mismatchResult.message}</p>
            <div className="text-[11px] font-mono opacity-75">
              PO Expected: <strong className="font-bold">{mismatchResult.poExpectedQty} {unit}</strong> • Delivered: <strong className="font-bold">{mismatchResult.receivedQty} {unit}</strong>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className={`block text-[11px] font-bold uppercase tracking-wider mb-1.5 ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>PO Reference</label>
          <input
            name="poNo"
            required
            value={poNo}
            onChange={(e) => handlePoChange(e.target.value)}
            list="grn-po-options"
            className={`h-11 w-full rounded-xl border px-3 text-xs font-mono outline-none transition-ui ${
              isDarkMode ? 'bg-[#09090B] border-slate-700/80 text-white focus:border-[var(--accent-primary)] focus:ring-2 focus:ring-[var(--accent-ring)]' : 'bg-slate-50 border-slate-300 text-slate-900 focus:border-[var(--accent-primary)] shadow-xs'
            }`}
          />
          {purchaseOrders.length > 0 && (
            <datalist id="grn-po-options">
              {purchaseOrders.map(p => (
                <option key={p.id || p.poNo} value={p.poNo}>
                  {p.supplierName} ({p.items?.[0]?.itemCode || ''})
                </option>
              ))}
            </datalist>
          )}
        </div>
        <div>
          <label className={`block text-[11px] font-bold uppercase tracking-wider mb-1.5 ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>Challan No / Invoice</label>
          <input
            name="challanNo"
            required
            value={challanNo}
            onChange={(e) => setChallanNo(e.target.value)}
            className={`h-11 w-full rounded-xl border px-3 text-xs font-mono outline-none transition-ui ${
              isDarkMode ? 'bg-[#09090B] border-slate-700/80 text-white focus:border-[var(--accent-primary)] focus:ring-2 focus:ring-[var(--accent-ring)]' : 'bg-slate-50 border-slate-300 text-slate-900 focus:border-[var(--accent-primary)] shadow-xs'
            }`}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className={`block text-[11px] font-bold uppercase tracking-wider mb-1.5 ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>Vendor Code</label>
          <input
            name="vendorCode"
            required
            value={vendorCode}
            onChange={(e) => setVendorCode(e.target.value)}
            className={`h-11 w-full rounded-xl border px-3 text-xs font-mono outline-none transition-ui ${
              isDarkMode ? 'bg-[#09090B] border-slate-700/80 text-white focus:border-[var(--accent-primary)] focus:ring-2 focus:ring-[var(--accent-ring)]' : 'bg-slate-50 border-slate-300 text-slate-900 focus:border-[var(--accent-primary)] shadow-xs'
            }`}
          />
        </div>
        <div>
          <label className={`block text-[11px] font-bold uppercase tracking-wider mb-1.5 ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>Vendor Name</label>
          <input
            name="vendorName"
            required
            value={vendorName}
            onChange={(e) => setVendorName(e.target.value)}
            className={`h-11 w-full rounded-xl border px-3 text-xs outline-none transition-ui ${
              isDarkMode ? 'bg-[#09090B] border-slate-700/80 text-white focus:border-[var(--accent-primary)] focus:ring-2 focus:ring-[var(--accent-ring)]' : 'bg-slate-50 border-slate-300 text-slate-900 focus:border-[var(--accent-primary)] shadow-xs'
            }`}
          />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className={`block text-[11px] font-bold uppercase tracking-wider mb-1.5 ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>Item SKU</label>
          <input
            name="itemCode"
            required
            value={itemCode}
            onChange={(e) => setItemCode(e.target.value)}
            className={`h-11 w-full rounded-xl border px-3 text-xs font-mono outline-none transition-ui ${
              isDarkMode ? 'bg-[#09090B] border-slate-700/80 text-white focus:border-[var(--accent-primary)] focus:ring-2 focus:ring-[var(--accent-ring)]' : 'bg-slate-50 border-slate-300 text-slate-900 focus:border-[var(--accent-primary)] shadow-xs'
            }`}
          />
        </div>
        <div>
          <label className={`block text-[11px] font-bold uppercase tracking-wider mb-1.5 ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>Item Desc</label>
          <input
            name="itemDesc"
            required
            value={itemDesc}
            onChange={(e) => setItemDesc(e.target.value)}
            className={`h-11 w-full rounded-xl border px-3 text-xs outline-none transition-ui ${
              isDarkMode ? 'bg-[#09090B] border-slate-700/80 text-white focus:border-[var(--accent-primary)] focus:ring-2 focus:ring-[var(--accent-ring)]' : 'bg-slate-50 border-slate-300 text-slate-900 focus:border-[var(--accent-primary)] shadow-xs'
            }`}
          />
        </div>
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className={`block text-[11px] font-bold uppercase tracking-wider ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>Received Qty</label>
            <span className="text-[10px] font-mono text-slate-400">PO: {expectedPoQty}</span>
          </div>
          <input
            name="qty"
            type="number"
            required
            value={receivedQty}
            onChange={(e) => setReceivedQty(e.target.value === '' ? '' : Number(e.target.value))}
            className={`h-11 w-full rounded-xl border px-3 text-xs font-mono outline-none transition-ui ${
              isDarkMode ? 'bg-[#09090B] border-slate-700/80 text-white focus:border-[var(--accent-primary)] focus:ring-2 focus:ring-[var(--accent-ring)]' : 'bg-slate-50 border-slate-300 text-slate-900 focus:border-[var(--accent-primary)] shadow-xs'
            }`}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className={`block text-[11px] font-bold uppercase tracking-wider mb-1.5 ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>Vehicle / Transporter</label>
          <input
            name="vehicleNo"
            value={vehicleNo}
            onChange={(e) => setVehicleNo(e.target.value)}
            className={`h-11 w-full rounded-xl border px-3 text-xs font-mono outline-none transition-ui ${
              isDarkMode ? 'bg-[#09090B] border-slate-700/80 text-white focus:border-[var(--accent-primary)] focus:ring-2 focus:ring-[var(--accent-ring)]' : 'bg-slate-50 border-slate-300 text-slate-900 focus:border-[var(--accent-primary)] shadow-xs'
            }`}
          />
        </div>
        <div>
          <label className={`block text-[11px] font-bold uppercase tracking-wider mb-1.5 ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>Unit</label>
          <input
            name="unit"
            value={unit}
            onChange={(e) => setUnit(e.target.value)}
            className={`h-11 w-full rounded-xl border px-3 text-xs font-mono outline-none transition-ui ${
              isDarkMode ? 'bg-[#09090B] border-slate-700/80 text-white focus:border-[var(--accent-primary)] focus:ring-2 focus:ring-[var(--accent-ring)]' : 'bg-slate-50 border-slate-300 text-slate-900 focus:border-[var(--accent-primary)] shadow-xs'
            }`}
          />
        </div>
      </div>

      <div>
        <label className={`block text-[11px] font-bold uppercase tracking-wider mb-1.5 ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>Gate Inspection Remarks</label>
        <input
          name="remarks"
          value={remarks}
          onChange={(e) => setRemarks(e.target.value)}
          placeholder="Material physically verified against MTC."
          className={`h-11 w-full rounded-xl border px-3 text-xs outline-none transition-ui ${
            isDarkMode ? 'bg-[#09090B] border-slate-700/80 text-white placeholder:text-slate-500 focus:border-[var(--accent-primary)] focus:ring-2 focus:ring-[var(--accent-ring)]' : 'bg-slate-50 border-slate-300 text-slate-900 placeholder:text-slate-400 focus:border-[var(--accent-primary)] shadow-xs'
          }`}
        />
      </div>

      <div className={`pt-4 border-t flex justify-end gap-3 font-sans ${isDarkMode ? 'border-slate-800' : 'border-slate-200'}`}>
        <button
          type="button"
          onClick={onCancel}
          className={`px-4 py-2 rounded-xl border text-xs font-bold transition-ui cursor-pointer ${
            isDarkMode ? 'border-slate-700 text-slate-300 hover:bg-slate-800' : 'border-slate-300 text-slate-700 hover:bg-slate-100'
          }`}
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          className="px-5 py-2 rounded-xl bg-[var(--accent-primary)] hover:brightness-110 text-white font-bold text-xs cursor-pointer shadow-lg shadow-[var(--accent-shadow)] transition-ui hover:scale-[1.01] disabled:opacity-50"
        >
          {isSubmitting ? 'Logging...' : 'Log GRN Inward'}
        </button>
      </div>
    </form>
  );
};

export default InventoryView;
