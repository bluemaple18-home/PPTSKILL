import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import {
  buildStyleCoverPreview,
  compileStyleCandidates,
  getRendererStructuralSignature,
  selectStyleCandidate,
  splitTitleLines,
  validateRouteDiversity,
} from '../runtime/style-candidates.js';

const fixture = JSON.parse(await readFile(new URL('../fixtures/style-candidates.json', import.meta.url), 'utf8'));

test('缺少 Company Style Pack 時明確 blocked，不捏造公司風格', () => {
  assert.equal(compileStyleCandidates({ ...fixture, companyStylePack: null }).status, 'blocked');
});

test('候選固定為 Company Style＋三個 dynamic AI routes 且共用相同內容', () => {
  const result = compileStyleCandidates(fixture);
  assert.equal(result.status, 'pass');
  assert.deepEqual(result.candidates.map(({ kind }) => kind), ['company', 'ai', 'ai', 'ai']);
  for (const candidate of result.candidates) assert.deepEqual(candidate.content, fixture.content);
  assert.equal(result.candidates[0].fixtureOnly, true);
  assert.equal(new Set(result.candidates.slice(1).map(({ visualRoute }) => visualRoute.coverArchetype)).size, 3);
});

test('route diversity validator 拒絕同版面只換色', () => {
  const result = compileStyleCandidates(fixture);
  const base = result.candidates[1];
  const recolor = {
    ...base,
    style: { ...base.style, id: 'recolor', palette: { ...base.style.palette, accent: '#ff0000' } },
  };
  assert.equal(validateRouteDiversity([base, recolor]).status, 'fail');
  assert.equal(validateRouteDiversity(result.candidates).status, 'pass');

  const tokenOnlyDifference = {
    ...result.candidates[2],
    style: { ...result.candidates[2].style, id: 'token-only-difference' },
    visualRoute: { ...result.candidates[2].visualRoute, coverArchetype: 'graphic-brand-field' },
    rendererStructure: structuredClone(base.rendererStructure),
  };
  assert.equal(validateRouteDiversity([base, tokenOnlyDifference]).status, 'fail');
});

test('四張封面皆為可離線的真實 HTML/CSS renderer output', () => {
  const result = compileStyleCandidates(fixture);
  for (const candidate of result.candidates) {
    const html = buildStyleCoverPreview(candidate);
    assert.match(html, /<!doctype html>/i);
    assert.match(html, new RegExp(candidate.style.id));
    assert.match(html, new RegExp(fixture.content.title));
    assert.doesNotMatch(html, /https?:\/\//);
    assert.match(html, /width:1600px;height:900px;overflow:hidden/);
    assert.match(html, /class="slide stage motion-root"/);
    assert.match(html, /data-cover-archetype=/);
    assert.doesNotMatch(html, />(DECISION|DELIVERY|STORY|INPUT|STRUCTURE|STYLE)<\/b>/);
  }
});

test('三個 AI route 有不同 renderer-level 構圖側寫', () => {
  const result = compileStyleCandidates(fixture);
  const html = result.candidates.slice(1).map(buildStyleCoverPreview);
  assert.match(html[0], /class="information-sequence"/);
  assert.match(html[1], /class="type-monument type-monument--/);
  assert.match(html[2], /class="brand-field brand-field--/);
  assert.doesNotMatch(html.join('\n'), /information-network|brand-orbit|content:"01"/);
  for (const candidate of result.candidates.slice(1)) {
    assert.deepEqual(candidate.rendererStructure, getRendererStructuralSignature(candidate.visualRoute.coverArchetype));
    const rendered = buildStyleCoverPreview(candidate);
    assert.match(rendered, /data-composition-signature=/);
    assert.match(rendered, /data-title-region=/);
    assert.match(rendered, /data-anchor-copy-relation=/);
    assert.match(rendered, /data-silhouette=/);
  }
  assert.equal(new Set(result.candidates.slice(1).map(({ structuralSignature }) => structuralSignature)).size, 3);
});

test('Information Led 只以真實內容建立 anchor，無結構內容時降級為中性系統', () => {
  const result = compileStyleCandidates(fixture);
  const information = result.candidates[1];
  const semanticHtml = buildStyleCoverPreview(information);
  assert.match(semanticHtml, /data-semantic-source="subtitle"/);
  for (const segment of ['需求釐清', '風格選擇', '可離線分享的單檔 HTML']) assert.match(semanticHtml, new RegExp(segment));

  const fallbackHtml = buildStyleCoverPreview({
    ...information,
    content: { ...information.content, subtitle: '單一敘述不構成可驗證的資料流程或關係' },
  });
  assert.match(fallbackHtml, /data-anchor-mode="neutral-fallback"/);
  assert.doesNotMatch(fallbackHtml, /<ol class="information-sequence"/);
});

test('Typography Hero 與 Brand Field 的 device 由 bounded variants 生成，不是固定裝飾 recipe', () => {
  const result = compileStyleCandidates(fixture);
  const typography = result.candidates[2];
  const brand = result.candidates[3];
  const typeVariants = new Set([
    buildStyleCoverPreview(typography),
    buildStyleCoverPreview({ ...typography, content: { ...typography.content, title: '字體成為主視覺' } }),
    buildStyleCoverPreview({ ...typography, content: { ...typography.content, title: '不同標題建立不同節奏' } }),
  ].map((html) => html.match(/data-anchor-variant="([^"]+)"/)?.[1]));
  assert.ok(typeVariants.size >= 2);
  const brandHtml = buildStyleCoverPreview(brand);
  assert.match(brandHtml, /data-geometry-family="modular-cadence"/);
  assert.doesNotMatch(brandHtml, /orbit|border-radius:50%/);
});

test('中文 title-fit 不留下 1–2 個中文字的孤行', () => {
  const lines = splitTitleLines(fixture.content.title, 9);
  assert.ok(lines.length >= 2);
  assert.ok((lines.at(-1).match(/[\p{Script=Han}]/gu) || []).length >= 3);
  const result = compileStyleCandidates(fixture);
  for (const candidate of result.candidates) {
    const html = buildStyleCoverPreview(candidate);
    assert.equal((html.match(/class="title-line"/g) || []).length, lines.length);
  }
});

test('route-aware effect 綁定 semantic role，reduced motion 顯示完整內容', () => {
  const result = compileStyleCandidates(fixture);
  for (const candidate of result.candidates.slice(1)) {
    const html = buildStyleCoverPreview(candidate);
    assert.match(html, /data-effect-title=/);
    assert.match(html, /data-effect-visual-anchor=/);
    assert.match(html, /prefers-reduced-motion:reduce/);
    assert.match(html, /content-visible-without-motion/);
  }
});

test('只有人類可選擇通過 gate 的 StyleSpec', () => {
  const result = compileStyleCandidates(fixture);
  assert.throws(() => selectStyleCandidate(result, 'route-editorial-rail', 'ai'), /人類/);
  const selected = selectStyleCandidate(result, 'route-editorial-rail', 'human');
  assert.equal(selected.status, 'selected');
  assert.equal(selected.style.id, 'route-editorial-rail');
  assert.equal(selected.visualRoute.coverArchetype, 'typography-hero');
});
