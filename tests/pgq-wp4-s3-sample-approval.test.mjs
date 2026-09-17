import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import test from 'node:test';
import { access, mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';
import { approveRepresentativeSample } from '../runtime/sample-approval.js';
import { buildDistribution } from '../tools/build-distribution.mjs';

const run = promisify(execFile);
const sample = {
  version: 1,
  slideIds: ['slide-01', 'slide-04'],
  entries: [
    { slideId: 'slide-01', role: 'typical', reasonCodes: ['main_narrative_role'] },
    { slideId: 'slide-04', role: 'stress', reasonCodes: ['high_density'] },
  ],
  requiresApprovalBeforeRemaining: true,
  fullDeckQaRequired: true,
};
const codes = ['content_integrity', 'geometry', 'static_readability', 'animation_interference'];
const hardGateRequest = (status = 'pass') => ({
  sample,
  checks: sample.slideIds.flatMap((slideId) => codes.map((code) => ({
    slideId, code, status, evidenceRef: `evidence/${slideId}-${code}.json`,
  }))),
  repairHistory: [],
  lastSuccessfulEvidence: 'evidence/sample-pass.json',
});
const deckSpec = {
  schemaVersion: '1.0',
  deckId: 'sample-deck',
  title: 'Sample deck',
  language: 'zh-Hant',
  style: {
    id: 'style-a', name: 'Style A', layout: { primaryMove: 'grid', compositionLanguage: 'executive' }, density: 'medium',
    typography: { display: 'system-ui', body: 'system-ui' },
    palette: { canvas: '#fff', text: '#111', muted: '#777', accent: '#06c', surface: '#eee' },
    spacing: { unit: 8, slidePadding: 64 }, geometry: { radius: 8, borderWidth: 1 },
    motion: { personality: 'none', durationMs: 0, easing: 'linear' }, assetTreatment: 'contain',
  },
  slides: [
    { id: 'slide-01', content: { title: 'Typical', subtitle: 'Main', keyPoints: ['A', 'B', 'C'], components: [] }, composition: { primitive: 'title-body', variant: 'default', slots: {} } },
    { id: 'slide-02', content: { title: 'Other', subtitle: 'Middle', keyPoints: ['D', 'E', 'F'], components: [] }, composition: { primitive: 'title-body', variant: 'default', slots: {} } },
    { id: 'slide-04', content: { title: 'Stress', subtitle: 'Dense', keyPoints: ['G', 'H', 'I'], components: [] }, composition: { primitive: 'metric', variant: 'dense', slots: {} } },
  ],
};
const request = (overrides = {}) => ({
  sample,
  hardGateRequest: hardGateRequest(),
  deckSpec,
  approval: { approved: true, approvedBy: 'human', evidenceRef: 'evidence/human-approval.json' },
  feedback: [],
  contractVersion: 'pgq-wp4-v1',
  ...overrides,
});

test('PASS hard gate 與 human approval 建立 deterministic immutable freeze', () => {
  const input = request();
  const before = structuredClone(input);
  const first = approveRepresentativeSample(input);
  const second = approveRepresentativeSample(input);
  assert.deepEqual(first, second);
  assert.deepEqual(input, before);
  assert.equal(first.status, 'pass');
  assert.equal(first.freeze.sample.length, 2);
  assert.match(first.freeze.styleFingerprint, /^[a-f0-9]{64}$/);
  assert.equal(first.fullDeckQaRequired, true);
  first.freeze.sample[0].contentFingerprint = 'mutated';
  assert.notEqual(second.freeze.sample[0].contentFingerprint, 'mutated');
});

test('非 PASS gate、非 human approval、sample 不一致與缺頁 fail loud', () => {
  assert.throws(() => approveRepresentativeSample(request({ hardGateRequest: hardGateRequest('unknown') })), /PASS|pass/u);
  assert.throws(() => approveRepresentativeSample(request({ approval: { approved: true, approvedBy: 'ai', evidenceRef: 'x' } })), /human/u);
  assert.throws(() => approveRepresentativeSample(request({ hardGateRequest: { ...hardGateRequest(), sample: { ...sample, slideIds: ['slide-01'] } } })), /sample/u);
  assert.throws(() => approveRepresentativeSample(request({ deckSpec: { ...deckSpec, slides: deckSpec.slides.slice(0, 2) } })), /slide-04/u);
  assert.throws(() => approveRepresentativeSample(request({ deckSpec: { ...deckSpec, slides: [...deckSpec.slides, { ...deckSpec.slides[0] }] } })), /IDs.*唯一/u);
});

test('scope planner 僅接受 bounded feedback，profile 必須明示 opt-in', () => {
  const result = approveRepresentativeSample(request({ feedback: [
    { scope: 'slide-local', code: 'adjust-composition', targetSlideId: 'slide-04' },
    { scope: 'deck-wide', code: 'adjust-style-density' },
    { scope: 'profile-opt-in', code: 'remember-density-preference', remember: true },
  ] }));
  assert.deepEqual(result.feedbackPlan.map(({ scope, targetSlideIds }) => [scope, targetSlideIds]), [
    ['slide-local', ['slide-04']],
    ['deck-wide', ['slide-02']],
    ['profile-opt-in', []],
  ]);
  assert.equal(result.profileWriteRequired, true);
  assert.equal(result.sampleStates.find(({ slideId }) => slideId === 'slide-04').status, 'invalidated');
  assert.throws(() => approveRepresentativeSample(request({ feedback: [{ scope: 'profile-opt-in', code: 'remember-density-preference' }] })), /remember/u);
  assert.throws(() => approveRepresentativeSample(request({ feedback: [{ scope: 'deck-wide', code: 'raw prompt' }] })), /code|allowlist/u);
});

test('sample content 或 composition 只使該頁失效', () => {
  const currentDeckSpec = structuredClone(deckSpec);
  currentDeckSpec.slides[1].content.title = 'Unrelated change';
  currentDeckSpec.slides[2].composition.variant = 'safer';
  const result = approveRepresentativeSample(request({ currentDeckSpec, currentContractVersion: 'pgq-wp4-v1' }));
  assert.deepEqual(result.sampleStates.map(({ slideId, status, reasonCodes }) => [slideId, status, reasonCodes]), [
    ['slide-01', 'preserved', []],
    ['slide-04', 'invalidated', ['composition_changed']],
  ]);

  const contentChanged = structuredClone(deckSpec);
  contentChanged.slides[0].content.title = 'Changed typical';
  const contentResult = approveRepresentativeSample(request({ currentDeckSpec: contentChanged, currentContractVersion: 'pgq-wp4-v1' }));
  assert.deepEqual(contentResult.sampleStates.map(({ status, reasonCodes }) => [status, reasonCodes]), [
    ['invalidated', ['content_changed']],
    ['preserved', []],
  ]);
});

test('style 或 contract version 變更使全部 sample 失效', () => {
  const styled = structuredClone(deckSpec);
  styled.style.density = 'high';
  const styleResult = approveRepresentativeSample(request({ currentDeckSpec: styled, currentContractVersion: 'pgq-wp4-v1' }));
  assert.ok(styleResult.sampleStates.every(({ status, reasonCodes }) => status === 'invalidated' && reasonCodes.includes('style_changed')));
  const contractResult = approveRepresentativeSample(request({ currentDeckSpec: deckSpec, currentContractVersion: 'pgq-wp4-v2' }));
  assert.ok(contractResult.sampleStates.every(({ reasonCodes }) => reasonCodes.includes('contract_version_changed')));
});

test('installed approve-sample CLI 與 direct pure contract parity', async () => {
  const root = await mkdtemp(join(tmpdir(), 'pptskill-pgq-wp4-s3-'));
  const archive = join(root, 'PPTSKILL.zip');
  await buildDistribution({ archivePath: archive });
  const extracted = join(root, 'extract');
  await run('/usr/bin/unzip', ['-q', archive, '-d', extracted]);
  const installRoot = join(root, 'user', '.pptskill', 'runtime');
  await run(process.execPath, [join(extracted, 'PPTSKILL', 'install.mjs'), '--install-root', installRoot]);
  const requestPath = join(root, 'approval-request.json');
  await writeFile(requestPath, JSON.stringify(request()));
  const cli = join(installRoot, 'core', 'runtime', 'workflow-cli.mjs');
  const installed = JSON.parse((await run(process.execPath, [cli, 'approve-sample', '--request', requestPath])).stdout);
  assert.equal(installed.mode, 'representative-sample-approval');
  const { mode, ...decision } = installed;
  assert.deepEqual(decision, approveRepresentativeSample(request()));
  for (const adapter of ['.codex', '.claude', '.gemini']) {
    assert.match(await readFile(join(root, 'user', adapter, 'skills', 'pptskill', 'SKILL.md'), 'utf8'), /approve-sample/);
  }
  await assert.rejects(access(join(root, 'user', '.pptskill', 'profile.json')));
});
