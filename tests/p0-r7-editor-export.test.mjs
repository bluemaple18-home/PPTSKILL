import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { createDeckEditor } from '../runtime/deck-editor.js';
import { extractDeckSpec } from '../runtime/deck-spec.js';
import { renderFullDeck } from '../runtime/full-deck-renderer.js';

const fixture = JSON.parse(await readFile(new URL('../fixtures/full-deck-spec.json', import.meta.url), 'utf8'));

test('DeckSpec editor 支援文字、元件、圖片與 bounded local patch', () => {
  const input = structuredClone(fixture);
  input.slides[5].content.components.push({
    id: 'owner-image',
    type: 'image',
    alt: '原圖',
    fit: 'contain',
    dataUri: 'data:image/png;base64,AA==',
  });
  const editor = createDeckEditor(input);
  editor.editText('opening', 'title', '更新後標題');
  editor.editKeyPoint('problem', 0, '更新後重點');
  editor.editComponent('portable', 'portable-quote', { text: '更新後引言', prompt: '不得進入' });
  editor.replaceImage('portable', 'owner-image', { dataUri: 'data:image/webp;base64,BB==', alt: '替換圖', fit: 'cover', localPath: '/private/image.webp' });
  editor.applyLocalPatch({ slideId: 'problem', region: 'content.subtitle', value: '本機 AI 單區修正' });

  const spec = editor.getSpec();
  assert.equal(spec.slides[0].content.title, '更新後標題');
  assert.equal(spec.slides[1].content.keyPoints[0], '更新後重點');
  assert.equal(spec.slides[1].content.subtitle, '本機 AI 單區修正');
  assert.equal(spec.slides[5].content.components.find(({ id }) => id === 'portable-quote').text, '更新後引言');
  assert.equal(spec.slides[5].content.components.find(({ id }) => id === 'owner-image').fit, 'cover');
  assert.doesNotMatch(JSON.stringify(spec), /不得進入|private\/image/);
  assert.throws(() => editor.applyLocalPatch({ slideId: 'problem', region: 'style.palette', value: '#000' }), /單一支援/);
});

test('排序、複製、刪除維持唯一 ID 與 15 頁上限', () => {
  const editor = createDeckEditor(fixture);
  editor.reorder(2, 0);
  assert.equal(editor.getSpec().slides[0].id, 'proof');
  const copyId = editor.duplicate(0);
  assert.equal(copyId, 'proof-copy-1');
  assert.equal(editor.getSpec().slides[1].id, copyId);
  editor.delete(1);
  assert.equal(editor.getSpec().slides.length, 10);

  while (editor.getSpec().slides.length < 15) editor.duplicate(0);
  assert.throws(() => editor.duplicate(0), /上限為 15/);
});

test('full-deck export 內建直接編輯器且只靠單一 HTML 可還原 DeckSpec', () => {
  const dirty = structuredClone(fixture);
  dirty.profile = { customer: 'secret' };
  dirty.localPath = '/Users/private/source.pdf';
  dirty.prompt = 'hidden prompt';
  dirty.slides[0].notes = 'private notes';
  const result = renderFullDeck(dirty);

  assert.equal(result.status, 'pass');
  assert.match(result.html, /data-pptskill-editor/);
  assert.match(result.html, /data-component-dialog/);
  assert.match(result.html, /window\.PPTSKILLEditor/);
  assert.match(result.html, /data-action="save"/);
  assert.match(result.html, /id="pptskill-image-input"/);
  assert.doesNotMatch(result.html, /Presenter|講者模式|data-action="presenter"/);
  assert.deepEqual(extractDeckSpec(result.html), result.spec);
  assert.doesNotMatch(JSON.stringify(extractDeckSpec(result.html)), /secret|private\/source|hidden prompt|private notes/);
  const runtime = result.html.match(/<script data-pptskill-editor-runtime>([\s\S]*?)<\/script>/)?.[1];
  assert.doesNotThrow(() => new Function(runtime));
});
