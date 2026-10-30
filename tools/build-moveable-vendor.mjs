import { verifyMoveableArtifacts } from '../runtime/moveable-vendor.js';
import { build, version as esbuildVersion } from 'esbuild';
import { createHash } from 'node:crypto';
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { gzipSync } from 'node:zlib';

const root = fileURLToPath(new URL('..', import.meta.url));
const out = resolve(root, 'runtime/vendor');
const sha = data => createHash('sha256').update(data).digest('hex');
const integrity = 'sha512-71jS9zIoQzMhnNvduhg4tUEdm23+fO/40FN7muVMbZvVwbTku2MIxxLhnU4qFvxI4oVxn75l79SbtgjuA+s7Pw==';
const licenseSha = '77f98221f8531e87aa227c0a8d63c17c903dd4d36daf24bdc48296b09e06a25e';
const pkg = JSON.parse(await readFile(resolve(root, 'node_modules/moveable/package.json')));
const license = await readFile(resolve(root, 'node_modules/moveable/LICENSE'));
const lock = await readFile(resolve(root, 'pnpm-lock.yaml'), 'utf8');
if (pkg.version !== '0.53.0' || pkg.license !== 'MIT' || sha(license) !== licenseSha
  || !lock.includes(`moveable@0.53.0:\n    resolution: {integrity: ${integrity}}`)) throw new Error('Moveable pinned intake 不一致。');
const result = await build({ absWorkingDir: root, entryPoints: ['moveable'], bundle: true,
  platform: 'browser', format: 'iife', globalName: 'PPTSKILLMoveable', target: ['es2022'],
  minify: true, legalComments: 'none', write: false, metafile: true, outfile: 'moveable-0.53.0.iife.js' });
const bundle = result.outputFiles[0].contents;
const meta = result.metafile;
if (Object.keys(meta.inputs).some(path => /selecto|floating-ui/i.test(path))) throw new Error('禁止 bundle Selecto／Floating UI。');
const packages = new Map(), inputs = [];
for (const path of Object.keys(meta.inputs)) {
  const source = await readFile(resolve(root, path));
  inputs.push({ path, sha256: sha(source), bytes: source.length });
  let directory = dirname(resolve(root, path)), manifest;
  while (directory.startsWith(root)) {
    try { manifest = JSON.parse(await readFile(resolve(directory, 'package.json'))); break; } catch { directory = dirname(directory); }
  }
  if (!manifest) throw new Error('找不到 input attribution：' + path);
  if (packages.has(manifest.name)) continue;
  const names = (await readdir(directory)).filter(name => /^licen[cs]e(?:\.|$)/i.test(name)).sort();
  let texts = await Promise.all(names.map(async name => ({ file: name, text: await readFile(resolve(directory, name), 'utf8'), source: 'pinned package LICENSE' })));
  if (!names.length && manifest.name === 'croact' && manifest.version === '1.0.4') {
    const sourceSha = 'bf0189e9d2931dec791625e6fef231a713825cb82989291a6a283bbb69a3dbf6';
    const text = source.toString('utf8'), banner = text.slice(0, text.indexOf('*/') + 2);
    if (sha(source) !== sourceSha || !banner.includes('Copyright (c) Daybrush\nname: croact\nlicense: MIT')) throw new Error('croact pinned notice 漂移。');
    texts = [{ file: 'dist/croact.esm.js notice + 標準 MIT permission', source: path, sourceSha256: sourceSha,
      text: '此 package／官方 repo 未附獨立 LICENSE。以下 banner 為 pinned source 原文；MIT permission 段另引自同作者 Moveable LICENSE，非虛構上游 LICENSE。\n\n' + banner + '\n\n' + license.toString('utf8').slice(license.toString('utf8').indexOf('Permission is hereby granted')) }];
  }
  if (!names.length && ['css-styled@1.0.8', 'croact-css-styled@1.1.9'].includes(manifest.name + '@' + manifest.version)) {
    const text = await readFile(resolve(out, 'moveable-licenses/css-styled-LICENSE'), 'utf8');
    if (sha(text) !== '77f98221f8531e87aa227c0a8d63c17c903dd4d36daf24bdc48296b09e06a25e') throw new Error('css-styled 官方 LICENSE 漂移。');
    texts = [{ file: '官方 repository LICENSE（package 未附）', text,
      source: 'https://github.com/daybrush/css-styled/blob/51fb10e66da6c8e2ca3c121b614a54e527617f08/LICENSE' }];
  }
  if (!texts.length) throw new Error('缺 license：' + manifest.name);
  packages.set(manifest.name, { name: manifest.name, version: manifest.version, license: manifest.license, texts });
}
const attribution = '# Moveable portable bundle 授權\n\n只列正式 esbuild metafile 實際輸入；unused Selecto closure 未 bundle。\n\n'
  + [...packages.values()].map(p => `## ${p.name}@${p.version} (${p.license})\n\n${p.texts.map(t => `### ${t.file}\n\n來源：${t.source}${t.sourceSha256 ? "；source SHA-256: " + t.sourceSha256 : ""}\n\n${t.text}`).join('\n\n')}`).join('\n\n')
  + '\n\n## TypeScript 內嵌 helper notice\n\nCopyright (c) Microsoft Corporation.\n\nPermission to use, copy, modify, and/or distribute this software for any purpose with or without fee is hereby granted.\n\nTHE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES WITH REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY SPECIAL, DIRECT, INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES WHATSOEVER RESULTING FROM LOSS OF USE, DATA OR PROFITS, WHETHER IN AN ACTION OF CONTRACT, NEGLIGENCE OR OTHER TORTIOUS ACTION, ARISING OUT OF OR IN CONNECTION WITH THE USE OR PERFORMANCE OF THIS SOFTWARE.\n';
const metafile = JSON.stringify(meta, null, 2) + '\n';
const metadata = { schemaVersion: '1.0', package: pkg.name, version: pkg.version, license: pkg.license,
  registryIntegrity: integrity, licenseSha256: licenseSha, bundleSha256: sha(bundle), bundleBytes: bundle.length,
  gzipBytes: gzipSync(bundle).length, metafileSha256: sha(metafile), attributionSha256: sha(attribution), inputs,
  packages: [...packages.values()].map(({ name, version, license, texts }) => ({ name, version, license,
    licenses: texts.map(t => ({ file: t.file, sha256: sha(t.text), source: t.source, ...(t.sourceSha256 ? { sourceSha256: t.sourceSha256 } : {}) })) })),
  build: { tool: 'esbuild', version: esbuildVersion, platform: 'browser', format: 'iife', target: 'es2022', minified: true } };
const checked = verifyMoveableArtifacts({ bundle: new TextDecoder().decode(bundle), metafile, attribution, metadata });
if (checked.status !== 'pass') throw new Error(checked.errors.join(' '));
await mkdir(out, { recursive: true });
await writeFile(resolve(out, 'moveable-0.53.0.iife.js'), bundle);
await writeFile(resolve(out, 'moveable-metafile.json'), metafile);
await writeFile(resolve(out, 'moveable-LICENSE.md'), attribution);
await writeFile(resolve(out, 'moveable-vendor.json'), JSON.stringify(metadata, null, 2) + '\n');
console.log(JSON.stringify({ bundleBytes: metadata.bundleBytes, gzipBytes: metadata.gzipBytes, bundleSha256: metadata.bundleSha256, inputs: inputs.length, packages: packages.size, selectoInputs: 0 }, null, 2));
