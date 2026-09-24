import React, { useState, useEffect, useRef, startTransition } from 'react';
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

import { ConsoleSidebar } from './ConsoleSidebar';
import { MobileDrawer } from './MobileDrawer';
import { MobileBottomTabBar } from './MobileBottomTabBar';

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
import { MeetingsView } from './views/MeetingsView';
import { TasksView } from './views/TasksView';
import { LeaveRequestsView } from './views/LeaveRequestsView';
import { AttendanceView } from './views/AttendanceView';
import { CertificationsView } from './views/CertificationsView';
import { EmployeeCertificationsView } from './views/EmployeeCertificationsView';
import { AnnouncementsView } from './views/AnnouncementsView';
import { EmployeeMasterView } from './views/EmployeeMasterView';
import { InvoicesView } from './views/InvoicesView';
import { PayablesView } from './views/PayablesView';
import { MastersView } from './views/MastersView';
import { UsersAuditView } from './views/UsersAuditView';
import { CompanyProfileView } from './views/CompanyProfileView';
import { WorkflowTestingView } from './views/WorkflowTestingView';
import { AccessRestrictedGate } from '../common/AccessRestrictedGate';
import { SwitchUserModal } from '../common/SwitchUserModal';
import { SecuritySessionsModal } from './modals/SecuritySessionsModal';
import { CommandPaletteModal } from './modals/CommandPaletteModal';
import { NotificationDrawer } from '../NotificationDrawer';
import { useInAppNotifications } from '../../hooks/useInAppNotifications';
import { isViewAllowedForUser } from '../../utils/permissions';
import { useAuth } from '../../context/AuthContext';
import { useOwnerOSData } from '../../hooks/useOwnerOSData';
import { useMeetings } from '../../hooks/useMeetings';
import { useTasks } from '../../hooks/useTasks';
import { useLeaveRequests } from '../../hooks/useLeaveRequests';
import { useAttendance } from '../../hooks/useAttendance';
import { useEmployeeCertifications } from '../../hooks/useEmployeeCertifications';
import { useAnnouncements } from '../../hooks/useAnnouncements';
import { useEmployees } from '../../hooks/useEmployees';
import { fetchOrderById, receiveOutworkReturn } from '../../services/supabaseServices';
import { triggerOrderDelayed } from '../../services/notificationService';
import { toast } from '../../context/ToastContext';
import { getCanonicalPathForView } from '../../utils/navigationConfig';

import { useLocation, useNavigate } from 'react-router-dom';

interface ConsoleContainerProps {
  onSignOut?: () => void;
}

const getPathForView = (view: ConsoleView, orderId?: string | null): string => {
  return getCanonicalPathForView(view, orderId);
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
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [isNotificationOpen, setIsNotificationOpen] = useState<boolean>(false);

  // In-app notifications
  const {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    clearAll,
    isSoundEnabled,
    toggleSound,
  } = useInAppNotifications();

  // Main scrollable workspace canvas ref
  const mainScrollRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (authProfile?.id && !currentUserId) {
      // Wrapped in startTransition — see useMeetings.ts for why (same
      // react-hooks/set-state-in-effect fix as elsewhere in this session).
      startTransition(() => {
        setCurrentUserId(authProfile.id);
      });
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
    securityEvents,
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
    handleBulkReleaseJobCards,
    handleStartOperation,
    handleCompleteOperation,
    handleLogProduction,
    handleUpdateQC,
    handlePassPDI,
    handleIssueDispatch,
    handleRecordInvoicePayment,
    handleCreateInvoice,
    handleIssueInvoice,
    handleDeleteInvoice,
    handleClearAllInvoices,
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

  const handleManualSync = async () => {
    if (isSyncing) return;
    setIsSyncing(true);
    try {
      await handleSync();
      toast.success('Live operations data synchronized', 'System Synced');
    } catch (err: any) {
      toast.error(err?.message || 'Failed to synchronize data', 'Sync Error');
    } finally {
      setTimeout(() => setIsSyncing(false), 600);
    }
  };

  // Meetings (HR module) — kept as its own hook rather than folded into
  // useOwnerOSData; see src/hooks/useMeetings.ts for why.
  const {
    meetings,
    isLoadingMeetings,
    canManageMeetings,
    handleCreateMeeting,
    handleUpdateMeeting,
    handleCancelMeeting
  } = useMeetings(isViewAllowedForUser(currentUser, 'meetings'), currentRole);

  // Tasks (HR module) — same standalone-hook rationale as useMeetings above.
  const {
    tasks,
    isLoadingTasks,
    canManageTasks,
    handleCreateTask,
    handleUpdateTask,
    handleUpdateStatus,
    handleAddComment,
    handleCancelTask
  } = useTasks(isViewAllowedForUser(currentUser, 'tasks'), currentRole);

  const {
    leaveRequests,
    isLoadingLeave,
    canViewAllLeave,
    canApproveLeave,
    handleCreateLeaveRequest,
    handleDecideLeaveRequest,
    handleCancelLeaveRequest
  } = useLeaveRequests(
    isViewAllowedForUser(currentUser, 'leave') || isViewAllowedForUser(currentUser, 'leave-requests'),
    currentRole,
    currentUser?.effectivePermissions
  );

  const {
    attendanceLogs,
    myAttendanceLogs,
    isLoadingAttendance,
    canManageAttendance,
    canViewAllAttendance,
    todayLog,
    searchQuery: attendanceSearchQuery,
    setSearchQuery: setAttendanceSearchQuery,
    statusFilter: attendanceStatusFilter,
    setStatusFilter: setAttendanceStatusFilter,
    handleCheckIn,
    handleCheckOut,
    handleCreateAttendance,
    handleUpdateAttendance
  } = useAttendance(
    isViewAllowedForUser(currentUser, 'attendance'),
    currentUser?.id,
    currentRole,
    currentUser?.effectivePermissions
  );

  const {
    certifications: empCertifications,
    myCertifications: myEmpCertifications,
    isLoadingCertifications: isLoadingEmpCertifications,
    canViewAllCertifications: canViewAllEmpCertifications,
    canAssignCertification,
    searchQuery: empCertSearchQuery,
    setSearchQuery: setEmpCertSearchQuery,
    statusFilter: empCertStatusFilter,
    setStatusFilter: setEmpCertStatusFilter,
    activeTab: empCertActiveTab,
    setActiveTab: setEmpCertActiveTab,
    handleAssignCertification: handleAssignEmpCert,
    handleDeleteCertification: handleDeleteEmpCert,
    handleUploadDocument: handleUploadEmpCertDoc
  } = useEmployeeCertifications(
    isViewAllowedForUser(currentUser, 'employee-certifications'),
    currentUser?.id,
    currentRole,
    currentUser?.effectivePermissions
  );

  const { announcements, isLoadingAnnouncements, canPostAnnouncements, handleCreateAnnouncement, handleDeleteAnnouncement } =
    useAnnouncements(isViewAllowedForUser(currentUser, 'announcements'), currentRole);
  // Employee Master is a standalone HR submodule. It projects only internal
  // employee-role users from the existing users table; it does not create a
  // parallel employee identity store.
  const {
    employees,
    isLoadingEmployees,
    canManageEmployees,
    loadEmployees,
    handleUpdateEmployee
  } = useEmployees(isViewAllowedForUser(currentUser, 'employee-master'), currentRole);

  // Fast User Switching is exclusively restricted to the Owner and Server Admin
  const isSwitchUserAllowed = Boolean(
    currentUser?.email?.toLowerCase() === 'owner@guruom.in' ||
    currentUser?.email?.toLowerCase() === 'serveradmin@guruom.in' ||
    authProfile?.email?.toLowerCase() === 'owner@guruom.in' ||
    authProfile?.email?.toLowerCase() === 'serveradmin@guruom.in'
  );

  const [dynamicFetchedOrder, setDynamicFetchedOrder] = useState<CustomerOrder | null>(null);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);

  // Global Command Palette Shortcut (Ctrl + K / Cmd + K)
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsCommandPaletteOpen(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, []);

  // 24-Hour Delivery Deadline & Schedule Delay Watcher
  const alertedDelayOrdersRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!orders || orders.length === 0) return;

    const checkOrderDeadlines = () => {
      const now = Date.now();
      const next24h = now + 24 * 60 * 60 * 1000;

      orders.forEach((order) => {
        if (!order.deliveryDate) return;
        const status = (order.status || order.stage || '').toUpperCase();
        const isDispatchedOrDone = [
          'PARTIALLY_DISPATCHED',
          'DISPATCHED',
          'IN_TRANSIT',
          'DELIVERED',
          'CLOSED',
          'CANCELLED',
          'PAID'
        ].includes(status);

        if (isDispatchedOrDone) return;

        const targetTime = new Date(order.deliveryDate).getTime();
        // If target delivery date is within the next 24 hours or already overdue
        if (targetTime <= next24h && !alertedDelayOrdersRef.current.has(order.id || order.poNo)) {
          alertedDelayOrdersRef.current.add(order.id || order.poNo);
          triggerOrderDelayed(
            order.id || order.poNo,
            order.poNo,
            order.customerName
          ).catch(() => {});
        }
      });
    };

    checkOrderDeadlines();
    const interval = setInterval(checkOrderDeadlines, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [orders]);

  // URL History Sync Effect
  useEffect(() => {
    // Wrapped in startTransition — same react-hooks/set-state-in-effect fix
    // applied elsewhere this session; this effect's many setCurrentView(...)
    // branches are all synchronous state writes.
    startTransition(() => {
    const path = location.pathname;

    // Command Centre
    if (path === '/' || path === '/command-center' || path === '/command-centre') {
      setCurrentView('command-centre');
      if (path === '/command-centre') {
        navigate('/command-center', { replace: true });
      }
    }
    // Operations & Reports (Canonical: /operations/*)
    else if (path === '/operations' || path === '/operations/') {
      navigate('/operations/orders', { replace: true });
      setCurrentView('orders');
    } else if (path.startsWith('/operations/orders/')) {
      const rawId = path.replace('/operations/orders/', '');
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
    } else if (path === '/operations/orders') {
      setCurrentView('orders');
    } else if (path === '/operations/inventory') {
      setCurrentView('inventory');
    } else if (path === '/operations/production') {
      const params = new URLSearchParams(location.search);
      const tab = params.get('tab');
      if (tab === 'bom') {
        setCurrentView('bom');
      } else if (tab === 'route-cards') {
        setCurrentView('route-cards');
      } else {
        setCurrentView('production');
      }
    } else if (path === '/operations/finished-goods') {
      setCurrentView('finished-goods');
    } else if (path === '/operations/plating-outwork') {
      setCurrentView('plating-outwork');
    } else if (path === '/operations/reports') {
      setCurrentView('reports');
    }
    // Quality & Dispatch (Canonical: /quality-dispatch/*)
    else if (path === '/quality-dispatch' || path === '/quality-dispatch/') {
      navigate('/quality-dispatch/qc-inspection', { replace: true });
      setCurrentView('qc');
    } else if (path === '/quality-dispatch/qc-inspection') {
      setCurrentView('qc');
    } else if (path === '/quality-dispatch/pdi-inspection') {
      setCurrentView('pdi');
    } else if (path === '/quality-dispatch/dispatch-logistics') {
      setCurrentView('dispatch');
    }
    // Finance & Accounts (Canonical: /finance/*)
    else if (path === '/finance' || path === '/finance/') {
      navigate('/finance/invoices-payments', { replace: true });
      setCurrentView('invoices');
    } else if (path === '/finance/invoices-payments') {
      setCurrentView('invoices');
    } else if (path === '/finance/vendor-payables') {
      setCurrentView('payables');
    } else if (path === '/finance/management-approvals') {
      setCurrentView('approvals');
    }
    // Admin & Systems (Canonical: /admin/*)
    else if (path === '/admin' || path === '/admin/') {
      navigate('/admin/master-catalogs', { replace: true });
      setCurrentView('masters');
    } else if (path.startsWith('/admin/master-catalogs')) {
      setCurrentView('masters');
    } else if (path === '/admin/users-audit-logs') {
      setCurrentView('users-audit');
    } else if (path === '/admin/company-profile') {
      setCurrentView('company-profile');
    }
    // HR Module (Canonical: /hr/*)
    else if (path === '/hr' || path === '/hr/') {
      navigate('/hr/tasks', { replace: true });
      setCurrentView('tasks');
    } else if (path === '/hr/meetings') {
      setCurrentView('meetings');
    } else if (path === '/hr/tasks') {
      setCurrentView('tasks');
    } else if (path === '/hr/leave' || path === '/hr/leave-requests') {
      setCurrentView('leave-requests');
    } else if (path === '/hr/attendance') {
      setCurrentView('attendance');
    } else if (path === '/hr/certifications' || path === '/hr/employee-certifications') {
      setCurrentView('employee-certifications');
    } else if (path === '/hr/announcements') {
      setCurrentView('announcements');
    } else if (path === '/hr/employees' || path === '/hr/employee-master') {
      setCurrentView('employee-master');
    }
    // General / Utility
    else if (path === '/workflow-testing') {
      setCurrentView('workflow-testing');
    }
    // Legacy Routes -> Canonical Redirects
    else if (path.startsWith('/orders/')) {
      const rawId = path.replace('/orders/', '');
      navigate(`/operations/orders/${rawId}`, { replace: true });
    } else if (path === '/orders') {
      navigate('/operations/orders', { replace: true });
    } else if (path.startsWith('/masters')) {
      const sub = path.replace('/masters', '');
      navigate(`/admin/master-catalogs${sub}`, { replace: true });
    } else if (path === '/inventory') {
      navigate('/operations/inventory', { replace: true });
    } else if (path === '/production') {
      navigate('/operations/production', { replace: true });
    } else if (path === '/bom') {
      navigate('/operations/production?tab=bom', { replace: true });
    } else if (path === '/route-cards') {
      navigate('/operations/production?tab=route-cards', { replace: true });
    } else if (path === '/finished-goods') {
      navigate('/operations/finished-goods', { replace: true });
    } else if (path === '/plating-outwork') {
      navigate('/operations/plating-outwork', { replace: true });
    } else if (path === '/reports') {
      navigate('/operations/reports', { replace: true });
    } else if (path === '/qc') {
      navigate('/quality-dispatch/qc-inspection', { replace: true });
    } else if (path === '/pdi') {
      navigate('/quality-dispatch/pdi-inspection', { replace: true });
    } else if (path === '/dispatch') {
      navigate('/quality-dispatch/dispatch-logistics', { replace: true });
    } else if (path === '/invoices') {
      navigate('/finance/invoices-payments', { replace: true });
    } else if (path === '/payables') {
      navigate('/finance/vendor-payables', { replace: true });
    } else if (path === '/approvals') {
      navigate('/finance/management-approvals', { replace: true });
    } else if (path === '/users-audit') {
      navigate('/admin/users-audit-logs', { replace: true });
    } else if (path === '/company-profile') {
      navigate('/admin/company-profile', { replace: true });
    }
    });
  }, [location.pathname, location.search, orders, navigate]);

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
    const targetPath = `/operations/orders/${orderId}`;
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



  const pendingApprovalsCount = (approvals || []).filter(a => a.status === 'PENDING').length;

  return (
    <div className="h-screen w-screen flex font-sans overflow-hidden bg-black text-white p-2.5 sm:p-3 lg:p-3.5 gap-3 lg:gap-3.5 select-none">
      {/* Desktop Persistent Full-Height Sidebar (≥1024px) */}
      <ConsoleSidebar
        currentView={currentView}
        setCurrentView={(view) => handleNavigateView(view)}
        currentRole={currentRole}
        isDarkMode={isDarkMode}
        setIsDarkMode={setIsDarkMode}
        currentUser={currentUser}
        userName={currentUser ? currentUser.name : "Sachin Gharbude"}
        onSignOut={onSignOut}
        onOpenSecurityModal={() => setIsSecurityModalOpen(true)}
        isOpenMobile={isOpenMobile}
        setIsOpenMobile={setIsOpenMobile}
        onOpenCommandPalette={() => setIsCommandPaletteOpen(true)}
        onSync={handleManualSync}
        isSyncing={isSyncing}
        lastSynced={lastSynced}
        onOpenNotifications={() => setIsNotificationOpen(true)}
        unreadNotificationsCount={unreadCount}
      />

        {/* Mobile Off-canvas Drawer Navigation (<1024px) */}
        <MobileDrawer
          isOpen={isOpenMobile}
          onClose={() => setIsOpenMobile(false)}
          currentView={currentView}
          onSelectView={(view) => handleNavigateView(view)}
          currentRole={currentRole}
          currentUser={currentUser}
          userName={currentUser ? currentUser.name : "Sachin Gharbude"}
          isDarkMode={isDarkMode}
          onSignOut={onSignOut}
          onOpenSecurityModal={() => setIsSecurityModalOpen(true)}
          onOpenSwitchUser={isSwitchUserAllowed ? () => setIsSwitchUserOpen(true) : undefined}
          pendingApprovalsCount={pendingApprovalsCount}
        />

        {/* Main Content: Large white rounded container, inset from the outer shell with generous margins and rounded corners */}
        <div className="flex-1 min-h-0 min-w-0 h-full rounded-2xl lg:rounded-3xl bg-white dark:bg-[#09090B] text-slate-900 dark:text-[#F4F4F5] shadow-2xl overflow-hidden flex flex-col border border-white/10 dark:border-white/10">
          <main
            ref={mainScrollRef}
            className={`flex-1 min-h-0 min-w-0 ${
              currentView === 'command-centre'
                ? 'overflow-hidden p-2.5 sm:p-3.5 lg:p-4 pb-2.5 lg:pb-3.5 flex flex-col'
                : 'overflow-y-auto scroll-smooth overscroll-y-contain overscroll-x-hidden p-3 sm:p-4 md:p-6 lg:p-8 pb-24 lg:pb-8'
            } bg-transparent`}
          >
          <div key={currentView} className={currentView === 'command-centre' ? 'h-full flex-1 flex flex-col overflow-hidden' : 'space-y-6'}>
            {!isViewAllowedForUser(currentUser, currentView) ? (
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
              approvals={approvals}
              announcements={announcements}
              containerScrollRef={mainScrollRef}
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
              tasks={tasks}
              isLoadingTasks={isLoadingTasks}
              onUpdateTaskStatus={handleUpdateStatus}
              onCreateTask={handleCreateTask}
              todayLog={todayLog}
              onCheckIn={handleCheckIn}
              onCheckOut={handleCheckOut}
              meetings={meetings}
              currentUser={currentUser}
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
                navigate('/admin/master-catalogs?tab=customers');
                handleNavigateView('masters');
              }}
              onNavigateToMasters={() => {
                navigate('/admin/master-catalogs?tab=items');
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
              machines={machines}
              companyProfile={companyProfile}
              isDarkMode={isDarkMode}
              initialSection={currentView === 'bom' ? 'bom' : currentView === 'route-cards' ? 'route-cards' : 'job-cards'}
              onCreateJobCard={handleCreateJobCard}
              onBulkReleaseJobCards={handleBulkReleaseJobCards}
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
              masters={masters}
              stock={stock}
              orders={orders}
              isDarkMode={isDarkMode}
            />
          )}

          {currentView === 'plating-outwork' && (
            <PlatingOutworkView
              outworks={outworkSendOuts}
              isDarkMode={isDarkMode}
              onCreateSendOut={async (outwork) => {
                await handleCreateOutwork(outwork as any);
                await handleSync();
              }}
              onReceiveReturn={async (payload) => {
                try {
                  await receiveOutworkReturn(payload as any);
                  const passNo = typeof payload === 'string' ? payload : payload.gatePassNo;
                  toast.success(`Gate-In pass received for ${passNo}`, 'Job-Work Returned');
                  await handleSync();
                } catch (err: any) {
                  toast.error(err?.message || 'Failed to receive outwork return', 'Outwork Error');
                }
              }}
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
                handleSelectOrder(ord ? ord.id : po);
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
              currentUser={currentUser}
              currentRole={currentRole}
            />
          )}

          {currentView === 'meetings' && (
            <MeetingsView
              meetings={meetings}
              isLoadingMeetings={isLoadingMeetings}
              users={users}
              currentUser={currentUser}
              canManageMeetings={canManageMeetings}
              isDarkMode={isDarkMode}
              onCreateMeeting={handleCreateMeeting}
              onUpdateMeeting={handleUpdateMeeting}
              onCancelMeeting={handleCancelMeeting}
            />
          )}

          {currentView === 'tasks' && (
            <TasksView
              tasks={tasks}
              isLoadingTasks={isLoadingTasks}
              users={users}
              currentUser={currentUser}
              canManageTasks={canManageTasks}
              isDarkMode={isDarkMode}
              onCreateTask={handleCreateTask}
              onUpdateTask={handleUpdateTask}
              onUpdateStatus={handleUpdateStatus}
              onAddComment={handleAddComment}
              onCancelTask={handleCancelTask}
            />
          )}

          {(currentView === 'leave' || currentView === 'leave-requests') && (
            <LeaveRequestsView
              leaveRequests={leaveRequests}
              isLoadingLeave={isLoadingLeave}
              canViewAllLeave={canViewAllLeave}
              canApproveLeave={canApproveLeave}
              currentUserId={currentUser?.id}
              isDarkMode={isDarkMode}
              onCreateLeaveRequest={handleCreateLeaveRequest}
              onDecideLeaveRequest={handleDecideLeaveRequest}
              onCancelLeaveRequest={handleCancelLeaveRequest}
            />
          )}

          {currentView === 'attendance' && (
            <AttendanceView
              attendanceLogs={attendanceLogs}
              myAttendanceLogs={myAttendanceLogs}
              isLoadingAttendance={isLoadingAttendance}
              canManageAttendance={canManageAttendance}
              canViewAllAttendance={canViewAllAttendance}
              todayLog={todayLog}
              currentUserId={currentUser?.id}
              isDarkMode={isDarkMode}
              searchQuery={attendanceSearchQuery}
              onSearchChange={setAttendanceSearchQuery}
              statusFilter={attendanceStatusFilter}
              onStatusFilterChange={setAttendanceStatusFilter}
              onCheckIn={handleCheckIn}
              onCheckOut={handleCheckOut}
              onCreateAttendance={handleCreateAttendance}
              onUpdateAttendance={handleUpdateAttendance}
            />
          )}

          {(currentView === 'employee-certifications' || currentView === 'certifications') && (
            <EmployeeCertificationsView
              certifications={empCertifications}
              myCertifications={myEmpCertifications}
              isLoading={isLoadingEmpCertifications}
              canViewAll={canViewAllEmpCertifications}
              canAssign={canAssignCertification}
              isDarkMode={isDarkMode}
              searchQuery={empCertSearchQuery}
              onSearchChange={setEmpCertSearchQuery}
              statusFilter={empCertStatusFilter}
              onStatusFilterChange={setEmpCertStatusFilter}
              activeTab={empCertActiveTab}
              onTabChange={setEmpCertActiveTab}
              onAssignCertification={handleAssignEmpCert}
              onDeleteCertification={handleDeleteEmpCert}
              onUploadDocument={handleUploadEmpCertDoc}
              employeesList={employees.map(e => ({
                id: e.id,
                name: e.name,
                email: e.email,
                department: e.department,
                role: e.role
              }))}
            />
          )}

          {currentView === 'announcements' && (
            <AnnouncementsView
              announcements={announcements}
              isLoadingAnnouncements={isLoadingAnnouncements}
              canPostAnnouncements={canPostAnnouncements}
              isDarkMode={isDarkMode}
              onCreateAnnouncement={handleCreateAnnouncement}
              onDeleteAnnouncement={handleDeleteAnnouncement}
            />
          )}

          {currentView === 'employee-master' && (
            <EmployeeMasterView
              employees={employees}
              isLoadingEmployees={isLoadingEmployees}
              canManageEmployees={canManageEmployees}
              isDarkMode={isDarkMode}
              onUpdateEmployee={handleUpdateEmployee}
              onRefresh={() => loadEmployees()}
            />
          )}

          {currentView === 'invoices' && (
            <InvoicesView
              invoices={invoices}
              dispatches={dispatches}
              orders={orders}
              customers={customers}
              masters={masters}
              companyProfile={companyProfile}
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
              vendors={vendors}
              isDarkMode={isDarkMode}
              onAddBill={handleCreateVendorBill}
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
              securityEvents={securityEvents}
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

      {/* Mobile Bottom Tab Bar (<1024px) */}
      <MobileBottomTabBar
        currentView={currentView}
        onSelectView={(view) => handleNavigateView(view)}
        onOpenDrawer={() => setIsOpenMobile(true)}
        isDrawerOpen={isOpenMobile}
        currentRole={currentUser?.role || currentRole}
        currentUser={currentUser}
        isDarkMode={isDarkMode}
        pendingApprovalsCount={pendingApprovalsCount}
      />

      {/* Switch User / Role Modal */}
      {isSwitchUserAllowed && (
        <SwitchUserModal
          isOpen={isSwitchUserOpen}
          onClose={() => setIsSwitchUserOpen(false)}
          users={users}
          currentUserId={currentUserId}
          onSwitchUser={handleSwitchUser}
          onRevokeUser={handleRevokeUser}
          onRestoreUser={handleRestoreUser}
          isDarkMode={isDarkMode}
        />
      )}

      {/* Active Sessions & Suspicious Login Security Center Modal */}
      <SecuritySessionsModal
        isOpen={isSecurityModalOpen}
        onClose={() => setIsSecurityModalOpen(false)}
        isDarkMode={isDarkMode}
        currentUser={currentUser}
      />

      {/* Global Spotlight Command Palette (Ctrl + K / Cmd + K) */}
      <CommandPaletteModal
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
        orders={orders}
        jobCards={jobCards}
        stock={stock}
        masters={masters}
        invoices={invoices}
        dispatches={dispatches}
        onNavigate={handleNavigateView}
        onSelectOrder={handleSelectOrder}
        isDarkMode={isDarkMode}
      />

      {/* Apple HIG Bottom-to-Top Notification Sheet */}
      <NotificationDrawer
        isOpen={isNotificationOpen}
        onClose={() => setIsNotificationOpen(false)}
        notifications={notifications}
        unreadCount={unreadCount}
        onMarkAsRead={markAsRead}
        onMarkAllAsRead={markAllAsRead}
        onClearAll={clearAll}
        isSoundEnabled={isSoundEnabled}
        onToggleSound={toggleSound}
        isDarkMode={isDarkMode}
      />
    </div>
  );
};

