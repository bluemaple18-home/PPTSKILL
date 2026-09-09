import { execFile } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, resolve } from 'node:path';
import { promisify } from 'node:util';
import { installDistribution, smokeDistribution, uninstallDistribution } from '../distribution/lib/lifecycle.mjs';
import { buildDistribution } from './build-distribution.mjs';

const run = promisify(execFile);
const outputIndex = process.argv.indexOf('--output');
const output = resolve(outputIndex >= 0 ? process.argv[outputIndex + 1] : 'evidence/p1-r8/b/host-capability-probe.json');
const archiveIndex = process.argv.indexOf('--archive');
const temporary = await mkdtemp(`${tmpdir()}/pptskill-host-probe-`);
try {
  const archivePath = resolve(archiveIndex >= 0 ? process.argv[archiveIndex + 1] : resolve(temporary, 'PPTSKILL.zip'));
  if (archiveIndex < 0) await buildDistribution({ archivePath });
  const archiveSha256 = createHash('sha256').update(await readFile(archivePath)).digest('hex');
  const extractRoot = resolve(temporary, 'extract');
  await run('/usr/bin/unzip', ['-q', archivePath, '-d', extractRoot]);
  const packageManifest = JSON.parse(await readFile(resolve(extractRoot, 'PPTSKILL', 'package-manifest.json'), 'utf8'));
  const installRoot = resolve(temporary, 'user', '.pptskill', 'runtime');
  const install = await installDistribution({ sourceRoot: resolve(extractRoot, 'PPTSKILL'), installRoot });
  const capabilities = await smokeDistribution({ installRoot });
  const uninstall = await uninstallDistribution({ installRoot, profilePath: resolve(temporary, 'user', '.pptskill', 'profile.json') });
  const receipt = {
    schemaVersion: '1.0',
    generatedAt: new Date().toISOString(),
    lifecycleStatus: install.status === 'installed' && uninstall.status === 'uninstalled' ? 'pass' : 'fail',
    archive: { version: packageManifest.version, sha256: archiveSha256 },
    sharedCore: { ready: capabilities.coreReady, single: capabilities.oneSharedCore },
    hostCapabilityStatus: capabilities.status,
    adapters: capabilities.adapters,
    note: 'Host capability 只反映目前機器 PATH；缺少某個 CLI 不代表 ZIP lifecycle 失敗。',
  };
  await mkdir(dirname(output), { recursive: true });
  await writeFile(output, `${JSON.stringify(receipt, null, 2)}\n`);
  console.log(JSON.stringify(receipt, null, 2));
  if (receipt.lifecycleStatus !== 'pass' || !receipt.sharedCore.ready || !receipt.sharedCore.single) process.exitCode = 1;
} finally {
  await rm(temporary, { recursive: true, force: true });
}
