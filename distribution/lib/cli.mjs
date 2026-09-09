import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { installDistribution, smokeDistribution, uninstallDistribution, updateDistribution } from './lifecycle.mjs';

const valueOf = (args, flag) => {
  const index = args.indexOf(flag);
  return index >= 0 ? args[index + 1] : undefined;
};

export async function runLifecycleCli(command, args = process.argv.slice(2)) {
  const sourceRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
  const installRoot = valueOf(args, '--install-root');
  const profilePath = valueOf(args, '--profile');
  try {
    let result;
    if (command === 'install') result = await installDistribution({ sourceRoot, ...(installRoot ? { installRoot } : {}) });
    if (command === 'update') result = await updateDistribution({ sourceRoot, ...(installRoot ? { installRoot } : {}) });
    if (command === 'uninstall') result = await uninstallDistribution({ ...(installRoot ? { installRoot } : {}), ...(profilePath ? { profilePath } : {}), purgeProfile: args.includes('--purge-profile') });
    if (command === 'smoke') result = await smokeDistribution({ ...(installRoot ? { installRoot } : {}) });
    if (!result) throw new Error(`未知 lifecycle command：${command}。`);
    console.log(JSON.stringify(result, null, 2));
    if (command === 'smoke' && result.status !== 'pass') process.exitCode = 2;
  } catch (error) {
    console.error(`PPTSKILL ${command}：${error.message}`);
    process.exitCode = 1;
  }
}
