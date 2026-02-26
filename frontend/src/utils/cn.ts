/**
 * CSS Class Name Merge Utility
 *
 * Feature Description:
 * This module provides a utility function for merging and handling Tailwind CSS class names.
 * In frontend development, dynamically building className is a common requirement, especially
 * when components need to apply different styles based on various states (e.g., loading, error, disabled).
 *
 * Why this utility is needed:
 * 1. Tailwind CSS's atomic nature can cause class name conflicts (e.g., 'p-4 p-2')
 * 2. Dynamic class names need conditional merging (e.g., button variant styles)
 * 3. Class names from multiple sources need intelligent merging (e.g., props.className + default styles)
 */

import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Merge and optimize Tailwind CSS class names
 *
 * @param inputs - Variadic parameters accepting multiple class name formats:
 *                 - String: 'text-red-500 font-bold'
 *                 - Array: ['text-red-500', 'font-bold']
 *                 - Object: { 'text-red-500': true, 'font-bold': false }
 *                 - Mixed: Combine any of the above formats
 *
 * @returns Merged className string with Tailwind class conflicts resolved
 *
 * @example
 * // Basic usage
 * cn('text-red-500', 'font-bold') → 'text-red-500 font-bold'
 *
 * // Conditional class names (suitable for state-based style changes)
 * cn('base-class', isActive && 'active-class') → 'base-class active-class'
 *
 * // Handling conflicts (latter overrides former)
 * cn('px-4 py-2', 'px-2') → 'px-2 py-2'
 *
 * // Real-world usage: component props merging
 * function Button({ className, ...props }) {
 *   return (
 *     <button
 *       className={cn(
 *         'px-4 py-2 bg-blue-500 rounded', // base styles
 *         props.disabled && 'opacity-50 cursor-not-allowed', // conditional styles
 *         className // user-provided custom styles (can override base styles)
 *       )}
 *       {...props}
 *     />
 *   )
 * }
 */
export function cn(...inputs: ClassValue[]) {
  // Execution flow:
  // 1. clsx(inputs): First process various format inputs and convert them to standard className strings
  // 2. twMerge(...): Then resolve Tailwind class name conflicts, ensuring later classes override conflicting earlier ones
  return twMerge(clsx(inputs));
}
