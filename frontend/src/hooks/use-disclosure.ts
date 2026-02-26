/**
 * Disclosure State Management Hook
 *
 * Feature Description:
 * This Hook is used to manage boolean toggle states, commonly used for:
 * - Modal show/hide
 * - Dropdown menu expand/collapse
 * - Sidebar open/close
 * - Any scenario that requires state toggling
 *
 * Why this Hook is needed:
 * 1. Avoid repetitive useState + callback function writing in each component
 * 2. Provide unified API (open, close, toggle)
 * 3. Use useCallback for performance optimization, avoiding unnecessary re-renders
 */

import * as React from 'react';

/**
 * Disclosure state management hook
 *
 * @param initial - Initial state, defaults to false (closed)
 * @returns Object containing state and operation methods
 *
 * @example
 * // Basic usage
 * const { isOpen, open, close, toggle } = useDisclosure();
 *
 * // Modal example
 * function MyComponent() {
 *   const { isOpen, open, close } = useDisclosure();
 *
 *   return (
 *     <>
 *       <button onClick={open}>Open Modal</button>
 *       <Modal isOpen={isOpen} onClose={close}>
 *         <p>Modal content</p>
 *       </Modal>
 *     </>
 *   );
 * }
 *
 * // Dropdown example
 * function Dropdown() {
 *   const { isOpen, toggle } = useDisclosure();
 *
 *   return (
 *     <div>
 *       <button onClick={toggle}>
 *         {isOpen ? 'Collapse' : 'Expand'}
 *       </button>
 *       {isOpen && <ul>...</ul>}
 *     </div>
 *   );
 * }
 */
export const useDisclosure = (initial = false) => {
  // Manage toggle state
  const [isOpen, setIsOpen] = React.useState(initial);

  // Open operation
  // Use useCallback to ensure stable function reference, avoiding unnecessary re-renders in child components
  const open = React.useCallback(() => setIsOpen(true), []);

  // Close operation
  const close = React.useCallback(() => setIsOpen(false), []);

  // Toggle operation
  // Use functional update to ensure getting the latest state
  const toggle = React.useCallback(() => setIsOpen((state) => !state), []);

  return { isOpen, open, close, toggle };
};
