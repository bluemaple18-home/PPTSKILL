import test from 'node:test';
import assert from 'node:assert/strict';
import { mountedEditor, fixture, geometry } from '../tools/edx-wp1-s4-perf-mounted.mjs';
import { extractDeckSpec } from '../runtime/deck-spec.js';
import { createComponentInteraction } from '../runtime/component-interaction.js';
import { createDeckEditor } from '../runtime/deck-editor.js';

const base = { x: 803, y: 283, width: 637, height: 477 };
const proxySelector = '[data-pptskill-editor-chrome="geometry-target"]';
function setup(scale = 1) {
  const spec = fixture(0); spec.slides[0].composition.geometryOverrides['portable-quote'] = { ...base };
  const h = mountedEditor(spec); h.component().closest('.slide').getBoundingClientRect = () => ({ width: 1600 * scale });
  h.ready(); h.action('snap-layout');
  return h;
}

for (const reason of ['cancel', 'toggle', 'mode', 'text', 'escape', 'pointercancel', 'blur', 'scroll', 'resize', 'stale', 'deleted', 'replacement', 'destroy']) test(`S7 ${reason} 取消 preview，proxy 與 vendor 清理`, () => {
  const h = setup(); emit(h, 'drag', 'Start');
  emit(h, 'drag', '', { inputEvent: { clientX: 110, clientY: 110 }, left: 816, top: 296 });
  const old = h.vendor;
  const dispatch = (surface, type, fields = {}) => { for (const fn of surface.listeners[type] || []) fn({ target: h.document.body, preventDefault() {}, stopImmediatePropagation() {}, ...fields }); };
  if (reason === 'cancel') h.api.layout.cancel();
  if (reason === 'toggle') h.action('snap-layout');
  if (reason === 'mode') h.api.layout.setMode(false);
  if (reason === 'text') h.action('edit');
  if (reason === 'escape') dispatch(h.document, 'keydown', { key: 'Escape' });
  if (reason === 'pointercancel') dispatch(h.document, reason);
  if (['blur', 'scroll', 'resize'].includes(reason)) dispatch(h.window, reason);
  if (reason === 'destroy') { h.api.layout.destroy(); h.api.layout.destroy(); }
  if (reason === 'stale') {
    h.api.executeOperation({ operation: 'edit-text', target: { slideId: 'portable', elementId: 'role-title' }, value: '版本更新' });
    emit(h, 'drag', '', { inputEvent: { clientX: 120, clientY: 120 }, left: 824, top: 304 });
  }
  if (reason === 'deleted' || reason === 'replacement') {
    const node = h.component();
    if (reason === 'replacement') node.replaceWith(node.cloneNode(true)); else node.remove();
    h.flushMutations();
  }
  old.handlers.dragEnd();
  assert.equal(old.destroyed, true);
  assert.equal(h.document.querySelector(proxySelector), null);
  assert.deepEqual(geometry(h.getSpec()), base);
});

for (const kind of ['drag', 'resize']) test(`S7 ${kind} bounds/minimum/finite 原子拒絕`, () => {
  for (const invalid of [-1000, NaN, Infinity]) {
    const h = setup(); emit(h, kind, 'Start');
    emit(h, kind, '', { inputEvent: { clientX: 110, clientY: 110 }, left: invalid, top: 296, width: invalid, height: 485 });
    emit(h, kind, 'End'); assert.deepEqual(geometry(h.getSpec()), base);
  }
});

test('S7 keyboard 仍1/10px、guardedEscape／IME／input 不取消 snap gesture', () => {
  const h = setup();
  const key = fields => { for (const fn of h.document.listeners.keydown) fn({ target: h.document.body, key: 'ArrowRight', preventDefault() {}, stopImmediatePropagation() {}, ...fields }); };
  key(); key({ key: 'ArrowDown', shiftKey: true });
  assert.deepEqual(geometry(h.getSpec()), { ...base, x: 804, y: 293 });
  emit(h, 'drag', 'Start');
  for (const fields of [{ ctrlKey: true }, { metaKey: true }, { altKey: true }, { isComposing: true }, { keyCode: 229 }, { target: h.document.querySelector('[data-action="snap-layout"]') }]) {
    // 測試 chrome ownership 使用正式標記。
    if (fields.target) fields.target.setAttribute('data-pptskill-editor-chrome', 'test');
    key({ key: 'Escape', ...fields }); assert.equal(h.api.layout.getState().gesturing, true);
  }
  key(); assert.deepEqual(geometry(h.getSpec()), { ...base, x: 804, y: 293 });
  h.api.layout.cancel();
});

test('S7 public begin/update/finish：preview 0筆、release 1筆、return/cancel/stale 0筆', () => {
  for (const mode of ['release', 'return', 'cancel', 'stale']) {
    const spec = fixture(0); spec.slides[0].composition.geometryOverrides['portable-quote'] = { ...base };
    const editor = createDeckEditor(spec), calls = []; let revision = 0; const token = {};
    const controller = createComponentInteraction({ readTarget: () => ({ token, revision, rect: geometry(editor.getSpec()) }),
      executeOperation: op => { calls.push(op); editor.executeOperation(op); }, preview() {}, restore() {} });
    controller.setMode(true); controller.select({ slideId: 'portable', elementId: 'component-portable-quote' });
    controller.begin('drag', { x: 100, y: 100 }, 0.8);
    controller.update({ x: 100 + 13 * 0.8, y: 100 + 13 * 0.8 }); assert.equal(calls.length, 0);
    if (mode === 'return') controller.update({ x: 100, y: 100 });
    if (mode === 'cancel') controller.cancel();
    if (mode === 'stale') revision++;
    controller.finish(); controller.finish(); assert.equal(calls.length, mode === 'release' ? 1 : 0);
  }
});

for (const mib of [1, 6, 12]) test(`S7 mounted ${mib}MiB snap preview 不序列化、不讀 payload`, () => {
  const h = mountedEditor(fixture(mib)); h.ready(); h.action('snap-layout'); emit(h, 'drag', 'Start'); h.resetCounts();
  for (let i = 0; i < 101; i++) emit(h, 'drag', '', { inputEvent: { clientX: 110, clientY: 110 }, left: 816, top: 296 });
  assert.deepEqual(h.counts, { payloadReads: 0, serializations: 0, wholeSpecSerializations: 0 });
  emit(h, 'drag', 'End'); assert.deepEqual(geometry(h.getSpec()), { x: 816, y: 296, width: 640, height: 480 });
});
function emit(h, kind, suffix = '', fields = {}) {
  h.vendor.handlers[kind + suffix]({ inputEvent: { clientX: 100, clientY: 100 }, set() {}, setFixedDirection() {}, stop() { throw Error('拒絕開始'); }, ...fields });
}
test('S7 初始 off、明示開關、proxy 不攔 visible hit、vendor direction 與清引用', () => {
  const h = mountedEditor(fixture(0)); h.ready();
  assert.equal(h.vendor.options.snappable, false);
  h.action('snap-layout');
  assert.equal(h.vendor.options.snappable, true);
  assert.equal(h.vendor.options.dragTarget, h.component());
  assert.equal(h.vendor.options.target, h.document.querySelector(proxySelector));
  assert.equal(h.vendor.options.target.style.pointerEvents, 'none');
  assert.equal(h.vendor.options.target.parentElement, h.vendor.options.container);
  assert.equal(h.vendor.options.snapGridWidth, 8);
  emit(h, 'drag', 'Start'); assert.deepEqual(JSON.parse(JSON.stringify(h.vendor.snapDirections)), { left: true, top: true, right: false, bottom: false, center: false, middle: false });
  h.api.layout.cancel(); assert.equal(h.document.querySelector(proxySelector), null);
  h.api.layout.destroy(); h.api.layout.destroy();
});
test('S7 舊 vendor 延遲 end 不得提交新 gesture；stale release 清 proxy', () => {
  const h = setup(), old = h.vendor;
  h.api.layout.cancel(); h.click(h.component());
  emit(h, 'resize', 'Start');
  emit(h, 'resize', '', { inputEvent: { clientX: 110, clientY: 110 }, width: 645, height: 485 });
  old.handlers.dragEnd(); assert.equal(h.api.layout.getState().gesturing, true); assert.deepEqual(geometry(h.getSpec()), base);
  h.api.executeOperation({ operation: 'edit-text', target: { slideId: 'portable', elementId: 'role-title' }, value: 'release 前更新' });
  emit(h, 'resize', 'End'); assert.deepEqual(geometry(h.getSpec()), base); assert.equal(h.document.querySelector(proxySelector), null);
});

test('S7 SE 固定左上 anchor；preview/cancel 不清 presentation transform', () => {
  const h = setup(); h.component().style.transform = 'scale(.8)';
  let fixed;
  emit(h, 'resize', 'Start', { setFixedDirection: value => { fixed = Array.from(value); } });
  assert.deepEqual(fixed, [-1, -1]);
  emit(h, 'resize', '', { inputEvent: { clientX: 110, clientY: 110 }, width: 645, height: 485, drag: { left: 999, top: 999 } });
  assert.equal(h.component().style.left, '803px'); assert.equal(h.component().style.top, '283px');
  assert.equal(h.component().style.transform, 'scale(.8)');
  assert.equal(h.document.querySelector(proxySelector).style.transform, '');
  h.api.layout.cancel(); assert.equal(h.component().style.transform, 'scale(.8)');
});
for (const scale of [0.8, 1]) for (const kind of ['drag', 'resize']) {
  test(`S7 ${scale} ${kind} vendor canonical payload、preview/export、單次 release`, () => {
    const h = setup(scale), before = h.getSpec();
    emit(h, kind, 'Start');
    if (kind === 'resize') assert.deepEqual(JSON.parse(JSON.stringify(h.vendor.snapDirections)), { left: false, top: false, right: true, bottom: true, center: false, middle: false });
    for (const [delta, x, y, width, height] of [[10, 816, 296, 645, 485], [20, 824, 304, 653, 493], [-10, 792, 272, 629, 469]]) {
      emit(h, kind, '', { inputEvent: { clientX: 100 + delta * scale, clientY: 100 + delta * scale }, left: x, top: y, width, height });
    }
    assert.deepEqual(h.getSpec(), before);
    assert.deepEqual(extractDeckSpec(h.api.exportHtml()), before);
    assert.equal(h.api.layout.getState().gesturing, true);
    emit(h, kind, 'End');
    const expected = kind === 'drag' ? { ...base, x: 792, y: 272 } : { ...base, width: 629, height: 469 };
    assert.deepEqual(geometry(h.getSpec()), expected);
    emit(h, kind, 'End'); assert.deepEqual(geometry(h.getSpec()), expected);
    const reopened = mountedEditor(extractDeckSpec(h.api.exportHtml())); reopened.ready();
    assert.equal(reopened.vendor.options.snappable, false);
  });
  test(`S7 ${scale} ${kind} 零與返回原點不得採用 vendor 起始修正`, () => {
    for (const excursion of [false, true]) {
      const h = setup(scale); emit(h, kind, 'Start');
      if (excursion) emit(h, kind, '', { inputEvent: { clientX: 110, clientY: 110 }, left: 816, top: 296, width: 645, height: 485 });
      emit(h, kind, '', { left: 800, top: 280, width: 637, height: 477 });
      emit(h, kind, 'End'); assert.deepEqual(geometry(h.getSpec()), base);
    }
  });
}
