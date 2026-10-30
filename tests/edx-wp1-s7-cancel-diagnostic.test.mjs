import test from 'node:test';
import assert from 'node:assert/strict';
import { installSnapCancelDiagnostic } from '../tools/edx-wp1-s7-browser-cases.mjs';
import { mountedEditor, fixture } from '../tools/edx-wp1-s4-perf-mounted.mjs';

for (const guarded of [false, true]) test(`S7 診斷區分 ${guarded ? 'guarded Escape 未取消' : 'Escape 已取消後 click 重選'}，不改事件結果`, () => {
  const h = mountedEditor(fixture(0)); h.window.document = h.document;
  h.ready(); h.action('snap-layout');
  const prior = Object.fromEntries(Object.entries(h.window.listeners).map(([k, v]) => [k, [...v]]));
  const diagnostic = installSnapCancelDiagnostic(h.window);
  const dispatch = (type, fields = {}) => {
    const event = { type, target: h.document.body, defaultPrevented: false, stopped: false, isTrusted: false,
      preventDefault() { this.defaultPrevented = true; }, stopImmediatePropagation() { this.stopped = true; }, ...fields };
    for (const listener of h.window.listeners[type] || []) listener(event);
    assert.equal(event.defaultPrevented, false, 'diagnostic 不 preventDefault');
    assert.equal(event.stopped, false, 'diagnostic 不擋 propagation');
    for (const listener of h.document.listeners[type] || []) { listener(event); if (event.stopped) break; }
    return event;
  };
  h.begin();
  h.vendor.handlers.drag({ inputEvent: { clientX: 10, clientY: 10 }, left: 816, top: 296 });
  diagnostic.snapshot('after-start');
  dispatch('keydown', { key: 'Escape', ctrlKey: guarded });
  diagnostic.snapshot('after-cancel-before-release');
  dispatch('mouseup', { target: h.component(), buttons: 0 });
  dispatch('click', { target: h.component(), detail: 1 });
  diagnostic.snapshot('after-release');
  const entries = diagnostic.read(), checkpoint = phase => entries.find(e => e.phase === phase);
  assert.equal(checkpoint('after-start').state.gesturing, true);
  assert.equal(checkpoint('after-cancel-before-release').state.gesturing, guarded);
  assert.equal(checkpoint('after-cancel-before-release').proxies, guarded ? 1 : 0);
  assert.equal(checkpoint('after-release').proxies, 1);
  const click = entries.find(e => e.event?.type === 'click');
  assert.equal(click.proxies, 0, '較早註冊的 control capture 已取消，診斷仍在 document handler 前記錄');
  assert.equal(click.event.target.elementId, 'component-portable-quote');
  assert.equal(entries.find(e => e.event?.type === 'keydown').event.ctrl, guarded);
  // 固定快照不能隨後續重新選取而改寫；dispose 不留下捕捉器。
  assert.equal(checkpoint('after-cancel-before-release').state.target === null, !guarded);
  diagnostic.dispose(); diagnostic.dispose();
  for (const [type, listeners] of Object.entries(h.window.listeners)) assert.deepEqual(listeners, prior[type] || []);
});
