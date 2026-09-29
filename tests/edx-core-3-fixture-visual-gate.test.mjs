import assert from 'node:assert/strict';
import test from 'node:test';
import { fixtureVisualGate } from '../tools/edx-core-3-fixture-visual-gate.mjs';
const measurement = (y, scale = 1) => ({ viewport: { width: 1600 * scale, height: 900 * scale }, elements:
  Object.fromEntries([['title', 78, 126, 453, 63, '成果，不鎖在工具裡'], ['A', 120, y, 180, 120, 'A'], ['B', 360, y, 180, 120, 'B']]
    .map(([key, x, top, width, height, text]) => [key, { text, visible: true, bounds: { x: x * scale, y: top * scale, width: width * scale, height: height * scale } }])) });

test('雙viewport幾何反例：120拒絕、600通過；不是正式browser證據', () => {
  for (const scale of [.8, 1]) {
    const red = fixtureVisualGate(measurement(120, scale));
    assert.equal(red.pass, false); assert.deepEqual(red.issues, ['title-overlap:A', 'title-overlap:B']);
    assert.ok(red.intersections.A.area > 0 && red.intersections.B.area > 0);
    const green = fixtureVisualGate(measurement(600, scale));
    assert.equal(green.pass, true); assert.equal(green.intersections.A.area, 0); assert.equal(green.intersections.B.area, 0);
  }
});

test('隱藏、移出viewport、刪除或更換A/B不得迴避gate', () => {
  for (const key of ['A', 'B']) for (const change of [e => { e.visible = false; }, e => { e.bounds.x = -1; },
    e => { e.bounds.y = 850; }, e => { e.text = ''; }, e => { e.bounds.width = 0; }]) {
    const m = measurement(600); change(m.elements[key]); assert.equal(fixtureVisualGate(m).pass, false);
  }
  const missing = measurement(600); delete missing.elements.A; assert.equal(fixtureVisualGate(missing).pass, false);
});

test('所有rect與viewport非finite或型別不符時fail closed', () => {
  for (const key of ['title', 'A', 'B']) for (const field of ['x', 'y', 'width', 'height']) for (const value of [NaN, Infinity, null, '120', undefined]) {
    const m = measurement(600); m.elements[key].bounds[field] = value; assert.equal(fixtureVisualGate(m).pass, false);
  }
  for (const value of [NaN, 0, -1, '1600']) {
    const m = measurement(600); m.viewport.width = value; assert.equal(fixtureVisualGate(m).pass, false);
  }
});

test('只要任一fixture有正面積相交就拒絕；不設負容忍值', () => {
  const m = measurement(600); m.elements.A.bounds.y = 188.999;
  assert.equal(fixtureVisualGate(m).pass, false);
  m.elements.A.bounds.y = 189; assert.equal(fixtureVisualGate(m).pass, true);
});
