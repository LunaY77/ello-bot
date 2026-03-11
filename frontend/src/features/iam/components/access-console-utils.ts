import { formatDate, getEmptyDisplayValue } from '@/utils/format';

// FormData always returns nullable values, so these helpers keep console forms consistent.
export const parseRequiredString = (value: FormDataEntryValue | null): string =>
  String(value ?? '').trim();

export const parseOptionalString = (
  value: FormDataEntryValue | null,
): string | null => {
  const parsed = String(value ?? '').trim();
  return parsed || null;
};

export const parseRequiredNumber = (
  value: FormDataEntryValue | null,
): number | null => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
};

export const parseOptionalNumber = (
  value: FormDataEntryValue | null,
): number | null => {
  const parsed = String(value ?? '').trim();
  if (!parsed) {
    return null;
  }

  const numberValue = Number(parsed);
  return Number.isFinite(numberValue) && numberValue > 0 ? numberValue : null;
};

export const formatOptionalDate = (value?: string | null) =>
  value ? formatDate(value) : getEmptyDisplayValue();

export const normalizeSearchText = (
  ...parts: Array<string | number | null | undefined>
) =>
  parts
    .filter((part) => part !== null && part !== undefined)
    .join(' ')
    .toLowerCase();
