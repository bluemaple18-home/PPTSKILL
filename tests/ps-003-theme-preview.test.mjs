import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { validateThemePreview } from '../tools/validate-theme-preview.mjs';
import { themes } from '../runtime/theme-preview.js';

const manifestPath = new URL('../fixtures/theme-preview-manifest.json', import.meta.url);
const loadManifest = async () => JSON.parse(await readFile(manifestPath, 'utf8'));

test('theme preview manifest 恰有四款且沿用同一真實內容', async () => {
  const manifest = await loadManifest();
  assert.equal(manifest.previews.length, 4);
  assert.deepEqual(manifest.previews.map((preview) => preview.id).sort(), [
    'brand-story', 'executive-clear', 'product-blueprint', 'sales-momentum',
  ]);
  for (const preview of manifest.previews) {
    assert.deepEqual(preview.content, manifest.content);
    assert.equal(preview.width / preview.height, 16 / 9);
  }
});

test('四款 Theme 具備固定畫布與防爆版基線', () => {
  for (const theme of themes) {
    assert.match(theme.styles, /\* \{ box-sizing: border-box; \}/);
    assert.match(theme.styles, /width: 1600px; height: 900px; overflow: hidden/);
    assert.doesNotMatch(theme.styles, /class="signal"/i);
  }
});

test('pending 選款不得進入 theme_selected', async () => {
  const result = await validateThemePreview(await loadManifest());
  assert.equal(result.status, 'blocked');
});

test('只有人類選擇既有 Theme 才可通過選款 gate', async () => {
  const selected = await loadManifest();
  selected.selection = { status: 'selected', theme: 'product-blueprint', approvedBy: 'human' };
  assert.equal((await validateThemePreview(selected)).status, 'pass');

  selected.selection.theme = 'missing-theme';
  assert.equal((await validateThemePreview(selected)).status, 'fail');
});
