import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';

import { Head } from '@/components/seo';
import { Button } from '@/components/ui/button';
import { LanguageSwitcher } from '@/components/ui/language-switcher';
import { paths } from '@/config/paths';
import { getViewerDisplayName, useCurrentUser } from '@/lib/auth';

const LandingRoute = () => {
  const { t } = useTranslation('common');
  const navigate = useNavigate();
  const { data: user } = useCurrentUser();

  const handleStart = () => {
    if (user) {
      navigate(paths.app.dashboard.getHref());
    } else {
      navigate(paths.auth.login.getHref());
    }
  };

  return (
    <>
      <Head description={t('landing.subtitle')} title={t('landing.title')} />
      <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(191,160,109,0.22),_transparent_35%),linear-gradient(180deg,_#faf7f2_0%,_#f3ece3_100%)]">
        <div className="mx-auto flex min-h-screen max-w-7xl flex-col justify-center px-5 py-16 sm:px-8 lg:px-10">
          <div className="mb-10 flex items-center justify-between gap-4">
            <div className="inline-flex rounded-full border border-stone-300/80 bg-white/75 px-4 py-2 text-xs font-semibold uppercase tracking-[0.34em] text-stone-600 shadow-sm backdrop-blur">
              Ello Bot
            </div>
            <LanguageSwitcher />
          </div>
          <div className="grid items-center gap-12 lg:grid-cols-[1.05fr_0.95fr]">
            <div>
              <h1 className="mt-6 max-w-3xl text-5xl font-semibold tracking-tight text-stone-950 sm:text-6xl">
                {t('landing.headline')}
              </h1>
              <p className="mt-6 max-w-2xl text-lg leading-8 text-stone-600">
                {t('landing.subtitle')}
              </p>
              <div className="mt-10 flex flex-col gap-4 sm:flex-row">
                <Button
                  onClick={handleStart}
                  className="h-12 rounded-2xl px-6 text-base"
                >
                  {user ? t('landing.openWorkspace') : t('landing.register')}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => navigate(paths.auth.login.getHref())}
                  className="h-12 rounded-2xl border-stone-300 bg-white/80 px-6 text-base"
                >
                  {user ? t('landing.viewProfile') : t('landing.login')}
                </Button>
              </div>
              {user ? (
                <p className="mt-6 text-sm text-stone-600">
                  {t('landing.signedInAs', {
                    name: getViewerDisplayName(user),
                  })}
                </p>
              ) : null}
            </div>

            <div className="rounded-[2rem] border border-stone-200/80 bg-white/82 p-6 shadow-[0_50px_120px_-60px_rgba(64,40,19,0.42)] backdrop-blur sm:p-8">
              <div className="grid gap-4">
                <Panel
                  eyebrow={t('landing.panel.auth')}
                  title={t('landing.panel.authTitle')}
                  description={t('landing.panel.authDescription')}
                />
                <Panel
                  eyebrow={t('landing.panel.tenants')}
                  title={t('landing.panel.tenantsTitle')}
                  description={t('landing.panel.tenantsDescription')}
                />
                <Panel
                  eyebrow={t('landing.panel.profile')}
                  title={t('landing.panel.profileTitle')}
                  description={t('landing.panel.profileDescription')}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

type PanelProps = {
  eyebrow: string;
  title: string;
  description: string;
};

const Panel = ({ eyebrow, title, description }: PanelProps) => (
  <div className="rounded-[1.6rem] border border-stone-200 bg-stone-50/80 p-5">
    <p className="text-xs font-semibold uppercase tracking-[0.3em] text-stone-500">
      {eyebrow}
    </p>
    <h2 className="mt-3 text-xl font-semibold text-stone-950">{title}</h2>
    <p className="mt-2 text-sm leading-6 text-stone-600">{description}</p>
  </div>
);

export default LandingRoute;
