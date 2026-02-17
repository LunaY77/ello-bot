/**
 * Spinner 加载动画组件
 *
 * 功能说明：
 * 显示一个旋转的加载动画，用于指示异步操作正在进行中。
 *
 * 使用场景：
 * - 按钮加载状态
 * - 页面加载中
 * - 数据获取中
 * - 表单提交中
 */

import { cn } from '@/utils/cn';

/**
 * 尺寸配置
 * 定义不同尺寸的 Tailwind CSS 类名
 */
const sizes = {
  sm: 'h-4 w-4',
  md: 'h-8 w-8',
  lg: 'h-16 w-16',
  xl: 'h-24 w-24',
};

/**
 * 颜色变体配置
 */
const variants = {
  light: 'text-white',
  primary: 'text-slate-600',
};

/**
 * Spinner 组件的 Props 类型
 */
export type SpinnerProps = {
  /** 尺寸：sm | md | lg | xl */
  size?: keyof typeof sizes;
  /** 颜色变体：light | primary */
  variant?: keyof typeof variants;
  /** 自定义 className */
  className?: string;
};

/**
 * Spinner 加载动画组件
 *
 * @param size - 尺寸，默认 'md'
 * @param variant - 颜色变体，默认 'primary'
 * @param className - 自定义 className
 *
 * @example
 * // 基础用法
 * <Spinner />
 *
 * // 小尺寸
 * <Spinner size="sm" />
 *
 * // 白色（用于深色背景）
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
          'animate-spin', // Tailwind 的旋转动画
          sizes[size],
          variants[variant],
          className,
        )}
      >
        {/* 圆弧路径，形成加载动画效果 */}
        <path d="M21 12a9 9 0 1 1-6.219-8.56" />
      </svg>
      {/* 屏幕阅读器文本，提升无障碍访问性 */}
      <span className="sr-only">加载中</span>
    </>
  );
};
