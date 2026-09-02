import { getDbClient } from '../../config/database';
import { z } from 'zod';
import fs from 'fs';
import path from 'path';
import {
  MasterItemSchema,
  CustomerMasterSchema,
  VendorMasterSchema,
  MachineMasterSchema,
  UserMasterSchema
} from './masters.schema';
import { notificationsService } from '../notifications/notifications.service';
import { logAudit } from '../../services/auditLog';
import { auditService } from '../audit/audit.service';
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

  async createMaster(data: any, actorEmail?: string, actorRole?: string) {
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

    const effectiveEmail = (actorEmail && actorEmail.includes('@')) ? actorEmail : (actorEmail || 'masters@guruom.in');
    const effectiveRole = actorRole || 'Store Keeper';

    await auditService.recordAuditLog({
      actorEmail: effectiveEmail,
      actorRole: effectiveRole,
      action: 'ITEM_MASTER_CREATED',
      entityType: 'masters',
      entityId: String(validated.code),
      afterState: { code: validated.code, name: validated.name, itemType: validated.itemType, unit: validated.unit },
      metadata: { details: `Item Master ${validated.code} (${validated.name}) created` }
    }).catch(() => {});

    // Real-Time Push: still announce the item even when the DB write falls back
    notificationsService.broadcastEvent('master_item_created', validated);
    return validated;
  }

  async updateMaster(code: string, data: any) {
    const validated = MasterItemSchema.partial().parse(data);
    const updateRecord: any = { updated_at: new Date().toISOString() };
    if (validated.name !== undefined) updateRecord.name = validated.name;
    if (validated.itemType !== undefined) {
      updateRecord.item_type = validated.itemType;
      updateRecord.is_finished_goods = validated.itemType === 'Finished Good';
    }
    if (validated.category !== undefined) updateRecord.category = validated.category;
    if (validated.description !== undefined) updateRecord.description = validated.description;
    if (validated.partNo !== undefined) updateRecord.part_no = validated.partNo;
    if (validated.unit !== undefined) updateRecord.unit = validated.unit;
    if (validated.hsnCode !== undefined) updateRecord.hsn_code = validated.hsnCode;
    if (validated.gstRate !== undefined) updateRecord.gst_rate = validated.gstRate;
    if (validated.standardCost !== undefined) {
      updateRecord.standard_cost = validated.standardCost;
      updateRecord.purchase_rate = validated.standardCost;
    }
    if (validated.sellingPrice !== undefined) {
      updateRecord.selling_price = validated.sellingPrice;
      updateRecord.sale_rate = validated.sellingPrice;
    }
    if (validated.minStock !== undefined) updateRecord.min_stock = validated.minStock;
    if (validated.maxStock !== undefined) updateRecord.max_stock = validated.maxStock;
    if (validated.reorderLevel !== undefined) updateRecord.reorder_level = validated.reorderLevel;
    if (validated.leadTimeDays !== undefined) updateRecord.lead_time_days = validated.leadTimeDays;
    if (validated.preferredVendor !== undefined) updateRecord.preferred_vendor = validated.preferredVendor;
    if (validated.defaultWarehouse !== undefined) updateRecord.default_warehouse = validated.defaultWarehouse;
    if (validated.storeLocation !== undefined) updateRecord.store_location = validated.storeLocation;
    if (validated.status !== undefined) updateRecord.status = validated.status;

    try {
      const { data: updated, error } = await this.db
        .from('masters')
        .update(updateRecord)
        .eq('code', code)
        .select()
        .single();
      if (!error && updated) {
        notificationsService.broadcastEvent('master_item_updated', updated);
        return updated;
      }
    } catch (err) {
      console.warn('Database updateMaster error:', err);
    }
    await logAudit({ actorEmail: 'masters@guruom.in', action: 'ITEM_MASTER_UPDATED', entityType: 'masters', entityId: code, metadata: { details: `Item Master ${code} updated` } }).catch(() => {});
    return { code, ...validated };
  }

  async deleteMaster(code: string, actorEmail?: string, actorRole?: string) {
    try {
      await this.db.from('masters').delete().eq('code', code);
    } catch (err) {
      console.warn('Database deleteMaster error:', err);
    }

    const effectiveEmail = (actorEmail && actorEmail.includes('@')) ? actorEmail : (actorEmail || 'masters@guruom.in');
    const effectiveRole = actorRole || 'Store Keeper';

    await auditService.recordAuditLog({
      actorEmail: effectiveEmail,
      actorRole: effectiveRole,
      action: 'ITEM_MASTER_DELETED',
      entityType: 'masters',
      entityId: code,
      afterState: null,
      metadata: { details: `Item Master ${code} deleted` }
    }).catch(() => {});

    notificationsService.broadcastEvent('master_item_deleted', { code });
    return { success: true, code };
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

  async createCustomer(data: any, actorEmail?: string, actorRole?: string) {
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

    const effectiveEmail = (actorEmail && actorEmail.includes('@')) ? actorEmail : (actorEmail || 'sales@guruom.in');
    const effectiveRole = actorRole || 'Sales Manager';

    try {
      const { data: created, error } = await this.db
        .from('customer_masters')
        .upsert(record, { onConflict: 'code' })
        .select()
        .single();

      if (!error && created) {
        await auditService.recordAuditLog({
          actorEmail: effectiveEmail,
          actorRole: effectiveRole,
          action: 'CUSTOMER_MASTER_CREATED',
          entityType: 'customer_masters',
          entityId: String(validated.code),
          afterState: { code: validated.code, name: validated.name, city: validated.city, state: validated.state, gstin: validated.gstin },
          metadata: { details: `Customer Master ${validated.code} (${validated.name}) created` }
        }).catch(() => {});

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

      await auditService.recordAuditLog({
        actorEmail: effectiveEmail,
        actorRole: effectiveRole,
        action: 'CUSTOMER_MASTER_CREATED',
        entityType: 'customer_masters',
        entityId: String(validated.code),
        afterState: { code: validated.code, name: validated.name, city: validated.city, state: validated.state, gstin: validated.gstin },
        metadata: { details: `Customer Master ${validated.code} (${validated.name}) created` }
      }).catch(() => {});

    } catch (err) {
      console.warn('Database createCustomer error:', err);
    }

    return validated;
  }

  async updateCustomer(code: string, data: any) {
    const validated = CustomerMasterSchema.partial().parse(data);
    const updateRecord: any = { updated_at: new Date().toISOString() };
    if (validated.name !== undefined) updateRecord.name = validated.name;
    if (validated.legalName !== undefined) updateRecord.legal_name = validated.legalName;
    if (validated.customerType !== undefined) updateRecord.customer_type = validated.customerType;
    if (validated.contactPerson !== undefined) updateRecord.contact_person = validated.contactPerson;
    if (validated.mobile !== undefined) {
      updateRecord.mobile = validated.mobile;
      updateRecord.contact = validated.mobile;
    }
    if (validated.email !== undefined) updateRecord.email = validated.email;
    if (validated.gstin !== undefined) updateRecord.gstin = validated.gstin;
    if (validated.pan !== undefined) updateRecord.pan = validated.pan;
    if (validated.billingAddress !== undefined) {
      updateRecord.billing_address = validated.billingAddress;
      updateRecord.address = validated.billingAddress;
    }
    if (validated.shippingAddress !== undefined) updateRecord.shipping_address = validated.shippingAddress;
    if (validated.city !== undefined) updateRecord.city = validated.city;
    if (validated.state !== undefined) updateRecord.state = validated.state;
    if (validated.stateCode !== undefined) updateRecord.state_code = validated.stateCode;
    if (validated.pincode !== undefined) {
      updateRecord.pincode = validated.pincode;
      updateRecord.pin = validated.pincode;
    }
    if (validated.paymentTerms !== undefined) updateRecord.payment_terms = validated.paymentTerms;
    if (validated.creditDays !== undefined) updateRecord.credit_days = validated.creditDays;
    if (validated.creditLimit !== undefined) updateRecord.credit_limit = validated.creditLimit;
    if (validated.salesperson !== undefined) updateRecord.salesperson = validated.salesperson;
    if (validated.status !== undefined) updateRecord.status = validated.status;
    if (validated.notes !== undefined) updateRecord.notes = validated.notes;

    try {
      const { data: updated, error } = await this.db
        .from('customer_masters')
        .update(updateRecord)
        .eq('code', code)
        .select()
        .single();
      if (!error && updated) {
        notificationsService.broadcastEvent('customer_updated', updated);
        return updated;
      }
    } catch (err) {
      console.warn('Database updateCustomer error:', err);
    }
    await logAudit({ actorEmail: 'sales@guruom.in', action: 'CUSTOMER_MASTER_UPDATED', entityType: 'customer_masters', entityId: code, metadata: { details: `Customer Master ${code} updated` } }).catch(() => {});
    return { code, ...validated };
  }

  async deleteCustomer(code: string, actorEmail?: string, actorRole?: string) {
    try {
      await this.db.from('customer_masters').delete().eq('code', code);
    } catch (err) {
      console.warn('Database deleteCustomer error:', err);
    }

    const effectiveEmail = (actorEmail && actorEmail.includes('@')) ? actorEmail : (actorEmail || 'sales@guruom.in');
    const effectiveRole = actorRole || 'Sales Manager';

    await auditService.recordAuditLog({
      actorEmail: effectiveEmail,
      actorRole: effectiveRole,
      action: 'CUSTOMER_MASTER_DELETED',
      entityType: 'customer_masters',
      entityId: code,
      afterState: null,
      metadata: { details: `Customer Master ${code} deleted` }
    }).catch(() => {});

    notificationsService.broadcastEvent('customer_deleted', { code });
    return { success: true, code };
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

  async createVendor(data: any, actorEmail?: string, actorRole?: string) {
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

    const effectiveEmail = (actorEmail && actorEmail.includes('@')) ? actorEmail : (actorEmail || 'purchase@guruom.in');
    const effectiveRole = actorRole || 'Purchase Manager';

    try {
      const { data: created, error } = await this.db
        .from('vendor_masters')
        .upsert(record, { onConflict: 'code' })
        .select()
        .single();

      if (!error && created) {
        await auditService.recordAuditLog({
          actorEmail: effectiveEmail,
          actorRole: effectiveRole,
          action: 'VENDOR_MASTER_CREATED',
          entityType: 'vendor_masters',
          entityId: String(validated.code),
          afterState: { code: validated.code, name: validated.name, vendorType: validated.vendorType, vendorCategory: validated.vendorCategory, city: validated.city },
          metadata: { details: `Vendor Master ${validated.code} (${validated.name}) created` }
        }).catch(() => {});

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

      await auditService.recordAuditLog({
        actorEmail: effectiveEmail,
        actorRole: effectiveRole,
        action: 'VENDOR_MASTER_CREATED',
        entityType: 'vendor_masters',
        entityId: String(validated.code),
        afterState: { code: validated.code, name: validated.name, vendorType: validated.vendorType, vendorCategory: validated.vendorCategory, city: validated.city },
        metadata: { details: `Vendor Master ${validated.code} (${validated.name}) created` }
      }).catch(() => {});

    } catch (err) {
      console.warn('Database createVendor error:', err);
    }

    return {
      ...validated,
      bankAccountNumber: maskAccountNumber(validated.bankAccountNumber)
    };
  }

  async updateVendor(code: string, data: any) {
    const validated = VendorMasterSchema.partial().parse(data);
    const updateRecord: any = { updated_at: new Date().toISOString() };
    if (validated.name !== undefined) updateRecord.name = validated.name;
    if (validated.legalName !== undefined) updateRecord.legal_name = validated.legalName;
    if (validated.vendorType !== undefined) updateRecord.vendor_type = validated.vendorType;
    if (validated.vendorCategory !== undefined) updateRecord.vendor_category = validated.vendorCategory;
    if (validated.contactPerson !== undefined) updateRecord.contact_person = validated.contactPerson;
    if (validated.mobile !== undefined) {
      updateRecord.mobile = validated.mobile;
      updateRecord.contact = validated.mobile;
    }
    if (validated.email !== undefined) updateRecord.email = validated.email;
    if (validated.billingAddress !== undefined) {
      updateRecord.billing_address = validated.billingAddress;
      updateRecord.address = validated.billingAddress;
    }
    if (validated.shippingAddress !== undefined) updateRecord.shipping_address = validated.shippingAddress;
    if (validated.city !== undefined) updateRecord.city = validated.city;
    if (validated.state !== undefined) updateRecord.state = validated.state;
    if (validated.stateCode !== undefined) updateRecord.state_code = validated.stateCode;
    if (validated.pincode !== undefined) {
      updateRecord.pincode = validated.pincode;
      updateRecord.pin = validated.pincode;
    }
    if (validated.gstin !== undefined) updateRecord.gstin = validated.gstin;
    if (validated.pan !== undefined) updateRecord.pan = validated.pan;
    if (validated.bankAccountName !== undefined) updateRecord.bank_account_name = validated.bankAccountName;
    if (validated.bankAccountNumber !== undefined && !validated.bankAccountNumber.includes('•')) {
      updateRecord.bank_account_number = encryptField(validated.bankAccountNumber);
    }
    if (validated.ifsc !== undefined) updateRecord.ifsc = validated.ifsc;
    if (validated.paymentTerms !== undefined) updateRecord.payment_terms = validated.paymentTerms;
    if (validated.creditDays !== undefined) updateRecord.credit_days = validated.creditDays;
    if (validated.creditLimit !== undefined) updateRecord.credit_limit = validated.creditLimit;
    if (validated.processType !== undefined) updateRecord.process_type = validated.processType;
    if (validated.turnaroundTimeDays !== undefined) updateRecord.turnaround_time_days = validated.turnaroundTimeDays;
    if (validated.status !== undefined) updateRecord.status = validated.status;
    if (validated.notes !== undefined) updateRecord.notes = validated.notes;

    try {
      const { data: updated, error } = await this.db
        .from('vendor_masters')
        .update(updateRecord)
        .eq('code', code)
        .select()
        .single();
      if (!error && updated) {
        notificationsService.broadcastEvent('vendor_updated', updated);
        return updated;
      }
    } catch (err) {
      console.warn('Database updateVendor error:', err);
    }
    await logAudit({ actorEmail: 'purchase@guruom.in', action: 'VENDOR_MASTER_UPDATED', entityType: 'vendor_masters', entityId: code, metadata: { details: `Vendor Master ${code} updated` } }).catch(() => {});
    return { code, ...validated };
  }

  async deleteVendor(code: string, actorEmail?: string, actorRole?: string) {
    try {
      await this.db.from('vendor_masters').delete().eq('code', code);
    } catch (err) {
      console.warn('Database deleteVendor error:', err);
    }

    const effectiveEmail = (actorEmail && actorEmail.includes('@')) ? actorEmail : (actorEmail || 'purchase@guruom.in');
    const effectiveRole = actorRole || 'Purchase Manager';

    await auditService.recordAuditLog({
      actorEmail: effectiveEmail,
      actorRole: effectiveRole,
      action: 'VENDOR_MASTER_DELETED',
      entityType: 'vendor_masters',
      entityId: code,
      afterState: null,
      metadata: { details: `Vendor Master ${code} deleted` }
    }).catch(() => {});

    notificationsService.broadcastEvent('vendor_deleted', { code });
    return { success: true, code };
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

  async createMachine(data: any, actorEmail?: string, actorRole?: string) {
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

    const effectiveEmail = (actorEmail && actorEmail.includes('@')) ? actorEmail : (actorEmail || 'production@guruom.in');
    const effectiveRole = actorRole || 'Plant Head';

    try {
      const { data: created, error } = await this.db
        .from('machine_masters')
        .upsert(record, { onConflict: 'code' })
        .select()
        .single();

      if (!error && created) {
        await auditService.recordAuditLog({
          actorEmail: effectiveEmail,
          actorRole: effectiveRole,
          action: 'MACHINE_MASTER_CREATED',
          entityType: 'machine_masters',
          entityId: String(validated.code),
          afterState: { code: validated.code, name: validated.name, type: validated.type, department: validated.department, location: validated.location },
          metadata: { details: `Machine Master ${validated.code} (${validated.name}) created` }
        }).catch(() => {});

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

      await auditService.recordAuditLog({
        actorEmail: effectiveEmail,
        actorRole: effectiveRole,
        action: 'MACHINE_MASTER_CREATED',
        entityType: 'machine_masters',
        entityId: String(validated.code),
        afterState: { code: validated.code, name: validated.name, type: validated.type, department: validated.department, location: validated.location },
        metadata: { details: `Machine Master ${validated.code} (${validated.name}) created` }
      }).catch(() => {});

    } catch (err) {
      console.warn('Database createMachine error:', err);
    }

    return validated;
  }

  async updateMachine(code: string, data: any) {
    const validated = MachineMasterSchema.partial().parse(data);
    const updateRecord: any = { updated_at: new Date().toISOString() };
    if (validated.name !== undefined) updateRecord.name = validated.name;
    if (validated.type !== undefined) {
      updateRecord.machine_type = validated.type;
      updateRecord.type = validated.type;
    }
    if (validated.department !== undefined) updateRecord.department = validated.department;
    if (validated.location !== undefined) updateRecord.location = validated.location;
    if (validated.manufacturer !== undefined) updateRecord.manufacturer = validated.manufacturer;
    if (validated.model !== undefined) updateRecord.model = validated.model;
    if (validated.serialNumber !== undefined) updateRecord.serial_number = validated.serialNumber;
    if (validated.installationDate !== undefined) updateRecord.installation_date = validated.installationDate;
    if (validated.capacity !== undefined) updateRecord.capacity = validated.capacity;
    if (validated.capacityUom !== undefined) updateRecord.capacity_uom = validated.capacityUom;
    if (validated.operatingHours !== undefined) updateRecord.operating_hours = validated.operatingHours;
    if (validated.shift !== undefined) updateRecord.shift = validated.shift;
    if (validated.status !== undefined) {
      updateRecord.status = validated.status;
      updateRecord.active = validated.status === 'Active';
    }
    if (validated.responsiblePerson !== undefined) updateRecord.responsible_person = validated.responsiblePerson;
    if (validated.hourlyCost !== undefined) updateRecord.hourly_cost = validated.hourlyCost;

    try {
      const { data: updated, error } = await this.db
        .from('machine_masters')
        .update(updateRecord)
        .eq('code', code)
        .select()
        .single();
      if (!error && updated) {
        notificationsService.broadcastEvent('machine_updated', updated);
        return updated;
      }
    } catch (err) {
      console.warn('Database updateMachine error:', err);
    }
    await logAudit({ actorEmail: 'production@guruom.in', action: 'MACHINE_MASTER_UPDATED', entityType: 'machine_masters', entityId: code, metadata: { details: `Machine Master ${code} updated` } }).catch(() => {});
    return { code, ...validated };
  }

  async deleteMachine(code: string, actorEmail?: string, actorRole?: string) {
    try {
      await this.db.from('machine_masters').delete().eq('code', code);
    } catch (err) {
      console.warn('Database deleteMachine error:', err);
    }

    const effectiveEmail = (actorEmail && actorEmail.includes('@')) ? actorEmail : (actorEmail || 'production@guruom.in');
    const effectiveRole = actorRole || 'Plant Head';

    await auditService.recordAuditLog({
      actorEmail: effectiveEmail,
      actorRole: effectiveRole,
      action: 'MACHINE_MASTER_DELETED',
      entityType: 'machine_masters',
      entityId: code,
      afterState: null,
      metadata: { details: `Machine Master ${code} deleted` }
    }).catch(() => {});

    notificationsService.broadcastEvent('machine_deleted', { code });
    return { success: true, code };
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

  async createUser(data: any, actorEmail?: string, actorRole?: string) {
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

    const effectiveEmail = (actorEmail && actorEmail.includes('@')) ? actorEmail : (actorEmail || 'admin@guruom.in');
    const effectiveRole = actorRole || 'Admin (System)';

    try {
      const { data: created, error } = await this.db
        .from('users')
        .upsert(record, { onConflict: 'email' })
        .select()
        .single();

      if (!error && created) {
        await auditService.recordAuditLog({
          actorEmail: effectiveEmail,
          actorRole: effectiveRole,
          action: 'USER_CREATED',
          entityType: 'users',
          entityId: String(validated.userId || id),
          afterState: { userId: validated.userId, fullName: validated.fullName, email: validated.email, userRole: validated.userRole, internalRole, department: validated.department },
          metadata: { details: `User ${validated.fullName} (${validated.email}) created with assigned role '${validated.userRole}' in department ${validated.department}` }
        }).catch(() => {});

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

      await auditService.recordAuditLog({
        actorEmail: effectiveEmail,
        actorRole: effectiveRole,
        action: 'USER_CREATED',
        entityType: 'users',
        entityId: String(validated.userId || id),
        afterState: { userId: validated.userId, fullName: validated.fullName, email: validated.email, userRole: validated.userRole, internalRole, department: validated.department },
        metadata: { details: `User ${validated.fullName} (${validated.email}) created with assigned role '${validated.userRole}' in department ${validated.department}` }
      }).catch(() => {});

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
  // Company Profile Persistence Helpers
  // ----------------------------------------------------
  private inMemoryCompanyProfile: any = null;

  private getProfileFilePath(): string {
    const dataDir = path.resolve(process.cwd(), 'backend', 'data');
    if (!fs.existsSync(dataDir)) {
      try {
        fs.mkdirSync(dataDir, { recursive: true });
      } catch (_) {}
    }
    return path.join(dataDir, 'company_profile.json');
  }

  private readProfileFromFile(): any | null {
    try {
      const filePath = this.getProfileFilePath();
      if (fs.existsSync(filePath)) {
        const raw = fs.readFileSync(filePath, 'utf-8');
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object' && parsed.legalName) {
          return parsed;
        }
      }
    } catch (e) {
      console.warn('Failed to read company_profile from disk:', e);
    }
    return null;
  }

  private writeProfileToFile(data: any): void {
    try {
      const filePath = this.getProfileFilePath();
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
    } catch (e) {
      console.warn('Failed to write company_profile to disk:', e);
    }
  }

  // ----------------------------------------------------
  // Company Profile
  // ----------------------------------------------------
  async getCompanyProfile() {
    // 1. Try DB first
    try {
      const { data, error } = await this.db
        .from('company_profile')
        .select('*')
        .eq('id', 'main')
        .single();

      if (!error && data) {
        const profile = {
          legalName: data.legal_name,
          address: data.address,
          phone: data.phone,
          email: data.email,
          gstin: data.gstin,
          pan: data.pan,
          state: data.state,
          stateCode: data.state_code
        };
        this.inMemoryCompanyProfile = profile;
        return profile;
      }
    } catch (err) {
      console.warn('Database getCompanyProfile error:', err);
    }

    // 2. Try disk storage
    const diskProfile = this.readProfileFromFile();
    if (diskProfile) {
      this.inMemoryCompanyProfile = diskProfile;
      return diskProfile;
    }

    // 3. Try in-memory cache
    if (this.inMemoryCompanyProfile) {
      return this.inMemoryCompanyProfile;
    }

    // 4. Default fallback
    const defaultProfile = {
      legalName: 'GuruOm Industries LLP',
      address: 'Plot No. 42, MIDC Industrial Area, Bhosari, Pune, Maharashtra - 411026',
      phone: '+91 20 2712 3456',
      email: 'operations@guruom.in',
      gstin: '27AABCG1234F1Z5',
      pan: 'AABCG1234F',
      state: 'Maharashtra',
      stateCode: '27'
    };
    this.inMemoryCompanyProfile = defaultProfile;
    return defaultProfile;
  }

  async updateCompanyProfile(data: any) {
    const formatted = {
      legalName: data.legalName || 'GuruOm Industries LLP',
      address: data.address || '',
      phone: data.phone || '',
      email: data.email || '',
      gstin: data.gstin || '',
      pan: data.pan || '',
      state: data.state || 'Gujarat',
      stateCode: data.stateCode || '24'
    };

    // 1. Write to memory and disk immediately for zero-delay persistence
    this.inMemoryCompanyProfile = formatted;
    this.writeProfileToFile(formatted);

    // 2. Write to DB
    const record = {
      id: 'main',
      legal_name: formatted.legalName,
      address: formatted.address,
      phone: formatted.phone,
      email: formatted.email,
      gstin: formatted.gstin,
      pan: formatted.pan,
      state: formatted.state,
      state_code: formatted.stateCode,
      updated_at: new Date().toISOString()
    };

    try {
      await this.db
        .from('company_profile')
        .upsert(record, { onConflict: 'id' });
    } catch (err) {
      console.warn('Database updateCompanyProfile error:', err);
    }

    // 3. Broadcast real-time SSE event to all connected clients
    notificationsService.broadcastEvent('company_profile_updated', formatted);

    // 4. Audit Log
    await logAudit({
      actorEmail: 'admin@guruom.in',
      action: 'COMPANY_PROFILE_UPDATED',
      entityType: 'settings',
      entityId: 'company_profile',
      afterState: formatted,
      metadata: { details: `Company profile updated: ${formatted.legalName} (${formatted.gstin})` }
    }).catch(() => {});

    return formatted;
  }
}

export const mastersService = new MastersService();
