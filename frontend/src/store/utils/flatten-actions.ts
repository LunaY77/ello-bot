/**
 * Flattens multiple action objects (typically class instances) into a plain object.
 *
 * Solves the issue where class instances cannot be properly copied via the spread operator,
 * because prototype methods are not included.
 *
 * It walks the prototype chain via reflection, extracts all public methods, and binds
 * their `this` context to the original instance.
 *
 * @param actions - Array of action objects (typically class instances)
 * @returns A plain object containing all action methods/properties
 *
 * @example
 * ```ts
 * const store = {
 *   ...initialState,
 *   ...flattenActions([slice1(...params), slice2(...params)]),
 * };
 * ```
 */
export const flattenActions = <T extends object>(actions: object[]): T => {
  const result = {} as T;

  for (const action of actions) {
    // Walk the prototype chain to collect all methods/properties
    let current: object | null = action;
    while (current && current !== Object.prototype) {
      const keys = Object.getOwnPropertyNames(current);

      for (const key of keys) {
        if (key === 'constructor') continue;
        if (key in result) continue; // Skip existing keys (first action wins)

        const descriptor = Object.getOwnPropertyDescriptor(current, key);
        if (!descriptor) continue;

        if (typeof descriptor.value === 'function') {
          const bound = (
            descriptor.value as (...args: unknown[]) => unknown
          ).bind(action);

          Object.defineProperty(result, key, {
            value: bound,
            configurable: true,
            enumerable: true,
            writable: true,
          });
        } else {
          // Non-function property: copy the descriptor as-is
          Object.defineProperty(result, key, {
            ...descriptor,
            configurable: true,
            enumerable: true,
          });
        }
      }

      current = Object.getPrototypeOf(current);
    }
  }

  return result;
};
