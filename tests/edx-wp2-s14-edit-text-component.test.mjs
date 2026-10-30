import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { createDeckEditor, OPERATION_DESCRIPTORS } from '../runtime/deck-editor.js';
import { resolveSlideElementIdentities, extractDeckSpec } from '../runtime/deck-spec.js';
import { mountedEditor, fixture } from '../tools/edx-wp1-s4-perf-mounted.mjs';

const json = value => JSON.parse(JSON.stringify(value));
const text = '  e\u0301\n😀 <script>文字</script><img src=x><a href="x">連結</a> &  ';
const req = (value = text, slideId = 'portable', elementId = 'component-portable-quote') => ({ operation: 'edit-text', target: { slideId, elementId }, value });
const input = () => { const s = fixture(0); s.slides[0].content.components[1].dataUri = 'data:image/png;base64,AA=='; s.slides.push({ ...structuredClone(s.slides[0]), id: 'other' }); return s; };
const node = (h, slide = 'portable', id = 'component-portable-quote') => h.document.querySelector(`.slide[data-slide-id="${slide}"] [data-pptskill-element-id="${id}"]`);
const setup = portable => { const h = portable ? mountedEditor(input()) : null, api = h?.api || createDeckEditor(input()); return { h, api, read: () => h ? h.getSpec() : api.getSpec() }; };
for (const portable of [false, true]) {
  const label = portable ? 'mounted' : 'Node';
  test(`S14 ${label} existing／new／cross-slide text 精確保留與 shared codepoint policy`, () => {
    const { h, api, read } = setup(portable), expected = read();
    for (const value of [text, ' ', '😀'.repeat(500)]) {
      expected.slides[1].content.components[0].text = value;
      assert.deepEqual(json(api.executeOperation(req(value, 'other'))), expected);
    }
    api.executeOperation({ operation: 'insert-element', target: { slideId: 'other' }, value: { component: { id: 'new-text', type: 'text', text: '新字' }, geometry: { x: 600, y: 400, width: 240, height: 160 } } });
    api.executeOperation(req(text, 'other', 'component-new-text'));
    assert.equal(read().slides[1].content.components.at(-1).text, text);
    if (h) { assert.equal(h.getRevision(), 5); assert.equal(node(h, 'other', 'component-new-text').textContent, text); assert.equal(node(h, 'other', 'component-new-text').contentEditable, 'false'); }
  });
  test(`S14 ${label} exact data descriptors／getter0／hidden／symbol／prototype 拒絕`, () => {
    const { h, api, read } = setup(portable), before = read(); let calls = 0;
    for (const part of ['request', 'target']) {
      const get = r => part === 'request' ? r : r.target;
      for (const change of [o => Object.setPrototypeOf(o, { bad: true }), o => Object.defineProperty(o, 'hidden', { value: 1 }), o => { o[Symbol('x')] = 1; }, o => { o.extra = 1; }]) {
        const r = req(); change(get(r)); assert.throws(() => api.executeOperation(r));
      }
      for (const key of Object.keys(get(req()))) for (const change of [o => Object.defineProperty(o, key, { get() { calls++; throw Error('getter'); } }), o => Object.defineProperty(o, key, { enumerable: false }), o => { delete o[key]; }]) {
        const r = req(); change(get(r)); assert.throws(() => api.executeOperation(r));
      }
    }
    for (const value of ['', '😀'.repeat(501), null, 42, {}, ['text']]) assert.throws(() => api.executeOperation(req(value)));
    for (const r of [null, [], req('x', 'missing'), req('x', 'portable', 'missing'), req('x', 'portable', 'component-perf-image')]) assert.throws(() => api.executeOperation(r));
    assert.equal(calls, 0); assert.deepEqual(read(), before); if (h) assert.equal(h.getRevision(), 0);
  });
  test(`S14 ${label} null-proto／crossrealm 接受且 role subtitle 空字串沿舊政策`, () => {
    const { api, read } = setup(portable);
    const r = Object.assign(Object.create(null), req()); r.target = Object.assign(Object.create(null), r.target); api.executeOperation(r);
    api.executeOperation(vm.runInNewContext(`(${JSON.stringify(req('跨 realm'))})`));
    assert.equal(read().slides[0].content.components[0].text, '跨 realm');
    if (portable) { api.executeOperation(req('', 'portable', 'role-subtitle')); assert.equal(read().slides[0].content.subtitle, ''); }
    else assert.throws(() => api.executeOperation(req('', 'portable', 'role-subtitle')), /subtitle/); // Node 原有 deck validation 保持不變。
  });
  test(`S14 ${label} 無 geometry／非文字 type guard／reorder long IDs`, () => {
    const s = input(), slide = s.slides[0], long = 'c'.repeat(80);
    slide.content.components = [{ id: long, type: 'text', text: '長 ID' }, { id: 'citation', type: 'citation', label: '來源', url: 'https://example.com', public: true }, { id: 'table', type: 'table', headers: ['欄'], rows: [['值']] }, { id: 'chart', type: 'chart', chartType: 'bar', labels: ['甲'], series: [{ name: '值', values: [1] }] }];
    slide.composition.slots.component = `content.components.${long}`; delete slide.composition.geometryOverrides;
    const ids = resolveSlideElementIdentities(slide); slide.content.components.reverse();
    const h = portable ? mountedEditor(s) : null, api = h?.api || createDeckEditor(s);
    api.executeOperation(req(text, 'portable', ids.components[0]));
    const out = json(h ? api.getDeckSpec() : api.getSpec()); assert.equal(out.slides[0].content.components.at(-1).text, text);
    for (const id of ids.components.slice(1)) assert.throws(() => api.executeOperation(req('拒絕', 'portable', id)), /text|文字|type/);
  });
  test(`S14 ${label} descriptor 僅 text component authority`, () => {
    const { api } = setup(portable), d = api.operationDescriptors['edit-text'];
    assert.deepEqual(json(d.allowedTargetRoles), ['title', 'subtitle', 'keyPoint', 'component']);
    assert.deepEqual(json(d), json(OPERATION_DESCRIPTORS['edit-text'])); assert.ok(!d.preserves.includes('components'));
    assert.throws(() => d.allowedTargetRoles.push('image')); assert.throws(() => api.executeOperation(req('x', 'portable', 'component-perf-image')));
  });
}
for (const snap of [false, true]) for (const kind of ['drag', 'resize']) test(`S14 mounted snap=${snap} ${kind} invalid/noop 保留 preview；成功取消一次 revision`, () => {
  const h = mountedEditor(input()); if (snap) h.action('snap-layout'); h.ready(); h.begin(kind); h.update(24, 16, kind);
  const before = h.getSpec(), dom = h.document.outerHTML, selected = json(h.api.layout.getSelectionState()), old = node(h), other = node(h, 'other');
  assert.throws(() => h.api.executeOperation(req(''))); h.api.executeOperation(req(before.slides[0].content.components[0].text));
  assert.equal(h.document.outerHTML, dom); assert.equal(h.getRevision(), 0); assert.equal(h.api.layout.getState().gesturing, true); assert.deepEqual(json(h.api.layout.getSelectionState()), selected);
  h.api.executeOperation(req(text, 'other')); h.finish(kind); before.slides[1].content.components[0].text = text;
  assert.deepEqual(h.getSpec(), before); assert.equal(h.getRevision(), 1); assert.equal(h.api.layout.getState().gesturing, false); assert.deepEqual([...h.api.layout.getSelectionState().selected], []);
  assert.equal(node(h), old); assert.equal(node(h, 'other'), other); assert.equal(other.textContent, text); assert.equal(other.querySelector('script,img,a'), null); assert.equal(h.api.layout.getState().enabled, true);
  assert.equal(old.style.left, '800px'); assert.equal(old.closest('.slide').dataset.editorSelected, 'true');
});
for (const mode of ['missing', 'duplicate-root', 'duplicate-slide', 'duplicate-target', 'detached', 'mismatch-text', 'mismatch-target', 'nested-element', 'setter-before', 'setter-after', 'clean']) test(`S14 mounted ${mode} failure canonical／DOM／root／revision／gesture rollback`, () => {
  const h = mountedEditor(input()); h.ready(); h.begin(); h.update(24, 16); const n = node(h, 'other'), parent = n.parentElement;
  if (mode === 'missing' || mode === 'detached') n.remove();
  if (mode === 'duplicate-root') parent.append(n.cloneNode());
  if (mode === 'duplicate-slide') parent.parentElement.append(parent.cloneNode());
  if (mode === 'duplicate-target') { const copy = n.cloneNode(); copy.dataset.pptskillElementId = 'other-id'; parent.append(copy); }
  if (mode === 'mismatch-text') n.textContent = '非 canonical';
  if (mode === 'mismatch-target') n.dataset.editTarget = 'slides.other.content.components.wrong';
  if (mode === 'nested-element') { const child = h.document.createElement('span'); child.textContent = n.textContent; n.textContent = ''; n.append(child); }
  if (mode.startsWith('setter')) { const descriptor = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(n), 'textContent'); Object.defineProperty(n, 'textContent', { configurable: true, get() { return descriptor.get.call(this); }, set(value) { if (mode === 'setter-after') descriptor.set.call(this, value); throw Error(mode); } }); }
  if (mode === 'clean') h.window.__testMutateSpec(s => { s.slides[1].composition.motion = { effect: 'invalid', role: 'text', targets: [] }; });
  // clean() 的故障 fixture 不先呼叫公開 getSpec，避免測試在 operation 前就拋錯。
  const before = mode === 'clean' ? null : h.getSpec(), dom = h.document.outerHTML, selected = json(h.api.layout.getSelectionState());
  assert.throws(() => h.api.executeOperation(req(text, 'other')), mode.startsWith('setter') ? new RegExp(mode) : mode === 'clean' ? /motion|effect|動效/ : /DOM/);
  if (before) assert.deepEqual(h.getSpec(), before); else h.window.__testMutateSpec(s => assert.equal(s.slides[1].content.components[0].text, input().slides[1].content.components[0].text));
  assert.equal(h.document.outerHTML, dom); assert.equal(h.getRevision(), 0); assert.equal(h.api.layout.getState().gesturing, true); assert.deepEqual(json(h.api.layout.getSelectionState()), selected);
  if (!['missing', 'detached'].includes(mode)) assert.equal(node(h, 'other'), n);
});
test('S14 mounted IME guard／未提交 role DOM 保留／component 不 directeditable／export reopen', () => {
  const h = mountedEditor(input()); h.action('edit'); const title = node(h, 'portable', 'role-title'); title.textContent = '未提交組字';
  for (const fn of h.document.body.listeners.compositionstart || []) fn({ target: title });
  const before = h.getSpec(); assert.throws(() => h.api.executeOperation(req()), /IME|組字/); assert.deepEqual(h.getSpec(), before); assert.equal(title.textContent, '未提交組字');
  for (const fn of h.document.body.listeners.compositionend || []) fn({ target: title });
  title.textContent = '另一筆未提交'; h.api.executeOperation(req()); assert.equal(title.textContent, '另一筆未提交'); assert.equal(h.getSpec().slides[0].content.title, '未提交組字'); assert.equal(node(h).contentEditable, 'false');
  title.textContent = '未提交組字'; const exported = h.api.exportHtml(), reopened = createDeckEditor(extractDeckSpec(exported));
  reopened.executeOperation(req('重開可編輯')); assert.equal(reopened.getSpec().slides[0].content.components[0].text, '重開可編輯'); assert.ok(!exported.includes('contenteditable='));
});
for (const portable of [false, true]) test(`S14 ${portable ? 'mounted' : 'Node'} hash collision／同 ID 跨頁／reorder／export 後 stable pair`, () => {
  const s = input(), long = 'a'.repeat(80), collision = 'a'.repeat(61) + '-5143e6d5';
  for (const slide of s.slides) {
    slide.content.components = [{ id: long, type: 'text', text: '長 ID' }, { id: collision, type: 'text', text: '碰撞 ID' }];
    slide.composition.slots.component = `content.components.${long}`; delete slide.composition.geometryOverrides;
  }
  const ids = resolveSlideElementIdentities(s.slides[0]).components; assert.notEqual(ids[0], ids[1]);
  s.slides.reverse(); s.slides[0].content.components.reverse();
  const h = portable ? mountedEditor(s) : null, api = h?.api || createDeckEditor(s), read = () => json(h ? api.getDeckSpec() : api.getSpec()), expected = read();
  for (const [i, id] of ids.entries()) { api.executeOperation(req(`編輯 ${i}`, 'other', id)); expected.slides[0].content.components.find(c => c.id === [long, collision][i]).text = `編輯 ${i}`; }
  assert.deepEqual(read(), expected);
  const reopened = createDeckEditor(h ? extractDeckSpec(h.api.exportHtml()) : read()); reopened.executeOperation(req('重開同 ID', 'portable', ids[0]));
  assert.equal(reopened.getSpec().slides[1].content.components[0].text, '重開同 ID');
});
test('S14 mounted 同值不呼叫 DOM setter；成功僅修改目標純文字', () => {
  const h = mountedEditor(input()), n = node(h), before = h.getSpec(); let calls = 0;
  const descriptor = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(n), 'textContent');
  Object.defineProperty(n, 'textContent', { get() { return descriptor.get.call(this); }, set(value) { calls++; descriptor.set.call(this, value); } });
  h.api.executeOperation(req(before.slides[0].content.components[0].text)); assert.equal(calls, 0); assert.equal(h.getRevision(), 0);
  h.api.executeOperation(req(text)); assert.equal(calls, 1); assert.equal(h.getRevision(), 1);
});
