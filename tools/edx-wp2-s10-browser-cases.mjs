import assert from 'node:assert/strict';
import { writeFile } from 'node:fs/promises';
import { resolve, basename } from 'node:path';

// 僅由主線受管 runner 執行：真 pointer＋S6 CDP chooser；不是人工 OS dialog。
export async function runInsertImageUIBrowserCases({ cdp, evaluate, navigate, sourcePath, outputDir, width, run, click, position, mouse, settle, assertExport, startGesture }) {
  const button = '[data-action="insert-image"]', input = '#pptskill-insert-image-input', replacement = '#pptskill-selected-image-input';
  const selector = (id, slide = 'portable') => `.slide[data-slide-id="${slide}"] [data-pptskill-element-id="component-${id}"]`;
  const spec = () => evaluate('window.PPTSKILLEditor.getDeckSpec()');
  const wait = async expression => {
    for (let i = 0; i < 100; i++) { if (await evaluate(expression)) return; await new Promise(ok => setTimeout(ok, 25)); }
    throw Error('S10 等待逾時：' + expression);
  };
  let chooser = null, chooserCount = 0;
  cdp.on('Page.fileChooserOpened', event => { chooser = event; chooserCount++; });
  await cdp.send('Page.setInterceptFileChooserDialog', { enabled: true });
  const filePath = resolve(outputDir, `${width}-insert-3x2.png`);
  const track = async () => evaluate(`(()=>{
    const original=window.PPTSKILLAssets.optimizeFile;
    window.__s10={calls:0,settled:0,changes:[],blur:0,defer:false,release:null,last:null,nodes:[...document.querySelectorAll('.slide,.slide [data-edit-target],.slide img')]};
    window.addEventListener('blur',e=>{if(e.isTrusted)window.__s10.blur++});
    document.querySelector('${input}').addEventListener('change',e=>window.__s10.changes.push(e.isTrusted));
    window.PPTSKILLAssets.optimizeFile=async file=>{const t=window.__s10;t.calls++;const gate=t.defer?new Promise(ok=>t.release=ok):Promise.resolve();const r=await original(file);await gate;t.last=r;t.settled++;return r};return true;
  })()`);
  const selectSlide = async id => {
    await evaluate(`document.querySelector('.slide[data-slide-id="${id}"]').scrollIntoView()`); await settle();
    await click(`.slide[data-slide-id="${id}"] [data-pptskill-element-id="role-title"]`);
  };
  const choose = async (control = button, expectedInput = input) => {
    chooser = null; const beforeSpec = await spec(), before = await position(control);
    assert.ok(before.width > 0 && before.height > 0);
    assert.equal(await evaluate(`(()=>{const b=document.querySelector(${JSON.stringify(control)}),r=b.getBoundingClientRect();return !b.hidden&&!b.disabled&&r.left>=0&&r.top>=0&&r.right<=innerWidth&&r.bottom<=innerHeight&&Boolean(document.elementFromPoint(${before.x},${before.y})?.closest(${JSON.stringify(control)}))})()`), true);
    await mouse('mousePressed', before, true);
    assert.deepEqual(await position(control), before, 'mousedown→click 不可縮移');
    assert.equal(await evaluate(`document.activeElement===document.querySelector(${JSON.stringify(control)})`), true, '原生 button 可聚焦');
    await mouse('mouseReleased', before); await settle();
    for (let i = 0; !chooser && i < 100; i++) await new Promise(ok => setTimeout(ok, 25));
    assert.ok(chooser?.backendNodeId, 'CDP chooser 不通：停止；禁止 API fallback 冒稱 UI');
    const { node } = await cdp.send('DOM.describeNode', { backendNodeId: chooser.backendNodeId });
    assert.equal(node.attributes[node.attributes.indexOf('id') + 1], expectedInput.slice(1));
    assert.deepEqual(await spec(), beforeSpec, '開啟 chooser 不提交 gesture/canonical');
    run.checks.push({ wp2s10: 'chooser', backendNodeId: chooser.backendNodeId, before, dedicatedInput: expectedInput });
    return chooser.backendNodeId;
  };
  const inject = async (backendNodeId, pending = false) => {
    await cdp.send('DOM.setFileInputFiles', { backendNodeId, files: [filePath] }); await settle();
    if (!pending) await wait(`!document.querySelector('${button}').disabled&&window.__s10.settled===window.__s10.calls`);
  };
  const cancel = async css => { await evaluate(`document.querySelector('${css}').dispatchEvent(new Event('cancel'))`); await settle(); };
  let expected;
  const append = async (slideId, id) => {
    const r = await evaluate('window.__s10.last'); assert.equal(r.width, 3); assert.equal(r.height, 2);
    const slide = expected.slides.find(s => s.id === slideId);
    slide.content.components.push({ id, type: 'image', dataUri: r.dataUri, alt: basename(filePath), fit: 'contain' });
    slide.composition.geometryOverrides = { ...slide.composition.geometryOverrides, [id]: { x: 560, y: 288, width: 480, height: 320 } };
    assert.deepEqual(await spec(), expected);
    const actual = await evaluate(`(async()=>{const n=document.querySelector(${JSON.stringify(selector(id, slideId))}),img=n.querySelector('img');await img.decode();const s=n.closest('.slide').getBoundingClientRect(),r=n.getBoundingClientRect(),k=s.width/1600;return{alt:img.alt,fit:getComputedStyle(img).objectFit,natural:[img.naturalWidth,img.naturalHeight],box:{x:(r.x-s.x)/k,y:(r.y-s.y)/k,width:r.width/k,height:r.height/k}}})()`);
    assert.equal(actual.alt, basename(filePath)); assert.equal(actual.fit, 'contain'); assert.deepEqual(actual.natural, [3, 2]);
    for (const [key, value] of Object.entries(slide.composition.geometryOverrides[id])) assert.ok(Math.abs(actual.box[key] - value) < 1, key);
    assert.equal(await evaluate('window.__s10.nodes.every(n=>n.isConnected)'), true, '原有 roots 保留');
    assert.deepEqual(await evaluate('window.PPTSKILLEditor.layout.getSelectionState().selected'), []);
    assert.equal(await evaluate(`document.querySelector('${input}').value`), '');
  };
  try {
    await navigate(sourcePath); expected = await spec(); await track();
    const data = await evaluate(`(()=>{const c=document.createElement('canvas');c.width=3;c.height=2;const x=c.getContext('2d');x.fillStyle='#2878ee';x.fillRect(0,0,3,2);x.fillStyle='#ffbd40';x.fillRect(2,0,1,2);return c.toDataURL('image/png')})()`);
    await writeFile(filePath, Buffer.from(data.split(',')[1], 'base64'));
    assert.equal(await evaluate(`document.querySelector('${button}').hidden`), true);
    await click('[data-action="edit"]'); assert.equal(await evaluate(`document.querySelector('${button}').hidden`), true);
    await click('[data-action="layout"]');
    for (let i = 0; i < 30 && !await evaluate(`document.activeElement===document.querySelector('${button}')`); i++) {
      await cdp.send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Tab', code: 'Tab', windowsVirtualKeyCode: 9 });
      await cdp.send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Tab', code: 'Tab', windowsVirtualKeyCode: 9 });
    }
    assert.equal(await evaluate(`(()=>{const b=document.querySelector('${button}');return document.activeElement===b&&b.matches(':focus-visible')&&getComputedStyle(b).outlineStyle!=='none'})()`), true, '鍵盤 focus 必須可見');
    await click(selector('portable-quote')); await startGesture('drag', 16, 8);
    let node = await choose(); assert.equal(await evaluate('window.PPTSKILLEditor.layout.getState().gesturing'), false);
    const count = chooserCount; await click(button); assert.equal(chooserCount, count, 'busy 不重入');
    await cancel(replacement); // 錯 input cancel 不得取消 insertion。
    await evaluate(`document.querySelector('${replacement}').dispatchEvent(new Event('change'))`);
    await evaluate("window.dispatchEvent(new Event('blur'))"); // CDP 不保證自然 OS blur，明標 synthetic。
    await inject(node); await append('portable', 'inserted-image-1');
    node = await choose(); await inject(node); await append('portable', 'inserted-image-2');
    await click(selector('asset-second')); await choose();
    const insertionCount = chooserCount; await click('[data-action="replace-selected-image"]'); assert.equal(chooserCount, insertionCount);
    await cancel(input); assert.deepEqual(await spec(), expected);
    const multi = await position(selector('asset-first'));
    for (const type of ['mousePressed', 'mouseReleased']) await cdp.send('Input.dispatchMouseEvent', { type, x: multi.x, y: multi.y, button: 'left', buttons: type === 'mousePressed' ? 1 : 0, clickCount: 1, modifiers: 8 });
    await settle(); assert.equal(await evaluate('window.PPTSKILLEditor.layout.getSelectionState().selected.length'), 2);
    await choose(); await cancel(input); assert.deepEqual(await spec(), expected);
    // 無 pending change 不呼叫 optimizer；同檔失效／取消不占 ID。
    const calls = await evaluate('window.__s10.calls');
    await cdp.send('DOM.setFileInputFiles', { backendNodeId: node, files: [filePath] }); await settle();
    assert.equal(await evaluate('window.__s10.calls'), calls);
    for (const intent of ['slide', 'focusin', 'mode', 'selection']) {
      node = await choose();
      if (intent === 'slide') await selectSlide('asset-other');
      if (intent === 'focusin') await evaluate(`document.querySelector('.slide[data-slide-id="asset-other"]').dispatchEvent(new FocusEvent('focusin',{bubbles:true}))`);
      if (intent === 'mode') await click('[data-action="edit"]');
      if (intent === 'selection') await click(selector('asset-first'));
      await cdp.send('DOM.setFileInputFiles', { backendNodeId: node, files: [filePath] }); await settle();
      assert.equal(await evaluate('window.__s10.calls'), calls); assert.deepEqual(await spec(), expected);
      if (intent === 'mode') await click('[data-action="layout"]');
      await selectSlide('portable');
    }
    // S6 開啟時不能跨送 insertion 的 change/cancel；replacement 仍只改選取圖。
    await click(selector('asset-second')); node = await choose('[data-action="replace-selected-image"]', replacement);
    const replaceCount = chooserCount; await click(button); assert.equal(chooserCount, replaceCount);
    await cancel(input); await evaluate(`document.querySelector('${input}').dispatchEvent(new Event('change'))`);
    await inject(node);
    expected.slides[0].content.components.find(c => c.id === 'asset-second').dataUri = (await evaluate('window.__s10.last')).dataUri;
    assert.deepEqual(await spec(), expected);
    // 選檔後 async 仍用 captured slide；export 與其他修改不被覆蓋。
    await evaluate('window.__s10.defer=true'); node = await choose(); await inject(node, true);
    await wait('Boolean(window.__s10.release)'); assert.equal(await evaluate(`document.querySelector('${button}').disabled`), true);
    await evaluate('window.PPTSKILLEditor.exportHtml()'); await selectSlide('asset-other'); await click('[data-action="edit"]');
    await evaluate(`window.PPTSKILLEditor.executeOperation({operation:'edit-text',target:{slideId:'asset-other',elementId:'role-title'},value:'等待期間保留'})`);
    expected.slides.find(s => s.id === 'asset-other').content.title = '等待期間保留';
    await evaluate('window.__s10.defer=false;window.__s10.release()');
    await wait(`window.PPTSKILLEditor.getDeckSpec().slides[0].content.components.some(c=>c.id==='inserted-image-3')`);
    await append('portable', 'inserted-image-3');
    await click('[data-action="layout"]'); await selectSlide('insert-empty');
    node = await choose(); await inject(node); await append('insert-empty', 'inserted-image-1');
    // 真 pointer 選新圖與 fit；以框左上方避開其他元件的覆蓋。
    const p = await position(selector('inserted-image-1', 'insert-empty'), 0.04, 0.04);
    await mouse('mousePressed', p, true); await mouse('mouseReleased', p); await settle();
    assert.deepEqual(await evaluate('window.PPTSKILLEditor.layout.getSelectionState().selected'), ['component-inserted-image-1']);
    await click('[data-image-fit="cover"]');
    expected.slides.find(s => s.id === 'insert-empty').content.components.at(-1).fit = 'cover';
    assert.deepEqual(await spec(), expected);
    const screenshot = await cdp.send('Page.captureScreenshot', { format: 'png' });
    await writeFile(resolve(outputDir, `${width}-insert-image-ui.png`), Buffer.from(screenshot.data, 'base64'));
    const metrics = await evaluate('({naturalBlurCount:window.__s10.blur,trustedChange:window.__s10.changes})');
    assert.ok(metrics.trustedChange.filter(Boolean).length >= 5);
    run.checks.push({ wp2s10: 'ui-lifecycle', ...metrics, syntheticBlur: true, syntheticCancel: true, syntheticFocusin: true, manualOSDialog: false });
    const exported = await assertExport('insert-image-ui', expected);
    assert.equal(await evaluate(`new DOMParser().parseFromString(window.PPTSKILLEditor.exportHtml(),'text/html').querySelectorAll('[data-pptskill-insert-image-toolbar],#pptskill-insert-image-input').length`), 0);
    await cdp.send('Network.emulateNetworkConditions', { offline: true, latency: 0, downloadThroughput: 0, uploadThroughput: 0 });
    try {
      await navigate(exported); await track(); await click('[data-action="layout"]');
      assert.equal(await evaluate(`document.querySelectorAll('${input}').length`), 1);
      node = await choose(); await inject(node); await append('portable', 'inserted-image-4');
      await assertExport('insert-image-ui-offline', expected);
    } finally { await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: 0, downloadThroughput: -1, uploadThroughput: -1 }); }
  } finally { await cdp.send('Page.setInterceptFileChooserDialog', { enabled: false }); }
}
