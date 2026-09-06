const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

const PERSONALITY_PRESETS = Object.freeze({
  none: { distance: 0, scale: 1, stagger: 0, overshoot: 1 },
  corporate: { distance: 12, scale: 0.992, stagger: 45, overshoot: 1 },
  premium: { distance: 18, scale: 0.985, stagger: 70, overshoot: 1 },
  energetic: { distance: 26, scale: 0.97, stagger: 55, overshoot: 1.01 },
  playful: { distance: 20, scale: 0.965, stagger: 60, overshoot: 1.015 },
});

export function resolveMotionPreset(motion = {}) {
  const personality = PERSONALITY_PRESETS[motion.personality] ? motion.personality : 'corporate';
  const preset = PERSONALITY_PRESETS[personality];
  return {
    personality,
    durationMs: clamp(Number.isFinite(motion.durationMs) ? motion.durationMs : 260, 0, 1200),
    easing: motion.easing || 'ease-out',
    distance: preset.distance,
    scale: preset.scale,
    stagger: preset.stagger,
    overshoot: preset.overshoot,
  };
}

export function buildMotionCss(motion = {}) {
  const preset = resolveMotionPreset(motion);
  return `
:root{--motion-duration:${preset.durationMs}ms;--motion-ease:${preset.easing};--motion-distance:${preset.distance}px;--motion-scale:${preset.scale};--motion-stagger:${preset.stagger}ms;--motion-overshoot:${preset.overshoot}}
html.motion-ready .motion-root h1,html.motion-ready .motion-root h2,html.motion-ready .motion-root .subtitle,html.motion-ready .motion-root .eyebrow,html.motion-ready .motion-root .identity{opacity:0;transform:translateY(var(--motion-distance));transition:opacity var(--motion-duration) var(--motion-ease),transform var(--motion-duration) var(--motion-ease)}
html.motion-ready .motion-root .cover-signal,html.motion-ready .motion-root .proof-panel,html.motion-ready .motion-root .asset,html.motion-ready .motion-root .signal,html.motion-ready .motion-root .proof,html.motion-ready .motion-root .map,html.motion-ready .motion-root .rail{opacity:0;transform:scale(var(--motion-scale));transition:opacity var(--motion-duration) var(--motion-ease),transform var(--motion-duration) var(--motion-ease)}
html.motion-ready .motion-root .chapter-number,html.motion-ready .motion-root .cover-signal b,html.motion-ready .motion-root .signal span,html.motion-ready .motion-root .proof>b,html.motion-ready .motion-root .metric-cards b,html.motion-ready .motion-root .process-steps b{opacity:0;transform:translateY(calc(var(--motion-distance) * .55)) scale(var(--motion-scale));transition:opacity var(--motion-duration) var(--motion-ease),transform var(--motion-duration) var(--motion-ease)}
html.motion-ready .motion-root .cover-signal i,html.motion-ready .motion-root .signal i,html.motion-ready .motion-root .map i,html.motion-ready .motion-root .bar-row i{transform-origin:left center;transform:scaleX(0);transition:transform var(--motion-duration) var(--motion-ease)}
html.motion-ready .motion-root .point-list li,html.motion-ready .motion-root .proof-list li,html.motion-ready .motion-root .metric-cards article,html.motion-ready .motion-root .process-steps article,html.motion-ready .motion-root .proof li,html.motion-ready .motion-root .map b{opacity:0;transform:translateY(calc(var(--motion-distance) * .7));transition:opacity var(--motion-duration) var(--motion-ease),transform var(--motion-duration) var(--motion-ease)}
html.motion-ready .motion-root.is-visible h1,html.motion-ready .motion-root.is-visible h2,html.motion-ready .motion-root.is-visible .subtitle,html.motion-ready .motion-root.is-visible .eyebrow,html.motion-ready .motion-root.is-visible .identity,html.motion-ready .motion-root.is-visible .cover-signal,html.motion-ready .motion-root.is-visible .proof-panel,html.motion-ready .motion-root.is-visible .asset,html.motion-ready .motion-root.is-visible .signal,html.motion-ready .motion-root.is-visible .proof,html.motion-ready .motion-root.is-visible .map,html.motion-ready .motion-root.is-visible .rail,html.motion-ready .motion-root.is-visible .chapter-number,html.motion-ready .motion-root.is-visible .cover-signal b,html.motion-ready .motion-root.is-visible .signal span,html.motion-ready .motion-root.is-visible .proof>b,html.motion-ready .motion-root.is-visible .metric-cards b,html.motion-ready .motion-root.is-visible .process-steps b{opacity:1;transform:none}
html.motion-ready .motion-root.is-visible .cover-signal i,html.motion-ready .motion-root.is-visible .signal i,html.motion-ready .motion-root.is-visible .map i,html.motion-ready .motion-root.is-visible .bar-row i{transform:scaleX(1)}
html.motion-ready .motion-root.is-visible .point-list li,html.motion-ready .motion-root.is-visible .proof-list li,html.motion-ready .motion-root.is-visible .metric-cards article,html.motion-ready .motion-root.is-visible .process-steps article,html.motion-ready .motion-root.is-visible .proof li,html.motion-ready .motion-root.is-visible .map b{opacity:1;transform:none}
html.motion-ready .motion-root.is-visible .point-list li:nth-child(2),html.motion-ready .motion-root.is-visible .proof-list li:nth-child(2),html.motion-ready .motion-root.is-visible .metric-cards article:nth-child(2),html.motion-ready .motion-root.is-visible .process-steps article:nth-child(2),html.motion-ready .motion-root.is-visible .proof li:nth-child(2),html.motion-ready .motion-root.is-visible .map b:nth-of-type(2){transition-delay:var(--motion-stagger)}
html.motion-ready .motion-root.is-visible .point-list li:nth-child(3),html.motion-ready .motion-root.is-visible .proof-list li:nth-child(3),html.motion-ready .motion-root.is-visible .metric-cards article:nth-child(3),html.motion-ready .motion-root.is-visible .process-steps article:nth-child(3),html.motion-ready .motion-root.is-visible .proof li:nth-child(3),html.motion-ready .motion-root.is-visible .map b:nth-of-type(3){transition-delay:calc(var(--motion-stagger) * 2)}
html.motion-ready .motion-root.is-visible .point-list li:nth-child(4),html.motion-ready .motion-root.is-visible .proof-list li:nth-child(4),html.motion-ready .motion-root.is-visible .metric-cards article:nth-child(4),html.motion-ready .motion-root.is-visible .process-steps article:nth-child(4),html.motion-ready .motion-root.is-visible .proof li:nth-child(4),html.motion-ready .motion-root.is-visible .map b:nth-of-type(4){transition-delay:calc(var(--motion-stagger) * 3)}
html.motion-ready .motion-root.is-visible .point-list li:nth-child(5),html.motion-ready .motion-root.is-visible .proof-list li:nth-child(5),html.motion-ready .motion-root.is-visible .metric-cards article:nth-child(5),html.motion-ready .motion-root.is-visible .process-steps article:nth-child(5){transition-delay:calc(var(--motion-stagger) * 4)}
@media(prefers-reduced-motion:reduce){html.motion-ready .motion-root *,html.motion-ready .motion-root *::before,html.motion-ready .motion-root *::after{animation:none!important;transition:none!important;opacity:1!important;transform:none!important}}
`;
}

export function buildMotionRuntimeScript() {
  return `<script>(()=>{const reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;document.documentElement.classList.add('motion-ready');const roots=[...document.querySelectorAll('.motion-root')];if(reduce||!('IntersectionObserver'in window)){roots.forEach((root)=>root.classList.add('is-visible'));return;}const observer=new IntersectionObserver((entries)=>{for(const entry of entries){if(entry.isIntersecting)entry.target.classList.add('is-visible');}},{threshold:.32});roots.forEach((root)=>observer.observe(root));})();</script>`;
}
