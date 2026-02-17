/**
 * Head SEO 组件
 *
 * 功能说明：
 * 使用 react-helmet-async 管理页面的 head 标签，
 * 包括标题、描述等 SEO 相关的 meta 信息。
 *
 * 特性：
 * - 动态设置页面标题
 * - 支持自定义描述
 * - 自动添加应用名称后缀
 */

import { Helmet, HelmetData } from 'react-helmet-async';

/**
 * Head 组件的 Props 类型
 */
type HeadProps = {
  /** 页面标题 */
  title?: string;
  /** 页面描述 */
  description?: string;
};

/**
 * HelmetData 实例
 * 用于服务端渲染时的数据收集
 */
const helmetData = new HelmetData({});

/**
 * Head SEO 组件
 *
 * @param title - 页面标题，会自动添加应用名称后缀
 * @param description - 页面描述，用于 SEO
 *
 * @example
 * <Head title="登录" description="用户登录页面" />
 * // 渲染结果: <title>登录 | Ello</title>
 */
export const Head = ({ title = '', description = '' }: HeadProps = {}) => {
  return (
    <Helmet
      helmetData={helmetData}
      title={title ? `${title} | Ello` : undefined}
      defaultTitle="Ello"
    >
      <meta name="description" content={description} />
    </Helmet>
  );
};
