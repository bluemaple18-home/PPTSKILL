import { build } from 'esbuild';
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const packageRoot = resolve(root, 'node_modules', 'number-flow');
const outputRoot = resolve(root, 'runtime', 'vendor');
const hash = (value) => createHash('sha256').update(value).digest('hex');

const packageJson = JSON.parse(await readFile(resolve(packageRoot, 'package.json'), 'utf8'));
if (packageJson.version !== '0.6.2' || packageJson.license !== 'MIT') throw new Error('NumberFlow package identity 不符合 pinned intake。');

const source = await readFile(resolve(packageRoot, 'dist', 'index.mjs'));
const license = await readFile(resolve(packageRoot, 'LICENSE.md'));
const result = await build({
  entryPoints: ['number-flow'],
  absWorkingDir: root,
  bundle: true,
  platform: 'browser',
  format: 'iife',
  target: ['es2022'],
  minify: true,
  legalComments: 'none',
  write: false,
});
const bundle = result.outputFiles[0].contents;
const bundleText = new TextDecoder().decode(bundle);
if (bundleText.includes('</script')) throw new Error('NumberFlow bundle 含不安全的 script closing sequence。');
if (/https?:\/\/|fetch\(|XMLHttpRequest|WebSocket|localStorage|sessionStorage|document\.cookie|eval\(/u.test(bundleText)) {
  throw new Error('NumberFlow bundle 命中禁止的 network/storage/eval surface。');
}

const metadata = {
  schemaVersion: '1.0',
  package: 'number-flow',
  version: packageJson.version,
  license: packageJson.license,
  sourceSha256: hash(source),
  licenseSha256: hash(license),
  bundleSha256: hash(bundle),
  bundleBytes: bundle.byteLength,
  build: { tool: 'esbuild', version: '0.28.2', platform: 'browser', format: 'iife', target: 'es2022', minified: true },
};

await mkdir(outputRoot, { recursive: true });
await writeFile(resolve(outputRoot, 'number-flow-0.6.2.iife.js'), bundle);
await writeFile(resolve(outputRoot, 'number-flow-LICENSE.md'), license);
await writeFile(resolve(outputRoot, 'number-flow-vendor.json'), `${JSON.stringify(metadata, null, 2)}\n`);
console.log(JSON.stringify(metadata, null, 2));
