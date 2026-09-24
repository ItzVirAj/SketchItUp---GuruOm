import { TeamMember } from '../types';

export const companyData = {
  brandName: 'SketchItUp Solutions',
  productName: 'SketchItUp Owner OS',
  tagline: 'An AI-Enabled Business Operating System for Complete Control',
  vision: 'To empower ambitious business owners with real-time operational clarity, turning complex enterprise workflows into competitive advantage through intelligent software.',
  mission: 'To eliminate operational fragmentation by building a unified, intuitive, and AI-enabled operating system that connects orders, inventory, production, finance, and people into one real-time command center.',
  founderPerspective: {
    headline: 'Built from the Shop Floor Up',
    quote: 'We witnessed hundreds of talented business owners trapped in daily fire-fighting — chasing staff for updates, wrestling with disconnected Excel sheets, and waiting weeks for accounting closures. Legacy ERPs were too rigid, expensive, and complex. We built SketchItUp Owner OS to give owners the real-time clarity, control, and freedom they deserve.',
    author: 'SketchItUp Leadership Team'
  },
  principles: [
    {
      title: 'Real-Time Operational Clarity',
      desc: 'Data must reflect live physical reality on the shop floor, not yesterday’s manual log entry.'
    },
    {
      title: 'Don’t Fit Your Business Into Software',
      desc: 'Software must adapt to your unique competitive process, not force rigid artificial templates.'
    },
    {
      title: 'Pragmatic AI Over Hype',
      desc: 'We focus strictly on AI that solves real operational bottlenecks — automated alerts, smart reordering, and leakage prevention.'
    },
    {
      title: 'Empowerment Over Control',
      desc: 'Owner OS gives owners confidence to delegate effectively while maintaining full executive visibility.'
    }
  ],
  teamMembers: [
    {
      name: 'Executive Leadership',
      role: 'Strategy & Enterprise Architecture',
      bio: 'Decades of combined expertise in manufacturing operations, industrial automation, and enterprise SaaS systems.',
      category: 'Leadership' as const,
      avatarInitials: 'EL'
    },
    {
      name: 'Product & AI Engineering',
      role: 'Core OS Engine & Machine Learning',
      bio: 'Specialists in high-density real-time data architectures, IoT integration, and context-aware business intelligence models.',
      category: 'Engineering & AI' as const,
      avatarInitials: 'PE'
    },
    {
      name: 'Client Success & Deployment',
      role: 'Implementation & Operational Coaching',
      bio: 'Dedicated industrial engineers and workflow specialists guiding seamless 14-day plant deployments.',
      category: 'Operations' as const,
      avatarInitials: 'CS'
    }
  ]
};
