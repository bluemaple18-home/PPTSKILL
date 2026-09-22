import assert from 'node:assert/strict';
import { writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

// API-driven 真 File／optimizer；不宣稱 native picker、OS clipboard 或 crop 像素驗收。
// 沿 S4 fixture／S8 seam；base10、雙 viewport、listener 與 target cleanup 由 runner 負責。
export async function runInsertImageFileBrowserCases({ cdp, evaluate, navigate, sourcePath, outputDir, width, run, click, position, mouse, settle, assertExport }) {
  await navigate(sourcePath);
  const spec = () => evaluate('window.PPTSKILLEditor.getDeckSpec()');
  const selector = (id = 'file-image', slide = 'portable') => `.slide[data-slide-id="${slide}"] [data-pptskill-element-id="component-${id}"]`;
  const options = (componentId = 'file-image', slideId = 'portable', fit) => ({ slideId, componentId, alt: 'File 新圖 <3×2> & 保留', ...(fit ? { fit } : {}), geometry: { x: 550, y: 600, width: 240, height: 160 } });
  const expected = await spec(), inserted = [];
  const append = (o, r) => {
    const slide = expected.slides.find(s => s.id === o.slideId);
    slide.content.components.push({ id: o.componentId, type: 'image', alt: o.alt, dataUri: r.dataUri, ...(o.fit ? { fit: o.fit } : {}) });
    slide.composition.geometryOverrides = { ...slide.composition.geometryOverrides, [o.componentId]: { ...o.geometry } };
    inserted.push(o);
  };
  await evaluate(`(async()=>{
    const canvas=document.createElement('canvas');canvas.width=3;canvas.height=2;const ctx=canvas.getContext('2d');ctx.fillStyle='#2878ee';ctx.fillRect(0,0,3,2);ctx.fillStyle='#ffbd40';ctx.fillRect(2,0,1,2);
    const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/png'));window.__s9File=new File([blob],'insert-3x2.png',{type:'image/png'});
    window.__s9Original=window.PPTSKILLAssets.optimizeFile;window.__s9Calls=0;window.__s9Last=null;
    window.__s9Optimize=async file=>{window.__s9Calls++;const r=await window.__s9Original(file);window.__s9Last=r;return r};window.PPTSKILLAssets.optimizeFile=window.__s9Optimize;
    window.__s9Nodes=[...document.querySelectorAll('.slide,.slide [data-edit-target],.slide img')];
    window.__s9Read=()=>JSON.stringify({spec:window.PPTSKILLEditor.getDeckSpec(),dom:document.querySelector('.deck').outerHTML,selection:window.PPTSKILLEditor.layout.getSelectionState(),state:window.PPTSKILLEditor.layout.getState()});
    window.__s9Trusted=[];document.addEventListener('pointerdown',e=>window.__s9Trusted.push({trusted:e.isTrusted,target:e.target.closest('[data-pptskill-element-id]')?.dataset.pptskillElementId||e.target.closest('[data-image-fit]')?.dataset.imageFit||''}));return true;
  })()`);
  await click('[data-action="layout"]'); await click(selector('asset-second'));
  for (const o of [options(), options('file-cover', 'asset-other', 'cover')]) {
    const out = await evaluate(`(async()=>{const before=window.__s9Calls,r=await window.PPTSKILLEditor.insertImageFile(window.__s9File,${JSON.stringify(o)});return{r,same:r===window.__s9Last,calls:window.__s9Calls-before}})()`);
    assert.equal(out.same, true); assert.equal(out.calls, 1); assert.equal(out.r.width, 3); assert.equal(out.r.height, 2);
    append(o, out.r); assert.deepEqual(await spec(), expected);
    assert.deepEqual(await evaluate('window.PPTSKILLEditor.layout.getSelectionState().selected'), []);
  }
  const verify = async () => {
    assert.deepEqual(await spec(), expected);
    for (const o of inserted) {
      const slide = expected.slides.find(s => s.id === o.slideId), component = slide.content.components.find(c => c.id === o.componentId);
      const actual = await evaluate(`(async()=>{const nodes=document.querySelectorAll(${JSON.stringify(selector(o.componentId, o.slideId))}),node=nodes[0],img=node.querySelector('img');await img.decode();return{count:nodes.length,src:img.getAttribute('src'),alt:img.alt,fit:getComputedStyle(img).objectFit,decoded:[img.naturalWidth,img.naturalHeight],box:{x:parseFloat(node.style.left),y:parseFloat(node.style.top),width:parseFloat(node.style.width),height:parseFloat(node.style.height)}}})()`);
      assert.deepEqual(actual, { count: 1, src: component.dataUri, alt: component.alt, fit: component.fit || 'contain', decoded: [3, 2], box: slide.composition.geometryOverrides[o.componentId] });
    }
  };
  await verify();
  // 同步 metadata capture；延遲僅包住真正 optimizer，completion 後對最新 spec 提交。
  const captured = options('file-captured', 'portable', 'contain'); captured.geometry.x = 850;
  await evaluate(`(()=>{window.__s9Gate=new Promise(resolve=>window.__s9Release=resolve);window.PPTSKILLAssets.optimizeFile=async file=>{await window.__s9Gate;return window.__s9Optimize(file)};
    const o=${JSON.stringify(captured)};window.__s9Before=window.__s9Read();window.__s9Pending=window.PPTSKILLEditor.insertImageFile(window.__s9File,o);o.slideId='asset-other';o.componentId='mutated';o.alt='mutated';o.geometry.x=100;return true})()`);
  assert.equal(await evaluate('window.__s9Before===window.__s9Read()'), true);
  await evaluate(`(()=>{document.querySelector('.slide[data-slide-id="asset-other"]').dispatchEvent(new MouseEvent('click',{bubbles:true}));window.PPTSKILLEditor.layout.setMode(false);window.PPTSKILLEditor.exportHtml();
    window.PPTSKILLEditor.executeOperation({operation:'replace-asset',target:{slideId:'asset-other',elementId:'component-asset-first'},value:{dataUri:window.PPTSKILLEditor.getDeckSpec().slides[1].content.components.find(c=>c.id==='asset-first').dataUri,alt:'等待期間修改',fit:'contain'}});
    window.PPTSKILLEditor.executeOperation({operation:'move-element',target:{slideId:'asset-other',elementId:'component-asset-second'},value:{x:320,y:610}});return true})()`);
  Object.assign(expected.slides[1].content.components.find(c => c.id === 'asset-first'), { alt: '等待期間修改', fit: 'contain' });
  Object.assign(expected.slides[1].composition.geometryOverrides['asset-second'], { x: 320, y: 610 });
  const capturedResult = await evaluate(`(async()=>{window.__s9Release();const r=await window.__s9Pending;window.PPTSKILLAssets.optimizeFile=window.__s9Optimize;return{r,same:r===window.__s9Last}})()`);
  assert.equal(capturedResult.same, true); append(captured, capturedResult.r); await verify();
  run.checks.push({ wp2s9: 'async-captured-identity', realOptimizer: true, preserved: ['content', 'geometry', 'mode', 'export-clone'] });
  for (const o of [options(), options('bad', 'missing'), { ...options('invalid'), geometry: { ...options().geometry, x: 79 } }]) {
    const outcome = await evaluate(`(async()=>{const before=window.__s9Read(),calls=window.__s9Calls;let error='';try{await window.PPTSKILLEditor.insertImageFile(window.__s9File,${JSON.stringify(o)})}catch(e){error=e.message}return{error,calls:window.__s9Calls-calls,unchanged:before===window.__s9Read()}})()`);
    assert.ok(outcome.error); assert.equal(outcome.calls, 0); assert.equal(outcome.unchanged, true);
    run.checks.push({ wp2s9: 'invalid-preflight', ...outcome });
  }
  const failure = await evaluate(`(async()=>{const before=window.__s9Read(),calls=window.__s9Calls;let error='';try{await window.PPTSKILLEditor.insertImageFile(new File(['invalid'],'bad.png',{type:'image/png'}),${JSON.stringify(options('failed'))})}catch(e){error=e.message}return{error,calls:window.__s9Calls-calls,unchanged:before===window.__s9Read()}})()`);
  assert.ok(failure.error); assert.equal(failure.calls, 1); assert.equal(failure.unchanged, true);
  run.checks.push({ wp2s9: 'real-optimizer-rejection', ...failure });
  // 第二個呼叫先完成；兩個仍各呼叫一次真 optimizer，晚到者 duplicate 拒絕。
  const raceOptions = options('file-race', 'asset-other'); raceOptions.geometry.x = 850;
  const race = await evaluate(`(async()=>{const api=window.PPTSKILLEditor,gates=[],calls=window.__s9Calls;window.PPTSKILLAssets.optimizeFile=file=>new Promise(resolve=>gates.push(resolve)).then(()=>window.__s9Optimize(file));
    try{const o=${JSON.stringify(raceOptions)},first=api.insertImageFile(window.__s9File,o).then(r=>({r}),e=>({error:e.message})),second=api.insertImageFile(window.__s9File,o);
      gates[1]();const winner=await second,before=window.__s9Read();gates[0]();const loser=await first;return{winner,loser,unchanged:before===window.__s9Read(),calls:window.__s9Calls-calls};
    }finally{window.PPTSKILLAssets.optimizeFile=window.__s9Optimize}})()`);
  assert.match(race.loser.error, /duplicate/); assert.equal(race.unchanged, true); assert.equal(race.calls, 2); append(raceOptions, race.winner); await verify();
  assert.equal(await evaluate('window.__s9Nodes.every(node=>node.isConnected)'), true);
  run.checks.push({ wp2s9: 'duplicate-race', calls: race.calls, loser: race.loser.error, unchanged: race.unchanged });
  await evaluate(`document.querySelector('.slide[data-slide-id="portable"]').dispatchEvent(new MouseEvent('click',{bubbles:true}))`);
  await click('[data-action="layout"]');
  const hit = async css => { const p = await position(css); assert.ok(p.width > 0 && p.height > 0); assert.equal(await evaluate(`Boolean(document.elementFromPoint(${p.x},${p.y})?.closest(${JSON.stringify(css)}))`), true); };
  await hit(selector()); await click(selector());
  assert.deepEqual(await evaluate('window.PPTSKILLEditor.layout.getSelectionState().selected'), ['component-file-image']);
  for (const fit of ['cover', 'contain']) {
    await hit(`[data-image-fit="${fit}"]`); await click(`[data-image-fit="${fit}"]`);
    expected.slides[0].content.components.find(c => c.id === 'file-image').fit = fit;
    await verify(); assert.equal(await evaluate(`document.querySelector('[data-image-fit="${fit}"]').getAttribute('aria-pressed')`), 'true');
  }
  const trusted = await evaluate('window.__s9Trusted'); assert.ok(trusted.some(e => e.target === 'component-file-image')); assert.ok(trusted.some(e => e.target === 'cover')); assert.ok(trusted.every(e => e.trusted));
  await mouse('mouseMoved', { x: 4, y: 4 }); await settle();
  const screenshot = resolve(outputDir, `${width}-s9-inserted-file-controls.png`), shot = await cdp.send('Page.captureScreenshot', { format: 'png' });
  await writeFile(screenshot, Buffer.from(shot.data, 'base64')); run.artifacts.push(screenshot);
  run.checks.push({ wp2s9: 'decoded-file-and-controls', decoded: [3, 2], insertion: 'API-driven File/optimizer', interaction: 'real-pointer', trusted, screenshot });
  const exported = await assertExport('s9-insert-image-file', expected);
  for (const o of inserted) assert.equal(await evaluate(`new DOMParser().parseFromString(window.PPTSKILLEditor.exportHtml(),'text/html').querySelectorAll(${JSON.stringify(selector(o.componentId, o.slideId))}).length`), 1);
  await cdp.send('Network.emulateNetworkConditions', { offline: true, latency: 0, downloadThroughput: 0, uploadThroughput: 0 });
  try {
    await navigate(exported); await verify(); await click('[data-action="layout"]'); await hit(selector()); await click(selector());
    assert.deepEqual(await evaluate('window.PPTSKILLEditor.layout.getSelectionState().selected'), ['component-file-image']);
    await hit('[data-image-fit="cover"]'); await click('[data-image-fit="cover"]'); expected.slides[0].content.components.find(c => c.id === 'file-image').fit = 'cover';
    await verify(); await assertExport('s9-insert-image-file-offline', expected);
  } finally { await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: 0, downloadThroughput: -1, uploadThroughput: -1 }); }
  run.checks.push({ wp2s9: 'export-offline-reopen', uniqueRoots: inserted.length, status: 'pass' });
}
