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

const rendererStructuralFields = [
  'titleRegion', 'anchorRegion', 'overlap', 'dominantAxis',
  'occupiedQuadrants', 'anchorCopyRelation', 'silhouette',
];

const rendererStructures = {
  'minimal-institutional': {
    titleRegion: 'lower-left', anchorRegion: 'upper-right', overlap: 'none',
    dominantAxis: 'corner-diagonal', occupiedQuadrants: 'q2+q3+q4',
    anchorCopyRelation: 'detached', silhouette: 'quiet-offset-frame',
  },
  'typography-hero': {
    titleRegion: 'center-edge-span', anchorRegion: 'full-width-type-crop', overlap: 'fused',
    dominantAxis: 'vertical-drop', occupiedQuadrants: 'q1+q2+q3+q4',
    anchorCopyRelation: 'self-anchored-type', silhouette: 'edge-type-mass',
  },
  'graphic-brand-field': {
    titleRegion: 'upper-left-to-center', anchorRegion: 'lower-full-width-bleed', overlap: 'controlled',
    dominantAxis: 'field-to-copy', occupiedQuadrants: 'q1+q2+q3+q4',
    anchorCopyRelation: 'field-enclosure', silhouette: 'offstage-brand-field',
  },
  'information-led-cover': {
    titleRegion: 'upper-right', anchorRegion: 'stepped-left-to-lower-center', overlap: 'controlled',
    dominantAxis: 'evidence-sequence', occupiedQuadrants: 'q1+q2+q3+q4',
    anchorCopyRelation: 'semantic-evidence', silhouette: 'stepped-information-band',
  },
  'full-bleed-editorial': {
    titleRegion: 'lower-left-overlay', anchorRegion: 'full-bleed-image-field', overlap: 'text-over-anchor',
    dominantAxis: 'lower-left-rise', occupiedQuadrants: 'q1+q2+q3+q4',
    anchorCopyRelation: 'overlay', silhouette: 'full-bleed-field',
  },
};

const rendererSignatureText = (profile) => rendererStructuralFields
  .map((field) => profile?.[field])
  .join('|');

export function getRendererStructuralSignature(coverArchetype) {
  const profile = rendererStructures[coverArchetype];
  if (!profile) throw new Error(`尚無 renderer structure：${coverArchetype}`);
  return structuredClone(profile);
}

export function validateRouteDiversity(candidates) {
  const errors = [];
  for (let left = 0; left < candidates.length; left += 1) {
    for (let right = left + 1; right < candidates.length; right += 1) {
      const a = candidates[left].rendererStructure;
      const b = candidates[right].rendererStructure;
      const different = rendererStructuralFields.filter((field) => a?.[field] !== b?.[field]);
      if (!a || !b || a.silhouette === b.silhouette || different.length < 4) {
        errors.push(`${candidates[left].style.id} 與 ${candidates[right].style.id} 的 renderer 構圖側寫不足四項差異，或 silhouette 重複。`);
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

const compileCandidate = ({ kind, source, fixtureOnly = false, brandAssets = null }) => {
  const style = normalizeStyle(source);
  const visualRoute = compileVisualRouteCandidate({
    coverArchetype: source.coverArchetype,
    ...(source.effectLanguage ? { effectLanguage: source.effectLanguage } : {}),
    motionPersonality: style.motion.personality,
  });
  const rendererStructure = getRendererStructuralSignature(visualRoute.coverArchetype);
  const candidate = { kind, fixtureOnly, style, visualRoute, rendererStructure, ...(brandAssets ? { brandAssets } : {}) };
  return { ...candidate, structuralSignature: rendererSignatureText(rendererStructure) };
};

export function compileStyleCandidates({ content, companyStylePack, aiRoutes }) {
  if (!content?.title || !content?.subtitle || !content?.identity) return { status: 'fail', reason: '缺少共同封面內容。' };
  if (!companyStylePack) return { status: 'blocked', reason: 'Company Style Pack 尚未提供。', required: 'company-style-pack' };
  if (!Array.isArray(aiRoutes) || aiRoutes.length !== 3) return { status: 'fail', reason: '必須恰有三個 AI Visual Routes。' };

  let candidates;
  try {
    candidates = [
      compileCandidate({ kind: 'company', source: companyStylePack.style, fixtureOnly: companyStylePack.fixtureOnly === true, brandAssets: companyStylePack.assets }),
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
  const tokens = String(title).trim().split(/\s+/).filter(Boolean).flatMap((token) => {
    if (measureTitleToken(token) <= maxUnits) return [token];
    const chunks = [];
    let chunk = '';
    for (const character of token) {
      if (chunk && measureTitleToken(`${chunk}${character}`) > maxUnits) {
        chunks.push(chunk);
        chunk = character;
      } else chunk += character;
    }
    if (chunk) chunks.push(chunk);
    return chunks;
  });
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
    else {
      const previousCharacters = [...lines.at(-2)];
      const finalCharacters = [...lines.at(-1)];
      let needed = 3 - finalHanCount;
      while (needed > 0 && previousCharacters.length > 3) {
        const moved = previousCharacters.pop();
        finalCharacters.unshift(moved);
        if (/\p{Script=Han}/u.test(moved)) needed -= 1;
      }
      lines.splice(-2, 2, previousCharacters.join(''), finalCharacters.join(''));
    }
  }
  return lines;
}

const titleMarkup = (content) => splitTitleLines(content.title)
  .map((line) => `<span class="title-line">${escapeHtml(line)}</span>`).join('');

const copyMarkup = (content, copyClass) => `<section class="${copyClass}"><p class="identity">${escapeHtml(content.identity)}</p><h1 data-effect-title aria-label="${escapeHtml(content.title)}">${titleMarkup(content)}</h1><p class="subtitle">${escapeHtml(content.subtitle)}</p></section>`;

const stableVariant = (value, count) => [...String(value)].reduce((sum, character) => sum + character.codePointAt(0), 0) % count;

const typographyAnchorMarkup = (content) => {
  const variants = ['edge', 'stack', 'outline'];
  const variant = variants[stableVariant(content.title, variants.length)];
  const compactTitle = [...String(content.title).replace(/\s+/g, '')];
  const glyphs = variant === 'stack'
    ? compactTitle.slice(-2).join('')
    : compactTitle.slice(0, 4).join('');
  return `<div class="type-monument type-monument--${variant}" data-glyphs="${escapeHtml(glyphs)}" data-anchor-variant="${variant}" data-effect-visual-anchor aria-hidden="true"></div>`;
};

const subtitleSegments = (subtitle) => String(subtitle)
  .replace(/^從/u, '')
  .split(/[、，；;|。]+|到(?=[^\s])/u)
  .map((segment) => segment.trim())
  .filter(Boolean)
  .slice(0, 4);

const informationAnchorMarkup = (content) => {
  const segments = subtitleSegments(content.subtitle);
  if (segments.length < 2) {
    return `<div class="information-fallback" data-anchor-mode="neutral-fallback" data-semantic-source="none" data-effect-visual-anchor aria-hidden="true"><span></span><b>${escapeHtml(content.identity)}</b></div>`;
  }
  return `<ol class="information-sequence" data-anchor-mode="semantic-sequence" data-semantic-source="subtitle" data-effect-visual-anchor>${segments.map((segment, index) => `<li><span>${String(index + 1).padStart(2, '0')}</span><b>${escapeHtml(segment)}</b></li>`).join('')}</ol>`;
};

const brandAnchorMarkup = (content) => {
  const characters = [...String(content.title).replace(/\s+/g, '')].slice(0, 7);
  const modules = characters.map((character, index) => {
    const width = 38 + ((character.codePointAt(0) + index * 17) % 55);
    const shift = ((character.codePointAt(0) + index * 11) % 5) * 34;
    return `<span style="--module:${width}%;--shift:${shift}px"></span>`;
  }).join('');
  const variants = ['rising', 'falling', 'alternating'];
  const variant = variants[stableVariant(content.title, variants.length)];
  return `<div class="brand-field brand-field--${variant}" data-geometry-family="modular-cadence" data-anchor-variant="${variant}" data-effect-visual-anchor aria-hidden="true"><div class="brand-rhythm">${modules}</div></div>`;
};

const archetypeMarkup = {
  'minimal-institutional': (content) => `<div class="institutional-rule" aria-hidden="true"></div>${copyMarkup(content, 'institutional-copy')}<div class="quiet-band" data-effect-visual-anchor aria-hidden="true"><span></span><span></span><span></span></div><p class="folio">01 / 04</p>`,
  'typography-hero': (content) => `${typographyAnchorMarkup(content)}${copyMarkup(content, 'type-copy')}`,
  'graphic-brand-field': (content) => `${brandAnchorMarkup(content)}${copyMarkup(content, 'brand-copy')}<p class="brand-folio">PPTSKILL / COVER</p>`,
  'information-led-cover': (content) => `${copyMarkup(content, 'information-copy')}${informationAnchorMarkup(content)}`,
  'full-bleed-editorial': (content, style, route, assets) => {
    if (!assets?.coverField || !assets?.logoWhite) throw new Error('Company cover 缺少可攜品牌素材。');
    return `<div class="company-cover-field" style="background-image:url(&quot;${escapeHtml(assets.coverField)}&quot;)" aria-hidden="true"></div><img class="company-logo" src="${escapeHtml(assets.logoWhite)}" alt="Company logo">${copyMarkup(content, 'company-cover-copy')}<span class="company-cover-rule" data-effect-visual-anchor aria-hidden="true"></span>`;
  },
};

const archetypeCss = {
  'minimal-institutional': `.stage{padding:72px 86px}.institutional-rule{position:absolute;left:86px;right:86px;top:72px;height:2px;background:var(--muted)}.institutional-copy{position:absolute;left:86px;bottom:104px;width:770px}.institutional-copy h1{font-size:76px}.quiet-band{position:absolute;right:86px;top:154px;width:500px;height:500px;border:2px solid var(--muted);display:grid;grid-template-columns:2fr 1fr 1fr;align-items:end;padding:34px;gap:16px}.quiet-band span{display:block;background:var(--accent)}.quiet-band span:nth-child(1){height:34%}.quiet-band span:nth-child(2){height:68%}.quiet-band span:nth-child(3){height:100%}.folio{position:absolute;right:86px;bottom:72px;margin:0;font:700 18px/1 var(--mono);letter-spacing:.12em}`,
  'typography-hero': `.stage{padding:58px 70px}.type-copy{position:absolute;left:70px;top:58px;width:1420px;z-index:2}.type-copy h1{margin-top:118px;font-size:116px;line-height:.94;letter-spacing:-.075em}.type-copy .subtitle{position:absolute;right:10px;top:670px;width:610px;margin:0;text-align:right}.type-monument{position:absolute;inset:0;overflow:hidden;color:transparent;opacity:.58;-webkit-text-stroke:3px var(--accent)}.type-monument::before{content:attr(data-glyphs);position:absolute;display:block;overflow:hidden;font:900 520px/.72 var(--display);letter-spacing:-.14em}.type-monument--edge::before{left:0;bottom:0;width:1600px;height:390px;white-space:nowrap}.type-monument--stack::before{right:70px;top:82px;width:330px;height:680px;white-space:normal;overflow-wrap:anywhere;font-size:300px;line-height:.92;letter-spacing:-.05em}.type-monument--outline::before{left:200px;bottom:0;width:1400px;height:440px;font-size:590px;white-space:nowrap}`,
  'graphic-brand-field': `.stage{padding:66px 72px}.brand-field{position:absolute;left:-80px;right:-80px;top:330px;height:650px;background:var(--surface);clip-path:polygon(0 24%,44% 0,100% 14%,100% 100%,0 100%);overflow:hidden}.brand-rhythm{position:absolute;left:560px;right:-80px;top:80px;bottom:28px;display:flex;flex-direction:column;gap:18px;transform:rotate(-7deg)}.brand-rhythm span{display:block;height:48px;width:var(--module);margin-left:var(--shift);background:var(--accent)}.brand-field--falling .brand-rhythm{transform:rotate(7deg);align-items:flex-end}.brand-field--alternating .brand-rhythm span:nth-child(even){margin-left:calc(var(--shift) + 150px);background:var(--canvas)}.brand-copy{position:absolute;left:72px;top:70px;width:1250px;z-index:2}.brand-copy h1{font-size:98px;line-height:.98;margin-top:78px}.brand-copy .subtitle{width:640px;margin-top:42px}.brand-folio{position:absolute;right:72px;bottom:42px;margin:0;font:800 16px/1 var(--mono);letter-spacing:.18em;z-index:3}`,
  'information-led-cover': `.stage{padding:60px 68px}.information-copy{position:absolute;right:68px;top:58px;width:760px;z-index:3}.information-copy h1{font-size:76px;line-height:1;margin-top:54px}.information-copy .subtitle{position:absolute;right:0;top:650px;width:560px;margin:0;text-align:right;font-size:22px}.information-sequence{position:absolute;left:0;top:0;width:1120px;height:850px;margin:0;padding:0;list-style:none}.information-sequence li{position:absolute;width:600px;min-height:116px;border-top:3px solid var(--accent);padding:18px 18px 14px 112px;background:var(--canvas);color:var(--text)}.information-sequence li::after{content:"";position:absolute;left:54px;top:100%;width:2px;height:104px;background:var(--muted);transform:rotate(-42deg);transform-origin:top}.information-sequence li:last-child::after{display:none}.information-sequence li:nth-child(1){left:68px;top:180px}.information-sequence li:nth-child(2){left:250px;top:398px}.information-sequence li:nth-child(3){left:432px;top:616px;width:660px}.information-sequence li:nth-child(4){left:720px;top:690px;width:580px}.information-sequence span{position:absolute;left:18px;top:16px;font:800 20px/1 var(--mono);color:var(--accent)}.information-sequence b{display:block;font:800 28px/1.25 var(--display)}.information-fallback{position:absolute;left:68px;right:68px;bottom:88px;height:190px;border-top:3px solid var(--accent);display:flex;align-items:flex-end;justify-content:space-between;padding:0 0 24px}.information-fallback span{width:68%;height:26px;background:var(--surface)}.information-fallback b{font:700 16px/1 var(--mono);color:var(--muted)}`,
  'full-bleed-editorial': `.stage{padding:0;background:#191919;border:0}.company-cover-field{position:absolute;inset:0;background-position:center;background-size:cover}.company-logo{position:absolute;right:31px;top:40px;width:247px;height:auto;z-index:3}.company-cover-copy{position:absolute;left:97px;top:286px;width:1290px;z-index:2}.company-cover-copy .identity{display:none}.company-cover-copy h1{margin:0;font-size:100px;line-height:1.08;letter-spacing:-.055em}.company-cover-copy .subtitle{width:1060px;margin-top:88px;color:#fff;font-size:40px;line-height:1.35}.company-cover-rule{position:absolute;left:110px;top:568px;width:401px;height:6px;background:var(--accent);z-index:2}`,
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
  const { style, content, visualRoute, rendererStructure = getRendererStructuralSignature(candidate.visualRoute.coverArchetype) } = candidate;
  const render = archetypeMarkup[visualRoute.coverArchetype];
  if (!render) throw new Error(`尚無 cover renderer：${visualRoute.coverArchetype}`);
  const treatments = resolveRoleTreatments(visualRoute, ['title', 'visualAnchor', 'supportingCopy']);
  const markup = render(content, style, visualRoute, candidate.brandAssets)
    .replace('data-effect-title', `data-effect-title="${escapeHtml(treatments.byRole.title)}"`)
    .replace('data-effect-visual-anchor', `data-effect-visual-anchor="${escapeHtml(treatments.byRole.visualAnchor)}"`);
  const structureAttributes = rendererStructuralFields
    .map((field) => `data-${field.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`)}="${escapeHtml(rendererStructure[field])}"`)
    .join(' ');
  return `<!doctype html><html lang="zh-Hant"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(style.name)}</title><style>
*{box-sizing:border-box}html,body{margin:0;width:100%;height:100%;overflow:hidden}body{position:relative;background:${style.palette.canvas};color:${style.palette.text};font-family:${style.typography.body}}.stage{--canvas:${style.palette.canvas};--text:${style.palette.text};--muted:${style.palette.muted};--accent:${style.palette.accent};--surface:${style.palette.surface};--display:${style.typography.display};--body:${style.typography.body};--mono:${style.typography.mono || style.typography.body};position:absolute;left:50%;top:50%;width:1600px;height:900px;overflow:hidden;transform:translate(-50%,-50%) scale(var(--stage-scale,1));background:var(--canvas);color:var(--text);font-family:var(--body);transform-origin:center;border:${style.geometry.borderWidth}px solid var(--muted)}.identity{margin:0;font:800 15px/1 var(--mono);letter-spacing:.15em;text-transform:uppercase;color:var(--accent)}h1{margin:30px 0 0;font-family:var(--display);font-weight:800;letter-spacing:-.055em}.title-line{display:block;white-space:nowrap;line-height:1.25}.subtitle{margin:34px 0 0;color:var(--muted);font-size:26px;line-height:1.45}
${archetypeCss[visualRoute.coverArchetype]}
${buildRouteEffectCss(style, treatments)}
</style></head><body><main class="slide stage motion-root" data-style-id="${escapeHtml(style.id)}" data-cover-archetype="${escapeHtml(visualRoute.coverArchetype)}" data-composition-signature="${escapeHtml(rendererSignatureText(rendererStructure))}" ${structureAttributes} data-static-contract="content-visible-without-motion">${markup}</main>${buildStageFitScript()}${buildMotionRuntimeScript()}</body></html>`;
}

export function selectStyleCandidate(compilation, styleId, approvedBy) {
  if (compilation.status !== 'pass') throw new Error('候選尚未通過 style gate。');
  if (approvedBy !== 'human') throw new Error('Style 只能由人類選擇。');
  const candidate = compilation.candidates.find(({ style }) => style.id === styleId);
  if (!candidate) throw new Error(`找不到 Style：${styleId}`);
  return { status: 'selected', approvedBy: 'human', style: candidate.style, visualRoute: candidate.visualRoute };
}
