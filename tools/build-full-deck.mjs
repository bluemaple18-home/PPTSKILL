import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { renderFullDeck } from '../runtime/full-deck-renderer.js';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const spec = JSON.parse(await readFile(resolve(root, 'fixtures/full-deck-spec.json'), 'utf8'));
const result = renderFullDeck(spec);
if (result.status !== 'pass') throw new Error(result.errors.join(' '));
await writeFile(resolve(root, 'fixtures/full-deck.html'), result.html);
console.log(`已產生 ${result.spec.slides.length} 頁 portable HTML deck。`);
