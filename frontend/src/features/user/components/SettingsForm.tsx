import { startTransition } from 'react';
import { useTranslation } from 'react-i18next';

import { useSettings, useUpdateSettings } from '../api/user';

import { UpdateUserSettingsRequestSchema } from '@/api/schemas';
import { Button } from '@/components/ui/button';
import { FieldWrapper, Form, Input } from '@/components/ui/form';
import { Spinner } from '@/components/ui/spinner';
import i18n from '@/lib/i18n';
import { useTheme } from '@/lib/theme';
import { localeOptions, normalizeLocale } from '@/locales/resources';

export const SettingsForm = () => {
  const { t } = useTranslation('user');
  const settingsQuery = useSettings();
  const { setTheme } = useTheme();
  const updateSettings = useUpdateSettings({
    mutationConfig: {
      onSuccess: async (settings) => {
        const nextLocale = normalizeLocale(settings.locale);
        startTransition(() => {
          void i18n.changeLanguage(nextLocale);
        });

        if (settings.theme === 'light' || settings.theme === 'dark') {
          setTheme(settings.theme);
        }
      },
    },
  });

  if (settingsQuery.isLoading || !settingsQuery.data) {
    return (
      <div className="flex min-h-[240px] items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  const settings = settingsQuery.data;

  return (
    <div className="rounded-xl border border-border-default bg-surface-2 p-6 shadow-1">
      <Form
        onSubmit={(values) => {
          updateSettings.mutate({
            locale: values.locale,
            theme: values.theme,
            defaultModel: values.defaultModel?.trim() || null,
            systemPrompt: values.systemPrompt?.trim() || null,
          });
        }}
        schema={UpdateUserSettingsRequestSchema}
        options={{
          defaultValues: {
            locale: settings.locale,
            theme: settings.theme,
            defaultModel: settings.defaultModel,
            systemPrompt: settings.systemPrompt,
          },
        }}
      >
        {({ register, formState }) => (
          <div className="space-y-5">
            <div>
              <p className="text-micro font-semibold uppercase tracking-[0.24em] text-tertiary">
                {t('settings.formTitle')}
              </p>
              <p className="mt-2 text-sm leading-6 text-secondary">
                {t('settings.formDescription')}
              </p>
            </div>
            <div className="grid gap-5 md:grid-cols-2">
              <FieldWrapper
                label={t('settings.locale')}
                error={formState.errors.locale}
                htmlFor="settings-locale"
              >
                <select
                  {...register('locale')}
                  id="settings-locale"
                  className="h-11 w-full rounded-md border border-border-default bg-surface-1 px-4 text-sm text-primary shadow-none outline-none transition focus:border-accent focus:ring-1 focus:ring-accent"
                >
                  {localeOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </FieldWrapper>
              <FieldWrapper
                label={t('settings.theme')}
                error={formState.errors.theme}
                htmlFor="settings-theme"
              >
                <select
                  {...register('theme')}
                  id="settings-theme"
                  className="h-11 w-full rounded-md border border-border-default bg-surface-1 px-4 text-sm text-primary shadow-none outline-none transition focus:border-accent focus:ring-1 focus:ring-accent"
                >
                  <option value="light">{t('settings.themeLight')}</option>
                  <option value="dark">{t('settings.themeDark')}</option>
                </select>
              </FieldWrapper>
            </div>
            <Input
              type="text"
              label={t('settings.defaultModel')}
              error={formState.errors.defaultModel}
              registration={register('defaultModel')}
              className="h-11 rounded-md border-border-default bg-surface-1"
            />
            <FieldWrapper
              label={t('settings.systemPrompt')}
              error={formState.errors.systemPrompt}
              htmlFor="settings-system-prompt"
            >
              <textarea
                {...register('systemPrompt')}
                id="settings-system-prompt"
                rows={8}
                className="w-full rounded-md border border-border-default bg-surface-1 px-4 py-3 text-sm text-primary shadow-none outline-none transition focus:border-accent focus:ring-1 focus:ring-accent"
                placeholder={t('settings.systemPromptPlaceholder')}
              />
            </FieldWrapper>
            <Button
              type="submit"
              className="h-11 rounded-md"
              isLoading={updateSettings.isPending}
            >
              {t('settings.save')}
            </Button>
          </div>
        )}
      </Form>
    </div>
  );
};
