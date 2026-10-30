import test from 'node:test';
import assert from 'node:assert/strict';
import { mountedEditor, fixture, geometry, box } from '../tools/edx-wp1-s4-perf-mounted.mjs';

const proxies = h => h.document.querySelectorAll('[data-pptskill-editor-chrome="geometry-target"]').length;
function dispatch(h, type, fields = {}, surface = h.document) {
  const event = { type, target: h.component(), isTrusted: true, button: 0, isPrimary: true, pointerId: 1,
    detail: type === 'click' ? 1 : 0, prevented: false, stopped: false,
    preventDefault() { this.prevented = true; }, stopImmediatePropagation() { this.stopped = true; }, ...fields };
  for (const listener of surface.listeners[type] || []) { listener(event); if (event.stopped) break; }
  return event;
}
function setup(kind = 'drag') {
  const h = mountedEditor(fixture(0)); h.ready(); h.action('snap-layout');
  dispatch(h, 'pointerdown');
  h.vendor.handlers[kind + 'Start']({ inputEvent: { clientX: 0, clientY: 0 }, set() {}, setFixedDirection() {}, stop() { assert.fail('gesture 未啟動'); } });
  h.vendor.handlers[kind]({ inputEvent: { clientX: 10, clientY: 10 }, left: 816, top: 296, width: 648, height: 488 });
  assert.equal(h.api.layout.getState().gesturing, true);
  return h;
}
function releaseClick(h) {
  dispatch(h, 'pointerup', { buttons: 0 }); dispatch(h, 'mouseup', { buttons: 0, detail: 1 });
  return dispatch(h, 'click', { buttons: 0 });
}
function freshSelection(h) {
  dispatch(h, 'pointerdown'); dispatch(h, 'mousedown', { buttons: 1, detail: 1 });
  const click = releaseClick(h);
  assert.equal(proxies(h), 1); assert.equal(h.api.layout.getState().target.elementId, 'component-portable-quote');
  return click;
}

for (const kind of ['drag', 'resize']) test(`S7 ${kind} Escape→trusted release-click 重播不重選；fresh pointerdown/click 立即恢復`, () => {
  const h = setup(kind), old = h.vendor;
  dispatch(h, 'keydown', { key: 'Escape', target: h.document.body });
  dispatch(h, 'keyup', { key: 'Escape', target: h.document.body });
  assert.equal(proxies(h), 0); assert.equal(h.api.layout.getState().target, null);
  const click = releaseClick(h); old.handlers[kind + 'End']();
  assert.equal(proxies(h), 0, '已取消 gesture 的尾隨 trusted click 不得建立 proxy');
  assert.equal(h.api.layout.getState().target, null); assert.equal(click.prevented, true);
  assert.deepEqual(geometry(h.getSpec()), box);
  freshSelection(h); assert.deepEqual(geometry(h.getSpec()), box);
});

for (const reason of ['cancel', 'pointercancel', 'blur', 'scroll', 'resize', 'selection', 'mode', 'text', 'toggle', 'replacement', 'stale-update', 'stale-release', 'invalid']) test(`S7 ${reason} 共用取消尾隨 click 防護`, () => {
  const h = setup();
  if (reason === 'cancel') h.api.layout.cancel();
  if (reason === 'pointercancel') dispatch(h, 'pointercancel');
  if (['blur', 'scroll', 'resize'].includes(reason)) dispatch(h, reason, {}, h.window);
  if (reason === 'selection') h.api.layout.clearSelection();
  if (reason === 'mode') { h.api.layout.setMode(false); h.api.layout.setMode(true); }
  if (reason === 'text') { h.action('edit'); h.api.layout.setMode(true); }
  if (reason === 'toggle') h.action('snap-layout');
  if (reason === 'replacement') { h.component().replaceWith(h.component().cloneNode(true)); h.flushMutations(); }
  if (reason.startsWith('stale-')) {
    h.api.executeOperation({ operation: 'edit-text', target: { slideId: 'portable', elementId: 'role-title' }, value: '取消前版本更新' });
    if (reason === 'stale-update') h.vendor.handlers.drag({ inputEvent: { clientX: 20, clientY: 20 }, left: 824, top: 304 });
    else h.vendor.handlers.dragEnd();
  }
  if (reason === 'invalid') {
    h.vendor.handlers.drag({ inputEvent: { clientX: -1000, clientY: 0 }, left: -200, top: 280 });
    h.vendor.handlers.dragEnd();
  }
  assert.equal(proxies(h), 0);
  assert.equal(releaseClick(h).prevented, true); assert.equal(proxies(h), 0);
  assert.deepEqual(geometry(h.getSpec()), box);
  if (reason === 'toggle') h.action('snap-layout');
  freshSelection(h);
});

test('S7 取消若沒有尾隨 click，下一次 primary pointerdown/click 仍正常選取', () => {
  const h = setup(); dispatch(h, 'pointercancel');
  assert.equal(proxies(h), 0); freshSelection(h);
});

test('S7 未啟動 gesture 的普通選取與零位移 release 不受取消防護影響', () => {
  const h = mountedEditor(fixture(0)); h.api.layout.setMode(true); h.action('snap-layout');
  freshSelection(h); h.api.layout.clearSelection(); freshSelection(h);
  h.begin(); h.finish();
  assert.equal(proxies(h), 0); releaseClick(h); assert.equal(proxies(h), 1);
});

test('S7 鍵盤 detail0 與 programmatic control 不受影響，亦不消耗尾隨 click 防護', () => {
  const h = setup(); dispatch(h, 'keydown', { key: 'Escape', target: h.document.body });
  dispatch(h, 'click', { target: h.document.querySelector('[data-action="layout"]'), detail: 0 });
  assert.equal(h.api.layout.getState().enabled, false);
  h.action('layout'); assert.equal(h.api.layout.getState().enabled, true);
  h.action('snap-layout'); assert.equal(h.document.querySelector('[data-action="snap-layout"]').getAttribute('aria-pressed'), 'false');
  h.action('snap-layout');
  assert.equal(releaseClick(h).prevented, true); assert.equal(proxies(h), 0); freshSelection(h);
});

test('S7 programmatic component click 可選取；後續尾隨 trusted click 不重建 vendor', () => {
  const h = setup(); h.api.layout.cancel();
  dispatch(h, 'click', { isTrusted: false, detail: 0 });
  assert.equal(proxies(h), 1); const programmaticVendor = h.vendor;
  assert.equal(releaseClick(h).prevented, true); assert.equal(h.vendor, programmaticVendor);
  freshSelection(h); assert.notEqual(h.vendor, programmaticVendor);
});

for (const fields of [{ isTrusted: false }, { isPrimary: false }, { button: 2 }]) test(`S7 非新有效 pointerdown ${JSON.stringify(fields)} 不解除本次取消防護`, () => {
  const h = setup(); h.api.layout.cancel(); dispatch(h, 'pointerdown', fields);
  assert.equal(releaseClick(h).prevented, true); assert.equal(proxies(h), 0); freshSelection(h);
});

test('S7 destroy 移除 pointerdown listener，重複 teardown 安全', () => {
  const h = setup(); assert.equal(h.document.listeners.pointerdown.length, 1);
  h.api.layout.destroy(); h.api.layout.destroy();
  assert.equal(h.document.listeners.pointerdown.length, 0); assert.equal(h.document.listeners.click.length, 1);
  assert.equal(proxies(h), 0);
});
