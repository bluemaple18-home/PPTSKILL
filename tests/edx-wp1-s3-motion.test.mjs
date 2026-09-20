import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import vm from 'node:vm';
import { buildComponentGeometryRuntime } from '../runtime/component-geometry.js';
import { buildDeckEditorRuntimeScript, createDeckEditor } from '../runtime/deck-editor.js';
import { resolveSlideElementIdentities, extractDeckSpec } from '../runtime/deck-spec.js';
import { renderFullDeck } from '../runtime/full-deck-renderer.js';

const fixture = JSON.parse(await readFile(new URL('../fixtures/full-deck-spec.json', import.meta.url), 'utf8'));
const box = { x: 820, y: 300, width: 600, height: 400 };
// 最小 CSSStyleDeclaration 替身：測 projector 行為；實際 cascade 由 attach-only browser 驗收。
class Style {
  constructor(text = '') { this.values = new Map(); this.cssText = text; }
  set cssText(text) {
    this.values.clear();
    for (const entry of text.split(';')) {
      const i = entry.indexOf(':'); if (i < 0) continue;
      this.setProperty(entry.slice(0, i).trim(), entry.slice(i + 1).replace(/!important\s*$/, '').trim(), /!important\s*$/.test(entry) ? 'important' : '');
    }
  }
  get cssText() { return [...this.values].map(([k, [v, p]]) => `${k}:${v}${p ? '!important' : ''}`).join(';'); }
  setProperty(k, v, p = '') { this.values.set(k, [v, p]); }
  getPropertyValue(k) { return this.values.get(k)?.[0] || ''; }
  getPropertyPriority(k) { return this.values.get(k)?.[1] || ''; }
  removeProperty(k) { this.values.delete(k); }
}
function harness({ canonical = true, legacy = true, override = true } = {}) {
  const state = structuredClone(fixture); state.slides = state.slides.filter(s => s.id === 'portable');
  if (override) state.slides[0].composition.geometryOverrides = { 'portable-quote': box };
  const element = {
    dataset: { editTarget: 'slides.portable.content.components.portable-quote', pptskillElementId: 'component-portable-quote', ...(canonical ? { pptskillGeometry: 'canonical' } : {}) },
    style: new Style('color:rebeccapurple!important;--custom:keep;opacity:.73;' + (legacy ? 'transform:none!important;translate:none!important;rotate:none!important;scale:none!important;' : 'transform:rotate(2deg);') + 'left:999px;top:777px;width:123px;height:234px'),
    setAttribute(k, v) { if (k === 'style') this.style.cssText = v; else if (k === 'data-pptskill-geometry') this.dataset.pptskillGeometry = v; },
    getAttribute(k) { return k === 'data-pptskill-geometry' ? this.dataset.pptskillGeometry ?? null : null; },
    removeAttribute(k) { if (k === 'style') this.style.cssText = ''; else if (k === 'data-pptskill-geometry') delete this.dataset.pptskillGeometry; },
  };
  const node = { append(e) { e.parentElement = this; } }; element.parentElement = node;
  const context = { resolveSlideElementIdentities, CSS: { escape: v => v }, q: selector => selector.startsWith('.slide') ? node : element, qa: () => [element] };
  const projector = buildDeckEditorRuntimeScript().split('const projectComponentGeometry=')[1].split('\nconst cleanupComponentInteractionClone=')[0];
  vm.runInNewContext(buildComponentGeometryRuntime() + '\nglobalThis.project=' + projector, context);
  return { element, state, project: () => context.project({}, state) };
}

test('舊 geometry suppression 清除、preview 回復 canonical，保留無關 inline style／priority', () => {
  const h = harness(); h.project();
  for (const k of ['transform', 'translate', 'rotate', 'scale']) assert.equal(h.element.style.getPropertyValue(k), '', k);
  assert.equal(h.element.style.getPropertyValue('left'), '820px');
  assert.equal(h.element.style.getPropertyValue('width'), '600px');
  assert.equal(h.element.style.getPropertyValue('color'), 'rebeccapurple');
  assert.equal(h.element.style.getPropertyPriority('color'), 'important');
  assert.equal(h.element.style.getPropertyValue('--custom'), 'keep');
  assert.equal(h.element.style.getPropertyValue('opacity'), '.73');
  h.element.style.setProperty('left', '950px'); h.project();
  assert.equal(h.element.style.getPropertyValue('left'), '820px');
  const once = h.element.style.cssText; h.project(); assert.equal(h.element.style.cssText, once);
});
test('非 geometry inline transform 與無 override 元件不被抹除', () => {
  for (const options of [{ legacy: false }, { canonical: false, legacy: false, override: false }]) {
    const h = harness(options); h.project();
    assert.equal(h.element.style.getPropertyValue('transform'), 'rotate(2deg)');
    assert.equal(h.element.style.getPropertyValue('--custom'), 'keep');
  }
});
test('renderer 與 export/reopen spec 的 move/resize 不壓制 motion', () => {
  const editor = createDeckEditor(fixture), target = { slideId: 'portable', elementId: 'component-portable-quote' };
  editor.executeOperation({ operation: 'move-element', target, value: { x: box.x, y: box.y } });
  editor.executeOperation({ operation: 'resize-element', target, value: { width: box.width, height: box.height } });
  const result = renderFullDeck(editor.getSpec()); assert.equal(result.status, 'pass');
  const opening = result.html.match(/<blockquote[^>]*data-pptskill-element-id="component-portable-quote"[^>]*>/)[0];
  const style = new Style(opening.match(/style="([^"]+)"/)[1]);
  assert.equal(style.getPropertyValue('transform'), '');
  assert.equal(style.getPropertyValue('left'), '820px');
  const reopened = extractDeckSpec(result.html); assert.deepEqual(reopened, editor.getSpec());
  assert.deepEqual(reopened.slides.find(s => s.id === 'portable').composition.geometryOverrides['portable-quote'], box);
});

test('mounted public preview/cancel/commit/export clone 保留無關 style 與 motion seam', async () => {
  const { mountedEditor, request, geometry } = await import('../tools/edx-wp1-s4-perf-mounted.mjs');
  const h = mountedEditor(), e = h.component();
  e.style.setProperty('color', 'rebeccapurple', 'important'); e.style.setProperty('--custom', 'keep');
  for (const key of ['transform', 'translate', 'rotate', 'scale']) e.style.setProperty(key, 'none', 'important');
  h.api.executeOperation(request('move-element', { x: 820, y: 300 }));
  h.api.executeOperation(request('resize-element', { width: 600, height: 400 }));
  const committed = h.getSpec(); h.ready(); h.begin(); h.update(20, 10);
  assert.deepEqual(h.getSpec(), committed); assert.equal(e.style.left, '840px');
  const html = h.api.exportHtml(), tag = html.match(/<blockquote[^>]*data-pptskill-element-id="component-portable-quote"[^>]*>/)[0];
  const projected = new Style(tag.match(/style="([^"]+)"/)[1]);
  assert.equal(projected.getPropertyValue('left'), '820px');
  assert.equal(projected.getPropertyValue('--custom'), 'keep');
  assert.equal(projected.getPropertyPriority('color'), 'important');
  assert.equal(projected.getPropertyValue('transform'), '');
  assert.equal(e.style.left, '840px', 'export clone 不改 live preview');
  h.api.layout.cancel(); h.finish(); assert.deepEqual(h.getSpec(), committed); assert.equal(e.style.left, '820px');
  h.begin(); h.update(20, 10); h.finish(); assert.deepEqual(geometry(h.getSpec()), { ...box, x: 840, y: 310 });
  assert.equal(e.style.getPropertyPriority('color'), 'important'); assert.equal(e.style.transform, '');
  assert.deepEqual(extractDeckSpec(h.api.exportHtml()), h.getSpec());
});
test('三種 browser treatment fixture 使用當前 renderer、可攜 canonical 且未改 motion CSS', async () => {
  const { buildMotionFixture, motionTreatments } = await import('../tools/edx-wp1-s3-motion-browser-cases.mjs');
  for (const treatment of motionTreatments) {
    const { spec, html } = await buildMotionFixture(treatment);
    const tag = html.match(/<[^>]*data-pptskill-element-id="component-portable-quote"[^>]*>/)[0];
    assert.ok(tag.includes(`data-effect-treatment="${treatment}"`));
    assert.doesNotMatch(tag, /transform:|translate:|rotate:|scale:/);
    assert.deepEqual(extractDeckSpec(html), spec);
    assert.deepEqual([...html.matchAll(/<style[^>]*>[\s\S]*?<\/style>/g)].map(m => m[0]), [...renderFullDeck(spec).html.matchAll(/<style[^>]*>[\s\S]*?<\/style>/g)].map(m => m[0]));
  }
});
