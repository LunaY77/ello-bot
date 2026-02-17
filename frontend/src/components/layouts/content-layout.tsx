/**
 * ContentLayout 内容布局组件
 *
 * 功能说明：
 * 为应用内页面提供统一的内容布局结构，
 * 包含页面标题和内容区域的标准化布局。
 *
 * 使用场景：
 * - Dashboard 内的各个功能页面
 * - 需要统一标题样式的内容页面
 */

import * as React from 'react';

import { Head } from '../seo';

/**
 * ContentLayout 组件的 Props 类型
 */
type ContentLayoutProps = {
  /** 子元素（页面内容） */
  children: React.ReactNode;
  /** 页面标题 */
  title: string;
};

/**
 * ContentLayout 内容布局组件
 *
 * @param children - 页面内容
 * @param title - 页面标题，同时用于 SEO 和页面显示
 *
 * @example
 * <ContentLayout title="用户管理">
 *   <UserList />
 * </ContentLayout>
 */
export const ContentLayout = ({ children, title }: ContentLayoutProps) => {
  return (
    <>
      <Head title={title} />
      <div className="py-6">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 md:px-8">
          <h1 className="text-2xl font-semibold text-gray-900">{title}</h1>
        </div>
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 md:px-8">
          {children}
        </div>
      </div>
    </>
  );
};
