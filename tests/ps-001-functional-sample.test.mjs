import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import { buildDeckHtml, createDeckState } from '../runtime/deck.js';

const fixturePath = new URL('../fixtures/functional-test-sample.json', import.meta.url);
const deckPath = new URL('../fixtures/deck.html', import.meta.url);

test('三頁樣本可播放、顯示講者資訊並管理投影片', async () => {
  const fixture = JSON.parse(await readFile(fixturePath, 'utf8'));
  const deck = createDeckState(fixture);

  assert.equal(deck.slides.length, 3);
  assert.equal(deck.current().id, 'sample-01');
  assert.deepEqual(deck.presenter(), {
    notes: '先說明目前的阻塞，再邀請團隊確認下一步。',
    nextHint: '接著用三個行動降低風險。',
    source: '內部功能測試用合成資料',
    progress: '1 / 3',
  });

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
  assert.match(html, /id="presenter" hidden/);
  assert.match(html, /data-action="save"/);
  assert.doesNotMatch(html, /https?:\/\//);
});
