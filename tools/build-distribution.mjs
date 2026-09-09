import { execFile } from 'node:child_process';
import { createHash } from 'node:crypto';
import { cp, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { promisify } from 'node:util';

const run = promisify(execFile);
const repoRoot = resolve(fileURLToPath(new URL('..', import.meta.url)));

export async function buildDistribution({ archivePath, projectRoot = repoRoot } = {}) {
  const packageJson = JSON.parse(await readFile(resolve(projectRoot, 'package.json'), 'utf8'));
  const version = packageJson.version;
  if (!version) throw new Error('package.json 缺少 version。');
  const archive = resolve(archivePath || resolve(projectRoot, 'dist', `PPTSKILL-${version}.zip`));
  const temporary = await mkdtemp(`${tmpdir()}/pptskill-dist-`);
  const bundle = resolve(temporary, 'PPTSKILL');
  try {
    await mkdir(resolve(bundle, 'core'), { recursive: true });
    for (const directory of ['runtime', 'contracts', 'schemas']) await cp(resolve(projectRoot, directory), resolve(bundle, 'core', directory), { recursive: true });
    await mkdir(resolve(bundle, 'core', 'design', 'materials'), { recursive: true });
    for (const file of ['golden-design-grammar.v1.json', 'golden-design-grammar.md', 'motion-baseline.md']) await cp(resolve(projectRoot, 'design', 'materials', file), resolve(bundle, 'core', 'design', 'materials', file));
    await cp(resolve(projectRoot, 'design', 'visual-route-contract.md'), resolve(bundle, 'core', 'design', 'visual-route-contract.md'));
    for (const file of ['README.md', 'working-spec.md', 'package.json']) await cp(resolve(projectRoot, file), resolve(bundle, 'core', file));
    await cp(resolve(projectRoot, 'distribution', 'adapters'), resolve(bundle, 'adapters'), { recursive: true });
    await cp(resolve(projectRoot, 'distribution', 'lib'), resolve(bundle, 'lib'), { recursive: true });
    for (const file of ['README.md', 'install.mjs', 'update.mjs', 'uninstall.mjs', 'smoke.mjs']) await cp(resolve(projectRoot, 'distribution', file), resolve(bundle, file));
    const manifest = {
      schemaVersion: '1.0',
      name: 'PPTSKILL',
      version,
      corePath: 'core',
      adapters: ['codex', 'claude-code', 'gemini'],
      requiresGit: false,
      profilePath: '~/.pptskill/profile.json',
    };
    await writeFile(resolve(bundle, 'package-manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
    await mkdir(dirname(archive), { recursive: true });
    await rm(archive, { force: true });
    await run('/usr/bin/zip', ['-X', '-q', '-r', archive, 'PPTSKILL'], { cwd: temporary });
    const sha256 = createHash('sha256').update(await readFile(archive)).digest('hex');
    await writeFile(`${archive}.sha256`, `${sha256}  ${archive.split('/').at(-1)}\n`);
    return { status: 'built', archivePath: archive, version, sha256, manifest };
  } finally {
    await rm(temporary, { recursive: true, force: true });
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const outputIndex = process.argv.indexOf('--output');
  const result = await buildDistribution({ ...(outputIndex >= 0 ? { archivePath: process.argv[outputIndex + 1] } : {}) });
  console.log(JSON.stringify(result, null, 2));
}
