import resources from './default';

export type DefaultResources = typeof resources;
export type NS = keyof DefaultResources;

export const locales = ['en-US', 'zh-CN'] as const;
export type Locales = (typeof locales)[number];

export const DEFAULT_LANG = 'en-US' as const;

export const normalizeLocale = (locale?: string): Locales => {
  if (!locale) return DEFAULT_LANG;
  if (locale.startsWith('zh')) return 'zh-CN';
  for (const l of locales) {
    if (l.startsWith(locale)) return l;
  }
  return DEFAULT_LANG;
};

export const localeOptions = [
  { label: 'English', value: 'en-US' },
  { label: '简体中文', value: 'zh-CN' },
] as const;

export default resources;
