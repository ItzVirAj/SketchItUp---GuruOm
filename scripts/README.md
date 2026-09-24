# Database Seed & Maintenance Scripts

This directory contains automated TypeScript scripts for seeding masters, templates, items, and initial system data directly into Supabase.

All scripts use TypeScript and are executed directly via [`tsx`](https://github.com/privatenumber/tsx) without requiring prior compilation.

---

## 📋 Prerequisites

Ensure your `.env` file at the root of the project contains the required Supabase connection keys:

```env
# Required for database access
SUPABASE_URL=https://<your-project-id>.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOi...

# Or standard frontend Vite fallback keys:
VITE_SUPABASE_URL=https://<your-project-id>.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOi...
```

> **Note:** For scripts that bypass RLS (Row Level Security) or operate on protected system tables, using `SUPABASE_SERVICE_ROLE_KEY` is strongly recommended.

---

## 🚀 Recommended Execution Order

Because several entities depend on master records (e.g., BOMs require Finished Goods and Raw Materials; Route Cards require Machines and Finished Goods), run the scripts in the following order when bootstrapping a fresh or clean environment:

| Step | Script | Description |
| :--- | :--- | :--- |
| **1** | [`seed-vendors.ts`](seed-vendors.ts) | Seeds Vendor Masters (`VEN-0001` onwards) with GSTIN, PAN, Bank, and Payment terms. |
| **2** | [`seed-customers.ts`](seed-customers.ts) | Seeds Customer Masters (`CUST-0001` onwards) with GSTIN, PAN, credit days, and addresses. |
| **3** | [`seed-machines.ts`](seed-machines.ts) | Seeds Machine Master records (e.g. CNC Lathes, VMC, Welding Station, Surface Booth, QC). |
| **4** | [`seed-inventory.ts`](seed-inventory.ts) | Seeds Raw Materials (`RM-0001`..`RM-0005`) and Finished Goods (`FG-0001`..`FG-0005`) and sets initial stock. |
| **5** | [`seed-route-cards.ts`](seed-route-cards.ts) | Seeds Route Card operational templates linked to Finished Goods and Machine masters. |
| **6** | [`seed-boms.ts`](seed-boms.ts) | Seeds Bills of Materials (BOM v1.0) linking FG parts to exact RM component SKUs. |

---

## 💻 How to Run

Run any script from the project root using `npx tsx`:

```bash
# 1. Seed Vendors
npx tsx scripts/seed-vendors.ts

# 2. Seed Customers
npx tsx scripts/seed-customers.ts

# 3. Seed Machines
npx tsx scripts/seed-machines.ts

# 4. Seed Inventory (Raw Materials & Finished Goods)
npx tsx scripts/seed-inventory.ts

# 5. Seed Route Card Templates
npx tsx scripts/seed-route-cards.ts

# 6. Seed Bills of Materials (BOMs)
npx tsx scripts/seed-boms.ts
```

---

## 🛠️ Utility & Reset Scripts

- **[`reset-system-data.ts`](reset-system-data.ts)**  
  Wipes transactional test records (orders, job cards, QC inspections, challans, gate passes, invoices, payables) while keeping masters intact.  
  ```bash
  npx tsx scripts/reset-system-data.ts
  ```

- **[`create-server-admin.ts`](create-server-admin.ts)** / **[`seed-server-admin.ts`](seed-server-admin.ts)**  
  Provisions default administrative user credentials for local authentication.  
  ```bash
  npx tsx scripts/seed-server-admin.ts
  ```

---

## ✍️ How to Add a New Seed Script

When writing a new seed script, follow this standard pattern:

1. **Load Environment & Supabase Client:**
   ```typescript
   import dotenv from 'dotenv';
   dotenv.config();
   import { createClient } from '@supabase/supabase-js';

   const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
   const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';
   const db = createClient(url, key);
   ```

2. **Check & Manage Master Counters (If Generating Auto-Codes):**
   If the entity uses sequential codes managed by `master_code_counters`, ensure the counter is seeded or respected:
   ```typescript
   const { data: existing } = await db.from('your_table').select('id');
   if (!existing || existing.length === 0) {
     await db.from('master_code_counters').upsert({
       entity_type: 'YOUR_ENTITY',
       prefix: 'PREFIX',
       current_value: 0,
       padding_digits: 4,
       updated_at: new Date().toISOString()
     });
   }
   ```

3. **Use Idempotent Logic:**
   - Check if records already exist by unique code or name before inserting, or use `.upsert()`.
   - Resolve foreign keys dynamically by querying parent tables (e.g. look up `machine_id` by `machine_name`, or item `id` by `code`) rather than hardcoding UUIDs.

4. **Add Graceful Error Handling:**
   ```typescript
   async function main() {
     try {
       // Your seed logic here
       console.log('✅ Seed completed successfully!');
     } catch (err) {
       console.error('❌ Seeding failed:', err);
       process.exit(1);
     }
   }

   main();
   ```
