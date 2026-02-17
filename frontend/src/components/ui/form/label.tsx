/**
 * Label 标签组件
 *
 * 功能说明：
 * 基于 Radix UI Label 的表单标签组件，用于标识表单字段。
 *
 * 特性：
 * - 无障碍访问支持
 * - 与表单控件关联
 * - 支持禁用状态样式
 */

import * as LabelPrimitive from '@radix-ui/react-label';
import { cva, type VariantProps } from 'class-variance-authority';
import * as React from 'react';

import { cn } from '@/utils/cn';

/**
 * 标签样式变体
 */
const labelVariants = cva(
  'text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70',
);

/**
 * Label 组件
 *
 * @example
 * <Label htmlFor="email">邮箱</Label>
 * <input id="email" type="email" />
 */
const Label = React.forwardRef<
  React.ElementRef<typeof LabelPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof LabelPrimitive.Root> &
    VariantProps<typeof labelVariants>
>(({ className, ...props }, ref) => (
  <LabelPrimitive.Root
    ref={ref}
    className={cn(labelVariants(), className)}
    {...props}
  />
));
Label.displayName = LabelPrimitive.Root.displayName;

export { Label };
