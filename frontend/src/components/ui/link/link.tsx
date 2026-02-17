/**
 * Link 链接组件
 *
 * 功能说明：
 * 基于 react-router 的 Link 组件封装，提供统一的链接样式。
 *
 * 使用场景：
 * - 应用内导航链接
 * - 需要统一样式的链接
 */

import { Link as RouterLink, type LinkProps } from 'react-router-dom';

import { cn } from '@/utils/cn';

/**
 * Link 组件
 *
 * @param className - 自定义 className
 * @param children - 链接内容
 * @param props - 其他 react-router Link 属性
 *
 * @example
 * <Link to="/home">首页</Link>
 * <Link to="/about" className="text-blue-500">关于我们</Link>
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
