import { mkdir, readFile, rename, stat, writeFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { dirname, join, resolve } from 'node:path';

const allowed = Object.freeze({
  language: new Set(['zh-Hant', 'zh-Hans', 'en', 'ja']),
  stylePreferences: new Set(['company-style', 'typography-hero', 'information-led', 'graphic-brand-field']),
  density: new Set(['low', 'medium', 'high']),
  motionPreference: new Set(['none', 'reduced', 'subtle', 'expressive']),
  fontPersonality: new Set(['system-default', 'editorial-display', 'modern-grotesk', 'technical-condensed', 'institutional-serif']),
  colorMood: new Set(['warm-neutral', 'cool-neutral', 'dark-premium', 'high-contrast', 'brand-led']),
});

const allowedKeys = new Set(['schemaVersion', ...Object.keys(allowed), 'sampleFirst']);

export function resolveProfilePath({ homeDirectory = homedir() } = {}) {
  return resolve(homeDirectory, '.pptskill', 'profile.json');
}

export function validateLocalProfile(input) {
  const errors = [];
  if (!input || typeof input !== 'object' || Array.isArray(input)) return { status: 'fail', errors: ['Profile 必須是物件。'] };
  for (const key of Object.keys(input)) if (!allowedKeys.has(key)) errors.push(`Profile 不接受欄位：${key}。`);
  if (input.schemaVersion !== undefined && input.schemaVersion !== '1.0') errors.push('schemaVersion 必須是 1.0。');
  for (const key of ['language', 'density', 'motionPreference', 'fontPersonality', 'colorMood']) {
    if (input[key] !== undefined && !allowed[key].has(input[key])) errors.push(`${key} 不是支援的偏好值。`);
  }
  if (input.sampleFirst !== undefined && typeof input.sampleFirst !== 'boolean') errors.push('sampleFirst 必須是 boolean。');
  if (input.stylePreferences !== undefined) {
    if (!Array.isArray(input.stylePreferences) || input.stylePreferences.length > 4 || input.stylePreferences.some((value) => !allowed.stylePreferences.has(value))) errors.push('stylePreferences 只能包含最多四個支援的 Style。');
  }
  return { status: errors.length ? 'fail' : 'pass', errors };
}

export function sanitizeLocalProfile(input) {
  const validation = validateLocalProfile(input);
  if (validation.status !== 'pass') throw new Error(validation.errors.join(' '));
  return {
    schemaVersion: '1.0',
    ...(input.language ? { language: input.language } : {}),
    ...(input.stylePreferences ? { stylePreferences: [...new Set(input.stylePreferences)] } : {}),
    ...(input.density ? { density: input.density } : {}),
    ...(input.sampleFirst !== undefined ? { sampleFirst: input.sampleFirst } : {}),
    ...(input.motionPreference ? { motionPreference: input.motionPreference } : {}),
    ...(input.fontPersonality ? { fontPersonality: input.fontPersonality } : {}),
    ...(input.colorMood ? { colorMood: input.colorMood } : {}),
  };
}

export async function loadLocalProfile({ profilePath = resolveProfilePath() } = {}) {
  try {
    const profile = sanitizeLocalProfile(JSON.parse(await readFile(profilePath, 'utf8')));
    return { status: 'present', profile, profilePath };
  } catch (error) {
    if (error?.code === 'ENOENT') return { status: 'absent', profile: null, profilePath };
    return { status: 'invalid', profile: null, profilePath, error: error.message };
  }
}

export async function saveLocalProfile(input, { remember = false, profilePath = resolveProfilePath() } = {}) {
  if (remember !== true) return { status: 'skipped', reason: '使用者未明確選擇記住偏好。', profilePath };
  const profile = sanitizeLocalProfile(input);
  await mkdir(dirname(profilePath), { recursive: true, mode: 0o700 });
  const temporaryPath = join(dirname(profilePath), `.profile-${process.pid}-${Date.now()}.tmp`);
  await writeFile(temporaryPath, `${JSON.stringify(profile, null, 2)}\n`, { mode: 0o600 });
  await rename(temporaryPath, profilePath);
  return { status: 'saved', profile, profilePath, mode: (await stat(profilePath)).mode & 0o777 };
}

export function createProfileReminderGate({ profileStatus = 'absent' } = {}) {
  let offered = false;
  return {
    next() {
      if (profileStatus !== 'absent' || offered) return null;
      offered = true;
      return '如果你常用這些偏好，可以在完成後選擇「記住偏好」；不記也不影響這份簡報。';
    },
  };
}
