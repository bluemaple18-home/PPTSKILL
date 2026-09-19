import assert from 'node:assert/strict';
import test from 'node:test';
import {
  EDITOR_CHROME_SELECTORS,
  EDITOR_PRESENTATION_TRUTH_SELECTORS,
  buildDeckEditorRuntimeScript,
  cleanupEditorChromeFromExportClone,
} from '../runtime/deck-editor.js';

const fakeNode = ({ matches = [], containsTruth = false, insideTruth = false } = {}) => {
  let removed = false;
  return {
    matches: (selector) => matches.includes(selector),
    querySelector: () => containsTruth ? {} : null,
    closest: () => insideTruth ? {} : null,
    remove: () => { removed = true; },
    get removed() { return removed; },
  };
};

const fakeRoot = (entries) => ({
  querySelectorAll: (selector) => entries.get(selector) ?? [],
});

test('export cleanup 只移除 bounded editor chrome roots', () => {
  const marked = fakeNode();
  const moveable = fakeNode();
  const selecto = fakeNode();
  const toolbar = fakeNode();
  const root = fakeRoot(new Map([
    ['[data-pptskill-editor-chrome]', [marked, moveable]],
    ['.moveable-control-box', [moveable]],
    ['.selecto-selection', [selecto]],
    ['[data-pptskill-context-toolbar]', [toolbar]],
  ]));

  const removed = cleanupEditorChromeFromExportClone(root, EDITOR_CHROME_SELECTORS, EDITOR_PRESENTATION_TRUTH_SELECTORS);

  assert.equal(removed, 4);
  assert.equal(marked.removed, true);
  assert.equal(moveable.removed, true);
  assert.equal(selecto.removed, true);
  assert.equal(toolbar.removed, true);
});

test('editor chrome contract 誤標 presentation truth 時 fail loud', () => {
  const markedSlide = fakeNode({ matches: ['.slide'] });
  const wrapsTruth = fakeNode({ containsTruth: true });

  for (const node of [markedSlide, wrapsTruth]) {
    const root = fakeRoot(new Map([['[data-pptskill-editor-chrome]', [node]]]));
    assert.throws(
      () => cleanupEditorChromeFromExportClone(root, EDITOR_CHROME_SELECTORS, EDITOR_PRESENTATION_TRUTH_SELECTORS),
      /editor chrome.*presentation truth/u,
    );
    assert.equal(node.removed, false);
  }
});

test('editor chrome 可位於 presentation 容器內，但不得自己承載 presentation truth', () => {
  const nestedChrome = fakeNode({ insideTruth: true });
  const root = fakeRoot(new Map([['[data-pptskill-editor-chrome]', [nestedChrome]]]));

  assert.equal(cleanupEditorChromeFromExportClone(root, EDITOR_CHROME_SELECTORS, EDITOR_PRESENTATION_TRUTH_SELECTORS), 1);
  assert.equal(nestedChrome.removed, true);
});

test('export clone root 自己被標成 editor chrome 時也不可漏出', () => {
  const root = fakeNode({ matches: ['[data-pptskill-editor-chrome]'], containsTruth: true });
  root.querySelectorAll = () => [];
  assert.throws(
    () => cleanupEditorChromeFromExportClone(root, EDITOR_CHROME_SELECTORS, EDITOR_PRESENTATION_TRUTH_SELECTORS),
    /editor chrome.*presentation truth/u,
  );
  assert.equal(root.removed, false);
});

test('正式 browser exporter 共用同一 cleanup seam', () => {
  const runtime = buildDeckEditorRuntimeScript();
  assert.match(runtime, /cleanupEditorChromeFromExportClone\(root,editorChromeSelectors,editorPresentationTruthSelectors\)/u);
  for (const selector of EDITOR_CHROME_SELECTORS) assert.ok(runtime.includes(selector));
});
