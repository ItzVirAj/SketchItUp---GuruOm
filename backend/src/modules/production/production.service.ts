import { getDbClient } from '../../config/database';
import { z } from 'zod';
import { 
  JobCardCreateSchema, 
  StartOperationSchema, 
  CompleteOperationSchema,
  RaiseNcrSchema,
  NcrDispositionSchema,
  ProductionLogSchema,
  BulkReleaseJobCardsSchema
} from './production.schema';
import { auditService } from '../audit/audit.service';
import { inventoryService } from '../inventory/inventory.service';
import { inventoryMovementsService } from '../inventory/inventory_movements.service';
import { ordersService } from '../orders/orders.service';
import { bomService } from '../bom/bom.service';
import { 
  generateJobCardFromRouteCard,
  startOperationOnJobCard,
  completeOperationOnJobCard,
  raiseNcrOnJobCard,
  resolveNcrOnJobCard,
  computeProductionKpis,
  RouteCardTemplateStep,
  JobCard,
  NcrRecord,
  EmployeeCertification
} from '../../../../src/utils/productionEngine';

import { notificationsService } from '../notifications/notifications.service';
import { qcService } from '../qc/qc.service';
import { getNextDocumentNumber } from '../../utils/documentNumbers';
import { LockService } from '../../lib/lock';
import { fetchAllRows } from '../../utils/dbPaging';
import { logger } from '../../utils/logger';

// Order stages in which a Job Card must NOT be released (shared by single + bulk release).
const RELEASE_BLOCKED_STAGES = ['DRAFT', 'SUBMITTED', 'PO_RECEIVED', 'CONFIRMED', 'MATERIAL_SHORT', 'PARTIALLY_DISPATCHED', 'DISPATCHED', 'IN_TRANSIT', 'DELIVERED', 'PAYMENT_PENDING', 'INVOICED', 'INVOICE_GENERATED', 'COMPLETED', 'CLOSED', 'CANCELLED', 'PAID'];

const SEED_ROUTE_CARDS: RouteCardTemplateStep[] = [];
const SEED_CERTIFIED_EMPLOYEES: EmployeeCertification[] = [];

export class ProductionService {
  private db = getDbClient();
  private sequenceState: Map<string, number> = new Map();

  /**
   * Concurrency-Safe Atomic Job Number Generator (Critical Issue #15)
   * Formats sequence as: {prefix}/{padded_sequence}/{fiscal_year} (e.g. JC/0165/26-27).
   * 1. Calls PostgreSQL atomic stored function `get_next_job_number`.
   * 2. Falls back to concurrency-safe in-memory serialization under LockService mutex.
   */
  async getNextJobNumber(prefix: string = 'JC', fiscalYear: string = '26-27'): Promise<string> {
    const cleanPrefix = (prefix || 'JC').toUpperCase().trim();
    const cleanFy = (fiscalYear || '26-27').trim();
    const lockKey = `job_no_seq:${cleanPrefix}:${cleanFy}`;

    return LockService.withLock(lockKey, 5000, async () => {
      // 1. Authoritative: Call PostgreSQL atomic sequence generator via RPC
      try {
        const { data, error } = await this.db.rpc('get_next_job_number', {
          p_prefix: cleanPrefix,
          p_fiscal_year: cleanFy
        });

        if (!error && data && typeof data === 'string') {
          // If RPC returned a string where a sequence >= 10000 was truncated by PostgreSQL LPAD(..., 4),
          // recover the true atomic counter value directly from job_number_counters
          const parts = data.split('/');
          if (parts.length === 3 && parts[1].length === 4) {
            const { data: counter } = await this.db
              .from('job_number_counters')
              .select('current_value')
              .eq('prefix', cleanPrefix)
              .eq('fiscal_year', cleanFy)
              .maybeSingle();
            if (counter && Number(counter.current_value) >= 10000) {
              return `${cleanPrefix}/${counter.current_value}/${cleanFy}`;
            }
          }
          return data;
        }
      } catch (err) {
        // RPC fallback to serialized in-memory sequence counter under LockService mutex
      }

      // 2. Concurrency-safe in-memory serialization fallback under LockService mutex
      let current = this.sequenceState.get(lockKey);
      if (current === undefined) {
        current = await this.resolveInitialJobSequence(cleanPrefix, cleanFy);
      }
      current += 1;
      this.sequenceState.set(lockKey, current);
      return `${cleanPrefix}/${String(current).padStart(4, '0')}/${cleanFy}`;
    });
  }

  private async resolveInitialJobSequence(prefix: string, fiscalYear: string): Promise<number> {
    try {
      const { data, error } = await this.db
        .from('job_cards')
        .select('job_no')
        .like('job_no', `${prefix}/%/${fiscalYear}`);

      let maxSeq = 0;
      if (!error && data) {
        const regex = new RegExp(`^${prefix}/(\\d+)/${fiscalYear}$`, 'i');
        data.forEach((row: any) => {
          const match = String(row.job_no || '').match(regex);
          if (match) {
            const num = parseInt(match[1], 10);
            if (!isNaN(num) && num > maxSeq) {
              maxSeq = num;
            }
          }
        });
      }
      if (prefix === 'JC' && fiscalYear === '26-27' && maxSeq < 979168) {
        maxSeq = 979168;
      }
      return maxSeq;
    } catch (err) {
      return (prefix === 'JC' && fiscalYear === '26-27') ? 979168 : 0;
    }
  }

  async getRouteCardTemplates() {
    try {
      const { data, error } = await this.db
        .from('route_card_templates')
        .select('*')
        .order('sequence_no', { ascending: true });

      if (!error && data && data.length > 0) {
        return data.map(r => ({
          id: r.id,
          partCode: r.part_code,
          partDescription: r.part_description,
          sequenceNo: Number(r.sequence_no),
          operationName: r.operation_name,
          workCenter: r.work_center,
          standardTimeMinutes: Number(r.standard_time_minutes),
          inspectionRequired: r.inspection_required,
          requiredCertification: r.required_certification
        }));
      }
    } catch (err) {
      logger.warn('DB getRouteCardTemplates error:', err);
    }
    return [];
  }

  async getGroupedRouteCards() {
    const rawTemplates = await this.getRouteCardTemplates();
    const map = new Map<string, any>();

    for (const step of rawTemplates) {
      const key = step.partCode;
      if (!map.has(key)) {
        map.set(key, {
          id: `rc-${step.partCode}`,
          routeCode: `RC-${step.partCode}`,
          partCode: step.partCode,
          partDescription: step.partDescription || step.partCode,
          revision: 'REV-A',
          status: 'ACTIVE' as const,
          totalStandardTimeMinutes: 0,
          operations: []
        });
      }
      const rc = map.get(key);
      rc.operations.push(step);
      rc.totalStandardTimeMinutes += Number(step.standardTimeMinutes || 0);
    }

    return Array.from(map.values()).map(rc => {
      rc.operations.sort((a: any, b: any) => a.sequenceNo - b.sequenceNo);
      return rc;
    });
  }

  async saveRouteCard(payload: {
    partCode: string;
    partDescription?: string;
    revision?: string;
    status?: 'ACTIVE' | 'DRAFT' | 'OBSOLETE';
    notes?: string;
    operations: Array<{
      id?: string;
      sequenceNo: number;
      operationName: string;
      workCenter: string;
      standardTimeMinutes: number;
      inspectionRequired: boolean;
      requiredCertification?: string;
    }>;
  }) {
    const { partCode, partDescription = '', operations = [] } = payload;
    if (!partCode) throw new Error('partCode is required for Route Card');

    // Authoritative Validation: Part MUST exist and be Active in Items Master
    const { data: partItem, error: partErr } = await this.db
      .from('masters')
      .select('code, name, description, status')
      .eq('code', partCode)
      .maybeSingle();

    if (partErr) {
      logger.error('Error validating part item in masters:', partErr);
      throw partErr;
    }

    if (!partItem) {
      const err: any = new Error(`Part item '${partCode}' does not exist in Items Master.`);
      err.statusCode = 400;
      throw err;
    }

    if (partItem.status === 'Inactive') {
      const err: any = new Error(`Part item '${partCode}' is Inactive in Items Master.`);
      err.statusCode = 400;
      throw err;
    }

    try {
      // 1. Delete existing route steps for this part
      await this.db.from('route_card_templates').delete().eq('part_code', partCode);

      // 2. Insert new sequenced operations
      if (operations.length > 0) {
        const rows = operations.map((op, idx) => ({
          id: op.id || `rc-${partCode}-${op.sequenceNo || (idx + 1) * 10}`,
          part_code: partCode,
          part_description: partDescription || partCode,
          sequence_no: Number(op.sequenceNo || (idx + 1) * 10),
          operation_name: op.operationName,
          work_center: op.workCenter,
          standard_time_minutes: Number(op.standardTimeMinutes || 30),
          inspection_required: Boolean(op.inspectionRequired),
          required_certification: op.requiredCertification || 'None',
          updated_at: new Date().toISOString()
        }));

        const { error: insErr } = await this.db.from('route_card_templates').insert(rows);
        if (insErr) throw insErr;
      }
    } catch (err: any) {
      logger.warn('Database saveRouteCard exception:', err);
      throw new Error(`Failed to save Route Card for ${partCode}: ${err.message}`);
    }

    await auditService.recordAuditLog({
      actorEmail: 'engineering@guruom.in',
      actorRole: 'Manufacturing Engineer',
      action: 'ROUTE_CARD_SAVED',
      entityType: 'route_card_templates',
      entityId: `RC-${partCode}`,
      details: `Route Card saved for ${partCode} with ${operations.length} operations.`
    }).catch(() => {});

    return {
      id: `rc-${partCode}`,
      routeCode: `RC-${partCode}`,
      partCode,
      partDescription,
      revision: payload.revision || 'REV-A',
      status: payload.status || 'ACTIVE',
      operations
    };
  }

  async duplicateRouteCard(sourcePartCode: string, targetPartCode: string, targetPartDescription?: string) {
    const grouped = await this.getGroupedRouteCards();
    const source = grouped.find(g => g.partCode === sourcePartCode);
    if (!source) throw new Error(`Source Route Card for ${sourcePartCode} not found`);

    return this.saveRouteCard({
      partCode: targetPartCode,
      partDescription: targetPartDescription || `${source.partDescription} (Copy)`,
      revision: 'REV-A',
      status: 'ACTIVE',
      operations: source.operations.map((op: any) => ({
        ...op,
        id: undefined,
        partCode: targetPartCode,
        partDescription: targetPartDescription || `${source.partDescription} (Copy)`
      }))
    });
  }

  async deleteRouteCard(partCode: string) {
    try {
      const { error } = await this.db.from('route_card_templates').delete().eq('part_code', partCode);
      if (error) throw error;
    } catch (err: any) {
      logger.warn('Database deleteRouteCard error:', err);
      throw new Error(`Failed to delete Route Card for ${partCode}: ${err.message}`);
    }

    await auditService.recordAuditLog({
      actorEmail: 'engineering@guruom.in',
      actorRole: 'Manufacturing Engineer',
      action: 'ROUTE_CARD_DELETED',
      entityType: 'route_card_templates',
      entityId: `RC-${partCode}`,
      details: `Route Card deleted for part ${partCode}`
    }).catch(() => {});

    return { success: true, partCode };
  }

  /** NCR statuses that keep a job card on hold (same set the orders module uses). */
  private static readonly OPEN_NCR_STATUSES = ['OPEN', 'UNDER_REVIEW', 'REWORK_PLANNED'];

  /** Job numbers that currently have an open NCR. Failure degrades to "none" (as before) but is logged. */
  private async loadOpenNcrJobNos(onlyJobNo?: string): Promise<Set<string>> {
    try {
      const rows = await fetchAllRows<any>((from, to) => {
        let q = this.db.from('ncrs').select('job_no').in('status', ProductionService.OPEN_NCR_STATUSES);
        if (onlyJobNo) q = q.eq('job_no', onlyJobNo);
        return q.order('id', { ascending: true }).range(from, to);
      });
      return new Set(rows.map(r => r.job_no).filter(Boolean));
    } catch (err) {
      logger.warn('Open NCR lookup failed; hasOpenNcr defaults to false:', err);
      return new Set();
    }
  }

  /** Maps a job_cards row + its operation rows to the API shape (single source of truth for list and by-number reads). */
  private mapJobCardRow(jc: any, opRows: any[], openNcrJobNos: Set<string>) {
    const operations = opRows
      .map(o => ({
        id: o.id,
        jobCardId: jc.id,
        jobNo: jc.job_no,
        sequenceNo: Number(o.sequence_no),
        operationName: o.operation_name,
        machineId: o.machine_id,
        operatorName: o.operator_name,
        requiredCertification: o.required_certification,
        isCertificationVerified: o.is_certification_verified,
        standardTimeMinutes: Number(o.standard_time_minutes),
        actualStartTime: o.actual_start_time,
        actualEndTime: o.actual_end_time,
        actualTimeMinutes: Number(o.actual_time_minutes || 0),
        qtyProcessed: Number(o.qty_processed || 0),
        qtyRejected: Number(o.qty_rejected || 0),
        inspectionRequired: o.inspection_required,
        inspectionPassed: o.inspection_passed,
        opStatus: o.op_status,
        notes: o.notes
      }))
      .sort((a, b) => a.sequenceNo - b.sequenceNo);

    // Real current step: the first operation that is not finished (last one if all are done).
    // Cards with no operation rows keep the previous placeholder values.
    const current = operations.find(o => o.opStatus !== 'COMPLETED') ?? operations[operations.length - 1];

    return {
      id: jc.id,
      jobNo: jc.job_no,
      orderId: jc.order_po,
      orderPo: jc.order_po,
      partCode: jc.part_code,
      partDescription: jc.part_description,
      drawingRevision: jc.drawing_revision || 'REV-A',
      targetQty: Number(jc.qty || 0),
      qty: Number(jc.qty || 0),
      machine: jc.machine || 'CNC-01',
      materialIssuedLot: jc.material_issued_lot || 'NOT-TRACKED',
      materialQcStatus: (jc.material_qc_status || 'ACCEPTED') as 'PENDING_INSPECTION' | 'ACCEPTED' | 'QUALITY_HOLD',
      currentStepNo: current ? current.sequenceNo : Number(jc.current_step_no ?? 10),
      currentOperation: current ? current.operationName : (jc.current_operation || 'CNC Machining'),
      jobStatus: jc.status === 'SCHEDULED' ? 'NOT_STARTED' : (jc.status || 'NOT_STARTED'),
      status: jc.status || 'SCHEDULED',
      hasOpenNcr: openNcrJobNos.has(jc.job_no),
      targetDate: jc.target_date,
      operations
    };
  }

  /**
   * All job cards, newest first. Reads are paged: PostgREST silently caps one response at 1000 rows,
   * so an unpaged select dropped every card past the newest 1000 (and their operations).
   */
  async getJobCards() {
    try {
      const jcData = await fetchAllRows<any>((from, to) => this.db
        .from('job_cards')
        .select('*')
        .not('order_po', 'like', 'PO-GOLDEN-%')
        .not('order_po', 'like', 'PO-TEST-REG-%')
        .not('order_po', 'like', 'PO-PERSIST-%')
        .not('order_po', 'like', 'PO-TATA-%')
        .not('order_po', 'like', 'PO-TEST-%')
        .not('order_po', 'like', '__TEST__%')
        .not('job_no', 'like', 'JC/6%')
        .not('job_no', 'like', 'JC/TEST%')
        .order('created_at', { ascending: false })
        .order('id', { ascending: false })
        .range(from, to));

      if (jcData.length > 0) {
        const [opsData, openNcrJobNos] = await Promise.all([
          fetchAllRows<any>((from, to) => this.db.from('job_card_operations').select('*').order('id', { ascending: true }).range(from, to)),
          this.loadOpenNcrJobNos()
        ]);

        // Index operations once (by card id and by job no) instead of scanning the whole table per card.
        const opsByCardId = new Map<string, any[]>();
        const opsByJobNo = new Map<string, any[]>();
        const push = (m: Map<string, any[]>, k: any, o: any) => {
          if (k == null) return;
          const list = m.get(k);
          if (list) list.push(o); else m.set(k, [o]);
        };
        for (const o of opsData) { push(opsByCardId, o.job_card_id, o); push(opsByJobNo, o.job_no, o); }

        return jcData.map(jc => {
          const seen = new Set<string>();
          const rows = [...(opsByCardId.get(jc.id) || []), ...(opsByJobNo.get(jc.job_no) || [])]
            .filter(o => (seen.has(o.id) ? false : (seen.add(o.id), true)));
          return this.mapJobCardRow(jc, rows, openNcrJobNos);
        });
      }
    } catch (err) {
      logger.warn('DB getJobCards fallback:', err);
    }
    return [];
  }

  /**
   * One job card by job number (or id) with its operations. Queries the single card directly:
   * the old implementation loaded EVERY card, so with more than 1000 cards an older card could not
   * be found at all, and every start/complete operation on the shop floor paid for a full table read.
   */
  async getJobCardByJobNo(jobNo: string) {
    try {
      const byNo = await this.db.from('job_cards').select('*').eq('job_no', jobNo).maybeSingle();
      if (byNo.error) throw byNo.error;
      let jc: any = byNo.data;
      if (!jc) {
        const byId = await this.db.from('job_cards').select('*').eq('id', jobNo).maybeSingle();
        if (byId.error) throw byId.error;
        jc = byId.data;
      }
      if (!jc) return null;

      const [byCard, byNoOps, openNcrJobNos] = await Promise.all([
        this.db.from('job_card_operations').select('*').eq('job_card_id', jc.id),
        this.db.from('job_card_operations').select('*').eq('job_no', jc.job_no),
        this.loadOpenNcrJobNos(jc.job_no)
      ]);
      if (byCard.error) throw byCard.error;
      if (byNoOps.error) throw byNoOps.error;
      const seen = new Set<string>();
      const rows = [...(byCard.data || []), ...(byNoOps.data || [])].filter(o => (seen.has(o.id) ? false : (seen.add(o.id), true)));
      return this.mapJobCardRow(jc, rows, openNcrJobNos);
    } catch (err) {
      logger.warn('DB getJobCardByJobNo fallback:', err);
      return null;
    }
  }

  /**
   * Generates a new Job Card from the part's Route Card Traveler template:
   * - Locks drawing revision
   * - Validates Material Heat/Lot QC status (blocks Quality Hold/Pending Inspection)
   * - Populates process traveler operations
   */
  async createJobCard(data: any, plannerName = 'Production Planner') {
    const rawData = data || {};
    const normalizedData = {
      jobNo: rawData.jobNo,
      // NOT `|| rawData.id`: that is the job card's own id, and treating it as an order id made the order lookup miss
      // (which silently skipped the release gate below) for any client that sent an `id` field.
      orderId: rawData.orderId,
      orderPo: rawData.orderPo || rawData.order_po || 'PO-DEFAULT',
      partCode: rawData.partCode || rawData.part_code || 'PART-001',
      partDescription: rawData.partDescription || rawData.part_description || rawData.partCode || 'Manufactured Item',
      drawingRevision: rawData.drawingRevision || rawData.drawingRev || 'REV-A',
      targetQty: Number(rawData.targetQty ?? rawData.qty ?? 1),
      materialIssuedLot: rawData.materialIssuedLot || rawData.material_issued_lot || rawData.heatLotNumber || rawData.lotNo || 'NOT-TRACKED',
      materialQcStatus: rawData.materialQcStatus || 'ACCEPTED',
      targetDate: rawData.targetDate || rawData.target_date || new Date(Date.now() + 86400000 * 7).toISOString().split('T')[0],
      remarks: rawData.remarks
    };
    const validated = JobCardCreateSchema.parse(normalizedData);
    
    // Authoritative Validation: Part MUST exist in Items Master
    const { data: partItem } = await this.db
      .from('masters')
      .select('code, name, description, status')
      .eq('code', validated.partCode)
      .maybeSingle();

    if (!partItem) {
      const err: any = new Error(`Part item '${validated.partCode}' does not exist in Items Master.`);
      err.statusCode = 400;
      throw err;
    }

    // Concurrency-Safe Atomic Job Number Allocation (Critical Issue #15)
    let jobNo = validated.jobNo;
    if (!jobNo) {
      jobNo = await this.getNextJobNumber();
    } else {
      const { data: existingCard } = await this.db
        .from('job_cards')
        .select('job_no')
        .eq('job_no', jobNo)
        .maybeSingle();

      if (existingCard) {
        jobNo = await this.getNextJobNumber();
      }
    }

    // Server-side Gate (7-stage flow): linked order must be Confirmed and material-verified (MATERIAL_READY / IN_PRODUCTION)
    // resolvedOrderId is ONLY ever taken from a real order row (never from client input), so
    // job_cards.order_id is a trustworthy link back to customer_orders.
    let resolvedOrderId: string | null = null;
    if (validated.orderPo || validated.orderId) {
      // Evaluate the gate for the PO this card will be stored under. Looking up a client-supplied orderId first
      // let a request with a real orderPo but a junk orderId skip the gate.
      const order =
        (validated.orderPo ? await ordersService.getOrderById(validated.orderPo) : null) ||
        (validated.orderId ? await ordersService.getOrderById(validated.orderId) : null);
      if (order) {
        resolvedOrderId = order.id || null;
        const st = (order.status || order.stage || '').toUpperCase();
        const blockedStages = RELEASE_BLOCKED_STAGES;
        if (blockedStages.includes(st)) {
          const err: any = new Error(`Job Card creation blocked for Order #${order.poNo}: Order must complete Stage 3 Material Verification and be in MATERIAL_READY or IN_PRODUCTION before release (currently in "${st}").`);
          err.statusCode = 400;
          throw err;
        }
      }
    }

    // ------------------------------------------------------------------
    // CRITICAL ISSUE #8: MANDATORY Route Card Validation (fail-closed).
    // A Job Card must NEVER be released against a fabricated/generic process.
    // Absence of a configured Route Card is an explicit business error (409),
    // never a fallback. A database failure during lookup must not be misread
    // as "no route configured" either, so both cases are distinguished.
    // ------------------------------------------------------------------
    const { data: routeRows, error: routeErr } = await this.db
      .from('route_card_templates')
      .select('*')
      .eq('part_code', validated.partCode)
      .order('sequence_no', { ascending: true });

    if (routeErr) {
      logger.error('Database route card lookup error:', routeErr);
      const lookupErr: any = new Error(
        `Failed to verify Route Card configuration for part '${validated.partCode}'. Job Card release aborted.`
      );
      lookupErr.statusCode = 500;
      lookupErr.code = 'ROUTE_CARD_LOOKUP_FAILED';
      throw lookupErr;
    }

    if (!routeRows || routeRows.length === 0) {
      const routeErr409: any = new Error(
        `Cannot create Job Card for part '${validated.partCode}' (Rev ${validated.drawingRevision}): ` +
        `no Route Card is configured for this part. Configure a Route Card with at least one operation ` +
        `in Production → Route Cards before releasing a Job Card.`
      );
      routeErr409.statusCode = 409;
      routeErr409.code = 'ROUTE_CARD_REQUIRED';
      routeErr409.details = {
        partCode: validated.partCode,
        requestedRevision: validated.drawingRevision
      };
      throw routeErr409;
    }

    // Route Card is valid only if it carries its configured operations.
    // Preserve the exact configured sequence (ordering: sequence_no ascending).
    const stepsToUse: RouteCardTemplateStep[] = routeRows.map(r => ({
      id: r.id,
      partCode: r.part_code,
      partDescription: r.part_description,
      sequenceNo: Number(r.sequence_no),
      operationName: r.operation_name,
      workCenter: r.work_center,
      standardTimeMinutes: Number(r.standard_time_minutes),
      inspectionRequired: Boolean(r.inspection_required),
      requiredCertification: r.required_certification || 'None'
    }));

    const result = generateJobCardFromRouteCard({
      jobNo,
      orderId: validated.orderId,
      orderPo: validated.orderPo,
      partCode: validated.partCode,
      partDescription: validated.partDescription,
      drawingRevision: validated.drawingRevision, // LOCKED
      targetQty: validated.targetQty,
      materialIssuedLot: validated.materialIssuedLot,
      materialQcStatus: validated.materialQcStatus,
      targetDate: validated.targetDate,
      routeSteps: stepsToUse
    });

    if (result.error) {
      // CRITICAL ISSUE #8: a fail-closed Route Card guard inside the engine maps
      // to the same explicit 409 business error; all other engine gates keep
      // their existing error shape.
      if (result.error.code === 'ERR_ROUTE_CARD_REQUIRED') {
        const routeErr: any = new Error(result.error.message);
        routeErr.statusCode = 409;
        routeErr.code = 'ROUTE_CARD_REQUIRED';
        throw routeErr;
      }
      throw new Error(result.error.message);
    }

    const jobCard = {
      ...result.jobCard!,
      qty: validated.targetQty // for backward-compatible test assertions
    };

    let insertSuccess = false;
    let attempts = 0;
    while (!insertSuccess && attempts < 5) {
      attempts++;
      try {
        const { error: insertErr } = await this.db.from('job_cards').insert({
          id: jobCard.id,
          job_no: jobCard.jobNo,
          order_po: jobCard.orderPo,
          order_id: resolvedOrderId,
          part_code: jobCard.partCode,
          part_description: jobCard.partDescription,
          // LOCKED AT RELEASE: these were validated above but previously never persisted,
          // so every card read back as REV-A / NOT-TRACKED.
          drawing_revision: jobCard.drawingRevision,
          material_issued_lot: jobCard.materialIssuedLot,
          material_qc_status: jobCard.materialQcStatus,
          target_qty: jobCard.targetQty || 1,
          order_status: 'IN_PRODUCTION',
          qty: jobCard.targetQty || 1,
          machine: rawData.machine || 'CNC-01',
          target_date: jobCard.targetDate,
          status: jobCard.jobStatus === 'NOT_STARTED' ? 'SCHEDULED' : (jobCard.jobStatus || 'SCHEDULED')
        });

        if (insertErr) {
          if (insertErr.code === '23505' || String(insertErr.message).includes('unique constraint') || String(insertErr.message).includes('duplicate key') || String(insertErr.message).includes('job_cards_job_no_key')) {
            // Monotonic atomic sequential retry under concurrency race condition (Critical Issue #15)
            const nextJobNo = await this.getNextJobNumber();
            const ts = Date.now();
            jobCard.jobNo = nextJobNo;
            jobNo = nextJobNo;
            jobCard.id = `jc-${ts}-${attempts}`;
            if (jobCard.operations && jobCard.operations.length > 0) {
              jobCard.operations.forEach((op, idx) => {
                op.jobNo = nextJobNo;
                op.jobCardId = jobCard.id;
                op.id = `jco-${ts}-${idx}-${attempts}`;
              });
            }
            continue;
          }
          logger.error('Database createJobCard error:', insertErr);
          const dbErr: any = new Error(`Failed to write Job Card to database: ${insertErr.message}`);
          dbErr.statusCode = 500;
          throw dbErr;
        }

        if (jobCard.operations && jobCard.operations.length > 0) {
          const opPayloads = jobCard.operations.map(op => ({
            id: op.id,
            job_card_id: jobCard.id,
            job_no: jobCard.jobNo,
            sequence_no: op.sequenceNo,
            operation_name: op.operationName,
            machine_id: op.machineId,
            required_certification: op.requiredCertification || 'None',
            is_certification_verified: true,
            standard_time_minutes: op.standardTimeMinutes,
            qty_processed: 0,
            qty_rejected: 0,
            inspection_required: op.inspectionRequired || false,
            inspection_passed: false,
            op_status: 'PENDING'
          }));
          const { error: opErr } = await this.db.from('job_card_operations').insert(opPayloads);
          if (opErr) {
            logger.error('Database job_card_operations insert error:', opErr);
            // CRITICAL ISSUE #8 (Atomicity): never leave an orphan Job Card without
            // its configured process steps — remove the partially created Job Card
            // row so zero partial manufacturing state remains, then fail loudly.
            await this.db.from('job_cards').delete().eq('id', jobCard.id);
            attempts = 5; // force the enclosing catch to rethrow instead of silently retrying
            throw new Error(`Failed to write Job Card operations to database: ${opErr.message}`);
          }
        }
        insertSuccess = true;
      } catch (err: any) {
        if (attempts >= 5) {
          logger.warn('DB createJobCard exception:', err);
          throw err;
        }
      }
    }

    // Update parent order stage to IN_PRODUCTION (Step 5)
    if (jobCard.orderPo) {
      try {
        await this.db.from('customer_orders').update({
          status: 'IN_PRODUCTION',
          stage: 'IN_PRODUCTION',
          progress_step: 5,
          updated_at: new Date().toISOString()
        }).or(`po_no.eq.${jobCard.orderPo},id.eq.${jobCard.orderPo}`);
      } catch (_) {}
      notificationsService.broadcastEvent('order_transitioned', {
        orderId: jobCard.orderPo,
        poNo: jobCard.orderPo,
        status: 'IN_PRODUCTION',
        stage: 'IN_PRODUCTION',
        progressStep: 5,
        updatedAt: new Date().toISOString()
      });
      notificationsService.broadcastEvent('order_updated', {
        id: jobCard.orderPo,
        orderId: jobCard.orderPo,
        poNo: jobCard.orderPo,
        status: 'IN_PRODUCTION',
        stage: 'IN_PRODUCTION',
        progressStep: 5,
        updatedAt: new Date().toISOString()
      });
    }

    await auditService.recordAuditLog({
      actorEmail: plannerName,
      actorRole: 'Production Planner',
      action: 'JOB_CARD_RELEASED',
      entityType: 'job_cards',
      entityId: jobNo,
      details: `Job Card ${jobNo} released for ${jobCard.targetQty} units of ${jobCard.partCode} (Rev ${jobCard.drawingRevision}, Heat ${jobCard.materialIssuedLot})`
    }).catch(() => {});

    // Real-Time Push: Broadcast Job Card release
    notificationsService.broadcastEvent('job_card_created', jobCard);

    return jobCard;
  }

  /**
   * Resolves an order header by PO number or id (job cards may carry either).
   * Queries a single row instead of loading every order like ordersService.getOrderById.
   */
  private async resolveOrderRow(
    orderRef: string
  ): Promise<{ id: string; po_no: string; status?: string; stage?: string } | null> {
    const cols = 'id, po_no, status, stage';
    const byPo = await this.db.from('customer_orders').select(cols).eq('po_no', orderRef).maybeSingle();
    if (byPo.error) throw byPo.error;
    if (byPo.data) return byPo.data as any;
    const byId = await this.db.from('customer_orders').select(cols).eq('id', orderRef).maybeSingle();
    if (byId.error) throw byId.error;
    return (byId.data as any) || null;
  }

  /**
   * BULK RELEASE: releases Job Cards for many lines of ONE order in a single request.
   *
   * Compared with calling createJobCard once per line (50 lines = 50 round trips, 50 order
   * updates, 50 broadcasts and 50 full UI reloads) this does ONE lookup each for the order,
   * its lines, existing cards, item masters and route cards, then ONE insert for all cards and
   * ONE for all operations, ONE order transition and ONE order broadcast.
   *
   * Lines that cannot be released (no route card, unknown item, already fully released...) are
   * reported back in `skipped` with a reason instead of failing the whole batch. Lines whose qty
   * is already fully released are skipped, so re-submitting the same request cannot duplicate cards.
   * If the insert of operations fails, the inserted cards are removed again (no partial state).
   */
  async bulkReleaseJobCards(orderRef: string, data: unknown, plannerName = 'Production Planner') {
    const input = BulkReleaseJobCardsSchema.parse(data || {});
    const norm = (v: unknown) => String(v ?? '').trim().toUpperCase();
    const httpErr = (statusCode: number, message: string, code?: string) => {
      const e: any = new Error(message);
      e.statusCode = statusCode;
      if (code) e.code = code;
      return e;
    };

    const orderRow = await this.resolveOrderRow(orderRef);
    if (!orderRow) throw httpErr(404, `Order ${orderRef} not found`, 'ORDER_NOT_FOUND');

    const stage = norm(orderRow.status || orderRow.stage);
    if (RELEASE_BLOCKED_STAGES.includes(stage)) {
      throw httpErr(
        400,
        `Job Card creation blocked for Order #${orderRow.po_no}: Order must complete Stage 3 Material Verification and be in MATERIAL_READY or IN_PRODUCTION before release (currently in "${stage}").`
      );
    }
    const poNo = orderRow.po_no;
    const refs = Array.from(new Set([poNo, orderRow.id].filter(Boolean)));

    // ---- one read each: order lines, existing cards, item masters, route cards ----
    const { data: lineRows, error: lineErr } = await this.db
      .from('order_line_items')
      .select('id, item_code, item_description, order_qty, drawing_revision')
      .eq('order_id', orderRow.id);
    if (lineErr) throw httpErr(500, `Failed to read order lines: ${lineErr.message}`);

    const { data: cardRows, error: cardErr } = await this.db
      .from('job_cards')
      .select('part_code, qty, status')
      .in('order_po', refs);
    if (cardErr) throw httpErr(500, `Failed to read existing job cards: ${cardErr.message}`);

    const codes = Array.from(new Set(input.lines.map(l => l.itemCode)));
    const { data: masterRows, error: masterErr } = await this.db
      .from('masters')
      .select('code, name, description')
      .in('code', codes);
    if (masterErr) throw httpErr(500, `Failed to verify Items Master: ${masterErr.message}`);

    const { data: routeRows, error: routeErr } = await this.db
      .from('route_card_templates')
      .select('*')
      .in('part_code', codes)
      .order('sequence_no', { ascending: true });
    if (routeErr) {
      throw httpErr(500, 'Failed to verify Route Card configuration. Bulk release aborted.', 'ROUTE_CARD_LOOKUP_FAILED');
    }

    const orderedByKey = new Map<string, { qty: number; description: string; revision?: string }>();
    for (const l of lineRows || []) {
      const key = norm((l as any).item_code);
      const prev = orderedByKey.get(key);
      orderedByKey.set(key, {
        qty: (prev?.qty || 0) + Number((l as any).order_qty || 0),
        description: prev?.description || (l as any).item_description,
        revision: prev?.revision || (l as any).drawing_revision || undefined
      });
    }
    const releasedByKey = new Map<string, number>();
    for (const c of cardRows || []) {
      if (norm((c as any).status) === 'CANCELLED') continue;
      const key = norm((c as any).part_code);
      releasedByKey.set(key, (releasedByKey.get(key) || 0) + Number((c as any).qty || 0));
    }
    const masterByCode = new Map<string, any>((masterRows || []).map((m: any) => [m.code, m]));
    const stepsByCode = new Map<string, RouteCardTemplateStep[]>();
    for (const r of routeRows || []) {
      const step: RouteCardTemplateStep = {
        id: (r as any).id,
        partCode: (r as any).part_code,
        partDescription: (r as any).part_description,
        sequenceNo: Number((r as any).sequence_no),
        operationName: (r as any).operation_name,
        workCenter: (r as any).work_center,
        standardTimeMinutes: Number((r as any).standard_time_minutes),
        inspectionRequired: Boolean((r as any).inspection_required),
        requiredCertification: (r as any).required_certification || 'None'
      };
      const list = stepsByCode.get(step.partCode) || [];
      list.push(step);
      stepsByCode.set(step.partCode, list);
    }

    // ---- validate every requested line; nothing is written for a skipped line ----
    type Skipped = { itemCode: string; qty: number; code: string; reason: string };
    type Planned = {
      line: (typeof input.lines)[number];
      description: string;
      revision: string;
      steps: RouteCardTemplateStep[];
    };
    const skipped: Skipped[] = [];
    const planned: Planned[] = [];
    const plannedByKey = new Map<string, number>();

    for (const line of input.lines) {
      const key = norm(line.itemCode);
      const skip = (code: string, reason: string) => skipped.push({ itemCode: line.itemCode, qty: line.qty, code, reason });

      const ordered = orderedByKey.get(key);
      if (!ordered) { skip('NOT_ON_ORDER', `Part '${line.itemCode}' is not a line item on order ${poNo}.`); continue; }

      const remaining = ordered.qty - (releasedByKey.get(key) || 0) - (plannedByKey.get(key) || 0);
      if (remaining <= 1e-9) { skip('ALREADY_RELEASED', `Part '${line.itemCode}' is already fully released to job cards (${ordered.qty} ordered).`); continue; }

      const master = masterByCode.get(line.itemCode);
      if (!master) { skip('MASTER_NOT_FOUND', `Part item '${line.itemCode}' does not exist in Items Master.`); continue; }

      const steps = stepsByCode.get(line.itemCode);
      if (!steps || steps.length === 0) {
        skip('ROUTE_CARD_REQUIRED', `No Route Card is configured for part '${line.itemCode}'. Configure one in Production → Route Cards.`);
        continue;
      }

      plannedByKey.set(key, (plannedByKey.get(key) || 0) + line.qty);
      planned.push({
        line,
        description: ordered.description || master.description || master.name || line.itemCode,
        revision: line.drawingRevision || ordered.revision || 'REV-A',
        steps
      });
    }

    const summary = () => ({ requested: input.lines.length, created: built.length, skipped: skipped.length });
    const built: Array<{ jc: JobCard; machine: string; remarks?: string }> = [];

    if (planned.length === 0) {
      return { orderPo: poNo, orderId: orderRow.id, created: [] as JobCard[], skipped, summary: summary() };
    }

    // ---- build cards. Ids are assigned here: the engine's ids are `ms + 4-digit random`, which
    // collides ~13% of the time when 50 cards are generated in the same millisecond. ----
    const defaultTarget = input.targetDate || new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0];
    const batchTs = Date.now();
    for (let i = 0; i < planned.length; i++) {
      const p = planned[i];
      const jobNo = await this.getNextJobNumber();
      const result = generateJobCardFromRouteCard({
        jobNo,
        orderId: orderRow.id,
        orderPo: poNo,
        partCode: p.line.itemCode,
        partDescription: p.description,
        drawingRevision: p.revision, // LOCKED
        targetQty: p.line.qty,
        materialIssuedLot: p.line.materialIssuedLot || 'NOT-TRACKED',
        materialQcStatus: 'ACCEPTED',
        targetDate: p.line.targetDate || defaultTarget,
        routeSteps: p.steps
      });
      if (result.error || !result.jobCard) {
        skipped.push({
          itemCode: p.line.itemCode,
          qty: p.line.qty,
          code: result.error?.code || 'RELEASE_BLOCKED',
          reason: result.error?.message || 'Job Card could not be generated.'
        });
        continue;
      }
      const jc: JobCard = { ...result.jobCard, qty: p.line.qty } as JobCard;
      const idSuffix = String(jc.id).split('-').pop();
      jc.id = `jc-${batchTs}-${i}-${idSuffix}`;
      (jc.operations || []).forEach((op, idx) => {
        op.id = `jco-${batchTs}-${i}-${idx}-${op.sequenceNo}`;
      });
      built.push({
        jc,
        machine: p.line.machine || input.machine || p.steps[0]?.workCenter || 'CNC-01',
        remarks: p.line.remarks
      });
    }

    if (built.length === 0) {
      return { orderPo: poNo, orderId: orderRow.id, created: [] as JobCard[], skipped, summary: summary() };
    }

    // ---- ONE insert for all cards (retry with fresh numbers on a job_no collision) ----
    const toCardRow = (b: (typeof built)[number]) => ({
      id: b.jc.id,
      job_no: b.jc.jobNo,
      order_po: b.jc.orderPo,
      order_id: orderRow.id,
      part_code: b.jc.partCode,
      part_description: b.jc.partDescription,
      drawing_revision: b.jc.drawingRevision,
      material_issued_lot: b.jc.materialIssuedLot,
      material_qc_status: b.jc.materialQcStatus,
      target_qty: b.jc.targetQty || 1,
      order_status: 'IN_PRODUCTION',
      qty: b.jc.targetQty || 1,
      machine: b.machine,
      target_date: b.jc.targetDate,
      status: 'SCHEDULED',
      ...(b.remarks ? { remarks: b.remarks } : {})
    });

    for (let attempt = 1; ; attempt++) {
      const { error: insertErr } = await this.db.from('job_cards').insert(built.map(toCardRow));
      if (!insertErr) break;
      const isDup = insertErr.code === '23505' || /duplicate key|unique constraint/i.test(String(insertErr.message));
      if (isDup && attempt < 3) {
        for (const b of built) {
          const nextNo = await this.getNextJobNumber();
          b.jc.jobNo = nextNo;
          (b.jc.operations || []).forEach(op => { op.jobNo = nextNo; });
        }
        continue;
      }
      logger.error('Database bulk job card insert error:', insertErr);
      throw httpErr(500, `Failed to write Job Cards to database: ${insertErr.message}`);
    }

    // ---- ONE insert for all operations; on failure remove the cards again (no partial state) ----
    const opPayloads = built.flatMap(({ jc }) =>
      (jc.operations || []).map(op => ({
        id: op.id,
        job_card_id: jc.id,
        job_no: jc.jobNo,
        sequence_no: op.sequenceNo,
        operation_name: op.operationName,
        machine_id: op.machineId,
        required_certification: op.requiredCertification || 'None',
        is_certification_verified: true,
        standard_time_minutes: op.standardTimeMinutes,
        qty_processed: 0,
        qty_rejected: 0,
        inspection_required: op.inspectionRequired || false,
        inspection_passed: false,
        op_status: 'PENDING'
      }))
    );
    if (opPayloads.length > 0) {
      const { error: opErr } = await this.db.from('job_card_operations').insert(opPayloads);
      if (opErr) {
        logger.error('Database bulk job_card_operations insert error:', opErr);
        await this.db.from('job_cards').delete().in('id', built.map(b => b.jc.id));
        throw httpErr(500, `Failed to write Job Card operations to database: ${opErr.message}`);
      }
    }

    // ---- ONE order transition + broadcast (Step 5: IN_PRODUCTION) ----
    const nowIso = new Date().toISOString();
    // supabase-js returns { error } instead of throwing, so check it (a bare try/catch never fires).
    const { error: orderUpdateErr } = await this.db.from('customer_orders').update({
      status: 'IN_PRODUCTION',
      stage: 'IN_PRODUCTION',
      progress_step: 5,
      updated_at: nowIso
    }).eq('id', orderRow.id);
    if (orderUpdateErr) {
      logger.warn(`Bulk release: job cards created for ${poNo} but order stage update failed:`, orderUpdateErr);
    }
    notificationsService.broadcastEvent('order_transitioned', {
      orderId: poNo, poNo, status: 'IN_PRODUCTION', stage: 'IN_PRODUCTION', progressStep: 5, updatedAt: nowIso
    });
    notificationsService.broadcastEvent('order_updated', {
      id: poNo, orderId: poNo, poNo, status: 'IN_PRODUCTION', stage: 'IN_PRODUCTION', progressStep: 5, updatedAt: nowIso
    });

    // ---- audit trail: one row per card (same shape as single release) + one batch summary ----
    await Promise.allSettled([
      ...built.map(({ jc }) => auditService.recordAuditLog({
        actorEmail: plannerName,
        actorRole: 'Production Planner',
        action: 'JOB_CARD_RELEASED',
        entityType: 'job_cards',
        entityId: jc.jobNo,
        details: `Job Card ${jc.jobNo} released for ${jc.targetQty} units of ${jc.partCode} (Rev ${jc.drawingRevision}, Heat ${jc.materialIssuedLot}) via bulk release of PO ${poNo}`
      })),
      auditService.recordAuditLog({
        actorEmail: plannerName,
        actorRole: 'Production Planner',
        action: 'JOB_CARDS_BULK_RELEASED',
        entityType: 'customer_orders',
        entityId: poNo,
        details: `Bulk released ${built.length} job card(s) for PO ${poNo}` +
          (skipped.length ? `; ${skipped.length} line(s) skipped (${Array.from(new Set(skipped.map(x => x.code))).join(', ')})` : '')
      })
    ]);

    // Real-time push so other open consoles see each new card (same event as single release)
    for (const { jc } of built) notificationsService.broadcastEvent('job_card_created', jc);

    return { orderPo: poNo, orderId: orderRow.id, created: built.map(b => b.jc), skipped, summary: summary() };
  }

  /**
   * CRITICAL ISSUE #9: Computes the BOM-derived material requirement for a Job Card.
   *
   * The requirement corresponds to the manufacturing entity — the Job Card and its
   * target quantity — NOT the commercial order quantity:
   *   requiredQty = BOM.qtyPerUnit × (1 + BOM.scrapAllowancePct / 100) × jobCard.targetQty
   *
   * Uses the same BOM selection as the existing order-level path (getBOMByCode by
   * parent part code). Returns null when the part has no configured BOM (no material
   * requirement exists for such parts).
   */
  async getJobCardMaterialRequirement(jobNo: string): Promise<Array<{ itemCode: string; description: string; qty: number }> | null> {
    const jobCard = await this.getJobCardByJobNo(jobNo);
    if (!jobCard) {
      throw new Error(`Job Card ${jobNo} not found`);
    }

    const targetQty = Number(jobCard.targetQty || jobCard.qty || 0);
    if (!(targetQty > 0)) {
      throw new Error(`Job Card ${jobNo} has an invalid target quantity (${targetQty}).`);
    }

    const bom = await bomService.getBOMByCode(jobCard.partCode);
    if (!bom || !bom.components || bom.components.length === 0) {
      return null;
    }

    return bom.components.map((comp: any) => ({
      itemCode: comp.componentCode,
      description: comp.componentName || comp.componentCode,
      qty: Number((Number(comp.qtyPerUnit || 1) * (1 + Number(comp.scrapAllowancePct || 0) / 100) * targetQty).toFixed(4))
    }));
  }

  /**
   * CRITICAL ISSUE #9: Issues & consumes the BOM-derived material requirement for a
   * single Job Card through the atomic, idempotent, concurrency-safe inventory ledger.
   *
   * - Quantity basis: Job Card target quantity × BOM (per unit + scrap allowance),
   *   NOT the commercial order quantity.
   * - Idempotency identity: jobNo (unique per Job Card) — repeated calls never
   *   double-deduct, while different Job Cards of one order consume independently.
   * - Reservation reconciliation is PARTIAL: the order's reservation pool is
   *   decremented by what this Job Card actually consumed; the residual stays
   *   ACTIVE so order cancellation later releases only the outstanding remainder.
   * - Blocks with a clear business error if the part has no BOM, stock is
   *   insufficient, or the order's materials were already consumed at order level.
   */
  async consumeJobCardMaterials(jobNo: string, actorName = 'Stores') {
    const jobCard = await this.getJobCardByJobNo(jobNo);
    if (!jobCard) {
      throw new Error(`Job Card ${jobNo} not found`);
    }

    const requirement = await this.getJobCardMaterialRequirement(jobNo);
    if (!requirement || requirement.length === 0) {
      const err: any = new Error(
        `BOM not found for part '${jobCard.partCode}'. Please define a Bill of Materials before issuing material for Job Card ${jobNo}.`
      );
      err.statusCode = 400;
      err.errorCode = 'ERR_BOM_NOT_FOUND';
      throw err;
    }

    const actorEmail = `${actorName.toLowerCase().replace(/\s+/g, '.')}@guruom.in`;
    const result = await inventoryMovementsService.consumeJobCardMaterialsAtomic(
      jobCard.orderId || jobCard.orderPo,
      jobCard.orderPo,
      jobNo,
      actorEmail,
      requirement
    );

    await auditService.recordAuditLog({
      actorEmail,
      actorRole: 'Stores / Production Planner',
      action: 'JOB_CARD_MATERIALS_CONSUMED',
      entityType: 'job_cards',
      entityId: jobNo,
      details: `BOM materials issued for Job Card ${jobNo} (${jobCard.partCode} × ${jobCard.targetQty}) — ${requirement.length} component(s) consumed atomically.`
    }).catch(() => {});

    notificationsService.broadcastEvent('stock_updated', {
      jobNo,
      orderPo: jobCard.orderPo,
      partCode: jobCard.partCode,
      status: 'CONSUMED',
      trigger: 'JOB_CARD_MATERIAL_ISSUE'
    });

    return result;
  }

  /**
   * Starts an operation on the Job Card, enforcing Operator Skill Certification & QC Hold gates.
   */
  async startOperation(jobNo: string, data: z.infer<typeof StartOperationSchema>, supervisorName: string) {
    const validated = StartOperationSchema.parse(data);
    const jobCard = await this.getJobCardByJobNo(jobNo);
    if (!jobCard) {
      throw new Error(`Job Card ${jobNo} not found`);
    }

    const result = startOperationOnJobCard(
      jobCard, 
      validated.sequenceNo, 
      validated.machineId, 
      validated.operatorName, 
      SEED_CERTIFIED_EMPLOYEES
    );

    if (result.error) {
      throw new Error(result.error.message);
    }

    try {
      await this.db
        .from('job_card_operations')
        .update({
          machine_id: validated.machineId,
          operator_name: validated.operatorName,
          actual_start_time: new Date().toISOString(),
          op_status: 'IN_PROGRESS'
        })
        .eq('job_no', jobNo)
        .eq('sequence_no', validated.sequenceNo);

      await this.db
        .from('job_cards')
        .update({
          status: 'RUNNING',
          updated_at: new Date().toISOString()
        })
        .eq('job_no', jobNo);
    } catch (err) {
      logger.warn('DB startOperation error:', err);
    }

    await auditService.recordAuditLog({
      actorEmail: supervisorName,
      actorRole: 'Shop Floor Supervisor',
      action: 'OPERATION_STARTED',
      entityType: 'job_cards',
      entityId: `${jobNo}-OP${validated.sequenceNo}`,
      details: `Op ${validated.sequenceNo} started on ${validated.machineId} by ${validated.operatorName}`
    }).catch(() => {});

    // Real-Time Push: Broadcast operation started
    notificationsService.broadcastEvent('operation_started', { jobNo, sequenceNo: validated.sequenceNo, jobCard: result.jobCard });
    notificationsService.broadcastEvent('job_card_updated', result.jobCard);

    return result.jobCard;
  }

  /**
   * Completes an operation, logs actual vs standard time, unlocks next operation immediately,
   * and automatically flips job card to Completed + creates QC inspection when all operations finish.
   */
  async completeOperation(jobNo: string, data: z.infer<typeof CompleteOperationSchema>, operatorName: string) {
    const validated = CompleteOperationSchema.parse(data);
    const jobCard = await this.getJobCardByJobNo(jobNo);
    if (!jobCard) {
      throw new Error(`Job Card ${jobNo} not found`);
    }

    const result = completeOperationOnJobCard(
      jobCard,
      validated.sequenceNo,
      validated.qtyProcessed,
      validated.qtyRejected,
      validated.actualMinutes,
      validated.notes
    );

    if (result.error) {
      throw new Error(result.error.message);
    }

    // Check if all operations are now completed
    const allOpsCompleted = result.jobCard.operations.every(op => op.opStatus === 'COMPLETED');
    if (allOpsCompleted) {
      result.jobCard.jobStatus = 'COMPLETED';
      result.jobCard.currentOperation = 'All Operations Completed';
    }

    // If rejections occurred, transfer rejected parts to Scrap / Rejection Yard ledger
    if (result.scrapMovementTriggered) {
      await inventoryMovementsService.recordMovement({
        itemCode: result.scrapMovementTriggered.itemCode,
        quantityChange: -result.scrapMovementTriggered.qty,
        movementType: 'DAMAGE_WRITE_OFF',
        referenceId: `${jobNo}-OP${validated.sequenceNo}`,
        referenceType: 'job_card',
        actorEmail: `${operatorName.toLowerCase().replace(/\s+/g, '.')}@guruom.in`,
        notes: `Production rejection on Op ${validated.sequenceNo}. Transferred to ${result.scrapMovementTriggered.location}.`
      });
    }

    try {
      await this.db
        .from('job_card_operations')
        .update({
          qty_processed: validated.qtyProcessed,
          qty_rejected: validated.qtyRejected,
          actual_end_time: new Date().toISOString(),
          actual_time_minutes: validated.actualMinutes,
          inspection_passed: validated.qtyRejected === 0,
          op_status: 'COMPLETED',
          notes: validated.notes
        })
        .eq('job_no', jobNo)
        .eq('sequence_no', validated.sequenceNo);

      await this.db
        .from('job_cards')
        .update({
          status: allOpsCompleted ? 'COMPLETED' : 'IN_PROGRESS',
          updated_at: new Date().toISOString()
        })
        .eq('job_no', jobNo);
    } catch (err) {
      logger.warn('DB completeOperation fallback:', err);
    }

    // AUTOMATED CHAIN TRIGGER: If all operations on this job card complete -> Auto-create QC inspection & advance order
    if (allOpsCompleted || result.jobCard.jobStatus === 'COMPLETED') {
      try {
        await qcService.createQCInspection({
          jobNo: result.jobCard.jobNo,
          orderPo: result.jobCard.orderPo,
          partCode: result.jobCard.partCode,
          partDescription: result.jobCard.partDescription,
          qty: result.jobCard.targetQty,
          jobStatus: 'COMPLETED',
          qcStatus: 'PENDING'
        });
      } catch (qcErr) {
        logger.warn('Auto QC inspection generation fallback:', qcErr);
      }

      if (result.jobCard.orderPo) {
        // Multi-Job-Card check: Check whether all job cards under this parent order are now complete
        const allOrderJobsCompleted = await this.isOrderProductionComplete(result.jobCard.orderPo, result.jobCard.jobNo);

        if (allOrderJobsCompleted) {
          // Route through the shared ordersService.transitionOrderStage function
          await this.moveOrderToReadyForQc(result.jobCard.orderPo, { role: 'Production Planner', name: operatorName });
        }
      }
    }

    await auditService.recordAuditLog({
      actorEmail: operatorName,
      actorRole: 'Machine Operator',
      action: 'OPERATION_COMPLETED',
      entityType: 'job_cards',
      entityId: `${jobNo}-OP${validated.sequenceNo}`,
      details: `Op ${validated.sequenceNo} completed: ${validated.qtyProcessed} good, ${validated.qtyRejected} rejected in ${validated.actualMinutes} mins`
    }).catch(() => {});

    // Real-Time Push: Broadcast operation completion & updated Job Card
    notificationsService.broadcastEvent('operation_completed', {
      jobNo,
      orderPo: result.jobCard.orderPo,
      sequenceNo: validated.sequenceNo,
      qtyProcessed: validated.qtyProcessed,
      allCompleted: allOpsCompleted,
      jobCard: result.jobCard
    });
    notificationsService.broadcastEvent('job_card_updated', result.jobCard);

    return result.jobCard;
  }

  /**
   * Raises an NCR against a specific job card operation, immediately placing the job card into QC Hold.
   */
  async raiseNcr(data: z.infer<typeof RaiseNcrSchema>, inspectorName: string) {
    const validated = RaiseNcrSchema.parse(data);
    const jobCard = await this.getJobCardByJobNo(validated.jobNo);
    if (!jobCard) {
      throw new Error(`Job Card ${validated.jobNo} not found`);
    }

    const ncrNumber = await getNextDocumentNumber('NCR', 'NCR');
    const ncr: NcrRecord = {
      id: `ncr-${Date.now()}`,
      ncrNumber,
      jobCardId: jobCard.id,
      jobNo: validated.jobNo,
      sequenceNo: validated.sequenceNo,
      operationName: validated.operationName,
      orderPo: validated.orderPo,
      defectCategory: validated.defectCategory,
      defectDescription: validated.defectDescription,
      rejectedQty: validated.rejectedQty,
      status: 'OPEN',
      raisedBy: inspectorName,
      raisedAt: new Date().toISOString()
    };

    const updatedJobCard = raiseNcrOnJobCard(jobCard, ncr);

    try {
      await this.db.from('ncrs').insert({
        id: ncr.id,
        ncr_number: ncr.ncrNumber,
        job_card_id: jobCard.id,
        job_no: ncr.jobNo,
        order_po: ncr.orderPo,
        defect_category: ncr.defectCategory,
        defect_description: ncr.defectDescription,
        status: 'OPEN',
        raised_by: inspectorName
      });

      await this.db
        .from('job_cards')
        .update({
          status: 'QC_HOLD',
          updated_at: new Date().toISOString()
        })
        .eq('job_no', validated.jobNo);

      if (validated.orderPo) {
        await this.db
          .from('customer_orders')
          .update({ updated_at: new Date().toISOString() })
          .or(`po_no.eq.${validated.orderPo},id.eq.${validated.orderPo}`);
      }
    } catch (err) {
      logger.warn('DB raiseNcr fallback:', err);
    }

    await auditService.recordAuditLog({
      actorEmail: inspectorName,
      actorRole: 'Quality Inspector',
      action: 'NCR_RAISED_QC_HOLD',
      entityType: 'ncrs',
      entityId: ncrNumber,
      details: `NCR ${ncrNumber} raised on ${validated.jobNo} Op ${validated.sequenceNo} (${validated.defectCategory}: ${validated.defectDescription}). Job Card locked in QC Hold.`
    }).catch(() => {});

    // Real-Time Push: Broadcast NCR raised & QC Hold
    notificationsService.broadcastEvent('ncr_raised', ncr);
    notificationsService.broadcastEvent('job_card_updated', updatedJobCard);
    if (validated.orderPo) {
      notificationsService.broadcastEvent('order_updated', { id: validated.orderPo, poNo: validated.orderPo, hasOpenNcr: true });
    }

    return { ncr, jobCard: updatedJobCard };
  }

  /**
   * Resolves NCR disposition (Rework / Scrap / Use-as-is Concession) and clears the QC Hold.
   */
  async disposeNcr(jobNo: string, data: z.infer<typeof NcrDispositionSchema>, approverName: string) {
    const validated = NcrDispositionSchema.parse(data);
    const jobCard = await this.getJobCardByJobNo(jobNo);
    if (!jobCard) {
      throw new Error(`Job Card ${jobNo} not found`);
    }

    const result = resolveNcrOnJobCard(
      jobCard, 
      validated.ncrNumber, 
      validated.disposition, 
      approverName, 
      validated.reason
    );

    if (result.scrapMovementTriggered) {
      await inventoryMovementsService.recordMovement({
        itemCode: result.scrapMovementTriggered.itemCode,
        quantityChange: -result.scrapMovementTriggered.qty,
        movementType: 'DAMAGE_WRITE_OFF',
        referenceId: jobNo,
        referenceType: 'job_card',
        actorEmail: 'production@guruom.in',
        notes: `NCR ${validated.ncrNumber} disposition scrap write-off.`
      });
    }

    try {
      await this.db
        .from('ncrs')
        .update({
          status: 'RESOLVED',
          disposition: validated.disposition,
          disposition_approved_by: approverName,
          disposition_reason: validated.reason,
          disposition_date: new Date().toISOString()
        })
        .eq('ncr_number', validated.ncrNumber);

      await this.db
        .from('job_cards')
        .update({
          status: result.jobCard.jobStatus === 'QC_HOLD' ? 'IN_PROGRESS' : result.jobCard.jobStatus,
          updated_at: new Date().toISOString()
        })
        .eq('job_no', jobNo);

      if (jobCard.orderPo) {
        await this.db
          .from('customer_orders')
          .update({ updated_at: new Date().toISOString() })
          .or(`po_no.eq.${jobCard.orderPo},id.eq.${jobCard.orderPo}`);
      }
    } catch (err) {
      logger.warn('DB disposeNcr fallback:', err);
    }

    await auditService.recordAuditLog({
      actorEmail: approverName,
      actorRole: 'Quality Lead / Owner',
      action: 'NCR_DISPOSED',
      entityType: 'ncrs',
      entityId: validated.ncrNumber,
      details: `NCR ${validated.ncrNumber} on ${jobNo} resolved via ${validated.disposition}. Reason: ${validated.reason}`
    }).catch(() => {});

    // Real-Time Push: Broadcast NCR disposition
    notificationsService.broadcastEvent('ncr_resolved', { ncrNumber: validated.ncrNumber, disposition: validated.disposition });
    notificationsService.broadcastEvent('job_card_updated', result.jobCard);
    if (jobCard.orderPo) {
      notificationsService.broadcastEvent('order_updated', { id: jobCard.orderPo, poNo: jobCard.orderPo, hasOpenNcr: false });
    }

    return { jobCard: result.jobCard, disposition: validated.disposition };
  }

  /**
   * Shop-floor KPI metrics for Machine Utilization % and Schedule performance.
   */
  async getProductionTelemetry() {
    const jobCards = await this.getJobCards();
    const allOperations = jobCards.flatMap(j => j.operations || []);
    const kpis = computeProductionKpis(allOperations);
    return {
      totalJobCards: jobCards.length,
      inProgressCount: jobCards.filter(j => j.jobStatus === 'IN_PROGRESS' || j.status === 'RUNNING').length,
      qcHoldCount: jobCards.filter(j => j.jobStatus === 'QC_HOLD' || j.status === 'QC_HOLD').length,
      completedCount: jobCards.filter(j => j.jobStatus === 'COMPLETED' || j.status === 'COMPLETED').length,
      ...kpis
    };
  }

  /**
   * Multi-line order completion gate, used before auto-advancing an order to READY_FOR_QC.
   *
   * An order is production-complete only when BOTH hold:
   *  1. every non-cancelled Job Card on the order is COMPLETED (the card that just
   *     completed counts as complete even if its row is not yet flushed), and
   *  2. for every part on the order's line items, the qty released on Job Cards
   *     covers the qty ordered (summed per part code, so a part repeated on two
   *     lines is handled).
   *
   * Rule 2 is what makes 40-50 line POs safe: cards are released gradually, so the
   * first few finished cards must not push the whole order to QC while other lines
   * have no card yet. Rule 2 is skipped when the order has no line items
   * (legacy / header-only orders) so those keep their previous behaviour.
   *
   * Fail-closed: if the check cannot be evaluated the order is NOT advanced. The
   * owner can still advance it manually from the order screen.
   */
  private async isOrderProductionComplete(orderRef: string, sourceJobNo: string): Promise<boolean> {
    if (!orderRef || orderRef === 'PO') return false;
    const norm = (v: unknown) => String(v ?? '').trim().toUpperCase();

    try {
      // Job cards may carry either the PO number or the order id in order_po.
      const orderRow = await this.resolveOrderRow(orderRef);
      const refs = Array.from(new Set([orderRef, orderRow?.po_no, orderRow?.id].filter(Boolean) as string[]));

      const { data: cardRows, error: cardErr } = await this.db
        .from('job_cards')
        .select('job_no, part_code, qty, status')
        .in('order_po', refs);
      if (cardErr) throw cardErr;

      // 'CANCELLED' is defensive: no code path sets it today.
      const cards = (cardRows || []).filter((c: any) => norm(c.status) !== 'CANCELLED');

      // Rule 1: nothing else may still be open.
      const openCard = cards.find((c: any) => c.job_no !== sourceJobNo && norm(c.status) !== 'COMPLETED');
      if (openCard) return false;

      // Rule 2: released qty must cover ordered qty on every part.
      if (orderRow) {
        const { data: lineRows, error: lineErr } = await this.db
          .from('order_line_items')
          .select('item_code, order_qty')
          .eq('order_id', orderRow.id);
        if (lineErr) throw lineErr;

        const required = new Map<string, number>();
        for (const l of lineRows || []) {
          const code = norm((l as any).item_code);
          const qty = Number((l as any).order_qty || 0);
          if (code && qty > 0) required.set(code, (required.get(code) || 0) + qty);
        }

        if (required.size > 0) {
          const released = new Map<string, number>();
          for (const c of cards) {
            const code = norm((c as any).part_code);
            released.set(code, (released.get(code) || 0) + Number((c as any).qty || 0));
          }
          const short: string[] = [];
          required.forEach((need, code) => {
            if ((released.get(code) || 0) + 1e-9 < need) short.push(code);
          });
          if (short.length > 0) {
            logger.info(
              `Order ${orderRef} NOT advanced to READY_FOR_QC: ${short.length} of ${required.size} part(s) ` +
              `not fully released to job cards yet (${short.slice(0, 5).join(', ')}${short.length > 5 ? ', …' : ''}).`
            );
            return false;
          }
        }
      }
      return true;
    } catch (err) {
      logger.warn(`isOrderProductionComplete check failed for ${orderRef}; order NOT auto-advanced:`, err);
      return false;
    }
  }

  /**
   * Moves an order to READY_FOR_QC through the order state machine (single implementation for the
   * three places a completed job card can trigger it).
   *
   * - Success: transitionOrderStage persists and broadcasts.
   * - Rejected by a rule (HTTP 400: a gate said no, or the order is in a stage that may not move to
   *   QC, e.g. dispatched / cancelled / in PDI): NEVER overridden. It is logged and audited so a stuck
   *   order is explainable; the owner can still act from the order screen.
   * - Any other failure (order lookup miss, lock timeout, concurrent edit, DB error): the previous
   *   resilience is kept, but the direct write is conditional on the order really being in a stage from
   *   which QC is legal (IN_PRODUCTION / QC_HOLD), and it is only announced if a row actually moved.
   *   (A 404 still broadcasts, as before, because job cards can exist for POs without an order row.)
   */
  private async moveOrderToReadyForQc(orderRef: string, actor: { role: string; name: string }): Promise<void> {
    try {
      await ordersService.transitionOrderStage(orderRef, 'READY_FOR_QC', {}, actor);
      return;
    } catch (err: any) {
      const status = err?.statusCode;

      if (status === 400) {
        logger.warn(`Order ${orderRef} not advanced to READY_FOR_QC: ${err.message}`);
        await auditService.recordAuditLog({
          actorEmail: actor.name,
          actorRole: actor.role,
          action: 'ORDER_QC_ADVANCE_BLOCKED',
          entityType: 'customer_orders',
          entityId: orderRef,
          details: `Automatic advance to READY_FOR_QC blocked: ${err.message}${err.errorCode ? ` (${err.errorCode})` : ''}`
        }).catch(() => {});
        return;
      }

      logger.warn(`transitionOrderStage(READY_FOR_QC) failed for ${orderRef}; using guarded fallback:`, err);
      const nowIso = new Date().toISOString();
      const { data: moved, error: updErr } = await this.db
        .from('customer_orders')
        .update({ status: 'READY_FOR_QC', stage: 'READY_FOR_QC', progress_step: 6, updated_at: nowIso })
        .or(`po_no.eq.${orderRef},id.eq.${orderRef}`)
        .in('status', ['IN_PRODUCTION', 'QC_HOLD'])
        .select('id');
      if (updErr) logger.warn(`Guarded READY_FOR_QC fallback update failed for ${orderRef}:`, updErr);

      const didMove = !updErr && (moved?.length || 0) > 0;
      if (!didMove && status !== 404) return; // nothing changed, nothing to announce

      notificationsService.broadcastEvent('order_transitioned', {
        orderId: orderRef, poNo: orderRef, status: 'READY_FOR_QC', stage: 'READY_FOR_QC', progressStep: 6, updatedAt: nowIso
      });
      notificationsService.broadcastEvent('order_updated', {
        id: orderRef, orderId: orderRef, poNo: orderRef, status: 'READY_FOR_QC', stage: 'READY_FOR_QC', progressStep: 6, updatedAt: nowIso
      });
    }
  }

  /**
   * Shared real-time bridge: when a Job Card reaches COMPLETED, advance the parent
   * Order to READY_FOR_QC (step 6) ONLY once EVERY job card under that order is
   * complete, routing through the same shared broadcast used by Confirmed /
   * In-Production / QC-PDI transitions so the live pipeline stepper updates
   * without a manual refresh.
   */
  private async advanceOrderToReadyForQcWhenAllJobsComplete(
    orderPo: string,
    sourceJobNo: string,
    actorName: string
  ): Promise<void> {
    // Multi-Job-Card gate: do not advance while any sibling job for this order is open.
    const allOrderJobsCompleted = await this.isOrderProductionComplete(orderPo, sourceJobNo);

    if (!allOrderJobsCompleted) return;
    if (!orderPo || orderPo === 'PO') return;

    // Route through the SHARED ordersService.transitionOrderStage helper (broadcasts
    // order_transitioned + order_updated), with a consistent raw fallback.
    await this.moveOrderToReadyForQc(orderPo, { role: 'Production Planner', name: actorName });
  }

  /**
   * Records a qty-based per-route-step production log and, when the cumulative
   * logged quantity across the job reaches the target, flips the Job Card to
   * COMPLETED and advances the order via the shared broadcast bridge. This wires
   * the previously-dead POST /production/logs path into the same real-time
   * mechanism used by the operation-completion path.
   */
  async recordProductionLog(data: z.infer<typeof ProductionLogSchema>, actorName = 'Machine Operator') {
    const validated = ProductionLogSchema.parse(data);
    const job = await this.getJobCardByJobNo(validated.jobNo);
    if (!job) {
      const err: any = new Error(`Job Card ${validated.jobNo} not found`);
      err.statusCode = 404;
      throw err;
    }

    const created: any = {
      id: validated.id || `pl-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      itemCode: validated.itemCode,
      description: validated.description,
      jobNo: validated.jobNo,
      stepNo: validated.stepNo,
      operationName: validated.operationName,
      qtyDone: validated.qtyDone,
      loggedTimestamp: validated.loggedTimestamp || new Date().toISOString(),
      orderPo: job.orderPo
    };

    const { error: insErr } = await this.db.from('production_logs').insert({
      id: created.id,
      item_code: created.itemCode,
      description: created.description,
      job_no: created.jobNo,
      step_no: created.stepNo,
      operation_name: created.operationName,
      qty_done: created.qtyDone,
      logged_timestamp: created.loggedTimestamp
    });

    if (insErr) {
      logger.error('Database recordProductionLog insert error:', insErr);
      const err: any = new Error(`Failed to record production log: ${insErr.message}`);
      err.code = insErr.code;
      err.statusCode = 400;
      throw err;
    }

    // 1. Fetch all production logs for this job to compute per-step and overall quantities
    let allLogs: any[] = [];
    try {
      const { data: rows } = await this.db
        .from('production_logs')
        .select('*')
        .eq('job_no', validated.jobNo);
      if (rows) allLogs = rows;
    } catch (err) {
      logger.warn('recordProductionLog all logs read fallback:', err);
    }

    // Include the just-created log if not already in rows
    if (!allLogs.some(l => l.id === created.id)) {
      allLogs.push({
        id: created.id,
        job_no: created.jobNo,
        step_no: created.stepNo,
        qty_done: created.qtyDone
      });
    }

    // Calculate cumulative logged quantity per step sequence
    const loggedPerStep: Record<number, number> = {};
    let totalQtyLoggedAcrossJob = 0;
    for (const log of allLogs) {
      const seq = Number(log.step_no || log.stepNo || 10);
      const q = Number(log.qty_done || log.qtyDone || 0);
      loggedPerStep[seq] = (loggedPerStep[seq] || 0) + q;
      totalQtyLoggedAcrossJob += q;
    }

    const targetQty = Number(job.targetQty || job.qty || 1);
    const currentStepCumulative = loggedPerStep[created.stepNo] || created.qtyDone;

    // 2. Update matching job_card_operations for this step_no if exists
    try {
      if (currentStepCumulative >= targetQty) {
        await this.db
          .from('job_card_operations')
          .update({
            qty_processed: currentStepCumulative,
            op_status: 'COMPLETED',
            inspection_passed: true,
            actual_end_time: new Date().toISOString()
          })
          .eq('job_no', validated.jobNo)
          .eq('sequence_no', created.stepNo);
      } else {
        await this.db
          .from('job_card_operations')
          .update({
            qty_processed: currentStepCumulative,
            op_status: 'IN_PROGRESS'
          })
          .eq('job_no', validated.jobNo)
          .eq('sequence_no', created.stepNo);
      }
    } catch (err) {
      logger.warn('recordProductionLog op update fallback:', err);
    }

    // 3. Determine all required steps for this job
    let requiredStepSeqs: number[] = [];
    if (job.operations && job.operations.length > 0) {
      requiredStepSeqs = job.operations.map((o: any) => Number(o.sequenceNo));
    } else {
      // Check Route Card templates for this partCode
      const templates = await this.getRouteCardTemplates();
      const matchingTemplates = templates.filter(t => t.partCode === job.partCode);
      if (matchingTemplates.length > 0) {
        requiredStepSeqs = matchingTemplates.map(t => Number(t.sequenceNo));
      } else {
        // Standard default steps
        requiredStepSeqs = [10, 20, 30, 40, 50];
      }
    }

    // Check if EVERY route step has logged qty >= targetQty
    const allStepsCompleted = requiredStepSeqs.length > 0 && requiredStepSeqs.every(seq => {
      return (loggedPerStep[seq] || 0) >= targetQty;
    });

    const persisted: any = { ...created, cumulative: totalQtyLoggedAcrossJob };
    notificationsService.broadcastEvent('production_log_created', persisted);

    if (allStepsCompleted) {
      try {
        await this.db
          .from('job_cards')
          .update({ status: 'COMPLETED', jobStatus: 'COMPLETED', updated_at: new Date().toISOString() })
          .eq('job_no', validated.jobNo);
      } catch (err) {
        logger.warn('recordProductionLog job complete update fallback:', err);
      }

      const completedJob: any = { ...job, status: 'COMPLETED', jobStatus: 'COMPLETED' };
      notificationsService.broadcastEvent('job_card_updated', completedJob);

      if (validated.autoTriggerQC !== false) {
        try {
          await qcService.createQCInspection({
            jobNo: job.jobNo,
            orderPo: job.orderPo,
            partCode: job.partCode,
            partDescription: job.partDescription,
            qty: targetQty,
            jobStatus: 'COMPLETED',
            qcStatus: 'PENDING'
          });
        } catch (qcErr) {
          logger.warn('Auto QC inspection generation fallback:', qcErr);
        }
      }

      if (job.orderPo) {
        await this.advanceOrderToReadyForQcWhenAllJobsComplete(job.orderPo, job.jobNo, actorName);
      }
    } else {
      // Keep job IN_PROGRESS
      try {
        await this.db
          .from('job_cards')
          .update({ status: 'IN_PROGRESS', jobStatus: 'IN_PROGRESS', updated_at: new Date().toISOString() })
          .eq('job_no', validated.jobNo);
      } catch (err) {}
      notificationsService.broadcastEvent('job_card_updated', { ...job, status: 'IN_PROGRESS', jobStatus: 'IN_PROGRESS' });
    }

    return {
      log: persisted,
      jobStatus: allStepsCompleted ? 'COMPLETED' : 'IN_PROGRESS',
      allStepsCompleted,
      loggedPerStep,
      targetQty,
      qcTriggered: allStepsCompleted && validated.autoTriggerQC !== false
    };
  }

  /**
   * Lists recent production logs (qty-based route-step logs). This provides the
   * GET /production/logs endpoint consumed by the frontend reports / production UI.
   */
  async getProductionLogs(limit = 200) {
    try {
      const { data } = await this.db
        .from('production_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);
      if (data) {
        return data.map((r: any) => ({
          id: r.id,
          itemCode: r.item_code,
          description: r.description,
          jobNo: r.job_no,
          orderPo: r.order_po || undefined,
          stepNo: r.step_no,
          operationName: r.operation_name,
          qtyDone: Number(r.qty_done || 0),
          loggedTimestamp: r.logged_timestamp || r.created_at
        }));
      }
    } catch (err) {
      logger.warn('getProductionLogs DB read fallback:', err);
    }
    return [];
  }

  async updateJobStatus(jobNo: string, payload: { status: string }) {
    const job = await this.getJobCardByJobNo(jobNo);
    if (job) {
      try {
        await this.db.from('job_cards').update({ status: payload.status, updated_at: new Date().toISOString() }).eq('job_no', jobNo);
      } catch (err) {
        logger.error('Database updateJobStatus error:', err);
      }
      notificationsService.broadcastEvent('job_card_updated', { ...job, status: payload.status, jobStatus: payload.status });

      if (payload.status === 'COMPLETED' && job.orderPo) {
        const allOrderJobsCompleted = await this.isOrderProductionComplete(job.orderPo, job.jobNo);

        if (allOrderJobsCompleted) {
          await this.moveOrderToReadyForQc(job.orderPo, { role: 'Production Planner', name: 'System / PPC' });
        }
      }
    }
    return { jobNo, status: payload.status };
  }
}

export const productionService = new ProductionService();

