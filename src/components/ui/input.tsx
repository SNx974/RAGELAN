import * as React from 'react';
import { cn } from '@/lib/utils';

const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, type, ...props }, ref) => (
    <input
      type={type}
      ref={ref}
      className={cn(
        'flex h-11 w-full rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2 text-sm text-foreground',
        'placeholder:text-muted-foreground/70',
        'transition-all duration-200',
        'focus-visible:border-rage-orange/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rage-orange/25',
        'disabled:cursor-not-allowed disabled:opacity-50',
        'file:border-0 file:bg-transparent file:text-sm file:font-medium',
        className,
      )}
      {...props}
    />
  ),
);
Input.displayName = 'Input';

export { Input };
