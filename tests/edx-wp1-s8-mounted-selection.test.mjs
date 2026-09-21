import test from 'node:test';
import assert from 'node:assert/strict';
import { mountedEditor, fixture } from '../tools/edx-wp1-s4-perf-mounted.mjs';

const componentNodes = h => h.document.querySelectorAll('[data-edit-target]').filter(node => node.dataset.editTarget.includes('.content.components.'));
const ids = nodes => nodes.map(node => node.dataset.pptskillElementId);
const selected = h => Array.from(h.api.layout.getSelectionState().selected);

test('S8 plain/Shift click 與 marquee 共用單一 editor-local selection state', () => {
  const h = mountedEditor(fixture(0));
  const before = h.getSpec();
  h.api.layout.setMode(true);
  const nodes = componentNodes(h);
  assert.ok(nodes.length >= 2);
  assert.ok(h.selecto && !h.selecto.destroyed);

  h.resetCounts();
  h.click(nodes[0]);
  assert.deepEqual(selected(h), [ids(nodes)[0]]);
  assert.equal(h.api.layout.getState().target.elementId, ids(nodes)[0]);
  const singleVendor = h.vendor;
  assert.ok(singleVendor && !singleVendor.destroyed);

  h.click(nodes[1], { shiftKey: true });
  assert.deepEqual(selected(h), ids(nodes));
  assert.equal(h.api.layout.getState().target, null);
  assert.equal(singleVendor.destroyed, true, '多選必須 teardown Moveable single target');
  assert.equal(h.counts.payloadReads, 0);
  assert.equal(h.counts.wholeSpecSerializations, 0);

  h.selecto.handlers.selectEnd({ selected: [nodes[1], nodes[0]], inputEvent: { shiftKey: false } });
  assert.deepEqual(selected(h), ids(nodes), 'marquee 結果依 DOM order 穩定');
  h.selecto.handlers.selectEnd({ selected: [nodes[0]], inputEvent: { shiftKey: true } });
  assert.deepEqual(selected(h), [ids(nodes)[1]], 'Shift marquee 使用 toggle semantics');
  assert.equal(h.counts.payloadReads, 0, 'marquee selection 不讀 component payload');
  assert.equal(h.counts.wholeSpecSerializations, 0, 'marquee selection 不序列化整份 DeckSpec');

  h.click(nodes[0]);
  assert.deepEqual(selected(h), [ids(nodes)[0]]);
  assert.equal(h.api.layout.getState().target.elementId, ids(nodes)[0]);
  assert.ok(h.vendor && !h.vendor.destroyed, '回單選恢復 Moveable');
  assert.deepEqual(h.getSpec(), before, 'selection 不得改 canonical');
});

test('S8 export clone-only 清除 Selecto/selection chrome，live selection 保持', () => {
  const h = mountedEditor(fixture(0)); h.api.layout.setMode(true);
  const nodes = componentNodes(h); h.click(nodes[0]); h.click(nodes[1], { shiftKey: true });
  assert.equal(h.api.layout.getSelectionState().selected.length, 2);
  assert.equal(h.document.querySelectorAll('.selecto-selection').length, 1);
  const html = h.api.exportHtml();
  assert.doesNotMatch(html, /selecto-selection|selecto-test|data-editor-selected="true"/u);
  assert.equal(h.api.layout.getSelectionState().selected.length, 2, 'export 不清 live selection');
  assert.equal(h.document.querySelectorAll('.selecto-selection').length, 1, 'export 只清 clone');
});

test('S8 Escape/blur/mode teardown 清 selection，重複 destroy idempotent', () => {
  const h = mountedEditor(fixture(0)); h.api.layout.setMode(true);
  const nodes = componentNodes(h); h.click(nodes[0]); h.click(nodes[1], { shiftKey: true });
  for (const fn of h.window.listeners.blur || []) fn({ target: h.window });
  assert.deepEqual(selected(h), []);

  h.click(nodes[0]);
  h.api.layout.setMode(false);
  assert.equal(h.api.layout.getSelectionState().enabled, false);
  assert.deepEqual(selected(h), []);
  assert.equal(h.selecto.destroyed, true);
  h.api.layout.destroy(); h.api.layout.destroy();
});
