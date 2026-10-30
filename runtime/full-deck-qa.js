import { assertTrustedFullDeckQaEvidence } from './representative-qa-evidence.js';

const CHECK_CODES = Object.freeze(['content_integrity', 'geometry', 'static_readability', 'animation_interference']);
const ADVISORY_CODES = new Set(['structural_density', 'hierarchy_ambiguity', 'image_insufficient', 'motion_distraction']);
const ADVISORY_STATUSES = new Set(['advisory', 'resolved', 'accepted-risk', 'unknown']);
const ADVISORY_FIELDS = new Set(['code', 'slideIds', 'status', 'reason', 'evidenceRefs']);
const ADVISORY_REVIEW_FIELDS = new Set(['completed', 'reviewedBy', 'identityFingerprint', 'evidenceRefs', 'findingCount']);
const CONFIRMATION_FIELDS = new Set(['confirmed', 'confirmedBy', 'identityFingerprint', 'evidenceRef', 'acceptedRiskCodes']);
const HISTORY_FIELDS = new Set(['slideId', 'code', 'action', 'result']);
const REPAIR_RESULTS = new Set(['failed', 'passed']);
const MAX_REPAIRS_PER_ISSUE = 2;
const ACTIONS = Object.freeze({
  content_integrity: ['restore-approved-content', 'request-human-content-reconciliation'],
  geometry: ['safer-composition', 'split-slide'],
  static_readability: ['safer-composition', 'split-slide'],
  animation_interference: ['force-static-motion', 'disable-optional-background'],
});

const assertFields = (value, fields, label) => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error(`${label} 必須是 object。`);
  const unknown = Object.keys(value).filter((key) => !fields.has(key));
  if (unknown.length) throw new Error(`${label} 不允許欄位：${unknown.join(', ')}。`);
};
const assertReference = (value, label) => {
  if (typeof value !== 'string' || !value.trim() || value.length > 256) throw new Error(`${label} 必須是 1～256 字元 reference。`);
  return value;
};
const issueIdFor = (slideId, code) => `${slideId}:${code}`;

export function evaluateFullDeckQa({ evidence, advisoryReview = null, advisories = [], ownerConfirmation = null, repairHistory = [], lastSuccessfulEvidence = null }) {
  const trusted = assertTrustedFullDeckQaEvidence(evidence);
  const { identity, checks, evidenceRefs } = trusted;
  const slideSet = new Set(identity.slideIds);
  const expectedIssues = identity.slideIds.flatMap((slideId) => CHECK_CODES.map((code) => issueIdFor(slideId, code)));
  const checkMap = new Map();
  for (const check of checks) {
    const issueId = issueIdFor(check.slideId, check.code);
    if (!slideSet.has(check.slideId) || !CHECK_CODES.includes(check.code) || checkMap.has(issueId)) throw new Error('Trusted full-deck checks 的 coverage 無效。');
    checkMap.set(issueId, check);
  }
  if (checkMap.size !== expectedIssues.length || expectedIssues.some((issueId) => !checkMap.has(issueId))) throw new Error('Trusted full-deck checks 未完整覆蓋 canonical slides。');

  if (!Array.isArray(repairHistory)) throw new Error('repairHistory 必須是陣列。');
  const attemptsByIssue = new Map();
  for (const record of repairHistory) {
    assertFields(record, HISTORY_FIELDS, 'repair history');
    if (!slideSet.has(record.slideId) || !CHECK_CODES.includes(record.code) || !REPAIR_RESULTS.has(record.result)) throw new Error('repair history 不在 full-deck allowlist。');
    const issueId = issueIdFor(record.slideId, record.code);
    const attempt = attemptsByIssue.get(issueId) ?? 0;
    if (record.action !== ACTIONS[record.code][attempt]) throw new Error(`${issueId} repair history action 與共用 bounded sequence 不一致。`);
    attemptsByIssue.set(issueId, attempt + 1);
  }
  const hardIssues = expectedIssues.flatMap((issueId) => {
    const check = checkMap.get(issueId);
    if (check.status === 'pass') return [];
    const attemptsUsed = attemptsByIssue.get(issueId) ?? 0;
    return [{ ...check, issueId, attemptsUsed, attemptsRemaining: Math.max(0, MAX_REPAIRS_PER_ISSUE - attemptsUsed) }];
  });
  const base = {
    version: 1,
    identity,
    layer1: { status: hardIssues.length ? 'fail' : 'pass', coverage: [...identity.slideIds], issues: hardIssues, evidenceRefs: { ...evidenceRefs } },
    samplePassDoesNotImplyFullDeckPass: true,
    fullDeckQaRequired: true,
    repairBudget: { maxPerIssue: MAX_REPAIRS_PER_ISSUE },
    preservedLastSuccess: lastSuccessfulEvidence == null ? null : assertReference(lastSuccessfulEvidence, 'lastSuccessfulEvidence'),
  };
  if (hardIssues.length) {
    if (hardIssues.some(({ attemptsUsed }) => attemptsUsed >= MAX_REPAIRS_PER_ISSUE)) return { status: 'blocked', ...base, advisories: [], ownerConfirmation: { status: 'not-evaluated' }, nextActions: [], humanAction: '同一問題已完成兩次 repair；請保留最後成功 artifact、拆頁或手動重設計。' };
    const nextActions = hardIssues.map(({ issueId, slideId, code, attemptsUsed }) => ({ issueId, slideId, code, action: ACTIONS[code][attemptsUsed], attempt: attemptsUsed + 1 }));
    return { status: 'repair', ...base, advisories: [], ownerConfirmation: { status: 'not-evaluated' }, nextActions };
  }

  if (!Array.isArray(advisories)) throw new Error('advisories 必須是陣列。');
  const allowedRefs = new Set(Object.values(evidenceRefs));
  const advisoryKeys = new Set();
  const normalizedAdvisories = advisories.map((item) => {
    assertFields(item, ADVISORY_FIELDS, 'Layer-2 advisory');
    if (!ADVISORY_CODES.has(item.code) || !ADVISORY_STATUSES.has(item.status)) throw new Error('Layer-2 advisory code/status 不在 allowlist。');
    if (!Array.isArray(item.slideIds) || !item.slideIds.length || item.slideIds.some((id) => !slideSet.has(id)) || new Set(item.slideIds).size !== item.slideIds.length) throw new Error('Layer-2 advisory slideIds 必須是唯一 canonical slides。');
    if (typeof item.reason !== 'string' || !item.reason.trim() || item.reason.length > 500) throw new Error('Layer-2 advisory 必須提供 bounded reason。');
    if (!Array.isArray(item.evidenceRefs) || !item.evidenceRefs.length || item.evidenceRefs.some((ref) => !allowedRefs.has(ref))) throw new Error('Layer-2 advisory 必須引用本次 trusted evidence。');
    const key = `${item.code}:${[...item.slideIds].sort().join(',')}`;
    if (advisoryKeys.has(key)) throw new Error('Layer-2 advisory 不得重複。');
    advisoryKeys.add(key);
    return { ...item, slideIds: [...item.slideIds], evidenceRefs: [...item.evidenceRefs] };
  });
  if (advisoryReview === null) return { status: 'blocked', ...base, advisories: normalizedAdvisories, advisoryReview: { status: 'required' }, ownerConfirmation: { status: 'not-evaluated' }, nextActions: [], humanAction: '必須完成綁定目前 artifact identity 的 Layer-2 結構／閱讀風險 review。' };
  assertFields(advisoryReview, ADVISORY_REVIEW_FIELDS, 'Layer-2 advisory review');
  if (advisoryReview.completed !== true || advisoryReview.reviewedBy !== 'ai') throw new Error('Layer-2 advisory review 必須由 AI 明示完成，不得以 PASS score 代替。');
  if (advisoryReview.identityFingerprint !== identity.identityFingerprint) throw new Error('Layer-2 advisory review identity 已失效；必須對目前 artifact 重跑。');
  if (!Array.isArray(advisoryReview.evidenceRefs) || !advisoryReview.evidenceRefs.length || advisoryReview.evidenceRefs.some((ref) => !allowedRefs.has(ref))) throw new Error('Layer-2 advisory review 必須引用本次 trusted evidence。');
  if (!Number.isInteger(advisoryReview.findingCount) || advisoryReview.findingCount !== normalizedAdvisories.length) throw new Error('Layer-2 advisory review findingCount 與 findings 不一致。');
  const advisoryReviewResult = { status: 'completed', reviewedBy: 'ai', evidenceRefs: [...advisoryReview.evidenceRefs], findingCount: advisoryReview.findingCount };
  if (normalizedAdvisories.some(({ status }) => status === 'unknown')) return { status: 'blocked', ...base, advisories: normalizedAdvisories, advisoryReview: advisoryReviewResult, ownerConfirmation: { status: 'not-evaluated' }, nextActions: [], humanAction: 'Layer-2 UNKNOWN 必須補證據，不得硬給 PASS。' };
  if (ownerConfirmation === null) return { status: 'awaiting-owner', ...base, advisories: normalizedAdvisories, advisoryReview: advisoryReviewResult, ownerConfirmation: { status: 'required' }, nextActions: [] };

  assertFields(ownerConfirmation, CONFIRMATION_FIELDS, 'Layer-3 Owner confirmation');
  if (ownerConfirmation.confirmed !== true || ownerConfirmation.confirmedBy !== 'human') throw new Error('Layer-3 必須由 human 明示確認。');
  if (ownerConfirmation.identityFingerprint !== identity.identityFingerprint) throw new Error('Layer-3 confirmation identity 已失效；必須對目前 artifact 重新確認。');
  assertReference(ownerConfirmation.evidenceRef, 'Layer-3 evidenceRef');
  if (!Array.isArray(ownerConfirmation.acceptedRiskCodes) || new Set(ownerConfirmation.acceptedRiskCodes).size !== ownerConfirmation.acceptedRiskCodes.length || ownerConfirmation.acceptedRiskCodes.some((code) => !ADVISORY_CODES.has(code))) throw new Error('Layer-3 acceptedRiskCodes 必須是唯一 allowlisted codes。');
  const accepted = new Set(ownerConfirmation.acceptedRiskCodes);
  if (normalizedAdvisories.some(({ status, code }) => status === 'accepted-risk' && !accepted.has(code))) throw new Error('Layer-2 accepted-risk 必須由 Layer-3 confirmation 明示涵蓋。');
  const unresolved = normalizedAdvisories.filter(({ status }) => status === 'advisory');
  if (unresolved.length) return { status: 'repair', ...base, advisories: normalizedAdvisories, advisoryReview: advisoryReviewResult, ownerConfirmation: { status: 'confirmed', evidenceRef: ownerConfirmation.evidenceRef }, nextActions: unresolved.map(({ code, slideIds }) => ({ code, slideIds, action: 'resolve-structural-readability-risk' })) };
  return { status: 'pass', ...base, advisories: normalizedAdvisories, advisoryReview: advisoryReviewResult, ownerConfirmation: { status: 'confirmed', evidenceRef: ownerConfirmation.evidenceRef, acceptedRiskCodes: [...ownerConfirmation.acceptedRiskCodes] }, nextActions: [] };
}
