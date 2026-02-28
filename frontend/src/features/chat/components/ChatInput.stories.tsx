import type { Meta, StoryObj } from '@storybook/react';

import { ChatInput } from '@/features/chat/components/ChatInput';

const meta = {
  title: 'Features/Chat/ChatInput',
  component: ChatInput,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <div className="w-full max-w-4xl bg-white dark:bg-gray-900 p-4">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof ChatInput>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const WithPlaceholder: Story = {
  parameters: {
    docs: {
      description: {
        story: 'Shows the input with placeholder text.',
      },
    },
  },
};

export const DarkMode: Story = {
  decorators: [
    (Story) => (
      <div className="w-full max-w-4xl bg-gray-900 p-4">
        <div className="dark">
          <Story />
        </div>
      </div>
    ),
  ],
  parameters: {
    docs: {
      description: {
        story: 'Shows the input in dark mode.',
      },
    },
  },
};
