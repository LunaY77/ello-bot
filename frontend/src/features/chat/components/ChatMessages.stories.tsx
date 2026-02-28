import type { Meta, StoryObj } from '@storybook/react';

import { ChatMessages } from '@/features/chat/components/ChatMessages';

const meta = {
  title: 'Features/Chat/ChatMessages',
  component: ChatMessages,
  parameters: {
    layout: 'fullscreen',
  },
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <div className="h-screen bg-white dark:bg-gray-900">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof ChatMessages>;

export default meta;
type Story = StoryObj<typeof meta>;

export const WithMessages: Story = {
  args: {
    username: 'johndoe',
  },
};

export const EmptyState: Story = {
  args: {
    username: 'johndoe',
  },
  render: (args) => {
    const EmptyMessages = () => {
      return <ChatMessages {...args} />;
    };
    return <EmptyMessages />;
  },
  parameters: {
    docs: {
      description: {
        story: 'Shows the placeholder when there are no messages.',
      },
    },
  },
};

export const WithLongUsername: Story = {
  args: {
    username: 'verylongusernamethatmightoverflow',
  },
};
