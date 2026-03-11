import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useUpdateProfile } from '../api/update-profile';

import { UserProfile } from './UserProfile';

import type { AuthMeResponse } from '@/api/models/resp';
import { useCurrentUser } from '@/lib/auth';
import i18n from '@/lib/i18n';
import { renderWithProviders } from '@/testing/RenderWithProviders';

vi.mock('../api/update-profile', () => ({
  useUpdateProfile: vi.fn(),
}));

vi.mock('@/lib/auth', () => ({
  useCurrentUser: vi.fn(),
  getViewerDisplayName: (viewer: AuthMeResponse | null | undefined) =>
    viewer?.principal.displayName ??
    viewer?.user?.displayName ??
    viewer?.agent?.displayName ??
    'Ello',
}));

const createViewer = (overrides: Partial<AuthMeResponse> = {}) =>
  ({
    principal: {
      displayName: 'Alice Example',
      principalType: 'human',
      isActive: true,
    },
    tenant: {
      id: 7,
      name: 'Team Alpha',
      slug: 'team-alpha',
    },
    user: {
      principalId: 101,
      username: 'alice',
      displayName: 'Alice Example',
      avatarUrl: '',
      bio: null,
      gender: null,
      dateOfBirth: null,
      timezone: null,
      updatedAt: '2026-03-11T00:00:00.000Z',
    },
    agent: null,
    ...overrides,
  }) as AuthMeResponse;

describe('UserProfile', () => {
  const mutate = vi.fn();

  beforeEach(async () => {
    await i18n.changeLanguage('en-US');
    mutate.mockReset();
    vi.mocked(useUpdateProfile).mockReturnValue({
      mutate,
      isPending: false,
    } as never);
  });

  it('shows the agent fallback when no human account is attached', () => {
    vi.mocked(useCurrentUser).mockReturnValue({
      data: createViewer({
        principal: {
          displayName: 'Ops Bot',
          principalType: 'agent',
          isActive: true,
        },
        user: null,
        agent: {
          code: 'ops-bot',
          displayName: 'Ops Bot',
          avatarUrl: '',
        },
      }),
      isLoading: false,
    } as never);

    renderWithProviders(<UserProfile />);

    expect(
      screen.getByRole('heading', { name: 'User Information' }),
    ).toBeVisible();
    expect(
      screen.getByText(
        'This screen currently supports human user accounts only.',
      ),
    ).toBeVisible();
  });

  it('submits the current profile payload with nullable fields normalized', async () => {
    const user = userEvent.setup();

    vi.mocked(useCurrentUser).mockReturnValue({
      data: createViewer(),
      isLoading: false,
    } as never);

    renderWithProviders(<UserProfile />);

    expect(
      screen.getByRole('heading', { name: 'Alice Example' }),
    ).toBeVisible();
    expect(screen.getByText('@alice')).toBeVisible();
    expect(screen.getByDisplayValue('Alice Example')).toBeVisible();

    await user.clear(screen.getByLabelText('Display Name'));
    await user.type(screen.getByLabelText('Timezone'), ' Asia/Shanghai ');
    await user.type(screen.getByLabelText('Bio'), ' Updated from test ');
    await user.click(screen.getByRole('button', { name: 'Save Changes' }));

    await waitFor(() => {
      expect(mutate).toHaveBeenCalledWith({
        displayName: null,
        bio: 'Updated from test',
        gender: null,
        dateOfBirth: null,
        timezone: 'Asia/Shanghai',
      });
    });
  });
});
