import { getDbClient } from '../../config/database';
import { z } from 'zod';
import { BillOfMaterialsSchema } from './bom.schema';
import { logAudit } from '../../services/auditLog';
import { auditService } from '../audit/audit.service';

const SEED_BOMS: any[] = [];

export class BomService {
  private db = getDbClient();

  async getBOMs() {
    try {
      const { data: bomData, error: bomErr } = await this.db
        .from('bill_of_materials')
        .select('*')
        .order('created_at', { ascending: false });

      // DB is the source of truth: an empty result means "no BOMs" (never fall back to the cache here)
      if (!bomErr) {
        const { data: itemsData } = await this.db.from('bom_items').select('*');

        return (bomData || []).map(b => ({
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
    // Only reached when the database is unreachable — serve the offline cache
    return SEED_BOMS;
  }

  async getBOMByCode(code: string) {
    try {
      const { data: b, error: bomErr } = await this.db
        .from('bill_of_materials')
        .select('*')
        .or(`id.eq.${code},bom_code.eq.${code},parent_part_code.eq.${code}`)
        .maybeSingle();

      // DB success wins: a missing row means "not found" (never fall back to the cache here)
      if (!bomErr) {
        if (!b) return null;
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

  async createOrUpdateBOM(data: z.infer<typeof BillOfMaterialsSchema>, actorEmail?: string, actorRole?: string) {
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

    const effectiveEmail = (actorEmail && actorEmail.includes('@')) ? actorEmail : (actorEmail || 'engineering@guruom.in');
    const effectiveRole = actorRole || 'Manufacturing Engineer';

    await auditService.recordAuditLog({
      actorEmail: effectiveEmail,
      actorRole: effectiveRole,
      action: 'BOM_CREATED_OR_UPDATED',
      entityType: 'bill_of_materials',
      entityId: String(validated.bomCode),
      afterState: { parentPartCode: validated.parentPartCode, revision: validated.revision, componentCount: (validated.components || []).length, batchSize: validated.batchSize },
      metadata: { details: `BOM ${validated.bomCode} created/updated for ${validated.parentPartCode} (${(validated.components || []).length} components, rev ${validated.revision})` }
    }).catch(() => {});

    const createdBOM = { id: bomId, ...validated };
    const existingIdx = SEED_BOMS.findIndex(b => b.bomCode === validated.bomCode);
    if (existingIdx >= 0) {
      SEED_BOMS[existingIdx] = createdBOM as any;
    } else {
      SEED_BOMS.unshift(createdBOM as any);
    }

    return createdBOM;
  }

  async duplicateBOM(sourceBomCode: string, targetBomCode: string, targetPartCode?: string, targetPartName?: string) {
    const source = await this.getBOMByCode(sourceBomCode);
    if (!source) {
      throw new Error(`Source BOM ${sourceBomCode} not found`);
    }

    const duplicated: z.infer<typeof BillOfMaterialsSchema> = {
      bomCode: targetBomCode || `${source.bomCode}-COPY`,
      parentPartCode: targetPartCode || source.parentPartCode,
      parentPartName: targetPartName || source.parentPartName,
      revision: 'REV-A',
      yieldPercentage: source.yieldPercentage,
      batchSize: source.batchSize,
      status: 'DRAFT',
      notes: `Duplicated from ${sourceBomCode}`,
      components: (source.components || []).map(c => ({
        ...c,
        id: undefined
      }))
    };

    return this.createOrUpdateBOM(duplicated);
  }

  async createBOMRevision(sourceBomCode: string, newRevision: string) {
    const source = await this.getBOMByCode(sourceBomCode);
    if (!source) {
      throw new Error(`Source BOM ${sourceBomCode} not found`);
    }

    const nextRev: z.infer<typeof BillOfMaterialsSchema> = {
      ...source,
      id: undefined,
      bomCode: `${source.parentPartCode}-${newRevision}`,
      revision: newRevision,
      status: 'ACTIVE',
      notes: `New engineering revision ${newRevision} generated from ${source.revision}`,
      components: (source.components || []).map(c => ({
        ...c,
        id: undefined
      }))
    };

    return this.createOrUpdateBOM(nextRev);
  }

  async setBOMStatus(bomCode: string, status: 'ACTIVE' | 'DRAFT' | 'OBSOLETE', actorEmail?: string, actorRole?: string) {
    const existing = await this.getBOMByCode(bomCode);
    const oldStatus = existing?.status || 'UNKNOWN';

    try {
      const { error } = await this.db
        .from('bill_of_materials')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('bom_code', bomCode);

      if (error) console.error('Database setBOMStatus error:', error);
    } catch (err) {
      console.warn('Database setBOMStatus exception:', err);
    }

    const bom = await this.getBOMByCode(bomCode);
    if (bom) {
      bom.status = status;
    }

    const effectiveEmail = (actorEmail && actorEmail.includes('@')) ? actorEmail : (actorEmail || 'engineering@guruom.in');
    const effectiveRole = actorRole || 'Manufacturing Engineer';

    await auditService.recordAuditLog({
      actorEmail: effectiveEmail,
      actorRole: effectiveRole,
      action: 'BOM_STATUS_CHANGED',
      entityType: 'bill_of_materials',
      entityId: bomCode,
      beforeState: { status: oldStatus },
      afterState: { status },
      metadata: { details: `BOM ${bomCode} status changed from ${oldStatus} to ${status}` }
    }).catch(() => {});

    return bom;
  }

  async deleteBOM(bomCode: string, actorEmail?: string, actorRole?: string) {
    // Check if BOM has open customer orders / job cards before deleting
    try {
      const { error: itemErr } = await this.db.from('bom_items').delete().eq('bom_id', bomCode);
      const { error: bomErr } = await this.db.from('bill_of_materials').delete().or(`bom_code.eq.${bomCode},id.eq.${bomCode}`);
      if (bomErr) throw bomErr;

      // Keep the offline in-memory cache consistent with the database
      const cacheIdx = SEED_BOMS.findIndex(b => b.bomCode === bomCode || b.id === bomCode || b.parentPartCode === bomCode);
      if (cacheIdx >= 0) SEED_BOMS.splice(cacheIdx, 1);
    } catch (err: any) {
      console.warn('Database deleteBOM exception:', err);
      throw new Error(`Failed to delete BOM ${bomCode}: ${err.message}`);
    }

    const effectiveEmail = (actorEmail && actorEmail.includes('@')) ? actorEmail : (actorEmail || 'engineering@guruom.in');
    const effectiveRole = actorRole || 'Manufacturing Engineer';

    await auditService.recordAuditLog({
      actorEmail: effectiveEmail,
      actorRole: effectiveRole,
      action: 'BOM_DELETED',
      entityType: 'bill_of_materials',
      entityId: bomCode,
      afterState: null,
      metadata: { details: `BOM ${bomCode} deleted from system.` }
    }).catch(() => {});

    return { success: true, bomCode };
  }
}

export const bomService = new BomService();
