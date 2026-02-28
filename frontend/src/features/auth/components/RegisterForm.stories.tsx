import type { Meta, StoryObj } from '@storybook/react';

import { RegisterForm } from '@/features/auth/components/RegisterForm';

const meta = {
  title: 'Features/Auth/RegisterForm',
  component: RegisterForm,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <div className="w-96">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof RegisterForm>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    onSuccess: () => {
      console.log('Registration successful');
    },
  },
};

export const WithRedirect: Story = {
  args: {
    onSuccess: () => {
      console.log('Registration successful, redirecting...');
    },
  },
};

export const Loading: Story = {
  args: {
    onSuccess: () => {
      console.log('Registration successful');
    },
  },
  parameters: {
    docs: {
      description: {
        story: 'Shows the loading state when form is being submitted.',
      },
    },
  },
};

export const ValidationError: Story = {
  args: {
    onSuccess: () => {
      console.log('Registration successful');
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = canvasElement;
    const submitButton = canvas.querySelector(
      'button[type="submit"]',
    ) as HTMLButtonElement;
    if (submitButton) {
      submitButton.click();
    }
  },
  parameters: {
    docs: {
      description: {
        story: 'Shows validation errors when submitting empty form fields.',
      },
    },
  },
};
