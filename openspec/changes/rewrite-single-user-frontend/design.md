## Context

The current frontend already has the folder shells for `app/`, `features/`, `components/`, `store/`, and `api/`, but the business center of gravity is still the legacy IAM console. Routes under `/app` point to users, roles, permissions, agents, and workspaces, feature exports are still concentrated in `features/iam`, and several auth helpers still call `/iam/auth/*` endpoints even though the generated OpenAPI contract now exposes `/api/sessions/*` and `/api/user/*`.

The rewrite therefore needs to do more than rename files. It needs to replace the current information architecture, align feature boundaries to the rewritten backend, and keep the frontend technical stack stable enough that the rewrite is about product and architecture clarity rather than framework churn.

The stable foundation for this change is:

- React
- Vite
- React Router
- Zustand
- React Query

The current generated API workflow is also already viable: `frontend/orval.config.ts` consumes `../docs/api/openapi.json`, and `pnpm run codegen:api` generates request models, response models, and Zod schemas into `src/api/`.

```text
TARGET FRONTEND SHAPE

app/           -> providers, router assembly, route modules
features/      -> business domains such as auth, user, sessions
components/    -> cross-feature shared UI and layouts only
store/         -> client-only persistent state and UI state
lib/           -> app-wide infrastructure such as auth and api-client
api/           -> generated contracts from docs/api/openapi.json
```

## Goals / Non-Goals

**Goals:**

- Rewrite the frontend business code around the single-user backend instead of preserving the old IAM/admin console shape.
- Define a router convention where paths are centralized, route modules stay thin, and business logic lives in features.
- Define a feature-first organization that replaces the current `features/iam` catch-all with single-user-oriented feature boundaries.
- Keep `src/components/` reserved for truly shared UI and keep `src/store/` reserved for client-only state.
- Make OpenAPI-driven schema/model generation the only supported contract-sync workflow for frontend API integration.

**Non-Goals:**

- Preserving compatibility with legacy `/iam/*` frontend contracts or tenant-aware viewer models.
- Reintroducing pages for roles, permissions, agents, workspaces, or other backend capabilities that are out of scope for the rewritten backend.
- Replacing React, Vite, React Router, Zustand, or React Query with a new frontend stack during this rewrite.
- Defining the future agent, AI, or assistant workspace UX before the backend exposes stable capabilities for them.

## Decisions

### Decision: Keep a centralized router plus thin route modules

The rewrite will continue to use a central router assembly under `src/app/` with route paths defined in `src/config/paths.ts` and route modules implemented under `src/app/routes/**`.

Rationale:

- The current codebase already uses `createBrowserRouter`, route-level lazy loading, and a path registry.
- Centralized route registration makes it obvious which pages exist after the rewrite.
- Thin route modules prevent business logic from leaking into route files and keep feature ownership clear.

Alternatives considered:

- File-system-driven routing was rejected because it would add framework churn without solving the architecture mismatch.
- Allowing feature folders to self-register routes was rejected because it weakens route inventory control during a full rewrite.

### Decision: Replace `features/iam` with backend-aligned single-user feature slices

The rewrite will organize business code under `src/features/` by single-user domains such as `auth`, `user`, and `sessions`, or equally narrow replacements with the same intent. The old `iam` catch-all feature is not retained as the new top-level business abstraction.

Rationale:

- The backend rewrite now centers on sessions and user state rather than IAM, tenants, and delegated administration.
- Feature slices that mirror real product capabilities make route ownership, API integration, and test ownership easier to reason about.
- This removes the current mismatch where a single feature folder contains auth, tenants, permissions, agents, and profile concerns.

Alternatives considered:

- Keeping one `iam` umbrella feature was rejected because it would preserve the wrong business language.
- Moving all business code directly into `app/routes` was rejected because it would collapse page composition and reusable feature logic into the same layer.

### Decision: Enforce strict boundaries for `components/` and `store/`

`src/components/` will contain only cross-feature shared UI, layouts, feedback primitives, and other reusable view building blocks. Feature-specific forms, panels, and composites stay inside their owning feature. `src/store/` will contain only client-only state such as persisted auth session tokens and lightweight UI preferences.

Rationale:

- The rewrite needs a hard separation between reusable UI primitives and business-specific view logic.
- Server state is already better handled by React Query than by Zustand copies.
- A narrow store boundary prevents the old pattern of mirroring backend entities into local state.

Alternatives considered:

- Storing fetched user/session entities in Zustand was rejected because it duplicates React Query responsibilities.
- Moving all UI primitives into features was rejected because common layouts, notifications, forms, and shells are still shared infrastructure.

### Decision: Treat generated API contracts as read-only and OpenAPI-driven

`docs/api/openapi.json` is the source of truth for frontend contract synchronization. Frontend API types and schemas are generated through `pnpm run codegen:api`, with `make sync-api` remaining the repository-level workflow when backend and frontend need to be updated together.

Rationale:

- The current `orval.config.ts` already reads `../docs/api/openapi.json`.
- Generated request models, response models, and Zod schemas remove a large class of drift between frontend and backend.
- The post-processing hooks under `src/api/internal/` already provide the extension point for generation fixes without hand-editing generated output.

Alternatives considered:

- Handwritten request and response types were rejected because they would drift immediately during the rewrite.
- Fetching a live schema from a running backend during every frontend change was rejected because it makes local contract sync less deterministic than repository-committed OpenAPI.

### Decision: Remove unsupported legacy surfaces instead of shimming them

The rewrite will delete or replace routes, viewer helpers, API wrappers, and UI semantics that depend on tenants, principals, agents, roles, permissions, or workspaces. The frontend will speak the backend's current single-user language directly.

Rationale:

- The current generated models already expose `CurrentUserResponse`, `AuthTokenResponse`, and user/session endpoints that do not need those legacy concepts.
- Compatibility shims would keep old domain terms alive in new code and raise the cost of every later change.

Alternatives considered:

- Temporary adapter layers that emulate old IAM responses were rejected because they would make the rewrite partial instead of complete.

## Risks / Trade-offs

- `[Route churn breaks navigation unexpectedly]` -> Rebuild the route inventory explicitly from `paths.ts` and remove legacy routes only after replacements exist.
- `[Frontend and backend contracts drift during concurrent rewrites]` -> Require regeneration from `docs/api/openapi.json` before merging frontend API changes.
- `[The rewrite scope grows back into unsupported product areas]` -> Keep proposal and specs explicit that agent, AI, workspace, and RBAC surfaces are out of scope until the backend exposes them again.
- `[Registration and bootstrap flows remain product-ambiguous in MVP]` -> Keep the contract support in the frontend design, but leave final route visibility as an explicit product decision captured before implementation.

## Migration Plan

1. Regenerate frontend API artifacts from the latest `docs/api/openapi.json` and use that output to drive the rewrite.
2. Replace the current route inventory with a single-user route tree and update `paths.ts`, router assembly, and route modules together.
3. Introduce new single-user feature slices and move auth, profile, settings, and session behavior into them.
4. Rebuild auth/session persistence around the opaque token pair in `src/store/`, with React Query continuing to own server state.
5. Remove legacy `iam` feature code, legacy routes, old viewer helpers, and obsolete tests once replacement flows are in place.

## Open Questions

- Should the rewritten frontend keep a public registration page visible in MVP mode when the backend may reject registration with a business error?
- Should bootstrap-admin and runtime-debug capabilities be exposed through user-facing routes, a developer-only surface, or no frontend surface at all?
