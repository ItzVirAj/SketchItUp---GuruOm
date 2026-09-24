import * as React from 'react';

const Table = React.forwardRef<
  HTMLTableElement,
  React.HTMLAttributes<HTMLTableElement>
>(({ className = '', ...props }, ref) => (
  <div className="relative w-full overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800/80 bg-white dark:bg-slate-900/60 shadow-xs">
    <table
      ref={ref}
      className={`w-full caption-bottom text-sm border-collapse ${className}`}
      {...props}
    />
  </div>
));
Table.displayName = 'Table';

const TableHeader = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className = '', ...props }, ref) => (
  <thead
    ref={ref}
    className={`bg-slate-50/90 dark:bg-slate-950/80 border-b border-slate-200 dark:border-slate-800 text-xs font-mono font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 ${className}`}
    {...props}
  />
));
TableHeader.displayName = 'TableHeader';

const TableBody = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className = '', ...props }, ref) => (
  <tbody
    ref={ref}
    className={`divide-y divide-slate-100 dark:divide-slate-800/60 ${className}`}
    {...props}
  />
));
TableBody.displayName = 'TableBody';

const TableFooter = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className = '', ...props }, ref) => (
  <tfoot
    ref={ref}
    className={`border-t-2 border-slate-200 dark:border-slate-800 bg-slate-50/90 dark:bg-slate-950/90 font-bold text-slate-900 dark:text-slate-100 ${className}`}
    {...props}
  />
));
TableFooter.displayName = 'TableFooter';

const TableRow = React.forwardRef<
  HTMLTableRowElement,
  React.HTMLAttributes<HTMLTableRowElement>
>(({ className = '', ...props }, ref) => (
  <tr
    ref={ref}
    className={`transition-colors hover:bg-slate-50/80 dark:hover:bg-slate-800/50 ${className}`}
    {...props}
  />
));
TableRow.displayName = 'TableRow';

const TableHead = React.forwardRef<
  HTMLTableCellElement,
  React.ThHTMLAttributes<HTMLTableCellElement>
>(({ className = '', ...props }, ref) => (
  <th
    ref={ref}
    className={`h-11 px-4 py-3 text-left align-middle font-bold text-slate-700 dark:text-slate-300 ${className}`}
    {...props}
  />
));
TableHead.displayName = 'TableHead';

const TableCell = React.forwardRef<
  HTMLTableCellElement,
  React.TdHTMLAttributes<HTMLTableCellElement>
>(({ className = '', ...props }, ref) => (
  <td
    ref={ref}
    className={`px-4 py-3 align-middle text-slate-700 dark:text-slate-200 ${className}`}
    {...props}
  />
));
TableCell.displayName = 'TableCell';

export {
  Table,
  TableHeader,
  TableBody,
  TableFooter,
  TableHead,
  TableRow,
  TableCell,
};
