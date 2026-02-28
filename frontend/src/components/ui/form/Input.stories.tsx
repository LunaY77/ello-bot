import type { Meta, StoryObj } from '@storybook/react';
import { useForm } from 'react-hook-form';

import { Input, type InputProps } from '@/components/ui/form/Input';

const meta = {
  title: 'UI/Input',
  component: Input,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    type: {
      control: 'select',
      options: ['text', 'email', 'password', 'number', 'tel', 'url'],
    },
    disabled: {
      control: 'boolean',
    },
  },
} satisfies Meta<typeof Input>;

export default meta;
type Story = StoryObj<typeof meta>;

type InputWrapperProps = Omit<InputProps, 'registration'>;

const InputWrapper = (args: InputWrapperProps) => {
  const { register } = useForm();
  return <Input {...args} registration={register('example')} />;
};

export const Default: Story = {
  render: (args) => <InputWrapper {...args} />,
  args: {
    label: 'Email',
    type: 'email',
    placeholder: 'Enter your email',
  },
};

export const WithError: Story = {
  render: (args) => <InputWrapper {...args} />,
  args: {
    label: 'Email',
    type: 'email',
    placeholder: 'Enter your email',
    error: {
      type: 'required',
      message: 'Email is required',
    },
  },
};

export const Disabled: Story = {
  render: (args) => <InputWrapper {...args} />,
  args: {
    label: 'Email',
    type: 'email',
    placeholder: 'Enter your email',
    disabled: true,
  },
};

export const Password: Story = {
  render: (args) => <InputWrapper {...args} />,
  args: {
    label: 'Password',
    type: 'password',
    placeholder: 'Enter your password',
  },
};

export const WithoutLabel: Story = {
  render: (args) => <InputWrapper {...args} />,
  args: {
    type: 'text',
    placeholder: 'Search...',
  },
};
