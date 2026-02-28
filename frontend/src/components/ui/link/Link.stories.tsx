import type { Meta, StoryObj } from '@storybook/react';

import { Link } from '@/components/ui/link/Link';

const meta = {
  title: 'UI/Link',
  component: Link,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof Link>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    to: '/home',
    children: 'Go to Home',
  },
};

export const InternalLink: Story = {
  args: {
    to: '/dashboard',
    children: 'Dashboard',
  },
};

export const WithCustomStyle: Story = {
  args: {
    to: '/about',
    children: 'About Us',
    className: 'text-blue-600 font-semibold',
  },
};

export const InParagraph: Story = {
  render: () => (
    <p className="text-sm">
      Read our{' '}
      <Link to="/terms" className="underline">
        terms and conditions
      </Link>{' '}
      for more information.
    </p>
  ),
};
