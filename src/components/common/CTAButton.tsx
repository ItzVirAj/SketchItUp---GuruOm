import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { analytics } from '../../lib/analytics';

interface CTAButtonProps {
  to?: string;
  onClick?: () => void;
  variant?: 'primary' | 'secondary' | 'accent' | 'dark';
  size?: 'sm' | 'md' | 'lg';
  children: React.ReactNode;
  icon?: boolean;
  className?: string;
  type?: 'button' | 'submit';
}

export const CTAButton: React.FC<CTAButtonProps> = ({
  to,
  onClick,
  variant = 'primary',
  size = 'md',
  children,
  icon = true,
  className = '',
  type = 'button'
}) => {
  const handleClick = () => {
    if (typeof children === 'string') {
      analytics.trackCtaClick(children, to || 'action');
    }
    if (onClick) onClick();
  };

  const baseStyles = 'btn-tactile inline-flex items-center justify-center font-semibold rounded-lg cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed';

  // Optical alignment (Fix 6): trailing icon side gets 2px less padding than the text side
  const sizeStyles = {
    sm: 'ps-3.5 pe-3 py-1.5 text-xs gap-1.5',
    md: 'ps-5 pe-4.5 py-2.5 text-sm gap-2',
    lg: 'ps-7 pe-6.5 py-3.5 text-base gap-2.5'
  };

  const variantStyles = {
    primary: 'bg-gradient-to-r from-sky-500 to-teal-500 text-slate-950 font-bold border border-sky-400/30',
    secondary: 'bg-slate-900/80 hover:bg-slate-800 text-slate-100 border border-slate-700/80',
    accent: 'bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold border border-amber-400/40',
    dark: 'bg-slate-950 hover:bg-slate-900 text-teal-400 border border-teal-500/40'
  };

  const combinedClasses = `${baseStyles} ${sizeStyles[size]} ${variantStyles[variant]} ${className}`;

  const content = (
    <>
      <span>{children}</span>
      {icon && <ArrowRight className={`${size === 'sm' ? 'w-3.5 h-3.5' : size === 'lg' ? 'w-5 h-5' : 'w-4 h-4'}`} />}
    </>
  );

  if (to) {
    return (
      <div className="inline-block group">
        <Link to={to} onClick={handleClick} className={combinedClasses}>
          {content}
        </Link>
      </div>
    );
  }

  return (
    <button
      type={type}
      onClick={handleClick}
      className={`group ${combinedClasses}`}
    >
      {content}
    </button>
  );
};
