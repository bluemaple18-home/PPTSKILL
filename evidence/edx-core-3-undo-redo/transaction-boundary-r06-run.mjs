// repo root 執行：node evidence/edx-core-3-undo-redo/transaction-boundary-r06-run.mjs full rerun-01
// 保留既有 evidence；每次重跑必須使用未存在的 label。
import fs from 'node:fs';
import { spawnSync } from 'node:child_process';
import { gzipSync } from 'node:zlib';
import { createHash } from 'node:crypto';
const root = 'evidence/edx-core-3-undo-redo/';
const [mode, label] = process.argv.slice(2);
if (!['full', 'focused'].includes(mode) || !/^[a-z0-9-]+$/.test(label || '')) throw Error('需要 full|focused 與新 label');
const original = JSON.parse(fs.readFileSync(root + 'transaction-boundary-mainline-nonbrowser.json'));
const focused = ['tests/edx-core-2-group-lock.test.mjs', 'tests/edx-core-3-undo-redo.test.mjs', 'tests/edx-core-3-transaction-boundary.test.mjs', 'tests/edx-wp1-s4-perf.test.mjs', 'tests/edx-wp1-s4-interaction.test.mjs', 'tests/edx-wp1-s5-keyboard.test.mjs', 'tests/edx-wp1-s9-mounted-alignment.test.mjs', 'tests/edx-wp1-s10-mounted-distribute.test.mjs', 'tests/edx-wp1-s7-snap.test.mjs'];
const tests = mode === 'full' ? original.tests : focused;
const path = root + 'transaction-boundary-r06-' + label;
for (const suffix of ['.tap', '.tap.gz', '.json']) if (fs.existsSync(path + suffix)) throw Error('拒絕覆寫：' + path + suffix);
const sourceSHA256 = Object.fromEntries(['runtime/deck-editor.js', 'runtime/component-interaction.js', ...tests].map(file =>
  [file, createHash('sha256').update(fs.readFileSync(file)).digest('hex')]));
const descriptor = fs.openSync(path + '.tap', 'wx');
const result = spawnSync(process.execPath, ['--test', '--test-reporter=tap', '--test-concurrency=1', ...tests], { stdio: ['ignore', descriptor, descriptor] });
fs.closeSync(descriptor);
const bytes = fs.readFileSync(path + '.tap');
fs.writeFileSync(path + '.tap.gz', gzipSync(bytes)); fs.unlinkSync(path + '.tap');
const tap = bytes.toString();
const summary = Object.fromEntries(['tests', 'pass', 'fail', 'skipped'].map(key =>
  [key, Number(tap.match(new RegExp('^# ' + key + ' (\\d+)', 'm'))?.[1])]));
const receipt = { tests, sourceSHA256, exit: result.status, signal: result.signal, summary, log: path + '.tap.gz' };
fs.writeFileSync(path + '.json', JSON.stringify(receipt, null, 2) + '\n');
console.log(JSON.stringify({ files: tests.length, exit: result.status, summary }));
process.exitCode = result.status ?? 1;
