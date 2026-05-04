import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@shared/lib/cn';

const badgeVariants = cva(
  'inline-flex items-center rounded border px-2 py-0.5 text-[11px] font-medium leading-none tracking-wide transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
  {
    variants: {
      variant: {
        default: 'border-transparent bg-primary-soft text-primary',
        secondary: 'border-transparent bg-surface-muted text-muted-foreground',
        success: 'border-transparent bg-success-soft text-success',
        warning: 'border-transparent bg-warning-soft text-warning',
        danger: 'border-transparent bg-danger-soft text-danger',
        info: 'border-transparent bg-info-soft text-info',
        outline: 'border-border text-foreground bg-transparent',
      },
    },
    defaultVariants: { variant: 'default' },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { badgeVariants };
