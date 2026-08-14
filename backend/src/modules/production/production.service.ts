import { getDbClient } from '../../config/database';
import { z } from 'zod';
import { JobCardSchema, UpdateJobStatusSchema, ProductionLogSchema } from './production.schema';
import { inventoryService } from '../inventory/inventory.service';

const SEED_JOB_CARDS = [
  {
    id: 'jc-1',
    jobNo: 'JC/0001/26-27',
    orderPo: 'PO-2026-001',
    partCode: '00000001',
    partDescription: 'MAIN SPINDLE HOUSING 120MM',
    orderStatus: 'IN_PRODUCTION',
    qty: 120,
    machine: 'VMC-01 (Vertical Milling)',
    targetDate: '2026-08-18',
    status: 'IN_PRODUCTION'
  },
  {
    id: 'jc-2',
    jobNo: 'JC/0002/26-27',
    orderPo: 'PO-2026-002',
    partCode: '00000002',
    partDescription: 'HARDENED BUSH 45X60X80',
    orderStatus: 'IN_PRODUCTION',
    qty: 350,
    machine: 'CNC-L-02 (Turning Centre)',
    targetDate: '2026-08-20',
    status: 'IN_PRODUCTION'
  },
  {
    id: 'jc-3',
    jobNo: 'JC/0003/26-27',
    orderPo: 'PO-2026-003',
    partCode: '00000003',
    partDescription: 'TOWER PIVOTING SECTION',
    orderStatus: 'IN_PRODUCTION',
    qty: 80,
    machine: 'HMC-01 (Horizontal Milling)',
    targetDate: '2026-08-22',
    status: 'SCHEDULED'
  }
];

const SEED_PRODUCTION_LOGS = [
  {
    id: 'pl-1',
    itemCode: '00000001',
    description: 'MAIN SPINDLE HOUSING 120MM',
    jobNo: 'JC/0001/26-27',
    stepNo: 1,
    operationName: 'VMC Rough Milling & Facing',
    qtyDone: 60,
    loggedTimestamp: '10:30 AM'
  },
  {
    id: 'pl-2',
    itemCode: '00000002',
    description: 'HARDENED BUSH 45X60X80',
    jobNo: 'JC/0002/26-27',
    stepNo: 1,
    operationName: 'CNC OD Turning & Grooving',
    qtyDone: 150,
    loggedTimestamp: '02:15 PM'
  }
];

export class ProductionService {
  private db = getDbClient();

  async getJobCards() {
    try {
      const { data, error } = await this.db
        .from('job_cards')
        .select('*')
        .order('created_at', { ascending: false });

      if (!error && data && data.length > 0) {
        return data.map(j => ({
          id: j.id,
          jobNo: j.job_no,
          orderPo: j.order_po,
          partCode: j.part_code,
          partDescription: j.part_description,
          orderStatus: j.order_status,
          qty: Number(j.qty || 0),
          machine: j.machine,
          targetDate: j.target_date,
          status: j.status
        }));
      }
    } catch (err) {
      console.warn('Database getJobCards fallback:', err);
    }
    return SEED_JOB_CARDS;
  }

  async getJobCardByNo(jobNo: string) {
    try {
      const { data, error } = await this.db
        .from('job_cards')
        .select('*')
        .or(`id.eq.${jobNo},job_no.eq.${jobNo}`)
        .maybeSingle();

      if (!error && data) {
        return {
          id: data.id,
          jobNo: data.job_no,
          orderPo: data.order_po,
          partCode: data.part_code,
          partDescription: data.part_description,
          orderStatus: data.order_status,
          qty: Number(data.qty || 0),
          machine: data.machine,
          targetDate: data.target_date,
          status: data.status
        };
      }
    } catch (err) {
      console.warn('Database getJobCardByNo fallback:', err);
    }
    return SEED_JOB_CARDS.find(j => j.id === jobNo || j.jobNo === jobNo) || null;
  }

  async createJobCard(data: z.infer<typeof JobCardSchema>) {
    const validated = JobCardSchema.parse(data);
    const jcId = validated.id || `jc-${Date.now()}`;

    // If material reservation is requested, invoke inventory service
    if (validated.reserveStock) {
      try {
        await inventoryService.reserveStock(validated.partCode, validated.qty);
      } catch (stockErr) {
        console.warn('Material reservation warning:', stockErr);
      }
    }

    try {
      const { error } = await this.db.from('job_cards').insert({
        id: jcId,
        job_no: validated.jobNo,
        order_po: validated.orderPo,
        part_code: validated.partCode,
        part_description: validated.partDescription,
        order_status: validated.orderStatus,
        qty: validated.qty,
        machine: validated.machine,
        target_date: validated.targetDate,
        status: validated.status,
        created_at: new Date().toISOString()
      });

      if (error) throw error;
    } catch (err) {
      console.warn('Database createJobCard fallback:', err);
    }

    const created = { id: jcId, ...validated };
    SEED_JOB_CARDS.unshift(created as any);
    return created;
  }

  async updateJobStatus(jobNo: string, data: z.infer<typeof UpdateJobStatusSchema>) {
    const { status } = UpdateJobStatusSchema.parse(data);

    try {
      await this.db
        .from('job_cards')
        .update({ status, updated_at: new Date().toISOString() })
        .or(`id.eq.${jobNo},job_no.eq.${jobNo}`);
    } catch (err) {
      console.warn('Database updateJobStatus fallback:', err);
    }

    const local = SEED_JOB_CARDS.find(j => j.id === jobNo || j.jobNo === jobNo);
    if (local) local.status = status as any;

    return { jobNo, status };
  }

  async getProductionLogs() {
    try {
      const { data, error } = await this.db
        .from('production_logs')
        .select('*')
        .order('created_at', { ascending: false });

      if (!error && data && data.length > 0) {
        return data.map(pl => ({
          id: pl.id,
          itemCode: pl.item_code,
          description: pl.description,
          jobNo: pl.job_no,
          stepNo: Number(pl.step_no || 1),
          operationName: pl.operation_name,
          qtyDone: Number(pl.qty_done || 0),
          loggedTimestamp: pl.logged_timestamp
        }));
      }
    } catch (err) {
      console.warn('Database getProductionLogs fallback:', err);
    }
    return SEED_PRODUCTION_LOGS;
  }

  async logProductionAndTriggerQC(data: z.infer<typeof ProductionLogSchema>) {
    const validated = ProductionLogSchema.parse(data);
    const logId = validated.id || `prodlog-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const qcId = `qc-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const timestamp = validated.loggedTimestamp || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    // Look up job card to obtain parent Order PO
    const job = await this.getJobCardByNo(validated.jobNo);
    const orderPo = job?.orderPo || 'PO-2026-UNKNOWN';

    try {
      await this.db.from('production_logs').insert({
        id: logId,
        item_code: validated.itemCode,
        description: validated.description,
        job_no: validated.jobNo,
        step_no: validated.stepNo,
        operation_name: validated.operationName,
        qty_done: validated.qtyDone,
        logged_timestamp: timestamp,
        created_at: new Date().toISOString()
      });

      if (validated.autoTriggerQC) {
        await this.db.from('qc_inspections').insert({
          id: qcId,
          job_no: validated.jobNo,
          order_po: orderPo,
          part_code: validated.itemCode,
          part_description: validated.description,
          qty: validated.qtyDone,
          job_status: 'IN_INSPECTION',
          qc_status: 'PENDING',
          created_at: new Date().toISOString()
        });
      }
    } catch (err) {
      console.warn('Database logProduction fallback:', err);
    }

    const createdLog = {
      id: logId,
      itemCode: validated.itemCode,
      description: validated.description,
      jobNo: validated.jobNo,
      stepNo: validated.stepNo,
      operationName: validated.operationName,
      qtyDone: validated.qtyDone,
      loggedTimestamp: timestamp
    };

    SEED_PRODUCTION_LOGS.unshift(createdLog);
    return { log: createdLog, qcTriggered: validated.autoTriggerQC, qcId };
  }
}

export const productionService = new ProductionService();
