import assert from 'node:assert/strict';
import { fixture, mountedEditor } from '../../tools/edx-wp1-s4-perf-mounted.mjs';
const edit = value => ({ operation:'edit-text', target:{slideId:'portable',elementId:'role-title'}, value });
const two = () => { const s=fixture(0), c=structuredClone(s.slides[0]); c.id='portable-two'; s.slides.push(c); return s; };
const snap = h => JSON.parse(JSON.stringify({spec:h.getSpec(),revision:h.getRevision(),history:h.api.getHistoryState(),order:h.document.querySelector('.deck').children.map(n=>n.dataset.slideId),selection:h.api.layout.getSelectionState(),target:h.api.layout.getState().target}));
const statusHook = (h, hook) => { const e=h.document.querySelector('[data-editor-status]'); let v=e.textContent; Object.defineProperty(e,'textContent',{configurable:true,get(){return v},set(x){v=x;hook(x)}}); };
function reorder() {
 const h=mountedEditor(two());h.ready();h.document.querySelector('[data-pptskill-element-id="role-title"]').textContent='pending';let undo,blocked=false;
 statusHook(h,v=>{if(v==='已調整順序'){undo=h.api.undo();try{h.api.executeOperation(edit('nested'))}catch(e){blocked=/同步交易/.test(e.message)}}});
 h.action('move-down');assert.equal(undo,false);assert.equal(blocked,true);assert.deepEqual(h.getSpec().slides.map(s=>s.id),['portable-two','portable']);assert.deepEqual(snap(h).order,['portable-two','portable']);assert.equal(h.getSpec().slides[1].content.title,'pending');
 const g=mountedEditor(two());g.ready();g.api.executeOperation(edit('prior'));const before=snap(g),deck=g.document.querySelector('.deck'),insert=deck.insertBefore;let returned=false,rejected=false;
 deck.insertBefore=function(n,p){insert.call(this,n,p);try{g.api.executeOperation(edit('nested'));returned=true}catch(e){rejected=/同步交易/.test(e.message)}throw Error('after insert')};
 assert.throws(()=>g.action('move-down'),/after insert/);assert.equal(returned,false);assert.equal(rejected,true);assert.deepEqual(snap(g),before);console.log('reorder_owner_rollback PASS');
}
function gesture(snapOn=false) {
 const h=mountedEditor(fixture(0));h.ready();if(snapOn)h.action('snap-layout');const before=snap(h),node=h.component(),original=node.getAttribute('style');
 const b=h.document.querySelector('[data-action="undo"]');let value=b.disabled,once=true,rejected=false,started=false;
 Object.defineProperty(b,'disabled',{configurable:true,get(){return value},set(next){value=next;if(once&&next===false){once=false;try{h.api.executeOperation(edit('nested'))}catch(e){rejected=/同步交易/.test(e.message)}const vendor=h.vendor;try{vendor.handlers.dragStart({get inputEvent(){started=true;return {clientX:0,clientY:0}},stop(){}})}catch{}throw Error('terminal control fault')}}});
 h.begin();h.update(8,0,'drag',snapOn?{left:808,top:280}:{});try{h.finish()}catch(e){assert.match(e.message,/terminal control fault/)}
 assert.equal(once,false);assert.equal(rejected,true);assert.equal(started,false);assert.deepEqual(h.getSpec(),before.spec);assert.equal(h.getRevision(),before.revision);assert.deepEqual(JSON.parse(JSON.stringify(h.api.getHistoryState())),before.history);assert.equal(node.getAttribute('style'),original);if(snapOn){assert.equal(h.api.layout.getSelectionState().selected.length,0);h.click(node)}else assert.deepEqual(snap(h),before);assert.equal(h.api.layout.getState().target?.elementId,'component-portable-quote');
 h.begin();h.update(8,0,'drag',snapOn?{left:808,top:280}:{});h.finish();assert.equal(h.getSpec().slides[0].composition.geometryOverrides['portable-quote'].x,808);console.log('gesture_snap_'+(snapOn?'on':'off')+'_rollback_retry PASS');
}
function doubleProjection() {
 const h=mountedEditor(fixture(0));h.ready();const before=snap(h),node=h.component(),initial=node.getAttribute('style');h.begin();h.update(8,10);const style=node.style;let faults=0;
 node.style=new Proxy(style,{get(t,k){if(k==='setProperty')return(n,v)=>{t.setProperty(n,v);if(n==='left'&&faults++<2)throw Error('double projector')};return t[k]}});
 try{h.finish()}catch(e){assert.match(e.message,/double projector/)}assert.equal(node.getAttribute('style'),initial);assert.deepEqual(snap(h),before);assert.equal(h.api.layout.getState().target?.elementId,'component-portable-quote');console.log('double_projection_fallback PASS');
}
function group() {
 const s=fixture(0),slide=s.slides[0];slide.content.components.push({id:'group-text',type:'text',text:'group'});Object.assign(slide.composition.geometryOverrides,{'group-text':{x:120,y:120,width:200,height:160},'perf-image':{x:420,y:320,width:300,height:200}});
 const h=mountedEditor(s);h.api.layout.setMode(true);const q=x=>h.document.querySelector('[data-pptskill-element-id="'+x+'"]');h.click(q('component-group-text'));h.click(q('component-perf-image'),{shiftKey:true});h.action('group-elements');const before=snap(h),nodes=[q('component-group-text'),q('component-perf-image')],styles=nodes.map(n=>n.getAttribute('style'));
 const status=h.document.querySelector('[data-editor-status]');let text=status.textContent,once=true;Object.defineProperty(status,'textContent',{configurable:true,get(){return text},set(v){text=v;if(once&&v==='手動版面已更新'){once=false;throw Error('group final status')}}});
 h.begin('dragGroup');h.update(40,40,'dragGroup');try{h.finish('dragGroup')}catch(e){assert.match(e.message,/group final status/)}assert.equal(once,false);assert.deepEqual(snap(h),before);assert.deepEqual(nodes.map(n=>n.getAttribute('style')),styles);assert.deepEqual([...h.api.layout.getState().target?.elementIds].sort(),['component-group-text','component-perf-image'].sort());
 h.begin('dragGroup');h.update(40,40,'dragGroup');h.finish('dragGroup');assert.equal(h.getSpec().slides[0].composition.geometryOverrides['group-text'].x,160);console.log('group_rollback_retry PASS');
}
function pointer() {
 const h=mountedEditor(fixture(8));h.ready();h.begin();h.update(8,0);h.resetCounts();for(const kind of ['scroll','resize'])for(const fn of h.window.listeners[kind]||[])fn({target:h.component(),isTrusted:false});for(const fn of h.document.listeners.pointerdown||[])fn({target:h.component(),isTrusted:false});assert.equal(h.counts.payloadReads,0);assert.equal(h.counts.wholeSpecSerializations,0);console.log('pointer_viewport_payload PASS');
}
async function cropEvents() {
 const h=mountedEditor(fixture(0)),q=s=>h.document.querySelector(s);h.ready();h.click(q('[data-pptskill-element-id="component-perf-image"]'));for(const s of ['[data-crop-original]','[data-crop-preview]']){Object.assign(q(s),{complete:true,naturalWidth:240,naturalHeight:160,decode:async()=>{}});Object.assign(q(s).parentElement,{clientWidth:300,clientHeight:170})}
 h.action('crop-selected-image');await new Promise(r=>setImmediate(r));const before=snap(h),dialog=q('[data-crop-dialog]');assert.equal(dialog.open,true);const classification=q('[data-crop-classification]');classification.value='decorative';for(const fn of dialog.listeners.input||[])fn({target:classification});for(const fn of dialog.listeners.change||[])fn({target:classification});assert.deepEqual(snap(h),before);
 for(const fn of dialog.listeners.cancel||[])fn({preventDefault(){}});assert.deepEqual(snap(h),before);assert.equal(dialog.open,false);console.log('crop_module_events_no_execute PASS');
}
function uiTerminal() {
 const h=mountedEditor(fixture(0));h.action('edit');const title=h.document.querySelector('[data-pptskill-element-id="role-title"]');for(const f of h.document.body.listeners.focusin||[])f({target:title});const input=h.document.querySelector('[data-typography-size]');input.value='40';const before=snap(h),style=title.getAttribute('style');let value=input.value,fired=false;Object.defineProperty(input,'value',{configurable:true,get(){return value},set(next){value=next;if(!fired&&next==='40'){fired=true;throw Error('typography after-effect')}}});h.action('apply-typography');assert.equal(fired,true);assert.deepEqual(snap(h),before);assert.equal(title.getAttribute('style'),style);
 const j=mountedEditor(fixture(0));j.action('edit');const node=j.document.querySelector('[data-pptskill-element-id="role-title"]');for(const f of j.document.body.listeners.compositionstart||[])f({target:node});node.textContent='IME pending';const prior=snap(j),failure=Error('IME terminal status');let hit=false;statusHook(j,v=>{if(!hit&&v==='文字已更新'){hit=true;throw failure}});assert.throws(()=>{for(const f of j.document.body.listeners.compositionend||[])f({target:node})},e=>e===failure);assert.equal(hit,true);assert.deepEqual(snap(j),prior);assert.equal(node.textContent,'IME pending');console.log('ui_catch_ime_terminal PASS');
}
function privatePaste() {
 const h=mountedEditor(fixture(0));h.action('edit');const title=h.document.querySelector('[data-pptskill-element-id="role-title"]');for(const f of h.document.body.listeners.focusin||[])f({target:title});const target=edit('').target;h.api.executeOperation({operation:'set-typography',target,value:{fontSize:40}});h.api.executeOperation({operation:'copy-style',target,value:{}});h.api.executeOperation({operation:'set-typography',target,value:{fontSize:60}});h.api.executeOperation({operation:'paste-style',target,value:{}});assert.equal(h.getSpec().slides[0].composition.typographyOverrides['role-title'].fontSize,40);console.log('private_paste_style PASS');
}
async function cropCommitOwner() {
 const h=mountedEditor(fixture(0)),q=s=>h.document.querySelector(s);h.ready();h.click(q('[data-pptskill-element-id="component-perf-image"]'));for(const css of ['[data-crop-original]','[data-crop-preview]']){Object.assign(q(css),{complete:true,naturalWidth:240,naturalHeight:160,decode:async()=>{}});Object.assign(q(css).parentElement,{clientWidth:300,clientHeight:170})}
 h.action('crop-selected-image');await new Promise(r=>setImmediate(r));const dialog=q('[data-crop-dialog]'),classification=q('[data-crop-classification]');classification.value='decorative';for(const fn of dialog.listeners.input||[])fn({target:classification});const confirm=q('[data-crop-confirm]');confirm.checked=true;for(const fn of dialog.listeners.input||[])fn({target:confirm});let seen=false,rejected=false;statusHook(h,v=>{if(v==='裁切已確認'){seen=true;try{h.api.executeOperation(edit('nested'))}catch(e){rejected=/同步交易/.test(e.message)}}});h.action('confirm-crop');assert.equal(seen,true);assert.equal(rejected,true);assert.equal(h.getRevision(),1);assert.equal(h.getSpec().slides[0].content.title,'成果，不鎖在工具裡');console.log('crop_confirm_click_owner PASS');
}
reorder();gesture(false);gesture(true);doubleProjection();group();pointer();uiTerminal();privatePaste();await cropEvents();await cropCommitOwner();
