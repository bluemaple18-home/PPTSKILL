import { createGrillState, nextQuestion } from './grill-outline.js';
import { sanitizePortableDerivation } from './deck-spec.js';

const comparableFields = ['metric', 'period', 'population', 'unit', 'currency'];
const requiredComparableFields = ['metric', 'period', 'unit'];
const affectedSurfaces = new Set(['content', 'evidence', 'decision']);
const claimKinds = ['fact', 'derived', 'inference'];

const compactNumber = (value) => Number(value.toFixed(12));
const nonEmptyText = (value) => typeof value === 'string' && value.trim();

const comparableKey = (claim) => {
  if (!claim || !nonEmptyText(claim.id) || !Number.isFinite(claim.value)) return null;
  if (requiredComparableFields.some((field) => !nonEmptyText(claim[field]))) return null;
  return JSON.stringify(comparableFields.map((field) => nonEmptyText(claim[field]) ? claim[field].trim() : null));
};

export function findIncompleteNumericClaims(claims = []) {
  return claims.flatMap((claim) => {
    if (!claim || !nonEmptyText(claim.id) || !Number.isFinite(claim.value)) return [];
    const missingFields = requiredComparableFields.filter((field) => !nonEmptyText(claim[field]));
    return missingFields.length ? [{ claimId: claim.id, missingFields }] : [];
  });
}

export function detectNumericConflicts(claims = []) {
  const groups = new Map();
  for (const item of claims) {
    const key = comparableKey(item);
    if (!key) continue;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(item);
  }
  const conflicts = [];
  for (const [key, group] of groups) {
    if (new Set(group.map(({ value }) => value)).size < 2) continue;
    const winner = group.find((candidate) => {
      const conflictingIds = group.filter(({ value }) => value !== candidate.value).map(({ id }) => id);
      return conflictingIds.length > 0
        && Array.isArray(candidate.supersedes)
        && conflictingIds.every((id) => candidate.supersedes.includes(id));
    });
    conflicts.push({
      context: Object.fromEntries(comparableFields.map((field, index) => [field, JSON.parse(key)[index]])),
      claimIds: group.map(({ id }) => id),
      values: [...new Set(group.map(({ value }) => value))],
      status: winner ? 'resolved' : 'unresolved',
      ...(winner ? { winnerId: winner.id } : {}),
    });
  }
  return conflicts;
}

export function partitionClaimsByKind(claims = []) {
  const result = Object.fromEntries(claimKinds.map((kind) => [kind, []]));
  for (const item of claims) if (claimKinds.includes(item?.kind)) result[item.kind].push(item);
  return result;
}

export function findUnsupportedCausalInferences(claims = []) {
  return claims
    .filter((item) => item?.kind === 'inference' && item.relation === 'causal' && item.evidenceRelation !== 'causal')
    .map((item) => ({ claimId: item.id, evidenceRelation: item.evidenceRelation || 'unknown', reason: '現有證據不足以支持因果關係。' }));
}

export function recalculateValue({ operation, baseline, current, scale } = {}) {
  if (!Number.isFinite(baseline) || !Number.isFinite(current)) throw new Error('baseline 與 current 必須是有限數字。');
  if (operation === 'absolute-delta') return compactNumber(current - baseline);
  if (operation === 'percentage-point-change') {
    if (scale === 'ratio') return compactNumber((current - baseline) * 100);
    if (scale === 'percent') return compactNumber(current - baseline);
    throw new Error('percentage-point change 必須明示 scale: ratio | percent。');
  }
  if (operation === 'percent-change') {
    if (baseline === 0) throw new Error('percent change 的 baseline 不可為零。');
    return compactNumber(((current - baseline) / baseline) * 100);
  }
  throw new Error(`不支援的重算 operation：${operation || 'unknown'}。`);
}

export function recalculateDerivedClaims(claims = []) {
  return claims.filter((claim) => claim?.kind === 'derived').map((claim) => {
    const derivation = claim.derivation;
    if (!derivation || typeof derivation !== 'object') return { claimId: claim.id, status: 'blocked', reason: 'derived claim 缺少 derivation。' };
    try {
      const computedValue = recalculateValue(derivation);
      const providedValue = Number.isFinite(claim.value) ? claim.value : null;
      return {
        claimId: claim.id,
        operation: derivation.operation,
        baseline: derivation.baseline,
        current: derivation.current,
        computedValue,
        providedValue,
        status: providedValue === computedValue ? 'pass' : 'mismatch',
      };
    } catch (error) {
      return { claimId: claim.id, operation: derivation.operation, status: 'blocked', reason: error.message };
    }
  });
}

export function selectPreflightQuestions({ unknowns = [], known = {} } = {}) {
  const seen = new Set();
  return unknowns.flatMap((item) => {
    const dimension = nonEmptyText(item?.dimension) ? item.dimension.trim() : nonEmptyText(item?.id) ? `preflight:${item.id.trim()}` : '';
    const affects = Array.isArray(item?.affects) ? item.affects : [];
    const answered = nonEmptyText(known[dimension]) || (nonEmptyText(item?.id) && nonEmptyText(known[item.id]));
    if (!dimension || seen.has(dimension) || item?.impact !== 'high' || !affects.some((value) => affectedSurfaces.has(value)) || !nonEmptyText(item.question) || answered) return [];
    seen.add(dimension);
    return [{
      dimension,
      question: item.question.trim(),
      suggestion: nonEmptyText(item.suggestion) ? item.suggestion.trim() : '建議答案：只補足會影響內容、證據或決策的必要資訊。',
    }];
  });
}

export function resolveGenerationPermissions({ image = false, chart = false } = {}) {
  return { image: image === true, chart: chart === true };
}

export function sanitizeShareableSourceRefs(sources = []) {
  return sources.flatMap((source) => {
    if (source?.shareable !== true) return [];
    const id = nonEmptyText(source.id) ? source.id.trim() : '';
    const label = nonEmptyText(source.label) ? source.label.trim() : '';
    if (!id && !label) return [];
    const url = nonEmptyText(source.url) && /^https?:\/\//.test(source.url.trim()) ? source.url.trim() : '';
    return [{ ...(id ? { id } : {}), ...(label ? { label } : {}), ...(url ? { url } : {}), public: true, sourceAvailableToRecipient: source.sourceAvailableToRecipient === true }];
  });
}

export function preparePortableClaims(claims = []) {
  return claims.flatMap((claim) => {
    if (!nonEmptyText(claim?.id) || !claimKinds.includes(claim.kind) || !nonEmptyText(claim.summary) || !Array.isArray(claim.slideIds) || claim.slideIds.length < 1) return [];
    const derivation = claim.kind === 'derived' ? sanitizePortableDerivation(claim.derivation) : null;
    if (claim.kind === 'derived' && !derivation) return [];
    return [{
      id: claim.id.trim(),
      kind: claim.kind,
      summary: claim.summary.trim(),
      slideIds: claim.slideIds.filter(nonEmptyText).map((id) => id.trim()),
      ...(Number.isFinite(claim.value) ? { value: claim.value } : {}),
      ...Object.fromEntries(['metric', 'period', 'population', 'unit', 'currency']
        .flatMap((field) => nonEmptyText(claim[field]) ? [[field, claim[field].trim()]] : [])),
      ...(['causal', 'correlation', 'descriptive'].includes(claim.relation) ? { relation: claim.relation } : {}),
      ...(['causal', 'correlation', 'descriptive', 'unknown'].includes(claim.evidenceRelation) ? { evidenceRelation: claim.evidenceRelation } : {}),
      ...(derivation ? { derivation } : {}),
      sourceRefs: sanitizeShareableSourceRefs(claim.sourceRefs),
    }];
  });
}

export function allocateOutlineItems(items = []) {
  const slides = [];
  const dropped = [];
  for (const item of items) {
    const placement = item?.placement || item?.section || 'main';
    if (!['main', 'appendix', 'drop'].includes(placement)) throw new Error(`未知 outline placement：${placement}。`);
    if (placement === 'drop') {
      dropped.push({ sourceId: item.sourceId || item.id, retainedInSource: true });
      continue;
    }
    slides.push({ id: item.id, title: item.title, subtitle: item.subtitle, keyPoints: [...(item.keyPoints || [])], section: placement });
  }
  if (slides.length > 15) return { status: 'blocked', reason: 'Main 與 Appendix 合計最多 15 頁。', slideCount: slides.length, dropped, sourceMaterialDeleted: false };
  return { status: 'pass', slides, dropped, sourceMaterialDeleted: false };
}

export function preparePreflightBrief({ materials = [], known = {}, claims = [], unknowns = [], generationAuthorization, outlineItems } = {}) {
  const conflicts = detectNumericConflicts(claims);
  const incompleteNumericClaims = findIncompleteNumericClaims(claims);
  const causalWarnings = findUnsupportedCausalInferences(claims);
  const derivedRecalculations = recalculateDerivedClaims(claims);
  const portableClaims = preparePortableClaims(claims);
  const conflictUnknowns = conflicts.filter(({ status }) => status === 'unresolved').map(({ claimIds }) => ({
    id: `numeric-conflict:${claimIds.join(':')}`,
    impact: 'high',
    affects: ['content', 'evidence'],
    question: `數值主張 ${claimIds.join(' / ')} 在相同 context 下互相衝突；哪一筆應採用，或是否有明確 supersession？`,
  }));
  const contextUnknowns = incompleteNumericClaims.map(({ claimId, missingFields }) => ({
    id: `numeric-context:${claimId}`,
    impact: 'high',
    affects: ['content', 'evidence'],
    question: `數值主張 ${claimId} 缺少可比較 context（${missingFields.join('、')}）；請補足後再判定。`,
  }));
  const causalUnknowns = causalWarnings.map(({ claimId, evidenceRelation }) => ({
    id: `causal-evidence:${claimId}`,
    impact: 'high',
    affects: ['content', 'evidence'],
    question: `主張 ${claimId} 使用因果敘述，但現有證據關係是 ${evidenceRelation}；要移除因果句，還是補充因果證據？`,
  }));
  const derivedUnknowns = derivedRecalculations.filter(({ status }) => status !== 'pass').map(({ claimId, status, computedValue, providedValue, reason }) => ({
    id: `derived-value:${claimId}`,
    impact: 'high',
    affects: ['content', 'evidence'],
    question: status === 'mismatch'
      ? `衍生值 ${claimId} 的提供值 ${providedValue} 與程式重算值 ${computedValue} 不一致；請確認採用重算值或修正輸入。`
      : `衍生值 ${claimId} 無法由程式重算（${reason}）；請修正計算輸入。`,
  }));
  const preflightQuestions = selectPreflightQuestions({ unknowns: [...conflictUnknowns, ...contextUnknowns, ...causalUnknowns, ...derivedUnknowns, ...unknowns], known });
  const grillState = createGrillState({ materials, known, preflightQuestions });
  const outlinePlan = Array.isArray(outlineItems) ? allocateOutlineItems(outlineItems) : null;
  return {
    status: outlinePlan?.status === 'blocked' ? 'blocked' : 'pass',
    mode: 'new-deck-preflight',
    ...(outlinePlan?.status === 'blocked' ? { reason: outlinePlan.reason } : {}),
    conflicts,
    incompleteNumericClaims,
    causalWarnings,
    derivedRecalculations,
    portableClaims,
    generationPermissions: resolveGenerationPermissions(generationAuthorization),
    ...(outlinePlan ? { outlinePlan } : {}),
    grillState,
    nextQuestion: nextQuestion(grillState),
  };
}
