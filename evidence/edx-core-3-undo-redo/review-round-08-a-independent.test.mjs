import test from 'node:test';
import assert from 'node:assert/strict';
import { pathToFileURL, fileURLToPath } from 'node:url';
const repo = fileURLToPath(new URL('../..', import.meta.url));
const { fixture, mountedEditor } = await import(pathToFileURL(repo + '/tools/edx-wp1-s4-perf-mounted.mjs'));
const edit = value => ({ operation: 'edit-text', target: { slideId: 'portable', elementId: 'role-title' }, value });
const state = h => JSON.stringify({ spec: h.getSpec(), revision: h.getRevision(), history: h.api.getHistoryState(), mode: h.document.body.dataset.editorMode, selection: h.api.layout.getSelectionState(), target: h.api.layout.getState().target });
for (const snap of [false, true]) for (const entry of ['api', 'click']) test(`independent cancel snap=${snap} entry=${entry}`, () => {
  const h = mountedEditor(fixture(0)); h.ready(); if (snap) h.action('snap-layout');
  const node = h.component(), style = node.getAttribute('style'), before = state(h);
  h.begin(); h.update(8, 10, 'drag', snap ? { left: 808, top: 290 } : {});
  assert.notEqual(node.getAttribute('style'), style);
  const base = node.style, failure = Error('cancel projection fault'); let injected = false, nestedRejected = false;
  node.style = new Proxy(base, { get(target, key) {
    if (key === 'setProperty') return (name, value) => {
      target.setProperty(name, value);
      if (!injected && name === 'left') {
        injected = true;
        try { h.api.executeOperation(edit('nested')); } catch (error) { nestedRejected = /同步交易/.test(error.message); }
        throw failure;
      }
    };
    return target[key];
  } });
  assert.throws(() => entry === 'api' ? h.api.layout.setMode(false) : h.action('layout'), error => error === failure);
  assert.equal(injected, true); assert.equal(nestedRejected, true);
  assert.equal(node.getAttribute('style'), style); assert.equal(state(h), before);
  assert.equal(h.api.layout.getState().gesturing, false);
  h.finish(); assert.equal(state(h), before);
  h.api.executeOperation(edit('after fault')); assert.equal(h.getRevision(), 1);
  h.begin(); h.update(8, 0, 'drag', snap ? { left: 808, top: 280 } : {}); h.finish();
  assert.equal(h.getSpec().slides[0].composition.geometryOverrides['portable-quote'].x, 808);
});
test('independent fallback failure blocks before payload read', () => {
  const h = mountedEditor(fixture(0)); h.ready(); h.action('snap-layout');
  const node = h.component(), before = state(h); h.begin(); h.update(8, 10, 'drag', { left: 808, top: 290 });
  const base = node.style, originalSetAttribute = node.setAttribute, failure = Error('cancel projection fault');
  let injected = false, fallbackAttempts = 0, payloadReads = 0;
  node.style = new Proxy(base, { get(target, key) {
    if (key === 'setProperty') return (name, value) => { target.setProperty(name, value); if (!injected && name === 'left') { injected = true; throw failure; } };
    return target[key];
  } });
  node.setAttribute = function (name, value) { if (name === 'style') { fallbackAttempts++; throw Error('fallback unavailable'); } return originalSetAttribute.call(this, name, value); };
  let caught; try { h.api.layout.setMode(false); } catch (error) { caught = error; }
  assert.equal(injected, true); assert.ok(fallbackAttempts > 0);
  assert.match(caught?.message || '', /rollback failed/); assert.equal(caught.cause, failure);
  assert.equal(state(h), before); assert.equal(h.api.layout.getState().gesturing, false);
  const request = new Proxy({}, { get() { payloadReads++; throw Error('payload read'); } });
  assert.throws(() => h.api.executeOperation(request), /rollback failed/); assert.equal(payloadReads, 0);
  assert.equal(h.api.undo(), false); assert.throws(() => h.api.layout.setMode(false), /rollback failed/);
  h.finish(); assert.equal(state(h), before);
});
