import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { assetReplacementPng } from './edx-wp2-s4-browser-cases.mjs';

// 主機 attach harness 執行真 API／pointer；DOM／optimizer 故障注入明確標記為 synthetic。
export async function runDeleteElementBrowserCases({ cdp, evaluate, navigate, sourcePath, outputDir, width, run, click, position, mouse, settle, assertExport }) {
  const root = '.slide[data-slide-id="portable"]';
  const selector = id => root + ' [data-pptskill-element-id="component-' + id + '"]';
  const textSelector = selector('s18-text'), imageSelector = selector('s18-image');
  const deletion = (id = 's18-text', slideId = 'portable') => ({ operation: 'delete-element', target: { slideId, elementId: 'component-' + id }, value: { confirm: true } });
  const insertion = (id, type = 'text') => ({ operation: 'insert-element', target: { slideId: 'portable' }, value: {
    component: type === 'text' ? { id, type, text: 'S18 獨立文字 😀' } : { id, type, dataUri: assetReplacementPng, alt: 'S18 獨立圖片', fit: 'contain' },
    geometry: type === 'text' ? { x: 120, y: 360, width: 480, height: 200 } : { x: 1120, y: 620, width: 180, height: 140 },
  } });
  const spec = () => evaluate('window.PPTSKILLEditor.getDeckSpec()');
  const execute = request => evaluate(`window.PPTSKILLEditor.executeOperation(${JSON.stringify(request)})`);
  const record = (claim, kind = '真 host API／CDP pointer') => run.checks.push({ wp2s18: claim, kind });
  const screenshot = async label => {
    await settle();
    const shot = await cdp.send('Page.captureScreenshot', { format: 'png' });
    const bytes = Buffer.from(shot.data, 'base64'), path = resolve(outputDir, `${width}-s18-${label}.png`);
    await writeFile(path, bytes);
    run.artifacts.push({ label: 's18-' + label, path, bytes: bytes.length, sha256: createHash('sha256').update(bytes).digest('hex') });
  };
  const removeExpected = id => {
    const slide = expected.slides.find(s => s.id === 'portable');
    slide.content.components = slide.content.components.filter(c => c.id !== id);
    if (slide.composition.geometryOverrides) {
      delete slide.composition.geometryOverrides[id];
      if (!Object.keys(slide.composition.geometryOverrides).length) delete slide.composition.geometryOverrides;
    }
  };
  const assertSelectionCleared = async () => {
    assert.deepEqual(await evaluate('window.PPTSKILLEditor.layout.getSelectionState().selected'), []);
    assert.equal(await evaluate('window.PPTSKILLEditor.layout.getState().gesturing'), false);
    assert.equal(await evaluate('document.querySelector("[data-action=edit-selected-text]").hidden'), true);
  };
  await navigate(sourcePath);
  await evaluate('window.__s18Survivors=[...document.querySelectorAll(".slide [data-edit-target]")].map(node=>({node,target:node.dataset.editTarget}));');
  await click('[data-action="layout"]');
  await execute(insertion('s18-text')); await execute(insertion('s18-image', 'image'));
  let expected = await spec();
  await evaluate(`document.querySelector(${JSON.stringify(imageSelector + ' img')}).decode()`);
  await screenshot('before');
  record('S13 text 與 S8 image 經既有 insert-element 建立獨立元件');

  const refusal = await evaluate(`(()=>{
    const api=window.PPTSKILLEditor,request=${JSON.stringify(deletion())},before=JSON.stringify(api.getDeckSpec()),dom=document.querySelector('.deck').outerHTML;
    let getters=0,rejected=0;
    const cases=[null,{}, {...request,value:{}}, ...[false,1,'true',null].map(confirm=>({...request,value:{confirm}})),
      ...['role-title','role-subtitle',...api.getDeckSpec().slides[0].content.keyPointIds.map(id=>'point-'+id),'component-portable-quote','missing'].map(elementId=>({...request,target:{slideId:'portable',elementId}})),
      {...request,target:{...request.target,slideId:'asset-other'}}];
    for(const part of ['request','target','value']){
      for(const fault of ['getter','hidden','symbol','prototype']){
        const r=structuredClone(request),object=part==='request'?r:r[part],key=Object.keys(object)[0];
        if(fault==='getter')Object.defineProperty(object,key,{get(){getters++;throw Error('getter');}});
        if(fault==='hidden')Object.defineProperty(object,'extra',{value:1});
        if(fault==='symbol')object[Symbol('extra')]=1;
        if(fault==='prototype')Object.setPrototypeOf(object,{inherited:true});
        cases.push(r);
      }
    }
    for(const r of cases){try{api.executeOperation(r);}catch{rejected++;}}
    return{total:cases.length,rejected,getters,spec:before===JSON.stringify(api.getDeckSpec()),dom:dom===document.querySelector('.deck').outerHTML};
  })()`);
  assert.equal(refusal.rejected, refusal.total); assert.equal(refusal.getters, 0); assert.equal(refusal.spec, true); assert.equal(refusal.dom, true);
  record('confirm、exact records/getter0、role/keyPoint、錯頁與 slots 引用拒絕');

  const short = 'a'.repeat(61) + '-5143e6d5', long = 'a'.repeat(80);
  await execute(insertion(short)); await execute(insertion(long));
  const collision = await evaluate(`(()=>{
    const api=window.PPTSKILLEditor,before=JSON.stringify(api.getDeckSpec()),node=[...document.querySelectorAll('[data-edit-target]')].find(n=>n.dataset.editTarget==='slides.portable.content.components.'+${JSON.stringify(short)});
    let error='';try{api.executeOperation({operation:'delete-element',target:{slideId:'portable',elementId:node.dataset.pptskillElementId},value:{confirm:true}});}catch(e){error=e.message;}
    return{error,unchanged:before===JSON.stringify(api.getDeckSpec())};
  })()`);
  assert.match(collision.error, /identity|識別/); assert.equal(collision.unchanged, true);
  for (const id of [long, short]) await evaluate(`(()=>{const node=[...document.querySelectorAll('[data-edit-target]')].find(n=>n.dataset.editTarget==='slides.portable.content.components.'+${JSON.stringify(id)});return window.PPTSKILLEditor.executeOperation({operation:'delete-element',target:{slideId:'portable',elementId:node.dataset.pptskillElementId},value:{confirm:true}})})()`);
  assert.deepEqual(await spec(), expected); record('真 collision identities 拒絕 remap，按穩定順序清理');

  await click(textSelector);
  for (const fault of ['duplicate', 'detached', 'wrong-target', 'stale-text', 'remove-before', 'remove-after']) {
    const result = await evaluate(`(()=>{
      const api=window.PPTSKILLEditor,node=document.querySelector(${JSON.stringify(textSelector)}),parent=node.parentNode,next=node.nextSibling,remove=node.remove;
      const text=node.textContent,target=node.dataset.editTarget,fault=${JSON.stringify(fault)};let duplicate;
      if(fault==='duplicate'){duplicate=node.cloneNode(true);parent.append(duplicate);}
      if(fault==='detached')node.remove();
      if(fault==='wrong-target')node.dataset.editTarget+='-wrong';
      if(fault==='stale-text')node.textContent='STALE_S18';
      if(fault.startsWith('remove-'))node.remove=()=>{if(fault==='remove-after')remove.call(node);throw Error('synthetic-'+fault);};
      const before=JSON.stringify(api.getDeckSpec()),dom=document.querySelector('.deck').outerHTML,selection=JSON.stringify(api.layout.getSelectionState());
      let error='';try{api.executeOperation(${JSON.stringify(deletion())});}catch(e){error=e.message;}
      const result={error,spec:before===JSON.stringify(api.getDeckSpec()),dom:dom===document.querySelector('.deck').outerHTML,selection:selection===JSON.stringify(api.layout.getSelectionState())};
      delete node.remove;if(duplicate)duplicate.remove();if(fault==='detached')parent.insertBefore(node,next);
      if(fault==='wrong-target')node.dataset.editTarget=target;if(fault==='stale-text')node.textContent=text;
      return result;
    })()`);
    assert.match(result.error, /DOM|失配|connected|synthetic/); assert.equal(result.spec, true); assert.equal(result.dom, true); assert.equal(result.selection, true);
  }
  record('缺失、duplicate、stale identity/content、removal before/after throw 原位 rollback', 'synthetic DOM fault；真 host API');

  const reentry = await evaluate(`(()=>{
    const api=window.PPTSKILLEditor,node=document.querySelector(${JSON.stringify(textSelector)}),remove=node.remove,errors=[];
    const before=JSON.stringify(api.getDeckSpec()),dom=document.querySelector('.deck').outerHTML;
    node.remove=()=>{
      for(const action of [()=>api.applyLocalPatch({slideId:'portable',region:'content.components.s18-image',value:{alt:'S18_REENTRY_PROBE'}}),()=>api.prepareExport(),()=>api.exportHtml(),()=>api.getSizeReport()]){
        try{action();errors.push('accepted');}catch(e){errors.push(e.message);}
      }
      remove.call(node);throw Error('synthetic-reentry-rollback');
    };
    let outer='';try{api.executeOperation(${JSON.stringify(deletion())});}catch(e){outer=e.message;}finally{delete node.remove;}
    return{errors,outer,spec:before===JSON.stringify(api.getDeckSpec()),dom:dom===document.querySelector('.deck').outerHTML};
  })()`);
  assert.equal(reentry.errors.length, 4); reentry.errors.forEach(error => assert.match(error, /進行中|重入/));
  assert.match(reentry.outer, /synthetic-reentry-rollback/); assert.equal(reentry.spec, true); assert.equal(reentry.dom, true);
  record('patch/export 重入被拒，外層 after-effect throw 保住 DOM/canonical', 'synthetic remove hook；真 public APIs');

  await click(textSelector); await click('[data-action="edit-selected-text"]');
  assert.equal(await evaluate('document.querySelector("[data-insert-text-dialog]").open'), true);
  await click('[data-insert-text-value]'); await cdp.send('Input.insertText', { text: 'DRAFT_S18_NEVER_EXPORT' });
  await execute(deletion()); removeExpected('s18-text'); assert.deepEqual(await spec(), expected);
  assert.equal(await evaluate('document.querySelector("[data-insert-text-dialog]").open'), false);
  assert.equal(await evaluate('document.querySelector("[data-insert-text-value]").value'), '');
  await assertSelectionCleared();
  await evaluate('document.querySelector("[data-action=submit-insert-text]").click()');
  assert.deepEqual(await spec(), expected);
  assert.equal(await evaluate('window.PPTSKILLEditor.exportHtml().includes("DRAFT_S18_NEVER_EXPORT")'), false);
  record('真 click 開 S16 dialog，刪除清 draft/selection；late submit 不復活', '真 CDP click/Input.insertText；late submit 為 synthetic');

  for (const snap of [false, true]) {
    const pressed = await evaluate('document.querySelector("[data-action=snap-layout]").getAttribute("aria-pressed")');
    if (pressed !== String(snap)) await click('[data-action="snap-layout"]');
    await execute(insertion('s18-text')); expected = await spec(); await click(textSelector);
    const start = await position(textSelector, 0.12, 0.5), end = { x: start.x + 36 * width / 1600, y: start.y + 20 * width / 1600 };
    await mouse('mouseMoved', start); await mouse('mousePressed', start, true);
    for (let i = 1; i <= 6; i++) await mouse('mouseMoved', { x: start.x + (end.x - start.x) * i / 6, y: start.y + (end.y - start.y) * i / 6 }, true);
    await settle(); assert.equal(await evaluate('window.PPTSKILLEditor.layout.getState().gesturing'), true);
    assert.deepEqual(await spec(), expected);
    try { await execute(deletion()); } finally { await mouse('mouseReleased', end); await settle(); }
    removeExpected('s18-text'); assert.deepEqual(await spec(), expected); await assertSelectionCleared();
    record(`snap=${snap} 刪除正在 drag 的 target，release 不提交 preview geometry`);
  }

  for (const outcome of ['resolve', 'reject']) {
    const result = await evaluate(`(async()=>{
      const api=window.PPTSKILLEditor,assets=window.PPTSKILLAssets,original=assets.optimizeFile;let release,reject;
      const gate=new Promise((ok,fail)=>{release=ok;reject=fail;});assets.optimizeFile=async file=>{await gate;return original(file);};
      const before=JSON.stringify(api.getDeckSpec()),bytes=Uint8Array.from(atob(${JSON.stringify(assetReplacementPng.split(',')[1])}),c=>c.charCodeAt(0));
      try{
        const pending=api.replaceImageFile(new File([bytes],'s18.png',{type:'image/png'}),${JSON.stringify(deletion('s18-image').target)}).then(value=>({value}),error=>({error:error.message}));
        let error='';try{api.executeOperation(${JSON.stringify(deletion('s18-image'))});}catch(e){error=e.message;}
        const unchanged=before===JSON.stringify(api.getDeckSpec());
        if(${JSON.stringify(outcome)}==='reject')reject(Error('synthetic-optimizer-rejection'));else release();
        return{error,unchanged,settled:await pending,spec:api.getDeckSpec()};
      }finally{assets.optimizeFile=original;}
    })()`);
    assert.match(result.error, /進行中/); assert.equal(result.unchanged, true);
    if (outcome === 'reject') assert.match(result.settled.error, /synthetic-optimizer-rejection/);
    else expected.slides[0].content.components.find(c => c.id === 's18-image').dataUri = result.settled.value.dataUri;
    assert.deepEqual(result.spec, expected);
  }
  record('deferred 真 optimizer pending 拒絕 delete，resolve/reject 釋放 ownership', 'synthetic Promise gate；真 File/optimizer/API');
  await click(imageSelector); await execute(deletion('s18-image')); removeExpected('s18-image');
  assert.deepEqual(await spec(), expected); await assertSelectionCleared();
  assert.equal(await evaluate('document.querySelector("[data-action=replace-selected-image]").hidden'), true);
  assert.equal(await evaluate('window.__s18Survivors.every(({node,target})=>node.isConnected&&[...document.querySelectorAll("[data-edit-target]")].find(n=>n.dataset.editTarget===target)===node)'), true);
  await screenshot('after'); record('刪 image 後 toolbar 清理，原有其他 slides/components 保持 node object identity');
  const exported = await assertExport('s18-delete-export', expected);
  await cdp.send('Network.emulateNetworkConditions', { offline: true, latency: 0, downloadThroughput: 0, uploadThroughput: 0 });
  try {
    await navigate(exported); assert.deepEqual(await spec(), expected);
    assert.equal(await evaluate(`document.querySelectorAll(${JSON.stringify(textSelector + ',' + imageSelector)}).length`), 0);
    await execute(insertion('s18-text')); await execute(insertion('s18-image', 'image'));
    await execute({ operation: 'edit-text', target: deletion().target, value: '離線重新插入與編輯' });
    await execute({ operation: 'replace-asset', target: deletion('s18-image').target, value: { dataUri: assetReplacementPng, alt: '離線圖片', fit: 'cover' } });
    await execute(deletion()); await execute(deletion('s18-image'));
    assert.deepEqual(await spec(), expected); await assertExport('s18-offline-redelete', expected);
  } finally {
    await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: 0, downloadThroughput: -1, uploadThroughput: -1 });
  }
  record('fresh export/offline reopen 再插入、text/image 編輯、再次刪除；空缺 ID 為新 operation');
}
