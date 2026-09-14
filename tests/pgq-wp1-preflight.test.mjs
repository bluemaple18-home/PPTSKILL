import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import test from 'node:test';
import { mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';
import {
  allocateOutlineItems,
  detectNumericConflicts,
  findUnsupportedCausalInferences,
  partitionClaimsByKind,
  recalculateValue,
  resolveGenerationPermissions,
  sanitizeShareableSourceRefs,
  selectPreflightQuestions,
} from '../runtime/preflight-brief.js';
import { answerQuestion, askQuestion, canDraftOutline, createGrillState, nextQuestion, validateOutline } from '../runtime/grill-outline.js';
import { extractDeckSpec, patchSlideContent } from '../runtime/deck-spec.js';
import { renderExistingDeckWithGate } from '../runtime/workflow-entry.js';
import { buildDistribution } from '../tools/build-distribution.mjs';

const run = promisify(execFile);
const context = { metric: 'revenue', period: '2026-Q2', population: 'Taiwan', unit: 'TWD', currency: 'TWD' };
const claim = (id, value, extra = {}) => ({ id, value, kind: 'fact', ...context, ...extra });
const slide = (id) => ({ id, title: `標題 ${id}`, subtitle: `副標 ${id}`, keyPoints: ['重點一', '重點二', '重點三'] });

test('同一 context 的核心數字不一致時回報 unresolved conflict', () => {
  const conflicts = detectNumericConflicts([claim('a', 100), claim('b', 120)]);
  assert.equal(conflicts.length, 1);
  assert.equal(conflicts[0].status, 'unresolved');
  assert.deepEqual(conflicts[0].claimIds, ['a', 'b']);
});

test('不同 period 的數字不會被合併成衝突', () => {
  assert.deepEqual(detectNumericConflicts([
    claim('a', 100),
    claim('b', 120, { period: '2026-Q3' }),
    claim('c', 130, { population: 'Japan' }),
    claim('d', 140, { currency: 'USD' }),
  ]), []);
});

test('非貨幣數字缺少 currency 時 canonicalize 為 null 並保留 conflict gate', () => {
  const nonCurrency = { metric: 'conversion-rate', period: '2026-Q2', population: 'all-users', unit: 'percent' };
  const conflicts = detectNumericConflicts([
    { id: 'conversion-a', value: 12, kind: 'fact', ...nonCurrency },
    { id: 'conversion-b', value: 15, kind: 'fact', ...nonCurrency },
  ]);
  assert.equal(conflicts.length, 1);
  assert.equal(conflicts[0].context.currency, null);
  assert.equal(conflicts[0].status, 'unresolved');
});

test('只有明確 supersedes 全部衝突 claims 才會自動解決', () => {
  const unresolved = detectNumericConflicts([
    claim('a', 100, { sourceName: 'v1', timestamp: '2026-09-01' }),
    claim('b', 120, { sourceName: 'v2', timestamp: '2026-09-14' }),
  ]);
  assert.equal(unresolved[0].status, 'unresolved');
  const resolved = detectNumericConflicts([claim('a', 100), claim('b', 120, { supersedes: ['a'] })]);
  assert.equal(resolved[0].status, 'resolved');
  assert.equal(resolved[0].winnerId, 'b');
  const partial = detectNumericConflicts([claim('a', 100), claim('b', 110), claim('c', 120, { supersedes: ['a'] })]);
  assert.equal(partial[0].status, 'unresolved');
});

test('fact / derived / inference 分類與三種數值重算由 code 決定', () => {
  const grouped = partitionClaimsByKind([
    claim('f', 10), claim('d', 15, { kind: 'derived' }), claim('i', 20, { kind: 'inference' }),
  ]);
  assert.deepEqual(Object.fromEntries(Object.entries(grouped).map(([key, values]) => [key, values.map(({ id }) => id)])), {
    fact: ['f'], derived: ['d'], inference: ['i'],
  });
  assert.equal(recalculateValue({ operation: 'absolute-delta', baseline: 80, current: 100 }), 20);
  assert.equal(recalculateValue({ operation: 'percent-change', baseline: 80, current: 100 }), 25);
  assert.equal(recalculateValue({ operation: 'percentage-point-change', baseline: 0.2, current: 0.35 }), 0.15);
});

test('percent change 的 baseline 為零時 fail loud', () => {
  assert.throws(() => recalculateValue({ operation: 'percent-change', baseline: 0, current: 10 }), /零/);
});

test('只有 correlation 或 unknown evidence 的 causal inference 會被標記', () => {
  const flags = findUnsupportedCausalInferences([
    claim('bad', 1, { kind: 'inference', relation: 'causal', evidenceRelation: 'correlation' }),
    claim('good', 1, { kind: 'inference', relation: 'causal', evidenceRelation: 'causal' }),
  ]);
  assert.deepEqual(flags.map(({ claimId }) => claimId), ['bad']);
});

test('只有影響 content / evidence / decision 的 high-impact unknown 會追加問題', () => {
  const questions = selectPreflightQuestions({ unknowns: [
    { id: 'core-owner', impact: 'high', affects: ['decision'], question: '誰能核准？' },
    { id: 'minor-color', impact: 'low', affects: ['content'], question: '偏好哪個灰色？' },
    { id: 'high-layout', impact: 'high', affects: ['layout'], question: '卡片要幾欄？' },
  ] });
  assert.deepEqual(questions.map(({ dimension }) => dimension), ['preflight:core-owner']);
});

test('known answers 已有答案時不重問 preflight question', () => {
  const questions = selectPreflightQuestions({
    unknowns: [{ id: 'core-owner', impact: 'high', affects: ['decision'], question: '誰能核准？' }],
    known: { 'preflight:core-owner': '產品負責人' },
  });
  assert.deepEqual(questions, []);
});

test('shareable refs 僅保留 compact allowlist，不洩漏原文與本機路徑', () => {
  const refs = sanitizeShareableSourceRefs([{
    id: 'source-1', label: '公開報告', url: 'https://example.com/report', shareable: true,
    localPath: '/Users/example/private.xlsx', rawBody: 'private', prompt: 'secret', grillTranscript: ['private'], contents: 'private',
  }]);
  assert.deepEqual(refs, [{ id: 'source-1', label: '公開報告', url: 'https://example.com/report', public: true }]);
});

test('圖片與圖表生成預設關閉，只有個別明確授權才開啟', () => {
  assert.deepEqual(resolveGenerationPermissions(), { image: false, chart: false });
  assert.deepEqual(resolveGenerationPermissions({ image: true }), { image: true, chart: false });
  assert.deepEqual(resolveGenerationPermissions({ image: 1, chart: 'yes' }), { image: false, chart: false });
});

test('Main 與 Appendix 共用同一個 15 頁上限', () => {
  const pass = allocateOutlineItems([
    ...Array.from({ length: 12 }, (_, index) => ({ ...slide(`m-${index}`), placement: 'main' })),
    ...Array.from({ length: 3 }, (_, index) => ({ ...slide(`a-${index}`), placement: 'appendix' })),
  ]);
  assert.equal(pass.status, 'pass');
  assert.equal(pass.slides.length, 15);
  assert.equal(pass.slides.at(-1).section, 'appendix');
  assert.equal(allocateOutlineItems([...pass.slides, { ...slide('extra'), placement: 'main' }]).status, 'blocked');
});

test('Drop 不計入 slide count，也不代表刪除 source material', () => {
  const result = allocateOutlineItems([
    { ...slide('main'), placement: 'main', sourceId: 'source-main' },
    { ...slide('drop'), placement: 'drop', sourceId: 'source-drop' },
  ]);
  assert.equal(result.slides.length, 1);
  assert.deepEqual(result.dropped, [{ sourceId: 'source-drop', retainedInSource: true }]);
  assert.equal(result.sourceMaterialDeleted, false);
});

test('preflight question 先於普通 Grill 且維持一次一題與 pressure-test gate', () => {
  const preflightQuestions = [{ dimension: 'preflight:core-owner', question: '誰能核准？', suggestion: '建議答案：指定一位 owner。' }];
  const known = {
    desiredChange: '啟動試行', audienceResistance: '成本', claimEvidence: '內部實測', cta: '確認 owner',
  };
  let state = createGrillState({ materials: [{ id: 'brief', reviewed: true }], known, preflightQuestions });
  const first = askQuestion(state);
  assert.equal(first.result.question.dimension, 'preflight:core-owner');
  assert.equal(nextQuestion(first.state).status, 'waiting');
  state = answerQuestion(first.state, '產品負責人');
  assert.equal(canDraftOutline(state), false);
  assert.equal(nextQuestion(state).question.dimension, 'pressureTest');
  state = answerQuestion(askQuestion(state).state, '最薄弱的假設需要驗證。');
  assert.equal(canDraftOutline(state), true);
});

test('installed Skill 的唯一 preflight seam 執行 conflict、causal 與 derived correctness checks', async () => {
  const root = await mkdtemp(join(tmpdir(), 'pptskill-pgq-wp1-entry-'));
  const archive = join(root, 'PPTSKILL.zip');
  await buildDistribution({ archivePath: archive });
  const extracted = join(root, 'extract');
  await run('/usr/bin/unzip', ['-q', archive, '-d', extracted]);
  const bundle = join(extracted, 'PPTSKILL');
  const installRoot = join(root, 'user', '.pptskill', 'runtime');
  await run(process.execPath, [join(bundle, 'install.mjs'), '--install-root', installRoot]);
  assert.match(await readFile(join(root, 'user', '.codex', 'skills', 'pptskill', 'SKILL.md'), 'utf8'), /workflow-cli\.mjs preflight-new/);
  assert.match(await readFile(join(installRoot, 'adapters', 'codex', 'entry.md'), 'utf8'), /preflight-new --brief/);
  const briefPath = join(root, 'brief.json');
  await writeFile(briefPath, JSON.stringify({
    materials: [{ id: 'metrics', reviewed: true }],
    known: {},
    generationAuthorization: { image: true },
    outlineItems: [
      { ...slide('main'), placement: 'main', sourceId: 'source-main' },
      { ...slide('drop'), placement: 'drop', sourceId: 'source-drop' },
    ],
    claims: [
      { id: 'conversion-a', value: 12, kind: 'fact', metric: 'conversion-rate', period: '2026-Q2', population: 'all-users', unit: 'percent' },
      { id: 'conversion-b', value: 15, kind: 'fact', metric: 'conversion-rate', period: '2026-Q2', population: 'all-users', unit: 'percent' },
      {
        id: 'causal-retention', value: 1, kind: 'inference', metric: 'retention-driver', period: '2026-Q2', population: 'all-users', unit: 'flag',
        relation: 'causal', evidenceRelation: 'correlation',
      },
      {
        id: 'growth-rate', value: 30, kind: 'derived', metric: 'growth-rate', period: '2026-Q2', population: 'all-users', unit: 'percent',
        derivation: { operation: 'percent-change', baseline: 100, current: 120 },
      },
    ],
  }));
  const result = JSON.parse((await run(process.execPath, [join(installRoot, 'core', 'runtime', 'workflow-cli.mjs'), 'preflight-new', '--brief', briefPath])).stdout);
  assert.equal(result.status, 'pass');
  assert.equal(result.mode, 'new-deck-preflight');
  assert.equal(result.conflicts[0].status, 'unresolved');
  assert.deepEqual(result.causalWarnings, [{ claimId: 'causal-retention', evidenceRelation: 'correlation', reason: '現有證據不足以支持因果關係。' }]);
  assert.deepEqual(result.derivedRecalculations, [{
    claimId: 'growth-rate', operation: 'percent-change', baseline: 100, current: 120,
    computedValue: 20, providedValue: 30, status: 'mismatch',
  }]);
  assert.deepEqual(result.generationPermissions, { image: true, chart: false });
  assert.equal(result.outlinePlan.slides[0].section, 'main');
  assert.deepEqual(result.outlinePlan.dropped, [{ sourceId: 'source-drop', retainedInSource: true }]);
  assert.match(result.nextQuestion.question.dimension, /^preflight:numeric-conflict:/);
  assert.match(result.nextQuestion.question.question, /互相衝突/);
  assert.equal(result.grillState.preflightQuestions.some(({ dimension }) => dimension === 'preflight:causal-evidence:causal-retention'), true);
  assert.equal(result.grillState.preflightQuestions.some(({ dimension }) => dimension === 'preflight:derived-value:growth-rate'), true);
});

test('legacy outline 沒有 section 仍可通過驗證', () => {
  const outline = {
    schemaVersion: '1.0', deckTitle: 'Legacy', sourcePolicy: 'user-provided-only', slides: [slide('legacy')],
    approval: { status: 'confirmed', approvedBy: 'human' },
  };
  assert.equal(validateOutline(outline).status, 'pass');
  assert.equal(validateOutline({ ...outline, slides: [{ ...slide('appendix'), section: 'appendix' }] }).status, 'pass');
  assert.equal(validateOutline({ ...outline, slides: [{ ...slide('invalid'), section: 'drop' }] }).status, 'fail');
});

test('核准後內容 mutation 仍須符合既有精確 human change-set gate', async () => {
  const sourceHtml = await readFile(new URL('../evidence/p0-r11/owner-visual/release-company-deck.html', import.meta.url), 'utf8');
  const source = extractDeckSpec(sourceHtml);
  const target = source.slides[0];
  const replacement = 'WP1 不得繞過的核准內容';
  const candidateSpec = patchSlideContent(source, target.id, { subtitle: replacement });
  const baseGate = {
    pressureTestAnswer: '最薄弱的假設仍需驗證。',
    outlineApproval: { status: 'confirmed', approvedBy: 'human' },
    styleSelection: { status: 'selected', approvedBy: 'human', styleId: source.style.id },
  };
  assert.equal(renderExistingDeckWithGate({ sourceHtml, candidateSpec, gate: baseGate }).status, 'blocked');
  const changeSet = {
    approval: { status: 'confirmed', approvedBy: 'human' },
    changes: [{ operation: 'content', slideId: target.id, field: 'subtitle', expected: target.content.subtitle, replacement }],
  };
  assert.equal(renderExistingDeckWithGate({ sourceHtml, candidateSpec, gate: { ...baseGate, changeSet } }).status, 'pass');
});
