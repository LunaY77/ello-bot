import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { RegisterForm } from './RegisterForm';

import { useRegister } from '@/lib/auth';
import { renderWithProviders } from '@/testing/RenderWithProviders';

vi.mock('@/lib/auth', () => ({
  useRegister: vi.fn(),
}));

describe('RegisterForm', () => {
  const mutate = vi.fn();

  beforeEach(() => {
    mutate.mockReset();
    vi.mocked(useRegister).mockReturnValue({
      mutate,
      isPending: false,
    } as never);
  });

  it('preserves redirectTo when linking back to login', () => {
    renderWithProviders(<RegisterForm onSuccess={vi.fn()} />, {
      route: '/auth/register?redirectTo=%2Fapp%2Fprofile',
    });

    expect(screen.getByRole('link', { name: 'Sign In' })).toHaveAttribute(
      'href',
      '/auth/login?redirectTo=%2Fapp%2Fprofile',
    );
  });

  it('blocks submission when passwords do not match', async () => {
    const user = userEvent.setup();

    renderWithProviders(<RegisterForm onSuccess={vi.fn()} />);

    await user.type(screen.getByLabelText('Username'), 'alice');
    await user.type(screen.getByLabelText('Password'), 'Secret_123');
    await user.type(screen.getByLabelText('Confirm Password'), 'Secret_456');
    await user.click(screen.getByRole('button', { name: 'Create Account' }));

    expect(await screen.findByText('Passwords do not match')).toBeVisible();
    expect(mutate).not.toHaveBeenCalled();
  });

  it('trims the display name before submitting the current registration payload', async () => {
    const onSuccess = vi.fn();
    const user = userEvent.setup();

    renderWithProviders(<RegisterForm onSuccess={onSuccess} />);

    expect(useRegister).toHaveBeenCalledWith({ onSuccess });

    await user.type(screen.getByLabelText('Display Name'), '  Alice Example  ');
    await user.type(screen.getByLabelText('Username'), 'alice');
    await user.type(screen.getByLabelText('Password'), 'Secret_123');
    await user.type(screen.getByLabelText('Confirm Password'), 'Secret_123');
    await user.click(screen.getByRole('button', { name: 'Create Account' }));

    await waitFor(() => {
      expect(mutate).toHaveBeenCalledWith({
        displayName: 'Alice Example',
        username: 'alice',
        password: 'Secret_123',
      });
    });
  });
});
