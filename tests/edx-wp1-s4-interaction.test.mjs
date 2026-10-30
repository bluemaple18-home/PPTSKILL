import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createComponentInteraction } from '../runtime/component-interaction.js';
import { createDeckEditor } from '../runtime/deck-editor.js';

const fixture = JSON.parse(await readFile(new URL('../fixtures/full-deck-spec.json', import.meta.url), 'utf8'));
const target = { slideId: 'portable', elementId: 'component-portable-quote' };
const base = { x: 800, y: 280, width: 640, height: 480 };
function harness() {
  const editor = createDeckEditor(fixture), calls = [], previews = [], notices = [];
  let token = {}, restores = 0;
  const readTarget = t => {
    if (t?.slideId !== target.slideId || t?.elementId !== target.elementId) return null;
    const spec = editor.getSpec(), slide = spec.slides.find(s => s.id === t.slideId);
    if (!slide) return null;
    return { rect: slide.composition.geometryOverrides?.['portable-quote'], token, revision: JSON.stringify(spec) };
  };
  const adapter = createComponentInteraction({ readTarget,
    executeOperation: request => { calls.push(request); return editor.executeOperation(request); },
    preview: (_target, box) => previews.push(box), restore: () => restores++, notify: m => notices.push(m),
  });
  return { editor, adapter, calls, previews, notices, replace: () => { token = {}; }, restores: () => restores,
    rect: () => readTarget(target)?.rect, ready: () => { adapter.setMode(true); adapter.select(target); adapter.initialize(); calls.length = 0; } };
}
test('mode/select 不寫 spec；legacy 明示初始化只呼叫一次既有 operation', () => {
  const h = harness(), before = h.editor.getSpec();
  h.adapter.setMode(true); h.adapter.select(target);
  assert.deepEqual(h.editor.getSpec(), before);
  assert.equal(h.adapter.begin('drag', { x: 10, y: 10 }, 0.8), false);
  assert.equal(h.calls.length, 0);
  h.adapter.initialize(); assert.deepEqual(h.rect(), base); assert.equal(h.calls.length, 1);
  h.adapter.initialize(); assert.equal(h.calls.length, 1);
  h.adapter.setMode(false); assert.equal(h.adapter.getState().target, null);
});
for (const scale of [0.8, 1]) test(`scale ${scale} drag/SE resize preview ephemeral，release 至多一次`, () => {
  const h = harness(); h.ready();
  assert.equal(h.adapter.begin('drag', { x: 100, y: 100 }, scale), true);
  h.adapter.update({ x: 100 + 20 * scale, y: 100 + 10 * scale });
  assert.deepEqual(h.rect(), base); assert.equal(h.calls.length, 0);
  h.adapter.finish(); h.adapter.finish();
  assert.deepEqual(h.rect(), { ...base, x: 820, y: 290 }); assert.equal(h.calls.length, 1);
  h.adapter.begin('resize', { x: 100, y: 100 }, scale);
  h.adapter.update({ x: 100 - 40 * scale, y: 100 - 80 * scale }); h.adapter.finish();
  assert.deepEqual(h.rect(), { x: 820, y: 290, width: 600, height: 400 });
  assert.equal(h.calls.length, 2); assert.equal(h.calls[1].operation, 'resize-element');
});
test('no-op/cancel/mode/stale/target replacement 不提交；invalid 原子拒絕', () => {
  for (const reason of ['noop', 'cancel', 'mode', 'stale', 'replacement', 'invalid', 'nan']) {
    const h = harness(); h.ready(); const before = h.editor.getSpec();
    h.adapter.begin('drag', { x: 100, y: 100 }, 0.8);
    if (reason !== 'noop') h.adapter.update({ x: reason === 'nan' ? NaN : reason === 'invalid' ? -800 : 116, y: 108 });
    if (reason === 'cancel') h.adapter.cancel();
    if (reason === 'mode') h.adapter.setMode(false);
    if (reason === 'replacement') h.replace();
    if (reason === 'stale') h.editor.executeOperation({ operation: 'edit-text', target: { ...target, elementId: 'role-title' }, value: '外部更新' });
    const expected = reason === 'stale' ? h.editor.getSpec() : before;
    h.adapter.finish();
    assert.deepEqual(h.editor.getSpec(), expected, reason);
    assert.equal(h.calls.length, ['invalid', 'nan'].includes(reason) ? 1 : 0, reason);
    assert.ok(h.restores() > 0);
    if (['invalid', 'nan'].includes(reason)) assert.ok(h.notices.length > 0);
  }
});
test('SE resize 小於 minimum 原子拒絕；非 component / play 不啟動', () => {
  const h = harness(); h.ready();
  h.adapter.begin('resize', { x: 0, y: 0 }, 1); h.adapter.update({ x: -600, y: 0 }); h.adapter.finish();
  assert.deepEqual(h.rect(), base); assert.equal(h.calls.length, 1);
  h.adapter.select({ ...target, elementId: 'role-title' });
  assert.equal(h.adapter.begin('drag', { x: 0, y: 0 }, 1), false);
  h.adapter.setMode(false); h.adapter.select(target); assert.equal(h.adapter.getState().target, null);
});

test('stale target 刪除不提交；切選取取消 preview', () => {
  const h = harness(); h.ready();
  h.adapter.begin('drag', { x: 0, y: 0 }, 1); h.adapter.update({ x: 20, y: 20 });
  h.editor.delete(h.editor.getSpec().slides.findIndex(s => s.id === 'portable'));
  const deleted = h.editor.getSpec(); h.adapter.finish();
  assert.deepEqual(h.editor.getSpec(), deleted); assert.equal(h.calls.length, 0);
  const second = harness(); second.ready();
  second.adapter.begin('drag', { x: 0, y: 0 }, 1); second.adapter.update({ x: 20, y: 20 });
  second.adapter.select(null); second.adapter.finish();
  assert.deepEqual(second.rect(), base); assert.equal(second.calls.length, 0);
});

test('export 只移除 control 對應 style，canonical component 不作 chrome root', async () => {
  const { cleanupComponentInteractionClone } = await import('../runtime/component-interaction.js');
  const removed = [], attrs = [], state = { textContent: '', setAttribute: (...a) => attrs.push(a) }, init = { hidden: false };
  const style = id => ({ getAttribute: () => id, remove: () => removed.push(id) });
  const root = { querySelectorAll(selector) {
    if (selector === '.moveable-control-box,.selecto-selection') return [
      { getAttribute: name => name === 'data-styled-id' ? 'rCS123' : 'moveable-control-box' },
      { getAttribute: name => name === 'class' ? 'selecto-selection selecto-test' : null },
    ];
    if (selector === 'style[data-styled-id]') return [style('rCS123'), style('selecto-test'), style('rCS999')];
    if (selector === '[data-editor-selected]') return [{ removeAttribute: a => attrs.push(a) }];
    throw new Error(selector);
  }, querySelector: selector => selector.includes('initialize-layout') ? init : state };
  cleanupComponentInteractionClone(root);
  assert.deepEqual(removed, ['rCS123', 'selecto-test']); assert.equal(init.hidden, true);
  assert.ok(attrs.includes('data-editor-selected')); assert.equal(state.textContent, '編輯版面');
});
