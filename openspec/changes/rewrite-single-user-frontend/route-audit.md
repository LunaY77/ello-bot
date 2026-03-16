# Frontend Route Audit

This audit captures the pre-rewrite frontend route inventory and classifies each route against the single-user backend scope defined by `rewrite-single-user-frontend`.

## Classification Summary

| Route | Module | Classification | Notes |
| --- | --- | --- | --- |
| `/` | `frontend/src/app/routes/public/Landing.tsx` | `rewrite` | Keep a public landing or entry route, but remove tenant/workspace language and align messaging to the single-user product. |
| `/auth/login` | `frontend/src/app/routes/auth/Login.tsx` | `rewrite` | Keep as the primary unauthenticated entry flow, but switch to the rewritten auth feature exports and session contracts. |
| `/auth/register` | `frontend/src/app/routes/auth/Register.tsx` | `rewrite` | Keep registration support, but surface backend-driven registration gating instead of legacy IAM assumptions. |
| `/app` | `frontend/src/app/routes/app/assistant/Dashboard.tsx` | `rewrite` | Keep the authenticated home surface, but treat it as the rewritten single-user dashboard or assistant home rather than an admin console shell. |
| `/app/sessions` | `frontend/src/app/routes/app/admin/Sessions.tsx` | `rewrite` | Keep a personal session-management surface, but rebuild it around `/api/sessions` and remove workspace-scoped session semantics. |
| `/app/profile` | `frontend/src/app/routes/app/settings/Profile.tsx` | `rewrite` | Keep a personal account/settings surface, but rebuild it against `/api/user/me`, `/api/user/profile`, and `/api/user/settings`. |
| `/app/users` | `frontend/src/app/routes/app/admin/Users.tsx` | `remove` | Multi-user directory management is out of scope for the rewritten single-user backend. |
| `/app/roles` | `frontend/src/app/routes/app/admin/Roles.tsx` | `remove` | RBAC administration is unsupported in the rewritten backend. |
| `/app/permissions` | `frontend/src/app/routes/app/admin/Permissions.tsx` | `remove` | Permission and ACL management is unsupported in the rewritten backend. |
| `/app/agents` | `frontend/src/app/routes/app/admin/Agents.tsx` | `remove` | Agent registry and ownership management is out of scope for the current backend rewrite. |
| `/app/workspaces` | `frontend/src/app/routes/app/settings/Workspaces.tsx` | `remove` | Workspace and tenant switching are unsupported in the rewritten single-user backend. |
| `*` | `frontend/src/app/routes/system/NotFound.tsx` | `retain` | Keep as the fallback route with updated shell styling only if needed. |

## Structural Findings

- The current central router in `frontend/src/app/CreateAppRouter.tsx` still assembles an admin-console-oriented tree.
- `frontend/src/config/paths.ts` still treats `users`, `roles`, `permissions`, `agents`, and `workspaces` as first-class protected routes.
- Protected route modules are thin already, but they import almost entirely from the legacy `features/iam` catch-all.
- `frontend/src/components/layouts/DashboardLayout.tsx` hardcodes admin and workspace navigation that must be replaced with single-user account navigation.

## Rewrite Targets

- Keep the route registry centralized in `frontend/src/config/paths.ts` and `frontend/src/app/CreateAppRouter.tsx`.
- Rebuild the protected information architecture around a single-user home, personal profile/settings, and personal session management.
- Replace legacy admin route modules with thin route modules that compose from `src/features/auth`, `src/features/user`, and `src/features/sessions`.
