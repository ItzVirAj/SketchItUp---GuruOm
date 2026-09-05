import dotenv from 'dotenv';
dotenv.config();
import { createClient } from '@supabase/supabase-js';
import { mastersService } from '../backend/src/modules/masters/masters.service';

const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';
const db = createClient(url, key);

async function main() {
  console.log('🚀 Starting machine insertion to Supabase...');

  // Reset sequence counter for MACHINE if currently 0 machines in table
  const { data: existing } = await db.from('machine_masters').select('id');
  if (!existing || existing.length === 0) {
    console.log('Resetting master counter for MACHINE MCH to 0.');
    await db.from('master_code_counters').upsert({
      entity_type: 'MACHINE',
      prefix: 'MCH',
      current_value: 0,
      padding_digits: 4,
      updated_at: new Date().toISOString()
    });
  }

  const machinesToInsert = [
    {
      name: 'CNC Turning Center 01',
      type: 'CNC Turning',
      department: 'Machining',
      location: 'Bay A - CNC Section',
      hourlyCost: 850,
      manufacturer: 'Ace Manufacturing Systems',
      model: 'ST-20',
      serialNumber: 'AMS-ST20-2024-001',
      installationDate: '2024-04-15',
      capacity: 500,
      capacityUom: 'KG',
      operatingHours: 16,
      shift: 'Shift A',
      status: 'Active',
      responsiblePerson: 'Ramesh Patil'
    },
    {
      name: 'CNC Vertical Machining Center 01',
      type: 'CNC Machining',
      department: 'Machining',
      location: 'Bay A - VMC Section',
      hourlyCost: 1100,
      manufacturer: 'Jyoti CNC Automation',
      model: 'VMC-850',
      serialNumber: 'JCA-VMC850-2023-014',
      installationDate: '2023-08-21',
      capacity: 850,
      capacityUom: 'KG',
      operatingHours: 16,
      shift: 'Shift A',
      status: 'Active',
      responsiblePerson: 'Akash Shinde'
    },
    {
      name: 'MIG Welding Station 01',
      type: 'Welding',
      department: 'Fabrication',
      location: 'Bay B - Welding Section',
      hourlyCost: 600,
      manufacturer: 'ESAB India',
      model: 'Rebel 315ic',
      serialNumber: 'ESAB-R315-2024-008',
      installationDate: '2024-06-10',
      capacity: 315,
      capacityUom: 'A',
      operatingHours: 16,
      shift: 'Shift A',
      status: 'Active',
      responsiblePerson: 'Sunil More'
    },
    {
      name: 'Hydraulic Plate Cutting Machine 01',
      type: 'Cutting',
      department: 'Cutting',
      location: 'Bay C - Cutting Section',
      hourlyCost: 700,
      manufacturer: 'Haco India',
      model: 'HSL-3100',
      serialNumber: 'HAC-HSL3100-2022-011',
      installationDate: '2022-11-05',
      capacity: 3100,
      capacityUom: 'MM',
      operatingHours: 16,
      shift: 'Shift A',
      status: 'Active',
      responsiblePerson: 'Mahesh Jadhav'
    },
    {
      name: 'Surface Finishing Booth 01',
      type: 'Other',
      department: 'Surface Finishing',
      location: 'Bay D - Finishing Section',
      hourlyCost: 550,
      manufacturer: 'Gayatri Powder Coating Systems',
      model: 'PCS-4000',
      serialNumber: 'GPCS-4000-2024-005',
      installationDate: '2024-02-12',
      capacity: 400,
      capacityUom: 'KG',
      operatingHours: 12,
      shift: 'General-Day',
      status: 'Active',
      responsiblePerson: 'Vijay Pawar'
    }
  ];

  const results = [];
  for (const m of machinesToInsert) {
    console.log(`Adding machine: ${m.name}...`);
    const created = await mastersService.createMachine(m, 'owner@guruom.in', 'Owner');
    console.log(`✅ Created: [${created.code}] ${created.name} (ID: ${created.id})`);
    results.push(created);
  }

  console.log('\n--- Final Verification from Supabase Database ---');
  const { data: dbRecords, error } = await db
    .from('machine_masters')
    .select('id, code, name, machine_type, department, location, hourly_cost, manufacturer, model, serial_number, installation_date, capacity, capacity_uom, operating_hours, shift, status, responsible_person')
    .order('code');

  if (error) {
    console.error('Error fetching machine records:', error);
  } else {
    console.log(`Successfully verified ${dbRecords.length} machines in Supabase:`);
    console.table(dbRecords.map(r => ({
      code: r.code,
      name: r.name,
      type: r.machine_type,
      dept: r.department,
      location: r.location,
      hourlyCost: r.hourly_cost,
      manufacturer: r.manufacturer,
      capacity: `${r.capacity} ${r.capacity_uom}`,
      shift: r.shift,
      status: r.status,
      responsible: r.responsible_person
    })));
  }
}

main().catch((err) => {
  console.error('Fatal error during machine seed:', err);
  process.exit(1);
});
