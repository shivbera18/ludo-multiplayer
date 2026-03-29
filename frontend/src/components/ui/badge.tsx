import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../lib/utils';

const badgeVariants = cva('inline-flex items-center rounded-none border-2 border-black px-2.5 py-0.5 text-xs font-bold shadow-[2px_2px_0_0_#000000]', {
  variants: {
    variant: {
      default: 'bg-black text-white',
      secondary: 'bg-yellow-300 text-black',
      outline: 'bg-white text-black',
      success: 'bg-emerald-400 text-black',
      warning: 'bg-orange-400 text-black'
    }
  },
  defaultVariants: {
    variant: 'default'
  }
});

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
