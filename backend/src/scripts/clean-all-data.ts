import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || 'https://txztwjvjqjczxwskzjjx.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';

if (!SUPABASE_KEY) {
  console.error('❌ Missing SUPABASE_SERVICE_ROLE_KEY or VITE_SUPABASE_ANON_KEY in environment');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false }
});

const tablesToClean = [
  // Child / Junction / Log tables first (to avoid foreign key issues)
  'order_line_items',
  'job_card_operations',
  'route_card_templates',
  'employee_certifications',
  'production_logs',
  'qc_inspections',
  'pdi_inspections',
  'finished_goods',
  'outwork_sendouts',
  'subcontract_orders',
  'dispatch_challans',
  'customer_invoice_items',
  'customer_invoices',
  'vendor_bill_three_way_matches',
  'vendor_returns',
  'vendor_bills',
  'vendor_scorecards',
  'grn_items',
  'goods_receipt_notes',
  'purchase_order_items',
  'purchase_orders',
  'bom_items',
  'bill_of_materials',
  'purchase_requisitions',
  'ncrs',
  'inventory_movements',
  'shortage_items',
  'stock_items',
  'job_cards',
  'customer_orders',
  // Master tables
  'customer_masters',
  'vendor_masters',
  'machine_masters',
  'masters',
  // Governance / logs
  'pending_approvals',
  'audit_logs',
  'notifications',
  'notification_logs',
  'security_events'
];

async function cleanAllData() {
  console.log('🚀 Starting deep clean of all system data from Supabase...');
  
  for (const table of tablesToClean) {
    try {
      // In Supabase PostgREST, delete all rows using .neq('id', '00000000-0000-0000-0000-000000000000') or .not('id', 'is', null) or gte('created_at', '1970-01-01')
      // Let's try deleting rows where id is not empty or matching all primary keys
      const { error: err1, count } = await supabase
        .from(table)
        .delete({ count: 'exact' })
        .gte('created_at', '1970-01-01T00:00:00Z');

      if (err1) {
        // Try fallback deletion by id or code
        const { error: err2 } = await supabase
          .from(table)
          .delete()
          .neq('id', '__non_existent_id__');

        if (err2) {
          // Try with code or another column
          const { error: err3 } = await supabase
            .from(table)
            .delete()
            .neq('code', '__non_existent_code__');

          if (err3) {
            console.log(`⚠️ Table [${table}]: Delete skipped or table not present (${err3.message || err2.message || err1.message})`);
            continue;
          }
        }
      }
      console.log(`✅ Table [${table}]: Successfully cleaned all records.`);
    } catch (err: any) {
      console.log(`⚠️ Table [${table}]: Exception during clean - ${err.message}`);
    }
  }

  console.log('🎉 Data clean complete across all database tables!');
}

cleanAllData();
