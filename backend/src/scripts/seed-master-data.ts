/**
 * Seeds master data from the client workbook
 * (SketchItUp_OwnerOS_Master_Data_and_Discovery_v4.xlsx -> master-data.json):
 * Customers, Vendors, Machines, Items (masters), BOMs and Route Card templates.
 *
 * Usage:  npx tsx backend/src/scripts/seed-master-data.ts
 *
 * Requires the master tables to exist in the database (migrations 001-017,
 * notably 012_master_modules_specification.sql, 008_grn_bom_purchasing.sql and
 * 016_production_job_cards_route_cards.sql). The script pre-flights each table
 * and aborts with instructions if the schema has not been applied yet.
 */
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌ Missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY in environment');
  process.exit(1);
}

const db = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false }
});

type Row = Record<string, any>;
const workbook: Record<string, Row[]> = JSON.parse(
  readFileSync(join(dirname(fileURLToPath(import.meta.url)), 'master-data.json'), 'utf-8')
);

// ---------- shared helpers ----------

const SAMPLE_PREFIX = /^SAMPLE\s*—\s*DELETE BEFORE SUBMISSION\s*—\s*/;
const clean = (v: any) => {
  if (v === null || v === undefined) return '';
  const s = String(v).trim();
  if (/^(N\/A|To Be Confirmed)$/i.test(s)) return '';
  return s;
};
const cleanName = (v: any) => clean(v).replace(SAMPLE_PREFIX, '').trim();
const num = (v: any, fallback = 0) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
};
const excelDate = (v: any): string => {
  if (v === null || v === undefined || v === '') return '';
  if (typeof v === 'string') return v.slice(0, 10);
  if (typeof v === 'number') {
    const d = new Date(Date.UTC(1899, 11, 30) + v * 86400000);
    return d.toISOString().slice(0, 10);
  }
  return '';
};

const UOM_MAP: Record<string, string> = {
  'Nos': 'Nos', 'No.': 'Nos', 'Pcs': 'Nos',
  'Kg': 'Kg', 'KG': 'Kg', 'Kgs': 'Kg',
  'Mtr': 'Meter', 'Meter': 'Meter', 'Meters': 'Meter',
  'Ltr': 'Litre', 'Litre': 'Litre', 'Litres': 'Litre',
  'Set': 'Set', 'Box': 'Box'
};
const uom = (v: any) => UOM_MAP[clean(v)] || 'Nos';

const MACHINE_TYPE_MAP: Record<string, string> = {
  'Cutting': 'Cutting',
  'Welding / Fabrication': 'Welding',
  'Welding': 'Welding',
  'CNC Turning': 'CNC Turning',
  'CNC Machining (VMC/HMC)': 'CNC Machining',
  'CNC Machining': 'CNC Machining',
  'Conventional Machining': 'Conventional Machining',
  'Grinding': 'Grinding',
  'Inspection-CMM': 'Inspection-CMM',
  'Inspection / CMM': 'Inspection-CMM'
};
const machineType = (v: any) => MACHINE_TYPE_MAP[clean(v)] || 'Other';
const machineShift = (v: any) => (clean(v) === 'General / Day' ? 'General-Day' : clean(v) || 'General-Day');

const VENDOR_TYPE_MAP: Record<string, string> = {
  'Supplier': 'Supplier',
  'Transporter': 'Transporter',
  'Subcontractor / Job Worker': 'Subcontractor / Job Worker',
  'Equipment Vendor': 'EquipmentVendor',
  'Manpower Provider': 'ManpowerProvider'
};

const COMPONENT_TYPE_MAP: Record<string, string> = {
  'Raw Material': 'RAW_MATERIAL',
  'Bought-Out': 'HARDWARE',
  'Consumable': 'PACKING',
  'Semi-Finished': 'SUB_ASSEMBLY'
};

const VENDOR_CATEGORY_MAP: Record<string, string> = {
  'Raw Material': 'Raw Material',
  'Components': 'Components',
  'Consumables': 'Consumables',
  'Packaging': 'Packaging',
  'Machinery': 'Machinery',
  'Maintenance': 'Maintenance',
  'Transport / Logistics': 'Transport',
  'Transport': 'Transport',
  'IT / Software': 'IT',
  'IT': 'IT',
  'Professional Services': 'Professional',
  'Professional': 'Professional',
  'Manpower': 'Manpower',
  'Other': 'Other'
};


// ---------- pre-flight ----------

const REQUIRED_TABLES = [
  'customer_masters', 'vendor_masters', 'machine_masters',
  'masters', 'bill_of_materials', 'bom_items', 'route_card_templates'
];

async function preflight(): Promise<boolean> {
  let ok = true;
  for (const t of REQUIRED_TABLES) {
    const { error } = await db.from(t as any).select('id').limit(1);
    if (error) {
      ok = false;
      console.error(`❌ Table "${t}" is missing or inaccessible: ${error.message}`);
    }
  }
  if (!ok) {
    console.error('\n master tables are missing. Apply the schema migrations first:');
    console.error('   - Apply supabase/migrations/001..017 (or supabase/apply_all_migrations.sql in the Supabase SQL Editor), then re-run this script.');
  }
  return ok;
}

// ---------- seeders ----------

async function seedCustomers() {
  const rows = workbook['03_Customer_Master'];
  let n = 0;
  for (const r of rows) {
    const code = clean(r['Customer ID']);
    const name = cleanName(r['Customer Name']);
    if (!code || !name) continue;
    const billing = clean(r['Billing Address']);
    const record = {
      id: `c-${code}`,
      code,
      name,
      legal_name: clean(r['Legal Name']),
      customer_type: clean(r['Customer Type']) || 'OEM',
      contact_person: clean(r['Contact Person']),
      mobile: clean(r['Mobile']),
      email: clean(r['Email']),
      gstin: clean(r['GSTIN']),
      pan: clean(r['PAN']),
      billing_address: billing,
      shipping_address: clean(r['Shipping Address']) || billing,
      city: clean(r['City']),
      state: clean(r['State']),
      state_code: '27',
      pincode: clean(r['Pincode']),
      payment_terms: clean(r['Payment Terms']) || 'Net 30',
      credit_days: num(r['Credit Days'], 0),
      credit_limit: num(r['Credit Limit (₹)'], 0),
      salesperson: clean(r['Salesperson']),
      status: clean(r['Customer Status']) || 'Active',
      notes: clean(r['Notes']),
      updated_at: new Date().toISOString()
    };
    const { error } = await db.from('customer_masters').upsert(record, { onConflict: 'code' });
    if (error) console.error(`  customer ${code}: ${error.message}`);
    else n++;
  }
  console.log(`✅ Customers: ${n}/${rows.length} seeded`);
}

async function seedVendors() {
  const rows = workbook['04_Vendor_Master'];
  let n = 0;
  for (const r of rows) {
    const code = clean(r['Vendor ID']);
    const name = cleanName(r['Vendor Name']);
    if (!code || !name) continue;
    const record = {
      id: `v-${code}`,
      code,
      name,
      legal_name: clean(r['Legal Name']),
      vendor_type: VENDOR_TYPE_MAP[clean(r['Vendor Type'])] || 'Other',
      vendor_category: VENDOR_CATEGORY_MAP[clean(r['Vendor Category'])] || 'Other',
      contact_person: clean(r['Contact Person']),
      mobile: clean(r['Mobile']),
      email: clean(r['Email']),
      billing_address: clean(r['Billing Address']),
      shipping_address: clean(r['Billing Address']),
      city: clean(r['City']),
      state: clean(r['State']),
      state_code: '27',
      pincode: clean(r['Pincode']),
      gstin: clean(r['GSTIN']),
      pan: clean(r['PAN']),
      bank_account_name: clean(r['Bank Account Name']) || name,
      // NOTE: stored plaintext here; the Masters UI writes this encrypted.
      bank_account_number: clean(r['Bank Account Number']),
      ifsc: clean(r['IFSC']),
      payment_terms: clean(r['Payment Terms']) || 'Net 30',
      credit_days: num(r['Credit Days'], 0),
      credit_limit: num(r['Credit Limit (₹)'], 0),
      status: clean(r['Vendor Status']) || 'Active',
      notes: clean(r['Notes']),
      updated_at: new Date().toISOString()
    };
    const { error } = await db.from('vendor_masters').upsert(record, { onConflict: 'code' });
    if (error) console.error(`  vendor ${code}: ${error.message}`);
    else n++;
  }
  console.log(`✅ Vendors: ${n}/${rows.length} seeded`);
}

async function seedMachines() {
  const rows = workbook['07_Machine_Master'];
  let n = 0;
  for (const r of rows) {
    const code = clean(r['Machine ID']);
    const name = cleanName(r['Machine Name']);
    if (!code || !name) continue;
    const status = clean(r['Machine Status']) || 'Active';
    const record = {
      id: `mch-${code}`,
      code,
      name,
      machine_type: machineType(r['Machine Type']),
      type: machineType(r['Machine Type']),
      department: clean(r['Department']),
      location: clean(r['Location']),
      manufacturer: clean(r['Manufacturer']),
      model: clean(r['Model']),
      serial_number: clean(r['Serial Number']),
      installation_date: excelDate(r['Installation Date']),
      capacity: num(r['Capacity'], 0) || null,
      capacity_uom: clean(r['Capacity UOM']),
      operating_hours: num(r['Operating Hours (per day)'], 8),
      shift: machineShift(r['Shift']),
      status,
      responsible_person: clean(r['Operator / Responsible Person']),
      hourly_cost: 500,
      active: status === 'Active',
      updated_at: new Date().toISOString()
    };
    const { error } = await db.from('machine_masters').upsert(record, { onConflict: 'code' });
    if (error) console.error(`  machine ${code}: ${error.message}`);
    else n++;
  }
  console.log(`✅ Machines: ${n}/${rows.length} seeded`);
}

function itemRowToRecord(r: Row) {
  const code = clean(r['Item Code']);
  const name = cleanName(r['Item Name']);
  if (!code || !name) return null;
  const itemType = clean(r['Item Type']);
  const isFg = itemType === 'Finished Good';
  const vendor = clean(r['Preferred Vendor']);
  return {
    id: `m-${code}`,
    code,
    name,
    item_type: itemType,
    category: clean(r['Category']),
    description: clean(r['Description']) || name,
    part_no: name,
    unit: uom(r['UOM']),
    uom: uom(r['UOM']),
    hsn_code: clean(r['HSN']),
    gst_rate: num(r['GST %'], 18),
    standard_cost: num(r['Standard Cost (₹)'], 0),
    selling_price: num(r['Selling Price (₹)'], 0),
    min_stock: num(r['Minimum Stock'], 0),
    max_stock: num(r['Maximum Stock'], 0),
    reorder_level: num(r['Reorder Level'], 10),
    lead_time_days: num(r['Lead Time (Days)'], 0),
    preferred_vendor: vendor,
    default_warehouse: clean(r['Warehouse']) || 'Main Store',
    store_location: clean(r['Warehouse']) || 'Main Store',
    is_finished_goods: isFg,
    sale_rate: num(r['Selling Price (₹)'], 0),
    purchase_rate: num(r['Standard Cost (₹)'], 0),
    status: clean(r['Active Status']) || 'Active',
    updated_at: new Date().toISOString()
  };
}

async function seedItems() {
  const rows = workbook['05_Item_Master'];
  let n = 0;
  for (const r of rows) {
    const record = itemRowToRecord(r);
    if (!record) continue;
    let { error } = await db.from('masters').upsert(record, { onConflict: 'code' });
    // Some schema versions carry only `unit` or only `uom` — retry without the offending column
    if (error && /column .* (unit|uom)/i.test(error.message)) {
      const missing = /'uom'/.test(error.message) ? 'uom' : 'unit';
      const retry: Record<string, any> = { ...record };
      delete retry[missing];
      ({ error } = await db.from('masters').upsert(retry, { onConflict: 'code' }));
    }
    if (error) console.error(`  item ${record.code}: ${error.message}`);
    else n++;
  }
  console.log(`✅ Items: ${n}/${rows.length} seeded`);
}

async function seedBoms(itemByCode: Map<string, Row>, itemByName: Map<string, any>) {
  const rows = workbook['09_BOM_Master'];
  // group component rows by parent item name
  const byParent = new Map<string, Row[]>();
  for (const r of rows) {
    const parent = clean(r['Parent Item (Finished Good)']);
    if (!parent) continue;
    if (!byParent.has(parent)) byParent.set(parent, []);
    byParent.get(parent)!.push(r);
  }
  let n = 0;
  for (const [parentName, comps] of byParent) {
    const parent = itemByName.get(parentName);
    if (!parent) {
      console.error(`  BOM skipped: parent item "${parentName}" not found in Item Master`);
      continue;
    }
    const bomId = `bom-${parent.code}`;
    const bomCode = `BOM-${parent.code}`;
    const bomRecord = {
      id: bomId,
      bom_code: bomCode,
      parent_part_code: parent.code,
      parent_part_name: parentName,
      revision: 'v1.0',
      yield_percentage: 98.5,
      batch_size: 100,
      status: 'ACTIVE',
      updated_at: new Date().toISOString()
    };
    const { error } = await db.from('bill_of_materials').upsert(bomRecord, { onConflict: 'bom_code' });
    if (error) {
      console.error(`  BOM ${bomCode}: ${error.message}`);
      continue;
    }
    // BOM items are versioned via full replace (delete + insert)
    await db.from('bom_items').delete().eq('bom_id', bomId);
    const itemRows = comps.map((c, idx) => {
      const comp = itemByName.get(clean(c['Component Item (Raw Material / Consumable)'])) || { code: clean(c['Component Item (Raw Material / Consumable)']), standard_cost: 0 };
      return {
        id: `bi-${parent.code}-${String(idx + 1).padStart(3, '0')}`,
        bom_id: bomId,
        component_code: comp.code,
        component_name: clean(c['Component Item (Raw Material / Consumable)']),
        component_type: COMPONENT_TYPE_MAP[clean(c['Component Type'])] || 'RAW_MATERIAL',
        qty_per_unit: num(c['Quantity per Unit'], 1),
        unit: uom(c['UOM']).toUpperCase(),
        scrap_allowance_pct: num(c['Scrap / Wastage %'], 0),
        stage: (clean(c['Operation / Stage']) || 'ASSEMBLY').toUpperCase().replace(/[^A-Z0-9]+/g, '_'),
        unit_cost: Number(comp.standard_cost ?? 0)
      };
    }).filter(ir => ir.component_code);
    const { error: itemErr } = await db.from('bom_items').insert(itemRows);
    if (itemErr) console.error(`  BOM ${bomCode} items: ${itemErr.message}`);
    else n++;
  }
  console.log(`✅ BOMs: ${n}/${byParent.size} seeded (${rows.length} component rows)`);
}

async function seedRouteCards(itemByName: Map<string, any>) {
  const rows = workbook['10_Route_Card_Master'];
  let n = 0;
  for (const r of rows) {
    const fgName = clean(r['Finished Good Item']);
    const item = itemByName.get(fgName);
    if (!item) {
      console.error(`  Route card skipped: item "${fgName}" not found in Item Master`);
      continue;
    }
    const seq = num(r['Operation Sequence'], 0);
    const record = {
      id: `rc-${item.code}-${seq}`,
      part_code: item.code,
      part_description: fgName,
      sequence_no: seq,
      operation_name: clean(r['Operation Name']),
      work_center: clean(r['Machine / Work Center *']) || clean(r['Machine / Work Center']) || 'ASSEMBLY',
      standard_time_minutes: num(r['Standard Time (Minutes)'], 30),
      inspection_required: /^yes$/i.test(clean(r['Inspection Required'])),
      required_certification: 'None',
      updated_at: new Date().toISOString()
    };
    if (!record.operation_name || !record.work_center || !seq) {
      console.error(`  Route card skipped (missing fields): ${fgName} seq ${seq}`);
      continue;
    }
    const { error } = await db.from('route_card_templates').upsert(record, { onConflict: 'part_code,sequence_no' });
    if (error) console.error(`  route ${record.id}: ${error.message}`);
    else n++;
  }
  console.log(`✅ Route Cards: ${n}/${rows.length} seeded`);
}

// ---------- main ----------

(async () => {
  console.log('🌱 Seeding Owner OS master data from SketchItUp workbook v4...\n');
  if (!(await preflight())) process.exit(1);

  await seedCustomers();
  await seedVendors();
  await seedMachines();
  await seedItems();

  // name -> seeded item record index (for BOM / route card linkage)
  const { data: items } = await db.from('masters').select('code,name,standard_cost').order('code');
  const itemByName = new Map<string, any>((items || []).map(i => [String(i.name).replace(SAMPLE_PREFIX, '').trim(), i]));
  const itemByCode = new Map<string, Row>((items || []).map(i => [i.code, i as Row]));

  await seedBoms(itemByCode, itemByName);
  await seedRouteCards(itemByName);

  console.log('\n🎉 Master data seeding complete.');
  process.exit(0);
})();
