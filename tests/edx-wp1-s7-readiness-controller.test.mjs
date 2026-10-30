import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { performance } from 'node:perf_hooks';
import { parsePortFile, waitForPortFile } from '../evidence/edx-wp1-s7/webgpt-verification/readiness-controller.mjs';
const valid = '49613\n/devtools/browser/11744ea9-31ad-43fb-823e-92fd50454cad';
for (const [name, text, expected] of [
  ['無末尾換行', valid, true], ['有末尾換行', valid + '\n', true], ['CRLF', valid.replace('\n', '\r\n'), true],
  ['空檔', '', false], ['只有port', '49613\n', false], ['port超界', valid.replace('49613', '99999'), false],
  ['port零', valid.replace('49613', '0'), false], ['endpoint空', '49613\n/devtools/browser/', false],
  ['endpoint錯誤', '49613\n/wrong/path', false], ['額外非空行', valid + '\nextra', false],
]) test(`logical-line：${name}`, () => assert.equal(Boolean(parsePortFile(text)), expected));

function fixture(read, alive = () => true) {
  let clock = 0; const sleeps = [];
  const options = { timeoutMs: 120, intervalMs: 50, now: () => clock,
    read: async () => read(ms => { clock += ms; }, clock),
    sleep: async ms => { sleeps.push(ms); clock += ms; } };
  return { run: () => waitForPortFile('owned-fixture', alive, options), elapsed: () => clock, sleeps };
}
test('慢讀取耗時計入deadline，sleep僅用剩餘budget', async () => {
  const f = fixture(tick => { tick(40); return ''; });
  const r = await f.run(); assert.equal(r.exitCode, 28); assert.equal(r.polls, 2);
  assert.equal(f.elapsed(), 130); assert.deepEqual(f.sleeps, [50]); // 第二次讀取跨deadline，沒有再加sleep。
});
test('剩餘時間小於interval時縮短sleep', async () => {
  const f = fixture(tick => { tick(20); return ''; });
  assert.equal((await f.run()).exitCode, 28); assert.equal(f.elapsed(), 120); assert.deepEqual(f.sleeps, [50, 30]);
});
test('deadline後才完成的有效檔案不能回ready', async () => {
  const f = fixture(tick => { tick(121); return valid; });
  assert.equal((await f.run()).exitCode, 28); assert.equal(f.sleeps.length, 0);
});
test('延遲補第二行且無final newline可以ready', async () => {
  const f = fixture((tick, time) => time >= 50 ? valid : '49613\n');
  const r = await f.run(); assert.equal(r.exitCode, 0); assert.equal(r.port, 49613); assert.equal(r.polls, 2);
});
test('supervisor先退出不讀檔，exit27', async () => {
  const f = fixture(() => { throw new Error('不應讀取'); }, () => false);
  const r = await f.run(); assert.equal(r.exitCode, 27); assert.equal(r.polls, 0);
});
test('supervisor在讀取中退出，即使檔案有效仍exit27', async () => {
  let alive = true;
  const f = fixture(() => { alive = false; return valid; }, () => alive);
  assert.equal((await f.run()).exitCode, 27);
});
test('持續read error維持bounded timeout', async () => {
  const f = fixture(() => { throw Object.assign(new Error('missing'), { code: 'ENOENT' }); });
  const r = await f.run(); assert.equal(r.exitCode, 28); assert.equal(r.lastRead, 'ENOENT');
  assert.equal(f.elapsed(), 120); assert.deepEqual(f.sleeps, [50, 50, 20]);
});
test('真文字檔可直接使用，tmp於finally回收', async () => {
  const dir = await mkdtemp(join(tmpdir(), 's7-readiness-text-'));
  try { const path = join(dir, 'port'); await writeFile(path, valid);
    assert.equal((await waitForPortFile(path, () => true)).exitCode, 0);
  } finally { await rm(dir, { recursive: true }); }
});
test('永不完成的讀取在實際deadline被abort，沒有掛住controller', async () => {
  let signal; const start = performance.now();
  const r = await waitForPortFile('double', () => true, { timeoutMs: 30,
    read: async (_path, options) => { signal = options.signal; return new Promise(() => {}); } });
  assert.equal(r.exitCode, 28); assert.equal(signal.aborted, true);
  assert.ok(performance.now() - start < 1000);
});
