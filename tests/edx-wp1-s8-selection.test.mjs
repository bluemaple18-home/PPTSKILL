import test from 'node:test';
import assert from 'node:assert/strict';
import {
  applyBoundedSelection,
  createMultiSelectionState,
} from '../runtime/multi-selection.js';

const all = ['component-a', 'component-b', 'component-c'];

test('S8 selection replace/toggle 去重並依 DOM order 穩定', () => {
  assert.deepEqual(applyBoundedSelection({ all, current: [], candidates: ['component-b', 'component-a', 'component-b'], mode: 'replace' }), ['component-a', 'component-b']);
  assert.deepEqual(applyBoundedSelection({ all, current: ['component-a'], candidates: ['component-b'], mode: 'toggle' }), ['component-a', 'component-b']);
  assert.deepEqual(applyBoundedSelection({ all, current: ['component-a', 'component-b'], candidates: ['component-a'], mode: 'toggle' }), ['component-b']);
  assert.deepEqual(applyBoundedSelection({ all, current: ['component-a'], candidates: ['component-b', 'component-b'], mode: 'toggle' }), ['component-a', 'component-b']);
  assert.deepEqual(applyBoundedSelection({ all, current: ['component-a'], candidates: ['foreign', 'component-c'], mode: 'toggle' }), ['component-a', 'component-c']);
});

test('S8 editor-local state 0/1/>1 lifecycle 不產生 canonical mutation', () => {
  let changes = 0;
  const state = createMultiSelectionState({
    listTargets: () => all,
    onChange: () => { changes += 1; },
  });
  assert.deepEqual(state.getState(), { enabled: false, selected: [] });
  state.setMode(true);
  state.replace(['component-b', 'component-a']);
  assert.deepEqual(state.getState(), { enabled: true, selected: ['component-a', 'component-b'] });
  state.toggle(['component-b']);
  assert.deepEqual(state.getState().selected, ['component-a']);
  state.clear();
  assert.deepEqual(state.getState().selected, []);
  state.setMode(false);
  assert.deepEqual(state.getState(), { enabled: false, selected: [] });
  assert.equal(changes, 3);
});

test('S8 disabled state 拒絕 selection mutation', () => {
  const state = createMultiSelectionState({ listTargets: () => all });
  state.replace(['component-a']);
  state.toggle(['component-b']);
  assert.deepEqual(state.getState(), { enabled: false, selected: [] });
});
