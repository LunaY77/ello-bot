# E2E Test Authentication Setup

This directory contains the authentication setup for Playwright E2E tests.

## Overview

The authentication setup follows Playwright's recommended pattern for handling authentication:

1. **Setup Phase** (`auth.setup.ts`): Runs once before all tests
2. **Test Phase** (`*.spec.ts`): All tests use the saved authentication state

## How It Works

### Authentication Setup (`auth.setup.ts`)

The setup file performs the following steps:

1. **Generate Test User**: Creates a unique test user with random credentials using `@ngneat/falso`
2. **Register**: Registers the user via the registration form
3. **Logout**: Logs out to clear any session state
4. **Login**: Logs in with the same credentials
5. **Verify Token**: Confirms the JWT token is stored in `localStorage` as `ELLO_AUTH_TOKEN`
6. **Save State**: Saves the authentication state to `e2e/.auth/user.json`

### Test Execution

All test files (`*.spec.ts`) automatically:
- Use the saved authentication state from `e2e/.auth/user.json`
- Start with the user already logged in
- Have access to the JWT token in localStorage
- Skip the login flow entirely

## Configuration

The `playwright.config.ts` is configured with:

```typescript
projects: [
  { name: 'setup', testMatch: /.*\.setup\.ts/ },
  {
    name: 'chromium',
    testMatch: /.*\.spec\.ts/,
    use: {
      storageState: 'e2e/.auth/user.json',
    },
    dependencies: ['setup'],
  },
]
```

## Running Tests

```bash
# Run all E2E tests (setup runs automatically first)
pnpm test:e2e

# Run specific test file
pnpm test:e2e example.spec.ts

# Run in UI mode for debugging
pnpm playwright test --ui
```

## Mock Server

Tests use the mock API server running on port 8080:

```bash
# Start mock server (in separate terminal)
pnpm run-mock-server
```

The mock server provides:
- `POST /auth/register` - User registration
- `POST /auth/login` - User login
- `POST /auth/logout` - User logout
- Other API endpoints for testing

## Writing Tests

When writing new tests, you don't need to handle authentication:

```typescript
import { test, expect } from '@playwright/test';

test('my test', async ({ page }) => {
  // User is already authenticated!
  await page.goto('/dashboard');

  // Your test logic here
});
```

## Troubleshooting

### Setup Fails

If the setup fails:
1. Ensure the mock server is running on port 8080
2. Check that the dev server is running on port 3000
3. Verify the registration/login forms match the selectors in `auth.setup.ts`

### Tests Can't Access Protected Routes

If tests are redirected to login:
1. Check that `e2e/.auth/user.json` exists and contains valid state
2. Verify the token is being stored as `ELLO_AUTH_TOKEN` in localStorage
3. Ensure the test project has `dependencies: ['setup']` in `playwright.config.ts`

### Clean State

To reset authentication state:

```bash
rm e2e/.auth/user.json
pnpm test:e2e
```

This will trigger a fresh setup run.
