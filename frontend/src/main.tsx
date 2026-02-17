/**
 * main.tsx 应用入口文件
 *
 * 功能说明：
 * React 应用的入口点，负责将 App 组件挂载到 DOM。
 */

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import { App } from './app';
import './index.css';

/**
 * 挂载 React 应用到 DOM
 * 使用 StrictMode 启用严格模式，帮助发现潜在问题
 */
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
