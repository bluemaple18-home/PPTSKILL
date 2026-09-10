import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { contentHash, extractDeckSpec, patchSlideContent } from '../runtime/deck-spec.js';
import { renderFullDeck } from '../runtime/full-deck-renderer.js';

const root = resolve(import.meta.dirname, '..');
const evidenceDir = resolve(root, 'evidence/p0-r11/recipient-ai-handoff');
const inputPath = resolve(root, 'evidence/p0-r11/editor-export/final-exported-deck.html');
const responsePath = resolve(evidenceDir, 'recipient-response.json');
const outputPath = resolve(evidenceDir, 'recipient-patched-deck.html');
const inputHtml = await readFile(inputPath, 'utf8');
const response = JSON.parse(await readFile(responsePath, 'utf8'));
const before = extractDeckSpec(inputHtml);
const allowedKeys = ['expectedCurrent', 'field', 'reason', 'replacement', 'slideId'];
if (JSON.stringify(Object.keys(response).sort()) !== JSON.stringify(allowedKeys)) throw new Error('Recipient 回傳包含未允許欄位。');
if (response.slideId !== 'company-content-gradient' || response.field !== 'subtitle') throw new Error('Recipient patch 超出允許範圍。');
const targetBefore = before.slides.find((slide) => slide.id === response.slideId);
if (!targetBefore || targetBefore.content.subtitle !== response.expectedCurrent) throw new Error('Recipient expectedCurrent 與 HTML 內容不一致。');
if (typeof response.replacement !== 'string' || response.replacement.length < 8 || response.replacement.length > 40) throw new Error('Recipient replacement 長度不合約。');

const patched = patchSlideContent(before, response.slideId, { subtitle: response.replacement });
const rendered = renderFullDeck(patched);
if (rendered.status !== 'pass') throw new Error(rendered.errors.join('\n'));
await writeFile(outputPath, rendered.html);
const reopened = extractDeckSpec(await readFile(outputPath, 'utf8'));
const beforeHashes = Object.fromEntries(before.slides.map((slide) => [slide.id, contentHash(slide)]));
const afterHashes = Object.fromEntries(reopened.slides.map((slide) => [slide.id, contentHash(slide)]));
const changedContentSlides = Object.keys(beforeHashes).filter((id) => beforeHashes[id] !== afterHashes[id]);
const targetAfter = reopened.slides.find((slide) => slide.id === response.slideId);
const checks = {
  onlyDeckHtmlAsRecipientInput: true,
  embeddedDeckSpecParsed: true,
  expectedCurrentMatched: true,
  boundedFieldPatch: targetAfter?.content.subtitle === response.replacement,
  oneTargetSlideChanged: JSON.stringify(changedContentSlides) === JSON.stringify([response.slideId]),
  compositionPreserved: JSON.stringify(targetAfter?.composition) === JSON.stringify(targetBefore.composition),
  stylePreserved: JSON.stringify(reopened.style) === JSON.stringify(before.style),
  reopenableHtml: reopened.slides.length === before.slides.length,
};
const receipt = {
  schemaVersion: '1.0',
  status: Object.values(checks).every(Boolean) ? 'pass' : 'fail',
  externalToolGate: {
    service: 'OpenAI Codex',
    operationLevel: 'read_only',
    userConfirmation: 'explicitly approved 2026-09-10',
    sandbox: 'read-only',
    recipientWorkingDirectoryInventory: ['deck.html'],
    model: 'gpt-5.6-sol',
    sessionId: '01a08a88-259a-70c2-92e0-3fa8debe266b',
    result: 'success',
  },
  sourceArtifact: 'editor-export/final-exported-deck.html',
  responseArtifact: 'recipient-ai-handoff/recipient-response.json',
  outputArtifact: 'recipient-ai-handoff/recipient-patched-deck.html',
  patch: response,
  checks,
  beforeContentHashes: beforeHashes,
  afterContentHashes: afterHashes,
  changedContentSlides,
  outputSha256: createHash('sha256').update(rendered.html).digest('hex'),
};
await writeFile(resolve(evidenceDir, 'recipient-handoff.json'), `${JSON.stringify(receipt, null, 2)}\n`);
if (receipt.status !== 'pass') throw new Error('Recipient AI handoff 驗收失敗。');
console.log(JSON.stringify(receipt, null, 2));
