/**
 * Input Component
 * V1 Design System Updated
 */
import * as React from 'react';
import { type UseFormRegisterReturn } from 'react-hook-form';

import {
  FieldWrapper,
  type FieldWrapperPassThroughProps,
} from './FieldWrapper';

import { cn } from '@/utils/cn';

export type InputProps = React.InputHTMLAttributes<HTMLInputElement> &
  FieldWrapperPassThroughProps & {
    className?: string;
    registration: Partial<UseFormRegisterReturn>;
  };

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, label, error, registration, ...props }, ref) => {
    const generatedId = React.useId();
    const inputId = props.id ?? registration.name ?? generatedId;

    return (
      <FieldWrapper label={label} error={error} htmlFor={inputId}>
        <input
          type={type}
          id={inputId}
          className={cn(
            'flex h-[44px] w-full rounded-sm border border-border-default bg-surface-2 px-4 py-2 text-sm text-primary shadow-1 transition-all duration-base ease-out file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-tertiary focus-visible:outline-none focus-visible:border-accent focus-visible:ring-1 focus-visible:ring-accent disabled:cursor-not-allowed disabled:opacity-50',
            error &&
              'border-danger focus-visible:border-danger focus-visible:ring-danger',
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
