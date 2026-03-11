import type {
  AgentAccountResponse,
  AuthMeResponse,
  UserAccountResponse,
} from '@/api/models/resp';

export const getViewerAccount = (
  viewer: AuthMeResponse | null | undefined,
): UserAccountResponse | AgentAccountResponse | null => {
  return viewer?.user ?? viewer?.agent ?? null;
};

export const getViewerDisplayName = (
  viewer: AuthMeResponse | null | undefined,
): string => {
  return (
    viewer?.principal.displayName ??
    getViewerAccount(viewer)?.displayName ??
    'Ello'
  );
};

export const getViewerHandle = (
  viewer: AuthMeResponse | null | undefined,
): string => {
  return (
    viewer?.user?.username ??
    viewer?.agent?.code ??
    viewer?.tenant.slug ??
    'guest'
  );
};

export const getViewerAvatarUrl = (
  viewer: AuthMeResponse | null | undefined,
): string => {
  return viewer?.user?.avatarUrl ?? viewer?.agent?.avatarUrl ?? '';
};
