SHELL := /bin/bash

.PHONY: help \
	setup \
	backend-run backend-lint backend-check backend-test \
	docker-local-up docker-local-down docker-local-logs docker-local-reset \
	docker-dev-up docker-dev-down docker-dev-logs docker-dev-reset \
	docker-obs-up docker-obs-down docker-obs-logs \
	docker-prod-up docker-prod-down docker-prod-logs \
	docker-dev-obs-up docker-dev-obs-down \
	frontend-dev frontend-build frontend-lint frontend-check frontend-test-unit frontend-test-e2e \
	lint check test \
	db-migration db-upgrade db-downgrade db-migrate \
	sync-api

help:
	@echo "Targets:"
	@echo ""
	@echo "  make setup                Install all deps and git hooks"
	@echo ""
	@echo "  [Docker — Dev infra: postgres + redis only]"
	@echo "  make docker-dev-up        Start dev infrastructure (run backend/frontend natively)"
	@echo "  make docker-dev-down      Stop and remove dev infrastructure volumes"
	@echo "  make docker-dev-logs      Tail dev infrastructure logs"
	@echo "  make docker-dev-reset     Wipe and restart dev infrastructure"
	@echo ""
	@echo "  [Docker — Local full stack: all services in containers]"
	@echo "  make docker-local-up      Start local full stack (build + run all services)"
	@echo "  make docker-local-down    Stop and remove local full stack volumes"
	@echo "  make docker-local-logs    Tail local full stack logs"
	@echo "  make docker-local-reset   Wipe and restart local full stack"
	@echo ""
	@echo "  [Docker — Observability: Jaeger + OTEL Collector]"
	@echo "  make docker-obs-up        Start observability stack"
	@echo "  make docker-obs-down      Stop observability stack"
	@echo "  make docker-obs-logs      Tail observability logs"
	@echo ""
	@echo "  [Docker — Production]"
	@echo "  make docker-prod-up       Start production stack"
	@echo "  make docker-prod-down     Stop production stack"
	@echo "  make docker-prod-logs     Tail production stack logs"
	@echo ""
	@echo "  [Docker — Combined]"
	@echo "  make docker-dev-obs-up    Start dev infra + observability (native dev with tracing)"
	@echo "  make docker-dev-obs-down  Stop dev infra + observability"
	@echo ""
	@echo "  [Backend]"
	@echo "  make backend-run          Apply migrations and run FastAPI dev server"
	@echo "  make backend-lint         Ruff lint (fix) + format"
	@echo "  make backend-check        Ruff lint (check only)"
	@echo "  make backend-test         Build test image, run backend unit+integration tests, then destroy test infra"
	@echo ""
	@echo "  [Frontend]"
	@echo "  make frontend-lint        Prettier format + ESLint fix"
	@echo "  make frontend-check       ESLint check"
	@echo "  make frontend-test-unit   Run frontend Vitest unit tests"
	@echo "  make frontend-test-e2e    Run Playwright against the real backend test stack"
	@echo ""
	@echo "  [Combined]"
	@echo "  make lint                 Lint+format both frontend & backend"
	@echo "  make check                Check both frontend & backend"
	@echo "  make sync-api             Generate OpenAPI spec then codegen frontend client"

# ---------- Setup ----------
setup:
	cd backend && uv sync
	cd backend && uv run pre-commit install --install-hooks
	cd frontend && pnpm install

# ---------- Docker: Local full stack (all services in containers) ----------
docker-local-up:
	docker compose -f docker-compose.local.yaml up -d postgres redis
	docker compose -f docker-compose.local.yaml run --rm --build backend uv run alembic upgrade head
	docker compose -f docker-compose.local.yaml up -d --build

docker-local-down:
	docker compose -f docker-compose.local.yaml down -v

docker-local-logs:
	docker compose -f docker-compose.local.yaml logs -f

# Danger: wipes all local full stack volumes
docker-local-reset:
	docker compose -f docker-compose.local.yaml down -v
	docker compose -f docker-compose.local.yaml up -d postgres redis
	docker compose -f docker-compose.local.yaml run --rm --build backend uv run alembic upgrade head
	docker compose -f docker-compose.local.yaml up -d --build

# ---------- Docker: Dev infra (postgres + redis, run backend/frontend natively) ----------
docker-dev-up:
	docker compose -f docker-compose.dev.yaml up -d

docker-dev-down:
	docker compose -f docker-compose.dev.yaml down -v

docker-dev-logs:
	docker compose -f docker-compose.dev.yaml logs -f

# Danger: wipes dev infra volumes
docker-dev-reset:
	docker compose -f docker-compose.dev.yaml down -v
	docker compose -f docker-compose.dev.yaml up -d

# ---------- Docker: Observability (Jaeger + OTEL Collector) ----------
docker-obs-up:
	docker compose -f docker-compose.observability.yaml up -d

docker-obs-down:
	docker compose -f docker-compose.observability.yaml down

docker-obs-logs:
	docker compose -f docker-compose.observability.yaml logs -f

# ---------- Docker: Production ----------
docker-prod-up:
	docker compose -f docker-compose.prod.yaml up -d

docker-prod-down:
	docker compose -f docker-compose.prod.yaml down

docker-prod-logs:
	docker compose -f docker-compose.prod.yaml logs -f

# ---------- Docker: Combined ----------
# Start dev infra + observability together for native dev with tracing enabled
docker-dev-obs-up: docker-dev-up docker-obs-up

docker-dev-obs-down:
	docker compose -f docker-compose.dev.yaml down -v
	docker compose -f docker-compose.observability.yaml down

# ---------- Backend (Python / uv) ----------
backend-run:
	cd backend && uv run alembic upgrade head
	cd backend && uv run ello-server

backend-check:
	cd backend && uv run check

backend-lint:
	cd backend && uv run lint

backend-test:
	@set -euo pipefail; \
	trap 'docker compose -f docker-compose.test.yaml down -v --remove-orphans' EXIT; \
	docker compose -f docker-compose.test.yaml up --build --abort-on-container-exit --exit-code-from backend-test backend-test

# ---------- Database Migrations (Alembic) ----------
db-migration:
	cd backend && uv run alembic revision --autogenerate -m "$(msg)"

db-upgrade:
	cd backend && uv run alembic upgrade head

db-downgrade:
	cd backend && uv run alembic downgrade -1

db-migrate: db-migration db-upgrade

# ---------- Frontend (React/Vite) ----------
frontend-dev:
	cd frontend && pnpm run dev

frontend-build:
	cd frontend && pnpm run build

frontend-check:
	cd frontend && pnpm run lint

frontend-test-unit:
	cd frontend && pnpm run test:unit

frontend-test-e2e:
	@set -euo pipefail; \
	trap 'cd $(CURDIR) && docker compose -f docker-compose.test.yaml down -v --remove-orphans' EXIT; \
	docker compose -f docker-compose.test.yaml up -d --wait postgres redis backend-e2e; \
	cd frontend && PLAYWRIGHT_API_URL=http://localhost:8001/api pnpm run test:e2e

frontend-lint:
	cd frontend && pnpm run format
	cd frontend && pnpm run lint:fix

# ---------- Combined ----------
lint: frontend-lint backend-lint

check: frontend-check backend-check

test: backend-test

sync-api:
	cd backend && uv run gen-openapi
	cd frontend && pnpm codegen:api
