# Frontend E2E Tests

These Playwright tests run against the real backend test stack.

## Projects

- `authenticated-chromium`: uses `auth.setup.ts` to seed a real session in `ELLO_AUTH_SESSION`
- `public-chromium`: exercises public pages without preloaded auth state

## Running

Preferred:

```bash
make frontend-test-e2e
```

Direct Playwright usage is also supported if the real backend test service is already running on `http://localhost:8001`:

```bash
cd frontend
PLAYWRIGHT_API_URL=http://localhost:8001/api pnpm run test:e2e
```

## Writing Tests

- Use `e2e/fixtures/auth.ts` to create users through the public IAM API.
- Persist browser auth by writing `ELLO_AUTH_SESSION`, not legacy token keys.
- Keep true backend setup in Playwright or Makefile, not in Vitest.
