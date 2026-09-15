import { createCompositionProposal } from './semantic-composition-planner.js';

const signalKeys = new Set(['slideId', 'density', 'emphasis', 'evidenceWeight', 'motionIntensity', 'sectionRole', 'continuityGroup']);
const enums = Object.freeze({
  density: ['low', 'medium', 'high'],
  emphasis: ['quiet', 'normal', 'highlight'],
  evidenceWeight: ['low', 'medium', 'high'],
  motionIntensity: ['none', 'low', 'medium', 'high'],
  sectionRole: ['opening', 'buildup', 'proof', 'decision', 'close', 'transition'],
});
const semanticScoreTolerance = 10;
const repetitionWindow = 4;

const normalizeSignal = (signal, slideId) => {
  if (!signal || typeof signal !== 'object' || Array.isArray(signal)) throw new Error(`${slideId} rhythm signal 必須是 object。`);
  const unknown = Object.keys(signal).filter((key) => !signalKeys.has(key));
  if (unknown.length) throw new Error(`${slideId} rhythm signal 不允許欄位：${unknown.join(', ')}。`);
  for (const [field, allowed] of Object.entries(enums)) {
    if (!allowed.includes(signal[field])) throw new Error(`${slideId} rhythm signal ${field} 必須是 ${allowed.join('、')}。`);
  }
  if (signal.continuityGroup != null
    && (typeof signal.continuityGroup !== 'string' || !/^[A-Za-z0-9._-]{1,64}$/u.test(signal.continuityGroup))) {
    throw new Error(`${slideId} rhythm signal continuityGroup 必須是安全的短 ID。`);
  }
  return {
    density: signal.density,
    emphasis: signal.emphasis,
    evidenceWeight: signal.evidenceWeight,
    motionIntensity: signal.motionIntensity,
    sectionRole: signal.sectionRole,
    continuityGroup: signal.continuityGroup ?? null,
  };
};

const indexBySlide = (items, label) => {
  const indexed = new Map();
  for (const item of items) {
    if (!item?.slideId) throw new Error(`${label} 缺少 slideId。`);
    if (indexed.has(item.slideId)) throw new Error(`${label} 重複 slide：${item.slideId}。`);
    indexed.set(item.slideId, item);
  }
  return indexed;
};

const selectedShape = (candidate, reference) => ({
  rank: candidate.rank,
  primitive: candidate.primitive,
  semanticScore: candidate.score,
  compositionFamily: candidate.primitive,
  goldenLogicRef: reference?.logicRef ?? null,
  visualAnchorFamily: reference?.designLogic?.visualAnchor ?? null,
});

const optionsFor = (proposal, routing) => proposal.rankedCandidates.flatMap((candidate) => {
  if (candidate.status !== 'available') throw new Error(`${proposal.slideId}/${candidate.primitive} 不是 available candidate。`);
  const routed = routing.candidates.find((item) => item.rank === candidate.rank && item.primitive === candidate.primitive);
  if (!routed) throw new Error(`${proposal.slideId}/${candidate.primitive} 缺 Golden routing。`);
  const references = routed.references.length ? routed.references : [null];
  return references.map((reference, referenceRank) => ({ candidate, reference, referenceRank, selected: selectedShape(candidate, reference) }));
});

const sameRun = (slides, field, value) => slides.length >= repetitionWindow - 1
  && slides.slice(-(repetitionWindow - 1)).every(({ selected }) => selected[field] === value);

const repeatedDimensions = (slides, selected) => [
  ...(sameRun(slides, 'compositionFamily', selected.compositionFamily) ? ['composition'] : []),
  ...(selected.goldenLogicRef && sameRun(slides, 'goldenLogicRef', selected.goldenLogicRef) ? ['golden_logic'] : []),
  ...(selected.visualAnchorFamily && sameRun(slides, 'visualAnchorFamily', selected.visualAnchorFamily) ? ['visual_anchor'] : []),
];

const isIntentionalRun = (slides, continuityGroup) => Boolean(continuityGroup)
  && slides.length >= repetitionWindow - 1
  && slides.slice(-(repetitionWindow - 1)).every(({ signals }) => signals.continuityGroup === continuityGroup);

const differenceCount = (baseline, option) => ['compositionFamily', 'goldenLogicRef', 'visualAnchorFamily']
  .filter((field) => baseline[field] !== option.selected[field]).length;

const warning = (code, slideIds, reasonCodes) => ({ code, slideIds: [...slideIds], reasonCodes });

const runWarnings = (slides) => {
  const warnings = [];
  for (let end = repetitionWindow - 1; end < slides.length; end += 1) {
    const run = slides.slice(end - repetitionWindow + 1, end + 1);
    const slideIds = run.map(({ slideId }) => slideId);
    if (run.every(({ signals }) => signals.density === 'high' && signals.emphasis === 'highlight')) {
      warnings.push(warning('high_density_emphasis_run', slideIds, ['four_consecutive_high_density_highlight_slides']));
    }
    if (run.every(({ signals }) => signals.motionIntensity === 'high')) {
      warnings.push(warning('high_motion_run', slideIds, ['four_consecutive_high_motion_slides']));
    }
    if (run.every(({ signals }) => signals.evidenceWeight === 'high')) {
      warnings.push(warning('high_evidence_run', slideIds, ['four_consecutive_high_evidence_slides']));
    }
  }
  if (slides.length >= repetitionWindow && slides.every(({ signals }) => signals.emphasis !== 'quiet')) {
    warnings.push(warning('quiet_emphasis_absent', slides.map(({ slideId }) => slideId), ['deck_has_no_quiet_emphasis_slide']));
  }
  for (let index = 1; index < slides.length; index += 1) {
    if (slides[index - 1].signals.sectionRole === 'transition' && slides[index].signals.sectionRole === 'transition') {
      warnings.push(warning('consecutive_transitions', [slides[index - 1].slideId, slides[index].slideId], ['adjacent_transition_roles']));
    }
  }
  const roleOrder = { opening: 0, buildup: 1, proof: 2, decision: 3, close: 4 };
  let priorRole = null;
  for (const item of slides) {
    if (item.signals.sectionRole === 'transition') {
      priorRole = null;
      continue;
    }
    const currentRole = roleOrder[item.signals.sectionRole];
    if (priorRole != null && currentRole < priorRole) {
      warnings.push(warning('section_role_regression', [item.slideId], ['narrative_role_moves_backward']));
    }
    priorRole = currentRole;
  }
  if (slides[0]?.signals.sectionRole !== 'opening') {
    warnings.push(warning('opening_role_missing', [slides[0].slideId], ['first_slide_not_opening']));
  }
  if (!['decision', 'close'].includes(slides.at(-1)?.signals.sectionRole)) {
    warnings.push(warning('closing_role_missing', [slides.at(-1).slideId], ['last_slide_not_decision_or_close']));
  }
  return warnings;
};

export function planDeckRhythm({ slides = [], compositionProposals = [], goldenRouting = [], rhythmSignals = [] } = {}) {
  if (!Array.isArray(rhythmSignals)) throw new Error('rhythmSignals 必須是陣列。');
  if (rhythmSignals.length === 0) return null;
  if (!Array.isArray(slides) || !Array.isArray(compositionProposals) || !Array.isArray(goldenRouting)) {
    throw new Error('Deck Rhythm Plan 輸入必須是陣列。');
  }
  if (compositionProposals.length !== slides.length) throw new Error('Deck Rhythm Plan 需要完整 Slice 2 composition proposals。');
  if (goldenRouting.length !== slides.length) throw new Error('Deck Rhythm Plan 需要完整 Golden routing。');

  const slideIds = new Set(slides.map(({ id }) => id));
  const signalsBySlide = new Map();
  for (const signal of rhythmSignals) {
    if (!slideIds.has(signal?.slideId)) throw new Error(`rhythmSignals 含未知 slide：${signal?.slideId || 'unknown'}。`);
    if (signalsBySlide.has(signal.slideId)) throw new Error(`rhythmSignals 重複 slide：${signal.slideId}。`);
    signalsBySlide.set(signal.slideId, normalizeSignal(signal, signal.slideId));
  }
  if (signalsBySlide.size !== slides.length) throw new Error('rhythmSignals 必須完整覆蓋所有 outline slides。');

  const proposalsBySlide = indexBySlide(compositionProposals, 'compositionProposals');
  const routingBySlide = indexBySlide(goldenRouting, 'goldenRouting');
  const plannedSlides = [];
  const warnings = [];

  for (const slide of slides) {
    const proposal = proposalsBySlide.get(slide.id);
    const routing = routingBySlide.get(slide.id);
    if (!proposal || !routing) throw new Error(`${slide.id} 缺 Slice 2／3 planning data。`);
    if (!proposal.contentIntegrity?.unchanged || !routing.contentIntegrity?.unchanged) throw new Error(`${slide.id} content integrity 未通過。`);
    const signals = signalsBySlide.get(slide.id);
    if (signals.density !== proposal.semantic?.density) throw new Error(`${slide.id} rhythm density 必須與 Slice 2 semantic density 一致。`);
    const options = optionsFor(proposal, routing);
    if (!options.length) throw new Error(`${slide.id} 沒有 available rhythm candidate。`);
    const baseline = options[0];
    const repeated = repeatedDimensions(plannedSlides, baseline.selected);
    const intentional = repeated.length > 0 && isIntentionalRun(plannedSlides, signals.continuityGroup);
    const bounded = options.filter(({ candidate }) => baseline.candidate.score - candidate.score <= semanticScoreTolerance);
    let chosen = baseline;

    if (repeated.length > 0 && !intentional) {
      const alternates = bounded.slice(1)
        .map((option) => ({ option, difference: differenceCount(baseline.selected, option) }))
        .filter(({ difference }) => difference > 0)
        .sort((left, right) => right.difference - left.difference
          || right.option.candidate.score - left.option.candidate.score
          || left.option.candidate.rank - right.option.candidate.rank
          || left.option.referenceRank - right.option.referenceRank);
      if (alternates.length) chosen = alternates[0].option;
    }

    const changed = chosen !== baseline;
    const previous = plannedSlides.at(-1);
    const selectedRepeats = previous && previous.selected.compositionFamily === chosen.selected.compositionFamily
      && previous.selected.goldenLogicRef === chosen.selected.goldenLogicRef;
    const continuityRelation = !previous ? 'start'
      : intentional && selectedRepeats ? 'intentional-repeat'
        : signals.continuityGroup && signals.continuityGroup === previous.signals.continuityGroup ? 'continuation'
          : selectedRepeats ? 'repeat' : 'contrast';
    const deckReasonCodes = [
      ...(intentional ? ['intentional_repetition_preserved'] : []),
      ...(changed && baseline.selected.compositionFamily !== chosen.selected.compositionFamily ? ['composition_repetition_reduced'] : []),
      ...(changed && baseline.selected.goldenLogicRef !== chosen.selected.goldenLogicRef ? ['golden_logic_repetition_reduced'] : []),
      ...(changed && baseline.selected.visualAnchorFamily !== chosen.selected.visualAnchorFamily ? ['visual_anchor_repetition_reduced'] : []),
      ...(!changed && !intentional ? ['top_semantic_candidate_preserved'] : []),
    ];

    const discardedAlternates = options.filter((option) => option !== chosen).map((option) => ({
      rank: option.candidate.rank,
      primitive: option.candidate.primitive,
      semanticScore: option.candidate.score,
      goldenLogicRef: option.reference?.logicRef ?? null,
      reasonCodes: baseline.candidate.score - option.candidate.score > semanticScoreTolerance
        ? ['semantic_score_gap_exceeds_10']
        : option === baseline && changed ? ['deck_rhythm_repetition_conflict'] : ['lower_ranked_or_unused_candidate'],
    }));

    const planned = {
      slideId: slide.id,
      signals,
      selected: chosen.selected,
      compositionProposal: createCompositionProposal(chosen.candidate.primitive, proposal.semantic?.component),
      continuity: { relation: continuityRelation, group: signals.continuityGroup },
      deckReasonCodes,
      discardedAlternates,
      contentIntegrity: structuredClone(proposal.contentIntegrity),
    };
    plannedSlides.push(planned);

    if (repeated.length > 0 && !intentional && !changed) {
      const ids = plannedSlides.slice(-repetitionWindow).map(({ slideId }) => slideId);
      for (const dimension of repeated) {
        warnings.push(warning(`${dimension}_repetition_unresolved`, ids, [`no_semantically_bounded_${dimension}_alternate`]));
      }
    }
  }

  warnings.push(...runWarnings(plannedSlides));
  const integritySlides = plannedSlides.map(({ slideId, contentIntegrity }) => ({ slideId, ...structuredClone(contentIntegrity) }));
  return {
    version: 1,
    status: warnings.length ? 'ready-with-warnings' : 'ready',
    semanticScoreTolerance,
    slides: plannedSlides,
    warnings,
    contentIntegrity: { unchanged: integritySlides.every(({ unchanged }) => unchanged), slides: integritySlides },
  };
}
