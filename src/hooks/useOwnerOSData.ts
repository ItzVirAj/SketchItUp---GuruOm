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
  CustomerMaster,
  VendorMaster,
  MachineMaster,
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
  updateOrder,
  confirmOrder,
  updateOrderStatus,
  fetchStock,
  adjustStockItem,
  fetchShortages,
  fetchJobCards,
  createJobCardForOrder,
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
  const [customers, setCustomers] = useState<CustomerMaster[]>([]);
  const [vendors, setVendors] = useState<VendorMaster[]>([]);
  const [machines, setMachines] = useState<MachineMaster[]>([]);
  const [users, setUsers] = useState<SystemUser[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const [companyProfile, setCompanyProfile] = useState<CompanyProfile | null>(null);
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

    // 3-Minute Background Reconciliation
    const reconciliationInterval = setInterval(() => {
      loadAllData();
    }, 3 * 60 * 1000);

    const token = getAccessToken();
    const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || '/api/v1';
    const streamUrl = `${apiBaseUrl}/notifications/stream${token ? `?token=${encodeURIComponent(token)}` : ''}`;

    let eventSource: EventSource | null = null;
    try {
      eventSource = new EventSource(streamUrl, { withCredentials: true });

      // User events
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

      // Order events
      eventSource.addEventListener('order_created', (event: MessageEvent) => {
        try {
          const newOrder = JSON.parse(event.data);
          setOrders(prev => [newOrder, ...prev.filter(o => o.id !== newOrder.id && o.poNo !== newOrder.poNo)]);
        } catch (_) {}
      });

      eventSource.addEventListener('order_updated', (event: MessageEvent) => {
        try {
          const updated = JSON.parse(event.data);
          setOrders(prev => prev.map(o => (o.id === updated.id || o.poNo === updated.poNo || o.id === updated.poNo) ? { ...o, ...updated } : o));
        } catch (_) {}
      });

      eventSource.addEventListener('order_transitioned', (event: MessageEvent) => {
        try {
          const payload = JSON.parse(event.data);
          setOrders(prev => prev.map(o => {
            if (o.id === payload.orderId || o.poNo === payload.poNo) {
              return {
                ...o,
                status: payload.status || payload.newStage,
                stage: payload.stage || payload.newStage,
                progressStep: payload.progressStep ?? o.progressStep,
                heatLotNumber: payload.heatLotNumber || o.heatLotNumber
              };
            }
            return o;
          }));
        } catch (_) {}
      });

      // Inventory & Shortage events
      eventSource.addEventListener('stock_updated', () => {
        fetchStock().then(setStock).catch(() => {});
      });

      eventSource.addEventListener('shortage_updated', () => {
        fetchShortages().then(setShortages).catch(() => {});
      });

      eventSource.addEventListener('finished_goods_updated', () => {
        fetchFinishedGoods().then(setFinishedGoods).catch(() => {});
      });

      // GRN events
      eventSource.addEventListener('grn_created', () => {
        fetchStock().then(setStock).catch(() => {});
        fetchOrders().then(setOrders).catch(() => {});
      });

      // Item Catalog events — Stock Master mirrors the Masters catalog in realtime
      eventSource.addEventListener('master_item_created', (event: MessageEvent) => {
        try {
          const newItem = JSON.parse(event.data);
          setMasters(prev => prev.some(m => m.code === newItem.code) ? prev : [newItem, ...prev]);
        } catch (_) {}
        fetchMasters().then(setMasters).catch(() => {});
      });

      // Audit trail events — every backend-recorded system change streams in realtime
      eventSource.addEventListener('audit_log_created', (event: MessageEvent) => {
        try {
          const record = JSON.parse(event.data);
          const entry = {
            id: record.id,
            when: record.created_at ? new Date(record.created_at).toLocaleString('en-IN', { hour12: true }) : 'Just now',
            user: record.actorEmail || record.actor_email || 'System',
            actorId: record.actorId || record.actor_id,
            actorEmail: record.actorEmail || record.actor_email,
            entity: record.entityType || record.entity_type || record.entity || 'General',
            entityType: record.entityType || record.entity_type,
            entityId: record.entityId || record.entity_id,
            action: record.action,
            details: record.metadata?.details || record.details || `${record.action} on ${record.entityType || 'item'}`,
            beforeState: record.beforeState || record.before_state,
            afterState: record.afterState || record.after_state,
            ipAddress: record.ipAddress || record.ip_address,
            userAgent: record.userAgent || record.user_agent,
            metadata: record.metadata,
            createdAt: record.created_at
          };
          setAuditLogs(prev => prev.some(l => l.id === entry.id) ? prev : [entry, ...prev]);
        } catch (_) {}
      });

      eventSource.addEventListener('grn_updated', () => {
        fetchStock().then(setStock).catch(() => {});
      });

      // Production & Job Card events
      eventSource.addEventListener('job_card_created', (event: MessageEvent) => {
        try {
          const newJob = JSON.parse(event.data);
          setJobCards(prev => [newJob, ...prev.filter(j => j.id !== newJob.id && j.jobNo !== newJob.jobNo)]);
        } catch (_) {}
      });

      eventSource.addEventListener('job_card_updated', (event: MessageEvent) => {
        try {
          const updatedJob = JSON.parse(event.data);
          setJobCards(prev => prev.map(j => (j.id === updatedJob.id || j.jobNo === updatedJob.jobNo) ? { ...j, ...updatedJob } : j));
        } catch (_) {}
      });

      eventSource.addEventListener('operation_completed', () => {
        fetchJobCards().then(setJobCards).catch(() => {});
        fetchQCQueue().then(setQcQueue).catch(() => {});
      });

      // QC & PDI events
      eventSource.addEventListener('qc_created', (event: MessageEvent) => {
        try {
          const newQc = JSON.parse(event.data);
          setQcQueue(prev => [newQc, ...prev.filter(q => q.id !== newQc.id && q.jobNo !== newQc.jobNo)]);
        } catch (_) {}
      });

      eventSource.addEventListener('qc_updated', (event: MessageEvent) => {
        try {
          const updatedQc = JSON.parse(event.data);
          setQcQueue(prev => prev.map(q => q.id === updatedQc.id ? { ...q, ...updatedQc } : q));
        } catch (_) {}
      });

      eventSource.addEventListener('pdi_created', (event: MessageEvent) => {
        try {
          const newPdi = JSON.parse(event.data);
          setPdiQueue(prev => [newPdi, ...prev.filter(p => p.id !== newPdi.id && !(p.orderPo === newPdi.orderPo && p.jobNo === newPdi.jobNo))]);
        } catch (_) {}
      });

      eventSource.addEventListener('pdi_updated', (event: MessageEvent) => {
        try {
          const updatedPdi = JSON.parse(event.data);
          setPdiQueue(prev => prev.map(p => p.id === updatedPdi.id ? { ...p, ...updatedPdi } : p));
        } catch (_) {}
      });

      // Dispatch events
      eventSource.addEventListener('dispatch_created', (event: MessageEvent) => {
        try {
          const newDispatch = JSON.parse(event.data);
          setDispatches(prev => [newDispatch, ...prev.filter(d => d.id !== newDispatch.id && d.challanNo !== newDispatch.challanNo)]);
        } catch (_) {}
      });

      // Invoice & Payment events
      eventSource.addEventListener('invoice_created', (event: MessageEvent) => {
        try {
          const newInvoice = JSON.parse(event.data);
          setInvoices(prev => [newInvoice, ...prev.filter(i => i.id !== newInvoice.id && i.invoiceNo !== newInvoice.invoiceNo)]);
        } catch (_) {}
      });

      eventSource.addEventListener('invoice_updated', (event: MessageEvent) => {
        try {
          const updatedInv = JSON.parse(event.data);
          setInvoices(prev => prev.map(i => (i.id === updatedInv.id || i.invoiceNo === updatedInv.invoiceNo) ? { ...i, ...updatedInv } : i));
        } catch (_) {}
      });

      eventSource.addEventListener('payment_recorded', () => {
        fetchInvoices().then(setInvoices).catch(() => {});
        fetchOrders().then(setOrders).catch(() => {});
      });

      // Vendor Bills
      eventSource.addEventListener('vendor_bill_created', (event: MessageEvent) => {
        try {
          const newBill = JSON.parse(event.data);
          setPayables(prev => [newBill, ...prev.filter(b => b.id !== newBill.id && b.billNo !== newBill.billNo)]);
        } catch (_) {}
      });

      eventSource.addEventListener('vendor_bill_disbursed', (event: MessageEvent) => {
        try {
          const disbursed = JSON.parse(event.data);
          setPayables(prev => prev.map(b => (b.id === disbursed.billNo || b.billNo === disbursed.billNo) ? { ...b, ...disbursed } : b));
        } catch (_) {}
      });

      // Approvals
      eventSource.addEventListener('approval_created', () => {
        fetchApprovals().then(setApprovals).catch(() => {});
      });

      eventSource.addEventListener('approval_updated', () => {
        fetchApprovals().then(setApprovals).catch(() => {});
      });
    } catch (_) {}

    return () => {
      clearInterval(reconciliationInterval);
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
    // Immediately prepend to local state so newest order appears at the top of the table
    setOrders(prev => [order, ...prev.filter(o => o.id !== order.id && o.poNo !== order.poNo)]);
    await insertOrder(order);
    await addAuditLog('order', 'create', `Created order #${order.poNo} for ${order.customerName}`);
    await loadAllData();
  };

  const handleUpdateOrder = async (orderId: string, updates: Partial<CustomerOrder>) => {
    const targetOrder = orders.find(o => o.id === orderId || o.poNo === orderId);
    const targetId = targetOrder?.id || orderId;
    const targetPo = targetOrder?.poNo || orderId;

    if (updates.status === 'CONFIRMED' || updates.stage === 'CONFIRMED') {
      return handleConfirmOrder(targetId);
    }

    setOrders(prev => prev.map(o => (o.id === targetId || o.poNo === targetPo) ? { ...o, ...updates } : o));
    try {
      await updateOrder(targetId, updates);
    } catch (err) {
      console.warn('Backend updateOrder warning:', err);
    }
    await addAuditLog('order', 'update', `Updated order #${updates.poNo || targetPo}`);
    await loadAllData();
  };

  const handleConfirmOrder = async (orderId: string) => {
    const targetOrder = orders.find(o => o.id === orderId || o.poNo === orderId);
    const targetId = targetOrder?.id || orderId;
    const targetPo = targetOrder?.poNo || orderId;

    const updates: Partial<CustomerOrder> = {
      status: 'CONFIRMED',
      stage: 'CONFIRMED',
      progressStep: 2
    };
    setOrders(prev => prev.map(o => (o.id === targetId || o.poNo === targetPo) ? { ...o, ...updates } : o));
    try {
      const confirmed = await confirmOrder(targetId);
      if (confirmed) {
        setOrders(prev => prev.map(o => (o.id === targetId || o.poNo === targetPo) ? { ...o, ...confirmed, status: 'CONFIRMED', stage: 'CONFIRMED', progressStep: 2 } : o));
      }
    } catch (err) {
      console.warn('Backend handleConfirmOrder fallback:', err);
      // Re-sync on failure
      await loadAllData();
      throw err;
    }
    await addAuditLog('order', 'confirm', `Executive authorized and confirmed order #${targetPo} for ${targetOrder?.customerName || 'Customer'}`);
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

  const handleAdjustStock = async (code: string, newOnHand: number, reason?: string) => {
    await adjustStockItem(code, newOnHand, reason);
    await addAuditLog('stock', 'adjust', `Adjusted stock for item ${code} to ${newOnHand}${reason ? ` (${reason})` : ''}`);
    await loadAllData();
  };

  const handleCreateJobCard = async (job: JobCard) => {
    // Manual creation from the Production floor form — posts to the job card release API
    await createJobCardForOrder({
      orderPo: job.orderPo,
      partCode: job.partCode,
      partDescription: job.partDescription,
      drawingRevision: job.drawingRevision || 'REV-A',
      targetQty: Number(job.targetQty ?? job.qty ?? 0),
      materialIssuedLot: job.materialIssuedLot || 'HEAT-LOT-NA',
      targetDate: job.targetDate,
      remarks: `Manually created on Production floor for PO ${job.orderPo}${job.machine ? ` (${job.machine})` : ''}`
    });
    await addAuditLog('job_card', 'create', `Created job card ${job.jobNo} for PO ${job.orderPo} (${job.partCode} x ${Number(job.targetQty ?? job.qty ?? 0)})`);
    await loadAllData();
  };

  const handleLogProduction = async (job: JobCard, qtyDone: number) => {
    await insertProductionLogAndQC(job, qtyDone);
    await addAuditLog('production', 'log', `Logged ${qtyDone} units produced for ${job.jobNo}`);
    await loadAllData();
  };

  const handleUpdateQC = async (id: string, qcStatus: 'PASS' | 'QC_HOLD' | 'REJECTED', notes?: string) => {
    const target = qcQueue.find(q => q.id === id);
    const targetOrderPo = target?.orderPo;
    const targetJobNo = target?.jobNo;

    // Synchronize all QC entries for this order/job to prevent conflicting statuses
    setQcQueue(prev => prev.map(q => {
      if (q.id === id || (targetOrderPo && q.orderPo === targetOrderPo)) {
        return { 
          ...q, 
          qcStatus, 
          inspectorNotes: notes || q.inspectorNotes,
          inspectedAt: new Date().toISOString()
        };
      }
      return q;
    }));

    if (targetOrderPo) {
      setOrders(prev => prev.map(ord => {
        if (ord.poNo === targetOrderPo || ord.id === targetOrderPo) {
          return {
            ...ord,
            hasOpenNcr: qcStatus !== 'PASS',
            stage: qcStatus === 'PASS' ? 'QC_INSPECTION' : ord.stage,
            status: qcStatus === 'PASS' ? 'QC_INSPECTION' : ord.status,
            progressStep: qcStatus === 'PASS' ? Math.max(ord.progressStep || 1, 6) : ord.progressStep
          };
        }
        return ord;
      }));
    }

    if (targetJobNo) {
      setJobCards(prev => prev.map(j => {
        if (j.jobNo === targetJobNo || j.id === targetJobNo) {
          return {
            ...j,
            status: qcStatus === 'PASS' ? 'COMPLETED' : 'QC_HOLD'
          };
        }
        return j;
      }));
    }

    await updateQCInspection(id, qcStatus, notes);
    await addAuditLog('qc', 'inspect', `QC status updated to ${qcStatus} for inspection #${id} (PO: ${targetOrderPo || 'N/A'})`);
    await loadAllData();
  };

  const handlePassPDI = async (id: string) => {
    const target = pdiQueue.find(p => p.id === id);
    setPdiQueue(prev => prev.map(p => p.id === id ? { ...p, pdiStatus: 'PASS', certificateNo: `PDI-2026-${Math.floor(1000 + Math.random() * 9000)}` } : p));

    if (target?.orderPo) {
      setOrders(prev => prev.map(ord => {
        if (ord.poNo === target.orderPo || ord.id === target.orderPo) {
          return {
            ...ord,
            stage: 'READY_TO_DISPATCH',
            status: 'READY_TO_DISPATCH',
            progressStep: Math.max(ord.progressStep || 1, 7)
          };
        }
        return ord;
      }));
    }

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
    // Clear all local state, then reload everything from the backend
    setOrders([]);
    setStock([]);
    setShortages([]);
    setJobCards([]);
    setFinishedGoods([]);
    setOutworkSendOuts([]);
    setProductionLogs([]);
    setQcQueue([]);
    setPdiQueue([]);
    setDispatches([]);
    setInvoices([]);
    setPayables([]);
    setAuditLogs([]);
    setUsers([]);
    setMasters([]);
    setCustomers([]);
    setVendors([]);
    setMachines([]);

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
    handleUpdateOrder,
    handleConfirmOrder,
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
