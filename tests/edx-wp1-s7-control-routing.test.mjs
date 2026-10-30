import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { mountedEditor, fixture, geometry, box } from '../tools/edx-wp1-s4-perf-mounted.mjs';

const metadata = JSON.parse(readFileSync(new URL('../runtime/vendor/moveable-vendor.json', import.meta.url)));
const input = metadata.inputs.find(x => /gesto\/dist\/gesto\.esm\.js$/.test(x.path));
const source = readFileSync(new URL('../' + input.path, import.meta.url), 'utf8');
assert.equal(createHash('sha256').update(source).digest('hex'), input.sha256);
const start = source.indexOf('_this._onClick = function (e) {');
assert.ok(start >= 0);
const blockerSource = source.slice(start + '_this._onClick = '.length, source.indexOf('\n        };', start) + 10).trim();

// 模擬 DOM window capture→document 的傳播與 listener removal，執行 pinned Gesto 原文 blocker。
function click(h, target, fields = {}) {
  const event = { type: 'click', target, isTrusted: false, detail: 0, defaultPrevented: false, stopped: false,
    preventDefault() { this.defaultPrevented = true; }, stopPropagation() { this.stopped = true; }, ...fields };
  for (const listener of [...h.window.listeners.click || []]) {
    if (h.window.listeners.click.includes(listener)) listener(event);
  }
  if (!event.stopped) for (const listener of h.document.listeners.click || []) listener(event);
  return event;
}
function setup() {
  const h = mountedEditor(fixture(0)); h.ready(); h.action('snap-layout'); h.begin();
  h.vendor.handlers.drag({ inputEvent: { clientX: 10, clientY: 10 }, left: 816, top: 296 });
  const vendor = h.vendor;
  let blocker;
  const allow = () => h.window.removeEventListener('click', blocker, true);
  blocker = vm.runInNewContext('(' + blockerSource + ')', { _this: {
    options: { preventClickEventByCondition: null }, _allowClickEvent: allow, _allowMouseEvent() {},
  } });
  h.window.addEventListener('click', blocker, true);
  // pinned stop() 會呼叫 _allowClickEvent；teardown 亦解除 vendor listener。
  const destroy = vendor.destroy.bind(vendor);
  vendor.stopDrag = allow; vendor.destroy = () => { allow(); destroy(); };
  return { h, vendor };
}

for (const activation of [{ isTrusted: false, detail: 0 }, { isTrusted: true, detail: 0 }, { isTrusted: true, detail: 1 }])
for (const action of ['snap-layout', 'edit', 'selection']) test(`S7 ${action} ${JSON.stringify(activation)} 在 pinned blocker 前取消，原 handler 可達`, () => {
  const { h, vendor } = setup();
  const node = action === 'selection' ? h.document.querySelector('[data-pptskill-element-id="role-title"]') : h.document.querySelector(`[data-action="${action}"]`);
  const event = click(h, node, activation);
  assert.equal(h.api.layout.getState().gesturing, false, 'control click 必須在 release 前取消');
  assert.equal(event.stopped, false, '原 event 需繼續到既有 document handlers');
  if (action === 'snap-layout') assert.equal(node.getAttribute('aria-pressed'), 'false', 'toggle 恰好一次');
  if (action === 'edit') assert.equal(h.document.body.dataset.editorMode, 'edit');
  assert.equal(h.document.querySelectorAll('[data-pptskill-editor-chrome="geometry-target"]').length, 0);
  vendor.handlers.dragEnd();
  click(h, h.component(), { isTrusted: true, detail: 1 });
  assert.deepEqual(geometry(h.getSpec()), box, 'release 不得提交舊 preview');
  assert.equal(h.document.querySelectorAll('[data-pptskill-editor-chrome="geometry-target"]').length, 0, '尾隨 click 防護保留');
});

for (const target of ['outside', 'unrelated-action', 'vendor-chrome']) test(`S7 capture 不攔截非本卡路由 ${target}`, () => {
  const { h } = setup(), node = h.document.createElement('div');
  if (target === 'unrelated-action') node.setAttribute('data-action', 'save');
  if (target === 'vendor-chrome') { node.setAttribute('data-pptskill-editor-chrome', 'layout'); h.component().closest('.slide').append(node); }
  else h.document.body.append(node);
  const event = click(h, node);
  assert.equal(event.stopped, true, '仍由 pinned vendor 處理');
  assert.equal(h.api.layout.getState().gesturing, true);
  assert.deepEqual(geometry(h.getSpec()), box);
});

test('S7 routing listener 與 vendor blocker 在重複 destroy 後均清除', () => {
  const { h } = setup(); assert.equal(h.window.listeners.click.length, 2);
  h.api.layout.destroy(); h.api.layout.destroy(); assert.equal(h.window.listeners.click.length, 0);
});
