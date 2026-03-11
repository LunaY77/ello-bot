import type { Meta, StoryObj } from '@storybook/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import type { AuthMeResponse } from '@/api/models/resp';
import { AvatarUpload } from '@/features/users/components/AvatarUpload';
import { AUTHENTICATED_USER_QUERY_KEY } from '@/lib/auth';

const defaultViewer: AuthMeResponse = {
  principal: {
    id: 1001,
    principalType: 'human',
    displayName: 'Cang Jingyue',
    isActive: true,
    sessionVersion: 3,
    authzVersion: 8,
    createdAt: '2026-03-01T08:00:00Z',
    updatedAt: '2026-03-10T08:00:00Z',
  },
  tenant: {
    id: 7,
    slug: 'ello-core',
    name: 'Ello Core',
    isActive: true,
  },
  user: {
    principalId: 1001,
    username: 'cangjingyue',
    avatarUrl:
      'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=600&q=80',
    bio: 'Owns tenant governance and product operations.',
    gender: 'female',
    dateOfBirth: '1995-03-12',
    timezone: 'Asia/Shanghai',
    displayName: 'Cang Jingyue',
    isActive: true,
    createdAt: '2026-03-01T08:00:00Z',
    updatedAt: '2026-03-10T08:00:00Z',
  },
  agent: null,
};

const meta = {
  title: 'Features/Users/AvatarUpload',
  component: AvatarUpload,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  decorators: [
    (Story, context) => {
      const queryClient = new QueryClient({
        defaultOptions: {
          queries: { retry: false, staleTime: Infinity },
          mutations: { retry: false },
        },
      });

      queryClient.setQueryData(
        AUTHENTICATED_USER_QUERY_KEY,
        context.parameters.viewer ?? defaultViewer,
      );

      return (
        <QueryClientProvider client={queryClient}>
          <div className="w-96">
            <Story />
          </div>
        </QueryClientProvider>
      );
    },
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
  parameters: {
    viewer: defaultViewer,
  },
};

export const AgentViewer: Story = {
  parameters: {
    viewer: {
      principal: {
        ...defaultViewer.principal,
        id: 2001,
        principalType: 'agent',
        displayName: 'Documentation Bot',
      },
      tenant: defaultViewer.tenant,
      user: null,
      agent: {
        principalId: 2001,
        ownerPrincipalId: 1001,
        code: 'doc-bot',
        avatarUrl: '',
        description:
          'Indexes workspace documentation and answers access questions.',
        displayName: 'Documentation Bot',
        isActive: true,
        createdAt: '2026-03-04T08:00:00Z',
        updatedAt: '2026-03-10T08:00:00Z',
      },
    } satisfies AuthMeResponse,
  },
};
