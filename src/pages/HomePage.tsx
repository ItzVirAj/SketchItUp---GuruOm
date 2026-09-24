import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { 
  ArrowRight, 
  Sparkles, 
  ShieldCheck, 
  CheckCircle2, 
  AlertTriangle, 
  Cpu, 
  Factory, 
  Layers, 
  TrendingUp, 
  MessageSquare, 
  FileSpreadsheet, 
  Clock, 
  Zap, 
  HelpCircle,
  Building2,
  Users
} from 'lucide-react';

import { SEO } from '../components/common/SEO';
import { CTAButton } from '../components/common/CTAButton';
import { StatusBadge } from '../components/common/StatusBadge';
import { DashboardMockup } from '../components/interactive/DashboardMockup';
import { HubAndSpokeVisual } from '../components/interactive/HubAndSpokeVisual';
import { BeforeAfter } from '../components/interactive/BeforeAfter';
import { WorkflowSteps } from '../components/interactive/WorkflowSteps';
import { ModuleCard } from '../components/interactive/ModuleCard';
import { IndustryCard } from '../components/interactive/IndustryCard';
import { modulesData } from '../data/modulesData';
import { industriesData } from '../data/industriesData';

export const HomePage: React.FC = () => {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans space-y-24 pb-20">
      <SEO 
        title="SketchItUp Owner OS — An AI-Enabled Business Operating System"
        description="Connect orders, inventory, production, finance and people in one real-time command center for total business control."
      />

      {/* SECTION 1: HERO */}
      <section className="relative pt-28 sm:pt-36 pb-16 overflow-hidden">
        {/* Background Radial Glow & Grid */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-[600px] bg-radial-gradient opacity-80 pointer-events-none" />
        <div className="absolute inset-0 bg-grid-pattern opacity-40 pointer-events-none" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 space-y-12">
          
          <div className="text-center max-w-4xl mx-auto space-y-6">
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold bg-teal-500/10 text-teal-300 border border-teal-500/30 shadow-lg"
            >
              <Sparkles className="w-3.5 h-3.5 text-teal-400" />
              <span>SketchItUp Owner OS &mdash; The AI-Enabled Business Operating System</span>
            </motion.div>

            <motion.h1 
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="text-3xl sm:text-5xl lg:text-6xl font-extrabold text-white tracking-tight leading-[1.15]"
            >
              See Your Entire Business Through <span className="text-transparent bg-clip-text bg-gradient-to-r from-sky-400 via-teal-300 to-emerald-400">One Real-Time Command Center</span>
            </motion.h1>

            <motion.p 
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="text-base sm:text-lg text-slate-300 leading-relaxed max-w-3xl mx-auto font-normal"
            >
              Connect orders, inventory, production, finance and workforce into a single synchronized operating system. Eliminate operational leaks, replace fragmented Excel spreadsheets, and make faster executive decisions.
            </motion.p>

            <motion.div 
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="flex flex-wrap items-center justify-center gap-4 pt-2"
            >
              <CTAButton to="/book-a-demo" size="lg" variant="primary">
                Book a Demo
              </CTAButton>
              <CTAButton to="/owner-os" size="lg" variant="secondary">
                Explore Owner OS Architecture
              </CTAButton>
            </motion.div>

            <div className="pt-4 flex flex-wrap items-center justify-center gap-6 text-xs text-slate-400 font-medium">
              <span className="flex items-center gap-1.5"><ShieldCheck className="w-4 h-4 text-teal-400" /> AES-256 Encrypted</span>
              <span className="flex items-center gap-1.5"><Clock className="w-4 h-4 text-sky-400" /> 14-Day Rapid Deployment</span>
              <span className="flex items-center gap-1.5"><Zap className="w-4 h-4 text-amber-400" /> Tally & Banking API Ready</span>
            </div>
          </div>

          {/* SECTION 4 PREVIEW IN HERO: Interactive Executive Dashboard Mockup */}
          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="pt-4"
          >
            <DashboardMockup />
          </motion.div>

        </div>
      </section>


      {/* SECTION 2: BUSINESS PROBLEM */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        <div className="text-center max-w-3xl mx-auto space-y-3">
          <span className="text-xs font-mono font-bold uppercase text-rose-400 bg-rose-500/10 px-3 py-1 rounded border border-rose-500/30">
            THE PAIN OF FRAGMENTATION
          </span>
          <h2 className="text-2xl sm:text-4xl font-extrabold text-white">
            Trapped in Excel Spreadsheets & WhatsApp Chaos?
          </h2>
          <p className="text-sm sm:text-base text-slate-400">
            Most businesses don’t fail from lack of sales — they leak profits through operational disconnects between departments.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            {
              icon: FileSpreadsheet,
              title: 'Data Scattered in Excel',
              desc: 'Crucial stock numbers, job costs, and customer orders sit in isolated spreadsheets that become stale within hours.'
            },
            {
              icon: MessageSquare,
              title: 'Chasing Staff via WhatsApp',
              desc: 'Owners constantly phone managers and check group chats to ask simple questions: "Is order #402 dispatched yet?"'
            },
            {
              icon: Clock,
              title: 'Delayed Financial Closures',
              desc: 'Waiting 15 days after month-end to see your actual P&L, leaving you blind to active cash flow shortages.'
            },
            {
              icon: AlertTriangle,
              title: 'Untracked Material Leaks',
              desc: 'Raw material stockouts halt factory lines, while excess slow-moving inventory ties up hundreds of thousands in capital.'
            }
          ].map((item, idx) => (
            <div key={idx} className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-3 hover:border-rose-500/40 transition-colors">
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-rose-400 inline-block">
                <item.icon className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-white">{item.title}</h3>
              <p className="text-xs text-slate-400 leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>


      {/* SECTION 3: INTRODUCE OWNER OS (Interactive Hub & Spoke) */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <HubAndSpokeVisual />
      </section>


      {/* SECTION 5: AI-ENABLED BUSINESS (Today vs Roadmap) */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
        <div className="text-center max-w-3xl mx-auto space-y-3">
          <span className="text-xs font-mono font-bold uppercase text-amber-400 bg-amber-500/10 px-3 py-1 rounded border border-amber-500/30">
            PRAGMATIC AI VISION
          </span>
          <h2 className="text-2xl sm:text-4xl font-extrabold text-white">
            AI That Solves Real Operational Bottlenecks
          </h2>
          <p className="text-sm sm:text-base text-slate-400">
            No generic chatbots or floating orbs. We build AI that continuously scans your operational data loop: Data &rarr; Insights &rarr; Recommendations &rarr; Decisions.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          
          {/* Available Today */}
          <div className="p-8 rounded-2xl bg-slate-900 border border-teal-500/40 space-y-6 relative overflow-hidden shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-teal-500/10 text-teal-400 border border-teal-500/30">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">AVAILABLE TODAY</h3>
                  <p className="text-xs text-slate-400">Production-ready operational AI capabilities</p>
                </div>
              </div>
              <StatusBadge status="LIVE" />
            </div>

            <ul className="space-y-3 text-xs sm:text-sm text-slate-200">
              <li className="flex items-start gap-3">
                <CheckCircle2 className="w-4 h-4 text-teal-400 shrink-0 mt-1" />
                <span><strong>Automated Anomaly Stream:</strong> Instant alerts on raw material rate spikes, credit line breaches, and machine vibration drifts.</span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle2 className="w-4 h-4 text-teal-400 shrink-0 mt-1" />
                <span><strong>Smart Reorder Point Triggers:</strong> Calculates safety stock bounds automatically based on historical supplier lead times.</span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle2 className="w-4 h-4 text-teal-400 shrink-0 mt-1" />
                <span><strong>Weekly Executive Narrative Generator:</strong> Synthesizes cross-functional performance into a 1-page executive summary digest.</span>
              </li>
            </ul>
          </div>

          {/* AI Roadmap / Future Capabilities */}
          <div className="p-8 rounded-2xl bg-slate-900 border border-amber-500/40 space-y-6 relative overflow-hidden shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/30">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">AI ROADMAP / FUTURE CAPABILITIES</h3>
                  <p className="text-xs text-slate-400">Upcoming autonomous capabilities in development</p>
                </div>
              </div>
              <span className="text-[10px] font-mono font-bold px-2.5 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/30">
                ROADMAP 2026
              </span>
            </div>

            <ul className="space-y-3 text-xs sm:text-sm text-slate-200">
              <li className="flex items-start gap-3">
                <Sparkles className="w-4 h-4 text-amber-400 shrink-0 mt-1" />
                <span><strong>Autonomous Schedule Rebalancing:</strong> Dynamic auto-rerouting of shop floor job orders when a machine breaks down.</span>
              </li>
              <li className="flex items-start gap-3">
                <Sparkles className="w-4 h-4 text-amber-400 shrink-0 mt-1" />
                <span><strong>Conversational Database Copilot:</strong> Ask complex questions in natural language ("Show our top 3 most profitable products in Q3").</span>
              </li>
              <li className="flex items-start gap-3">
                <Sparkles className="w-4 h-4 text-amber-400 shrink-0 mt-1" />
                <span><strong>Computer Vision Quality Inspector:</strong> Automated camera-based surface defect detection on active assembly belts.</span>
              </li>
            </ul>
          </div>

        </div>
      </section>


      {/* SECTION 6: HOW OWNER OS WORKS */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <WorkflowSteps />
      </section>


      {/* SECTION 7: MODULES PREVIEW */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div className="space-y-2">
            <span className="text-xs font-mono font-bold uppercase text-teal-400 bg-teal-500/10 px-3 py-1 rounded border border-teal-500/30">
              ENTERPRISE MODULES
            </span>
            <h2 className="text-2xl sm:text-4xl font-extrabold text-white">
              14 Integrated Modular Engines
            </h2>
            <p className="text-sm text-slate-400">
              Activate only what you need today, and expand seamlessly as your operations grow.
            </p>
          </div>

          <CTAButton to="/modules" variant="secondary" size="md">
            View All 14 Modules
          </CTAButton>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {modulesData.slice(0, 8).map((mod) => (
            <ModuleCard key={mod.slug} module={mod} />
          ))}
        </div>
      </section>


      {/* SECTION 8: BEFORE VS AFTER */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <BeforeAfter />
      </section>


      {/* SECTION 9: WHO IS IT FOR? (Industry Solutions) */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div className="space-y-2">
            <span className="text-xs font-mono font-bold uppercase text-teal-400 bg-teal-500/10 px-3 py-1 rounded border border-teal-500/30">
              TARGET VERTICALS
            </span>
            <h2 className="text-2xl sm:text-4xl font-extrabold text-white">
              Built for Ambitious Business Owners
            </h2>
            <p className="text-sm text-slate-400">
              Deep industry customization starting with Manufacturing LIVE today.
            </p>
          </div>

          <CTAButton to="/solutions" variant="secondary" size="md">
            All Industry Solutions
          </CTAButton>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {industriesData.slice(0, 4).map((ind) => (
            <IndustryCard key={ind.slug} industry={ind} />
          ))}
        </div>
      </section>


      {/* SECTION 10: CUSTOM SOLUTIONS */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 sm:p-12 relative overflow-hidden font-sans">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            
            <div className="lg:col-span-8 space-y-4">
              <span className="text-xs font-mono font-bold text-amber-400 uppercase tracking-wider bg-amber-500/10 px-3 py-1 rounded border border-amber-500/30">
                CUSTOM OPERATING SYSTEM METHODOLOGY
              </span>
              <h2 className="text-2xl sm:text-4xl font-extrabold text-white leading-tight">
                "Don’t fit your business into software. Build software around your business."
              </h2>
              <p className="text-sm text-slate-300 leading-relaxed">
                Have proprietary manufacturing processes, unique custom BOM routings, or specialized quality standards? Our Custom OS team maps your exact workflows into tailored Owner OS modules.
              </p>
              
              <div className="flex flex-wrap gap-4 pt-2 text-xs font-semibold text-slate-300">
                <span className="flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4 text-teal-400" /> Process Mapping & Blueprinting</span>
                <span className="flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4 text-teal-400" /> Custom API & IoT Integration</span>
                <span className="flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4 text-teal-400" /> Dedicated SLA Support</span>
              </div>
            </div>

            <div className="lg:col-span-4 text-left lg:text-right">
              <CTAButton to="/custom-solutions" variant="accent" size="lg">
                Explore Custom OS
              </CTAButton>
            </div>

          </div>
        </div>
      </section>


      {/* SECTION 11: FINAL HIGH-CONTRAST CTA */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900 border border-teal-500/40 rounded-3xl p-10 sm:p-16 text-center space-y-8 relative overflow-hidden shadow-2xl">
          <div className="max-w-3xl mx-auto space-y-4">
            <h2 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight">
              Ready to See Your Business Through <span className="text-teal-400">One Real-Time Command Center?</span>
            </h2>
            <p className="text-base text-slate-300 leading-relaxed max-w-2xl mx-auto">
              Join forward-thinking enterprise owners who have replaced spreadsheet chaos with SketchItUp Owner OS. Book a 30-minute tailored demo session today.
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
            <CTAButton to="/book-a-demo" size="lg" variant="primary">
              Book a Demo
            </CTAButton>
            <CTAButton to="/resources/faqs" size="lg" variant="secondary">
              Read FAQs
            </CTAButton>
          </div>
        </div>
      </section>

    </div>
  );
};
