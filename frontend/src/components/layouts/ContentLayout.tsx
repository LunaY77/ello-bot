import * as React from 'react';

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
  return (
    <>
      <Head title={title} />
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between border-b border-border-default pb-4">
          <div className="max-w-2xl">
            <h1 className="text-title-1 font-semibold text-primary">{title}</h1>
            {description ? (
              <p className="mt-2 text-sm text-secondary">{description}</p>
            ) : null}
          </div>
          {actions ? (
            <div className="flex flex-wrap items-center gap-3">{actions}</div>
          ) : null}
        </div>
        <div className="flex-1 w-full">{children}</div>
      </div>
    </>
  );
};
