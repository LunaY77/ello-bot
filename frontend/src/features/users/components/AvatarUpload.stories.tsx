import type { Meta, StoryObj } from '@storybook/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { AvatarUpload } from '@/features/users/components/AvatarUpload';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: false },
    mutations: { retry: false },
  },
});

const meta = {
  title: 'Features/Users/AvatarUpload',
  component: AvatarUpload,
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
} satisfies Meta<typeof AvatarUpload>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    onSuccess: () => {
      console.log('Avatar uploaded successfully');
    },
  },
};

export const WithCallback: Story = {
  args: {
    onSuccess: () => {
      alert('Avatar uploaded successfully!');
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
