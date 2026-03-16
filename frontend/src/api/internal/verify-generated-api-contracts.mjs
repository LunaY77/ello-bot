import fs from 'node:fs/promises';
import path from 'node:path';

import {
  listTsModules,
  MODELS_REQ_DIR,
  MODELS_RESP_DIR,
  OPERATIONS_DIR,
  renderBarrel,
  SCHEMAS_DIR,
} from './codegen-utils.mjs';
import {
  API_OPERATION_MODULE,
  loadOperationGroups,
  renderApiOperationModule,
  renderOperationGroupModule,
} from './operation-contracts.mjs';

async function assertFileContent(filePath, expectedContent) {
  const actualContent = await fs.readFile(filePath, 'utf8');
  if (actualContent !== expectedContent) {
    throw new Error(`Generated file is out of sync: ${filePath}`);
  }
}

async function assertBarrel(dir) {
  const expectedBarrel = renderBarrel(await listTsModules(dir));
  await assertFileContent(path.join(dir, 'index.ts'), expectedBarrel);
}

await assertBarrel(MODELS_REQ_DIR);
await assertBarrel(MODELS_RESP_DIR);
await assertBarrel(SCHEMAS_DIR);
await assertBarrel(OPERATIONS_DIR);

const responseBarrel = await fs.readFile(path.join(MODELS_RESP_DIR, 'index.ts'), 'utf8');
if (!responseBarrel.includes("export * from './result';")) {
  throw new Error('Response model barrel must export Result.');
}

const groups = await loadOperationGroups();

await assertFileContent(
  path.join(OPERATIONS_DIR, `${API_OPERATION_MODULE}.ts`),
  renderApiOperationModule(),
);

for (const group of groups) {
  await assertFileContent(
    path.join(OPERATIONS_DIR, `${group.fileName}.ts`),
    renderOperationGroupModule(group),
  );
}
