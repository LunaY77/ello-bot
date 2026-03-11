import { Languages } from 'lucide-react';
import { startTransition } from 'react';
import { useTranslation } from 'react-i18next';

import {
  localeOptions,
  normalizeLocale,
  type Locales,
} from '@/locales/resources';
import { cn } from '@/utils/cn';

type LanguageSwitcherProps = {
  className?: string;
  tone?: 'light' | 'dark';
};

export const LanguageSwitcher = ({
  className,
  tone = 'light',
}: LanguageSwitcherProps) => {
  const { i18n, t } = useTranslation('common');
  const currentLocale = normalizeLocale(i18n.resolvedLanguage ?? i18n.language);

  return (
    <label
      className={cn(
        'relative inline-flex h-11 items-center overflow-hidden rounded-sm border shadow-sm transition',
        tone === 'dark'
          ? 'border-border-subtle bg-surface-2/10 text-white backdrop-blur'
          : 'border-border-default bg-surface-2 text-primary',
        className,
      )}
    >
      <span
        className={cn(
          'pointer-events-none flex h-full items-center border-r px-3',
          tone === 'dark'
            ? 'border-border-subtle text-disabled'
            : 'border-border-default text-tertiary',
        )}
      >
        <Languages className="size-4" aria-hidden="true" />
      </span>
      <span className="sr-only">{t('language.label')}</span>
      <select
        aria-label={t('language.label')}
        className={cn(
          'h-full appearance-none bg-transparent pl-3 pr-9 text-sm font-medium outline-none',
          tone === 'dark' ? 'text-white' : 'text-primary',
        )}
        value={currentLocale}
        onChange={(event) => {
          const nextLocale = event.target.value as Locales;
          startTransition(() => {
            void i18n.changeLanguage(nextLocale);
          });
        }}
      >
        {localeOptions.map((option) => (
          <option
            key={option.value}
            value={option.value}
            className="text-primary"
          >
            {option.label}
          </option>
        ))}
      </select>
      <span
        aria-hidden="true"
        className={cn(
          'pointer-events-none absolute right-3 text-[10px] font-semibold uppercase tracking-[0.18em]',
          tone === 'dark' ? 'text-quaternary' : 'text-tertiary',
        )}
      >
        {currentLocale === 'zh-CN'
          ? t('language.short.zhCN')
          : t('language.short.enUS')}
      </span>
    </label>
  );
};
