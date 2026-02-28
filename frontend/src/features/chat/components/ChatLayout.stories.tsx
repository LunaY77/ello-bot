import type { Meta, StoryObj } from '@storybook/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { ChatLayout } from '@/features/chat/components/ChatLayout';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: false },
  },
});

const mockUser = {
  id: '1',
  username: 'johndoe',
  role: 'user',
  isActive: true,
};

const meta = {
  title: 'Features/Chat/ChatLayout',
  component: ChatLayout,
  parameters: {
    layout: 'fullscreen',
  },
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <QueryClientProvider client={queryClient}>
        <div className="h-screen">
          <Story />
        </div>
      </QueryClientProvider>
    ),
  ],
} satisfies Meta<typeof ChatLayout>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  parameters: {
    msw: {
      handlers: [
        {
          info: {
            method: 'GET',
            path: '/api/users/me',
          },
          resolver: () => ({
            data: mockUser,
          }),
        },
      ],
    },
  },
};

export const WithMessages: Story = {
  parameters: {
    msw: {
      handlers: [
        {
          info: {
            method: 'GET',
            path: '/api/users/me',
          },
          resolver: () => ({
            data: mockUser,
          }),
        },
      ],
    },
    docs: {
      description: {
        story: 'Chat layout with demo messages displayed.',
      },
    },
  },
};

export const Loading: Story = {
  parameters: {
    msw: {
      handlers: [
        {
          info: {
            method: 'GET',
            path: '/api/users/me',
          },
          resolver: () => new Promise(() => {}),
        },
      ],
    },
    docs: {
      description: {
        story: 'Shows the loading state while fetching user data.',
      },
    },
  },
};

export const ApiError: Story = {
  parameters: {
    msw: {
      handlers: [
        {
          info: {
            method: 'GET',
            path: '/api/users/me',
          },
          resolver: () => {
            throw new Error('Failed to fetch user data');
          },
        },
      ],
    },
    docs: {
      description: {
        story: 'Shows error state when API request fails.',
      },
    },
  },
};
