import test from 'node:test';
import assert from 'node:assert/strict';
import { fixture,mountedEditor } from './candidate/tools/edx-wp1-s4-perf-mounted.mjs';
const ids=['component-group-text','component-perf-image'];
const req=operation=>({operation,target:{slideId:'portable',elementIds:ids},value:{}});
const input=()=>{const s=fixture(0),slide=s.slides[0];slide.content.components.push({id:'group-text',type:'text',text:'文字'});Object.assign(slide.composition.geometryOverrides,{'group-text':{x:120,y:120,width:200,height:160},'perf-image':{x:420,y:320,width:300,height:200}});return s;};
test('synthetic after-effect refresh throw：rollback 需還原 unlocked group handles',()=>{
 const h=mountedEditor(input());h.api.layout.setMode(true);for(const [i,id] of ids.entries())h.click(h.document.querySelector('[data-pptskill-element-id="'+id+'"]'),{shiftKey:i>0});h.action('group-elements');
 const before=h.getSpec(),revision=h.getRevision(),target=JSON.parse(JSON.stringify(h.api.layout.getState().target));
 const original=h.api.layout.refresh;h.api.layout.refresh=()=>{original();throw new Error('injected AFTER refresh');};
 assert.throws(()=>h.api.executeOperation(req('lock-elements')),/injected AFTER/);h.api.layout.refresh=original;
 assert.deepEqual(h.getSpec(),before);assert.equal(h.getRevision(),revision);
 console.log(JSON.stringify({synthetic:true,canonicalRolledBack:true,revision:h.getRevision(),selection:h.api.layout.getSelectionState(),targetBefore:target,targetAfter:h.api.layout.getState().target,vendorDestroyed:h.vendor.destroyed}));
 assert.deepEqual(JSON.parse(JSON.stringify(h.api.layout.getState().target)),target,'canonical unlocked，但 refresh 已消除 group target');
});
