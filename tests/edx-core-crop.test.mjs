import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';
import { imageCrop, createImageCropContract, createCropProjection } from '../runtime/image-crop.js';
import { buildCropHashRuntime } from '../runtime/crop-hash-vendor.js';
import { createDeckEditor, OPERATION_DESCRIPTORS } from '../runtime/deck-editor.js';
import { mountedEditor, fixture } from '../tools/edx-wp1-s4-perf-mounted.mjs';
import { extractDeckSpec, sanitizeDeckSpec } from '../runtime/deck-spec.js';
import { renderFullDeck } from '../runtime/full-deck-renderer.js';
const target={slideId:'portable',elementId:'component-perf-image'};
const rect={x:.2,y:.15,width:.5,height:.6};
const protectedRect={x:.25,y:.2,width:.2,height:.2};
const value={...rect,classification:'evidence',protectedRect,confirm:true};
const request=(v=value)=>({operation:'crop-image',target,value:v});
const reset={operation:'reset-image-crop',target,value:{confirm:true}};
const hash=s=>createHash('sha256').update(s).digest('hex');
const input=()=>{const s=fixture(0);s.slides[0].composition.geometryOverrides['perf-image']={x:200,y:300,width:500,height:200};return s;};
const image=h=>h.document.querySelector('[data-pptskill-element-id="component-perf-image"] img');
const component=s=>s.slides[0].content.components[1];
for(const portable of [false,true]){
 test(`Crop ${portable?'portable':'Node'} 原圖、Evidence、pending、reset、reparse及cover安全`,()=>{
  const spec=input();component(spec).fit='cover';
  const h=portable?mountedEditor(spec):null,api=h?.api||createDeckEditor(spec),read=()=>h?h.getSpec():api.getSpec();
  const before=read(),src=component(before).dataUri;
  api.executeOperation(request());let c=component(read());
  assert.equal(c.dataUri,src);assert.equal(c.fit,'contain');assert.deepEqual(c.crop,rect);
  assert.equal(c.imageSafety.reviewDigest,hash(JSON.stringify([src,rect,'evidence',protectedRect])));
  assert.deepEqual(read().slides[0].composition,before.slides[0].composition);assert.equal(imageCrop.state(c),'active');
  if(h){assert.equal(h.getRevision(),1);api.executeOperation(request());assert.equal(h.getRevision(),1);assert.equal(image(h).getAttribute('src'),src);assert.deepEqual(extractDeckSpec(api.exportHtml()),read());}
  api.executeOperation({operation:'replace-asset',target,value:{dataUri:'data:image/png;base64,BB=='}});
  c=component(read());assert.equal(imageCrop.state(c),'pending');assert.deepEqual(c.crop,rect);
  if(h){assert.equal(image(h).style.getPropertyValue('object-fit'),'contain');assert.match(h.document.querySelector('[data-editor-status]').textContent,/裁切待重新確認/);}
  api.executeOperation(request());assert.equal(imageCrop.state(component(read())),'active');
  api.executeOperation(reset);c=component(read());assert.equal(c.crop,undefined);assert.equal(c.imageSafety.classification,'evidence');
  assert.equal(c.imageSafety.reviewDigest,hash(JSON.stringify([c.dataUri,null,'evidence',protectedRect])));
  const resetSpec=read(),revision=h?.getRevision();api.executeOperation(reset);assert.deepEqual(read(),resetSpec);if(h)assert.equal(h.getRevision(),revision);
  assert.throws(()=>api.executeOperation({operation:'replace-asset',target,value:{dataUri:c.dataUri,fit:'cover'}}));assert.deepEqual(read(),resetSpec);
  const patch={slideId:target.slideId,region:'content.components.perf-image',value:{fit:'cover'}};
  assert.throws(()=>api.applyLocalPatch(patch));assert.deepEqual(read(),resetSpec);
  const imported=read();component(imported).fit='cover';assert.throws(()=>sanitizeDeckSpec(imported));assert.throws(()=>renderFullDeck(imported));
 });
 test(`Crop ${portable?'portable':'Node'} exact payload／wrong target／protected 原子拒絕`,()=>{
  const h=portable?mountedEditor(input()):null,api=h?.api||createDeckEditor(input()),read=()=>h?h.getSpec():api.getSpec(),before=read();let getters=0;
  const bad=[{...value,confirm:false},{...value,classification:undefined},{...value,x:NaN},{...value,width:0},{...value,height:Infinity},{...value,x:.9},{...value,reviewDigest:'f'.repeat(64)},{...value,protectedRect:{x:0,y:0,width:1,height:1}}];
  for(const part of ['value','protectedRect'])for(const fault of ['getter','hidden','symbol','prototype']){
   const v=structuredClone(value),o=part==='value'?v:v.protectedRect;
   if(fault==='getter')Object.defineProperty(o,'x',{get(){getters++;throw Error('getter');}});
   if(fault==='hidden')Object.defineProperty(o,'extra',{value:1});if(fault==='symbol')o[Symbol('extra')]=1;if(fault==='prototype')Object.setPrototypeOf(o,{extra:1});bad.push(v);
  }
  for(const v of bad){assert.throws(()=>api.executeOperation(request(v)));assert.deepEqual(read(),before);}
  for(const target of [{slideId:'missing',elementId:'component-perf-image'},{slideId:'portable',elementId:'role-title'}])assert.throws(()=>api.executeOperation({...request(),target}));
  assert.throws(()=>api.executeOperation({...reset,value:{}}));assert.equal(getters,0);if(h)assert.equal(h.getRevision(),0);
 });
 test(`Crop ${portable?'portable':'Node'} raw tuple變更pending／decorative fit不失效`,()=>{
  const h=portable?mountedEditor(input()):null,api=h?.api||createDeckEditor(input()),read=()=>h?h.getSpec():api.getSpec();api.executeOperation(request());
  for(const delta of [{crop:{...rect,x:.1}},{imageSafety:{...component(read()).imageSafety,protectedRect:{...protectedRect,x:.3}}},{imageSafety:{...component(read()).imageSafety,classification:'decorative'}}]){
   const changed=read();Object.assign(component(changed),delta);assert.equal(imageCrop.state(component(sanitizeDeckSpec(changed))),'pending');
  }
  api.executeOperation(request({...rect,classification:'decorative',confirm:true}));const digest=component(read()).imageSafety.reviewDigest;
  api.executeOperation({operation:'replace-asset',target,value:{dataUri:component(read()).dataUri,fit:'cover'}});
  assert.equal(component(read()).imageSafety.reviewDigest,digest);assert.equal(imageCrop.state(component(read())),'active');
 });
}
test('Crop SHA256 UTF8 vectors／20MiB／portable parity與metadata',()=>{
 const context={TextEncoder};vm.runInNewContext(buildCropHashRuntime(),context);
 for(const str of ['', 'abc','原圖😀\ud800','data:image/png;base64,'+'A'.repeat(20*1024*1024)])assert.equal(context.PPTSKILLCropHash.digest(str),hash(str));
 const meta=JSON.parse(readFileSync(new URL('../runtime/vendor/crop-hash-vendor.json',import.meta.url)));
 assert.equal(meta.version,'2.0.1');assert.equal(meta.license,'MIT');const raw=readFileSync(new URL('../runtime/vendor/crop-hash-2.0.1.iife.js',import.meta.url));assert.equal(meta.bundleBytes,raw.length);assert.equal(meta.bundleSha256,hash(raw));assert.ok(meta.inputs.length>=1);
 assert.doesNotMatch(buildCropHashRuntime(),/getRandomValues|randomUUID|fetch\(|localStorage|SHA512/);
});
test('Crop cache／ResizeObserver geometry無hash，projection throw不留candidate',()=>{
 let hashes=0;const contract=createImageCropContract(s=>{hashes++;return hash(s)}),c={type:'image',dataUri:'source',crop:rect,imageSafety:{classification:'evidence',protectedRect}};
 c.imageSafety.reviewDigest=contract.digest(c);for(let i=0;i<10;i++)assert.equal(contract.state(c),'active');assert.equal(hashes,1);
 const h=mountedEditor(input()),img=image(h);Object.assign(img,{complete:true,naturalWidth:1200,naturalHeight:800});Object.assign(img.parentElement,{clientWidth:500,clientHeight:200});
 let draw,disconnected=0;const projection=createCropProjection({contract,window:{ResizeObserver:class{constructor(fn){draw=fn;}observe(){}disconnect(){disconnected++;}}}});
 projection.sync(img,c);const prior=img.getAttribute('style'),point=projection.checkpoint(img),frame=img.parentElement.getAttribute('style');
 const changed=structuredClone(c);changed.crop={x:.1,y:.1,width:.8,height:.8};changed.imageSafety.reviewDigest=contract.digest(changed);
 const style=img.style,set=style.setProperty;let once=true;img.style={getPropertyValue:style.getPropertyValue,getPropertyPriority:style.getPropertyPriority,removeProperty:style.removeProperty,setProperty:(k,v,p)=>{set(k,v,p);if(k==='left'&&once){once=false;throw Error('投影後失敗');}}};
 assert.throws(()=>projection.sync(img,changed));projection.rollback(img,point);img.setAttribute('style',prior);img.parentElement.setAttribute('style',frame);
 img.style=style;const count=hashes;for(let i=0;i<20;i++)draw();assert.equal(hashes,count);assert.equal(img.getAttribute('style'),prior);
 projection.destroy();assert.ok(disconnected);assert.equal(img.getAttribute('src'),component(input()).dataUri);
});
test('Crop registry／正常render與export保存原src，無chrome並可reopen',()=>{
 const api=createDeckEditor(input());api.executeOperation(request());const result=renderFullDeck(api.getSpec());assert.equal(result.status,'pass');assert.deepEqual(extractDeckSpec(result.html),api.getSpec());
 const h=mountedEditor(api.getSpec());for(const op of ['crop-image','reset-image-crop'])assert.deepEqual(JSON.parse(JSON.stringify(h.api.operationDescriptors[op])),OPERATION_DESCRIPTORS[op]);
 const html=h.api.exportHtml();assert.doesNotMatch(html,/<dialog[^>]*data-crop-dialog/);assert.deepEqual(mountedEditor(extractDeckSpec(html)).getSpec(),h.getSpec());
});

const repairMounted=()=>{
 const h=mountedEditor(input()),img=image(h);Object.assign(img,{complete:true,naturalWidth:1200,naturalHeight:800});Object.assign(img.parentElement,{clientWidth:500,clientHeight:200});
 const observers=[];h.window.ResizeObserver=class{constructor(fn){this.fn=fn;this.connected=false;observers.push(this)}observe(){this.connected=true}disconnect(){this.connected=false}};
 return {...h,img,observers};
};
test('Repair1 F1 synthetic persisted lifecycle恢復canonical投影、load/resize且S18可刪',()=>{
 const h=repairMounted();h.api.executeOperation(request());const before=h.getSpec(),style=h.img.getAttribute('style');
 for(const fn of h.window.listeners.pagehide||[])fn({persisted:true});
 for(const fn of h.window.listeners.pageshow||[])fn({persisted:true});
 assert.deepEqual(h.getSpec(),before);assert.equal(h.img.getAttribute('style'),style);assert.equal(h.img.listeners.load.length,1);assert.equal(h.observers.filter(o=>o.connected).length,1);
 h.img.parentElement.clientWidth=640;for(const o of h.observers.filter(o=>o.connected))o.fn();assert.notEqual(h.img.getAttribute('style'),style);
 for(const fn of h.img.listeners.load)fn();h.api.executeOperation({operation:'delete-element',target,value:{confirm:true}});assert.equal(h.img.isConnected,false);
});
test('Repair1 F2 raw patch observe throw回復node位置、style、selection/dialog及舊ownership',async()=>{
 const h=repairMounted();h.api.executeOperation(request());h.ready();h.click(h.img.parentElement);
 for(const selector of ['[data-crop-original]','[data-crop-preview]'])Object.assign(h.document.querySelector(selector),{complete:true,naturalWidth:1200,naturalHeight:800,decode:async()=>{}});
 h.action('crop-selected-image');await new Promise(resolve=>setImmediate(resolve));
 const before=h.getSpec(),rev=h.getRevision(),old=h.img,frame=old.parentElement,parent=frame.parentElement,index=Array.from(parent.children).indexOf(frame),style=old.getAttribute('style'),frameStyle=frame.getAttribute('style'),selection=h.api.layout.getSelectionState();
 let partial;h.window.ResizeObserver=class{constructor(fn){this.fn=fn;partial=this}observe(){this.connected=true;throw Error('injected observer failure')}disconnect(){this.connected=false}};
 const next={...component(before),crop:{...rect,x:.1}};next.imageSafety={...next.imageSafety,reviewDigest:imageCrop.digest(next)};
 assert.throws(()=>h.api.applyLocalPatch({slideId:'portable',region:'content.components.perf-image',value:next}),/injected observer failure/);
 assert.deepEqual(h.getSpec(),before);assert.equal(h.getRevision(),rev);assert.equal(image(h),old);assert.equal(parent.children[index],frame);assert.equal(old.getAttribute('style'),style);assert.equal(frame.getAttribute('style'),frameStyle);
 assert.equal(partial.connected,false);assert.equal(old.listeners.load.length,1);assert.deepEqual(h.api.layout.getSelectionState(),selection);assert.equal(h.document.querySelector('[data-crop-dialog]').open,true);
 const owned=h.observers.filter(o=>o.connected);assert.ok(owned.length);frame.clientWidth=640;owned[0].fn();assert.notEqual(old.getAttribute('style'),style);
 h.api.executeOperation({operation:'delete-element',target,value:{confirm:true}});
});
test('Repair1 F3 reset refresh throw回復observer/load ownership而非僅CSS',()=>{
 const h=repairMounted();h.api.executeOperation(request());const before=h.getSpec(),style=h.img.getAttribute('style'),rev=h.getRevision(),query=h.document.querySelector;let once=true;
 h.document.querySelector=function(s){if(once&&s==='[data-action="crop-selected-image"]'){once=false;throw Error('injected refresh failure')}return query.call(this,s)};
 assert.throws(()=>h.api.executeOperation(reset),/injected refresh failure/);h.document.querySelector=query;
 assert.deepEqual(h.getSpec(),before);assert.equal(h.getRevision(),rev);assert.equal(h.img.getAttribute('style'),style);assert.equal(h.observers.filter(o=>o.connected).length,1);assert.equal(h.img.listeners.load.length,1);assert.equal(h.img.listeners.error.length,1);
 h.img.parentElement.clientHeight=350;h.observers.find(o=>o.connected).fn();assert.notEqual(h.img.getAttribute('style'),style);for(const fn of h.img.listeners.load)fn();
 h.api.executeOperation({operation:'delete-element',target,value:{confirm:true}});
});
test('Repair1 F4 standalone render/export/reopen含完整noble MIT且hash符合raw metadata',()=>{
 const license=readFileSync(new URL('../runtime/vendor/crop-hash-LICENSE.md',import.meta.url),'utf8'),meta=JSON.parse(readFileSync(new URL('../runtime/vendor/crop-hash-vendor.json',import.meta.url)));
 assert.equal(hash(license),meta.licenseSha256);
 const h=repairMounted();h.api.executeOperation(request());const rendered=renderFullDeck(h.getSpec()).html,exported=h.api.exportHtml(),reopened=mountedEditor(extractDeckSpec(exported)).api.exportHtml();
 for(const html of [rendered,exported,reopened]){
  const match=html.match(/<script type="application\/json" data-pptskill-crop-hash-license(?:="")?>([\s\S]*?)<\/script>/);assert.ok(match,'standalone 必須包含授權');assert.equal(JSON.parse(match[1]),license);assert.equal(hash(JSON.parse(match[1])),meta.licenseSha256);
 }
});

test('Repair1 sync半建observe/listener失敗清理、既有空crop snapshot恢復與CSS priority',()=>{
 for(const fault of ['observe','listener']){
  const h=repairMounted(),img=h.img,frame=img.parentElement,c=component(createDeckEditor(input()).executeOperation(request()));
  img.style.setProperty('max-width','93%','important');frame.style.setProperty('overflow','visible','important');
  const original=img.getAttribute('style'),originalFrame=frame.getAttribute('style'),observers=[];let fail=true;
  const window={ResizeObserver:class{constructor(fn){this.fn=fn;observers.push(this)}observe(){this.connected=true;if(fault==='observe'&&fail){fail=false;throw Error('observe partial')}}disconnect(){this.connected=false}}};
  const add=img.addEventListener;img.addEventListener=function(type,fn){add.call(this,type,fn);if(fault==='listener'&&type==='error'&&fail){fail=false;throw Error('listener partial')}};
  const projection=createCropProjection({contract:imageCrop,window});assert.throws(()=>projection.sync(img,c),/partial/);
  assert.equal(projection.checkpoint(img),null);assert.equal(img.getAttribute('style'),original);assert.equal(frame.getAttribute('style'),originalFrame);assert.equal(img.style.getPropertyPriority('max-width'),'important');assert.equal(frame.style.getPropertyPriority('overflow'),'important');
  assert.equal(observers.filter(o=>o.connected).length,0);assert.equal((img.listeners.load||[]).length,0);assert.equal((img.listeners.error||[]).length,0);
  projection.sync(img,c);const resetComponent={...c};delete resetComponent.crop;resetComponent.imageSafety={...c.imageSafety,reviewDigest:imageCrop.digest(resetComponent)};projection.sync(img,resetComponent);
  const checkpoint=projection.checkpoint(img),style=img.getAttribute('style');const observer=observers.find(o=>o===checkpoint.record.observer),observe=observer.observe;observer.observe=function(){this.connected=true;throw Error('reset record observe partial')};
  assert.throws(()=>projection.sync(img,c),/reset record observe partial/);assert.equal(projection.checkpoint(img).projection,checkpoint.projection);assert.equal(img.getAttribute('style'),style);assert.equal(observer.connected,false);assert.equal(img.listeners.load.length,0);
  observer.observe=observe;projection.sync(img,c);projection.destroy();assert.equal(img.style.getPropertyPriority('max-width'),'important');assert.equal(frame.style.getPropertyPriority('overflow'),'important');
 }
});
test('Repair1 F2 raw patch render style throw清candidate且舊node保留priority及load',()=>{
 const h=repairMounted();h.api.executeOperation(request());h.img.style.setProperty('display','block','important');const old=h.img,frame=old.parentElement,before=h.getSpec(),style=old.getAttribute('style'),rev=h.getRevision(),create=h.document.createElement;let candidate;
 h.document.createElement=function(tag){const template=create.call(this,tag);if(tag!=='template')return template;const proto=Object.getPrototypeOf(template),setter=Object.getOwnPropertyDescriptor(proto,'innerHTML').set;Object.defineProperty(template,'innerHTML',{set(html){setter.call(this,html);candidate=this.content.firstElementChild.querySelector('img');const real=candidate.style;let once=true;candidate.style={getPropertyValue:real.getPropertyValue,getPropertyPriority:real.getPropertyPriority,removeProperty:real.removeProperty,setProperty:(k,v,p)=>{real.setProperty(k,v,p);if(once&&k==='object-fit'){once=false;throw Error('raw style partial')}}};}});return template;};
 assert.throws(()=>h.api.applyLocalPatch({slideId:'portable',region:'content.components.perf-image',value:{crop:{...rect,x:.1}}}),/raw style partial/);h.document.createElement=create;
 assert.equal(candidate.isConnected,false);assert.equal(image(h),old);assert.equal(old.parentElement,frame);assert.equal(old.getAttribute('style'),style);assert.equal(old.style.getPropertyPriority('display'),'important');assert.equal(old.listeners.load.length,1);assert.deepEqual(h.getSpec(),before);assert.equal(h.getRevision(),rev);
});
test('Repair1 F2 舊projection teardown style throw也回復DOM及已disconnect ownership',()=>{
 const h=repairMounted();h.api.executeOperation(request());const old=h.img,style=old.style,before=h.getSpec(),revision=h.getRevision(),attrs=old.getAttribute('style');let once=true;
 old.style={getPropertyValue:style.getPropertyValue,getPropertyPriority:style.getPropertyPriority,removeProperty:k=>{style.removeProperty(k);if(once){once=false;throw Error('old release style partial')}},setProperty:style.setProperty};
 assert.throws(()=>h.api.applyLocalPatch({slideId:'portable',region:'content.components.perf-image',value:{alt:'失敗候選'}}),/old release style partial/);old.style=style;
 assert.equal(image(h),old);assert.equal(old.getAttribute('style'),attrs);assert.deepEqual(h.getSpec(),before);assert.equal(h.getRevision(),revision);assert.equal(old.listeners.load.length,1);assert.equal(h.observers.filter(o=>o.connected).length,1);
 old.parentElement.clientWidth=610;h.observers.find(o=>o.connected).fn();assert.notEqual(old.getAttribute('style'),attrs);h.api.executeOperation({operation:'delete-element',target,value:{confirm:true}});
});
