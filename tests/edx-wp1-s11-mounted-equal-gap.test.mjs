import assert from 'node:assert/strict';
import test from 'node:test';
import { fixture, mountedEditor } from '../tools/edx-wp1-s4-perf-mounted.mjs';

const prepared = ({ negative = false } = {}) => {
  const spec = fixture(0), slide = spec.slides[0];
  slide.content.components.push({ id: 's11-three', type: 'text', text: '第三個等間距元件' });
  slide.composition.geometryOverrides = negative ? {
    'portable-quote': { x: 100, y: 100, width: 500, height: 100 },
    'perf-image': { x: 300, y: 300, width: 500, height: 150 },
    's11-three': { x: 600, y: 500, width: 500, height: 80 },
  } : {
    'portable-quote': { x: 180, y: 260, width: 360, height: 220 },
    'perf-image': { x: 620, y: 560, width: 240, height: 160 },
    's11-three': { x: 1180, y: 100, width: 160, height: 120 },
  };
  return spec;
};
const componentNodes = h => h.document.querySelectorAll('[data-edit-target]').filter(node => node.dataset.editTarget.includes('.content.components.'));
const selected = h => Array.from(h.api.layout.getSelectionState().selected);
const geometry = (h,id) => h.getSpec().slides[0].composition.geometryOverrides[id];

test('S11 3+ selection 顯示 equal-gap controls，成功後保留 selection/export 清理', () => {
  const h=mountedEditor(prepared()); h.ready();
  const nodes=componentNodes(h), hg=h.document.querySelector('[data-action="distribute-horizontal-gaps"]'), vg=h.document.querySelector('[data-action="distribute-vertical-gaps"]');
  h.click(nodes[1], { shiftKey:true });
  assert.equal(selected(h).length,2); assert.equal(hg.hidden,true); assert.equal(vg.hidden,true);
  h.click(nodes[2], { shiftKey:true });
  assert.equal(selected(h).length,3); assert.equal(hg.hidden,false); assert.equal(vg.hidden,false);
  h.action('distribute-horizontal-gaps');
  assert.deepEqual(geometry(h,'portable-quote'), { x:180,y:260,width:360,height:220 });
  assert.deepEqual(geometry(h,'perf-image'), { x:740,y:560,width:240,height:160 });
  assert.deepEqual(geometry(h,'s11-three'), { x:1180,y:100,width:160,height:120 });
  assert.equal(selected(h).length,3);
  h.action('distribute-vertical-gaps');
  assert.deepEqual(geometry(h,'portable-quote'), { x:180,y:280,width:360,height:220 });
  assert.equal(selected(h).length,3);
  const html=h.api.exportHtml();
  assert.doesNotMatch(html,/distribute-horizontal-gaps|distribute-vertical-gaps|data-pptskill-context-toolbar|data-editor-selected="true"/u);
  assert.equal(selected(h).length,3);
});

test('S11 negative gap UI 原子拒絕且保留 selection', () => {
  const h=mountedEditor(prepared({negative:true})); h.ready();
  const nodes=componentNodes(h); h.click(nodes[1],{shiftKey:true}); h.click(nodes[2],{shiftKey:true});
  const before=h.getSpec(); h.action('distribute-horizontal-gaps');
  assert.deepEqual(h.getSpec(),before); assert.equal(selected(h).length,3);
  assert.match(h.document.querySelector('[data-editor-status]').textContent,/gap|間距|空間/u);
});
