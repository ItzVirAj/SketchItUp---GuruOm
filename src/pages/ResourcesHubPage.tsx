import React from 'react';
import { Link } from 'react-router-dom';
import { SEO } from '../components/common/SEO';
import { Breadcrumbs } from '../components/common/Breadcrumbs';
import { BookOpen, FileText, HelpCircle, ArrowRight, Sparkles } from 'lucide-react';
import { blogPostsData, caseStudiesData, faqsData } from '../data/resourcesData';

export const ResourcesHubPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans space-y-16 pt-24 pb-20">
      <SEO 
        title="Resources Hub — SketchItUp Solutions"
        description="Explore insights, case studies, and answers to frequently asked questions about SketchItUp Owner OS."
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        
        <Breadcrumbs items={[{ label: 'Resources' }]} />

        {/* Page Header */}
        <div className="text-center max-w-3xl mx-auto space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-teal-500/10 text-teal-300 border border-teal-500/30">
            <BookOpen className="w-3.5 h-3.5 text-teal-400" />
            RESOURCES & INSIGHTS
          </div>

          <h1 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight">
            Knowledge Hub for <span className="text-teal-400">Enterprise Owners</span>
          </h1>

          <p className="text-sm sm:text-base text-slate-300 leading-relaxed">
            Practical insights on manufacturing efficiency, operational AI, financial control, and transition strategy.
          </p>
        </div>

        {/* 3 Main Resource Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          
          <Link
            to="/resources/faqs"
            className="p-8 rounded-2xl bg-slate-900 border border-slate-800 hover:border-teal-500/50 transition-all space-y-4 group shadow-xl"
          >
            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-teal-400 inline-block">
              <HelpCircle className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold text-white group-hover:text-teal-400 transition-colors">
              Frequently Asked Questions
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Clear answers regarding Owner OS features, Tally integration, security, pricing, and 14-day implementation.
            </p>
            <div className="text-xs font-bold text-teal-400 flex items-center gap-1 pt-2">
              <span>Browse {faqsData.length} FAQs</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>

          <Link
            to="/resources/blog"
            className="p-8 rounded-2xl bg-slate-900 border border-slate-800 hover:border-teal-500/50 transition-all space-y-4 group shadow-xl"
          >
            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-sky-400 inline-block">
              <FileText className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold text-white group-hover:text-teal-400 transition-colors">
              Owner Insights Blog
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              In-depth articles on replacing spreadsheet chaos, factory OEE optimization, and pragmatic AI.
            </p>
            <div className="text-xs font-bold text-teal-400 flex items-center gap-1 pt-2">
              <span>Read Articles</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>

          <Link
            to="/resources/case-studies"
            className="p-8 rounded-2xl bg-slate-900 border border-slate-800 hover:border-teal-500/50 transition-all space-y-4 group shadow-xl"
          >
            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-amber-400 inline-block">
              <Sparkles className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold text-white group-hover:text-teal-400 transition-colors">
              Client Success Case Studies
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Real-world results from discrete and process manufacturers who transformed their shop floor throughput.
            </p>
            <div className="text-xs font-bold text-teal-400 flex items-center gap-1 pt-2">
              <span>View Case Studies</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>

        </div>

      </div>
    </div>
  );
};
