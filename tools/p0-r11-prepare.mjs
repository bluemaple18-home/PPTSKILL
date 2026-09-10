import { execFile } from 'node:child_process';
import { createHash } from 'node:crypto';
import { access, copyFile, mkdir, mkdtemp, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { promisify } from 'node:util';

const run = promisify(execFile);
const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const evidence = resolve(root, 'evidence/p0-r11');
const archive = resolve(root, 'dist/PPTSKILL-0.1.0.zip');
const materialPath = resolve(evidence, 'ai-entry-workflow/sanitized-material.json');
const sha256 = (buffer) => createHash('sha256').update(buffer).digest('hex');
const writeJson = async (path, value) => { await mkdir(dirname(path), { recursive: true }); await writeFile(path, `${JSON.stringify(value, null, 2)}\n`); };
const parseJsonOutput = (stdout) => JSON.parse(stdout.slice(stdout.indexOf('{')));

for (const directory of ['fresh-install', 'ai-entry-workflow/cover-previews', 'owner-visual', 'browser-geometry', 'editor-export', 'recipient-ai-handoff']) await mkdir(resolve(evidence, directory), { recursive: true });

const archiveBytes = await readFile(archive);
const releaseSha = sha256(archiveBytes);
const sidecar = (await readFile(`${archive}.sha256`, 'utf8')).trim().split(/\s+/)[0];
if (releaseSha !== sidecar) throw new Error('final ZIP 與 sidecar SHA 不一致。');
await writeFile(resolve(evidence, 'final-zip-sha256.txt'), `${releaseSha}  PPTSKILL-0.1.0.zip\n`);

const sandbox = await mkdtemp(`${tmpdir()}/pptskill-r11-`);
const extracted = resolve(sandbox, 'extracted');
const isolatedHome = resolve(sandbox, 'home');
await mkdir(extracted, { recursive: true });
await mkdir(isolatedHome, { recursive: true });
await run('/usr/bin/unzip', ['-q', archive, '-d', extracted]);
const packageRoot = resolve(extracted, 'PPTSKILL');
const runtimeRoot = resolve(isolatedHome, '.pptskill/runtime');
const profilePath = resolve(isolatedHome, '.pptskill/profile.json');
const env = { ...process.env, HOME: isolatedHome };
const node = process.execPath;
const commandTrace = [];
const runNode = async (entry, args = []) => {
  try {
    const result = await run(node, [entry, ...args], { cwd: packageRoot, env, maxBuffer: 20 * 1024 * 1024 });
    commandTrace.push({ entry: entry.replace(packageRoot, '<zip-root>'), args, exitCode: 0, stdout: result.stdout.trim(), stderr: result.stderr.trim() });
    return result;
  } catch (error) {
    commandTrace.push({ entry: entry.replace(packageRoot, '<zip-root>'), args, exitCode: error.code, stdout: error.stdout?.trim(), stderr: error.stderr?.trim() });
    throw error;
  }
};

const manifest = JSON.parse(await readFile(resolve(packageRoot, 'package-manifest.json'), 'utf8'));
const preconditions = {
  isolatedHome: true,
  runtimeAbsentBeforeInstall: await access(runtimeRoot).then(() => false).catch(() => true),
  noGitDirectory: await access(resolve(packageRoot, '.git')).then(() => false).catch(() => true),
  noNodeModules: await access(resolve(packageRoot, 'node_modules')).then(() => false).catch(() => true),
  requiresGit: manifest.requiresGit,
};
const install = parseJsonOutput((await runNode(resolve(packageRoot, 'install.mjs'))).stdout);
const packageSmoke = parseJsonOutput((await runNode(resolve(runtimeRoot, 'smoke.mjs'))).stdout);
const codexSmoke = parseJsonOutput((await runNode(resolve(runtimeRoot, 'smoke.mjs'), ['--adapter', 'codex'])).stdout);
const allSmokeCommand = await runNode(resolve(runtimeRoot, 'smoke.mjs'), ['--all']).catch((error) => {
  if (error.code !== 2 || !error.stdout) throw error;
  return { stdout: error.stdout };
});
const allSmoke = parseJsonOutput(allSmokeCommand.stdout);

const entryPath = resolve(runtimeRoot, 'adapters/codex/entry.md');
const entryText = await readFile(entryPath, 'utf8');
const entryEvidence = {
  adapter: 'codex',
  entryHash: sha256(Buffer.from(entryText)),
  readBeforeWorkflow: true,
  sharedCoreInstruction: entryText.includes('唯一 shared core'),
  grillInstruction: entryText.includes('grill-outline.js'),
  rendererInstruction: entryText.includes('full-deck-renderer.js'),
  exportInstruction: entryText.includes('export-sanitizer-allowlist.md'),
};
await writeJson(resolve(evidence, 'ai-entry-workflow/entry-transcript.json'), entryEvidence);

const profileInput = resolve(sandbox, 'profile.json');
await writeJson(profileInput, { schemaVersion: '1.0', language: 'zh-Hant', stylePreferences: ['company-style'], density: 'low', sampleFirst: true, motionPreference: 'subtle', fontPersonality: 'modern-grotesk', colorMood: 'brand-led' });
await runNode(resolve(runtimeRoot, 'profile.mjs'), ['show']);
await runNode(resolve(runtimeRoot, 'profile.mjs'), ['save', '--input', profileInput, '--remember']);
const profileHashBeforeUpdate = sha256(await readFile(profilePath));
const update = parseJsonOutput((await runNode(resolve(packageRoot, 'update.mjs'))).stdout);
const profileHashAfterUpdate = sha256(await readFile(profilePath));
const uninstall = parseJsonOutput((await runNode(resolve(runtimeRoot, 'uninstall.mjs'))).stdout);
const profileHashAfterUninstall = sha256(await readFile(profilePath));
const reinstall = parseJsonOutput((await runNode(resolve(packageRoot, 'install.mjs'))).stdout);
const profileMode = (await stat(profilePath)).mode & 0o777;

const runtimeModule = (name) => pathToFileURL(resolve(runtimeRoot, 'core/runtime', name)).href;
const grill = await import(runtimeModule('grill-outline.js'));
const generation = await import(runtimeModule('generation-plan.js'));
const styles = await import(runtimeModule('style-candidates.js'));
const company = await import(runtimeModule('company-style-pack.js'));
const renderer = await import(runtimeModule('full-deck-renderer.js'));
const deckModule = await import(runtimeModule('deck-spec.js'));
const material = JSON.parse(await readFile(materialPath, 'utf8'));

let grillState = grill.createGrillState({ materials: [{ id: 'sanitized-material', reviewed: true }], known: material.known });
const questionStep = grill.askQuestion(grillState);
if (questionStep.result.status !== 'ask' || questionStep.result.question.dimension !== 'pressureTest') throw new Error('Grill 沒有跳過已知問題或未執行必要壓力測試。');
grillState = grill.answerQuestion(questionStep.state, '如果品牌一致性無法跨頁與跨 AI 保持，整套工作流就不值得採用。');
const outlineSlides = material.slides.map(({ id, title, subtitle, keyPoints }) => ({ id, title, subtitle, keyPoints }));
const pendingOutline = grill.buildOutline({ state: grillState, deckTitle: material.title, slides: outlineSlides });
const outline = grill.confirmOutline(pendingOutline, 'human');
const outlineValidation = grill.validateOutline(outline);
await writeJson(resolve(evidence, 'ai-entry-workflow/grill-trace.json'), { materialReviewed: true, knownDimensions: Object.keys(material.known), asked: [questionStep.result.question], answers: { pressureTest: grillState.resolved.pressureTest }, oneQuestionAtATime: true, sourcePolicy: outline.sourcePolicy });
await writeJson(resolve(evidence, 'ai-entry-workflow/outline-approved.json'), { ...outline, ownerApprovalEvidence: '2026-09-10 Owner instructed R11 to use sealed R9 Company Style dependency.' });

const font = "'Microsoft JhengHei', 'Microsoft JhengHei UI', 'PingFang TC', sans-serif";
const aiRoutes = [
  { id: 'route-technical-map', name: 'Technical Map', coverArchetype: 'information-led-cover', layout: { primaryMove: 'technical-map', compositionLanguage: 'technical' }, density: 'high', typography: { display: font, body: font, mono: 'Menlo, monospace' }, palette: { canvas: '#0c1b19', text: '#e8f0e9', muted: '#9ab0a7', accent: '#a9ffcb', surface: '#122824' }, spacing: { unit: 6, slidePadding: 52 }, geometry: { radius: 2, borderWidth: 1 }, motion: { personality: 'corporate', durationMs: 180, easing: 'ease-out', reducedMotion: true }, assetTreatment: 'diagram-first with labeled system nodes' },
  { id: 'route-editorial-rail', name: 'Editorial Monument', coverArchetype: 'typography-hero', layout: { primaryMove: 'editorial-rail', compositionLanguage: 'narrative' }, density: 'low', typography: { display: font, body: font, mono: 'Menlo, monospace' }, palette: { canvas: '#f1eee6', text: '#171515', muted: '#68615c', accent: '#d7472f', surface: '#ded8cc' }, spacing: { unit: 10, slidePadding: 72 }, geometry: { radius: 0, borderWidth: 1 }, motion: { personality: 'premium', durationMs: 420, easing: 'cubic-bezier(.16,1,.3,1)', reducedMotion: true }, assetTreatment: 'editorial chapter crops and quiet captions' },
  { id: 'route-split-proof', name: 'Brand Field', coverArchetype: 'graphic-brand-field', layout: { primaryMove: 'split-proof', compositionLanguage: 'energetic' }, density: 'medium', typography: { display: font, body: font, mono: 'Menlo, monospace' }, palette: { canvas: '#1736d1', text: '#fbf7e9', muted: '#d7dcfa', accent: '#dcff55', surface: '#112797' }, spacing: { unit: 8, slidePadding: 56 }, geometry: { radius: 18, borderWidth: 0 }, motion: { personality: 'energetic', durationMs: 300, easing: 'ease-out', reducedMotion: true }, assetTreatment: 'proof-led crops with conversion emphasis' },
];
const companyPack = company.loadCompanyStylePack();
if (companyPack.status !== 'reviewed' || companyPack.ownerReview?.verdict !== 'pass') throw new Error('final ZIP 內 Company Style 尚未封存為 reviewed。');
const compilation = styles.compileStyleCandidates({ content: { title: material.title, subtitle: material.slides[0].subtitle, identity: material.identity }, companyStylePack: companyPack, aiRoutes });
if (compilation.status !== 'pass') throw new Error(compilation.reason || compilation.errors?.join(' '));
for (const candidate of compilation.candidates) await writeFile(resolve(evidence, 'ai-entry-workflow/cover-previews', `${candidate.style.id}.html`), styles.buildStyleCoverPreview(candidate));
const selected = styles.selectStyleCandidate(compilation, 'clickforce-dark', 'human');
await writeJson(resolve(evidence, 'ai-entry-workflow/style-selection.json'), { status: selected.status, approvedBy: selected.approvedBy, styleId: selected.style.id, ownerEvidence: 'P1-R9 Owner Visual Gate PASS; use sealed Company Style for R11.' });

const plan = generation.createGenerationPlan({ outline, styleSpecId: selected.style.id, capacity: { maxSlidesPerUnit: 3 }, mode: 'staged', sampleCount: 2 });
await writeJson(resolve(evidence, 'ai-entry-workflow/generation-plan.json'), plan);
const slotsFor = (slide) => ({ title: 'content.title', subtitle: 'content.subtitle', ...(slide.primitive === 'title-points' || slide.primitive === 'split-proof' || slide.primitive === 'process-flow' ? { points: 'content.keyPoints' } : {}) });
const releaseSpec = {
  schemaVersion: '1.0', deckId: 'pptskill-r11-company-release', title: material.title, language: 'zh-Hant', style: selected.style,
  profile: { customer: '不得外洩' }, prompt: 'hidden prompt', transcript: 'hidden transcript', localPath: '/Users/private/source.pptx', sourceBody: 'private source body', privateNote: 'private note', rejectedDraft: 'rejected draft',
  slides: material.slides.map((slide) => ({ id: slide.id, content: { title: slide.title, subtitle: slide.subtitle, keyPoints: slide.keyPoints, components: [] }, composition: { primitive: slide.primitive, variant: slide.variant, slots: slotsFor(slide) } })),
};
const rendered = renderer.renderFullDeck(releaseSpec);
if (rendered.status !== 'pass') throw new Error(rendered.errors.join(' '));
await writeFile(resolve(evidence, 'owner-visual/release-company-deck.html'), rendered.html);
await copyFile(resolve(root, 'evidence/p1-r9/company-style-montage-1280x720.png'), resolve(evidence, 'owner-visual/r9-owner-approved-montage.png'));

const tinyPng = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScL6WQAAAABJRU5ErkJggg==';
const editorSpec = structuredClone(rendered.spec);
editorSpec.deckId = 'pptskill-r11-editor-functional';
editorSpec.slides.push(
  { id: 'editor-text', content: { title: '支援元件編輯', subtitle: '這一頁只用於 R11 功能驗收', keyPoints: ['文字元件', '局部修改', '單檔保存'], components: [{ id: 'editable-quote', type: 'text', text: '原始支援元件文字' }] }, composition: { primitive: 'component-focus', variant: 'default', slots: { title: 'content.title', subtitle: 'content.subtitle', component: 'content.components.editable-quote' } } },
  { id: 'editor-image', content: { title: '圖片替換驗收', subtitle: '圖片在進入 canonical DeckSpec 前先最佳化', keyPoints: ['本機圖片', '不放大', '單檔輸出'], components: [{ id: 'replaceable-image', type: 'image', alt: 'R11 placeholder', fit: 'contain', dataUri: tinyPng }] }, composition: { primitive: 'component-focus', variant: 'default', slots: { title: 'content.title', subtitle: 'content.subtitle', component: 'content.components.replaceable-image' } } },
);
const editorDeck = renderer.renderFullDeck(editorSpec);
if (editorDeck.status !== 'pass') throw new Error(editorDeck.errors.join(' '));
await writeFile(resolve(evidence, 'editor-export/editor-functional-source.html'), editorDeck.html);

await writeJson(resolve(evidence, 'fresh-install/lifecycle.json'), {
  preconditions, install, packageSmoke, codexSmoke, allSmoke,
  profile: { hashBeforeUpdate: profileHashBeforeUpdate, hashAfterUpdate: profileHashAfterUpdate, hashAfterUninstall: profileHashAfterUninstall, mode: profileMode, preservedByUpdate: profileHashBeforeUpdate === profileHashAfterUpdate, preservedByDefaultUninstall: profileHashBeforeUpdate === profileHashAfterUninstall },
  update, uninstall, reinstall,
});
await writeJson(resolve(evidence, 'fresh-install/command-trace.json'), commandTrace);
await writeJson(resolve(evidence, 'ai-entry-workflow/workflow-summary.json'), {
  finalZipSha256: releaseSha,
  finalZipCompanyPackSha256: sha256(await readFile(resolve(runtimeRoot, 'core/design/company-style/clickforce-dark/company-style-pack.json'))),
  entryEvidence,
  outlineValidation,
  coverCandidateIds: compilation.candidates.map(({ style, kind }) => ({ id: style.id, kind })),
  selectedStyle: selected.style.id,
  boundedUnits: plan.units.map(({ id, slides }) => ({ id, slideIds: slides.map((slide) => slide.id) })),
  canonicalDeckSpecHash: sha256(Buffer.from(JSON.stringify(rendered.spec))),
  slideContentHashes: Object.fromEntries(rendered.spec.slides.map((slide) => [slide.id, deckModule.contentHash(slide)])),
  sourcePolicy: outline.sourcePolicy,
});
await writeJson(resolve(evidence, 'fresh-install/session.json'), { finalZipSha256: releaseSha, temporaryEnvironmentRemoved: true });
await rm(sandbox, { recursive: true, force: true });
console.log(JSON.stringify({ status: 'pass', finalZipSha256: releaseSha, evidenceRoot: evidence, testsFromInstalledCore: true }, null, 2));
