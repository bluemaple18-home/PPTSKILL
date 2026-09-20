import assert from 'node:assert/strict';
import { writeFile } from 'node:fs/promises';
import { createComponentInteraction } from '../../runtime/component-interaction.js';
const results = [];
for (const scale of [0.8, 1]) {
  let box = { x: 800, y: 280, width: 640, height: 480 }, preview;
  const token = {}, calls = [];
  const interaction = createComponentInteraction({
    readTarget: () => ({ token, revision: 0, rect: { ...box } }),
    executeOperation: op => { calls.push(op); box = { ...box, ...op.value }; },
    preview: (_target, value) => { preview = value; }, restore() {},
  });
  interaction.setMode(true); interaction.select({ slideId: 's', elementId: 'component-c' });
  for (const kind of ['drag', 'resize']) {
    const base = { ...box }, count = calls.length;
    interaction.begin(kind, { x: 0, y: 0 }, scale);
    interaction.update({ x: 7 * scale, y: 7 * scale, beforeTranslate: [8, 8], width: base.width + 8, height: base.height + 8 });
    assert.equal(calls.length, count); assert.deepEqual(box, base);
    const expected = kind === 'drag' ? { ...base, x: base.x + 7, y: base.y + 7 } : { ...base, width: base.width + 7, height: base.height + 7 };
    assert.deepEqual(preview, expected); interaction.finish(); interaction.finish();
    assert.equal(calls.length, count + 1); assert.deepEqual(box, expected);
    results.push({ scale, kind, rawCanonicalDelta: 7, hypotheticalVendorSnapDelta: 8, committed: box, operation: calls.at(-1), singleCommit: true });
  }
  const before = { ...box }; interaction.nudge('ArrowRight'); assert.equal(box.x, before.x + 1);
}
await writeFile(new URL('operation-probe.json', import.meta.url), JSON.stringify({ status: 'pass', boundary: 'first-party public controller probe；額外snap欄位是假設輸入，非真vendor/browser evidence', results }, null, 2) + '\n');
console.log('PASS: 2 scales × drag/resize；raw pointer delta仍為7，未採用假設snap=8；keyboard仍1px。');
