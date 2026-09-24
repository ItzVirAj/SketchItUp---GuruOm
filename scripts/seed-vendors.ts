import dotenv from 'dotenv';
dotenv.config();
import { createClient } from '@supabase/supabase-js';
import { mastersService } from '../backend/src/modules/masters/masters.service';

const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';
const db = createClient(url, key);

async function main() {
  console.log('🚀 Starting vendor insertion to Supabase...');

  // 1. Reset master_code_counters for VENDOR if currently empty so it starts cleanly from VEND-0001
  const { data: existingVendors } = await db.from('vendor_masters').select('id');
  if (!existingVendors || existingVendors.length === 0) {
    console.log('No existing vendors in DB. Resetting master counter for VENDOR VEND to 0.');
    await db.from('master_code_counters').upsert({
      entity_type: 'VENDOR',
      prefix: 'VEND',
      current_value: 0,
      padding_digits: 4,
      updated_at: new Date().toISOString()
    });
  }

  const vendorsToInsert = [
    {
      name: 'Maharashtra Steel & Metals',
      legalName: 'Maharashtra Steel & Metals Private Limited',
      vendorType: 'Supplier',
      vendorCategory: 'Raw Material',
      contactPerson: 'Suresh Jadhav',
      mobile: '9876501234',
      pan: 'AABCM1234K',
      gstin: '27AABCM1234K1Z4',
      bankAccountName: 'Maharashtra Steel & Metals Pvt Ltd',
      bankAccountNumber: '123456789012',
      ifsc: 'SBIN0001234',
      billingAddress: 'Plot 18, MIDC Waluj Industrial Area',
      city: 'Chhatrapati Sambhajinagar',
      state: 'Maharashtra',
      stateCode: '27',
      pincode: '431136',
      paymentTerms: 'Net 30',
      creditDays: 30,
      status: 'Active',
      notes: 'Raw Material Manufacturer (Vendor Type: Manufacturer, Category: Raw Material)'
    },
    {
      name: 'Precision Fasteners India',
      legalName: 'Precision Fasteners India Private Limited',
      vendorType: 'Supplier',
      vendorCategory: 'Components',
      contactPerson: 'Manish Shah',
      mobile: '9123456701',
      pan: 'AABCP5678L',
      gstin: '27AABCP5678L1Z7',
      bankAccountName: 'Precision Fasteners India Pvt Ltd',
      bankAccountNumber: '234567890123',
      ifsc: 'HDFC0002345',
      billingAddress: 'Unit 6, Shendra Five Star Industrial Area',
      city: 'Chhatrapati Sambhajinagar',
      state: 'Maharashtra',
      stateCode: '27',
      pincode: '431154',
      paymentTerms: 'Net 45',
      creditDays: 45,
      status: 'Active',
      notes: 'Fasteners Manufacturer (Vendor Type: Manufacturer, Category: Fasteners)'
    },
    {
      name: 'Industrial Surface Solutions',
      legalName: 'Industrial Surface Solutions Private Limited',
      vendorType: 'ServiceProvider',
      vendorCategory: 'Other',
      contactPerson: 'Vikram Pawar',
      mobile: '9988771122',
      pan: 'AABCI9012M',
      gstin: '27AABCI9012M1Z1',
      bankAccountName: 'Industrial Surface Solutions Pvt Ltd',
      bankAccountNumber: '345678901234',
      ifsc: 'ICIC0003456',
      billingAddress: 'Shed 14, Chikalthana MIDC',
      city: 'Chhatrapati Sambhajinagar',
      state: 'Maharashtra',
      stateCode: '27',
      pincode: '431007',
      paymentTerms: 'Net 30',
      creditDays: 30,
      processType: 'Surface Treatment',
      turnaroundTimeDays: 3,
      status: 'Active',
      notes: 'Surface Treatment Service Provider (Vendor Type: Service Provider, Category: Surface Treatment)'
    }
  ];

  const results = [];
  for (const v of vendorsToInsert) {
    console.log(`Adding vendor: ${v.name}...`);
    const created = await mastersService.createVendor(v, 'owner@guruom.in', 'Owner');
    console.log(`✅ Created: [${created.code}] ${created.name} (ID: ${created.id})`);
    results.push(created);
  }

  console.log('\n--- Final Verification from Supabase Database ---');
  const { data: dbRecords, error } = await db
    .from('vendor_masters')
    .select('id, code, name, legal_name, vendor_type, vendor_category, contact_person, mobile, pan, gstin, bank_account_name, ifsc, billing_address, city, state, payment_terms, credit_days, status, notes')
    .order('code');

  if (error) {
    console.error('Error fetching records:', error);
  } else {
    console.log(`Successfully verified ${dbRecords.length} vendors in Supabase:`);
    console.log(JSON.stringify(dbRecords, null, 2));
  }
}

main().catch((err) => {
  console.error('Fatal error during vendor seed:', err);
  process.exit(1);
});
