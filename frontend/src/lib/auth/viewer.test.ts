import { describe, expect, it } from 'vitest';

import {
  getViewerAccount,
  getViewerAvatarUrl,
  getViewerDisplayName,
  getViewerHandle,
} from './viewer';

import type { CurrentUserResponse } from '@/api/models/resp';

describe('viewer helpers', () => {
  it('reads the single-user account payload directly', () => {
    const viewer = {
      user: {
        username: 'alice',
        displayName: 'Alice User',
        avatarUrl: 'https://example.com/alice.png',
      },
      settings: {
        locale: 'en-US',
        theme: 'system',
        systemPrompt: '',
        defaultModel: 'gpt-4o-mini',
      },
    } as CurrentUserResponse;

    expect(getViewerAccount(viewer)).toBe(viewer.user);
    expect(getViewerDisplayName(viewer)).toBe('Alice User');
    expect(getViewerHandle(viewer)).toBe('alice');
    expect(getViewerAvatarUrl(viewer)).toBe('https://example.com/alice.png');
  });

  it('falls back to the username when displayName is empty', () => {
    const viewer = {
      user: {
        username: 'ops',
        displayName: '',
        avatarUrl: '',
      },
      settings: {
        locale: 'en-US',
        theme: 'dark',
        systemPrompt: '',
        defaultModel: 'gpt-4o',
      },
    } as CurrentUserResponse;

    expect(getViewerAccount(viewer)).toBe(viewer.user);
    expect(getViewerDisplayName(viewer)).toBe('ops');
    expect(getViewerHandle(viewer)).toBe('ops');
    expect(getViewerAvatarUrl(viewer)).toBe('');
  });

  it('returns safe guest defaults for an empty viewer', () => {
    expect(getViewerAccount(null)).toBeNull();
    expect(getViewerDisplayName(undefined)).toBe('Ello');
    expect(getViewerHandle(undefined)).toBe('guest');
    expect(getViewerAvatarUrl(undefined)).toBe('');
  });
});
