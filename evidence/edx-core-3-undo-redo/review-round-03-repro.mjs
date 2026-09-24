import assert from 'node:assert/strict';
import { fixture, mountedEditor } from '../../tools/edx-wp1-s4-perf-mounted.mjs';

// 固定 60a05ce 的三個 NO-GO 反例；此腳本是審查證據，不屬產品測試套件。
const projection = mountedEditor(fixture(0));
projection.ready();
const projectionNode = projection.component();
const originalStyle = projectionNode.style;
let projectionThrown = false;
projectionNode.style = new Proxy(originalStyle, {
  get(target, key) {
    if (key === 'setProperty') return (name, value) => {
      target.setProperty(name, value);
      if (!projectionThrown && name === 'left' && projection.api.getHistoryState().entries === 1) {
        projectionThrown = true;
        throw Error('post-commit restore projection fault');
      }
    };
    return target[key];
  },
});
projection.begin();
projection.update(8, 0);
assert.throws(() => projection.finish(), /post-commit restore projection fault/);
const projectionResult = {
  x: projection.getSpec().slides[0].composition.geometryOverrides['portable-quote'].x,
  revision: projection.getRevision(),
  historyEntries: projection.api.getHistoryState().entries,
};
assert.deepEqual(projectionResult, { x: 808, revision: 1, historyEntries: 1 });

const reentrant = mountedEditor(fixture(0));
reentrant.ready();
reentrant.api.executeOperation({ operation: 'edit-text', target: { slideId: 'portable', elementId: 'role-title' }, value: 'prior' });
reentrant.begin();
reentrant.update(8, 0);
const undo = reentrant.document.querySelector('[data-action="undo"]');
let disabled = undo.disabled;
let replayed = false;
let once = false;
Object.defineProperty(undo, 'disabled', {
  configurable: true,
  get() { return disabled; },
  set(value) {
    disabled = value;
    if (!once) { once = true; replayed = reentrant.api.undo(); }
  },
});
reentrant.finish();
const reentrantResult = { replayed, revision: reentrant.getRevision() };
assert.deepEqual(reentrantResult, { replayed: true, revision: 2 });

const deck = fixture(0);
const second = structuredClone(deck.slides[0]);
second.id = 'portable-two';
deck.slides.push(second);
const reorder = mountedEditor(deck);
reorder.ready();
reorder.document.querySelector('[data-pptskill-element-id="role-title"]').textContent = 'pending';
const deckNode = reorder.document.querySelector('.deck');
const insertBefore = deckNode.insertBefore;
deckNode.insertBefore = function (node, before) {
  insertBefore.call(this, node, before);
  throw Error('reorder post-effect');
};
assert.throws(() => reorder.action('move-down'), /reorder post-effect/);
const reorderResult = {
  title: reorder.getSpec().slides[0].content.title,
  revision: reorder.getRevision(),
  historyEntries: reorder.api.getHistoryState().entries,
};
assert.deepEqual(reorderResult, { title: 'pending', revision: 1, historyEntries: 1 });

console.log(JSON.stringify({ projectionResult, reentrantResult, reorderResult }));
