import React from 'react';
import { useParams, Link, Navigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { SEO } from '../components/common/SEO';
import { Breadcrumbs } from '../components/common/Breadcrumbs';
import { CTAButton } from '../components/common/CTAButton';
import { modulesData } from '../data/modulesData';
import { 
  CheckCircle2, 
  AlertTriangle, 
  Sparkles, 
  Cpu, 
  Layers, 
  ShieldCheck, 
  ArrowRight, 
  TrendingUp, 
  Activity, 
  Database
} from 'lucide-react';

export const ModuleDetailPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();

  const module = modulesData.find((m) => m.slug === slug);

  if (!module) {
    return <Navigate to="/modules" replace />;
  }

  const relatedModules = modulesData.filter((m) => module.relatedModuleSlugs.includes(m.slug));

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans space-y-16 pt-24 pb-20">
      <SEO 
        title={`${module.title} Module — SketchItUp Owner OS`}
        description={module.shortDesc}
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        
        <Breadcrumbs 
          items={[
            { label: 'Modules Catalog', path: '/modules' },
            { label: module.title }
          ]} 
        />

        {/* HERO */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 sm:p-12 space-y-6 relative overflow-hidden shadow-2xl">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-4">
            <span className="text-xs font-mono font-bold text-teal-400 uppercase tracking-wider bg-teal-500/10 px-3 py-1 rounded border border-teal-500/30">
              {module.category}
            </span>
            <span className="text-xs text-slate-400 flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-teal-400" /> AI-Enabled Engine
            </span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            <div className="lg:col-span-8 space-y-4">
              <h1 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight">
                {module.title}
              </h1>
              <p className="text-base sm:text-lg text-slate-300 leading-relaxed">
                {module.fullDesc}
              </p>
            </div>

            <div className="lg:col-span-4 bg-slate-950 p-6 rounded-2xl border border-slate-800 space-y-3">
              <h3 className="text-xs font-bold text-rose-400 uppercase tracking-wider flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4" /> Solves Business Problem:
              </h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                {module.problem}
              </p>
            </div>
          </div>

          <div className="pt-4 flex flex-wrap gap-4">
            <CTAButton to="/book-a-demo" variant="primary" size="lg">
              Book Demo for {module.title}
            </CTAButton>
            <CTAButton to="/modules" variant="secondary" size="lg">
              View Other Modules
            </CTAButton>
          </div>
        </div>

        {/* SECTION: MEASURABLE KPIS & BENEFITS */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {module.kpis.map((kpi, idx) => (
            <div key={idx} className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-1">
              <span className="text-xs font-semibold text-slate-400">{kpi.label}</span>
              <div className="text-3xl font-extrabold text-teal-400">{kpi.value}</div>
              <div className="text-xs text-slate-300 font-medium pt-1 flex items-center gap-1">
                <TrendingUp className="w-3.5 h-3.5 text-emerald-400" /> {kpi.detail}
              </div>
            </div>
          ))}
        </div>

        {/* SECTION: KEY CAPABILITIES */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 space-y-6">
          <h2 className="text-xl sm:text-2xl font-extrabold text-white flex items-center gap-2">
            <CheckCircle2 className="w-6 h-6 text-teal-400" />
            <span>Key Enterprise Capabilities</span>
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {module.keyCapabilities.map((cap, idx) => (
              <div key={idx} className="p-4 rounded-xl bg-slate-950 border border-slate-800/80 flex items-start gap-3">
                <div className="p-1 rounded bg-teal-500/10 text-teal-400 shrink-0 mt-0.5">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
                <span className="text-xs sm:text-sm text-slate-200 font-medium">{cap}</span>
              </div>
            ))}
          </div>
        </div>

        {/* SECTION: WORKFLOW PIPELINE */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 space-y-6">
          <h2 className="text-xl sm:text-2xl font-extrabold text-white">Step-by-Step Module Workflow</h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            {module.workflowSteps.map((step) => (
              <div key={step.step} className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                <span className="text-xs font-mono font-bold text-teal-400 bg-teal-500/10 px-2 py-0.5 rounded border border-teal-500/30">
                  Step 0{step.step}
                </span>
                <h4 className="text-xs font-bold text-white mt-1">{step.title}</h4>
                <p className="text-[11px] text-slate-400 leading-relaxed">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* SECTION: TECHNICAL OVERVIEW */}
        <div className="bg-slate-950 border border-slate-800 rounded-2xl p-8 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="space-y-2">
            <h3 className="text-xs font-bold text-teal-400 uppercase tracking-wider flex items-center gap-1.5">
              <Activity className="w-4 h-4" /> Real-time Data Triggers:
            </h3>
            <ul className="space-y-1 text-xs text-slate-300">
              {module.technicalOverview.dataTriggers.map((t, i) => (
                <li key={i} className="flex items-center gap-1.5">
                  <span className="text-teal-400">•</span> {t}
                </li>
              ))}
            </ul>
          </div>

          <div className="space-y-2">
            <h3 className="text-xs font-bold text-sky-400 uppercase tracking-wider flex items-center gap-1.5">
              <Database className="w-4 h-4" /> System Integrations:
            </h3>
            <ul className="space-y-1 text-xs text-slate-300">
              {module.technicalOverview.integrations.map((t, i) => (
                <li key={i} className="flex items-center gap-1.5">
                  <span className="text-sky-400">•</span> {t}
                </li>
              ))}
            </ul>
          </div>

          <div className="space-y-2">
            <h3 className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4" /> Security & Access Control:
            </h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              {module.technicalOverview.security}
            </p>
          </div>
        </div>

        {/* SECTION: TODAY VS AI ROADMAP */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="p-6 rounded-2xl bg-slate-900 border border-teal-500/40 space-y-3">
            <h3 className="text-sm font-bold text-teal-400 uppercase tracking-wider">AVAILABLE TODAY</h3>
            <ul className="space-y-2 text-xs text-slate-200">
              {module.availableToday.map((item, idx) => (
                <li key={idx} className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-teal-400 shrink-0" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="p-6 rounded-2xl bg-slate-900 border border-amber-500/40 space-y-3">
            <h3 className="text-sm font-bold text-amber-400 uppercase tracking-wider">AI ROADMAP 2026</h3>
            <ul className="space-y-2 text-xs text-slate-200">
              {module.aiRoadmap.map((item, idx) => (
                <li key={idx} className="flex items-center gap-2">
                  <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* SECTION: RELATED MODULES */}
        {relatedModules.length > 0 && (
          <div className="space-y-4 pt-6">
            <h3 className="text-lg font-bold text-white">Related Interconnected Modules</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {relatedModules.map((rel) => (
                <Link
                  key={rel.slug}
                  to={`/modules/${rel.slug}`}
                  className="p-4 rounded-xl bg-slate-900 border border-slate-800 hover:border-teal-500/50 transition-colors space-y-2 group"
                >
                  <h4 className="text-sm font-bold text-white group-hover:text-teal-400 flex items-center justify-between">
                    <span>{rel.title}</span>
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </h4>
                  <p className="text-xs text-slate-400 line-clamp-2">{rel.shortDesc}</p>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* FINAL DEMO CTA */}
        <div className="bg-slate-900 border border-teal-500/40 rounded-3xl p-8 sm:p-12 text-center space-y-6">
          <h2 className="text-2xl sm:text-4xl font-extrabold text-white">
            Ready to See {module.title} in Action?
          </h2>
          <p className="text-sm text-slate-300 max-w-xl mx-auto">
            Book a 30-minute tailored demo to see how this module integrates into your current workflow.
          </p>
          <CTAButton to="/book-a-demo" variant="primary" size="lg">
            Schedule Personalized Demo
          </CTAButton>
        </div>

      </div>
    </div>
  );
};
