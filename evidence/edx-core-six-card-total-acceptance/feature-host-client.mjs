import assert from 'node:assert/strict';
import { spawn, execFileSync } from 'node:child_process';
import { createWriteStream } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const repo = resolve(import.meta.dirname, '../..');
const output = resolve(process.argv[2] || '');
assert.equal(resolve(output, '..'), resolve(repo, 'evidence/edx-core-six-card-total-acceptance'));
assert.match(output.split('/').at(-1), /^feature-host-\d{2}$/);
assert.equal(process.env.AI_CORE_TMP_ARTIFACT_ACTIVE, '1');
const root = process.env.TMP_ARTIFACT_ROOT;
const portFile = process.env.TMP_SESSION_DEVTOOLS_ACTIVE_PORT;
assert.ok(root?.startsWith('/'));
assert.equal(portFile, resolve(root, 'profile/DevToolsActivePort'));
const session = JSON.parse(await readFile(resolve(root, 'evidence/session.json'), 'utf8'));
const pgid = Number(execFileSync('/bin/ps', ['-o', 'pgid=', '-p', String(process.pid)], { encoding: 'utf8' }).trim());
assert.equal(session.mode, 'browser');
assert.equal(session.root, root);
assert.equal(session.pid, pgid);
await mkdir(output, { recursive: true });

const receipt = { status: 'NOT_PASS', pid: process.pid, pgid, root, commands: {}, errors: [] };
const save = () => writeFile(resolve(output, 'client-receipt.json'), `${JSON.stringify(receipt, null, 2)}\n`);
const run = async (name, args) => {
  const log = resolve(output, `${name}.log`), stream = createWriteStream(log, { flags: 'wx' });
  await new Promise((done, fail) => {
    stream.once('open', done);
    stream.once('error', fail);
  });
  const child = spawn(process.execPath, args, {
    cwd: repo,
    env: { ...process.env, PPTSKILL_DEVTOOLS_ACTIVE_PORT: portFile },
    stdio: ['ignore', stream, stream],
  });
  receipt.commands[name] = { args, pid: child.pid, log };
  await save();
  const code = await new Promise((done, fail) => {
    child.once('error', fail);
    child.once('exit', (exit, signal) => done(signal ? -1 : exit));
  });
  await new Promise(done => stream.end(done));
  receipt.commands[name].exit = code;
  const accepted = JSON.parse(await readFile(resolve(output, name, 'acceptance.json'), 'utf8'));
  receipt.commands[name].acceptance = accepted.status;
  receipt.commands[name].viewports = accepted.runs.map(run => ({
    ...(run.viewport || { width: run.width, height: run.height }), status: run.status, targetClosed: run.targetClosed,
  }));
  await save();
  if (code !== 0 || accepted.status !== 'pass' || accepted.runs.length !== 2
    || receipt.commands[name].viewports.map(run => `${run.width}x${run.height}`).sort().join(',') !== '1280x720,1600x900'
    || accepted.runs.some(run => run.status !== 'pass' || run.targetClosed !== true)) {
    throw new Error(`${name} browser acceptance NOT_PASS`);
  }
};

let endpoint;
try {
  for (let attempt = 0; attempt < 250; attempt++) {
    try {
      const [portText, path] = (await readFile(portFile, 'utf8')).trim().split('\n');
      if (Number(portText) > 0 && path?.startsWith('/')) {
        endpoint = `ws://127.0.0.1:${portText}${path}`;
        break;
      }
    } catch {}
    await new Promise(done => setTimeout(done, 100));
  }
  assert.ok(endpoint, '受管 Chrome 25 秒內未就緒');
  const featureCases = [
    ['core1-crop', 'tools/edx-wp1-s4-browser-acceptance.mjs', '--crop-regression'],
    ['core2-group-lock', 'tools/edx-wp1-s4-browser-acceptance.mjs', '--group-lock-regression'],
    ['core3-undo-redo', 'tools/edx-wp1-s4-browser-acceptance.mjs', '--undo-redo-regression'],
    ['core4-local-draft', 'tools/edx-core-4-local-draft-browser-acceptance.mjs'],
    ['core5-reset-recompose', 'tools/edx-core-5-reset-recompose-browser-acceptance.mjs'],
  ];
  for (const [name, script, ...flags] of featureCases) {
    if (process.argv.includes('--core1-only') && name !== 'core1-crop') continue;
    if (process.argv.includes('--remaining') && name === 'core1-crop') continue;
    await run(name, [script, resolve(output, name), ...flags]);
  }
  receipt.status = 'PASS';
} catch (error) {
  receipt.errors.push({ name: error.name, message: error.message, stack: error.stack });
} finally {
  if (endpoint) {
    try {
      const ws = new WebSocket(endpoint);
      await new Promise((done, fail) => {
        const timer = setTimeout(() => fail(new Error('Browser.close 逾時')), 8000);
        ws.addEventListener('open', () => ws.send(JSON.stringify({ id: 1, method: 'Browser.close' })), { once: true });
        ws.addEventListener('message', ({ data }) => {
          const response = JSON.parse(data);
          if (response.id !== 1) return;
          clearTimeout(timer);
          if (response.error) fail(new Error(response.error.message));
          else done();
        });
        ws.addEventListener('error', () => fail(new Error('Browser.close WebSocket 失敗')), { once: true });
      });
      receipt.browserClose = 'PASS';
      ws.close();
    } catch (error) {
      receipt.browserClose = 'FAIL';
      receipt.errors.push({ name: error.name, message: error.message });
      receipt.status = 'NOT_PASS';
    }
  }
  await save();
}
console.log(JSON.stringify({ status: receipt.status, browserClose: receipt.browserClose, receipt: resolve(output, 'client-receipt.json') }));
process.exitCode = receipt.status === 'PASS' && receipt.browserClose === 'PASS' ? 0 : 2;
