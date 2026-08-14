import { IndustryItem } from '../types';

export const industriesData: IndustryItem[] = [
  {
    slug: 'manufacturing',
    title: 'Discrete & Process Manufacturing',
    status: 'LIVE',
    description: 'Purpose-built for factory floors, machine shops, assembly units, and process manufacturing enterprises.',
    keyChallenges: [
      'Unscheduled machine downtime & untracked maintenance costs',
      'High scrap rate and material yield loss during production runs',
      'Mismatch between customer order deadlines and shop floor capacity',
      'Paper-based inspection reports failing quality audit compliance'
    ],
    ownerOsBenefits: [
      'Complete end-to-end BOM to Finished Goods traceability',
      'Shop-floor tablet stations for real-time operator work order logging',
      '32% increase in Overall Equipment Effectiveness (OEE)',
      'Automated preventive maintenance schedules preventing breakdown'
    ],
    modulesUsed: [
      'production-management',
      'inventory-management',
      'quality-management',
      'machine-maintenance',
      'procurement'
    ],
    targetAudience: 'Factory Owners, Plant Managers, Operations Heads, Industrial Directors'
  },
  {
    slug: 'industrial-smes',
    title: 'Industrial SMEs & Engineering Units',
    status: 'COMING_SOON',
    description: 'Designed specifically for mid-sized precision engineering, fabrication, and component manufacturing businesses.',
    keyChallenges: [
      'Job-work tracking with variable customer blueprints and BOMs',
      'Delayed payments from large enterprise buyers impacting cash flow',
      'Lack of skilled IT personnel to manage complex legacy ERPs'
    ],
    ownerOsBenefits: [
      'Zero-code customizable job routing sheets',
      'Automated payment milestone reminders and credit gatekeeping',
      'Lightweight web architecture requiring zero local servers or IT staff'
    ],
    modulesUsed: ['production-management', 'order-management', 'accounting-finance', 'task-management'],
    targetAudience: 'Engineering Unit Owners, General Managers, Workshop Supervisors',
    roadmapTimeline: 'Q3 Release - Early Access Signups Open'
  },
  {
    slug: 'family-businesses',
    title: 'Family-Owned Enterprises',
    status: 'COMING_SOON',
    description: 'Empowering multi-generational family businesses to transition from owner-dependency to institutional operating control.',
    keyChallenges: [
      'Business heavily dependent on senior family members for daily approvals',
      'Informal communication channels (WhatsApp/Verbal) causing operational leaks',
      'Resistance to overly complex, rigid legacy software from long-term staff'
    ],
    ownerOsBenefits: [
      'Executive Command Center enabling remote multi-branch oversight',
      'Rule-based delegation workflows maintaining owner control with reduced burnout',
      'Intuitive user experience with minimal training curve for staff'
    ],
    modulesUsed: ['command-center', 'task-management', 'accounting-finance', 'crm'],
    targetAudience: '2nd & 3rd Generation Business Owners, Managing Directors, Promoters',
    roadmapTimeline: 'Q3 Release - Early Access Signups Open'
  },
  {
    slug: 'growing-companies',
    title: 'Fast-Growing Mid-Market Enterprises',
    status: 'COMING_SOON',
    description: 'Scalable operational infrastructure for enterprises expanding rapidly across multiple plants, warehouses, and sales offices.',
    keyChallenges: [
      'Outgrowing entry-level accounting tools like Tally / QuickBooks',
      'Fragmented data silos across regional offices and branches',
      'Inability to consolidate financial P&L in real time'
    ],
    ownerOsBenefits: [
      'Multi-branch and multi-entity consolidation',
      'High-throughput transaction handling without speed degradation',
      'Role-based security ensuring strict data isolation across departments'
    ],
    modulesUsed: ['accounting-finance', 'reporting-analytics', 'inventory-management', 'hr-payroll'],
    targetAudience: 'Chief Executive Officers, Chief Financial Officers, Operations Directors',
    roadmapTimeline: 'Q4 Release - Early Access Signups Open'
  },
  {
    slug: 'service-businesses',
    title: 'B2B Technical & Field Service Firms',
    status: 'COMING_SOON',
    description: 'Unified management for industrial servicing, HVAC, maintenance contractors, and turnkey project execution.',
    keyChallenges: [
      'Untracked technician field hours and spare parts usage on client sites',
      'Delayed invoicing following project milestone completions',
      'Low visibility on project margin profitability'
    ],
    ownerOsBenefits: [
      'Mobile technician app for site check-in, photo upload, and customer signature',
      'Instant job costing connecting labor hours, materials, and expenses',
      'Automated billing upon client milestone sign-off'
    ],
    modulesUsed: ['task-management', 'crm', 'accounting-finance', 'hr-payroll'],
    targetAudience: 'Field Operations Managers, Service Directors, Project Managers',
    roadmapTimeline: 'Q4 Release - Waitlist Open'
  },
  {
    slug: 'retail-distribution',
    title: 'Wholesale & B2B Distribution Networks',
    status: 'COMING_SOON',
    description: 'Optimized stock distribution, batch tracking, dealer portals, and van sales management.',
    keyChallenges: [
      'High credit risk and overdue receivables across dealer networks',
      'Stock mismatches between central warehouse and regional stock points',
      'Slow order turnaround for field sales reps'
    ],
    ownerOsBenefits: [
      'Dealer self-service order portal with real-time stock availability',
      'Credit limit enforcement preventing shipments to defaulting accounts',
      'Route-wise dispatch and loading optimization'
    ],
    modulesUsed: ['order-management', 'inventory-management', 'dispatch-logistics', 'crm'],
    targetAudience: 'Distributors, Wholesale Business Owners, Supply Chain Directors',
    roadmapTimeline: 'Future Expansion'
  },
  {
    slug: 'agriculture',
    title: 'Agri-Processing & Food Manufacturing',
    status: 'COMING_SOON',
    description: 'Farm-to-fork traceability, perishable inventory management, and batch processing controls.',
    keyChallenges: [
      'Perishable raw material spoilage and shelf-life tracking',
      'Strict food safety compliance and batch recall mandates',
      'Seasonal price fluctuations impacting gross margins'
    ],
    ownerOsBenefits: [
      'FEFO (First Expired First Out) automated stock issuance',
      'One-click forward and backward batch traceability for audits',
      'Yield conversion tracking from raw harvest to finished packaged goods'
    ],
    modulesUsed: ['quality-management', 'inventory-management', 'production-management', 'procurement'],
    targetAudience: 'Agri-Business Owners, Quality Assurance Heads, Processing Managers',
    roadmapTimeline: 'Future Expansion'
  },
  {
    slug: 'healthcare-bio',
    title: 'Pharma & Medical Device Manufacturing',
    status: 'COMING_SOON',
    description: 'Strict regulatory compliance, cleanroom production logging, and lot traceability.',
    keyChallenges: [
      'Stringent regulatory compliance (GMP, ISO 13485) paperwork burden',
      'Zero tolerance for calibration or quality parameter drift',
      'Complex multi-stage approval requirements'
    ],
    ownerOsBenefits: [
      'Digitized e-Batch Execution Records (eBER) with 21 CFR Part 11 electronic signatures',
      'Automated equipment calibration logs and environmental parameter alerts',
      'Full supplier material certification verification'
    ],
    modulesUsed: ['quality-management', 'production-management', 'machine-maintenance', 'inventory-management'],
    targetAudience: 'Pharma Plant Directors, QA/RA Managers, Technical Directors',
    roadmapTimeline: 'Future Expansion'
  }
];
