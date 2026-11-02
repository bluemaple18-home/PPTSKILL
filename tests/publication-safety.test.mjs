import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, rmSync, unlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import test from 'node:test';
import {
  buildForbiddenAssetIdentityMap,
  getPublicationAssetIdentitySummary,
  scanBytes,
  scanRepository,
  validateThirdPartyNotices,
} from '../tools/publication-safety.mjs';

test('publication guard 允許 synthetic user path，拒絕真實 home path', () => {
  const synthetic = ['', 'Users', 'private', 'source.pdf'].join('/');
  const real = ['', 'Users', 'alice', 'project', 'deck.html'].join('/');
  assert.equal(scanBytes('fixture.txt', Buffer.from(synthetic)).some(({ rule }) => rule === 'real-user-home-path'), false);
  assert.equal(scanBytes('fixture.txt', Buffer.from(real)).some(({ rule }) => rule === 'real-user-home-path'), true);
});

test('publication guard 對 high-signal secret 只回報類型與路徑', () => {
  const value = ['sk', 'proj', 'ABCDEFGHIJKLMNOPQRSTUVWX'].join('-');
  const findings = scanBytes('fixture.txt', Buffer.from(value));
  assert.deepEqual(findings, [{ rule: 'secret-openai', path: 'fixture.txt' }]);
  assert.equal(JSON.stringify(findings).includes(value), false);
});

test('publication guard 會解碼 data URI，不能用 generic HTML 包住已知私人素材', () => {
  const privateBytes = Buffer.from('synthetic-private-brand-fixture-'.repeat(4));
  const digest = createHash('sha256').update(privateBytes).digest('hex');
  const html = `<img src="data:image/png;base64,${privateBytes.toString('base64')}">`;
  const forbiddenAssetIdentities = buildForbiddenAssetIdentityMap([{
    sourceClass: 'private-brand', sha256: digest, disposition: 'deny-publication', reason: 'test', provenance: 'synthetic-test',
  }]);
  const findings = scanBytes('generic-demo.html', Buffer.from(html), { forbiddenAssetIdentities });
  assert.deepEqual(findings, [{ rule: 'embedded-known-private-brand-asset', path: 'generic-demo.html' }]);
});

test('Golden raw identity guard 不依賴 path 或 extension，且 data URI 共用同一 identity scanner', () => {
  const raw = Buffer.from('synthetic-golden-reference-'.repeat(5));
  const digest = createHash('sha256').update(raw).digest('hex');
  const forbiddenAssetIdentities = buildForbiddenAssetIdentityMap([{
    sourceClass: 'golden-reference', sha256: digest, disposition: 'deny-publication', reason: 'test', provenance: 'synthetic-test',
  }]);
  for (const path of ['public/assets/reference.png', 'design/materials/golden-covers/accepted/reference.bin', 'foo/bar/reference.dat']) {
    assert.deepEqual(scanBytes(path, raw, { forbiddenAssetIdentities }), [{ rule: 'known-unlicensed-reference-asset', path }]);
  }
  const html = `<img src="data:image/x-test;base64,${raw.toString('base64')}">`;
  assert.deepEqual(scanBytes('nested/generic.html', Buffer.from(html), { forbiddenAssetIdentities }), [
    { rule: 'embedded-known-unlicensed-reference-asset', path: 'nested/generic.html' },
  ]);
});

test('Golden removal evidence 是 33/33 records，對應 32 個 unique SHA-256 identities', () => {
  const summary = getPublicationAssetIdentitySummary();
  assert.equal(summary.goldenReferenceRecords, 33);
  assert.equal(summary.goldenReferenceUniqueSha256, 32);
});

test('arbitrary synthetic image 與 approved Public Demo Dark asset 不被 identity denylist 誤擋', () => {
  assert.deepEqual(scanBytes('public/arbitrary.png', Buffer.from('unrelated-synthetic-image')), []);
  const approvedPath = 'design/company-style/public-demo-dark/assets/logo-white.png';
  assert.deepEqual(scanBytes(approvedPath, readFileSync(new URL(`../${approvedPath}`, import.meta.url))), []);
});

const createNoticeFixture = () => {
  const root = mkdtempSync(join(tmpdir(), 'pptskill-notice-'));
  mkdirSync(resolve(root, 'runtime/vendor'), { recursive: true });
  for (const path of [
    'THIRD_PARTY_NOTICES.md', 'pnpm-lock.yaml',
    'runtime/vendor/number-flow-vendor.json', 'runtime/vendor/vanta-vendor.json',
    'runtime/vendor/number-flow-LICENSE.md', 'runtime/vendor/esm-env-LICENSE.md',
    'runtime/vendor/three-LICENSE.md', 'runtime/vendor/vanta-LICENSE.md',
  ]) {
    copyFileSync(new URL(`../${path}`, import.meta.url), resolve(root, path));
  }
  return root;
};

test('third-party notice 對 bundled dependency 做 exact identity/license/evidence validation', () => {
  const mutate = (fn) => {
    const root = createNoticeFixture();
    try { fn(root); return validateThirdPartyNotices({ repoRoot: root }); }
    finally { rmSync(root, { recursive: true, force: true }); }
  };

  assert.deepEqual(mutate(() => {}), []);
  assert.ok(mutate((root) => {
    const path = resolve(root, 'THIRD_PARTY_NOTICES.md');
    writeFileSync(path, readFileSync(path, 'utf8').replace(/^\| NumberFlow \|.*\n/m, ''));
  }).some(({ rule }) => rule === 'third-party-notice-entry-missing'));
  assert.ok(mutate((root) => {
    const path = resolve(root, 'THIRD_PARTY_NOTICES.md');
    writeFileSync(path, readFileSync(path, 'utf8').replace('`number-flow@0.6.2`', '`number-flow@0.6.3`'));
  }).some(({ rule }) => rule === 'third-party-notice-identity-mismatch'));
  assert.ok(mutate((root) => {
    const path = resolve(root, 'THIRD_PARTY_NOTICES.md');
    writeFileSync(path, readFileSync(path, 'utf8').replace('| MIT；散布 substantial portions', '| Apache-2.0；散布 substantial portions'));
  }).some(({ rule }) => rule === 'third-party-notice-license-mismatch'));
  assert.ok(mutate((root) => unlinkSync(resolve(root, 'runtime/vendor/number-flow-LICENSE.md')))
    .some(({ rule }) => rule === 'third-party-license-evidence-missing'));
});

test('目前 tracked public surface 通過 publication safety guard', () => {
  const result = scanRepository();
  assert.deepEqual(result.findings, [], result.findings.map(({ rule, path }) => `${rule}: ${path}`).join('\n'));
});
