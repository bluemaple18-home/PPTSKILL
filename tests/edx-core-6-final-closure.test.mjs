import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createDeckEditor } from '../runtime/deck-editor.js';
import { contentHash, extractDeckSpec, migrateLegacyFixture, patchSlideContent, resolveSlideElementIdentities, sanitizeDeckSpec } from '../runtime/deck-spec.js';
import { renderFullDeck } from '../runtime/full-deck-renderer.js';
import { fixture } from '../tools/edx-wp1-s4-perf-mounted.mjs';

test('Core6 舊 fixture 遷移後可只憑交付 HTML 完成 recipient patch 與重開', () => {
  const legacy = JSON.parse(readFileSync(new URL('../fixtures/functional-test-sample.json', import.meta.url), 'utf8'));
  const migrated = migrateLegacyFixture(legacy);
  const rendered = renderFullDeck(migrated);
  assert.equal(rendered.status, 'pass');
  const recipient = extractDeckSpec(rendered.html);
  assert.deepEqual(recipient, migrated);
  const target = recipient.slides[0], before = recipient.slides.map(contentHash);
  const identities = recipient.slides.map(resolveSlideElementIdentities);
  const patched = patchSlideContent(recipient, target.id, { subtitle: '交付後由收件者更新的副標題' });
  const reopened = renderFullDeck(patched);
  assert.equal(reopened.status, 'pass');
  const result = extractDeckSpec(reopened.html);
  assert.equal(result.slides[0].content.subtitle, '交付後由收件者更新的副標題');
  assert.deepEqual(result.slides.slice(1).map(contentHash), before.slice(1));
  assert.deepEqual(result.slides.map(resolveSlideElementIdentities), identities);
  assert.deepEqual(result, patched);
});

test('Core6 缺少 composition 的舊資料採用現行可渲染缺省版型', () => {
  const legacy = JSON.parse(readFileSync(new URL('../fixtures/functional-test-sample.json', import.meta.url), 'utf8'));
  const migrated = migrateLegacyFixture(legacy);
  for (const slide of migrated.slides) delete slide.composition;
  const clean = sanitizeDeckSpec(migrated);
  assert.ok(clean.slides.every(slide => slide.composition.primitive === 'title-points'));
  const rendered = renderFullDeck(clean);
  assert.equal(rendered.status, 'pass');
  assert.deepEqual(extractDeckSpec(rendered.html), clean);
});

test('Core6 Crop／Group／Lock／人工字級同份 canonical 可交付並由 recipient 重讀', () => {
  const spec = fixture(0), slide = spec.slides[0];
  slide.content.components.push({ id: 'group-text', type: 'text', text: '群組文字' });
  Object.assign(slide.composition.geometryOverrides, {
    'perf-image': { x: 420, y: 320, width: 300, height: 200 },
    'group-text': { x: 120, y: 120, width: 200, height: 160 },
  });
  slide.composition.typographyOverrides = { 'role-title': { fontSize: 72 } };
  spec.profile = { token: '不可交付' };
  const editor = createDeckEditor(spec), ids = ['component-group-text', 'component-perf-image'];
  editor.executeOperation({ operation: 'crop-image', target: { slideId: 'portable', elementId: 'component-perf-image' },
    value: { x: .2, y: .15, width: .5, height: .6, classification: 'decorative', confirm: true } });
  for (const operation of ['group-elements', 'lock-elements']) {
    editor.executeOperation({ operation, target: { slideId: 'portable', elementIds: ids }, value: {} });
  }
  const canonical = editor.getSpec(), rendered = renderFullDeck(canonical);
  assert.equal(rendered.status, 'pass');
  const recipient = extractDeckSpec(rendered.html), current = recipient.slides[0];
  assert.deepEqual(recipient, canonical);
  assert.deepEqual(current.composition.elementGroups, [ids]);
  assert.deepEqual(current.composition.lockedElementIds, ids);
  assert.equal(current.composition.typographyOverrides['role-title'].fontSize, 72);
  assert.deepEqual(current.content.components.find(component => component.id === 'perf-image').crop,
    { x: .2, y: .15, width: .5, height: .6 });
  assert.doesNotMatch(rendered.html, /不可交付/);
});
