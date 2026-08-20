import { getDbClient } from '../../config/database';
import { z } from 'zod';
import { QCInspectionSchema, ReviewQCSchema, PDIInspectionSchema } from './qc.schema';
import { notificationsService } from '../notifications/notifications.service';
import { logAudit } from '../../services/auditLog';

const SEED_QC_QUEUE: any[] = [];
const SEED_PDI_QUEUE: any[] = [];

export class QcService {
  private db = getDbClient();

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
      console.warn('Database getQCQueue fallback:', err);
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
      console.warn('Database getQCById fallback:', err);
    }
    return SEED_QC_QUEUE.find(q => q.id === id) || null;
  }

  async createQCInspection(data: z.infer<typeof QCInspectionSchema>) {
    const validated = QCInspectionSchema.parse(data);
    const qcId = validated.id || `qc-${Date.now()}`;

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
      console.warn('Database createQCInspection fallback:', err);
    }

    const created = { id: qcId, ...validated };
    SEED_QC_QUEUE.unshift(created as any);

    // Real-Time Push: Broadcast new QC inspection in queue
    await logAudit({
      actorEmail: 'qc@guruom.in',
      action: 'QC_INSPECTION_CREATED',
      entityType: 'qc_inspections',
      entityId: String(created.id || created.jobNo || ''),
      afterState: { jobNo: created.jobNo, orderPo: created.orderPo, partCode: created.partCode, qty: created.qty },
      metadata: { details: `QC inspection queued for job ${created.jobNo} (PO ${created.orderPo})` }
    }).catch(() => {});

    notificationsService.broadcastEvent('qc_created', created);

    return created;
  }

  async reviewQCInspection(id: string, reviewData: z.infer<typeof ReviewQCSchema>) {
    const { qcStatus, inspectorNotes, defectCategory } = ReviewQCSchema.parse(reviewData);
    const inspectedAt = new Date().toISOString();
    const target = (await this.getQCById(id)) || SEED_QC_QUEUE.find(q => q.id === id);

    try {
      await this.db.from('qc_inspections').update({
        qc_status: qcStatus,
        inspector_notes: inspectorNotes,
        defect_category: defectCategory,
        inspected_at: inspectedAt
      }).eq('id', id);

      if (target) {
        if (qcStatus === 'PASS') {
          // Advance order to QC_INSPECTION (Stage 6) and clear NCR hold
          await this.db.from('customer_orders').update({
            status: 'QC_INSPECTION',
            progress_step: 6,
            has_open_ncr: false
          }).or(`po_no.eq.${target.orderPo},id.eq.${target.orderPo}`);

          await this.db.from('job_cards').update({
            status: 'COMPLETED'
          }).or(`job_no.eq.${target.jobNo},id.eq.${target.jobNo}`);

          await this.db.from('ncrs').update({
            status: 'CLOSED',
            disposition: 'USE_AS_IS_CONCESSION'
          }).or(`order_po.eq.${target.orderPo},job_no.eq.${target.jobNo}`);

          const existingPdiIdx = SEED_PDI_QUEUE.findIndex(p => p.orderPo === target.orderPo && (p.jobNo === target.jobNo || p.partCode === target.partCode));
          const pdiId = existingPdiIdx >= 0 ? SEED_PDI_QUEUE[existingPdiIdx].id : `pdi-${Date.now()}`;

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
            console.warn('DB pdi insert fallback:', pdiDbErr);
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

          // Real-Time Push: Auto-create PDI inspection in PDI queue & update order
          notificationsService.broadcastEvent('pdi_created', pdiRecord);
          notificationsService.broadcastEvent('order_transitioned', {
            orderId: target.orderPo,
            poNo: target.orderPo,
            status: 'QC_INSPECTION',
            stage: 'QC_INSPECTION',
            progressStep: 6,
            hasOpenNcr: false,
            updatedAt: new Date().toISOString()
          });
          notificationsService.broadcastEvent('order_updated', {
            id: target.orderPo,
            orderId: target.orderPo,
            poNo: target.orderPo,
            status: 'QC_INSPECTION',
            stage: 'QC_INSPECTION',
            progressStep: 6,
            hasOpenNcr: false,
            updatedAt: new Date().toISOString()
          });
        } else if (qcStatus === 'QC_HOLD' || qcStatus === 'REJECTED') {
          // Set open NCR block on parent order & put job card on QC hold
          await this.db.from('customer_orders').update({
            has_open_ncr: true
          }).or(`po_no.eq.${target.orderPo},id.eq.${target.orderPo}`);

          await this.db.from('job_cards').update({
            status: 'QC_HOLD'
          }).or(`job_no.eq.${target.jobNo},id.eq.${target.jobNo}`);

          const ncrNo = `NCR-2026-${Math.floor(1000 + Math.random() * 9000)}`;
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
      console.warn('Database reviewQCInspection fallback:', err);
    }

    const local = SEED_QC_QUEUE.find(q => q.id === id);
    if (local) {
      local.qcStatus = qcStatus;
      local.inspectorNotes = inspectorNotes;
      local.defectCategory = defectCategory;
      local.inspectedAt = inspectedAt;
    }

    const result = { id, qcStatus, inspectorNotes, defectCategory, inspectedAt };
    
    await logAudit({
      actorEmail: 'qc@guruom.in',
      action: qcStatus === 'PASS' ? 'QC_INSPECTION_PASSED' : (qcStatus === 'QC_HOLD' ? 'QC_HOLD_PLACED' : 'QC_INSPECTION_REJECTED'),
      entityType: 'qc_inspections',
      entityId: String(id || target?.jobNo || ''),
      beforeState: target ? { qcStatus: target.qcStatus, defectCategory: target.defectCategory } : null,
      afterState: { qcStatus, inspectorNotes, defectCategory, inspectedAt, orderPo: target?.orderPo, jobNo: target?.jobNo },
      metadata: { details: `QC inspection ${qcStatus} for job ${target?.jobNo || id} (PO ${target?.orderPo || ''})` }
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
      console.warn('Database getPDIQueue fallback:', err);
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

  async passPDIInspection(id: string) {
    const certNo = `PDI-2026-${Math.floor(1000 + Math.random() * 9000)}`;
    const reportDate = new Date().toISOString().split('T')[0];
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

        // Advance parent order status to READY_TO_DISPATCH (Stage 7)
        await this.db.from('customer_orders').update({
          status: 'READY_TO_DISPATCH',
          progress_step: 7,
          updated_at: new Date().toISOString()
        }).or(`po_no.eq.${pdi.order_po},id.eq.${pdi.order_po}`);
      }
    } catch (err) {
      console.warn('Database passPDIInspection fallback:', err);
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

    if (orderPo && orderPo !== 'PO') {
      try {
        const { ordersService } = await import('../orders/orders.service');
        await ordersService.updateOrder(orderPo, {
          status: 'READY_TO_DISPATCH',
          stage: 'READY_TO_DISPATCH',
          progressStep: 7
        });
      } catch (err) {
        console.warn('ordersService updateOrder on PDI pass fallback:', err);
      }
    }

    try {
      await notificationsService.triggerNotification({
        eventType: 'pdi_passed',
        entityType: 'PDI_INSPECTION',
        entityId: id,
        severity: 'INFO',
        title: `PDI Inspection Passed (${certNo})`,
        message: `Inspection cleared for ${partDesc} (${orderPo}). Certificate of Compliance ${certNo} issued.`
      });
    } catch (notifErr) {
      console.warn('Could not dispatch PDI pass notification:', notifErr);
    }

    // Record Audit Log for PDI compliance clearance
    await logAudit({
      actorEmail: 'pdi@guruom.in',
      action: 'PDI_INSPECTION_PASSED',
      entityType: 'pdi_inspections',
      entityId: String(id || local?.jobNo || orderPo),
      beforeState: local ? { pdiStatus: local.pdiStatus } : null,
      afterState: { pdiStatus: 'PASS', certificateNo: certNo, reportDate, orderPo, partCode, qty },
      metadata: { details: `PDI clearance granted for PO ${orderPo} with certificate ${certNo}` }
    }).catch(() => {});

    // Real-Time Push: Broadcast PDI pass, Finished Goods update, and Order progression
    notificationsService.broadcastEvent('pdi_updated', { id, pdiStatus: 'PASS', certificateNo: certNo, reportDate, orderPo });
    notificationsService.broadcastEvent('finished_goods_updated', { orderPo, partCode, qty });
    notificationsService.broadcastEvent('order_transitioned', {
      orderId: orderPo,
      poNo: orderPo,
      status: 'READY_TO_DISPATCH',
      stage: 'READY_TO_DISPATCH',
      progressStep: 7,
      updatedAt: new Date().toISOString()
    });
    notificationsService.broadcastEvent('order_updated', {
      id: orderPo,
      orderId: orderPo,
      poNo: orderPo,
      status: 'READY_TO_DISPATCH',
      stage: 'READY_TO_DISPATCH',
      progressStep: 7,
      updatedAt: new Date().toISOString()
    });

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
