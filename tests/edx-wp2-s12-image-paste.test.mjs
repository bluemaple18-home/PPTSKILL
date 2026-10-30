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
  // 本測試補足實際 chrome 父容器；不改共用 mounted helper。
  const toolbar = h.document.querySelector('[data-pptskill-editor]');
  for (const node of [...h.document.body.children]) if (node !== toolbar && (node.matches('button,span'))) toolbar.append(node);
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
async function event(h, type = 'paste', target = root(h), clipboardData = transfer(), fields = {}) {
  let prevented = false;
  await emit(h.document, type, { target, clipboardData, ...fields, preventDefault() { prevented = true; } });
  return { prevented, clipboardData };
}

test('S12 public paste：nested image 新 slot、同檔遞增、defaults、old roots、revision／selection', async () => {
  const h = setup(); h.ready(); const expected = h.getSpec();
  const nodes = h.document.querySelectorAll('.slide,.slide img');
  for (let n = 1; n <= 2; n++) {
    const e = await event(h, 'paste', root(h).querySelector('img'));
    assert.equal(e.prevented, true);
    expected.slides[0].content.components.push({ id: `inserted-image-${n}`, type: 'image', dataUri: png, alt: file.name, fit: 'contain' });
    expected.slides[0].composition.geometryOverrides[`inserted-image-${n}`] = geometry;
    assert.deepEqual(h.getSpec(), expected); assert.equal(h.getRevision(), n);
    assert.equal(h.api.layout.getSelectionState().selected.length, 0);
    assert.ok(nodes.every(n => n.isConnected));
  }
  assert.equal(h.calls, 2);
});

test('S12 cross-slide 無圖頁採事件 target，首個空缺 ID', async () => {
  const s = fixture(0); s.slides.push({ ...structuredClone(s.slides[0]), id: 'other' });
  s.slides[1].content.components = [{ id: 'inserted-image-2', type: 'text', text: '保留' }];
  const h = setup(s); h.ready(); const before = h.getSpec();
  await event(h, 'paste', root(h, 'other').children[0]);
  assert.deepEqual(h.getSpec().slides[0], before.slides[0]);
  assert.equal(h.getSpec().slides[1].content.components.at(-1).id, 'inserted-image-1');
  assert.equal(root(h, 'other').dataset.editorSelected, 'true');
});

for (const types of [['text/plain'], ['text/html'], ['text/uri-list']]) test(`S12 ${types[0]} 不攔截、不讀內容／URL fallback`, async () => {
  const h = setup(); h.ready(); const before = h.getSpec();
  for (const type of ['paste']) assert.equal((await event(h, type, root(h), transfer([], types))).prevented, false);
  assert.equal(h.calls, 0); assert.deepEqual(h.getSpec(), before);
});

test('S12 items.kind=file 可辨識；detached／無 transfer 不攔截', async () => {
  const h = setup(); h.ready();
  for (const type of ['paste']) {
    assert.equal((await event(h, type, h.document.createElement('div'))).prevented, false);
    assert.equal((await event(h, type, root(h), null)).prevented, false);
  }
  assert.equal((await event(h, 'paste', root(h), transfer([file], [], [{ kind: 'file' }]))).prevented, true);
  assert.equal(h.calls, 1);
});

for (const files of [[], [file, file]]) test(`S12 ${files.length} files 拒絕且 status 提示`, async () => {
  const h = setup(); h.ready(); const before = h.getSpec();
  await event(h, 'paste', root(h), transfer(files));
  assert.equal(h.calls, 0); assert.deepEqual(h.getSpec(), before); assert.match(h.status(), /單張|一張|一個/);
});

for (const chooser of ['insert', 'replace']) test(`S12 ${chooser} chooser 保留 pending/input 且 paste 不提交`, async () => {
  const h = setup(); h.api.layout.setMode(true);
  h.click(root(h).querySelector('img')); h.action(chooser === 'insert' ? 'insert-image' : 'replace-selected-image');
  const input = chooser === 'insert' ? h.input : h.replace; input.value = '保留選檔';
  const before = h.getSpec();
  assert.equal((await event(h)).prevented, true);
  assert.equal(input.value, '保留選檔'); assert.equal(h.calls, 0); assert.deepEqual(h.getSpec(), before);
  input.files = [file]; await emit(input, 'change'); assert.equal(h.calls, 1);
  assert.equal(h.getSpec().slides[0].content.components.at(-1).id, chooser === 'insert' ? 'inserted-image-1' : 'perf-image');
});

for (const snap of [false, true]) test(`S12 active gesture 取消不 commit，snap=${snap}`, async () => {
  const h = setup(); h.ready(); if (snap) h.action('snap-layout'); h.begin(); h.update(19, 12);
  const old = h.getSpec().slides[0].composition.geometryOverrides['portable-quote'];
  await event(h); assert.equal(h.api.layout.getState().gesturing, false);
  assert.deepEqual(h.getSpec().slides[0].composition.geometryOverrides['portable-quote'], old); assert.equal(h.getRevision(), 1);
});

test('S12 deferred：busy 互斥；mode/export/other edit 保留；finally 不清其後 S6 chooser', async () => {
  const h = setup(); h.ready(); let release;
  h.assets.optimizeFile = () => { h.calls++; return new Promise(ok => { release = ok; }); };
  const pending = event(h); assert.equal(h.calls, 1); assert.equal(h.button.disabled, true);
  await event(h); h.action('insert-image'); assert.equal(h.calls, 1); assert.equal(h.opens, 0);
  await emit(h.document, 'drop', { target: root(h), dataTransfer: transfer(), preventDefault() {} }); assert.equal(h.calls, 1);
  h.api.exportHtml(); h.click(root(h, 'other')); h.action('edit');
  h.api.executeOperation({ operation: 'edit-text', target: { slideId: 'other', elementId: 'role-title' }, value: '等待期間保留' });
  h.api.layout.setMode(true); h.click(root(h, 'other').querySelector('img')); h.action('replace-selected-image'); h.replace.value = '新 chooser';
  const other = h.getSpec().slides[1]; release(result()); await pending;
  assert.deepEqual(h.getSpec().slides[1], other); assert.equal(h.getSpec().slides[0].content.components.at(-1).id, 'inserted-image-1');
  assert.equal(h.replace.value, '新 chooser'); assert.equal(h.button.disabled, true);
  await emit(h.replace, 'cancel'); assert.equal(h.button.disabled, false);
});

for (const failure of ['removed', 'collision', 'reject', 'invalid']) test(`S12 async ${failure} 原子拒絕、零 partial／retry`, async () => {
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

test('S12 export canonical／remount 恢復 listener，無 transient 或重複插入', async () => {
  const h = setup(); h.ready(); await event(h); const html = h.api.exportHtml();
  assert.deepEqual(extractDeckSpec(html), h.getSpec());
  assert.doesNotMatch(html.split('<body')[1], /data-pptskill-insert-image-toolbar|pptskill-insert-image-input/);
  const reopened = setup(extractDeckSpec(html)); reopened.api.layout.setMode(true); await event(reopened);
  assert.equal(reopened.calls, 1); assert.equal(reopened.getRevision(), 1);
  assert.equal(reopened.getSpec().slides[0].content.components.at(-1).id, 'inserted-image-2');
  assert.equal(reopened.document.listeners.paste.length, 1);
});

for (const destination of ['body', 'document', 'deck', 'toolbar']) test(`S12 ${destination} 採 currentId`, async () => {
  const h = setup(); h.ready(); h.click(root(h, 'other'));
  const target = { body: h.document.body, document: h.document, deck: h.document.querySelector('.deck'), toolbar: h.button }[destination];
  assert.equal((await event(h, 'paste', target)).prevented, true);
  assert.equal(h.getSpec().slides[1].content.components.at(-1).id, 'inserted-image-1');
  assert.equal(h.getSpec().slides[0].content.components.some(c => c.id === 'inserted-image-1'), false);
});

for (const kind of ['play', 'edit', 'destroy', 'defaultPrevented', 'isComposing', 'composingText', 'external', 'detached', 'other-deck', 'duplicate-dom', 'duplicate-spec', 'missing-id', 'missing-spec', 'null']) test(`S12 ${kind} 不接管且不取消 gesture`, async () => {
  const h = setup(); h.ready(); let target = root(h), fields = {}, t = transfer();
  if (kind === 'play') h.api.layout.setMode(false);
  if (kind === 'edit') h.action('edit');
  if (kind === 'destroy') h.api.layout.destroy();
  if (kind === 'defaultPrevented' || kind === 'isComposing') fields[kind] = true;
  if (kind === 'composingText') { h.action('edit'); await emit(h.document.body, 'compositionstart', { target: root(h).querySelector('[data-pptskill-element-id="role-title"]') }); assert.throws(() => h.api.exportHtml(), /IME|組字/); }
  if (kind === 'external') { target = h.document.createElement('div'); h.document.body.append(target); }
  if (kind === 'detached') target.remove();
  if (kind === 'other-deck') { const deck = h.document.createElement('div'); deck.setAttribute('class', 'deck'); h.document.body.append(deck); target = target.cloneNode(); deck.append(target); }
  if (kind === 'duplicate-dom') h.document.querySelector('.deck').append(target.cloneNode());
  if (kind === 'duplicate-spec') h.window.__testMutateSpec(s => s.slides.push(structuredClone(s.slides[0])));
  if (kind === 'missing-id') target.removeAttribute('data-slide-id');
  if (kind === 'missing-spec') h.window.__testMutateSpec(s => s.slides.shift());
  if (kind === 'null') t = null;
  if (t) Object.defineProperty(t, 'files', { get() { throw Error('非法入口不得讀 FileList'); } });
  const before = h.getSpec(), revision = h.getRevision(), selection = h.api.layout.getSelectionState(), status = h.status();
  assert.equal((await event(h, 'paste', target, t, fields)).prevented, false);
  assert.equal(h.calls, 0); assert.deepEqual(h.getSpec(), before); assert.equal(h.getRevision(), revision);
  assert.deepEqual(h.api.layout.getSelectionState(), selection); assert.equal(h.status(), status);
});

for (const kind of ['input', 'textarea', 'select', 'textbox', 'editable', 'nestededitable', 'invalid-inherited', 'false', 'false-inside-true', 'true-inside-false']) for (const active of [false, true]) test(`S12 ownership ${kind} active=${active}`, async () => {
  const h = setup(); h.ready(); const n = h.document.createElement(['input', 'textarea', 'select'].includes(kind) ? kind : 'span'); root(h).append(n);
  if (kind === 'textbox') n.setAttribute('role', 'textbox');
  if (kind === 'editable') n.setAttribute('contenteditable', '');
  if (['nestededitable', 'invalid-inherited', 'false-inside-true'].includes(kind)) { root(h).setAttribute('contenteditable', 'true'); if (kind === 'invalid-inherited') n.setAttribute('contenteditable', 'inherit'); }
  if (kind.startsWith('false')) n.setAttribute('contenteditable', 'false');
  if (kind === 'true-inside-false') { root(h).setAttribute('contenteditable', 'false'); n.setAttribute('contenteditable', 'plaintext-only'); }
  if (active) h.document.activeElement = n;
  const accepted = kind.startsWith('false'), before = h.getSpec(), revision = h.getRevision(), status = h.status();
  assert.equal((await event(h, 'paste', active ? h.document.body : n)).prevented, accepted);
  assert.equal(h.calls, accepted ? 1 : 0);
  if (!accepted) { assert.deepEqual(h.getSpec(), before); assert.equal(h.getRevision(), revision); assert.equal(h.status(), status); }
});

test('S12 FileList 唯一來源、混合文字不讀、無 filename 空 alt', async () => {
  const h = setup(); h.ready();
  const t = transfer([file], ['Files', 'text/html', 'text/uri-list'], [{ kind: 'file', getAsFile() { throw Error('items 非 File authority'); } }]);
  await event(h, 'paste', root(h), t); assert.equal(h.calls, 1);
  const blank = {}; h.assets.optimizeFile = async f => { assert.equal(f, blank); return result(); };
  await event(h, 'paste', root(h), transfer([blank], [], [])); assert.equal(h.getSpec().slides[0].content.components.at(-1).alt, '');
});

test('S12 無 file 的 event 不改 revision、selection、status 或 active gesture', async () => {
  const h = setup(); h.ready(); h.begin(); h.update(19, 12);
  const before = h.getSpec(), state = h.api.layout.getSelectionState(), status = h.status();
  await event(h, 'paste', root(h), transfer([], ['text/html', 'text/uri-list']));
  assert.equal(h.api.layout.getState().gesturing, true); assert.deepEqual(h.getSpec(), before);
  assert.equal(h.getRevision(), 0); assert.deepEqual(h.api.layout.getSelectionState(), state); assert.equal(h.status(), status);
});

test('S12 既有 drop busy 拒絕 paste，不清 pending', async () => {
  const h = setup(); h.ready(); let release;
  h.assets.optimizeFile = () => { h.calls++; return new Promise(ok => { release = ok; }); };
  const pending = emit(h.document, 'drop', { target: root(h), dataTransfer: transfer(), preventDefault() {} });
  assert.equal((await event(h)).prevented, true); assert.equal(h.calls, 1);
  release(result()); await pending; assert.equal(h.getRevision(), 1);
});

for (const kind of ['external', 'duplicate', 'text', 'input', 'IME']) test(`S12 ${kind} 拒絕保留進行中 gesture`, async () => {
  const h = setup(); h.ready(); h.begin(); h.update(19, 12);
  let target = root(h), t = transfer(), fields = {};
  if (kind === 'external') { target = h.document.createElement('div'); h.document.body.append(target); }
  if (kind === 'duplicate') h.document.querySelector('.deck').append(target.cloneNode());
  if (kind === 'text') t = transfer([], ['text/html']);
  if (kind === 'input') { target = h.document.createElement('input'); root(h).append(target); }
  if (kind === 'IME') fields.isComposing = true;
  const before = h.getSpec(), selection = h.api.layout.getSelectionState();
  assert.equal((await event(h, 'paste', target, t, fields)).prevented, false);
  assert.equal(h.api.layout.getState().gesturing, true); assert.equal(h.calls, 0); assert.equal(h.getRevision(), 0);
  assert.deepEqual(h.getSpec(), before); assert.deepEqual(h.api.layout.getSelectionState(), selection);
});

for (const mode of ['edit', 'play']) test(`S12 async ${mode} 不取消、不改 captured slide`, async () => {
  const h = setup(); h.ready(); let release;
  h.assets.optimizeFile = () => { h.calls++; return new Promise(ok => { release = ok; }); };
  const pending = event(h); h.click(root(h, 'other'));
  if (mode === 'edit') h.action('edit'); else h.api.layout.setMode(false);
  const before = h.getSpec(); assert.deepEqual(extractDeckSpec(h.api.exportHtml()), before);
  release(result()); await pending;
  assert.equal(h.getSpec().slides[0].content.components.at(-1).id, 'inserted-image-1');
  assert.deepEqual(h.getSpec().slides[1], before.slides[1]); assert.equal(h.calls, 1); assert.equal(h.getRevision(), 1);
});
