## 1. Frontend shell and route rewrite

- [x] 1.1 Audit the current frontend route inventory and classify each existing route as `retain`, `rewrite`, or `remove` based on the rewritten single-user backend scope
- [x] 1.2 Rewrite `src/config/paths.ts` and the central router assembly under `src/app/` so the route tree reflects the rewritten single-user information architecture
- [x] 1.3 Rebuild route modules under `src/app/routes/**` so they stay thin and compose business behavior from feature code instead of from legacy inline page logic
- [x] 1.4 Add concise English comments to non-obvious routing and app-shell logic introduced by the rewrite without over-commenting trivial files

## 2. Feature, component, and store boundaries

- [x] 2.1 Replace the legacy `features/iam` catch-all with focused single-user feature slices such as auth, user, and sessions, including clear public exports for route consumption
- [x] 2.2 Move shared cross-feature layouts, UI primitives, and feedback components into `src/components/` while keeping feature-specific composites inside their owning features
- [x] 2.3 Rebaseline `src/store/` around client-only state, keeping persisted auth session tokens there and removing long-lived duplication of backend-owned entities

## 3. API contract synchronization and client plumbing

- [x] 3.1 Regenerate frontend request models, response models, and Zod schemas from `docs/api/openapi.json` using the defined frontend codegen workflow
- [x] 3.2 Rewrite the shared API client and auth/session plumbing to use the rewritten backend paths under `/api/sessions/*` and `/api/user/*`
- [x] 3.3 Update handwritten feature API wrappers to consume generated contracts and remove dependencies on legacy `/iam/*` endpoint paths and response shapes

## 4. Single-user auth, user, and session flows

- [x] 4.1 Implement login, registration, logout, and session-restore flows against the rewritten session contracts, including backend-driven registration gating behavior
- [x] 4.2 Implement current-user, profile, and settings surfaces against the rewritten `/api/user/*` contracts without tenant, role, workspace, or principal assumptions
- [x] 4.3 Implement the single-user session-management surface using the rewritten `/api/sessions` and `/api/sessions/logout-all` contracts
- [x] 4.4 Add Playwright end-to-end coverage for critical single-user journeys including login, protected-route access, and personal user workflows

## 5. Legacy cleanup and verification

- [x] 5.1 Remove legacy admin, IAM, workspace, agent, role, permission, and tenant-oriented routes, components, helpers, and tests once rewritten replacements exist
- [x] 5.2 Update or add Storybook stories for shared UI and reusable feature interaction components affected by the rewrite
- [x] 5.3 Update frontend i18n resources and remaining test assets so they describe the rewritten single-user application rather than the legacy admin console
- [x] 5.4 Run the relevant frontend verification steps for codegen, type-checking, linting, Storybook build checks, and tests to confirm the rewrite aligns with the committed OpenAPI contract and route architecture
