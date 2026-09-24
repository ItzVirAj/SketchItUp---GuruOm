/**
 * Generates supabase/migrations/018_persistence_convergence.sql from the repo's
 * canonical migration DDL. For every CREATE TABLE in migrations 001-017 it emits:
 *   1. the original CREATE TABLE IF NOT EXISTS (creates genuinely missing tables)
 *   2. ALTER TABLE ... ADD COLUMN IF NOT EXISTS for every column (converges
 *      legacy-shaped tables that already exist, e.g. pre-migration customer_orders)
 * followed by a PostgREST schema-cache reload NOTIFY.
 */
const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, '..', '..', '..', 'supabase', 'migrations');
const files = fs.readdirSync(dir).filter(f => /^\d{3}_.*\.sql$/.test(f) && !f.startsWith('018')).sort();

const createRe = /CREATE TABLE (?:IF NOT EXISTS )?(?:public\.)?([a-z_]+)\s*\(/gi;
const tables = new Map(); // name -> Set of "col type" strings
const createBlocks = new Map(); // name -> full CREATE statement

for (const f of files) {
  const sql = fs.readFileSync(path.join(dir, f), 'utf8');
  let m;
  while ((m = createRe.exec(sql))) {
    const name = m[1];
    // find the balanced parentheses of this CREATE TABLE
    const open = sql.indexOf('(', m.index);
    let depth = 0, end = open;
    for (let i = open; i < sql.length; i++) {
      if (sql[i] === '(') depth++;
      else if (sql[i] === ')') { depth--; if (depth === 0) { end = i; break; } }
    }
    const body = sql.slice(open + 1, end);
    const cols = new Set();
    // split top-level commas
    let d = 0, buf = '', parts = [];
    for (const ch of body) {
      if (ch === '(') d++;
      if (ch === ')') d--;
      if (ch === ',' && d === 0) { parts.push(buf); buf = ''; continue; }
      buf += ch;
    }
    parts.push(buf);
    for (const raw of parts) {
      const line = raw.trim().replace(/\s+/g, ' ');
      if (!line) continue;
      if (/^(PRIMARY KEY|FOREIGN KEY|UNIQUE|CONSTRAINT|CHECK|EXCLUDE)/i.test(line)) continue;
      const colName = line.split(' ')[0];
      if (!/^[a-z_][a-z0-9_]*$/.test(colName)) continue;
      // strip NOT NULL for ALTERs; Postgres forbids PRIMARY KEY/UNIQUE in ADD COLUMN
      let colDef = line
        .replace(/\s+NOT NULL/i, '')
        .replace(/\s+PRIMARY KEY/i, '')
        .replace(/\s+UNIQUE/i, '');
      cols.add(colDef);
    }
    if (!tables.has(name)) tables.set(name, new Set());
    cols.forEach(c => tables.get(name).add(c));
    // keep the LAST (most specific) CREATE block per table
    const stmt = sql.slice(m.index, end + 1) + ';';
    createBlocks.set(name, stmt.replace(/\s+\(/, ' ('));
  }

  // also collect columns introduced via ALTER TABLE ... ADD COLUMN in later migrations
  const alterRe = /ALTER TABLE (?:IF EXISTS )?(?:public\.)?([a-z_]+)\s+ADD COLUMN (?:IF NOT EXISTS )?([a-z_][a-z0-9_]*[^,;]*)/gi;
  while ((m = alterRe.exec(sql))) {
    const name = m[1];
    let colDef = m[2].trim().replace(/\s+/g, ' ')
      .replace(/\s+NOT NULL/i, '')
      .replace(/\s+PRIMARY KEY/i, '')
      .replace(/\s+UNIQUE/i, '');
    if (!tables.has(name)) tables.set(name, new Set()); // ALTER-only table: still converge columns if it exists
    tables.get(name).add(colDef);
  }
}

// Service-written columns that appear in NO migration — curated from backend service payloads
const EXTRA_COLUMNS = {
  customer_orders: [
    'stage TEXT',
    'blanket_po_id VARCHAR(100)',
    'drawing_revision VARCHAR(50)',
    'master_drawing_revision VARCHAR(50)',
    'is_credit_held BOOLEAN DEFAULT FALSE',
    'credit_override_by TEXT',
    'credit_override_reason TEXT',
    'has_open_ncr BOOLEAN DEFAULT FALSE'
  ],
  order_line_items: ['drawing_revision VARCHAR(50)'],
  customer_invoices: [
    'customer_id TEXT',
    'customer_gstin TEXT',
    'taxable_amount NUMERIC(14,2) DEFAULT 0',
    'cgst_amount NUMERIC(14,2) DEFAULT 0',
    'sgst_amount NUMERIC(14,2) DEFAULT 0',
    'is_einvoice_applicable BOOLEAN DEFAULT FALSE',
    'irn_number TEXT',
    'payment_received_date TEXT',
    'updated_at TIMESTAMPTZ DEFAULT NOW()'
  ],
  pdi_inspections: [
    'pdi_passed_qty NUMERIC(12,2) DEFAULT 0',
    'physically_held_qty NUMERIC(12,2) DEFAULT 0',
    'dispatched_qty NUMERIC(12,2) DEFAULT 0',
    'variance NUMERIC(12,2) DEFAULT 0',
    'inspected_by TEXT'
  ],
  finished_goods: ['created_at TIMESTAMPTZ DEFAULT NOW()']
};

const out = [];
out.push('-- Owner OS: persistence convergence (generated from migrations 001-017)');
out.push('-- Creates missing operational tables and adds absent columns to existing ones,');
out.push('-- so backend writes persist across server restarts instead of falling back to memory.');
out.push('-- Run once in the Supabase SQL Editor.');
out.push('');

for (const [name, cols] of tables) {
  out.push('-- ' + name);
  const block = createBlocks.get(name);
  if (block) out.push(block);
  for (const col of cols) {
    out.push(`ALTER TABLE public.${name} ADD COLUMN IF NOT EXISTS ${col};`);
  }
  out.push('');
}

out.push('-- Service-written columns that no migration defines');
for (const [t, cols] of Object.entries(EXTRA_COLUMNS)) {
  for (const col of cols) {
    out.push(`ALTER TABLE public.${t} ADD COLUMN IF NOT EXISTS ${col};`);
  }
}
out.push('');

out.push('-- Refresh the PostgREST schema cache so new columns are visible immediately');
out.push('NOTIFY pgrst, \'reload schema\';');
out.push('');

const dest = path.join(dir, '..', 'migrations', '018_persistence_convergence.sql');
fs.writeFileSync(dest, out.join('\n'));
console.log(`written ${dest}: ${tables.size} tables, ${[...tables.values()].reduce((s, c) => s + c.size, 0)} columns`);
