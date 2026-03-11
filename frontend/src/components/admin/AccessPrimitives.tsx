import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

import { cn } from '@/utils/cn';

export const fieldClassName =
  'h-11 w-full rounded-md border border-border-default bg-surface-1 px-4 text-sm text-primary shadow-1 outline-none transition duration-base ease-out placeholder:text-tertiary focus:border-accent focus:ring-2 focus:ring-accent/15';

export const textareaClassName =
  'min-h-28 w-full rounded-md border border-border-default bg-surface-1 px-4 py-3 text-sm text-primary shadow-1 outline-none transition duration-base ease-out placeholder:text-tertiary focus:border-accent focus:ring-2 focus:ring-accent/15';

export const dangerOutlineButtonClassName =
  'h-11 rounded-md border-danger/40 bg-surface-1 text-danger-soft-text hover:border-danger/60 hover:bg-danger-soft-bg hover:text-danger-soft-text';

export const AccessCard = ({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) => (
  <section
    className={cn(
      'rounded-xl border border-border-default bg-surface-2 p-5 shadow-1',
      className,
    )}
  >
    {children}
  </section>
);

export const AccessSectionHeader = ({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
}) => (
  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
    <div className="max-w-2xl">
      {eyebrow ? (
        <p className="text-micro font-semibold uppercase tracking-[0.26em] text-accent-soft-text">
          {eyebrow}
        </p>
      ) : null}
      <h2 className="mt-1 text-title-3 text-primary">{title}</h2>
      {description ? (
        <p className="mt-2 text-body-s leading-6 text-secondary">
          {description}
        </p>
      ) : null}
    </div>
    {actions ? <div className="flex flex-wrap gap-3">{actions}</div> : null}
  </div>
);

export const AccessMetricCard = ({
  icon: Icon,
  label,
  value,
  hint,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  hint?: string;
}) => (
  <div className="rounded-xl border border-border-default bg-surface-2 p-4 shadow-1">
    <div className="flex items-center gap-3">
      <div className="flex size-10 items-center justify-center rounded-md bg-accent-soft-bg text-accent-soft-text">
        <Icon className="size-4" />
      </div>
      <div>
        <p className="text-micro font-semibold uppercase tracking-[0.22em] text-tertiary">
          {label}
        </p>
        <p className="mt-1 text-title-2 text-primary">{value}</p>
      </div>
    </div>
    {hint ? (
      <p className="mt-3 text-body-s leading-6 text-secondary">{hint}</p>
    ) : null}
  </div>
);

export const AccessBadge = ({
  children,
  tone = 'neutral',
}: {
  children: ReactNode;
  tone?: 'neutral' | 'accent' | 'success' | 'warning' | 'danger';
}) => {
  const toneClassName = {
    neutral: 'border-border-default bg-surface-3 text-secondary',
    accent: 'border-accent-soft-border bg-accent-soft-bg text-accent-soft-text',
    success: 'border-success/20 bg-success-soft-bg text-success-soft-text',
    warning: 'border-warning/20 bg-warning-soft-bg text-warning-soft-text',
    danger: 'border-danger/20 bg-danger-soft-bg text-danger-soft-text',
  }[tone];

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-pill border px-2.5 py-1 text-micro font-semibold',
        toneClassName,
      )}
    >
      {children}
    </span>
  );
};

export const AccessField = ({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) => (
  <label className="block">
    <span className="mb-2 block text-micro font-semibold uppercase tracking-[0.22em] text-tertiary">
      {label}
    </span>
    {children}
  </label>
);

export const AccessEmptyState = ({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) => (
  <div
    className={cn(
      'rounded-xl border border-dashed border-border-default bg-surface-1 px-4 py-10 text-center text-body-s leading-6 text-secondary',
      className,
    )}
  >
    {children}
  </div>
);
