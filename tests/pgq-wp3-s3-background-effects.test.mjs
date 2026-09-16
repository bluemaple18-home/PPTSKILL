import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import test from 'node:test';
import { mkdtemp, readFile, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';
import { runInNewContext } from 'node:vm';
import { getBackgroundEffectCapabilities, buildBackgroundBrowserContractRuntime, resolveBackgroundEffectOptions } from '../runtime/background-effects.js';
import { verifyBackgroundEffectsVendor } from '../runtime/background-effects-vendor.js';
import { createDeckEditor } from '../runtime/deck-editor.js';
import { extractDeckSpec, sanitizeDeckSpec } from '../runtime/deck-spec.js';
import { renderFullDeck } from '../runtime/full-deck-renderer.js';
import { createGenerationPlan } from '../runtime/generation-plan.js';
import { buildDistribution } from '../tools/build-distribution.mjs';

const run = promisify(execFile);
const style = { id: 'bg-dark', name: 'Background dark', layout: { primaryMove: 'editorial-rail', compositionLanguage: 'editorial' }, density: 'medium', typography: { display: 'Arial', body: 'Arial', mono: 'Menlo' }, palette: { canvas: '#121827', text: '#f6f7fb', muted: '#b7c0d6', accent: '#93c5fd', surface: '#1f2937' }, spacing: { unit: 8, slidePadding: 64 }, geometry: { radius: 8, borderWidth: 1 }, motion: { personality: 'corporate', durationMs: 320, easing: 'ease-out', reducedMotion: true }, assetTreatment: 'content-led' };
const slide = { id: 'opening', title: 'Background truth', subtitle: 'Offline runtime', keyPoints: ['A', 'B', 'C'] };
const outline = { schemaVersion: '1.0', deckTitle: 'Background plan', sourcePolicy: 'user-provided-only', slides: [slide] };
const semanticSignals = [{ slideId: slide.id, slideRole: 'cover', relationship: 'explanation', evidence: 'textual', density: 'medium' }];
const rhythmSignals = [{ slideId: slide.id, density: 'medium', emphasis: 'highlight', evidenceWeight: 'low', motionIntensity: 'medium', sectionRole: 'opening' }];
const background = { effect: 'waves', intensity: 'medium', speed: 'normal', palette: 'style' };
const backgroundSignals = [{ slideId: slide.id, ...background }];
const request = (overrides = {}) => ({ outline, styleSpecId: style.id, styleSpec: style, capacity: { maxSlidesPerUnit: 3 }, semanticSignals, rhythmSignals, backgroundSignals, ...overrides });
const deck = (backgroundEffect = background) => ({ schemaVersion: '1.0', deckId: 'background-deck', title: 'Background deck', language: 'zh-Hant', style, slides: [{ id: slide.id, content: { title: slide.title, subtitle: slide.subtitle, keyPoints: [...slide.keyPoints], components: [] }, composition: { primitive: 'cover', variant: 'default', slots: { title: 'content.title', subtitle: 'content.subtitle' }, ...(backgroundEffect ? { backgroundEffect } : {}) } }] });

test('capability matrix truthful：11 offered、CLOUDS2/p5 routes unavailable，vendor pin/checksum PASS', () => {
  const capabilities = getBackgroundEffectCapabilities().effects;
  assert.equal(Object.keys(capabilities).length, 15);
  assert.equal(Object.values(capabilities).filter(({ status }) => status === 'supported').length, 12);
  assert.equal(capabilities.clouds2.reasonCode, 'texture_artifact_not_bundled');
  assert.equal(capabilities.topology.reasonCode, 'license_gate');
  assert.equal(capabilities.trunk.reasonCode, 'license_gate');
  assert.equal(verifyBackgroundEffectsVendor().status, 'pass');
});

test('planner 使用 rhythm/capability truth；unsupported 不偷換，unknown config fail loud', () => {
  const plan = createGenerationPlan(request());
  assert.equal(plan.backgroundPlan.proposals[0].status, 'available');
  assert.deepEqual(plan.backgroundPlan.proposals[0].compositionBackgroundEffect, background);
  assert.equal(plan.backgroundCapabilities.effects.waves.status, 'supported');
  const unavailable = createGenerationPlan(request({ backgroundSignals: [{ slideId: slide.id, effect: 'topology', intensity: 'medium', speed: 'normal', palette: 'style' }] }));
  assert.equal(unavailable.backgroundPlan.proposals[0].status, 'unavailable');
  assert.equal(unavailable.backgroundPlan.proposals[0].reasons[0].code, 'license_gate');
  assert.equal(createGenerationPlan(request({ backgroundSignals: [{ slideId: slide.id, effect: 'none' }] })).backgroundPlan.proposals[0].status, 'available');
  assert.throws(() => createGenerationPlan(request({ backgroundSignals: [{ ...backgroundSignals[0], shader: 'arbitrary' }] })), /不允許欄位/);
});

test('DeckSpec/editor/browser contract allowlist background metadata，移除 executable 欄位', () => {
  const dirty = deck({ ...background, shader: 'void main()', url: 'https://example.com', reviewMetadata: { prompt: 'leak' } });
  const clean = sanitizeDeckSpec(dirty);
  assert.deepEqual(clean.slides[0].composition.backgroundEffect, background);
  assert.equal(JSON.stringify(clean).includes('shader'), false);
  assert.deepEqual(createDeckEditor(dirty).getSpec().slides[0].composition.backgroundEffect, background);
  const context = { result: null };
  runInNewContext(`${buildBackgroundBrowserContractRuntime()};result=validateSlideBackgroundEffect(${JSON.stringify(clean.slides[0])})`, context);
  assert.equal(context.result.length, 0);
  assert.throws(() => createDeckEditor(deck({ effect: 'topology', intensity: 'medium', speed: 'normal', palette: 'style' })), /backgroundEffect/);
});

test('renderer 單檔內嵌 vendor/runtime，style mapping bounded，export truth 不含 canvas', () => {
  const options = resolveBackgroundEffectOptions(background, style);
  assert.equal(options.color, 0x0f1421);
  const rendered = renderFullDeck(deck());
  assert.equal(rendered.status, 'pass');
  assert.match(rendered.html, /data-pptskill-background-vendor/);
  assert.match(rendered.html, /data-pptskill-background-runtime/);
  assert.match(rendered.html, /data-background-effect="waves"/);
  assert.match(rendered.html, /prefers-reduced-motion: reduce/);
  assert.match(rendered.html, /webgl-unavailable/);
  assert.match(rendered.html, /instance\?\.bufferTarget/);
  assert.match(rendered.html, /positionVariable/);
  assert.deepEqual(extractDeckSpec(rendered.html).slides[0].composition.backgroundEffect, background);
  assert.equal(renderFullDeck(deck(null)).html.includes('data-pptskill-background-vendor'), false);
});

test('fresh ZIP installed plan-new/render-new 使用同一 truth，且低於 20 MiB', async () => {
  const root = await mkdtemp(join(tmpdir(), 'pptskill-pgq-wp3-s3-'));
  const archive = join(root, 'PPTSKILL.zip');
  await buildDistribution({ archivePath: archive });
  assert.ok((await stat(archive)).size < 20 * 1024 * 1024);
  const extracted = join(root, 'extract');
  await run('/usr/bin/unzip', ['-q', archive, '-d', extracted]);
  const bundle = join(extracted, 'PPTSKILL');
  assert.match(await readFile(join(bundle, 'skill', 'pptskill', 'SKILL.md'), 'utf8'), /backgroundSignals/);
  for (const adapter of ['codex', 'claude-code', 'gemini']) assert.match(await readFile(join(bundle, 'adapters', adapter, 'entry.md'), 'utf8'), /compositionBackgroundEffect/);
  const installRoot = join(root, 'user', '.pptskill', 'runtime');
  await run(process.execPath, [join(bundle, 'install.mjs'), '--install-root', installRoot]);
  const cli = join(installRoot, 'core', 'runtime', 'workflow-cli.mjs');
  const requestPath = join(root, 'request.json');
  await writeFile(requestPath, JSON.stringify(request()));
  const planned = JSON.parse((await run(process.execPath, [cli, 'plan-new', '--request', requestPath])).stdout);
  assert.equal(planned.plan.backgroundPlan.proposals[0].status, 'available');
  const deckPath = join(root, 'deck.json'), outlinePath = join(root, 'outline.json'), stylePath = join(root, 'style.json'), grillPath = join(root, 'grill.json'), output = join(root, 'deck.html');
  await writeFile(deckPath, JSON.stringify(deck()));
  await writeFile(outlinePath, JSON.stringify({ ...outline, approval: { status: 'confirmed', approvedBy: 'human' } }));
  await writeFile(stylePath, JSON.stringify({ status: 'selected', approvedBy: 'human', styleId: style.id }));
  await writeFile(grillPath, JSON.stringify({ status: 'complete', materialsReviewed: true, pressureTestAnswer: '已驗證最薄弱假設。' }));
  const rendered = JSON.parse((await run(process.execPath, [cli, 'render-new', '--deck-spec', deckPath, '--outline', outlinePath, '--style-selection', stylePath, '--grill', grillPath, '--output', output])).stdout);
  assert.equal(rendered.status, 'pass');
  assert.match(await readFile(output, 'utf8'), /data-pptskill-background-vendor/);
});
