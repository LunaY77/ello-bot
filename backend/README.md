# Ello Bot Backend

FastAPI backend service for Ello Bot, a personal LLM application platform.

## Tech Stack

- Python 3.12
- FastAPI
- SQLAlchemy 2.x async ORM
- PostgreSQL
- Redis
- Alembic
- Pydantic v2 + pydantic-settings
- Loguru
- uv

## Project Layout

```text
app/
├── main.py              # FastAPI app, lifespan, bootstrap, health check
├── core/                # config, db, redis, auth, exceptions, logging, Result
├── modules/iam/         # auth, tenants, RBAC, ACL, agent management
├── infra/               # infrastructure
├── static/              # default avatars and other static assets
├── tools/scripts.py     # lint/check/gen-openapi
└── utils/               # auth helpers and security utilities
```

## Quick Start

### 1. Prerequisites

- Python 3.12+
- `uv`
- Docker Desktop or a compatible Docker runtime

### 2. Start local PostgreSQL and Redis

From the repository root:

```bash
make docker-dev-up
```

This starts:

- PostgreSQL on `localhost:5432`
- Redis on `localhost:6379` with password `12345678`

### 3. Install Python dependencies

```bash
cd backend
uv sync
```

### 4. Create `.env`

```bash
cp .env.example .env
```

If you use `make docker-dev-up`, update the connection settings to match the dev compose stack:

```env
DEBUG=true
DB_URL=postgresql+asyncpg://ello:12345678@localhost:5432/ello
REDIS_URL=redis://:12345678@localhost:6379/0
BOOTSTRAP_ENABLED=true
BOOTSTRAP_ADMIN_PASSWORD=change-this-bootstrap-password
```

Important notes:

- When bootstrap is enabled outside debug mode, `BOOTSTRAP_ADMIN_PASSWORD` must be set.

### 5. Apply migrations and run the server

From the repository root:

```bash
make backend-run
```

`make backend-run` automatically runs `alembic upgrade head` before starting Uvicorn.

### 6. Useful endpoints

- API docs: `http://localhost:8000/docs`
- Health check: `http://localhost:8000/health`
- Static assets: `http://localhost:8000/static/...`

## Common Commands

From the repository root:

```bash
make backend-run
make backend-lint
make backend-check
make backend-test
make db-upgrade
make db-downgrade
```

Generate the OpenAPI document:

```bash
cd backend
uv run gen-openapi
```

The generated file is written to `docs/api/openapi.json` at the repository root.

## Testing

`make backend-test` uses `docker-compose.test.yaml` and runs:

- `tests/unit`
- `tests/integration`

Integration tests use a dedicated PostgreSQL database on host port `5433` and a dedicated Redis instance on host port `6380`. The shared fixtures in `tests/conftest.py` handle migrations, app lifespan, and state cleanup.

## Backend Conventions

- Keep routers thin. HTTP handlers should delegate to `workflow.py`, `commands.py`, or `queries.py`.
- Use `DbSession`, `RedisDep`, and `CurrentAuthDep` for dependency injection.
- Return `Result[T]` from APIs and raise `BusinessException` / `AuthException` for failures.
- Avoid lazy loading. IAM relationships are configured with `lazy="raise"`, so queries must preload the graph they need.
- Treat `backend/AGENTS.md` as the source of truth for AI-assisted backend changes.

## Related Docs

- `backend/AGENTS.md`
- `backend/docs/`
- `docs/api/openapi.json` after running `uv run gen-openapi`
