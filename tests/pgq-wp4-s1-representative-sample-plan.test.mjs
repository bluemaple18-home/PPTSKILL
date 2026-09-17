import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import test from 'node:test';
import { mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';
import { createGenerationPlan } from '../runtime/generation-plan.js';
import { buildDistribution } from '../tools/build-distribution.mjs';

const run = promisify(execFile);

const style = {
  id: 'qa-technical', name: 'QA technical',
  layout: { primaryMove: 'technical-map', compositionLanguage: 'technical' }, density: 'high',
  typography: { display: 'Arial', body: 'Arial', mono: 'Menlo' },
  palette: { canvas: '#fff', text: '#111', muted: '#777', accent: '#06c', surface: '#eee' },
  spacing: { unit: 8, slidePadding: 64 }, geometry: { radius: 0, borderWidth: 1 },
  motion: { personality: 'none', durationMs: 0, easing: 'linear', reducedMotion: true },
  assetTreatment: 'content-led',
};
const slides = [
  { id: 'opening', title: '開場', subtitle: '背景', keyPoints: ['目標', '範圍', '限制'] },
  { id: 'typical', title: '主要路徑', subtitle: '方法', keyPoints: ['步驟一', '步驟二', '步驟三'] },
  { id: 'stress', title: '高風險證據', subtitle: '壓力頁', keyPoints: ['證據一', '證據二', '證據三', '證據四', '證據五'] },
  { id: 'close', title: '結論', subtitle: '下一步', keyPoints: ['結論一', '結論二', '結論三'] },
];
const outline = { deckTitle: 'Representative QA', sourcePolicy: 'user-provided-only', slides };
const semanticSignals = slides.map(({ id }, index) => ({
  slideId: id,
  slideRole: 'content',
  relationship: index === 2 ? 'evidence' : 'explanation',
  evidence: index === 2 ? 'numeric' : 'textual',
  density: index === 2 ? 'high' : 'medium',
}));
const rhythmSignals = slides.map(({ id }, index) => ({
  slideId: id,
  density: index === 2 ? 'high' : 'medium',
  emphasis: index === 2 ? 'highlight' : 'normal',
  evidenceWeight: index === 2 ? 'high' : 'low',
  motionIntensity: index === 2 ? 'high' : 'low',
  sectionRole: ['opening', 'buildup', 'proof', 'close'][index],
}));
const request = (overrides = {}) => ({
  outline,
  styleSpecId: style.id,
  styleSpec: style,
  capacity: { maxSlidesPerUnit: 4 },
  semanticSignals,
  rhythmSignals,
  ...overrides,
});

test('兩張代表頁從正式 planner truth 選出 Typical 與第三頁 Stress', () => {
  const plan = createGenerationPlan(request({ sampleCount: 2 }));
  assert.deepEqual(plan.sample.slideIds, ['typical', 'stress']);
  assert.deepEqual(plan.sample.entries.map(({ role }) => role), ['typical', 'stress']);
  assert.ok(plan.sample.entries[1].reasonCodes.includes('high_density'));
  assert.ok(plan.sample.entries[1].reasonCodes.includes('high_evidence'));
  assert.equal(plan.sample.fullDeckQaRequired, true);
  assert.equal(plan.sample.requiresApprovalBeforeRemaining, true);
});

test('一張代表頁同時承擔 Typical 與 Stress，且重跑 byte-stable', () => {
  const first = createGenerationPlan(request({ sampleCount: 1 })).sample;
  const second = createGenerationPlan(request({ sampleCount: 1 })).sample;
  assert.equal(first.entries.length, 1);
  assert.equal(first.entries[0].role, 'both');
  assert.deepEqual(first, second);
  assert.equal(JSON.stringify(first), JSON.stringify(second));
});

test('skip sample 不建立人工等待，但不解除 full-deck QA', () => {
  const sample = createGenerationPlan(request({ sampleCount: 0 })).sample;
  assert.deepEqual(sample.slideIds, []);
  assert.deepEqual(sample.entries, []);
  assert.equal(sample.requiresApprovalBeforeRemaining, false);
  assert.equal(sample.fullDeckQaRequired, true);
});

test('sample selection 不改 composition、rhythm、motion、background 或 generation units', () => {
  const skipped = createGenerationPlan(request({ sampleCount: 0 }));
  const selected = createGenerationPlan(request({ sampleCount: 2 }));
  const { sample: skippedSample, ...skippedPlan } = skipped;
  const { sample: selectedSample, ...selectedPlan } = selected;
  assert.equal(skippedSample.fullDeckQaRequired, true);
  assert.deepEqual(selectedSample.slideIds, ['typical', 'stress']);
  assert.deepEqual(selectedPlan, skippedPlan);
});

test('legacy 無 planner signals 仍 deterministic；單頁 deck 收斂為一筆 both', () => {
  const legacy = createGenerationPlan({
    outline,
    styleSpecId: style.id,
    capacity: { maxSlidesPerUnit: 4 },
    sampleCount: 2,
  });
  assert.deepEqual(legacy.sample.slideIds, ['opening', 'typical']);
  assert.deepEqual(legacy.sample.entries.map(({ role }) => role), ['typical', 'stress']);

  const one = createGenerationPlan({
    outline: { ...outline, slides: [slides[0]] },
    styleSpecId: style.id,
    capacity: { maxSlidesPerUnit: 4 },
    sampleCount: 2,
  });
  assert.deepEqual(one.sample.slideIds, ['opening']);
  assert.equal(one.sample.entries[0].role, 'both');
});

test('installed plan-new 使用相同 Representative Sample contract', async () => {
  const root = await mkdtemp(join(tmpdir(), 'pptskill-pgq-wp4-s1-'));
  const archive = join(root, 'PPTSKILL.zip');
  await buildDistribution({ archivePath: archive });
  const extracted = join(root, 'extract');
  await run('/usr/bin/unzip', ['-q', archive, '-d', extracted]);
  const bundle = join(extracted, 'PPTSKILL');
  const installRoot = join(root, 'user', '.pptskill', 'runtime');
  await run(process.execPath, [join(bundle, 'install.mjs'), '--install-root', installRoot]);
  const requestPath = join(root, 'plan-request.json');
  await writeFile(requestPath, JSON.stringify(request({ sampleCount: 2 })));
  const cli = join(installRoot, 'core', 'runtime', 'workflow-cli.mjs');
  const installed = JSON.parse((await run(process.execPath, [cli, 'plan-new', '--request', requestPath])).stdout);
  assert.deepEqual(installed.plan.sample, createGenerationPlan(request({ sampleCount: 2 })).sample);
});
