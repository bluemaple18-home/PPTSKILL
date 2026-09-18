import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import test from 'node:test';
import { mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import { evaluateFullDeckQa } from '../runtime/full-deck-qa.js';
import { collectFullDeckQaEvidence } from '../runtime/representative-qa-evidence.js';
import { buildDistribution } from '../tools/build-distribution.mjs';

const run = promisify(execFile);
const root = dirname(fileURLToPath(import.meta.url));
const artifactPath = join(root, '..', 'fixtures', 'full-deck.html');
const contractVersion = 'pgq-wp4-v1';
const evidence = await collectFullDeckQaEvidence({ artifactPath, contractVersion });
const slideIds = evidence.identity.slideIds;
const advisory = (overrides = {}) => ({
  code: 'structural_density', slideIds: [slideIds[1]], status: 'resolved',
  reason: '標題、主視覺與 supporting copy 的層級已由同一 viewport evidence 檢查。',
  evidenceRefs: [evidence.evidenceRefs.static_readability], ...overrides,
});
const confirmation = (overrides = {}) => ({
  confirmed: true, confirmedBy: 'human', identityFingerprint: evidence.identity.identityFingerprint,
  evidenceRef: 'owner-review-20260918', acceptedRiskCodes: [], ...overrides,
});
const advisoryReview = (findingCount = 1, overrides = {}) => ({
  completed: true, reviewedBy: 'ai', identityFingerprint: evidence.identity.identityFingerprint,
  evidenceRefs: [evidence.evidenceRefs.static_readability], findingCount, ...overrides,
});

test('trusted producer 完整覆蓋每張 canonical slide，sample shortcut 不存在', () => {
  const result = evaluateFullDeckQa({ evidence, advisoryReview: advisoryReview(), advisories: [advisory()], ownerConfirmation: confirmation() });
  assert.equal(result.status, 'pass');
  assert.deepEqual(result.layer1.coverage, slideIds);
  assert.equal(result.layer1.issues.length, 0);
  assert.equal(result.samplePassDoesNotImplyFullDeckPass, true);
});

test('Layer-2 不可省略；完成後沒有 Layer-3 confirmation 時只能 awaiting-owner', () => {
  assert.equal(evaluateFullDeckQa({ evidence, advisories: [] }).status, 'blocked');
  assert.equal(evaluateFullDeckQa({ evidence, advisoryReview: advisoryReview(), advisories: [advisory()] }).status, 'awaiting-owner');
});

test('stale Owner identity 與 caller forged evidence fail loud', () => {
  assert.throws(() => evaluateFullDeckQa({ evidence, advisoryReview: advisoryReview(0), ownerConfirmation: confirmation({ identityFingerprint: '0'.repeat(64) }) }), /identity.*失效/u);
  assert.throws(() => evaluateFullDeckQa({ evidence: structuredClone(evidence), ownerConfirmation: confirmation() }), /trusted browser producer/u);
});

test('Layer-2 必須是 allowlist、canonical slides 與 trusted evidence refs', () => {
  assert.throws(() => evaluateFullDeckQa({ evidence, advisoryReview: advisoryReview(), advisories: [advisory({ code: 'ai_pass_score' })] }), /allowlist/u);
  assert.throws(() => evaluateFullDeckQa({ evidence, advisories: [advisory({ slideIds: ['missing'] })] }), /canonical slides/u);
  assert.throws(() => evaluateFullDeckQa({ evidence, advisories: [advisory({ evidenceRefs: ['old-receipt'] })] }), /trusted evidence/u);
  assert.equal(evaluateFullDeckQa({ evidence, advisoryReview: advisoryReview(), advisories: [advisory({ status: 'unknown' })] }).status, 'blocked');
});

test('accepted-risk 必須由同 identity Owner 明示涵蓋；未解 advisory 只能 repair', () => {
  const risk = advisory({ status: 'accepted-risk' });
  assert.throws(() => evaluateFullDeckQa({ evidence, advisoryReview: advisoryReview(), advisories: [risk], ownerConfirmation: confirmation() }), /明示涵蓋/u);
  assert.equal(evaluateFullDeckQa({ evidence, advisoryReview: advisoryReview(), advisories: [risk], ownerConfirmation: confirmation({ acceptedRiskCodes: ['structural_density'] }) }).status, 'pass');
  assert.equal(evaluateFullDeckQa({ evidence, advisoryReview: advisoryReview(), advisories: [advisory({ status: 'advisory' })], ownerConfirmation: confirmation() }).status, 'repair');
});

test('單頁 content mismatch 只產生該頁 issue，並沿用兩次共用 repair budget', async () => {
  const source = await readFile(artifactPath, 'utf8');
  const marker = `data-edit-target="slides.${slideIds[1]}.content.title"`;
  const markerIndex = source.indexOf(marker);
  const titleStart = source.indexOf('>', markerIndex) + 1;
  const titleEnd = source.indexOf('<', titleStart);
  assert.ok(markerIndex >= 0 && titleStart > 0 && titleEnd > titleStart);
  const temporary = await mkdtemp(join(tmpdir(), 'pptskill-full-deck-mismatch-'));
  const artifact = join(temporary, 'tampered.html');
  await writeFile(artifact, `${source.slice(0, titleStart)}錯誤但可見的標題${source.slice(titleEnd)}`);
  const tamperedEvidence = await collectFullDeckQaEvidence({ artifactPath: artifact, contractVersion });
  const first = evaluateFullDeckQa({ evidence: tamperedEvidence });
  assert.equal(first.status, 'repair');
  assert.deepEqual(first.layer1.issues.map(({ slideId, code }) => [slideId, code]), [[slideIds[1], 'content_integrity']]);
  const repairHistory = [
    { slideId: slideIds[1], code: 'content_integrity', action: 'restore-approved-content', result: 'failed' },
    { slideId: slideIds[1], code: 'content_integrity', action: 'request-human-content-reconciliation', result: 'failed' },
  ];
  assert.equal(evaluateFullDeckQa({ evidence: tamperedEvidence, repairHistory }).status, 'blocked');
});

test('installed qa-full-deck 先輸出 identity，再以同 identity 完成 Layer-3', async () => {
  const temporary = await mkdtemp(join(tmpdir(), 'pptskill-pgq-wp4-s4-'));
  const archive = join(temporary, 'PPTSKILL.zip');
  await buildDistribution({ archivePath: archive });
  const extracted = join(temporary, 'extract');
  await run('/usr/bin/unzip', ['-q', archive, '-d', extracted]);
  const installRoot = join(temporary, 'user', '.pptskill', 'runtime');
  await run(process.execPath, [join(extracted, 'PPTSKILL', 'install.mjs'), '--install-root', installRoot]);
  const cli = join(installRoot, 'core', 'runtime', 'workflow-cli.mjs');
  const requestPath = join(temporary, 'request.json');
  await writeFile(requestPath, JSON.stringify({ contractVersion, advisories: [] }));
  let first;
  try {
    await run(process.execPath, [cli, 'qa-full-deck', '--request', requestPath, '--artifact', artifactPath], { maxBuffer: 32 * 1024 * 1024 });
    assert.fail('qa-full-deck 應等待 Owner。');
  } catch (error) {
    assert.equal(error.code, 2);
    first = JSON.parse(error.stdout);
  }
  await writeFile(requestPath, JSON.stringify({ contractVersion, advisories: [], advisoryReview: {
    completed: true, reviewedBy: 'ai', identityFingerprint: first.identity.identityFingerprint,
    evidenceRefs: [first.layer1.evidenceRefs.static_readability], findingCount: 0,
  }, ownerConfirmation: {
    confirmed: true, confirmedBy: 'human', identityFingerprint: first.identity.identityFingerprint,
    evidenceRef: 'installed-owner-review', acceptedRiskCodes: [],
  } }));
  const installed = JSON.parse((await run(process.execPath, [cli, 'qa-full-deck', '--request', requestPath, '--artifact', artifactPath], { maxBuffer: 32 * 1024 * 1024 })).stdout);
  assert.equal(installed.status, 'pass');
  assert.deepEqual(installed.layer1.coverage, slideIds);
  await writeFile(requestPath, JSON.stringify({ contractVersion, status: 'pass', coverage: slideIds }));
  await assert.rejects(run(process.execPath, [cli, 'qa-full-deck', '--request', requestPath, '--artifact', artifactPath]), /caller-authored/u);
  assert.match(await readFile(join(installRoot, 'core', 'runtime', 'full-deck-qa.js'), 'utf8'), /samplePassDoesNotImplyFullDeckPass/);
});
