## Why

The backend is being rewritten around a single-user architecture, but the frontend still reflects the previous IAM-first, tenant-aware, admin-console-oriented product shape. If the frontend keeps those assumptions, every new page and API integration will be built on the wrong information architecture and the wrong client-side abstractions.

## What Changes

- **BREAKING** Rewrite the frontend business code to align with the single-user backend contracts and remove the current IAM-first, tenant/workspace/admin-oriented application structure.
- **BREAKING** Redefine the frontend application shell around explicit route-module conventions, centralized router configuration, and a feature-first code organization under `src/features/`.
- **BREAKING** Treat `src/components/` as the home for cross-feature shared UI only, and treat `src/store/` as the home for client-only state such as persisted auth session tokens.
- **BREAKING** Replace legacy frontend API integrations that still call `/iam/*` endpoints with a new contract-sync workflow driven by `docs/api/openapi.json` and frontend schema/model generation.
- Preserve the current frontend stack based on React, Vite, React Router, Zustand, and React Query as the rewrite foundation.

## Capabilities

### New Capabilities
- `frontend-app-shell`: Defines the rewritten frontend application shell, route organization rules, feature boundaries, shared-component placement, store boundaries, and required technology stack.
- `frontend-user-flows`: Defines the single-user auth, session, profile, and settings flows that the rewritten frontend must expose against the rewritten backend.
- `frontend-api-contract-sync`: Defines the OpenAPI-driven schema/model synchronization workflow and the rules for generated API artifacts.

### Modified Capabilities

None.

## Impact

- Affects `frontend/src/app`, `frontend/src/features`, `frontend/src/components`, `frontend/src/store`, `frontend/src/lib/auth`, `frontend/src/lib/api-client`, and generated API files under `frontend/src/api`.
- Affects route inventory, page ownership, client-side auth/session handling, and the set of user-facing pages the frontend exposes.
- Affects API synchronization by making `docs/api/openapi.json` plus the frontend schema generation command the only supported contract-sync path.
- Removes or rewrites legacy frontend business surfaces tied to IAM, tenants, workspaces, roles, permissions, agents, and other backend capabilities that no longer exist in the rewritten single-user backend.
