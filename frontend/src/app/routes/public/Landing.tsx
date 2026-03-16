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
      navigate(paths.app.overview.getHref());
    } else {
      navigate(paths.auth.register.getHref());
    }
  };

  return (
    <>
      <Head description={t('landing.subtitle')} title={t('landing.title')} />
      <div className="min-h-screen bg-canvas">
        <div className="mx-auto flex min-h-screen max-w-7xl flex-col justify-center px-5 py-16 sm:px-8 lg:px-10">
          <div className="mb-10 flex items-center justify-between gap-4">
            <div className="inline-flex rounded-full border border-border-default/80 bg-surface-2/75 px-4 py-2 text-xs font-semibold uppercase tracking-[0.34em] text-secondary shadow-sm backdrop-blur">
              {t('shell.product')}
            </div>
            <LanguageSwitcher />
          </div>
          <div className="grid items-center gap-12 lg:grid-cols-[1.05fr_0.95fr]">
            <div>
              <h1 className="mt-6 max-w-3xl text-5xl font-semibold tracking-tight text-primary sm:text-6xl">
                {t('landing.headline')}
              </h1>
              <p className="mt-6 max-w-2xl text-lg leading-8 text-secondary">
                {t('landing.subtitle')}
              </p>
              <div className="mt-10 flex flex-col gap-4 sm:flex-row">
                <Button
                  onClick={handleStart}
                  className="h-12 rounded-sm px-6 text-base"
                >
                  {user ? t('landing.openWorkspace') : t('landing.register')}
                </Button>
                <Button
                  variant="outline"
                  onClick={() =>
                    navigate(
                      user
                        ? paths.app.profile.getHref()
                        : paths.auth.login.getHref(),
                    )
                  }
                  className="h-12 rounded-sm border-border-default bg-surface-2 px-6 text-base"
                >
                  {user ? t('landing.viewProfile') : t('landing.login')}
                </Button>
              </div>
              {user ? (
                <p className="mt-6 text-sm text-secondary">
                  {t('landing.signedInAs', {
                    name: getViewerDisplayName(user),
                  })}
                </p>
              ) : null}
            </div>

            <div className="rounded-md border border-border-default/80 bg-surface-2/82 p-6 shadow-[0_50px_120px_-60px_rgba(64,40,19,0.42)] backdrop-blur sm:p-8">
              <div className="grid gap-4">
                <Panel
                  eyebrow={t('landing.panel.auth')}
                  title={t('landing.panel.authTitle')}
                  description={t('landing.panel.authDescription')}
                />
                <Panel
                  eyebrow={t('landing.panel.settings')}
                  title={t('landing.panel.settingsTitle')}
                  description={t('landing.panel.settingsDescription')}
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
  <div className="rounded-md border border-border-default bg-surface-3 p-5">
    <p className="text-xs font-semibold uppercase tracking-[0.3em] text-tertiary">
      {eyebrow}
    </p>
    <h2 className="mt-3 text-xl font-semibold text-primary">{title}</h2>
    <p className="mt-2 text-sm leading-6 text-secondary">{description}</p>
  </div>
);

export default LandingRoute;
