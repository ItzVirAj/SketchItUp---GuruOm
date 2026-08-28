import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://txztwjvjqjczxwskzjjx.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR4enR3anZqcWpjenh3c2t6amp4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY1NDA4MjEsImV4cCI6MjEwMjExNjgyMX0.oTGcfvvmWb9qXUitJGfdsNdWqi0FEWpxytIMWTx_F_E';

const db = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false }
});

async function add1000UnitsToAllInventory() {
  console.log('🚀 Starting realtime DB stock increment: +1000 units to all inventory items...');

  // 1. Fetch all stock items
  const { data: stockItems, error: stockErr } = await db
    .from('stock_items')
    .select('*');

  if (stockErr) {
    console.error('Error fetching stock_items:', stockErr);
  }

  console.log(`📦 Found ${stockItems?.length || 0} items in stock_items table.`);

  if (stockItems && stockItems.length > 0) {
    for (const item of stockItems) {
      const currentOnHand = Number(item.on_hand || 0);
      const currentReserved = Number(item.reserved || 0);
      const reorderLevel = Number(item.reorder_level || 0);
      const newOnHand = currentOnHand + 1000;
      const newAvailable = newOnHand - currentReserved;
      const newShortage = Math.max(0, reorderLevel - newAvailable);
      const newStatus = newAvailable < 0 ? 'CRITICAL' : newAvailable < reorderLevel ? 'SHORTAGE' : 'OK';

      // Update stock_items
      const { error: updateErr } = await db
        .from('stock_items')
        .update({
          on_hand: newOnHand,
          available: newAvailable,
          shortage: newShortage,
          status: newStatus,
          updated_at: new Date().toISOString()
        })
        .eq('code', item.code);

      if (updateErr) {
        console.warn(`⚠️ Error updating stock for ${item.code}:`, updateErr.message);
      } else {
        console.log(`✅ [${item.code}] "${item.description}": ${currentOnHand} -> ${newOnHand} units (Available: ${newAvailable})`);
      }

      // Record in inventory_movements ledger
      try {
        await db.from('inventory_movements').insert({
          item_code: item.code,
          movement_type: 'ADJUSTMENT',
          quantity_change: 1000,
          balance_after: newOnHand,
          location: 'MAIN-STORE-RACK-01',
          reference_type: 'manual_adjustment',
          reference_id: `STOCK-INCR-${Date.now()}`,
          actor_email: 'owner@guruom.in',
          notes: 'Realtime +1000 units added to stock'
        });
      } catch (movErr: any) {
        console.warn(`Ledger entry warning for ${item.code}:`, movErr?.message);
      }
    }
  }

  // 2. Also check if there are master items that weren't in stock_items and initialize them with 1000 units
  const { data: masters } = await db.from('masters').select('*');
  if (masters && masters.length > 0) {
    for (const m of masters) {
      const exists = stockItems?.some(s => s.code === m.code);
      if (!exists) {
        const onHand = 1000;
        const reserved = 0;
        const available = 1000;
        const reorderLevel = Number(m.reorder_level || m.reorderLevel || 50);
        const status = available < reorderLevel ? 'SHORTAGE' : 'OK';

        await db.from('stock_items').insert({
          id: `stock-${m.code}`,
          code: m.code,
          description: m.name || m.description || m.code,
          on_hand: onHand,
          reserved: reserved,
          available: available,
          demand: 0,
          reorder_level: reorderLevel,
          shortage: 0,
          unit: m.unit || 'NOS',
          status: status,
          updated_at: new Date().toISOString()
        });

        console.log(`✨ Initialized missing master in stock_items: [${m.code}] with 1000 units.`);
      }
    }
  }

  console.log('🎉 Done! All inventory stock items in the database have been updated with +1000 units.');
}

add1000UnitsToAllInventory().catch(console.error);
