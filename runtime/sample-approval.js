import { createHash } from 'node:crypto';
import { sanitizeDeckSpec } from './deck-spec.js';
import { evaluateRepresentativeQa } from './representative-qa-gate.js';

const CONTRACT_PATTERN = /^[a-z0-9][a-z0-9._-]{0,63}$/u;
const FEEDBACK_CODES = Object.freeze({
  'slide-local': new Set(['adjust-composition', 'reduce-density', 'clarify-hierarchy']),
  'deck-wide': new Set(['adjust-style-density', 'adjust-typography-scale', 'adjust-spacing']),
  'profile-opt-in': new Set(['remember-style-preference', 'remember-density-preference']),
});
const SCOPE_ORDER = Object.freeze(['slide-local', 'deck-wide', 'profile-opt-in']);
const FEEDBACK_FIELDS = Object.freeze({
  'slide-local': new Set(['scope', 'code', 'targetSlideId']),
  'deck-wide': new Set(['scope', 'code']),
  'profile-opt-in': new Set(['scope', 'code', 'remember']),
});

const stableValue = (value) => {
  if (Array.isArray(value)) return value.map(stableValue);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.keys(value).sort().map((key) => [key, stableValue(value[key])]));
  }
  return value;
};
const stableJson = (value) => JSON.stringify(stableValue(value));
const fingerprint = (value) => createHash('sha256').update(stableJson(value)).digest('hex');
const assertReference = (value, label) => {
  if (typeof value !== 'string' || !value.trim() || value.length > 256) throw new Error(`${label} 必須是 1～256 字元 reference。`);
  return value;
};
const assertExactFields = (value, allowed, label) => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error(`${label} 必須是 object。`);
  const unknown = Object.keys(value).filter((key) => !allowed.has(key));
  if (unknown.length) throw new Error(`${label} 不允許欄位：${unknown.join(', ')}。`);
};
const assertUniqueSlideIds = (deck, label) => {
  const ids = deck.slides.map(({ id }) => id);
  if (new Set(ids).size !== ids.length) throw new Error(`${label} slide IDs 必須唯一。`);
};

const planFeedback = ({ feedback, sampleIds, remainingIds }) => {
  if (!Array.isArray(feedback)) throw new Error('feedback 必須是陣列。');
  const sampleSet = new Set(sampleIds);
  return feedback.map((item) => {
    const scope = item?.scope;
    if (!SCOPE_ORDER.includes(scope)) throw new Error('feedback scope 不在 allowlist。');
    assertExactFields(item, FEEDBACK_FIELDS[scope], `${scope} feedback`);
    if (!FEEDBACK_CODES[scope].has(item.code)) throw new Error(`${scope} feedback code 不在 allowlist。`);
    if (scope === 'slide-local') {
      if (!sampleSet.has(item.targetSlideId)) throw new Error('slide-local feedback target 必須是 representative sample slide。');
      return { scope, code: item.code, targetSlideIds: [item.targetSlideId] };
    }
    if (scope === 'deck-wide') return { scope, code: item.code, targetSlideIds: [...remainingIds] };
    if (item.remember !== true) throw new Error('profile-opt-in feedback 必須明示 remember=true。');
    return { scope, code: item.code, targetSlideIds: [], profileWriteRequired: true };
  }).sort((left, right) => SCOPE_ORDER.indexOf(left.scope) - SCOPE_ORDER.indexOf(right.scope)
    || left.code.localeCompare(right.code)
    || stableJson(left.targetSlideIds).localeCompare(stableJson(right.targetSlideIds)));
};

export function approveRepresentativeSample({
  sample,
  hardGateRequest,
  deckSpec,
  approval,
  feedback = [],
  contractVersion,
  currentDeckSpec = null,
  currentContractVersion = null,
}) {
  if (stableJson(sample) !== stableJson(hardGateRequest?.sample)) throw new Error('hard gate sample 與 approval sample 不一致。');
  const hardGate = evaluateRepresentativeQa(hardGateRequest);
  if (hardGate.status !== 'pass') throw new Error('Representative hard gate 必須 PASS 才能核准 sample。');
  assertExactFields(approval, new Set(['approved', 'approvedBy', 'evidenceRef']), 'approval');
  if (approval.approved !== true || approval.approvedBy !== 'human') throw new Error('Sample approval 必須由 human 明確核准。');
  assertReference(approval.evidenceRef, 'approval evidenceRef');
  if (!CONTRACT_PATTERN.test(contractVersion)) throw new Error('contractVersion 必須是 bounded version ID。');

  const sanitized = sanitizeDeckSpec(deckSpec);
  assertUniqueSlideIds(sanitized, 'approval DeckSpec');
  const slideById = new Map(sanitized.slides.map((slide) => [slide.id, slide]));
  const frozenSample = sample.entries.map(({ slideId, role }) => {
    const slide = slideById.get(slideId);
    if (!slide) throw new Error(`DeckSpec 缺少 representative sample slide：${slideId}。`);
    return {
      slideId,
      role,
      contentFingerprint: fingerprint(slide.content),
      compositionFingerprint: fingerprint(slide.composition),
    };
  });
  const freezeCore = {
    version: 1,
    deckId: sanitized.deckId,
    contractVersion,
    styleFingerprint: fingerprint(sanitized.style),
    sample: frozenSample,
    approval: { approvedBy: 'human', evidenceRef: approval.evidenceRef },
  };
  const freeze = { ...freezeCore, approvalFingerprint: fingerprint(freezeCore) };
  const sampleIds = frozenSample.map(({ slideId }) => slideId);
  const sampleSet = new Set(sampleIds);
  const remainingIds = sanitized.slides.map(({ id }) => id).filter((id) => !sampleSet.has(id));
  const feedbackPlan = planFeedback({ feedback, sampleIds, remainingIds });
  const feedbackInvalidations = new Set(feedbackPlan.filter(({ scope }) => scope === 'slide-local').flatMap(({ targetSlideIds }) => targetSlideIds));

  let current = null;
  let globalReasons = [];
  if (currentDeckSpec !== null || currentContractVersion !== null) {
    if (!currentDeckSpec || !CONTRACT_PATTERN.test(currentContractVersion)) throw new Error('currentDeckSpec 與 currentContractVersion 必須一起提供。');
    current = sanitizeDeckSpec(currentDeckSpec);
    assertUniqueSlideIds(current, 'current DeckSpec');
    if (current.deckId !== sanitized.deckId) throw new Error('current DeckSpec deckId 與 approval freeze 不一致。');
    if (fingerprint(current.style) !== freeze.styleFingerprint) globalReasons.push('style_changed');
    if (currentContractVersion !== contractVersion) globalReasons.push('contract_version_changed');
  }

  const currentSlides = new Map((current?.slides ?? []).map((slide) => [slide.id, slide]));
  const sampleStates = frozenSample.map((frozen) => {
    const reasonCodes = [];
    if (feedbackInvalidations.has(frozen.slideId)) reasonCodes.push('slide_feedback_pending');
    reasonCodes.push(...globalReasons);
    if (current) {
      const slide = currentSlides.get(frozen.slideId);
      if (!slide) reasonCodes.push('sample_slide_missing');
      else {
        if (fingerprint(slide.content) !== frozen.contentFingerprint) reasonCodes.push('content_changed');
        if (fingerprint(slide.composition) !== frozen.compositionFingerprint) reasonCodes.push('composition_changed');
      }
    }
    return {
      slideId: frozen.slideId,
      status: reasonCodes.length ? 'invalidated' : 'preserved',
      reasonCodes,
      contentFingerprint: frozen.contentFingerprint,
      compositionFingerprint: frozen.compositionFingerprint,
    };
  });
  const hasInvalidation = sampleStates.some(({ status }) => status === 'invalidated');
  const profileWriteRequired = feedbackPlan.some((item) => item.profileWriteRequired === true);
  return {
    status: 'pass',
    freeze,
    feedbackPlan,
    sampleStates,
    profileWriteRequired,
    remainingDeckAction: hasInvalidation
      ? 'repair-and-reapprove-invalidated-sample'
      : feedbackPlan.length ? 'apply-approved-feedback-to-unapproved-slides' : 'continue-generation-from-approved-freeze',
    fullDeckQaRequired: true,
  };
}
