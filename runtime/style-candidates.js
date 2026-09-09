import { sanitizeDeckSpec } from './deck-spec.js';
import { compileVisualRouteCandidate, resolveRoleTreatments } from './design-grammar.js';
import { buildMotionRuntimeScript, resolveMotionPreset } from './motion-primitives.js';

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
  deckId: 'style-preview', title: 'Style preview', language: 'zh-Hant', style, slides: [],
}).style;

const structuralFields = [
  'coverArchetype', 'titlePlacement', 'visualAnchor', 'dominantRegionRatio',
  'negativeSpaceStrategy', 'graphicLanguage', 'typePersonality', 'surfaceLanguage',
];

const routeSignature = ({ visualRoute }) => Object.fromEntries(
  structuralFields.map((field) => [field, visualRoute?.[field]]),
);

const signatureText = (candidate) => structuralFields
  .map((field) => routeSignature(candidate)[field])
  .join('|');

export function validateRouteDiversity(candidates) {
  const errors = [];
  for (let left = 0; left < candidates.length; left += 1) {
    for (let right = left + 1; right < candidates.length; right += 1) {
      const a = routeSignature(candidates[left]);
      const b = routeSignature(candidates[right]);
      const different = structuralFields.filter((field) => a[field] !== b[field]);
      if (!a.coverArchetype || !b.coverArchetype || a.coverArchetype === b.coverArchetype || different.length < 3) {
        errors.push(`${candidates[left].style.id} 與 ${candidates[right].style.id} 使用相同骨架或不足三項結構差異。`);
      }
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

const compileCandidate = ({ kind, source, fixtureOnly = false }) => {
  const style = normalizeStyle(source);
  const visualRoute = compileVisualRouteCandidate({
    coverArchetype: source.coverArchetype,
    ...(source.effectLanguage ? { effectLanguage: source.effectLanguage } : {}),
    motionPersonality: style.motion.personality,
  });
  const candidate = { kind, fixtureOnly, style, visualRoute };
  return { ...candidate, structuralSignature: signatureText(candidate) };
};

export function compileStyleCandidates({ content, companyStylePack, aiRoutes }) {
  if (!content?.title || !content?.subtitle || !content?.identity) return { status: 'fail', reason: '缺少共同封面內容。' };
  if (!companyStylePack) return { status: 'blocked', reason: 'Company Style Pack 尚未提供。', required: 'company-style-pack' };
  if (!Array.isArray(aiRoutes) || aiRoutes.length !== 3) return { status: 'fail', reason: '必須恰有三個 AI Visual Routes。' };

  let candidates;
  try {
    candidates = [
      compileCandidate({ kind: 'company', source: companyStylePack.style, fixtureOnly: companyStylePack.fixtureOnly === true }),
      ...aiRoutes.map((route) => compileCandidate({ kind: 'ai', source: route })),
    ];
  } catch (error) {
    return { status: 'fail', reason: error.message };
  }
  const materialErrors = candidates.map(({ style }) => validateStyleMaterial(style)).filter(Boolean);
  if (materialErrors.length) return { status: 'fail', reason: materialErrors.join(' ') };
  const diversity = validateRouteDiversity(candidates);
  if (diversity.status !== 'pass') return diversity;
  const sharedContent = { title: content.title, subtitle: content.subtitle, identity: content.identity };
  return {
    status: 'pass', content: sharedContent,
    candidates: candidates.map((candidate) => ({ ...candidate, content: sharedContent })),
  };
}

const measureTitleToken = (token) => [...token].reduce(
  (total, character) => total + (/\p{Script=Han}/u.test(character) ? 1 : 0.56), 0,
);

export function splitTitleLines(title, maxUnits = 9) {
  const tokens = String(title).trim().split(/\s+/).filter(Boolean);
  const lines = [];
  let current = '';
  for (const token of tokens) {
    const proposed = current ? `${current} ${token}` : token;
    if (current && measureTitleToken(proposed) > maxUnits) {
      lines.push(current);
      current = token;
    } else current = proposed;
  }
  if (current) lines.push(current);
  const finalHanCount = [...(lines.at(-1) || '')].filter((character) => /\p{Script=Han}/u.test(character)).length;
  if (lines.length > 1 && finalHanCount <= 2) {
    const previousTokens = lines.at(-2).split(/\s+/);
    if (previousTokens.length > 1) lines.splice(-2, 2, previousTokens.slice(0, -1).join(' '), `${previousTokens.at(-1)} ${lines.at(-1)}`);
  }
  return lines;
}

const titleMarkup = (content) => splitTitleLines(content.title)
  .map((line) => `<span class="title-line">${escapeHtml(line)}</span>`).join('');

const copyMarkup = (content, copyClass) => `<section class="${copyClass}"><p class="identity">${escapeHtml(content.identity)}</p><h1 data-effect-title aria-label="${escapeHtml(content.title)}">${titleMarkup(content)}</h1><p class="subtitle">${escapeHtml(content.subtitle)}</p></section>`;

const archetypeMarkup = {
  'minimal-institutional': (content) => `<div class="institutional-rule" aria-hidden="true"></div>${copyMarkup(content, 'institutional-copy')}<div class="quiet-band" data-effect-visual-anchor aria-hidden="true"><span></span><span></span><span></span></div><p class="folio">01 / 04</p>`,
  'typography-hero': (content) => `<div class="type-monument" data-effect-visual-anchor aria-hidden="true"></div>${copyMarkup(content, 'type-copy')}<div class="type-rule" aria-hidden="true"></div>`,
  'graphic-brand-field': (content) => `<div class="brand-field" data-effect-visual-anchor aria-hidden="true"><div class="brand-orbit"><span></span><span></span><span></span></div></div>${copyMarkup(content, 'brand-copy')}<p class="brand-folio">01 / 04</p>`,
  'information-led-cover': (content) => `${copyMarkup(content, 'information-copy')}<div class="information-network" data-effect-visual-anchor aria-hidden="true"><i class="network-line line-a"></i><i class="network-line line-b"></i><i class="network-line line-c"></i><span class="node node-a"></span><span class="node node-b"></span><span class="node node-c"></span><span class="node node-d"></span><b>01</b></div>`,
};

const archetypeCss = {
  'minimal-institutional': `.stage{padding:72px 86px}.institutional-rule{position:absolute;left:86px;right:86px;top:72px;height:2px;background:var(--muted)}.institutional-copy{position:absolute;left:86px;bottom:104px;width:770px}.institutional-copy h1{font-size:76px}.quiet-band{position:absolute;right:86px;top:154px;width:500px;height:500px;border:2px solid var(--muted);display:grid;grid-template-columns:2fr 1fr 1fr;align-items:end;padding:34px;gap:16px}.quiet-band span{display:block;background:var(--accent)}.quiet-band span:nth-child(1){height:34%}.quiet-band span:nth-child(2){height:68%}.quiet-band span:nth-child(3){height:100%}.folio{position:absolute;right:86px;bottom:72px;margin:0;font:700 18px/1 var(--mono);letter-spacing:.12em}`,
  'typography-hero': `.stage{padding:58px 70px}.type-copy{position:absolute;left:70px;top:58px;width:1230px;z-index:2}.type-copy h1{margin-top:92px;font-size:108px;letter-spacing:-.07em}.type-copy .subtitle{position:absolute;left:0;top:610px;width:670px}.type-monument{position:absolute;right:58px;bottom:38px;width:430px;height:390px;opacity:.72}.type-monument::before{content:"01";position:absolute;inset:0;font:900 500px/.78 var(--display);letter-spacing:-.12em;color:transparent;-webkit-text-stroke:3px var(--accent)}.type-rule{position:absolute;left:70px;bottom:78px;width:650px;height:16px;background:var(--accent)}`,
  'graphic-brand-field': `.stage{padding:66px 72px}.brand-field{position:absolute;right:-40px;top:-40px;width:900px;height:980px;background:var(--surface);clip-path:polygon(22% 0,100% 0,100% 100%,0 100%);overflow:hidden}.brand-field::after{content:"01";position:absolute;right:82px;bottom:44px;font:900 250px/.8 var(--display);color:var(--canvas)}.brand-orbit{position:absolute;right:120px;top:92px;width:560px;height:560px;border:5px solid var(--accent);border-radius:50%}.brand-orbit span{position:absolute;border:2px solid var(--muted);border-radius:50%;inset:58px}.brand-orbit span:nth-child(2){inset:128px}.brand-orbit span:nth-child(3){inset:204px;background:var(--accent);border:0}.brand-copy{position:absolute;left:72px;top:102px;width:690px;z-index:2}.brand-copy h1{font-size:84px;margin-top:116px}.brand-copy .subtitle{width:530px;margin-top:48px}.brand-folio{position:absolute;left:72px;bottom:58px;margin:0;font:800 16px/1 var(--mono);letter-spacing:.18em}`,
  'information-led-cover': `.stage{padding:60px 68px}.information-copy{position:absolute;left:68px;top:64px;width:790px}.information-copy h1{font-size:78px;margin-top:72px}.information-copy .subtitle{width:670px}.information-network{position:absolute;right:48px;bottom:48px;width:650px;height:610px;border-left:2px solid var(--muted);border-bottom:2px solid var(--muted)}.information-network b{position:absolute;right:20px;top:-72px;font:900 120px/1 var(--display);color:var(--accent)}.node{position:absolute;width:56px;height:56px;border:8px solid var(--canvas);outline:2px solid var(--accent);background:var(--surface);border-radius:50%;z-index:2}.node-a{left:40px;bottom:82px}.node-b{left:238px;bottom:260px}.node-c{right:72px;bottom:168px}.node-d{right:184px;top:70px;background:var(--accent)}.network-line{position:absolute;height:3px;background:var(--muted);transform-origin:left center}.line-a{left:82px;bottom:124px;width:260px;transform:rotate(-42deg)}.line-b{left:278px;bottom:292px;width:284px;transform:rotate(19deg)}.line-c{right:112px;bottom:214px;width:270px;transform:rotate(-64deg)}`,
};

const buildRouteEffectCss = (style, treatments) => {
  const preset = resolveMotionPreset(style.motion);
  return `:root{--motion-duration:${preset.durationMs}ms;--motion-ease:${preset.easing};--motion-distance:${preset.distance}px;--motion-scale:${preset.scale}}
html.motion-ready .motion-root [data-effect-title]{opacity:0;clip-path:inset(0 100% 0 0);transform:translateY(var(--motion-distance));transition:opacity var(--motion-duration) var(--motion-ease),clip-path var(--motion-duration) var(--motion-ease),transform var(--motion-duration) var(--motion-ease)}
html.motion-ready .motion-root [data-effect-visual-anchor]{opacity:0;transform:scale(var(--motion-scale));transition:opacity var(--motion-duration) var(--motion-ease),transform var(--motion-duration) var(--motion-ease)}
html.motion-ready .motion-root.is-visible [data-effect-title]{opacity:1;clip-path:inset(0);transform:none}
html.motion-ready .motion-root.is-visible [data-effect-visual-anchor]{opacity:1;transform:none}
@media(prefers-reduced-motion:reduce){html.motion-ready .motion-root *,html.motion-ready .motion-root *::before,html.motion-ready .motion-root *::after{animation:none!important;transition:none!important;opacity:1!important;transform:none!important;clip-path:none!important}}
/* bounded-route-effects:${treatments.primaryFamilies.join('+')} */`;
};

const buildStageFitScript = () => `<script>(()=>{const fit=()=>document.documentElement.style.setProperty('--stage-scale',Math.min(innerWidth/1600,innerHeight/900));addEventListener('resize',fit);fit();})();</script>`;

export function buildStyleCoverPreview(candidate) {
  const { style, content, visualRoute } = candidate;
  const render = archetypeMarkup[visualRoute.coverArchetype];
  if (!render) throw new Error(`尚無 cover renderer：${visualRoute.coverArchetype}`);
  const treatments = resolveRoleTreatments(visualRoute, ['title', 'visualAnchor', 'supportingCopy']);
  const markup = render(content)
    .replace('data-effect-title', `data-effect-title="${escapeHtml(treatments.byRole.title)}"`)
    .replace('data-effect-visual-anchor', `data-effect-visual-anchor="${escapeHtml(treatments.byRole.visualAnchor)}"`);
  return `<!doctype html><html lang="zh-Hant"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(style.name)}</title><style>
*{box-sizing:border-box}html,body{margin:0;width:100%;height:100%;overflow:hidden}body{position:relative;background:${style.palette.canvas};color:${style.palette.text};font-family:${style.typography.body}}.stage{--canvas:${style.palette.canvas};--text:${style.palette.text};--muted:${style.palette.muted};--accent:${style.palette.accent};--surface:${style.palette.surface};--display:${style.typography.display};--body:${style.typography.body};--mono:${style.typography.mono || style.typography.body};position:absolute;left:50%;top:50%;width:1600px;height:900px;overflow:hidden;transform:translate(-50%,-50%) scale(var(--stage-scale,1));background:var(--canvas);color:var(--text);font-family:var(--body);transform-origin:center;border:${style.geometry.borderWidth}px solid var(--muted)}.identity{margin:0;font:800 15px/1 var(--mono);letter-spacing:.15em;text-transform:uppercase;color:var(--accent)}h1{margin:30px 0 0;font-family:var(--display);font-weight:800;letter-spacing:-.055em}.title-line{display:block;white-space:nowrap;line-height:1.25}.subtitle{margin:34px 0 0;color:var(--muted);font-size:26px;line-height:1.45}
${archetypeCss[visualRoute.coverArchetype]}
${buildRouteEffectCss(style, treatments)}
</style></head><body><main class="slide stage motion-root" data-style-id="${escapeHtml(style.id)}" data-cover-archetype="${escapeHtml(visualRoute.coverArchetype)}" data-static-contract="content-visible-without-motion">${markup}</main>${buildStageFitScript()}${buildMotionRuntimeScript()}</body></html>`;
}

export function selectStyleCandidate(compilation, styleId, approvedBy) {
  if (compilation.status !== 'pass') throw new Error('候選尚未通過 style gate。');
  if (approvedBy !== 'human') throw new Error('Style 只能由人類選擇。');
  const candidate = compilation.candidates.find(({ style }) => style.id === styleId);
  if (!candidate) throw new Error(`找不到 Style：${styleId}`);
  return { status: 'selected', approvedBy: 'human', style: candidate.style, visualRoute: candidate.visualRoute };
}
