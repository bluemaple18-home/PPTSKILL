import test from 'node:test';
import assert from 'node:assert/strict';
import { createDeckEditor } from '../runtime/deck-editor.js';
import { extractDeckSpec, resolveSlideElementIdentities } from '../runtime/deck-spec.js';
import { renderFullDeck } from '../runtime/full-deck-renderer.js';
import { mountedEditor, fixture } from '../tools/edx-wp1-s4-perf-mounted.mjs';

const box = { x: 600, y: 400, width: 240, height: 160 };
const text = '  新增文字\n😀 <script>保留純文字</script><img src=x><a href="x">連結</a> &  ';
const request = (id = 's13-text', slideId = 'portable', value = text) => ({ operation: 'insert-element', target: { slideId }, value: {
  component: { id, type: 'text', text: value }, geometry: { ...box },
} });
const json = value => JSON.parse(JSON.stringify(value));
function input() {
  const spec = fixture(0), slide = spec.slides[0];
  slide.content.components[1].dataUri = 'data:image/png;base64,AA==';
  slide.composition.typographyOverrides = { 'role-title': { fontSize: 60 } };
  slide.composition.motion = { effect: 'underline-sweep', role: 'text', replay: 'slide-visible', staggerMs: 90, targets: [{ ref: 'content.title' }, { ref: 'content.subtitle' }] };
  spec.slides.push({ ...structuredClone(slide), id: 'other' });
  return spec;
}
const root = (h, slide = 'portable') => h.document.querySelector(`.slide[data-slide-id="${slide}"]`);
const inserted = (h, id = 's13-text', slide = 'portable') => root(h, slide).querySelector(`[data-edit-target="slides.${slide}.content.components.${id}"]`);
const setup = portable => {
  const h = portable ? mountedEditor(input()) : null, api = h?.api || createDeckEditor(input());
  return { h, api, read: () => h ? h.getSpec() : api.getSpec() };
};
function appendExpected(spec, req) {
  const slide = spec.slides.find(s => s.id === req.target.slideId);
  slide.content.components.push(structuredClone(req.value.component));
  slide.composition.geometryOverrides = { ...slide.composition.geometryOverrides, [req.value.component.id]: { ...req.value.geometry } };
}
for (const portable of [false, true]) {
  const label = portable ? 'mounted' : 'Node';
  test(`S13 ${label} 精確 text、跨頁同 ID、Unicode code points 1–500 與完整 preservation`, () => {
    const { h, api, read } = setup(portable), expected = read();
    for (const req of [request(), request('s13-text', 'other'), request('spaces', 'portable', ' '), request('max', 'portable', '😀'.repeat(500))]) {
      appendExpected(expected, req); assert.deepEqual(json(api.executeOperation(req)), expected); assert.deepEqual(read(), expected);
    }
    if (h) assert.equal(h.getRevision(), 4);
  });
  test(`S13 ${label} exact fields／getter0／hidden／symbol／prototype／混搭／長度／geometry 拒絕無副作用`, () => {
    const { h, api, read } = setup(portable), before = read(); let calls = 0;
    const invalid = [null, {}, request('portable-quote'), request('new', 'missing')];
    for (const part of ['request', 'target', 'value', 'component', 'geometry']) {
      const get = r => part === 'request' ? r : ['component', 'geometry'].includes(part) ? r.value[part] : r[part];
      for (const change of [o => Object.setPrototypeOf(o, { inherited: true }), o => Object.defineProperty(o, Symbol('extra'), { value: 1 }),
        o => Object.defineProperty(o, 'hidden', { value: 1 }), o => { o.extra = 1; }]) {
        const r = request(); change(get(r)); invalid.push(r);
      }
      for (const key of Object.keys(get(request()))) {
        const r = request(); Object.defineProperty(get(r), key, { get() { calls++; throw Error('getter'); } }); invalid.push(r);
        const missing = request(); delete get(missing)[key]; invalid.push(missing);
        const hidden = request(); Object.defineProperty(get(hidden), key, { enumerable: false }); invalid.push(hidden);
      }
      for (const value of [null, [], 1, 'record']) {
        const r = request(); if (part === 'request') invalid.push(value);
        else { if (['component', 'geometry'].includes(part)) r.value[part] = value; else r[part] = value; invalid.push(r); }
      }
    }
    for (const [key, values] of Object.entries({ id: ['', 'UPPER', 'a'.repeat(81), 1], type: ['image', 'citation', null], text: ['', '😀'.repeat(501), 'a'.repeat(501), null, undefined, 1, {}, ['text']], dataUri: ['data:image/png;base64,AA=='], alt: ['混搭'], fit: ['contain'] })) {
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
  test(`S13 ${label} null prototype／frozen 輸入不修改，duplicate 不覆蓋`, () => {
    const { h, api, read } = setup(portable), r = request();
    for (const obj of [r, r.target, r.value, r.value.component, r.value.geometry]) { Object.setPrototypeOf(obj, null); Object.freeze(obj); }
    api.executeOperation(r); const expected = read();
    assert.throws(() => api.executeOperation(request())); assert.deepEqual(read(), expected);
    if (h) assert.equal(h.getRevision(), 1);
  });
  test(`S13 ${label} long-ID identity collision 拒絕且舊 identity 不變`, () => {
    const spec = input(), long = 'a'.repeat(80), short = 'a'.repeat(61) + '-5143e6d5';
    spec.slides[0].content.components.push({ id: long, type: 'text', text: '既有' });
    const h = portable ? mountedEditor(spec) : null, api = h?.api || createDeckEditor(spec), read = () => h ? h.getSpec() : api.getSpec(), before = read();
    assert.throws(() => api.executeOperation(request(short)), /identity|識別/); assert.deepEqual(read(), before);
    if (h) assert.equal(h.getRevision(), 0);
  });
  test(`S13 ${label} escape／geometry／export reopen／再插入，既有內容完整保留`, () => {
    const { h, api, read } = setup(portable); api.executeOperation(request());
    const target = { slideId: 'portable', elementId: resolveSlideElementIdentities(read().slides[0]).components.at(-1) };
    api.executeOperation({ operation: 'move-element', target, value: { x: 640, y: 440 } });
    api.executeOperation({ operation: 'resize-element', target, value: { width: 260, height: 180 } });
    const expected = read(), html = h ? api.exportHtml() : renderFullDeck(expected).html;
    assert.deepEqual(extractDeckSpec(html), expected);
    for (const output of [html, renderFullDeck(extractDeckSpec(html)).html]) {
      assert.match(output, /&lt;script(?:>|&gt;)保留純文字&lt;\/script(?:>|&gt;)/u);
      assert.equal(output.split('<body')[1].match(/data-edit-target="slides.portable.content.components.s13-text"/g)?.length, 1);
    }
    const reopened = mountedEditor(extractDeckSpec(html)), node = inserted(reopened);
    assert.equal(node.textContent, text); for (const tag of ['script', 'img', 'a']) assert.equal(node.querySelector(tag), null);
    reopened.action('edit'); assert.notEqual(node.contentEditable, 'true'); reopened.action('edit'); assert.deepEqual(reopened.getSpec(), expected);
    reopened.api.layout.setMode(true); reopened.click(node);
    assert.deepEqual([...reopened.api.layout.getSelectionState().selected], [target.elementId]);
    reopened.api.executeOperation({ operation: 'move-element', target, value: { x: 680, y: 480 } });
    expected.slides[0].composition.geometryOverrides['s13-text'] = { x: 680, y: 480, width: 260, height: 180 };
    const req = request('reopened'); reopened.api.executeOperation(req); appendExpected(expected, req);
    assert.deepEqual(reopened.getSpec(), expected);
  });
}
for (const mode of ['play', 'edit', 'layout']) test(`S13 mounted ${mode} 插入明設不可 editable，切模式不取得 direct-text authority`, () => {
  const h = mountedEditor(input());
  if (mode === 'edit') h.action('edit'); if (mode === 'layout') h.api.layout.setMode(true);
  root(h).contentEditable = 'true';
  h.api.executeOperation(request()); const node = inserted(h);
  assert.equal(node.contentEditable, 'false'); assert.equal(node.textContent, text);
  for (const tag of ['script', 'img', 'a']) assert.equal(node.querySelector(tag), null);
  h.api.layout.setMode(false); h.action('edit'); assert.equal(node.contentEditable, 'false');
  const before = h.getSpec(); node.textContent = 'DOM 不得直寫'; h.action('edit');
  assert.deepEqual(h.getSpec(), before); assert.equal(h.getRevision(), 1);
});
for (const mode of ['missing', 'duplicate-root', 'append-before', 'append-after', 'detached-project']) test(`S13 mounted ${mode} atomic canonical／DOM／revision／selection rollback`, () => {
  const h = mountedEditor(input()); h.ready(); h.begin(); h.update(20, 16); const section = root(h, 'other');
  if (mode === 'missing') section.remove();
  if (mode === 'duplicate-root') { const fake = h.document.createElement('blockquote'); fake.setAttribute('data-pptskill-element-id', 'component-s13-text'); section.append(fake); }
  if (mode.startsWith('append')) { const append = section.append.bind(section); section.append = node => { if (mode === 'append-after') append(node); throw Error(mode); }; }
  if (mode === 'detached-project') { const create = h.document.createElement; h.document.createElement = tag => { const node = create(tag); if (tag === 'template') Object.defineProperty(node, 'innerHTML', { set() { throw Error(mode); } }); return node; }; }
  const before = h.getSpec(), dom = h.document.outerHTML, selection = json(h.api.layout.getSelectionState());
  assert.throws(() => h.api.executeOperation(request('s13-text', 'other')), mode.startsWith('append') || mode === 'detached-project' ? new RegExp(mode) : /DOM/);
  assert.deepEqual(h.getSpec(), before); assert.equal(h.document.outerHTML, dom); assert.equal(h.getRevision(), 0);
  assert.deepEqual(json(h.api.layout.getSelectionState()), selection); assert.equal(h.api.layout.getState().gesturing, true);
});
for (const snap of [false, true]) for (const kind of ['drag', 'resize']) test(`S13 mounted snap=${snap} 跨頁插入取消 ${kind} preview／clear selection／舊 nodes preserved`, () => {
  const h = mountedEditor(input()); if (snap) h.action('snap-layout'); h.ready();
  const nodes = [...h.document.querySelectorAll('.slide [data-edit-target]')], old = h.component(), expected = h.getSpec();
  old.style.setProperty('opacity', '0.7'); h.document.activeElement = old;
  h.begin(kind); h.update(20, 16, kind); const req = request('s13-text', 'other');
  h.api.executeOperation(req); h.finish(kind); appendExpected(expected, req);
  assert.deepEqual(h.getSpec(), expected); assert.equal(h.getRevision(), 1); assert.equal(h.api.layout.getState().gesturing, false);
  assert.deepEqual([...h.api.layout.getSelectionState().selected], []); assert.equal(h.api.layout.getState().enabled, true);
  assert.equal(root(h).dataset.editorSelected, 'true'); assert.notEqual(root(h, 'other').dataset.editorSelected, 'true');
  assert.equal(h.document.activeElement, old); assert.equal(old.style.getPropertyValue('opacity'), '0.7'); assert.equal(old.style.getPropertyValue('left'), '800px');
  for (const node of nodes) assert.equal(h.document.querySelector(`[data-edit-target="${node.dataset.editTarget}"]`), node);
  const node = inserted(h, 's13-text', 'other'); assert.equal(node.parentElement, root(h, 'other'));
  assert.equal(node.dataset.pptskillGeometry, 'canonical'); assert.equal(node.dataset.editKind, 'text'); assert.equal(node.contentEditable, 'false'); assert.equal(node.textContent, text);
});
