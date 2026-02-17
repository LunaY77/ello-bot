/**
 * 日期格式化工具
 *
 * 功能说明：
 * 本模块提供日期时间格式化功能。
 * 在前端开发中，从后端 API 获取的时间戳需要转换为用户友好的格式显示。
 *
 * 为什么需要日期格式化：
 * 1. 后端通常返回 Unix 时间戳（毫秒）或 ISO 8601 格式字符串
 * 2. 前端需要根据用户地区和业务场景显示不同的格式
 * 3. 需要处理时区转换、相对时间等复杂场景
 */

import { default as dayjs } from 'dayjs';

/**
 * 格式化日期时间
 *
 * @param date - Unix 时间戳（毫秒）或日期字符串
 * @returns 格式化后的日期字符串
 *
 * @example
 * formatDate(1704067200000) → "2024-01-01 08:00"
 * formatDate(Date.now()) → "当前时间"
 */
export const formatDate = (date: number | string) =>
  dayjs(date).format('YYYY-MM-DD HH:mm');

/**
 * 格式化为相对时间
 *
 * @param date - Unix 时间戳（毫秒）或日期字符串
 * @returns 相对时间字符串（如 "3 天前"）
 */
export const formatRelativeDate = (date: number | string) => {
  const now = dayjs();
  const target = dayjs(date);
  const diffDays = now.diff(target, 'day');

  if (diffDays === 0) {
    const diffHours = now.diff(target, 'hour');
    if (diffHours === 0) {
      const diffMinutes = now.diff(target, 'minute');
      if (diffMinutes === 0) {
        return '刚刚';
      }
      return `${diffMinutes} 分钟前`;
    }
    return `${diffHours} 小时前`;
  }

  if (diffDays < 7) {
    return `${diffDays} 天前`;
  }

  if (diffDays < 30) {
    return `${Math.floor(diffDays / 7)} 周前`;
  }

  return formatDate(date);
};

/**
 * 格式化为日期（不含时间）
 *
 * @param date - Unix 时间戳（毫秒）或日期字符串
 * @returns 格式化后的日期字符串
 */
export const formatDateOnly = (date: number | string) =>
  dayjs(date).format('YYYY-MM-DD');
