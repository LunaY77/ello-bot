/**
 * App 应用入口组件
 *
 * 功能说明：
 * 应用的根组件，组合 AppProvider 和 AppRouter。
 */

import { AppProvider } from './provider';
import { AppRouter } from './router';

/**
 * App 根组件
 *
 * @example
 * // main.tsx
 * ReactDOM.createRoot(document.getElementById('root')!).render(
 *   <React.StrictMode>
 *     <App />
 *   </React.StrictMode>
 * );
 */
export const App = () => {
  return (
    <AppProvider>
      <AppRouter />
    </AppProvider>
  );
};
