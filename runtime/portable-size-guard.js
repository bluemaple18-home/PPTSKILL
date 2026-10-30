import { ASSET_POLICY, inspectImageAsset } from './asset-policy.js';

export const utf8ByteLength = (value) => new TextEncoder().encode(String(value)).byteLength;

export function inspectPortableHtml(html, spec, policy = ASSET_POLICY) {
  const assets = [];
  for (const slide of spec?.slides || []) {
    for (const component of slide.content?.components || []) {
      if (component.type !== 'image') continue;
      const inspected = inspectImageAsset(component.dataUri, policy);
      if (inspected.status === 'fail') continue;
      assets.push({ slideId: slide.id, componentId: component.id, mime: inspected.mime, bytes: inspected.byteLength, warnings: inspected.warnings });
    }
  }
  const totalHtmlBytes = utf8ByteLength(html);
  const bytesByMime = {};
  for (const asset of assets) bytesByMime[asset.mime] = (bytesByMime[asset.mime] || 0) + asset.bytes;
  const largestAsset = assets.reduce((largest, asset) => !largest || asset.bytes > largest.bytes ? asset : largest, null);
  const warnings = assets.flatMap((asset) => asset.warnings.map((code) => ({ code, slideId: asset.slideId, componentId: asset.componentId })));
  if (totalHtmlBytes > policy.deckWarningBytes) warnings.push({ code: 'deck_over_warning_bytes' });
  const status = totalHtmlBytes > policy.deckHardLimitBytes ? 'fail' : warnings.length ? 'warn' : 'pass';
  return { status, totalHtmlBytes, embeddedAssetCount: assets.length, bytesByMime, largestAsset, warnings, limits: { warningBytes: policy.deckWarningBytes, hardLimitBytes: policy.deckHardLimitBytes } };
}

export function preparePortableExport(html, spec, policy = ASSET_POLICY) {
  const report = inspectPortableHtml(html, spec, policy);
  return { status: report.status, html: report.status === 'fail' ? null : html, report };
}

function installPortableSizeGuard(policy) {
  const utf8Bytes = (value) => new TextEncoder().encode(String(value)).byteLength;
  const parse = (uri) => {
    const match = /^data:(image\/(?:jpeg|png|webp|gif|svg\+xml));base64,([a-z0-9+/=]*)$/i.exec(String(uri || ''));
    if (!match) return null;
    const payload = match[2], padding = payload.endsWith('==') ? 2 : payload.endsWith('=') ? 1 : 0;
    return { mime: match[1].toLowerCase(), bytes: Math.max(0, Math.floor(payload.length * 3 / 4) - padding) };
  };
  const inspect = (html, spec) => {
    const assets = [];
    for (const slide of spec?.slides || []) for (const component of slide.content?.components || []) {
      if (component.type !== 'image') continue;
      const value = parse(component.dataUri); if (!value) continue;
      assets.push({ slideId: slide.id, componentId: component.id, ...value });
    }
    const totalHtmlBytes = utf8Bytes(html), bytesByMime = {};
    for (const asset of assets) bytesByMime[asset.mime] = (bytesByMime[asset.mime] || 0) + asset.bytes;
    const largestAsset = assets.reduce((largest, asset) => !largest || asset.bytes > largest.bytes ? asset : largest, null);
    const warnings = [];
    for (const asset of assets) {
      if (asset.bytes > policy.perAssetWarningBytes) warnings.push({ code: 'asset_over_warning_bytes', slideId: asset.slideId, componentId: asset.componentId });
      if (asset.mime === 'image/gif' && asset.bytes > policy.perAssetWarningBytes) warnings.push({ code: 'animated_gif_preserved', slideId: asset.slideId, componentId: asset.componentId });
    }
    if (totalHtmlBytes > policy.deckWarningBytes) warnings.push({ code: 'deck_over_warning_bytes' });
    const status = totalHtmlBytes > policy.deckHardLimitBytes ? 'fail' : warnings.length ? 'warn' : 'pass';
    return { status, totalHtmlBytes, embeddedAssetCount: assets.length, bytesByMime, largestAsset, warnings, limits: { warningBytes: policy.deckWarningBytes, hardLimitBytes: policy.deckHardLimitBytes } };
  };
  window.PPTSKILLSizeGuard = { policy, utf8ByteLength: utf8Bytes, inspect, prepare: (html, spec) => { const report = inspect(html, spec); return { status: report.status, html: report.status === 'fail' ? null : html, report }; } };
}

export const buildPortableSizeGuardRuntimeScript = () => `<script data-pptskill-size-guard>(${installPortableSizeGuard.toString()})(${JSON.stringify(ASSET_POLICY)});</script>`;
