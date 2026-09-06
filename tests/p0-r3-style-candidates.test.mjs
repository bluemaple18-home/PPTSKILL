import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { buildStyleCoverPreview, compileStyleCandidates, selectStyleCandidate, validateRouteDiversity } from '../runtime/style-candidates.js';

const fixture = JSON.parse(await readFile(new URL('../fixtures/style-candidates.json', import.meta.url), 'utf8'));

test('缺少 Company Style Pack 時明確 blocked，不捏造公司風格', () => {
  assert.equal(compileStyleCandidates({ ...fixture, companyStylePack: null }).status, 'blocked');
});

test('候選固定為 Company Style＋三個 dynamic AI routes 且共用相同內容', () => {
  const result = compileStyleCandidates(fixture);
  assert.equal(result.status, 'pass');
  assert.deepEqual(result.candidates.map(({ kind }) => kind), ['company', 'ai', 'ai', 'ai']);
  for (const candidate of result.candidates) assert.deepEqual(candidate.content, fixture.content);
});

test('route diversity validator 拒絕同版面只換色', () => {
  const result = compileStyleCandidates(fixture);
  const base = result.candidates[1].style;
  const recolor = { ...base, id: 'recolor', palette: { ...base.palette, accent: '#ff0000' } };
  assert.equal(validateRouteDiversity([base, recolor]).status, 'fail');
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
  }
});

test('只有人類可選擇通過 gate 的 StyleSpec', () => {
  const result = compileStyleCandidates(fixture);
  assert.throws(() => selectStyleCandidate(result, 'route-editorial-rail', 'ai'), /人類/);
  const selected = selectStyleCandidate(result, 'route-editorial-rail', 'human');
  assert.equal(selected.status, 'selected');
  assert.equal(selected.style.id, 'route-editorial-rail');
});
