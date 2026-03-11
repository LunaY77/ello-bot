# Ello Bot Frontend

React 19 + TypeScript frontend for Ello Bot. The current application is a Vite SPA with public landing/auth pages and protected `/app` routes for dashboard, users, profile, and IAM management.

## Stack

- React 19
- React Router 7
- TypeScript with strict checking
- Vite 6
- TanStack Query + `react-query-auth`
- Zustand
- Axios
- Tailwind CSS
- Zod + `react-hook-form`
- i18next + `react-i18next`
- Orval for OpenAPI code generation
- Vitest, Playwright, Storybook

## Project Layout

```text
src/
├── app/                  # App shell, providers, route modules
├── api/                  # OpenAPI-generated models and schemas
├── features/             # auth, users, iam, chat
├── components/           # shared UI, layouts, notifications, errors
├── lib/                  # api-client, auth, react-query, i18n
├── store/                # persisted auth session state
├── config/               # env and route configuration
├── testing/              # Vitest helpers and provider wrappers
└── locales/              # default locale resources
```

Related non-`src` directories:

- `e2e/` for Playwright tests
- `.storybook/` for Storybook configuration
- `locales/` for generated translation JSON output

## Quick Start

### 1. Prerequisites

- Node.js 18+
- pnpm 10+
- Backend API available locally

### 2. Install dependencies

```bash
cd frontend
pnpm install
```

### 3. Create `.env`

```bash
cp .env.example .env
```

Default values:

```env
VITE_APP_API_URL=http://localhost:8000/api
VITE_APP_URL=http://localhost:3000
```

### 4. Start the dev server

From the repository root:

```bash
make frontend-dev
```

Or directly:

```bash
cd frontend
pnpm run dev
```

The Vite dev server runs on `http://localhost:3000` and proxies `/api` and `/static` to the backend origin derived from `VITE_APP_API_URL`.

## Common Commands

From the repository root:

```bash
make frontend-dev
make frontend-build
make frontend-check
make frontend-lint
make frontend-test-unit
make frontend-test-e2e
```

From `frontend/`:

```bash
pnpm run dev
pnpm run build
pnpm run preview
pnpm run lint
pnpm run lint:fix
pnpm run format
pnpm run check-types
pnpm run test
pnpm run test:unit
pnpm run test:e2e
pnpm run test:e2e:ui
pnpm run storybook
pnpm run build-storybook
pnpm run codegen:api
pnpm run i18n
```

## Auth and Data Flow

- The client persists `accessToken` and `refreshToken` in Zustand under `ELLO_AUTH_SESSION`.
- `src/lib/api-client.ts` attaches the access token automatically.
- A 401 response triggers one refresh attempt with the stored refresh token.
- If refresh fails, the session is cleared and the user is redirected to login.
- Server-backed viewer data is managed through React Query and `react-query-auth`, not stored wholesale in Zustand.

## API Contract Sync

When backend contracts change, run:

```bash
make sync-api
```

Manual flow:

```bash
cd backend && uv run gen-openapi
cd frontend && pnpm run codegen:api
```

Do not hand-edit files in `src/api/models/` or `src/api/schemas/`.

## Testing Strategy

### Vitest

- Uses `jsdom`
- Network access is intentionally blocked in `src/testing/setup-tests.ts`
- Best for component logic, hooks, stores, and pure UI behavior

### Playwright

- Covers flows that require real HTTP and a real backend
- `make frontend-test-e2e` starts the backend E2E stack from `docker-compose.test.yaml`
- The frontend test server runs on port `3000`
- The backend E2E API is exposed on `http://localhost:8001/api`

### Storybook

- Start locally with `pnpm run storybook`
- Build static docs with `pnpm run build-storybook`

## i18n Workflow

1. Update default locale files in `src/locales/default/`
2. Run:

```bash
cd frontend
pnpm run i18n
```

Generated locale JSON files are written to `frontend/locales/`.

## Frontend Conventions

- Keep route modules thin and move business logic into feature hooks/components.
- Use route definitions from `src/config/paths.ts`.
- Use `frontend/AGENTS.md` as the source of truth for AI-assisted frontend changes.
