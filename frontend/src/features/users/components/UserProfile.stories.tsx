import type { Meta, StoryObj } from '@storybook/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { UserProfile } from '@/features/users/components/UserProfile';

const mockUser = {
  id: '1',
  username: 'johndoe',
  role: 'admin',
  isActive: true,
};

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: false },
  },
});

const meta = {
  title: 'Features/Users/UserProfile',
  component: UserProfile,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <QueryClientProvider client={queryClient}>
        <div className="w-[600px]">
          <Story />
        </div>
      </QueryClientProvider>
    ),
  ],
} satisfies Meta<typeof UserProfile>;

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

export const AdminUser: Story = {
  parameters: {
    msw: {
      handlers: [
        {
          info: {
            method: 'GET',
            path: '/api/users/me',
          },
          resolver: () => ({
            data: {
              ...mockUser,
              username: 'admin',
              role: 'admin',
            },
          }),
        },
      ],
    },
  },
};

export const InactiveUser: Story = {
  parameters: {
    msw: {
      handlers: [
        {
          info: {
            method: 'GET',
            path: '/api/users/me',
          },
          resolver: () => ({
            data: {
              ...mockUser,
              isActive: false,
            },
          }),
        },
      ],
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
            throw new Error('Failed to fetch user profile');
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
