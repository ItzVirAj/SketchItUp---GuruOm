import * as React from 'react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
  size?: 'default' | 'sm' | 'lg' | 'icon';
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className = '', variant = 'default', size = 'default', type = 'button', ...props }, ref) => {
    const baseStyles =
      'inline-flex items-center justify-center font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-slate-400 disabled:pointer-events-none disabled:opacity-50 cursor-pointer select-none';

    const variants: Record<string, string> = {
      default: 'bg-slate-900 text-white shadow hover:bg-slate-800 dark:bg-slate-50 dark:text-slate-900 dark:hover:bg-slate-200',
      destructive: 'bg-red-500 text-white shadow-xs hover:bg-red-600',
      outline: 'border border-slate-200 bg-transparent hover:bg-slate-100 dark:border-slate-800 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200',
      secondary: 'bg-slate-100 text-slate-900 shadow-xs hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700',
      ghost: 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300',
      link: 'text-primary underline-offset-4 hover:underline'
    };

    const sizes: Record<string, string> = {
      default: 'h-9 px-4 py-2 text-sm rounded-md',
      sm: 'h-8 rounded-md px-3 text-xs',
      lg: 'h-10 rounded-md px-8 text-sm',
      icon: 'size-7 rounded-full'
    };

    return (
      <button
        ref={ref}
        type={type}
        className={`${baseStyles} ${variants[variant] || variants.default} ${sizes[size] || sizes.default} ${className}`}
        {...props}
      />
    );
  }
);
Button.displayName = 'Button';
