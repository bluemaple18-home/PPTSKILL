import test from 'node:test';
import assert from 'node:assert/strict';
import { mountedEditor, fixture } from '../tools/edx-wp1-s4-perf-mounted.mjs';
import { buildDeckEditorMarkup, buildDeckEditorRuntimeScript } from '../runtime/deck-editor.js';
import { extractDeckSpec } from '../runtime/deck-spec.js';
const box = { x: 560, y: 288, width: 480, height: 320 };
const text = '  e\u0301\n😀 <script>文字</script><img src=x> &  ';
const emit = (node, type, fields = {}) => { const e = { target: node, preventDefault() { this.defaultPrevented = true; }, stopImmediatePropagation() {}, ...fields }; for (const fn of node.listeners[type] || []) fn(e); return e; };
const root = h => h.document.querySelector('.slide[data-slide-id="portable"]');
function setup(empty = false) {
  const s = fixture(0); s.slides[0].content.components[1].dataUri = 'data:image/png;base64,AA==';
  if (empty) { s.slides[0].content.components = []; s.slides[0].composition = { primitive: 'title-points', variant: 'default', slots: { title: 'content.title', subtitle: 'content.subtitle', points: 'content.keyPoints' } }; }
  s.slides.push({ ...structuredClone(s.slides[0]), id: 'other' });
  const h = mountedEditor(s), q = css => h.document.querySelector(css);
  h.button = q('[data-action="insert-text"]'); h.dialog = q('[data-insert-text-dialog]'); h.input = q('[data-insert-text-value]'); h.status = q('[data-insert-text-status]');
  h.open = () => h.action('insert-text'); h.submit = value => { if (value !== undefined) h.input.value = value; h.action('submit-insert-text'); };
  return h;
}
test('S15 markup／bootstrap 有 label、focusable status、無 UTF16 maxlength', () => {
  const markup = buildDeckEditorMarkup(); assert.match(markup, /data-insert-text-dialog/); assert.match(markup, /for="pptskill-insert-text-value"/); assert.match(markup, /data-insert-text-status[^>]*tabindex="-1"/); assert.doesNotMatch(markup, /maxlength=/); assert.match(buildDeckEditorRuntimeScript(), /data-insert-text-dialog/);
});
for (const empty of [false, true]) test(`S15 mounted 精確文字／empty=${empty}／固定 geometry／一次 revision／舊 root 保留`, () => {
  const h = setup(empty); assert.ok(h.button); assert.equal(h.button.hidden, true); h.open(); assert.equal(h.dialog.open, false);
  h.api.layout.setMode(true); assert.equal(h.button.disabled, false); const before = h.getSpec(), oldRoot = root(h), children = [...oldRoot.children];
  h.open(); assert.equal(h.dialog.open, true); assert.deepEqual(h.getSpec(), before); h.submit(text);
  before.slides[0].content.components.push({ id: 'inserted-text-1', type: 'text', text }); before.slides[0].composition.geometryOverrides = { ...before.slides[0].composition.geometryOverrides, 'inserted-text-1': box };
  assert.deepEqual(h.getSpec(), before); assert.equal(h.getRevision(), 1); assert.equal(root(h), oldRoot); for (const child of children) assert.ok(oldRoot.children.includes(child));
  const n = h.document.querySelector('[data-pptskill-element-id="component-inserted-text-1"]'); assert.equal(n.textContent, text); assert.equal(n.contentEditable, 'false'); assert.equal(n.children.length, 0); assert.equal(h.dialog.open, false); assert.equal(h.input.value, '');
  h.open(); h.submit('第二次'); assert.equal(h.getSpec().slides[0].content.components.at(-1).id, 'inserted-text-2');
  h.action('edit'); assert.equal(h.button.hidden, true); h.open(); assert.equal(h.dialog.open, false);
});
for (const end of ['cancel', 'escape', 'close']) test(`S15 ${end} 為 no-op、清 draft、focus 與重開`, () => {
  const h = setup(); h.ready(); const before = h.getSpec(), selection = JSON.stringify(h.api.layout.getSelectionState()); h.open(); h.input.value = text;
  if (end === 'cancel') h.action('cancel-insert-text'); if (end === 'escape') emit(h.dialog, 'cancel'); if (end === 'close') h.dialog.close();
  assert.equal(h.dialog.open, false); assert.equal(h.input.value, ''); assert.deepEqual(h.getSpec(), before); assert.equal(h.getRevision(), 0); assert.equal(JSON.stringify(h.api.layout.getSelectionState()), selection);
  h.open(); assert.equal(h.dialog.open, true); h.submit(' '); assert.equal(h.getRevision(), 1);
});
test('S15 invalid 保留 draft/status/focus；500 emoji 與空白可修正再提交', () => {
  const h = setup(); h.ready(); const before = h.getSpec(), selection = JSON.stringify(h.api.layout.getSelectionState()); h.open();
  for (const value of ['', '😀'.repeat(501)]) { h.submit(value); assert.equal(h.dialog.open, true); assert.equal(h.input.value, value); assert.ok(h.status.textContent); assert.equal(h.document.activeElement, h.status); assert.deepEqual(h.getSpec(), before); assert.equal(h.getRevision(), 0); assert.equal(JSON.stringify(h.api.layout.getSelectionState()), selection); }
  h.submit('😀'.repeat(500)); assert.equal(h.getSpec().slides[0].content.components.at(-1).text, '😀'.repeat(500)); assert.equal(h.getRevision(), 1);
});
test('S15 synthetic composition 不搶 submit/Escape，Enter 不提交，focusout 不提交', () => {
  const h = setup(); h.ready(); h.open(); h.input.value = '組字'; emit(h.input, 'compositionstart'); const keydown = emit(h.dialog, 'keydown', { target: h.input, key: 'Escape', isComposing: true, defaultPrevented: false }); assert.equal(keydown.defaultPrevented, false, 'IME keydown 預設處理不得被攔截'); h.submit(); const e = emit(h.dialog, 'cancel'); assert.equal(e.defaultPrevented, true); assert.equal(h.dialog.open, true); assert.equal(h.getRevision(), 0);
  emit(h.input, 'keydown', { key: 'Enter' }); emit(h.input, 'focusout'); assert.equal(h.getRevision(), 0); emit(h.input, 'compositionend'); h.submit(); assert.equal(h.getRevision(), 1);
});
for (const stale of ['page', 'focusin', 'mode', 'selection', 'clear', 'destroy', 'removed', 'rebuilt', 'duplicate-root', 'duplicate-slide']) test(`S15 target invalidation ${stale} 不插入錯頁`, () => {
  const h = setup(); h.ready(); h.open(); h.input.value = text;
  if (stale === 'page') h.click(h.document.querySelector('.slide[data-slide-id="other"]'));
  if (stale === 'focusin') emit(h.document.querySelector('.slide[data-slide-id="other"]'), 'focusin');
  if (stale === 'mode') h.action('edit'); if (stale === 'selection') h.click(h.component()); if (stale === 'clear') h.api.layout.clearSelection(); if (stale === 'destroy') h.api.layout.destroy();
  if (stale === 'removed') root(h).remove(); if (stale === 'rebuilt') { const r = root(h); r.replaceWith(r.cloneNode(true)); }
  if (stale === 'duplicate-root') root(h).parentElement.append(root(h).cloneNode(true)); if (stale === 'duplicate-slide') h.window.__testMutateSpec(s => s.slides.push(structuredClone(s.slides[0])));
  const before = h.getSpec(); h.submit(); assert.deepEqual(h.getSpec(), before); assert.equal(h.getRevision(), 0); assert.equal(h.dialog.open, false);
  if (['removed', 'rebuilt', 'duplicate-root', 'duplicate-slide'].includes(stale)) assert.match(h.document.querySelector('[data-editor-status]').textContent, /失效|唯一/);
});
test('S15 submit 時讀 canonical 第一個空缺，跨 type namespace，無 draft 整份序列化', () => {
  const h = setup(); h.ready(); h.resetCounts(); h.open(); emit(h.input, 'input'); assert.equal(h.counts.wholeSpecSerializations, 0);
  h.api.executeOperation({ operation: 'insert-element', target: { slideId: 'portable' }, value: { component: { id: 'inserted-text-1', type: 'text', text: '占用' }, geometry: box } });
  // API 的成功會 clear selection；重新開啟後，hole 2 仍由 canonical 決定。
  h.window.__testMutateSpec(s => { s.slides[0].content.components[1].id = 'inserted-text-3'; }); h.open(); h.submit('hole'); assert.equal(h.getSpec().slides[0].content.components.at(-1).id, 'inserted-text-2');
});
test('S15 showModal throw 回收、reentrant submit 只一次、gesture cancel 不 commit', () => {
  const h = setup(); h.ready(); h.begin(); h.update(19, 12); const before = h.getSpec(); const show = h.dialog.showModal;
  h.dialog.showModal = () => { throw Error('showModal fixture'); }; h.open(); assert.deepEqual(h.getSpec(), before); assert.equal(h.api.layout.getState().gesturing, false); assert.equal(h.button.disabled, false);
  h.dialog.showModal = show; h.open(); const r = root(h), append = r.append; r.append = function(n) { h.submit(); return append.call(this, n); }; h.submit(text); h.submit(text); assert.equal(h.getRevision(), 1); assert.equal(h.dialog.open, false);
});
test('S15 chooser 互斥、busy 與 dialog 期間 image controls 禁用', () => {
  const h = setup(); h.ready(); let picks = 0; const image = h.document.querySelector('#pptskill-insert-image-input'); image.click = () => picks++;
  h.action('insert-image'); h.open(); assert.equal(h.dialog.open, false); emit(image, 'cancel'); h.open(); assert.equal(h.dialog.open, true); h.action('insert-image'); assert.equal(picks, 1);
  h.action('cancel-insert-text'); h.click(h.document.querySelector('[data-pptskill-element-id="component-perf-image"]')); const replace = h.document.querySelector('#pptskill-selected-image-input'); replace.click = () => picks++; h.action('replace-selected-image'); h.open(); assert.equal(h.dialog.open, false); emit(replace, 'cancel'); h.open(); assert.equal(h.dialog.open, true); h.action('replace-selected-image'); assert.equal(picks, 2);
});
test('S15 export 不提交 draft、無 dialog/transient；offline mounted bootstrap 可再插／S14 edit', () => {
  const h = setup(); h.ready(); h.open(); h.submit(text); h.open(); h.input.value = 'NEVER_EXPORT_S15_DRAFT'; const before = h.getSpec(), revision = h.getRevision(), html = h.api.exportHtml();
  assert.deepEqual(extractDeckSpec(html), before); assert.equal(h.getRevision(), revision); assert.equal(h.dialog.open, true); assert.ok(!html.includes('NEVER_EXPORT_S15_DRAFT')); assert.doesNotMatch(html, /<dialog[^>]*data-insert-text-dialog/); assert.doesNotMatch(html, /contenteditable=/);
  const reopened = mountedEditor(extractDeckSpec(html)); reopened.api.layout.setMode(true); reopened.action('insert-text'); reopened.document.querySelector('[data-insert-text-value]').value = '重開'; reopened.action('submit-insert-text'); assert.equal(reopened.getSpec().slides[0].content.components.at(-1).id, 'inserted-text-2');
  reopened.api.executeOperation({ operation: 'edit-text', target: { slideId: 'portable', elementId: 'component-inserted-text-2' }, value: '再編輯' }); assert.equal(reopened.getSpec().slides[0].content.components.at(-1).text, '再編輯');
  assert.equal(reopened.document.querySelectorAll('[data-insert-text-dialog]').length, 1); reopened.api.layout.setMode(false); reopened.api.layout.setMode(true); assert.equal(reopened.document.querySelectorAll('[data-insert-text-dialog]').length, 1);
});

test('S15 invalid slide／detached root 不開啟，dialog native focus 不切 slide', () => {
  const h = setup(); h.ready(); h.open(); emit(h.document.body, 'focusin', { target: h.input }); h.submit('保留頁'); assert.equal(h.getSpec().slides[0].content.components.at(-1).text, '保留頁');
  root(h).remove(); h.open(); assert.equal(h.dialog.open, false); assert.equal(h.getRevision(), 1);
});
test('S15 synthetic pointerdown 的 mounted event 路由在 click 前取消 preview', () => {
  const h = setup(); h.ready(); h.begin(); h.update(20, 12); const before = h.getSpec(); emit(h.button, 'pointerdown', { isTrusted: true, button: 0 }); assert.equal(h.api.layout.getState().gesturing, false); assert.deepEqual(h.getSpec(), before); h.open(); h.action('cancel-insert-text'); assert.deepEqual(h.getSpec(), before); assert.equal(h.getRevision(), 0);
});
test('S15 detached append 失敗保留 draft 與 canonical，可更正後再送', () => {
  const h = setup(); h.ready(); const before = h.getSpec(); h.open(); const r = root(h), append = r.append; r.append = function(n) { append.call(this, n); throw Error('append fixture'); }; h.submit(text); assert.deepEqual(h.getSpec(), before); assert.equal(h.getRevision(), 0); assert.equal(h.input.value, text); assert.equal(h.dialog.open, true); assert.equal(r.querySelector('[data-pptskill-element-id="component-inserted-text-1"]'), null); r.append = append; h.submit(); assert.equal(h.getRevision(), 1);
});
test('S15 未完成 image optimize 的 insertionBusy 阻止 text open', async () => {
  const h = setup(); h.ready(); const image = h.document.querySelector('#pptskill-insert-image-input'); image.click = () => {}; let release; h.assets.optimizeFile = () => new Promise(ok => { release = ok; }); h.action('insert-image'); image.files = [{ name: 'busy.png' }]; const change = image.listeners.change[0]({ target: image }); h.open(); assert.equal(h.dialog.open, false); release({ dataUri: 'data:image/png;base64,AA==', warnings: [], optimized: false }); await change; h.open(); assert.equal(h.dialog.open, true);
});
