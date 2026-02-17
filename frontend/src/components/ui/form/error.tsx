/**
 * Error 错误提示组件
 *
 * 功能说明：
 * 显示表单字段的错误消息。
 *
 * 特性：
 * - 无障碍访问支持（role="alert"）
 * - 条件渲染（无错误时不渲染）
 */

/**
 * Error 组件的 Props 类型
 */
export type ErrorProps = {
  /** 错误消息 */
  errorMessage?: string | null;
};

/**
 * Error 错误提示组件
 *
 * @param errorMessage - 错误消息，为空时不渲染
 *
 * @example
 * <Error errorMessage="请输入有效的邮箱地址" />
 */
export const Error = ({ errorMessage }: ErrorProps) => {
  if (!errorMessage) return null;

  return (
    <div
      role="alert"
      aria-label={errorMessage}
      className="text-sm font-semibold text-red-500"
    >
      {errorMessage}
    </div>
  );
};
