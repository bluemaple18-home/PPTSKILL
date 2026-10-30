import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { loadLocalProfile, resolveProfilePath, saveLocalProfile } from '../runtime/local-profile.js';

const args = process.argv.slice(2);
const command = args[0];
const valueOf = (flag) => {
  const index = args.indexOf(flag);
  return index >= 0 ? args[index + 1] : undefined;
};
const profilePath = valueOf('--profile') ? resolve(valueOf('--profile')) : resolveProfilePath();

try {
  if (command === 'path') {
    console.log(profilePath);
  } else if (command === 'show') {
    const result = await loadLocalProfile({ profilePath });
    console.log(result.status === 'absent' ? '尚未儲存個人偏好；這是正常狀態。' : JSON.stringify(result, null, 2));
    if (result.status === 'invalid') process.exitCode = 1;
  } else if (command === 'save') {
    const inputPath = valueOf('--input');
    if (!inputPath) throw new Error('請提供 --input <profile.json>。');
    const input = JSON.parse(await readFile(resolve(inputPath), 'utf8'));
    const result = await saveLocalProfile(input, { remember: args.includes('--remember'), profilePath });
    console.log(result.status === 'saved' ? `已儲存個人偏好：${result.profilePath}` : result.reason);
  } else {
    throw new Error('用法：node tools/profile.mjs <path|show|save> [--input profile.json --remember] [--profile path]');
  }
} catch (error) {
  console.error(`PPTSKILL profile：${error.message}`);
  process.exitCode = 1;
}
