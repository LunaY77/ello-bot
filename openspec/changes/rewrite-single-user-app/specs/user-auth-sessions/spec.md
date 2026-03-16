## ADDED Requirements

### Requirement: Username and password accounts
The system SHALL support standard user accounts authenticated with username and password. The persisted user model MUST NOT distinguish bootstrap admin from other users through owner, tenant, or role entities.

#### Scenario: Existing user logs in with username and password
- **WHEN** a persisted user submits valid username and password credentials
- **THEN** the system authenticates the user using the standard user model and creates a new auth session

#### Scenario: Bootstrap admin uses the same account structure
- **WHEN** the bootstrap admin user is created
- **THEN** it is stored using the same user schema as any other user account

### Requirement: Auth flows respect the layered backend architecture
Authentication and session use cases MUST be implemented through the required layered backend structure rather than through a dedicated IAM monolith. HTTP routes MUST delegate to application services, which in turn use repositories, Redis access snapshots, and runtime-owned resources.

#### Scenario: Login route delegates to application service
- **WHEN** a client submits username and password credentials
- **THEN** the HTTP route validates the request schema and delegates the login orchestration to an application service instead of implementing the flow inline

#### Scenario: Runtime owns auth dependencies
- **WHEN** auth/session services require DB or Redis
- **THEN** those resources are provided by the runtime and infrastructure layers instead of being created ad hoc inside route handlers

### Requirement: Auth request and response models live only in schemas
The request and response contracts for registration, login, refresh, logout, current-user retrieval, and settings/profile updates MUST be defined under `api/schemas`. This change MUST NOT add a separate DTO layer for auth/session payloads.

#### Scenario: Login payload is defined in schemas
- **WHEN** the API contract for login is implemented
- **THEN** the request and response models are defined in `api/schemas` instead of `application/*/dto.py`

### Requirement: Session endpoints are action-style GET and POST routes
The supported session/auth API surface MUST use action-style paths and only `GET` / `POST`. The supported session endpoints for this change are `POST /api/sessions/register`, `POST /api/sessions/login`, `POST /api/sessions/refresh`, `POST /api/sessions/logout`, `POST /api/sessions/logout-all`, and `GET /api/sessions/list`.

#### Scenario: List sessions uses GET action endpoint
- **WHEN** a client requests the authenticated user's active sessions
- **THEN** the supported route is `GET /api/sessions/list`
- **AND** the supported surface does not require a RESTful collection endpoint with other mutation verbs

#### Scenario: Session mutations use POST action endpoints
- **WHEN** a client registers, logs in, refreshes, or logs out
- **THEN** the supported route uses `POST`
- **AND** the supported path is action-oriented rather than a RESTful resource mutation contract

### Requirement: Bootstrap admin is initialized from environment variables
The system SHALL initialize one bootstrap admin user from environment variables when the installation has not yet created it. This bootstrap user SHALL provide the default MVP login path without introducing a generalized role or tenant model.

#### Scenario: Fresh installation creates bootstrap admin
- **WHEN** the application starts on a fresh installation
- **THEN** it creates the bootstrap admin user from configured environment values

#### Scenario: Repeated startup remains idempotent
- **WHEN** the application restarts after the bootstrap admin already exists
- **THEN** it does not create duplicate bootstrap users

### Requirement: Registration is implemented but gated in MVP
The system SHALL implement a real username/password registration contract, public registration endpoint, and registration business flow. While MVP single-user mode is active, submitted registration requests SHALL be rejected with a business error response so that no new user or session is created.

#### Scenario: Registration request is blocked in MVP
- **WHEN** a client calls the registration endpoint while MVP registration is disabled
- **THEN** the system returns the defined business error and does not create a user or auth session

#### Scenario: Blocked registration does not create a user
- **WHEN** a registration request is rejected by the MVP gate
- **THEN** no new user record or auth session is created

### Requirement: Sessions use dual opaque tokens
The system SHALL issue opaque access and refresh tokens after successful login. Both tokens MUST be non-JWT opaque values, and session renewal MUST be driven by the refresh token rather than embedded claims.

#### Scenario: Login returns both opaque tokens
- **WHEN** a user logs in successfully
- **THEN** the response includes an opaque access token and an opaque refresh token

#### Scenario: Refresh renews the auth session
- **WHEN** a client presents a valid refresh token
- **THEN** the system renews or rotates the session using opaque-token semantics

### Requirement: Access-token authentication uses Redis-backed user info
Protected API authentication SHALL validate access tokens through Redis-backed user info or session snapshots rather than per-request database lookups. The Redis key space for these snapshots MUST be defined through centralized key definitions.

#### Scenario: Protected route authenticates from Redis snapshot
- **WHEN** a client presents a valid access token to a protected route
- **THEN** the system resolves the hashed token through Redis and reconstructs the authenticated user/session context from the stored snapshot

#### Scenario: Invalid access token is rejected without user lookup
- **WHEN** a client presents an invalid or missing access token
- **THEN** the system rejects the request using the auth error contract without requiring a per-request user lookup

### Requirement: Auth errors use the existing exception handling mechanism
Authentication and registration failures MUST reuse the current `BusinessException`, `AuthException`, `CommonErrorCode`, and global exception-handler pattern instead of introducing a new base exception hierarchy.

#### Scenario: Business auth failure uses BusinessException
- **WHEN** registration or another business-rule failure occurs in the user module
- **THEN** the application raises `BusinessException` with a module-specific error-code enum and the HTTP layer returns the standard `Result.fail(...)` payload with status 400

#### Scenario: Auth failure uses AuthException
- **WHEN** a login, refresh, or protected-route authentication failure occurs
- **THEN** the API layer returns the existing `AuthException`-based 401 response shape rather than introducing a new exception base class

### Requirement: Auth and registration failures use unified error codes
Authentication and registration responses SHALL use the unified API error payload format and structured error-code design rather than ad hoc error strings.

#### Scenario: Registration-disabled response uses business error format
- **WHEN** the registration endpoint rejects a request because MVP registration is disabled
- **THEN** the response uses the standard business error code and message payload shape

#### Scenario: Invalid token response uses auth error format
- **WHEN** access-token validation fails
- **THEN** the response uses the standard auth error code and message payload shape
