import assert from 'node:assert/strict';
import test from 'node:test';
import { fixture, mountedEditor } from '../tools/edx-wp1-s4-perf-mounted.mjs';

const prepared = ({ secondGeometry = true } = {}) => {
  const spec = fixture(0);
  const slide = spec.slides[0];
  if (secondGeometry) slide.composition.geometryOverrides['perf-image'] = { x: 200, y: 560, width: 240, height: 160 };
  return spec;
};

const componentNodes = h => h.document.querySelectorAll('[data-edit-target]').filter(node => node.dataset.editTarget.includes('.content.components.'));
const selected = h => Array.from(h.api.layout.getSelectionState().selected);
const geometry = (h, id) => h.getSpec().slides[0].composition.geometryOverrides?.[id];

test('S9 multi-selection 才顯示 align controls；align 後 selection 保留且 export 不洩漏', () => {
  const h = mountedEditor(prepared());
  h.ready();
  const nodes = componentNodes(h), toolbar = h.document.querySelector('[data-pptskill-context-toolbar]');
  assert.equal(toolbar.hidden, true);
  h.click(nodes[1], { shiftKey: true });
  assert.equal(selected(h).length, 2);
  assert.equal(toolbar.hidden, false);

  h.action('align-left');
  assert.equal(geometry(h, 'portable-quote').x, 200);
  assert.equal(geometry(h, 'perf-image').x, 200);
  assert.equal(selected(h).length, 2, 'align 後 multi-selection 應保留');
  assert.equal(toolbar.hidden, false);

  h.action('align-center-x');
  assert.deepEqual(geometry(h, 'portable-quote'), { x: 200, y: 280, width: 640, height: 480 });
  assert.deepEqual(geometry(h, 'perf-image'), { x: 400, y: 560, width: 240, height: 160 });
  assert.equal(selected(h).length, 2);

  const html = h.api.exportHtml();
  assert.doesNotMatch(html, /data-pptskill-context-toolbar|align-left|align-center-x|data-editor-selected="true"/u);

  h.click(nodes[0]);
  assert.equal(selected(h).length, 1);
  assert.equal(toolbar.hidden, true);
});

test('S9 align UI 任一 target 缺 canonical geometry 時整筆不改且保留 selection', () => {
  const h = mountedEditor(prepared({ secondGeometry: false }));
  h.ready();
  const nodes = componentNodes(h), toolbar = h.document.querySelector('[data-pptskill-context-toolbar]');
  h.click(nodes[1], { shiftKey: true });
  const before = h.getSpec();
  h.action('align-left');
  assert.deepEqual(h.getSpec(), before);
  assert.equal(selected(h).length, 2);
  assert.equal(toolbar.hidden, false);
  assert.match(h.document.querySelector('[data-editor-status]').textContent, /缺少 canonical geometry/u);
});
