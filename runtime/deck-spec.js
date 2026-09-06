import { createHash } from 'node:crypto';

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

const sanitizeComposition = (composition = {}) => ({
  primitive: copyText(composition.primitive, 'title-body'),
  variant: copyText(composition.variant, 'default'),
  slots: Object.fromEntries(Object.entries(composition.slots ?? {}).filter(([, ref]) => typeof ref === 'string' && /^content\.(title|subtitle|keyPoints|components\.[a-z0-9][a-z0-9._-]{0,79})$/.test(ref))),
  ...(Array.isArray(composition.order) ? { order: copyStringArray(composition.order) } : {}),
});

export function sanitizeDeckSpec(input) {
  return {
    schemaVersion: '1.0',
    deckId: copyText(input?.deckId, 'deck'),
    title: copyText(input?.title, 'Untitled deck'),
    language: copyText(input?.language, 'zh-Hant'),
    style: sanitizeStyle(input?.style),
    slides: Array.isArray(input?.slides) ? input.slides.slice(0, 15).map((slide, index) => ({
      id: copyText(slide?.id, `slide-${String(index + 1).padStart(2, '0')}`),
      content: {
        title: copyText(slide?.content?.title),
        subtitle: copyText(slide?.content?.subtitle),
        keyPoints: copyStringArray(slide?.content?.keyPoints, 3, 5),
        components: Array.isArray(slide?.content?.components) ? slide.content.components.map(sanitizeComponent).filter(Boolean) : [],
      },
      composition: sanitizeComposition(slide?.composition),
    })) : [],
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
    if (!slide.content?.title || !slide.content?.subtitle || !Array.isArray(slide.content?.keyPoints) || slide.content.keyPoints.length < 3 || slide.content.keyPoints.length > 5) errors.push(`${slide.id || 'unknown'} 缺少 title／subtitle／3～5 keyPoints。`);
    if (JSON.stringify(slide.composition ?? {}).match(/"(title|subtitle|keyPoints|text)"\s*:\s*"(?!content\.)/)) errors.push(`${slide.id || 'unknown'} 的 CompositionSpec 內嵌內容。`);
  }
  return { status: errors.length ? 'fail' : 'pass', errors };
}

export const contentHash = (slide) => createHash('sha256').update(JSON.stringify(slide.content)).digest('hex');

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
