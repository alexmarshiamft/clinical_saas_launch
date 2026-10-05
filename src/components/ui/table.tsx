import * as React from 'react';
import { cn } from '@/lib/utils';

export function Table({ className, ...props }: React.HTMLAttributes<HTMLTableElement>) {
  return (
    <div className="relative w-full overflow-x-auto">
      <table className={cn('w-full caption-bottom text-sm', className)} {...props} />
    </div>
  );
}

export function TableHeader({ className, ...props }: React.HTMLAttributes<HTMLTableSectionElement>) {
  return <thead className={cn('border-b border-slate-200 bg-slate-50/75', className)} {...props} />;
}

export function TableBody({ className, ...props }: React.HTMLAttributes<HTMLTableSectionElement>) {
  return <tbody className={cn('divide-y divide-slate-100', className)} {...props} />;
}

export function TableFooter({ className, ...props }: React.HTMLAttributes<HTMLTableSectionElement>) {
  return <tfoot className={cn('border-t border-slate-200 bg-slate-50 font-medium', className)} {...props} />;
}

export function TableRow({ className, ...props }: React.HTMLAttributes<HTMLTableRowElement>) {
  return (
    <tr
      className={cn('transition-colors hover:bg-slate-50/60 data-[state=selected]:bg-slate-100', className)}
      {...props}
    />
  );
}

export function TableHead({ className, ...props }: React.ThHTMLAttributes<HTMLTableCellElement>) {
  return (
    <th
      className={cn(
        'h-10 px-3.5 text-left align-middle text-xs font-bold text-slate-500 uppercase tracking-wider',
        className
      )}
      {...props}
    />
  );
}

export function TableCell({ className, ...props }: React.TdHTMLAttributes<HTMLTableCellElement>) {
  return (
    <td className={cn('p-3.5 align-middle text-xs text-slate-700', className)} {...props} />
  );
}

export function TableCaption({ className, ...props }: React.HTMLAttributes<HTMLTableCaptionElement>) {
  return <caption className={cn('mt-4 text-xs text-slate-500', className)} {...props} />;
}
