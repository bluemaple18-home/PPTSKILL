import { ASSET_POLICY } from './asset-policy.js';

function installBrowserAssetOptimizer(policy) {
  const toDataUri = (blob) => new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(reader.result); reader.onerror = reject; reader.readAsDataURL(blob); });
  const canvasBlob = (canvas, mime, quality) => new Promise((resolve, reject) => canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error('圖片壓縮失敗。')), mime, quality));
  const optimizeFile = async (file) => {
    if (!policy.supportedMimeTypes.includes(file.type)) throw new Error('不支援的圖片格式。');
    const originalDataUri = await toDataUri(file);
    const base = { mime: file.type, originalBytes: file.size, outputBytes: file.size, dataUri: originalDataUri, optimized: false, warnings: [] };
    if (file.type === 'image/svg+xml') return { ...base, policyAction: 'preserve_vector' };
    if (file.type === 'image/gif') return { ...base, policyAction: 'preserve_animation', warnings: file.size > policy.perAssetWarningBytes ? ['oversized_gif_preserved'] : [] };
    const bitmap = await createImageBitmap(file);
    const longEdge = Math.max(bitmap.width, bitmap.height), scale = Math.min(1, policy.maxRasterLongEdge / longEdge);
    const width = Math.max(1, Math.round(bitmap.width * scale)), height = Math.max(1, Math.round(bitmap.height * scale));
    if (scale === 1 && file.size <= policy.perAssetWarningBytes) { bitmap.close(); return { ...base, width, height, policyAction: 'preserve_small' }; }
    const canvas = document.createElement('canvas'); canvas.width = width; canvas.height = height;
    const context = canvas.getContext('2d', { alpha: true }); context.drawImage(bitmap, 0, 0, width, height); bitmap.close();
    const quality = file.type === 'image/jpeg' ? policy.jpegQuality : file.type === 'image/webp' ? policy.webpQuality : undefined;
    const output = await canvasBlob(canvas, file.type, quality);
    if (scale === 1 && output.size >= file.size) return { ...base, width, height, policyAction: 'preserve_smaller_original' };
    return { ...base, width, height, outputBytes: output.size, dataUri: await toDataUri(output), optimized: true, policyAction: scale < 1 ? 'resize_and_recompress' : 'recompress' };
  };
  window.PPTSKILLAssets = { policy, optimizeFile };
}

export const buildBrowserAssetOptimizerRuntimeScript = () => `<script data-pptskill-asset-optimizer>(${installBrowserAssetOptimizer.toString()})(${JSON.stringify(ASSET_POLICY)});</script>`;
