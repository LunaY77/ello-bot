import * as React from 'react';
import { useTranslation } from 'react-i18next';

import { Head } from '@/components/seo';

type ContentLayoutProps = {
  children: React.ReactNode;
  title: string;
  description?: string;
  actions?: React.ReactNode;
};

export const ContentLayout = ({
  children,
  title,
  description,
  actions,
}: ContentLayoutProps) => {
  const { t } = useTranslation('common');

  return (
    <>
      <Head title={title} />
      <div className="py-6">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 sm:px-6 md:px-8 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-stone-500">
              {t('shell.product')}
            </p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-stone-900">
              {title}
            </h1>
            {description ? (
              <p className="mt-3 text-sm leading-6 text-stone-600">
                {description}
              </p>
            ) : null}
          </div>
          {actions ? (
            <div className="flex flex-wrap items-center gap-3">{actions}</div>
          ) : null}
        </div>
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 md:px-8">
          {children}
        </div>
      </div>
    </>
  );
};
