import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import test from 'node:test';
import { mkdtemp, readFile, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';
import { runInNewContext } from 'node:vm';
import { createDeckEditor } from '../runtime/deck-editor.js';
import { contentHash, extractDeckSpec, sanitizeDeckSpec } from '../runtime/deck-spec.js';
import { renderFullDeck } from '../runtime/full-deck-renderer.js';
import { createGenerationPlan } from '../runtime/generation-plan.js';
import { buildMotionBrowserContractRuntime } from '../runtime/motion-capabilities.js';
import { buildDistribution } from '../tools/build-distribution.mjs';

const run = promisify(execFile);

const style = {
  id: 'sweep-editorial', name: 'Sweep editorial',
  layout: { primaryMove: 'editorial-rail', compositionLanguage: 'editorial' }, density: 'medium',
  typography: { display: 'Arial', body: 'Arial', mono: 'Menlo' },
  palette: { canvas: '#fff', text: '#111', muted: '#666', accent: '#06c', surface: '#eee' },
  spacing: { unit: 8, slidePadding: 64 }, geometry: { radius: 0, borderWidth: 1 },
  motion: { personality: 'corporate', durationMs: 320, easing: 'ease-out', reducedMotion: true },
  assetTreatment: 'content-led',
};
const slide = { id: 'opening', title: 'Role-aware entrance', subtitle: 'Supporting copy follows', keyPoints: ['A', 'B', 'C'] };
const outline = { schemaVersion: '1.0', deckTitle: 'Sweep plan', sourcePolicy: 'user-provided-only', slides: [slide] };
const semanticSignals = [{ slideId: slide.id, slideRole: 'cover', relationship: 'explanation', evidence: 'textual', density: 'medium' }];
const rhythmSignals = [{ slideId: slide.id, density: 'medium', emphasis: 'highlight', evidenceWeight: 'low', motionIntensity: 'medium', sectionRole: 'opening' }];
const motionSignals = [{
  slideId: slide.id, effect: 'underline-sweep', role: 'text', replay: 'slide-visible', staggerMs: 120,
  targets: [{ ref: 'content.title' }, { ref: 'content.subtitle' }],
}];
const request = (overrides = {}) => ({
  outline, styleSpecId: style.id, styleSpec: style, capacity: { maxSlidesPerUnit: 3 },
  semanticSignals, rhythmSignals, motionSignals, ...overrides,
});
const compositionMotion = {
  effect: 'underline-sweep', role: 'text', replay: 'slide-visible', staggerMs: 120,
  targets: [{ ref: 'content.title' }, { ref: 'content.subtitle' }],
};
const deckSpec = (motion = compositionMotion) => ({
  schemaVersion: '1.0', deckId: 'sweep-deck', title: 'Sweep deck', language: 'zh-Hant', style,
  slides: [{
    id: slide.id,
    content: { title: slide.title, subtitle: slide.subtitle, keyPoints: [...slide.keyPoints], components: [] },
    composition: {
      primitive: 'cover', variant: 'default',
      slots: { title: 'content.title', subtitle: 'content.subtitle' },
      motion,
    },
  }],
});

test('planner 暴露 underline-sweep capability，target role 只由 ref 派生且不改 content hash', () => {
  const before = contentHash(deckSpec().slides[0]);
  const result = createGenerationPlan(request());
  const proposal = result.motionPlan.proposals[0];
  assert.equal(result.capabilities.motion.effects['underline-sweep'].status, 'supported');
  assert.deepEqual(proposal.resolvedTargets, [
    { ref: 'content.title', role: 'title' },
    { ref: 'content.subtitle', role: 'subtitle' },
  ]);
  assert.deepEqual(proposal.compositionMotion, compositionMotion);
  assert.equal(contentHash(deckSpec().slides[0]), before);
});

test('underline-sweep signal 僅接受 optional title 接 required subtitle，且 gate 空文字與 none intensity', () => {
  const subtitleOnly = structuredClone(motionSignals);
  subtitleOnly[0].targets = [{ ref: 'content.subtitle' }];
  assert.equal(createGenerationPlan(request({ motionSignals: subtitleOnly })).motionPlan.proposals[0].status, 'available');

  for (const targets of [
    [{ ref: 'content.title' }],
    [{ ref: 'content.subtitle' }, { ref: 'content.title' }],
    [{ ref: 'content.subtitle' }, { ref: 'content.subtitle' }],
  ]) {
    assert.throws(() => createGenerationPlan(request({ motionSignals: [{ ...motionSignals[0], targets }] })), /allowlist/);
  }
  assert.throws(() => createGenerationPlan(request({ motionSignals: [{ ...motionSignals[0], targets: [{ ref: 'content.subtitle', role: 'subtitle' }] }] })), /不允許欄位/);

  const emptySubtitle = structuredClone(outline);
  emptySubtitle.slides[0].subtitle = '';
  assert.ok(createGenerationPlan(request({ outline: emptySubtitle })).motionPlan.proposals[0].reasons.some(({ code }) => code === 'motion_text_empty'));
  const emptyTitle = structuredClone(outline);
  emptyTitle.slides[0].title = '';
  assert.equal(createGenerationPlan(request({ outline: emptyTitle, motionSignals: subtitleOnly })).motionPlan.proposals[0].status, 'available');
  assert.ok(createGenerationPlan(request({ outline: emptyTitle })).motionPlan.proposals[0].reasons.some(({ code }) => code === 'motion_text_empty'));
  const quiet = rhythmSignals.map((signal) => ({ ...signal, motionIntensity: 'none' }));
  assert.ok(createGenerationPlan(request({ rhythmSignals: quiet })).motionPlan.proposals[0].reasons.some(({ code }) => code === 'motion_intensity_none'));
});

test('CompositionSpec/editor/embed/export/reparse 只保留 allowlisted refs 與 canonical edited text', () => {
  const dirtyMotion = {
    ...compositionMotion, selector: '.subtitle', duration: 9999,
    targets: compositionMotion.targets.map((target) => ({ ...target, role: 'caller-role', css: 'width:0' })),
  };
  const dirty = deckSpec(dirtyMotion);
  const clean = sanitizeDeckSpec(dirty);
  assert.deepEqual(clean.slides[0].composition.motion, compositionMotion);
  assert.equal(JSON.stringify(clean).includes('caller-role'), false);

  const editor = createDeckEditor(dirty);
  editor.editText(slide.id, 'title', 'Edited title');
  const edited = editor.editText(slide.id, 'subtitle', 'Edited subtitle');
  assert.deepEqual(edited.slides[0].composition.motion, compositionMotion);
  const rendered = renderFullDeck(edited);
  assert.equal(rendered.status, 'pass');
  const reopened = extractDeckSpec(rendered.html);
  assert.equal(reopened.slides[0].content.title, 'Edited title');
  assert.equal(reopened.slides[0].content.subtitle, 'Edited subtitle');
  assert.deepEqual(reopened.slides[0].composition.motion, compositionMotion);
});

test('renderer 只標記核准文字，使用 transform/opacity 與 1px scaleX underline，runtime 可 replay/static', () => {
  const rendered = renderFullDeck(deckSpec());
  assert.equal(rendered.status, 'pass');
  assert.match(rendered.html, /data-pptskill-text-entrance="title"/);
  assert.match(rendered.html, /data-pptskill-text-entrance="subtitle"/);
  assert.match(rendered.html, /height:1px/);
  assert.match(rendered.html, /transform:scaleX\(0\)/);
  assert.match(rendered.html, /transform-origin:left center/);
  assert.doesNotMatch(rendered.html, /transition:[^}]*\b(?:width|height|margin|top|left|right|bottom)\b/);
  assert.match(rendered.html, /classList\.remove\('is-visible'\)/);
  assert.match(rendered.html, /classList\.add\('is-visible'\)/);
  assert.match(rendered.html, /classList\.add\('motion-resetting'\)/);
  assert.match(rendered.html, /classList\.remove\('motion-resetting'\)/);
  assert.match(rendered.html, /void root\.offsetWidth/);
  assert.match(rendered.html, /typeof IntersectionObserver==='function'/);
  assert.match(rendered.html, /forceStatic/);
  assert.doesNotMatch(rendered.html, /<number-flow data-pptskill-odometer/);

  const subtitleOnly = deckSpec({ ...compositionMotion, targets: [{ ref: 'content.subtitle' }] });
  const subtitleHtml = renderFullDeck(subtitleOnly).html;
  assert.doesNotMatch(subtitleHtml, /data-pptskill-text-entrance="title"/);
  assert.match(subtitleHtml, /data-pptskill-text-entrance="subtitle"/);
});

test('browser contract 與 installed plan-new 使用同一 sanitizer/capability truth；legacy 維持 null', async () => {
  const invalid = deckSpec();
  invalid.slides[0].content.subtitle = '';
  const context = { result: null };
  runInNewContext(`${buildMotionBrowserContractRuntime()};result=validateSlideMotion(${JSON.stringify(invalid.slides[0])})`, context);
  assert.ok(context.result.some((message) => message.includes('不可為空')));

  const root = await mkdtemp(join(tmpdir(), 'pptskill-pgq-wp3-s2-'));
  const archive = join(root, 'PPTSKILL.zip');
  await buildDistribution({ archivePath: archive });
  assert.ok((await stat(archive)).size < 20 * 1024 * 1024);
  const extracted = join(root, 'extract');
  await run('/usr/bin/unzip', ['-q', archive, '-d', extracted]);
  const bundle = join(extracted, 'PPTSKILL');
  const installedSkill = await readFile(join(bundle, 'skill', 'pptskill', 'SKILL.md'), 'utf8');
  assert.match(installedSkill, /E underline sweep/);
  for (const adapter of ['codex', 'claude-code', 'gemini']) {
    assert.match(await readFile(join(bundle, 'adapters', adapter, 'entry.md'), 'utf8'), /E underline sweep/);
  }
  const installRoot = join(root, 'user', '.pptskill', 'runtime');
  await run(process.execPath, [join(bundle, 'install.mjs'), '--install-root', installRoot]);
  const cli = join(installRoot, 'core', 'runtime', 'workflow-cli.mjs');
  const requestPath = join(root, 'request.json');
  await writeFile(requestPath, JSON.stringify(request()));
  const planned = JSON.parse((await run(process.execPath, [cli, 'plan-new', '--request', requestPath])).stdout);
  assert.equal(planned.plan.capabilities.motion.effects['underline-sweep'].status, 'supported');
  assert.equal(planned.plan.motionPlan.proposals[0].status, 'available');
  await writeFile(requestPath, JSON.stringify(request({ motionSignals: [] })));
  const legacy = JSON.parse((await run(process.execPath, [cli, 'plan-new', '--request', requestPath])).stdout);
  assert.equal(legacy.plan.motionPlan, null);

  const output = join(root, 'deck.html');
  const deckPath = join(root, 'deck-spec.json');
  const outlinePath = join(root, 'outline.json');
  const stylePath = join(root, 'style-selection.json');
  const grillPath = join(root, 'grill.json');
  await writeFile(deckPath, JSON.stringify(deckSpec()));
  await writeFile(outlinePath, JSON.stringify({ ...outline, approval: { status: 'confirmed', approvedBy: 'human' } }));
  await writeFile(stylePath, JSON.stringify({ status: 'selected', approvedBy: 'human', styleId: style.id }));
  await writeFile(grillPath, JSON.stringify({ status: 'complete', materialsReviewed: true, pressureTestAnswer: '已驗證最薄弱假設。' }));
  const rendered = JSON.parse((await run(process.execPath, [cli, 'render-new', '--deck-spec', deckPath, '--outline', outlinePath, '--style-selection', stylePath, '--grill', grillPath, '--output', output])).stdout);
  assert.equal(rendered.status, 'pass');
  assert.match(await readFile(output, 'utf8'), /data-pptskill-text-entrance="subtitle"/);
});
