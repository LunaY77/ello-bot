/**
 * Form 表单组件
 *
 * 功能说明：
 * 基于 react-hook-form 和 zod 的表单组件，提供类型安全的表单处理。
 *
 * 核心特性：
 * - 使用 zod 进行表单验证
 * - 使用 react-hook-form 管理表单状态
 * - 提供 render props 模式，灵活渲染表单内容
 * - 支持 FormField、FormItem、FormLabel 等子组件
 */

import { zodResolver } from '@hookform/resolvers/zod';
import * as LabelPrimitive from '@radix-ui/react-label';
import { Slot } from '@radix-ui/react-slot';
import * as React from 'react';
import {
  Controller,
  type ControllerProps,
  type FieldPath,
  type FieldValues,
  FormProvider,
  type SubmitHandler,
  type UseFormProps,
  type UseFormReturn,
  useForm,
  useFormContext,
} from 'react-hook-form';
import { type ZodType, type z } from 'zod';

import { cn } from '@/utils/cn';

import { Label } from './label';

// ============================================
// FormField 相关
// ============================================

/**
 * FormField 上下文类型
 */
type FormFieldContextValue<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
> = {
  name: TName;
};

const FormFieldContext = React.createContext<FormFieldContextValue>(
  {} as FormFieldContextValue,
);

/**
 * FormField 组件
 * 包装 react-hook-form 的 Controller，提供字段上下文
 */
const FormField = <
  TFieldValues extends FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
>({
  ...props
}: ControllerProps<TFieldValues, TName>) => {
  return (
    <FormFieldContext.Provider value={{ name: props.name }}>
      <Controller {...props} />
    </FormFieldContext.Provider>
  );
};

// ============================================
// FormItem 相关
// ============================================

/**
 * FormItem 上下文类型
 */
type FormItemContextValue = {
  id: string;
};

const FormItemContext = React.createContext<FormItemContextValue>(
  {} as FormItemContextValue,
);

/**
 * useFormField Hook
 * 获取当前表单字段的状态和 ID
 */
const useFormField = () => {
  const fieldContext = React.useContext(FormFieldContext);
  const itemContext = React.useContext(FormItemContext);
  const { getFieldState, formState } = useFormContext();

  const fieldState = getFieldState(fieldContext.name, formState);

  if (!fieldContext) {
    throw new Error('useFormField 必须在 <FormField> 内部使用');
  }

  const { id } = itemContext;

  return {
    id,
    name: fieldContext.name,
    formItemId: `${id}-form-item`,
    formDescriptionId: `${id}-form-item-description`,
    formMessageId: `${id}-form-item-message`,
    ...fieldState,
  };
};

/**
 * FormItem 组件
 * 表单字段的容器组件
 */
const FormItem = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => {
  const id = React.useId();

  return (
    <FormItemContext.Provider value={{ id }}>
      <div ref={ref} className={cn('space-y-2', className)} {...props} />
    </FormItemContext.Provider>
  );
});
FormItem.displayName = 'FormItem';

/**
 * FormLabel 组件
 * 表单字段的标签组件
 */
const FormLabel = React.forwardRef<
  React.ElementRef<typeof LabelPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof LabelPrimitive.Root>
>(({ className, ...props }, ref) => {
  const { error, formItemId } = useFormField();

  return (
    <Label
      ref={ref}
      className={cn(error && 'text-destructive', className)}
      htmlFor={formItemId}
      {...props}
    />
  );
});
FormLabel.displayName = 'FormLabel';

/**
 * FormControl 组件
 * 表单控件的包装组件，提供无障碍属性
 */
const FormControl = React.forwardRef<
  React.ElementRef<typeof Slot>,
  React.ComponentPropsWithoutRef<typeof Slot>
>(({ ...props }, ref) => {
  const { error, formItemId, formDescriptionId, formMessageId } =
    useFormField();

  return (
    <Slot
      ref={ref}
      id={formItemId}
      aria-describedby={
        !error
          ? `${formDescriptionId}`
          : `${formDescriptionId} ${formMessageId}`
      }
      aria-invalid={!!error}
      {...props}
    />
  );
});
FormControl.displayName = 'FormControl';

/**
 * FormDescription 组件
 * 表单字段的描述文本
 */
const FormDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => {
  const { formDescriptionId } = useFormField();

  return (
    <p
      ref={ref}
      id={formDescriptionId}
      className={cn('text-[0.8rem] text-muted-foreground', className)}
      {...props}
    />
  );
});
FormDescription.displayName = 'FormDescription';

/**
 * FormMessage 组件
 * 表单字段的错误消息
 */
const FormMessage = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, children, ...props }, ref) => {
  const { error, formMessageId } = useFormField();
  const body = error ? String(error?.message) : children;

  if (!body) {
    return null;
  }

  return (
    <p
      ref={ref}
      id={formMessageId}
      className={cn('text-[0.8rem] font-medium text-destructive', className)}
      {...props}
    >
      {body}
    </p>
  );
});
FormMessage.displayName = 'FormMessage';

// ============================================
// Form 主组件
// ============================================

/**
 * Form 组件的 Props 类型
 */
type FormProps<TFormValues extends FieldValues, Schema> = {
  /** 表单提交处理函数 */
  onSubmit: SubmitHandler<TFormValues>;
  /** Zod 验证 Schema */
  schema: Schema;
  /** 自定义 className */
  className?: string;
  /** 渲染函数，接收 form methods */
  children: (methods: UseFormReturn<TFormValues>) => React.ReactNode;
  /** react-hook-form 配置选项 */
  options?: UseFormProps<TFormValues>;
  /** 表单 ID */
  id?: string;
};

/**
 * Form 表单组件
 *
 * @example
 * <Form
 *   schema={loginSchema}
 *   onSubmit={(data) => console.log(data)}
 * >
 *   {({ register, formState }) => (
 *     <>
 *       <Input
 *         label="邮箱"
 *         error={formState.errors.email}
 *         registration={register('email')}
 *       />
 *       <Button type="submit">登录</Button>
 *     </>
 *   )}
 * </Form>
 */
const Form = <
  Schema extends ZodType<unknown, unknown, unknown>,
  TFormValues extends FieldValues = z.infer<Schema>,
>({
  onSubmit,
  children,
  className,
  options,
  id,
  schema,
}: FormProps<TFormValues, Schema>) => {
  const form = useForm({ ...options, resolver: zodResolver(schema) });
  return (
    <FormProvider {...form}>
      <form
        className={cn('space-y-6', className)}
        onSubmit={form.handleSubmit(onSubmit)}
        id={id}
      >
        {children(form)}
      </form>
    </FormProvider>
  );
};

export {
  useFormField,
  Form,
  FormProvider,
  FormItem,
  FormLabel,
  FormControl,
  FormDescription,
  FormMessage,
  FormField,
};
