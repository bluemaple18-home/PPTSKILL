import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createDeckEditor } from '../runtime/deck-editor.js';
import { extractDeckSpec, resolveSlideElementIdentities, sanitizeDeckSpec } from '../runtime/deck-spec.js';
import { renderFullDeck } from '../runtime/full-deck-renderer.js';
import { fixture, mountedEditor } from '../tools/edx-wp1-s4-perf-mounted.mjs';

const source = () => {
  const spec = fixture(0);
  spec.slides[0].composition.typographyOverrides = { 'role-title': { fontSize: 96 } };
  return sanitizeDeckSpec(spec);
};
const request = (spec, composition, revision = 0, replaceScopes = ['variant'], confirmedScopes = replaceScopes, slideId = 'portable') => ({
  operation: 'recompose-slide',
  target: { deckId: spec.deckId, slideId, revision },
  value: { composition, replaceScopes, confirmedScopes },
});
const candidate = (spec, variant = 'evidence-axis') => ({ ...structuredClone(spec.slides[0].composition), variant });
const freshVisual = spec => {
  const markup = renderFullDeck(spec).html.match(/<span class="page-word[^>]*data-type-visual[^>]*><\/span>/)?.[0];
  if (!markup) return null;
  const value = name => markup.match(new RegExp(`${name}="([^"]*)"`))?.[1] ?? null;
  return { className: value('class'), word: value('data-word'), role: value('data-effect-role'), hidden: value('aria-hidden') };
};
const liveVisual = slide => {
  const node = slide.querySelector('[data-type-visual]');
  return node ? { className: node.getAttribute('class'), word: node.getAttribute('data-word'),
    role: node.getAttribute('data-effect-role'), hidden: node.getAttribute('aria-hidden') } : null;
};
const seedWorldChrome = (h, spec) => {
  const slide = h.document.querySelector('.slide'), rule = h.document.createElement('span');
  rule.setAttribute('class', 'effect-rule');
  rule.setAttribute('data-effect-role', 'diagram');
  slide.insertBefore(rule, slide.children[0] ?? null);
  const visual = freshVisual(spec);
  if (visual) {
    const node = h.document.createElement('span');
    node.setAttribute('class', visual.className);
    node.setAttribute('data-word', visual.word);
    node.setAttribute('data-type-visual', '');
    node.setAttribute('data-effect-role', visual.role);
    node.setAttribute('data-effect-treatment', 'none');
    node.setAttribute('aria-hidden', visual.hidden);
    slide.insertBefore(node, rule);
  }
};
const mounted = spec => {
  const h = mountedEditor(spec);
  h.document.querySelector('.deck').dataset.visualWorld = 'typography-hero';
  h.document.querySelector('.slide').setAttribute('class', 'slide primitive-component-focus variant-quote-monument');
  seedWorldChrome(h, spec);
  return h;
};
const resetRequest = (spec, revision, confirmed = true, slideId = 'portable') => ({
  operation: 'reset-slide', target: { deckId: spec.deckId, slideId, revision }, value: { confirmed },
});

test('Core5 Reset Node 僅回復指定 slide 的 edit-start baseline，取消與 stale 不變', () => {
  const spec = source(), other = structuredClone(spec.slides[0]);
  other.id = 'other'; spec.slides.push(other);
  const editor = createDeckEditor(spec), baseline = editor.getSpec();
  editor.executeOperation({ operation: 'edit-text', target: { slideId: 'portable', elementId: 'role-title' }, value: '已修改標題' });
  editor.executeOperation({ operation: 'edit-text', target: { slideId: 'other', elementId: 'role-title' }, value: '其他頁保留修改' });
  const beforeReset = editor.getSpec(), revision = editor.getRevision();
  editor.executeOperation(resetRequest(spec, revision, false));
  assert.deepEqual(editor.getSpec(), beforeReset);
  assert.equal(editor.getRevision(), revision);
  assert.throws(() => editor.executeOperation(resetRequest(spec, revision - 1)), /revision/);
  editor.executeOperation(resetRequest(spec, revision));
  assert.deepEqual(editor.getSpec().slides[0], baseline.slides[0]);
  assert.deepEqual(editor.getSpec().slides[1], beforeReset.slides[1]);
  assert.deepEqual(editor.getSpec().style, beforeReset.style);
  assert.equal(editor.getRevision(), revision + 1);
  editor.undo(); assert.deepEqual(editor.getSpec(), beforeReset);
  editor.redo(); assert.deepEqual(editor.getSpec().slides[0], baseline.slides[0]);
  assert.deepEqual(editor.getSpec().slides[1], beforeReset.slides[1]);
  const duplicate = editor.duplicate(0);
  assert.throws(() => editor.executeOperation(resetRequest(editor.getSpec(), editor.getRevision(), true, duplicate)), /基準/);
});

test('Core5 Reset portable 元件增刪與標題改動整頁回復，Undo／Redo 同步 DOM', () => {
  const input = source();
  input.slides[0].composition.geometryOverrides['perf-image'] = { x: 300, y: 320, width: 320, height: 220 };
  const spec = sanitizeDeckSpec(input), h = mounted(spec), baseline = h.getSpec();
  h.api.layout.setMode(true);
  h.api.executeOperation({ operation: 'delete-element', target: { slideId: 'portable', elementId: 'component-perf-image' }, value: { confirm: true } });
  h.api.executeOperation({ operation: 'insert-element', target: { slideId: 'portable' }, value: {
    component: { id: 'new-text', type: 'text', text: '新增文字' }, geometry: { x: 300, y: 300, width: 240, height: 160 },
  } });
  h.api.executeOperation({ operation: 'edit-text', target: { slideId: 'portable', elementId: 'role-title' }, value: '修改標題' });
  const edited = h.getSpec(), revision = h.getRevision();
  h.api.executeOperation(resetRequest(spec, revision, false));
  assert.deepEqual(h.getSpec(), edited);
  assert.equal(h.getRevision(), revision);
  h.api.executeOperation(resetRequest(spec, revision));
  assert.deepEqual(h.getSpec(), baseline);
  assert.equal(h.document.querySelectorAll('[data-pptskill-element-id="component-perf-image"]').length, 1);
  assert.equal(h.document.querySelectorAll('[data-pptskill-element-id="component-new-text"]').length, 0);
  assert.equal(h.getRevision(), revision + 1);
  h.api.undo(); assert.deepEqual(h.getSpec(), edited);
  assert.equal(h.document.querySelectorAll('[data-pptskill-element-id="component-new-text"]').length, 1);
  h.api.redo(); assert.deepEqual(h.getSpec(), baseline);
});

test('Core5 Reset UI 明列清除範圍；取消不變，確認後只重設本頁', () => {
  const spec = source(), h = mounted(spec), baseline = h.getSpec();
  h.api.executeOperation({ operation: 'edit-text', target: { slideId: 'portable', elementId: 'role-title' }, value: '修改標題' });
  const edited = h.getSpec(), revision = h.getRevision();
  let prompt = '';
  h.window.confirm = message => { prompt = message; return false; };
  h.action('reset-slide');
  assert.match(prompt, /文字、元件與人工版面/);
  assert.deepEqual(h.getSpec(), edited);
  assert.equal(h.getRevision(), revision);
  h.window.confirm = () => true;
  h.action('reset-slide');
  assert.deepEqual(h.getSpec(), baseline);
  assert.equal(h.getRevision(), revision + 1);
});

test('Core5 Recompose UI 明列取代範圍；取消不變，確認後只清明示字級', () => {
  const spec = source(), h = mounted(spec), original = h.getSpec();
  let prompts = ['evidence-axis', '3'], confirmation = '';
  h.window.prompt = () => prompts.shift();
  h.window.confirm = message => { confirmation = message; return false; };
  h.action('recompose-slide');
  assert.match(confirmation, /樣式、人工字級/);
  assert.deepEqual(h.getSpec(), original);
  assert.equal(h.getRevision(), 0);
  prompts = ['evidence-axis', '3'];
  h.window.confirm = () => true;
  h.action('recompose-slide');
  const result = h.getSpec();
  assert.equal(result.slides[0].composition.variant, 'evidence-axis');
  assert.equal(result.slides[0].composition.typographyOverrides, undefined);
  assert.deepEqual(result.slides[0].composition.geometryOverrides, original.slides[0].composition.geometryOverrides);
  assert.deepEqual(result.slides[0].content, original.slides[0].content);
  assert.equal(h.getRevision(), 1);
  assert.deepEqual(liveVisual(h.document.querySelector('.slide')), freshVisual(result));
  prompts = ['不支援'];
  h.action('recompose-slide');
  assert.deepEqual(h.getSpec(), result);
  assert.equal(h.getRevision(), 1);
});

test('Core5 Reset DOM replacement 後故障須回退 canonical／DOM／history／revision', () => {
  const spec = source(), h = mounted(spec);
  h.api.executeOperation({ operation: 'edit-text', target: { slideId: 'portable', elementId: 'role-title' }, value: '修改標題' });
  const before = h.getSpec(), revision = h.getRevision(), history = h.api.getHistoryState();
  const root = h.document.querySelector('.slide'), original = root.replaceWith;
  let fault = true;
  root.replaceWith = function (...nodes) {
    original.call(this, ...nodes);
    if (fault) { fault = false; throw Error('reset replacement fault'); }
  };
  assert.throws(() => h.api.executeOperation(resetRequest(spec, revision)), /reset replacement fault/);
  assert.deepEqual(h.getSpec(), before);
  assert.equal(h.document.querySelector('.slide'), root);
  assert.equal(root.querySelector('[data-pptskill-element-id="role-title"]').textContent, '修改標題');
  assert.equal(h.getRevision(), revision);
  assert.deepEqual(h.api.getHistoryState(), history);
});

test('Core5 Reset 成功後草稿與 export/reopen 均是 baseline', async () => {
  const values = new Map(), storage = { getItem: key => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value), removeItem: key => values.delete(key) };
  const previous = Object.getOwnPropertyDescriptor(Object.prototype, 'localStorage');
  Object.defineProperty(Object.prototype, 'localStorage', { configurable: true, get: () => storage });
  try {
    const spec = source(), h = mounted(spec), baseline = h.getSpec();
    h.api.executeOperation({ operation: 'edit-text', target: { slideId: 'portable', elementId: 'role-title' }, value: '修改標題' });
    h.api.executeOperation(resetRequest(spec, h.getRevision()));
    await Promise.resolve();
    const draftKey = [...values.keys()].find(key => key.startsWith('pptskill:draft:v1:') && !key.endsWith(':probe'));
    assert.deepEqual(JSON.parse(values.get(draftKey)).spec, baseline);
    const reopened = extractDeckSpec(h.api.exportHtml());
    assert.deepEqual(reopened, baseline);
    assert.equal(renderFullDeck(reopened).status, 'pass');
  } finally {
    if (previous) Object.defineProperty(Object.prototype, 'localStorage', previous);
    else delete Object.prototype.localStorage;
  }
});

test('Core5 Node recompose 保留未列 overrides／content，並可 Undo／Redo', () => {
  const spec = source(), editor = createDeckEditor(spec), next = candidate(spec);
  const before = editor.getSpec();
  editor.executeOperation(request(spec, next));
  assert.equal(editor.getSpec().slides[0].composition.variant, 'evidence-axis');
  assert.deepEqual(editor.getSpec().slides[0].composition.geometryOverrides, before.slides[0].composition.geometryOverrides);
  assert.deepEqual(editor.getSpec().slides[0].composition.typographyOverrides, before.slides[0].composition.typographyOverrides);
  assert.deepEqual(editor.getSpec().slides[0].content, before.slides[0].content);
  editor.undo(); assert.deepEqual(editor.getSpec(), before);
  editor.redo(); assert.equal(editor.getSpec().slides[0].composition.variant, 'evidence-axis');
});

test('Core5 Node 只取代明示 overrides；stale／錯 deck／scope／primitive／slots／unsupported variant fail closed', () => {
  const spec = source(), editor = createDeckEditor(spec), original = editor.getSpec();
  const next = candidate(spec);
  next.geometryOverrides['portable-quote'].x += 24;
  assert.throws(() => editor.executeOperation(request(spec, next)), /scope|授權/);
  assert.throws(() => editor.executeOperation(request(spec, next, 0, ['variant', 'geometryOverrides'], ['variant'])), /確認/);
  assert.throws(() => editor.executeOperation(request(spec, { ...next, primitive: 'title-points' }, 0, ['variant', 'geometryOverrides'])), /primitive/);
  assert.throws(() => editor.executeOperation(request(spec, { ...next, slots: { ...next.slots, title: 'content.subtitle' } }, 0, ['variant', 'geometryOverrides'])), /slots/);
  assert.throws(() => editor.executeOperation(request(spec, candidate(spec, 'not-a-renderer-variant'))), /variant/);
  assert.throws(() => editor.executeOperation({ ...request(spec, next, 0, ['variant', 'geometryOverrides']), target: { deckId: 'wrong', slideId: 'portable', revision: 0 } }), /deck/);
  assert.deepEqual(editor.getSpec(), original);
  editor.executeOperation(request(spec, next, 0, ['variant', 'geometryOverrides']));
  assert.equal(editor.getSpec().slides[0].composition.geometryOverrides['portable-quote'].x, original.slides[0].composition.geometryOverrides['portable-quote'].x + 24);
  assert.deepEqual(editor.getSpec().slides[0].composition.typographyOverrides, original.slides[0].composition.typographyOverrides);
  assert.throws(() => editor.executeOperation(request(spec, candidate(spec), 0)), /revision/);
  const getter = request(spec, candidate(spec), 1);
  Object.defineProperty(getter.value.composition, 'variant', { enumerable: true, get: () => 'evidence-axis' });
  assert.throws(() => editor.executeOperation(getter), /getter/);
});

test('Core5 portable recompose 投影 class／geometry／typography，Undo／Redo 與 export/reopen 一致', () => {
  const spec = source(), h = mounted(spec); h.ready();
  const next = candidate(spec); next.geometryOverrides['portable-quote'].x += 24;
  next.typographyOverrides['role-title'].fontSize = 104;
  h.api.executeOperation(request(spec, next, 0, ['variant', 'geometryOverrides', 'typographyOverrides']));
  assert.equal(h.getRevision(), 1);
  assert.match(h.document.querySelector('.slide').getAttribute('class'), /variant-evidence-axis/);
  assert.deepEqual(liveVisual(h.document.querySelector('.slide')), freshVisual(h.getSpec()));
  assert.equal(h.getSpec().slides[0].composition.variant, 'evidence-axis');
  assert.deepEqual(h.getSpec().slides[0].content, spec.slides[0].content);
  assert.deepEqual(resolveSlideElementIdentities(h.getSpec().slides[0]), resolveSlideElementIdentities(spec.slides[0]));
  assert.equal(h.component().style.getPropertyValue('left'), '824px');
  assert.equal(h.document.querySelector('[data-pptskill-element-id="role-title"]').style.getPropertyValue('font-size'), '104px');
  h.api.undo(); assert.equal(h.getSpec().slides[0].composition.variant, 'quote-monument');
  assert.match(h.document.querySelector('.slide').getAttribute('class'), /variant-quote-monument/);
  assert.deepEqual(liveVisual(h.document.querySelector('.slide')), freshVisual(h.getSpec()));
  assert.equal(h.document.querySelector('[data-pptskill-element-id="role-title"]').style.getPropertyValue('font-size'), '96px');
  h.api.redo(); assert.match(h.document.querySelector('.slide').getAttribute('class'), /variant-evidence-axis/);
  assert.deepEqual(liveVisual(h.document.querySelector('.slide')), freshVisual(h.getSpec()));
  const html = h.api.exportHtml(), reopened = extractDeckSpec(html);
  assert.equal(reopened.slides[0].composition.variant, 'evidence-axis');
  assert.match(html, /variant-evidence-axis/);
  assert.match(html, /data-word="成果" data-type-visual/);
  assert.equal(renderFullDeck(reopened).status, 'pass');
});

test('Core5 明示清除 geometry override 會同步移除 portable 投影', () => {
  const spec = source(), h = mounted(spec), next = candidate(spec, 'quote-monument');
  delete next.geometryOverrides;
  h.api.executeOperation(request(spec, next, 0, ['geometryOverrides']));
  assert.equal(h.getSpec().slides[0].composition.geometryOverrides, undefined);
  assert.equal(h.component().getAttribute('data-pptskill-geometry'), null);
  assert.equal(extractDeckSpec(h.api.exportHtml()).slides[0].composition.geometryOverrides, undefined);
  h.ready(); h.api.undo();
  assert.deepEqual(h.getSpec().slides[0].composition.geometryOverrides, spec.slides[0].composition.geometryOverrides);
  assert.equal(h.component().style.getPropertyValue('left'), '800px');
});

test('Core5 Repair1 title-points geometry-only component 清除時須拒絕，避免 DOM 留殘影', () => {
  const raw = JSON.parse(readFileSync(new URL('../fixtures/full-deck-spec.json', import.meta.url), 'utf8'));
  raw.slides = raw.slides.filter(slide => slide.id === 'problem');
  raw.slides[0].content.components.push({ id: 'extra', type: 'text', text: '浮動證據' });
  raw.slides[0].composition.geometryOverrides = { extra: { x: 100, y: 100, width: 200, height: 100 } };
  const spec = sanitizeDeckSpec(raw), next = structuredClone(spec.slides[0].composition);
  delete next.geometryOverrides;
  const fresh = renderFullDeck(spec), freshAfter = renderFullDeck({ ...spec, slides: [{ ...spec.slides[0], composition: next }] });
  assert.equal(fresh.status, 'pass'); assert.equal(freshAfter.status, 'pass');
  assert.match(fresh.html, /data-pptskill-element-id="component-extra"/);
  assert.doesNotMatch(freshAfter.html, /data-pptskill-element-id="component-extra"/);
  const operation = request(spec, next, 0, ['geometryOverrides'], ['geometryOverrides'], 'problem');
  const node = createDeckEditor(spec), before = node.getSpec();
  assert.throws(() => node.executeOperation(operation), /geometry-only|renderer/);
  assert.deepEqual(node.getSpec(), before); assert.equal(node.getHistoryState().entries, 0);
  const h = mountedEditor(spec), deck = h.document.querySelector('.deck'), slide = h.document.querySelector('.slide');
  deck.dataset.visualWorld = 'typography-hero';
  slide.setAttribute('class', 'slide primitive-title-points variant-editorial-index');
  const domBefore = slide.outerHTML;
  assert.throws(() => h.api.executeOperation(operation), /geometry-only|renderer/);
  assert.deepEqual(h.getSpec(), before); assert.equal(slide.outerHTML, domBefore);
  assert.equal(h.getRevision(), 0); assert.equal(h.api.getHistoryState().entries, 0);
});

test('Core5 Repair1 component-focus 非 slot 元件同樣拒絕清除；slot 元件仍可清除', () => {
  const raw = source();
  raw.slides[0].composition.geometryOverrides['perf-image'] = { x: 100, y: 100, width: 200, height: 100 };
  const spec = sanitizeDeckSpec(raw), node = createDeckEditor(spec);
  const bad = candidate(spec, 'quote-monument');
  delete bad.geometryOverrides['perf-image'];
  assert.throws(() => node.executeOperation(request(spec, bad, 0, ['geometryOverrides'])), /geometry-only component/);
  assert.deepEqual(node.getSpec(), spec);
  const good = candidate(spec, 'quote-monument');
  delete good.geometryOverrides['portable-quote'];
  node.executeOperation(request(spec, good, 0, ['geometryOverrides']));
  assert.equal(node.getSpec().slides[0].composition.geometryOverrides['portable-quote'], undefined);
  node.undo(); assert.deepEqual(node.getSpec().slides[0].composition.geometryOverrides, spec.slides[0].composition.geometryOverrides);
  node.redo(); assert.equal(node.getSpec().slides[0].composition.geometryOverrides['portable-quote'], undefined);
});

test('Core5 title-points 既有 CSS variant 可由 Node canonical 與 renderer 重開', () => {
  const raw = JSON.parse(readFileSync(new URL('../fixtures/full-deck-spec.json', import.meta.url), 'utf8'));
  raw.slides = raw.slides.filter(slide => slide.id === 'problem');
  const spec = sanitizeDeckSpec(raw), editor = createDeckEditor(spec);
  const next = { ...structuredClone(spec.slides[0].composition), variant: 'dense-ledger' };
  editor.executeOperation({ operation: 'recompose-slide', target: { deckId: spec.deckId, slideId: 'problem', revision: 0 },
    value: { composition: next, replaceScopes: ['variant'], confirmedScopes: ['variant'] } });
  const rendered = renderFullDeck(editor.getSpec());
  assert.equal(rendered.status, 'pass');
  assert.match(rendered.html, /primitive-title-points[^"\n]*variant-dense-ledger/);
});

test('Core5 Repair2 title-points editorial-index→dense-ledger 的 live type visual 等於 fresh renderer', () => {
  const raw = JSON.parse(readFileSync(new URL('../fixtures/full-deck-spec.json', import.meta.url), 'utf8'));
  raw.slides = raw.slides.filter(slide => slide.id === 'problem');
  const spec = sanitizeDeckSpec(raw), h = mountedEditor(spec), slide = h.document.querySelector('.slide');
  h.document.querySelector('.deck').dataset.visualWorld = 'typography-hero';
  slide.setAttribute('class', 'slide primitive-title-points variant-editorial-index');
  seedWorldChrome(h, spec);
  assert.deepEqual(liveVisual(slide), freshVisual(spec));
  h.api.layout.setMode(true);
  const content = structuredClone(spec.slides[0].content), next = structuredClone(spec.slides[0].composition);
  next.variant = 'dense-ledger';
  h.api.executeOperation(request(spec, next, 0, ['variant'], ['variant'], 'problem'));
  assert.deepEqual(liveVisual(slide), freshVisual(h.getSpec()));
  assert.deepEqual(h.getSpec().slides[0].content, content);
  h.api.undo(); assert.deepEqual(liveVisual(slide), freshVisual(h.getSpec()));
  h.api.redo(); assert.deepEqual(liveVisual(slide), freshVisual(h.getSpec()));
});

test('Core5 Repair2 標題 edit-text 後 type visual 與 fresh renderer 一致，且仍可 recompose／Undo／Redo', () => {
  const raw = JSON.parse(readFileSync(new URL('../fixtures/full-deck-spec.json', import.meta.url), 'utf8'));
  raw.slides = raw.slides.filter(slide => slide.id === 'problem');
  const spec = sanitizeDeckSpec(raw), h = mountedEditor(spec), slide = h.document.querySelector('.slide');
  h.document.querySelector('.deck').dataset.visualWorld = 'typography-hero';
  slide.setAttribute('class', 'slide primitive-title-points variant-editorial-index');
  seedWorldChrome(h, spec);
  h.api.layout.setMode(true);
  h.api.executeOperation({ operation: 'edit-text', target: { slideId: 'problem', elementId: 'role-title' }, value: '新版內容' });
  const afterEdit = h.getSpec(), liveAfterEdit = liveVisual(slide), freshAfterEdit = freshVisual(afterEdit);
  const next = structuredClone(afterEdit.slides[0].composition); next.variant = 'dense-ledger';
  let recomposeError;
  try { h.api.executeOperation(request(afterEdit, next, 1, ['variant'], ['variant'], 'problem')); }
  catch (error) { recomposeError = error; }
  assert.deepEqual(liveAfterEdit, freshAfterEdit);
  assert.equal(recomposeError, undefined);
  assert.equal(h.getSpec().slides[0].content.title, '新版內容');
  assert.deepEqual(liveVisual(slide), freshVisual(h.getSpec()));
  h.api.undo(); assert.deepEqual(liveVisual(slide), freshVisual(h.getSpec()));
  h.api.undo(); assert.deepEqual(liveVisual(slide), freshVisual(h.getSpec()));
  h.api.redo(); assert.deepEqual(liveVisual(slide), freshVisual(h.getSpec()));
  h.api.redo(); assert.deepEqual(liveVisual(slide), freshVisual(h.getSpec()));
});

test('Core5 Repair2 標題 edit-text 的 type visual 投影故障會回退 canonical／DOM／history', () => {
  const raw = JSON.parse(readFileSync(new URL('../fixtures/full-deck-spec.json', import.meta.url), 'utf8'));
  raw.slides = raw.slides.filter(slide => slide.id === 'problem');
  const spec = sanitizeDeckSpec(raw), h = mountedEditor(spec), slide = h.document.querySelector('.slide');
  h.document.querySelector('.deck').dataset.visualWorld = 'typography-hero';
  slide.setAttribute('class', 'slide primitive-title-points variant-editorial-index');
  seedWorldChrome(h, spec);
  const visual = slide.querySelector('[data-type-visual]'), beforeVisual = liveVisual(slide);
  const beforeTitle = slide.querySelector('[data-pptskill-element-id="role-title"]').textContent;
  const originalSet = visual.setAttribute;
  let fault = true;
  visual.setAttribute = function (key, value) {
    originalSet.call(this, key, value);
    if (key === 'data-word' && fault) { fault = false; throw Error('title visual fault'); }
  };
  assert.throws(() => h.api.executeOperation({ operation: 'edit-text', target: { slideId: 'problem', elementId: 'role-title' }, value: '新版內容' }), /title visual fault/);
  assert.deepEqual(h.getSpec(), spec);
  assert.deepEqual(liveVisual(slide), beforeVisual);
  assert.equal(slide.querySelector('[data-pptskill-element-id="role-title"]').textContent, beforeTitle);
  assert.equal(h.getRevision(), 0);
  assert.equal(h.api.getHistoryState().entries, 0);
});

test('Core5 Repair2 evidence-axis chart token 與 fresh renderer 相同', () => {
  const raw = JSON.parse(readFileSync(new URL('../fixtures/full-deck-spec.json', import.meta.url), 'utf8'));
  raw.slides = raw.slides.filter(slide => slide.id === 'evidence');
  raw.slides[0].composition.variant = 'quote-monument';
  const spec = sanitizeDeckSpec(raw), h = mountedEditor(spec), slide = h.document.querySelector('.slide');
  h.document.querySelector('.deck').dataset.visualWorld = 'typography-hero';
  slide.setAttribute('class', 'slide primitive-component-focus variant-quote-monument');
  seedWorldChrome(h, spec);
  const next = structuredClone(spec.slides[0].composition); next.variant = 'evidence-axis';
  h.api.executeOperation(request(spec, next, 0, ['variant'], ['variant'], 'evidence'));
  assert.deepEqual(liveVisual(slide), freshVisual(h.getSpec()));
  assert.equal(liveVisual(slide).word, '92');
  assert.deepEqual(h.getSpec().slides[0].content, spec.slides[0].content);
});

const evidencePatchFixture = () => {
  const raw = JSON.parse(readFileSync(new URL('../fixtures/full-deck-spec.json', import.meta.url), 'utf8'));
  raw.slides = raw.slides.filter(slide => slide.id === 'evidence');
  const spec = sanitizeDeckSpec(raw), h = mountedEditor(spec), slide = h.document.querySelector('.slide');
  h.document.querySelector('.deck').dataset.visualWorld = 'typography-hero';
  slide.setAttribute('class', 'slide primitive-component-focus variant-evidence-axis');
  seedWorldChrome(h, spec);
  const chart = spec.slides[0].content.components.find(component => component.type === 'chart');
  const series = structuredClone(chart.series);
  series.at(-1).values[series.at(-1).values.length - 1] = 77;
  return { spec, h, slide, chart, patch: { slideId: 'evidence', region: `content.components.${chart.id}`, value: { series } } };
};

test('Core5 component patch 同步 chart、live type visual 與 fresh renderer', () => {
  const { h, slide, chart, patch } = evidencePatchFixture();
  h.api.applyLocalPatch(patch);
  const canonical = h.getSpec();
  assert.equal(canonical.slides[0].content.components.find(component => component.id === chart.id).series.at(-1).values.at(-1), 77);
  assert.match(slide.querySelector(`[data-edit-target="slides.evidence.content.components.${chart.id}"]`).outerHTML, /77/);
  assert.equal(liveVisual(slide).word, '77');
  assert.deepEqual(liveVisual(slide), freshVisual(canonical));
});

test('Core5 component patch type visual 投影失敗時完整回退', () => {
  const { spec, h, slide, chart, patch } = evidencePatchFixture();
  const beforeChart = slide.querySelector(`[data-edit-target="slides.evidence.content.components.${chart.id}"]`).outerHTML;
  const beforeVisual = liveVisual(slide), beforeHistory = h.api.getHistoryState();
  const visual = slide.querySelector('[data-type-visual]'), originalSet = visual.setAttribute;
  let fail = true;
  visual.setAttribute = function (key, value) {
    originalSet.call(this, key, value);
    if (key === 'data-word' && fail) { fail = false; throw Error('component visual projection fault'); }
  };
  assert.throws(() => h.api.applyLocalPatch(patch), /component visual projection fault/);
  assert.deepEqual(h.getSpec(), spec);
  assert.equal(slide.querySelector(`[data-edit-target="slides.evidence.content.components.${chart.id}"]`).outerHTML, beforeChart);
  assert.deepEqual(liveVisual(slide), beforeVisual);
  assert.equal(h.getRevision(), 0);
  assert.deepEqual(h.api.getHistoryState(), beforeHistory);
});

test('Core5 Repair2 舊 type visual 更新後拋錯須完整回退 DOM／canonical／history', () => {
  const raw = JSON.parse(readFileSync(new URL('../fixtures/full-deck-spec.json', import.meta.url), 'utf8'));
  raw.slides = raw.slides.filter(slide => slide.id === 'problem');
  const spec = sanitizeDeckSpec(raw), h = mountedEditor(spec), slide = h.document.querySelector('.slide');
  h.document.querySelector('.deck').dataset.visualWorld = 'typography-hero';
  slide.setAttribute('class', 'slide primitive-title-points variant-editorial-index');
  seedWorldChrome(h, spec);
  const originalVisual = liveVisual(slide), visual = slide.querySelector('[data-type-visual]');
  const originalSet = visual.setAttribute;
  let fail = true;
  visual.setAttribute = function (key, value) {
    originalSet.call(this, key, value);
    if (key === 'data-word' && fail) { fail = false; throw Error('type visual projection fault'); }
  };
  const next = structuredClone(spec.slides[0].composition); next.variant = 'dense-ledger';
  assert.throws(() => h.api.executeOperation(request(spec, next, 0, ['variant'], ['variant'], 'problem')), /type visual projection fault/);
  assert.deepEqual(liveVisual(slide), originalVisual);
  assert.deepEqual(h.getSpec(), spec);
  assert.equal(h.getRevision(), 0); assert.equal(h.api.getHistoryState().entries, 0);
});

test('Core5 Repair2 Undo 移除 type visual 後拋錯須保留已提交狀態與 cursor', () => {
  const spec = source(), h = mounted(spec); h.ready();
  h.api.executeOperation(request(spec, candidate(spec)));
  const slide = h.document.querySelector('.slide'), visual = slide.querySelector('[data-type-visual]');
  const before = h.getSpec(), view = liveVisual(slide), revision = h.getRevision(), history = h.api.getHistoryState();
  const originalRemove = visual.remove;
  let fault = true;
  visual.remove = function () {
    originalRemove.call(this);
    if (fault) { fault = false; throw Error('type visual removal fault'); }
  };
  assert.throws(() => h.api.undo(), /type visual removal fault/);
  assert.deepEqual(h.getSpec(), before);
  assert.deepEqual(liveVisual(slide), view);
  assert.equal(h.getRevision(), revision);
  assert.deepEqual(h.api.getHistoryState(), history);
});

test('Core5 portable 驗證／投影故障不改 canonical、DOM、history、revision', () => {
  const spec = source(), h = mounted(spec), next = candidate(spec);
  const before = h.getSpec(), klass = h.document.querySelector('.slide').getAttribute('class');
  assert.throws(() => h.api.executeOperation(request(spec, { ...next, primitive: 'cover' })), /primitive/);
  assert.deepEqual(h.getSpec(), before); assert.equal(h.getRevision(), 0);
  assert.equal(h.document.querySelector('.slide').getAttribute('class'), klass);
  assert.equal(h.api.getHistoryState().entries, 0);
  const node = h.document.querySelector('.slide'), originalSet = node.setAttribute;
  let fault = true;
  node.setAttribute = function (key, value) {
    originalSet.call(this, key, value);
    if (key === 'class' && fault) { fault = false; throw Error('variant projection fault'); }
  };
  assert.throws(() => h.api.executeOperation(request(spec, next)), /variant projection fault/);
  assert.deepEqual(h.getSpec(), before); assert.equal(h.getRevision(), 0);
  assert.equal(node.getAttribute('class'), klass); assert.equal(h.api.getHistoryState().entries, 0);
  assert.deepEqual(liveVisual(node), freshVisual(before));
});

test('Core5 portable 草稿恢復 recompose variant，匯出離線重開一致', async () => {
  const values = new Map(), storage = { getItem: key => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value), removeItem: key => values.delete(key) };
  const previous = Object.getOwnPropertyDescriptor(Object.prototype, 'localStorage');
  Object.defineProperty(Object.prototype, 'localStorage', { configurable: true, get: () => storage });
  try {
    const spec = source(), first = mounted(spec), next = candidate(spec);
    first.api.executeOperation(request(spec, next)); await Promise.resolve();
    const draftKey = [...values.keys()].find(key => key.startsWith('pptskill:draft:v1:') && !key.endsWith(':probe'));
    assert.equal(JSON.parse(values.get(draftKey)).spec.slides[0].composition.variant, 'evidence-axis');
    const second = mounted(spec), deck = second.document.querySelector('.deck');
    deck.replaceChildren = (...nodes) => { for (const child of [...deck.children]) child.remove(); for (const node of nodes) deck.append(node); };
    second.action('restore-draft');
    assert.equal(second.getSpec().slides[0].composition.variant, 'evidence-axis');
    assert.match(second.document.querySelector('.slide').getAttribute('class'), /variant-evidence-axis/);
    assert.deepEqual(liveVisual(second.document.querySelector('.slide')), freshVisual(second.getSpec()));
    const html = second.api.exportHtml(), reopened = extractDeckSpec(html);
    assert.equal(reopened.slides[0].composition.variant, 'evidence-axis');
    assert.match(renderFullDeck(reopened).html, /variant-evidence-axis/);
  } finally {
    if (previous) Object.defineProperty(Object.prototype, 'localStorage', previous);
    else delete Object.prototype.localStorage;
  }
});

test('Core5 Repair2 僅改 editorial-index 標題的草稿恢復仍符合 fresh type visual', async () => {
  const values = new Map(), storage = { getItem: key => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value), removeItem: key => values.delete(key) };
  const previous = Object.getOwnPropertyDescriptor(Object.prototype, 'localStorage');
  Object.defineProperty(Object.prototype, 'localStorage', { configurable: true, get: () => storage });
  try {
    const raw = JSON.parse(readFileSync(new URL('../fixtures/full-deck-spec.json', import.meta.url), 'utf8'));
    raw.slides = raw.slides.filter(slide => slide.id === 'problem');
    const spec = sanitizeDeckSpec(raw);
    const open = () => {
      const h = mountedEditor(spec), deck = h.document.querySelector('.deck'), slide = h.document.querySelector('.slide');
      deck.dataset.visualWorld = 'typography-hero';
      slide.setAttribute('class', 'slide primitive-title-points variant-editorial-index');
      seedWorldChrome(h, spec);
      return h;
    };
    const first = open();
    first.api.executeOperation({ operation: 'edit-text', target: { slideId: 'problem', elementId: 'role-title' }, value: '新版內容' });
    await Promise.resolve();
    const second = open(), deck = second.document.querySelector('.deck');
    deck.replaceChildren = (...nodes) => { for (const child of [...deck.children]) child.remove(); for (const node of nodes) deck.append(node); };
    second.action('restore-draft');
    assert.equal(second.getSpec().slides[0].content.title, '新版內容');
    assert.deepEqual(liveVisual(second.document.querySelector('.slide')), freshVisual(second.getSpec()));
    const reopened = extractDeckSpec(second.api.exportHtml());
    assert.equal(reopened.slides[0].content.title, '新版內容');
    assert.deepEqual(freshVisual(reopened), liveVisual(second.document.querySelector('.slide')));
  } finally {
    if (previous) Object.defineProperty(Object.prototype, 'localStorage', previous);
    else delete Object.prototype.localStorage;
  }
});
