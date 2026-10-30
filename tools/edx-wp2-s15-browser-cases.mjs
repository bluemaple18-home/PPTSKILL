import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { assetReplacementPng } from './edx-wp2-s4-browser-cases.mjs';

// Worker 僅撰寫；Mainline 沿 runner 在 navigate 前掛 listener、雙 desktop viewport、targetClosed。
// 真 pointer／CDP Input.insertText 與鍵盤；IME／故障／stale／chooser cancel 明列 synthetic fixture。
export async function runInsertTextUIBrowserCases({ cdp, evaluate, navigate, sourcePath, outputDir, width, run, click, position, mouse, settle, assertExport, startGesture }) {
  const button = '[data-action="insert-text"]', dialog = '[data-insert-text-dialog]', input = '[data-insert-text-value]', submit = '[data-action="submit-insert-text"]', cancel = '[data-action="cancel-insert-text"]';
  const selector = (id, slide = 'portable') => `.slide[data-slide-id="${slide}"] [data-pptskill-element-id="component-${id}"]`;
  const spec = () => evaluate('window.PPTSKILLEditor.getDeckSpec()');
  const record = (claim, kind = 'real-pointer/Input.insertText', detail = {}) => run.checks.push({ wp2s15: claim, kind, ...detail });
  const key = async (key, code, keyCode, extra = {}) => { await cdp.send('Input.dispatchKeyEvent', { type: 'keyDown', key, code, windowsVirtualKeyCode: keyCode, ...extra }); await cdp.send('Input.dispatchKeyEvent', { type: 'keyUp', key, code, windowsVirtualKeyCode: keyCode, ...extra }); await settle(); };
  const type = async value => { await click(input); await key('a', 'KeyA', 65, { modifiers: 4, commands: ['selectAll'] }); await cdp.send('Input.insertText', { text: value }); await settle(); assert.equal(await evaluate(`document.querySelector('${input}').value`), value); };
  const open = async () => { const before = await spec(); await click(button); assert.equal(await evaluate(`document.querySelector('${dialog}').open`), true); assert.deepEqual(await spec(), before); assert.equal(await evaluate(`document.activeElement===document.querySelector('${input}')`), true); };
  const selectSlide = async id => { await evaluate(`document.querySelector('.slide[data-slide-id="${id}"]').scrollIntoView()`); await settle(); await click(`.slide[data-slide-id="${id}"] [data-pptskill-element-id="role-title"]`); };
  const screenshot = async label => { const { data } = await cdp.send('Page.captureScreenshot', { format: 'png' }); const path = resolve(outputDir, `${width}-s15-${label}.png`), png = Buffer.from(data, 'base64'); await writeFile(path, png); run.artifacts.push({ label: `s15-${label}`, path, bytes: png.length, sha256: createHash('sha256').update(png).digest('hex') }); };
  const visible = async css => assert.equal(await evaluate(`(()=>{const n=document.querySelector(${JSON.stringify(css)}),r=n.getBoundingClientRect();return r.width>0&&r.height>0&&r.left>=0&&r.top>=0&&r.right<=innerWidth&&r.bottom<=innerHeight})()`), true, css + ' desktop 不 clip');
  let expected;
  const inserted = async (value, slideId = 'portable') => {
    const slide = expected.slides.find(s => s.id === slideId), used = new Set(slide.content.components.map(c => c.id)); let n = 1; while (used.has(`inserted-text-${n}`)) n++;
    const id = `inserted-text-${n}`; await click(submit);
    slide.content.components.push({ id, type: 'text', text: value }); slide.composition.geometryOverrides = { ...slide.composition.geometryOverrides, [id]: { x: 560, y: 288, width: 480, height: 320 } };
    assert.deepEqual(await spec(), expected); assert.equal(await evaluate(`document.querySelector('${dialog}').open`), false);
    assert.deepEqual(await evaluate(`(()=>{const n=document.querySelector(${JSON.stringify(selector(id, slideId))});return{text:n.textContent,children:n.children.length,editable:n.contentEditable}})()`), { text: value, children: 0, editable: 'false' });
    assert.equal(await evaluate(`document.querySelector('${input}').value`), ''); record('精確文字／geometry／單次新增／純文字 DOM', undefined, { slideId, id, codepoints: [...value].length }); return id;
  };
  await navigate(sourcePath); expected = await spec();
  assert.equal(await evaluate(`document.querySelector('${button}').hidden`), true); await click('[data-action="edit"]'); assert.equal(await evaluate(`document.querySelector('${button}').hidden`), true); await click('[data-action="layout"]'); await visible(button); await screenshot('toolbar'); record('play/edit 隱藏、layout 顯示');
  // base helper 固定 portable-quote；先初始化再以真 pointer 啟動 preview。
  await selectSlide('portable'); await click(selector('portable-quote')); await click('[data-action="initialize-layout"]'); expected = await spec(); const beforePreview = await evaluate(`document.querySelector(${JSON.stringify(selector('portable-quote'))}).getAttribute('style')`); const p = await startGesture('drag', 20, 12); assert.equal(await evaluate('window.PPTSKILLEditor.layout.getState().gesturing'), true);
  await open(); await mouse('mouseReleased', p); assert.equal(await evaluate('window.PPTSKILLEditor.layout.getState().gesturing'), false); assert.equal(await evaluate(`document.querySelector(${JSON.stringify(selector('portable-quote'))}).getAttribute('style')`), beforePreview); assert.deepEqual(await spec(), expected); await click(cancel); record('open 取消真 pointer preview，canonical 不提交');
  await evaluate('window.__s15OldNodes=[...document.querySelectorAll(".slide,.slide [data-edit-target]")]');
  await open(); await visible(dialog); await visible(input); await visible(submit); await screenshot('dialog');
  assert.equal(await evaluate(`(()=>{const b=document.querySelector('${button}'),r=b.getBoundingClientRect();return !document.elementFromPoint(r.x+r.width/2,r.y+r.height/2)?.closest('${button}')})()`), true); record('native showModal focus 與背景 inert', 'native browser');
  const exact = '  e\u0301\n😀 <script>window.__S15_XSS=1</script><img src=x> &  '; await type(exact); await inserted(exact); assert.equal(await evaluate('window.__S15_XSS===undefined'), true);
  assert.equal(await evaluate('window.__s15OldNodes.every(n=>n.isConnected)'), true); record('舊 roots／內容保留、HTML-like 不執行');
  await open(); await type('再次新增'); await inserted('再次新增');
  // 原生 Enter 只換行；invalid 保留後以真鍵盤修正。
  await open(); await click(submit); assert.deepEqual(await spec(), expected); assert.equal(await evaluate(`document.querySelector('${dialog}').open`), true); await visible('[data-insert-text-status]');
  assert.equal(await evaluate('document.activeElement===document.querySelector("[data-insert-text-status]")'), true); record('empty inline validation 可見可 focus／no-op');
  await type('行一'); await key('Enter', 'Enter', 13, { text: '\r' }); await cdp.send('Input.insertText', { text: '行二' }); await settle(); assert.equal(await evaluate(`document.querySelector('${input}').value`), '行一\n行二'); assert.deepEqual(await spec(), expected); record('Enter 換行不提交', 'real keyboard');
  await type('😀'.repeat(501)); await click(submit); assert.deepEqual(await spec(), expected); assert.equal(await evaluate(`document.querySelector('${input}').value.length`), 1002); record('501 codepoints invalid 保留／no-op');
  await type('😀'.repeat(500)); await inserted('😀'.repeat(500)); record('invalid→修正→500 emoji 成功');
  await click(selector('inserted-text-3')); assert.deepEqual(await evaluate('window.PPTSKILLEditor.layout.getSelectionState().selected'), ['component-inserted-text-3']);
  for (const method of ['cancel', 'Escape']) { const selection = await evaluate('window.PPTSKILLEditor.layout.getSelectionState()'); await open(); await type('不要提交'); if (method === 'cancel') await click(cancel); else await key('Escape', 'Escape', 27); assert.deepEqual(await spec(), expected); assert.equal(await evaluate(`document.querySelector('${dialog}').open`), false); assert.equal(await evaluate(`document.querySelector('${input}').value`), ''); assert.equal(await evaluate(`document.activeElement===document.querySelector('${button}')`), true); assert.deepEqual(await evaluate('window.PPTSKILLEditor.layout.getSelectionState()'), selection); record(method + ' 清 draft／selection canonical no-op', method === 'cancel' ? 'real pointer' : 'real keyboard'); }
  await open(); await type('組字'); await evaluate(`document.querySelector('${input}').dispatchEvent(new CompositionEvent('compositionstart',{bubbles:true,data:'組'}))`); await click(submit); assert.equal(await evaluate(`(()=>{const e=new KeyboardEvent('keydown',{key:'Escape',code:'Escape',isComposing:true,bubbles:true,cancelable:true});document.querySelector('${input}').dispatchEvent(e);return e.defaultPrevented})()`), false); await key('Escape', 'Escape', 27); assert.equal(await evaluate(`document.querySelector('${dialog}').open`), true); assert.deepEqual(await spec(), expected);
  await evaluate(`document.querySelector('${input}').dispatchEvent(new CompositionEvent('compositionend',{bubbles:true,data:'組字'}))`); await inserted('組字'); record('IME keydown 未 preventDefault／cancel guard／submit guard', 'synthetic CompositionEvent＋real Escape；非 OS IME');
  await selectSlide('insert-empty'); assert.equal(expected.slides.find(s => s.id === 'insert-empty').content.components.length, 0); await open(); await type('空頁新增'); await inserted('空頁新增', 'insert-empty'); record('empty slide 可插入');
  await open(); await type('無圖片頁'); await inserted('無圖片頁', 'insert-empty'); record('noimage slide 可再次插入');
  // API 僅作 type collision fixture；hole 的填補必須從 UI。
  await evaluate(`window.PPTSKILLEditor.executeOperation({operation:'insert-element',target:{slideId:'insert-empty'},value:{component:{id:'inserted-text-3',type:'image',dataUri:${JSON.stringify(assetReplacementPng)},alt:'占用',fit:'contain'},geometry:{x:1200,y:600,width:80,height:80}}})`);
  await evaluate(`window.PPTSKILLEditor.executeOperation({operation:'insert-element',target:{slideId:'insert-empty'},value:{component:{id:'inserted-text-5',type:'text',text:'占用'},geometry:{x:1320,y:700,width:80,height:80}}})`); expected = await spec();
  await selectSlide('insert-empty'); await open(); await type('hole 4'); assert.equal(await inserted('hole 4', 'insert-empty'), 'inserted-text-4'); record('first-free hole 4／跨 type namespace', 'API fixture＋real UI insert');
  // 修改 target 的事件只作 fixture，提交仍真 pointer；每例都核對 canonical no-op。
  for (const stale of ['page', 'mode', 'selection', 'removed', 'rebuilt', 'duplicate']) {
    await selectSlide('portable'); await open(); await type('STALE_DRAFT');
    if (stale === 'page') await evaluate(`document.querySelector('.slide[data-slide-id="asset-other"]').dispatchEvent(new FocusEvent('focusin',{bubbles:true}))`);
    if (stale === 'mode') await evaluate('window.PPTSKILLEditor.layout.setMode(false)');
    if (stale === 'selection') await evaluate('window.PPTSKILLEditor.layout.clearSelection()');
    if (['removed', 'rebuilt', 'duplicate'].includes(stale)) await evaluate(`(()=>{const r=document.querySelector('.slide[data-slide-id="portable"]');window.__s15Root=r;window.__s15Parent=r.parentNode;window.__s15Next=r.nextSibling;${stale === 'removed' ? 'r.remove()' : stale === 'rebuilt' ? 'r.replaceWith(r.cloneNode(true))' : 'r.after(r.cloneNode(true))'};return true})()`);
    await settle(); if (await evaluate(`document.querySelector('${dialog}').open`)) await click(submit);
    assert.deepEqual(await spec(), expected); assert.equal(await evaluate(`document.querySelector('${dialog}').open`), false); record('target stale ' + stale + ' no-op', 'synthetic target fixture＋real pointer submit（若仍 open）');
    if (['removed', 'rebuilt', 'duplicate'].includes(stale)) await evaluate(`(()=>{document.querySelectorAll('.slide[data-slide-id="portable"]').forEach(n=>n.remove());window.__s15Parent.insertBefore(window.__s15Root,window.__s15Next);return true})()`);
    if (stale === 'mode') await click('[data-action="layout"]');
  }
  // showModal 故障回收，恢復後真 UI 仍可重開。
  await selectSlide('portable'); await evaluate(`window.__s15Show=HTMLDialogElement.prototype.showModal;HTMLDialogElement.prototype.showModal=function(){throw Error('S15 showModal fixture')}`); await click(button); assert.deepEqual(await spec(), expected); assert.equal(await evaluate(`document.querySelector('${button}').disabled`), false); await evaluate('HTMLDialogElement.prototype.showModal=window.__s15Show'); await open(); await click(cancel); record('showModal throw 後重開', 'synthetic fault＋real pointer');
  await open(); await type('只插入一次'); await evaluate(`(()=>{const r=document.querySelector('.slide[data-slide-id="portable"]'),append=r.append;r.append=function(n){document.querySelector('${submit}').click();return append.call(this,n)};window.__s15RestoreAppend=()=>{r.append=append};return true})()`); await inserted('只插入一次'); await evaluate('window.__s15RestoreAppend()'); record('同步重入 submit 不 doubleinsert', 'synthetic append 重入＋real pointer submit');
  // S6/S10 CDP chooser，cancel 是 fixture；不得把 programmatic click 說成 UI。
  let chooser = null, chooserCount = 0; cdp.on('Page.fileChooserOpened', event => { chooser = event; chooserCount++; }); await cdp.send('Page.setInterceptFileChooserDialog', { enabled: true });
  try {
    for (const control of ['insert-image', 'replace-selected-image']) {
      if (control === 'replace-selected-image') await click(selector('asset-second'));
      chooser = null; await click(`[data-action="${control}"]`); for (let n = 0; !chooser && n < 100; n++) await new Promise(ok => setTimeout(ok, 25)); assert.ok(chooser?.backendNodeId, '真 chooser 必須發生；禁止 API fallback');
      const count = chooserCount; assert.equal(await evaluate(`document.querySelector('${button}').disabled`), true); await click(button); assert.equal(await evaluate(`document.querySelector('${dialog}').open`), false);
      const css = control === 'insert-image' ? '#pptskill-insert-image-input' : '#pptskill-selected-image-input'; await evaluate(`document.querySelector('${css}').dispatchEvent(new Event('cancel'))`); await open(); await click(`[data-action="${control}"]`); assert.equal(chooserCount, count); assert.equal(await evaluate(`document.querySelector('${dialog}').open`), true); await click(cancel); assert.deepEqual(await spec(), expected); record('chooser 互斥 ' + control, 'real pointer／CDP chooser＋synthetic cancel');
    }
  } finally { await cdp.send('Page.setInterceptFileChooserDialog', { enabled: false }); }
  await open(); await type('S15_UNCOMMITTED_EXPORT_DRAFT'); const exported = await assertExport('insert-text-ui-draft', expected);
  assert.equal(await evaluate(`(()=>{const html=window.PPTSKILLEditor.exportHtml(),d=new DOMParser().parseFromString(html,'text/html');return !html.includes('S15_UNCOMMITTED_EXPORT_DRAFT')&&!d.querySelector('[data-insert-text-dialog],[data-pptskill-insert-text-toolbar],[contenteditable]')&&document.querySelector('${dialog}').open})()`), true); record('export draft 無洩漏／不暗中提交');
  await cdp.send('Network.emulateNetworkConditions', { offline: true, latency: 0, downloadThroughput: 0, uploadThroughput: 0 });
  try {
    await navigate(exported); await click('[data-action="layout"]'); assert.equal(await evaluate(`document.querySelectorAll('${dialog}').length`), 1); await open(); await click(cancel); await open(); await type('offline UI'); const id = await inserted('offline UI');
    await evaluate(`window.PPTSKILLEditor.executeOperation({operation:'edit-text',target:{slideId:'portable',elementId:'component-${id}'},value:'offline S14'})`); expected.slides[0].content.components.find(c => c.id === id).text = 'offline S14'; assert.deepEqual(await spec(), expected); record('offline UI insert/cancel 與 S14 API edit', 'real UI＋明列 S14 API');
    await click(selector(id)); const p = await position(selector(id), 0.1, 0.1), scale = await evaluate('document.querySelector(".slide").getBoundingClientRect().width/1600'); await mouse('mouseMoved', p); await mouse('mousePressed', p, true); for (let n = 1; n <= 6; n++) await mouse('mouseMoved', { x: p.x + 24 * scale * n / 6, y: p.y + 16 * scale * n / 6 }, true); await mouse('mouseReleased', { x: p.x + 24 * scale, y: p.y + 16 * scale }); await settle(); expected.slides[0].composition.geometryOverrides[id] = { x: 584, y: 304, width: 480, height: 320 }; assert.deepEqual(await spec(), expected); record('offline 新文字真 pointer move');
    // 0.8 scale 下使用整數 screen-pixel 起點與位移，避免把 CDP 小數像素取整誤算為產品尺寸。
    const rawHandle = await position('.moveable-se'), handle = { x: Math.round(rawHandle.x), y: Math.round(rawHandle.y) }, delta = 40 * scale;
    assert.equal(Number.isInteger(delta), true);
    await evaluate(`window.__s15ResizePointer=[];for(const type of ['pointerdown','pointerup'])window.addEventListener(type,e=>window.__s15ResizePointer.push({type,x:e.clientX,y:e.clientY,trusted:e.isTrusted}),true)`);
    await mouse('mouseMoved', handle); await mouse('mousePressed', handle, true);
    for (let n = 1; n <= 8; n++) await mouse('mouseMoved', { x: handle.x + delta * n / 8, y: handle.y + delta * n / 8 }, true);
    await mouse('mouseReleased', { x: handle.x + delta, y: handle.y + delta }); await settle();
    const pointerEvidence = await evaluate('window.__s15ResizePointer');
    assert.deepEqual(pointerEvidence.map(e=>e.type), ['pointerdown','pointerup']); assert.ok(pointerEvidence.every(e=>e.trusted));
    assert.equal(pointerEvidence[1].x-pointerEvidence[0].x,delta); assert.equal(pointerEvidence[1].y-pointerEvidence[0].y,delta);
    expected.slides[0].composition.geometryOverrides[id] = { x: 584, y: 304, width: 520, height: 360 };
    assert.deepEqual(await spec(), expected); record('offline 新文字真 pointer resize', 'integer screen-pixel real pointer', { pointerEvidence, scale, delta });
    await click('[data-action="layout"]'); await click('[data-action="layout"]'); assert.equal(await evaluate(`document.querySelectorAll('${dialog}').length`), 1); await assertExport('insert-text-ui-offline', expected); record('offline remount／再次匯出');
  } finally { await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: 0, downloadThroughput: -1, uploadThroughput: -1 }); }
}
