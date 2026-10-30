import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { renderFullDeck } from '../runtime/full-deck-renderer.js';
import { createInformationLedDeck } from '../runtime/full-deck-variants.js';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const routeIndex = process.argv.indexOf('--route');
const route = routeIndex >= 0 ? process.argv[routeIndex + 1] : 'typography-hero';
const outputIndex = process.argv.indexOf('--output');
const output = outputIndex >= 0 ? process.argv[outputIndex + 1] : 'fixtures/full-deck.html';
const baseSpec = JSON.parse(await readFile(resolve(root, 'fixtures/full-deck-spec.json'), 'utf8'));
const spec = route === 'company'
  ? JSON.parse(await readFile(resolve(root, 'fixtures/company-style-deck-spec.json'), 'utf8'))
  : route === 'information-led'
  ? createInformationLedDeck(baseSpec, JSON.parse(await readFile(resolve(root, 'fixtures/style-candidates.json'), 'utf8')))
  : baseSpec;
if (!['typography-hero', 'information-led', 'company'].includes(route)) throw new Error('--route 只接受 typography-hero、information-led 或 company。');
const result = renderFullDeck(spec);
if (result.status !== 'pass') throw new Error(result.errors.join(' '));
await writeFile(resolve(root, output), result.html);
console.log(`已產生 ${result.spec.slides.length} 頁 ${route} portable HTML deck。`);
