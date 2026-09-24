import React from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight, Home } from 'lucide-react';

interface BreadcrumbItem {
  label: string;
  path?: string;
}

interface BreadcrumbsProps {
  items: BreadcrumbItem[];
}

export const Breadcrumbs: React.FC<BreadcrumbsProps> = ({ items }) => {
  return (
    <nav className="flex items-center text-xs text-slate-400 py-3 mb-4 overflow-x-auto whitespace-nowrap scrollbar-none">
      <Link to="/" className="inline-flex items-center gap-1 hover:text-teal-400 transition-colors">
        <Home className="w-3.5 h-3.5 text-slate-500" />
        <span>Home</span>
      </Link>
      
      {items.map((item, index) => (
        <React.Fragment key={index}>
          <ChevronRight className="w-3.5 h-3.5 mx-1.5 text-slate-600 shrink-0" />
          {item.path && index < items.length - 1 ? (
            <Link to={item.path} className="hover:text-teal-400 transition-colors">
              {item.label}
            </Link>
          ) : (
            <span className="text-slate-200 font-medium">{item.label}</span>
          )}
        </React.Fragment>
      ))}
    </nav>
  );
};
