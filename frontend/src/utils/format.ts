import i18n from '@/lib/i18n';
import { normalizeLocale } from '@/locales/resources';

type SupportedDateInput = number | string | Date;

const resolveLocale = () =>
  normalizeLocale(i18n.resolvedLanguage ?? i18n.language);

const toDateInstance = (value: SupportedDateInput) => {
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const formatWithOptions = (
  value: SupportedDateInput,
  options: Intl.DateTimeFormatOptions,
) => {
  const date = toDateInstance(value);
  if (!date) {
    return getEmptyDisplayValue();
  }

  return new Intl.DateTimeFormat(resolveLocale(), options).format(date);
};

// Keep empty-state symbols centralized so list cells and detail cards stay consistent.
export const getEmptyDisplayValue = () =>
  i18n.t('emptyValue', { ns: 'common', defaultValue: '—' });

// Full timestamp for detail panels where the operator needs exact timing.
export const formatDate = (date: SupportedDateInput) =>
  formatWithOptions(date, {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });

// Compact timestamp for dense summary cards where year repetition adds noise.
export const formatCompactDateTime = (date: SupportedDateInput) =>
  formatWithOptions(date, {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });

export const formatRelativeDate = (date: SupportedDateInput) => {
  const target = toDateInstance(date);
  if (!target) {
    return getEmptyDisplayValue();
  }

  const diffMs = target.getTime() - Date.now();
  const diffMinutes = Math.round(diffMs / 60_000);
  const diffHours = Math.round(diffMs / 3_600_000);
  const diffDays = Math.round(diffMs / 86_400_000);
  const diffWeeks = Math.round(diffMs / 604_800_000);
  const formatter = new Intl.RelativeTimeFormat(resolveLocale(), {
    numeric: 'auto',
  });

  if (Math.abs(diffMinutes) < 60) {
    return formatter.format(diffMinutes, 'minute');
  }

  if (Math.abs(diffHours) < 24) {
    return formatter.format(diffHours, 'hour');
  }

  if (Math.abs(diffDays) < 7) {
    return formatter.format(diffDays, 'day');
  }

  if (Math.abs(diffWeeks) < 4) {
    return formatter.format(diffWeeks, 'week');
  }

  return formatDate(date);
};

export const formatDateOnly = (date: SupportedDateInput) =>
  formatWithOptions(date, {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
