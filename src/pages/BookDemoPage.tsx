import React from 'react';
import { SEO } from '../components/common/SEO';
import { Breadcrumbs } from '../components/common/Breadcrumbs';
import { DemoForm } from '../components/interactive/DemoForm';

export const BookDemoPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans space-y-12 pt-24 pb-20">
      <SEO 
        title="Book a Demo — SketchItUp Owner OS"
        description="Schedule a 30-minute tailored demonstration of SketchItUp Owner OS with an Operational Architect."
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        <Breadcrumbs items={[{ label: 'Book a Demo' }]} />

        <div className="text-center max-w-3xl mx-auto space-y-4">
          <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
            Schedule Your Tailored <span className="text-teal-400">Owner OS</span> Walkthrough
          </h1>
          <p className="text-sm sm:text-base text-slate-300">
            See how our AI-enabled Business Operating System connects your orders, inventory, factory floor, and finances in one unified dashboard.
          </p>
        </div>

        <div className="pt-4">
          <DemoForm />
        </div>
      </div>
    </div>
  );
};
