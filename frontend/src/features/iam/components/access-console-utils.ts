import { formatDate, getEmptyDisplayValue } from '@/utils/format';

type TextFormControl =
  | HTMLInputElement
  | HTMLTextAreaElement
  | HTMLSelectElement;

const isTextFormControl = (value: unknown): value is TextFormControl =>
  value instanceof HTMLInputElement ||
  value instanceof HTMLTextAreaElement ||
  value instanceof HTMLSelectElement;

// FormData always returns nullable values, so these helpers keep console forms consistent.
export const parseRequiredString = (
  value: FormDataEntryValue | null,
): string | null => {
  const parsed = String(value ?? '').trim();
  return parsed || null;
};

export const readRequiredStringField = (
  form: HTMLFormElement,
  fieldName: string,
): string | null => {
  const field = form.elements.namedItem(fieldName);
  const control = isTextFormControl(field) ? field : null;
  const parsed = parseRequiredString(
    control ? control.value : new FormData(form).get(fieldName),
  );

  if (!control) {
    return parsed;
  }

  control.value = parsed ?? '';

  if (!parsed) {
    control.reportValidity();
    return null;
  }

  return parsed;
};

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
