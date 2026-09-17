import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import test from 'node:test';
import { mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

const run = promisify(execFile);
const root = join(dirname(fileURLToPath(import.meta.url)), '..');

test('visible sample content 與 embedded DeckSpec 分歧時 trusted producer fail loud', async () => {
  const deckSpec = JSON.parse(await readFile(join(root, 'fixtures', 'full-deck-spec.json'), 'utf8'));
  const slide = deckSpec.slides[1];
  const source = await readFile(join(root, 'fixtures', 'full-deck.html'), 'utf8');
  const marker = `data-edit-target="slides.${slide.id}.content.title"`;
  const markerIndex = source.indexOf(marker);
  const titleIndex = source.indexOf(`>${slide.content.title}<`, markerIndex);
  assert.ok(markerIndex >= 0 && titleIndex >= 0, 'fixture 必須包含 sample title target。');
  const tampered = `${source.slice(0, titleIndex + 1)}錯誤但可見的標題${source.slice(titleIndex + slide.content.title.length + 1)}`;
  assert.match(tampered, new RegExp(`<script[^>]+id="deck-spec"[^>]*>[\\s\\S]*${slide.content.title}`));

  const temporary = await mkdtemp(join(tmpdir(), 'pptskill-content-integrity-'));
  const artifact = join(temporary, 'tampered.html');
  await writeFile(artifact, tampered);
  await assert.rejects(
    run(process.execPath, [join(root, 'tools', 'browser-geometry-qa.mjs'), artifact, '--motion', 'static'], { maxBuffer: 32 * 1024 * 1024 }),
    (error) => {
      const receipt = JSON.parse(error.stdout);
      assert.equal(receipt.status, 'fail');
      assert.ok(receipt.runs.every((item) => item.contentIntegrity.some(({ slideId, status }) => slideId === slide.id && status === 'fail')));
      return true;
    },
  );
});
