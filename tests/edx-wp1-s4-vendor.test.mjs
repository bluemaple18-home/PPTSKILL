import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import vm from 'node:vm';
import { verifyMoveableVendor, verifyMoveableArtifacts, buildMoveableVendorScript } from '../runtime/moveable-vendor.js';
import { renderFullDeck } from '../runtime/full-deck-renderer.js';
import { buildDeckEditorRuntimeScript } from '../runtime/deck-editor.js';
const read = name => readFile(new URL('../runtime/vendor/' + name, import.meta.url), 'utf8');
const sha = text => createHash('sha256').update(text).digest('hex');

test('正式 Moveable bundle/hash/metafile/license 與禁用 input 邊界', async () => {
  const checked = verifyMoveableVendor(); assert.equal(checked.status, 'pass', checked.errors.join('\n'));
  assert.equal(checked.metadata.inputs.length, 16); assert.ok(checked.metadata.bundleBytes < 300000);
  const input = { bundle: await read('moveable-0.53.0.iife.js'), metafile: await read('moveable-metafile.json'),
    attribution: await read('moveable-LICENSE.md'), metadata: checked.metadata };
  assert.equal(verifyMoveableArtifacts({ ...input, attribution: input.attribution + 'x' }).status, 'fail');
  assert.equal(verifyMoveableArtifacts({ ...input, bundle: input.bundle + 'x' }).status, 'fail');
  const meta = JSON.parse(input.metafile); meta.inputs['node_modules/selecto/dist/index.js'] = { bytes: 1, imports: [] };
  const metafile = JSON.stringify(meta), metadata = structuredClone(input.metadata); metadata.metafileSha256 = sha(metafile);
  metadata.inputs.push({ path: 'node_modules/selecto/dist/index.js', bytes: 1, sha256: 'x' });
  assert.equal(verifyMoveableArtifacts({ ...input, metafile, metadata }).status, 'fail');
});
test('portable 內嵌 vendor/license，無 CDN；generated editor script 可解析', async () => {
  const fixture = JSON.parse(await readFile(new URL('../fixtures/full-deck-spec.json', import.meta.url), 'utf8'));
  const result = renderFullDeck(fixture); assert.equal(result.status, 'pass');
  assert.match(result.html, /data-pptskill-moveable-vendor/); assert.match(result.html, /data-pptskill-moveable-license/);
  assert.doesNotMatch(result.html, /<script[^>]+src=/); assert.match(result.html, /data-action="initialize-layout" hidden/);
  assert.doesNotThrow(() => new vm.Script(buildDeckEditorRuntimeScript().replace(/^<script[^>]*>/, '').replace(/<\/script>$/, '')));
  const script = buildMoveableVendorScript(); assert.match(script, /Copyright/);
});
