import { sanitizeDeckSpec } from './deck-spec.js';

const allowedMoves = new Set(['asymmetric-grid', 'split-proof', 'editorial-rail', 'technical-map', 'full-bleed-type']);
const allowedLanguages = new Set(['executive', 'technical', 'editorial', 'energetic', 'narrative']);
const allowedDensity = new Set(['low', 'medium', 'high']);

const escapeHtml = (value) => String(value)
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&#39;');

const normalizeStyle = (style) => sanitizeDeckSpec({
  deckId: 'style-preview',
  title: 'Style preview',
  language: 'zh-Hant',
  style,
  slides: [],
}).style;

const routeSignature = (style) => ({
  primaryMove: style.layout.primaryMove,
  compositionLanguage: style.layout.compositionLanguage,
  density: style.density,
  displayType: style.typography.display,
  bodyType: style.typography.body,
  geometry: `${style.geometry.radius}/${style.geometry.borderWidth}`,
  assetTreatment: style.assetTreatment,
  motion: style.motion.personality,
});

export function validateRouteDiversity(styles) {
  const errors = [];
  for (let left = 0; left < styles.length; left += 1) {
    for (let right = left + 1; right < styles.length; right += 1) {
      const a = routeSignature(styles[left]);
      const b = routeSignature(styles[right]);
      const different = Object.keys(a).filter((key) => a[key] !== b[key]);
      if (different.length < 3) errors.push(`${styles[left].id} 與 ${styles[right].id} 只有色票或不足三項非色彩差異。`);
    }
  }
  return { status: errors.length ? 'fail' : 'pass', errors };
}

const validateStyleMaterial = (style) => {
  if (!allowedMoves.has(style.layout.primaryMove)) return `${style.id} 使用未驗證的 primaryMove。`;
  if (!allowedLanguages.has(style.layout.compositionLanguage)) return `${style.id} 使用未驗證的 compositionLanguage。`;
  if (!allowedDensity.has(style.density)) return `${style.id} 的 density 無效。`;
  return null;
};

export function compileStyleCandidates({ content, companyStylePack, aiRoutes }) {
  if (!content?.title || !content?.subtitle || !content?.identity) return { status: 'fail', reason: '缺少共同封面內容。' };
  if (!companyStylePack) return { status: 'blocked', reason: 'Company Style Pack 尚未提供。', required: 'company-style-pack' };
  if (!Array.isArray(aiRoutes) || aiRoutes.length !== 3) return { status: 'fail', reason: '必須恰有三個 AI Visual Routes。' };

  const candidates = [
    { kind: 'company', style: normalizeStyle(companyStylePack.style) },
    ...aiRoutes.map((route) => ({ kind: 'ai', style: normalizeStyle(route) })),
  ];
  const materialErrors = candidates.map(({ style }) => validateStyleMaterial(style)).filter(Boolean);
  if (materialErrors.length) return { status: 'fail', reason: materialErrors.join(' ') };
  const diversity = validateRouteDiversity(candidates.map(({ style }) => style));
  if (diversity.status !== 'pass') return diversity;
  return {
    status: 'pass',
    content: { title: content.title, subtitle: content.subtitle, identity: content.identity },
    candidates: candidates.map((candidate) => ({ ...candidate, content: { title: content.title, subtitle: content.subtitle, identity: content.identity } })),
  };
}

const layoutMarkup = {
  'asymmetric-grid': (content) => `<section class="copy"><p class="identity">${escapeHtml(content.identity)}</p><h1>${escapeHtml(content.title)}</h1><p class="subtitle">${escapeHtml(content.subtitle)}</p></section><aside class="signal"><span>01</span><b>DECISION</b><i></i><b>DELIVERY</b></aside>`,
  'split-proof': (content) => `<section class="copy"><p class="identity">${escapeHtml(content.identity)}</p><h1>${escapeHtml(content.title)}</h1></section><aside class="proof"><b>01</b><p>${escapeHtml(content.subtitle)}</p><ol><li>需求</li><li>架構</li><li>風格</li><li>交付</li></ol></aside>`,
  'editorial-rail': (content) => `<aside class="rail"><span>${escapeHtml(content.identity)}</span></aside><section class="copy"><p class="identity">VISUAL ROUTE</p><h1>${escapeHtml(content.title)}</h1><p class="subtitle">${escapeHtml(content.subtitle)}</p></section><aside class="signal"><span>STORY</span><i></i><b>01 / 04</b></aside>`,
  'technical-map': (content) => `<section class="copy"><p class="identity">${escapeHtml(content.identity)}</p><h1>${escapeHtml(content.title)}</h1><p class="subtitle">${escapeHtml(content.subtitle)}</p></section><aside class="map"><b>INPUT</b><i></i><b>STRUCTURE</b><i></i><b>STYLE</b><i></i><b>HTML</b></aside>`,
  'full-bleed-type': (content) => `<section class="copy"><p class="identity">${escapeHtml(content.identity)}</p><h1>${escapeHtml(content.title)}</h1><p class="subtitle">${escapeHtml(content.subtitle)}</p></section><aside class="signal"><span>→</span></aside>`,
};

export function buildStyleCoverPreview(candidate) {
  const { style, content } = candidate;
  const markup = layoutMarkup[style.layout.primaryMove](content);
  const densityGap = { low: 80, medium: 56, high: 36 }[style.density];
  return `<!doctype html><html lang="zh-Hant"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(style.name)}</title><style>
*{box-sizing:border-box}body{margin:0;width:1600px;height:900px;overflow:hidden;background:${style.palette.canvas};color:${style.palette.text};font-family:${style.typography.body}}main{height:100%;padding:${style.spacing.slidePadding}px;display:grid;grid-template-columns:8fr 4fr;gap:${densityGap}px;position:relative;border:${style.geometry.borderWidth}px solid ${style.palette.muted}}.copy{align-self:center}.identity{font:800 14px/1 ${style.typography.mono || style.typography.body};letter-spacing:.14em;color:${style.palette.accent}}h1{max-width:940px;margin:32px 0;font-family:${style.typography.display};font-size:78px;line-height:1.06;letter-spacing:-.05em;text-wrap:balance}.subtitle{max-width:760px;color:${style.palette.muted};font-size:27px;line-height:1.45}.signal,.proof,.map{background:${style.palette.surface};padding:44px;border-radius:${style.geometry.radius}px;align-self:stretch;display:flex;flex-direction:column;justify-content:center;gap:28px}.signal span,.proof>b{font:900 92px/1 ${style.typography.display};color:${style.palette.accent}}.signal i,.map i{display:block;height:${Math.max(1, style.geometry.borderWidth)}px;background:${style.palette.accent}}.proof ol{display:grid;gap:12px;margin:0;padding-left:24px}.map b{font:800 16px/1 ${style.typography.mono || style.typography.body};letter-spacing:.12em}.rail{display:flex;align-items:center;justify-content:center;border-right:${style.geometry.borderWidth}px solid ${style.palette.muted}}.rail span{writing-mode:vertical-rl;transform:rotate(180deg);font-weight:800;letter-spacing:.14em}main:has(.rail){grid-template-columns:100px 1fr 320px;padding-left:0}main[data-route="split-proof"] h1{max-width:900px;font-size:70px}
@media(prefers-reduced-motion:reduce){*{animation:none!important;transition:none!important}}
</style></head><body><main data-style-id="${escapeHtml(style.id)}" data-route="${escapeHtml(style.layout.primaryMove)}">${markup}</main></body></html>`;
}

export function selectStyleCandidate(compilation, styleId, approvedBy) {
  if (compilation.status !== 'pass') throw new Error('候選尚未通過 style gate。');
  if (approvedBy !== 'human') throw new Error('Style 只能由人類選擇。');
  const candidate = compilation.candidates.find(({ style }) => style.id === styleId);
  if (!candidate) throw new Error(`找不到 Style：${styleId}`);
  return { status: 'selected', approvedBy: 'human', style: candidate.style };
}
