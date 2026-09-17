import { execFile } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { basename, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import { extractDeckSpec } from './deck-spec.js';
import { createRepresentativeSampleIdentity, fingerprintValue } from './representative-sample-identity.js';

const run = promisify(execFile);
const trustedEvidence = new WeakSet();
const MODES = Object.freeze(['static', 'normal']);
const CHECK_CODES = Object.freeze(['content_integrity', 'geometry', 'static_readability', 'animation_interference']);

const deepFreeze = (value) => {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  Object.freeze(value);
  for (const child of Object.values(value)) deepFreeze(child);
  return value;
};

const parseReceipt = (stdout, mode, artifactName) => {
  let receipt;
  try { receipt = JSON.parse(stdout); } catch { throw new Error(`Trusted browser producer 未輸出合法 ${mode} JSON receipt。`); }
  if (receipt?.schemaVersion !== '1.0' || receipt.motionMode !== mode || receipt.artifact !== artifactName || !Array.isArray(receipt.runs)) {
    throw new Error(`Trusted browser producer 的 ${mode} receipt contract 無效。`);
  }
  return receipt;
};

const runProducer = async ({ producerPath, artifactPath, mode }) => {
  try {
    const { stdout } = await run(process.execPath, [producerPath, artifactPath, '--motion', mode], { maxBuffer: 32 * 1024 * 1024 });
    return parseReceipt(stdout, mode, basename(artifactPath));
  } catch (error) {
    if (error.stdout) return parseReceipt(error.stdout, mode, basename(artifactPath));
    throw new Error(`Trusted browser producer ${mode} 執行失敗：${error.message}`);
  }
};

export async function collectRepresentativeQaEvidence({ artifactPath, sample, contractVersion }) {
  const resolvedArtifact = resolve(artifactPath);
  const html = await readFile(resolvedArtifact, 'utf8');
  const artifactSha256 = createHash('sha256').update(html).digest('hex');
  const deckSpec = extractDeckSpec(html);
  const identity = createRepresentativeSampleIdentity({ sample, deckSpec, contractVersion });
  const producerPath = fileURLToPath(new URL('../tools/browser-geometry-qa.mjs', import.meta.url));
  const receipts = {};
  for (const mode of MODES) receipts[mode] = await runProducer({ producerPath, artifactPath: resolvedArtifact, mode });
  const finalHtml = await readFile(resolvedArtifact, 'utf8');
  if (createHash('sha256').update(finalHtml).digest('hex') !== artifactSha256) {
    throw new Error('Portable artifact 在 trusted browser producer 執行期間發生變更；不得建立 approval evidence。');
  }
  const contentIntegrityPass = (slideId) => MODES.every((mode) => receipts[mode].runs.every((run) => (
    Array.isArray(run.contentIntegrity)
    && run.contentIntegrity.some((item) => item.slideId === slideId && item.status === 'pass')
  )));
  const checks = sample.slideIds.flatMap((slideId) => CHECK_CODES.map((code) => {
    const status = code === 'content_integrity'
      ? contentIntegrityPass(slideId) ? 'pass' : 'fail'
      : code === 'static_readability'
        ? receipts.static.status
        : code === 'animation_interference'
          ? receipts.normal.status
          : receipts.static.status === 'pass' && receipts.normal.status === 'pass' ? 'pass' : 'fail';
    const mode = code === 'static_readability' ? 'static' : code === 'animation_interference' ? 'normal' : 'static+normal';
    return { slideId, code, status, evidenceRef: `${basename(resolvedArtifact)}#trusted-browser-${mode}` };
  }));
  const evidence = {
    version: 1,
    producer: 'pptskill-browser-geometry-qa',
    artifact: basename(resolvedArtifact),
    artifactSha256,
    sample: structuredClone(sample),
    validatedIdentity: identity,
    checks,
    receiptFingerprints: Object.fromEntries(MODES.map((mode) => [mode, fingerprintValue(receipts[mode])])),
  };
  trustedEvidence.add(evidence);
  return deepFreeze(evidence);
}

export function assertTrustedRepresentativeQaEvidence(evidence) {
  if (!evidence || !trustedEvidence.has(evidence)) {
    throw new Error('Representative QA evidence 必須由本次 runtime 的 trusted browser producer 產生；不可由 caller 提交 JSON、PASS 或 fingerprint。');
  }
  return evidence;
}
