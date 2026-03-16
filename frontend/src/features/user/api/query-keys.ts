export const userQueryKeys = {
  all: () => ['user'] as const,
  profile: () => [...userQueryKeys.all(), 'profile'] as const,
  settings: () => [...userQueryKeys.all(), 'settings'] as const,
};
