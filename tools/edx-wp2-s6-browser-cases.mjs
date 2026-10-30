import assert from 'node:assert/strict';
import { writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

// 由主線既有 attach-only runner 呼叫；真 pointer／CDP chooser，不宣稱手點 OS dialog。
export async function runSelectedImageBrowserCases({ cdp, evaluate, navigate, sourcePath, outputDir, width, run, click, position, mouse, settle, assertExport }) {
  const button = '[data-action="replace-selected-image"]', input = '#pptskill-selected-image-input';
  const image = (id, slide = 'portable') => `.slide[data-slide-id="${slide}"] [data-pptskill-element-id="component-asset-${id}"]`;
  // 使用有效小 PNG；與 S4 白色 fixture 不同，經真 optimizer 保留。
  const dataUri = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=';
  const filePath = resolve(outputDir, `${width}-selected-image.png`);
  await writeFile(filePath, Buffer.from(dataUri.split(',')[1], 'base64'));
  const spec = () => evaluate('window.PPTSKILLEditor.getDeckSpec()');
  const visible = () => evaluate(`(()=>{const b=document.querySelector('${button}');return !b.hidden&&!b.disabled&&b.getBoundingClientRect().width>0&&getComputedStyle(b).display!=='none'})()`);
  const waitFor = async expression => {
    for (let i = 0; i < 100; i++) { if (await evaluate(expression)) return; await new Promise(ok => setTimeout(ok, 25)); }
    throw new Error('S6 等待逾時：' + expression);
  };
  let chooser = null, chooserCount = 0;
  cdp.on('Page.fileChooserOpened', event => { chooser = event; chooserCount++; });
  await cdp.send('Page.setInterceptFileChooserDialog', { enabled: true });
  try {
    await navigate(sourcePath);
    const expected = await spec();
    await evaluate(`window.__s6={blur:0,changes:[],calls:0};window.addEventListener('blur',e=>{if(e.isTrusted)window.__s6.blur++});document.querySelector('${input}').addEventListener('change',e=>window.__s6.changes.push(e.isTrusted));const optimize=window.PPTSKILLAssets.optimizeFile;window.PPTSKILLAssets.optimizeFile=async file=>{window.__s6.calls++;return optimize(file)}`);
    await click('[data-action="layout"]'); assert.equal(await visible(), false);
    await click(image('second')); assert.equal(await visible(), true);
    const choose = async () => {
      chooser = null;
      const before = await position(button);
      const hit = await evaluate(`Boolean(document.elementFromPoint(${before.x},${before.y})?.closest('${button}'))`);
      assert.equal(hit, true); assert.ok(before.width > 0 && before.height > 0);
      await mouse('mousePressed', before, true);
      assert.deepEqual(await position(button), before, 'mousedown→click button rect 不可位移');
      await mouse('mouseReleased', before); await settle();
      for (let i = 0; !chooser && i < 100; i++) await new Promise(ok => setTimeout(ok, 25));
      assert.ok(chooser?.backendNodeId, 'CDP chooser seam 不可用，回主線；禁止 API fallback');
      const node = await cdp.send('DOM.describeNode', { backendNodeId: chooser.backendNodeId });
      const attrs = node.node.attributes;
      assert.equal(attrs[attrs.indexOf('id') + 1], input.slice(1));
      assert.deepEqual(await spec(), expected, 'picker 開啟不得提交 gesture／canonical');
      run.checks.push({ wp2s6: 'native-chooser-open', before, hit, backendNodeId: chooser.backendNodeId });
      return chooser.backendNodeId;
    };
    const inject = async backendNodeId => { await cdp.send('DOM.setFileInputFiles', { backendNodeId, files: [filePath] }); await settle(); await waitFor("!document.querySelector('[data-editor-status]').textContent.includes('正在最佳化')"); };
    const verifyImages = async () => {
      assert.deepEqual(await spec(), expected);
      for (const id of ['first', 'second']) {
        const component = expected.slides[0].content.components.find(c => c.id === `asset-${id}`);
        const actual = await evaluate(`(async()=>{const root=document.querySelector(${JSON.stringify(image(id))}),img=root.querySelector('img');await img.decode();const r=root.getBoundingClientRect(),s=root.closest('.slide').getBoundingClientRect(),k=s.width/1600;return{src:img.getAttribute('src'),alt:img.alt,fit:getComputedStyle(img).objectFit,box:{x:(r.x-s.x)/k,y:(r.y-s.y)/k,width:r.width/k,height:r.height/k}}})()`);
        assert.equal(actual.src, component.dataUri); assert.equal(actual.alt, component.alt); assert.equal(actual.fit, component.fit);
        for (const [key, value] of Object.entries(expected.slides[0].composition.geometryOverrides[`asset-${id}`])) assert.ok(Math.abs(actual.box[key] - value) < 1);
      }
    };
    let node = await choose();
    const naturalBlur = await evaluate('window.__s6.blur');
    // CDP 攔截不一定開 OS dialog；明示 synthetic blur 驗證相同 lifecycle。
    await evaluate("window.dispatchEvent(new Event('blur'))");
    assert.equal(await visible(), false);
    assert.equal(await evaluate('window.PPTSKILLEditor.layout.getSelectionState().selected.length'), 0);
    await inject(node);
    await waitFor(`document.querySelector(${JSON.stringify(image('second') + ' img')}).getAttribute('src')===${JSON.stringify(dataUri)}`);
    expected.slides[0].content.components.find(c => c.id === 'asset-second').dataUri = dataUri;
    await verifyImages();
    assert.equal(await evaluate(`document.querySelector('${input}').value`), '');
    const changes = await evaluate('window.__s6.changes'); assert.deepEqual(changes, [true]);
    run.checks.push({ wp2s6: 'second-image-change', naturalBlurCount: naturalBlur, syntheticBlur: true, trustedChange: changes, browserAutomation: true, manualOSDialog: false });

    // 同一個檔案再選仍須觸發 change，第一次圖與全部非 asset 欄位不變。
    await click(image('second')); node = await choose(); await inject(node);
    await waitFor('window.__s6.calls===2'); await verifyImages();
    assert.equal(await evaluate(`document.querySelector('${input}').value`), '');
    await click(image('second')); await choose();
    await evaluate(`document.querySelector('${input}').dispatchEvent(new Event('cancel'))`);
    assert.equal(await evaluate(`document.querySelector('${input}').value`), '');

    // chooser 未消耗前的新 selection intent 使舊 target 失效。
    await click(image('second')); node = await choose(); await click(image('first')); await inject(node);
    assert.equal(await evaluate('window.__s6.calls'), 2); await verifyImages();
    for (const intent of ['slide', 'mode']) {
      await click(image('second')); node = await choose();
      if (intent === 'slide') { await evaluate("document.querySelector('.slide[data-slide-id=\"asset-other\"]').scrollIntoView()"); await settle(); await click('.slide[data-slide-id="asset-other"] [data-pptskill-element-id="role-title"]'); }
      else await click('[data-action="edit"]');
      assert.equal(await visible(), false); await inject(node); assert.equal(await evaluate('window.__s6.calls'), 2);
      if (intent === 'mode') await click('[data-action="layout"]');
      await evaluate("document.querySelector('.slide[data-slide-id=\"portable\"]').scrollIntoView()"); await settle();
    }
    await click('.slide[data-slide-id="portable"] [data-pptskill-element-id="component-portable-quote"]'); assert.equal(await visible(), false);
    await click(image('second'));
    const p = await position(image('first'));
    for (const type of ['mousePressed', 'mouseReleased']) await cdp.send('Input.dispatchMouseEvent', { type, x: p.x, y: p.y, button: 'left', buttons: type === 'mousePressed' ? 1 : 0, clickCount: 1, modifiers: 8 });
    await settle(); assert.equal(await visible(), false);
    assert.equal(await evaluate('window.PPTSKILLEditor.layout.getSelectionState().selected.length'), 2);
    await verifyImages();
    const exported = await assertExport('selected-image', expected);
    assert.equal(await evaluate(`new DOMParser().parseFromString(window.PPTSKILLEditor.exportHtml(),'text/html').querySelectorAll('[data-pptskill-selected-image-toolbar],#pptskill-selected-image-input').length`), 0);
    await cdp.send('Network.emulateNetworkConditions', { offline: true, latency: 0, downloadThroughput: 0, uploadThroughput: 0 });
    try {
      await navigate(exported); await click('[data-action="layout"]'); await click(image('second'));
      assert.equal(await visible(), true); node = await choose(); await inject(node); await verifyImages();
    } finally { await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: 0, downloadThroughput: -1, uploadThroughput: -1 }); }
    run.checks.push({ wp2s6: 'selection-cancel-reset-export-offline', chooserCount, sameFileReselect: true, syntheticCancel: true, staleSelectionSlideModeOptimizerCalls: 0, nativeInputChange: true });
  } finally { await cdp.send('Page.setInterceptFileChooserDialog', { enabled: false }); }
}
