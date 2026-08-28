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
  updateProfile,
  updateProfileRole,
  updateProfileStatus,
  fetchMasters,
  insertMaster,
  updateMasterItem,
  deleteMasterItem,
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
  startJobCardOperation,
  completeJobCardOperation,
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
  updateDispatchChallan,
  cancelDispatchChallan,
  fetchInvoices,
  insertCustomerInvoice,
  issueCustomerInvoice,
  payInvoice,
  completePdiInspectionForOrder,
  generateInvoiceForOrder,
  generateChallanForOrder,
  markOrderDispatched,
  markOrderDelivered,
  markOrderDelayed,
  recordOrderPaymentAndClose,
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
  updateCustomer,
  deleteCustomer,
  fetchVendors,
  insertVendor,
  updateVendor,
  deleteVendor,
  fetchMachines,
  insertMachine,
  updateMachine,
  deleteMachine,
  deleteProfile,
  seedAllDataToSupabase,
  clearOperationalDataInSupabase
} from '../services/supabaseServices';
import { getAccessToken } from '../lib/apiClient';
import { toast } from '../context/ToastContext';

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
          const targetKey = updated.id || updated.poNo || updated.orderId;
          setOrders(prev => prev.map(o => {
            const isMatch = o.id === updated.id || 
                            o.poNo === updated.poNo || 
                            o.id === updated.poNo || 
                            o.poNo === updated.id || 
                            (updated.orderId && (o.id === updated.orderId || o.poNo === updated.orderId));
            if (isMatch) {
              return {
                ...o,
                ...updated,
                id: o.id || updated.id,
                poNo: o.poNo || updated.poNo,
                status: updated.status || updated.stage || o.status,
                stage: updated.stage || updated.status || o.stage,
                progressStep: updated.progressStep ?? updated.progress_step ?? o.progressStep
              };
            }
            return o;
          }));
        } catch (_) {}
      });

      eventSource.addEventListener('order_transitioned', (event: MessageEvent) => {
        try {
          const payload = JSON.parse(event.data);
          setOrders(prev => prev.map(o => {
            const isMatch = o.id === payload.orderId || 
                            o.poNo === payload.poNo || 
                            o.id === payload.poNo || 
                            o.poNo === payload.orderId ||
                            o.id === payload.id ||
                            o.poNo === payload.id;
            if (isMatch) {
              return {
                ...o,
                status: payload.status || payload.newStage || payload.stage || o.status,
                stage: payload.stage || payload.newStage || payload.status || o.stage,
                progressStep: payload.progressStep ?? payload.progress_step ?? o.progressStep,
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

      eventSource.addEventListener('operation_completed', (event: MessageEvent) => {
        try {
          const payload = JSON.parse(event.data);
          if (payload?.allCompleted && (payload?.orderPo || payload?.jobCard?.orderPo)) {
            const orderPo = payload.orderPo || payload.jobCard.orderPo;
            setOrders(prev => prev.map(o => {
              if (o.poNo === orderPo || o.id === orderPo) {
                return {
                  ...o,
                  status: 'READY_FOR_QC',
                  stage: 'READY_FOR_QC',
                  progressStep: 6,
                  updatedAt: new Date().toISOString()
                };
              }
              return o;
            }));
          }
        } catch (_) {}
        fetchJobCards().then(setJobCards).catch(() => {});
        fetchOrders().then(setOrders).catch(() => {});
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

      eventSource.onerror = () => {
        // SSE automatic reconnection will retry silently
      };
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
    try {
      // Immediately prepend to local state so newest order appears at the top of the table
      setOrders(prev => [order, ...prev.filter(o => o.id !== order.id && o.poNo !== order.poNo)]);
      await insertOrder(order);
      await addAuditLog('order', 'create', `Created order #${order.poNo} for ${order.customerName}`);
      toast.success(`Created order #${order.poNo} for ${order.customerName}`, 'Order Created');
      await loadAllData();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to create order', 'Creation Failed');
      throw err;
    }
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
      toast.success(`Updated order #${updates.poNo || targetPo}`, 'Order Updated');
    } catch (err: any) {
      console.warn('Backend updateOrder warning:', err);
      toast.error(err?.message || 'Failed to update order', 'Update Failed');
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
      toast.success(`Executive authorized order #${targetPo}`, 'Order Confirmed');
    } catch (err: any) {
      console.warn('Backend handleConfirmOrder fallback:', err);
      toast.error(err?.message || 'Failed to confirm order', 'Confirmation Failed');
      // Re-sync on failure
      await loadAllData();
      throw err;
    }
    await addAuditLog('order', 'confirm', `Executive authorized and confirmed order #${targetPo} for ${targetOrder?.customerName || 'Customer'}`);
    await loadAllData();
  };

  const handleCloseOrder = async (orderId: string) => {
    try {
      await updateOrderStatus(orderId, 'CLOSED', 6);
      await addAuditLog('order', 'close', `Closed order ${orderId}`);
      toast.info(`Closed order #${orderId}`, 'Order Closed');
      await loadAllData();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to close order', 'Error Closing Order');
    }
  };

  const handleCancelOrder = async (orderId: string) => {
    try {
      await updateOrderStatus(orderId, 'CANCELLED');
      await addAuditLog('order', 'cancel', `Cancelled order ${orderId}`);
      toast.warning(`Cancelled order #${orderId}`, 'Order Cancelled');
      await loadAllData();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to cancel order', 'Error Cancelling Order');
    }
  };

  const handleAdjustStock = async (code: string, newOnHand: number, reason?: string) => {
    try {
      await adjustStockItem(code, newOnHand, reason);
      await addAuditLog('stock', 'adjust', `Adjusted stock for item ${code} to ${newOnHand}${reason ? ` (${reason})` : ''}`);
      toast.success(`Stock level for ${code} set to ${newOnHand}`, 'Stock Adjusted');
      await loadAllData();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to adjust stock', 'Adjustment Failed');
    }
  };

  const handleCreateJobCard = async (job: JobCard) => {
    try {
      // Manual creation from the Production floor form — posts to the job card release API
      const res = await createJobCardForOrder({
        jobNo: job.jobNo,
        orderPo: job.orderPo,
        partCode: job.partCode,
        partDescription: job.partDescription,
        drawingRevision: job.drawingRevision || 'REV-A',
        targetQty: Number(job.targetQty ?? job.qty ?? 0),
        qty: Number(job.qty ?? job.targetQty ?? 0),
        machine: job.machine || 'CNC-01',
        materialIssuedLot: job.materialIssuedLot || 'HEAT-LOT-NA',
        targetDate: job.targetDate,
        remarks: `Manually created on Production floor for PO ${job.orderPo}${job.machine ? ` (${job.machine})` : ''}`
      });
      await addAuditLog('job_card', 'create', `Created job card ${res?.jobNo || job.jobNo} for PO ${job.orderPo} (${job.partCode} x ${Number(job.targetQty ?? job.qty ?? 0)})`);
      toast.success(`Created job card #${res?.jobNo || job.jobNo} for PO ${job.orderPo}`, 'Job Card Released');
      await loadAllData();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to create job card', 'Job Card Error');
      throw err;
    }
  };

  const handleStartOperation = async (jobNo: string, payload: { sequenceNo: number; machineId: string; operatorName: string; actualStartTime?: string }) => {
    const nowIso = payload.actualStartTime || new Date().toISOString();
    let updatedJobCard: JobCard | null = null;
    try {
      updatedJobCard = await startJobCardOperation(jobNo, { ...payload, actualStartTime: nowIso });
    } catch (e) {
      console.warn('REST startJobCardOperation error, applying local state update:', e);
    }

    setJobCards(prev => prev.map(j => {
      if (j.jobNo === jobNo || j.id === jobNo) {
        if (updatedJobCard) return { ...j, ...updatedJobCard };
        const ops = (j.operations || []).map(op => {
          if (op.sequenceNo === payload.sequenceNo) {
            return {
              ...op,
              machineId: payload.machineId,
              operatorName: payload.operatorName,
              actualStartTime: nowIso,
              opStatus: 'IN_PROGRESS'
            };
          }
          return op;
        });
        return {
          ...j,
          status: 'RUNNING',
          jobStatus: 'IN_PROGRESS',
          operations: ops
        };
      }
      return j;
    }));

    await addAuditLog('production', 'start_operation', `Op ${payload.sequenceNo} started on ${payload.machineId} by ${payload.operatorName} for ${jobNo}`);
    toast.info(`Op ${payload.sequenceNo} started on ${payload.machineId} (${jobNo})`, 'Operation Started');
    await loadAllData();
    return updatedJobCard;
  };

  const handleCompleteOperation = async (jobNo: string, payload: { sequenceNo: number; qtyProcessed: number; qtyRejected: number; actualMinutes: number; notes?: string; actualStartTime?: string; actualEndTime?: string }) => {
    const endIso = payload.actualEndTime || new Date().toISOString();
    let updatedJobCard: JobCard | null = null;
    try {
      updatedJobCard = await completeJobCardOperation(jobNo, { ...payload, actualEndTime: endIso });
    } catch (e) {
      console.warn('REST completeJobCardOperation error, applying local state update:', e);
    }

    let targetJobCard: JobCard | undefined;

    setJobCards(prev => prev.map(j => {
      if (j.jobNo === jobNo || j.id === jobNo) {
        if (updatedJobCard) {
          targetJobCard = updatedJobCard;
          return { ...j, ...updatedJobCard };
        }
        const ops = (j.operations || []).map(op => {
          if (op.sequenceNo === payload.sequenceNo) {
            return {
              ...op,
              qtyProcessed: payload.qtyProcessed,
              qtyRejected: payload.qtyRejected,
              actualTimeMinutes: payload.actualMinutes,
              actualStartTime: payload.actualStartTime || op.actualStartTime || new Date(Date.now() - (payload.actualMinutes || 15) * 60000).toISOString(),
              actualEndTime: endIso,
              notes: payload.notes,
              opStatus: 'COMPLETED'
            };
          }
          return op;
        });
        const allDone = ops.length > 0 && ops.every(o => o.opStatus === 'COMPLETED');
        const updated = {
          ...j,
          status: allDone ? 'COMPLETED' : 'IN_PROGRESS',
          jobStatus: allDone ? 'COMPLETED' : 'IN_PROGRESS',
          operations: ops
        };
        targetJobCard = updated;
        return updated;
      }
      return j;
    }));

    // If target job card is now completed, check if order should advance live
    const effectiveJob = targetJobCard || updatedJobCard || jobCards.find(j => j.jobNo === jobNo || j.id === jobNo);
    const orderPo = effectiveJob?.orderPo;
    const isJobCompleted = (effectiveJob?.operations || []).length > 0 && effectiveJob?.operations?.every(o => o.opStatus === 'COMPLETED');

    if (orderPo && (isJobCompleted || effectiveJob?.status === 'COMPLETED' || effectiveJob?.jobStatus === 'COMPLETED')) {
      const siblingJobs = jobCards.filter(j => (j.orderPo === orderPo || j.orderId === orderPo) && j.jobNo !== jobNo && j.id !== jobNo);
      const allSiblingsDone = siblingJobs.length === 0 || siblingJobs.every(j => j.status === 'COMPLETED' || j.jobStatus === 'COMPLETED');
      if (allSiblingsDone) {
        setOrders(prev => prev.map(o => {
          if (o.poNo === orderPo || o.id === orderPo) {
            return {
              ...o,
              status: 'READY_FOR_QC',
              stage: 'READY_FOR_QC',
              progressStep: 6,
              updatedAt: new Date().toISOString()
            };
          }
          return o;
        }));
      }
    }

    await addAuditLog('production', 'complete_operation', `Op ${payload.sequenceNo} completed (${payload.qtyProcessed} good, ${payload.qtyRejected} rejected, ${payload.actualMinutes}m) for ${jobNo}`);
    toast.success(`Op ${payload.sequenceNo} completed (${payload.qtyProcessed} processed) for ${jobNo}`, 'Operation Finished');
    await loadAllData();
    return updatedJobCard || targetJobCard;
  };

  const handleLogProduction = async (logOrJob: Partial<ProductionLogReport> | JobCard, qtyDoneParam?: number) => {
    try {
      const res = await insertProductionLogAndQC(logOrJob, qtyDoneParam);
      const logDetails = ('jobNo' in logOrJob && 'qtyDone' in logOrJob && qtyDoneParam === undefined)
        ? (logOrJob as Partial<ProductionLogReport>)
        : { jobNo: (logOrJob as JobCard).jobNo, qtyDone: qtyDoneParam || 1, operationName: undefined };
      await addAuditLog(
        'production',
        'log',
        `Logged ${logDetails.qtyDone} units for ${logDetails.jobNo}${logDetails.operationName ? ` (${logDetails.operationName})` : ''}`
      );
      toast.success(`Logged ${logDetails.qtyDone} units for ${logDetails.jobNo}`, 'Production Logged');
      await loadAllData();
      return res;
    } catch (err: any) {
      toast.error(err?.message || 'Failed to log production', 'Production Error');
      throw err;
    }
  };

  const handleUpdateQC = async (id: string, qcStatus: 'PASS' | 'QC_HOLD' | 'REJECTED', notes?: string) => {
    try {
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
      
      if (qcStatus === 'PASS') {
        toast.success(`QC Inspection Passed for #${targetOrderPo || id}`, 'QC Passed');
      } else if (qcStatus === 'REJECTED') {
        toast.error(`QC Inspection Rejected (NCR Raised) for #${targetOrderPo || id}`, 'QC Rejected');
      } else {
        toast.warning(`QC Inspection placed on Hold for #${targetOrderPo || id}`, 'QC Hold');
      }

      await loadAllData();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to update QC inspection', 'QC Error');
    }
  };

  const handlePassPDI = async (id: string, payload?: Partial<PDIInspection>) => {
    try {
      const target = pdiQueue.find(p => p.id === id || p.orderPo === id);
      const targetOrderPo = (payload?.orderPo || target?.orderPo || id || '').trim();
      const certNo = payload?.certificateNo || target?.certificateNo || `PDI-COC-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;

      const normPo = targetOrderPo.toUpperCase();

      setPdiQueue(prev => prev.map(p => {
        const match = p.id === id || (normPo && (p.orderPo || '').trim().toUpperCase() === normPo);
        if (match) {
          return {
            ...p,
            ...payload,
            pdiStatus: 'PASS',
            certificateNo: certNo,
            reportDate: new Date().toISOString().split('T')[0]
          };
        }
        return p;
      }));

      if (normPo) {
        setOrders(prev => prev.map(ord => {
          if ((ord.poNo || '').trim().toUpperCase() === normPo || (ord.id || '').trim().toUpperCase() === normPo) {
            return {
              ...ord,
              stage: 'READY_TO_DISPATCH' as any,
              status: 'READY_TO_DISPATCH' as any,
              progressStep: Math.max(ord.progressStep || 1, 7)
            };
          }
          return ord;
        }));

        // Explicitly update the order status
        const matchedOrder = orders.find(o => (o.poNo || '').trim().toUpperCase() === normPo || (o.id || '').trim().toUpperCase() === normPo);
        if (matchedOrder) {
          await updateOrder(matchedOrder.id, {
            stage: 'READY_TO_DISPATCH' as any,
            status: 'READY_TO_DISPATCH' as any,
            progressStep: 7
          }).catch(() => {});
        }
      }

      await passPDIInspection(id);
      await addAuditLog('pdi', 'pass', `Passed PDI inspection #${id} (Cert: ${certNo}, PO: ${targetOrderPo || 'N/A'})`);
      toast.success(`Passed PDI inspection for #${targetOrderPo || id} (Cert #${certNo})`, 'PDI Passed');
      await loadAllData();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to pass PDI inspection', 'PDI Error');
    }
  };

  const handleIssueDispatch = async (challan: DispatchChallan) => {
    try {
      await insertDispatchChallan(challan);
      await addAuditLog('dispatch', 'create', `Issued dispatch challan #${challan.challanNo}`);
      toast.success(`Issued delivery challan #${challan.challanNo}`, 'Challan Created');
      await loadAllData();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to issue dispatch challan', 'Challan Error');
    }
  };

  const handleRecordInvoicePayment = async (invoiceNo: string, paymentData?: any) => {
    try {
      const payAmt = paymentData?.paymentAmount;
      setInvoices(prev => prev.map(inv => {
        if (inv.id === invoiceNo || inv.invoiceNo === invoiceNo) {
          const amt = payAmt !== undefined ? Number(payAmt) : (inv.balanceAmount || inv.totalAmount);
          const newPaid = Math.min(inv.totalAmount, Number(inv.paidAmount || 0) + amt);
          const newBal = Math.max(0, inv.totalAmount - newPaid);
          return {
            ...inv,
            paidAmount: newPaid,
            balanceAmount: newBal,
            status: newBal <= 0 ? 'PAID' : 'PARTIAL'
          };
        }
        return inv;
      }));
      await payInvoice(invoiceNo, paymentData);
      await addAuditLog('invoice', 'payment', `Recorded payment for invoice #${invoiceNo} (Amount: ₹${payAmt !== undefined ? payAmt : 'Full'})`);
      toast.success(`Recorded payment for invoice #${invoiceNo}`, 'Payment Recorded');
      await loadAllData();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to record invoice payment', 'Payment Error');
    }
  };

  const handleCreateInvoice = async (inv: CustomerInvoice) => {
    try {
      setInvoices(prev => [inv, ...prev.filter(i => i.invoiceNo !== inv.invoiceNo && i.id !== inv.id)]);
      if (inv.orderPo) {
        setOrders(prev => prev.map(o => {
          if ((o.poNo && o.poNo.trim().toUpperCase() === inv.orderPo?.trim().toUpperCase()) || (o.id && o.id.trim().toUpperCase() === inv.orderPo?.trim().toUpperCase())) {
            return {
              ...o,
              invoiceNo: inv.invoiceNo,
              status: 'INVOICED',
              stage: 'INVOICED',
              progressStep: 8
            };
          }
          return o;
        }));
      }
      await insertCustomerInvoice(inv);
      await addAuditLog('invoice', 'create', `Created invoice #${inv.invoiceNo} for ${inv.customerName}`);
      toast.success(`Created invoice #${inv.invoiceNo} for ${inv.customerName}`, 'Invoice Generated');
      await loadAllData();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to create invoice', 'Invoice Error');
    }
  };

  const handleIssueInvoice = async (invoiceNo: string) => {
    try {
      setInvoices(prev => prev.map(inv => {
        if (inv.id === invoiceNo || inv.invoiceNo === invoiceNo) {
          return {
            ...inv,
            status: 'ISSUED'
          };
        }
        return inv;
      }));
      await issueCustomerInvoice(invoiceNo);
      await addAuditLog('invoice', 'issue', `Issued tax invoice #${invoiceNo}`);
      toast.success(`Issued tax invoice #${invoiceNo}`, 'Invoice Issued');
      await loadAllData();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to issue invoice', 'Invoice Error');
    }
  };

  const handleRecordPayablePayment = async (billNo: string) => {
    try {
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
      toast.success(`Recorded payment for vendor bill #${billNo}`, 'Payable Settled');
      await loadAllData();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to record bill payment', 'Payment Error');
    }
  };

  const handleCreateVendorBill = async (bill: VendorBill) => {
    try {
      await insertVendorBill(bill);
      await addAuditLog('payable', 'create', `Created vendor bill #${bill.billNo} for ${bill.vendorName}`);
      toast.success(`Created vendor bill #${bill.billNo} for ${bill.vendorName}`, 'Bill Created');
      await loadAllData();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to create vendor bill', 'Bill Error');
    }
  };

  const handleCreateOutwork = async (outwork: OutworkSendOut) => {
    try {
      await insertOutworkSendOut(outwork);
      await addAuditLog('outwork', 'create', `Issued outwork process #${outwork.sendOutId} to ${outwork.vendorName}`);
      toast.success(`Issued outwork process #${outwork.sendOutId}`, 'Outwork Issued');
      await loadAllData();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to issue outwork', 'Outwork Error');
    }
  };

  const handleCompletePDI = async (orderId: string, payload: any) => {
    await completePdiInspectionForOrder(orderId, payload);
    await addAuditLog('qc', 'complete_pdi', `Completed PDI for order ${payload.orderPo}: Status ${payload.pdiStatus} (${payload.acceptedQty} Accepted)`);
    await loadAllData();
  };

  const handleGenerateInvoice = async (orderId: string, invoiceData: any) => {
    const invNo = invoiceData.invoiceNo || `INV-26-${Math.floor(1000 + Math.random() * 9000)}`;
    setInvoices(prev => [{
      id: `inv-${Date.now()}`,
      invoiceNo: invNo,
      orderPo: invoiceData.orderPo,
      challanNo: invoiceData.challanNo,
      customerName: invoiceData.customerName,
      amount: invoiceData.totalAmount,
      totalAmount: invoiceData.totalAmount,
      taxAmount: invoiceData.taxAmount || 0,
      status: 'UNPAID',
      invoiceDate: invoiceData.invoiceDate || new Date().toISOString().split('T')[0],
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    }, ...prev]);

    setOrders(prev => prev.map(o => (o.id === orderId || o.poNo === invoiceData.orderPo) ? {
      ...o,
      invoiceNo: invNo,
      status: 'INVOICE_GENERATED' as any,
      stage: 'INVOICE_GENERATED' as any,
      progressStep: 8
    } : o));

    const inv = await generateInvoiceForOrder(orderId, invoiceData);
    await addAuditLog('invoices', 'generate', `Generated Tax Invoice ${inv.invoiceNo} for Order ${invoiceData.orderPo}`);
    await loadAllData();
    return inv;
  };

  const handleGenerateChallan = async (orderId: string, challanData: any) => {
    const ch = await generateChallanForOrder(orderId, challanData);
    await addAuditLog('dispatch', 'generate_challan', `Generated Delivery Challan ${ch.challanNo} via ${challanData.transporter}`);
    await loadAllData();
    return ch;
  };

  const handleUpdateChallan = async (challanNo: string, updates: any) => {
    setDispatches(prev => prev.map(d => (d.challanNo === challanNo || d.id === challanNo) ? { ...d, ...updates } : d));
    const updated = await updateDispatchChallan(challanNo, updates);
    await addAuditLog('dispatch', 'update_challan', `Updated Delivery Challan ${challanNo} (${updates.status || updates.transporter || updates.vehicleNo || 'draft params'})`);
    await loadAllData();
    return updated;
  };

  const handleCancelChallan = async (challanNo: string, reason = 'Cancelled by user') => {
    setDispatches(prev => prev.map(d => (d.challanNo === challanNo || d.id === challanNo) ? { ...d, status: 'CANCELLED' as any } : d));
    await cancelDispatchChallan(challanNo, reason);
    await addAuditLog('dispatch', 'cancel_challan', `Cancelled Delivery Challan ${challanNo}: ${reason}`);
    await loadAllData();
  };

  const handleMarkDispatched = async (orderId: string, dispatchData: any) => {
    // Instant optimistic update for dispatches
    if (dispatchData.challanNo) {
      setDispatches(prev => prev.map(d => (d.challanNo === dispatchData.challanNo || d.id === dispatchData.challanNo) ? { ...d, status: 'DISPATCHED' as any } : d));
      await updateDispatchChallan(dispatchData.challanNo, { status: 'DISPATCHED' }).catch(() => {});
    }
    // Instant optimistic update for orders
    setOrders(prev => prev.map(ord => {
      if (ord.id === orderId || ord.poNo === orderId || (dispatchData.challanNo && ord.deliveryChallanNo === dispatchData.challanNo)) {
        return {
          ...ord,
          status: 'DISPATCHED' as any,
          stage: 'DISPATCHED' as any,
          transporterName: dispatchData.transporter || ord.transporterName,
          dispatchedAt: dispatchData.dispatchDate || new Date().toISOString().split('T')[0],
          progressStep: 8,
          lines: (ord.lines || []).map(l => ({
            ...l,
            dispatchedQty: l.orderQty,
            pendingQty: 0
          }))
        };
      }
      return ord;
    }));

    await markOrderDispatched(orderId, dispatchData);
    await addAuditLog('dispatch', 'mark_dispatched', `Dispatched consignment for Order #${orderId} via ${dispatchData.transporter} (${dispatchData.vehicleNo})`);
    await loadAllData();
  };

  const handleMarkDelivered = async (orderId: string, deliveryData: any) => {
    setOrders(prev => prev.map(ord => {
      if (ord.id === orderId || ord.poNo === orderId) {
        return {
          ...ord,
          status: 'DELIVERED',
          stage: 'DELIVERED',
          podDocumentUrl: deliveryData.podUrl || 'POD-VERIFIED-PHYSICAL',
          podReceivedBy: deliveryData.receivedBy,
          podReceivedDate: deliveryData.deliveryDate,
          progressStep: 9
        };
      }
      return ord;
    }));

    await markOrderDelivered(orderId, deliveryData);
    await addAuditLog('dispatch', 'mark_delivered', `Marked Order #${orderId} as Delivered to ${deliveryData.receivedBy}`);
    await loadAllData();
  };

  const handleMarkDelayed = async (orderId: string, delayData: { reason?: string; followUpDate?: string }) => {
    setOrders(prev => prev.map(ord => {
      if (ord.id === orderId || ord.poNo === orderId) {
        return {
          ...ord,
          status: 'DELIVERY_DELAYED' as any,
          stage: 'DELIVERY_DELAYED' as any,
          progressStep: 9
        };
      }
      return ord;
    }));

    await markOrderDelayed(orderId, delayData);
    await addAuditLog('dispatch', 'mark_delayed', `Marked Order #${orderId} as Delivery Delayed: ${delayData.reason || 'No reason specified'}`);
    await loadAllData();
  };

  const handleRecordPayment = async (orderId: string, paymentData: any) => {
    const payAmt = Number(paymentData.amount || paymentData.paymentAmount || 0);
    const targetInvNo = paymentData.invoiceNo;

    setOrders(prev => prev.map(ord => {
      if (ord.id === orderId || ord.poNo === orderId) {
        const gross = Number(ord.grossAmount || ord.totalAmount || 0);
        const newPaid = Number(ord.paidAmount || 0) + payAmt;
        const isPaid = newPaid >= gross;
        return {
          ...ord,
          paidAmount: newPaid,
          paymentStatus: isPaid ? 'PAID' : 'PARTIAL'
        };
      }
      return ord;
    }));

    // Synchronize the linked invoice in Invoices & Payments state
    setInvoices(prev => prev.map(inv => {
      const order = orders.find(o => o.id === orderId || o.poNo === orderId);
      const isMatch = (targetInvNo && (inv.invoiceNo === targetInvNo || inv.id === targetInvNo)) ||
                      (order && order.invoiceNo && (inv.invoiceNo === order.invoiceNo || inv.id === order.invoiceNo)) ||
                      (order && inv.orderPo && (inv.orderPo.trim().toUpperCase() === order.poNo?.trim().toUpperCase() || inv.orderPo.trim().toUpperCase() === order.id.trim().toUpperCase())) ||
                      (inv.id === orderId || inv.invoiceNo === orderId);
      if (isMatch) {
        const total = Number(inv.totalAmount || 0);
        const newPaid = Math.min(total, Number(inv.paidAmount || 0) + payAmt);
        const newBal = Math.max(0, total - newPaid);
        return {
          ...inv,
          paidAmount: newPaid,
          balanceAmount: newBal,
          status: newBal <= 0 ? 'PAID' : 'PARTIAL'
        };
      }
      return inv;
    }));

    // If an invoice is linked, also call payInvoice to update backend invoice records
    const targetOrder = orders.find(o => o.id === orderId || o.poNo === orderId);
    const resolvedInvoiceNo = targetInvNo || targetOrder?.invoiceNo;
    if (resolvedInvoiceNo) {
      await payInvoice(resolvedInvoiceNo, {
        paymentAmount: payAmt,
        paymentMode: paymentData.mode || 'NEFT_RTGS',
        referenceNo: paymentData.referenceNo,
        paymentDate: paymentData.paymentDate,
        notes: paymentData.remarks
      });
    }

    const res = await recordOrderPaymentAndClose(orderId, paymentData);
    await addAuditLog('finance', 'record_payment', `Recorded payment of ₹${payAmt.toLocaleString()} for Order #${orderId} (${res.isFullyPaid ? 'PAID IN FULL' : 'PARTIALLY PAID'})`);
    await loadAllData();
    return res;
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

  const handleUpdateUser = async (userId: string, updates: Partial<SystemUser>) => {
    setUsers(prev => prev.map(u => u.id === userId ? { ...u, ...updates } : u));
    const saved = localStorage.getItem('stratum_user');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.id === userId || parsed.email === users.find(u => u.id === userId)?.email) {
          localStorage.setItem('stratum_user', JSON.stringify({ ...parsed, ...updates }));
        }
      } catch (_) {}
    }
    await updateProfile(userId, updates);
    await addAuditLog('users', 'update_user', `Updated user record #${userId} [Name: ${updates.name || '—'}, Email: ${updates.email || '—'}, Role: ${updates.role || '—'}]`);
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
    await addAuditLog('system', 'sync', 'Synchronized live system state with database in real-time.');
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

  const handleAddMasterItem = async (item: Partial<MasterItem>) => {
    try {
      const created = await insertMaster(item);
      setMasters(prev => [created, ...prev.filter(m => m.code !== created.code)]);
      await addAuditLog('masters', 'add_master', `Added item master ${created.code} (${created.name})`);
      toast.success(`Added item master ${created.code} (${created.name})`, 'Item Master Created');
    } catch (err: any) {
      console.warn('handleAddMasterItem error:', err);
      toast.error(err?.message || 'Failed to add item master', 'Error Adding Item');
    }
    await loadAllData();
  };

  const handleUpdateMasterItem = async (code: string, item: Partial<MasterItem>) => {
    try {
      const updated = await updateMasterItem(code, item);
      setMasters(prev => prev.map(m => m.code === code ? { ...m, ...updated } : m));
      await addAuditLog('masters', 'update_master', `Updated item master ${code} (${item.name || item.description || ''})`);
      toast.success(`Updated item master ${code}`, 'Item Master Updated');
    } catch (err: any) {
      console.warn('handleUpdateMasterItem error:', err);
      toast.error(err?.message || 'Failed to update item master', 'Error Updating Item');
    }
    await loadAllData();
  };

  const handleDeleteMasterItem = async (code: string) => {
    setMasters(prev => prev.filter(m => m.code !== code));
    try {
      await deleteMasterItem(code);
      toast.info(`Deleted item master ${code}`, 'Item Master Deleted');
    } catch (err: any) {
      console.warn('handleDeleteMasterItem error:', err);
      toast.error(err?.message || 'Failed to delete item master', 'Delete Error');
    }
    await addAuditLog('masters', 'delete_master', `Deleted item master ${code}`);
    await loadAllData();
  };

  const handleAddCustomer = async (c: CustomerMaster) => {
    setCustomers(prev => [c, ...prev.filter(item => item.code !== c.code)]);
    try {
      await insertCustomer(c);
      toast.success(`Saved customer ${c.name} (${c.code})`, 'Customer Saved');
    } catch (err: any) {
      console.warn('Realtime Supabase customer insert error:', err);
      toast.error(err?.message || 'Failed to save customer', 'Customer Error');
    }
    await addAuditLog('masters', 'add_customer', `Added/updated customer master ${c.code} (${c.name})`);
    await loadAllData();
  };

  const handleUpdateCustomer = async (code: string, c: CustomerMaster) => {
    setCustomers(prev => prev.map(item => item.code === code ? { ...item, ...c } : item));
    try {
      await updateCustomer(code, c);
      toast.success(`Updated customer ${c.name}`, 'Customer Updated');
    } catch (err: any) {
      console.warn('Realtime Supabase customer update error:', err);
      toast.error(err?.message || 'Failed to update customer', 'Update Error');
    }
    await addAuditLog('masters', 'update_customer', `Updated customer master ${code} (${c.name})`);
    await loadAllData();
  };

  const handleDeleteCustomer = async (code: string) => {
    setCustomers(prev => prev.filter(item => item.code !== code));
    try {
      await deleteCustomer(code);
      toast.info(`Deleted customer ${code}`, 'Customer Deleted');
    } catch (err: any) {
      console.warn('Realtime Supabase customer delete error:', err);
      toast.error(err?.message || 'Failed to delete customer', 'Delete Error');
    }
    await addAuditLog('masters', 'delete_customer', `Deleted customer master ${code}`);
    await loadAllData();
  };

  const handleAddVendor = async (v: VendorMaster) => {
    setVendors(prev => [v, ...prev.filter(item => item.code !== v.code)]);
    try {
      await insertVendor(v);
      toast.success(`Saved vendor ${v.name} (${v.code})`, 'Vendor Saved');
    } catch (err: any) {
      console.warn('Realtime Supabase vendor insert error:', err);
      toast.error(err?.message || 'Failed to save vendor', 'Vendor Error');
    }
    await addAuditLog('masters', 'add_vendor', `Added/updated vendor master ${v.code} (${v.name})`);
    await loadAllData();
  };

  const handleUpdateVendor = async (code: string, v: VendorMaster) => {
    setVendors(prev => prev.map(item => item.code === code ? { ...item, ...v } : item));
    try {
      await updateVendor(code, v);
      toast.success(`Updated vendor ${v.name}`, 'Vendor Updated');
    } catch (err: any) {
      console.warn('Realtime Supabase vendor update error:', err);
      toast.error(err?.message || 'Failed to update vendor', 'Update Error');
    }
    await addAuditLog('masters', 'update_vendor', `Updated vendor master ${code} (${v.name})`);
    await loadAllData();
  };

  const handleDeleteVendor = async (code: string) => {
    setVendors(prev => prev.filter(item => item.code !== code));
    try {
      await deleteVendor(code);
      toast.info(`Deleted vendor ${code}`, 'Vendor Deleted');
    } catch (err: any) {
      console.warn('Realtime Supabase vendor delete error:', err);
      toast.error(err?.message || 'Failed to delete vendor', 'Delete Error');
    }
    await addAuditLog('masters', 'delete_vendor', `Deleted vendor master ${code}`);
    await loadAllData();
  };

  const handleAddMachine = async (m: MachineMaster) => {
    setMachines(prev => [m, ...prev.filter(item => item.code !== m.code)]);
    try {
      await insertMachine(m);
      toast.success(`Saved machine ${m.name} (${m.code})`, 'Machine Saved');
    } catch (err: any) {
      console.warn('Realtime Supabase machine insert error:', err);
      toast.error(err?.message || 'Failed to save machine', 'Machine Error');
    }
    await addAuditLog('masters', 'add_machine', `Added/updated machine master ${m.code} (${m.name})`);
    await loadAllData();
  };

  const handleUpdateMachine = async (code: string, m: MachineMaster) => {
    setMachines(prev => prev.map(item => item.code === code ? { ...item, ...m } : item));
    try {
      await updateMachine(code, m);
      toast.success(`Updated machine ${m.name}`, 'Machine Updated');
    } catch (err: any) {
      console.warn('Realtime Supabase machine update error:', err);
      toast.error(err?.message || 'Failed to update machine', 'Update Error');
    }
    await addAuditLog('masters', 'update_machine', `Updated machine master ${code} (${m.name})`);
    await loadAllData();
  };

  const handleDeleteMachine = async (code: string) => {
    setMachines(prev => prev.filter(item => item.code !== code));
    try {
      await deleteMachine(code);
      toast.info(`Deleted machine ${code}`, 'Machine Deleted');
    } catch (err: any) {
      console.warn('Realtime Supabase machine delete error:', err);
      toast.error(err?.message || 'Failed to delete machine', 'Delete Error');
    }
    await addAuditLog('masters', 'delete_machine', `Deleted machine master ${code}`);
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
    handleStartOperation,
    handleCompleteOperation,
    handleLogProduction,
    handleUpdateQC,
    handlePassPDI,
    handleCompletePDI,
    handleGenerateInvoice,
    handleGenerateChallan,
    handleUpdateChallan,
    handleCancelChallan,
    handleMarkDispatched,
    handleMarkDelivered,
    handleMarkDelayed,
    handleRecordPayment,
    handleIssueDispatch,
    handleRecordInvoicePayment,
    handleCreateInvoice,
    handleIssueInvoice,
    handleRecordPayablePayment,
    handleCreateVendorBill,
    handleCreateOutwork,
    handleAddMasterItem,
    handleUpdateMasterItem,
    handleDeleteMasterItem,
    handleAddCustomer,
    handleUpdateCustomer,
    handleDeleteCustomer,
    handleAddVendor,
    handleUpdateVendor,
    handleDeleteVendor,
    handleAddMachine,
    handleUpdateMachine,
    handleDeleteMachine,
    handleImportOMGST,
    handleAddUser,
    handleUpdateUser,
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
