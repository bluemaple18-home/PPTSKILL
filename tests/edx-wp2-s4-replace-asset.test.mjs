import test from 'node:test';
import assert from 'node:assert/strict';
import { createDeckEditor, OPERATION_DESCRIPTORS } from '../runtime/deck-editor.js';
import { extractDeckSpec, resolveSlideElementIdentities } from '../runtime/deck-spec.js';
import { renderFullDeck } from '../runtime/full-deck-renderer.js';
import { mountedEditor, fixture, geometry, box } from '../tools/edx-wp1-s4-perf-mounted.mjs';

const original = 'data:image/png;base64,AA==', replacement = 'data:image/webp;base64,BB==';
const req = (value = { dataUri: replacement }, elementId = 'component-second-image', slideId = 'portable') => ({ operation: 'replace-asset', target: { slideId, elementId }, value });
const input = () => {
  const spec = fixture(0), slide = spec.slides[0];
  Object.assign(slide.content.components[1], { dataUri: original, alt: '保留第一張', fit: 'cover' });
  slide.content.components.push({ id: 'second-image', type: 'image', dataUri: original, alt: '保留第二張', fit: 'cover' });
  slide.composition.typographyOverrides = { 'role-title': { fontSize: 60 } };
  slide.composition.geometryOverrides['second-image'] = { x: 300, y: 400, width: 200, height: 150 };
  slide.composition.motion = { effect: 'underline-sweep', role: 'text', replay: 'slide-visible', staggerMs: 90, targets: [{ ref: 'content.title' }, { ref: 'content.subtitle' }] };
  spec.slides.push({ ...structuredClone(slide), id: 'other' });
  return spec;
};
const image = (h, id = 'component-second-image', slide = 'portable') => h.document.querySelector(`.slide[data-slide-id="${slide}"] [data-pptskill-element-id="${id}"] img`);

for (const portable of [false, true]) {
  test(`WP2-S4 ${portable ? 'portable' : 'Node'} 第二張 stable target、缺省保留、明示覆寫及 export`, () => {
    const h = portable ? mountedEditor(input()) : null, api = h?.api || createDeckEditor(input()), read = () => h ? h.getSpec() : api.getSpec();
    const before = read(), expected = structuredClone(before);
    expected.slides[0].content.components[2].dataUri = replacement;
    assert.deepEqual(JSON.parse(JSON.stringify(api.executeOperation(req()))), expected);
    assert.deepEqual(read(), expected);
    api.executeOperation(req({ dataUri: original, alt: '', fit: 'contain' }));
    Object.assign(expected.slides[0].content.components[2], { dataUri: original, alt: '', fit: 'contain' });
    assert.deepEqual(read(), expected);
    const html = h ? api.exportHtml() : renderFullDeck(read()).html;
    assert.deepEqual(extractDeckSpec(html), expected);
    assert.deepEqual(mountedEditor(extractDeckSpec(html)).getSpec(), expected);
  });

  test(`WP2-S4 ${portable ? 'portable' : 'Node'} strict payload 原子拒絕且不執行 getter`, () => {
    const h = portable ? mountedEditor(input()) : null, api = h?.api || createDeckEditor(input()), read = () => h ? h.getSpec() : api.getSpec();
    const before = read(); let calls = 0;
    const invalid = [null, {}, req({}, 'role-title'), req({}, 'component-portable-quote'), req({}, 'missing'), req({}, undefined, 'missing'),
      ...['https://example.org/a.png', '/tmp/a.png', 'file:///tmp/a.png', 'javascript:alert(1)', 'data:text/html;base64,AA==', 'data:image/bmp;base64,AA==', 'invalid', 1, null].map(dataUri => req({ dataUri })),
      ...[undefined, null, {}, 1].map(alt => req({ dataUri: replacement, alt })),
      ...[undefined, null, 'fill', 1].map(fit => req({ dataUri: replacement, fit })),
      req({ dataUri: replacement, localPath: '/tmp/a.png' }), { ...req(), extra: 1 },
      { ...req(), target: { ...req().target, extra: 1 } }, req(JSON.parse('{"dataUri":"data:image/png;base64,AA==","__proto__":{}}')),
    ];
    for (const part of ['request', 'target', 'value']) {
      const get = r => part === 'request' ? r : r[part];
      for (const mutate of [o => Object.setPrototypeOf(o, { inherited: true }), o => Object.defineProperty(o, Symbol('extra'), { value: 1 }), o => Object.defineProperty(o, 'hidden', { value: 1 }), o => Object.defineProperty(o, 'extra', { get() { calls++; return 1; } })]) {
        const r = req(); mutate(get(r)); invalid.push(r);
      }
      for (const key of Object.keys(get(req()))) {
        const r = req(); Object.defineProperty(get(r), key, { enumerable: true, get() { calls++; throw new Error('getter 不可執行'); } }); invalid.push(r);
      }
    }
    for (const r of invalid) { assert.throws(() => api.executeOperation(r)); assert.deepEqual(read(), before); }
    assert.equal(calls, 0);
    if (h) assert.equal(h.getRevision(), 0);
  });
}

test('WP2-S4 Node compat wrapper 只取 canonical 欄位並保留缺省', () => {
  const api = createDeckEditor(input()), expected = api.getSpec();
  expected.slides[0].content.components[1].dataUri = replacement;
  api.replaceImage('portable', 'perf-image', { dataUri: replacement, localPath: '/private/local.png', unknown: true });
  assert.deepEqual(api.getSpec(), expected);
  assert.throws(() => api.replaceImage('portable', 'portable-quote', { dataUri: replacement }));
});

test('WP2-S4 registry metadata 與 Node/portable 一致', () => {
  const d = OPERATION_DESCRIPTORS['replace-asset']; assert.ok(d);
  assert.equal(d.undoable, false); assert.deepEqual(d.inputSchema.properties.value.required, ['dataUri']);
  assert.equal(d.inputSchema.properties.value.additionalProperties, false);
  assert.deepEqual(JSON.parse(JSON.stringify(mountedEditor(input()).api.operationDescriptors['replace-asset'])), d);
});

test('WP2-S4 portable 局部 DOM、no-op revision、export/reparse', () => {
  const h = mountedEditor(input()), img = image(h), root = img.parentElement, other = image(h, 'component-perf-image');
  img.style.setProperty('opacity', '0.8');
  const untouched = other.outerHTML, beforeRoot = { ...root.attrs }, before = h.getRevision();
  h.api.executeOperation(req());
  assert.equal(image(h), img); assert.equal(img.parentElement, root); assert.deepEqual(root.attrs, beforeRoot);
  assert.equal(other.outerHTML, untouched);
  assert.equal(img.getAttribute('src'), replacement); assert.equal(img.getAttribute('alt'), '保留第二張');
  assert.equal(img.style.getPropertyValue('object-fit'), 'cover'); assert.equal(img.style.getPropertyValue('opacity'), '0.8');
  assert.equal(h.getRevision(), before + 1);
  h.api.executeOperation(req()); assert.equal(h.getRevision(), before + 1);
  h.api.executeOperation(req({ dataUri: original, alt: '<新 & 圖>', fit: 'contain' }));
  assert.equal(img.getAttribute('alt'), '<新 & 圖>'); assert.equal(img.style.getPropertyValue('object-fit'), 'contain');
  const html = h.api.exportHtml(); assert.deepEqual(extractDeckSpec(html), h.getSpec());
  assert.match(html, /alt="&lt;新 &amp; 圖>/); assert.match(html, /object-fit:contain/);
  const snapshot = h.getSpec(), revision = h.getRevision(); img.remove();
  assert.throws(() => h.api.executeOperation(req())); assert.deepEqual(h.getSpec(), snapshot); assert.equal(h.getRevision(), revision);
});

test('WP2-S4 DOM 投影例外還原 canonical 與原 attributes', () => {
  const h = mountedEditor(input()), img = image(h), before = h.getSpec(), attrs = { ...img.attrs };
  img.style = { setProperty() { throw new Error('投影失敗'); } };
  assert.throws(() => h.api.executeOperation(req()), /投影失敗/);
  assert.deepEqual(h.getSpec(), before); assert.deepEqual(img.attrs, attrs); assert.equal(h.getRevision(), 0);
});

test('WP2-S4 portable async 鎖定原 stable image，readonly export／換頁／warnings 保留', async () => {
  const h = mountedEditor(input()); let resolve;
  h.assets.optimizeFile = () => new Promise(ok => { resolve = ok; });
  const pending = h.api.replaceImageFile({ name: '/private/not-persisted.png' });
  h.api.exportHtml(); h.click(h.document.querySelector('.slide[data-slide-id="other"]'));
  h.api.executeOperation(req({ dataUri: original, alt: '等待中另改', fit: 'contain' }, 'component-perf-image'));
  const before = h.getSpec(), result = { dataUri: replacement, warnings: ['animated_gif_preserved'], optimized: false };
  resolve(result); assert.equal(await pending, result);
  const expected = structuredClone(before); expected.slides[0].content.components[1].dataUri = replacement;
  assert.deepEqual(h.getSpec(), expected); assert.equal(image(h, 'component-perf-image').getAttribute('alt'), '等待中另改');
  assert.equal(image(h, 'component-perf-image').getAttribute('src'), replacement);
  assert.equal(image(h, 'component-perf-image', 'other').getAttribute('src'), original);
  assert.match(h.document.querySelector('[data-editor-status]').textContent, /大型 GIF/);
  assert.doesNotMatch(JSON.stringify(extractDeckSpec(h.api.exportHtml())), /not-persisted/);
});

test('WP2-S4 optimizer failure／unsafe result／removed target 原子拒絕', async () => {
  for (const mode of ['optimizer', 'unsafe', 'removed']) {
    const h = mountedEditor(input()); let resolve, reject;
    h.assets.optimizeFile = () => new Promise((ok, fail) => { resolve = ok; reject = fail; });
    const pending = h.api.replaceImageFile({});
    if (mode === 'removed') h.action('delete');
    const before = h.getSpec(), dom = h.document.querySelector('.deck').outerHTML, revision = h.getRevision();
    if (mode === 'optimizer') reject(new Error('解碼失敗'));
    else resolve({ dataUri: mode === 'unsafe' ? 'file:///private/a.png' : replacement, warnings: [], optimized: false });
    await assert.rejects(pending); assert.deepEqual(h.getSpec(), before); assert.equal(h.getRevision(), revision);
    assert.equal(h.document.querySelector('.deck').outerHTML, dom);
  }
});

test('WP2-S4 operation／wrapper no-op 保留 gesture，真修改讓 gesture stale', async () => {
  for (const wrapper of [false, true]) for (const changed of [false, true]) {
    const h = mountedEditor(input()); h.ready(); h.begin(); h.update(20, 10);
    const dataUri = changed ? replacement : original, revision = h.getRevision();
    if (wrapper) await h.api.replaceImageFile({ dataUri }); else h.api.executeOperation(req({ dataUri }));
    assert.equal(h.getRevision(), revision + Number(changed));
    h.finish(); assert.deepEqual(geometry(h.getSpec()), changed ? box : { ...box, x: 820, y: 290 });
  }
});

test('WP2-S4 長 component ID 用 resolved stable identity；無 fit 不添加', () => {
  const spec = input(), id = 'a'.repeat(80); spec.slides[0].content.components[2].id = id;
  delete spec.slides[0].composition.geometryOverrides['second-image']; delete spec.slides[0].content.components[2].fit;
  for (const portable of [false, true]) {
    const h = portable ? mountedEditor(spec) : null, api = h?.api || createDeckEditor(spec);
    const elementId = resolveSlideElementIdentities(spec.slides[0]).components[2];
    api.executeOperation(req({ dataUri: replacement }, elementId));
    const component = (h ? h.getSpec() : api.getSpec()).slides[0].content.components[2];
    assert.equal(component.id, id); assert.equal(component.fit, undefined);
    if (h) assert.equal(image(h, elementId).style.getPropertyValue('object-fit'), 'contain');
  }
});

test('WP2-S4 data properties 含 non-enumerable 欄位也不能靜默遺失', () => {
  for (const portable of [false, true]) {
    const h = portable ? mountedEditor(input()) : null, api = h?.api || createDeckEditor(input());
    const value = Object.create(null);
    for (const [key, v] of Object.entries({ dataUri: replacement, alt: '完整 data property', fit: 'contain' })) Object.defineProperty(value, key, { value: v });
    api.executeOperation(req(value));
    const component = (h ? h.getSpec() : api.getSpec()).slides[0].content.components[2];
    assert.equal(component.dataUri, replacement); assert.equal(component.alt, '完整 data property'); assert.equal(component.fit, 'contain');
  }
});

test('WP2-S4 browser fixture PNG 結構、CRC、scanline 與 render 均有效', async () => {
  const { assetReplacementPng, addAssetReplacementFixture } = await import('../tools/edx-wp2-s4-browser-cases.mjs');
  const { inflateSync } = await import('node:zlib');
  const bytes = Buffer.from(assetReplacementPng.split(',')[1], 'base64');
  assert.equal(bytes.subarray(0, 8).toString('hex'), '89504e470d0a1a0a');
  const crc32 = b => { let crc = 0xffffffff; for (const v of b) { crc ^= v; for (let k = 0; k < 8; k++) crc = (crc >>> 1) ^ ((crc & 1) ? 0xedb88320 : 0); } return (crc ^ 0xffffffff) >>> 0; };
  for (let i = 8; i < bytes.length;) {
    const n = bytes.readUInt32BE(i), type = bytes.toString('ascii', i + 4, i + 8);
    assert.equal(crc32(bytes.subarray(i + 4, i + 8 + n)), bytes.readUInt32BE(i + 8 + n), type);
    if (type === 'IHDR') { assert.equal(bytes.readUInt32BE(i + 8), 1); assert.equal(bytes.readUInt32BE(i + 12), 1); }
    if (type === 'IDAT') assert.equal(inflateSync(bytes.subarray(i + 8, i + 8 + n)).length, 3);
    i += n + 12;
  }
  const spec = fixture(0); spec.slides[0].content.components.pop(); addAssetReplacementFixture(spec);
  const rendered = renderFullDeck(spec); assert.equal(rendered.status, 'pass');
  assert.equal(extractDeckSpec(rendered.html).slides[0].content.components.filter(c => c.type === 'image').length, 2);
});
