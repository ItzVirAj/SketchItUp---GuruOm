import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { 
  Database, 
  Search, 
  Plus, 
  Tag, 
  Layers, 
  DollarSign, 
  MapPin, 
  CheckCircle2,
  X,
  Package,
  Boxes,
  RotateCcw,
  Download,
  Columns,
  ChevronDown,
  FileSpreadsheet,
  Upload,
  AlertCircle,
  FileText,
  Check,
  Building,
  Users,
  Wrench,
  Factory,
  Zap,
  Sparkles,
  Eye,
  EyeOff,
  ShieldCheck,
  Phone,
  Mail,
  Clock,
  Briefcase,
  Sliders,
  AlertTriangle,
  FileCheck,
  Truck,
  Pencil,
  Trash2
} from 'lucide-react';
import { MasterItem, CustomerMaster, VendorMaster, MachineMaster, SystemUser } from '../../../types/console';
import { Modal } from '../../common/Modal';

import { 
  INDIAN_STATES,
  CUSTOMER_TYPES,
  VENDOR_TYPES,
  VENDOR_CATEGORIES,
  ITEM_TYPES,
  ITEM_UOMS,
  GST_RATES,
  PAYMENT_TERMS,
  MACHINE_TYPES,
  MACHINE_SHIFTS,
  MACHINE_STATUSES,
  SUBCONTRACTOR_PROCESS_TYPES,
  INDIAN_MOBILE_REGEX,
  GSTIN_REGEX,
  PAN_REGEX,
  PINCODE_REGEX,
  HSN_CODE_REGEX,
  IFSC_REGEX,
  GST_EXEMPT_VALUE,
  isGstExempt,
  getItemPrefix,
  generateNextCode,
  maskBankAccount,
  getStateCodeByName
} from '../../../utils/masterValidation';

interface MastersViewProps {
  masters: MasterItem[];
  customers?: CustomerMaster[];
  vendors?: VendorMaster[];
  machines?: MachineMaster[];
  users?: SystemUser[];
  isDarkMode?: boolean;
  onAddMaster?: (item: Partial<MasterItem>) => void | Promise<void>;
  onUpdateMaster?: (code: string, item: Partial<MasterItem>) => void | Promise<void>;
  onDeleteMaster?: (code: string) => void | Promise<void>;
  onAddMasterItem?: (item: Partial<MasterItem>) => void | Promise<void>;
  onAddCustomer?: (customer: CustomerMaster) => void | Promise<void>;
  onUpdateCustomer?: (code: string, customer: CustomerMaster) => void | Promise<void>;
  onDeleteCustomer?: (code: string) => void | Promise<void>;
  onAddVendor?: (vendor: VendorMaster) => void | Promise<void>;
  onUpdateVendor?: (code: string, vendor: VendorMaster) => void | Promise<void>;
  onDeleteVendor?: (code: string) => void | Promise<void>;
  onAddMachine?: (machine: MachineMaster) => void | Promise<void>;
  onUpdateMachine?: (code: string, machine: MachineMaster) => void | Promise<void>;
  onDeleteMachine?: (code: string) => void | Promise<void>;
  onImportOMGST?: (data: { customers?: CustomerMaster[]; vendors?: VendorMaster[]; machines?: MachineMaster[]; items?: MasterItem[] }) => void;
}

export const MastersView: React.FC<MastersViewProps> = ({
  masters = [],
  customers = [],
  vendors = [],
  machines = [],
  users = [],
  isDarkMode = true,
  onAddMaster,
  onUpdateMaster,
  onDeleteMaster,
  onAddMasterItem,
  onAddCustomer,
  onUpdateCustomer,
  onDeleteCustomer,
  onAddVendor,
  onUpdateVendor,
  onDeleteVendor,
  onAddMachine,
  onUpdateMachine,
  onDeleteMachine,
  onImportOMGST
}) => {
  const location = useLocation();
  const navigate = useNavigate();

  // Navigation tab state
  const [activeTab, setActiveTab] = useState<'ITEMS' | 'CUSTOMERS' | 'VENDORS' | 'MACHINES' | 'IMPORT_OMGST'>('CUSTOMERS');

  useEffect(() => {
    const path = location.pathname;
    if (path.includes('/masters/customers')) setActiveTab('CUSTOMERS');
    else if (path.includes('/masters/vendors')) setActiveTab('VENDORS');
    else if (path.includes('/masters/machines')) setActiveTab('MACHINES');
    else if (path.includes('/masters/import-omgst')) setActiveTab('IMPORT_OMGST');
    else if (path.includes('/masters/items')) setActiveTab('ITEMS');
  }, [location.pathname]);

  const handleSelectTab = (tab: 'ITEMS' | 'CUSTOMERS' | 'VENDORS' | 'MACHINES' | 'IMPORT_OMGST') => {
    setActiveTab(tab);
    const subPath = tab === 'CUSTOMERS' ? '/masters/customers' :
                    tab === 'VENDORS' ? '/masters/vendors' :
                    tab === 'MACHINES' ? '/masters/machines' :
                    tab === 'IMPORT_OMGST' ? '/masters/import-omgst' :
                    '/masters/items';
    if (location.pathname !== subPath) {
      navigate(subPath);
    }
  };

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'Active' | 'Inactive'>('ALL');
  const [typeFilter, setTypeFilter] = useState<string>('ALL');
  
  // Separate Modal states
  const [showAddCustomerModal, setShowAddCustomerModal] = useState(false);
  const [showAddVendorModal, setShowAddVendorModal] = useState(false);
  const [showAddMachineModal, setShowAddMachineModal] = useState(false);
  const [showAddItemModal, setShowAddItemModal] = useState(false);
  
  // Unmask Bank Account state
  const [unmaskedBankVendorCode, setUnmaskedBankVendorCode] = useState<string | null>(null);

  // Form Validation Errors
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // ----------------------------------------------------
  // Customer Form State
  // ----------------------------------------------------
  const [cCode, setCCode] = useState('');
  const [cName, setCName] = useState('');
  const [cLegalName, setCLegalName] = useState('');
  const [cCustomerType, setCCustomerType] = useState<string>('OEM');
  const [cContactPerson, setCContactPerson] = useState('');
  const [cMobile, setCMobile] = useState('');
  const [cEmail, setCEmail] = useState('');
  const [cGstin, setCGstin] = useState('');
  const [cGstExempt, setCGstExempt] = useState(false);
  const [cPan, setCPan] = useState('');
  const [cBillingAddress, setCBillingAddress] = useState('');
  const [cShippingAddress, setCShippingAddress] = useState('');
  const [cSameAddress, setCSameAddress] = useState(true);
  const [cCity, setCCity] = useState('');
  const [cState, setCState] = useState('Maharashtra');
  const [cPincode, setCPincode] = useState('');
  const [cPaymentTerms, setCPaymentTerms] = useState('Net 30');
  const [cCreditDays, setCCreditDays] = useState<number>(30);
  const [cCreditLimit, setCCreditLimit] = useState<number>(1000000);
  const [cSalesperson, setCSalesperson] = useState('');
  const [cStatus, setCStatus] = useState<'Active' | 'Inactive'>('Active');
  const [cNotes, setCNotes] = useState('');

  // ----------------------------------------------------
  // Vendor Form State
  // ----------------------------------------------------
  const [vCode, setVCode] = useState('');
  const [vName, setVName] = useState('');
  const [vLegalName, setVLegalName] = useState('');
  const [vVendorType, setVVendorType] = useState<string>('Supplier');
  const [vVendorCategory, setVVendorCategory] = useState<string>('Raw Material');
  const [vContactPerson, setVContactPerson] = useState('');
  const [vMobile, setVMobile] = useState('');
  const [vEmail, setVEmail] = useState('');
  const [vBillingAddress, setVBillingAddress] = useState('');
  const [vShippingAddress, setVShippingAddress] = useState('');
  const [vCity, setVCity] = useState('');
  const [vState, setVState] = useState('Maharashtra');
  const [vPincode, setVPincode] = useState('');
  const [vGstin, setVGstin] = useState('');
  const [vGstExempt, setVGstExempt] = useState(false);
  const [vPan, setVPan] = useState('');
  const [vBankAccountName, setVBankAccountName] = useState('');
  const [vBankAccountNumber, setVBankAccountNumber] = useState('');
  const [vIfsc, setVIfsc] = useState('');
  const [vPaymentTerms, setVPaymentTerms] = useState('Net 30');
  const [vCreditDays, setVCreditDays] = useState<number>(30);
  const [vCreditLimit, setVCreditLimit] = useState<number>(500000);
  const [vProcessType, setVProcessType] = useState<string>('Plating / Anodizing / Zinc Coating');
  const [vTurnaroundTimeDays, setVTurnaroundTimeDays] = useState<number>(3);
  const [vStatus, setVStatus] = useState<'Active' | 'Inactive'>('Active');
  const [vNotes, setVNotes] = useState('');

  // ----------------------------------------------------
  // Item Form State
  // ----------------------------------------------------
  const [iCode, setICode] = useState('');
  const [iName, setIName] = useState('');
  const [iItemType, setIItemType] = useState<string>('Raw Material');
  const [iCategory, setICategory] = useState('');
  const [iDescription, setIDescription] = useState('');
  const [iPartNo, setIPartNo] = useState('');
  const [iUnit, setIUnit] = useState<string>('Nos');
  const [iHsnCode, setIHsnCode] = useState('8483');
  const [iGstRate, setIGstRate] = useState<number>(18);
  const [iStandardCost, setIStandardCost] = useState<number>(100);
  const [iSellingPrice, setISellingPrice] = useState<number>(0);
  const [iMinStock, setIMinStock] = useState<number>(50);
  const [iMaxStock, setIMaxStock] = useState<number>(500);
  const [iReorderLevel, setIReorderLevel] = useState<number>(100);
  const [iLeadTimeDays, setILeadTimeDays] = useState<number>(7);
  const [iPreferredVendor, setIPreferredVendor] = useState('');
  const [iDefaultWarehouse, setIDefaultWarehouse] = useState('Main Raw Material Store');
  const [iStatus, setIStatus] = useState<'Active' | 'Inactive'>('Active');

  // ----------------------------------------------------
  // Machine Form State
  // ----------------------------------------------------
  const [mCode, setMCode] = useState('');
  const [mName, setMName] = useState('');
  const [mType, setMType] = useState<string>('CNC Machining');
  const [mDepartment, setMDepartment] = useState('Machine Shop');
  const [mLocation, setMLocation] = useState('Bay 1 — Machine Shop');
  const [mManufacturer, setMManufacturer] = useState('');
  const [mModel, setMModel] = useState('');
  const [mSerialNumber, setMSerialNumber] = useState('');
  const [mInstallationDate, setMInstallationDate] = useState('');
  const [mCapacity, setMCapacity] = useState<number | undefined>(undefined);
  const [mCapacityUom, setMCapacityUom] = useState('');
  const [mOperatingHours, setMOperatingHours] = useState<number>(16);
  const [mShift, setMShift] = useState<string>('General-Day');
  const [mStatus, setMStatus] = useState<string>('Active');
  const [mResponsiblePerson, setMResponsiblePerson] = useState('');
  const [mHourlyCost, setMHourlyCost] = useState<number>(600);

  // Edit & Delete States
  const [editingCustomer, setEditingCustomer] = useState<CustomerMaster | null>(null);
  const [editingVendor, setEditingVendor] = useState<VendorMaster | null>(null);
  const [editingItem, setEditingItem] = useState<MasterItem | null>(null);
  const [editingMachine, setEditingMachine] = useState<MachineMaster | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{
    isOpen: boolean;
    type: 'CUSTOMER' | 'VENDOR' | 'ITEM' | 'MACHINE';
    code: string;
    name: string;
  } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Init Code Generators on opening modals
  const openCustomerModal = () => {
    setFormErrors({});
    setEditingCustomer(null);
    const nextCode = generateNextCode(customers.map(c => c.code), 'CUST');
    setCCode(nextCode);
    setCName('');
    setCLegalName('');
    setCCustomerType('OEM');
    setCContactPerson('');
    setCMobile('');
    setCEmail('');
    setCGstin('');
    setCGstExempt(false);
    setCPan('');
    setCBillingAddress('');
    setCShippingAddress('');
    setCSameAddress(true);
    setCCity('');
    setCState('Maharashtra');
    setCPincode('');
    setCPaymentTerms('Net 30');
    setCCreditDays(30);
    setCCreditLimit(1000000);
    setCSalesperson(users.find(u => u.userRole?.includes('Sales'))?.name || '');
    setCStatus('Active');
    setCNotes('');
    setShowAddCustomerModal(true);
  };

  const openEditCustomer = (c: CustomerMaster) => {
    setFormErrors({});
    setEditingCustomer(c);
    setCCode(c.code);
    setCName(c.name);
    setCLegalName(c.legalName || '');
    setCCustomerType(c.customerType || 'OEM');
    setCContactPerson(c.contactPerson || '');
    setCMobile(c.mobile || '');
    setCEmail(c.email || '');
    const isExempt = isGstExempt(c.gstin);
    setCGstExempt(isExempt);
    setCGstin(isExempt ? '' : (c.gstin || ''));
    setCPan(c.pan || '');
    setCBillingAddress(c.billingAddress || (c as any).address || '');
    setCShippingAddress(c.shippingAddress || c.billingAddress || (c as any).address || '');
    setCSameAddress(c.shippingAddress === c.billingAddress || !c.shippingAddress);
    setCCity(c.city || '');
    setCState(c.state || 'Maharashtra');
    setCPincode(c.pincode || (c as any).pin || '');
    setCPaymentTerms(c.paymentTerms || 'Net 30');
    setCCreditDays(c.creditDays ?? 30);
    setCCreditLimit(c.creditLimit ?? 1000000);
    setCSalesperson(c.salesperson || '');
    setCStatus(c.status || 'Active');
    setCNotes(c.notes || '');
    setShowAddCustomerModal(true);
  };

  const openVendorModal = () => {
    setFormErrors({});
    setEditingVendor(null);
    const nextCode = generateNextCode(vendors.map(v => v.code), 'VEND');
    setVCode(nextCode);
    setVName('');
    setVLegalName('');
    setVVendorType('Supplier');
    setVVendorCategory('Raw Material');
    setVContactPerson('');
    setVMobile('');
    setVEmail('');
    setVBillingAddress('');
    setVShippingAddress('');
    setVCity('');
    setVState('Maharashtra');
    setVPincode('');
    setVGstin('');
    setVGstExempt(false);
    setVPan('');
    setVBankAccountName('');
    setVBankAccountNumber('');
    setVIfsc('');
    setVPaymentTerms('Net 30');
    setVCreditDays(30);
    setVCreditLimit(500000);
    setVProcessType('Plating / Anodizing / Zinc Coating');
    setVTurnaroundTimeDays(3);
    setVStatus('Active');
    setVNotes('');
    setShowAddVendorModal(true);
  };

  const openEditVendor = (v: VendorMaster) => {
    setFormErrors({});
    setEditingVendor(v);
    setVCode(v.code);
    setVName(v.name);
    setVLegalName(v.legalName || '');
    setVVendorType(v.vendorType || 'Supplier');
    setVVendorCategory(v.vendorCategory || 'Raw Material');
    setVContactPerson(v.contactPerson || '');
    setVMobile(v.mobile || '');
    setVEmail(v.email || '');
    setVBillingAddress(v.billingAddress || (v as any).address || '');
    setVShippingAddress(v.shippingAddress || v.billingAddress || (v as any).address || '');
    setVCity(v.city || '');
    setVState(v.state || 'Maharashtra');
    setVPincode(v.pincode || (v as any).pin || '');
    const isExempt = isGstExempt(v.gstin);
    setVGstExempt(isExempt);
    setVGstin(isExempt ? '' : (v.gstin || ''));
    setVPan(v.pan || '');
    setVBankAccountName(v.bankAccountName || '');
    setVBankAccountNumber(v.bankAccountNumber || '');
    setVIfsc(v.ifsc || '');
    setVPaymentTerms(v.paymentTerms || 'Net 30');
    setVCreditDays(v.creditDays ?? 30);
    setVCreditLimit(v.creditLimit ?? 500000);
    setVProcessType(v.processType || 'Plating / Anodizing / Zinc Coating');
    setVTurnaroundTimeDays(v.turnaroundTimeDays ?? 3);
    setVStatus(v.status || 'Active');
    setVNotes(v.notes || '');
    setShowAddVendorModal(true);
  };

  const openItemModal = () => {
    setFormErrors({});
    setEditingItem(null);
    const prefix = getItemPrefix(iItemType);
    const nextCode = generateNextCode(masters.map(m => m.code), prefix);
    setICode(nextCode);
    setIName('');
    setICategory('Metals & Bars');
    setIDescription('');
    setIPartNo('');
    setIUnit('Nos');
    setIHsnCode('8483');
    setIGstRate(18);
    setIStandardCost(100);
    setISellingPrice(0);
    setIMinStock(50);
    setIMaxStock(500);
    setIReorderLevel(100);
    setILeadTimeDays(7);
    setIPreferredVendor(vendors[0]?.name || '');
    setIDefaultWarehouse('Main Raw Material Store');
    setIStatus('Active');
    setShowAddItemModal(true);
  };

  const openEditItem = (item: MasterItem) => {
    setFormErrors({});
    setEditingItem(item);
    setICode(item.code);
    setIName(item.name || item.description || '');
    setIItemType(item.itemType || (item.isFinishedGoods ? 'Finished Good' : 'Raw Material'));
    setICategory(item.category || '');
    setIDescription(item.description || item.name || '');
    setIPartNo(item.partNo || '');
    setIUnit(item.unit || 'Nos');
    setIHsnCode(item.hsnCode || '8483');
    setIGstRate(item.gstRate ?? 18);
    setIStandardCost(item.standardCost || item.purchaseRate || 0);
    setISellingPrice(item.sellingPrice || item.saleRate || 0);
    setIMinStock(item.minStock ?? 50);
    setIMaxStock(item.maxStock ?? 500);
    setIReorderLevel(item.reorderLevel ?? 100);
    setILeadTimeDays(item.leadTimeDays ?? 7);
    setIPreferredVendor(item.preferredVendor || '');
    setIDefaultWarehouse(item.defaultWarehouse || item.storeLocation || 'Main Raw Material Store');
    setIStatus(item.status || 'Active');
    setShowAddItemModal(true);
  };

  const openMachineModal = () => {
    setFormErrors({});
    setEditingMachine(null);
    const nextCode = generateNextCode(machines.map(m => m.code), 'MCH');
    setMCode(nextCode);
    setMName('');
    setMType('CNC Machining');
    setMDepartment('Machine Shop');
    setMLocation('Bay 1 — Machine Shop');
    setMManufacturer('');
    setMModel('');
    setMSerialNumber('');
    setMInstallationDate('');
    setMCapacity(undefined);
    setMCapacityUom('');
    setMOperatingHours(16);
    setMShift('General-Day');
    setMStatus('Active');
    setMResponsiblePerson(users[0]?.name || '');
    setMHourlyCost(600);
    setShowAddMachineModal(true);
  };

  const openEditMachine = (m: MachineMaster) => {
    setFormErrors({});
    setEditingMachine(m);
    setMCode(m.code);
    setMName(m.name);
    setMType(m.type || 'CNC Machining');
    setMDepartment(m.department || 'Machine Shop');
    setMLocation(m.location || 'Bay 1 — Machine Shop');
    setMManufacturer(m.manufacturer || '');
    setMModel(m.model || '');
    setMSerialNumber(m.serialNumber || '');
    setMInstallationDate(m.installationDate || '');
    setMCapacity(m.capacity);
    setMCapacityUom(m.capacityUom || '');
    setMOperatingHours(m.operatingHours ?? 16);
    setMShift(m.shift || 'General-Day');
    setMStatus(m.status || 'Active');
    setMResponsiblePerson(m.responsiblePerson || '');
    setMHourlyCost(m.hourlyCost ?? 600);
    setShowAddMachineModal(true);
  };

  const handleDeletePrompt = (type: 'CUSTOMER' | 'VENDOR' | 'ITEM' | 'MACHINE', code: string, name: string) => {
    setDeleteConfirm({ isOpen: true, type, code, name });
  };

  const handleConfirmDelete = async () => {
    if (!deleteConfirm) return;
    setIsDeleting(true);
    const { type, code } = deleteConfirm;
    try {
      if (type === 'CUSTOMER') {
        await onDeleteCustomer?.(code);
      } else if (type === 'VENDOR') {
        await onDeleteVendor?.(code);
      } else if (type === 'ITEM') {
        await onDeleteMaster?.(code);
      } else if (type === 'MACHINE') {
        await onDeleteMachine?.(code);
      }
    } catch (err) {
      console.error('Delete master error:', err);
    } finally {
      setIsDeleting(false);
      setDeleteConfirm(null);
    }
  };

  // Dynamic Item Prefix update on type change
  const handleItemTypeChange = (newType: string) => {
    setIItemType(newType);
    const prefix = getItemPrefix(newType);
    const nextCode = generateNextCode(masters.map(m => m.code), prefix);
    setICode(nextCode);

    if (newType === 'Finished Good') {
      setIStandardCost(0);
      setIPreferredVendor('');
      if (iSellingPrice === 0) setISellingPrice(1500);
      setIDefaultWarehouse('Finished Goods Yard');
    } else {
      setISellingPrice(0);
      if (iStandardCost === 0) setIStandardCost(100);
      setIDefaultWarehouse('Main Raw Material Store');
    }
  };

  // ----------------------------------------------------
  // Submit Handlers with Live Dynamic Validation
  // ----------------------------------------------------
  const handleSaveCustomer = (e: React.FormEvent) => {
    e.preventDefault();
    const errors: Record<string, string> = {};

    if (!cName.trim()) errors.name = 'Customer Name is mandatory';
    if (!cContactPerson.trim()) errors.contactPerson = 'Contact Person is mandatory';
    if (!cMobile.trim() || !INDIAN_MOBILE_REGEX.test(cMobile.trim())) {
      errors.mobile = '10-digit Indian mobile number required (starting with 6-9)';
    }

    if (cGstExempt) {
      if (!cNotes.trim()) {
        errors.notes = 'Exemption reason is mandatory in Notes when GSTIN is N/A — GST-exempt';
      }
    } else {
      if (!cGstin.trim()) {
        errors.gstin = 'GSTIN is required (or check GST-Exempt)';
      } else if (!GSTIN_REGEX.test(cGstin.trim())) {
        errors.gstin = 'Invalid 15-char GSTIN format (e.g. 27AABCL1234M1ZP)';
      }
    }

    if (cPan.trim() && !PAN_REGEX.test(cPan.trim())) {
      errors.pan = 'Invalid PAN format (e.g. AABCL1234M)';
    }

    if (!cBillingAddress.trim()) errors.billingAddress = 'Billing Address is mandatory';
    if (!cCity.trim()) errors.city = 'City is mandatory';
    if (!cState.trim()) errors.state = 'State is mandatory';

    if (cPincode.trim() && !PINCODE_REGEX.test(cPincode.trim())) {
      errors.pincode = 'Pincode must be 6 digits';
    }

    if (cPaymentTerms.startsWith('Net')) {
      if (cCreditDays <= 0 || cCreditDays > 180) {
        errors.creditDays = 'Credit days must be between 1 and 180 for Net terms';
      }
      if (cCreditLimit <= 0) {
        errors.creditLimit = 'Credit limit (₹) is required for Net terms';
      }
    }

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    const stateCode = getStateCodeByName(cState);
    const finalGstin = cGstExempt ? GST_EXEMPT_VALUE : cGstin.trim().toUpperCase();
    const finalPan = cPan.trim() ? cPan.trim().toUpperCase() : (finalGstin.length === 15 ? finalGstin.slice(2, 12) : '');

    const newCust: CustomerMaster = {
      code: cCode,
      name: cName.trim(),
      legalName: cLegalName.trim(),
      customerType: cCustomerType,
      contactPerson: cContactPerson.trim(),
      mobile: cMobile.trim(),
      email: cEmail.trim(),
      gstin: finalGstin,
      pan: finalPan,
      billingAddress: cBillingAddress.trim(),
      address: cBillingAddress.trim(),
      shippingAddress: cSameAddress ? cBillingAddress.trim() : (cShippingAddress.trim() || cBillingAddress.trim()),
      city: cCity.trim(),
      state: cState.trim(),
      stateCode,
      pincode: cPincode.trim(),
      paymentTerms: cPaymentTerms,
      creditDays: cCreditDays,
      creditLimit: cCreditLimit,
      salesperson: cSalesperson.trim(),
      status: cStatus,
      notes: cNotes.trim()
    };

    if (editingCustomer && onUpdateCustomer) {
      onUpdateCustomer(cCode, newCust);
    } else if (onAddCustomer) {
      onAddCustomer(newCust);
    }

    setEditingCustomer(null);
    setShowAddCustomerModal(false);
  };

  const handleSaveVendor = (e: React.FormEvent) => {
    e.preventDefault();
    const errors: Record<string, string> = {};

    if (!vName.trim()) errors.name = 'Vendor Name is mandatory';
    if (!vContactPerson.trim()) errors.contactPerson = 'Contact Person is mandatory';
    if (!vMobile.trim() || !INDIAN_MOBILE_REGEX.test(vMobile.trim())) {
      errors.mobile = '10-digit Indian mobile number required (starting with 6-9)';
    }

    if (!vPan.trim()) {
      errors.pan = 'PAN is always mandatory for vendor TDS compliance';
    } else if (!PAN_REGEX.test(vPan.trim())) {
      errors.pan = 'Invalid 10-char PAN format (e.g. AAAFS1111A)';
    }

    if (!vGstExempt && vGstin.trim() && !GSTIN_REGEX.test(vGstin.trim())) {
      errors.gstin = 'Invalid 15-char GSTIN format';
    }

    if (!vBillingAddress.trim()) errors.billingAddress = 'Billing Address is mandatory';
    if (!vCity.trim()) errors.city = 'City is mandatory';
    if (!vState.trim()) errors.state = 'State is mandatory';

    if (!vBankAccountName.trim()) errors.bankAccountName = 'Bank Account Name is mandatory';
    if (!vBankAccountNumber.trim()) errors.bankAccountNumber = 'Bank Account Number is mandatory';
    if (!vIfsc.trim() || !IFSC_REGEX.test(vIfsc.trim())) {
      errors.ifsc = 'Valid 11-char IFSC code is mandatory (e.g. HDFC0001234)';
    }

    if (vVendorType === 'Subcontractor / Job Worker') {
      if (!vProcessType.trim()) {
        errors.processType = 'Process type is required for Subcontractor vendors';
      }
      if (vTurnaroundTimeDays <= 0) {
        errors.turnaroundTimeDays = 'Turnaround time (days) is required for Subcontractors';
      }
    }

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    const stateCode = getStateCodeByName(vState);
    const finalGstin = vGstExempt ? GST_EXEMPT_VALUE : (vGstin.trim().toUpperCase() || 'N/A — GST-exempt');

    const newVend: VendorMaster = {
      code: vCode,
      name: vName.trim(),
      legalName: vLegalName.trim(),
      vendorType: vVendorType,
      vendorCategory: vVendorCategory,
      contactPerson: vContactPerson.trim(),
      mobile: vMobile.trim(),
      email: vEmail.trim(),
      billingAddress: vBillingAddress.trim(),
      address: vBillingAddress.trim(),
      shippingAddress: vShippingAddress.trim() || vBillingAddress.trim(),
      city: vCity.trim(),
      state: vState.trim(),
      stateCode,
      pincode: vPincode.trim(),
      gstin: finalGstin,
      pan: vPan.trim().toUpperCase(),
      bankAccountName: vBankAccountName.trim(),
      bankAccountNumber: vBankAccountNumber.trim(),
      ifsc: vIfsc.trim().toUpperCase(),
      paymentTerms: vPaymentTerms,
      creditDays: vCreditDays,
      creditLimit: vCreditLimit,
      processType: vVendorType === 'Subcontractor / Job Worker' ? vProcessType : undefined,
      turnaroundTimeDays: vVendorType === 'Subcontractor / Job Worker' ? vTurnaroundTimeDays : undefined,
      status: vStatus,
      notes: vNotes.trim()
    };

    if (editingVendor && onUpdateVendor) {
      onUpdateVendor(vCode, newVend);
    } else if (onAddVendor) {
      onAddVendor(newVend);
    }

    setEditingVendor(null);
    setShowAddVendorModal(false);
  };

  const handleSaveItem = (e: React.FormEvent) => {
    e.preventDefault();
    const errors: Record<string, string> = {};

    if (!iName.trim()) errors.name = 'Item Name is mandatory';
    if (!iHsnCode.trim() || !HSN_CODE_REGEX.test(iHsnCode.trim())) {
      errors.hsnCode = 'HSN code must be 4 to 8 digits for GST invoicing';
    }

    if (['Raw Material', 'Consumable', 'Bought-Out'].includes(iItemType)) {
      if (iStandardCost <= 0) {
        errors.standardCost = `Standard Cost is required for ${iItemType}`;
      }
      if (!iPreferredVendor.trim()) {
        errors.preferredVendor = `Preferred Vendor is required for ${iItemType}`;
      }
    } else if (iItemType === 'Finished Good') {
      if (iSellingPrice <= 0) {
        errors.sellingPrice = 'Selling Price (₹) is required for Finished Goods';
      }
    }

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    const isFG = iItemType === 'Finished Good';

    const newItem: MasterItem = {
      code: iCode,
      name: iName.trim(),
      itemType: iItemType,
      category: iCategory.trim(),
      description: iDescription.trim() || iName.trim(),
      partNo: iPartNo.trim() || iName.trim(),
      unit: iUnit,
      hsnCode: iHsnCode.trim(),
      gstRate: Number(iGstRate),
      standardCost: isFG ? 0 : Number(iStandardCost),
      sellingPrice: isFG ? Number(iSellingPrice) : 0,
      minStock: Number(iMinStock),
      maxStock: Number(iMaxStock),
      reorderLevel: Number(iReorderLevel),
      leadTimeDays: Number(iLeadTimeDays),
      preferredVendor: isFG ? '' : iPreferredVendor.trim(),
      defaultWarehouse: iDefaultWarehouse.trim(),
      storeLocation: iDefaultWarehouse.trim(),
      isFinishedGoods: isFG,
      saleRate: isFG ? Number(iSellingPrice) : 0,
      purchaseRate: isFG ? 0 : Number(iStandardCost),
      status: iStatus
    };

    if (editingItem && onUpdateMaster) {
      onUpdateMaster(iCode, newItem);
    } else if (onAddMasterItem) {
      onAddMasterItem(newItem);
    } else if (onAddMaster) {
      onAddMaster(newItem);
    }

    setEditingItem(null);
    setShowAddItemModal(false);
  };

  const handleSaveMachine = (e: React.FormEvent) => {
    e.preventDefault();
    const errors: Record<string, string> = {};

    if (!mName.trim()) {
      errors.name = 'Machine Name is mandatory and must be unique (e.g. VMC-01)';
    } else if (machines.some(m => m.code !== (editingMachine?.code || '') && m.name.toLowerCase() === mName.trim().toLowerCase())) {
      errors.name = `Machine "${mName.trim()}" already exists. Name must be unique.`;
    }

    if (!mDepartment.trim()) errors.department = 'Department is mandatory';
    if (!mLocation.trim()) errors.location = 'Shop floor location is mandatory';

    if (mCapacity !== undefined && mCapacity > 0 && !mCapacityUom.trim()) {
      errors.capacityUom = 'Capacity UOM is required when capacity is specified';
    }

    if (mOperatingHours < 0 || mOperatingHours > 24) {
      errors.operatingHours = 'Operating hours must be between 0 and 24 hours';
    }

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    const newMachine: MachineMaster = {
      code: mCode,
      name: mName.trim().toUpperCase(),
      type: mType,
      department: mDepartment.trim(),
      location: mLocation.trim(),
      manufacturer: mManufacturer.trim(),
      model: mModel.trim(),
      serialNumber: mSerialNumber.trim(),
      installationDate: mInstallationDate.trim(),
      capacity: mCapacity ? Number(mCapacity) : undefined,
      capacityUom: mCapacityUom.trim(),
      operatingHours: Number(mOperatingHours),
      shift: mShift,
      status: mStatus,
      responsiblePerson: mResponsiblePerson.trim(),
      hourlyCost: Number(mHourlyCost),
      active: mStatus === 'Active'
    };

    if (editingMachine && onUpdateMachine) {
      onUpdateMachine(mCode, newMachine);
    } else if (onAddMachine) {
      onAddMachine(newMachine);
    }

    setEditingMachine(null);
    setShowAddMachineModal(false);
  };

  // ----------------------------------------------------
  // Filtered Lists
  // ----------------------------------------------------
  const filteredCustomers = useMemo(() => {
    return customers.filter(c => {
      const matchesSearch = 
        c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.gstin.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.city.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesStatus = statusFilter === 'ALL' || c.status === statusFilter;
      const matchesType = typeFilter === 'ALL' || c.customerType === typeFilter;
      return matchesSearch && matchesStatus && matchesType;
    });
  }, [customers, searchTerm, statusFilter, typeFilter]);

  const filteredVendors = useMemo(() => {
    return vendors.filter(v => {
      const matchesSearch = 
        v.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        v.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
        v.gstin.toLowerCase().includes(searchTerm.toLowerCase()) ||
        v.pan.toLowerCase().includes(searchTerm.toLowerCase()) ||
        v.city.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesStatus = statusFilter === 'ALL' || v.status === statusFilter;
      const matchesType = typeFilter === 'ALL' || v.vendorType === typeFilter;
      return matchesSearch && matchesStatus && matchesType;
    });
  }, [vendors, searchTerm, statusFilter, typeFilter]);

  const filteredItems = useMemo(() => {
    return masters.filter(m => {
      const name = m.name || m.description || '';
      const matchesSearch = 
        name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        m.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (m.partNo || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        m.hsnCode.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesStatus = statusFilter === 'ALL' || (m.status || 'Active') === statusFilter;
      const matchesType = typeFilter === 'ALL' || m.itemType === typeFilter;
      return matchesSearch && matchesStatus && matchesType;
    });
  }, [masters, searchTerm, statusFilter, typeFilter]);

  const filteredMachines = useMemo(() => {
    return machines.filter(m => {
      const matchesSearch = 
        m.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        m.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
        m.type.toLowerCase().includes(searchTerm.toLowerCase()) ||
        m.department.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesStatus = statusFilter === 'ALL' || m.status === statusFilter;
      const matchesType = typeFilter === 'ALL' || m.type === typeFilter;
      return matchesSearch && matchesStatus && matchesType;
    });
  }, [machines, searchTerm, statusFilter, typeFilter]);

  return (
    <div className="space-y-6 font-sans">
      
      {/* Top Banner Header with Summary Telemetry */}
      <div className={`p-6 rounded-3xl border transition-all ${
        isDarkMode 
          ? 'bg-slate-900/80 border-slate-800/80 text-white backdrop-blur-xl shadow-2xl' 
          : 'bg-white border-slate-200 shadow-sm text-slate-900'
      }`}>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider ${
                isDarkMode ? 'bg-[#5B75F8]/20 text-[#7B92FF] border border-[#5B75F8]/30' : 'bg-[#5B75F8]/10 text-[#5B75F8] border border-[#5B75F8]/20'
              }`}>
                Precision Master Data Registry
              </span>
              <span className="text-xs text-slate-400 font-mono">• ERP Core Modules Specification</span>
            </div>
            <h1 className={`text-2xl font-bold tracking-tight ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
              Master Data Hub
            </h1>
            <p className={`text-xs mt-1 max-w-xl ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
              Manage Customers, Vendors, Item Catalog, Machine Routing Fleet & Users with strict GSTIN/PAN and conditional rules.
            </p>
          </div>

          <div className="flex items-center gap-3">
            {activeTab === 'CUSTOMERS' && (
              <button
                onClick={openCustomerModal}
                className="px-4 py-2.5 rounded-2xl bg-gradient-to-r from-[#5B75F8] to-blue-600 text-white font-bold text-xs flex items-center gap-2 cursor-pointer shadow-lg shadow-[#5B75F8]/20 hover:scale-[1.02] active:scale-[0.98] transition-all"
              >
                <Plus className="w-4 h-4" />
                <span>New Customer (CUST-####)</span>
              </button>
            )}

            {activeTab === 'VENDORS' && (
              <button
                onClick={openVendorModal}
                className="px-4 py-2.5 rounded-2xl bg-gradient-to-r from-[#5B75F8] to-indigo-600 text-white font-bold text-xs flex items-center gap-2 cursor-pointer shadow-lg shadow-[#5B75F8]/20 hover:scale-[1.02] active:scale-[0.98] transition-all"
              >
                <Plus className="w-4 h-4" />
                <span>New Vendor (VEND-####)</span>
              </button>
            )}

            {activeTab === 'ITEMS' && (
              <button
                onClick={openItemModal}
                className="px-4 py-2.5 rounded-2xl bg-gradient-to-r from-[#5B75F8] to-emerald-600 text-white font-bold text-xs flex items-center gap-2 cursor-pointer shadow-lg shadow-[#5B75F8]/20 hover:scale-[1.02] active:scale-[0.98] transition-all"
              >
                <Plus className="w-4 h-4" />
                <span>New Item (RM/FG-####)</span>
              </button>
            )}

            {activeTab === 'MACHINES' && (
              <button
                onClick={openMachineModal}
                className="px-4 py-2.5 rounded-2xl bg-gradient-to-r from-[#5B75F8] to-amber-600 text-white font-bold text-xs flex items-center gap-2 cursor-pointer shadow-lg shadow-[#5B75F8]/20 hover:scale-[1.02] active:scale-[0.98] transition-all"
              >
                <Plus className="w-4 h-4" />
                <span>New Machine (MCH-####)</span>
              </button>
            )}
          </div>
        </div>

        {/* Master Metrics Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5 pt-4 border-t border-slate-200 dark:border-slate-800/60">
          <div className={`p-4 rounded-2xl border transition-all ${isDarkMode ? 'bg-slate-950/60 border-slate-800/80' : 'bg-slate-50/90 border-slate-200/90 shadow-xs'}`}>
            <div className={`text-[11px] font-mono font-medium ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>Total Customers</div>
            <div className="text-xl font-bold text-blue-600 dark:text-blue-400 mt-1">{customers.length} Accounts</div>
            <div className="text-[11px] text-emerald-600 dark:text-emerald-400 font-mono font-semibold mt-0.5">● {customers.filter(c => c.status === 'Active').length} Active</div>
          </div>
          <div className={`p-4 rounded-2xl border transition-all ${isDarkMode ? 'bg-slate-950/60 border-slate-800/80' : 'bg-slate-50/90 border-slate-200/90 shadow-xs'}`}>
            <div className={`text-[11px] font-mono font-medium ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>Total Vendors</div>
            <div className="text-xl font-bold text-indigo-600 dark:text-indigo-400 mt-1">{vendors.length} Suppliers</div>
            <div className="text-[11px] text-indigo-600 dark:text-indigo-400 font-mono font-semibold mt-0.5">● {vendors.filter(v => v.vendorType === 'Subcontractor / Job Worker').length} Subcontractors</div>
          </div>
          <div className={`p-4 rounded-2xl border transition-all ${isDarkMode ? 'bg-slate-950/60 border-slate-800/80' : 'bg-slate-50/90 border-slate-200/90 shadow-xs'}`}>
            <div className={`text-[11px] font-mono font-medium ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>Item Master Parts</div>
            <div className="text-xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">{masters.length} SKUs</div>
            <div className={`text-[11px] font-mono font-semibold mt-0.5 ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>{masters.filter(m => m.isFinishedGoods || m.itemType === 'Finished Good').length} FG / {masters.filter(m => m.itemType === 'Raw Material').length} RM</div>
          </div>
          <div className={`p-4 rounded-2xl border transition-all ${isDarkMode ? 'bg-slate-950/60 border-slate-800/80' : 'bg-slate-50/90 border-slate-200/90 shadow-xs'}`}>
            <div className={`text-[11px] font-mono font-medium ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>Machine Fleet</div>
            <div className="text-xl font-bold text-amber-600 dark:text-amber-400 mt-1">{machines.length} Units</div>
            <div className="text-[11px] text-amber-600 dark:text-amber-400 font-mono font-semibold mt-0.5">● {machines.filter(m => m.status === 'Active').length} Operational</div>
          </div>
        </div>
      </div>

      {/* Main Tab Controls Bar */}
      <div className={`p-4 rounded-3xl border transition-all flex flex-wrap items-center justify-between gap-4 shadow-sm ${
        isDarkMode ? 'bg-slate-900/80 border-slate-800/80 backdrop-blur-xl' : 'bg-white border-slate-200 shadow-sm'
      }`}>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => handleSelectTab('CUSTOMERS')}
            className={`px-4 py-2 rounded-2xl text-xs font-mono font-bold transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === 'CUSTOMERS'
                ? isDarkMode ? 'bg-[#5B75F8]/20 text-[#7B92FF] border border-[#5B75F8]/40 shadow-xs' : 'bg-[#5B75F8] text-white shadow-md'
                : isDarkMode ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Building className="w-3.5 h-3.5" />
            <span>Customers ({customers.length})</span>
          </button>
          
          <button
            onClick={() => handleSelectTab('VENDORS')}
            className={`px-4 py-2 rounded-2xl text-xs font-mono font-bold transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === 'VENDORS'
                ? isDarkMode ? 'bg-[#5B75F8]/20 text-[#7B92FF] border border-[#5B75F8]/40 shadow-xs' : 'bg-[#5B75F8] text-white shadow-md'
                : isDarkMode ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Vendors ({vendors.length})</span>
          </button>

          <button
            onClick={() => handleSelectTab('ITEMS')}
            className={`px-4 py-2 rounded-2xl text-xs font-mono font-bold transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === 'ITEMS'
                ? isDarkMode ? 'bg-[#5B75F8]/20 text-[#7B92FF] border border-[#5B75F8]/40 shadow-xs' : 'bg-[#5B75F8] text-white shadow-md'
                : isDarkMode ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Package className="w-3.5 h-3.5" />
            <span>Item Catalog ({masters.length})</span>
          </button>

          <button
            onClick={() => handleSelectTab('MACHINES')}
            className={`px-4 py-2 rounded-2xl text-xs font-mono font-bold transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === 'MACHINES'
                ? isDarkMode ? 'bg-[#5B75F8]/20 text-[#7B92FF] border border-[#5B75F8]/40 shadow-xs' : 'bg-[#5B75F8] text-white shadow-md'
                : isDarkMode ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Wrench className="w-3.5 h-3.5" />
            <span>Machine Fleet ({machines.length})</span>
          </button>

          <button
            onClick={() => handleSelectTab('IMPORT_OMGST')}
            className={`px-4 py-2 rounded-2xl text-xs font-mono font-bold transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === 'IMPORT_OMGST'
                ? isDarkMode ? 'bg-[#5B75F8]/20 text-[#7B92FF] border border-[#5B75F8]/40 shadow-xs' : 'bg-[#5B75F8] text-white shadow-md'
                : isDarkMode ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>Import / OMGST</span>
          </button>
        </div>

        {/* Filter & Search Toolbar */}
        {activeTab !== 'IMPORT_OMGST' && (
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder={`Search ${activeTab.toLowerCase()}...`}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className={`pl-9 pr-4 py-2 rounded-xl text-xs border transition-all focus:outline-none focus:ring-2 focus:ring-[#5B75F8]/50 ${
                  isDarkMode 
                    ? 'bg-slate-800/80 border-slate-700 text-white placeholder:text-slate-500' 
                    : 'bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400 shadow-inner'
                }`}
              />
            </div>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className={`px-3 py-2 rounded-xl text-xs border font-medium transition-all focus:outline-none ${
                isDarkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-900 shadow-xs'
              }`}
            >
              <option value="ALL">Status: All</option>
              <option value="Active">Active Only</option>
              <option value="Inactive">Inactive</option>
            </select>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* 1. CUSTOMERS TAB */}
      {/* ========================================================================= */}
      {activeTab === 'CUSTOMERS' && (
        <div className={`rounded-3xl border overflow-hidden transition-all shadow-xl ${
          isDarkMode ? 'bg-slate-900/80 border-slate-800/80 backdrop-blur-xl' : 'bg-white border-slate-200 shadow-sm'
        }`}>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className={`border-b font-mono font-bold uppercase tracking-wider text-[11px] ${
                  isDarkMode ? 'bg-slate-800/80 border-slate-700/80 text-slate-300' : 'bg-slate-100/90 border-slate-200 text-slate-700'
                }`}>
                  <th className="py-4 px-5">Customer ID</th>
                  <th className="py-4 px-5">Customer Name & Type</th>
                  <th className="py-4 px-5">GSTIN & PAN</th>
                  <th className="py-4 px-5">Contact & Mobile</th>
                  <th className="py-4 px-5">City & State</th>
                  <th className="py-4 px-5">Payment Terms</th>
                  <th className="py-4 px-5">Credit Days / Limit</th>
                  <th className="py-4 px-5">Salesperson</th>
                  <th className="py-4 px-5 text-center">Status</th>
                  <th className="py-4 px-5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className={`divide-y ${isDarkMode ? 'divide-slate-800/60' : 'divide-slate-200/70'}`}>
                {filteredCustomers.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="py-14 text-center">
                      <Building className="w-9 h-9 mx-auto mb-2 opacity-40 text-slate-400" />
                      <p className={`text-sm font-semibold ${isDarkMode ? 'text-slate-300' : 'text-slate-800'}`}>No customer master records found.</p>
                      <p className={`text-xs mt-1 ${isDarkMode ? 'text-slate-500' : 'text-slate-500'}`}>Click "New Customer" to register an account.</p>
                    </td>
                  </tr>
                ) : (
                  filteredCustomers.map((cust) => (
                    <tr 
                      key={cust.code}
                      className={`transition-colors ${
                        cust.status === 'Inactive'
                          ? isDarkMode ? 'bg-slate-950/40 text-slate-500' : 'bg-slate-100/60 text-slate-400'
                          : isDarkMode ? 'hover:bg-slate-800/40 text-slate-200' : 'hover:bg-slate-50 text-slate-900'
                      }`}
                    >
                      <td className="py-4 px-5 font-mono font-bold text-blue-600 dark:text-blue-400">{cust.code}</td>
                      <td className="py-4 px-5">
                        <div className={`font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{cust.name}</div>
                        <div className="text-[10px] font-mono flex items-center gap-1.5 mt-1">
                          <span className={`px-2 py-0.5 rounded-md font-bold uppercase border ${
                            isDarkMode ? 'bg-slate-800 text-slate-300 border-slate-700' : 'bg-blue-50 text-blue-700 border-blue-200'
                          }`}>{cust.customerType}</span>
                          {cust.legalName && <span className={isDarkMode ? 'text-slate-400' : 'text-slate-600'}>• {cust.legalName}</span>}
                        </div>
                      </td>
                      <td className="py-4 px-5 font-mono">
                        <div className={`text-xs font-bold ${isGstExempt(cust.gstin) ? 'text-amber-600 dark:text-amber-400' : isDarkMode ? 'text-slate-200' : 'text-slate-900'}`}>
                          {cust.gstin}
                        </div>
                        {cust.pan && <div className={`text-[10px] mt-0.5 ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>PAN: {cust.pan}</div>}
                      </td>
                      <td className="py-4 px-5">
                        <div className={`font-semibold ${isDarkMode ? 'text-slate-200' : 'text-slate-900'}`}>{cust.contactPerson}</div>
                        <div className={`text-[11px] font-mono flex items-center gap-1.5 mt-1 ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                          <Phone className="w-3 h-3 text-[#5B75F8]" />
                          <span>+91 {cust.mobile}</span>
                        </div>
                      </td>
                      <td className="py-4 px-5">
                        <div className={`font-semibold ${isDarkMode ? 'text-slate-200' : 'text-slate-900'}`}>{cust.city}</div>
                        <div className={`text-[11px] ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>{cust.state} {cust.pincode ? `(${cust.pincode})` : ''}</div>
                      </td>
                      <td className="py-4 px-5">
                        <span className={`px-2.5 py-1 rounded-xl text-[11px] font-mono font-bold border ${
                          cust.paymentTerms.startsWith('Net') 
                            ? isDarkMode ? 'bg-blue-500/10 text-blue-400 border-blue-500/30' : 'bg-blue-50 text-blue-700 border-blue-200'
                            : isDarkMode ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        }`}>
                          {cust.paymentTerms}
                        </span>
                      </td>
                      <td className="py-4 px-5 font-mono">
                        <div className={`font-bold ${isDarkMode ? 'text-slate-200' : 'text-slate-900'}`}>{cust.creditDays} Days</div>
                        {cust.creditLimit ? (
                          <div className="text-[11px] text-emerald-600 dark:text-emerald-400 font-bold mt-0.5">₹{cust.creditLimit.toLocaleString('en-IN')}</div>
                        ) : null}
                      </td>
                      <td className={`py-4 px-5 font-medium ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                        {cust.salesperson || '—'}
                      </td>
                      <td className="py-4 px-5 text-center">
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-mono font-bold uppercase border ${
                          cust.status === 'Active'
                            ? isDarkMode ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : isDarkMode ? 'bg-rose-500/10 text-rose-400 border-rose-500/30' : 'bg-rose-50 text-rose-700 border-rose-200'
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${cust.status === 'Active' ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                          <span>{cust.status}</span>
                        </span>
                      </td>
                      <td className="py-4 px-5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => openEditCustomer(cust)}
                            className={`px-2.5 py-1 rounded-lg border text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer ${
                              isDarkMode 
                                ? 'bg-slate-800 hover:bg-slate-700 text-blue-400 border-slate-700 hover:border-blue-500/50' 
                                : 'bg-white hover:bg-blue-50 text-blue-600 border-slate-200 hover:border-blue-300 shadow-xs'
                            }`}
                            title="Edit Customer"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                            <span>Edit</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeletePrompt('CUSTOMER', cust.code, cust.name)}
                            className={`px-2.5 py-1 rounded-lg border text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer ${
                              isDarkMode 
                                ? 'bg-slate-800 hover:bg-rose-950/40 text-rose-400 border-slate-700 hover:border-rose-500/50' 
                                : 'bg-white hover:bg-rose-50 text-rose-600 border-slate-200 hover:border-rose-300 shadow-xs'
                            }`}
                            title="Delete Customer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Delete</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. VENDORS TAB */}
      {/* ========================================================================= */}
      {activeTab === 'VENDORS' && (
        <div className={`rounded-3xl border overflow-hidden transition-all shadow-xl ${
          isDarkMode ? 'bg-slate-900/80 border-slate-800/80 backdrop-blur-xl' : 'bg-white border-slate-200 shadow-sm'
        }`}>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className={`border-b font-mono font-bold uppercase tracking-wider text-[11px] ${
                  isDarkMode ? 'bg-slate-800/80 border-slate-700/80 text-slate-300' : 'bg-slate-100/90 border-slate-200 text-slate-700'
                }`}>
                  <th className="py-4 px-5">Vendor ID</th>
                  <th className="py-4 px-5">Vendor Name & Category</th>
                  <th className="py-4 px-5">Vendor Type</th>
                  <th className="py-4 px-5">PAN (TDS) & GSTIN</th>
                  <th className="py-4 px-5">Bank Account & IFSC</th>
                  <th className="py-4 px-5">Contact & Mobile</th>
                  <th className="py-4 px-5">City / State</th>
                  <th className="py-4 px-5">Terms</th>
                  <th className="py-4 px-5 text-center">Status</th>
                  <th className="py-4 px-5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className={`divide-y ${isDarkMode ? 'divide-slate-800/60' : 'divide-slate-200/70'}`}>
                {filteredVendors.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="py-14 text-center">
                      <Users className="w-9 h-9 mx-auto mb-2 opacity-40 text-slate-400" />
                      <p className={`text-sm font-semibold ${isDarkMode ? 'text-slate-300' : 'text-slate-800'}`}>No vendor master records found.</p>
                      <p className={`text-xs mt-1 ${isDarkMode ? 'text-slate-500' : 'text-slate-500'}`}>Click "New Vendor" to register a supplier or subcontractor.</p>
                    </td>
                  </tr>
                ) : (
                  filteredVendors.map((vend) => (
                    <tr 
                      key={vend.code}
                      className={`transition-colors ${
                        vend.status === 'Inactive'
                          ? isDarkMode ? 'bg-slate-950/40 text-slate-500' : 'bg-slate-100/60 text-slate-400'
                          : isDarkMode ? 'hover:bg-slate-800/40 text-slate-200' : 'hover:bg-slate-50 text-slate-900'
                      }`}
                    >
                      <td className="py-4 px-5 font-mono font-bold text-indigo-600 dark:text-indigo-400">{vend.code}</td>
                      <td className="py-4 px-5">
                        <div className={`font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{vend.name}</div>
                        <div className="text-[10px] font-mono mt-1">
                          <span className={`px-2 py-0.5 rounded-md font-bold border ${
                            isDarkMode ? 'bg-slate-800 text-slate-300 border-slate-700' : 'bg-slate-100 text-slate-700 border-slate-300'
                          }`}>{vend.vendorCategory}</span>
                        </div>
                      </td>
                      <td className="py-4 px-5">
                        <span className={`px-2.5 py-1 rounded-xl text-[10px] font-mono font-bold uppercase border ${
                          vend.vendorType === 'Subcontractor / Job Worker'
                            ? isDarkMode ? 'bg-amber-500/10 text-amber-400 border-amber-500/30' : 'bg-amber-50 text-amber-800 border-amber-200'
                            : isDarkMode ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/30' : 'bg-indigo-50 text-indigo-700 border-indigo-200'
                        }`}>
                          {vend.vendorType}
                        </span>
                        {vend.vendorType === 'Subcontractor / Job Worker' && vend.processType && (
                          <div className="text-[11px] text-amber-600 dark:text-amber-400 font-mono font-semibold mt-1">
                            {vend.processType} ({vend.turnaroundTimeDays || 3}d TAT)
                          </div>
                        )}
                      </td>
                      <td className="py-4 px-5 font-mono">
                        <div className="text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1">
                          <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                          <span>PAN: {vend.pan}</span>
                        </div>
                        <div className={`text-[11px] mt-0.5 ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>GST: {vend.gstin || 'N/A'}</div>
                      </td>
                      <td className="py-4 px-5 font-mono">
                        <div className={`flex items-center gap-1.5 font-semibold ${isDarkMode ? 'text-slate-200' : 'text-slate-900'}`}>
                          <span>{unmaskedBankVendorCode === vend.code ? vend.bankAccountNumber : maskBankAccount(vend.bankAccountNumber)}</span>
                          <button
                            type="button"
                            onClick={() => setUnmaskedBankVendorCode(unmaskedBankVendorCode === vend.code ? null : vend.code)}
                            className="text-slate-400 hover:text-slate-600 dark:hover:text-white p-0.5 cursor-pointer"
                            title="Toggle account mask"
                          >
                            {unmaskedBankVendorCode === vend.code ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                        <div className={`text-[10px] mt-0.5 ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>IFSC: {vend.ifsc} • {vend.bankAccountName}</div>
                      </td>
                      <td className="py-4 px-5">
                        <div className={`font-semibold ${isDarkMode ? 'text-slate-200' : 'text-slate-900'}`}>{vend.contactPerson}</div>
                        <div className={`text-[11px] font-mono flex items-center gap-1.5 mt-1 ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                          <Phone className="w-3 h-3 text-indigo-500" />
                          <span>+91 {vend.mobile}</span>
                        </div>
                      </td>
                      <td className="py-4 px-5">
                        <div className={`font-semibold ${isDarkMode ? 'text-slate-200' : 'text-slate-900'}`}>{vend.city}</div>
                        <div className={`text-[11px] ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>{vend.state}</div>
                      </td>
                      <td className="py-4 px-5 font-mono">
                        <div className={`font-bold ${isDarkMode ? 'text-slate-200' : 'text-slate-900'}`}>{vend.paymentTerms}</div>
                        {vend.creditDays ? <div className={`text-[10px] ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>{vend.creditDays} Days</div> : null}
                      </td>
                      <td className="py-4 px-5 text-center">
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-mono font-bold uppercase border ${
                          vend.status === 'Active'
                            ? isDarkMode ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : isDarkMode ? 'bg-rose-500/10 text-rose-400 border-rose-500/30' : 'bg-rose-50 text-rose-700 border-rose-200'
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${vend.status === 'Active' ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                          <span>{vend.status}</span>
                        </span>
                      </td>
                      <td className="py-4 px-5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => openEditVendor(vend)}
                            className={`px-2.5 py-1 rounded-lg border text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer ${
                              isDarkMode 
                                ? 'bg-slate-800 hover:bg-slate-700 text-indigo-400 border-slate-700 hover:border-indigo-500/50' 
                                : 'bg-white hover:bg-indigo-50 text-indigo-600 border-slate-200 hover:border-indigo-300 shadow-xs'
                            }`}
                            title="Edit Vendor"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                            <span>Edit</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeletePrompt('VENDOR', vend.code, vend.name)}
                            className={`px-2.5 py-1 rounded-lg border text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer ${
                              isDarkMode 
                                ? 'bg-slate-800 hover:bg-rose-950/40 text-rose-400 border-slate-700 hover:border-rose-500/50' 
                                : 'bg-white hover:bg-rose-50 text-rose-600 border-slate-200 hover:border-rose-300 shadow-xs'
                            }`}
                            title="Delete Vendor"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Delete</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. ITEM CATALOG TAB */}
      {/* ========================================================================= */}
      {activeTab === 'ITEMS' && (
        <div className={`rounded-3xl border overflow-hidden transition-all shadow-xl ${
          isDarkMode ? 'bg-slate-900/80 border-slate-800/80 backdrop-blur-xl' : 'bg-white border-slate-200 shadow-sm'
        }`}>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className={`border-b font-mono font-bold uppercase tracking-wider text-[11px] ${
                  isDarkMode ? 'bg-slate-800/80 border-slate-700/80 text-slate-300' : 'bg-slate-100/90 border-slate-200 text-slate-700'
                }`}>
                  <th className="py-4 px-5">Item Code</th>
                  <th className="py-4 px-5">Item Name / Part Description</th>
                  <th className="py-4 px-5">Type & Category</th>
                  <th className="py-4 px-5">HSN & GST%</th>
                  <th className="py-4 px-5">UOM</th>
                  <th className="py-4 px-5">Standard Cost / Selling Price</th>
                  <th className="py-4 px-5">Reorder / Stock Thresholds</th>
                  <th className="py-4 px-5">Preferred Vendor / Store</th>
                  <th className="py-4 px-5 text-center">Status</th>
                  <th className="py-4 px-5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className={`divide-y ${isDarkMode ? 'divide-slate-800/60' : 'divide-slate-200/70'}`}>
                {filteredItems.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="py-14 text-center">
                      <Package className="w-9 h-9 mx-auto mb-2 opacity-40 text-slate-400" />
                      <p className={`text-sm font-semibold ${isDarkMode ? 'text-slate-300' : 'text-slate-800'}`}>No item catalog records found.</p>
                      <p className={`text-xs mt-1 ${isDarkMode ? 'text-slate-500' : 'text-slate-500'}`}>Click "New Item" to register raw material or finished goods.</p>
                    </td>
                  </tr>
                ) : (
                  filteredItems.map((item) => (
                    <tr 
                      key={item.code}
                      className={`transition-colors ${
                        item.status === 'Inactive'
                          ? isDarkMode ? 'bg-slate-950/40 text-slate-500' : 'bg-slate-100/60 text-slate-400'
                          : isDarkMode ? 'hover:bg-slate-800/40 text-slate-200' : 'hover:bg-slate-50 text-slate-900'
                      }`}
                    >
                      <td className="py-4 px-5 font-mono font-bold text-emerald-600 dark:text-emerald-400">{item.code}</td>
                      <td className="py-4 px-5">
                        <div className={`font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{item.name || item.description}</div>
                        {item.partNo && <div className={`text-[11px] font-mono mt-1 ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>Part: {item.partNo}</div>}
                      </td>
                      <td className="py-4 px-5">
                        <span className={`px-2.5 py-1 rounded-xl text-[10px] font-mono font-bold uppercase border ${
                          item.itemType === 'Finished Good' || item.isFinishedGoods
                            ? isDarkMode ? 'bg-purple-500/10 text-purple-400 border-purple-500/30' : 'bg-purple-50 text-purple-700 border-purple-200'
                            : item.itemType === 'Raw Material'
                            ? isDarkMode ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : isDarkMode ? 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30' : 'bg-cyan-50 text-cyan-700 border-cyan-200'
                        }`}>
                          {item.itemType || (item.isFinishedGoods ? 'Finished Good' : 'Raw Material')}
                        </span>
                        {item.category && <div className={`text-[10px] mt-1 ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>{item.category}</div>}
                      </td>
                      <td className="py-4 px-5 font-mono">
                        <div className={`font-bold ${isDarkMode ? 'text-slate-200' : 'text-slate-900'}`}>HSN: {item.hsnCode}</div>
                        <div className="text-[11px] text-blue-600 dark:text-blue-400 font-bold mt-0.5">GST {item.gstRate ?? 18}%</div>
                      </td>
                      <td className="py-4 px-5 font-mono font-bold text-slate-800 dark:text-slate-200">
                        {item.unit}
                      </td>
                      <td className="py-4 px-5 font-mono">
                        {item.itemType === 'Finished Good' || item.isFinishedGoods ? (
                          <div className="text-purple-600 dark:text-purple-400 font-bold">₹{item.sellingPrice || item.saleRate || 0} <span className="text-[10px] opacity-80">(Selling)</span></div>
                        ) : (
                          <div className="text-emerald-600 dark:text-emerald-400 font-bold">₹{item.standardCost || item.purchaseRate || 0} <span className="text-[10px] opacity-80">(Std Cost)</span></div>
                        )}
                      </td>
                      <td className="py-4 px-5 font-mono">
                        <div className="text-amber-600 dark:text-amber-400 font-bold">Reorder: {item.reorderLevel} {item.unit}</div>
                        <div className={`text-[10px] mt-0.5 ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>Min: {item.minStock || 0} • Max: {item.maxStock || 0}</div>
                      </td>
                      <td className="py-4 px-5">
                        <div className={`font-medium ${isDarkMode ? 'text-slate-200' : 'text-slate-900'}`}>{item.preferredVendor || '—'}</div>
                        <div className={`text-[10px] font-mono mt-0.5 ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>{item.defaultWarehouse || item.storeLocation}</div>
                      </td>
                      <td className="py-4 px-5 text-center">
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-mono font-bold uppercase border ${
                          (item.status || 'Active') === 'Active'
                            ? isDarkMode ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : isDarkMode ? 'bg-rose-500/10 text-rose-400 border-rose-500/30' : 'bg-rose-50 text-rose-700 border-rose-200'
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${(item.status || 'Active') === 'Active' ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                          <span>{item.status || 'Active'}</span>
                        </span>
                      </td>
                      <td className="py-4 px-5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => openEditItem(item)}
                            className={`px-2.5 py-1 rounded-lg border text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer ${
                              isDarkMode 
                                ? 'bg-slate-800 hover:bg-slate-700 text-emerald-400 border-slate-700 hover:border-emerald-500/50' 
                                : 'bg-white hover:bg-emerald-50 text-emerald-600 border-slate-200 hover:border-emerald-300 shadow-xs'
                            }`}
                            title="Edit Item"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                            <span>Edit</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeletePrompt('ITEM', item.code, item.name || item.description || item.code)}
                            className={`px-2.5 py-1 rounded-lg border text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer ${
                              isDarkMode 
                                ? 'bg-slate-800 hover:bg-rose-950/40 text-rose-400 border-slate-700 hover:border-rose-500/50' 
                                : 'bg-white hover:bg-rose-50 text-rose-600 border-slate-200 hover:border-rose-300 shadow-xs'
                            }`}
                            title="Delete Item"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Delete</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 4. MACHINE FLEET TAB */}
      {/* ========================================================================= */}
      {activeTab === 'MACHINES' && (
        <div className={`rounded-3xl border overflow-hidden transition-all shadow-xl ${
          isDarkMode ? 'bg-slate-900/80 border-slate-800/80 backdrop-blur-xl' : 'bg-white border-slate-200 shadow-sm'
        }`}>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className={`border-b font-mono font-bold uppercase tracking-wider text-[11px] ${
                  isDarkMode ? 'bg-slate-800/80 border-slate-700/80 text-slate-300' : 'bg-slate-100/90 border-slate-200 text-slate-700'
                }`}>
                  <th className="py-4 px-5">Machine ID</th>
                  <th className="py-4 px-5">Machine Name (Job Card Ref)</th>
                  <th className="py-4 px-5">Machine Type</th>
                  <th className="py-4 px-5">Department & Location</th>
                  <th className="py-4 px-5">Capacity & Shift</th>
                  <th className="py-4 px-5">Operating Hours / Day</th>
                  <th className="py-4 px-5">Hourly Cost (₹)</th>
                  <th className="py-4 px-5">Responsible Person</th>
                  <th className="py-4 px-5 text-center">Status</th>
                  <th className="py-4 px-5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className={`divide-y ${isDarkMode ? 'divide-slate-800/60' : 'divide-slate-200/70'}`}>
                {filteredMachines.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="py-14 text-center">
                      <Wrench className="w-9 h-9 mx-auto mb-2 opacity-40 text-slate-400" />
                      <p className={`text-sm font-semibold ${isDarkMode ? 'text-slate-300' : 'text-slate-800'}`}>No machine records found.</p>
                      <p className={`text-xs mt-1 ${isDarkMode ? 'text-slate-500' : 'text-slate-500'}`}>Click "New Machine" to register production assets.</p>
                    </td>
                  </tr>
                ) : (
                  filteredMachines.map((mch) => (
                    <tr 
                      key={mch.code}
                      className={`transition-colors ${
                        mch.status === 'Under Maintenance' || mch.status === 'Decommissioned'
                          ? isDarkMode ? 'bg-amber-950/20 text-slate-300' : 'bg-amber-50/70 text-slate-900'
                          : isDarkMode ? 'hover:bg-slate-800/40 text-slate-200' : 'hover:bg-slate-50 text-slate-900'
                      }`}
                    >
                      <td className="py-4 px-5 font-mono font-bold text-amber-600 dark:text-amber-400">{mch.code}</td>
                      <td className={`py-4 px-5 font-bold font-mono text-sm ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                        {mch.name}
                      </td>
                      <td className="py-4 px-5">
                        <span className={`px-2.5 py-1 rounded-xl text-[10px] font-mono font-bold uppercase border ${
                          isDarkMode ? 'bg-amber-500/10 text-amber-400 border-amber-500/30' : 'bg-amber-50 text-amber-800 border-amber-200'
                        }`}>
                          {mch.type}
                        </span>
                      </td>
                      <td className="py-4 px-5">
                        <div className={`font-semibold ${isDarkMode ? 'text-slate-200' : 'text-slate-900'}`}>{mch.department}</div>
                        <div className={`text-[11px] ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>{mch.location}</div>
                      </td>
                      <td className="py-4 px-5 font-mono">
                        <div className={`font-semibold ${isDarkMode ? 'text-slate-200' : 'text-slate-900'}`}>{mch.capacity ? `${mch.capacity} ${mch.capacityUom}` : 'Standard Capacity'}</div>
                        <div className={`text-[10px] mt-0.5 ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>{mch.shift || 'General-Day'}</div>
                      </td>
                      <td className="py-4 px-5 font-mono">
                        <span className={`font-medium ${isDarkMode ? 'text-slate-200' : 'text-slate-900'}`}>{mch.operatingHours || 16} hrs/day</span>
                      </td>
                      <td className="py-4 px-5 font-mono font-bold text-emerald-600 dark:text-emerald-400">
                        ₹{mch.hourlyCost || 500}/hr
                      </td>
                      <td className={`py-4 px-5 font-medium ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                        {mch.responsiblePerson || '—'}
                      </td>
                      <td className="py-4 px-5 text-center">
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-mono font-bold uppercase border ${
                          mch.status === 'Active'
                            ? isDarkMode ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : mch.status === 'Under Maintenance'
                            ? isDarkMode ? 'bg-amber-500/10 text-amber-400 border-amber-500/30 animate-pulse' : 'bg-amber-50 text-amber-800 border-amber-200 animate-pulse'
                            : isDarkMode ? 'bg-slate-500/10 text-slate-400 border-slate-500/30' : 'bg-slate-100 text-slate-700 border-slate-300'
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${mch.status === 'Active' ? 'bg-emerald-500' : mch.status === 'Under Maintenance' ? 'bg-amber-500' : 'bg-slate-400'}`} />
                          <span>{mch.status}</span>
                        </span>
                      </td>
                      <td className="py-4 px-5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => openEditMachine(mch)}
                            className={`px-2.5 py-1 rounded-lg border text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer ${
                              isDarkMode 
                                ? 'bg-slate-800 hover:bg-slate-700 text-amber-400 border-slate-700 hover:border-amber-500/50' 
                                : 'bg-white hover:bg-amber-50 text-amber-600 border-slate-200 hover:border-amber-300 shadow-xs'
                            }`}
                            title="Edit Machine"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                            <span>Edit</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeletePrompt('MACHINE', mch.code, mch.name)}
                            className={`px-2.5 py-1 rounded-lg border text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer ${
                              isDarkMode 
                                ? 'bg-slate-800 hover:bg-rose-950/40 text-rose-400 border-slate-700 hover:border-rose-500/50' 
                                : 'bg-white hover:bg-rose-50 text-rose-600 border-slate-200 hover:border-rose-300 shadow-xs'
                            }`}
                            title="Delete Machine"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Delete</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 5. IMPORT / OMGST TAB */}
      {/* ========================================================================= */}
      {activeTab === 'IMPORT_OMGST' && (
        <div className={`p-8 rounded-3xl border transition-all ${
          isDarkMode ? 'bg-slate-900/60 border-slate-800/80 text-white backdrop-blur-xl' : 'bg-white border-slate-200 shadow-sm text-slate-900'
        }`}>
          <div className="max-w-2xl mx-auto text-center space-y-4">
            <div className="w-16 h-16 rounded-3xl bg-[#5B75F8]/20 border border-[#5B75F8]/40 flex items-center justify-center mx-auto text-[#7B92FF]">
              <Upload className="w-8 h-8" />
            </div>
            <h2 className="text-xl font-bold">Import Legacy GST / OMGST Master Spreadsheets</h2>
            <p className="text-xs text-slate-400 leading-relaxed">
              Upload standard Indian GST sales registers, purchase bills, or inventory item CSV/Excel spreadsheets. The engine will automatically validate 15-char GSTINs, 10-char PANs, 10-digit mobile numbers, and generate sequential master codes.
            </p>
            
<div className="p-6 border-2 border-dashed border-slate-700/80 rounded-2xl bg-slate-800/30 hover:border-[#5B75F8] transition-all cursor-pointer">
              <FileSpreadsheet className="w-10 h-10 mx-auto text-slate-400 mb-2" />
              <div className="text-xs font-semibold text-slate-200">Drag & Drop master files here or click to browse</div>
              <div className="text-[10px] text-slate-500 font-mono mt-1">Supports CSV, XLSX up to 25MB (Customers, Vendors, Items, Machines)</div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 1: ADD / EDIT CUSTOMER (LIGHT & DARK THEME POLISHED) */}
      {/* ========================================================================= */}
      <Modal
        isOpen={showAddCustomerModal}
        onClose={() => {
          setShowAddCustomerModal(false);
          setEditingCustomer(null);
        }}
        maxWidth="4xl"
        isDarkMode={isDarkMode}
        icon={<Building className="w-5 h-5" />}
        title={editingCustomer ? "Edit Customer Master" : "New Customer Master"}
        subtitle={editingCustomer ? `Edit Master: ${cCode} • Indian GSTIN & Credit Terms` : `Auto ID: ${cCode} • Indian GSTIN & Credit Terms Engine`}
        footer={
          <div className="flex items-center justify-end gap-3 w-full">
            <button
              type="button"
              onClick={() => {
                setShowAddCustomerModal(false);
                setEditingCustomer(null);
              }}
              className={`px-4 py-2.5 rounded-xl font-bold transition-all cursor-pointer ${
                isDarkMode 
                  ? 'text-slate-400 hover:text-white hover:bg-slate-800' 
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              Cancel
            </button>
            <button
              type="submit"
              form="save-customer-form"
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#5B75F8] to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-blue-500/25 hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer"
            >
              <Check className="w-4 h-4" />
              <span>{editingCustomer ? 'Update Customer Master' : 'Save Customer Master'}</span>
            </button>
          </div>
        }
      >
        <form id="save-customer-form" onSubmit={handleSaveCustomer} className="space-y-4 text-xs">
          
          {/* Row 1: Code, Customer Name, Legal Name */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className={`block text-[11px] font-mono font-semibold mb-1 ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                {editingCustomer ? 'Customer ID' : 'Customer ID (Auto)'}
              </label>
              <input
                type="text"
                value={cCode}
                readOnly
                className={`w-full p-2.5 rounded-xl border font-mono font-bold ${
                  isDarkMode ? 'bg-slate-800/80 border-slate-700 text-blue-400' : 'bg-slate-100 border-slate-200 text-blue-600'
                }`}
              />
            </div>
            <div>
              <label className={`block text-[11px] font-mono font-semibold mb-1 ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                Customer Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Tata Motors Ltd"
                value={cName}
                onChange={(e) => setCName(e.target.value)}
                className={`w-full p-2.5 rounded-xl border transition-all ${
                  formErrors.name 
                    ? 'border-rose-500 ring-1 ring-rose-500' 
                    : isDarkMode ? 'bg-slate-800 border-slate-700 text-white placeholder:text-slate-500' : 'bg-slate-50 border-slate-300 text-slate-900 placeholder:text-slate-400 focus:bg-white'
                }`}
              />
              {formErrors.name && <p className="text-[10px] text-rose-500 font-medium mt-0.5">{formErrors.name}</p>}
            </div>
            <div>
              <label className={`block text-[11px] font-mono font-semibold mb-1 ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                Legal Name
              </label>
              <input
                type="text"
                placeholder="Registered business name"
                value={cLegalName}
                onChange={(e) => setCLegalName(e.target.value)}
                className={`w-full p-2.5 rounded-xl border ${
                  isDarkMode ? 'bg-slate-800 border-slate-700 text-white placeholder:text-slate-500' : 'bg-slate-50 border-slate-300 text-slate-900 placeholder:text-slate-400 focus:bg-white'
                }`}
              />
            </div>
          </div>

          {/* Row 2: Customer Type, Contact Person, Mobile, Email */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div>
              <label className={`block text-[11px] font-mono font-semibold mb-1 ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                Customer Type <span className="text-rose-500">*</span>
              </label>
              <select
                value={cCustomerType}
                onChange={(e) => setCCustomerType(e.target.value)}
                className={`w-full p-2.5 rounded-xl border font-bold ${
                  isDarkMode ? 'bg-slate-800 border-slate-700 text-blue-300' : 'bg-slate-50 border-slate-300 text-blue-700 focus:bg-white'
                }`}
              >
                {CUSTOMER_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className={`block text-[11px] font-mono font-semibold mb-1 ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                Contact Person <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="Key accounts manager"
                value={cContactPerson}
                onChange={(e) => setCContactPerson(e.target.value)}
                className={`w-full p-2.5 rounded-xl border ${
                  formErrors.contactPerson 
                    ? 'border-rose-500 ring-1 ring-rose-500' 
                    : isDarkMode ? 'bg-slate-800 border-slate-700 text-white placeholder:text-slate-500' : 'bg-slate-50 border-slate-300 text-slate-900 placeholder:text-slate-400 focus:bg-white'
                }`}
              />
              {formErrors.contactPerson && <p className="text-[10px] text-rose-500 font-medium mt-0.5">{formErrors.contactPerson}</p>}
            </div>
            <div>
              <label className={`block text-[11px] font-mono font-semibold mb-1 ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                Mobile (10 Digits) <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-xs text-slate-400 font-mono font-bold">+91</span>
                <input
                  type="text"
                  required
                  maxLength={10}
                  placeholder="9876543210"
                  value={cMobile}
                  onChange={(e) => setCMobile(e.target.value.replace(/\D/g, ''))}
                  className={`w-full pl-11 pr-3 py-2.5 rounded-xl border font-mono ${
                    formErrors.mobile 
                      ? 'border-rose-500 ring-1 ring-rose-500' 
                      : isDarkMode ? 'bg-slate-800 border-slate-700 text-white placeholder:text-slate-500' : 'bg-slate-50 border-slate-300 text-slate-900 placeholder:text-slate-400 focus:bg-white'
                  }`}
                />
              </div>
              {formErrors.mobile && <p className="text-[10px] text-rose-500 font-medium mt-0.5">{formErrors.mobile}</p>}
            </div>
            <div>
              <label className={`block text-[11px] font-mono font-semibold mb-1 ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                Email Address
              </label>
              <input
                type="email"
                placeholder="accounts@client.com"
                value={cEmail}
                onChange={(e) => setCEmail(e.target.value)}
                className={`w-full p-2.5 rounded-xl border ${
                  isDarkMode ? 'bg-slate-800 border-slate-700 text-white placeholder:text-slate-500' : 'bg-slate-50 border-slate-300 text-slate-900 placeholder:text-slate-400 focus:bg-white'
                }`}
              />
            </div>
          </div>

          {/* Row 3: Statutory GSTIN & PAN */}
          <div className={`p-3.5 rounded-2xl border space-y-3 ${isDarkMode ? 'bg-slate-800/40 border-slate-700/80' : 'bg-slate-50 border-slate-200'}`}>
            <div className="flex items-center justify-between">
              <span className={`text-[11px] font-mono font-bold flex items-center gap-1.5 ${isDarkMode ? 'text-blue-400' : 'text-blue-700'}`}>
                <ShieldCheck className="w-4 h-4" />
                <span>Statutory GSTIN & PAN Compliance Engine</span>
              </span>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={cGstExempt}
                  onChange={(e) => {
                    setCGstExempt(e.target.checked);
                    if (e.target.checked) setCGstin('');
                  }}
                  className="rounded border-slate-600 text-[#5B75F8] focus:ring-[#5B75F8]"
                />
                <span className={`text-[11px] font-mono font-bold ${cGstExempt ? 'text-amber-500' : isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                  GST-Exempt (N/A — GST-exempt)
                </span>
              </label>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className={`block text-[11px] font-mono font-semibold mb-1 ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                  GSTIN (15 Chars) {!cGstExempt && <span className="text-rose-500">*</span>}
                </label>
                <input
                  type="text"
                  maxLength={15}
                  disabled={cGstExempt}
                  placeholder={cGstExempt ? "N/A — GST-exempt" : "27AABCL1234M1ZP"}
                  value={cGstExempt ? "N/A — GST-exempt" : cGstin}
                  onChange={(e) => {
                    const val = e.target.value.toUpperCase();
                    setCGstin(val);
                    if (val.length >= 12 && !cPan) {
                      setCPan(val.slice(2, 12));
                    }
                  }}
                  className={`w-full p-2.5 rounded-xl border font-mono uppercase font-bold tracking-wider ${
                    cGstExempt 
                      ? isDarkMode ? 'bg-slate-800/40 text-amber-400 border-slate-700' : 'bg-amber-50 text-amber-700 border-amber-200'
                      : formErrors.gstin 
                        ? 'border-rose-500 ring-1 ring-rose-500' 
                        : isDarkMode ? 'bg-slate-800 border-slate-700 text-white placeholder:text-slate-500' : 'bg-white border-slate-300 text-slate-900 placeholder:text-slate-400'
                  }`}
                />
                {formErrors.gstin && <p className="text-[10px] text-rose-500 font-medium mt-0.5">{formErrors.gstin}</p>}
              </div>

              <div>
                <label className={`block text-[11px] font-mono font-semibold mb-1 ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                  PAN (Auto from GSTIN or 10 Chars)
                </label>
                <input
                  type="text"
                  maxLength={10}
                  placeholder="AABCL1234M"
                  value={cPan}
                  onChange={(e) => setCPan(e.target.value.toUpperCase())}
                  className={`w-full p-2.5 rounded-xl border font-mono uppercase font-bold tracking-wider ${
                    formErrors.pan 
                      ? 'border-rose-500 ring-1 ring-rose-500' 
                      : isDarkMode ? 'bg-slate-800 border-slate-700 text-white placeholder:text-slate-500' : 'bg-white border-slate-300 text-slate-900 placeholder:text-slate-400'
                  }`}
                />
                {formErrors.pan && <p className="text-[10px] text-rose-500 font-medium mt-0.5">{formErrors.pan}</p>}
              </div>
            </div>
          </div>

          {/* Row 4: Billing Address, Shipping Address */}
          <div className="space-y-3">
            <div>
              <label className={`block text-[11px] font-mono font-semibold mb-1 ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                Billing Address <span className="text-rose-500">*</span>
              </label>
              <textarea
                rows={2}
                required
                placeholder="Plot No., Industrial Area, Street Address"
                value={cBillingAddress}
                onChange={(e) => setCBillingAddress(e.target.value)}
                className={`w-full p-2.5 rounded-xl border ${
                  formErrors.billingAddress 
                    ? 'border-rose-500 ring-1 ring-rose-500' 
                    : isDarkMode ? 'bg-slate-800 border-slate-700 text-white placeholder:text-slate-500' : 'bg-slate-50 border-slate-300 text-slate-900 placeholder:text-slate-400 focus:bg-white'
                }`}
              />
              {formErrors.billingAddress && <p className="text-[10px] text-rose-500 font-medium mt-0.5">{formErrors.billingAddress}</p>}
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="c-same-address"
                checked={cSameAddress}
                onChange={(e) => setCSameAddress(e.target.checked)}
                className="rounded border-slate-600 text-[#5B75F8] focus:ring-[#5B75F8]"
              />
              <label htmlFor="c-same-address" className={`text-xs font-semibold cursor-pointer ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                Shipping Address same as Billing Address
              </label>
            </div>

            {!cSameAddress && (
              <div>
                <label className={`block text-[11px] font-mono font-semibold mb-1 ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                  Shipping / Delivery Plant Address
                </label>
                <textarea
                  rows={2}
                  placeholder="Factory gate / receiving plant address"
                  value={cShippingAddress}
                  onChange={(e) => setCShippingAddress(e.target.value)}
                  className={`w-full p-2.5 rounded-xl border ${
                    isDarkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900 focus:bg-white'
                  }`}
                />
              </div>
            )}
          </div>

          {/* Row 5: City, State, Pincode */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className={`block text-[11px] font-mono font-semibold mb-1 ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                City <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Pune"
                value={cCity}
                onChange={(e) => setCCity(e.target.value)}
                className={`w-full p-2.5 rounded-xl border ${
                  formErrors.city 
                    ? 'border-rose-500 ring-1 ring-rose-500' 
                    : isDarkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900 focus:bg-white'
                }`}
              />
              {formErrors.city && <p className="text-[10px] text-rose-500 font-medium mt-0.5">{formErrors.city}</p>}
            </div>
            <div>
              <label className={`block text-[11px] font-mono font-semibold mb-1 ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                State <span className="text-rose-500">*</span>
              </label>
              <select
                value={cState}
                onChange={(e) => setCState(e.target.value)}
                className={`w-full p-2.5 rounded-xl border font-semibold ${
                  formErrors.state 
                    ? 'border-rose-500 ring-1 ring-rose-500' 
                    : isDarkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900 focus:bg-white'
                }`}
              >
                {INDIAN_STATES.map(s => (
                  <option key={s.name} value={s.name}>{s.code} — {s.name}</option>
                ))}
              </select>
              {formErrors.state && <p className="text-[10px] text-rose-500 font-medium mt-0.5">{formErrors.state}</p>}
            </div>
            <div>
              <label className={`block text-[11px] font-mono font-semibold mb-1 ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                Pincode (6 Digits)
              </label>
              <input
                type="text"
                maxLength={6}
                placeholder="411018"
                value={cPincode}
                onChange={(e) => setCPincode(e.target.value.replace(/\D/g, ''))}
                className={`w-full p-2.5 rounded-xl border font-mono ${
                  formErrors.pincode 
                    ? 'border-rose-500 ring-1 ring-rose-500' 
                    : isDarkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900 focus:bg-white'
                }`}
              />
              {formErrors.pincode && <p className="text-[10px] text-rose-500 font-medium mt-0.5">{formErrors.pincode}</p>}
            </div>
          </div>

          {/* Row 6: Payment Terms, Credit Days, Credit Limit */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className={`block text-[11px] font-mono font-semibold mb-1 ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                Payment Terms
              </label>
              <select
                value={cPaymentTerms}
                onChange={(e) => {
                  const val = e.target.value;
                  setCPaymentTerms(val);
                  if (val === 'Net 30') setCCreditDays(30);
                  else if (val === 'Net 45') setCCreditDays(45);
                  else if (val === 'Net 60') setCCreditDays(60);
                  else if (val === 'Net 90') setCCreditDays(90);
                  else if (val === '100% Advance' || val === 'Against Delivery (CAD)') setCCreditDays(0);
                }}
                className={`w-full p-2.5 rounded-xl border font-bold ${
                  isDarkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'
                }`}
              >
                {PAYMENT_TERMS.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className={`block text-[11px] font-mono font-semibold mb-1 ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                Credit Days
              </label>
              <input
                type="number"
                value={cCreditDays}
                onChange={(e) => setCCreditDays(Number(e.target.value))}
                className={`w-full p-2.5 rounded-xl border font-mono ${
                  isDarkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'
                }`}
              />
            </div>
            <div>
              <label className={`block text-[11px] font-mono font-semibold mb-1 ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                Credit Limit (₹)
              </label>
              <input
                type="number"
                value={cCreditLimit}
                onChange={(e) => setCCreditLimit(Number(e.target.value))}
                className={`w-full p-2.5 rounded-xl border font-mono ${
                  isDarkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'
                }`}
              />
            </div>
          </div>

          {/* Row 7: Salesperson, Status, Notes */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className={`block text-[11px] font-mono font-semibold mb-1 ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                Assigned Salesperson
              </label>
              <select
                value={cSalesperson}
                onChange={(e) => setCSalesperson(e.target.value)}
                className={`w-full p-2.5 rounded-xl border ${
                  isDarkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900 focus:bg-white'
                }`}
              >
                <option value="">-- Unassigned --</option>
                {users.map(u => (
                  <option key={u.id} value={u.name}>{u.name} ({u.role})</option>
                ))}
              </select>
            </div>
            <div>
              <label className={`block text-[11px] font-mono font-semibold mb-1 ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                Status <span className="text-rose-500">*</span>
              </label>
              <select
                value={cStatus}
                onChange={(e) => setCStatus(e.target.value as any)}
                className={`w-full p-2.5 rounded-xl border ${
                  isDarkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900 focus:bg-white'
                }`}
              >
                <option value="Active">Active (Available for Orders)</option>
                <option value="Inactive">Inactive (Hidden from New Orders)</option>
              </select>
            </div>
            <div>
              <label className={`block text-[11px] font-mono font-semibold mb-1 ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                Notes / Exemption Reason {cGstExempt && <span className="text-rose-500">*</span>}
              </label>
              <input
                type="text"
                placeholder={cGstExempt ? "Mandatory GST exemption reason" : "Remarks / dispatch preferences"}
                value={cNotes}
                onChange={(e) => setCNotes(e.target.value)}
                className={`w-full p-2.5 rounded-xl border ${
                  formErrors.notes 
                    ? 'border-rose-500 ring-1 ring-rose-500' 
                    : isDarkMode ? 'bg-slate-800 border-slate-700 text-white placeholder:text-slate-500' : 'bg-slate-50 border-slate-300 text-slate-900 placeholder:text-slate-400 focus:bg-white'
                }`}
              />
              {formErrors.notes && <p className="text-[10px] text-rose-500 font-medium mt-0.5">{formErrors.notes}</p>}
            </div>
          </div>

        </form>
      </Modal>

      {/* ========================================================================= */}
      {/* MODAL 2: ADD / EDIT VENDOR (LIGHT & DARK THEME POLISHED) */}
      {/* ========================================================================= */}
      <Modal
        isOpen={showAddVendorModal}
        onClose={() => {
          setShowAddVendorModal(false);
          setEditingVendor(null);
        }}
        maxWidth="4xl"
        isDarkMode={isDarkMode}
        icon={<Users className="w-5 h-5" />}
        title={editingVendor ? "Edit Vendor Master" : "New Vendor Master"}
        subtitle={editingVendor ? `Edit Master: ${vCode} • Mandatory TDS PAN, Bank Encryption & Subcontractor Rules` : `Auto ID: ${vCode} • Mandatory TDS PAN, Bank Encryption & Subcontractor Rules`}
        footer={
          <div className="flex items-center justify-end gap-3 w-full">
            <button
              type="button"
              onClick={() => {
                setShowAddVendorModal(false);
                setEditingVendor(null);
              }}
              className={`px-4 py-2.5 rounded-xl font-bold transition-all cursor-pointer ${
                isDarkMode 
                  ? 'text-slate-400 hover:text-white hover:bg-slate-800' 
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              Cancel
            </button>
            <button
              type="submit"
              form="save-vendor-form"
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#5B75F8] to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-indigo-500/25 hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer"
            >
              <Check className="w-4 h-4" />
              <span>{editingVendor ? 'Update Vendor Master' : 'Save Vendor Master'}</span>
            </button>
          </div>
        }
      >
        <form id="save-vendor-form" onSubmit={handleSaveVendor} className="space-y-4 text-xs">
          
          {/* Row 1: Code, Name, Legal Name */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className={`block text-[11px] font-mono font-semibold mb-1 ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                {editingVendor ? 'Vendor ID' : 'Vendor ID (Auto)'}
              </label>
              <input
                type="text"
                value={vCode}
                readOnly
                className={`w-full p-2.5 rounded-xl border font-mono font-bold ${
                  isDarkMode ? 'bg-slate-800/80 border-slate-700 text-indigo-400' : 'bg-slate-100 border-slate-200 text-indigo-600'
                }`}
              />
            </div>
            <div>
              <label className={`block text-[11px] font-mono font-semibold mb-1 ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                Vendor Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Shree Steel Suppliers"
                value={vName}
                onChange={(e) => setVName(e.target.value)}
                className={`w-full p-2.5 rounded-xl border transition-all ${
                  formErrors.name 
                    ? 'border-rose-500 ring-1 ring-rose-500' 
                    : isDarkMode ? 'bg-slate-800 border-slate-700 text-white placeholder:text-slate-500' : 'bg-slate-50 border-slate-300 text-slate-900 placeholder:text-slate-400 focus:bg-white'
                }`}
              />
              {formErrors.name && <p className="text-[10px] text-rose-500 font-medium mt-0.5">{formErrors.name}</p>}
            </div>
            <div>
              <label className={`block text-[11px] font-mono font-semibold mb-1 ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                Legal Name
              </label>
              <input
                type="text"
                placeholder="Registered legal name"
                value={vLegalName}
                onChange={(e) => setVLegalName(e.target.value)}
                className={`w-full p-2.5 rounded-xl border ${
                  isDarkMode ? 'bg-slate-800 border-slate-700 text-white placeholder:text-slate-500' : 'bg-slate-50 border-slate-300 text-slate-900 placeholder:text-slate-400 focus:bg-white'
                }`}
              />
            </div>
          </div>

          {/* Row 2: Vendor Type, Vendor Category, Contact Person, Mobile */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div>
              <label className={`block text-[11px] font-mono font-semibold mb-1 ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                Vendor Type <span className="text-rose-500">*</span>
              </label>
              <select
                value={vVendorType}
                onChange={(e) => setVVendorType(e.target.value)}
                className={`w-full p-2.5 rounded-xl border font-bold ${
                  isDarkMode ? 'bg-slate-800 border-slate-700 text-indigo-300' : 'bg-slate-50 border-slate-300 text-indigo-700 focus:bg-white'
                }`}
              >
                {VENDOR_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className={`block text-[11px] font-mono font-semibold mb-1 ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                Category <span className="text-rose-500">*</span>
              </label>
              <select
                value={vVendorCategory}
                onChange={(e) => setVVendorCategory(e.target.value)}
                className={`w-full p-2.5 rounded-xl border ${
                  isDarkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900 focus:bg-white'
                }`}
              >
                {VENDOR_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className={`block text-[11px] font-mono font-semibold mb-1 ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                Contact Person <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Mahesh Shetty"
                value={vContactPerson}
                onChange={(e) => setVContactPerson(e.target.value)}
                className={`w-full p-2.5 rounded-xl border ${
                  formErrors.contactPerson 
                    ? 'border-rose-500 ring-1 ring-rose-500' 
                    : isDarkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900 focus:bg-white'
                }`}
              />
              {formErrors.contactPerson && <p className="text-[10px] text-rose-500 font-medium mt-0.5">{formErrors.contactPerson}</p>}
            </div>
            <div>
              <label className={`block text-[11px] font-mono font-semibold mb-1 ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                Mobile (10-digit) <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                maxLength={10}
                placeholder="9850011111"
                value={vMobile}
                onChange={(e) => setVMobile(e.target.value.replace(/\D/g, ''))}
                className={`w-full p-2.5 rounded-xl border font-mono ${
                  formErrors.mobile 
                    ? 'border-rose-500 ring-1 ring-rose-500' 
                    : isDarkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900 focus:bg-white'
                }`}
              />
              {formErrors.mobile && <p className="text-[10px] text-rose-500 font-medium mt-0.5">{formErrors.mobile}</p>}
            </div>
          </div>

          {/* Conditional Prompt for Subcontractor / Job Worker */}
          {vVendorType === 'Subcontractor / Job Worker' && (
            <div className={`p-3.5 rounded-2xl border space-y-2 ${
              isDarkMode ? 'bg-amber-500/10 border-amber-500/30 text-amber-300' : 'bg-amber-50 border-amber-200 text-amber-800'
            }`}>
              <div className="flex items-center gap-2 font-mono font-bold text-[11px]">
                <AlertTriangle className="w-4 h-4 text-amber-500" />
                <span>Subcontractor / Job-Work Gate-In/Out Profile</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className={`block text-[10px] font-mono font-semibold mb-1 ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                    Process Type <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={vProcessType}
                    onChange={(e) => setVProcessType(e.target.value)}
                    className={`w-full p-2 rounded-xl border text-xs ${
                      isDarkMode ? 'bg-slate-900 border-amber-500/40 text-amber-200' : 'bg-white border-amber-300 text-slate-900'
                    }`}
                  >
                    {SUBCONTRACTOR_PROCESS_TYPES.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
                <div>
                  <label className={`block text-[10px] font-mono font-semibold mb-1 ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                    Expected Turnaround Time (Days) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={60}
                    value={vTurnaroundTimeDays}
                    onChange={(e) => setVTurnaroundTimeDays(Number(e.target.value))}
                    className={`w-full p-2 rounded-xl border text-xs font-mono font-bold ${
                      isDarkMode ? 'bg-slate-900 border-amber-500/40 text-amber-200' : 'bg-white border-amber-300 text-slate-900'
                    }`}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Row 3: Statutory PAN (Always mandatory) & GSTIN */}
          <div className={`grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 rounded-2xl border ${
            isDarkMode ? 'bg-slate-800/40 border-slate-700/60' : 'bg-slate-50/80 border-slate-200'
          }`}>
            <div>
              <label className={`block text-[11px] font-mono font-semibold mb-1 ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                PAN (TDS Mandated) <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                maxLength={10}
                placeholder="AAAFS1111A"
                value={vPan}
                onChange={(e) => setVPan(e.target.value.toUpperCase())}
                className={`w-full p-2.5 rounded-xl border font-mono ${
                  formErrors.pan 
                    ? 'border-rose-500 ring-1 ring-rose-500' 
                    : isDarkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'
                }`}
              />
              {formErrors.pan && <p className="text-[10px] text-rose-500 font-medium mt-0.5">{formErrors.pan}</p>}
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className={`text-[11px] font-mono font-semibold ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                  GSTIN (15-char)
                </label>
                <label className="flex items-center gap-1.5 text-[10px] text-amber-600 dark:text-amber-400 font-mono font-semibold cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={vGstExempt} 
                    onChange={(e) => setVGstExempt(e.target.checked)}
                    className="rounded text-amber-600 focus:ring-0 cursor-pointer"
                  />
                  <span>GST-exempt</span>
                </label>
              </div>
              <input
                type="text"
                disabled={vGstExempt}
                placeholder={vGstExempt ? "N/A — GST-exempt" : "27AAAFS1111A1Z1"}
                maxLength={15}
                value={vGstExempt ? GST_EXEMPT_VALUE : vGstin}
                onChange={(e) => setVGstin(e.target.value.toUpperCase())}
                className={`w-full p-2.5 rounded-xl border font-mono transition-all ${
                  vGstExempt 
                    ? isDarkMode ? 'bg-slate-800/50 text-amber-400 border-slate-700 cursor-not-allowed' : 'bg-slate-100 text-amber-700 border-slate-200 cursor-not-allowed'
                    : formErrors.gstin 
                      ? 'border-rose-500 ring-1 ring-rose-500' 
                      : isDarkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'
                }`}
              />
            </div>
          </div>

          {/* Row 4: Bank Details (Encrypted storage & UI Masking) */}
          <div className={`p-3.5 rounded-2xl border space-y-2 ${
            isDarkMode ? 'bg-indigo-500/10 border-indigo-500/30' : 'bg-indigo-50/70 border-indigo-200'
          }`}>
            <div className="flex items-center gap-2 font-mono font-bold text-[11px] text-indigo-700 dark:text-indigo-300">
              <ShieldCheck className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              <span>Encrypted Bank Account & Payout Details</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className={`block text-[10px] font-mono font-semibold mb-1 ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                  Bank Account Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Account holder name"
                  value={vBankAccountName}
                  onChange={(e) => setVBankAccountName(e.target.value)}
                  className={`w-full p-2 rounded-xl border text-xs ${
                    formErrors.bankAccountName 
                      ? 'border-rose-500 ring-1 ring-rose-500' 
                      : isDarkMode ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'
                  }`}
                />
              </div>
              <div>
                <label className={`block text-[10px] font-mono font-semibold mb-1 ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                  Bank Account Number <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Account number"
                  value={vBankAccountNumber}
                  onChange={(e) => setVBankAccountNumber(e.target.value.replace(/\s/g, ''))}
                  className={`w-full p-2 rounded-xl border text-xs font-mono ${
                    formErrors.bankAccountNumber 
                      ? 'border-rose-500 ring-1 ring-rose-500' 
                      : isDarkMode ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'
                  }`}
                />
              </div>
              <div>
                <label className={`block text-[10px] font-mono font-semibold mb-1 ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                  IFSC Code (11-char) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  maxLength={11}
                  placeholder="HDFC0001234"
                  value={vIfsc}
                  onChange={(e) => setVIfsc(e.target.value.toUpperCase())}
                  className={`w-full p-2 rounded-xl border text-xs font-mono ${
                    formErrors.ifsc 
                      ? 'border-rose-500 ring-1 ring-rose-500' 
                      : isDarkMode ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'
                  }`}
                />
              </div>
            </div>
          </div>

          {/* Row 5: Address, City, State, Pincode */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div className="sm:col-span-2">
              <label className={`block text-[11px] font-mono font-semibold mb-1 ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                Billing Address <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="Vendor factory / office address"
                value={vBillingAddress}
                onChange={(e) => setVBillingAddress(e.target.value)}
                className={`w-full p-2.5 rounded-xl border ${
                  formErrors.billingAddress 
                    ? 'border-rose-500 ring-1 ring-rose-500' 
                    : isDarkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900 focus:bg-white'
                }`}
              />
            </div>
            <div>
              <label className={`block text-[11px] font-mono font-semibold mb-1 ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                City <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Pune"
                value={vCity}
                onChange={(e) => setVCity(e.target.value)}
                className={`w-full p-2.5 rounded-xl border ${
                  formErrors.city 
                    ? 'border-rose-500 ring-1 ring-rose-500' 
                    : isDarkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900 focus:bg-white'
                }`}
              />
            </div>
            <div>
              <label className={`block text-[11px] font-mono font-semibold mb-1 ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                State <span className="text-rose-500">*</span>
              </label>
              <select
                value={vState}
                onChange={(e) => setVState(e.target.value)}
                className={`w-full p-2.5 rounded-xl border ${
                  isDarkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900 focus:bg-white'
                }`}
              >
                {INDIAN_STATES.map(s => (
                  <option key={s.code} value={s.name}>{s.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Row 6: Payment Terms, Credit Days, Status */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className={`block text-[11px] font-mono font-semibold mb-1 ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                Payment Terms
              </label>
              <select
                value={vPaymentTerms}
                onChange={(e) => setVPaymentTerms(e.target.value)}
                className={`w-full p-2.5 rounded-xl border ${
                  isDarkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900 focus:bg-white'
                }`}
              >
                {PAYMENT_TERMS.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className={`block text-[11px] font-mono font-semibold mb-1 ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                Credit Days (0-180)
              </label>
              <input
                type="number"
                min={0}
                max={180}
                value={vCreditDays}
                onChange={(e) => setVCreditDays(Number(e.target.value))}
                className={`w-full p-2.5 rounded-xl border font-mono ${
                  isDarkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900 focus:bg-white'
                }`}
              />
            </div>
            <div>
              <label className={`block text-[11px] font-mono font-semibold mb-1 ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                Status <span className="text-rose-500">*</span>
              </label>
              <select
                value={vStatus}
                onChange={(e) => setVStatus(e.target.value as any)}
                className={`w-full p-2.5 rounded-xl border ${
                  isDarkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900 focus:bg-white'
                }`}
              >
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </select>
            </div>
          </div>

        </form>
      </Modal>

      {/* ========================================================================= */}
      {/* MODAL 3: ADD / EDIT ITEM (LIGHT & DARK THEME POLISHED) */}
      {/* ========================================================================= */}
      <Modal
        isOpen={showAddItemModal}
        onClose={() => {
          setShowAddItemModal(false);
          setEditingItem(null);
        }}
        maxWidth="4xl"
        isDarkMode={isDarkMode}
        icon={<Package className="w-5 h-5" />}
        title={editingItem ? "Edit Item Master" : "New Item Master"}
        subtitle={editingItem ? `Edit Master: ${iCode} • Dynamic Cost / Price & Vendor Requirements` : `Auto ID: ${iCode} • Dynamic Cost / Price & Vendor Requirements`}
        footer={
          <div className="flex items-center justify-end gap-3 w-full">
            <button
              type="button"
              onClick={() => {
                setShowAddItemModal(false);
                setEditingItem(null);
              }}
              className={`px-4 py-2.5 rounded-xl font-bold transition-all cursor-pointer ${
                isDarkMode 
                  ? 'text-slate-400 hover:text-white hover:bg-slate-800' 
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              Cancel
            </button>
            <button
              type="submit"
              form="save-item-form"
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#5B75F8] to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-emerald-500/25 hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer"
            >
              <Check className="w-4 h-4" />
              <span>{editingItem ? 'Update Item Master' : 'Save Item Master'}</span>
            </button>
          </div>
        }
      >
        <form id="save-item-form" onSubmit={handleSaveItem} className="space-y-4 text-xs">
          
          {/* Row 1: Item Type, Auto Code, Item Name */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className={`block text-[11px] font-mono font-semibold mb-1 ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                Item Type <span className="text-rose-500">*</span>
              </label>
              <select
                value={iItemType}
                onChange={(e) => handleItemTypeChange(e.target.value)}
                className={`w-full p-2.5 rounded-xl border font-bold ${
                  iItemType === 'Finished Good' ? isDarkMode ? 'bg-purple-500/20 text-purple-300 border-purple-500/40' : 'bg-purple-50 text-purple-700 border-purple-200' :
                  iItemType === 'Raw Material' ? isDarkMode ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' : 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                  isDarkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                }`}
              >
                {ITEM_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className={`block text-[11px] font-mono font-semibold mb-1 ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                {editingItem ? 'Item Code' : 'Item Code (Auto-Prefixed)'}
              </label>
              <input
                type="text"
                value={iCode}
                readOnly
                className={`w-full p-2.5 rounded-xl border font-mono font-bold ${
                  isDarkMode ? 'bg-slate-800/80 border-slate-700 text-emerald-400' : 'bg-slate-100 border-slate-200 text-emerald-600'
                }`}
              />
            </div>
            <div>
              <label className={`block text-[11px] font-mono font-semibold mb-1 ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                Item Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="e.g. MS Plate 20mm or Boom Bracket"
                value={iName}
                onChange={(e) => setIName(e.target.value)}
                className={`w-full p-2.5 rounded-xl border ${
                  formErrors.name 
                    ? 'border-rose-500 ring-1 ring-rose-500' 
                    : isDarkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900 focus:bg-white'
                }`}
              />
              {formErrors.name && <p className="text-[10px] text-rose-500 font-medium mt-0.5">{formErrors.name}</p>}
            </div>
          </div>

          {/* Row 2: Part No, Category, Description */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className={`block text-[11px] font-mono font-semibold mb-1 ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                Part / Drawing No
              </label>
              <input
                type="text"
                placeholder="e.g. DWG-2026-B"
                value={iPartNo}
                onChange={(e) => setIPartNo(e.target.value)}
                className={`w-full p-2.5 rounded-xl border ${
                  isDarkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900 focus:bg-white'
                }`}
              />
            </div>
            <div>
              <label className={`block text-[11px] font-mono font-semibold mb-1 ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                Category
              </label>
              <input
                type="text"
                placeholder="e.g. Structural Steel, Fasteners"
                value={iCategory}
                onChange={(e) => setICategory(e.target.value)}
                className={`w-full p-2.5 rounded-xl border ${
                  isDarkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900 focus:bg-white'
                }`}
              />
            </div>
            <div>
              <label className={`block text-[11px] font-mono font-semibold mb-1 ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                Description
              </label>
              <input
                type="text"
                placeholder="Technical grade / specifications"
                value={iDescription}
                onChange={(e) => setIDescription(e.target.value)}
                className={`w-full p-2.5 rounded-xl border ${
                  isDarkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900 focus:bg-white'
                }`}
              />
            </div>
          </div>

          {/* Row 3: UOM, HSN Code, GST Rate % */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className={`block text-[11px] font-mono font-semibold mb-1 ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                Unit of Measure (UOM) <span className="text-rose-500">*</span>
              </label>
              <select
                value={iUnit}
                onChange={(e) => setIUnit(e.target.value)}
                className={`w-full p-2.5 rounded-xl border font-bold ${
                  isDarkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900 focus:bg-white'
                }`}
              >
                {ITEM_UOMS.map(u => <option key={u} value={u}>{u}</option>)}
              </select>
            </div>
            <div>
              <label className={`block text-[11px] font-mono font-semibold mb-1 ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                HSN Code (4-8 digits) <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                maxLength={8}
                placeholder="8483"
                value={iHsnCode}
                onChange={(e) => setIHsnCode(e.target.value.replace(/\D/g, ''))}
                className={`w-full p-2.5 rounded-xl border font-mono ${
                  formErrors.hsnCode 
                    ? 'border-rose-500 ring-1 ring-rose-500' 
                    : isDarkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900 focus:bg-white'
                }`}
              />
              {formErrors.hsnCode && <p className="text-[10px] text-rose-500 font-medium mt-0.5">{formErrors.hsnCode}</p>}
            </div>
            <div>
              <label className={`block text-[11px] font-mono font-semibold mb-1 ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                GST Rate % <span className="text-rose-500">*</span>
              </label>
              <select
                value={iGstRate}
                onChange={(e) => setIGstRate(Number(e.target.value))}
                className={`w-full p-2.5 rounded-xl border font-mono font-bold ${
                  isDarkMode ? 'bg-slate-800 border-slate-700 text-blue-400' : 'bg-slate-50 border-slate-300 text-blue-600 focus:bg-white'
                }`}
              >
                {GST_RATES.map(r => <option key={r} value={r}>{r}% GST</option>)}
              </select>
            </div>
          </div>

          {/* Dynamic Conditional Row: Standard Cost vs Selling Price & Preferred Vendor */}
          <div className={`p-3.5 rounded-2xl border space-y-3 ${
            isDarkMode ? 'bg-slate-800/40 border-slate-700/60' : 'bg-slate-50/80 border-slate-200'
          }`}>
            <div className="text-[11px] font-mono font-bold flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400">
              <DollarSign className="w-3.5 h-3.5" />
              <span>Costing & Pricing Valuation Matrix ({iItemType})</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Standard Cost: Required if RM / Consumable / Bought-Out */}
              {iItemType !== 'Finished Good' && (
                <div>
                  <label className={`block text-[10px] font-mono font-semibold mb-1 ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                    Standard Cost (₹) {['Raw Material', 'Consumable', 'Bought-Out'].includes(iItemType) && <span className="text-rose-500">*</span>}
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={iStandardCost}
                    onChange={(e) => setIStandardCost(Number(e.target.value))}
                    className={`w-full p-2 rounded-xl border text-xs font-mono font-bold ${
                      formErrors.standardCost 
                        ? 'border-rose-500 ring-1 ring-rose-500' 
                        : isDarkMode ? 'bg-slate-900 border-slate-700 text-emerald-400' : 'bg-white border-slate-300 text-emerald-700'
                    }`}
                  />
                  {formErrors.standardCost && <p className="text-[10px] text-rose-500 font-medium mt-0.5">{formErrors.standardCost}</p>}
                </div>
              )}

              {/* Selling Price: Required if Finished Good */}
              {iItemType === 'Finished Good' && (
                <div>
                  <label className={`block text-[10px] font-mono font-semibold mb-1 ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                    Selling Price (₹) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={iSellingPrice}
                    onChange={(e) => setISellingPrice(Number(e.target.value))}
                    className={`w-full p-2 rounded-xl border text-xs font-mono font-bold ${
                      formErrors.sellingPrice 
                        ? 'border-rose-500 ring-1 ring-rose-500' 
                        : isDarkMode ? 'bg-slate-900 border-slate-700 text-purple-400' : 'bg-white border-slate-300 text-purple-700'
                    }`}
                  />
                  {formErrors.sellingPrice && <p className="text-[10px] text-rose-500 font-medium mt-0.5">{formErrors.sellingPrice}</p>}
                </div>
              )}

              {/* Preferred Vendor: Required if RM / Consumable / Bought-Out */}
              {iItemType !== 'Finished Good' && (
                <div className="sm:col-span-2">
                  <label className={`block text-[10px] font-mono font-semibold mb-1 ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                    Preferred Vendor {['Raw Material', 'Consumable', 'Bought-Out'].includes(iItemType) && <span className="text-rose-500">*</span>}
                  </label>
                  <select
                    value={iPreferredVendor}
                    onChange={(e) => setIPreferredVendor(e.target.value)}
                    className={`w-full p-2 rounded-xl border text-xs ${
                      formErrors.preferredVendor 
                        ? 'border-rose-500 ring-1 ring-rose-500' 
                        : isDarkMode ? 'bg-slate-900 border-slate-700 text-slate-200' : 'bg-white border-slate-300 text-slate-900'
                    }`}
                  >
                    <option value="">-- Select Preferred Vendor --</option>
                    {vendors.filter(v => v.status === 'Active').map(v => (
                      <option key={v.code} value={v.name}>{v.name} ({v.vendorCategory})</option>
                    ))}
                  </select>
                  {formErrors.preferredVendor && <p className="text-[10px] text-rose-500 font-medium mt-0.5">{formErrors.preferredVendor}</p>}
                </div>
              )}
            </div>
          </div>

          {/* Row 4: Reorder Level, Min Stock, Max Stock, Lead Time */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div>
              <label className={`block text-[11px] font-mono font-semibold mb-1 ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                Reorder Level <span className="text-rose-500">*</span>
              </label>
              <input
                type="number"
                min={0}
                value={iReorderLevel}
                onChange={(e) => setIReorderLevel(Number(e.target.value))}
                className={`w-full p-2.5 rounded-xl border font-mono ${
                  isDarkMode ? 'bg-slate-800 border-slate-700 text-amber-400 font-bold' : 'bg-slate-50 border-slate-300 text-amber-700 font-bold focus:bg-white'
                }`}
              />
            </div>
            <div>
              <label className={`block text-[11px] font-mono font-semibold mb-1 ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                Min Stock
              </label>
              <input
                type="number"
                min={0}
                value={iMinStock}
                onChange={(e) => setIMinStock(Number(e.target.value))}
                className={`w-full p-2.5 rounded-xl border font-mono ${
                  isDarkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900 focus:bg-white'
                }`}
              />
            </div>
            <div>
              <label className={`block text-[11px] font-mono font-semibold mb-1 ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                Max Stock
              </label>
              <input
                type="number"
                min={0}
                value={iMaxStock}
                onChange={(e) => setIMaxStock(Number(e.target.value))}
                className={`w-full p-2.5 rounded-xl border font-mono ${
                  isDarkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900 focus:bg-white'
                }`}
              />
            </div>
            <div>
              <label className={`block text-[11px] font-mono font-semibold mb-1 ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                Lead Time (Days)
              </label>
              <input
                type="number"
                min={0}
                value={iLeadTimeDays}
                onChange={(e) => setILeadTimeDays(Number(e.target.value))}
                className={`w-full p-2.5 rounded-xl border font-mono ${
                  isDarkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900 focus:bg-white'
                }`}
              />
            </div>
          </div>

          {/* Row 5: Default Warehouse & Status */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className={`block text-[11px] font-mono font-semibold mb-1 ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                Default Warehouse / Location
              </label>
              <input
                type="text"
                value={iDefaultWarehouse}
                onChange={(e) => setIDefaultWarehouse(e.target.value)}
                className={`w-full p-2.5 rounded-xl border ${
                  isDarkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900 focus:bg-white'
                }`}
              />
            </div>
            <div>
              <label className={`block text-[11px] font-mono font-semibold mb-1 ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                Status <span className="text-rose-500">*</span>
              </label>
              <select
                value={iStatus}
                onChange={(e) => setIStatus(e.target.value as any)}
                className={`w-full p-2.5 rounded-xl border ${
                  isDarkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900 focus:bg-white'
                }`}
              >
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </select>
            </div>
          </div>

        </form>
      </Modal>

      {/* ========================================================================= */}
      {/* MODAL 4: ADD / EDIT MACHINE (LIGHT & DARK THEME POLISHED) */}
      {/* ========================================================================= */}
      <Modal
        isOpen={showAddMachineModal}
        onClose={() => {
          setShowAddMachineModal(false);
          setEditingMachine(null);
        }}
        maxWidth="4xl"
        isDarkMode={isDarkMode}
        icon={<Wrench className="w-5 h-5" />}
        title={editingMachine ? "Edit Machine Master" : "New Machine Master"}
        subtitle={editingMachine ? `Edit Asset: ${mCode} • Work Center & Capacity Engine` : `Auto ID: ${mCode} • Unique Name for Route Cards & Shop Scheduling`}
        footer={
          <div className="flex items-center justify-end gap-3 w-full">
            <button
              type="button"
              onClick={() => {
                setShowAddMachineModal(false);
                setEditingMachine(null);
              }}
              className={`px-4 py-2.5 rounded-xl font-bold transition-all cursor-pointer ${
                isDarkMode 
                  ? 'text-slate-400 hover:text-white hover:bg-slate-800' 
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              Cancel
            </button>
            <button
              type="submit"
              form="save-machine-form"
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#5B75F8] to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-amber-500/25 hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer"
            >
              <Check className="w-4 h-4" />
              <span>{editingMachine ? 'Update Machine Master' : 'Save Machine Master'}</span>
            </button>
          </div>
        }
      >
        <form id="save-machine-form" onSubmit={handleSaveMachine} className="space-y-4 text-xs">
          
          {/* Row 1: Code, Machine Name (Unique), Machine Type */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className={`block text-[11px] font-mono font-semibold mb-1 ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                {editingMachine ? 'Machine ID' : 'Machine ID (Auto)'}
              </label>
              <input
                type="text"
                value={mCode}
                readOnly
                className={`w-full p-2.5 rounded-xl border font-mono font-bold ${
                  isDarkMode ? 'bg-slate-800/80 border-slate-700 text-amber-400' : 'bg-slate-100 border-slate-200 text-amber-600'
                }`}
              />
            </div>
            <div>
              <label className={`block text-[11px] font-mono font-semibold mb-1 ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                Machine Name (Unique) <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="e.g. VMC-01, CNC-02"
                value={mName}
                onChange={(e) => setMName(e.target.value.toUpperCase())}
                className={`w-full p-2.5 rounded-xl border font-mono font-bold ${
                  formErrors.name 
                    ? 'border-rose-500 ring-1 ring-rose-500' 
                    : isDarkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900 focus:bg-white'
                }`}
              />
              {formErrors.name && <p className="text-[10px] text-rose-500 font-medium mt-0.5">{formErrors.name}</p>}
            </div>
            <div>
              <label className={`block text-[11px] font-mono font-semibold mb-1 ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                Machine Type <span className="text-rose-500">*</span>
              </label>
              <select
                value={mType}
                onChange={(e) => setMType(e.target.value)}
                className={`w-full p-2.5 rounded-xl border ${
                  isDarkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900 focus:bg-white'
                }`}
              >
                {MACHINE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          </div>

          {/* Row 2: Department, Location, Hourly Cost */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className={`block text-[11px] font-mono font-semibold mb-1 ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                Department <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Machine Shop, Fabrication"
                value={mDepartment}
                onChange={(e) => setMDepartment(e.target.value)}
                className={`w-full p-2.5 rounded-xl border ${
                  formErrors.department 
                    ? 'border-rose-500 ring-1 ring-rose-500' 
                    : isDarkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900 focus:bg-white'
                }`}
              />
            </div>
            <div>
              <label className={`block text-[11px] font-mono font-semibold mb-1 ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                Location on Shop Floor <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Bay 1, Line 2"
                value={mLocation}
                onChange={(e) => setMLocation(e.target.value)}
                className={`w-full p-2.5 rounded-xl border ${
                  formErrors.location 
                    ? 'border-rose-500 ring-1 ring-rose-500' 
                    : isDarkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900 focus:bg-white'
                }`}
              />
            </div>
            <div>
              <label className={`block text-[11px] font-mono font-semibold mb-1 ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                Hourly Cost (₹)
              </label>
              <input
                type="number"
                min={0}
                value={mHourlyCost}
                onChange={(e) => setMHourlyCost(Number(e.target.value))}
                className={`w-full p-2.5 rounded-xl border font-mono ${
                  isDarkMode ? 'bg-slate-800 border-slate-700 text-emerald-400 font-bold' : 'bg-slate-50 border-slate-300 text-emerald-700 font-bold focus:bg-white'
                }`}
              />
            </div>
          </div>

          {/* Row 3: Manufacturer, Model, Serial Number, Installation Date */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div>
              <label className={`block text-[11px] font-mono font-semibold mb-1 ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                Manufacturer
              </label>
              <input
                type="text"
                placeholder="e.g. Haas, BFW, Jyoti"
                value={mManufacturer}
                onChange={(e) => setMManufacturer(e.target.value)}
                className={`w-full p-2.5 rounded-xl border ${
                  isDarkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900 focus:bg-white'
                }`}
              />
            </div>
            <div>
              <label className={`block text-[11px] font-mono font-semibold mb-1 ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                Model
              </label>
              <input
                type="text"
                placeholder="e.g. VF-2SS"
                value={mModel}
                onChange={(e) => setMModel(e.target.value)}
                className={`w-full p-2.5 rounded-xl border ${
                  isDarkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900 focus:bg-white'
                }`}
              />
            </div>
            <div>
              <label className={`block text-[11px] font-mono font-semibold mb-1 ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                Serial Number
              </label>
              <input
                type="text"
                placeholder="e.g. SN-892140"
                value={mSerialNumber}
                onChange={(e) => setMSerialNumber(e.target.value)}
                className={`w-full p-2.5 rounded-xl border font-mono ${
                  isDarkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900 focus:bg-white'
                }`}
              />
            </div>
            <div>
              <label className={`block text-[11px] font-mono font-semibold mb-1 ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                Installation Date
              </label>
              <input
                type="date"
                value={mInstallationDate}
                onChange={(e) => setMInstallationDate(e.target.value)}
                className={`w-full p-2.5 rounded-xl border ${
                  isDarkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900 focus:bg-white'
                }`}
              />
            </div>
          </div>

          {/* Row 4: Capacity & Capacity UOM (Conditional Requirement) */}
          <div className={`grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 rounded-2xl border ${
            isDarkMode ? 'bg-slate-800/40 border-slate-700/60' : 'bg-slate-50/80 border-slate-200'
          }`}>
            <div>
              <label className={`block text-[11px] font-mono font-semibold mb-1 ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                Capacity Rating
              </label>
              <input
                type="number"
                min={0}
                placeholder="e.g. 50"
                value={mCapacity ?? ''}
                onChange={(e) => setMCapacity(e.target.value ? Number(e.target.value) : undefined)}
                className={`w-full p-2.5 rounded-xl border font-mono ${
                  isDarkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'
                }`}
              />
            </div>
            <div>
              <label className={`block text-[11px] font-mono font-semibold mb-1 ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                Capacity UOM {mCapacity && mCapacity > 0 && <span className="text-rose-500">*</span>}
              </label>
              <input
                type="text"
                placeholder="e.g. Parts/hr, Tons, RPM, KW"
                value={mCapacityUom}
                onChange={(e) => setMCapacityUom(e.target.value)}
                className={`w-full p-2.5 rounded-xl border ${
                  formErrors.capacityUom 
                    ? 'border-rose-500 ring-1 ring-rose-500' 
                    : isDarkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'
                }`}
              />
              {formErrors.capacityUom && <p className="text-[10px] text-rose-500 font-medium mt-0.5">{formErrors.capacityUom}</p>}
            </div>
          </div>

          {/* Row 5: Operating Hours (0-24), Shift, Status, Responsible Person */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div>
              <label className={`block text-[11px] font-mono font-semibold mb-1 ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                Operating Hours/Day (0-24)
              </label>
              <input
                type="number"
                min={0}
                max={24}
                value={mOperatingHours}
                onChange={(e) => setMOperatingHours(Number(e.target.value))}
                className={`w-full p-2.5 rounded-xl border font-mono ${
                  formErrors.operatingHours 
                    ? 'border-rose-500 ring-1 ring-rose-500' 
                    : isDarkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900 focus:bg-white'
                }`}
              />
              {formErrors.operatingHours && <p className="text-[10px] text-rose-500 font-medium mt-0.5">{formErrors.operatingHours}</p>}
            </div>
            <div>
              <label className={`block text-[11px] font-mono font-semibold mb-1 ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                Shift
              </label>
              <select
                value={mShift}
                onChange={(e) => setMShift(e.target.value)}
                className={`w-full p-2.5 rounded-xl border ${
                  isDarkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900 focus:bg-white'
                }`}
              >
                {MACHINE_SHIFTS.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className={`block text-[11px] font-mono font-semibold mb-1 ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                Status <span className="text-rose-500">*</span>
              </label>
              <select
                value={mStatus}
                onChange={(e) => setMStatus(e.target.value)}
                className={`w-full p-2.5 rounded-xl border ${
                  isDarkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900 focus:bg-white'
                }`}
              >
                {MACHINE_STATUSES.map(st => <option key={st} value={st}>{st}</option>)}
              </select>
            </div>
            <div>
              <label className={`block text-[11px] font-mono font-semibold mb-1 ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                Responsible Person
              </label>
              <select
                value={mResponsiblePerson}
                onChange={(e) => setMResponsiblePerson(e.target.value)}
                className={`w-full p-2.5 rounded-xl border ${
                  isDarkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900 focus:bg-white'
                }`}
              >
                <option value="">-- Select Operator/Supervisor --</option>
                {users.map(u => (
                  <option key={u.id} value={u.name}>{u.name} ({u.role})</option>
                ))}
              </select>
            </div>
          </div>

        </form>
      </Modal>

      {/* ========================================================================= */}
      {/* MODAL 5: DELETE CONFIRMATION MODAL */}
      {/* ========================================================================= */}
      <Modal
        isOpen={!!deleteConfirm?.isOpen}
        onClose={() => !isDeleting && setDeleteConfirm(null)}
        maxWidth="md"
        isDarkMode={isDarkMode}
        icon={<AlertTriangle className="w-5 h-5 text-rose-500" />}
        title={`Delete ${deleteConfirm?.type === 'CUSTOMER' ? 'Customer' : deleteConfirm?.type === 'VENDOR' ? 'Vendor' : deleteConfirm?.type === 'ITEM' ? 'Item' : 'Machine'} Master`}
        subtitle="This action cannot be undone and will permanently remove this record."
        footer={
          <div className="flex items-center justify-end gap-3 w-full">
            <button
              type="button"
              disabled={isDeleting}
              onClick={() => setDeleteConfirm(null)}
              className={`px-4 py-2.5 rounded-xl font-bold transition-all cursor-pointer ${
                isDarkMode 
                  ? 'text-slate-400 hover:text-white hover:bg-slate-800' 
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={isDeleting}
              onClick={handleConfirmDelete}
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-700 hover:to-red-700 text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-rose-500/25 hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer disabled:opacity-50"
            >
              <Trash2 className="w-4 h-4" />
              <span>{isDeleting ? 'Deleting...' : 'Confirm Delete'}</span>
            </button>
          </div>
        }
      >
        <div className="space-y-3 py-2 text-xs">
          <div className={`p-4 rounded-2xl border flex items-start gap-3 ${
            isDarkMode ? 'bg-rose-950/20 border-rose-900/40 text-rose-300' : 'bg-rose-50 border-rose-200 text-rose-800'
          }`}>
            <AlertTriangle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-sm">Are you sure you want to delete this master record?</p>
              <p className="text-xs opacity-80 mt-1">
                Record: <strong className="font-mono">{deleteConfirm?.code}</strong> — <strong className="font-sans">{deleteConfirm?.name}</strong>
              </p>
            </div>
          </div>
          <p className={isDarkMode ? 'text-slate-400' : 'text-slate-600'}>
            Deleting this master entry may affect operational tracking, route card travelers, and statutory reports that reference this identifier.
          </p>
        </div>
      </Modal>

    </div>
  );
};

