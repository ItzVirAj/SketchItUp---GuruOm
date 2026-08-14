import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { SEO } from '../components/common/SEO';
import { Breadcrumbs } from '../components/common/Breadcrumbs';
import { CTAButton } from '../components/common/CTAButton';
import { ArchitectureDiagram } from '../components/interactive/ArchitectureDiagram';
import { DashboardMockup } from '../components/interactive/DashboardMockup';
import { ShieldCheck, Cpu, Database, Sparkles, CheckCircle2, Lock, Server, ArrowRight } from 'lucide-react';

export const OwnerOsPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans space-y-16 pt-24 pb-20">
      <SEO 
        title="SketchItUp Owner OS — Architectural Deep Dive"
        description="Learn how SketchItUp Owner OS connects orders, inventory, factory floor, finance, and people into a real-time command center."
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        
        <Breadcrumbs items={[{ label: 'Owner OS Architecture' }]} />

        {/* HERO */}
        <div className="text-center max-w-4xl mx-auto space-y-6">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold bg-teal-500/10 text-teal-300 border border-teal-500/30">
            <Cpu className="w-3.5 h-3.5 text-teal-400" />
            ENTERPRISE SYSTEM ARCHITECTURE
          </div>

          <h1 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight">
            An Operating System Built for <span className="text-teal-400">Executive Real-Time Control</span>
          </h1>

          <p className="text-base sm:text-lg text-slate-300 leading-relaxed max-w-3xl mx-auto">
            Traditional ERPs are retrospective data archives that store what happened weeks ago. SketchItUp Owner OS is a live operational control system that actively connects orders, shop floor, inventory, and cash flow in real time.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
            <CTAButton to="/book-a-demo" variant="primary" size="lg">
              Book Architecture Demo
            </CTAButton>
            <CTAButton to="/modules" variant="secondary" size="lg">
              View All 14 Modules
            </CTAButton>
          </div>
        </div>

        {/* SECTION: WHAT IS OWNER OS */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center bg-slate-900 border border-slate-800 rounded-2xl p-8">
          <div className="space-y-4">
            <span className="text-xs font-mono font-bold text-teal-400 uppercase tracking-wider">PARADIGM SHIFT</span>
            <h2 className="text-2xl font-extrabold text-white">Why ERPs Fail and Operating Systems Succeed</h2>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              For decades, enterprises were forced into rigid legacy ERPs that required armies of consultants and months of complex customization. Worse, staff hated entering data into clunky interfaces, causing information delay.
            </p>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              <strong>Owner OS replaces data archives with live operational streams.</strong> When a worker logs a completed job on a shop-floor tablet station, inventory updates, quality gates open, customer order status updates, and financial cash flow ledgers calculate instantly.
            </p>
          </div>

          <div className="space-y-3 bg-slate-950 p-6 rounded-xl border border-slate-800 text-xs">
            <h3 className="font-bold text-white text-sm uppercase tracking-wider text-teal-400 mb-2">Core OS Architecture Pillars:</h3>
            <div className="flex items-start gap-2.5 text-slate-300">
              <CheckCircle2 className="w-4 h-4 text-teal-400 shrink-0 mt-0.5" />
              <span><strong>Event-Driven Micro-Bus:</strong> Sub-second synchronization across all 14 enterprise modules.</span>
            </div>
            <div className="flex items-start gap-2.5 text-slate-300">
              <CheckCircle2 className="w-4 h-4 text-teal-400 shrink-0 mt-0.5" />
              <span><strong>Role-Based Access Control:</strong> Strict permission boundaries between workers, managers, and owners.</span>
            </div>
            <div className="flex items-start gap-2.5 text-slate-300">
              <CheckCircle2 className="w-4 h-4 text-teal-400 shrink-0 mt-0.5" />
              <span><strong>Tenant Data Isolation:</strong> Enterprise database environment encrypted with AES-256.</span>
            </div>
            <div className="flex items-start gap-2.5 text-slate-300">
              <CheckCircle2 className="w-4 h-4 text-teal-400 shrink-0 mt-0.5" />
              <span><strong>Tally & Banking Hooks:</strong> Seamless integration with legacy accounting systems.</span>
            </div>
          </div>
        </div>

        {/* SECTION: 4-LAYER DIAGRAM */}
        <ArchitectureDiagram />

        {/* SECTION: COMMAND CENTER DEEP DIVE */}
        <div className="space-y-6">
          <div className="text-center max-w-3xl mx-auto space-y-2">
            <span className="text-xs font-mono font-bold text-teal-400 uppercase tracking-wider">EXECUTIVE INTERFACE</span>
            <h2 className="text-2xl sm:text-4xl font-extrabold text-white">The Executive Command Center</h2>
            <p className="text-sm text-slate-400">
              Designed for desktop, tablet, and mobile — giving business owners complete clarity from anywhere in the world.
            </p>
          </div>

          <DashboardMockup />
        </div>

        {/* SECTION: SECURITY & COMPLIANCE */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="space-y-2">
            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-teal-400 inline-block">
              <Lock className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-white">AES-256 Encryption</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              All financial, order, and employee data encrypted at rest and in transit using bank-grade TLS 1.3 standards.
            </p>
          </div>

          <div className="space-y-2">
            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-sky-400 inline-block">
              <Server className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-white">Isolated Tenant Architecture</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Your business data is logically and physically isolated. Your records are never co-mingled or used for AI training.
            </p>
          </div>

          <div className="space-y-2">
            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-amber-400 inline-block">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-white">Continuous Audit Trail</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Every price override, PO approval, and stock adjustment is logged with immutable timestamping and user ID credentials.
            </p>
          </div>
        </div>

        {/* CTA */}
        <div className="text-center pt-8 border-t border-slate-800">
          <CTAButton to="/book-a-demo" variant="primary" size="lg">
            Schedule Architecture Walkthrough &rarr;
          </CTAButton>
        </div>

      </div>
    </div>
  );
};
