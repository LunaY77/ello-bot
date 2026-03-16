import fs from 'node:fs/promises';
import path from 'node:path';

import { ensureDir, OPERATIONS_DIR } from './codegen-utils.mjs';
import {
  API_OPERATION_MODULE,
  loadOperationGroups,
  renderApiOperationModule,
  renderOperationGroupModule,
} from './operation-contracts.mjs';

await fs.rm(OPERATIONS_DIR, { recursive: true, force: true });
await ensureDir(OPERATIONS_DIR);

const groups = await loadOperationGroups();

await fs.writeFile(
  path.join(OPERATIONS_DIR, `${API_OPERATION_MODULE}.ts`),
  renderApiOperationModule(),
  'utf8',
);

for (const group of groups) {
  await fs.writeFile(
    path.join(OPERATIONS_DIR, `${group.fileName}.ts`),
    renderOperationGroupModule(group),
    'utf8',
  );
}
