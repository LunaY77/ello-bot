import i18n from 'i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import resourcesToBackend from 'i18next-resources-to-backend';
import { initReactI18next } from 'react-i18next';
import { z } from 'zod';

import { zodErrorMap } from './zod-error-map';

import defaultResources from '@/locales/default';
import { DEFAULT_LANG, type NS, normalizeLocale } from '@/locales/resources';

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .use(
    resourcesToBackend(async (lng: string, ns: string) => {
      const normalized = normalizeLocale(lng);
      if (normalized === DEFAULT_LANG) {
        return (defaultResources as Record<string, unknown>)[ns] ?? {};
      }
      try {
        return await import(`../../locales/${normalized}/${ns}.json`);
      } catch {
        return (defaultResources as Record<string, unknown>)[ns] ?? {};
      }
    }),
  )
  .init({
    fallbackLng: DEFAULT_LANG,
    defaultNS: 'common',
    ns: Object.keys(defaultResources) as NS[],
    interpolation: { escapeValue: false },
  });

z.setErrorMap(zodErrorMap);

export default i18n;
