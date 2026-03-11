import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useResetPassword } from '../api/reset-password';

import { ResetPasswordForm } from './ResetPasswordForm';

import i18n from '@/lib/i18n';
import { renderWithProviders } from '@/testing/RenderWithProviders';

vi.mock('../api/reset-password', () => ({
  useResetPassword: vi.fn(),
}));

describe('ResetPasswordForm', () => {
  const mutate = vi.fn();

  beforeEach(async () => {
    await i18n.changeLanguage('en-US');
    mutate.mockReset();
    vi.mocked(useResetPassword).mockReturnValue({
      mutate,
      isPending: false,
    } as never);
  });

  it('blocks submission when the confirmation password does not match', async () => {
    const user = userEvent.setup();

    renderWithProviders(<ResetPasswordForm />);

    await user.type(screen.getByLabelText('New Password'), 'Secret_123');
    await user.type(screen.getByLabelText('Confirm Password'), 'Secret_456');
    await user.click(screen.getByRole('button', { name: 'Reset Password' }));

    expect(await screen.findByText('Passwords do not match')).toBeVisible();
    expect(mutate).not.toHaveBeenCalled();
  });

  it('submits the new password through the IAM reset mutation', async () => {
    const onSuccess = vi.fn();
    const user = userEvent.setup();

    renderWithProviders(<ResetPasswordForm onSuccess={onSuccess} />);

    expect(useResetPassword).toHaveBeenCalledWith({
      mutationConfig: {
        onSuccess,
      },
    });

    await user.type(screen.getByLabelText('New Password'), 'Secret_123');
    await user.type(screen.getByLabelText('Confirm Password'), 'Secret_123');
    await user.click(screen.getByRole('button', { name: 'Reset Password' }));

    await waitFor(() => {
      expect(mutate).toHaveBeenCalledWith({
        newPassword: 'Secret_123',
      });
    });
  });
});
