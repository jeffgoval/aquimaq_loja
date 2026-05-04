import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@shared/lib/cn';

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 disabled:pointer-events-none disabled:opacity-50 [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground hover:bg-primary-hover shadow-sm',
        destructive: 'bg-danger text-danger-foreground hover:bg-danger/90 shadow-sm',
        outline: 'border border-border bg-surface text-foreground hover:bg-surface-muted shadow-sm',
        secondary: 'bg-surface-muted text-foreground hover:bg-surface-muted/70 border border-border',
        ghost: 'hover:bg-surface-muted text-muted-foreground hover:text-foreground',
        link: 'text-primary underline-offset-4 hover:underline',
      },
      size: {
        default: 'h-8 px-3.5 py-1.5 text-[13px] [&_svg]:size-[14px]',
        sm: 'h-7 rounded px-3 text-xs [&_svg]:size-3',
        lg: 'h-9 rounded px-5 text-[13px] [&_svg]:size-4',
        icon: 'h-8 w-8 [&_svg]:size-4',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  },
);
Button.displayName = 'Button';

export { buttonVariants };
