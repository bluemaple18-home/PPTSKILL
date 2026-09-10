import { execFile } from 'node:child_process';
import { createHash } from 'node:crypto';
import { cp, mkdir, mkdtemp, readFile, readdir, rm, utimes, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { promisify } from 'node:util';

const run = promisify(execFile);
const repoRoot = resolve(fileURLToPath(new URL('..', import.meta.url)));
const normalizedTimestamp = new Date('2000-01-01T00:00:00.000Z');

const normalizeAndListFiles = async (root, relative = '') => {
  const entries = await readdir(resolve(root, relative), { withFileTypes: true });
  const files = [];
  for (const entry of entries.sort((left, right) => left.name < right.name ? -1 : left.name > right.name ? 1 : 0)) {
    const path = relative ? `${relative}/${entry.name}` : entry.name;
    if (entry.isDirectory()) files.push(...await normalizeAndListFiles(root, path));
    else {
      await utimes(resolve(root, path), normalizedTimestamp, normalizedTimestamp);
      files.push(path);
    }
  }
  return files;
};

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
    await cp(resolve(projectRoot, 'design', 'company-style'), resolve(bundle, 'core', 'design', 'company-style'), { recursive: true });
    await cp(resolve(projectRoot, 'working-spec.md'), resolve(bundle, 'core', 'working-spec.md'));
    await writeFile(resolve(bundle, 'core', 'package.json'), `${JSON.stringify({ name: 'pptskill-core', version, private: true, type: 'module' }, null, 2)}\n`);
    await cp(resolve(projectRoot, 'distribution', 'adapters'), resolve(bundle, 'adapters'), { recursive: true });
    await cp(resolve(projectRoot, 'distribution', 'skill'), resolve(bundle, 'skill'), { recursive: true });
    await cp(resolve(projectRoot, 'distribution', 'lib'), resolve(bundle, 'lib'), { recursive: true });
    for (const file of ['README.md', 'install.mjs', 'update.mjs', 'uninstall.mjs', 'smoke.mjs', 'profile.mjs']) await cp(resolve(projectRoot, 'distribution', file), resolve(bundle, file));
    const manifest = {
      schemaVersion: '1.0',
      name: 'PPTSKILL',
      version,
      corePath: 'core',
      adapters: ['codex', 'claude-code', 'gemini'],
      requiresGit: false,
      profilePath: '~/.pptskill/profile.json',
      skillPath: 'skill/pptskill/SKILL.md',
    };
    await writeFile(resolve(bundle, 'package-manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
    await mkdir(dirname(archive), { recursive: true });
    await rm(archive, { force: true });
    const archiveEntries = (await normalizeAndListFiles(bundle)).map((file) => `PPTSKILL/${file}`);
    await run('/usr/bin/zip', ['-X', '-q', archive, ...archiveEntries], { cwd: temporary, env: { ...process.env, TZ: 'UTC' } });
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
