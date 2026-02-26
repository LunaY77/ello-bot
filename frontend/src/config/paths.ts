/**
 * Route Configuration Module
 *
 * [Core Features]
 * - Centrally manage all route paths of the application
 * - Provide type-safe route access
 * - Separate route definition (path) from route generation logic (getHref)
 *
 * [Difference between path and getHref]
 * - path: Route path definition, used for configuring the routing system
 *   - Example: 'users/:userId' (with dynamic parameter :userId)
 *   - Usage: Passed to <Route path="..." /> component
 * - getHref: Function to generate actual URL for navigation links
 *   - Example: '/app/users/123' (replacing dynamic parameters with actual values)
 *   - Usage: Passed to <Link to="..." /> or navigate() function
 *
 * [Route Hierarchy]
 * - /: Home page (public access)
 * - /auth: Authentication pages (login, register)
 * - /app: Main application interface (requires authentication)
 *   - /app/dashboard: Dashboard
 *   - /app/users: User list
 *   - /app/profile: Profile
 */

/**
 * Route Configuration Object
 *
 * [Purpose of as const]
 * - TypeScript type assertion, making the object read-only
 * - Enables more precise type inference (literal types instead of broad string types)
 * - Prevents accidental runtime modifications to route configuration
 */
export const paths = {
  // ==================== Public Pages ====================

  /**
   * Home route
   * Usage: Entry page of the application, typically displays product intro or prompts user to login
   */
  home: {
    path: '/',
    getHref: () => '/',
  },

  // ==================== Authentication Pages ====================

  /**
   * Authentication page group
   * Contains user registration and login functionality
   */
  auth: {
    /**
     * Registration page
     * @param redirectTo - Path to redirect after successful registration (optional)
     */
    register: {
      path: '/auth/register',
      getHref: (redirectTo?: string | null | undefined) =>
        `/auth/register${redirectTo ? `?redirectTo=${encodeURIComponent(redirectTo)}` : ''}`,
    },

    /**
     * Login page
     * @param redirectTo - Path to redirect after successful login (optional)
     */
    login: {
      path: '/auth/login',
      getHref: (redirectTo?: string | null | undefined) =>
        `/auth/login${redirectTo ? `?redirectTo=${encodeURIComponent(redirectTo)}` : ''}`,
    },
  },

  // ==================== Main Application (Requires Authentication) ====================

  /**
   * Application main interface group
   * All routes are prefixed with /app and need to be nested in route configuration
   */
  app: {
    /**
     * Application root route
     */
    root: {
      path: '/app',
      getHref: () => '/app',
    },

    /**
     * Dashboard page
     * Empty path string indicates default sub-route
     */
    dashboard: {
      path: '',
      getHref: () => '/app',
    },

    /**
     * Users list page
     */
    users: {
      path: 'users',
      getHref: () => '/app/users',
    },

    /**
     * User detail page
     * @param id - User's unique identifier
     */
    user: {
      path: 'users/:userId',
      getHref: (id: string) => `/app/users/${id}`,
    },

    /**
     * Profile page
     */
    profile: {
      path: 'profile',
      getHref: () => '/app/profile',
    },
  },
} as const;
