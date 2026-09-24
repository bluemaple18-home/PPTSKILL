import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';

const repo = '/Users/matt/Documents/ChatGPT/skill 工廠/PPTSKILL-canonical';
const { fixture, mountedEditor } = await import(pathToFileURL(repo + '/tools/edx-wp1-s4-perf-mounted.mjs'));
for (const snap of [false, true]) for (const entry of ['api', 'click']) {
  const h = mountedEditor(fixture(0));
  h.ready();
  if (snap) h.action('snap-layout');
  const node = h.component(), originalStyle = node.getAttribute('style');
  const originalSpec = h.getSpec(), originalRevision = h.getRevision();
  h.begin();
  h.update(8, 10, 'drag', snap ? { left: 808, top: 290 } : {});
  assert.notEqual(node.getAttribute('style'), originalStyle);
  const base = node.style;
  let injected = false;
  node.style = new Proxy(base, { get(target, key) {
    if (key === 'setProperty') return (name, value) => {
      target.setProperty(name, value);
      if (!injected && name === 'left') { injected = true; throw Error('cancel projection fault'); }
    };
    return target[key];
  } });
  let error;
  try { if (entry === 'api') h.api.layout.setMode(false); else h.action('layout'); }
  catch (caught) { error = caught; }
  assert.match(error?.message || '', /cancel projection fault/);
  assert.equal(injected, true);
  assert.deepEqual(h.getSpec(), originalSpec);
  assert.equal(h.getRevision(), originalRevision);
  assert.notEqual(node.getAttribute('style'), originalStyle);
  let publicMutationAllowed = false;
  try {
    h.api.executeOperation({ operation: 'edit-text', target: { slideId: 'portable', elementId: 'role-title' }, value: 'after fault' });
    publicMutationAllowed = true;
  } catch {}
  assert.equal(publicMutationAllowed, true);
  console.log(JSON.stringify({ snap, entry, expectedStyle: originalStyle, actualStyle: node.getAttribute('style'), publicMutationAllowed }));
}
