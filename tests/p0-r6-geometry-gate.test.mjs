import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { layoutRepairSequence, nextLayoutRepair } from '../runtime/layout-repair-policy.js';

const readReceipt = async (name) => JSON.parse(await readFile(new URL(`../evidence/p0-r6/${name}-geometry.json`, import.meta.url), 'utf8'));

test('真實 deck 與 repaired fixture 在兩種 viewport 的 browser geometry 均通過', async () => {
  for (const name of ['full-deck', 'repaired']) {
    const receipt = await readReceipt(name);
    assert.equal(receipt.status, 'pass');
    assert.deepEqual(receipt.runs.map(({ viewport }) => viewport), [{ width: 1600, height: 900 }, { width: 1280, height: 720 }]);
    assert.ok(receipt.runs.every(({ slideCount, slideWidths, viewport, issues }) => slideCount > 0 && slideWidths.every((width) => width <= viewport.width + 1) && issues.length === 0));
  }
});

test('collision fixture 必須被所有 blocker 類型 fail-loud', async () => {
  const receipt = await readReceipt('collision');
  assert.equal(receipt.status, 'fail');
  for (const run of receipt.runs) {
    const codes = new Set(run.issues.map(({ code }) => code));
    for (const required of ['TEXT_TEXT', 'TEXT_IMAGE', 'IMAGE_IMAGE', 'OVERFLOW', 'OFF_CANVAS', 'FONT_TOO_SMALL']) assert.ok(codes.has(required), `缺少 ${required}`);
  }
});

test('修復順序固定，且明確禁止以持續縮字收尾', () => {
  assert.deepEqual(layoutRepairSequence, ['safer-composition', 'explicit-content-shortening', 'split-slide']);
  assert.equal(nextLayoutRepair().action, 'safer-composition');
  assert.equal(nextLayoutRepair({ completed: ['safer-composition'] }).status, 'blocked');
  assert.equal(nextLayoutRepair({ completed: ['safer-composition'], shorteningApprovedBy: 'human' }).action, 'explicit-content-shortening');
  assert.equal(nextLayoutRepair({ completed: ['safer-composition', 'explicit-content-shortening'] }).action, 'split-slide');
  assert.doesNotMatch(JSON.stringify(layoutRepairSequence), /shrink-font/);
});
