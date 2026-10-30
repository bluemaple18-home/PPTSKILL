import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { contentHash } from '../runtime/deck-spec.js';
import { createInformationLedDeck } from '../runtime/full-deck-variants.js';
import { renderFullDeck } from '../runtime/full-deck-renderer.js';

const typographyDeck = JSON.parse(await readFile(new URL('../fixtures/full-deck-spec.json', import.meta.url), 'utf8'));
const styleCandidates = JSON.parse(await readFile(new URL('../fixtures/style-candidates.json', import.meta.url), 'utf8'));
const informationDeck = createInformationLedDeck(typographyDeck, styleCandidates);

test('S3 由 Style grammar 與 semantic role 決定 effect，不是全站 fade-in', () => {
  const typographyHtml = renderFullDeck(typographyDeck).html;
  const informationHtml = renderFullDeck(informationDeck).html;

  assert.match(typographyHtml, /data-effect-language="hard-field-accent"/);
  assert.match(typographyHtml, /data-effect-treatment="hard-cut-field"/);
  assert.match(typographyHtml, /data-effect-treatment="brand-device-accent"/);
  assert.match(typographyHtml, /data-effect-treatment="staggered-sequence"/);

  assert.match(informationHtml, /data-effect-language="static-precision"/);
  assert.match(informationHtml, /data-effect-treatment="hard-rule"/);
  assert.match(informationHtml, /data-effect-treatment="outlined-surface"/);
  assert.match(informationHtml, /data-effect-treatment="progressive-reveal"/);
  assert.match(informationHtml, /data-effect-treatment="rule-draw"/);
  const informationMarkup = informationHtml.match(/<main[\s\S]*?<\/main>/)?.[0] || '';
  assert.doesNotMatch(informationMarkup, /data-effect-treatment="restrained-fade-rise"/);
});

test('每個 Style 最多兩個 primary effect families，並涵蓋代表性角色', () => {
  for (const deck of [typographyDeck, informationDeck]) {
    const html = renderFullDeck(deck).html;
    const families = html.match(/data-effect-families="([^"]+)"/)?.[1].split('+') ?? [];
    assert.ok(families.length > 0 && families.length <= 2);
    for (const role of ['title', 'visualAnchor', 'metric', 'process', 'diagram', 'supportingCopy']) {
      assert.match(html, new RegExp(`data-effect-role="${role}"`));
    }
  }
});

test('effect CSS 只改 transform / opacity / clip-path，reduced motion 立即回到 resting state', () => {
  const html = renderFullDeck(informationDeck).html;
  assert.match(html, /\[data-effect-treatment="rule-draw"\]/);
  assert.match(html, /prefers-reduced-motion:reduce/);
  assert.match(html, /clip-path:none!important/);
  assert.doesNotMatch(html, /transition:[^}]*\b(width|height|margin|top|left)\b/);
});

test('S3 effect routing 不改動兩套 deck 的內容雜湊', () => {
  assert.deepEqual(informationDeck.slides.map(contentHash), typographyDeck.slides.map(contentHash));
});
