import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { mkdtemp, readFile, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { promisify } from 'node:util';
import test from 'node:test';

const run = promisify(execFile);
for (const flags of [[], ['--perf-regression'], ['--motion-regression'], ['--keyboard-regression'], ['--snap-regression'], ['--selection-regression'], ['--alignment-regression'], ['--distribution-regression'], ['--equal-gap-regression'], ['--direct-text-regression']]) test('S4 managed attach ' + flags.join(' ') + ' 只建／關 owned target，navigation 失敗仍清理且不 spawn', async () => {
  const dir = await mkdtemp(resolve(tmpdir(), 's3-attach-probe-'));
  try {
    const port = resolve(dir, 'DevToolsActivePort'), log = resolve(dir, 'log.jsonl');
    await writeFile(port, '12345\n/devtools/browser/foreign-browser\n');
    await assert.rejects(run(process.execPath, ['--import', resolve('tests/helpers/edx-wp1-s3-managed-browser-probe.mjs'), 'tools/edx-wp1-s4-browser-acceptance.mjs', resolve(dir, 'browser'), ...flags], {
      env: { ...process.env, PPTSKILL_DEVTOOLS_ACTIVE_PORT: port, S3_PROBE_LOG: log }, timeout: 15000,
    }), error => error.code === 1);
    const receipt = JSON.parse(await readFile(resolve(dir, 'browser/acceptance.json'), 'utf8'));
    assert.match(receipt.error, /S3_PROBE_NAVIGATION_FAILURE/);
    assert.equal(receipt.runs[0].targetClosed, true);
    const events = (await readFile(log, 'utf8')).trim().split('\n').map(JSON.parse);
    assert.ok(events.some(e => e.fetch?.endsWith('/json/new?about:blank') && e.method === 'PUT'));
    assert.ok(events.some(e => e.fetch?.endsWith('/json/close/s3-owned-target')));
    assert.ok(events.some(e => e.closedSocket));
    assert.ok(!events.some(e => e.forbidden));
    assert.ok(events.findIndex(e => e.method === 'Network.enable') < events.findIndex(e => e.method === 'Page.navigate'));
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('S4 focused browser script 缺 managed port 明確拒絕，不 fallback spawn', async () => {
  const env = { ...process.env }; delete env.PPTSKILL_DEVTOOLS_ACTIVE_PORT;
  await assert.rejects(run(process.execPath, ['tools/edx-wp1-s4-browser-acceptance.mjs'], { env, timeout: 5000 }), error => /必須提供 PPTSKILL_DEVTOOLS_ACTIVE_PORT/.test(error.stderr));
});
