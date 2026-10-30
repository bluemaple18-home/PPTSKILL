import { readFile } from 'node:fs/promises';
import { isAbsolute, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const expectedThemes = ['brand-story', 'executive-clear', 'product-blueprint', 'sales-momentum'];
const projectRoot = resolve(fileURLToPath(new URL('../', import.meta.url)));
const toPath = (value) => isAbsolute(value) ? value : resolve(projectRoot, value);

const pngSize = (buffer) => buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
  ? { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) }
  : null;

export async function validateThemePreview(manifest) {
  if (!manifest.content?.title || !manifest.content?.subtitle || !manifest.content?.identity) return { status: 'fail', reason: '缺少共同內容。' };
  if (manifest.previews?.length !== 4 || manifest.previews.map((preview) => preview.id).sort().join(',') !== expectedThemes.join(',')) {
    return { status: 'fail', reason: '預覽必須恰有四款固定 Theme。' };
  }
  for (const preview of manifest.previews) {
    if (JSON.stringify(preview.content) !== JSON.stringify(manifest.content) || preview.width !== 1600 || preview.height !== 900) {
      return { status: 'fail', reason: `${preview.id} 的內容或尺寸不一致。` };
    }
    const html = await readFile(toPath(preview.html), 'utf8');
    const image = pngSize(await readFile(toPath(preview.png)));
    if (!html.includes(preview.name) || /https?:\/\//.test(html) || image?.width !== 1600 || image?.height !== 900) {
      return { status: 'fail', reason: `${preview.id} 並非有效的離線 16:9 預覽。` };
    }
  }
  if (manifest.selection?.status === 'pending' && manifest.selection.theme === null) {
    return { status: 'blocked', reason: '尚待人類選定 Theme。' };
  }
  if (manifest.selection?.status !== 'selected' || manifest.selection.approvedBy !== 'human' || !expectedThemes.includes(manifest.selection.theme)) {
    return { status: 'fail', reason: '選款 receipt 無效。' };
  }
  return { status: 'pass', theme: manifest.selection.theme };
}

const args = process.argv.slice(2);
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const manifestPath = args[args.indexOf('--manifest') + 1];
  if (!manifestPath) {
    console.error('用法：node validate-theme-preview.mjs --manifest <theme-preview-manifest.json>');
    process.exitCode = 1;
  } else {
    const result = await validateThemePreview(JSON.parse(await readFile(resolve(process.cwd(), manifestPath), 'utf8')));
    console.log(JSON.stringify(result));
    if (result.status !== 'pass') process.exitCode = 1;
  }
}
