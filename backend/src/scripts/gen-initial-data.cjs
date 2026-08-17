/**
 * One-off generator: splices the workbook master data (customers, vendors,
 * machines, items) into src/data/consoleData.ts as the initial* arrays so the
 * app has data for testing even before the DB master tables exist.
 */
const fs = require('fs');
const wb = JSON.parse(fs.readFileSync(__dirname + '/master-data.json', 'utf8'));

const SAMPLE = /^SAMPLE\s*—\s*DELETE BEFORE SUBMISSION\s*—\s*/;
const clean = v => { if (v == null) return ''; const s = String(v).trim(); return /^(N\/A|To Be Confirmed)$/i.test(s) ? '' : s; };
const cleanName = v => clean(v).replace(SAMPLE, '').trim();
const num = (v, d = 0) => { const n = Number(v); return Number.isFinite(n) ? n : d; };
const excelDate = v => typeof v === 'number' ? new Date(Date.UTC(1899, 11, 30) + v * 864e5).toISOString().slice(0, 10) : (typeof v === 'string' ? v.slice(0, 10) : '');
const UOM = { 'Nos': 'Nos', 'No.': 'Nos', 'Pcs': 'Nos', 'Kg': 'Kg', 'KG': 'Kg', 'Kgs': 'Kg', 'Mtr': 'Meter', 'Meter': 'Meter', 'Meters': 'Meter', 'Ltr': 'Litre', 'Litre': 'Litre', 'Litres': 'Litre', 'Set': 'Set', 'Box': 'Box' };
const uom = v => UOM[clean(v)] || 'Nos';
const MTYPE = { 'Cutting': 'Cutting', 'Welding / Fabrication': 'Welding', 'Welding': 'Welding', 'CNC Turning': 'CNC Turning', 'CNC Machining (VMC/HMC)': 'CNC Machining', 'CNC Machining': 'CNC Machining', 'Conventional Machining': 'Conventional Machining', 'Grinding': 'Grinding', 'Inspection-CMM': 'Inspection-CMM', 'Inspection / CMM': 'Inspection-CMM' };
const VTYPE = { 'Supplier': 'Supplier', 'Transporter': 'Transporter', 'Subcontractor / Job Worker': 'Subcontractor / Job Worker', 'Equipment Vendor': 'EquipmentVendor', 'Manpower Provider': 'ManpowerProvider' };
const q = s => JSON.stringify(String(s));
const kv = entries => entries.filter(([, v]) => v !== undefined && v !== '').map(([k, v]) => `    ${k}: ${typeof v === 'string' ? q(v) : JSON.stringify(v)}`).join(',\n');
const obj = entries => `  {\n${kv(entries)}\n  }`;

const customers = wb['03_Customer_Master'].map(r => {
  const code = clean(r['Customer ID']), name = cleanName(r['Customer Name']);
  if (!code || !name) return null;
  const billing = clean(r['Billing Address']);
  return obj([
    ['id', `c-${code}`], ['code', code], ['name', name],
    ['legalName', clean(r['Legal Name'])], ['customerType', clean(r['Customer Type']) || 'OEM'],
    ['contactPerson', clean(r['Contact Person'])], ['mobile', clean(r['Mobile'])], ['email', clean(r['Email'])],
    ['gstin', clean(r['GSTIN'])], ['pan', clean(r['PAN'])],
    ['billingAddress', billing], ['address', billing], ['shippingAddress', clean(r['Shipping Address']) || billing],
    ['city', clean(r['City'])], ['state', clean(r['State'])], ['stateCode', '27'],
    ['pincode', clean(r['Pincode'])], ['pin', clean(r['Pincode'])],
    ['paymentTerms', clean(r['Payment Terms']) || 'Net 30'], ['creditDays', num(r['Credit Days'], 0)],
    ['creditLimit', num(r['Credit Limit (₹)'], 0)], ['salesperson', clean(r['Salesperson'])],
    ['status', clean(r['Customer Status']) || 'Active'], ['notes', clean(r['Notes'])]
  ]);
}).filter(Boolean);

const vendors = wb['04_Vendor_Master'].map(r => {
  const code = clean(r['Vendor ID']), name = cleanName(r['Vendor Name']);
  if (!code || !name) return null;
  return obj([
    ['id', `v-${code}`], ['code', code], ['name', name],
    ['legalName', clean(r['Legal Name'])],
    ['vendorType', VTYPE[clean(r['Vendor Type'])] || clean(r['Vendor Type']) || 'Other'],
    ['vendorCategory', clean(r['Vendor Category']) || 'Other'],
    ['contactPerson', clean(r['Contact Person'])], ['mobile', clean(r['Mobile'])], ['email', clean(r['Email'])],
    ['billingAddress', clean(r['Billing Address'])], ['address', clean(r['Billing Address'])],
    ['city', clean(r['City'])], ['state', clean(r['State'])], ['stateCode', '27'],
    ['pincode', clean(r['Pincode'])], ['pin', clean(r['Pincode'])],
    ['gstin', clean(r['GSTIN'])], ['pan', clean(r['PAN'])],
    ['bankAccountName', clean(r['Bank Account Name']) || name], ['bankAccountNumber', clean(r['Bank Account Number'])],
    ['ifsc', clean(r['IFSC'])], ['paymentTerms', clean(r['Payment Terms']) || 'Net 30'],
    ['creditDays', num(r['Credit Days'], 0)], ['creditLimit', num(r['Credit Limit (₹)'], 0)],
    ['status', clean(r['Vendor Status']) || 'Active'], ['notes', clean(r['Notes'])]
  ]);
}).filter(Boolean);

const machines = wb['07_Machine_Master'].map(r => {
  const code = clean(r['Machine ID']), name = cleanName(r['Machine Name']);
  if (!code || !name) return null;
  const status = clean(r['Machine Status']) || 'Active';
  const shiftRaw = clean(r['Shift']);
  return obj([
    ['id', `mch-${code}`], ['code', code], ['name', name],
    ['type', MTYPE[clean(r['Machine Type'])] || clean(r['Machine Type']) || 'Other'],
    ['department', clean(r['Department'])], ['location', clean(r['Location'])],
    ['manufacturer', clean(r['Manufacturer'])], ['model', clean(r['Model'])], ['serialNumber', clean(r['Serial Number'])],
    ['installationDate', excelDate(r['Installation Date'])],
    ['capacity', num(r['Capacity'], 0) || undefined], ['capacityUom', clean(r['Capacity UOM'])],
    ['operatingHours', num(r['Operating Hours (per day)'], 8)],
    ['shift', shiftRaw === 'General / Day' ? 'General-Day' : (shiftRaw || 'General-Day')],
    ['status', status], ['responsiblePerson', clean(r['Operator / Responsible Person'])],
    ['hourlyCost', 500], ['active', status === 'Active']
  ]);
}).filter(Boolean);

const items = wb['05_Item_Master'].map(r => {
  const code = clean(r['Item Code']), name = cleanName(r['Item Name']);
  if (!code || !name) return null;
  const itemType = clean(r['Item Type']);
  return obj([
    ['id', `m-${code}`], ['code', code], ['name', name], ['itemType', itemType || 'Raw Material'],
    ['category', clean(r['Category'])], ['description', clean(r['Description']) || name], ['partNo', name],
    ['unit', uom(r['UOM'])], ['hsnCode', String(clean(r['HSN']))], ['gstRate', num(r['GST %'], 18)],
    ['standardCost', num(r['Standard Cost (₹)'], 0)], ['sellingPrice', num(r['Selling Price (₹)'], 0)],
    ['minStock', num(r['Minimum Stock'], 0)], ['maxStock', num(r['Maximum Stock'], 0)],
    ['reorderLevel', num(r['Reorder Level'], 10)], ['leadTimeDays', num(r['Lead Time (Days)'], 0)],
    ['preferredVendor', clean(r['Preferred Vendor'])], ['defaultWarehouse', clean(r['Warehouse']) || 'Main Store'],
    ['storeLocation', clean(r['Warehouse']) || 'Main Store'], ['isFinishedGoods', itemType === 'Finished Good'],
    ['saleRate', num(r['Selling Price (₹)'], 0)], ['purchaseRate', num(r['Standard Cost (₹)'], 0)],
    ['status', clean(r['Active Status']) || 'Active']
  ]);
}).filter(Boolean);

const file = __dirname + '/../../../src/data/consoleData.ts';
let src = fs.readFileSync(file, 'utf8');
const splice = (varName, type, arr) => {
  const anchor = `export const ${varName}: ${type}[] = [];`;
  if (!src.includes(anchor)) throw new Error('anchor not found: ' + varName);
  src = src.replace(anchor, `export const ${varName}: ${type}[] = [\n${arr.join(',\n')}\n];`);
};
splice('initialMasters', 'MasterItem', items);
splice('initialCustomers', 'CustomerMaster', customers);
splice('initialVendors', 'VendorMaster', vendors);
splice('initialMachines', 'MachineMaster', machines);
fs.writeFileSync(file, src);
console.log(`spliced: customers=${customers.length} vendors=${vendors.length} machines=${machines.length} items=${items.length}`);
