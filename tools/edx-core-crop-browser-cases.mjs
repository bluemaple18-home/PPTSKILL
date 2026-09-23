import assert from 'node:assert/strict';
import { deflateSync } from 'node:zlib';
import { writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { createHash } from 'node:crypto';
import { extractDeckSpec } from '../runtime/deck-spec.js';

// 六色、實際軸線與 bitmap AXIS 字樣；不以 1×1 圖冒充 crop 像素。
export function cropFixturePng(width=240,height=160,variant=0){
 const colors=[[229,57,53],[67,160,71],[30,136,229],[253,216,53],[142,36,170],[0,172,193]];
 const raw=Buffer.alloc((width*3+1)*height);
 const glyphs=['01110/10001/10001/11111/10001/10001/10001','10001/01010/00100/00100/00100/01010/10001','11111/00100/00100/00100/00100/00100/11111','01111/10000/10000/01110/00001/00001/11110'].map(s=>s.split('/'));
 for(let y=0;y<height;y++)for(let x=0;x<width;x++){
  let color=colors[(Math.floor(y/(height/2))*3+Math.floor(x/(width/3))+variant)%6];
  if(x<4||y>=height-4)color=[0,0,0];
  const gx=Math.floor((x-12)/2),gy=Math.floor((y-(height-24))/2),letter=Math.floor(gx/6),column=gx%6;
  if(gx>=0&&gy>=0&&gy<7&&letter<4&&column<5&&glyphs[letter][gy][column]==='1')color=[0,0,0];
  raw.set(color,y*(width*3+1)+1+x*3);
 }
 const crc=b=>{let c=0xffffffff;for(const v of b){c^=v;for(let i=0;i<8;i++)c=(c>>>1)^((c&1)?0xedb88320:0);}return(c^0xffffffff)>>>0;};
 const chunk=(name,data)=>{const body=Buffer.concat([Buffer.from(name),data]),out=Buffer.alloc(data.length+12);out.writeUInt32BE(data.length);body.copy(out,4);out.writeUInt32BE(crc(body),out.length-4);return out;};
 const header=Buffer.alloc(13);header.writeUInt32BE(width);header.writeUInt32BE(height,4);header[8]=8;header[9]=2;
 return 'data:image/png;base64,'+Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),chunk('IHDR',header),chunk('IDAT',deflateSync(raw)),chunk('IEND',Buffer.alloc(0))]).toString('base64');
}
export function addCropFixture(spec){
 const slide=spec.slides.find(s=>s.id==='portable');
 slide.content.components.push({id:'crop-landscape',type:'image',alt:'六色 AXIS 橫圖',dataUri:cropFixturePng(),fit:'contain'},{id:'crop-portrait',type:'image',alt:'六色 AXIS 直圖',dataUri:cropFixturePng(120,240),fit:'cover'});
 // 避開 base pointer 位置，亦與橫圖最大 resize 測試範圍分離。
 slide.composition.geometryOverrides={...slide.composition.geometryOverrides,'crop-landscape':{x:120,y:220,width:600,height:280},'crop-portrait':{x:1260,y:100,width:250,height:400}};
 const other=structuredClone(slide);other.id='crop-other';spec.slides.push(other);
}

export async function runCropBrowserCases({cdp,evaluate,navigate,sourcePath,outputDir,width,run,click:baseClick,position,mouse,settle,assertExport}){
 const click=async selector=>{
  if(selector.startsWith('[data-crop')||selector.includes('confirm-crop')||selector.includes('cancel-crop')||selector.includes('reset-image-crop')){
   await evaluate(`document.querySelector(${JSON.stringify(selector)})?.scrollIntoView({block:'nearest'})`);await settle();
  }
  await baseClick(selector);
 };
 const selector=id=>'.slide[data-slide-id="portable"] [data-pptskill-element-id="component-'+id+'"]';
 const target=id=>({slideId:'portable',elementId:'component-'+id});
 const spec=()=>evaluate('window.PPTSKILLEditor.getDeckSpec()');
 const execute=r=>evaluate('window.PPTSKILLEditor.executeOperation('+JSON.stringify(r)+')');
 const rect={x:.2,y:.15,width:.5,height:.6},protectedRect={x:.25,y:.2,width:.2,height:.2};
 const crop=(id='crop-landscape',classification='evidence')=>({operation:'crop-image',target:target(id),value:{...rect,classification,...(classification==='evidence'?{protectedRect}:{}),confirm:true}});
 const pixels=async(id,label,expectedCrop=null,fit='contain')=>{
  const css=selector(id);
  // 背景只是 oracle 的固定底色，之後移除；不改 source、geometry 或產品 projector。
  await evaluate(`(async()=>{const f=document.querySelector(${JSON.stringify(css)});f.style.setProperty('background-color','rgb(240,240,240)');await f.querySelector('img').decode();})()`);await settle();
  const shot=await cdp.send('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});
  const path=resolve(outputDir,width+'-crop-'+label+'.png'),bytes=Buffer.from(shot.data,'base64');await writeFile(path,bytes);
  let result;
  try{result=await evaluate(`(async()=>{
   const f=document.querySelector(${JSON.stringify(css)}),img=f.querySelector('img'),c=window.PPTSKILLEditor.getDeckSpec().slides[0].content.components.find(c=>c.id===${JSON.stringify(id)});
   const source=new Image();source.src=c.dataUri;await source.decode();const sc=document.createElement('canvas');sc.width=source.naturalWidth;sc.height=source.naturalHeight;const sx=sc.getContext('2d');sx.drawImage(source,0,0);
   const screen=new Image();screen.src='data:image/png;base64,${shot.data}';await screen.decode();const canvas=document.createElement('canvas');canvas.width=screen.naturalWidth;canvas.height=screen.naturalHeight;const ctx=canvas.getContext('2d');ctx.drawImage(screen,0,0);
   const r=f.getBoundingClientRect(),W=sc.width,H=sc.height,crop=${JSON.stringify(expectedCrop||{x:0,y:0,width:1,height:1})},fit=${JSON.stringify(fit)},cw=W*crop.width,ch=H*crop.height,k=Math[fit==='cover'?'max':'min'](r.width/cw,r.height/ch),ox=(r.width-cw*k)/2,oy=(r.height-ch*k)/2,checks=[],excluded=[];
   for(const u of [.04,.16,.29,.43,.58,.73,.88,.96])for(const v of [.06,.19,.35,.51,.69,.84,.95]){
    const px=Math.floor(r.left+u*r.width),py=Math.floor(r.top+v*r.height);if(px<0||py<0||px>=canvas.width||py>=canvas.height){excluded.push('viewport');continue;}
    const x=(px+.5-r.left-ox)/k+crop.x*W,y=(py+.5-r.top-oy)/k+crop.y*H,inside=x>=crop.x*W&&x<(crop.x+crop.width)*W&&y>=crop.y*H&&y<(crop.y+crop.height)*H;
    let expected=[240,240,240,255];if(inside){expected=Array.from(sx.getImageData(Math.floor(x),Math.floor(y),1,1).data);let uniform=true;for(let dx=-2;dx<=2;dx++)for(let dy=-2;dy<=2;dy++){const a=sx.getImageData(Math.floor(x)+dx,Math.floor(y)+dy,1,1).data;if(a.some((n,i)=>n!==expected[i]))uniform=false;}if(!uniform){excluded.push('source-edge-or-label');continue;}}
    else if(Math.min(Math.abs(x-crop.x*W),Math.abs(x-(crop.x+crop.width)*W),Math.abs(y-crop.y*H),Math.abs(y-(crop.y+crop.height)*H))<3){excluded.push('clip-edge');continue;}
    const actual=Array.from(ctx.getImageData(px,py,1,1).data);checks.push({px,py,inside,expected,actual,pass:actual.every((n,i)=>Math.abs(n-expected[i])<=4)});
   }
   return{checks,excluded,sourceUnchanged:img.getAttribute('src')===c.dataUri,natural:[img.naturalWidth,img.naturalHeight],frame:[r.width,r.height]};
  })()`);}finally{await evaluate(`document.querySelector(${JSON.stringify(css)}).style.removeProperty('background-color')`);}
  assert.ok(result.sourceUnchanged);assert.ok(result.checks.length>=15,JSON.stringify(result));assert.ok(result.checks.every(c=>c.pass),JSON.stringify({label,...result}));
  run.artifacts.push({label:'crop-'+label,path,bytes:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex')});run.checks.push({crop:label,kind:'真 CDP screenshot pixel oracle',...result});
 };
 const field=async(name,value)=>evaluate(`(()=>{const e=document.querySelector('[data-crop-field="'+${JSON.stringify(name)}+'"]');e.value=${JSON.stringify(String(value))};e.dispatchEvent(new Event('input',{bubbles:true}));})()`);
 const classification=async value=>evaluate(`(()=>{const e=document.querySelector('[data-crop-classification]');e.value=${JSON.stringify(value)};e.dispatchEvent(new Event('input',{bubbles:true}));})()`);
 const open=async(id='crop-landscape')=>{await click(selector(id));await click('[data-action="crop-selected-image"]');assert.equal(await evaluate('document.querySelector("[data-crop-dialog]").open'),true);await evaluate(`Promise.all([...document.querySelectorAll('[data-crop-dialog] img')].map(i=>i.decode()))`);await settle();};
 await navigate(sourcePath);let original=await spec();
 await pixels('crop-landscape','original');
 await click('[data-action="layout"]');await open();
 await classification('decorative');const before=await spec();
 // range 真 pointer；另一欄以真鍵盤 number 控制，最後 confirm 仍走產品 UI。
 await click('[data-crop-range="rect-width"]');
 await click('[data-crop-field="rect-height"]');await cdp.send('Input.dispatchKeyEvent',{type:'keyDown',key:'a',code:'KeyA',modifiers:2});await cdp.send('Input.dispatchKeyEvent',{type:'keyUp',key:'a',code:'KeyA',modifiers:2});await cdp.send('Input.insertText',{text:'0.7'});
 assert.deepEqual(await spec(),before);await click('[data-action="cancel-crop"]');assert.deepEqual(await spec(),before);
 await open();await cdp.send('Input.dispatchKeyEvent',{type:'keyDown',key:'Escape',code:'Escape',windowsVirtualKeyCode:27});await cdp.send('Input.dispatchKeyEvent',{type:'keyUp',key:'Escape',code:'Escape',windowsVirtualKeyCode:27});assert.equal(await evaluate('document.querySelector("[data-crop-dialog]").open'),false);
 await open();await classification('evidence');for(const [k,v]of Object.entries(rect))await field('rect-'+k,v);
 await click('[data-crop-confirm]');assert.equal(await evaluate('document.querySelector("[data-action=confirm-crop]").disabled'),true);assert.deepEqual(await spec(),before);
 for(const [k,v]of Object.entries(protectedRect))await field('protected-'+k,v);await click('[data-crop-confirm]');await click('[data-action="confirm-crop"]');
 let active=await spec();assert.deepEqual(active.slides[0].content.components.find(c=>c.id==='crop-landscape').crop,rect);await pixels('crop-landscape','ui-confirm',rect);
 run.checks.push({crop:'range pointer／number keyboard／人工確認／cancel／Escape／保護範圍拒絕',kind:'產品 UI，另以 API 設定數值與用途'});
 // 失敗的 CSS candidate 不得由後續 ResizeObserver 回放。
 for(const operation of ['crop-image','reset-image-crop'])for(const timing of ['before','after']){
  const failed=await evaluate(`(()=>{const api=window.PPTSKILLEditor,img=document.querySelector(${JSON.stringify(selector('crop-landscape'))}+' img'),frame=img.parentElement,before=JSON.stringify(api.getDeckSpec()),attrs=img.getAttribute('style'),frameStyle=frame.getAttribute('style'),setter=CSSStyleDeclaration.prototype.setProperty;let once=true,rejected=false;CSSStyleDeclaration.prototype.setProperty=function(k,v,p){if(this===img.style&&once){once=false;if(${JSON.stringify(timing)}==='after')setter.call(this,k,v,p);throw Error('crop style failure');}return setter.call(this,k,v,p);};try{try{api.executeOperation({operation:${JSON.stringify(operation)},target:${JSON.stringify(target('crop-landscape'))},value:${JSON.stringify(operation==='crop-image'?{...rect,x:.1,width:.6,classification:'evidence',protectedRect,confirm:true}:{confirm:true})}})}catch{rejected=true}}finally{CSSStyleDeclaration.prototype.setProperty=setter;}return{rejected,same:before===JSON.stringify(api.getDeckSpec()),dom:attrs===img.getAttribute('style')&&frameStyle===frame.getAttribute('style')};})()`);
  assert.deepEqual(failed,{rejected:true,same:true,dom:true});
  await execute({operation:'resize-element',target:target('crop-landscape'),value:{width:520,height:320}});
  await pixels('crop-landscape','rollback-'+operation+'-'+timing,rect);
  await execute({operation:'resize-element',target:target('crop-landscape'),value:{width:600,height:280}});
 }
 // 保留來源／不同 frame 比例／decorative cover，純 ResizeObserver 重投影。
 await execute(crop('crop-portrait','decorative'));await pixels('crop-portrait','portrait-cover',rect,'cover');
 await execute({operation:'resize-element',target:target('crop-landscape'),value:{width:400,height:400}});await pixels('crop-landscape','square-frame',rect);
 await execute({operation:'resize-element',target:target('crop-landscape'),value:{width:600,height:280}});
 const exported=await assertExport('crop-active',await spec());
 await cdp.send('Network.emulateNetworkConditions',{offline:true,latency:0,downloadThroughput:0,uploadThroughput:0});
 try{await navigate(exported);await pixels('crop-landscape','offline-reopen',rect);}finally{await cdp.send('Network.emulateNetworkConditions',{offline:false,latency:0,downloadThroughput:-1,uploadThroughput:-1});}
 const replacement=cropFixturePng(240,160,1);
 await execute({operation:'replace-asset',target:target('crop-landscape'),value:{dataUri:replacement}});let pending=await spec();assert.deepEqual(pending.slides[0].content.components.find(c=>c.id==='crop-landscape').crop,rect);
 await pixels('crop-landscape','same-size-replace-pending');assert.match(await evaluate('document.querySelector("[data-editor-status]").textContent'),/裁切待重新確認/);
 const pendingExport=await assertExport('crop-pending',pending);await navigate(pendingExport);await pixels('crop-landscape','pending-reopen');
 await execute(crop());await pixels('crop-landscape','reconfirmed',rect);
 await evaluate(`window.PPTSKILLEditor.applyLocalPatch({slideId:'portable',region:'content.components.crop-landscape',value:{crop:{x:.1,y:.1,width:.8,height:.8}}})`);await pixels('crop-landscape','raw-crop-pending');
 await execute(crop());await click('[data-action="layout"]');await open();await click('[data-action="reset-image-crop"]');await pixels('crop-landscape','reset');
 const resetSpec=await spec(),resetComponent=resetSpec.slides[0].content.components.find(c=>c.id==='crop-landscape');assert.equal(resetComponent.crop,undefined);assert.equal(resetComponent.imageSafety.classification,'evidence');
 await click(selector('crop-landscape'));await click('[data-image-fit="cover"]');assert.deepEqual(await spec(),resetSpec);
 const refused=await evaluate(`(()=>{const api=window.PPTSKILLEditor,before=JSON.stringify(api.getDeckSpec());let rejected=0;for(const f of [()=>api.executeOperation({operation:'replace-asset',target:${JSON.stringify(target('crop-landscape'))},value:{dataUri:${JSON.stringify(replacement)},fit:'cover'}}),()=>api.applyLocalPatch({slideId:'portable',region:'content.components.crop-landscape',value:{fit:'cover'}})])try{f()}catch{rejected++}return{rejected,same:before===JSON.stringify(api.getDeckSpec())}})()`);assert.deepEqual(refused,{rejected:2,same:true});
 await open();await evaluate(`document.querySelector('.slide[data-slide-id="crop-other"]').dispatchEvent(new MouseEvent('click',{bubbles:true}))`);assert.equal(await evaluate('document.querySelector("[data-crop-dialog]").open'),false);
 // S18：真 decode promise 延遲、刪除 target 後釋放，不允許晚到 UI 復活。
 await click(selector('crop-landscape'));await evaluate(`(()=>{const i=document.querySelector('[data-crop-original]');const original=i.decode.bind(i);i.decode=async()=>{await original();await new Promise(ok=>window.__cropReleaseDecode=ok);};})()`);
 await click('[data-action="crop-selected-image"]');await execute({operation:'delete-element',target:target('crop-landscape'),value:{confirm:true}});const deleted=await spec();
 await evaluate(`(()=>{window.__cropReleaseDecode?.();document.querySelector('[data-action="confirm-crop"]').dispatchEvent(new MouseEvent('click',{bubbles:true}));})()`);await settle();assert.deepEqual(await spec(),deleted);assert.equal(await evaluate('document.querySelector("[data-crop-dialog]").open'),false);
 await assertExport('crop-after-delete',deleted);
 run.checks.push({crop:'reset保Evidence／S7+replace+patch cover拒絕／換圖與raw pending／S18晚到提交',kind:'產品 API＋UI＋真 decoder，僅PNG格式'});
 assert.ok(original.slides[0].content.components.some(c=>c.dataUri===cropFixturePng()));
}
