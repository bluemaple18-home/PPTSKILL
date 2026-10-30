import assert from 'node:assert/strict';
import { writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

// 僅由 Mainline 受管 host 執行。ClipboardEvent File adapter 明示 synthetic；不接觸 OS clipboard。
export async function runImagePasteBrowserCases({ cdp, evaluate, navigate, sourcePath, outputDir, width, run, click, mouse, settle, assertExport, startGesture }) {
  const title = id => `.slide[data-slide-id="${id}"] [data-pptskill-element-id="role-title"]`;
  const image = (id, page = 'portable') => `.slide[data-slide-id="${page}"] [data-pptskill-element-id="component-${id}"]`;
  const button = '[data-action="insert-image"]';
  const spec = () => evaluate('window.PPTSKILLEditor.getDeckSpec()');
  const wait = async expression => {
    for (let i = 0; i < 100; i++) { if (await evaluate(expression)) return; await new Promise(ok => setTimeout(ok, 25)); }
    throw Error('S12 等待逾時：' + expression);
  };
  const track = () => evaluate(`(()=>{
    const original=window.PPTSKILLAssets.optimizeFile;
    window.__s12={calls:0,settled:0,defer:false,release:null,last:null,errors:[],events:[],nodes:[...document.querySelectorAll('.slide,.slide [data-edit-target],.slide img')]};
    document.addEventListener('paste',e=>window.__s12.events.push({isTrusted:e.isTrusted,prevented:e.defaultPrevented,files:e.clipboardData?.files.length}));
    window.PPTSKILLAssets.optimizeFile=async file=>{const t=window.__s12;t.calls++;const gate=t.defer?new Promise(ok=>t.release=ok):Promise.resolve();try{const result=await original(file);await gate;t.last=result;return result}catch(e){t.errors.push(e.message);throw e}finally{t.settled++}};
    const c=document.createElement('canvas');c.width=3;c.height=2;c.getContext('2d').fillRect(0,0,3,2);window.__s12.png=c.toDataURL('image/png');return true;
  })()`);
  const reset = async (layout = true) => { await navigate(sourcePath); await track(); if (layout) await click('[data-action="layout"]'); };
  const idle = async () => { await wait('window.__s12.calls===window.__s12.settled'); await settle(); };
  // 真 DataTransfer / File / ClipboardEvent；所有 receipt 均記 isTrusted=false。
  const paste = async (label, css = title('portable'), kind = 'file', prevented = true, options = {}) => {
    const record = await evaluate(`(()=>{
      const t=window.__s12,before=t.calls,dt=new DataTransfer(),kind=${JSON.stringify(kind)},options=${JSON.stringify(options)};
      const bytes=Uint8Array.from(atob(t.png.split(',')[1]),c=>c.charCodeAt(0));
      if(kind==='file'||kind==='multi'||kind==='mixed')dt.items.add(new File([bytes],'paste-3x2.png',{type:'image/png'}));
      if(kind==='multi')dt.items.add(new File([bytes],'second.png',{type:'image/png'}));
      if(kind==='empty')Object.defineProperty(dt,'types',{value:['Files']});
      if(kind==='reject')dt.items.add(new File(['不支援'],'bad.txt',{type:'text/plain'}));
      if(kind==='text'||kind==='mixed')dt.setData('text/html','<img src="https://invalid.example/image.png"><img src="data:image/png;base64,AA==">');
      if(kind==='text')dt.setData('text/uri-list','https://invalid.example/image.png');
      Object.defineProperty(dt,'getData',{value(){throw Error('不得讀 clipboard text')}});
      const e=new ClipboardEvent('paste',{bubbles:true,cancelable:true,clipboardData:kind==='null'?null:dt});
      if(options.defaultPrevented)e.preventDefault();if(options.isComposing)Object.defineProperty(e,'isComposing',{value:true});
      const target=${css === 'document' ? 'document' : `document.querySelector(${JSON.stringify(css)})`};target.dispatchEvent(e);
      return{isTrusted:e.isTrusted,prevented:e.defaultPrevented,optimizerCalls:t.calls-before,gesturing:window.PPTSKILLEditor.layout.getState().gesturing};
    })()`);
    run.checks.push({ wp2s12: label, route: 'synthetic ClipboardEvent + DataTransfer + File', ...record });
    assert.equal(record.isTrusted, false); assert.equal(record.prevented, prevented, label); return record;
  };
  const reject = async (label, css, kind = 'file', prevented = true, options = {}) => {
    const before = await spec(), state = await evaluate('window.PPTSKILLEditor.layout.getSelectionState()');
    const record = await paste(label, css, kind, prevented, options); await settle();
    assert.equal(record.optimizerCalls, 0); assert.deepEqual(await spec(), before);
    assert.deepEqual(await evaluate('window.PPTSKILLEditor.layout.getSelectionState()'), state);
  };
  let expected;
  const append = async (page, id) => {
    await idle(); await wait(`window.PPTSKILLEditor.getDeckSpec().slides.find(s=>s.id===${JSON.stringify(page)}).content.components.some(c=>c.id===${JSON.stringify(id)})`);
    const optimized = await evaluate('window.__s12.last'); assert.equal(optimized.width, 3); assert.equal(optimized.height, 2);
    const target = expected.slides.find(s => s.id === page);
    target.content.components.push({ id, type: 'image', dataUri: optimized.dataUri, alt: 'paste-3x2.png', fit: 'contain' });
    target.composition.geometryOverrides = { ...target.composition.geometryOverrides, [id]: { x: 560, y: 288, width: 480, height: 320 } };
    assert.deepEqual(await spec(), expected);
    const actual = await evaluate(`(async()=>{const n=document.querySelector(${JSON.stringify(image(id, page))}),img=n.querySelector('img');await img.decode();const r=n.getBoundingClientRect(),s=n.closest('.slide').getBoundingClientRect(),k=s.width/1600;return{natural:[img.naturalWidth,img.naturalHeight],fit:getComputedStyle(img).objectFit,alt:img.alt,box:{x:(r.x-s.x)/k,y:(r.y-s.y)/k,width:r.width/k,height:r.height/k}}})()`);
    assert.deepEqual(actual.natural, [3, 2]); assert.equal(actual.fit, 'contain'); assert.equal(actual.alt, 'paste-3x2.png');
    for (const [key, value] of Object.entries(target.composition.geometryOverrides[id])) assert.ok(Math.abs(actual.box[key] - value) < 1, key);
    assert.equal(await evaluate('window.__s12.nodes.every(n=>n.isConnected)'), true);
    assert.deepEqual(await evaluate('window.PPTSKILLEditor.layout.getSelectionState().selected'), []);
    run.checks.push({ wp2s12: 'decode-defaults-oldroots-selection', page, id, actual });
  };

  await reset(); expected = await spec();
  for (const [label, css, page, id] of [
    ['nested-image', image('asset-first') + ' img', 'portable', 'inserted-image-1'],
    ['same-file', title('portable'), 'portable', 'inserted-image-2'],
    ['empty-slide', title('insert-empty'), 'insert-empty', 'inserted-image-1'],
    ['cross-slide', title('asset-other'), 'asset-other', 'inserted-image-1'],
    ['body-current', 'body', 'asset-other', 'inserted-image-2'],
    ['toolbar-current', button, 'asset-other', 'inserted-image-3'],
    ['document-current', 'document', 'asset-other', 'inserted-image-4'],
    ['deck-current', '.deck', 'asset-other', 'inserted-image-5'],
  ]) { assert.equal((await paste(label, css)).optimizerCalls, 1); await append(page, id); }
  for (const [label, css] of [['new-image', image('inserted-image-5', 'asset-other')], ['toolbar', '[data-pptskill-editor]']]) {
    await evaluate(`document.querySelector(${JSON.stringify(css)}).scrollIntoView({block:'center'})`); await settle();
    const shot = await cdp.send('Page.captureScreenshot', { format: 'png' });
    await writeFile(resolve(outputDir, `${width}-image-paste-${label}.png`), Buffer.from(shot.data, 'base64'));
  }
  const exported = await assertExport('image-paste', expected);
  await cdp.send('Network.emulateNetworkConditions', { offline: true, latency: 0, downloadThroughput: 0, uploadThroughput: 0 });
  try {
    await navigate(exported); await track(); await click('[data-action="layout"]');
    await paste('offline-remount', title('portable')); await append('portable', 'inserted-image-3');
    assert.equal(await evaluate('window.__s12.calls'), 1); assert.equal(await evaluate('window.__s12.events.length'), 1);
    await assertExport('image-paste-offline', expected);
  } finally { await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: 0, downloadThroughput: -1, uploadThroughput: -1 }); }

  for (const snap of [false, true]) {
    await reset(); await click('[data-pptskill-element-id="component-portable-quote"]'); await click('[data-action="initialize-layout"]');
    if (snap) await click('[data-action="snap-layout"]'); expected = await spec();
    const geometry = structuredClone(expected.slides[0].composition.geometryOverrides['portable-quote']);
    const end = await startGesture('drag', 19, 12);
    try {
      assert.equal(await evaluate('window.PPTSKILLEditor.layout.getState().gesturing'), true); assert.deepEqual(await spec(), expected);
      const record = await paste('gesture-cancel snap=' + snap); assert.equal(record.gesturing, false); assert.equal(record.optimizerCalls, 1);
    } finally { await mouse('mouseReleased', end); }
    await append('portable', 'inserted-image-1'); assert.deepEqual((await spec()).slides[0].composition.geometryOverrides['portable-quote'], geometry);
  }

  await reset(); expected = await spec(); await evaluate('window.__s12.defer=true');
  await paste('captured-target'); await wait('Boolean(window.__s12.release)');
  await reject('busy', title('asset-other')); await assertExport('image-paste-pending', expected);
  await evaluate(`document.querySelector(${JSON.stringify(title('asset-other'))}).scrollIntoView({block:'center'})`); await settle(); await click(title('asset-other'));
  await click('[data-action="edit"]');
  await evaluate(`window.PPTSKILLEditor.executeOperation({operation:'edit-text',target:{slideId:'asset-other',elementId:'role-title'},value:'paste 等待期間保留'})`);
  expected.slides.find(s => s.id === 'asset-other').content.title = 'paste 等待期間保留';
  await evaluate('window.__s12.defer=false;window.__s12.release()'); await append('portable', 'inserted-image-1');
  await assertExport('image-paste-deferred', expected);

  for (const mode of ['play', 'edit', 'destroy']) {
    await reset(false); if (mode === 'edit') await click('[data-action="edit"]');
    if (mode === 'destroy') { await click('[data-action="layout"]'); await evaluate('window.PPTSKILLEditor.layout.destroy()'); }
    await reject(mode, title('portable'), 'file', false);
  }
  await reset();
  for (const kind of ['text', 'null']) await reject(kind, title('portable'), kind, false);
  await reject('defaultPrevented', title('portable'), 'file', true, { defaultPrevented: true });
  await reject('isComposing', title('portable'), 'file', false, { isComposing: true });
  await reject('empty-file-marker', title('portable'), 'empty'); assert.match(await evaluate("document.querySelector('[data-editor-status]').textContent"), /單張/);
  await reject('multi', title('portable'), 'multi'); assert.match(await evaluate("document.querySelector('[data-editor-status]').textContent"), /單張/);
  await evaluate(`(()=>{const n=document.createElement('div');n.id='s12-external';document.body.append(n)})()`);
  await reject('external', '#s12-external', 'file', false);
  for (const tag of ['input', 'textarea', 'select', 'textbox', 'editable']) {
    await evaluate(`(()=>{document.querySelector('#s12-input')?.remove();const n=document.createElement(${JSON.stringify(['textbox', 'editable'].includes(tag) ? 'div' : tag)});n.id='s12-input';n.tabIndex=0;${tag === 'textbox' ? "n.setAttribute('role','textbox');" : ''}${tag === 'editable' ? "n.contentEditable='true';n.innerHTML='<span id=s12-nested>組字</span>';" : ''}document.querySelector('.slide').append(n);n.focus()})()`);
    await reject(tag + '-active', 'body', 'file', false);
    await reject(tag + '-target', tag === 'editable' ? '#s12-nested' : '#s12-input', 'file', false);
    await evaluate("document.querySelector('#s12-input').remove();document.activeElement?.blur()");
  }
  await click('[data-action="edit"]');
  await evaluate(`document.querySelector(${JSON.stringify(title('portable'))}).dispatchEvent(new CompositionEvent('compositionstart',{bubbles:true,data:'中'}))`);
  await reject('existing-IME', 'body', 'file', false);
  await evaluate(`document.querySelector(${JSON.stringify(title('portable'))}).dispatchEvent(new CompositionEvent('compositionend',{bubbles:true,data:''}))`);
  await reset(); expected = await spec();
  const bad = await paste('optimizer-reject', title('portable'), 'reject'); assert.equal(bad.optimizerCalls, 1); await idle();
  assert.deepEqual(await spec(), expected); assert.equal(await evaluate('window.__s12.errors.length'), 1);
  await paste('mixed-file-text-no-ID-leak', title('portable'), 'mixed'); await append('portable', 'inserted-image-1');

  // 真 chooser pending 與 paste 互斥；檔案只由既有 chooser CDP seam 輸入。
  const filePath = resolve(outputDir, `${width}-paste-3x2.png`);
  await writeFile(filePath, Buffer.from((await evaluate('window.__s12.png')).split(',')[1], 'base64'));
  let chooser = null; cdp.on('Page.fileChooserOpened', e => { chooser = e; });
  await cdp.send('Page.setInterceptFileChooserDialog', { enabled: true });
  try {
    for (const kind of ['insert', 'replace']) {
      await reset(); chooser = null; expected = await spec();
      if (kind === 'replace') await click(image('asset-first'));
      await click(kind === 'insert' ? button : '[data-action="replace-selected-image"]');
      for (let i = 0; !chooser && i < 100; i++) await new Promise(ok => setTimeout(ok, 25));
      assert.ok(chooser?.backendNodeId);
      const input = kind === 'insert' ? '#pptskill-insert-image-input' : '#pptskill-selected-image-input';
      const value = await evaluate(`document.querySelector('${input}').value`);
      await reject(kind + '-chooser', title('portable'));
      assert.equal(await evaluate(`document.querySelector('${input}').value`), value);
      await cdp.send('DOM.setFileInputFiles', { backendNodeId: chooser.backendNodeId, files: [filePath] }); await idle();
      assert.equal(await evaluate('window.__s12.calls'), 1);
      const optimized = await evaluate('window.__s12.last');
      if (kind === 'insert') {
        expected.slides[0].content.components.push({ id: 'inserted-image-1', type: 'image', dataUri: optimized.dataUri, alt: `${width}-paste-3x2.png`, fit: 'contain' });
        expected.slides[0].composition.geometryOverrides = { ...expected.slides[0].composition.geometryOverrides, 'inserted-image-1': { x: 560, y: 288, width: 480, height: 320 } };
      } else expected.slides[0].content.components.find(c => c.id === 'asset-first').dataUri = optimized.dataUri;
      assert.deepEqual(await spec(), expected);
    }
  } finally { await cdp.send('Page.setInterceptFileChooserDialog', { enabled: false }); }
  run.checks.push({ wp2s12: '驗收界線', isTrusted: false, nativeOSClipboard: false, cmdCtrlV: false, optimizer: 'real decode 3x2', priorRoutes: '獨立 S10 chooser 與 S11 drop records' });
}
