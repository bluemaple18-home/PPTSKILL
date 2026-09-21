import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import { verifySelectoVendor, buildSelectoVendorScript } from '../runtime/selecto-vendor.js';
import { renderFullDeck } from '../runtime/full-deck-renderer.js';

test('S8 Selecto pinned vendor/hash/license/integrity 全部吻合', () => {
  const checked = verifySelectoVendor();
  assert.equal(checked.status, 'pass', checked.errors.join('\n'));
  assert.equal(checked.metadata.package, 'selecto');
  assert.equal(checked.metadata.version, '1.26.3');
  assert.equal(checked.metadata.registryIntegrity, 'sha512-gZHgqMy5uyB6/2YDjv3Qqaf7bd2hTDOpPdxXlrez4R3/L0GiEWDCFaUfrflomgqdb3SxHF2IXY0Jw0EamZi7cw==');
  assert.ok(checked.metadata.bundleBytes < 100000);
  assert.ok(checked.metadata.gzipBytes < 30000);
});

test('S8 portable 內嵌 Selecto vendor/license 且無 CDN', async () => {
  const fixture = JSON.parse(await readFile(new URL('../fixtures/full-deck-spec.json', import.meta.url), 'utf8'));
  const rendered = renderFullDeck(fixture);
  assert.equal(rendered.status, 'pass');
  assert.match(rendered.html, /data-pptskill-selecto-vendor/);
  assert.match(rendered.html, /data-pptskill-selecto-license/);
  assert.doesNotMatch(rendered.html, /<script[^>]+src=/);
  const script = buildSelectoVendorScript();
  assert.match(script, /Selecto portable bundle/);
  assert.doesNotThrow(() => new vm.Script(script.match(/<script data-pptskill-selecto-vendor[^>]*>([\s\S]*)<\/script>$/u)?.[1] || ''));
});
