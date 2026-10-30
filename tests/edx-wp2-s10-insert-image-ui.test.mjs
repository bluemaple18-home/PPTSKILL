import test from 'node:test';
import assert from 'node:assert/strict';
import { mountedEditor, fixture } from '../tools/edx-wp1-s4-perf-mounted.mjs';
import { extractDeckSpec } from '../runtime/deck-spec.js';

const png = 'data:image/png;base64,AA==';
const geometry = { x: 560, y: 288, width: 480, height: 320 };
const result = () => ({ dataUri: png, warnings: [], optimized: false });
const root = (h, id = 'portable') => h.document.querySelector(`.slide[data-slide-id="${id}"]`);
const emit = async (node, type, fields = {}) => { for (const fn of node.listeners[type] || []) await fn({ target: node, ...fields }); };
function setup({ noImage = false } = {}) {
  const spec = fixture(0);
  if (noImage) spec.slides[0].content.components.pop();
  spec.slides.push({ ...structuredClone(spec.slides[0]), id: 'other' });
  const h = mountedEditor(spec);
  h.button = h.document.querySelector('[data-action="insert-image"]');
  h.input = h.document.querySelector('#pptskill-insert-image-input');
  h.replace = h.document.querySelector('#pptskill-selected-image-input');
  h.opens = 0; h.replaceOpens = 0; h.calls = 0;
  h.input.click = () => { h.opens++; };
  h.replace.click = () => { h.replaceOpens++; };
  h.assets.optimizeFile = async () => { h.calls++; return result(); };
  h.pick = () => h.click(h.button);
  h.change = async (file = { name: '同檔 <&>.png' }, input = h.input) => {
    input.value = 'same.png'; input.files = file ? [file] : []; await emit(input, 'change');
  };
  h.image = () => h.document.querySelector('[data-pptskill-element-id="component-perf-image"]');
  return h;
}

test('S10 public mounted layout 插圖：無 image、固定 geometry／fit／檔名、一次 revision', async () => {
  const h = setup({ noImage: true }); h.api.layout.setMode(true);
  assert.equal(h.button.hidden, false); assert.equal(h.button.disabled, false);
  const expected = h.getSpec(); h.pick(); assert.equal(h.opens, 1);
  await h.change();
  expected.slides[0].content.components.push({ id: 'inserted-image-1', type: 'image', dataUri: png, alt: '同檔 <&>.png', fit: 'contain' });
  expected.slides[0].composition.geometryOverrides['inserted-image-1'] = geometry;
  assert.deepEqual(h.getSpec(), expected); assert.equal(h.getRevision(), 1);
  assert.deepEqual(extractDeckSpec(h.api.exportHtml()), expected);
  assert.equal(h.document.querySelectorAll('[data-pptskill-element-id="component-inserted-image-1"]').length, 1);
  assert.equal(h.input.value, ''); assert.equal(h.button.disabled, false);
});

for (const selection of ['empty', 'text', 'image', 'multi']) test(`S10 ${selection} selection 均可用；play/edit/teardown 關閉入口`, () => {
  const h = setup(); assert.equal(h.button.hidden, true); h.pick(); assert.equal(h.opens, 0);
  h.api.layout.setMode(true);
  if (selection !== 'empty') h.click(selection === 'image' ? h.image() : h.component());
  if (selection === 'multi') h.click(h.image(), { shiftKey: true });
  assert.equal(h.button.hidden, false); assert.equal(h.button.disabled, false);
  h.action('edit'); assert.equal(h.button.hidden, true); h.pick(); assert.equal(h.opens, 0);
  h.api.layout.setMode(true); h.api.layout.destroy();
  assert.equal(h.button.hidden, true); assert.equal(h.button.disabled, true); h.pick(); assert.equal(h.opens, 0);
  assert.equal(h.document.querySelectorAll('[data-pptskill-insert-image-toolbar]').length, 1);
});

for (const snap of [false, true]) test(`S10 gesture 取消不 commit，capture→blur→change，snap=${snap}`, async () => {
  const h = setup(); h.ready(); if (snap) h.action('snap-layout'); h.begin(); h.update(19, 12);
  const before = h.getSpec();
  await emit(h.document, 'pointerdown', { target: h.button, isTrusted: true, button: 0 });
  assert.equal(h.api.layout.getState().gesturing, false); assert.deepEqual(h.getSpec(), before);
  h.pick(); assert.equal(h.opens, 1); assert.equal(h.button.disabled, true);
  await emit(h.window, 'blur'); assert.equal(h.api.layout.getSelectionState().selected.length, 0);
  await h.change(); assert.equal(h.getRevision(), 1); assert.equal(h.calls, 1);
});

for (const intent of ['slide', 'focusin', 'mode', 'selection', 'same-selection', 'marquee', 'empty-marquee', 'clear', 'destroy', 'delete', 'pointer']) test(`S10 ${intent} 取消未 change snapshot`, async () => {
  const h = setup(); h.ready(); h.pick(); await emit(h.window, 'blur');
  if (intent === 'slide') h.click(root(h, 'other'));
  if (intent === 'focusin') await emit(root(h, 'other'), 'focusin');
  if (intent === 'mode') h.action('edit');
  if (intent === 'selection') h.click(h.image());
  if (intent === 'same-selection') h.click(h.component());
  if (intent.includes('marquee')) h.selecto.handlers.selectEnd({ selected: intent === 'marquee' ? [h.image()] : [], inputEvent: {} });
  if (intent === 'clear') h.api.layout.clearSelection();
  if (intent === 'destroy') h.api.layout.destroy();
  if (intent === 'delete') h.action('delete');
  if (intent === 'pointer') await emit(h.document, 'pointerdown', { target: h.image(), isTrusted: true, button: 0 });
  const before = h.getSpec(); await h.change(); assert.equal(h.calls, 0); assert.deepEqual(h.getSpec(), before);
  assert.equal(h.input.value, '');
});

for (const end of ['cancel', 'empty', 'throw']) test(`S10 ${end} 不占用 ID，reset 可重選`, async () => {
  const h = setup(); h.api.layout.setMode(true); const before = h.getSpec();
  if (end === 'throw') h.input.click = () => { h.opens++; throw Error('chooser 失敗'); };
  h.pick();
  if (end === 'cancel') await emit(h.input, 'cancel');
  if (end === 'empty') await h.change(null);
  assert.deepEqual(h.getSpec(), before); assert.equal(h.calls, 0); assert.equal(h.input.value, ''); assert.equal(h.button.disabled, false);
  h.input.click = () => { h.opens++; }; h.pick(); await h.change();
  assert.equal(h.getSpec().slides[0].content.components.at(-1).id, 'inserted-image-1');
  h.pick(); await h.change(); assert.equal(h.getSpec().slides[0].content.components.at(-1).id, 'inserted-image-2');
  assert.equal(h.calls, 2);
});

test('S10 無 pending／wrong input／互斥／busy 重入不跨送', async () => {
  const h = setup(); h.ready(); await h.change(); assert.equal(h.calls, 0);
  h.pick(); h.pick(); h.click(h.image()); h.action('replace-selected-image');
  assert.equal(h.opens, 1); assert.equal(h.replaceOpens, 0);
  await emit(h.replace, 'cancel'); await h.change({}, h.replace); assert.equal(h.calls, 0);
  // 新 selection 已使 insertion 失效；錯 input 不得解鎖自己的 picker。
  assert.equal(h.button.disabled, true); await h.change(); assert.equal(h.calls, 0);
  h.click(h.image()); h.action('replace-selected-image'); h.pick(); assert.equal(h.opens, 1);
  await emit(h.input, 'cancel'); await h.change(); assert.equal(h.calls, 0);
  await h.change({}, h.replace); assert.equal(h.calls, 1);
  h.pick(); await emit(h.replace, 'cancel'); await h.change({}, h.replace);
  await h.change(); assert.equal(h.calls, 2);
});

test('S10 slide-local 首個空缺 ID、空 alt、成功只 clear selection 一次', async () => {
  const h = setup(); h.window.__testMutateSpec(s => {
    for (const n of [1, 3]) s.slides[0].content.components.push({ id: `inserted-image-${n}`, type: 'text', text: '已占用' });
    s.slides[1].content.components.push({ id: 'inserted-image-2', type: 'text', text: '別頁' });
  });
  h.ready(); let clears = 0; const selectedNode = h.component(), removeAttribute = selectedNode.removeAttribute;
  // 觀察真實 selection marker 的清除，public facade 覆寫不再是內部呼叫計數器。
  selectedNode.removeAttribute = function (key) { if (key === 'data-editor-selected') clears++; return removeAttribute.call(this, key); };
  h.pick(); await h.change({});
  const c = h.getSpec().slides[0].content.components.at(-1);
  assert.equal(c.id, 'inserted-image-2'); assert.equal(c.alt, ''); assert.equal(c.fit, 'contain');
  assert.equal(clears, 1); assert.equal(h.getRevision(), 1);
});

test('S10 async File 捕捉，export／切頁／mode／其他修改保留；finally 不覆寫新 S6 picker', async () => {
  const h = setup(); h.ready(); let release;
  h.assets.optimizeFile = () => new Promise(ok => { release = ok; });
  h.pick(); const pending = h.change(); h.pick(); assert.equal(h.opens, 1); assert.equal(h.button.disabled, true);
  h.api.exportHtml(); h.click(root(h, 'other')); h.action('edit');
  h.api.executeOperation({ operation: 'edit-text', target: { slideId: 'other', elementId: 'role-title' }, value: '等待中修改' });
  h.api.layout.setMode(true); h.click(h.document.querySelector('.slide[data-slide-id="other"] [data-pptskill-element-id="component-perf-image"]'));
  h.action('replace-selected-image'); assert.equal(h.replaceOpens, 1);
  const before = h.getSpec(); release(result()); await pending;
  const after = h.getSpec(); assert.deepEqual(after.slides[1], before.slides[1]);
  assert.equal(after.slides[0].content.components.at(-1).id, 'inserted-image-1');
  // S8 成功清 selection 會使 S6 target 失效，但其尚未關閉的 chooser 仍鎖住 UI。
  assert.equal(h.button.disabled, true); await emit(h.replace, 'cancel'); assert.equal(h.button.disabled, false);
});

for (const failure of ['removed', 'collision', 'invalid', 'reject']) test(`S10 async ${failure} 原子拒絕，不 rename/retry，busy 釋放`, async () => {
  const h = setup(); h.ready(); let release, reject; let calls = 0;
  h.assets.optimizeFile = () => { calls++; return new Promise((ok, no) => { release = ok; reject = no; }); };
  h.pick(); const pending = h.change();
  if (failure === 'removed') h.window.__testMutateSpec(s => s.slides.shift());
  if (failure === 'collision') h.window.__testMutateSpec(s => s.slides[0].content.components.push({ id: 'inserted-image-1', type: 'text', text: '競爭寫入' }));
  const before = h.getSpec(), revision = h.getRevision(), dom = root(h).outerHTML;
  if (failure === 'reject') reject(Error('optimizer 拒絕')); else release(failure === 'invalid' ? {} : result());
  await pending; assert.deepEqual(h.getSpec(), before); assert.equal(h.getRevision(), revision); assert.equal(root(h).outerHTML, dom);
  assert.equal(calls, 1); assert.equal(h.input.value, '');
  if (failure !== 'removed') assert.equal(h.button.disabled, false);
});

test('S10 非唯一 DOM 不開 chooser；export cleanup／remount 不重複 input', async () => {
  const h = setup(); h.api.layout.setMode(true); const extra = root(h).cloneNode(); h.document.body.append(extra);
  h.pick(); assert.equal(h.opens, 0); extra.remove(); h.pick();
  const html = h.api.exportHtml();
  assert.doesNotMatch(html.split('<body')[1], /data-pptskill-insert-image-toolbar|pptskill-insert-image-input/);
  await h.change(); assert.equal(h.calls, 1);
  const reopened = setup(); reopened.api.layout.setMode(true); reopened.pick(); await reopened.change();
  assert.equal(reopened.document.querySelectorAll('#pptskill-insert-image-input').length, 1);
});

test('S10 change 前 ID 碰撞由 S8 preflight 拒絕，optimizer0／不 rename', async () => {
  const h = setup(); h.api.layout.setMode(true); h.pick();
  h.window.__testMutateSpec(s => s.slides[0].content.components.push({ id: 'inserted-image-1', type: 'text', text: '先占用' }));
  const before = h.getSpec(); await h.change(); assert.equal(h.calls, 0); assert.deepEqual(h.getSpec(), before);
  assert.equal(h.button.disabled, false); h.pick(); await h.change();
  assert.equal(h.getSpec().slides[0].content.components.at(-1).id, 'inserted-image-2');
});

test('S10 export 的 canonical 重新 mounted 後可再插入，不占舊 ID', async () => {
  const h = setup(); h.api.layout.setMode(true); h.pick(); await h.change();
  const reopened = mountedEditor(extractDeckSpec(h.api.exportHtml()));
  const input = reopened.document.querySelector('#pptskill-insert-image-input'); let opens = 0;
  input.click = () => { opens++; }; reopened.assets.optimizeFile = async () => result();
  reopened.api.layout.setMode(true); reopened.action('insert-image'); input.files = [{ name: '重新插入.png' }]; await emit(input, 'change');
  assert.equal(opens, 1); assert.equal(reopened.getSpec().slides[0].content.components.at(-1).id, 'inserted-image-2');
  assert.equal(reopened.document.querySelectorAll('#pptskill-insert-image-input').length, 1);
});
