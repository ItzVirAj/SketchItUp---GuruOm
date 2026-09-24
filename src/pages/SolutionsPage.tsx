import React from 'react';
import { SEO } from '../components/common/SEO';
import { Breadcrumbs } from '../components/common/Breadcrumbs';
import { IndustryCard } from '../components/interactive/IndustryCard';
import { industriesData } from '../data/industriesData';
import { Factory, Sparkles } from 'lucide-react';

export const SolutionsPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans space-y-12 pt-24 pb-20">
      <SEO 
        title="Industry Solutions — SketchItUp Owner OS"
        description="Tailored business operating systems for Discrete & Process Manufacturing, Industrial SMEs, Family Businesses, and Growing Companies."
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        
        <Breadcrumbs items={[{ label: 'Solutions & Verticals' }]} />

        {/* Page Header */}
        <div className="text-center max-w-3xl mx-auto space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-teal-500/10 text-teal-300 border border-teal-500/30">
            <Factory className="w-3.5 h-3.5 text-teal-400" />
            INDUSTRY SOLUTIONS
          </div>

          <h1 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight">
            Tailored Industry <span className="text-teal-400">Operating Systems</span>
          </h1>

          <p className="text-sm sm:text-base text-slate-300 leading-relaxed">
            Every vertical has unique operational bottlenecks. Discover how SketchItUp Owner OS adapts to your sector's specific workflows, regulatory requirements, and shop floor dynamics.
          </p>
        </div>

        {/* Grid of Industry Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {industriesData.map((ind) => (
            <IndustryCard key={ind.slug} industry={ind} />
          ))}
        </div>

      </div>
    </div>
  );
};
