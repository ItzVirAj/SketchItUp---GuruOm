import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { Factory, ArrowRight, CheckCircle2, Clock } from 'lucide-react';
import { IndustryItem } from '../../types';
import { StatusBadge } from '../common/StatusBadge';

interface IndustryCardProps {
  industry: IndustryItem;
}

export const IndustryCard: React.FC<IndustryCardProps> = ({ industry }) => {
  const isLive = industry.status === 'LIVE';

  return (
    <motion.div
      whileHover={{ y: -4 }}
      className={`bg-slate-900 border rounded-2xl p-6 transition-all shadow-lg flex flex-col justify-between group font-sans ${
        isLive ? 'border-teal-500/30 hover:border-teal-500/60' : 'border-slate-800'
      }`}
    >
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-teal-400">
            <Factory className="w-6 h-6" />
          </div>
          <StatusBadge status={industry.status} />
        </div>

        <div>
          <h3 className="text-lg font-bold text-white group-hover:text-teal-400 transition-colors">
            {industry.title}
          </h3>
          <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
            {industry.description}
          </p>
        </div>

        <div className="space-y-1.5 pt-2 border-t border-slate-800/80">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Solves Industry Bottlenecks:</span>
          {industry.keyChallenges.slice(0, 2).map((challenge, idx) => (
            <div key={idx} className="flex items-start gap-2 text-xs text-slate-300">
              <span className="text-rose-400 font-bold shrink-0">•</span>
              <span className="line-clamp-2">{challenge}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="pt-6 mt-4 border-t border-slate-800/80 flex items-center justify-between">
        {isLive ? (
          <Link
            to={`/solutions/${industry.slug}`}
            className="text-xs font-bold text-teal-400 hover:text-teal-300 flex items-center gap-1 transition-colors w-full justify-between"
          >
            <span>View Solution Deep Dive</span>
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
          </Link>
        ) : (
          <div className="flex items-center justify-between w-full text-xs text-slate-400">
            <span className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-amber-400" /> {industry.roadmapTimeline || 'Coming Soon'}
            </span>
            <Link to="/book-a-demo" className="text-teal-400 hover:underline text-[11px] font-semibold">
              Join Early Access &rarr;
            </Link>
          </div>
        )}
      </div>
    </motion.div>
  );
};
