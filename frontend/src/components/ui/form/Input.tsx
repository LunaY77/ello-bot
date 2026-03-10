/**
 * Input Component
 *
 * Description:
 * A form input component based on native input, integrated with react-hook-form.
 *
 * Features:
 * - Supports react-hook-form's register
 * - Automatically displays label and error messages
 * - Supports all native input attributes
 */

import * as React from 'react';
import { type UseFormRegisterReturn } from 'react-hook-form';

import {
  FieldWrapper,
  type FieldWrapperPassThroughProps,
} from './FieldWrapper';

import { cn } from '@/utils/cn';

/**
 * Input Component Props Type
 */
export type InputProps = React.InputHTMLAttributes<HTMLInputElement> &
  FieldWrapperPassThroughProps & {
    /** Custom className */
    className?: string;
    /** react-hook-form's register return value */
    registration: Partial<UseFormRegisterReturn>;
  };

/**
 * Input Component
 *
 * @param label - Field label
 * @param error - Field error
 * @param registration - react-hook-form's register return value
 * @param className - Custom className
 * @param type - Input type
 *
 * @example
 * <Input
 *   label="Email"
 *   type="email"
 *   error={errors.email}
 *   registration={register('email')}
 * />
 */
const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, label, error, registration, ...props }, ref) => {
    return (
      <FieldWrapper label={label} error={error}>
        <input
          type={type}
          className={cn(
            'flex h-10 w-full rounded-xl border border-input bg-white/80 px-4 py-2 text-sm text-stone-900 shadow-sm transition file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50',
            className,
          )}
          ref={ref}
          {...registration}
          {...props}
        />
      </FieldWrapper>
    );
  },
);
Input.displayName = 'Input';

export { Input };
