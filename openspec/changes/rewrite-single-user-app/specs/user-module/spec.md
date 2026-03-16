## ADDED Requirements

### Requirement: This change only implements the rewrite foundation and user module
This change MUST focus on two deliverables only:
- rewriting the backend into the required layered structure
- implementing the `user` module and its auth/session-related behavior

This change MUST NOT introduce agent, AI, tool-execution, or assistant-workspace features as part of the delivered scope.

#### Scenario: Rewrite scope excludes agent and AI work
- **WHEN** implementation tasks are selected for this change
- **THEN** they are limited to architectural rewrite work and user module behavior rather than agent runtime or AI integration features

#### Scenario: User module is the bounded context name
- **WHEN** a dedicated business module name is required in the rewritten backend
- **THEN** it uses `user` instead of a vague catch-all module name

### Requirement: User module exposes user-centered APIs
The rewritten backend MUST expose APIs for bootstrap initialization, registration, login, refresh, logout, current-user retrieval, and single-user settings/profile management without reintroducing tenant or RBAC semantics.

#### Scenario: User API avoids tenant semantics
- **WHEN** a client calls the rewritten user endpoints
- **THEN** request and response payloads do not require tenant identifiers, role lists, permission snapshots, or ACL-derived state

#### Scenario: User settings remain personal
- **WHEN** the current user updates preferences or profile data
- **THEN** the backend handles the operation as personal single-user state rather than administrative workspace management

### Requirement: User endpoints are action-style GET and POST routes
The supported user API surface MUST use action-style paths and only `GET` / `POST`. The supported user endpoints for this change are `POST /api/user/bootstrap-admin`, `GET /api/user/get-current-user`, `GET /api/user/get-profile`, `POST /api/user/update-profile`, `GET /api/user/get-settings`, and `POST /api/user/update-settings`.

#### Scenario: Current user is fetched through an action-style GET endpoint
- **WHEN** a client requests the authenticated user snapshot
- **THEN** the supported route is `GET /api/user/get-current-user`
- **AND** the supported surface does not rely on RESTful resource naming to express the operation

#### Scenario: Profile and settings updates use POST action endpoints
- **WHEN** a client updates personal profile or settings state
- **THEN** the supported routes are `POST /api/user/update-profile` and `POST /api/user/update-settings`
- **AND** the supported surface does not use `PATCH` or other RESTful mutation verbs

### Requirement: User persistence uses plain repositories only
The user module MUST use repositories as the only persistence-facing abstraction. Repositories MAY coordinate database and Redis access as needed for one concern, but this change MUST NOT introduce a separate query-repository layer.

#### Scenario: Repository aggregates DB and Redis concerns
- **WHEN** the session or user module needs both relational persistence and Redis-backed session state
- **THEN** the corresponding repository encapsulates that access pattern without splitting the read model into a separate query repository

#### Scenario: No query repo layer is introduced
- **WHEN** implementation files are created under `infra`
- **THEN** persistence is represented by repositories only, without `queries/*_query_repo.py` files

### Requirement: Schemas are the only request/response model layer
All request and response body definitions for this change MUST be defined under `api/schemas`. This change MUST NOT introduce separate DTO or value-object layers for HTTP payload exchange.

#### Scenario: Route uses schema as the contract model
- **WHEN** a route accepts or returns structured data
- **THEN** that shape is defined in `api/schemas` rather than in a separate DTO module

#### Scenario: No DTO module is required for user flows
- **WHEN** the user application service is implemented
- **THEN** the change does not require a parallel `dto.py` file for request/response body definitions
