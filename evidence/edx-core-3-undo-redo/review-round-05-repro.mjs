import assert from 'node:assert/strict';
import { fixture, mountedEditor } from '../../tools/edx-wp1-s4-perf-mounted.mjs';

// 固定 4a405cf 的 NO-GO 反例；只讀重播，不屬產品測試套件。
const spec = fixture(0), second = structuredClone(spec.slides[0]);
second.id = 'portable-two'; spec.slides.push(second);
const reorder = mountedEditor(spec);
reorder.ready();
reorder.document.querySelector('[data-pptskill-element-id="role-title"]').textContent = 'pending';
const status = reorder.document.querySelector('[data-editor-status]');
let text = status.textContent, replayed = false, once = true;
Object.defineProperty(status, 'textContent', { configurable: true,
  get() { return text; },
  set(value) {
    text = value;
    if (once && value === '已調整順序') { once = false; replayed = reorder.api.undo(); }
  },
});
reorder.action('move-down');
const canonicalOrder = reorder.getSpec().slides.map(slide => slide.id);
const domOrder = reorder.document.querySelector('.deck').children.map(slide => slide.dataset.slideId);
assert.equal(replayed, true);
assert.notDeepEqual(domOrder, canonicalOrder);

const nestedSpec = fixture(0), nestedSecond = structuredClone(nestedSpec.slides[0]);
nestedSecond.id = 'portable-two'; nestedSpec.slides.push(nestedSecond);
const nested = mountedEditor(nestedSpec);
nested.ready();
nested.api.executeOperation({ operation: 'edit-text', target: { slideId: 'portable', elementId: 'role-title' }, value: 'prior' });
const nestedDeck = nested.document.querySelector('.deck'), insertBefore = nestedDeck.insertBefore;
let nestedReturned = false;
nestedDeck.insertBefore = function (node, next) {
  insertBefore.call(this, node, next);
  nested.api.executeOperation({ operation: 'edit-text', target: { slideId: 'portable', elementId: 'role-title' }, value: 'nested' });
  nestedReturned = true;
  throw Error('reorder post-effect');
};
assert.throws(() => nested.action('move-down'), /reorder post-effect/);
assert.equal(nestedReturned, true);
assert.equal(nested.getSpec().slides[0].content.title, 'prior');

const gesture = mountedEditor(fixture(0));
gesture.ready();
const component = gesture.component(), initialStyle = component.getAttribute('style');
gesture.begin(); gesture.update(8, 10);
const originalStyle = component.style;
let throws = 0;
component.style = new Proxy(originalStyle, { get(target, key) {
  if (key === 'setProperty') return (name, value) => {
    target.setProperty(name, value);
    if (name === 'left' && throws++ < 2) throw Error('double restore fault');
  };
  return target[key];
} });
assert.throws(() => gesture.finish(), /double restore fault/);
const finalStyle = component.getAttribute('style');
assert.notEqual(finalStyle, initialStyle);
assert.deepEqual(gesture.getSpec().slides[0].composition.geometryOverrides['portable-quote'],
  { x: 800, y: 280, width: 640, height: 480 });
assert.equal(gesture.getRevision(), 0);
assert.equal(gesture.api.getHistoryState().entries, 0);

const nestedGesture = mountedEditor(fixture(0));
nestedGesture.ready(); nestedGesture.begin(); nestedGesture.update(8, 0);
const undoButton = nestedGesture.document.querySelector('[data-action="undo"]');
let disabled = undoButton.disabled, gestureNestedReturned = false, gestureOnce = true;
Object.defineProperty(undoButton, 'disabled', { configurable: true,
  get() { return disabled; },
  set(value) {
    disabled = value;
    if (gestureOnce && nestedGesture.api.layout.getState().finishing === false) {
      gestureOnce = false;
      nestedGesture.api.executeOperation({ operation: 'edit-text', target: { slideId: 'portable', elementId: 'role-title' }, value: 'nested' });
      gestureNestedReturned = true;
      throw Error('finish control fault');
    }
  },
});
nestedGesture.finish();
assert.equal(gestureNestedReturned, true);
assert.equal(nestedGesture.getSpec().slides[0].content.title, fixture(0).slides[0].content.title);
assert.equal(nestedGesture.getRevision(), 0);

console.log(JSON.stringify({
  reorder: { replayed, canonicalOrder, domOrder, revision: reorder.getRevision(), historyEntries: reorder.api.getHistoryState().entries },
  nestedReorder: { nestedReturned, titleAfterRollback: nested.getSpec().slides[0].content.title,
    revision: nested.getRevision(), historyEntries: nested.api.getHistoryState().entries },
  gesture: { throws, initialStyle, finalStyle, revision: gesture.getRevision(), historyEntries: gesture.api.getHistoryState().entries },
  nestedGesture: { gestureNestedReturned, titleAfterRollback: nestedGesture.getSpec().slides[0].content.title,
    revision: nestedGesture.getRevision(), historyEntries: nestedGesture.api.getHistoryState().entries },
}));
