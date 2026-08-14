import { MetricCardData, PerformancePoint, ActivityItem, TeamProject, TeamMember, AiInsight } from '../types/dashboard';

export const initialMetrics: MetricCardData[] = [
  {
    id: 'revenue',
    title: 'Total Revenue',
    value: '$482,900',
    change: '+12.5%',
    isPositive: true,
    timeframe: 'vs last month'
  },
  {
    id: 'users',
    title: 'Active Users',
    value: '12,402',
    change: '+4.2%',
    isPositive: true,
    timeframe: 'vs last month'
  },
  {
    id: 'session',
    title: 'Avg. Session',
    value: '14m 02s',
    change: '-2.1%',
    isPositive: false,
    timeframe: 'vs last month'
  },
  {
    id: 'conversion',
    title: 'Conversion',
    value: '3.24%',
    change: '+0.8%',
    isPositive: true,
    timeframe: 'vs last month'
  }
];

export const performanceData: PerformancePoint[] = [
  { month: 'Jan', revenue: 240000, users: 8200, aiQueries: 110000, latency: 140 },
  { month: 'Feb', revenue: 280000, users: 8900, aiQueries: 125000, latency: 132 },
  { month: 'Mar', revenue: 260000, users: 9100, aiQueries: 118000, latency: 128 },
  { month: 'Apr', revenue: 340000, users: 10200, aiQueries: 145000, latency: 125 },
  { month: 'May', revenue: 410000, users: 11400, aiQueries: 168000, latency: 118 },
  { month: 'Jun', revenue: 390000, users: 11200, aiQueries: 160000, latency: 121 },
  { month: 'Jul', revenue: 350000, users: 10800, aiQueries: 152000, latency: 115 },
  { month: 'Aug', revenue: 290000, users: 9800, aiQueries: 130000, latency: 112 },
  { month: 'Sep', revenue: 330000, users: 10500, aiQueries: 142000, latency: 108 },
  { month: 'Oct', revenue: 430000, users: 11900, aiQueries: 175000, latency: 105 },
  { month: 'Nov', revenue: 470000, users: 12100, aiQueries: 182000, latency: 98 },
  { month: 'Dec', revenue: 482900, users: 12402, aiQueries: 184200, latency: 92 }
];

export const initialActivities: ActivityItem[] = [
  {
    id: 'act-1',
    type: 'subscription',
    title: 'New subscription',
    description: 'Zoe Miller purchased Pro Plan ($299/mo)',
    timestamp: '2 minutes ago',
    user: 'Zoe Miller',
    badgeColor: 'indigo'
  },
  {
    id: 'act-2',
    type: 'system',
    title: 'System update',
    description: 'v2.4.0 successfully deployed with Gemini 2.0 pipeline',
    timestamp: '45 minutes ago',
    badgeColor: 'emerald'
  },
  {
    id: 'act-3',
    type: 'payment',
    title: 'Payment pending',
    description: 'Invoice #8492 processing ($1,450.00)',
    timestamp: '2 hours ago',
    badgeColor: 'amber'
  },
  {
    id: 'act-4',
    type: 'login',
    title: 'User login',
    description: 'Alex Rivera logged in from London, UK (IP 194.28.14.2)',
    timestamp: '3 hours ago',
    user: 'Alex Rivera',
    badgeColor: 'slate'
  },
  {
    id: 'act-5',
    type: 'ai',
    title: 'AI Anomaly Detected',
    description: 'Latency optimization triggered automatically on cluster-04',
    timestamp: '5 hours ago',
    badgeColor: 'indigo'
  }
];

export const initialProjects: TeamProject[] = [
  {
    id: 'proj-1',
    name: 'Design System v2',
    icon: '🎨',
    progress: 75,
    status: 'In Progress',
    color: 'indigo',
    lead: 'Alex Rivera',
    deadline: 'Aug 24, 2026'
  },
  {
    id: 'proj-2',
    name: 'Backend Optimization',
    icon: '⚡',
    progress: 42,
    status: 'In Progress',
    color: 'emerald',
    lead: 'Sophia Chen',
    deadline: 'Sep 10, 2026'
  },
  {
    id: 'proj-3',
    name: 'AI Model Fine-tuning',
    icon: '🧠',
    progress: 88,
    status: 'Review',
    color: 'amber',
    lead: 'Marcus Vance',
    deadline: 'Aug 18, 2026'
  },
  {
    id: 'proj-4',
    name: 'Mobile App v3 Release',
    icon: '📱',
    progress: 20,
    status: 'Planning',
    color: 'slate',
    lead: 'Elena Rostova',
    deadline: 'Oct 01, 2026'
  }
];

export const initialTeamMembers: TeamMember[] = [
  {
    id: 'mem-1',
    name: 'Alex Rivera',
    role: 'Lead Architect',
    email: 'alex.rivera@stratum.ai',
    avatar: 'AR',
    status: 'Active',
    projectsCount: 4,
    lastActive: 'Just now'
  },
  {
    id: 'mem-2',
    name: 'Sophia Chen',
    role: 'Senior Staff Engineer',
    email: 'sophia.c@stratum.ai',
    avatar: 'SC',
    status: 'Active',
    projectsCount: 3,
    lastActive: '12m ago'
  },
  {
    id: 'mem-3',
    name: 'Marcus Vance',
    role: 'Head of AI Research',
    email: 'marcus.v@stratum.ai',
    avatar: 'MV',
    status: 'Away',
    projectsCount: 2,
    lastActive: '1h ago'
  },
  {
    id: 'mem-4',
    name: 'Elena Rostova',
    role: 'Product Lead',
    email: 'elena.r@stratum.ai',
    avatar: 'ER',
    status: 'Active',
    projectsCount: 5,
    lastActive: '25m ago'
  },
  {
    id: 'mem-5',
    name: 'David Kalu',
    role: 'DevOps & Cloud Lead',
    email: 'david.k@stratum.ai',
    avatar: 'DK',
    status: 'Offline',
    projectsCount: 2,
    lastActive: '1d ago'
  }
];

export const initialAiInsights: AiInsight[] = [
  {
    id: 'ins-1',
    category: 'Revenue Optimization',
    title: 'Upsell opportunity in Enterprise Cohort B',
    summary: '24 accounts reached 90% AI token usage limit in the past 7 days. Recommending targeted expansion messaging.',
    impact: 'High',
    date: 'Today at 05:30 AM'
  },
  {
    id: 'ins-2',
    category: 'Infrastructure',
    title: 'Latency decrease observed after v2.4.0',
    summary: 'Average API request duration dropped by 18ms across US-East regions following backend query caching.',
    impact: 'Medium',
    date: 'Yesterday'
  },
  {
    id: 'ins-3',
    category: 'User Retention',
    title: 'Session duration bump (+14%) on Mobile',
    summary: 'Mobile app dark mode launch increased active evening session lengths by 14.2%.',
    impact: 'Medium',
    date: '3 days ago'
  }
];
