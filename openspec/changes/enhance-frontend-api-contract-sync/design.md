## Context

The current frontend API sync pipeline is split across `frontend/orval.config.ts`, `frontend/src/api/internal/openapi-transformer.ts`, and `frontend/src/api/internal/postprocess-orval.mjs`.

Today the pipeline behaves like this:

```text
docs/api/openapi.json
  -> transformReqOnly / transformRespOnly
  -> spec.paths = {}
  -> orval generates req models, resp models, request zod schemas
  -> postprocess writes result.ts, renames schema files, deletes temp output
  -> feature wrappers still handwrite path + method via src/lib/api-client.ts
```

That design intentionally avoids generated endpoint code, but it creates three concrete problems in the current source:

- `frontend/src/features/user/api/user.ts`, `frontend/src/features/sessions/api/sessions.ts`, and `frontend/src/lib/auth/auth-config.ts` hardcode rewritten backend paths and HTTP verbs.
- `frontend/src/api/models/resp/result.ts` is created after codegen, so `frontend/src/api/models/resp/index.ts` never exports it.
- `frontend/src/api/internal/` mixes build-time codegen concerns with a runtime request mutator (`case-fetch.ts`), which makes the contract-sync boundary harder to reason about.

The repository also has an explicit architectural constraint in `frontend/AGENTS.md`: business HTTP requests must go through `src/lib/api-client.ts` and must not create ad hoc per-feature client stacks. That makes a second generated HTTP runtime undesirable even if Orval can emit one.

## Goals / Non-Goals

**Goals:**

- Remove handwritten drift for request paths and HTTP methods while preserving the current feature-owned API modules under `src/features/**/api`.
- Keep `src/lib/api-client.ts` as the single runtime HTTP stack for auth refresh, `Result<T>` unwrapping, and error notifications.
- Publish a complete generated API surface so support artifacts such as `Result` are importable from the same public barrels as other generated contracts.
- Make the codegen pipeline easier to maintain by separating build-time generation stages from runtime request helpers.

**Non-Goals:**

- Replacing the shared Axios client with generated fetch clients or generated React Query hooks.
- Moving cache invalidation, optimistic updates, notifications, or auth/session persistence into generated code.
- Changing the backend `Result[T]` envelope contract or the backend route inventory.
- Reorganizing the existing `src/features/**/api` modules into a codegen-owned directory structure.

## Decisions

### Decision: Preserve feature-owned API wrappers and generate operation contracts instead of full request clients

The frontend will keep handwritten feature API modules as the composition layer for React Query, notifications, and cache updates, but those modules will stop hardcoding route strings and verbs. Instead, the codegen pipeline will generate operation-level contracts that provide the stable OpenAPI-sourced method, path, and operation identity for each supported endpoint.

Rationale:

- The user already prefers the current `src/features/**/api` organization.
- `src/lib/api-client.ts` already centralizes auth refresh, `Result<T>` unwrapping, and notification behavior.
- Generated operation contracts remove contract drift without forcing a second runtime client abstraction into the app.

Alternatives considered:

- Generate full request clients from Orval and call them directly from features. Rejected because it would either duplicate runtime HTTP behavior or require a deeper client integration than the current architecture wants.
- Keep the current handwritten request strings and only generate types/schemas. Rejected because that is the source of the current contract drift.

### Decision: Introduce a dedicated generated operation surface under `src/api/`

The sync workflow will add a new generated operation-oriented output under `src/api/` grouped by backend domain, such as sessions, user, debug, and health. Each operation artifact will expose a stable identifier plus the canonical HTTP method and path derived from `docs/api/openapi.json`, and it will be consumable from feature-owned API wrappers.

Rationale:

- The current backend surface is already grouped cleanly by OpenAPI tags and `operationId`.
- A generated operation layer is enough to sync method/path metadata without pulling React Query hooks into generated code.
- Domain-grouped generated artifacts remain readable and fit the current `src/api/` layout the user is satisfied with.

Alternatives considered:

- Emit one monolithic operation map file. Rejected because it scales poorly and weakens locality.
- Generate operation files inside `src/features/**/api`. Rejected because it blends generated outputs with handwritten business logic.

### Decision: Treat public generated barrels as a first-class part of contract sync

The codegen pipeline will explicitly reconcile generated public exports after generation so any support artifact that the frontend is expected to consume, including the manually synthesized `Result` type, is exported through the same public surface as the rest of the generated contracts.

Rationale:

- `frontend/src/lib/api-client.ts` already depends on `Result`, but it currently has to deep-import `@/api/models/resp/result`.
- A partial barrel means consumers must know which generated files are "special", which defeats the purpose of a stable public contract surface.

Alternatives considered:

- Keep allowing deep imports for post-processed files. Rejected because it leaks codegen internals to consumers.
- Stop generating a standalone `Result` support type. Rejected because the shared API client still needs the envelope type for interceptor typing and refresh flows.

### Decision: Separate build-time codegen helpers from runtime request helpers

`src/api/internal/` will be treated as build-time codegen infrastructure only: OpenAPI transformation, artifact normalization, operation generation, and barrel reconciliation. Any helper that is imported at browser runtime by generated artifacts or handwritten wrappers will live in a dedicated runtime-facing module outside the build-time helper path.

Rationale:

- Mixing filesystem scripts with runtime request helpers makes it unclear what is safe to import into app code.
- A clean boundary makes the sync workflow more extensible if operation generation grows beyond the current endpoints.

Alternatives considered:

- Keep all helpers inside `src/api/internal/`. Rejected because the directory then stops communicating whether code is build-time-only.
- Move build-time scripts to repository-root tooling. Rejected because the codegen helpers are tightly coupled to `src/api/` conventions and are easier to maintain close to that boundary.

### Decision: Keep a single supported sync command that orchestrates all codegen stages

`pnpm run codegen:api` will remain the supported frontend sync entrypoint, and `make sync-api` will remain the repository-level entrypoint. The frontend command will orchestrate OpenAPI transformation, Orval model/schema generation, operation artifact generation, post-processing, and formatting in one documented flow.

Rationale:

- The repository already documents these commands as the supported sync workflow.
- A single entrypoint reduces the chance that operation artifacts or barrels fall out of date relative to models and schemas.

Alternatives considered:

- Add a separate ad hoc command just for operation generation. Rejected because it creates another drift vector.

## Risks / Trade-offs

- `[Generated operation names become unstable when the OpenAPI document changes]` -> Derive names from `operationId` and tag boundaries, and fail codegen loudly on collisions.
- `[Operation contracts drift from request/response model naming]` -> Reuse the same transformed OpenAPI input and naming rules that already drive req/resp model generation.
- `[The new generated surface grows into a second handwritten API layer]` -> Limit the generated output to operation metadata and public contract exports; keep cache and UI concerns inside features.
- `[Future endpoints introduce path params, query params, or multipart forms that exceed the first descriptor shape]` -> Make the generated contract format extensible so parameter metadata can be added without replacing the entire sync strategy.

## Migration Plan

1. Add the new operation-generation stage and public-barrel reconciliation to the existing frontend codegen command without removing current handwritten wrappers.
2. Migrate `src/lib/auth/auth-config.ts` and `src/features/**/api/*.ts` to consume generated operation contracts one module at a time.
3. Remove remaining hardcoded rewritten backend paths and verbs from handwritten wrappers after the generated operation surface is in place.
4. Update frontend API-sync documentation so contributors know generated models, schemas, operation contracts, and barrels all come from the same command.

## Open Questions

- Should developer-oriented endpoints such as `/api/debug/runtime` and `/api/user/bootstrap-admin` be exported from the same generated public surface as end-user flows, or from a separate developer-facing entrypoint?
- Should the generated operation contract include auth and content-type metadata immediately, or start with method/path/operation identity and add richer metadata only when the backend surface requires it?
