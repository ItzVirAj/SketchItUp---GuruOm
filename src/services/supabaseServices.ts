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
  PurchaseOrder,
  PurchaseOrderItem
} from '../types/console';
import {
  initialOrders,
  initialStock,
  initialShortages,
  initialJobCards,
  initialFinishedGoods,
  initialOutworkSendOuts,
  initialProductionLogs,
  initialQCQueue,
  initialPDIQueue,
  initialDispatches,
  initialInvoices,
  initialPayables,
  initialMasters,
  initialCustomers,
  initialVendors,
  initialMachines,
  initialUsers,
  initialAuditLogs,
  initialCompanyProfile
} from '../data/consoleData';



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

  return initialCompanyProfile;
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
  } catch (err) {
    console.warn('fetchProfiles REST error, falling back:', err);
  }
  return initialUsers;
}

export async function createProfile(user: Partial<SystemUser>): Promise<SystemUser> {
  try {
    const res = await apiClient.post<{ user: any }>('/auth/register', {
      name: user.name,
      email: user.email,
      role: user.role,
      department: user.department,
      phone: user.phone
    });
    return {
      id: res.user.id,
      name: res.user.name || res.user.full_name,
      email: res.user.email,
      role: res.user.role as UserRole,
      status: res.user.status,
      lastLogin: res.user.lastLogin || new Date().toLocaleString('en-IN', { hour12: true }),
      department: res.user.department,
      phone: res.user.phone
    };
  } catch (err) {
    console.warn('createProfile REST error:', err);
    return {
      id: `usr-${Date.now()}`,
      name: user.name || 'New User',
      email: user.email || 'user@guruom.in',
      role: (user.role as UserRole) || 'OPERATOR',
      status: 'ACTIVE',
      lastLogin: new Date().toLocaleString('en-IN', { hour12: true }),
      department: user.department,
      phone: user.phone
    };
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
  return initialMasters;
}

export async function insertMaster(item: Partial<MasterItem>): Promise<MasterItem> {
  const payload = {
    id: item.code ? `m-${item.code}` : `m-${Date.now()}`,
    code: item.code || `0000000${Math.floor(10 + Math.random() * 89)}`,
    partNo: item.partNo || '',
    description: item.description || 'New Part',
    unit: item.unit || 'NOS',
    hsnCode: item.hsnCode || '8483',
    reorderLevel: Number(item.reorderLevel || 10),
    storeLocation: item.storeLocation || 'A1-RACK-1',
    isFinishedGoods: item.isFinishedGoods ?? true,
    saleRate: Number(item.saleRate || 100),
    purchaseRate: Number(item.purchaseRate || 70)
  };

  try {
    const res = await apiClient.post<{ message: string; data: MasterItem }>('/masters', payload);
    if (res?.data) return res.data;
  } catch (err) {
    console.warn('Backend insertMaster fallback:', err);
  }
  return payload;
}

// ----------------------------------------------------
// Orders & Line Items Services (Custom Backend REST API)
// ----------------------------------------------------
export async function fetchOrders(): Promise<CustomerOrder[]> {
  try {
    const res = await apiClient.get<{ data: CustomerOrder[] }>('/orders');
    if (res?.data && res.data.length > 0) {
      return res.data;
    }
  } catch (err) {
    console.warn('Backend fetchOrders fallback:', err);
  }
  return initialOrders;
}

export async function fetchOrderById(orderId: string): Promise<CustomerOrder | null> {
  try {
    const res = await apiClient.get<{ data: CustomerOrder }>(`/orders/${orderId}`);
    if (res?.data) {
      return res.data;
    }
  } catch (err) {
    console.warn(`Backend fetchOrderById (${orderId}) fallback:`, err);
  }
  const fallback = initialOrders.find(o => o.id === orderId || o.poNo === orderId);
  return fallback || null;
}

export async function insertOrder(order: CustomerOrder): Promise<void> {
  await apiClient.post('/orders', order);
}

export async function updateOrderStatus(orderId: string, status: string, progressStep?: number): Promise<void> {
  await apiClient.patch(`/orders/${orderId}/status`, { status, progressStep });
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
  [...localCustom, ...dbCustomers, ...initialCustomers].forEach(item => {
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
  [...localCustom, ...dbVendors, ...initialVendors].forEach(item => {
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
  [...localCustom, ...dbMachines, ...initialMachines].forEach(item => {
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
  return initialStock;
}

export async function adjustStockItem(code: string, newOnHand: number): Promise<void> {
  try {
    await apiClient.put(`/inventory/stock/${code}`, { newOnHand });
  } catch (err) {
    console.warn('Backend adjustStockItem fallback:', err);
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
  return initialShortages;
}

// ----------------------------------------------------
// Job Cards Services (via REST API)
// ----------------------------------------------------
export async function fetchJobCards(): Promise<JobCard[]> {
  try {
    const res = await apiClient.get<{ data: JobCard[] }>('/production/jobs');
    if (res?.data && res.data.length > 0) {
      return res.data;
    }
  } catch (err) {
    console.warn('fetchJobCards REST API error, falling back:', err);
  }
  return initialJobCards;
}

export async function insertJobCard(job: JobCard): Promise<void> {
  try {
    await apiClient.post('/production/jobs', job);
  } catch (err) {
    console.warn('insertJobCard REST API error:', err);
  }
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
  return initialProductionLogs;
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
  return initialQCQueue;
}

export async function updateQCInspection(id: string, qcStatus: 'PASS' | 'QC_HOLD' | 'REJECTED', notes?: string): Promise<void> {
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
  return initialPDIQueue;
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
  return initialFinishedGoods;
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
  return initialOutworkSendOuts;
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
  return initialDispatches;
}

export async function insertDispatchChallan(challan: DispatchChallan): Promise<void> {
  try {
    await apiClient.post('/dispatch', {
      challanNo: challan.challanNo,
      orderPo: challan.orderPo,
      status: challan.status || 'DISPATCHED',
      date: challan.date || new Date().toISOString().split('T')[0],
      transporter: challan.transporter,
      vehicleNo: challan.vehicleNo,
      linesCount: challan.linesCount || 1,
      driverContact: challan.driverContact,
      totalInvoiceValue: challan.totalInvoiceValue
    });
  } catch (err) {
    console.warn('insertDispatchChallan REST API error:', err);
    throw err;
  }
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
  return initialInvoices;
}

export async function insertCustomerInvoice(inv: CustomerInvoice): Promise<void> {
  try {
    await apiClient.post('/invoices', {
      invoiceNo: inv.invoiceNo,
      customerName: inv.customerName,
      orderPo: inv.orderPo,
      challanNo: inv.challanNo,
      status: inv.status || 'DRAFT',
      date: inv.date || new Date().toISOString().split('T')[0],
      dueDate: inv.dueDate,
      totalAmount: inv.totalAmount,
      paidAmount: inv.paidAmount || 0,
      balanceAmount: inv.balanceAmount ?? inv.totalAmount
    });
  } catch (err) {
    console.warn('insertCustomerInvoice REST API error:', err);
  }
}

export async function payInvoice(invoiceNo: string, paymentAmount?: number): Promise<void> {
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
  return initialPayables;
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
  from?: number;
  limit?: number;
}): Promise<AuditLogEntry[]> {
  try {
    const res = await apiClient.get<any>('/audit', { params: filters });
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
  return initialAuditLogs;
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


