import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { installDistribution, smokeDistribution, uninstallDistribution, updateDistribution } from './lifecycle.mjs';

const valueOf = (args, flag) => {
  const index = args.indexOf(flag);
  const value = index >= 0 ? args[index + 1] : undefined;
  return value && !value.startsWith('-') ? value : undefined;
};

export async function runLifecycleCli(command, args = process.argv.slice(2)) {
  const sourceRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
  const installRoot = valueOf(args, '--install-root');
  try {
    if (args.includes('--profile')) throw new Error('正式 CLI 不接受 --profile；profile purge 只允許 canonical user profile。');
    if (args.includes('--install-root') && !installRoot) throw new Error('請提供 --install-root <runtime-path>。');
    if (args.includes('--adapter') && !valueOf(args, '--adapter')) throw new Error('請提供 --adapter <codex|claude-code|gemini>。');
    let result;
    if (command === 'install') result = await installDistribution({ sourceRoot, ...(installRoot ? { installRoot } : {}) });
    if (command === 'update') result = await updateDistribution({ sourceRoot, ...(installRoot ? { installRoot } : {}) });
    if (command === 'uninstall') result = await uninstallDistribution({ ...(installRoot ? { installRoot } : {}), purgeProfile: args.includes('--purge-profile') });
    if (command === 'smoke') result = await smokeDistribution({ ...(installRoot ? { installRoot } : {}), ...(valueOf(args, '--adapter') ? { adapterId: valueOf(args, '--adapter') } : {}), all: args.includes('--all') });
    if (!result) throw new Error(`未知 lifecycle command：${command}。`);
    console.log(JSON.stringify(result, null, 2));
    if (command === 'smoke' && result.status !== 'pass') process.exitCode = 2;
  } catch (error) {
    console.error(`PPTSKILL ${command}：${error.message}`);
    process.exitCode = 1;
  }
}
