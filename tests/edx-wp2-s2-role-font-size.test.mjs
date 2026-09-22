import test from 'node:test';
import assert from 'node:assert/strict';
import { createDeckEditor, OPERATION_DESCRIPTORS } from '../runtime/deck-editor.js';
import { sanitizeDeckSpec, extractDeckSpec } from '../runtime/deck-spec.js';
import { renderFullDeck } from '../runtime/full-deck-renderer.js';
import { mountedEditor, fixture, geometry, box } from '../tools/edx-wp1-s4-perf-mounted.mjs';

const req = (fontSize, elementId = 'role-title', slideId = 'portable') => ({ operation: 'set-typography', target: { slideId, elementId }, value: { fontSize } });
const get = (spec, role = 'role-title') => spec.slides[0].composition.typographyOverrides?.[role]?.fontSize;
const node = (h, role = 'role-title') => h.document.querySelector(`[data-pptskill-element-id="${role}"]`);
const dispatch = (h, type, target, fields = {}) => {
  const event = { target, preventDefault() {}, stopImmediatePropagation() {}, ...fields };
  for (const root of [h.document, h.document.body]) for (const fn of root.listeners[type] || []) fn(event);
};

for (const portable of [false, true]) test(`WP2-S2 ${portable ? 'portable' : 'Node'}：boundary/reset/preservation/invalid atomic`, () => {
  const input = fixture(0), other = structuredClone(input.slides[0]); other.id = 'other'; input.slides.push(other);
  const h = portable ? mountedEditor(input) : null, api = h?.api || createDeckEditor(input);
  const read = () => h ? h.getSpec() : api.getSpec(), before = read();
  assert.deepEqual(JSON.parse(JSON.stringify(api.operationDescriptors['set-typography'])), OPERATION_DESCRIPTORS['set-typography']);
  for (const id of ['role-title', 'role-subtitle']) {
    for (const value of [16, 160]) { api.executeOperation(req(value, id)); assert.equal(get(read(), id), value); }
    const snapshot = read();
    for (const value of [15, 161, 20.5, '24', NaN, Infinity, undefined, {}, true]) {
      assert.throws(() => api.executeOperation(req(value, id))); assert.deepEqual(read(), snapshot);
    }
    for (const invalid of [
      { ...req(24, id), extra: 1 }, { ...req(24, id), value: { fontSize: 24, color: 'red' } },
      req(24, 'component-portable-quote'), req(24, 'point-key-point-01'), req(24, '__proto__'), req(24, id, 'foreign'),
      req(24, { toString: () => id }),
      Object.assign(Object.create({ inherited: true }), req(24, id)),
      { ...req(24, id), target: { ...req(24, id).target, extra: 1 } },
      { ...req(24, id), value: Object.assign(Object.create({ extra: true }), { fontSize: 24 }) },
      { ...req(24, id), value: JSON.parse('{"fontSize":24,"__proto__":{}}') },
    ]) { assert.throws(() => api.executeOperation(invalid)); assert.deepEqual(read(), snapshot); }
    api.executeOperation(req(null, id));
  }
  assert.deepEqual(read(), before);
  api.executeOperation(req(44)); api.executeOperation({ operation: 'edit-text', target: req(44).target, value: '新標題' });
  assert.equal(get(read()), 44);
  assert.deepEqual(read().slides[1], before.slides[1]);
  assert.deepEqual(read().style, before.style);
  const composition = structuredClone(read().slides[0].composition); delete composition.typographyOverrides;
  assert.deepEqual(composition, before.slides[0].composition);
});

test('WP2-S2 sanitizer/renderer/export round-trip，空 map 消失且無 subtitle 不創建', () => {
  const input = fixture(0); input.slides[0].composition.typographyOverrides = { 'role-title': { fontSize: 160 } };
  const clean = sanitizeDeckSpec(input); assert.equal(get(clean), 160);
  const rendered = renderFullDeck(clean); assert.equal(rendered.status, 'pass');
  assert.match(rendered.html, /font-size:160px/);
  assert.deepEqual(extractDeckSpec(rendered.html), clean);
  input.slides[0].composition.typographyOverrides = {}; assert.equal(sanitizeDeckSpec(input).slides[0].composition.typographyOverrides, undefined);
  input.slides[0].content.subtitle = '';
  assert.throws(() => createDeckEditor(input).executeOperation(req(20, 'role-subtitle')));
  for (const invalid of [{ 'role-title': { fontSize: 0 } }, { 'role-title': { fontSize: null } }, { 'role-title': { fontSize: 20, weight: 600 } }, { 'role-subtitle': { fontSize: 20 } }, { constructor: { fontSize: 20 } }]) {
    input.slides[0].composition.typographyOverrides = invalid; assert.throws(() => sanitizeDeckSpec(input));
  }
});

test('WP2-S2 mounted：focus toolbar sync、IME guard、reset 保留 default/motion、export', () => {
  const h = mountedEditor(fixture(0)), title = node(h);
  title.style.setProperty('font-size', '52px', 'important'); title.style.setProperty('--pptskill-text-delay', '90ms');
  dispatch(h, 'dblclick', title);
  const toolbar = h.document.querySelector('[data-pptskill-typography-toolbar]'), input = h.document.querySelector('[data-typography-size]');
  assert.ok(toolbar); assert.equal(toolbar.hidden, false);
  title.textContent = '焦點移轉完整文字';
  dispatch(h, 'focusout', title, { relatedTarget: input }); input.value = '64'; h.action('apply-typography');
  assert.equal(get(h.getSpec()), 64); assert.equal(h.getSpec().slides[0].content.title, '焦點移轉完整文字');
  assert.equal(title.style.getPropertyValue('font-size'), '64px');
  dispatch(h, 'compositionstart', title); title.textContent = '部分'; input.value = '80';
  h.action('apply-typography'); assert.equal(get(h.getSpec()), 64);
  assert.throws(() => h.api.executeOperation(req(80)), /IME|組字/);
  title.textContent = '完整組字'; dispatch(h, 'compositionend', title);
  h.action('reset-typography'); assert.equal(get(h.getSpec()), undefined);
  assert.equal(title.style.getPropertyValue('font-size'), '52px'); assert.equal(title.style.getPropertyPriority('font-size'), 'important');
  assert.equal(title.style.getPropertyValue('--pptskill-text-delay'), '90ms');
  input.value = '48'; h.action('apply-typography');
  const html = h.api.exportHtml(); assert.equal(get(extractDeckSpec(html)), 48);
  assert.doesNotMatch(html, /<[^>]+(?:data-pptskill-typography-toolbar|contenteditable)=/);
  h.api.layout.setMode(true); assert.equal(toolbar.hidden, true); input.value = '72'; h.action('apply-typography'); assert.equal(get(h.getSpec()), 48);
});

test('WP2-S2 no-op/invalid 不增 revision，真正改字級會使既有 gesture stale', () => {
  for (const change of [false, true]) {
    const h = mountedEditor(fixture(0)); h.api.executeOperation(req(48)); h.ready(); h.begin(); h.update(20, 10);
    h.api.executeOperation(req(change ? 64 : 48));
    assert.throws(() => h.api.executeOperation(req(15)));
    h.finish();
    assert.deepEqual(geometry(h.getSpec()), change ? box : { ...box, x: 820, y: 290 });
  }
  const h = mountedEditor(fixture(0)); h.ready(); h.begin(); h.update(20, 10); h.api.executeOperation(req(null)); h.finish();
  assert.deepEqual(geometry(h.getSpec()), { ...box, x: 820, y: 290 });
});

test('WP2-S2 切頁/模式與非法 input 不留下可用 stale target', () => {
  const input = fixture(0), second = structuredClone(input.slides[0]); second.id = 'other'; input.slides.push(second);
  const h = mountedEditor(input), title = node(h), field = h.document.querySelector('[data-typography-size]'), toolbar = h.document.querySelector('[data-pptskill-typography-toolbar]');
  dispatch(h, 'dblclick', title);
  for (const invalid of ['', '15', '161', '20.5', 'NaN', 'Infinity']) {
    const before = h.getSpec(); field.value = invalid; h.action('apply-typography'); assert.deepEqual(h.getSpec(), before);
  }
  h.click(h.document.querySelector('.slide[data-slide-id="other"]'));
  assert.equal(toolbar.hidden, true); field.value = '32'; h.action('apply-typography'); assert.equal(get(h.getSpec()), undefined);
  dispatch(h, 'dblclick', title); h.action('edit'); assert.equal(toolbar.hidden, true);
  h.action('edit'); h.action('apply-typography'); assert.equal(get(h.getSpec()), undefined);
  dispatch(h, 'focusin', node(h, 'point-key-point-01')); assert.equal(toolbar.hidden, true);
});

test('WP2-S2 初次 render 同時保留 motion styles；reopen reset 回 CSS default', () => {
  const input = fixture(0);
  input.slides[0].composition.motion = { effect: 'underline-sweep', role: 'text', replay: 'slide-visible', staggerMs: 90, targets: [{ ref: 'content.title' }, { ref: 'content.subtitle' }] };
  input.slides[0].composition.typographyOverrides = { 'role-title': { fontSize: 72 }, 'role-subtitle': { fontSize: 36 } };
  const rendered = renderFullDeck(input); assert.equal(rendered.status, 'pass', JSON.stringify(rendered.errors));
  assert.match(rendered.html, /style="--pptskill-text-delay:0ms;font-size:72px"/);
  assert.match(rendered.html, /style="--pptskill-text-delay:90ms;font-size:36px"/);
  const h = mountedEditor(extractDeckSpec(rendered.html)); h.api.executeOperation(req(null));
  assert.equal(node(h).style.getPropertyValue('font-size'), '');
  assert.equal(get(h.getSpec(), 'role-subtitle'), 36);
  assert.deepEqual(h.getSpec().slides[0].composition.motion, input.slides[0].composition.motion);
});
