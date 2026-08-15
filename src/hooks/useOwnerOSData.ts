import { useState, useEffect, useCallback } from 'react';
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
  SystemUser,
  AuditLogEntry,
  CompanyProfile,
  PendingApproval,
  UserRole
} from '../types/console';

import {
  fetchCompanyProfile,
  updateCompanyProfile,
  fetchProfiles,
  createProfile,
  updateProfileRole,
  updateProfileStatus,
  fetchMasters,
  insertMaster,
  fetchOrders,
  insertOrder,
  updateOrderStatus,
  fetchStock,
  adjustStockItem,
  fetchShortages,
  fetchJobCards,
  insertJobCard,
  fetchProductionLogs,
  insertProductionLogAndQC,
  fetchQCQueue,
  updateQCInspection,
  fetchPDIQueue,
  passPDIInspection,
  fetchFinishedGoods,
  fetchOutworkSendOuts,
  fetchDispatches,
  insertDispatchChallan,
  fetchInvoices,
  insertCustomerInvoice,
  payInvoice,
  fetchPayables,
  insertVendorBill,
  payVendorBill,
  insertOutworkSendOut,
  fetchApprovals,
  removeApproval,
  approveApproval,
  rejectApproval,
  fetchAuditLogs,
  insertAuditLog,
  fetchCustomers,
  insertCustomer,
  fetchVendors,
  insertVendor,
  fetchMachines,
  insertMachine,
  deleteProfile,
  seedAllDataToSupabase,
  clearOperationalDataInSupabase
} from '../services/supabaseServices';
import { getAccessToken } from '../lib/apiClient';

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
import { CustomerMaster, VendorMaster, MachineMaster } from '../types/console';

const getInitialCompanyProfile = (): CompanyProfile => {
  try {
    const saved = localStorage.getItem('stratum_company_profile');
    if (saved) return JSON.parse(saved);
  } catch (e) {
    console.error('Failed to parse saved company profile:', e);
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
};

export function useOwnerOSData(currentUser?: SystemUser) {
  const [loading, setLoading] = useState<boolean>(true);
  const [orders, setOrders] = useState<CustomerOrder[]>([]);
  const [stock, setStock] = useState<StockItem[]>([]);
  const [shortages, setShortages] = useState<ShortageItem[]>([]);
  const [jobCards, setJobCards] = useState<JobCard[]>([]);
  const [finishedGoods, setFinishedGoods] = useState<FinishedGoodsItem[]>([]);
  const [outworkSendOuts, setOutworkSendOuts] = useState<OutworkSendOut[]>([]);
  const [productionLogs, setProductionLogs] = useState<ProductionLogReport[]>([]);
  const [qcQueue, setQcQueue] = useState<QCInspection[]>([]);
  const [pdiQueue, setPdiQueue] = useState<PDIInspection[]>([]);
  const [dispatches, setDispatches] = useState<DispatchChallan[]>([]);
  const [invoices, setInvoices] = useState<CustomerInvoice[]>([]);
  const [payables, setPayables] = useState<VendorBill[]>([]);
  const [masters, setMasters] = useState<MasterItem[]>([]);
  const [customers, setCustomers] = useState<CustomerMaster[]>(initialCustomers);
  const [vendors, setVendors] = useState<VendorMaster[]>(initialVendors);
  const [machines, setMachines] = useState<MachineMaster[]>(initialMachines);
  const [users, setUsers] = useState<SystemUser[]>(initialUsers);
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>(initialAuditLogs);
  const [companyProfile, setCompanyProfile] = useState<CompanyProfile>(getInitialCompanyProfile);
  const [approvals, setApprovals] = useState<PendingApproval[]>([]);
  const [lastSynced, setLastSynced] = useState<string>(() => new Date().toLocaleString('en-IN', { hour12: true }));

  const loadAllData = useCallback(async () => {
    try {
      setLoading(true);
      const [
        cProfile,
        usrList,
        mList,
        oList,
        sList,
        shList,
        jcList,
        fgList,
        owList,
        plList,
        qcList,
        pdiList,
        dList,
        invList,
        billList,
        apprList,
        auditList,
        custs,
        vends,
        mchs
      ] = await Promise.all([
        fetchCompanyProfile(),
        fetchProfiles(),
        fetchMasters(),
        fetchOrders(),
        fetchStock(),
        fetchShortages(),
        fetchJobCards(),
        fetchFinishedGoods(),
        fetchOutworkSendOuts(),
        fetchProductionLogs(),
        fetchQCQueue(),
        fetchPDIQueue(),
        fetchDispatches(),
        fetchInvoices(),
        fetchPayables(),
        fetchApprovals(),
        fetchAuditLogs(),
        fetchCustomers(),
        fetchVendors(),
        fetchMachines()
      ]);

      setCompanyProfile(cProfile);
      setUsers(usrList);
      setMasters(mList);
      setOrders(oList);
      setStock(sList);
      setShortages(shList);
      setJobCards(jcList);
      setFinishedGoods(fgList);
      setOutworkSendOuts(owList);
      setProductionLogs(plList);
      setQcQueue(qcList);
      setPdiQueue(pdiList);
      setDispatches(dList);
      setInvoices(invList);
      setPayables(billList);
      setApprovals(apprList);
      setAuditLogs(auditList);
      setCustomers(custs);
      setVendors(vends);
      setMachines(mchs);
      setLastSynced(new Date().toLocaleString('en-IN', { hour12: true }));
    } catch (err) {
      console.error('Error loading Supabase data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial Load & Realtime SSE Stream
  useEffect(() => {
    loadAllData();

    const token = getAccessToken();
    const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || '/api/v1';
    const streamUrl = `${apiBaseUrl}/notifications/stream${token ? `?token=${encodeURIComponent(token)}` : ''}`;

    let eventSource: EventSource | null = null;
    try {
      eventSource = new EventSource(streamUrl, { withCredentials: true });

      eventSource.addEventListener('user_created', (event: MessageEvent) => {
        try {
          const newUser = JSON.parse(event.data);
          setUsers(prev => [newUser, ...prev.filter(u => u.id !== newUser.id && u.email !== newUser.email)]);
        } catch (_) {}
      });

      eventSource.addEventListener('user_updated', (event: MessageEvent) => {
        try {
          const updated = JSON.parse(event.data);
          setUsers(prev => prev.map(u => u.id === updated.id ? { ...u, ...updated } : u));
        } catch (_) {}
      });

      eventSource.addEventListener('user_deleted', (event: MessageEvent) => {
        try {
          const deleted = JSON.parse(event.data);
          setUsers(prev => prev.filter(u => u.id !== deleted.id));
        } catch (_) {}
      });
    } catch (_) {}

    return () => {
      if (eventSource) eventSource.close();
    };
  }, [loadAllData]);

  // Helper Audit Logger
  const addAuditLog = async (entity: string, action: string, details: string) => {
    const currentUserName = 'System Admin';
    await insertAuditLog(entity, action, details, currentUserName);
    const updated = await fetchAuditLogs();
    setAuditLogs(updated);
  };

  // Actions
  const handleSaveCompanyProfile = async (profile: CompanyProfile) => {
    await updateCompanyProfile(profile);
    setCompanyProfile(profile);
    addAuditLog('company', 'update', 'Updated company profile details.');
  };

  const handleCreateOrder = async (order: CustomerOrder) => {
    await insertOrder(order);
    await addAuditLog('order', 'create', `Created order #${order.poNo} for ${order.customerName}`);
    await loadAllData();
  };

  const handleCloseOrder = async (orderId: string) => {
    await updateOrderStatus(orderId, 'CLOSED', 6);
    await addAuditLog('order', 'close', `Closed order ${orderId}`);
    await loadAllData();
  };

  const handleCancelOrder = async (orderId: string) => {
    await updateOrderStatus(orderId, 'CANCELLED');
    await addAuditLog('order', 'cancel', `Cancelled order ${orderId}`);
    await loadAllData();
  };

  const handleAdjustStock = async (code: string, newOnHand: number) => {
    await adjustStockItem(code, newOnHand);
    await addAuditLog('stock', 'adjust', `Adjusted stock for item ${code} to ${newOnHand}`);
    await loadAllData();
  };

  const handleCreateJobCard = async (job: JobCard) => {
    await insertJobCard(job);
    await addAuditLog('job_card', 'create', `Created job card ${job.jobNo} for PO ${job.orderPo}`);
    await loadAllData();
  };

  const handleLogProduction = async (job: JobCard, qtyDone: number) => {
    await insertProductionLogAndQC(job, qtyDone);
    await addAuditLog('production', 'log', `Logged ${qtyDone} units produced for ${job.jobNo}`);
    await loadAllData();
  };

  const handleUpdateQC = async (id: string, qcStatus: 'PASS' | 'QC_HOLD' | 'REJECTED', notes?: string) => {
    await updateQCInspection(id, qcStatus, notes);
    await addAuditLog('qc', 'inspect', `QC status updated to ${qcStatus} for inspection #${id}`);
    await loadAllData();
  };

  const handlePassPDI = async (id: string) => {
    await passPDIInspection(id);
    await addAuditLog('pdi', 'pass', `Passed PDI inspection #${id}`);
    await loadAllData();
  };

  const handleIssueDispatch = async (challan: DispatchChallan) => {
    await insertDispatchChallan(challan);
    await addAuditLog('dispatch', 'create', `Issued dispatch challan #${challan.challanNo}`);
    await loadAllData();
  };

  const handleRecordInvoicePayment = async (invoiceNo: string) => {
    setInvoices(prev => prev.map(inv => {
      if (inv.id === invoiceNo || inv.invoiceNo === invoiceNo) {
        return {
          ...inv,
          paidAmount: inv.totalAmount,
          balanceAmount: 0,
          status: 'PAID'
        };
      }
      return inv;
    }));
    await payInvoice(invoiceNo);
    await addAuditLog('invoice', 'payment', `Recorded payment for invoice #${invoiceNo}`);
    await loadAllData();
  };

  const handleCreateInvoice = async (inv: CustomerInvoice) => {
    await insertCustomerInvoice(inv);
    await addAuditLog('invoice', 'create', `Created invoice #${inv.invoiceNo} for ${inv.customerName}`);
    await loadAllData();
  };

  const handleRecordPayablePayment = async (billNo: string) => {
    setPayables(prev => prev.map(bill => {
      if (bill.id === billNo || bill.billNo === billNo) {
        return {
          ...bill,
          paidAmount: bill.amount,
          balanceAmount: 0,
          status: 'PAID'
        };
      }
      return bill;
    }));
    await payVendorBill(billNo);
    await addAuditLog('payable', 'payment', `Recorded payment for vendor bill #${billNo}`);
    await loadAllData();
  };

  const handleCreateVendorBill = async (bill: VendorBill) => {
    await insertVendorBill(bill);
    await addAuditLog('payable', 'create', `Created vendor bill #${bill.billNo} for ${bill.vendorName}`);
    await loadAllData();
  };

  const handleCreateOutwork = async (outwork: OutworkSendOut) => {
    await insertOutworkSendOut(outwork);
    await addAuditLog('outwork', 'create', `Issued outwork process #${outwork.sendOutId} to ${outwork.vendorName}`);
    await loadAllData();
  };

  const handleAddMasterItem = async (item: MasterItem) => {
    await insertMaster(item);
    await addAuditLog('masters', 'add_item', `Added master item ${item.code} (${item.partNo})`);
    await loadAllData();
  };

  const handleAddUser = async (user: Partial<SystemUser>) => {
    const newUser: SystemUser = {
      id: user.id || `usr-${Date.now()}`,
      name: user.name || 'New User',
      email: user.email || '',
      role: (user.role || 'OPERATOR') as UserRole,
      status: user.status || 'ACTIVE',
      department: user.department || 'Operations',
      phone: user.phone || '',
      lastLogin: 'Never'
    };
    setUsers(prev => [newUser, ...prev.filter(u => u.email !== newUser.email)]);
    await createProfile(user);
    await addAuditLog('users', 'add_user', `Created user profile ${user.name} (${user.email})`);
    await loadAllData();
  };

  const handleRevokeUser = async (userId: string) => {
    setUsers(prev => prev.map(u => u.id === userId ? { ...u, status: 'REVOKED' } : u));
    await updateProfileStatus(userId, 'REVOKED');
    await addAuditLog('users', 'revoke_user', `Revoked access for user #${userId}`);
    await loadAllData();
  };

  const handleRestoreUser = async (userId: string) => {
    setUsers(prev => prev.map(u => u.id === userId ? { ...u, status: 'ACTIVE' } : u));
    await updateProfileStatus(userId, 'ACTIVE');
    await addAuditLog('users', 'restore_user', `Restored access for user #${userId}`);
    await loadAllData();
  };

  const handleUpdateUserRole = async (userId: string, newRole: UserRole) => {
    setUsers(prev => prev.map(u => u.id === userId ? { ...u, role: newRole } : u));
    const saved = localStorage.getItem('stratum_user');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.id === userId || parsed.email === users.find(u => u.id === userId)?.email) {
          localStorage.setItem('stratum_user', JSON.stringify({ ...parsed, role: newRole }));
        }
      } catch (_) {}
    }
    await updateProfileRole(userId, newRole);
    await addAuditLog('users', 'update_role', `Updated role to ${newRole} for user #${userId}`);
    await loadAllData();
  };

  const handleDeleteUser = async (userId: string) => {
    setUsers(prev => prev.filter(u => u.id !== userId));
    await deleteProfile(userId);
    await addAuditLog('users', 'delete_user', `Permanently deleted user profile #${userId}`);
    await loadAllData();
  };

  const handleApprove = async (id: string) => {
    await approveApproval(id);
    await loadAllData();
  };

  const handleReject = async (id: string) => {
    await rejectApproval(id);
    await loadAllData();
  };

  const handleSync = async () => {
    await loadAllData();
    await addAuditLog('system', 'sync', 'Telemetry synchronized with Supabase database.');
  };

  const handleResetAllData = async () => {
    try {
      const savedProfile = localStorage.getItem('stratum_company_profile');
      if (savedProfile) {
        setCompanyProfile(JSON.parse(savedProfile));
      } else {
        setCompanyProfile(initialCompanyProfile);
      }
    } catch (e) {
      setCompanyProfile(initialCompanyProfile);
    }
    setUsers(initialUsers);
    setMasters(initialMasters);
    setCustomers(initialCustomers);
    setVendors(initialVendors);
    setMachines(initialMachines);
    setOrders(initialOrders);
    setStock(initialStock);
    setShortages(initialShortages);
    setJobCards(initialJobCards);
    setFinishedGoods(initialFinishedGoods);
    setOutworkSendOuts(initialOutworkSendOuts);
    setProductionLogs(initialProductionLogs);
    setQcQueue(initialQCQueue);
    setPdiQueue(initialPDIQueue);
    setDispatches(initialDispatches);
    setInvoices(initialInvoices);
    setPayables(initialPayables);
    setAuditLogs(initialAuditLogs);

    await seedAllDataToSupabase();
    await addAuditLog('system', 'seed_all', 'Reset and seeded complete demonstration dataset across all sections.');
    await loadAllData();
  };

  const handleClearOperationalData = async () => {
    await clearOperationalDataInSupabase();
    await addAuditLog('system', 'clear_operational', 'Purged operational test records (orders, shift logs, dispatches, invoices).');
    await loadAllData();
  };

  const handleAddCustomer = async (c: CustomerMaster) => {
    setCustomers(prev => [c, ...prev.filter(item => item.code !== c.code)]);
    try {
      await insertCustomer(c);
    } catch (err) {
      console.warn('Realtime Supabase customer insert error:', err);
    }
    await addAuditLog('masters', 'add_customer', `Added/updated customer master ${c.code} (${c.name})`);
    await loadAllData();
  };

  const handleAddVendor = async (v: VendorMaster) => {
    setVendors(prev => [v, ...prev.filter(item => item.code !== v.code)]);
    try {
      await insertVendor(v);
    } catch (err) {
      console.warn('Realtime Supabase vendor insert error:', err);
    }
    await addAuditLog('masters', 'add_vendor', `Added/updated vendor master ${v.code} (${v.name})`);
    await loadAllData();
  };

  const handleAddMachine = async (m: MachineMaster) => {
    setMachines(prev => [m, ...prev.filter(item => item.code !== m.code)]);
    try {
      await insertMachine(m);
    } catch (err) {
      console.warn('Realtime Supabase machine insert error:', err);
    }
    await addAuditLog('masters', 'add_machine', `Added/updated machine master ${m.code} (${m.name})`);
    await loadAllData();
  };

  const handleImportOMGST = async (importedData: { customers?: CustomerMaster[]; vendors?: VendorMaster[]; machines?: MachineMaster[]; items?: MasterItem[] }) => {
    if (importedData.customers?.length) {
      setCustomers(prev => [...importedData.customers!, ...prev]);
      for (const c of importedData.customers) {
        await insertCustomer(c);
      }
    }
    if (importedData.vendors?.length) {
      setVendors(prev => [...importedData.vendors!, ...prev]);
      for (const v of importedData.vendors) {
        await insertVendor(v);
      }
    }
    if (importedData.machines?.length) {
      setMachines(prev => [...importedData.machines!, ...prev]);
      for (const m of importedData.machines) {
        await insertMachine(m);
      }
    }
    if (importedData.items?.length) {
      setMasters(prev => [...importedData.items!, ...prev]);
      for (const it of importedData.items) {
        await insertMaster(it);
      }
    }
    await addAuditLog('masters', 'import_omgst', `Imported OMGST master data tables in real-time.`);
    await loadAllData();
  };

  return {
    loading,
    orders,
    stock,
    shortages,
    jobCards,
    finishedGoods,
    outworkSendOuts,
    productionLogs,
    qcQueue,
    pdiQueue,
    dispatches,
    invoices,
    payables,
    masters,
    customers,
    vendors,
    machines,
    users,
    auditLogs,
    companyProfile,
    approvals,
    lastSynced,
    handleSaveCompanyProfile,
    handleCreateOrder,
    handleCloseOrder,
    handleCancelOrder,
    handleAdjustStock,
    handleCreateJobCard,
    handleLogProduction,
    handleUpdateQC,
    handlePassPDI,
    handleIssueDispatch,
    handleRecordInvoicePayment,
    handleCreateInvoice,
    handleRecordPayablePayment,
    handleCreateVendorBill,
    handleCreateOutwork,
    handleAddMasterItem,
    handleAddCustomer,
    handleAddVendor,
    handleAddMachine,
    handleImportOMGST,
    handleAddUser,
    handleRevokeUser,
    handleRestoreUser,
    handleUpdateUserRole,
    handleDeleteUser,
    handleApprove,
    handleReject,
    handleSync,
    handleResetAllData,
    handleClearOperationalData,
    reload: loadAllData
  };
}
