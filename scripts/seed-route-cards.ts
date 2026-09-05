import dotenv from 'dotenv';
dotenv.config();
import { createClient } from '@supabase/supabase-js';

const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';
const db = createClient(url, key);

interface RouteCardOp {
  sequence_no: number;
  operation_name: string;
  work_center: string;
  standard_time_minutes: number;
  inspection_required: boolean;
  required_certification: string;
}

interface RouteCardDef {
  part_code: string;
  part_description: string;
  operations: RouteCardOp[];
}

const routeCardsData: RouteCardDef[] = [
  {
    part_code: 'FG-0001',
    part_description: 'Heavy Duty Mounting Bracket',
    operations: [
      { sequence_no: 10, operation_name: 'Raw Material Plate Cutting', work_center: 'Hydraulic Plate Cutting Machine 01', standard_time_minutes: 15, inspection_required: false, required_certification: 'Operator L1' },
      { sequence_no: 20, operation_name: 'CNC Drilling & Hole Making', work_center: 'CNC Vertical Machining Center 01', standard_time_minutes: 25, inspection_required: false, required_certification: 'CNC Certified' },
      { sequence_no: 30, operation_name: 'Deburring & Edge Finishing', work_center: 'CNC Vertical Machining Center 01', standard_time_minutes: 10, inspection_required: false, required_certification: 'Operator L2' },
      { sequence_no: 40, operation_name: 'Welding & Fabrication', work_center: 'MIG Welding Station 01', standard_time_minutes: 35, inspection_required: false, required_certification: 'Welding Certified' },
      { sequence_no: 50, operation_name: 'Surface Finishing', work_center: 'Surface Finishing Booth 01', standard_time_minutes: 20, inspection_required: false, required_certification: 'Finishing Operator' },
      { sequence_no: 60, operation_name: 'Dimensional Inspection', work_center: 'QC Station', standard_time_minutes: 15, inspection_required: true, required_certification: 'Quality Inspector' },
      { sequence_no: 70, operation_name: 'Final Inspection & Packing', work_center: 'QC Station', standard_time_minutes: 10, inspection_required: true, required_certification: 'Quality Inspector' }
    ]
  },
  {
    part_code: 'FG-0002',
    part_description: 'Precision Drive Shaft',
    operations: [
      { sequence_no: 10, operation_name: 'Raw Material Cutting', work_center: 'Hydraulic Plate Cutting Machine 01', standard_time_minutes: 10, inspection_required: false, required_certification: 'Operator L1' },
      { sequence_no: 20, operation_name: 'CNC Turning (OD/Facing)', work_center: 'CNC Turning Center 01', standard_time_minutes: 30, inspection_required: false, required_certification: 'CNC Certified' },
      { sequence_no: 30, operation_name: 'CNC Turning (Grooving/Profiling)', work_center: 'CNC Turning Center 01', standard_time_minutes: 25, inspection_required: false, required_certification: 'CNC Certified' },
      { sequence_no: 40, operation_name: 'Keyway Machining', work_center: 'CNC Vertical Machining Center 01', standard_time_minutes: 20, inspection_required: false, required_certification: 'CNC Certified' },
      { sequence_no: 50, operation_name: 'Grinding & Surface Finishing', work_center: 'CNC Turning Center 01', standard_time_minutes: 20, inspection_required: false, required_certification: 'Grinding Operator' },
      { sequence_no: 60, operation_name: 'Final Dimensional Inspection', work_center: 'QC Station', standard_time_minutes: 15, inspection_required: true, required_certification: 'Quality Inspector' }
    ]
  },
  {
    part_code: 'FG-0003',
    part_description: 'Industrial Machine Support Frame',
    operations: [
      { sequence_no: 10, operation_name: 'Square Tube Cutting', work_center: 'Hydraulic Plate Cutting Machine 01', standard_time_minutes: 20, inspection_required: false, required_certification: 'Operator L1' },
      { sequence_no: 20, operation_name: 'Component Preparation & Deburring', work_center: 'Hydraulic Plate Cutting Machine 01', standard_time_minutes: 15, inspection_required: false, required_certification: 'Operator L2' },
      { sequence_no: 30, operation_name: 'Frame Fabrication & Alignment', work_center: 'MIG Welding Station 01', standard_time_minutes: 35, inspection_required: false, required_certification: 'Fabrication Certified' },
      { sequence_no: 40, operation_name: 'Structural Welding', work_center: 'MIG Welding Station 01', standard_time_minutes: 45, inspection_required: true, required_certification: 'Welding Certified' },
      { sequence_no: 50, operation_name: 'Surface Finishing', work_center: 'Surface Finishing Booth 01', standard_time_minutes: 30, inspection_required: false, required_certification: 'Finishing Operator' },
      { sequence_no: 60, operation_name: 'Final Dimensional Inspection', work_center: 'QC Station', standard_time_minutes: 20, inspection_required: true, required_certification: 'Quality Inspector' }
    ]
  },
  {
    part_code: 'FG-0004',
    part_description: 'Aluminium Control Panel Enclosure',
    operations: [
      { sequence_no: 10, operation_name: 'Aluminium Sheet Cutting', work_center: 'Hydraulic Plate Cutting Machine 01', standard_time_minutes: 15, inspection_required: false, required_certification: 'Operator L1' },
      { sequence_no: 20, operation_name: 'CNC Panel Drilling', work_center: 'CNC Vertical Machining Center 01', standard_time_minutes: 25, inspection_required: false, required_certification: 'CNC Certified' },
      { sequence_no: 30, operation_name: 'Mounting Hole & Cutout Machining', work_center: 'CNC Vertical Machining Center 01', standard_time_minutes: 20, inspection_required: true, required_certification: 'CNC Certified' },
      { sequence_no: 40, operation_name: 'Enclosure Forming & Assembly', work_center: 'Fabrication Station', standard_time_minutes: 30, inspection_required: false, required_certification: 'Fabrication Operator' },
      { sequence_no: 50, operation_name: 'Surface Finishing', work_center: 'Surface Finishing Booth 01', standard_time_minutes: 25, inspection_required: false, required_certification: 'Finishing Operator' },
      { sequence_no: 60, operation_name: 'Dimensional & Fitment Inspection', work_center: 'QC Station', standard_time_minutes: 15, inspection_required: true, required_certification: 'Quality Inspector' },
      { sequence_no: 70, operation_name: 'Final Inspection & Packing', work_center: 'QC Station', standard_time_minutes: 10, inspection_required: true, required_certification: 'Quality Inspector' }
    ]
  },
  {
    part_code: 'FG-0005',
    part_description: 'Stainless Steel Coupling Assembly',
    operations: [
      { sequence_no: 10, operation_name: 'Stainless Steel Bar Cutting', work_center: 'Hydraulic Plate Cutting Machine 01', standard_time_minutes: 10, inspection_required: false, required_certification: 'Operator L1' },
      { sequence_no: 20, operation_name: 'CNC Turning (OD/Facing)', work_center: 'CNC Turning Center 01', standard_time_minutes: 25, inspection_required: false, required_certification: 'CNC Certified' },
      { sequence_no: 30, operation_name: 'Bore & Profile Machining', work_center: 'CNC Turning Center 01', standard_time_minutes: 30, inspection_required: false, required_certification: 'CNC Certified' },
      { sequence_no: 40, operation_name: 'Keyway / Slot Machining', work_center: 'CNC Vertical Machining Center 01', standard_time_minutes: 20, inspection_required: false, required_certification: 'CNC Certified' },
      { sequence_no: 50, operation_name: 'Surface Finishing & Deburring', work_center: 'Surface Finishing Booth 01', standard_time_minutes: 15, inspection_required: false, required_certification: 'Finishing Operator' },
      { sequence_no: 60, operation_name: 'Final Dimensional Inspection', work_center: 'QC Station', standard_time_minutes: 15, inspection_required: true, required_certification: 'Quality Inspector' }
    ]
  }
];

async function main() {
  console.log('🔍 Step 1: Verifying Finished Goods in masters table...');
  const { data: masters, error: mErr } = await db.from('masters').select('code, name, is_finished_goods, status');
  if (mErr) throw mErr;

  const masterCodes = new Map(masters.map(m => [m.code, m.name]));
  for (const rc of routeCardsData) {
    if (!masterCodes.has(rc.part_code)) {
      throw new Error(`CRITICAL: Referenced Finished Good '${rc.part_code}' does not exist in masters table!`);
    }
    console.log(`  ✓ ${rc.part_code}: "${masterCodes.get(rc.part_code)}" verified in masters.`);
  }

  console.log('\n🔍 Step 2: Verifying Machine Master entries...');
  const { data: machines, error: mchErr } = await db.from('machine_masters').select('code, name, machine_type, location');
  if (mchErr) throw mchErr;

  const machineNames = new Set(machines.map(m => m.name));
  console.log('Available machines in machine_masters:');
  for (const m of machines) {
    console.log(`  - [${m.code}] ${m.name} (${m.machine_type})`);
  }

  const allWorkCenters = new Set<string>();
  for (const rc of routeCardsData) {
    for (const op of rc.operations) {
      allWorkCenters.add(op.work_center);
    }
  }

  console.log('\nWork center verification:');
  for (const wc of allWorkCenters) {
    if (machineNames.has(wc)) {
      console.log(`  ✓ "${wc}" matches Machine Master.`);
    } else {
      console.log(`  ℹ️ "${wc}" is a manual station / inspection work center (not an automated machine in machine_masters).`);
    }
  }

  console.log('\n🔍 Step 3: Checking for existing/conflicting Route Cards in route_card_templates...');
  const targetCodes = routeCardsData.map(r => r.part_code);
  const { data: existingRCs, error: rcErr } = await db
    .from('route_card_templates')
    .select('part_code, sequence_no, operation_name')
    .in('part_code', targetCodes);

  if (rcErr) throw rcErr;

  if (existingRCs && existingRCs.length > 0) {
    console.warn('⚠️ Found conflicting Route Card records already in DB:');
    console.table(existingRCs);
    throw new Error('Aborting: Conflicting route card records exist in DB. Overwriting is forbidden.');
  }
  console.log('  ✓ No conflicts found. 0 existing route cards for target FGs.');

  console.log('\n🚀 Step 4: Inserting 5 Route Cards into route_card_templates...');
  const rowsToInsert = [];
  const now = new Date().toISOString();

  for (const rc of routeCardsData) {
    const partDesc = masterCodes.get(rc.part_code) || rc.part_description;
    for (const op of rc.operations) {
      rowsToInsert.push({
        id: `rc-${rc.part_code}-${op.sequence_no}`,
        part_code: rc.part_code,
        part_description: partDesc,
        sequence_no: op.sequence_no,
        operation_name: op.operation_name,
        work_center: op.work_center,
        standard_time_minutes: op.standard_time_minutes,
        inspection_required: op.inspection_required,
        required_certification: op.required_certification,
        created_at: now,
        updated_at: now
      });
    }
  }

  console.log(`Total operations across 5 route cards to insert: ${rowsToInsert.length}`);
  const { data: inserted, error: insErr } = await db
    .from('route_card_templates')
    .insert(rowsToInsert)
    .select();

  if (insErr) {
    console.error('❌ Insert failed:', insErr);
    throw insErr;
  }

  console.log(`✅ Successfully inserted ${inserted?.length} route card operation steps!`);

  // Record audit log entry
  try {
    await db.from('audit_logs').insert([
      {
        actor_email: 'engineering@guruom.in',
        actor_role: 'Manufacturing Engineer',
        action: 'ROUTE_CARDS_BATCH_CREATED',
        entity_type: 'route_card_templates',
        entity_id: 'FG-0001..FG-0005',
        after_state: { routeCardsCount: 5, totalOperations: rowsToInsert.length },
        metadata: { details: 'Inserted 5 Route Card templates for FG-0001 through FG-0005' }
      }
    ]);
  } catch (e) {}

  console.log('\n--- Final Verification from Supabase Database ---');
  const { data: finalRecords, error: finalErr } = await db
    .from('route_card_templates')
    .select('id, part_code, part_description, sequence_no, operation_name, work_center, standard_time_minutes, inspection_required, required_certification')
    .in('part_code', targetCodes)
    .order('part_code', { ascending: true })
    .order('sequence_no', { ascending: true });

  if (finalErr) throw finalErr;

  console.table(finalRecords.map(r => ({
    part: r.part_code,
    seq: r.sequence_no,
    op: r.operation_name,
    wc: r.work_center,
    stdTime: `${r.standard_time_minutes}m`,
    qc: r.inspection_required ? 'YES' : 'NO',
    cert: r.required_certification
  })));
}

main().catch(err => {
  console.error('Fatal error during route card insertion:', err);
  process.exit(1);
});
