## ADDED Requirements

### Requirement: The rewritten frontend SHALL preserve the core application stack
The rewritten frontend MUST keep React, Vite, React Router, Zustand, and React Query as its core application stack for this change.

#### Scenario: Rewrite foundation keeps the current stack
- **WHEN** the frontend rewrite foundation is established
- **THEN** it uses React for UI composition, Vite for application build/runtime, React Router for navigation, Zustand for client-only state, and React Query for server-state management

### Requirement: Router configuration MUST stay centralized and route modules MUST stay thin
The rewritten frontend MUST define route paths centrally and MUST assemble the route tree from `src/app/`. Route modules under `src/app/routes/**` MUST own only page composition, route-level navigation concerns, and route-level loaders/actions, and MUST delegate reusable business behavior to feature code.

#### Scenario: New route is added through the central router
- **WHEN** a new page is introduced in the rewritten frontend
- **THEN** its path is defined in `src/config/paths.ts`, its route is registered from the central router assembly under `src/app/`, and its page file lives under `src/app/routes/**`

#### Scenario: Route module does not absorb business implementation
- **WHEN** a route module needs form logic, data access, or reusable UI behavior
- **THEN** it composes that behavior from `src/features/**`, `src/components/**`, or `src/lib/**` instead of implementing the reusable business logic inline

### Requirement: Business code MUST be organized by feature rather than by legacy IAM catch-all
The rewritten frontend MUST organize business UI, feature hooks, and business API wrappers under `src/features/` by single-user product capabilities such as auth, user, and sessions. The rewrite MUST NOT keep `iam` as the primary business feature boundary.

#### Scenario: Feature folders match single-user product domains
- **WHEN** the rewritten frontend adds or rewrites business code
- **THEN** that code is placed under a focused feature slice in `src/features/` rather than under a broad legacy `features/iam` umbrella

#### Scenario: Routes depend on feature public surfaces
- **WHEN** route modules use business functionality
- **THEN** they import from the owning feature's public surface or clearly owned files rather than creating reverse dependencies from features back into `app/`

### Requirement: Shared UI MUST live in `src/components/`
The rewritten frontend MUST place reusable cross-feature UI, layout, and feedback primitives in `src/components/`. UI that exists only to support one feature MUST remain inside that feature instead of being promoted prematurely into the shared component layer.

#### Scenario: Cross-feature primitive becomes shared component
- **WHEN** a UI element is reused by multiple features or route groups
- **THEN** it is implemented in `src/components/`

#### Scenario: Feature-specific UI remains local
- **WHEN** a UI element is specific to one feature workflow
- **THEN** it stays inside that owning feature directory rather than being placed in `src/components/`

### Requirement: Client-only state MUST live in `src/store/` and server state MUST NOT be mirrored there
The rewritten frontend MUST keep client-only persisted state and other local interaction state in `src/store/`. Backend-owned entities and query results MUST be managed through React Query rather than being mirrored long-term into Zustand.

#### Scenario: Auth session tokens are stored as client state
- **WHEN** the frontend persists access-token or refresh-token state
- **THEN** that state is stored under `src/store/`

#### Scenario: User and session data remain server state
- **WHEN** the frontend reads current-user, profile, settings, or session-list data from the backend
- **THEN** it manages that data through React Query instead of copying the full response into Zustand

### Requirement: Legacy admin information architecture MUST be removed from the rewritten shell
The rewritten frontend MUST remove or replace route inventory and navigation built around users, roles, permissions, agents, and workspaces when those surfaces are not backed by the rewritten single-user backend.

#### Scenario: Unsupported legacy admin pages are absent
- **WHEN** the rewritten frontend route inventory is finalized
- **THEN** it does not expose legacy admin pages whose backend capabilities have been removed from the single-user rewrite

### Requirement: Non-obvious rewritten frontend logic MUST include concise English comments
The rewritten frontend MUST add concise English comments for non-obvious routing, auth/session, state-management, API-integration, and other cross-cutting logic introduced by the rewrite. It MUST NOT add redundant comments for trivial statements or obvious JSX structure.

#### Scenario: Complex rewrite logic is documented inline
- **WHEN** the rewrite introduces non-obvious client logic such as route adaptation, auth refresh flow, or cache/state coordination
- **THEN** the relevant code includes concise English comments explaining the intent or constraint behind that logic

#### Scenario: Trivial code is not over-commented
- **WHEN** a rewritten file contains straightforward assignments, markup, or obvious component composition
- **THEN** the file does not add repetitive comments that restate what the code already says clearly

### Requirement: Shared UI and reusable interaction surfaces MUST be documented in Storybook
The rewritten frontend MUST keep Storybook as a living documentation surface for shared UI and reusable interactive components. Shared components under `src/components/` and reusable feature-level interaction components with multiple meaningful states MUST provide or update `*.stories.tsx`.

#### Scenario: Shared component has Storybook coverage
- **WHEN** a cross-feature component or layout primitive is introduced or materially changed during the rewrite
- **THEN** its Storybook stories are created or updated to reflect the supported states and variants

#### Scenario: Reusable feature interaction component is documented
- **WHEN** a reusable feature-level component has meaningful visual or interaction states that need review outside a full page flow
- **THEN** the rewrite includes Storybook stories for that component instead of relying only on route-level manual testing
