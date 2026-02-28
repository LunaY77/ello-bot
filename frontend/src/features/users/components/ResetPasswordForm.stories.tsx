import type { Meta, StoryObj } from '@storybook/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { ResetPasswordForm } from '@/features/users/components/ResetPasswordForm';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: false },
    mutations: { retry: false },
  },
});

const meta = {
  title: 'Features/Users/ResetPasswordForm',
  component: ResetPasswordForm,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <QueryClientProvider client={queryClient}>
        <div className="w-96">
          <Story />
        </div>
      </QueryClientProvider>
    ),
  ],
} satisfies Meta<typeof ResetPasswordForm>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    onSuccess: () => {
      console.log('Password reset successful');
    },
  },
};

export const WithCallback: Story = {
  args: {
    onSuccess: () => {
      alert('Password has been reset successfully!');
    },
  },
  parameters: {
    docs: {
      description: {
        story: 'Shows the form with a custom success callback.',
      },
    },
  },
};

export const ValidationError: Story = {
  args: {
    onSuccess: () => {
      console.log('Password reset successful');
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = canvasElement;
    const submitButton = canvas.querySelector(
      'button[type="submit"]',
    ) as HTMLButtonElement;
    if (submitButton) {
      submitButton.click();
    }
  },
  parameters: {
    docs: {
      description: {
        story:
          'Shows validation errors when submitting empty or invalid form fields.',
      },
    },
  },
};
