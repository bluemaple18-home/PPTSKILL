import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import {
  compileVisualRouteCandidate,
  getGoldenDesignGrammar,
  resolveRoleTreatments,
  validateGoldenDesignGrammar,
} from '../runtime/design-grammar.js';

const seedArchetypes = [
  'typography-hero',
  'full-bleed-editorial',
  'architectural-negative-space',
  'image-type-asymmetry',
  'graphic-brand-field',
  'object-product-hero',
  'dark-premium-editorial',
  'information-led-cover',
  'cropped-type-image',
  'minimal-institutional',
];

const referenceManifest = JSON.parse(await readFile(
  new URL('../design/materials/golden-covers/golden-cover-references.json', import.meta.url),
  'utf8',
));

test('Golden Design Grammar v1 是自足且通過 deterministic validation 的本機快照', () => {
  const grammar = getGoldenDesignGrammar();
  assert.equal(grammar.version, '1.0');
  assert.equal(grammar.provenance.runtimeDependencies.length, 0);
  assert.deepEqual(validateGoldenDesignGrammar(grammar), { status: 'pass', errors: [] });
  assert.deepEqual(Object.keys(grammar.coverArchetypes).sort(), seedArchetypes.sort());
});

test('每個 seed archetype 可編譯成超過色票與字體的 portable route contract', () => {
  const required = [
    'coverArchetype', 'titlePlacement', 'visualAnchor', 'typePersonality', 'density',
    'graphicLanguage', 'surfaceLanguage', 'assetTreatment', 'effectLanguage',
    'motionPersonality', 'negativeSpaceStrategy', 'dominantRegionRatio',
    'anchorRelationship', 'visualFlow', 'overlapPolicy', 'edgeBehavior',
    'copyAnchorRelationship', 'focalPoint', 'silhouette',
  ];
  const structuralSignatures = new Set();

  for (const coverArchetype of seedArchetypes) {
    const route = compileVisualRouteCandidate({ coverArchetype });
    assert.equal(route.schemaVersion, '1.0');
    for (const field of required) assert.ok(route[field], `${coverArchetype} 缺少 ${field}`);
    assert.ok(route.antiPatterns.length > 0);
    assert.ok(route.evidenceRefs.length > 0);
    assert.doesNotMatch(JSON.stringify(route), /<html|<style|class=|position\s*:/i);
    structuralSignatures.add([
      route.titlePlacement,
      route.visualAnchor,
      route.negativeSpaceStrategy,
      route.dominantRegionRatio,
    ].join('|'));
  }

  assert.ok(structuralSignatures.size >= 6, 'archetype 不得退化成單一 shared grid skeleton');
});

test('每個 grammar evidence ref 都回指 Owner accepted 本機證據', () => {
  const acceptedKeys = new Set(referenceManifest.records
    .filter(({ decision }) => decision === 'accept')
    .map(({ id, filename }) => id || filename.match(/^unresolved-\d+/)?.[0]));
  const grammar = getGoldenDesignGrammar();
  for (const [archetype, route] of Object.entries(grammar.coverArchetypes)) {
    for (const evidenceRef of route.evidenceRefs) {
      assert.ok(acceptedKeys.has(evidenceRef), `${archetype} 引用非 accepted evidence：${evidenceRef}`);
    }
  }
});

test('effect treatment 只由 route 與 semantic role 決定並限制主效果數量', () => {
  const route = compileVisualRouteCandidate({ coverArchetype: 'full-bleed-editorial' });
  const first = resolveRoleTreatments(route, ['title', 'image', 'supportingCopy']);
  const second = resolveRoleTreatments(route, ['title', 'image', 'supportingCopy']);
  assert.deepEqual(first, second);
  assert.equal(first.status, 'pass');
  assert.ok(first.primaryFamilies.length <= 2);
  assert.deepEqual(Object.keys(first.byRole), ['title', 'image', 'supportingCopy']);
  assert.throws(() => resolveRoleTreatments(route, ['invented-role']), /未驗證的 semantic role/);
});

test('static 與 reduced-motion 是完整的一級路徑', () => {
  const route = compileVisualRouteCandidate({
    coverArchetype: 'minimal-institutional',
    motionPersonality: 'none',
  });
  const treatment = resolveRoleTreatments(route, ['title', 'visualAnchor']);
  assert.equal(route.reducedMotion, true);
  assert.equal(treatment.motion.personality, 'none');
  assert.equal(treatment.motion.entrance, 'none');
  assert.equal(treatment.motion.restingGeometry, 'validated-composition');
  assert.equal(treatment.motion.contentVisibleWithoutMotion, true);
});

test('未知 grammar token fail loud，不接受任意 LLM CSS 或 HTML', () => {
  assert.throws(() => compileVisualRouteCandidate({ coverArchetype: 'generic-ai-template' }), /未知 cover archetype/);
  assert.throws(
    () => compileVisualRouteCandidate({ coverArchetype: 'typography-hero', effectLanguage: '<style>boom</style>' }),
    /未知 effect language/,
  );
});
