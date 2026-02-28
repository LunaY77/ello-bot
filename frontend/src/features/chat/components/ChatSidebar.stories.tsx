import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';

import { ChatSidebar } from '@/features/chat/components/ChatSidebar';

const meta = {
  title: 'Features/Chat/ChatSidebar',
  component: ChatSidebar,
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
} satisfies Meta<typeof ChatSidebar>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Open: Story = {
  args: {
    open: true,
    onToggle: () => console.log('Toggle sidebar'),
  },
};

export const Closed: Story = {
  args: {
    open: false,
    onToggle: () => console.log('Toggle sidebar'),
  },
};

const InteractiveSidebar = () => {
  const [open, setOpen] = useState(true);
  return <ChatSidebar open={open} onToggle={() => setOpen(!open)} />;
};

export const Interactive: Story = {
  render: () => <InteractiveSidebar />,
  parameters: {
    docs: {
      description: {
        story: 'Interactive sidebar that can be toggled open and closed.',
      },
    },
  },
};

export const DarkMode: Story = {
  args: {
    open: true,
    onToggle: () => console.log('Toggle sidebar'),
  },
  decorators: [
    (Story) => (
      <div className="h-screen bg-gray-900">
        <div className="dark">
          <Story />
        </div>
      </div>
    ),
  ],
  parameters: {
    docs: {
      description: {
        story: 'Shows the sidebar in dark mode.',
      },
    },
  },
};
