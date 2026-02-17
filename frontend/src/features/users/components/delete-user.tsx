/**
 * DeleteUser 删除用户组件
 *
 * 功能说明：
 * 删除用户的按钮组件，带有确认对话框。
 * 不能删除当前登录的用户。
 */

import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { useNotifications } from '@/components/ui/notifications';
import { useUser } from '@/lib/auth';

import { useDeleteUser } from '../api/delete-user';

/**
 * DeleteUser 组件的 Props 类型
 */
type DeleteUserProps = {
  /** 要删除的用户 ID */
  id: string;
};

/**
 * DeleteUser 删除用户组件
 *
 * @param id - 要删除的用户 ID
 *
 * @example
 * <DeleteUser id="user-123" />
 */
export const DeleteUser = ({ id }: DeleteUserProps) => {
  const user = useUser();
  const { addNotification } = useNotifications();
  const [showConfirm, setShowConfirm] = useState(false);

  const deleteUserMutation = useDeleteUser({
    mutationConfig: {
      onSuccess: () => {
        addNotification({
          type: 'success',
          title: '用户已删除',
        });
        setShowConfirm(false);
      },
    },
  });

  // 不能删除当前登录的用户
  if (user.data?.id === id) return null;

  return (
    <>
      <Button
        variant="destructive"
        size="sm"
        onClick={() => setShowConfirm(true)}
      >
        删除
      </Button>

      {/* 确认对话框 */}
      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* 遮罩层 */}
          <div
            className="fixed inset-0 bg-black/50"
            onClick={() => setShowConfirm(false)}
          />

          {/* 对话框 */}
          <div className="relative z-10 w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
            <h3 className="text-lg font-medium text-gray-900">删除用户</h3>
            <p className="mt-2 text-sm text-gray-500">
              确定要删除此用户吗？此操作无法撤销。
            </p>
            <div className="mt-4 flex justify-end gap-3">
              <Button
                variant="outline"
                onClick={() => setShowConfirm(false)}
              >
                取消
              </Button>
              <Button
                variant="destructive"
                isLoading={deleteUserMutation.isPending}
                onClick={() => deleteUserMutation.mutate({ userId: id })}
              >
                确认删除
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
