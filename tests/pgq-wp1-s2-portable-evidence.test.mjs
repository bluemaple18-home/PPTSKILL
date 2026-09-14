import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { createDeckEditor } from '../runtime/deck-editor.js';
import { embedDeckSpec, extractDeckSpec, sanitizeDeckSpec, validateDeckSpec } from '../runtime/deck-spec.js';
import { renderFullDeck } from '../runtime/full-deck-renderer.js';
import { preparePreflightBrief, recalculateValue } from '../runtime/preflight-brief.js';

const fixture = JSON.parse(await readFile(new URL('../fixtures/full-deck-spec.json', import.meta.url), 'utf8'));

const portableClaim = () => ({
  id: 'conversion-uplift',
  kind: 'derived',
  summary: '轉換率提升 15 個百分點',
  slideIds: ['proof'],
  value: 15,
  metric: 'conversion-rate',
  period: '2026-Q2',
  population: 'all-users',
  unit: 'percentage-point',
  derivation: { operation: 'percentage-point-change', baseline: 0.2, current: 0.35, scale: 'ratio', prompt: '不得外洩' },
  sourceRefs: [{
    id: 'public-report', label: '公開報告', url: 'https://example.com/report', public: true,
    sourceAvailableToRecipient: false, localPath: '/Users/private/report.xlsx', rawBody: '不得外洩', reviewReasoning: '不得外洩',
  }],
});

test('portable claim 經 sanitizer、renderer 與 recipient reparse 完整往返', () => {
  const input = structuredClone(fixture);
  const report = preparePreflightBrief({ claims: [portableClaim()] });
  input.claims = report.portableClaims;
  assert.equal(report.portableClaims.length, 1);
  const clean = sanitizeDeckSpec(input);
  const result = renderFullDeck(input);
  assert.equal(result.status, 'pass');
  assert.deepEqual(result.spec.claims, clean.claims);
  assert.deepEqual(extractDeckSpec(result.html).claims, clean.claims);
  assert.doesNotMatch(JSON.stringify(clean.claims), /private|不得外洩|reviewReasoning|rawBody|localPath/);
});

test('browser editor 的 clean/export source 保留同一份 allowlisted claims', () => {
  const input = structuredClone(fixture);
  input.claims = [portableClaim()];
  const editor = createDeckEditor(input);
  editor.editText('opening', 'title', '更新標題');
  assert.equal(editor.getSpec().claims.length, 1);
  assert.deepEqual(editor.getSpec().claims, sanitizeDeckSpec(input).claims);
  const html = embedDeckSpec('<!doctype html><html><body></body></html>', editor.getSpec());
  assert.deepEqual(extractDeckSpec(html).claims, sanitizeDeckSpec(input).claims);
});

test('投影片複製與刪除同步維持 claim linkage 有效', () => {
  const input = structuredClone(fixture);
  input.claims = [portableClaim()];
  const editor = createDeckEditor(input);
  const proofIndex = editor.getSpec().slides.findIndex(({ id }) => id === 'proof');
  const copyId = editor.duplicate(proofIndex);
  assert.deepEqual(editor.getSpec().claims[0].slideIds, ['proof', copyId]);
  editor.delete(editor.getSpec().slides.findIndex(({ id }) => id === 'proof'));
  assert.deepEqual(editor.getSpec().claims[0].slideIds, [copyId]);
  editor.delete(editor.getSpec().slides.findIndex(({ id }) => id === copyId));
  assert.deepEqual(editor.getSpec().claims, []);
});

test('legacy DeckSpec 未帶 claims 時保持原本形狀與相容性', () => {
  const clean = sanitizeDeckSpec(fixture);
  assert.equal('claims' in clean, false);
  assert.equal(validateDeckSpec(clean).status, 'pass');
});

test('percentage-point 明示 ratio 或 percent 時都回傳人類尺度 point delta', () => {
  assert.equal(recalculateValue({ operation: 'percentage-point-change', baseline: 0.2, current: 0.35, scale: 'ratio' }), 15);
  assert.equal(recalculateValue({ operation: 'percentage-point-change', baseline: 20, current: 35, scale: 'percent' }), 15);
  assert.throws(() => recalculateValue({ operation: 'percentage-point-change', baseline: 0.2, current: 0.35 }), /scale/);
  assert.throws(() => recalculateValue({ operation: 'percentage-point-change', baseline: 20, current: 35, scale: 'points' }), /scale/);
});

test('ambiguous percentage-point、重複 claim ID 與不存在 slide linkage fail loud', () => {
  const ambiguous = structuredClone(fixture);
  ambiguous.claims = [{ ...portableClaim(), derivation: { operation: 'percentage-point-change', baseline: 0.2, current: 0.35 } }];
  assert.throws(() => sanitizeDeckSpec(ambiguous), /scale/);

  const duplicate = structuredClone(fixture);
  duplicate.claims = [portableClaim(), portableClaim()];
  assert.equal(validateDeckSpec(sanitizeDeckSpec(duplicate)).status, 'fail');

  const missingSlide = structuredClone(fixture);
  missingSlide.claims = [{ ...portableClaim(), slideIds: ['missing-slide'] }];
  assert.equal(validateDeckSpec(sanitizeDeckSpec(missingSlide)).status, 'fail');
});
