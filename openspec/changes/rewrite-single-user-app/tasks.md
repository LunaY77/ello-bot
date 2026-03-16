## 1. Spec and architecture alignment

- [x] 1.1 Audit the current repository and classify major areas as `retain after audit`, `delete as legacy`, or `neutral but must be rewritten around runtime`, with IAM/admin code explicitly marked for removal
- [x] 1.2 Rewrite the change design so the backend is constrained to the required layered structure, scoped only to rewrite plus the `user` module, without agent or AI work
- [x] 1.3 Update the capability specs so single-user core, auth/sessions, and the `user` module behavior reflect the new rules around schemas-only contracts, repository-only persistence, and existing exception handling

## 2. Core and runtime foundation

- [x] 2.1 Create the new `core/` package for config, logging, exceptions, IDs, clock, JSON helpers, common types, and constants
- [x] 2.2 Create the new `runtime/` package with `AppRuntime`, container wiring, lifecycle helpers, and runtime state management (`created`, `starting`, `started`, `stopping`, `stopped`)
- [x] 2.3 Rebuild the FastAPI entrypoint so lifespan only starts/stops `AppRuntime` and stores it on `app.state`

## 3. Single-user domain, application, and infrastructure slices

- [x] 3.1 Introduce the `domain/user` and `domain/session` packages with entities, enums, and domain errors only
- [x] 3.2 Introduce the `application/user` and `application/session` services without adding `dto.py`
- [x] 3.3 Build `infra/db` with SQLAlchemy base/session wiring, Unit of Work, models, and repositories only, with repositories allowed to coordinate both DB and Redis access
- [x] 3.4 Build only the `infra/cache` and `infra/observability` pieces needed for the rewrite and user module

## 4. Single-user API and auth/session flows

- [x] 4.1 Build the new `api/` package with shared deps/errors/router plus `routes/user.py`, `routes/sessions.py`, `routes/health.py`, and `routes/debug.py`
- [x] 4.2 Build `api/schemas/common.py`, `user.py`, and `session.py`, and keep all request/response contracts in schemas only
- [x] 4.3 Implement bootstrap admin initialization, login, refresh, logout, Redis-backed access authentication, current-user retrieval, and MVP registration gating through the layered architecture without reviving a standalone IAM module
- [x] 4.4 Implement single-user personal settings/profile flows without introducing assistant workspace, agent, AI, or tool features

## 5. Cleanup and verification

- [x] 5.1 Remove legacy IAM routers, services, bootstrap logic, backend tests, and obsolete contracts once the replacement single-user architecture is in place
- [x] 5.2 Regenerate API contracts and update shared client bindings to match the rewritten backend surface
- [x] 5.3 Rebaseline backend tests around the new runtime, layered architecture, and single-user auth/session flows
- [x] 5.4 Verify reusable infrastructure case by case, then delete remaining dead legacy code and documentation

## 6. Python documentation and comment pass

- [x] 6.1 Audit the rewritten Python files under `api/`, `runtime/`, `core/`, `domain/`, `application/`, and `infra/` for missing class docstrings, missing method/function docstrings, and missing `Args` / `Returns` sections where required
- [x] 6.2 Update rewritten Python classes so each class has an English docstring describing its purpose, and update rewritten functions/methods so each has an English docstring with a behavior description plus `Args` and `Returns` sections when applicable
- [x] 6.3 Add English inline comments to non-obvious lifecycle, dependency-wiring, repository, auth/session, and error-handling logic without adding redundant comments to trivial statements
- [x] 6.4 Re-run targeted verification after the documentation pass to confirm the docstring/comment edits do not change runtime behavior or break tests

## 7. API contract rewrite to GET/POST-only action endpoints

- [x] 7.1 Rewrite the change proposal, design, and capability specs so the supported backend surface is explicitly constrained to action-style endpoints that use only `GET` and `POST`, with no RESTful mutation verbs
- [x] 7.2 Refactor the backend user/session routes, helpers, and backend tests to the new action-style endpoint paths and remove `PATCH` or resource-style contracts from the supported surface
- [ ] 7.3 Regenerate OpenAPI and frontend API bindings, then update remaining frontend or documentation references to the new endpoint paths
- [ ] 7.4 Re-run targeted verification for the GET/POST-only endpoint refactor, including backend tests and generated contract checks
