import assert from 'node:assert/strict';
import test from 'node:test';
import { fixture, mountedEditor } from '../tools/edx-wp1-s4-perf-mounted.mjs';

const prepared = ({ thirdGeometry = true } = {}) => {
  const spec = fixture(0);
  const slide = spec.slides[0];
  slide.content.components.push({ id: 's10-three', type: 'text', text: '第三個均分元件' });
  slide.composition.geometryOverrides['perf-image'] = { x: 200, y: 560, width: 240, height: 160 };
  if (thirdGeometry) slide.composition.geometryOverrides['s10-three'] = { x: 1200, y: 100, width: 160, height: 120 };
  return spec;
};
const componentNodes = h => h.document.querySelectorAll('[data-edit-target]').filter(node => node.dataset.editTarget.includes('.content.components.'));
const selected = h => Array.from(h.api.layout.getSelectionState().selected);
const geometry = (h, id) => h.getSpec().slides[0].composition.geometryOverrides?.[id];

test('S10 3+ selection 才顯示 distribute controls，均分後 selection 保留且 export 不洩漏', () => {
  const h = mountedEditor(prepared()); h.ready();
  const nodes = componentNodes(h), toolbar = h.document.querySelector('[data-pptskill-context-toolbar]');
  const horizontal = h.document.querySelector('[data-action="distribute-horizontal-centers"]');
  const vertical = h.document.querySelector('[data-action="distribute-vertical-centers"]');
  assert.equal(toolbar.hidden, true); assert.equal(horizontal.hidden, true); assert.equal(vertical.hidden, true);

  h.click(nodes[1], { shiftKey: true });
  assert.equal(selected(h).length, 2); assert.equal(toolbar.hidden, false);
  assert.equal(horizontal.hidden, true); assert.equal(vertical.hidden, true, '2 選取只能 align');
  const twoBefore = h.getSpec(); h.action('distribute-horizontal-centers');
  assert.deepEqual(h.getSpec(), twoBefore); assert.match(h.document.querySelector('[data-editor-status]').textContent, /至少選取 3/);

  h.click(nodes[2], { shiftKey: true });
  assert.equal(selected(h).length, 3); assert.equal(horizontal.hidden, false); assert.equal(vertical.hidden, false);
  h.action('distribute-horizontal-centers');
  assert.deepEqual(geometry(h, 'portable-quote'), { x: 480, y: 280, width: 640, height: 480 });
  assert.deepEqual(geometry(h, 'perf-image'), { x: 200, y: 560, width: 240, height: 160 });
  assert.deepEqual(geometry(h, 's10-three'), { x: 1200, y: 100, width: 160, height: 120 });
  assert.equal(selected(h).length, 3); assert.equal(horizontal.hidden, false);

  h.action('distribute-vertical-centers');
  assert.deepEqual(geometry(h, 'portable-quote'), { x: 480, y: 160, width: 640, height: 480 });
  assert.equal(selected(h).length, 3);

  const html = h.api.exportHtml();
  assert.doesNotMatch(html, /data-pptskill-context-toolbar|distribute-horizontal-centers|distribute-vertical-centers|data-editor-selected="true"/u);
  assert.equal(selected(h).length, 3, 'export 不清 live selection');

  h.click(nodes[0]);
  assert.equal(selected(h).length, 1); assert.equal(toolbar.hidden, true); assert.equal(horizontal.hidden, true);
});

test('S10 distribute UI 缺 canonical geometry 時整筆不改且保留 3-selection', () => {
  const h = mountedEditor(prepared({ thirdGeometry: false })); h.ready();
  const nodes = componentNodes(h), horizontal = h.document.querySelector('[data-action="distribute-horizontal-centers"]');
  h.click(nodes[1], { shiftKey: true }); h.click(nodes[2], { shiftKey: true });
  assert.equal(selected(h).length, 3); assert.equal(horizontal.hidden, false);
  const before = h.getSpec(); h.action('distribute-horizontal-centers');
  assert.deepEqual(h.getSpec(), before); assert.equal(selected(h).length, 3);
  assert.match(h.document.querySelector('[data-editor-status]').textContent, /缺少 canonical geometry/u);
});
