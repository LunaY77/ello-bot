import type { Meta, StoryObj } from '@storybook/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { sessionsQueryKeys } from '../api/query-keys';

import { SessionsPanel } from './SessionsPanel';

import { queryConfig } from '@/lib/react-query';

const sessions = [
  {
    id: 301,
    userAgent: 'Chrome on macOS',
    ipAddress: '127.0.0.1',
    expiresAt: '2026-03-16T12:00:00Z',
    lastSeenAt: '2026-03-15T11:50:00Z',
    createdAt: '2026-03-15T08:00:00Z',
  },
  {
    id: 302,
    userAgent: 'Safari on iPhone',
    ipAddress: '10.0.0.42',
    expiresAt: '2026-03-16T18:00:00Z',
    lastSeenAt: null,
    createdAt: '2026-03-15T09:15:00Z',
  },
];

const createClient = () => {
  const client = new QueryClient({
    defaultOptions: queryConfig,
  });

  client.setQueryData(sessionsQueryKeys.list(), sessions);
  return client;
};

const meta = {
  title: 'Features/Sessions/SessionsPanel',
  component: SessionsPanel,
  parameters: {
    layout: 'padded',
  },
  decorators: [
    (Story) => (
      <QueryClientProvider client={createClient()}>
        <div className="max-w-5xl">
          <Story />
        </div>
      </QueryClientProvider>
    ),
  ],
} satisfies Meta<typeof SessionsPanel>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
