export interface ModuleItem {
  slug: string;
  title: string;
  category: 'Core Operations' | 'Finance & Admin' | 'Management & AI' | 'Supply Chain';
  shortDesc: string;
  fullDesc: string;
  iconName: string;
  problem: string;
  keyCapabilities: string[];
  workflowSteps: { step: number; title: string; desc: string }[];
  technicalOverview: {
    dataTriggers: string[];
    integrations: string[];
    security: string;
  };
  businessBenefits: string[];
  kpis: { label: string; value: string; detail: string }[];
  availableToday: string[];
  aiRoadmap: string[];
  relatedModuleSlugs: string[];
}

export interface IndustryItem {
  slug: string;
  title: string;
  status: 'LIVE' | 'COMING_SOON';
  description: string;
  keyChallenges: string[];
  ownerOsBenefits: string[];
  modulesUsed: string[];
  targetAudience: string;
  roadmapTimeline?: string;
}

export interface FaqItem {
  id: string;
  category: 'General' | 'Owner OS' | 'Implementation' | 'Security & Tech' | 'Pricing & Demo';
  question: string;
  answer: string;
}

export interface BlogPost {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  category: 'Owner Insights' | 'AI & Automation' | 'Manufacturing' | 'Operations';
  readTime: string;
  date: string;
  author: {
    name: string;
    role: string;
  };
}

export interface CaseStudy {
  id: string;
  slug: string;
  title: string;
  clientType: string;
  industry: string;
  metrics: { label: string; value: string }[];
  summary: string;
}

export interface TeamMember {
  name: string;
  role: string;
  bio: string;
  category: 'Leadership' | 'Engineering & AI' | 'Operations';
  avatarInitials: string;
}

export interface DemoFormData {
  name: string;
  company: string;
  designation: string;
  industry: string;
  companySize: string;
  phone: string;
  email: string;
  currentSoftware: string;
  primaryChallenge: string;
  modulesInterested: string[];
  preferredDemoTime: string;
  additionalInfo: string;
}

export interface AnalyticsEvent {
  eventName: string;
  properties?: Record<string, any>;
  timestamp: string;
}
