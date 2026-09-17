const roleWeight = Object.freeze({ opening: 0, buildup: 5, proof: 4, decision: 5, close: 1, transition: 1 });

const indexBySlide = (items = []) => new Map(items.map((item) => [item.slideId, item]));

const addReason = (reasons, condition, code) => {
  if (condition) reasons.push(code);
};

const compareIds = (left, right) => left < right ? -1 : left > right ? 1 : 0;

const compareRanked = (left, right, field) => right[field] - left[field]
  || left.index - right.index
  || compareIds(left.slideId, right.slideId);

const entry = (candidate, role, reasonCodes) => ({
  slideId: candidate.slideId,
  role,
  reasonCodes: [...new Set(reasonCodes)],
});

export function planRepresentativeSamples({ outline, sampleCount, deckRhythmPlan, motionPlan, backgroundPlan }) {
  const base = {
    version: 1,
    slideIds: [],
    entries: [],
    requiresApprovalBeforeRemaining: sampleCount > 0,
    fullDeckQaRequired: true,
  };
  if (sampleCount === 0) return base;

  const slides = outline.slides;
  const actualCount = Math.min(sampleCount, slides.length);
  const hasPlannerTruth = Boolean(deckRhythmPlan?.slides?.length);
  if (!hasPlannerTruth) {
    const selected = slides.slice(0, actualCount);
    const entries = selected.length === 1
      ? [entry({ slideId: selected[0].id }, 'both', ['outline_order_fallback'])]
      : selected.map((slide, index) => entry({ slideId: slide.id }, index === 0 ? 'typical' : 'stress', ['outline_order_fallback']));
    return { ...base, slideIds: entries.map(({ slideId }) => slideId), entries };
  }

  const rhythmBySlide = indexBySlide(deckRhythmPlan.slides);
  const motionBySlide = indexBySlide(motionPlan?.proposals);
  const backgroundBySlide = indexBySlide(backgroundPlan?.proposals);
  const warningCodesBySlide = new Map();
  for (const warning of deckRhythmPlan.warnings ?? []) {
    for (const slideId of warning.slideIds ?? []) {
      const codes = warningCodesBySlide.get(slideId) ?? [];
      codes.push(warning.code);
      warningCodesBySlide.set(slideId, codes);
    }
  }
  const familyCounts = new Map();
  for (const item of deckRhythmPlan.slides) {
    const family = item.selected?.compositionFamily ?? item.selected?.primitive ?? null;
    if (family) familyCounts.set(family, (familyCounts.get(family) ?? 0) + 1);
  }
  const dominantCount = Math.max(0, ...familyCounts.values());

  const candidates = slides.map((slide, index) => {
    const rhythm = rhythmBySlide.get(slide.id);
    const signals = rhythm?.signals ?? {};
    const family = rhythm?.selected?.compositionFamily ?? rhythm?.selected?.primitive ?? null;
    const warnings = warningCodesBySlide.get(slide.id) ?? [];
    const motion = motionBySlide.get(slide.id);
    const background = backgroundBySlide.get(slide.id);
    const typicalReasons = [];
    const stressReasons = [];

    addReason(typicalReasons, ['buildup', 'proof', 'decision'].includes(signals.sectionRole), 'main_narrative_role');
    addReason(typicalReasons, family && familyCounts.get(family) === dominantCount, 'dominant_composition_family');
    addReason(typicalReasons, index > 0 && index < slides.length - 1, 'non_edge_slide');
    addReason(typicalReasons, signals.density === 'medium', 'representative_density');

    addReason(stressReasons, signals.density === 'high', 'high_density');
    addReason(stressReasons, signals.evidenceWeight === 'high', 'high_evidence');
    addReason(stressReasons, signals.motionIntensity === 'high', 'high_motion');
    addReason(stressReasons, signals.emphasis === 'highlight', 'highlight_emphasis');
    addReason(stressReasons, warnings.length > 0, 'rhythm_warning');
    addReason(stressReasons, motion?.status === 'available', 'foreground_motion');
    addReason(stressReasons, background?.status === 'available' && background.effect !== 'none', 'background_effect');
    const keyPointCount = Array.isArray(slide.keyPoints) ? slide.keyPoints.length : 0;
    addReason(stressReasons, keyPointCount > 4, 'high_keypoint_count');

    return {
      slideId: slide.id,
      index,
      typicalReasons,
      stressReasons,
      typicalScore: (roleWeight[signals.sectionRole] ?? 0)
        + (family && familyCounts.get(family) === dominantCount ? 3 : 0)
        + (index > 0 && index < slides.length - 1 ? 2 : 0)
        + (signals.density === 'medium' ? 2 : 0),
      stressScore: (signals.density === 'high' ? 4 : 0)
        + (signals.evidenceWeight === 'high' ? 4 : 0)
        + (signals.motionIntensity === 'high' ? 3 : 0)
        + (signals.emphasis === 'highlight' ? 2 : 0)
        + Math.min(4, warnings.length * 2)
        + (motion?.status === 'available' ? 2 : 0)
        + (background?.status === 'available' && background.effect !== 'none' ? 2 : 0)
        + (keyPointCount > 4 ? 1 : 0),
    };
  });

  if (actualCount === 1) {
    const selected = [...candidates].sort((left, right) => {
      const score = (candidate) => candidate.typicalScore + candidate.stressScore;
      return score(right) - score(left) || left.index - right.index || compareIds(left.slideId, right.slideId);
    })[0];
    const reasons = [...selected.typicalReasons, ...selected.stressReasons];
    const entries = [entry(selected, 'both', reasons.length ? reasons : ['outline_order_fallback'])];
    return { ...base, slideIds: entries.map(({ slideId }) => slideId), entries };
  }

  const typical = [...candidates].sort((left, right) => compareRanked(left, right, 'typicalScore'))[0];
  const stress = candidates.filter(({ slideId }) => slideId !== typical.slideId)
    .sort((left, right) => compareRanked(left, right, 'stressScore'))[0];
  const entries = [
    entry(typical, 'typical', typical.typicalReasons.length ? typical.typicalReasons : ['outline_order_fallback']),
    entry(stress, 'stress', stress.stressReasons.length ? stress.stressReasons : ['outline_order_fallback']),
  ];
  return { ...base, slideIds: entries.map(({ slideId }) => slideId), entries };
}
