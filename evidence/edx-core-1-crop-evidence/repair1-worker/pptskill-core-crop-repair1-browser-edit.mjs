import fs from 'node:fs';
let s=fs.readFileSync('runtime/image-crop.js','utf8').replace('const render=(img,frame,p)=>{','const render=(img,frame,p,size)=>{').replace('frame.clientWidth,frame.clientHeight,p.fit);','size?.width??frame.clientWidth,size?.height??frame.clientHeight,p.fit);').replace("projection.render(preview,frame,{rect,fit:evidence?'contain':p.fit});","projection.render(preview,frame,{rect,fit:evidence?'contain':p.fit},W>0&&H>0&&Number.isFinite(scale)&&scale>0?{width:W*scale,height:H*scale}:undefined);");fs.writeFileSync('runtime/image-crop.js',s);
s=fs.readFileSync('tools/edx-core-crop-browser-cases.mjs','utf8');
s=s.replace("const pixels=async(id,label,expectedCrop=null,fit='contain')=>{\n  const css=selector(id);","const pixels=async(id,label,expectedCrop=null,fit='contain',preview=false)=>{\n  const css=preview?'[data-crop-preview-frame]':selector(id);");
s=s.replace("return{checks,excluded,sourceUnchanged:img.getAttribute('src')===c.dataUri,natural:[img.naturalWidth,img.naturalHeight],frame:[r.width,r.height]};",`const geometry=getComputedStyle(img),iw=parseFloat(geometry.width),ih=parseFloat(geometry.height),left=parseFloat(geometry.left),top=parseFloat(geometry.top),fw=parseFloat(getComputedStyle(f).width),fh=parseFloat(getComputedStyle(f).height);
   const visible=expectedVisible();function expectedVisible(){return Number.isFinite(left)&&Number.isFinite(top)?[Math.max(crop.x,-left/iw),Math.max(crop.y,-top/ih),Math.min(crop.x+crop.width,(fw-left)/iw),Math.min(crop.y+crop.height,(fh-top)/ih)]:null;}
   return{checks,excluded,sourceUnchanged:img.getAttribute('src')===c.dataUri,natural:[img.naturalWidth,img.naturalHeight],frame:[r.width,r.height],visible};`);
s=s.replace("run.checks.push({crop:label,kind:'真 CDP screenshot pixel oracle',...result});","run.checks.push({crop:label,kind:'真 CDP screenshot pixel oracle',...result});return result;");
const end=s.lastIndexOf('\n}');
s=s.slice(0,end)+fs.readFileSync('/private/tmp/pptskill-core-crop-repair1-browser-addition.txt','utf8')+s.slice(end);
fs.writeFileSync('tools/edx-core-crop-browser-cases.mjs',s);
