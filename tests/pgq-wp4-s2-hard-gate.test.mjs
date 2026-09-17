import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import test from 'node:test';
import { mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';
import { evaluateRepresentativeQa } from '../runtime/representative-qa-gate.js';
import { buildDistribution } from '../tools/build-distribution.mjs';

const run = promisify(execFile);
const codes = ['content_integrity', 'geometry', 'static_readability', 'animation_interference'];
const sample = {
  version: 1,
  slideIds: ['typical', 'stress'],
  entries: [
    { slideId: 'typical', role: 'typical', reasonCodes: ['main_narrative_role'] },
    { slideId: 'stress', role: 'stress', reasonCodes: ['high_density'] },
  ],
  requiresApprovalBeforeRemaining: true,
  fullDeckQaRequired: true,
};
const checks = (overrides = {}) => sample.slideIds.flatMap((slideId) => codes.map((code) => ({
  slideId,
  code,
  status: overrides[`${slideId}:${code}`] ?? 'pass',
  evidenceRef: `evidence/${slideId}-${code}.json`,
})));
const request = (overrides = {}) => ({ sample, checks: checks(), repairHistory: [], lastSuccessfulEvidence: 'evidence/last-pass.json', ...overrides });

test('完整 hard evidence 才 PASS，且 sample PASS 不解除 full-deck QA', () => {
  const result = evaluateRepresentativeQa(request());
  assert.equal(result.status, 'pass');
  assert.deepEqual(result.issues, []);
  assert.equal(result.fullDeckQaRequired, true);
  assert.equal(result.preservedLastSuccess, 'evidence/last-pass.json');
});

test('NOT_RUN/UNKNOWN blocked 且不消耗 repair budget', () => {
  const result = evaluateRepresentativeQa(request({ checks: checks({ 'stress:geometry': 'not_run' }) }));
  assert.equal(result.status, 'blocked');
  assert.deepEqual(result.issues.map(({ issueId, status }) => [issueId, status]), [['stress:geometry', 'not_run']]);
  assert.deepEqual(result.nextActions, []);
  assert.equal(result.issues[0].attemptsUsed, 0);
});

test('同一 issue 只允許兩次 bounded repair，第三次前 blocked', () => {
  const failing = checks({ 'stress:geometry': 'fail' });
  const first = evaluateRepresentativeQa(request({ checks: failing }));
  assert.equal(first.status, 'repair');
  assert.deepEqual(first.nextActions[0], {
    issueId: 'stress:geometry', slideId: 'stress', code: 'geometry', action: 'safer-composition', attempt: 1,
  });

  const once = [{ slideId: 'stress', code: 'geometry', action: 'safer-composition', result: 'failed' }];
  const second = evaluateRepresentativeQa(request({ checks: failing, repairHistory: once }));
  assert.equal(second.status, 'repair');
  assert.equal(second.nextActions[0].action, 'split-slide');
  assert.equal(second.nextActions[0].attempt, 2);

  const twice = [...once, { slideId: 'stress', code: 'geometry', action: 'split-slide', result: 'failed' }];
  const stopped = evaluateRepresentativeQa(request({ checks: failing, repairHistory: twice }));
  assert.equal(stopped.status, 'blocked');
  assert.equal(stopped.issues[0].attemptsUsed, 2);
  assert.match(stopped.humanAction, /人類/);
});

test('coverage、allowlist 與 history spoof fail loud', () => {
  assert.throws(() => evaluateRepresentativeQa(request({ checks: checks().slice(1) })), /完整覆蓋/);
  assert.throws(() => evaluateRepresentativeQa(request({ checks: [...checks(), checks()[0]] })), /重複/);
  assert.throws(() => evaluateRepresentativeQa(request({ checks: [...checks(), { slideId: 'outside', code: 'geometry', status: 'pass', evidenceRef: 'x' }] })), /sample/);
  assert.throws(() => evaluateRepresentativeQa(request({ checks: checks().map((item, index) => index ? item : { ...item, verdict: 'pass' }) })), /不允許欄位/);
  assert.throws(() => evaluateRepresentativeQa(request({ repairHistory: [{ slideId: 'stress', code: 'geometry', action: 'shrink-font', result: 'failed' }] })), /action/);
});

test('installed qa-sample CLI 與 direct pure gate parity', async () => {
  const root = await mkdtemp(join(tmpdir(), 'pptskill-pgq-wp4-s2-'));
  const archive = join(root, 'PPTSKILL.zip');
  await buildDistribution({ archivePath: archive });
  const extracted = join(root, 'extract');
  await run('/usr/bin/unzip', ['-q', archive, '-d', extracted]);
  const bundle = join(extracted, 'PPTSKILL');
  const installRoot = join(root, 'user', '.pptskill', 'runtime');
  await run(process.execPath, [join(bundle, 'install.mjs'), '--install-root', installRoot]);
  const requestPath = join(root, 'qa-request.json');
  await writeFile(requestPath, JSON.stringify(request()));
  const cli = join(installRoot, 'core', 'runtime', 'workflow-cli.mjs');
  const installed = JSON.parse((await run(process.execPath, [cli, 'qa-sample', '--request', requestPath])).stdout);
  const { mode, ...decision } = installed;
  assert.equal(mode, 'representative-hard-gate');
  assert.deepEqual(decision, evaluateRepresentativeQa(request()));

  await writeFile(requestPath, JSON.stringify(request({ checks: checks({ 'stress:geometry': 'not_run' }) })));
  await assert.rejects(run(process.execPath, [cli, 'qa-sample', '--request', requestPath]), (error) => {
    assert.equal(error.code, 2);
    assert.equal(JSON.parse(error.stdout).status, 'blocked');
    return true;
  });

  await writeFile(requestPath, JSON.stringify(request({ checks: checks({ 'stress:geometry': 'fail' }) })));
  await assert.rejects(run(process.execPath, [cli, 'qa-sample', '--request', requestPath]), (error) => {
    assert.equal(error.code, 3);
    assert.equal(JSON.parse(error.stdout).status, 'repair');
    return true;
  });
});
