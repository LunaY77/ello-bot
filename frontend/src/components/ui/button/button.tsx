/**
 * Button 按钮组件
 *
 * 功能说明：
 * 通用的按钮组件，支持多种视觉变体（variant）、尺寸（size）和状态。
 *
 * 核心特性：
 * - 使用 class-variance-authority (cva) 管理样式变体
 * - 支持 asChild 模式，可将按钮样式应用到任意子元素
 * - 支持 loading 状态，自动显示加载动画
 * - 支持 icon 插槽，可在按钮前添加图标
 * - 使用 React.forwardRef 支持 ref 转发
 *
 * @example
 * // 基础用法
 * <Button>点击我</Button>
 *
 * // 不同变体
 * <Button variant="destructive">删除</Button>
 * <Button variant="outline">取消</Button>
 *
 * // 加载状态
 * <Button isLoading>提交中...</Button>
 */

import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import * as React from 'react';

import { cn } from '@/utils/cn';

import { Spinner } from '../spinner';

/**
 * 按钮样式变体配置
 *
 * 使用 class-variance-authority (cva) 定义按钮的样式变体
 * 根据不同的 variant 和 size 参数返回对应的 className
 */
const buttonVariants = cva(
  // 基础样式：所有按钮共享
  'inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      // variant: 按钮的视觉风格变体
      variant: {
        // default: 主要操作按钮，使用主题色
        default:
          'bg-primary text-primary-foreground shadow hover:bg-primary/90',
        // destructive: 危险操作按钮（如删除），使用红色系
        destructive:
          'bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90',
        // outline: 轮廓按钮，带边框的次要操作
        outline:
          'border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground',
        // secondary: 次要操作按钮，使用灰色系
        secondary:
          'bg-secondary text-secondary-foreground shadow-sm hover:bg-secondary/80',
        // ghost: 幽灵按钮，无背景，hover 时才显示背景
        ghost: 'hover:bg-accent hover:text-accent-foreground',
        // link: 链接样式，文本带下划线
        link: 'text-primary underline-offset-4 hover:underline',
      },
      // size: 按钮的尺寸变体
      size: {
        default: 'h-9 px-4 py-2',
        sm: 'h-8 rounded-md px-3 text-xs',
        lg: 'h-10 rounded-md px-8',
        icon: 'size-9',
      },
    },
    // 默认使用的变体
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
);

/**
 * Button 组件的 Props 类型定义
 */
export type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof buttonVariants> & {
    /**
     * asChild 模式
     * 当为 true 时，按钮的样式和行为会应用到第一个子元素上
     */
    asChild?: boolean;
    /**
     * 加载状态
     * 为 true 时显示加载动画
     */
    isLoading?: boolean;
    /**
     * 图标
     * 显示在按钮文本前方的图标
     */
    icon?: React.ReactNode;
  };

/**
 * Button 组件实现
 *
 * 使用 React.forwardRef 创建支持 ref 转发的按钮组件
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
    // 根据 asChild 属性决定渲染 <button> 还是 <Slot>
    const Comp = asChild ? Slot : 'button';

    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      >
        {/* 加载动画：仅在 isLoading 为 true 时显示 */}
        {isLoading && <Spinner size="sm" className="text-current" />}

        {/* 前缀图标：非加载状态时显示 */}
        {!isLoading && icon && <span className="mr-2">{icon}</span>}

        {/* 按钮文本内容 */}
        <span className="mx-2">{children}</span>
      </Comp>
    );
  },
);

// 设置组件的显示名称，便于调试
Button.displayName = 'Button';

export { Button, buttonVariants };
