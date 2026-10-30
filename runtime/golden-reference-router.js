import { getGoldenDesignGrammar } from './design-grammar.js';

const styleArchetypesByMove = Object.freeze({
  'asymmetric-grid': ['minimal-institutional', 'architectural-negative-space', 'image-type-asymmetry', 'object-product-hero'],
  'split-proof': ['graphic-brand-field', 'image-type-asymmetry', 'typography-hero'],
  'editorial-rail': ['typography-hero', 'minimal-institutional', 'architectural-negative-space'],
  'technical-map': ['information-led-cover'],
  'full-bleed-type': ['typography-hero', 'full-bleed-editorial', 'cropped-type-image', 'dark-premium-editorial'],
});

const styleArchetypesByLanguage = Object.freeze({
  executive: ['minimal-institutional', 'architectural-negative-space', 'object-product-hero', 'information-led-cover'],
  technical: ['information-led-cover'],
  editorial: ['typography-hero', 'full-bleed-editorial', 'dark-premium-editorial', 'minimal-institutional'],
  energetic: ['graphic-brand-field', 'image-type-asymmetry', 'cropped-type-image'],
  narrative: ['typography-hero', 'full-bleed-editorial', 'dark-premium-editorial', 'cropped-type-image', 'minimal-institutional'],
});

const semanticArchetypesByPrimitive = Object.freeze({
  cover: ['typography-hero', 'full-bleed-editorial', 'architectural-negative-space', 'image-type-asymmetry', 'graphic-brand-field', 'object-product-hero', 'dark-premium-editorial', 'information-led-cover', 'cropped-type-image', 'minimal-institutional'],
  'section-break': ['typography-hero', 'minimal-institutional', 'architectural-negative-space', 'graphic-brand-field', 'information-led-cover'],
  'title-points': ['typography-hero', 'minimal-institutional', 'architectural-negative-space', 'graphic-brand-field', 'information-led-cover'],
  'split-proof': ['typography-hero', 'information-led-cover', 'graphic-brand-field', 'image-type-asymmetry', 'minimal-institutional'],
  'metric-grid': ['information-led-cover', 'typography-hero', 'graphic-brand-field'],
  'process-flow': ['information-led-cover', 'graphic-brand-field', 'typography-hero'],
  'component-focus': ['information-led-cover', 'typography-hero', 'minimal-institutional', 'architectural-negative-space', 'image-type-asymmetry', 'full-bleed-editorial', 'object-product-hero', 'dark-premium-editorial'],
});

const anchorsByPrimitive = Object.freeze({
  cover: ['display-type', 'scene-photograph', 'spatial-void', 'masked-image', 'brand-geometry', 'hero-object', 'information-form'],
  'section-break': ['display-type', 'spatial-void', 'brand-geometry', 'information-form'],
  'title-points': ['display-type', 'spatial-void', 'brand-geometry', 'information-form'],
  'split-proof': ['display-type', 'spatial-void', 'brand-geometry', 'masked-image', 'information-form'],
  'metric-grid': ['information-form', 'display-type', 'brand-geometry'],
  'process-flow': ['information-form', 'brand-geometry', 'display-type'],
});

const componentAnchors = Object.freeze({
  image: ['scene-photograph', 'masked-image', 'hero-object'],
  chart: ['information-form'],
  table: ['information-form'],
  text: ['display-type', 'spatial-void'],
  citation: ['display-type', 'spatial-void'],
});

const antiPatternGuardByGrammarText = Object.freeze({
  'generic Canva or AI-template look': 'exclude_generic_template',
  'mechanical 50/50 image-and-copy containers': 'exclude_mechanical_50_50',
  'gradient, glow, shadow or radius used as the main premium signal': 'exclude_effect_as_premium_signal',
  'random per-node effects or unbounded CSS': 'exclude_unbounded_css',
  'motion used to rescue weak static composition': 'exclude_motion_rescue',
  'industry-template taxonomy': 'exclude_industry_taxonomy',
  'pixel-copy of reference slides': 'exclude_pixel_copy',
});

const imageAnchors = new Set(['scene-photograph', 'masked-image', 'hero-object']);
const has = (items, value) => Array.isArray(items) && items.includes(value);

const assertStyle = (styleSpecId, styleSpec) => {
  if (!styleSpec || typeof styleSpec !== 'object') return;
  if (typeof styleSpec.id !== 'string' || !styleSpec.id || styleSpec.id !== styleSpecId) throw new Error('StyleSpec ID 必須與 styleSpecId 一致。');
  if (!styleArchetypesByMove[styleSpec.layout?.primaryMove]) throw new Error(`StyleSpec primaryMove 尚未支援 Golden routing：${styleSpec.layout?.primaryMove || 'unknown'}。`);
  if (!styleArchetypesByLanguage[styleSpec.layout?.compositionLanguage]) throw new Error(`StyleSpec compositionLanguage 尚未支援 Golden routing：${styleSpec.layout?.compositionLanguage || 'unknown'}。`);
  if (!['low', 'medium', 'high'].includes(styleSpec.density)) throw new Error('StyleSpec density 必須是 low、medium 或 high。');
};

const expectedAnchors = (proposal, candidate) => candidate.primitive === 'component-focus'
  ? componentAnchors[proposal.semantic?.component?.type] ?? []
  : anchorsByPrimitive[candidate.primitive] ?? [];

const antiPatternConflicts = (proposal, route) => {
  const conflicts = [];
  const requiresSemanticImage = imageAnchors.has(route.visualAnchor) || route.imageTreatment !== 'none';
  if (requiresSemanticImage && proposal.semantic?.component?.type !== 'image') {
    conflicts.push('anti_pattern_conflict_missing_semantic_image');
  }
  if (/50\s*[/:-]\s*50/u.test(route.dominantRegionRatio)) conflicts.push('anti_pattern_conflict_mechanical_50_50');
  return conflicts;
};

const designLogic = (route) => ({
  hierarchy: { titlePlacement: route.titlePlacement, typePersonality: route.typePersonality },
  negativeSpace: route.negativeSpaceStrategy,
  visualAnchor: route.visualAnchor,
  surfaceLanguage: route.surfaceLanguage,
  density: route.density,
  imageTreatment: route.imageTreatment,
  effectLanguage: route.effectLanguage,
  dominantRegionRatio: route.dominantRegionRatio,
});

const evaluateLogic = ({ logicRef, route, proposal, candidate, styleSpec }) => {
  const semanticMatch = has(semanticArchetypesByPrimitive[candidate.primitive], logicRef);
  const anchorMatch = has(expectedAnchors(proposal, candidate), route.visualAnchor);
  const moveMatch = has(styleArchetypesByMove[styleSpec.layout.primaryMove], logicRef);
  const languageMatch = has(styleArchetypesByLanguage[styleSpec.layout.compositionLanguage], logicRef);
  const densityMatch = route.density === styleSpec.density || route.density === proposal.semantic?.density;
  const antiPatternConflict = antiPatternConflicts(proposal, route);
  const preferenceIndex = semanticArchetypesByPrimitive[candidate.primitive]?.indexOf(logicRef) ?? -1;
  const score = (semanticMatch ? 40 : 0) + (anchorMatch ? 25 : 0) + (moveMatch ? 20 : 0)
    + (languageMatch ? 20 : 0) + (densityMatch ? 10 : 0) + Math.max(0, 8 - preferenceIndex);
  const reasonCodes = [
    ...(semanticMatch ? [`semantic_match_${candidate.primitive.replaceAll('-', '_')}`] : []),
    ...(densityMatch ? [`density_match_${route.density}`] : []),
    ...(anchorMatch ? [`anchor_match_${route.visualAnchor.replaceAll('-', '_')}`] : []),
    ...(moveMatch ? [`style_match_move_${styleSpec.layout.primaryMove.replaceAll('-', '_')}`] : []),
    ...(languageMatch ? [`style_match_language_${styleSpec.layout.compositionLanguage}`] : []),
    ...(antiPatternConflict.length === 0 ? ['anti_pattern_clear'] : antiPatternConflict),
  ];
  return {
    logicRef,
    score,
    credible: semanticMatch && anchorMatch && moveMatch && languageMatch && antiPatternConflict.length === 0,
    routing: {
      semanticMatch: semanticMatch ? [`primitive_${candidate.primitive}`] : [],
      densityMatch: densityMatch ? [`density_${route.density}`] : [],
      anchorMatch: anchorMatch ? [`visual_anchor_${route.visualAnchor}`] : [],
      styleMatch: [
        ...(moveMatch ? [`primary_move_${styleSpec.layout.primaryMove}`] : []),
        ...(languageMatch ? [`composition_language_${styleSpec.layout.compositionLanguage}`] : []),
      ],
      antiPatternConflict,
    },
    reasonCodes,
    designLogic: designLogic(route),
    evidenceRefs: route.evidenceRefs.slice(0, 3),
  };
};

export function routeGoldenReferences({ compositionProposals = [], styleSpecId, styleSpec } = {}) {
  if (!styleSpec) return [];
  assertStyle(styleSpecId, styleSpec);
  if (!Array.isArray(compositionProposals)) throw new Error('compositionProposals 必須是陣列。');
  const grammar = getGoldenDesignGrammar();
  const antiPatternGuardCodes = grammar.globalAntiPatterns.map((pattern) => antiPatternGuardByGrammarText[pattern]);
  if (antiPatternGuardCodes.some((code) => !code) || antiPatternGuardCodes.length !== Object.keys(antiPatternGuardByGrammarText).length) {
    throw new Error('Golden anti-pattern guard 與 grammar 不一致。');
  }

  return compositionProposals.map((proposal) => ({
    slideId: proposal.slideId,
    contentIntegrity: structuredClone(proposal.contentIntegrity),
    antiPatternGuardCodes: [...antiPatternGuardCodes],
    candidates: proposal.rankedCandidates.map((candidate) => {
      if (candidate.status !== 'available') throw new Error(`${proposal.slideId}/${candidate.primitive} 不是 available candidate。`);
      const evaluated = Object.entries(grammar.coverArchetypes)
        .map(([logicRef, route]) => evaluateLogic({ logicRef, route, proposal, candidate, styleSpec }))
        .sort((left, right) => right.score - left.score || left.logicRef.localeCompare(right.logicRef));
      const references = evaluated.filter(({ credible }) => credible).slice(0, 2).map(({ credible, ...reference }) => reference);
      const excluded = evaluated.filter(({ routing }) => routing.antiPatternConflict.length > 0).slice(0, 3)
        .map(({ logicRef, routing, reasonCodes }) => ({ logicRef, antiPatternConflict: routing.antiPatternConflict, reasonCodes }));
      return {
        rank: candidate.rank,
        primitive: candidate.primitive,
        status: references.length ? 'matched' : 'none',
        references,
        excluded,
      };
    }),
  }));
}
