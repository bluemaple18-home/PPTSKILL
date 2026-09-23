import test from 'node:test';
import assert from 'node:assert/strict';
import { inflateSync } from 'node:zlib';
import { readFileSync } from 'node:fs';
import { cropFixturePng, addCropFixture } from '../tools/edx-core-crop-browser-cases.mjs';
import { imageCrop } from '../runtime/image-crop.js';
import { renderFullDeck } from '../runtime/full-deck-renderer.js';
import { extractDeckSpec } from '../runtime/deck-spec.js';
import { fixture } from '../tools/edx-wp1-s4-perf-mounted.mjs';
const crc=b=>{let c=0xffffffff;for(const v of b){c^=v;for(let i=0;i<8;i++)c=(c>>>1)^((c&1)?0xedb88320:0);}return(c^0xffffffff)>>>0;};
test('Crop fixture PNG 真非方六色／軸／AXIS bitmap／CRC與scanlines',()=>{
 for(const [w,h]of [[240,160],[120,240]]){
  const png=Buffer.from(cropFixturePng(w,h).split(',')[1],'base64');assert.equal(png.subarray(0,8).toString('hex'),'89504e470d0a1a0a');let off=8,data=[];
  while(off<png.length){const size=png.readUInt32BE(off),name=png.toString('ascii',off+4,off+8),body=png.subarray(off+4,off+8+size);assert.equal(crc(body),png.readUInt32BE(off+8+size));if(name==='IHDR'){assert.equal(body.readUInt32BE(4),w);assert.equal(body.readUInt32BE(8),h);}if(name==='IDAT')data.push(body.subarray(4));off+=size+12;}
  const raw=inflateSync(Buffer.concat(data));assert.equal(raw.length,(w*3+1)*h);const pixel=(x,y)=>[...raw.subarray(y*(w*3+1)+1+x*3,y*(w*3+1)+4+x*3)];
  const colors=new Set();for(const x of [.2,.5,.8])for(const y of [.2,.6])colors.add(String(pixel(Math.floor(x*w),Math.floor(y*h))));assert.equal(colors.size,6);
  assert.deepEqual(pixel(0,10),[0,0,0]);assert.deepEqual(pixel(30,h-1),[0,0,0]);assert.deepEqual(pixel(14,h-24),[0,0,0]);
 }
 assert.notEqual(cropFixturePng(240,160),cropFixturePng(240,160,1));
});
test('Crop projection math 横／直／兩frame比例、contain與cover；不冒充像素',()=>{
 const rect={x:.2,y:.15,width:.5,height:.6};
 for(const [W,H]of [[240,160],[120,240]])for(const [w,h]of [[500,200],[300,400]])for(const fit of ['contain','cover']){
  const p=imageCrop.projectRect(rect,W,H,w,h,fit);assert.ok([p.width,p.height,p.left,p.top].every(Number.isFinite));assert.equal(p.clip,'inset(15% 30% 25% 20%)');
  const cw=p.width*rect.width,ch=p.height*rect.height;assert.ok(Math.abs(cw-w)<1e-8||Math.abs(ch-h)<1e-8);assert.ok(fit==='contain'?cw<=w+1e-8&&ch<=h+1e-8:cw>=w-1e-8&&ch>=h-1e-8);
 }
 assert.equal(imageCrop.projectRect(rect,0,160,500,200,'contain'),null);
});
test('Crop harness fixture render/reparse與exact bounded branch',()=>{
 const s=fixture(0);addCropFixture(s);const rendered=renderFullDeck(s);assert.equal(rendered.status,'pass');assert.deepEqual(extractDeckSpec(rendered.html),rendered.spec);
 const harness=readFileSync(new URL('../tools/edx-wp1-s4-browser-acceptance.mjs',import.meta.url),'utf8');assert.match(harness,/--crop-regression/);assert.match(harness,/if\(cropRegression\)await runCropBrowserCases/);
 const cases=readFileSync(new URL('../tools/edx-core-crop-browser-cases.mjs',import.meta.url),'utf8');assert.match(cases,/Page.captureScreenshot/);assert.match(cases,/Input.dispatchKeyEvent/);assert.match(cases,/same-size-replace-pending/);assert.match(cases,/offline-reopen/);assert.match(cases,/delete-element/);
});
