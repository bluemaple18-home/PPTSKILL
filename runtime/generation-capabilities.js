import { listCompositionPrimitives } from './composition-primitives.js';
import { getMotionCapabilities, validateSlideMotion } from './motion-capabilities.js';

const componentCapabilities = Object.freeze({
  text: Object.freeze({ status: 'supported' }),
  image: Object.freeze({ status: 'supported' }),
  table: Object.freeze({ status: 'supported' }),
  citation: Object.freeze({ status: 'supported' }),
  chart: Object.freeze({ status: 'conditional', supportedChartTypes: Object.freeze(['bar']), valueDomain: 'non-negative' }),
});

const reason = (code, message) => ({ code, message });

export function getGenerationCapabilities() {
  return {
    version: 1,
    compositionPrimitives: listCompositionPrimitives().map((primitive) => ({ ...primitive, slots: [...primitive.slots] })),
    components: Object.fromEntries(Object.entries(componentCapabilities).map(([type, capability]) => [type, {
      ...capability,
      ...(capability.supportedChartTypes ? { supportedChartTypes: [...capability.supportedChartTypes] } : {}),
    }])),
    motion: getMotionCapabilities(),
  };
}

export function evaluateGenerationCandidate(candidate = {}, { generationPermissions } = {}) {
  const reasons = [];
  const primitiveIds = new Set(listCompositionPrimitives().map(({ id }) => id));
  if (candidate.primitive && !primitiveIds.has(candidate.primitive)) {
    reasons.push(reason('composition_primitive_unavailable', `composition primitive ${candidate.primitive} 尚未由 renderer 支援。`));
  }

  const component = candidate.component;
  if (component) {
    const capability = componentCapabilities[component.type];
    if (!capability) {
      reasons.push(reason('component_type_unavailable', `component type ${component.type || 'unknown'} 尚未由 renderer 支援。`));
    } else if (component.type === 'image') {
      if (generationPermissions && generationPermissions.image !== true) {
        reasons.push(reason('generation_permission_required', '尚未取得 image generation 明確授權。'));
      }
    } else if (component.type === 'chart') {
      if (generationPermissions && generationPermissions.chart !== true) {
        reasons.push(reason('generation_permission_required', '尚未取得 chart generation 明確授權。'));
      }
      if (!capability.supportedChartTypes.includes(component.chartType)) {
        reasons.push(reason('chart_type_unavailable', `chart type ${component.chartType || 'unknown'} 尚未支援；不得偷換成 bar。`));
      }
      const values = Array.isArray(component.series)
        ? component.series.flatMap((series) => Array.isArray(series?.values) ? series.values : [])
        : [];
      if (values.some((value) => !Number.isFinite(value))) {
        reasons.push(reason('invalid_chart_values', 'chart values 必須是有限數字。'));
      }
      if (values.some((value) => value < 0)) {
        reasons.push(reason('negative_chart_values', '目前 bar renderer 不支援負值語意。'));
      }
    }
  }

  return {
    id: typeof candidate.id === 'string' && candidate.id ? candidate.id : 'candidate',
    status: reasons.length ? 'unavailable' : 'available',
    ...(reasons.length ? { reasons } : {}),
  };
}

export function validateDeckGenerationCapabilities(spec = {}) {
  const errors = [];
  for (const slide of spec.slides ?? []) {
    for (const component of slide.content?.components ?? []) {
      const verdict = evaluateGenerationCandidate({ id: `${slide.id}/${component.id}`, primitive: slide.composition?.primitive, component });
      if (verdict.status === 'unavailable') errors.push(...verdict.reasons.map(({ message }) => `${slide.id}/${component.id}：${message}`));
    }
    errors.push(...validateSlideMotion(slide));
  }
  return { status: errors.length ? 'fail' : 'pass', errors };
}
