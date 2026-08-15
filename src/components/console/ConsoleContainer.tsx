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
    name: 'Pramod Parshi (Founder & CEO)',
    email: 'user@guruom.in',
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
    handleCloseOrder: serviceCloseOrder,
    handleCancelOrder: serviceCancelOrder,
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
    handleRevokeUser: serviceRevokeUser,
    handleRestoreUser,
    handleUpdateUserRole,
    handleDeleteUser,
    handleApprove,
    handleReject,
    handleSync,
    handleResetAllData,
    handleClearOperationalData
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
    } else if (path === '/production') {
      setCurrentView('production');
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

  const selectedOrder = dynamicFetchedOrder || orders.find(o => o.id === selectedOrderId || o.poNo === selectedOrderId) || orders[0];



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
        userName={currentUser ? currentUser.name : "Pramod Parshi"}
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
          userName={currentUser ? currentUser.name : "Pramod Parshi"}
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
              isDarkMode={isDarkMode}
              onSelectOrder={handleSelectOrder}
              onCreateOrder={handleCreateOrder}
            />
          )}

          {currentView === 'order-detail' && selectedOrder && (
            <OrderDetailView
              order={selectedOrder}
              isDarkMode={isDarkMode}
              onBack={() => handleNavigateView('orders')}
              onCloseOrder={handleCloseOrder}
              onCancelOrder={handleCancelOrder}
            />
          )}

          {currentView === 'inventory' && (
            <InventoryView
              stock={stock}
              shortages={shortages}
              isDarkMode={isDarkMode}
              onAdjustStock={handleAdjustStock}
            />
          )}

          {currentView === 'production' && (
            <ProductionView
              jobCards={jobCards}
              productionLogs={productionLogs}
              qcItems={qcQueue}
              isDarkMode={isDarkMode}
              onCreateJobCard={handleCreateJobCard}
              onLogProduction={handleLogProduction}
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
              onPassPDI={handlePassPDI}
            />
          )}

          {currentView === 'dispatch' && (
            <DispatchView
              dispatches={dispatches}
              orders={orders}
              isDarkMode={isDarkMode}
              onIssueDispatch={handleIssueDispatch}
            />
          )}

          {currentView === 'approvals' && (
            <ApprovalsView
              approvals={approvals}
              isDarkMode={isDarkMode}
              onApprove={handleApprove}
              onReject={handleReject}
            />
          )}

          {currentView === 'invoices' && (
            <InvoicesView
              invoices={invoices}
              isDarkMode={isDarkMode}
              onRecordPayment={handleRecordInvoicePayment}
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
              onAddCustomer={handleAddCustomer}
              onAddVendor={handleAddVendor}
              onAddMachine={handleAddMachine}
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
              onAddUser={handleAddUser}
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
