import { sanitizeGeometryOverrides } from './component-geometry.js';
import { createHash } from 'node:crypto';
import { sanitizeCompositionMotion } from './motion-capabilities.js';
import { sanitizeCompositionBackgroundEffect } from './background-effects.js';

const copyText = (value, fallback = '') => typeof value === 'string' ? value : fallback;
const copyStringArray = (value, minimum = 0, maximum = Infinity) => Array.isArray(value)
  ? value.filter((item) => typeof item === 'string').slice(0, maximum).filter(Boolean).slice(0, Math.max(minimum, maximum))
  : [];

const safeCssText = (value, fallback, pattern) => {
  const candidate = copyText(value, fallback);
  return pattern.test(candidate) ? candidate : fallback;
};
const safeColor = (value, fallback) => safeCssText(value, fallback, /^(#[0-9a-fA-F]{3,8}|rgba?\([0-9., %]+\)|hsla?\([0-9., %]+\)|[a-zA-Z]+)$/);
const safeFont = (value, fallback) => safeCssText(value, fallback, /^[a-zA-Z0-9 ,.\-'"]{1,200}$/);
const safeEasing = (value, fallback) => safeCssText(value, fallback, /^(linear|ease|ease-in|ease-out|ease-in-out|cubic-bezier\([0-9., -]+\))$/);
const clampInteger = (value, fallback, minimum, maximum) => Number.isInteger(value) ? Math.max(minimum, Math.min(maximum, value)) : fallback;
const idPattern = /^[a-z0-9][a-z0-9._-]{0,79}$/;

const keyPointId = (index) => `key-point-${String(index + 1).padStart(2, '0')}`;
const namespacedElementId = (namespace, id) => {
  const candidate = `${namespace}-${id}`;
  if (idPattern.test(candidate)) return candidate;
  let hash = 2166136261;
  for (const character of id) hash = Math.imul(hash ^ character.codePointAt(0), 16777619) >>> 0;
  const suffix = hash.toString(16).padStart(8, '0');
  return `${namespace}-${id.slice(0, 78 - namespace.length - suffix.length)}-${suffix}`;
};

export const ROLE_ELEMENT_IDS = Object.freeze({ title: 'role-title', subtitle: 'role-subtitle' });
export const pointElementId = (id) => namespacedElementId('point', id);
export const componentElementId = (id) => namespacedElementId('component', id);
export const resolveSlideElementIdentities = (slide) => {
  const used = new Set(Object.values(ROLE_ELEMENT_IDS));
  const keyPointIds = slide.content?.keyPointIds ?? [];
  const componentIds = (slide.content?.components ?? []).map(({ id }) => id);
  const entries = [
    ...keyPointIds.map((id) => ({ key: `point\0${id}`, base: pointElementId(id) })),
    ...componentIds.map((id) => ({ key: `component\0${id}`, base: componentElementId(id) })),
  ].sort((left, right) => left.key < right.key ? -1 : left.key > right.key ? 1 : 0);
  const resolved = new Map();
  const allocate = (base) => {
    let candidate = base;
    let suffix = 1;
    while (used.has(candidate)) {
      const marker = `-${suffix.toString(36)}`;
      candidate = `${base.slice(0, 80 - marker.length)}${marker}`;
      suffix += 1;
    }
    used.add(candidate);
    return candidate;
  };
  for (const { key, base } of entries) resolved.set(key, allocate(base));
  return {
    title: ROLE_ELEMENT_IDS.title,
    subtitle: ROLE_ELEMENT_IDS.subtitle,
    keyPoints: keyPointIds.map((id) => resolved.get(`point\0${id}`)),
    components: componentIds.map((id) => resolved.get(`component\0${id}`)),
  };
};
export const resolveSlideElementIds = (slide) => {
  const identities = resolveSlideElementIdentities(slide);
  return [identities.title, identities.subtitle, ...identities.keyPoints, ...identities.components];
};

const sanitizeSlide = (slide, index) => {
  const rawKeyPoints = slide?.content?.keyPoints;
  const explicitIds = slide?.content?.keyPointIds;
  if (explicitIds !== undefined) {
    if (!Array.isArray(explicitIds) || !Array.isArray(rawKeyPoints) || explicitIds.length !== rawKeyPoints.length) throw new Error(`slide ${slide?.id || index + 1} 的 keyPointIds 長度不符。`);
    if (explicitIds.some((id) => typeof id !== 'string' || !idPattern.test(id))) throw new Error(`slide ${slide?.id || index + 1} 的 keyPointIds 格式非法。`);
    if (new Set(explicitIds).size !== explicitIds.length) throw new Error(`slide ${slide?.id || index + 1} 的 keyPointIds 重複。`);
  }
  const keyPoints = copyStringArray(rawKeyPoints, 3, 5);
  const keyPointIds = explicitIds === undefined ? keyPoints.map((_, pointIndex) => keyPointId(pointIndex)) : [...explicitIds];
  if (keyPointIds.length !== keyPoints.length) throw new Error(`slide ${slide?.id || index + 1} 的 keyPointIds 長度不符。`);
  const components = Array.isArray(slide?.content?.components) ? slide.content.components.map(sanitizeComponent).filter(Boolean) : [];
  if (components.some(({ id }) => !idPattern.test(id))) throw new Error(`slide ${slide?.id || index + 1} 的 component ID 格式非法。`);
  if (new Set(components.map(({ id }) => id)).size !== components.length) throw new Error(`slide ${slide?.id || index + 1} 的 component ID 重複。`);
  const elementIds = resolveSlideElementIds({ content: { keyPointIds, components } });
  if (elementIds.some((id) => !idPattern.test(id))) throw new Error(`slide ${slide?.id || index + 1} 的 element ID 格式非法。`);
  if (new Set(elementIds).size !== elementIds.length) throw new Error(`slide ${slide?.id || index + 1} 的 element ID 重複。`);
  return {
    id: copyText(slide?.id, `slide-${String(index + 1).padStart(2, '0')}`),
    content: {
      title: copyText(slide?.content?.title),
      subtitle: copyText(slide?.content?.subtitle),
      keyPoints,
      keyPointIds,
      components,
    },
    composition: sanitizeComposition(slide?.composition, components),
  };
};

const defaultStyle = {
  id: 'portable-default',
  name: 'Portable Default',
  layout: { primaryMove: 'asymmetric-grid', compositionLanguage: 'executive' },
  density: 'medium',
  typography: { display: 'system-ui', body: 'system-ui', mono: 'ui-monospace' },
  palette: { canvas: '#121827', text: '#f6f7fb', muted: '#b7c0d6', accent: '#93c5fd', surface: '#1f2937' },
  spacing: { unit: 8, slidePadding: 64 },
  geometry: { radius: 8, borderWidth: 1 },
  motion: { personality: 'none', durationMs: 0, easing: 'linear', reducedMotion: true },
  assetTreatment: 'contain; no decorative generation',
};

const sanitizeComponent = (component) => {
  if (!component || typeof component !== 'object') return null;
  const base = { id: copyText(component.id), type: copyText(component.type) };
  if (!base.id) return null;
  if (base.type === 'text') return { ...base, text: copyText(component.text) };
  if (base.type === 'image' && /^data:image\/(png|jpeg|webp|gif|svg\+xml);/.test(copyText(component.dataUri))) {
    return { ...base, alt: copyText(component.alt), dataUri: component.dataUri, ...(component.fit === 'contain' || component.fit === 'cover' ? { fit: component.fit } : {}) };
  }
  if (base.type === 'table') return { ...base, headers: copyStringArray(component.headers, 1, 12), rows: Array.isArray(component.rows) ? component.rows.slice(0, 30).map((row) => Array.isArray(row) ? row.slice(0, 12).map((cell) => ['string', 'number', 'boolean'].includes(typeof cell) || cell === null ? cell : '') : []) : [] };
  if (base.type === 'chart') return { ...base, chartType: copyText(component.chartType), labels: copyStringArray(component.labels), series: Array.isArray(component.series) ? component.series.map((series) => ({ name: copyText(series?.name), values: Array.isArray(series?.values) ? series.values.filter((value) => typeof value === 'number') : [] })) : [] };
  if (base.type === 'citation' && component.public === true) return { ...base, label: copyText(component.label), ...(/^https?:\/\//.test(copyText(component.url)) ? { url: component.url } : {}), public: true };
  return null;
};

const sanitizeStyle = (style = {}) => ({
  id: copyText(style.id, defaultStyle.id),
  name: copyText(style.name, defaultStyle.name),
  layout: {
    primaryMove: copyText(style.layout?.primaryMove, defaultStyle.layout.primaryMove),
    compositionLanguage: copyText(style.layout?.compositionLanguage, defaultStyle.layout.compositionLanguage),
  },
  density: copyText(style.density, defaultStyle.density),
  typography: {
    display: safeFont(style.typography?.display, defaultStyle.typography.display),
    body: safeFont(style.typography?.body, defaultStyle.typography.body),
    ...(style.typography?.mono ? { mono: safeFont(style.typography.mono, defaultStyle.typography.mono) } : {}),
  },
  palette: Object.fromEntries(Object.keys(defaultStyle.palette).map((key) => [key, safeColor(style.palette?.[key], defaultStyle.palette[key])])),
  spacing: { unit: clampInteger(style.spacing?.unit, defaultStyle.spacing.unit, 2, 24), slidePadding: clampInteger(style.spacing?.slidePadding, defaultStyle.spacing.slidePadding, 24, 160) },
  geometry: { radius: clampInteger(style.geometry?.radius, defaultStyle.geometry.radius, 0, 48), borderWidth: clampInteger(style.geometry?.borderWidth, defaultStyle.geometry.borderWidth, 0, 8) },
  motion: { personality: copyText(style.motion?.personality, defaultStyle.motion.personality), durationMs: clampInteger(style.motion?.durationMs, defaultStyle.motion.durationMs, 0, 1200), easing: safeEasing(style.motion?.easing, defaultStyle.motion.easing), reducedMotion: true },
  assetTreatment: copyText(style.assetTreatment, defaultStyle.assetTreatment),
});

const sanitizeComposition = (composition = {}, components = []) => {
  const geometryOverrides = sanitizeGeometryOverrides(composition.geometryOverrides, components);
  const motion = sanitizeCompositionMotion(composition.motion);
  const backgroundEffect = sanitizeCompositionBackgroundEffect(composition.backgroundEffect);
  return {
    primitive: copyText(composition.primitive, 'title-body'),
    variant: copyText(composition.variant, 'default'),
    slots: Object.fromEntries(Object.entries(composition.slots ?? {}).filter(([, ref]) => typeof ref === 'string' && /^content\.(title|subtitle|keyPoints|components\.[a-z0-9][a-z0-9._-]{0,79})$/.test(ref))),
    ...(Array.isArray(composition.order) ? { order: copyStringArray(composition.order) } : {}),
    ...(motion ? { motion } : {}),
    ...(backgroundEffect ? { backgroundEffect } : {}),
    ...(geometryOverrides ? { geometryOverrides } : {}),
  };
};

const sanitizeSourceRef = (source) => {
  if (source?.public !== true || !idPattern.test(copyText(source.id)) || !copyText(source.label)) return null;
  const url = /^https?:\/\//.test(copyText(source.url)) ? source.url : '';
  return {
    id: source.id,
    label: source.label,
    ...(url ? { url } : {}),
    public: true,
    sourceAvailableToRecipient: source.sourceAvailableToRecipient === true,
  };
};

export const sanitizePortableDerivation = (derivation) => {
  if (!derivation || typeof derivation !== 'object') return null;
  const operation = copyText(derivation.operation);
  if (!['absolute-delta', 'percent-change', 'percentage-point-change'].includes(operation)) return null;
  if (!Number.isFinite(derivation.baseline) || !Number.isFinite(derivation.current)) return null;
  if (operation === 'percentage-point-change' && !['ratio', 'percent'].includes(derivation.scale)) {
    throw new Error('percentage-point derivation 必須明示 scale: ratio | percent。');
  }
  return {
    operation,
    baseline: derivation.baseline,
    current: derivation.current,
    ...(operation === 'percentage-point-change' ? { scale: derivation.scale } : {}),
  };
};

const sanitizeClaim = (claim) => {
  if (!idPattern.test(copyText(claim?.id)) || !['fact', 'derived', 'inference'].includes(claim?.kind) || !copyText(claim?.summary)) return null;
  return {
    id: claim.id,
    kind: claim.kind,
    summary: claim.summary,
    slideIds: copyStringArray(claim.slideIds, 1, 15).filter((id) => idPattern.test(id)),
    ...(Number.isFinite(claim.value) ? { value: claim.value } : {}),
    ...Object.fromEntries(['metric', 'period', 'population', 'unit', 'currency']
      .flatMap((field) => copyText(claim[field]) ? [[field, claim[field]]] : [])),
    ...(['causal', 'correlation', 'descriptive'].includes(claim.relation) ? { relation: claim.relation } : {}),
    ...(['causal', 'correlation', 'descriptive', 'unknown'].includes(claim.evidenceRelation) ? { evidenceRelation: claim.evidenceRelation } : {}),
    ...(claim.kind === 'derived' ? { derivation: sanitizePortableDerivation(claim.derivation) } : {}),
    sourceRefs: Array.isArray(claim.sourceRefs) ? claim.sourceRefs.slice(0, 8).map(sanitizeSourceRef).filter(Boolean) : [],
  };
};

export function sanitizeDeckSpec(input) {
  return {
    schemaVersion: '1.0',
    deckId: copyText(input?.deckId, 'deck'),
    title: copyText(input?.title, 'Untitled deck'),
    language: copyText(input?.language, 'zh-Hant'),
    style: sanitizeStyle(input?.style),
    ...(Array.isArray(input?.claims) ? { claims: input.claims.slice(0, 100).map(sanitizeClaim).filter(Boolean) } : {}),
    slides: Array.isArray(input?.slides) ? input.slides.slice(0, 15).map(sanitizeSlide) : [],
  };
}

export function migrateLegacyFixture(fixture) {
  return sanitizeDeckSpec({
    deckId: 'migrated-deck',
    title: fixture.title,
    language: 'zh-Hant',
    style: defaultStyle,
    slides: fixture.slides.map((slide) => ({
      id: slide.id,
      content: {
        title: slide.title,
        subtitle: slide.body || slide.title,
        keyPoints: [slide.body || slide.title, '待確認重點二', '待確認重點三'],
        components: [],
      },
      composition: { primitive: 'title-body', variant: 'default', slots: { title: 'content.title', subtitle: 'content.subtitle', points: 'content.keyPoints' } },
    })),
  });
}

export function validateDeckSpec(spec) {
  const errors = [];
  if (spec?.schemaVersion !== '1.0') errors.push('schemaVersion 必須是 1.0。');
  if (!Array.isArray(spec?.slides) || spec.slides.length < 1 || spec.slides.length > 15) errors.push('slides 必須是 1～15 頁。');
  const ids = spec?.slides?.map((slide) => slide.id) ?? [];
  if (ids.some((id) => !id) || new Set(ids).size !== ids.length) errors.push('slide ID 不可缺漏或重複。');
  for (const slide of spec?.slides ?? []) {
    try { sanitizeGeometryOverrides(slide.composition?.geometryOverrides, slide.content?.components ?? []); } catch (error) { errors.push(error.message); }
    if (!slide.content?.title || !slide.content?.subtitle || !Array.isArray(slide.content?.keyPoints) || slide.content.keyPoints.length < 3 || slide.content.keyPoints.length > 5) errors.push(`${slide.id || 'unknown'} 缺少 title／subtitle／3～5 keyPoints。`);
    const elementIds = resolveSlideElementIds(slide);
    if (!Array.isArray(slide.content?.keyPointIds) || slide.content.keyPointIds.length !== slide.content?.keyPoints?.length || slide.content.keyPointIds.some((id) => !idPattern.test(id))) errors.push(`${slide.id || 'unknown'} 的 keyPointIds 無效。`);
    if (new Set(slide.content?.keyPointIds ?? []).size !== (slide.content?.keyPointIds ?? []).length) errors.push(`${slide.id || 'unknown'} 的 keyPointIds 不可重複。`);
    if ((slide.content?.components ?? []).some(({ id }) => !idPattern.test(id))) errors.push(`${slide.id || 'unknown'} 的 component ID 無效。`);
    if (new Set((slide.content?.components ?? []).map(({ id }) => id)).size !== (slide.content?.components ?? []).length) errors.push(`${slide.id || 'unknown'} 的 component ID 不可重複。`);
    if (elementIds.some((id) => !idPattern.test(id))) errors.push(`${slide.id || 'unknown'} 的 element ID 無效。`);
    if (new Set(elementIds).size !== elementIds.length) errors.push(`${slide.id || 'unknown'} 的 element ID 不可重複。`);
    if (JSON.stringify(slide.composition ?? {}).match(/"(title|subtitle|keyPoints|text)"\s*:\s*"(?!content\.)/)) errors.push(`${slide.id || 'unknown'} 的 CompositionSpec 內嵌內容。`);
  }
  if (spec?.claims !== undefined && !Array.isArray(spec.claims)) errors.push('claims 必須是陣列。');
  const claimIds = spec?.claims?.map((claim) => claim.id) ?? [];
  if (new Set(claimIds).size !== claimIds.length) errors.push('claim ID 不可重複。');
  for (const claim of spec?.claims ?? []) {
    if (!claim.id || !claim.kind || !claim.summary || !Array.isArray(claim.slideIds) || claim.slideIds.length < 1) errors.push('claim 必須有 id／kind／summary／slideIds。');
    if (claim.slideIds?.some((id) => !ids.includes(id))) errors.push(`${claim.id || 'unknown'} 引用了不存在的 slide。`);
    if (claim.kind === 'derived' && !claim.derivation) errors.push(`${claim.id || 'unknown'} 缺少 derivation。`);
  }
  return { status: errors.length ? 'fail' : 'pass', errors };
}

export const contentHash = (slide) => {
  const keyPoints = Array.isArray(slide?.content?.keyPoints) ? slide.content.keyPoints : [];
  const content = {
    title: slide?.content?.title,
    subtitle: slide?.content?.subtitle,
    keyPoints,
    keyPointIds: slide?.content?.keyPointIds ?? keyPoints.map((_, index) => keyPointId(index)),
    components: slide?.content?.components,
  };
  return createHash('sha256').update(JSON.stringify(content)).digest('hex');
};

export function patchComposition(spec, slideId, composition) {
  const sanitized = sanitizeDeckSpec(spec);
  const slide = sanitized.slides.find((item) => item.id === slideId);
  if (!slide) throw new Error(`找不到 slide：${slideId}`);
  slide.composition = sanitizeComposition(composition);
  return sanitized;
}

export function patchSlideContent(spec, slideId, contentChanges) {
  const sanitized = sanitizeDeckSpec(spec);
  const index = sanitized.slides.findIndex((item) => item.id === slideId);
  if (index < 0) throw new Error(`找不到 slide：${slideId}`);
  const target = sanitized.slides[index];
  const next = sanitizeDeckSpec({ ...sanitized, slides: [{ ...target, content: { ...target.content, ...contentChanges } }] }).slides[0];
  sanitized.slides[index] = next;
  return sanitized;
}

export function embedDeckSpec(html, spec) {
  const payload = JSON.stringify(sanitizeDeckSpec(spec)).replaceAll('<', '\\u003c');
  const tag = `<script type="application/json" id="deck-spec">${payload}</script>`;
  return html.includes('</body>') ? html.replace('</body>', `${tag}</body>`) : `${html}${tag}`;
}

export function extractDeckSpec(html) {
  const match = html.match(/<script[^>]*id=["']deck-spec["'][^>]*>([\s\S]*?)<\/script>/i);
  if (!match) throw new Error('deck.html 缺少 deck-spec。');
  return sanitizeDeckSpec(JSON.parse(match[1]));
}
