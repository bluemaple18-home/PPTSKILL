import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { createDeckEditor, OPERATION_DESCRIPTORS } from './candidate/runtime/deck-editor.js';
import { sanitizeDeckSpec, patchComposition, patchSlideContent, extractDeckSpec } from './candidate/runtime/deck-spec.js';
import { fixture, mountedEditor } from './candidate/tools/edx-wp1-s4-perf-mounted.mjs';
export const ids = ['component-group-text','component-perf-image'];
export const req = (operation,value={},selected=ids,slideId='portable') => ({operation,target:{slideId,elementIds:[...selected]},value});
export const input = () => {
 const s=fixture(0), slide=s.slides[0];
 slide.content.components.push({id:'group-text',type:'text',text:'群組文字'},{id:'other',type:'text',text:'其他'});
 Object.assign(slide.composition.geometryOverrides,{'group-text':{x:120,y:120,width:200,height:160},'perf-image':{x:420,y:320,width:300,height:200},other:{x:1080,y:120,width:200,height:160}});return s;
};
export const nodeFor=(h,id)=>h.document.querySelector('[data-pptskill-element-id="'+id+'"]');
export const grouped=()=>{const h=mountedEditor(input());h.api.layout.setMode(true);h.click(nodeFor(h,ids[0]));h.click(nodeFor(h,ids[1]),{shiftKey:true});h.action('group-elements');return h;};
const setup=portable=>{const h=portable?mountedEditor(input()):null,api=h?.api||createDeckEditor(input());return {h,api,read:()=>h?h.getSpec():api.getSpec()};};
for(const portable of [false,true]) {
 const lane=portable?'portable VM synthetic':'Node';
 test(lane+'：group 內明確 edit/replace 不改 membership，單員 transform/delete 拒絕',()=>{
  const {api,read}=setup(portable);api.executeOperation(req('group-elements'));
  api.executeOperation({operation:'edit-text',target:{slideId:'portable',elementId:ids[0]},value:'修改文字'});
  api.executeOperation({operation:'replace-asset',target:{slideId:'portable',elementId:ids[1]},value:{dataUri:'data:image/png;base64,AQ==',fit:'cover'}});
  assert.deepEqual(read().slides[0].composition.elementGroups,[ids]);
  const before=read();for(const [operation,value] of [['move-element',{x:130,y:130}],['resize-element',{width:220,height:180}],['delete-element',{confirm:true}]]){
   assert.throws(()=>api.executeOperation({operation,target:{slideId:'portable',elementId:ids[0]},value}),/群組/);assert.deepEqual(read(),before);
  }
 });
 test(lane+'：全組重排 target 與重複 lock 是 no-op；跨頁未知 group 拒絕',()=>{
  const {api,read,h}=setup(portable);api.executeOperation(req('group-elements'));const before=read(),rev=h?.getRevision();
  api.executeOperation(req('group-elements',{},[...ids].reverse()));assert.deepEqual(read(),before);if(h)assert.equal(h.getRevision(),rev);
  assert.throws(()=>api.executeOperation(req('move-group',{x:130,y:130},ids,'missing')));assert.deepEqual(read(),before);
  api.executeOperation(req('lock-elements'));const locked=read(),rev2=h?.getRevision();api.executeOperation(req('lock-elements',{},[...ids].reverse()));assert.deepEqual(read(),locked);if(h)assert.equal(h.getRevision(),rev2);
 });
 test(lane+'：cross-realm own-data payload 可用且 clone metadata 隔離',()=>{
  const {api,read}=setup(portable);const payload=vm.runInNewContext('('+JSON.stringify(req('group-elements'))+')');api.executeOperation(payload);payload.target.elementIds[0]='bad';const snapshot=read();snapshot.slides[0].composition.elementGroups[0][0]='bad';assert.deepEqual(read().slides[0].composition.elementGroups,[ids]);
 });
 test(lane+'：locked singleton 無 geometry 可選解鎖，raw patch 不可寫入',()=>{
  const s=input();delete s.slides[0].composition.geometryOverrides['group-text'];const h=portable?mountedEditor(s):null,api=h?.api||createDeckEditor(s),read=()=>h?h.getSpec():api.getSpec();
  api.executeOperation(req('lock-elements',{},[ids[0]]));const before=read();assert.throws(()=>api.applyLocalPatch({slideId:'portable',region:'content.components.group-text',value:{text:'旁路'}}),/鎖定/);assert.deepEqual(read(),before);
  if(h){h.api.layout.setMode(true);h.click(nodeFor(h,ids[0]));assert.deepEqual(Array.from(h.api.layout.getSelectionState().selected),[ids[0]]);assert.equal(h.api.layout.getState().target,null);h.action('unlock-elements');}else api.executeOperation(req('unlock-elements',{},[ids[0]]));
  assert.equal(read().slides[0].composition.lockedElementIds,undefined);
 });
}
test('Node：patchComposition/patchSlideContent 不能改 lock/group/content/geometry，其他文字可改',()=>{
 const api=createDeckEditor(input());api.executeOperation(req('group-elements'));api.executeOperation(req('lock-elements'));const s=api.getSpec(),slide=s.slides[0];
 const moved=structuredClone(slide.composition);moved.geometryOverrides['group-text'].x+=1;assert.throws(()=>patchComposition(s,'portable',moved),/patch/);
 const changed=structuredClone(slide.content);changed.components.find(c=>c.id==='group-text').text='旁路';assert.throws(()=>patchSlideContent(s,'portable',changed),/patch/);
 const dropped=structuredClone(slide.composition);delete dropped.elementGroups;delete dropped.lockedElementIds;assert.deepEqual(patchComposition(s,'portable',dropped),s);
 const content=structuredClone(slide.content);content.components.find(c=>c.id==='other').text='合法';assert.equal(patchSlideContent(s,'portable',content).slides[0].content.components.find(c=>c.id==='other').text,'合法');
});
test('sanitizer：metadata descriptor/sparse/symbol/prototype/missing geometry 拒絕且 getter 0 次',()=>{
 let calls=0;const cases=[c=>Object.defineProperty(c,'elementGroups',{enumerable:true,get(){calls++;return [ids]}}),c=>{c.elementGroups=[ids];Object.defineProperty(c.elementGroups,'0',{enumerable:true,get(){calls++;return ids}})},c=>{c.elementGroups=[ids];c.elementGroups[Symbol('extra')]=1},c=>{c.elementGroups=Array(1)},c=>{c.elementGroups=[ids];delete c.geometryOverrides['group-text']},c=>{c.elementGroups=[ids];c.lockedElementIds=[ids[0]]},c=>{Object.setPrototypeOf(c,{lockedElementIds:ids})}];
 for(const change of cases){const s=input();change(s.slides[0].composition);assert.throws(()=>sanitizeDeckSpec(s));}assert.equal(calls,0);
});
test('portable VM synthetic：optimizer pending 期間 lock 拒絕，完成後 lock 阻擋後續 async 替換',async()=>{
 const h=mountedEditor(input());let release;h.assets.optimizeFile=()=>new Promise(r=>release=r);
 const target={slideId:'portable',elementId:ids[1]},pending=h.api.replaceImageFile({},target),before=h.getSpec();assert.throws(()=>h.api.executeOperation(req('lock-elements',{},[ids[1]])),/尚未完成/);assert.deepEqual(h.getSpec(),before);
 release({dataUri:'data:image/png;base64,AQ==',warnings:[],optimized:false});await pending;
 h.api.executeOperation(req('lock-elements',{},[ids[1]]));const locked=h.getSpec(),rev=h.getRevision();const late=h.api.replaceImageFile({},target);release({dataUri:'data:image/png;base64,Ag==',warnings:[],optimized:false});await assert.rejects(late,/鎖定/);assert.deepEqual(h.getSpec(),locked);assert.equal(h.getRevision(),rev);
});
test('portable VM synthetic：gesture 中 export 不提交 preview，stale revision 不落盤',()=>{
 const h=grouped(),before=h.getSpec();h.begin('dragGroup');h.update(30,40,'dragGroup');assert.deepEqual(extractDeckSpec(h.api.exportHtml()),before);
 h.api.executeOperation({operation:'edit-text',target:{slideId:'portable',elementId:'role-title'},value:'revision change'});const changed=h.getSpec();h.finish('dragGroup');assert.deepEqual(h.getSpec(),changed);
});
test('portable VM synthetic：新 group descriptors 與 Node 同值',()=>{const h=mountedEditor(input());for(const op of ['group-elements','ungroup-elements','lock-elements','unlock-elements','move-group','resize-group'])assert.deepEqual(JSON.parse(JSON.stringify(h.api.operationDescriptors[op])),OPERATION_DESCRIPTORS[op]);});
