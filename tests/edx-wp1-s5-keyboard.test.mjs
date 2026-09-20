import test from 'node:test';
import assert from 'node:assert/strict';
import { createComponentInteraction } from '../runtime/component-interaction.js';
import { createDeckEditor } from '../runtime/deck-editor.js';
import { extractDeckSpec } from '../runtime/deck-spec.js';
import { mountedEditor, fixture, target, box, geometry, request } from '../tools/edx-wp1-s4-perf-mounted.mjs';

const emit = (h, type, fields = {}) => {
  const event = { target: h.document.body, key: 'ArrowRight', prevented: false, stopped: false,
    preventDefault() { this.prevented = true; }, stopImmediatePropagation() { this.stopped = true; }, ...fields };
  for (const fn of h.document.listeners[type] || []) { fn(event); if (event.stopped) break; }
  return event;
};
const key = (h, fields) => emit(h, 'keydown', fields);
function publicHarness() {
  const editor = createDeckEditor(fixture(0)), calls = [], notices = [];
  let token = {}, alive = true;
  const adapter = createComponentInteraction({
    readTarget: () => alive ? { token, revision: JSON.stringify(editor.getSpec()), rect: geometry(editor.getSpec()) } : null,
    executeOperation: r => { calls.push(r); return editor.executeOperation(r); }, preview() {}, restore() {}, notify: s => notices.push(s),
  });
  adapter.setMode(true); adapter.select(target);
  return { adapter, editor, calls, notices, replace() { token = {}; }, remove() { alive = false; } };
}
test('S5 public 方向／Shift／repeat 每步最多一筆 move-element，僅改 x/y', () => {
  const h = publicHarness(), original = h.editor.getSpec();
  let x = box.x, y = box.y;
  for (const [name, shift, dx, dy] of [['ArrowRight', false, 1, 0], ['ArrowDown', true, 0, 10], ['ArrowLeft', true, -10, 0], ['ArrowUp', false, 0, -1], ['ArrowRight', false, 1, 0]]) {
    assert.equal(h.adapter.nudge(name, shift), true); x += dx; y += dy;
    assert.deepEqual(h.calls.at(-1), request('move-element', { x, y }));
    assert.deepEqual(geometry(h.editor.getSpec()), { ...box, x, y });
  }
  const expected = structuredClone(original); expected.slides[0].composition.geometryOverrides['portable-quote'] = { ...box, x, y };
  assert.deepEqual(h.editor.getSpec(), expected); assert.equal(h.calls.length, 5);
});
test('S5 public stale identity、刪除、gesture 互斥；拒絕不 clamp', () => {
  for (const mutation of ['replace', 'remove']) {
    const h = publicHarness(); h[mutation](); assert.equal(h.adapter.nudge('ArrowRight'), false); assert.equal(h.calls.length, 0);
  }
  const h = publicHarness(); h.adapter.begin('drag', { x: 0, y: 0 }, 1); h.adapter.update({ x: 20, y: 10 });
  assert.equal(h.adapter.nudge('ArrowRight'), true); assert.equal(h.calls.length, 0); assert.equal(h.adapter.getState().gesturing, true);
  h.adapter.finish(); assert.deepEqual(geometry(h.editor.getSpec()), { ...box, x: 820, y: 290 }); assert.equal(h.calls.length, 1);
  h.editor.executeOperation(request('move-element', { x: 80, y: 80 })); const before = h.editor.getSpec();
  assert.equal(h.adapter.nudge('ArrowLeft'), true); assert.deepEqual(h.editor.getSpec(), before); assert.equal(h.calls.length, 2); assert.match(h.notices.at(-1), /未套用/);
});
test('S5 mounted 真 runtime capture 處理方向／Shift／repeat、export/reopen 無 editor 洩漏', () => {
  const h = mountedEditor(fixture(0)); h.ready(); let bubbles = 0;
  h.document.addEventListener('keydown', () => bubbles++);
  for (const fields of [{}, { key: 'ArrowDown', shiftKey: true }, { repeat: true }]) {
    const e = key(h, fields); assert.equal(e.prevented, true); assert.equal(e.stopped, true);
  }
  assert.equal(bubbles, 0); assert.deepEqual(geometry(h.getSpec()), { ...box, x: 802, y: 290 });
  const exported = h.api.exportHtml(); assert.deepEqual(extractDeckSpec(exported), h.getSpec());
  assert.doesNotMatch(exported, /data-editor-selected|tabindex=/);
  const reopened = mountedEditor(extractDeckSpec(exported)); reopened.ready(); key(reopened, { key: 'ArrowUp' });
  assert.deepEqual(geometry(reopened.getSpec()), { ...box, x: 802, y: 289 });
});
test('S5 mounted guardmatrix 未處理不得攔截或寫 spec；composition 狀態清理', () => {
  const h = mountedEditor(fixture(0)); h.ready(); const before = h.getSpec();
  const untouched = fields => { const e = key(h, fields); assert.equal(e.prevented, false); assert.equal(e.stopped, false); assert.deepEqual(h.getSpec(), before); };
  for (const fields of [{ ctrlKey: true }, { metaKey: true }, { altKey: true }, { isComposing: true }, { keyCode: 229 }, { key: 'a' }]) untouched(fields);
  for (const [tag, attrs] of [['input', {}], ['textarea', {}], ['select', {}], ['div', { contenteditable: 'true' }], ['div', { contenteditable: '' }], ['div', { contenteditable: 'plaintext-only' }], ['div', { role: 'textbox' }], ['div', { class: 'pptskill-editor' }], ['div', { 'data-pptskill-editor-chrome': 'layout' }]]) {
    const parent = h.document.createElement(tag); for (const [k, v] of Object.entries(attrs)) parent.setAttribute(k, v);
    const child = h.document.createElement('span'); parent.append(child); h.document.body.append(parent);
    untouched({ target: child }); h.document.activeElement = parent; untouched({}); h.document.activeElement = null; parent.remove();
  }
  emit(h, 'compositionstart'); untouched({}); emit(h, 'compositionend'); assert.equal(key(h).prevented, true);
  emit(h, 'compositionstart'); h.api.layout.setMode(false); h.ready(); assert.equal(key(h).prevented, true);
  h.api.layout.destroy();
  for (const name of ['keydown', 'compositionstart', 'compositionend']) assert.equal(h.document.listeners[name].length, 0);
});
test('S5 mounted no mode／selection／geometry／deleted 與原子 bounds', () => {
  const h = mountedEditor(fixture(0)); const before = h.getSpec();
  assert.equal(key(h).prevented, false); h.api.layout.setMode(true); assert.equal(key(h).prevented, false); assert.deepEqual(h.getSpec(), before);
  h.ready(); h.api.executeOperation(request('move-element', { x: 80, y: 80 })); const edge = h.getSpec();
  assert.equal(key(h, { key: 'ArrowLeft', shiftKey: true }).prevented, true); assert.deepEqual(h.getSpec(), edge);
  h.component().remove(); assert.equal(key(h).prevented, false); assert.deepEqual(h.getSpec(), edge);
  const input = fixture(0); delete input.slides[0].composition.geometryOverrides;
  const legacy = mountedEditor(input); legacy.ready(); const old = legacy.getSpec();
  assert.equal(key(legacy).prevented, false); assert.deepEqual(legacy.getSpec(), old);
});
for (const kind of ['drag', 'resize']) test('S5 mounted ' + kind + ' 中按鍵不取消／不提交 gesture', () => {
  const h = mountedEditor(fixture(0)); h.ready(); h.begin(kind); h.update(20, 10, kind);
  assert.equal(key(h).prevented, true); assert.deepEqual(geometry(h.getSpec()), box); assert.equal(h.api.layout.getState().gesturing, true);
  h.finish(kind); assert.deepEqual(geometry(h.getSpec()), kind === 'drag' ? { ...box, x: 820, y: 290 } : { ...box, width: 660, height: 490 });
});
