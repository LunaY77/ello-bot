/**
 * FieldWrapper Component
 *
 * Description:
 * Wraps form fields to provide consistent label and error display layout.
 *
 * Use Cases:
 * - Wrapping Input, Select and other form controls
 * - Consistent layout structure for form fields
 */

import * as React from 'react';
import { type FieldError } from 'react-hook-form';

import { Error } from './Error';
import { Label } from './Label';

/**
 * FieldWrapper Component Props Type
 */
type FieldWrapperProps = {
  /** Field label */
  label?: string;
  /** Custom className */
  className?: string;
  /** Child elements (form controls) */
  children: React.ReactNode;
  /** Field error */
  error?: FieldError | undefined;
};

/**
 * Props to pass through to child components
 * Excludes className and children, keeping only label and error
 */
export type FieldWrapperPassThroughProps = Omit<
  FieldWrapperProps,
  'className' | 'children'
>;

/**
 * FieldWrapper Component
 *
 * @param label - Field label
 * @param error - Field error
 * @param children - Form control
 *
 * @example
 * <FieldWrapper label="Email" error={errors.email}>
 *   <input type="email" {...register('email')} />
 * </FieldWrapper>
 */
export const FieldWrapper = (props: FieldWrapperProps) => {
  const { label, error, children } = props;
  return (
    <div>
      <Label>
        {label}
        <div className="mt-1">{children}</div>
      </Label>
      <Error errorMessage={error?.message} />
    </div>
  );
};
