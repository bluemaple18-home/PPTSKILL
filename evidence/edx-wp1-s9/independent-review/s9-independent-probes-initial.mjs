import assert from 'node:assert/strict';
import test from 'node:test';
import {readFileSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
const root=process.cwd();
let src=readFileSync(root+'/tools/edx-wp1-s4-perf-mounted.mjs','utf8');
src=src.replaceAll("'../runtime/", "'"+pathToFileURL(root+'/runtime/').href).replaceAll('import.meta.url',JSON.stringify(pathToFileURL(root+'/tools/edx-wp1-s4-perf-mounted.mjs').href));
// 僅在記憶體加入唯讀 revision getter，產品檔案不改。
src=src.replace('buildDeckEditorRuntimeScript().replace(',`buildDeckEditorRuntimeScript().replace('window.PPTSKILLEditor={layout,','window.PPTSKILLEditor={__revision:()=>revision,layout,').replace(`);
const {fixture,mountedEditor}=await import('data:text/javascript;base64,'+Buffer.from(src).toString('base64'));
const {extractDeckSpec}=await import(pathToFileURL(root+'/runtime/deck-spec.js'));
const setup=()=>{const s=fixture(0);s.slides[0].composition.geometryOverrides['perf-image']={x:81,y:81,width:241,height:161};s.slides.push({...structuredClone(s.slides[0]),id:'other'});const h=mountedEditor(s);h.ready();h.click(h.document.querySelector('[data-pptskill-element-id="component-perf-image"]'),{shiftKey:true});return h;};
const selection=h=>Array.from(h.api.layout.getSelectionState().selected);
for(const alignment of ['left','center-x','right','top','center-y','bottom'])test('獨立：'+alignment+' revision / preserve / no-op / export',()=>{
 const h=setup(),before=h.getSpec(),ids=selection(h),rev=h.api.__revision();h.action('align-'+alignment);const after=h.getSpec();assert.equal(h.api.__revision(),rev+1);assert.deepEqual(selection(h),ids);
 const original=structuredClone(before),changed=structuredClone(after);delete original.slides[0].composition.geometryOverrides;delete changed.slides[0].composition.geometryOverrides;assert.deepEqual(changed,original);
 const boxes=Object.values(after.slides[0].composition.geometryOverrides),field=alignment.includes('y')||['top','bottom'].includes(alignment)?'y':'x',size=field==='x'?'width':'height';
 const edge=b=>b[field]+(['right','bottom'].includes(alignment)?b[size]:alignment.startsWith('center')?b[size]/2:0);
 assert.ok(Math.abs(edge(boxes[0])-edge(boxes[1]))<=0.5);
 h.action('align-'+alignment);assert.equal(h.api.__revision(),rev+1);assert.deepEqual(h.getSpec(),after);
 const html=h.api.exportHtml();assert.deepEqual(extractDeckSpec(html),after);assert.doesNotMatch(html,/data-pptskill-context-toolbar|data-editor-selected="true"/);assert.deepEqual(selection(h),ids);
 const reopened=mountedEditor(extractDeckSpec(html));assert.equal(selection(reopened).length,0);
});
test('獨立：late missing geometry 原子拒絕，revision／selection 不變',()=>{const s=fixture(0),h=mountedEditor(s);h.ready();h.click(h.document.querySelector('[data-pptskill-element-id="component-perf-image"]'),{shiftKey:true});const before=h.getSpec(),ids=selection(h),rev=h.api.__revision();h.action('align-left');assert.deepEqual(h.getSpec(),before);assert.equal(h.api.__revision(),rev);assert.deepEqual(selection(h),ids);});
test('獨立：multi-selection Arrow 不誤寫 single geometry；Escape 清除',()=>{const h=setup(),before=h.getSpec();const key=k=>{for(const fn of h.document.listeners.keydown||[])fn({key:k,target:h.document.body,preventDefault(){},stopImmediatePropagation(){}})};key('ArrowRight');assert.deepEqual(h.getSpec(),before);key('Escape');assert.equal(selection(h).length,0);assert.equal(h.document.querySelector('[data-pptskill-context-toolbar]').hidden,true);});
test('獨立：toolbar focus 擁有鍵盤；失焦回 single 後 nudge 一次',()=>{const h=setup(),b=h.document.querySelector('[data-action="align-left"]');h.action('align-left');const before=h.getSpec();h.document.activeElement=b;for(const fn of h.document.listeners.keydown||[])fn({key:'ArrowRight',target:b,preventDefault(){},stopImmediatePropagation(){}});assert.deepEqual(h.getSpec(),before);h.document.activeElement=null;h.click(h.component());const rev=h.api.__revision();for(const fn of h.document.listeners.keydown||[])fn({key:'ArrowRight',target:h.document.body,preventDefault(){},stopImmediatePropagation(){}});assert.equal(h.api.__revision(),rev+1);assert.equal(h.getSpec().slides[0].composition.geometryOverrides['portable-quote'].x,82);});
