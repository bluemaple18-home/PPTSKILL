import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import test from 'node:test';
import { mkdtemp, readFile, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';
import { runInNewContext } from 'node:vm';
import { createDeckEditor } from '../runtime/deck-editor.js';
import { extractDeckSpec, sanitizeDeckSpec } from '../runtime/deck-spec.js';
import { renderFullDeck } from '../runtime/full-deck-renderer.js';
import { createGenerationPlan } from '../runtime/generation-plan.js';
import { verifyNumberFlowVendor } from '../runtime/number-flow-vendor.js';
import { inspectPortableHtml } from '../runtime/portable-size-guard.js';
import { buildMotionBrowserContractRuntime } from '../runtime/motion-capabilities.js';
import { buildDistribution } from '../tools/build-distribution.mjs';

const run = promisify(execFile);

const style = {
  id: 'motion-technical', name: 'Motion technical',
  layout: { primaryMove: 'technical-map', compositionLanguage: 'technical' }, density: 'high',
  typography: { display: 'Arial', body: 'Arial', mono: 'Menlo' },
  palette: { canvas: '#fff', text: '#111', muted: '#777', accent: '#06c', surface: '#eee' },
  spacing: { unit: 8, slidePadding: 64 }, geometry: { radius: 0, borderWidth: 1 },
  motion: { personality: 'corporate', durationMs: 320, easing: 'ease-out', reducedMotion: true },
  assetTreatment: 'content-led',
};
const slide = {
  id: 'metrics', title: '成效', subtitle: '核准數字',
  keyPoints: ['1,240｜完成件數', '72.5%｜採用率', '$18｜單位成本'],
};
const outline = { schemaVersion: '1.0', deckTitle: 'Motion plan', sourcePolicy: 'user-provided-only', slides: [slide] };
const semanticSignals = [{ slideId: 'metrics', slideRole: 'content', relationship: 'evidence', evidence: 'numeric', density: 'high' }];
const rhythmSignals = [{ slideId: 'metrics', density: 'high', emphasis: 'highlight', evidenceWeight: 'high', motionIntensity: 'medium', sectionRole: 'proof' }];
const motionSignals = [{
  slideId: 'metrics', effect: 'number-flow-odometer', role: 'metric', replay: 'slide-visible', staggerMs: 80,
  targets: [
    { ref: 'content.keyPoints.0', from: 0 },
    { ref: 'content.keyPoints.1', from: 50 },
  ],
}];

const request = (overrides = {}) => ({
  outline, styleSpecId: style.id, styleSpec: style, capacity: { maxSlidesPerUnit: 3 },
  semanticSignals, rhythmSignals, motionSignals, ...overrides,
});

const compositionMotion = {
  effect: 'number-flow-odometer', role: 'metric', replay: 'slide-visible', staggerMs: 80,
  targets: [{ ref: 'content.keyPoints.0', from: 0 }, { ref: 'content.keyPoints.1', from: 50 }],
};

const deckSpec = (changes = {}) => ({
  schemaVersion: '1.0', deckId: 'motion-deck', title: 'Motion deck', language: 'zh-Hant', style,
  slides: [{
    id: 'metrics',
    content: { title: slide.title, subtitle: slide.subtitle, keyPoints: [...slide.keyPoints], components: [] },
    composition: {
      primitive: 'metric-grid', variant: 'default',
      slots: { title: 'content.title', subtitle: 'content.subtitle', points: 'content.keyPoints' },
      motion: compositionMotion,
      ...changes,
    },
  }],
});

test('plan-new 暴露 pinned motion capability 並產生 bounded NumberFlow odometer proposal', () => {
  const result = createGenerationPlan(request());
  assert.equal(result.capabilities.motion.effects['number-flow-odometer'].status, 'supported');
  assert.equal(result.capabilities.motion.effects['number-flow-odometer'].provider.version, '0.6.2');
  assert.equal(result.motionPlan.proposals[0].status, 'available');
  assert.deepEqual(result.motionPlan.proposals[0].resolvedTargets.map(({ finalValue }) => finalValue), [1240, 72.5]);
  assert.deepEqual(result.motionPlan.proposals[0].compositionMotion, {
    effect: 'number-flow-odometer', role: 'metric', replay: 'slide-visible', staggerMs: 80,
    targets: [{ ref: 'content.keyPoints.0', from: 0 }, { ref: 'content.keyPoints.1', from: 50 }],
  });
  assert.equal('finalValue' in result.motionPlan.proposals[0].compositionMotion, false);
  assert.equal(result.deckRhythmPlan.contentIntegrity.unchanged, true);
});

test('motion planner 對格式、primitive、rhythm 與自報欄位 fail loud', () => {
  const unsupported = structuredClone(outline);
  unsupported.slides[0].keyPoints[0] = '1.2e3｜科學記號';
  const unavailable = createGenerationPlan(request({ outline: unsupported })).motionPlan.proposals[0];
  assert.equal(unavailable.status, 'unavailable');
  assert.ok(unavailable.reasons.some(({ code }) => code === 'motion_metric_format_unavailable'));

  const quiet = rhythmSignals.map((signal) => ({ ...signal, motionIntensity: 'none' }));
  assert.ok(createGenerationPlan(request({ rhythmSignals: quiet })).motionPlan.proposals[0].reasons
    .some(({ code }) => code === 'motion_intensity_none'));

  const explanation = semanticSignals.map((signal) => ({ ...signal, relationship: 'explanation', evidence: 'textual' }));
  assert.ok(createGenerationPlan(request({ semanticSignals: explanation })).motionPlan.proposals[0].reasons
    .some(({ code }) => code === 'motion_primitive_unavailable'));
  assert.throws(() => createGenerationPlan(request({ motionSignals: [{ ...motionSignals[0], prompt: 'leak' }] })), /不允許欄位/);
  assert.throws(() => createGenerationPlan(request({ motionSignals: [{ ...motionSignals[0], targets: [{ ref: 'content.keyPoints.0', from: 0, metadata: true }] }] })), /不允許欄位/);
  assert.throws(() => createGenerationPlan(request({ motionSignals: [{ ...motionSignals[0], targets: [{ ref: 'content.keyPoints.0', from: 0 }, { ref: 'content.keyPoints.0', from: 1 }] }] })), /allowlist/);
});

test('CompositionSpec motion 可攜 round-trip，未知欄位在 Node sanitizer/editor 被移除', () => {
  const dirty = deckSpec({
    motion: { ...compositionMotion, prompt: 'private', targets: compositionMotion.targets.map((target) => ({ ...target, reviewMetadata: 'private' })) },
  });
  const clean = sanitizeDeckSpec(dirty);
  assert.deepEqual(clean.slides[0].composition.motion, compositionMotion);
  assert.equal(JSON.stringify(clean).includes('private'), false);
  assert.deepEqual(createDeckEditor(dirty).getSpec().slides[0].composition.motion, compositionMotion);
  const rendered = renderFullDeck(dirty);
  assert.equal(rendered.status, 'pass');
  assert.deepEqual(extractDeckSpec(rendered.html).slides[0].composition.motion, compositionMotion);
});

test('renderer 只將核准 target 轉為 bundled NumberFlow，保留靜態 metric 與色彩字型 token', () => {
  const vendor = verifyNumberFlowVendor();
  assert.equal(vendor.status, 'pass');
  assert.equal(vendor.metadata.bundleBytes, 17146);
  assert.equal(vendor.metadata.bundleSha256, 'ea78e2aa83778c4642a3b12bb8f1e427db1528f8092bad98ac55837acf3ac73a');
  const rendered = renderFullDeck(deckSpec());
  assert.equal(rendered.status, 'pass');
  assert.equal((rendered.html.match(/data-pptskill-number-flow-vendor/g) ?? []).length, 1);
  assert.match(rendered.html, /if\('customElements'in window&&'Intl'in window\)/);
  assert.equal((rendered.html.match(/<number-flow data-pptskill-odometer/g) ?? []).length, 2);
  assert.match(rendered.html, /<strong class="metric-value">\$18<\/strong>/);
  assert.match(rendered.html, /\.metric-value\{display:inline-flex;min-width:7ch;color:var\(--accent\);font:900 48px\/1 var\(--display\)/);
  assert.doesNotMatch(rendered.html, /<script[^>]+src=/);
  assert.ok(inspectPortableHtml(rendered.html, rendered.spec).totalHtmlBytes < 20 * 1024 * 1024);
});

test('unsupported persisted motion 不得被 sanitizer 靜默吞掉', () => {
  const wrongPrimitive = deckSpec({ primitive: 'title-points' });
  assert.equal(renderFullDeck(wrongPrimitive).status, 'fail');
  const wrongFormat = deckSpec();
  wrongFormat.slides[0].content.keyPoints[0] = '1.2e3｜不支援';
  assert.equal(renderFullDeck(wrongFormat).status, 'fail');
  const unknownEffect = deckSpec({ motion: { ...compositionMotion, effect: 'magic' } });
  assert.equal(renderFullDeck(unknownEffect).status, 'fail');
  assert.throws(() => createDeckEditor(unknownEffect), /allowlist/);
});

test('browser editor 注入正式 motion semantic validator，拒絕失配 target content', () => {
  const invalid = deckSpec();
  invalid.slides[0].content.keyPoints[0] = '1.2e3｜不支援';
  const context = { result: null };
  runInNewContext(`${buildMotionBrowserContractRuntime()};result=validateSlideMotion(${JSON.stringify(invalid.slides[0])})`, context);
  assert.ok(context.result.some((message) => message.includes('ASCII metric token')));
  const rendered = renderFullDeck(deckSpec());
  assert.match(rendered.html, /data-metric-index="0" data-edit-target="slides\.metrics\.content\.keyPoints\.0"/);
  assert.match(rendered.html, /const rawErrors=spec\.slides\.flatMap\(validateSlideMotion\)/);
  assert.match(rendered.html, /const errors=cleaned\.slides\.flatMap\(validateSlideMotion\)/);
});

test('installed plan-new 與 render-new 穿透 motion；legacy request 維持 null', async () => {
  const root = await mkdtemp(join(tmpdir(), 'pptskill-pgq-wp3-motion-'));
  const archive = join(root, 'PPTSKILL.zip');
  await buildDistribution({ archivePath: archive });
  assert.ok((await stat(archive)).size < 20 * 1024 * 1024);
  const extracted = join(root, 'extract');
  await run('/usr/bin/unzip', ['-q', archive, '-d', extracted]);
  const bundle = join(extracted, 'PPTSKILL');
  const installRoot = join(root, 'user', '.pptskill', 'runtime');
  await run(process.execPath, [join(bundle, 'install.mjs'), '--install-root', installRoot]);
  const cli = join(installRoot, 'core', 'runtime', 'workflow-cli.mjs');
  const requestPath = join(root, 'request.json');
  await writeFile(requestPath, JSON.stringify(request()));
  const planned = JSON.parse((await run(process.execPath, [cli, 'plan-new', '--request', requestPath])).stdout);
  assert.equal(planned.plan.motionPlan.proposals[0].status, 'available', JSON.stringify(planned.plan.motionPlan.proposals[0]));
  await writeFile(requestPath, JSON.stringify(request({ motionSignals: [] })));
  const legacy = JSON.parse((await run(process.execPath, [cli, 'plan-new', '--request', requestPath])).stdout);
  assert.equal(legacy.plan.motionPlan, null);

  const paths = Object.fromEntries(['deck-spec', 'outline', 'style-selection', 'grill'].map((name) => [name, join(root, `${name}.json`)]));
  await writeFile(paths['deck-spec'], JSON.stringify(deckSpec()));
  await writeFile(paths.outline, JSON.stringify({ ...outline, approval: { status: 'confirmed', approvedBy: 'human' } }));
  await writeFile(paths['style-selection'], JSON.stringify({ status: 'selected', approvedBy: 'human', styleId: style.id }));
  await writeFile(paths.grill, JSON.stringify({ status: 'complete', materialsReviewed: true, pressureTestAnswer: '已驗證最薄弱假設。' }));
  const output = join(root, 'deck.html');
  const rendered = JSON.parse((await run(process.execPath, [cli, 'render-new', '--deck-spec', paths['deck-spec'], '--outline', paths.outline, '--style-selection', paths['style-selection'], '--grill', paths.grill, '--output', output])).stdout);
  assert.equal(rendered.status, 'pass');
  const html = await readFile(output, 'utf8');
  assert.match(html, /data-pptskill-number-flow-vendor/);
  assert.ok(Buffer.byteLength(html) < 20 * 1024 * 1024);
});
