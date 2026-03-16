import type { Meta, StoryObj } from '@storybook/react';

import { RegisterForm } from './RegisterForm';

const meta = {
  title: 'Features/Auth/RegisterForm',
  component: RegisterForm,
  parameters: {
    layout: 'centered',
  },
  args: {
    onSuccess: () => {},
  },
} satisfies Meta<typeof RegisterForm>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
