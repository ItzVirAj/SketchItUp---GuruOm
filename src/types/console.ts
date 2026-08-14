export type ConsoleView = 
  | 'command-centre'
  | 'orders'
  | 'order-detail'
  | 'inventory'
  | 'production'
  | 'finished-goods'
  | 'plating-outwork'
  | 'reports'
  | 'qc'
  | 'pdi'
  | 'dispatch'
  | 'approvals'
  | 'invoices'
  | 'payables'
  | 'masters'
  | 'users-audit'
  | 'company-profile';

export type UserRole = 'SUPER ADMIN' | 'OPERATOR' | 'QC_MANAGER' | 'DISPATCH_CLERK' | 'FINANCE_MANAGER';

export type OrderStatus = 
  | 'CONFIRMED'
  | 'IN_PRODUCTION'
  | 'PARTIALLY_DISPATCHED'
  | 'DISPATCHED'
  | 'DELIVERED'
  | 'INVOICED'
  | 'PAID'
  | 'CLOSED'
  | 'CANCELLED';

export interface OrderLineItem {
  id: string;
  itemCode: string;
  itemDescription: string;
  custPartNo?: string;
  orderQty: number;
  unit: string;
  dispatchedQty: number;
  pendingQty: number;
  rate: number;
}

export interface LinkedJobCard {
  jobNo: string;
  qty: number;
  targetDate: string;
  status: 'SCHEDULED' | 'IN_PROGRESS' | 'QC_HOLD' | 'COMPLETED';
}

export interface LinkedDispatch {
  challanNo: string;
  items: string;
  date: string;
  status: 'GENERATED' | 'DISPATCHED' | 'DELIVERED';
}

export interface CustomerOrder {
  id: string;
  poNo: string;
  customerName: string;
  poDate: string;
  deliveryDate: string;
  status: OrderStatus;
  progressStep: number; // 0 to 6 (Confirmed, Production, PDI, Dispatched, Delivered, Invoiced, Paid)
  grossAmount: number;
  taxCategory?: string;
  remark?: string;
  clientPoFile?: string;
  lines: OrderLineItem[];
  jobCards: LinkedJobCard[];
  dispatches: LinkedDispatch[];
}

export interface StockItem {
  code: string;
  description: string;
  onHand: number;
  reserved: number;
  available: number;
  demand: number;
  reorderLevel: number;
  shortage: number;
  unit: string;
  status: 'OK' | 'SHORTAGE' | 'CRITICAL';
}

export interface ShortageItem {
  code: string;
  description: string;
  requiredQty: number;
  availableQty: number;
  deficit: number;
  unit: string;
}

export interface JobCard {
  jobNo: string;
  orderPo: string;
  partCode: string;
  partDescription: string;
  orderStatus: OrderStatus;
  qty: number;
  machine: string;
  targetDate: string;
  status: 'SCHEDULED' | 'IN_PRODUCTION' | 'QC_HOLD' | 'COMPLETED';
}

export interface FinishedGoodsItem {
  orderPo: string;
  partCode: string;
  partDescription: string;
  pdiPassedQty: number;
  physicallyHeldQty: number;
  dispatchedQty: number;
  variance: number;
}

export interface OutworkSendOut {
  sendOutId: string;
  vendorName: string;
  process: string;
  sentQty: number;
  receivedQty: number;
  rejectedQty: number;
  expectedDate: string;
  expectedReturnDate?: string;
  sentDate?: string;
  unitCost?: number;
  status: 'SENT' | 'PARTIALLY_RECEIVED' | 'COMPLETED' | 'OVERDUE';
}

export interface ProductionLogReport {
  id: string;
  itemCode: string;
  description: string;
  jobNo: string;
  stepNo: number;
  operationName: string;
  qtyDone: number;
  loggedTimestamp: string;
}

export interface QCInspection {
  id: string;
  jobNo: string;
  orderPo: string;
  partCode: string;
  partDescription: string;
  qty: number;
  jobStatus: string;
  qcStatus: 'PASS' | 'PENDING' | 'QC_HOLD' | 'REJECTED';
  inspectorNotes?: string;
  defectCategory?: string;
  inspectedAt?: string;
}

export interface PDIInspection {
  id: string;
  jobNo: string;
  orderPo: string;
  partCode: string;
  partDescription: string;
  qty: number;
  pdiStatus: 'PASS' | 'PENDING';
  certificateNo?: string;
  reportDate?: string;
}

export interface DispatchChallan {
  challanNo: string;
  orderPo: string;
  status: 'GENERATED' | 'DISPATCHED' | 'DELIVERED';
  date: string;
  transporter: string;
  vehicleNo: string;
  linesCount: number;
  driverContact?: string;
  totalInvoiceValue?: number;
}

export interface PendingApproval {
  id: string;
  title: string;
  type: 'DISCOUNT_OVERRIDE' | 'ORDER_CANCEL' | 'HIGH_VALUE_PO' | 'SCRAP_WRITE_OFF';
  requestedBy: string;
  timestamp: string;
  amount?: number;
  details: string;
}

export interface CustomerInvoice {
  invoiceNo: string;
  customerName: string;
  orderPo: string;
  challanNo: string;
  status: 'PAID' | 'OVERDUE' | 'PARTIAL' | 'DRAFT';
  date: string;
  dueDate: string;
  totalAmount: number;
  paidAmount: number;
  balanceAmount: number;
}

export interface VendorBill {
  billNo: string;
  vendorName: string;
  poNo: string;
  status: 'PAID' | 'OPEN' | 'OVERDUE';
  date: string;
  dueDate: string;
  amount: number;
  paidAmount: number;
  balanceAmount: number;
}

export interface MasterItem {
  code: string;
  partNo: string;
  description: string;
  unit: string;
  hsnCode: string;
  reorderLevel: number;
  storeLocation: string;
  isFinishedGoods: boolean;
  saleRate: number;
  purchaseRate: number;
}

export interface CustomerMaster {
  code: string;
  name: string;
  legalName?: string;
  customerType?: string;
  gstin: string;
  pan?: string;
  address?: string;
  shippingAddress?: string;
  city: string;
  state: string;
  stateCode?: string;
  pin?: string;
  email?: string;
  contact?: string;
  contactPerson?: string;
  creditDays: number;
  paymentTerms?: string;
  creditLimit?: number;
  salesperson?: string;
  status?: string;
  notes?: string;
}

export interface VendorMaster {
  code: string;
  name: string;
  legalName?: string;
  vendorType?: string;
  vendorCategory?: string;
  gstin: string;
  pan?: string;
  address?: string;
  city: string;
  state: string;
  stateCode?: string;
  pin?: string;
  email?: string;
  contact?: string;
  contactPerson?: string;
  paymentTerms: string;
  creditDays?: number;
  creditLimit?: number;
  bankAccountName?: string;
  bankAccountNumber?: string;
  ifsc?: string;
  status?: string;
  notes?: string;
}

export interface MachineMaster {
  code: string;
  name: string;
  type: string;
  status?: string;
  hourlyCost: number;
  active: boolean;
}

export interface SystemUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  status: 'ACTIVE' | 'INACTIVE' | 'REVOKED';
  lastLogin?: string;
  department?: string;
  phone?: string;
}

export interface AuditLogEntry {
  id: string;
  when: string;
  user: string;
  entity: string;
  action: string;
  details: string;
}

export interface CompanyProfile {
  legalName: string;
  address: string;
  phone: string;
  email: string;
  gstin: string;
  pan: string;
  state: string;
  stateCode: string;
}

export interface GrnItem {
  id?: string;
  itemCode: string;
  itemDescription: string;
  orderedQty: number;
  receivedQty: number;
  acceptedQty: number;
  rejectedQty: number;
  unit: string;
  unitRate: number;
  rejectionReason?: string;
}

export interface GoodsReceiptNote {
  id?: string;
  grnNo: string;
  poNo: string;
  vendorCode: string;
  vendorName: string;
  challanNo: string;
  challanDate?: string;
  receivedDate: string;
  receivedBy: string;
  status: 'PENDING_INSPECTION' | 'RECEIVED' | 'QC_VERIFIED' | 'REJECTED';
  vehicleNo?: string;
  remarks?: string;
  items: GrnItem[];
}

export interface BomItem {
  id?: string;
  componentCode: string;
  componentName: string;
  componentType: 'RAW_MATERIAL' | 'HARDWARE' | 'PACKING' | 'SUB_ASSEMBLY';
  qtyPerUnit: number;
  unit: string;
  scrapAllowancePct: number;
  stage: string;
  unitCost: number;
}

export interface BillOfMaterials {
  id?: string;
  bomCode: string;
  parentPartCode: string;
  parentPartName: string;
  revision: string;
  yieldPercentage: number;
  batchSize: number;
  status: 'ACTIVE' | 'DRAFT' | 'OBSOLETE';
  notes?: string;
  components: BomItem[];
}

export interface PurchaseOrderItem {
  id?: string;
  itemCode: string;
  itemDescription: string;
  orderQty: number;
  receivedQty: number;
  unit: string;
  unitPrice: number;
  lineTotal: number;
}

export interface PurchaseOrder {
  id?: string;
  poNo: string;
  supplierCode: string;
  supplierName: string;
  orderDate: string;
  expectedDeliveryDate: string;
  paymentTerms: string;
  taxRate: number;
  grossAmount: number;
  taxAmount: number;
  totalAmount: number;
  status: 'DRAFT' | 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED' | 'ISSUED' | 'PARTIALLY_RECEIVED' | 'RECEIVED' | 'CANCELLED';
  approvalStatus: 'PENDING' | 'APPROVED' | 'REJECTED';
  approvedBy?: string;
  approvedAt?: string;
  rejectionReason?: string;
  createdBy: string;
  notes?: string;
  items: PurchaseOrderItem[];
}
