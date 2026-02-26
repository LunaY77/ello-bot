import i18n from 'i18next';
import { type ZodErrorMap, ZodIssueCode, ZodParsedType } from 'zod';

export const zodErrorMap: ZodErrorMap = (issue, ctx) => {
  const t = (key: string, params?: Record<string, unknown>) =>
    i18n.t(key, { ns: 'validation', ...params });

  switch (issue.code) {
    case ZodIssueCode.invalid_type:
      if (issue.received === ZodParsedType.undefined) {
        return { message: t('required') };
      }
      return {
        message: t('invalidType', {
          expected: issue.expected,
          received: issue.received,
        }),
      };

    case ZodIssueCode.too_small:
      if (issue.type === 'string') {
        return issue.minimum === 1
          ? { message: t('string.nonempty') }
          : { message: t('string.min', { min: issue.minimum }) };
      }
      if (issue.type === 'number') {
        return { message: t('number.min', { min: issue.minimum }) };
      }
      break;

    case ZodIssueCode.too_big:
      if (issue.type === 'string') {
        return { message: t('string.max', { max: issue.maximum }) };
      }
      if (issue.type === 'number') {
        return { message: t('number.max', { max: issue.maximum }) };
      }
      break;

    case ZodIssueCode.invalid_string:
      if (issue.validation === 'url') {
        return { message: t('string.url') };
      }
      if (issue.validation === 'email') {
        return { message: t('string.email') };
      }
      break;
  }

  return { message: ctx.defaultError };
};
