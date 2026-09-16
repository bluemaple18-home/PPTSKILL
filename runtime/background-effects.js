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

const hexToNumber = (value, fallback) => {
  const match = /^#([0-9a-f]{6})$/iu.exec(String(value ?? ''));
  return match ? Number.parseInt(match[1], 16) : fallback;
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
  const canvas = hexToNumber(style?.palette?.canvas, 0x121827);
  const accent = hexToNumber(style?.palette?.accent, 0x93c5fd);
  const text = hexToNumber(style?.palette?.text, 0xf6f7fb);
  const muted = hexToNumber(style?.palette?.muted, 0xb7c0d6);
  const surface = hexToNumber(style?.palette?.surface, scaleColor(canvas, 0.8));
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
