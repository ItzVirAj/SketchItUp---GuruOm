import { getDbClient } from '../../config/database';
import { z } from 'zod';
import { QCInspectionSchema, ReviewQCSchema, PDIInspectionSchema } from './qc.schema';
import { notificationsService } from '../notifications/notifications.service';
import { logAudit } from '../../services/auditLog';
import { inventoryMovementsService } from '../inventory/inventory_movements.service';
import { auditService } from '../audit/audit.service';
import { getNextDocumentNumber } from '../../utils/documentNumbers';
import { logger } from '../../utils/logger';

const SEED_QC_QUEUE: any[] = [];
const SEED_PDI_QUEUE: any[] = [];

export class QcService {
  private db = getDbClient();

  /** Resolves an order header by PO number or id (records may carry either in order_po). */
  private async resolveOrderRow(
    orderRef: string
  ): Promise<{ id: string; po_no: string; status?: string; stage?: string } | null> {
    if (!orderRef) return null;
    const cols = 'id, po_no, status, stage';
    const byPo = await this.db.from('customer_orders').select(cols).eq('po_no', orderRef).maybeSingle();
    if (byPo.error) throw byPo.error;
    if (byPo.data) return byPo.data as any;
    const byId = await this.db.from('customer_orders').select(cols).eq('id', orderRef).maybeSingle();
    if (byId.error) throw byId.error;
    return (byId.data as any) || null;
  }

  /**
   * True only when EVERY non-cancelled job card on the order has finished production AND has a
   * qc_inspections row with qc_status = 'PASS'. Used to gate the order's advance to QC_INSPECTION
   * so passing one job card (of several on the same PO) can never flip the whole order.
   * Fail-closed: any lookup error returns false (order stays where it is).
   */
  private async isOrderQcComplete(orderRef: string): Promise<boolean> {
    if (!orderRef) return false;
    const norm = (v: unknown) => String(v ?? '').trim().toUpperCase();
    try {
      const orderRow = await this.resolveOrderRow(orderRef);
      const refs = Array.from(new Set([orderRef, orderRow?.po_no, orderRow?.id].filter(Boolean) as string[]));

      const { data: cardRows, error: cardErr } = await this.db
        .from('job_cards').select('job_no, status').in('order_po', refs);
      if (cardErr) throw cardErr;
      const cards = (cardRows || []).filter((c: any) => norm(c.status) !== 'CANCELLED');
      if (cards.length === 0) return false;

      // Every job card must have finished production first.
      if (cards.some((c: any) => norm(c.status) !== 'COMPLETED')) return false;

      const { data: qcRows, error: qcErr } = await this.db
        .from('qc_inspections').select('job_no, qc_status').in('order_po', refs);
      if (qcErr) throw qcErr;
      const qcByJob = new Map<string, string>();
      for (const q of qcRows || []) qcByJob.set(norm((q as any).job_no), norm((q as any).qc_status));

      // Every job card needs a QC record, and every one of them must be PASS.
      return cards.every((c: any) => qcByJob.get(norm(c.job_no)) === 'PASS');
    } catch (err) {
      logger.warn(`isOrderQcComplete check failed for ${orderRef}; order NOT auto-advanced:`, err);
      return false;
    }
  }

  /**
   * True only when EVERY non-cancelled job card that has passed QC also has a pdi_inspections row
   * with pdi_status = 'PASS'. Mirrors isOrderQcComplete for the QC -> PDI -> dispatch-ready step.
   */
  private async isOrderPdiComplete(orderRef: string): Promise<boolean> {
    if (!orderRef) return false;
    const norm = (v: unknown) => String(v ?? '').trim().toUpperCase();
    try {
      const orderRow = await this.resolveOrderRow(orderRef);
      const refs = Array.from(new Set([orderRef, orderRow?.po_no, orderRow?.id].filter(Boolean) as string[]));

      const { data: qcRows, error: qcErr } = await this.db
        .from('qc_inspections').select('job_no, qc_status').in('order_po', refs);
      if (qcErr) throw qcErr;
      const passedJobs = (qcRows || []).filter((q: any) => norm(q.qc_status) === 'PASS').map((q: any) => norm(q.job_no));
      if (passedJobs.length === 0) return false;

      const { data: pdiRows, error: pdiErr } = await this.db
        .from('pdi_inspections').select('job_no, pdi_status').in('order_po', refs);
      if (pdiErr) throw pdiErr;
      const pdiByJob = new Map<string, string>();
      for (const p of pdiRows || []) pdiByJob.set(norm((p as any).job_no), norm((p as any).pdi_status));

      return passedJobs.every(jobNo => pdiByJob.get(jobNo) === 'PASS');
    } catch (err) {
      logger.warn(`isOrderPdiComplete check failed for ${orderRef}; order NOT auto-advanced:`, err);
      return false;
    }
  }

  /**
   * Moves an order to a target stage through the order state machine, never overriding a rule
   * rejection. Shared by the QC-pass -> QC_INSPECTION and PDI-pass -> READY_TO_DISPATCH advances,
   * mirroring productionService.moveOrderToReadyForQc's fail-closed design:
   * - Success: transitionOrderStage persists and broadcasts.
   * - Rejected by a rule (HTTP 400 - a gate said no, or the order is in a stage that may not move
   *   to this target): NEVER overridden. Logged + audited so a stuck order is explainable.
   * - Any other failure (lookup miss, lock timeout, concurrent edit, DB error): a guarded direct
   *   write, conditional on the order really being in one of `fromStatuses`, announced only if a
   *   row actually moved. A 404 still broadcasts (records can exist for POs without an order row).
   */
  private async moveOrderToStage(
    orderRef: string,
    targetStage: 'QC_INSPECTION' | 'READY_TO_DISPATCH',
    progressStep: number,
    fromStatuses: string[],
    actor: { role: string; name: string }
  ): Promise<void> {
    try {
      const { ordersService } = await import('../orders/orders.service');
      await ordersService.transitionOrderStage(orderRef, targetStage as any, {}, actor);
      return;
    } catch (err: any) {
      const status = err?.statusCode;

      if (status === 400) {
        logger.warn(`Order ${orderRef} not advanced to ${targetStage}: ${err.message}`);
        await auditService.recordAuditLog({
          actorEmail: actor.name,
          actorRole: actor.role,
          action: 'ORDER_STAGE_ADVANCE_BLOCKED',
          entityType: 'customer_orders',
          entityId: orderRef,
          details: `Automatic advance to ${targetStage} blocked: ${err.message}`
        } as any).catch(() => {});
        return;
      }

      logger.warn(`transitionOrderStage(${targetStage}) failed for ${orderRef}; using guarded fallback:`, err);
      const nowIso = new Date().toISOString();
      const { data: moved, error: updErr } = await this.db
        .from('customer_orders')
        .update({ status: targetStage, stage: targetStage, progress_step: progressStep, updated_at: nowIso })
        .or(`po_no.eq.${orderRef},id.eq.${orderRef}`)
        .in('status', fromStatuses)
        .select('id');
      if (updErr) logger.warn(`Guarded ${targetStage} fallback update failed for ${orderRef}:`, updErr);

      const didMove = !updErr && (moved?.length || 0) > 0;
      if (!didMove && status !== 404) return;

      notificationsService.broadcastEvent('order_transitioned', {
        orderId: orderRef, poNo: orderRef, status: targetStage, stage: targetStage, progressStep, updatedAt: nowIso
      });
      notificationsService.broadcastEvent('order_updated', {
        id: orderRef, orderId: orderRef, poNo: orderRef, status: targetStage, stage: targetStage, progressStep, updatedAt: nowIso
      });
    }
  }

  async getQCQueue() {
    try {
      const { data, error } = await this.db
        .from('qc_inspections')
        .select('*')
        .order('created_at', { ascending: false });

      if (!error && data && data.length > 0) {
        return data.map(q => ({
          id: q.id,
          jobNo: q.job_no,
          orderPo: q.order_po,
          partCode: q.part_code,
          partDescription: q.part_description,
          qty: Number(q.qty || 0),
          jobStatus: q.job_status,
          qcStatus: q.qc_status,
          inspectorNotes: q.inspector_notes,
          defectCategory: q.defect_category,
          inspectedAt: q.inspected_at
        }));
      }
    } catch (err) {
      logger.warn('Database getQCQueue fallback:', err);
    }
    return SEED_QC_QUEUE;
  }

  async getQCById(id: string) {
    try {
      const { data, error } = await this.db
        .from('qc_inspections')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (!error && data) {
        return {
          id: data.id,
          jobNo: data.job_no,
          orderPo: data.order_po,
          partCode: data.part_code,
          partDescription: data.part_description,
          qty: Number(data.qty || 0),
          jobStatus: data.job_status,
          qcStatus: data.qc_status,
          inspectorNotes: data.inspector_notes,
          defectCategory: data.defect_category,
          inspectedAt: data.inspected_at
        };
      }
    } catch (err) {
      logger.warn('Database getQCById fallback:', err);
    }
    return SEED_QC_QUEUE.find(q => q.id === id) || null;
  }

  async createQCInspection(data: z.infer<typeof QCInspectionSchema>, actorEmail?: string, actorRole?: string) {
    const validated = QCInspectionSchema.parse(data);
    // Extra entropy beyond Date.now(): two job cards can complete production in the same
    // millisecond (e.g. a bulk 'complete all steps' action), and a bare timestamp id would collide.
    const qcId = validated.id || `qc-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    // Idempotency guard: production completion can trigger this from two independent code paths
    // (completeOperation and recordProductionLog). Without this check a job could end up with two
    // qc_inspections rows, and reviewing the visible one would silently leave the other PENDING -
    // which reads exactly like "I passed QC and it reverted to pending" once the queue refreshes.
    if (validated.jobNo) {
      try {
        const { data: existing, error: lookupErr } = await this.db
          .from('qc_inspections').select('*').eq('job_no', validated.jobNo).maybeSingle();
        if (!lookupErr && existing) {
          logger.info(`QC inspection already exists for job ${validated.jobNo} (${existing.id}); skipping duplicate creation.`);
          return {
            id: existing.id,
            jobNo: existing.job_no,
            orderPo: existing.order_po,
            partCode: existing.part_code,
            partDescription: existing.part_description,
            qty: Number(existing.qty || 0),
            jobStatus: existing.job_status,
            qcStatus: existing.qc_status,
            inspectorNotes: existing.inspector_notes,
            defectCategory: existing.defect_category,
            inspectedAt: existing.inspected_at
          };
        }
      } catch (lookupErr) {
        logger.warn(`QC inspection existence check failed for job ${validated.jobNo}; proceeding to create:`, lookupErr);
      }
    }

    try {
      const { error } = await this.db.from('qc_inspections').insert({
        id: qcId,
        job_no: validated.jobNo,
        order_po: validated.orderPo,
        part_code: validated.partCode,
        part_description: validated.partDescription,
        qty: validated.qty,
        job_status: validated.jobStatus,
        qc_status: validated.qcStatus,
        inspector_notes: validated.inspectorNotes,
        defect_category: validated.defectCategory,
        inspected_at: validated.inspectedAt,
        created_at: new Date().toISOString()
      });

      if (error) throw error;
    } catch (err) {
      logger.warn('Database createQCInspection fallback:', err);
    }

    const created = { id: qcId, ...validated };
    SEED_QC_QUEUE.unshift(created as any);

    const effectiveEmail = (actorEmail && actorEmail.includes('@')) ? actorEmail : (actorEmail || 'qc@guruom.in');
    const effectiveRole = actorRole || 'Quality Inspector';

    // Structured Audit Log for QC inspection creation
    await auditService.recordAuditLog({
      actorEmail: effectiveEmail,
      actorRole: effectiveRole,
      action: 'QC_INSPECTION_CREATED',
      entityType: 'qc_inspections',
      entityId: String(created.id || created.jobNo || ''),
      afterState: { jobNo: created.jobNo, orderPo: created.orderPo, partCode: created.partCode, qty: created.qty },
      metadata: { details: `QC inspection queued for job ${created.jobNo} (PO ${created.orderPo})` }
    }).catch(() => {});

    notificationsService.broadcastEvent('qc_created', created);

    return created;
  }

  async reviewQCInspection(id: string, reviewData: z.infer<typeof ReviewQCSchema>, actorEmail?: string, actorRole?: string) {
    const { qcStatus, inspectorNotes, defectCategory } = ReviewQCSchema.parse(reviewData);
    const inspectedAt = new Date().toISOString();
    const target = (await this.getQCById(id)) || SEED_QC_QUEUE.find(q => q.id === id);

    const effectiveEmail = (actorEmail && actorEmail.includes('@')) ? actorEmail : (actorEmail || 'qc@guruom.in');
    const effectiveRole = actorRole || 'Quality Manager';
    const actor = { role: effectiveRole, name: effectiveEmail };

    try {
      await this.db.from('qc_inspections').update({
        qc_status: qcStatus,
        inspector_notes: inspectorNotes,
        defect_category: defectCategory,
        inspected_at: inspectedAt
      }).eq('id', id);

      if (target) {
        if (qcStatus === 'PASS') {
          await this.db.from('job_cards').update({
            status: 'COMPLETED'
          }).or(`job_no.eq.${target.jobNo},id.eq.${target.jobNo}`);

          // Close ONLY the NCR(s) tied to THIS job - an order-wide filter here would also close an
          // unrelated sibling job's still-open NCR just because a different job passed QC.
          await this.db.from('ncrs').update({
            status: 'CLOSED',
            disposition: 'USE_AS_IS_CONCESSION'
          }).eq('job_no', target.jobNo).in('status', ['OPEN', 'UNDER_REVIEW', 'REWORK_PLANNED']);

          const existingPdiIdx = SEED_PDI_QUEUE.findIndex(p => p.orderPo === target.orderPo && (p.jobNo === target.jobNo || p.partCode === target.partCode));
          const pdiId = existingPdiIdx >= 0 ? SEED_PDI_QUEUE[existingPdiIdx].id : `pdi-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

          try {
            await this.db.from('pdi_inspections').upsert({
              id: pdiId,
              job_no: target.jobNo,
              order_po: target.orderPo,
              part_code: target.partCode,
              part_description: target.partDescription,
              qty: target.qty,
              pdi_status: 'PENDING',
              created_at: new Date().toISOString()
            });
          } catch (pdiDbErr) {
            logger.warn('DB pdi insert fallback:', pdiDbErr);
          }

          const pdiRecord = {
            id: pdiId,
            jobNo: target.jobNo,
            orderPo: target.orderPo,
            partCode: target.partCode,
            partDescription: target.partDescription,
            qty: target.qty,
            pdiStatus: 'PENDING'
          };

          if (existingPdiIdx >= 0) {
            SEED_PDI_QUEUE[existingPdiIdx] = {
              ...SEED_PDI_QUEUE[existingPdiIdx],
              ...pdiRecord
            };
          } else {
            SEED_PDI_QUEUE.unshift(pdiRecord as any);
          }

          // Real-Time Push: Auto-create PDI inspection in PDI queue
          notificationsService.broadcastEvent('pdi_created', pdiRecord);

          // Whole-order state only moves once EVERY job card on this PO has passed QC - passing
          // ONE of several job cards must never advance the order or clear its NCR flag for the rest.
          let orderStillHasOpenNcr = true;
          try {
            const { data: openNcrs, error: ncrCheckErr } = await this.db
              .from('ncrs').select('id')
              .or(`order_po.eq.${target.orderPo}`)
              .in('status', ['OPEN', 'UNDER_REVIEW', 'REWORK_PLANNED']);
            if (!ncrCheckErr) orderStillHasOpenNcr = (openNcrs?.length || 0) > 0;
          } catch (ncrCheckErr) {
            logger.warn(`Open-NCR recheck failed for ${target.orderPo}; leaving has_open_ncr untouched:`, ncrCheckErr);
            orderStillHasOpenNcr = true; // fail closed: don't clear a hold flag we can't verify
          }
          if (!orderStillHasOpenNcr) {
            await this.db.from('customer_orders').update({ has_open_ncr: false })
              .or(`po_no.eq.${target.orderPo},id.eq.${target.orderPo}`);
          }
          notificationsService.broadcastEvent('order_updated', {
            id: target.orderPo, orderId: target.orderPo, poNo: target.orderPo, hasOpenNcr: orderStillHasOpenNcr
          });

          if (await this.isOrderQcComplete(target.orderPo)) {
            await this.moveOrderToStage(target.orderPo, 'QC_INSPECTION', 6, ['READY_FOR_QC', 'QC_HOLD', 'IN_PRODUCTION'], actor);
          }
        } else if (qcStatus === 'QC_HOLD' || qcStatus === 'REJECTED') {
          // Set open NCR block on parent order & put job card on QC hold
          await this.db.from('customer_orders').update({
            has_open_ncr: true
          }).or(`po_no.eq.${target.orderPo},id.eq.${target.orderPo}`);

          await this.db.from('job_cards').update({
            status: 'QC_HOLD'
          }).or(`job_no.eq.${target.jobNo},id.eq.${target.jobNo}`);

          const ncrNo = await getNextDocumentNumber('NCR', 'NCR');
          await this.db.from('ncrs').insert({
            id: `ncr-${Date.now()}`,
            ncr_number: ncrNo,
            job_no: target.jobNo,
            order_po: target.orderPo,
            part_code: target.partCode,
            description: defectCategory || inspectorNotes || 'Dimensional out-of-tolerance detected during QC review',
            status: 'OPEN',
            severity: qcStatus === 'REJECTED' ? 'CRITICAL' : 'MAJOR',
            created_at: new Date().toISOString()
          });

          notificationsService.broadcastEvent('order_updated', {
            id: target.orderPo,
            poNo: target.orderPo,
            hasOpenNcr: true
          });
        }
      }
    } catch (err) {
      logger.warn('Database reviewQCInspection fallback:', err);
    }

    const local = SEED_QC_QUEUE.find(q => q.id === id);
    if (local) {
      local.qcStatus = qcStatus;
      local.inspectorNotes = inspectorNotes;
      local.defectCategory = defectCategory;
      local.inspectedAt = inspectedAt;
    }

    const result = { id, qcStatus, inspectorNotes, defectCategory, inspectedAt };

    await auditService.recordAuditLog({
      actorEmail: effectiveEmail,
      actorRole: effectiveRole,
      action: 'QC_INSPECTION_REVIEWED',
      entityType: 'qc_inspections',
      entityId: String(id || target?.jobNo || ''),
      beforeState: target ? { qcStatus: target.qcStatus, defectCategory: target.defectCategory } : null,
      afterState: { qcStatus, inspectorNotes, defectCategory, inspectedAt, orderPo: target?.orderPo, jobNo: target?.jobNo },
      metadata: { details: `QC inspection reviewed with outcome ${qcStatus} for job ${target?.jobNo || id} (PO ${target?.orderPo || ''})` }
    }).catch(() => {});

    notificationsService.broadcastEvent('qc_updated', result);

    return result;
  }

  async getPDIQueue() {
    let rawList: any[] = [];
    try {
      const { data, error } = await this.db
        .from('pdi_inspections')
        .select('*')
        .order('created_at', { ascending: false });

      if (!error && data && data.length > 0) {
        rawList = data.map(p => ({
          id: p.id,
          jobNo: p.job_no,
          orderPo: p.order_po,
          partCode: p.part_code,
          partDescription: p.part_description,
          qty: Number(p.qty || 0),
          pdiStatus: p.pdi_status,
          certificateNo: p.certificate_no,
          reportDate: p.report_date
        }));
      }
    } catch (err) {
      logger.warn('Database getPDIQueue fallback:', err);
    }

    if (rawList.length === 0) {
      rawList = SEED_PDI_QUEUE;
    }

    // Deduplicate by unique orderPo + jobNo + partCode (preserve latest status)
    const map = new Map<string, any>();
    for (const item of rawList) {
      const key = `${(item.orderPo || '').trim().toUpperCase()}_${(item.jobNo || '').trim().toUpperCase()}`;
      if (key !== '_') {
        if (!map.has(key)) {
          map.set(key, item);
        }
      } else {
        map.set(item.id, item);
      }
    }
    return Array.from(map.values());
  }

  async passPDIInspection(id: string, actorEmail?: string, actorRole?: string) {
    const certNo = await getNextDocumentNumber('PDI', 'PDI');
    const reportDate = new Date().toISOString().split('T')[0];
    const effectiveEmail = (actorEmail && actorEmail.includes('@')) ? actorEmail : (actorEmail || 'qc@guruom.in');
    const effectiveRole = actorRole || 'Quality Inspector';

    let dbPdi: any = null;
    try {
      await this.db.from('pdi_inspections').update({
        pdi_status: 'PASS',
        certificate_no: certNo,
        report_date: reportDate
      }).eq('id', id);

      const { data: pdi } = await this.db.from('pdi_inspections').select('*').eq('id', id).single();
      dbPdi = pdi;
      if (pdi) {
        const fgId = `fg-${Date.now()}`;
        await this.db.from('finished_goods').insert({
          id: fgId,
          order_po: pdi.order_po,
          part_code: pdi.part_code,
          part_description: pdi.part_description,
          pdi_passed_qty: pdi.qty,
          physically_held_qty: pdi.qty,
          dispatched_qty: 0,
          variance: 0,
          created_at: new Date().toISOString()
        });

        // AUTOMATED: Record PRODUCTION_OUTPUT movement — finished goods enter inventory ledger
        await inventoryMovementsService.recordMovement({
          itemCode: pdi.part_code,
          quantityChange: Number(pdi.qty || 0),
          movementType: 'PRODUCTION_OUTPUT',
          referenceId: pdi.order_po,
          referenceType: 'job_card',
          actorEmail: effectiveEmail,
          notes: `PDI passed for PO ${pdi.order_po} — ${pdi.qty} × ${pdi.part_description} added to Finished Goods stock`
        });

      }
    } catch (err) {
      logger.warn('Database passPDIInspection fallback:', err);
    }

    const local = SEED_PDI_QUEUE.find(p => p.id === id);
    if (local) {
      local.pdiStatus = 'PASS';
      local.certificateNo = certNo;
      local.reportDate = reportDate;
    }

    const orderPo = dbPdi?.order_po || local?.orderPo || 'PO';
    const partCode = dbPdi?.part_code || local?.partCode;
    const partDesc = dbPdi?.part_description || local?.partDescription || 'Manufactured Item';
    const qty = dbPdi?.qty || local?.qty;

    // Whole-order advance to READY_TO_DISPATCH only once EVERY job card that passed QC also has a
    // PASS PDI record - passing PDI for ONE of several job cards on the PO must never advance the
    // whole order (dispatch creation is separately gated by checkDispatchEligibility either way,
    // but the order's displayed stage/status must not lie about being ready before it really is).
    if (orderPo && orderPo !== 'PO' && await this.isOrderPdiComplete(orderPo)) {
      await this.moveOrderToStage(orderPo, 'READY_TO_DISPATCH', 7, ['QC_INSPECTION'], { role: effectiveRole, name: effectiveEmail });
    }

    try {
      await notificationsService.triggerNotification({
        eventType: 'pdi_passed',
        entityType: 'PDI_INSPECTION',
        entityId: id,
        severity: 'INFO',
        title: `PDI Inspection Passed (${certNo})`,
        message: `Inspection cleared for ${partDesc} (${orderPo}). Certificate of Compliance ${certNo} issued.`,
        isTest: false
      });
    } catch (notifErr) {
      logger.warn('Could not dispatch PDI pass notification:', notifErr);
    }

    // Record Audit Log for PDI compliance clearance
    await auditService.recordAuditLog({
      actorEmail: effectiveEmail,
      actorRole: effectiveRole,
      action: 'PDI_INSPECTION_PASSED',
      entityType: 'pdi_inspections',
      entityId: String(id || local?.jobNo || orderPo),
      beforeState: local ? { pdiStatus: local.pdiStatus } : null,
      afterState: { pdiStatus: 'PASS', certificateNo: certNo, reportDate, orderPo, partCode, qty },
      metadata: { details: `PDI inspection passed for PO ${orderPo} with certificate ${certNo}` }
    }).catch(() => {});

    // Real-Time Push: Broadcast PDI pass, Finished Goods update, and Order progression
    notificationsService.broadcastEvent('pdi_updated', { id, pdiStatus: 'PASS', certificateNo: certNo, reportDate, orderPo });
    notificationsService.broadcastEvent('finished_goods_updated', { orderPo, partCode, qty });

    return { id, pdiStatus: 'PASS', certificateNo: certNo, reportDate };
  }


  /**
   * Enforces backend-side check whether an Order PO has passed all QC and PDI checks
   * before outward dispatch can be created.
   */
  async checkDispatchEligibility(orderPo: string) {
    const allQC = await this.getQCQueue();
    const allPDI = await this.getPDIQueue();

    const relatedQC = allQC.filter(q => q.orderPo.toLowerCase() === orderPo.toLowerCase());
    const relatedPDI = allPDI.filter(p => p.orderPo.toLowerCase() === orderPo.toLowerCase());

    const pendingQC = relatedQC.filter(q => q.qcStatus !== 'PASS');
    const pendingPDI = relatedPDI.filter(p => p.pdiStatus !== 'PASS');

    const passedPDI = relatedPDI.filter(p => p.pdiStatus === 'PASS');

    const reasons: string[] = [];
    if (pendingQC.length > 0) {
      reasons.push(`${pendingQC.length} QC inspection(s) pending or on hold.`);
    }
    if (pendingPDI.length > 0) {
      reasons.push(`${pendingPDI.length} PDI compliance certificate(s) pending.`);
    }
    if (relatedPDI.length === 0) {
      reasons.push('No PDI inspection records found for this order.');
    }

    const eligible = reasons.length === 0 && passedPDI.length > 0;

    return {
      orderPo,
      eligible,
      passedPdiCount: passedPDI.length,
      pendingQcCount: pendingQC.length,
      pendingPdiCount: pendingPDI.length,
      reasons
    };
  }
}

export const qcService = new QcService();
