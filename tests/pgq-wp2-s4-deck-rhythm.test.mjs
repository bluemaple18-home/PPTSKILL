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
const capacity = { maxSlidesPerUnit: 8 };
const style = {
  id: 'rhythm-technical', name: 'Rhythm technical',
  layout: { primaryMove: 'technical-map', compositionLanguage: 'technical' }, density: 'high',
  typography: { display: 'Arial', body: 'Arial', mono: 'Menlo' },
  palette: { canvas: '#fff', text: '#111', muted: '#777', accent: '#06c', surface: '#eee' },
  spacing: { unit: 8, slidePadding: 64 }, geometry: { radius: 0, borderWidth: 1 },
  motion: { personality: 'none', durationMs: 0, easing: 'linear', reducedMotion: true },
  assetTreatment: 'content-led',
};
const slides = Array.from({ length: 4 }, (_, index) => ({
  id: `proof-${index + 1}`, title: `數值比較 ${index + 1}`, subtitle: '核准內容', keyPoints: ['方案甲', '方案乙', '差異證據'],
}));
const outline = { deckTitle: 'Deck rhythm', sourcePolicy: 'user-provided-only', slides };
const semanticSignals = slides.map(({ id }) => ({
  slideId: id, slideRole: 'content', relationship: 'comparison', evidence: 'numeric', density: 'high',
}));
const rhythmSignals = slides.map(({ id }, index) => ({
  slideId: id,
  density: 'high',
  emphasis: 'highlight',
  evidenceWeight: 'high',
  motionIntensity: 'high',
  sectionRole: index === 0 ? 'opening' : index === slides.length - 1 ? 'close' : 'proof',
}));

const plan = (overrides = {}) => createGenerationPlan({
  outline, styleSpecId: style.id, styleSpec: style, capacity, semanticSignals, rhythmSignals, ...overrides,
});

test('跨頁重複只在 bounded semantic candidates 內調整，並輸出 structured rhythm plan', () => {
  const result = plan();
  const selected = result.deckRhythmPlan.slides.map(({ selected: item }) => item);
  assert.deepEqual(selected.slice(0, 3).map(({ primitive }) => primitive), ['metric-grid', 'metric-grid', 'metric-grid']);
  assert.equal(selected[3].primitive, 'split-proof');
  assert.equal(result.deckRhythmPlan.slides[3].compositionProposal.primitive, 'split-proof');
  assert.equal(result.compositionProposals[3].proposal.primitive, 'metric-grid');
  assert.equal(selected[3].semanticScore, 85);
  assert.equal(result.compositionProposals[3].rankedCandidates[0].score - selected[3].semanticScore, 10);
  assert.ok(result.deckRhythmPlan.slides[3].deckReasonCodes.includes('composition_repetition_reduced'));
  assert.deepEqual(Object.keys(result.deckRhythmPlan.slides[3].signals).sort(), [
    'continuityGroup', 'density', 'emphasis', 'evidenceWeight', 'motionIntensity', 'sectionRole',
  ]);
  assert.deepEqual(Object.keys(selected[3]).sort(), [
    'compositionFamily', 'goldenLogicRef', 'primitive', 'rank', 'semanticScore', 'visualAnchorFamily',
  ]);
});

test('continuityGroup 保留有意重複，不為 diversity 換掉 top candidate', () => {
  const grouped = rhythmSignals.map((signal) => ({ ...signal, continuityGroup: 'proof-series' }));
  const result = plan({ rhythmSignals: grouped });
  assert.ok(result.deckRhythmPlan.slides.every(({ selected }) => selected.primitive === 'metric-grid'));
  assert.equal(result.deckRhythmPlan.slides[3].continuity.relation, 'intentional-repeat');
  assert.ok(result.deckRhythmPlan.slides[3].deckReasonCodes.includes('intentional_repetition_preserved'));
  assert.equal(result.deckRhythmPlan.warnings.some(({ code }) => code === 'composition_repetition_unresolved'), false);
});

test('不為節奏犧牲 semantic fit；無 bounded alternate 時保留 top 並明示 warning', () => {
  const textual = semanticSignals.map((signal) => ({ ...signal, evidence: 'textual' }));
  const result = plan({ semanticSignals: textual });
  assert.ok(result.deckRhythmPlan.slides.every(({ selected }) => selected.primitive === 'split-proof'));
  assert.ok(result.deckRhythmPlan.warnings.some(({ code, slideIds }) => code === 'composition_repetition_unresolved' && slideIds.at(-1) === 'proof-4'));
  assert.ok(result.deckRhythmPlan.slides[3].discardedAlternates.some(({ primitive, reasonCodes }) => primitive === 'title-points'
    && reasonCodes.includes('semantic_score_gap_exceeds_10')));
});

test('高密度、高 emphasis 與 high motion run 產生 bounded warnings，content 全 deck 不變', () => {
  const result = plan();
  const codes = result.deckRhythmPlan.warnings.map(({ code }) => code);
  assert.ok(codes.includes('high_density_emphasis_run'));
  assert.ok(codes.includes('high_motion_run'));
  assert.ok(codes.includes('high_evidence_run'));
  assert.ok(codes.includes('quiet_emphasis_absent'));
  assert.equal(result.deckRhythmPlan.contentIntegrity.unchanged, true);
  assert.deepEqual(result.deckRhythmPlan.contentIntegrity.slides, result.compositionProposals.map(({ slideId, contentIntegrity }) => ({ slideId, ...contentIntegrity })));
  assert.ok(result.deckRhythmPlan.slides.every(({ contentIntegrity }) => contentIntegrity.unchanged));

  const segmentedSignals = rhythmSignals.map((signal, index) => ({
    ...signal, sectionRole: ['opening', 'proof', 'transition', 'buildup'][index],
  }));
  const segmented = plan({ rhythmSignals: segmentedSignals });
  assert.equal(segmented.deckRhythmPlan.warnings.some(({ code }) => code === 'section_role_regression'), false);
});

test('rhythmSignals 必須完整、allowlisted 且不得自報 derived identity', () => {
  assert.throws(() => plan({ rhythmSignals: rhythmSignals.slice(0, 3) }), /完整覆蓋/);
  assert.throws(() => plan({ rhythmSignals: [...rhythmSignals, rhythmSignals[0]] }), /重複 slide/);
  assert.throws(() => plan({ rhythmSignals: rhythmSignals.map((signal, index) => index ? signal : { ...signal, density: 'ultra' }) }), /density/);
  assert.throws(() => plan({ rhythmSignals: rhythmSignals.map((signal, index) => index ? signal : { ...signal, density: 'low' }) }), /semantic density/);
  assert.throws(() => plan({ rhythmSignals: rhythmSignals.map((signal, index) => index ? signal : { ...signal, goldenLogicRef: 'spoofed' }) }), /不允許欄位/);
  assert.throws(() => createGenerationPlan({ outline, styleSpecId: style.id, capacity, semanticSignals, rhythmSignals }), /Golden routing/);
});

test('installed plan-new 穿透 Deck Rhythm Plan；未帶 rhythmSignals 的舊 request 回 null', async () => {
  const root = await mkdtemp(join(tmpdir(), 'pptskill-pgq-wp2-rhythm-'));
  const archive = join(root, 'PPTSKILL.zip');
  await buildDistribution({ archivePath: archive });
  const extracted = join(root, 'extract');
  await run('/usr/bin/unzip', ['-q', archive, '-d', extracted]);
  const bundle = join(extracted, 'PPTSKILL');
  const installRoot = join(root, 'user', '.pptskill', 'runtime');
  await run(process.execPath, [join(bundle, 'install.mjs'), '--install-root', installRoot]);
  const installedSkill = await readFile(join(root, 'user', '.codex', 'skills', 'pptskill', 'SKILL.md'), 'utf8');
  assert.match(installedSkill, /Deck Rhythm Plan|rhythmSignals/);

  const requestPath = join(root, 'plan-request.json');
  await writeFile(requestPath, JSON.stringify({ outline, styleSpecId: style.id, styleSpec: style, capacity, semanticSignals, rhythmSignals }));
  const cli = join(installRoot, 'core', 'runtime', 'workflow-cli.mjs');
  const result = JSON.parse((await run(process.execPath, [cli, 'plan-new', '--request', requestPath])).stdout);
  assert.equal(result.plan.deckRhythmPlan.slides[3].selected.primitive, 'split-proof');
  assert.equal(result.plan.deckRhythmPlan.contentIntegrity.unchanged, true);

  await writeFile(requestPath, JSON.stringify({ outline, styleSpecId: style.id, styleSpec: style, capacity, semanticSignals }));
  const legacy = JSON.parse((await run(process.execPath, [cli, 'plan-new', '--request', requestPath])).stdout);
  assert.equal(legacy.plan.deckRhythmPlan, null);
});
