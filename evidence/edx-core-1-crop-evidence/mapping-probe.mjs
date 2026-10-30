import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';

// 純數學研究：沒有載入 repo、Cropper、DOM、decoder 或 rasterizer。
const EPS = 1e-9;
let checks = 0;
const check = (condition) => { assert.ok(condition); checks++; };
const near = (a, b) => check(Math.abs(a - b) < EPS);
const sameRect = (a, b) => ['x', 'y', 'width', 'height'].forEach(k => near(a[k], b[k]));
const validRect = r => r && ['x','y','width','height'].every(k => Number.isFinite(r[k]))
  && r.x >= 0 && r.y >= 0 && r.width > 0 && r.height > 0
  && r.x + r.width <= 1 && r.y + r.height <= 1;
const contains = (a, b) => b.x >= a.x - EPS && b.y >= a.y - EPS
  && b.x + b.width <= a.x + a.width + EPS && b.y + b.height <= a.y + a.height + EPS;
const fitScale = (W, H, B, fit) => (fit === 'contain' ? Math.min : Math.max)(B.width/W, B.height/H);
const px = (r, W, H) => ({x:r.x*W,y:r.y*H,width:r.width*W,height:r.height*H});
const norm = (r, W, H) => ({x:r.x/W,y:r.y/H,width:r.width/W,height:r.height/H});
const matrix = (W,H,B,fit,z,pan,viewport) => {
  const k = fitScale(W,H,B,fit), ox = (B.width-k*W)/2, oy = (B.height-k*H)/2;
  const cx=B.width/2,cy=B.height/2;
  // 先置中 fit，再以 canvas 中心 zoom/pan，最後套外層 viewport scale/offset。
  return [viewport.scale*z*k,0,0,viewport.scale*z*k,
    viewport.left+viewport.scale*(cx+z*(ox-cx)+pan.x),
    viewport.top+viewport.scale*(cy+z*(oy-cy)+pan.y)];
};
const forward = (r,m) => ({x:m[0]*r.x+m[4],y:m[3]*r.y+m[5],width:m[0]*r.width,height:m[3]*r.height});
const inverse = (r,m) => {
  if (!m.every(Number.isFinite) || m[1]!==0 || m[2]!==0 || m[0]<=0 || m[3]<=0) throw Error('不支援旋轉、skew、flip 或退化矩陣');
  return {x:(r.x-m[4])/m[0],y:(r.y-m[5])/m[3],width:r.width/m[0],height:r.height/m[3]};
};
const R={x:.2,y:.15,width:.5,height:.6};
check(validRect(R));
const rows=[];
for (const [W,H] of [[1200,800],[600,1200]]) for (const fit of ['contain','cover'])
  for (const [width,height] of [[1280,720],[1600,900]]) for (const zoom of [1,1.6]) {
    const viewport={scale:width/1600,left:71,top:43}, B={width:480,height:360};
    const pan=zoom===1?{x:0,y:0}:{x:23,y:-17};
    const m=matrix(W,H,B,fit,zoom,pan,viewport), selection=forward(px(R,W,H),m);
    const result=norm(inverse(selection,m),W,H);
    sameRect(result,R);
    const wrong={x:(selection.x-viewport.left)/(B.width*viewport.scale),
      y:(selection.y-viewport.top)/(B.height*viewport.scale),
      width:selection.width/(B.width*viewport.scale),height:selection.height/(B.height*viewport.scale)};
    check(Object.keys(R).some(k=>Math.abs(wrong[k]-R[k])>.01));
    rows.push({source:[W,H],fit,viewport:[width,height],zoom,pan,selection,result});
  }
// 獨立手算錨點：1200×800 contain 到 480×360，y 留白 20；cover 的 x=-30。
const base={scale:1,left:0,top:0}, B={width:480,height:360};
sameRect(forward(px(R,1200,800),matrix(1200,800,B,'contain',1,{x:0,y:0},base)),{x:96,y:68,width:240,height:192});
sameRect(forward(px(R,1200,800),matrix(1200,800,B,'cover',1,{x:0,y:0},base)),{x:78,y:54,width:270,height:216});
sameRect(forward(px(R,1200,800),matrix(1200,800,B,'contain',1.6,{x:23,y:-17},base)),{x:32.6,y:-16.2,width:384,height:307.2});
// 選取框落在 contain 留白時，反投影越界，不能 clamp 後冒充使用者原選取。
check(!validRect(norm(inverse({x:0,y:0,width:480,height:360},matrix(1200,800,B,'contain',1,{x:0,y:0},base)),1200,800)));
for (const bad of [{...R,x:-.1},{...R,width:0},{...R,height:NaN},{...R,width:Infinity},{...R,x:.8}]) check(!validRect(bad));
for (const m of [[0,0,0,1,0,0],[1,.1,0,1,0,0],[1,0,.1,1,0,0],[-1,0,0,1,0,0]]) {assert.throws(()=>inverse(R,m));checks++;}

// SVG viewBox 所代表的子圖，再依 img object-fit 投影；僅驗公式，不驗 SVG 像素。
const visible = (r,W,H,B,fit) => {
  const p=px(r,W,H), k=fitScale(p.width,p.height,B,fit);
  const vw=Math.min(p.width,B.width/k),vh=Math.min(p.height,B.height/k);
  return norm({x:p.x+(p.width-vw)/2,y:p.y+(p.height-vh)/2,width:vw,height:vh},W,H);
};
sameRect(visible(R,1200,800,{width:500,height:200},'contain'),R);
const cover=visible(R,1200,800,{width:500,height:200},'cover');
sameRect(cover,{x:.2,y:.3,width:.5,height:.3});
const label={x:.25,y:.16,width:.1,height:.04};
check(contains(R,label));check(!contains(cover,label));
const digest = c => createHash('sha256').update(JSON.stringify([
  c.dataUri,c.sourceSize.width,c.sourceSize.height,c.crop.x,c.crop.y,c.crop.width,c.crop.height,
  c.fit||'contain',c.safety.classification,c.safety.protectedRect ?? null,
])).digest('hex');
const guard = c => validRect(c.crop)
  && ['evidence','decorative'].includes(c.safety?.classification)
  && c.safety.reviewDigest===digest(c)
  && (c.safety.classification==='decorative'||((c.fit||'contain')==='contain'
    && validRect(c.safety.protectedRect)&&contains(c.crop,c.safety.protectedRect)));
// 字串是 identity 的數學替身，非可解碼圖片 fixture；digest 不是來源真實性驗證。
const c={dataUri:'SOURCE-A',sourceSize:{width:1200,height:800},crop:R,fit:'contain',
  safety:{classification:'evidence',protectedRect:label}};
c.safety.reviewDigest=digest(c);check(guard(c));
const missing=structuredClone(c);delete missing.safety.reviewDigest;check(!guard(missing));
const unknown=structuredClone(c);unknown.safety.classification='unknown';check(!guard(unknown));
const changed=structuredClone(c);changed.dataUri='SOURCE-B';check(!guard(changed));
const sameDimensions=structuredClone(c);sameDimensions.crop.x=.21;check(!guard(sameDimensions));
const fitChanged=structuredClone(c);fitChanged.fit='cover';fitChanged.safety.reviewDigest=digest(fitChanged);check(!guard(fitChanged));
const cut=structuredClone(c);cut.crop={x:.4,y:.3,width:.2,height:.3};cut.safety.reviewDigest=digest(cut);check(!guard(cut));
console.log(JSON.stringify({status:'PASS',evidence:'math-only',cases:rows.length,checks,
  notValidated:['Cropper adapter','DOM/CSS/SVG pixels','image decode','repo operations','portable reopen'],
  coverVisible:cover,labelRejectedByCover:label,rows},null,2));
