const MOTION_EFFECT = 'number-flow-odometer';
const signalKeys = new Set(['slideId', 'effect', 'role', 'targets', 'replay', 'staggerMs']);
const targetKeys = new Set(['ref', 'from']);
const targetPattern = /^content\.keyPoints\.([0-4])$/u;
const metricPattern = /^([$€£¥])?([+-]?(?:\d{1,3}(?:,\d{3})+|\d+)(?:\.(\d+))?)(%)?$/u;

const reason = (code, message, targetRef) => ({ code, message, ...(targetRef ? { targetRef } : {}) });

export function getMotionCapabilities() {
  return {
    version: 1,
    effects: {
      [MOTION_EFFECT]: {
        status: 'supported',
        semanticRole: 'metric',
        primitives: ['metric-grid'],
        provider: { name: 'number-flow', version: '0.6.2', license: 'MIT', bundled: true },
        replay: ['slide-visible'],
        fallback: ['prefers-reduced-motion', 'unsupported-browser', 'static'],
        formatBoundary: 'ascii-decimal-with-optional-grouping-currency-prefix-or-percent-suffix',
      },
    },
  };
}

export function parseMotionMetric(point) {
  if (typeof point !== 'string') return null;
  const [rawValue] = point.split('｜', 1);
  const displayToken = rawValue.trim();
  const match = metricPattern.exec(displayToken);
  if (!match || (match[1] && match[4])) return null;
  const finalValue = Number(match[2].replaceAll(',', ''));
  if (!Number.isFinite(finalValue)) return null;
  const fractionDigits = match[3]?.length ?? 0;
  return {
    displayToken,
    numericDisplay: match[2],
    finalValue,
    numberPrefix: match[1] ?? '',
    numberSuffix: match[4] ?? '',
    format: {
      useGrouping: match[2].includes(','),
      minimumFractionDigits: fractionDigits,
      maximumFractionDigits: fractionDigits,
    },
  };
}

export function sanitizeCompositionMotion(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return null;
  if (input.effect !== MOTION_EFFECT || input.role !== 'metric' || input.replay !== 'slide-visible') return null;
  if (!Number.isInteger(input.staggerMs) || input.staggerMs < 0 || input.staggerMs > 300) return null;
  if (!Array.isArray(input.targets) || input.targets.length < 1 || input.targets.length > 5) return null;
  const targets = [];
  const refs = new Set();
  for (const target of input.targets) {
    if (!target || typeof target !== 'object' || Array.isArray(target)) return null;
    if (!targetPattern.test(target.ref) || !Number.isFinite(target.from) || Math.abs(target.from) > 1e15 || refs.has(target.ref)) return null;
    refs.add(target.ref);
    targets.push({ ref: target.ref, from: target.from });
  }
  return { effect: MOTION_EFFECT, role: 'metric', replay: 'slide-visible', staggerMs: input.staggerMs, targets };
}

const normalizeSignal = (signal) => {
  if (!signal || typeof signal !== 'object' || Array.isArray(signal)) throw new Error('motion signal 必須是 object。');
  const unknown = Object.keys(signal).filter((key) => !signalKeys.has(key));
  if (unknown.length) throw new Error(`${signal.slideId || 'unknown'} motion signal 不允許欄位：${unknown.join(', ')}。`);
  for (const target of signal.targets ?? []) {
    const unknownTarget = target && typeof target === 'object' ? Object.keys(target).filter((key) => !targetKeys.has(key)) : [];
    if (unknownTarget.length) throw new Error(`${signal.slideId || 'unknown'} motion target 不允許欄位：${unknownTarget.join(', ')}。`);
  }
  const compositionMotion = sanitizeCompositionMotion(signal);
  if (!compositionMotion) throw new Error(`${signal.slideId || 'unknown'} motion signal 不符合 NumberFlow allowlist。`);
  return compositionMotion;
};

export function evaluateMotionComposition({ slide, primitive, motionIntensity, compositionMotion }) {
  const reasons = [];
  if (primitive !== 'metric-grid') reasons.push(reason('motion_primitive_unavailable', 'NumberFlow odometer 只支援 metric-grid。'));
  if (motionIntensity === 'none') reasons.push(reason('motion_intensity_none', 'Deck Rhythm Plan 已將此頁 motionIntensity 設為 none。'));
  const resolvedTargets = [];
  for (const target of compositionMotion.targets) {
    const index = Number(targetPattern.exec(target.ref)?.[1]);
    const parsed = parseMotionMetric(slide?.keyPoints?.[index]);
    if (!parsed) {
      reasons.push(reason('motion_metric_format_unavailable', `${target.ref} 不是支援的 ASCII metric token。`, target.ref));
      continue;
    }
    if (target.from === parsed.finalValue) {
      reasons.push(reason('motion_start_equals_final', `${target.ref} 的 from 與 final value 相同，沒有可驗證 transition。`, target.ref));
    }
    resolvedTargets.push({ ref: target.ref, from: target.from, ...parsed });
  }
  return {
    status: reasons.length ? 'unavailable' : 'available',
    ...(reasons.length ? { reasons } : {}),
    resolvedTargets,
  };
}

export function planMotionVocabulary({ slides = [], deckRhythmPlan, motionSignals = [] } = {}) {
  if (!Array.isArray(motionSignals)) throw new Error('motionSignals 必須是陣列。');
  if (motionSignals.length === 0) return null;
  if (!deckRhythmPlan || !Array.isArray(deckRhythmPlan.slides)) throw new Error('Motion planning 需要完整 Deck Rhythm Plan。');
  const slideById = new Map(slides.map((slide) => [slide.id, slide]));
  const rhythmById = new Map(deckRhythmPlan.slides.map((item) => [item.slideId, item]));
  const seen = new Set();
  const proposals = motionSignals.map((signal) => {
    if (!slideById.has(signal?.slideId)) throw new Error(`motionSignals 含未知 slide：${signal?.slideId || 'unknown'}。`);
    if (seen.has(signal.slideId)) throw new Error(`motionSignals 重複 slide：${signal.slideId}。`);
    seen.add(signal.slideId);
    const compositionMotion = normalizeSignal(signal);
    const rhythm = rhythmById.get(signal.slideId);
    if (!rhythm) throw new Error(`${signal.slideId} 缺 Deck Rhythm Plan。`);
    const verdict = evaluateMotionComposition({
      slide: slideById.get(signal.slideId),
      primitive: rhythm.selected.primitive,
      motionIntensity: rhythm.signals.motionIntensity,
      compositionMotion,
    });
    return {
      slideId: signal.slideId,
      effect: compositionMotion.effect,
      role: compositionMotion.role,
      ...verdict,
      ...(verdict.status === 'available' ? { compositionMotion } : {}),
      contentIntegrity: structuredClone(rhythm.contentIntegrity),
    };
  });
  return {
    version: 1,
    status: proposals.every(({ status }) => status === 'available') ? 'ready' : 'ready-with-unavailable',
    capabilities: getMotionCapabilities(),
    proposals,
    contentIntegrity: structuredClone(deckRhythmPlan.contentIntegrity),
  };
}

export function validateSlideMotion(slide) {
  if (slide?.composition?.motion == null) return [];
  const compositionMotion = sanitizeCompositionMotion(slide.composition.motion);
  if (!compositionMotion) return [`${slide.id} 的 CompositionSpec motion 不在 allowlist。`];
  const verdict = evaluateMotionComposition({
    slide: slide.content,
    primitive: slide.composition.primitive,
    motionIntensity: 'medium',
    compositionMotion,
  });
  return verdict.status === 'available' ? [] : verdict.reasons.map(({ message }) => `${slide.id}：${message}`);
}

export function validateDeckMotionInput(spec) {
  return (spec?.slides ?? []).flatMap((slide) => validateSlideMotion(slide));
}

export function buildMotionBrowserContractRuntime() {
  return [
    `const MOTION_EFFECT=${JSON.stringify(MOTION_EFFECT)};`,
    `const targetPattern=${targetPattern.toString()};`,
    `const metricPattern=${metricPattern.toString()};`,
    `const reason=${reason.toString()};`,
    parseMotionMetric.toString(),
    sanitizeCompositionMotion.toString(),
    evaluateMotionComposition.toString(),
    validateSlideMotion.toString(),
  ].join('');
}
