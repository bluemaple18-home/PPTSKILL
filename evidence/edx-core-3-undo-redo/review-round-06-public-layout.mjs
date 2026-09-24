import assert from 'node:assert/strict';

import { fixture, mountedEditor } from '../../tools/edx-wp1-s4-perf-mounted.mjs';
const h = mountedEditor(fixture(0));
h.action('edit');
const title = h.document.querySelector('[data-pptskill-element-id="role-title"]');
title.textContent = 'pending layout text';
const before = {
  canonicalTitle: h.getSpec().slides[0].content.title,
  revision: h.getRevision(), history: h.api.getHistoryState(),
  mode: h.document.body.dataset.editorMode,
};
const status = h.document.querySelector('[data-editor-status]');
let text = status.textContent, injected = false, nestedRejected = false;
const failure = Error('layout final status fault');
Object.defineProperty(status, 'textContent', {
  configurable: true,
  get() { return text; },
  set(next) {
    text = next;
    if (!injected && next === '點選元件或拖曳空白區框選多個元件') {
      injected = true;
      try {
        h.api.executeOperation({ operation: 'edit-text', target: { slideId: 'portable', elementId: 'role-title' }, value: 'nested' });
      } catch (error) { nestedRejected = /同步交易/.test(error.message); }
      throw failure;
    }
  },
});
let caught;
try { h.api.layout.setMode(true); } catch (error) { caught = error; }
const after = {
  canonicalTitle: h.getSpec().slides[0].content.title,
  revision: h.getRevision(), history: h.api.getHistoryState(),
  mode: h.document.body.dataset.editorMode,
};
assert.equal(caught, failure);
assert.equal(injected, true);
assert.equal(nestedRejected, true);
assert.notDeepEqual(after, before);
console.log(JSON.stringify({ expected: before, actual: after, domTitle: title.textContent, nestedRejected }, null, 2));
