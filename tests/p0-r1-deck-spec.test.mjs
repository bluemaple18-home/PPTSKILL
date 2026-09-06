import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { contentHash, embedDeckSpec, extractDeckSpec, migrateLegacyFixture, patchComposition, sanitizeDeckSpec, validateDeckSpec } from '../runtime/deck-spec.js';

const legacy = JSON.parse(await readFile(new URL('../fixtures/functional-test-sample.json', import.meta.url), 'utf8'));

test('legacy title/body fixture 可遷移為 versioned DeckSpec', () => {
  const spec = migrateLegacyFixture(legacy);
  assert.equal(spec.schemaVersion, '1.0');
  assert.equal(spec.slides.length, 3);
  assert.equal(validateDeckSpec(spec).status, 'pass');
  assert.deepEqual(Object.keys(spec.slides[0]).sort(), ['composition', 'content', 'id']);
});

test('export sanitizer 只保留 allowlist 並拒絕私有 citation', () => {
  const dirty = migrateLegacyFixture(legacy);
  dirty.profile = { customer: 'secret' };
  dirty.localPath = '/Users/private/source.pdf';
  dirty.prompt = 'hidden prompt';
  dirty.slides[0].notes = 'private notes';
  dirty.slides[0].content.components = [
    { id: 'public-source', type: 'citation', label: '公開來源', url: 'https://example.com', public: true },
    { id: 'private-source', type: 'citation', label: '內部來源', public: false },
    { id: 'unsafe-source', type: 'citation', label: '本機來源', url: 'file:///Users/private/source.pdf', public: true },
    { id: 'table', type: 'table', headers: ['欄位'], rows: [[{ prompt: '不可洩漏' }]] },
  ];
  const clean = sanitizeDeckSpec(dirty);
  const serialized = JSON.stringify(clean);
  assert.doesNotMatch(serialized, /secret|private\/source|hidden prompt|private notes|內部來源/);
  assert.match(serialized, /公開來源/);
  assert.doesNotMatch(serialized, /file:\/\/|不可洩漏/);
});

test('換排版只變更 CompositionSpec，content hash 保持一致', () => {
  const spec = migrateLegacyFixture(legacy);
  const before = contentHash(spec.slides[0]);
  const patched = patchComposition(spec, 'sample-01', { primitive: 'split-proof', variant: 'reverse', slots: { title: 'content.title', points: 'content.keyPoints' }, leakedText: '不可進入' });
  assert.equal(contentHash(patched.slides[0]), before);
  assert.equal(patched.slides[0].composition.primitive, 'split-proof');
  assert.doesNotMatch(JSON.stringify(patched.slides[0].composition), /不可進入/);
});

test('另一個 runtime 可只從單一 HTML 取回 sanitized DeckSpec', () => {
  const original = migrateLegacyFixture(legacy);
  const html = embedDeckSpec('<!doctype html><html><body><main>deck</main></body></html>', original);
  assert.deepEqual(extractDeckSpec(html), sanitizeDeckSpec(original));
});

test('超過 15 頁、重複 ID 或 keyPoints 不足均 fail-loud', () => {
  const tooMany = migrateLegacyFixture({ ...legacy, slides: Array.from({ length: 16 }, (_, index) => ({ id: `s-${index}`, title: 'T', body: 'B' })) });
  tooMany.slides.push({ ...tooMany.slides[0], id: 's-16' });
  assert.equal(validateDeckSpec(tooMany).status, 'fail');

  const duplicate = migrateLegacyFixture(legacy);
  duplicate.slides[1].id = duplicate.slides[0].id;
  duplicate.slides[0].content.keyPoints = ['不足'];
  assert.equal(validateDeckSpec(duplicate).status, 'fail');
});
