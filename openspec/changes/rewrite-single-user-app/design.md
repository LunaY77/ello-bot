## Context

The current backend shape is still effectively a feature-local monolith centered on IAM and admin workflows. Even after removing tenant and RBAC concepts, simply swapping models inside the current package layout would keep the wrong architectural center of gravity: HTTP adapters, lifecycle wiring, business orchestration, and infrastructure details would still be co-located and hard to evolve.

This change narrows scope deliberately:

1. rewrite the backend into the required layered architecture
2. implement the first real bounded context in that architecture: `user`

This change does **not** implement agents, AI gateways, tool execution, or assistant workspace behavior.

## Goals / Non-Goals

**Goals**

- Reframe the backend around `api/`, `runtime/`, `core/`, `domain/`, `application/`, and `infra/`.
- Make `AppRuntime` the lifecycle and dependency root, with FastAPI acting only as the HTTP adapter.
- Keep domain rules independent from FastAPI, SQLAlchemy, and external SDKs wherever possible.
- Reuse the existing exception handling mechanism based on `BusinessException`, `AuthException`, `CommonErrorCode`, and `Result.fail(...)`.
- Preserve bootstrap admin creation, registration gating, dual opaque tokens, centralized Redis keys, and async execution.
- Constrain the rewritten API surface to action-style routes that use only `GET` and `POST`, instead of RESTful resource mutation semantics.
- Make the rewritten Python code self-documenting through mandatory English docstrings and explanatory inline comments.
- Define a deletion-oriented audit so legacy IAM/admin code is removed instead of lingering as compatibility baggage.

**Non-Goals**

- Preserving the current `app.modules.iam` shape under new names.
- Allowing FastAPI routes to own business orchestration or lifecycle setup.
- Preserving `PATCH`, `PUT`, `DELETE`, or resource-style REST mutation contracts in the supported API surface.
- Introducing a separate DTO layer, value-object layer, or query-repository layer for this change.
- Implementing agents, AI providers, tool registry behavior, or assistant-workspace flows in this change.

## Required Backend Spine

The backend must be reorganized around this scoped target for the current change:

```text
app/
  api/
    __init__.py
    deps.py
    errors.py
    router.py
    routes/
      user.py
      sessions.py
      health.py
      debug.py
    schemas/
      common.py
      user.py
      session.py

  runtime/
    __init__.py
    app_runtime.py
    container.py
    lifecycle.py
    state.py

  core/
    __init__.py
    config.py
    logging.py
    exceptions.py
    ids.py
    clock.py
    json.py
    types.py
    constants.py

  domain/
    user/
      __init__.py
      entities.py
      enums.py
      errors.py
    session/
      __init__.py
      entities.py
      enums.py
      errors.py

  application/
    user/
      __init__.py
      service.py
    session/
      __init__.py
      service.py

  infra/
    db/
      __init__.py
      base.py
      session.py
      uow.py
      models/
        __init__.py
        user.py
        session.py
      repositories/
        __init__.py
        user_repo.py
        session_repo.py

    cache/
      __init__.py
      redis.py

    observability/
      __init__.py
      tracing.py
      metrics.py
      instrument.py
```

The key requirement is the layer boundary. Only the subset needed for rewrite plus `user` should be materialized in this change.

## Layer Responsibilities

### `api/`: HTTP adapter layer

Responsibilities:

- Receive HTTP requests.
- Validate request and response payloads with Pydantic schemas.
- Call application services.
- Translate results and exceptions into HTTP responses.

Forbidden:

- No business-flow orchestration in routes.
- No direct lifecycle management.
- No direct DB/Redis ownership.
- No `PATCH`, `PUT`, or `DELETE` methods in the supported rewrite surface.
- No REST-style resource mutation semantics where the path is expected to imply CRUD behavior.

### HTTP endpoint style rules

The rewritten backend surface for this change uses an explicit action-style HTTP contract.

Rules:

- Only `GET` and `POST` are allowed for supported endpoints in this change.
- `GET` is used for read-only retrievals that do not require request bodies.
- `POST` is used for state-changing operations and payload-carrying commands.
- Supported paths must be action-oriented and explicit rather than RESTful resource-mutation paths.
- `PATCH`, `PUT`, and `DELETE` must not appear in the supported backend surface for this change.

Required endpoint shape for the delivered surface:

- `GET /health`
- `GET /api/debug/runtime`
- `POST /api/sessions/register`
- `POST /api/sessions/login`
- `POST /api/sessions/refresh`
- `POST /api/sessions/logout`
- `POST /api/sessions/logout-all`
- `GET /api/sessions/list`
- `POST /api/user/bootstrap-admin`
- `GET /api/user/get-current-user`
- `GET /api/user/get-profile`
- `POST /api/user/update-profile`
- `GET /api/user/get-settings`
- `POST /api/user/update-settings`

### `runtime/`: system runtime layer

Responsibilities:

- Own system-wide state.
- Create and wire long-lived resources.
- Manage startup and shutdown transitions.
- Expose assembled services to FastAPI and tests.

FastAPI lifespan should only:

1. create `AppRuntime`
2. call `start()`
3. store it in `app.state.runtime`
4. call `stop()` on shutdown

### `core/`: global foundational capability

Responsibilities:

- Configuration loading.
- Logging bootstrap.
- Common exception and error-code primitives.
- Common IDs, time, JSON, constants, and reusable low-level types.

This layer must stay framework-light and reusable across API, runtime, application, and infra code.

### `domain/`: business model layer

Responsibilities:

- Entities, enums, and domain errors.
- State transitions and business invariants for `user` and `session`.

Requirements:

- Avoid FastAPI imports.
- Avoid SQLAlchemy imports.
- Avoid external SDK coupling.

### `application/`: use-case orchestration layer

Responsibilities:

- Coordinate complete single-user use cases.
- Call repositories and runtime-owned technical dependencies.
- Keep use-case orchestration out of routes and out of persistence classes.

This change does not introduce `dto.py`. Application services may accept schemas or primitives directly as long as HTTP-only concerns stay in the API layer.

### `infra/`: technical implementation layer

Responsibilities:

- DB models, repositories, and Unit of Work.
- Redis integration.
- Observability wiring.

Infra answers “how it is implemented”, not “what business flow should happen”.

## AppRuntime Design

### Purpose

`AppRuntime` is the running system root:

- lifecycle controller
- dependency assembly root
- service access entry point

It is not a business service and not a generic util container.

### Why a dedicated runtime is required

The following resources have process-level lifecycle and must not belong to FastAPI route modules:

- DB engine / session factory
- Redis client
- HTTP client if introduced later
- observability resources

### Runtime shape

`AppRuntime` should expose five groups:

- `config`
- `resources`
- `gateways`
- `registries`
- `services`

For this change, `gateways` and `registries` should remain empty unless a strictly necessary non-agent, non-AI integration is introduced. The runtime shape should still reserve them rather than falling back to ad hoc globals.

### Runtime state machine

`AppRuntime` must track:

- `created`
- `starting`
- `started`
- `stopping`
- `stopped`

### Required methods

`start()` must:

1. create resources
2. create gateways if needed
3. create registries if needed
4. create application services
5. set runtime state to `started`

`stop()` must:

1. close Redis
2. dispose DB engine resources
3. clean up system-level handles
4. set runtime state to `stopped`

## Schema Rules

### `api/schemas/*`

For this change, all structured request and response body definitions live in `api/schemas`.

These schemas cover:

- request validation
- response shape
- JSON aliases and serialization style

### Fixed rule

This change does **not** introduce:

- `application/*/dto.py`
- request/response value objects

If a route accepts or returns structured payloads, those contracts must be defined in `api/schemas`.

## Python Documentation and Comment Rules

The rewrite must follow explicit Python documentation standards so the new layered backend remains readable after the architectural reset.

### Method and function docstrings

- Every Python method and function introduced or rewritten in this change must include an English docstring.
- The docstring must contain a short method description.
- If the callable accepts arguments, the docstring must include an `Args` section.
- If the callable returns a value, the docstring must include a `Returns` section.
- For `None`-returning procedures, a `Returns` section is not required.

### Class docstrings

- Every Python class introduced or rewritten in this change must include an English docstring describing the class purpose.

### Inline comments

- Non-trivial control flow, lifecycle sequencing, repository coordination, auth/session handling, and other logic that would not be immediately obvious from the code alone should include English inline comments.
- Inline comments should explain intent or reasoning, not restate the code mechanically.
- Simple one-line assignments or obvious framework boilerplate should not receive redundant comments.

### Scope of the rule

- These documentation rules apply across `api/`, `runtime/`, `core/`, `domain/`, `application/`, and `infra/`.
- When existing source material is moved into the new architecture, its docstrings and comments must be upgraded to satisfy these rules before the moved code is treated as complete.

## Repository and Unit of Work Rules

### Repository responsibility

Repositories own persistence-oriented read/write access for domain concepts.

Repositories do **not** own:

- HTTP concerns
- business orchestration
- lifecycle control

### Repository shape for this change

This change uses repositories only. It does **not** introduce query repositories.

Repositories may internally coordinate:

- SQLAlchemy access
- Redis-backed session or cache access

But the abstraction presented upward remains a repository, not a separate `query_repo`.

### Unit of Work

Cross-repository writes must go through `infra/db/uow.py`.

The UoW must own:

- DB session open/close
- repo instantiation
- commit
- rollback

## Exception and Error Code Rules

This change must reuse the existing exception mechanism instead of introducing a new base exception hierarchy.

The existing pattern is:

- `ErrorCode` protocol defines `error_code` and `error_msg`
- `CommonErrorCode` provides shared codes such as `SYSTEM_ERROR`, `PARAM_ERROR`, `UNAUTHORIZED`, `FORBIDDEN`, `NOT_FOUND`, `TOKEN_EXPIRED`, and `TOKEN_INVALID`
- module-specific enums provide additional business codes
- business failures raise `BusinessException(code_enum)`
- auth failures raise `AuthException(code_enum)`

The existing HTTP mapping must be preserved:

- `BusinessException` -> HTTP 400 via `Result.fail(...)`
- `AuthException` -> HTTP 401 via `Result.fail(...)`
- request validation failure -> HTTP 422 using `CommonErrorCode.PARAM_ERROR`
- unhandled exception -> HTTP 500 using `CommonErrorCode.SYSTEM_ERROR`

This change must not introduce a new `AppError` type or a parallel exception hierarchy.

## User Module Boundaries

The first bounded context landed by this rewrite is `user`.

It is responsible for:

- bootstrap admin initialization
- registration gating
- login / refresh / logout
- current-user retrieval
- personal settings/profile state

It is not responsible for:

- agent execution
- AI model calling
- tool orchestration
- assistant workspace flow

## Audit: Retain vs Delete

### Retain after audit

These areas may survive, but only after relocation into the new layered tree:

- `backend/app/core/config.py` -> source material for `core/config.py`
- `backend/app/core/redis.py` -> source material for `infra/cache/redis.py`
- `backend/app/core/exception.py` -> source material for `core/exceptions.py`
- `backend/app/core/observability.py` -> source material for `infra/observability/instrument.py`
- `backend/app/utils/security.py` and parts of `backend/app/utils/auth.py` -> source material for token/password helpers under `core/` or `application/session/`

### Delete as legacy

These areas are explicitly legacy and must not define the rewritten backend shape:

- `backend/app/modules/iam/**`
- IAM-driven bootstrap flow in `backend/app/main.py`
- tenant/principal/role/permission/ACL models and routes
- generated API contracts that expose `/api/iam/**` or tenant/RBAC payloads

### Neutral but must be rewritten around runtime

These files are not legacy concepts, but their current shape is wrong for the target architecture:

- `backend/app/main.py`
- `backend/alembic/env.py`
- `backend/tests/conftest.py`

## Risks / Trade-offs

- [Scope explosion] The architecture rewrite adds structural work beyond simple model replacement. Mitigation: freeze the target spine now so later implementation cannot drift.
- [Module naming drift] A vague module name would weaken the rewrite. Mitigation: fix the first bounded context name to `user` and avoid generic catch-all module names.
- [Migration churn] Existing code may be reusable only as source material, not as drop-in modules. Mitigation: classify everything explicitly as retain-after-audit, delete-as-legacy, or neutral-but-rewrite.
- [Partial reuse bugs] Copying low-level utilities without respecting new boundaries would recreate coupling. Mitigation: every reused piece must move into its correct layer before being depended on.

## Migration Plan

1. Rewrite the OpenSpec artifacts so implementation is constrained by the new backend spine.
2. Build `core/`, `runtime/`, and `api/` first so lifecycle and adapter boundaries are fixed.
3. Introduce only the `user` and `session` slices needed for this change.
4. Move reusable technical pieces into the new tree only after audit.
5. Remove legacy IAM/backend surfaces once the replacement single-user flow exists.
6. Regenerate contracts and rebaseline tests against the new runtime and single-user APIs.

Rollback strategy:

- Because this is a structural rewrite, rollback is done in version control rather than through compatibility layers inside the new architecture.
