/**
 * Environment Variables Configuration Module
 *
 * [Core Features]
 * - Centrally manage environment variables for frontend application
 * - Use Zod for runtime type validation to ensure environment variables' safety and correctness
 *
 * [Important Notes]
 * Frontend environment variables are fundamentally different from backend:
 * - Build-time injection: Frontend env vars are bundled into the bundle at build time, cannot be modified dynamically
 * - Client-side visible: All environment variables are exposed to the browser, never store sensitive information
 * - Naming convention: Vite requires client env variables to start with VITE_ prefix
 */

import * as z from 'zod';

/**
 * Create and validate environment variables configuration
 *
 * [Execution Flow]
 * 1. Define Zod Schema (data validation schema)
 * 2. Extract variables with VITE_APP_ prefix from import.meta.env
 * 3. Validate variables using Schema
 * 4. Throw detailed error message if validation fails
 * 5. Return type-safe environment variables object if validation succeeds
 *
 * @returns Type-validated environment variables object
 * @throws Throws error when environment variables are missing or have incorrect types
 */
const createEnv = () => {
  // Define validation Schema for environment variables
  const EnvSchema = z.object({
    // API base URL (required)
    // Example: https://api.example.com
    API_URL: z.string(),

    // Whether to enable API Mocking (optional, default false)
    ENABLE_API_MOCKING: z
      .string()
      .refine((s) => s === 'true' || s === 'false')
      .transform((s) => s === 'true')
      .optional(),

    // Mock API server port (optional, default 8080)
    // Only used when ENABLE_API_MOCKING is true, should not conflict with frontend dev server port
    APP_MOCK_API_PORT: z.string().optional().default('8080'),

    // Application base URL (optional, default localhost:3000)
    APP_URL: z.string().optional().default('http://localhost:3000'),
  });

  // Extract and filter variables from Vite's environment variables
  // import.meta.env: Environment variables object provided by Vite
  const envVars = Object.entries(import.meta.env).reduce<
    Record<string, string>
  >((acc, curr) => {
    const [key, value] = curr;
    // Only extract variables with VITE_APP_ prefix and remove the prefix
    // Example: VITE_APP_API_URL -> API_URL
    if (key.startsWith('VITE_APP_')) {
      acc[key.replace('VITE_APP_', '')] = value;
    }
    return acc;
  }, {});

  // Use safeParse for safe parsing
  const parsedEnv = EnvSchema.safeParse(envVars);

  // Throw detailed error message when validation fails
  if (!parsedEnv.success) {
    throw new Error(
      `Invalid environment variables configuration.
The following variables are missing or have incorrect format:
${Object.entries(parsedEnv.error.flatten().fieldErrors)
  .map(([k, v]) => `- ${k}: ${v}`)
  .join('\n')}
`,
    );
  }

  // Return validated and type-inferred environment variables
  return parsedEnv.data;
};

// Export singleton environment variables object
// Validated once at application startup, access all environment variables through this object
export const env = createEnv();
