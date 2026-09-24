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
  PendingApproval,
  CustomerInvoice,
  VendorBill,
  MasterItem,
  CustomerMaster,
  VendorMaster,
  MachineMaster,
  SystemUser,
  AuditLogEntry,
  CompanyProfile
} from '../types/console';

export const initialOrders: CustomerOrder[] = [];
export const initialStock: StockItem[] = [];
export const initialShortages: ShortageItem[] = [];
export const initialJobCards: JobCard[] = [];
export const initialFinishedGoods: FinishedGoodsItem[] = [];
export const initialOutworkSendOuts: OutworkSendOut[] = [];
export const initialProductionLogs: ProductionLogReport[] = [];
export const initialQCQueue: QCInspection[] = [];
export const initialPDIQueue: PDIInspection[] = [];
export const initialDispatches: DispatchChallan[] = [];
export const initialInvoices: CustomerInvoice[] = [];
export const initialPayables: VendorBill[] = [];
export const initialMasters: MasterItem[] = [];
export const initialCustomers: CustomerMaster[] = [];
export const initialVendors: VendorMaster[] = [];
export const initialMachines: MachineMaster[] = [];
export const initialUsers: SystemUser[] = [];
export const initialAuditLogs: AuditLogEntry[] = [];
export const initialApprovals: PendingApproval[] = [];

export const initialCompanyProfile: CompanyProfile = {
  legalName: 'GuruOm Industries LLP',
  address: 'Sr No 15/2, Mataji Logistic Park, Behind Tilakraj CNG Pump, Urali Devachi, Pune 412308, India',
  phone: '+91 9763 969 798',
  email: 'contact@guruom.in',
  gstin: '27AABCG1234F1Z5',
  pan: 'AABCG1234F',
  state: 'Maharashtra',
  stateCode: '27'
};
