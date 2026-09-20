import assert from 'node:assert/strict';
import test from 'node:test';
import { createHash } from 'node:crypto';
const digest = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');
const sameSpec = (actual, expected) => assert.equal(digest(actual), digest(expected), 'canonical spec SHA');
import { extractDeckSpec } from '../runtime/deck-spec.js';
import { mountedEditor, fixture, request, target, box, geometry } from '../tools/edx-wp1-s4-perf-mounted.mjs';

for (const mib of [1, 6, 12]) test(`mounted ${mib} MiB pointer update/preview 不讀 payload、不序列化`, () => {
  const h = mountedEditor(fixture(mib)); h.ready(); h.begin(); h.resetCounts();
  for (let i = 1; i <= 20; i++) h.update(i, i);
  assert.deepEqual(h.counts, { payloadReads: 0, serializations: 0, wholeSpecSerializations: 0 });
  assert.equal(h.component().style.left, '820px');
  h.finish(); assert.deepEqual(geometry(h.getSpec()), { ...box, x: 820, y: 300 });
});

test('mounted readonly/noop/invalid/preview export 換 object 後 release 至多一次且可 reopen', () => {
  const h = mountedEditor(); h.ready(); h.begin(); h.update(20, 10);
  const before = h.getSpec();
  h.api.getDeckSpec(); void h.api.operationDescriptors;
  h.api.executeOperation(request('move-element', { x: box.x, y: box.y }));
  h.api.applyLocalPatch({ slideId: target.slideId, region: 'content.components.portable-quote', value: { text: before.slides[0].content.components[0].text } });
  assert.throws(() => h.api.executeOperation(request('move-element', { x: -1, y: 0 })));
  const html = h.api.exportHtml();
  sameSpec(extractDeckSpec(html), before);
  h.api.prepareExport(); h.api.getSizeReport();
  assert.equal(h.api.layout.getState().gesturing, true);
  h.finish(); const after = h.getSpec();
  assert.deepEqual(geometry(after), { ...box, x: 820, y: 290 });
  h.finish(); sameSpec(h.getSpec(), after);
  const reopened = mountedEditor(extractDeckSpec(h.api.exportHtml()));
  reopened.ready(); reopened.begin(); reopened.update(10, 10); reopened.finish();
  assert.deepEqual(geometry(reopened.getSpec()), { ...box, x: 830, y: 300 });
});

const semanticCases = [
  ['public text', h => h.api.executeOperation(request('edit-text', '新標題', { ...target, elementId: 'role-title' }))],
  ['legacy text', h => h.api.applyLocalPatch({ slideId: target.slideId, region: 'content.subtitle', value: '新副標' })],
  ['legacy component', h => h.api.applyLocalPatch({ slideId: target.slideId, region: 'content.components.perf-image', value: { alt: '新圖片說明' } })],
  ['geometry', h => h.api.executeOperation(request('move-element', { x: 850, y: 300 }))],
  ['sync text/export', h => { h.document.querySelector('[data-pptskill-element-id="role-title"]').textContent = 'DOM 新標題'; h.api.exportHtml(); }],
  ['asset replace', h => h.api.replaceImageFile({ dataUri: 'data:image/png;base64,BBBB' })],
  ['keyPoint', h => h.api.executeOperation(request('edit-text', '新重點', { ...target, elementId: 'point-key-point-01' }))],
  ['sync component text', h => { h.component().textContent = 'DOM 元件新內容'; h.api.exportHtml(); }],
  ['change then revert', h => { const old = h.getSpec().slides[0].content.title; h.api.executeOperation(request('edit-text', '暫時新標題', { ...target, elementId: 'role-title' })); h.api.executeOperation(request('edit-text', old, { ...target, elementId: 'role-title' })); }],
  ['duplicate', h => h.action('duplicate')],
];
for (const [label, mutate] of semanticCases) test(`mounted semantic ${label} 使 gesture stale，不覆寫新 state`, async () => {
  const h = mountedEditor(); h.ready(); h.begin(); h.update(20, 10);
  await mutate(h); const expected = h.getSpec();
  h.update(30, 20); h.finish(); sameSpec(h.getSpec(), expected);
  assert.equal(h.api.layout.getState().gesturing, false);
});

test('mounted reorder/delete/unrelated slide mutation 取消 gesture', () => {
  for (const mutate of [h => h.action('move-down'), h => h.action('delete'), h => h.api.executeOperation(request('edit-text', '第二頁新內容', { slideId: 'second', elementId: 'role-title' }))]) {
    const input = fixture(); input.slides.push({ ...structuredClone(input.slides[0]), id: 'second' });
    const h = mountedEditor(input); h.ready(); h.begin(); h.update(20, 10); mutate(h); const expected = h.getSpec();
    h.update(30, 20); h.finish(); sameSpec(h.getSpec(), expected);
  }
});

test('mounted async asset 在 readonly export 換 object 後仍寫入 live canonical，同值不假 stale', async () => {
  for (const changed of [false, true]) {
    const h = mountedEditor(), old = h.getSpec().slides[0].content.components.find(c => c.type === 'image').dataUri;
    let resolve; h.assets.optimizeFile = () => new Promise(ok => { resolve = ok; });
    h.ready(); h.begin(); h.update(20, 10);
    const replacing = h.api.replaceImageFile({}); h.api.exportHtml();
    const dataUri = changed ? 'data:image/png;base64,BBBB' : old;
    resolve({ dataUri, warnings: [], optimized: false }); await replacing;
    assert.equal(digest(h.getSpec().slides[0].content.components.find(c => c.type === 'image').dataUri), digest(dataUri));
    h.finish(); assert.deepEqual(geometry(h.getSpec()), changed ? box : { ...box, x: 820, y: 290 });
  }
});

test('mounted noop image/text、invalid component patch 不假 mutation', async () => {
  const h = mountedEditor(), before = h.getSpec(); h.ready(); h.begin(); h.update(20, 10);
  await h.api.replaceImageFile({ dataUri: before.slides[0].content.components.find(c => c.type === 'image').dataUri });
  h.api.executeOperation(request('edit-text', before.slides[0].content.title, { ...target, elementId: 'role-title' }));
  assert.throws(() => h.api.applyLocalPatch({ slideId: target.slideId, region: 'content.components.perf-image', value: { dataUri: 'invalid' } }));
  sameSpec(h.getSpec(), before);
  h.finish(); assert.deepEqual(geometry(h.getSpec()), { ...box, x: 820, y: 290 });
});

test('mounted async asset 刪除 captured target 不回寫；換頁仍只改 captured identity', async () => {
  for (const removed of [false, true]) {
    const h = mountedEditor(); let resolve;
    h.assets.optimizeFile = () => new Promise(ok => { resolve = ok; });
    const pending = h.api.replaceImageFile({});
    h.action('duplicate');
    if (removed) {
      h.document.listeners.click.forEach(fn => fn({ target: h.component(), preventDefault() {} }));
      h.action('delete');
    }
    const before = h.getSpec(); resolve({ dataUri: 'data:image/png;base64,BBBB', warnings: [], optimized: false });
    if (removed) { await assert.rejects(pending, /圖片元件已移除/); sameSpec(h.getSpec(), before); }
    else {
      await pending; const after = h.getSpec();
      assert.equal(after.slides[0].content.components.find(c => c.type === 'image').dataUri, 'data:image/png;base64,BBBB');
      assert.equal(digest(after.slides[1]), digest(before.slides[1]));
    }
  }
});

test('mounted target replacement/deletion/mode/cancel/invalid/noop 不提交', () => {
  for (const change of [h => h.component().replaceWith(h.component().cloneNode()), h => h.component().remove(), h => h.api.layout.setMode(false), h => h.api.layout.cancel()]) {
    const h = mountedEditor(), before = h.getSpec(); h.ready(); h.begin(); h.update(20, 10); change(h); h.finish(); sameSpec(h.getSpec(), before);
  }
  for (const [kind, x, y] of [['drag', 0, 0], ['drag', -900, 0], ['resize', -630, 0]]) {
    const h = mountedEditor(), before = h.getSpec(); h.ready(); h.begin(kind); h.update(x, y, kind); h.finish(kind); sameSpec(h.getSpec(), before);
  }
});
