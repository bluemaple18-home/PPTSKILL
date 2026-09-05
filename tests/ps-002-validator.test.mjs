import assert from 'node:assert/strict';
import { mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { execFile as execFileCallback } from 'node:child_process';
import { promisify } from 'node:util';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { basename, join, resolve } from 'node:path';
import test from 'node:test';
import { probeCapabilities } from '../runtime/capability-probe.js';
import { validateSample } from '../tools/validate-sample.mjs';

const deckPath = new URL('../fixtures/deck.html', import.meta.url);
const evidencePath = new URL('../fixtures/render-evidence.json', import.meta.url);
const execFile = promisify(execFileCallback);
const packageRoot = fileURLToPath(new URL('../', import.meta.url));
const workspaceRoot = resolve(packageRoot, '..');
const packageDirectory = basename(resolve(packageRoot));
const cliPath = join(packageRoot, 'tools/validate-sample.mjs');

const loadEvidence = async () => JSON.parse(await readFile(evidencePath, 'utf8'));

test('capability probe 僅以可重播證據回報 true、false 或 unknown', async () => {
  const capabilities = await probeCapabilities({
    deckPath,
    browserReceiptPath: new URL('../evidence/ps-001/browser-acceptance.json', import.meta.url),
  });
  assert.deepEqual(Object.values(capabilities).map((item) => item.status), ['true', 'true', 'true', 'true']);

  const unknown = await probeCapabilities({ deckPath, browserReceiptPath: new URL('../evidence/missing.json', import.meta.url) });
  assert.equal(unknown.canRender.status, 'unknown');
  assert.equal(unknown.canScreenshot.status, 'unknown');
  assert.equal(unknown.canSave.status, 'unknown');
});

test('validator 對 capability false 或 unknown 回傳 blocked', async () => {
  const falseCapability = await loadEvidence();
  falseCapability.capabilityProbe.canRead.status = 'false';
  assert.equal((await validateSample({ deckPath, evidence: falseCapability })).status, 'blocked');

  const unknownCapability = await loadEvidence();
  unknownCapability.capabilityProbe.canScreenshot.status = 'unknown';
  assert.equal((await validateSample({ deckPath, evidence: unknownCapability })).status, 'blocked');
});

test('validator 以 PS-001 browser receipt 驗證完整三模式 smoke', async () => {
  const result = await validateSample({ deckPath, evidence: await loadEvidence() });
  assert.equal(result.status, 'pass');
});

test('CLI 依目前工作目錄解析相對 deck 與 evidence 路徑', async () => {
  const packageRun = await execFile(process.execPath, [cliPath, '--deck', 'fixtures/deck.html', '--evidence', 'fixtures/render-evidence.json'], { cwd: packageRoot });
  assert.match(packageRun.stdout, /"status":"pass"/);

  const workspaceRun = await execFile(process.execPath, [cliPath, '--deck', `${packageDirectory}/fixtures/deck.html`, '--evidence', `${packageDirectory}/fixtures/render-evidence.json`], { cwd: workspaceRoot });
  assert.match(workspaceRun.stdout, /"status":"pass"/);
});

test('validator 對 fail receipt fail-loud，對 blocked receipt 保留 blocked', async () => {
  const failed = await loadEvidence();
  failed.receipt.status = 'fail';
  assert.equal((await validateSample({ deckPath, evidence: failed })).status, 'fail');

  const blocked = await loadEvidence();
  blocked.receipt.status = 'blocked';
  assert.equal((await validateSample({ deckPath, evidence: blocked })).status, 'blocked');
});

test('同一問題第三次修復停止，且失敗驗證不覆寫最後成功 evidence', async () => {
  const evidence = await loadEvidence();
  evidence.receipt.repairAttempts = 3;
  const result = await validateSample({ deckPath, evidence });
  assert.equal(result.status, 'blocked');
  assert.match(result.humanAction, /人類/);

  const directory = await mkdtemp(join(tmpdir(), 'ps-002-'));
  const lastSuccessPath = join(directory, 'last-success.json');
  await writeFile(lastSuccessPath, '{"status":"pass"}\n');
  const before = await readFile(lastSuccessPath, 'utf8');
  await validateSample({ deckPath, evidence, lastSuccessPath });
  assert.equal(await readFile(lastSuccessPath, 'utf8'), before);
});
