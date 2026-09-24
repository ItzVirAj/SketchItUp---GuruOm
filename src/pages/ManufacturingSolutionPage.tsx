import React from 'react';
import { Link } from 'react-router-dom';
import { SEO } from '../components/common/SEO';
import { Breadcrumbs } from '../components/common/Breadcrumbs';
import { CTAButton } from '../components/common/CTAButton';
import { StatusBadge } from '../components/common/StatusBadge';
import { Factory, CheckCircle2, AlertTriangle, ArrowRight, ShieldCheck, Cpu, Wrench, Package, Layers } from 'lucide-react';
import { modulesData } from '../data/modulesData';

export const ManufacturingSolutionPage: React.FC = () => {
  const manufacturingModules = modulesData.filter((m) => 
    ['production-management', 'inventory-management', 'quality-management', 'machine-maintenance', 'procurement'].includes(m.slug)
  );

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans space-y-16 pt-24 pb-20">
      <SEO 
        title="Manufacturing Solution — SketchItUp Owner OS"
        description="Purpose-built operating system for Discrete & Process Manufacturing plants. Work orders, OEE, machine maintenance, BOM, and scrap tracking."
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        
        <Breadcrumbs 
          items={[
            { label: 'Solutions', path: '/solutions' },
            { label: 'Manufacturing Solution' }
          ]} 
        />

        {/* HERO */}
        <div className="bg-slate-900 border border-teal-500/40 rounded-3xl p-8 sm:p-12 space-y-6 relative overflow-hidden shadow-2xl">
          <div className="flex items-center justify-between border-b border-slate-800 pb-4">
            <span className="text-xs font-mono font-bold text-teal-400 uppercase tracking-wider flex items-center gap-2">
              <Factory className="w-4 h-4" />
              DISCRETE & PROCESS MANUFACTURING
            </span>
            <StatusBadge status="LIVE" />
          </div>

          <div className="max-w-3xl space-y-4">
            <h1 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight">
              The Shop Floor Operating System for <span className="text-teal-400">High-Throughput Plants</span>
            </h1>
            <p className="text-base sm:text-lg text-slate-300 leading-relaxed">
              Connect machine sensors, shop-floor tablet kiosks, raw material inventories, and quality inspection gates into one synchronized manufacturing command center.
            </p>
          </div>

          <div className="flex flex-wrap gap-4 pt-2">
            <CTAButton to="/book-a-demo" variant="primary" size="lg">
              Book Manufacturing Demo
            </CTAButton>
            <CTAButton to="/modules/production-management" variant="secondary" size="lg">
              Explore Production Module
            </CTAButton>
          </div>
        </div>

        {/* SECTION: PAIN POINTS SOLVED */}
        <div className="space-y-6">
          <h2 className="text-2xl font-extrabold text-white">4 Plant Bottlenecks Eliminated</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-2">
              <h3 className="text-base font-bold text-rose-400 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" /> 1. Unplanned Machine Downtime
              </h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                <strong>Without Owner OS:</strong> Machines break down unexpectedly without warning, halting lines and causing $10,000+ per hour in lost throughput.<br />
                <strong>With Owner OS:</strong> Preventive maintenance calendars and vibration anomaly alerts prevent breakdowns before they occur.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-2">
              <h3 className="text-base font-bold text-rose-400 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" /> 2. Untracked Scrap & Yield Loss
              </h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                <strong>Without Owner OS:</strong> Raw material scrap is swept under the rug or logged on paper notes at shift end.<br />
                <strong>With Owner OS:</strong> Real-time BOM vs actual material consumption logging pinpoints exact yield loss causes.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-2">
              <h3 className="text-base font-bold text-rose-400 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" /> 3. Raw Material Stockouts
              </h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                <strong>Without Owner OS:</strong> Workers discover missing raw materials after setting up machines, stalling production runs.<br />
                <strong>With Owner OS:</strong> Automated reorder triggers reserve materials immediately upon order confirmation.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-2">
              <h3 className="text-base font-bold text-rose-400 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" /> 4. Quality Rejections
              </h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                <strong>Without Owner OS:</strong> Paper QC sheets get misplaced or filled out retroactively without physical measurement verification.<br />
                <strong>With Owner OS:</strong> Digitized tablet inspection gates block non-conforming batches prior to dispatch.
              </p>
            </div>
          </div>
        </div>

        {/* SECTION: INTEGRATED MANUFACTURING MODULES */}
        <div className="space-y-6">
          <h2 className="text-2xl font-extrabold text-white">Core Manufacturing Modules</h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {manufacturingModules.map((mod) => (
              <div key={mod.slug} className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-teal-400 inline-block">
                  <Layers className="w-5 h-5" />
                </div>
                <h3 className="text-base font-bold text-white">{mod.title}</h3>
                <p className="text-xs text-slate-400 leading-relaxed">{mod.shortDesc}</p>
                <Link to={`/modules/${mod.slug}`} className="text-xs font-bold text-teal-400 hover:underline flex items-center gap-1 pt-2">
                  <span>Explore Module</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            ))}
          </div>
        </div>

        {/* CASE STUDY HIGHLIGHT */}
        <div className="bg-slate-950 border border-slate-800 rounded-3xl p-8 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          <div className="lg:col-span-8 space-y-3">
            <span className="text-xs font-mono font-bold text-emerald-400 uppercase tracking-wider bg-emerald-500/10 px-3 py-1 rounded border border-emerald-500/30">
              CLIENT SUCCESS CASE STUDY
            </span>
            <h3 className="text-xl sm:text-2xl font-extrabold text-white">
              Apex Precision Engineering: 34% OEE Gain in 60 Days
            </h3>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              By replacing paper job cards with Owner OS shop-floor tablet kiosks, Apex eliminated line bottlenecks and reduced unplanned downtime from 6.8% to 1.2% in just two months.
            </p>
          </div>

          <div className="lg:col-span-4 bg-slate-900 p-6 rounded-2xl border border-slate-800 text-center space-y-2">
            <div className="text-3xl font-extrabold text-teal-400">+34% OEE</div>
            <p className="text-xs text-slate-400">Measured across 18 CNC machining centers</p>
          </div>
        </div>

        {/* CTA */}
        <div className="text-center pt-6">
          <CTAButton to="/book-a-demo" variant="primary" size="lg">
            Schedule Manufacturing Plant Demo &rarr;
          </CTAButton>
        </div>

      </div>
    </div>
  );
};
