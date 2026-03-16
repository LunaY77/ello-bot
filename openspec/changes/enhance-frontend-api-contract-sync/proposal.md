## Why

The current frontend API sync flow intentionally strips `paths` from the OpenAPI document before code generation, so the repository only syncs request/response shapes and request-body schemas. That keeps `src/api/` tidy, but it leaves request paths, HTTP methods, and operation identities handwritten across `src/features/**/api` and `src/lib/auth`, which reintroduces contract drift and has already exposed gaps such as `src/api/models/resp/result.ts` not being re-exported from the generated response barrel.

## What Changes

- Extend the frontend contract sync workflow so it publishes operation-level API artifacts in addition to request models, response models, and request schemas.
- Define a generated public surface for frontend API artifacts, including barrel-export behavior for post-processed files such as `Result`.
- Preserve the current feature-owned API organization under `src/features/**/api`, but require handwritten wrappers to consume generated operation contracts instead of hardcoding request paths and HTTP methods.
- Consolidate the codegen helper responsibilities under `src/api/internal/` so spec transformation, generation post-processing, and runtime fetch mutation have explicit boundaries.

## Capabilities

### New Capabilities
- `frontend-api-operation-sync`: Defines how the frontend generates, publishes, and consumes operation-level API contracts, including export completeness and helper-boundary rules.

### Modified Capabilities

## Impact

- Affects frontend codegen entrypoints in `frontend/orval.config.ts` and `frontend/package.json`.
- Affects generation helpers and runtime support under `frontend/src/api/internal/`.
- Affects generated API artifacts under `frontend/src/api/models`, `frontend/src/api/schemas`, and any new operation-oriented generated outputs under `frontend/src/api/`.
- Affects handwritten request wrappers in `frontend/src/features/**/api` and `frontend/src/lib/auth/auth-config.ts`.
- Affects the repository-level API sync workflow documented in `README.md` and `frontend/README.md`.
