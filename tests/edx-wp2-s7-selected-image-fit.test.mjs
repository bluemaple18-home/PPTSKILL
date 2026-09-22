import test from 'node:test';
import assert from 'node:assert/strict';
import { mountedEditor, fixture } from '../tools/edx-wp1-s4-perf-mounted.mjs';
import { extractDeckSpec } from '../runtime/deck-spec.js';
import { buildDeckEditorMarkup } from '../runtime/deck-editor.js';

const original = 'data:image/png;base64,AA==', replacement = 'data:image/png;base64,BB==';
function setup(input) {
  const spec = input || fixture(0), slide = spec.slides[0];
  if (!input) {
    slide.content.components[1].dataUri = original;
    slide.content.components.push({ id: 'second-image', type: 'image', dataUri: original, alt: '第二張' });
    slide.composition.geometryOverrides['second-image'] = { x: 300, y: 400, width: 200, height: 150 };
    spec.slides.push({ ...structuredClone(slide), id: 'other' });
  }
  const h = mountedEditor(spec);
  h.group = h.document.querySelector('[data-selected-image-fit]');
  h.fit = fit => h.document.querySelector(`[data-image-fit="${fit}"]`);
  h.input = h.document.querySelector('#pptskill-selected-image-input');
  h.input.click = () => {};
  h.image = (id = 'second-image') => h.document.querySelector(`[data-pptskill-element-id="component-${id}"]`);
  h.selectImage = (id = 'second-image') => h.click(h.image(id));
  h.event = async (root, type, fields = {}) => { for (const fn of root.listeners[type] || []) await fn({ target: root, preventDefault() {}, stopImmediatePropagation() {}, ...fields }); };
  h.change = async (file = { dataUri: replacement }) => { h.input.files = file ? [file] : []; await h.event(h.input, 'change'); };
  h.api.layout.setMode(true);
  return h;
}

test('S7 native group 與裁邊說明由 bootstrap markup 提供', () => {
  const html = buildDeckEditorMarkup();
  assert.match(html, /role="group"[^>]*aria-label="所選圖片顯示方式"/);
  for (const fit of ['contain', 'cover']) assert.match(html, new RegExp('type="button"[^>]*data-image-fit="' + fit + '"'));
  assert.match(html, /title="[^"]*裁[^"]*邊/);
});

test('S7 第二圖 default contain no-op、往返、pressed、revision 與完整 preservation', () => {
  const h = setup(), expected = h.getSpec();
  h.selectImage(); assert.equal(h.group.hidden, false);
  assert.equal(h.fit('contain').getAttribute('aria-pressed'), 'true');
  h.click(h.fit('contain')); assert.deepEqual(h.getSpec(), expected); assert.equal(h.getRevision(), 0);
  for (const [fit, revision] of [['cover', 1], ['cover', 1], ['contain', 2]]) {
    h.click(h.fit(fit)); expected.slides[0].content.components[2].fit = fit;
    assert.deepEqual(h.getSpec(), expected); assert.equal(h.getRevision(), revision);
    assert.equal(h.image().querySelector('img').style.getPropertyValue('object-fit'), fit);
    assert.equal(h.fit(fit).getAttribute('aria-pressed'), 'true');
    assert.equal(h.fit(fit === 'contain' ? 'cover' : 'contain').getAttribute('aria-pressed'), 'false');
    assert.equal(h.api.layout.getSelectionState().selected[0], 'component-second-image');
  }
});

test('S7 無 target／未知 fit 拒絕且不 fallback；使用 click 當下 live dataUri', () => {
  const h = setup(), before = h.getSpec();
  h.click(h.fit('cover')); assert.deepEqual(h.getSpec(), before);
  h.selectImage(); h.fit('cover').dataset.imageFit = 'stretch'; h.click(h.fit('stretch'));
  assert.deepEqual(h.getSpec(), before); assert.equal(h.getRevision(), 0);
  h.fit('stretch').dataset.imageFit = 'cover';
  h.api.executeOperation({ operation: 'replace-asset', target: { slideId: 'portable', elementId: 'component-second-image' }, value: { dataUri: replacement, fit: 'cover' } });
  assert.equal(h.fit('cover').getAttribute('aria-pressed'), 'true');
  h.assets.optimizeFile = () => { throw new Error('fit 不可呼叫 optimizer'); };
  h.click(h.fit('contain')); before.slides[0].content.components[2].dataUri = replacement; before.slides[0].content.components[2].fit = 'contain';
  assert.deepEqual(h.getSpec(), before);
});

for (const intent of ['nonimage', 'multi', 'clear', 'slide', 'edit', 'play', 'delete', 'destroy']) test(`S7 ${intent} 隱藏／disable 並拒絕 stale target`, () => {
  const h = setup(); h.selectImage();
  if (intent === 'nonimage') h.click(h.component());
  if (intent === 'multi') h.click(h.image('perf-image'), { shiftKey: true });
  if (intent === 'clear') h.api.layout.clearSelection();
  if (intent === 'slide') h.click(h.document.querySelector('.slide[data-slide-id="other"]'));
  if (intent === 'edit') h.action('edit');
  if (intent === 'play') h.api.layout.setMode(false);
  if (intent === 'delete') h.action('delete');
  if (intent === 'destroy') h.api.layout.destroy();
  assert.equal(h.group.hidden, true); assert.equal(h.fit('cover').disabled, true);
  const before = h.getSpec(); h.click(h.fit('cover')); assert.deepEqual(h.getSpec(), before);
});

test('S7 same-image click 與 refresh 只讀 bounded metadata；不讀 payload／serialize', () => {
  const h = setup(); h.resetCounts();
  for (let i = 0; i < 20; i++) { h.selectImage(); h.selectImage('perf-image'); h.selectImage(); h.selectImage(); }
  assert.equal(h.group.hidden, false); assert.equal(h.fit('contain').getAttribute('aria-pressed'), 'true');
  assert.equal(h.counts.payloadReads, 0); assert.equal(h.counts.wholeSpecSerializations, 0);
});

for (const end of ['cancel', 'empty', 'change', 'blur-change']) test(`S7 picker pending fit disabled；${end} 恢復且 pending 不被 fit 取消`, async () => {
  const h = setup(); h.selectImage(); const expected = h.getSpec(); h.action('replace-selected-image');
  assert.equal(h.fit('cover').disabled, true);
  await h.event(h.document, 'pointerdown', { target: h.fit('cover'), isTrusted: true, button: 0 });
  h.click(h.fit('cover')); assert.deepEqual(h.getSpec(), expected);
  if (end === 'cancel') await h.event(h.input, 'cancel');
  if (end === 'empty') await h.change(null);
  if (end === 'blur-change') await h.event(h.window, 'blur');
  if (end.endsWith('change')) { await h.change(); expected.slides[0].content.components[2].dataUri = replacement; }
  assert.deepEqual(h.getSpec(), expected);
  if (end === 'blur-change') { assert.equal(h.group.hidden, true); h.selectImage(); }
  assert.equal(h.fit('cover').disabled, false); h.click(h.fit('cover'));
  expected.slides[0].content.components[2].fit = 'cover'; assert.deepEqual(h.getSpec(), expected);
});

for (const snap of [false, true]) for (const kind of ['drag', 'resize']) for (const input of ['pointer', 'keyboard']) test(`S7 ${kind}/${input}/snap=${snap} 取消 preview 後只提交 fit`, async () => {
  const h = setup(); if (snap) h.action('snap-layout'); h.selectImage();
  const expected = h.getSpec(); h.begin(kind); h.update(20, 16, kind, { left: 320, top: 416, width: 220, height: 166 });
  assert.equal(h.api.layout.getState().gesturing, true);
  const event = { target: h.fit('cover'), isTrusted: true, button: 0, detail: input === 'pointer' ? 1 : 0 };
  if (input === 'pointer') await h.event(h.document, 'pointerdown', event);
  else await h.event(h.window, 'click', event);
  h.click(h.fit('cover'), event); h.finish(kind);
  assert.equal(h.api.layout.getState().gesturing, false); assert.equal(h.group.hidden, false);
  expected.slides[0].content.components[2].fit = 'cover'; assert.deepEqual(h.getSpec(), expected); assert.equal(h.getRevision(), 1);
});

test('S7 toolbar focus 擁有 arrows；modifier／IME 沿原 keyboard guard', async () => {
  const h = setup(); h.selectImage(); const expected = h.getSpec();
  for (const fields of [{}, { ctrlKey: true }, { metaKey: true }, { altKey: true }, { isComposing: true }]) {
    await h.event(h.document, 'keydown', { target: h.fit('cover'), key: 'ArrowRight', ...fields });
  }
  assert.deepEqual(h.getSpec(), expected); assert.equal(h.getRevision(), 0);
});

for (const snap of [false, true]) test(`S7 default no-op 亦取消 preview 並保留 selection snap=${snap}`, async () => {
  const h = setup(); if (snap) h.action('snap-layout'); h.selectImage();
  const expected = h.getSpec(); h.begin(); h.update(20, 16, 'drag', { left: 320, top: 416 });
  await h.event(h.document, 'pointerdown', { target: h.fit('contain'), isTrusted: true, button: 0 });
  h.click(h.fit('contain')); h.finish();
  assert.deepEqual(h.getSpec(), expected); assert.equal(h.getRevision(), 0);
  assert.equal(h.group.hidden, false); assert.equal(h.api.layout.getState().gesturing, false);
  assert.deepEqual([...h.api.layout.getSelectionState().selected], ['component-second-image']);
});

test('S7 target DOM 移除與 observer refresh 後隱藏，不套到其他圖', () => {
  const h = setup(); h.selectImage(); const expected = h.getSpec();
  h.image().remove(); h.flushMutations();
  assert.equal(h.group.hidden, true); h.click(h.fit('cover')); assert.deepEqual(h.getSpec(), expected);
});

test('S7 export 只保留 fit；從匯出 DeckSpec remount 可切換', () => {
  const h = setup(); h.selectImage(); h.click(h.fit('cover'));
  const html = h.api.exportHtml(), body = html.split('<body')[1];
  assert.doesNotMatch(body, /data-selected-image-fit|data-image-fit|data-pptskill-selected-image-toolbar/);
  assert.deepEqual(extractDeckSpec(html), h.getSpec());
  const reopened = setup(extractDeckSpec(html)); reopened.selectImage();
  assert.equal(reopened.fit('cover').getAttribute('aria-pressed'), 'true');
  reopened.click(reopened.fit('contain')); assert.equal(reopened.getSpec().slides[0].content.components[2].fit, 'contain');
});
