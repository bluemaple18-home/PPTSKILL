import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import { buildDeckHtml, createDeckState } from '../runtime/deck.js';

const fixturePath = new URL('../fixtures/functional-test-sample.json', import.meta.url);
const deckPath = new URL('../fixtures/deck.html', import.meta.url);

test('三頁樣本可播放並管理投影片，不包含 Presenter Mode', async () => {
  const fixture = JSON.parse(await readFile(fixturePath, 'utf8'));
  const deck = createDeckState(fixture);

  assert.equal(deck.slides.length, 3);
  assert.equal(deck.current().id, 'sample-01');
  deck.next();
  deck.previous();
  assert.equal(deck.current().id, 'sample-01');

  deck.reorder(2, 0);
  assert.equal(deck.current().id, 'sample-03');
  deck.duplicate(0);
  assert.equal(deck.slides.length, 4);
  assert.notEqual(deck.slides[1].id, deck.slides[0].id);
  deck.delete(1);
  assert.equal(deck.slides.length, 3);

  const html = buildDeckHtml(fixture);
  assert.equal((await readFile(deckPath, 'utf8')).trimEnd(), html);
  assert.match(html, /data-mode="play"/);
  assert.doesNotMatch(html, /Presenter|講者模式|data-action="presenter"/);
  assert.match(html, /data-action="save"/);
  assert.doesNotMatch(html, /https?:\/\//);
});
