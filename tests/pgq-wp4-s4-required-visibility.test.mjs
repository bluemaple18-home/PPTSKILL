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

test('每張 canonical slide 的 required title 必須有 painted visibility', async () => {
  const source = await readFile(join(root, 'fixtures', 'full-deck.html'), 'utf8');
  const tampered = source
    .replace('</head>', '<style>html:not(.motion-static) #problem [data-effect-title]{filter:opacity(0)!important}#decision [data-effect-title]{opacity:0!important}#guardrails [data-effect-title]{clip-path:inset(0 0 100% 0)!important}#portable{filter:opacity(0)!important}#evidence [data-effect-title]{clip-path:inset(0 0 60% 0)!important}#workflow [data-effect-title]{opacity:.2!important}</style></head>')
    .replace('data-edit-target="slides.transition.content.title"', 'data-removed-edit-target="slides.transition.content.title"');
  const temporary = await mkdtemp(join(tmpdir(), 'pptskill-required-visibility-'));
  const artifact = join(temporary, 'hidden-title.html');
  await writeFile(artifact, tampered);
  await assert.rejects(
    run(process.execPath, [join(root, 'tools', 'browser-geometry-qa.mjs'), artifact, '--motion', 'static'], { maxBuffer: 32 * 1024 * 1024 }),
    (error) => {
      const receipt = JSON.parse(error.stdout);
      assert.equal(receipt.status, 'fail');
      assert.equal(receipt.gates.rasterVisibility, 'fail');
      for (const [slideId, target] of [
        ['workflow', 'slides.workflow.content.title'],
        ['portable', 'slides.portable.content.title'],
        ['guardrails', 'slides.guardrails.content.title'],
        ['transition', 'slides.transition.content.title'],
        ['evidence', 'slides.evidence.content.title'],
        ['decision', 'slides.decision.content.title'],
      ]) {
        assert.ok(receipt.runs.every(({ rasterVisibility }) => rasterVisibility.some((item) => (
          item.slideId === slideId && item.target === target && item.status === 'fail'
        ))));
      }
      assert.ok(receipt.runs.every(({ rasterVisibility }) => rasterVisibility.some((item) => item.slideId === 'evidence' && item.classification === 'partially_occluded')));
      assert.ok(receipt.runs.every(({ rasterVisibility }) => rasterVisibility.some((item) => item.slideId === 'workflow' && item.classification === 'insufficient_contrast')));
      assert.ok(receipt.runs.every(({ rasterVisibility }) => rasterVisibility.some((item) => item.slideId === 'transition' && item.classification === 'required_target_missing')));
      assert.equal(receipt.gates.requiredVisibility, 'fail');
      assert.ok(receipt.runs.every(({ requiredVisibility }) => requiredVisibility.some(({ slideId, target, status }) => (
        slideId === 'decision' && target === 'slides.decision.content.title' && status === 'fail'
      ))));
      assert.ok(receipt.runs.every(({ requiredVisibility }) => requiredVisibility.some(({ slideId, target, status }) => (
        slideId === 'guardrails' && target === 'slides.guardrails.content.title' && status === 'fail'
      ))));
      return true;
    },
  );
  await assert.rejects(
    run(process.execPath, [join(root, 'tools', 'browser-geometry-qa.mjs'), artifact, '--motion', 'normal'], { maxBuffer: 32 * 1024 * 1024 }),
    (error) => {
      const receipt = JSON.parse(error.stdout);
      assert.equal(receipt.gates.rasterVisibility, 'fail');
      assert.ok(receipt.runs.every(({ rasterVisibility }) => rasterVisibility.some((item) => (
        item.slideId === 'problem' && item.target === 'slides.problem.content.title'
          && item.status === 'fail' && item.classification === 'fully_invisible'
      ))));
      return true;
    },
  );
  const evidence = await collectFullDeckQaEvidence({ artifactPath: artifact, contractVersion: 'pgq-wp4-v1' });
  const decision = evaluateFullDeckQa({ evidence });
  assert.equal(decision.status, 'repair');
  assert.deepEqual(decision.layer1.issues.map(({ slideId, code }) => [slideId, code]), [
    ['problem', 'animation_interference'],
    ['workflow', 'static_readability'],
    ['workflow', 'animation_interference'],
    ['portable', 'static_readability'],
    ['portable', 'animation_interference'],
    ['guardrails', 'static_readability'],
    ['guardrails', 'animation_interference'],
    ['transition', 'content_integrity'],
    ['transition', 'static_readability'],
    ['transition', 'animation_interference'],
    ['evidence', 'static_readability'],
    ['evidence', 'animation_interference'],
    ['decision', 'static_readability'],
    ['decision', 'animation_interference'],
  ]);
});
