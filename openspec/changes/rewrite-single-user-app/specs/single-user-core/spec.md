## ADDED Requirements

### Requirement: Backend uses the required layered architecture
The backend MUST be organized around the top-level layers `api`, `runtime`, `core`, `domain`, `application`, and `infra`. New code MUST NOT reintroduce an IAM-style module tree as the primary backend architecture.

#### Scenario: New backend code lands in the required backend spine
- **WHEN** the backend rewrite is implemented
- **THEN** HTTP adapters, runtime lifecycle, domain rules, application orchestration, and infrastructure implementations live in their corresponding top-level layers instead of a single feature-local module

#### Scenario: Legacy IAM package is not the new home of the runtime
- **WHEN** the rewritten single-user backend is assembled
- **THEN** the supported runtime does not depend on a replacement `modules/iam`-style package to organize application behavior

### Requirement: FastAPI is only an HTTP adapter
The API layer MUST validate HTTP payloads, use schemas as the request/response contract, call application services, and translate the result into HTTP responses. Routes MUST NOT directly own lifecycle setup or persistence orchestration.

#### Scenario: Route delegates business flow
- **WHEN** a route receives a single-user request
- **THEN** it delegates the business flow to an application service instead of coordinating the flow inline

### Requirement: Rewritten endpoints use GET and POST only
The supported API surface for this change MUST use only `GET` and `POST`. The rewrite MUST NOT expose `PATCH`, `PUT`, or `DELETE` endpoints as part of the supported backend contract.

#### Scenario: Mutation endpoint uses POST instead of RESTful patch semantics
- **WHEN** the rewritten backend exposes a state-changing user or session operation
- **THEN** it uses `POST`
- **AND** it does not rely on `PATCH`, `PUT`, or `DELETE`

#### Scenario: Read endpoint uses GET without RESTful mutation semantics
- **WHEN** the rewritten backend exposes a read-only user or session operation
- **THEN** it uses `GET`
- **AND** the supported path remains action-oriented rather than depending on implicit CRUD semantics

### Requirement: AppRuntime owns system lifecycle and assembly
The running system MUST expose an `AppRuntime` that owns long-lived resources and application services. `AppRuntime` MUST manage the states `created`, `starting`, `started`, `stopping`, and `stopped`, and MUST provide `start()` and `stop()` methods.

#### Scenario: FastAPI lifespan only hosts the runtime
- **WHEN** the web process starts
- **THEN** FastAPI lifespan creates `AppRuntime`, calls `start()`, stores it in `app.state`, and later calls `stop()` on shutdown without directly assembling system resources itself

#### Scenario: Runtime start assembles the system
- **WHEN** `AppRuntime.start()` runs
- **THEN** it creates resources and services before marking the runtime as started

### Requirement: Domain and application boundaries stay explicit
Domain packages MUST define entities, enums, and domain errors without relying on FastAPI, SQLAlchemy, or external SDKs where avoidable. Application packages MUST own single-user use-case orchestration.

#### Scenario: Domain rule does not require web or ORM imports
- **WHEN** business invariants for single-user and session behavior are expressed
- **THEN** they are represented in domain types without depending on FastAPI route types or SQLAlchemy models

### Requirement: Repository and Unit of Work boundaries are enforced
Repositories MUST encapsulate persistence access for domain concepts, and cross-repository write flows MUST use a Unit of Work. Repositories MAY coordinate both database and Redis access, but this change MUST NOT add a separate query-repository layer.

#### Scenario: Cross-repository write flow uses UoW
- **WHEN** a use case writes multiple aggregates in one transaction
- **THEN** the application service coordinates those writes through a Unit of Work instead of manually opening and committing scattered sessions

#### Scenario: Repository aggregates DB and Redis access
- **WHEN** a single-user or session use case needs relational data plus Redis-backed state
- **THEN** the repository encapsulates both concerns without introducing a separate query repository

### Requirement: User model has no owner or RBAC distinction
The system MUST model application users as independent accounts without tenant, membership, role, permission, ACL, or owner-specific entity distinctions. The runtime model MUST NOT require tenant-scoped principals or access-control graphs in order to function.

#### Scenario: Bootstrap admin uses the same user model
- **WHEN** a new installation is initialized
- **THEN** the system creates or repairs the bootstrap admin as a standard user record without creating tenant or RBAC records

#### Scenario: Runtime behavior does not depend on access-control graphs
- **WHEN** the application serves normal single-user flows
- **THEN** backend APIs do not require tenant selection, membership lookup, role evaluation, or ACL resolution

### Requirement: Legacy IAM model is out of scope
The rewritten system MUST NOT expose legacy multi-tenant IAM concepts as part of the supported backend model. API contracts and persisted application concepts MUST avoid tenant, membership, role, permission, and ACL semantics unless they are being referenced only as migration or deletion targets during implementation.

#### Scenario: Supported surface excludes legacy IAM concepts
- **WHEN** a user interacts with the rewritten application
- **THEN** the supported API and backend surface does not ask the user to manage tenants, roles, permissions, memberships, or access-control entries

#### Scenario: New models do not reintroduce legacy abstractions
- **WHEN** new backend entities and API contracts are defined for the rewrite
- **THEN** they are based on single-user and auth-session concepts instead of legacy IAM abstractions

### Requirement: MVP runs in single-user mode
The MVP backend and API surface MUST behave as a single-user experience. The system MUST NOT expose tenant switching, delegated administration, collaboration, or multi-user management as supported MVP features.

#### Scenario: Multi-user access-control features are absent
- **WHEN** the application serves MVP requests
- **THEN** it does not rely on or expose tenant switching, delegated access control, or RBAC-derived behavior

### Requirement: This change excludes agent and AI implementation
The rewrite MUST NOT include agent, AI, tool-registry, or assistant-workspace implementation as part of this change set.

#### Scenario: Scope stays on rewrite and user module
- **WHEN** the change is implemented
- **THEN** delivered code is limited to architecture rewrite and the `user` module rather than agent or AI features

### Requirement: Rewritten Python code is explicitly documented
Python code introduced or materially rewritten by this change MUST include English docstrings and meaningful inline comments so the new layered architecture remains readable and maintainable.

#### Scenario: Methods describe behavior and arguments
- **WHEN** a Python function or method is added or rewritten as part of the backend rewrite
- **THEN** it includes an English docstring with a short behavior description
- **AND** it includes an `Args` section when the callable accepts arguments
- **AND** it includes a `Returns` section when the callable returns a value

#### Scenario: Classes describe their purpose
- **WHEN** a Python class is added or rewritten as part of the backend rewrite
- **THEN** it includes an English docstring that explains the class purpose

#### Scenario: Non-obvious logic is annotated inline
- **WHEN** lifecycle orchestration, repository coordination, auth/session handling, or other non-trivial logic is implemented
- **THEN** the code includes English inline comments that explain intent or reasoning rather than repeating the syntax
