const questions = [
  {
    dimension: 'desiredChange',
    question: '這份簡報最後要讓觀眾改變哪個認知、決策或行動？',
    suggestion: '建議答案：用一句可觀察的結果描述，例如「同意在本季啟動試行」。',
  },
  {
    dimension: 'audienceResistance',
    question: '觀眾最可能質疑或反對什麼？',
    suggestion: '建議答案：先寫最可能阻止決策的一個疑慮，而不是列所有風險。',
  },
  {
    dimension: 'claimEvidence',
    question: '哪一項證據最能支撐核心主張？',
    suggestion: '建議答案：優先選可查證的數字、案例或使用者行為；沒有證據就明確標成假設。',
  },
  {
    dimension: 'cta',
    question: '結尾要請觀眾採取哪一個明確的下一步？',
    suggestion: '建議答案：只留一個有負責人或時間點的行動。',
  },
];

const pressureQuestion = {
  dimension: 'pressureTest',
  question: '如果觀眾只記得一句話，哪一句最值得保留，而且最容易被挑戰？',
  suggestion: '建議答案：用一句主張回答，並同時指出它最薄弱的假設。',
};

export function createGrillState({ materials = [], known = {} } = {}) {
  return {
    materials: materials.map((material) => ({ id: material.id, reviewed: material.reviewed === true })),
    resolved: Object.fromEntries(Object.entries(known).filter(([, value]) => typeof value === 'string' && value.trim())),
    asked: [],
    activeQuestion: null,
  };
}

export function nextQuestion(state) {
  if (state.materials.some((material) => !material.reviewed)) {
    return { status: 'blocked', reason: '必須先讀完所有使用者提供的素材。' };
  }
  if (state.activeQuestion) return { status: 'waiting', question: state.activeQuestion };
  const unresolved = questions.find((item) => !state.resolved[item.dimension]);
  if (unresolved) return { status: 'ask', question: { ...unresolved } };
  if (state.asked.length === 0) return { status: 'ask', question: { ...pressureQuestion } };
  return { status: 'complete' };
}

export function askQuestion(state) {
  const result = nextQuestion(state);
  if (result.status !== 'ask') return { state, result };
  return { state: { ...state, activeQuestion: result.question }, result };
}

export function answerQuestion(state, answer) {
  if (!state.activeQuestion) throw new Error('目前沒有等待回答的問題。');
  if (typeof answer !== 'string' || !answer.trim()) throw new Error('回答不可為空。');
  const dimension = state.activeQuestion.dimension;
  return {
    ...state,
    resolved: { ...state.resolved, [dimension]: answer.trim() },
    asked: [...state.asked, dimension],
    activeQuestion: null,
  };
}

export function canDraftOutline(state) {
  const required = questions.map((item) => item.dimension);
  return state.materials.every((material) => material.reviewed)
    && state.asked.length >= 1
    && required.every((dimension) => Boolean(state.resolved[dimension]));
}

export function buildOutline({ state, deckTitle, slides, externalSourceAuthorized = false }) {
  if (!canDraftOutline(state)) throw new Error('Grill Me 尚未完成。');
  return {
    schemaVersion: '1.0',
    deckTitle,
    sourcePolicy: externalSourceAuthorized ? 'external-explicitly-authorized' : 'user-provided-only',
    slides: slides.map((slide) => ({ id: slide.id, title: slide.title, subtitle: slide.subtitle, keyPoints: [...slide.keyPoints] })),
    approval: { status: 'pending', approvedBy: null },
  };
}

export function confirmOutline(outline, approvedBy) {
  if (approvedBy !== 'human') throw new Error('Outline 只能由人類確認。');
  return { ...outline, approval: { status: 'confirmed', approvedBy: 'human' } };
}

export function validateOutline(outline) {
  const errors = [];
  if (outline?.schemaVersion !== '1.0') errors.push('schemaVersion 必須是 1.0。');
  if (!outline?.deckTitle?.trim()) errors.push('缺少 deckTitle。');
  if (!['user-provided-only', 'external-explicitly-authorized'].includes(outline?.sourcePolicy)) errors.push('sourcePolicy 無效。');
  if (!Array.isArray(outline?.slides) || outline.slides.length < 1) errors.push('至少需要一頁。');
  if (outline?.slides?.length > 15) return { status: 'blocked', reason: 'MVP 最多 15 頁；請合併、刪除或拆分簡報。', errors };
  const ids = outline?.slides?.map((slide) => slide.id) ?? [];
  if (ids.some((id) => typeof id !== 'string' || !/^[a-z0-9][a-z0-9._-]{0,79}$/.test(id)) || new Set(ids).size !== ids.length) errors.push('slide ID 缺漏、格式錯誤或重複。');
  for (const slide of outline?.slides ?? []) {
    if (!slide.title?.trim() || !slide.subtitle?.trim()) errors.push(`${slide.id || 'unknown'} 缺少 title 或 subtitle。`);
    if (!Array.isArray(slide.keyPoints) || slide.keyPoints.length < 3 || slide.keyPoints.length > 5 || slide.keyPoints.some((point) => typeof point !== 'string' || !point.trim())) errors.push(`${slide.id || 'unknown'} 必須有 3～5 個非空 keyPoints。`);
  }
  if (errors.length) return { status: 'fail', errors };
  if (outline.approval?.status !== 'confirmed' || outline.approval?.approvedBy !== 'human') return { status: 'blocked', reason: 'Outline 尚未經人類確認。', errors: [] };
  return { status: 'pass', slideCount: outline.slides.length };
}
