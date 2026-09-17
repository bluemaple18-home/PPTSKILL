import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import test from 'node:test';
import { access, mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import { approveRepresentativeSample } from '../runtime/sample-approval.js';
import { collectRepresentativeQaEvidence } from '../runtime/representative-qa-evidence.js';
import { createRepresentativeSampleIdentity } from '../runtime/representative-sample-identity.js';
import { buildDistribution } from '../tools/build-distribution.mjs';

const run = promisify(execFile);
const rootPath = dirname(fileURLToPath(import.meta.url));
const artifactPath = join(rootPath, '..', 'fixtures', 'full-deck.html');
const deckSpec = JSON.parse(await readFile(join(rootPath, '..', 'fixtures', 'full-deck-spec.json'), 'utf8'));
const typicalId = deckSpec.slides[1].id;
const stressId = deckSpec.slides[3].id;
const sample = {
  version: 1,
  slideIds: [typicalId, stressId],
  entries: [
    { slideId: typicalId, role: 'typical', reasonCodes: ['main_narrative_role'] },
    { slideId: stressId, role: 'stress', reasonCodes: ['high_density'] },
  ],
  requiresApprovalBeforeRemaining: true,
  fullDeckQaRequired: true,
};
const contractVersion = 'pgq-wp4-v1';
const qaEvidence = await collectRepresentativeQaEvidence({ artifactPath, sample, contractVersion });
const remainingIds = deckSpec.slides.map(({ id }) => id).filter((id) => !sample.slideIds.includes(id));
const tamperVisibleTitle = (source) => {
  const slide = deckSpec.slides.find(({ id }) => id === typicalId);
  const markerIndex = source.indexOf(`data-edit-target="slides.${slide.id}.content.title"`);
  const titleIndex = source.indexOf(`>${slide.content.title}<`, markerIndex);
  if (markerIndex < 0 || titleIndex < 0) throw new Error('fixture 缺少 sample title target。');
  return `${source.slice(0, titleIndex + 1)}錯誤但可見的標題${source.slice(titleIndex + slide.content.title.length + 1)}`;
};
const request = (overrides = {}) => ({
  sample,
  qaEvidence,
  deckSpec,
  approval: { approved: true, approvedBy: 'human', evidenceRef: 'evidence/human-approval.json' },
  feedback: [],
  contractVersion,
  ...overrides,
});
const cliRequest = (overrides = {}) => {
  const { qaEvidence: ignored, ...value } = request(overrides);
  return value;
};

test('trusted producer PASS 與 human approval 建立 deterministic immutable freeze', () => {
  const input = request();
  const first = approveRepresentativeSample(input);
  const second = approveRepresentativeSample(input);
  assert.match(qaEvidence.validatedIdentity.identityFingerprint, /^[a-f0-9]{64}$/);
  assert.deepEqual(first, second);
  assert.equal(first.status, 'pass');
  assert.equal(first.freeze.sample.length, 2);
  assert.match(first.freeze.styleFingerprint, /^[a-f0-9]{64}$/);
  assert.equal(first.fullDeckQaRequired, true);
  first.freeze.sample[0].contentFingerprint = 'mutated';
  assert.notEqual(second.freeze.sample[0].contentFingerprint, 'mutated');
});

test('caller-authored evidence、非 human approval、sample 不一致與缺頁 fail loud', () => {
  const forged = JSON.parse(JSON.stringify(qaEvidence));
  assert.throws(() => approveRepresentativeSample(request({ qaEvidence: forged })), /trusted browser producer|caller/u);
  assert.throws(() => approveRepresentativeSample(request({ approval: { approved: true, approvedBy: 'ai', evidenceRef: 'x' } })), /human/u);
  assert.throws(() => approveRepresentativeSample(request({ sample: { ...sample, slideIds: [typicalId] } })), /sample/u);
  assert.throws(() => approveRepresentativeSample(request({ deckSpec: { ...deckSpec, slides: deckSpec.slides.filter(({ id }) => id !== stressId) } })), new RegExp(stressId, 'u'));
  assert.throws(() => approveRepresentativeSample(request({ deckSpec: { ...deckSpec, slides: [...deckSpec.slides, { ...deckSpec.slides[0] }] } })), /IDs.*唯一/u);
});

test('舊 evidence 不得以重算 fingerprint 或改寫 PASS 核准新狀態', () => {
  const changedContent = structuredClone(deckSpec);
  changedContent.slides.find(({ id }) => id === typicalId).content.title = 'Changed after producer run';
  assert.throws(() => approveRepresentativeSample(request({ deckSpec: changedContent })), /hard-gate.*identity|identity.*hard-gate/iu);

  const changedComposition = structuredClone(deckSpec);
  changedComposition.slides.find(({ id }) => id === stressId).composition.variant = 'changed-after-producer-run';
  assert.throws(() => approveRepresentativeSample(request({ deckSpec: changedComposition })), /hard-gate.*identity|identity.*hard-gate/iu);

  const changedStyle = structuredClone(deckSpec);
  changedStyle.style.density = 'high';
  assert.throws(() => approveRepresentativeSample(request({ deckSpec: changedStyle })), /hard-gate.*identity|identity.*hard-gate/iu);
  assert.throws(() => approveRepresentativeSample(request({ contractVersion: 'pgq-wp4-v2' })), /hard-gate.*identity|identity.*hard-gate/iu);

  const forged = JSON.parse(JSON.stringify(qaEvidence));
  forged.validatedIdentity = createRepresentativeSampleIdentity({ sample, deckSpec: changedContent, contractVersion });
  forged.checks = forged.checks.map((check) => ({ ...check, status: 'pass', identityFingerprint: forged.validatedIdentity.identityFingerprint }));
  assert.throws(() => approveRepresentativeSample(request({ deckSpec: changedContent, qaEvidence: forged })), /trusted browser producer|caller/u);
});

test('scope planner 僅接受 bounded feedback，profile 必須明示 opt-in', () => {
  const result = approveRepresentativeSample(request({ feedback: [
    { scope: 'slide-local', code: 'adjust-composition', targetSlideId: stressId },
    { scope: 'deck-wide', code: 'adjust-style-density' },
    { scope: 'profile-opt-in', code: 'remember-density-preference', remember: true },
  ] }));
  assert.deepEqual(result.feedbackPlan.map(({ scope, targetSlideIds }) => [scope, targetSlideIds]), [
    ['slide-local', [stressId]],
    ['deck-wide', remainingIds],
    ['profile-opt-in', []],
  ]);
  assert.equal(result.profileWriteRequired, true);
  assert.equal(result.sampleStates.find(({ slideId }) => slideId === stressId).status, 'invalidated');
  assert.throws(() => approveRepresentativeSample(request({ feedback: [{ scope: 'profile-opt-in', code: 'remember-density-preference' }] })), /remember/u);
  assert.throws(() => approveRepresentativeSample(request({ feedback: [{ scope: 'deck-wide', code: 'raw prompt' }] })), /code|allowlist/u);
});

test('sample content 或 composition 只使該頁失效', () => {
  const currentDeckSpec = structuredClone(deckSpec);
  currentDeckSpec.slides.find(({ id }) => !sample.slideIds.includes(id)).content.title = 'Unrelated change';
  currentDeckSpec.slides.find(({ id }) => id === stressId).composition.variant = 'safer';
  const result = approveRepresentativeSample(request({ currentDeckSpec, currentContractVersion: contractVersion }));
  assert.deepEqual(result.sampleStates.map(({ slideId, status, reasonCodes }) => [slideId, status, reasonCodes]), [
    [typicalId, 'preserved', []],
    [stressId, 'invalidated', ['composition_changed']],
  ]);

  const contentChanged = structuredClone(deckSpec);
  contentChanged.slides.find(({ id }) => id === typicalId).content.title = 'Changed typical';
  const contentResult = approveRepresentativeSample(request({ currentDeckSpec: contentChanged, currentContractVersion: contractVersion }));
  assert.deepEqual(contentResult.sampleStates.map(({ status, reasonCodes }) => [status, reasonCodes]), [
    ['invalidated', ['content_changed']],
    ['preserved', []],
  ]);
});

test('style 或 contract version 變更使全部 sample 失效', () => {
  const styled = structuredClone(deckSpec);
  styled.style.density = 'high';
  const styleResult = approveRepresentativeSample(request({ currentDeckSpec: styled, currentContractVersion: contractVersion }));
  assert.ok(styleResult.sampleStates.every(({ status, reasonCodes }) => status === 'invalidated' && reasonCodes.includes('style_changed')));
  const contractResult = approveRepresentativeSample(request({ currentDeckSpec: deckSpec, currentContractVersion: 'pgq-wp4-v2' }));
  assert.ok(contractResult.sampleStates.every(({ reasonCodes }) => reasonCodes.includes('contract_version_changed')));
});

test('installed approve-sample CLI 自行執行 producer，拒絕 caller hard gate', async () => {
  const root = await mkdtemp(join(tmpdir(), 'pptskill-pgq-wp4-s3-'));
  const archive = join(root, 'PPTSKILL.zip');
  await buildDistribution({ archivePath: archive });
  const extracted = join(root, 'extract');
  await run('/usr/bin/unzip', ['-q', archive, '-d', extracted]);
  const installRoot = join(root, 'user', '.pptskill', 'runtime');
  await run(process.execPath, [join(extracted, 'PPTSKILL', 'install.mjs'), '--install-root', installRoot]);
  const requestPath = join(root, 'approval-request.json');
  await writeFile(requestPath, JSON.stringify(cliRequest()));
  const cli = join(installRoot, 'core', 'runtime', 'workflow-cli.mjs');
  const installed = JSON.parse((await run(process.execPath, [cli, 'approve-sample', '--request', requestPath, '--artifact', artifactPath], { maxBuffer: 32 * 1024 * 1024 })).stdout);
  assert.equal(installed.mode, 'representative-sample-approval');
  const { mode, ...decision } = installed;
  assert.deepEqual(decision, approveRepresentativeSample(request()));

  const tamperedArtifact = join(root, 'tampered-visible-content.html');
  await writeFile(tamperedArtifact, tamperVisibleTitle(await readFile(artifactPath, 'utf8')));
  await assert.rejects(run(process.execPath, [cli, 'approve-sample', '--request', requestPath, '--artifact', tamperedArtifact], { maxBuffer: 32 * 1024 * 1024 }), (error) => {
    assert.equal(error.code, 1);
    assert.match(error.stderr, /hard gate.*PASS|hard gate.*pass/iu);
    return true;
  });

  const forgedRequest = { ...cliRequest(), hardGateRequest: { status: 'pass', checks: [] } };
  await writeFile(requestPath, JSON.stringify(forgedRequest));
  await assert.rejects(run(process.execPath, [cli, 'approve-sample', '--request', requestPath, '--artifact', artifactPath]), (error) => {
    assert.equal(error.code, 1);
    assert.match(error.stderr, /caller-authored/u);
    return true;
  });

  const staleRequest = cliRequest({ deckSpec: structuredClone(deckSpec) });
  staleRequest.deckSpec.slides.find(({ id }) => id === typicalId).content.title = 'Changed after producer run';
  await writeFile(requestPath, JSON.stringify(staleRequest));
  await assert.rejects(run(process.execPath, [cli, 'approve-sample', '--request', requestPath, '--artifact', artifactPath], { maxBuffer: 32 * 1024 * 1024 }), (error) => {
    assert.equal(error.code, 1);
    assert.match(error.stderr, /hard-gate.*identity|identity.*hard-gate/iu);
    return true;
  });
  for (const adapter of ['.codex', '.claude', '.gemini']) {
    assert.match(await readFile(join(root, 'user', adapter, 'skills', 'pptskill', 'SKILL.md'), 'utf8'), /approve-sample/);
  }
  await assert.rejects(access(join(root, 'user', '.pptskill', 'profile.json')));
});
