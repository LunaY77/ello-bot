# Ello Bot

A personal LLM application platform, inspired by OpenClaw, for building and managing personal AI workflows and chat applications.

## Project Structure

```
ello-bot/
├── backend/    # FastAPI backend service
└── frontend/   # React frontend (in development)
```

## Quick Start

### Prerequisites

- Python 3.12+ and [uv](https://docs.astral.sh/uv/)
- Node.js 18+ and [pnpm](https://pnpm.io/)
- Docker (for PostgreSQL)

### 1. Install dependencies and git hooks

```bash
make setup
```

### 2. Start the Database

```bash
make docker-up
```

### 3. Configure Environment

```bash
cp backend/.env.example backend/.env
# Edit backend/.env with your settings
cp frontend/.env.example frontend/.env
# Edit frontend/.env with your settings
```

### 4. Run Database Migrations

```bash
make db-upgrade
```

### 5. Start the Backend

```bash
make backend-run
```

### 6. Start the Frontend

```bash
make frontend-dev
```

### All Available Commands

Run `make help` or refer to the table below.

| Command                       | Description                                 |
| ----------------------------- | ------------------------------------------- |
| `make setup`                  | Install all deps and git hooks              |
| `make docker-up`              | Start PostgreSQL via Docker Compose         |
| `make docker-down`            | Stop and remove containers                  |
| `make backend-run`            | Start FastAPI dev server (port 8000)        |
| `make backend-test`           | Run backend tests                           |
| `make backend-lint`           | Lint fix + format backend code (ruff)       |
| `make backend-check`          | Lint check backend code (ruff, no fix)      |
| `make frontend-dev`           | Start frontend dev server                   |
| `make frontend-build`         | Build frontend for production               |
| `make db-upgrade`             | Apply all pending migrations                |
| `make db-migration msg="..."` | Generate a new migration                    |
| `make lint`                   | Lint fix + format both frontend and backend |
| `make check`                  | Lint check both frontend and backend        |

## License

Apache-2.0
