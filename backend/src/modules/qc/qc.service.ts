import { getDbClient } from '../../config/database';
import { z } from 'zod';
import { QCInspectionSchema, ReviewQCSchema, PDIInspectionSchema } from './qc.schema';
import { notificationsService } from '../notifications/notifications.service';

const SEED_QC_QUEUE = [
  {
    id: 'qc-1',
    jobNo: 'JC/0001/26-27',
    orderPo: 'PO-2026-001',
    partCode: '00000001',
    partDescription: 'MAIN SPINDLE HOUSING 120MM',
    qty: 60,
    jobStatus: 'IN_INSPECTION',
    qcStatus: 'PENDING',
    inspectorNotes: 'Bore tolerance check required (H7 limit)',
    defectCategory: undefined,
    inspectedAt: undefined
  },
  {
    id: 'qc-2',
    jobNo: 'JC/0002/26-27',
    orderPo: 'PO-2026-002',
    partCode: '00000002',
    partDescription: 'HARDENED BUSH 45X60X80',
    qty: 150,
    jobStatus: 'IN_INSPECTION',
    qcStatus: 'PASS',
    inspectorNotes: 'All dimensional limits within +/- 0.01mm tolerance band.',
    defectCategory: 'None',
    inspectedAt: '2026-08-14T09:45:00Z'
  }
];

const SEED_PDI_QUEUE = [
  {
    id: 'pdi-1',
    jobNo: 'JC/0002/26-27',
    orderPo: 'PO-2026-002',
    partCode: '00000002',
    partDescription: 'HARDENED BUSH 45X60X80',
    qty: 150,
    pdiStatus: 'PASS',
    certificateNo: 'PDI-2026-8812',
    reportDate: '2026-08-14'
  },
  {
    id: 'pdi-2',
    jobNo: 'JC/0001/26-27',
    orderPo: 'PO-2026-001',
    partCode: '00000001',
    partDescription: 'MAIN SPINDLE HOUSING 120MM',
    qty: 60,
    pdiStatus: 'PENDING',
    certificateNo: undefined,
    reportDate: undefined
  }
];

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
    return created;
  }

  async reviewQCInspection(id: string, reviewData: z.infer<typeof ReviewQCSchema>) {
    const { qcStatus, inspectorNotes, defectCategory } = ReviewQCSchema.parse(reviewData);
    const inspectedAt = new Date().toISOString();

    try {
      await this.db.from('qc_inspections').update({
        qc_status: qcStatus,
        inspector_notes: inspectorNotes,
        defect_category: defectCategory,
        inspected_at: inspectedAt
      }).eq('id', id);

      if (qcStatus === 'PASS') {
        const target = await this.getQCById(id);
        if (target) {
          const pdiId = `pdi-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
          await this.db.from('pdi_inspections').insert({
            id: pdiId,
            job_no: target.jobNo,
            order_po: target.orderPo,
            part_code: target.partCode,
            part_description: target.partDescription,
            qty: target.qty,
            pdi_status: 'PENDING',
            created_at: new Date().toISOString()
          });

          SEED_PDI_QUEUE.unshift({
            id: pdiId,
            jobNo: target.jobNo,
            orderPo: target.orderPo,
            partCode: target.partCode,
            partDescription: target.partDescription,
            qty: target.qty,
            pdiStatus: 'PENDING',
            certificateNo: undefined,
            reportDate: undefined
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

      if (qcStatus === 'PASS') {
        const pdiId = `pdi-${Date.now()}`;
        SEED_PDI_QUEUE.unshift({
          id: pdiId,
          jobNo: local.jobNo,
          orderPo: local.orderPo,
          partCode: local.partCode,
          partDescription: local.partDescription,
          qty: local.qty,
          pdiStatus: 'PENDING',
          certificateNo: undefined,
          reportDate: undefined
        });
      }
    }

    return { id, qcStatus, inspectorNotes, defectCategory, inspectedAt };
  }

  async getPDIQueue() {
    try {
      const { data, error } = await this.db
        .from('pdi_inspections')
        .select('*')
        .order('created_at', { ascending: false });

      if (!error && data && data.length > 0) {
        return data.map(p => ({
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
    return SEED_PDI_QUEUE;
  }

  async passPDIInspection(id: string) {
    const certNo = `PDI-2026-${Math.floor(1000 + Math.random() * 9000)}`;
    const reportDate = new Date().toISOString().split('T')[0];

    try {
      await this.db.from('pdi_inspections').update({
        pdi_status: 'PASS',
        certificate_no: certNo,
        report_date: reportDate
      }).eq('id', id);

      const { data: pdi } = await this.db.from('pdi_inspections').select('*').eq('id', id).single();
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

    try {
      const partDesc = local?.partDescription || 'Manufactured Item';
      const orderPo = local?.orderPo || 'PO';
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
