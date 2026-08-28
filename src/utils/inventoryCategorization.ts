import { MasterItem, StockItem, ShortageItem } from '../types/console';

export type InventoryCategoryKey = 
  | 'ALL' 
  | 'RAW_MATERIAL' 
  | 'FINISHED_GOODS' 
  | 'CONSUMABLES' 
  | 'TOOLS' 
  | 'SPARE_PARTS' 
  | 'OTHER';

export interface CategoryDefinition {
  key: InventoryCategoryKey;
  label: string;
  prefix: string;
  badgeBgDark: string;
  badgeTextDark: string;
  badgeBorderDark: string;
  badgeBgLight: string;
  badgeTextLight: string;
  badgeBorderLight: string;
  description: string;
}

export const INVENTORY_CATEGORIES: CategoryDefinition[] = [
  {
    key: 'ALL',
    label: 'All',
    prefix: '',
    badgeBgDark: 'bg-slate-800/60',
    badgeTextDark: 'text-slate-300',
    badgeBorderDark: 'border-slate-700/60',
    badgeBgLight: 'bg-slate-100',
    badgeTextLight: 'text-slate-700',
    badgeBorderLight: 'border-slate-300',
    description: 'All factory items and store SKUs'
  },
  {
    key: 'RAW_MATERIAL',
    label: 'Raw Materials',
    prefix: 'RM',
    badgeBgDark: 'bg-amber-500/15',
    badgeTextDark: 'text-amber-300',
    badgeBorderDark: 'border-amber-500/30',
    badgeBgLight: 'bg-amber-50',
    badgeTextLight: 'text-amber-800',
    badgeBorderLight: 'border-amber-200',
    description: 'Steel plates, round bars, billets, ingots, aluminum rods and sheets'
  },
  {
    key: 'FINISHED_GOODS',
    label: 'Finished Goods',
    prefix: 'FG',
    badgeBgDark: 'bg-[#5B75F8]/15',
    badgeTextDark: 'text-[#7B92FF]',
    badgeBorderDark: 'border-[#5B75F8]/30',
    badgeBgLight: 'bg-indigo-50',
    badgeTextLight: 'text-indigo-800',
    badgeBorderLight: 'border-indigo-200',
    description: 'Completed assemblies, sub-assemblies, machine components and shippable items'
  },
  {
    key: 'CONSUMABLES',
    label: 'Consumables',
    prefix: 'CON',
    badgeBgDark: 'bg-cyan-500/15',
    badgeTextDark: 'text-cyan-300',
    badgeBorderDark: 'border-cyan-500/30',
    badgeBgLight: 'bg-cyan-50',
    badgeTextLight: 'text-cyan-800',
    badgeBorderLight: 'border-cyan-200',
    description: 'Coolants, cutting oils, powder coating, lubricants, solvents and welding wire'
  },
  {
    key: 'TOOLS',
    label: 'Tools',
    prefix: 'TOOL',
    badgeBgDark: 'bg-purple-500/15',
    badgeTextDark: 'text-purple-300',
    badgeBorderDark: 'border-purple-500/30',
    badgeBgLight: 'bg-purple-50',
    badgeTextLight: 'text-purple-800',
    badgeBorderLight: 'border-purple-200',
    description: 'CNC inserts, drill bits, milling cutters, tool holders, jigs and fixtures'
  },
  {
    key: 'SPARE_PARTS',
    label: 'Spare Parts',
    prefix: 'SP',
    badgeBgDark: 'bg-emerald-500/15',
    badgeTextDark: 'text-emerald-300',
    badgeBorderDark: 'border-emerald-500/30',
    badgeBgLight: 'bg-emerald-50',
    badgeTextLight: 'text-emerald-800',
    badgeBorderLight: 'border-emerald-200',
    description: 'Bearings, fasteners, hex bolts, nuts, seals, o-rings, springs and bought-outs'
  },
  {
    key: 'OTHER',
    label: 'Other',
    prefix: 'OTH',
    badgeBgDark: 'bg-slate-500/15',
    badgeTextDark: 'text-slate-300',
    badgeBorderDark: 'border-slate-500/30',
    badgeBgLight: 'bg-slate-100',
    badgeTextLight: 'text-slate-700',
    badgeBorderLight: 'border-slate-200',
    description: 'General store materials, WIP fabrications, packaging and miscellaneous items'
  }
];

// Persistent mapping cache stored in memory and localStorage for deterministic persistence
const PERSISTENCE_KEY = 'guruom_inventory_part_codes_v2';

function loadPersistedMappings(): Record<string, { partCode: string; category: InventoryCategoryKey }> {
  try {
    const raw = localStorage.getItem(PERSISTENCE_KEY);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (e) {
    // Ignore localStorage errors
  }
  return {};
}

function savePersistedMappings(mappings: Record<string, { partCode: string; category: InventoryCategoryKey }>) {
  try {
    localStorage.setItem(PERSISTENCE_KEY, JSON.stringify(mappings));
  } catch (e) {
    // Ignore localStorage errors
  }
}

// Canonical static seed mappings for standard GuruOm items
const CANONICAL_SEED_MAPPINGS: Record<string, { partCode: string; category: InventoryCategoryKey }> = {
  'ITEM-0001': { partCode: 'RM-0001', category: 'RAW_MATERIAL' },
  'ITEM-0004': { partCode: 'RM-0002', category: 'RAW_MATERIAL' },
  'RM-EN24': { partCode: 'RM-0003', category: 'RAW_MATERIAL' },
  'AL-6061-ROD': { partCode: 'RM-0004', category: 'RAW_MATERIAL' },
  '00000017': { partCode: 'RM-0005', category: 'RAW_MATERIAL' },
  'ITEM-0002': { partCode: 'FG-0001', category: 'FINISHED_GOODS' },
  'ITEM-0006': { partCode: 'FG-0002', category: 'FINISHED_GOODS' },
  '00000003': { partCode: 'FG-0003', category: 'FINISHED_GOODS' },
  '00000002': { partCode: 'FG-0004', category: 'FINISHED_GOODS' },
  '00000009': { partCode: 'FG-0005', category: 'FINISHED_GOODS' },
  '00000012': { partCode: 'FG-0006', category: 'FINISHED_GOODS' },
  '00000015': { partCode: 'FG-0007', category: 'FINISHED_GOODS' },
  'ITEM-0007': { partCode: 'CON-0001', category: 'CONSUMABLES' },
  'ITEM-0009': { partCode: 'CON-0002', category: 'CONSUMABLES' },
  'ITEM-0005': { partCode: 'TOOL-0001', category: 'TOOLS' },
  'ITEM-0003': { partCode: 'SP-0001', category: 'SPARE_PARTS' },
  'ITEM-0008': { partCode: 'SP-0002', category: 'SPARE_PARTS' },
  'BD-BRG-6205': { partCode: 'SP-0003', category: 'SPARE_PARTS' },
  'ITEM-0010': { partCode: 'OTH-0001', category: 'OTHER' }
};

/**
 * Infer the structured category for an inventory or catalog item
 */
export function determineItemCategory(item: {
  code?: string;
  itemType?: string;
  category?: string;
  storeLocation?: string;
  isFinishedGoods?: boolean;
  description?: string;
  name?: string;
  partNo?: string;
}): InventoryCategoryKey {
  const code = item.code || '';
  if (CANONICAL_SEED_MAPPINGS[code]) {
    return CANONICAL_SEED_MAPPINGS[code].category;
  }

  // Check explicit category / itemType fields
  const typeStr = `${item.category || ''} ${item.itemType || ''}`.trim().toLowerCase();
  if (typeStr.includes('raw') || typeStr.includes('rm')) return 'RAW_MATERIAL';
  if (typeStr.includes('finished') || typeStr.includes('fg')) return 'FINISHED_GOODS';
  if (typeStr.includes('consumable') || typeStr.includes('con') || typeStr.includes('coolant') || typeStr.includes('oil') || typeStr.includes('paint')) return 'CONSUMABLES';
  if (typeStr.includes('tool') || typeStr.includes('insert') || typeStr.includes('cutter') || typeStr.includes('drill')) return 'TOOLS';
  if (typeStr.includes('spare') || typeStr.includes('bought') || typeStr.includes('fastener') || typeStr.includes('bearing') || typeStr.includes('hardware')) return 'SPARE_PARTS';
  if (typeStr.includes('other') || typeStr.includes('oth') || typeStr.includes('misc')) return 'OTHER';

  // Check prefix in existing code if already formatted
  const upperCode = code.toUpperCase();
  if (upperCode.startsWith('RM-')) return 'RAW_MATERIAL';
  if (upperCode.startsWith('FG-')) return 'FINISHED_GOODS';
  if (upperCode.startsWith('CON-') || upperCode.startsWith('CO-')) return 'CONSUMABLES';
  if (upperCode.startsWith('TOOL-') || upperCode.startsWith('TL-')) return 'TOOLS';
  if (upperCode.startsWith('SP-') || upperCode.startsWith('BO-') || upperCode.startsWith('BD-')) return 'SPARE_PARTS';
  if (upperCode.startsWith('OTH-')) return 'OTHER';

  // Check storeLocation
  const loc = (item.storeLocation || '').toLowerCase();
  if (loc.includes('raw material')) return 'RAW_MATERIAL';
  if (loc.includes('finished goods') || item.isFinishedGoods) return 'FINISHED_GOODS';
  if (loc.includes('consumable')) return 'CONSUMABLES';
  if (loc.includes('bought-out') || loc.includes('hardware')) return 'SPARE_PARTS';
  if (loc.includes('tool')) return 'TOOLS';

  // Check description and part name text
  const text = `${item.description || ''} ${item.name || ''} ${item.partNo || ''}`.toLowerCase();
  if (text.match(/plate|round bar|steel|alloy|sheet|rod|blank|billet|ingot|brass bar|en24|al-6061/)) return 'RAW_MATERIAL';
  if (text.match(/assembly|bracket|housing|valve body|shaft|flange|panel|weldment|finished/)) return 'FINISHED_GOODS';
  if (text.match(/oil|coolant|paint|grease|solvent|chemical|lubricant|powder coating|welding/)) return 'CONSUMABLES';
  if (text.match(/insert|drill|cutter|milling|fixture|gauge|cylinder barrel|tool/)) return 'TOOLS';
  if (text.match(/bearing|bolt|nut|screw|washer|fastener|seal|o-ring|spring|fuse|gasket/)) return 'SPARE_PARTS';

  return 'OTHER';
}

/**
 * Get the prefix for a category key
 */
export function getCategoryPrefix(category: InventoryCategoryKey): string {
  switch (category) {
    case 'RAW_MATERIAL':
      return 'RM';
    case 'FINISHED_GOODS':
      return 'FG';
    case 'CONSUMABLES':
      return 'CON';
    case 'TOOLS':
      return 'TOOL';
    case 'SPARE_PARTS':
      return 'SP';
    case 'OTHER':
    default:
      return 'OTH';
  }
}

/**
 * Generate or resolve unique, sequential, category-based part codes for a list of items
 */
export function resolveInventoryPartCodes(
  items: Array<{
    code: string;
    description?: string;
    itemType?: string;
    category?: string;
    storeLocation?: string;
    isFinishedGoods?: boolean;
    name?: string;
    partNo?: string;
  }>
): Map<string, { partCode: string; category: InventoryCategoryKey; rawCode: string }> {
  const persisted = loadPersistedMappings();
  const resultMap = new Map<string, { partCode: string; category: InventoryCategoryKey; rawCode: string }>();

  // Track max sequence per prefix
  const maxSeqMap: Record<string, number> = {
    RM: 0,
    FG: 0,
    CON: 0,
    TOOL: 0,
    SP: 0,
    OTH: 0
  };

  // 1. First register canonical and already formatted codes
  const updateMaxSeq = (prefix: string, code: string) => {
    const cleanPrefix = `${prefix}-`;
    if (code.startsWith(cleanPrefix)) {
      const num = parseInt(code.slice(cleanPrefix.length), 10);
      if (!isNaN(num) && num > (maxSeqMap[prefix] || 0)) {
        maxSeqMap[prefix] = num;
      }
    }
  };

  // Seed standard sequence numbers
  for (const seed of Object.values(CANONICAL_SEED_MAPPINGS)) {
    const prefix = getCategoryPrefix(seed.category);
    updateMaxSeq(prefix, seed.partCode);
  }

  // Also check persisted
  for (const p of Object.values(persisted)) {
    const prefix = getCategoryPrefix(p.category);
    updateMaxSeq(prefix, p.partCode);
  }

  // 2. Process all input items
  for (const item of items) {
    const rawCode = item.code;
    if (!rawCode) continue;

    // A. Check canonical seed mapping
    if (CANONICAL_SEED_MAPPINGS[rawCode]) {
      resultMap.set(rawCode, {
        partCode: CANONICAL_SEED_MAPPINGS[rawCode].partCode,
        category: CANONICAL_SEED_MAPPINGS[rawCode].category,
        rawCode
      });
      continue;
    }

    // B. Check if code already is in exact formatted category structure e.g. RM-0001, FG-0004
    const match = rawCode.match(/^(RM|FG|CON|TOOL|SP|OTH)-(\d{4,})$/i);
    if (match) {
      const prefix = match[1].toUpperCase();
      const catKey = INVENTORY_CATEGORIES.find(c => c.prefix === prefix)?.key || 'OTHER';
      const formattedCode = `${prefix}-${match[2]}`;
      updateMaxSeq(prefix, formattedCode);
      resultMap.set(rawCode, {
        partCode: formattedCode,
        category: catKey,
        rawCode
      });
      continue;
    }

    // C. Check persisted mapping
    if (persisted[rawCode]) {
      resultMap.set(rawCode, {
        partCode: persisted[rawCode].partCode,
        category: persisted[rawCode].category,
        rawCode
      });
      continue;
    }

    // D. Generate next sequential code for determined category
    const category = determineItemCategory(item);
    const prefix = getCategoryPrefix(category);
    const nextSeq = (maxSeqMap[prefix] || 0) + 1;
    maxSeqMap[prefix] = nextSeq;

    const newPartCode = `${prefix}-${String(nextSeq).padStart(4, '0')}`;
    persisted[rawCode] = { partCode: newPartCode, category };

    resultMap.set(rawCode, {
      partCode: newPartCode,
      category,
      rawCode
    });
  }

  // Save any new persisted mappings
  savePersistedMappings(persisted);

  return resultMap;
}
