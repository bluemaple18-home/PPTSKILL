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
html.motion-ready .motion-root [data-effect-treatment="hard-cut-field"]{clip-path:inset(0 0 100% 0);transform:translateY(var(--motion-distance));transition:clip-path var(--motion-duration) var(--motion-ease),transform var(--motion-duration) var(--motion-ease)}
html.motion-ready .motion-root [data-effect-treatment="hard-rule"]{clip-path:inset(0 100% 0 0);transform:translateX(calc(var(--motion-distance) * -.5));transition:clip-path var(--motion-duration) var(--motion-ease),transform var(--motion-duration) var(--motion-ease)}
html.motion-ready .motion-root [data-effect-treatment="brand-device-accent"]{opacity:0;transform:scale(var(--motion-scale));transition:opacity var(--motion-duration) var(--motion-ease),transform var(--motion-duration) var(--motion-ease)}
html.motion-ready .motion-root [data-effect-treatment="outlined-surface"]{clip-path:inset(0 0 100% 0);transition:clip-path var(--motion-duration) var(--motion-ease)}
html.motion-ready .motion-root [data-effect-treatment="folio-emphasis"] .metric-value{opacity:0;transform:translateY(calc(var(--motion-distance) * .7));transition:opacity var(--motion-duration) var(--motion-ease),transform var(--motion-duration) var(--motion-ease)}
html.motion-ready .motion-root [data-effect-treatment="staggered-sequence"]>article,html.motion-ready .motion-root [data-effect-treatment="progressive-reveal"]>article{opacity:0;transform:translateY(calc(var(--motion-distance) * .7));transition:opacity var(--motion-duration) var(--motion-ease),transform var(--motion-duration) var(--motion-ease)}
html.motion-ready .motion-root [data-effect-treatment="rule-draw"]{clip-path:inset(0 100% 0 0);transition:clip-path var(--motion-duration) var(--motion-ease)}
html.motion-ready .motion-root .system-axis[data-effect-treatment="rule-draw"]{clip-path:inset(0 0 100% 0)}
html.motion-ready .motion-root [data-effect-treatment="rule-draw"] .bar-row i{transform-origin:left center;transform:scaleX(0);transition:transform var(--motion-duration) var(--motion-ease)}
html.motion-ready .motion-root.is-visible [data-effect-treatment="hard-cut-field"],html.motion-ready .motion-root.is-visible [data-effect-treatment="hard-rule"],html.motion-ready .motion-root.is-visible [data-effect-treatment="brand-device-accent"],html.motion-ready .motion-root.is-visible [data-effect-treatment="outlined-surface"],html.motion-ready .motion-root.is-visible [data-effect-treatment="rule-draw"]{opacity:1;transform:none;clip-path:inset(0)}
html.motion-ready .motion-root.is-visible [data-effect-treatment="folio-emphasis"] .metric-value,html.motion-ready .motion-root.is-visible [data-effect-treatment="staggered-sequence"]>article,html.motion-ready .motion-root.is-visible [data-effect-treatment="progressive-reveal"]>article{opacity:1;transform:none}
html.motion-ready .motion-root.is-visible [data-effect-treatment="rule-draw"] .bar-row i{transform:scaleX(1)}
html.motion-ready .motion-root.is-visible [data-effect-treatment="staggered-sequence"]>article:nth-child(2),html.motion-ready .motion-root.is-visible [data-effect-treatment="progressive-reveal"]>article:nth-child(2){transition-delay:var(--motion-stagger)}
html.motion-ready .motion-root.is-visible [data-effect-treatment="staggered-sequence"]>article:nth-child(3),html.motion-ready .motion-root.is-visible [data-effect-treatment="progressive-reveal"]>article:nth-child(3){transition-delay:calc(var(--motion-stagger) * 2)}
html.motion-ready .motion-root.is-visible [data-effect-treatment="staggered-sequence"]>article:nth-child(4),html.motion-ready .motion-root.is-visible [data-effect-treatment="progressive-reveal"]>article:nth-child(4){transition-delay:calc(var(--motion-stagger) * 3)}
html.motion-ready .motion-root.is-visible [data-effect-treatment="staggered-sequence"]>article:nth-child(5),html.motion-ready .motion-root.is-visible [data-effect-treatment="progressive-reveal"]>article:nth-child(5){transition-delay:calc(var(--motion-stagger) * 4)}
@media(prefers-reduced-motion:reduce){html.motion-ready .motion-root *,html.motion-ready .motion-root *::before,html.motion-ready .motion-root *::after{animation:none!important;transition:none!important;opacity:1!important;transform:none!important;clip-path:none!important}}
`;
}

export function buildMotionRuntimeScript() {
  return `<script>(()=>{const reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;document.documentElement.classList.add('motion-ready');const roots=[...document.querySelectorAll('.motion-root')];if(reduce||!('IntersectionObserver'in window)){roots.forEach((root)=>root.classList.add('is-visible'));return;}const observer=new IntersectionObserver((entries)=>{for(const entry of entries){if(entry.isIntersecting)entry.target.classList.add('is-visible');}},{threshold:.32});roots.forEach((root)=>observer.observe(root));})();</script>`;
}
