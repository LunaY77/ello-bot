/**
 * CSS 类名合并工具
 *
 * 功能说明：
 * 本模块提供一个用于合并和处理 Tailwind CSS 类名的工具函数。
 * 在前端开发中，动态构建 className 是常见需求，特别是在组件需要根据
 * 不同的状态（如加载中、错误、禁用等）应用不同样式时。
 *
 * 为什么需要这个工具：
 * 1. Tailwind CSS 的原子化特性导致类名可能冲突（如 'p-4 p-2'）
 * 2. 动态类名需要条件合并（如按钮的变体样式）
 * 3. 多个来源的类名需要智能合并（如 props.className + 默认样式）
 */

import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * 合并并优化 Tailwind CSS 类名
 *
 * @param inputs - 可变参数，接受多种格式的类名输入：
 *                 - 字符串：'text-red-500 font-bold'
 *                 - 数组：['text-red-500', 'font-bold']
 *                 - 对象：{ 'text-red-500': true, 'font-bold': false }
 *                 - 混合：可以组合上述任意格式
 *
 * @returns 合并后的 className 字符串，已解决 Tailwind 类名冲突
 *
 * @example
 * // 基础用法
 * cn('text-red-500', 'font-bold') → 'text-red-500 font-bold'
 *
 * // 条件类名（适合根据状态切换样式）
 * cn('base-class', isActive && 'active-class') → 'base-class active-class'
 *
 * // 处理冲突（后者覆盖前者）
 * cn('px-4 py-2', 'px-2') → 'px-2 py-2'
 *
 * // 实际使用场景：组件 props 合并
 * function Button({ className, ...props }) {
 *   return (
 *     <button
 *       className={cn(
 *         'px-4 py-2 bg-blue-500 rounded', // 基础样式
 *         props.disabled && 'opacity-50 cursor-not-allowed', // 条件样式
 *         className // 用户传入的自定义样式（可覆盖基础样式）
 *       )}
 *       {...props}
 *     />
 *   )
 * }
 */
export function cn(...inputs: ClassValue[]) {
  // 执行流程：
  // 1. clsx(inputs)：先处理各种格式的输入，将它们转换为标准的 className 字符串
  // 2. twMerge(...)：然后解决 Tailwind 类名冲突，确保后面的类覆盖前面的冲突类
  return twMerge(clsx(inputs));
}
