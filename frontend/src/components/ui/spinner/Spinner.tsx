/**
 * Spinner Loading Component
 *
 * Description:
 * Displays a rotating loading animation to indicate that an asynchronous operation is in progress.
 *
 * Use Cases:
 * - Button loading state
 * - Page loading
 * - Data fetching
 * - Form submission
 */

import { cn } from '@/utils/cn';

/**
 * Size Configuration
 * Defines Tailwind CSS class names for different sizes
 */
const sizes = {
  sm: 'h-4 w-4',
  md: 'h-8 w-8',
  lg: 'h-16 w-16',
  xl: 'h-24 w-24',
};

/**
 * Color Variant Configuration
 */
const variants = {
  light: 'text-white',
  primary: 'text-slate-600',
};

/**
 * Spinner Component Props Type
 */
export type SpinnerProps = {
  /** Size: sm | md | lg | xl */
  size?: keyof typeof sizes;
  /** Color variant: light | primary */
  variant?: keyof typeof variants;
  /** Custom className */
  className?: string;
};

/**
 * Spinner Loading Component
 *
 * @param size - Size, defaults to 'md'
 * @param variant - Color variant, defaults to 'primary'
 * @param className - Custom className
 *
 * @example
 * // Basic usage
 * <Spinner />
 *
 * // Small size
 * <Spinner size="sm" />
 *
 * // White (for dark backgrounds)
 * <Spinner variant="light" />
 */
export const Spinner = ({
  size = 'md',
  variant = 'primary',
  className = '',
}: SpinnerProps) => {
  return (
    <>
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={cn(
          'animate-spin', // Tailwind's spin animation
          sizes[size],
          variants[variant],
          className,
        )}
      >
        {/* Arc path for loading animation effect */}
        <path d="M21 12a9 9 0 1 1-6.219-8.56" />
      </svg>
      {/* Screen reader text for accessibility */}
      <span className="sr-only">Loading</span>
    </>
  );
};
