import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import test from 'node:test';
import { mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';
import { createGenerationPlan } from '../runtime/generation-plan.js';
import { routeGoldenReferences } from '../runtime/golden-reference-router.js';
import { buildDistribution } from '../tools/build-distribution.mjs';

const run = promisify(execFile);

const slide = { id: 'proof', title: '比較方案', subtitle: '文字證據與差異', keyPoints: ['主張一', '主張二', '支持證據'] };
const outline = { deckTitle: 'Golden routing', sourcePolicy: 'user-provided-only', slides: [slide] };
const capacity = { maxSlidesPerUnit: 3 };
const semanticSignals = [{ slideId: 'proof', slideRole: 'content', relationship: 'comparison', evidence: 'textual', density: 'low' }];
const style = ({ id, primaryMove, compositionLanguage, density }) => ({
  id, name: id,
  layout: { primaryMove, compositionLanguage }, density,
  typography: { display: 'Arial', body: 'Arial', mono: 'Menlo' },
  palette: { canvas: '#fff', text: '#111', muted: '#777', accent: '#06c', surface: '#eee' },
  spacing: { unit: 8, slidePadding: 64 }, geometry: { radius: 0, borderWidth: 1 },
  motion: { personality: 'none', durationMs: 0, easing: 'linear', reducedMotion: true },
  assetTreatment: 'content-led',
});

test('同一 semantic candidate 依 StyleSpec 路由到不同 Golden logic，但不改 primitive rank', () => {
  const editorialStyle = style({ id: 'route-editorial-rail', primaryMove: 'editorial-rail', compositionLanguage: 'narrative', density: 'low' });
  const technicalStyle = style({ id: 'route-technical-map', primaryMove: 'technical-map', compositionLanguage: 'technical', density: 'high' });
  const editorial = createGenerationPlan({ outline, styleSpecId: editorialStyle.id, styleSpec: editorialStyle, capacity, semanticSignals });
  const technical = createGenerationPlan({ outline, styleSpecId: technicalStyle.id, styleSpec: technicalStyle, capacity, semanticSignals });

  assert.equal(editorial.goldenRouting[0].candidates[0].primitive, 'split-proof');
  assert.equal(technical.goldenRouting[0].candidates[0].primitive, 'split-proof');
  assert.equal(editorial.goldenRouting[0].candidates[0].references[0].logicRef, 'typography-hero');
  assert.equal(technical.goldenRouting[0].candidates[0].references[0].logicRef, 'information-led-cover');
  assert.deepEqual(
    editorial.goldenRouting[0].candidates.map(({ primitive, rank }) => [primitive, rank]),
    editorial.compositionProposals[0].rankedCandidates.map(({ primitive, rank }) => [primitive, rank]),
  );
});

test('Golden routing 提供 bounded structured reasons，且只引用 accepted evidence keys', async () => {
  const editorialStyle = style({ id: 'route-editorial-rail', primaryMove: 'editorial-rail', compositionLanguage: 'narrative', density: 'low' });
  const plan = createGenerationPlan({ outline, styleSpecId: editorialStyle.id, styleSpec: editorialStyle, capacity, semanticSignals });
  const manifest = JSON.parse(await readFile(new URL('../design/materials/golden-covers/golden-cover-references.json', import.meta.url), 'utf8'));
  const accepted = new Set(manifest.records.filter(({ decision }) => decision === 'accept')
    .map(({ id, filename }) => id || filename.match(/^unresolved-\d+/)?.[0]));

  for (const candidate of plan.goldenRouting[0].candidates) {
    assert.ok(candidate.references.length <= 2);
    for (const reference of candidate.references) {
      assert.deepEqual(Object.keys(reference.routing).sort(), ['anchorMatch', 'antiPatternConflict', 'densityMatch', 'semanticMatch', 'styleMatch']);
      assert.ok(reference.reasonCodes.includes('anti_pattern_clear'));
      assert.ok(reference.evidenceRefs.every((evidenceRef) => accepted.has(evidenceRef)));
    }
  }
  assert.ok(plan.goldenRouting[0].antiPatternGuardCodes.includes('exclude_mechanical_50_50'));
  assert.ok(plan.goldenRouting[0].candidates.some(({ excluded }) => excluded.some(({ antiPatternConflict }) => antiPatternConflict.includes('anti_pattern_conflict_missing_semantic_image'))));
  assert.doesNotMatch(JSON.stringify(plan.goldenRouting), /artifact|filename|<html|<style|class=|https?:|data:image|\.png|\.gif/i);
});

test('沒有同時通過 semantic、anchor 與 Style match 時回 none，不硬配', () => {
  const contradictoryStyle = style({ id: 'route-contradictory', primaryMove: 'technical-map', compositionLanguage: 'narrative', density: 'medium' });
  const plan = createGenerationPlan({ outline, styleSpecId: contradictoryStyle.id, styleSpec: contradictoryStyle, capacity, semanticSignals });
  assert.ok(plan.goldenRouting[0].candidates.every(({ status, references }) => status === 'none' && references.length === 0));
});

test('Golden routing 不改 Slice 2 candidates、primitive、content 或 hash', () => {
  const editorialStyle = style({ id: 'route-editorial-rail', primaryMove: 'editorial-rail', compositionLanguage: 'narrative', density: 'low' });
  const baseline = createGenerationPlan({ outline, styleSpecId: editorialStyle.id, capacity, semanticSignals });
  const routed = createGenerationPlan({ outline, styleSpecId: editorialStyle.id, styleSpec: editorialStyle, capacity, semanticSignals });
  assert.deepEqual(routed.compositionProposals, baseline.compositionProposals);
  assert.deepEqual(routed.units, baseline.units);
  assert.deepEqual(routed.goldenRouting[0].contentIntegrity, routed.compositionProposals[0].contentIntegrity);
  assert.equal(routed.goldenRouting[0].contentIntegrity.unchanged, true);
  assert.deepEqual(routed.goldenRouting[0].candidates.map(({ primitive, rank }) => [primitive, rank]), [['split-proof', 1], ['title-points', 2]]);
  assert.deepEqual(baseline.goldenRouting, []);
});

test('Golden router 拒絕 unavailable candidate 與 StyleSpec identity mismatch', () => {
  const editorialStyle = style({ id: 'route-editorial-rail', primaryMove: 'editorial-rail', compositionLanguage: 'narrative', density: 'low' });
  assert.throws(() => routeGoldenReferences({
    styleSpecId: editorialStyle.id,
    styleSpec: editorialStyle,
    compositionProposals: [{
      slideId: 'proof', semantic: { density: 'low' }, contentIntegrity: { unchanged: true },
      rankedCandidates: [{ rank: 1, primitive: 'split-proof', status: 'unavailable' }],
    }],
  }), /不是 available candidate/);
  assert.throws(() => createGenerationPlan({
    outline, styleSpecId: 'different-style', styleSpec: editorialStyle, capacity, semanticSignals,
  }), /StyleSpec ID/);
});

test('installed plan-new 輸出 Golden logic routing，舊 request 未帶 StyleSpec 仍可用', async () => {
  const root = await mkdtemp(join(tmpdir(), 'pptskill-pgq-wp2-golden-'));
  const archive = join(root, 'PPTSKILL.zip');
  await buildDistribution({ archivePath: archive });
  const extracted = join(root, 'extract');
  await run('/usr/bin/unzip', ['-q', archive, '-d', extracted]);
  const bundle = join(extracted, 'PPTSKILL');
  const installRoot = join(root, 'user', '.pptskill', 'runtime');
  await run(process.execPath, [join(bundle, 'install.mjs'), '--install-root', installRoot]);
  const installedSkill = await readFile(join(root, 'user', '.codex', 'skills', 'pptskill', 'SKILL.md'), 'utf8');
  assert.match(installedSkill, /Golden.*styleSpec|styleSpec.*Golden/is);

  const editorialStyle = style({ id: 'route-editorial-rail', primaryMove: 'editorial-rail', compositionLanguage: 'narrative', density: 'low' });
  const requestPath = join(root, 'plan-request.json');
  await writeFile(requestPath, JSON.stringify({ outline, styleSpecId: editorialStyle.id, styleSpec: editorialStyle, capacity, semanticSignals }));
  const cli = join(installRoot, 'core', 'runtime', 'workflow-cli.mjs');
  const result = JSON.parse((await run(process.execPath, [cli, 'plan-new', '--request', requestPath])).stdout);
  assert.equal(result.plan.goldenRouting[0].candidates[0].references[0].logicRef, 'typography-hero');
  assert.equal(result.plan.goldenRouting[0].candidates[0].primitive, 'split-proof');

  await writeFile(requestPath, JSON.stringify({ outline, styleSpecId: editorialStyle.id, capacity, semanticSignals }));
  const legacy = JSON.parse((await run(process.execPath, [cli, 'plan-new', '--request', requestPath])).stdout);
  assert.deepEqual(legacy.plan.goldenRouting, []);
});
