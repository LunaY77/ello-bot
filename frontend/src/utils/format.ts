/**
 * Date Formatting Utility
 *
 * Feature Description:
 * This module provides date and time formatting functionality.
 * In frontend development, timestamps from backend APIs need to be converted to user-friendly formats for display.
 *
 * Why date formatting is needed:
 * 1. Backend typically returns Unix timestamps (milliseconds) or ISO 8601 format strings
 * 2. Frontend needs to display different formats based on user locale and business scenarios
 * 3. Complex scenarios like timezone conversion and relative time need to be handled
 */

import { default as dayjs } from 'dayjs';

/**
 * Format date and time
 *
 * @param date - Unix timestamp (milliseconds) or date string
 * @returns Formatted date string
 *
 * @example
 * formatDate(1704067200000) → "2024-01-01 08:00"
 * formatDate(Date.now()) → "Current time"
 */
export const formatDate = (date: number | string) =>
  dayjs(date).format('YYYY-MM-DD HH:mm');

/**
 * Format as relative time
 *
 * @param date - Unix timestamp (milliseconds) or date string
 * @returns Relative time string (e.g., "3 days ago")
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
        return 'Just now';
      }
      return `${diffMinutes} minutes ago`;
    }
    return `${diffHours} hours ago`;
  }

  if (diffDays < 7) {
    return `${diffDays} days ago`;
  }

  if (diffDays < 30) {
    return `${Math.floor(diffDays / 7)} weeks ago`;
  }

  return formatDate(date);
};

/**
 * Format as date only (without time)
 *
 * @param date - Unix timestamp (milliseconds) or date string
 * @returns Formatted date string
 */
export const formatDateOnly = (date: number | string) =>
  dayjs(date).format('YYYY-MM-DD');
