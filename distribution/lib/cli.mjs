import { fileURLToPath } from 'node:url';
import { basename, dirname, resolve } from 'node:path';
import { homedir } from 'node:os';
import { installDistribution, smokeDistribution, uninstallDistribution, updateDistribution } from './lifecycle.mjs';
import { inspectSkillRegistration, preflightSkillRegistration, registerSkills, unregisterSkills } from './skill-registration.mjs';

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
    const runtimeRoot = resolve(installRoot || resolve(homedir(), '.pptskill', 'runtime'));
    const skillHomeRoot = installRoot && basename(runtimeRoot) === 'runtime' && basename(dirname(runtimeRoot)) === '.pptskill'
      ? dirname(dirname(runtimeRoot)) : homedir();
    let result;
    if (command === 'install') {
      await preflightSkillRegistration({ homeRoot: skillHomeRoot, installRoot: runtimeRoot });
      result = await installDistribution({ sourceRoot, ...(installRoot ? { installRoot } : {}) });
      try { result.skillRegistration = await registerSkills({ runtimeRoot: result.installRoot, homeRoot: skillHomeRoot, version: result.version }); }
      catch (error) { await uninstallDistribution({ installRoot: result.installRoot }); throw error; }
    }
    if (command === 'update') {
      await preflightSkillRegistration({ homeRoot: skillHomeRoot, installRoot: runtimeRoot });
      result = await updateDistribution({ sourceRoot, ...(installRoot ? { installRoot } : {}) });
      try { result.skillRegistration = await registerSkills({ runtimeRoot: result.installRoot, homeRoot: skillHomeRoot, version: result.version }); }
      catch (error) {
        result.status = 'updated_with_warning';
        result.skillRegistration = { status: 'failed', error: error.message };
        result.warning = [result.warning, `runtime 已更新，但 Skill 註冊失敗：${error.message}`].filter(Boolean).join('；');
      }
    }
    if (command === 'uninstall') {
      result = await uninstallDistribution({ ...(installRoot ? { installRoot } : {}), purgeProfile: args.includes('--purge-profile') });
      result.skillRegistration = await unregisterSkills({ runtimeRoot, homeRoot: skillHomeRoot });
    }
    if (command === 'smoke') {
      result = await smokeDistribution({ ...(installRoot ? { installRoot } : {}), ...(valueOf(args, '--adapter') ? { adapterId: valueOf(args, '--adapter') } : {}), all: args.includes('--all') });
      result.skillRegistration = await inspectSkillRegistration({ runtimeRoot, homeRoot: skillHomeRoot });
      if (result.skillRegistration.status !== 'pass') result.status = 'partial';
    }
    if (!result) throw new Error(`未知 lifecycle command：${command}。`);
    console.log(JSON.stringify(result, null, 2));
    if (command === 'smoke' && result.status !== 'pass') process.exitCode = 2;
  } catch (error) {
    console.error(`PPTSKILL ${command}：${error.message}`);
    process.exitCode = 1;
  }
}
