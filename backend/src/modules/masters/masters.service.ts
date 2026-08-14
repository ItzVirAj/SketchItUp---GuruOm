import { getDbClient } from '../../config/database';
import { z } from 'zod';
import { MasterItemSchema, CustomerMasterSchema, VendorMasterSchema, MachineMasterSchema } from './masters.schema';

export class MastersService {
  private db = getDbClient();

  // ----------------------------------------------------
  // Core Item Masters
  // ----------------------------------------------------
  async getMasters() {
    try {
      const { data, error } = await this.db
        .from('masters')
        .select('*')
        .order('code', { ascending: true });

      if (!error && data && data.length > 0) {
        return data.map(m => ({
          code: m.code,
          partNo: m.part_no || '',
          description: m.description,
          unit: m.unit || 'NOS',
          hsnCode: m.hsn_code || '8483',
          reorderLevel: Number(m.reorder_level || 0),
          storeLocation: m.store_location || '',
          isFinishedGoods: m.is_finished_goods ?? true,
          saleRate: Number(m.sale_rate || 0),
          purchaseRate: Number(m.purchase_rate || 0)
        }));
      }
    } catch (err) {
      console.warn('Database getMasters error:', err);
    }
    return [];
  }

  async createMaster(data: z.infer<typeof MasterItemSchema>) {
    const validated = MasterItemSchema.parse(data);
    const id = validated.id || `m-${Date.now()}`;

    const record = {
      id,
      code: validated.code,
      part_no: validated.partNo,
      description: validated.description,
      unit: validated.unit,
      hsn_code: validated.hsnCode,
      reorder_level: validated.reorderLevel,
      store_location: validated.storeLocation,
      is_finished_goods: validated.isFinishedGoods,
      sale_rate: validated.saleRate,
      purchase_rate: validated.purchaseRate,
      updated_at: new Date().toISOString()
    };

    try {
      const { data: created, error } = await this.db
        .from('masters')
        .upsert(record, { onConflict: 'code' })
        .select()
        .single();

      if (!error && created) {
        return {
          code: created.code,
          partNo: created.part_no,
          description: created.description,
          unit: created.unit,
          hsnCode: created.hsn_code,
          reorderLevel: Number(created.reorder_level),
          storeLocation: created.store_location,
          isFinishedGoods: created.is_finished_goods,
          saleRate: Number(created.sale_rate),
          purchaseRate: Number(created.purchase_rate)
        };
      }
    } catch (err) {
      console.warn('Database createMaster error:', err);
    }

    return validated;
  }

  // ----------------------------------------------------
  // Customer Masters
  // ----------------------------------------------------
  async getCustomers() {
    try {
      const { data, error } = await this.db
        .from('customer_masters')
        .select('*')
        .order('code', { ascending: true });

      if (!error && data && data.length > 0) {
        return data.map(c => ({
          code: c.code,
          name: c.name,
          legalName: c.legal_name,
          customerType: c.customer_type,
          gstin: c.gstin,
          pan: c.pan,
          address: c.address,
          shippingAddress: c.shipping_address,
          city: c.city,
          state: c.state,
          stateCode: c.state_code,
          pin: c.pin,
          email: c.email,
          contact: c.contact,
          contactPerson: c.contact_person,
          creditDays: Number(c.credit_days || 30),
          paymentTerms: c.payment_terms,
          creditLimit: c.credit_limit ? Number(c.credit_limit) : undefined,
          salesperson: c.salesperson,
          status: c.status || 'Active',
          notes: c.notes
        }));
      }
    } catch (err) {
      console.warn('Database getCustomers error:', err);
    }
    return [];
  }

  async createCustomer(data: z.infer<typeof CustomerMasterSchema>) {
    const validated = CustomerMasterSchema.parse(data);

    const record = {
      code: validated.code,
      name: validated.name,
      legal_name: validated.legalName || validated.name,
      customer_type: validated.customerType || 'OEM',
      gstin: validated.gstin || '',
      pan: validated.pan || '',
      address: validated.address || '',
      shipping_address: validated.shippingAddress || validated.address || '',
      city: validated.city || '',
      state: validated.state || '',
      state_code: validated.stateCode || '27',
      pin: validated.pin || '',
      email: validated.email || '',
      contact: validated.contact || '',
      contact_person: validated.contactPerson || '',
      credit_days: validated.creditDays || 30,
      payment_terms: validated.paymentTerms || 'Net 30',
      credit_limit: validated.creditLimit || 1000000,
      salesperson: validated.salesperson || '',
      status: validated.status || 'Active',
      notes: validated.notes || '',
      updated_at: new Date().toISOString()
    };

    try {
      await this.db.from('customer_masters').upsert(record, { onConflict: 'code' });
    } catch (err) {
      console.warn('Database createCustomer error:', err);
    }

    return validated;
  }

  // ----------------------------------------------------
  // Vendor Masters
  // ----------------------------------------------------
  async getVendors() {
    try {
      const { data, error } = await this.db
        .from('vendor_masters')
        .select('*')
        .order('code', { ascending: true });

      if (!error && data && data.length > 0) {
        return data.map(v => ({
          code: v.code,
          name: v.name,
          legalName: v.legal_name,
          vendorType: v.vendor_type,
          vendorCategory: v.vendor_category,
          gstin: v.gstin,
          pan: v.pan,
          address: v.address,
          city: v.city,
          state: v.state,
          stateCode: v.state_code,
          pin: v.pin,
          email: v.email,
          contact: v.contact,
          contactPerson: v.contact_person,
          paymentTerms: v.payment_terms || 'Net 30',
          creditDays: v.credit_days ? Number(v.credit_days) : undefined,
          creditLimit: v.credit_limit ? Number(v.credit_limit) : undefined,
          bankAccountName: v.bank_account_name,
          bankAccountNumber: v.bank_account_number,
          ifsc: v.ifsc,
          status: v.status || 'Active',
          notes: v.notes
        }));
      }
    } catch (err) {
      console.warn('Database getVendors error:', err);
    }
    return [];
  }

  async createVendor(data: z.infer<typeof VendorMasterSchema>) {
    const validated = VendorMasterSchema.parse(data);

    const record = {
      code: validated.code,
      name: validated.name,
      legal_name: validated.legalName || validated.name,
      vendor_type: validated.vendorType || 'Supplier',
      vendor_category: validated.vendorCategory || 'Raw Material',
      gstin: validated.gstin || '',
      pan: validated.pan || '',
      address: validated.address || '',
      city: validated.city || '',
      state: validated.state || '',
      state_code: validated.stateCode || '27',
      pin: validated.pin || '',
      email: validated.email || '',
      contact: validated.contact || '',
      contact_person: validated.contactPerson || '',
      payment_terms: validated.paymentTerms || 'Net 30',
      credit_days: validated.creditDays || 30,
      credit_limit: validated.creditLimit || 500000,
      bank_account_name: validated.bankAccountName || '',
      bank_account_number: validated.bankAccountNumber || '',
      ifsc: validated.ifsc || '',
      status: validated.status || 'Active',
      notes: validated.notes || '',
      updated_at: new Date().toISOString()
    };

    try {
      await this.db.from('vendor_masters').upsert(record, { onConflict: 'code' });
    } catch (err) {
      console.warn('Database createVendor error:', err);
    }

    return validated;
  }

  // ----------------------------------------------------
  // Machine Masters
  // ----------------------------------------------------
  async getMachines() {
    try {
      const { data, error } = await this.db
        .from('machine_masters')
        .select('*')
        .order('code', { ascending: true });

      if (!error && data && data.length > 0) {
        return data.map(m => ({
          code: m.code,
          name: m.name,
          type: m.type,
          status: m.status,
          hourlyCost: Number(m.hourly_cost),
          active: m.active ?? true
        }));
      }
    } catch (err) {
      console.warn('Database getMachines error:', err);
    }
    return [];
  }

  async createMachine(data: z.infer<typeof MachineMasterSchema>) {
    const validated = MachineMasterSchema.parse(data);

    const record = {
      code: validated.code,
      name: validated.name,
      type: validated.type,
      status: validated.status || 'RUNNING',
      hourly_cost: validated.hourlyCost,
      active: validated.active ?? true,
      updated_at: new Date().toISOString()
    };

    try {
      await this.db.from('machine_masters').upsert(record, { onConflict: 'code' });
    } catch (err) {
      console.warn('Database createMachine error:', err);
    }

    return validated;
  }

  // ----------------------------------------------------
  // Company Profile
  // ----------------------------------------------------
  async getCompanyProfile() {
    try {
      const { data, error } = await this.db.from('company_profile').select('*').eq('id', 'main').maybeSingle();
      if (!error && data) {
        return {
          legalName: data.legal_name,
          address: data.address,
          phone: data.phone,
          email: data.email,
          gstin: data.gstin,
          pan: data.pan,
          state: data.state,
          stateCode: data.state_code
        };
      }
    } catch (err) {
      console.warn('Database getCompanyProfile fallback:', err);
    }

    return {
      legalName: 'GuruOm Industries Pvt. Ltd.',
      address: 'Plot No. 42, GIDC Industrial Estate, Phase II, Vatva, Ahmedabad, Gujarat 382445',
      phone: '+91 79 2583 0000',
      email: 'info@guruom.in',
      gstin: '24AAACG1234F1Z5',
      pan: 'AAACG1234F',
      state: 'Gujarat',
      stateCode: '24'
    };
  }

  async updateCompanyProfile(profile: any) {
    const record = {
      id: 'main',
      legal_name: profile.legalName,
      address: profile.address,
      phone: profile.phone,
      email: profile.email,
      gstin: profile.gstin,
      pan: profile.pan,
      state: profile.state,
      state_code: profile.stateCode,
      updated_at: new Date().toISOString()
    };

    try {
      await this.db.from('company_profile').upsert(record, { onConflict: 'id' });
    } catch (err) {
      console.warn('Database updateCompanyProfile fallback:', err);
    }

    return profile;
  }
}

export const mastersService = new MastersService();
