import test from 'node:test';
import assert from 'node:assert/strict';
import { mountedEditor, fixture, geometry, box } from '../tools/edx-wp1-s4-perf-mounted.mjs';
import { extractDeckSpec, resolveSlideElementIdentities } from '../runtime/deck-spec.js';

const original = 'data:image/png;base64,AA==', replacement = 'data:image/webp;base64,BB==';
const target = (slideId = 'portable') => ({ slideId, elementId: 'component-second-image' });
const input = () => {
  const spec = fixture(0), slide = spec.slides[0];
  slide.content.components[1].dataUri = original;
  slide.content.components.push({ id: 'second-image', type: 'image', dataUri: original, alt: '保留第二張', fit: 'cover' });
  slide.composition.geometryOverrides['second-image'] = { x: 300, y: 400, width: 200, height: 150 };
  slide.composition.typographyOverrides = { 'role-title': { fontSize: 60 } };
  slide.composition.motion = { effect: 'underline-sweep', role: 'text', replay: 'slide-visible', staggerMs: 90, targets: [{ ref: 'content.title' }] };
  spec.slides.push({ ...structuredClone(slide), id: 'other' });
  return spec;
};

test('WP2-S5 明示第二張 File target 不得取第一張', async () => {
  const h = mountedEditor(input()), expected = h.getSpec();
  expected.slides[0].content.components[2].dataUri = replacement;
  await h.api.replaceImageFile({ dataUri: replacement }, target());
  assert.deepEqual(h.getSpec(), expected);
});

const image = (h, slideId = 'portable', elementId = 'component-second-image') => h.document.querySelector(`.slide[data-slide-id="${slideId}"] [data-pptskill-element-id="${elementId}"] img`);
const snapshot = h => ({ spec: h.getSpec(), dom: h.document.querySelector('.deck').outerHTML, revision: h.getRevision() });

for (const mode of ['omitted', 'undefined', 'second', 'cross-slide', 'null-proto', 'non-enumerable']) {
  test(`WP2-S5 ${mode}、局部投影、完整欄位保留與 export roundtrip`, async () => {
    const h = mountedEditor(input()), expected = h.getSpec(), slideIndex = mode === 'cross-slide' ? 1 : 0;
    const componentIndex = ['omitted', 'undefined'].includes(mode) ? 1 : 2;
    let t = target(slideIndex ? 'other' : 'portable');
    if (mode === 'null-proto') t = Object.assign(Object.create(null), t);
    if (mode === 'non-enumerable') t = Object.defineProperties({}, Object.fromEntries(Object.entries(t).map(([key, value]) => [key, { value }])));
    const img = image(h, t.slideId, componentIndex === 1 ? 'component-perf-image' : t.elementId), root = img.parentElement, attrs = { ...root.attrs };
    expected.slides[slideIndex].content.components[componentIndex].dataUri = replacement;
    const file = { dataUri: replacement }, result = mode === 'omitted' ? await h.api.replaceImageFile(file) : await h.api.replaceImageFile(file, mode === 'undefined' ? undefined : t);
    assert.equal(result.dataUri, replacement); assert.deepEqual(h.getSpec(), expected);
    assert.equal(img.parentElement, root); assert.deepEqual(root.attrs, attrs);
    assert.equal(img.getAttribute('src'), replacement); assert.equal(img.getAttribute('alt'), expected.slides[slideIndex].content.components[componentIndex].alt);
    assert.equal(img.style.getPropertyValue('object-fit'), expected.slides[slideIndex].content.components[componentIndex].fit || 'contain');
    assert.equal(h.getRevision(), 1); assert.deepEqual(extractDeckSpec(h.api.exportHtml()), expected);
  });
}

test('WP2-S5 嚴格 admission：invalid getter0／optimizer0／零 mutation', async () => {
  const h = mountedEditor(input()); let getters = 0, calls = 0;
  h.assets.optimizeFile = async () => { calls++; throw new Error('不應呼叫 optimizer'); };
  const invalid = [null, false, 1, 'target', [], {}, { slideId: 'portable' }, { ...target(), extra: 1 }, target('foreign'),
    { ...target(), elementId: 'component-portable-quote' }, { ...target(), elementId: 'role-title' }, { ...target(), elementId: 'missing' },
    { ...target(), elementId: '../bad' }, { ...target(), slideId: '' }, { ...target(), slideId: 1 }, { ...target(), elementId: 1 },
    Object.create(target()), Object.assign(Object.create({ inherited: true }), target()), new Date()];
  for (const key of ['slideId', 'elementId', 'extra']) {
    const t = target(); Object.defineProperty(t, key, { get() { getters++; throw new Error('getter 不可讀'); } }); invalid.push(t);
  }
  for (const key of [Symbol('extra'), 'hidden']) invalid.push(Object.defineProperty(target(), key, { value: 1 }));
  const before = snapshot(h);
  for (const t of invalid) { await assert.rejects(h.api.replaceImageFile({}, t)); assert.deepEqual(snapshot(h), before); }
  assert.equal(getters, 0); assert.equal(calls, 0);
  assert.equal(await h.api.replaceImageFile(null, null), null); assert.equal(calls, 0);
});

test('WP2-S5 caller target 變動／export 換物件／切頁仍投遞 captured stable image', async () => {
  const h = mountedEditor(input()), t = target('other'); let release;
  h.assets.optimizeFile = () => new Promise(ok => { release = ok; });
  const pending = h.api.replaceImageFile({ name: '/private/not-persisted.png' }, t);
  t.slideId = 'portable'; t.elementId = 'component-perf-image';
  h.api.exportHtml(); h.click(h.document.querySelector('.slide[data-slide-id="other"]'));
  h.api.executeOperation({ operation: 'replace-asset', target: target('other'), value: { dataUri: original, alt: '等待期間修改', fit: 'contain' } });
  const expected = h.getSpec(), result = { dataUri: replacement, warnings: ['oversized_gif_preserved'], optimized: false };
  expected.slides[1].content.components[2].dataUri = replacement;
  release(result); assert.equal(await pending, result); assert.deepEqual(h.getSpec(), expected);
  assert.equal(image(h, 'other').getAttribute('alt'), '等待期間修改');
  assert.equal(image(h, 'other').style.getPropertyValue('object-fit'), 'contain');
  assert.match(h.document.querySelector('[data-editor-status]').textContent, /大型 GIF/);
  assert.deepEqual(extractDeckSpec(h.api.exportHtml()), expected);
});

for (const mode of ['reject', 'unsafe', 'null-result', 'missing-warnings', 'missing-slide', 'missing-image', 'type-change', 'missing-dom']) {
  test(`WP2-S5 pending ${mode} 原子拒絕`, async () => {
    const h = mountedEditor(input()); let release, reject;
    h.assets.optimizeFile = () => new Promise((ok, fail) => { release = ok; reject = fail; });
    const pending = h.api.replaceImageFile({}, target());
    if (mode === 'missing-slide') h.action('delete');
    // 僅 mounted harness 注入 canonical 失效，產品不新增 mutation API。
    if (mode === 'missing-image') h.window.__testMutateSpec(s => s.slides[0].content.components.pop());
    if (mode === 'type-change') h.window.__testMutateSpec(s => Object.assign(s.slides[0].content.components[2], { type: 'text', text: '已變成文字' }));
    if (mode === 'missing-dom') image(h).remove();
    const before = snapshot(h);
    if (mode === 'reject') reject(new Error('解碼失敗'));
    else release(mode === 'null-result' ? null : mode === 'missing-warnings' ? { dataUri: replacement } : { dataUri: mode === 'unsafe' ? 'file:///private/a.png' : replacement, warnings: [], optimized: false });
    await assert.rejects(pending); assert.deepEqual(snapshot(h), before);
  });
}

for (const changed of [false, true]) test(`WP2-S5 explicit File ${changed ? '真修改 stale' : 'same-value no-op'} gesture`, async () => {
  const h = mountedEditor(input()); h.ready(); h.begin(); h.update(20, 10);
  await h.api.replaceImageFile({ dataUri: changed ? replacement : original }, target());
  assert.equal(h.getRevision(), Number(changed));
  h.finish(); assert.deepEqual(geometry(h.getSpec()), changed ? box : { ...box, x: 820, y: 290 });
});

test('WP2-S5 長 component ID 使用 resolved stable identity', async () => {
  const spec = input(); spec.slides[0].content.components[2].id = 'a'.repeat(80);
  const h = mountedEditor(spec), expected = h.getSpec();
  const elementId = resolveSlideElementIdentities(expected.slides[0]).components[2];
  await h.api.replaceImageFile({ dataUri: replacement }, { slideId: 'portable', elementId });
  expected.slides[0].content.components[2].dataUri = replacement; assert.deepEqual(h.getSpec(), expected);
});
