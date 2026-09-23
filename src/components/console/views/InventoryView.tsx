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
  TrendingUp,
  Sparkles,
  Minus,
  Check,
  Filter
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
import { useAccentTheme } from '../../../context/AccentThemeContext';
import { Modal } from '../../common/Modal';
import { useUrlModal } from '../../../hooks/useUrlModal';
import { evaluateGrnMismatch, evaluatePoAging } from '../../../utils/procurementEngine';

/**
 * Formats numbers/quantities rounded to at most 2 decimal places with locale formatting.
 * e.g., 12.3456 -> "12.35", 100 -> "100", 12.3 -> "12.3"
 */
const formatDecimal = (val: number | string | null | undefined, maxDecimals = 2): string => {
  if (val === null || val === undefined || val === '') return '0';
  const num = Number(val);
  if (isNaN(num)) return String(val);
  return Number(num.toFixed(maxDecimals)).toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: maxDecimals
  });
};

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
  const { accent } = useAccentTheme();
  const isBrandAccent = accent === 'brand';
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
  const [adjustItemSearch, setAdjustItemSearch] = useState<string>('');
  const [adjustCategoryFilter, setAdjustCategoryFilter] = useState<InventoryCategoryKey>('ALL');
  const [isItemPickerOpen, setIsItemPickerOpen] = useState<boolean>(false);

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

  // Filtered stock list specifically for the Adjust Stock modal search and category pills
  const modalFilteredStocks = useMemo(() => {
    return stockMasterRows.filter(s => {
      const matchesCategory = adjustCategoryFilter === 'ALL' || s.category === adjustCategoryFilter;
      if (!matchesCategory) return false;

      if (!adjustItemSearch.trim()) return true;
      const q = adjustItemSearch.toLowerCase().trim();
      return (
        s.code.toLowerCase().includes(q) ||
        (s.rawCode && s.rawCode.toLowerCase().includes(q)) ||
        (s.partNo && s.partNo.toLowerCase().includes(q)) ||
        (s.categoryLabel && s.categoryLabel.toLowerCase().includes(q)) ||
        s.description.toLowerCase().includes(q)
      );
    });
  }, [stockMasterRows, adjustCategoryFilter, adjustItemSearch]);

  // Filtered reconciliation based on search query
  const filteredReconciliation = useMemo(() => {
    if (!searchQuery.trim()) return reconciliationReport;
    const q = searchQuery.toLowerCase().trim();
    return (reconciliationReport || []).filter(
      r => r.itemCode.toLowerCase().includes(q) ||
           r.description.toLowerCase().includes(q) ||
           (r.category && r.category.toLowerCase().includes(q))
    );
  }, [reconciliationReport, searchQuery]);

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

  const handleCloseAdjustModal = () => {
    setSelectedStockForAdjust(null);
    setAdjustQty(0);
    setAdjustItemSearch('');
    setAdjustCategoryFilter('ALL');
    setIsItemPickerOpen(false);
    adjustStockModal.close();
  };

  const handleAdjustSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStockForAdjust) return;
    const newOnHand = Math.max(0, (Number(selectedStockForAdjust.onHand) || 0) + adjustQty);
    try {
      setActionError(null);
      const targetCode = selectedStockForAdjust.rawCode || selectedStockForAdjust.code;
      await onAdjustStock(targetCode, newOnHand, adjustReason);
      setActionSuccess(`Stock adjusted for ${selectedStockForAdjust.code} (${selectedStockForAdjust.description}) to ${newOnHand} ${selectedStockForAdjust.unit}`);
      handleCloseAdjustModal();
    } catch (err: any) {
      setActionError(err?.message || 'Failed to adjust stock. Check your role permissions.');
    }
  };

  const renderCategoryBadge = (categoryKey?: string, categoryLabel?: string) => {
    const cat = INVENTORY_CATEGORIES.find(c => c.key === categoryKey) || INVENTORY_CATEGORIES[6];
    return (
      <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-tight border ${
        isDarkMode 
          ? `${cat.badgeBgDark} ${cat.badgeTextDark} ${cat.badgeBorderDark}`
          : `${cat.badgeBgLight} ${cat.badgeTextLight} ${cat.badgeBorderLight}`
      }`}>
        <span className="w-1.5 h-1.5 rounded-full bg-current opacity-80" />
        <span>{categoryLabel || cat.label}</span>
      </span>
    );
  };

  const renderStockStatusBadge = (stk: StockItem) => {
    const isShortage = stk.status === 'SHORTAGE' || (stk.shortage || 0) > 0 || (stk.available || 0) < 0;
    const isReorder = !isShortage && (stk.reorderLevel || 0) > 0 && (stk.available || 0) <= (stk.reorderLevel || 0);

    if (isShortage) {
      return (
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-tight border ${
          isDarkMode ? 'bg-rose-500/15 text-rose-400 border-rose-500/30' : 'bg-rose-50 text-rose-700 border-rose-200'
        }`}>
          <span className="relative flex h-1.5 w-1.5 shrink-0">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-rose-500" />
          </span>
          <span>Shortage Alert</span>
        </span>
      );
    }

    if (isReorder) {
      return (
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-tight border ${
          isDarkMode ? 'bg-amber-500/15 text-amber-400 border-amber-500/30' : 'bg-amber-50 text-amber-800 border-amber-200'
        }`}>
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
          <span>Reorder Soon</span>
        </span>
      );
    }

    return (
      <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-tight border ${
        isDarkMode ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' : 'bg-emerald-50 text-emerald-700 border-emerald-200'
      }`}>
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
        <span>In Stock</span>
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
    <div
      data-accent={isBrandAccent ? 'brand' : undefined}
      className={`space-y-4 sm:space-y-6 font-sans select-none pb-4 brand-theme-container ${
        isBrandAccent ? 'brand-theme-active' : ''
      }`}
    >
      {/* Brand Accent Banner & Pill (Shown ONLY when accent is set to 'Brand Colors') */}
      {isBrandAccent && (
        <div
          className={`p-3.5 sm:p-4 rounded-2xl border flex items-center justify-between gap-3.5 backdrop-blur-xl transition-all ${
            isDarkMode
              ? 'bg-[#121815]/95 border-emerald-500/20 text-white shadow-[0_8px_32px_rgba(0,0,0,0.45)]'
              : 'bg-[#F2F8F6] border-emerald-600/20 text-[#121815] shadow-[0_4px_24px_rgba(10,126,88,0.06)]'
          }`}
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#109367] to-[#086B4A] text-white flex items-center justify-center shrink-0 shadow-sm shadow-emerald-900/40">
              <Sparkles className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold tracking-tight">Synthesis Brand Theme</span>
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-medium border ${
                    isDarkMode
                      ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                      : 'bg-emerald-100 text-emerald-800 border-emerald-200'
                  }`}
                >
                  Active on Inventory
                </span>
              </div>
              <p className={`text-[11px] truncate mt-0.5 ${isDarkMode ? 'text-slate-400' : 'text-[#5E827B]'}`}>
                Deep Teal (#0A7E58) • Slate Grey (#5E827B) • Pale Aqua (#F2F8F6) • Black Forest (#121815)
              </p>
            </div>
          </div>
          <div className="hidden sm:flex items-center gap-2 shrink-0">
            <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-mono font-medium border border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <span className="w-2 h-2 rounded-full bg-[#0A7E58]" />
              Deep Teal
            </span>
            <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-mono font-medium border border-slate-500/20 bg-slate-500/10 text-slate-600 dark:text-slate-300">
              <span className="w-2 h-2 rounded-full bg-[#5E827B]" />
              Slate Grey
            </span>
          </div>
        </div>
      )}

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
                className={`min-h-[40px] px-3.5 py-2 rounded-xl text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer shrink-0 active:scale-[0.96] transition-transform font-mono ${
                  isBrandAccent
                    ? 'brand-btn-primary'
                    : 'bg-gradient-to-r from-[var(--accent-gradient-from)] to-[var(--accent-gradient-to)] shadow-md'
                }`}
              >
                <SlidersHorizontal className="w-3.5 h-3.5" />
                <span>Adjust</span>
              </button>
            )}
            {subTab === 'purchases' && (
              <button
                onClick={() => createPoModal.open()}
                className={`min-h-[40px] px-3.5 py-2 rounded-xl text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer shrink-0 active:scale-[0.96] transition-transform font-mono ${
                  isBrandAccent
                    ? 'brand-btn-primary'
                    : 'bg-gradient-to-r from-[var(--accent-gradient-from)] to-[var(--accent-gradient-to)] shadow-md'
                }`}
              >
                <Plus className="w-3.5 h-3.5" />
                <span>New PO</span>
              </button>
            )}
            {subTab === 'grn' && (
              <button
                onClick={() => createGrnModal.open()}
                className={`min-h-[40px] px-3.5 py-2 rounded-xl text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer shrink-0 active:scale-[0.96] transition-transform font-mono ${
                  isBrandAccent
                    ? 'brand-btn-primary'
                    : 'bg-gradient-to-r from-[var(--accent-gradient-from)] to-[var(--accent-gradient-to)] shadow-md'
                }`}
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
              {formatDecimal(totalOnHand)} Units
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
        {/* Apple macOS Frosted Header & Integrated Metrics */}
        <section className={`overflow-hidden rounded-2xl border transition-all ${
          isDarkMode
            ? 'border-white/10 bg-gradient-to-b from-[#111318] via-[#090a0d] to-[#020204] text-white shadow-[0_16px_44px_rgba(0,0,0,0.6),inset_0_1px_0_0_rgba(255,255,255,0.06)]'
            : 'border-[#155dfc]/30 bg-gradient-to-b from-[#1b64ff] via-[#155dfc] to-[#0f52dc] text-white shadow-[0_16px_40px_rgba(21,93,252,0.25)]'
        }`}>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 px-6 py-6 sm:py-7">
            <div className="min-w-0 space-y-1.5">
              <div className="flex items-center gap-2.5">
                <span className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold tracking-wide ${
                  isDarkMode
                    ? 'bg-white/10 border border-white/15 text-white'
                    : 'bg-white/20 border border-white/30 backdrop-blur-md text-white shadow-xs'
                }`}>
                  <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span>Store & Material Telemetry</span>
                </span>
                <span className="text-sm font-semibold text-white/80">•</span>
                <span className="text-xs sm:text-sm font-semibold text-white/95">
                  {stockMasterRows.length} Active SKUs
                </span>
              </div>

              <h1 className="text-3xl sm:text-[32px] font-black tracking-tight text-white leading-tight">
                Inventory & Store Ledger
              </h1>

              <p className="text-xs sm:text-sm text-white/95 font-medium leading-relaxed max-w-2xl">
                Physical store inventory, Goods Receipt (GRN), immutable stock movements, and governed Purchase Orders.
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
                  className={`inline-flex items-center gap-2 px-5 py-3 rounded-full text-xs sm:text-sm font-bold shadow-md transition-all active:scale-95 cursor-pointer shrink-0 ${
                    isDarkMode
                      ? 'bg-white hover:bg-slate-100 text-slate-950 shadow-black/40'
                      : 'bg-white hover:bg-slate-50 text-[#155dfc] shadow-[0_4px_16px_rgba(0,0,0,0.15)] hover:shadow-[0_6px_20px_rgba(0,0,0,0.2)]'
                  }`}
                >
                  <SlidersHorizontal className="h-4 w-4 stroke-[2.5]" />
                  <span>Adjust Stock</span>
                </button>
              )}
              {subTab === 'purchases' && (
                <button
                  onClick={() => createPoModal.open()}
                  className={`inline-flex items-center gap-2 px-5 py-3 rounded-full text-xs sm:text-sm font-bold shadow-md transition-all active:scale-95 cursor-pointer shrink-0 ${
                    isDarkMode
                      ? 'bg-white hover:bg-slate-100 text-slate-950 shadow-black/40'
                      : 'bg-white hover:bg-slate-50 text-[#155dfc] shadow-[0_4px_16px_rgba(0,0,0,0.15)] hover:shadow-[0_6px_20px_rgba(0,0,0,0.2)]'
                  }`}
                >
                  <Plus className="h-4 w-4 stroke-[3]" />
                  <span>Create Purchase Order</span>
                </button>
              )}
              {subTab === 'grn' && (
                <button
                  onClick={() => createGrnModal.open()}
                  className={`inline-flex items-center gap-2 px-5 py-3 rounded-full text-xs sm:text-sm font-bold shadow-md transition-all active:scale-95 cursor-pointer shrink-0 ${
                    isDarkMode
                      ? 'bg-white hover:bg-slate-100 text-slate-950 shadow-black/40'
                      : 'bg-white hover:bg-slate-50 text-[#155dfc] shadow-[0_4px_16px_rgba(0,0,0,0.15)] hover:shadow-[0_6px_20px_rgba(0,0,0,0.2)]'
                  }`}
                >
                  <Truck className="h-4 w-4 stroke-[2.5]" />
                  <span>Receive Material (GRN)</span>
                </button>
              )}
            </div>
          </div>

          {/* Integrated 4-Column Metric Strip (border-t) */}
          <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 border-t ${
            isDarkMode
              ? 'border-white/10 bg-gradient-to-b from-black/40 to-black/70 backdrop-blur-md'
              : 'border-white/20 bg-white/[0.06] backdrop-blur-sm'
          }`}>
            {[
              {
                label: 'Total SKUs',
                value: String(stockMasterRows.length),
                detail: 'Active catalog parts',
                icon: Package,
                iconColor: isDarkMode ? 'text-white' : 'text-[#155dfc]',
                iconBg: isDarkMode ? 'bg-blue-600 shadow-xs' : 'bg-white shadow-xs',
              },
              {
                label: 'Total On-Hand Qty',
                value: formatDecimal(totalOnHand),
                detail: 'Physical warehouse units',
                icon: Box,
                iconColor: 'text-white',
                iconBg: 'bg-emerald-500 shadow-xs',
              },
              {
                label: 'Shortage Items',
                value: String(shortageCount),
                detail: 'Production deficit alerts',
                icon: AlertTriangle,
                iconColor: 'text-white',
                iconBg: 'bg-rose-500 shadow-xs',
              },
              {
                label: 'Below Reorder Point',
                value: String(reorderCount),
                detail: 'Procurement action req',
                icon: TrendingDown,
                iconColor: 'text-white',
                iconBg: 'bg-amber-500 shadow-xs',
              },
            ].map((metric, index) => {
              const MetricIcon = metric.icon;
              return (
                <div
                  key={metric.label}
                  className={`flex items-center gap-4 px-6 py-5 transition-all ${
                    index > 0 ? (isDarkMode ? 'lg:border-l border-white/10' : 'lg:border-l border-white/20') : ''
                  }`}
                >
                  <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${metric.iconBg} ${metric.iconColor}`}>
                    <MetricIcon className="h-5 w-5 stroke-[2.5]" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-bold uppercase tracking-wider text-white/85">
                      {metric.label}
                    </div>
                    <div className="text-2xl sm:text-[26px] font-black tracking-tight text-white tabular-nums my-0.5 leading-tight">
                      {metric.value}
                    </div>
                    <div className="text-xs font-medium text-white/90 truncate">
                      {metric.detail}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Apple macOS Style Pro Command Deck / Filters */}
        <div className={`rounded-2xl border p-3.5 space-y-3 transition-all backdrop-blur-xl ${
          isDarkMode
            ? 'border-white/10 bg-gradient-to-b from-[#111318] via-[#090a0d] to-[#020204] shadow-[0_8px_28px_rgba(0,0,0,0.5),inset_0_1px_0_0_rgba(255,255,255,0.06)]'
            : 'border-slate-200/80 bg-gradient-to-b from-white/95 via-slate-50/90 to-slate-100/70 shadow-[0_2px_12px_rgba(0,0,0,0.03),inset_0_1px_0_0_rgba(255,255,255,0.9)]'
        }`}>
          {/* Top Tier: Apple Segmented Module Tabs Rail */}
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className={`inline-flex items-center p-1 rounded-xl border text-xs overflow-x-auto max-w-full ${
              isDarkMode ? 'border-white/10 bg-black/60' : 'border-slate-200/80 bg-slate-200/50 shadow-inner'
            }`}>
              {[
                { id: 'stock', label: 'Stock Master', count: stockMasterRows.length },
                { id: 'movements', label: 'Movement Ledger', count: movements.length },
                { id: 'reconciliation', label: 'Stock Reconciliation', count: reconciliationReport.length },
                { id: 'shortages', label: 'Shortages', count: shortageCount, alert: shortageCount > 0 },
                { id: 'purchases', label: 'Purchase Orders', count: purchaseOrders.length },
                { id: 'grn', label: 'Goods-in (GRN)', count: grnList.length },
              ].map(t => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setSubTab(t.id as any)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                    subTab === t.id
                      ? isDarkMode ? 'bg-white/15 text-white shadow-xs border border-white/10' : 'bg-white text-slate-900 shadow-xs border border-slate-200/80'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <span>{t.label}</span>
                  <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full ${
                    subTab === t.id
                      ? t.alert ? (isDarkMode ? 'bg-rose-500/30 text-rose-300' : 'bg-rose-50 text-rose-700') : (isDarkMode ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-800')
                      : isDarkMode ? 'bg-white/5 text-slate-400' : 'bg-slate-300/60 text-slate-600'
                  }`}>
                    {t.count}
                  </span>
                </button>
              ))}
            </div>

            {/* Quick status counter & clear search */}
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 dark:text-slate-400">
              <span className="hidden sm:inline">
                Showing <strong className="text-slate-900 dark:text-white">{subTab === 'stock' ? filteredStock.length : (subTab === 'shortages' ? shortages.length : (subTab === 'purchases' ? purchaseOrders.length : (subTab === 'grn' ? grnList.length : (subTab === 'movements' ? movements.length : filteredReconciliation.length))))}</strong> records
              </span>
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                >
                  <X className="w-3 h-3" />
                  <span>Clear Search</span>
                </button>
              )}
            </div>
          </div>

          {/* Bottom Tier: Apple Spotlight Search Bar */}
          <div className="flex items-center gap-2.5 flex-wrap">
            <div className={`flex h-10 min-w-[280px] flex-1 items-center gap-2.5 rounded-xl border px-3 transition-all ${
              isDarkMode
                ? 'border-white/10 bg-black/60 text-white focus-within:border-white/30 focus-within:bg-black/90'
                : 'border-slate-200/90 bg-white text-slate-900 shadow-2xs focus-within:border-slate-400 focus-within:ring-2 focus-within:ring-slate-200/60'
            }`}>
              <Search className="h-4 w-4 shrink-0 text-slate-400" />
              <input
                type="text"
                placeholder="Search Part Code, Description, Catalog ID, PO, Vendor..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-full w-full bg-transparent text-xs font-medium outline-none placeholder:text-slate-400"
              />
              <span className="hidden sm:inline-block text-[10px] font-mono text-slate-400 border border-slate-200 dark:border-white/10 px-1.5 py-0.5 rounded bg-slate-50 dark:bg-white/5">
                ⌘F
              </span>
              {searchQuery && (
                <button type="button" onClick={() => setSearchQuery('')} className="text-slate-400 hover:text-slate-600 dark:hover:text-white p-0.5 cursor-pointer">
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 1. Main Stock Table */}
      {subTab === 'stock' && (
        <div className="space-y-4">
          {/* Category Filter Tabs Bar */}
          <div className={`p-2 rounded-2xl border flex items-center gap-1.5 overflow-x-auto scrollbar-none transition-all ${
            isDarkMode
              ? 'border-white/10 bg-gradient-to-b from-[#111318] via-[#090a0d] to-[#020204]'
              : 'border-slate-200/80 bg-gradient-to-b from-white/95 via-slate-50/90 to-slate-100/70 shadow-[0_2px_12px_rgba(0,0,0,0.03)]'
          }`}>
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 px-2 shrink-0">
              Category:
            </div>
            <div className="flex items-center gap-1.5">
              {INVENTORY_CATEGORIES.map(cat => {
                const isActive = selectedCategory === cat.key;
                const count = categoryCounts[cat.key] || 0;
                return (
                  <button
                    key={cat.key}
                    onClick={() => setSelectedCategory(cat.key)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap border ${
                      isActive
                        ? isDarkMode 
                          ? 'bg-white/15 text-white border-white/20 shadow-xs'
                          : 'bg-white text-slate-900 border-slate-200/90 shadow-xs'
                        : isDarkMode
                          ? 'bg-white/[0.03] text-slate-400 border-white/[0.05] hover:text-white hover:bg-white/[0.08]'
                          : 'bg-slate-100/70 text-slate-600 border-slate-200/60 hover:text-slate-900 hover:bg-slate-100'
                    }`}
                  >
                    <span>{cat.label}</span>
                    <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                      isActive
                        ? isDarkMode ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-900'
                        : isDarkMode ? 'bg-white/5 text-slate-400' : 'bg-slate-200/80 text-slate-600'
                    }`}>
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Desktop Stock Master Table */}
          <div className={`hidden md:block overflow-hidden rounded-3xl border transition-all ${
            isDarkMode
              ? 'border-white/[0.08] bg-gradient-to-b from-[#111318] via-[#08090c] to-[#010203] shadow-[0_20px_50px_rgba(0,0,0,0.6),inset_0_1px_0_0_rgba(255,255,255,0.06)]'
              : 'border-slate-200/90 bg-gradient-to-b from-white via-slate-50/40 to-[#f6f8fc] shadow-[0_16px_40px_rgba(15,23,42,0.05),inset_0_1px_0_0_rgba(255,255,255,1)]'
          }`}>
            <div className={`flex items-center justify-between border-b px-6 py-4.5 transition-all ${
              isDarkMode
                ? 'border-white/[0.08] bg-gradient-to-r from-black/60 via-black/30 to-black/60'
                : 'border-slate-200/80 bg-gradient-to-r from-slate-50/90 via-white/60 to-slate-50/90'
            }`}>
              <div className="flex items-center gap-3.5">
                <div className={`flex h-10 w-10 items-center justify-center rounded-2xl shadow-xs ${
                  isDarkMode ? 'bg-white/10 text-white border border-white/10' : 'bg-slate-900 text-white shadow-2xs'
                }`}>
                  <Package className="h-5 w-5 stroke-[2]" />
                </div>
                <div>
                  <div className="text-base font-black tracking-tight text-slate-900 dark:text-white">
                    Store Inventory Master
                  </div>
                  <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
                    Real-time on-hand, reserved, and available material balance
                  </div>
                </div>
              </div>
              <span className={`rounded-full border px-3 py-1 font-mono text-xs font-bold tracking-tight ${
                isDarkMode ? 'border-white/10 bg-black/60 text-slate-300' : 'border-slate-200 bg-white text-slate-700 shadow-2xs'
              }`}>
                {filteredStock.length} items
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse font-sans">
                <thead>
                  <tr className={`border-b text-[11px] font-bold uppercase tracking-wider transition-all ${
                    isDarkMode
                      ? 'border-white/[0.07] bg-gradient-to-b from-black/80 to-black/60 text-slate-400'
                      : 'border-slate-200/90 bg-gradient-to-b from-slate-100/90 to-slate-50/90 text-slate-600'
                  }`}>
                    <th className="py-4 px-6">Part Code</th>
                    <th className="py-4 px-6">Category</th>
                    <th className="py-4 px-6">Description</th>
                    <th className="py-4 px-6 text-right">On Hand</th>
                    <th className="py-4 px-6 text-right">Reserved</th>
                    <th className="py-4 px-6 text-right">Available</th>
                    <th className="py-4 px-6 text-right">Demand</th>
                    <th className="py-4 px-6 text-right">Reorder Level</th>
                    <th className="py-4 px-6 text-center">Status</th>
                    <th className="py-4 px-6 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className={`divide-y text-xs transition-colors ${
                  isDarkMode ? 'divide-white/[0.04]' : 'divide-slate-200/70'
                }`}>
                  {filteredStock.map((stk) => {
                    const isShort = stk.status === 'SHORTAGE' || (stk.shortage || 0) > 0;
                    return (
                      <tr 
                        key={stk.code}
                        className={`group transition-all duration-150 ${
                          isDarkMode
                            ? 'even:bg-white/[0.015] hover:bg-gradient-to-r hover:from-white/[0.06] hover:via-white/[0.02] hover:to-transparent'
                            : 'even:bg-slate-50/50 hover:bg-gradient-to-r hover:from-blue-500/[0.05] hover:via-indigo-500/[0.03] hover:to-transparent'
                        }`}
                      >
                        <td className="py-4.5 px-6">
                          <div className="flex items-center gap-3.5">
                            <div className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-105 shadow-2xs ${
                              isShort
                                ? isDarkMode ? 'bg-rose-500/15 text-rose-400 border border-rose-500/30' : 'bg-rose-50 text-rose-600 border border-rose-200'
                                : isDarkMode ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' : 'bg-blue-50 text-blue-600 border border-blue-200/70'
                            }`}>
                              <Package className="w-5 h-5 stroke-[2]" />
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className={`font-mono text-sm tracking-tight ${
                                  isShort 
                                    ? 'text-rose-600 dark:text-rose-400 font-black' 
                                    : 'text-slate-900 dark:text-white font-black'
                                }`}>
                                  {stk.code}
                                </span>
                                {stk.rawCode && stk.rawCode !== stk.code && (
                                  <span 
                                    className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-tight border ${
                                      isDarkMode 
                                        ? 'bg-white/[0.06] text-slate-300 border-white/10' 
                                        : 'bg-slate-100 text-slate-700 border-slate-200'
                                    }`} 
                                    title={`Catalog Master Code: ${stk.rawCode}`}
                                  >
                                    {stk.rawCode}
                                  </span>
                                )}
                              </div>
                              {stk.partNo && stk.partNo !== stk.code && (
                                <div className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate max-w-[320px] mt-1">
                                  Part #{stk.partNo}
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="py-4 px-6">
                          {renderCategoryBadge(stk.category, stk.categoryLabel)}
                        </td>
                        <td className={`py-4 px-6 font-semibold ${isDarkMode ? 'text-slate-100' : 'text-slate-800'}`}>
                          <div>{stk.description}</div>
                          {stk.partNo && stk.partNo !== stk.description && (
                            <div className="text-[11px] text-slate-400 font-mono mt-0.5">{stk.partNo}</div>
                          )}
                        </td>
                        <td className={`py-4 px-6 text-right font-bold font-mono ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                          {formatDecimal(stk.onHand)} {stk.unit}
                        </td>
                        <td className="py-4 px-6 text-right font-mono text-slate-400">
                          {formatDecimal(stk.reserved)}
                        </td>
                        <td className="py-4 px-6 text-right font-bold font-mono text-emerald-500">
                          {formatDecimal(stk.available)}
                        </td>
                        <td className="py-4 px-6 text-right font-mono text-amber-500 font-semibold">
                          {formatDecimal(stk.demand)}
                        </td>
                        <td className="py-4 px-6 text-right font-mono text-slate-400">
                          {formatDecimal(stk.reorderLevel)}
                        </td>
                        <td className="py-4.5 px-6 text-center">
                          {renderStockStatusBadge(stk)}
                        </td>
                        <td className="py-4 px-6 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={() => {
                                setSelectedStockForAdjust(stk);
                                adjustStockModal.open({ itemId: stk.code });
                              }}
                              className={`px-3 py-1.5 rounded-xl font-mono text-xs font-bold transition-all cursor-pointer ${
                                isDarkMode 
                                  ? 'bg-white/10 hover:bg-white/15 text-white border border-white/15' 
                                  : 'bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200'
                              }`}
                            >
                              Adjust
                            </button>
                            <button
                              onClick={() => handleOpenItemHistory(stk)}
                              className={`p-1.5 rounded-xl border transition-all cursor-pointer ${
                                isDarkMode ? 'border-white/10 bg-white/5 text-slate-400 hover:text-white hover:bg-white/10' : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
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
                        <span className="font-mono text-sm tracking-tight text-slate-900 dark:text-white font-black">
                          {stk.code}
                        </span>
                        {renderCategoryBadge(stk.category, stk.categoryLabel)}
                        {stk.rawCode && stk.rawCode !== stk.code && (
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-tight border ${
                            isDarkMode ? 'bg-white/[0.06] text-slate-300 border-white/10' : 'bg-slate-100 text-slate-700 border-slate-200'
                          }`}>
                            {stk.rawCode}
                          </span>
                        )}
                      </div>
                      {renderStockStatusBadge(stk)}
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
                        {formatDecimal(stk.onHand)} {stk.unit}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 uppercase block">Available</span>
                      <span className="font-bold text-emerald-500">{formatDecimal(stk.available)} {stk.unit}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 uppercase block">Reserved</span>
                      <span className="font-bold text-slate-400">{formatDecimal(stk.reserved)} {stk.unit}</span>
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
        <div className={`overflow-hidden rounded-3xl border transition-all ${
          isDarkMode
            ? 'border-white/[0.08] bg-gradient-to-b from-[#111318] via-[#08090c] to-[#010203] shadow-[0_20px_50px_rgba(0,0,0,0.6),inset_0_1px_0_0_rgba(255,255,255,0.06)]'
            : 'border-slate-200/90 bg-gradient-to-b from-white via-slate-50/40 to-[#f6f8fc] shadow-[0_16px_40px_rgba(15,23,42,0.05),inset_0_1px_0_0_rgba(255,255,255,1)]'
        }`}>
          <div className={`flex items-center justify-between border-b px-6 py-4.5 transition-all ${
            isDarkMode
              ? 'border-white/[0.08] bg-gradient-to-r from-black/60 via-black/30 to-black/60'
              : 'border-slate-200/80 bg-gradient-to-r from-slate-50/90 via-white/60 to-slate-50/90'
          }`}>
            <div className="flex items-center gap-3.5">
              <div className={`flex h-10 w-10 items-center justify-center rounded-2xl shadow-xs ${
                isDarkMode ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30' : 'bg-rose-600 text-white shadow-2xs'
              }`}>
                <AlertTriangle className="h-5 w-5 stroke-[2]" />
              </div>
              <div>
                <div className="text-base font-black tracking-tight text-slate-900 dark:text-white">
                  Material Shortages & Deficit Queue
                </div>
                <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
                  Components with active BOM deficit required for releasing jobs
                </div>
              </div>
            </div>
            <span className={`rounded-full border px-3 py-1 font-mono text-xs font-bold tracking-tight ${
              shortages.length > 0
                ? 'border-rose-500/30 bg-rose-500/10 text-rose-400'
                : isDarkMode ? 'border-white/10 bg-black/60 text-slate-300' : 'border-slate-200 bg-white text-slate-700 shadow-2xs'
            }`}>
              {shortages.length} shortages
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse font-sans">
              <thead>
                <tr className={`border-b text-[11px] font-bold uppercase tracking-wider transition-all ${
                  isDarkMode
                    ? 'border-white/[0.07] bg-gradient-to-b from-black/80 to-black/60 text-slate-400'
                    : 'border-slate-200/90 bg-gradient-to-b from-slate-100/90 to-slate-50/90 text-slate-600'
                }`}>
                  <th className="py-4 px-6">Material SKU</th>
                  <th className="py-4 px-6">Description</th>
                  <th className="py-4 px-6 text-right">Required Qty</th>
                  <th className="py-4 px-6 text-right">Available Qty</th>
                  <th className="py-4 px-6 text-right">Deficit / Alert</th>
                  <th className="py-4 px-6 text-center">Action</th>
                </tr>
              </thead>
              <tbody className={`divide-y text-xs transition-colors ${
                isDarkMode ? 'divide-white/[0.04]' : 'divide-slate-200/70'
              }`}>
                {shortages.map(sh => (
                  <tr
                    key={sh.code}
                    className={`group transition-all duration-150 ${
                      isDarkMode
                        ? 'even:bg-white/[0.015] hover:bg-gradient-to-r hover:from-white/[0.06] hover:via-white/[0.02] hover:to-transparent'
                        : 'even:bg-slate-50/50 hover:bg-gradient-to-r hover:from-blue-500/[0.05] hover:via-indigo-500/[0.03] hover:to-transparent'
                    }`}
                  >
                    <td className="py-4.5 px-6">
                      <div className="flex items-center gap-3.5">
                        <div className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-105 shadow-2xs ${
                          isDarkMode ? 'bg-rose-500/15 text-rose-400 border border-rose-500/30' : 'bg-rose-50 text-rose-600 border border-rose-200'
                        }`}>
                          <AlertTriangle className="w-5 h-5 stroke-[2]" />
                        </div>
                        <div className="min-w-0">
                          <span className="font-mono text-sm tracking-tight text-slate-900 dark:text-white font-black">
                            {sh.code}
                          </span>
                          <div className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate max-w-[280px] mt-1">
                            {sh.description}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className={`py-4 px-6 font-semibold ${isDarkMode ? 'text-slate-100' : 'text-slate-800'}`}>{sh.description}</td>
                    <td className="py-4 px-6 text-right font-mono font-bold text-amber-500">{formatDecimal(sh.requiredQty)} {sh.unit}</td>
                    <td className="py-4 px-6 text-right font-mono text-slate-400">{formatDecimal(sh.availableQty)} {sh.unit}</td>
                    <td className="py-4.5 px-6 text-right font-mono">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-tight border ${
                        isDarkMode ? 'bg-rose-500/15 text-rose-400 border-rose-500/30' : 'bg-rose-50 text-rose-700 border-rose-200'
                      }`}>
                        <span className="relative flex h-1.5 w-1.5 shrink-0">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
                          <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-rose-500" />
                        </span>
                        <span>-{formatDecimal(sh.deficit)} {sh.unit}</span>
                      </span>
                    </td>
                    <td className="py-4 px-6 text-center">
                      <button
                        onClick={() => {
                          setSubTab('purchases');
                          createPoModal.open();
                        }}
                        className={`px-3 py-1.5 rounded-xl font-mono text-xs font-bold transition-all cursor-pointer ${
                          isDarkMode
                            ? 'bg-blue-600/20 text-blue-300 hover:bg-blue-600/30 border border-blue-500/30'
                            : 'bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200'
                        }`}
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
        <div className={`overflow-hidden rounded-3xl border transition-all ${
          isDarkMode
            ? 'border-white/[0.08] bg-gradient-to-b from-[#111318] via-[#08090c] to-[#010203] shadow-[0_20px_50px_rgba(0,0,0,0.6),inset_0_1px_0_0_rgba(255,255,255,0.06)]'
            : 'border-slate-200/90 bg-gradient-to-b from-white via-slate-50/40 to-[#f6f8fc] shadow-[0_16px_40px_rgba(15,23,42,0.05),inset_0_1px_0_0_rgba(255,255,255,1)]'
        }`}>
          <div className={`flex items-center justify-between border-b px-6 py-4.5 transition-all ${
            isDarkMode
              ? 'border-white/[0.08] bg-gradient-to-r from-black/60 via-black/30 to-black/60'
              : 'border-slate-200/80 bg-gradient-to-r from-slate-50/90 via-white/60 to-slate-50/90'
          }`}>
            <div className="flex items-center gap-3.5">
              <div className={`flex h-10 w-10 items-center justify-center rounded-2xl shadow-xs ${
                isDarkMode ? 'bg-white/10 text-white border border-white/10' : 'bg-slate-900 text-white shadow-2xs'
              }`}>
                <ShoppingCart className="h-5 w-5 stroke-[2]" />
              </div>
              <div>
                <div className="text-base font-black tracking-tight text-slate-900 dark:text-white">
                  Procurement & Purchase Orders
                </div>
                <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
                  Supplier purchase orders, delivery milestones, and management approvals
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className={`rounded-full border px-3 py-1 font-mono text-xs font-bold tracking-tight ${
                isDarkMode ? 'border-white/10 bg-black/60 text-slate-300' : 'border-slate-200 bg-white text-slate-700 shadow-2xs'
              }`}>
                {purchaseOrders.length} orders
              </span>
              {overduePoCount > 0 && (
                <span className="rounded-full border px-3 py-1 font-mono text-xs font-bold tracking-tight bg-rose-500/10 text-rose-400 border-rose-500/30">
                  {overduePoCount} overdue
                </span>
              )}
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse font-sans">
              <thead>
                <tr className={`border-b text-[11px] font-bold uppercase tracking-wider transition-all ${
                  isDarkMode
                    ? 'border-white/[0.07] bg-gradient-to-b from-black/80 to-black/60 text-slate-400'
                    : 'border-slate-200/90 bg-gradient-to-b from-slate-100/90 to-slate-50/90 text-slate-600'
                }`}>
                  <th className="py-4 px-6">PO Number</th>
                  <th className="py-4 px-6">Supplier Name</th>
                  <th className="py-4 px-6">Order Date</th>
                  <th className="py-4 px-6">Exp. Delivery</th>
                  <th className="py-4 px-6 text-right">Total Amount</th>
                  <th className="py-4 px-6 text-center">Approval</th>
                  <th className="py-4 px-6 text-center">Status</th>
                  <th className="py-4 px-6 text-center">Governance Actions</th>
                </tr>
              </thead>
              <tbody className={`divide-y text-xs transition-colors ${
                isDarkMode ? 'divide-white/[0.04]' : 'divide-slate-200/70'
              }`}>
                {purchaseOrders.map(po => {
                  const aging = evaluatePoAging(po);
                  const isClosed = po.status === 'RECEIVED' || po.status === 'CANCELLED';

                  return (
                    <tr
                      key={po.id || po.poNo}
                      className={`group transition-all duration-150 ${
                        isDarkMode
                          ? 'even:bg-white/[0.015] hover:bg-gradient-to-r hover:from-white/[0.06] hover:via-white/[0.02] hover:to-transparent'
                          : 'even:bg-slate-50/50 hover:bg-gradient-to-r hover:from-blue-500/[0.05] hover:via-indigo-500/[0.03] hover:to-transparent'
                      }`}
                    >
                      <td className="py-4.5 px-6">
                        <div className="flex items-center gap-3.5">
                          <div className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-105 shadow-2xs ${
                            po.status === 'CANCELLED'
                              ? isDarkMode ? 'bg-rose-500/15 text-rose-400 border border-rose-500/30' : 'bg-rose-50 text-rose-600 border border-rose-200'
                              : isDarkMode ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' : 'bg-blue-50 text-blue-600 border border-blue-200/70'
                          }`}>
                            <FileText className="w-5 h-5 stroke-[2]" />
                          </div>
                          <div className="min-w-0">
                            <span className="font-mono text-sm tracking-tight text-slate-900 dark:text-white font-black">
                              {po.poNo}
                            </span>
                            <div className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate max-w-[280px] mt-1">
                              {po.supplierName}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className={`py-4 px-6 font-semibold ${isDarkMode ? 'text-slate-100' : 'text-slate-800'}`}>
                        <div>{po.supplierName}</div>
                        <div className="text-[10px] text-slate-500 font-mono mt-0.5">{po.supplierCode}</div>
                      </td>
                      <td className="py-4 px-6 font-mono text-slate-400">{po.orderDate}</td>
                      <td className="py-4 px-6 font-mono">
                        <div className={isDarkMode ? 'text-slate-300' : 'text-slate-700'}>
                          {po.expectedDeliveryDate || '—'}
                        </div>
                        {!isClosed && (
                          <div className="mt-1">
                            {aging.agingBucket === 'SEVERELY_OVERDUE' ? (
                              <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-tight border ${
                                isDarkMode ? 'bg-rose-500/15 text-rose-400 border-rose-500/30' : 'bg-rose-50 text-rose-700 border-rose-200'
                              }`}>
                                <AlertTriangle className="w-3 h-3 text-rose-500 shrink-0" />
                                <span>Overdue (+{aging.daysOverdue}d)</span>
                              </span>
                            ) : aging.agingBucket === 'OVERDUE' ? (
                              <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-tight border ${
                                isDarkMode ? 'bg-rose-500/15 text-rose-400 border-rose-500/30' : 'bg-rose-50 text-rose-700 border-rose-200'
                              }`}>
                                <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0" />
                                <span>Overdue (+{aging.daysOverdue}d)</span>
                              </span>
                            ) : aging.agingBucket === 'DUE_SOON' ? (
                              <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-tight border ${
                                isDarkMode ? 'bg-amber-500/15 text-amber-400 border-amber-500/30' : 'bg-amber-50 text-amber-800 border-amber-200'
                              }`}>
                                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
                                <span>Due Soon</span>
                              </span>
                            ) : (
                              <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-tight border ${
                                isDarkMode ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              }`}>
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                                <span>On Track</span>
                              </span>
                            )}
                          </div>
                        )}
                      </td>
                      <td className="py-4 px-6 text-right font-mono font-bold text-emerald-500">
                        ₹{formatDecimal(po.totalAmount, 2)}
                      </td>
                      <td className="py-4.5 px-6 text-center">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-tight border ${
                          po.approvalStatus === 'APPROVED'
                            ? isDarkMode ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : po.approvalStatus === 'REJECTED'
                            ? isDarkMode ? 'bg-rose-500/15 text-rose-400 border-rose-500/30' : 'bg-rose-50 text-rose-700 border-rose-200'
                            : isDarkMode ? 'bg-amber-500/15 text-amber-400 border-amber-500/30' : 'bg-amber-50 text-amber-800 border-amber-200'
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                            po.approvalStatus === 'APPROVED' ? 'bg-emerald-500' : po.approvalStatus === 'REJECTED' ? 'bg-rose-500' : 'bg-amber-500'
                          }`} />
                          <span>{po.approvalStatus === 'APPROVED' ? 'Approved' : po.approvalStatus === 'REJECTED' ? 'Rejected' : 'Pending Approval'}</span>
                        </span>
                      </td>
                      <td className="py-4.5 px-6 text-center">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-tight border ${
                          po.status === 'RECEIVED'
                            ? isDarkMode ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : po.status === 'CANCELLED'
                            ? isDarkMode ? 'bg-rose-500/15 text-rose-400 border-rose-500/30' : 'bg-rose-50 text-rose-700 border-rose-200'
                            : po.status === 'ISSUED'
                            ? isDarkMode ? 'bg-blue-500/15 text-blue-400 border-blue-500/30' : 'bg-blue-50 text-blue-700 border-blue-200'
                            : isDarkMode ? 'bg-amber-500/15 text-amber-400 border-amber-500/30' : 'bg-amber-50 text-amber-800 border-amber-200'
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                            po.status === 'RECEIVED' ? 'bg-emerald-500' : po.status === 'CANCELLED' ? 'bg-rose-500' : po.status === 'ISSUED' ? 'bg-blue-500' : 'bg-amber-500'
                          }`} />
                          <span>{po.status === 'RECEIVED' ? 'Received' : po.status === 'CANCELLED' ? 'Cancelled' : po.status === 'ISSUED' ? 'Issued' : 'Draft'}</span>
                        </span>
                      </td>
                      <td className="py-4 px-6 text-center">
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
        <div className={`overflow-hidden rounded-3xl border transition-all ${
          isDarkMode
            ? 'border-white/[0.08] bg-gradient-to-b from-[#111318] via-[#08090c] to-[#010203] shadow-[0_20px_50px_rgba(0,0,0,0.6),inset_0_1px_0_0_rgba(255,255,255,0.06)]'
            : 'border-slate-200/90 bg-gradient-to-b from-white via-slate-50/40 to-[#f6f8fc] shadow-[0_16px_40px_rgba(15,23,42,0.05),inset_0_1px_0_0_rgba(255,255,255,1)]'
        }`}>
          <div className={`flex items-center justify-between border-b px-6 py-4.5 transition-all ${
            isDarkMode
              ? 'border-white/[0.08] bg-gradient-to-r from-black/60 via-black/30 to-black/60'
              : 'border-slate-200/80 bg-gradient-to-r from-slate-50/90 via-white/60 to-slate-50/90'
          }`}>
            <div className="flex items-center gap-3.5">
              <div className={`flex h-10 w-10 items-center justify-center rounded-2xl shadow-xs ${
                isDarkMode ? 'bg-white/10 text-white border border-white/10' : 'bg-slate-900 text-white shadow-2xs'
              }`}>
                <Truck className="h-5 w-5 stroke-[2]" />
              </div>
              <div>
                <div className="text-base font-black tracking-tight text-slate-900 dark:text-white">
                  Goods Receipt Notes (GRN)
                </div>
                <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
                  Inward gate logs, vehicle manifests, and QC verification check-ins
                </div>
              </div>
            </div>
            <span className={`rounded-full border px-3 py-1 font-mono text-xs font-bold tracking-tight ${
              isDarkMode ? 'border-white/10 bg-black/60 text-slate-300' : 'border-slate-200 bg-white text-slate-700 shadow-2xs'
            }`}>
              {grnList.length} receipts
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse font-sans">
              <thead>
                <tr className={`border-b text-[11px] font-bold uppercase tracking-wider transition-all ${
                  isDarkMode
                    ? 'border-white/[0.07] bg-gradient-to-b from-black/80 to-black/60 text-slate-400'
                    : 'border-slate-200/90 bg-gradient-to-b from-slate-100/90 to-slate-50/90 text-slate-600'
                }`}>
                  <th className="py-4 px-6">GRN Number</th>
                  <th className="py-4 px-6">PO Reference</th>
                  <th className="py-4 px-6">Vendor</th>
                  <th className="py-4 px-6">Challan / Vehicle</th>
                  <th className="py-4 px-6">Received Date</th>
                  <th className="py-4 px-6 text-center">QC Status</th>
                  <th className="py-4 px-6 text-center">Gate Action</th>
                </tr>
              </thead>
              <tbody className={`divide-y text-xs transition-colors ${
                isDarkMode ? 'divide-white/[0.04]' : 'divide-slate-200/70'
              }`}>
                {grnList.map(g => (
                  <tr
                    key={g.id || g.grnNo}
                    className={`group transition-all duration-150 ${
                      isDarkMode
                        ? 'even:bg-white/[0.015] hover:bg-gradient-to-r hover:from-white/[0.06] hover:via-white/[0.02] hover:to-transparent'
                        : 'even:bg-slate-50/50 hover:bg-gradient-to-r hover:from-blue-500/[0.05] hover:via-indigo-500/[0.03] hover:to-transparent'
                    }`}
                  >
                    <td className="py-4.5 px-6">
                      <div className="flex items-center gap-3.5">
                        <div className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-105 shadow-2xs ${
                          g.status === 'REJECTED'
                            ? isDarkMode ? 'bg-rose-500/15 text-rose-400 border border-rose-500/30' : 'bg-rose-50 text-rose-600 border border-rose-200'
                            : isDarkMode ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' : 'bg-blue-50 text-blue-600 border border-blue-200/70'
                        }`}>
                          <Truck className="w-5 h-5 stroke-[2]" />
                        </div>
                        <div className="min-w-0">
                          <span className="font-mono text-sm tracking-tight text-slate-900 dark:text-white font-black">
                            {g.grnNo}
                          </span>
                          <div className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate max-w-[280px] mt-1">
                            PO: {g.poNo}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-6 font-mono text-slate-400">{g.poNo}</td>
                    <td className={`py-4 px-6 font-semibold ${isDarkMode ? 'text-slate-100' : 'text-slate-800'}`}>{g.vendorName}</td>
                    <td className="py-4 px-6 font-mono text-slate-400">
                      <div>{g.challanNo}</div>
                      <div className="text-[10px] text-slate-500">{g.vehicleNo || 'Courier'}</div>
                    </td>
                    <td className="py-4 px-6 font-mono text-slate-400">{g.receivedDate}</td>
                    <td className="py-4.5 px-6 text-center">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-tight border ${
                        g.status === 'QC_VERIFIED'
                          ? isDarkMode ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : g.status === 'REJECTED'
                          ? isDarkMode ? 'bg-rose-500/15 text-rose-400 border-rose-500/30' : 'bg-rose-50 text-rose-700 border-rose-200'
                          : isDarkMode ? 'bg-amber-500/15 text-amber-400 border-amber-500/30' : 'bg-amber-50 text-amber-800 border-amber-200'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                          g.status === 'QC_VERIFIED' ? 'bg-emerald-500' : g.status === 'REJECTED' ? 'bg-rose-500' : 'bg-amber-500'
                        }`} />
                        <span>{g.status === 'QC_VERIFIED' ? 'QC Verified' : g.status === 'REJECTED' ? 'QC Rejected' : 'Pending QC'}</span>
                      </span>
                    </td>
                    <td className="py-4 px-6 text-center">
                      {g.status === 'RECEIVED' ? (
                        <button
                          onClick={() => handleGrnStatusChange(g.id || g.grnNo, 'QC_VERIFIED')}
                          className={`px-3 py-1.5 rounded-xl font-mono text-xs font-bold transition-all cursor-pointer ${
                            isDarkMode
                              ? 'bg-white/10 hover:bg-white/15 text-white border border-white/15'
                              : 'bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200'
                          }`}
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
          <div className={`p-4 rounded-2xl border flex items-center justify-between gap-4 flex-wrap transition-all ${
            isDarkMode
              ? 'border-white/10 bg-gradient-to-b from-[#111318] via-[#090a0d] to-[#020204] text-white shadow-[0_8px_28px_rgba(0,0,0,0.5)]'
              : 'border-slate-200/80 bg-gradient-to-b from-white/95 via-slate-50/90 to-slate-100/70 shadow-[0_2px_12px_rgba(0,0,0,0.03)] text-slate-900'
          }`}>
            <div className="flex items-center gap-3">
              <div className={`p-2.5 rounded-2xl ${
                isDarkMode ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
              }`}>
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
                  className={`px-3 py-1.5 rounded-xl text-[10px] font-mono font-bold transition-all cursor-pointer whitespace-nowrap border ${
                    movementTypeFilter === t
                      ? isDarkMode ? 'bg-white/15 text-white border-white/20 shadow-xs' : 'bg-white text-slate-900 border-slate-200/90 shadow-xs'
                      : isDarkMode ? 'bg-white/[0.04] text-slate-400 border-white/[0.06] hover:text-white' : 'bg-slate-100/70 text-slate-600 border-slate-200/60 hover:text-slate-900'
                  }`}
                >
                  {t.replace('_', ' ')}
                </button>
              ))}
            </div>
          </div>

          <div className={`overflow-hidden rounded-3xl border transition-all ${
            isDarkMode
              ? 'border-white/[0.08] bg-gradient-to-b from-[#111318] via-[#08090c] to-[#010203] shadow-[0_20px_50px_rgba(0,0,0,0.6),inset_0_1px_0_0_rgba(255,255,255,0.06)]'
              : 'border-slate-200/90 bg-gradient-to-b from-white via-slate-50/40 to-[#f6f8fc] shadow-[0_16px_40px_rgba(15,23,42,0.05),inset_0_1px_0_0_rgba(255,255,255,1)]'
          }`}>
            <div className={`flex items-center justify-between border-b px-6 py-4.5 transition-all ${
              isDarkMode
                ? 'border-white/[0.08] bg-gradient-to-r from-black/60 via-black/30 to-black/60'
                : 'border-slate-200/80 bg-gradient-to-r from-slate-50/90 via-white/60 to-slate-50/90'
            }`}>
              <div className="flex items-center gap-3.5">
                <div className={`flex h-10 w-10 items-center justify-center rounded-2xl shadow-xs ${
                  isDarkMode ? 'bg-white/10 text-white border border-white/10' : 'bg-slate-900 text-white shadow-2xs'
                }`}>
                  <History className="h-5 w-5 stroke-[2]" />
                </div>
                <div>
                  <div className="text-base font-black tracking-tight text-slate-900 dark:text-white">
                    Immutable Movement Ledger
                  </div>
                  <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
                    Cryptographically verifiable sequence of store additions and subtractions
                  </div>
                </div>
              </div>
              <span className={`rounded-full border px-3 py-1 font-mono text-xs font-bold tracking-tight ${
                isDarkMode ? 'border-white/10 bg-black/60 text-slate-300' : 'border-slate-200 bg-white text-slate-700 shadow-2xs'
              }`}>
                {movements.length} ledger events
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse font-sans">
                <thead>
                  <tr className={`border-b text-[11px] font-bold uppercase tracking-wider transition-all ${
                    isDarkMode
                      ? 'border-white/[0.07] bg-gradient-to-b from-black/80 to-black/60 text-slate-400'
                      : 'border-slate-200/90 bg-gradient-to-b from-slate-100/90 to-slate-50/90 text-slate-600'
                  }`}>
                    <th className="py-4 px-6">Timestamp</th>
                    <th className="py-4 px-6">Part Code</th>
                    <th className="py-4 px-6">Movement Type</th>
                    <th className="py-4 px-6 text-right">Qty Delta</th>
                    <th className="py-4 px-6 text-right">Balance After</th>
                    <th className="py-4 px-6">Reference Doc</th>
                    <th className="py-4 px-6">Actor</th>
                    <th className="py-4 px-6">Notes</th>
                    <th className="py-4 px-6 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className={`divide-y text-xs transition-colors ${
                  isDarkMode ? 'divide-white/[0.04]' : 'divide-slate-200/70'
                }`}>
                  {(Array.isArray(movements) ? movements : [])
                    .filter(m => movementTypeFilter === 'ALL' || m.movementType === movementTypeFilter)
                    .filter(m => !searchQuery || m.itemCode.toLowerCase().includes(searchQuery.toLowerCase()) || m.referenceId?.toLowerCase().includes(searchQuery.toLowerCase()))
                    .map((mov) => {
                      const isInbound = mov.quantityChange > 0;
                      const isCorrection = mov.movementType === 'CORRECTION';
                      const isAdjustment = mov.movementType === 'ADJUSTMENT';

                      return (
                        <tr
                          key={mov.id}
                          className={`group transition-all duration-150 ${
                            isDarkMode
                              ? 'even:bg-white/[0.015] hover:bg-gradient-to-r hover:from-white/[0.06] hover:via-white/[0.02] hover:to-transparent'
                              : 'even:bg-slate-50/50 hover:bg-gradient-to-r hover:from-blue-500/[0.05] hover:via-indigo-500/[0.03] hover:to-transparent'
                          }`}
                        >
                          <td className="py-4.5 px-6 text-slate-400 font-mono text-xs">
                            {new Date(mov.createdAt).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                          </td>
                          <td className="py-4.5 px-6">
                            <div className="flex items-center gap-3.5">
                              <div className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-105 shadow-2xs ${
                                isCorrection
                                  ? isDarkMode ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30' : 'bg-amber-50 text-amber-700 border border-amber-200'
                                  : isInbound
                                  ? isDarkMode ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                  : isDarkMode ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' : 'bg-blue-50 text-blue-600 border border-blue-200/70'
                              }`}>
                                <History className="w-5 h-5 stroke-[2]" />
                              </div>
                              <div className="min-w-0">
                                <span className="font-mono text-sm tracking-tight text-slate-900 dark:text-white font-black">
                                  {mov.itemCode}
                                </span>
                              </div>
                            </div>
                          </td>
                          <td className="py-4.5 px-6">
                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-tight border ${
                              isCorrection
                                ? isDarkMode ? 'bg-amber-500/15 text-amber-400 border-amber-500/30' : 'bg-amber-50 text-amber-800 border-amber-200'
                                : isAdjustment
                                ? isDarkMode ? 'bg-blue-500/15 text-blue-400 border-blue-500/30' : 'bg-blue-50 text-blue-700 border-blue-200'
                                : isInbound
                                ? isDarkMode ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                : isDarkMode ? 'bg-rose-500/15 text-rose-400 border-rose-500/30' : 'bg-rose-50 text-rose-700 border-rose-200'
                            }`}>
                              <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                                isCorrection ? 'bg-amber-500' : isAdjustment ? 'bg-blue-500' : isInbound ? 'bg-emerald-500' : 'bg-rose-500'
                              }`} />
                              <span>{mov.movementType}</span>
                            </span>
                          </td>
                          <td className={`py-4 px-6 text-right font-mono font-bold text-xs ${
                            isCorrection
                              ? 'text-amber-500'
                              : isInbound ? 'text-emerald-500' : 'text-rose-500'
                          }`}>
                            {isInbound ? `+${formatDecimal(mov.quantityChange)}` : formatDecimal(mov.quantityChange)}
                          </td>
                          <td className={`py-4 px-6 text-right font-mono font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                            {formatDecimal(mov.balanceAfter)}
                          </td>
                          <td className="py-4 px-6 text-slate-400 font-mono">
                            {mov.referenceId ? (
                              <span className={`px-2 py-0.5 rounded border text-[10px] ${
                                isDarkMode ? 'bg-white/5 border-white/10 text-slate-300' : 'bg-slate-100 border-slate-200 text-slate-700'
                              }`}>
                                {mov.referenceId}
                              </span>
                            ) : (
                              <span className="text-slate-500">—</span>
                            )}
                          </td>
                          <td className="py-4 px-6 text-slate-400 text-[11px] truncate max-w-[140px]" title={mov.actorEmail}>
                            {mov.actorEmail}
                          </td>
                          <td className="py-4 px-6 text-slate-400 text-[11px] truncate max-w-[200px]" title={mov.notes || ''}>
                            {mov.notes || '—'}
                          </td>
                          <td className="py-4 px-6 text-center">
                            {mov.movementType !== 'CORRECTION' && (
                              <button
                                onClick={() => {
                                  setSelectedMovementForCorrection(mov);
                                  setCorrectionReason(`Offset error in movement ${mov.id}`);
                                  correctMovementModal.open({ movementId: mov.id });
                                }}
                                title="Record Offset Reversal Movement"
                                className="px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold bg-amber-500/10 text-amber-500 hover:bg-amber-500/20 border border-amber-500/30 cursor-pointer transition-all"
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
            <div className={`p-4 rounded-2xl border transition-all ${
              isDarkMode
                ? 'border-white/10 bg-gradient-to-b from-[#111318] via-[#090a0d] to-[#020204] shadow-[0_8px_28px_rgba(0,0,0,0.5)]'
                : 'border-slate-200/80 bg-gradient-to-b from-white/95 via-slate-50/90 to-slate-100/70 shadow-[0_2px_12px_rgba(0,0,0,0.03)]'
            }`}>
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 font-mono">Audited Items</div>
              <div className="text-2xl font-black font-mono mt-1 text-slate-900 dark:text-white">{(filteredReconciliation || []).length}</div>
            </div>
            <div className={`p-4 rounded-2xl border transition-all ${
              isDarkMode
                ? 'border-white/10 bg-gradient-to-b from-[#111318] via-[#090a0d] to-[#020204] shadow-[0_8px_28px_rgba(0,0,0,0.5)]'
                : 'border-slate-200/80 bg-gradient-to-b from-white/95 via-slate-50/90 to-slate-100/70 shadow-[0_2px_12px_rgba(0,0,0,0.03)]'
            }`}>
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 font-mono">100% Ledger Matched</div>
              <div className="text-2xl font-black font-mono mt-1 text-emerald-500">
                {(filteredReconciliation || []).filter(r => r.status === 'MATCHED').length}
              </div>
            </div>
            <div className={`p-4 rounded-2xl border transition-all ${
              isDarkMode
                ? 'border-white/10 bg-gradient-to-b from-[#111318] via-[#090a0d] to-[#020204] shadow-[0_8px_28px_rgba(0,0,0,0.5)]'
                : 'border-slate-200/80 bg-gradient-to-b from-white/95 via-slate-50/90 to-slate-100/70 shadow-[0_2px_12px_rgba(0,0,0,0.03)]'
            }`}>
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 font-mono">Discrepancies Flagged</div>
              <div className="text-2xl font-black font-mono mt-1 text-rose-500">
                {(filteredReconciliation || []).filter(r => r.status === 'DISCREPANCY').length}
              </div>
            </div>
          </div>

          <div className={`overflow-hidden rounded-3xl border transition-all ${
            isDarkMode
              ? 'border-white/[0.08] bg-gradient-to-b from-[#111318] via-[#08090c] to-[#010203] shadow-[0_20px_50px_rgba(0,0,0,0.6),inset_0_1px_0_0_rgba(255,255,255,0.06)]'
              : 'border-slate-200/90 bg-gradient-to-b from-white via-slate-50/40 to-[#f6f8fc] shadow-[0_16px_40px_rgba(15,23,42,0.05),inset_0_1px_0_0_rgba(255,255,255,1)]'
          }`}>
            <div className={`flex items-center justify-between border-b px-6 py-4.5 transition-all ${
              isDarkMode
                ? 'border-white/[0.08] bg-gradient-to-r from-black/60 via-black/30 to-black/60'
                : 'border-slate-200/80 bg-gradient-to-r from-slate-50/90 via-white/60 to-slate-50/90'
            }`}>
              <div className="flex items-center gap-3.5">
                <div className={`flex h-10 w-10 items-center justify-center rounded-2xl shadow-xs ${
                  isDarkMode ? 'bg-white/10 text-white border border-white/10' : 'bg-slate-900 text-white shadow-2xs'
                }`}>
                  <Boxes className="h-5 w-5 stroke-[2]" />
                </div>
                <div>
                  <div className="text-base font-black tracking-tight text-slate-900 dark:text-white">
                    Physical vs. Derived Ledger Reconciliation
                  </div>
                  <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
                    Audit report comparing fast cache count against immutable ledger transaction sum
                  </div>
                </div>
              </div>
              <span className={`rounded-full border px-3 py-1 font-mono text-xs font-bold tracking-tight ${
                isDarkMode ? 'border-white/10 bg-black/60 text-slate-300' : 'border-slate-200 bg-white text-slate-700 shadow-2xs'
              }`}>
                {filteredReconciliation.length} items
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse font-sans">
                <thead>
                  <tr className={`border-b text-[11px] font-bold uppercase tracking-wider transition-all ${
                    isDarkMode
                      ? 'border-white/[0.07] bg-gradient-to-b from-black/80 to-black/60 text-slate-400'
                      : 'border-slate-200/90 bg-gradient-to-b from-slate-100/90 to-slate-50/90 text-slate-600'
                  }`}>
                    <th className="py-4 px-6">Part Code</th>
                    <th className="py-4 px-6">Description</th>
                    <th className="py-4 px-6 text-right">Ledger Derived Sum</th>
                    <th className="py-4 px-6 text-right">Physical / Cache Count</th>
                    <th className="py-4 px-6 text-right">Discrepancy (Δ)</th>
                    <th className="py-4 px-6 text-center">Status</th>
                    <th className="py-4 px-6 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className={`divide-y text-xs transition-colors ${
                  isDarkMode ? 'divide-white/[0.04]' : 'divide-slate-200/70'
                }`}>
                  {filteredReconciliation.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-slate-400 font-mono text-xs">
                        <div className="flex flex-col items-center justify-center gap-2">
                          <Boxes className="w-8 h-8 text-slate-500/40" />
                          <span className="font-semibold text-slate-300">No reconciliation records found</span>
                          <span className="text-[10px] text-slate-500">
                            {searchQuery ? `No items matching "${searchQuery}"` : 'Zero inventory items found in database.'}
                          </span>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredReconciliation.map((rec) => {
                      const isDiscrepancy = rec.status === 'DISCREPANCY';
                      return (
                        <tr
                          key={rec.itemCode}
                          className={`group transition-all duration-150 ${
                            isDarkMode
                              ? 'even:bg-white/[0.015] hover:bg-gradient-to-r hover:from-white/[0.06] hover:via-white/[0.02] hover:to-transparent'
                              : 'even:bg-slate-50/50 hover:bg-gradient-to-r hover:from-blue-500/[0.05] hover:via-indigo-500/[0.03] hover:to-transparent'
                          }`}
                        >
                          <td className="py-4.5 px-6">
                            <div className="flex items-center gap-3.5">
                              <div className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-105 shadow-2xs ${
                                isDiscrepancy
                                  ? isDarkMode ? 'bg-rose-500/15 text-rose-400 border border-rose-500/30' : 'bg-rose-50 text-rose-600 border border-rose-200'
                                  : isDarkMode ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              }`}>
                                <Boxes className="w-5 h-5 stroke-[2]" />
                              </div>
                              <div className="min-w-0">
                                <span className="font-mono text-sm tracking-tight text-slate-900 dark:text-white font-black">
                                  {rec.itemCode}
                                </span>
                                <div className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate max-w-[280px] mt-1">
                                  {rec.description}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className={`py-4 px-6 font-semibold ${isDarkMode ? 'text-slate-100' : 'text-slate-800'}`}>{rec.description}</td>
                          <td className="py-4 px-6 text-right font-bold font-mono text-emerald-500">{formatDecimal(rec.ledgerBalance)}</td>
                          <td className={`py-4 px-6 text-right font-bold font-mono ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{formatDecimal(rec.cachedOnHand)}</td>
                          <td className={`py-4 px-6 text-right font-bold font-mono ${isDiscrepancy ? 'text-rose-500' : 'text-emerald-500'}`}>
                            {rec.discrepancy > 0 ? `+${formatDecimal(rec.discrepancy)}` : formatDecimal(rec.discrepancy)}
                          </td>
                          <td className="py-4.5 px-6 text-center">
                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-tight border ${
                              isDiscrepancy
                                ? isDarkMode ? 'bg-rose-500/15 text-rose-400 border-rose-500/30' : 'bg-rose-50 text-rose-700 border-rose-200'
                                : isDarkMode ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            }`}>
                              <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${isDiscrepancy ? 'bg-rose-500' : 'bg-emerald-500'}`} />
                              <span>{isDiscrepancy ? 'Discrepancy' : 'Balanced'}</span>
                            </span>
                          </td>
                          <td className="py-4 px-6 text-center">
                            <button
                              onClick={() => {
                                onAdjustStock(rec.itemCode, rec.discrepancy, 'Reconciliation Correction');
                              }}
                              className={`px-3 py-1.5 rounded-xl font-mono text-xs font-bold transition-all cursor-pointer ${
                                isDarkMode 
                                  ? 'bg-white/10 hover:bg-white/15 text-white border border-white/15' 
                                  : 'bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200'
                              }`}
                            >
                              Reconcile
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Modal 1: Physical Stock Audit Adjustment */}
      <Modal
        isOpen={adjustStockModal.isOpen}
        onClose={handleCloseAdjustModal}
        maxWidth="2xl"
        isDarkMode={isDarkMode}
        icon={<Boxes className="w-5 h-5 text-[var(--accent-primary)]" />}
        title="Stock Inventory Adjustment"
        subtitle="Reconcile physical floor counts with digital inventory balances"
      >
        <form onSubmit={handleAdjustSubmit} className="space-y-4 font-sans text-xs">
          {/* Section 1: Integrated Search Box & Category Filters */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <label className={`text-[11px] font-bold uppercase tracking-wider ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                Select Target Stock Item *
              </label>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono text-slate-400">
                  {modalFilteredStocks.length} matching {modalFilteredStocks.length === 1 ? 'part' : 'parts'}
                </span>
                {selectedStockForAdjust && (
                  <button
                    type="button"
                    onClick={() => setIsItemPickerOpen(prev => !prev)}
                    className="text-[10px] font-mono font-bold text-[var(--accent-primary)] hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    {isItemPickerOpen ? 'Hide Picker' : 'Browse All SKUs'}
                    <ChevronDown className={`w-3 h-3 transition-transform ${isItemPickerOpen ? 'rotate-180' : ''}`} />
                  </button>
                )}
              </div>
            </div>

            {/* Apple Search Input */}
            <div className={`relative flex items-center rounded-2xl border transition-all ${
              isDarkMode 
                ? 'bg-black/30 border-white/[0.08] focus-within:border-[var(--accent-primary)] focus-within:ring-2 focus-within:ring-[var(--accent-ring)]' 
                : 'bg-slate-50 border-slate-200/90 focus-within:border-[var(--accent-primary)] focus-within:ring-2 focus-within:ring-[var(--accent-ring)] shadow-xs'
            }`}>
              <Search className="w-4 h-4 text-slate-400 shrink-0 ml-3.5" />
              <input
                type="text"
                value={adjustItemSearch}
                onChange={(e) => {
                  setAdjustItemSearch(e.target.value);
                  if (!isItemPickerOpen) setIsItemPickerOpen(true);
                }}
                onFocus={() => {
                  if (!isItemPickerOpen) setIsItemPickerOpen(true);
                }}
                placeholder="Search by part code, description, catalog reference..."
                className="w-full bg-transparent px-3 py-2.5 text-xs font-mono outline-none placeholder:font-sans placeholder:text-slate-400"
              />
              {adjustItemSearch && (
                <button
                  type="button"
                  onClick={() => setAdjustItemSearch('')}
                  className="mr-3 p-1 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-white/10 transition-colors cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Category Filter Pills (Apple Segmented Control) */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
              {INVENTORY_CATEGORIES.map(cat => {
                const count = categoryCounts[cat.key] ?? 0;
                const isSelected = adjustCategoryFilter === cat.key;
                return (
                  <button
                    key={cat.key}
                    type="button"
                    onClick={() => {
                      setAdjustCategoryFilter(cat.key);
                      if (!isItemPickerOpen) setIsItemPickerOpen(true);
                    }}
                    className={`px-2.5 py-1 rounded-xl text-[10px] font-mono font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                      isSelected
                        ? 'bg-[var(--accent-primary)] text-white shadow-xs scale-[1.02]'
                        : isDarkMode
                          ? 'bg-white/[0.05] text-slate-400 hover:text-white hover:bg-white/[0.08] border border-white/[0.05]'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200/80 border border-slate-200/60'
                    }`}
                  >
                    <span>{cat.label}</span>
                    <span className={`px-1 rounded text-[9px] ${
                      isSelected ? 'bg-black/20 text-white' : isDarkMode ? 'bg-white/10 text-slate-400' : 'bg-slate-200 text-slate-700'
                    }`}>
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Interactive Item Picker Results List (shown when searching, picking, or toggled) */}
          {(isItemPickerOpen || !selectedStockForAdjust || adjustItemSearch.trim().length > 0) && (
            <div className={`overflow-hidden rounded-2xl border transition-all ${
              isDarkMode ? 'border-white/[0.08] bg-[#0E0E11]' : 'border-slate-200 bg-white shadow-sm'
            }`}>
              <div className={`px-3.5 py-2 border-b flex items-center justify-between text-[10px] font-mono font-bold uppercase tracking-wider ${
                isDarkMode ? 'border-white/[0.07] bg-white/[0.02] text-slate-400' : 'border-slate-100 bg-slate-50 text-slate-500'
              }`}>
                <span>Catalog Items ({modalFilteredStocks.length})</span>
                <span className="text-[9px] text-slate-400 font-normal">Click to select item for delta adjustment</span>
              </div>
              <div className="max-h-48 overflow-y-auto divide-y divide-slate-100 dark:divide-white/[0.05] scrollbar-thin">
                {modalFilteredStocks.length === 0 ? (
                  <div className="py-6 px-4 text-center">
                    <Package className="w-6 h-6 text-slate-400 mx-auto mb-1.5 opacity-60" />
                    <p className="text-xs font-semibold text-slate-400">No inventory parts match your filter</p>
                    <p className="text-[10px] text-slate-500 mt-0.5">Try clearing the search query or choosing "All" categories.</p>
                  </div>
                ) : (
                  modalFilteredStocks.map(item => {
                    const isCurrent = selectedStockForAdjust?.code === item.code;
                    return (
                      <button
                        key={item.code}
                        type="button"
                        onClick={() => {
                          setSelectedStockForAdjust(item);
                          setIsItemPickerOpen(false);
                          if (adjustStockModal.params.itemId !== item.code) {
                            adjustStockModal.open({ itemId: item.code });
                          }
                        }}
                        className={`w-full text-left px-3.5 py-2.5 flex items-center justify-between gap-3 transition-all cursor-pointer ${
                          isCurrent
                            ? isDarkMode
                              ? 'bg-[var(--accent-primary)]/15 border-l-2 border-l-[var(--accent-primary)]'
                              : 'bg-[var(--accent-soft-light)] border-l-2 border-l-[var(--accent-primary)]'
                            : isDarkMode
                              ? 'hover:bg-white/[0.04]'
                              : 'hover:bg-slate-50'
                        }`}
                      >
                        <div className="min-w-0 flex items-center gap-2.5">
                          {renderCategoryBadge(item.category, item.categoryLabel)}
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className={`font-mono font-bold text-xs ${
                                isCurrent ? 'text-[var(--accent-primary)]' : isDarkMode ? 'text-white' : 'text-slate-900'
                              }`}>
                                {item.code}
                              </span>
                              {item.rawCode && item.rawCode !== item.code && (
                                <span className={`px-1.5 py-0.5 rounded text-[9px] font-mono border ${
                                  isDarkMode ? 'bg-white/[0.06] border-white/[0.08] text-slate-400' : 'bg-slate-100 border-slate-200 text-slate-600'
                                }`}>
                                  {item.rawCode}
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate max-w-[280px] sm:max-w-md">
                              {item.description}
                            </p>
                          </div>
                        </div>

                        <div className="shrink-0 flex items-center gap-3 text-right">
                          <div>
                            <div className="font-mono font-bold text-xs text-slate-900 dark:text-white">
                              {formatDecimal(item.onHand)} <span className="text-[10px] text-slate-400 font-normal">{item.unit}</span>
                            </div>
                            <div className="text-[9px] font-mono text-slate-400">On Hand</div>
                          </div>
                          {isCurrent && (
                            <div className="w-5 h-5 rounded-full bg-[var(--accent-primary)] flex items-center justify-center text-white shrink-0 shadow-xs">
                              <Check className="w-3 h-3 stroke-[3]" />
                            </div>
                          )}
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {/* Active Selected SKU Hero Card */}
          {selectedStockForAdjust && (
            <div className={`relative overflow-hidden rounded-2xl border p-4 transition-all ${
              isDarkMode
                ? 'border-white/[0.08] bg-gradient-to-br from-white/[0.04] to-black/20'
                : 'border-slate-200/90 bg-gradient-to-br from-slate-50 to-white shadow-xs'
            }`}>
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    {renderCategoryBadge(selectedStockForAdjust.category, selectedStockForAdjust.categoryLabel)}
                    <span className="font-mono text-sm font-extrabold text-slate-900 dark:text-white">
                      {selectedStockForAdjust.code}
                    </span>
                    {selectedStockForAdjust.rawCode && selectedStockForAdjust.rawCode !== selectedStockForAdjust.code && (
                      <span className={`px-2 py-0.5 rounded-md font-mono text-[10px] font-bold border ${
                        isDarkMode ? 'bg-slate-800 text-slate-300 border-slate-700' : 'bg-slate-100 text-slate-700 border-slate-200'
                      }`}>
                        Catalog Ref: {selectedStockForAdjust.rawCode}
                      </span>
                    )}
                  </div>
                  <p className="text-xs font-medium text-slate-600 dark:text-slate-300 line-clamp-2">
                    {selectedStockForAdjust.description}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setIsItemPickerOpen(prev => !prev)}
                  className={`shrink-0 px-2.5 py-1.5 rounded-xl border text-[11px] font-mono font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                    isDarkMode
                      ? 'border-white/[0.1] bg-white/[0.06] text-slate-300 hover:text-white hover:bg-white/[0.1]'
                      : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50 shadow-xs'
                  }`}
                >
                  <span>{isItemPickerOpen ? 'Close Picker' : 'Switch Item'}</span>
                  <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isItemPickerOpen ? 'rotate-180' : ''}`} />
                </button>
              </div>

              {/* Stock telemetry summary chips */}
              <div className="mt-3 pt-3 border-t border-slate-200/60 dark:border-white/[0.06] flex items-center gap-3 text-[10px] font-mono flex-wrap text-slate-500 dark:text-slate-400">
                <span>Unit: <strong className="text-slate-700 dark:text-slate-200">{selectedStockForAdjust.unit || 'units'}</strong></span>
                <span>•</span>
                <span>Current Ledger: <strong className="text-slate-700 dark:text-slate-200">{formatDecimal(selectedStockForAdjust.onHand)}</strong></span>
                <span>•</span>
                <span>Reorder Point: <strong className="text-slate-700 dark:text-slate-200">{formatDecimal(selectedStockForAdjust.reorderLevel)}</strong></span>
                <span>•</span>
                <span className={`font-bold ${
                  (selectedStockForAdjust.onHand || 0) <= (selectedStockForAdjust.reorderLevel || 0)
                    ? 'text-amber-500'
                    : 'text-emerald-500'
                }`}>
                  {(selectedStockForAdjust.onHand || 0) <= 0 ? 'Out of Stock' : (selectedStockForAdjust.onHand || 0) <= (selectedStockForAdjust.reorderLevel || 0) ? 'Reorder Needed' : 'Healthy Stock'}
                </span>
              </div>
            </div>
          )}

          {/* Section 2: 3-Column Recalculation Bento Grid */}
          {selectedStockForAdjust && (
            <div className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* 1: Current On Hand */}
                <div className={`p-3.5 rounded-2xl border flex flex-col justify-between ${
                  isDarkMode 
                    ? 'bg-black/30 border-white/[0.08]' 
                    : 'bg-slate-50 border-slate-200 shadow-xs'
                }`}>
                  <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400">
                    Current Balance
                  </span>
                  <div className="my-2">
                    <div className="text-2xl font-extrabold font-mono text-slate-900 dark:text-white">
                      {formatDecimal(selectedStockForAdjust.onHand)}
                      <span className="text-xs font-normal text-slate-400 ml-1.5">{selectedStockForAdjust.unit}</span>
                    </div>
                  </div>
                  <span className="text-[10px] text-slate-400 font-mono">System ledger figure</span>
                </div>

                {/* 2: Adjustment Delta Stepper */}
                <div className={`p-3.5 rounded-2xl border flex flex-col justify-between ${
                  isDarkMode 
                    ? 'bg-[var(--accent-primary)]/10 border-[var(--accent-primary)]/30' 
                    : 'bg-[var(--accent-soft-light)] border-[var(--accent-primary)]/30 shadow-xs'
                }`}>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[var(--accent-primary)]">
                      Delta (+ / -) *
                    </span>
                    <span className="text-[9px] font-mono text-slate-400">Step ±1</span>
                  </div>

                  {/* Stepper Input Row */}
                  <div className="my-2 flex items-center justify-center gap-2">
                    <button
                      type="button"
                      onClick={() => setAdjustQty(prev => prev - 1)}
                      className={`w-8 h-8 rounded-xl border flex items-center justify-center transition-all active:scale-95 cursor-pointer ${
                        isDarkMode
                          ? 'bg-white/10 hover:bg-white/20 border-white/10 text-white'
                          : 'bg-white hover:bg-slate-100 border-slate-200 text-slate-700 shadow-xs'
                      }`}
                      title="Decrease delta by 1"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <input
                      type="number"
                      required
                      value={adjustQty}
                      onChange={(e) => setAdjustQty(Number(e.target.value))}
                      className={`h-9 w-20 text-center rounded-xl border text-base font-mono font-black outline-none transition-ui ${
                        isDarkMode 
                          ? 'bg-[#09090B] border-white/20 text-white focus:border-[var(--accent-primary)] focus:ring-2 focus:ring-[var(--accent-ring)]' 
                          : 'bg-white border-slate-300 text-slate-900 focus:border-[var(--accent-primary)] shadow-xs'
                      }`}
                      placeholder="0"
                    />
                    <button
                      type="button"
                      onClick={() => setAdjustQty(prev => prev + 1)}
                      className={`w-8 h-8 rounded-xl border flex items-center justify-center transition-all active:scale-95 cursor-pointer ${
                        isDarkMode
                          ? 'bg-white/10 hover:bg-white/20 border-white/10 text-white'
                          : 'bg-white hover:bg-slate-100 border-slate-200 text-slate-700 shadow-xs'
                      }`}
                      title="Increase delta by 1"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Delta Shortcut Chips */}
                  <div className="flex items-center justify-center gap-1 flex-wrap">
                    {[-10, -5, -1, 0, 1, 5, 10, 50].map(val => (
                      <button
                        key={val}
                        type="button"
                        onClick={() => setAdjustQty(val === 0 ? 0 : val)}
                        className={`px-1.5 py-0.5 rounded-md font-mono text-[9px] font-bold transition-all cursor-pointer ${
                          (val === 0 && adjustQty === 0) || (val !== 0 && adjustQty === val)
                            ? 'bg-[var(--accent-primary)] text-white'
                            : isDarkMode
                              ? 'bg-white/5 hover:bg-white/10 text-slate-400'
                              : 'bg-white hover:bg-slate-100 text-slate-600 border border-slate-200/60'
                        }`}
                      >
                        {val > 0 ? `+${val}` : val}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 3: Projected New On Hand */}
                {(() => {
                  const currentOnHand = Number(selectedStockForAdjust.onHand) || 0;
                  const newOnHand = Math.max(0, currentOnHand + adjustQty);
                  return (
                    <div className={`p-3.5 rounded-2xl border flex flex-col justify-between ${
                      isDarkMode 
                    ? 'bg-black/30 border-white/[0.08]' 
                    : 'bg-slate-50 border-slate-200 shadow-xs'
                    }`}>
                      <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400">
                        Projected Balance
                      </span>
                      <div className="my-2">
                        <div className="text-2xl font-extrabold font-mono text-slate-900 dark:text-white">
                          {formatDecimal(newOnHand)}
                          <span className="text-xs font-normal text-slate-400 ml-1.5">{selectedStockForAdjust.unit}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5">
                        {adjustQty > 0 ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-mono font-bold text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-lg border border-emerald-500/20">
                            <TrendingUp className="w-3 h-3" /> +{adjustQty} {selectedStockForAdjust.unit}
                          </span>
                        ) : adjustQty < 0 ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-mono font-bold text-rose-500 bg-rose-500/10 px-2 py-0.5 rounded-lg border border-rose-500/20">
                            <TrendingDown className="w-3 h-3" /> {adjustQty} {selectedStockForAdjust.unit}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[10px] font-mono font-bold text-slate-400 bg-slate-100 dark:bg-white/[0.04] px-2 py-0.5 rounded-lg border border-slate-200 dark:border-white/[0.08]">
                            No variance
                          </span>
                        )}
                        {newOnHand === 0 && (
                          <span className="text-[9px] font-mono text-amber-500 font-bold">Zero alert</span>
                        )}
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>
          )}

          {/* Section 3: Audit Reason & Traceability */}
          {selectedStockForAdjust && (
            <div className="space-y-2 pt-1">
              <label className={`block text-[11px] font-bold uppercase tracking-wider ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                Audit Reason & Compliance Note *
              </label>

              {/* Preset reason pills */}
              <div className="flex items-center gap-1.5 flex-wrap">
                {[
                  'Physical Count Mismatch',
                  'Damaged / Scrapped',
                  'Vendor Return',
                  'Assembly Spoilage',
                  'Found Unrecorded Stock',
                  'Cycle Count Calibration'
                ].map(reason => {
                  const isMatch = adjustReason === reason;
                  return (
                    <button
                      key={reason}
                      type="button"
                      onClick={() => setAdjustReason(reason)}
                      className={`px-2.5 py-1 rounded-xl text-[10px] font-mono font-bold transition-all cursor-pointer ${
                        isMatch
                          ? 'bg-[var(--accent-primary)] text-white shadow-xs'
                          : isDarkMode
                            ? 'bg-white/[0.05] text-slate-400 hover:text-white border border-white/[0.06]'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200/80 border border-slate-200'
                      }`}
                    >
                      {reason}
                    </button>
                  );
                })}
              </div>

              {/* Audit Reason Text Input */}
              <input
                type="text"
                required
                value={adjustReason}
                onChange={(e) => setAdjustReason(e.target.value)}
                className={`h-11 w-full rounded-2xl border px-3.5 text-xs outline-none transition-ui ${
                  isDarkMode 
                    ? 'bg-[#09090B] border-white/[0.1] text-white placeholder:text-slate-500 focus:border-[var(--accent-primary)] focus:ring-2 focus:ring-[var(--accent-ring)]' 
                    : 'bg-slate-50 border-slate-300 text-slate-900 placeholder:text-slate-400 focus:border-[var(--accent-primary)] shadow-xs'
                }`}
                placeholder="e.g. Semi-annual physical verification variance in Bay 4..."
              />
            </div>
          )}

          {/* Section 4: Modal Actions Footer */}
          <div className={`pt-4 border-t flex items-center justify-end gap-3 ${isDarkMode ? 'border-white/[0.08]' : 'border-slate-200'}`}>
            <button
              type="button"
              onClick={handleCloseAdjustModal}
              className={`px-4 py-2.5 rounded-xl border text-xs font-bold transition-ui cursor-pointer ${
                isDarkMode 
                  ? 'border-white/[0.1] text-slate-300 hover:bg-white/[0.06]' 
                  : 'border-slate-300 text-slate-700 hover:bg-slate-100'
              }`}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!selectedStockForAdjust}
              className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold text-xs cursor-pointer shadow-lg shadow-[var(--accent-shadow)] transition-all active:scale-[0.97] ${
                !selectedStockForAdjust
                  ? 'opacity-40 cursor-not-allowed bg-slate-500 text-white'
                  : 'bg-[var(--accent-primary)] hover:brightness-110 text-white hover:scale-[1.01]'
              }`}
            >
              <CheckCircle2 className="w-4 h-4" />
              Confirm Adjustment
            </button>
          </div>
        </form>
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
                          {isInbound ? `+${formatDecimal(h.quantityChange)}` : formatDecimal(h.quantityChange)}
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
                    <div className={`text-sm font-black mt-0.5 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{formatDecimal(h.balanceAfter)} Units</div>
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
