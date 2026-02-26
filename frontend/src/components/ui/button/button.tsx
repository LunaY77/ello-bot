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

import { Slot } from '@radix-ui/react-slot';
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
  'inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      // variant: visual style variants for the button
      variant: {
        // default: primary action button, uses theme color
        default:
          'bg-primary text-primary-foreground shadow hover:bg-primary/90',
        // destructive: dangerous action button (e.g., delete), uses red color scheme
        destructive:
          'bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90',
        // outline: outline button, bordered secondary action
        outline:
          'border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground',
        // secondary: secondary action button, uses gray color scheme
        secondary:
          'bg-secondary text-secondary-foreground shadow-sm hover:bg-secondary/80',
        // ghost: ghost button, no background, shows background on hover
        ghost: 'hover:bg-accent hover:text-accent-foreground',
        // link: link style, text with underline
        link: 'text-primary underline-offset-4 hover:underline',
      },
      // size: size variants for the button
      size: {
        default: 'h-9 px-4 py-2',
        sm: 'h-8 rounded-md px-3 text-xs',
        lg: 'h-10 rounded-md px-8',
        icon: 'size-9',
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
    // Determine whether to render <button> or <Slot> based on asChild prop
    const Comp = asChild ? Slot : 'button';

    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      >
        {/* Loading spinner: only shown when isLoading is true */}
        {isLoading && <Spinner size="sm" className="text-current" />}

        {/* Prefix icon: shown when not loading */}
        {!isLoading && icon && <span className="mr-2">{icon}</span>}

        {/* Button text content */}
        <span className="mx-2">{children}</span>
      </Comp>
    );
  },
);

// Set component display name for debugging
Button.displayName = 'Button';

export { Button, buttonVariants };
