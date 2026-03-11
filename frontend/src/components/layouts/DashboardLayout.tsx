import {
  Bot,
  Building2,
  ChevronLeft,
  ChevronRight,
  Database,
  KeySquare,
  LogOut,
  MonitorSmartphone,
  PanelLeft,
  Search,
  Settings,
  ShieldCheck,
  ShieldUser,
  Users,
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

type SideNavigationItem = {
  name: string;
  to: string;
  icon: LucideIcon;
  badge?: string | number;
};

type NavSection = {
  title?: string;
  items: SideNavigationItem[];
};

const Logo = ({ collapsed, label }: { collapsed?: boolean; label: string }) => {
  return (
    <Link
      className={cn(
        'inline-flex items-center font-bold text-primary transition-all duration-base',
        collapsed ? 'justify-center w-full text-xl' : 'text-xl px-2',
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
      className="fixed left-0 top-0 z-50 h-1 rounded-r-pill bg-accent transition-all duration-base ease-out"
      style={{ width: `${progress}%` }}
    />
  );
};

type SidebarContentProps = {
  sections: NavSection[];
  collapsed: boolean;
  workspaceName?: string;
  workspaceSlug?: string;
  workspaceLabel: string;
  productLabel: string;
  onItemClick?: () => void;
};

const SidebarContent = ({
  sections,
  collapsed,
  workspaceName,
  workspaceSlug,
  workspaceLabel,
  productLabel,
  onItemClick,
}: SidebarContentProps) => {
  return (
    <div className="flex h-full flex-col justify-between py-6">
      <div className="px-4">
        <div className="flex items-center h-[32px] mb-6">
          <Logo collapsed={collapsed} label={productLabel} />
        </div>

        <nav className="flex flex-col gap-6">
          {sections.map((section, idx) => (
            <div key={idx} className="flex flex-col gap-1">
              {!collapsed && section.title && (
                <div className="px-3 pb-2 text-micro font-semibold tracking-wider text-tertiary uppercase">
                  {section.title}
                </div>
              )}
              {section.items.map((item) => (
                <NavLink
                  key={item.name}
                  to={item.to}
                  onClick={onItemClick}
                  className={({ isActive }) =>
                    cn(
                      'group flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors duration-fast ease-out',
                      isActive
                        ? 'bg-accent-soft-bg text-accent-soft-text font-semibold'
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
                  {!collapsed && (
                    <span className="flex-1 truncate">{item.name}</span>
                  )}
                  {!collapsed && item.badge && (
                    <span className="inline-flex items-center justify-center rounded-pill bg-surface-3 px-2 py-0.5 text-micro font-medium text-tertiary">
                      {item.badge}
                    </span>
                  )}
                </NavLink>
              ))}
            </div>
          ))}
        </nav>
      </div>

      {!collapsed && (
        <div className="px-4">
          <div className="rounded-lg border border-border-default bg-surface-2 p-4">
            <div className="flex items-center gap-2 text-primary font-medium text-sm">
              <Database className="size-4 text-accent" />
              {workspaceLabel}
            </div>
            <p className="mt-1 text-xs text-tertiary truncate">
              {workspaceName ?? workspaceSlug ?? productLabel}
            </p>
            {workspaceSlug ? (
              <p className="mt-1 text-micro uppercase tracking-[0.22em] text-tertiary">
                {workspaceSlug}
              </p>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
};

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { t } = useTranslation('common');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  const logout = useLogout();
  const viewer = useCurrentUser().data;
  const avatarUrl = getViewerAvatarUrl(viewer);
  const displayName = getViewerDisplayName(viewer);
  const handle = getViewerHandle(viewer);

  // Navigation stays aligned with the information architecture instead of per-page ad hoc links.
  const navSections: NavSection[] = [
    {
      title: t('nav.primary'),
      items: [
        {
          name: t('nav.assistant'),
          to: paths.app.dashboard.getHref(),
          icon: Bot,
        },
      ],
    },
    {
      title: t('nav.admin'),
      items: [
        {
          name: t('nav.sessions'),
          to: paths.app.sessions.getHref(),
          icon: MonitorSmartphone,
        },
        { name: t('nav.users'), to: paths.app.users.getHref(), icon: Users },
        {
          name: t('nav.roles'),
          to: paths.app.roles.getHref(),
          icon: ShieldCheck,
        },
        {
          name: t('nav.permissions'),
          to: paths.app.permissions.getHref(),
          icon: KeySquare,
        },
        {
          name: t('nav.agents'),
          to: paths.app.agents.getHref(),
          icon: ShieldUser,
        },
      ],
    },
    {
      title: t('nav.preferences'),
      items: [
        {
          name: t('nav.workspaces'),
          to: paths.app.workspaces.getHref(),
          icon: Building2,
        },
        {
          name: t('nav.settings'),
          to: paths.app.profile.getHref(),
          icon: Settings,
        },
      ],
    },
  ];

  return (
    <div className="min-h-screen bg-canvas text-primary flex">
      <Progress />

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-20 hidden border-r border-border-default bg-surface-1 transition-all duration-base lg:flex flex-col',
          collapsed ? 'w-[72px]' : 'w-[280px]',
        )}
      >
        <SidebarContent
          sections={navSections}
          collapsed={collapsed}
          workspaceLabel={t('shell.workspace')}
          productLabel={t('shell.product')}
          workspaceName={viewer?.tenant.name}
          workspaceSlug={viewer?.tenant.slug}
        />

        {/* Collapse toggle */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="absolute -right-3 top-8 flex h-6 w-6 items-center justify-center rounded-full border border-border-default bg-surface-2 text-tertiary hover:text-primary transition-colors cursor-pointer z-50 shadow-1"
        >
          {collapsed ? (
            <ChevronRight className="size-3" />
          ) : (
            <ChevronLeft className="size-3" />
          )}
        </button>
      </aside>

      {/* Main Container */}
      <div
        className={cn(
          'flex-1 flex flex-col min-h-screen transition-all duration-base',
          collapsed ? 'lg:pl-[72px]' : 'lg:pl-[280px]',
        )}
      >
        {/* TopBar */}
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

              {/* The top bar stays intentionally lightweight so the active page content remains primary. */}
              <div className="hidden sm:flex items-center gap-2 text-sm font-medium">
                <span className="text-secondary">{t('shell.workspace')}</span>
                <span className="text-tertiary">/</span>
                <span className="text-primary">
                  {viewer?.tenant.name ?? t('shell.product')}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <ThemeToggle compact className="sm:hidden" />

              <button className="text-tertiary hover:text-primary transition-colors cursor-pointer">
                <Search className="size-5" />
                <span className="sr-only">{t('search')}</span>
              </button>

              <ThemeToggle className="hidden sm:inline-flex" />

              <LanguageSwitcher className="hidden sm:inline-flex" />

              <div className="h-6 w-px bg-border-strong mx-1 hidden sm:block" />

              <div className="flex items-center gap-3">
                <div className="hidden text-right sm:block">
                  <p className="text-sm font-medium text-primary">
                    {displayName}
                  </p>
                  <p className="text-xs text-tertiary">{handle}</p>
                </div>

                <div className="relative group cursor-pointer">
                  {avatarUrl ? (
                    <img
                      src={avatarUrl}
                      alt={displayName}
                      className="size-9 rounded-md object-cover ring-1 ring-border-default group-hover:ring-accent transition"
                    />
                  ) : (
                    <div className="flex size-9 items-center justify-center rounded-md bg-surface-3 text-sm font-medium text-primary ring-1 ring-border-default group-hover:ring-accent transition">
                      {(displayName || t('shell.product'))
                        .charAt(0)
                        .toUpperCase()}
                    </div>
                  )}

                  {/* Keep account actions small and local; destructive actions stay visible. */}
                  <div className="absolute right-0 top-full mt-2 w-48 rounded-md border border-border-default bg-elevated p-1 shadow-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all">
                    <button
                      onClick={() => logout.mutate(undefined)}
                      className="flex w-full items-center gap-2 rounded px-3 py-2 text-sm text-danger hover:bg-surface-3 transition-colors cursor-pointer"
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

        {/* Mobile menu */}
        {mobileMenuOpen && (
          <div className="fixed inset-0 z-40 lg:hidden">
            <div
              className="absolute inset-0 bg-overlay backdrop-blur-sm transition-opacity"
              onClick={() => setMobileMenuOpen(false)}
            />
            <div className="absolute inset-y-0 left-0 w-[280px] bg-surface-1 shadow-2">
              <SidebarContent
                sections={navSections}
                collapsed={false}
                workspaceLabel={t('shell.workspace')}
                productLabel={t('shell.product')}
                workspaceName={viewer?.tenant.name}
                workspaceSlug={viewer?.tenant.slug}
                onItemClick={() => setMobileMenuOpen(false)}
              />
            </div>
          </div>
        )}

        {/* Main Content Area */}
        <main className="flex-1 w-full overflow-x-hidden bg-surface-1 p-4 pb-12 sm:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
