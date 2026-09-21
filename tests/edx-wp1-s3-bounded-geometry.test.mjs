import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import vm from 'node:vm';
import { createDeckEditor, OPERATION_DESCRIPTORS, buildDeckEditorRuntimeScript } from '../runtime/deck-editor.js';
import { extractDeckSpec, sanitizeDeckSpec, resolveSlideElementIdentities, validateDeckSpec } from '../runtime/deck-spec.js';
import { renderFullDeck } from '../runtime/full-deck-renderer.js';

const fixture = JSON.parse(await readFile(new URL('../fixtures/full-deck-spec.json', import.meta.url), 'utf8'));
const target = { slideId: 'portable', elementId: 'component-portable-quote' };
const box = { x: 800, y: 280, width: 640, height: 480 };
const slideOf = spec => spec.slides.find(s => s.id === target.slideId);
const geometryOf = spec => slideOf(spec).composition.geometryOverrides?.['portable-quote'];
const request = (operation, value, destination = target) => ({ operation, target: destination, value });

// 只執行產出的 browser public API；此 DOM stub 不冒充實機排版驗收。
function browserEditor(input) {
  const tag = { textContent: JSON.stringify(sanitizeDeckSpec(input)) };
  const elements = new Map();
  const slides = input.slides.map(s => {
    const nodes = resolveSlideElementIdentities(sanitizeDeckSpec(input).slides.find(x => x.id === s.id));
    for (const id of [nodes.title, nodes.subtitle, ...nodes.keyPoints, ...nodes.components]) elements.set(s.id + '/' + id, {
      dataset: {}, textContent: '', style: {}, matches: () => false,
      setAttribute(name, value) { this[name] = value; }, removeAttribute(name) { delete this[name]; },
    });
    return { dataset: { slideId: s.id }, addEventListener() {}, querySelector(selector) { return elements.get(s.id + '/' + selector.match(/="([^"]+)"/)?.[1]) || null; }, querySelectorAll() { return []; } };
  });
  const document = { readyState: 'complete', body: { dataset: {} }, addEventListener() {},
    querySelector(selector) { if (selector === '#deck-spec') return tag; if (selector.startsWith('.slide[')) return slides.find(s => selector.includes('"' + s.dataset.slideId + '"')); return null; },
    querySelectorAll(selector) { return selector === '.slide' ? slides : []; },
  };
  const context = { document, window: {}, CSS: { escape: v => v }, console };
  vm.runInNewContext(buildDeckEditorRuntimeScript().replace(/^<script[^>]*>/, '').replace(/<\/script>$/, ''), context);
  const api = context.window.PPTSKILLEditor;
  return { executeOperation: r => JSON.parse(JSON.stringify(api.executeOperation(r))), getSpec: () => JSON.parse(JSON.stringify(api.getDeckSpec())), operationDescriptors: api.operationDescriptors };
}

for (const [lane, makeEditor] of [['Node', createDeckEditor], ['browser API VM', browserEditor]]) {
  test(`${lane} absolute move/resize 僅改 canonical override，content edit 保留`, () => {
    const editor = makeEditor(fixture), before = editor.getSpec();
    let result = editor.executeOperation(request('move-element', { x: 820, y: 300 }));
    assert.deepEqual(geometryOf(result), { ...box, x: 820, y: 300 });
    result = editor.executeOperation(request('resize-element', { width: 600, height: 400 }));
    assert.deepEqual(geometryOf(result), { x: 820, y: 300, width: 600, height: 400 });
    const withoutGeometry = structuredClone(result);
    delete slideOf(withoutGeometry).composition.geometryOverrides;
    assert.deepEqual(withoutGeometry, before);
    editor.executeOperation(request('edit-text', '修改標題', { ...target, elementId: 'role-title' }));
    assert.deepEqual(geometryOf(editor.getSpec()), geometryOf(result));
  });
  test(`${lane} invalid 全部 fail loud 且 state 原子性`, () => {
    const editor = makeEditor(fixture);
    editor.executeOperation(request('move-element', { x: 820, y: 300 }));
    const invalid = [
      request('unknown-operation', {}), request('move-element', { x: 90, y: 100, transform: 'none' }),
      ...[NaN, Infinity, -Infinity, '80', null, 80.5, -1, 79, 1500].map(x => request('move-element', { x, y: 300 })),
      ...[-1, 0, 79, 1000, NaN, Infinity, '80', 80.5].map(width => request('resize-element', { width, height: 100 })),
      request('resize-element', { width: 80, height: -1 }), request('move-element', { x: 80, y: 850 }),
      ...['role-title', 'role-subtitle', 'point-key-point-01', 'component-missing'].map(elementId => request('move-element', { x: 80, y: 80 }, { ...target, elementId })),
      request('move-element', { x: 80, y: 80 }, { ...target, slideId: 'missing' }),
      { ...request('move-element', { x: 80, y: 80 }), extra: true },
      request('move-element', { x: 80, y: 80 }, { ...target, extra: true }),
    ];
    for (const bad of invalid) { const before = editor.getSpec(); assert.throws(() => editor.executeOperation(bad)); assert.deepEqual(editor.getSpec(), before); }
  });
  test(`${lane} descriptors 深度 immutable 且 allowlist 無法擴權`, () => {
    const editor = makeEditor(fixture), d = editor.operationDescriptors;
    assert.deepEqual(Object.keys(d), ['edit-text', 'move-element', 'resize-element', 'align-selection', 'distribute-selection']);
    assert.ok(Object.isFrozen(d));
    assert.ok(Object.isFrozen(d['move-element'].inputSchema.properties.value.properties));
    assert.throws(() => d['move-element'].allowedTargetRoles.push('title'));
    assert.throws(() => { d['edit-text'].inputSchema.properties.value.type = 'object'; });
    assert.throws(() => editor.executeOperation(request('move-element', { x: 80, y: 80 }, { ...target, elementId: 'role-title' })));
  });
}

test('legacy sanitizer/render/export/recipient 不引入 optional 欄位', () => {
  const clean = sanitizeDeckSpec(fixture), rendered = renderFullDeck(clean);
  assert.equal(rendered.status, 'pass');
  assert.ok(clean.slides.every(s => !Object.hasOwn(s.composition, 'geometryOverrides')));
  assert.deepEqual(extractDeckSpec(rendered.html), clean);
  assert.deepEqual(createDeckEditor(extractDeckSpec(rendered.html)).getSpec(), clean);
});

test('canonical geometry renderer/recipient round-trip 與 viewport 無關', () => {
  const editor = createDeckEditor(fixture);
  editor.executeOperation(request('resize-element', { width: 600, height: 400 }));
  editor.executeOperation(request('move-element', { x: 820, y: 300 }));
  const result = renderFullDeck(editor.getSpec());
  assert.equal(result.status, 'pass');
  assert.match(result.html, /data-pptskill-geometry="canonical"/);
  assert.match(result.html, /left:820px;top:300px;width:600px;height:400px/);
  assert.deepEqual(extractDeckSpec(result.html), editor.getSpec());
  assert.deepEqual(createDeckEditor(extractDeckSpec(result.html)).getSpec(), editor.getSpec());
});

test('sanitizer 拒絕非法 geometry，cleanup orphan，duplicate/delete 不共享', () => {
  const input = sanitizeDeckSpec(fixture);
  for (const bad of [{ ...box, x: NaN }, { ...box, width: -80 }, { ...box, y: 850 }, { ...box, transform: 'none' }, null]) {
    slideOf(input).composition.geometryOverrides = { 'portable-quote': bad };
    assert.throws(() => sanitizeDeckSpec(input));
    assert.equal(validateDeckSpec(input).status, 'fail');
  }
  slideOf(input).composition.geometryOverrides = { 'portable-quote': box, 'removed-component': box };
  const clean = sanitizeDeckSpec(input);
  assert.deepEqual(slideOf(clean).composition.geometryOverrides, { 'portable-quote': box });
  const editor = createDeckEditor(clean), index = clean.slides.findIndex(s => s.id === 'portable'), id = editor.duplicate(index);
  editor.executeOperation(request('move-element', { x: 840, y: 300 }, { ...target, slideId: id }));
  assert.deepEqual(geometryOf(editor.getSpec()), box);
  editor.delete(index + 1);
  assert.ok(!editor.getSpec().slides.some(s => s.id === id));
  const removed = editor.getSpec(); slideOf(removed).content.components = [];
  assert.ok(!Object.hasOwn(slideOf(sanitizeDeckSpec(removed)).composition, 'geometryOverrides'));
});

for (const [lane, makeEditor] of [['Node', createDeckEditor], ['browser API VM', browserEditor]]) {
  test(`${lane} 合法 constructor ID 與非 slot component 走 own-property override`, () => {
    const input = structuredClone(fixture);
    slideOf(input).content.components.push({ id: 'constructor', type: 'text', text: '合法 component ID' });
    const editor = makeEditor(input);
    editor.executeOperation(request('move-element', { x: 820, y: 300 }));
    const first = editor.getSpec();
    assert.ok(!Object.hasOwn(slideOf(first).composition.geometryOverrides, 'constructor'));
    const rendered = renderFullDeck(first);
    assert.equal(rendered.status, 'pass');
    assert.deepEqual(extractDeckSpec(rendered.html), first);
    editor.executeOperation(request('move-element', { x: 820, y: 300 }, { ...target, elementId: 'component-constructor' }));
    const result = editor.getSpec();
    assert.deepEqual(slideOf(result).composition.geometryOverrides.constructor, { ...box, x: 820, y: 300 });
    const final = renderFullDeck(result);
    assert.equal(final.status, 'pass');
    assert.match(final.html, /data-pptskill-element-id="component-constructor" data-edit-target="slides.portable.content.components.constructor" data-pptskill-geometry="canonical"/);
    assert.deepEqual(extractDeckSpec(final.html), result);
  });
  test(`${lane} safe-area 精確邊界／integer 非 grid 值不 clamp`, () => {
    const editor = makeEditor(fixture);
    editor.executeOperation(request('resize-element', { width: 80, height: 80 }));
    editor.executeOperation(request('move-element', { x: 1440, y: 740 }));
    assert.deepEqual(geometryOf(editor.getSpec()), { x: 1440, y: 740, width: 80, height: 80 });
    assert.throws(() => editor.executeOperation(request('move-element', { x: 1441, y: 740 })));
    assert.throws(() => editor.executeOperation(request('move-element', { x: 1440, y: 741 })));
    editor.executeOperation(request('move-element', { x: 81, y: 83 }));
    assert.deepEqual(geometryOf(editor.getSpec()), { x: 81, y: 83, width: 80, height: 80 });
  });
}

test('legacy component patch 保留 geometry；sanitizer 移除失效 component override', () => {
  const editor = createDeckEditor(fixture);
  editor.executeOperation(request('move-element', { x: 820, y: 300 }));
  editor.applyLocalPatch({ slideId: 'portable', region: 'content.components.portable-quote', value: { text: '內容更新' } });
  assert.deepEqual(geometryOf(editor.getSpec()), { ...box, x: 820, y: 300 });
  assert.equal(slideOf(editor.getSpec()).content.components[0].text, '內容更新');
  const removed = editor.getSpec();
  slideOf(removed).content.components[0].type = 'unsupported';
  const clean = sanitizeDeckSpec(removed);
  assert.ok(!Object.hasOwn(slideOf(clean).composition, 'geometryOverrides'));
});
