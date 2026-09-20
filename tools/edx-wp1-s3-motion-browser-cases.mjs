import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { extractDeckSpec } from '../runtime/deck-spec.js';
import { renderFullDeck } from '../runtime/full-deck-renderer.js';

export const motionTreatments = ['brand-device-accent', 'image-zoom-settle', 'restrained-fade-rise'];
export async function buildMotionFixture(treatment) {
  assert.ok(motionTreatments.includes(treatment));
  const spec = JSON.parse(await readFile(new URL('../fixtures/full-deck-spec.json', import.meta.url), 'utf8'));
  spec.slides = spec.slides.filter(s => s.id === 'portable');
  spec.slides[0].content.components = [{ id: 'portable-quote', type: 'text', text: '幾何與動效保留驗收' }];
  spec.slides[0].composition.geometryOverrides = { 'portable-quote': { x: 800, y: 280, width: 640, height: 480 } };
  if (treatment === 'image-zoom-settle') spec.slides[0].content.components[0] = { id: 'portable-quote', type: 'image', alt: '動效圖片', dataUri: 'data:image/svg+xml;base64,' + Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="600" height="400"><rect width="600" height="400" fill="#4477aa"/></svg>').toString('base64') };
  const result = renderFullDeck(spec); assert.equal(result.status, 'pass');
  // 限域 treatment fixture：只替換既有 component 的 effect token，不改 CSS／DeckSpec motion。
  // restrained-fade-rise 目前預設屬 supportingCopy；此 probe 驗證它與 component geometry 的 seam。
  const html = result.html.replace(/<[^>]*data-pptskill-element-id="component-portable-quote"[^>]*>/, tag => tag.replace(/data-effect-treatment="[^"]+"/, `data-effect-treatment="${treatment}"`));
  assert.ok(html.includes(`data-effect-treatment="${treatment}"`));
  return { spec: extractDeckSpec(html), html };
}

export async function runMotionBrowserCases({ cdp, evaluate, navigate, outputDir, width, selector, run, click, startGesture, endGesture }) {
  const target = { slideId: 'portable', elementId: 'component-portable-quote' };
  const getSpec = () => evaluate('window.PPTSKILLEditor.getDeckSpec()');
  const operate = (operation, value) => evaluate(`window.PPTSKILLEditor.executeOperation(${JSON.stringify({ operation, target, value })})`);
  const measure = () => evaluate(`(()=>{const e=document.querySelector(${JSON.stringify(selector)}),s=e.closest('.slide').getBoundingClientRect(),r=e.getBoundingClientRect(),k=s.width/1600,c=getComputedStyle(e);return{visibility:document.visibilityState,rootClasses:e.closest('.slide').className,animations:e.getAnimations().map(a=>({playState:a.playState,currentTime:a.currentTime,timing:a.effect.getComputedTiming()})),rect:{x:(r.x-s.x)/k,y:(r.y-s.y)/k,width:r.width/k,height:r.height/k},transform:c.transform,opacity:c.opacity,treatment:e.dataset.effectTreatment,custom:e.style.getPropertyValue('--motion-probe'),color:e.style.color,priority:e.style.getPropertyPriority('color'),inline:['transform','translate','rotate','scale'].map(k=>[k,e.style.getPropertyValue(k),e.style.getPropertyPriority(k)])}})()`);
  const assertRect = (actual, expected) => { for (const k of Object.keys(expected)) assert.ok(Math.abs(actual[k] - expected[k]) < 1, `${k}: ${actual[k]} != ${expected[k]}`); };
  const identity = value => value === 'none' || value === 'matrix(1, 0, 0, 1, 0, 0)';
  const pause = () => evaluate('new Promise(ok=>setTimeout(()=>ok(true),1500))');
  const checkMotion = async (treatment, mode, box, phase) => {
    await evaluate(`document.querySelector(${JSON.stringify(selector)}).closest('.slide').classList.remove('is-visible')`);
    await pause(); const start = await measure();
    assert.equal(start.treatment, treatment);
    if (mode === 'normal') assert.equal(identity(start.transform), false, treatment + ' 起點不得為 identity');
    else { assert.ok(identity(start.transform)); assertRect(start.rect, box); assert.equal(start.opacity, '1'); }
    await evaluate('window.PPTSKILLMotion.replaySlide("portable")');
    await pause(); const end = await measure(); (run.motionObservations ||= []).push({ treatment, mode, phase, start, end }); assert.ok(identity(end.transform), JSON.stringify({ treatment, mode, phase, start, end })); assertRect(end.rect, box); assert.equal(end.opacity, '1');
    assert.equal(end.custom, 'keep'); assert.equal(end.color, 'rgb(90, 40, 130)'); assert.equal(end.priority, 'important');
    assert.ok(end.inline.every(([, value]) => value === ''), '不得重新引入 inline suppression');
    run.checks.push({ treatment, mode, phase, start, end });
  };
  const saveExport = async (label, expected) => {
    const html = await evaluate('window.PPTSKILLEditor.exportHtml()'); assert.deepEqual(extractDeckSpec(html), expected);
    const path = resolve(outputDir, `${width}-motion-${label}.html`); await writeFile(path, html); run.artifacts.push(path); return path;
  };
  // S4 主流程已切 offline；所有 fixture／reopen 都必須保持可攜。
  for (const treatment of motionTreatments) {
    const fixture = await buildMotionFixture(treatment), source = resolve(outputDir, `${width}-motion-${treatment}-source.html`);
    await writeFile(source, fixture.html);
    for (const mode of ['normal', 'reduced', 'static']) {
      let staticScript;
      try {
        await cdp.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: mode === 'reduced' ? 'reduce' : 'no-preference' }] });
        if (mode === 'static') staticScript = (await cdp.send('Page.addScriptToEvaluateOnNewDocument', { source: 'window.__PPTSKILL_FORCE_STATIC__=true;' })).identifier;
        await navigate(source);
        // 模擬舊版本持久 geometry suppression；無關樣式在 public operation／clone／reopen 都要保留。
        await evaluate(`(()=>{const e=document.querySelector(${JSON.stringify(selector)});for(const k of ['transform','translate','rotate','scale'])e.style.setProperty(k,'none','important');e.style.setProperty('--motion-probe','keep');e.style.setProperty('color','rgb(90, 40, 130)','important')})()`);
        await operate('move-element', { x: 820, y: 300 }); await operate('resize-element', { width: 600, height: 400 });
        let box = { x: 820, y: 300, width: 600, height: 400 }, committed = await getSpec();
        const unchanged = structuredClone(committed); delete unchanged.slides[0].composition.geometryOverrides;
        const original = structuredClone(fixture.spec); delete original.slides[0].composition.geometryOverrides;
        assert.deepEqual(unchanged, original, 'operation 只能改 geometry');
        await checkMotion(treatment, mode, box, 'public-operation');
        if (mode === 'normal') {
          await click('[data-action="layout"]'); await click(selector);
          const pointer = await startGesture('drag', 20, 20);
          assert.deepEqual(await getSpec(), committed, 'preview 不改 canonical');
          const previewPath = await saveExport(`${treatment}-preview`, committed);
          const projected = await evaluate(`(()=>{const root=new DOMParser().parseFromString(${JSON.stringify(await readFile(previewPath, 'utf8'))},'text/html'),e=root.querySelector(${JSON.stringify(selector)});return {left:e.style.left,top:e.style.top,custom:e.style.getPropertyValue('--motion-probe'),transform:e.style.transform}})()`);
          assert.deepEqual(projected, { left: '820px', top: '300px', custom: 'keep', transform: '' });
          await cdp.send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 });
          await cdp.send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 });
          await endGesture(pointer); assert.deepEqual(await getSpec(), committed); assertRect((await measure()).rect, box);
          const drag = await startGesture('drag', 20, 20); await endGesture(drag); box = { ...box, x: 840, y: 320 };
          const resize = await startGesture('resize', -40, -40); await endGesture(resize); box = { ...box, width: 560, height: 360 };
          committed = await getSpec(); assert.deepEqual(committed.slides[0].composition.geometryOverrides['portable-quote'], box);
          await click('[data-action="layout"]'); await checkMotion(treatment, mode, box, 'pointer-commit-cancel');
        }
        const exported = await saveExport(`${treatment}-${mode}`, committed);
        await navigate(exported); assert.deepEqual(await getSpec(), committed); await checkMotion(treatment, mode, box, 'export-reopen');
      } finally { if (staticScript) await cdp.send('Page.removeScriptToEvaluateOnNewDocument', { identifier: staticScript }); }
    }
  }
  await cdp.send('Emulation.setEmulatedMedia', { features: [] });
}
