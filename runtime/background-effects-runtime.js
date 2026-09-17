export const buildBackgroundEffectsCss = () => `
.slide>[data-pptskill-background-layer]{position:absolute;inset:0;z-index:0;overflow:hidden;pointer-events:none;background:var(--canvas)}
.slide>[data-pptskill-background-layer] canvas{display:block;width:100%!important;height:100%!important}
.slide>[data-pptskill-background-layer]~*{position:relative;z-index:1}
`;

export const buildBackgroundEffectsRuntimeScript = () => String.raw`<script data-pptskill-background-runtime>(()=>{
const q=(s,r=document)=>r.querySelector(s),qa=(s,r=document)=>[...r.querySelectorAll(s)];
const layers=new Map(),visibleLayers=new Set();let forcedStatic=false,observer;
const motionPreference=matchMedia('(prefers-reduced-motion: reduce)');
const reduced=()=>forcedStatic||motionPreference.matches;
const webgl=()=>{try{const c=document.createElement('canvas');return Boolean(c.getContext('webgl2')||c.getContext('webgl'))}catch{return false}};
const dispose=v=>{try{v?.dispose?.()}catch{}};
const disposeVariable=v=>{for(const target of v?.renderTargets||[])dispose(target);dispose(v?.material);dispose(v?.initialValueTexture)};
const disposeInstance=(instance,effect)=>{if(effect==='halo'){dispose(instance?.bufferTarget);dispose(instance?.bufferFeedback)}if(effect==='birds'){disposeVariable(instance?.positionVariable);disposeVariable(instance?.velocityVariable)}try{instance?.destroy?.()}catch{}};
const destroy=layer=>{const state=layers.get(layer);if(!state)return;disposeInstance(state.instance,state.effect);qa('canvas',layer).forEach(node=>node.remove());layer.removeAttribute('style');layer.dataset.backgroundState='static';layers.delete(layer)};
const init=layer=>{if(!layer||layers.has(layer))return false;if(reduced()){layer.dataset.backgroundState=forcedStatic?'forced-static':'reduced';return false}if(!webgl()){layer.dataset.backgroundState='webgl-unavailable';return false}const effect=layer.dataset.backgroundEffect||'',factory=window.VANTA?.[effect.toUpperCase()];if(typeof factory!=='function'){layer.dataset.backgroundState='unavailable';return false}let instance;try{const options=JSON.parse(layer.dataset.backgroundOptions||'{}');instance=factory({...options,el:layer,THREE:window.THREE,mouseControls:false,touchControls:false,gyroControls:false});if(!q('canvas',layer))throw new Error('missing canvas');layers.set(layer,{instance,effect});layer.dataset.backgroundState='running';return true}catch{disposeInstance(instance,effect);qa('canvas',layer).forEach(node=>node.remove());layer.removeAttribute('style');layer.dataset.backgroundState='init-failure';return false}};
const replaySlide=id=>{const layer=q('.slide[data-slide-id="'+CSS.escape(id)+'"] [data-pptskill-background-layer]');if(!layer)return false;if(reduced()){destroy(layer);layer.dataset.backgroundState=forcedStatic?'forced-static':'reduced';return false}destroy(layer);return init(layer)};
const forceStatic=()=>{forcedStatic=true;for(const layer of [...layers.keys()])destroy(layer);qa('[data-pptskill-background-layer]').forEach(layer=>layer.dataset.backgroundState='forced-static')};
const applyMotionPreference=()=>{const nodes=qa('[data-pptskill-background-layer]');if(reduced()){for(const layer of [...layers.keys()])destroy(layer);nodes.forEach(layer=>layer.dataset.backgroundState=forcedStatic?'forced-static':'reduced');return}nodes.filter(layer=>!visibleLayers.has(layer)).forEach(layer=>layer.dataset.backgroundState='static');for(const layer of visibleLayers)init(layer)};
const boot=()=>{const nodes=qa('[data-pptskill-background-layer]');if(typeof IntersectionObserver!=='function')nodes.forEach(node=>visibleLayers.add(node));else{observer=new IntersectionObserver(entries=>entries.forEach(({target,isIntersecting})=>{if(isIntersecting){visibleLayers.add(target);if(reduced()){destroy(target);target.dataset.backgroundState=forcedStatic?'forced-static':'reduced'}else init(target)}else{visibleLayers.delete(target);destroy(target)}}),{threshold:.05});nodes.forEach(node=>observer.observe(node))}motionPreference.addEventListener?.('change',applyMotionPreference);window.addEventListener('pagehide',()=>{motionPreference.removeEventListener?.('change',applyMotionPreference);observer?.disconnect();for(const layer of [...layers.keys()])destroy(layer)},{once:true});applyMotionPreference()};
window.PPTSKILLBackground={init,replaySlide,forceStatic,destroy,getState:()=>qa('[data-pptskill-background-layer]').map(layer=>({slideId:layer.closest('.slide')?.dataset.slideId,effect:layer.dataset.backgroundEffect,state:layer.dataset.backgroundState||'idle'}))};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();</script>`;
