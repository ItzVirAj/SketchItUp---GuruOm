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
  | 'company-profile'
  | 'workflow-testing'
  | 'purchasing'
  | 'grn'
  | 'bom'
  | 'route-cards';

export type UserRole = 'SUPER ADMIN' | 'OPERATOR' | 'QC_MANAGER' | 'DISPATCH_CLERK' | 'FINANCE_MANAGER';

export type ConsoleUser = SystemUser;

export type OrderStatus = 
  | 'DRAFT'
  | 'CONFIRMED'
  | 'PENDING_VERIFICATION'
  | 'MATERIAL_VERIFIED'
  | 'MATERIAL_SHORT'
  | 'PO_SENT'
  | 'GRN_RECEIVED'
  | 'JOB_RELEASED'
  | 'WITH_SUBCONTRACTOR'
  | 'IN_PRODUCTION'
  | 'READY_FOR_QC'
  | 'QC_REPORT_UPLOADED'
  | 'PDI_COMPLETE'
  | 'REWORK'
  | 'PARTIALLY_DISPATCHED'
  | 'READY_FOR_DISPATCH'
  | 'INVOICE_GENERATED'
  | 'DISPATCH_READY'
  | 'IN_TRANSIT'
  | 'DISPATCHED'
  | 'DELIVERED'
  | 'PAYMENT_PENDING'
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
  drawingRevision?: string;
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
  status: 'GENERATED' | 'DISPATCHED' | 'IN_TRANSIT' | 'DELIVERED';
  podDocumentUrl?: string;
  podAttachmentName?: string;
  podReceivedAt?: string;
  transporterName?: string;
  vehicleNo?: string;
}

export interface CustomerOrder {
  id: string;
  poNo: string;
  customerName: string;
  poDate: string;
  deliveryDate: string;
  status: OrderStatus | string;
  stage?: string;
  progressStep: number; // 1 to 10
  grossAmount: number;
  taxCategory?: string;
  remark?: string;
  clientPoFile?: string;
  subType?: 'FRESH_PO' | 'BLANKET_CALLOFF' | 'AMENDMENT';
  blanketPoId?: string;
  blanketPoBalance?: number;
  drawingRevision?: string;
  masterDrawingRevision?: string;
  isDrawingRevisionMatched?: boolean;
  heatLotNumber?: string;
  hasOpenNcr?: boolean;
  openNcrNumbers?: string[];
  isCustomerOnCreditHold?: boolean;
  creditHoldOverrideBy?: string;
  creditHoldOverrideReason?: string;
  priceAmendmentStatus?: string;
  purchaseRequisitionNo?: string;
  // PRD v1.0: Payment tracking
  paymentStatus?: 'UNPAID' | 'PARTIAL' | 'PAID';
  paidAmount?: number;
  outstandingAmount?: number;
  // PRD v1.0: POD tracking
  podDocumentUrl?: string;
  podAttachmentName?: string;
  podReceivedAt?: string;
  // PRD v1.0: Change Order versioning
  version?: number;
  changeOrderNotes?: string;
  revisionComments?: string;
  orderDate?: string;
  createdAt?: string;
  updatedAt?: string;
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

export type MovementType = 
  | 'OPENING_BALANCE'
  | 'GRN'
  | 'PRODUCTION_CONSUMPTION'
  | 'PRODUCTION_OUTPUT'
  | 'DISPATCH'
  | 'RETURN'
  | 'ADJUSTMENT'
  | 'TRANSFER_IN'
  | 'TRANSFER_OUT'
  | 'DAMAGE_WRITE_OFF'
  | 'CORRECTION';

export interface InventoryMovement {
  id: string;
  itemCode: string;
  location: string;
  quantityChange: number;
  movementType: MovementType;
  referenceId?: string | null;
  referenceType: string;
  balanceAfter: number;
  actorId?: string | null;
  actorEmail: string;
  notes?: string | null;
  metadata?: Record<string, any>;
  createdAt: string;
}

export interface StockReconciliationReport {
  itemCode: string;
  description: string;
  ledgerBalance: number;
  cachedOnHand: number;
  discrepancy: number;
  status: 'MATCHED' | 'DISCREPANCY';
  lastMovementAt?: string;
}

export interface RouteCardTemplateStep {
  id: string;
  partCode: string;
  partDescription: string;
  sequenceNo: number;
  operationName: string;
  workCenter: string;
  standardTimeMinutes: number;
  inspectionRequired: boolean;
  requiredCertification: string;
}

export interface RouteCard {
  id?: string;
  routeCode?: string;
  partCode: string;
  partDescription: string;
  revision?: string;
  status?: 'ACTIVE' | 'DRAFT' | 'OBSOLETE';
  totalStandardTimeMinutes?: number;
  notes?: string;
  operations: RouteCardTemplateStep[];
}

export interface JobCardOperation {
  id: string;
  jobCardId?: string;
  jobNo: string;
  sequenceNo: number;
  operationName: string;
  machineId?: string;
  operatorName?: string;
  requiredCertification?: string;
  isCertificationVerified?: boolean;
  standardTimeMinutes?: number;
  actualStartTime?: string;
  actualEndTime?: string;
  actualTimeMinutes?: number;
  qtyProcessed: number;
  qtyRejected: number;
  inspectionRequired?: boolean;
  inspectionPassed?: boolean;
  opStatus: 'PENDING' | 'IN_PROGRESS' | 'PAUSED' | 'COMPLETED' | 'QC_HOLD' | string;
  notes?: string;
}

export interface JobCard {
  id?: string;
  jobNo: string;
  orderId?: string;
  orderPo: string;
  partCode: string;
  partDescription: string;
  drawingRevision?: string; // LOCKED at release
  orderStatus?: OrderStatus | string;
  qty?: number;
  targetQty?: number;
  machine?: string;
  materialIssuedLot?: string;
  materialQcStatus?: 'ACCEPTED' | 'QUALITY_HOLD' | 'PENDING_INSPECTION' | string;
  currentStepNo?: number;
  currentOperation?: string;
  targetDate: string;
  status?: 'SCHEDULED' | 'IN_PRODUCTION' | 'NOT_STARTED' | 'IN_PROGRESS' | 'QC_HOLD' | 'COMPLETED' | string;
  jobStatus?: 'NOT_STARTED' | 'IN_PROGRESS' | 'QC_HOLD' | 'COMPLETED' | string;
  hasOpenNcr?: boolean;
  ncrReference?: string;
  supervisorSignOff?: string;
  remarks?: string;
  operations?: JobCardOperation[];
}

export interface NcrRecord {
  id: string;
  ncrNumber: string;
  jobCardId?: string;
  jobNo: string;
  sequenceNo: number;
  operationName: string;
  orderPo: string;
  defectCategory: 'DIMENSIONAL' | 'VISUAL_SURFACE' | 'MATERIAL_HARDNESS' | 'MACHINING_CHATTER' | 'RUNOUT_EXCEEDED' | 'OTHER' | string;
  defectDescription: string;
  rejectedQty: number;
  status: 'OPEN' | 'RESOLVED' | 'CLOSED' | string;
  disposition?: 'REWORK' | 'SCRAP' | 'USE_AS_IS_CONCESSION' | string;
  dispositionApprovedBy?: string;
  dispositionReason?: string;
  dispositionDate?: string;
  raisedBy: string;
  raisedAt?: string;
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
  status: 'GENERATED' | 'DISPATCHED' | 'IN_TRANSIT' | 'DELIVERED';
  date: string;
  transporter: string;
  vehicleNo: string;
  linesCount: number;
  driverContact?: string;
  totalInvoiceValue?: number;
  podDocumentUrl?: string;
  podAttachmentName?: string;
  podReceivedAt?: string;
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

export interface PurchaseRequisition {
  id: string;
  reqNumber: string;
  source: 'LOW_STOCK_ALERT' | 'PRODUCTION_SHORTAGE' | 'MANUAL' | string;
  orderId?: string;
  orderPo?: string;
  itemCode: string;
  itemDescription: string;
  requiredQty: number;
  availableStock: number;
  deficitQty: number;
  unit: string;
  urgency: 'NORMAL' | 'URGENT' | 'CRITICAL' | string;
  status: 'DRAFT' | 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED' | 'CONVERTED_TO_PO' | string;
  requestedBy: string;
  approvedBy?: string;
  approvedAt?: string;
  poNumber?: string;
  rejectionReason?: string;
  createdAt?: string;
}

export interface GoodsReceiptNote {
  id?: string;
  grnNo: string;
  poNo: string;
  supplierName?: string;
  vendorCode?: string;
  vendorName?: string;
  itemCode?: string;
  itemDescription?: string;
  poExpectedQty?: number;
  receivedQty?: number;
  acceptedQty?: number;
  rejectedQty?: number;
  unit?: string;
  unitPrice?: number;
  isQtyMismatched?: boolean;
  mismatchNotes?: string;
  heatLotNumber?: string;
  deliveryChallanNo?: string;
  challanNo?: string;
  challanDate?: string;
  carrier?: string;
  vehicleNo?: string;
  remarks?: string;
  receivedDate: string;
  receivedBy?: string;
  inspectionStatus?: 'PENDING_INSPECTION' | 'PASSED' | 'PARTIAL_REJECT' | 'REJECTED' | 'QC_VERIFIED' | string;
  status?: 'PENDING_INSPECTION' | 'RECEIVED' | 'QC_VERIFIED' | 'REJECTED' | string;
  inspectedBy?: string;
  storeKeeperName?: string;
  items?: GrnItem[];
}

export interface VendorReturn {
  id: string;
  returnNo: string;
  grnNo: string;
  poNo: string;
  supplierName: string;
  itemCode: string;
  itemDescription: string;
  rejectedQty: number;
  defectCategory: string;
  defectNotes: string;
  status: 'INITIATED' | 'PENDING_APPROVAL' | 'APPROVED' | 'DISPATCHED_TO_VENDOR' | string;
  initiatedBy: string;
  approvedBy?: string;
  approvedAt?: string;
  debitNoteNumber?: string;
  debitAmount?: number;
}

export interface VendorScorecard {
  id: string;
  supplierCode: string;
  supplierName: string;
  evaluationPeriod: string;
  totalOrders: number;
  totalDeliveries: number;
  onTimeDeliveries: number;
  otdPercentage: number;
  totalReceivedQty: number;
  acceptedQty: number;
  rejectedQty: number;
  qualityAcceptancePercentage: number;
  overallScore: number;
  vendorRatingTier: 'TIER_1_EXCELLENT' | 'TIER_2_SATISFACTORY' | 'TIER_3_PROBATION' | string;
  evaluatedBy?: string;
}

export interface SubcontractOrder {
  id: string;
  gatePassNo: string; // GP-OUT-2026-####
  jobNo: string;
  itemCode: string;
  itemDescription: string;
  subcontractorName: string;
  processType: 'HEAT_TREATMENT' | 'ELECTROPLATING' | 'ZINC_PLATING' | 'NDT_TESTING' | 'CNC_MACHINING' | 'BLACK_OXIDE' | 'OTHER' | string;
  dispatchedQty: number;
  unit: string;
  dispatchDate: string;
  expectedReturnDate: string;
  actualReturnDate?: string;
  gateInPassNo?: string;
  receivedQty?: number;
  rejectedQty?: number;
  qcStatus: 'PENDING_GATE_IN' | 'INSPECTED_ACCEPTED' | 'INSPECTED_REJECTED' | string;
  status: 'OUT_FOR_JOBWORK' | 'OVERDUE_JOBWORK' | 'RETURNED_INSPECTED' | 'CLOSED' | string;
  isOverdue: boolean;
  overdueDays: number;
  vehicleDetails?: string;
  transporter?: string;
  unitRate?: number;
  totalProcessCost?: number;
  dispatchedBy: string;
  receivedBy?: string;
  notes?: string;
}

export interface CustomerInvoice {
  id?: string;
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
  id?: string;
  billNo: string;
  vendorName: string;
  poNo: string;
  status: 'PAID' | 'OPEN' | 'OVERDUE';
  date: string;
  dueDate: string;
  amount: number;
  paidAmount: number;
  balanceAmount: number;
  grnNo?: string;
  isThreeWayMatched?: boolean;
  matchStatus?: 'MATCHED' | 'PRICE_VARIANCE_FLAGGED' | 'QTY_VARIANCE_FLAGGED' | 'PRICE_AND_QTY_VARIANCE';
  varianceDetails?: string;
}

export interface MasterItem {
  id?: string;
  code: string; // RM-#### / FG-#### / SF-#### / CO-#### / BO-#### / ITM-####
  name?: string; // item_name*
  itemType?: 'Raw Material' | 'Semi-Finished' | 'Finished Good' | 'Consumable' | 'Bought-Out' | 'Other' | string;
  category?: string;
  description: string;
  partNo?: string;
  unit: 'Nos' | 'Kg' | 'Meter' | 'Litre' | 'Set' | 'Box' | string; // uom*
  hsnCode: string; // 4-8 digit
  gstRate?: number; // 0, 5, 12, 18, 28
  standardCost?: number; // required if RM, Consumable, Bought-Out
  sellingPrice?: number; // required if Finished Good
  minStock?: number;
  maxStock?: number;
  reorderLevel: number;
  leadTimeDays?: number;
  preferredVendor?: string; // ref: Vendor
  defaultWarehouse?: string;
  storeLocation?: string;
  isFinishedGoods?: boolean;
  saleRate?: number;
  purchaseRate?: number;
  status?: 'Active' | 'Inactive' | string;
}

export interface CustomerMaster {
  id?: string;
  code: string; // CUST-####
  name: string; // customer_name*
  legalName?: string;
  customerType?: 'Dealer' | 'Distributor' | 'OEM' | 'Retailer' | 'Corporate' | 'Export' | 'Other' | string;
  contactPerson?: string; // contact_person*
  mobile?: string; // 10-digit Indian*
  email?: string;
  gstin: string; // unique, 15-char GSTIN or 'N/A — GST-exempt'
  pan?: string; // 10-char PAN
  address?: string;
  billingAddress?: string; // billing_address*
  shippingAddress?: string;
  city: string;
  state: string; // Indian state
  stateCode?: string;
  pin?: string;
  pincode?: string; // 6-digit
  paymentTerms?: 'Advance' | 'Net 15' | 'Net 30' | 'Net 45' | 'Net 60' | 'Other' | string;
  creditDays?: number; // 0-180, required if Net
  creditLimit?: number; // required if Net
  salesperson?: string; // ref: Employee/User
  status?: 'Active' | 'Inactive' | string; // Inactive hidden from new orders
  notes?: string;
  contact?: string; // backward compat
}

export interface VendorMaster {
  id?: string;
  code: string; // VEND-####
  name: string; // vendor_name*
  legalName?: string;
  vendorType: 'Supplier' | 'Transporter' | 'Subcontractor / Job Worker' | 'ServiceProvider' | 'EquipmentVendor' | 'ProfessionalService' | 'ManpowerProvider' | 'Other' | string;
  vendorCategory: 'Raw Material' | 'Components' | 'Consumables' | 'Packaging' | 'Machinery' | 'Maintenance' | 'Transport' | 'IT' | 'Professional' | 'Manpower' | 'Other' | string;
  contactPerson: string;
  mobile: string; // 10-digit Indian*
  email?: string;
  address?: string;
  billingAddress?: string;
  shippingAddress?: string;
  city: string;
  state: string;
  stateCode?: string;
  pin?: string;
  pincode?: string;
  gstin: string; // conditional unless GST-exempt
  pan: string; // always mandatory for TDS
  bankAccountName: string; // bank_account_name*
  bankAccountNumber: string; // bank_account_number* (encrypted/masked)
  ifsc: string; // 11-char IFSC*
  paymentTerms: 'Advance' | 'Net 15' | 'Net 30' | 'Net 45' | 'Net 60' | 'Other' | string;
  creditDays?: number;
  creditLimit?: number;
  processType?: string; // Subcontractor prompt
  turnaroundTimeDays?: number; // Subcontractor prompt
  status: 'Active' | 'Inactive' | string;
  notes?: string;
  contact?: string; // backward compat
}

export interface MachineMaster {
  id?: string;
  code: string; // MCH-####
  name: string; // machine_name* (unique, e.g. VMC-01)
  type: 'Cutting' | 'Welding' | 'CNC Turning' | 'CNC Machining' | 'Conventional Machining' | 'Grinding' | 'Inspection-CMM' | 'Other' | string;
  department: string; // department*
  location: string; // location*
  manufacturer?: string;
  model?: string;
  serialNumber?: string;
  installationDate?: string;
  capacity?: number;
  capacityUom?: string; // required if capacity filled
  operatingHours?: number; // 0-24
  shift?: 'General-Day' | 'Shift A' | 'Shift B' | 'Shift C' | string;
  status: 'Active' | 'Under Maintenance' | 'Idle' | 'Decommissioned' | string;
  responsiblePerson?: string; // ref: Employee/User
  hourlyCost?: number;
  active?: boolean;
}

export interface SystemUser {
  id: string;
  userId?: string; // USR-####
  name: string; // full_name*
  fullName?: string;
  employeeCode?: string;
  email: string; // unique login ID*
  role: UserRole | string;
  userRole?: string; // Admin/Owner, Sales Executive, etc.
  department: string; // department*
  mobile?: string; // 10-digit Indian for OTP*
  phone?: string;
  accessLevel?: 'Full Access' | 'Edit' | 'View Only' | string;
  modulesAccess?: string[]; // per-module access array
  reportingManager?: string; // ref: User
  shift?: string;
  status: 'ACTIVE' | 'INACTIVE' | 'Active' | 'Inactive' | 'REVOKED' | string;
  lastLogin?: string;
}

export interface AuditLogEntry {
  id: string;
  when: string;
  user: string;
  actorId?: string;
  actorEmail?: string;
  entity: string;
  entityType?: string;
  entityId?: string;
  action: string;
  details: string;
  beforeState?: Record<string, any> | null;
  afterState?: Record<string, any> | null;
  ipAddress?: string;
  userAgent?: string;
  metadata?: Record<string, any>;
  createdAt?: string;
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

export interface ActiveSession {
  id: string;
  userId: string;
  device: string;
  deviceType: 'desktop' | 'mobile' | 'tablet' | 'unknown';
  browser: string;
  os: string;
  location: string;
  ip: string;
  createdAt: string;
  lastActiveAt: string;
  isCurrent: boolean;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  riskScore: number;
  flaggedReasons?: string[];
}

export interface SecurityEvent {
  id: string;
  user_id: string;
  session_id?: string | null;
  event_type: string;
  severity: 'INFO' | 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  ip_address?: string | null;
  user_agent?: string | null;
  device_name?: string | null;
  device_type?: string | null;
  browser?: string | null;
  os?: string | null;
  country?: string | null;
  region?: string | null;
  city?: string | null;
  risk_score: number;
  risk_level: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  flagged_reasons: string[];
  metadata?: any;
  created_at: string;
}
