import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';

const metadataUrl = new URL('./vendor/number-flow-vendor.json', import.meta.url);
const bundleUrl = new URL('./vendor/number-flow-0.6.2.iife.js', import.meta.url);
const metadata = JSON.parse(readFileSync(metadataUrl, 'utf8'));
const bundle = readFileSync(bundleUrl, 'utf8');
const bundleSha256 = createHash('sha256').update(bundle).digest('hex');

export function getNumberFlowVendorMetadata() {
  return structuredClone(metadata);
}

export function verifyNumberFlowVendor() {
  const errors = [];
  if (metadata.package !== 'number-flow' || metadata.version !== '0.6.2' || metadata.license !== 'MIT') errors.push('NumberFlow vendor identity mismatch。');
  if (metadata.bundleBytes !== Buffer.byteLength(bundle) || metadata.bundleSha256 !== bundleSha256) errors.push('NumberFlow vendor bundle hash mismatch。');
  if (bundle.includes('</script') || /https?:\/\/|fetch\(|XMLHttpRequest|WebSocket|localStorage|sessionStorage|document\.cookie|eval\(/u.test(bundle)) {
    errors.push('NumberFlow vendor bundle 含禁止 surface。');
  }
  return { status: errors.length ? 'fail' : 'pass', errors, metadata: getNumberFlowVendorMetadata() };
}

export function buildNumberFlowVendorScript() {
  const verification = verifyNumberFlowVendor();
  if (verification.status !== 'pass') throw new Error(verification.errors.join(' '));
  return `<script data-pptskill-number-flow-vendor data-version="${metadata.version}" data-sha256="${metadata.bundleSha256}">if('customElements'in window&&'Intl'in window){${bundle}}</script>`;
}
