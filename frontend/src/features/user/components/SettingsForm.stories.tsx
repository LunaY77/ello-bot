import type { Meta, StoryObj } from '@storybook/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { userQueryKeys } from '../api/query-keys';

import { SettingsForm } from './SettingsForm';

import { AUTHENTICATED_USER_QUERY_KEY } from '@/lib/auth';
import { queryConfig } from '@/lib/react-query';
import { ThemeProvider } from '@/lib/theme';

const currentUser = {
  user: {
    id: 101,
    username: 'jane',
    displayName: 'Jane Example',
    avatarUrl: '',
    bio: 'Personal account used for frontend verification.',
    timezone: 'Asia/Shanghai',
    isActive: true,
    createdAt: '2026-03-15T00:00:00Z',
    updatedAt: '2026-03-15T08:00:00Z',
  },
  settings: {
    locale: 'en-US',
    theme: 'light',
    systemPrompt: 'Keep replies concise and concrete.',
    defaultModel: 'gpt-4o-mini',
  },
};

const createClient = () => {
  const client = new QueryClient({
    defaultOptions: queryConfig,
  });

  client.setQueryData(AUTHENTICATED_USER_QUERY_KEY, currentUser);
  client.setQueryData(userQueryKeys.settings(), currentUser.settings);
  return client;
};

const meta = {
  title: 'Features/User/SettingsForm',
  component: SettingsForm,
  parameters: {
    layout: 'padded',
  },
  decorators: [
    (Story) => (
      <QueryClientProvider client={createClient()}>
        <ThemeProvider>
          <div className="max-w-3xl">
            <Story />
          </div>
        </ThemeProvider>
      </QueryClientProvider>
    ),
  ],
} satisfies Meta<typeof SettingsForm>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
