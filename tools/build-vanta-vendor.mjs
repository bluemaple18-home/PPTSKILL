import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const outputRoot = resolve(root, 'runtime', 'vendor');
const vantaRoot = resolve(root, 'node_modules', 'vanta');
const threeRoot = resolve(root, 'node_modules', 'three');
// CLOUDS2 需要 npm package 未攜帶的 noise texture；不可把未 offered 的 runtime 混入 portable bundle。
const effects = ['waves', 'birds', 'net', 'globe', 'dots', 'fog', 'clouds', 'cells', 'ripple', 'rings', 'halo'];
const hash = (value) => createHash('sha256').update(value).digest('hex');

const [vantaPackage, threePackage] = await Promise.all([
  readFile(resolve(vantaRoot, 'package.json'), 'utf8').then(JSON.parse),
  readFile(resolve(threeRoot, 'package.json'), 'utf8').then(JSON.parse),
]);
if (vantaPackage.version !== '0.5.24' || vantaPackage.license !== 'MIT') throw new Error('Vanta package identity 不符合 pinned intake。');
if (threePackage.version !== '0.134.0' || threePackage.license !== 'MIT') throw new Error('Three package identity 不符合 pinned intake。');

const threeSource = await readFile(resolve(threeRoot, 'build', 'three.min.js'));
const effectSources = await Promise.all(effects.map(async (effect) => ({
  effect,
  source: await readFile(resolve(vantaRoot, 'dist', `vanta.${effect}.min.js`)),
})));
const bundle = Buffer.concat([
  Buffer.from('/* PPTSKILL pinned background vendor: three@0.134.0 + vanta@0.5.24 */\n'),
  threeSource,
  ...effectSources.flatMap(({ effect, source }) => [Buffer.from(`\n/* vanta:${effect} */\n`), source]),
]);
const bundleText = bundle.toString('utf8');
if (bundleText.includes('</script')) throw new Error('Vanta vendor bundle 含不安全的 script closing sequence。');
// Three 的通用 loaders 內建 fetch/URL 能力；Vanta effect 本身不使用它們。
// 正式 HTML 另以 connect-src 'none' 封鎖網路，browser gate 也必須觀測零外部 request。
if (/WebSocket|localStorage|sessionStorage|document\.cookie|eval\(/u.test(bundleText)) {
  throw new Error('Vanta vendor bundle 命中禁止的 storage/eval surface。');
}

const [vantaLicense, threeLicense] = await Promise.all([
  readFile(resolve(outputRoot, 'vanta-LICENSE.md')),
  readFile(resolve(threeRoot, 'LICENSE')),
]);
const metadata = {
  schemaVersion: '1.0',
  packages: [
    { package: 'vanta', version: vantaPackage.version, license: vantaPackage.license, licenseSha256: hash(vantaLicense) },
    { package: 'three', version: threePackage.version, license: threePackage.license, licenseSha256: hash(threeLicense) },
  ],
  effects: effectSources.map(({ effect, source }) => ({ effect, sourceSha256: hash(source), sourceBytes: source.byteLength })),
  bundleSha256: hash(bundle),
  bundleBytes: bundle.byteLength,
  build: { mode: 'deterministic-concatenation', format: 'browser-iife', target: 'pinned-upstream-minified-artifacts' },
};

await mkdir(outputRoot, { recursive: true });
await writeFile(resolve(outputRoot, 'vanta-three-0.5.24-r134.iife.js'), bundle);
await writeFile(resolve(outputRoot, 'three-LICENSE.md'), threeLicense);
await writeFile(resolve(outputRoot, 'vanta-vendor.json'), `${JSON.stringify(metadata, null, 2)}\n`);
console.log(JSON.stringify(metadata, null, 2));
