import React, { useState } from 'react';
import { SEO } from '../components/common/SEO';
import { Breadcrumbs } from '../components/common/Breadcrumbs';
import { ModuleCard } from '../components/interactive/ModuleCard';
import { modulesData } from '../data/modulesData';
import { Search, Grid, Layers, Sparkles } from 'lucide-react';

export const ModulesCatalogPage: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');

  const categories = ['All', 'Core Operations', 'Supply Chain', 'Finance & Admin', 'Management & AI'];

  const filteredModules = modulesData.filter((mod) => {
    const matchesCategory = selectedCategory === 'All' || mod.category === selectedCategory;
    const matchesSearch = 
      mod.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      mod.shortDesc.toLowerCase().includes(searchQuery.toLowerCase()) ||
      mod.keyCapabilities.some((c) => c.toLowerCase().includes(searchQuery.toLowerCase()));
    
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans space-y-12 pt-24 pb-20">
      <SEO 
        title="Enterprise Modules Catalog (14 Engines) — SketchItUp Owner OS"
        description="Explore all 14 integrated enterprise modules including Executive Command Center, Production, Inventory, Finance, Quality, and AI Copilot."
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        
        <Breadcrumbs items={[{ label: 'Modules Catalog' }]} />

        {/* Page Header */}
        <div className="text-center max-w-3xl mx-auto space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-teal-500/10 text-teal-300 border border-teal-500/30">
            <Layers className="w-3.5 h-3.5 text-teal-400" />
            14 INTEGRATED MODULE ENGINES
          </div>

          <h1 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight">
            Explore the <span className="text-teal-400">Owner OS Module Catalog</span>
          </h1>

          <p className="text-sm sm:text-base text-slate-300 leading-relaxed">
            Every module operates as an interconnected component of the core operating system. Choose what you need today and activate additional modules seamlessly as you grow.
          </p>
        </div>

        {/* Search & Category Filter Bar */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-6 space-y-4 shadow-xl">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            
            {/* Search Input */}
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
              <input
                type="text"
                placeholder="Search modules, capabilities..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-teal-500"
              />
            </div>

            {/* Category Filter Tabs */}
            <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-2 sm:pb-0 scrollbar-none">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer whitespace-nowrap ${
                    selectedCategory === cat
                      ? 'bg-teal-500 text-slate-950 font-bold shadow-md'
                      : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

          </div>
        </div>

        {/* Modules Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredModules.map((mod) => (
            <ModuleCard key={mod.slug} module={mod} />
          ))}
        </div>

        {filteredModules.length === 0 && (
          <div className="p-12 text-center text-slate-400 bg-slate-900 border border-slate-800 rounded-2xl">
            <p className="text-sm font-semibold">No modules match your search criteria "{searchQuery}".</p>
            <button
              onClick={() => { setSearchQuery(''); setSelectedCategory('All'); }}
              className="text-xs text-teal-400 hover:underline mt-2 font-bold cursor-pointer"
            >
              Reset Search & Filters
            </button>
          </div>
        )}

      </div>
    </div>
  );
};
