import assert from 'node:assert/strict';
import test from 'node:test';
import { ASSET_POLICY, inspectImageAsset, parseImageDataUri } from '../runtime/asset-policy.js';
import { buildBrowserAssetOptimizerRuntimeScript } from '../runtime/browser-asset-optimizer.js';
import { inspectPortableHtml, preparePortableExport, utf8ByteLength } from '../runtime/portable-size-guard.js';
import { extractDeckSpec } from '../runtime/deck-spec.js';
import { renderFullDeck } from '../runtime/full-deck-renderer.js';
import { readFile } from 'node:fs/promises';

const fixture = JSON.parse(await readFile(new URL('../fixtures/full-deck-spec.json', import.meta.url), 'utf8'));
const uri = (mime, bytes) => `data:${mime};base64,${Buffer.alloc(bytes, 1).toString('base64')}`;
const withImages = (...images) => ({ slides: [{ id: 's1', content: { components: images.map((dataUri, index) => ({ id: `i${index + 1}`, type: 'image', dataUri })) } }] });

test('01 單一 policy 鎖定 R10 閾值', () => {
  assert.equal(ASSET_POLICY.maxRasterLongEdge, 2560); assert.equal(ASSET_POLICY.perAssetWarningBytes, 4 * 1024 * 1024);
  assert.equal(ASSET_POLICY.deckWarningBytes, 12 * 1024 * 1024); assert.equal(ASSET_POLICY.deckHardLimitBytes, 20 * 1024 * 1024);
});
test('02 data URI 以 decoded bytes 計算', () => assert.equal(parseImageDataUri(uri('image/png', 17)).byteLength, 17));
test('03 UTF-8 bytes 不等於 JS 字元數', () => assert.equal(utf8ByteLength('中A'), 4));
test('04 大型單圖產生 warning', () => assert.equal(inspectImageAsset(uri('image/jpeg', ASSET_POLICY.perAssetWarningBytes + 1)).status, 'warn'));
test('05 oversized GIF 保留動畫並警告', () => assert.deepEqual(inspectImageAsset(uri('image/gif', ASSET_POLICY.perAssetWarningBytes + 1)).warnings, ['asset_over_warning_bytes', 'animated_gif_preserved']));
test('06 SVG 仍是 vector MIME', () => assert.equal(inspectImageAsset(uri('image/svg+xml', 32)).mime, 'image/svg+xml'));
test('07 report 彙總 MIME bytes', () => assert.deepEqual(inspectPortableHtml('x', withImages(uri('image/png', 3), uri('image/png', 5))).bytesByMime, { 'image/png': 8 }));
test('08 report 指出最大 slide/component', () => assert.deepEqual(inspectPortableHtml('x', withImages(uri('image/png', 3), uri('image/webp', 8))).largestAsset, { slideId: 's1', componentId: 'i2', mime: 'image/webp', bytes: 8, warnings: [] }));
test('09 deck warning 狀態成立', () => assert.equal(inspectPortableHtml('12345', { slides: [] }, { ...ASSET_POLICY, deckWarningBytes: 4, deckHardLimitBytes: 9 }).status, 'warn'));
test('10 hard limit 不回傳 release HTML', () => assert.deepEqual(preparePortableExport('12345', { slides: [] }, { ...ASSET_POLICY, deckWarningBytes: 2, deckHardLimitBytes: 4 }).html, null));
test('11 PASS 會保留原始 HTML', () => assert.equal(preparePortableExport('ok', { slides: [] }, { ...ASSET_POLICY, deckWarningBytes: 20, deckHardLimitBytes: 30 }).html, 'ok'));
test('12 browser optimizer 明確 preserve SVG/GIF 與禁止 upscale', () => {
  const script = buildBrowserAssetOptimizerRuntimeScript(); assert.match(script, /preserve_vector/); assert.match(script, /preserve_animation/); assert.match(script, /Math\.min\(1,/);
});
test('13 full export 只有既有 editor export seam 且內建 optimizer/guard', () => {
  const result = renderFullDeck(fixture); assert.equal(result.status, 'pass'); assert.match(result.html, /data-pptskill-asset-optimizer/); assert.match(result.html, /data-pptskill-size-guard/); assert.equal((result.html.match(/const exportHtml=/g) || []).length, 1);
});
test('14 optimized portable HTML 仍可單檔回讀 DeckSpec 且 sanitizer 不洩漏', () => {
  const dirty = structuredClone(fixture); dirty.profile = { secret: 'leak' }; dirty.localPath = '/private/source'; const result = renderFullDeck(dirty);
  assert.deepEqual(extractDeckSpec(result.html), result.spec); assert.doesNotMatch(JSON.stringify(extractDeckSpec(result.html)), /leak|private\/source/);
});
