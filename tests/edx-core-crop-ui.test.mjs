import test from 'node:test';
import assert from 'node:assert/strict';
import { mountedEditor, fixture } from '../tools/edx-wp1-s4-perf-mounted.mjs';
const target={slideId:'portable',elementId:'component-perf-image'};
const crop={operation:'crop-image',target,value:{x:.1,y:.1,width:.8,height:.8,classification:'evidence',protectedRect:{x:.2,y:.2,width:.3,height:.3},confirm:true}};
const make=()=>{
 const spec=fixture(0);spec.slides[0].composition.geometryOverrides['perf-image']={x:200,y:300,width:500,height:200};spec.slides.push({...structuredClone(spec.slides[0]),id:'other'});
 const h=mountedEditor(spec),q=s=>h.document.querySelector(s);h.ready();h.click(q('[data-pptskill-element-id="component-perf-image"]'));
 const dialog=q('[data-crop-dialog]');
 for(const s of ['[data-crop-original]','[data-crop-preview]']){Object.assign(q(s),{complete:true,naturalWidth:240,naturalHeight:160,decode:async()=>{}});Object.assign(q(s).parentElement,{clientWidth:300,clientHeight:170});}
 const input=(s,value,checked)=>{const node=q(s);if(value!==undefined)node.value=value;if(checked!==undefined)node.checked=checked;for(const fn of dialog.listeners.input||[])fn({target:node});};
 const open=async()=>{if(!h.api.layout.getSelectionState().selected.length)h.click(q('[data-pptskill-element-id="component-perf-image"]'));h.action('crop-selected-image');await new Promise(resolve=>setImmediate(resolve));};
 return{...h,q,dialog,input,open};
};
test('Crop UI keyboard/range草稿不提交；勾選confirm一次revision、原src不變',async()=>{
 const h=make(),before=h.getSpec();await h.open();assert.equal(h.dialog.open,true);
 h.input('[data-crop-classification]','decorative');h.input('[data-crop-range="rect-width"]','0.6');
 assert.equal(h.q('[data-crop-field="rect-width"]').value,'0.6');assert.deepEqual(h.getSpec(),before);assert.equal(h.getRevision(),0);
 h.action('confirm-crop');assert.equal(h.getRevision(),0);
 h.input('[data-crop-confirm]',undefined,true);h.action('confirm-crop');assert.equal(h.getRevision(),1);assert.equal(h.dialog.open,false);
 assert.equal(h.getSpec().slides[0].content.components[1].crop.width,.6);assert.equal(h.getSpec().slides[0].content.components[1].dataUri,before.slides[0].content.components[1].dataUri);
});
test('Crop UI Evidence預設完整保護、外框排除拒絕、確認後reset與S7拒絕cover',async()=>{
 const h=make();await h.open();h.input('[data-crop-classification]','evidence');h.input('[data-crop-field="rect-width"]','0.5');h.input('[data-crop-confirm]',undefined,true);
 h.action('confirm-crop');assert.equal(h.getRevision(),0);assert.match(h.q('[data-crop-status]').textContent,/不可遮掉/);
 h.input('[data-crop-field="rect-width"]','1');h.input('[data-crop-confirm]',undefined,true);h.action('confirm-crop');
 await h.open();h.action('reset-image-crop');const c=h.getSpec().slides[0].content.components[1];assert.equal(c.crop,undefined);assert.equal(c.imageSafety.classification,'evidence');
 const rev=h.getRevision();h.click(h.q('[data-image-fit="cover"]'));assert.equal(h.getRevision(),rev);assert.equal(h.getSpec().slides[0].content.components[1].fit,'contain');
});
test('Crop UI cancel/Escape/切頁/selection失效與busy chooser互斥',async()=>{
 const h=make();await h.open();h.action('insert-text');h.action('replace-selected-image');assert.equal(h.q('[data-insert-text-dialog]').open,false);
 h.action('cancel-crop');assert.equal(h.getRevision(),0);await h.open();for(const fn of h.dialog.listeners.cancel)fn({preventDefault(){}});assert.equal(h.dialog.open,false);
 await h.open();h.click(h.q('.slide[data-slide-id="other"]'));assert.equal(h.dialog.open,false);h.action('confirm-crop');assert.equal(h.getRevision(),0);
});
test('Crop UI async decode source換掉／S18 delete／reject不得晚到提交',async()=>{
 for(const kind of ['replace','delete','decode-error']){
  const h=make();let ready,fail;const p=new Promise((resolve,reject)=>{ready=resolve;fail=reject;});h.q('[data-crop-original]').decode=()=>p;
  h.action('crop-selected-image');assert.equal(h.dialog.open,true);
  if(kind==='replace')h.api.executeOperation({operation:'replace-asset',target,value:{dataUri:'data:image/png;base64,BB=='}});
  if(kind==='delete'){
   // S18 僅刪獨立 image，fixture 的 perf-image 是非slot component。
   h.api.executeOperation({operation:'delete-element',target,value:{confirm:true}});
  }
  const before=h.getSpec(),revision=h.getRevision();if(kind==='decode-error')fail(Error('decode failure'));else ready();await new Promise(resolve=>setImmediate(resolve));
  h.action('confirm-crop');assert.equal(h.dialog.open,false);assert.deepEqual(h.getSpec(),before);assert.equal(h.getRevision(),revision);
 }
});
test('Crop API style mutation前後throw回滾canonical/DOM/revision，S18仍能刪active crop',()=>{
 for(const timing of ['before','after']){
  const h=make(),img=h.q('[data-pptskill-element-id="component-perf-image"] img');Object.assign(img,{complete:true,naturalWidth:240,naturalHeight:160});Object.assign(img.parentElement,{clientWidth:500,clientHeight:200});
  h.api.executeOperation(crop);const before=h.getSpec(),attributes={...img.attrs},frame={...img.parentElement.attrs},revision=h.getRevision(),style=img.style;let once=true;
  img.style={getPropertyValue:style.getPropertyValue,getPropertyPriority:style.getPropertyPriority,removeProperty:style.removeProperty,setProperty:(k,v,p)=>{if(k==='left'&&once){once=false;if(timing==='after')style.setProperty(k,v,p);throw Error('style '+timing);}style.setProperty(k,v,p);}};
  assert.throws(()=>h.api.executeOperation({...crop,value:{...crop.value,x:.05,width:.9}}));img.style=style;
  assert.deepEqual(h.getSpec(),before);assert.deepEqual(img.attrs,attributes);assert.deepEqual(img.parentElement.attrs,frame);assert.equal(h.getRevision(),revision);
  h.api.executeOperation({operation:'delete-element',target,value:{confirm:true}});assert.equal(img.isConnected,false);
 }
});

test('Crop 20MiB UI range preview不hash來源／不序列化DeckSpec，confirm才hash',async()=>{
 const s=fixture(20);s.slides[0].composition.geometryOverrides['perf-image']={x:200,y:300,width:500,height:200};
 let encodes=0,bytes=0;class ObservedEncoder extends TextEncoder{encode(text){encodes++;bytes+=text.length;return super.encode(text);}}
 const h=mountedEditor(s,{TextEncoder:ObservedEncoder}),q=css=>h.document.querySelector(css);h.ready();h.click(q('[data-pptskill-element-id="component-perf-image"]'));
 for(const css of ['[data-crop-original]','[data-crop-preview]']){Object.assign(q(css),{complete:true,naturalWidth:240,naturalHeight:160,decode:async()=>{}});Object.assign(q(css).parentElement,{clientWidth:300,clientHeight:170});}
 h.action('crop-selected-image');await new Promise(resolve=>setImmediate(resolve));q('[data-crop-classification]').value='decorative';h.resetCounts();const initialEncodes=encodes;
 for(let i=1;i<=20;i++){const el=q('[data-crop-range="rect-width"]');el.value=String(.5+i/100);for(const fn of q('[data-crop-dialog]').listeners.input)fn({target:el});}
 assert.equal(encodes,initialEncodes);assert.equal(h.counts.wholeSpecSerializations,0);assert.equal(h.counts.payloadReads,0);
 q('[data-crop-confirm]').checked=true;h.action('confirm-crop');assert.equal(h.getRevision(),1);assert.equal(encodes,initialEncodes+1);assert.ok(bytes>=20*1024*1024);
});

test('Crop duplicate保留canonical但重建projection ownership，刪頁清理load callback',()=>{
 const h=make(),original=h.q('[data-pptskill-element-id="component-perf-image"] img');Object.assign(original,{complete:true,naturalWidth:240,naturalHeight:160});Object.assign(original.parentElement,{clientWidth:500,clientHeight:200});h.api.executeOperation(crop);const source=original.getAttribute('src');
 h.action('duplicate');const copy=h.q('.slide[data-slide-id="portable-copy-1"] [data-pptskill-element-id="component-perf-image"] img');assert.ok(copy);assert.equal(copy.getAttribute('src'),source);assert.equal(copy.style.getPropertyValue('clip-path'),'none');
 Object.assign(copy,{complete:true,naturalWidth:240,naturalHeight:160});Object.assign(copy.parentElement,{clientWidth:500,clientHeight:200});for(const fn of copy.listeners.load||[])fn();assert.match(copy.style.getPropertyValue('clip-path'),/^inset/);
 assert.doesNotThrow(()=>h.api.exportHtml());h.action('delete');assert.equal(copy.isConnected,false);assert.equal((copy.listeners.load||[]).length,0);assert.equal(original.isConnected,true);assert.equal(original.getAttribute('src'),source);
});

test('Repair1 F5 decorative cover預覽沿target aspect，portrait/landscape可見區域等同commit',async()=>{
 const {imageCrop}=await import('../runtime/image-crop.js');
 const visible=(r,w,h)=>{const p=imageCrop.projectRect(r,240,160,w,h,'cover');return [Math.max(r.x,-p.left/p.width),Math.max(r.y,-p.top/p.height),Math.min(r.x+r.width,(w-p.left)/p.width),Math.min(r.y+r.height,(h-p.top)/p.height)];};
 const r={x:.2,y:.15,width:.5,height:.6};
 for(const [width,height] of [[250,400],[500,200]]){
  const h=make(),targetFrame=h.q('[data-pptskill-element-id="component-perf-image"]'),frame=h.q('[data-crop-preview-frame]');Object.assign(targetFrame,{clientWidth:width,clientHeight:height});
  // mounted DOM不做layout；由實際寫入CSS尺寸回讀，保持測試與browser client dimensions一致。
  for(const [name,key,fallback] of [['clientWidth','width',300],['clientHeight','height',170]])Object.defineProperty(frame,name,{configurable:true,get:()=>parseFloat(frame.style.getPropertyValue(key))||fallback});
  h.api.executeOperation({operation:'replace-asset',target,value:{dataUri:h.getSpec().slides[0].content.components[1].dataUri,fit:'cover'}});
  await h.open();h.input('[data-crop-classification]','decorative');for(const [k,v] of Object.entries(r))h.input('[data-crop-field="rect-'+k+'"]',String(v));
  assert.ok(Math.abs(frame.clientWidth/frame.clientHeight-width/height)<1e-9);
  const a=visible(r,frame.clientWidth,frame.clientHeight),b=visible(r,width,height);a.forEach((n,i)=>assert.ok(Math.abs(n-b[i])<1e-9));
  const style=h.q('[data-crop-preview]').style,iw=parseFloat(style.getPropertyValue('width')),ih=parseFloat(style.getPropertyValue('height')),left=parseFloat(style.getPropertyValue('left')),top=parseFloat(style.getPropertyValue('top'));const actual=[Math.max(r.x,-left/iw),Math.max(r.y,-top/ih),Math.min(r.x+r.width,(frame.clientWidth-left)/iw),Math.min(r.y+r.height,(frame.clientHeight-top)/ih)];actual.forEach((n,i)=>assert.ok(Math.abs(n-b[i])<1e-9));
  assert.equal(h.q('[data-crop-original]').style.getPropertyValue('clip-path'),'');h.input('[data-crop-confirm]',undefined,true);h.action('confirm-crop');assert.deepEqual(h.getSpec().slides[0].content.components[1].crop,r);
 }
});
