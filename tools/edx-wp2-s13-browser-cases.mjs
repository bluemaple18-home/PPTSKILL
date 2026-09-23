import assert from 'node:assert/strict';
import { writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

// API 插入／故障注入明標 evaluate fixture；選取、拖曳、縮放、Escape 使用真 pointer／keyboard。
// 不宣稱文字 toolbar、OS clipboard、native IME；沿 runner 的 listener／雙 viewport／offline lifecycle。
export async function runInsertTextBrowserCases({ cdp, evaluate, navigate, sourcePath, outputDir, width, run, click, position, mouse, settle, assertExport }) {
  await navigate(sourcePath);
  const spec = () => evaluate('window.PPTSKILLEditor.getDeckSpec()');
  const selected = () => evaluate('window.PPTSKILLEditor.layout.getSelectionState().selected');
  const selector = (id = 'inserted-text', slide = 'portable') => `.slide[data-slide-id="${slide}"] [data-pptskill-element-id="component-${id}"]`;
  const text = '  文字\n😀 <script>window.__s13Executed=true</script><img src=x><a href="x">連結</a> &  ';
  const request = (id = 'inserted-text', slideId = 'portable') => ({ operation: 'insert-element', target: { slideId }, value: {
    component: { id, type: 'text', text }, geometry: { x: 550, y: 600, width: 420, height: 160 },
  } });
  const expected = await spec();
  await evaluate(`window.__s13Nodes=[...document.querySelectorAll('.slide,.slide [data-edit-target],.slide img')];window.__s13Trusted=[];for(const type of ['pointerdown','keydown'])document.addEventListener(type,e=>window.__s13Trusted.push({type,trusted:e.isTrusted,key:e.key||''}));`);
  const insert = async req => {
    await evaluate(`window.PPTSKILLEditor.executeOperation(${JSON.stringify(req)})`);
    const slide = expected.slides.find(s => s.id === req.target.slideId);
    slide.content.components.push(structuredClone(req.value.component));
    slide.composition.geometryOverrides = { ...slide.composition.geometryOverrides, [req.value.component.id]: { ...req.value.geometry } };
    assert.deepEqual(await spec(), expected); assert.deepEqual(await selected(), []);
    assert.equal(await evaluate('window.__s13Nodes.every(n=>n.isConnected)'), true);
    assert.equal(await evaluate('document.querySelector(\'.slide[data-editor-selected="true"]\').dataset.slideId'), 'portable');
    run.checks.push({ wp2s13: 'API-fixture-insert', id: req.value.component.id, slideId: slide.id });
  };
  const verify = async (id = 'inserted-text', slideId = 'portable', explicit = true) => {
    const slide = expected.slides.find(s => s.id === slideId), component = slide.content.components.find(c => c.id === id);
    const actual = await evaluate(`(()=>{const nodes=document.querySelectorAll(${JSON.stringify(selector(id, slideId))}),n=nodes[0];return{count:nodes.length,text:n.textContent,kind:n.dataset.editKind,editable:n.contentEditable,inherited:n.isContentEditable,children:n.querySelectorAll('script,img,a').length,executed:window.__s13Executed===true,box:{x:parseFloat(n.style.left),y:parseFloat(n.style.top),width:parseFloat(n.style.width),height:parseFloat(n.style.height)}}})()`);
    assert.equal(actual.count, 1); assert.equal(actual.text, component.text); assert.equal(actual.kind, 'text');
    assert.equal(actual.inherited, false); if (explicit) assert.equal(actual.editable, 'false');
    assert.equal(actual.children, 0); assert.equal(actual.executed, false); assert.deepEqual(actual.box, slide.composition.geometryOverrides[id]);
    assert.deepEqual(await spec(), expected);
  };
  // 祖先可編輯是受控 fixture；不把 DOM 設定冒稱 pointer 操作。
  await click('[data-action="edit"]');
  await evaluate(`document.querySelector('.slide[data-slide-id="portable"]').contentEditable='true'`);
  await insert(request()); await verify();
  await evaluate(`document.querySelector('.slide[data-slide-id="portable"]').removeAttribute('contenteditable')`);
  await click('[data-action="edit"]'); await verify();
  const play = request('play-text', 'asset-other'); await insert(play); await verify('play-text', 'asset-other');
  await click('[data-action="layout"]');
  const layout = request('layout-text', 'asset-other'); layout.value.geometry.y = 400; await insert(layout); await verify('layout-text', 'asset-other');
  await click('[data-action="edit"]');
  assert.equal(await evaluate(`document.querySelector(${JSON.stringify(selector('portable-quote'))}).contentEditable`), 'false');
  await verify(); await click('[data-action="layout"]');
  run.checks.push({ wp2s13: 'API-fixture-escape-cross-slide-modes', textComponentDirectEditing: false, inheritedEditable: false });

  const invalid = await evaluate(`(()=>{const api=window.PPTSKILLEditor,read=()=>JSON.stringify({spec:api.getDeckSpec(),dom:document.querySelector('.deck').outerHTML,selection:api.layout.getSelectionState(),state:api.layout.getState()}),before=read();let calls=0,rejected=0;const make=()=>(${JSON.stringify(request('invalid'))}),bad=[];for(const value of ['', '😀'.repeat(501), 1, null]){const r=make();r.value.component.text=value;bad.push(r)}for(const key of ['text','type']){const r=make();Object.defineProperty(r.value.component,key,{get(){calls++;throw Error('getter')}});bad.push(r)}const hidden=make();Object.defineProperty(hidden.value.component,'text',{enumerable:false});bad.push(hidden);const mixed=make();mixed.value.component.alt='混搭';bad.push(mixed);const geometry=make();geometry.value.geometry.x=79;bad.push(geometry);bad.push(${JSON.stringify(request())});for(const r of bad){try{api.executeOperation(r)}catch{rejected++}if(before!==read())throw Error('非法 payload 改動 state')}return{calls,rejected,total:bad.length,unchanged:before===read()}})()`);
  assert.equal(invalid.calls, 0); assert.equal(invalid.rejected, invalid.total); assert.equal(invalid.unchanged, true);
  run.checks.push({ wp2s13: 'API-fixture-invalid-atomic', ...invalid });
  for (const after of [false, true]) {
    const result = await evaluate(`(()=>{const root=document.querySelector('.slide[data-slide-id="asset-other"]'),append=root.append,api=window.PPTSKILLEditor,read=()=>JSON.stringify({spec:api.getDeckSpec(),dom:document.querySelector('.deck').outerHTML,selection:api.layout.getSelectionState()});const before=read();let error='';root.append=function(node){if(${after})append.call(this,node);throw Error('s13-append')};try{api.executeOperation(${JSON.stringify(request('throw-text', 'asset-other'))})}catch(e){error=e.message}finally{root.append=append}return{error,unchanged:before===read()}})()`);
    assert.deepEqual(result, { error: 's13-append', unchanged: true });
    run.checks.push({ wp2s13: 'API-fixture-append-rollback', after });
  }
  const start = async kind => {
    await click(selector()); assert.deepEqual(await selected(), ['component-inserted-text']);
    const css = kind === 'resize' ? '.moveable-se' : selector();
    const p = await position(css, kind === 'resize' ? 0.5 : 0.1, kind === 'resize' ? 0.5 : 0.1);
    assert.equal(await evaluate(`Boolean(document.elementFromPoint(${p.x},${p.y})?.closest(${JSON.stringify(css)}))`), true);
    const scale = await evaluate(`document.querySelector('.slide[data-slide-id="portable"]').getBoundingClientRect().width/1600`);
    await mouse('mouseMoved', p); await mouse('mousePressed', p, true);
    for (let step = 1; step <= 6; step++) await mouse('mouseMoved', { x: p.x + 24 * scale * step / 6, y: p.y + 16 * scale * step / 6 }, true);
    await settle(); assert.equal(await evaluate('window.PPTSKILLEditor.layout.getState().gesturing'), true);
    assert.deepEqual(await spec(), expected);
    return { x: p.x + 24 * scale, y: p.y + 16 * scale };
  };
  for (const kind of ['drag', 'resize']) {
    const p = await start(kind); await mouse('mouseReleased', p); await settle();
    const box = expected.slides[0].composition.geometryOverrides['inserted-text'];
    if (kind === 'drag') { box.x += 24; box.y += 16; } else { box.width += 24; box.height += 16; }
    await verify();
    const actual = await evaluate(`(()=>{const n=document.querySelector(${JSON.stringify(selector())}),r=n.getBoundingClientRect(),s=n.closest('.slide').getBoundingClientRect(),k=s.width/1600;return{x:(r.x-s.x)/k,y:(r.y-s.y)/k,width:r.width/k,height:r.height/k}})()`);
    for (const key of Object.keys(box)) assert.ok(Math.abs(actual[key] - box[key]) < 1, `${kind} ${key}`);
    run.checks.push({ wp2s13: 'real-pointer-geometry', kind, actual });
  }
  const cancelled = await start('drag');
  await insert(request('cancel-preview', 'asset-other'));
  await mouse('mouseReleased', cancelled); await settle(); await verify();
  assert.equal(await evaluate('window.PPTSKILLEditor.layout.getState().gesturing'), false);
  assert.deepEqual(await selected(), []);
  const escaped = await start('drag');
  for (const type of ['keyDown', 'keyUp']) await cdp.send('Input.dispatchKeyEvent', { type, key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 });
  await mouse('mouseReleased', escaped); await settle(); await verify();
  assert.equal(await evaluate('window.PPTSKILLEditor.layout.getState().gesturing'), false);
  const trusted = await evaluate('window.__s13Trusted');
  assert.ok(trusted.some(e => e.type === 'pointerdown')); assert.ok(trusted.some(e => e.key === 'Escape')); assert.ok(trusted.every(e => e.trusted));
  run.checks.push({ wp2s13: 'real-pointer-keyboard-preview-cancel', trusted });
  await click(selector()); await mouse('mouseMoved', { x: 4, y: 4 }); await settle();
  const screenshot = resolve(outputDir, `${width}-s13-inserted-text-controls.png`);
  const shot = await cdp.send('Page.captureScreenshot', { format: 'png' }); await writeFile(screenshot, Buffer.from(shot.data, 'base64')); run.artifacts.push(screenshot);
  const exported = await assertExport('s13-insert-text', expected);
  assert.equal(await evaluate(`new DOMParser().parseFromString(window.PPTSKILLEditor.exportHtml(),'text/html').querySelectorAll('[contenteditable]').length`), 0);
  await cdp.send('Network.emulateNetworkConditions', { offline: true, latency: 0, downloadThroughput: 0, uploadThroughput: 0 });
  try {
    await navigate(exported);
    await verify('inserted-text', 'portable', false);
    await verify('play-text', 'asset-other', false); await verify('layout-text', 'asset-other', false); await verify('cancel-preview', 'asset-other', false);
    await click('[data-action="edit"]'); await verify(); await click('[data-action="layout"]'); await click(selector());
    assert.deepEqual(await selected(), ['component-inserted-text']);
    await evaluate(`window.PPTSKILLEditor.executeOperation({operation:'move-element',target:{slideId:'portable',elementId:'component-inserted-text'},value:{x:620,y:580}})`);
    Object.assign(expected.slides[0].composition.geometryOverrides['inserted-text'], { x: 620, y: 580 }); await verify();
    await evaluate(`window.__s13Nodes=[...document.querySelectorAll('.slide,.slide [data-edit-target]')]`);
    await insert(request('offline-reinsert', 'asset-other')); await verify('offline-reinsert', 'asset-other');
    await assertExport('s13-insert-text-offline', expected);
  } finally { await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: 0, downloadThroughput: -1, uploadThroughput: -1 }); }
  run.checks.push({ wp2s13: 'API-fixture-export-offline-reinsert', screenshot, geometry: true, directEditable: false });
}
