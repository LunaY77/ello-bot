import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { LoginForm } from './LoginForm';

import { useLogin } from '@/lib/auth';
import { renderWithProviders } from '@/testing/RenderWithProviders';

vi.mock('@/lib/auth', () => ({
  useLogin: vi.fn(),
}));

describe('LoginForm', () => {
  const mutate = vi.fn();

  beforeEach(() => {
    mutate.mockReset();
    vi.mocked(useLogin).mockReturnValue({
      mutate,
      isPending: false,
    } as never);
  });

  it('submits credentials through the current IAM login hook', async () => {
    const onSuccess = vi.fn();
    const user = userEvent.setup();

    renderWithProviders(<LoginForm onSuccess={onSuccess} />);

    const usernameInput = await screen.findByLabelText('Username');

    await waitFor(() => {
      expect(useLogin).toHaveBeenCalledWith({ onSuccess });
    });

    await user.type(usernameInput, 'alice');
    await user.type(screen.getByLabelText('Password'), 'Secret_123');
    await user.click(screen.getByRole('button', { name: 'Sign In' }));

    await waitFor(() => {
      expect(mutate).toHaveBeenCalledWith({
        username: 'alice',
        password: 'Secret_123',
      });
    });
  });

  it('preserves redirectTo when linking to registration', async () => {
    renderWithProviders(<LoginForm onSuccess={vi.fn()} />, {
      route: '/auth/login?redirectTo=%2Fapp%2Fworkspaces',
    });

    await expect(
      screen.findByRole('link', { name: 'Create one' }),
    ).resolves.toHaveAttribute(
      'href',
      '/auth/register?redirectTo=%2Fapp%2Fworkspaces',
    );
  });
});
