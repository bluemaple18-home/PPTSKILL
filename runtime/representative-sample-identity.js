import { createHash } from 'node:crypto';
import { sanitizeDeckSpec } from './deck-spec.js';

const CONTRACT_PATTERN = /^[a-z0-9][a-z0-9._-]{0,63}$/u;

const stableValue = (value) => {
  if (Array.isArray(value)) return value.map(stableValue);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.keys(value).sort().map((key) => [key, stableValue(value[key])]));
  }
  return value;
};

export const stableJson = (value) => JSON.stringify(stableValue(value));
export const fingerprintValue = (value) => createHash('sha256').update(stableJson(value)).digest('hex');

export function createRepresentativeSampleIdentity({ sample, deckSpec, contractVersion }) {
  if (!CONTRACT_PATTERN.test(contractVersion)) throw new Error('contractVersion 必須是 bounded version ID。');
  if (!Array.isArray(sample?.entries) || sample.entries.length < 1) throw new Error('Representative sample entries 不可為空。');

  const sanitized = sanitizeDeckSpec(deckSpec);
  const ids = sanitized.slides.map(({ id }) => id);
  if (new Set(ids).size !== ids.length) throw new Error('validation DeckSpec slide IDs 必須唯一。');
  const slideById = new Map(sanitized.slides.map((slide) => [slide.id, slide]));
  const sampleIdentity = sample.entries.map(({ slideId, role }) => {
    const slide = slideById.get(slideId);
    if (!slide) throw new Error(`validation DeckSpec 缺少 representative sample slide：${slideId}。`);
    return {
      slideId,
      role,
      contentFingerprint: fingerprintValue(slide.content),
      compositionFingerprint: fingerprintValue(slide.composition),
    };
  });
  const identity = {
    version: 1,
    deckId: sanitized.deckId,
    contractVersion,
    styleFingerprint: fingerprintValue(sanitized.style),
    sample: sampleIdentity,
  };
  return { ...identity, identityFingerprint: fingerprintValue(identity) };
}
