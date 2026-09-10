import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { loadCompanyStylePack } from '../runtime/company-style-pack.js';
import { extractDeckSpec } from '../runtime/deck-spec.js';
import { renderFullDeck } from '../runtime/full-deck-renderer.js';
import { preparePortableExport } from '../runtime/portable-size-guard.js';
import { buildStyleCoverPreview, compileStyleCandidates } from '../runtime/style-candidates.js';

const companyDeck = JSON.parse(await readFile(new URL('../fixtures/company-style-deck-spec.json', import.meta.url), 'utf8'));
const styleSource = JSON.parse(await readFile(new URL('../fixtures/style-candidates.json', import.meta.url), 'utf8'));

test('Company Style Pack 只保留來源指紋與 reviewed 規則，不保留本機來源路徑', () => {
  const pack = loadCompanyStylePack();
  assert.equal(pack.status, 'reviewed');
  assert.deepEqual(pack.ownerReview, { date: '2026-09-10', verdict: 'pass' });
  assert.equal(pack.sourceFingerprint.slideCount, 7);
  assert.equal(pack.sourceCoverage.chartLanguage, 'source_not_present');
  assert.equal(pack.sourceCoverage.tableLanguage, 'source_not_present');
  assert.doesNotMatch(JSON.stringify(pack), /Downloads|暗色簡報\.pptx/);
  for (const value of Object.values(pack.assets)) assert.match(value, /^data:image\/(png|jpeg|webp);base64,/);
});

test('Company Style 是既有四封面選擇的第一條真實 route', () => {
  const pack = loadCompanyStylePack();
  const result = compileStyleCandidates({ ...styleSource, companyStylePack: pack });
  assert.equal(result.status, 'pass');
  assert.deepEqual(result.candidates.map(({ kind }) => kind), ['company', 'ai', 'ai', 'ai']);
  assert.equal(result.candidates[0].style.id, 'clickforce-dark');
  assert.equal(result.candidates[0].visualRoute.coverArchetype, 'full-bleed-editorial');
  const html = buildStyleCoverPreview(result.candidates[0]);
  assert.match(html, /class="company-cover-field"/);
  assert.match(html, /background-image:url/);
  assert.match(html, /class="company-logo"/);
  assert.doesNotMatch(html, /https?:\/\//);
});

test('Company Style 代表頁沿用單一 full-deck renderer 並可從單檔回讀 DeckSpec', () => {
  const result = renderFullDeck(companyDeck);
  assert.equal(result.status, 'pass');
  assert.match(result.html, /data-visual-world="company-dark"/);
  assert.match(result.html, /variant-company-cover/);
  assert.match(result.html, /variant-company-closing-light/);
  assert.equal(extractDeckSpec(result.html).style.id, 'clickforce-dark');
  assert.equal(extractDeckSpec(result.html).slides.length, 7);
  assert.doesNotMatch(result.html, /暗色簡報\.pptx|\/Users\/matt\/Downloads/);
  const prepared = preparePortableExport(result.html, result.spec);
  assert.equal(prepared.status, 'pass');
  assert.ok(prepared.report.totalHtmlBytes < prepared.report.limits.hardLimitBytes);
  assert.match(result.html, /data-pptskill-size-guard/);
  assert.match(result.html, /data-pptskill-editor/);
});

test('Company Style 使用來源證據的字體、色彩與位置尺度', () => {
  const pack = loadCompanyStylePack();
  assert.match(pack.style.typography.display, /Microsoft JhengHei/);
  assert.equal(pack.style.palette.canvas, '#191919');
  assert.equal(pack.style.palette.accent, '#ff122f');
  assert.deepEqual(pack.measuredLayout.logoTopRight, { x: 1322, y: 40, width: 247, height: 57 });
  assert.equal(pack.measuredLayout.coverTitle.fontSize, 100);
});
