import { embedDeckSpec, sanitizeDeckSpec, validateDeckSpec } from './deck-spec.js';
import { validateDeckCompositions } from './composition-primitives.js';
import { buildMotionCss, buildMotionRuntimeScript } from './motion-primitives.js';

const escapeHtml = (value) => String(value ?? '')
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&#39;');

const attr = escapeHtml;
const editable = (slideId, field, tag, value, className = '') => `<${tag} class="${className}" data-edit-target="slides.${attr(slideId)}.content.${field}">${escapeHtml(value)}</${tag}>`;

const renderPoints = (slide, className = 'point-list') => `<ol class="${className}" data-edit-target="slides.${attr(slide.id)}.content.keyPoints">${slide.content.keyPoints.map((point, index) => `<li data-point-index="${index}"><span>${String(index + 1).padStart(2, '0')}</span><p>${escapeHtml(point)}</p></li>`).join('')}</ol>`;

const renderComponent = (component, slideId) => {
  const target = `slides.${attr(slideId)}.content.components.${attr(component.id)}`;
  if (component.type === 'image') return `<figure class="asset image-asset" data-edit-target="${target}"><img src="${attr(component.dataUri)}" alt="${attr(component.alt)}" style="object-fit:${component.fit || 'contain'}"></figure>`;
  if (component.type === 'text') return `<blockquote class="asset text-asset" data-edit-target="${target}">${escapeHtml(component.text)}</blockquote>`;
  if (component.type === 'citation') return `<p class="asset citation-asset" data-edit-target="${target}">${component.url ? `<a href="${attr(component.url)}">${escapeHtml(component.label)}</a>` : escapeHtml(component.label)}</p>`;
  if (component.type === 'table') return `<div class="asset table-asset" data-edit-target="${target}"><table><thead><tr>${component.headers.map((header) => `<th>${escapeHtml(header)}</th>`).join('')}</tr></thead><tbody>${component.rows.map((row) => `<tr>${row.map((cell) => `<td>${escapeHtml(cell)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
  if (component.type === 'chart') {
    const maximum = Math.max(1, ...component.series.flatMap(({ values }) => values.map(Math.abs)));
    return `<div class="asset chart-asset" data-edit-target="${target}">${component.series.map((series) => `<section><b>${escapeHtml(series.name)}</b>${series.values.map((value, index) => `<div class="bar-row"><span>${escapeHtml(component.labels[index] || '')}</span><i style="--bar:${Math.max(0, Math.min(100, Math.round((Math.abs(value) / maximum) * 100)))}%"></i><em>${escapeHtml(value)}</em></div>`).join('')}</section>`).join('')}</div>`;
  }
  return '';
};

const findComponent = (slide) => {
  const ref = Object.values(slide.composition.slots ?? {}).find((value) => value.startsWith('content.components.'));
  const id = ref?.slice('content.components.'.length);
  return slide.content.components.find((component) => component.id === id);
};

const primitiveRenderers = {
  cover: (slide, index, total) => `<div class="cover-copy"><p class="eyebrow">${String(index + 1).padStart(2, '0')} / ${String(total).padStart(2, '0')}</p>${editable(slide.id, 'title', 'h1', slide.content.title)}${editable(slide.id, 'subtitle', 'p', slide.content.subtitle, 'subtitle')}</div><aside class="cover-signal"><b>${String(index + 1).padStart(2, '0')}</b><i></i><span>${escapeHtml(slide.content.keyPoints[0])}</span></aside>`,
  'section-break': (slide, index, total) => `<p class="chapter-number">${String(index + 1).padStart(2, '0')}</p><div class="section-copy"><p class="eyebrow">SECTION / ${String(total).padStart(2, '0')}</p>${editable(slide.id, 'title', 'h2', slide.content.title)}${editable(slide.id, 'subtitle', 'p', slide.content.subtitle, 'subtitle')}</div>`,
  'title-points': (slide) => `<header>${editable(slide.id, 'title', 'h2', slide.content.title)}${editable(slide.id, 'subtitle', 'p', slide.content.subtitle, 'subtitle')}</header>${renderPoints(slide)}`,
  'split-proof': (slide) => `<div class="split-copy">${editable(slide.id, 'title', 'h2', slide.content.title)}${editable(slide.id, 'subtitle', 'p', slide.content.subtitle, 'subtitle')}</div><aside class="proof-panel">${renderPoints(slide, 'proof-list')}</aside>`,
  'metric-grid': (slide) => `<header>${editable(slide.id, 'title', 'h2', slide.content.title)}${editable(slide.id, 'subtitle', 'p', slide.content.subtitle, 'subtitle')}</header><div class="metric-cards" data-edit-target="slides.${attr(slide.id)}.content.keyPoints">${slide.content.keyPoints.map((point, index) => `<article><b>${String(index + 1).padStart(2, '0')}</b><p>${escapeHtml(point)}</p></article>`).join('')}</div>`,
  'process-flow': (slide) => `<header>${editable(slide.id, 'title', 'h2', slide.content.title)}${editable(slide.id, 'subtitle', 'p', slide.content.subtitle, 'subtitle')}</header><div class="process-steps" data-edit-target="slides.${attr(slide.id)}.content.keyPoints">${slide.content.keyPoints.map((point, index) => `<article><b>${String(index + 1).padStart(2, '0')}</b><p>${escapeHtml(point)}</p></article>`).join('')}</div>`,
  'component-focus': (slide) => `<header>${editable(slide.id, 'title', 'h2', slide.content.title)}${editable(slide.id, 'subtitle', 'p', slide.content.subtitle, 'subtitle')}</header>${renderComponent(findComponent(slide), slide.id)}`,
};

const renderSlide = (slide, index, total) => `<section class="slide motion-root primitive-${attr(slide.composition.primitive)} variant-${attr(slide.composition.variant)}" id="${attr(slide.id)}" data-slide-id="${attr(slide.id)}" data-primitive="${attr(slide.composition.primitive)}">${primitiveRenderers[slide.composition.primitive](slide, index, total)}</section>`;

const buildCss = (style) => `
:root{--canvas:${style.palette.canvas};--text:${style.palette.text};--muted:${style.palette.muted};--accent:${style.palette.accent};--surface:${style.palette.surface};--unit:${style.spacing.unit}px;--pad:${style.spacing.slidePadding}px;--radius:${style.geometry.radius}px;--border:${style.geometry.borderWidth}px}
*{box-sizing:border-box}html{background:#101114;scroll-snap-type:y mandatory}body{margin:0;color:var(--text);font-family:${style.typography.body};background:#101114}.deck{display:grid;gap:32px;justify-content:center}.slide{width:1600px;height:900px;padding:var(--pad);overflow:hidden;background:var(--canvas);border:var(--border) solid var(--muted);scroll-snap-align:start;display:grid;position:relative}.eyebrow{margin:0 0 30px;color:var(--accent);font:800 15px/1 ${style.typography.mono || style.typography.body};letter-spacing:.14em}.slide h1,.slide h2{margin:0;font-family:${style.typography.display};letter-spacing:-.045em;text-wrap:balance}.slide h1{font-size:82px;line-height:1.02}.slide h2{font-size:62px;line-height:1.05}.subtitle{max-width:900px;margin:28px 0 0;color:var(--muted);font-size:25px;line-height:1.45}.primitive-cover{grid-template-columns:8fr 4fr;gap:56px}.cover-copy{align-self:center}.cover-signal{padding:44px;background:var(--surface);border-radius:var(--radius);display:flex;flex-direction:column;justify-content:center;gap:28px}.cover-signal b,.chapter-number{margin:0;color:var(--accent);font:900 100px/1 ${style.typography.display}}.cover-signal i{height:max(1px,var(--border));background:var(--accent)}.cover-signal span{font-weight:800;font-size:20px;line-height:1.35}.primitive-section-break{grid-template-columns:4fr 8fr;align-items:center}.chapter-number{font-size:180px}.section-copy{padding-left:50px;border-left:max(1px,var(--border)) solid var(--accent)}.primitive-title-points,.primitive-metric-grid,.primitive-process-flow,.primitive-component-focus{grid-template-rows:auto 1fr;gap:44px}.point-list,.proof-list{list-style:none;margin:0;padding:0;display:grid;align-content:center;gap:16px}.point-list li,.proof-list li{display:grid;grid-template-columns:70px 1fr;gap:24px;align-items:start;padding:20px 0;border-top:max(1px,var(--border)) solid var(--muted)}.point-list span,.proof-list span{color:var(--accent);font:800 16px/1 ${style.typography.mono || style.typography.body}}.point-list p,.proof-list p{margin:0;font-size:27px;line-height:1.35}.primitive-split-proof{grid-template-columns:7fr 5fr;gap:56px;align-items:center}.proof-panel{align-self:stretch;padding:44px;background:var(--surface);border-radius:var(--radius);display:grid}.proof-list p{font-size:22px}.metric-cards{display:grid;grid-template-columns:repeat(3,1fr);gap:20px;align-content:stretch}.metric-cards article{padding:32px;background:var(--surface);border-radius:var(--radius);border-top:6px solid var(--accent)}.metric-cards b,.process-steps b{color:var(--accent);font:900 48px/1 ${style.typography.display}}.metric-cards p{margin:36px 0 0;font-size:24px;line-height:1.35}.process-steps{display:grid;grid-template-columns:repeat(5,1fr);gap:16px;align-items:center}.process-steps article{min-height:270px;padding:28px;background:var(--surface);border-radius:var(--radius);position:relative}.process-steps article:not(:last-child)::after{content:'→';position:absolute;right:-17px;top:112px;z-index:1;color:var(--accent);font-size:28px}.process-steps p{margin:40px 0 0;font-size:20px;line-height:1.35}.asset{min-height:0;overflow:hidden}.image-asset img{width:100%;height:100%;display:block}.text-asset{margin:0;padding:60px;background:var(--surface);border-left:8px solid var(--accent);font:600 44px/1.35 ${style.typography.display}}.citation-asset{align-self:start;font-size:28px}.citation-asset a{color:var(--accent)}.table-asset table{width:100%;border-collapse:collapse;font-size:20px}.table-asset th,.table-asset td{padding:16px;border-bottom:max(1px,var(--border)) solid var(--muted);text-align:left}.table-asset th{color:var(--accent)}.chart-asset{display:grid;gap:26px}.bar-row{display:grid;grid-template-columns:160px 1fr 80px;gap:18px;align-items:center;margin-top:14px}.bar-row i{height:18px;width:var(--bar);background:var(--accent);border-radius:var(--radius)}.bar-row em{font-style:normal;text-align:right}`;

export function renderFullDeck(input) {
  const spec = sanitizeDeckSpec(input);
  const deckValidation = validateDeckSpec(spec);
  const compositionValidation = validateDeckCompositions(spec);
  const errors = [...deckValidation.errors, ...compositionValidation.errors];
  if (errors.length) return { status: 'fail', errors };
  const slides = spec.slides.map((slide, index) => renderSlide(slide, index, spec.slides.length)).join('');
  const shell = `<!doctype html><html lang="${attr(spec.language)}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(spec.title)}</title><style>${buildCss(spec.style)}${buildMotionCss(spec.style.motion)}.deck{zoom:min(1,calc(100vw / 1600px))}.metric-cards{grid-template-columns:repeat(auto-fit,minmax(260px,1fr))}</style></head><body><main class="deck" data-deck-id="${attr(spec.deckId)}" data-style-id="${attr(spec.style.id)}">${slides}</main>${buildMotionRuntimeScript()}</body></html>`;
  return { status: 'pass', html: embedDeckSpec(shell, spec), spec };
}
