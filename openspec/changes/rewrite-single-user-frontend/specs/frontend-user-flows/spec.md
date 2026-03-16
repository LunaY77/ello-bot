## ADDED Requirements

### Requirement: Authentication pages MUST integrate with the rewritten session endpoints
The rewritten frontend MUST implement login, registration, refresh, and logout behavior against the rewritten backend session contracts under `/api/sessions/*` rather than the legacy `/iam/auth/*` routes.

#### Scenario: Login uses rewritten session contract
- **WHEN** a user submits credentials from the login flow
- **THEN** the frontend calls the rewritten login contract under `/api/sessions/login` using generated request and response models

#### Scenario: Logout uses rewritten session contract
- **WHEN** an authenticated user signs out
- **THEN** the frontend calls the rewritten logout contract under `/api/sessions/logout` and clears local auth session state

### Requirement: Authenticated user flows MUST speak the single-user backend language directly
The rewritten frontend MUST use the rewritten current-user, profile, settings, and session contracts directly and MUST NOT assume tenant, role, permission, agent, workspace, or principal-oriented response shapes.

#### Scenario: Current viewer is read from single-user contract
- **WHEN** the frontend restores the authenticated viewer
- **THEN** it reads from `/api/user/me` and derives UI state from the rewritten single-user response shape

#### Scenario: Personal settings and profile stay personal
- **WHEN** the authenticated user updates profile or settings
- **THEN** the frontend uses `/api/user/profile` and `/api/user/settings` rather than routing those operations through admin or workspace-oriented flows

### Requirement: Session persistence MUST be based on the opaque access/refresh token pair
The rewritten frontend MUST persist the opaque access token and refresh token as client state, attach the access token to authenticated requests, attempt one refresh flow when appropriate, and clear local session state when refresh fails or auth is no longer valid.

#### Scenario: Access token is attached to protected API calls
- **WHEN** the frontend makes an authenticated API request
- **THEN** it sends the stored opaque access token through the shared API client

#### Scenario: Failed refresh clears local session
- **WHEN** a protected request receives an auth failure and refresh cannot restore the session
- **THEN** the frontend clears persisted session state and returns the user to an unauthenticated entry flow

### Requirement: Registration gating MUST be surfaced as backend-driven product behavior
The rewritten frontend MUST support the registration contract while allowing the backend to reject registration in MVP mode, and it MUST surface the returned business failure instead of inventing legacy invite, tenant, or bootstrap-only flows.

#### Scenario: Registration disabled is shown as backend business failure
- **WHEN** the backend rejects a registration attempt because MVP registration is disabled
- **THEN** the frontend presents the returned business failure through its shared error handling and leaves the user unauthenticated

### Requirement: The rewritten frontend MUST expose only supported single-user account surfaces
The rewritten frontend MUST prioritize user-facing flows for current-user display, profile editing, settings management, session visibility, and sign-out behavior. It MUST NOT preserve old viewer helper behavior that depends on mixed user-agent-principal models.

#### Scenario: Viewer presentation avoids legacy mixed-account logic
- **WHEN** the frontend renders the signed-in user's identity
- **THEN** it derives that identity from the rewritten single-user response rather than from legacy fallbacks such as tenant slug, agent code, or principal display metadata

### Requirement: Core single-user journeys MUST have end-to-end coverage
The rewritten frontend MUST cover critical routed and authenticated user journeys with Playwright end-to-end tests under `frontend/e2e/`. The covered journeys MUST include authentication entry, protected-route access, session continuity or restoration behavior where applicable, and personal user flows such as profile or settings updates.

#### Scenario: Authentication and route protection are covered by e2e
- **WHEN** the rewritten login and protected-route flows are delivered
- **THEN** Playwright end-to-end tests verify unauthenticated redirect behavior, successful sign-in, and authenticated access to protected pages

#### Scenario: Personal user workflows are covered by e2e
- **WHEN** the rewritten profile, settings, or session-management flows are delivered
- **THEN** Playwright end-to-end tests verify the corresponding backend-connected user journey against the routed application
