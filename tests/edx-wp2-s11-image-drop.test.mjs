import test from 'node:test';
import assert from 'node:assert/strict';
import { mountedEditor, fixture } from '../tools/edx-wp1-s4-perf-mounted.mjs';
import { extractDeckSpec } from '../runtime/deck-spec.js';

const png = 'data:image/png;base64,AA==';
const result = () => ({ dataUri: png, warnings: [], optimized: false });
const geometry = { x: 560, y: 288, width: 480, height: 320 };
const file = { name: '同檔 <&>.png' };
const root = (h, id = 'portable') => h.document.querySelector(`.slide[data-slide-id="${id}"]`);
const emit = async (node, type, fields = {}) => { for (const fn of node.listeners[type] || []) await fn({ target: node, ...fields }); };
function setup(spec) {
  if (!spec) { spec = fixture(0); spec.slides.push({ ...structuredClone(spec.slides[0]), id: 'other' }); }
  const h = mountedEditor(spec);
  h.calls = 0; h.opens = 0;
  h.assets.optimizeFile = async f => { h.calls++; assert.equal(f, file); return result(); };
  h.input = h.document.querySelector('#pptskill-insert-image-input');
  h.replace = h.document.querySelector('#pptskill-selected-image-input');
  h.input.click = h.replace.click = () => { h.opens++; };
  h.button = h.document.querySelector('[data-action="insert-image"]');
  h.status = () => h.document.querySelector('[data-editor-status]').textContent;
  return h;
}
function transfer(files = [file], types = ['Files'], items = []) {
  return { files, types, items, dropEffect: 'unset', getData() { throw Error('不得讀 getData'); } };
}
async function event(h, type = 'drop', target = root(h), dataTransfer = transfer()) {
  let prevented = false;
  await emit(h.document, type, { target, dataTransfer, preventDefault() { prevented = true; } });
  return { prevented, dataTransfer };
}

test('S11 public drop：nested image 新 slot、同檔遞增、defaults、old roots、revision／selection', async () => {
  const h = setup(); h.ready(); const expected = h.getSpec();
  const nodes = h.document.querySelectorAll('.slide,.slide img');
  for (let n = 1; n <= 2; n++) {
    const e = await event(h, 'drop', root(h).querySelector('img'));
    assert.equal(e.prevented, true);
    expected.slides[0].content.components.push({ id: `inserted-image-${n}`, type: 'image', dataUri: png, alt: file.name, fit: 'contain' });
    expected.slides[0].composition.geometryOverrides[`inserted-image-${n}`] = geometry;
    assert.deepEqual(h.getSpec(), expected); assert.equal(h.getRevision(), n);
    assert.equal(h.api.layout.getSelectionState().selected.length, 0);
    assert.ok(nodes.every(n => n.isConnected));
  }
  assert.equal(h.calls, 2);
});

test('S11 cross-slide 無圖頁採事件 target，首個空缺 ID', async () => {
  const s = fixture(0); s.slides.push({ ...structuredClone(s.slides[0]), id: 'other' });
  s.slides[1].content.components = [{ id: 'inserted-image-2', type: 'text', text: '保留' }];
  const h = setup(s); h.ready(); const before = h.getSpec();
  await event(h, 'drop', root(h, 'other').children[0]);
  assert.deepEqual(h.getSpec().slides[0], before.slides[0]);
  assert.equal(h.getSpec().slides[1].content.components.at(-1).id, 'inserted-image-1');
  assert.equal(root(h, 'other').dataset.editorSelected, 'true');
});

for (const mode of ['play', 'edit', 'layout', 'destroy']) test(`S11 ${mode} file dragover/drop 預設攔截與 mode gate`, async () => {
  const h = setup();
  if (mode === 'edit') h.action('edit');
  if (mode === 'layout' || mode === 'destroy') h.api.layout.setMode(true);
  if (mode === 'destroy') h.api.layout.destroy();
  const before = h.getSpec(), state = h.api.layout.getSelectionState(), rev = h.getRevision();
  const t = transfer(); Object.defineProperty(t, 'files', { get() { throw Error('dragover 不讀 files'); } });
  h.resetCounts(); const over = await event(h, 'dragover', root(h, 'other').children[0], t);
  assert.deepEqual(h.counts, { payloadReads: 0, serializations: 0, wholeSpecSerializations: 0 });
  assert.equal(over.prevented, true); assert.equal(t.dropEffect, mode === 'layout' ? 'copy' : 'none');
  assert.deepEqual(h.getSpec(), before); assert.equal(h.getRevision(), rev);
  assert.deepEqual(h.api.layout.getSelectionState(), state); assert.equal(root(h).dataset.editorSelected, 'true');
  assert.equal((await event(h)).prevented, true); assert.equal(h.calls, mode === 'layout' ? 1 : 0);
});

for (const types of [['text/plain'], ['text/html'], ['text/uri-list']]) test(`S11 ${types[0]} 不攔截、不讀內容／URL fallback`, async () => {
  const h = setup(); h.ready(); const before = h.getSpec();
  for (const type of ['dragover', 'drop']) assert.equal((await event(h, type, root(h), transfer([], types))).prevented, false);
  assert.equal(h.calls, 0); assert.deepEqual(h.getSpec(), before);
});

test('S11 items.kind=file 可辨識；slide 外／無 transfer 不攔截', async () => {
  const h = setup(); h.ready();
  for (const type of ['dragover', 'drop']) {
    assert.equal((await event(h, type, h.button)).prevented, false);
    assert.equal((await event(h, type, root(h), null)).prevented, false);
  }
  assert.equal((await event(h, 'drop', root(h), transfer([file], [], [{ kind: 'file' }]))).prevented, true);
  assert.equal(h.calls, 1);
});

for (const invalid of ['duplicate-dom', 'missing-id', 'duplicate-spec', 'missing-spec', 'detached']) test(`S11 ${invalid} target 不提交`, async () => {
  const h = setup(); h.ready(); let target = root(h);
  if (invalid === 'duplicate-dom') h.document.body.append(target.cloneNode());
  if (invalid === 'missing-id') { target = root(h, 'other'); target.removeAttribute('data-slide-id'); }
  if (invalid === 'duplicate-spec') h.window.__testMutateSpec(s => s.slides.push(structuredClone(s.slides[0])));
  if (invalid === 'missing-spec') h.window.__testMutateSpec(s => s.slides.shift());
  if (invalid === 'detached') target.remove();
  const before = h.getSpec();
  const over = await event(h, 'dragover', target); assert.equal(over.dataTransfer.dropEffect, invalid === 'detached' ? 'unset' : 'none');
  assert.equal((await event(h, 'drop', target)).prevented, invalid !== 'detached');
  assert.equal(h.calls, 0); assert.deepEqual(h.getSpec(), before);
});

for (const files of [[], [file, file]]) test(`S11 ${files.length} files 拒絕且 status 提示`, async () => {
  const h = setup(); h.ready(); const before = h.getSpec();
  await event(h, 'drop', root(h), transfer(files));
  assert.equal(h.calls, 0); assert.deepEqual(h.getSpec(), before); assert.match(h.status(), /單張|一張|一個/);
});

for (const chooser of ['insert', 'replace']) test(`S11 ${chooser} chooser 保留 pending/input 且 drop 不提交`, async () => {
  const h = setup(); h.api.layout.setMode(true);
  h.click(root(h).querySelector('img')); h.action(chooser === 'insert' ? 'insert-image' : 'replace-selected-image');
  const input = chooser === 'insert' ? h.input : h.replace; input.value = '保留選檔';
  const before = h.getSpec();
  assert.equal((await event(h, 'dragover')).dataTransfer.dropEffect, 'none'); await event(h);
  assert.equal(input.value, '保留選檔'); assert.equal(h.calls, 0); assert.deepEqual(h.getSpec(), before);
  input.files = [file]; await emit(input, 'change'); assert.equal(h.calls, 1);
  assert.equal(h.getSpec().slides[0].content.components.at(-1).id, chooser === 'insert' ? 'inserted-image-1' : 'perf-image');
});

for (const snap of [false, true]) test(`S11 active gesture 取消不 commit，snap=${snap}`, async () => {
  const h = setup(); h.ready(); if (snap) h.action('snap-layout'); h.begin(); h.update(19, 12);
  const old = h.getSpec().slides[0].composition.geometryOverrides['portable-quote'];
  await event(h); assert.equal(h.api.layout.getState().gesturing, false);
  assert.deepEqual(h.getSpec().slides[0].composition.geometryOverrides['portable-quote'], old); assert.equal(h.getRevision(), 1);
});

test('S11 deferred：busy 互斥；mode/export/other edit 保留；finally 不清其後 S6 chooser', async () => {
  const h = setup(); h.ready(); let release;
  h.assets.optimizeFile = () => { h.calls++; return new Promise(ok => { release = ok; }); };
  const pending = event(h); assert.equal(h.calls, 1); assert.equal(h.button.disabled, true);
  await event(h); h.action('insert-image'); assert.equal(h.calls, 1); assert.equal(h.opens, 0);
  assert.equal((await event(h, 'dragover')).dataTransfer.dropEffect, 'none');
  h.api.exportHtml(); h.click(root(h, 'other')); h.action('edit');
  h.api.executeOperation({ operation: 'edit-text', target: { slideId: 'other', elementId: 'role-title' }, value: '等待期間保留' });
  h.api.layout.setMode(true); h.click(root(h, 'other').querySelector('img')); h.action('replace-selected-image'); h.replace.value = '新 chooser';
  const other = h.getSpec().slides[1]; release(result()); await pending;
  assert.deepEqual(h.getSpec().slides[1], other); assert.equal(h.getSpec().slides[0].content.components.at(-1).id, 'inserted-image-1');
  assert.equal(h.replace.value, '新 chooser'); assert.equal(h.button.disabled, true);
  await emit(h.replace, 'cancel'); assert.equal(h.button.disabled, false);
});

for (const failure of ['removed', 'collision', 'reject', 'invalid']) test(`S11 async ${failure} 原子拒絕、零 partial／retry`, async () => {
  const h = setup(); h.ready(); let release, reject;
  h.assets.optimizeFile = () => { h.calls++; return new Promise((ok, no) => { release = ok; reject = no; }); };
  const pending = event(h); assert.equal(h.calls, 1);
  if (failure === 'removed') h.window.__testMutateSpec(s => s.slides.shift());
  if (failure === 'collision') h.window.__testMutateSpec(s => s.slides[0].content.components.push({ id: 'inserted-image-1', type: 'text', text: '競爭' }));
  const before = h.getSpec(), rev = h.getRevision(), dom = root(h).outerHTML;
  if (failure === 'reject') reject(Error('不支援此檔案')); else release(failure === 'invalid' ? {} : result());
  await pending; assert.deepEqual(h.getSpec(), before); assert.equal(h.getRevision(), rev); assert.equal(root(h).outerHTML, dom); assert.equal(h.calls, 1);
  if (failure !== 'removed') assert.equal(h.button.disabled, false);
  if (failure === 'reject' || failure === 'invalid') { h.assets.optimizeFile = async () => result(); await event(h); assert.equal(h.getSpec().slides[0].content.components.at(-1).id, 'inserted-image-1'); }
});

test('S11 export canonical／remount 恢復 listener，無 transient 或重複插入', async () => {
  const h = setup(); h.ready(); await event(h); const html = h.api.exportHtml();
  assert.deepEqual(extractDeckSpec(html), h.getSpec());
  assert.doesNotMatch(html.split('<body')[1], /data-pptskill-insert-image-toolbar|pptskill-insert-image-input/);
  const reopened = setup(extractDeckSpec(html)); reopened.api.layout.setMode(true); await event(reopened);
  assert.equal(reopened.calls, 1); assert.equal(reopened.getRevision(), 1);
  assert.equal(reopened.getSpec().slides[0].content.components.at(-1).id, 'inserted-image-2');
  assert.equal(reopened.document.listeners.drop.length, 1); assert.equal(reopened.document.listeners.dragover.length, 1);
});

test('S11 外部 slide 即使沿用 canonical ID 也不攔截', async () => {
  const h = setup(); h.ready(); const outside = root(h).cloneNode(); h.document.body.append(outside);
  for (const type of ['dragover', 'drop']) assert.equal((await event(h, type, outside)).prevented, false);
  assert.equal(h.calls, 0);
});

test('S11 多檔 dragover 僅看 metadata、dropEffect none、payload/serialize0', async () => {
  const h = setup(); h.ready(); const t = transfer([], ['Files'], [{ kind: 'file' }, { kind: 'file' }]);
  Object.defineProperty(t, 'files', { get() { throw Error('dragover 不讀 files'); } });
  h.resetCounts(); const over = await event(h, 'dragover', root(h), t);
  assert.equal(over.prevented, true); assert.equal(t.dropEffect, 'none'); assert.equal(h.calls, 0);
  assert.deepEqual(h.counts, { payloadReads: 0, serializations: 0, wholeSpecSerializations: 0 });
});
