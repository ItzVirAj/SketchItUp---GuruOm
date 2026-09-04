import { getDbClient } from '../../config/database';
import { z } from 'zod';
import { BillOfMaterialsSchema } from './bom.schema';
import { logAudit } from '../../services/auditLog';
import { auditService } from '../audit/audit.service';
import { LockService } from '../../lib/lock';

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
    
    // Look up existing BOM by ID or bomCode to preserve the primary key and avoid foreign key violations
    let bomId = validated.id;
    let existingRow: any = null;

    if (bomId) {
      const { data: byId } = await this.db.from('bill_of_materials').select('*').eq('id', bomId).maybeSingle();
      existingRow = byId;
    }

    if (!existingRow && validated.bomCode) {
      const { data: byCode } = await this.db.from('bill_of_materials').select('*').eq('bom_code', validated.bomCode).maybeSingle();
      existingRow = byCode;
      if (existingRow) {
        bomId = existingRow.id;
      }
    }

    if (!bomId) {
      bomId = `bom-${Date.now()}`;
    }

    // 1. Authoritative Validation: Parent Part MUST exist and be Active in Items Master
    const { data: parentItem, error: parentErr } = await this.db
      .from('masters')
      .select('code, name, description, item_type, status')
      .eq('code', validated.parentPartCode)
      .maybeSingle();

    if (parentErr) {
      console.error('Error validating parent item in masters:', parentErr);
      throw parentErr;
    }

    if (!parentItem) {
      const err: any = new Error(`Parent item '${validated.parentPartCode}' does not exist in Items Master.`);
      err.statusCode = 400;
      throw err;
    }

    if (parentItem.status === 'Inactive') {
      const err: any = new Error(`Parent item '${validated.parentPartCode}' is Inactive in Items Master.`);
      err.statusCode = 400;
      throw err;
    }

    // 2. Authoritative Validation: Every Component MUST exist and be Active in Items Master
    if (validated.components && validated.components.length > 0) {
      const compCodes = Array.from(new Set(validated.components.map(c => c.componentCode)));
      const { data: foundItems, error: compErr } = await this.db
        .from('masters')
        .select('code, name, description, item_type, status')
        .in('code', compCodes);

      if (compErr) {
        console.error('Error validating component items in masters:', compErr);
        throw compErr;
      }

      const foundMap = new Map((foundItems || []).map(i => [i.code, i]));

      for (const comp of validated.components) {
        const masterItem = foundMap.get(comp.componentCode);
        if (!masterItem) {
          const err: any = new Error(`Component item '${comp.componentCode}' does not exist in Items Master.`);
          err.statusCode = 400;
          throw err;
        }
        if (masterItem.status === 'Inactive') {
          const err: any = new Error(`Component item '${comp.componentCode}' is Inactive in Items Master.`);
          err.statusCode = 400;
          throw err;
        }
      }
    }

    try {
      if (existingRow) {
        const { error: updateErr } = await this.db.from('bill_of_materials').update({
          parent_part_code: validated.parentPartCode,
          parent_part_name: validated.parentPartName,
          revision: validated.revision,
          yield_percentage: validated.yieldPercentage,
          batch_size: validated.batchSize,
          status: validated.status,
          notes: validated.notes,
          updated_at: new Date().toISOString()
        }).eq('id', bomId);

        if (updateErr) {
          console.error('Error updating bill_of_materials:', updateErr);
          throw updateErr;
        }
      } else {
        const { error: insertErr } = await this.db.from('bill_of_materials').insert({
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
        });

        if (insertErr) {
          console.error('Error inserting bill_of_materials:', insertErr);
          throw insertErr;
        }
      }

      // Delete existing items for clean revision replacement
      const { error: delErr } = await this.db.from('bom_items').delete().eq('bom_id', bomId);
      if (delErr) {
        console.error('Error deleting old bom_items:', delErr);
        throw delErr;
      }

      if (validated.components && validated.components.length > 0) {
        const itemRows = validated.components.map(it => ({
          id: it.id || `bom-item-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          bom_id: bomId,
          component_code: it.componentCode,
          component_name: it.componentName,
          component_type: it.componentType || 'RAW_MATERIAL',
          qty_per_unit: it.qtyPerUnit,
          unit: it.unit || 'NOS',
          scrap_allowance_pct: it.scrapAllowancePct ?? 0,
          stage: it.stage || 'CNC_MACHINING',
          unit_cost: it.unitCost ?? 0
        }));

        const { error: insErr } = await this.db.from('bom_items').insert(itemRows);
        if (insErr) {
          console.error('Error inserting bom_items:', insErr);
          throw insErr;
        }
      }
    } catch (err) {
      console.error('Database createOrUpdateBOM error:', err);
      throw err;
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

    if (!existing) {
      const err: any = new Error(`BOM '${bomCode}' not found.`);
      err.statusCode = 404;
      throw err;
    }

    const { error } = await this.db
      .from('bill_of_materials')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('bom_code', bomCode);

    if (error) {
      console.error('Database setBOMStatus error:', error);
      const err: any = new Error(`Failed to update BOM status for '${bomCode}': ${error.message}`);
      err.code = error.code;
      err.statusCode = error.code === '23505' ? 409 : 500;
      throw err;
    }

    const bom = await this.getBOMByCode(bomCode);
    if (!bom) {
      const err: any = new Error(`BOM '${bomCode}' could not be retrieved after status update`);
      err.statusCode = 500;
      throw err;
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
    // 1. Locate the target BOM
    const { data: b, error: fetchErr } = await this.db
      .from('bill_of_materials')
      .select('*')
      .or(`bom_code.eq.${bomCode},id.eq.${bomCode}`)
      .maybeSingle();

    let targetBom = b;
    if (!targetBom) {
      // Check in-memory seed cache if offline/fallback
      const cacheBom = SEED_BOMS.find(s => s.bomCode === bomCode || s.id === bomCode);
      if (!cacheBom) {
        const err: any = new Error(`BOM '${bomCode}' not found.`);
        err.statusCode = 404;
        throw err;
      }
      targetBom = {
        id: cacheBom.id,
        bom_code: cacheBom.bomCode,
        parent_part_code: cacheBom.parentPartCode,
        revision: cacheBom.revision,
        status: cacheBom.status
      };
    }

    const parentPartCode = targetBom.parent_part_code;
    const isBomActive = (targetBom.status || 'ACTIVE').toUpperCase() === 'ACTIVE';
    const bomRevision = targetBom.revision || 'v1.0';

    // 2. Authoritative Dependency Checks:
    // A. Check Active Customer Orders
    // Terminal states that do NOT block deletion: COMPLETED, CANCELLED, CLOSED
    const TERMINAL_ORDER_STATES = ['COMPLETED', 'CANCELLED', 'CLOSED'];
    const { data: orderLines } = await this.db
      .from('order_line_items')
      .select('order_id, item_code, order_qty')
      .eq('item_code', parentPartCode);

    const activeOrders: Array<{ id: string; poNo: string; status: string }> = [];
    if (orderLines && orderLines.length > 0 && isBomActive) {
      const orderIds = Array.from(new Set(orderLines.map(l => l.order_id).filter(Boolean)));
      if (orderIds.length > 0) {
        const { data: orders } = await this.db
          .from('customer_orders')
          .select('id, po_no, status')
          .in('id', orderIds);

        for (const ord of (orders || [])) {
          const st = (ord.status || '').toUpperCase();
          if (!TERMINAL_ORDER_STATES.includes(st)) {
            activeOrders.push({ id: ord.id, poNo: ord.po_no || ord.id, status: ord.status });
          }
        }
      }
    }

    // B. Check Active Job Cards
    // Terminal states that do NOT block deletion: COMPLETED, CANCELLED, CLOSED
    const TERMINAL_JOB_STATES = ['COMPLETED', 'CANCELLED', 'CLOSED'];
    const { data: jobCards } = await this.db
      .from('job_cards')
      .select('id, job_no, part_code, drawing_revision, job_status')
      .eq('part_code', parentPartCode);

    const activeJobCards: Array<{ id: string; jobNo: string; status: string; revision?: string }> = [];
    for (const jc of (jobCards || [])) {
      const jStatus = (jc.job_status || 'NOT_STARTED').toUpperCase();
      if (!TERMINAL_JOB_STATES.includes(jStatus)) {
        // If this BOM is the active BOM, or if the job card explicitly matches this revision:
        if (isBomActive || jc.drawing_revision === bomRevision) {
          activeJobCards.push({
            id: jc.id,
            jobNo: jc.job_no,
            status: jc.job_status || 'NOT_STARTED',
            revision: jc.drawing_revision
          });
        }
      }
    }

    // C. Check Active Material Reservations
    const { data: activeRes } = await this.db
      .from('order_material_reservations')
      .select('order_id, order_po, item_code, reserved_qty, status')
      .eq('status', 'ACTIVE');

    const activeOrderIds = new Set(activeOrders.map(o => o.id));
    const activeOrderPos = new Set(activeOrders.map(o => o.poNo));
    const activeReservations = (activeRes || []).filter(r =>
      activeOrderIds.has(r.order_id) || activeOrderPos.has(r.order_po)
    );

    // 3. Block Deletion if Any Active Dependencies Exist
    if (activeOrders.length > 0 || activeJobCards.length > 0 || activeReservations.length > 0) {
      const reasons: string[] = [];
      if (activeOrders.length > 0) {
        const orderSummary = activeOrders.map(o => `${o.poNo} [${o.status}]`).slice(0, 3).join(', ') +
          (activeOrders.length > 3 ? ` and ${activeOrders.length - 3} more` : '');
        reasons.push(`${activeOrders.length} active customer order(s) (${orderSummary})`);
      }
      if (activeJobCards.length > 0) {
        const jobSummary = activeJobCards.map(j => `${j.jobNo} [${j.status}]`).slice(0, 3).join(', ') +
          (activeJobCards.length > 3 ? ` and ${activeJobCards.length - 3} more` : '');
        reasons.push(`${activeJobCards.length} active job card(s) (${jobSummary})`);
      }
      if (activeReservations.length > 0) {
        reasons.push(`${activeReservations.length} active material reservation(s)`);
      }

      const conflictErr: any = new Error(
        `Cannot delete BOM '${targetBom.bom_code}': ${reasons.join(' and ')} currently depend on it.`
      );
      conflictErr.statusCode = 409;
      conflictErr.code = 'BOM_IN_USE';
      conflictErr.details = {
        bomCode: targetBom.bom_code,
        parentPartCode,
        activeOrders,
        activeJobCards,
        activeReservationsCount: activeReservations.length
      };
      throw conflictErr;
    }

    // 4. Concurrency Lock & Atomic Deletion
    return await LockService.withLock(`bom:${parentPartCode}`, 5000, async () => {
      // Double-check existence inside lock to prevent concurrent double-delete race
      const { data: stillExists } = await this.db
        .from('bill_of_materials')
        .select('id')
        .eq('id', targetBom.id)
        .maybeSingle();

      if (!stillExists) {
        const notFoundErr: any = new Error(`BOM '${bomCode}' has already been deleted or does not exist.`);
        notFoundErr.statusCode = 404;
        throw notFoundErr;
      }

      try {
        // Delete parent bill_of_materials row (PostgreSQL cascades to bom_items via foreign key)
        const { error: bomErr } = await this.db
          .from('bill_of_materials')
          .delete()
          .eq('id', targetBom.id);

        if (bomErr) {
          // If DB trigger or FK failed, rethrow with business conflict code
          if (bomErr.code === '23503' || bomErr.message?.includes('BOM_IN_USE')) {
            const conflictErr: any = new Error(`Cannot delete BOM '${targetBom.bom_code}': ${bomErr.message}`);
            conflictErr.statusCode = 409;
            conflictErr.code = 'BOM_IN_USE';
            throw conflictErr;
          }
          throw bomErr;
        }

        // Also ensure bom_items are cleaned up if cascading is not active
        await this.db.from('bom_items').delete().eq('bom_id', targetBom.id);

        // Keep the offline in-memory cache consistent
        const cacheIdx = SEED_BOMS.findIndex(b => b.bomCode === targetBom.bom_code || b.id === targetBom.id);
        if (cacheIdx >= 0) SEED_BOMS.splice(cacheIdx, 1);
      } catch (err: any) {
        if (err.statusCode === 409 || err.code === 'BOM_IN_USE') throw err;
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
        entityId: targetBom.bom_code,
        afterState: null,
        metadata: { details: `BOM ${targetBom.bom_code} deleted from system.` }
      }).catch(() => {});

      return { success: true, bomCode: targetBom.bom_code };
    });
  }
}

export const bomService = new BomService();
