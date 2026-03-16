export const sessionsQueryKeys = {
  all: () => ['sessions'] as const,
  list: () => [...sessionsQueryKeys.all(), 'list'] as const,
};
