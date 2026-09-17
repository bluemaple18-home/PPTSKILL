const PRODUCT_EFFECTS = ['waves', 'birds', 'net', 'globe', 'dots', 'fog', 'clouds', 'clouds2', 'cells', 'ripple', 'rings', 'halo', 'topology', 'trunk'];
const SUPPORTED_EFFECTS = new Set(['waves', 'birds', 'net', 'globe', 'dots', 'fog', 'clouds', 'cells', 'ripple', 'rings', 'halo']);
const SPEED_KEYS = Object.freeze({ waves: 'waveSpeed', birds: 'speedLimit', fog: 'speed', clouds: 'speed', cells: 'speed', ripple: 'speed', halo: 'speed' });
const INTENSITIES = new Set(['low', 'medium', 'high']);
const SPEEDS = new Set(['slow', 'normal', 'fast']);
const signalKeys = new Set(['slideId', 'effect', 'intensity', 'speed', 'palette']);
const allPrimitiveIds = new Set(['cover', 'section-break', 'title-points', 'split-proof', 'metric-grid', 'process-flow', 'component-focus']);

const unavailable = (reasonCode, message, provider) => ({ status: 'unavailable', reasonCode, message, provider });
const supported = (effect) => ({
  status: 'supported',
  provider: { name: effect === 'none' ? 'css-static' : 'vanta', version: effect === 'none' ? null : '0.5.24', license: 'MIT', bundled: true, ...(effect === 'none' ? {} : { dependency: { name: 'three', version: '0.134.0', license: 'MIT' } }) },
  speed: effect === 'none' ? [] : SPEED_KEYS[effect] ? ['slow', 'normal', 'fast'] : [],
  intensity: effect === 'none' ? [] : ['low', 'medium', 'high'],
  fallback: ['prefers-reduced-motion', 'forced-static', 'webgl-unavailable', 'init-failure'],
  ...(effect === 'ripple' ? { note: 'upstream_unadvertised_browser_verified' } : {}),
});

export function getBackgroundEffectCapabilities() {
  const effects = { none: supported('none') };
  for (const effect of PRODUCT_EFFECTS) {
    if (SUPPORTED_EFFECTS.has(effect)) effects[effect] = supported(effect);
    else if (effect === 'clouds2') effects[effect] = unavailable('texture_artifact_not_bundled', 'CLOUDS2 需要 upstream package 未攜帶的 noise texture，不能離線 offered。', { name: 'vanta', version: '0.5.24', license: 'MIT' });
    else effects[effect] = unavailable('license_gate', `${effect.toUpperCase()} 依賴 LGPL-2.1 p5；未通過產品 license gate。`, { name: 'vanta+p5', version: '0.5.24', license: 'MIT + LGPL-2.1' });
  }
  return { version: 1, effects };
}

export function sanitizeCompositionBackgroundEffect(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return null;
  const capability = getBackgroundEffectCapabilities().effects[input.effect];
  if (!capability || capability.status !== 'supported' || input.effect === 'none') return null;
  if (!INTENSITIES.has(input.intensity) || input.palette !== 'style') return null;
  const speedSupported = capability.speed.length > 0;
  if ((speedSupported && !SPEEDS.has(input.speed)) || (!speedSupported && input.speed !== undefined)) return null;
  return { effect: input.effect, intensity: input.intensity, ...(speedSupported ? { speed: input.speed } : {}), palette: 'style' };
}

export function validateSlideBackgroundEffect(slide) {
  if (slide?.composition?.backgroundEffect == null) return [];
  return sanitizeCompositionBackgroundEffect(slide.composition.backgroundEffect)
    ? []
    : [`${slide.id} 的 CompositionSpec backgroundEffect 不在 supported allowlist。`];
}

export function validateDeckBackgroundEffects(spec) {
  return (spec?.slides ?? []).flatMap(validateSlideBackgroundEffect);
}

const normalizeSignal = (signal) => {
  if (!signal || typeof signal !== 'object' || Array.isArray(signal)) throw new Error('background signal 必須是 object。');
  const unknown = Object.keys(signal).filter((key) => !signalKeys.has(key));
  if (unknown.length) throw new Error(`${signal.slideId || 'unknown'} background signal 不允許欄位：${unknown.join(', ')}。`);
  if (!PRODUCT_EFFECTS.includes(signal.effect) && signal.effect !== 'none') throw new Error(`${signal.slideId || 'unknown'} background effect 不在產品 vocabulary。`);
  if (signal.effect === 'none') {
    if (signal.intensity !== undefined || signal.speed !== undefined || signal.palette !== undefined) throw new Error(`${signal.slideId || 'unknown'} none background 不接受效果參數。`);
    return signal;
  }
  if (signal.palette !== 'style' || !INTENSITIES.has(signal.intensity)) throw new Error(`${signal.slideId || 'unknown'} background signal 不符合 allowlist。`);
  return signal;
};

export function planBackgroundEffects({ slides = [], deckRhythmPlan, backgroundSignals = [] } = {}) {
  if (!Array.isArray(backgroundSignals)) throw new Error('backgroundSignals 必須是陣列。');
  if (backgroundSignals.length === 0) return null;
  if (!deckRhythmPlan || !Array.isArray(deckRhythmPlan.slides)) throw new Error('Background planning 需要完整 Deck Rhythm Plan。');
  const capabilities = getBackgroundEffectCapabilities();
  const slideById = new Map(slides.map((slide) => [slide.id, slide]));
  const rhythmById = new Map(deckRhythmPlan.slides.map((item) => [item.slideId, item]));
  const seen = new Set();
  const proposals = backgroundSignals.map((raw) => {
    const signal = normalizeSignal(raw);
    if (!slideById.has(signal.slideId)) throw new Error(`backgroundSignals 含未知 slide：${signal.slideId}。`);
    if (seen.has(signal.slideId)) throw new Error(`backgroundSignals 重複 slide：${signal.slideId}。`);
    seen.add(signal.slideId);
    const rhythm = rhythmById.get(signal.slideId);
    if (!rhythm) throw new Error(`${signal.slideId} 缺 Deck Rhythm Plan。`);
    const capability = capabilities.effects[signal.effect];
    const reasons = [];
    if (signal.effect === 'none') return { slideId: signal.slideId, effect: 'none', status: 'available', compositionBackgroundEffect: null, reasons: [{ code: 'background_none_selected', message: '本頁維持靜態背景。' }], contentIntegrity: structuredClone(rhythm.contentIntegrity) };
    if (capability.status !== 'supported') reasons.push({ code: capability.reasonCode, message: capability.message });
    if (!allPrimitiveIds.has(rhythm.selected.primitive)) reasons.push({ code: 'background_primitive_unavailable', message: 'Background effect 只支援既有 composition primitive。' });
    if (rhythm.signals.motionIntensity === 'none') reasons.push({ code: 'background_motion_intensity_none', message: 'Deck Rhythm Plan 已將本頁 motionIntensity 設為 none。' });
    if (capability.status === 'supported' && capability.speed.length === 0 && signal.speed !== undefined) reasons.push({ code: 'background_speed_unavailable', message: `${signal.effect} 沒有可承諾的 speed control。` });
    if (capability.status === 'supported' && capability.speed.length > 0 && !SPEEDS.has(signal.speed)) reasons.push({ code: 'background_speed_required', message: `${signal.effect} 必須明示 slow | normal | fast。` });
    const compositionBackgroundEffect = reasons.length ? null : sanitizeCompositionBackgroundEffect(signal);
    return { slideId: signal.slideId, effect: signal.effect, status: reasons.length || !compositionBackgroundEffect ? 'unavailable' : 'available', ...(reasons.length ? { reasons } : { compositionBackgroundEffect }), contentIntegrity: structuredClone(rhythm.contentIntegrity) };
  });
  return { version: 1, status: proposals.every(({ status }) => status === 'available') ? 'ready' : 'ready-with-unavailable', capabilities, proposals, contentIntegrity: structuredClone(deckRhythmPlan.contentIntegrity) };
}

// 與 pinned Three.js 色名表一致；background adapter 在 Node 端也必須理解 DeckSpec 允許的 CSS 色彩。
const CSS_COLOR_NAMES = Object.freeze({ aliceblue:0xf0f8ff,antiquewhite:0xfaebd7,aqua:0x00ffff,aquamarine:0x7fffd4,azure:0xf0ffff,beige:0xf5f5dc,bisque:0xffe4c4,black:0x000000,blanchedalmond:0xffebcd,blue:0x0000ff,blueviolet:0x8a2be2,brown:0xa52a2a,burlywood:0xdeb887,cadetblue:0x5f9ea0,chartreuse:0x7fff00,chocolate:0xd2691e,coral:0xff7f50,cornflowerblue:0x6495ed,cornsilk:0xfff8dc,crimson:0xdc143c,cyan:0x00ffff,darkblue:0x00008b,darkcyan:0x008b8b,darkgoldenrod:0xb8860b,darkgray:0xa9a9a9,darkgreen:0x006400,darkgrey:0xa9a9a9,darkkhaki:0xbdb76b,darkmagenta:0x8b008b,darkolivegreen:0x556b2f,darkorange:0xff8c00,darkorchid:0x9932cc,darkred:0x8b0000,darksalmon:0xe9967a,darkseagreen:0x8fbc8f,darkslateblue:0x483d8b,darkslategray:0x2f4f4f,darkslategrey:0x2f4f4f,darkturquoise:0x00ced1,darkviolet:0x9400d3,deeppink:0xff1493,deepskyblue:0x00bfff,dimgray:0x696969,dimgrey:0x696969,dodgerblue:0x1e90ff,firebrick:0xb22222,floralwhite:0xfffaf0,forestgreen:0x228b22,fuchsia:0xff00ff,gainsboro:0xdcdcdc,ghostwhite:0xf8f8ff,gold:0xffd700,goldenrod:0xdaa520,gray:0x808080,green:0x008000,greenyellow:0xadff2f,grey:0x808080,honeydew:0xf0fff0,hotpink:0xff69b4,indianred:0xcd5c5c,indigo:0x4b0082,ivory:0xfffff0,khaki:0xf0e68c,lavender:0xe6e6fa,lavenderblush:0xfff0f5,lawngreen:0x7cfc00,lemonchiffon:0xfffacd,lightblue:0xadd8e6,lightcoral:0xf08080,lightcyan:0xe0ffff,lightgoldenrodyellow:0xfafad2,lightgray:0xd3d3d3,lightgreen:0x90ee90,lightgrey:0xd3d3d3,lightpink:0xffb6c1,lightsalmon:0xffa07a,lightseagreen:0x20b2aa,lightskyblue:0x87cefa,lightslategray:0x778899,lightslategrey:0x778899,lightsteelblue:0xb0c4de,lightyellow:0xffffe0,lime:0x00ff00,limegreen:0x32cd32,linen:0xfaf0e6,magenta:0xff00ff,maroon:0x800000,mediumaquamarine:0x66cdaa,mediumblue:0x0000cd,mediumorchid:0xba55d3,mediumpurple:0x9370db,mediumseagreen:0x3cb371,mediumslateblue:0x7b68ee,mediumspringgreen:0x00fa9a,mediumturquoise:0x48d1cc,mediumvioletred:0xc71585,midnightblue:0x191970,mintcream:0xf5fffa,mistyrose:0xffe4e1,moccasin:0xffe4b5,navajowhite:0xffdead,navy:0x000080,oldlace:0xfdf5e6,olive:0x808000,olivedrab:0x6b8e23,orange:0xffa500,orangered:0xff4500,orchid:0xda70d6,palegoldenrod:0xeee8aa,palegreen:0x98fb98,paleturquoise:0xafeeee,palevioletred:0xdb7093,papayawhip:0xffefd5,peachpuff:0xffdab9,peru:0xcd853f,pink:0xffc0cb,plum:0xdda0dd,powderblue:0xb0e0e6,purple:0x800080,rebeccapurple:0x663399,red:0xff0000,rosybrown:0xbc8f8f,royalblue:0x4169e1,saddlebrown:0x8b4513,salmon:0xfa8072,sandybrown:0xf4a460,seagreen:0x2e8b57,seashell:0xfff5ee,sienna:0xa0522d,silver:0xc0c0c0,skyblue:0x87ceeb,slateblue:0x6a5acd,slategray:0x708090,slategrey:0x708090,snow:0xfffafa,springgreen:0x00ff7f,steelblue:0x4682b4,tan:0xd2b48c,teal:0x008080,thistle:0xd8bfd8,tomato:0xff6347,transparent:0x000000,turquoise:0x40e0d0,violet:0xee82ee,wheat:0xf5deb3,white:0xffffff,whitesmoke:0xf5f5f5,yellow:0xffff00,yellowgreen:0x9acd32 });
const clampByte = (value) => Math.round(Math.max(0, Math.min(255, value)));
const channelsToNumber = (r, g, b) => (clampByte(r) << 16) + (clampByte(g) << 8) + clampByte(b);
const hueToChannel = (p, q, value) => {
  let hue = value;
  if (hue < 0) hue += 1;
  if (hue > 1) hue -= 1;
  if (hue < 1 / 6) return p + (q - p) * 6 * hue;
  if (hue < 1 / 2) return q;
  if (hue < 2 / 3) return p + (q - p) * 6 * (2 / 3 - hue);
  return p;
};
const cssColorToNumber = (value, fallback) => {
  const input = String(value ?? '').trim().toLowerCase();
  const hex = /^#([0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/u.exec(input)?.[1];
  if (hex) {
    const rgb = hex.length <= 4 ? [...hex.slice(0, 3)].map((digit) => digit.repeat(2)).join('') : hex.slice(0, 6);
    return Number.parseInt(rgb, 16);
  }
  const rgb = /^rgba?\(\s*([0-9.]+%?)\s*,\s*([0-9.]+%?)\s*,\s*([0-9.]+%?)(?:\s*,\s*[0-9.]+%?)?\s*\)$/u.exec(input);
  if (rgb) {
    const channel = (part) => part.endsWith('%') ? Number.parseFloat(part) * 2.55 : Number.parseFloat(part);
    return channelsToNumber(channel(rgb[1]), channel(rgb[2]), channel(rgb[3]));
  }
  const hsl = /^hsla?\(\s*([0-9.]+)\s*,\s*([0-9.]+)%\s*,\s*([0-9.]+)%(?:\s*,\s*[0-9.]+%?)?\s*\)$/u.exec(input);
  if (hsl) {
    const h = (Number.parseFloat(hsl[1]) % 360) / 360, s = Math.max(0, Math.min(1, Number.parseFloat(hsl[2]) / 100)), l = Math.max(0, Math.min(1, Number.parseFloat(hsl[3]) / 100));
    if (s === 0) return channelsToNumber(l * 255, l * 255, l * 255);
    const q = l <= 0.5 ? l * (1 + s) : l + s - l * s, p = 2 * l - q;
    return channelsToNumber(hueToChannel(p, q, h + 1 / 3) * 255, hueToChannel(p, q, h) * 255, hueToChannel(p, q, h - 1 / 3) * 255);
  }
  return CSS_COLOR_NAMES[input] ?? fallback;
};
const scaleColor = (color, factor) => {
  const r = Math.round(((color >> 16) & 255) * factor);
  const g = Math.round(((color >> 8) & 255) * factor);
  const b = Math.round((color & 255) * factor);
  return (Math.min(255, r) << 16) + (Math.min(255, g) << 8) + Math.min(255, b);
};
const byLevel = (level, values) => values[{ low: 0, medium: 1, high: 2 }[level]];
const bySpeed = (speed, values) => values[{ slow: 0, normal: 1, fast: 2 }[speed]];

export function resolveBackgroundEffectOptions(backgroundEffect, style) {
  const clean = sanitizeCompositionBackgroundEffect(backgroundEffect);
  if (!clean) throw new Error('backgroundEffect 不在 supported allowlist。');
  const canvas = cssColorToNumber(style?.palette?.canvas, 0x121827);
  const accent = cssColorToNumber(style?.palette?.accent, 0x93c5fd);
  const text = cssColorToNumber(style?.palette?.text, 0xf6f7fb);
  const muted = cssColorToNumber(style?.palette?.muted, 0xb7c0d6);
  const surface = cssColorToNumber(style?.palette?.surface, scaleColor(canvas, 0.8));
  const speed = clean.speed;
  const options = {
    waves: { color: scaleColor(canvas, 0.85), shininess: byLevel(clean.intensity, [12, 24, 42]), waveHeight: byLevel(clean.intensity, [8, 14, 22]), waveSpeed: bySpeed(speed, [0.55, 1, 1.45]), zoom: 1 },
    birds: { backgroundColor: canvas, color1: accent, color2: text, birdSize: byLevel(clean.intensity, [0.65, 0.9, 1.25]), wingSpan: 24, speedLimit: bySpeed(speed, [2.5, 4.5, 7]), separation: 28, alignment: 24, cohesion: 22, quantity: byLevel(clean.intensity, [2, 3, 4]) },
    net: { backgroundColor: canvas, color: accent, points: byLevel(clean.intensity, [6, 9, 13]), maxDistance: 22, spacing: 17, showDots: true },
    globe: { backgroundColor: canvas, color: accent, color2: text, size: 0.9, points: byLevel(clean.intensity, [6, 9, 12]), maxDistance: 22, spacing: 17, showDots: true },
    dots: { backgroundColor: canvas, color: accent, color2: muted, size: byLevel(clean.intensity, [1.8, 2.8, 4]), spacing: 38, showLines: true },
    fog: { baseColor: canvas, highlightColor: accent, midtoneColor: surface, lowlightColor: scaleColor(canvas, 0.65), blurFactor: byLevel(clean.intensity, [0.4, 0.58, 0.75]), speed: bySpeed(speed, [0.45, 0.9, 1.35]), zoom: 1 },
    clouds: { backgroundColor: canvas, skyColor: canvas, cloudColor: surface, cloudShadowColor: scaleColor(canvas, 0.7), sunColor: accent, sunGlareColor: muted, sunlightColor: text, speed: bySpeed(speed, [0.45, 0.85, 1.25]) },
    cells: { backgroundColor: canvas, color1: canvas, color2: scaleColor(canvas, 0.8), size: byLevel(clean.intensity, [1, 1.5, 2.2]), speed: bySpeed(speed, [0.5, 1, 1.5]) },
    ripple: { backgroundColor: canvas, color1: canvas, color2: accent, amplitudeFactor: byLevel(clean.intensity, [0.55, 1, 1.55]), ringFactor: 4, rotationFactor: 0.1, speed: bySpeed(speed, [0.45, 0.85, 1.2]) },
    rings: { backgroundColor: canvas, color: accent },
    halo: { backgroundColor: canvas, baseColor: accent, color2: muted, amplitudeFactor: byLevel(clean.intensity, [0.55, 1, 1.45]), ringFactor: 1, rotationFactor: 1, size: 1, speed: bySpeed(speed, [0.5, 1, 1.4]), xOffset: 0, yOffset: 0 },
  }[clean.effect];
  return structuredClone(options);
}

export function buildBackgroundBrowserContractRuntime() {
  return [
    `const PRODUCT_EFFECTS=${JSON.stringify(PRODUCT_EFFECTS)};`,
    `const SUPPORTED_EFFECTS=new Set(${JSON.stringify([...SUPPORTED_EFFECTS])});`,
    `const SPEED_KEYS=${JSON.stringify(SPEED_KEYS)};`,
    `const INTENSITIES=new Set(${JSON.stringify([...INTENSITIES])});`,
    `const SPEEDS=new Set(${JSON.stringify([...SPEEDS])});`,
    `const unavailable=${unavailable.toString()};`,
    `const supported=${supported.toString()};`,
    getBackgroundEffectCapabilities.toString(),
    sanitizeCompositionBackgroundEffect.toString(),
    validateSlideBackgroundEffect.toString(),
  ].join('');
}
