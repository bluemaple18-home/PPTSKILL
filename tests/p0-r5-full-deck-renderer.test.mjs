import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { contentHash, extractDeckSpec, patchComposition } from '../runtime/deck-spec.js';
import { listCompositionPrimitives, validateDeckCompositions } from '../runtime/composition-primitives.js';
import { renderFullDeck } from '../runtime/full-deck-renderer.js';

const fixture = JSON.parse(await readFile(new URL('../fixtures/full-deck-spec.json', import.meta.url), 'utf8'));

test('reviewed primitive registry 提供多種內容形狀，而非單一固定版型', () => {
  const primitives = listCompositionPrimitives();
  assert.ok(primitives.length >= 6);
  assert.ok(new Set(primitives.map(({ kind }) => kind)).size >= 5);
  assert.equal(validateDeckCompositions(fixture).status, 'pass');
  assert.ok(new Set(fixture.slides.map(({ composition }) => composition.primitive)).size >= 5);
});

test('完整 renderer 以同一 StyleSpec 輸出多版型單檔 HTML', () => {
  const result = renderFullDeck(fixture);
  assert.equal(result.status, 'pass');
  assert.equal((result.html.match(/class="slide primitive-/g) ?? []).length, fixture.slides.length);
  assert.equal((result.html.match(/data-style-id="route-technical-map"/g) ?? []).length, 1);
  assert.doesNotMatch(result.html, /<script\s+src=|<link\s+[^>]*href=/i);
  assert.deepEqual(extractDeckSpec(result.html), result.spec);
});

test('renderer 暴露精確 edit targets，並跳脫任意 HTML', () => {
  const injected = structuredClone(fixture);
  injected.slides[1].content.title = '<img src=x onerror=alert(1)>';
  injected.style.typography.display = 'Arial;}</style><script>alert(2)</script>';
  injected.style.palette.accent = 'red;}</style><script>alert(3)</script>';
  const result = renderFullDeck(injected);
  assert.equal(result.status, 'pass');
  assert.match(result.html, /data-edit-target="slides\.problem\.content\.title"/);
  assert.doesNotMatch(result.html, /<img src=x onerror=/);
  assert.doesNotMatch(result.html, /<script>alert\([23]\)/);
  assert.match(result.html, /&lt;img src=x onerror=alert\(1\)&gt;/);
});

test('未知 primitive 與不存在的 component reference 會 fail-loud', () => {
  const arbitrary = structuredClone(fixture);
  arbitrary.slides[1].composition.primitive = 'arbitrary-absolute-html';
  assert.equal(renderFullDeck(arbitrary).status, 'fail');

  const missing = structuredClone(fixture);
  missing.slides[4].composition.slots.component = 'content.components.missing';
  const result = renderFullDeck(missing);
  assert.equal(result.status, 'fail');
  assert.match(result.errors.join(' '), /不存在的 component/);
});

test('alternate composition 只換 CompositionSpec，不改內容 hash', () => {
  const before = contentHash(fixture.slides[1]);
  const patched = patchComposition(fixture, 'problem', {
    primitive: 'metric-grid',
    variant: 'cards',
    slots: { title: 'content.title', subtitle: 'content.subtitle', points: 'content.keyPoints' },
  });
  assert.equal(contentHash(patched.slides[1]), before);
  assert.equal(renderFullDeck(patched).status, 'pass');
});

test('motion 僅由 StyleSpec 注入，並尊重 reduced-motion', () => {
  const result = renderFullDeck(fixture);
  assert.match(result.html, /--motion:180ms;--ease:ease-out/);
  assert.match(result.html, /@media\(prefers-reduced-motion:reduce\)/);
  assert.equal((result.html.match(/--motion:/g) ?? []).length, 1);
});
