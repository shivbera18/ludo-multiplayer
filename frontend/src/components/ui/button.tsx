import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 rounded-none border-4 border-black text-sm font-bold text-black shadow-[4px_4px_0_0_#000000] transition active:translate-x-[4px] active:translate-y-[4px] active:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0_0_#000000] focus-visible:outline-none focus-visible:ring-0 disabled:pointer-events-none disabled:opacity-50 disabled:translate-x-[4px] disabled:translate-y-[4px] disabled:shadow-none',
  {
    variants: {
      variant: {
        default: 'bg-emerald-400',
        secondary: 'bg-yellow-300',
        outline: 'bg-white',
        ghost: 'border-transparent shadow-none hover:bg-slate-100 hover:border-black',
        destructive: 'bg-rose-500'
      },
      size: {
        default: 'h-10 px-4 py-2',
        sm: 'h-9 rounded-lg px-3',
        lg: 'h-11 px-6',
        icon: 'h-10 w-10'
      }
    },
    defaultVariants: {
      variant: 'default',
      size: 'default'
    }
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => {
    return <button className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />;
  }
);
Button.displayName = 'Button';

export { Button, buttonVariants };
