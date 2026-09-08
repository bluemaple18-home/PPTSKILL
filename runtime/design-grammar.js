import { readFileSync } from 'node:fs';

const grammar = JSON.parse(readFileSync(
  new URL('../design/materials/golden-design-grammar.v1.json', import.meta.url),
  'utf8',
));

const semanticRoles = new Set(['title', 'visualAnchor', 'image', 'diagram', 'metric', 'process', 'supportingCopy']);
const clone = (value) => structuredClone(value);

const requiredRouteFields = [
  'titlePlacement', 'visualAnchor', 'imageTreatment', 'typePersonality',
  'negativeSpaceStrategy', 'dominantRegionRatio', 'graphicLanguage',
  'surfaceLanguage', 'density', 'effectLanguage', 'motionPersonality',
];

const catalogForField = {
  titlePlacement: 'titlePlacements',
  visualAnchor: 'visualAnchors',
  imageTreatment: 'imageTreatments',
  typePersonality: 'typePersonalities',
  negativeSpaceStrategy: 'negativeSpaceStrategies',
  graphicLanguage: 'graphicLanguages',
  surfaceLanguage: 'surfaceLanguages',
  density: 'densities',
  effectLanguage: 'effectLanguages',
  motionPersonality: 'motionPersonalities',
};

export function getGoldenDesignGrammar() {
  return clone(grammar);
}

export function validateGoldenDesignGrammar(candidate = grammar) {
  const errors = [];
  if (candidate.schemaVersion !== '1.0' || candidate.version !== '1.0') errors.push('grammar version 必須為 1.0。');
  if (!candidate.catalogs || !candidate.coverArchetypes) errors.push('grammar 缺少 catalogs 或 coverArchetypes。');

  for (const [archetype, route] of Object.entries(candidate.coverArchetypes || {})) {
    for (const field of requiredRouteFields) {
      const value = route[field];
      const catalog = candidate.catalogs?.[catalogForField[field]];
      if (!value) errors.push(`${archetype} 缺少 ${field}。`);
      else if (catalog && !catalog[value]) errors.push(`${archetype} 的 ${field} 引用未知 token：${value}。`);
    }
    if (!Array.isArray(route.evidenceRefs) || route.evidenceRefs.length === 0) errors.push(`${archetype} 缺少 evidenceRefs。`);
  }

  for (const [id, effect] of Object.entries(candidate.catalogs?.effectLanguages || {})) {
    if (!Array.isArray(effect.primaryFamilies) || effect.primaryFamilies.length > 2) errors.push(`${id} 的 primary effect family 超過兩種。`);
    for (const role of Object.keys(effect.roleTreatments || {})) if (!semanticRoles.has(role)) errors.push(`${id} 使用未知 semantic role：${role}。`);
  }

  return { status: errors.length ? 'fail' : 'pass', errors };
}

const requireCatalogToken = (field, value) => {
  const catalogName = catalogForField[field];
  if (!catalogName) {
    if (typeof value !== 'string' || value.length === 0) throw new Error(`${field} 必須是非空字串。`);
    return;
  }
  if (!grammar.catalogs[catalogName]?.[value]) {
    const label = field === 'effectLanguage' ? 'effect language' : field;
    throw new Error(`未知 ${label}：${value}`);
  }
};

export function compileVisualRouteCandidate({
  coverArchetype,
  typePersonality,
  density,
  effectLanguage,
  motionPersonality,
} = {}) {
  const base = grammar.coverArchetypes[coverArchetype];
  if (!base) throw new Error(`未知 cover archetype：${coverArchetype}`);
  const resolved = {
    ...base,
    ...(typePersonality ? { typePersonality } : {}),
    ...(density ? { density } : {}),
    ...(effectLanguage ? { effectLanguage } : {}),
    ...(motionPersonality ? { motionPersonality } : {}),
  };
  for (const field of requiredRouteFields) requireCatalogToken(field, resolved[field]);

  return clone({
    schemaVersion: grammar.schemaVersion,
    grammarVersion: grammar.version,
    coverArchetype,
    ...resolved,
    assetTreatment: resolved.imageTreatment,
    typeRolePairing: grammar.catalogs.typePersonalities[resolved.typePersonality].pairing,
    reducedMotion: true,
    antiPatterns: grammar.globalAntiPatterns,
  });
}

export function resolveRoleTreatments(route, roles) {
  if (!route || !grammar.coverArchetypes[route.coverArchetype]) throw new Error('route contract 無效。');
  if (!Array.isArray(roles) || roles.length === 0) throw new Error('至少需要一個 semantic role。');
  for (const role of roles) if (!semanticRoles.has(role)) throw new Error(`未驗證的 semantic role：${role}`);
  requireCatalogToken('effectLanguage', route.effectLanguage);
  requireCatalogToken('motionPersonality', route.motionPersonality);
  const effect = grammar.catalogs.effectLanguages[route.effectLanguage];
  const motion = grammar.catalogs.motionPersonalities[route.motionPersonality];
  return clone({
    status: 'pass',
    primaryFamilies: effect.primaryFamilies,
    byRole: Object.fromEntries(roles.map((role) => [role, effect.roleTreatments[role] || 'none'])),
    motion: { personality: route.motionPersonality, ...motion },
    reducedMotion: { contentVisible: true, restingGeometry: 'validated-composition' },
  });
}
