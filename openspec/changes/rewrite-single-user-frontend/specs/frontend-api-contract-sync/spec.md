## ADDED Requirements

### Requirement: `docs/api/openapi.json` SHALL be the frontend contract source of truth
The rewritten frontend MUST treat `docs/api/openapi.json` as the committed OpenAPI contract source for API synchronization.

#### Scenario: Backend contract update starts from committed OpenAPI
- **WHEN** the backend API contract changes
- **THEN** the frontend synchronization flow reads the updated contract from `docs/api/openapi.json`

### Requirement: Frontend schema and model generation MUST run through the defined codegen workflow
The rewritten frontend MUST generate request models, response models, and request-body schemas through the existing frontend codegen workflow rather than through manual type authoring.

#### Scenario: Frontend codegen updates generated artifacts
- **WHEN** the frontend contract synchronization command is run
- **THEN** it regenerates artifacts under `src/api/models/req`, `src/api/models/resp`, and `src/api/schemas`

#### Scenario: Repository-level sync remains available
- **WHEN** backend and frontend contracts need to be synchronized together
- **THEN** the repository-level sync workflow may call the frontend codegen command after regenerating `docs/api/openapi.json`

### Requirement: Generated API artifacts MUST NOT be edited by hand
The rewritten frontend MUST treat generated model and schema files as read-only outputs. Adjustments to generated output MUST be made through backend OpenAPI changes or frontend generation helpers under `src/api/internal/`.

#### Scenario: Generation fix is applied in codegen helper
- **WHEN** generated naming or shaping needs to change
- **THEN** the change is made in the codegen configuration or post-processing layer rather than by editing generated files directly

### Requirement: Handwritten API wrappers MUST use generated contracts and the shared API client
The rewritten frontend MUST implement handwritten business API wrappers on top of the shared API client and generated request/response contracts, and it MUST NOT create ad hoc per-feature HTTP client stacks or duplicate backend response types manually.

#### Scenario: Business API wrapper uses shared client
- **WHEN** a feature implements a handwritten API call
- **THEN** it uses the shared API client and generated contract types instead of a feature-local axios instance or manually duplicated response interface

### Requirement: Frontend contract sync MUST target the rewritten backend paths
The rewritten frontend MUST align API integration to the rewritten backend paths under `/api/sessions/*`, `/api/user/*`, `/api/debug/*`, and `/health` as exposed by the committed OpenAPI document.

#### Scenario: Legacy IAM endpoints are not used for rewritten work
- **WHEN** new frontend business flows are implemented during the rewrite
- **THEN** they do not depend on legacy `/iam/*` endpoint paths and instead use the rewritten backend contract paths defined in `docs/api/openapi.json`
