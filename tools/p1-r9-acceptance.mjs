import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { loadCompanyStylePack } from '../runtime/company-style-pack.js';
import { extractDeckSpec } from '../runtime/deck-spec.js';
import { renderFullDeck } from '../runtime/full-deck-renderer.js';
import { inspectPortableHtml } from '../runtime/portable-size-guard.js';
import { buildStyleCoverPreview, compileStyleCandidates } from '../runtime/style-candidates.js';

const output = resolve(process.argv[2] || 'evidence/p1-r9/company-style-acceptance.json');
const companyDeck = JSON.parse(await readFile(resolve('fixtures/company-style-deck-spec.json'), 'utf8'));
const styleFixture = JSON.parse(await readFile(resolve('fixtures/style-candidates.json'), 'utf8'));
const geometry = JSON.parse(await readFile(resolve('evidence/p1-r9/company-style-geometry.json'), 'utf8'));
const motionGeometry = JSON.parse(await readFile(resolve('evidence/p1-r9/company-style-motion-geometry.json'), 'utf8'));
const coverGeometry = JSON.parse(await readFile(resolve('evidence/p1-r9/company-cover-geometry.json'), 'utf8'));
const pack = loadCompanyStylePack();
const candidates = compileStyleCandidates({ ...styleFixture, companyStylePack: pack });
const companyCandidate = candidates.candidates?.find(({ kind }) => kind === 'company');
const coverHtml = companyCandidate ? buildStyleCoverPreview(companyCandidate) : '';
const rendered = renderFullDeck(companyDeck);
const size = rendered.status === 'pass' ? inspectPortableHtml(rendered.html, rendered.spec) : null;
const reopened = rendered.status === 'pass' ? extractDeckSpec(rendered.html) : null;
const checks = {
  packValidated: pack.id === pack.style.id && Object.keys(pack.assets).length === 8,
  sourceBoundary: !/Downloads|暗色簡報\.pptx/.test(JSON.stringify(pack)),
  noInventedChartOrTableLanguage: pack.sourceCoverage.chartLanguage === 'source_not_present' && pack.sourceCoverage.tableLanguage === 'source_not_present',
  fourCoverContract: candidates.status === 'pass' && candidates.candidates.length === 4 && candidates.candidates[0].kind === 'company',
  companyCoverPortable: /company-cover-field/.test(coverHtml) && !/https?:\/\//.test(coverHtml),
  sharedRenderer: rendered.status === 'pass' && /data-visual-world="company-dark"/.test(rendered.html),
  deckSpecReopen: reopened?.style.id === 'clickforce-dark' && reopened?.slides.length === 7,
  editorAndSizeGuard: /data-pptskill-editor/.test(rendered.html) && /data-pptskill-size-guard/.test(rendered.html),
  portableSizePass: size?.status === 'pass',
  geometryBothViewports: geometry.status === 'pass' && geometry.runs?.length === 2 && geometry.runs.every(({ issues }) => issues.length === 0),
  motionRestingGeometry: motionGeometry.status === 'pass' && motionGeometry.runs.every(({ motionTrace }) => motionTrace.layoutStable && motionTrace.restingVisible),
  companyCoverGeometry: coverGeometry.status === 'pass' && coverGeometry.runs.every(({ issues }) => issues.length === 0),
};
const receipt = {
  schemaVersion: '1.0',
  status: Object.values(checks).every(Boolean) ? 'pass' : 'fail',
  checks,
  source: { sha256: pack.sourceFingerprint.sha256, slideCount: pack.sourceFingerprint.slideCount, committedRawPptx: false },
  companyStyle: { id: pack.id, status: pack.status, chartLanguage: pack.sourceCoverage.chartLanguage, tableLanguage: pack.sourceCoverage.tableLanguage },
  portableSize: size,
  geometry: { reduced: geometry.status, normal: motionGeometry.status, companyCover: coverGeometry.status, viewports: geometry.runs.map(({ viewport }) => viewport) },
  ownerVisualGate: 'pending',
};
await mkdir(dirname(output), { recursive: true });
await writeFile(output, `${JSON.stringify(receipt, null, 2)}\n`);
console.log(JSON.stringify(receipt, null, 2));
if (receipt.status !== 'pass') process.exitCode = 1;
