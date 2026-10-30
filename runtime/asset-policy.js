export const MIB = 1024 * 1024;

export const ASSET_POLICY = Object.freeze({
  supportedMimeTypes: Object.freeze(['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml']),
  rasterMimeTypes: Object.freeze(['image/jpeg', 'image/png', 'image/webp']),
  maxRasterLongEdge: 2560,
  jpegQuality: 0.82,
  webpQuality: 0.82,
  perAssetWarningBytes: 4 * MIB,
  deckWarningBytes: 12 * MIB,
  deckHardLimitBytes: 20 * MIB,
});

export function parseImageDataUri(dataUri) {
  const match = /^data:(image\/(?:jpeg|png|webp|gif|svg\+xml));base64,([a-z0-9+/=]*)$/i.exec(String(dataUri || ''));
  if (!match) return null;
  const payload = match[2];
  const padding = payload.endsWith('==') ? 2 : payload.endsWith('=') ? 1 : 0;
  return { mime: match[1].toLowerCase(), byteLength: Math.max(0, Math.floor(payload.length * 3 / 4) - padding) };
}

export function inspectImageAsset(dataUri, policy = ASSET_POLICY) {
  const parsed = parseImageDataUri(dataUri);
  if (!parsed || !policy.supportedMimeTypes.includes(parsed.mime)) return { status: 'fail', reason: 'unsupported_image_data_uri' };
  const warnings = [];
  if (parsed.byteLength > policy.perAssetWarningBytes) warnings.push('asset_over_warning_bytes');
  if (parsed.mime === 'image/gif' && parsed.byteLength > policy.perAssetWarningBytes) warnings.push('animated_gif_preserved');
  return { status: warnings.length ? 'warn' : 'pass', ...parsed, warnings };
}
