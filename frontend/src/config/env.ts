/**
 * 环境变量配置模块
 *
 * 【核心功能】
 * - 集中管理前端应用的环境变量
 * - 使用 Zod 进行运行时类型验证，确保环境变量的安全性和正确性
 *
 * 【重要说明】
 * 前端环境变量与后端有本质区别：
 * - 构建时注入：前端环境变量在构建时被打包进 bundle，无法动态修改
 * - 客户端可见：所有环境变量都会暴露在浏览器端，绝不能存储敏感信息
 * - 命名约定：Vite 要求客户端环境变量必须以 VITE_ 前缀开头
 */

import * as z from 'zod';

/**
 * 创建并验证环境变量配置
 *
 * 【执行流程】
 * 1. 定义 Zod Schema（数据验证模式）
 * 2. 从 import.meta.env 提取 VITE_APP_ 前缀的变量
 * 3. 使用 Schema 验证变量
 * 4. 验证失败则抛出详细错误信息
 * 5. 验证成功则返回类型安全的环境变量对象
 *
 * @returns 经过类型验证的环境变量对象
 * @throws 当环境变量缺失或类型不正确时抛出错误
 */
const createEnv = () => {
  // 定义环境变量的验证 Schema
  const EnvSchema = z.object({
    // API 基础地址（必需）
    // 示例：https://api.example.com
    API_URL: z.string(),

    // 是否启用 API Mock（可选，默认 false）
    ENABLE_API_MOCKING: z
      .string()
      .refine((s) => s === 'true' || s === 'false')
      .transform((s) => s === 'true')
      .optional(),

    // 应用基础 URL（可选，默认 localhost:3000）
    APP_URL: z.string().optional().default('http://localhost:3000'),
  });

  // 从 Vite 的环境变量中提取并过滤变量
  // import.meta.env：Vite 提供的环境变量对象
  const envVars = Object.entries(import.meta.env).reduce<
    Record<string, string>
  >((acc, curr) => {
    const [key, value] = curr;
    // 只提取 VITE_APP_ 前缀的变量，并去掉前缀
    // 例如：VITE_APP_API_URL -> API_URL
    if (key.startsWith('VITE_APP_')) {
      acc[key.replace('VITE_APP_', '')] = value;
    }
    return acc;
  }, {});

  // 使用 safeParse 进行安全解析
  const parsedEnv = EnvSchema.safeParse(envVars);

  // 验证失败时抛出详细的错误信息
  if (!parsedEnv.success) {
    throw new Error(
      `环境变量配置无效。
以下变量缺失或格式不正确：
${Object.entries(parsedEnv.error.flatten().fieldErrors)
  .map(([k, v]) => `- ${k}: ${v}`)
  .join('\n')}
`,
    );
  }

  // 返回经过验证和类型推断的环境变量
  return parsedEnv.data;
};

// 导出单例环境变量对象
// 应用启动时验证一次，后续通过这个对象访问所有环境变量
export const env = createEnv();
