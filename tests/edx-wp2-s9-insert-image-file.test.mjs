import test from 'node:test';
import assert from 'node:assert/strict';
import { mountedEditor, fixture } from '../tools/edx-wp1-s4-perf-mounted.mjs';

const png = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+ip1sAAAAASUVORK5CYII=';
const options = (componentId = 'file-image', slideId = 'portable') => ({ slideId, componentId, alt: '新圖 <&>', geometry: { x: 600, y: 400, width: 240, height: 160 } });
test('S9 public insertImageFile 新增圖片並保留 optimizer result identity', async () => {
  const h = mountedEditor(fixture(0)), result = { dataUri: png, warnings: [], optimized: false };
  let calls = 0;
  h.assets.optimizeFile = async () => { calls++; return result; };
  assert.equal(await h.api.insertImageFile({ name: 'source.png' }, options()), result);
  assert.equal(calls, 1);
  assert.equal(h.getSpec().slides[0].content.components.at(-1).id, 'file-image');
  assert.equal(h.getRevision(), 1);
});

const json = value => JSON.parse(JSON.stringify(value));
const input = () => { const spec = fixture(0); spec.slides[0].content.components[1].dataUri = png; spec.slides.push({ ...structuredClone(spec.slides[0]), id: 'other' }); return spec; };
const setup = () => mountedEditor(input());
const result = () => ({ dataUri: png, warnings: [], optimized: false });
const root = (h, id = 'portable') => h.document.querySelector(`.slide[data-slide-id="${id}"]`);
const snapshot = h => ({ spec: h.getSpec(), dom: h.document.outerHTML, revision: h.getRevision(), selection: json(h.api.layout.getSelectionState()), gesturing: h.api.layout.getState().gesturing });
const deferred = h => {
  const queue = [];
  h.assets.optimizeFile = file => new Promise((resolve, reject) => queue.push({ file, resolve, reject }));
  return queue;
};
function appendExpected(spec, o, r = result()) {
  const slide = spec.slides.find(s => s.id === o.slideId);
  slide.content.components.push({ id: o.componentId, type: 'image', alt: o.alt, dataUri: r.dataUri, ...(Object.hasOwn(o, 'fit') ? { fit: o.fit } : {}) });
  slide.composition.geometryOverrides = { ...slide.composition.geometryOverrides, [o.componentId]: Object.fromEntries(['x', 'y', 'width', 'height'].map(key => [key, o.geometry[key]])) };
}
for (const mode of ['default', 'contain', 'cover', 'cross-slide', 'null-proto', 'frozen', 'non-enumerable']) test(`S9 ${mode} 全 spec preservation／唯一 DOM`, async () => {
  const h = setup(), o = options('file-image', mode === 'cross-slide' ? 'other' : 'portable');
  if (['contain', 'cover'].includes(mode)) o.fit = mode;
  for (const record of [o, o.geometry]) {
    if (mode === 'null-proto') Object.setPrototypeOf(record, null);
    if (mode === 'frozen') Object.freeze(record);
    if (mode === 'non-enumerable') for (const key of Object.keys(record)) Object.defineProperty(record, key, { enumerable: false });
  }
  const expected = h.getSpec(); appendExpected(expected, o);
  await h.api.insertImageFile({ dataUri: png }, o);
  assert.deepEqual(h.getSpec(), expected); assert.equal(h.getRevision(), 1);
  const nodes = root(h, o.slideId).querySelectorAll('[data-pptskill-element-id="component-file-image"]');
  assert.equal(nodes.length, 1); const img = nodes[0].querySelector('img');
  assert.equal(img.getAttribute('src'), png); assert.equal(img.getAttribute('alt'), o.alt);
  assert.equal(img.style.getPropertyValue('object-fit'), o.fit || 'contain');
  for (const key of ['x', 'y', 'width', 'height']) assert.equal(parseFloat(nodes[0].style.getPropertyValue({ x: 'left', y: 'top' }[key] || key)), o.geometry[key]);
});

test('S9 invalid own-data／geometry／target：getter0 optimizer0，既有 gesture 不取消', async () => {
  const h = setup(); h.ready(); h.begin(); h.update(18, 12); let getters = 0, calls = 0;
  h.assets.optimizeFile = async () => { calls++; throw Error('不應呼叫'); };
  const invalid = [undefined, null, false, 1, 'options', [], {}, options('perf-image'), options('new', 'missing')];
  for (const part of ['options', 'geometry']) {
    const record = o => part === 'options' ? o : o.geometry;
    for (const change of [r => Object.setPrototypeOf(r, { inherited: 1 }), r => Object.defineProperty(r, Symbol('extra'), { value: 1 }),
      r => Object.defineProperty(r, 'hidden', { value: 1 }), r => Object.defineProperty(r, 'extra', { get() { getters++; throw Error('getter'); } })]) {
      const o = options(); change(record(o)); invalid.push(o);
    }
    for (const key of Object.keys(record(options()))) {
      const o = options(); Object.defineProperty(record(o), key, { get() { getters++; throw Error('getter'); } }); invalid.push(o);
      const missing = options(); delete record(missing)[key]; invalid.push(missing);
    }
    for (const value of [null, [], 1, 'record']) { const o = options(); if (part === 'options') invalid.push(value); else { o.geometry = value; invalid.push(o); } }
  }
  for (const value of [undefined, null, 'fill', 1]) invalid.push({ ...options(), fit: value });
  const getterFit = options(); Object.defineProperty(getterFit, 'fit', { get() { getters++; throw Error('getter'); } }); invalid.push(getterFit);
  for (const [key, values] of Object.entries({ slideId: ['', 3], componentId: ['', '../bad', 'A', 'a'.repeat(81), 1], alt: [undefined, null, 2] })) for (const value of values) invalid.push({ ...options(), [key]: value });
  for (const key of ['x', 'y', 'width', 'height']) for (const value of [79, -1, 1.5, NaN, Infinity, '100', 2000]) { const o = options(); o.geometry[key] = value; invalid.push(o); }
  const before = snapshot(h);
  for (const o of invalid) { await assert.rejects(h.api.insertImageFile({}, o)); assert.deepEqual(snapshot(h), before); }
  assert.equal(getters, 0); assert.equal(calls, 0);
});

test('S9 falsy file 不讀 options／不呼叫 optimizer；missing optimizer 明確失敗', async () => {
  const h = setup(), before = snapshot(h); let calls = 0;
  h.assets.optimizeFile = async () => { calls++; return result(); };
  const o = Object.defineProperty({}, 'slideId', { get() { throw Error('不可讀'); } });
  for (const file of [null, undefined, false, 0, '']) assert.equal(await h.api.insertImageFile(file, o), null);
  assert.equal(calls, 0); assert.deepEqual(snapshot(h), before);
  for (const assets of [undefined, {}, { optimizeFile: 1 }]) {
    h.window.PPTSKILLAssets = assets; await assert.rejects(h.api.insertImageFile({}, options()), /optimizer/); assert.deepEqual(snapshot(h), before);
  }
});

test('S9 snapshot＋await 切頁／mode／export clone，保留等待中 content／geometry', async () => {
  const h = setup(), queue = deferred(h), o = options(), captured = structuredClone(o), file = { name: '原檔.png' };
  const before = snapshot(h), pending = h.api.insertImageFile(file, o);
  assert.equal(queue.length, 1); assert.equal(queue[0].file, file); assert.deepEqual(snapshot(h), before);
  o.slideId = 'other'; o.componentId = 'changed'; o.alt = '改掉'; o.fit = 'cover'; o.geometry.x = 100; o.geometry.width = 400;
  h.click(root(h, 'other')); h.api.layout.setMode(true); h.api.exportHtml();
  h.api.executeOperation({ operation: 'edit-text', target: { slideId: 'portable', elementId: 'role-title' }, value: '等待期間文字' });
  h.api.executeOperation({ operation: 'move-element', target: { slideId: 'other', elementId: 'component-perf-image' }, value: { x: 700, y: 300 } });
  const expected = h.getSpec(), revision = h.getRevision(), r = result(); appendExpected(expected, captured, r);
  queue[0].resolve(r); assert.equal(await pending, r); assert.deepEqual(h.getSpec(), expected); assert.equal(h.getRevision(), revision + 1);
});

for (const mode of ['reject', 'null', 'missing-warnings', 'warnings-string', 'warnings-item', 'missing-optimized', 'optimized-string', 'no-data', 'unsafe', 'svg', 'missing-target', 'identity-collision', 'missing-dom', 'duplicate-dom', 'prepare-throw', 'append-before', 'append-after']) test(`S9 pending ${mode} 零提交`, async () => {
  const h = setup(); h.ready(); h.begin(); h.update(18, 12);
  const queue = deferred(h), id = mode === 'identity-collision' ? 'a'.repeat(61) + '-5143e6d5' : 'file-image';
  const beforePending = snapshot(h), pending = h.api.insertImageFile({}, options(id, 'other'));
  assert.deepEqual(snapshot(h), beforePending); assert.equal(queue.length, 1);
  const section = root(h, 'other');
  if (mode === 'missing-target') h.window.__testMutateSpec(s => s.slides.splice(1, 1));
  if (mode === 'identity-collision') h.window.__testMutateSpec(s => s.slides[1].content.components.push({ id: 'a'.repeat(80), type: 'image', dataUri: png, alt: '' }));
  if (mode === 'missing-dom') section.remove();
  if (mode === 'duplicate-dom') { const node = h.document.createElement('figure'); node.setAttribute('data-pptskill-element-id', 'component-file-image'); section.append(node); }
  if (mode.startsWith('append')) { const append = section.append.bind(section); section.append = node => { if (mode === 'append-after') append(node); throw Error(mode); }; }
  if (mode === 'prepare-throw') { const create = h.document.createElement; h.document.createElement = tag => { const node = create(tag); if (tag === 'template') Object.defineProperty(node, 'innerHTML', { set() { throw Error(mode); } }); return node; }; }
  let r = result();
  if (mode === 'null') r = null;
  if (mode === 'missing-warnings') delete r.warnings;
  if (mode === 'warnings-string') r.warnings = '';
  if (mode === 'warnings-item') r.warnings = [{}];
  if (mode === 'missing-optimized') delete r.optimized;
  if (mode === 'optimized-string') r.optimized = 'yes';
  if (mode === 'no-data') delete r.dataUri;
  if (mode === 'unsafe') r.dataUri = 'file:///private/image.png';
  if (mode === 'svg') r.dataUri = 'data:image/svg+xml;base64,%%%';
  const before = snapshot(h);
  if (mode === 'reject') queue[0].reject(Error('解碼失敗')); else queue[0].resolve(r);
  await assert.rejects(pending); assert.deepEqual(snapshot(h), before);
});

test('S9 preflight identity collision 在 optimizer 前拒絕', async () => {
  const spec = input(); spec.slides[0].content.components.push({ id: 'a'.repeat(80), type: 'image', dataUri: png, alt: '' });
  const h = mountedEditor(spec), before = snapshot(h); let calls = 0;
  h.assets.optimizeFile = async () => { calls++; return result(); };
  await assert.rejects(h.api.insertImageFile({}, options('a'.repeat(61) + '-5143e6d5')), /identity/);
  assert.equal(calls, 0); assert.deepEqual(snapshot(h), before);
});

for (const kind of ['same-id', 'different-id', 'cross-slide']) test(`S9 pending 競爭 ${kind}：完成次序決定，不覆蓋`, async () => {
  const h = setup(), queue = deferred(h), a = options(), b = options(kind === 'different-id' ? 'second-file' : 'file-image', kind === 'cross-slide' ? 'other' : 'portable');
  const first = h.api.insertImageFile({ name: 'first' }, a), second = h.api.insertImageFile({ name: 'second' }, b);
  assert.equal(queue.length, 2); const r2 = result(); r2.warnings = ['oversized_gif_preserved'];
  queue[1].resolve(r2); assert.equal(await second, r2); assert.match(h.document.querySelector('[data-editor-status]').textContent, /大型 GIF/);
  const before = snapshot(h); queue[0].resolve(result());
  if (kind === 'same-id') { await assert.rejects(first, /duplicate/); assert.deepEqual(snapshot(h), before); }
  else { await first; assert.equal(h.getRevision(), 2); assert.equal(h.getSpec().slides.reduce((n, s) => n + s.content.components.filter(c => c.id === 'file-image' || c.id === 'second-file').length, 0), 2); }
});

for (const kind of ['drag', 'resize']) test(`S9 ${kind} pending 保留／成功才 cancel clear revision 一次`, async () => {
  const h = setup(); h.ready(); h.begin(kind); h.update(20, 16, kind);
  const queue = deferred(h), before = snapshot(h), pending = h.api.insertImageFile({}, options());
  assert.deepEqual(snapshot(h), before);
  let cancels = 0, clears = 0;
  const cancel = h.api.layout.cancel, clear = h.api.layout.clearSelection;
  h.api.layout.cancel = (...args) => { cancels++; return cancel(...args); };
  h.api.layout.clearSelection = (...args) => { clears++; return clear(...args); };
  queue[0].resolve({ ...result(), optimized: true }); await pending;
  assert.equal(cancels, 1); assert.equal(clears, 1); assert.equal(h.getRevision(), 1);
  assert.equal(h.api.layout.getState().gesturing, false); assert.deepEqual([...h.api.layout.getSelectionState().selected], []);
  assert.match(h.document.querySelector('[data-editor-status]').textContent, /最佳化/);
  h.finish(kind); assert.equal(h.getRevision(), 1);
  assert.deepEqual(h.getSpec().slides[0].composition.geometryOverrides['perf-image'], before.spec.slides[0].composition.geometryOverrides['perf-image']);
});

test('S9 export／reparse／remount 恰一 root，新圖可選取與 fit', async () => {
  const { extractDeckSpec } = await import('../runtime/deck-spec.js');
  const h = setup(); await h.api.insertImageFile({ dataUri: png }, options());
  const html = h.api.exportHtml(), spec = extractDeckSpec(html); assert.deepEqual(spec, h.getSpec());
  const body = html.split('<body')[1]; assert.equal(body.match(/data-edit-target="slides.portable.content.components.file-image"/g)?.length, 1);
  const reopened = mountedEditor(spec), nodes = root(reopened).querySelectorAll('[data-pptskill-element-id="component-file-image"]');
  assert.equal(nodes.length, 1); assert.deepEqual(reopened.getSpec(), spec);
  reopened.api.layout.setMode(true); reopened.click(nodes[0]);
  assert.deepEqual([...reopened.api.layout.getSelectionState().selected], ['component-file-image']);
  reopened.click(reopened.document.querySelector('[data-image-fit="cover"]'));
  assert.equal(reopened.getSpec().slides[0].content.components.at(-1).fit, 'cover');
});
