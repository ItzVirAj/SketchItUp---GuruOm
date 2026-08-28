import React, { useState, useEffect, useRef } from 'react';
import { 
  ConsoleView, 
  UserRole, 
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
  PendingApproval 
} from '../../types/console';

import { ConsoleHeader } from './ConsoleHeader';
import { ConsoleSidebar } from './ConsoleSidebar';

import { CommandCentreView } from './views/CommandCentreView';
import { OrdersView } from './views/OrdersView';
import { OrderDetailView } from './views/OrderDetailView';
import { InventoryView } from './views/InventoryView';
import { ProductionView } from './views/ProductionView';
import { FinishedGoodsView } from './views/FinishedGoodsView';
import { PlatingOutworkView } from './views/PlatingOutworkView';
import { ReportsView } from './views/ReportsView';
import { QCView } from './views/QCView';
import { PDIView } from './views/PDIView';
import { DispatchView } from './views/DispatchView';
import { ApprovalsView } from './views/ApprovalsView';
import { InvoicesView } from './views/InvoicesView';
import { PayablesView } from './views/PayablesView';
import { MastersView } from './views/MastersView';
import { UsersAuditView } from './views/UsersAuditView';
import { CompanyProfileView } from './views/CompanyProfileView';
import { WorkflowTestingView } from './views/WorkflowTestingView';
import { AccessRestrictedGate } from '../common/AccessRestrictedGate';
import { SwitchUserModal } from '../common/SwitchUserModal';
import { SecuritySessionsModal } from './modals/SecuritySessionsModal';
import { isViewAllowedForRole } from '../../utils/permissions';
import { useAuth } from '../../context/AuthContext';
import { useOwnerOSData } from '../../hooks/useOwnerOSData';
import { useSmoothScroll } from '../../hooks/useSmoothScroll';
import { fetchOrderById } from '../../services/supabaseServices';

import { useLocation, useNavigate } from 'react-router-dom';

interface ConsoleContainerProps {
  onSignOut?: () => void;
}

const getPathForView = (view: ConsoleView, orderId?: string | null): string => {
  switch (view) {
    case 'command-centre':
      return '/command-center';
    case 'orders':
      return '/orders';
    case 'order-detail':
      return `/orders/${orderId || 'ord-1'}`;
    case 'inventory':
      return '/inventory';
    case 'production':
      return '/production';
    case 'finished-goods':
      return '/finished-goods';
    case 'plating-outwork':
      return '/plating-outwork';
    case 'reports':
      return '/reports';
    case 'qc':
      return '/qc';
    case 'pdi':
      return '/pdi';
    case 'dispatch':
      return '/dispatch';
    case 'approvals':
      return '/approvals';
    case 'invoices':
      return '/invoices';
    case 'payables':
      return '/payables';
    case 'masters':
      return '/masters';
    case 'users-audit':
      return '/users-audit';
    case 'company-profile':
      return '/company-profile';
    case 'workflow-testing':
      return '/workflow-testing';
    case 'bom':
      return '/production?tab=bom';
    case 'route-cards':
      return '/production?tab=route-cards';
    default:
      return '/command-center';
  }
};

export const ConsoleContainer: React.FC<ConsoleContainerProps> = ({ onSignOut }) => {
  const { profile: authProfile } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const [currentView, setCurrentView] = useState<ConsoleView>('command-centre');
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>('ord-1');
  const [pendingJobCardOrderPo, setPendingJobCardOrderPo] = useState<string | null>(null);
  const [pendingInvoiceOrderPo, setPendingInvoiceOrderPo] = useState<string | null>(null);
  const [pendingInvoiceDispatchNo, setPendingInvoiceDispatchNo] = useState<string | null>(null);
  const [pendingPdiOrderPo, setPendingPdiOrderPo] = useState<string | null>(null);
  const [pendingPdiJobNo, setPendingPdiJobNo] = useState<string | null>(null);
  const [pendingDispatchOrderPo, setPendingDispatchOrderPo] = useState<string | null>(null);
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    try {
      const item = localStorage.getItem('stratum_darkMode');
      return item ? JSON.parse(item) : false;
    } catch {
      return false;
    }
  });
  const [fiscalYear, setFiscalYear] = useState<string>('FY 26-27');
  const [scope, setScope] = useState<string>('FY 26-27');
  const [showCustomizeModal, setShowCustomizeModal] = useState<boolean>(false);
  const [isOpenMobile, setIsOpenMobile] = useState<boolean>(false);
  const [isSwitchUserOpen, setIsSwitchUserOpen] = useState<boolean>(false);
  const [isSecurityModalOpen, setIsSecurityModalOpen] = useState<boolean>(false);
  const [currentUserId, setCurrentUserId] = useState<string>(authProfile?.id || '');
  const [isRealtimeStreaming, setIsRealtimeStreaming] = useState<boolean>(true);

  // Butter-smooth, delayed momentum scrolling on the main workspace canvas
  const mainScrollRef = useRef<HTMLElement | null>(null);
  useSmoothScroll(mainScrollRef, [currentView]);

  useEffect(() => {
    if (authProfile?.id && !currentUserId) {
      setCurrentUserId(authProfile.id);
    }
  }, [authProfile?.id, currentUserId]);

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('stratum_darkMode', JSON.stringify(isDarkMode));
  }, [isDarkMode]);

  const activeUserFallback: SystemUser = authProfile || {
    id: 'usr-1',
    name: 'Sachin Gharbude (Founder & CEO)',
    email: 'owner@guruom.in',
    role: 'SUPER ADMIN',
    status: 'ACTIVE',
    department: 'Executive Management',
    phone: '+91 98250 12345'
  };

  const {
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
    handleCloseOrder: serviceCloseOrder,
    handleCancelOrder: serviceCancelOrder,
    handleAdjustStock,
    handleCreateJobCard,
    handleStartOperation,
    handleCompleteOperation,
    handleLogProduction,
    handleUpdateQC,
    handlePassPDI,
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
    handleRevokeUser: serviceRevokeUser,
    handleRestoreUser,
    handleUpdateUserRole,
    handleDeleteUser,
    handleApprove,
    handleReject,
    handleSync,
    handleResetAllData,
    handleClearOperationalData,
    handleCompletePDI,
    handleGenerateInvoice,
    handleGenerateChallan,
    handleUpdateChallan,
    handleCancelChallan,
    handleMarkDispatched,
    handleMarkDelivered,
    handleMarkDelayed,
    handleRecordPayment
  } = useOwnerOSData(activeUserFallback);

  const currentUser = 
    (currentUserId ? users.find(u => u.id === currentUserId) : null) ||
    (authProfile?.email ? users.find(u => u.email.toLowerCase() === authProfile.email.toLowerCase()) : null) ||
    authProfile ||
    activeUserFallback;

  const currentRole: UserRole = currentUser?.role || authProfile?.role || 'SUPER ADMIN';

  const [dynamicFetchedOrder, setDynamicFetchedOrder] = useState<CustomerOrder | null>(null);

  // URL History Sync Effect
  useEffect(() => {
    const path = location.pathname;

    if (path === '/' || path === '/command-center' || path === '/command-centre') {
      setCurrentView('command-centre');
    } else if (path.startsWith('/orders/')) {
      const rawId = path.replace('/orders/', '');
      if (rawId) {
        const matched = orders.find(o => o.id === rawId || o.poNo === rawId);
        if (matched) {
          setSelectedOrderId(matched.id);
          setDynamicFetchedOrder(null);
        } else {
          setSelectedOrderId(rawId);
          fetchOrderById(rawId).then(remote => {
            if (remote) setDynamicFetchedOrder(remote);
          }).catch(() => {});
        }
        setCurrentView('order-detail');
      } else {
        setCurrentView('orders');
      }
    } else if (path === '/orders') {
      setCurrentView('orders');
    } else if (path.startsWith('/masters')) {
      setCurrentView('masters');
    } else if (path === '/inventory') {
      setCurrentView('inventory');
    } else if (path === '/production' || path === '/bom' || path === '/route-cards') {
      if (path === '/bom') {
        setCurrentView('bom');
      } else if (path === '/route-cards') {
        setCurrentView('route-cards');
      } else {
        setCurrentView('production');
      }
    } else if (path === '/finished-goods') {
      setCurrentView('finished-goods');
    } else if (path === '/plating-outwork') {
      setCurrentView('plating-outwork');
    } else if (path === '/reports') {
      setCurrentView('reports');
    } else if (path === '/qc') {
      setCurrentView('qc');
    } else if (path === '/pdi') {
      setCurrentView('pdi');
    } else if (path === '/dispatch') {
      setCurrentView('dispatch');
    } else if (path === '/approvals') {
      setCurrentView('approvals');
    } else if (path === '/invoices') {
      setCurrentView('invoices');
    } else if (path === '/payables') {
      setCurrentView('payables');
    } else if (path === '/users-audit') {
      setCurrentView('users-audit');
    } else if (path === '/company-profile') {
      setCurrentView('company-profile');
    } else if (path === '/workflow-testing') {
      setCurrentView('workflow-testing');
    }
  }, [location.pathname, orders]);

  const handleNavigateView = (view: ConsoleView, orderId?: string | null) => {
    setCurrentView(view);
    const targetPath = getPathForView(view, orderId || selectedOrderId);
    if (location.pathname !== targetPath) {
      navigate(targetPath);
    }
  };

  const handleSelectOrder = (target: string | CustomerOrder) => {
    let orderId = '';
    if (typeof target === 'string') {
      orderId = target;
    } else if (target && typeof target === 'object') {
      orderId = target.id || target.poNo || '';
    }
    if (!orderId) return;

    setSelectedOrderId(orderId);
    setDynamicFetchedOrder(null);
    setCurrentView('order-detail');
    const targetPath = `/orders/${orderId}`;
    if (location.pathname !== targetPath) {
      navigate(targetPath);
    }
  };

  const handleCloseOrder = async (orderId: string) => {
    await serviceCloseOrder(orderId);
    handleNavigateView('orders');
  };

  const handleCancelOrder = async (orderId: string) => {
    await serviceCancelOrder(orderId);
    handleNavigateView('orders');
  };

  const handleSwitchUser = (targetUserId: string): { success: boolean; error?: string } => {
    const targetUser = users.find(u => u.id === targetUserId);
    if (!targetUser) return { success: false, error: 'User record not found.' };

    if (targetUser.status === 'REVOKED') {
      return { 
        success: false, 
        error: `Access Revoked: Account "${targetUser.name}" has been revoked by Super Admin.` 
      };
    }

    setCurrentUserId(targetUserId);
    localStorage.setItem('stratum_user', JSON.stringify(targetUser));
    return { success: true };
  };

  const handleRevokeUser = async (targetUserId: string) => {
    await serviceRevokeUser(targetUserId);
    if (targetUserId === currentUserId) {
      setCurrentUserId(users[0]?.id || 'usr-1');
    }
  };

  const liveSelected = orders.find(o => o.id === selectedOrderId || o.poNo === selectedOrderId);

  // Realtime bridge: when the viewed order was opened via a dynamic fetch (not present
  // in the shared `orders` list), SSE order broadcasts only update `orders`. Merging the
  // live `orders` entry over the dynamic snapshot guarantees the OrderDetail pipeline
  // stepper (Production & Order Fulfillment Pipeline) updates live without a refresh.
  const dynamicLive = dynamicFetchedOrder
    ? orders.find(o => o.id === dynamicFetchedOrder.id || o.poNo === dynamicFetchedOrder.poNo ||
                       o.id === dynamicFetchedOrder.poNo || o.poNo === dynamicFetchedOrder.id)
    : null;
  const selectedOrder = liveSelected ||
    (dynamicFetchedOrder ? { ...dynamicFetchedOrder, ...(dynamicLive || {}) } : null) ||
    orders[0];



  return (
    <div className={`h-screen flex flex-col font-sans transition-colors overflow-hidden ${
      isDarkMode ? 'bg-[#121316] text-[#F3F4F6]' : 'bg-[#F4F6F9] text-slate-900'
    }`}>
      {/* Console Header */}
      <ConsoleHeader
        fiscalYear={fiscalYear}
        setFiscalYear={setFiscalYear}
        scope={scope}
        setScope={setScope}
        onOpenCustomize={() => setShowCustomizeModal(true)}
        onOpenSecurityModal={() => setIsSecurityModalOpen(true)}
        isDarkMode={isDarkMode}
        setIsDarkMode={setIsDarkMode}
        currentRole={currentRole}
        setCurrentRole={(role) => handleUpdateUserRole(currentUserId, role)}
        userName={currentUser ? currentUser.name : "Sachin Gharbude"}
        currentUser={currentUser}
        onOpenSwitchUser={() => setIsSwitchUserOpen(true)}
        onSync={handleSync}
        lastSynced={lastSynced}
        onToggleMobileMenu={() => setIsOpenMobile(!isOpenMobile)}
        orders={orders}
        stock={stock}
        invoices={invoices}
        jobCards={jobCards}
        onNavigate={(view) => handleNavigateView(view)}
        onSelectOrder={handleSelectOrder}
        onSignOut={onSignOut}
      />

      {/* Main Workspace Body */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <ConsoleSidebar
          currentView={currentView}
          setCurrentView={(view) => handleNavigateView(view)}
          currentRole={currentRole}
          isDarkMode={isDarkMode}
          currentUser={currentUser}
          userName={currentUser ? currentUser.name : "Sachin Gharbude"}
          onSignOut={onSignOut}
          onOpenSecurityModal={() => setIsSecurityModalOpen(true)}
          isOpenMobile={isOpenMobile}
          setIsOpenMobile={setIsOpenMobile}
        />

        {/* Dynamic View Canvas */}
        <main ref={mainScrollRef} className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 bg-[#F4F6F9] dark:bg-[#121316]">
          <div key={currentView} className="space-y-6">
            {!isViewAllowedForRole(currentRole, currentView) ? (
              <AccessRestrictedGate
                currentUser={currentUser}
                targetView={currentView}
                isDarkMode={isDarkMode}
                onNavigateHome={() => setCurrentView('command-centre')}
                onOpenSwitchUser={() => onSignOut ? onSignOut() : setIsSwitchUserOpen(true)}
              />
            ) : (
              <>
                {currentView === 'command-centre' && (
            <CommandCentreView
              orders={orders}
              stock={stock}
              shortages={shortages}
              qcItems={qcQueue}
              jobCards={jobCards}
              dispatches={dispatches}
              invoices={invoices}
              payables={payables}
              productionLogs={productionLogs}
              pdiQueue={pdiQueue}
              machines={machines}
              users={users}
              auditLogs={auditLogs}
              isDarkMode={isDarkMode}
              isRealtimeStreaming={isRealtimeStreaming}
              onToggleRealtimeStreaming={() => setIsRealtimeStreaming(!isRealtimeStreaming)}
              onResetAllData={handleSync}
              onNavigate={(view) => handleNavigateView(view)}
              onNavigateView={(view) => handleNavigateView(view)}
              onSelectOrder={handleSelectOrder}
              scope={scope}
              setScope={setScope}
              showCustomizeModal={showCustomizeModal}
              setShowCustomizeModal={setShowCustomizeModal}
            />
          )}

          {currentView === 'orders' && (
            <OrdersView
              orders={orders}
              qcQueue={qcQueue}
              customers={customers}
              masters={masters}
              isDarkMode={isDarkMode}
              onSelectOrder={handleSelectOrder}
              onCreateOrder={handleCreateOrder}
              onNavigateToCustomers={() => {
                navigate('/masters?tab=customers');
                handleNavigateView('masters');
              }}
              onNavigateToMasters={() => {
                navigate('/masters?tab=items');
                handleNavigateView('masters');
              }}
            />
          )}

          {currentView === 'order-detail' && selectedOrder && (
            <OrderDetailView
              order={selectedOrder}
              qcQueue={qcQueue}
              pdiQueue={pdiQueue}
              dispatches={dispatches}
              invoices={invoices}
              vendors={vendors}
              isDarkMode={isDarkMode}
              currentRole={currentRole}
              currentUser={currentUser}
              onBack={() => handleNavigateView('orders')}
              onNavigate={(view) => handleNavigateView(view as any)}
              onConfirmOrder={async (orderId) => {
                if (dynamicFetchedOrder && (dynamicFetchedOrder.id === orderId || dynamicFetchedOrder.poNo === orderId)) {
                  setDynamicFetchedOrder(prev => prev ? { ...prev, status: 'CONFIRMED', stage: 'CONFIRMED', progressStep: 2 } : null);
                }
                return handleConfirmOrder(orderId);
              }}
              onUpdateOrder={(orderId, updates) => {
                if (dynamicFetchedOrder && (dynamicFetchedOrder.id === orderId || dynamicFetchedOrder.poNo === orderId)) {
                  setDynamicFetchedOrder(prev => prev ? { ...prev, ...updates } : null);
                }
                handleUpdateOrder(orderId, updates);
              }}
              onNavigateToCreateJobCard={(orderPo) => {
                setPendingJobCardOrderPo(orderPo);
                handleNavigateView('production');
              }}
              onNavigateToCreateInvoice={(orderPo, challanNo) => {
                setPendingInvoiceOrderPo(orderPo);
                setPendingInvoiceDispatchNo(challanNo || null);
                handleNavigateView('invoices');
              }}
              onCancelOrder={handleCancelOrder}
              onNavigateToPDI={(orderPo, jobNo) => {
                setPendingPdiOrderPo(orderPo || null);
                setPendingPdiJobNo(jobNo || null);
                handleNavigateView('pdi');
              }}
              onNavigateToDispatch={(orderPo) => {
                setPendingDispatchOrderPo(orderPo || null);
                handleNavigateView('dispatch');
              }}
              onCompletePDI={async (orderId, payload) => {
                if (dynamicFetchedOrder && (dynamicFetchedOrder.id === orderId || dynamicFetchedOrder.poNo === orderId)) {
                  setDynamicFetchedOrder(prev => prev ? { ...prev, status: 'READY_TO_DISPATCH', stage: 'READY_TO_DISPATCH', progressStep: 4 } : null);
                }
                return handleCompletePDI(orderId, payload);
              }}
              onGenerateInvoice={async (orderId, invoiceData) => {
                if (dynamicFetchedOrder && (dynamicFetchedOrder.id === orderId || dynamicFetchedOrder.poNo === orderId)) {
                  const invNo = typeof invoiceData === 'string' ? invoiceData : (invoiceData.invoiceNo || invoiceData.invoice_no);
                  setDynamicFetchedOrder(prev => prev ? { ...prev, invoiceNo: invNo } : null);
                }
                return handleGenerateInvoice(orderId, invoiceData);
              }}
              onGenerateChallan={async (orderId, challanData) => {
                if (dynamicFetchedOrder && (dynamicFetchedOrder.id === orderId || dynamicFetchedOrder.poNo === orderId)) {
                  const chNo = typeof challanData === 'string' ? challanData : (challanData.challanNo || challanData.challan_no);
                  setDynamicFetchedOrder(prev => prev ? { ...prev, deliveryChallanNo: chNo } : null);
                }
                return handleGenerateChallan(orderId, challanData);
              }}
              onUpdateChallan={handleUpdateChallan}
              onCancelChallan={handleCancelChallan}
              onMarkDispatched={async (orderId, dispatchData) => {
                if (dynamicFetchedOrder && (dynamicFetchedOrder.id === orderId || dynamicFetchedOrder.poNo === orderId)) {
                  setDynamicFetchedOrder(prev => prev ? {
                    ...prev,
                    status: 'DISPATCHED',
                    stage: 'DISPATCHED',
                    progressStep: 5,
                    deliveryChallanNo: dispatchData?.challanNo || prev.deliveryChallanNo
                  } : null);
                }
                return handleMarkDispatched(orderId, dispatchData);
              }}
              onMarkDelivered={async (orderId, deliveryData) => {
                if (dynamicFetchedOrder && (dynamicFetchedOrder.id === orderId || dynamicFetchedOrder.poNo === orderId)) {
                  setDynamicFetchedOrder(prev => prev ? {
                    ...prev,
                    status: 'DELIVERED',
                    stage: 'DELIVERED',
                    progressStep: 6,
                    podDocumentUrl: deliveryData?.podDocumentUrl || prev.podDocumentUrl,
                    podReceivedDate: deliveryData?.podReceivedDate || new Date().toISOString().split('T')[0],
                    podReceivedBy: deliveryData?.podReceivedBy || prev.podReceivedBy
                  } : null);
                }
                return handleMarkDelivered(orderId, deliveryData);
              }}
              onMarkDelayed={async (orderId, delayData) => {
                if (dynamicFetchedOrder && (dynamicFetchedOrder.id === orderId || dynamicFetchedOrder.poNo === orderId)) {
                  setDynamicFetchedOrder(prev => prev ? {
                    ...prev,
                    status: 'DELIVERY_DELAYED',
                    stage: 'DELIVERY_DELAYED',
                    delayedReason: delayData?.reason,
                    delayedFollowUpDate: delayData?.followUpDate
                  } : null);
                }
                return handleMarkDelayed(orderId, delayData);
              }}
              onRecordPayment={async (orderId, paymentData) => {
                if (dynamicFetchedOrder && (dynamicFetchedOrder.id === orderId || dynamicFetchedOrder.poNo === orderId)) {
                  const payAmt = Number(paymentData.amount || paymentData.paymentAmount || 0);
                  const gross = Number(dynamicFetchedOrder.grossAmount || 0);
                  const newPaid = Number(dynamicFetchedOrder.paidAmount || 0) + payAmt;
                  const isPaid = newPaid >= gross;
                  setDynamicFetchedOrder(prev => prev ? {
                    ...prev,
                    paidAmount: newPaid,
                    paymentStatus: isPaid ? 'PAID' : 'PARTIAL',
                    stage: (isPaid ? 'INVOICED' : 'PAYMENT_PENDING') as any,
                    status: (isPaid ? 'INVOICED' : 'PAYMENT_PENDING') as any,
                    progressStep: 10
                  } : null);
                }
                return handleRecordPayment(orderId, paymentData);
              }}
            />
          )}

          {currentView === 'inventory' && (
            <InventoryView
              stock={stock}
              shortages={shortages}
              masters={masters}
              isDarkMode={isDarkMode}
              onAdjustStock={handleAdjustStock}
            />
          )}

          {(currentView === 'production' || currentView === 'bom' || currentView === 'route-cards') && (
            <ProductionView
              jobCards={jobCards}
              orders={orders}
              productionLogs={productionLogs}
              qcItems={qcQueue}
              stock={stock}
              masters={masters}
              isDarkMode={isDarkMode}
              initialSection={currentView === 'bom' ? 'bom' : currentView === 'route-cards' ? 'route-cards' : 'job-cards'}
              onCreateJobCard={handleCreateJobCard}
              onStartOperation={handleStartOperation}
              onCompleteOperation={handleCompleteOperation}
              onLogProduction={handleLogProduction}
              onNavigate={handleNavigateView}
              onSelectOrder={handleSelectOrder}
              preselectedOrderPo={pendingJobCardOrderPo}
              onJobCardModalOpened={() => setPendingJobCardOrderPo(null)}
            />
          )}

          {currentView === 'finished-goods' && (
            <FinishedGoodsView
              items={finishedGoods}
              isDarkMode={isDarkMode}
            />
          )}

          {currentView === 'plating-outwork' && (
            <PlatingOutworkView
              outworks={outworkSendOuts}
              isDarkMode={isDarkMode}
            />
          )}

          {currentView === 'reports' && (
            <ReportsView
              orders={orders}
              stock={stock}
              productionLogs={productionLogs}
              qcItems={qcQueue}
              isDarkMode={isDarkMode}
            />
          )}

          {currentView === 'qc' && (
            <QCView
              qcItems={qcQueue}
              isDarkMode={isDarkMode}
              onUpdateQC={handleUpdateQC}
            />
          )}

          {currentView === 'pdi' && (
            <PDIView
              pdiItems={pdiQueue}
              isDarkMode={isDarkMode}
              preselectedOrderPo={pendingPdiOrderPo}
              preselectedJobNo={pendingPdiJobNo}
              onPdiModalOpened={() => {
                setPendingPdiOrderPo(null);
                setPendingPdiJobNo(null);
              }}
              onPassPDI={handlePassPDI}
            />
          )}

          {currentView === 'dispatch' && (
            <DispatchView
              dispatches={dispatches}
              orders={orders}
              vendors={vendors}
              isDarkMode={isDarkMode}
              preselectedOrderPo={pendingDispatchOrderPo}
              onDispatchModalOpened={() => setPendingDispatchOrderPo(null)}
              onIssueDispatch={handleIssueDispatch}
              onUpdateChallan={handleUpdateChallan}
              onCancelChallan={handleCancelChallan}
              onDispatchChallan={async (challanNo) => {
                const targetCh = dispatches.find(d => d.challanNo === challanNo || d.id === challanNo);
                const targetPo = targetCh?.orderPo || selectedOrderId;
                const targetOrd = orders.find(o => o.poNo === targetPo || o.id === targetPo || o.deliveryChallanNo === challanNo);
                
                await handleUpdateChallan(challanNo, { status: 'DISPATCHED' });
                
                if (targetOrd) {
                  await handleMarkDispatched(targetOrd.id, {
                    dispatchDate: targetCh?.date || new Date().toISOString().split('T')[0],
                    transporter: targetCh?.transporter || targetOrd.transporterName || 'VRL Logistics Ltd',
                    vehicleNo: targetCh?.vehicleNo || (targetOrd as any).vehicleNo || 'MH 12 AB 4589',
                    lrNo: targetCh?.lrNo,
                    challanNo: challanNo,
                    lines: targetOrd.lines
                  });
                }
              }}
              onMarkDelivered={async (orderIdOrPo, deliveryData) => {
                const targetOrd = orders.find(o => o.id === orderIdOrPo || o.poNo === orderIdOrPo || o.deliveryChallanNo === orderIdOrPo) ||
                  (dynamicFetchedOrder && (dynamicFetchedOrder.id === orderIdOrPo || dynamicFetchedOrder.poNo === orderIdOrPo) ? dynamicFetchedOrder : null);
                const orderId = targetOrd ? targetOrd.id : orderIdOrPo;
                if (dynamicFetchedOrder && (dynamicFetchedOrder.id === orderId || dynamicFetchedOrder.poNo === orderId)) {
                  setDynamicFetchedOrder(prev => prev ? {
                    ...prev,
                    status: 'DELIVERED',
                    stage: 'DELIVERED',
                    progressStep: 6,
                    podDocumentUrl: deliveryData?.podDocumentUrl || prev.podDocumentUrl,
                    podReceivedDate: deliveryData?.podReceivedDate || new Date().toISOString().split('T')[0],
                    podReceivedBy: deliveryData?.podReceivedBy || prev.podReceivedBy
                  } : null);
                }
                return handleMarkDelivered(orderId, deliveryData);
              }}
              onNavigateToOrder={(po) => {
                const ord = orders.find(o => o.poNo === po || o.id === po);
                if (ord) {
                  setSelectedOrderId(ord.id);
                  handleNavigateView('order-detail');
                }
              }}
            />
          )}

          {currentView === 'approvals' && (
            <ApprovalsView
              approvals={approvals}
              orders={orders}
              isDarkMode={isDarkMode}
              onApprove={handleApprove}
              onReject={handleReject}
              onConfirmOrder={(orderId) => {
                if (dynamicFetchedOrder && (dynamicFetchedOrder.id === orderId || dynamicFetchedOrder.poNo === orderId)) {
                  setDynamicFetchedOrder(prev => prev ? { ...prev, status: 'CONFIRMED', stage: 'CONFIRMED', progressStep: 2 } : null);
                }
                handleConfirmOrder(orderId);
              }}
              onViewOrder={(orderId) => {
                const target = orders.find(o => o.id === orderId || o.poNo === orderId);
                if (target) {
                  setSelectedOrderId(target.id);
                  handleNavigateView('order-detail');
                }
              }}
            />
          )}

          {currentView === 'invoices' && (
            <InvoicesView
              invoices={invoices}
              dispatches={dispatches}
              orders={orders}
              customers={customers}
              masters={masters}
              isDarkMode={isDarkMode}
              currentRole={currentRole}
              preselectedOrderPo={pendingInvoiceOrderPo}
              preselectedDispatchNo={pendingInvoiceDispatchNo}
              onInvoiceModalOpened={() => {
                setPendingInvoiceOrderPo(null);
                setPendingInvoiceDispatchNo(null);
              }}
              onCreateInvoice={handleCreateInvoice}
              onIssueInvoice={handleIssueInvoice}
              onRecordPayment={handleRecordInvoicePayment}
              onViewOrder={(orderId) => {
                const target = orders.find(o => o.id === orderId || o.poNo === orderId);
                if (target) {
                  setSelectedOrderId(target.id);
                  handleNavigateView('order-detail');
                }
              }}
            />
          )}

          {currentView === 'payables' && (
            <PayablesView
              payables={payables}
              isDarkMode={isDarkMode}
              onRecordDisbursement={handleRecordPayablePayment}
            />
          )}

          {currentView === 'masters' && (
            <MastersView
              masters={masters}
              customers={customers}
              vendors={vendors}
              machines={machines}
              isDarkMode={isDarkMode}
              onAddMaster={handleAddMasterItem}
              onUpdateMaster={handleUpdateMasterItem}
              onDeleteMaster={handleDeleteMasterItem}
              onAddCustomer={handleAddCustomer}
              onUpdateCustomer={handleUpdateCustomer}
              onDeleteCustomer={handleDeleteCustomer}
              onAddVendor={handleAddVendor}
              onUpdateVendor={handleUpdateVendor}
              onDeleteVendor={handleDeleteVendor}
              onAddMachine={handleAddMachine}
              onUpdateMachine={handleUpdateMachine}
              onDeleteMachine={handleDeleteMachine}
              onImportOMGST={handleImportOMGST}
            />
          )}

          {currentView === 'users-audit' && (
            <UsersAuditView
              users={users}
              auditLogs={auditLogs}
              orders={orders}
              stock={stock}
              jobCards={jobCards}
              qcQueue={qcQueue}
              dispatches={dispatches}
              invoices={invoices}
              payables={payables}
              masters={masters}
              productionLogs={productionLogs}
              pdiQueue={pdiQueue}
              isDarkMode={isDarkMode}
              currentUserId={currentUserId}
              currentRole={currentRole}
              onAddUser={handleAddUser}
              onUpdateUser={handleUpdateUser}
              onSwitchUser={handleSwitchUser}
              onRevokeUser={handleRevokeUser}
              onRestoreUser={handleRestoreUser}
              onUpdateUserRole={handleUpdateUserRole}
              onDeleteUser={handleDeleteUser}
              onResetAllData={handleResetAllData}
              onClearOperationalData={handleClearOperationalData}
            />
          )}

          {currentView === 'company-profile' && (
            <CompanyProfileView
              profile={companyProfile}
              isDarkMode={isDarkMode}
              onSaveProfile={handleSaveCompanyProfile}
            />
          )}

          {currentView === 'workflow-testing' && (
            <WorkflowTestingView
              isDarkMode={isDarkMode}
            />
          )}
              </>
            )}
          </div>
        </main>
      </div>

      {/* Switch User / Role Modal */}
      <SwitchUserModal
        isOpen={isSwitchUserOpen}
        onClose={() => setIsSwitchUserOpen(false)}
        users={users}
        currentUserId={currentUserId}
        onSwitchUser={handleSwitchUser}
        onRevokeUser={handleRevokeUser}
        onRestoreUser={handleRestoreUser}
        onAddUser={handleAddUser}
        isDarkMode={isDarkMode}
      />

      {/* Active Sessions & Suspicious Login Security Center Modal */}
      <SecuritySessionsModal
        isOpen={isSecurityModalOpen}
        onClose={() => setIsSecurityModalOpen(false)}
        isDarkMode={isDarkMode}
        currentUser={currentUser}
      />
    </div>
  );
};
