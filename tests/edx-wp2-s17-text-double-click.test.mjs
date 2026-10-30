import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { mountedEditor, fixture } from '../tools/edx-wp1-s4-perf-mounted.mjs';
import { buildDeckEditorRuntimeScript } from '../runtime/deck-editor.js';
import { extractDeckSpec } from '../runtime/deck-spec.js';

const original = '  e\u0301\n😀 <b>原文</b> &  ';
const target = { slideId: 'portable', elementId: 'component-s17-text' };
const emit = (node, type, fields = {}) => {
  const event = { target: node, preventDefault() { this.defaultPrevented = true; }, ...fields };
  for (const listener of node.listeners[type] || []) listener(event);
  return event;
};
// mounted 替身只驗事件與狀態；真 pointer 與排版交由 browser cases。
const dblclick = (h, node = h.node, fields = {}) => emit(h.document.body, 'dblclick', {
  target: node, button: 0, detail: 2, shiftKey: false, ctrlKey: false, altKey: false,
  metaKey: false, isComposing: false, ...fields,
});
function setup() {
  const spec = fixture(0);
  spec.slides[0].content.components[1].dataUri = 'data:image/png;base64,AA==';
  spec.slides[0].content.components.push(
    { id: 's17-text', type: 'text', text: original },
    { id: 's17-other', type: 'text', text: '另一文字' },
  );
  spec.slides[0].composition.geometryOverrides['s17-text'] = { x: 160, y: 160, width: 480, height: 320 };
  spec.slides.push({ ...structuredClone(spec.slides[0]), id: 'other' });
  return attach(mountedEditor(spec));
}
function attach(h) {
  h.q = css => h.document.querySelector(css);
  h.root = h.q('.slide[data-slide-id="portable"]');
  h.node = h.root.querySelector('[data-pptskill-element-id="component-s17-text"]');
  h.other = h.root.querySelector('[data-pptskill-element-id="component-s17-other"]');
  h.dialog = h.q('[data-insert-text-dialog]');
  h.input = h.q('[data-insert-text-value]');
  h.button = h.q('[data-action="edit-selected-text"]');
  h.select = () => { h.api.layout.setMode(true); h.click(h.node); };
  h.submit = value => { if (value !== undefined) h.input.value = value; h.action('submit-insert-text'); };
  return h;
}
const assertClosed = h => { assert.equal(h.dialog.open, false); assert.notEqual(h.node.contentEditable, 'true'); };

test('S17 單擊只選取；雙擊預填同一 dialog，canonical／DOM／geometry 不變', () => {
  const h = setup(), before = h.getSpec(), style = h.node.getAttribute('style');
  h.api.layout.setMode(true); h.click(h.node);
  assertClosed(h); assert.deepEqual(Array.from(h.api.layout.getSelectionState().selected), [target.elementId]);
  h.click(h.node); const event = dblclick(h);
  assert.equal(h.dialog.open, true); assert.equal(event.defaultPrevented, true);
  assert.equal(h.input.value, original); assert.equal(h.document.activeElement, h.input);
  assert.equal(h.q('#pptskill-insert-text-label').textContent, '編輯文字（1–500 字元）');
  assert.equal(h.q('[data-action="submit-insert-text"]').textContent, '儲存');
  assert.equal(h.q('[data-insert-text-dialog]'), h.dialog);
  assert.equal(h.node.textContent, original); assert.equal(h.node.getAttribute('style'), style);
  assert.notEqual(h.node.contentEditable, 'true'); assert.deepEqual(h.getSpec(), before); assert.equal(h.getRevision(), 0);
});

test('S17 兩次 click 沿既有 selection 改選後，雙擊編輯新目標', () => {
  const h = setup(); h.select(); h.click(h.other); h.click(h.other); dblclick(h, h.other);
  assert.equal(h.dialog.open, true); assert.equal(h.input.value, '另一文字');
  const before = h.getSpec(); h.submit('新的另一文字');
  before.slides[0].content.components.find(c => c.id === 's17-other').text = '新的另一文字';
  assert.deepEqual(h.getSpec(), before); assert.equal(h.node.textContent, original); assert.equal(h.getRevision(), 1);
});

for (const kind of ['另一文字', '另一頁', 'image', 'quote', '空白', 'chrome', 'detached clone', '偽造節點']) {
  test('S17 選取舊文字時拒絕非目標：' + kind, () => {
    const h = setup(); h.select(); let node;
    if (kind === '另一文字') node = h.other;
    if (kind === '另一頁') node = h.q('.slide[data-slide-id="other"] [data-pptskill-element-id="component-s17-text"]');
    if (kind === 'image') node = h.q('[data-pptskill-element-id="component-perf-image"]');
    if (kind === 'quote') {
      h.window.__testMutateSpec(s => { s.slides[0].content.components[0].type = 'quote'; });
      node = h.component();
    }
    if (kind === '空白') node = h.root;
    if (kind === 'chrome') node = h.button;
    if (kind === 'detached clone') node = h.node.cloneNode(true);
    if (kind === '偽造節點') { node = h.document.createElement('span'); node.dataset.pptskillElementId = target.elementId; h.document.body.append(node); }
    const revision = h.getRevision(); dblclick(h, node);
    assertClosed(h); assert.equal(h.getRevision(), revision); assert.equal(h.node.textContent, original);
  });
}

for (const fields of [{ shiftKey: true }, { ctrlKey: true }, { altKey: true }, { metaKey: true }, { isComposing: true }, { defaultPrevented: true }, { button: 1 }, { button: 2 }]) {
  test('S17 拒絕修飾／非主要按鍵／已處理事件 ' + JSON.stringify(fields), () => {
    const h = setup(); h.select(); const before = h.getSpec(); dblclick(h, h.node, fields);
    assertClosed(h); assert.deepEqual(h.getSpec(), before); assert.equal(h.getRevision(), 0);
  });
}

for (const mode of ['play', 'edit', '空選', '多選']) test('S17 ' + mode + ' 不開 component dialog', () => {
  const h = setup();
  if (mode !== 'play') h.select();
  if (mode === 'edit') h.action('edit');
  if (mode === '空選') h.api.layout.clearSelection();
  if (mode === '多選') { h.click(h.other, { shiftKey: true }); assert.equal(h.api.layout.getSelectionState().selected.length, 2); }
  dblclick(h); assertClosed(h); assert.equal(h.getRevision(), 0);
});

for (const corrupt of ['duplicate-node', 'duplicate-root', 'detached', 'identity', 'kind', 'text', 'child', 'chrome-owner', 'canonical-type', 'canonical-duplicate']) {
  test('S17 拒絕不再唯一或不合 canonical 的 target：' + corrupt, () => {
    const h = setup(); h.select();
    if (corrupt === 'duplicate-node') h.root.append(h.node.cloneNode(true));
    if (corrupt === 'duplicate-root') h.root.parentNode.append(h.root.cloneNode(true));
    if (corrupt === 'detached') h.node.remove();
    if (corrupt === 'identity') h.node.dataset.editTarget = 'wrong';
    if (corrupt === 'kind') h.node.dataset.editKind = 'component';
    if (corrupt === 'text') h.node.textContent = 'DOM 偽造內容';
    if (corrupt === 'child') { const child = h.document.createElement('span'); h.node.append(child); }
    if (corrupt === 'chrome-owner') h.node.setAttribute('data-pptskill-editor-chrome', '');
    if (corrupt === 'canonical-type') h.window.__testMutateSpec(s => { s.slides[0].content.components.find(c => c.id === 's17-text').type = 'quote'; });
    if (corrupt === 'canonical-duplicate') h.window.__testMutateSpec(s => { s.slides[0].content.components.push({ ...s.slides[0].content.components.find(c => c.id === 's17-text') }); });
    dblclick(h); assertClosed(h); assert.equal(h.getRevision(), 0);
  });
}

for (const id of ['role-title', 'role-subtitle']) test('S17 保留 S1 ' + id + ' 雙擊 direct editing', () => {
  const h = setup(); h.select(); const role = h.root.querySelector('[data-pptskill-element-id="' + id + '"]');
  dblclick(h, role); assertClosed(h); assert.equal(role.contentEditable, 'true'); assert.equal(h.document.activeElement, role);
  assert.equal(h.api.layout.getState().enabled, false);
  role.textContent = '角色直接編輯'; emit(h.document.body, 'focusout', { target: role });
  assert.equal(h.getSpec().slides[0].content[id === 'role-title' ? 'title' : 'subtitle'], '角色直接編輯');
  assert.equal(h.node.textContent, original);
});

test('S17 重複 dblclick 不另開 dialog、不覆蓋 draft；insert pending 互斥', () => {
  const h = setup(); h.select(); const show = h.dialog.showModal; let opened = 0;
  h.dialog.showModal = function () { opened++; return show.call(this); };
  dblclick(h); assert.equal(h.dialog.open, true); h.input.value = '未存草稿'; dblclick(h);
  assert.equal(opened, 1); assert.equal(h.input.value, '未存草稿');
  h.action('cancel-insert-text'); h.action('insert-text'); h.input.value = '插入草稿'; dblclick(h);
  assert.equal(h.input.value, '插入草稿'); assert.equal(h.q('[data-action="submit-insert-text"]').textContent, '插入');
  assert.equal(h.getRevision(), 0);
});

test('S17 synthetic IME 阻擋 save／Escape／重入，compositionend 才能存', () => {
  const h = setup(); h.select(); dblclick(h); assert.equal(h.dialog.open, true);
  h.input.value = '組字'; emit(h.input, 'compositionstart'); dblclick(h); h.submit(); emit(h.dialog, 'cancel');
  assert.equal(h.dialog.open, true); assert.equal(h.input.value, '組字'); assert.equal(h.getRevision(), 0);
  emit(h.input, 'compositionend'); h.submit(); assertClosed(h); assert.equal(h.node.textContent, '組字'); assert.equal(h.getRevision(), 1);
});

test('S17 image picker 與 component dialog 雙向互斥', () => {
  const h = setup(); h.select(); const picker = h.q('#pptskill-insert-image-input'); let picks = 0; picker.click = () => picks++;
  h.action('insert-image'); dblclick(h); assertClosed(h); assert.equal(picks, 1);
  emit(picker, 'cancel'); h.select(); dblclick(h); assert.equal(h.dialog.open, true);
  h.action('insert-image'); assert.equal(picks, 1); assert.equal(h.input.value, original);
});

test('S17 async image busy 期間拒絕，settle 後可雙擊', async () => {
  const h = setup(); h.select(); const picker = h.q('#pptskill-insert-image-input'); picker.click = () => {};
  let release; h.assets.optimizeFile = () => new Promise(ok => { release = ok; });
  h.action('insert-image'); picker.files = [{ name: 'busy.png' }]; const change = picker.listeners.change[0]({ target: picker });
  dblclick(h); assertClosed(h);
  release({ dataUri: 'data:image/png;base64,AA==', warnings: [], optimized: false }); await change;
  h.select(); dblclick(h); assert.equal(h.dialog.open, true); assert.equal(h.input.value, original);
});

test('S17 showModal throw 回收 draft，下一次雙擊可重試', () => {
  const h = setup(); h.select(); const show = h.dialog.showModal;
  h.dialog.showModal = () => { throw Error('S17 showModal'); }; dblclick(h);
  assertClosed(h); assert.equal(h.input.value, ''); assert.match(h.q('[data-editor-status]').textContent, /S17 showModal/);
  h.dialog.showModal = show; dblclick(h); assert.equal(h.dialog.open, true); assert.equal(h.input.value, original); assert.equal(h.getRevision(), 0);
});

for (const snap of [false, true]) for (const gesture of [false, true]) test(`S17 snap=${snap} gesture=${gesture} 雙擊取消 preview，save 僅一次 edit-text`, () => {
  const h = setup(); h.select(); if (snap) h.action('snap-layout');
  const before = h.getSpec(), revision = h.getRevision(), style = h.node.getAttribute('style');
  if (gesture) { h.begin(); h.update(40, 0, 'drag', { left: 200, top: 160 }); assert.equal(h.api.layout.getState().gesturing, true); }
  dblclick(h); assert.equal(h.dialog.open, true); assert.equal(h.api.layout.getState().gesturing, false);
  assert.deepEqual(Array.from(h.api.layout.getSelectionState().selected), [target.elementId]);
  if (gesture) h.finish();
  assert.deepEqual(h.getSpec(), before); assert.equal(h.getRevision(), revision); assert.equal(h.node.getAttribute('style'), style);
  const value = '  <script>x</script>\n😀e\u0301 &  '; h.submit(value);
  before.slides[0].content.components.find(c => c.id === 's17-text').text = value;
  assert.deepEqual(h.getSpec(), before); assert.equal(h.getRevision(), revision + 1); assert.equal(h.node.textContent, value);
  assert.equal(h.node.children.length, 0); assert.equal(h.root, h.q('.slide[data-slide-id="portable"]')); assertClosed(h);
});

test('S17 save reentry 不重開 dialog 或二次提交', () => {
  const h = setup(); h.select(); dblclick(h); assert.equal(h.dialog.open, true);
  let proto = Object.getPrototypeOf(h.node), descriptor;
  while (!descriptor) { descriptor = Object.getOwnPropertyDescriptor(proto, 'textContent'); proto = Object.getPrototypeOf(proto); }
  let writes = 0;
  Object.defineProperty(h.node, 'textContent', { get() { return descriptor.get.call(this); }, set(value) { writes++; dblclick(h); h.submit(); descriptor.set.call(this, value); } });
  h.submit('只寫一次'); assert.equal(writes, 1); assert.equal(h.getRevision(), 1); assertClosed(h);
});

test('S17 same-value no-op 保留 selection／revision／DOM', () => {
  const h = setup(); h.select(); const before = h.getSpec(), selection = h.api.layout.getSelectionState();
  dblclick(h); assert.equal(h.dialog.open, true); h.submit();
  assertClosed(h); assert.deepEqual(h.getSpec(), before); assert.deepEqual(h.api.layout.getSelectionState(), selection); assert.equal(h.getRevision(), 0);
});

for (const invalid of ['', '😀'.repeat(501)]) test('S17 invalid draft 保留並可修正：' + (invalid ? '501 codepoints' : '空字串'), () => {
  const h = setup(); h.select(); dblclick(h); assert.equal(h.dialog.open, true); const before = h.getSpec();
  h.submit(invalid); assert.equal(h.dialog.open, true); assert.equal(h.input.value, invalid);
  assert.ok(h.q('[data-insert-text-status]').textContent); assert.deepEqual(h.getSpec(), before); assert.equal(h.getRevision(), 0);
  h.submit('修正'); assert.equal(h.node.textContent, '修正'); assert.equal(h.getRevision(), 1);
});

for (const method of ['button', 'Escape', 'native']) test('S17 cancel ' + method + ' 不提交，清 draft 並沿用 S16 focus', () => {
  const h = setup(); h.select(); const before = h.getSpec(), selection = h.api.layout.getSelectionState();
  dblclick(h); assert.equal(h.dialog.open, true); h.input.value = '取消草稿';
  if (method === 'button') h.action('cancel-insert-text');
  if (method === 'Escape') emit(h.dialog, 'cancel');
  if (method === 'native') h.dialog.close();
  assertClosed(h); assert.equal(h.input.value, ''); assert.deepEqual(h.getSpec(), before); assert.equal(h.getRevision(), 0);
  assert.deepEqual(h.api.layout.getSelectionState(), selection); assert.equal(h.document.activeElement, h.button);
});

test('S17 外部 text 更新使舊 draft 失效', () => {
  const h = setup(); h.select(); dblclick(h); assert.equal(h.dialog.open, true); h.input.value = '舊草稿';
  h.api.executeOperation({ operation: 'edit-text', target, value: '外部更新' }); const before = h.getSpec(), revision = h.getRevision();
  h.submit(); assertClosed(h); assert.deepEqual(h.getSpec(), before); assert.equal(h.getRevision(), revision); assert.equal(h.node.textContent, '外部更新');
});

test('S17 export draft 不提交；offline spec remount 可雙擊再編輯', () => {
  const h = setup(); h.select(); dblclick(h); assert.equal(h.dialog.open, true); h.input.value = 'NEVER_EXPORT_S17';
  const before = h.getSpec(), html = h.api.exportHtml();
  assert.deepEqual(extractDeckSpec(html), before); assert.ok(!html.includes('NEVER_EXPORT_S17')); assert.equal(h.dialog.open, true);
  const next = attach(mountedEditor(extractDeckSpec(html))); next.select(); dblclick(next);
  assert.equal(next.dialog.open, true); assert.equal(next.input.value, original); next.submit('離線再編輯');
  assert.equal(next.node.textContent, '離線再編輯'); assert.equal(next.getRevision(), 1);
  for (let i = 0; i < 3; i++) { next.api.layout.setMode(false); next.select(); }
  dblclick(next); assert.equal(next.dialog.open, true);
  assert.equal(next.document.body.listeners.dblclick.length, 1); assert.equal(next.document.querySelectorAll('[data-insert-text-dialog]').length, 1);
});

test('S17 同 document 重複 bootstrap 不建立第二個 listener／editor，仍可雙擊', () => {
  const h = setup(); h.select(); const api = h.window.PPTSKILLEditor, before = h.getSpec();
  const script = buildDeckEditorRuntimeScript().replace(/^<script[^>]*>/, '').replace(/<\/script>$/, '');
  for (let i = 0; i < 2; i++) vm.runInNewContext(script, {
    document: h.document, window: h.window, JSON, CSS: { escape: v => v }, console,
    MutationObserver: class { observe() {} disconnect() {} },
  });
  assert.equal(h.window.PPTSKILLEditor, api); assert.equal(h.document.body.listeners.dblclick.length, 1);
  assert.equal(h.document.querySelectorAll('[data-insert-text-dialog]').length, 1);
  dblclick(h); assert.equal(h.dialog.open, true); assert.equal(h.input.value, original); assert.deepEqual(h.getSpec(), before);
});
