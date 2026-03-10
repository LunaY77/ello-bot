/**
 * Button Component
 *
 * Description:
 * A universal button component supporting multiple visual variants, sizes, and states.
 *
 * Core Features:
 * - Uses class-variance-authority (cva) for style variant management
 * - Supports asChild mode to apply button styles to any child element
 * - Supports loading state with automatic loading spinner display
 * - Supports icon slot for adding icons before the button text
 * - Uses React.forwardRef for ref forwarding
 *
 * @example
 * // Basic usage
 * <Button>Click Me</Button>
 *
 * // Different variants
 * <Button variant="destructive">Delete</Button>
 * <Button variant="outline">Cancel</Button>
 *
 * // Loading state
 * <Button isLoading>Submitting...</Button>
 */

import { Slot, Slottable } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import * as React from 'react';

import { Spinner } from '../spinner';

import { cn } from '@/utils/cn';

/**
 * Button Style Variants Configuration
 *
 * Defines button style variants using class-variance-authority (cva)
 * Returns corresponding className based on different variant and size parameters
 */
const buttonVariants = cva(
  // Base styles: shared by all buttons
  'inline-flex items-center justify-center whitespace-nowrap rounded-xl text-sm font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      // variant: visual style variants for the button
      variant: {
        // default: primary action button, uses theme color
        default:
          'bg-primary text-primary-foreground shadow-[0_18px_40px_-22px_hsl(var(--primary)/0.9)] hover:-translate-y-0.5 hover:bg-primary/92',
        // destructive: dangerous action button (e.g., delete), uses red color scheme
        destructive:
          'bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90',
        // outline: outline button, bordered secondary action
        outline:
          'border border-input bg-background/80 shadow-sm hover:border-stone-400 hover:bg-accent hover:text-accent-foreground',
        // secondary: secondary action button, uses gray color scheme
        secondary:
          'bg-secondary text-secondary-foreground shadow-sm hover:bg-secondary/85',
        // ghost: ghost button, no background, shows background on hover
        ghost: 'hover:bg-accent/80 hover:text-accent-foreground',
        // link: link style, text with underline
        link: 'text-primary underline-offset-4 hover:underline',
      },
      // size: size variants for the button
      size: {
        default: 'h-10 px-4 py-2',
        sm: 'h-9 rounded-lg px-3 text-xs',
        lg: 'h-11 rounded-xl px-8',
        icon: 'size-10',
      },
    },
    // Default variant to use
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
);

/**
 * Button Component Props Type Definition
 */
export type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof buttonVariants> & {
    /**
     * asChild mode
     * When true, button styles and behavior are applied to the first child element
     */
    asChild?: boolean;
    /**
     * Loading state
     * When true, displays loading spinner
     */
    isLoading?: boolean;
    /**
     * Icon
     * Icon displayed before button text
     */
    icon?: React.ReactNode;
  };

/**
 * Button Component Implementation
 *
 * Creates a button component with ref forwarding using React.forwardRef
 */
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
    const content = asChild ? (
      <Slottable>{children}</Slottable>
    ) : (
      <span className="mx-1">{children}</span>
    );

    // Determine whether to render <button> or <Slot> based on asChild prop
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
        {/* Loading spinner: only shown when isLoading is true */}
        {isLoading && <Spinner size="sm" className="text-current" />}

        {/* Prefix icon: shown when not loading */}
        {!isLoading && icon && <span className="mr-2 shrink-0">{icon}</span>}

        {/* Button text content */}
        {content}
      </Comp>
    );
  },
);

// Set component display name for debugging
Button.displayName = 'Button';

export { Button, buttonVariants };
