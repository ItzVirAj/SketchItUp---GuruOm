import dotenv from 'dotenv';
dotenv.config();
import { createClient } from '@supabase/supabase-js';

const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';
const db = createClient(url, key);

async function main() {
  console.log('🚀 Step 1: Purging all old inventory & materials in Supabase...');

  // Delete from child tables first if any
  await db.from('bom_items').delete().neq('id', 'keep-nothing');
  await db.from('finished_goods').delete().neq('id', 'keep-nothing');
  await db.from('stock_items').delete().neq('id', 'keep-nothing');
  await db.from('masters').delete().neq('id', 'keep-nothing');

  // Reset sequence counters for RM and FG
  await db.from('master_code_counters').upsert([
    {
      entity_type: 'ITEM',
      prefix: 'RM',
      current_value: 5,
      padding_digits: 4,
      updated_at: new Date().toISOString()
    },
    {
      entity_type: 'ITEM',
      prefix: 'FG',
      current_value: 5,
      padding_digits: 4,
      updated_at: new Date().toISOString()
    }
  ]);

  console.log('✅ Old materials and stock entries purged.');

  console.log('\n🚀 Step 2: Inserting 5 Raw Materials & 5 Finished Goods...');

  const rawMaterials = [
    {
      code: 'RM-0001',
      name: 'MS Steel Plate 5mm',
      item_type: 'Raw Material',
      category: 'Raw Material',
      uom: 'Kg',
      unit: 'Kg',
      stock_unit: 'KG',
      hsn_code: '7208',
      standard_cost: 65,
      selling_price: 0,
      reorder_level: 50,
      min_stock: 50,
      max_stock: 500,
      preferred_vendor: 'Maharashtra Steel & Metals',
      default_warehouse: 'Main Raw Material Store',
      store_location: 'RM-RACK-01',
      initial_on_hand: 250
    },
    {
      code: 'RM-0002',
      name: 'EN8 Round Bar 40mm',
      item_type: 'Raw Material',
      category: 'Raw Material',
      uom: 'Kg',
      unit: 'Kg',
      stock_unit: 'KG',
      hsn_code: '7228',
      standard_cost: 75,
      selling_price: 0,
      reorder_level: 40,
      min_stock: 40,
      max_stock: 400,
      preferred_vendor: 'Maharashtra Steel & Metals',
      default_warehouse: 'Main Raw Material Store',
      store_location: 'RM-RACK-02',
      initial_on_hand: 180
    },
    {
      code: 'RM-0003',
      name: 'MS Square Tube 40x40x3mm',
      item_type: 'Raw Material',
      category: 'Raw Material',
      uom: 'Meter',
      unit: 'Meter',
      stock_unit: 'M',
      hsn_code: '7306',
      standard_cost: 220,
      selling_price: 0,
      reorder_level: 30,
      min_stock: 30,
      max_stock: 300,
      preferred_vendor: 'Maharashtra Steel & Metals',
      default_warehouse: 'Main Raw Material Store',
      store_location: 'RM-RACK-03',
      initial_on_hand: 120
    },
    {
      code: 'RM-0004',
      name: 'Aluminium Plate 6mm',
      item_type: 'Raw Material',
      category: 'Raw Material',
      uom: 'Kg',
      unit: 'Kg',
      stock_unit: 'KG',
      hsn_code: '7606',
      standard_cost: 280,
      selling_price: 0,
      reorder_level: 25,
      min_stock: 25,
      max_stock: 250,
      preferred_vendor: 'Maharashtra Steel & Metals',
      default_warehouse: 'Main Raw Material Store',
      store_location: 'RM-RACK-04',
      initial_on_hand: 100
    },
    {
      code: 'RM-0005',
      name: 'Stainless Steel Round Bar 25mm',
      item_type: 'Raw Material',
      category: 'Raw Material',
      uom: 'Kg',
      unit: 'Kg',
      stock_unit: 'KG',
      hsn_code: '7222',
      standard_cost: 320,
      selling_price: 0,
      reorder_level: 20,
      min_stock: 20,
      max_stock: 200,
      preferred_vendor: 'Maharashtra Steel & Metals',
      default_warehouse: 'Main Raw Material Store',
      store_location: 'RM-RACK-05',
      initial_on_hand: 90
    }
  ];

  const finishedGoods = [
    {
      code: 'FG-0001',
      name: 'Heavy Duty Mounting Bracket',
      item_type: 'Finished Good',
      category: 'Finished Goods',
      uom: 'Nos',
      unit: 'Nos',
      stock_unit: 'NOS',
      hsn_code: '8431',
      standard_cost: 950,
      selling_price: 1450,
      reorder_level: 15,
      min_stock: 15,
      max_stock: 100,
      preferred_vendor: '',
      default_warehouse: 'Finished Goods Store',
      store_location: 'FG-BAY-01',
      initial_on_hand: 35
    },
    {
      code: 'FG-0002',
      name: 'Precision Drive Shaft',
      item_type: 'Finished Good',
      category: 'Finished Goods',
      uom: 'Nos',
      unit: 'Nos',
      stock_unit: 'NOS',
      hsn_code: '8483',
      standard_cost: 2100,
      selling_price: 3200,
      reorder_level: 10,
      min_stock: 10,
      max_stock: 80,
      preferred_vendor: '',
      default_warehouse: 'Finished Goods Store',
      store_location: 'FG-BAY-02',
      initial_on_hand: 25
    },
    {
      code: 'FG-0003',
      name: 'Industrial Machine Support Frame',
      item_type: 'Finished Good',
      category: 'Finished Goods',
      uom: 'Nos',
      unit: 'Nos',
      stock_unit: 'NOS',
      hsn_code: '8431',
      standard_cost: 5800,
      selling_price: 8500,
      reorder_level: 5,
      min_stock: 5,
      max_stock: 40,
      preferred_vendor: '',
      default_warehouse: 'Finished Goods Store',
      store_location: 'FG-BAY-03',
      initial_on_hand: 12
    },
    {
      code: 'FG-0004',
      name: 'Aluminium Control Panel Enclosure',
      item_type: 'Finished Good',
      category: 'Finished Goods',
      uom: 'Nos',
      unit: 'Nos',
      stock_unit: 'NOS',
      hsn_code: '8537',
      standard_cost: 3100,
      selling_price: 4800,
      reorder_level: 10,
      min_stock: 10,
      max_stock: 60,
      preferred_vendor: '',
      default_warehouse: 'Finished Goods Store',
      store_location: 'FG-BAY-04',
      initial_on_hand: 18
    },
    {
      code: 'FG-0005',
      name: 'Stainless Steel Coupling Assembly',
      item_type: 'Finished Good',
      category: 'Finished Goods',
      uom: 'Nos',
      unit: 'Nos',
      stock_unit: 'NOS',
      hsn_code: '8483',
      standard_cost: 1750,
      selling_price: 2600,
      reorder_level: 15,
      min_stock: 15,
      max_stock: 100,
      preferred_vendor: '',
      default_warehouse: 'Finished Goods Store',
      store_location: 'FG-BAY-05',
      initial_on_hand: 40
    }
  ];

  const allItems = [...rawMaterials, ...finishedGoods];

  for (const item of allItems) {
    const isFG = item.item_type === 'Finished Good';
    const masterRecord = {
      id: `m-${item.code}`,
      code: item.code,
      name: item.name,
      item_type: item.item_type,
      category: item.category,
      description: item.name,
      part_no: item.code,
      uom: item.uom,
      unit: item.unit,
      hsn_code: item.hsn_code,
      gst_rate: 18,
      standard_cost: item.standard_cost,
      selling_price: item.selling_price,
      purchase_rate: item.standard_cost,
      sale_rate: item.selling_price,
      min_stock: item.min_stock,
      max_stock: item.max_stock,
      reorder_level: item.reorder_level,
      lead_time_days: 7,
      preferred_vendor: item.preferred_vendor,
      default_warehouse: item.default_warehouse,
      store_location: item.store_location,
      is_finished_goods: isFG,
      status: 'Active',
      updated_at: new Date().toISOString()
    };

    const { error: masterErr } = await db.from('masters').insert(masterRecord);
    if (masterErr) {
      console.error(`❌ Failed to insert master ${item.code}:`, masterErr);
      throw masterErr;
    }
    console.log(`✅ Master inserted: [${item.code}] ${item.name} (${item.uom})`);

    // Create corresponding stock_items entry for inventory tracking
    const stockRecord = {
      id: `stk-${item.code}`,
      code: item.code,
      description: item.name,
      on_hand: item.initial_on_hand,
      reserved: 0,
      available: item.initial_on_hand,
      demand: 0,
      reorder_level: item.reorder_level,
      shortage: 0,
      unit: item.stock_unit,
      status: 'OK',
      updated_at: new Date().toISOString()
    };

    const { error: stockErr } = await db.from('stock_items').insert(stockRecord);
    if (stockErr) {
      console.error(`❌ Failed to insert stock_item ${item.code}:`, stockErr);
      throw stockErr;
    }
    console.log(`   📦 Stock initialized: ${item.initial_on_hand} ${item.stock_unit}`);
  }

  // Create audit log entry
  try {
    await db.from('audit_logs').insert([
      {
        actor_email: 'owner@guruom.in',
        actor_role: 'Owner',
        action: 'INVENTORY_PURGE_AND_RESET',
        entity_type: 'masters',
        entity_id: 'ALL',
        after_state: { count: allItems.length },
        metadata: { details: 'Purged old test materials and inserted 5 Raw Materials and 5 Finished Goods' }
      }
    ]);
  } catch (e) {
    // ignore
  }

  console.log('\n--- Final Verification from Supabase Database ---');
  const { data: mastersInDb } = await db
    .from('masters')
    .select('code, name, item_type, category, uom, standard_cost, selling_price, status')
    .order('code');

  console.log(`Total Masters in DB: ${mastersInDb?.length}`);
  console.table(mastersInDb);

  const { data: stockInDb } = await db
    .from('stock_items')
    .select('code, description, on_hand, available, unit, status')
    .order('code');

  console.log(`Total Stock Items in DB: ${stockInDb?.length}`);
  console.table(stockInDb);
}

main().catch((err) => {
  console.error('Fatal error during inventory seed:', err);
  process.exit(1);
});
