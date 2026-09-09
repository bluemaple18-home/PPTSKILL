import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { contentHash, extractDeckSpec } from '../runtime/deck-spec.js';
import { createInformationLedDeck } from '../runtime/full-deck-variants.js';
import { renderFullDeck } from '../runtime/full-deck-renderer.js';

const typographyDeck = JSON.parse(await readFile(new URL('../fixtures/full-deck-spec.json', import.meta.url), 'utf8'));
const styleCandidates = JSON.parse(await readFile(new URL('../fixtures/style-candidates.json', import.meta.url), 'utf8'));
const informationDeck = createInformationLedDeck(typographyDeck, styleCandidates);

test('S2 只切換 Style，保留相同頁序、CompositionSpec 與內容雜湊', () => {
  assert.equal(informationDeck.style.id, 'route-technical-map');
  assert.notEqual(informationDeck.style.id, typographyDeck.style.id);
  assert.deepEqual(informationDeck.slides.map(({ id }) => id), typographyDeck.slides.map(({ id }) => id));
  assert.deepEqual(informationDeck.slides.map(({ composition }) => composition), typographyDeck.slides.map(({ composition }) => composition));
  assert.deepEqual(informationDeck.slides.map(contentHash), typographyDeck.slides.map(contentHash));
});

test('Information Led 使用同一 renderer seam，輸出獨立 visual world 與真實語意 anchor', () => {
  const result = renderFullDeck(informationDeck);
  assert.equal(result.status, 'pass');
  assert.match(result.html, /data-visual-world="information-led"/);
  assert.match(result.html, /data-information-anchor/);
  assert.match(result.html, /data-semantic-source="content.keyPoints"/);
  assert.doesNotMatch(result.html, /data-type-visual/);
  assert.doesNotMatch(result.html, /class="type-monument"/);
  assert.deepEqual(extractDeckSpec(result.html).slides.map(contentHash), typographyDeck.slides.map(contentHash));
});

test('Information Led 不以換色冒充 Style portability', () => {
  const typographyHtml = renderFullDeck(typographyDeck).html;
  const informationHtml = renderFullDeck(informationDeck).html;
  for (const hook of ['information-sequence', 'system-folio', 'system-axis']) assert.match(informationHtml, new RegExp(hook));
  for (const hook of ['information-sequence', 'system-axis']) assert.doesNotMatch(typographyHtml, new RegExp(hook));
  assert.match(informationHtml, /variant-dense-ledger/);
  assert.match(informationHtml, /variant-evidence-axis/);
});
