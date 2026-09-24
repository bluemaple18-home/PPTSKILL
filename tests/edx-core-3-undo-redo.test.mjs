import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createDeckEditor } from '../runtime/deck-editor.js';
import { fixture, mountedEditor } from '../tools/edx-wp1-s4-perf-mounted.mjs';
import { createEditorHistory } from '../runtime/editor-history.js';
import { extractDeckSpec } from '../runtime/deck-spec.js';
import { renderFullDeck } from '../runtime/full-deck-renderer.js';

const editor = () => createDeckEditor(fixture(0));
const title = (deck) => deck.getSpec().slides[0].content.title;
const edit = (deck, value) => deck.executeOperation({ operation: 'edit-text', target: { slideId: 'portable', elementId: 'role-title' }, value });

test('Core3 Node 單筆 operation、no-op、redo 分岔及 false barrier', () => {
  const deck = editor(), original = title(deck);
  edit(deck, '甲');
  assert.equal(deck.getHistoryState().canUndo, true);
  edit(deck, '甲');
  assert.equal(deck.getHistoryState().entries, 1);
  deck.undo();
  assert.equal(title(deck), original);
  assert.equal(deck.getHistoryState().canRedo, true);
  deck.redo();
  assert.equal(title(deck), '甲');
  deck.undo();
  edit(deck, '乙');
  assert.equal(deck.getHistoryState().canRedo, false);
  deck.undo();
  edit(deck, '丙');
  deck.editComponent('portable', 'portable-quote', { text: '直接 patch' });
  assert.equal(deck.getHistoryState().canUndo, false);
  assert.equal(deck.getHistoryState().canRedo, false);
});

test('Core3 Node 驗證失敗不動 history，20 筆 bounded', () => {
  const deck = editor();
  edit(deck, '起始');
  const before = deck.getHistoryState();
  assert.throws(() => edit(deck, null));
  assert.deepEqual(deck.getHistoryState(), before);
  for (let i = 0; i < 25; i++) edit(deck, '改' + i);
  assert.equal(deck.getHistoryState().entries, 20);
  assert.equal(deck.getHistoryState().canUndo, true);
});

test('Core3 純 history 超限 truthful degrade、失敗 replay 不移 cursor', () => {
  const history = createEditorHistory(2, 100);
  history.record({ text: 'a' }, { text: 'b' }, true);
  const before = history.state();
  assert.throws(() => history.replay('undo', () => { throw Error('projection fault'); }));
  assert.deepEqual(history.state(), before);
  history.record({ payload: 'x'.repeat(80) }, { payload: 'y'.repeat(80) }, true);
  assert.deepEqual(history.state(), { canUndo: false, canRedo: false, entries: 0, bytes: 0, oversized: true });
});

test('Core3 portable slide reorder 的 after-effect DOM throw 原子回退', () => {
  const spec = fixture(0), copy = structuredClone(spec.slides[0]);
  copy.id = 'portable-two'; spec.slides.push(copy);
  const h = mountedEditor(spec), deck = h.document.querySelector('.deck');
  const original = deck.insertBefore;
  deck.insertBefore = function (node, before) { original.call(this, node, before); throw Error('post-insert fault'); };
  assert.throws(() => h.action('move-down'), /post-insert fault/);
  assert.deepEqual(h.getSpec().slides.map(slide => slide.id), ['portable', 'portable-two']);
  assert.deepEqual(deck.children.map(slide => slide.dataset.slideId), ['portable', 'portable-two']);
  assert.equal(h.getRevision(), 0);
});

test('Core3 Repair3 gesture restore after-effect throw 回退 geometry／history', () => {
  const h = mountedEditor(fixture(0)); h.ready();
  const before = h.getSpec(), node = h.component(), style = node.style, beforeStyle = node.getAttribute('style');
  let once = true;
  node.style = new Proxy(style, { get(target, key) {
    if (key === 'setProperty') return (name, value) => {
      target.setProperty(name, value);
      if (once && name === 'left' && h.api.getHistoryState().entries === 1) {
        once = false; throw Error('post-commit restore projection fault');
      }
    };
    return target[key];
  } });
  h.begin(); h.update(8, 0);
  try { assert.notEqual(h.finish(), true); } catch (error) { assert.match(error.message, /post-commit restore projection fault/); }
  assert.deepEqual(h.getSpec(), before);
  assert.equal(node.getAttribute('style'), beforeStyle);
  assert.equal(h.getRevision(), 0);
  assert.equal(h.api.getHistoryState().entries, 0);
  assert.equal(h.api.layout.getState().gesturing, false);
});

test('Core3 Repair3 gesture 收尾投影不得同步重入 Undo', () => {
  const h = mountedEditor(fixture(0)); h.ready();
  h.api.executeOperation({ operation: 'edit-text', target: { slideId: 'portable', elementId: 'role-title' }, value: 'prior' });
  h.begin(); h.update(8, 0);
  const undo = h.document.querySelector('[data-action="undo"]');
  let disabled = undo.disabled, replayed = false, once = true;
  Object.defineProperty(undo, 'disabled', { configurable: true,
    get() { return disabled; },
    set(value) { disabled = value; if (once) { once = false; replayed = h.api.undo(); } },
  });
  h.finish();
  assert.equal(replayed, false);
  assert.equal(h.getSpec().slides[0].content.title, 'prior');
  assert.equal(h.getSpec().slides[0].composition.geometryOverrides['portable-quote'].x, 808);
  assert.equal(h.getRevision(), 2);
  assert.equal(h.api.getHistoryState().entries, 2);
});

for (const phase of ['pre-commit', 'post-commit']) test(`Core3 Repair3 ${phase} restore setter 不得重入 Undo`, () => {
  const h = mountedEditor(fixture(0)); h.ready();
  h.api.executeOperation({ operation: 'edit-text', target: { slideId: 'portable', elementId: 'role-title' }, value: 'prior' });
  h.begin(); h.update(8, 0);
  const node = h.component(), style = node.style;
  let replayed = false, once = true;
  node.style = new Proxy(style, { get(target, key) {
    if (key === 'setProperty') return (name, value) => {
      target.setProperty(name, value);
      if (once && name === 'left' && h.api.getHistoryState().entries === (phase === 'pre-commit' ? 1 : 2)) {
        once = false; replayed = h.api.undo();
      }
    };
    return target[key];
  } });
  h.finish();
  assert.equal(replayed, false);
  assert.equal(h.getSpec().slides[0].content.title, 'prior');
  assert.equal(h.getSpec().slides[0].composition.geometryOverrides['portable-quote'].x, 808);
  assert.equal(h.api.getHistoryState().entries, 2);
});

test('Core3 Repair3 成功通知 setter 不得重入 Undo', () => {
  const h = mountedEditor(fixture(0)); h.ready();
  h.api.executeOperation({ operation: 'edit-text', target: { slideId: 'portable', elementId: 'role-title' }, value: 'prior' });
  h.begin(); h.update(8, 0);
  const node = h.document.querySelector('[data-editor-status]');
  let text = node.textContent, replayed = false, once = true;
  Object.defineProperty(node, 'textContent', { configurable: true,
    get() { return text; },
    set(value) { text = value; if (once && value === '手動版面已更新') { once = false; replayed = h.api.undo(); } },
  });
  h.finish();
  assert.equal(replayed, false);
  assert.equal(h.getSpec().slides[0].content.title, 'prior');
  assert.equal(h.getSpec().slides[0].composition.geometryOverrides['portable-quote'].x, 808);
});

test('Core3 Repair3 reorder after-effect throw 不提交 pending 文字', () => {
  const spec = fixture(0), second = structuredClone(spec.slides[0]);
  second.id = 'portable-two'; spec.slides.push(second);
  const h = mountedEditor(spec), before = h.getSpec(), deck = h.document.querySelector('.deck');
  const title = h.document.querySelector('[data-pptskill-element-id="role-title"]');
  title.textContent = 'pending';
  const insertBefore = deck.insertBefore;
  deck.insertBefore = function (node, next) { insertBefore.call(this, node, next); throw Error('reorder post-effect'); };
  assert.throws(() => h.action('move-down'), /reorder post-effect/);
  assert.deepEqual(h.getSpec(), before);
  assert.deepEqual(deck.children.map(slide => slide.dataset.slideId), ['portable', 'portable-two']);
  assert.equal(title.textContent, 'pending');
  assert.equal(h.getRevision(), 0);
  assert.equal(h.api.getHistoryState().entries, 0);
});

test('Core3 Repair3 reorder 第二次回退呼叫失敗仍恢復 DOM 順序', () => {
  const spec = fixture(0), second = structuredClone(spec.slides[0]);
  second.id = 'portable-two'; spec.slides.push(second);
  const h = mountedEditor(spec), deck = h.document.querySelector('.deck'), before = h.getSpec();
  const insertBefore = deck.insertBefore;
  let calls = 0;
  deck.insertBefore = function (node, next) {
    if (++calls === 1) { insertBefore.call(this, node, next); throw Error('reorder post-effect'); }
    throw Error('rollback before-effect');
  };
  assert.throws(() => h.action('move-down'), /reorder post-effect/);
  assert.deepEqual(h.getSpec(), before);
  assert.deepEqual(deck.children.map(slide => slide.dataset.slideId), ['portable', 'portable-two']);
  assert.equal(h.getRevision(), 0);
  assert.equal(h.api.getHistoryState().entries, 0);
});

test('Core3 portable duplicate／remove after-effect throw 不留下變更', () => {
  const spec = fixture(0), second = structuredClone(spec.slides[0]); second.id = 'portable-two'; spec.slides.push(second);
  const h = mountedEditor(spec), deck = h.document.querySelector('.deck'), original = h.getSpec();
  const first = deck.children[0], after = first.after;
  first.after = function (node) { after.call(this, node); throw Error('duplicate post-effect'); };
  assert.throws(() => h.action('duplicate'), /duplicate post-effect/);
  assert.deepEqual(h.getSpec(), original);
  assert.deepEqual(deck.children.map(slide => slide.dataset.slideId), ['portable', 'portable-two']);
  assert.equal(h.getRevision(), 0);
  first.after = after;
  const remove = first.remove;
  first.remove = function () { remove.call(this); throw Error('remove post-effect'); };
  assert.throws(() => h.action('delete'), /remove post-effect/);
  assert.deepEqual(h.getSpec(), original);
  assert.deepEqual(deck.children.map(slide => slide.dataset.slideId), ['portable', 'portable-two']);
  assert.equal(h.getRevision(), 0);
});

test('Core3 portable direct component patch replaceWith after-effect throw 不留下變更', () => {
  const h = mountedEditor(fixture(0)), before = h.getSpec();
  const node = h.document.querySelector('[data-pptskill-element-id="component-portable-quote"]');
  const replaceWith = node.replaceWith;
  node.replaceWith = function (next) { replaceWith.call(this, next); throw Error('patch post-effect'); };
  assert.throws(() => h.api.applyLocalPatch({ slideId: 'portable', region: 'content.components.portable-quote', value: { text: '更新' } }), /patch post-effect/);
  assert.deepEqual(h.getSpec(), before);
  assert.equal(h.document.querySelector('[data-pptskill-element-id="component-portable-quote"]'), node);
  assert.equal(h.getRevision(), 0);
});

test('Core3 portable operation undo／redo 與 false writer barrier', () => {
  const h = mountedEditor(fixture(0)), original = h.getSpec();
  h.api.layout.setMode(true);
  const editText = value => h.api.executeOperation({ operation: 'edit-text', target: { slideId: 'portable', elementId: 'role-title' }, value });
  editText('新標題');
  assert.equal(h.api.getHistoryState().canUndo, true);
  assert.equal(h.getRevision(), 1);
  h.api.undo();
  assert.deepEqual(h.getSpec(), original);
  assert.equal(h.getRevision(), 2);
  h.api.redo();
  assert.equal(h.getSpec().slides[0].content.title, '新標題');
  assert.equal(h.getRevision(), 3);
  h.api.applyLocalPatch({ slideId: 'portable', region: 'content.components.portable-quote', value: { text: '直接修改' } });
  assert.deepEqual(h.api.getHistoryState().canUndo, false);
  assert.deepEqual(extractDeckSpec(h.api.exportHtml()), h.getSpec());
});

test('Core3 portable 成功 slide direct writer 清除歷史', () => {
  const spec = fixture(0), second = structuredClone(spec.slides[0]); second.id = 'portable-two'; spec.slides.push(second);
  const h = mountedEditor(spec); h.api.layout.setMode(true);
  const edit = value => h.api.executeOperation({ operation: 'edit-text', target: { slideId: 'portable', elementId: 'role-title' }, value });
  edit('可撤銷'); h.action('move-down');
  assert.equal(h.api.getHistoryState().canUndo, false);
  edit('再次'); h.action('duplicate');
  assert.equal(h.api.getHistoryState().canUndo, false);
  edit('再一次'); h.action('delete');
  assert.equal(h.api.getHistoryState().canUndo, false);
});

test('Core3 browser harness flag 已接線且預留正式 host 驗收', () => {
  const harness = readFileSync(new URL('../tools/edx-wp1-s4-browser-acceptance.mjs', import.meta.url), 'utf8');
  assert.match(harness, /--undo-redo-regression/);
  assert.match(harness, /if\(undoRedoRegression\)/);
  assert.match(harness, /Input\.dispatchKeyEvent/);
  const spec = JSON.parse(readFileSync(new URL('../fixtures/full-deck-spec.json', import.meta.url), 'utf8'));
  spec.slides = spec.slides.filter(slide => slide.id === 'portable');
  spec.slides[0].content.components.push({ id: 'history-a', type: 'text', text: 'A' }, { id: 'history-b', type: 'text', text: 'B' });
  spec.slides[0].composition.geometryOverrides = { 'history-a': { x: 120, y: 120, width: 180, height: 120 }, 'history-b': { x: 360, y: 120, width: 180, height: 120 } };
  assert.equal(renderFullDeck(spec).status, 'pass');
});

test('Core3 mounted toolbar、鍵盤及 input／IME／Alt ownership', () => {
  const h = mountedEditor(fixture(0)); h.api.layout.setMode(true);
  const button = name => h.document.querySelector('[data-action="' + name + '"]');
  h.api.executeOperation({ operation: 'edit-text', target: { slideId: 'portable', elementId: 'role-title' }, value: '鍵盤測試' });
  assert.equal(button('undo').disabled, false);
  const key = (target, extra = {}) => {
    const event = { target, key: 'z', ctrlKey: true, metaKey: false, altKey: false, shiftKey: false, isComposing: false, prevented: false,
      preventDefault() { this.prevented = true; }, stopImmediatePropagation() {}, ...extra };
    for (const fn of h.document.listeners.keydown || []) fn(event);
    return event;
  };
  const input = h.document.querySelector('[data-typography-size]');
  for (const extra of [{ target: input }, { isComposing: true }, { altKey: true }]) assert.equal(key(extra.target || h.document.body, extra).prevented, false);
  input.focus();
  assert.equal(h.api.undo(), false);
  h.document.body.focus();
  assert.equal(h.getSpec().slides[0].content.title, '鍵盤測試');
  assert.equal(key(h.document.body).prevented, true);
  assert.equal(button('redo').disabled, false);
  assert.equal(key(h.document.body, { shiftKey: true }).prevented, true);
  h.action('undo');
  assert.equal(h.api.getHistoryState().canRedo, true);
  assert.equal(key(h.document.body, { ctrlKey: false, metaKey: true, shiftKey: true }).prevented, true);
  h.api.layout.setMode(false);
  assert.equal(button('undo').disabled, true);
  assert.equal(key(h.document.body, { ctrlKey: false, metaKey: true }).prevented, false);
});

test('Core3 portable group／lock／geometry replay 與 large-image pointer hot path', () => {
  const spec = fixture(6);
  spec.slides[0].content.components.push({ id: 'history-a', type: 'text', text: 'A' }, { id: 'history-b', type: 'text', text: 'B' });
  Object.assign(spec.slides[0].composition.geometryOverrides, {
    'history-a': { x: 120, y: 120, width: 180, height: 120 },
    'history-b': { x: 360, y: 120, width: 180, height: 120 },
  });
  const h = mountedEditor(spec); h.api.layout.setMode(true);
  const before = h.getSpec();
  const groupTarget = { slideId: 'portable', elementIds: ['component-history-a', 'component-history-b'] };
  h.api.executeOperation({ operation: 'group-elements', target: groupTarget, value: {} });
  h.api.executeOperation({ operation: 'lock-elements', target: groupTarget, value: {} });
  h.api.undo(); h.api.undo();
  assert.deepEqual(h.getSpec(), before);
  h.api.redo(); h.api.redo();
  assert.equal(h.getSpec().slides[0].composition.lockedElementIds.length, 2);
  h.api.executeOperation({ operation: 'unlock-elements', target: groupTarget, value: {} });
  h.api.executeOperation({ operation: 'move-element', target: { slideId: 'portable', elementId: 'component-portable-quote' }, value: { x: 816, y: 280 } });
  h.api.undo();
  assert.deepEqual(h.getSpec().slides[0].composition.geometryOverrides['portable-quote'], before.slides[0].composition.geometryOverrides['portable-quote']);
  h.ready(); h.resetCounts(); h.begin(); h.update(8, 0);
  assert.equal(h.counts.payloadReads, 0);
  assert.equal(h.counts.wholeSpecSerializations, 0);
});

test('Core3 16 MiB 圖片讓單筆歷史超限時 toolbar truthful degrade', () => {
  const h = mountedEditor(fixture(16)); h.api.layout.setMode(true);
  h.api.executeOperation({ operation: 'edit-text', target: { slideId: 'portable', elementId: 'role-title' }, value: '超限提交' });
  assert.equal(h.getSpec().slides[0].content.title, '超限提交');
  assert.equal(h.api.getHistoryState().oversized, true);
  assert.equal(h.api.getHistoryState().canUndo, false);
  const button = h.document.querySelector('[data-action="undo"]');
  assert.equal(button.disabled, true);
  assert.match(button.title, /64 MiB/);
});

test('Core3 portable replay 投影 after-effect throw 保留 canonical／DOM／revision／cursor', () => {
  const h = mountedEditor(fixture(0)); h.api.layout.setMode(true);
  const target = { slideId: 'portable', elementId: 'role-title' };
  h.api.executeOperation({ operation: 'edit-text', target, value: '待復原' });
  const node = h.document.querySelector('[data-pptskill-element-id="role-title"]');
  const before = h.getSpec(), revision = h.getRevision(), state = h.api.getHistoryState(), text = node.textContent;
  const descriptor = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(node), 'textContent');
  let once = true;
  Object.defineProperty(node, 'textContent', { configurable: true, get() { return descriptor.get.call(this); }, set(value) {
    descriptor.set.call(this, value); if (once) { once = false; throw Error('history projection post-effect'); }
  } });
  assert.throws(() => h.api.undo(), /history projection post-effect/);
  assert.deepEqual(h.getSpec(), before);
  assert.equal(node.textContent, text);
  assert.equal(h.getRevision(), revision);
  assert.deepEqual(h.api.getHistoryState(), state);
});

test('Core3 portable edit-text 提交投影 after-effect throw 保留 DOM 與 history', () => {
  const h = mountedEditor(fixture(0)), before = h.getSpec(), state = h.api.getHistoryState();
  const node = h.document.querySelector('[data-pptskill-element-id="role-title"]'), text = node.textContent;
  const descriptor = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(node), 'textContent');
  let once = true;
  Object.defineProperty(node, 'textContent', { configurable: true, get() { return descriptor.get.call(this); }, set(value) {
    descriptor.set.call(this, value); if (once) { once = false; throw Error('operation post-effect'); }
  } });
  assert.throws(() => h.api.executeOperation({ operation: 'edit-text', target: { slideId: 'portable', elementId: 'role-title' }, value: '失敗提交' }), /operation post-effect/);
  assert.deepEqual(h.getSpec(), before);
  assert.equal(node.textContent, text);
  assert.equal(h.getRevision(), 0);
  assert.deepEqual(h.api.getHistoryState(), state);
});

test('Core3 Repair1 operation toolbar setter post-effect throw 不留下 entry', () => {
  const h = mountedEditor(fixture(0)); h.api.layout.setMode(true);
  const before = h.getSpec(), state = h.api.getHistoryState(), revision = h.getRevision();
  const titleNode = h.document.querySelector('[data-pptskill-element-id="role-title"]'), text = titleNode.textContent;
  const button = h.document.querySelector('[data-action="undo"]'), disabled = button.disabled, title = button.title;
  let once = true, stored = disabled;
  Object.defineProperty(button, 'disabled', { configurable: true, get() { return stored; }, set(value) { stored = value; if (once) { once = false; throw Error('toolbar commit post-effect'); } } });
  assert.throws(() => h.api.executeOperation({ operation: 'edit-text', target: { slideId: 'portable', elementId: 'role-title' }, value: '失敗' }), /toolbar commit post-effect/);
  assert.deepEqual(h.getSpec(), before); assert.equal(titleNode.textContent, text); assert.equal(h.getRevision(), revision);
  assert.deepEqual(h.api.getHistoryState(), state); assert.equal(button.disabled, disabled); assert.equal(button.title, title);
});

test('Core3 Repair1 replay toolbar setter post-effect throw 不移 cursor', () => {
  const h = mountedEditor(fixture(0)); h.api.layout.setMode(true);
  h.api.executeOperation({ operation: 'edit-text', target: { slideId: 'portable', elementId: 'role-title' }, value: '待復原' });
  const before = h.getSpec(), state = h.api.getHistoryState(), revision = h.getRevision();
  const titleNode = h.document.querySelector('[data-pptskill-element-id="role-title"]'), text = titleNode.textContent;
  const button = h.document.querySelector('[data-action="undo"]'), disabled = button.disabled;
  let writes = 0, stored = disabled;
  Object.defineProperty(button, 'disabled', { configurable: true, get() { return stored; }, set(value) { stored = value; if (++writes === 3) throw Error('toolbar replay post-effect'); } });
  assert.throws(() => h.api.undo(), /toolbar replay post-effect/);
  assert.deepEqual(h.getSpec(), before); assert.equal(titleNode.textContent, text); assert.equal(h.getRevision(), revision);
  assert.deepEqual(h.api.getHistoryState(), state); assert.equal(button.disabled, disabled);
});

test('Core3 Repair1 direct patch selection cleanup post-effect throw 回退 DOM 與選取', () => {
  const h = mountedEditor(fixture(0)); h.ready();
  const before = h.getSpec(), revision = h.getRevision(), node = h.component(), selection = h.api.layout.getSelectionState();
  const original = h.api.layout.clearSelection;
  h.api.layout.clearSelection = (...args) => { original(...args); throw Error('selection cleanup post-effect'); };
  assert.throws(() => h.api.applyLocalPatch({ slideId: 'portable', region: 'content.components.portable-quote', value: { text: '失敗 patch' } }), /selection cleanup post-effect/);
  assert.deepEqual(h.getSpec(), before); assert.equal(h.getRevision(), revision);
  assert.equal(h.component(), node); assert.deepEqual(h.api.layout.getSelectionState(), selection);
});

test('Core3 Repair1 stale component DOM patch fail closed', () => {
  const h = mountedEditor(fixture(0)), before = h.getSpec(), revision = h.getRevision(), state = h.api.getHistoryState();
  h.component().remove();
  assert.throws(() => h.api.applyLocalPatch({ slideId: 'portable', region: 'content.components.portable-quote', value: { text: 'stale patch' } }), /DOM|target|已移除/);
  assert.deepEqual(h.getSpec(), before); assert.equal(h.getRevision(), revision); assert.deepEqual(h.api.getHistoryState(), state);
});

test('Core3 Repair1 reorder／replay fault 恢復 selection 與 Moveable', () => {
  const spec = fixture(0), copy = structuredClone(spec.slides[0]); copy.id = 'portable-two'; spec.slides.push(copy);
  const h = mountedEditor(spec); h.ready();
  const selected = h.api.layout.getSelectionState(), deck = h.document.querySelector('.deck'), insert = deck.insertBefore;
  deck.insertBefore = function (node, before) { insert.call(this, node, before); throw Error('reorder post-effect'); };
  assert.throws(() => h.action('move-down'), /reorder post-effect/);
  assert.deepEqual(h.api.layout.getSelectionState(), selected);
  assert.equal(h.api.layout.getState().target?.elementId, 'component-portable-quote');
  deck.insertBefore = insert;
  h.api.executeOperation({ operation: 'edit-text', target: { slideId: 'portable', elementId: 'role-title' }, value: '待復原' });
  const refresh = h.api.layout.refresh;
  h.api.layout.refresh = () => { h.api.layout.clearSelection(); throw Error('replay selection post-effect'); };
  assert.throws(() => h.api.undo(), /replay selection post-effect/);
  assert.deepEqual(h.api.layout.getSelectionState(), selected);
  assert.equal(h.api.layout.getState().target?.elementId, 'component-portable-quote');
  h.api.layout.refresh = refresh;
});

test('Core3 Repair1 gesture begin／end／cancel 即時更新 Undo disabled', () => {
  const h = mountedEditor(fixture(0)); h.ready();
  h.api.executeOperation({ operation: 'edit-text', target: { slideId: 'portable', elementId: 'role-title' }, value: '可復原' });
  const button = h.document.querySelector('[data-action="undo"]');
  assert.equal(button.disabled, false);
  h.begin(); assert.equal(button.disabled, true);
  h.update(0, 0); h.finish(); assert.equal(button.disabled, false);
  h.begin(); assert.equal(button.disabled, true);
  h.api.layout.cancel(); assert.equal(button.disabled, false);
});

test('Core3 Repair2 gesture 結束控制列 after-effect throw 不提交，且可再次正常操作', () => {
  const h = mountedEditor(fixture(0)); h.ready();
  h.api.executeOperation({ operation: 'edit-text', target: { slideId: 'portable', elementId: 'role-title' }, value: '既有歷史' });
  const before = h.getSpec(), revision = h.getRevision(), history = h.api.getHistoryState();
  const node = h.component(), style = node.getAttribute('style'), selection = h.api.layout.getSelectionState();
  const button = h.document.querySelector('[data-action="undo"]'), redo = h.document.querySelector('[data-action="redo"]');
  const originalDisabled = button.disabled, originalTitle = button.title, redoDisabled = redo.disabled, redoTitle = redo.title;
  const vendor = h.vendor;
  h.begin(); h.update(8, 0);
  assert.notEqual(node.getAttribute('style'), style);
  let writes = 0, stored = button.disabled;
  Object.defineProperty(button, 'disabled', { configurable: true, get() { return stored; }, set(value) {
    stored = value; if (++writes === 1 && h.getRevision() === revision) throw Error('gesture toolbar post-effect');
  } });
  let result;
  try { result = h.finish(); } catch (error) { assert.match(error.message, /gesture toolbar post-effect/); }
  assert.notEqual(result, true);
  assert.deepEqual(h.getSpec(), before);
  assert.equal(node.getAttribute('style'), style);
  assert.equal(h.getRevision(), revision);
  assert.deepEqual(h.api.getHistoryState(), history);
  assert.equal(button.disabled, originalDisabled); assert.equal(button.title, originalTitle);
  assert.equal(redo.disabled, redoDisabled); assert.equal(redo.title, redoTitle);
  assert.match(h.document.querySelector('[data-editor-status]').textContent, /未套用：gesture toolbar post-effect/);
  assert.deepEqual(h.api.layout.getSelectionState(), selection);
  assert.equal(h.api.layout.getState().target?.elementId, 'component-portable-quote');
  assert.equal(h.vendor, vendor);
  h.begin(); h.update(8, 0); h.finish();
  assert.equal(h.getSpec().slides[0].composition.geometryOverrides['portable-quote'].x, 808);
  assert.match(node.getAttribute('style'), /left:808px/);
  assert.equal(h.getRevision(), revision + 1);
  assert.equal(h.api.getHistoryState().entries, history.entries + 1);
  assert.equal(button.disabled, false);
  assert.equal(redo.disabled, true);
});

test('Core3 Repair2 邊界 reorder no-op 保留選取與未同步文字', () => {
  const h = mountedEditor(fixture(0)); h.ready();
  const toolbar = h.document.querySelector('[data-pptskill-editor]');
  for (const direction of ['move-up', 'move-down']) toolbar.append(h.document.querySelector('[data-action="' + direction + '"]'));
  const before = h.getSpec(), revision = h.getRevision(), history = h.api.getHistoryState();
  const selection = h.api.layout.getSelectionState(), vendor = h.vendor;
  const titleNode = h.document.querySelector('[data-pptskill-element-id="role-title"]');
  titleNode.textContent = '尚未同步的文字';
  for (const direction of ['move-up', 'move-down']) {
    h.action(direction);
    assert.deepEqual(h.getSpec(), before);
    assert.equal(h.getRevision(), revision);
    assert.deepEqual(h.api.getHistoryState(), history);
    assert.equal(titleNode.textContent, '尚未同步的文字');
    assert.deepEqual(h.api.layout.getSelectionState(), selection);
    assert.equal(h.api.layout.getState().target?.elementId, 'component-portable-quote');
    assert.equal(h.vendor, vendor);
  }
});

test('Core3 Repair2 gesture 成功通知 after-effect throw 不留下失敗提交', () => {
  const h = mountedEditor(fixture(0)); h.ready();
  const before = h.getSpec(), revision = h.getRevision(), history = h.api.getHistoryState();
  const node = h.component(), style = node.getAttribute('style'), selection = h.api.layout.getSelectionState();
  const status = h.document.querySelector('[data-editor-status]');
  const undo = h.document.querySelector('[data-action="undo"]'), redo = h.document.querySelector('[data-action="redo"]');
  const controls = [undo.disabled, undo.title, redo.disabled, redo.title];
  h.begin(); h.update(8, 0);
  const descriptor = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(status), 'textContent');
  let once = true;
  Object.defineProperty(status, 'textContent', { configurable: true, get() { return descriptor.get.call(this); }, set(value) {
    descriptor.set.call(this, value);
    if (once && value === '手動版面已更新') { once = false; throw Error('gesture success status post-effect'); }
  } });
  try { assert.notEqual(h.finish(), true); } catch (error) { assert.match(error.message, /gesture success status post-effect/); }
  assert.deepEqual(h.getSpec(), before);
  assert.equal(node.getAttribute('style'), style);
  assert.equal(h.getRevision(), revision);
  assert.deepEqual(h.api.getHistoryState(), history);
  assert.deepEqual([undo.disabled, undo.title, redo.disabled, redo.title], controls);
  assert.deepEqual(h.api.layout.getSelectionState(), selection);
  assert.equal(h.api.layout.getState().target?.elementId, 'component-portable-quote');
  assert.match(status.textContent, /未套用：gesture success status post-effect/);
  h.begin(); h.update(8, 0); h.finish();
  assert.equal(h.getSpec().slides[0].composition.geometryOverrides['portable-quote'].x, 808);
  assert.equal(h.getRevision(), revision + 1);
  assert.equal(h.api.getHistoryState().entries, history.entries + 1);
  assert.equal(status.textContent, '手動版面已更新');
});

test('Core3 Repair2 vendor updateRect after-effect throw 不留下提交或過期投影', () => {
  const h = mountedEditor(fixture(0)); h.ready();
  h.api.executeOperation({ operation: 'edit-text', target: { slideId: 'portable', elementId: 'role-title' }, value: '既有歷史' });
  const before = h.getSpec(), revision = h.getRevision(), history = h.api.getHistoryState();
  const node = h.component(), style = node.getAttribute('style'), selection = h.api.layout.getSelectionState();
  const undo = h.document.querySelector('[data-action="undo"]'), redo = h.document.querySelector('[data-action="redo"]');
  const controls = [undo.disabled, undo.title, redo.disabled, redo.title];
  const vendor = h.vendor, original = vendor.updateRect;
  let once = true;
  vendor.projectedX = 800;
  vendor.updateRect = function () {
    original.call(this);
    this.projectedX = Number(/left:(\d+)px/.exec(node.getAttribute('style'))?.[1]);
    if (once) { once = false; throw Error('vendor updateRect post-effect'); }
  };
  h.begin(); h.update(8, 0);
  assert.throws(() => h.finish(), /vendor updateRect post-effect/);
  assert.deepEqual(h.getSpec(), before);
  assert.equal(node.getAttribute('style'), style);
  assert.equal(vendor.projectedX, 800);
  assert.equal(h.getRevision(), revision);
  assert.deepEqual(h.api.getHistoryState(), history);
  assert.deepEqual([undo.disabled, undo.title, redo.disabled, redo.title], controls);
  assert.deepEqual(h.api.layout.getSelectionState(), selection);
  assert.equal(h.api.layout.getState().target?.elementId, 'component-portable-quote');
  assert.equal(h.vendor, vendor);
  assert.match(h.document.querySelector('[data-editor-status]').textContent, /未套用：vendor updateRect post-effect/);
  h.begin(); h.update(8, 0); h.finish();
  assert.equal(h.getSpec().slides[0].composition.geometryOverrides['portable-quote'].x, 808);
  assert.equal(vendor.projectedX, 808);
  assert.equal(h.getRevision(), revision + 1);
  assert.equal(h.api.getHistoryState().entries, history.entries + 1);
});
