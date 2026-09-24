import { FaqItem, BlogPost, CaseStudy } from '../types';

export const faqsData: FaqItem[] = [
  {
    id: 'faq-1',
    category: 'General',
    question: 'What is SketchItUp Owner OS?',
    answer: 'SketchItUp Owner OS is an AI-Enabled Business Operating System designed for SME owners and enterprise leaders. Unlike traditional static ERPs, Owner OS connects orders, inventory, production, finance, and workforce into a real-time command center that actively highlights operational leaks, automates workflows, and assists decision-making.'
  },
  {
    id: 'faq-2',
    category: 'General',
    question: 'How is Owner OS different from legacy ERP systems like SAP or Tally?',
    answer: 'Traditional ERPs are retrospective data archives — they record what happened days or weeks ago through tedious manual data entry. Owner OS is a live operational control system. It provides real-time visibility, mobile operator interfaces, proactive anomaly alerts, and an intuitive user experience that staff actually enjoy using, without requiring months of costly consultants.'
  },
  {
    id: 'faq-3',
    category: 'Owner OS',
    question: 'Can we start with a few modules and expand later?',
    answer: 'Yes! Owner OS is built with a modular plug-and-play architecture. Many clients start with Core Operations (Orders, Inventory, Production) or Accounting & Finance, and progressively activate additional modules like Quality, Maintenance, or AI Copilot as their operations mature.'
  },
  {
    id: 'faq-4',
    category: 'Owner OS',
    question: 'Is Owner OS suitable for custom or job-work manufacturing?',
    answer: 'Absolutely. Owner OS natively supports custom BOMs, job-work order routing, variable raw material yield tracking, and multi-stage sub-contracting workflows common in precision engineering and custom fabrication.'
  },
  {
    id: 'faq-5',
    category: 'Implementation',
    question: 'How long does implementation take?',
    answer: 'Typical deployment takes between 2 to 4 weeks, compared to 6–12 months for legacy ERPs. Our pre-configured industry templates and data migration tools allow rapid onboarding with minimal disruption to your daily factory operations.'
  },
  {
    id: 'faq-6',
    category: 'Implementation',
    question: 'Can Owner OS integrate with our existing Tally or accounting software?',
    answer: 'Yes. Owner OS features automated bi-directional synchronization with Tally Prime, QuickBooks, and popular banking APIs. You can maintain your existing accounting compliance while giving your operational team real-time execution tools.'
  },
  {
    id: 'faq-7',
    category: 'Security & Tech',
    question: 'Where is our business data hosted, and how secure is it?',
    answer: 'Your data is encrypted at rest and in transit using enterprise-grade AES-256 and TLS 1.3 encryption on secure cloud infrastructure. Each enterprise operates in an isolated database environment with strict role-based access control and continuous automated backups.'
  },
  {
    id: 'faq-8',
    category: 'Security & Tech',
    question: 'Is our proprietary business data used to train AI models?',
    answer: 'Never. Your enterprise data is strictly confidential and isolated. Our AI features operate on private, secure contextual models that process your data solely for your organization. Your data is never shared or used for public model training.'
  },
  {
    id: 'faq-9',
    category: 'Pricing & Demo',
    question: 'How is Owner OS priced?',
    answer: 'Owner OS is priced on a transparent subscription model based on selected modules and active user tiers. There are no hidden per-transaction fees or unexpected upgrade traps. Contact us for a customized demo and quote tailored to your plant setup.'
  },
  {
    id: 'faq-10',
    category: 'Pricing & Demo',
    question: 'What happens during a Book a Demo session?',
    answer: 'During a 30-minute tailored demo, an Operational Specialist reviews your current workflow pain points (e.g. inventory leaks, production bottlenecks), demonstrates relevant Owner OS modules with live data scenarios, and maps out a step-by-step deployment roadmap.'
  }
];

export const blogPostsData: BlogPost[] = [
  {
    id: 'blog-1',
    slug: 'why-traditional-erps-fail-manufacturing-smes',
    title: 'Why Traditional ERPs Fail Manufacturing SMEs (And What to Do Instead)',
    excerpt: 'Discover why 70% of legacy ERP implementations exceed budgets or get abandoned by factory teams, and how the Business Operating System approach restores agility.',
    category: 'Owner Insights',
    readTime: '6 min read',
    date: 'February 2, 2026',
    author: {
      name: 'SketchItUp Product Team',
      role: 'Operations & AI Engineering'
    }
  },
  {
    id: 'blog-2',
    slug: 'from-excel-chaos-to-realtime-command-center',
    title: 'From Excel & WhatsApp Chaos to a Real-Time Executive Command Center',
    excerpt: 'How multi-generational business owners are replacing fragmented spreadsheets and endless WhatsApp groups with centralized digital control.',
    category: 'Operations',
    readTime: '8 min read',
    date: 'January 28, 2026',
    author: {
      name: 'SketchItUp Strategy Desk',
      role: 'Enterprise Solutions'
    }
  },
  {
    id: 'blog-3',
    slug: 'pragmatic-ai-for-the-factory-floor',
    title: 'Pragmatic AI for the Factory Floor: Beyond the Hype',
    excerpt: 'Cut through the AI marketing fluff. Learn how automated anomaly alerts, predictive reorder points, and smart schedule rebalancing deliver measurable ROI today.',
    category: 'AI & Automation',
    readTime: '5 min read',
    date: 'January 15, 2026',
    author: {
      name: 'AI Research Group',
      role: 'SketchItUp Solutions'
    }
  }
];

export const caseStudiesData: CaseStudy[] = [
  {
    id: 'cs-1',
    slug: 'precision-components-oee-breakthrough',
    title: 'Apex Precision Engineering: 34% OEE Gain in 60 Days',
    clientType: 'Discrete Automotive Component Manufacturer',
    industry: 'Discrete Manufacturing',
    metrics: [
      { label: 'OEE Increase', value: '+34%' },
      { label: 'Unplanned Downtime', value: '-62%' },
      { label: 'ROI Payback', value: '45 Days' }
    ],
    summary: 'By deploying Owner OS Production & Machine Maintenance modules with shop-floor tablet kiosks, Apex eliminated paper job sheets and gained instant visibility into machine bottlenecks.'
  },
  {
    id: 'cs-2',
    slug: 'industrial-polymers-inventory-leak-reduction',
    title: 'Vanguard Industrial Polymers: $120,000 Saved in Raw Material Waste',
    clientType: 'Process Chemical & Polymer Extrusion Plant',
    industry: 'Process Manufacturing',
    metrics: [
      { label: 'Material Waste Saved', value: '$120K' },
      { label: 'Stockout Incidents', value: 'Zero' },
      { label: 'Inventory Turnover', value: '8.2x' }
    ],
    summary: 'Vanguard replaced error-prone manual spreadsheets with Owner OS Inventory & Quality modules, enforcing barcode-verified batch issuance and automated reorder points.'
  }
];
