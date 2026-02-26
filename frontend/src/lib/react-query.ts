/**
 * React Query Configuration File
 *
 * Functionality:
 * - Configure global behavior of react-query
 * - Define type-safe Query and Mutation configuration types
 * - Unified management of API request type definitions
 *
 * Key Concepts:
 * - React Query (@tanstack/react-query): Library for managing server state
 * - Query: Fetch data (GET requests)
 * - Mutation: Modify data (POST, PUT, DELETE requests)
 * - Server state: Data stored on server, fetched via API
 *
 * Difference from useState:
 * - useState: Manages client state (UI interaction state, form inputs, etc.)
 * - React Query: Manages server state (user info, product list, etc.)
 * - Server state should not be placed in useState because it may be modified by other users or devices
 */

import {
  type UseMutationOptions,
  type DefaultOptions,
} from '@tanstack/react-query';

// ============================================
// React Query Global Configuration
// ============================================

/**
 * React Query Global Configuration
 *
 * Purpose:
 * - Set default behavior for all Query and Mutation
 * - Avoid repeating configuration for each API call
 *
 * Configuration Details:
 * - refetchOnWindowFocus: false - Do not automatically refetch when window gains focus
 *   - Default is true, but would frequently trigger unnecessary API requests
 *   - Setting to false reduces server load
 * - retry: false - Do not automatically retry on request failure
 *   - Default is 3, would retry 3 times on failure
 *   - Setting to false allows fast failure and error display
 * - staleTime: 1000 * 60 - Data is considered "fresh" within 60 seconds
 *   - Will not refetch data during this period
 *   - Reduces unnecessary API calls, improves performance
 */
export const queryConfig = {
  queries: {
    refetchOnWindowFocus: false,
    retry: false,
    staleTime: 1000 * 60, // 60 seconds
  },
} satisfies DefaultOptions;

// ============================================
// Type Utilities
// ============================================

/**
 * Extract return type of API function
 *
 * This is a TypeScript advanced type (Type-Level Programming)
 *
 * Purpose:
 * - Automatically infer the data type in the Promise returned by API function
 * - Avoid manual type maintenance, reduce errors
 *
 * Example:
 * ```ts
 * const getUser = (): Promise<User> => api.get('/auth/me');
 *
 * // ApiFnReturnType<typeof getUser> equals User
 * type UserType = ApiFnReturnType<typeof getUser>; // User
 * ```
 */
export type ApiFnReturnType<
  FnType extends (...args: never[]) => Promise<unknown>,
> = Awaited<ReturnType<FnType>>;

/**
 * Query Configuration Type
 *
 * Purpose:
 * - Provide type-safe configuration for useQuery hook
 * - Automatically infer the data type returned by useQuery
 *
 * Type Details:
 * - T is a function that returns useQuery configuration object
 * - Omit excludes queryKey and queryFn, keeping only other configuration options
 *
 * Usage Scenario:
 * ```ts
 * const useUsers = (config?: QueryConfig<typeof fetchUsers>) => {
 *   return useQuery({
 *     ...config,  // config type will be automatically inferred
 *     queryKey: ['users'],
 *     queryFn: fetchUsers,
 *   });
 * };
 * ```
 */
export type QueryConfig<T extends (...args: never[]) => unknown> = Omit<
  ReturnType<T>,
  'queryKey' | 'queryFn'
>;

/**
 * Mutation Configuration Type
 *
 * Purpose:
 * - Provide type-safe configuration for useMutation hook
 * - Automatically infer parameter and return value types of mutation function
 *
 * Type Details:
 * - MutationFnType: Mutation function type
 * - ApiFnReturnType<MutationFnType>: Mutation return value type (data after success)
 * - Error: Error type (fixed as Error)
 * - Parameters<MutationFnType>[0]: First parameter type of mutation function
 *
 * Usage Scenario:
 * ```ts
 * const useLogin = (config?: MutationConfig<typeof loginFn>) => {
 *   return useMutation({
 *     ...config,  // config type will be automatically inferred
 *     mutationFn: loginFn,
 *   });
 * };
 * ```
 */
export type MutationConfig<
  MutationFnType extends (...args: never[]) => Promise<unknown>,
> = UseMutationOptions<
  ApiFnReturnType<MutationFnType>, // Return value type
  Error, // Error type
  Parameters<MutationFnType>[0] // Parameter type
>;
