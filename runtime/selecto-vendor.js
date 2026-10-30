import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';

const sha = value => createHash('sha256').update(value).digest('hex');
const read = name => readFileSync(new URL('./vendor/' + name, import.meta.url), 'utf8');

export function verifySelectoArtifacts({ bundle, metafile, attribution, metadata }) {
  const errors = [];
  if (metadata.package !== 'selecto' || metadata.version !== '1.26.3' || metadata.license !== 'MIT') errors.push('Selecto identity mismatch。');
  if (metadata.registryIntegrity !== 'sha512-gZHgqMy5uyB6/2YDjv3Qqaf7bd2hTDOpPdxXlrez4R3/L0GiEWDCFaUfrflomgqdb3SxHF2IXY0Jw0EamZi7cw=='
    || metadata.licenseSha256 !== 'f0a8acccf5e11935501025a8035e78c9d44007e68f17344783d44810075e92aa') errors.push('Selecto pinned integrity mismatch。');
  if (metadata.bundleBytes !== Buffer.byteLength(bundle) || metadata.bundleSha256 !== sha(bundle)) errors.push('Selecto bundle hash mismatch。');
  if (metadata.metafileSha256 !== sha(metafile) || metadata.attributionSha256 !== sha(attribution)) errors.push('Selecto metafile／license hash mismatch。');
  const meta = JSON.parse(metafile), paths = Object.keys(meta.inputs);
  if (!paths.length || paths.some(path => /moveable|floating-ui/i.test(path))) errors.push('Selecto bundle 含禁止 input。');
  if (JSON.stringify(paths) !== JSON.stringify(metadata.inputs.map(input => input.path))) errors.push('Selecto input manifest mismatch。');
  if (Object.values(meta.outputs).some(output => output.imports.length || output.bytes !== metadata.bundleBytes)) errors.push('Selecto bundle external import／bytes mismatch。');
  for (const p of metadata.packages) if (!attribution.includes(`## ${p.name}@${p.version} (${p.license})`)) errors.push('Selecto attribution 缺 package。');
  if (bundle.includes('</script') || /\bfetch\s*\(|XMLHttpRequest|WebSocket|localStorage|sessionStorage|document\.cookie|\beval\s*\(/u.test(bundle)) errors.push('Selecto 含禁止的 network/storage/eval surface。');
  return { status: errors.length ? 'fail' : 'pass', errors, metadata: structuredClone(metadata) };
}

export function getSelectoVendorMetadata() { return JSON.parse(read('selecto-vendor.json')); }

export function verifySelectoVendor() {
  return verifySelectoArtifacts({
    bundle: read('selecto-1.26.3.iife.js'),
    metafile: read('selecto-metafile.json'),
    attribution: read('selecto-LICENSE.md'),
    metadata: getSelectoVendorMetadata(),
  });
}

export function buildSelectoVendorScript() {
  const checked = verifySelectoVendor();
  if (checked.status !== 'pass') throw new Error(checked.errors.join(' '));
  const license = read('selecto-LICENSE.md').replaceAll('<', '\\u003c');
  return `<script type="application/json" data-pptskill-selecto-license>${JSON.stringify(license)}</script><script data-pptskill-selecto-vendor data-version="1.26.3" data-sha256="${checked.metadata.bundleSha256}">${read('selecto-1.26.3.iife.js')}</script>`;
}
