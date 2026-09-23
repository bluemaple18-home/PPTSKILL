import assert from 'node:assert/strict';
import {createDeckEditor} from '/Users/matt/Documents/ChatGPT/skill 工廠/PPTSKILL-canonical/runtime/deck-editor.js';
import {extractDeckSpec} from '/Users/matt/Documents/ChatGPT/skill 工廠/PPTSKILL-canonical/runtime/deck-spec.js';
import {renderFullDeck} from '/Users/matt/Documents/ChatGPT/skill 工廠/PPTSKILL-canonical/runtime/full-deck-renderer.js';
import {fixture,mountedEditor} from '/Users/matt/Documents/ChatGPT/skill 工廠/PPTSKILL-canonical/tools/edx-wp1-s4-perf-mounted.mjs';
const request=text=>({operation:'insert-element',target:{slideId:'portable'},value:{component:{id:'independent',type:'text',text},geometry:{x:80,y:80,width:400,height:200}}});
let passed=0;
for(const mounted of [false,true]){
 const initial=fixture(0);initial.slides[0].content.components[1].dataUri='data:image/png;base64,AA==';
 const h=mounted?mountedEditor(initial):null, api=h?.api??createDeckEditor(initial), read=()=>h?h.getSpec():api.getSpec();
 const payload='  e\u0301\n\u212b\u2028\u2029😀 &lt;script&gt; </script><script>alert(1)</script>  ';
 api.executeOperation(request(payload));assert.equal(read().slides[0].content.components.at(-1).text,payload);assert.notEqual(payload,payload.normalize('NFC'));
 if(h){const el=h.document.querySelector('[data-edit-target="slides.portable.content.components.independent"]');assert.equal(el.textContent,payload);assert.equal(el.querySelector('script'),null);assert.equal(el.contentEditable,'false');}
 const html=h?api.exportHtml():renderFullDeck(read()).html;assert.equal(extractDeckSpec(html).slides[0].content.components.at(-1).text,payload);console.log('PASS '+(mounted?'mounted':'Node')+' 非 NFC／空白／換行／HTML-like canonical 與 export 保真');passed++;
 const before=read();assert.throws(()=>api.executeOperation({operation:'edit-text',target:{slideId:'portable',elementId:'component-independent'},value:'不得直編'}));assert.deepEqual(read(),before);console.log('PASS '+(mounted?'mounted':'Node')+' 新文字 S1 authority 邊界');passed++;
 let calls=0;const bad=request('x');bad.value.component.id='new';Object.defineProperty(bad.value.component,'text',{get(){calls++;return 'getter'},enumerable:true});assert.throws(()=>api.executeOperation(bad));assert.equal(calls,0);assert.deepEqual(read(),before);console.log('PASS '+(mounted?'mounted':'Node')+' 非 throw getter 仍拒絕／讀取 0');passed++;
 const max=request('e\u0301'.repeat(250));max.value.component.id='max';api.executeOperation(max);assert.equal([...read().slides[0].content.components.at(-1).text].length,500);max.value.component.id='over';max.value.component.text+='x';const atLimit=read();assert.throws(()=>api.executeOperation(max));assert.deepEqual(read(),atLimit);console.log('PASS '+(mounted?'mounted':'Node')+' combining 500／501 code-point 邊界');passed++;
}
console.log(JSON.stringify({passed,failed:0,scope:'Node 及 mounted DOM double；非 fresh browser'}));
