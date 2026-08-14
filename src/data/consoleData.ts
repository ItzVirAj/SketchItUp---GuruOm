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

export const initialOrders: CustomerOrder[] = [
  {
    id: 'ord-1',
    poNo: 'PO-2026-901',
    customerName: 'Larsen & Toubro Ltd',
    poDate: '2026-07-23',
    deliveryDate: '2026-08-25',
    status: 'PARTIALLY_DISPATCHED',
    progressStep: 3,
    grossAmount: 145000.00,
    taxCategory: 'GST 18%',
    remark: 'Priority dispatch requested for Tower Pivoting Section batch',
    lines: [
      {
        id: 'line-1',
        itemCode: '00000003',
        itemDescription: 'TOWER PIVOTING SECTION',
        custPartNo: 'LT-90812450',
        orderQty: 250,
        unit: 'NOS',
        dispatchedQty: 100,
        pendingQty: 150,
        rate: 580.00
      }
    ],
    jobCards: [
      {
        jobNo: 'JC/0002/26-27',
        qty: 250.00,
        targetDate: '2026-08-20',
        status: 'COMPLETED'
      }
    ],
    dispatches: [
      {
        challanNo: 'CHL/0002/26-27',
        items: '00000003 × 100 NOS',
        date: '2026-08-01',
        status: 'DELIVERED'
      }
    ]
  },
  {
    id: 'ord-2',
    poNo: 'PO-2026-880',
    customerName: 'Bharat Heavy Electricals Ltd (BHEL)',
    poDate: '2026-07-15',
    deliveryDate: '2026-08-10',
    status: 'CLOSED',
    progressStep: 6,
    grossAmount: 320000.00,
    taxCategory: 'GST 18%',
    remark: 'Annual contract order fulfilled successfully with zero defects',
    lines: [
      {
        id: 'line-2',
        itemCode: '00000002',
        itemDescription: 'UPPER BLOCK ASSEMBLY',
        custPartNo: 'BHEL-949001',
        orderQty: 400,
        unit: 'NOS',
        dispatchedQty: 400,
        pendingQty: 0,
        rate: 800.00
      }
    ],
    jobCards: [
      {
        jobNo: 'JC/0001/26-27',
        qty: 400.00,
        targetDate: '2026-08-05',
        status: 'COMPLETED'
      }
    ],
    dispatches: [
      {
        challanNo: 'CHL/0001/26-27',
        items: '00000002 × 400 NOS',
        date: '2026-08-08',
        status: 'DELIVERED'
      }
    ]
  },
  {
    id: 'ord-3',
    poNo: 'PO-2026-942',
    customerName: 'Tata Motors Precision Components',
    poDate: '2026-08-02',
    deliveryDate: '2026-08-30',
    status: 'IN_PRODUCTION',
    progressStep: 2,
    grossAmount: 215000.00,
    taxCategory: 'GST 18%',
    remark: 'CNC VMC Machining in progress on Machine-01',
    lines: [
      {
        id: 'line-3',
        itemCode: '00000009',
        itemDescription: 'FLANGE HOUSING AL-6061',
        custPartNo: 'TM-FLG-8091',
        orderQty: 500,
        unit: 'NOS',
        dispatchedQty: 0,
        pendingQty: 500,
        rate: 430.00
      }
    ],
    jobCards: [
      {
        jobNo: 'JC/0003/26-27',
        qty: 500.00,
        targetDate: '2026-08-28',
        status: 'IN_PROGRESS'
      }
    ],
    dispatches: []
  },
  {
    id: 'ord-4',
    poNo: 'PO-2026-955',
    customerName: 'Kirloskar Pneumatic Co Ltd',
    poDate: '2026-08-05',
    deliveryDate: '2026-09-05',
    status: 'CONFIRMED',
    progressStep: 1,
    grossAmount: 185000.00,
    taxCategory: 'GST 18%',
    remark: 'Raw material EN24 steel bar requisition submitted',
    lines: [
      {
        id: 'line-4',
        itemCode: '00000012',
        itemDescription: 'CNC VALVE BODY BRASS',
        custPartNo: 'KIR-VLV-1290',
        orderQty: 300,
        unit: 'NOS',
        dispatchedQty: 0,
        pendingQty: 300,
        rate: 616.66
      }
    ],
    jobCards: [],
    dispatches: []
  },
  {
    id: 'ord-5',
    poNo: 'PO-2026-872',
    customerName: 'Mahindra Defense Systems',
    poDate: '2026-07-10',
    deliveryDate: '2026-08-01',
    status: 'PARTIALLY_DISPATCHED',
    progressStep: 4,
    grossAmount: 95000.00,
    taxCategory: 'GST 18%',
    remark: 'Dispatched via VRL Logistics; awaiting customer PDI signoff',
    lines: [
      {
        id: 'line-5',
        itemCode: '00000015',
        itemDescription: 'STAINLESS SHAFT 316L',
        custPartNo: 'MDS-SH-316',
        orderQty: 100,
        unit: 'NOS',
        dispatchedQty: 100,
        pendingQty: 0,
        rate: 950.00
      }
    ],
    jobCards: [
      {
        jobNo: 'JC/0004/26-27',
        qty: 100.00,
        targetDate: '2026-07-28',
        status: 'COMPLETED'
      }
    ],
    dispatches: [
      {
        challanNo: 'CHL/0003/26-27',
        items: '00000015 × 100 NOS',
        date: '2026-07-30',
        status: 'DISPATCHED'
      }
    ]
  }
];

export const initialStock: StockItem[] = [
  {
    code: '00000003',
    description: 'TOWER PIVOTING SECTION',
    onHand: 150,
    reserved: 50,
    available: 100,
    demand: 150,
    reorderLevel: 20,
    shortage: 0,
    unit: 'NOS',
    status: 'OK'
  },
  {
    code: '00000002',
    description: 'UPPER BLOCK ASSEMBLY',
    onHand: 45,
    reserved: 10,
    available: 35,
    demand: 50,
    reorderLevel: 20,
    shortage: 15,
    unit: 'NOS',
    status: 'SHORTAGE'
  },
  {
    code: 'RM-EN24',
    description: 'EN24 Alloy Steel Bar 50mm',
    onHand: 0,
    reserved: 100,
    available: -100,
    demand: 100,
    reorderLevel: 50,
    shortage: 100,
    unit: 'KGS',
    status: 'CRITICAL'
  },
  {
    code: '00000009',
    description: 'FLANGE HOUSING AL-6061',
    onHand: 320,
    reserved: 100,
    available: 220,
    demand: 200,
    reorderLevel: 50,
    shortage: 0,
    unit: 'NOS',
    status: 'OK'
  },
  {
    code: '00000012',
    description: 'CNC VALVE BODY BRASS',
    onHand: 180,
    reserved: 60,
    available: 120,
    demand: 150,
    reorderLevel: 30,
    shortage: 0,
    unit: 'NOS',
    status: 'OK'
  },
  {
    code: '00000015',
    description: 'STAINLESS SHAFT 316L',
    onHand: 85,
    reserved: 20,
    available: 65,
    demand: 50,
    reorderLevel: 15,
    shortage: 0,
    unit: 'NOS',
    status: 'OK'
  },
  {
    code: 'BD-BRG-6205',
    description: 'BEARING 6205 ZZ',
    onHand: 5,
    reserved: 50,
    available: -45,
    demand: 50,
    reorderLevel: 25,
    shortage: 45,
    unit: 'NOS',
    status: 'CRITICAL'
  },
  {
    code: 'AL-6061-ROD',
    description: 'Aluminum Rod 6061 60mm',
    onHand: 12,
    reserved: 80,
    available: -68,
    demand: 80,
    reorderLevel: 30,
    shortage: 68,
    unit: 'KGS',
    status: 'SHORTAGE'
  }
];

export const initialShortages: ShortageItem[] = [
  {
    code: 'RM-EN24',
    description: 'EN24 Alloy Steel Bar 50mm',
    requiredQty: 100,
    availableQty: 0,
    deficit: 100,
    unit: 'KGS'
  },
  {
    code: 'BD-BRG-6205',
    description: 'BEARING 6205 ZZ',
    requiredQty: 50,
    availableQty: 5,
    deficit: 45,
    unit: 'NOS'
  },
  {
    code: 'AL-6061-ROD',
    description: 'Aluminum Rod 6061 60mm',
    requiredQty: 80,
    availableQty: 12,
    deficit: 68,
    unit: 'KGS'
  },
  {
    code: '00000017',
    description: 'CORNER PILLAR RAW BLANK',
    requiredQty: 50,
    availableQty: 0,
    deficit: 50,
    unit: 'NOS'
  }
];

export const initialJobCards: JobCard[] = [
  {
    jobNo: 'JC/0002/26-27',
    orderPo: 'PO-2026-901',
    partCode: '00000003',
    partDescription: 'TOWER PIVOTING SECTION',
    orderStatus: 'PARTIALLY_DISPATCHED',
    qty: 250.00,
    machine: 'VMC-01 CNC Center',
    targetDate: '2026-08-20',
    status: 'COMPLETED'
  },
  {
    jobNo: 'JC/0001/26-27',
    orderPo: 'PO-2026-880',
    partCode: '00000002',
    partDescription: 'UPPER BLOCK ASSEMBLY',
    orderStatus: 'CLOSED',
    qty: 400.00,
    machine: 'CNC-02 Heavy Lathe',
    targetDate: '2026-08-05',
    status: 'COMPLETED'
  },
  {
    jobNo: 'JC/0003/26-27',
    orderPo: 'PO-2026-942',
    partCode: '00000009',
    partDescription: 'FLANGE HOUSING AL-6061',
    orderStatus: 'IN_PRODUCTION',
    qty: 500.00,
    machine: 'VMC-03 High Speed Milling',
    targetDate: '2026-08-28',
    status: 'IN_PRODUCTION'
  },
  {
    jobNo: 'JC/0004/26-27',
    orderPo: 'PO-2026-872',
    partCode: '00000015',
    partDescription: 'STAINLESS SHAFT 316L',
    orderStatus: 'PARTIALLY_DISPATCHED',
    qty: 100.00,
    machine: 'Lathe-01 Precision',
    targetDate: '2026-07-28',
    status: 'COMPLETED'
  }
];

export const initialFinishedGoods: FinishedGoodsItem[] = [
  {
    orderPo: 'PO-2026-901',
    partCode: '00000003',
    partDescription: 'TOWER PIVOTING SECTION',
    pdiPassedQty: 250,
    physicallyHeldQty: 150,
    dispatchedQty: 100,
    variance: 0
  },
  {
    orderPo: 'PO-2026-880',
    partCode: '00000002',
    partDescription: 'UPPER BLOCK ASSEMBLY',
    pdiPassedQty: 400,
    physicallyHeldQty: 0,
    dispatchedQty: 400,
    variance: 0
  },
  {
    orderPo: 'PO-2026-872',
    partCode: '00000015',
    partDescription: 'STAINLESS SHAFT 316L',
    pdiPassedQty: 100,
    physicallyHeldQty: 0,
    dispatchedQty: 100,
    variance: 0
  }
];

export const initialOutworkSendOuts: OutworkSendOut[] = [
  {
    sendOutId: 'SO-0041',
    vendorName: 'Anodize Tech Ltd',
    process: 'Hard Anodizing 25 microns',
    sentQty: 50,
    receivedQty: 50,
    rejectedQty: 0,
    expectedDate: '2026-07-28',
    status: 'COMPLETED'
  },
  {
    sendOutId: 'SO-0042',
    vendorName: 'MicroFinish Platers',
    process: 'Electroless Nickel Plating 12u',
    sentQty: 120,
    receivedQty: 100,
    rejectedQty: 0,
    expectedDate: '2026-08-18',
    status: 'SENT'
  },
  {
    sendOutId: 'SO-0043',
    vendorName: 'Thermal HeatTreaters Co',
    process: 'Vacuum Heat Treatment HRC 58-60',
    sentQty: 80,
    receivedQty: 0,
    rejectedQty: 0,
    expectedDate: '2026-08-22',
    status: 'SENT'
  }
];

export const initialProductionLogs: ProductionLogReport[] = [
  {
    id: 'log-1',
    itemCode: '00000003',
    description: 'TOWER PIVOTING SECTION',
    jobNo: 'JC/0002/26-27',
    stepNo: 1,
    operationName: 'VMC Facing & Boring Operation',
    qtyDone: 250.00,
    loggedTimestamp: '22/7/2026, 11:19:56 am'
  },
  {
    id: 'log-2',
    itemCode: '00000002',
    description: 'UPPER BLOCK ASSEMBLY',
    jobNo: 'JC/0001/26-27',
    stepNo: 1,
    operationName: 'CNC Turning & Threading',
    qtyDone: 400.00,
    loggedTimestamp: '22/7/2026, 11:08:57 am'
  },
  {
    id: 'log-3',
    itemCode: '00000009',
    description: 'FLANGE HOUSING AL-6061',
    jobNo: 'JC/0003/26-27',
    stepNo: 2,
    operationName: 'High Speed Pocket Milling',
    qtyDone: 180.00,
    loggedTimestamp: '12/8/2026, 09:30:15 am'
  }
];

export const initialQCQueue: QCInspection[] = [
  {
    id: 'qc-1',
    jobNo: 'JC/0002/26-27',
    orderPo: 'PO-2026-901',
    partCode: '00000003',
    partDescription: 'TOWER PIVOTING SECTION',
    qty: 250,
    jobStatus: 'PASSED',
    qcStatus: 'PASS',
    inspectorNotes: '100% CMM dimensional audit passed. Surface finish Ra 0.8 achieved.',
    inspectedAt: '2026-07-23T14:30:00Z'
  },
  {
    id: 'qc-2',
    jobNo: 'JC/0001/26-27',
    orderPo: 'PO-2026-880',
    partCode: '00000002',
    partDescription: 'UPPER BLOCK ASSEMBLY',
    qty: 400,
    jobStatus: 'PASSED',
    qcStatus: 'PASS',
    inspectorNotes: 'Zero defects. Concentricity within 10 microns.',
    inspectedAt: '2026-07-24T10:15:00Z'
  },
  {
    id: 'qc-3',
    jobNo: 'JC/0003/26-27',
    orderPo: 'PO-2026-942',
    partCode: '00000009',
    partDescription: 'FLANGE HOUSING AL-6061',
    qty: 180,
    jobStatus: 'HOLD',
    qcStatus: 'QC_HOLD',
    inspectorNotes: 'Thread pitch gauge fit tight on 5 samples. Under investigation.',
    inspectedAt: '2026-08-12T10:00:00Z'
  }
];

export const initialPDIQueue: PDIInspection[] = [
  {
    id: 'pdi-1',
    jobNo: 'JC/0002/26-27',
    orderPo: 'PO-2026-901',
    partCode: '00000003',
    partDescription: 'TOWER PIVOTING SECTION',
    qty: 250,
    pdiStatus: 'PASS'
  },
  {
    id: 'pdi-2',
    jobNo: 'JC/0001/26-27',
    orderPo: 'PO-2026-880',
    partCode: '00000002',
    partDescription: 'UPPER BLOCK ASSEMBLY',
    qty: 400,
    pdiStatus: 'PASS'
  }
];

export const initialDispatches: DispatchChallan[] = [
  {
    challanNo: 'CHL/0002/26-27',
    orderPo: 'PO-2026-901',
    status: 'DELIVERED',
    date: '2026-08-01',
    transporter: 'VRL Logistics Ltd',
    vehicleNo: 'GJ 03 AX 8901',
    linesCount: 1
  },
  {
    challanNo: 'CHL/0001/26-27',
    orderPo: 'PO-2026-880',
    status: 'DELIVERED',
    date: '2026-08-08',
    transporter: 'TCI Freight Services',
    vehicleNo: 'GJ 03 BV 4412',
    linesCount: 1
  },
  {
    challanNo: 'CHL/0003/26-27',
    orderPo: 'PO-2026-872',
    status: 'DISPATCHED',
    date: '2026-07-30',
    transporter: 'VRL Logistics Ltd',
    vehicleNo: 'MH 12 AB 4589',
    linesCount: 1
  }
];

export const initialInvoices: CustomerInvoice[] = [
  {
    invoiceNo: 'INV-2026-001',
    customerName: 'Bharat Heavy Electricals Ltd (BHEL)',
    orderPo: 'PO-2026-880',
    challanNo: 'CHL/0001/26-27',
    status: 'PAID',
    date: '2026-08-08',
    dueDate: '2026-09-08',
    totalAmount: 320000.00,
    paidAmount: 320000.00,
    balanceAmount: 0.00
  },
  {
    invoiceNo: 'INV-2026-002',
    customerName: 'Larsen & Toubro Ltd',
    orderPo: 'PO-2026-901',
    challanNo: 'CHL/0002/26-27',
    status: 'DRAFT',
    date: '2026-08-01',
    dueDate: '2026-08-30',
    totalAmount: 145000.00,
    paidAmount: 0.00,
    balanceAmount: 145000.00
  },
  {
    invoiceNo: 'INV-2026-003',
    customerName: 'Mahindra Defense Systems',
    orderPo: 'PO-2026-872',
    challanNo: 'CHL/0003/26-27',
    status: 'OVERDUE',
    date: '2026-07-30',
    dueDate: '2026-08-05',
    totalAmount: 95000.00,
    paidAmount: 0.00,
    balanceAmount: 95000.00
  }
];

export const initialPayables: VendorBill[] = [
  {
    billNo: 'VB-2026-101',
    vendorName: 'Rajkot Steel Suppliers Co',
    poNo: 'PO-VEND-890',
    status: 'OPEN',
    date: '2026-08-01',
    dueDate: '2026-08-25',
    amount: 85000.00,
    paidAmount: 0.00,
    balanceAmount: 85000.00
  },
  {
    billNo: 'VB-2026-102',
    vendorName: 'Anodize Tech Ltd',
    poNo: 'SO-0041',
    status: 'PAID',
    date: '2026-07-28',
    dueDate: '2026-08-05',
    amount: 24000.00,
    paidAmount: 24000.00,
    balanceAmount: 0.00
  },
  {
    billNo: 'VB-2026-103',
    vendorName: 'Hardened Cutting Tools Ltd',
    poNo: 'PO-TOOL-441',
    status: 'OVERDUE',
    date: '2026-07-15',
    dueDate: '2026-08-01',
    amount: 42000.00,
    paidAmount: 0.00,
    balanceAmount: 42000.00
  }
];

export const initialMasters: MasterItem[] = [
  {
    code: 'ITEM-0001',
    partNo: 'MS Plate 20mm',
    description: 'Mild steel plate, 20mm thickness, IS 2062 grade',
    unit: 'Kg',
    hsnCode: '7208',
    reorderLevel: 600,
    storeLocation: 'Main Raw Material Store',
    isFinishedGoods: false,
    saleRate: 0,
    purchaseRate: 62
  },
  {
    code: 'ITEM-0002',
    partNo: 'Boom Bracket Sub-assembly',
    description: 'Boom bracket sub-assembly per drawing Rev C',
    unit: 'Nos',
    hsnCode: '7326',
    reorderLevel: 20,
    storeLocation: 'Finished Goods Store',
    isFinishedGoods: true,
    saleRate: 1850,
    purchaseRate: 0
  },
  {
    code: 'ITEM-0003',
    partNo: 'Taper Roller Bearing 6205',
    description: 'Standard taper roller bearing, size 6205',
    unit: 'Nos',
    hsnCode: '8482',
    reorderLevel: 20,
    storeLocation: 'Bought-out Components Store',
    isFinishedGoods: false,
    saleRate: 0,
    purchaseRate: 480
  },
  {
    code: 'ITEM-0004',
    partNo: 'MS Round Bar 25mm',
    description: 'Mild steel round bar, 25mm dia, IS 2062 grade',
    unit: 'Kg',
    hsnCode: '7214',
    reorderLevel: 900,
    storeLocation: 'Main Raw Material Store',
    isFinishedGoods: false,
    saleRate: 0,
    purchaseRate: 58
  },
  {
    code: 'ITEM-0005',
    partNo: 'Hydraulic Cylinder Barrel',
    description: 'Machined hydraulic cylinder barrel, per drawing Rev B',
    unit: 'Nos',
    hsnCode: '8412',
    reorderLevel: 12,
    storeLocation: 'WIP Store',
    isFinishedGoods: false,
    saleRate: 0,
    purchaseRate: 0
  },
  {
    code: 'ITEM-0006',
    partNo: 'Control Panel Assembly',
    description: 'Machine control panel with wiring, per drawing Rev A',
    unit: 'Nos',
    hsnCode: '8537',
    reorderLevel: 6,
    storeLocation: 'Finished Goods Store',
    isFinishedGoods: true,
    saleRate: 12500,
    purchaseRate: 0
  },
  {
    code: 'ITEM-0007',
    partNo: 'Cutting Oil (Coolant)',
    description: 'Water-soluble cutting oil for CNC machining',
    unit: 'Litre',
    hsnCode: '2710',
    reorderLevel: 300,
    storeLocation: 'Consumables Store',
    isFinishedGoods: false,
    saleRate: 0,
    purchaseRate: 145
  },
  {
    code: 'ITEM-0008',
    partNo: 'Hex Bolt M12x50',
    description: 'Standard hex head bolt, M12 x 50mm, Grade 8.8',
    unit: 'Nos',
    hsnCode: '7318',
    reorderLevel: 2500,
    storeLocation: 'Bought-out Components Store',
    isFinishedGoods: false,
    saleRate: 0,
    purchaseRate: 9
  },
  {
    code: 'ITEM-0009',
    partNo: 'Powder Coating Paint',
    description: 'Epoxy-polyester powder coat, RAL 9005 black',
    unit: 'Kg',
    hsnCode: '3208',
    reorderLevel: 80,
    storeLocation: 'Consumables Store',
    isFinishedGoods: false,
    saleRate: 0,
    purchaseRate: 320
  },
  {
    code: 'ITEM-0010',
    partNo: 'Base Frame Weldment',
    description: 'Welded base frame, per drawing Rev D',
    unit: 'Nos',
    hsnCode: '7326',
    reorderLevel: 10,
    storeLocation: 'WIP Store',
    isFinishedGoods: false,
    saleRate: 0,
    purchaseRate: 0
  }
];

export const initialCustomers: CustomerMaster[] = [
  {
    code: 'CUST-0001',
    name: 'Liebherr CMCtec India Pvt Ltd',
    gstin: '27AABCL1234M1ZP',
    pan: 'AABCL1234M',
    address: 'Plot 12, MIDC Chakan, Pune, Maharashtra 410501',
    city: 'Pune',
    state: 'Maharashtra',
    stateCode: '27',
    pin: '410501',
    email: 'rajeev.menon@example.com',
    contact: 'Rajeev Menon — 9822011234',
    creditDays: 45,
    paymentTerms: 'Net 45',
    creditLimit: 5000000
  },
  {
    code: 'CUST-0002',
    name: 'Bright Auto Distributors',
    gstin: '27AABCB5678N1ZQ',
    pan: 'AABCB5678N',
    address: '45 Market Yard Road, Nashik, Maharashtra 422001',
    city: 'Nashik',
    state: 'Maharashtra',
    stateCode: '27',
    pin: '422001',
    email: 'sunita.rao@example.com',
    contact: 'Sunita Rao — 9823045678',
    creditDays: 30,
    paymentTerms: 'Net 30',
    creditLimit: 1500000
  },
  {
    code: 'CUST-0003',
    name: 'Sunrise Engineering Works',
    gstin: '27AAAPS1111A1Z2',
    pan: 'AAAPS1111A',
    address: 'Plot 8, Bhosari MIDC, Pune, Maharashtra 411026',
    city: 'Pune',
    state: 'Maharashtra',
    stateCode: '27',
    pin: '411026',
    email: 'vikram.joshi@example.com',
    contact: 'Vikram Joshi — 9822011111',
    creditDays: 30,
    paymentTerms: 'Net 30',
    creditLimit: 800000
  },
  {
    code: 'CUST-0004',
    name: 'Metro Auto Components Ltd',
    gstin: '27AABCM2222B1Z3',
    pan: 'AABCM2222B',
    address: 'A-14, Chakan Industrial Area, Pune, Maharashtra 410501',
    city: 'Pune',
    state: 'Maharashtra',
    stateCode: '27',
    pin: '410501',
    email: 'anjali.d@example.com',
    contact: 'Anjali Deshmukh — 9822022222',
    creditDays: 45,
    paymentTerms: 'Net 45',
    creditLimit: 4000000
  },
  {
    code: 'CUST-0005',
    name: 'Global Exports Trading Co.',
    gstin: '27AABFG3333C1Z4',
    pan: 'AABFG3333C',
    address: 'Andheri East, Mumbai, Maharashtra 400069',
    city: 'Mumbai',
    state: 'Maharashtra',
    stateCode: '27',
    pin: '400069',
    email: 'farhan@example.com',
    contact: 'Farhan Sheikh — 9822033333',
    creditDays: 0,
    paymentTerms: 'Advance',
    creditLimit: 2000000
  },
  {
    code: 'CUST-0006',
    name: 'Precision Hydraulics Pvt Ltd',
    gstin: '27AABCP4444D1Z5',
    pan: 'AABCP4444D',
    address: 'MIDC Bhosari, Pune, Maharashtra 411026',
    city: 'Pune',
    state: 'Maharashtra',
    stateCode: '27',
    pin: '411026',
    email: 'suresh.iyer@example.com',
    contact: 'Suresh Iyer — 9822044444',
    creditDays: 30,
    paymentTerms: 'Net 30',
    creditLimit: 1200000
  },
  {
    code: 'CUST-0007',
    name: 'Trident Retail Hardware',
    gstin: 'N/A',
    pan: 'AAAPT5555E',
    address: 'Market Yard, Nashik, Maharashtra 422001',
    city: 'Nashik',
    state: 'Maharashtra',
    stateCode: '27',
    pin: '422001',
    email: 'meera.pawar@example.com',
    contact: 'Meera Pawar — 9822055555',
    creditDays: 15,
    paymentTerms: 'Net 15',
    creditLimit: 150000
  },
  {
    code: 'CUST-0008',
    name: 'Apex Fabrication Industries',
    gstin: '27AABCA6666F1Z6',
    pan: 'AABCA6666F',
    address: 'Waluj MIDC, Aurangabad, Maharashtra 431136',
    city: 'Aurangabad',
    state: 'Maharashtra',
    stateCode: '27',
    pin: '431136',
    email: 'ravi.kulkarni@example.com',
    contact: 'Ravi Kulkarni — 9822066666',
    creditDays: 30,
    paymentTerms: 'Net 30',
    creditLimit: 900000
  },
  {
    code: 'CUST-0009',
    name: 'Coastal Marine Equipments',
    gstin: '27AABCC7777G1Z7',
    pan: 'AABCC7777G',
    address: 'Mazgaon Dock Road, Mumbai, Maharashtra 400010',
    city: 'Mumbai',
    state: 'Maharashtra',
    stateCode: '27',
    pin: '400010',
    email: 'diana.f@example.com',
    contact: 'Diana Fernandes — 9822077777',
    creditDays: 60,
    paymentTerms: 'Net 60',
    creditLimit: 3000000
  },
  {
    code: 'CUST-0010',
    name: 'Deccan Machine Tools Pvt Ltd',
    gstin: '27AABCD8888H1Z8',
    pan: 'AABCD8888H',
    address: 'Hadapsar Industrial Estate, Pune, Maharashtra 411013',
    city: 'Pune',
    state: 'Maharashtra',
    stateCode: '27',
    pin: '411013',
    email: 'ganesh.rane@example.com',
    contact: 'Ganesh Rane — 9822088888',
    creditDays: 45,
    paymentTerms: 'Net 45',
    creditLimit: 2500000
  }
];

export const initialVendors: VendorMaster[] = [
  {
    code: 'VEND-0001',
    name: 'Shree Steel Suppliers',
    gstin: '27AAAFS1111A1Z1',
    pan: 'AAAFS1111A',
    address: 'MIDC Bhosari, Pune, Maharashtra 411026',
    city: 'Pune',
    state: 'Maharashtra',
    stateCode: '27',
    pin: '411026',
    email: 'mahesh@example.com',
    contact: 'Mahesh Shetty — 9850011111',
    paymentTerms: 'Net 30',
    creditDays: 30,
    creditLimit: 2000000
  },
  {
    code: 'VEND-0002',
    name: 'ABC Heat Treaters',
    gstin: '27AAFFA6666F1Z6',
    pan: 'AAFFA6666F',
    address: 'Chakan Industrial Area, Pune, Maharashtra 410501',
    city: 'Pune',
    state: 'Maharashtra',
    stateCode: '27',
    pin: '410501',
    email: 'ashok@example.com',
    contact: 'Ashok Bhagat — 9850066666',
    paymentTerms: 'Net 15',
    creditDays: 15
  },
  {
    code: 'VEND-0003',
    name: 'Reliable Transport Co.',
    gstin: 'N/A',
    pan: 'AAHFR8888H',
    address: 'Old Pune-Mumbai Highway, Pune, Maharashtra 411018',
    city: 'Pune',
    state: 'Maharashtra',
    stateCode: '27',
    pin: '411018',
    email: 'santosh@example.com',
    contact: 'Santosh More — 9850088888',
    paymentTerms: 'Net 15',
    creditDays: 15
  },
  {
    code: 'VEND-0004',
    name: 'Om Engineering Consumables',
    gstin: '27AAOFE1122A1Z1',
    pan: 'AAOFE1122A',
    address: 'MIDC Bhosari, Pune, Maharashtra 411026',
    city: 'Pune',
    state: 'Maharashtra',
    stateCode: '27',
    pin: '411026',
    email: 'prakash.more@example.com',
    contact: 'Prakash More — 9850011122',
    paymentTerms: 'Net 30',
    creditDays: 30,
    creditLimit: 500000
  },
  {
    code: 'VEND-0005',
    name: 'Precision Tooling Solutions',
    gstin: '27AABPT2233B1Z2',
    pan: 'AABPT2233B',
    address: 'Chakan Industrial Area, Pune, Maharashtra 410501',
    city: 'Pune',
    state: 'Maharashtra',
    stateCode: '27',
    pin: '410501',
    email: 'deepak@example.com',
    contact: 'Deepak Bhosale — 9850022233',
    paymentTerms: 'Net 45',
    creditDays: 45,
    creditLimit: 3000000
  },
  {
    code: 'VEND-0006',
    name: 'Vishal Manpower Services',
    gstin: 'N/A',
    pan: 'AAAFV3344C',
    address: 'Pimpri, Pune, Maharashtra 411018',
    city: 'Pune',
    state: 'Maharashtra',
    stateCode: '27',
    pin: '411018',
    email: 'vishal.g@example.com',
    contact: 'Vishal Gaikwad — 9850033344',
    paymentTerms: 'Net 15',
    creditDays: 15
  },
  {
    code: 'VEND-0007',
    name: 'Bytewise IT Solutions',
    gstin: '27AABBI4455D1Z4',
    pan: 'AABBI4455D',
    address: 'Baner, Pune, Maharashtra 411045',
    city: 'Pune',
    state: 'Maharashtra',
    stateCode: '27',
    pin: '411045',
    email: 'kunal.shah@example.com',
    contact: 'Kunal Shah — 9850044455',
    paymentTerms: 'Net 30',
    creditDays: 30
  },
  {
    code: 'VEND-0008',
    name: 'Accura Legal & Tax Advisors',
    gstin: '27AABPA5566E1Z5',
    pan: 'AABPA5566E',
    address: 'Deccan Gymkhana, Pune, Maharashtra 411004',
    city: 'Pune',
    state: 'Maharashtra',
    stateCode: '27',
    pin: '411004',
    email: 'radhika.nair@example.com',
    contact: 'Radhika Nair — 9850055566',
    paymentTerms: 'Net 15',
    creditDays: 15
  },
  {
    code: 'VEND-0009',
    name: 'Sagar Packaging Industries',
    gstin: '27AABSP6677F1Z6',
    pan: 'AABSP6677F',
    address: 'Talegaon MIDC, Pune, Maharashtra 410507',
    city: 'Pune',
    state: 'Maharashtra',
    stateCode: '27',
    pin: '410507',
    email: 'sagar.wagh@example.com',
    contact: 'Sagar Wagh — 9850066677',
    paymentTerms: 'Net 30',
    creditDays: 30,
    creditLimit: 600000
  },
  {
    code: 'VEND-0010',
    name: 'Neptune CNC Job Works',
    gstin: '27AABNC7788G1Z7',
    pan: 'AABNC7788G',
    address: 'Ranjangaon MIDC, Pune, Maharashtra 412220',
    city: 'Pune',
    state: 'Maharashtra',
    stateCode: '27',
    pin: '412220',
    email: 'nitin.kadam@example.com',
    contact: 'Nitin Kadam — 9850077788',
    paymentTerms: 'Net 15',
    creditDays: 15
  }
];

export const initialMachines: MachineMaster[] = [
  { code: 'MCH-0001', name: 'VMC-01', type: 'CNC Machining (VMC/HMC)', status: 'Active', hourlyCost: 700, active: true },
  { code: 'MCH-0002', name: 'WELD-01', type: 'Welding / Fabrication', status: 'Active', hourlyCost: 300, active: true },
  { code: 'MCH-0003', name: 'CNC-02', type: 'CNC Turning', status: 'Active', hourlyCost: 500, active: true },
  { code: 'MCH-0004', name: 'GRIND-01', type: 'Grinding', status: 'Active', hourlyCost: 400, active: true },
  { code: 'MCH-0005', name: 'CUT-01', type: 'Cutting', status: 'Active', hourlyCost: 350, active: true },
  { code: 'MCH-0006', name: 'CMM-01', type: 'Inspection / CMM', status: 'Active', hourlyCost: 450, active: true },
  { code: 'MCH-0007', name: 'VMC-03', type: 'CNC Machining (VMC/HMC)', status: 'Active', hourlyCost: 750, active: true },
  { code: 'MCH-0008', name: 'CONV-01', type: 'Conventional Machining', status: 'Idle', hourlyCost: 250, active: true },
  { code: 'MCH-0009', name: 'WELD-02', type: 'Welding / Fabrication', status: 'Active', hourlyCost: 350, active: true },
  { code: 'MCH-0010', name: 'HMC-01', type: 'CNC Machining (VMC/HMC)', status: 'Under Maintenance', hourlyCost: 800, active: true }
];


export const initialUsers: SystemUser[] = [
  {
    id: 'usr-1',
    name: 'Pramod Parshi (Founder & CEO)',
    email: 'user@guruom.in',
    role: 'SUPER ADMIN',
    status: 'ACTIVE',
    department: 'Executive Management',
    phone: '+91 98250 12345',
    lastLogin: 'Today, 08:30 AM'
  },
  {
    id: 'usr-2',
    name: 'Rohan Deshpande',
    email: 'rohan.deshpande@example.com',
    role: 'SUPER ADMIN',
    status: 'ACTIVE',
    department: 'Executive Management',
    phone: '+91 98220 99001',
    lastLogin: 'Today, 09:00 AM'
  },
  {
    id: 'usr-3',
    name: 'Rajesh Sharma',
    email: 'operator@guruom.in',
    role: 'OPERATOR',
    status: 'ACTIVE',
    department: 'CNC Operations',
    phone: '+91 98250 23456',
    lastLogin: 'Today, 07:00 AM'
  },
  {
    id: 'usr-4',
    name: 'Suresh Yadav',
    email: 'suresh.yadav@example.com',
    role: 'OPERATOR',
    status: 'ACTIVE',
    department: 'Shop Floor Production',
    phone: '+91 98220 99003',
    lastLogin: 'Today, 07:30 AM'
  },
  {
    id: 'usr-5',
    name: 'Anita Patel',
    email: 'qc@guruom.in',
    role: 'QC_MANAGER',
    status: 'ACTIVE',
    department: 'Quality Assurance',
    phone: '+91 98250 34567',
    lastLogin: 'Today, 08:00 AM'
  },
  {
    id: 'usr-6',
    name: 'Snehal Bhosale',
    email: 'snehal.bhosale@example.com',
    role: 'QC_MANAGER',
    status: 'ACTIVE',
    department: 'Quality Inspection',
    phone: '+91 98220 99006',
    lastLogin: 'Today, 08:15 AM'
  },
  {
    id: 'usr-7',
    name: 'Vikram Singh',
    email: 'dispatch@guruom.in',
    role: 'DISPATCH_CLERK',
    status: 'ACTIVE',
    department: 'Logistics & Dispatch',
    phone: '+91 98250 45678',
    lastLogin: 'Today, 08:45 AM'
  },
  {
    id: 'usr-8',
    name: 'Amit Salunkhe',
    email: 'amit.salunkhe@example.com',
    role: 'DISPATCH_CLERK',
    status: 'ACTIVE',
    department: 'Logistics & Dispatch',
    phone: '+91 98220 99007',
    lastLogin: 'Today, 09:00 AM'
  },
  {
    id: 'usr-9',
    name: 'Suresh Mehta',
    email: 'finance@guruom.in',
    role: 'FINANCE_MANAGER',
    status: 'ACTIVE',
    department: 'Accounts & Finance',
    phone: '+91 98250 56789',
    lastLogin: 'Today, 09:30 AM'
  },
  {
    id: 'usr-10',
    name: 'Meenal Joshi',
    email: 'meenal.joshi@example.com',
    role: 'FINANCE_MANAGER',
    status: 'ACTIVE',
    department: 'Accounts & Billing',
    phone: '+91 98220 99009',
    lastLogin: 'Today, 10:00 AM'
  },
  {
    id: 'usr-11',
    name: 'Sachin Gharbude',
    email: 'sachin@example.com',
    role: 'SUPER ADMIN',
    status: 'ACTIVE',
    department: 'Plant Operations Admin',
    phone: '+91 98220 99010',
    lastLogin: 'Today, 09:15 AM'
  }
];

export const initialAuditLogs: AuditLogEntry[] = [
  {
    id: 'log-101',
    when: '10 min ago',
    user: 'Rohan Deshpande',
    entity: 'Order',
    action: 'update',
    details: 'Order #PO-2026-901 moved to Processing stage'
  },
  {
    id: 'log-102',
    when: '35 min ago',
    user: 'System Bot',
    entity: 'Order',
    action: 'close',
    details: 'Order #PO-2026-880 marked Completed & Invoiced'
  },
  {
    id: 'log-103',
    when: '1h ago',
    user: 'Suresh Yadav',
    entity: 'Inventory',
    action: 'adjust',
    details: '30 units of Boom Bracket Sub-assembly added to stock'
  },
  {
    id: 'log-104',
    when: '2h ago',
    user: 'Snehal Bhosale',
    entity: 'Quality',
    action: 'inspect',
    details: 'QC Audit PASS for Job Card JC/0002/26-27'
  },
  {
    id: 'log-105',
    when: '3h ago',
    user: 'Sachin Gharbude',
    entity: 'Security',
    action: 'login',
    details: 'Authenticated via Supabase OAuth Session'
  }
];

export const initialApprovals: PendingApproval[] = [];

export const initialCompanyProfile: CompanyProfile = {
  legalName: 'GuruOm Industries LLP',
  address: 'Plot 42, GIDC Industrial Estate, Metoda, Rajkot, Gujarat - 360021',
  phone: '+91 98250 12345',
  email: 'contact@guruom.in',
  gstin: '24AAAFG1234C1Z9',
  pan: 'AAAFG1234C',
  state: 'Gujarat',
  stateCode: '24'
};
