import assert from 'node:assert/strict';

// API-driven 真 File／optimizer；不宣稱 native file picker 或 OS clipboard。
export async function runTargetedImageFileBrowserCases({ cdp, evaluate, navigate, sourcePath, run, assertExport }) {
  await navigate(sourcePath);
  const spec = () => evaluate('window.PPTSKILLEditor.getDeckSpec()');
  const selector = (id, slideId) => `.slide[data-slide-id="${slideId}"] [data-pptskill-element-id="component-${id}"] img`;
  const checkImages = async expected => {
    for (const slide of expected.slides) for (const id of ['asset-first', 'asset-second']) {
      const component = slide.content.components.find(c => c.id === id), box = slide.composition.geometryOverrides[id];
      const actual = await evaluate(`(async()=>{
        const img=document.querySelector(${JSON.stringify(selector(id, slide.id))});await img.decode();
        const root=img.closest('[data-pptskill-element-id]'),r=root.getBoundingClientRect(),s=root.closest('.slide').getBoundingClientRect(),scale=s.width/1600;
        return{src:img.getAttribute('src'),alt:img.alt,fit:getComputedStyle(img).objectFit,natural:[img.naturalWidth,img.naturalHeight],box:{x:(r.x-s.x)/scale,y:(r.y-s.y)/scale,width:r.width/scale,height:r.height/scale}};
      })()`);
      assert.deepEqual({ src: actual.src, alt: actual.alt, fit: actual.fit, natural: actual.natural }, { src: component.dataUri, alt: component.alt, fit: component.fit || 'contain', natural: [1, 1] });
      for (const key of ['x', 'y', 'width', 'height']) assert.ok(Math.abs(actual.box[key] - box[key]) < 0.6, `${slide.id}/${id}/${key}`);
    }
  };
  const expected = await spec(); await checkImages(expected);
  const dataUri = await evaluate(`(()=>{const c=document.createElement('canvas');c.width=c.height=1;const ctx=c.getContext('2d');ctx.fillStyle='#d12635';ctx.fillRect(0,0,1,1);return c.toDataURL('image/png')})()`);
  const fileExpression = `new File([Uint8Array.from(atob(${JSON.stringify(dataUri.split(',')[1])}),c=>c.charCodeAt(0))],'targeted.png',{type:'image/png'})`;
  const admission = await evaluate(`(async()=>{
    const api=window.PPTSKILLEditor,assets=window.PPTSKILLAssets,original=assets.optimizeFile,before=JSON.stringify(api.getDeckSpec()),dom=document.querySelector('.deck').outerHTML;
    let calls=0,getters=0,rejected=0;assets.optimizeFile=async()=>{calls++;throw new Error('invalid admission 不可呼叫 optimizer')};
    const t={slideId:'portable',elementId:'component-asset-second'},getter={...t};Object.defineProperty(getter,'slideId',{get(){getters++;throw new Error('getter 不可讀')}});
    const invalid=[null,{...t,extra:1},Object.assign(Object.create({inherited:true}),t),{...t,[Symbol('extra')]:1},getter,{...t,slideId:'foreign'},{...t,elementId:'role-title'}];
    try{for(const target of invalid){try{await api.replaceImageFile(${fileExpression},target)}catch{rejected++}}return{calls,getters,rejected,same:before===JSON.stringify(api.getDeckSpec())&&dom===document.querySelector('.deck').outerHTML}}finally{assets.optimizeFile=original}
  })()`);
  assert.deepEqual(admission, { calls: 0, getters: 0, rejected: 7, same: true });

  // 真 optimizer 執行完才等待 gate；caller 改 target、export 換物件、切頁都發生於完成前。
  const lifecycle = await evaluate(`(async()=>{
    const api=window.PPTSKILLEditor,assets=window.PPTSKILLAssets,original=assets.optimizeFile,target={slideId:'portable',elementId:'component-asset-second'};
    let release,optimized;const gate=new Promise(ok=>release=ok);assets.optimizeFile=async file=>{optimized=await original(file);await gate;return optimized};
    try{const pending=api.replaceImageFile(${fileExpression},target);target.slideId='asset-other';target.elementId='component-asset-first';
      api.exportHtml();document.querySelector('.slide[data-slide-id="asset-other"]').dispatchEvent(new MouseEvent('click',{bubbles:true}));
      const selected=document.querySelector('.slide[data-slide-id="asset-other"]').dataset.editorSelected;release();
      const result=await pending;return{result,selected,sameResult:result===optimized};
    }finally{assets.optimizeFile=original}
  })()`);
  assert.equal(lifecycle.selected, 'true'); assert.equal(lifecycle.sameResult, true);
  assert.equal(lifecycle.result.dataUri, dataUri); assert.equal(lifecycle.result.policyAction, 'preserve_small'); assert.deepEqual(lifecycle.result.warnings, []);
  expected.slides[0].content.components.find(c => c.id === 'asset-second').dataUri = dataUri;
  assert.deepEqual(await spec(), expected); await checkImages(expected);
  run.checks.push({ wp2s5: 'targeted-File-async', realOptimizer: true, capturedSecondImage: true, callerMutation: true, exportAndSwitch: true, invalidOptimizerCalls: 0, getterCalls: 0 });

  await evaluate(`document.querySelector('.slide[data-slide-id="portable"]').dispatchEvent(new MouseEvent('click',{bubbles:true}))`);
  await evaluate(`window.PPTSKILLEditor.replaceImageFile(${fileExpression},{slideId:'asset-other',elementId:'component-asset-second'})`);
  expected.slides[1].content.components.find(c => c.id === 'asset-second').dataUri = dataUri;
  assert.deepEqual(await spec(), expected);
  await evaluate(`window.PPTSKILLEditor.replaceImageFile(${fileExpression})`);
  expected.slides[0].content.components.find(c => c.id === 'asset-first').dataUri = dataUri;
  assert.deepEqual(await spec(), expected);
  await evaluate(`window.PPTSKILLEditor.replaceImageFile(${fileExpression},undefined)`);
  assert.deepEqual(await spec(), expected); await checkImages(expected);
  const exported = await assertExport('targeted-image-file', expected);
  await cdp.send('Network.emulateNetworkConditions', { offline: true, latency: 0, downloadThroughput: 0, uploadThroughput: 0 });
  try { await navigate(exported); assert.deepEqual(await spec(), expected); await checkImages(expected); }
  finally { await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: 0, downloadThroughput: -1, uploadThroughput: -1 }); }
  run.checks.push({ wp2s5: 'targeted-File-cross-slide-default-offline', decoded: true, altFitGeometryPreserved: true, crossSlide: true, omittedAndUndefined: true, nativeFilePicker: false });
}
