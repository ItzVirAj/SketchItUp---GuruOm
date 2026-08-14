import React, { useState, useRef, useEffect } from 'react';
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
  Sparkles
} from 'lucide-react';
import { MasterItem, CustomerMaster, VendorMaster, MachineMaster } from '../../../types/console';

interface MastersViewProps {
  masters: MasterItem[];
  customers?: CustomerMaster[];
  vendors?: VendorMaster[];
  machines?: MachineMaster[];
  isDarkMode?: boolean;
  onAddMaster?: (item: Partial<MasterItem>) => void;
  onAddMasterItem?: (item: Partial<MasterItem>) => void;
  onAddCustomer?: (customer: CustomerMaster) => void;
  onAddVendor?: (vendor: VendorMaster) => void;
  onAddMachine?: (machine: MachineMaster) => void;
  onImportOMGST?: (data: { customers?: CustomerMaster[]; vendors?: VendorMaster[]; machines?: MachineMaster[]; items?: MasterItem[] }) => void;
}

export const MastersView: React.FC<MastersViewProps> = ({
  masters = [],
  customers = [],
  vendors = [],
  machines = [],
  isDarkMode = true,
  onAddMaster,
  onAddMasterItem,
  onAddCustomer,
  onAddVendor,
  onAddMachine,
  onImportOMGST
}) => {
  const location = useLocation();
  const navigate = useNavigate();

  // Navigation tab state
  const [activeTab, setActiveTab] = useState<'ITEMS' | 'CUSTOMERS' | 'VENDORS' | 'MACHINES' | 'IMPORT_OMGST'>('CUSTOMERS');

  useEffect(() => {
    const path = location.pathname;
    if (path === '/masters/customers') setActiveTab('CUSTOMERS');
    else if (path === '/masters/vendors') setActiveTab('VENDORS');
    else if (path === '/masters/machines') setActiveTab('MACHINES');
    else if (path === '/masters/import-omgst') setActiveTab('IMPORT_OMGST');
    else if (path === '/masters/items') setActiveTab('ITEMS');
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
  const [typeFilter, setTypeFilter] = useState<'ALL' | 'FG' | 'RAW'>('ALL');
  
  // Separate Modal states
  const [showAddCustomerModal, setShowAddCustomerModal] = useState(false);
  const [showAddVendorModal, setShowAddVendorModal] = useState(false);
  const [showAddMachineModal, setShowAddMachineModal] = useState(false);
  const [showAddItemModal, setShowAddItemModal] = useState(false);
  
  // Column customization state
  const [showColumnsMenu, setShowColumnsMenu] = useState(false);
  const [visibleColumns, setVisibleColumns] = useState<Record<string, boolean>>({
    code: true,
    name: true,
    gstin: true,
    city: true,
    state: true,
    creditDays: true,
    paymentTerms: true,
    hourlyCost: true,
    active: true,
    type: true,
    status: true
  });

  // Limit per page & pagination
  const [limitPerPage, setLimitPerPage] = useState<number>(25);
  const [currentPage, setCurrentPage] = useState<number>(1);

  // OMGST Import State
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [omgstFileType, setOmgstFileType] = useState<string>('Detect from filename');
  const [uploadedFiles, setUploadedFiles] = useState<{ name: string; size: number; parsedType: string; recordsCount: number }[]>([]);
  const [importStatus, setImportStatus] = useState<string | null>(null);

  // Departmental Prefixes Lists (Alone prefixes: RAW, MACH, TOOL, PROC, CONS, SERV, LOGS, GEN / OEM, T1, EXP, DIST, RETL, GEN)
  const VENDOR_DEPARTMENTS = [
    { code: 'RAW', label: 'RAW — Raw Materials & Metals (RAW-001)' },
    { code: 'MACH', label: 'MACH — Machinery & Capital Equip (MACH-001)' },
    { code: 'TOOL', label: 'TOOL — Cutting Tools & Fixtures (TOOL-001)' },
    { code: 'PROC', label: 'PROC — Subcontract & Jobwork (PROC-001)' },
    { code: 'CONS', label: 'CONS — Consumables & Hardware (CONS-001)' },
    { code: 'SERV', label: 'SERV — Service & Calibration (SERV-001)' },
    { code: 'LOGS', label: 'LOGS — Logistics & Freight (LOGS-001)' },
    { code: 'GEN', label: 'GEN — General Supplies (GEN-001)' }
  ];

  const CUSTOMER_DEPARTMENTS = [
    { code: 'OEM', label: 'OEM — Original Equipment Mfr (OEM-001)' },
    { code: 'T1', label: 'T1 — Tier-1 Automotive Components (T1-001)' },
    { code: 'EXP', label: 'EXP — Export & Overseas Accounts (EXP-001)' },
    { code: 'DIST', label: 'DIST — Distributor & Trading (DIST-001)' },
    { code: 'RETL', label: 'RETL — Retail & Direct Clients (RETL-001)' },
    { code: 'GEN', label: 'GEN — General Customers (GEN-001)' }
  ];

  // Dedicated Customer Form State (Image 2 format)
  const [cCode, setCCode] = useState('');
  const [cCategory, setCCategory] = useState('OEM');
  const [cName, setCName] = useState('');
  const [cLegalName, setCLegalName] = useState('');
  const [cCustomerType, setCCustomerType] = useState('OEM');
  const [cContactPerson, setCContactPerson] = useState('');
  const [cMobile, setCMobile] = useState('');
  const [cEmail, setCEmail] = useState('');
  const [cGstin, setCGstin] = useState('');
  const [cPan, setCPan] = useState('');
  const [cBillingAddress, setCBillingAddress] = useState('');
  const [cShippingAddress, setCShippingAddress] = useState('');
  const [cCity, setCCity] = useState('');
  const [cState, setCState] = useState('Maharashtra');
  const [cPincode, setCPincode] = useState('');
  const [cPaymentTerms, setCPaymentTerms] = useState('Net 30');
  const [cCreditDays, setCCreditDays] = useState<number>(30);
  const [cCreditLimit, setCCreditLimit] = useState<number>(1000000);
  const [cSalesperson, setCSalesperson] = useState('');
  const [cNotes, setCNotes] = useState('');

  // Dedicated Vendor Form State (Image 2 format)
  const [vCode, setVCode] = useState('');
  const [vCategory, setVCategory] = useState('RAW');
  const [vName, setVName] = useState('');
  const [vLegalName, setVLegalName] = useState('');
  const [vVendorType, setVVendorType] = useState('Supplier');
  const [vVendorCategory, setVVendorCategory] = useState('Raw Material');
  const [vContactPerson, setVContactPerson] = useState('');
  const [vMobile, setVMobile] = useState('');
  const [vEmail, setVEmail] = useState('');
  const [vGstin, setVGstin] = useState('');
  const [vPan, setVPan] = useState('');
  const [vBillingAddress, setVBillingAddress] = useState('');
  const [vCity, setVCity] = useState('');
  const [vState, setVState] = useState('Maharashtra');
  const [vPincode, setVPincode] = useState('');
  const [vPaymentTerms, setVPaymentTerms] = useState('Net 30');
  const [vCreditDays, setVCreditDays] = useState<number>(30);
  const [vCreditLimit, setVCreditLimit] = useState<number>(500000);
  const [vBankAccountName, setVBankAccountName] = useState('');
  const [vBankAccountNumber, setVBankAccountNumber] = useState('');
  const [vIfsc, setVIfsc] = useState('');
  const [vNotes, setVNotes] = useState('');

  // Machine-Made Sequential Code Generators (Prefix Alone + 3-digit Non-Repeating Number)
  const generateCustomerCode = (prefix: string) => {
    const cleanPrefix = prefix.trim().toUpperCase();
    let maxNum = 0;

    customers.forEach(c => {
      if (!c.code) return;
      const codeUpper = c.code.toUpperCase();
      if (codeUpper.startsWith(`${cleanPrefix}-`) || codeUpper.startsWith(`CST-${cleanPrefix}-`)) {
        const parts = codeUpper.split('-');
        const lastPart = parts[parts.length - 1];
        const num = parseInt(lastPart, 10);
        if (!isNaN(num) && num > maxNum) maxNum = num;
      }
    });

    if (maxNum === 0) {
      maxNum = customers.length;
    }

    let nextNum = maxNum + 1;
    let candidateCode = `${cleanPrefix}-${String(nextNum).padStart(3, '0')}`;
    while (customers.some(c => c.code && c.code.toUpperCase() === candidateCode.toUpperCase())) {
      nextNum++;
      candidateCode = `${cleanPrefix}-${String(nextNum).padStart(3, '0')}`;
    }

    return candidateCode;
  };

  const generateVendorCode = (prefix: string) => {
    const cleanPrefix = prefix.trim().toUpperCase();
    let maxNum = 0;

    vendors.forEach(v => {
      if (!v.code) return;
      const codeUpper = v.code.toUpperCase();
      if (codeUpper.startsWith(`${cleanPrefix}-`) || codeUpper.startsWith(`VND-${cleanPrefix}-`)) {
        const parts = codeUpper.split('-');
        const lastPart = parts[parts.length - 1];
        const num = parseInt(lastPart, 10);
        if (!isNaN(num) && num > maxNum) maxNum = num;
      }
    });

    if (maxNum === 0) {
      maxNum = vendors.length;
    }

    let nextNum = maxNum + 1;
    let candidateCode = `${cleanPrefix}-${String(nextNum).padStart(3, '0')}`;
    while (vendors.some(v => v.code && v.code.toUpperCase() === candidateCode.toUpperCase())) {
      nextNum++;
      candidateCode = `${cleanPrefix}-${String(nextNum).padStart(3, '0')}`;
    }

    return candidateCode;
  };

  const generateMachineMasterCode = () => {
    const prefix = 'MCH';
    let maxNum = machines.length;
    machines.forEach(m => {
      if (!m.code) return;
      const parts = m.code.toUpperCase().split('-');
      const lastPart = parts[parts.length - 1];
      const num = parseInt(lastPart, 10);
      if (!isNaN(num) && num > maxNum) maxNum = num;
    });
    let nextNum = maxNum + 1;
    let candidateCode = `${prefix}-${String(nextNum).padStart(3, '0')}`;
    while (machines.some(m => m.code && m.code.toUpperCase() === candidateCode.toUpperCase())) {
      nextNum++;
      candidateCode = `${prefix}-${String(nextNum).padStart(3, '0')}`;
    }
    return candidateCode;
  };

  const openAddCustomerModal = () => {
    const initialCategory = 'OEM';
    setCCategory(initialCategory);
    setCCustomerType('OEM');
    setCCode(generateCustomerCode(initialCategory));
    setShowAddCustomerModal(true);
  };

  const openAddVendorModal = () => {
    const initialCategory = 'RAW';
    setVCategory(initialCategory);
    setVVendorCategory('Raw Material');
    setVCode(generateVendorCode(initialCategory));
    setShowAddVendorModal(true);
  };

  const openAddMachineModal = () => {
    setMCode(generateMachineMasterCode());
    setShowAddMachineModal(true);
  };

  const handleCustomerCategoryChange = (newCat: string) => {
    setCCategory(newCat);
    setCCustomerType(newCat);
    setCCode(generateCustomerCode(newCat));
  };

  const handleVendorCategoryChange = (newCat: string) => {
    setVCategory(newCat);
    const catLabel = VENDOR_DEPARTMENTS.find(d => d.code === newCat)?.label.split('—')[1]?.split('(')[0]?.trim() || 'Raw Material';
    setVVendorCategory(catLabel);
    setVCode(generateVendorCode(newCat));
  };

  // Form state for Machine
  const [mCode, setMCode] = useState('');
  const [mName, setMName] = useState('');
  const [mType, setMType] = useState('CNC Machining');
  const [mStatus, setMStatus] = useState('RUNNING');
  const [mHourlyCost, setMHourlyCost] = useState<number>(500);
  const [mActive, setMActive] = useState<boolean>(true);

  // Form state for Item SKU
  const [itemCode, setItemCode] = useState('');
  const [partNo, setPartNo] = useState('');
  const [description, setDescription] = useState('');
  const [unit, setUnit] = useState('NOS');
  const [hsnCode, setHsnCode] = useState('84832000');
  const [reorderLevel, setReorderLevel] = useState(20);
  const [storeLocation, setStoreLocation] = useState('A1-RACK-01');
  const [isFinishedGoods, setIsFinishedGoods] = useState(true);
  const [saleRate, setSaleRate] = useState(100);
  const [purchaseRate, setPurchaseRate] = useState(70);

  // Filters
  const filteredCustomers = customers.filter(c => 
    (c.code || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (c.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (c.gstin || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (c.city || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (c.state || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredVendors = vendors.filter(v => 
    (v.code || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (v.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (v.gstin || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (v.city || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (v.state || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredMachines = machines.filter(m => 
    (m.code || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (m.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (m.type || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredItems = masters.filter(m => {
    const matches = (m.code || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (m.partNo || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (m.description || '').toLowerCase().includes(searchTerm.toLowerCase());
    if (typeFilter === 'FG') return matches && m.isFinishedGoods;
    if (typeFilter === 'RAW') return matches && !m.isFinishedGoods;
    return matches;
  });

  // Dedicated Save Handlers with mandatory field enforcement
  const handleSaveCustomer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!cCode || !cName || !cGstin || !cPan || !cMobile || !cBillingAddress || !cCity || !cState) {
      alert('Please fill in all mandatory fields marked with *: Code, Name, GSTIN, PAN, Mobile, Address, City, and State.');
      return;
    }

    const payload: CustomerMaster = {
      code: cCode,
      name: cName,
      legalName: cLegalName || cName,
      customerType: cCustomerType,
      gstin: cGstin,
      pan: cPan,
      contactPerson: cContactPerson || cName,
      contact: cMobile,
      email: cEmail,
      address: cBillingAddress,
      shippingAddress: cShippingAddress || cBillingAddress,
      city: cCity,
      state: cState,
      stateCode: '27',
      pin: cPincode,
      creditDays: Number(cCreditDays) || 30,
      paymentTerms: cPaymentTerms,
      creditLimit: Number(cCreditLimit) || 1000000,
      salesperson: cSalesperson,
      status: 'Active',
      notes: cNotes
    };

    if (onAddCustomer) onAddCustomer(payload);
    setActiveTab('CUSTOMERS');
    setSearchTerm('');
    setShowAddCustomerModal(false);
    resetCustomerForm();
  };

  const resetCustomerForm = () => {
    setCCode('');
    setCName('');
    setCLegalName('');
    setCContactPerson('');
    setCMobile('');
    setCEmail('');
    setCGstin('');
    setCPan('');
    setCBillingAddress('');
    setCShippingAddress('');
    setCCity('');
    setCPincode('');
    setCSalesperson('');
    setCNotes('');
  };

  const handleSaveVendor = (e: React.FormEvent) => {
    e.preventDefault();
    if (!vCode || !vName || !vGstin || !vPan || !vMobile || !vBillingAddress || !vCity || !vState || !vBankAccountName || !vBankAccountNumber || !vIfsc) {
      alert('Please fill in all mandatory fields marked with *: Code, Name, GSTIN, PAN, Mobile, Address, City, State, Bank Account Name, Bank Account Number, and IFSC Code.');
      return;
    }

    const payload: VendorMaster = {
      code: vCode,
      name: vName,
      legalName: vLegalName || vName,
      vendorType: vVendorType,
      vendorCategory: vVendorCategory,
      gstin: vGstin,
      pan: vPan,
      contactPerson: vContactPerson || vName,
      contact: vMobile,
      email: vEmail,
      address: vBillingAddress,
      city: vCity,
      state: vState,
      stateCode: '27',
      pin: vPincode,
      paymentTerms: vPaymentTerms,
      creditDays: Number(vCreditDays) || 30,
      creditLimit: Number(vCreditLimit) || 500000,
      bankAccountName: vBankAccountName,
      bankAccountNumber: vBankAccountNumber,
      ifsc: vIfsc,
      status: 'Active',
      notes: vNotes
    };

    if (onAddVendor) onAddVendor(payload);
    setActiveTab('VENDORS');
    setSearchTerm('');
    setShowAddVendorModal(false);
    resetVendorForm();
  };

  const resetVendorForm = () => {
    setVCode('');
    setVName('');
    setVLegalName('');
    setVContactPerson('');
    setVMobile('');
    setVEmail('');
    setVGstin('');
    setVPan('');
    setVBillingAddress('');
    setVCity('');
    setVPincode('');
    setVBankAccountName('');
    setVBankAccountNumber('');
    setVIfsc('');
    setVNotes('');
  };

  const handleSaveMachine = (e: React.FormEvent) => {
    e.preventDefault();
    if (!mCode || !mName) return;

    const payload: MachineMaster = {
      code: mCode,
      name: mName,
      type: mType,
      status: mStatus,
      hourlyCost: Number(mHourlyCost) || 0,
      active: mActive
    };

    if (onAddMachine) onAddMachine(payload);
    setActiveTab('MACHINES');
    setSearchTerm('');
    setShowAddMachineModal(false);
    setMCode('');
    setMName('');
  };

  const handleSaveItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!itemCode || !description) return;

    const payload: MasterItem = {
      code: itemCode,
      partNo,
      description,
      unit,
      hsnCode,
      reorderLevel: Number(reorderLevel),
      storeLocation,
      isFinishedGoods,
      saleRate: Number(saleRate),
      purchaseRate: Number(purchaseRate)
    };

    if (onAddMaster) onAddMaster(payload);
    if (onAddMasterItem) onAddMasterItem(payload);
    setActiveTab('ITEMS');
    setSearchTerm('');
    setShowAddItemModal(false);
    setItemCode('');
    setPartNo('');
    setDescription('');
  };

  // OMGST DBF File Upload Simulation
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const newFiles = Array.from(files).map((file: File) => {
      const fileNameLower = file.name.toLowerCase();
      let parsedType = 'Items';
      let recordsCount = Math.floor(Math.random() * 40) + 10;

      if (fileNameLower.includes('cust')) {
        parsedType = 'Customers';
      } else if (fileNameLower.includes('vend')) {
        parsedType = 'Vendors';
      } else if (fileNameLower.includes('mach')) {
        parsedType = 'Machines';
      } else if (fileNameLower.includes('item') || fileNameLower.includes('sc')) {
        parsedType = 'Items';
      }

      return {
        name: file.name,
        size: file.size,
        parsedType,
        recordsCount
      };
    });

    setUploadedFiles(prev => [...prev, ...newFiles]);
    setImportStatus(null);
  };

  const handleCommitImport = () => {
    if (uploadedFiles.length === 0) return;

    const importedCustomers: CustomerMaster[] = [
      { code: 'CUST-OMGST-01', name: 'Precision Alloys Ltd (OMGST)', gstin: '24AAACP9012B1Z3', city: 'Rajkot', state: 'Gujarat', creditDays: 45 },
      { code: 'CUST-OMGST-02', name: 'Metoda Auto Components (OMGST)', gstin: '24AAACM4589C1Z9', city: 'Rajkot', state: 'Gujarat', creditDays: 60 }
    ];
    const importedVendors: VendorMaster[] = [
      { code: 'VEND-OMGST-01', name: 'Gujarat Forgings Ltd (OMGST)', gstin: '24AAACG3412A1Z1', city: 'Shapor', state: 'Gujarat', paymentTerms: 'Net 30 Days' }
    ];
    const importedMachines: MachineMaster[] = [
      { code: 'VMC-04', name: 'VMC 4-axis High Speed (OMGST)', type: 'CNC Machining', status: 'RUNNING', hourlyCost: 850, active: true }
    ];

    if (onImportOMGST) {
      onImportOMGST({
        customers: importedCustomers,
        vendors: importedVendors,
        machines: importedMachines
      });
    }

    setImportStatus(`Successfully committed ${uploadedFiles.length} DBF file(s). 4 new master records added to database.`);
    setUploadedFiles([]);
  };

  // Export to CSV Function
  const handleExportCSV = (type: 'CUSTOMERS' | 'VENDORS' | 'MACHINES' | 'ITEMS') => {
    let csvData = '';
    let filename = 'master_export.csv';

    if (type === 'CUSTOMERS') {
      filename = 'customers_register.csv';
      csvData = 'Code,Name,GSTIN,City,State,Credit Days\n';
      filteredCustomers.forEach(c => {
        csvData += `"${c.code}","${c.name}","${c.gstin}","${c.city}","${c.state}","${c.creditDays}"\n`;
      });
    } else if (type === 'VENDORS') {
      filename = 'vendors_register.csv';
      csvData = 'Code,Name,GSTIN,City,State,Payment Terms\n';
      filteredVendors.forEach(v => {
        csvData += `"${v.code}","${v.name}","${v.gstin}","${v.city}","${v.state}","${v.paymentTerms}"\n`;
      });
    } else if (type === 'MACHINES') {
      filename = 'machines_register.csv';
      csvData = 'Code,Name,Type,Status,Hourly Cost,Active\n';
      filteredMachines.forEach(m => {
        csvData += `"${m.code}","${m.name}","${m.type}","${m.status || '—'}","${m.hourlyCost}","${m.active ? 'Yes' : 'No'}"\n`;
      });
    } else {
      filename = 'items_master.csv';
      csvData = 'Code,Part No,Description,Unit,HSN,Reorder Level,Sale Rate,Purchase Rate\n';
      filteredItems.forEach(i => {
        csvData += `"${i.code}","${i.partNo}","${i.description}","${i.unit}","${i.hsnCode}","${i.reorderLevel}","${i.saleRate}","${i.purchaseRate}"\n`;
      });
    }

    const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();
  };

  return (
    <div className="space-y-6 font-sans">
      
      {/* Top Header Navigation Tabs matching executive UI design */}
      <div className={`p-1.5 rounded-2xl border flex flex-wrap items-center gap-1.5 font-medium text-xs ${
        isDarkMode ? 'bg-[#16171B] border-[#262832]' : 'bg-slate-100 border-slate-200/80'
      }`}>
        {[
          { id: 'ITEMS', label: 'Items' },
          { id: 'CUSTOMERS', label: 'Customers' },
          { id: 'VENDORS', label: 'Vendors' },
          { id: 'MACHINES', label: 'Machines' },
          { id: 'IMPORT_OMGST', label: 'Import from OMGST' }
        ].map(tab => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => {
                handleSelectTab(tab.id as any);
                setSearchTerm('');
              }}
              className={`px-4 py-2.5 rounded-xl font-bold transition-all cursor-pointer ${
                isActive 
                  ? 'bg-[#5B75F8] text-white shadow-md shadow-[#5B75F8]/20 scale-[1.02]' 
                  : isDarkMode 
                    ? 'text-slate-400 hover:text-white hover:bg-slate-800/60' 
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/80'
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: CUSTOMERS MASTER REGISTER (MATCHING SCREENSHOT 1)                    */}
      {/* ========================================================================= */}
      {activeTab === 'CUSTOMERS' && (
        <div className="space-y-4">
          
          {/* Header Title Section */}
          <div className="flex items-center gap-2">
            <div>
              <div className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400">REGISTER</div>
              <div className="flex items-center gap-3">
                <h1 className={`text-3xl font-extrabold tracking-tight ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                  Customers
                </h1>
                <button 
                  onClick={() => setSearchTerm('')}
                  title="Refresh Register"
                  className={`p-1.5 rounded-full border transition-all cursor-pointer ${
                    isDarkMode ? 'border-slate-800 bg-slate-900 text-slate-400 hover:text-white' : 'border-slate-200 bg-white text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>

          {/* Action Toolbar */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex-1 min-w-[240px] max-w-xl relative">
              <input
                type="text"
                placeholder="Search..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className={`w-full px-4 py-2.5 rounded-2xl border text-xs outline-none transition-all ${
                  isDarkMode 
                    ? 'bg-slate-900/90 border-slate-800 text-white placeholder:text-slate-500 focus:border-[#5B75F8] focus:ring-2 focus:ring-[#5B75F8]/20' 
                    : 'bg-white border-slate-200 text-slate-900 placeholder:text-slate-400 focus:border-[#5B75F8] focus:ring-2 focus:ring-[#5B75F8]/10 shadow-xs'
                }`}
              />
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={openAddCustomerModal}
                className="px-4 py-2.5 rounded-2xl bg-gradient-to-r from-[#5B75F8] to-[#4F6BF5] hover:from-[#4F6BF5] hover:to-[#3B59E5] text-white font-bold text-xs flex items-center gap-2 cursor-pointer shadow-lg shadow-[#5B75F8]/20 transition-all hover:scale-[1.01]"
              >
                <Plus className="w-4 h-4" />
                <span>New Customer</span>
              </button>

              <button
                onClick={() => handleExportCSV('CUSTOMERS')}
                className={`px-4 py-2.5 rounded-2xl border font-bold text-xs flex items-center gap-1.5 cursor-pointer transition-all ${
                  isDarkMode ? 'border-slate-800 bg-slate-900/80 text-slate-300 hover:bg-slate-800' : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                }`}
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export</span>
              </button>

              <div className="relative">
                <button
                  onClick={() => setShowColumnsMenu(!showColumnsMenu)}
                  className={`px-3.5 py-2.5 rounded-2xl border font-bold text-xs flex items-center gap-1.5 cursor-pointer transition-all ${
                    isDarkMode ? 'border-slate-800 bg-slate-900/80 text-slate-300 hover:text-white' : 'border-slate-200 bg-white text-slate-700'
                  }`}
                >
                  <Columns className="w-3.5 h-3.5" />
                  <span>Columns</span>
                  <ChevronDown className="w-3 h-3 opacity-60" />
                </button>

                {showColumnsMenu && (
                  <div className={`absolute right-0 top-11 z-40 w-48 p-3 rounded-2xl border shadow-2xl space-y-2 text-xs font-mono ${
                    isDarkMode ? 'bg-slate-900 border-slate-800 text-slate-200' : 'bg-white border-slate-200 text-slate-800'
                  }`}>
                    <div className="font-bold text-[10px] uppercase text-slate-400 mb-1">Toggle Columns</div>
                    {['code', 'name', 'gstin', 'city', 'state', 'creditDays'].map(colKey => (
                      <label key={colKey} className="flex items-center gap-2 cursor-pointer capitalize hover:opacity-80">
                        <input
                          type="checkbox"
                          checked={visibleColumns[colKey] !== false}
                          onChange={(e) => setVisibleColumns(prev => ({ ...prev, [colKey]: e.target.checked }))}
                          className="rounded text-[#5B75F8] focus:ring-0 cursor-pointer"
                        />
                        <span>{colKey}</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Table Register Grid */}
          <div className={`rounded-2xl border overflow-hidden transition-all shadow-sm ${
            isDarkMode ? 'bg-slate-900/80 border-slate-800/80' : 'bg-white border-slate-200'
          }`}>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className={`border-b font-mono text-[11px] ${
                    isDarkMode ? 'bg-slate-950/60 border-slate-800 text-slate-400' : 'bg-slate-50 border-slate-200 text-slate-500'
                  }`}>
                    {visibleColumns.code !== false && <th className="py-3 px-4 font-normal">Code</th>}
                    {visibleColumns.name !== false && <th className="py-3 px-4 font-normal">Name</th>}
                    {visibleColumns.gstin !== false && <th className="py-3 px-4 font-normal">GSTIN</th>}
                    {visibleColumns.city !== false && <th className="py-3 px-4 font-normal">City</th>}
                    {visibleColumns.state !== false && <th className="py-3 px-4 font-normal">State</th>}
                    {visibleColumns.creditDays !== false && <th className="py-3 px-4 font-normal">Credit Days</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800/80">
                  {filteredCustomers.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-slate-400 font-mono text-xs uppercase tracking-widest">
                        NO RECORDS
                      </td>
                    </tr>
                  ) : (
                    filteredCustomers.map((c, idx) => (
                      <tr 
                        key={idx} 
                        className={`transition-colors ${
                          isDarkMode ? 'hover:bg-slate-800/50 text-slate-200' : 'hover:bg-slate-50 text-slate-800'
                        }`}
                      >
                        {visibleColumns.code !== false && (
                          <td className="py-3.5 px-4 font-mono font-bold text-slate-900 dark:text-slate-100">
                            {c.code}
                          </td>
                        )}
                        {visibleColumns.name !== false && (
                          <td className="py-3.5 px-4 font-medium">{c.name}</td>
                        )}
                        {visibleColumns.gstin !== false && (
                          <td className="py-3.5 px-4 font-mono text-slate-500 dark:text-slate-400">{c.gstin}</td>
                        )}
                        {visibleColumns.city !== false && (
                          <td className="py-3.5 px-4">{c.city}</td>
                        )}
                        {visibleColumns.state !== false && (
                          <td className="py-3.5 px-4">{c.state}</td>
                        )}
                        {visibleColumns.creditDays !== false && (
                          <td className="py-3.5 px-4 font-mono">{c.creditDays}</td>
                        )}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Bottom Grid Metrics & Pagination Bar */}
            <div className={`px-4 py-2.5 border-t flex flex-wrap items-center justify-between gap-3 text-[11px] font-mono ${
              isDarkMode ? 'bg-slate-950/40 border-slate-800/80 text-slate-400' : 'bg-slate-50/80 border-slate-200 text-slate-600'
            }`}>
              <div className="flex items-center gap-4">
                <span>GRID_METRICS: [1 .. {filteredCustomers.length}] OF {filteredCustomers.length} REC</span>
                <span className="opacity-40">|</span>
                <div className="flex items-center gap-1">
                  <span>LIMIT:</span>
                  <select
                    value={limitPerPage}
                    onChange={(e) => setLimitPerPage(Number(e.target.value))}
                    className={`px-2 py-0.5 rounded border text-[11px] font-mono outline-none cursor-pointer ${
                      isDarkMode ? 'bg-slate-900 border-slate-800 text-slate-200' : 'bg-white border-slate-300 text-slate-800'
                    }`}
                  >
                    <option value={10}>10 / PAGE</option>
                    <option value={25}>25 / PAGE</option>
                    <option value={50}>50 / PAGE</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <button 
                  disabled={currentPage === 1}
                  className="opacity-50 hover:opacity-100 disabled:opacity-30 cursor-pointer"
                >
                  &lt; PREV
                </button>
                <span>PAGE {currentPage} / 1</span>
                <button 
                  disabled
                  className="opacity-50 hover:opacity-100 disabled:opacity-30 cursor-pointer"
                >
                  NEXT &gt;
                </button>
              </div>
            </div>

          </div>

        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: VENDORS MASTER REGISTER (MATCHING SCREENSHOT 2)                      */}
      {/* ========================================================================= */}
      {activeTab === 'VENDORS' && (
        <div className="space-y-4">
          
          <div className="flex items-center gap-2">
            <div>
              <div className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400">REGISTER</div>
              <div className="flex items-center gap-3">
                <h1 className={`text-3xl font-extrabold tracking-tight ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                  Vendors
                </h1>
                <button 
                  onClick={() => setSearchTerm('')}
                  title="Refresh Register"
                  className={`p-1.5 rounded-full border transition-all cursor-pointer ${
                    isDarkMode ? 'border-slate-800 bg-slate-900 text-slate-400 hover:text-white' : 'border-slate-200 bg-white text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex-1 min-w-[240px] max-w-xl relative">
              <input
                type="text"
                placeholder="Search..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className={`w-full px-4 py-2.5 rounded-2xl border text-xs outline-none transition-all ${
                  isDarkMode 
                    ? 'bg-slate-900/90 border-slate-800 text-white placeholder:text-slate-500 focus:border-orange-500' 
                    : 'bg-white border-slate-200 text-slate-900 placeholder:text-slate-400 focus:border-orange-600 shadow-xs'
                }`}
              />
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={openAddVendorModal}
                className="px-4 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-500 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-md shadow-orange-600/20 transition-all hover:scale-[1.01]"
              >
                <Plus className="w-4 h-4" />
                <span>New Vendor</span>
              </button>

              <button
                onClick={() => handleExportCSV('VENDORS')}
                className="px-4 py-2.5 rounded-xl border border-orange-600 text-orange-600 dark:text-orange-400 hover:bg-orange-500/10 font-bold text-xs flex items-center gap-1.5 cursor-pointer transition-all"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export</span>
              </button>

              <button
                onClick={() => setShowColumnsMenu(!showColumnsMenu)}
                className={`px-3.5 py-2.5 rounded-xl border font-bold text-xs flex items-center gap-1.5 cursor-pointer transition-all ${
                  isDarkMode ? 'border-slate-800 bg-slate-900 text-slate-300 hover:text-white' : 'border-slate-200 bg-white text-slate-700'
                }`}
              >
                <Columns className="w-3.5 h-3.5" />
                <span>Columns</span>
                <ChevronDown className="w-3 h-3 opacity-60" />
              </button>
            </div>
          </div>

          <div className={`rounded-2xl border overflow-hidden transition-all shadow-sm ${
            isDarkMode ? 'bg-slate-900/80 border-slate-800/80' : 'bg-white border-slate-200'
          }`}>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className={`border-b font-mono text-[11px] ${
                    isDarkMode ? 'bg-slate-950/60 border-slate-800 text-slate-400' : 'bg-slate-50 border-slate-200 text-slate-500'
                  }`}>
                    <th className="py-3 px-4 font-normal">Code</th>
                    <th className="py-3 px-4 font-normal">Name</th>
                    <th className="py-3 px-4 font-normal">GSTIN</th>
                    <th className="py-3 px-4 font-normal">City</th>
                    <th className="py-3 px-4 font-normal">State</th>
                    <th className="py-3 px-4 font-normal">Payment Terms</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800/80">
                  {filteredVendors.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-16 text-center text-slate-400 font-mono text-xs uppercase tracking-widest">
                        NO RECORDS
                      </td>
                    </tr>
                  ) : (
                    filteredVendors.map((v, idx) => (
                      <tr 
                        key={idx} 
                        className={`transition-colors ${
                          isDarkMode ? 'hover:bg-slate-800/50 text-slate-200' : 'hover:bg-slate-50 text-slate-800'
                        }`}
                      >
                        <td className="py-3.5 px-4 font-mono font-bold text-slate-900 dark:text-slate-100">{v.code}</td>
                        <td className="py-3.5 px-4 font-medium">{v.name}</td>
                        <td className="py-3.5 px-4 font-mono text-slate-500 dark:text-slate-400">{v.gstin}</td>
                        <td className="py-3.5 px-4">{v.city}</td>
                        <td className="py-3.5 px-4">{v.state}</td>
                        <td className="py-3.5 px-4 font-mono">{v.paymentTerms}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className={`px-4 py-2.5 border-t flex flex-wrap items-center justify-between gap-3 text-[11px] font-mono ${
              isDarkMode ? 'bg-slate-950/40 border-slate-800/80 text-slate-400' : 'bg-slate-50/80 border-slate-200 text-slate-600'
            }`}>
              <div className="flex items-center gap-4">
                <span>GRID_METRICS: [0 .. {filteredVendors.length}] OF {filteredVendors.length} REC</span>
                <span className="opacity-40">|</span>
                <div className="flex items-center gap-1">
                  <span>LIMIT:</span>
                  <select
                    value={limitPerPage}
                    onChange={(e) => setLimitPerPage(Number(e.target.value))}
                    className={`px-2 py-0.5 rounded border text-[11px] font-mono outline-none cursor-pointer ${
                      isDarkMode ? 'bg-slate-900 border-slate-800 text-slate-200' : 'bg-white border-slate-300 text-slate-800'
                    }`}
                  >
                    <option value={25}>25 / PAGE</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <button disabled className="opacity-30 cursor-not-allowed">&lt; PREV</button>
                <span>PAGE 1 / 1</span>
                <button disabled className="opacity-30 cursor-not-allowed">NEXT &gt;</button>
              </div>
            </div>

          </div>

        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: MACHINES MASTER REGISTER (MATCHING SCREENSHOT 3)                     */}
      {/* ========================================================================= */}
      {activeTab === 'MACHINES' && (
        <div className="space-y-4">
          
          <div className="flex items-center gap-2">
            <div>
              <div className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400">REGISTER</div>
              <div className="flex items-center gap-3">
                <h1 className={`text-3xl font-extrabold tracking-tight ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                  Machines
                </h1>
                <button 
                  onClick={() => setSearchTerm('')}
                  title="Refresh Register"
                  className={`p-1.5 rounded-full border transition-all cursor-pointer ${
                    isDarkMode ? 'border-slate-800 bg-slate-900 text-slate-400 hover:text-white' : 'border-slate-200 bg-white text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex-1 min-w-[240px] max-w-xl relative">
              <input
                type="text"
                placeholder="Search..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className={`w-full px-4 py-2.5 rounded-2xl border text-xs outline-none transition-all ${
                  isDarkMode 
                    ? 'bg-slate-900/90 border-slate-800 text-white placeholder:text-slate-500 focus:border-orange-500' 
                    : 'bg-white border-slate-200 text-slate-900 placeholder:text-slate-400 focus:border-orange-600 shadow-xs'
                }`}
              />
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={openAddMachineModal}
                className="px-4 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-500 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-md shadow-orange-600/20 transition-all hover:scale-[1.01]"
              >
                <Plus className="w-4 h-4" />
                <span>New Machine</span>
              </button>

              <button
                onClick={() => setShowColumnsMenu(!showColumnsMenu)}
                className={`px-3.5 py-2.5 rounded-xl border font-bold text-xs flex items-center gap-1.5 cursor-pointer transition-all ${
                  isDarkMode ? 'border-slate-800 bg-slate-900 text-slate-300 hover:text-white' : 'border-slate-200 bg-white text-slate-700'
                }`}
              >
                <Columns className="w-3.5 h-3.5" />
                <span>Columns</span>
                <ChevronDown className="w-3 h-3 opacity-60" />
              </button>
            </div>
          </div>

          <div className={`rounded-2xl border overflow-hidden transition-all shadow-sm ${
            isDarkMode ? 'bg-slate-900/80 border-slate-800/80' : 'bg-white border-slate-200'
          }`}>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className={`border-b font-mono text-[11px] ${
                    isDarkMode ? 'bg-slate-950/60 border-slate-800 text-slate-400' : 'bg-slate-50 border-slate-200 text-slate-500'
                  }`}>
                    <th className="py-3 px-4 font-normal">Code</th>
                    <th className="py-3 px-4 font-normal">Name</th>
                    <th className="py-3 px-4 font-normal">Type</th>
                    <th className="py-3 px-4 font-normal">Status</th>
                    <th className="py-3 px-4 font-normal">Hourly Cost</th>
                    <th className="py-3 px-4 font-normal">Active</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800/80">
                  {filteredMachines.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-slate-400 font-mono text-xs uppercase tracking-widest">
                        NO RECORDS
                      </td>
                    </tr>
                  ) : (
                    filteredMachines.map((m, idx) => (
                      <tr 
                        key={idx} 
                        className={`transition-colors ${
                          isDarkMode ? 'hover:bg-slate-800/50 text-slate-200' : 'hover:bg-slate-50 text-slate-800'
                        }`}
                      >
                        <td className="py-3.5 px-4 font-mono font-bold text-slate-900 dark:text-slate-100">{m.code}</td>
                        <td className="py-3.5 px-4 font-medium">{m.name}</td>
                        <td className="py-3.5 px-4">{m.type}</td>
                        <td className="py-3.5 px-4 font-mono text-slate-400">{m.status || '—'}</td>
                        <td className="py-3.5 px-4 font-mono">₹{m.hourlyCost}</td>
                        <td className="py-3.5 px-4 font-mono">{m.active ? 'Yes' : 'No'}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className={`px-4 py-2.5 border-t flex flex-wrap items-center justify-between gap-3 text-[11px] font-mono ${
              isDarkMode ? 'bg-slate-950/40 border-slate-800/80 text-slate-400' : 'bg-slate-50/80 border-slate-200 text-slate-600'
            }`}>
              <div className="flex items-center gap-4">
                <span>GRID_METRICS: [1 .. {filteredMachines.length}] OF {filteredMachines.length} REC</span>
                <span className="opacity-40">|</span>
                <div className="flex items-center gap-1">
                  <span>LIMIT:</span>
                  <select
                    value={limitPerPage}
                    onChange={(e) => setLimitPerPage(Number(e.target.value))}
                    className={`px-2 py-0.5 rounded border text-[11px] font-mono outline-none cursor-pointer ${
                      isDarkMode ? 'bg-slate-900 border-slate-800 text-slate-200' : 'bg-white border-slate-300 text-slate-800'
                    }`}
                  >
                    <option value={25}>25 / PAGE</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <button disabled className="opacity-30 cursor-not-allowed">&lt; PREV</button>
                <span>PAGE 1 / 1</span>
                <button disabled className="opacity-30 cursor-not-allowed">NEXT &gt;</button>
              </div>
            </div>

          </div>

        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: IMPORT FROM OMGST (MATCHING SCREENSHOT 4)                            */}
      {/* ========================================================================= */}
      {activeTab === 'IMPORT_OMGST' && (
        <div className="space-y-6 max-w-5xl">
          
          <div>
            <h1 className={`text-2xl font-bold tracking-tight ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
              Import from OMGST
            </h1>
            <p className={`text-xs mt-1 leading-relaxed ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
              Upload master table exports (.DBF) from OMGST, review the changes, then commit. Safe to repeat — existing records are matched by code and updated, never duplicated.
            </p>
          </div>

          {/* Hidden File Input */}
          <input
            type="file"
            ref={fileInputRef}
            accept=".dbf,.DBF"
            multiple
            onChange={handleFileUpload}
            className="hidden"
          />

          {/* Step 1: Upload Files */}
          <div className={`p-6 rounded-2xl border space-y-4 shadow-sm ${
            isDarkMode ? 'bg-slate-900/80 border-slate-800/80' : 'bg-white border-slate-200'
          }`}>
            <div className="text-[11px] font-mono font-bold uppercase tracking-wider text-slate-400">
              1. UPLOAD FILES
            </div>

            <div>
              <label className="block text-[10px] font-mono uppercase font-bold text-slate-400 mb-1.5">
                FILE CONTAINS
              </label>
              <div className="flex flex-wrap items-center gap-3">
                <select
                  value={omgstFileType}
                  onChange={(e) => setOmgstFileType(e.target.value)}
                  className={`px-3.5 py-2.5 rounded-xl border text-xs font-semibold outline-none cursor-pointer min-w-[200px] ${
                    isDarkMode ? 'bg-slate-950 border-slate-800 text-slate-200' : 'bg-slate-50 border-slate-200 text-slate-800'
                  }`}
                >
                  <option value="Detect from filename">Detect from filename</option>
                  <option value="itemmast.dbf">Item Master (itemmast.dbf)</option>
                  <option value="custmast.dbf">Customer Master (custmast.dbf)</option>
                  <option value="vendmast.dbf">Vendor Master (vendmast.dbf)</option>
                  <option value="machmast.dbf">Machine Master (machmast.dbf)</option>
                </select>

                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className={`px-4 py-2.5 rounded-xl border font-bold text-xs flex items-center gap-2 cursor-pointer transition-all ${
                    isDarkMode 
                      ? 'border-slate-700 bg-slate-800/80 text-white hover:bg-slate-700' 
                      : 'border-slate-300 bg-slate-100 text-slate-800 hover:bg-slate-200'
                  }`}
                >
                  <Upload className="w-3.5 h-3.5 text-orange-500" />
                  <span>Select .DBF files</span>
                </button>
              </div>
            </div>

            <p className="text-[11px] text-slate-400 font-mono leading-relaxed">
              Only .DBF table files are needed — index and dictionary files (.CDX, .DCX, .FCT) can be left out. Standard OMGST filenames (itemmast, scmast, ...) are recognised automatically; for anything else, choose what the file contains first.
            </p>
          </div>

          {/* Step 2: Review Changes */}
          <div className={`p-6 rounded-2xl border space-y-4 shadow-sm ${
            isDarkMode ? 'bg-slate-900/80 border-slate-800/80' : 'bg-white border-slate-200'
          }`}>
            <div className="flex items-center justify-between">
              <div className="text-[11px] font-mono font-bold uppercase tracking-wider text-slate-400">
                2. REVIEW CHANGES
              </div>

              <button
                disabled={uploadedFiles.length === 0}
                className={`px-4 py-2 rounded-xl text-xs font-bold border transition-all ${
                  uploadedFiles.length > 0
                    ? isDarkMode ? 'border-slate-700 bg-slate-800 text-white cursor-pointer' : 'border-slate-300 bg-slate-100 text-slate-900 cursor-pointer'
                    : 'opacity-40 border-slate-800 text-slate-500 cursor-not-allowed'
                }`}
              >
                Preview changes
              </button>
            </div>

            {uploadedFiles.length === 0 ? (
              <p className="text-xs text-slate-400 font-mono py-2">
                Upload at least one file to continue.
              </p>
            ) : (
              <div className="space-y-3">
                {uploadedFiles.map((file, i) => (
                  <div key={i} className={`p-4 rounded-xl border flex items-center justify-between text-xs font-mono ${
                    isDarkMode ? 'bg-slate-950/80 border-slate-800 text-slate-200' : 'bg-slate-50 border-slate-200 text-slate-800'
                  }`}>
                    <div className="flex items-center gap-3">
                      <FileText className="w-5 h-5 text-orange-500" />
                      <div>
                        <div className="font-bold text-white">{file.name}</div>
                        <div className="text-[10px] text-slate-400">
                          Detected Target: <span className="text-orange-400 font-bold">{file.parsedType}</span> • {(file.size / 1024).toFixed(1)} KB
                        </div>
                      </div>
                    </div>
                    <div className="text-emerald-400 font-bold">
                      {file.recordsCount} records ready
                    </div>
                  </div>
                ))}
              </div>
            )}

            {importStatus && (
              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-mono text-xs flex items-center gap-2">
                <Check className="w-4 h-4" />
                <span>{importStatus}</span>
              </div>
            )}
          </div>

          {/* Commit Import Button at Bottom Right */}
          <div className="flex justify-end pt-2">
            <button
              onClick={handleCommitImport}
              disabled={uploadedFiles.length === 0}
              className={`px-6 py-3 rounded-xl font-bold text-xs shadow-lg transition-all ${
                uploadedFiles.length > 0
                  ? 'bg-orange-500 hover:bg-orange-400 text-white cursor-pointer shadow-orange-500/20'
                  : 'bg-orange-400/50 text-white/70 cursor-not-allowed'
              }`}
            >
              Commit Import
            </button>
          </div>

        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 5: ITEMS MASTER REGISTER (EXISTING SKU LIST)                           */}
      {/* ========================================================================= */}
      {activeTab === 'ITEMS' && (
        <div className="space-y-4">
          
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className={`text-xl font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                Master Items & SKU Directory
              </h2>
              <p className="text-xs text-slate-400">
                Maintain SKU product codes, store locations, and rates.
              </p>
            </div>

            <button
              onClick={() => setShowAddItemModal(true)}
              className="px-4 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-500 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-md"
            >
              <Plus className="w-4 h-4" />
              <span>Add Master Item</span>
            </button>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex-1 min-w-[240px] max-w-xl relative">
              <input
                type="text"
                placeholder="Search master items by code, part no, or description..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className={`w-full px-4 py-2.5 rounded-2xl border text-xs outline-none transition-all ${
                  isDarkMode 
                    ? 'bg-slate-900/90 border-slate-800 text-white placeholder:text-slate-500 focus:border-orange-500' 
                    : 'bg-white border-slate-200 text-slate-900 placeholder:text-slate-400 focus:border-orange-600'
                }`}
              />
            </div>

            <button
              onClick={() => handleExportCSV('ITEMS')}
              className="px-4 py-2.5 rounded-xl border border-orange-600 text-orange-600 dark:text-orange-400 hover:bg-orange-500/10 font-bold text-xs flex items-center gap-1.5 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export CSV</span>
            </button>
          </div>

          <div className={`rounded-2xl border overflow-hidden transition-all shadow-sm ${
            isDarkMode ? 'bg-slate-900/80 border-slate-800/80' : 'bg-white border-slate-200'
          }`}>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className={`border-b font-mono text-[11px] ${
                    isDarkMode ? 'bg-slate-950/60 border-slate-800 text-slate-400' : 'bg-slate-50 border-slate-200 text-slate-500'
                  }`}>
                    <th className="py-3 px-4 font-normal">Code</th>
                    <th className="py-3 px-4 font-normal">Part No</th>
                    <th className="py-3 px-4 font-normal">Description</th>
                    <th className="py-3 px-4 font-normal">Type</th>
                    <th className="py-3 px-4 font-normal">HSN Code</th>
                    <th className="py-3 px-4 font-normal">Rack Location</th>
                    <th className="py-3 px-4 font-normal">Sale Rate</th>
                    <th className="py-3 px-4 font-normal">Purchase Rate</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800/80">
                  {filteredItems.map((item, idx) => (
                    <tr key={idx} className={`transition-colors ${
                      isDarkMode ? 'hover:bg-slate-800/50 text-slate-200' : 'hover:bg-slate-50 text-slate-800'
                    }`}>
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-900 dark:text-slate-100">{item.code}</td>
                      <td className="py-3.5 px-4 font-mono text-slate-400">{item.partNo}</td>
                      <td className="py-3.5 px-4 font-medium">{item.description}</td>
                      <td className="py-3.5 px-4">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold font-mono ${
                          item.isFinishedGoods ? 'bg-emerald-500/20 text-emerald-400' : 'bg-purple-500/20 text-purple-400'
                        }`}>
                          {item.isFinishedGoods ? 'FG' : 'RAW'}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-mono">{item.hsnCode}</td>
                      <td className="py-3.5 px-4 font-mono">{item.storeLocation}</td>
                      <td className="py-3.5 px-4 font-mono text-emerald-400 font-bold">₹{item.saleRate}</td>
                      <td className="py-3.5 px-4 font-mono text-slate-400">₹{item.purchaseRate}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 1: NEW CUSTOMER MASTER FORM (Image 2 Workbook Spec)                 */}
      {/* ========================================================================= */}
      {showAddCustomerModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-md font-sans">
          <div className={`relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl border shadow-2xl transition-all ${
            isDarkMode ? 'bg-[#16171B] text-white border-slate-800' : 'bg-white text-slate-900 border-slate-200'
          }`}>
            
            {/* Modal Header */}
            <div className={`sticky top-0 z-10 p-6 border-b flex items-center justify-between backdrop-blur-md ${
              isDarkMode ? 'border-slate-800 bg-[#16171B]/90' : 'border-slate-100 bg-white/90'
            }`}>
              <div>
                <div className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#5B75F8]">
                  FOCUSED ACTION
                </div>
                <h2 className={`text-xl font-bold tracking-tight ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                  New Customer Master
                </h2>
              </div>

              <button
                type="button"
                onClick={() => setShowAddCustomerModal(false)}
                className={`p-2 rounded-2xl border transition-all cursor-pointer ${
                  isDarkMode 
                    ? 'border-slate-800 bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800' 
                    : 'border-slate-200 bg-slate-50 text-slate-500 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSaveCustomer} className="p-6 space-y-4 text-xs font-mono">
              
              {/* Category & Machine-Made Code Rule Panel */}
              <div className={`p-4 rounded-2xl border ${
                isDarkMode ? 'bg-slate-900/90 border-slate-700/80' : 'bg-slate-50 border-slate-200'
              } space-y-3`}>
                <div className="flex items-center justify-between">
                  <span className="text-[11px] uppercase font-bold text-[#5B75F8] flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                    <span>CUSTOMER CATEGORY & MACHINE CODE RULE</span>
                  </span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-bold border border-emerald-500/30">
                    Non-Repeating Sequence
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] uppercase font-bold text-slate-300 mb-1">
                      CUSTOMER CATEGORY / PREFIX *
                    </label>
                    <select
                      value={cCategory}
                      onChange={(e) => handleCustomerCategoryChange(e.target.value)}
                      className={`w-full px-4 py-2.5 rounded-xl border text-xs font-mono font-bold outline-none cursor-pointer ${
                        isDarkMode 
                          ? 'bg-slate-950 border-slate-700 text-white focus:border-[#5B75F8]' 
                          : 'bg-white border-slate-300 text-slate-900 focus:border-[#5B75F8]'
                      }`}
                    >
                      {CUSTOMER_DEPARTMENTS.map((d) => (
                        <option key={d.code} value={d.code}>
                          {d.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-[11px] uppercase font-bold text-slate-300">
                        CUSTOMER CODE *
                      </label>
                      <button
                        type="button"
                        onClick={() => setCCode(generateCustomerCode(cCategory))}
                        className="text-[10px] text-amber-400 hover:text-amber-300 font-bold flex items-center gap-1 cursor-pointer"
                      >
                        <Zap className="w-3 h-3 fill-amber-400 animate-pulse" />
                        <span>Auto-Generate</span>
                      </button>
                    </div>
                    <input
                      type="text"
                      required
                      value={cCode}
                      onChange={(e) => setCCode(e.target.value)}
                      placeholder="e.g. OEM-001"
                      className={`w-full px-4 py-2.5 rounded-xl border text-xs font-mono font-bold outline-none transition-all ${
                        isDarkMode 
                          ? 'bg-slate-950 border-slate-700 text-emerald-400 focus:border-[#5B75F8]' 
                          : 'bg-white border-slate-300 text-emerald-700 focus:border-[#5B75F8]'
                      }`}
                    />
                  </div>
                </div>
              </div>

              {/* Names */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] uppercase font-bold text-slate-400 mb-1.5">
                    CUSTOMER NAME (TRADE NAME) *
                  </label>
                  <input
                    type="text"
                    required
                    value={cName}
                    onChange={(e) => setCName(e.target.value)}
                    placeholder="e.g. Liebherr CMCtec India Pvt Ltd"
                    className={`w-full px-4 py-3 rounded-2xl border text-xs font-mono outline-none ${
                      isDarkMode ? 'bg-slate-950/80 border-slate-800 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                    }`}
                  />
                </div>

                <div>
                  <label className="block text-[11px] uppercase font-bold text-slate-400 mb-1.5">
                    LEGAL REGISTERED NAME
                  </label>
                  <input
                    type="text"
                    value={cLegalName}
                    onChange={(e) => setCLegalName(e.target.value)}
                    placeholder="Full legal name if different"
                    className={`w-full px-4 py-3 rounded-2xl border text-xs font-mono outline-none ${
                      isDarkMode ? 'bg-slate-950/80 border-slate-800 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                    }`}
                  />
                </div>
              </div>

              {/* GSTIN, PAN */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] uppercase font-bold text-slate-400 mb-1.5">
                    GSTIN (15-CHARACTER) *
                  </label>
                  <input
                    type="text"
                    required
                    value={cGstin}
                    onChange={(e) => setCGstin(e.target.value.toUpperCase())}
                    placeholder="e.g. 27AABCL1234M1ZP"
                    className={`w-full px-4 py-3 rounded-2xl border text-xs font-mono outline-none ${
                      isDarkMode ? 'bg-slate-950/80 border-slate-800 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                    }`}
                  />
                </div>

                <div>
                  <label className="block text-[11px] uppercase font-bold text-slate-400 mb-1.5">
                    PAN (10-CHARACTER) *
                  </label>
                  <input
                    type="text"
                    required
                    value={cPan}
                    onChange={(e) => setCPan(e.target.value.toUpperCase())}
                    placeholder="e.g. AABCL1234M"
                    className={`w-full px-4 py-3 rounded-2xl border text-xs font-mono outline-none ${
                      isDarkMode ? 'bg-slate-950/80 border-slate-800 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                    }`}
                  />
                </div>
              </div>

              {/* Contact, Mobile, Email */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-[11px] uppercase font-bold text-slate-400 mb-1.5">
                    CONTACT PERSON
                  </label>
                  <input
                    type="text"
                    value={cContactPerson}
                    onChange={(e) => setCContactPerson(e.target.value)}
                    placeholder="e.g. Rajeev Menon"
                    className={`w-full px-4 py-3 rounded-2xl border text-xs font-mono outline-none ${
                      isDarkMode ? 'bg-slate-950/80 border-slate-800 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                    }`}
                  />
                </div>

                <div>
                  <label className="block text-[11px] uppercase font-bold text-slate-400 mb-1.5">
                    MOBILE PHONE *
                  </label>
                  <input
                    type="text"
                    required
                    value={cMobile}
                    onChange={(e) => setCMobile(e.target.value)}
                    placeholder="e.g. 9822011234"
                    className={`w-full px-4 py-3 rounded-2xl border text-xs font-mono outline-none ${
                      isDarkMode ? 'bg-slate-950/80 border-slate-800 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                    }`}
                  />
                </div>

                <div>
                  <label className="block text-[11px] uppercase font-bold text-slate-400 mb-1.5">
                    EMAIL ADDRESS
                  </label>
                  <input
                    type="email"
                    value={cEmail}
                    onChange={(e) => setCEmail(e.target.value)}
                    placeholder="e.g. rajeev@liebherr.com"
                    className={`w-full px-4 py-3 rounded-2xl border text-xs font-mono outline-none ${
                      isDarkMode ? 'bg-slate-950/80 border-slate-800 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                    }`}
                  />
                </div>
              </div>

              {/* Billing Address */}
              <div>
                <label className="block text-[11px] uppercase font-bold text-slate-400 mb-1.5">
                  BILLING ADDRESS *
                </label>
                <input
                  type="text"
                  required
                  value={cBillingAddress}
                  onChange={(e) => setCBillingAddress(e.target.value)}
                  placeholder="e.g. Plot 12, MIDC Chakan, Pune"
                  className={`w-full px-4 py-3 rounded-2xl border text-xs font-mono outline-none ${
                    isDarkMode ? 'bg-slate-950/80 border-slate-800 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                  }`}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-[11px] uppercase font-bold text-slate-400 mb-1.5">CITY *</label>
                  <input
                    type="text"
                    required
                    value={cCity}
                    onChange={(e) => setCCity(e.target.value)}
                    placeholder="e.g. Pune"
                    className={`w-full px-4 py-3 rounded-2xl border text-xs font-mono outline-none ${
                      isDarkMode ? 'bg-slate-950/80 border-slate-800 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                    }`}
                  />
                </div>

                <div>
                  <label className="block text-[11px] uppercase font-bold text-slate-400 mb-1.5">STATE *</label>
                  <input
                    type="text"
                    required
                    value={cState}
                    onChange={(e) => setCState(e.target.value)}
                    placeholder="e.g. Maharashtra"
                    className={`w-full px-4 py-3 rounded-2xl border text-xs font-mono outline-none ${
                      isDarkMode ? 'bg-slate-950/80 border-slate-800 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                    }`}
                  />
                </div>

                <div>
                  <label className="block text-[11px] uppercase font-bold text-slate-400 mb-1.5">PINCODE</label>
                  <input
                    type="text"
                    value={cPincode}
                    onChange={(e) => setCPincode(e.target.value)}
                    placeholder="e.g. 410501"
                    className={`w-full px-4 py-3 rounded-2xl border text-xs font-mono outline-none ${
                      isDarkMode ? 'bg-slate-950/80 border-slate-800 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                    }`}
                  />
                </div>
              </div>

              {/* Payment & Credit Terms */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-[11px] uppercase font-bold text-slate-400 mb-1.5">PAYMENT TERMS</label>
                  <select
                    value={cPaymentTerms}
                    onChange={(e) => setCPaymentTerms(e.target.value)}
                    className={`w-full px-4 py-3 rounded-2xl border text-xs font-mono outline-none cursor-pointer ${
                      isDarkMode ? 'bg-slate-950/80 border-slate-800 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                    }`}
                  >
                    <option value="Advance">Advance</option>
                    <option value="Net 15">Net 15 Days</option>
                    <option value="Net 30">Net 30 Days</option>
                    <option value="Net 45">Net 45 Days</option>
                    <option value="Net 60">Net 60 Days</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] uppercase font-bold text-slate-400 mb-1.5">CREDIT DAYS</label>
                  <input
                    type="number"
                    value={cCreditDays}
                    onChange={(e) => setCCreditDays(Number(e.target.value))}
                    className={`w-full px-4 py-3 rounded-2xl border text-xs font-mono outline-none ${
                      isDarkMode ? 'bg-slate-950/80 border-slate-800 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                    }`}
                  />
                </div>

                <div>
                  <label className="block text-[11px] uppercase font-bold text-slate-400 mb-1.5">CREDIT LIMIT (₹)</label>
                  <input
                    type="number"
                    value={cCreditLimit}
                    onChange={(e) => setCCreditLimit(Number(e.target.value))}
                    className={`w-full px-4 py-3 rounded-2xl border text-xs font-mono outline-none ${
                      isDarkMode ? 'bg-slate-950/80 border-slate-800 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                    }`}
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-800/80">
                <button
                  type="button"
                  onClick={() => setShowAddCustomerModal(false)}
                  className={`px-5 py-2.5 rounded-2xl border font-bold text-xs cursor-pointer transition-all ${
                    isDarkMode ? 'border-slate-800 bg-slate-950 text-slate-400 hover:text-white' : 'border-slate-200 bg-slate-50 text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-2xl bg-gradient-to-r from-[#5B75F8] to-[#4F6BF5] hover:from-[#4F6BF5] hover:to-[#3B59E5] text-white font-bold text-xs cursor-pointer shadow-lg shadow-[#5B75F8]/20 transition-all hover:scale-[1.01]"
                >
                  Save Customer
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: NEW VENDOR MASTER FORM (Image 2 Workbook Spec)                   */}
      {/* ========================================================================= */}
      {showAddVendorModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-md font-sans">
          <div className={`relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl border shadow-2xl transition-all ${
            isDarkMode ? 'bg-[#16171B] text-white border-slate-800' : 'bg-white text-slate-900 border-slate-200'
          }`}>
            
            {/* Header */}
            <div className={`sticky top-0 z-10 p-6 border-b flex items-center justify-between backdrop-blur-md ${
              isDarkMode ? 'border-slate-800 bg-[#16171B]/90' : 'border-slate-100 bg-white/90'
            }`}>
              <div>
                <div className="text-[10px] font-mono font-bold uppercase tracking-wider text-orange-500">
                  FOCUSED ACTION
                </div>
                <h2 className={`text-xl font-bold tracking-tight ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                  New Vendor Master
                </h2>
              </div>

              <button
                type="button"
                onClick={() => setShowAddVendorModal(false)}
                className={`p-2 rounded-2xl border transition-all cursor-pointer ${
                  isDarkMode 
                    ? 'border-slate-800 bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800' 
                    : 'border-slate-200 bg-slate-50 text-slate-500 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSaveVendor} className="p-6 space-y-4 text-xs font-mono">
              
              {/* Category & Machine-Made Code Rule Panel */}
              <div className={`p-4 rounded-2xl border ${
                isDarkMode ? 'bg-slate-900/90 border-slate-700/80' : 'bg-slate-50 border-slate-200'
              } space-y-3`}>
                <div className="flex items-center justify-between">
                  <span className="text-[11px] uppercase font-bold text-orange-500 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                    <span>VENDOR DEPARTMENT & MACHINE CODE RULE</span>
                  </span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-bold border border-emerald-500/30">
                    Non-Repeating Sequence
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] uppercase font-bold text-slate-300 mb-1">
                      VENDOR DEPARTMENT / PREFIX *
                    </label>
                    <select
                      value={vCategory}
                      onChange={(e) => handleVendorCategoryChange(e.target.value)}
                      className={`w-full px-4 py-2.5 rounded-xl border text-xs font-mono font-bold outline-none cursor-pointer ${
                        isDarkMode 
                          ? 'bg-slate-950 border-slate-700 text-white focus:border-orange-500' 
                          : 'bg-white border-slate-300 text-slate-900 focus:border-orange-500'
                      }`}
                    >
                      {VENDOR_DEPARTMENTS.map((d) => (
                        <option key={d.code} value={d.code}>
                          {d.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-[11px] uppercase font-bold text-slate-300">
                        VENDOR CODE *
                      </label>
                      <button
                        type="button"
                        onClick={() => setVCode(generateVendorCode(vCategory))}
                        className="text-[10px] text-amber-400 hover:text-amber-300 font-bold flex items-center gap-1 cursor-pointer"
                      >
                        <Zap className="w-3 h-3 fill-amber-400 animate-pulse" />
                        <span>Auto-Generate</span>
                      </button>
                    </div>
                    <input
                      type="text"
                      required
                      value={vCode}
                      onChange={(e) => setVCode(e.target.value)}
                      placeholder="e.g. RAW-001"
                      className={`w-full px-4 py-2.5 rounded-xl border text-xs font-mono font-bold outline-none transition-all ${
                        isDarkMode 
                          ? 'bg-slate-950 border-slate-700 text-emerald-400 focus:border-orange-500' 
                          : 'bg-white border-slate-300 text-emerald-700 focus:border-orange-500'
                      }`}
                    />
                  </div>
                </div>
              </div>

              {/* Names */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] uppercase font-bold text-slate-400 mb-1.5">
                    VENDOR NAME (TRADE NAME) *
                  </label>
                  <input
                    type="text"
                    required
                    value={vName}
                    onChange={(e) => setVName(e.target.value)}
                    placeholder="e.g. Shree Steel Suppliers"
                    className={`w-full px-4 py-3 rounded-2xl border text-xs font-mono outline-none ${
                      isDarkMode ? 'bg-slate-950/80 border-slate-800 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                    }`}
                  />
                </div>

                <div>
                  <label className="block text-[11px] uppercase font-bold text-slate-400 mb-1.5">
                    LEGAL REGISTERED NAME
                  </label>
                  <input
                    type="text"
                    value={vLegalName}
                    onChange={(e) => setVLegalName(e.target.value)}
                    placeholder="Full legal company name"
                    className={`w-full px-4 py-3 rounded-2xl border text-xs font-mono outline-none ${
                      isDarkMode ? 'bg-slate-950/80 border-slate-800 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                    }`}
                  />
                </div>
              </div>

              {/* GSTIN, PAN */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] uppercase font-bold text-slate-400 mb-1.5">
                    GSTIN (15-CHARACTER) *
                  </label>
                  <input
                    type="text"
                    required
                    value={vGstin}
                    onChange={(e) => setVGstin(e.target.value.toUpperCase())}
                    placeholder="e.g. 27AAAFS1111A1Z1"
                    className={`w-full px-4 py-3 rounded-2xl border text-xs font-mono outline-none ${
                      isDarkMode ? 'bg-slate-950/80 border-slate-800 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                    }`}
                  />
                </div>

                <div>
                  <label className="block text-[11px] uppercase font-bold text-slate-400 mb-1.5">
                    PAN (10-CHARACTER) *
                  </label>
                  <input
                    type="text"
                    required
                    value={vPan}
                    onChange={(e) => setVPan(e.target.value.toUpperCase())}
                    placeholder="e.g. AAAFS1111A"
                    className={`w-full px-4 py-3 rounded-2xl border text-xs font-mono outline-none ${
                      isDarkMode ? 'bg-slate-950/80 border-slate-800 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                    }`}
                  />
                </div>
              </div>

              {/* Contact, Mobile, Email */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-[11px] uppercase font-bold text-slate-400 mb-1.5">
                    CONTACT PERSON
                  </label>
                  <input
                    type="text"
                    value={vContactPerson}
                    onChange={(e) => setVContactPerson(e.target.value)}
                    placeholder="e.g. Mahesh Shetty"
                    className={`w-full px-4 py-3 rounded-2xl border text-xs font-mono outline-none ${
                      isDarkMode ? 'bg-slate-950/80 border-slate-800 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                    }`}
                  />
                </div>

                <div>
                  <label className="block text-[11px] uppercase font-bold text-slate-400 mb-1.5">
                    MOBILE PHONE *
                  </label>
                  <input
                    type="text"
                    required
                    value={vMobile}
                    onChange={(e) => setVMobile(e.target.value)}
                    placeholder="e.g. 9850011111"
                    className={`w-full px-4 py-3 rounded-2xl border text-xs font-mono outline-none ${
                      isDarkMode ? 'bg-slate-950/80 border-slate-800 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                    }`}
                  />
                </div>

                <div>
                  <label className="block text-[11px] uppercase font-bold text-slate-400 mb-1.5">
                    EMAIL ADDRESS
                  </label>
                  <input
                    type="email"
                    value={vEmail}
                    onChange={(e) => setVEmail(e.target.value)}
                    placeholder="e.g. mahesh@shreesteel.com"
                    className={`w-full px-4 py-3 rounded-2xl border text-xs font-mono outline-none ${
                      isDarkMode ? 'bg-slate-950/80 border-slate-800 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                    }`}
                  />
                </div>
              </div>

              {/* Billing Address, City, State, Pincode */}
              <div>
                <label className="block text-[11px] uppercase font-bold text-slate-400 mb-1.5">
                  BILLING ADDRESS *
                </label>
                <input
                  type="text"
                  required
                  value={vBillingAddress}
                  onChange={(e) => setVBillingAddress(e.target.value)}
                  placeholder="e.g. MIDC Bhosari, Pune"
                  className={`w-full px-4 py-3 rounded-2xl border text-xs font-mono outline-none ${
                    isDarkMode ? 'bg-slate-950/80 border-slate-800 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                  }`}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-[11px] uppercase font-bold text-slate-400 mb-1.5">CITY *</label>
                  <input
                    type="text"
                    required
                    value={vCity}
                    onChange={(e) => setVCity(e.target.value)}
                    placeholder="e.g. Pune"
                    className={`w-full px-4 py-3 rounded-2xl border text-xs font-mono outline-none ${
                      isDarkMode ? 'bg-slate-950/80 border-slate-800 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                    }`}
                  />
                </div>

                <div>
                  <label className="block text-[11px] uppercase font-bold text-slate-400 mb-1.5">STATE *</label>
                  <input
                    type="text"
                    required
                    value={vState}
                    onChange={(e) => setVState(e.target.value)}
                    placeholder="e.g. Maharashtra"
                    className={`w-full px-4 py-3 rounded-2xl border text-xs font-mono outline-none ${
                      isDarkMode ? 'bg-slate-950/80 border-slate-800 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                    }`}
                  />
                </div>

                <div>
                  <label className="block text-[11px] uppercase font-bold text-slate-400 mb-1.5">PINCODE</label>
                  <input
                    type="text"
                    value={vPincode}
                    onChange={(e) => setVPincode(e.target.value)}
                    placeholder="e.g. 411026"
                    className={`w-full px-4 py-3 rounded-2xl border text-xs font-mono outline-none ${
                      isDarkMode ? 'bg-slate-950/80 border-slate-800 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                    }`}
                  />
                </div>
              </div>

              {/* Vendor Bank Details Section (Workbook Image 2 requirement) */}
              <div className={`p-4 rounded-2xl border ${
                isDarkMode ? 'bg-slate-950/90 border-slate-800' : 'bg-slate-50 border-slate-200'
              } space-y-3`}>
                <div className="text-[11px] uppercase font-bold text-amber-500">
                  BANKING & PAYMENT DISBURSEMENT DETAILS *
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 mb-1">BANK ACCOUNT NAME *</label>
                    <input
                      type="text"
                      required
                      value={vBankAccountName}
                      onChange={(e) => setVBankAccountName(e.target.value)}
                      placeholder="e.g. Shree Steel Suppliers"
                      className={`w-full px-3 py-2 rounded-xl border text-xs font-mono outline-none ${
                        isDarkMode ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'
                      }`}
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 mb-1">BANK ACCOUNT NUMBER *</label>
                    <input
                      type="text"
                      required
                      value={vBankAccountNumber}
                      onChange={(e) => setVBankAccountNumber(e.target.value)}
                      placeholder="e.g. 5020012345678"
                      className={`w-full px-3 py-2 rounded-xl border text-xs font-mono outline-none ${
                        isDarkMode ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'
                      }`}
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 mb-1">IFSC CODE *</label>
                    <input
                      type="text"
                      required
                      value={vIfsc}
                      onChange={(e) => setVIfsc(e.target.value.toUpperCase())}
                      placeholder="e.g. HDFC0001234"
                      className={`w-full px-3 py-2 rounded-xl border text-xs font-mono outline-none ${
                        isDarkMode ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'
                      }`}
                    />
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-800/80">
                <button
                  type="button"
                  onClick={() => setShowAddVendorModal(false)}
                  className={`px-5 py-2.5 rounded-2xl border font-bold text-xs cursor-pointer transition-all ${
                    isDarkMode ? 'border-slate-800 bg-slate-950 text-slate-400 hover:text-white' : 'border-slate-200 bg-slate-50 text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-2xl bg-orange-600 hover:bg-orange-500 text-white font-bold text-xs cursor-pointer shadow-lg shadow-orange-600/20 transition-all hover:scale-[1.01]"
                >
                  Save Vendor
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: NEW MACHINE FORM                                                  */}
      {/* ========================================================================= */}
      {showAddMachineModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md font-sans">
          <div className={`relative w-full max-w-lg rounded-3xl border shadow-2xl overflow-hidden transition-all ${
            isDarkMode ? 'bg-[#16171B] text-white border-slate-800' : 'bg-white text-slate-900 border-slate-200'
          }`}>
            <div className={`p-6 border-b flex items-center justify-between ${
              isDarkMode ? 'border-slate-800 bg-slate-950/40' : 'border-slate-100 bg-slate-50/80'
            }`}>
              <div>
                <div className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#7B92FF]">FOCUSED ACTION</div>
                <h2 className={`text-xl font-bold tracking-tight ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>New Machine Master</h2>
              </div>
              <button 
                onClick={() => setShowAddMachineModal(false)} 
                className={`p-2 rounded-2xl border transition-all cursor-pointer ${
                  isDarkMode ? 'border-slate-800 bg-slate-950/60 text-slate-400 hover:text-white' : 'border-slate-200 bg-slate-50 text-slate-500 hover:text-slate-900'
                }`}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveMachine} className="p-6 space-y-4 font-mono text-xs">
              <div>
                <label className="block text-[11px] font-bold uppercase text-slate-400 mb-1.5">MACHINE CODE *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. VMC-04"
                  value={mCode}
                  onChange={(e) => setMCode(e.target.value)}
                  className={`w-full px-4 py-3 rounded-2xl border text-xs outline-none ${
                    isDarkMode ? 'bg-slate-950/80 border-slate-800 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                  }`}
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase text-slate-400 mb-1.5">MACHINE NAME *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. VMC 4-axis High Speed"
                  value={mName}
                  onChange={(e) => setMName(e.target.value)}
                  className={`w-full px-4 py-3 rounded-2xl border text-xs outline-none ${
                    isDarkMode ? 'bg-slate-950/80 border-slate-800 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                  }`}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold uppercase text-slate-400 mb-1.5">TYPE</label>
                  <select
                    value={mType}
                    onChange={(e) => setMType(e.target.value)}
                    className={`w-full px-4 py-3 rounded-2xl border text-xs outline-none cursor-pointer ${
                      isDarkMode ? 'bg-slate-950/80 border-slate-800 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                    }`}
                  >
                    <option value="CNC Machining">CNC Machining</option>
                    <option value="Cutting">Cutting</option>
                    <option value="Drilling">Drilling</option>
                    <option value="Turning">Turning</option>
                    <option value="Welding">Welding</option>
                    <option value="Inspection">Inspection</option>
                    <option value="VMC">VMC</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase text-slate-400 mb-1.5">HOURLY COST (₹)</label>
                  <input
                    type="number"
                    value={mHourlyCost}
                    onChange={(e) => setMHourlyCost(Number(e.target.value))}
                    className={`w-full px-4 py-3 rounded-2xl border text-xs outline-none ${
                      isDarkMode ? 'bg-slate-950/80 border-slate-800 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                    }`}
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-800/80">
                <button
                  type="button"
                  onClick={() => setShowAddMachineModal(false)}
                  className={`px-5 py-2.5 rounded-2xl border font-bold text-xs cursor-pointer ${
                    isDarkMode ? 'border-slate-800 bg-slate-950 text-slate-400 hover:text-white' : 'border-slate-200 bg-slate-50 text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-2xl bg-gradient-to-r from-[#5B75F8] to-[#4F6BF5] hover:from-[#4F6BF5] hover:to-[#3B59E5] text-white font-bold text-xs cursor-pointer shadow-lg shadow-[#5B75F8]/20 transition-all hover:scale-[1.01]"
                >
                  Save Machine
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: NEW MASTER ITEM FORM                                              */}
      {/* ========================================================================= */}
      {showAddItemModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md font-sans">
          <div className={`relative w-full max-w-lg rounded-3xl border shadow-2xl overflow-hidden transition-all ${
            isDarkMode ? 'bg-[#16171B] text-white border-slate-800' : 'bg-white text-slate-900 border-slate-200'
          }`}>
            <div className={`p-6 border-b flex items-center justify-between ${
              isDarkMode ? 'border-slate-800 bg-slate-950/40' : 'border-slate-100 bg-slate-50/80'
            }`}>
              <div>
                <div className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#7B92FF]">FOCUSED ACTION</div>
                <h2 className={`text-xl font-bold tracking-tight ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>New Master SKU Item</h2>
              </div>
              <button 
                onClick={() => setShowAddItemModal(false)} 
                className={`p-2 rounded-2xl border transition-all cursor-pointer ${
                  isDarkMode ? 'border-slate-800 bg-slate-950/60 text-slate-400 hover:text-white' : 'border-slate-200 bg-slate-50 text-slate-500 hover:text-slate-900'
                }`}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveItem} className="p-6 space-y-4 font-mono text-xs">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold uppercase text-slate-400 mb-1.5">PART CODE *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 00000020"
                    value={itemCode}
                    onChange={(e) => setItemCode(e.target.value)}
                    className={`w-full px-4 py-3 rounded-2xl border text-xs outline-none ${
                      isDarkMode ? 'bg-slate-950/80 border-slate-800 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                    }`}
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase text-slate-400 mb-1.5">PART NO</label>
                  <input
                    type="text"
                    placeholder="e.g. PART-890"
                    value={partNo}
                    onChange={(e) => setPartNo(e.target.value)}
                    className={`w-full px-4 py-3 rounded-2xl border text-xs outline-none ${
                      isDarkMode ? 'bg-slate-950/80 border-slate-800 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                    }`}
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase text-slate-400 mb-1.5">DESCRIPTION *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. HIGH PRECISION BUSHING AL-7075"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className={`w-full px-4 py-3 rounded-2xl border text-xs outline-none ${
                    isDarkMode ? 'bg-slate-950/80 border-slate-800 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                  }`}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold uppercase text-slate-400 mb-1.5">SALE RATE (₹)</label>
                  <input
                    type="number"
                    value={saleRate}
                    onChange={(e) => setSaleRate(Number(e.target.value))}
                    className={`w-full px-4 py-3 rounded-2xl border text-xs outline-none ${
                      isDarkMode ? 'bg-slate-950/80 border-slate-800 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                    }`}
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase text-slate-400 mb-1.5">PURCHASE RATE (₹)</label>
                  <input
                    type="number"
                    value={purchaseRate}
                    onChange={(e) => setPurchaseRate(Number(e.target.value))}
                    className={`w-full px-4 py-3 rounded-2xl border text-xs outline-none ${
                      isDarkMode ? 'bg-slate-950/80 border-slate-800 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                    }`}
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-800/80">
                <button
                  type="button"
                  onClick={() => setShowAddItemModal(false)}
                  className={`px-5 py-2.5 rounded-2xl border font-bold text-xs cursor-pointer ${
                    isDarkMode ? 'border-slate-800 bg-slate-950 text-slate-400 hover:text-white' : 'border-slate-200 bg-slate-50 text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-2xl bg-gradient-to-r from-[#5B75F8] to-[#4F6BF5] hover:from-[#4F6BF5] hover:to-[#3B59E5] text-white font-bold text-xs cursor-pointer shadow-lg shadow-[#5B75F8]/20 transition-all hover:scale-[1.01]"
                >
                  Save Item
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
