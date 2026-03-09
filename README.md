# Ello Bot

A personal LLM application platform, inspired by OpenClaw, for building and managing personal AI workflows and chat applications.

## Project Structure

```
ello-bot/
├── backend/    # FastAPI backend service
└── frontend/   # React frontend
```

## Quick Start

### Prerequisites

- Python 3.12+ and [uv](https://docs.astral.sh/uv/)
- Node.js 18+ and [pnpm](https://pnpm.io/)
- Docker

### Install dependencies and git hooks

```bash
make setup
```

---

## Mode 1 — Local (one-click, all in Docker)

Everything runs in containers. No local Python/Node environment needed after `make setup`.

```bash
# Build images, run migrations, start all services
make docker-local-up
```

Services started:

| Service  | Address                |
| -------- | ---------------------- |
| Frontend | http://localhost:3000  |
| Backend  | http://localhost:8000  |

```bash
make docker-local-logs   # tail logs
make docker-local-down   # stop and remove volumes
make docker-local-reset  # wipe and restart (re-runs migrations)
```

---

## Mode 2 — Dev (native backend + frontend, Docker for infra)

Run backend and frontend natively for hot-reload and debugger support. Docker provides only PostgreSQL and Redis.

### 1. Start infrastructure

```bash
make docker-dev-up
```

### 2. Configure environment

```bash
cp backend/.env.example backend/.env
# Edit backend/.env with your settings (DB_URL, JWT_SECRET_KEY, etc.)
```

### 3. Run database migrations

```bash
make db-upgrade
```

### 4. Start backend and frontend

```bash
# In separate terminals:
make backend-run    # http://localhost:8000
make frontend-dev   # http://localhost:3000
```

```bash
make docker-dev-down     # stop infra and remove volumes
make docker-dev-reset    # wipe and restart infra
```

### Optional: dev with distributed tracing

```bash
make docker-dev-obs-up   # start infra + Jaeger + OTEL Collector
# Set OTEL_ENABLED=true in backend/.env, then make backend-run
# Jaeger UI: http://localhost:16686
make docker-dev-obs-down
```

---

## All Commands

```bash
make help
```

| Command                        | Description                                              |
| ------------------------------ | -------------------------------------------------------- |
| `make setup`                   | Install all deps and git hooks                           |
| **Docker — Local full stack**  |                                                          |
| `make docker-local-up`         | Build images, run migrations, start all services         |
| `make docker-local-down`       | Stop and remove local stack volumes                      |
| `make docker-local-logs`       | Tail local stack logs                                    |
| `make docker-local-reset`      | Wipe volumes and restart (re-runs migrations)            |
| **Docker — Dev infra**         |                                                          |
| `make docker-dev-up`           | Start postgres + redis for native dev                    |
| `make docker-dev-down`         | Stop and remove dev infra volumes                        |
| `make docker-dev-logs`         | Tail dev infra logs                                      |
| `make docker-dev-reset`        | Wipe and restart dev infra                               |
| **Docker — Observability**     |                                                          |
| `make docker-obs-up`           | Start Jaeger + OTEL Collector                            |
| `make docker-obs-down`         | Stop observability stack                                 |
| `make docker-obs-logs`         | Tail observability logs                                  |
| **Docker — Combined**          |                                                          |
| `make docker-dev-obs-up`       | Start dev infra + observability (native dev with tracing)|
| `make docker-dev-obs-down`     | Stop dev infra + observability                           |
| **Backend**                    |                                                          |
| `make backend-run`             | Start FastAPI dev server (port 8000)                     |
| `make backend-lint`            | Ruff lint (fix) + format                                 |
| `make backend-check`           | Ruff lint (check only)                                   |
| `make backend-test`            | Run backend tests                                        |
| **Frontend**                   |                                                          |
| `make frontend-dev`            | Start frontend dev server (port 3000)                    |
| `make frontend-build`          | Build frontend for production                            |
| `make frontend-lint`           | Prettier format + ESLint fix                             |
| `make frontend-check`          | ESLint check                                             |
| **Database**                   |                                                          |
| `make db-upgrade`              | Apply all pending migrations                             |
| `make db-downgrade`            | Roll back one migration                                  |
| `make db-migration msg="..."`  | Generate a new migration                                 |
| `make db-migrate msg="..."`    | Generate + apply migration in one step                   |
| **Combined**                   |                                                          |
| `make lint`                    | Lint + format both backend and frontend                  |
| `make check`                   | Check both backend and frontend                          |
| `make sync-api`                | Generate OpenAPI spec and codegen frontend client        |

## License

Apache-2.0
