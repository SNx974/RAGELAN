import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wider transition-colors',
  {
    variants: {
      variant: {
        default: 'border-rage-orange/30 bg-rage-orange/10 text-rage-orange',
        red: 'border-rage-red/30 bg-rage-red/10 text-rage-red',
        yellow: 'border-rage-yellow/30 bg-rage-yellow/10 text-rage-yellow',
        success: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400',
        neutral: 'border-white/12 bg-white/[0.04] text-muted-foreground',
        solid: 'border-transparent bg-rage-gradient text-black',
      },
    },
    defaultVariants: { variant: 'default' },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
