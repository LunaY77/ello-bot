# syntax=docker/dockerfile:1.7
FROM python:3.12-slim

COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /bin/

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    UV_LINK_MODE=copy

WORKDIR /app

COPY backend/pyproject.toml backend/uv.lock backend/README.md ./
RUN --mount=type=cache,target=/root/.cache/uv \
    uv sync --locked --no-install-project --no-dev

COPY backend/ ./
RUN --mount=type=cache,target=/root/.cache/uv \
    uv sync --locked --no-dev

CMD ["uv", "run", "ello-server"]