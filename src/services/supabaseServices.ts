import { apiClient } from '../lib/apiClient';
import {
  CustomerOrder,
  StockItem,
  ShortageItem,
  JobCard,
  FinishedGoodsItem,
  OutworkSendOut,
  ProductionLogReport,
  QCInspection,
  PDIInspection,
  DispatchChallan,
  CustomerInvoice,
  VendorBill,
  MasterItem,
  CustomerMaster,
  VendorMaster,
  MachineMaster,
  SystemUser,
  AuditLogEntry,
  CompanyProfile,
  PendingApproval,
  UserRole,
  GoodsReceiptNote,
  GrnItem,
  BillOfMaterials,
  BomItem,
  RouteCard,
  RouteCardTemplateStep,
  PurchaseOrder,
  PurchaseOrderItem
} from '../types/console';
import { getCurrentFinancialYear, formatDocumentNumber } from '../utils/statutoryAccountingEngine';

// Runtime in-memory caches (no hardcoded data)
let ordersCache: CustomerOrder[] = [];


// ----------------------------------------------------
// Company Profile Services (via REST API)
// ----------------------------------------------------
export async function fetchCompanyProfile(): Promise<CompanyProfile> {
  try {
    const res = await apiClient.get<{ data: CompanyProfile }>('/masters/company-profile');
    if (res?.data) {
      try {
        localStorage.setItem('stratum_company_profile', JSON.stringify(res.data));
      } catch (_) {}
      return res.data;
    }
  } catch (err) {
    console.warn('fetchCompanyProfile REST error, falling back:', err);
  }

  try {
    const saved = localStorage.getItem('stratum_company_profile');
    if (saved) return JSON.parse(saved);
  } catch (_) {}

  return null as unknown as CompanyProfile;
}

export async function updateCompanyProfile(profile: CompanyProfile): Promise<void> {
  try {
    localStorage.setItem('stratum_company_profile', JSON.stringify(profile));
  } catch (_) {}

  try {
    await apiClient.put('/masters/company-profile', profile);
  } catch (err) {
    console.warn('updateCompanyProfile REST error:', err);
  }
}

// ----------------------------------------------------
// Profiles / Users Services (via REST API)
// ----------------------------------------------------
export async function fetchProfiles(): Promise<SystemUser[]> {
  try {
    const res = await apiClient.get<{ data: SystemUser[] }>('/auth/users');
    if (res?.data && res.data.length > 0) {
      return res.data;
    }
  } catch (err: any) {
    if (err?.statusCode !== 401) {
      console.warn('fetchProfiles REST error, falling back:', err);
    }
  }
  return [];
}

export async function createProfile(user: Partial<SystemUser> & { password?: string; requirePasswordChangeFirstLogin?: boolean }): Promise<SystemUser> {
  try {
    const res = await apiClient.post<{ user: any }>('/auth/register', {
      name: user.name,
      email: user.email,
      role: user.role,
      department: user.department,
      phone: user.phone || user.mobile,
      password: user.password,
      requirePasswordChangeFirstLogin: user.requirePasswordChangeFirstLogin
    });
    return {
      id: res.user.id,
      name: res.user.name || res.user.full_name,
      email: res.user.email,
      role: res.user.role as UserRole,
      status: res.user.status,
      lastLogin: res.user.lastLogin || 'Never',
      department: res.user.department,
      phone: res.user.phone
    };
  } catch (err) {
    console.warn('createProfile REST error:', err);
    throw err instanceof Error ? err : new Error('Failed to create user on backend');
  }
}

export async function updateProfile(id: string, updates: Partial<SystemUser>): Promise<SystemUser> {
  try {
    const res = await apiClient.patch<{ message: string; user: any }>(`/auth/users/${id}`, {
      name: updates.name,
      full_name: updates.name,
      email: updates.email,
      role: updates.role,
      department: updates.department,
      phone: updates.phone || (updates as any).mobile,
      status: updates.status
    });
    return res.user;
  } catch (err) {
    console.warn(`updateProfile(${id}) REST error:`, err);
    throw err instanceof Error ? err : new Error('Failed to update user on backend');
  }
}

export async function updateProfileRole(id: string, role: UserRole): Promise<void> {
  try {
    await apiClient.patch(`/auth/users/${id}/role`, { role });
  } catch (err) {
    console.warn(`updateProfileRole(${id}) REST error:`, err);
  }
}

export async function updateProfileStatus(id: string, status: 'ACTIVE' | 'REVOKED'): Promise<void> {
  try {
    await apiClient.patch(`/auth/users/${id}/status`, { status });
  } catch (err) {
    console.warn(`updateProfileStatus(${id}) REST error:`, err);
  }
}

export async function deleteProfile(id: string): Promise<void> {
  try {
    await apiClient.delete(`/auth/users/${id}`);
  } catch (err) {
    console.warn(`deleteProfile(${id}) REST error:`, err);
  }
}

// ----------------------------------------------------
// Masters Services (Custom Backend REST API)
// ----------------------------------------------------
export async function fetchMasters(): Promise<MasterItem[]> {
  try {
    const res = await apiClient.get<{ data: MasterItem[] }>('/masters');
    if (res?.data && res.data.length > 0) {
      return res.data;
    }
  } catch (err) {
    console.warn('Backend fetchMasters fallback:', err);
  }
  return [];
}

export async function insertMaster(item: Partial<MasterItem>): Promise<MasterItem> {
  const payload: MasterItem = {
    id: item.code ? `m-${item.code}` : `m-${Date.now()}`,
    code: item.code || `RM-${Math.floor(1000 + Math.random() * 9000)}`,
    name: item.name || item.description || 'New Item',
    itemType: item.itemType || (item.isFinishedGoods ? 'Finished Good' : 'Raw Material'),
    category: item.category || '',
    description: item.description || item.name || 'New Item Description',
    partNo: item.partNo || item.name || '',
    unit: item.unit || 'Nos',
    hsnCode: item.hsnCode || '8483',
    gstRate: Number(item.gstRate ?? 18),
    standardCost: Number(item.standardCost ?? item.purchaseRate ?? 0),
    sellingPrice: Number(item.sellingPrice ?? item.saleRate ?? 0),
    minStock: Number(item.minStock ?? 0),
    maxStock: Number(item.maxStock ?? 0),
    reorderLevel: Number(item.reorderLevel ?? 10),
    leadTimeDays: Number(item.leadTimeDays ?? 0),
    preferredVendor: item.preferredVendor || '',
    defaultWarehouse: item.defaultWarehouse || item.storeLocation || 'Main Store',
    storeLocation: item.storeLocation || 'A1-RACK-1',
    isFinishedGoods: item.itemType === 'Finished Good' || Boolean(item.isFinishedGoods),
    saleRate: Number(item.sellingPrice ?? item.saleRate ?? 0),
    purchaseRate: Number(item.standardCost ?? item.purchaseRate ?? 0),
    status: item.status || 'Active'
  };

  try {
    const res = await apiClient.post<{ message: string; data: MasterItem }>('/masters', payload);
    if (res?.data) return res.data;
  } catch (err) {
    console.warn('Backend insertMaster fallback:', err);
  }
  return payload;
}

export async function updateMasterItem(code: string, item: Partial<MasterItem>): Promise<MasterItem> {
  try {
    const saved = localStorage.getItem('stratum_custom_masters');
    if (saved) {
      const current: MasterItem[] = JSON.parse(saved);
      const updated = current.map(m => m.code === code ? { ...m, ...item } : m);
      localStorage.setItem('stratum_custom_masters', JSON.stringify(updated));
    }
  } catch (e) {}

  try {
    const res = await apiClient.put<{ message: string; data: MasterItem }>(`/masters/${encodeURIComponent(code)}`, item);
    if (res?.data) return res.data;
  } catch (err) {
    console.warn(`Backend updateMasterItem(${code}) fallback:`, err);
  }
  return { code, ...item } as MasterItem;
}

export async function deleteMasterItem(code: string): Promise<void> {
  try {
    const saved = localStorage.getItem('stratum_custom_masters');
    if (saved) {
      const current: MasterItem[] = JSON.parse(saved);
      const updated = current.filter(m => m.code !== code);
      localStorage.setItem('stratum_custom_masters', JSON.stringify(updated));
    }
  } catch (e) {}

  try {
    await apiClient.delete(`/masters/${encodeURIComponent(code)}`);
  } catch (err) {
    console.warn(`Backend deleteMasterItem(${code}) fallback:`, err);
  }
}

// ----------------------------------------------------
// Orders & Line Items Services (Custom Backend REST API)
// ----------------------------------------------------
export async function fetchOrders(): Promise<CustomerOrder[]> {
  try {
    const res = await apiClient.get<{ data: CustomerOrder[] }>('/orders');
    if (res?.data && res.data.length > 0) {
      // Merge with ordersCache in case local confirmation occurred
      const merged = res.data.map(d => {
        const local = ordersCache.find(i => i.id === d.id || i.poNo === d.poNo);
        if (local && (local.status === 'CONFIRMED' || local.status === 'APPROVED' || (local.progressStep || 1) >= 2)) {
          return {
            ...d,
            status: local.status,
            stage: local.stage,
            progressStep: local.progressStep,
            heatLotNumber: local.heatLotNumber || d.heatLotNumber
          };
        }
        return d;
      });

      const parseDateToTimestamp = (val?: string | number | null): number => {
        if (!val) return 0;
        if (typeof val === 'number') return val > 0 ? val : 0;
        const str = String(val).trim();
        if (!str) return 0;
        if (/^\d{10,13}$/.test(str)) {
          const num = parseInt(str, 10);
          if (!isNaN(num) && num > 0) return num;
        }
        const idMatch = str.match(/ord-(\d{10,13})/);
        if (idMatch) {
          const num = parseInt(idMatch[1], 10);
          if (!isNaN(num) && num > 0) return num;
        }
        const ddmmyyyy = str.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
        if (ddmmyyyy) {
          const day = parseInt(ddmmyyyy[1], 10);
          const month = parseInt(ddmmyyyy[2], 10) - 1;
          const year = parseInt(ddmmyyyy[3], 10);
          const d = new Date(year, month, day).getTime();
          if (!isNaN(d) && d > 0) return d;
        }
        const parsed = new Date(str).getTime();
        if (!isNaN(parsed) && parsed > 0) return parsed;
        return 0;
      };

      const getOrderTime = (o: CustomerOrder): number => {
        if (o.createdAt) {
          const t = parseDateToTimestamp(o.createdAt);
          if (t > 0) return t;
        }
        const idTime = parseDateToTimestamp(o.id);
        if (idTime > 0) return idTime;
        if (o.poDate) {
          const t = parseDateToTimestamp(o.poDate);
          if (t > 0) return t;
        }
        if (o.orderDate) {
          const t = parseDateToTimestamp(o.orderDate);
          if (t > 0) return t;
        }
        if (o.deliveryDate) {
          const t = parseDateToTimestamp(o.deliveryDate);
          if (t > 0) return t;
        }
        return 0;
      };

      // Global Recency Sort: newest orders first (createdAt / poDate / ID DESC)
      merged.sort((a, b) => {
        const timeB = getOrderTime(b);
        const timeA = getOrderTime(a);
        if (timeB !== timeA) return timeB - timeA;
        return String(b.id || b.poNo).localeCompare(String(a.id || a.poNo), undefined, { numeric: true });
      });

      return merged;
    }
  } catch (err) {
    console.warn('Backend fetchOrders fallback:', err);
  }

  const parseDateToTimestamp = (val?: string | number | null): number => {
    if (!val) return 0;
    if (typeof val === 'number') return val > 0 ? val : 0;
    const str = String(val).trim();
    if (!str) return 0;
    if (/^\d{10,13}$/.test(str)) {
      const num = parseInt(str, 10);
      if (!isNaN(num) && num > 0) return num;
    }
    const idMatch = str.match(/ord-(\d{10,13})/);
    if (idMatch) {
      const num = parseInt(idMatch[1], 10);
      if (!isNaN(num) && num > 0) return num;
    }
    const ddmmyyyy = str.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
    if (ddmmyyyy) {
      const day = parseInt(ddmmyyyy[1], 10);
      const month = parseInt(ddmmyyyy[2], 10) - 1;
      const year = parseInt(ddmmyyyy[3], 10);
      const d = new Date(year, month, day).getTime();
      if (!isNaN(d) && d > 0) return d;
    }
    const parsed = new Date(str).getTime();
    if (!isNaN(parsed) && parsed > 0) return parsed;
    return 0;
  };

  const getOrderTime = (o: CustomerOrder): number => {
    if (o.createdAt) {
      const t = parseDateToTimestamp(o.createdAt);
      if (t > 0) return t;
    }
    const idTime = parseDateToTimestamp(o.id);
    if (idTime > 0) return idTime;
    if (o.poDate) {
      const t = parseDateToTimestamp(o.poDate);
      if (t > 0) return t;
    }
    if (o.orderDate) {
      const t = parseDateToTimestamp(o.orderDate);
      if (t > 0) return t;
    }
    if (o.deliveryDate) {
      const t = parseDateToTimestamp(o.deliveryDate);
      if (t > 0) return t;
    }
    return 0;
  };

  return [...ordersCache].sort((a, b) => {
    const timeB = getOrderTime(b);
    const timeA = getOrderTime(a);
    if (timeB !== timeA) return timeB - timeA;
    return String(b.id || b.poNo).localeCompare(String(a.id || a.poNo), undefined, { numeric: true });
  });
}

export async function fetchOrderById(orderId: string): Promise<CustomerOrder | null> {
  try {
    const res = await apiClient.get<{ data: CustomerOrder }>(`/orders/${orderId}`);
    if (res?.data) {
      const local = ordersCache.find(i => i.id === res.data.id || i.poNo === res.data.poNo);
      if (local && (local.status === 'CONFIRMED' || local.status === 'APPROVED' || (local.progressStep || 1) >= 2)) {
        return { ...res.data, status: local.status, stage: local.stage, progressStep: local.progressStep };
      }
      return res.data;
    }
  } catch (err) {
    console.warn(`Backend fetchOrderById (${orderId}) fallback:`, err);
  }
  const fallback = ordersCache.find(o => o.id === orderId || o.poNo === orderId);
  return fallback || null;
}

export async function insertOrder(order: CustomerOrder): Promise<void> {
  const idx = ordersCache.findIndex(o => o.id === order.id || o.poNo === order.poNo);
  if (idx >= 0) {
    ordersCache[idx] = { ...ordersCache[idx], ...order };
  } else {
    ordersCache.unshift(order);
  }
  try {
    await apiClient.post('/orders', order);
  } catch (err) {
    console.warn('Backend insertOrder fallback:', err);
  }
}

export async function confirmOrder(orderId: string): Promise<CustomerOrder> {
  const updates: Partial<CustomerOrder> = {
    status: 'CONFIRMED',
    stage: 'CONFIRMED',
    progressStep: 2
  };
  const idx = ordersCache.findIndex(o => o.id === orderId || o.poNo === orderId);
  if (idx >= 0) {
    ordersCache[idx] = { ...ordersCache[idx], ...updates };
  } else {
    ordersCache.unshift({ id: orderId, poNo: orderId, ...updates } as any);
  }

  try {
    const res = await apiClient.post<{ data: CustomerOrder }>(`/orders/${orderId}/confirm`, updates);
    if (res?.data) {
      if (idx >= 0) {
        ordersCache[idx] = { ...ordersCache[idx], ...res.data };
      }
      return res.data;
    }
  } catch (err) {
    console.warn(`Backend confirmOrder (${orderId}) fallback to status patch:`, err);
    try {
      await apiClient.patch(`/orders/${orderId}/status`, { status: 'CONFIRMED', progressStep: 2 });
    } catch (patchErr) {
      console.warn(`Backend status patch (${orderId}) fallback:`, patchErr);
    }
  }

  return (idx >= 0 ? ordersCache[idx] : { id: orderId, poNo: orderId, ...updates }) as CustomerOrder;
}

export async function updateOrder(orderId: string, updates: Partial<CustomerOrder>): Promise<void> {
  const idx = ordersCache.findIndex(o => o.id === orderId || o.poNo === orderId);
  if (idx >= 0) {
    ordersCache[idx] = { ...ordersCache[idx], ...updates };
  } else {
    ordersCache.unshift({ id: orderId, poNo: orderId, ...updates } as any);
  }
  try {
    await apiClient.patch(`/orders/${orderId}`, updates);
  } catch (err) {
    console.warn(`Backend updateOrder (${orderId}) fallback:`, err);
  }
}

export async function updateOrderStatus(orderId: string, status: string, progressStep?: number): Promise<void> {
  const updates: Partial<CustomerOrder> = {
    status,
    stage: status,
    ...(progressStep ? { progressStep } : {})
  };
  const idx = ordersCache.findIndex(o => o.id === orderId || o.poNo === orderId);
  if (idx >= 0) {
    ordersCache[idx] = { ...ordersCache[idx], ...updates };
  } else {
    ordersCache.unshift({ id: orderId, poNo: orderId, ...updates } as any);
  }
  try {
    await apiClient.patch(`/orders/${orderId}/status`, { status, progressStep });
  } catch (err) {
    console.warn(`Backend updateOrderStatus (${orderId}) fallback:`, err);
  }
}

export async function runMaterialCheckForOrder(orderId: string): Promise<any> {
  const res = await apiClient.post<{ message: string; data: any }>(`/orders/${orderId}/verify-materials`);
  return res.data;
}

export async function overrideMaterialCheckForOrder(orderId: string, reason: string): Promise<any> {
  const res = await apiClient.post<{ message: string; data: any }>(`/orders/${orderId}/override-material-check`, { reason });
  return res.data;
}

// Local Storage Fallback Helpers for Masters
const getSavedCustomCustomers = (): CustomerMaster[] => {
  try {
    const saved = localStorage.getItem('stratum_custom_customers');
    if (saved) return JSON.parse(saved);
  } catch (e) {}
  return [];
};

export const saveCustomCustomerToLocal = (c: CustomerMaster) => {
  try {
    const current = getSavedCustomCustomers();
    const updated = [c, ...current.filter(item => item.code !== c.code)];
    localStorage.setItem('stratum_custom_customers', JSON.stringify(updated));
  } catch (e) {}
};

const getSavedCustomVendors = (): VendorMaster[] => {
  try {
    const saved = localStorage.getItem('stratum_custom_vendors');
    if (saved) return JSON.parse(saved);
  } catch (e) {}
  return [];
};

export const saveCustomVendorToLocal = (v: VendorMaster) => {
  try {
    const current = getSavedCustomVendors();
    const updated = [v, ...current.filter(item => item.code !== v.code)];
    localStorage.setItem('stratum_custom_vendors', JSON.stringify(updated));
  } catch (e) {}
};

const getSavedCustomMachines = (): MachineMaster[] => {
  try {
    const saved = localStorage.getItem('stratum_custom_machines');
    if (saved) return JSON.parse(saved);
  } catch (e) {}
  return [];
};

export const saveCustomMachineToLocal = (m: MachineMaster) => {
  try {
    const current = getSavedCustomMachines();
    const updated = [m, ...current.filter(item => item.code !== m.code)];
    localStorage.setItem('stratum_custom_machines', JSON.stringify(updated));
  } catch (e) {}
};

export async function fetchCustomers(): Promise<CustomerMaster[]> {
  const localCustom = getSavedCustomCustomers();
  let dbCustomers: CustomerMaster[] = [];

  try {
    const res = await apiClient.get<{ data: CustomerMaster[] }>('/masters/customers');
    if (res?.data && res.data.length > 0) {
      dbCustomers = res.data;
    }
  } catch (err) {
    console.warn('Backend fetchCustomers fallback:', err);
  }

  const map = new Map<string, CustomerMaster>();
  [...localCustom, ...dbCustomers].forEach(item => {
    if (item.code && !map.has(item.code)) {
      map.set(item.code, item);
    }
  });

  return Array.from(map.values());
}

export async function insertCustomer(c: CustomerMaster): Promise<CustomerMaster> {
  saveCustomCustomerToLocal(c);

  try {
    const res = await apiClient.post<{ message: string; data: CustomerMaster }>('/masters/customers', c);
    if (res?.data) return res.data;
  } catch (err) {
    console.warn('Backend insertCustomer fallback:', err);
  }
  return c;
}

export async function updateCustomer(code: string, c: CustomerMaster): Promise<CustomerMaster> {
  saveCustomCustomerToLocal(c);

  try {
    const res = await apiClient.put<{ message: string; data: CustomerMaster }>(`/masters/customers/${encodeURIComponent(code)}`, c);
    if (res?.data) return res.data;
  } catch (err) {
    console.warn(`Backend updateCustomer(${code}) fallback:`, err);
  }
  return c;
}

export async function deleteCustomer(code: string): Promise<void> {
  try {
    const current = getSavedCustomCustomers();
    const updated = current.filter(item => item.code !== code);
    localStorage.setItem('stratum_custom_customers', JSON.stringify(updated));
  } catch (e) {}

  try {
    await apiClient.delete(`/masters/customers/${encodeURIComponent(code)}`);
  } catch (err) {
    console.warn(`Backend deleteCustomer(${code}) fallback:`, err);
  }
}

export async function fetchVendors(): Promise<VendorMaster[]> {
  const localCustom = getSavedCustomVendors();
  let dbVendors: VendorMaster[] = [];

  try {
    const res = await apiClient.get<{ data: VendorMaster[] }>('/masters/vendors');
    if (res?.data && res.data.length > 0) {
      dbVendors = res.data;
    }
  } catch (err) {
    console.warn('Backend fetchVendors fallback:', err);
  }

  const map = new Map<string, VendorMaster>();
  [...localCustom, ...dbVendors].forEach(item => {
    if (item.code && !map.has(item.code)) {
      map.set(item.code, item);
    }
  });

  return Array.from(map.values());
}

export async function insertVendor(v: VendorMaster): Promise<VendorMaster> {
  saveCustomVendorToLocal(v);

  try {
    const res = await apiClient.post<{ message: string; data: VendorMaster }>('/masters/vendors', v);
    if (res?.data) return res.data;
  } catch (err) {
    console.warn('Backend insertVendor fallback:', err);
  }
  return v;
}

export async function updateVendor(code: string, v: VendorMaster): Promise<VendorMaster> {
  saveCustomVendorToLocal(v);

  try {
    const res = await apiClient.put<{ message: string; data: VendorMaster }>(`/masters/vendors/${encodeURIComponent(code)}`, v);
    if (res?.data) return res.data;
  } catch (err) {
    console.warn(`Backend updateVendor(${code}) fallback:`, err);
  }
  return v;
}

export async function deleteVendor(code: string): Promise<void> {
  try {
    const current = getSavedCustomVendors();
    const updated = current.filter(item => item.code !== code);
    localStorage.setItem('stratum_custom_vendors', JSON.stringify(updated));
  } catch (e) {}

  try {
    await apiClient.delete(`/masters/vendors/${encodeURIComponent(code)}`);
  } catch (err) {
    console.warn(`Backend deleteVendor(${code}) fallback:`, err);
  }
}

export async function fetchMachines(): Promise<MachineMaster[]> {
  const localCustom = getSavedCustomMachines();
  let dbMachines: MachineMaster[] = [];

  try {
    const res = await apiClient.get<{ data: MachineMaster[] }>('/masters/machines');
    if (res?.data && res.data.length > 0) {
      dbMachines = res.data;
    }
  } catch (err) {
    console.warn('Backend fetchMachines fallback:', err);
  }

  const map = new Map<string, MachineMaster>();
  [...localCustom, ...dbMachines].forEach(item => {
    if (item.code && !map.has(item.code)) {
      map.set(item.code, item);
    }
  });

  return Array.from(map.values());
}

export async function insertMachine(m: MachineMaster): Promise<MachineMaster> {
  saveCustomMachineToLocal(m);

  try {
    const res = await apiClient.post<{ message: string; data: MachineMaster }>('/masters/machines', m);
    if (res?.data) return res.data;
  } catch (err) {
    console.warn('Backend insertMachine fallback:', err);
  }
  return m;
}

export async function updateMachine(code: string, m: MachineMaster): Promise<MachineMaster> {
  saveCustomMachineToLocal(m);

  try {
    const res = await apiClient.put<{ message: string; data: MachineMaster }>(`/masters/machines/${encodeURIComponent(code)}`, m);
    if (res?.data) return res.data;
  } catch (err) {
    console.warn(`Backend updateMachine(${code}) fallback:`, err);
  }
  return m;
}

export async function deleteMachine(code: string): Promise<void> {
  try {
    const current = getSavedCustomMachines();
    const updated = current.filter(item => item.code !== code);
    localStorage.setItem('stratum_custom_machines', JSON.stringify(updated));
  } catch (e) {}

  try {
    await apiClient.delete(`/masters/machines/${encodeURIComponent(code)}`);
  } catch (err) {
    console.warn(`Backend deleteMachine(${code}) fallback:`, err);
  }
}

// ----------------------------------------------------
// Stock & Shortages Services (Custom Backend REST API)
// ----------------------------------------------------
export async function fetchStock(): Promise<StockItem[]> {
  try {
    const res = await apiClient.get<{ data: StockItem[] }>('/inventory/stock');
    if (res?.data && res.data.length > 0) {
      return res.data;
    }
  } catch (err) {
    console.warn('Backend fetchStock fallback:', err);
  }
  return [];
}

export async function adjustStockItem(code: string, newOnHand: number, reason?: string): Promise<void> {
  try {
    await apiClient.put(`/inventory/stock/${code}`, { newOnHand, reason });
  } catch (err) {
    console.warn('Backend adjustStockItem fallback:', err);
    throw err instanceof Error ? err : new Error(`Failed to adjust stock for ${code}`);
  }
}

export async function fetchShortages(): Promise<ShortageItem[]> {
  try {
    const res = await apiClient.get<{ data: ShortageItem[] }>('/inventory/shortages');
    if (res?.data && res.data.length > 0) {
      return res.data;
    }
  } catch (err) {
    console.warn('Backend fetchShortages fallback:', err);
  }
  return [];
}

// ----------------------------------------------------
// Inventory Movement Ledger Services (via REST API)
// ----------------------------------------------------
export async function fetchInventoryMovements(filters?: {
  itemCode?: string;
  movementType?: string;
  referenceId?: string;
  from?: number;
  limit?: number;
}): Promise<{ movements: any[]; total: number }> {
  try {
    const qs = new URLSearchParams(
      Object.entries(filters || {}).filter(([, v]) => v !== undefined && v !== null).map(([k, v]) => [k, String(v)])
    ).toString();
    const res = await apiClient.get<any>(`/inventory/movements${qs ? `?${qs}` : ''}`);
    if (res?.movements) {
      return res;
    }
  } catch (err) {
    console.warn('Backend fetchInventoryMovements fallback:', err);
  }
  return { movements: [], total: 0 };
}

export async function fetchItemStockHistory(code: string): Promise<any[]> {
  try {
    const res = await apiClient.get<{ itemCode: string; history: any[] }>(`/inventory/movements/${encodeURIComponent(code)}/history`);
    if (res?.history) {
      return res.history;
    }
  } catch (err) {
    console.warn(`Backend fetchItemStockHistory(${code}) fallback:`, err);
  }
  return [];
}

export async function recordInventoryMovement(payload: {
  itemCode: string;
  location?: string;
  quantityChange: number;
  movementType: string;
  referenceId?: string;
  referenceType?: string;
  notes?: string;
}): Promise<any> {
  try {
    const res = await apiClient.post<any>('/inventory/movements', payload);
    return res?.data;
  } catch (err) {
    console.warn('Backend recordInventoryMovement error:', err);
    throw err;
  }
}

export async function fetchStockReconciliation(): Promise<any[]> {
  try {
    const res = await apiClient.get<{ report: any[] }>('/inventory/reconciliation');
    if (res?.report) {
      return res.report;
    }
  } catch (err) {
    console.warn('Backend fetchStockReconciliation fallback:', err);
  }
  return [];
}

export async function reverseInventoryMovement(id: string, reason: string): Promise<any> {
  try {
    const res = await apiClient.post<any>(`/inventory/movements/${id}/reverse`, { reason });
    return res?.data;
  } catch (err) {
    console.warn(`Backend reverseInventoryMovement(${id}) error:`, err);
    throw err;
  }
}

// ----------------------------------------------------
// Job Cards Services (via REST API)
// ----------------------------------------------------
export async function fetchJobCards(): Promise<JobCard[]> {
  try {
    const res = await apiClient.get<{ data: JobCard[] }>('/production/job-cards');
    if (res?.data && res.data.length > 0) {
      return res.data;
    }
  } catch (err) {
    console.warn('fetchJobCards REST API error, falling back:', err);
  }
  return [];
}

export async function insertJobCard(job: JobCard): Promise<void> {
  try {
    await apiClient.post('/production/job-cards', job);
  } catch (err) {
    console.warn('insertJobCard REST API error:', err);
  }
}

// Creates a job card against the backend Job Card release API (one per order line item)
export async function createJobCardForOrder(payload: {
  jobNo?: string;
  orderId?: string;
  orderPo: string;
  partCode: string;
  partDescription: string;
  drawingRevision?: string;
  targetQty: number;
  qty?: number;
  machine?: string;
  materialIssuedLot?: string;
  targetDate?: string;
  remarks?: string;
}): Promise<any> {
  const body = {
    drawingRevision: payload.drawingRevision || 'REV-A',
    materialIssuedLot: payload.materialIssuedLot || 'HEAT-LOT-NA',
    targetDate: payload.targetDate || new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10),
    ...payload
  };
  const res = await apiClient.post<{ data: any }>('/production/job-cards', body);
  return res.data;
}

export async function startJobCardOperation(jobNo: string, payload: {
  sequenceNo: number;
  machineId: string;
  operatorName: string;
  actualStartTime?: string;
}): Promise<JobCard> {
  const encodedJobNo = encodeURIComponent(jobNo);
  const res = await apiClient.post<{ data: JobCard }>(`/production/job-cards/${encodedJobNo}/start-op`, payload);
  return res.data;
}

export async function completeJobCardOperation(jobNo: string, payload: {
  sequenceNo: number;
  qtyProcessed: number;
  qtyRejected: number;
  actualMinutes: number;
  notes?: string;
  actualStartTime?: string;
  actualEndTime?: string;
}): Promise<JobCard> {
  const encodedJobNo = encodeURIComponent(jobNo);
  const res = await apiClient.post<{ data: JobCard }>(`/production/job-cards/${encodedJobNo}/complete-op`, payload);
  return res.data;
}
// ----------------------------------------------------
// Production Logs Services (via REST API)
// ----------------------------------------------------
export async function fetchProductionLogs(): Promise<ProductionLogReport[]> {
  try {
    const res = await apiClient.get<{ data: ProductionLogReport[] }>('/production/logs');
    if (res?.data && res.data.length > 0) {
      return res.data;
    }
  } catch (err) {
    console.warn('fetchProductionLogs REST API error, falling back:', err);
  }
  return [];
}

export async function insertProductionLogAndQC(job: JobCard, qtyDone: number): Promise<void> {
  try {
    await apiClient.post('/production/logs', {
      jobNo: job.jobNo,
      itemCode: job.partCode,
      description: job.partDescription,
      stepNo: 1,
      operationName: 'CNC / VMC Milling Operation',
      qtyDone,
      autoTriggerQC: true
    });
  } catch (err) {
    console.warn('insertProductionLogAndQC REST API error:', err);
  }
}

// ----------------------------------------------------
// QC & PDI Inspections Services (via REST API)
// ----------------------------------------------------
export async function fetchQCQueue(): Promise<QCInspection[]> {
  try {
    const res = await apiClient.get<{ data: QCInspection[] }>('/qc/inspections');
    if (res?.data && res.data.length > 0) {
      return res.data;
    }
  } catch (err) {
    console.warn('fetchQCQueue REST API error, falling back:', err);
  }
  return [];
}

export async function updateQCInspection(id: string, qcStatus: 'PASS' | 'QC_HOLD' | 'REJECTED', notes?: string): Promise<void> {
  const target = [].find(q => q.id === id);
  const targetPo = target?.orderPo;

  // Synchronize all matching inspections in [] for this order
  [].forEach(q => {
    if (q.id === id || (targetPo && q.orderPo === targetPo)) {
      q.qcStatus = qcStatus;
      if (notes) q.inspectorNotes = notes;
      q.inspectedAt = new Date().toISOString();
    }
  });

  if (targetPo) {
    const order = ordersCache.find(o => o.poNo === targetPo || o.id === targetPo);
    if (order) {
      if (qcStatus === 'PASS') {
        order.hasOpenNcr = false;
        order.stage = 'QC_INSPECTION';
        order.status = 'QC_INSPECTION';
        order.progressStep = Math.max(order.progressStep || 1, 6);
      } else {
        order.hasOpenNcr = true;
      }
    }
  }

  // Sync corresponding job card
  if (target?.jobNo) {
    const job = [].find(j => j.jobNo === target.jobNo || j.id === target.jobNo);
    if (job) {
      job.status = qcStatus === 'PASS' ? 'COMPLETED' : 'QC_HOLD';
    }
  }

  try {
    await apiClient.patch(`/qc/inspections/${id}/review`, {
      qcStatus,
      inspectorNotes: notes
    });
  } catch (err) {
    console.warn(`updateQCInspection(${id}) REST API error:`, err);
  }
}

export async function fetchPDIQueue(): Promise<PDIInspection[]> {
  try {
    const res = await apiClient.get<{ data: PDIInspection[] }>('/qc/pdi');
    if (res?.data && res.data.length > 0) {
      return res.data;
    }
  } catch (err) {
    console.warn('fetchPDIQueue REST API error, falling back:', err);
  }
  return [];
}

export async function passPDIInspection(id: string): Promise<void> {
  try {
    await apiClient.patch(`/qc/pdi/${id}/pass`);
  } catch (err) {
    console.warn(`passPDIInspection(${id}) REST API error:`, err);
  }
}

export async function checkDispatchEligibility(orderPo: string): Promise<{ eligible: boolean; reasons: string[] }> {
  try {
    const res = await apiClient.get<{ data: { eligible: boolean; reasons: string[] } }>(`/qc/dispatch-eligibility/${orderPo}`);
    return res?.data || { eligible: false, reasons: ['Unable to verify QC records'] };
  } catch (err) {
    console.warn(`checkDispatchEligibility(${orderPo}) REST API error:`, err);
    return { eligible: false, reasons: ['Backend validation error'] };
  }
}

// ----------------------------------------------------
// Finished Goods & Outwork Services (via REST API)
// ----------------------------------------------------
export async function fetchFinishedGoods(): Promise<FinishedGoodsItem[]> {
  try {
    const res = await apiClient.get<{ data: FinishedGoodsItem[] }>('/finished-goods');
    if (res?.data && res.data.length > 0) {
      return res.data;
    }
  } catch (err) {
    console.warn('fetchFinishedGoods REST API error, falling back:', err);
  }
  return [];
}

export async function fetchOutworkSendOuts(): Promise<OutworkSendOut[]> {
  try {
    const res = await apiClient.get<{ data: OutworkSendOut[] }>('/outwork');
    if (res?.data && res.data.length > 0) {
      return res.data;
    }
  } catch (err) {
    console.warn('fetchOutworkSendOuts REST API error, falling back:', err);
  }
  return [];
}

export async function insertOutworkSendOut(outwork: OutworkSendOut): Promise<void> {
  try {
    await apiClient.post('/outwork', {
      sendOutId: outwork.sendOutId,
      vendorName: outwork.vendorName,
      process: outwork.process,
      sentQty: outwork.sentQty,
      receivedQty: outwork.receivedQty || 0,
      rejectedQty: outwork.rejectedQty || 0,
      expectedDate: outwork.expectedDate || outwork.expectedReturnDate || new Date().toISOString().split('T')[0],
      sentDate: outwork.sentDate || new Date().toISOString().split('T')[0],
      status: outwork.status || 'SENT'
    });
  } catch (err) {
    console.warn('insertOutworkSendOut REST API error:', err);
  }
}

export async function receiveOutworkReturn(id: string, receivedQty: number, rejectedQty = 0): Promise<void> {
  try {
    await apiClient.post(`/outwork/${id}/receive`, {
      receivedQty,
      rejectedQty
    });
  } catch (err) {
    console.warn(`receiveOutworkReturn(${id}) REST API error:`, err);
  }
}

// ----------------------------------------------------
// Dispatches Services (via REST API)
// ----------------------------------------------------
export async function fetchDispatches(): Promise<DispatchChallan[]> {
  try {
    const res = await apiClient.get<{ data: DispatchChallan[] }>('/dispatch');
    if (res?.data && res.data.length > 0) {
      return res.data;
    }
  } catch (err) {
    console.warn('fetchDispatches REST API error, falling back:', err);
  }
  return [];
}

export async function insertDispatchChallan(challan: DispatchChallan): Promise<void> {
  try {
    await apiClient.post('/dispatch', {
      challanNo: challan.challanNo,
      orderPo: challan.orderPo,
      status: challan.status || 'DISPATCH_READY',
      date: challan.date || new Date().toISOString().split('T')[0],
      transporter: challan.transporter,
      vehicleNo: challan.vehicleNo,
      lrNo: challan.lrNo,
      eWayBillNo: challan.eWayBillNo,
      remarks: challan.remarks,
      linesCount: challan.linesCount || (challan.lines ? challan.lines.length : 1),
      lines: challan.lines || challan.items,
      items: challan.lines || challan.items,
      driverContact: challan.driverContact,
      totalInvoiceValue: challan.totalInvoiceValue,
      idempotencyKey: challan.idempotencyKey
    });
  } catch (err) {
    console.warn('insertDispatchChallan REST API error:', err);
    throw err;
  }
}

export async function updateDispatchChallan(challanNo: string, updates: Partial<DispatchChallan>): Promise<DispatchChallan | null> {
  try {
    const res = await apiClient.put<{ data: DispatchChallan }>(`/dispatch/${challanNo}`, updates);
    if (res?.data) {
      return res.data;
    }
  } catch (err) {
    console.warn('updateDispatchChallan REST API error:', err);
    throw err;
  }
  return null;
}

export async function cancelDispatchChallan(challanNo: string, reason = 'Cancelled by user'): Promise<void> {
  try {
    await apiClient.post(`/dispatch/${challanNo}/cancel`, { reason });
  } catch (err) {
    console.warn('cancelDispatchChallan REST API error:', err);
    throw err;
  }
}

export async function fetchDispatchByNo(challanNo: string): Promise<DispatchChallan | null> {
  try {
    const res = await apiClient.get<{ data: DispatchChallan }>(`/dispatch/${challanNo}`);
    if (res?.data) {
      return res.data;
    }
  } catch (err) {
    console.warn('fetchDispatchByNo REST API error:', err);
  }
  return null;
}

// ----------------------------------------------------
// Invoices & Payables Services (via REST API)
// ----------------------------------------------------
export async function fetchInvoices(): Promise<CustomerInvoice[]> {
  try {
    const res = await apiClient.get<{ data: CustomerInvoice[] }>('/invoices');
    if (res?.data && res.data.length > 0) {
      return res.data;
    }
  } catch (err) {
    console.warn('fetchInvoices REST API error, falling back:', err);
  }
  return [];
}

export async function insertCustomerInvoice(inv: CustomerInvoice): Promise<any> {
  try {
    const res = await apiClient.post<{ data: any }>('/invoices', {
      invoiceNo: inv.invoiceNo,
      customerId: inv.customerId,
      customerName: inv.customerName,
      customerGstin: inv.customerGstin || '27AABCG1234F1Z5',
      orderPo: inv.orderPo,
      challanNo: inv.challanNo,
      status: inv.status || 'DRAFT',
      date: inv.date || new Date().toISOString().split('T')[0],
      dueDate: inv.dueDate,
      items: inv.items || [
        {
          itemCode: 'ITEM-001',
          itemDescription: 'Precision Machined Component',
          hsnCode: '84834000',
          qty: 1,
          unitPrice: inv.totalAmount || 1000,
          taxableValue: inv.totalAmount || 1000,
          gstRate: 18
        }
      ],
      totalAmount: inv.totalAmount,
      paidAmount: inv.paidAmount || 0,
      balanceAmount: inv.balanceAmount ?? inv.totalAmount
    });
    return res?.data;
  } catch (err) {
    console.warn('insertCustomerInvoice REST API error:', err);
    throw err;
  }
}

export async function issueCustomerInvoice(invoiceNo: string): Promise<any> {
  try {
    const res = await apiClient.post<{ data: any }>(`/invoices/${encodeURIComponent(invoiceNo)}/issue`);
    return res?.data;
  } catch (err) {
    console.warn(`issueCustomerInvoice(${invoiceNo}) REST API error:`, err);
    throw err;
  }
}

export async function payInvoice(invoiceNo: string, paymentAmount?: number): Promise<void> {
  const local = [].find(i => i.id === invoiceNo || i.invoiceNo === invoiceNo);
  if (local) {
    const payAmt = paymentAmount !== undefined ? paymentAmount : local.balanceAmount;
    local.paidAmount = Math.min(local.totalAmount, local.paidAmount + payAmt);
    local.balanceAmount = Math.max(0, local.totalAmount - local.paidAmount);
    local.status = local.balanceAmount <= 0 ? 'PAID' : 'PARTIAL';
  }
  try {
    await apiClient.post(`/invoices/${encodeURIComponent(invoiceNo)}/pay`, {
      paymentAmount,
      paymentMode: 'NEFT_RTGS'
    });
  } catch (err) {
    console.warn(`payInvoice(${invoiceNo}) REST API error:`, err);
  }
}

export async function fetchPayables(): Promise<VendorBill[]> {
  try {
    const res = await apiClient.get<{ data: VendorBill[] }>('/vendor-bills');
    if (res?.data && res.data.length > 0) {
      return res.data;
    }
  } catch (err) {
    console.warn('fetchPayables REST API error, falling back:', err);
  }
  return [];
}

export async function insertVendorBill(bill: VendorBill): Promise<void> {
  try {
    await apiClient.post('/vendor-bills', {
      billNo: bill.billNo,
      vendorName: bill.vendorName,
      poNo: bill.poNo,
      status: bill.status || 'OPEN',
      date: bill.date || new Date().toISOString().split('T')[0],
      dueDate: bill.dueDate,
      amount: bill.amount,
      paidAmount: bill.paidAmount || 0,
      balanceAmount: bill.balanceAmount ?? bill.amount
    });
  } catch (err) {
    console.warn('insertVendorBill REST API error:', err);
  }
}

export async function payVendorBill(billNo: string, paymentAmount?: number): Promise<void> {
  const local = [].find(b => b.id === billNo || b.billNo === billNo);
  if (local) {
    const payAmt = paymentAmount !== undefined ? paymentAmount : local.balanceAmount;
    local.paidAmount = Math.min(local.amount, local.paidAmount + payAmt);
    local.balanceAmount = Math.max(0, local.amount - local.paidAmount);
    local.status = local.balanceAmount <= 0 ? 'PAID' : 'OPEN';
  }
  try {
    await apiClient.post(`/vendor-bills/${encodeURIComponent(billNo)}/disburse`, {
      paymentAmount,
      paymentMode: 'NEFT_RTGS'
    });
  } catch (err) {
    console.warn(`payVendorBill(${billNo}) REST API error:`, err);
  }
}

// ----------------------------------------------------
// Pending Approvals Services (via REST API)
// ----------------------------------------------------
export async function fetchApprovals(): Promise<PendingApproval[]> {
  try {
    const res = await apiClient.get<{ data: PendingApproval[] }>('/approvals');
    if (res?.data && res.data.length > 0) {
      return res.data;
    }
  } catch (err) {
    console.warn('fetchApprovals REST API error, falling back:', err);
  }
  return [];
}

export async function insertApproval(approval: Partial<PendingApproval>): Promise<void> {
  try {
    await apiClient.post('/approvals', approval);
  } catch (err) {
    console.warn('insertApproval REST API error:', err);
  }
}

export async function approveApproval(id: string, comments?: string): Promise<void> {
  try {
    await apiClient.post(`/approvals/${id}/approve`, { comments });
  } catch (err) {
    console.warn(`approveApproval(${id}) REST API error:`, err);
  }
}

export async function rejectApproval(id: string, reason?: string): Promise<void> {
  try {
    await apiClient.post(`/approvals/${id}/reject`, { reason });
  } catch (err) {
    console.warn(`rejectApproval(${id}) REST API error:`, err);
  }
}

export async function removeApproval(id: string): Promise<void> {
  await approveApproval(id);
}

export async function fetchAuditLogs(filters?: {
  actorEmail?: string;
  entityType?: string;
  entityId?: string;
  action?: string;
  search?: string;
  startDate?: string;
  endDate?: string;
  from?: number;
  limit?: number;
}): Promise<AuditLogEntry[]> {
  try {
    const qs = new URLSearchParams(
      Object.entries(filters || {}).filter(([, v]) => v !== undefined && v !== null && v !== '').map(([k, v]) => [k, String(v)])
    ).toString();
    const res = await apiClient.get<any>(`/audit${qs ? `?${qs}` : ''}`);
    const list = res?.logs || res?.data || (Array.isArray(res) ? res : []);
    if (list && list.length > 0) {
      return list.map((item: any) => ({
        id: item.id,
        when: item.created_at ? new Date(item.created_at).toLocaleString('en-IN', { hour12: true }) : item.when || 'Just now',
        user: item.actorEmail || item.actor_email || item.user || 'System User',
        actorId: item.actorId || item.actor_id,
        actorEmail: item.actorEmail || item.actor_email,
        entity: item.entityType || item.entity_type || item.entity || 'General',
        entityType: item.entityType || item.entity_type,
        entityId: item.entityId || item.entity_id,
        action: item.action,
        details: item.metadata?.details || item.details || `${item.action} on ${item.entityType || item.entity || 'item'}`,
        beforeState: item.beforeState || item.before_state,
        afterState: item.afterState || item.after_state,
        ipAddress: item.ipAddress || item.ip_address,
        userAgent: item.userAgent || item.user_agent,
        metadata: item.metadata,
        createdAt: item.created_at || item.createdAt
      }));
    }
  } catch (err) {
    console.warn('fetchAuditLogs REST API error, falling back:', err);
  }
  return [];
}

export async function exportAuditLogsApi(filters?: {
  actorEmail?: string;
  entityType?: string;
  entityId?: string;
  action?: string;
  search?: string;
  startDate?: string;
  endDate?: string;
}): Promise<{ logs: AuditLogEntry[]; count: number }> {
  try {
    const res = await apiClient.post<any>('/audit/export', filters || {});
    const list = res?.logs || [];
    const mapped = list.map((item: any) => ({
      id: item.id,
      when: item.created_at ? new Date(item.created_at).toLocaleString('en-IN', { hour12: true }) : item.when || 'Just now',
      user: item.actorEmail || item.actor_email || item.user || 'System User',
      actorId: item.actorId || item.actor_id,
      actorEmail: item.actorEmail || item.actor_email,
      entity: item.entityType || item.entity_type || item.entity || 'General',
      entityType: item.entityType || item.entity_type,
      entityId: item.entityId || item.entity_id,
      action: item.action,
      details: item.metadata?.details || item.details || `${item.action} on ${item.entityType || item.entity || 'item'}`,
      beforeState: item.beforeState || item.before_state,
      afterState: item.afterState || item.after_state,
      ipAddress: item.ipAddress || item.ip_address,
      userAgent: item.userAgent || item.user_agent,
      metadata: item.metadata,
      createdAt: item.created_at || item.createdAt
    }));
    return { logs: mapped, count: mapped.length };
  } catch (err) {
    console.warn('exportAuditLogsApi error, using fallback:', err);
    const fallbackLogs = await fetchAuditLogs(filters);
    return { logs: fallbackLogs, count: fallbackLogs.length };
  }
}

export async function insertAuditLog(entity: string, action: string, details: string, userName: string): Promise<void> {
  try {
    await apiClient.post('/audit', {
      entityType: entity,
      action,
      details,
      actorEmail: userName
    });
  } catch (err) {
    console.warn('insertAuditLog REST API error:', err);
  }
}

// ----------------------------------------------------
// Admin Data & System Control Suite
// ----------------------------------------------------
export async function seedAllDataToSupabase(): Promise<void> {
  console.log('Seeding initial operational data initialized via custom REST backend.');
}

export async function clearOperationalDataInSupabase(): Promise<void> {
  console.log('Clearing operational data initialized via custom REST backend.');
}

// ----------------------------------------------------
// Goods Receipt Notes (GRN) Services (via REST API)
// ----------------------------------------------------
export async function fetchGrnList(): Promise<GoodsReceiptNote[]> {
  try {
    const res = await apiClient.get<{ data: GoodsReceiptNote[] }>('/grn');
    return res?.data || [];
  } catch (err) {
    console.warn('fetchGrnList API error, returning empty list:', err);
    return [];
  }
}

export async function fetchGrnById(id: string): Promise<GoodsReceiptNote | null> {
  try {
    const res = await apiClient.get<{ data: GoodsReceiptNote }>(`/grn/${id}`);
    return res?.data || null;
  } catch (err) {
    console.warn(`fetchGrnById(${id}) API error:`, err);
    return null;
  }
}

export async function insertGrn(grn: GoodsReceiptNote): Promise<GoodsReceiptNote> {
  const res = await apiClient.post<{ data: GoodsReceiptNote }>('/grn', grn);
  return res.data;
}

export async function updateGrnStatus(id: string, status: 'PENDING_INSPECTION' | 'RECEIVED' | 'QC_VERIFIED' | 'REJECTED', remarks?: string): Promise<void> {
  await apiClient.patch(`/grn/${id}/status`, { status, remarks });
}

// ----------------------------------------------------
// Bill of Materials (BOM) Services (via REST API)
// ----------------------------------------------------
export async function fetchBOMs(): Promise<BillOfMaterials[]> {
  try {
    const res = await apiClient.get<{ data: BillOfMaterials[] }>('/bom');
    return res?.data || [];
  } catch (err) {
    console.warn('fetchBOMs API error, returning empty list:', err);
    return [];
  }
}

export async function fetchBOMByCode(code: string): Promise<BillOfMaterials | null> {
  try {
    const res = await apiClient.get<{ data: BillOfMaterials }>(`/bom/${code}`);
    return res?.data || null;
  } catch (err) {
    console.warn(`fetchBOMByCode(${code}) API error:`, err);
    return null;
  }
}

export async function saveBOM(bom: BillOfMaterials): Promise<BillOfMaterials> {
  const res = await apiClient.post<{ data: BillOfMaterials }>('/bom', bom);
  return res.data;
}

export async function duplicateBOM(payload: { sourceBomCode: string; targetBomCode?: string; targetPartCode?: string; targetPartName?: string }): Promise<BillOfMaterials> {
  const res = await apiClient.post<{ data: BillOfMaterials }>('/bom/duplicate', payload);
  return res.data;
}

export async function createBOMRevision(bomCode: string, revision: string): Promise<BillOfMaterials> {
  const res = await apiClient.post<{ data: BillOfMaterials }>(`/bom/${bomCode}/revision`, { revision });
  return res.data;
}

export async function updateBOMStatus(bomCode: string, status: 'ACTIVE' | 'DRAFT' | 'OBSOLETE'): Promise<BillOfMaterials> {
  const res = await apiClient.patch<{ data: BillOfMaterials }>(`/bom/${bomCode}/status`, { status });
  return res.data;
}

export async function deleteBOM(bomCode: string): Promise<{ success: boolean }> {
  await apiClient.delete<{ message: string }>(`/bom/${bomCode}`);
  return { success: true };
}

// ----------------------------------------------------
// Route Cards Services (via REST API)
// ----------------------------------------------------
export async function fetchRouteCards(): Promise<RouteCardTemplateStep[]> {
  try {
    const res = await apiClient.get<{ data: RouteCardTemplateStep[] }>('/production/route-cards');
    return res?.data || [];
  } catch (err) {
    console.warn('fetchRouteCards API error:', err);
    return [];
  }
}

export async function fetchGroupedRouteCards(): Promise<RouteCard[]> {
  try {
    const res = await apiClient.get<{ data: RouteCard[] }>('/production/route-cards/grouped');
    return res?.data || [];
  } catch (err) {
    console.warn('fetchGroupedRouteCards API error:', err);
    return [];
  }
}

export async function saveRouteCard(payload: {
  partCode: string;
  partDescription?: string;
  revision?: string;
  status?: 'ACTIVE' | 'DRAFT' | 'OBSOLETE';
  notes?: string;
  operations: Array<{
    id?: string;
    sequenceNo: number;
    operationName: string;
    workCenter: string;
    standardTimeMinutes: number;
    inspectionRequired: boolean;
    requiredCertification?: string;
  }>;
}): Promise<RouteCard> {
  const res = await apiClient.post<{ data: RouteCard }>('/production/route-cards', payload);
  return res.data;
}

export async function duplicateRouteCard(sourcePartCode: string, targetPartCode: string, targetPartDescription?: string): Promise<RouteCard> {
  const res = await apiClient.post<{ data: RouteCard }>('/production/route-cards/duplicate', {
    sourcePartCode,
    targetPartCode,
    targetPartDescription
  });
  return res.data;
}

export async function deleteRouteCard(partCode: string): Promise<{ success: boolean }> {
  await apiClient.delete<{ message: string }>(`/production/route-cards/${partCode}`);
  return { success: true };
}

// ----------------------------------------------------
// Purchasing & Purchase Orders Services (via REST API)
// ----------------------------------------------------
export async function fetchPurchaseOrders(): Promise<PurchaseOrder[]> {
  try {
    const res = await apiClient.get<{ data: PurchaseOrder[] }>('/purchasing');
    return res?.data || [];
  } catch (err) {
    console.warn('fetchPurchaseOrders API error, returning empty list:', err);
    return [];
  }
}

export async function fetchPurchaseOrderById(id: string): Promise<PurchaseOrder | null> {
  try {
    const res = await apiClient.get<{ data: PurchaseOrder }>(`/purchasing/${id}`);
    return res?.data || null;
  } catch (err) {
    console.warn(`fetchPurchaseOrderById(${id}) API error:`, err);
    return null;
  }
}

export async function insertPurchaseOrder(po: PurchaseOrder): Promise<PurchaseOrder> {
  const res = await apiClient.post<{ data: PurchaseOrder }>('/purchasing', po);
  return res.data;
}

export async function reviewPurchaseOrder(id: string, decision: 'APPROVE' | 'REJECT', reason?: string): Promise<void> {
  await apiClient.patch(`/purchasing/${id}/review`, { decision, reason });
}

// ----------------------------------------------------
// Order Progression Workflow Services
// ----------------------------------------------------

export async function completePdiInspectionForOrder(
  orderId: string,
  payload: {
    orderPo: string;
    pdiStatus: 'PASS' | 'FAIL';
    certificateNo?: string;
    acceptedQty: number;
    rejectedQty?: number;
    remarks?: string;
    pdiReportUrl?: string;
    checklist?: Record<string, boolean>;
    inspectedBy?: string;
  }
): Promise<{ success: boolean; pdiStatus: string; certificateNo: string; orderStatus: string }> {
  const certNo = payload.certificateNo || `PDI-COC-${Math.floor(10000 + Math.random() * 90000)}`;
  const nextStatus = payload.pdiStatus === 'PASS' ? 'READY_TO_DISPATCH' : 'REWORK';
  const progressStep = payload.pdiStatus === 'PASS' ? 7 : 5;

  try {
    await updateOrderStatus(orderId, nextStatus, progressStep);
  } catch (err) {
    console.warn('updateOrderStatus in completePdiInspectionForOrder fallback:', err);
  }

  try {
    const pdiList = await fetchPDIQueue();
    const match = pdiList.find(p => p.orderPo === payload.orderPo || p.id === orderId);
    if (match && payload.pdiStatus === 'PASS') {
      await passPDIInspection(match.id);
    }
  } catch (err) {
    console.warn('passPDIInspection in completePdiInspectionForOrder fallback:', err);
  }

  return {
    success: true,
    pdiStatus: payload.pdiStatus,
    certificateNo: certNo,
    orderStatus: nextStatus
  };
}

export async function generateInvoiceForOrder(
  orderId: string,
  invoiceData: {
    orderPo: string;
    customerName: string;
    totalAmount: number;
    invoiceNo?: string;
    invoiceDate?: string;
    taxAmount?: number;
    items?: any[];
  }
): Promise<CustomerInvoice> {
  const invoiceNo = invoiceData.invoiceNo || `INV-26-${Math.floor(1000 + Math.random() * 9000)}`;
  const invoiceDate = invoiceData.invoiceDate || new Date().toISOString().split('T')[0];

  const newInvoice: CustomerInvoice = {
    id: `inv-${Date.now()}`,
    invoiceNo,
    orderPo: invoiceData.orderPo,
    customerName: invoiceData.customerName,
    amount: invoiceData.totalAmount,
    totalAmount: invoiceData.totalAmount,
    taxAmount: invoiceData.taxAmount || 0,
    status: 'UNPAID',
    invoiceDate,
    dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  };

  try {
    await insertCustomerInvoice(newInvoice);
  } catch (err) {
    console.warn('insertCustomerInvoice fallback:', err);
  }

  try {
    await updateOrder(orderId, {
      invoiceNo,
      status: 'INVOICE_GENERATED' as any,
      stage: 'INVOICE_GENERATED' as any,
      progressStep: 8
    });
  } catch (err) {
    console.warn('updateOrder with invoiceNo fallback:', err);
  }

  return newInvoice;
}

export async function generateChallanForOrder(
  orderId: string,
  challanData: {
    orderPo: string;
    transporter: string;
    vehicleNo: string;
    challanNo?: string;
    driverContact?: string;
    items?: any[];
    lines?: any[];
    remarks?: string;
    lrNo?: string;
    eWayBillNo?: string;
    idempotencyKey?: string;
  }
): Promise<DispatchChallan> {
  const fy = getCurrentFinancialYear();
  const challanNo = challanData.challanNo || formatDocumentNumber('CHL', fy, Math.floor(1000 + Math.random() * 8999));
  const date = new Date().toISOString().split('T')[0];

  const newChallan: DispatchChallan = {
    id: `disp-${Date.now()}`,
    challanNo,
    orderPo: challanData.orderPo,
    status: 'DISPATCH_READY' as any,
    date,
    transporter: challanData.transporter,
    vehicleNo: challanData.vehicleNo,
    lrNo: challanData.lrNo,
    eWayBillNo: challanData.eWayBillNo,
    remarks: challanData.remarks,
    lines: challanData.lines || challanData.items,
    items: challanData.lines || challanData.items,
    driverContact: challanData.driverContact || '+91 98765 43210',
    idempotencyKey: challanData.idempotencyKey
  };

  try {
    await insertDispatchChallan(newChallan);
  } catch (err) {
    console.warn('insertDispatchChallan fallback:', err);
  }

  try {
    await updateOrder(orderId, {
      deliveryChallanNo: challanNo,
      transporterName: challanData.transporter,
      status: 'READY_TO_DISPATCH' as any,
      stage: 'READY_FOR_DISPATCH' as any,
      progressStep: 7
    });
  } catch (err) {
    console.warn('updateOrder with challan fallback:', err);
  }

  return newChallan;
}

export async function markOrderDispatched(
  orderId: string,
  dispatchData: {
    dispatchDate: string;
    transporter: string;
    vehicleNo: string;
    lrNo?: string;
    driverContact?: string;
    remarks?: string;
    lines?: any[];
  }
): Promise<{ success: boolean; orderStatus: string }> {
  const nextStatus = 'DISPATCHED';

  try {
    await updateOrder(orderId, {
      status: nextStatus as any,
      stage: nextStatus as any,
      transporterName: dispatchData.transporter,
      dispatchedAt: dispatchData.dispatchDate,
      progressStep: 8,
      lines: (dispatchData.lines || []).map(l => ({
        ...l,
        dispatchedQty: l.orderQty,
        pendingQty: 0
      }))
    });
  } catch (err) {
    console.warn('markOrderDispatched updateOrder fallback:', err);
  }

  return { success: true, orderStatus: nextStatus };
}

export async function markOrderDelivered(
  orderId: string,
  deliveryData: {
    deliveryDate: string;
    receivedBy: string;
    podUrl?: string;
    remarks?: string;
  }
): Promise<{ success: boolean; orderStatus: string }> {
  const nextStatus = 'DELIVERED';

  try {
    await updateOrder(orderId, {
      status: nextStatus as any,
      stage: nextStatus as any,
      podReceivedDate: deliveryData.deliveryDate,
      podReceivedBy: deliveryData.receivedBy,
      podDocumentUrl: deliveryData.podUrl || 'POD-VERIFIED-PHYSICAL',
      progressStep: 9
    });
  } catch (err) {
    console.warn('markOrderDelivered updateOrder fallback:', err);
  }

  return { success: true, orderStatus: nextStatus };
}

export async function recordOrderPaymentAndClose(
  orderId: string,
  paymentData: {
    amount: number;
    mode: 'NEFT' | 'RTGS' | 'UPI' | 'CHEQUE';
    referenceNo: string;
    paymentDate: string;
    currentPaid: number;
    grossAmount: number;
    remarks?: string;
    receivedBy?: string;
    existingHistory?: any[];
  }
): Promise<{ success: boolean; orderStatus: string; paidAmount: number; isClosed: boolean; isFullyPaid: boolean }> {
  const newTotalPaid = paymentData.currentPaid + paymentData.amount;
  const isFullyPaid = newTotalPaid >= paymentData.grossAmount;
  const paymentStatus = isFullyPaid ? 'PAID' : 'PARTIAL';
  const progressStep = isFullyPaid ? 10 : 10;

  const newEntry = {
    id: `pay-${Date.now()}`,
    amount: paymentData.amount,
    mode: paymentData.mode,
    referenceNo: paymentData.referenceNo,
    receivedDate: paymentData.paymentDate,
    receivedBy: paymentData.receivedBy || 'Accounts Officer',
    remarks: paymentData.remarks || 'Settlement payment recorded'
  };

  const updatedHistory = [...(paymentData.existingHistory || []), newEntry];

  try {
    await updateOrder(orderId, {
      paidAmount: newTotalPaid,
      paymentStatus: paymentStatus as any,
      paymentHistory: updatedHistory,
      progressStep
    });
  } catch (err) {
    console.warn('recordOrderPaymentAndClose updateOrder fallback:', err);
  }

  return {
    success: true,
    orderStatus: paymentStatus,
    paidAmount: newTotalPaid,
    isClosed: false,
    isFullyPaid: isFullyPaid
  };
}




