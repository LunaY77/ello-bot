/**
 * UpdateProfile 更新资料组件
 *
 * 功能说明：
 * 更新当前用户资料的表单组件。
 * 包含姓名、邮箱和简介的编辑。
 */

import { Pen } from 'lucide-react';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Form, Input } from '@/components/ui/form';
import { useNotifications } from '@/components/ui/notifications';
import { useUser } from '@/lib/auth';

import {
  updateProfileInputSchema,
  useUpdateProfile,
} from '../api/update-profile';

/**
 * UpdateProfile 更新资料组件
 *
 * 显示编辑按钮，点击后弹出编辑表单。
 *
 * @example
 * <UpdateProfile />
 */
export const UpdateProfile = () => {
  const user = useUser();
  const { addNotification } = useNotifications();
  const [isOpen, setIsOpen] = useState(false);

  const updateProfileMutation = useUpdateProfile({
    mutationConfig: {
      onSuccess: () => {
        addNotification({
          type: 'success',
          title: '资料已更新',
        });
        setIsOpen(false);
      },
    },
  });

  return (
    <>
      <Button
        icon={<Pen className="size-4" />}
        size="sm"
        onClick={() => setIsOpen(true)}
      >
        编辑资料
      </Button>

      {/* 编辑对话框 */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* 遮罩层 */}
          <div
            className="fixed inset-0 bg-black/50"
            onClick={() => setIsOpen(false)}
          />

          {/* 对话框 */}
          <div className="relative z-10 w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
            <h3 className="text-lg font-medium text-gray-900">编辑资料</h3>

            <div className="mt-4">
              <Form
                id="update-profile"
                onSubmit={(values) => {
                  updateProfileMutation.mutate({ data: values });
                }}
                options={{
                  defaultValues: {
                    firstName: user.data?.firstName ?? '',
                    lastName: user.data?.lastName ?? '',
                    email: user.data?.email ?? '',
                    bio: user.data?.bio ?? '',
                  },
                }}
                schema={updateProfileInputSchema}
              >
                {({ register, formState }) => (
                  <>
                    <Input
                      label="名"
                      error={formState.errors['firstName']}
                      registration={register('firstName')}
                    />
                    <Input
                      label="姓"
                      error={formState.errors['lastName']}
                      registration={register('lastName')}
                    />
                    <Input
                      label="邮箱"
                      type="email"
                      error={formState.errors['email']}
                      registration={register('email')}
                    />
                    <div className="mt-4">
                      <label className="block text-sm font-medium text-gray-700">
                        简介
                      </label>
                      <textarea
                        className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        rows={3}
                        {...register('bio')}
                      />
                      {formState.errors['bio'] && (
                        <p className="mt-1 text-sm text-red-500">
                          {formState.errors['bio'].message}
                        </p>
                      )}
                    </div>

                    <div className="mt-6 flex justify-end gap-3">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setIsOpen(false)}
                      >
                        取消
                      </Button>
                      <Button
                        type="submit"
                        isLoading={updateProfileMutation.isPending}
                      >
                        保存
                      </Button>
                    </div>
                  </>
                )}
              </Form>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
