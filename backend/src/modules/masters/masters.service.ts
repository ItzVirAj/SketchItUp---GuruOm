import { getDbClient } from '../../config/database';
import { z } from 'zod';
import {
  MasterItemSchema,
  CustomerMasterSchema,
  VendorMasterSchema,
  MachineMasterSchema,
  UserMasterSchema
} from './masters.schema';
import { notificationsService } from '../notifications/notifications.service';
import { logAudit } from '../../services/auditLog';
import crypto from 'crypto';

// Simple symmetric encryption for sensitive bank account numbers
const ENCRYPTION_KEY = (process.env.ENCRYPTION_KEY || 'guruom-precision-bank-secret-key32').padEnd(32, '0').slice(0, 32);
const IV_LENGTH = 16;

function encryptField(text: string): string {
  if (!text) return '';
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY), iv);
  let encrypted = cipher.update(text);
  encrypted = Buffer.concat([encrypted, cipher.final()]);
  return iv.toString('hex') + ':' + encrypted.toString('hex');
}

function decryptField(text: string): string {
  if (!text || !text.includes(':')) return text;
  try {
    const textParts = text.split(':');
    const iv = Buffer.from(textParts.shift()!, 'hex');
    const encryptedText = Buffer.from(textParts.join(':'), 'hex');
    const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY), iv);
    let decrypted = decipher.update(encryptedText);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    return decrypted.toString();
  } catch {
    return text;
  }
}

function maskAccountNumber(acc: string): string {
  if (!acc) return '•••• ••••';
  const clean = acc.trim();
  if (clean.length <= 4) return clean;
  return `•••• •••• •••• ${clean.slice(-4)}`;
}

export class MastersService {
  private db = getDbClient();

  // ----------------------------------------------------
  // 1. Core Item Masters
  // ----------------------------------------------------
  async getMasters(onlyActive = false) {
    try {
      let query = this.db
        .from('masters')
        .select('*')
        .order('code', { ascending: true });

      if (onlyActive) {
        query = query.eq('status', 'Active');
      }

      const { data, error } = await query;

      if (!error && data && data.length > 0) {
        return data.map(m => ({
          id: m.id,
          code: m.code,
          name: m.name || m.description,
          itemType: m.item_type || (m.is_finished_goods ? 'Finished Good' : 'Raw Material'),
          category: m.category || '',
          description: m.description,
          partNo: m.part_no || '',
          unit: m.unit || 'Nos',
          hsnCode: m.hsn_code || '8483',
          gstRate: Number(m.gst_rate ?? 18),
          standardCost: Number(m.standard_cost ?? m.purchase_rate ?? 0),
          sellingPrice: Number(m.selling_price ?? m.sale_rate ?? 0),
          minStock: Number(m.min_stock ?? 0),
          maxStock: Number(m.max_stock ?? 0),
          reorderLevel: Number(m.reorder_level ?? 10),
          leadTimeDays: Number(m.lead_time_days ?? 0),
          preferredVendor: m.preferred_vendor || '',
          defaultWarehouse: m.default_warehouse || m.store_location || 'Main Store',
          storeLocation: m.store_location || 'A1-RACK-1',
          isFinishedGoods: m.item_type === 'Finished Good' || Boolean(m.is_finished_goods),
          saleRate: Number(m.selling_price ?? m.sale_rate ?? 0),
          purchaseRate: Number(m.standard_cost ?? m.purchase_rate ?? 0),
          status: m.status || 'Active'
        }));
      }
    } catch (err) {
      console.warn('Database getMasters error:', err);
    }
    return [];
  }

  async createMaster(data: any) {
    // Determine auto-prefix if code not given
    if (!data.code) {
      const type = data.itemType || 'Raw Material';
      const prefix = type === 'Raw Material' ? 'RM' :
                     type === 'Finished Good' ? 'FG' :
                     type === 'Semi-Finished' ? 'SF' :
                     type === 'Consumable' ? 'CO' :
                     type === 'Bought-Out' ? 'BO' : 'ITM';
      const existing = await this.getMasters();
      const codes = existing.map(e => e.code);
      let maxNum = 0;
      codes.forEach(c => {
        if (c.startsWith(`${prefix}-`)) {
          const n = parseInt(c.replace(`${prefix}-`, ''), 10);
          if (!isNaN(n) && n > maxNum) maxNum = n;
        }
      });
      data.code = `${prefix}-${String(maxNum + 1).padStart(4, '0')}`;
    }

    const validated = MasterItemSchema.parse(data);
    const id = validated.id || `m-${validated.code}`;

    const record = {
      id,
      code: validated.code,
      name: validated.name,
      item_type: validated.itemType,
      category: validated.category || '',
      description: validated.description || validated.name,
      part_no: validated.partNo || validated.name,
      unit: validated.unit,
      hsn_code: validated.hsnCode,
      gst_rate: validated.gstRate,
      standard_cost: validated.standardCost ?? 0,
      selling_price: validated.sellingPrice ?? 0,
      min_stock: validated.minStock ?? 0,
      max_stock: validated.maxStock ?? 0,
      reorder_level: validated.reorderLevel,
      lead_time_days: validated.leadTimeDays ?? 0,
      preferred_vendor: validated.preferredVendor || '',
      default_warehouse: validated.defaultWarehouse || 'Main Store',
      store_location: validated.storeLocation || 'A1-RACK-1',
      is_finished_goods: validated.itemType === 'Finished Good',
      sale_rate: validated.sellingPrice ?? 0,
      purchase_rate: validated.standardCost ?? 0,
      status: validated.status,
      updated_at: new Date().toISOString()
    };

    try {
      const { data: created, error } = await this.db
        .from('masters')
        .upsert(record, { onConflict: 'code' })
        .select()
        .single();

      if (!error && created) {
        const item = {
          id: created.id,
          code: created.code,
          name: created.name || created.description,
          itemType: created.item_type,
          category: created.category,
          description: created.description,
          partNo: created.part_no,
          unit: created.unit,
          hsnCode: created.hsn_code,
          gstRate: Number(created.gst_rate),
          standardCost: Number(created.standard_cost),
          sellingPrice: Number(created.selling_price),
          minStock: Number(created.min_stock),
          maxStock: Number(created.max_stock),
          reorderLevel: Number(created.reorder_level),
          leadTimeDays: Number(created.lead_time_days),
          preferredVendor: created.preferred_vendor,
          defaultWarehouse: created.default_warehouse,
          status: created.status
        };
        // Real-Time Push: new catalog item available to Stock Master views
        notificationsService.broadcastEvent('master_item_created', item);
        return item;
      }
    } catch (err) {
      console.warn('Database createMaster error:', err);
    }

    await logAudit({ actorEmail: 'masters@guruom.in', action: 'ITEM_MASTER_CREATED', entityType: 'masters', entityId: String(validated.code), afterState: { code: validated.code, name: validated.name, itemType: validated.itemType, unit: validated.unit }, metadata: { details: `Item Master ${validated.code} (${validated.name}) created` } }).catch(() => {});
    // Real-Time Push: still announce the item even when the DB write falls back
    notificationsService.broadcastEvent('master_item_created', validated);
    return validated;
  }

  // ----------------------------------------------------
  // 2. Customer Masters
  // ----------------------------------------------------
  async getCustomers(onlyActive = false) {
    try {
      let query = this.db
        .from('customer_masters')
        .select('*')
        .order('code', { ascending: true });

      if (onlyActive) {
        query = query.eq('status', 'Active');
      }

      const { data, error } = await query;

      if (!error && data && data.length > 0) {
        return data.map(c => ({
          id: c.id,
          code: c.code,
          name: c.name,
          legalName: c.legal_name || '',
          customerType: c.customer_type || 'OEM',
          contactPerson: c.contact_person || '',
          mobile: c.mobile || c.contact || '',
          email: c.email || '',
          gstin: c.gstin,
          pan: c.pan || '',
          billingAddress: c.billing_address || c.address || '',
          shippingAddress: c.shipping_address || c.billing_address || '',
          city: c.city,
          state: c.state,
          stateCode: c.state_code || '27',
          pincode: c.pincode || c.pin || '',
          paymentTerms: c.payment_terms || 'Net 30',
          creditDays: Number(c.credit_days ?? 30),
          creditLimit: Number(c.credit_limit ?? 1000000),
          salesperson: c.salesperson || '',
          status: c.status || 'Active',
          notes: c.notes || ''
        }));
      }
    } catch (err) {
      console.warn('Database getCustomers error:', err);
    }
    return [];
  }

  async createCustomer(data: any) {
    if (!data.code) {
      const existing = await this.getCustomers();
      const codes = existing.map(e => e.code);
      let maxNum = 0;
      codes.forEach(c => {
        if (c.startsWith('CUST-')) {
          const n = parseInt(c.replace('CUST-', ''), 10);
          if (!isNaN(n) && n > maxNum) maxNum = n;
        }
      });
      data.code = `CUST-${String(maxNum + 1).padStart(4, '0')}`;
    }

    const validated = CustomerMasterSchema.parse(data);
    const id = validated.id || `c-${validated.code}`;

    const record = {
      id,
      code: validated.code,
      name: validated.name,
      legal_name: validated.legalName || '',
      customer_type: validated.customerType,
      contact_person: validated.contactPerson,
      mobile: validated.mobile,
      email: validated.email || '',
      gstin: validated.gstin,
      pan: validated.pan || '',
      billing_address: validated.billingAddress,
      address: validated.billingAddress, // backward compat
      shipping_address: validated.shippingAddress || validated.billingAddress,
      city: validated.city,
      state: validated.state,
      state_code: validated.stateCode || '27',
      pincode: validated.pincode || '',
      pin: validated.pincode || '', // backward compat
      payment_terms: validated.paymentTerms,
      credit_days: validated.creditDays,
      credit_limit: validated.creditLimit,
      salesperson: validated.salesperson || '',
      status: validated.status,
      notes: validated.notes || '',
      updated_at: new Date().toISOString()
    };

    try {
      const { data: created, error } = await this.db
        .from('customer_masters')
        .upsert(record, { onConflict: 'code' })
        .select()
        .single();

      if (!error && created) {
        return {
          id: created.id,
          code: created.code,
          name: created.name,
          legalName: created.legal_name,
          customerType: created.customer_type,
          contactPerson: created.contact_person,
          mobile: created.mobile,
          email: created.email,
          gstin: created.gstin,
          pan: created.pan,
          billingAddress: created.billing_address,
          shippingAddress: created.shipping_address,
          city: created.city,
          state: created.state,
          pincode: created.pincode,
          paymentTerms: created.payment_terms,
          creditDays: Number(created.credit_days),
          creditLimit: Number(created.credit_limit),
          salesperson: created.salesperson,
          status: created.status,
          notes: created.notes
        };
      }
    await logAudit({ actorEmail: 'sales@guruom.in', action: 'CUSTOMER_MASTER_CREATED', entityType: 'customer_masters', entityId: String(validated.code), afterState: { code: validated.code, name: validated.name, city: validated.city, state: validated.state, gstin: validated.gstin }, metadata: { details: `Customer Master ${validated.code} (${validated.name}) created` } }).catch(() => {});

    } catch (err) {
      console.warn('Database createCustomer error:', err);
    }

    return validated;
  }

  // ----------------------------------------------------
  // 3. Vendor Masters
  // ----------------------------------------------------
  async getVendors(onlyActive = false, maskBank = true) {
    try {
      let query = this.db
        .from('vendor_masters')
        .select('*')
        .order('code', { ascending: true });

      if (onlyActive) {
        query = query.eq('status', 'Active');
      }

      const { data, error } = await query;

      if (!error && data && data.length > 0) {
        return data.map(v => {
          const rawAcc = decryptField(v.bank_account_number || '');
          return {
            id: v.id,
            code: v.code,
            name: v.name,
            legalName: v.legal_name || '',
            vendorType: v.vendor_type || 'Supplier',
            vendorCategory: v.vendor_category || 'Raw Material',
            contactPerson: v.contact_person || '',
            mobile: v.mobile || v.contact || '',
            email: v.email || '',
            billingAddress: v.billing_address || v.address || '',
            shippingAddress: v.shipping_address || '',
            city: v.city,
            state: v.state,
            stateCode: v.state_code || '27',
            pincode: v.pincode || v.pin || '',
            gstin: v.gstin || '',
            pan: v.pan || '',
            bankAccountName: v.bank_account_name || '',
            bankAccountNumber: maskBank ? maskAccountNumber(rawAcc) : rawAcc,
            ifsc: v.ifsc || '',
            paymentTerms: v.payment_terms || 'Net 30',
            creditDays: Number(v.credit_days ?? 30),
            creditLimit: Number(v.credit_limit ?? 500000),
            processType: v.process_type || '',
            turnaroundTimeDays: Number(v.turnaround_time_days ?? 0),
            status: v.status || 'Active',
            notes: v.notes || ''
          };
        });
      }
    } catch (err) {
      console.warn('Database getVendors error:', err);
    }
    return [];
  }

  async createVendor(data: any) {
    if (!data.code) {
      const existing = await this.getVendors(false, false);
      const codes = existing.map(e => e.code);
      let maxNum = 0;
      codes.forEach(c => {
        if (c.startsWith('VEND-')) {
          const n = parseInt(c.replace('VEND-', ''), 10);
          if (!isNaN(n) && n > maxNum) maxNum = n;
        }
      });
      data.code = `VEND-${String(maxNum + 1).padStart(4, '0')}`;
    }

    const validated = VendorMasterSchema.parse(data);
    const id = validated.id || `v-${validated.code}`;

    // Encrypt bank account number for database storage
    const encryptedBankAcc = encryptField(validated.bankAccountNumber);

    const record = {
      id,
      code: validated.code,
      name: validated.name,
      legal_name: validated.legalName || '',
      vendor_type: validated.vendorType,
      vendor_category: validated.vendorCategory,
      contact_person: validated.contactPerson,
      mobile: validated.mobile,
      email: validated.email || '',
      billing_address: validated.billingAddress,
      address: validated.billingAddress, // backward compat
      shipping_address: validated.shippingAddress || '',
      city: validated.city,
      state: validated.state,
      state_code: validated.stateCode || '27',
      pincode: validated.pincode || '',
      pin: validated.pincode || '', // backward compat
      gstin: validated.gstin || '',
      pan: validated.pan,
      bank_account_name: validated.bankAccountName,
      bank_account_number: encryptedBankAcc,
      ifsc: validated.ifsc,
      payment_terms: validated.paymentTerms,
      credit_days: validated.creditDays ?? 0,
      credit_limit: validated.creditLimit ?? 0,
      process_type: validated.processType || '',
      turnaround_time_days: validated.turnaroundTimeDays ?? 0,
      status: validated.status,
      notes: validated.notes || '',
      updated_at: new Date().toISOString()
    };

    try {
      const { data: created, error } = await this.db
        .from('vendor_masters')
        .upsert(record, { onConflict: 'code' })
        .select()
        .single();

      if (!error && created) {
        return {
          id: created.id,
          code: created.code,
          name: created.name,
          legalName: created.legal_name,
          vendorType: created.vendor_type,
          vendorCategory: created.vendor_category,
          contactPerson: created.contact_person,
          mobile: created.mobile,
          email: created.email,
          billingAddress: created.billing_address,
          city: created.city,
          state: created.state,
          pincode: created.pincode,
          gstin: created.gstin,
          pan: created.pan,
          bankAccountName: created.bank_account_name,
          bankAccountNumber: maskAccountNumber(validated.bankAccountNumber),
          ifsc: created.ifsc,
          paymentTerms: created.payment_terms,
          creditDays: Number(created.credit_days),
          processType: created.process_type,
          turnaroundTimeDays: Number(created.turnaround_time_days),
          status: created.status,
          notes: created.notes
        };
      }
    } catch (err) {
      console.warn('Database createVendor error:', err);
    }

    await logAudit({ actorEmail: 'purchase@guruom.in', action: 'VENDOR_MASTER_CREATED', entityType: 'vendor_masters', entityId: String(validated.code), afterState: { code: validated.code, name: validated.name, vendorType: validated.vendorType, vendorCategory: validated.vendorCategory, city: validated.city }, metadata: { details: `Vendor Master ${validated.code} (${validated.name}) created` } }).catch(() => {});

    return {
      ...validated,
      bankAccountNumber: maskAccountNumber(validated.bankAccountNumber)
    };
  }

  // ----------------------------------------------------
  // 4. Machine Masters
  // ----------------------------------------------------
  async getMachines(onlyActive = false) {
    try {
      let query = this.db
        .from('machine_masters')
        .select('*')
        .order('code', { ascending: true });

      if (onlyActive) {
        query = query.eq('status', 'Active');
      }

      const { data, error } = await query;

      if (!error && data && data.length > 0) {
        return data.map(m => ({
          id: m.id,
          code: m.code,
          name: m.name,
          type: m.machine_type || m.type || 'CNC Machining',
          department: m.department || 'Machine Shop',
          location: m.location || 'Bay 1',
          manufacturer: m.manufacturer || '',
          model: m.model || '',
          serialNumber: m.serial_number || '',
          installationDate: m.installation_date || '',
          capacity: m.capacity ? Number(m.capacity) : undefined,
          capacityUom: m.capacity_uom || '',
          operatingHours: Number(m.operating_hours ?? 16),
          shift: m.shift || 'General-Day',
          status: m.status || 'Active',
          responsiblePerson: m.responsible_person || '',
          hourlyCost: Number(m.hourly_cost ?? 500),
          active: m.status === 'Active' || m.active === true
        }));
      }
    } catch (err) {
      console.warn('Database getMachines error:', err);
    }
    return [];
  }

  async createMachine(data: any) {
    if (!data.code) {
      const existing = await this.getMachines();
      const codes = existing.map(e => e.code);
      let maxNum = 0;
      codes.forEach(c => {
        if (c.startsWith('MCH-')) {
          const n = parseInt(c.replace('MCH-', ''), 10);
          if (!isNaN(n) && n > maxNum) maxNum = n;
        }
      });
      data.code = `MCH-${String(maxNum + 1).padStart(4, '0')}`;
    }

    const validated = MachineMasterSchema.parse(data);
    const id = validated.id || `mch-${validated.code}`;

    const record = {
      id,
      code: validated.code,
      name: validated.name,
      machine_type: validated.type,
      type: validated.type, // backward compat
      department: validated.department,
      location: validated.location,
      manufacturer: validated.manufacturer || '',
      model: validated.model || '',
      serial_number: validated.serialNumber || '',
      installation_date: validated.installationDate || '',
      capacity: validated.capacity ?? null,
      capacity_uom: validated.capacityUom || '',
      operating_hours: validated.operatingHours,
      shift: validated.shift,
      status: validated.status,
      responsible_person: validated.responsiblePerson || '',
      hourly_cost: validated.hourlyCost ?? 500,
      active: validated.status === 'Active',
      updated_at: new Date().toISOString()
    };

    try {
      const { data: created, error } = await this.db
        .from('machine_masters')
        .upsert(record, { onConflict: 'code' })
        .select()
        .single();

      if (!error && created) {
        return {
          id: created.id,
          code: created.code,
          name: created.name,
          type: created.machine_type || created.type,
          department: created.department,
          location: created.location,
          manufacturer: created.manufacturer,
          model: created.model,
          serialNumber: created.serial_number,
          installationDate: created.installation_date,
          capacity: created.capacity ? Number(created.capacity) : undefined,
          capacityUom: created.capacity_uom,
          operatingHours: Number(created.operating_hours),
          shift: created.shift,
          status: created.status,
          responsiblePerson: created.responsible_person,
          hourlyCost: Number(created.hourly_cost),
          active: created.status === 'Active'
        };
      }
    await logAudit({ actorEmail: 'production@guruom.in', action: 'MACHINE_MASTER_CREATED', entityType: 'machine_masters', entityId: String(validated.code), afterState: { code: validated.code, name: validated.name, type: validated.type, department: validated.department, location: validated.location }, metadata: { details: `Machine Master ${validated.code} (${validated.name}) created` } }).catch(() => {});

    } catch (err) {
      console.warn('Database createMachine error:', err);
    }

    return validated;
  }

  // ----------------------------------------------------
  // 5. User Masters
  // ----------------------------------------------------
  async getUsers(onlyActive = false) {
    try {
      let query = this.db
        .from('users')
        .select('*')
        .order('created_at', { ascending: true });

      if (onlyActive) {
        query = query.in('status', ['Active', 'ACTIVE']);
      }

      const { data, error } = await query;

      if (!error && data && data.length > 0) {
        return data.map(u => ({
          id: u.id,
          userId: u.user_id || `USR-${u.id.slice(0, 4).toUpperCase()}`,
          name: u.full_name,
          fullName: u.full_name,
          employeeCode: u.employee_code || '',
          userRole: u.user_role || u.role || 'Machine Operator',
          role: u.role || 'OPERATOR',
          department: u.department || 'Shop Floor Production',
          mobile: u.mobile || u.phone || '',
          phone: u.mobile || u.phone || '',
          email: u.email,
          accessLevel: u.access_level || 'Edit',
          modulesAccess: u.modules_access || ['production', 'job_cards'],
          reportingManager: u.reporting_manager || '',
          shift: u.shift || 'General-Day',
          status: u.status === 'ACTIVE' ? 'Active' : (u.status === 'INACTIVE' ? 'Inactive' : u.status),
          lastLogin: u.last_login_at ? new Date(u.last_login_at).toLocaleString('en-IN') : 'Recently'
        }));
      }
    } catch (err) {
      console.warn('Database getUsers error:', err);
    }
    return [];
  }

  async createUser(data: any) {
    if (!data.userId) {
      const existing = await this.getUsers();
      const codes = existing.map(e => e.userId).filter(Boolean);
      let maxNum = 0;
      codes.forEach(c => {
        if (c && c.startsWith('USR-')) {
          const n = parseInt(c.replace('USR-', ''), 10);
          if (!isNaN(n) && n > maxNum) maxNum = n;
        }
      });
      data.userId = `USR-${String(maxNum + 1).padStart(4, '0')}`;
    }

    const validated = UserMasterSchema.parse(data);
    const id = validated.id || `usr-${Date.now()}`;

    // Map user_role to internal auth role
    const internalRole = validated.userRole === 'Admin/Owner' ? 'SUPER ADMIN' :
                         validated.userRole.includes('QC') ? 'QC_MANAGER' :
                         validated.userRole.includes('Dispatch') ? 'DISPATCH_CLERK' :
                         validated.userRole.includes('Accounts') ? 'FINANCE_MANAGER' : 'OPERATOR';

    const record = {
      id,
      user_id: validated.userId,
      full_name: validated.fullName,
      email: validated.email.trim().toLowerCase(),
      employee_code: validated.employeeCode || '',
      user_role: validated.userRole,
      role: internalRole,
      department: validated.department,
      mobile: validated.mobile,
      phone: validated.mobile,
      access_level: validated.accessLevel,
      modules_access: validated.modulesAccess,
      reporting_manager: validated.reportingManager || '',
      shift: validated.shift,
      status: validated.status === 'Active' ? 'ACTIVE' : 'INACTIVE',
      password_hash: '$argon2id$v=19$m=65536,p=4,t=3$VgHcmjAIFdBPsWEkHYiakw$b10tFs2HPJOw+wKzZHy9zmayWA34zywOYLZOiqCIqcI', // default temporary password
      updated_at: new Date().toISOString()
    };

    try {
      const { data: created, error } = await this.db
        .from('users')
        .upsert(record, { onConflict: 'email' })
        .select()
        .single();

      if (!error && created) {
        return {
          id: created.id,
          userId: created.user_id,
          name: created.full_name,
          fullName: created.full_name,
          employeeCode: created.employee_code,
          userRole: created.user_role,
          role: created.role,
          department: created.department,
          mobile: created.mobile,
          email: created.email,
          accessLevel: created.access_level,
          modulesAccess: created.modules_access,
          reportingManager: created.reporting_manager,
          shift: created.shift,
          status: created.status === 'ACTIVE' ? 'Active' : 'Inactive'
        };
      }
    } catch (err) {
      console.warn('Database createUser error:', err);
    }

    return validated;
  }

  // ----------------------------------------------------
  // Reference Lookup Helpers (For Salespersons, Managers, Vendors)
  // ----------------------------------------------------
  async getReferenceDropdowns() {
    const [customers, vendors, machines, users] = await Promise.all([
      this.getCustomers(),
      this.getVendors(),
      this.getMachines(),
      this.getUsers()
    ]);

    return {
      salespersons: users.filter(u => u.status === 'Active' && (u.userRole?.includes('Sales') || u.userRole?.includes('Admin') || u.role === 'SUPER ADMIN')),
      reportingManagers: users.filter(u => u.status === 'Active'),
      preferredVendors: vendors.filter(v => v.status === 'Active'),
      responsiblePersons: users.filter(u => u.status === 'Active')
    };
  }

  // ----------------------------------------------------
  // Company Profile
  // ----------------------------------------------------
  async getCompanyProfile() {
    try {
      const { data, error } = await this.db
        .from('company_profile')
        .select('*')
        .eq('id', 'main')
        .single();

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
      console.warn('Database getCompanyProfile error:', err);
    }

    return {
      legalName: 'GuruOm Industries LLP',
      address: 'Plot 42, GIDC Industrial Estate, Metoda, Rajkot, Gujarat - 360021',
      phone: '+91 98250 12345',
      email: 'contact@guruom.in',
      gstin: '24AAAFG1234C1Z9',
      pan: 'AAAFG1234C',
      state: 'Gujarat',
      stateCode: '24'
    };
  }

  async updateCompanyProfile(data: any) {
    const record = {
      id: 'main',
      legal_name: data.legalName,
      address: data.address,
      phone: data.phone,
      email: data.email,
      gstin: data.gstin,
      pan: data.pan,
      state: data.state,
      state_code: data.stateCode,
      updated_at: new Date().toISOString()
    };

    try {
      await this.db
        .from('company_profile')
        .upsert(record, { onConflict: 'id' });
    } catch (err) {
      console.warn('Database updateCompanyProfile error:', err);
    }

    return data;
  }
}

export const mastersService = new MastersService();
