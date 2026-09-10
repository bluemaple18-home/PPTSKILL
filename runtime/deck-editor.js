import { sanitizeDeckSpec, validateDeckSpec } from './deck-spec.js';

const clone = (value) => JSON.parse(JSON.stringify(value));

const uniqueSlideId = (slides, baseId) => {
  let suffix = 1;
  let candidate = `${baseId}-copy-${suffix}`;
  const ids = new Set(slides.map(({ id }) => id));
  while (ids.has(candidate)) candidate = `${baseId}-copy-${suffix += 1}`;
  return candidate;
};

const findSlide = (spec, slideId) => {
  const slide = spec.slides.find((item) => item.id === slideId);
  if (!slide) throw new Error(`找不到 slide：${slideId}`);
  return slide;
};

export function createDeckEditor(input) {
  let spec = sanitizeDeckSpec(input);

  const commit = (candidate) => {
    const clean = sanitizeDeckSpec(candidate);
    const validation = validateDeckSpec(clean);
    if (validation.status !== 'pass') throw new Error(validation.errors.join(' '));
    spec = clean;
    return clone(spec);
  };

  return {
    getSpec: () => clone(spec),
    editText(slideId, field, value) {
      if (!['title', 'subtitle'].includes(field)) throw new Error('只允許直接編輯 title 或 subtitle。');
      const candidate = clone(spec);
      findSlide(candidate, slideId).content[field] = String(value);
      return commit(candidate);
    },
    editKeyPoint(slideId, index, value) {
      const candidate = clone(spec);
      const points = findSlide(candidate, slideId).content.keyPoints;
      if (!Number.isInteger(index) || index < 0 || index >= points.length) throw new Error('keyPoint index 超出範圍。');
      points[index] = String(value);
      return commit(candidate);
    },
    editComponent(slideId, componentId, changes) {
      const candidate = clone(spec);
      const components = findSlide(candidate, slideId).content.components;
      const index = components.findIndex(({ id }) => id === componentId);
      if (index < 0) throw new Error(`找不到 component：${componentId}`);
      components[index] = { ...components[index], ...clone(changes), id: componentId, type: components[index].type };
      return commit(candidate);
    },
    replaceImage(slideId, componentId, { dataUri, alt = '', fit = 'contain' }) {
      return this.editComponent(slideId, componentId, { dataUri, alt, fit });
    },
    reorder(fromIndex, toIndex) {
      if (![fromIndex, toIndex].every((value) => Number.isInteger(value) && value >= 0 && value < spec.slides.length)) throw new Error('reorder index 超出範圍。');
      const candidate = clone(spec);
      const [slide] = candidate.slides.splice(fromIndex, 1);
      candidate.slides.splice(toIndex, 0, slide);
      return commit(candidate);
    },
    duplicate(index) {
      if (spec.slides.length >= 15) throw new Error('投影片上限為 15 頁。');
      if (!Number.isInteger(index) || index < 0 || index >= spec.slides.length) throw new Error('duplicate index 超出範圍。');
      const candidate = clone(spec);
      const copy = clone(candidate.slides[index]);
      copy.id = uniqueSlideId(candidate.slides, copy.id);
      candidate.slides.splice(index + 1, 0, copy);
      commit(candidate);
      return copy.id;
    },
    delete(index) {
      if (spec.slides.length === 1) throw new Error('至少保留一張投影片。');
      if (!Number.isInteger(index) || index < 0 || index >= spec.slides.length) throw new Error('delete index 超出範圍。');
      const candidate = clone(spec);
      candidate.slides.splice(index, 1);
      return commit(candidate);
    },
    applyLocalPatch({ slideId, region, value }) {
      if (region === 'content.title') return this.editText(slideId, 'title', value);
      if (region === 'content.subtitle') return this.editText(slideId, 'subtitle', value);
      const pointMatch = /^content\.keyPoints\.(\d+)$/.exec(region);
      if (pointMatch) return this.editKeyPoint(slideId, Number(pointMatch[1]), value);
      const componentMatch = /^content\.components\.([a-z0-9][a-z0-9._-]{0,79})$/i.exec(region);
      if (componentMatch && value && typeof value === 'object') return this.editComponent(slideId, componentMatch[1], value);
      throw new Error('local AI patch 必須指向單一支援的 slide content region。');
    },
  };
}

export const buildDeckEditorCss = () => `
.pptskill-editor{position:fixed;right:18px;bottom:18px;z-index:10000;display:flex;align-items:center;gap:7px;padding:9px;border:1px solid #ffffff2e;border-radius:12px;background:#151515ee;color:#fff;font:600 13px/1.2 "Microsoft JhengHei","Microsoft JhengHei UI","PingFang TC",sans-serif;box-shadow:0 12px 34px #0005;backdrop-filter:blur(12px);opacity:.28;transition:opacity 120ms ease}.pptskill-editor:hover,.pptskill-editor:focus-within,body[data-editor-mode="edit"] .pptskill-editor{opacity:1}.pptskill-editor>:not([data-action="edit"]){display:none}body[data-editor-mode="edit"] .pptskill-editor>*{display:inline-flex}body[data-editor-mode="edit"] .pptskill-editor__file{display:block}
.pptskill-editor button,.pptskill-editor label{appearance:none;border:1px solid #ffffff30;border-radius:7px;background:#2a2a2a;color:inherit;padding:8px 10px;font:inherit;cursor:pointer}.pptskill-editor button:hover,.pptskill-editor label:hover{background:#3b3b3b}.pptskill-editor button:focus-visible,.pptskill-editor label:focus-visible{outline:2px solid #9ed7ff;outline-offset:2px}.pptskill-editor [data-action="save"]{background:#f1eee7;color:#181818}.pptskill-editor__status{min-width:88px;color:#d7d7d7;font-weight:500}.pptskill-editor__file{position:absolute;width:1px;height:1px;opacity:0;pointer-events:none}.pptskill-component-dialog{width:min(680px,calc(100vw - 40px));border:1px solid #ffffff30;border-radius:14px;background:#181818;color:#fff;padding:20px;font:600 14px/1.5 "Microsoft JhengHei","Microsoft JhengHei UI","PingFang TC",sans-serif}.pptskill-component-dialog::backdrop{background:#0009}.pptskill-component-dialog textarea{display:block;width:100%;min-height:280px;margin:12px 0;padding:12px;border:1px solid #ffffff30;border-radius:8px;background:#0f0f0f;color:#fff;font:500 13px/1.45 ui-monospace,monospace}.pptskill-component-dialog menu{display:flex;justify-content:flex-end;gap:8px;margin:0;padding:0}.pptskill-component-dialog button{padding:8px 12px}
body[data-editor-mode="edit"] [data-edit-kind="text"]{outline:2px dashed #2f82ff;outline-offset:4px;cursor:text}body[data-editor-mode="edit"] .slide[data-editor-selected="true"]{box-shadow:0 0 0 4px #2f82ff inset}
@media print{.pptskill-editor{display:none!important}.slide[data-editor-selected="true"]{box-shadow:none}}
`;

export const buildDeckEditorMarkup = () => `<nav class="pptskill-editor" data-pptskill-editor aria-label="簡報編輯器"><button type="button" data-action="edit">編輯文字</button><button type="button" data-action="edit-component">編輯元件</button><button type="button" data-action="move-up">上移</button><button type="button" data-action="move-down">下移</button><button type="button" data-action="duplicate">複製</button><button type="button" data-action="delete">刪除</button><label for="pptskill-image-input">替換圖片</label><input class="pptskill-editor__file" id="pptskill-image-input" type="file" accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml"><button type="button" data-action="save">另存 HTML</button><span class="pptskill-editor__status" data-editor-status aria-live="polite">可直接播放</span></nav><dialog class="pptskill-component-dialog" data-component-dialog><strong>編輯目前頁面的支援元件</strong><p>只接受 DeckSpec allowlist 內的 text、image、table、chart 或 public citation。</p><textarea data-component-json spellcheck="false"></textarea><menu><button type="button" data-action="cancel-component">取消</button><button type="button" data-action="apply-component">套用</button></menu></dialog>`;

export const buildDeckEditorRuntimeScript = () => String.raw`<script data-pptskill-editor-runtime>(()=>{const boot=()=>{
const q=(s,r=document)=>r.querySelector(s),qa=(s,r=document)=>[...r.querySelectorAll(s)],clone=v=>JSON.parse(JSON.stringify(v));
const tag=q('#deck-spec');if(!tag)return;let spec=JSON.parse(tag.textContent);const safeStyle=clone(spec.style);let currentId=spec.slides[0]?.id||'';let editMode=false;let editingComponentId='';
const status=m=>{const e=q('[data-editor-status]');if(e)e.textContent=m};
const currentIndex=()=>spec.slides.findIndex(s=>s.id===currentId);const currentNode=()=>q('.slide[data-slide-id="'+CSS.escape(currentId)+'"]');
const select=id=>{currentId=id;qa('.slide').forEach(s=>s.dataset.editorSelected=String(s.dataset.slideId===id));};
const pointTarget=(id,i)=>'slides.'+id+'.content.keyPoints.'+i;
const syncText=()=>qa('[data-edit-kind="text"]').forEach(el=>{const t=el.dataset.editTarget||'',slide=spec.slides.find(s=>t.startsWith('slides.'+s.id+'.content.'));if(!slide)return;const field=t.slice(('slides.'+slide.id+'.content.').length);if(field==='title'||field==='subtitle'){slide.content[field]=el.textContent.trim();return}const p=/^keyPoints\.(\d+)$/.exec(field);if(p&&slide.content.keyPoints[Number(p[1])]!==undefined){slide.content.keyPoints[Number(p[1])]=el.textContent.trim();return}if(field.startsWith('components.')){const id=field.slice(11),component=slide.content.components.find(x=>x.id===id);if(component?.type==='text')component.text=el.textContent.trim();if(component?.type==='citation')component.label=el.textContent.trim()}});
const renumber=()=>{const total=spec.slides.length;qa('.slide').forEach((slide,index)=>{qa('[data-editor-folio]',slide).forEach(el=>{const kind=el.dataset.editorFolio;el.textContent=kind==='system'?'SYS.'+String(index+1).padStart(2,'0')+' / '+String(total).padStart(2,'0'):String(index+1).padStart(2,'0')+' / '+String(total).padStart(2,'0')})})};
const setEdit=on=>{editMode=on;document.body.dataset.editorMode=on?'edit':'play';qa('[data-edit-kind="text"]').forEach(el=>el.contentEditable=String(on));q('[data-action="edit"]').textContent=on?'完成編輯':'編輯文字';status(on?'正在編輯':'變更已保留')};
const uniqueId=base=>{let n=1,id=base+'-copy-'+n,ids=new Set(spec.slides.map(s=>s.id));while(ids.has(id))id=base+'-copy-'+(++n);return id};
const retarget=(node,oldId,newId)=>{node.id=newId;node.dataset.slideId=newId;qa('[data-edit-target]',node).forEach(el=>el.dataset.editTarget=el.dataset.editTarget.replace('slides.'+oldId+'.','slides.'+newId+'.'))};
const sanitizeComponent=c=>{if(!c||typeof c!=='object'||typeof c.id!=='string')return null;const b={id:c.id,type:String(c.type||'')};if(b.type==='text')return {...b,text:String(c.text||'')};const imageMime=String(c.dataUri||'').slice(11).split(';',1)[0];if(b.type==='image'&&String(c.dataUri||'').startsWith('data:image/')&&['png','jpeg','webp','gif','svg+xml'].includes(imageMime))return {...b,alt:String(c.alt||''),dataUri:c.dataUri,...(['contain','cover'].includes(c.fit)?{fit:c.fit}:{})};if(b.type==='table')return {...b,headers:Array.isArray(c.headers)?c.headers.slice(0,12).map(String):[],rows:Array.isArray(c.rows)?c.rows.slice(0,30).map(r=>Array.isArray(r)?r.slice(0,12).map(v=>['string','number','boolean'].includes(typeof v)||v===null?v:''):[]):[]};if(b.type==='chart')return {...b,chartType:String(c.chartType||''),labels:Array.isArray(c.labels)?c.labels.map(String):[],series:Array.isArray(c.series)?c.series.map(s=>({name:String(s?.name||''),values:Array.isArray(s?.values)?s.values.filter(v=>typeof v==='number'):[]})):[]};if(b.type==='citation'&&c.public===true){const url=String(c.url||'');return {...b,label:String(c.label||''),...(url.startsWith('http://')||url.startsWith('https://')?{url}:{}) ,public:true}}return null};
const clean=()=>({schemaVersion:'1.0',deckId:String(spec.deckId||'deck'),title:String(spec.title||'Untitled deck'),language:String(spec.language||'zh-Hant'),style:clone(safeStyle),slides:spec.slides.slice(0,15).map((s,i)=>({id:String(s.id||'slide-'+String(i+1).padStart(2,'0')),content:{title:String(s.content?.title||''),subtitle:String(s.content?.subtitle||''),keyPoints:Array.isArray(s.content?.keyPoints)?s.content.keyPoints.slice(0,5).map(String):[],components:Array.isArray(s.content?.components)?s.content.components.map(sanitizeComponent).filter(Boolean):[]},composition:{primitive:String(s.composition?.primitive||'title-body'),variant:String(s.composition?.variant||'default'),slots:Object.fromEntries(Object.entries(s.composition?.slots||{}).filter(([,v])=>typeof v==='string'&&/^content\.(title|subtitle|keyPoints|components\.[a-z0-9][a-z0-9._-]{0,79})$/.test(v))),...(Array.isArray(s.composition?.order)?{order:s.composition.order.map(String)}:{})}}))});
const serializeHtml=()=>{syncText();spec=clean();tag.textContent=JSON.stringify(spec).replaceAll('<','\\u003c');const root=document.documentElement.cloneNode(true);qa('[contenteditable]',root).forEach(el=>el.removeAttribute('contenteditable'));qa('.slide[data-editor-selected]',root).forEach(el=>el.removeAttribute('data-editor-selected'));root.querySelector('body').dataset.editorMode='play';const state=q('[data-editor-status]',root);if(state)state.textContent='可直接播放';return '<!doctype html>'+root.outerHTML};
const prepareExport=()=>{const html=serializeHtml();if(!window.PPTSKILLSizeGuard)throw new Error('Portable size guard 未載入。');return window.PPTSKILLSizeGuard.prepare(html,spec)};
const exportHtml=()=>{const prepared=prepareExport();if(prepared.status==='fail')throw new Error('HTML 超過 20 MiB 上限；請先替換過大的圖片。');return prepared.html};
const download=()=>{try{const prepared=prepareExport();if(prepared.status==='fail'){status('匯出失敗：HTML 超過 20 MiB');return false}const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([prepared.html],{type:'text/html;charset=utf-8'}));a.download=(spec.deckId||'deck')+'.html';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),0);status(prepared.status==='warn'?'已另存 HTML（檔案偏大）':'已另存 HTML');return true}catch(error){status(error.message);return false}};
const move=delta=>{syncText();const i=currentIndex(),to=i+delta;if(i<0||to<0||to>=spec.slides.length)return;[spec.slides[i],spec.slides[to]]=[spec.slides[to],spec.slides[i]];const node=currentNode(),other=delta<0?node.previousElementSibling:node.nextElementSibling;if(delta<0)node.parentNode.insertBefore(node,other);else node.parentNode.insertBefore(other,node);renumber();status('已調整順序')};
const duplicate=()=>{syncText();if(spec.slides.length>=15){status('最多 15 頁');return}const i=currentIndex(),source=spec.slides[i],copy=clone(source),id=uniqueId(source.id);copy.id=id;spec.slides.splice(i+1,0,copy);const node=currentNode(),next=node.cloneNode(true);retarget(next,source.id,id);node.after(next);select(id);renumber();next.scrollIntoView({behavior:'smooth',block:'start'});setEdit(editMode);status('已複製投影片')};
const remove=()=>{if(spec.slides.length===1){status('至少保留一頁');return}const i=currentIndex(),node=currentNode();spec.slides.splice(i,1);const next=node.nextElementSibling||node.previousElementSibling;node.remove();select(next.dataset.slideId);renumber();next.scrollIntoView({behavior:'smooth',block:'start'});status('已刪除投影片')};
const esc=v=>String(v??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
const renderComponent=c=>{const target='slides.'+currentId+'.content.components.'+c.id;if(c.type==='image')return '<figure class="asset image-asset" data-effect-role="image" data-edit-target="'+esc(target)+'"><img src="'+esc(c.dataUri)+'" alt="'+esc(c.alt)+'" style="object-fit:'+(c.fit||'contain')+'"></figure>';if(c.type==='text')return '<blockquote class="asset text-asset" data-effect-role="visualAnchor" data-edit-kind="text" data-edit-target="'+esc(target)+'">'+esc(c.text)+'</blockquote>';if(c.type==='citation')return '<p class="asset citation-asset" data-edit-kind="text" data-edit-target="'+esc(target)+'">'+(c.url?'<a href="'+esc(c.url)+'">'+esc(c.label)+'</a>':esc(c.label))+'</p>';if(c.type==='table')return '<div class="asset table-asset" data-effect-role="diagram" data-edit-target="'+esc(target)+'"><table><thead><tr>'+c.headers.map(h=>'<th>'+esc(h)+'</th>').join('')+'</tr></thead><tbody>'+c.rows.map(r=>'<tr>'+r.map(v=>'<td>'+esc(v)+'</td>').join('')+'</tr>').join('')+'</tbody></table></div>';if(c.type==='chart'){const max=Math.max(1,...c.series.flatMap(s=>s.values.map(Math.abs)));return '<div class="asset chart-asset" data-effect-role="diagram" data-edit-target="'+esc(target)+'">'+c.series.map(s=>'<section><b>'+esc(s.name)+'</b>'+s.values.map((v,i)=>'<div class="bar-row"><span>'+esc(c.labels[i]||'')+'</span><i style="--bar:'+Math.max(0,Math.min(100,Math.round(Math.abs(v)/max*100)))+'%"></i><em>'+esc(v)+'</em></div>').join('')+'</section>').join('')+'</div>'}return ''};
const replaceComponent=component=>{const target='slides.'+currentId+'.content.components.'+component.id,old=qa('[data-edit-target]',currentNode()).find(el=>el.dataset.editTarget===target);if(!old)return;const template=document.createElement('template');template.innerHTML=renderComponent(component);const next=template.content.firstElementChild;if(old.dataset.effectTreatment)next.dataset.effectTreatment=old.dataset.effectTreatment;old.replaceWith(next);setEdit(editMode)};
const applyPatch=p=>{syncText();if(!p||p.slideId!==currentId)throw new Error('patch 必須指向目前選取的 slide。');const slide=spec.slides[currentIndex()];if(p.region==='content.title'||p.region==='content.subtitle'){const field=p.region.slice(8);slide.content[field]=String(p.value);const el=qa('[data-edit-target]',currentNode()).find(x=>x.dataset.editTarget==='slides.'+currentId+'.content.'+field);if(el)el.textContent=slide.content[field];return clean()}const m=/^content\.keyPoints\.(\d+)$/.exec(p.region);if(m){const i=Number(m[1]);if(i>=slide.content.keyPoints.length)throw new Error('keyPoint index 超出範圍。');slide.content.keyPoints[i]=String(p.value);const el=qa('[data-edit-target]',currentNode()).find(x=>x.dataset.editTarget===pointTarget(currentId,i));if(el)el.textContent=slide.content.keyPoints[i];return clean()}const c=/^content\.components\.([a-z0-9][a-z0-9._-]{0,79})$/i.exec(p.region);if(c&&p.value&&typeof p.value==='object'){const i=slide.content.components.findIndex(x=>x.id===c[1]);if(i<0)throw new Error('找不到 component。');slide.content.components[i]={...slide.content.components[i],...clone(p.value),id:c[1],type:slide.content.components[i].type};spec=clean();const component=spec.slides[currentIndex()].content.components.find(x=>x.id===c[1]);if(!component)throw new Error('元件 patch 未通過 sanitizer。');replaceComponent(component);return spec}throw new Error('patch region 不在 allowlist。')};
const openComponentEditor=()=>{syncText();const component=spec.slides[currentIndex()].content.components[0];if(!component){status('此頁沒有支援元件');return}editingComponentId=component.id;q('[data-component-json]').value=JSON.stringify(component,null,2);q('[data-component-dialog]').showModal()};
const applyComponentEditor=()=>{try{const value=JSON.parse(q('[data-component-json]').value);applyPatch({slideId:currentId,region:'content.components.'+editingComponentId,value});q('[data-component-dialog]').close();status('元件已更新')}catch(error){status(error.message)}};
document.addEventListener('click',e=>{const slide=e.target.closest?.('.slide');if(slide)select(slide.dataset.slideId);const action=e.target.closest?.('[data-action]')?.dataset.action;if(!action)return;if(action==='edit'){syncText();setEdit(!editMode)}if(action==='edit-component')openComponentEditor();if(action==='apply-component')applyComponentEditor();if(action==='cancel-component')q('[data-component-dialog]').close();if(action==='move-up')move(-1);if(action==='move-down')move(1);if(action==='duplicate')duplicate();if(action==='delete')remove();if(action==='save')download()});
const replaceImageFile=async file=>{if(!file)return null;if(!window.PPTSKILLAssets)throw new Error('Asset optimizer 未載入。');const slide=spec.slides[currentIndex()],component=slide.content.components.find(c=>c.type==='image');if(!component)throw new Error('此頁沒有可替換圖片。');status('正在最佳化圖片…');const result=await window.PPTSKILLAssets.optimizeFile(file);component.dataUri=result.dataUri;const img=q('.slide[data-slide-id="'+CSS.escape(currentId)+'"] [data-edit-target="slides.'+CSS.escape(currentId)+'.content.components.'+CSS.escape(component.id)+'"] img');if(img)img.src=result.dataUri;status(result.warnings.length?'圖片已替換（保留大型 GIF）':result.optimized?'圖片已最佳化並替換':'圖片已替換');return result};
q('#pptskill-image-input')?.addEventListener('change',async e=>{try{await replaceImageFile(e.target.files?.[0])}catch(error){status(error.message)}});
qa('.slide').forEach(slide=>slide.addEventListener('focusin',()=>select(slide.dataset.slideId)));select(currentId);document.body.dataset.editorMode='play';
window.PPTSKILLEditor={getDeckSpec:()=>clone(clean()),applyLocalPatch:p=>{const out=applyPatch(p);status('已套用本機 AI patch');return clone(out)},replaceImageFile,prepareExport,exportHtml,getSizeReport:()=>prepareExport().report,download};
};if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot()})();</script>`;
