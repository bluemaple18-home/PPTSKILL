import assert from 'node:assert/strict';
import { writeFile } from 'node:fs/promises';
import { resolve, basename } from 'node:path';

// 僅由 Mainline 正式 host 執行；trusted CDP file drop 與 synthetic gesture 語意分列，不宣稱 Finder 人工拖檔或 crop pixel。
// schema：2026-09-23 唯讀核對 https://raw.githubusercontent.com/ChromeDevTools/devtools-protocol/master/pdl/domains/Input.pdl
export async function runImageDropBrowserCases({ cdp, evaluate, navigate, sourcePath, outputDir, width, run, click, position, mouse, settle, assertExport, startGesture }) {
  const button = '[data-action="insert-image"]';
  const slide = (id = 'portable') => `.slide[data-slide-id="${id}"]`;
  const title = id => `${slide(id)} [data-pptskill-element-id="role-title"]`;
  const image = (id, page = 'portable') => `${slide(page)} [data-pptskill-element-id="component-${id}"]`;
  const filePath = resolve(outputDir, `${width}-drop-3x2.png`);
  const secondPath = resolve(outputDir, `${width}-drop-second.png`);
  const badPath = resolve(outputDir, `${width}-drop-reject.txt`);
  const spec = () => evaluate('window.PPTSKILLEditor.getDeckSpec()');
  const wait = async expression => {
    for (let i = 0; i < 100; i++) { if (await evaluate(expression)) return; await new Promise(ok => setTimeout(ok, 25)); }
    throw Error('S11 等待逾時：' + expression);
  };
  const track = () => evaluate(`(()=>{
    const original=window.PPTSKILLAssets.optimizeFile;
    window.__s11={calls:0,settled:0,events:[],defer:false,release:null,last:null,errors:[],nodes:[...document.querySelectorAll('.slide,.slide [data-edit-target],.slide img')]};
    for(const type of ['dragenter','dragover','drop'])document.addEventListener(type,e=>window.__s11.events.push({type,isTrusted:e.isTrusted,prevented:e.defaultPrevented,effect:e.dataTransfer?.dropEffect,slideId:e.target.closest?.('.slide')?.dataset.slideId||null,files:e.type==='drop'?e.dataTransfer?.files.length:null}));
    window.PPTSKILLAssets.optimizeFile=async file=>{const t=window.__s11;t.calls++;const gate=t.defer?new Promise(ok=>t.release=ok):Promise.resolve();try{const r=await original(file);await gate;t.last=r;return r}catch(e){t.errors.push(e.message);throw e}finally{t.settled++}};return true;
  })()`);
  const snapshot = () => evaluate('({events:window.__s11.events,calls:window.__s11.calls,settled:window.__s11.settled,errors:window.__s11.errors})');
  const reset = async (layout = true) => { await navigate(sourcePath); await track(); if (layout) await click('[data-action="layout"]'); };
  // 每次先寫 receipt，再送命令；方法不存在直接失敗，不以 API／synthetic 替代正向。
  const nativeDrop = async (label, css, files = [filePath], accepted = true) => {
    assert.equal(await evaluate('window.PPTSKILLEditor.layout.getState().gesturing'), false, 'external CDP drop 不可與 held component gesture 混用');
    await evaluate(`document.querySelector(${JSON.stringify(css)}).scrollIntoView({block:'center'})`); await settle();
    const p = await position(css), before = await snapshot();
    const record = { wp2s11: label, route: 'CDP Input.dispatchDragEvent', commands: [], before, point: p };
    run.checks.push(record);
    try {
      const hit = await evaluate(`document.elementFromPoint(${p.x},${p.y})?.closest('.slide')?.dataset.slideId`);
      const intended = await evaluate(`document.querySelector(${JSON.stringify(css)}).closest('.slide')?.dataset.slideId`);
      assert.equal(hit, intended, 'drag point 必須命中指定 slide');
      const data = { items: [], files, dragOperationsMask: 1 };
      for (const type of ['dragEnter', 'dragOver', 'drop']) { await cdp.send('Input.dispatchDragEvent', { type, data, x: p.x, y: p.y }); record.commands.push(type); }
      await settle();
      const after = await snapshot(); record.events = after.events.slice(before.events.length); record.optimizerCalls = after.calls - before.calls;
      record.eventCounts = Object.fromEntries(['dragenter', 'dragover', 'drop'].map(type => [type, record.events.filter(e => e.type === type).length]));
      record.trustedDropCount = record.events.filter(e => e.type === 'drop' && e.isTrusted).length;
      record.dropGuardObserved = record.trustedDropCount > 0;
      if (accepted) {
        assert.ok(record.events.every(e => e.isTrusted), '正向事件必須全部 trusted');
        assert.ok(record.eventCounts.dragover >= 1, '必須觀測 dragover');
        assert.equal(record.trustedDropCount, 1, '正向必須實際投遞 trusted drop，禁止 fallback');
        assert.equal(record.optimizerCalls, files.length === 1 ? 1 : 0);
      } else {
        assert.equal(record.optimizerCalls, 0);
        if (record.dropGuardObserved) assert.ok(record.events.filter(e => e.type === 'drop').every(e => e.prevented));
      }
      return record;
    } catch (error) { record.error = error.message; throw error; }
    finally { record.after = await snapshot(); }
  };
  // 僅 negative guard；明標 synthetic，直接派送事件而非 insertion API。
  const syntheticNegative = async (label, css, kind = 'file', prevented = true) => {
    const before = await spec(), calls = (await snapshot()).calls;
    const actual = await evaluate(`(()=>{
      const node=document.querySelector(${JSON.stringify(css)}),dt=new DataTransfer();
      if(['file','multi'].includes(${JSON.stringify(kind)}))dt.items.add(new File(['拒絕路徑不可讀 bytes'],'negative.png',{type:'image/png'}));
      if(${JSON.stringify(kind)}==='multi')dt.items.add(new File(['第二個檔案'],'second.png',{type:'image/png'}));
      if(${JSON.stringify(kind)}==='text')dt.setData('text/uri-list','https://example.invalid/no-fetch');
      const transfer=${JSON.stringify(kind)}==='empty'?{types:['Files'],items:[{kind:'file'}],files:[],dropEffect:'none',getData(){throw Error('不可讀 getData')}}:dt;
      return ['dragover','drop'].map(type=>{const e=new DragEvent(type,{bubbles:true,cancelable:true,dataTransfer:dt});if(${JSON.stringify(kind)}==='empty')Object.defineProperty(e,'dataTransfer',{value:transfer});node.dispatchEvent(e);return{type,isTrusted:e.isTrusted,prevented:e.defaultPrevented}});
    })()`);
    await settle(); run.checks.push({ wp2s11: label, route: 'synthetic negative only', events: actual, optimizerCalls: (await snapshot()).calls - calls });
    assert.ok(actual.every(e => !e.isTrusted && e.prevented === prevented));
    assert.equal((await snapshot()).calls, calls); assert.deepEqual(await spec(), before);
  };
  const rejectedDrop = async (label, css = title('portable')) => {
    const before = await spec(); const r = await nativeDrop(label, css, [filePath], false);
    assert.deepEqual(await spec(), before);
    if (!r.dropGuardObserved) await syntheticNegative(label + '-未投遞另驗 guard', css);
  };
  const idle = () => wait('window.__s11.calls===window.__s11.settled');
  let expected;
  const append = async (page, id) => {
    await idle(); await wait(`window.PPTSKILLEditor.getDeckSpec().slides.find(s=>s.id===${JSON.stringify(page)}).content.components.some(c=>c.id===${JSON.stringify(id)})`);
    const optimized = await evaluate('window.__s11.last'); assert.equal(optimized.width, 3); assert.equal(optimized.height, 2);
    const target = expected.slides.find(s => s.id === page);
    target.content.components.push({ id, type: 'image', dataUri: optimized.dataUri, alt: basename(filePath), fit: 'contain' });
    target.composition.geometryOverrides = { ...target.composition.geometryOverrides, [id]: { x: 560, y: 288, width: 480, height: 320 } };
    assert.deepEqual(await spec(), expected);
    const actual = await evaluate(`(async()=>{const n=document.querySelector(${JSON.stringify(image(id, page))}),img=n.querySelector('img');await img.decode();const r=n.getBoundingClientRect(),s=n.closest('.slide').getBoundingClientRect(),k=s.width/1600;return{natural:[img.naturalWidth,img.naturalHeight],fit:getComputedStyle(img).objectFit,alt:img.alt,box:{x:(r.x-s.x)/k,y:(r.y-s.y)/k,width:r.width/k,height:r.height/k}}})()`);
    assert.deepEqual(actual.natural, [3, 2]); assert.equal(actual.fit, 'contain'); assert.equal(actual.alt, basename(filePath));
    for (const [key, value] of Object.entries(target.composition.geometryOverrides[id])) assert.ok(Math.abs(actual.box[key] - value) < 1, key);
    assert.equal(await evaluate('window.__s11.nodes.every(n=>n.isConnected)'), true);
    assert.deepEqual(await evaluate('window.PPTSKILLEditor.layout.getSelectionState().selected'), []);
    run.checks.push({ wp2s11: 'decode-defaults-oldroots-selection', page, id, actual });
  };

  await reset();
  const png = await evaluate(`(()=>{const c=document.createElement('canvas');c.width=3;c.height=2;const x=c.getContext('2d');x.fillStyle='#2878ee';x.fillRect(0,0,3,2);x.fillStyle='#ffbd40';x.fillRect(2,0,1,2);return c.toDataURL('image/png')})()`);
  await writeFile(filePath, Buffer.from(png.split(',')[1], 'base64'));
  await writeFile(secondPath, Buffer.from(png.split(',')[1], 'base64'));
  await writeFile(badPath, '不支援的單檔');
  expected = await spec();
  await nativeDrop('正常', `${image('asset-first')} img`); await append('portable', 'inserted-image-1');
  await nativeDrop('同檔', title('portable')); await append('portable', 'inserted-image-2');
  await nativeDrop('無圖頁', title('insert-empty')); await append('insert-empty', 'inserted-image-1');
  await nativeDrop('跨頁', title('asset-other')); await append('asset-other', 'inserted-image-1');
  const shot = await cdp.send('Page.captureScreenshot', { format: 'png' });
  await writeFile(resolve(outputDir, `${width}-image-drop.png`), Buffer.from(shot.data, 'base64'));
  const exported = await assertExport('image-drop', expected);
  await cdp.send('Network.emulateNetworkConditions', { offline: true, latency: 0, downloadThroughput: 0, uploadThroughput: 0 });
  try {
    await navigate(exported); await track(); await click('[data-action="layout"]');
    await nativeDrop('export-offline', title('portable')); await append('portable', 'inserted-image-3');
    assert.equal((await snapshot()).calls, 1, 'remount 不重複 listener');
    await assertExport('image-drop-offline', expected);
  } finally { await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: 0, downloadThroughput: -1, uploadThroughput: -1 }); }

  // CDP held mouse 與 external file drag 的 ownership 衝突；此段只驗產品 cancellation 語意，不算 native drop。
  for (const snap of [false, true]) {
    await reset();
    assert.equal((await spec()).slides[0].composition.geometryOverrides?.['portable-quote'], undefined, 'fresh legacy fixture 尚未初始化');
    await click('[data-pptskill-element-id="component-portable-quote"]');
    await click('[data-action="initialize-layout"]');
    if (snap) await click('[data-action="snap-layout"]');
    assert.equal(await evaluate('document.querySelector(\'[data-action="snap-layout"]\').getAttribute("aria-pressed")'), String(snap));
    expected = await spec();
    const geometry = expected.slides[0].composition.geometryOverrides['portable-quote'];
    assert.deepEqual(geometry, { x: 800, y: 280, width: 640, height: 480 });
    const end = await startGesture('drag', 19, 12);
    const record = { wp2s11: 'gesture-cancel', route: 'synthetic gesture-cancel semantics', snap, geometry, gesturingBefore: await evaluate('window.PPTSKILLEditor.layout.getState().gesturing') };
    run.checks.push(record);
    try {
      assert.equal(record.gesturingBefore, true);
      assert.deepEqual(await spec(), expected, 'preview 不可先寫 canonical');
      record.canonicalUnchangedDuringPreview = true;
      const before = await snapshot();
      record.beforePointerRelease = await evaluate(`(()=>{
        const dt=new DataTransfer(),bytes=Uint8Array.from(atob(${JSON.stringify(png.split(',')[1])}),c=>c.charCodeAt(0));
        dt.items.add(new File([bytes],${JSON.stringify(basename(filePath))},{type:'image/png'}));
        const e=new DragEvent('drop',{bubbles:true,cancelable:true,dataTransfer:dt});
        document.querySelector(${JSON.stringify(title('portable'))}).dispatchEvent(e);
        return{isTrusted:e.isTrusted,prevented:e.defaultPrevented,gesturing:window.PPTSKILLEditor.layout.getState().gesturing};
      })()`);
      assert.deepEqual(record.beforePointerRelease, { isTrusted: false, prevented: true, gesturing: false });
      record.optimizerCalls = (await snapshot()).calls - before.calls;
      assert.equal(record.optimizerCalls, 1, 'synthetic seam 仍須經真 optimizer 一次');
    } finally { await mouse('mouseReleased', end); }
    await settle(); await append('portable', 'inserted-image-1');
    record.geometryAfterRelease = (await spec()).slides[0].composition.geometryOverrides['portable-quote'];
    assert.deepEqual(record.geometryAfterRelease, geometry, 'drop cancel 後 release 不可提交 preview');
    record.selectionEmpty = true;
  }

  await reset(); expected = await spec(); await evaluate('window.__s11.defer=true');
  await nativeDrop('deferred', title('portable')); await wait('Boolean(window.__s11.release)');
  await rejectedDrop('busy');
  await click(button); assert.equal(await evaluate(`document.querySelector('${button}').disabled`), true);
  await assertExport('image-drop-pending', expected);
  await evaluate(`document.querySelector(${JSON.stringify(title('asset-other'))}).scrollIntoView({block:'center'})`); await settle(); await click(title('asset-other'));
  await click('[data-action="edit"]');
  await evaluate(`window.PPTSKILLEditor.executeOperation({operation:'edit-text',target:{slideId:'asset-other',elementId:'role-title'},value:'drop 等待期間保留'})`);
  expected.slides.find(s => s.id === 'asset-other').content.title = 'drop 等待期間保留';
  await evaluate('window.__s11.defer=false;window.__s11.release()'); await append('portable', 'inserted-image-1');
  await assertExport('image-drop-deferred', expected);

  for (const mode of ['play', 'edit']) {
    await reset(false); if (mode === 'edit') await click('[data-action="edit"]');
    await rejectedDrop(mode);
  }
  await reset();
  await syntheticNegative('文字 URI 不接管', title('portable'), 'text', false);
  await syntheticNegative('外部 target 不接管', button, 'file', false);
  await syntheticNegative('directory empty files', title('portable'), 'empty');
  assert.match(await evaluate("document.querySelector('[data-editor-status]').textContent"), /單張/);
  const beforeMulti = await spec(); const multi = await nativeDrop('multi', title('portable'), [filePath, secondPath], false);
  if (!multi.dropGuardObserved) await syntheticNegative('multi 未投遞另驗 guard', title('portable'), 'multi');
  assert.deepEqual(await spec(), beforeMulti); assert.match(await evaluate("document.querySelector('[data-editor-status]').textContent"), /單張/);
  const beforeReject = await spec(); await nativeDrop('optimizer-reject', title('portable'), [badPath]); await idle();
  assert.deepEqual(await spec(), beforeReject); assert.equal((await snapshot()).errors.length, 1);
  await nativeDrop('reject 不占 ID', title('portable')); expected = beforeReject; await append('portable', 'inserted-image-1');

  // chooser 是既有 CDP seam；negative drop 若被瀏覽器抑制則另列 synthetic。
  let chooser = null;
  cdp.on('Page.fileChooserOpened', e => { chooser = e; });
  await cdp.send('Page.setInterceptFileChooserDialog', { enabled: true });
  try {
    for (const kind of ['insert', 'replace']) {
      await reset(); expected = await spec(); chooser = null;
      if (kind === 'replace') await click(image('asset-first'));
      await click(kind === 'insert' ? button : '[data-action="replace-selected-image"]');
      for (let i = 0; !chooser && i < 100; i++) await new Promise(ok => setTimeout(ok, 25));
      assert.ok(chooser?.backendNodeId, 'chooser seam 必須實際可用');
      const input = kind === 'insert' ? '#pptskill-insert-image-input' : '#pptskill-selected-image-input';
      const value = await evaluate(`document.querySelector('${input}').value`);
      await rejectedDrop(kind + '-chooser');
      assert.equal(await evaluate(`document.querySelector('${input}').value`), value);
      await cdp.send('DOM.setFileInputFiles', { backendNodeId: chooser.backendNodeId, files: [filePath] }); await wait('window.__s11.calls===1'); await idle();
      assert.equal((await snapshot()).calls, 1, 'drop 未破壞 chooser pending');
      if (kind === 'insert') await append('portable', 'inserted-image-1');
      else {
        expected.slides[0].content.components.find(c => c.id === 'asset-first').dataUri = (await evaluate('window.__s11.last')).dataUri;
        assert.deepEqual(await spec(), expected);
      }
    }
  } finally { await cdp.send('Page.setInterceptFileChooserDialog', { enabled: false }); }
  run.checks.push({ wp2s11: '界線', manualFinderDrag: false, cropPixelClaim: false, positiveApiFallback: false, mixedNativeGestureDropClaim: false, gestureCancellationEvidence: 'real CDP pointer + synthetic DOM drop; snap=false/true' });
}
