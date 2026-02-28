# Ello Bot Frontend

React + TypeScript frontend for Ello Bot.

## Tech Stack

- **Framework**: React 19 + React Router 7
- **Build Tool**: Vite 6
- **Language**: TypeScript (strict mode)
- **Data Fetching**: TanStack Query + react-query-auth
- **State Management**: Zustand
- **Validation**: Zod + react-hook-form
- **Styling**: Tailwind CSS
- **i18n**: i18next + react-i18next
- **API Types/Schema**: Orval (OpenAPI codegen)

## Project Structure

```
src/
├── app/              # App shell, providers, and route tree
├── api/              # OpenAPI-generated request/response models and schemas
├── features/         # Feature modules (auth, users, chat)
├── components/       # Shared UI and layout components
├── lib/              # Infrastructure (api-client, auth, react-query, i18n)
├── store/            # Client-only global state (e.g. auth token)
├── config/           # App config (paths, env)
└── locales/          # Default locale resources
```

## Getting Started

### Prerequisites

- Node.js 18+
- pnpm 10+
- Backend API running (default: `http://localhost:8000`)

### Install Dependencies

```bash
cd frontend && pnpm install
```

### Configure Environment

Copy `.env.example` to `.env`:

```bash
cp frontend/.env.example frontend/.env
```

Key variables:

```env
VITE_APP_API_URL=http://localhost:8000/api
VITE_APP_ENABLE_API_MOCKING=false
VITE_APP_MOCK_API_PORT=8080
VITE_APP_URL=http://localhost:3000
```

### Start Development Server

```bash
make frontend-dev
```

or:

```bash
cd frontend && pnpm run dev
```

## Available Scripts

| Command | Description |
| --- | --- |
| `pnpm run dev` | Start Vite dev server |
| `pnpm run build` | Type-check and build production bundle |
| `pnpm run preview` | Preview production build locally |
| `pnpm run lint` | Run ESLint |
| `pnpm run lint:fix` | Run ESLint with auto-fix |
| `pnpm run format` | Format files with Prettier |
| `pnpm run check-types` | Run TypeScript type check |
| `pnpm run test` | Run Vitest |
| `pnpm run test:coverage` | Run tests with coverage |
| `pnpm run codegen:api` | Generate API models/schemas from OpenAPI |
| `pnpm run i18n` | Run i18n workflow and format locale output |

## API Contract Sync

When backend API contracts change:

```bash
make sync-api
```

or run manually:

```bash
cd backend && uv run gen-openapi
cd frontend && pnpm run codegen:api
```

## i18n Workflow

1. Update default locale files in `src/locales/default/*.ts`
2. Run:

```bash
cd frontend && pnpm run i18n
```

This generates locale JSON files under `frontend/locales/`.

## Code Quality

```bash
make frontend-lint    # format + lint fix
make frontend-check   # lint only
```

## Development Guidelines

See [AGENTS.md](./AGENTS.md).
