/**
 * Link Component
 *
 * Description:
 * A wrapper around react-router's Link component providing consistent link styling.
 *
 * Use Cases:
 * - In-app navigation links
 * - Links requiring consistent styling
 */

import { Link as RouterLink, type LinkProps } from 'react-router-dom';

import { cn } from '@/utils/cn';

/**
 * Link Component
 *
 * @param className - Custom className
 * @param children - Link content
 * @param props - Other react-router Link props
 *
 * @example
 * <Link to="/home">Home</Link>
 * <Link to="/about" className="text-blue-500">About</Link>
 */
export const Link = ({ className, children, ...props }: LinkProps) => {
  return (
    <RouterLink
      className={cn('text-primary hover:text-primary/80', className)}
      {...props}
    >
      {children}
    </RouterLink>
  );
};
