/**
 * 开关状态管理 Hook
 *
 * 功能说明：
 * 本 Hook 用于管理布尔状态的开关，常用于：
 * - 模态框（Modal）的显示/隐藏
 * - 下拉菜单的展开/收起
 * - 侧边栏的打开/关闭
 * - 任何需要切换状态的场景
 *
 * 为什么需要这个 Hook：
 * 1. 避免在每个组件中重复编写 useState + 回调函数
 * 2. 提供统一的 API（open, close, toggle）
 * 3. 使用 useCallback 优化性能，避免不必要的重渲染
 */

import * as React from 'react';

/**
 * 开关状态管理 Hook
 *
 * @param initial - 初始状态，默认为 false（关闭）
 * @returns 包含状态和操作方法的对象
 *
 * @example
 * // 基础用法
 * const { isOpen, open, close, toggle } = useDisclosure();
 *
 * // 模态框示例
 * function MyComponent() {
 *   const { isOpen, open, close } = useDisclosure();
 *
 *   return (
 *     <>
 *       <button onClick={open}>打开模态框</button>
 *       <Modal isOpen={isOpen} onClose={close}>
 *         <p>模态框内容</p>
 *       </Modal>
 *     </>
 *   );
 * }
 *
 * // 下拉菜单示例
 * function Dropdown() {
 *   const { isOpen, toggle } = useDisclosure();
 *
 *   return (
 *     <div>
 *       <button onClick={toggle}>
 *         {isOpen ? '收起' : '展开'}
 *       </button>
 *       {isOpen && <ul>...</ul>}
 *     </div>
 *   );
 * }
 */
export const useDisclosure = (initial = false) => {
  // 管理开关状态
  const [isOpen, setIsOpen] = React.useState(initial);

  // 打开操作
  // 使用 useCallback 确保函数引用稳定，避免子组件不必要的重渲染
  const open = React.useCallback(() => setIsOpen(true), []);

  // 关闭操作
  const close = React.useCallback(() => setIsOpen(false), []);

  // 切换操作
  // 使用函数式更新确保获取最新状态
  const toggle = React.useCallback(() => setIsOpen((state) => !state), []);

  return { isOpen, open, close, toggle };
};
