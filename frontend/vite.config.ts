/// <reference types="vitest" />
/// <reference types="vite/client" />

import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import viteTsconfigPaths from 'vite-tsconfig-paths';

/**
 * Vite 配置文件
 *
 * Vite 是新一代前端构建工具，相比 Webpack 具有以下优势：
 * - 开发服务器启动速度快（使用原生 ES Modules）
 * - 热更新（HMR）速度快
 * - 生产构建使用 Rollup，输出优化
 */
export default defineConfig({
  /**
   * 基础路径
   * './' 表示相对路径，用于部署到子目录的情况
   */
  base: './',

  /**
   * 插件配置
   */
  plugins: [
    /**
     * React 插件
     * 提供 Fast Refresh 和 JSX 支持
     */
    react(),

    /**
     * TypeScript 路径映射插件
     * 允许使用 @/* 别名，如 '@/components/Button'
     */
    viteTsconfigPaths(),
  ],

  /**
   * 开发服务器配置
   */
  server: {
    port: 3000,
  },

  /**
   * 预览服务器配置
   */
  preview: {
    port: 3000,
  },

  /**
   * 测试配置（Vitest）
   */
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/testing/setup-tests.ts',
    exclude: ['**/node_modules/**', '**/e2e/**'],
    coverage: {
      include: ['src/**'],
    },
  },

  /**
   * 依赖优化配置
   */
  optimizeDeps: {
    exclude: ['fsevents'],
  },

  /**
   * 生产构建配置
   */
  build: {
    rollupOptions: {
      external: ['fs/promises'],
      output: {
        experimentalMinChunkSize: 3500,
      },
    },
  },
});
