import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import test from 'node:test';
import { mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import { evaluateFullDeckQa } from '../runtime/full-deck-qa.js';
import { collectFullDeckQaEvidence } from '../runtime/representative-qa-evidence.js';

const run = promisify(execFile);
const root = join(dirname(fileURLToPath(import.meta.url)), '..');

test('每張 canonical slide 的 required title 在 static mode 不可被 CSS 隱藏', async () => {
  const source = await readFile(join(root, 'fixtures', 'full-deck.html'), 'utf8');
  const tampered = source.replace('</head>', '<style>#decision [data-effect-title]{opacity:0!important}</style></head>');
  const temporary = await mkdtemp(join(tmpdir(), 'pptskill-required-visibility-'));
  const artifact = join(temporary, 'hidden-title.html');
  await writeFile(artifact, tampered);
  await assert.rejects(
    run(process.execPath, [join(root, 'tools', 'browser-geometry-qa.mjs'), artifact, '--motion', 'static'], { maxBuffer: 32 * 1024 * 1024 }),
    (error) => {
      const receipt = JSON.parse(error.stdout);
      assert.equal(receipt.status, 'fail');
      assert.equal(receipt.gates.requiredVisibility, 'fail');
      assert.ok(receipt.runs.every(({ requiredVisibility }) => requiredVisibility.some(({ slideId, target, status }) => (
        slideId === 'decision' && target === 'slides.decision.content.title' && status === 'fail'
      ))));
      return true;
    },
  );
  const evidence = await collectFullDeckQaEvidence({ artifactPath: artifact, contractVersion: 'pgq-wp4-v1' });
  const decision = evaluateFullDeckQa({ evidence });
  assert.equal(decision.status, 'repair');
  assert.deepEqual(decision.layer1.issues.map(({ slideId, code }) => [slideId, code]), [
    ['decision', 'static_readability'],
    ['decision', 'animation_interference'],
  ]);
});
