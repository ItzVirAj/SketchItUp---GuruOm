export type NavigationPage = 
  | 'dashboard'
  | 'analytics'
  | 'projects'
  | 'team'
  | 'ai-studio'
  | 'settings';

export interface MetricCardData {
  id: string;
  title: string;
  value: string;
  change: string;
  isPositive: boolean;
  timeframe: string;
}

export interface PerformancePoint {
  month: string;
  revenue: number;
  users: number;
  aiQueries: number;
  latency: number;
}

export interface ActivityItem {
  id: string;
  type: 'subscription' | 'system' | 'payment' | 'login' | 'ai';
  title: string;
  description: string;
  timestamp: string;
  user?: string;
  badgeColor: 'indigo' | 'emerald' | 'amber' | 'slate' | 'rose';
}

export interface TeamProject {
  id: string;
  name: string;
  icon: string;
  progress: number;
  status: 'In Progress' | 'Review' | 'Completed' | 'Planning';
  color: string;
  lead: string;
  deadline: string;
}

export interface TeamMember {
  id: string;
  name: string;
  role: string;
  email: string;
  avatar: string;
  status: 'Active' | 'Away' | 'Offline';
  projectsCount: number;
  lastActive: string;
}

export interface AiInsight {
  id: string;
  category: string;
  title: string;
  summary: string;
  impact: 'High' | 'Medium' | 'Low';
  date: string;
}
