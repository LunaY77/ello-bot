SHELL := /bin/bash

.PHONY: help \
	backend-run backend-lint backend-format backend-fmt backend-check backend-test \
	db-up db-down db-logs db-reset \
	frontend-dev frontend-build frontend-lint frontend-format \
	lint format fmt check test

help:
	@echo "Targets:"
	@echo "  make docker-up           Start postgres (docker compose)"
	@echo "  make backend-run     Run FastAPI dev server"
	@echo "  make backend-lint    Ruff lint (fix) + format"
	@echo "  make frontend-lint   ESLint"
	@echo "  make frontend-format Prettier format"
	@echo "  make lint            Lint both frontend & backend"
	@echo "  make format          Format both frontend & backend"

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
	cd backend && uv run uvicorn ello_bot.main:app --reload --host 0.0.0.0 --port 8000

backend-check:
	cd backend && uv run ruff check .

backend-lint:
	cd backend && uv run ruff check . --fix
	cd backend && uv run ruff format .

backend-format backend-fmt:
	cd backend && uv run ruff format .

backend-test:
	cd backend && uv run pytest -q

# ---------- Frontend (React/Vite) ----------
frontend-dev:
	cd frontend && pnpm run dev

frontend-build:
	cd frontend && pnpm run build

frontend-lint:
	cd frontend && pnpm run lint

frontend-format:
	cd frontend && pnpm run format

# ---------- Combined ----------
lint: frontend-lint backend-check

format fmt: frontend-format backend-format

check: frontend-lint backend-check

test: backend-test
