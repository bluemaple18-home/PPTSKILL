import test from 'node:test';
import assert from 'node:assert/strict';
import { fixture, mountedEditor } from '../tools/edx-wp1-s4-perf-mounted.mjs';
import { createDeckEditor } from '../runtime/deck-editor.js';

const edit = value => ({ operation: 'edit-text', target: { slideId: 'portable', elementId: 'role-title' }, value });
const twoSlides = () => { const spec = fixture(0), second = structuredClone(spec.slides[0]); second.id = 'portable-two'; spec.slides.push(second); return spec; };
const statusHook = (h, hook) => {
  const node = h.document.querySelector('[data-editor-status]'); let value = node.textContent;
  Object.defineProperty(node, 'textContent', { configurable: true, get: () => value, set(next) { value = next; hook(next); } });
};
const state = h => ({ spec: h.getSpec(), revision: h.getRevision(), history: JSON.parse(JSON.stringify(h.api.getHistoryState())),
  order: h.document.querySelector('.deck').children.map(n => n.dataset.slideId),
  selection: JSON.parse(JSON.stringify(h.api.layout.getSelectionState())) });

test('交易邊界：reorder pending text 的 status 不得重入 Undo', () => {
  const h = mountedEditor(twoSlides()); h.ready();
  h.document.querySelector('[data-pptskill-element-id="role-title"]').textContent = 'pending';
  let replayed, calls = 0;
  statusHook(h, value => { if (value === '已調整順序') { calls++; replayed = h.api.undo(); } });
  h.action('move-down');
  assert.equal(calls, 1); assert.equal(replayed, false);
  assert.deepEqual(state(h).order, h.getSpec().slides.map(s => s.id));
  assert.equal(h.getSpec().slides[1].content.title, 'pending');
  assert.equal(h.api.getHistoryState().entries, 0);
});

test('交易邊界：reorder after-effect callback 不得先成功再被 rollback 抹除', () => {
  const h = mountedEditor(twoSlides()); h.ready(); h.api.executeOperation(edit('prior'));
  const before = state(h), deck = h.document.querySelector('.deck'), insert = deck.insertBefore;
  let nestedReturned = false, rejected = false;
  deck.insertBefore = function (node, next) {
    insert.call(this, node, next);
    try { h.api.executeOperation(edit('nested')); nestedReturned = true; } catch { rejected = true; }
    throw Error('reorder post-effect');
  };
  assert.throws(() => h.action('move-down'), /reorder post-effect/);
  assert.equal(nestedReturned, false); assert.equal(rejected, true); assert.deepEqual(state(h), before);
});

test('交易邊界：double projection fault 回復 preview 前的 attribute', () => {
  const h = mountedEditor(fixture(0)); h.ready(); const before = state(h), node = h.component(), initial = node.getAttribute('style');
  h.begin(); h.update(8, 10);
  const style = node.style; let faults = 0;
  node.style = new Proxy(style, { get(target, key) {
    if (key === 'setProperty') return (name, value) => { target.setProperty(name, value); if (name === 'left' && faults++ < 2) throw Error('double restore fault'); };
    return target[key];
  } });
  try { h.finish(); } catch (error) { assert.match(error.message, /double restore fault/); }
  assert.equal(node.getAttribute('style'), initial); assert.deepEqual(state(h), before);
  assert.equal(h.api.layout.getState().finishing, false);
});

test('交易邊界：終態 enabled controls 仍持 finishing／owner，throw 必須 rollback', () => {
  const h = mountedEditor(fixture(0)); h.ready(); const before = state(h), initial = h.component().getAttribute('style');
  h.begin(); h.update(8, 0);
  const undo = h.document.querySelector('[data-action="undo"]'); let disabled = undo.disabled, once = true, nestedReturned = false, finishing;
  Object.defineProperty(undo, 'disabled', { configurable: true, get: () => disabled, set(value) {
    disabled = value;
    if (once && value === false) {
      once = false; finishing = h.api.layout.getState().finishing;
      try { h.api.executeOperation(edit('nested')); nestedReturned = true; } catch {}
      throw Error('finish control fault');
    }
  } });
  try { h.finish(); } catch (error) { assert.match(error.message, /finish control fault/); }
  assert.equal(once, false); assert.equal(finishing, true); assert.equal(nestedReturned, false);
  assert.deepEqual(state(h), before); assert.equal(h.component().getAttribute('style'), initial);
});

for (const phase of ['reorder', 'finish']) test(`交易邊界：${phase} 所有 public 入口先拒絕、再讀 payload`, async () => {
  const h = mountedEditor(twoSlides()); h.ready(); h.api.executeOperation(edit('prior'));
  let entered = false, getters = 0, checked = 0; const promises = [];
  const probe = () => {
    if (entered) return; entered = true;
    const payload = new Proxy({}, { get() { getters++; throw Error('payload 不可讀取'); }, ownKeys() { getters++; return []; } });
    for (const invoke of [() => h.api.executeOperation(payload), () => h.api.applyLocalPatch(payload),
      () => h.api.layout.setMode(false), () => h.api.layout.clearSelection(), () => h.api.layout.refresh(),
      () => h.api.prepareExport(), () => h.api.exportHtml(), () => h.api.getSizeReport(), () => h.api.download()]) {
      assert.throws(invoke, /同步交易/); checked++;
    }
    assert.equal(h.api.undo(), false); assert.equal(h.api.redo(), false);
    const snapshot = state(h);
    h.click(h.document.querySelector('[data-slide-id="portable-two"]')); h.action('edit'); h.action('duplicate'); h.action('delete');
    h.selecto.handlers.selectEnd({ get selected() { getters++; return []; } });
    assert.deepEqual(state(h), snapshot);
    h.vendor.handlers.dragStart({ get inputEvent() { getters++; return {}; } });
    promises.push(assert.rejects(h.api.replaceImageFile(payload, payload), /同步交易/), assert.rejects(h.api.insertImageFile(payload, payload), /同步交易/));
  };
  if (phase === 'reorder') { statusHook(h, value => { if (value === '已調整順序') probe(); }); h.action('move-down'); }
  else { h.begin(); h.update(8, 0); statusHook(h, value => { if (value === '手動版面已更新') probe(); }); h.finish(); }
  await Promise.all(promises);
  assert.equal(entered, true); assert.equal(checked, 9); assert.equal(getters, 0);
  assert.equal(h.getSpec().slides.find(s => s.id === 'portable').content.title, 'prior');
});

test('交易邊界：checkpoint fallback 本身無法驗證時鎖住 mutation 與 gesture', () => {
  const h = mountedEditor(fixture(0)); h.ready(); const before = state(h), node = h.component();
  h.begin(); h.update(8, 10);
  const style = node.style, setAttribute = node.setAttribute;
  node.style = new Proxy(style, { get(target, key) {
    if (key === 'setProperty') return (name, value) => { target.setProperty(name, value); if (name === 'left') throw Error('persistent projector fault'); };
    return target[key];
  } });
  node.setAttribute = function (key, value) { if (key === 'style') throw Error('checkpoint fault'); return setAttribute.call(this, key, value); };
  assert.throws(() => h.finish(), /rollback failed/);
  assert.deepEqual(h.getSpec(), before.spec); assert.equal(h.getRevision(), before.revision);
  assert.deepEqual(JSON.parse(JSON.stringify(h.api.getHistoryState())), before.history);
  let reads = 0;
  assert.throws(() => h.api.executeOperation({ get operation() { reads++; return 'edit-text'; } }), /rollback failed/);
  assert.throws(() => h.api.layout.setMode(false), /rollback failed/);
  assert.equal(h.api.undo(), false); h.vendor.handlers.dragStart({ get inputEvent() { reads++; return {}; } });
  assert.equal(reads, 0); assert.equal(h.api.layout.getState().gesturing, false);
});

test('交易邊界：Node payload getter 重入遭拒，private paste-style 保留', () => {
  const api = createDeckEditor(fixture(0)); let rejected = 0;
  const target = edit('').target;
  const request = new Proxy(edit('outer'), { get(object, key) { if (key === 'operation') { assert.throws(() => api.executeOperation(edit('nested')), /同步交易/); assert.equal(api.undo(), false); rejected++; } return object[key]; } });
  api.executeOperation(request); assert.ok(rejected > 0); assert.equal(api.getSpec().slides[0].content.title, 'outer');
  api.executeOperation({ operation: 'set-typography', target, value: { fontSize: 40 } });
  api.executeOperation({ operation: 'copy-style', target, value: {} });
  api.executeOperation({ operation: 'set-typography', target, value: { fontSize: 60 } });
  api.executeOperation({ operation: 'paste-style', target, value: {} });
  assert.equal(api.getSpec().slides[0].composition.typographyOverrides['role-title'].fontSize, 40);
});

test('交易邊界：portable private paste-style 與 undo／redo 相容', () => {
  const h = mountedEditor(fixture(0)); h.action('edit'); const node = h.document.querySelector('[data-pptskill-element-id="role-title"]');
  for (const fn of h.document.body.listeners.focusin || []) fn({ target: node });
  const target = edit('').target;
  h.api.executeOperation({ operation: 'set-typography', target, value: { fontSize: 40 } });
  h.api.executeOperation({ operation: 'copy-style', target, value: {} });
  h.api.executeOperation({ operation: 'set-typography', target, value: { fontSize: 60 } });
  h.api.executeOperation({ operation: 'paste-style', target, value: {} });
  assert.equal(h.getSpec().slides[0].composition.typographyOverrides['role-title'].fontSize, 40);
  h.api.executeOperation(edit('undo text')); assert.equal(h.api.undo(), true); assert.equal(h.api.redo(), true);
});

test('交易邊界：invalid component patch 保留已同步的 pending text', () => {
  const h = mountedEditor(fixture(0)); h.ready();
  h.document.querySelector('[data-pptskill-element-id="role-title"]').textContent = 'pending text';
  assert.throws(() => h.api.applyLocalPatch({ slideId: 'portable', region: 'content.components.perf-image', value: { dataUri: 'invalid' } }));
  assert.equal(h.getSpec().slides[0].content.title, 'pending text'); assert.equal(h.getRevision(), 1);
});

test('交易邊界：mode status after-effect throw 還原 controls 與 mode', () => {
  const h = mountedEditor(fixture(0)); h.ready(); const before = state(h);
  const edit = h.document.querySelector('[data-action="edit"]'), layout = h.document.querySelector('[data-action="layout"]');
  const controls = [edit.textContent, layout.textContent, layout.getAttribute('aria-pressed')]; let once = true;
  statusHook(h, value => { if (once && value === '正在編輯') { once = false; throw Error('mode projection fault'); } });
  assert.throws(() => h.action('edit'), /mode projection fault/);
  assert.deepEqual(state(h), before); assert.equal(h.document.body.dataset.editorMode, 'layout');
  assert.deepEqual([edit.textContent, layout.textContent, layout.getAttribute('aria-pressed')], controls);
});

test('交易邊界：async adapter 同步 optimizer 與完成通知都持 owner', async () => {
  const h = mountedEditor(fixture(0)); h.ready(); const before = state(h); let resolve, rejected = 0;
  h.assets.optimizeFile = () => { assert.throws(() => h.api.executeOperation(edit('nested')), /同步交易/); rejected++; return new Promise(done => { resolve = done; }); };
  const pending = h.api.replaceImageFile({});
  // await 期間沒有同步 owner；captured target 於完成時重驗。
  h.api.executeOperation(edit('during await'));
  let once = true;
  statusHook(h, value => { if (once && value === '圖片已替換') { once = false; assert.throws(() => h.api.executeOperation(edit('nested completion')), /同步交易/); rejected++; throw Error('adapter final status'); } });
  resolve({ dataUri: 'data:image/png;base64,BBBB', warnings: [], optimized: false });
  await assert.rejects(pending, /adapter final status/);
  assert.equal(rejected, 2); assert.equal(h.getSpec().slides[0].content.title, 'during await');
  assert.deepEqual(h.getSpec().slides[0].content.components, before.spec.slides[0].content.components);
  assert.equal(h.api.undo(), true);
});

test('交易邊界：finish 第一次 identity read 已持 owner', () => {
  const h = mountedEditor(fixture(0)); h.ready(); h.begin(); h.update(8, 0);
  const node = h.component(), descriptor = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(node), 'isConnected');
  let probed = false, nestedReturned = false;
  Object.defineProperty(node, 'isConnected', { configurable: true, get() {
    if (!probed && h.api.layout.getState().finishing) { probed = true; try { h.api.executeOperation(edit('nested identity')); nestedReturned = true; } catch {} }
    return descriptor.get.call(this);
  } });
  h.finish(); assert.equal(probed, true); assert.equal(nestedReturned, false);
  assert.equal(h.getSpec().slides[0].composition.geometryOverrides['portable-quote'].x, 808);
});

for (const kind of ['scroll', 'resize', 'pointerdown']) test(`交易邊界：大 payload 的 ${kind} observation 不取全量 snapshot`, () => {
  const h = mountedEditor(fixture(8)); h.ready(); h.begin(); h.update(8, 0); h.resetCounts();
  const surface = kind === 'pointerdown' ? h.document : h.window;
  for (const handler of surface.listeners[kind] || []) handler({ target: h.component(), isTrusted: false });
  assert.equal(h.counts.payloadReads, 0); assert.equal(h.counts.wholeSpecSerializations, 0);
});
