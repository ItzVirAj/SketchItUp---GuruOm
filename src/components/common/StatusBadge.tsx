import React from 'react';

interface StatusBadgeProps {
  status: 'LIVE' | 'COMING_SOON';
  className?: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, className = '' }) => {
  if (status === 'LIVE') {
    return (
      <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 ${className}`}>
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
        LIVE
      </span>
    );
  }

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/30 ${className}`}>
      <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
      COMING SOON
    </span>
  );
};
