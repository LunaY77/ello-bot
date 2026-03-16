import type {
  CurrentUserResponse,
  UserSummaryResponse,
} from '@/api/models/resp';

export const getViewerAccount = (
  viewer: CurrentUserResponse | null | undefined,
): UserSummaryResponse | null => {
  return viewer?.user ?? null;
};

export const getViewerDisplayName = (
  viewer: CurrentUserResponse | null | undefined,
): string => {
  return (
    getViewerAccount(viewer)?.displayName || viewer?.user?.username || 'Ello'
  );
};

export const getViewerHandle = (
  viewer: CurrentUserResponse | null | undefined,
): string => {
  return viewer?.user?.username ?? 'guest';
};

export const getViewerAvatarUrl = (
  viewer: CurrentUserResponse | null | undefined,
): string => {
  return viewer?.user?.avatarUrl ?? '';
};
