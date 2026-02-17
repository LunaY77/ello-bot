/**
 * Input 输入框组件
 *
 * 功能说明：
 * 基于原生 input 的表单输入组件，集成 react-hook-form。
 *
 * 特性：
 * - 支持 react-hook-form 的 register
 * - 自动显示标签和错误信息
 * - 支持所有原生 input 属性
 */

import * as React from 'react';
import { type UseFormRegisterReturn } from 'react-hook-form';

import { cn } from '@/utils/cn';

import { FieldWrapper, type FieldWrapperPassThroughProps } from './field-wrapper';

/**
 * Input 组件的 Props 类型
 */
export type InputProps = React.InputHTMLAttributes<HTMLInputElement> &
  FieldWrapperPassThroughProps & {
    /** 自定义 className */
    className?: string;
    /** react-hook-form 的 register 返回值 */
    registration: Partial<UseFormRegisterReturn>;
  };

/**
 * Input 输入框组件
 *
 * @param label - 字段标签
 * @param error - 字段错误
 * @param registration - react-hook-form 的 register 返回值
 * @param className - 自定义 className
 * @param type - 输入类型
 *
 * @example
 * <Input
 *   label="邮箱"
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
            'flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50',
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
