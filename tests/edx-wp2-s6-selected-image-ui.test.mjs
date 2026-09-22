import test from 'node:test';
import assert from 'node:assert/strict';
import { mountedEditor, fixture } from '../tools/edx-wp1-s4-perf-mounted.mjs';
import { extractDeckSpec } from '../runtime/deck-spec.js';

const original = 'data:image/png;base64,AA==', replacement = 'data:image/png;base64,BB==';
function setup() {
  const spec = fixture(0), slide = spec.slides[0];
  slide.content.components[1].dataUri = original;
  slide.content.components.push({ id: 'second-image', type: 'image', dataUri: original, alt: '第二張', fit: 'cover' });
  slide.composition.geometryOverrides['second-image'] = { x: 300, y: 400, width: 200, height: 150 };
  spec.slides.push({ ...structuredClone(slide), id: 'other' });
  const h = mountedEditor(spec);
  h.button = h.document.querySelector('[data-action="replace-selected-image"]');
  h.input = h.document.querySelector('#pptskill-selected-image-input');
  h.opens = 0; h.input.click = () => { h.opens++; };
  h.pick = () => h.click(h.button);
  h.image = id => h.document.querySelector(`[data-pptskill-element-id="component-${id}"]`);
  h.selectImage = (id = 'second-image') => h.click(h.image(id));
  h.event = async (root, type, fields = {}) => { for (const fn of root.listeners[type] || []) await fn({ target: root, ...fields }); };
  h.change = async (file = { dataUri: replacement }) => { h.input.value = 'same.png'; h.input.files = file ? [file] : []; await h.event(h.input, 'change'); };
  h.api.layout.setMode(true);
  return h;
}

test('S6 單選圖片顯示 action，其他 selection／mode 隱藏；UI 不修改 canonical', () => {
  const h = setup(), before = h.getSpec();
  assert.equal(h.button.hidden, true); h.selectImage();
  assert.equal(h.button.hidden, false); assert.equal(h.button.disabled, false);
  h.click(h.image('perf-image'), { shiftKey: true }); assert.equal(h.button.hidden, true);
  h.click(h.component()); assert.equal(h.button.hidden, true);
  h.selectImage(); h.api.layout.clearSelection(); assert.equal(h.button.hidden, true);
  h.selectImage(); h.action('edit'); assert.equal(h.button.hidden, true);
  h.api.layout.setMode(true); h.selectImage(); h.api.layout.setMode(false); assert.equal(h.button.hidden, true);
  assert.deepEqual(h.getSpec(), before); assert.equal(h.getRevision(), 0);
});

for (const snap of [false, true]) test(`S6 capture → natural blur → change 保留第二圖，snap=${snap}`, async () => {
  const h = setup(); if (snap) h.action('snap-layout'); h.selectImage();
  const expected = h.getSpec(); h.pick(); assert.equal(h.opens, 1);
  await h.event(h.window, 'blur'); assert.equal(h.button.hidden, true);
  assert.equal(h.api.layout.getSelectionState().selected.length, 0);
  await h.change(); expected.slides[0].content.components[2].dataUri = replacement;
  assert.deepEqual(h.getSpec(), expected); assert.equal(h.input.value, '');
  assert.deepEqual(extractDeckSpec(h.api.exportHtml()), expected);
});

for (const intent of ['slide', 'mode', 'selection', 'same-selection', 'marquee', 'empty-marquee', 'clear', 'destroy', 'delete', 'pointer']) {
  test(`S6 picker 後 ${intent} 取消目標；無 pending 不呼叫 optimizer`, async () => {
    const h = setup(); let calls = 0;
    h.assets.optimizeFile = async () => { calls++; throw new Error('不應執行'); };
    h.selectImage(); h.pick(); await h.event(h.window, 'blur');
    if (intent === 'slide') h.click(h.document.querySelector('.slide[data-slide-id="other"]'));
    if (intent === 'mode') h.action('edit');
    if (intent === 'selection') h.selectImage('perf-image');
    if (intent === 'same-selection') h.selectImage();
    if (intent === 'marquee' || intent === 'empty-marquee') h.selecto.handlers.selectEnd({ selected: intent === 'marquee' ? [h.image('perf-image')] : [], inputEvent: {} });
    if (intent === 'clear') h.api.layout.clearSelection();
    if (intent === 'destroy') h.api.layout.destroy();
    if (intent === 'delete') h.action('delete');
    if (intent === 'pointer') await h.event(h.document, 'pointerdown', { target: h.component(), isTrusted: true, button: 0 });
    const before = h.getSpec(); await h.change();
    assert.equal(calls, 0); assert.deepEqual(h.getSpec(), before); assert.equal(h.input.value, '');
    assert.match(h.document.querySelector('[data-editor-status]').textContent, /失效/);
  });
}

for (const exit of ['cancel', 'empty', 'success', 'failure']) test(`S6 ${exit} 重設 value，同檔可再次選取`, async () => {
  const h = setup(); h.selectImage(); h.pick(); h.input.value = 'same.png';
  if (exit === 'cancel') await h.event(h.input, 'cancel');
  else if (exit === 'empty') await h.change(null);
  else if (exit === 'failure') { h.assets.optimizeFile = async () => { throw new Error('解碼失敗'); }; await h.change(); }
  else await h.change();
  assert.equal(h.input.value, '');
  h.assets.optimizeFile = async file => ({ dataUri: file.dataUri, warnings: [], optimized: false });
  h.selectImage(); h.pick(); await h.change(); assert.equal(h.opens, 2);
  assert.equal(h.getSpec().slides[0].content.components[2].dataUri, replacement);
});

test('S6 無 pending／target 刪除先拒絕；後一次 picker 不覆蓋未消耗的 chooser', async () => {
  const h = setup(); let calls = 0;
  h.assets.optimizeFile = async file => { calls++; return { dataUri: file.dataUri, warnings: [], optimized: false }; };
  await h.change(); assert.equal(calls, 0);
  h.selectImage(); h.pick(); h.selectImage('perf-image'); h.pick(); assert.equal(h.opens, 1);
  await h.change(); assert.equal(calls, 0);
  h.selectImage(); h.pick(); h.window.__testMutateSpec(s => s.slides[0].content.components.pop());
  await h.change(); assert.equal(calls, 0); assert.equal(h.input.value, '');
});

test('S6 change 先消耗 snapshot；async 中新 picker／export／切頁不改前次 target', async () => {
  const h = setup(); const releases = [];
  h.assets.optimizeFile = () => new Promise(ok => releases.push(ok));
  h.selectImage(); h.pick(); const first = h.change();
  h.selectImage('perf-image'); h.pick(); const second = h.change({ dataUri: original });
  h.api.exportHtml(); h.click(h.document.querySelector('.slide[data-slide-id="other"]'));
  releases[1]({ dataUri: original, warnings: [], optimized: false }); await second;
  releases[0]({ dataUri: replacement, warnings: [], optimized: false }); await first;
  assert.equal(h.getSpec().slides[0].content.components[1].dataUri, original);
  assert.equal(h.getSpec().slides[0].content.components[2].dataUri, replacement);
  assert.equal(h.getSpec().slides[1].content.components[2].dataUri, original);
});

for (const snap of [false, true]) test(`S6 picker pointerdown 取消 gesture 且 click 前尺寸狀態不變 snap=${snap}`, async () => {
  const h = setup(); if (snap) h.action('snap-layout'); h.selectImage();
  h.begin(); h.update(10, 10);
  const before = h.getSpec();
  await h.event(h.document, 'pointerdown', { target: h.button, isTrusted: true, button: 0 });
  assert.equal(h.api.layout.getState().gesturing, false); assert.equal(h.button.hidden, false);
  h.pick(); assert.equal(h.opens, 1); assert.deepEqual(h.getSpec(), before); assert.equal(h.getRevision(), 0);
});

test('S6 export 移除新增 chrome，pending 不序列化；重新 mount 可選圖', () => {
  const h = setup(); h.selectImage(); h.pick();
  const html = h.api.exportHtml(), body = html.split('<body')[1];
  assert.doesNotMatch(body, /data-pptskill-selected-image-toolbar|pptskill-selected-image-input/);
  const reopened = setup(); reopened.selectImage(); reopened.pick(); assert.equal(reopened.opens, 1);
});

test('S6 picker 等待檔案時唯讀 export 不取消 pending target', async () => {
  const h = setup(); h.selectImage(); h.pick(); await h.event(h.window, 'blur');
  const expected = h.getSpec(); h.api.exportHtml(); await h.change();
  expected.slides[0].content.components[2].dataUri = replacement;
  assert.deepEqual(h.getSpec(), expected);
});

test('S6 async target 移除後失敗，零 asset mutation 且 input 可重選', async () => {
  const h = setup(); let release;
  h.assets.optimizeFile = () => new Promise(ok => { release = ok; });
  h.selectImage(); h.pick(); const pending = h.change();
  h.window.__testMutateSpec(s => s.slides[0].content.components.pop());
  const before = h.getSpec(); release({ dataUri: replacement, warnings: [], optimized: false }); await pending;
  assert.deepEqual(h.getSpec(), before); assert.equal(h.input.value, '');
  assert.match(h.document.querySelector('[data-editor-status]').textContent, /移除/);
});
