import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
const bundle=readFileSync(new URL('./vendor/crop-hash-2.0.1.iife.js',import.meta.url),'utf8');
const license=readFileSync(new URL('./vendor/crop-hash-LICENSE.md',import.meta.url),'utf8');
const metadata=JSON.parse(readFileSync(new URL('./vendor/crop-hash-vendor.json',import.meta.url),'utf8'));
const sha=value=>createHash('sha256').update(value).digest('hex');
export function buildCropHashRuntime(){
 if(metadata.package!=='@noble/hashes'||metadata.version!=='2.0.1'||metadata.license!=='MIT'||metadata.bundleBytes!==Buffer.byteLength(bundle)||metadata.bundleSha256!==sha(bundle))throw Error('Crop SHA256 bundle identity/hash 無效。');
 if(metadata.licenseSha256!==sha(license))throw Error('Crop SHA256 license hash 無效。');
 return bundle;
}
export function buildCropHashLicenseScript(){
 buildCropHashRuntime();
 // 與既有 vendor 相同的獨立 JSON script；escape 在 JSON 編碼後，解析可還原完整授權。
 return `<script type="application/json" data-pptskill-crop-hash-license>${JSON.stringify(license).replaceAll('<','\\u003c')}</script>`;
}
