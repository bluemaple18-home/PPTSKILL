import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { buildMotionCss, buildMotionRuntimeScript, resolveMotionPreset } from '../runtime/motion-primitives.js';
import { renderFullDeck } from '../runtime/full-deck-renderer.js';
import { buildStyleCoverPreview, compileStyleCandidates } from '../runtime/style-candidates.js';
import { loadCompanyStylePack } from '../runtime/company-style-pack.js';

const fullDeck = JSON.parse(await readFile(new URL('../fixtures/full-deck-spec.json', import.meta.url), 'utf8'));
const styleFixtureSource = JSON.parse(await readFile(new URL('../fixtures/style-candidates.json', import.meta.url), 'utf8'));
const styleFixture = { ...styleFixtureSource, companyStylePack: loadCompanyStylePack() };

test('motion personality 只解析成 bounded portable preset', () => {
  const corporate = resolveMotionPreset({ personality: 'corporate', durationMs: 240, easing: 'ease-out' });
  assert.equal(corporate.personality, 'corporate');
  assert.equal(corporate.durationMs, 240);
  assert.ok(corporate.distance > 0 && corporate.distance <= 26);
  const clamped = resolveMotionPreset({ personality: 'energetic', durationMs: 5000, easing: 'ease-out' });
  assert.equal(clamped.durationMs, 1200);
});

test('motion CSS 只用 transform/opacity 類進場並提供 reduced-motion fallback', () => {
  const css = buildMotionCss({ personality: 'premium', durationMs: 420, easing: 'ease-out' });
  assert.match(css, /translateY/);
  assert.match(css, /scaleX\(0\)/);
  assert.match(css, /prefers-reduced-motion:reduce/);
  assert.doesNotMatch(css, /transition:[^}]*\b(width|height|margin|top|left)\b/);
});

test('motion runtime 使用 IntersectionObserver，不依賴外部 animation library', () => {
  const script = buildMotionRuntimeScript();
  assert.match(script, /IntersectionObserver/);
  assert.match(script, /motion-ready/);
  assert.doesNotMatch(script, /https?:\/\//);
  assert.doesNotMatch(script, /anime|gsap|framer/i);
});

test('full deck 內建共用 motion root / runtime，而不是每頁手寫動畫 code', () => {
  const result = renderFullDeck(fullDeck);
  assert.equal(result.status, 'pass');
  assert.match(result.html, /class="slide [^"]*motion-root/);
  assert.match(result.html, /IntersectionObserver/);
  assert.match(result.html, /prefers-reduced-motion:reduce/);
});

test('style cover preview 也沿用 StyleSpec motion personality', () => {
  const compilation = compileStyleCandidates(styleFixture);
  assert.equal(compilation.status, 'pass');
  for (const candidate of compilation.candidates) {
    const html = buildStyleCoverPreview(candidate);
    assert.match(html, /class="[^"]*motion-root/);
    assert.match(html, /IntersectionObserver/);
    assert.match(html, /--motion-duration:/);
  }
});
