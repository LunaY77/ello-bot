/**
 * DashboardLayout 仪表盘布局组件
 *
 * 功能说明：
 * 为应用主界面提供统一的布局结构，包含：
 * - 左侧导航栏（桌面端）
 * - 顶部导航栏（移动端）
 * - 用户菜单
 * - 页面加载进度条
 *
 * 特性：
 * - 响应式设计，适配桌面和移动端
 * - 基于角色的导航项显示
 * - 路由切换时的加载进度指示
 */

import { Home, PanelLeft, Users, User2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { NavLink, useNavigate, useNavigation } from 'react-router';

import { Button } from '@/components/ui/button';
import { paths } from '@/config/paths';
import { useLogout } from '@/lib/auth';
import { ROLES, useAuthorization } from '@/lib/authorization';
import { cn } from '@/utils/cn';

import { Link } from '../ui/link';

/**
 * 导航项类型定义
 */
type SideNavigationItem = {
  /** 导航项名称 */
  name: string;
  /** 导航目标路径 */
  to: string;
  /** 导航图标组件 */
  icon: (props: React.SVGProps<SVGSVGElement>) => JSX.Element;
};

/**
 * Logo 组件
 * 显示应用 Logo 和名称
 */
const Logo = () => {
  return (
    <Link className="flex items-center text-white" to={paths.home.getHref()}>
      <span className="text-xl font-bold text-white">Ello</span>
    </Link>
  );
};

/**
 * Progress 进度条组件
 * 在路由切换时显示加载进度
 */
const Progress = () => {
  const { state, location } = useNavigation();
  const [progress, setProgress] = useState(0);

  /**
   * 路由变化时重置进度
   */
  useEffect(() => {
    setProgress(0);
  }, [location?.pathname]);

  /**
   * 加载状态时模拟进度增长
   */
  useEffect(() => {
    if (state === 'loading') {
      const timer = setInterval(() => {
        setProgress((oldProgress) => {
          if (oldProgress === 100) {
            clearInterval(timer);
            return 100;
          }
          const newProgress = oldProgress + 10;
          return newProgress > 100 ? 100 : newProgress;
        });
      }, 300);

      return () => {
        clearInterval(timer);
      };
    }
  }, [state]);

  if (state !== 'loading') {
    return null;
  }

  return (
    <div
      className="fixed left-0 top-0 h-1 bg-blue-500 transition-all duration-200 ease-in-out"
      style={{ width: `${progress}%` }}
    />
  );
};

/**
 * DashboardLayout 仪表盘布局组件
 *
 * @param children - 页面内容
 *
 * @example
 * <DashboardLayout>
 *   <ContentLayout title="仪表盘">
 *     <DashboardContent />
 *   </ContentLayout>
 * </DashboardLayout>
 */
export function DashboardLayout({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();
  const logout = useLogout({
    onSuccess: () => navigate(paths.auth.login.getHref(location.pathname)),
  });
  const { checkAccess } = useAuthorization();

  /**
   * 移动端菜单状态
   */
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  /**
   * 导航项配置
   * 根据用户角色动态生成导航项
   */
  const navigation = [
    { name: '仪表盘', to: paths.app.dashboard.getHref(), icon: Home },
    checkAccess({ allowedRoles: [ROLES.ADMIN] }) && {
      name: '用户管理',
      to: paths.app.users.getHref(),
      icon: Users,
    },
  ].filter(Boolean) as SideNavigationItem[];

  return (
    <div className="flex min-h-screen w-full flex-col bg-muted/40">
      {/* 桌面端侧边栏 */}
      <aside className="fixed inset-y-0 left-0 z-10 hidden w-60 flex-col border-r bg-black sm:flex">
        <nav className="flex flex-col items-center gap-4 px-2 py-4">
          <div className="flex h-16 shrink-0 items-center px-4">
            <Logo />
          </div>
          {navigation.map((item) => (
            <NavLink
              key={item.name}
              to={item.to}
              end
              className={({ isActive }) =>
                cn(
                  'text-gray-300 hover:bg-gray-700 hover:text-white',
                  'group flex flex-1 w-full items-center rounded-md p-2 text-base font-medium',
                  isActive && 'bg-gray-900 text-white',
                )
              }
            >
              <item.icon
                className={cn(
                  'text-gray-400 group-hover:text-gray-300',
                  'mr-4 size-6 shrink-0',
                )}
                aria-hidden="true"
              />
              {item.name}
            </NavLink>
          ))}
        </nav>
      </aside>

      {/* 主内容区域 */}
      <div className="flex flex-col sm:gap-4 sm:py-4 sm:pl-60">
        {/* 顶部导航栏 */}
        <header className="sticky top-0 z-30 flex h-14 items-center justify-between gap-4 border-b bg-background px-4 sm:static sm:h-auto sm:justify-end sm:border-0 sm:bg-transparent sm:px-6">
          <Progress />

          {/* 移动端菜单按钮 */}
          <Button
            size="icon"
            variant="outline"
            className="sm:hidden"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            <PanelLeft className="size-5" />
            <span className="sr-only">切换菜单</span>
          </Button>

          {/* 用户菜单 */}
          <div className="relative">
            <Button
              variant="outline"
              size="icon"
              className="overflow-hidden rounded-full"
              onClick={() => navigate(paths.app.profile.getHref())}
            >
              <span className="sr-only">打开用户菜单</span>
              <User2 className="size-6 rounded-full" />
            </Button>
          </div>
        </header>

        {/* 移动端导航菜单 */}
        {mobileMenuOpen && (
          <div className="fixed inset-0 z-40 sm:hidden">
            <div
              className="fixed inset-0 bg-black/50"
              onClick={() => setMobileMenuOpen(false)}
            />
            <nav className="fixed inset-y-0 left-0 w-60 bg-black pt-10 text-white">
              <div className="flex h-16 shrink-0 items-center px-4">
                <Logo />
              </div>
              {navigation.map((item) => (
                <NavLink
                  key={item.name}
                  to={item.to}
                  end
                  onClick={() => setMobileMenuOpen(false)}
                  className={({ isActive }) =>
                    cn(
                      'text-gray-300 hover:bg-gray-700 hover:text-white',
                      'group flex w-full items-center rounded-md p-2 text-base font-medium',
                      isActive && 'bg-gray-900 text-white',
                    )
                  }
                >
                  <item.icon
                    className={cn(
                      'text-gray-400 group-hover:text-gray-300',
                      'mr-4 size-6 shrink-0',
                    )}
                    aria-hidden="true"
                  />
                  {item.name}
                </NavLink>
              ))}
              <div className="mt-4 px-2">
                <Button
                  variant="outline"
                  className="w-full text-white"
                  onClick={() => logout.mutate({})}
                >
                  退出登录
                </Button>
              </div>
            </nav>
          </div>
        )}

        {/* 页面内容 */}
        <main className="grid flex-1 items-start gap-4 p-4 sm:px-6 sm:py-0 md:gap-8">
          {children}
        </main>
      </div>
    </div>
  );
}
