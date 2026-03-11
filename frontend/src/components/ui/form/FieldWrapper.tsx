/**
 * FieldWrapper Component
 * V1 Design System Updated
 */
import * as React from 'react';
import { type FieldError } from 'react-hook-form';

import { Error } from './Error';
import { Label } from './Label';

type FieldWrapperProps = {
  label?: string;
  className?: string;
  children: React.ReactNode;
  error?: FieldError | undefined;
  htmlFor?: string;
};

export type FieldWrapperPassThroughProps = Omit<
  FieldWrapperProps,
  'className' | 'children'
>;

export const FieldWrapper = (props: FieldWrapperProps) => {
  const { label, error, children, htmlFor } = props;
  return (
    <div className="flex flex-col gap-[8px]">
      <Label className="text-secondary text-sm font-medium" htmlFor={htmlFor}>
        {label}
      </Label>
      <div className="relative">{children}</div>
      <Error errorMessage={error?.message} />
    </div>
  );
};
