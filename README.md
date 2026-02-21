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

### 1. Start the Database

```bash
make docker-up
```

### 2. Configure Environment

```bash
cp backend/.env.example backend/.env
# Edit backend/.env with your settings
```

### 3. Run Database Migrations

```bash
make db-upgrade
```

### 4. Start the Backend

```bash
make backend-run
```

### 5. Start the Frontend

```bash
make frontend-dev
```

### All Available Commands

Run `make help` or refer to the table below.

| Command | Description |
|---------|-------------|
| `make docker-up` | Start PostgreSQL via Docker Compose |
| `make docker-down` | Stop and remove containers |
| `make backend-run` | Start FastAPI dev server (port 8000) |
| `make backend-test` | Run backend tests |
| `make backend-lint` | Lint and format backend code |
| `make frontend-dev` | Start frontend dev server |
| `make frontend-build` | Build frontend for production |
| `make db-upgrade` | Apply all pending migrations |
| `make db-migration msg="..."` | Generate a new migration |
| `make lint` | Lint both frontend and backend |
| `make format` | Format both frontend and backend |

## License

Apache-2.0
