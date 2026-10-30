import { readFile } from 'node:fs/promises';
import { isAbsolute, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { probeCapabilities } from '../runtime/capability-probe.js';

const requiredSteps = [
  'fresh state: play mode',
  'fresh state: presenter hidden',
  'fresh state: editor hidden',
  'fresh state: three slides',
  'next navigation',
  'previous navigation',
  'presenter visible',
  'presenter fields',
  'edit text',
  'move down',
  'move up',
  'duplicate adds one and keeps IDs unique',
  'delete removes current duplicate',
  'save HTML download',
];

const projectRoot = resolve(fileURLToPath(new URL('../', import.meta.url)));
const toWorkspacePath = (value) => {
  if (value instanceof URL) return fileURLToPath(value);
  return isAbsolute(value) ? value : resolve(projectRoot, value);
};
const toCliPath = (value) => {
  if (value instanceof URL) return fileURLToPath(value);
  return isAbsolute(value) ? value : resolve(process.cwd(), value);
};

const blocked = (reason) => ({
  status: 'blocked',
  reason,
  humanAction: '請由人類選擇可重播的 runtime 等價證據，或縮減範圍。',
});

export async function validateSample({ deckPath, evidence, lastSuccessPath }) {
  if (evidence.receipt?.status === 'fail') return { status: 'fail', reason: 'Gate receipt 為 fail。' };
  if (evidence.receipt?.status === 'blocked') return blocked('Gate receipt 為 blocked。');
  if (evidence.receipt?.repairAttempts >= 3) return blocked('同一問題已達第三次修復，停止自動重試。');
  if (evidence.threeModeSmoke?.status !== 'pass') return { status: 'fail', reason: '三模式 smoke receipt 未通過。' };

  let browserReceipt;
  try {
    browserReceipt = JSON.parse(await readFile(toWorkspacePath(evidence.browserReceipt), 'utf8'));
  } catch {
    return blocked('無法讀取三模式 browser receipt。');
  }
  if (browserReceipt.status !== 'PASS') return { status: 'fail', reason: 'browser receipt 未通過。' };
  if (requiredSteps.some((name) => !browserReceipt.steps?.some((step) => step.name === name && step.pass === true))) {
    return { status: 'fail', reason: 'browser receipt 缺少必要的三模式操作。' };
  }

  const actual = await probeCapabilities({
    deckPath,
    browserReceiptPath: toWorkspacePath(evidence.browserReceipt),
    artifactRoot: projectRoot,
  });
  for (const name of ['canRead', 'canRender', 'canScreenshot', 'canSave']) {
    if (evidence.capabilityProbe?.[name]?.status !== 'true' || actual[name].status !== 'true') {
      return blocked(`${name} 沒有可重播的 true 證據。`);
    }
  }

  return {
    status: 'pass',
    evidence: { deck: String(deckPath), browserReceipt: evidence.browserReceipt },
    preservedLastSuccess: lastSuccessPath ? String(lastSuccessPath) : evidence.receipt.lastSuccessfulEvidence,
  };
}

const args = process.argv.slice(2);
const valueOf = (flag) => args[args.indexOf(flag) + 1];

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const deck = valueOf('--deck');
  const evidencePath = valueOf('--evidence');
  if (!deck || !evidencePath) {
    console.error('用法：node validate-sample.mjs --deck <deck.html> --evidence <render-evidence.json>');
    process.exitCode = 1;
  } else {
    const evidence = JSON.parse(await readFile(toCliPath(evidencePath), 'utf8'));
    const result = await validateSample({ deckPath: toCliPath(deck), evidence });
    console.log(JSON.stringify(result));
    if (result.status !== 'pass') process.exitCode = 1;
  }
}
