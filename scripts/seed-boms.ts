import dotenv from 'dotenv';
dotenv.config();
import { createClient } from '@supabase/supabase-js';
import { bomService } from '../backend/src/modules/bom/bom.service';

const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';
const db = createClient(url, key);

const allowedRawMaterialCodes = new Set([
  'RM-0001',
  'RM-0002',
  'RM-0003',
  'RM-0004',
  'RM-0005'
]);

const bomsToInsert = [
  {
    bomCode: 'BOM-FG0001-A',
    parentPartCode: 'FG-0001',
    parentPartName: 'Heavy Duty Mounting Bracket',
    revision: 'v1.0',
    batchSize: 100,
    yieldPercentage: 98.5,
    status: 'ACTIVE',
    notes: 'Engineering Formula: Heavy Duty Mounting Bracket fabrication. Standard blanking from 2.50 KG MS Steel Plate 5mm with 0.20 KG Aluminium Plate 6mm wear/mounting shims. Yield: 98.5%.',
    components: [
      {
        componentCode: 'RM-0001',
        componentName: 'MS Steel Plate 5mm',
        componentType: 'RAW_MATERIAL',
        qtyPerUnit: 2.50,
        unit: 'KG',
        scrapAllowancePct: 1.5,
        stage: 'CUTTING',
        unitCost: 65
      },
      {
        componentCode: 'RM-0004',
        componentName: 'Aluminium Plate 6mm',
        componentType: 'RAW_MATERIAL',
        qtyPerUnit: 0.20,
        unit: 'KG',
        scrapAllowancePct: 1.5,
        stage: 'CUTTING',
        unitCost: 280
      }
    ]
  },
  {
    bomCode: 'BOM-FG0002-A',
    parentPartCode: 'FG-0002',
    parentPartName: 'Precision Drive Shaft',
    revision: 'v1.0',
    batchSize: 100,
    yieldPercentage: 97.5,
    status: 'ACTIVE',
    notes: 'Engineering Formula: Precision Drive Shaft manufacturing. Multi-pass CNC turning, profile grooving, and keyway milling from 3.00 KG EN8 Round Bar 40mm billet. Yield: 97.5%.',
    components: [
      {
        componentCode: 'RM-0002',
        componentName: 'EN8 Round Bar 40mm',
        componentType: 'RAW_MATERIAL',
        qtyPerUnit: 3.00,
        unit: 'KG',
        scrapAllowancePct: 2.5,
        stage: 'CNC_MACHINING',
        unitCost: 75
      }
    ]
  },
  {
    bomCode: 'BOM-FG0003-A',
    parentPartCode: 'FG-0003',
    parentPartName: 'Industrial Machine Support Frame',
    revision: 'v1.0',
    batchSize: 100,
    yieldPercentage: 98.0,
    status: 'ACTIVE',
    notes: 'Engineering Formula: Industrial Machine Support Frame structural fabrication. Frame grid cut from 8.00 M MS Square Tube 40x40x3mm with 1.50 KG MS Steel Plate 5mm base pads and corner gussets. Yield: 98.0%.',
    components: [
      {
        componentCode: 'RM-0003',
        componentName: 'MS Square Tube 40x40x3mm',
        componentType: 'RAW_MATERIAL',
        qtyPerUnit: 8.00,
        unit: 'M',
        scrapAllowancePct: 2.0,
        stage: 'FABRICATION',
        unitCost: 220
      },
      {
        componentCode: 'RM-0001',
        componentName: 'MS Steel Plate 5mm',
        componentType: 'RAW_MATERIAL',
        qtyPerUnit: 1.50,
        unit: 'KG',
        scrapAllowancePct: 2.0,
        stage: 'CUTTING',
        unitCost: 65
      }
    ]
  },
  {
    bomCode: 'BOM-FG0004-A',
    parentPartCode: 'FG-0004',
    parentPartName: 'Aluminium Control Panel Enclosure',
    revision: 'v1.0',
    batchSize: 100,
    yieldPercentage: 98.5,
    status: 'ACTIVE',
    notes: 'Engineering Formula: Aluminium Control Panel Enclosure assembly. Chassis and door formed from 2.50 KG Aluminium Plate 6mm, internal mounting brackets from 0.50 KG MS Steel Plate 5mm, and 0.15 KG Stainless Steel Round Bar 25mm hinge/lock hardware. Yield: 98.5%.',
    components: [
      {
        componentCode: 'RM-0004',
        componentName: 'Aluminium Plate 6mm',
        componentType: 'RAW_MATERIAL',
        qtyPerUnit: 2.50,
        unit: 'KG',
        scrapAllowancePct: 1.5,
        stage: 'CNC_MACHINING',
        unitCost: 280
      },
      {
        componentCode: 'RM-0001',
        componentName: 'MS Steel Plate 5mm',
        componentType: 'RAW_MATERIAL',
        qtyPerUnit: 0.50,
        unit: 'KG',
        scrapAllowancePct: 1.5,
        stage: 'CUTTING',
        unitCost: 65
      },
      {
        componentCode: 'RM-0005',
        componentName: 'Stainless Steel Round Bar 25mm',
        componentType: 'RAW_MATERIAL',
        qtyPerUnit: 0.15,
        unit: 'KG',
        scrapAllowancePct: 1.5,
        stage: 'CNC_MACHINING',
        unitCost: 320
      }
    ]
  },
  {
    bomCode: 'BOM-FG0005-A',
    parentPartCode: 'FG-0005',
    parentPartName: 'Stainless Steel Coupling Assembly',
    revision: 'v1.0',
    batchSize: 100,
    yieldPercentage: 97.0,
    status: 'ACTIVE',
    notes: 'Engineering Formula: Stainless Steel Coupling Assembly. Twin coupling hubs machined from 2.00 KG Stainless Steel Round Bar 25mm with 0.50 KG EN8 Round Bar 40mm inner torque sleeve. Yield: 97.0%.',
    components: [
      {
        componentCode: 'RM-0005',
        componentName: 'Stainless Steel Round Bar 25mm',
        componentType: 'RAW_MATERIAL',
        qtyPerUnit: 2.00,
        unit: 'KG',
        scrapAllowancePct: 3.0,
        stage: 'CNC_MACHINING',
        unitCost: 320
      },
      {
        componentCode: 'RM-0002',
        componentName: 'EN8 Round Bar 40mm',
        componentType: 'RAW_MATERIAL',
        qtyPerUnit: 0.50,
        unit: 'KG',
        scrapAllowancePct: 3.0,
        stage: 'CNC_MACHINING',
        unitCost: 75
      }
    ]
  }
];

async function main() {
  console.log('🔍 Step 1: Pre-validation of Item Master references...');
  const { data: masters, error: mErr } = await db
    .from('masters')
    .select('code, name, is_finished_goods, status');

  if (mErr) throw mErr;
  const masterMap = new Map(masters.map(m => [m.code, m]));

  for (const b of bomsToInsert) {
    const parent = masterMap.get(b.parentPartCode);
    if (!parent) {
      throw new Error(`CRITICAL: Parent Part '${b.parentPartCode}' not found in masters table.`);
    }
    if (!parent.is_finished_goods) {
      throw new Error(`CRITICAL: Parent Part '${b.parentPartCode}' is not a Finished Good.`);
    }
    console.log(`  ✓ Parent FG verified: [${b.parentPartCode}] ${parent.name}`);

    for (const c of b.components) {
      if (!allowedRawMaterialCodes.has(c.componentCode)) {
        throw new Error(`CRITICAL: Component SKU '${c.componentCode}' is not in the allowed RM list!`);
      }
      const comp = masterMap.get(c.componentCode);
      if (!comp) {
        throw new Error(`CRITICAL: Component SKU '${c.componentCode}' not found in masters table.`);
      }
      console.log(`    ↳ Component SKU verified: [${c.componentCode}] ${comp.name}`);
    }
  }

  console.log('\n🔍 Step 2: Checking for duplicate or conflicting BOM codes in Supabase...');
  const targetBomCodes = bomsToInsert.map(b => b.bomCode);
  const { data: existingBOMs, error: ebErr } = await db
    .from('bill_of_materials')
    .select('bom_code, parent_part_code')
    .in('bom_code', targetBomCodes);

  if (ebErr) throw ebErr;

  if (existingBOMs && existingBOMs.length > 0) {
    console.warn('⚠️ Found conflicting BOM codes already in DB:');
    console.table(existingBOMs);
    throw new Error('Aborting: Duplicate/conflicting BOM codes found. Overwriting is forbidden.');
  }
  console.log('  ✓ No conflicting BOM codes found in DB.');

  console.log('\n🚀 Step 3: Inserting 5 BOMs and Components into Supabase...');
  for (const b of bomsToInsert) {
    console.log(`Creating BOM: ${b.bomCode} for ${b.parentPartCode}...`);
    const created = await bomService.createOrUpdateBOM(b as any, 'engineering@guruom.in', 'Manufacturing Engineer');
    console.log(`✅ Created BOM [${created.bomCode}] with ${created.components.length} components.`);
  }

  console.log('\n🔍 Step 4: Comprehensive Final Validation...');
  const { data: finalBoms, error: fbErr } = await db
    .from('bill_of_materials')
    .select('*')
    .in('bom_code', targetBomCodes)
    .order('bom_code');

  if (fbErr) throw fbErr;
  console.log(`Total BOMs verified in bill_of_materials: ${finalBoms?.length}`);

  const { data: finalItems, error: fiErr } = await db
    .from('bom_items')
    .select('*')
    .in('bom_id', (finalBoms || []).map(b => b.id))
    .order('component_code');

  if (fiErr) throw fiErr;
  console.log(`Total Component lines verified in bom_items: ${finalItems?.length}`);

  // Verification checks:
  let allValid = true;
  if (finalBoms?.length !== 5) {
    console.error('❌ BOM count mismatch: expected 5, got', finalBoms?.length);
    allValid = false;
  }

  for (const b of finalBoms || []) {
    if (!masterMap.has(b.parent_part_code)) {
      console.error(`❌ Parent part code ${b.parent_part_code} not in masters!`);
      allValid = false;
    }
  }

  for (const item of finalItems || []) {
    if (!allowedRawMaterialCodes.has(item.component_code)) {
      console.error(`❌ Invalid component SKU ${item.component_code} found!`);
      allValid = false;
    }
    if (!masterMap.has(item.component_code)) {
      console.error(`❌ Component SKU ${item.component_code} not in masters!`);
      allValid = false;
    }
  }

  if (allValid) {
    console.log('🌟 ALL VALIDATION GATES PASSED 100%!');
  } else {
    throw new Error('Validation failed!');
  }

  // Generate output table
  const summaryTable = (finalBoms || []).map(b => {
    const comps = (finalItems || []).filter(i => i.bom_id === b.id);
    return {
      'BOM Code': b.bom_code,
      'Parent FG': `${b.parent_part_code} (${b.parent_part_name})`,
      'Component SKU(s)': comps.map(c => `${c.component_code} (${c.qty_per_unit} ${c.unit})`).join(', '),
      'Component Count': comps.length,
      'Yield': `${b.yield_percentage}%`,
      'Validation Status': 'PASSED (Linked to Masters)'
    };
  });

  console.table(summaryTable);
}

main().catch(err => {
  console.error('Fatal error during BOM seed:', err);
  process.exit(1);
});
