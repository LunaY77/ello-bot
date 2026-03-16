const withRedirect = (basePath: string, redirectTo?: string | null) =>
  redirectTo
    ? `${basePath}?redirectTo=${encodeURIComponent(redirectTo)}`
    : basePath;

export const paths = {
  home: {
    path: '/',
    getHref: () => '/',
  },
  auth: {
    login: {
      path: '/auth/login',
      getHref: (redirectTo?: string | null) =>
        withRedirect('/auth/login', redirectTo),
    },
    register: {
      path: '/auth/register',
      getHref: (redirectTo?: string | null) =>
        withRedirect('/auth/register', redirectTo),
    },
  },
  app: {
    root: {
      path: '/app',
      getHref: () => '/app',
    },
    overview: {
      path: '',
      getHref: () => '/app',
    },
    profile: {
      path: 'profile',
      getHref: () => '/app/profile',
    },
    settings: {
      path: 'settings',
      getHref: () => '/app/settings',
    },
    sessions: {
      path: 'sessions',
      getHref: () => '/app/sessions',
    },
  },
} as const;
