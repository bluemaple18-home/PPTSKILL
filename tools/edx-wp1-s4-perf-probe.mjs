import assert from 'node:assert/strict';
import { performance } from 'node:perf_hooks';
import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { mountedEditor, fixture, geometry, box } from './edx-wp1-s4-perf-mounted.mjs';

// 診斷 mounted update + preview CPU 時間；不是 frame benchmark，沒有固定 ms gate。
const sourceSha256 = {};
for (const file of ['runtime/component-interaction.js', 'runtime/deck-editor.js', 'tools/edx-wp1-s4-perf-mounted.mjs', 'tools/edx-wp1-s4-perf-probe.mjs']) {
  sourceSha256[file] = createHash('sha256').update(await readFile(new URL('../' + file, import.meta.url))).digest('hex');
}
const runs = [];
for (const mib of [1, 6, 12]) {
  const h = mountedEditor(fixture(mib)); h.ready(); h.begin();
  for (let i = 0; i < 30; i++) h.update(i % 20 + 1, i % 20 + 1);
  h.resetCounts(); const times = [];
  for (let i = 0; i < 101; i++) {
    const start = performance.now(); h.update(i % 20 + 1, i % 20 + 1); times.push(performance.now() - start);
  }
  assert.deepEqual(h.counts, { payloadReads: 0, serializations: 0, wholeSpecSerializations: 0 });
  const counts = { ...h.counts };
  h.finish(); assert.deepEqual(geometry(h.getSpec()), { ...box, x: 801, y: 281 });
  times.sort((a, b) => a - b);
  runs.push({ mib, payloadCharacters: mib * 1024 * 1024, warmupUpdates: 30, measuredUpdates: 101, ...counts, p50Ms: times[50], p95Ms: times[95], maxMs: times.at(-1) });
}
const receipt = { status: 'pass', scope: 'generated browser runtime mounted update+preview；DOM/vendor double，非真 browser/frame timing', gate: 'payloadReads=serializations=wholeSpecSerializations=0；release committed once', node: process.version, sourceSha256, runs };
const json = JSON.stringify(receipt, null, 2) + '\n';
if (process.argv[2]) await writeFile(process.argv[2], json);
console.log(json);
