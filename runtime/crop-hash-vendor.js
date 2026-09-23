import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
const bundle=readFileSync(new URL('./vendor/crop-hash-2.0.1.iife.js',import.meta.url),'utf8');
const metadata=JSON.parse(readFileSync(new URL('./vendor/crop-hash-vendor.json',import.meta.url),'utf8'));
export function buildCropHashRuntime(){
 if(metadata.package!=='@noble/hashes'||metadata.version!=='2.0.1'||metadata.license!=='MIT'||metadata.bundleBytes!==Buffer.byteLength(bundle)||metadata.bundleSha256!==createHash('sha256').update(bundle).digest('hex'))throw Error('Crop SHA256 bundle identity/hash 無效。');
 return bundle;
}
