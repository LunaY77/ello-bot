import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ROOT = path.resolve(__dirname, '../..');
const OUTPUT_DIR = path.join(ROOT, 'locales/en-US');

export async function genDefaultLocale() {
  const resources = await import('../../src/locales/default/index.js');
  const data = resources.default;

  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  for (const [ns, value] of Object.entries(data)) {
    const filepath = path.join(OUTPUT_DIR, `${ns}.json`);
    fs.writeFileSync(filepath, JSON.stringify(value, null, 2) + '\n');
    console.log(`Generated ${filepath}`);
  }

  console.log(`\nDone! Generated ${Object.keys(data).length} locale files.`);
}
