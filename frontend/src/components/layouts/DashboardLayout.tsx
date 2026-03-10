import {
  BadgeCheck,
  Home,
  LogOut,
  PanelLeft,
  ShieldCheck,
  User2,
  Users,
  type LucideIcon,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { NavLink, useNavigation } from 'react-router';

import { Button } from '@/components/ui/button';
import { LanguageSwitcher } from '@/components/ui/language-switcher';
import { Link } from '@/components/ui/link';
import { paths } from '@/config/paths';
import {
  getViewerAvatarUrl,
  getViewerDisplayName,
  getViewerHandle,
  useCurrentUser,
  useLogout,
} from '@/lib/auth';
import { cn } from '@/utils/cn';

type SideNavigationItem = {
  name: string;
  to: string;
  icon: LucideIcon;
};

const Logo = () => {
  return (
    <Link
      className="inline-flex items-center rounded-full border border-stone-500/30 bg-white/10 px-4 py-2 text-sm font-semibold text-white"
      to={paths.home.getHref()}
    >
      Ello
    </Link>
  );
};

const Progress = () => {
  const { state, location } = useNavigation();
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    setProgress(0);
  }, [location?.pathname]);

  useEffect(() => {
    if (state !== 'loading') return;

    const timer = setInterval(() => {
      setProgress((value) => {
        if (value >= 100) {
          clearInterval(timer);
          return 100;
        }

        return Math.min(value + 12, 100);
      });
    }, 220);

    return () => {
      clearInterval(timer);
    };
  }, [state]);

  if (state !== 'loading') return null;

  return (
    <div
      className="fixed left-0 top-0 z-50 h-1 rounded-r-full bg-primary transition-all duration-200 ease-in-out"
      style={{ width: `${progress}%` }}
    />
  );
};

type SidebarContentProps = {
  navigation: SideNavigationItem[];
  onItemClick?: () => void;
};

const SidebarContent = ({ navigation, onItemClick }: SidebarContentProps) => {
  const { t } = useTranslation('common');
  const viewer = useCurrentUser().data;
  const avatarUrl = getViewerAvatarUrl(viewer);
  const displayName = getViewerDisplayName(viewer);
  const handle = getViewerHandle(viewer);

  return (
    <div className="flex h-full flex-col justify-between gap-8 px-5 py-6">
      <div>
        <Logo />
        <div className="mt-8 rounded-[1.8rem] border border-white/10 bg-white/10 p-5 text-white backdrop-blur">
          <div className="flex items-center gap-4">
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt={displayName}
                className="size-12 rounded-2xl object-cover"
              />
            ) : (
              <div className="flex size-12 items-center justify-center rounded-2xl bg-white/15 text-lg font-semibold">
                {displayName.charAt(0).toUpperCase()}
              </div>
            )}
            <div className="min-w-0">
              <p className="truncate text-base font-semibold">{displayName}</p>
              <p className="truncate text-sm text-stone-300">{handle}</p>
            </div>
          </div>
          {viewer ? (
            <div className="mt-4 rounded-2xl bg-black/15 px-4 py-3 text-sm text-stone-200">
              <div className="flex items-center gap-2">
                <BadgeCheck className="size-4" />
                {viewer.tenant.name}
              </div>
              <div className="mt-1 text-xs uppercase tracking-[0.22em] text-stone-400">
                {viewer.principal.principalType}
              </div>
            </div>
          ) : null}
        </div>

        <nav className="mt-8 flex flex-col gap-2">
          {navigation.map((item) => (
            <NavLink
              key={item.name}
              to={item.to}
              end
              onClick={onItemClick}
              className={({ isActive }) =>
                cn(
                  'group flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium text-stone-300 transition',
                  'hover:bg-white/10 hover:text-white',
                  isActive && 'bg-white text-stone-950 shadow-sm',
                )
              }
            >
              <item.icon className="size-4 shrink-0" aria-hidden="true" />
              {item.name}
            </NavLink>
          ))}
        </nav>
      </div>

      <div className="rounded-[1.8rem] border border-white/10 bg-white/5 p-5 text-sm text-stone-300">
        <div className="flex items-center gap-2 text-white">
          <ShieldCheck className="size-4" />
          {t('shell.security')}
        </div>
        <p className="mt-2 leading-6 text-stone-300/90">
          {t('shell.securityHint')}
        </p>
      </div>
    </div>
  );
};

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { t } = useTranslation('common');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const logout = useLogout();
  const viewer = useCurrentUser().data;
  const avatarUrl = getViewerAvatarUrl(viewer);
  const displayName = getViewerDisplayName(viewer);
  const handle = getViewerHandle(viewer);

  const navigation: SideNavigationItem[] = [
    { name: t('shell.overview'), to: paths.app.dashboard.getHref(), icon: Home },
    { name: t('shell.people'), to: paths.app.users.getHref(), icon: Users },
    { name: t('shell.access'), to: paths.app.iam.getHref(), icon: ShieldCheck },
    { name: t('shell.profile'), to: paths.app.profile.getHref(), icon: User2 },
  ];

  return (
    <div className="min-h-screen bg-transparent">
      <Progress />

      <aside className="fixed inset-y-0 left-0 z-20 hidden w-72 border-r border-stone-900/5 bg-[#1f1914] shadow-[30px_0_80px_-60px_rgba(0,0,0,0.8)] lg:flex">
        <SidebarContent navigation={navigation} />
      </aside>

      <div className="lg:pl-72">
        <header className="sticky top-0 z-30 border-b border-stone-200/70 bg-[#f7f3ed]/90 backdrop-blur">
          <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
            <div className="flex items-center gap-3">
              <Button
                size="icon"
                variant="outline"
                className="rounded-2xl border-stone-300 bg-white/80 lg:hidden"
                onClick={() => setMobileMenuOpen(true)}
              >
                <PanelLeft className="size-5" />
                <span className="sr-only">{t('shell.toggleMenu')}</span>
              </Button>

              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.3em] text-stone-500">
                  {t('shell.workspace')}
                </p>
                <p className="mt-1 text-sm font-medium text-stone-900">
                  {viewer?.tenant.name ?? 'Ello'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="hidden rounded-2xl border border-stone-200 bg-white/75 px-4 py-2 text-right shadow-sm sm:block">
                <p className="text-sm font-semibold text-stone-900">
                  {displayName}
                </p>
                <p className="text-xs uppercase tracking-[0.18em] text-stone-500">
                  {handle}
                </p>
              </div>

              <LanguageSwitcher className="hidden sm:inline-flex" />

              <Button
                asChild
                variant="outline"
                className="rounded-2xl border-stone-300 bg-white/80"
              >
                <Link to={paths.app.profile.getHref()}>{t('shell.profile')}</Link>
              </Button>

              <Button
                variant="ghost"
                className="rounded-2xl text-stone-700 hover:bg-stone-200/70"
                icon={<LogOut className="size-4" />}
                isLoading={logout.isPending}
                onClick={() => logout.mutate(undefined)}
              >
                {t('shell.logout')}
              </Button>

              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt={displayName}
                  className="size-11 rounded-2xl object-cover shadow-sm"
                />
              ) : (
                <div className="flex size-11 items-center justify-center rounded-2xl bg-stone-200 font-semibold text-stone-900">
                  {displayName.charAt(0).toUpperCase()}
                </div>
              )}
            </div>
          </div>
        </header>

        {mobileMenuOpen ? (
          <div className="fixed inset-0 z-40 lg:hidden">
            <div
              className="absolute inset-0 bg-stone-950/45"
              onClick={() => setMobileMenuOpen(false)}
            />
            <div className="absolute inset-y-0 left-0 w-72 bg-[#1f1914]">
              <SidebarContent
                navigation={navigation}
                onItemClick={() => setMobileMenuOpen(false)}
              />
              <div className="absolute bottom-6 left-5 right-5 lg:hidden">
                <LanguageSwitcher tone="dark" className="w-full" />
              </div>
            </div>
          </div>
        ) : null}

        <main className="mx-auto max-w-7xl px-4 pb-8 sm:px-6 lg:px-8">
          {children}
        </main>
      </div>
    </div>
  );
}
