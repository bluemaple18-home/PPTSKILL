import fs from 'node:fs';
const file='runtime/image-crop.js';let s=fs.readFileSync(file,'utf8');
const start=s.indexOf('  const sync=(img,c)=>{'),end=s.indexOf('  const prune=',start);
s=s.slice(0,start)+`  // observer/listener 與已提交 snapshot 同屬既有 record；失敗不可留下半建 ownership。
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
`+s.slice(end);
s=s.replace("  const checkpoint=img=>records.get(img)?.projection;\n  const rollback=(img,before)=>{const r=records.get(img);if(!r)return;if(before){r.projection=before;}else{r.observer?.disconnect();img.removeEventListener('load',r.draw);img.removeEventListener('error',r.error);records.delete(img);}};\n",'');
s=s.replace('<div data-crop-preview-frame><img data-crop-preview alt="裁切預覽"></div>','<div data-crop-preview-stage><div data-crop-preview-frame><img data-crop-preview alt="裁切預覽"></div></div>');
s=s.replace('.pptskill-crop-previews img{','.pptskill-crop-previews section{min-width:0}.pptskill-crop-previews [data-crop-preview-stage]{height:170px;display:flex;align-items:center;justify-content:center}.pptskill-crop-previews img{');
s=s.replace("     projection.render(preview,q('[data-crop-preview-frame]'),{rect,fit:evidence?'contain':p.fit});",`     const stage=q('[data-crop-preview-stage]'),frame=q('[data-crop-preview-frame]'),target=p.node.parentElement;
     const W=target.clientWidth,H=target.clientHeight,scale=Math.min((stage.clientWidth||frame.clientWidth)/W,(stage.clientHeight||170)/H);
     if(W>0&&H>0&&Number.isFinite(scale)&&scale>0){frame.style.setProperty('width',W*scale+'px');frame.style.setProperty('height',H*scale+'px');}
     projection.render(preview,frame,{rect,fit:evidence?'contain':p.fit});`);
s=s.replace("previewObserver.observe(q('[data-crop-preview-frame]'));","previewObserver.observe(q('[data-crop-preview-stage]'));previewObserver.observe(node.parentElement);");
fs.writeFileSync(file,s);
const editor='runtime/deck-editor.js';s=fs.readFileSync(editor,'utf8');
s="import { buildCropHashLicenseScript } from './crop-hash-vendor.js';\n"+s;
s=s.replace('return String.raw`<script data-pptskill-editor-runtime>', 'return String.raw`${buildCropHashLicenseScript()}<script data-pptskill-editor-runtime>');
const old="old.replaceWith(next);setEdit(editMode);projectCropImages(document,spec)};";
const next="const img=q('img',next);old.replaceWith(next);try{if(img&&component.type==='image')cropProjection.sync(img,component);setEdit(editMode);}catch(error){if(img)cropProjection.release(img);next.replaceWith(old);throw error;}cropDialog?.close();layout?.clearSelection();cropProjection.prune()};";
if(!s.includes(old))throw Error('replaceComponent seam absent');s=s.replace(old,next);
s=s.replace("const replaceComponent=component=>{cropDialog?.close();layout?.clearSelection();",'const replaceComponent=component=>{');
s=s.replace("window.addEventListener?.('pagehide',()=>{cropDialog?.close();cropProjection.destroy();});","window.addEventListener?.('pagehide',()=>{cropDialog?.close();cropProjection.destroy();});\nwindow.addEventListener?.('pageshow',event=>{if(event.persisted){projectCropImages(document,spec);refreshSelectedImage('refresh');}});");
fs.writeFileSync(editor,s);
