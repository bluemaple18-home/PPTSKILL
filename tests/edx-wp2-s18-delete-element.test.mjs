import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { createDeckEditor, OPERATION_DESCRIPTORS, buildDeckEditorRuntimeScript } from '../runtime/deck-editor.js';
import { componentDeletion } from '../runtime/component-deletion.js';
import { resolveSlideElementIdentities, extractDeckSpec, sanitizeDeckSpec } from '../runtime/deck-spec.js';
import { renderFullDeck } from '../runtime/full-deck-renderer.js';
import { mountedEditor, fixture } from '../tools/edx-wp1-s4-perf-mounted.mjs';

const json = value => JSON.parse(JSON.stringify(value));
const png = 'data:image/png;base64,AA==';
const box = { x: 320, y: 240, width: 240, height: 160 };
const request = (id = 's18-text', slideId = 'portable') => ({ operation: 'delete-element', target: { slideId, elementId: 'component-' + id }, value: { confirm: true } });
const insertion = (id = 's18-text', type = 'text') => ({ operation: 'insert-element', target: { slideId: 'portable' }, value: {
  component: type === 'text' ? { id, type, text: '新文字 😀' } : { id, type, dataUri: png, alt: '新圖', fit: 'contain' }, geometry: { ...box },
} });
function input() {
  const spec = fixture(0), slide = spec.slides[0];
  slide.content.components[1].dataUri = png;
  slide.content.components.push(insertion().value.component, insertion('s18-image', 'image').value.component);
  slide.composition.geometryOverrides['s18-text'] = { ...box };
  slide.composition.geometryOverrides['s18-image'] = { ...box, x: 640 };
  slide.composition.typographyOverrides = { 'role-title': { fontSize: 60 } };
  slide.composition.motion = { effect: 'underline-sweep', role: 'text', replay: 'slide-visible', staggerMs: 90, targets: [{ ref: 'content.title' }, { ref: 'content.subtitle' }] };
  slide.composition.order = ['title', 'subtitle', 'component'];
  spec.slides.push({ ...structuredClone(slide), id: 'other' });
  return spec;
}
const root = (h, slide = 'portable') => h.document.querySelector(`.slide[data-slide-id="${slide}"]`);
const node = (h, id = 's18-text', slide = 'portable') => root(h, slide).querySelector(`[data-edit-target="slides.${slide}.content.components.${id}"]`);
const setup = (portable, spec = input()) => {
  const h = portable ? mountedEditor(spec) : null, api = h?.api || createDeckEditor(spec);
  return { h, api, read: () => h ? h.getSpec() : api.getSpec() };
};
function removeExpected(spec, id, slideId = 'portable') {
  const slide = spec.slides.find(s => s.id === slideId);
  slide.content.components = slide.content.components.filter(c => c.id !== id);
  if (slide.composition.geometryOverrides) {
    delete slide.composition.geometryOverrides[id];
    if (!Object.keys(slide.composition.geometryOverrides).length) delete slide.composition.geometryOverrides;
  }
}
for (const portable of [false, true]) {
  const label = portable ? 'mounted' : 'Node';
  test(`S18 ${label} 獨立 text/image 跨頁精確刪除、保留順序 identity 與所有其他資料`, () => {
    const { h, api, read } = setup(portable), expected = read();
    const survivors = h && [...h.document.querySelectorAll('[data-edit-target]')].filter(n => !['slides.portable.content.components.s18-text', 'slides.other.content.components.s18-image'].includes(n.dataset.editTarget));
    for (const [id, slide] of [['s18-text', 'portable'], ['s18-image', 'other']]) {
      removeExpected(expected, id, slide);
      assert.deepEqual(json(api.executeOperation(request(id, slide))), expected);
      assert.deepEqual(read(), expected);
      assert.throws(() => api.executeOperation(request(id, slide)), /找不到|已移除|target/);
      assert.deepEqual(read(), expected);
      if (h) assert.equal(node(h, id, slide), null);
    }
    if (h) {
      assert.equal(h.getRevision(), 2);
      for (const old of survivors) assert.equal(h.document.querySelector(`[data-edit-target="${old.dataset.editTarget}"]`), old);
    }
  });
  test(`S18 ${label} exact enumerable data objects、confirmation、getter0 拒絕`, () => {
    const { h, api, read } = setup(portable), before = read(); let calls = 0;
    for (const part of ['request', 'target', 'value']) {
      const get = r => part === 'request' ? r : r[part];
      for (const change of [o => Object.setPrototypeOf(o, { bad: true }), o => Object.defineProperty(o, 'hidden', { value: 1 }), o => { o[Symbol('extra')] = 1; }, o => { o.extra = 1; }]) {
        const r = request(); change(get(r)); assert.throws(() => api.executeOperation(r));
      }
      for (const key of Object.keys(get(request()))) for (const change of [o => Object.defineProperty(o, key, { get() { calls++; throw Error('getter'); } }), o => Object.defineProperty(o, key, { enumerable: false }), o => { delete o[key]; }]) {
        const r = request(); change(get(r)); assert.throws(() => api.executeOperation(r));
      }
      for (const bad of [null, [], false, 'record', new Date()]) {
        const r = request(); if (part === 'request') assert.throws(() => api.executeOperation(bad));
        else { r[part] = bad; assert.throws(() => api.executeOperation(r)); }
      }
    }
    for (const confirm of [false, undefined, null, 1, 'true', new Boolean(true)]) {
      const r = request(); r.value.confirm = confirm; assert.throws(() => api.executeOperation(r));
    }
    assert.equal(calls, 0); assert.deepEqual(read(), before); if (h) assert.equal(h.getRevision(), 0);
  });
  test(`S18 ${label} null-proto 與跨 realm plain records 接受`, () => {
    const { api, read } = setup(portable), r = Object.assign(Object.create(null), request());
    r.target = Object.assign(Object.create(null), r.target); r.value = Object.assign(Object.create(null), r.value);
    api.executeOperation(r); api.executeOperation(vm.runInNewContext(`(${JSON.stringify(request('s18-image'))})`));
    assert.equal(read().slides[0].content.components.length, 2);
  });
  test(`S18 ${label} role/keyPoint/table/chart/citation/缺 target/錯 slide 拒絕`, () => {
    const spec = input(); spec.slides[0].content.components.push(
      { id: 'table', type: 'table', headers: ['A'], rows: [['B']] },
      { id: 'chart', type: 'chart', chartType: 'bar', labels: ['A'], series: [{ name: 'B', values: [1] }] },
      { id: 'citation', type: 'citation', public: true, label: 'C', url: 'https://example.com' });
    const { h, api, read } = setup(portable, spec), before = read(), ids = resolveSlideElementIdentities(before.slides[0]);
    for (const id of [ids.title, ids.subtitle, ...ids.keyPoints, 'component-table', 'component-chart', 'component-citation', 'missing']) {
      const r = request(); r.target.elementId = id; assert.throws(() => api.executeOperation(r));
    }
    assert.throws(() => api.executeOperation(request('s18-text', 'missing')));
    api.executeOperation(insertion('only-first'));
    const current = read(); assert.throws(() => api.executeOperation(request('only-first', 'other'))); assert.deepEqual(read(), current);
    removeExpected(current, 'only-first'); assert.deepEqual(current, before); if (h) assert.equal(h.getRevision(), 1);
  });
  for (const ref of ['slots', 'order-ref', 'order-id', 'order-element']) test(`S18 ${label} ${ref} 引用 fail loud 且不拆 layout`, () => {
    const spec = input(), composition = spec.slides[0].composition;
    if (ref === 'slots') composition.slots.extra = 'content.components.s18-text';
    else composition.order.push(ref === 'order-ref' ? 'content.components.s18-text' : ref === 'order-id' ? 's18-text' : 'component-s18-text');
    const { h, api, read } = setup(portable, spec), before = read();
    assert.throws(() => api.executeOperation(request()), /引用|reference/); assert.deepEqual(read(), before); if (h) assert.equal(h.getRevision(), 0);
  });
  test(`S18 ${label} collision 刪除不得 remap surviving stable IDs`, () => {
    const spec = input(), long = 'a'.repeat(80), short = 'a'.repeat(61) + '-5143e6d5';
    spec.slides[0].content.components.push({ id: short, type: 'text', text: '短' }, { id: long, type: 'text', text: '長' });
    const { api, read } = setup(portable, spec), before = read(), slide = before.slides[0];
    const r = request(); r.target.elementId = resolveSlideElementIdentities(slide).components[slide.content.components.findIndex(c => c.id === short)];
    assert.throws(() => api.executeOperation(r), /identity|識別/); assert.deepEqual(read(), before);
  });
  test(`S18 ${label} 空 geometry map 正規化、可刪無 geometry 的獨立元件`, () => {
    const spec = input(); spec.slides[0].composition.geometryOverrides = { 's18-text': { ...box } };
    const { api, read } = setup(portable, spec); api.executeOperation(request());
    assert.equal(Object.hasOwn(read().slides[0].composition, 'geometryOverrides'), false);
    api.executeOperation(request('s18-image')); assert.equal(read().slides[0].content.components.length, 2);
  });
  test(`S18 ${label} export/extract/sanitize/render/offline 再插入、編輯、刪除`, () => {
    const { api, read } = setup(portable); api.executeOperation(request()); api.executeOperation(request('s18-image'));
    const html = portable ? api.exportHtml() : renderFullDeck(read()).html, extracted = extractDeckSpec(html);
    assert.deepEqual(extracted, read()); assert.deepEqual(sanitizeDeckSpec(extracted), extracted);
    for (const output of [html, renderFullDeck(extracted).html]) {
      assert.doesNotMatch(output, /data-edit-target="slides.portable.content.components.s18-(?:text|image)"/);
      assert.doesNotMatch(output, /data-pptskill-(?:selected|dragging)=/);
    }
    const reopened = mountedEditor(extracted); reopened.api.executeOperation(insertion());
    reopened.api.executeOperation({ operation: 'edit-text', target: request().target, value: '離線重新編輯' });
    reopened.api.executeOperation(request()); assert.deepEqual(reopened.getSpec(), extracted); assert.equal(reopened.getRevision(), 3);
  });
}
for (const failure of ['missing', 'duplicate', 'duplicate-slide', 'wrong-deck', 'wrong-target', 'wrong-kind', 'stale-text', 'text-child', 'stale-image', 'image-alt', 'image-fit', 'remove-before', 'remove-after']) test(`S18 mounted ${failure} 原子拒絕保住 canonical/DOM/selection/gesture`, () => {
  const h = mountedEditor(input()); h.ready(); h.begin(); h.update(20, 16);
  const image = ['stale-image', 'image-alt', 'image-fit'].includes(failure), target = node(h, image ? 's18-image' : 's18-text'), section = root(h);
  if (failure === 'missing') target.remove();
  if (failure === 'duplicate') section.append(target.cloneNode(true));
  if (failure === 'duplicate-slide') section.parentElement.append(section.cloneNode(true));
  if (failure === 'wrong-deck') h.document.body.append(section);
  if (failure === 'wrong-target') target.dataset.editTarget += '-wrong';
  if (failure === 'wrong-kind') target.dataset.editKind = 'chart';
  if (failure === 'stale-text') target.textContent = '未提交文字';
  if (failure === 'text-child') target.append(h.document.createElement('span'));
  if (image) { const img = target.querySelector('img'); if (failure === 'image-fit') img.style.setProperty('object-fit', 'cover'); else img.setAttribute(failure === 'image-alt' ? 'alt' : 'src', 'stale'); }
  if (failure.startsWith('remove-')) { const remove = target.remove.bind(target); target.remove = () => { if (failure === 'remove-after') remove(); throw Error(failure); }; }
  const before = h.getSpec(), dom = h.document.outerHTML, selection = json(h.api.layout.getSelectionState());
  assert.throws(() => h.api.executeOperation(request(image ? 's18-image' : 's18-text')), failure.startsWith('remove-') ? new RegExp(failure) : /DOM|失配|connected/);
  assert.deepEqual(h.getSpec(), before); assert.equal(h.document.outerHTML, dom); assert.equal(h.getRevision(), 0);
  assert.deepEqual(json(h.api.layout.getSelectionState()), selection); assert.equal(h.api.layout.getState().gesturing, true);
});
for (const snap of [false, true]) for (const kind of ['drag', 'resize']) test(`S18 mounted snap=${snap} ${kind} 成功取消 preview/selection 不提交 geometry`, () => {
  const h = mountedEditor(input()); h.ready(); if (snap) h.action('snap-layout');
  const expected = h.getSpec(), old = h.component(), style = old.getAttribute('style');
  h.begin(kind); h.update(20, 16, kind); h.api.executeOperation(request()); h.finish(kind);
  removeExpected(expected, 's18-text'); assert.deepEqual(h.getSpec(), expected); assert.equal(h.getRevision(), 1);
  assert.equal(old.getAttribute('style'), style); assert.equal(h.api.layout.getState().gesturing, false);
  assert.deepEqual([...h.api.layout.getSelectionState().selected], []); assert.equal(h.api.layout.getState().enabled, true);
});
test('S18 mounted remove 同步重入不得提交另一 operation', () => {
  const h = mountedEditor(input()), target = node(h), remove = target.remove.bind(target); let rejected = 0;
  target.remove = () => { for (const r of [request(), insertion('reentry')]) { assert.throws(() => h.api.executeOperation(r), /進行中|reentry|重入/); rejected++; } remove(); };
  h.api.executeOperation(request()); assert.equal(rejected, 2); assert.equal(h.getRevision(), 1); assert.equal(node(h), null); assert.equal(node(h, 'reentry'), null);
});
test('S18 mounted S16 draft 拒絕保留，成功關閉且 late submit 不復活', () => {
  const h = mountedEditor(input()); h.api.layout.setMode(true); h.click(node(h)); h.action('edit-selected-text');
  const dialog = h.document.querySelector('[data-insert-text-dialog]'), text = h.document.querySelector('[data-insert-text-value]');
  assert.equal(dialog.open, true); text.value = '不准復活'; const r = request(); r.value.confirm = false;
  assert.throws(() => h.api.executeOperation(r)); assert.equal(text.value, '不准復活'); assert.equal(dialog.open, true);
  h.api.executeOperation(request()); assert.equal(dialog.open, false); assert.equal(text.value, '');
  h.action('submit-insert-text'); assert.equal(node(h), null); assert.equal(h.getRevision(), 1);
  assert.doesNotMatch(h.api.exportHtml(), /不准復活/);
});
test('S18 descriptor 明示 destructive/confirm=true/undoable=false，Node 與 portable 一致', () => {
  const d = OPERATION_DESCRIPTORS['delete-element']; assert.ok(d);
  assert.equal(d.destructive, true); assert.equal(d.confirmation, 'required'); assert.equal(d.undoable, false);
  assert.deepEqual(d.allowedTargetRoles, ['component']);
  assert.deepEqual(d.inputSchema.properties.value.properties.confirm, { type: 'boolean', const: true });
  assert.equal(d.inputSchema.properties.target.additionalProperties, false);
  assert.deepEqual(json(mountedEditor(input()).api.operationDescriptors['delete-element']), d);
});

const deferred = () => {
  let resolve, reject;
  const promise = new Promise((ok, fail) => { resolve = ok; reject = fail; });
  return { promise, resolve, reject };
};
const emit = (element, type, fields = {}) => Promise.all((element.listeners[type] || []).map(fn => fn({ target: element, preventDefault() {}, ...fields })));
const fileOptions = id => ({ slideId: 'portable', componentId: id, alt: 'deferred', geometry: { ...box } });
const optimized = { dataUri: png, warnings: [], optimized: false };
function assertBusyUnchanged(h, req = request()) {
  const before = h.getSpec(), dom = h.document.outerHTML, revision = h.getRevision();
  const selection = json(h.api.layout.getSelectionState()), gesturing = h.api.layout.getState().gesturing;
  assert.throws(() => h.api.executeOperation(req), /進行中/);
  assert.deepEqual(h.getSpec(), before); assert.equal(h.document.outerHTML, dom); assert.equal(h.getRevision(), revision);
  assert.deepEqual(json(h.api.layout.getSelectionState()), selection); assert.equal(h.api.layout.getState().gesturing, gesturing);
}
for (const operation of ['insert', 'replace']) for (const outcome of ['resolve', 'reject']) test(`S18 deferred ${operation}/${outcome} optimizer pending 拒絕刪除、settle 後恢復`, async () => {
  const h = mountedEditor(input()), gate = deferred(); let calls = 0;
  h.assets.optimizeFile = () => { calls++; return gate.promise; };
  h.ready(); h.begin(); h.update(18, 12);
  const pending = operation === 'insert' ? h.api.insertImageFile({ name: 'deferred.png' }, fileOptions('deferred-image'))
    : h.api.replaceImageFile({ name: 'deferred.png' }, request('s18-image').target);
  const settled = pending.then(value => ({ value }), error => ({ error }));
  assert.equal(calls, 1); assertBusyUnchanged(h); assertBusyUnchanged(h, request('s18-image'));
  const before = h.getSpec(), rev = h.getRevision();
  if (outcome === 'resolve') gate.resolve(optimized); else gate.reject(new Error('optimizer-rejected'));
  const result = await settled;
  if (outcome === 'reject') { assert.match(result.error.message, /optimizer-rejected/); assert.deepEqual(h.getSpec(), before); assert.equal(h.getRevision(), rev); }
  else { assert.equal(result.error, undefined); assert.equal(result.value.dataUri, png); }
  const expected = h.getSpec(); removeExpected(expected, 's18-image');
  h.api.executeOperation(request('s18-image')); h.finish();
  assert.deepEqual(h.getSpec(), expected); assert.equal(node(h, 's18-image'), null);
  await Promise.resolve(); assert.deepEqual(h.getSpec(), expected);
});
test('S18 兩個 deferred optimizer 只完成一個仍拒絕；全部 settle 才可刪除', async () => {
  const h = mountedEditor(input()), gates = [deferred(), deferred()]; let calls = 0;
  h.assets.optimizeFile = () => gates[calls++].promise;
  const first = h.api.insertImageFile({}, fileOptions('async-a'));
  const second = h.api.insertImageFile({}, fileOptions('async-b'));
  const rejected = assert.rejects(second, /second-failed/);
  assertBusyUnchanged(h); gates[0].resolve(optimized); await first;
  assertBusyUnchanged(h); gates[1].reject(new Error('second-failed')); await rejected;
  h.api.executeOperation(request()); assert.equal(node(h), null); assert.equal(node(h, 'async-b'), null);
  assert.equal(h.getRevision(), 2);
});
for (const kind of ['insert', 'replace']) for (const outcome of ['cancel', 'resolve', 'reject']) test(`S18 ${kind} picker/${outcome} ownership 拒絕 delete、釋放後恢復`, async () => {
  const h = mountedEditor(input()); h.api.layout.setMode(true); h.click(node(h, 's18-image'));
  const picker = h.document.querySelector(kind === 'insert' ? '#pptskill-insert-image-input' : '#pptskill-selected-image-input');
  let picks = 0; picker.click = () => { picks++; };
  h.action(kind === 'insert' ? 'insert-image' : 'replace-selected-image');
  assert.equal(picks, 1); assertBusyUnchanged(h, request('s18-image'));
  if (outcome === 'cancel') await emit(picker, 'cancel');
  else {
    const gate = deferred(); h.assets.optimizeFile = () => gate.promise; picker.files = [{ name: 'picked.png' }];
    const pending = emit(picker, 'change'); assertBusyUnchanged(h, request('s18-image'));
    if (outcome === 'resolve') gate.resolve(optimized); else gate.reject(new Error('picker-optimizer-rejected'));
    await pending;
    if (outcome === 'reject') assert.match(h.document.querySelector('[data-editor-status]').textContent, /picker-optimizer-rejected/);
  }
  const expected = h.getSpec(); removeExpected(expected, 's18-image');
  h.api.executeOperation(request('s18-image')); assert.deepEqual(h.getSpec(), expected); assert.equal(node(h, 's18-image'), null);
});
for (const mode of ['edit', 'insert']) for (const fail of [false, true]) test(`S18 text submit ${mode}/throw=${fail} 同步 projection 期間拒絕 delete，finally 恢復`, () => {
  const h = mountedEditor(input()); h.api.layout.setMode(true); h.click(node(h));
  h.action(mode === 'edit' ? 'edit-selected-text' : 'insert-text');
  const dialog = h.document.querySelector('[data-insert-text-dialog]'), text = h.document.querySelector('[data-insert-text-value]');
  assert.equal(dialog.open, true); text.value = '待提交文字'; let blocked = 0;
  const hook = () => { assertBusyUnchanged(h); assert.equal(dialog.open, true); assert.equal(text.value, '待提交文字'); blocked++; if (fail) throw Error('text-projection-failed'); };
  const target = node(h), section = root(h), append = section.append;
  let proto = Object.getPrototypeOf(target), descriptor;
  while (proto && !descriptor) { descriptor = Object.getOwnPropertyDescriptor(proto, 'textContent'); proto = Object.getPrototypeOf(proto); }
  if (mode === 'edit') Object.defineProperty(target, 'textContent', { configurable: true, get() { return descriptor.get.call(this); }, set(value) { hook(); descriptor.set.call(this, value); } });
  else section.append = function (child) { hook(); return append.call(this, child); };
  const before = h.getSpec(), revision = h.getRevision();
  h.action('submit-insert-text'); assert.equal(blocked, 1);
  if (mode === 'edit') delete target.textContent; else section.append = append;
  if (fail) { assert.equal(dialog.open, true); assert.equal(text.value, '待提交文字'); assert.deepEqual(h.getSpec(), before); assert.equal(h.getRevision(), revision); }
  else { assert.equal(dialog.open, false); assert.equal(h.getRevision(), revision + 1); }
  h.api.executeOperation(request()); assert.equal(node(h), null);
  h.action('submit-insert-text'); assert.equal(node(h), null);
});
for (const portable of [false, true]) test(`S18 ${portable ? 'mounted' : 'Node'} API 返回值深層隔離，不洩漏 mutable canonical`, () => {
  const { api, read } = setup(portable), out = api.executeOperation(request()), expected = read();
  out.slides[0].content.components.push({ id: 'resurrected', type: 'text', text: '外部改值' });
  out.slides[0].composition.geometryOverrides['portable-quote'].x = 123;
  out.slides[1].content.title = '外部標題'; out.style.id = 'changed';
  assert.deepEqual(read(), expected);
});
test('S18 motion refs 在 shared pure preflight 拒絕；不依 sanitizer 靜默移除', () => {
  const slide = input().slides[0], before = structuredClone(slide);
  slide.composition.motion.targets = [{ ref: 'content.components.s18-text' }];
  const candidate = structuredClone(slide);
  assert.throws(() => componentDeletion.update(candidate, request()), /引用/); assert.deepEqual(candidate, slide);
  assert.deepEqual(slide.content, before.content);
});
test('S18 API-only VM 無 layout/完整 DOM 時 fail closed，其他 public operation 仍可使用', () => {
  const clean = sanitizeDeckSpec(input()), tag = { textContent: JSON.stringify(clean) };
  // 與既有 API VM 一樣提供已投影的 geometry 節點；不讓 bootstrap 誤走 DOM 補建。
  const slides = clean.slides.map(s => {
    const ids = resolveSlideElementIdentities(s).components;
    const elements = new Map(ids.map(id => [id, { dataset: {}, style: {}, matches: () => false }]));
    return { dataset: { slideId: s.id }, addEventListener() {},
      querySelector(css) { return elements.get(css.match(/^\[data-pptskill-element-id="([^"]+)"\]$/)?.[1]) || null; },
      querySelectorAll() { return []; },
    };
  });
  const document = { readyState: 'complete', body: { dataset: {} }, addEventListener() {},
    querySelector(css) { if (css === '#deck-spec') return tag; if (css.startsWith('.slide[')) return slides.find(s => css.includes('"' + s.dataset.slideId + '"')); return null; },
    querySelectorAll(css) { return css === '.slide' ? slides : []; },
  };
  const context = { document, window: {}, CSS: { escape: value => value }, console };
  vm.runInNewContext(buildDeckEditorRuntimeScript().replace(/^<script[^>]*>/, '').replace(/<\/script>$/, ''), context);
  const api = context.window.PPTSKILLEditor, before = json(api.getDeckSpec());
  assert.deepEqual(json(api.operationDescriptors['delete-element']), OPERATION_DESCRIPTORS['delete-element']);
  assert.throws(() => api.executeOperation(request()), /DOM|connected/); assert.deepEqual(json(api.getDeckSpec()), before);
  api.executeOperation({ operation: 'edit-text', target: { slideId: 'portable', elementId: 'role-title' }, value: 'API VM' });
  assert.equal(api.getDeckSpec().slides[0].content.title, 'API VM');
});

for (const phase of ['before', 'after']) test(`S18 reentry applyLocalPatch/${phase} 拒絕 image patch，單次 revision 與 DOM/canonical 一致`, () => {
  const h = mountedEditor(input()), target = node(h), remove = target.remove.bind(target), image = node(h, 's18-image');
  const before = h.getSpec(), expected = structuredClone(before), revision = h.getRevision();
  removeExpected(expected, 's18-text');
  let accepted = false, error;
  target.remove = () => {
    if (phase === 'after') remove();
    try { h.api.applyLocalPatch({ slideId: 'portable', region: 'content.components.s18-image', value: { alt: 'S18_REENTRY_PROBE' } }); accepted = true; }
    catch (failure) { error = failure; }
    if (phase === 'before') remove();
  };
  h.api.executeOperation(request());
  // 完成外層 delete 後保留 Mainline probe 的 revision／canonical／DOM 失配證據。
  const observed = { accepted, revisionDelta: h.getRevision() - revision,
    canonicalAlt: h.getSpec().slides[0].content.components.find(c => c.id === 's18-image').alt,
    domAlt: node(h, 's18-image').querySelector('img').getAttribute('alt') };
  if (accepted) console.log('S18_REENTRY_PROBE', JSON.stringify(observed));
  assert.equal(accepted, false, JSON.stringify(observed)); assert.match(error.message, /進行中|重入/);
  assert.deepEqual(h.getSpec(), expected); assert.equal(h.getRevision(), revision + 1);
  assert.equal(node(h, 's18-image'), image); assert.equal(image.querySelector('img').getAttribute('alt'), '新圖');
});
for (const method of ['prepareExport', 'exportHtml', 'getSizeReport', 'download']) for (const phase of ['before', 'after']) test(`S18 reentry ${method}/${phase} 在 syncText 前拒絕，不匯出半完成 DOM`, () => {
  const h = mountedEditor(input()), target = node(h), remove = target.remove.bind(target);
  const title = root(h).querySelector('[data-pptskill-element-id="role-title"]');
  const titleDescriptor = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(title), 'textContent');
  let reads = 0;
  Object.defineProperty(title, 'textContent', { configurable: true,
    get() { reads++; return titleDescriptor.get.call(this); }, set(value) { titleDescriptor.set.call(this, value); } });
  const before = h.getSpec(), expected = structuredClone(before); removeExpected(expected, 's18-text');
  target.remove = () => {
    if (phase === 'after') remove();
    const previousReads = reads;
    if (method === 'download') {
      assert.equal(h.api.download(), false);
      assert.match(h.document.querySelector('[data-editor-status]').textContent, /進行中|重入/);
    } else assert.throws(() => h.api[method](), /進行中|重入/);
    assert.equal(reads, previousReads, '必須在 syncText／DOM clone 前拒絕');
    assert.deepEqual(h.getSpec(), before); assert.equal(h.getRevision(), 0);
    if (phase === 'before') remove();
  };
  h.api.executeOperation(request()); assert.deepEqual(h.getSpec(), expected); assert.equal(h.getRevision(), 1);
  delete title.textContent;
  assert.deepEqual(extractDeckSpec(h.api.exportHtml()), expected);
});
