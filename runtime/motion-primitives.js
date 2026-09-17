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
html.motion-ready .motion-root [data-effect-treatment="mask-reveal"]{clip-path:inset(0 100% 0 0);transform:translateY(calc(var(--motion-distance) * .45));transition:clip-path var(--motion-duration) var(--motion-ease),transform var(--motion-duration) var(--motion-ease)}
html.motion-ready .motion-root [data-effect-treatment="restrained-fade-rise"]{opacity:0;transform:translateY(calc(var(--motion-distance) * .55));transition:opacity var(--motion-duration) var(--motion-ease),transform var(--motion-duration) var(--motion-ease)}
html.motion-ready .motion-root [data-effect-treatment="image-zoom-settle"],html.motion-ready .motion-root [data-effect-treatment="editorial-frame"]{opacity:0;transform:scale(var(--motion-scale));transition:opacity var(--motion-duration) var(--motion-ease),transform var(--motion-duration) var(--motion-ease)}
html.motion-ready .motion-root [data-pptskill-text-entrance]{opacity:0;transform:translateY(calc(var(--motion-distance) * .55));transition:opacity var(--motion-duration) var(--motion-ease) var(--pptskill-text-delay),transform var(--motion-duration) var(--motion-ease) var(--pptskill-text-delay)}
html.motion-ready .motion-root [data-pptskill-text-entrance="subtitle"]{position:relative}
html.motion-ready .motion-root [data-pptskill-text-entrance="subtitle"]::after{content:"";position:absolute;left:0;bottom:-8px;width:100%;height:1px;background:var(--accent);transform:scaleX(0);transform-origin:left center;transition:transform var(--motion-duration) var(--motion-ease) var(--pptskill-text-delay)}
html.motion-ready .motion-root.motion-resetting [data-pptskill-text-entrance],html.motion-ready .motion-root.motion-resetting [data-pptskill-text-entrance="subtitle"]::after{transition:none!important}
html.motion-ready .motion-root.is-visible [data-effect-treatment="hard-cut-field"],html.motion-ready .motion-root.is-visible [data-effect-treatment="hard-rule"],html.motion-ready .motion-root.is-visible [data-effect-treatment="brand-device-accent"],html.motion-ready .motion-root.is-visible [data-effect-treatment="outlined-surface"],html.motion-ready .motion-root.is-visible [data-effect-treatment="rule-draw"],html.motion-ready .motion-root.is-visible [data-effect-treatment="mask-reveal"],html.motion-ready .motion-root.is-visible [data-effect-treatment="restrained-fade-rise"],html.motion-ready .motion-root.is-visible [data-effect-treatment="image-zoom-settle"],html.motion-ready .motion-root.is-visible [data-effect-treatment="editorial-frame"]{opacity:1;transform:none;clip-path:inset(0)}
html.motion-ready .motion-root.is-visible [data-effect-treatment="folio-emphasis"] .metric-value,html.motion-ready .motion-root.is-visible [data-effect-treatment="staggered-sequence"]>article,html.motion-ready .motion-root.is-visible [data-effect-treatment="progressive-reveal"]>article{opacity:1;transform:none}
html.motion-ready .motion-root.is-visible [data-pptskill-text-entrance]{opacity:1;transform:none}
html.motion-ready .motion-root.is-visible [data-pptskill-text-entrance="subtitle"]::after{transform:scaleX(1)}
html.motion-ready .motion-root.is-visible [data-effect-treatment="rule-draw"] .bar-row i{transform:scaleX(1)}
html.motion-ready .motion-root.is-visible [data-effect-treatment="staggered-sequence"]>article:nth-child(2),html.motion-ready .motion-root.is-visible [data-effect-treatment="progressive-reveal"]>article:nth-child(2){transition-delay:var(--motion-stagger)}
html.motion-ready .motion-root.is-visible [data-effect-treatment="staggered-sequence"]>article:nth-child(3),html.motion-ready .motion-root.is-visible [data-effect-treatment="progressive-reveal"]>article:nth-child(3){transition-delay:calc(var(--motion-stagger) * 2)}
html.motion-ready .motion-root.is-visible [data-effect-treatment="staggered-sequence"]>article:nth-child(4),html.motion-ready .motion-root.is-visible [data-effect-treatment="progressive-reveal"]>article:nth-child(4){transition-delay:calc(var(--motion-stagger) * 3)}
html.motion-ready .motion-root.is-visible [data-effect-treatment="staggered-sequence"]>article:nth-child(5),html.motion-ready .motion-root.is-visible [data-effect-treatment="progressive-reveal"]>article:nth-child(5){transition-delay:calc(var(--motion-stagger) * 4)}
@media(prefers-reduced-motion:reduce){html.motion-ready .motion-root *,html.motion-ready .motion-root *::before,html.motion-ready .motion-root *::after{animation:none!important;transition:none!important;opacity:1!important;transform:none!important;clip-path:none!important}}
html.motion-static .motion-root *,html.motion-static .motion-root *::before,html.motion-static .motion-root *::after{animation:none!important;transition:none!important;opacity:1!important;transform:none!important;clip-path:none!important}
`;
}

export function buildMotionRuntimeScript() {
  return `<script>(()=>{const forcedStatic=window.__PPTSKILL_FORCE_STATIC__===true,reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;const runtimeReady=typeof requestAnimationFrame==='function'&&typeof IntersectionObserver==='function';document.documentElement.classList.add('motion-ready');const roots=[...document.querySelectorAll('.motion-root')];const flows=root=>[...root.querySelectorAll('[data-pptskill-odometer]')];const format=el=>({useGrouping:el.dataset.useGrouping==='true',minimumFractionDigits:Number(el.dataset.fractionDigits),maximumFractionDigits:Number(el.dataset.fractionDigits)});const staticState=()=>forcedStatic?'static':reduce?'reduced':'static';const setStatic=el=>{el.animated=false;if(typeof el.update==='function')el.update(Number(el.dataset.to),format(el));else el.textContent=el.dataset.finalDisplay;el.dataset.motionState=staticState()};const setRootStatic=root=>{root.classList.remove('motion-resetting');root.classList.add('is-visible');root.dataset.motionState=staticState();flows(root).forEach(setStatic)};const replaySlide=async id=>{const root=document.querySelector('.motion-root[data-slide-id="'+CSS.escape(id)+'"]');if(!root)return false;const items=flows(root),textEffect=root.dataset.motionEffect==='underline-sweep',numberFlow=root.dataset.motionEffect==='number-flow-odometer',numberFlowReady=typeof customElements!=='undefined'&&Boolean(customElements.get('number-flow'));if(forcedStatic||reduce||!runtimeReady||(numberFlow&&!numberFlowReady)){setRootStatic(root);return false}document.documentElement.classList.remove('motion-static');if(textEffect)root.classList.add('motion-resetting');root.classList.remove('is-visible');root.dataset.motionState='reset';if(numberFlow){await customElements.whenDefined('number-flow');items.forEach(el=>{el.animated=false;el.update(Number(el.dataset.from),format(el));el.dataset.motionState='primed'})}void root.offsetWidth;await new Promise(resolve=>requestAnimationFrame(resolve));if(textEffect){root.classList.remove('motion-resetting');void root.offsetWidth}await new Promise(resolve=>requestAnimationFrame(resolve));root.classList.add('is-visible');root.dataset.motionState='running';root.dataset.replayCount=String(Number(root.dataset.replayCount||0)+1);if(numberFlow)items.forEach((el,index)=>setTimeout(()=>{el.animated=true;el.update(Number(el.dataset.to),format(el));el.dataset.motionState='running';el.dataset.replayCount=String(Number(el.dataset.replayCount||0)+1)},Number(el.dataset.staggerMs||80)*index));return textEffect||numberFlow};document.querySelectorAll('[data-pptskill-odometer]').forEach(el=>{el.addEventListener('animationsstart',()=>el.dataset.animationStarts=String(Number(el.dataset.animationStarts||0)+1));el.addEventListener('animationsfinish',()=>{el.dataset.motionState='finished';el.dataset.animationFinishes=String(Number(el.dataset.animationFinishes||0)+1)})});const show=root=>{if(root.classList.contains('is-visible'))return;if(root.dataset.motionEffect)replaySlide(root.dataset.slideId);else root.classList.add('is-visible')};const forceStatic=()=>{document.documentElement.classList.add('motion-static');roots.forEach(setRootStatic)};if(forcedStatic||reduce||!runtimeReady)forceStatic();else{const observer=new IntersectionObserver(entries=>{for(const entry of entries)if(entry.isIntersecting)show(entry.target)},{threshold:.32});roots.forEach(root=>observer.observe(root))}window.PPTSKILLMotion={replaySlide,forceStatic,getCapabilities:()=>({numberFlow:typeof customElements!=='undefined'&&Boolean(customElements.get('number-flow')),textEntrance:runtimeReady,reducedMotion:reduce,forcedStatic})}})();</script>`;
}
