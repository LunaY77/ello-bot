## 1. Codegen pipeline

- [x] 1.1 Split frontend API sync helpers so build-time OpenAPI/codegen stages are isolated from runtime request helpers
- [x] 1.2 Add an operation-contract generation stage that emits synced method/path/operation metadata under `src/api/`
- [x] 1.3 Update the API codegen workflow to reconcile public barrels, including exporting post-processed support artifacts such as `Result`

## 2. Consumer migration

- [x] 2.1 Publish documented public entrypoints for generated request models, response models, schemas, and operation contracts
- [x] 2.2 Migrate `src/lib/auth/auth-config.ts` and session-related feature API wrappers to consume generated operation contracts instead of hardcoded rewritten backend paths and verbs
- [x] 2.3 Migrate user-related feature API wrappers to consume generated operation contracts instead of hardcoded rewritten backend paths and verbs

## 3. Verification and documentation

- [x] 3.1 Add codegen verification that operation contracts are generated and support artifacts such as `Result` remain publicly exportable after sync
- [x] 3.2 Update frontend API-sync documentation to describe the unified workflow, generated outputs, and consumption rules for handwritten feature wrappers
- [x] 3.3 Run the relevant frontend API sync, type-checking, and lint verification steps after the migration is complete
