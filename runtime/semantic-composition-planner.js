import { createHash } from 'node:crypto';
import { evaluateGenerationCandidate } from './generation-capabilities.js';

const allowedSlideRoles = new Set(['cover', 'section', 'content']);
const allowedRelationships = new Set(['comparison', 'sequence', 'evidence', 'explanation', 'asset-led']);
const allowedEvidence = new Set(['numeric', 'textual', 'mixed', 'none']);
const allowedDensity = new Set(['low', 'medium', 'high']);
const allowedComponentOrigins = new Set(['user-provided', 'generated']);
const allowedComponentTypes = new Set(['text', 'image', 'table', 'citation', 'chart']);

const contentSnapshot = ({ title, subtitle, keyPoints }) => ({ title, subtitle, keyPoints: [...keyPoints] });
const contentHash = (slide) => createHash('sha256').update(JSON.stringify(contentSnapshot(slide))).digest('hex');

const assertEnum = (value, allowed, field, slideId) => {
  if (!allowed.has(value)) throw new Error(`${slideId} 的 ${field} 不在核准語意集合內。`);
};

const sanitizeComponent = (component, slideId) => {
  if (!component || typeof component !== 'object') return null;
  if (typeof component.id !== 'string' || !/^[a-z0-9][a-z0-9._-]{0,79}$/.test(component.id)) {
    throw new Error(`${slideId} 的 component.id 無效。`);
  }
  assertEnum(component.type, allowedComponentTypes, 'component.type', slideId);
  return {
    id: component.id,
    type: component.type,
    ...(component.type === 'chart' ? {
      chartType: component.chartType,
      series: Array.isArray(component.series)
        ? component.series.map((series) => ({ values: Array.isArray(series?.values) ? [...series.values] : [] }))
        : [],
    } : {}),
  };
};

const normalizeSignal = (signal, slideId) => {
  if (!signal || typeof signal !== 'object') throw new Error(`${slideId} 缺少 semantic signal。`);
  assertEnum(signal.slideRole, allowedSlideRoles, 'slideRole', slideId);
  assertEnum(signal.relationship, allowedRelationships, 'relationship', slideId);
  assertEnum(signal.evidence, allowedEvidence, 'evidence', slideId);
  assertEnum(signal.density, allowedDensity, 'density', slideId);
  const component = sanitizeComponent(signal.component, slideId);
  if (component) assertEnum(signal.componentOrigin, allowedComponentOrigins, 'componentOrigin', slideId);
  if (signal.relationship === 'asset-led' && !component) throw new Error(`${slideId} 的 asset-led signal 必須提供 component。`);
  return {
    slideRole: signal.slideRole,
    relationship: signal.relationship,
    evidence: signal.evidence,
    density: signal.density,
    component,
    componentOrigin: component ? signal.componentOrigin : null,
  };
};

const baseReasonCodes = (signal) => [
  `slide_role_${signal.slideRole.replace('-', '_')}`,
  `relationship_${signal.relationship.replace('-', '_')}`,
  `evidence_${signal.evidence}`,
  `density_${signal.density}`,
  ...(signal.component ? ['component_present'] : []),
  ...(signal.componentOrigin ? [`component_origin_${signal.componentOrigin.replace('-', '_')}`] : []),
];

const makeCandidate = (primitive, score, signal, reasonCode) => ({
  primitive,
  score,
  reasonCodes: [...baseReasonCodes(signal), reasonCode],
});

const semanticCandidates = (signal) => {
  if (signal.slideRole === 'cover') return [makeCandidate('cover', 100, signal, 'role_selects_cover')];
  if (signal.slideRole === 'section') return [makeCandidate('section-break', 100, signal, 'role_selects_section_break')];
  if (signal.relationship === 'asset-led') return [makeCandidate('component-focus', 100, signal, 'asset_requires_component_focus')];

  const candidates = [];
  if (signal.component) candidates.push(makeCandidate('component-focus', 98, signal, 'important_component_available'));
  if (signal.relationship === 'sequence') {
    candidates.push(makeCandidate('process-flow', 95, signal, 'sequence_prefers_process_flow'));
    candidates.push(makeCandidate('title-points', 70, signal, 'sequence_fallback_explanation'));
  } else if (signal.relationship === 'comparison') {
    if (['numeric', 'mixed'].includes(signal.evidence)) candidates.push(makeCandidate('metric-grid', 95, signal, 'numeric_comparison_prefers_metric_grid'));
    candidates.push(makeCandidate('split-proof', signal.evidence === 'textual' ? 95 : 85, signal, 'comparison_supports_split_proof'));
    candidates.push(makeCandidate('title-points', 65, signal, 'comparison_fallback_explanation'));
  } else if (signal.relationship === 'evidence') {
    if (['numeric', 'mixed'].includes(signal.evidence)) candidates.push(makeCandidate('metric-grid', 95, signal, 'numeric_evidence_prefers_metric_grid'));
    candidates.push(makeCandidate('split-proof', 85, signal, 'evidence_supports_split_proof'));
    candidates.push(makeCandidate('title-points', 65, signal, 'evidence_fallback_explanation'));
  } else {
    candidates.push(makeCandidate('title-points', 90, signal, 'explanation_prefers_title_points'));
    candidates.push(makeCandidate('split-proof', 70, signal, 'explanation_supports_split_proof'));
  }
  return candidates.sort((left, right) => right.score - left.score || left.primitive.localeCompare(right.primitive));
};

const reasonMessages = Object.freeze({
  cover: '投影片角色為封面，使用既有 cover primitive。',
  'section-break': '投影片角色為段落轉場，使用既有 section-break primitive。',
  'title-points': '一般說明內容適合以標題與重點建立清楚層級。',
  'split-proof': '內容關係需要並列主張與支持證據。',
  'metric-grid': '數值證據適合以既有 metric-grid 組織比較。',
  'process-flow': '步驟或時序關係適合既有 process-flow。',
  'component-focus': '重要既有或已授權 component 應成為主要視覺錨點。',
});

const proposalFor = (primitive, component) => ({
  primitive,
  variant: 'default',
  slots: {
    title: 'content.title',
    subtitle: 'content.subtitle',
    ...(!['cover', 'section-break', 'component-focus'].includes(primitive) ? { points: 'content.keyPoints' } : {}),
    ...(primitive === 'component-focus' ? { component: `content.components.${component.id}` } : {}),
  },
});

export function planSemanticCompositions({ slides, semanticSignals = [], generationPermissions = {} }) {
  if (!Array.isArray(semanticSignals)) throw new Error('semanticSignals 必須是陣列。');
  if (semanticSignals.length === 0) return [];

  const slideIds = new Set(slides.map(({ id }) => id));
  const signalsBySlide = new Map();
  for (const signal of semanticSignals) {
    if (!slideIds.has(signal?.slideId)) throw new Error(`semanticSignals 含未知 slide：${signal?.slideId || 'unknown'}。`);
    if (signalsBySlide.has(signal.slideId)) throw new Error(`semanticSignals 重複 slide：${signal.slideId}。`);
    signalsBySlide.set(signal.slideId, normalizeSignal(signal, signal.slideId));
  }
  if (signalsBySlide.size !== slides.length) throw new Error('semanticSignals 必須完整覆蓋所有 outline slides。');

  return slides.map((slide) => {
    const signal = signalsBySlide.get(slide.id);
    const beforeHash = contentHash(slide);
    const consideredCandidates = semanticCandidates(signal).map((candidate, index) => {
      const verdict = evaluateGenerationCandidate({
        id: `${slide.id}/${candidate.primitive}`,
        primitive: candidate.primitive,
        component: candidate.primitive === 'component-focus' ? signal.component : undefined,
        componentOrigin: signal.componentOrigin,
      }, { generationPermissions });
      return {
        rank: index + 1,
        primitive: candidate.primitive,
        score: candidate.score,
        reasonCodes: candidate.reasonCodes,
        reason: reasonMessages[candidate.primitive],
        ...verdict,
      };
    });
    const rankedCandidates = consideredCandidates.filter(({ status }) => status === 'available').slice(0, 3);
    const top = rankedCandidates[0];
    const afterHash = contentHash({ ...slide, ...contentSnapshot(slide) });
    return {
      slideId: slide.id,
      status: top ? 'ready' : 'blocked',
      semantic: {
        slideRole: signal.slideRole,
        relationship: signal.relationship,
        evidence: signal.evidence,
        density: signal.density,
        ...(signal.component ? {
          component: { id: signal.component.id, type: signal.component.type },
          componentOrigin: signal.componentOrigin,
        } : {}),
      },
      consideredCandidates,
      rankedCandidates,
      proposal: top ? proposalFor(top.primitive, signal.component) : null,
      contentIntegrity: { beforeHash, afterHash, unchanged: beforeHash === afterHash },
    };
  });
}
