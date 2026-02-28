# Mock Server Infrastructure

This directory contains the mock API server infrastructure for testing and development.

## Overview

The mock server uses [MSW (Mock Service Worker)](https://mswjs.io/) and [@mswjs/data](https://github.com/mswjs/data) to provide a complete mock API implementation that can be used in:

- Unit tests (Vitest)
- Integration tests
- E2E tests (Playwright)
- Standalone development server

## Directory Structure

```
src/testing/
├── data-generators.ts       # Fake data generators using @ngneat/falso
├── mocks/
│   ├── db.ts               # In-memory database with @mswjs/data
│   ├── handlers.ts         # Combined MSW handlers
│   ├── server.ts           # MSW server for Node.js (tests)
│   ├── index.ts            # Public exports
│   └── handlers/
│       ├── auth.ts         # Authentication endpoints
│       ├── users.ts        # User endpoints
│       └── chat.ts         # Chat endpoints
├── mocks.test.ts           # Tests for mock infrastructure
└── setup-tests.ts          # Test setup with MSW initialization
```

## Usage

### In Unit Tests

The mock server is automatically initialized in `setup-tests.ts` and will intercept all API calls in your tests:

```typescript
import { render, screen } from '@testing-library/react';
import { LoginForm } from './LoginForm';

test('should login successfully', async () => {
  render(<LoginForm />);

  // Fill form and submit
  // The API call will be intercepted by MSW
  // Default test credentials: admin/password123
});
```

### Standalone Mock Server

Run the mock server as a standalone HTTP server on port 8080:

```bash
pnpm run-mock-server
```

This starts an Express server with all mock endpoints available at `http://localhost:8080`.

### In E2E Tests

Configure your E2E tests to use the mock server:

```bash
# Terminal 1: Start mock server
pnpm run-mock-server

# Terminal 2: Run E2E tests
pnpm test:e2e
```

## Available Endpoints

### Authentication

- `POST /auth/login` - Login with username/password
- `POST /auth/register` - Register new user
- `POST /auth/logout` - Logout current user

### Users

- `GET /users/me` - Get current user info (requires auth)
- `GET /users/:id` - Get user by ID
- `GET /users` - Get all users

### Chat

- `GET /chat/messages` - Get all messages (requires auth)
- `POST /chat/messages` - Create new message (requires auth)
- `GET /chat/messages/:id` - Get message by ID (requires auth)
- `DELETE /chat/messages/:id` - Delete message (requires auth)

## Test Credentials

The database is seeded with the following test users:

| Username | Password    | Role  |
| -------- | ----------- | ----- |
| admin    | password123 | admin |
| testuser | password123 | user  |
| john_doe | password123 | user  |

## Data Generators

Use the data generators to create realistic fake data:

```typescript
import { createUser, createChatMessage } from '@/testing/data-generators';

const user = createUser({ username: 'custom', role: 'admin' });
const message = createChatMessage({ content: 'Hello world' });
```

## Database Operations

Access the mock database directly in tests:

```typescript
import { db, seedDb, resetDb } from '@/testing/mocks';

// Query data
const users = db.user.findMany({});
const user = db.user.findFirst({ where: { username: { equals: 'admin' } } });

// Create data
db.user.create({ id: 999, username: 'newuser', ... });

// Reset to initial state
resetDb();
```

## Configuration

The mock server port can be configured via environment variable:

```bash
VITE_APP_MOCK_API_PORT=8080 pnpm run-mock-server
```

## Response Format

All responses follow the backend's `Result<T>` format:

```typescript
{
  code: 200,
  message: "Success",
  data: { ... }
}
```

The `api-client` automatically unwraps this format, so in your code you only see the `data` field.
