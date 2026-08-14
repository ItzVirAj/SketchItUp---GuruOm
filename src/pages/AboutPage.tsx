import React from 'react';
import { SEO } from '../components/common/SEO';
import { Breadcrumbs } from '../components/common/Breadcrumbs';
import { CTAButton } from '../components/common/CTAButton';
import { companyData } from '../data/companyData';
import { Building2, Users, Target, ShieldCheck, Heart, Sparkles, CheckCircle2 } from 'lucide-react';

export const AboutPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans space-y-16 pt-24 pb-20">
      <SEO 
        title="About Us & Story — SketchItUp Solutions"
        description="Learn about the team, vision, and core product philosophy behind SketchItUp Owner OS."
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        
        <Breadcrumbs items={[{ label: 'About & Story' }]} />

        {/* HERO */}
        <div className="text-center max-w-4xl mx-auto space-y-6">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold bg-teal-500/10 text-teal-300 border border-teal-500/30">
            <Building2 className="w-3.5 h-3.5 text-teal-400" />
            THE SKETCHITUP STORY
          </div>

          <h1 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight">
            Restoring Control & Clarity to <span className="text-teal-400">Enterprise Leaders</span>
          </h1>

          <p className="text-base sm:text-lg text-slate-300 leading-relaxed max-w-3xl mx-auto">
            {companyData.vision}
          </p>
        </div>

        {/* FOUNDER PERSPECTIVE */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 sm:p-12 space-y-6 shadow-2xl">
          <span className="text-xs font-mono font-bold text-teal-400 uppercase tracking-wider bg-teal-500/10 px-3 py-1 rounded border border-teal-500/30">
            FOUNDER PERSPECTIVE
          </span>

          <h2 className="text-2xl sm:text-3xl font-extrabold text-white">
            "{companyData.founderPerspective.headline}"
          </h2>

          <blockquote className="text-sm sm:text-base text-slate-300 leading-relaxed italic border-l-2 border-teal-500 pl-4 py-1">
            "{companyData.founderPerspective.quote}"
          </blockquote>

          <div className="text-xs text-teal-400 font-bold uppercase tracking-wider">
            &mdash; {companyData.founderPerspective.author}
          </div>
        </div>

        {/* MISSION & VISION */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="p-8 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-teal-400 inline-block">
              <Target className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-white">Our Vision</h3>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">{companyData.vision}</p>
          </div>

          <div className="p-8 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-sky-400 inline-block">
              <Sparkles className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-white">Our Mission</h3>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">{companyData.mission}</p>
          </div>
        </div>

        {/* CORE PRODUCT PHILOSOPHY */}
        <div className="space-y-6">
          <h2 className="text-2xl font-extrabold text-white text-center">Core Operating Principles</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {companyData.principles.map((p, idx) => (
              <div key={idx} className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-2">
                <span className="text-xs font-mono text-teal-400 font-bold">0{idx + 1}.</span>
                <h3 className="text-base font-bold text-white">{p.title}</h3>
                <p className="text-xs text-slate-400 leading-relaxed">{p.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* TEAM OVERVIEW */}
        <div className="space-y-6">
          <h2 className="text-2xl font-extrabold text-white text-center">Cross-Functional Expertise</h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {companyData.teamMembers.map((member, idx) => (
              <div key={idx} className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-3 text-center">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-sky-500 to-teal-500 text-slate-950 font-extrabold text-xl flex items-center justify-center mx-auto shadow-lg shadow-sky-500/20">
                  {member.avatarInitials}
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">{member.name}</h3>
                  <span className="text-xs text-teal-400 font-semibold">{member.role}</span>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">{member.bio}</p>
              </div>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div className="text-center pt-6">
          <CTAButton to="/book-a-demo" variant="primary" size="lg">
            Connect With Our Leadership Team &rarr;
          </CTAButton>
        </div>

      </div>
    </div>
  );
};
