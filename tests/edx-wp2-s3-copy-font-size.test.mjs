import test from 'node:test';
import assert from 'node:assert/strict';
import { createDeckEditor, OPERATION_DESCRIPTORS } from '../runtime/deck-editor.js';
import { extractDeckSpec } from '../runtime/deck-spec.js';
import { mountedEditor, fixture } from '../tools/edx-wp1-s4-perf-mounted.mjs';

const request = (operation, elementId = 'role-title', slideId = 'portable', value = {}) => ({ operation, target: { slideId, elementId }, value });
const size = (api, value, role = 'role-title', slide = 'portable') => api.executeOperation(request('set-typography', role, slide, { fontSize: value }));
const dispatch = (h, type, target) => {
  for (const root of [h.document, h.document.body]) for (const fn of root.listeners[type] || []) fn({ target, preventDefault() {}, stopImmediatePropagation() {} });
};
const node = (h, role = 'role-title', slide = 'portable') => h.document.querySelector(`.slide[data-slide-id="${slide}"] [data-pptskill-element-id="${role}"]`);
const open = (h, role = 'role-title', slide = 'portable') => dispatch(h, 'dblclick', node(h, role, slide));
const fixtureTwo = () => { const input = fixture(0), other = structuredClone(input.slides[0]); other.id = 'other'; input.slides.push(other); return input; };
const font = (spec, role = 'role-title', index = 0) => spec.slides[index].composition.typographyOverrides?.[role]?.fontSize;

for (const portable of [false, true]) {
  test(`WP2-S3 ${portable ? 'portable' : 'Node'} snapshot、跨頁、preservation、export/reopen`, () => {
    const input = fixtureTwo(), h = portable ? mountedEditor(input) : null, api = h?.api || createDeckEditor(input);
    const read = () => h ? h.getSpec() : api.getSpec(), select = (role, slide) => { if (h) open(h, role, slide); };
    const before = read(); select('role-title');
    assert.throws(() => api.executeOperation(request('paste-style')));
    assert.throws(() => api.executeOperation(request('copy-style')));
    size(api, 64); const copied = read();
    assert.deepEqual(JSON.parse(JSON.stringify(api.executeOperation(request('copy-style')))), copied);
    size(api, 88); size(api, null);
    select('role-subtitle'); api.executeOperation(request('paste-style', 'role-subtitle'));
    assert.equal(font(read(), 'role-subtitle'), 64);
    const pasted = read(); api.executeOperation(request('paste-style', 'role-subtitle')); assert.deepEqual(read(), pasted);
    select('role-title', 'other'); api.executeOperation(request('paste-style', 'role-title', 'other'));
    assert.equal(font(read(), 'role-title', 1), 64);
    const expected = structuredClone(before); expected.slides[0].composition.typographyOverrides = { 'role-subtitle': { fontSize: 64 } };
    expected.slides[1].composition.typographyOverrides = { 'role-title': { fontSize: 64 } }; assert.deepEqual(read(), expected);
    if (h) {
      const exported = h.api.exportHtml(); assert.deepEqual(extractDeckSpec(exported), expected);
      assert.doesNotMatch(exported, /<[^>]+(?:data-pptskill-typography-toolbar|contenteditable)=/);
      select('role-subtitle', 'other'); api.executeOperation(request('paste-style', 'role-subtitle', 'other'));
      assert.equal(font(read(), 'role-subtitle', 1), 64);
      const reopened = mountedEditor(extractDeckSpec(exported)); open(reopened);
      assert.throws(() => reopened.api.executeOperation(request('paste-style')));
    } else assert.throws(() => createDeckEditor(expected).executeOperation(request('paste-style')));
  });

  test(`WP2-S3 ${portable ? 'portable' : 'Node'} invalid atomic，getter 不執行且舊 snapshot 保留`, () => {
    const h = portable ? mountedEditor(fixtureTwo()) : null, api = h?.api || createDeckEditor(fixtureTwo());
    const read = () => h ? h.getSpec() : api.getSpec(); if (h) open(h);
    size(api, 16); api.executeOperation(request('copy-style')); size(api, null); const before = read(); let getterReads = 0;
    for (const operation of ['copy-style', 'paste-style']) {
      const base = request(operation);
      const getter = key => Object.defineProperty({ ...base }, key, { enumerable: true, get() { getterReads++; return base[key]; } });
      const invalids = [
        { ...base, extra: 1 }, { ...base, value: { fontSize: 24 } }, { ...base, value: null }, { ...base, value: [] },
        { ...base, value: Object.create({ fontSize: 24 }) }, Object.assign(Object.create({ inherited: true }), base),
        { ...base, target: Object.assign(Object.create({ inherited: true }), base.target) },
        { ...base, target: { ...base.target, extra: 1 } }, { ...base, value: JSON.parse('{"__proto__":{}}') },
        { ...base, value: { [Symbol('extra')]: 1 } },
        Object.create(Object.defineProperty({}, 'operation', { get() { getterReads++; return operation; } })),
        { ...base, value: Object.create(Object.defineProperty(Object.create(null), 'constructor', { get() { getterReads++; return Object; } })) }, ...['operation', 'target', 'value'].map(getter),
        { ...base, target: Object.defineProperty({ ...base.target }, 'elementId', { get() { getterReads++; return 'role-title'; } }) },
        request(operation, 'role-title', 'foreign'), request(operation, 'component-portable-quote'), request(operation, 'constructor'),
        request(operation, '__proto__'), request(operation, 'point-key-point-01'),
      ];
      for (const invalid of invalids) { assert.throws(() => api.executeOperation(invalid)); assert.deepEqual(read(), before); }
    }
    assert.equal(getterReads, 0);
    assert.throws(() => api.executeOperation(request('copy-style'))); assert.deepEqual(read(), before);
    api.executeOperation(request('paste-style')); assert.equal(font(read()), 16);
    size(api, 160); api.executeOperation(request('copy-style')); size(api, null); api.executeOperation(request('paste-style')); assert.equal(font(read()), 160);
    for (const subtitle of ['', undefined]) {
      const input = fixture(0); input.slides[0].content.subtitle = subtitle; input.slides[0].composition.typographyOverrides = { 'role-title': { fontSize: 32 } };
      const empty = portable ? mountedEditor(input) : null, a = empty?.api || createDeckEditor(input);
      if (empty) open(empty); a.executeOperation(request('copy-style'));
      if (empty) open(empty, 'role-subtitle');
      for (const operation of ['copy-style', 'paste-style']) assert.throws(() => a.executeOperation(request(operation, 'role-subtitle')));
    }
  });
}

test('WP2-S3 registry metadata 與 portable parity，僅字級 contract', () => {
  const api = mountedEditor(fixture(0)).api;
  for (const name of ['copy-style', 'paste-style']) {
    const d = OPERATION_DESCRIPTORS[name]; assert.ok(d);
    assert.deepEqual(JSON.parse(JSON.stringify(api.operationDescriptors[name])), d);
    assert.deepEqual(d.inputSchema.properties.value, { type: 'object', additionalProperties: false, properties: {} });
    assert.equal(d.inputSchema.properties.operation.const, name); assert.equal(d.undoable, false);
  }
  assert.deepEqual(OPERATION_DESCRIPTORS['copy-style'].mutates, ['editor.clipboard']);
  assert.deepEqual(OPERATION_DESCRIPTORS['copy-style'].preserves, ['canonicalSpec']);
  assert.deepEqual(OPERATION_DESCRIPTORS['copy-style'].qaInvalidation, []);
  for (const field of ['mutates', 'preserves', 'qaInvalidation']) assert.deepEqual(OPERATION_DESCRIPTORS['paste-style'][field], OPERATION_DESCRIPTORS['set-typography'][field]);
});

test('WP2-S3 toolbar 狀態、sync text、IME、mode/slide stale target', () => {
  const h = mountedEditor(fixtureTwo()), api = h.api, title = node(h);
  const button = action => h.document.querySelector(`[data-action="${action}"]`);
  open(h); assert.equal(button('copy-style').disabled, true); assert.equal(button('paste-style').disabled, true);
  size(api, 48); assert.equal(button('copy-style').disabled, false);
  title.textContent = '完整焦點文字'; h.action('copy-style'); assert.equal(h.getSpec().slides[0].content.title, '完整焦點文字');
  assert.equal(button('paste-style').disabled, false);
  dispatch(h, 'compositionstart', title); title.textContent = '部分'; const before = h.getSpec();
  for (const operation of ['copy-style', 'paste-style']) { h.action(operation); assert.throws(() => api.executeOperation(request(operation)), /IME|組字/); }
  assert.deepEqual(h.getSpec(), before); title.textContent = '完整組字'; dispatch(h, 'compositionend', title);
  h.action('reset-typography'); assert.equal(button('copy-style').disabled, true); assert.equal(button('paste-style').disabled, false);
  open(h, 'role-subtitle'); node(h, 'role-subtitle').textContent = '副標完整文字'; h.action('paste-style');
  assert.equal(h.getSpec().slides[0].content.subtitle, '副標完整文字'); assert.equal(font(h.getSpec(), 'role-subtitle'), 48);
  for (const switchMode of [() => h.action('edit'), () => api.layout.setMode(true), () => h.click(h.document.querySelector('.slide[data-slide-id="other"]'))]) {
    open(h); switchMode(); const snapshot = h.getSpec();
    for (const operation of ['copy-style', 'paste-style']) { h.action(operation); assert.throws(() => api.executeOperation(request(operation))); }
    assert.deepEqual(h.getSpec(), snapshot);
  }
  open(h, 'role-title', 'other'); h.action('paste-style'); assert.equal(font(h.getSpec(), 'role-title', 1), 48);
});

test('WP2-S3 semantic revision：copy/invalid/no-op 為零，paste 真變更一次', () => {
  const h = mountedEditor(fixtureTwo()); open(h); size(h.api, 64); const revision = h.getRevision();
  h.api.executeOperation(request('copy-style')); assert.equal(h.getRevision(), revision);
  h.api.executeOperation(request('paste-style')); assert.equal(h.getRevision(), revision);
  assert.throws(() => h.api.executeOperation({ ...request('copy-style'), value: { fontSize: 24 } })); assert.equal(h.getRevision(), revision);
  open(h, 'role-subtitle'); h.api.executeOperation(request('paste-style', 'role-subtitle')); assert.equal(h.getRevision(), revision + 1);
  h.api.executeOperation(request('paste-style', 'role-subtitle')); assert.equal(h.getRevision(), revision + 1);
});

for (const portable of [false, true]) test(`WP2-S3 ${portable ? 'portable' : 'Node'} source 刪除仍保留獨立 snapshot`, () => {
  const h = portable ? mountedEditor(fixtureTwo()) : null, api = h?.api || createDeckEditor(fixtureTwo());
  if (h) open(h); size(api, 56); api.executeOperation(request('copy-style'));
  if (h) { h.action('delete'); open(h, 'role-title', 'other'); } else api.delete(0);
  api.executeOperation(request('paste-style', 'role-title', 'other'));
  const result = h ? h.getSpec() : api.getSpec(); assert.equal(result.slides.length, 1); assert.equal(font(result), 56);
});


test('WP2-S3 title → layout focusin 不提前隱藏 toolbar，click 才清 target', () => {
  const h = mountedEditor(fixtureTwo());
  const nav = h.document.createElement('nav'); nav.setAttribute('class', 'pptskill-editor'); h.document.body.append(nav);
  const layout = h.document.querySelector('[data-action="layout"]');
  const toolbar = h.document.querySelector('[data-pptskill-typography-toolbar]');
  nav.append(layout); nav.append(toolbar);
  open(h); size(h.api, 48); h.action('copy-style'); const before = h.getSpec();
  dispatch(h, 'mousedown', layout); dispatch(h, 'focusin', layout);
  assert.equal(toolbar.hidden, false, 'focusin 不得讓控制列在 mouseup 前縮排');
  assert.equal(h.document.body.dataset.editorMode, 'edit');
  dispatch(h, 'mouseup', layout); h.click(layout);
  assert.equal(h.document.body.dataset.editorMode, 'layout'); assert.equal(toolbar.hidden, true);
  assert.throws(() => h.api.executeOperation(request('paste-style')));
  assert.deepEqual(h.getSpec(), before);
  open(h); dispatch(h, 'focusin', h.document.body);
  assert.equal(toolbar.hidden, true, '離開 editor 與文字 target 仍應清除');
  assert.throws(() => h.api.executeOperation(request('paste-style')));
});
