import { access, readFile } from 'node:fs/promises';
import { isAbsolute, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const defaultArtifactRoot = resolve(fileURLToPath(new URL('../', import.meta.url)));

const readable = async (path) => {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
};

const evidence = (status, path, detail) => ({ status, path: String(path), detail });

export async function probeCapabilities({ deckPath, browserReceiptPath, artifactRoot = defaultArtifactRoot }) {
  let canRead;
  try {
    canRead = (await readFile(deckPath, 'utf8')).length > 0
      ? evidence('true', deckPath, '可讀取非空的本機 deck。')
      : evidence('false', deckPath, 'deck 為空。');
  } catch {
    canRead = evidence('false', deckPath, '無法讀取 deck。');
  }

  let receipt;
  try {
    receipt = JSON.parse(await readFile(browserReceiptPath, 'utf8'));
  } catch {
    return {
      canRead,
      canRender: evidence('unknown', browserReceiptPath, '缺少可重播 browser receipt。'),
      canScreenshot: evidence('unknown', browserReceiptPath, '缺少可重播 screenshot receipt。'),
      canSave: evidence('unknown', browserReceiptPath, '缺少可重播另存 receipt。'),
    };
  }

  const stepsPass = (name) => receipt.steps?.some((step) => step.name === name && step.pass === true);
  const receiptPassed = receipt.status === 'PASS';
  const screenshot = receipt.screenshots?.[0];
  const download = receipt.downloads?.[0];
  const artifactPath = (value) => isAbsolute(value) ? value : resolve(artifactRoot, value);
  const screenshotPath = screenshot?.path ? artifactPath(screenshot.path) : browserReceiptPath;
  const savedDeckPath = download?.savedAs ? artifactPath(download.savedAs) : browserReceiptPath;
  const hasScreenshot = screenshot && await readable(screenshotPath);
  const hasSavedDeck = download && await readable(savedDeckPath);

  return {
    canRead,
    canRender: evidence(receiptPassed && hasScreenshot ? 'true' : 'false', browserReceiptPath, '以 browser receipt 與實際 screenshot 檔確認渲染。'),
    canScreenshot: evidence(receiptPassed && hasScreenshot ? 'true' : 'false', screenshotPath, '以 receipt 引用的 screenshot 檔確認截圖。'),
    canSave: evidence(receiptPassed && stepsPass('save HTML download') && download?.singleFile === true && hasSavedDeck ? 'true' : 'false', savedDeckPath, '以 receipt 引用的單檔下載確認另存。'),
  };
}
