import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { ArrowRight, Layers, CheckCircle2, Sparkles } from 'lucide-react';
import { ModuleItem } from '../../types';
import { analytics } from '../../lib/analytics';

interface ModuleCardProps {
  module: ModuleItem;
}

export const ModuleCard: React.FC<ModuleCardProps> = ({ module }) => {
  return (
    <motion.div
      whileHover={{ y: -4 }}
      className="bg-slate-900 border border-slate-800 hover:border-teal-500/50 rounded-2xl p-6 transition-all shadow-lg hover:shadow-teal-500/10 flex flex-col justify-between group font-sans"
    >
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-teal-400 group-hover:border-teal-500/40 transition-colors">
            <Layers className="w-6 h-6" />
          </div>
          <span className="text-[10px] font-semibold text-slate-400 bg-slate-950 px-2.5 py-1 rounded-full border border-slate-800 uppercase tracking-wider">
            {module.category}
          </span>
        </div>

        <div>
          <h3 className="text-lg font-bold text-white group-hover:text-teal-400 transition-colors">
            {module.title}
          </h3>
          <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
            {module.shortDesc}
          </p>
        </div>

        <div className="space-y-1.5 pt-2 border-t border-slate-800/80">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Key Capabilities:</span>
          {module.keyCapabilities.slice(0, 3).map((cap, idx) => (
            <div key={idx} className="flex items-start gap-2 text-xs text-slate-300">
              <CheckCircle2 className="w-3.5 h-3.5 text-teal-400 shrink-0 mt-0.5" />
              <span className="line-clamp-1">{cap}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="pt-6 mt-4 border-t border-slate-800/80 flex items-center justify-between">
        <span className="text-[11px] text-teal-400 font-semibold flex items-center gap-1">
          <Sparkles className="w-3.5 h-3.5" /> AI Enabled
        </span>

        <Link
          to={`/modules/${module.slug}`}
          onClick={() => analytics.trackModuleClick(module.slug, 'module_card')}
          className="text-xs font-bold text-white group-hover:text-teal-400 flex items-center gap-1 transition-colors"
        >
          <span>Explore Details</span>
          <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
        </Link>
      </div>
    </motion.div>
  );
};
