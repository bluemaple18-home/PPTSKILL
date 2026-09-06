import assert from 'node:assert/strict';
import test from 'node:test';
import { answerQuestion, askQuestion, buildOutline, confirmOutline, createGrillState, nextQuestion, validateOutline } from '../runtime/grill-outline.js';

const known = {
  desiredChange: '同意啟動試行',
  audienceResistance: '擔心導入成本',
  claimEvidence: '三次內部實測',
  cta: '本週確認 owner',
};

const slides = [{
  id: 's-01',
  title: '為什麼現在要做',
  subtitle: '把簡報產製從個人手藝變成可重用流程',
  keyPoints: ['需求先對齊', '風格由人選擇', '單檔 HTML 可轉傳'],
}];

test('未讀完素材前不得開始提問', () => {
  const state = createGrillState({ materials: [{ id: 'brief', reviewed: true }, { id: 'data', reviewed: false }] });
  assert.equal(nextQuestion(state).status, 'blocked');
});

test('一次只問一題、附建議答案，且不重問素材已知答案', () => {
  const initial = createGrillState({ materials: [{ id: 'brief', reviewed: true }], known: { desiredChange: known.desiredChange } });
  const first = askQuestion(initial);
  assert.equal(first.result.question.dimension, 'audienceResistance');
  assert.match(first.result.question.suggestion, /建議答案/);
  assert.equal(nextQuestion(first.state).status, 'waiting');
  const answered = answerQuestion(first.state, known.audienceResistance);
  assert.equal(nextQuestion(answered).question.dimension, 'claimEvidence');
});

test('素材已完整時仍至少提出一個核心主張壓力測試', () => {
  const state = createGrillState({ materials: [{ id: 'complete', reviewed: true }], known });
  const asked = askQuestion(state);
  assert.equal(asked.result.question.dimension, 'pressureTest');
  const answered = answerQuestion(asked.state, '流程要讓非設計師也能穩定交付；薄弱處是跨 AI 一致性。');
  assert.equal(nextQuestion(answered).status, 'complete');
});

test('完成 Grill 後產生輕量 outline，人工確認前保持 blocked', () => {
  let state = createGrillState({ materials: [{ id: 'complete', reviewed: true }], known });
  state = answerQuestion(askQuestion(state).state, '核心主張與跨 AI 一致性風險。');
  const outline = buildOutline({ state, deckTitle: 'PPTSKILL', slides });
  assert.equal(validateOutline(outline).status, 'blocked');
  assert.equal(validateOutline(confirmOutline(outline, 'human')).status, 'pass');
});

test('缺欄、重複 ID 與 16 頁依規則 fail-loud 或 blocked', () => {
  const base = { schemaVersion: '1.0', deckTitle: 'PPTSKILL', sourcePolicy: 'user-provided-only', slides, approval: { status: 'confirmed', approvedBy: 'human' } };
  assert.equal(validateOutline({ ...base, slides: [{ ...slides[0], subtitle: '', keyPoints: ['一項'] }] }).status, 'fail');
  assert.equal(validateOutline({ ...base, slides: [slides[0], { ...slides[0] }] }).status, 'fail');
  assert.equal(validateOutline({ ...base, slides: Array.from({ length: 16 }, (_, index) => ({ ...slides[0], id: `s-${index}` })) }).status, 'blocked');
});

test('未明確授權時 source policy 固定為 user-provided-only', () => {
  let state = createGrillState({ materials: [{ id: 'complete', reviewed: true }], known });
  state = answerQuestion(askQuestion(state).state, '壓力測試回答');
  assert.equal(buildOutline({ state, deckTitle: 'PPTSKILL', slides }).sourcePolicy, 'user-provided-only');
  assert.throws(() => confirmOutline(buildOutline({ state, deckTitle: 'PPTSKILL', slides }), 'ai'), /人類/);
});
