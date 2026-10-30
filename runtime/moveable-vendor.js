import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';

const sha = value => createHash('sha256').update(value).digest('hex');
const read = name => readFileSync(new URL('./vendor/' + name, import.meta.url), 'utf8');
export function verifyMoveableArtifacts({ bundle, metafile, attribution, metadata }) {
  const errors = [];
  if (metadata.package !== 'moveable' || metadata.version !== '0.53.0' || metadata.license !== 'MIT') errors.push('Moveable identity mismatch。');
  if (metadata.registryIntegrity !== 'sha512-71jS9zIoQzMhnNvduhg4tUEdm23+fO/40FN7muVMbZvVwbTku2MIxxLhnU4qFvxI4oVxn75l79SbtgjuA+s7Pw==' || metadata.licenseSha256 !== '77f98221f8531e87aa227c0a8d63c17c903dd4d36daf24bdc48296b09e06a25e') errors.push('Moveable pinned integrity mismatch。');
  if (metadata.bundleBytes !== Buffer.byteLength(bundle) || metadata.bundleSha256 !== sha(bundle)) errors.push('Moveable bundle hash mismatch。');
  if (metadata.metafileSha256 !== sha(metafile) || metadata.attributionSha256 !== sha(attribution)) errors.push('Moveable metafile／license hash mismatch。');
  const meta = JSON.parse(metafile), paths = Object.keys(meta.inputs);
  if (!paths.length || paths.some(path => /selecto|floating-ui/i.test(path))) errors.push('禁止的 bundle input。');
  if (JSON.stringify(paths) !== JSON.stringify(metadata.inputs.map(input => input.path))) errors.push('Moveable input manifest mismatch。');
  if (Object.values(meta.outputs).some(output => output.imports.length || output.bytes !== metadata.bundleBytes)) errors.push('Moveable bundle external import／bytes mismatch。');
  for (const p of metadata.packages) if (!attribution.includes(`## ${p.name}@${p.version} (${p.license})`)) errors.push('Moveable attribution 缺 package。');
  if (bundle.includes('</script') || /\bfetch\s*\(|XMLHttpRequest|WebSocket|localStorage|sessionStorage|document\.cookie|\beval\s*\(/u.test(bundle)) errors.push('Moveable 含禁止的 network/storage/eval surface。');
  return { status: errors.length ? 'fail' : 'pass', errors, metadata: structuredClone(metadata) };
}
export function getMoveableVendorMetadata() { return JSON.parse(read('moveable-vendor.json')); }
export function verifyMoveableVendor() {
  return verifyMoveableArtifacts({ bundle: read('moveable-0.53.0.iife.js'), metafile: read('moveable-metafile.json'),
    attribution: read('moveable-LICENSE.md'), metadata: getMoveableVendorMetadata() });
}
export function buildMoveableVendorScript() {
  const checked = verifyMoveableVendor();
  if (checked.status !== 'pass') throw new Error(checked.errors.join(' '));
  const license = read('moveable-LICENSE.md').replaceAll('<', '\\u003c');
  return `<script type="application/json" data-pptskill-moveable-license>${JSON.stringify(license)}</script><script data-pptskill-moveable-vendor data-version="0.53.0" data-sha256="${checked.metadata.bundleSha256}">${read('moveable-0.53.0.iife.js')}</script>`;
}
