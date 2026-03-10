import type { Meta, StoryObj } from '@storybook/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import type { AuthMeResponse } from '@/api/models/resp';
import { iamQueryKeys } from '@/features/iam';
import { IamConsole } from '@/features/iam/components/IamConsole';
import { AUTHENTICATED_USER_QUERY_KEY } from '@/lib/auth';

const viewer: AuthMeResponse = {
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
    avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=600&q=80',
    bio: 'Owns workspace security and product operations.',
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

const permissions = [
  {
    id: 11,
    code: 'tenant.manage',
    resourceType: 'tenant',
    action: 'manage',
    description: 'Manage tenant lifecycle.',
    createdAt: '2026-03-01T08:00:00Z',
    updatedAt: '2026-03-01T08:00:00Z',
  },
  {
    id: 12,
    code: 'user.read',
    resourceType: 'user',
    action: 'read',
    description: 'Read user records.',
    createdAt: '2026-03-01T08:00:00Z',
    updatedAt: '2026-03-01T08:00:00Z',
  },
  {
    id: 13,
    code: 'agent.manage',
    resourceType: 'agent',
    action: 'manage',
    description: 'Manage agent records.',
    createdAt: '2026-03-01T08:00:00Z',
    updatedAt: '2026-03-01T08:00:00Z',
  },
  {
    id: 14,
    code: 'acl.manage',
    resourceType: 'acl',
    action: 'manage',
    description: 'Manage resource overrides.',
    createdAt: '2026-03-01T08:00:00Z',
    updatedAt: '2026-03-01T08:00:00Z',
  },
];

const roles = [
  {
    id: 31,
    tenantId: 7,
    code: 'owner',
    name: 'Owner',
    description: 'Full workspace administration.',
    isBuiltin: true,
    createdAt: '2026-03-01T08:00:00Z',
    updatedAt: '2026-03-10T08:00:00Z',
    permissions: permissions,
  },
  {
    id: 32,
    tenantId: 7,
    code: 'editor',
    name: 'Editor',
    description: 'Read and update tenant content.',
    isBuiltin: false,
    createdAt: '2026-03-01T08:00:00Z',
    updatedAt: '2026-03-09T08:00:00Z',
    permissions: permissions.slice(1, 3),
  },
];

const users = [
  viewer.user!,
  {
    principalId: 1002,
    username: 'annika',
    avatarUrl: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=600&q=80',
    bio: 'Product designer for admin workflows.',
    gender: 'female',
    dateOfBirth: null,
    timezone: 'Europe/Berlin',
    displayName: 'Annika Moss',
    isActive: true,
    createdAt: '2026-03-05T08:00:00Z',
    updatedAt: '2026-03-09T08:00:00Z',
  },
];

const agents = [
  {
    principalId: 2001,
    ownerPrincipalId: 1001,
    code: 'doc-bot',
    avatarUrl: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=600&q=80',
    description: 'Indexes workspace documentation and answers access questions.',
    displayName: 'Documentation Bot',
    isActive: true,
    createdAt: '2026-03-04T08:00:00Z',
    updatedAt: '2026-03-10T08:00:00Z',
  },
];

const memberships = [
  {
    id: 401,
    tenantId: 7,
    principalId: 1001,
    status: 'active',
    createdAt: '2026-03-01T08:00:00Z',
    updatedAt: '2026-03-10T08:00:00Z',
  },
  {
    id: 402,
    tenantId: 7,
    principalId: 1002,
    status: 'invited',
    createdAt: '2026-03-07T08:00:00Z',
    updatedAt: '2026-03-09T08:00:00Z',
  },
  {
    id: 403,
    tenantId: 7,
    principalId: 2001,
    status: 'active',
    createdAt: '2026-03-06T08:00:00Z',
    updatedAt: '2026-03-10T08:00:00Z',
  },
];

const visibleTenants = [
  viewer.tenant,
  {
    id: 9,
    slug: 'ello-labs',
    name: 'Ello Labs',
    isActive: true,
  },
];

const aclEntries = [
  {
    id: 501,
    tenantId: 7,
    resourceType: 'workspace_document',
    resourceId: 81,
    permissionId: 12,
    subjectPrincipalId: 1002,
    subjectRoleId: null,
    effect: 'allow',
    createdAt: '2026-03-08T08:00:00Z',
    updatedAt: '2026-03-09T08:00:00Z',
  },
];

const createStoryQueryClient = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        staleTime: Infinity,
      },
      mutations: {
        retry: false,
      },
    },
  });

  queryClient.setQueryData(AUTHENTICATED_USER_QUERY_KEY, viewer);
  queryClient.setQueryData(iamQueryKeys.visibleTenants(), visibleTenants);
  queryClient.setQueryData(iamQueryKeys.tenant(viewer.tenant.id), viewer.tenant);
  queryClient.setQueryData(['users', viewer.tenant.id], users);
  queryClient.setQueryData(iamQueryKeys.agentList(viewer.tenant.id), agents);
  queryClient.setQueryData(iamQueryKeys.tenantMemberships(viewer.tenant.id), memberships);
  queryClient.setQueryData(iamQueryKeys.tenantRoles(viewer.tenant.id), roles);
  queryClient.setQueryData(iamQueryKeys.permissions(), permissions);
  queryClient.setQueryData(
    iamQueryKeys.tenantAcl(viewer.tenant.id, undefined),
    aclEntries,
  );
  queryClient.setQueryData(iamQueryKeys.principalRoles(1001, viewer.tenant.id), [
    { role: roles[0] },
  ]);
  queryClient.setQueryData(iamQueryKeys.principal(1001), viewer.principal);
  queryClient.setQueryData(iamQueryKeys.principalMemberships(1001), [
    {
      membership: memberships[0],
      tenant: viewer.tenant,
    },
    {
      membership: {
        id: 404,
        tenantId: 9,
        principalId: 1001,
        status: 'active',
        createdAt: '2026-03-02T08:00:00Z',
        updatedAt: '2026-03-08T08:00:00Z',
      },
      tenant: visibleTenants[1],
    },
  ]);
  queryClient.setQueryData(iamQueryKeys.principalPermissions(1001, viewer.tenant.id), {
    tenantId: viewer.tenant.id,
    principalId: 1001,
    permissionCodes: permissions.map((item) => item.code),
  });

  return queryClient;
};

const meta = {
  title: 'Features/Security/IamConsole',
  component: IamConsole,
  parameters: {
    layout: 'fullscreen',
  },
  tags: ['autodocs'],
  decorators: [
    (Story) => {
      const queryClient = createStoryQueryClient();

      return (
        <QueryClientProvider client={queryClient}>
          <div className="min-h-screen bg-[#f5efe6] px-6 py-10">
            <div className="mx-auto max-w-7xl">
              <Story />
            </div>
          </div>
        </QueryClientProvider>
      );
    },
  ],
} satisfies Meta<typeof IamConsole>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
