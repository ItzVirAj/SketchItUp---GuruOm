import { getDbClient } from '../../config/database';
import { z } from 'zod';
import { 
  JobCardCreateSchema, 
  StartOperationSchema, 
  CompleteOperationSchema,
  RaiseNcrSchema,
  NcrDispositionSchema
} from './production.schema';
import { auditService } from '../audit/audit.service';
import { inventoryService } from '../inventory/inventory.service';
import { ordersService } from '../orders/orders.service';
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

const SEED_ROUTE_CARDS: RouteCardTemplateStep[] = [
  // 00000001 - MAIN SPINDLE HOUSING 120MM
  { id: 'rt-001-10', partCode: '00000001', partDescription: 'MAIN SPINDLE HOUSING 120MM', sequenceNo: 10, operationName: 'Raw Material Saw Cutting', workCenter: 'BANDSAW-01', standardTimeMinutes: 10, inspectionRequired: false, requiredCertification: 'Operator Lv1' },
  { id: 'rt-001-20', partCode: '00000001', partDescription: 'MAIN SPINDLE HOUSING 120MM', sequenceNo: 20, operationName: 'CNC Rough Turning & Facing', workCenter: 'CNC-LATHE-01', standardTimeMinutes: 25, inspectionRequired: false, requiredCertification: 'CNC Certified' },
  { id: 'rt-001-30', partCode: '00000001', partDescription: 'MAIN SPINDLE HOUSING 120MM', sequenceNo: 30, operationName: 'VMC Boring & Keyway Milling', workCenter: 'VMC-01', standardTimeMinutes: 35, inspectionRequired: false, requiredCertification: 'VMC Machinist' },
  { id: 'rt-001-40', partCode: '00000001', partDescription: 'MAIN SPINDLE HOUSING 120MM', sequenceNo: 40, operationName: 'Induction Hardening & Case Depth Check', workCenter: 'HT-FURNACE-01', standardTimeMinutes: 30, inspectionRequired: true, requiredCertification: 'Heat Treatment Tech' },
  { id: 'rt-001-50', partCode: '00000001', partDescription: 'MAIN SPINDLE HOUSING 120MM', sequenceNo: 50, operationName: 'Precision Cylindrical OD Grinding', workCenter: 'GRIND-01', standardTimeMinutes: 20, inspectionRequired: true, requiredCertification: 'Grinding Specialist' },
  { id: 'rt-001-60', partCode: '00000001', partDescription: 'MAIN SPINDLE HOUSING 120MM', sequenceNo: 60, operationName: 'Final Dimensional & Runout Inspection', workCenter: 'QC-LAB', standardTimeMinutes: 15, inspectionRequired: true, requiredCertification: 'QC Inspector Lv2' },
  { id: 'rt-001-70', partCode: '00000001', partDescription: 'MAIN SPINDLE HOUSING 120MM', sequenceNo: 70, operationName: 'Ultrasonic Cleaning & Protective Packing', workCenter: 'PACK-01', standardTimeMinutes: 5, inspectionRequired: false, requiredCertification: 'Packing Clerk' },

  // 00000002 / BOOM-BRACKET-ASM - Boom Bracket Sub-assembly
  { id: 'rt-002-10', partCode: '00000002', partDescription: 'Boom Bracket Sub-assembly', sequenceNo: 10, operationName: 'Profile Saw & Plate Cutting', workCenter: 'CUT-01', standardTimeMinutes: 12, inspectionRequired: false, requiredCertification: 'Operator Lv1' },
  { id: 'rt-002-20', partCode: '00000002', partDescription: 'Boom Bracket Sub-assembly', sequenceNo: 20, operationName: 'MIG/TIG Structural Welding', workCenter: 'WELD-01', standardTimeMinutes: 25, inspectionRequired: false, requiredCertification: 'Certified Welder' },
  { id: 'rt-002-30', partCode: '00000002', partDescription: 'Boom Bracket Sub-assembly', sequenceNo: 30, operationName: 'CNC Coordinate Milling', workCenter: 'VMC-01', standardTimeMinutes: 40, inspectionRequired: true, requiredCertification: 'VMC Machinist' },
  { id: 'rt-002-40', partCode: '00000002', partDescription: 'Boom Bracket Sub-assembly', sequenceNo: 40, operationName: 'CMM Dimensional Inspection', workCenter: 'CMM-01', standardTimeMinutes: 10, inspectionRequired: true, requiredCertification: 'Quality Inspector' },
  { id: 'rt-002-50', partCode: '00000002', partDescription: 'Boom Bracket Sub-assembly', sequenceNo: 50, operationName: 'Surface Powder Coating & Packing', workCenter: 'PACK-01', standardTimeMinutes: 8, inspectionRequired: false, requiredCertification: 'None' },

  // 00000003 / CONTROL-PANEL-ASM - Control Panel Assembly
  { id: 'rt-003-10', partCode: '00000003', partDescription: 'Control Panel Assembly', sequenceNo: 10, operationName: 'Sheet Metal Laser Cutting', workCenter: 'CUT-01', standardTimeMinutes: 15, inspectionRequired: false, requiredCertification: 'Laser Op' },
  { id: 'rt-003-20', partCode: '00000003', partDescription: 'Control Panel Assembly', sequenceNo: 20, operationName: 'CNC Turret Punching & Bending', workCenter: 'BEND-01', standardTimeMinutes: 20, inspectionRequired: false, requiredCertification: 'Bending Op' },
  { id: 'rt-003-30', partCode: '00000003', partDescription: 'Control Panel Assembly', sequenceNo: 30, operationName: 'Electrical Busbar & Component Mounting', workCenter: 'ELEC-01', standardTimeMinutes: 30, inspectionRequired: false, requiredCertification: 'Electrician Lv2' },
  { id: 'rt-003-40', partCode: '00000003', partDescription: 'Control Panel Assembly', sequenceNo: 40, operationName: 'High-Voltage Insulation & Continuity Testing', workCenter: 'TEST-BAY', standardTimeMinutes: 15, inspectionRequired: true, requiredCertification: 'QC Electrical' },
  { id: 'rt-003-50', partCode: '00000003', partDescription: 'Control Panel Assembly', sequenceNo: 50, operationName: 'Protective Packaging & Labeling', workCenter: 'PACK-01', standardTimeMinutes: 10, inspectionRequired: false, requiredCertification: 'None' },

  // 00000004 / HYD-CYL-MOUNT - Hydraulic Cylinder Mount
  { id: 'rt-004-10', partCode: '00000004', partDescription: 'Hydraulic Cylinder Mount', sequenceNo: 10, operationName: 'Round Billet Saw Cutting', workCenter: 'BANDSAW-01', standardTimeMinutes: 10, inspectionRequired: false, requiredCertification: 'Operator Lv1' },
  { id: 'rt-004-20', partCode: '00000004', partDescription: 'Hydraulic Cylinder Mount', sequenceNo: 20, operationName: 'Heavy Turning & Bore Roughing', workCenter: 'CNC-LATHE-02', standardTimeMinutes: 30, inspectionRequired: false, requiredCertification: 'CNC Certified' },
  { id: 'rt-004-30', partCode: '00000004', partDescription: 'Hydraulic Cylinder Mount', sequenceNo: 30, operationName: '4-Axis Milling & Pin Hole Reaming', workCenter: 'VMC-02', standardTimeMinutes: 25, inspectionRequired: false, requiredCertification: 'VMC Machinist' },
  { id: 'rt-004-40', partCode: '00000004', partDescription: 'Hydraulic Cylinder Mount', sequenceNo: 40, operationName: 'Magnetic Particle Non-Destructive Testing', workCenter: 'NDT-01', standardTimeMinutes: 15, inspectionRequired: true, requiredCertification: 'NDT Level II' },
  { id: 'rt-004-50', partCode: '00000004', partDescription: 'Hydraulic Cylinder Mount', sequenceNo: 50, operationName: 'Anti-Corrosion Phosphate Coating', workCenter: 'COAT-01', standardTimeMinutes: 10, inspectionRequired: false, requiredCertification: 'None' },

  // 00000005 / FLANGE-EN8-100MM - Precision Machined Flange 100mm
  { id: 'rt-005-10', partCode: '00000005', partDescription: 'Precision Machined Flange 100mm', sequenceNo: 10, operationName: 'Billet Saw Cutting', workCenter: 'BANDSAW-01', standardTimeMinutes: 8, inspectionRequired: false, requiredCertification: 'Operator Lv1' },
  { id: 'rt-005-20', partCode: '00000005', partDescription: 'Precision Machined Flange 100mm', sequenceNo: 20, operationName: 'CNC Facing, Turning & Grooving', workCenter: 'CNC-LATHE-01', standardTimeMinutes: 20, inspectionRequired: false, requiredCertification: 'CNC Certified' },
  { id: 'rt-005-30', partCode: '00000005', partDescription: 'Precision Machined Flange 100mm', sequenceNo: 30, operationName: 'PCD Hole Pattern Drilling & Tapping', workCenter: 'RADIAL-DRILL-01', standardTimeMinutes: 15, inspectionRequired: false, requiredCertification: 'Machinist' },
  { id: 'rt-005-40', partCode: '00000005', partDescription: 'Precision Machined Flange 100mm', sequenceNo: 40, operationName: 'Surface Flatness & Dimensional QC', workCenter: 'QC-LAB', standardTimeMinutes: 10, inspectionRequired: true, requiredCertification: 'QC Inspector' },
  { id: 'rt-005-50', partCode: '00000005', partDescription: 'Precision Machined Flange 100mm', sequenceNo: 50, operationName: 'Rust Preventive Dipping & Wrapping', workCenter: 'PACK-01', standardTimeMinutes: 5, inspectionRequired: false, requiredCertification: 'None' },

  // 00000006 / SHAFT-PINION-EN24 - Pinion Gear Shaft EN24
  { id: 'rt-006-10', partCode: '00000006', partDescription: 'Pinion Gear Shaft EN24', sequenceNo: 10, operationName: 'Bar Stock Sawing', workCenter: 'BANDSAW-01', standardTimeMinutes: 10, inspectionRequired: false, requiredCertification: 'Operator Lv1' },
  { id: 'rt-006-20', partCode: '00000006', partDescription: 'Pinion Gear Shaft EN24', sequenceNo: 20, operationName: 'CNC Step Turning & Centering', workCenter: 'CNC-LATHE-01', standardTimeMinutes: 25, inspectionRequired: false, requiredCertification: 'CNC Certified' },
  { id: 'rt-006-30', partCode: '00000006', partDescription: 'Pinion Gear Shaft EN24', sequenceNo: 30, operationName: 'Gear Hobbing & Tooth Generation', workCenter: 'HOBBING-01', standardTimeMinutes: 35, inspectionRequired: false, requiredCertification: 'Gear Specialist' },
  { id: 'rt-006-40', partCode: '00000006', partDescription: 'Pinion Gear Shaft EN24', sequenceNo: 40, operationName: 'Vacuum Carburizing & Quenching', workCenter: 'HT-FURNACE-01', standardTimeMinutes: 45, inspectionRequired: true, requiredCertification: 'Heat Treatment Tech' },
  { id: 'rt-006-50', partCode: '00000006', partDescription: 'Pinion Gear Shaft EN24', sequenceNo: 50, operationName: 'Spline & Journal Precision Grinding', workCenter: 'GRIND-01', standardTimeMinutes: 20, inspectionRequired: true, requiredCertification: 'Grinding Specialist' },
  { id: 'rt-006-60', partCode: '00000006', partDescription: 'Pinion Gear Shaft EN24', sequenceNo: 60, operationName: 'Gear Profile & Lead Pitch Inspection', workCenter: 'QC-LAB', standardTimeMinutes: 15, inspectionRequired: true, requiredCertification: 'QC Inspector Lv2' }
];
const SEED_CERTIFIED_EMPLOYEES: EmployeeCertification[] = [];

export class ProductionService {
  private db = getDbClient();

  async getRouteCardTemplates() {
    try {
      const { data, error } = await this.db
        .from('route_card_templates')
        .select('*')
        .order('sequence_no', { ascending: true });

      if (!error && data && data.length > 0) {
        const dbList = data.map(r => ({
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
        // Merge seed route cards for missing part codes
        const dbParts = new Set(dbList.map(r => r.partCode));
        const missingSeeds = SEED_ROUTE_CARDS.filter(s => !dbParts.has(s.partCode));
        return [...dbList, ...missingSeeds];
      }
    } catch (err) {
      console.warn('DB getRouteCardTemplates fallback:', err);
    }
    return SEED_ROUTE_CARDS;
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
      console.warn('Database saveRouteCard exception:', err);
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
      console.warn('Database deleteRouteCard error:', err);
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

  async getJobCards() {
    try {
      const { data: jcData, error } = await this.db
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
        .order('created_at', { ascending: false });

      if (!error && jcData && jcData.length > 0) {
        const { data: opsData } = await this.db.from('job_card_operations').select('*');
        return jcData.map(jc => ({
          id: jc.id,
          jobNo: jc.job_no,
          orderId: jc.order_po,
          orderPo: jc.order_po,
          partCode: jc.part_code,
          partDescription: jc.part_description,
          drawingRevision: 'REV-A',
          targetQty: Number(jc.qty || 0),
          qty: Number(jc.qty || 0),
          machine: jc.machine || 'CNC-01',
          materialIssuedLot: 'NOT-TRACKED',
          materialQcStatus: 'ACCEPTED',
          currentStepNo: 10,
          currentOperation: 'CNC Machining',
          jobStatus: jc.status === 'SCHEDULED' ? 'NOT_STARTED' : (jc.status || 'NOT_STARTED'),
          status: jc.status || 'SCHEDULED',
          hasOpenNcr: false,
          targetDate: jc.target_date,
          operations: (opsData || []).filter(o => o.job_no === jc.job_no || o.job_card_id === jc.id).map(o => ({
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
            actualTimeMinutes: Number(o.actual_time_minutes || 0),
            qtyProcessed: Number(o.qty_processed || 0),
            qtyRejected: Number(o.qty_rejected || 0),
            inspectionRequired: o.inspection_required,
            inspectionPassed: o.inspection_passed,
            opStatus: o.op_status
          }))
        }));
      }
    } catch (err) {
      console.warn('DB getJobCards fallback:', err);
    }
    return [];
  }

  async getJobCardByJobNo(jobNo: string) {
    const list = await this.getJobCards();
    return list.find(j => j.jobNo === jobNo || j.id === jobNo) || null;
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
      orderId: rawData.orderId || rawData.id,
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
    
    // Query ALL existing job numbers directly from database to guarantee absolute uniqueness
    const { data: dbCards } = await this.db.from('job_cards').select('job_no');
    const existingJobNos = new Set<string>((dbCards || []).map((c: any) => c.job_no).filter(Boolean));

    let jobNo = validated.jobNo;
    if (!jobNo || existingJobNos.has(jobNo)) {
      let maxSeq = 0;
      existingJobNos.forEach(no => {
        const m = String(no).match(/JC\/(\d+)\//i);
        if (m) {
          const n = parseInt(m[1], 10);
          if (!isNaN(n) && n > maxSeq) maxSeq = n;
        }
      });
      let seq = Math.max(maxSeq + 1, existingJobNos.size + 1);
      while (existingJobNos.has(`JC/${String(seq).padStart(4, '0')}/26-27`)) {
        seq++;
      }
      jobNo = `JC/${String(seq).padStart(4, '0')}/26-27`;
    }

    // Server-side Gate (7-stage flow): linked order must be Confirmed and material-verified (MATERIAL_READY / IN_PRODUCTION)
    if (validated.orderPo || validated.orderId) {
      const order = await ordersService.getOrderById(validated.orderId || validated.orderPo);
      if (order) {
        const st = (order.status || order.stage || '').toUpperCase();
        const blockedStages = ['DRAFT', 'SUBMITTED', 'PO_RECEIVED', 'CONFIRMED', 'MATERIAL_SHORT', 'PARTIALLY_DISPATCHED', 'DISPATCHED', 'IN_TRANSIT', 'DELIVERED', 'PAYMENT_PENDING', 'INVOICED', 'INVOICE_GENERATED', 'COMPLETED', 'CLOSED', 'CANCELLED', 'PAID'];
        if (blockedStages.includes(st)) {
          const err: any = new Error(`Job Card creation blocked for Order #${order.poNo}: Order must complete Stage 3 Material Verification and be in MATERIAL_READY or IN_PRODUCTION before release (currently in "${st}").`);
          err.statusCode = 400;
          throw err;
        }
      }
    }

    // Fetch Route Card Templates for this part code
    const allRoutes = await this.getRouteCardTemplates();
    const routeSteps = allRoutes.filter(r => r.partCode === validated.partCode);
    const stepsToUse = routeSteps.length > 0 ? routeSteps : [
      { id: 'rt-gen-10', partCode: validated.partCode, partDescription: validated.partDescription, sequenceNo: 10, operationName: 'CNC Machining', workCenter: 'CNC-01', standardTimeMinutes: 45, inspectionRequired: false, requiredCertification: 'CNC Certified' },
      { id: 'rt-gen-20', partCode: validated.partCode, partDescription: validated.partDescription, sequenceNo: 20, operationName: 'Final Inspection', workCenter: 'INSPECTION-BAY', standardTimeMinutes: 20, inspectionRequired: true, requiredCertification: 'Quality Inspector Level 2' }
    ];

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
          part_code: jobCard.partCode,
          part_description: jobCard.partDescription,
          order_status: 'IN_PRODUCTION',
          qty: jobCard.targetQty || 1,
          machine: rawData.machine || 'CNC-01',
          target_date: jobCard.targetDate,
          status: jobCard.jobStatus === 'NOT_STARTED' ? 'SCHEDULED' : (jobCard.jobStatus || 'SCHEDULED')
        });

        if (insertErr) {
          if (insertErr.code === '23505' || String(insertErr.message).includes('unique constraint') || String(insertErr.message).includes('duplicate key') || String(insertErr.message).includes('job_cards_job_no_key')) {
            const randomSalt = Math.floor(1000 + Math.random() * 9000);
            const ts = Date.now();
            const newJobNo = `JC/${ts.toString().slice(-4)}${randomSalt.toString().slice(-2)}/26-27`;
            jobCard.jobNo = newJobNo;
            jobNo = newJobNo;
            jobCard.id = `jc-${ts}-${randomSalt}`;
            if (jobCard.operations && jobCard.operations.length > 0) {
              jobCard.operations.forEach((op, idx) => {
                op.jobNo = newJobNo;
                op.jobCardId = jobCard.id;
                op.id = `jco-${ts}-${idx}-${randomSalt}`;
              });
            }
            continue;
          }
          console.error('Database createJobCard error:', insertErr);
          throw new Error(`Failed to write Job Card to database: ${insertErr.message}`);
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
            console.error('Database job_card_operations insert error:', opErr);
          }
        }
        insertSuccess = true;
      } catch (err: any) {
        if (attempts >= 5) {
          console.warn('DB createJobCard exception:', err);
          throw err;
        }
      }
    }

    // Update parent order stage to IN_PRODUCTION (Step 5)
    if (jobCard.orderPo) {
      try {
        await this.db.from('customer_orders').update({
          status: 'IN_PRODUCTION',
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
      console.warn('DB startOperation error:', err);
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
      await inventoryService.recordMovement({
        itemCode: result.scrapMovementTriggered.itemCode,
        movementType: 'SCRAP',
        qty: result.scrapMovementTriggered.qty,
        referenceDoc: `${jobNo}-OP${validated.sequenceNo}`,
        actor: operatorName,
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
      console.warn('DB completeOperation fallback:', err);
    }

    // AUTOMATED CHAIN TRIGGER: If all operations complete -> Auto-create QC inspection & advance order
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
        console.warn('Auto QC inspection generation fallback:', qcErr);
      }

      if (result.jobCard.orderPo) {
        try {
          await this.db.from('customer_orders').update({
            status: 'READY_FOR_QC',
            progress_step: 6,
            updated_at: new Date().toISOString()
          }).or(`po_no.eq.${result.jobCard.orderPo},id.eq.${result.jobCard.orderPo}`);
        } catch (_) {}

        notificationsService.broadcastEvent('order_transitioned', {
          orderId: result.jobCard.orderPo,
          poNo: result.jobCard.orderPo,
          status: 'READY_FOR_QC',
          stage: 'READY_FOR_QC',
          progressStep: 6,
          updatedAt: new Date().toISOString()
        });
        notificationsService.broadcastEvent('order_updated', {
          id: result.jobCard.orderPo,
          orderId: result.jobCard.orderPo,
          poNo: result.jobCard.orderPo,
          status: 'READY_FOR_QC',
          stage: 'READY_FOR_QC',
          progressStep: 6,
          updatedAt: new Date().toISOString()
        });
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

    const ncrNumber = `NCR-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`;
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
      console.warn('DB raiseNcr fallback:', err);
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
      await inventoryService.recordMovement({
        itemCode: result.scrapMovementTriggered.itemCode,
        movementType: 'SCRAP',
        qty: result.scrapMovementTriggered.qty,
        referenceDoc: validated.ncrNumber,
        actor: approverName,
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
      console.warn('DB disposeNcr fallback:', err);
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

  async updateJobStatus(jobNo: string, payload: { status: string }) {
    const job = await this.getJobCardByJobNo(jobNo);
    if (job) {
      try {
        await this.db.from('job_cards').update({ status: payload.status, updated_at: new Date().toISOString() }).eq('job_no', jobNo);
      } catch (err) {
        console.error('Database updateJobStatus error:', err);
      }
      notificationsService.broadcastEvent('job_card_updated', { ...job, status: payload.status, jobStatus: payload.status });
    }
    return { jobNo, status: payload.status };
  }
}

export const productionService = new ProductionService();

