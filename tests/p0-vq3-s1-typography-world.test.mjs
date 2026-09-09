import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { contentHash, extractDeckSpec } from '../runtime/deck-spec.js';
import { renderFullDeck } from '../runtime/full-deck-renderer.js';

const fixture = JSON.parse(await readFile(new URL('../fixtures/full-deck-spec.json', import.meta.url), 'utf8'));

test('S1 fixture 以 Typography Hero 延伸 10 頁同一視覺世界', () => {
  assert.equal(fixture.style.id, 'route-editorial-rail');
  assert.equal(fixture.slides.length, 10);
  assert.deepEqual(new Set(fixture.slides.map(({ composition }) => composition.variant)), new Set([
    'monument',
    'editorial-index',
    'proof-ledger',
    'metric-contrast',
    'vertical-sequence',
    'quote-monument',
    'dense-ledger',
    'quiet-transition',
    'evidence-axis',
    'closing-manifesto',
  ]));
});

test('Typography Hero renderer 保留語意內容並輸出可辨識 visual-world hooks', () => {
  const before = fixture.slides.map(contentHash);
  const result = renderFullDeck(fixture);
  assert.equal(result.status, 'pass');
  assert.match(result.html, /data-visual-world="typography-hero"/);
  assert.match(result.html, /class="type-monument"/);
  assert.match(result.html, /data-effect-title/);
  assert.match(result.html, /data-effect-visual-anchor/);
  assert.match(result.html, /class="slide-folio"/);
  assert.match(result.html, /class="metric-value"/);
  assert.match(result.html, /variant-dense-ledger/);
  assert.match(result.html, /variant-quiet-transition/);
  assert.deepEqual(extractDeckSpec(result.html).slides.map(contentHash), before);
});

test('S1 涵蓋指定的七種判讀頁型', () => {
  const primitives = new Set(fixture.slides.map(({ composition }) => composition.primitive));
  for (const primitive of ['title-points', 'split-proof', 'metric-grid', 'process-flow', 'component-focus', 'section-break']) {
    assert.ok(primitives.has(primitive), `缺少 ${primitive}`);
  }
  assert.ok(fixture.slides.some(({ composition }) => composition.variant === 'dense-ledger'));
  assert.ok(fixture.slides.some(({ composition }) => composition.variant === 'quiet-transition'));
});
