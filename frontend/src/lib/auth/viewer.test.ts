import { describe, expect, it } from 'vitest';

import {
  getViewerAccount,
  getViewerAvatarUrl,
  getViewerDisplayName,
  getViewerHandle,
} from './viewer';

import type { AuthMeResponse } from '@/api/models/resp';

describe('viewer helpers', () => {
  it('prefers the human user account when available', () => {
    const viewer = {
      principal: {
        displayName: 'Alice Principal',
      },
      tenant: {
        slug: 'personal',
      },
      user: {
        username: 'alice',
        displayName: 'Alice User',
        avatarUrl: 'https://example.com/alice.png',
      },
      agent: null,
    } as AuthMeResponse;

    expect(getViewerAccount(viewer)).toBe(viewer.user);
    expect(getViewerDisplayName(viewer)).toBe('Alice Principal');
    expect(getViewerHandle(viewer)).toBe('alice');
    expect(getViewerAvatarUrl(viewer)).toBe('https://example.com/alice.png');
  });

  it('falls back to agent and tenant metadata when no user exists', () => {
    const viewer = {
      principal: {
        displayName: null,
      },
      tenant: {
        slug: 'ops',
      },
      user: null,
      agent: {
        code: 'ops-bot',
        displayName: 'Ops Bot',
        avatarUrl: 'https://example.com/bot.png',
      },
    } as AuthMeResponse;

    expect(getViewerAccount(viewer)).toBe(viewer.agent);
    expect(getViewerDisplayName(viewer)).toBe('Ops Bot');
    expect(getViewerHandle(viewer)).toBe('ops-bot');
    expect(getViewerAvatarUrl(viewer)).toBe('https://example.com/bot.png');
  });

  it('returns safe guest defaults for an empty viewer', () => {
    expect(getViewerAccount(null)).toBeNull();
    expect(getViewerDisplayName(undefined)).toBe('Ello');
    expect(getViewerHandle(undefined)).toBe('guest');
    expect(getViewerAvatarUrl(undefined)).toBe('');
  });
});
