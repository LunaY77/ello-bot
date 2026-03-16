## ADDED Requirements

### Requirement: Frontend contract sync MUST publish generated operation contracts

The frontend API sync workflow MUST generate operation-level contract artifacts from `docs/api/openapi.json` for every supported rewritten backend endpoint, and each generated operation contract MUST include the canonical HTTP method, request path, and stable operation identity derived from the committed OpenAPI document.

#### Scenario: Codegen emits operation contracts for rewritten backend endpoints

- **WHEN** the frontend API codegen workflow runs against the committed OpenAPI document
- **THEN** it generates operation contracts for the supported rewritten backend endpoints under `/health`, `/api/debug/runtime`, `/api/sessions/*`, and `/api/user/*`

#### Scenario: OpenAPI path or method changes propagate through sync

- **WHEN** a supported endpoint path or HTTP method changes in `docs/api/openapi.json`
- **THEN** the next frontend API codegen run updates the generated operation contract so consumers do not need to hand-edit the rewritten backend path or verb

### Requirement: Handwritten frontend API wrappers MUST compose generated operation contracts with the shared API client

Handwritten frontend API wrappers MUST keep business concerns such as React Query configuration, cache updates, and notifications inside `src/features/**/api` and `src/lib/auth`, but they MUST consume generated operation contracts for request path and HTTP method instead of hardcoded string literals or feature-local HTTP clients.

#### Scenario: Feature wrapper performs a synced API request

- **WHEN** a feature-owned frontend API wrapper performs a request to a rewritten backend endpoint
- **THEN** it uses the shared API client together with a generated operation contract rather than hardcoding the request path and HTTP method in the wrapper

#### Scenario: Business behavior remains outside generated code

- **WHEN** a feature-owned frontend API wrapper needs query invalidation, notification side effects, or auth-session bookkeeping
- **THEN** that business behavior remains in handwritten feature or auth code instead of being moved into generated operation artifacts

### Requirement: Generated API public surfaces MUST export supported support artifacts consistently

The frontend API sync workflow MUST publish complete public exports for supported generated artifacts, including support artifacts produced during post-processing, so consumers can import from stable public module entrypoints without deep-importing individual generated files.

#### Scenario: Response barrel exports the Result support type

- **WHEN** the codegen workflow writes or refreshes `src/api/models/resp/result.ts`
- **THEN** the public response-model entrypoint also exports `Result` so consumers do not need a deep import into `src/api/models/resp/result`

#### Scenario: Consumers import generated contracts from public entrypoints

- **WHEN** frontend code consumes generated request models, response models, schemas, or operation contracts
- **THEN** it can do so through documented public entrypoints under `src/api/` rather than depending on post-process implementation details

### Requirement: Frontend API sync helpers MUST separate build-time generation concerns from runtime request concerns

The frontend API sync workflow MUST keep OpenAPI transformation, operation generation, artifact normalization, and barrel reconciliation in build-time helper modules, and it MUST keep browser/runtime request helpers out of that build-time helper boundary.

#### Scenario: Build-time helper modules stay isolated from runtime imports

- **WHEN** the frontend codegen workflow executes
- **THEN** it runs the transform, model/schema generation, operation generation, and post-process stages from build-time helper modules without requiring manual edits under `src/api/`

#### Scenario: Runtime request helpers stay outside build-time helper modules

- **WHEN** frontend application code imports a helper used to execute or compose synced API requests at runtime
- **THEN** that helper comes from a dedicated runtime-facing API module rather than from a build-time codegen helper path
