/**
 * Button Component
 * V1 Design System Updated
 */
import { Slot, Slottable } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import * as React from 'react';

import { Spinner } from '../spinner';

import { cn } from '@/utils/cn';

const buttonVariants = cva(
  'inline-flex items-center justify-center whitespace-nowrap rounded-sm text-sm font-medium transition-all duration-base ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:pointer-events-none disabled:opacity-50 cursor-pointer',
  {
    variants: {
      variant: {
        default:
          'bg-accent text-accent-foreground hover:bg-accent-hover shadow-1 active:bg-accent-active',
        destructive: 'bg-danger text-white hover:bg-danger/90 shadow-1',
        outline:
          'border border-border-default bg-transparent hover:bg-surface-3 hover:text-primary',
        secondary:
          'bg-surface-3 text-primary hover:bg-surface-3/80 border border-border-subtle shadow-1',
        ghost: 'hover:bg-surface-3 hover:text-primary',
        link: 'text-accent hover:text-accent-hover underline-offset-4 hover:underline',
      },
      size: {
        default: 'h-[40px] px-4 py-2',
        sm: 'h-[32px] rounded-sm px-3 text-xs',
        lg: 'h-[44px] rounded-md px-8',
        icon: 'size-[44px]', // minimal target 44x44
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
);

export type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
    isLoading?: boolean;
    icon?: React.ReactNode;
  };

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant,
      size,
      asChild = false,
      children,
      isLoading,
      icon,
      ...props
    },
    ref,
  ) => {
    const isDisabled = Boolean(isLoading || props.disabled);
    const Comp = asChild ? Slot : 'button';

    return (
      <Comp
        className={cn(
          buttonVariants({ variant, size, className }),
          isDisabled && 'pointer-events-none opacity-50',
        )}
        ref={ref}
        {...props}
        aria-busy={isLoading || undefined}
        aria-disabled={isDisabled || undefined}
        disabled={asChild ? undefined : isDisabled}
      >
        {isLoading && <Spinner size="sm" className="mr-2 text-current" />}
        {!isLoading && icon && <span className="mr-2 shrink-0">{icon}</span>}
        <Slottable>{children}</Slottable>
      </Comp>
    );
  },
);

Button.displayName = 'Button';

export { Button, buttonVariants };
