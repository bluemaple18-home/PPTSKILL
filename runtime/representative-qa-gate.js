import { layoutRepairSequence } from './layout-repair-policy.js';

const CHECK_CODES = Object.freeze(['content_integrity', 'geometry', 'static_readability', 'animation_interference']);
const CHECK_STATUSES = new Set(['pass', 'fail', 'not_run', 'unknown']);
const CHECK_FIELDS = new Set(['slideId', 'code', 'status', 'evidenceRef']);
const HISTORY_FIELDS = new Set(['slideId', 'code', 'action', 'result']);
const SAMPLE_FIELDS = new Set(['version', 'slideIds', 'entries', 'requiresApprovalBeforeRemaining', 'fullDeckQaRequired']);
const SAMPLE_ENTRY_FIELDS = new Set(['slideId', 'role', 'reasonCodes']);
const REPAIR_RESULTS = new Set(['failed', 'passed']);
const MAX_REPAIRS_PER_ISSUE = 2;
const ACTIONS = Object.freeze({
  content_integrity: ['restore-approved-content', 'request-human-content-reconciliation'],
  geometry: [layoutRepairSequence[0], layoutRepairSequence[2]],
  static_readability: [layoutRepairSequence[0], layoutRepairSequence[2]],
  animation_interference: ['force-static-motion', 'disable-optional-background'],
});

const issueIdFor = (slideId, code) => `${slideId}:${code}`;
const assertSafeReference = (value, label) => {
  if (typeof value !== 'string' || !value.trim() || value.length > 256) throw new Error(`${label} 必須是 1～256 字元 evidence reference。`);
  return value;
};
const assertKnownFields = (item, fields, label) => {
  if (!item || typeof item !== 'object' || Array.isArray(item)) throw new Error(`${label} 必須是 object。`);
  const unknown = Object.keys(item).filter((key) => !fields.has(key));
  if (unknown.length) throw new Error(`${label} 不允許欄位：${unknown.join(', ')}。`);
};

export function evaluateRepresentativeQa({ sample, checks, repairHistory = [], lastSuccessfulEvidence = null }) {
  assertKnownFields(sample, SAMPLE_FIELDS, 'representative sample');
  if (sample.version !== 1 || sample.fullDeckQaRequired !== true || sample.requiresApprovalBeforeRemaining !== true) {
    throw new Error('Representative sample shape 必須保留 version=1、approval wait 與 full-deck QA。');
  }
  if (!Array.isArray(sample?.entries) || sample.entries.length < 1) throw new Error('Representative sample entries 不可為空。');
  if (sample.entries.length > 2) throw new Error('Representative sample 最多只能有兩筆 entries。');
  for (const entry of sample.entries) {
    assertKnownFields(entry, SAMPLE_ENTRY_FIELDS, 'representative sample entry');
    if (!Array.isArray(entry.reasonCodes) || entry.reasonCodes.length < 1
      || entry.reasonCodes.some((code) => typeof code !== 'string' || !/^[a-z0-9_]{1,64}$/u.test(code))
      || new Set(entry.reasonCodes).size !== entry.reasonCodes.length) {
      throw new Error('Representative sample entry reasonCodes 必須是非空、唯一的 bounded codes。');
    }
  }
  const sampleSlideIds = sample.entries.map(({ slideId }) => slideId);
  if (sampleSlideIds.some((slideId) => typeof slideId !== 'string' || !slideId)
    || new Set(sampleSlideIds).size !== sampleSlideIds.length) throw new Error('Representative sample slideId 缺漏或重複。');
  if (!Array.isArray(sample.slideIds) || sample.slideIds.length !== sampleSlideIds.length
    || sample.slideIds.some((slideId, index) => slideId !== sampleSlideIds[index])) throw new Error('Representative sample slideIds 與 entries 不一致。');
  const roles = sample.entries.map(({ role }) => role);
  if ((roles.length === 1 && roles[0] !== 'both')
    || (roles.length === 2 && (roles[0] !== 'typical' || roles[1] !== 'stress'))) {
    throw new Error('Representative sample role shape 必須是單張 both 或兩張 typical + stress。');
  }
  const sampleSet = new Set(sampleSlideIds);
  if (!Array.isArray(checks)) throw new Error('checks 必須是陣列。');

  const checkByIssue = new Map();
  for (const check of checks) {
    assertKnownFields(check, CHECK_FIELDS, 'hard check');
    if (!sampleSet.has(check.slideId)) throw new Error(`${check.slideId} 不在 representative sample。`);
    if (!CHECK_CODES.includes(check.code)) throw new Error(`${check.slideId} hard check code 不在 allowlist。`);
    if (!CHECK_STATUSES.has(check.status)) throw new Error(`${check.slideId}:${check.code} status 無效。`);
    assertSafeReference(check.evidenceRef, `${check.slideId}:${check.code}`);
    const issueId = issueIdFor(check.slideId, check.code);
    if (checkByIssue.has(issueId)) throw new Error(`hard check 重複：${issueId}。`);
    checkByIssue.set(issueId, { ...check, issueId });
  }
  const expectedIssueIds = sampleSlideIds.flatMap((slideId) => CHECK_CODES.map((code) => issueIdFor(slideId, code)));
  const missing = expectedIssueIds.filter((issueId) => !checkByIssue.has(issueId));
  if (missing.length || checkByIssue.size !== expectedIssueIds.length) throw new Error(`hard checks 必須完整覆蓋 sample：${missing.join(', ') || '出現額外項目'}。`);

  if (!Array.isArray(repairHistory)) throw new Error('repairHistory 必須是陣列。');
  const attemptsByIssue = new Map();
  for (const record of repairHistory) {
    assertKnownFields(record, HISTORY_FIELDS, 'repair history');
    if (!sampleSet.has(record.slideId)) throw new Error(`${record.slideId} repair history 不在 representative sample。`);
    if (!CHECK_CODES.includes(record.code)) throw new Error(`${record.slideId} repair history code 不在 allowlist。`);
    if (!REPAIR_RESULTS.has(record.result)) throw new Error(`${record.slideId}:${record.code} repair result 無效。`);
    const issueId = issueIdFor(record.slideId, record.code);
    const attempts = attemptsByIssue.get(issueId) ?? 0;
    const expectedAction = ACTIONS[record.code][attempts];
    if (!expectedAction || record.action !== expectedAction) throw new Error(`${issueId} repair history action 與 bounded sequence 不一致。`);
    attemptsByIssue.set(issueId, attempts + 1);
  }

  const issues = expectedIssueIds.flatMap((issueId) => {
    const check = checkByIssue.get(issueId);
    if (check.status === 'pass') return [];
    const attemptsUsed = attemptsByIssue.get(issueId) ?? 0;
    return [{
      issueId,
      slideId: check.slideId,
      code: check.code,
      status: check.status,
      evidenceRef: check.evidenceRef,
      attemptsUsed,
      attemptsRemaining: Math.max(0, MAX_REPAIRS_PER_ISSUE - attemptsUsed),
    }];
  });
  const preservedLastSuccess = lastSuccessfulEvidence == null ? null : assertSafeReference(lastSuccessfulEvidence, 'lastSuccessfulEvidence');
  const base = {
    version: 1,
    issues,
    nextActions: [],
    repairBudget: { maxPerIssue: MAX_REPAIRS_PER_ISSUE },
    preservedLastSuccess,
    fullDeckQaRequired: true,
  };
  if (!issues.length) return { status: 'pass', ...base };
  if (issues.some(({ status }) => status === 'not_run' || status === 'unknown')) {
    return { status: 'blocked', ...base, humanAction: '請補齊可重播 hard evidence；不得把 NOT_RUN／UNKNOWN 當 PASS。' };
  }
  if (issues.some(({ attemptsUsed }) => attemptsUsed >= MAX_REPAIRS_PER_ISSUE)) {
    return { status: 'blocked', ...base, humanAction: '同一問題已完成兩次 repair；請由人類選擇保留最後成功 artifact、拆頁或手動重設計。' };
  }
  const nextActions = issues.map(({ issueId, slideId, code, attemptsUsed }) => ({
    issueId,
    slideId,
    code,
    action: ACTIONS[code][attemptsUsed],
    attempt: attemptsUsed + 1,
  }));
  return { status: 'repair', ...base, nextActions };
}
