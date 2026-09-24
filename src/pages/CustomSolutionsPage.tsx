import React from 'react';
import { SEO } from '../components/common/SEO';
import { Breadcrumbs } from '../components/common/Breadcrumbs';
import { CTAButton } from '../components/common/CTAButton';
import { Settings2, CheckCircle2, ArrowRight, Cpu, Code, ShieldCheck, Sparkles } from 'lucide-react';

export const CustomSolutionsPage: React.FC = () => {
  const steps = [
    {
      num: 1,
      title: 'Discovery & Workflow Audit',
      desc: 'Our Industrial Architects conduct a deep-dive audit of your current physical shop-floor routing, paperwork, and inventory movements.'
    },
    {
      num: 2,
      title: 'Process Mapping & Blueprinting',
      desc: 'We map your exact competitive business rules — custom BOM formulas, multi-tier approval gates, and pricing guardrails — into a digital blueprint.'
    },
    {
      num: 3,
      title: 'System Architecture & Data Schema',
      desc: 'Designing dedicated database schemas and micro-event buses tailored specifically for high-frequency shop floor transactions.'
    },
    {
      num: 4,
      title: 'UI/UX Design & Kiosk Workflows',
      desc: 'Crafting touch-optimized tablet interfaces for factory workers that require zero technical skills or lengthy training curves.'
    },
    {
      num: 5,
      title: 'Custom Engine Development',
      desc: 'Engineering tailored modules — specialized quality algorithms, unique piece-rate incentive calculators, or custom scrap yield logic.'
    },
    {
      num: 6,
      title: 'API & Hardware Integration',
      desc: 'Connecting IoT vibration sensors, weigh-scale RS232 interfaces, biometric terminals, and Tally accounting sync.'
    },
    {
      num: 7,
      title: 'Factory Onboarding & Go-Live',
      desc: 'On-site or remote deployment support ensuring a smooth transition with zero disruption to active customer orders.'
    },
    {
      num: 8,
      title: 'Dedicated SLA Support',
      desc: 'Continuous monitoring, sub-second latency maintenance, and ongoing feature enhancements as your enterprise expands.'
    }
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans space-y-16 pt-24 pb-20">
      <SEO 
        title="Custom OS Development Methodology — SketchItUp Solutions"
        description="Don't fit your business into software. Build software around your business with SketchItUp Custom Operating Systems."
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        
        <Breadcrumbs items={[{ label: 'Custom OS Methodology' }]} />

        {/* HERO */}
        <div className="text-center max-w-4xl mx-auto space-y-6">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-300 border border-amber-500/30">
            <Settings2 className="w-3.5 h-3.5 text-amber-400" />
            CUSTOM OPERATING SYSTEM METHODOLOGY
          </div>

          <h1 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight leading-tight">
            "Don’t fit your business into software. <span className="text-amber-400">Build software around your business."</span>
          </h1>

          <p className="text-base sm:text-lg text-slate-300 leading-relaxed max-w-3xl mx-auto">
            Your unique manufacturing process, custom quality standards, and proprietary pricing logic are your competitive advantage. We build tailored Owner OS modules that preserve what makes your enterprise unique.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
            <CTAButton to="/book-a-demo" variant="accent" size="lg">
              Request Custom OS Blueprinting
            </CTAButton>
          </div>
        </div>

        {/* METHODOLOGY STEPS GRID */}
        <div className="space-y-6">
          <div className="text-center max-w-2xl mx-auto space-y-2">
            <span className="text-xs font-mono font-bold text-amber-400 uppercase tracking-wider">METHODOLOGY</span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white">8-Step Custom Development Process</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {steps.map((step) => (
              <div key={step.num} className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-3 relative hover:border-amber-500/40 transition-colors">
                <span className="text-xs font-mono font-bold text-amber-400 bg-amber-500/10 px-2.5 py-1 rounded border border-amber-500/30">
                  Step 0{step.num}
                </span>
                <h3 className="text-base font-bold text-white pt-1">{step.title}</h3>
                <p className="text-xs text-slate-400 leading-relaxed">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* COMPARISON BOX */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-3 p-6 rounded-2xl bg-slate-950 border border-rose-500/30">
            <h3 className="text-base font-bold text-rose-400">Rigid Off-The-Shelf Software</h3>
            <ul className="space-y-2 text-xs text-slate-300">
              <li>• Forces you to abandon efficient proprietary workflows</li>
              <li>• Requires expensive 3rd-party consultants for minor tweaks</li>
              <li>• Cluttered with irrelevant features your staff will never use</li>
            </ul>
          </div>

          <div className="space-y-3 p-6 rounded-2xl bg-slate-950 border border-amber-500/40">
            <h3 className="text-base font-bold text-amber-400">SketchItUp Custom Owner OS</h3>
            <ul className="space-y-2 text-xs text-slate-200 font-medium">
              <li>✓ Digitizes your exact physical shop floor & routing logic</li>
              <li>✓ Modular architecture designed for rapid iteration</li>
              <li>✓ Clean, high-density interfaces tailored to user roles</li>
            </ul>
          </div>
        </div>

        {/* CTA */}
        <div className="text-center pt-6">
          <CTAButton to="/book-a-demo" variant="accent" size="lg">
            Discuss Your Custom Requirements &rarr;
          </CTAButton>
        </div>

      </div>
    </div>
  );
};
