import test from 'node:test';
import assert from 'node:assert/strict';
import { createDeckEditor, OPERATION_DESCRIPTORS } from '../runtime/deck-editor.js';
import { extractDeckSpec, resolveSlideElementIdentities } from '../runtime/deck-spec.js';
import { renderFullDeck } from '../runtime/full-deck-renderer.js';
import { mountedEditor, fixture } from '../tools/edx-wp1-s4-perf-mounted.mjs';

const png = 'data:image/png;base64,AA==';
const box = { x: 600, y: 400, width: 240, height: 160 };
const request = (id = 'inserted', slideId = 'portable', fit) => ({ operation: 'insert-element', target: { slideId }, value: {
  component: { id, type: 'image', dataUri: png, alt: '<新 & 圖> "測試"', ...(fit === undefined ? {} : { fit }) }, geometry: { ...box },
} });
function input() {
  const spec = fixture(0), slide = spec.slides[0];
  slide.content.components[1].dataUri = png;
  slide.composition.typographyOverrides = { 'role-title': { fontSize: 60 } };
  slide.composition.motion = { effect: 'underline-sweep', role: 'text', replay: 'slide-visible', staggerMs: 90, targets: [{ ref: 'content.title' }, { ref: 'content.subtitle' }] };
  spec.slides.push({ ...structuredClone(slide), id: 'other' });
  return spec;
}
const root = (h, slide = 'portable') => h.document.querySelector(`.slide[data-slide-id="${slide}"]`);
const inserted = (h, id = 'inserted', slide = 'portable') => root(h, slide).querySelector(`[data-edit-target="slides.${slide}.content.components.${id}"]`);
const json = value => JSON.parse(JSON.stringify(value));
const setup = (portable, spec = input()) => {
  const h = portable ? mountedEditor(spec) : null, api = h?.api || createDeckEditor(spec);
  return { h, api, read: () => h ? h.getSpec() : api.getSpec() };
};
function appendExpected(spec, req) {
  const slide = spec.slides.find(s => s.id === req.target.slideId);
  slide.content.components.push(structuredClone(req.value.component));
  slide.composition.geometryOverrides = { ...slide.composition.geometryOverrides, [req.value.component.id]: { ...req.value.geometry } };
}
for (const portable of [false, true]) {
  const label = portable ? 'mounted' : 'Node';
  test(`S8 ${label} 尾端插入、預設及明示 fit、跨頁同 ID、完整 preservation`, () => {
    const { h, api, read } = setup(portable), expected = read();
    for (const req of [request(), request('second', 'portable', 'cover'), request('inserted', 'other', 'contain')]) {
      appendExpected(expected, req);
      assert.deepEqual(json(api.executeOperation(req)), expected);
      assert.deepEqual(read(), expected);
    }
    if (h) assert.equal(h.getRevision(), 3);
    assert.throws(() => api.executeOperation(request()));
    assert.deepEqual(read(), expected);
    if (h) assert.equal(h.getRevision(), 3);
  });
  test(`S8 ${label} exact schema／政策／geometry 拒絕且 getter calls=0`, () => {
    const { h, api, read } = setup(portable), before = read(); let calls = 0;
    const invalid = [null, {}, { ...request(), operation: 'insert-text' }, request('perf-image'), request('new', 'missing')];
    for (const part of ['request', 'target', 'value', 'component', 'geometry']) {
      const get = r => part === 'request' ? r : ['component', 'geometry'].includes(part) ? r.value[part] : r[part];
      for (const change of [o => Object.setPrototypeOf(o, { inherited: true }), o => Object.defineProperty(o, Symbol('extra'), { value: 1 }),
        o => Object.defineProperty(o, 'hidden', { value: 1 }), o => Object.defineProperty(o, 'extra', { get() { calls++; throw Error('getter'); } })]) {
        const r = request(); change(get(r)); invalid.push(r);
      }
      for (const key of Object.keys(get(request()))) {
        const r = request(); Object.defineProperty(get(r), key, { get() { calls++; throw Error('getter'); } }); invalid.push(r);
        const missing = request(); delete get(missing)[key]; invalid.push(missing);
      }
      for (const value of [null, [], 1, 'record']) {
        const r = request();
        if (part === 'request') invalid.push(value);
        else { if (['component', 'geometry'].includes(part)) r.value[part] = value; else r[part] = value; invalid.push(r); }
      }
    }
    for (const [key, values] of Object.entries({ id: ['', 'UPPER', 'a'.repeat(81), 1], type: ['text', 'chart', null], alt: [undefined, 1, null], fit: [undefined, null, 'fill'], dataUri: ['file:///tmp/a', 'https://example.test/a.png', 'data:image/bmp;base64,AA==', 'data:text/html;base64,AA==', 'data:image/png;base64,???', 1] })) {
      for (const value of values) { const r = request(); r.value.component[key] = value; invalid.push(r); }
    }
    for (const [key, values] of Object.entries({ x: [79, 1400, NaN, Infinity, 80.5, '80'], y: [79, 800], width: [0, 79, 1600], height: [-1, 79, 900] })) {
      for (const value of values) { const r = request(); r.value.geometry[key] = value; invalid.push(r); }
    }
    if (h) { h.ready(); h.begin(); h.update(20, 16); }
    const dom = h?.document.outerHTML, selection = h && json(h.api.layout.getSelectionState());
    for (const r of invalid) {
      assert.throws(() => api.executeOperation(r)); assert.deepEqual(read(), before);
      if (h) { assert.equal(h.document.outerHTML, dom); assert.equal(h.getRevision(), 0); assert.deepEqual(json(h.api.layout.getSelectionState()), selection); assert.equal(h.api.layout.getState().gesturing, true); }
    }
    assert.equal(calls, 0);
  });
  test(`S8 ${label} null prototype own records 可用且輸入不受修改`, () => {
    const { api, read } = setup(portable), r = request();
    for (const obj of [r, r.target, r.value, r.value.component, r.value.geometry]) { Object.setPrototypeOf(obj, null); Object.freeze(obj); }
    api.executeOperation(r); assert.equal(read().slides[0].content.components.at(-1).id, 'inserted');
  });
  test(`S8 ${label} long-ID collision 不改名；可穩定追加另一 collision`, () => {
    const spec = input(), long = 'a'.repeat(80), short = 'a'.repeat(61) + '-5143e6d5';
    spec.slides[0].content.components.push({ id: long, type: 'image', dataUri: png, alt: '' });
    const { h, api, read } = setup(portable, spec), before = read();
    assert.throws(() => api.executeOperation(request(short)), /identity|識別/);
    assert.deepEqual(read(), before); if (h) assert.equal(h.getRevision(), 0);
    spec.slides[0].content.components.at(-1).id = short;
    const other = setup(portable, spec), previous = resolveSlideElementIdentities(other.read().slides[0]);
    other.api.executeOperation(request(long));
    const next = resolveSlideElementIdentities(other.read().slides[0]);
    assert.deepEqual(next.components.slice(0, -1), previous.components); assert.deepEqual(next.keyPoints, previous.keyPoints);
    assert.ok(next.components.every(id => /^[a-z0-9][a-z0-9._-]{0,79}$/.test(id)));
    assert.equal(new Set(next.components).size, next.components.length);
  });
  test(`S8 ${label} 新 identity 可 fit／replace／move／resize，renderer export/reopen 唯一 root`, () => {
    const { h, api, read } = setup(portable); api.executeOperation(request());
    const target = { slideId: 'portable', elementId: resolveSlideElementIdentities(read().slides[0]).components.at(-1) };
    api.executeOperation({ operation: 'replace-asset', target, value: { dataUri: 'data:image/webp;base64,BB==', fit: 'cover', alt: '保留新圖' } });
    api.executeOperation({ operation: 'move-element', target, value: { x: 640, y: 440 } });
    api.executeOperation({ operation: 'resize-element', target, value: { width: 260, height: 180 } });
    const html = h ? api.exportHtml() : renderFullDeck(read()).html;
    assert.deepEqual(extractDeckSpec(html), read());
    for (const output of [html, renderFullDeck(extractDeckSpec(html)).html]) {
      const body = output.split('<body')[1];
      assert.equal(body.match(/data-edit-target="slides.portable.content.components.inserted"/g)?.length, 1);
    }
    const reopened = mountedEditor(extractDeckSpec(html));
    assert.deepEqual(reopened.getSpec(), read()); assert.equal(root(reopened).querySelectorAll(`[data-pptskill-element-id="${target.elementId}"]`).length, 1);
    reopened.api.layout.setMode(true); reopened.click(inserted(reopened));
    assert.deepEqual([...reopened.api.layout.getSelectionState().selected], [target.elementId]);
    reopened.click(reopened.document.querySelector('[data-image-fit="contain"]'));
    assert.equal(reopened.getSpec().slides[0].content.components.at(-1).fit, 'contain');
  });
}
for (const mode of ['missing', 'duplicate-root', 'append-before', 'append-after', 'detached-project']) test(`S8 mounted ${mode} 零 canonical／DOM／revision／selection 副作用`, () => {
  const h = mountedEditor(input()); h.ready(); h.begin(); h.update(20, 16);
  const section = root(h, 'other');
  if (mode === 'missing') section.remove();
  if (mode === 'duplicate-root') {
    const fake = h.document.createElement('figure'); fake.setAttribute('data-pptskill-element-id', 'component-inserted'); section.append(fake);
  }
  if (mode.startsWith('append')) {
    const append = section.append.bind(section);
    section.append = node => { if (mode === 'append-after') append(node); throw Error(mode); };
  }
  if (mode === 'detached-project') {
    const create = h.document.createElement;
    h.document.createElement = tag => { const node = create(tag); if (tag === 'template') Object.defineProperty(node, 'innerHTML', { set() { throw Error('detached-project'); } }); return node; };
  }
  const before = h.getSpec(), dom = h.document.outerHTML, selection = json(h.api.layout.getSelectionState());
  assert.throws(() => h.api.executeOperation(request('inserted', 'other')), mode.startsWith('append') || mode === 'detached-project' ? new RegExp(mode) : /DOM/);
  assert.deepEqual(h.getSpec(), before); assert.equal(h.document.outerHTML, dom); assert.equal(h.getRevision(), 0);
  assert.deepEqual(json(h.api.layout.getSelectionState()), selection); assert.equal(h.api.layout.getState().gesturing, true);
});
for (const snap of [false, true]) for (const kind of ['drag', 'resize']) test(`S8 mounted snap=${snap} 成功取消 ${kind} preview／clear selection，保持舊 nodes／mode／currentId`, () => {
  const h = mountedEditor(input()); if (snap) h.action('snap-layout'); h.ready();
  const nodes = [...h.document.querySelectorAll('.slide [data-edit-target]')], old = h.component(), oldStyle = old.getAttribute('style');
  old.style.setProperty('opacity', '0.7'); h.document.activeElement = old;
  h.begin(kind); h.update(20, 16, kind);
  h.api.executeOperation(request('inserted', 'other', 'cover')); h.finish(kind);
  assert.equal(h.getRevision(), 1); assert.equal(h.api.layout.getState().gesturing, false);
  assert.deepEqual([...h.api.layout.getSelectionState().selected], []); assert.equal(h.api.layout.getState().enabled, true);
  assert.equal(root(h).dataset.editorSelected, 'true'); assert.notEqual(root(h, 'other').dataset.editorSelected, 'true');
  assert.equal(h.document.activeElement, old); assert.equal(old.style.getPropertyValue('opacity'), '0.7');
  assert.equal(old.style.getPropertyValue('left'), '800px'); assert.ok(oldStyle.includes('800px'));
  for (const node of nodes) assert.equal(h.document.querySelector(`[data-edit-target="${node.dataset.editTarget}"]`), node);
  const node = inserted(h, 'inserted', 'other'), image = node.querySelector('img');
  assert.equal(node.parentElement, root(h, 'other')); assert.equal(node.dataset.pptskillElementId, 'component-inserted');
  assert.equal(node.dataset.pptskillGeometry, 'canonical'); assert.equal(node.dataset.effectTreatment, 'none');
  assert.equal(image.getAttribute('src'), png); assert.equal(image.getAttribute('alt'), request().value.component.alt); assert.equal(image.style.getPropertyValue('object-fit'), 'cover');
});
test('S8 descriptor 精確 image-only slide target、無 history 宣稱', () => {
  const d = OPERATION_DESCRIPTORS['insert-element']; assert.ok(d);
  assert.deepEqual(d.allowedTargetRoles, ['slide']); assert.equal(d.undoable, false); assert.equal(d.destructive, false); assert.equal(d.confirmation, 'none');
  assert.deepEqual(json(mountedEditor(input()).api.operationDescriptors['insert-element']), d);
  assert.equal(d.inputSchema.properties.value.properties.component.properties.type.const, 'image');
  for (const field of ['content', 'assets', 'geometry', 'overflow', 'portableSize']) assert.ok(d.qaInvalidation.includes(field));
});
