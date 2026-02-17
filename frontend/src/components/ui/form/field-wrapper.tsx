/**
 * FieldWrapper 字段包装组件
 *
 * 功能说明：
 * 包装表单字段，提供统一的标签和错误显示布局。
 *
 * 使用场景：
 * - 包装 Input、Select 等表单控件
 * - 统一表单字段的布局结构
 */

import * as React from 'react';
import { type FieldError } from 'react-hook-form';

import { Error } from './error';
import { Label } from './label';

/**
 * FieldWrapper 组件的 Props 类型
 */
type FieldWrapperProps = {
  /** 字段标签 */
  label?: string;
  /** 自定义 className */
  className?: string;
  /** 子元素（表单控件） */
  children: React.ReactNode;
  /** 字段错误 */
  error?: FieldError | undefined;
};

/**
 * 传递给子组件的 Props 类型
 * 排除 className 和 children，只保留 label 和 error
 */
export type FieldWrapperPassThroughProps = Omit<
  FieldWrapperProps,
  'className' | 'children'
>;

/**
 * FieldWrapper 字段包装组件
 *
 * @param label - 字段标签
 * @param error - 字段错误
 * @param children - 表单控件
 *
 * @example
 * <FieldWrapper label="邮箱" error={errors.email}>
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
