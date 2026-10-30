import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildStyleCoverPreview, compileStyleCandidates } from '../runtime/style-candidates.js';
import { loadCompanyStylePack } from '../runtime/company-style-pack.js';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const fixture = JSON.parse(await readFile(resolve(root, 'fixtures/style-candidates.json'), 'utf8'));
const compilation = compileStyleCandidates({ ...fixture, companyStylePack: loadCompanyStylePack() });
if (compilation.status !== 'pass') throw new Error(compilation.reason || compilation.errors?.join(' '));
const output = resolve(root, 'fixtures/style-candidate-previews');
await mkdir(output, { recursive: true });
for (const candidate of compilation.candidates) {
  await writeFile(resolve(output, `${candidate.style.id}.html`), buildStyleCoverPreview(candidate));
}
console.log(`已產生 ${compilation.candidates.length} 張同內容 Style 候選。`);
