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
      () => h.api.prepareExport(), () => h.api.exportHtml(), () => h.api.getSizeReport()]) {
      assert.throws(invoke, /同步交易/); checked++;
    }
    assert.equal(h.api.undo(), false); assert.equal(h.api.redo(), false);
    assert.equal(h.api.download(), false); assert.match(h.document.querySelector('[data-editor-status]').textContent, /同步交易/);
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
  assert.equal(entered, true); assert.equal(checked, 8); assert.equal(getters, 0);
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

test('交易邊界：UI 字級 handler catch after-effect error 仍完整回退', () => {
  const h = mountedEditor(fixture(0)); h.action('edit');
  const title = h.document.querySelector('[data-pptskill-element-id="role-title"]');
  for (const listener of h.document.body.listeners.focusin || []) listener({ target: title });
  const input = h.document.querySelector('[data-typography-size]'); input.value = '40';
  const before = state(h), style = title.getAttribute('style'); let value = input.value, injected = false;
  Object.defineProperty(input, 'value', { configurable: true, get: () => value, set(next) {
    value = next;
    if (!injected && next === '40') { injected = true; throw Error('UI typography after-effect'); }
  } });
  h.action('apply-typography');
  assert.equal(injected, true); assert.deepEqual(state(h), before); assert.equal(title.getAttribute('style'), style);
  assert.match(h.document.querySelector('[data-editor-status]').textContent, /UI typography after-effect/);
});

test('交易邊界：IME 提交的最後 status after-effect fault 不得留下提交', () => {
  const h = mountedEditor(fixture(0)); h.action('edit');
  const title = h.document.querySelector('[data-pptskill-element-id="role-title"]');
  for (const listener of h.document.body.listeners.compositionstart || []) listener({ target: title });
  title.textContent = 'IME pending'; const before = state(h), failure = Error('IME final status');
  let injected = false;
  statusHook(h, value => { if (!injected && value === '文字已更新') { injected = true; throw failure; } });
  assert.throws(() => { for (const listener of h.document.body.listeners.compositionend || []) listener({ target: title }); }, error => error === failure);
  assert.equal(injected, true); assert.deepEqual(state(h), before); assert.equal(title.textContent, 'IME pending');
});

const modeState = h => ({ mode: h.document.body.dataset.editorMode,
  controls: ['edit', 'layout', 'initialize-layout'].map(action => {
    const node = h.document.querySelector(`[data-action="${action}"]`);
    return [node.textContent, node.getAttribute('aria-pressed'), node.hidden];
  }), editable: h.document.querySelectorAll('[data-edit-kind="text"]').map(node => node.contentEditable) });

for (const on of [true, false]) test(`R06 public setMode(${on}) 終態 fault 回復文字、mode、selection 並可再操作`, () => {
  const h = mountedEditor(fixture(0));
  if (on) h.action('edit'); else h.ready();
  const title = h.document.querySelector('[data-pptskill-element-id="role-title"]');
  if (on) title.textContent = 'pending layout text';
  const pending = title.textContent, before = state(h), mode = modeState(h), failure = Error('layout final status fault');
  let injected = false, nestedRejected = false;
  statusHook(h, value => {
    if (!injected && value === (on ? '點選元件或拖曳空白區框選多個元件' : '可直接播放')) {
      injected = true;
      try { h.api.executeOperation(edit('nested')); } catch (error) { nestedRejected = /同步交易/.test(error.message); }
      throw failure;
    }
  });
  assert.throws(() => h.api.layout.setMode(on), error => error === failure);
  assert.equal(injected, true); assert.equal(nestedRejected, true);
  assert.deepEqual(state(h), before); assert.deepEqual(modeState(h), mode); assert.equal(title.textContent, pending);
  if (on) { h.api.layout.setMode(true); assert.equal(h.getSpec().slides[0].content.title, pending); h.click(h.component()); }
  assert.equal(h.vendor.destroyed, false); h.begin(); h.update(8, 0); h.finish();
  assert.equal(h.getSpec().slides[0].composition.geometryOverrides['portable-quote'].x, 808);
});

const r06FamilyFixture = () => {
  const spec = fixture(0), slide = spec.slides[0];
  slide.content.components.push({ id: 'group-text', type: 'text', text: 'G' });
  Object.assign(slide.composition.geometryOverrides, {
    'group-text': { x: 120, y: 120, width: 200, height: 160 },
    'perf-image': { x: 420, y: 320, width: 300, height: 200 },
  });
  return spec;
};
const r06Key = h => {
  const event = { target: h.document.body, key: 'ArrowRight', preventDefault() {}, stopImmediatePropagation() { this.stopped = true; } };
  for (const listener of h.document.listeners.keydown || []) { listener(event); if (event.stopped) break; }
};
for (const [action, success] of [
  ['group-elements', '已群組'], ['ungroup-elements', '已解組'], ['lock-elements', '已鎖定'], ['unlock-elements', '已解鎖'],
  ['align-left', '已對齊 2 個元件'], ['distribute-horizontal-gaps', '已均分 3 個元件'],
  ['initialize-layout', '已套用預設手動位置與尺寸'], ['nudge', '手動版面已更新'],
]) test(`R06 ${action} 最後 notify after-effect fault 不保留提交`, () => {
  const spec = r06FamilyFixture(); if (action === 'initialize-layout') delete spec.slides[0].composition.geometryOverrides['portable-quote'];
  const h = mountedEditor(spec); h.api.layout.setMode(true);
  if (['initialize-layout', 'nudge'].includes(action)) h.click(h.component());
  else {
    h.click(h.document.querySelector('[data-pptskill-element-id="component-group-text"]'));
    h.click(h.document.querySelector('[data-pptskill-element-id="component-perf-image"]'), { shiftKey: true });
    if (action === 'distribute-horizontal-gaps') h.click(h.component(), { shiftKey: true });
    if (action === 'ungroup-elements') h.action('group-elements');
    if (action === 'unlock-elements') h.action('lock-elements');
  }
  const before = state(h), mode = modeState(h), target = JSON.stringify(h.api.layout.getState().target);
  const nodes = h.document.querySelectorAll('[data-pptskill-element-id]'); assert.ok(nodes.length > 0);
  const styles = nodes.map(node => node.getAttribute('style')); let injected = false, nestedRejected = false;
  const failure = Error(action + ' final status fault');
  statusHook(h, value => {
    if (!injected && value === success) {
      injected = true;
      try { h.api.executeOperation(edit('nested')); } catch (error) { nestedRejected = /同步交易/.test(error.message); }
      throw failure;
    }
  });
  const run = () => action === 'nudge' ? r06Key(h) : h.action(action);
  run(); assert.equal(injected, true); assert.equal(nestedRejected, true);
  assert.match(h.document.querySelector('[data-editor-status]').textContent, new RegExp(failure.message));
  assert.deepEqual(state(h), before); assert.deepEqual(modeState(h), mode);
  assert.equal(JSON.stringify(h.api.layout.getState().target), target);
  assert.deepEqual(nodes.map(node => node.getAttribute('style')), styles);
  run(); assert.equal(h.getRevision(), before.revision + 1);
  assert.equal(h.document.querySelector('[data-editor-status]').textContent, success);
  if (['group-elements', 'initialize-layout', 'nudge'].includes(action)) {
    assert.equal(h.vendor.destroyed, false); const kind = action === 'group-elements' ? 'dragGroup' : 'drag';
    h.begin(kind); h.update(8, 0, kind); h.finish(kind);
    assert.equal(h.getRevision(), before.revision + 2);
  }
});

for (const snap of [false, true]) test(`R06 active preview setMode(false) fault 不復活 preview 或 gesture（snap=${snap}）`, () => {
  const h = mountedEditor(fixture(0)); h.ready(); if (snap) h.action('snap-layout');
  const before = state(h), mode = modeState(h), style = h.component().getAttribute('style');
  h.begin(); h.update(32, 16, 'drag', snap ? { left: 832, top: 296 } : {}); assert.notEqual(h.component().getAttribute('style'), style);
  const failure = Error('cancelled mode final fault'); let injected = false;
  statusHook(h, value => { if (!injected && value === '可直接播放') { injected = true; throw failure; } });
  assert.throws(() => h.api.layout.setMode(false), error => error === failure);
  assert.equal(injected, true); assert.deepEqual(state(h), before); assert.deepEqual(modeState(h), mode);
  assert.equal(h.component().getAttribute('style'), style); assert.equal(h.api.layout.getState().gesturing, false);
  assert.equal(h.vendor.destroyed, false); assert.equal(h.vendor.options.target.isConnected, true); h.finish(); assert.deepEqual(state(h), before);
  h.begin(); h.update(8, 0, 'drag', snap ? { left: 808, top: 280 } : {}); h.finish();
  assert.equal(h.getSpec().slides[0].composition.geometryOverrides['portable-quote'].x, 808);
});

for (const snap of [false, true]) for (const entry of ['api', 'click']) test(`R07 cancel projector fault 回 canonical、不中途開放寫入（snap=${snap}, ${entry}）`, () => {
  const h = mountedEditor(fixture(0)); h.ready(); if (snap) h.action('snap-layout');
  const node = h.component(), style = node.getAttribute('style'), before = state(h), mode = modeState(h);
  const proxy = snap && h.vendor.options.target, proxyStyle = proxy && proxy.getAttribute('style');
  h.begin(); h.update(8, 10, 'drag', snap ? { left: 808, top: 290 } : {});
  assert.notEqual(node.getAttribute('style'), style); assert.equal(node.style.top, '290px');
  const base = node.style, failure = Error('cancel projection fault'); let injected = false, nestedRejected = false;
  node.style = new Proxy(base, { get(target, key) {
    if (key === 'setProperty') return (name, value) => {
      target.setProperty(name, value);
      if (!injected && name === 'left') {
        injected = true;
        try { h.api.executeOperation(edit('nested cancellation')); } catch (error) { nestedRejected = /同步交易/.test(error.message); }
        throw failure;
      }
    };
    return target[key];
  } });
  assert.throws(() => entry === 'api' ? h.api.layout.setMode(false) : h.action('layout'), error => error === failure);
  assert.equal(injected, true); assert.equal(nestedRejected, true);
  assert.deepEqual(state(h), before); assert.deepEqual(modeState(h), mode);
  assert.equal(node.getAttribute('style'), style); if (proxy) assert.equal(proxy.getAttribute('style'), proxyStyle);
  assert.equal(h.api.layout.getState().gesturing, false); assert.equal(h.vendor.destroyed, false);
  h.finish(); assert.deepEqual(state(h), before);
  h.api.executeOperation(edit('after cancel fault')); assert.equal(h.getRevision(), before.revision + 1);
  h.begin(); h.update(8, 0, 'drag', snap ? { left: 808, top: 280 } : {}); h.finish();
  assert.equal(h.getSpec().slides[0].composition.geometryOverrides['portable-quote'].x, 808);
});

test('R07 cancel attribute fallback 不可驗證時 fail-closed，gesture 不復活', () => {
  const h = mountedEditor(fixture(0)); h.ready(); h.action('snap-layout');
  const node = h.component(), before = state(h); h.begin(); h.update(8, 10, 'drag', { left: 808, top: 290 });
  assert.equal(node.style.top, '290px');
  const base = node.style, setAttribute = node.setAttribute, failure = Error('cancel projection fault');
  let injected = false, fallbackAttempts = 0;
  node.style = new Proxy(base, { get(target, key) {
    if (key === 'setProperty') return (name, value) => { target.setProperty(name, value); if (!injected && name === 'left') { injected = true; throw failure; } };
    return target[key];
  } });
  node.setAttribute = function (name, value) { if (name === 'style') { fallbackAttempts++; throw Error('attribute fallback unavailable'); } return setAttribute.call(this, name, value); };
  let caught; try { h.api.layout.setMode(false); } catch (error) { caught = error; }
  assert.equal(injected, true); assert.deepEqual(state(h), before); assert.equal(h.api.layout.getState().gesturing, false);
  assert.throws(() => h.api.executeOperation(edit('must stay blocked')), /rollback failed/);
  assert.match(caught.message, /rollback failed/); assert.equal(caught.cause, failure); assert.ok(fallbackAttempts > 0);
  assert.equal(h.api.undo(), false); assert.throws(() => h.api.layout.setMode(false), /rollback failed/);
  let reads = 0; const request = new Proxy({}, { get() { reads++; throw Error('payload read'); } });
  assert.throws(() => h.api.executeOperation(request), /rollback failed/); assert.equal(reads, 0);
  h.finish(); assert.deepEqual(state(h), before);
});
