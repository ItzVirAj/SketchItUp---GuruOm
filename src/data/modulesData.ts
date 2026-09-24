import { ModuleItem } from '../types';

export const modulesData: ModuleItem[] = [
  {
    slug: 'order-management',
    title: 'Order Management',
    category: 'Core Operations',
    shortDesc: 'Streamline order intake, tracking, dispatch approval, and status feeds in one unified view.',
    fullDesc: 'The Order Management module acts as the digital front door for customer demand. It captures orders across direct sales, portals, and WhatsApp feeds into a centralized pipeline, enforcing automated credit checks, margin validation, and instant BOM allocation.',
    iconName: 'ShoppingCart',
    problem: 'Lost orders in email threads, manual credit limit verification delays, and mismatch between promised delivery dates and actual shop floor capacity.',
    keyCapabilities: [
      'Multi-channel order ingestion (Web, Portal, Sales App, Manual)',
      'Automated credit & payment milestone verification',
      'Instant BOM (Bill of Materials) reserve & inventory check',
      'Real-time customer status feeds & automated notification triggers',
      'Margin floor protection rules with multi-level approval workflows'
    ],
    workflowSteps: [
      { step: 1, title: 'Order Intake', desc: 'Orders captured with auto-validation of pricing and tax' },
      { step: 2, title: 'Credit & Margin Gate', desc: 'System checks account credit line and profitability threshold' },
      { step: 3, title: 'Production Scheduling Trigger', desc: 'BOM requirements reservation triggered in inventory' },
      { step: 4, title: 'Fulfillment & Dispatch', desc: 'Picking list generated and dispatch team notified' },
      { step: 5, title: 'Invoice & Closure', desc: 'Automated invoice generation and payment tracking' }
    ],
    technicalOverview: {
      dataTriggers: ['Order Created', 'Credit Approved', 'BOM Allocated', 'Dispatch Completed'],
      integrations: ['WhatsApp API', 'Payment Gateways', 'Tally/ERP Sync', 'Customer Portal'],
      security: 'Role-based access with audit trail on price overrides'
    },
    businessBenefits: [
      '40% faster order-to-production cycle time',
      'Zero lost orders or duplicated entries',
      '100% visibility on order margin prior to production start'
    ],
    kpis: [
      { label: 'Avg Order Processing Time', value: '12 mins', detail: 'Down from 4.5 hours' },
      { label: 'On-Time Order Fulfillment', value: '98.4%', detail: '+14% improvement' },
      { label: 'Order Entry Errors', value: '0.1%', detail: 'Near zero manual errors' }
    ],
    availableToday: [
      'Centralized Order Command Board',
      'Automated Credit Line Gatekeeper',
      'Instant Customer Order Tracking Status',
      'Multi-level Approval Workflows'
    ],
    aiRoadmap: [
      'Predictive Order Cancellation Risk Model',
      'AI Smart Margin Enhancer Suggestions',
      'Natural Language Order Processing via WhatsApp'
    ],
    relatedModuleSlugs: ['inventory-management', 'production-management', 'crm']
  },
  {
    slug: 'inventory-management',
    title: 'Inventory Management',
    category: 'Supply Chain',
    shortDesc: 'Multi-warehouse stock tracking, batch/serial controls, automated reorder triggers, and valuation.',
    fullDesc: 'Eliminate stockouts and overstocking with real-time multi-location inventory tracking. Track raw materials, WIP (Work In Progress), and finished goods down to specific bin locations, batch numbers, and expiry dates.',
    iconName: 'Package',
    problem: 'Capital tied up in excess inventory, sudden production halts due to missing raw materials, and inaccurate physical stock counts.',
    keyCapabilities: [
      'Real-time multi-warehouse & bin level stock visibility',
      'Batch, lot, and serial number traceability',
      'Automated safety stock and reorder point alerts',
      'Barcode & QR code mobile scan verification',
      'Automated FIFO / LIFO stock issue enforcement'
    ],
    workflowSteps: [
      { step: 1, title: 'Goods Receipt (GRN)', desc: 'Mobile QR inspection at warehouse gate' },
      { step: 2, title: 'Bin Allocation', desc: 'Directed put-away logic based on item velocity' },
      { step: 3, title: 'Production Issue', desc: 'Material issued against specific job work order' },
      { step: 4, title: 'Stock Reconciliation', desc: 'Cycle counts with instant variance reporting' }
    ],
    technicalOverview: {
      dataTriggers: ['Stock Threshold Breach', 'GRN Created', 'Material Issued', 'Variance Flagged'],
      integrations: ['Handheld Scanners', 'RFID Gates', 'Supplier Portals'],
      security: 'Stock adjustment logs required manager co-signature'
    },
    businessBenefits: [
      '28% reduction in total inventory holding costs',
      '99.2% stock count accuracy across warehouses',
      'Elimination of stockout-induced line stoppages'
    ],
    kpis: [
      { label: 'Inventory Turnover Ratio', value: '8.4x', detail: 'Up from 5.1x' },
      { label: 'Stock Audit Accuracy', value: '99.2%', detail: '+12% precision' },
      { label: 'Stockout Incidents', value: '< 1/mo', detail: '92% reduction' }
    ],
    availableToday: [
      'Multi-Warehouse Bin Level Tracking',
      'Automated Reorder Level Email & SMS Alerts',
      'Mobile GRN & QR Stock Issue App',
      'Real-time Stock Valuation Reports'
    ],
    aiRoadmap: [
      'AI Demand Forecasting & Lead Time Optimization',
      'Automated Slow-Moving Inventory Liquidator',
      'Computer Vision Stock Level Monitoring'
    ],
    relatedModuleSlugs: ['procurement', 'production-management', 'quality-management']
  },
  {
    slug: 'production-management',
    title: 'Production Management',
    category: 'Core Operations',
    shortDesc: 'Work order tracking, shop floor job scheduling, machine allocation, and bottleneck monitoring.',
    fullDesc: 'Gain total control over your shop floor. Production Management bridges the gap between customer demand and shop floor execution, orchestrating work orders, machine capacity, operator assignments, and scrap tracking.',
    iconName: 'Factory',
    problem: 'Unclear job priorities, frequent production schedule revisions, untracked scrap material, and inability to determine true job profitability.',
    keyCapabilities: [
      'Visual Drag-and-Drop Production Gantt Scheduler',
      'Job Work Order generation with nested Routing Sheets',
      'Real-time operator output & shift production logs',
      'Scrap material logging & yield percentage analysis',
      'Machine downtime & line bottleneck tracking'
    ],
    workflowSteps: [
      { step: 1, title: 'Work Order Creation', desc: 'Auto-generated from approved customer orders' },
      { step: 2, title: 'Shop Floor Scheduling', desc: 'Resource & machine capacity assignment' },
      { step: 3, title: 'Live Job Execution', desc: 'Operators log progress via tablet stations' },
      { step: 4, title: 'Quality & Output Sign-off', desc: 'Finished goods transferred to inventory' }
    ],
    technicalOverview: {
      dataTriggers: ['Work Order Released', 'Machine Down', 'Shift Log Saved', 'Yield Variance'],
      integrations: ['IoT Machine Sensors', 'Barcode Terminals', 'Quality Testers'],
      security: 'Operator PIN authentication for shop-floor stations'
    },
    businessBenefits: [
      '32% increase in overall shop floor throughput',
      'Full visibility into job work order status in real time',
      '18% reduction in scrap and rework material'
    ],
    kpis: [
      { label: 'On-Time Schedule Adherence', value: '96.8%', detail: 'Industry-leading benchmark' },
      { label: 'Overall Equipment Effectiveness', value: '84.2%', detail: '+16% OEE gains' },
      { label: 'Scrap & Material Loss', value: '1.4%', detail: 'Down from 4.8%' }
    ],
    availableToday: [
      'Visual Gantt Work Order Scheduler',
      'Shop-Floor Operator Kiosk Interface',
      'Real-time Machine Downtime Logger',
      'BOM vs Actual Material Consumption Variance'
    ],
    aiRoadmap: [
      'AI Autonomous Dynamic Schedule Rebalancing',
      'Predictive Scrap Reduction Engine',
      'Computer Vision Defect Detection Integration'
    ],
    relatedModuleSlugs: ['inventory-management', 'machine-maintenance', 'quality-management']
  },
  {
    slug: 'procurement',
    title: 'Procurement & Supplier Management',
    category: 'Supply Chain',
    shortDesc: 'Vendor evaluation, Purchase Orders, PO approval limits, and automated supplier scorecards.',
    fullDesc: 'Standardize purchasing across raw materials, equipment, and consumables. Owner OS Procurement enforces price approval rules, tracks vendor delivery performance, and automates RFQs (Request for Quotations).',
    iconName: 'Truck',
    problem: 'Off-contract rogue purchasing, delayed material deliveries from suppliers, and lack of historical vendor price comparison.',
    keyCapabilities: [
      'Automated Purchase Requisition (PR) to Purchase Order (PO)',
      'Multi-tier PO approval thresholds by value',
      'Vendor Scorecards (Quality, On-time Delivery, Rate)',
      'Automated RFQ generation and quotation comparison matrix',
      'PO 3-Way Matching (PO vs GRN vs Vendor Invoice)'
    ],
    workflowSteps: [
      { step: 1, title: 'Purchase Requisition', desc: 'Auto-triggered by inventory reorder point' },
      { step: 2, title: 'RFQ & Vendor Quote Comparison', desc: 'System ranks vendors on rate and lead time' },
      { step: 3, title: 'PO Approval & Dispatch', desc: 'Manager sign-off & automated email dispatch' },
      { step: 4, title: 'Delivery & 3-Way Match', desc: 'Matched with warehouse GRN and Accounts Payable' }
    ],
    technicalOverview: {
      dataTriggers: ['Requisition Created', 'PO Approved', 'Vendor Delivery Delayed', 'Invoice Matched'],
      integrations: ['Vendor Email Gateway', 'Supplier Portal', 'Accounting Ledger'],
      security: 'Encrypted PO approvals with IP and timestamp logging'
    },
    businessBenefits: [
      '12% average reduction in raw material purchase spend',
      '100% audit compliance on purchasing authorization',
      '95%+ vendor on-time delivery compliance'
    ],
    kpis: [
      { label: 'Avg PO Processing Cycle', value: '1.5 hrs', detail: 'Down from 2 days' },
      { label: 'On-Time Vendor Delivery', value: '94.6%', detail: '+18% performance' },
      { label: 'Procurement Savings', value: '11.8%', detail: 'Contract compliance' }
    ],
    availableToday: [
      'Vendor Performance Scorecard',
      'Purchase Requisition Approval Hierarchy',
      'Multi-Currency PO Management',
      '3-Way Match Verification'
    ],
    aiRoadmap: [
      'AI Supplier Rate Spike Anomaly Detector',
      'Predictive Commodity Cost Trend Insights',
      'Autonomous RFQ Negotiation Assistant'
    ],
    relatedModuleSlugs: ['inventory-management', 'accounting-finance', 'quality-management']
  },
  {
    slug: 'accounting-finance',
    title: 'Accounting & Finance',
    category: 'Finance & Admin',
    shortDesc: 'Real-time ledger, Accounts Receivable/Payable, cash flow forecasting, and instant financial balance sheets.',
    fullDesc: 'Get an accurate, real-time pulse on business cash flow without waiting for month-end accounting closures. Owner OS Accounting connects operational triggers directly into financial ledgers.',
    iconName: 'CreditCard',
    problem: 'Delayed financial reporting (15+ days after month end), uncollected customer receivables, and unexpected cash flow shortages.',
    keyCapabilities: [
      'Automated double-entry general ledger with operational hooks',
      'Accounts Receivable (AR) aging with automated payment reminders',
      'Accounts Payable (AP) management with early settlement discounts',
      'Daily Cash Flow forecast & bank reconciliation',
      'Real-time P&L, Balance Sheet, and Trial Balance generation'
    ],
    workflowSteps: [
      { step: 1, title: 'Operational Event', desc: 'Dispatch generates invoice and posts to AR' },
      { step: 2, title: 'Payment Collection', desc: 'Bank statement auto-matched with open invoices' },
      { step: 3, title: 'Expense Approval', desc: 'PO matching auto-posts to AP ledger' },
      { step: 4, title: 'Financial Snapshot', desc: 'Instant executive cash flow overview' }
    ],
    technicalOverview: {
      dataTriggers: ['Invoice Posted', 'Payment Received', 'Overdue AR Flagged', 'Month-End Close'],
      integrations: ['Banking APIs', 'Tally Prime / QuickBooks Sync', 'Tax Filing Systems'],
      security: 'Role segregation between invoicing, approval, and payout execution'
    },
    businessBenefits: [
      'Real-time financial visibility 24/7/365',
      '22-day reduction in Average DSO (Days Sales Outstanding)',
      'Month-end closing reduced from 14 days to 4 hours'
    ],
    kpis: [
      { label: 'Days Sales Outstanding (DSO)', value: '34 days', detail: 'Down from 56 days' },
      { label: 'Month-End Close Time', value: '4 hours', detail: 'Near instant close' },
      { label: 'Bad Debt Write-off', value: '< 0.2%', detail: '90% reduction' }
    ],
    availableToday: [
      'Real-Time Cash Flow Command Bar',
      'Automated AR Overdue Collections Feed',
      'Multi-Company & Branch P&L Consolidation',
      'Tally & Banking API Synchronization'
    ],
    aiRoadmap: [
      'AI Cash Flow Shortfall Early Warning System',
      'Automated Anomaly & Expense Fraud Monitor',
      'AI Predictive Customer Credit Risk Scoring'
    ],
    relatedModuleSlugs: ['order-management', 'procurement', 'command-center']
  },
  {
    slug: 'hr-payroll',
    title: 'HR & Payroll',
    category: 'Finance & Admin',
    shortDesc: 'Attendance integration, shift management, incentive calculation, compliance, and automated payroll.',
    fullDesc: 'Manage your workforce effectively. HR & Payroll handles biometric attendance, shift rotations, piece-rate incentives for factory workers, overtime approvals, and automated statutory compliance.',
    iconName: 'Users',
    problem: 'Manual attendance spreadsheet errors, complex shift incentive miscalculations, delayed monthly payroll processing, and high employee query burden.',
    keyCapabilities: [
      'Biometric & Face Recognition Attendance integration',
      'Shop-floor piece-rate & shift incentive calculations',
      'Automated monthly payroll run with statutory tax slips',
      'Leave management & employee self-service mobile portal',
      'Performance evaluation and skills matrix database'
    ],
    workflowSteps: [
      { step: 1, title: 'Attendance Capture', desc: 'Biometric device syncs daily shifts and OT' },
      { step: 2, title: 'Incentive Calculation', desc: 'Shop-floor output logs sync with worker IDs' },
      { step: 3, title: 'Payroll Run', desc: 'System compiles earnings, deductions, and tax' },
      { step: 4, title: 'Direct Disbursal & Slips', desc: 'Bank payout file generated & digital slips sent' }
    ],
    technicalOverview: {
      dataTriggers: ['Shift Completed', 'Overdue Leave Request', 'Payroll Approved', 'Tax Update'],
      integrations: ['Biometric Machines', 'Bank Direct Payout API', 'WhatsApp Salary Slips'],
      security: 'Encrypted wage data with granular HR role restrictions'
    },
    businessBenefits: [
      'Zero errors in shop-floor worker payroll calculations',
      '90% reduction in HR administrative processing hours',
      'Full compliance with labor regulations and statutory filings'
    ],
    kpis: [
      { label: 'Payroll Run Time', value: '15 mins', detail: 'Down from 3 days' },
      { label: 'Attendance Sync Accuracy', value: '99.9%', detail: 'Automated biometric' },
      { label: 'HR Query Resolution', value: '< 2 hrs', detail: 'Mobile self-service' }
    ],
    availableToday: [
      'Biometric Attendance Live Feed',
      'Piece-rate Factory Incentive Calculator',
      'One-click Automated Monthly Payroll Run',
      'Employee Mobile WhatsApp Slip Distribution'
    ],
    aiRoadmap: [
      'AI Workforce Attrition Risk Predictor',
      'Autonomous Shift Rostering Optimizer',
      'Skill Gap & Training Recommendation Engine'
    ],
    relatedModuleSlugs: ['task-management', 'production-management', 'accounting-finance']
  },
  {
    slug: 'quality-management',
    title: 'Quality Management',
    category: 'Core Operations',
    shortDesc: 'Inspection checklists, incoming material QC, non-conformance (NCR) tracking, and ISO compliance.',
    fullDesc: 'Ensure consistent product quality at every stage. Quality Management digitizes incoming raw material inspections, in-process quality gates, pre-dispatch audits, and customer non-conformance root cause analysis (8D / CAPA).',
    iconName: 'ShieldCheck',
    problem: 'Undetected quality defects reaching customers, unorganized paper inspection sheets, and lack of root cause analysis on customer rejections.',
    keyCapabilities: [
      'Digitized Sampling Checklists & Parameter Bounds',
      'Incoming Material QC gatekeeper (Blocks GRN if failed)',
      'In-Process Quality Gates for manufacturing lines',
      'Non-Conformance Report (NCR) & CAPA tracking workflow',
      'Defect Pareto analysis & vendor defect attribution'
    ],
    workflowSteps: [
      { step: 1, title: 'Inspection Trigger', desc: 'GRN or Work Order milestone reaches QC gate' },
      { step: 2, title: 'Parameter Test', desc: 'Inspector logs physical measurements against specs' },
      { step: 3, title: 'Pass/Fail Determination', desc: 'System locks failed batches; alerts manager' },
      { step: 4, title: 'CAPA Root Cause', desc: 'Corrective Action Plan assigned to team member' }
    ],
    technicalOverview: {
      dataTriggers: ['QC Failed', 'NCR Created', 'Inspection Overdue', 'CAPA Sign-off'],
      integrations: ['Calibrated Measurement Tools', 'Camera Attachments', 'Vendor Quality Portal'],
      security: 'Mandatory digital signature for quality release approvals'
    },
    businessBenefits: [
      '82% reduction in customer quality complaints',
      'Instant supplier defect accountability',
      'Full audit trail for ISO 9001 / IATF certifications'
    ],
    kpis: [
      { label: 'First Pass Yield (FPY)', value: '97.6%', detail: '+8.2% improvement' },
      { label: 'Customer Rejection Rate', value: '0.12%', detail: 'World-class standard' },
      { label: 'Avg CAPA Resolution Time', value: '2.4 days', detail: 'Down from 18 days' }
    ],
    availableToday: [
      'Mobile Inspection Checklist App',
      'Incoming Material Gatekeeper Blocking',
      'Automated NCR & CAPA Tracking Workflow',
      'Quality Defect Pareto Analytics'
    ],
    aiRoadmap: [
      'AI Automated Visual Surface Defect Inspector',
      'Predictive Quality Parameter Drift Warning',
      'AI Root Cause 8D Report Generator'
    ],
    relatedModuleSlugs: ['production-management', 'inventory-management', 'procurement']
  },
  {
    slug: 'dispatch-logistics',
    title: 'Dispatch & Logistics',
    category: 'Supply Chain',
    shortDesc: 'Dispatch planning, vehicle loading optimization, e-Way bill generation, and delivery tracking.',
    fullDesc: 'Coordinate final-mile fulfillment smoothly. Dispatch & Logistics simplifies delivery scheduling, packaging verification, transport vehicle allocation, e-Way bill integration, and proof-of-delivery (POD) collection.',
    iconName: 'Truck',
    problem: 'Vehicles waiting idle at factory gates, incomplete shipment documentation, untracked transit delays, and disputes over delivered quantities.',
    keyCapabilities: [
      'Packing List & Vehicle Load Optimization',
      'One-click e-Way Bill & e-Invoice generation',
      'Transport Transporter Selection & Rate Comparison',
      'Digital Proof of Delivery (POD) mobile signature capture',
      'Real-time Vehicle Tracking & Customer Transit Feeds'
    ],
    workflowSteps: [
      { step: 1, title: 'Dispatch Request', desc: 'Finished goods verified against approved order' },
      { step: 2, title: 'Vehicle Allocation', desc: 'Transporter assigned and loading plan mapped' },
      { step: 3, title: 'Doc Generation', desc: 'Invoice, e-Way bill, and gate pass printed' },
      { step: 4, title: 'POD Capture', desc: 'Driver captures customer signature upon delivery' }
    ],
    technicalOverview: {
      dataTriggers: ['Goods Dispatched', 'Transit Delay Flagged', 'POD Uploaded', 'Gate Pass Cleared'],
      integrations: ['Government e-Way Bill Portal', 'GPS Vehicle Tracking', 'Transporter APIs'],
      security: 'QR coded tamper-evident gate passes'
    },
    businessBenefits: [
      '45% reduction in factory gate turnaround time',
      'Elimination of e-Way bill documentation errors',
      'Instant digital POD access for faster customer billing'
    ],
    kpis: [
      { label: 'On-Time In-Full (OTIF)', value: '97.2%', detail: '+12.4% reliability' },
      { label: 'Gate Turnaround Time', value: '28 mins', detail: 'Down from 2.5 hours' },
      { label: 'POD Digital Return Time', value: '< 1 hour', detail: 'Instant mobile upload' }
    ],
    availableToday: [
      'Dispatch Packing & Loading Planner',
      'Direct e-Way Bill & Gate Pass Creator',
      'Transporter Performance Tracker',
      'Mobile Customer Proof-of-Delivery App'
    ],
    aiRoadmap: [
      'AI Route & Multi-Drop Load Density Optimizer',
      'Predictive Delivery Delay Alert Engine',
      'Automated Freight Rate Negotiation Bot'
    ],
    relatedModuleSlugs: ['order-management', 'inventory-management', 'accounting-finance']
  },
  {
    slug: 'machine-maintenance',
    title: 'Machine & Maintenance',
    category: 'Core Operations',
    shortDesc: 'Preventive maintenance schedules, breakdowns tracking, spare parts inventory, and machine OEE.',
    fullDesc: 'Protect your valuable capital assets. Machine & Maintenance schedules preventive maintenance routines, tracks breakdown tickets on the shop floor, monitors spare parts inventory, and measures Overall Equipment Effectiveness (OEE).',
    iconName: 'Wrench',
    problem: 'Catastrophic unplanned equipment breakdowns, missing spare parts during repairs, and untracked machine maintenance expenses.',
    keyCapabilities: [
      'Preventive Maintenance (PM) Calendar & Checklist',
      'Shop-Floor Breakdown Ticket logging via mobile',
      'Spare Parts reservation & consumed material tracking',
      'Real-time Machine OEE (Availability x Performance x Quality)',
      'Equipment Health History & Maintenance Cost Ledger'
    ],
    workflowSteps: [
      { step: 1, title: 'Trigger/Alert', desc: 'PM schedule due date or breakdown ticket logged' },
      { step: 2, title: 'Technician Assignment', desc: 'Maintenance team notified with required spares' },
      { step: 3, title: 'Repair Execution', desc: 'Work done logged; machine trial run approved' },
      { step: 4, title: 'OEE Recalibration', desc: 'Machine returned to active production status' }
    ],
    technicalOverview: {
      dataTriggers: ['Breakdown Logged', 'PM Overdue', 'Spare Part Low Stock', 'OEE Drop'],
      integrations: ['IoT Vibration/Temp Sensors', 'Maintenance Kiosks', 'Spare Parts Warehouse'],
      security: 'Lockout/Tagout safety verification logs'
    },
    businessBenefits: [
      '64% reduction in unplanned machine downtime',
      '30% extension in critical machinery lifespan',
      '100% preventive maintenance compliance'
    ],
    kpis: [
      { label: 'Unplanned Downtime', value: '< 1.2%', detail: 'Down from 6.8%' },
      { label: 'Mean Time To Repair (MTTR)', value: '42 mins', detail: '58% improvement' },
      { label: 'PM Compliance Rate', value: '99.1%', detail: 'Zero missed routines' }
    ],
    availableToday: [
      'Preventive Maintenance Scheduler',
      'Mobile Breakdown Ticket Dispatch',
      'Spare Parts Consumption Audit',
      'Machine OEE Live Dashboard'
    ],
    aiRoadmap: [
      'AI Predictive Vibration Anomaly Detection',
      'Machine Thermal Degradation Warning Model',
      'Automated Spare Part Reorder Predictor'
    ],
    relatedModuleSlugs: ['production-management', 'inventory-management', 'quality-management']
  },
  {
    slug: 'task-management',
    title: 'Task Management',
    category: 'Management & AI',
    shortDesc: 'Cross-departmental task allocation, SLA deadline tracking, accountability matrices, and delegation feeds.',
    fullDesc: 'Ensure nothing falls through the cracks. Task Management converts business decisions, audit points, and manager directives into trackable tasks with clear owners, deadlines, and automated follow-ups.',
    iconName: 'CheckSquare',
    problem: 'Directives lost in verbal meetings, lack of accountability for cross-functional initiatives, and constantly chasing staff for status updates.',
    keyCapabilities: [
      'Cross-departmental Task Allocation & Escalation Rules',
      'SLA deadline tracking with automated nudge notifications',
      'Task dependency mapping (Gantt & Kanban views)',
      'Meeting Minutes (MOM) to Actionable Task Converter',
      'Individual & Team Accountability Index Scores'
    ],
    workflowSteps: [
      { step: 1, title: 'Task Creation', desc: 'Assigned manually or auto-generated by business rule' },
      { step: 2, title: 'Owner Notification', desc: 'Assigned staff receives priority alert with specs' },
      { step: 3, title: 'Progress Update', desc: 'Updates logged with attachments or proof of completion' },
      { step: 4, title: 'Closure Sign-off', desc: 'Manager verifies output; task closed' }
    ],
    technicalOverview: {
      dataTriggers: ['Task Assigned', 'SLA Breached', 'Status Updated', 'Approval Required'],
      integrations: ['WhatsApp Nudges', 'Email Gateways', 'Owner OS Command Center'],
      security: 'Private tasks visible only to assigned team & executive management'
    },
    businessBenefits: [
      '3x faster cross-functional task completion rate',
      'Zero reliance on manual phone chasers or verbal reminders',
      '100% transparent task history across projects'
    ],
    kpis: [
      { label: 'Task SLA On-Time Closure', value: '94.8%', detail: '+31% accountability' },
      { label: 'Avg Task Resolution', value: '1.2 days', detail: 'Down from 5.4 days' },
      { label: 'Unassigned Action Items', value: '0', detail: 'Zero orphaned tasks' }
    ],
    availableToday: [
      'Executive Delegation Command Feed',
      'SLA Nudge Notifications via WhatsApp/Email',
      'Kanban & List Multi-View Boards',
      'Departmental Accountability Metrics'
    ],
    aiRoadmap: [
      'AI Automated Task Prioritization Assistant',
      'Predictive SLA Delay Warning Engine',
      'Voice-to-Task AI Meeting Summarizer'
    ],
    relatedModuleSlugs: ['command-center', 'hr-payroll', 'projects']
  },
  {
    slug: 'crm',
    title: 'Customer Relationship Management (CRM)',
    category: 'Core Operations',
    shortDesc: 'Lead pipeline management, customer health monitoring, quote generation, and sales team tracking.',
    fullDesc: 'Grow your top line while nurturing existing accounts. Owner OS CRM tracks customer interactions from initial lead acquisition to quotation, contract signing, and ongoing account health.',
    iconName: 'Users',
    problem: 'Leads forgotten without follow-up, sales team dependency, uncoordinated client pricing quotes, and churn among key customer accounts.',
    keyCapabilities: [
      'Visual Sales Lead Pipeline (Kanban & Table Stages)',
      'Instant Quote Generator with Margin Guardrails',
      'Customer 360 Degree View (Orders, Invoices, Complaints, Visits)',
      'Sales Rep Visit Logging & Territory Management',
      'Account Health Scorecard & Churn Alert Trigger'
    ],
    workflowSteps: [
      { step: 1, title: 'Lead Capture', desc: 'Web form, email, or sales rep inquiry logged' },
      { step: 2, title: 'Qualification & Assignment', desc: 'Routed to relevant territory sales rep' },
      { step: 3, title: 'Quote & Deal Stage', desc: 'System quote sent with margin checks' },
      { step: 4, title: 'Win & Order Handoff', desc: 'Auto-converts into active Customer Order' }
    ],
    technicalOverview: {
      dataTriggers: ['Lead Assigned', 'Quote Generated', 'Deal Won/Lost', 'Churn Warning'],
      integrations: ['Email Sync', 'WhatsApp Business API', 'Order Management Module'],
      security: 'Sales rep access restricted to assigned client accounts'
    },
    businessBenefits: [
      '38% increase in sales lead conversion rate',
      'Zero lost sales opportunities due to missed follow-ups',
      'Complete visibility into sales rep field activities'
    ],
    kpis: [
      { label: 'Lead Conversion Rate', value: '24.2%', detail: '+7.8% conversion' },
      { label: 'Avg Quote Turnaround', value: '18 mins', detail: 'Down from 24 hours' },
      { label: 'Customer Retention Rate', value: '96.4%', detail: 'Industry leading' }
    ],
    availableToday: [
      'Visual Lead & Deal Pipeline Board',
      'Instant Quote Builder with Margin Rules',
      'Customer 360 Activity Timeline',
      'Sales Rep Activity & Call Logs'
    ],
    aiRoadmap: [
      'AI Lead Win Probability Scoring',
      'Automated Re-engagement Sales Bot',
      'Predictive Customer Attrition Alerting'
    ],
    relatedModuleSlugs: ['order-management', 'reporting-analytics', 'command-center']
  },
  {
    slug: 'reporting-analytics',
    title: 'Reporting & Analytics',
    category: 'Management & AI',
    shortDesc: 'Cross-functional BI dashboards, automated daily executive digests, custom report builder, and data exports.',
    fullDesc: 'Transform raw operational data into strategic clarity. Reporting & Analytics aggregates inputs from every business module into customizable dashboards, automated scheduled reports, and executive summary digests.',
    iconName: 'BarChart3',
    problem: 'Spending hours preparing manual Monday morning spreadsheets, conflicting metrics between departments, and delayed business insights.',
    keyCapabilities: [
      'Interactive Cross-Functional Business Intelligence Dashboards',
      'Automated Daily Executive Summary Digest (Email / WhatsApp)',
      'Custom Report Builder with drag-and-drop metrics',
      'Drill-down capabilities from macro KPI to underlying transaction',
      'Export to Excel, PDF, CSV, or BI connector formats'
    ],
    workflowSteps: [
      { step: 1, title: 'Data Aggregation', desc: 'Real-time synchronization across all Owner OS modules' },
      { step: 2, title: 'Metric Calculation', desc: 'Pre-computed KPIs updated instantly upon events' },
      { step: 3, title: 'Visual Rendering', desc: 'Executive dashboard updates with trend charts' },
      { step: 4, title: 'Scheduled Dispatch', desc: 'Digest emailed to owner at 8:00 AM daily' }
    ],
    technicalOverview: {
      dataTriggers: ['Daily Digest Time', 'Metric Anomaly Exceeded', 'Export Requested'],
      integrations: ['Data Warehouse', 'WhatsApp API', 'Email Gateways', 'PowerBI Sync'],
      security: 'Granular metric-level viewing permissions'
    },
    businessBenefits: [
      '100% elimination of manual spreadsheet report assembly',
      'Single source of truth across all business departments',
      'Instant access to multi-year historical trend comparisons'
    ],
    kpis: [
      { label: 'Report Generation Time', value: 'Instant', detail: 'Zero manual effort' },
      { label: 'Data Latency', value: '< 1 second', detail: 'Real-time sync' },
      { label: 'Management Time Saved', value: '12 hrs/wk', detail: 'Per executive' }
    ],
    availableToday: [
      'Executive Daily Morning Digest',
      'Drag-and-Drop BI Chart Builder',
      'Multi-Branch Consolidated Reporting',
      'One-Click Excel & PDF Exporter'
    ],
    aiRoadmap: [
      'Natural Language AI Query Engine ("Ask your data")',
      'Automated Anomaly Root Cause Summarizer',
      'Predictive What-If Business Simulator'
    ],
    relatedModuleSlugs: ['command-center', 'ai-copilot', 'accounting-finance']
  },
  {
    slug: 'command-center',
    title: 'Executive Command Center',
    category: 'Management & AI',
    shortDesc: 'The single-screen operational hub giving business owners total real-time control over their enterprise.',
    fullDesc: 'The flagship module of Owner OS. The Executive Command Center brings together orders, inventory, production, cash flow, employees, and machine health into one synchronized, high-density dashboard.',
    iconName: 'LayoutDashboard',
    problem: 'Business owners constantly calling multiple managers to know what is happening, feeling out of control, and reacting to crises instead of steering growth.',
    keyCapabilities: [
      'Single-screen real-time business health monitoring',
      'Configurable executive KPI tiles (Revenue, Cash, OEE, AR, Delays)',
      'Live Operational Feed highlighting anomalies and required sign-offs',
      'One-click drill down into orders, jobs, or financial invoices',
      'Emergency Override Controls & Priority Delegation'
    ],
    workflowSteps: [
      { step: 1, title: 'Overview', desc: 'Owner views full enterprise state at a glance' },
      { step: 2, title: 'Anomaly Alert', desc: 'System highlights bottleneck (e.g. Machine 3 Down)' },
      { step: 3, title: 'Drill Down', desc: 'Owner clicks alert to inspect job & technician status' },
      { step: 4, title: 'Direct Action', desc: 'Owner approves emergency maintenance or re-route' }
    ],
    technicalOverview: {
      dataTriggers: ['Critical Alert Triggered', 'Sign-Off Needed', 'KPI Breach'],
      integrations: ['All Owner OS Modules', 'Executive Mobile App', 'Smart TV Display'],
      security: 'Exclusive owner / executive tier encryption'
    },
    businessBenefits: [
      'Total peace of mind and complete operational visibility',
      'Ability to manage the business remotely from anywhere in the world',
      '50% reduction in owner time spent on routine fire-fighting'
    ],
    kpis: [
      { label: 'Owner Time Savings', value: '18 hrs/wk', detail: 'Focused on strategy' },
      { label: 'Decision Latency', value: '5 mins', detail: 'Down from 3 days' },
      { label: 'Operational Visibility', value: '100%', detail: 'Real-time digital twin' }
    ],
    availableToday: [
      'Real-Time Unified Executive Control Panel',
      'Live Anomaly & Approval Notification Stream',
      'Multi-Device Support (Desktop, Tablet, Mobile)',
      'Custom KPI Tile Layouts'
    ],
    aiRoadmap: [
      'AI Executive Decision Assistant',
      'Predictive Business Health Index',
      'Voice Command Control System'
    ],
    relatedModuleSlugs: ['reporting-analytics', 'ai-copilot', 'accounting-finance']
  },
  {
    slug: 'ai-copilot',
    title: 'AI Business Copilot',
    category: 'Management & AI',
    shortDesc: 'Context-aware AI assistant providing automated anomaly detection, smart recommendations, and predictive guidance.',
    fullDesc: 'Your 24/7 intelligent operational advisor. The AI Copilot continuously monitors enterprise data across orders, inventory, cash flow, and shop floor metrics, alerting management to anomalies and generating actionable recommendations.',
    iconName: 'Sparkles',
    problem: 'Sifting through endless data dashboards, missing subtle operational inefficiencies, and making critical business decisions based on gut feel rather than evidence.',
    keyCapabilities: [
      'Continuous Enterprise Anomaly & Leakage Detection',
      'Natural Language Business Query ("What is our highest margin product line this quarter?")',
      'Context-aware Action Recommendations with impact projections',
      'Automated Weekly Executive Narrative Summaries',
      'Predictive Risk Guardrails (Cash Flow, Customer Churn, Machine Breakdown)'
    ],
    workflowSteps: [
      { step: 1, title: 'Data Stream Monitor', desc: 'AI scans live transaction logs across modules' },
      { step: 2, title: 'Pattern Recognition', desc: 'Detects unusual pattern (e.g., Raw material rate spike +30%)' },
      { step: 3, title: 'Recommendation', desc: 'Presents option: "Switch to Supplier B to save $14,000"' },
      { step: 4, title: 'Execution Assistant', desc: 'Drafts RFQ or approval request for owner review' }
    ],
    technicalOverview: {
      dataTriggers: ['Data Anomaly Identified', 'User Natural Language Query', 'Weekly Summary Schedule'],
      integrations: ['Gemini 2.5 API', 'Owner OS Core Database', 'WhatsApp Copilot Bot'],
      security: 'Strict data privacy - tenant data is never used to train public models'
    },
    businessBenefits: [
      'Proactive identification of hidden profit leakage',
      'Instant answers to complex business queries without waiting for analyst reports',
      'Accelerated decision making with structured AI recommendations'
    ],
    kpis: [
      { label: 'Leakage Identified', value: '$84,000/yr', detail: 'Average annual savings' },
      { label: 'Query Response Time', value: '< 2 seconds', detail: 'Instant insights' },
      { label: 'Recommendation Accuracy', value: '94.2%', detail: 'Verified by owners' }
    ],
    availableToday: [
      'AVAILABLE TODAY: Automated Anomaly Alerts & Rule-based Recommendations',
      'AVAILABLE TODAY: Executive Weekly Highlights Narrative Generator',
      'AVAILABLE TODAY: Smart Search Across All Business Records'
    ],
    aiRoadmap: [
      'AI ROADMAP: Conversational Natural Language Database Copilot',
      'AI ROADMAP: Autonomous Multi-Agent Workorder & Purchase Negotiation',
      'AI ROADMAP: Predictive Demand & Macro-Economic Impact Engine'
    ],
    relatedModuleSlugs: ['command-center', 'reporting-analytics', 'accounting-finance']
  }
];
