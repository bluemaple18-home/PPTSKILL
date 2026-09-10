import { readFileSync } from 'node:fs';
import { extname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const defaultPackUrl = new URL('../design/company-style/clickforce-dark/company-style-pack.json', import.meta.url);
const allowedImageExtensions = new Set(['.png', '.jpg', '.jpeg', '.webp']);

const mimeFor = (path) => ({ '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp' })[extname(path).toLowerCase()];

export function loadCompanyStylePack(packUrl = defaultPackUrl) {
  const path = fileURLToPath(packUrl);
  const pack = JSON.parse(readFileSync(path, 'utf8'));
  if (pack.schemaVersion !== '1.0' || pack.id !== pack.style?.id) throw new Error('Company Style Pack 契約無效。');
  if (!pack.sourceFingerprint?.sha256 || pack.sourceFingerprint.sha256.length !== 64) throw new Error('Company Style Pack 缺少來源指紋。');
  const assets = {};
  for (const [key, relativePath] of Object.entries(pack.assetFiles ?? {})) {
    const assetPath = resolve(path, '..', relativePath);
    if (!allowedImageExtensions.has(extname(assetPath).toLowerCase())) throw new Error(`Company Style Pack 使用未核准的素材格式：${key}`);
    assets[key] = `data:${mimeFor(assetPath)};base64,${readFileSync(assetPath).toString('base64')}`;
  }
  for (const key of ['coverField', 'agendaField', 'chapterField', 'contentGradient', 'contentObject', 'contentDark', 'logoWhite', 'logoColor']) {
    if (!assets[key]) throw new Error(`Company Style Pack 缺少素材：${key}`);
  }
  return { ...pack, assets };
}

export function getCompanyStylePackByStyleId(styleId) {
  return styleId === 'clickforce-dark' ? loadCompanyStylePack() : null;
}
