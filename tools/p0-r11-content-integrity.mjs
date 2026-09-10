import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { contentHash, extractDeckSpec, patchComposition } from '../runtime/deck-spec.js';
import { renderFullDeck } from '../runtime/full-deck-renderer.js';

const root = resolve(import.meta.dirname, '..');
const inputPath = resolve(root, 'evidence/p0-r11/editor-export/final-exported-deck.html');
const outputDir = resolve(root, 'evidence/p0-r11/content-integrity');
const html = await readFile(inputPath, 'utf8');
const before = extractDeckSpec(html);
const targetId = 'company-content-gradient';
const target = before.slides.find((slide) => slide.id === targetId);
if (!target) throw new Error(`找不到 ${targetId}。`);

const patched = patchComposition(before, targetId, {
  ...target.composition,
  variant: 'company-content-dark',
});
const rendered = renderFullDeck(patched);
if (rendered.status !== 'pass') throw new Error(rendered.errors.join('\n'));
const reopened = extractDeckSpec(rendered.html);
const beforeHashes = Object.fromEntries(before.slides.map((slide) => [slide.id, contentHash(slide)]));
const afterHashes = Object.fromEntries(reopened.slides.map((slide) => [slide.id, contentHash(slide)]));
const changedContentSlides = Object.keys(beforeHashes).filter((id) => beforeHashes[id] !== afterHashes[id]);
const compositionChanged = JSON.stringify(target.composition) !== JSON.stringify(reopened.slides.find((slide) => slide.id === targetId)?.composition);
const receipt = {
  schemaVersion: '1.0',
  status: compositionChanged && changedContentSlides.length === 0 ? 'pass' : 'fail',
  source: 'editor-export/final-exported-deck.html',
  targetSlideId: targetId,
  compositionBefore: target.composition,
  compositionAfter: reopened.slides.find((slide) => slide.id === targetId)?.composition,
  compositionChanged,
  beforeContentHashes: beforeHashes,
  afterContentHashes: afterHashes,
  changedContentSlides,
  renderedHtmlSha256: createHash('sha256').update(rendered.html).digest('hex'),
};
await mkdir(outputDir, { recursive: true });
await writeFile(resolve(outputDir, 'composition-only-patch.json'), `${JSON.stringify(receipt, null, 2)}\n`);
if (receipt.status !== 'pass') throw new Error('Composition-only content integrity 驗收失敗。');
console.log(JSON.stringify(receipt, null, 2));
