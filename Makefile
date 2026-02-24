SHELL := /bin/bash

.PHONY: help \
	backend-run backend-lint backend-check backend-test \
	db-up db-down db-logs db-reset \
	frontend-dev frontend-build frontend-lint frontend-check \
	lint check test \
	db-migration db-upgrade db-downgrade db-migrate \
	sync-api

help:
	@echo "Targets:"
	@echo "  make docker-up           Start postgres (docker compose)"
	@echo "  make backend-run         Run FastAPI dev server"
	@echo "  make backend-lint        Ruff lint (fix) + format"
	@echo "  make backend-check       Ruff lint (check only)"
	@echo "  make frontend-lint       Prettier format + ESLint fix"
	@echo "  make frontend-check      ESLint check"
	@echo "  make lint                Lint+format both frontend & backend"
	@echo "  make check               Check both frontend & backend"
	@echo "  make sync-api            Generate OpenAPI spec then codegen frontend client"

# ---------- Docker  ----------
docker-up:
	docker compose up -d

docker-down:
	docker compose down -v

docker-logs:
	docker compose logs -f

# Danger: wipes local postgres data volume
docker-reset:
	docker compose down -v
	docker compose up -d

# ---------- Backend (Python / uv) ----------
backend-run:
	cd backend && uv run ello-server

backend-check:
	cd backend && uv run check

backend-lint:
	cd backend && uv run lint

backend-test:
	cd backend && uv run pytest -q

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
