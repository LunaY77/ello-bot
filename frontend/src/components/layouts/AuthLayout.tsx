import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useSearchParams } from 'react-router';

import { Head } from '@/components/seo';
import { LanguageSwitcher } from '@/components/ui/language-switcher';
import { Link } from '@/components/ui/link';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { paths } from '@/config/paths';
import { getViewerDisplayName, useCurrentUser } from '@/lib/auth';
import { useTheme } from '@/lib/theme';

type LayoutProps = {
  children: React.ReactNode;
  title: string;
  description: string;
};

export const AuthLayout = ({ children, title, description }: LayoutProps) => {
  const { t } = useTranslation('auth');
  const { t: commonT } = useTranslation('common');
  const user = useCurrentUser();
  const { theme } = useTheme();
  const [searchParams] = useSearchParams();
  const redirectTo = searchParams.get('redirectTo');
  const navigate = useNavigate();

  // Redirect authenticated user to dashboard
  useEffect(() => {
    if (user.data) {
      navigate(redirectTo || paths.app.dashboard.getHref(), {
        replace: true,
      });
    }
  }, [user.data, navigate, redirectTo]);

  return (
    <>
      <Head title={title} />
      <div className="relative min-h-screen overflow-hidden bg-canvas">
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(124,140,255,0.18),transparent_32%),radial-gradient(circle_at_bottom_right,rgba(77,163,255,0.1),transparent_28%),linear-gradient(180deg,var(--bg-canvas)_0%,var(--bg-subtle)_100%)]"
        />
        <div className="relative mx-auto grid min-h-screen max-w-7xl lg:grid-cols-[1.05fr_0.95fr]">
          {/* The left rail carries trust and product context; it should feel centered, not hero-like. */}
          <div className="hidden border-r border-border-subtle px-10 py-10 lg:relative lg:flex lg:items-center">
            <div className="absolute inset-x-10 top-10 flex items-center justify-between gap-4">
              <Link
                className="inline-flex items-center rounded-pill border border-glass-border bg-glass-bg px-4 py-2 text-sm font-semibold text-primary shadow-1 backdrop-blur-glass"
                to={paths.home.getHref()}
              >
                {commonT('shell.product')}
              </Link>
              <div className="flex items-center gap-3">
                <ThemeToggle />
                <LanguageSwitcher tone={theme === 'dark' ? 'dark' : 'light'} />
              </div>
            </div>

            <div className="mx-auto flex w-full max-w-[34rem] flex-col gap-8 xl:gap-10">
              <div>
                <p className="inline-flex items-center rounded-pill border border-accent-soft-border bg-accent-soft-bg px-3 py-1.5 text-micro font-semibold uppercase tracking-[0.28em] text-accent-soft-text">
                  {t('layout.eyebrow')}
                </p>
                <h1 className="mt-6 max-w-xl text-display-l leading-[1.05] tracking-tight text-primary">
                  {t('layout.title')}
                </h1>
                <p className="mt-5 max-w-lg text-body-l leading-7 text-secondary">
                  {t('layout.description')}
                </p>
              </div>

              <div className="max-w-[31rem] rounded-xl border border-border-default bg-surface-1 p-6 shadow-2">
                <p className="text-micro font-semibold uppercase tracking-[0.28em] text-tertiary">
                  {t('layout.stateTitle')}
                </p>
                <div className="mt-5 grid gap-3">
                  {[
                    t('layout.stateOne'),
                    t('layout.stateTwo'),
                    t('layout.stateThree'),
                  ].map((item) => (
                    <div
                      key={item}
                      className="rounded-md border border-border-subtle bg-surface-2 px-4 py-4"
                    >
                      <div className="flex items-start gap-3">
                        <span className="mt-1.5 size-2 rounded-full bg-accent" />
                        <p className="text-body-m leading-6 text-secondary">
                          {item}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* The form column stays visually balanced with the trust panel beside it. */}
          <div className="flex items-center justify-center px-5 py-10 sm:px-8 lg:px-12">
            <div className="w-full max-w-xl rounded-xl border border-border-default bg-surface-1 p-6 shadow-2 sm:p-8">
              <div className="mb-6 flex items-center justify-between gap-4 lg:hidden">
                <Link
                  className="inline-flex items-center rounded-pill border border-glass-border bg-glass-bg px-4 py-2 text-sm font-semibold text-primary shadow-1 backdrop-blur-glass"
                  to={paths.home.getHref()}
                >
                  {commonT('shell.product')}
                </Link>
                <div className="flex items-center gap-3">
                  <ThemeToggle />
                  <LanguageSwitcher
                    tone={theme === 'dark' ? 'dark' : 'light'}
                  />
                </div>
              </div>

              <div className="mb-8 border-b border-border-subtle pb-6">
                <p className="text-micro font-semibold uppercase tracking-[0.28em] text-accent-soft-text">
                  {t('layout.accessLabel')}
                </p>
                <h2 className="mt-4 text-title-1 tracking-tight text-primary sm:text-[2rem] sm:leading-[2.35rem]">
                  {title}
                </h2>
                <p className="mt-3 text-body-m leading-6 text-secondary">
                  {description}
                </p>
                {user.data ? (
                  <p className="mt-4 rounded-md border border-accent-soft-border bg-accent-soft-bg px-4 py-3 text-body-s text-accent-soft-text">
                    {t('layout.signedInAs', {
                      name: getViewerDisplayName(user.data),
                    })}
                  </p>
                ) : null}
              </div>
              {children}
            </div>
          </div>
        </div>
      </div>
    </>
  );
};
