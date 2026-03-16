## Why

The current backend is still centered on multi-tenant IAM, RBAC, and admin-console workflows. Even if the business model is reduced to one user, keeping that backend shape would preserve the wrong abstractions and slow every future change.

This change therefore focuses on two things only:

1. rewrite the backend architecture itself
2. land the first rewritten bounded context: `user`

Agent, AI, tool, and assistant-workspace features are intentionally out of scope for this change.

## What Changes

- **BREAKING** Rewrite the backend around the required layered structure `api/`, `runtime/`, `core/`, `domain/`, `application/`, and `infra/`.
- **BREAKING** Remove the existing IAM-first backend surface and replace it with a rewritten single-user foundation centered on user account, auth session, and personal settings behavior.
- **BREAKING** Introduce username/password authentication with a bootstrap admin user initialized from environment variables, while keeping the persisted user model free of owner, tenant, role, permission, and ACL distinctions.
- **BREAKING** Use dual opaque tokens for authentication and Redis-backed user/session snapshots for access-token validation instead of JWT-style claims or RBAC-derived auth context.
- **BREAKING** Keep registration and login contracts in the new architecture, but block registration in MVP mode before registration business logic creates users or sessions.
- **BREAKING** Constrain the rewritten backend API surface to action-style endpoints that use only `GET` and `POST`, with no `PATCH`, `PUT`, `DELETE`, or REST-style resource-mutation contracts in the supported surface.
- **BREAKING** Drop backward compatibility for legacy IAM routes, RBAC-derived auth state, and database entities that only exist to support multi-tenancy or delegated access control.
- Preserve explicit Python implementation-documentation standards for the rewrite: classes and methods must carry English docstrings, method docstrings must describe `Args` and `Returns` when applicable, and non-obvious logic should include English inline comments.
- Preserve only infrastructure that is still useful in the rewritten backend, such as centralized `RedisKeyDef` usage, the existing `BusinessException` / `AuthException` pattern, and the async runtime model, after explicit review.

## Capabilities

### New Capabilities
- `single-user-core`: Defines the runtime rules for the rewritten backend, including no tenant/RBAC model, bootstrap behavior, MVP single-user constraints, and the required layered architecture.
- `user-auth-sessions`: Defines username/password auth, bootstrap admin initialization, dual opaque-token sessions, Redis-backed access authentication, MVP registration gating, reuse of the existing exception handling mechanism, and action-style session endpoints that use only `GET` and `POST`.
- `user-module`: Defines the first rewritten bounded context, named `user`, including schema-only request/response contracts, repository-only persistence rules, and personal user endpoints expressed as action-style `GET` / `POST` routes instead of RESTful resource mutations.

### Modified Capabilities

None.

## Impact

- Affects backend package layout, API surface, persistence shape, bootstrap flow, and application entrypoints.
- Affects generated API contracts, frontend bindings, and backend test coverage because the current IAM/admin flows will be removed and the rewritten user/session endpoints now follow a GET/POST-only action style.
- Affects backend coding standards because the rewrite now requires explicit Python docstrings and explanatory inline comments in English.
- Preserves centralized Redis key-definition patterns, unified `BusinessException` / `AuthException` handling, and end-to-end async backend execution as part of the rewrite constraints.
- Explicitly does not include agent, AI, tool, or assistant-workspace implementation in this change.
