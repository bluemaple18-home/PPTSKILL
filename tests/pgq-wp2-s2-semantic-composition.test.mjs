import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import test from 'node:test';
import { mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';
import { createGenerationPlan } from '../runtime/generation-plan.js';
import { buildDistribution } from '../tools/build-distribution.mjs';

const run = promisify(execFile);
const slide = (id, title = id) => ({ id, title, subtitle: `${title} subtitle`, keyPoints: [`${title} 一`, `${title} 二`, `${title} 三`] });
const outline = {
  deckTitle: 'Semantic planner', sourcePolicy: 'user-provided-only',
  slides: [slide('comparison'), slide('sequence'), slide('asset'), slide('opening'), slide('section')],
};
const capacity = { maxSlidesPerUnit: 3 };

test('semantic classes 產生 bounded ranked candidates，不是一對一固定 mapping', () => {
  const plan = createGenerationPlan({
    outline: { ...outline, slides: outline.slides.slice(0, 2) }, styleSpecId: 'selected-style', capacity,
    semanticSignals: [
      { slideId: 'comparison', slideRole: 'content', relationship: 'comparison', evidence: 'numeric', density: 'medium' },
      { slideId: 'sequence', slideRole: 'content', relationship: 'sequence', evidence: 'textual', density: 'medium' },
    ],
  });
  const comparison = plan.compositionProposals.find(({ slideId }) => slideId === 'comparison');
  assert.equal(comparison.status, 'ready');
  assert.deepEqual(comparison.rankedCandidates.map(({ primitive }) => primitive), ['metric-grid', 'split-proof', 'title-points']);
  assert.ok(comparison.rankedCandidates.every(({ reasonCodes, reason }) => reasonCodes.length >= 2 && reason.length > 0));
  assert.ok(comparison.rankedCandidates.every(({ status }) => status === 'available'));

  const sequence = plan.compositionProposals.find(({ slideId }) => slideId === 'sequence');
  assert.deepEqual(sequence.rankedCandidates.map(({ primitive }) => primitive), ['process-flow', 'title-points']);

  const textual = createGenerationPlan({
    outline: { ...outline, slides: [outline.slides[0]] }, styleSpecId: 'selected-style', capacity,
    semanticSignals: [{ slideId: 'comparison', slideRole: 'content', relationship: 'comparison', evidence: 'textual', density: 'medium' }],
  }).compositionProposals[0];
  assert.equal(textual.rankedCandidates[0].primitive, 'split-proof');
  assert.notEqual(textual.rankedCandidates[0].primitive, 'metric-grid');
});

test('asset-led 與 slide role 使用既有 component-focus／cover／section-break', () => {
  const plan = createGenerationPlan({
    outline: { ...outline, slides: outline.slides.slice(2, 5) }, styleSpecId: 'selected-style', capacity,
    generationPermissions: { image: false, chart: false },
    semanticSignals: [
      { slideId: 'asset', slideRole: 'content', relationship: 'asset-led', evidence: 'textual', density: 'low', component: { id: 'hero', type: 'image', dataUri: 'data:image/png;base64,private' }, componentOrigin: 'user-provided', prompt: '不得外洩' },
      { slideId: 'opening', slideRole: 'cover', relationship: 'explanation', evidence: 'none', density: 'low' },
      { slideId: 'section', slideRole: 'section', relationship: 'explanation', evidence: 'none', density: 'low' },
    ],
  });
  assert.equal(plan.compositionProposals.find(({ slideId }) => slideId === 'asset').proposal.primitive, 'component-focus');
  assert.equal(plan.compositionProposals.find(({ slideId }) => slideId === 'opening').proposal.primitive, 'cover');
  assert.equal(plan.compositionProposals.find(({ slideId }) => slideId === 'section').proposal.primitive, 'section-break');
  assert.doesNotMatch(JSON.stringify(plan.compositionProposals), /dataUri|private|不得外洩|prompt/);
});

test('capability gate 保留 unavailable verdict，不能替 asset-led 偷換 primitive', () => {
  const plan = createGenerationPlan({
    outline: { ...outline, slides: [outline.slides[2]] }, styleSpecId: 'selected-style', capacity,
    generationPermissions: { chart: true },
    semanticSignals: [{
      slideId: 'asset', slideRole: 'content', relationship: 'asset-led', evidence: 'numeric', density: 'medium',
      component: { id: 'trend', type: 'chart', chartType: 'line', series: [{ values: [1, 2] }] }, componentOrigin: 'generated',
    }],
  });
  const proposal = plan.compositionProposals[0];
  assert.equal(proposal.status, 'blocked');
  assert.deepEqual(proposal.rankedCandidates, []);
  assert.equal(proposal.consideredCandidates[0].status, 'unavailable');
  assert.match(JSON.stringify(proposal.consideredCandidates[0]), /chart_type_unavailable/);
  assert.equal(proposal.proposal, null);
});

test('CompositionSpec proposal 不改 approved content，before/after hash 一致', () => {
  const approvedSlides = structuredClone(outline.slides.slice(0, 2));
  const plan = createGenerationPlan({
    outline: { ...outline, slides: approvedSlides }, styleSpecId: 'selected-style', capacity,
    semanticSignals: [
      { slideId: 'comparison', slideRole: 'content', relationship: 'comparison', evidence: 'numeric', density: 'medium' },
      { slideId: 'sequence', slideRole: 'content', relationship: 'sequence', evidence: 'textual', density: 'medium' },
    ],
  });
  assert.deepEqual(plan.units.flatMap(({ slides }) => slides), approvedSlides);
  for (const item of plan.compositionProposals) {
    assert.equal(item.contentIntegrity.unchanged, true);
    assert.equal(item.contentIntegrity.beforeHash, item.contentIntegrity.afterHash);
    assert.deepEqual(Object.keys(item.proposal).sort(), ['primitive', 'slots', 'variant']);
  }
});

test('semantic signal coverage 與 allowlist 缺漏時 fail loud', () => {
  const base = { outline: { ...outline, slides: outline.slides.slice(0, 2) }, styleSpecId: 'selected-style', capacity };
  assert.throws(() => createGenerationPlan({
    ...base,
    semanticSignals: [{ slideId: 'comparison', slideRole: 'content', relationship: 'comparison', evidence: 'numeric', density: 'medium' }],
  }), /完整覆蓋/);
  assert.throws(() => createGenerationPlan({
    ...base,
    semanticSignals: [
      { slideId: 'comparison', slideRole: 'content', relationship: 'comparison', evidence: 'numeric', density: 'medium' },
      { slideId: 'comparison', slideRole: 'content', relationship: 'comparison', evidence: 'textual', density: 'low' },
    ],
  }), /重複 slide/);
  assert.throws(() => createGenerationPlan({
    outline: { ...outline, slides: [outline.slides[2]] }, styleSpecId: 'selected-style', capacity,
    semanticSignals: [{
      slideId: 'asset', slideRole: 'content', relationship: 'asset-led', evidence: 'textual', density: 'low',
      component: { id: 'hero', type: 'private-prompt' }, componentOrigin: 'user-provided',
    }],
  }), /component.type/);
});

test('installed plan-new 輸出 semantic proposal，舊 request 未帶 signals 仍可用', async () => {
  const root = await mkdtemp(join(tmpdir(), 'pptskill-pgq-wp2-semantic-'));
  const archive = join(root, 'PPTSKILL.zip');
  await buildDistribution({ archivePath: archive });
  const extracted = join(root, 'extract');
  await run('/usr/bin/unzip', ['-q', archive, '-d', extracted]);
  const bundle = join(extracted, 'PPTSKILL');
  const installRoot = join(root, 'user', '.pptskill', 'runtime');
  await run(process.execPath, [join(bundle, 'install.mjs'), '--install-root', installRoot]);
  const installedSkill = await readFile(join(root, 'user', '.codex', 'skills', 'pptskill', 'SKILL.md'), 'utf8');
  assert.match(installedSkill, /semanticSignals/);

  const requestPath = join(root, 'plan-request.json');
  await writeFile(requestPath, JSON.stringify({
    outline: { ...outline, slides: [outline.slides[0]] }, styleSpecId: 'selected-style', capacity,
    semanticSignals: [{ slideId: 'comparison', slideRole: 'content', relationship: 'comparison', evidence: 'numeric', density: 'medium' }],
  }));
  const cli = join(installRoot, 'core', 'runtime', 'workflow-cli.mjs');
  const result = JSON.parse((await run(process.execPath, [cli, 'plan-new', '--request', requestPath])).stdout);
  assert.equal(result.plan.compositionProposals[0].proposal.primitive, 'metric-grid');
  assert.equal(result.plan.compositionProposals[0].contentIntegrity.unchanged, true);

  await writeFile(requestPath, JSON.stringify({ outline: { ...outline, slides: [outline.slides[0]] }, styleSpecId: 'selected-style', capacity }));
  const legacy = JSON.parse((await run(process.execPath, [cli, 'plan-new', '--request', requestPath])).stdout);
  assert.deepEqual(legacy.plan.compositionProposals, []);
});
