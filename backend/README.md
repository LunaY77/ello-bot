# Ello Bot Backend

FastAPI backend service for Ello Bot, a personal LLM application platform.

## Tech Stack

- **Framework**: FastAPI
- **ORM**: SQLAlchemy 2.x (sync)
- **Migrations**: Alembic
- **Validation**: Pydantic v2
- **Auth**: JWT (PyJWT + bcrypt)
- **Logging**: Loguru
- **Package Manager**: uv

## Project Structure

```
app/
├── core/          # Infrastructure (config, database, exceptions, logging, Result)
├── model/         # SQLAlchemy ORM models
├── schema/        # Pydantic request/response schemas
├── repository/    # Data access layer (CRUD)
├── service/       # Business logic layer
├── router/        # HTTP routing layer
└── utils/         # Utilities (JWT, password hashing)
```

## Getting Started

### Prerequisites

- Python 3.12+
- uv

### Install Dependencies

```bash
cd backend && uv sync
```

### Configure Environment

Copy `.env.example` to `.env` and fill in the values:

```bash
cp backend/.env.example backend/.env
```

Key settings:

```env
DATABASE_URL=postgresql://user:password@localhost/ello_bot
SECRET_KEY=your-secret-key-here
DEBUG=false
```

### Run Database Migrations

```bash
make db-upgrade
```

### Start Development Server

```bash
make backend-run
```

Visit `http://localhost:8000/docs` for the interactive API docs.

## Running Tests

```bash
make backend-test
```

## Code Quality

```bash
make backend-lint    # lint + format
make backend-check   # lint only (no fix)
```

## Development Guidelines

See [CLAUDE.md](./CLAUDE.md).

