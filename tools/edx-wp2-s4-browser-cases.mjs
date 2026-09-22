import assert from 'node:assert/strict';

// API-driven image replacement；不宣稱新增 pointer/file picker UI 或 OS clipboard。
export const assetReplacementPng = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+ip1sAAAAASUVORK5CYII=';
export function addAssetReplacementFixture(input) {
  const slide = input.slides.find(s => s.id === 'portable');
  slide.content.components.push(
    { id: 'asset-first', type: 'image', dataUri: assetReplacementPng, alt: '第一張保留', fit: 'cover' },
    { id: 'asset-second', type: 'image', dataUri: assetReplacementPng, alt: '第二張保留', fit: 'cover' },
  );
  slide.composition.geometryOverrides = { ...slide.composition.geometryOverrides, 'asset-first': { x: 100, y: 600, width: 160, height: 160 }, 'asset-second': { x: 300, y: 600, width: 160, height: 160 } };
  slide.composition.typographyOverrides = { 'role-title': { fontSize: 64 } };
  const other = structuredClone(slide); other.id = 'asset-other'; input.slides.push(other);
}

export async function runAssetReplacementBrowserCases({ cdp, evaluate, navigate, sourcePath, run, assertExport }) {
  await navigate(sourcePath);
  const spec = () => evaluate('window.PPTSKILLEditor.getDeckSpec()');
  const selector = (id, slide = 'portable') => `.slide[data-slide-id="${slide}"] [data-pptskill-element-id="component-${id}"] img`;
  const checkImage = async (id, component, slide = 'portable') => {
    const actual = await evaluate(`(async()=>{const img=document.querySelector(${JSON.stringify(selector(id, slide))});await img.decode();return{src:img.getAttribute('src'),alt:img.alt,fit:getComputedStyle(img).objectFit,width:img.naturalWidth,height:img.naturalHeight}})()`);
    assert.deepEqual(actual, { src: component.dataUri, alt: component.alt, fit: component.fit || 'contain', width: 1, height: 1 });
  };
  const before = await spec();
  await checkImage('asset-first', before.slides[0].content.components.at(-2));
  await checkImage('asset-second', before.slides[0].content.components.at(-1));
  // 用真實 canvas 產生可解碼的小圖，避免只驗偽造 base64 字串。
  const dataUri = await evaluate(`(()=>{const c=document.createElement('canvas');c.width=c.height=1;const x=c.getContext('2d');x.fillStyle='#2878ee';x.fillRect(0,0,1,1);return c.toDataURL('image/png')})()`);
  await evaluate(`(()=>{window.__assetNodes=[...document.querySelectorAll('.slide,.slide [data-pptskill-element-id],.slide img')];window.__assetOtherImage=document.querySelector(${JSON.stringify(selector('asset-first'))}).outerHTML;return true})()`);
  const request = { operation: 'replace-asset', target: { slideId: 'portable', elementId: 'component-asset-second' }, value: { dataUri } };
  await evaluate(`window.PPTSKILLEditor.executeOperation(${JSON.stringify(request)})`);
  const expected = structuredClone(before); expected.slides[0].content.components.at(-1).dataUri = dataUri;
  assert.deepEqual(await spec(), expected); await checkImage('asset-second', expected.slides[0].content.components.at(-1));
  request.value = { dataUri, alt: '明示第二張', fit: 'contain' };
  await evaluate(`window.PPTSKILLEditor.executeOperation(${JSON.stringify(request)})`);
  Object.assign(expected.slides[0].content.components.at(-1), request.value);
  assert.deepEqual(await spec(), expected); await checkImage('asset-second', expected.slides[0].content.components.at(-1));
  assert.equal(await evaluate(`window.__assetNodes.every((n,i)=>n===[...document.querySelectorAll('.slide,.slide [data-pptskill-element-id],.slide img')][i])&&window.__assetOtherImage===document.querySelector(${JSON.stringify(selector('asset-first'))}).outerHTML`), true);
  const rejected = await evaluate(`(()=>{const api=window.PPTSKILLEditor,before=JSON.stringify(api.getDeckSpec()),dom=document.querySelector('.deck').outerHTML;let calls=0,rejected=0;const requests=[${JSON.stringify({ ...request, value: { dataUri: 'file:///private/a.png' } })},${JSON.stringify({ ...request, target: { slideId: 'portable', elementId: 'component-portable-quote' } })}];const getter=${JSON.stringify(request)};Object.defineProperty(getter.value,'dataUri',{get(){calls++;return 'invalid'}});requests.push(getter);for(const r of requests){try{api.executeOperation(r)}catch{rejected++}}return{rejected,calls,same:before===JSON.stringify(api.getDeckSpec())&&dom===document.querySelector('.deck').outerHTML}})()`);
  assert.deepEqual(rejected, { rejected: 3, calls: 0, same: true });
  run.checks.push({ wp2s4: 'API-driven-second-image', decoded: true, defaultsAndOverrides: true, preservedNodeIdentity: true, invalidAtomic: true, newImageUI: false });

  // optimizer 仍實際解碼；只在結果返回前加受控 promise，以重現 export 換物件／切頁。
  const lifecycle = await evaluate(`(async()=>{const api=window.PPTSKILLEditor,assets=window.PPTSKILLAssets,original=assets.optimizeFile;let release;const gate=new Promise(ok=>release=ok);assets.optimizeFile=async file=>{const result=await original(file);await gate;return result};try{const bytes=Uint8Array.from(atob(${JSON.stringify(dataUri.split(',')[1])}),c=>c.charCodeAt(0)),pending=api.replaceImageFile(new File([bytes],'replacement.png',{type:'image/png'}));api.exportHtml();document.querySelector('.slide[data-slide-id="asset-other"]').dispatchEvent(new MouseEvent('click',{bubbles:true}));const selected=document.querySelector('.slide[data-slide-id="asset-other"]').dataset.editorSelected;release();const result=await pending;return{result,selected,spec:api.getDeckSpec()}}finally{assets.optimizeFile=original}})()`);
  assert.equal(lifecycle.selected, 'true');
  assert.equal(lifecycle.result.dataUri, dataUri); assert.deepEqual(lifecycle.result.warnings, []);
  assert.equal(lifecycle.result.policyAction, 'preserve_small');
  expected.slides[0].content.components.at(-2).dataUri = dataUri;
  assert.deepEqual(lifecycle.spec, expected);
  await checkImage('asset-first', expected.slides[0].content.components.at(-2));
  await checkImage('asset-first', expected.slides[1].content.components.at(-2), 'asset-other');
  const exported = await assertExport('asset-replacement', expected);
  await cdp.send('Network.emulateNetworkConditions', { offline: true, latency: 0, downloadThroughput: 0, uploadThroughput: 0 });
  try {
    await navigate(exported); assert.deepEqual(await spec(), expected);
    await checkImage('asset-first', expected.slides[0].content.components.at(-2));
    await checkImage('asset-second', expected.slides[0].content.components.at(-1));
  } finally {
    await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: 0, downloadThroughput: -1, uploadThroughput: -1 });
  }
  run.checks.push({ wp2s4: 'API-wrapper-async-export-offline', realOptimizer: true, capturedStableTarget: true, defaultPreservation: true, nativeFilePicker: false });
}
