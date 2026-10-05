import * as React from 'react';
import { Button as ButtonPrimitive } from '@base-ui/react/button';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

export const buttonVariants = cva(
  'inline-flex items-center justify-center rounded-lg text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 select-none cursor-pointer',
  {
    variants: {
      variant: {
        default: 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-xs focus-visible:ring-indigo-500',
        primary: 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-xs focus-visible:ring-indigo-500',
        outline: 'border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 focus-visible:ring-slate-400',
        secondary: 'bg-slate-100 text-slate-900 hover:bg-slate-200 focus-visible:ring-slate-400',
        ghost: 'hover:bg-slate-100 text-slate-700 hover:text-slate-900',
        destructive: 'bg-red-600 text-white hover:bg-red-700 shadow-xs focus-visible:ring-red-500',
        emerald: 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-xs focus-visible:ring-emerald-500',
      },
      size: {
        default: 'h-9 px-3.5 py-2',
        xs: 'h-7 px-2 text-xs',
        sm: 'h-8 px-2.5 text-xs',
        lg: 'h-10 px-4 text-base',
        icon: 'h-9 w-9 p-0',
        'icon-sm': 'h-7 w-7 p-0',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(buttonVariants({ variant, size, className }))}
        {...props}
      />
    );
  }
);
Button.displayName = 'Button';

export default Button;
