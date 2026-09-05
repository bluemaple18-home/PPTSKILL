import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildThemePreviews } from '../runtime/theme-preview.js';

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const manifestPath = resolve(projectRoot, 'fixtures/theme-preview-manifest.json');
const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
const previews = buildThemePreviews(manifest.content);

for (const preview of previews) {
  const target = resolve(projectRoot, 'fixtures/theme-previews', `${preview.id}.html`);
  await mkdir(dirname(target), { recursive: true });
  await writeFile(target, preview.html);
}

console.log(`已產生 ${previews.length} 款 HTML/CSS 封面預覽。`);
