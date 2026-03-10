import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useSearchParams } from 'react-router';

import { Head } from '@/components/seo';
import { LanguageSwitcher } from '@/components/ui/language-switcher';
import { Link } from '@/components/ui/link';
import { paths } from '@/config/paths';
import { getViewerDisplayName, useCurrentUser } from '@/lib/auth';

type LayoutProps = {
  children: React.ReactNode;
  title: string;
  description: string;
};

export const AuthLayout = ({ children, title, description }: LayoutProps) => {
  const { t } = useTranslation('auth');
  const user = useCurrentUser();
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
      <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(191,160,109,0.22),_transparent_38%),linear-gradient(180deg,_#f7f3ed_0%,_#f5efe7_100%)]">
        <div className="mx-auto grid min-h-screen max-w-7xl lg:grid-cols-[1.05fr_0.95fr]">
          <div className="hidden flex-col justify-between border-r border-stone-200/70 px-10 py-10 lg:flex">
            <div>
              <div className="flex items-center justify-between gap-4">
                <Link
                  className="inline-flex items-center rounded-full border border-stone-300/70 bg-white/80 px-4 py-2 text-sm font-semibold text-stone-900 shadow-sm backdrop-blur"
                  to={paths.home.getHref()}
                >
                  Ello
                </Link>
                <LanguageSwitcher />
              </div>
            </div>

            <div className="max-w-xl">
              <p className="text-xs font-semibold uppercase tracking-[0.36em] text-stone-500">
                {t('layout.eyebrow')}
              </p>
              <h1 className="mt-5 text-5xl font-semibold leading-[1.05] tracking-tight text-stone-950">
                {t('layout.title')}
              </h1>
              <p className="mt-6 max-w-lg text-base leading-7 text-stone-600">
                {t('layout.description')}
              </p>
            </div>

            <div className="rounded-[2rem] border border-stone-200 bg-white/80 p-6 shadow-[0_30px_80px_-40px_rgba(36,24,12,0.45)] backdrop-blur">
              <p className="text-sm font-medium text-stone-500">
                {t('layout.stateTitle')}
              </p>
              <div className="mt-4 grid gap-3 text-sm text-stone-700">
                <div className="rounded-2xl bg-stone-50 px-4 py-3">
                  {t('layout.stateOne')}
                </div>
                <div className="rounded-2xl bg-stone-50 px-4 py-3">
                  {t('layout.stateTwo')}
                </div>
                <div className="rounded-2xl bg-stone-50 px-4 py-3">
                  {t('layout.stateThree')}
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-center px-5 py-10 sm:px-8 lg:px-12">
            <div className="w-full max-w-xl rounded-[2rem] border border-stone-200/80 bg-white/88 p-6 shadow-[0_40px_100px_-48px_rgba(56,34,17,0.45)] backdrop-blur sm:p-8">
              <div className="mb-6 flex items-center justify-between gap-4 lg:hidden">
                <Link
                  className="inline-flex items-center rounded-full border border-stone-300/70 bg-white/80 px-4 py-2 text-sm font-semibold text-stone-900 shadow-sm backdrop-blur"
                  to={paths.home.getHref()}
                >
                  Ello
                </Link>
                <LanguageSwitcher />
              </div>
              <div className="mb-8">
                <p className="text-xs font-semibold uppercase tracking-[0.32em] text-stone-500">
                  Ello Access
                </p>
                <h2 className="mt-3 text-3xl font-semibold tracking-tight text-stone-950">
                  {title}
                </h2>
                <p className="mt-3 text-sm leading-6 text-stone-600">
                  {description}
                </p>
                {user.data ? (
                  <p className="mt-4 rounded-2xl bg-stone-100 px-4 py-3 text-sm text-stone-700">
                    Signed in as {getViewerDisplayName(user.data)}
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
