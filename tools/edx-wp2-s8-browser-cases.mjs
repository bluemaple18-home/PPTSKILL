import assert from 'node:assert/strict';
import { writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

// 插入明標 API-driven；選取／fit／拖曳／縮放走真 pointer，不新增 UI。
// 由既有 runner 在 base10 後呼叫；listener、雙 viewport、offline、target cleanup 沿用主線。
export async function runInsertImageBrowserCases({ cdp, evaluate, navigate, sourcePath, outputDir, width, run, click, position, mouse, settle, assertExport }) {
  await navigate(sourcePath);
  const spec = () => evaluate('window.PPTSKILLEditor.getDeckSpec()');
  const selected = () => evaluate('window.PPTSKILLEditor.layout.getSelectionState().selected');
  const selector = (id = 'inserted-image', slide = 'portable') => `.slide[data-slide-id="${slide}"] [data-pptskill-element-id="component-${id}"]`;
  const expected = await spec();
  // 有效的非正方形 3×2 PNG；decoded dimensions／computed fit 驗證，不宣稱 crop 像素驗收。
  const dataUri = await evaluate(`(()=>{const c=document.createElement('canvas');c.width=3;c.height=2;const x=c.getContext('2d');x.fillStyle='#2878ee';x.fillRect(0,0,3,2);x.fillStyle='#ffbd40';x.fillRect(2,0,1,2);return c.toDataURL('image/png')})()`);
  const request = (id, slideId, fit) => ({ operation: 'insert-element', target: { slideId }, value: {
    component: { id, type: 'image', dataUri, alt: '新圖 <3×2> & 保留', ...(fit ? { fit } : {}) }, geometry: { x: 550, y: 600, width: 240, height: 160 },
  } });
  await evaluate(`window.__s8Nodes=[...document.querySelectorAll('.slide,.slide [data-edit-target],.slide img')];window.__s8First=document.querySelector(${JSON.stringify(selector('asset-first') + ' img')}).outerHTML;window.__s8Trusted=[];document.addEventListener('pointerdown',e=>window.__s8Trusted.push({trusted:e.isTrusted,target:e.target.closest('[data-pptskill-element-id]')?.dataset.pptskillElementId||e.target.closest('[data-image-fit]')?.dataset.imageFit||e.target.className}))`);
  await click('[data-action="layout"]'); await click(selector('asset-second'));
  const insert = async req => {
    await evaluate(`window.PPTSKILLEditor.executeOperation(${JSON.stringify(req)})`);
    const slide = expected.slides.find(s => s.id === req.target.slideId);
    slide.content.components.push(structuredClone(req.value.component));
    slide.composition.geometryOverrides = { ...slide.composition.geometryOverrides, [req.value.component.id]: { ...req.value.geometry } };
    assert.deepEqual(await spec(), expected); assert.deepEqual(await selected(), []);
    assert.equal(await evaluate('window.PPTSKILLEditor.layout.getState().enabled'), true);
    assert.equal(await evaluate('document.querySelector(\'.slide[data-editor-selected="true"]\').dataset.slideId'), 'portable');
    assert.equal(await evaluate('window.__s8Nodes.every(n=>n.isConnected)'), true, '既有 nodes 保留');
    run.checks.push({ wp2s8: 'API-driven-insert', id: req.value.component.id, slideId: req.target.slideId, fit: req.value.component.fit || 'contain' });
  };
  await insert(request('inserted-image', 'portable'));
  await insert(request('inserted-second', 'portable', 'cover'));
  // 第二張不能遮住第一張；仍由正式 operation 更新位置。
  await evaluate(`window.PPTSKILLEditor.executeOperation({operation:'move-element',target:{slideId:'portable',elementId:'component-inserted-second'},value:{x:1000,y:600}})`);
  expected.slides[0].composition.geometryOverrides['inserted-second'] = { ...request().value.geometry, x: 1000 };
  await insert(request('inserted-image', 'asset-other', 'cover'));
  const component = () => expected.slides[0].content.components.find(c => c.id === 'inserted-image');
  const verify = async () => {
    assert.deepEqual(await spec(), expected, '全 canonical preservation');
    assert.equal(await evaluate(`document.querySelector(${JSON.stringify(selector('asset-first') + ' img')}).outerHTML===window.__s8First`), true);
    for (const [id, slideId] of [['inserted-image', 'portable'], ['inserted-second', 'portable'], ['inserted-image', 'asset-other']]) {
      const slide = expected.slides.find(s => s.id === slideId), c = slide.content.components.find(c => c.id === id), box = slide.composition.geometryOverrides[id];
      const actual = await evaluate(`(async()=>{const nodes=document.querySelectorAll(${JSON.stringify(selector(id, slideId))});const n=nodes[0],img=n.querySelector('img');await img.decode();return{count:nodes.length,root:n.parentElement.dataset.slideId,target:n.dataset.editTarget,geometry:n.dataset.pptskillGeometry,treatment:n.dataset.effectTreatment,src:img.getAttribute('src'),alt:img.alt,fit:getComputedStyle(img).objectFit,width:img.naturalWidth,height:img.naturalHeight,box:{x:parseFloat(n.style.left),y:parseFloat(n.style.top),width:parseFloat(n.style.width),height:parseFloat(n.style.height)}}})()`);
      assert.equal(actual.count, 1); assert.equal(actual.root, slideId); assert.equal(actual.target, `slides.${slideId}.content.components.${id}`);
      assert.equal(actual.geometry, 'canonical'); assert.equal(typeof actual.treatment, 'string');
      assert.equal(actual.src, c.dataUri); assert.equal(actual.alt, c.alt); assert.equal(actual.fit, c.fit || 'contain');
      assert.equal(actual.width, 3); assert.equal(actual.height, 2); assert.deepEqual(actual.box, box);
      run.checks.push({ wp2s8: 'decoded-image', id, slideId, decoded: [actual.width, actual.height], fit: actual.fit, roots: actual.count });
    }
  };
  await verify();
  const hit = async css => {
    const p = await position(css);
    assert.ok(p.width > 0 && p.height > 0);
    assert.equal(await evaluate(`Boolean(document.elementFromPoint(${p.x},${p.y})?.closest(${JSON.stringify(css)}))`), true);
    run.checks.push({ wp2s8: 'pointer-hit', selector: css, rect: p, hit: true });
    return p;
  };
  await hit(selector()); await click(selector()); assert.deepEqual(await selected(), ['component-inserted-image']);
  const fit = async value => {
    const css = `[data-image-fit="${value}"]`; await hit(css); await click(css);
    component().fit = value; await verify();
    assert.equal(await evaluate(`document.querySelector('${css}').getAttribute('aria-pressed')`), 'true');
  };
  await fit('cover'); await fit('contain');
  const invalid = async req => {
    const result = await evaluate(`(()=>{const api=window.PPTSKILLEditor,read=()=>JSON.stringify({spec:api.getDeckSpec(),dom:document.querySelector('.deck').outerHTML,selection:api.layout.getSelectionState(),state:api.layout.getState()});const before=read();let error='';try{api.executeOperation(${JSON.stringify(req)})}catch(e){error=e.message}return{error,unchanged:before===read()}})()`);
    assert.ok(result.error); assert.equal(result.unchanged, true); run.checks.push({ wp2s8: 'invalid-zero-side-effects', error: result.error });
  };
  await invalid(request('inserted-image', 'portable'));
  await invalid(request('missing-target', 'missing'));
  const bad = request('invalid', 'portable'); bad.value.geometry.x = 79; await invalid(bad);
  const startGesture = async kind => {
    await click(selector()); const css = kind === 'resize' ? '.moveable-se' : selector();
    await hit(css); const p = await position(css, kind === 'resize' ? 0.5 : 0.1, kind === 'resize' ? 0.5 : 0.1);
    const scale = await evaluate(`document.querySelector('.slide[data-slide-id="portable"]').getBoundingClientRect().width/1600`);
    await mouse('mouseMoved', p); await mouse('mousePressed', p, true);
    for (let step = 1; step <= 6; step++) await mouse('mouseMoved', { x: p.x + 24 * scale * step / 6, y: p.y + 16 * scale * step / 6 }, true);
    await settle(); assert.equal(await evaluate('window.PPTSKILLEditor.layout.getState().gesturing'), true);
    assert.deepEqual(await spec(), expected, 'preview 不寫 canonical');
    return { x: p.x + 24 * scale, y: p.y + 16 * scale };
  };
  // invalid insert 在真 pointer gesture 中仍不取消 preview。
  for (const kind of ['drag', 'resize']) {
    const p = await startGesture(kind); await invalid(bad);
    await mouse('mouseReleased', p); await settle();
    const box = expected.slides[0].composition.geometryOverrides['inserted-image'];
    if (kind === 'drag') { box.x += 24; box.y += 16; } else { box.width += 24; box.height += 16; }
    await verify();
    const actual = await evaluate(`(()=>{const n=document.querySelector(${JSON.stringify(selector())}),r=n.getBoundingClientRect(),s=n.closest('.slide').getBoundingClientRect(),k=s.width/1600;return{x:(r.x-s.x)/k,y:(r.y-s.y)/k,width:r.width/k,height:r.height/k}})()`);
    for (const key of Object.keys(box)) assert.ok(Math.abs(actual[key] - box[key]) < 1, `${kind} ${key}`);
    run.checks.push({ wp2s8: 'real-pointer-geometry', kind, canonical: { ...box }, rect: actual });
  }
  const trusted = await evaluate('window.__s8Trusted'); assert.ok(trusted.length > 0 && trusted.every(event => event.trusted));
  run.checks.push({ wp2s8: 'trusted-pointer', events: trusted });
  await mouse('mouseMoved', { x: 4, y: 4 }); await settle();
  const screenshot = resolve(outputDir, `${width}-s8-inserted-image-controls.png`);
  const shot = await cdp.send('Page.captureScreenshot', { format: 'png' });
  await writeFile(screenshot, Buffer.from(shot.data, 'base64')); run.artifacts.push(screenshot);
  const exported = await assertExport('s8-insert-image', expected);
  assert.equal(await evaluate(`new DOMParser().parseFromString(window.PPTSKILLEditor.exportHtml(),'text/html').querySelectorAll(${JSON.stringify(selector())}).length`), 1);
  await cdp.send('Network.emulateNetworkConditions', { offline: true, latency: 0, downloadThroughput: 0, uploadThroughput: 0 });
  try {
    await navigate(exported);
    await evaluate(`window.__s8First=document.querySelector(${JSON.stringify(selector('asset-first') + ' img')}).outerHTML`);
    await verify(); await click('[data-action="layout"]'); await hit(selector()); await click(selector());
    assert.deepEqual(await selected(), ['component-inserted-image']); await fit('cover');
    await assertExport('s8-insert-image-offline', expected);
  } finally { await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: 0, downloadThroughput: -1, uploadThroughput: -1 }); }
  run.checks.push({ wp2s8: 'export-offline-reopen', screenshot, uniqueRoot: true, insertion: 'API-driven', interaction: 'real-pointer', preserved: ['old-nodes', 'first-image', 'other-slide', 'typography', 'motion', 'slots', 'style'] });
}
