import test from 'node:test';
import assert from 'node:assert/strict';
import { mountedEditor, fixture } from '../tools/edx-wp1-s4-perf-mounted.mjs';
import { buildDeckEditorMarkup } from '../runtime/deck-editor.js';
import { extractDeckSpec } from '../runtime/deck-spec.js';
const original = '  e\u0301\n😀 <b>原文</b> &  ';
const target = { slideId: 'portable', elementId: 'component-s16-text' };
const emit = (n, type, fields = {}) => { const e = { target: n, preventDefault() { this.defaultPrevented = true; }, ...fields }; for (const fn of n.listeners[type] || []) fn(e); return e; };
function setup() {
  const s = fixture(0); s.slides[0].content.components[1].dataUri = 'data:image/png;base64,AA=='; s.slides[0].content.components.push({ id: 's16-text', type: 'text', text: original });
  s.slides[0].composition.geometryOverrides['s16-text'] = { x: 160, y: 160, width: 480, height: 320 };
  s.slides.push({ ...structuredClone(s.slides[0]), id: 'other' });
  const h = mountedEditor(s), q = css => h.document.querySelector(css);
  Object.assign(h, { q, dialog: q('[data-insert-text-dialog]'), input: q('[data-insert-text-value]'), status: q('[data-insert-text-status]'), button: q('[data-action="edit-selected-text"]'), node: q('[data-pptskill-element-id="component-s16-text"]'), root: q('.slide[data-slide-id="portable"]') });
  h.select = () => { h.api.layout.setMode(true); h.click(h.node); };
  h.open = () => h.action('edit-selected-text');
  h.submit = value => { if (value !== undefined) h.input.value = value; h.action('submit-insert-text'); };
  return h;
}
test('S16 markup 單一 shared dialog 與 context action', () => { const html = buildDeckEditorMarkup(); assert.match(html, /data-action="edit-selected-text"/); assert.equal((html.match(/data-insert-text-dialog/g) || []).length, 1); });
test('S16 僅 layout 單選 text 可開啟，排除 role／quote／image／多選／空選／edit', () => {
  const h = setup(); assert.ok(h.button); assert.equal(h.button.hidden, true); h.open(); assert.equal(h.dialog.open, false);
  h.api.layout.setMode(true);
  // quote 非 schema 支援型別，以 synthetic 外部變更驗證 UI 不誤開。
  h.window.__testMutateSpec(s => { s.slides[0].content.components[0].type = 'quote'; });
  for (const id of ['role-title', 'role-subtitle', 'component-portable-quote', 'component-perf-image']) { h.click(h.q('[data-pptskill-element-id="' + id + '"]')); assert.equal(h.button.hidden, true); h.open(); assert.equal(h.dialog.open, false); }
  h.select(); assert.equal(h.button.hidden, false); assert.equal(h.button.disabled, false);
  h.click(h.q('[data-pptskill-element-id="component-portable-quote"]'), { shiftKey: true }); assert.equal(h.button.hidden, true);
  h.api.layout.clearSelection(); assert.equal(h.button.hidden, true); h.select(); h.action('edit'); h.open(); assert.equal(h.dialog.open, false);
});
test('S16 預填精確原文／draft 無寫入／save 只改 text 與一次 revision／root node 保留', () => {
  const h = setup(); h.select(); const before = h.getSpec(), revision = h.getRevision(); h.open(); assert.equal(h.dialog.open, true); assert.equal(h.input.value, original); assert.equal(h.q('#pptskill-insert-text-label').textContent, '編輯文字（1–500 字元）'); assert.equal(h.q('[data-action="submit-insert-text"]').textContent, '儲存');
  h.input.value = '  <script>x</script>\n😀e\u0301  '; assert.deepEqual(h.getSpec(), before); assert.equal(h.node.textContent, original); assert.notEqual(h.node.contentEditable, 'true');
  before.slides[0].content.components.at(-1).text = h.input.value; h.submit(); assert.deepEqual(h.getSpec(), before); assert.equal(h.getRevision(), revision + 1); assert.equal(h.q('.slide[data-slide-id="portable"]'), h.root); assert.equal(h.q('[data-pptskill-element-id="component-s16-text"]'), h.node); assert.equal(h.dialog.open, false); assert.equal(h.input.value, ''); assert.equal(h.api.layout.getSelectionState().selected.length, 0);
});
test('S16 same-value no-op 保留 revision DOM selection', () => { const h = setup(); h.select(); const before = h.getSpec(), state = h.api.layout.getSelectionState(), rev = h.getRevision(); h.open(); h.submit(); assert.deepEqual(h.getSpec(), before); assert.deepEqual(h.api.layout.getSelectionState(), state); assert.equal(h.getRevision(), rev); assert.equal(h.node.textContent, original); });
for (const invalid of ['', '字'.repeat(501), '😀'.repeat(501)]) test('S16 invalid ' + (invalid ? [...invalid].length + invalid[0] : 'empty') + ' 保留 draft 可 retry', () => { const h = setup(); h.select(); h.open(); const before = h.getSpec(); h.submit(invalid); assert.equal(h.dialog.open, true); assert.equal(h.input.value, invalid); assert.ok(h.status.textContent); assert.deepEqual(h.getSpec(), before); assert.equal(h.getRevision(), 0); h.submit('修正'); assert.equal(h.getRevision(), 1); assert.equal(h.node.textContent, '修正'); });
test('S16 500 emoji codepoints 不以 UTF16 截短', () => { const h = setup(); h.select(); h.open(); h.submit('😀'.repeat(500)); assert.equal(h.node.textContent, '😀'.repeat(500)); assert.equal(h.getRevision(), 1); });
for (const method of ['button', 'escape', 'native']) test('S16 cancel ' + method + ' 清 draft 保留 selection focus', () => { const h = setup(); h.select(); const state = h.api.layout.getSelectionState(); h.open(); h.input.value = '取消'; if (method === 'button') h.action('cancel-insert-text'); else if (method === 'escape') emit(h.dialog, 'cancel'); else h.dialog.close(); assert.equal(h.dialog.open, false); assert.equal(h.input.value, ''); assert.equal(h.node.textContent, original); assert.equal(h.getRevision(), 0); assert.deepEqual(h.api.layout.getSelectionState(), state); assert.equal(h.document.activeElement, h.button); });
for (const stale of ['text', 'node', 'root', 'removed', 'duplicate-node', 'duplicate-root', 'identity', 'selection', 'mode', 'slide']) test('S16 stale ' + stale + ' 不寫舊 draft', () => {
  const h = setup(); h.select(); h.open(); h.input.value = 'STALE';
  if (stale === 'text') h.api.executeOperation({ operation: 'edit-text', target, value: '外部更新' });
  if (stale === 'node') { h.root.append(h.node.cloneNode(true)); h.node.remove(); }
  if (stale === 'root') { h.root.parentNode.append(h.root.cloneNode(true)); h.root.remove(); }
  if (stale === 'removed') h.node.remove();
  if (stale === 'duplicate-node') h.root.append(h.node.cloneNode(true));
  if (stale === 'duplicate-root') h.root.parentNode.append(h.root.cloneNode(true));
  if (stale === 'identity') h.node.dataset.editTarget = 'wrong';
  if (stale === 'selection') h.api.layout.clearSelection();
  if (stale === 'mode') h.api.layout.setMode(false);
  if (stale === 'slide') h.click(h.q('.slide[data-slide-id="other"]'));
  const before = h.getSpec(), rev = h.getRevision(); h.submit(); assert.deepEqual(h.getSpec(), before); assert.equal(h.getRevision(), rev); assert.equal(h.dialog.open, false); assert.equal(h.input.value, ''); assert.match(h.q('[data-editor-status]').textContent, /失效/);
});
test('S16 geometry 更新不失效且 save 不覆蓋', () => { const h = setup(); h.select(); h.open(); h.api.executeOperation({ operation: 'move-element', target, value: { x: 240, y: 240 } }); const before = h.getSpec(); h.submit('新文'); before.slides[0].content.components.at(-1).text = '新文'; assert.deepEqual(h.getSpec(), before); });
test('S16 synthetic IME submit／Escape guard 與 Enter 不提交', () => { const h = setup(); h.select(); h.open(); emit(h.input, 'compositionstart'); h.submit('組字'); emit(h.dialog, 'cancel'); emit(h.input, 'keydown', { key: 'Enter' }); assert.equal(h.dialog.open, true); assert.equal(h.getRevision(), 0); emit(h.input, 'compositionend'); emit(h.input, 'keydown', { key: 'Enter' }); assert.equal(h.getRevision(), 0); h.submit(); assert.equal(h.node.textContent, '組字'); });
test('S16 showModal throw 回收並可 retry', () => { const h = setup(); h.select(); const show = h.dialog.showModal; h.dialog.showModal = () => { throw Error('S16 showModal'); }; h.open(); assert.equal(h.dialog.open, false); assert.equal(h.input.value, ''); h.dialog.showModal = show; h.open(); assert.equal(h.dialog.open, true); });
test('S16 insert→edit→insert mode 復原及重入拒絕', () => { const h = setup(); h.select(); h.action('insert-text'); assert.equal(h.input.value, ''); h.open(); assert.equal(h.input.value, ''); h.action('cancel-insert-text'); h.open(); assert.equal(h.input.value, original); h.action('insert-text'); assert.equal(h.input.value, original); h.action('cancel-insert-text'); h.action('insert-text'); assert.equal(h.input.value, ''); assert.equal(h.q('#pptskill-insert-text-label').textContent, '插入文字（1–500 字元）'); assert.equal(h.q('[data-action="submit-insert-text"]').textContent, '插入'); h.submit('插入'); assert.equal(h.getSpec().slides[0].content.components.at(-1).id, 'inserted-text-1'); });
test('S16 同步 reentrant projection 只提交一次', () => { const h = setup(); h.select(); h.open(); let proto = Object.getPrototypeOf(h.node), d; while (!d) { d = Object.getOwnPropertyDescriptor(proto, 'textContent'); proto = Object.getPrototypeOf(proto); } let writes = 0; Object.defineProperty(h.node, 'textContent', { get() { return d.get.call(this); }, set(v) { writes++; h.submit(); d.set.call(this, v); } }); h.submit('只一次'); assert.equal(writes, 1); assert.equal(h.getRevision(), 1); });
test('S16 chooser 互斥與 pointerdown 取消 gesture', () => { const h = setup(); h.select(); const image = h.q('#pptskill-insert-image-input'); let picks = 0; image.click = () => picks++; h.action('insert-image'); h.open(); assert.equal(h.dialog.open, false); emit(image, 'cancel'); h.select(); h.open(); h.action('insert-image'); assert.equal(picks, 1); h.action('cancel-insert-text'); h.begin(); h.update(40, 0); const before = h.getSpec(); emit(h.button, 'pointerdown'); assert.equal(h.api.layout.getState().gesturing, false); h.open(); assert.deepEqual(h.getSpec(), before); });
test('S16 export draft 不提交／offline UI edit／remount 不重複', () => { const h = setup(); h.select(); h.open(); h.input.value = 'NEVER_EXPORT_S16'; const before = h.getSpec(), html = h.api.exportHtml(); assert.deepEqual(extractDeckSpec(html), before); assert.ok(!html.includes('NEVER_EXPORT_S16')); assert.doesNotMatch(html, /<dialog[^>]*data-insert-text-dialog/); assert.equal(h.dialog.open, true); const next = mountedEditor(extractDeckSpec(html)); next.api.layout.setMode(true); next.click(next.document.querySelector('[data-pptskill-element-id="component-s16-text"]')); next.action('edit-selected-text'); assert.equal(next.document.querySelector('[data-insert-text-value]').value, original); next.document.querySelector('[data-insert-text-value]').value = '離線'; next.action('submit-insert-text'); assert.equal(next.getSpec().slides[0].content.components.at(-1).text, '離線'); next.api.layout.setMode(false); next.api.layout.setMode(true); assert.equal(next.document.querySelectorAll('[data-insert-text-dialog]').length, 1); assert.equal(next.document.querySelectorAll('[data-action="edit-selected-text"]').length, 1); });
for (const snap of [false, true]) for (const gesture of [false, true]) test(`S16 snap=${snap} gesture=${gesture} 開啟保留編輯identity且release不commit`, () => {
  const h = setup(); h.select(); if (snap) h.action('snap-layout');
  const before = h.getSpec(), rev = h.getRevision();
  if (gesture) { h.begin(); h.update(40, 0, 'drag', { left: 200, top: 160 }); assert.equal(h.api.layout.getState().gesturing, true); }
  emit(h.button, 'pointerdown'); h.open();
  assert.equal(h.dialog.open, true); assert.deepEqual(Array.from(h.api.layout.getSelectionState().selected), [target.elementId]);
  assert.equal(h.api.layout.getState().gesturing, false); if (gesture) h.finish();
  assert.deepEqual(h.getSpec(), before); assert.equal(h.getRevision(), rev);
  h.submit('snap安全編輯'); before.slides[0].content.components.at(-1).text = 'snap安全編輯';
  assert.deepEqual(h.getSpec(), before); assert.equal(h.getRevision(), rev + 1);
});
