import { createHash } from 'node:crypto';
import { buildCropHashRuntime } from './crop-hash-vendor.js';

// 同一 contract 序列化到 portable；不保留另一份 editor model。
export function createImageCropContract(hash) {
  const keys=['x','y','width','height'];
  const fields=(o,required,optional=[])=>{
    if(!o||typeof o!=='object'||Array.isArray(o))return false;
    const p=Object.getPrototypeOf(o),ctor=p&&Object.getOwnPropertyDescriptor(p,'constructor');
    if(p!==null&&!(Object.getPrototypeOf(p)===null&&ctor?.value?.name==='Object'&&ctor.value.prototype===p))return false;
    return required.every(k=>Object.hasOwn(o,k))&&Reflect.ownKeys(o).every(k=>[...required,...optional].includes(k)&&Object.hasOwn(Object.getOwnPropertyDescriptor(o,k),'value'));
  };
  const rect=r=>{
    if(!fields(r,keys)||keys.some(k=>!Number.isFinite(r[k]))||r.x<0||r.y<0||r.width<=0||r.height<=0||r.x+r.width>1||r.y+r.height>1)throw Error('裁切矩形必須在完整原圖內，且寬高大於零。');
    return {x:r.x,y:r.y,width:r.width,height:r.height};
  };
  const contains=(a,b)=>b.x>=a.x&&b.y>=a.y&&b.x+b.width<=a.x+a.width&&b.y+b.height<=a.y+a.height;
  const safety=s=>{
    if(!fields(s,['classification','reviewDigest'],['protectedRect'])||!['evidence','decorative'].includes(s.classification)||typeof s.reviewDigest!=='string'||! /^[a-f0-9]{64}$/.test(s.reviewDigest))throw Error('圖片用途或裁切確認資料無效。');
    if(s.classification==='evidence'&&!Object.hasOwn(s,'protectedRect'))throw Error('Evidence 圖片必須標示保護範圍。');
    return {classification:s.classification,...(Object.hasOwn(s,'protectedRect')?{protectedRect:rect(s.protectedRect)}:{}),reviewDigest:s.reviewDigest};
  };
  const sanitize=c=>{
    const out={};
    if(Object.hasOwn(c,'crop'))out.crop=rect(c.crop);
    if(Object.hasOwn(c,'imageSafety'))out.imageSafety=safety(c.imageSafety);
    if(out.crop&&!out.imageSafety)throw Error('裁切缺少圖片用途與確認。');
    if(out.imageSafety?.classification==='evidence'&&c.fit==='cover')throw Error('Evidence 圖片只允許完整顯示，不能填滿裁去上下文。');
    return out;
  };
  // 每個來源僅保留最近一個 tuple；resize/pointer 使用 prepare 後的小 snapshot。
  const cache=new Map();
  const digest=c=>{
    const crop=c.crop?rect(c.crop):null,s=c.imageSafety;
    const protectedRect=s?.protectedRect?rect(s.protectedRect):null;
    const key=JSON.stringify([crop,s?.classification,protectedRect]);
    const previous=cache.get(c.dataUri);if(previous?.key===key)return previous.digest;
    const result=hash(JSON.stringify([c.dataUri,crop,s?.classification,protectedRect]));
    if(!cache.has(c.dataUri)&&cache.size>=32)cache.delete(cache.keys().next().value);
    cache.set(c.dataUri,{key,digest:result});return result;
  };
  const state=c=>{
    const clean=sanitize(c);if(!clean.imageSafety)return 'none';
    if(clean.imageSafety.reviewDigest!==digest({...c,...clean}))return 'pending';
    if(clean.crop&&clean.imageSafety.classification==='evidence'&&!contains(clean.crop,clean.imageSafety.protectedRect))return 'pending';
    return clean.crop?'active':'none';
  };
  const prepare=c=>{
    const status=state(c);
    return {status,rect:status==='active'?rect(c.crop):null,fit:status==='pending'||c.imageSafety?.classification==='evidence'?'contain':c.fit||'contain'};
  };
  const validateRequest=r=>{
    if(!fields(r,['operation','target','value'])||!['crop-image','reset-image-crop'].includes(r.operation)||!fields(r.target,['slideId','elementId'])||typeof r.target.slideId!=='string'||!r.target.slideId||typeof r.target.elementId!=='string'||!/^[a-z0-9][a-z0-9._-]{0,79}$/.test(r.target.elementId))throw Error('裁切操作或圖片目標無效。');
    if(r.operation==='reset-image-crop'){
      if(!fields(r.value,['confirm'])||r.value.confirm!==true)throw Error('還原完整原圖需要確認。');
    }else{
      if(!fields(r.value,[...keys,'classification','confirm'],['protectedRect'])||r.value.confirm!==true||!['evidence','decorative'].includes(r.value.classification))throw Error('請選擇圖片用途並人工確認原圖與結果。');
      const crop=rect(Object.fromEntries(keys.map(k=>[k,r.value[k]])));
      if(Object.hasOwn(r.value,'protectedRect'))rect(r.value.protectedRect);
      if(r.value.classification==='evidence'&&(!r.value.protectedRect||!contains(crop,rect(r.value.protectedRect))))throw Error('裁切不可遮掉 Evidence 保護範圍。');
    }
    return r;
  };
  const update=(slide,r,identities)=>{
    validateRequest(r);const index=identities.components.indexOf(r.target.elementId),c=slide.content.components[index];
    if(slide.id!==r.target.slideId||!c||c.type!=='image')throw Error('裁切目標必須是既有單張圖片。');
    if(r.operation==='reset-image-crop'){
      if(!c.crop)return c;
      delete c.crop;
    }else{
      c.crop=rect(Object.fromEntries(keys.map(k=>[k,r.value[k]])));
      c.imageSafety={classification:r.value.classification,...(r.value.protectedRect?{protectedRect:rect(r.value.protectedRect)}:{})};
      if(r.value.classification==='evidence')c.fit='contain';
    }
    c.imageSafety.reviewDigest=digest(c);return c;
  };
  const projectRect=(r,W,H,Bw,Bh,fit)=>{
    rect(r);if([W,H,Bw,Bh].some(n=>!Number.isFinite(n)||n<=0))return null;
    const k=Math[fit==='cover'?'max':'min'](Bw/(W*r.width),Bh/(H*r.height));
    const n=v=>Number(v.toFixed(12));
    return {width:W*k,height:H*k,left:(Bw-W*r.width*k)/2-r.x*W*k,top:(Bh-H*r.height*k)/2-r.y*H*k,
      clip:'inset('+[r.y,1-r.x-r.width,1-r.y-r.height,r.x].map(v=>n(v*100)+'%').join(' ')+')'};
  };
  const rectSchema={type:'object',additionalProperties:false,required:keys,properties:Object.fromEntries(keys.map(k=>[k,{type:'number',minimum:0,maximum:1,...(['width','height'].includes(k)?{exclusiveMinimum:0}:{})}]))};
  const descriptor=operation=>({
    inputSchema:{type:'object',additionalProperties:false,required:['operation','target','value'],properties:{operation:{const:operation},target:{type:'object',additionalProperties:false,required:['slideId','elementId'],properties:{slideId:{type:'string',minLength:1},elementId:{type:'string',pattern:'^[a-z0-9][a-z0-9._-]{0,79}$'}}},value:operation==='reset-image-crop'?{type:'object',additionalProperties:false,required:['confirm'],properties:{confirm:{const:true}}}:{type:'object',additionalProperties:false,required:[...keys,'classification','confirm'],properties:{...rectSchema.properties,classification:{enum:['evidence','decorative']},protectedRect:rectSchema,confirm:{const:true}}}}},
    allowedTargetRoles:['component'],mutates:operation==='crop-image'?['content.components.image.crop','content.components.image.imageSafety','content.components.image.fit']:['content.components.image.crop','content.components.image.imageSafety.reviewDigest'],
    preserves:['componentIdentity','imageSource','otherContent','geometry','motion','style','background','otherSlides'],destructive:false,confirmation:'required',undoable:false,qaInvalidation:['assets','readability','portableSize'],portableSerialization:'json',unsupportedReason:null,
  });
  return {rect,contains,sanitize,digest,state,prepare,validateRequest,update,projectRect,descriptor,rectSchema};
}
export const imageCrop=createImageCropContract(text=>createHash('sha256').update(text,'utf8').digest('hex'));

// 只擁有 crop 的 CSS／observer；原圖 src 與 figure transform 永不變更。
export function createCropProjection({contract,window}) {
  const records=new Map(),properties=['position','display','max-width','max-height','object-fit','width','height','left','top','clip-path'];
  const snapshot=(node,keys)=>keys.map(k=>[k,node.style.getPropertyValue(k),node.style.getPropertyPriority?.(k)||'']);
  const restore=(node,values)=>values.forEach(([k,v,p])=>v?node.style.setProperty(k,v,p):node.style.removeProperty(k));
  const release=img=>{const r=records.get(img);if(!r)return;reconcile(img,r,false);try{restore(img,r.styles);restore(r.frame,r.frameStyles);}finally{records.delete(img);}};
  const render=(img,frame,p,size)=>{
    if(img.getAttribute('src')===null)return;
    for(const [k,v] of Object.entries({'object-fit':'contain',position:'static',width:'100%',height:'100%','clip-path':'none'}))img.style.setProperty(k,v);
    if(!p.rect)return;
    const box=contract.projectRect(p.rect,img.naturalWidth,img.naturalHeight,size?.width??frame.clientWidth,size?.height??frame.clientHeight,p.fit);
    if(!img.complete||!box)return;
    const position=window.getComputedStyle?.(frame)?.position||frame.style.getPropertyValue('position');
    if(!position||position==='static')frame.style.setProperty('position','relative');
    frame.style.setProperty('overflow','hidden');
    for(const [k,v] of Object.entries({position:'absolute',display:'block','max-width':'none','max-height':'none','object-fit':'fill',width:box.width+'px',height:box.height+'px',left:box.left+'px',top:box.top+'px','clip-path':box.clip}))img.style.setProperty(k,v);
  };
  // observer/listener 與已提交 snapshot 同屬既有 record；失敗不可留下半建 ownership。
  const reconcile=(img,r,active)=>{
    if(active){
      if(!r.observer&&window.ResizeObserver)r.observer=new window.ResizeObserver(r.draw);
      if(r.observer&&!r.observing){try{r.observer.observe(r.frame);r.observing=true;}catch(error){r.observer.disconnect();r.observing=false;throw error;}}
      if(!r.listening){try{img.addEventListener('load',r.draw);img.addEventListener('error',r.error);r.listening=true;}catch(error){img.removeEventListener('load',r.draw);img.removeEventListener('error',r.error);throw error;}}
    }else{r.observer?.disconnect();r.observing=false;img.removeEventListener('load',r.draw);img.removeEventListener('error',r.error);r.listening=false;}
  };
  const checkpoint=img=>{const r=records.get(img);return r?{record:r,projection:r.projection}:null;};
  const rollback=(img,before)=>{
    const r=records.get(img);
    if(!before){if(r){reconcile(img,r,false);records.delete(img);}return;}
    if(r&&r!==before.record)reconcile(img,r,false);
    const previous=before.record;previous.projection=before.projection;records.set(img,previous);reconcile(img,previous,Boolean(previous.projection.rect));
  };
  const sync=(img,c)=>{
    if(!c.crop&&!c.imageSafety){release(img);return;}
    const p=contract.prepare(c),before=checkpoint(img),frame=img.parentElement,oldStyles=snapshot(img,properties),oldFrame=snapshot(frame,['position','overflow']);
    let r=records.get(img);
    if(!r){
      r={frame,styles:oldStyles,frameStyles:oldFrame,projection:null};
      r.draw=()=>{if(img.isConnected===false){release(img);return;}if(r.projection)render(img,frame,r.projection);};
      r.error=()=>render(img,frame,{rect:null,fit:'contain'});
    }
    try{
      render(img,frame,p);
      if(p.status==='none'&&!c.crop){restore(img,r.styles);restore(frame,r.frameStyles);img.style.setProperty('object-fit',p.fit);}
      reconcile(img,r,Boolean(p.rect));
      r.projection=p;records.set(img,r);
    }catch(error){
      if(!before)reconcile(img,r,false);
      rollback(img,before);
      try{restore(img,oldStyles);restore(frame,oldFrame);}catch{}
      throw error;
    }
  };
  const prune=()=>{for(const [img]of records)if(!img.isConnected)release(img);};
  const destroy=()=>{for(const [img]of records)release(img);};
  const copyClean=(img,live,c)=>{
    const r=records.get(live);if(r){restore(img,r.styles);restore(img.parentElement,r.frameStyles);}
    const p=contract.prepare(c);img.style.setProperty('object-fit',p.rect||p.status==='pending'?'contain':p.fit);
  };
  const expectedFit=(img,c)=>{if(!c.crop&&!c.imageSafety)return c.fit||'contain';const p=contract.prepare(c);return p.rect&&img.complete&&contract.projectRect(p.rect,img.naturalWidth,img.naturalHeight,img.parentElement.clientWidth,img.parentElement.clientHeight,p.fit)?'fill':p.rect?'contain':p.fit;};
  return {sync,render,release,prune,destroy,copyClean,checkpoint,rollback,expectedFit};
}
export const buildImageCropRuntime=()=>`${buildCropHashRuntime()};const imageCrop=(${createImageCropContract.toString()})(PPTSKILLCropHash.digest);const createCropProjection=${createCropProjection.toString()};`;

export function buildCropDialogMarkup(){
 const group=(name,title)=>`<fieldset data-crop-group="${name}"><legend>${title}</legend>${[['x','左'],['y','上'],['width','寬'],['height','高']].map(([key,label])=>`<label class="pptskill-crop-field">${label}<input type="number" min="0" max="1" step="0.01" data-crop-field="${name}-${key}" aria-label="${title}${label}" value="${key==='width'||key==='height'?1:0}"><input type="range" min="0" max="1" step="0.01" data-crop-range="${name}-${key}" aria-label="${title}${label}滑桿" value="${key==='width'||key==='height'?1:0}"></label>`).join('')}</fieldset>`;
 return `<dialog class="pptskill-component-dialog pptskill-crop-dialog" data-crop-dialog aria-labelledby="pptskill-crop-label"><h2 id="pptskill-crop-label">裁切圖片</h2><label>圖片用途 <select data-crop-classification aria-label="圖片用途"><option value="">請選擇用途</option><option value="evidence">Evidence／含重要資訊</option><option value="decorative">裝飾圖片</option></select></label><div class="pptskill-crop-previews"><section><h3>完整原圖與保護範圍</h3><div data-crop-original-frame><img data-crop-original alt="完整原圖"><span data-crop-protection aria-hidden="true"></span></div></section><section><h3>裁切結果</h3><div data-crop-preview-stage><div data-crop-preview-frame><img data-crop-preview alt="裁切預覽"></div></div></section></div>${group('rect','裁切範圍')}${group('protected','重要內容保護範圍')}<p>保護範圍請包含座標軸、標籤、圖例及來源註記；程式不判斷圖片真實性或是否漏標。</p><label><input type="checkbox" data-crop-confirm>我已檢視完整原圖與結果，確認重要上下文仍完整。</label><p data-crop-status role="status" aria-live="polite"></p><menu><button type="button" data-action="reset-image-crop">還原完整原圖</button><button type="button" data-action="cancel-crop">取消</button><button type="button" data-action="confirm-crop" disabled>確認裁切</button></menu></dialog>`;
}
export const buildCropDialogCss=()=>`
.pptskill-crop-dialog{box-sizing:border-box;width:min(720px,calc(100vw - 32px));max-height:calc(100vh - 32px);overflow:auto}.pptskill-crop-dialog h2{margin:0 0 12px;font-size:20px;line-height:1.3;font-weight:700}.pptskill-crop-dialog h3{font-size:13px;margin:8px 0}.pptskill-crop-dialog input,.pptskill-crop-dialog select{font:inherit;color:inherit;background:#242424;border:1px solid #ffffff40;border-radius:4px;padding:4px}.pptskill-crop-dialog :focus-visible{outline:2px solid #9ed7ff;outline-offset:2px}.pptskill-crop-previews{display:grid;grid-template-columns:1fr 1fr;gap:12px}.pptskill-crop-previews [data-crop-original-frame],.pptskill-crop-previews [data-crop-preview-frame]{position:relative;height:170px;overflow:hidden;background:#eee}.pptskill-crop-previews section{min-width:0}.pptskill-crop-previews [data-crop-preview-stage]{height:170px;display:flex;align-items:center;justify-content:center}.pptskill-crop-previews img{display:block;width:100%;height:100%;object-fit:contain}.pptskill-crop-dialog fieldset{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin:12px 0;border:1px solid #ffffff30}.pptskill-crop-dialog [hidden]{display:none!important}.pptskill-crop-field{display:grid;grid-template-columns:1em 5em minmax(40px,1fr);gap:6px;align-items:center}.pptskill-crop-field input{min-width:0;width:100%;box-sizing:border-box}.pptskill-crop-dialog [data-crop-protection]{position:absolute;border:2px solid #d32f2f;box-sizing:border-box;pointer-events:none}.pptskill-crop-dialog [data-crop-status]{min-height:1.5em;color:#ffd6a0}.pptskill-crop-dialog button:disabled{opacity:.45;cursor:default}.pptskill-editor [data-pptskill-selected-image-toolbar]{flex-wrap:wrap}.pptskill-crop-dialog menu{flex-wrap:wrap}
`;

export function mountCropDialog({document,window,contract,projection,getTarget,getComponent,getRevision,getCurrentSlide,getBusy,cancelGesture,execute,notify,refresh}){
 const q=s=>document.querySelector(s),dialog=q('[data-crop-dialog]'),original=q('[data-crop-original]'),preview=q('[data-crop-preview]');
 if(!dialog)return null;
 let pending=null,previewObserver=null;
 const say=s=>{q('[data-crop-status]').textContent=s;};
 const close=()=>{const p=pending;pending=null;previewObserver?.disconnect();previewObserver=null;if(dialog.open)dialog.close();original.removeAttribute('src');preview.removeAttribute('src');q('[data-crop-confirm]').checked=false;refresh();if(p?.focus?.isConnected)p.focus.focus?.();};
 const valid=p=>p&&pending===p&&getRevision()===p.revision&&getCurrentSlide()===p.target.slideId&&getTarget()?.elementId===p.target.elementId&&getComponent(p.target)?.dataUri===p.source&&p.node.isConnected;
 const readRect=name=>contract.rect(Object.fromEntries(['x','y','width','height'].map(k=>{const raw=q('[data-crop-field="'+name+'-'+k+'"]').value;return[k,raw===''?NaN:Number(raw)];})));
 const writeRect=(name,r)=>{for(const k of ['x','y','width','height'])for(const attr of ['data-crop-field','data-crop-range'])q('['+attr+'="'+name+'-'+k+'"]').value=String(r[k]);};
 const update=()=>{
   const p=pending;if(!p)return;
   const classification=q('[data-crop-classification]').value,evidence=classification==='evidence';
   q('[data-crop-group="protected"]').hidden=!evidence;q('[data-crop-protection]').hidden=!evidence;
   const button=q('[data-action="confirm-crop"]');button.disabled=true;
   try{
     const rect=readRect('rect'),protectedRect=evidence?readRect('protected'):undefined;
     const value={...rect,classification,...(protectedRect?{protectedRect}:{}),confirm:true};
     // 草稿只驗 shape／幾何；不呼叫 prepare/digest，不序列化 source 或 DeckSpec。
     const stage=q('[data-crop-preview-stage]'),frame=q('[data-crop-preview-frame]'),target=p.node.parentElement;
     const W=target.clientWidth,H=target.clientHeight,scale=Math.min((stage.clientWidth||frame.clientWidth)/W,(stage.clientHeight||170)/H);
     if(W>0&&H>0&&Number.isFinite(scale)&&scale>0){frame.style.setProperty('width',W*scale+'px');frame.style.setProperty('height',H*scale+'px');}
     projection.render(preview,frame,{rect,fit:evidence?'contain':p.fit},W>0&&H>0&&Number.isFinite(scale)&&scale>0?{width:W*scale,height:H*scale}:undefined);
     if(evidence){
       const f=q('[data-crop-original-frame]'),W=original.naturalWidth,H=original.naturalHeight,k=Math.min(f.clientWidth/W,f.clientHeight/H),overlay=q('[data-crop-protection]');
       for(const [key,n]of Object.entries({left:(f.clientWidth-W*k)/2+protectedRect.x*W*k,top:(f.clientHeight-H*k)/2+protectedRect.y*H*k,width:protectedRect.width*W*k,height:protectedRect.height*H*k}))if(Number.isFinite(n))overlay.style.setProperty(key,n+'px');
     }
     contract.validateRequest({operation:'crop-image',target:p.target,value});
     button.disabled=!p.ready||!q('[data-crop-confirm]').checked;
     say(!p.ready?'正在載入原圖…':!q('[data-crop-confirm]').checked?'請檢視原圖與結果後勾選確認。':'可確認裁切');
   }catch(error){say(error.message);}
 };
 const open=async()=>{
   if(pending||getBusy()||!dialog)return;
   const target=getTarget(),c=target&&getComponent(target);if(!c)return;
   const node=document.querySelector('.slide[data-slide-id="'+target.slideId+'"] [data-pptskill-element-id="'+target.elementId+'"] img');if(!node)return;
   cancelGesture();
   const p={target,source:c.dataUri,fit:c.fit||'contain',revision:getRevision(),node,ready:false,focus:q('[data-action="crop-selected-image"]')};pending=p;
   writeRect('rect',c.crop||{x:0,y:0,width:1,height:1});writeRect('protected',c.imageSafety?.protectedRect||{x:0,y:0,width:1,height:1});
   q('[data-crop-classification]').value=c.imageSafety?.classification||'';q('[data-crop-confirm]').checked=false;
   q('[data-action="reset-image-crop"]').disabled=!c.crop;
   original.setAttribute('src',c.dataUri);preview.setAttribute('src',c.dataUri);
   dialog.setAttribute('data-pptskill-editor-chrome','');
   try{
     dialog.showModal();refresh();update();q('[data-crop-classification]').focus?.();
     if(typeof original.decode!=='function'||typeof preview.decode!=='function')throw Error('此環境無法解碼裁切預覽，原圖保持不變。');
     await Promise.all([original.decode(),preview.decode()]);
     if(!valid(p)){if(pending===p){close();notify('裁切目標已失效，請重新開啟。');}return;}
     if(!original.naturalWidth||!original.naturalHeight)throw Error('圖片尺寸無效。');
     p.ready=true;update();if(window.ResizeObserver){previewObserver=new window.ResizeObserver(update);previewObserver.observe(q('[data-crop-preview-stage]'));previewObserver.observe(node.parentElement);}
   }catch(error){if(pending===p){close();notify(error.message);}}
 };
 const submit=reset=>{
   const p=pending;if(!p)return;
   if(!valid(p)||getBusy()){close();notify('裁切目標已失效，請重新開啟。');return;}
   if(!p.ready)return;
   if(!reset&&!q('[data-crop-confirm]').checked){say('請先勾選人工確認。');return;}
   try{
     const classification=q('[data-crop-classification]').value;
     const value=reset?{confirm:true}:{...readRect('rect'),classification,...(classification==='evidence'?{protectedRect:readRect('protected')}:{}),confirm:true};
     execute({operation:reset?'reset-image-crop':'crop-image',target:p.target,value});close();notify(reset?'已還原原圖；保留圖片用途與保護範圍。':'裁切已確認');
   }catch(error){say(error.message);}
 };
 dialog.addEventListener('input',e=>{
   const range=e.target.getAttribute?.('data-crop-range'),field=e.target.getAttribute?.('data-crop-field');
   if(range)q('[data-crop-field="'+range+'"]').value=e.target.value;
   if(field)q('[data-crop-range="'+field+'"]').value=e.target.value;
   if(e.target!==q('[data-crop-confirm]'))q('[data-crop-confirm]').checked=false;
   update();
 });
 dialog.addEventListener('change',update);
 dialog.addEventListener('cancel',e=>{e.preventDefault();close();});dialog.addEventListener('close',()=>{if(pending)close();});
 const invalidate=()=>{if(pending&&!valid(pending)){close();notify('裁切目標已失效，請重新開啟。');}};
 return {open,close,submit,invalidate,isOpen:()=>Boolean(pending)};
}
