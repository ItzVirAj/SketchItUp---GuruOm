import { getDbClient } from '../../config/database';
import { z } from 'zod';
import { BillOfMaterialsSchema } from './bom.schema';

const SEED_BOMS = [
  {
    id: 'bom-1',
    bomCode: 'BOM-00000001',
    parentPartCode: '00000001',
    parentPartName: 'Precision Flange Ø120mm',
    revision: 'v1.2',
    yieldPercentage: 98.0,
    batchSize: 50,
    status: 'ACTIVE',
    notes: 'Standard production BOM with 6061 Aluminium round stock.',
    components: [
      {
        id: 'bom-item-1',
        componentCode: 'RAW-ALU-6061-ROD',
        componentName: 'Aluminium 6061 Round Bar Ø50mm',
        componentType: 'RAW_MATERIAL',
        qtyPerUnit: 1.45,
        unit: 'KG',
        scrapAllowancePct: 3.5,
        stage: 'CNC_TURNING',
        unitCost: 280
      },
      {
        id: 'bom-item-2',
        componentCode: 'HARD-M8-BOLT-SS',
        componentName: 'SS304 M8x25 Hex Socket Fasteners',
        componentType: 'HARDWARE',
        qtyPerUnit: 4,
        unit: 'NOS',
        scrapAllowancePct: 1.0,
        stage: 'FINAL_ASSEMBLY',
        unitCost: 15
      }
    ]
  },
  {
    id: 'bom-2',
    bomCode: 'BOM-00000002',
    parentPartCode: '00000002',
    parentPartName: 'Hardened Spindle Shaft 25x300mm',
    revision: 'v2.0',
    yieldPercentage: 96.5,
    batchSize: 100,
    status: 'ACTIVE',
    notes: 'Requires induction hardening after primary turning.',
    components: [
      {
        id: 'bom-item-3',
        componentCode: 'RAW-EN8-BAR-32MM',
        componentName: 'EN8 Bright Drawn Steel Bar Ø32mm',
        componentType: 'RAW_MATERIAL',
        qtyPerUnit: 2.1,
        unit: 'KG',
        scrapAllowancePct: 4.0,
        stage: 'CNC_MACHINING',
        unitCost: 95
      }
    ]
  }
];

export class BomService {
  private db = getDbClient();

  async getBOMs() {
    try {
      const { data: bomData, error: bomErr } = await this.db
        .from('bill_of_materials')
        .select('*')
        .order('created_at', { ascending: false });

      if (!bomErr && bomData && bomData.length > 0) {
        const { data: itemsData } = await this.db.from('bom_items').select('*');

        return bomData.map(b => ({
          id: b.id,
          bomCode: b.bom_code,
          parentPartCode: b.parent_part_code,
          parentPartName: b.parent_part_name,
          revision: b.revision,
          yieldPercentage: Number(b.yield_percentage || 100),
          batchSize: Number(b.batch_size || 1),
          status: b.status,
          notes: b.notes,
          components: (itemsData || []).filter(i => i.bom_id === b.id).map(i => ({
            id: i.id,
            componentCode: i.component_code,
            componentName: i.component_name,
            componentType: i.component_type,
            qtyPerUnit: Number(i.qty_per_unit || 1),
            unit: i.unit || 'NOS',
            scrapAllowancePct: Number(i.scrap_allowance_pct || 0),
            stage: i.stage,
            unitCost: Number(i.unit_cost || 0)
          }))
        }));
      }
    } catch (err) {
      console.warn('Database getBOMs error:', err);
    }
    return SEED_BOMS;
  }

  async getBOMByCode(code: string) {
    try {
      const { data: b, error: bomErr } = await this.db
        .from('bill_of_materials')
        .select('*')
        .or(`id.eq.${code},bom_code.eq.${code},parent_part_code.eq.${code}`)
        .maybeSingle();

      if (!bomErr && b) {
        const { data: itemsData } = await this.db.from('bom_items').select('*').eq('bom_id', b.id);

        return {
          id: b.id,
          bomCode: b.bom_code,
          parentPartCode: b.parent_part_code,
          parentPartName: b.parent_part_name,
          revision: b.revision,
          yieldPercentage: Number(b.yield_percentage || 100),
          batchSize: Number(b.batch_size || 1),
          status: b.status,
          notes: b.notes,
          components: (itemsData || []).map(i => ({
            id: i.id,
            componentCode: i.component_code,
            componentName: i.component_name,
            componentType: i.component_type,
            qtyPerUnit: Number(i.qty_per_unit || 1),
            unit: i.unit || 'NOS',
            scrapAllowancePct: Number(i.scrap_allowance_pct || 0),
            stage: i.stage,
            unitCost: Number(i.unit_cost || 0)
          }))
        };
      }
    } catch (err) {
      console.warn('Database getBOMByCode error:', err);
    }
    return SEED_BOMS.find(b => b.id === code || b.bomCode === code || b.parentPartCode === code) || null;
  }

  async createOrUpdateBOM(data: z.infer<typeof BillOfMaterialsSchema>) {
    const validated = BillOfMaterialsSchema.parse(data);
    const bomId = validated.id || `bom-${Date.now()}`;

    try {
      const { error: insertErr } = await this.db.from('bill_of_materials').upsert({
        id: bomId,
        bom_code: validated.bomCode,
        parent_part_code: validated.parentPartCode,
        parent_part_name: validated.parentPartName,
        revision: validated.revision,
        yield_percentage: validated.yieldPercentage,
        batch_size: validated.batchSize,
        status: validated.status,
        notes: validated.notes,
        updated_at: new Date().toISOString()
      }, { onConflict: 'bom_code' });

      if (insertErr) throw insertErr;

      if (validated.components && validated.components.length > 0) {
        // Delete existing items for clean revision replacement
        await this.db.from('bom_items').delete().eq('bom_id', bomId);

        const itemRows = validated.components.map(it => ({
          id: it.id || `bom-item-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
          bom_id: bomId,
          component_code: it.componentCode,
          component_name: it.componentName,
          component_type: it.componentType,
          qty_per_unit: it.qtyPerUnit,
          unit: it.unit,
          scrap_allowance_pct: it.scrapAllowancePct,
          stage: it.stage,
          unit_cost: it.unitCost
        }));

        await this.db.from('bom_items').insert(itemRows);
      }
    } catch (err) {
      console.warn('Database createOrUpdateBOM error:', err);
    }

    const createdBOM = { id: bomId, ...validated };
    const existingIdx = SEED_BOMS.findIndex(b => b.bomCode === validated.bomCode);
    if (existingIdx >= 0) {
      SEED_BOMS[existingIdx] = createdBOM as any;
    } else {
      SEED_BOMS.unshift(createdBOM as any);
    }

    return createdBOM;
  }
}

export const bomService = new BomService();
