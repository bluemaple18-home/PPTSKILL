import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { contentHash, extractDeckSpec } from './deck-spec.js';
import { renderExistingDeckWithGate, renderNewDeckWithGate } from './workflow-entry.js';

const args = process.argv.slice(2);
const command = args[0];
const valueOf = (flag) => {
  const index = args.indexOf(flag);
  const value = index >= 0 ? args[index + 1] : undefined;
  if (!value || value.startsWith('--')) throw new Error(`缺少 ${flag}。`);
  return resolve(process.cwd(), value);
};
const readJson = async (flag) => JSON.parse(await readFile(valueOf(flag), 'utf8'));
const finish = (result) => {
  console.log(JSON.stringify(result, null, 2));
  if (result.status === 'blocked') process.exitCode = 2;
  else if (result.status !== 'pass') process.exitCode = 1;
};

try {
  if (command === 'inspect-existing') {
    const input = valueOf('--input');
    const spec = extractDeckSpec(await readFile(input, 'utf8'));
    finish({
      status: 'pass', mode: 'restyle-existing', input,
      invariants: {
        slideIdsAndOrder: spec.slides.map(({ id }) => id),
        contentHashes: Object.fromEntries(spec.slides.map((slide) => [slide.id, contentHash(slide)])),
      },
      outline: spec.slides.map(({ id, content }) => ({ id, title: content.title, subtitle: content.subtitle, keyPoints: content.keyPoints })),
      nextGate: {
        status: 'blocked',
        question: '如果觀眾只記得一句話，哪一句最值得保留，而且最容易被挑戰？',
        then: ['human-outline-approval', 'four-cover-preview', 'human-style-selection'],
      },
    });
  } else if (command === 'render-restyle') {
    const sourceHtml = await readFile(valueOf('--source'), 'utf8');
    const candidateSpec = await readJson('--candidate-spec');
    const gate = await readJson('--gate');
    const result = renderExistingDeckWithGate({ sourceHtml, candidateSpec, gate });
    if (result.status === 'pass') await writeFile(valueOf('--output'), result.html);
    finish({ ...result, ...(result.status === 'pass' ? { html: undefined, outputWritten: true } : { outputWritten: false }) });
  } else if (command === 'render-new') {
    const deckSpec = await readJson('--deck-spec');
    const outline = await readJson('--outline');
    const styleSelection = await readJson('--style-selection');
    const grill = await readJson('--grill');
    const result = renderNewDeckWithGate({ deckSpec, outline, styleSelection, grill });
    if (result.status === 'pass') await writeFile(valueOf('--output'), result.html);
    finish({ ...result, ...(result.status === 'pass' ? { html: undefined, outputWritten: true } : { outputWritten: false }) });
  } else {
    throw new Error('用法：workflow-cli.mjs inspect-existing | render-restyle | render-new');
  }
} catch (error) {
  console.error(`PPTSKILL workflow：${error.message}`);
  process.exitCode = 1;
}
