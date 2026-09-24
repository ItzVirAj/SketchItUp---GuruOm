import dotenv from 'dotenv';
dotenv.config();
import { createClient } from '@supabase/supabase-js';
import { mastersService } from '../backend/src/modules/masters/masters.service';

const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';
const db = createClient(url, key);

async function main() {
  console.log('🚀 Starting customer insertion to Supabase...');

  // 1. Reset master_code_counters for CUSTOMER if currently empty so it starts cleanly from CUST-0001
  const { data: existingCount } = await db.from('customer_masters').select('id');
  if (!existingCount || existingCount.length === 0) {
    console.log('No existing customers in DB. Resetting master counter for CUSTOMER CUST to 0.');
    await db.from('master_code_counters').upsert({
      entity_type: 'CUSTOMER',
      prefix: 'CUST',
      current_value: 0,
      padding_digits: 4,
      updated_at: new Date().toISOString()
    });
  }

  const customersToInsert = [
    {
      name: 'Apex Industrial Systems',
      legalName: 'Apex Industrial Systems Private Limited',
      customerType: 'OEM',
      contactPerson: 'Rajesh Kulkarni',
      mobile: '9876543210',
      email: 'purchase@apexindustrial.example',
      gstin: '27AABCA1234F1Z5',
      pan: 'AABCA1234F',
      billingAddress: 'Plot 12, MIDC Industrial Area',
      shippingAddress: 'Plot 12, MIDC Industrial Area',
      city: 'Chhatrapati Sambhajinagar',
      state: 'Maharashtra',
      stateCode: '27',
      pincode: '431136',
      paymentTerms: 'Net 30',
      creditDays: 30,
      creditLimit: 500000,
      salesperson: 'Amit Patil',
      status: 'Active',
      notes: 'Industrial OEM customer'
    },
    {
      name: 'Bharat Automation Works',
      legalName: 'Bharat Automation Works Private Limited',
      customerType: 'Other',
      contactPerson: 'Sneha Deshmukh',
      mobile: '9123456780',
      email: 'procurement@bharatautomation.example',
      gstin: '27AABCB5678G1Z2',
      pan: 'AABCB5678G',
      billingAddress: 'Unit 8, Waluj Industrial Estate',
      shippingAddress: 'Unit 8, Waluj Industrial Estate',
      city: 'Chhatrapati Sambhajinagar',
      state: 'Maharashtra',
      stateCode: '27',
      pincode: '431136',
      paymentTerms: 'Net 45',
      creditDays: 45,
      creditLimit: 750000,
      salesperson: 'Priya Shinde',
      status: 'Active',
      notes: 'Automation equipment customer (Customer Type: Industrial)'
    },
    {
      name: 'Nova Engineering Pvt Ltd',
      legalName: 'Nova Engineering Private Limited',
      customerType: 'Other',
      contactPerson: 'Nikhil Joshi',
      mobile: '9988776655',
      email: 'orders@novaengineering.example',
      gstin: '27AABCN9012H1Z8',
      pan: 'AABCN9012H',
      billingAddress: 'Shed 21, Chikalthana MIDC',
      shippingAddress: 'Shed 21, Chikalthana MIDC',
      city: 'Chhatrapati Sambhajinagar',
      state: 'Maharashtra',
      stateCode: '27',
      pincode: '431007',
      paymentTerms: 'Net 30',
      creditDays: 30,
      creditLimit: 350000,
      salesperson: 'Rahul More',
      status: 'Active',
      notes: 'Precision engineering customer (Customer Type: Engineering)'
    },
    {
      name: 'Shree Tech Equipments',
      legalName: 'Shree Tech Equipments Private Limited',
      customerType: 'Other',
      contactPerson: 'Anjali Pawar',
      mobile: '9012345678',
      email: 'purchase@shreetech.example',
      gstin: '27AABCS3456J1Z6',
      pan: 'AABCS3456J',
      billingAddress: 'Plot 45, MIDC Waluj',
      shippingAddress: 'Plot 45, MIDC Waluj',
      city: 'Chhatrapati Sambhajinagar',
      state: 'Maharashtra',
      stateCode: '27',
      pincode: '431136',
      paymentTerms: 'Net 60',
      creditDays: 60,
      creditLimit: 1000000,
      salesperson: 'Amit Patil',
      status: 'Active',
      notes: 'Industrial machinery and fabricated assembly customer (Customer Type: Industrial Equipment)'
    }
  ];

  const results = [];
  for (const c of customersToInsert) {
    console.log(`Adding customer: ${c.name}...`);
    const created = await mastersService.createCustomer(c, 'owner@guruom.in', 'Owner');
    console.log(`✅ Created: [${created.code}] ${created.name} (ID: ${created.id})`);
    results.push(created);
  }

  console.log('\n--- Final Verification from Supabase Database ---');
  const { data: dbRecords, error } = await db
    .from('customer_masters')
    .select('id, code, name, legal_name, customer_type, contact_person, mobile, email, gstin, pan, billing_address, shipping_address, city, state, pincode, payment_terms, credit_days, credit_limit, salesperson, status, notes')
    .order('code');

  if (error) {
    console.error('Error fetching records:', error);
  } else {
    console.log(`Successfully verified ${dbRecords.length} customers in Supabase:`);
    console.log(JSON.stringify(dbRecords, null, 2));
  }
}

main().catch((err) => {
  console.error('Fatal error during customer seed:', err);
  process.exit(1);
});
