import assert from 'node:assert/strict';

import { fixture, mountedEditor } from '../../tools/edx-wp1-s4-perf-mounted.mjs';
const spec = fixture(0), slide = spec.slides[0];
slide.content.components.push({ id: 'group-text', type: 'text', text: 'G' });
Object.assign(slide.composition.geometryOverrides, {
  'group-text': { x: 120, y: 120, width: 200, height: 160 },
  'perf-image': { x: 420, y: 320, width: 300, height: 200 },
});
const h = mountedEditor(spec);
h.api.layout.setMode(true);
h.click(h.document.querySelector('[data-pptskill-element-id="component-group-text"]'));
h.click(h.document.querySelector('[data-pptskill-element-id="component-perf-image"]'), { shiftKey: true });
const before = {
  groups: h.getSpec().slides[0].composition.elementGroups ?? null,
  revision: h.getRevision(), history: h.api.getHistoryState(),
};
const status = h.document.querySelector('[data-editor-status]');
let text = status.textContent, injected = false;
Object.defineProperty(status, 'textContent', {
  configurable: true,
  get() { return text; },
  set(next) {
    text = next;
    if (!injected && next === '已群組') { injected = true; throw Error('group final status fault'); }
  },
});
h.action('group-elements');
const after = {
  groups: h.getSpec().slides[0].composition.elementGroups ?? null,
  revision: h.getRevision(), history: h.api.getHistoryState(), status: status.textContent,
};
assert.equal(injected, true);
assert.match(after.status, /未套用：group final status fault/);
assert.notDeepEqual(after.groups, before.groups);
assert.equal(after.revision, before.revision + 1);
console.log(JSON.stringify({ expected: before, actual: after }, null, 2));
