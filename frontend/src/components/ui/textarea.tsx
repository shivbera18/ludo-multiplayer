import * as React from 'react';
import { cn } from '../../lib/utils';

const Textarea = React.forwardRef<HTMLTextAreaElement, React.ComponentProps<'textarea'>>(
  ({ className, ...props }, ref) => {
    return (
      <textarea
        ref={ref}
        className={cn(
          'flex min-h-[90px] w-full rounded-none border-4 border-black bg-white px-3 py-2 text-sm text-black placeholder:text-slate-500 shadow-[4px_4px_0_0_#000000] outline-none transition focus:translate-x-[2px] focus:translate-y-[2px] focus:shadow-[2px_2px_0_0_#000000] focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50',
          className
        )}
        {...props}
      />
    );
  }
);
Textarea.displayName = 'Textarea';

export { Textarea };
