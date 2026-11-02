import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const defaultRepoRoot = resolve(fileURLToPath(new URL('..', import.meta.url)));
const syntheticUsers = new Set(['private', 'example', 'test', 'runner', 'user', 'shared']);

const privateBrandAssetIdentityRecords = [
  'b77bd5dad96855550f65c2be39fdfe1d7abbc7ca2f694f036ebe34a4c156fe32',
  'da4cd43ca34d3e8372c507cbd3c84f356ad26fc9cb57614b3b97c702fa70f6c0',
  '5bb02e579905935d9feaf6eb78a6f03905add13e33b0c99d88c175f1edea2284',
  'f11f848223bc9a07a510e0bb10373565828371fb3129bd8cb7c1ddf6b529d6eb',
  'cc551f7290511c17e36151dd3de8bf1e5efc6cc1e92a42a1184b47b0f6fe562b',
  '09b9fd6e8c7646bfd3b7b4ef60a9396b1385514424c671a2df3413be494f66d6',
  '3b05b1aefaa2df433bb357c4535c51ed7a5e1ce2ff3ee6d7b8d39e309f1849af',
  'f2ac48a5a34579301068bd6f238881d274c439583d254e21407fbb2d70181aa3',
  '809453de3e50cae8f461ed44841737fee32afcc5d3953c84371007f106d705f0',
  'fc93f9c2e42a5e89b5291eefa32e1324ebf83f19deb7bbadbe81a0d0cc24ec4b',
  'c74df52a96d16d2b0edcd9064de0fcd7d422f75c2f8aa713e444e477220302d5',
  '892dd9398cf6d8245950f1f6a204e73b26dcb18f155f4692f34295c8baff0b2e',
  'cb5361128d3ee1d099476580ba69c9004528e72318e50ea7f0916c1424932f53',
  '85e807ea6898915b8e46fb986cce2bd5bcaf075c9426bf7aa870d9eaf0d2d4f3',
  '83f23b7bf72505dcf8592b320ae943496e91a9f71f2d2e29ecb990f8d5c60513',
  '694520e53b2c64009c5faecc1b5f7e084d2b2c78da883e5c8ecd28c0dbe2a74e',
].map((sha256) => ({
  sourceClass: 'private-brand',
  sha256,
  disposition: 'deny-publication',
  reason: 'private-brand-redistribution-boundary',
  provenance: 'fc80181-sanitation-review',
}));

// 33 筆已移除 Golden raw reference removal evidence；其中 13/14 是相同 bytes，故為 32 個 unique identities。
// SHA-256 由 e917213 的既有 Git blob bytes 重算；只保存 identity/provenance，不保存 raw image。
const goldenRawReferenceIdentityRecords = [
  ['bf6b3f592ab4951102f865fa2d7b633d7a0ad4ad54bd708737e370d9ca66ae31', 'accepted/39'],
  ['b81b95741c856405e3c1645a388d00bec63abc04a115f97fda80b75466155ff9', 'accepted/40'],
  ['7a03c6eb5f1b74067239d30a089b3f007111152280ab3f9cafb56fa893b74dbc', 'accepted/41'],
  ['f960c7331a0550fcc0efe1ced55ee004c04d2fc37de6b9ad41d724bd7867e210', 'accepted/42'],
  ['c786c33205bd00c9f6b942a84ab3e113572e5ae8a0598fdba4ff7808c984955c', 'accepted/44'],
  ['817f13662d7501f5906aa259ed342695f474df69c8c111ef4b59955a26042c5c', 'accepted/45'],
  ['ae23dd776ab760ead466d8df9fcc589d6bb5b9fa69b369dfd54ead3c8b8383b3', 'accepted/46'],
  ['b9f4bcb73a992499a883d857381893371188f60a6cfc9c19f1f1411d28dc5f30', 'accepted/47'],
  ['22a2b498871aaeed21eb4be4d9760dd530cbc7a0ff28c97b42562a5039db9fe9', 'accepted/48'],
  ['6c2f345414c832e85315352e08d5de7f58ce283f28ec53ddb5391617340037a5', 'accepted/51'],
  ['70d4720b155fb85ff060854594d847cd92625587fa3940c67117831ba5516d3d', 'accepted/56'],
  ['9c1db8170872d2e775479293b48f1bd4060bd8f9514fae409e630ad1163e8e31', 'accepted/57'],
  ['0c3fff50d202a63dbfd68d9d3ba749ec25af937a38e27e31aadc489648bc777c', 'accepted/58'],
  ['04a3f0b2c3582330a533780fd530e380aa9f83f928404b6dd4beeb1cb02a9572', 'accepted/59'],
  ['f33e7c89e7edd19836365344fa4be11679a398310c8fd8575709b8e1526c2fbb', 'accepted/60'],
  ['9a6e47181d0181d47153f7826aea499f6ed5f5f0cfbdb5ad5fb8a96a4cd31ba0', 'accepted/61'],
  ['67bd44856efa3817009c952902189e09720d5aa8ca6872b0223fb7451e79f81e', 'accepted/62'],
  ['a60bbb704b6744deefbfca26331747c147272e948009547406d21796f4a75311', 'rejected/38A'],
  ['d6fddff416276cb35c86c513a1421976ec802e3442cf14c0ecb13a8d875cce8f', 'unresolved/01'],
  ['6cbf527bd2061feadbfe6687712ab4b98584b3478d7516d892d8fb13acf09560', 'unresolved/02'],
  ['b5682e9b8fa63f451de6d3e664caaeae57a041e12a823b11545b5f515d830661', 'unresolved/03'],
  ['7cbfb008cbc6d8f29f5a43da7ef8cd943acf590c1ed31170cc5d1af25403eba5', 'unresolved/04'],
  ['8f9492531055640181c555fbee66b47f207f305cb1006fb4cf5ee53ea8434027', 'unresolved/05'],
  ['5ade37e6109df59ac0893b49e496c2c872a48644d138f8b68776f0669fb77785', 'unresolved/06'],
  ['9eb854f0a0d564166f25345663d02d7e96a3b18f6b8d193b87726b74ecfaebcf', 'unresolved/07'],
  ['2a834eb381c8b581d2391fe53432f4518878e998c7b180cb7da10a6f5b8c8efb', 'unresolved/08'],
  ['f381992bd8437621d58c3af1d9072237eaeee502bfb0c2a6bfe2438aa86f63e8', 'unresolved/09'],
  ['bd3e177d34dd59e51bb89b02516b2dd2cc8ec45f067e07757a34548dd7761f01', 'unresolved/10'],
  ['cec927eac74a029ccc781c40898aa2a3f3342ca7d123908072247fbf977058ff', 'unresolved/11'],
  ['320ade4a3791f038c14977bb5907761ab4a65d39603cce64e34078144a6685da', 'unresolved/12'],
  ['c789c93eb02b7249f9cd09782fc790c5f2579b2b6e05a3fc8d5d9706237f50e8', 'unresolved/13'],
  ['c789c93eb02b7249f9cd09782fc790c5f2579b2b6e05a3fc8d5d9706237f50e8', 'unresolved/14'],
  ['292412bf1a73504edcacdd00b5742ef6ac715864c6b9337adb5838980527066e', 'unresolved/15'],
].map(([sha256, provenance]) => ({
  sourceClass: 'golden-reference',
  sha256,
  disposition: 'deny-publication',
  reason: 'no-public-redistribution-evidence',
  provenance: `e917213:design/materials/golden-covers/${provenance}`,
}));

export function buildForbiddenAssetIdentityMap(records) {
  const identities = new Map();
  for (const record of records) {
    if (!/^[a-f0-9]{64}$/.test(record.sha256)) throw new Error(`Invalid forbidden asset SHA-256: ${record.sha256}`);
    const existing = identities.get(record.sha256);
    if (existing) existing.records.push({ ...record });
    else identities.set(record.sha256, { sha256: record.sha256, records: [{ ...record }] });
  }
  return identities;
}

const forbiddenPublicAssetIdentities = buildForbiddenAssetIdentityMap([
  ...privateBrandAssetIdentityRecords,
  ...goldenRawReferenceIdentityRecords,
]);

export function getPublicationAssetIdentitySummary() {
  return {
    privateBrandRecords: privateBrandAssetIdentityRecords.length,
    goldenReferenceRecords: goldenRawReferenceIdentityRecords.length,
    goldenReferenceUniqueSha256: new Set(goldenRawReferenceIdentityRecords.map(({ sha256 }) => sha256)).size,
  };
}

const knownPublicCompanyStyleAssets = new Map([
  ['public-demo-dark', new Map([
    ['agenda-field.png', 'bf121d06fb55a2ef636548198b57aea28508abf255426617afb7d57743e92882'],
    ['chapter-field.png', '37d65d4502a3486d409893aa738bb0cb9cb3c7b1d1c4ef1a8418bd338a4ebf9b'],
    ['content-dark.png', '309ba57efc6f13a86fb714eeb11d6548cd26d60de3442354da717c66578023a9'],
    ['content-gradient.png', 'e25dfba7422e89c6fcc6530eb1539b8f3693007862cbb65752daeb37cbbaec07'],
    ['content-object.png', 'bf121d06fb55a2ef636548198b57aea28508abf255426617afb7d57743e92882'],
    ['cover-field.png', '37d65d4502a3486d409893aa738bb0cb9cb3c7b1d1c4ef1a8418bd338a4ebf9b'],
    ['logo-color.png', '4ff86cf72d5585154806889e26b4d6383ca6f87a30c16228cb0c05a8c6184dd3'],
    ['logo-white.png', 'cf9c695d0caacdab3aa9d38bc1ae90b2f8c36f45cfc2faa558122f4f632b92c9'],
  ])],
]);

const secretPatterns = [
  ['secret-openai', /\bsk-(?:proj-|svcacct-)?[A-Za-z0-9_-]{16,}\b/],
  ['secret-anthropic', /\bsk-ant-[A-Za-z0-9_-]{16,}\b/],
  ['secret-github', /\bgh[pousr]_[A-Za-z0-9]{20,}\b/],
  ['secret-aws', /\b(?:AKIA|ASIA)[A-Z0-9]{16}\b/],
  ['secret-google', /\bAIza[0-9A-Za-z_-]{30,}\b/],
  ['private-key', /-----BEGIN (?:RSA |EC |OPENSSH |DSA )?PRIVATE KEY-----/],
];

const internalTerms = [
  new RegExp(['AI', 'Core'].join('\\s+'), 'i'),
  new RegExp(['ai', 'core'].join('-'), 'i'),
  new RegExp(['resource', 'observer'].join('\\s+'), 'i'),
  new RegExp(['frontend', 'design', 'gate'].join('-'), 'i'),
  new RegExp(['sgds', 'frontend', 'materials'].join('-'), 'i'),
  new RegExp(['ppt', 'authoring'].join('-'), 'i'),
  new RegExp(['grill', 'me'].join('-'), 'i'),
];

const privateBrandTerm = new RegExp(['click', 'force'].join(''), 'i');
const macUserPath = /\/Users\/([^/\s"'`]+)\//g;
const linuxUserPath = /\/home\/([^/\s"'`]+)\//g;
const machineTempPath = /\/var\/folders\/[^\s"'`]+\/T\//;
const managedPrivateTemp = new RegExp(['/private/tmp/', 'aic', '-'].join(''), 'i');
const embeddedImageDataUri = /data:image\/[a-z0-9.+-]+;base64,([A-Za-z0-9+/=]{64,})/gi;
const requiredPublicFiles = ['LICENSE'];
const thirdPartyNoticeRequirements = [
  {
    component: 'NumberFlow', identity: 'number-flow@0.6.2', license: 'MIT',
    licenseFile: 'runtime/vendor/number-flow-LICENSE.md', licenseSha256: 'f8a3eac9fd2ae94f18a2bf0459e57d90da539f015a7ec4ad6186a5ca33a6aa9a',
    evidence: ['pnpm-lock.yaml', 'runtime/vendor/number-flow-vendor.json', 'runtime/vendor/number-flow-LICENSE.md'],
  },
  {
    component: 'esm-env', identity: 'esm-env@1.2.2', license: 'MIT',
    licenseFile: 'runtime/vendor/esm-env-LICENSE.md', licenseSha256: '40e64ccc8f0b2186a9a7f2e2b5c23c67328580d1abf59236f635ed6740589d9e',
    evidence: ['pnpm-lock.yaml', 'runtime/vendor/esm-env-LICENSE.md'],
  },
  {
    component: 'three.js', identity: 'three@0.134.0', license: 'MIT',
    licenseFile: 'runtime/vendor/three-LICENSE.md', licenseSha256: '7dddf7c5b8fd10ee654db8857d75d104b5557889aa5a91fc4ca545ea7c07062f',
    evidence: ['pnpm-lock.yaml', 'runtime/vendor/vanta-vendor.json', 'runtime/vendor/three-LICENSE.md'],
  },
  {
    component: 'Vanta.js', identity: 'vanta@0.5.24', license: 'MIT',
    licenseFile: 'runtime/vendor/vanta-LICENSE.md', licenseSha256: '65df69dccc2a06fcf307e81da62c0f64b4abc03fe64a23944427a69642edadcb',
    evidence: ['pnpm-lock.yaml', 'runtime/vendor/vanta-vendor.json', 'runtime/vendor/vanta-LICENSE.md'],
  },
];

const add = (findings, rule, path) => findings.push({ rule, path });
const sha256 = (bytes) => createHash('sha256').update(bytes).digest('hex');

const identityRule = (identity, embedded = false) => {
  const classes = new Set(identity.records.map(({ sourceClass }) => sourceClass));
  if (classes.has('golden-reference')) return embedded ? 'embedded-known-unlicensed-reference-asset' : 'known-unlicensed-reference-asset';
  if (classes.has('private-brand')) return embedded ? 'embedded-known-private-brand-asset' : 'known-private-brand-asset';
  return embedded ? 'embedded-forbidden-public-asset' : 'forbidden-public-asset';
};

const parseThirdPartyNoticeRows = (text) => text.split(/\r?\n/).flatMap((line) => {
  if (!line.startsWith('|')) return [];
  const cells = line.split('|').slice(1, -1).map((cell) => cell.trim());
  if (cells.length !== 5 || cells[0] === '元件' || cells.every((cell) => /^-+$/.test(cell))) return [];
  const identity = cells[1].match(/`([^`]+)`/)?.[1] ?? null;
  const license = cells[3].split(/[；;]/, 1)[0].trim();
  const evidence = new Set([...cells[4].matchAll(/`([^`]+)`/g)].map((match) => match[1]));
  return [{ component: cells[0], identity, license, evidence }];
});

export function validateThirdPartyNotices({ repoRoot = defaultRepoRoot } = {}) {
  const findings = [];
  const noticePath = 'THIRD_PARTY_NOTICES.md';
  let rows;
  try {
    rows = parseThirdPartyNoticeRows(readFileSync(resolve(repoRoot, noticePath), 'utf8'));
  } catch (error) {
    if (error?.code === 'ENOENT') return [{ rule: 'third-party-notice-file-missing', path: noticePath }];
    throw error;
  }

  for (const requirement of thirdPartyNoticeRequirements) {
    const row = rows.find(({ component }) => component === requirement.component);
    if (!row) {
      add(findings, 'third-party-notice-entry-missing', noticePath);
      continue;
    }
    if (row.identity !== requirement.identity) add(findings, 'third-party-notice-identity-mismatch', noticePath);
    if (row.license !== requirement.license) add(findings, 'third-party-notice-license-mismatch', noticePath);
    for (const evidencePath of requirement.evidence) {
      if (!row.evidence.has(evidencePath)) add(findings, 'third-party-notice-evidence-reference-missing', noticePath);
      try {
        readFileSync(resolve(repoRoot, evidencePath));
      } catch (error) {
        if (error?.code === 'ENOENT') add(findings, 'third-party-license-evidence-missing', evidencePath);
        else throw error;
      }
    }
    try {
      if (sha256(readFileSync(resolve(repoRoot, requirement.licenseFile))) !== requirement.licenseSha256) {
        add(findings, 'third-party-license-evidence-mismatch', requirement.licenseFile);
      }
    } catch (error) {
      if (error?.code !== 'ENOENT') throw error;
    }
  }
  return findings;
}

export function scanBytes(path, bytes, { forbiddenAssetIdentities = forbiddenPublicAssetIdentities } = {}) {
  const findings = [];
  const normalizedPath = path.replaceAll('\\', '/');
  const lowerPath = normalizedPath.toLowerCase();
  const digest = sha256(bytes);
  const directIdentity = forbiddenAssetIdentities.get(digest);

  if (directIdentity) add(findings, identityRule(directIdentity), normalizedPath);
  if (lowerPath.endsWith('/.ds_store') || lowerPath === '.ds_store') add(findings, 'local-metadata-file', normalizedPath);
  if (normalizedPath === 'CLAUDE.md' || /^HANDOFF-.*\.md$/.test(normalizedPath)) add(findings, 'local-control-file', normalizedPath);
  if (lowerPath.startsWith('.codegraph/')) add(findings, 'local-index-file', normalizedPath);
  if (lowerPath.startsWith('evidence/') && lowerPath.endsWith('.log')) add(findings, 'raw-log', normalizedPath);
  if (privateBrandTerm.test(normalizedPath)) add(findings, 'private-brand-identifier', normalizedPath);

  if (bytes.subarray(0, 8192).includes(0)) return findings;
  const text = bytes.toString('utf8');

  embeddedImageDataUri.lastIndex = 0;
  for (const match of text.matchAll(embeddedImageDataUri)) {
    try {
      const embeddedIdentity = forbiddenAssetIdentities.get(sha256(Buffer.from(match[1], 'base64')));
      if (embeddedIdentity) {
        add(findings, identityRule(embeddedIdentity, true), normalizedPath);
        break;
      }
    } catch {
      // 非法 data URI 由原有產品 parser / sanitizer 處理；publication guard 只做公開面判定。
    }
  }

  if (privateBrandTerm.test(text)) add(findings, 'private-brand-identifier', normalizedPath);
  if (internalTerms.some((pattern) => pattern.test(text))) add(findings, 'private-internal-tooling-detail', normalizedPath);
  if (machineTempPath.test(text)) add(findings, 'machine-temp-path', normalizedPath);
  if (managedPrivateTemp.test(text)) add(findings, 'private-managed-temp', normalizedPath);
  if (/"pid"\s*:\s*\d+/.test(text) && /"root"\s*:\s*"\/(?:private\/tmp|var\/folders)/.test(text)) add(findings, 'raw-session-metadata', normalizedPath);

  for (const [rule, pattern] of secretPatterns) if (pattern.test(text)) add(findings, rule, normalizedPath);

  for (const pattern of [macUserPath, linuxUserPath]) {
    pattern.lastIndex = 0;
    for (const match of text.matchAll(pattern)) {
      if (!syntheticUsers.has(match[1].toLowerCase())) {
        add(findings, 'real-user-home-path', normalizedPath);
        break;
      }
    }
  }

  return findings;
}

export function scanRepository({ repoRoot = defaultRepoRoot } = {}) {
  const tracked = execFileSync('git', ['ls-files', '-z'], { cwd: repoRoot })
    .toString('utf8')
    .split('\0')
    .filter(Boolean);
  const findings = [];
  for (const path of requiredPublicFiles) {
    if (!tracked.includes(path)) add(findings, 'required-public-legal-file-missing', path);
  }
  findings.push(...validateThirdPartyNotices({ repoRoot }));
  for (const path of tracked) {
    const absolute = resolve(repoRoot, path);
    try {
      findings.push(...scanBytes(path, readFileSync(absolute)));
    } catch (error) {
      if (error?.code !== 'ENOENT') throw error;
    }
  }

  const companyStyleDirs = new Set(tracked.flatMap((path) => {
    const match = /^design\/company-style\/([^/]+)\/assets\//.exec(path);
    return match ? [match[1]] : [];
  }));
  for (const directory of companyStyleDirs) {
    const manifestPath = `design/company-style/${directory}/company-style-pack.json`;
    const expectedAssets = knownPublicCompanyStyleAssets.get(directory);
    if (!expectedAssets) {
      add(findings, 'company-style-not-public-cleared', manifestPath);
      continue;
    }
    try {
      const manifest = JSON.parse(readFileSync(resolve(repoRoot, manifestPath), 'utf8'));
      if (manifest?.publicFixture?.redistribution !== 'public-repo-safe') {
        add(findings, 'company-style-not-public-cleared', manifestPath);
      }
    } catch {
      add(findings, 'company-style-not-public-cleared', manifestPath);
    }

    const actualAssets = tracked
      .filter((path) => path.startsWith(`design/company-style/${directory}/assets/`))
      .map((path) => path.split('/').at(-1));
    for (const name of actualAssets) {
      const expected = expectedAssets.get(name);
      const assetPath = `design/company-style/${directory}/assets/${name}`;
      if (!expected || sha256(readFileSync(resolve(repoRoot, assetPath))) !== expected) {
        add(findings, 'company-style-asset-not-public-cleared', assetPath);
      }
    }
    for (const name of expectedAssets.keys()) {
      if (!actualAssets.includes(name)) add(findings, 'company-style-public-fixture-incomplete', `design/company-style/${directory}/assets/${name}`);
    }
  }

  return { tracked: tracked.length, findings };
}

export function formatFindings(findings) {
  return findings.map(({ rule, path }) => `${rule}\t${path}`).join('\n');
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const result = scanRepository();
  if (result.findings.length) {
    console.error(`PUBLICATION_SAFETY_FAIL findings=${result.findings.length}`);
    console.error(formatFindings(result.findings));
    process.exitCode = 1;
  } else {
    console.log(`PUBLICATION_SAFETY_PASS tracked=${result.tracked}`);
  }
}
