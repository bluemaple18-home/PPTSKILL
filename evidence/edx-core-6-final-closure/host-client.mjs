import assert from 'node:assert/strict';
import { spawn, execFileSync } from 'node:child_process';
import { createWriteStream } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const repo = resolve(import.meta.dirname, '../..');
const output = resolve(process.argv[2] || '');
assert.equal(resolve(output, '..'), resolve(repo, 'evidence/edx-core-6-final-closure'));
assert.match(output.split('/').at(-1), /^host-acceptance-\d{2}$/);
assert.equal(process.env.AI_CORE_TMP_ARTIFACT_ACTIVE, '1');
const root = process.env.TMP_ARTIFACT_ROOT;
assert.ok(root?.startsWith('/'));
const portFile = process.env.TMP_SESSION_DEVTOOLS_ACTIVE_PORT;
assert.equal(portFile, resolve(root, 'profile/DevToolsActivePort'));
const session = JSON.parse(await readFile(resolve(root, 'evidence/session.json'), 'utf8'));
const pgid = Number(execFileSync('/bin/ps', ['-o', 'pgid=', '-p', String(process.pid)], { encoding: 'utf8' }).trim());
assert.equal(session.mode, 'browser');
assert.equal(session.root, root);
assert.equal(session.pid, pgid);
await mkdir(output, { recursive: true });

const receipt = { status: 'NOT_PASS', pid: process.pid, pgid, root, commands: {}, errors: [] };
const save = () => writeFile(resolve(output, 'client-receipt.json'), `${JSON.stringify(receipt, null, 2)}\n`);
const node = process.execPath;
const run = async (name, args) => {
  const log = resolve(output, `${name}.log`), stream = createWriteStream(log, { flags: 'wx' });
  await new Promise((done, fail) => {
    stream.once('open', done);
    stream.once('error', fail);
  });
  const child = spawn(node, args, {
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
  await save();
  if (code !== 0) throw new Error(`${name} exit ${code}`);
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
  await run('browser-geometry', [
    'tools/browser-geometry-qa.mjs', 'fixtures/full-deck.html', '--motion', 'static',
    '--output', resolve(output, 'browser-geometry.json'),
    '--editor-export', resolve(output, 'editor-export.html'),
    '--screenshot', resolve(output, '1280-full-deck.png'),
    '--montage', resolve(output, '1280-montage.png'),
  ]);
  const browser = JSON.parse(await readFile(resolve(output, 'browser-geometry.json'), 'utf8'));
  assert.equal(browser.status, 'pass');
  assert.equal(browser.runs.length, 2);
  receipt.browserStatus = browser.status;
  const pgq = [
    'pgq-wp4-s3-content-integrity.test.mjs',
    'pgq-wp4-s3-sample-approval.test.mjs',
    'pgq-wp4-s4-full-deck-qa.test.mjs',
    'pgq-wp4-s4-required-visibility.test.mjs',
  ];
  for (let index = 0; index < pgq.length; index++) {
    await run(`pgq-${index + 1}`, ['--test', `tests/${pgq[index]}`]);
  }
  receipt.status = 'PASS';
} catch (error) {
  receipt.errors.push({ name: error.name, message: error.message });
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
