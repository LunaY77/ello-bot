import {
  ChevronLeft,
  ChevronRight,
  LogOut,
  MonitorSmartphone,
  PanelLeft,
  Settings,
  ShieldCheck,
  UserRound,
  type LucideIcon,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { NavLink, useNavigation } from 'react-router';

import { Button } from '@/components/ui/button';
import { LanguageSwitcher } from '@/components/ui/language-switcher';
import { Link } from '@/components/ui/link';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { paths } from '@/config/paths';
import {
  getViewerAvatarUrl,
  getViewerDisplayName,
  getViewerHandle,
  useCurrentUser,
  useLogout,
} from '@/lib/auth';
import { cn } from '@/utils/cn';

type NavigationItem = {
  name: string;
  to: string;
  icon: LucideIcon;
};

const Logo = ({ collapsed, label }: { collapsed?: boolean; label: string }) => {
  return (
    <Link
      className={cn(
        'inline-flex items-center font-bold text-primary transition-all duration-base',
        collapsed ? 'w-full justify-center text-xl' : 'px-2 text-xl',
      )}
      to={paths.home.getHref()}
    >
      {collapsed ? `${label.charAt(0)}.` : label}
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
    if (state !== 'loading') {
      return;
    }

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

  if (state !== 'loading') {
    return null;
  }

  return (
    <div
      className="fixed left-0 top-0 z-50 h-1 rounded-r-pill bg-accent transition-all duration-base ease-out"
      style={{ width: `${progress}%` }}
    />
  );
};

type SidebarContentProps = {
  collapsed: boolean;
  items: NavigationItem[];
  onItemClick?: () => void;
  productLabel: string;
  profileLabel: string;
  handle?: string;
};

const SidebarContent = ({
  collapsed,
  items,
  onItemClick,
  productLabel,
  profileLabel,
  handle,
}: SidebarContentProps) => {
  return (
    <div className="flex h-full flex-col justify-between py-6">
      <div className="px-4">
        <div className="mb-6 flex h-[32px] items-center">
          <Logo collapsed={collapsed} label={productLabel} />
        </div>

        <nav className="flex flex-col gap-2">
          {items.map((item) => (
            <NavLink
              key={item.name}
              to={item.to}
              onClick={onItemClick}
              className={({ isActive }) =>
                cn(
                  'group flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors duration-fast ease-out',
                  isActive
                    ? 'bg-accent-soft-bg font-semibold text-accent-soft-text'
                    : 'text-secondary hover:bg-surface-3 hover:text-primary',
                  collapsed && 'justify-center px-0',
                )
              }
              title={collapsed ? item.name : undefined}
            >
              <item.icon
                className={cn('shrink-0', collapsed ? 'size-6' : 'size-5')}
                aria-hidden="true"
              />
              {!collapsed ? (
                <span className="truncate">{item.name}</span>
              ) : null}
            </NavLink>
          ))}
        </nav>
      </div>

      {!collapsed ? (
        <div className="px-4">
          <div className="rounded-lg border border-border-default bg-surface-2 p-4">
            <p className="text-micro font-semibold uppercase tracking-[0.22em] text-tertiary">
              {profileLabel}
            </p>
            <p className="mt-3 text-sm font-medium text-primary">
              {handle ?? productLabel}
            </p>
          </div>
        </div>
      ) : null}
    </div>
  );
};

export const AppShellLayout = ({ children }: { children: React.ReactNode }) => {
  const { t } = useTranslation('common');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const logout = useLogout();
  const viewer = useCurrentUser().data;
  const avatarUrl = getViewerAvatarUrl(viewer);
  const displayName = getViewerDisplayName(viewer);
  const handle = getViewerHandle(viewer);

  const navItems: NavigationItem[] = [
    {
      name: t('nav.overview'),
      to: paths.app.overview.getHref(),
      icon: ShieldCheck,
    },
    {
      name: t('nav.profile'),
      to: paths.app.profile.getHref(),
      icon: UserRound,
    },
    {
      name: t('nav.settings'),
      to: paths.app.settings.getHref(),
      icon: Settings,
    },
    {
      name: t('nav.sessions'),
      to: paths.app.sessions.getHref(),
      icon: MonitorSmartphone,
    },
  ];

  return (
    <div className="flex min-h-screen bg-canvas text-primary">
      <Progress />

      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-20 hidden border-r border-border-default bg-surface-1 transition-all duration-base lg:flex lg:flex-col',
          collapsed ? 'w-[72px]' : 'w-[280px]',
        )}
      >
        <SidebarContent
          collapsed={collapsed}
          items={navItems}
          productLabel={t('shell.product')}
          profileLabel={t('shell.account')}
          handle={handle}
        />

        <button
          onClick={() => setCollapsed(!collapsed)}
          className="absolute -right-3 top-8 z-50 flex h-6 w-6 cursor-pointer items-center justify-center rounded-full border border-border-default bg-surface-2 text-tertiary shadow-1 transition-colors hover:text-primary"
        >
          {collapsed ? (
            <ChevronRight className="size-3" />
          ) : (
            <ChevronLeft className="size-3" />
          )}
        </button>
      </aside>

      <div
        className={cn(
          'flex min-h-screen flex-1 flex-col transition-all duration-base',
          collapsed ? 'lg:pl-[72px]' : 'lg:pl-[280px]',
        )}
      >
        <header className="sticky top-0 z-30 h-[64px] border-b border-glass-border bg-glass-bg backdrop-blur-[20px]">
          <div className="flex h-full items-center justify-between px-4 sm:px-6">
            <div className="flex items-center gap-4">
              <Button
                size="icon"
                variant="outline"
                className="rounded-md border-border-default bg-transparent lg:hidden"
                onClick={() => setMobileMenuOpen(true)}
              >
                <PanelLeft className="size-5" />
                <span className="sr-only">{t('shell.toggleMenu')}</span>
              </Button>

              <div className="hidden items-center gap-2 text-sm font-medium sm:flex">
                <span className="text-secondary">{t('shell.account')}</span>
                <span className="text-tertiary">/</span>
                <span className="text-primary">{displayName}</span>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <ThemeToggle compact className="sm:hidden" />
              <ThemeToggle className="hidden sm:inline-flex" />
              <LanguageSwitcher className="hidden sm:inline-flex" />
              <div className="mx-1 hidden h-6 w-px bg-border-strong sm:block" />

              <div className="flex items-center gap-3">
                <div className="hidden text-right sm:block">
                  <p className="text-sm font-medium text-primary">
                    {displayName}
                  </p>
                  <p className="text-xs text-tertiary">{handle}</p>
                </div>

                <div className="group relative cursor-pointer">
                  {avatarUrl ? (
                    <img
                      src={avatarUrl}
                      alt={displayName}
                      className="size-9 rounded-md object-cover ring-1 ring-border-default transition group-hover:ring-accent"
                    />
                  ) : (
                    <div className="flex size-9 items-center justify-center rounded-md bg-surface-3 text-sm font-medium text-primary ring-1 ring-border-default transition group-hover:ring-accent">
                      {(displayName || t('shell.product'))
                        .charAt(0)
                        .toUpperCase()}
                    </div>
                  )}

                  <div className="invisible absolute right-0 top-full mt-2 w-48 rounded-md border border-border-default bg-elevated p-1 opacity-0 shadow-2 transition-all group-hover:visible group-hover:opacity-100">
                    <button
                      onClick={() => logout.mutate(undefined)}
                      className="flex w-full cursor-pointer items-center gap-2 rounded px-3 py-2 text-sm text-danger transition-colors hover:bg-surface-3"
                    >
                      <LogOut className="size-4" />
                      {t('shell.logout')}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </header>

        {mobileMenuOpen ? (
          <div className="fixed inset-0 z-40 lg:hidden">
            <div
              className="absolute inset-0 bg-overlay backdrop-blur-sm transition-opacity"
              onClick={() => setMobileMenuOpen(false)}
            />
            <div className="absolute inset-y-0 left-0 w-[280px] bg-surface-1 shadow-2">
              <SidebarContent
                collapsed={false}
                items={navItems}
                onItemClick={() => setMobileMenuOpen(false)}
                productLabel={t('shell.product')}
                profileLabel={t('shell.account')}
                handle={handle}
              />
            </div>
          </div>
        ) : null}

        <main className="w-full flex-1 overflow-x-hidden bg-surface-1 p-4 pb-12 sm:p-6">
          {children}
        </main>
      </div>
    </div>
  );
};
