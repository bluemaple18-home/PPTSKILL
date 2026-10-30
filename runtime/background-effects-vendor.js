import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('.', import.meta.url));
const bundlePath = resolve(root, 'vendor', 'vanta-three-0.5.24-r134.iife.js');
const manifestPath = resolve(root, 'vendor', 'vanta-vendor.json');

export function verifyBackgroundEffectsVendor() {
  const errors = [];
  let bundle = '';
  let manifest;
  try {
    bundle = readFileSync(bundlePath, 'utf8');
    manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
  } catch (error) {
    return { status: 'fail', errors: [`Background vendor 缺失：${error.message}`] };
  }
  const sha256 = createHash('sha256').update(bundle).digest('hex');
  if (sha256 !== manifest.bundleSha256) errors.push('Background vendor checksum 不符。');
  if (Buffer.byteLength(bundle) !== manifest.bundleBytes) errors.push('Background vendor bytes 不符。');
  if (!manifest.packages?.some(({ package: name, version, license }) => name === 'vanta' && version === '0.5.24' && license === 'MIT')) errors.push('Vanta pin/license 不符。');
  if (!manifest.packages?.some(({ package: name, version, license }) => name === 'three' && version === '0.134.0' && license === 'MIT')) errors.push('Three pin/license 不符。');
  if (bundle.includes('</script') || /\b(?:eval|localStorage|sessionStorage)\s*\(/u.test(bundle)) errors.push('Background vendor 含禁止 runtime surface。');
  return { status: errors.length ? 'fail' : 'pass', errors, sha256, bytes: Buffer.byteLength(bundle), manifest };
}

export function buildBackgroundEffectsVendorScript() {
  const result = verifyBackgroundEffectsVendor();
  if (result.status !== 'pass') throw new Error(result.errors.join(' '));
  return `<script data-pptskill-background-vendor>${readFileSync(bundlePath, 'utf8')}</script>`;
}
